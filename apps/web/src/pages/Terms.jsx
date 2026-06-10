import { Link } from 'react-router-dom';

export default function Terms() {
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
          Terms of Service
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="legal-content" style={{ color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>1. Agreement to Terms</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>2. Intellectual Property</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            The Service and its original content (excluding Content provided by you), features and functionality are and will remain the exclusive property of SlideCrux and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>3. User Content</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
          </p>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>4. Subscriptions and Payments</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            Some parts of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly or annual basis, depending on the type of subscription plan you select when purchasing a Subscription.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>5. Limitation of Liability</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            In no event shall SlideCrux, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>6. Changes</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
        </div>
      </div>
    </div>
  );
}
