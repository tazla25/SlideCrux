import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { trackEvent } from '../lib/analytics'

export default function LandingPage({ session }) {
  const observerRef = useRef(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

    const elements = document.querySelectorAll('.fade-in')
    elements.forEach(el => observerRef.current.observe(el))

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
      ),
      title: 'YouTube & Loom Support',
      description: 'Just paste a link. We automatically extract the transcript—no manual downloading required.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
          <path d="M12 2a10 10 0 0 1 10 10" />
          <path d="M12 8v4l3 3" />
        </svg>
      ),
      title: 'Intelligent Summarization',
      description: 'Our AI distills an hour-long video into exactly 10 impactful, action-oriented slides.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="2.5" />
          <path d="M13.5 9.5c-2.5 0-4.5 1.5-4.5 3.5v2h9v-2c0-2-2-3.5-4.5-3.5z" />
          <path d="M2 21l2-7h4l2 7" />
          <path d="M5 14v-2a2 2 0 0 1 2-2" />
        </svg>
      ),
      title: 'Custom Brand Kits',
      description: 'Apply your company colors, fonts, and branding instantly. Say goodbye to manual formatting.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ),
      title: 'Auto Speaker Notes',
      description: 'Each slide is generated with extensive speaker notes pulled directly from the source video context.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
      title: 'AI Image Prompts',
      description: 'AI suggests the perfect visual prompt for every slide so you never have to search for stock photos.'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      title: 'Export Anywhere',
      description: 'Download as PDF, PowerPoint, or present directly in the browser with our sleek presentation mode.'
    }
  ]

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid" />
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
        </div>

        <div className="hero-content">
          <div className="hero-badge fade-in">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 8px var(--success)',
                display: 'inline-block'
              }} />
              SlideCrux 2.0 is live
            </span>
          </div>

          <h1 className="hero-title fade-in" style={{ animationDelay: '0.1s' }}>
            Turn Videos into
            <br />
            <span style={{
              background: 'linear-gradient(135deg, var(--brand-400) 0%, var(--brand-500) 40%, var(--accent-400) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Stunning Presentations
            </span>
          </h1>

          <p className="hero-subtitle fade-in" style={{ animationDelay: '0.2s' }}>
            Paste a YouTube or Loom link. Our AI analyzes the transcript
            and generates a beautiful, branded deck in seconds.
          </p>

          <div className="hero-cta fade-in" style={{ animationDelay: '0.3s' }}>
            {session ? (
              <Link
                to="/dashboard"
                className="btn btn-primary btn-lg"
                onClick={() => trackEvent('landing_cta_clicked', { cta: 'hero_dashboard' })}
              >
                Go to Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <Link
                to="/register"
                className="btn btn-primary btn-lg"
                onClick={() => trackEvent('landing_cta_clicked', { cta: 'hero_register' })}
              >
                Get Started for Free
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            )}
            <a href="#features" className="btn btn-secondary btn-lg">
              See How It Works
            </a>
          </div>
        </div>

        {/* Hero Mockup */}
        <div className="hero-mockup fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="mockup-browser">
            <div className="mockup-bar">
              <span className="mockup-dot" style={{ background: '#ef4444' }} />
              <span className="mockup-dot" style={{ background: '#fbbf24' }} />
              <span className="mockup-dot" style={{ background: '#34d399' }} />
            </div>
            <div className="mockup-content">
              <div className="mockup-sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-500)' }} />
                  <div style={{ height: 10, width: '60%', background: 'var(--border-default)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                {['Intro', 'Key Features', 'Architecture', 'Results', 'Q&A'].map((item, i) => (
                  <div
                    key={item}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      background: i === 2 ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      border: i === 2 ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid transparent',
                      fontSize: 'var(--text-xs)',
                      fontWeight: i === 2 ? 600 : 400,
                      color: i === 2 ? 'var(--brand-400)' : 'var(--text-tertiary)'
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mockup-main">
                <div style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 280,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: 'var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-widest)',
                    color: 'var(--accent-400)',
                    fontWeight: 700,
                    marginBottom: 'var(--space-3)'
                  }}>
                    Section Break
                  </div>
                  <h3 style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 800,
                    marginBottom: 'var(--space-4)',
                    letterSpacing: 'var(--tracking-tight)'
                  }}>
                    The Future of Video
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-6)', flex: 1 }}>
                    <ul style={{
                      flex: 1,
                      paddingLeft: 'var(--space-5)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 'var(--leading-relaxed)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)'
                    }}>
                      <li>AI-driven summarization saves hours</li>
                      <li>Extract key insights instantly</li>
                      <li>Generate speaker notes automatically</li>
                    </ul>
                    <div style={{
                      flex: 1,
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-tertiary)',
                      fontSize: 'var(--text-xs)'
                    }}>
                      AI Visual
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto var(--space-12)' }} className="fade-in">
          <h2 style={{
            fontSize: 'clamp(var(--text-2xl), 4vw, var(--text-4xl))',
            fontWeight: 900,
            letterSpacing: 'var(--tracking-tight)',
            marginBottom: 'var(--space-4)'
          }}>
            Everything you need to
            <span style={{
              background: 'linear-gradient(135deg, var(--brand-400), var(--accent-400))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}> pitch faster</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
            We built SlideCrux to eliminate the hours spent typing out notes and formatting slides.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="feature-card fade-in"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="feature-icon" style={{ color: 'var(--brand-400)' }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <div className="testimonial fade-in">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: 'var(--brand-500)', opacity: 0.3, marginBottom: 'var(--space-4)' }}
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="testimonial-quote">
            SlideCrux completely changed how I prepare for client meetings. I just paste my prep video and get a perfect deck. What used to take 2 hours now takes 2 minutes.
          </p>
          <div className="testimonial-author">
            <div className="author-avatar">S</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Sarah J.</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>VP of Sales</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2 className="fade-in">
          Ready to upgrade your
          <span style={{
            background: 'linear-gradient(135deg, var(--brand-400), var(--accent-400))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}> workflow?</span>
        </h2>
        <p className="fade-in" style={{ transitionDelay: '0.1s' }}>
          Join thousands of professionals creating better presentations, faster.
        </p>
        <div className="fade-in" style={{ transitionDelay: '0.2s' }}>
          {session ? (
            <Link
              to="/dashboard"
              className="btn btn-primary btn-xl"
              onClick={() => trackEvent('landing_cta_clicked', { cta: 'footer_dashboard' })}
            >
              Open Dashboard
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn btn-primary btn-xl"
              onClick={() => trackEvent('landing_cta_clicked', { cta: 'footer_register' })}
            >
              Start Generating for Free
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="footer-brand">SlideCrux</span>
          </div>
          <div className="footer-links">
            <Link to="/pricing">Pricing</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
