import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SOURCE_ICONS = {
  youtube: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  loom: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  ),
  upload: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  paste: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  meet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10l5-5" />
      <path d="M20 5l-5 5" />
      <path d="M15 14l5 5" />
      <path d="M20 19l-5-5" />
      <rect x="2" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'status-dot-pending',
    bg: 'var(--warning-bg)',
    color: 'var(--warning)'
  },
  transcribing: {
    label: 'Transcribing',
    className: 'status-dot-transcribing',
    bg: 'rgba(167, 139, 250, 0.12)',
    color: '#a78bfa'
  },
  generating: {
    label: 'Generating',
    className: 'status-dot-generating',
    bg: 'rgba(96, 165, 250, 0.12)',
    color: 'var(--info)'
  },
  ready: {
    label: 'Ready',
    className: 'status-dot-ready',
    bg: 'var(--success-bg)',
    color: 'var(--success)'
  },
  failed: {
    label: 'Failed',
    className: 'status-dot-failed',
    bg: 'var(--error-bg)',
    color: 'var(--error)'
  },
}

const PLAN_LIMITS = { free: 1, pro: 30, team: 200 }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const user = session?.user
  const email = user?.email
  const fullName = user?.user_metadata?.full_name || email || 'User'

  const [decks, setDecks] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const [decksRes, profileRes] = await Promise.all([
          supabase
            .from('decks')
            .select('id, title, source_type, status, slide_count, public_slug, watermark, error, created_at')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('plan, decks_this_month')
            .eq('id', user.id)
            .single()
        ])

        if (decksRes.data) setDecks(decksRes.data)
        if (profileRes.data) setProfile(profileRes.data)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deleteModal.id)

      if (error) throw error
      setDecks(prev => prev.filter(d => d.id !== deleteModal.id))
      setDeleteModal(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete deck: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const plan = profile?.plan || 'free'
  const decksThisMonth = profile?.decks_this_month || 0
  const planLimit = PLAN_LIMITS[plan] || 1
  const totalDecks = decks.length
  const readyDecks = decks.filter(d => d.status === 'ready').length

  if (loading) {
    return (
      <div className="page-container">
        <header className="dashboard-header">
          <div>
            <div className="skeleton" style={{ width: 280, height: 36, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 160, height: 18 }} />
          </div>
          <div className="skeleton" style={{ width: 130, height: 40, borderRadius: 'var(--radius-md)' }} />
        </header>

        <div className="stats-bar">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: 50, height: 36 }} />
              <div className="skeleton" style={{ width: 80, height: 14 }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 76, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>
            Welcome back, {fullName.split(' ')[0]}!
          </h1>
          <p>Your SlideCrux workspace</p>
        </div>
        <Link to="/new-deck" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Deck
        </Link>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-value">{totalDecks}</span>
          <span className="stat-label">Total Decks</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--success)' }}>{readyDecks}</span>
          <span className="stat-label">Ready</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{decksThisMonth}<span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-lg)' }}>/{planLimit}</span></span>
          <span className="stat-label">This Month</span>
        </div>
        <div className="stat-card">
          <span>
            <span className={`plan-badge ${plan === 'pro' ? 'plan-badge-pro' : plan === 'team' ? 'plan-badge-team' : 'plan-badge-free'}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </span>
          <span className="stat-label">Plan</span>
        </div>
      </div>

      {/* Deck List */}
      {decks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 8h4" />
              <path d="M7 11h6" />
            </svg>
          </div>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>No decks yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>
            Paste a YouTube or Loom URL and let AI create a stunning presentation for you in seconds.
          </p>
          <Link to="/new-deck" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Your First Deck
          </Link>
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map(deck => {
            const status = STATUS_CONFIG[deck.status] || STATUS_CONFIG.pending
            const icon = SOURCE_ICONS[deck.source_type] || SOURCE_ICONS.paste
            const isReady = deck.status === 'ready'

            return (
              <div
                key={deck.id}
                className="deck-card"
                onClick={() => isReady ? navigate(`/deck/${deck.id}`) : null}
                style={{ cursor: isReady ? 'pointer' : 'default' }}
              >
                <div className="deck-card-source" style={{ color: status.color }}>
                  {icon}
                </div>

                <div className="deck-card-body">
                  <div className="deck-card-title">
                    {deck.title || 'Untitled Deck'}
                  </div>
                  <div className="deck-card-meta">
                    <span className="status-badge" style={{ background: status.bg, color: status.color }}>
                      <span className={`status-dot ${status.className}`} />
                      {status.label}
                    </span>
                    {deck.slide_count > 0 && (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                        {deck.slide_count} slides
                      </span>
                    )}
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                      {timeAgo(deck.created_at)}
                    </span>
                    {deck.status === 'failed' && deck.error && (
                      <span style={{ color: 'var(--error)', fontSize: 'var(--text-xs)' }}>
                        {deck.error}
                      </span>
                    )}
                  </div>
                </div>

                <div className="deck-card-actions" onClick={e => e.stopPropagation()}>
                  {isReady && (
                    <Link
                      to={`/deck/${deck.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </Link>
                  )}
                  {deck.public_slug && (
                    <a
                      href={`/d/${deck.public_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-icon-sm"
                      title="View public link"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                  <button
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => setDeleteModal(deck)}
                    title="Delete deck"
                    style={{ color: 'var(--error)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="quick-links">
        <Link to="/brand-kits" className="quick-link-card">
          <div className="quick-link-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <path d="M13.5 9.5c-2.5 0-4.5 1.5-4.5 3.5v2h9v-2c0-2-2-3.5-4.5-3.5z" />
              <path d="M2 21l2-7h4l2 7" />
              <path d="M5 14v-2a2 2 0 0 1 2-2" />
            </svg>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}>Brand Kits</h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Custom colors, logos & fonts</p>
          </div>
        </Link>

        <Link to="/pricing" className="quick-link-card">
          <div className="quick-link-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}>Upgrade Plan</h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {plan === 'free' ? 'Unlock more decks & exports' : 'Manage subscription'}
            </p>
          </div>
        </Link>

        <Link to="/settings" className="quick-link-card">
          <div className="quick-link-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}>Settings</h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Account & preferences</p>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--error-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-4)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3>Delete Deck?</h3>
            <p>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{deleteModal.title || 'Untitled Deck'}"</strong>? This will permanently remove all slides and cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                    </svg>
                    Deleting...
                  </>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
