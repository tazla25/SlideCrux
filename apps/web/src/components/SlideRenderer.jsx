const BulletIcon = () => (
  <svg
    className="bullet-diamond"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ width: '0.75em', height: '0.75em', display: 'inline-block', flexShrink: 0 }}
  >
    <rect x="6" y="6" width="12" height="12" rx="2" transform="rotate(45 12 12)" />
  </svg>
);

const getContrastColors = (bgColor) => {
  if (!bgColor) {
    return {
      textPrimary: 'var(--text-primary)',
      textSecondary: 'var(--text-secondary)'
    };
  }

  const cleanColor = bgColor.trim().toLowerCase();

  if (cleanColor.startsWith('var(')) {
    if (
      cleanColor.includes('bg-secondary') ||
      cleanColor.includes('bg-primary') ||
      cleanColor.includes('dark') ||
      cleanColor.includes('brand')
    ) {
      return {
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.7)'
      };
    }
    if (cleanColor.includes('light') || cleanColor.includes('white')) {
      return {
        textPrimary: '#0f172a',
        textSecondary: 'rgba(15, 23, 42, 0.7)'
      };
    }
    return {
      textPrimary: 'var(--text-primary)',
      textSecondary: 'var(--text-secondary)'
    };
  }

  const namedColors = {
    white: '#ffffff',
    yellow: '#ffff00',
    lightyellow: '#ffffe0',
    lightgray: '#d3d3d3',
    lightgrey: '#d3d3d3',
    lightblue: '#add8e6',
    lightgreen: '#90ee90',
    lightcyan: '#e0ffff',
    lightpink: '#ffb6c1',
    lime: '#00ff00',
    cyan: '#00ffff',
    aqua: '#00ffff',
    magenta: '#ff00ff',
    fuchsia: '#ff00ff',
    silver: '#c0c0c0',
    beige: '#f5f5dc',
    ivory: '#fffff0',
    gold: '#ffd700',
    orange: '#ffa500'
  };

  let colorToParse = cleanColor;
  if (namedColors[cleanColor]) {
    colorToParse = namedColors[cleanColor];
  }

  let r, g, b;

  if (colorToParse.startsWith('#')) {
    const hex = colorToParse.substring(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (colorToParse.startsWith('rgb')) {
    const isPercent = colorToParse.includes('%');
    const match = colorToParse.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      r = parseFloat(match[0]);
      g = parseFloat(match[1]);
      b = parseFloat(match[2]);
      if (isPercent) {
        r = Math.round((r / 100) * 255);
        g = Math.round((g / 100) * 255);
        b = Math.round((b / 100) * 255);
      }
    }
  } else if (colorToParse.startsWith('hsl')) {
    const match = colorToParse.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      const h = parseFloat(match[0]);
      const s = parseFloat(match[1]) / 100;
      const l = parseFloat(match[2]) / 100;

      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      let r1 = 0, g1 = 0, b1 = 0;
      if (0 <= h && h < 60) {
        r1 = c; g1 = x; b1 = 0;
      } else if (60 <= h && h < 120) {
        r1 = x; g1 = c; b1 = 0;
      } else if (120 <= h && h < 180) {
        r1 = 0; g1 = c; b1 = x;
      } else if (180 <= h && h < 240) {
        r1 = 0; g1 = x; b1 = c;
      } else if (240 <= h && h < 300) {
        r1 = x; g1 = 0; b1 = c;
      } else if (300 <= h && h < 360) {
        r1 = c; g1 = 0; b1 = x;
      }
      r = Math.round((r1 + m) * 255);
      g = Math.round((g1 + m) * 255);
      b = Math.round((b1 + m) * 255);
    }
  }

  if (r === undefined || g === undefined || b === undefined || isNaN(r) || isNaN(g) || isNaN(b)) {
    return {
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)'
    };
  }

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = yiq >= 128;

  return {
    textPrimary: isLight ? '#0f172a' : '#ffffff',
    textSecondary: isLight ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)'
  };
};

