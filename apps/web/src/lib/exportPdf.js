import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import { createRoot } from 'react-dom/client';
import SlideRenderer from '../components/SlideRenderer';

/**
 * Exports a deck to a PDF file using client-side rendering.
 * 
 * @param {string} deckTitle - The title of the deck
 * @param {Array} slides - Array of slide data objects
 * @param {Object} brandKit - The brand kit object containing design choices
 * @param {boolean} watermark - Whether to show the SlideCrux watermark
 */
export async function exportDeckToPdf(deckTitle, slides, brandKit, watermark) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export');
  }

  // Create temporary container offscreen
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1280px';
  container.style.height = '720px';
  container.style.overflow = 'hidden';
  container.className = 'slide-export-container';
  document.body.appendChild(container);

  // Add temporary styles to make sure slide-wrapper is full bleed during export
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .slide-export-container .slide-wrapper {
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
  `;
  container.appendChild(styleEl);

  // Initialize jsPDF instance: landscape orientation, unit "px", size 1280x720
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1280, 720],
    compress: true
  });

  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      // Create a temporary container for this specific slide
      const slideContainer = document.createElement('div');
      slideContainer.style.width = '1280px';
      slideContainer.style.height = '720px';
      slideContainer.style.position = 'relative';
      container.appendChild(slideContainer);

      // Mount SlideRenderer inside it using React's createRoot
      const root = createRoot(slideContainer);
      
      // Use React.createElement to support JSX-free rendering inside standard .js file
      root.render(
        React.createElement(SlideRenderer, {
          slide: slide,
          brandKit: brandKit,
          showWatermark: watermark
        })
      );

      // Wait 500ms for images, styles, and fonts to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capture with html2canvas
      const canvas = await html2canvas(slideContainer, {
        scale: 2, // higher resolution
        useCORS: true,
        width: 1280,
        height: 720,
        logging: false
      });

      // Unmount the root and remove slideContainer
      root.unmount();
      container.removeChild(slideContainer);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage([1280, 720], 'landscape');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720, undefined, 'FAST');
    }
  } catch (error) {
    console.error('Error during PDF export:', error);
    throw error;
  } finally {
    // Remove the temporary offscreen container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }

  // Save the PDF
  const safeTitle = deckTitle ? deckTitle.replace(/\s+/g, '_') : 'presentation';
  pdf.save(`${safeTitle}.pdf`);
}
