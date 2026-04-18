/**
 * reorder.js — Reorder PDF pages tool
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createThumbnailGrid } from '../components/thumbnail-grid.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { reorderPages } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/reorder');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Reorder Pages'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-organize-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #3b82f6, #60a5fa)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="6"/><line x1="10" y1="3" x2="12" y2="6"/></svg>
      </div>
      <h1>Reorder Pages</h1>
      <p>Drag and drop page thumbnails to rearrange them</p>
    </div>
    <div class="tool-body">
      <div id="reorder-upload"></div>
      <div id="reorder-configure" class="hidden"></div>
      <div id="reorder-processing" class="hidden"></div>
      <div id="reorder-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#reorder-upload');
  const configDiv = toolPage.querySelector('#reorder-configure');
  const processingDiv = toolPage.querySelector('#reorder-processing');
  const doneDiv = toolPage.querySelector('#reorder-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  const thumbGrid = createThumbnailGrid({ draggable: true });
  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Apply New Order & Download';

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
    const newOrder = thumbGrid.getOrder();
    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Reordering pages...');

    try {
      const result = await reorderPages(pdfBuffer, newOrder, (p) => progress.setProgress(p));

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">Pages Reordered</div>
        <div class="tool-result-info">${newOrder.length} pages • ${formatFileSize(result.byteLength)}</div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'reordered.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Reorder another PDF';
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
