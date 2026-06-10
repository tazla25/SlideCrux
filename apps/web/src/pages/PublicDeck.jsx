import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SlideRenderer from '../components/SlideRenderer';

export default function PublicDeck() {
  const { slug } = useParams();
  const [deck, setDeck] = useState(null);
  const [slides, setSlides] = useState([]);
  const [brandKit, setBrandKit] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicDeck() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch public deck
        const { data: deckData, error: deckError } = await supabase
          .from('decks')
          .select('*')
          .eq('public_slug', slug)
          .single();

        if (deckError) {
          throw new Error('Presentation not found or sharing has been disabled.');
        }

        if (!isMounted) return;
        setDeck(deckData);

        // 2. Fetch slides for this deck
        const { data: slidesData, error: slidesError } = await supabase
          .from('slides')
          .select('*')
          .eq('deck_id', deckData.id)
          .order('sort_order', { ascending: true });

        if (slidesError) throw slidesError;

        if (isMounted) {
          setSlides(slidesData || []);
          if (slidesData && slidesData.length > 0) {
            setActiveSlideIndex(0);
          }
        }

        // 3. Fetch brand kit if available
        if (deckData.brand_kit_id) {
          const { data: kitData, error: kitError } = await supabase
            .from('brand_kits')
            .select('*')
            .eq('id', deckData.brand_kit_id)
            .single();
          
          if (!kitError && isMounted) {
            setBrandKit(kitData);
          }
        }
      } catch (err) {
        console.error('Error fetching public deck:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load presentation.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (slug) {
      loadPublicDeck();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Navigate slides helper
  const handlePrev = () => {
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (activeSlideIndex < slides.length - 1) {
      setActiveSlideIndex(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Loading presentation...</div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔍</div>
        <h2 style={{ color: 'var(--color-error)', fontWeight: 800, marginBottom: '1rem' }}>Presentation Unavailable</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '480px', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.6' }}>
          {error || 'The presentation you are looking for does not exist or has been made private.'}
        </p>
        <Link to="/" className="btn btn-primary">
          Create Your Own Presentation
        </Link>
      </div>
    );
  }

  const activeSlide = slides[activeSlideIndex];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-family)'
    }}>
      {/* Top Banner */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        fontSize: '0.9rem'
      }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>SlideCrux ⚡</span>
          <span style={{ color: 'var(--color-text-secondary)', margin: '0 0.5rem' }}>|</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>Made with SlideCrux — </span>
          <Link 
            to="/register" 
            style={{ 
              color: 'var(--color-brand)', 
              fontWeight: 600, 
              textDecoration: 'underline' 
            }}
          >
            Make yours →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Presentation Title */}
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-primary)'
        }}>
          {deck.title || 'Untitled Presentation'}
        </h2>

        {/* Slide Viewer Container */}
        <div style={{
          width: '100%',
          maxWidth: '850px',
          aspectRatio: '16/9',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          position: 'relative'
        }}>
          {activeSlide ? (
            <SlideRenderer 
              slide={activeSlide} 
              brandKit={brandKit} 
              showWatermark={deck.watermark} 
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              No slides in this presentation.
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        {slides.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            marginTop: '2rem'
          }}>
            <button 
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={activeSlideIndex === 0}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              ← Prev
            </button>

            <span style={{
              fontSize: '0.95rem',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              minWidth: '100px',
              textAlign: 'center'
            }}>
              Slide {activeSlideIndex + 1} of {slides.length}
            </span>

            <button 
              className="btn btn-secondary"
              onClick={handleNext}
              disabled={activeSlideIndex === slides.length - 1}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
