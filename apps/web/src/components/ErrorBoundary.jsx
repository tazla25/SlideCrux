import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="landing-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-error)' }}>Something went wrong.</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '500px' }}>
            We hit an unexpected error while rendering this page. Our team has been notified (metaphorically). 
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </button>
          </div>

          {this.state.error && (
            <details style={{ textAlign: 'left', backgroundColor: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', maxWidth: '800px', width: '100%', overflow: 'auto' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Error Details (for developers)</summary>
              <pre style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-error)', whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}
