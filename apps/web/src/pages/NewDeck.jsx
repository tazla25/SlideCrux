import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'

function NewDeck() {
  const [activeTab, setActiveTab] = useState('url')
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [transcriptText, setTranscriptText] = useState('')
  const [detectedSourceType, setDetectedSourceType] = useState(null)

  const [brandKits, setBrandKits] = useState([])
  const [selectedBrandKitId, setSelectedBrandKitId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [deckStatus, setDeckStatus] = useState('pending')

  const navigate = useNavigate()
  const pollingIntervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    const fetchBrandKits = async () => {
      try {
        const { data, error } = await supabase
          .from('brand_kits')
          .select('id, name')
          .order('name', { ascending: true })

        if (error) throw error
        if (data && isMounted.current) setBrandKits(data)
      } catch (err) {
        console.error('Error fetching brand kits:', err.message)
      }
    }

    fetchBrandKits()

    return () => {
      isMounted.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const detectSourceType = (url) => {
    const clean = url.trim()
    if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
      setDetectedSourceType('youtube')
    } else if (clean.includes('loom.com')) {
      setDetectedSourceType('loom')
    } else {
      setDetectedSourceType(null)
    }
  }

  const startPolling = (id) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    let attempts = 0

    pollingIntervalRef.current = setInterval(async () => {
      attempts++
      if (attempts > 60) {
        clearInterval(pollingIntervalRef.current)
        if (isMounted.current) {
          setDeckStatus('failed')
          setErrorMessage("Generation timed out. Please try again.")
        }
        return
      }

      try {
        const { data: deck, error } = await supabase
          .from('decks')
          .select('status, error')
          .eq('id', id)
          .single()

        if (error) {
          console.error("Error polling deck status:", error)
          return
        }

        if (deck && isMounted.current) {
          setDeckStatus(deck.status)
          if (deck.status === 'ready') {
            clearInterval(pollingIntervalRef.current)
            trackEvent('deck_created', { source_type: activeTab === 'url' ? detectedSourceType : 'paste' })
            timeoutRef.current = setTimeout(() => {
              if (isMounted.current) {
                navigate(`/deck/${id}`)
              }
            }, 1000)
          } else if (deck.status === 'failed') {
            clearInterval(pollingIntervalRef.current)
            setErrorMessage(deck.error || "Generation failed.")
          }
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setErrorMessage(null)
    setDeckStatus('pending')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Unauthorized: Please sign in again.")

      const source_type = activeTab === 'url' ? detectedSourceType : 'paste'
      const source_url = activeTab === 'url' ? sourceUrl.trim() : null
      const transcript = activeTab === 'paste' ? transcriptText.trim() : null

      if (activeTab === 'url' && !detectedSourceType) {
        throw new Error("Invalid URL: Must be a YouTube or Loom URL.")
      }

      if (activeTab === 'paste' && !transcript) {
        throw new Error("Please paste a transcript.")
      }

      const { data: newDeck, error: insertError } = await supabase
        .from('decks')
        .insert({
          owner_id: user.id,
          title: title.trim() || 'Untitled Deck',
          source_type,
          source_url,
          transcript,
          status: 'pending',
          brand_kit_id: selectedBrandKitId || null
        })
        .select()
        .single()

      if (insertError) throw insertError;

      const newDeckId = newDeck.id;

      (async () => {
        try {
          if (activeTab === 'url') {
            const { data: fetchRes, error: fetchErr } = await supabase.functions.invoke('fetch-transcript', {
              body: { deck_id: newDeckId }
            })
            if (fetchErr) {
              let errorMsg = fetchErr.message || "Failed to extract transcript from video."
              try {
                const parsed = typeof fetchErr.context === 'string' ? JSON.parse(fetchErr.context) : fetchErr.context
                if (parsed?.error) errorMsg = parsed.error
              } catch (_) { }
              throw new Error(errorMsg)
            }
          }

          const { data, error } = await supabase.functions.invoke('generate-deck', {
            body: { deck_id: newDeckId }
          })
          if (error) {
            console.error("Edge function invocation error:", error)
            let errorMsg = error.message || "Failed to trigger AI generation."
            try {
              const parsed = typeof error.context === 'string' ? JSON.parse(error.context) : error.context
              if (parsed?.code === 'QUOTA_EXCEEDED') {
                errorMsg = parsed.error + " Go to Pricing to upgrade your plan."
              } else if (parsed?.error) {
                errorMsg = parsed.error
              }
            } catch (_) { }
            if (isMounted.current) {
              setDeckStatus(prev => {
                if (prev !== 'ready') {
                  setErrorMessage(errorMsg)
                  return 'failed'
                }
                return prev
              })
            }
          }
        } catch (err) {
          console.error("Edge function invocation failed:", err)
          if (isMounted.current) {
            setDeckStatus(prev => {
              if (prev !== 'ready') {
                setErrorMessage(err.message || "Failed to trigger AI generation.")
                return 'failed'
              }
              return prev
            })
          }
        }
      })()

      startPolling(newDeckId)

    } catch (err) {
      if (isMounted.current) {
        setError(err.message || "An error occurred during submission.")
        setLoading(false)
      }
    }
  }

  // Processing overlay
  if (loading || deckStatus === 'failed') {
    const steps = activeTab === 'url'
      ? [
        { key: 'pending', label: 'Initialize generation pipeline', num: 1 },
        { key: 'transcribing', label: 'Transcribe video content', num: 2 },
        { key: 'generating', label: 'Generate slides with AI', num: 3 },
        { key: 'ready', label: 'Ready', num: 4 },
      ]
      : [
        { key: 'pending', label: 'Initialize generation pipeline', num: 1 },
        { key: 'generating', label: 'Generate slides with AI', num: 2 },
        { key: 'ready', label: 'Ready', num: 3 },
      ]

    return (
      <div className="processing-overlay">
        <div className="processing-spinner-wrap">
          <div className="processing-spinner" />
          <div className="processing-spinner-inner" />
        </div>

        <h2 className="processing-title">
          {deckStatus === 'failed' ? 'Generation Failed' : 'Creating Presentation'}
        </h2>

        <p className="processing-text" style={{ color: deckStatus === 'failed' ? 'var(--error)' : undefined }}>
          {deckStatus === 'pending' && 'Initializing deck generation...'}
          {deckStatus === 'transcribing' && 'Extracting and transcribing video content... This may take a minute.'}
          {deckStatus === 'generating' && 'Designing slide layouts & generating content with AI...'}
          {deckStatus === 'ready' && 'Presentation is ready! Redirecting...'}
          {deckStatus === 'failed' && `Error: ${errorMessage || 'An error occurred during generation.'}`}
        </p>

        {deckStatus !== 'failed' && (
          <div className="processing-steps">
            {steps.map(step => {
              const isActive = deckStatus === step.key
              const isDone = step.key === 'pending' ||
                (activeTab === 'url' && deckStatus !== 'pending' && step.key === 'transcribing' && (deckStatus === 'generating' || deckStatus === 'ready')) ||
                (deckStatus === 'ready' && (step.key === 'generating' || step.key === 'transcribing'))

              return (
                <div
                  key={step.key}
                  className={`processing-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                >
                  <span className="processing-step-dot" />
                  <span>{step.num}. {step.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {deckStatus === 'failed' && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setLoading(false)
                setDeckStatus('pending')
                setError(errorMessage)
              }}
            >
              Go Back
            </button>
            {errorMessage && errorMessage.includes('Upgrade') && (
              <button className="btn btn-primary" onClick={() => navigate('/pricing')}>
                Upgrade Plan
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container wizard-card">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 800,
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-2)',
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Create New Slide Deck
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          AI-designed presentations directly from video transcripts
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="wizard-tabs">
        <button
          className={`wizard-tab ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => setActiveTab('url')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Video URL
        </button>
        <button
          className={`wizard-tab ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          Paste Transcript
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Deck Title */}
        <div className="form-group">
          <label className="form-label" htmlFor="deck-title">
            Deck Title <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Optional)</span>
          </label>
          <input
            type="text"
            id="deck-title"
            className="form-input"
            placeholder="e.g. Q3 Sales Pitch or Loom Walkthrough Summary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Brand Kit */}
        <div className="form-group">
          <label className="form-label" htmlFor="brand-kit-select">
            Brand Kit Theme <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Optional)</span>
          </label>
          <select
            id="brand-kit-select"
            className="form-select"
            value={selectedBrandKitId}
            onChange={(e) => setSelectedBrandKitId(e.target.value)}
          >
            <option value="">Default theme (SlideCrux Dark)</option>
            {brandKits.map(bk => (
              <option key={bk.id} value={bk.id}>{bk.name}</option>
            ))}
          </select>
        </div>

        {/* URL Input */}
        {activeTab === 'url' ? (
          <div className="form-group">
            <label className="form-label" htmlFor="video-url">
              Loom or YouTube URL
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                id="video-url"
                className="form-input"
                placeholder="https://www.loom.com/share/... or https://www.youtube.com/watch?v=..."
                value={sourceUrl}
                onChange={(e) => {
                  setSourceUrl(e.target.value)
                  detectSourceType(e.target.value)
                }}
                required
                style={{ paddingLeft: '2.75rem' }}
              />
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
            </div>

            {detectedSourceType && (
              <div className="source-detect">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  Detected {detectedSourceType === 'youtube' ? 'YouTube' : 'Loom'} video
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Transcript Input */
          <div className="form-group">
            <label className="form-label" htmlFor="transcript-text">
              Raw Transcript Text
            </label>
            <textarea
              id="transcript-text"
              className="form-textarea"
              placeholder="Paste the transcription text here. AI will structure and compile it directly into slides."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              style={{ minHeight: 200, lineHeight: 'var(--leading-relaxed)' }}
              required
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={activeTab === 'url' && !detectedSourceType}
          style={{ width: '100%', marginTop: 'var(--space-4)' }}
        >
          {activeTab === 'url' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate Presentation
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate from Transcript
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default NewDeck
