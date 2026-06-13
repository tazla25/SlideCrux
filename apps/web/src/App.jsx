import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import DeckEditor from './pages/DeckEditor'
import NewDeck from './pages/NewDeck'
import PublicDeck from './pages/PublicDeck'
import Pricing from './pages/Pricing'
import BrandKits from './pages/BrandKits'
import LandingPage from './pages/LandingPage'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'

const ProtectedRoute = ({ children, session }) => {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Loading SlideCrux...</div>
      </div>
    )
  }



  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/verify-email" element={session ? <Navigate to="/dashboard" replace /> : <VerifyEmail />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute session={session}>
            <AppShell>
              <Dashboard session={session} />
            </AppShell>
          </ProtectedRoute>
        } />

        <Route path="/deck/:id" element={
          <ProtectedRoute session={session}>
            <DeckEditor session={session} />
          </ProtectedRoute>
        } />
        
        <Route path="/new-deck" element={
          <ProtectedRoute session={session}>
            <AppShell>
              <NewDeck />
            </AppShell>
          </ProtectedRoute>
        } />

        <Route path="/pricing" element={
          <ProtectedRoute session={session}>
            <Pricing />
          </ProtectedRoute>
        } />

        <Route path="/brand-kits" element={
          <ProtectedRoute session={session}>
            <AppShell>
              <BrandKits />
            </AppShell>
          </ProtectedRoute>
        } />

        <Route path="/d/:slug" element={<PublicDeck />} />
        
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        
        <Route path="/settings" element={
          <ProtectedRoute session={session}>
            <AppShell>
              <Settings session={session} />
            </AppShell>
          </ProtectedRoute>
        } />

        {/* Fallback route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
