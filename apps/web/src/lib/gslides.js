/**
 * Google Slides API integration helpers (client-side only).
 */

const INCH_TO_EMU = 914400;

/**
 * Converts inches to English Metric Units (EMU).
 */
function toEmu(inches) {
  return Math.round(inches * INCH_TO_EMU);
}

/**
 * Clean hex color string and return normalized float RGB values [0, 1] for Google API.
 */
function hexToRgbFloats(colorStr, defaultHex) {
  let clean = colorStr || defaultHex;
  clean = clean.trim();
  if (clean.startsWith('#')) {
    clean = clean.substring(1);
  }
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return {
    red: isNaN(r) ? 0 : r,
    green: isNaN(g) ? 0 : g,
    blue: isNaN(b) ? 0 : b
  };
}

/**
 * Helper to determine white or dark contrast color for text based on background.
 */
function getContrastColorFloats(bgColorHex) {
  let clean = bgColorHex || '111827';
  if (clean.startsWith('#')) {
    clean = clean.substring(1);
  }
  let r = 17, g = 24, b = 39;
  if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  // Return RGB floats for Google API
  return yiq >= 128 
    ? { red: 15/255, green: 23/255, blue: 42/255 } // #0f172a
    : { red: 1, green: 1, blue: 1 }; // #ffffff
}

/**
 * Initiates the Google OAuth 2.0 Implicit Flow.
 * Redirects the browser window to Google's OAuth consent screen.
 */
export function initiateGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '754823902342-placeholder.apps.googleusercontent.com';
  // Point back to current window location (without hashes/search params)
  const redirectUri = window.location.origin + window.location.pathname;
  const scopes = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `prompt=select_account`;

  window.location.href = authUrl;
}

/**
 * Parses and extracts access token from URL hash, saves it to localStorage,
 * cleans the hash, and returns the token.
 * Falls back to checking localStorage if hash is empty.
 * 
 * @returns {string|null} Google access token
 */
export function extractGoogleToken() {
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    
    if (accessToken) {
      localStorage.setItem('google_access_token', accessToken);
      
      // Clean hash from history to keep URL clean
      window.history.replaceState(
        null, 
        document.title, 
        window.location.pathname + window.location.search
      );
      
      return accessToken;
    }
  }
  
  return localStorage.getItem('google_access_token');
}

/**
 * Exports a SlideCrux presentation deck to Google Slides using REST APIs.
 * 
 * @param {string} deckTitle - The title of the deck
 * @param {Array} slides - Array of slide data objects
 * @param {Object} brandKit - The brand kit object containing design choices
 * @param {string} token - Google OAuth access token
 * @returns {Promise<string>} The created presentationId
 */
