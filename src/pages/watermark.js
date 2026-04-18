/**
 * watermark.js — Add text watermark to PDF
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { addWatermark } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/watermark');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Add Watermark'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-protect-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #ef4444, #f87171)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
      </div>
      <h1>Add Watermark</h1>
      <p>Add a text watermark to every page of your PDF</p>
    </div>
    <div class="tool-body">
      <div id="wm-upload"></div>
      <div id="wm-configure" class="hidden"></div>
      <div id="wm-processing" class="hidden"></div>
      <div id="wm-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#wm-upload');
  const configDiv = toolPage.querySelector('#wm-configure');
  const processingDiv = toolPage.querySelector('#wm-processing');
  const doneDiv = toolPage.querySelector('#wm-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  configDiv.innerHTML = `
    <div class="tool-options">
      <div class="tool-options-title">Watermark Settings</div>
      <div class="option-group">
        <label class="option-label">Watermark Text</label>
        <input type="text" class="option-input" id="wm-text" value="CONFIDENTIAL" maxlength="50">
      </div>
      <div class="option-group">
        <label class="option-label">Font Size: <span id="wm-size-val">48</span>px</label>
        <input type="range" class="option-slider" id="wm-size" min="12" max="120" value="48">
      </div>
      <div class="option-group">
        <label class="option-label">Opacity: <span id="wm-opacity-val">15</span>%</label>
        <input type="range" class="option-slider" id="wm-opacity" min="5" max="80" value="15">
      </div>
      <div class="option-group">
        <label class="option-label">Rotation</label>
        <div class="option-row">
          <button class="option-btn" data-rot="0">0°</button>
          <button class="option-btn active" data-rot="-45">-45°</button>
          <button class="option-btn" data-rot="-30">-30°</button>
          <button class="option-btn" data-rot="45">45°</button>
        </div>
      </div>
    </div>
  `;

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Add Watermark';
  configDiv.appendChild(actionBtn);

  const progress = createProgressBar();
  processingDiv.appendChild(progress.element);

  let pdfBuffer = null;
  let rotation = -45;

  // Slider labels
  const sizeSlider = configDiv.querySelector('#wm-size');
  const sizeVal = configDiv.querySelector('#wm-size-val');
  sizeSlider.addEventListener('input', () => sizeVal.textContent = sizeSlider.value);

  const opacitySlider = configDiv.querySelector('#wm-opacity');
  const opacityVal = configDiv.querySelector('#wm-opacity-val');
  opacitySlider.addEventListener('input', () => opacityVal.textContent = opacitySlider.value);

  configDiv.querySelectorAll('[data-rot]').forEach(btn => {
    btn.addEventListener('click', () => {
      configDiv.querySelectorAll('[data-rot]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rotation = parseInt(btn.dataset.rot);
    });
  });

  dropzone.onFiles(async (files) => {
    if (!files[0]) return;
    // Clone buffer to ensure watermark engine gets a usable copy
    const rawBuffer = await readFileAsArrayBuffer(files[0]);
    pdfBuffer = rawBuffer.slice(0);
    uploadDiv.classList.add('hidden');
    configDiv.classList.remove('hidden');
  });

  actionBtn.addEventListener('click', async () => {
    const text = configDiv.querySelector('#wm-text').value.trim();
    if (!text) { showToast('Please enter watermark text', 'error'); return; }

    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Adding watermark...');

    try {
      const result = await addWatermark(pdfBuffer, {
        text,
        fontSize: parseInt(sizeSlider.value),
        opacity: parseInt(opacitySlider.value) / 100,
        rotation,
      }, (p) => progress.setProgress(p));

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">Watermark Added</div>
        <div class="tool-result-info">"${text}" • ${formatFileSize(result.byteLength)}</div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'watermarked.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Watermark another PDF';
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
