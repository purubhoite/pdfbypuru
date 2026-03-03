/**
 * main.js
 * 
 * Application entry point. Wires up the UI, file upload, toolbar controls,
 * and coordinates the PDF rendering + text editing pipeline.
 */

import './styles.css';
import { loadDocument, renderPage, getTextContent, getOriginalBytes, getPageCount } from './pdfRenderer.js';
import { buildTextLayer, onEdit, getPendingEdits, getEditCount } from './textOverlay.js';
import { exportPdf, downloadPdf } from './pdfExporter.js';

// ─── State ──────────────────────────────────────────────────────
let currentPage = 1;
let totalPages = 0;
let currentScale = 1.5;
let fileName = '';
let isLoaded = false;

const SCALE_STEP = 0.25;
const SCALE_MIN = 0.5;
const SCALE_MAX = 3.0;

// ─── DOM Elements ───────────────────────────────────────────────
const fileInput = document.getElementById('file-input');
const btnUpload = document.getElementById('btn-upload');
const btnDownload = document.getElementById('btn-download');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const pageInfo = document.getElementById('page-info');
const zoomLevel = document.getElementById('zoom-level');
const dropZone = document.getElementById('drop-zone');
const pdfContainer = document.getElementById('pdf-container');
const canvas = document.getElementById('pdf-canvas');
const textLayer = document.getElementById('text-layer');
const statusText = document.getElementById('status-text');
const editCountEl = document.getElementById('edit-count');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// ─── Loading Helpers ────────────────────────────────────────────
function showLoading(msg = 'Loading...') {
  loadingText.textContent = msg;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

function setStatus(msg) {
  statusText.textContent = msg;
}

// ─── Toolbar State Updates ──────────────────────────────────────
function updateToolbarState() {
  btnPrev.disabled = !isLoaded || currentPage <= 1;
  btnNext.disabled = !isLoaded || currentPage >= totalPages;
  btnZoomIn.disabled = !isLoaded || currentScale >= SCALE_MAX;
  btnZoomOut.disabled = !isLoaded || currentScale <= SCALE_MIN;
  btnDownload.disabled = !isLoaded;

  if (isLoaded) {
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
  } else {
    pageInfo.textContent = '—';
    zoomLevel.textContent = '100%';
  }
}

// ─── Render Current Page ────────────────────────────────────────
async function renderCurrentPage() {
  if (!isLoaded) return;

  showLoading('Rendering page...');

  try {
    // Render the canvas
    const { width, height } = await renderPage(currentPage, currentScale, canvas);

    // Set text layer size to match
    textLayer.style.width = `${width}px`;
    textLayer.style.height = `${height}px`;

    // Extract text and build overlay
    const textItems = await getTextContent(currentPage, currentScale);

    // Tag items with page index for export
    textItems.forEach(item => {
      item._pageIndex = currentPage - 1;
    });

    buildTextLayer(textLayer, textItems, currentScale);

    setStatus(`Page ${currentPage} of ${totalPages} — Click on any text to edit`);
  } catch (err) {
    console.error('Render error:', err);
    setStatus('Error rendering page');
  }

  hideLoading();
  updateToolbarState();
}

// ─── File Loading ───────────────────────────────────────────────
async function handleFile(file) {
  if (!file || file.type !== 'application/pdf') {
    setStatus('Please upload a valid PDF file');
    return;
  }

  fileName = file.name;
  showLoading(`Loading ${fileName}...`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const info = await loadDocument(arrayBuffer);

    totalPages = info.numPages;
    currentPage = 1;
    isLoaded = true;

    // Show PDF container, hide drop zone
    dropZone.classList.add('hidden');
    pdfContainer.classList.remove('hidden');

    await renderCurrentPage();
    setStatus(`Loaded ${fileName} — ${totalPages} page${totalPages > 1 ? 's' : ''} — Click on any text to edit`);
  } catch (err) {
    console.error('Load error:', err);
    setStatus('Error loading PDF — please try a different file');
    hideLoading();
  }
}

// ─── Event Listeners ────────────────────────────────────────────

// Upload button
btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
  fileInput.value = ''; // reset to allow re-uploading same file
});

// Drop zone clicks
dropZone.addEventListener('click', () => fileInput.click());

// Drag & drop
const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  document.body.addEventListener(eventName, preventDefaults, false);
});

document.body.addEventListener('dragenter', () => {
  if (!isLoaded) dropZone.classList.add('drag-over');
});

document.body.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
    dropZone.classList.remove('drag-over');
  }
});

document.body.addEventListener('drop', (e) => {
  dropZone.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length > 0) handleFile(files[0]);
});

// Navigation
btnPrev.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderCurrentPage();
  }
});

btnNext.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderCurrentPage();
  }
});

// Zoom
btnZoomIn.addEventListener('click', () => {
  if (currentScale < SCALE_MAX) {
    currentScale = Math.min(currentScale + SCALE_STEP, SCALE_MAX);
    renderCurrentPage();
  }
});

btnZoomOut.addEventListener('click', () => {
  if (currentScale > SCALE_MIN) {
    currentScale = Math.max(currentScale - SCALE_STEP, SCALE_MIN);
    renderCurrentPage();
  }
});

// Download
btnDownload.addEventListener('click', async () => {
  if (!isLoaded) return;

  const edits = getPendingEdits();
  if (edits.size === 0) {
    setStatus('No edits to save — click on text to make changes first');
    return;
  }

  showLoading('Exporting modified PDF...');
  setStatus('Generating modified PDF...');

  try {
    const originalBytes = getOriginalBytes();
    const pdfBytes = await exportPdf(originalBytes, edits, currentScale);

    const outputName = fileName.replace(/\.pdf$/i, '') + '_edited.pdf';
    downloadPdf(pdfBytes, outputName);

    setStatus(`Downloaded ${outputName} with ${edits.size} edit${edits.size > 1 ? 's' : ''}`);
  } catch (err) {
    console.error('Export error:', err);
    setStatus('Error exporting PDF — ' + err.message);
  }

  hideLoading();
});

// Edit count updates
onEdit((count) => {
  if (count > 0) {
    editCountEl.classList.remove('hidden');
    editCountEl.textContent = `${count} edit${count > 1 ? 's' : ''}`;
  } else {
    editCountEl.classList.add('hidden');
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (!isLoaded) return;

  // Don't intercept when editing text
  if (e.target.classList.contains('text-edit-input')) return;

  if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    if (currentPage > 1) { currentPage--; renderCurrentPage(); }
  } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault();
    if (currentPage < totalPages) { currentPage++; renderCurrentPage(); }
  } else if (e.key === '+' || e.key === '=') {
    if (e.ctrlKey) { e.preventDefault(); btnZoomIn.click(); }
  } else if (e.key === '-') {
    if (e.ctrlKey) { e.preventDefault(); btnZoomOut.click(); }
  }
});

// ─── Initial State ──────────────────────────────────────────────
updateToolbarState();

// ─── Welcome Popup ──────────────────────────────────────────────
const welcomePopup = document.getElementById('welcome-popup');
const popupCloseBtn = document.getElementById('popup-close');

if (popupCloseBtn && welcomePopup) {
  popupCloseBtn.addEventListener('click', () => {
    welcomePopup.classList.add('hidden');
  });
  // Also close on overlay click (outside the card)
  welcomePopup.addEventListener('click', (e) => {
    if (e.target === welcomePopup) {
      welcomePopup.classList.add('hidden');
    }
  });
}
