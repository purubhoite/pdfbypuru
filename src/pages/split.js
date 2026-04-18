/**
 * split.js — Split PDF tool page
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createThumbnailGrid } from '../components/thumbnail-grid.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { extractPages } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/split');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Split PDF'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-organize-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #3b82f6, #60a5fa)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/></svg>
      </div>
      <h1>Split PDF</h1>
      <p>Select and extract specific pages from your PDF</p>
    </div>
    <div class="tool-body">
      <div id="split-upload"></div>
      <div id="split-configure" class="hidden"></div>
      <div id="split-processing" class="hidden"></div>
      <div id="split-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#split-upload');
  const configDiv = toolPage.querySelector('#split-configure');
  const processingDiv = toolPage.querySelector('#split-processing');
  const doneDiv = toolPage.querySelector('#split-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  const thumbGrid = createThumbnailGrid({ selectable: true });
  const selectBtns = document.createElement('div');
  selectBtns.className = 'option-row';
  selectBtns.style.marginBottom = '16px';
  selectBtns.innerHTML = `
    <button class="option-btn" id="split-select-all">Select All</button>
    <button class="option-btn" id="split-select-none">Select None</button>
    <span style="flex:1"></span>
    <span id="split-count" style="font-size:13px;color:var(--text-muted)">0 pages selected</span>
  `;

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Extract Selected Pages';
  actionBtn.disabled = true;

  configDiv.appendChild(selectBtns);
  configDiv.appendChild(thumbGrid.element);
  configDiv.appendChild(actionBtn);

  const progress = createProgressBar();
  processingDiv.appendChild(progress.element);

  let pdfBuffer = null;

  dropzone.onFiles(async (files) => {
    const file = files[0];
    if (!file) return;
    try {
      const rawBuffer = await readFileAsArrayBuffer(file);
      // Store our own copy — thumbnail grid and pdf-engine each clone internally too
      pdfBuffer = rawBuffer.slice(0);
      await thumbGrid.loadPdf(rawBuffer);
      uploadDiv.classList.add('hidden');
      configDiv.classList.remove('hidden');
      updateCount();
    } catch (err) {
      showToast('Error loading PDF: ' + err.message, 'error');
    }
  });

  function updateCount() {
    const sel = thumbGrid.getSelectedIndices();
    const countEl = configDiv.querySelector('#split-count');
    countEl.textContent = `${sel.length} page${sel.length !== 1 ? 's' : ''} selected`;
    actionBtn.disabled = sel.length === 0;
  }

  thumbGrid.onSelectionChange(updateCount);
  configDiv.querySelector('#split-select-all').addEventListener('click', () => { thumbGrid.selectAll(); updateCount(); });
  configDiv.querySelector('#split-select-none').addEventListener('click', () => { thumbGrid.selectNone(); updateCount(); });

  actionBtn.addEventListener('click', async () => {
    const selected = thumbGrid.getSelectedIndices();
    if (selected.length === 0) return;

    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Extracting pages...');

    try {
      const result = await extractPages(pdfBuffer, selected, (p) => {
        progress.setProgress(p, 'Extracting pages...');
      });

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">Pages Extracted</div>
        <div class="tool-result-info">${selected.length} pages • ${formatFileSize(result.byteLength)}</div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'split.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Split another PDF';
      restartBtn.addEventListener('click', () => {
        doneDiv.classList.add('hidden');
        uploadDiv.classList.remove('hidden');
        pdfBuffer = null;
      });
      panel.appendChild(restartBtn);
      doneDiv.appendChild(panel);
    } catch (err) {
      processingDiv.classList.add('hidden');
      configDiv.classList.remove('hidden');
      showToast('Error splitting PDF: ' + err.message, 'error');
    }
  });

  page.appendChild(toolPage);
  page.appendChild(createFooter());
  container.appendChild(page);
}
