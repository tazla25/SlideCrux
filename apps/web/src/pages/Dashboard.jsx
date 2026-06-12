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
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in">
        <header className="flex justify-between items-center mb-10">
          <div>
            <div className="bg-white_5 rounded-lg" style={{ width: 280, height: 36, marginBottom: 8 }} />
            <div className="bg-white_5 rounded-lg" style={{ width: 160, height: 18 }} />
          </div>
          <div className="bg-white_5 rounded-xl" style={{ width: 130, height: 40 }} />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel p-6">
              <div className="bg-white_5 rounded" style={{ width: 50, height: 36, marginBottom: 8 }} />
              <div className="bg-white_5 rounded" style={{ width: 80, height: 14 }} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel p-6 h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
            Welcome back, {fullName.split(' ')[0]}!
          </h1>
          <p className="text-gray-400">Your SlideCrux workspace</p>
        </div>
        <Link to="/new-deck" className="btn-primary flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Deck
        </Link>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-50"></div>
          <span className="text-3xl font-bold text-white mb-2">{totalDecks}</span>
          <span className="text-sm text-gray-400 uppercase tracking-wider">Total Decks</span>
        </div>
        <div className="glass-panel p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-50"></div>
          <span className="text-3xl font-bold text-blue-400 mb-2">{readyDecks}</span>
          <span className="text-sm text-gray-400 uppercase tracking-wider">Ready</span>
        </div>
        <div className="glass-panel p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-50"></div>
          <span className="text-3xl font-bold text-white mb-2">
            {decksThisMonth}<span className="text-gray-400 text-xl ml-2">/{planLimit}</span>
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wider">This Month</span>
        </div>
        <div className="glass-panel p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-50"></div>
          <span className="mb-2">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-sm font-medium inline-block">
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wider">Plan</span>
        </div>
      </div>

      {/* Deck List Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white tracking-tight">Recent Decks</h2>
      </div>

      {/* Deck List */}
      {decks.length === 0 ? (
        <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 8h4" />
              <path d="M7 11h6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No decks yet</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Paste a YouTube or Loom URL and let AI create a stunning presentation for you in seconds.
          </p>
          <Link to="/new-deck" className="btn-primary flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Your First Deck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => {
            const status = STATUS_CONFIG[deck.status] || STATUS_CONFIG.pending
            const icon = SOURCE_ICONS[deck.source_type] || SOURCE_ICONS.paste
            const isReady = deck.status === 'ready'

            return (
              <div
                key={deck.id}
                className="glass-panel p-6 group hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative overflow-hidden flex flex-col"
                onClick={() => isReady ? navigate(`/deck/${deck.id}`) : null}
                style={{ cursor: isReady ? 'pointer' : 'default' }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white_5 rounded-lg" style={{ color: status.color }}>
                    {icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {isReady && (
                      <Link
                        to={`/deck/${deck.id}`}
                        className="text-gray-400 hover:text-white transition-colors"
                        onClick={e => e.stopPropagation()}
                        title="Edit"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                    )}
                    {deck.public_slug && (
                      <a
                        href={`/d/${deck.public_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-colors"
                        onClick={e => e.stopPropagation()}
                        title="View public link"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                    <button
                      className="text-gray-400 hover:text-error transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteModal(deck)
                      }}
                      title="Delete deck"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-white mb-4" style={{ minHeight: '3.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {deck.title || 'Untitled Deck'}
                </h3>
                
                <div className="mt-auto flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {deck.status === 'failed' && deck.error && (
                      <span className="text-xs text-error overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={deck.error}>
                        {deck.error}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-400 border-t border-white_10 pt-3">
                    <span>{deck.slide_count > 0 ? `${deck.slide_count} Slides` : 'No slides'}</span>
                    <span>{timeAgo(deck.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-white tracking-tight mb-6">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/brand-kits" className="glass-panel p-6 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3 bg-white_5 rounded-lg text-blue-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="13.5" cy="6.5" r="2.5" />
                <path d="M13.5 9.5c-2.5 0-4.5 1.5-4.5 3.5v2h9v-2c0-2-2-3.5-4.5-3.5z" />
                <path d="M2 21l2-7h4l2 7" />
                <path d="M5 14v-2a2 2 0 0 1 2-2" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Brand Kits</h4>
              <p className="text-sm text-gray-400">Custom colors, logos & fonts</p>
            </div>
          </Link>

          <Link to="/pricing" className="glass-panel p-6 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3 bg-white_5 rounded-lg text-blue-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Upgrade Plan</h4>
              <p className="text-sm text-gray-400">
                {plan === 'free' ? 'Unlock more decks & exports' : 'Manage subscription'}
              </p>
            </div>
          </Link>

          <Link to="/settings" className="glass-panel p-6 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3 bg-white_5 rounded-lg text-blue-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Settings</h4>
              <p className="text-sm text-gray-400">Account & preferences</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed top-0 left-0 w-full h-screen z-50 flex items-center justify-center bg-black_60" style={{ backdropFilter: 'blur(4px)' }} onClick={() => !deleting && setDeleteModal(null)}>
          <div className="glass-panel p-8 max-w-md w-full mx-4 relative" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--error-bg, rgba(239, 68, 68, 0.15))' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error, #ef4444)" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Delete Deck?</h3>
            <p className="text-gray-400 mb-8">
              Are you sure you want to delete <strong className="text-white">"{deleteModal.title || 'Untitled Deck'}"</strong>? This will permanently remove all slides and cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded-xl text-white bg-white_5 hover:bg-white_10 transition-colors"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl text-white flex items-center gap-2 transition-colors"
                style={{ backgroundColor: 'var(--error, #ef4444)' }}
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
