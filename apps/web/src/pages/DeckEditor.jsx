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
  const [savingStatus, setSavingStatus] = useState('saved');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const editVersionRef = useRef(0);
  const isSavingRef = useRef(false);
  const [editVersion, setEditVersion] = useState(0);
  const [deckTitle, setDeckTitle] = useState('');
  const [plan, setPlan] = useState('free');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportingStatus, setExportingStatus] = useState(null);
  const [googleSlidesStatus, setGoogleSlidesStatus] = useState('');

  // Mobile tab state: 'preview' | 'edit'
  const [mobileTab, setMobileTab] = useState('preview');

  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

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

  // Initial Load
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const { data: deckData, error: deckError } = await supabase
          .from('decks')
          .select('title, status, brand_kit_id, watermark, error, public_slug')
          .eq('id', id)
          .single();

        if (deckError) throw deckError;
        if (!isMounted) return;

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

        if (currentPlan === 'free') {
          await supabase
            .from('decks')
            .update({ watermark: true })
            .eq('id', id);
          deckData.watermark = true;
        }

        setDeck(deckData);
        setDeckTitle(deckData.title || 'Untitled Presentation');

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

  // Status Polling
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

  // Save active slide
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

  // Debounced auto-save
  useEffect(() => {
    if (!activeSlideId || !unsavedChanges) return;

    const timer = setTimeout(() => {
      saveActiveSlide();
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeSlideId, unsavedChanges, editVersion, saveActiveSlide]);

  const handleFieldChange = (field, value) => {
    setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, [field]: value } : s));
    editVersionRef.current += 1;
    setEditVersion(prev => prev + 1);
    setUnsavedChanges(true);
    setSavingStatus('unsaved');
  };

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

  const handleBrandKitChange = async (kitId) => {
    const previousBrandKitId = deck?.brand_kit_id || null;
    const previousBrandKit = brandKit;

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
      setDeck(prev => ({ ...prev, brand_kit_id: previousBrandKitId }));
      setBrandKit(previousBrandKit);
      alert('Failed to update brand kit. Please try again.');
    }
  };

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

  // Loading state
  if (loading) {
    return (
      <div className="editor-container">
        <header className="editor-header">
          <div className="editor-title-group">
            <div className="skeleton" style={{ width: 90, height: 32 }} />
            <div className="skeleton" style={{ width: 260, height: 32 }} />
          </div>
          <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 'var(--radius-md)' }} />
        </header>
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ flex: 1, padding: 'var(--space-6)' }}>
            <div className="skeleton" style={{ width: '100%', maxWidth: 900, aspectRatio: '16/9', borderRadius: 'var(--radius-lg)', margin: '0 auto' }} />
          </div>
          <div style={{ width: 400, borderLeft: '1px solid var(--border-subtle)', padding: 'var(--space-6)', display: 'block' }} className="hide-mobile">
            <div className="skeleton" style={{ width: 120, height: 24, marginBottom: 'var(--space-6)' }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ width: '100%', height: 56, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--error-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{ color: 'var(--error)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>Error Loading Editor</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Processing overlay for pending decks
  if (deck && (deck.status === 'pending' || deck.status === 'generating' || deck.status === 'transcribing')) {
    return (
      <div className="processing-overlay">
        <div className="processing-spinner-wrap">
          <div className="processing-spinner" />
          <div className="processing-spinner-inner" />
        </div>
        <h2 className="processing-title">Generating Your AI Deck</h2>
        <p className="processing-text">
          Our AI pipeline is busy parsing your video content, structuring your slides, and applying a beautiful custom theme. This takes about 15-30 seconds.
        </p>

        <div className="processing-steps">
          <div className={`processing-step ${deck.status !== 'pending' ? 'done' : 'active'}`}>
            <span className="processing-step-dot" />
            <span>1. Extracting Transcript</span>
          </div>
          <div className={`processing-step ${deck.status === 'generating' ? 'active' : deck.status === 'ready' ? 'done' : ''}`}>
            <span className="processing-step-dot" />
            <span>2. AI Structured Slide Layouts</span>
          </div>
          <div className="processing-step">
            <span className="processing-step-dot" />
            <span>3. Finishing Touches & Design</span>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          style={{ marginTop: 'var(--space-8)' }}
          onClick={() => navigate('/dashboard')}
        >
          Cancel & Back to Dashboard
        </button>
      </div>
    );
  }

  // Failed state
  if (deck && deck.status === 'failed') {
    return (
      <div className="processing-overlay">
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--error-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-6)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 style={{ color: 'var(--error)', fontWeight: 800, marginBottom: 'var(--space-3)', fontSize: 'var(--text-3xl)' }}>Generation Failed</h2>
        <p className="processing-text">
          {deck.error || 'An unexpected error occurred while processing your deck.'}
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-calc-100vh-4rem -m-8 overflow-hidden text-white">
      {/* Export overlay */}
      {exportingStatus && (
        <div className="processing-overlay" style={{ position: 'fixed', zIndex: 'var(--z-modal)' }}>
          <div className="processing-spinner-wrap">
            <div className="processing-spinner" />
            <div className="processing-spinner-inner" />
          </div>
          <h2 className="processing-title">Exporting Presentation</h2>
          <p className="processing-text" style={{ maxWidth: 600 }}>
            {exportingStatus === 'pdf' && 'Generating high-resolution PDF canvas. Please do not close this tab...'}
            {exportingStatus === 'pptx' && 'Mapping slide layouts and elements to native PowerPoint structures...'}
            {exportingStatus === 'gslides' && (googleSlidesStatus || 'Exporting to Google Slides...')}
          </p>
        </div>
      )}

      {/* Left Panel: Editor & Controls */}
      <div className="w-1_3 glass-panel rounded-none border-y-0 border-l-0 border-r-white_10 flex flex-col relative z-10 bg-black_60">
        
        {/* Header / Meta Controls */}
        <div className="p-6 border-b border-white_10 bg-white_5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <button onClick={handleDashboardClick} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors cursor-pointer bg-transparent border-none p-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Dashboard
            </button>
            <div className={`text-xs flex items-center gap-2 ${savingStatus === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'currentColor'
              }} />
              {savingStatus === 'saved' && 'Saved'}
              {savingStatus === 'saving' && 'Saving...'}
              {savingStatus === 'unsaved' && 'Unsaved'}
              {savingStatus === 'error' && 'Error'}
            </div>
          </div>

          <div className="flex justify-between items-center gap-3">
            <input
              type="text"
              className="bg-transparent border-none outline-none text-xl font-bold text-white w-full"
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
            
            <div style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={saveActiveSlide}
                disabled={savingStatus === 'saved' || savingStatus === 'saving'}
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              >
                Save
              </button>

              {/* Export Dropdown */}
              <button
                className="text-xs bg-blue-600_20 text-blue-400 px-3 py-1_5 rounded-lg hover:bg-blue-600_40 transition-colors cursor-pointer border-none flex items-center gap-1 font-medium whitespace-nowrap"
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              >
                Export
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <div className="export-dropdown" style={{ top: '100%', right: 0, marginTop: '4px' }}>
                  <button
                    className="export-dropdown-item"
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
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', fontWeight: 600 }}>Free</span>
                  </button>

                  <button
                    className="export-dropdown-item"
                    disabled={plan === 'free'}
                    style={{ opacity: plan === 'free' ? 0.5 : 1 }}
                    onClick={async () => {
                      setExportDropdownOpen(false);
                      if (plan === 'free') {
                        alert("PPTX Export requires Pro plan. Upgrade to unlock.");
                        return;
                      }
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
                    }}
                  >
                    <span>Export PPTX</span>
                    {plan === 'free' ? (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)', fontWeight: 600 }}>Pro</span>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', fontWeight: 600 }}>Active</span>
                    )}
                  </button>

                  <button
                    className="export-dropdown-item"
                    disabled={plan !== 'team'}
                    style={{ opacity: plan !== 'team' ? 0.5 : 1 }}
                    onClick={async () => {
                      setExportDropdownOpen(false);
                      if (plan !== 'team') {
                        alert("Google Slides Export requires Team plan. Upgrade to unlock.");
                        return;
                      }
                      const token = extractGoogleToken();
                      if (!token) {
                        localStorage.setItem('pending_gslides_export_' + id, 'true');
                        initiateGoogleAuth();
                      } else {
                        await triggerGoogleSlidesExport(token);
                      }
                    }}
                  >
                    <span>Google Slides</span>
                    {plan !== 'team' ? (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)', fontWeight: 600 }}>Team</span>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', fontWeight: 600 }}>Active</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide Navigator */}
        <div className="border-b border-white_10 bg-black_60 p-4">
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {slides.map((s, index) => {
              const isActive = s.id === activeSlideId;
              return (
                <div
                  key={s.id}
                  className={`flex-shrink-0 w-32 h-20 rounded-lg border ${isActive ? 'border-blue-500' : 'border-white_10'} bg-white_5 cursor-pointer flex flex-col p-2 hover:border-white_20 transition-colors relative overflow-hidden`}
                  onClick={() => handleSlideSelect(s.id)}
                >
                  <span className="text-xs text-gray-400 mb-1">Slide {index + 1}</span>
                  <span className="text-sm text-white font-medium truncate">{s.heading || '(Empty)'}</span>
                  {isActive && <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />}
                </div>
              );
            })}
            <button
              className="flex-shrink-0 w-32 h-20 rounded-lg border border-dashed border-white_10 bg-transparent cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-white_20 transition-colors"
              onClick={handleAddSlide}
              disabled={savingStatus === 'saving'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mb-1">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-xs font-medium">Add</span>
            </button>
          </div>
        </div>

        {/* Editor Form */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeSlide ? (
            <>
              {plan === 'free' && (
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--warning-bg)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--warning)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--leading-relaxed)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                  marginBottom: '1rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span><strong>Free Plan:</strong> Watermark is enforced. Upgrade to Pro/Team to remove it.</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Layout</label>
                <select
                  className="input-field"
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  {activeSlide.layout === 'quote' ? 'Quote Text' : 'Heading'}
                </label>
                <input
                  type="text"
                  className="input-field text-lg"
                  value={activeSlide.heading || ''}
                  onChange={(e) => handleFieldChange('heading', e.target.value)}
                  placeholder={activeSlide.layout === 'quote' ? 'Enter quote...' : 'Enter heading...'}
                />
              </div>

              {activeSlide.layout === 'title' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Subtitle</label>
                  <input
                    type="text"
                    className="input-field"
                    value={activeSlide.bullets?.[0] || ''}
                    onChange={(e) => handleFieldChange('bullets', [e.target.value])}
                    placeholder="Enter presentation subtitle..."
                  />
                </div>
              )}

              {(activeSlide.layout === 'bullets' || activeSlide.layout === 'image_right') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Bullets (one per line)</label>
                  <textarea
                    className="input-field h-32 resize-none leading-relaxed"
                    value={Array.isArray(activeSlide.bullets) ? activeSlide.bullets.join('\n') : ''}
                    onChange={(e) => handleFieldChange('bullets', e.target.value.split('\n'))}
                    placeholder="First bullet point&#10;Second bullet point&#10;Third bullet point..."
                  />
                </div>
              )}

              {activeSlide.layout === 'quote' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Citation / Author</label>
                  <input
                    type="text"
                    className="input-field"
                    value={activeSlide.bullets?.[0] || ''}
                    onChange={(e) => handleFieldChange('bullets', [e.target.value])}
                    placeholder="e.g. Steve Jobs"
                  />
                </div>
              )}

              {activeSlide.layout === 'image_right' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Image URL (Optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={activeSlide.image_url || ''}
                      onChange={(e) => handleFieldChange('image_url', e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">AI Image Prompt (Optional)</label>
                    <textarea
                      className="input-field h-32 resize-none leading-relaxed"
                      value={activeSlide.image_prompt || ''}
                      onChange={(e) => handleFieldChange('image_prompt', e.target.value)}
                      placeholder="e.g. A high-tech server room with neon blue lights, isometric 3d render..."
                    />
                  </div>
                </>
              )}

              <div className="space-y-2 pt-6 border-t border-white_10 mt-6">
                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Brand Kit</label>
                <select
                  className="input-field"
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

              <div className="space-y-4 pt-6 border-t border-white_10 mt-6" onClickCapture={(e) => {
                if (plan === 'free') {
                  e.preventDefault();
                  alert("Watermark removal is a Pro feature. Upgrade your plan.");
                }
              }}>
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ opacity: plan === 'free' ? 0.6 : 1, cursor: plan === 'free' ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    className="form-checkbox"
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

              <div className="space-y-2 pt-6 border-t border-white_10 mt-6">
                <label className="text-sm font-bold text-white tracking-wider">Share Presentation</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="make-public-checkbox"
                    className="form-checkbox"
                    checked={!!deck.public_slug}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      const previousSlug = deck.public_slug;
                      let newSlug = null;
                      if (checked) {
                        newSlug = Math.random().toString(36).substring(2, 11);
                        trackEvent('share_link_created');
                      }
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
                  <label htmlFor="make-public-checkbox" className="cursor-pointer text-sm">
                    Make Presentation Public
                  </label>
                </div>
                {deck.public_slug && (
                  <div className="mt-3 p-3 bg-black_60 border border-white_10 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">
                      Anyone with the link can view:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        className="input-field text-xs py-1_5 flex-1"
                        value={window.location.origin + '/d/' + deck.public_slug}
                      />
                      <button
                        className="btn btn-secondary btn-sm whitespace-nowrap"
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
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

              <div className="pt-6 mt-auto">
                <button
                  className="w-full bg-red-600_20 text-red-400 border border-red-500_30 px-4 py-2 rounded-lg hover:bg-red-600_40 transition-colors font-medium flex justify-center items-center gap-2"
                  onClick={handleDeleteSlide}
                  disabled={savingStatus === 'saving'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Slide
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 h-full py-12">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="mb-4 opacity-40">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p>Select or add a slide to start editing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Live Preview Canvas */}
      <div className="w-2_3 bg-dark-canvas relative flex flex-col items-center justify-center p-12 custom-pattern-bg">
        {activeSlide ? (
          <div className="w-full max-w-6xl aspect-video bg-white rounded-xl shadow-canvas flex flex-col transform transition-all duration-500 hover-scale-102 overflow-hidden relative">
            <SlideRenderer
              slide={activeSlide}
              brandKit={brandKit}
              showWatermark={deck?.watermark}
            />
          </div>
        ) : (
          <div className="text-gray-600 text-xl font-medium">No Slide Selected</div>
        )}
      </div>
    </div>
  );
}
