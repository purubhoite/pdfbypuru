/**
 * main.js — App entry point for Puru PDF suite
 * Initializes router, registers all tool pages, handles global setup.
 */

import './styles/global.css';
import './styles/landing.css';
import './styles/tool-page.css';
import './styles/components.css';

import { registerRoute, initRouter } from './router.js';
import { initAnalytics } from './utils/analytics.js';

// Import pages
import { render as renderLanding } from './pages/landing.js';
import { render as renderMerge } from './pages/merge.js';
import { render as renderSplit } from './pages/split.js';
import { render as renderCompress } from './pages/compress.js';
import { render as renderRotate } from './pages/rotate.js';
import { render as renderReorder } from './pages/reorder.js';
import { render as renderDeletePages } from './pages/delete-pages.js';
import { render as renderImagesToPdf } from './pages/images-to-pdf.js';
import { render as renderPdfToImages } from './pages/pdf-to-images.js';
import { render as renderWatermark } from './pages/watermark.js';
import { render as renderEditText } from './pages/edit-text.js';

// Initialize analytics
initAnalytics();

// Register routes
registerRoute('/', renderLanding);
registerRoute('/merge', renderMerge);
registerRoute('/split', renderSplit);
registerRoute('/compress', renderCompress);
registerRoute('/rotate', renderRotate);
registerRoute('/reorder', renderReorder);
registerRoute('/delete-pages', renderDeletePages);
registerRoute('/images-to-pdf', renderImagesToPdf);
registerRoute('/pdf-to-images', renderPdfToImages);
registerRoute('/watermark', renderWatermark);
registerRoute('/edit-text', renderEditText);

// Initialize router
const app = document.getElementById('app');
initRouter(app);

// Global drag prevention (prevent browser opening dropped files)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
  document.body.addEventListener(evt, (e) => {
    // Only prevent if not inside a dropzone
    if (!e.target.closest('.dropzone')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, false);
});
