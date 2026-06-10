import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SlideRenderer from '../components/SlideRenderer';
import { exportDeckToPdf } from '../lib/exportPdf';
import { exportDeckToPptx } from '../lib/exportPptx';
import { initiateGoogleAuth, extractGoogleToken, exportDeckToGoogleSlides } from '../lib/gslides';
import { trackEvent } from '../lib/analytics';


export default function DeckEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState(null);
  const [slides, setSlides] = useState([]);
  const [brandKits, setBrandKits] = useState([]);
  const [brandKit, setBrandKit] = useState(null);
  const [activeSlideId, setActiveSlideId] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingStatus, setSavingStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const editVersionRef = useRef(0);
  const isSavingRef = useRef(false);
  const [editVersion, setEditVersion] = useState(0);
  const [deckTitle, setDeckTitle] = useState('');
  const [plan, setPlan] = useState('free');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportingStatus, setExportingStatus] = useState(null); // null | 'pdf' | 'pptx' | 'gslides'
  const [googleSlidesStatus, setGoogleSlidesStatus] = useState('');

  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  // Removed deck title effect to avoid synchronous setState inside render/effect cycles

  const activeSlide = slides.find(s => s.id === activeSlideId) || null;

  const triggerGoogleSlidesExport = useCallback(async (token) => {
    if (!slidesRef.current || slidesRef.current.length === 0) {
      alert('No slides available to export.');
      return;
    }

    setExportingStatus('gslides');
    setGoogleSlidesStatus('Initializing Google Slides presentation...');

    try {
      const watermarkEnforced = plan === 'free' || (deck?.watermark ?? true);
      const presentationId = await exportDeckToGoogleSlides(
        deckTitle,
        slidesRef.current,
        brandKit,
        token,
        watermarkEnforced
      );
      trackEvent('deck_exported', { format: 'gslides' });
      setGoogleSlidesStatus('Opening presentation in Google Slides...');
      window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank');
    } catch (err) {
      console.error('Google Slides export failed:', err);
      if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized') || err.message.toLowerCase().includes('invalid credentials')) {
        localStorage.removeItem('google_access_token');
        if (window.confirm('Google Slides session expired. Would you like to sign in again?')) {
          localStorage.setItem('pending_gslides_export_' + id, 'true');
          initiateGoogleAuth();
          return;
        }
      } else {
        alert('Google Slides Export failed: ' + err.message);
      }
    } finally {
      setExportingStatus(null);
    }
  }, [deck, deckTitle, brandKit, plan, id]);

  // Handle Google Slides OAuth callback redirection and automatic export
  useEffect(() => {
    if (loading || !deck || slides.length === 0) return;

    async function checkPendingGoogleSlidesExport() {
      const token = extractGoogleToken();
      if (token && localStorage.getItem('pending_gslides_export_' + id) === 'true') {
        localStorage.removeItem('pending_gslides_export_' + id);
        await triggerGoogleSlidesExport(token);
      }
    }

    checkPendingGoogleSlidesExport();
  }, [loading, deck, slides, id, triggerGoogleSlidesExport]);


  // 1. Initial Load: Deck, Slides, Brand Kits
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch Deck Metadata
        const { data: deckData, error: deckError } = await supabase
          .from('decks')
          .select('title, status, brand_kit_id, watermark, error, public_slug')
          .eq('id', id)
          .single();

        if (deckError) throw deckError;
        if (!isMounted) return;

        // Fetch User's Profile Plan
        const { data: { user } } = await supabase.auth.getUser();
        let currentPlan = 'free';
        if (user && isMounted) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();
          if (profileData) {
            currentPlan = profileData.plan || 'free';
            setPlan(currentPlan);
          }
        }

        // If plan is 'free', enforce watermark is true in both DB and visual states
        if (currentPlan === 'free' && deckData.watermark !== true) {
          await supabase
            .from('decks')
            .update({ watermark: true })
            .eq('id', id);
          deckData.watermark = true;
        }

        setDeck(deckData);
        setDeckTitle(deckData.title || 'Untitled Presentation');

        // Fetch User's Brand Kits (to allow selection)
        const { data: kitsData } = await supabase
          .from('brand_kits')
          .select('*')
          .order('name');
        if (kitsData && isMounted) {
          setBrandKits(kitsData);
          if (deckData.brand_kit_id) {
            const activeKit = kitsData.find(k => k.id === deckData.brand_kit_id);
            setBrandKit(activeKit || null);
          }
        }

        // Fetch Slides only if ready
        if (deckData.status === 'ready') {
          const { data: slidesData, error: slidesError } = await supabase
            .from('slides')
            .select('*')
            .eq('deck_id', id)
            .order('sort_order', { ascending: true });

          if (slidesError) throw slidesError;
          if (isMounted) {
            setSlides(slidesData);
            if (slidesData.length > 0) {
              setActiveSlideId(slidesData[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading deck editor:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load deck data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // 2. Status Polling if deck is not ready/failed
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const pollStatus = async () => {
      try {
        const { data: deckData, error: deckError } = await supabase
          .from('decks')
          .select('title, status, brand_kit_id, watermark, error, public_slug')
          .eq('id', id)
          .single();

        if (deckError) throw deckError;
        if (!isMounted) return;

        setDeck(deckData);
        setDeckTitle(deckData.title || 'Untitled Presentation');

        if (deckData.status === 'ready') {
          // Retrieve slides now that they are ready
          const { data: slidesData } = await supabase
            .from('slides')
            .select('*')
            .eq('deck_id', id)
            .order('sort_order', { ascending: true });

          if (slidesData && isMounted) {
            setSlides(slidesData);
            if (slidesData.length > 0) {
              setActiveSlideId(slidesData[0].id);
            }
          }
          if (intervalId) clearInterval(intervalId);
        } else if (deckData.status === 'failed') {
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    };

    if (deck?.status === 'pending' || deck?.status === 'generating' || deck?.status === 'transcribing') {
      intervalId = setInterval(pollStatus, 3000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, deck?.status]);

  // Debounced auto-save hook moved below saveActiveSlide to avoid temporal dead zone

  // Save the currently active slide
  const saveActiveSlide = useCallback(async () => {
    const startVersion = editVersionRef.current;
    isSavingRef.current = true;

    const slideToSave = slidesRef.current.find(s => s.id === activeSlideId);
    if (!slideToSave) {
      isSavingRef.current = false;
      return true;
    }

    setSavingStatus('saving');
    try {
      // Filter out empty lines from bullets
      const cleanBullets = Array.isArray(slideToSave.bullets)
        ? slideToSave.bullets.map(b => typeof b === 'string' ? b.trim() : b).filter(b => b !== '')
        : [];

      const { error: saveError } = await supabase
        .from('slides')
        .update({
          heading: slideToSave.heading,
          layout: slideToSave.layout,
          bullets: cleanBullets,
          image_prompt: slideToSave.image_prompt || '',
          image_url: slideToSave.image_url || ''
        })
        .eq('id', activeSlideId);

      if (saveError) throw saveError;
      
      if (editVersionRef.current === startVersion) {
        setUnsavedChanges(false);
        setSavingStatus('saved');
      }
      return true;
    } catch (err) {
      console.error('Error auto-saving slide:', err);
      setSavingStatus('error');
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [activeSlideId]);

  // 3. Debounced Auto-Save for Slides
  useEffect(() => {
    if (!activeSlideId || !unsavedChanges) return;

    const timer = setTimeout(() => {
      saveActiveSlide();
    }, 1500); // 1.5s typing debounce

    return () => clearTimeout(timer);
  }, [activeSlideId, unsavedChanges, editVersion, saveActiveSlide]);

  // Change input handler
  const handleFieldChange = (field, value) => {
    setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, [field]: value } : s));
    editVersionRef.current += 1;
    setEditVersion(prev => prev + 1);
    setUnsavedChanges(true);
    setSavingStatus('unsaved');
  };

  // Switch slides (saves active slide first if unsaved)
  const handleSlideSelect = async (nextSlideId) => {
    if (nextSlideId === activeSlideId || isSavingRef.current) return;
    
    if (unsavedChanges) {
      const success = await saveActiveSlide();
      if (!success) {
        alert('Failed to save changes. Please resolve the connection error before switching slides.');
        return;
      }
    }
    setActiveSlideId(nextSlideId);
  };

  // Add Slide
  const handleAddSlide = async () => {
    if (isSavingRef.current) return;
    if (unsavedChanges) {
      const success = await saveActiveSlide();
      if (!success) {
        alert('Failed to save current slide. Cannot modify slides list until saved.');
        return;
      }
    }

    const newSortOrder = slides.length > 0
      ? Math.max(...slides.map(s => s.sort_order)) + 1
      : 0;

    isSavingRef.current = true;
    try {
      setSavingStatus('saving');
      const { data: newSlide, error: insertError } = await supabase
        .from('slides')
        .insert({
          deck_id: id,
          sort_order: newSortOrder,
          heading: 'New Slide Heading',
          layout: 'bullets',
          bullets: ['Your bullet point details here'],
          image_prompt: '',
          image_url: ''
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSlides(prev => [...prev, newSlide]);
      setActiveSlideId(newSlide.id);
      setSavingStatus('saved');
    } catch (err) {
      console.error('Error adding slide:', err);
      setSavingStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  };

  // Delete Slide
  const handleDeleteSlide = async () => {
    if (!activeSlideId || isSavingRef.current) return;
    if (unsavedChanges) {
      const success = await saveActiveSlide();
      if (!success) {
        alert('Failed to save current slide. Cannot modify slides list until saved.');
        return;
      }
    }
    if (!window.confirm('Are you sure you want to delete this slide?')) return;

    isSavingRef.current = true;
    try {
      setSavingStatus('saving');
      const { error: deleteError } = await supabase
        .from('slides')
        .delete()
        .eq('id', activeSlideId);

      if (deleteError) throw deleteError;

      const remainingSlides = slides.filter(s => s.id !== activeSlideId);
      setSlides(remainingSlides);

      if (remainingSlides.length > 0) {
        const currentIndex = slides.findIndex(s => s.id === activeSlideId);
        const nextActiveIndex = Math.max(0, currentIndex - 1);
        setActiveSlideId(remainingSlides[nextActiveIndex].id);
      } else {
        setActiveSlideId(null);
      }
      
      setUnsavedChanges(false);
      setSavingStatus('saved');
    } catch (err) {
      console.error('Error deleting slide:', err);
      setSavingStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  };

  // Prevent SPA Router Navigation Data Loss & Tab Closure
  const handleDashboardClick = async () => {
    if (unsavedChanges) {
      const success = await saveActiveSlide();
      if (!success) {
        if (!window.confirm('Failed to save changes. Do you want to leave anyway and discard changes?')) return;
      }
    }
    navigate('/dashboard');
  };

  useEffect(() => {
    if (!unsavedChanges) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedChanges]);

  // Update brand kit linked to deck
  const handleBrandKitChange = async (kitId) => {
    const previousBrandKitId = deck?.brand_kit_id || null;
    const previousBrandKit = brandKit;

    // Optimistically update local state
    setDeck(prev => ({ ...prev, brand_kit_id: kitId || null }));
    const activeKit = brandKits.find(k => k.id === kitId);
    setBrandKit(activeKit || null);

    try {
      const { error: updateError } = await supabase
        .from('decks')
        .update({ brand_kit_id: kitId || null })
        .eq('id', id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating deck brand kit:', err);
      // Revert state
      setDeck(prev => ({ ...prev, brand_kit_id: previousBrandKitId }));
      setBrandKit(previousBrandKit);
      alert('Failed to update brand kit. Please try again.');
    }
  };

  // Rename deck title
  const handleTitleBlur = async (e) => {
    const newTitle = e.target.value.trim();
    const previousTitle = deck?.title || 'Untitled Presentation';
    if (!newTitle) {
      setDeckTitle(previousTitle);
      return;
    }
    if (newTitle === previousTitle) return;

    try {
      const { error: updateError } = await supabase
        .from('decks')
        .update({ title: newTitle })
        .eq('id', id);

      if (updateError) throw updateError;
      setDeck(prev => ({ ...prev, title: newTitle }));
    } catch (err) {
      console.error('Error renaming deck title:', err);
      setDeckTitle(previousTitle);
      alert('Failed to rename deck title. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="deck-editor-container" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="deck-editor-header" style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div className="skeleton-loading" style={{ width: '100px', height: '30px', marginRight: '2rem' }}></div>
          <div className="skeleton-loading" style={{ width: '300px', height: '30px' }}></div>
          <div style={{ flex: 1 }}></div>
          <div className="skeleton-loading" style={{ width: '120px', height: '36px', borderRadius: 'var(--radius-md)' }}></div>
        </header>
        <div className="editor-layout" style={{ flex: 1 }}>
          <div className="editor-sidebar" style={{ padding: '1rem' }}>
            <div className="skeleton-text short skeleton-loading" style={{ marginBottom: '2rem' }}></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-card skeleton-loading" style={{ height: '80px', marginBottom: '1rem' }}></div>
            ))}
          </div>
          <div className="editor-main" style={{ padding: '2rem' }}>
            <div className="skeleton-card skeleton-loading" style={{ height: '600px', maxWidth: '1000px', margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Error Loading Editor</h2>
        <p style={{ margin: '1rem 0' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Polling / processing overlay for pending decks
  if (deck && (deck.status === 'pending' || deck.status === 'generating' || deck.status === 'transcribing')) {
    return (
      <div className="deck-processing-overlay">
        <div className="processing-spinner-container">
          <div className="processing-spinner" />
          <div className="processing-spinner-inner" />
        </div>
        <h2 className="processing-status-title">Generating Your AI Deck</h2>
        <p className="processing-status-text">
          Our AI pipeline is busy parsing your video content, structuring your slides, and applying a beautiful custom theme. This takes about 15-30 seconds.
        </p>

        <div className="processing-status-steps">
          <div className={`processing-step ${deck.status !== 'pending' ? 'done' : 'active'}`}>
            <span className="step-indicator-dot" />
            <span>Extracting Transcript</span>
          </div>
          <div className={`processing-step ${deck.status === 'generating' ? 'active' : deck.status === 'ready' ? 'done' : ''}`}>
            <span className="step-indicator-dot" />
            <span>AI Structured Slide Layouts</span>
          </div>
          <div className="processing-step">
            <span className="step-indicator-dot" />
            <span>Finishing Touches & Design</span>
          </div>
        </div>

        <button 
          className="btn btn-secondary" 
          style={{ marginTop: '2.5rem' }} 
          onClick={() => navigate('/dashboard')}
        >
          Cancel & Back to Dashboard
        </button>
      </div>
    );
  }

  if (deck && deck.status === 'failed') {
    return (
      <div className="deck-processing-overlay">
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ color: 'var(--color-error)', fontWeight: 800 }}>Generation Failed</h2>
        <p className="processing-status-text" style={{ color: 'var(--color-text-secondary)' }}>
          {deck.error || 'An unexpected error occurred while processing your deck.'}
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="deck-editor-container">
      {exportingStatus && (
        <div className="deck-processing-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <div className="processing-spinner-container">
            <div className="processing-spinner" />
            <div className="processing-spinner-inner" />
          </div>
          <h2 className="processing-status-title">Exporting Presentation</h2>
          <p className="processing-status-text" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {exportingStatus === 'pdf' && 'Generating high-resolution PDF canvas. Please do not close this tab...'}
            {exportingStatus === 'pptx' && 'Mapping slide layouts and elements to native PowerPoint structures...'}
            {exportingStatus === 'gslides' && (googleSlidesStatus || 'Exporting to Google Slides...')}
          </p>
        </div>
      )}
      {/* Editor Header Banner */}
      <header className="deck-editor-header">
        <div className="deck-editor-title-section">
          <button onClick={handleDashboardClick} className="btn-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Dashboard
          </button>
          
          <input
            type="text"
            className="deck-title-input"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            title="Click to rename deck"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Save Status Banner */}
          <div className={`save-status-badge ${savingStatus}`}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'currentColor'
            }} />
            {savingStatus === 'saved' && 'Saved'}
            {savingStatus === 'saving' && 'Saving...'}
            {savingStatus === 'unsaved' && 'Unsaved changes'}
            {savingStatus === 'error' && 'Error saving'}
          </div>

          {/* Export Dropdown Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Export ▾
            </button>
            {exportDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                zIndex: 10,
                minWidth: '225px',
                padding: '0.5rem'
              }}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={async () => {
                    setExportDropdownOpen(false);
                    setExportingStatus('pdf');
                    try {
                      const watermarkEnforced = plan === 'free' || (deck?.watermark ?? true);
                      await exportDeckToPdf(deckTitle, slides, brandKit, watermarkEnforced);
                      trackEvent('deck_exported', { format: 'pdf' });
                    } catch (err) {
                      console.error('PDF export failed:', err);
                      alert('PDF export failed: ' + err.message);
                    } finally {
                      setExportingStatus(null);
                    }
                  }}
                >
                  <span>Export PDF</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Free</span>
                </button>

                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: plan === 'free' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: plan === 'free' ? 0.6 : 1
                  }}
                  onClick={async () => {
                    setExportDropdownOpen(false);
                    if (plan === 'free') {
                      alert("PPTX Export requires Pro plan. Upgrade to unlock.");
                    } else {
                      setExportingStatus('pptx');
                      try {
                        const watermarkEnforced = plan === 'free' || (deck?.watermark ?? true);
                        await exportDeckToPptx(deckTitle, slides, brandKit, watermarkEnforced);
                        trackEvent('deck_exported', { format: 'pptx' });
                      } catch (err) {
                        console.error('PPTX export failed:', err);
                        alert('PPTX export failed: ' + err.message);
                      } finally {
                        setExportingStatus(null);
                      }
                    }
                  }}
                >
                  <span>Export PPTX</span>
                  {plan === 'free' ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>🔒 Pro</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Active</span>
                  )}
                </button>

                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: plan === 'team' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: plan === 'team' ? 1 : 0.6
                  }}
                  onClick={async () => {
                    setExportDropdownOpen(false);
                    if (plan !== 'team') {
                      alert("Google Slides Export requires Team plan. Upgrade to unlock.");
                    } else {
                      const token = extractGoogleToken();
                      if (!token) {
                        localStorage.setItem('pending_gslides_export_' + id, 'true');
                        initiateGoogleAuth();
                      } else {
                        await triggerGoogleSlidesExport(token);
                      }
                    }
                  }}
                >
                  <span>Google Slides</span>
                  {plan !== 'team' ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>🔒 Team</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Active</span>
                  )}
                </button>
              </div>
            )}
          </div>

          <button 
            className="btn btn-primary"
            onClick={saveActiveSlide}
            disabled={savingStatus === 'saved' || savingStatus === 'saving'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Save Slide
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <div className="deck-editor-main">
        {/* Left pane: Slide Preview & Slide Strip Navigator */}
        <div className="deck-editor-left-pane">
          <div className="deck-preview-wrapper">
            {activeSlide ? (
              <SlideRenderer 
                slide={activeSlide} 
                brandKit={brandKit} 
                showWatermark={deck?.watermark} 
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-text-secondary)'
              }}>
                No slide selected. Click + below to add one.
              </div>
            )}
          </div>

          {/* Horizontal Slide Strip Navigator */}
          <div className="deck-navigator">
            <div className="navigator-title">Navigator</div>
            <div className="slide-strip">
              {slides.map((s, index) => {
                const isActive = s.id === activeSlideId;
                return (
                  <div
                    key={s.id}
                    className={`slide-thumbnail ${isActive ? 'active' : ''} ${savingStatus === 'saving' ? 'disabled' : ''}`}
                    onClick={() => handleSlideSelect(s.id)}
                  >
                    <span className="thumbnail-number">{index + 1}</span>
                    <div className="thumbnail-content">
                      <span className="thumbnail-layout">{s.layout}</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        maxWidth: '120px'
                      }}>
                        {s.heading || '(Empty)'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add Slide Quick Card */}
              <button className="thumbnail-add-card" onClick={handleAddSlide} disabled={savingStatus === 'saving'}>
                <span className="thumbnail-add-icon">+</span>
                <span className="thumbnail-add-text">Add Slide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right pane: Slide Details Form Controls */}
        <div className="deck-editor-right-pane">
          <div className="editor-pane-header">
            <div className="editor-pane-title">
              <h2>Slide Editor</h2>
            </div>
          </div>

          {activeSlide ? (
            <>
              <div className="editor-form">
                {plan === 'free' && (
                  <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-accent)',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>⚠️</span>
                    <span><strong>Free Plan:</strong> Watermark is enforced on your presentations. Upgrade to Pro/Team to remove it.</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Layout</label>
                  <select
                    className="form-select"
                    value={activeSlide.layout}
                    onChange={(e) => handleFieldChange('layout', e.target.value)}
                  >
                    <option value="title">Title Slide</option>
                    <option value="bullets">Bullet Points</option>
                    <option value="quote">Quote Slide</option>
                    <option value="image_right">Visual Split (Image Right)</option>
                    <option value="section">Section Divider</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {activeSlide.layout === 'quote' ? 'Quote Text' : 'Slide Heading'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={activeSlide.heading || ''}
                    onChange={(e) => handleFieldChange('heading', e.target.value)}
                    placeholder={activeSlide.layout === 'quote' ? 'Enter quote...' : 'Enter heading...'}
                  />
                </div>

                {/* Conditional fields based on layout */}
                {activeSlide.layout === 'title' && (
                  <div className="form-group">
                    <label className="form-label">Subtitle</label>
                    <input
                      type="text"
                      className="form-input"
                      value={activeSlide.bullets?.[0] || ''}
                      onChange={(e) => handleFieldChange('bullets', [e.target.value])}
                      placeholder="Enter presentation subtitle..."
                    />
                  </div>
                )}

                {(activeSlide.layout === 'bullets' || activeSlide.layout === 'image_right') && (
                  <div className="form-group">
                    <label className="form-label">Bullet Points (one per line)</label>
                    <textarea
                      className="form-textarea"
                      value={Array.isArray(activeSlide.bullets) ? activeSlide.bullets.join('\n') : ''}
                      onChange={(e) => handleFieldChange('bullets', e.target.value.split('\n'))}
                      placeholder="First bullet point&#10;Second bullet point&#10;Third bullet point..."
                    />
                  </div>
                )}

                {activeSlide.layout === 'quote' && (
                  <div className="form-group">
                    <label className="form-label">Citation / Author</label>
                    <input
                      type="text"
                      className="form-input"
                      value={activeSlide.bullets?.[0] || ''}
                      onChange={(e) => handleFieldChange('bullets', [e.target.value])}
                      placeholder="e.g. Steve Jobs"
                    />
                  </div>
                )}

                {activeSlide.layout === 'image_right' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Image URL (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeSlide.image_url || ''}
                        onChange={(e) => handleFieldChange('image_url', e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">AI Image Prompt (Optional)</label>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '60px' }}
                        value={activeSlide.image_prompt || ''}
                        onChange={(e) => handleFieldChange('image_prompt', e.target.value)}
                        placeholder="e.g. A high-tech server room with neon blue lights, isometric 3d render..."
                      />
                    </div>
                  </>
                )}

                {/* Brand Kit Selector for the whole Deck */}
                <div className="form-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <label className="form-label">Deck Brand Kit</label>
                  <select
                    className="form-select"
                    value={deck.brand_kit_id || ''}
                    onChange={(e) => handleBrandKitChange(e.target.value || null)}
                  >
                    <option value="">Default (SlideCrux Theme)</option>
                    {brandKits.map((kit) => (
                      <option key={kit.id} value={kit.id}>
                        {kit.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Watermark Checkbox */}
                <div 
                  className="form-group"
                  onClickCapture={(e) => {
                    if (plan === 'free') {
                      e.preventDefault();
                      alert("Watermark removal is a Pro feature. Upgrade your plan.");
                    }
                  }}
                >
                  <label 
                    className="form-label" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      cursor: plan === 'free' ? 'not-allowed' : 'pointer',
                      opacity: plan === 'free' ? 0.7 : 1
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: 'auto', marginRight: '0.25rem' }}
                      checked={plan === 'free' ? true : (deck.watermark ?? true)}
                      disabled={plan === 'free'}
                      onChange={async (e) => {
                        if (plan === 'free') return;
                        const checked = e.target.checked;
                        const previousWatermark = deck.watermark ?? true;
                        setDeck(prev => ({ ...prev, watermark: checked }));
                        try {
                          const { error: updateError } = await supabase
                            .from('decks')
                            .update({ watermark: checked })
                            .eq('id', id);
                          if (updateError) throw updateError;
                        } catch (err) {
                          console.error('Error updating watermark:', err);
                          setDeck(prev => ({ ...prev, watermark: previousWatermark }));
                          alert('Failed to update watermark. Please try again.');
                        }
                      }}
                    />
                    Show Watermark
                  </label>
                </div>

                {/* Share Presentation */}
                <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Share Presentation</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <input
                      type="checkbox"
                      id="make-public-checkbox"
                      style={{ width: 'auto', marginRight: '0.25rem' }}
                      checked={!!deck.public_slug}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        const previousSlug = deck.public_slug;
                        let newSlug = null;
                        if (checked) {
                          newSlug = Math.random().toString(36).substring(2, 11);
                          trackEvent('share_link_created');
                        }
                        
                        // Optimistic update
                        setDeck(prev => ({ ...prev, public_slug: newSlug }));
                        
                        try {
                          const { error: updateError } = await supabase
                            .from('decks')
                            .update({ public_slug: newSlug })
                            .eq('id', id);
                          if (updateError) throw updateError;
                        } catch (err) {
                          console.error('Error updating sharing status:', err);
                          setDeck(prev => ({ ...prev, public_slug: previousSlug }));
                          alert('Failed to update sharing status. Please try again.');
                        }
                      }}
                    />
                    <label htmlFor="make-public-checkbox" style={{ cursor: 'pointer' }}>Make Presentation Public</label>
                  </div>
                  {deck.public_slug && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                        Anyone with the link can view this presentation:
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          readOnly
                          className="form-input"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                          value={window.location.origin + '/d/' + deck.public_slug}
                        />
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + '/d/' + deck.public_slug);
                            alert('Link copied to clipboard!');
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="editor-actions">
                <button className="btn btn-danger" onClick={handleDeleteSlide} disabled={savingStatus === 'saving'}>
                  Delete Slide
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              Select or add a slide to start editing details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
