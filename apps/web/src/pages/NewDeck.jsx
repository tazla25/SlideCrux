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

      // Insert new row in decks
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

      // Invoke edge functions in the background
      (async () => {
        try {
          if (activeTab === 'url') {
            const { data: fetchRes, error: fetchErr } = await supabase.functions.invoke('fetch-transcript', {
              body: { deck_id: newDeckId }
            })
            if (fetchErr) {
              // Try to parse structured error from response
              let errorMsg = fetchErr.message || "Failed to extract transcript from video."
              try {
                const parsed = typeof fetchErr.context === 'string' ? JSON.parse(fetchErr.context) : fetchErr.context
                if (parsed?.error) errorMsg = parsed.error
              } catch (_) {}
              throw new Error(errorMsg)
            }
          }

          const { data, error } = await supabase.functions.invoke('generate-deck', {
            body: { deck_id: newDeckId }
          })
          if (error) {
            console.error("Edge function invocation error:", error)
            // Try to parse structured error from response
            let errorMsg = error.message || "Failed to trigger AI generation."
            try {
              const parsed = typeof error.context === 'string' ? JSON.parse(error.context) : error.context
              if (parsed?.code === 'QUOTA_EXCEEDED') {
                errorMsg = parsed.error + " Go to Pricing to upgrade your plan."
              } else if (parsed?.error) {
                errorMsg = parsed.error
              }
            } catch (_) {
              // Use default error message
            }
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

      // Start polling database status
      startPolling(newDeckId)

    } catch (err) {
      if (isMounted.current) {
        setError(err.message || "An error occurred during submission.")
        setLoading(false)
      }
    }
  }

  if (loading || deckStatus === 'failed') {
    return (
      <div className="deck-processing-overlay">
        <div className="processing-spinner-container">
          <div className="processing-spinner"></div>
          <div className="processing-spinner-inner"></div>
        </div>
        
        <h2 className="processing-status-title">
          {deckStatus === 'failed' ? 'Generation Failed' : 'Creating Presentation'}
        </h2>
        
        <p className="processing-status-text" style={{ color: deckStatus === 'failed' ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
          {deckStatus === 'pending' && 'Initializing deck generation...'}
          {deckStatus === 'transcribing' && 'Extracting and transcribing video content... This may take a minute.'}
          {deckStatus === 'generating' && 'Designing slide layouts & generating content with AI...'}
          {deckStatus === 'ready' && 'Presentation is ready! Redirecting...'}
          {deckStatus === 'failed' && `Error: ${errorMessage || 'An error occurred during generation.'}`}
        </p>

        {deckStatus !== 'failed' && (
          <div className="processing-status-steps">
            <div className={`processing-step ${deckStatus === 'pending' ? 'active' : 'done'}`}>
              <span className="step-indicator-dot"></span>
              <span>1. Initialize generation pipeline</span>
            </div>
            
            {activeTab === 'url' && (
              <div className={`processing-step ${deckStatus === 'transcribing' ? 'active' : (deckStatus === 'generating' || deckStatus === 'ready') ? 'done' : ''}`}>
                <span className="step-indicator-dot"></span>
                <span>2. Transcribe video content</span>
              </div>
            )}
            
            <div className={`processing-step ${deckStatus === 'generating' ? 'active' : deckStatus === 'ready' ? 'done' : ''}`}>
              <span className="step-indicator-dot"></span>
              <span>{activeTab === 'url' ? '3. Generate slides with AI' : '2. Generate slides with AI'}</span>
            </div>
            
            <div className={`processing-step ${deckStatus === 'ready' ? 'active' : ''}`}>
              <span className="step-indicator-dot"></span>
              <span>{activeTab === 'url' ? '4. Ready' : '3. Ready'}</span>
            </div>
          </div>
        )}

        {deckStatus === 'failed' && (
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => {
              setLoading(false)
              setDeckStatus('pending')
              setError(errorMessage)
            }}>
              Go Back
            </button>
            {errorMessage && errorMessage.includes('Upgrade') && (
              <button className="btn btn-primary" onClick={() => navigate('/pricing')}>
                Upgrade Plan ⚡
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dashboard-container new-deck-card">
      <header className="dashboard-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="dashboard-title">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #f3f4f6 0%, #9ca3af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Create New Slide Deck
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            AI-designed presentations directly from video transcripts
          </p>
        </div>
      </header>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '2rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <button 
          className={`btn ${activeTab === 'url' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('url')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
        >
          Option A: Video URL
        </button>
        <button 
          className={`btn ${activeTab === 'paste' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('paste')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
        >
          Option B: Paste Transcript
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
          <label className="form-label" htmlFor="deck-title">Deck Title (Optional)</label>
          <input
            type="text"
            id="deck-title"
            className="form-input"
            placeholder="e.g. Q3 Sales Pitch or Loom Walkthrough Summary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
          <label className="form-label" htmlFor="brand-kit-select">Brand Kit Theme (Optional)</label>
          <select
            id="brand-kit-select"
            className="form-input brand-kit-select"
            value={selectedBrandKitId}
            onChange={(e) => setSelectedBrandKitId(e.target.value)}
          >
            <option value="">Default theme (SlideCrux Dark)</option>
            {brandKits.map(bk => (
              <option key={bk.id} value={bk.id}>{bk.name}</option>
            ))}
          </select>
        </div>

        {activeTab === 'url' ? (
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="video-url">Loom or YouTube URL</label>
            <input
              type="url"
              id="video-url"
              className="form-input"
              placeholder="e.g. https://www.loom.com/share/... or https://www.youtube.com/watch?v=..."
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value)
                detectSourceType(e.target.value)
              }}
              required
            />
            {detectedSourceType && (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-success)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                <span style={{ fontSize: '1.1rem' }}>✓</span> 
                <span>Detected {detectedSourceType === 'youtube' ? 'YouTube Video ⚡' : 'Loom Video 🎥'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="transcript-text">Raw Transcript Text</label>
            <textarea
              id="transcript-text"
              className="form-input"
              placeholder="Paste the transcription text here. AI will structure and compile it directly into slides."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              style={{ minHeight: '180px', resize: 'vertical', lineHeight: '1.6' }}
              required
            />
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={activeTab === 'url' && !detectedSourceType}
          style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '1rem' }}
        >
          Generate Presentation ⚡
        </button>
      </form>
    </div>
  )
}

export default NewDeck
