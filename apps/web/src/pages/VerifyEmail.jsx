import { Link } from 'react-router-dom'

function VerifyEmail() {
  return (
    <div className="auth-page">
      <div className="auth-card verify-card">
        <div className="verify-icon">
          <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
        <div className="auth-header">
          <h2 className="auth-title">Verify your email</h2>
          <p className="auth-subtitle" style={{ marginTop: '0.5rem' }}>
            We've sent a verification link to your email address. Please click the link to activate your account.
          </p>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Once verified, you will be able to sign in to your dashboard.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
