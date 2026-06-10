import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="landing-page" style={{ paddingTop: '5rem', minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="dashboard-container" style={{ maxWidth: '800px', backgroundColor: 'var(--color-bg-secondary)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" className="btn-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Home
          </Link>
        </div>
        
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="legal-content" style={{ color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>1. Introduction</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            Welcome to SlideCrux. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>2. The Data We Collect About You</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data</strong> includes email address.</li>
            <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
            <li><strong>Usage Data</strong> includes information about how you use our website, products and services.</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>3. How We Use Your Personal Data</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>4. Third-Party Integrations</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            Our Service allows you to connect to third-party services such as Google Slides and YouTube. By using these features, you are also bound by the respective Terms of Service and Privacy Policies of these third parties.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>5. Data Security</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>6. Contact Us</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            If you have any questions about this privacy policy or our privacy practices, please contact us at support@slidecrux.com.
          </p>
        </div>
      </div>
    </div>
  );
}
