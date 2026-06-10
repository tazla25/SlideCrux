import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { trackEvent } from '../lib/analytics'

export default function LandingPage({ session }) {
  // Simple intersection observer for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-section').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-glow-1"></div>
          <div className="hero-glow-2"></div>
        </div>
        
        <div className="hero-content">
          <div className="badge-pill fade-in-section">
            <span className="badge-pill-text">SlideCrux 1.0 is live</span>
          </div>
          <h1 className="hero-title fade-in-section" style={{ animationDelay: '0.1s' }}>
            Turn Videos into <br/>
            <span className="text-gradient">Stunning Presentations</span>
          </h1>
          <p className="hero-subtitle fade-in-section" style={{ animationDelay: '0.2s' }}>
            Paste a YouTube or Loom link. Our AI analyzes the transcript and generates a beautiful, branded deck in seconds.
          </p>
          <div className="hero-cta fade-in-section" style={{ animationDelay: '0.3s' }}>
            {session ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg pulse-hover" onClick={() => trackEvent('landing_cta_clicked', { cta: 'hero_dashboard' })}>
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary btn-lg pulse-hover" onClick={() => trackEvent('landing_cta_clicked', { cta: 'hero_register' })}>
                Get Started for Free
              </Link>
            )}
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              See How It Works
            </a>
          </div>
        </div>

        {/* Mockup Showcase */}
        <div className="hero-mockup fade-in-section" style={{ animationDelay: '0.4s' }}>
          <div className="mockup-browser">
            <div className="mockup-header">
              <span className="mockup-dot red"></span>
              <span className="mockup-dot yellow"></span>
              <span className="mockup-dot green"></span>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="mockup-skeleton skeleton-title"></div>
                <div className="mockup-skeleton skeleton-item"></div>
                <div className="mockup-skeleton skeleton-item active"></div>
                <div className="mockup-skeleton skeleton-item"></div>
              </div>
              <div className="mockup-main">
                <div className="mockup-slide">
                  <h2>The Future of Video</h2>
                  <div className="mockup-slide-content">
                    <ul>
                      <li>AI-driven summarization saves hours.</li>
                      <li>Extract key insights instantly.</li>
                      <li>Generate speaker notes automatically.</li>
                    </ul>
                    <div className="mockup-slide-image"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section fade-in-section" id="how-it-works">
        <div className="section-header">
          <h2>Everything you need to pitch faster</h2>
          <p>We built SlideCrux to eliminate the hours spent typing out notes and formatting slides.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>YouTube & Loom Support</h3>
            <p>Just paste a link. We automatically extract the transcript, no manual downloading required.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Intelligent Summarization</h3>
            <p>Our AI model distills an hour-long video into exactly 10 impactful, action-oriented slides.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Custom Brand Kits</h3>
            <p>Apply your company's colors, fonts, and branding instantly. Say goodbye to manual formatting.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎙️</div>
            <h3>Auto Speaker Notes</h3>
            <p>Each slide is generated with extensive speaker notes directly pulled from the source video context.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🖼️</div>
            <h3>Image Prompts</h3>
            <p>AI suggests the perfect visual prompt for every slide so you never have to search for stock photos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Export Anywhere</h3>
            <p>Download as PDF, PowerPoint, or present directly in the browser with our sleek presentation mode.</p>
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="social-proof-section fade-in-section">
        <div className="testimonial-card">
          <p className="testimonial-quote">"SlideCrux completely changed how I prepare for client meetings. I just paste my prep video and get a perfect deck. What used to take 2 hours now takes 2 minutes."</p>
          <div className="testimonial-author">
            <div className="author-avatar">S</div>
            <div>
              <div className="author-name">Sarah J.</div>
              <div className="author-title">VP of Sales</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="footer-cta-section fade-in-section">
        <h2>Ready to upgrade your workflow?</h2>
        <p>Join thousands of professionals creating better presentations, faster.</p>
        {session ? (
          <Link to="/dashboard" className="btn btn-primary btn-lg pulse-hover" onClick={() => trackEvent('landing_cta_clicked', { cta: 'footer_dashboard' })}>
            Open Dashboard
          </Link>
        ) : (
          <Link to="/register" className="btn btn-primary btn-lg pulse-hover" onClick={() => trackEvent('landing_cta_clicked', { cta: 'footer_register' })}>
            Start Generating for Free
          </Link>
        )}
      </section>

      {/* Simple Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">SlideCrux</div>
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