export default function SlideRenderer({ slide, brandKit, showWatermark = false, className = '' }) {
  let bulletList = [];
  if (Array.isArray(slide?.bullets)) {
    bulletList = slide.bullets;
  } else if (typeof slide?.bullets === 'string') {
    try {
      const parsed = JSON.parse(slide.bullets);
      if (Array.isArray(parsed)) {
        bulletList = parsed;
      } else if (typeof parsed === 'string') {
        bulletList = [parsed];
      }
    } catch {
      bulletList = slide.bullets ? [slide.bullets] : [];
    }
  }

  const contrast = getContrastColors(brandKit?.primary_color);

  const slideStyles = {
    '--slide-bg': brandKit?.primary_color || 'var(--bg-secondary)',
    '--slide-primary': brandKit?.secondary_color || 'var(--brand-500)',
    '--slide-accent': brandKit?.accent_color || 'var(--accent-500)',
    '--slide-font': brandKit?.font_family || 'var(--font-sans)',
    '--slide-text-primary': contrast.textPrimary,
    '--slide-text-secondary': contrast.textSecondary,
  };

  const layout = slide?.layout || 'bullets';

  const renderContent = () => {
    switch (layout) {
      case 'title':
        return (
          <div className="slide-layout-title">
            <div className="slide-eyebrow">Key Highlight</div>
            <h1>{slide?.heading || 'Slide Title'}</h1>
            <div className="slide-title-line" />
            {bulletList.length > 0 && (
              <p className="slide-subtitle">
                {bulletList.join(' ')}
              </p>
            )}
          </div>
        );
      case 'quote': {
        const citation = bulletList[0] || '';
        return (
          <div className="slide-layout-quote">
            <span className="quote-mark">&ldquo;</span>
            <blockquote>{slide?.heading || 'Quote goes here...'}</blockquote>
            {citation && <div className="quote-cite">{citation}</div>}
          </div>
        );
      }
      case 'image_right':
        return (
          <div className="slide-layout-split">
            <div className="slide-split-left">
              <h2>{slide?.heading || 'Visual Section'}</h2>
              <ul>
                {bulletList.map((bullet, idx) => (
                  <li key={idx}>
                    <BulletIcon />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="slide-split-right">
              {slide?.image_url ? (
                <img
                  src={slide.image_url}
                  alt={slide?.heading || 'Slide Visual'}
                />
              ) : (
                <div className="slide-mockup">
                  <div className="mockup-card">
                    <div className="mockup-bar-dots">
                      <span className="mockup-bar-dot" />
                      <span className="mockup-bar-dot" />
                      <span className="mockup-bar-dot" />
                    </div>
                    <div className="mockup-body-center">
                      <svg
                        width="5cqw"
                        height="5cqw"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        style={{ color: 'var(--slide-primary, var(--brand-500))', opacity: 0.7 }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                      {slide?.image_prompt ? (
                        <p className="mockup-prompt-text">{slide.image_prompt}</p>
                      ) : (
                        <p className="mockup-prompt-text">AI Generated Visual Mockup</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'section':
        return (
          <div className="slide-layout-section">
            <div className="slide-section-content">
              <div className="slide-section-eyebrow">Section Break</div>
              <h2>{slide?.heading || 'Next Chapter'}</h2>
              <div className="slide-section-line" />
            </div>
          </div>
        );
      case 'bullets':
      default:
        return (
          <div className="slide-layout-bullets">
            <h2>{slide?.heading || 'Key Summary'}</h2>
            <ul>
              {bulletList.map((bullet, idx) => (
                <li key={idx}>
                  <BulletIcon />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        );
    }
  };

  return (
    <div className={`slide-outer ${className}`}>
      <div
        className="slide-frame"
        style={slideStyles}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          {renderContent()}
        </div>

        {showWatermark && (
          <div className="slide-watermark">
            <span className="slide-watermark-dot" />
            <span>SlideCrux</span>
          </div>
        )}
      </div>
    </div>
  );
}
