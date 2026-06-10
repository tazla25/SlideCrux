import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Navbar({ session }) {
  const user = session?.user
  const email = user?.email
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    if (!user) return;

    async function fetchPlan() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        
        if (data && !error) {
          setPlan(data.plan)
        }
      } catch (err) {
        console.error('Error fetching plan in Navbar:', err)
      }
    }

    fetchPlan()

    // Subscribe to profile changes to update plan in navbar in real-time if updated
    const channel = supabase
      .channel('navbar-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && payload.new.plan) {
            setPlan(payload.new.plan)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      console.error('Error signing out:', err.message)
    }
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        SlideCrux <span aria-hidden="true">⚡</span>
      </Link>

      <div className="navbar-menu">
        {session ? (
          <>
            <Link to="/new-deck" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginRight: '0.5rem' }}>
              New Deck
            </Link>
            <Link to="/dashboard" className="btn-nav-link">Dashboard</Link>
            <Link to="/pricing" className="btn-nav-link">Pricing</Link>
            <Link to="/settings" className="btn-nav-link">Settings</Link>
            <span className="navbar-user" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{email}</span>
              {plan && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.4rem',
                  backgroundColor: plan === 'free' ? 'rgba(156, 163, 175, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: plan === 'free' ? 'var(--color-text-secondary)' : 'var(--color-accent)',
                  borderRadius: '4px',
                  border: '1px solid ' + (plan === 'free' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
                  letterSpacing: '0.05em'
                }}>
                  {plan}
                </span>
              )}
            </span>
            <button onClick={handleSignOut} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-nav-link">Log In</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
