/**
 * edit-text.js — Inline PDF text editor (wraps existing modules)
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { loadDocument, renderPage, getTextContent, getOriginalBytes, getPageCount } from '../pdfRenderer.js';
import { buildTextLayer, onEdit, getPendingEdits, getEditCount, clearEdits } from '../textOverlay.js';
import { exportPdf, downloadPdf } from '../pdfExporter.js';
import { updateSEO } from '../utils/seo.js';
import { showToast } from '../utils/file-utils.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/edit-text');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Edit PDF Text'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-edit-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #8b5cf6, #a78bfa)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </div>
      <h1>Edit PDF Text</h1>
      <p>Click on any text in your PDF to edit it inline</p>
    </div>
    <div class="tool-body" style="max-width:100%">
      <div id="edit-upload"></div>
      <div id="edit-editor" class="hidden">
        <div class="editor-container">
          <div class="editor-toolbar">
            <button class="tool-btn" id="ed-upload" title="Upload another PDF">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Upload</span>
            </button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn" id="ed-prev" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="page-info" id="ed-page-info">—</span>
            <button class="tool-btn" id="ed-next" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn" id="ed-zoom-out" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <span class="zoom-level" id="ed-zoom-level">100%</span>
            <button class="tool-btn" id="ed-zoom-in" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <div class="toolbar-divider"></div>
            <span class="edit-count-badge hidden" id="ed-edit-count">0 edits</span>
            <button class="tool-btn download-tool-btn" id="ed-download" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download</span>
            </button>
          </div>
          <div class="pdf-canvas-container" id="ed-canvas-container" style="overflow:auto;flex:1;display:flex;justify-content:center;padding:16px;">
            <div class="page-wrapper" id="ed-page-wrapper">
              <canvas id="ed-canvas"></canvas>
              <div class="text-layer" id="ed-text-layer"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const uploadDiv = toolPage.querySelector('#edit-upload');
  const editorDiv = toolPage.querySelector('#edit-editor');

  // Setup dropzone
  const dropzone = createDropzone({
    accept: '.pdf',
    title: 'Drop your PDF here',
    subtitle: 'or <strong>click to browse</strong>',
    hint: 'Click on any text to edit it — Matches original fonts',
  });
  uploadDiv.appendChild(dropzone.element);

  // Editor state
  let currentPage = 1;
  let totalPages = 0;
  let currentScale = window.innerWidth <= 768 ? 1.0 : 1.5;
  let fileName = '';
  let isLoaded = false;

  const SCALE_STEP = 0.25, SCALE_MIN = 0.5, SCALE_MAX = 3.0;

  // DOM refs
  const canvas = toolPage.querySelector('#ed-canvas');
  const textLayer = toolPage.querySelector('#ed-text-layer');
  const btnPrev = toolPage.querySelector('#ed-prev');
  const btnNext = toolPage.querySelector('#ed-next');
  const btnZoomIn = toolPage.querySelector('#ed-zoom-in');
  const btnZoomOut = toolPage.querySelector('#ed-zoom-out');
  const btnDownload = toolPage.querySelector('#ed-download');
  const btnUpload = toolPage.querySelector('#ed-upload');
  const pageInfo = toolPage.querySelector('#ed-page-info');
  const zoomLevel = toolPage.querySelector('#ed-zoom-level');
  const editCountEl = toolPage.querySelector('#ed-edit-count');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = '.pdf'; fileInput.hidden = true;
  toolPage.appendChild(fileInput);

  function updateToolbar() {
    btnPrev.disabled = !isLoaded || currentPage <= 1;
    btnNext.disabled = !isLoaded || currentPage >= totalPages;
    btnZoomIn.disabled = !isLoaded || currentScale >= SCALE_MAX;
    btnZoomOut.disabled = !isLoaded || currentScale <= SCALE_MIN;
    btnDownload.disabled = !isLoaded;
    pageInfo.textContent = isLoaded ? `${currentPage} / ${totalPages}` : '—';
    zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
  }

  async function renderCurrentPage() {
    if (!isLoaded) return;
    const { width, height } = await renderPage(currentPage, currentScale, canvas);
    textLayer.style.width = `${width}px`;
    textLayer.style.height = `${height}px`;
    const textItems = await getTextContent(currentPage, currentScale);
    textItems.forEach(item => { item._pageIndex = currentPage - 1; });
    buildTextLayer(textLayer, textItems, currentScale);
    updateToolbar();
  }

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') { showToast('Please upload a valid PDF', 'error'); return; }
    fileName = file.name;
    clearEdits();
    editCountEl.classList.add('hidden');
    const arrayBuffer = await file.arrayBuffer();
    const info = await loadDocument(arrayBuffer);
    totalPages = info.numPages;
    currentPage = 1;
    isLoaded = true;
    uploadDiv.classList.add('hidden');
    editorDiv.classList.remove('hidden');
    await renderCurrentPage();
  }

  dropzone.onFiles((files) => { if (files[0]) handleFile(files[0]); });

  btnUpload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); fileInput.value = ''; });

  btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderCurrentPage(); } });
  btnNext.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderCurrentPage(); } });
  btnZoomIn.addEventListener('click', () => { if (currentScale < SCALE_MAX) { currentScale = Math.min(currentScale + SCALE_STEP, SCALE_MAX); renderCurrentPage(); } });
  btnZoomOut.addEventListener('click', () => { if (currentScale > SCALE_MIN) { currentScale = Math.max(currentScale - SCALE_STEP, SCALE_MIN); renderCurrentPage(); } });

  onEdit((count) => {
    if (count > 0) { editCountEl.classList.remove('hidden'); editCountEl.textContent = `${count} edit${count > 1 ? 's' : ''}`; }
    else { editCountEl.classList.add('hidden'); }
  });

  btnDownload.addEventListener('click', async () => {
    if (!isLoaded) return;
    const edits = getPendingEdits();
    if (edits.size === 0) { showToast('No edits to save — click on text first', 'error'); return; }
    try {
      const originalBytes = getOriginalBytes();
      const pdfBytes = await exportPdf(originalBytes, edits, currentScale);
      const outputName = fileName.replace(/\.pdf$/i, '') + '_edited.pdf';
      downloadPdf(pdfBytes, outputName);
      incrementGlobalCounter();
      showToast(`Downloaded ${outputName}`, 'success');
    } catch (err) {
      showToast('Export error: ' + err.message, 'error');
    }
  });

  page.appendChild(toolPage);
  page.appendChild(createFooter());
  container.appendChild(page);
}
