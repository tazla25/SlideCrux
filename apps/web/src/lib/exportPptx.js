import pptxgen from 'pptxgenjs';

/**
 * Utility to clean color string to PPTX compatible hex (no '#').
 */
function cleanColor(colorStr, defaultColor) {
  if (!colorStr) return defaultColor;
  const clean = colorStr.trim();
  if (clean.startsWith('#')) {
    return clean.substring(1);
  }
  return clean;
}

/**
 * Helper to determine white or dark contrast color for text based on background.
 */
function getContrastColor(bgColorHex) {
  let r = 17, g = 24, b = 39; // default '111827'
  if (bgColorHex && bgColorHex.length === 6) {
    r = parseInt(bgColorHex.substring(0, 2), 16);
    g = parseInt(bgColorHex.substring(2, 4), 16);
    b = parseInt(bgColorHex.substring(4, 6), 16);
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '0F172A' : 'FFFFFF';
}

/**
 * Exports a deck to PPTX format using native shapes, text, and structure.
 * 
 * @param {string} deckTitle - The title of the deck
 * @param {Array} slides - Array of slide data objects
 * @param {Object} brandKit - The brand kit object containing design choices
 * @param {boolean} watermark - Whether to show the SlideCrux watermark
 */
export async function exportDeckToPptx(deckTitle, slides, brandKit, watermark) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export');
  }

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  const primaryHex = cleanColor(brandKit?.primary_color, '111827');
  const secondaryHex = cleanColor(brandKit?.secondary_color, '3B82F6');
  const accentHex = cleanColor(brandKit?.accent_color, 'F59E0B');
  const fontFace = brandKit?.font_family || 'Arial';
  const textColorHex = getContrastColor(primaryHex);
  const subtitleColorHex = textColorHex === 'FFFFFF' ? '9CA3AF' : '4B5563';

  for (const slide of slides) {
    const slideObj = pptx.addSlide();

    // Set background color
    slideObj.background = { fill: primaryHex };

    // Watermark
    if (watermark) {
      slideObj.addText('SlideCrux', {
        x: 8.5,
        y: 5.0,
        w: 1.2,
        h: 0.4,
        fontSize: 12,
        color: '9CA3AF',
        align: 'right'
      });
    }

    // Parse bullets safely
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
        // Centered large heading
        slideObj.addText(slide?.heading || 'Slide Title', {
          x: 1.0,
          y: 1.5,
          w: 8.0,
          h: 1.5,
          fontSize: 40,
          bold: true,
          color: secondaryHex,
          fontFace: fontFace,
          align: 'center',
          valign: 'middle'
        });

        // Joined subtitle bullets
        if (bulletList.length > 0) {
          slideObj.addText(bulletList.join(' '), {
            x: 1.0,
            y: 3.2,
            w: 8.0,
            h: 1.5,
            fontSize: 18,
            color: subtitleColorHex,
            fontFace: fontFace,
            align: 'center',
            valign: 'top'
          });
        }
        break;

      case 'bullets':
        // Left-aligned heading
        slideObj.addText(slide?.heading || 'Key Summary', {
          x: 1.0,
          y: 0.8,
          w: 8.0,
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: secondaryHex,
          fontFace: fontFace,
          align: 'left',
          valign: 'middle'
        });

        // Bullet list
        if (bulletList.length > 0) {
          const bulletObjects = bulletList.map(bullet => ({
            text: bullet,
            options: { bullet: true, color: textColorHex, fontFace: fontFace, fontSize: 18 }
          }));
          slideObj.addText(bulletObjects, {
            x: 1.0,
            y: 1.8,
            w: 8.0,
            h: 3.0,
            align: 'left',
            valign: 'top'
          });
        }
        break;

      case 'quote': {
        // Large italicized quote
        slideObj.addText(slide?.heading || 'Quote goes here...', {
          x: 1.0,
          y: 1.5,
          w: 8.0,
          h: 2.0,
          fontSize: 28,
          italic: true,
          bold: true,
          color: textColorHex,
          fontFace: fontFace,
          align: 'center',
          valign: 'middle'
        });

        // Citation text
        const citation = bulletList[0] || '';
        if (citation) {
          slideObj.addText(`— ${citation}`, {
            x: 1.0,
            y: 3.8,
            w: 8.0,
            h: 0.8,
            fontSize: 18,
            color: subtitleColorHex,
            fontFace: fontFace,
            align: 'center',
            valign: 'top'
          });
        }
        break;
      }

      case 'image_right': {
        // Split layout: Left 40% width contains heading and bullet text list
        slideObj.addText(slide?.heading || 'Visual Section', {
          x: 0.8,
          y: 0.8,
          w: 4.0,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: secondaryHex,
          fontFace: fontFace,
          align: 'left',
          valign: 'middle'
        });

        if (bulletList.length > 0) {
          const bulletObjects = bulletList.map(bullet => ({
            text: bullet,
            options: { bullet: true, color: textColorHex, fontFace: fontFace, fontSize: 16 }
          }));
          slideObj.addText(bulletObjects, {
            x: 0.8,
            y: 1.8,
            w: 4.0,
            h: 3.0,
            align: 'left',
            valign: 'top'
          });
        }

        // Right 40% contains image or a placeholder rectangle
        if (slide?.image_url) {
          slideObj.addImage({
            path: slide.image_url,
            x: 5.2,
            y: 0.8,
            w: 4.0,
            h: 4.0
          });
        } else {
          // Add a beautiful rounded/card placeholder shape for missing visual
          slideObj.addShape(pptx.shapes.RECTANGLE, {
            fill: { color: textColorHex === 'FFFFFF' ? '1F2937' : 'E5E7EB' },
            line: { color: subtitleColorHex, width: 1 },
            x: 5.2,
            y: 0.8,
            w: 4.0,
            h: 4.0
          });

          const promptText = slide?.image_prompt || 'AI Generated Visual Mockup';
          slideObj.addText(promptText, {
            x: 5.3,
            y: 0.9,
            w: 3.8,
            h: 3.8,
            fontSize: 14,
            color: subtitleColorHex,
            fontFace: fontFace,
            align: 'center',
            valign: 'middle'
          });
        }
        break;
      }

      case 'section':
        // Center eyebrow
        slideObj.addText('Section Break', {
          x: 1.0,
          y: 1.5,
          w: 8.0,
          h: 0.4,
          fontSize: 14,
          color: accentHex,
          fontFace: fontFace,
          align: 'center',
          valign: 'bottom'
        });

        // Center heading using accent color
        slideObj.addText(slide?.heading || 'Next Chapter', {
          x: 1.0,
          y: 2.0,
          w: 8.0,
          h: 1.5,
          fontSize: 36,
          bold: true,
          color: accentHex,
          fontFace: fontFace,
          align: 'center',
          valign: 'middle'
        });
        break;

      default:
        // Fallback to bullets layout
        slideObj.addText(slide?.heading || 'Slide Title', {
          x: 1.0,
          y: 0.8,
          w: 8.0,
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: secondaryHex,
          fontFace: fontFace,
          align: 'left',
          valign: 'middle'
        });

        if (bulletList.length > 0) {
          const bulletObjects = bulletList.map(bullet => ({
            text: bullet,
            options: { bullet: true, color: textColorHex, fontFace: fontFace, fontSize: 18 }
          }));
          slideObj.addText(bulletObjects, {
            x: 1.0,
            y: 1.8,
            w: 8.0,
            h: 3.0,
            align: 'left',
            valign: 'top'
          });
        }
        break;
    }
  }

  // Save presentation
  const safeTitle = deckTitle ? deckTitle.replace(/\s+/g, '_') : 'presentation';
  await pptx.writeFile({ fileName: `${safeTitle}.pptx` });
}
