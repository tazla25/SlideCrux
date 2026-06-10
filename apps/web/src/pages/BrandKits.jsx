import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BrandKitForm from '../components/BrandKitForm'

const PLAN_LIMITS = { free: 1, pro: 1, team: 3 }

export default function BrandKits() {
  const [kits, setKits] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showForm, setShowForm] = useState(false)
  const [editingKit, setEditingKit] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [kitsRes, profileRes] = await Promise.all([
        supabase
          .from('brand_kits')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
      ])

      if (kitsRes.data) setKits(kitsRes.data)
      if (profileRes.data) setProfile(profileRes.data)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('brand_kits').delete().eq('id', deleteModal.id)
      if (error) throw error
      setKits(prev => prev.filter(k => k.id !== deleteModal.id))
      setDeleteModal(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete brand kit')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = (savedKit) => {
    setKits(prev => {
      const exists = prev.find(k => k.id === savedKit.id)
      if (exists) {
        return prev.map(k => k.id === savedKit.id ? savedKit : k)
      }
      return [savedKit, ...prev]
    })
    setShowForm(false)
    setEditingKit(null)
  }

  const plan = profile?.plan || 'free'
  const kitLimit = PLAN_LIMITS[plan] || 1
  const canCreate = kits.length < kitLimit

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[1, 2].map(i => (
            <div key={i} className="skeleton-card skeleton-loading"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Brand Kits</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Manage custom colors and fonts for your presentations
          </p>
        </div>
        <div>
          <Link to="/dashboard" className="btn btn-secondary" style={{ marginRight: '1rem' }}>
            Back
          </Link>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (canCreate) {
                setEditingKit(null)
                setShowForm(true)
              } else {
                alert(`Your ${plan} plan is limited to ${kitLimit} brand kit(s). Please upgrade to add more.`)
              }
            }}
          >
            Create New 🎨
          </button>
        </div>
      </header>

      {kits.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-icon" style={{ fontSize: '2rem' }}>🎨</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Brand Kits yet</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: '360px' }}>
            Create a brand kit to automatically apply your company's colors and fonts to new AI-generated decks.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingKit(null)
              setShowForm(true)
            }}
          >
            Create Your First Kit
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {kits.map(kit => (
            <div key={kit.id} className="brand-kit-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{kit.name}</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  Font: <span style={{ color: 'var(--color-text-primary)' }}>{kit.font_family}</span>
                </p>
              </div>
              
              <div className="brand-kit-swatches">
                <div className="brand-kit-swatch" style={{ background: kit.primary_color }} title="Primary" />
                <div className="brand-kit-swatch" style={{ background: kit.secondary_color }} title="Secondary" />
                <div className="brand-kit-swatch" style={{ background: kit.accent_color }} title="Accent" />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setEditingKit(kit)
                    setShowForm(true)
                  }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => setDeleteModal(kit)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forms & Modals */}
      {showForm && (
        <BrandKitForm 
          brandKit={editingKit} 
          onSave={handleSave} 
          onCancel={() => {
            setShowForm(false)
            setEditingKit(null)
          }} 
        />
      )}

      {deleteModal && (
        <div className="dash-modal-overlay" onClick={() => !deleting && setDeleteModal(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Delete Brand Kit?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Are you sure you want to delete <strong>"{deleteModal.name}"</strong>? This will not affect existing presentations, but it won't be available for new ones.
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