export async function exportDeckToGoogleSlides(deckTitle, slides, brandKit, token, watermark) {
  if (!token) {
    throw new Error('Google OAuth token is missing');
  }
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export');
  }

  // 1. Create a new presentation
  const createResponse = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: deckTitle || 'SlideCrux Presentation'
    })
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Failed to create presentation: ${errText}`);
  }

  const presentation = await createResponse.json();
  const presentationId = presentation.presentationId;
  const defaultSlideId = presentation.slides?.[0]?.objectId;

  // 2. Prepare layout colors and settings
  const primaryRgb = hexToRgbFloats(brandKit?.primary_color, '111827');
  const secondaryRgb = hexToRgbFloats(brandKit?.secondary_color, '3B82F6');
  const accentRgb = hexToRgbFloats(brandKit?.accent_color, 'F59E0B');
  const fontFace = brandKit?.font_family || 'Arial';
  
  const textRgb = getContrastColorFloats(brandKit?.primary_color);
  // Subtitle/citation is a slightly dimmed version of textRgb
  const subtitleRgb = textRgb.red === 1 
    ? { red: 156/255, green: 163/255, blue: 175/255 } // #9ca3af
    : { red: 75/255, green: 85/255, blue: 99/255 }; // #4b5563

  const requests = [];

  // Helper to construct TextBox requests
  const pushTextBoxRequest = (slideId, elemId, text, x, y, w, h, fontSize, colorRgb, options = {}) => {
    requests.push({
      createShape: {
        objectId: elemId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: toEmu(w), unit: 'EMU' },
            height: { magnitude: toEmu(h), unit: 'EMU' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: toEmu(x),
            translateY: toEmu(y),
            unit: 'EMU'
          }
        }
      }
    });

    requests.push({
      insertText: {
        objectId: elemId,
        text: text,
        insertionIndex: 0
      }
    });

    requests.push({
      updateTextStyle: {
        objectId: elemId,
        textRange: { type: 'ALL' },
        style: {
          fontFamily: fontFace,
          fontSize: { magnitude: fontSize, unit: 'PT' },
          foregroundColor: {
            opaqueColor: {
              rgbColor: colorRgb
            }
          },
          bold: !!options.bold,
          italic: !!options.italic
        },
        fields: 'fontFamily,fontSize,foregroundColor,bold,italic'
      }
    });

    if (options.align) {
      requests.push({
        updateParagraphStyle: {
          objectId: elemId,
          textRange: { type: 'ALL' },
          style: {
            alignment: options.align
          },
          fields: 'alignment'
        }
      });
    }

    if (options.bullets) {
      requests.push({
        createParagraphBullets: {
          objectId: elemId,
          textRange: { type: 'ALL' },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
        }
      });
    }
  };

  // Build the batch update request for all slides
  slides.forEach((slide, index) => {
    const slideId = `slide_crux_${index}`;

    // Create a new blank slide
    requests.push({
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: 'BLANK'
        }
      }
    });

    // Set background color
    requests.push({
      updatePageProperties: {
        objectId: slideId,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: {
              color: {
                rgbColor: primaryRgb
              }
            }
          }
        },
        fields: 'pageBackgroundFill'
      }
    });

    // Safely parse slide bullets
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

    const layout = slide?.layout || 'bullets';

    switch (layout) {
      case 'title':
        pushTextBoxRequest(
          slideId,
          `title_heading_${index}`,
          slide?.heading || 'Slide Title',
          1.0, 1.5, 8.0, 1.5,
          40,
          secondaryRgb,
          { bold: true, align: 'CENTER' }
        );

        if (bulletList.length > 0) {
          pushTextBoxRequest(
            slideId,
            `title_sub_${index}`,
            bulletList.join(' '),
            1.0, 3.2, 8.0, 1.5,
            18,
            subtitleRgb,
            { align: 'CENTER' }
          );
        }
        break;

      case 'bullets':
        pushTextBoxRequest(
          slideId,
          `bullets_heading_${index}`,
          slide?.heading || 'Key Summary',
          1.0, 0.8, 8.0, 0.8,
          32,
          secondaryRgb,
          { bold: true, align: 'START' }
        );

        if (bulletList.length > 0) {
          pushTextBoxRequest(
            slideId,
            `bullets_list_${index}`,
            bulletList.join('\n'),
            1.0, 1.8, 8.0, 3.0,
            18,
            textRgb,
            { align: 'START', bullets: true }
          );
        }
        break;

      case 'quote': {
        pushTextBoxRequest(
          slideId,
          `quote_text_${index}`,
          slide?.heading || 'Quote goes here...',
          1.0, 1.5, 8.0, 2.0,
          28,
          textRgb,
          { bold: true, italic: true, align: 'CENTER' }
        );

        const citation = bulletList[0] || '';
        if (citation) {
          pushTextBoxRequest(
            slideId,
            `quote_cit_${index}`,
            `— ${citation}`,
            1.0, 3.8, 8.0, 0.8,
            18,
            subtitleRgb,
            { align: 'CENTER' }
          );
        }
        break;
      }

      case 'image_right': {
        pushTextBoxRequest(
          slideId,
          `imgr_heading_${index}`,
          slide?.heading || 'Visual Section',
          0.8, 0.8, 4.0, 0.8,
          28,
          secondaryRgb,
          { bold: true, align: 'START' }
        );

        if (bulletList.length > 0) {
          pushTextBoxRequest(
            slideId,
            `imgr_list_${index}`,
            bulletList.join('\n'),
            0.8, 1.8, 4.0, 3.0,
            16,
            textRgb,
            { align: 'START', bullets: true }
          );
        }

        // Add slide image or placeholder
        if (slide?.image_url) {
          requests.push({
            createImage: {
              objectId: `imgr_img_${index}`,
              url: slide.image_url,
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: toEmu(4.0), unit: 'EMU' },
                  height: { magnitude: toEmu(4.0), unit: 'EMU' }
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: toEmu(5.2),
                  translateY: toEmu(0.8),
                  unit: 'EMU'
                }
              }
            }
          });
        } else {
          const placeholderBg = textRgb.red > 0.5 
            ? { red: 31/255, green: 41/255, blue: 55/255 } // #1f2937
            : { red: 229/255, green: 231/255, blue: 235/255 }; // #e5e7eb
            
          requests.push({
            createShape: {
              objectId: `imgr_placeholder_${index}`,
              shapeType: 'RECTANGLE',
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: toEmu(4.0), unit: 'EMU' },
                  height: { magnitude: toEmu(4.0), unit: 'EMU' }
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: toEmu(5.2),
                  translateY: toEmu(0.8),
                  unit: 'EMU'
                }
              }
            }
          });

          requests.push({
            updateShapeProperties: {
              objectId: `imgr_placeholder_${index}`,
              shapeProperties: {
                shapeBackgroundFill: {
                  solidFill: {
                    color: {
                      rgbColor: placeholderBg
                    }
                  }
                },
                outline: {
                  outlineFill: {
                    solidFill: {
                      color: {
                        rgbColor: subtitleRgb
                      }
                    }
                  },
                  weight: {
                    magnitude: 1,
                    unit: 'PT'
                  }
                }
              },
              fields: 'shapeBackgroundFill,outline'
            }
          });

          pushTextBoxRequest(
            slideId,
            `imgr_prompt_${index}`,
            slide?.image_prompt || 'AI Generated Visual Mockup',
            5.3, 0.9, 3.8, 3.8,
            14,
            subtitleRgb,
            { align: 'CENTER' }
          );
        }
        break;
      }

      case 'section':
        pushTextBoxRequest(
          slideId,
          `section_eyebrow_${index}`,
          'Section Break',
          1.0, 1.5, 8.0, 0.4,
          14,
          accentRgb,
          { align: 'CENTER' }
        );

        pushTextBoxRequest(
          slideId,
          `section_heading_${index}`,
          slide?.heading || 'Next Chapter',
          1.0, 2.0, 8.0, 1.5,
          36,
          accentRgb,
          { bold: true, align: 'CENTER' }
        );
        break;

      default:
        pushTextBoxRequest(
          slideId,
          `fallback_heading_${index}`,
          slide?.heading || 'Slide Title',
          1.0, 0.8, 8.0, 0.8,
          32,
          secondaryRgb,
          { bold: true, align: 'START' }
        );

        if (bulletList.length > 0) {
          pushTextBoxRequest(
            slideId,
            `fallback_list_${index}`,
            bulletList.join('\n'),
            1.0, 1.8, 8.0, 3.0,
            18,
            textRgb,
            { align: 'START', bullets: true }
          );
        }
        break;
    }

    // Add SlideCrux Watermark
    if (watermark) {
      pushTextBoxRequest(
        slideId,
        `watermark_${index}`,
        'SlideCrux',
        8.5, 5.0, 1.2, 0.4,
        12,
        subtitleRgb,
        { align: 'END' }
      );
    }
  });

  // 3. Remove the initial default slide created with the presentation
  if (defaultSlideId) {
    requests.push({
      deleteObject: {
        objectId: defaultSlideId
      }
    });
  }

  // 4. Send the batch update request
  const updateResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: requests
    })
  });

  if (!updateResponse.ok) {
    const errText = await updateResponse.text();
    throw new Error(`Failed to build presentation slides: ${errText}`);
  }

  return presentationId;
}
