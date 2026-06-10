import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PLAN_LIMITS = { free: 1, pro: 30, team: 200 }
const PLAN_LABELS = { free: 'Free', pro: 'Pro', team: 'Team' }
const PLAN_COLORS = {
  free: { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)' },
  pro: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  team: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
}

export default function Settings({ session }) {
  const navigate = useNavigate()
  const user = session?.user

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, plan, decks_this_month, monthly_reset_at, plan_renews_at, lemon_customer_id')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
      setNameValue(data?.full_name || '')
    } catch (err) {
      console.error('Settings: Error fetching profile:', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return
    setSavingName(true)
    setSaveSuccess(false)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: nameValue.trim() })
        .eq('id', user.id)

      if (error) throw error
      setProfile(prev => ({ ...prev, full_name: nameValue.trim() }))
      setEditingName(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating name:', err.message)
      alert('Failed to update name: ' + err.message)
    } finally {
      setSavingName(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    setDeleteError(null)
    try {
      // Delete all user data via cascading foreign keys
      // First delete brand_kits, decks (which cascades slides), usage_log
      await supabase.from('brand_kits').delete().eq('owner_id', user.id)
      await supabase.from('decks').delete().eq('owner_id', user.id)
      await supabase.from('usage_log').delete().eq('user_id', user.id)
      await supabase.from('subscriptions').delete().eq('user_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)

      // Sign out
      await supabase.auth.signOut()
      navigate('/')
    } catch (err) {
      console.error('Error deleting account:', err.message)
      setDeleteError('Failed to delete account. Please try again or contact support.')
      setDeleting(false)
    }
  }

  const plan = profile?.plan || 'free'
  const decksThisMonth = profile?.decks_this_month || 0
  const planLimit = PLAN_LIMITS[plan] || 1
  const quotaPercent = Math.min(100, Math.round((decksThisMonth / planLimit) * 100))
  const planStyle = PLAN_COLORS[plan] || PLAN_COLORS.free

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="processing-spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '720px' }}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>Settings</h1>
          <p>Manage your account, subscription, and preferences.</p>
        </div>
      </header>

      {saveSuccess && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          Profile updated successfully!
        </div>
      )}

      {/* ──── Profile Section ──── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h2>Profile</h2>
        </div>

        <div className="settings-field">
          <label className="settings-label">Email</label>
          <div className="settings-value settings-value-readonly">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {profile?.email || user?.email || '—'}
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">Full Name</label>
          {editingName ? (
            <div className="settings-edit-row">
              <input
                type="text"
                className="form-input"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
              <button
                className="btn btn-primary"
                onClick={handleSaveName}
                disabled={savingName || !nameValue.trim()}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setEditingName(false); setNameValue(profile?.full_name || '') }}
                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="settings-value" style={{ cursor: 'pointer' }} onClick={() => setEditingName(true)}>
              {profile?.full_name || '—'}
              <button className="settings-edit-btn" onClick={e => { e.stopPropagation(); setEditingName(true) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="settings-field">
          <label className="settings-label">Plan</label>
          <div className="settings-value">
            <span className="settings-plan-badge" style={{ color: planStyle.color, backgroundColor: planStyle.bg }}>
              {PLAN_LABELS[plan] || 'Free'}
            </span>
            {profile?.plan_renews_at && (
              <span className="settings-renew-date">
                Renews {formatDate(profile.plan_renews_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ──── Usage & Subscription Section ──── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
          </svg>
          <h2>Usage & Subscription</h2>
        </div>

        <div className="settings-field">
          <label className="settings-label">Decks This Month</label>
          <div className="settings-quota-wrap">
            <div className="settings-quota-bar">
              <div
                className="settings-quota-fill"
                style={{
                  width: `${quotaPercent}%`,
                  backgroundColor: quotaPercent >= 90 ? 'var(--color-error)' : quotaPercent >= 70 ? 'var(--color-accent)' : 'var(--color-brand)',
                }}
              />
            </div>
            <span className="settings-quota-text">
              {decksThisMonth} / {planLimit} decks used
            </span>
          </div>
          {profile?.monthly_reset_at && (
            <span className="settings-meta-text">
              Resets on {formatDate(profile.monthly_reset_at)}
            </span>
          )}
        </div>

        <div className="settings-actions-row">
          {plan !== 'free' && profile?.lemon_customer_id && (
            <a
              href={`https://app.lemonsqueezy.com/my-orders`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ gap: '0.5rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Manage Subscription
            </a>
          )}
          {plan === 'free' && (
            <Link to="/pricing" className="btn btn-primary" style={{ gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Upgrade Plan
            </Link>
          )}
        </div>
      </div>

      {/* ──── Legal Links Section ──── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <h2>Legal</h2>
        </div>
        <div className="settings-legal-links">
          <Link to="/privacy" className="settings-legal-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Privacy Policy
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', opacity: 0.4 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
          <Link to="/terms" className="settings-legal-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Terms of Service
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', opacity: 0.4 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ──── Danger Zone ──── */}
      <div className="settings-section settings-danger-zone">
        <div className="settings-section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <h2>Danger Zone</h2>
        </div>
        <p className="settings-danger-text">
          Permanently delete your account and all associated data including decks, brand kits, and usage history. This action cannot be undone.
        </p>
        <button
          className="btn btn-danger"
          onClick={() => setShowDeleteModal(true)}
          style={{ gap: '0.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Delete My Account
        </button>
      </div>

      {/* ──── Delete Confirmation Modal ──── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => { if (!deleting) { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(null) } }}>
          <div className="modal-content settings-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-delete-modal-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>Delete Your Account?</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              This will <strong style={{ color: 'var(--color-error)' }}>permanently delete</strong> all your data:
            </p>
            <ul className="settings-delete-list">
              <li>All decks and slides</li>
              <li>Brand kits and logos</li>
              <li>Usage history and analytics</li>
              <li>Subscription (will be cancelled)</li>
            </ul>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
              Type <strong style={{ color: 'var(--color-text-primary)' }}>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              className="form-input"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
              disabled={deleting}
              style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', fontWeight: 600, letterSpacing: '0.1em' }}
            />
            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(null) }}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{ flex: 1, gap: '0.5rem' }}
              >
                {deleting ? (
                  <>
                    <div className="processing-spinner" style={{ width: 16, height: 16 }}></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Forever'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
