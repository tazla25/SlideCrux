import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function BrandKitForm({ brandKit, onSave, onCancel }) {
  const [name, setName] = useState(brandKit?.name || '')
  const [primaryColor, setPrimaryColor] = useState(brandKit?.primary_color || '#3b82f6')
  const [secondaryColor, setSecondaryColor] = useState(brandKit?.secondary_color || '#1f2937')
  const [accentColor, setAccentColor] = useState(brandKit?.accent_color || '#f59e0b')
  const [fontFamily, setFontFamily] = useState(brandKit?.font_family || 'Inter')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    
    // basic hex validation
    const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
    if (!hexRegex.test(primaryColor) || !hexRegex.test(secondaryColor) || !hexRegex.test(accentColor)) {
      setError('Invalid color hex codes')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const payload = {
        name,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        font_family: fontFamily,
        owner_id: user.id
      }

      let res;
      if (brandKit?.id) {
        res = await supabase.from('brand_kits').update(payload).eq('id', brandKit.id).select()
      } else {
        res = await supabase.from('brand_kits').insert(payload).select()
      }

      if (res.error) throw res.error

      onSave(res.data[0])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save brand kit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dash-modal-overlay" onClick={onCancel}>
      <div className="dash-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
          {brandKit ? 'Edit Brand Kit' : 'New Brand Kit'}
        </h3>

        {error && (
          <div className="alert" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Kit Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. My Startup"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Color</label>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                value={primaryColor} 
                onChange={e => setPrimaryColor(e.target.value)} 
              />
              <input 
                type="text" 
                className="form-input" 
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Secondary Color</label>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                value={secondaryColor} 
                onChange={e => setSecondaryColor(e.target.value)} 
              />
              <input 
                type="text" 
                className="form-input" 
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                value={accentColor} 
                onChange={e => setAccentColor(e.target.value)} 
              />
              <input 
                type="text" 
                className="form-input" 
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Font Family</label>
            <select 
              className="form-input brand-kit-select" 
              value={fontFamily} 
              onChange={e => setFontFamily(e.target.value)}
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Outfit">Outfit</option>
              <option value="Poppins">Poppins</option>
              <option value="Montserrat">Montserrat</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Kit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
