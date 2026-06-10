import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="landing-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div className="hero-background">
        <div className="hero-glow-1"></div>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: '8rem', margin: '0', background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
          404
        </h1>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>This slide doesn't exist yet!</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
          Looks like you've navigated off the edge of the presentation. Let's get you back to creating.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-secondary btn-lg">
            Back to Dashboard
          </Link>
          <Link to="/new-deck" className="btn btn-primary btn-lg pulse-hover">
            Create a New Deck
          </Link>
        </div>
      </div>
    </div>
  );
}
