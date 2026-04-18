/**
 * delete-pages.js — Delete pages from PDF tool
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createThumbnailGrid } from '../components/thumbnail-grid.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { deletePages } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/delete-pages');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Delete Pages'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-organize-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #3b82f6, #60a5fa)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
      </div>
      <h1>Delete Pages</h1>
      <p>Click the ✕ on pages you want to remove</p>
    </div>
    <div class="tool-body">
      <div id="del-upload"></div>
      <div id="del-configure" class="hidden"></div>
      <div id="del-processing" class="hidden"></div>
      <div id="del-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#del-upload');
  const configDiv = toolPage.querySelector('#del-configure');
  const processingDiv = toolPage.querySelector('#del-processing');
  const doneDiv = toolPage.querySelector('#del-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  const thumbGrid = createThumbnailGrid({ deletable: true });
  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Remove Marked Pages & Download';

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
      pdfBuffer = rawBuffer.slice(0);
      await thumbGrid.loadPdf(rawBuffer);
      uploadDiv.classList.add('hidden');
      configDiv.classList.remove('hidden');
    } catch (err) {
      showToast('Error loading PDF: ' + err.message, 'error');
    }
  });

  actionBtn.addEventListener('click', async () => {
    const toDelete = thumbGrid.getDeletedIndices();
    if (toDelete.length === 0) { showToast('No pages marked for deletion', 'error'); return; }
    if (toDelete.length >= thumbGrid.getPageCount()) { showToast('Cannot delete all pages', 'error'); return; }

    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Removing pages...');

    try {
      const result = await deletePages(pdfBuffer, toDelete, (p) => progress.setProgress(p));

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">Pages Removed</div>
        <div class="tool-result-info">${toDelete.length} pages deleted • ${formatFileSize(result.byteLength)}</div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'pages-removed.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Process another PDF';
      restartBtn.addEventListener('click', () => { doneDiv.classList.add('hidden'); uploadDiv.classList.remove('hidden'); pdfBuffer = null; });
      panel.appendChild(restartBtn);
      doneDiv.appendChild(panel);
    } catch (err) {
      processingDiv.classList.add('hidden');
      configDiv.classList.remove('hidden');
      showToast('Error: ' + err.message, 'error');
    }
  });

  page.appendChild(toolPage);
  page.appendChild(createFooter());
  container.appendChild(page);
}
