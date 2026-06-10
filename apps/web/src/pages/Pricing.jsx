import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';

export default function Pricing() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(null); // plan slug currently being upgraded to

  useEffect(() => {
    async function getUserProfile() {
      setLoadingPlan(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setCurrentPlan(profile.plan || 'free');
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoadingPlan(false);
      }
    }
    getUserProfile();
  }, []);

  // Load Lemon.js script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePlanUpgrade = async (selectedPlan) => {
    trackEvent('plan_upgrade_clicked', { tier: selectedPlan });
    
    if (!user) {
      alert('Please log in to upgrade your plan.');
      navigate('/login');
      return;
    }

    if (selectedPlan === 'free') {
      alert('To downgrade to the Free plan, please manage your subscription in settings or contact support.');
      return;
    }

    setUpdatingPlan(selectedPlan);
    
    let checkoutUrl = '';
    if (selectedPlan === 'pro') {
      checkoutUrl = import.meta.env.VITE_LEMON_PRO_CHECKOUT_URL;
    } else if (selectedPlan === 'team') {
      checkoutUrl = import.meta.env.VITE_LEMON_TEAM_CHECKOUT_URL;
    }

    if (checkoutUrl) {
      const url = new URL(checkoutUrl);
      url.searchParams.append('checkout[custom][user_id]', user.id);

      if (window.LemonSqueezy) {
        window.LemonSqueezy.Url.Open(url.toString());
      } else {
        window.open(url.toString(), '_blank');
      }
      setUpdatingPlan(null);
    } else {
      // Fallback for development if URL is missing
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ plan: selectedPlan })
          .eq('id', user.id);

        if (error) {
          if (error.code === '42501' || error.message.includes('Direct updating')) {
            console.warn('Simulation bypass: Since RLS / trigger enforces payment gate protection on backend, we fall back to local UI simulation for developer convenience.');
          } else {
            throw error;
          }
        }

        alert(`Plan updated to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} successfully (Simulated)!`);
        setCurrentPlan(selectedPlan);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error upgrading plan:', err);
        alert(`Failed to update plan: ${err.message || 'Unknown error'}`);
      } finally {
        setUpdatingPlan(null);
      }
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Ideal for getting started with AI-generated presentations.',
      limits: [
        '1 deck per month',
        'PDF export only',
        'SlideCrux watermark on slides',
        'Public sharing required'
      ],
      features: [
        'AI slide layout structuring',
        'Basic theme selector',
        'YouTube/Loom URL parsing'
      ],
      badge: 'Free Tier',
      highlight: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$19',
      period: 'month',
      yearlyPrice: '$190/yr',
      description: 'Best for professional creators, educators, and startups.',
      limits: [
        '30 decks per month',
        'PDF + PPTX exports (native editable)',
        'No watermark on slides',
        'Private sharing with passwords'
      ],
      features: [
        'Custom brand colors & kits',
        'Priority AI queue processing',
        'Access to premium layouts'
      ],
      badge: 'Most Popular',
      highlight: true
    },
    {
      id: 'team',
      name: 'Team',
      price: '$49',
      period: 'month',
      yearlyPrice: '$490/yr',
      description: 'Perfect for collaborative teams and agency workflows.',
      limits: [
        '200 decks per month',
        'Google Slides direct export',
        '3 brand kits & asset library',
        'Notion & Slack direct publishing'
      ],
      features: [
        'Shared team workspace',
        'Shared brand kits & templates',
        'API access & webhook integrations'
      ],
      badge: 'Enterprise power',
      highlight: false
    }
  ];

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '4rem 1.5rem',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-family)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.025em'
        }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '1.1rem',
          lineHeight: '1.6'
        }}>
          Choose the right plan to accelerate your video-to-slide conversions and customize your brand kits.
        </p>
        
        {user && !loadingPlan && (
          <div style={{
            marginTop: '1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.4rem 1rem',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            fontSize: '0.875rem'
          }}>
            <span style={{ color: 'var(--color-text-secondary)', marginRight: '0.5rem' }}>Your Active Plan:</span>
            <strong style={{
              color: currentPlan === 'free' ? 'var(--color-text-primary)' : 'var(--color-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {currentPlan}
            </strong>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        width: '100%',
        alignItems: 'stretch',
        marginBottom: '4rem'
      }}>
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: plan.highlight 
                  ? '2px solid var(--color-brand)' 
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: plan.highlight 
                  ? '0 10px 30px -5px rgba(59, 130, 246, 0.2), 0 8px 10px -6px rgba(59, 130, 246, 0.2)'
                  : '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                if (plan.highlight) {
                  e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(59, 130, 246, 0.3)';
                } else {
                  e.currentTarget.style.boxShadow = '0 20px 30px -5px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (plan.highlight) {
                  e.currentTarget.style.boxShadow = '0 10px 30px -5px rgba(59, 130, 246, 0.2)';
                } else {
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)';
                }
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--color-brand)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.25rem 1rem',
                  borderRadius: '20px',
                  letterSpacing: '0.05em'
                }}>
                  {plan.badge}
                </span>
              )}

              {plan.id === 'team' && (
                <span style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--color-accent)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px'
                }}>
                  {plan.badge}
                </span>
              )}

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {plan.name}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', minHeight: '40px' }}>
                  {plan.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '1.5rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800 }}>{plan.price}</span>
                  <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>/{plan.period}</span>
                </div>
                {plan.yearlyPrice && (
                  <span style={{ 
                    display: 'block', 
                    fontSize: '0.8rem', 
                    color: 'var(--color-success)', 
                    marginTop: '0.25rem',
                    fontWeight: 500
                  }}>
                    Or {plan.yearlyPrice}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <button
                className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                disabled={isCurrent || updatingPlan === plan.id}
                onClick={() => handlePlanUpgrade(plan.id)}
                style={{
                  width: '100%',
                  marginBottom: '2rem',
                  padding: '0.8rem',
                  fontSize: '0.95rem'
                }}
              >
                {updatingPlan === plan.id ? 'Updating...' : isCurrent ? 'Active Plan' : 'Choose Plan'}
              </button>

              {/* Limits and Benefits List */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.85rem', 
                  textTransform: 'uppercase', 
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.05em',
                  marginBottom: '1rem'
                }}>
                  Usage & Limits
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                  {plan.limits.map((limit, idx) => (
                    <li key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.5rem', 
                      fontSize: '0.9rem', 
                      marginBottom: '0.75rem',
                      color: 'var(--color-text-primary)'
                    }}>
                      <span style={{ color: 'var(--color-brand)', fontWeight: 'bold' }}>✓</span>
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.85rem', 
                  textTransform: 'uppercase', 
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.05em',
                  marginBottom: '1rem',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '1rem'
                }}>
                  Features Included
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.5rem', 
                      fontSize: '0.9rem', 
                      marginBottom: '0.75rem',
                      color: 'var(--color-text-secondary)'
                    }}>
                      <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>+</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
