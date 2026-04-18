/**
 * pdf-to-images.js — Convert PDF pages to images
 */

import * as pdfjsLib from 'pdfjs-dist';
import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createProgressBar } from '../components/progress-bar.js';
import { readFileAsArrayBuffer, downloadBlob, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
}

export function render(container) {
  updateSEO('/pdf-to-images');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('PDF to Images'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-convert-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <h1>PDF to Images</h1>
      <p>Convert each PDF page to a high-quality image</p>
    </div>
    <div class="tool-body">
      <div id="p2i-upload"></div>
      <div id="p2i-configure" class="hidden"></div>
      <div id="p2i-processing" class="hidden"></div>
      <div id="p2i-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#p2i-upload');
  const configDiv = toolPage.querySelector('#p2i-configure');
  const processingDiv = toolPage.querySelector('#p2i-processing');
  const doneDiv = toolPage.querySelector('#p2i-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  configDiv.innerHTML = `
    <div class="tool-options">
      <div class="tool-options-title">Export Settings</div>
      <div class="option-group">
        <label class="option-label">Format</label>
        <div class="option-row">
          <button class="option-btn active" data-fmt="jpeg">JPG</button>
          <button class="option-btn" data-fmt="png">PNG</button>
        </div>
      </div>
      <div class="option-group">
        <label class="option-label">Quality (DPI)</label>
        <div class="option-row">
          <button class="option-btn" data-scale="1">72 DPI</button>
          <button class="option-btn active" data-scale="2">144 DPI</button>
          <button class="option-btn" data-scale="3">216 DPI</button>
        </div>
      </div>
    </div>
  `;

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Convert to Images';
  configDiv.appendChild(actionBtn);

  const progress = createProgressBar();
  processingDiv.appendChild(progress.element);

  let pdfBuffer = null;
  let format = 'jpeg';
  let scale = 2;

  configDiv.querySelectorAll('[data-fmt]').forEach(btn => {
    btn.addEventListener('click', () => {
      configDiv.querySelectorAll('[data-fmt]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      format = btn.dataset.fmt;
    });
  });

  configDiv.querySelectorAll('[data-scale]').forEach(btn => {
    btn.addEventListener('click', () => {
      configDiv.querySelectorAll('[data-scale]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      scale = parseInt(btn.dataset.scale);
    });
  });

  dropzone.onFiles(async (files) => {
    if (!files[0]) return;
    pdfBuffer = await readFileAsArrayBuffer(files[0]);
    // pdfBuffer is used directly with new Uint8Array() later, no need to clone here
    // since pdfjsLib.getDocument creates its own copy from Uint8Array
    uploadDiv.classList.add('hidden');
    configDiv.classList.remove('hidden');
  });

  actionBtn.addEventListener('click', async () => {
    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Converting pages...');

    try {
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
      const numPages = doc.numPages;
      const blobs = [];

      for (let i = 1; i <= numPages; i++) {
        const pg = await doc.getPage(i);
        const vp = pg.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, vp.width, vp.height);
        await pg.render({ canvasContext: ctx, viewport: vp }).promise;

        const blob = await new Promise(r => canvas.toBlob(r, `image/${format}`, 0.92));
        blobs.push({ blob, page: i });
        progress.setProgress(i / numPages, `Converting page ${i} of ${numPages}...`);
      }

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">Conversion Complete</div>
        <div class="tool-result-info">${numPages} pages converted to ${format.toUpperCase()}</div>
      `;

      // Individual download buttons
      const imgGrid = document.createElement('div');
      imgGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;margin:20px 0;';

      blobs.forEach(({ blob, page }) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'text-align:center;';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        img.style.cssText = 'width:100%;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;';
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.style.width = '100%';
        btn.textContent = `Page ${page}`;
        btn.addEventListener('click', () => {
          downloadBlob(blob, `page-${page}.${format === 'jpeg' ? 'jpg' : 'png'}`);
        });
        wrap.appendChild(img);
        wrap.appendChild(btn);
        imgGrid.appendChild(wrap);
      });

      // Download All button
      const dlAllBtn = document.createElement('button');
      dlAllBtn.className = 'download-btn-large';
      dlAllBtn.style.marginBottom = '16px';
      dlAllBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download All (${numPages} images)`;
      dlAllBtn.addEventListener('click', () => {
        blobs.forEach(({ blob, page }) => {
          setTimeout(() => downloadBlob(blob, `page-${page}.${format === 'jpeg' ? 'jpg' : 'png'}`), page * 200);
        });
        incrementGlobalCounter();
      });

      panel.appendChild(dlAllBtn);
      panel.appendChild(imgGrid);

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Convert another PDF';
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
