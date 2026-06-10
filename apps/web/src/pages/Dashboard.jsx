import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SOURCE_ICONS = {
  youtube: '🎬',
  loom: '🎥',
  upload: '📁',
  paste: '📋',
  meet: '💻',
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  transcribing: { label: 'Transcribing', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  generating: { label: 'Generating', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  ready: { label: 'Ready', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  failed: { label: 'Failed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
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
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-title">
            <div className="skeleton-loading skeleton-text title"></div>
            <div className="skeleton-loading skeleton-text short"></div>
          </div>
          <div className="skeleton-loading" style={{ width: '120px', height: '40px', borderRadius: 'var(--radius-md)' }}></div>
        </header>
        <div className="dash-stats-bar">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="dash-stat-item skeleton-loading" style={{ height: '60px' }}></div>
          ))}
        </div>
        <div className="dash-deck-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="dash-deck-card skeleton-loading" style={{ height: '80px', border: 'none' }}></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Welcome back, {fullName.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Your SlideCrux workspace
          </p>
        </div>
        <Link to="/new-deck" className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Deck
        </Link>
      </header>

      {/* Stats Bar */}
      <div className="dash-stats-bar">
        <div className="dash-stat-item">
          <span className="dash-stat-value">{totalDecks}</span>
          <span className="dash-stat-label">Total Decks</span>
        </div>
        <div className="dash-stat-item">
          <span className="dash-stat-value">{readyDecks}</span>
          <span className="dash-stat-label">Ready</span>
        </div>
        <div className="dash-stat-item">
          <span className="dash-stat-value">{decksThisMonth}/{planLimit}</span>
          <span className="dash-stat-label">This Month</span>
        </div>
        <div className="dash-stat-item">
          <span className="dash-stat-badge" data-plan={plan}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </span>
          <span className="dash-stat-label">Plan</span>
        </div>
      </div>

      {/* Deck List */}
      {decks.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8"/><path d="M12 17v4"/>
              <path d="M7 8h4"/><path d="M7 11h6"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No decks yet</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: '360px' }}>
            Paste a YouTube or Loom URL and let AI create a stunning presentation for you in seconds.
          </p>
          <Link to="/new-deck" className="btn btn-primary">
            Create Your First Deck ⚡
          </Link>
        </div>
      ) : (
        <div className="dash-deck-list">
          {decks.map(deck => {
            const status = STATUS_CONFIG[deck.status] || STATUS_CONFIG.pending
            const icon = SOURCE_ICONS[deck.source_type] || '📄'
            return (
              <div
                key={deck.id}
                className="dash-deck-card"
                onClick={() => deck.status === 'ready' ? navigate(`/deck/${deck.id}`) : null}
                style={{ cursor: deck.status === 'ready' ? 'pointer' : 'default' }}
              >
                <div className="dash-deck-left">
                  <span className="dash-deck-source-icon">{icon}</span>
                  <div className="dash-deck-info">
                    <h3 className="dash-deck-title">
                      {deck.title || 'Untitled Deck'}
                    </h3>
                    <div className="dash-deck-meta">
                      <span
                        className="dash-deck-status"
                        style={{ color: status.color, backgroundColor: status.bg }}
                      >
                        {status.label}
                      </span>
                      {deck.slide_count > 0 && (
                        <span className="dash-deck-slides">{deck.slide_count} slides</span>
                      )}
                      <span className="dash-deck-time">{timeAgo(deck.created_at)}</span>
                    </div>
                    {deck.status === 'failed' && deck.error && (
                      <p className="dash-deck-error">{deck.error}</p>
                    )}
                  </div>
                </div>
                <div className="dash-deck-actions" onClick={e => e.stopPropagation()}>
                  {deck.status === 'ready' && (
                    <Link to={`/deck/${deck.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      Edit
                    </Link>
                  )}
                  {deck.public_slug && (
                    <a
                      href={`/d/${deck.public_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      View
                    </a>
                  )}
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => setDeleteModal(deck)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="dash-quick-links">
        <Link to="/brand-kits" className="dash-quick-card">
          <span style={{ fontSize: '1.5rem' }}>🎨</span>
          <div>
            <h4>Brand Kits</h4>
            <p>Custom colors, logos & fonts</p>
          </div>
        </Link>
        <Link to="/pricing" className="dash-quick-card">
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <div>
            <h4>Upgrade Plan</h4>
            <p>{plan === 'free' ? 'Unlock more decks & exports' : 'Manage subscription'}</p>
          </div>
        </Link>
        <Link to="/settings" className="dash-quick-card">
          <span style={{ fontSize: '1.5rem' }}>⚙️</span>
          <div>
            <h4>Settings</h4>
            <p>Account & preferences</p>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="dash-modal-overlay" onClick={() => !deleting && setDeleteModal(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Delete Deck?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Are you sure you want to delete <strong>"{deleteModal.title || 'Untitled Deck'}"</strong>? This will permanently remove all slides and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
