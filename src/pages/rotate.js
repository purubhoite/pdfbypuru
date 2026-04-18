/**
 * rotate.js — Rotate PDF pages tool
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createThumbnailGrid } from '../components/thumbnail-grid.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { rotatePages } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/rotate');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Rotate Pages'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-optimize-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #10b981, #34d399)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </div>
      <h1>Rotate Pages</h1>
      <p>Click the rotate button on each page to rotate it 90°</p>
    </div>
    <div class="tool-body">
      <div id="rotate-upload"></div>
      <div id="rotate-configure" class="hidden"></div>
      <div id="rotate-processing" class="hidden"></div>
      <div id="rotate-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#rotate-upload');
  const configDiv = toolPage.querySelector('#rotate-configure');
  const processingDiv = toolPage.querySelector('#rotate-processing');
  const doneDiv = toolPage.querySelector('#rotate-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  const thumbGrid = createThumbnailGrid({ rotatable: true });

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Apply Rotations & Download';

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
    const rotations = thumbGrid.getRotations();
    if (Object.keys(rotations).length === 0) {
      showToast('No rotations applied yet — click the rotate button on pages', 'error');
      return;
    }

    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Rotating pages...');

    try {
      const result = await rotatePages(pdfBuffer, rotations, (p) => progress.setProgress(p));

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">Pages Rotated</div>
        <div class="tool-result-info">${Object.keys(rotations).length} pages rotated • ${formatFileSize(result.byteLength)}</div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'rotated.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Rotate another PDF';
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
