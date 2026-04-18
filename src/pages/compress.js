/**
 * compress.js — Compress PDF tool page
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone } from '../components/file-dropzone.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { compressPdf } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/compress');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Compress PDF'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-optimize-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #10b981, #34d399)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
      </div>
      <h1>Compress PDF</h1>
      <p>Reduce your PDF file size while maintaining quality</p>
    </div>
    <div class="tool-body">
      <div id="compress-upload"></div>
      <div id="compress-configure" class="hidden"></div>
      <div id="compress-processing" class="hidden"></div>
      <div id="compress-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#compress-upload');
  const configDiv = toolPage.querySelector('#compress-configure');
  const processingDiv = toolPage.querySelector('#compress-processing');
  const doneDiv = toolPage.querySelector('#compress-done');

  const dropzone = createDropzone({ accept: '.pdf', title: 'Drop your PDF here' });
  uploadDiv.appendChild(dropzone.element);

  let pdfBuffer = null;
  let originalSize = 0;

  configDiv.innerHTML = `
    <div class="tool-options">
      <div class="tool-options-title">Compression Settings</div>
      <div class="option-group">
        <label class="option-label">Quality Level</label>
        <div class="option-row">
          <button class="option-btn" data-quality="0.3">
            Max Compression
          </button>
          <button class="option-btn active" data-quality="0.6">
            Balanced
          </button>
          <button class="option-btn" data-quality="0.9">
            Best Quality
          </button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text-muted)" id="compress-quality-desc">
          Good balance of file size and visual quality
        </div>
      </div>
      <div style="margin-top:12px;font-size:13px;color:var(--text-muted)">
        Original size: <strong id="compress-orig-size">—</strong>
      </div>
      <div style="margin-top:4px;font-size:11px;color:var(--text-muted);opacity:0.7">
        ⓘ Pages are re-rendered as optimized images for maximum compression
      </div>
    </div>
  `;

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Compress PDF';
  configDiv.appendChild(actionBtn);

  const progress = createProgressBar();
  processingDiv.appendChild(progress.element);

  let quality = 0.6;
  const qualityDescs = {
    '0.3': 'Smallest file size — text stays readable, images may lose detail',
    '0.6': 'Good balance of file size and visual quality',
    '0.9': 'Highest quality — minimal compression, larger file',
  };

  configDiv.querySelectorAll('[data-quality]').forEach(btn => {
    btn.addEventListener('click', () => {
      configDiv.querySelectorAll('[data-quality]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      quality = parseFloat(btn.dataset.quality);
      configDiv.querySelector('#compress-quality-desc').textContent = qualityDescs[btn.dataset.quality];
    });
  });

  dropzone.onFiles(async (files) => {
    const file = files[0];
    if (!file) return;
    pdfBuffer = await readFileAsArrayBuffer(file);
    originalSize = pdfBuffer.byteLength;
    configDiv.querySelector('#compress-orig-size').textContent = formatFileSize(originalSize);
    uploadDiv.classList.add('hidden');
    configDiv.classList.remove('hidden');
  });

  actionBtn.addEventListener('click', async () => {
    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Compressing PDF...');

    try {
      const result = await compressPdf(pdfBuffer, quality, (p) => progress.setProgress(p, 'Compressing...'));
      const newSize = result.byteLength;
      const reduction = Math.round((1 - newSize / originalSize) * 100);

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      
      const saved = originalSize - newSize;
      const reductionLabel = reduction > 0
        ? `${reduction}% smaller`
        : (saved === 0 ? 'Already optimized' : 'Minimal change');
      const reductionColor = reduction >= 20 ? 'var(--success)' : (reduction > 0 ? '#fbbf24' : 'var(--text-muted)');
      const icon = reduction > 0 ? '✅' : 'ℹ️';

      panel.innerHTML = `
        <div class="tool-result-icon">${icon}</div>
        <div class="tool-result-title">${reduction > 0 ? 'PDF Compressed' : 'PDF Already Optimized'}</div>
        ${reduction <= 0 ? '<div class="tool-result-info" style="margin-bottom:16px">This PDF is already well-optimized — further compression isn\'t possible without quality loss.</div>' : ''}
        <div class="tool-result-stats">
          <div class="tool-result-stat">
            <div class="tool-result-stat-value">${formatFileSize(originalSize)}</div>
            <div class="tool-result-stat-label">Original</div>
          </div>
          <div class="tool-result-stat">
            <div class="tool-result-stat-value" style="color: ${reductionColor}">${formatFileSize(newSize)}</div>
            <div class="tool-result-stat-label">Compressed</div>
          </div>
          <div class="tool-result-stat">
            <div class="tool-result-stat-value" style="color: ${reductionColor}">${reductionLabel}</div>
            <div class="tool-result-stat-label">Reduction</div>
          </div>
        </div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'compressed.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Compress another PDF';
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
      showToast('Error compressing: ' + err.message, 'error');
    }
  });

  page.appendChild(toolPage);
  page.appendChild(createFooter());
  container.appendChild(page);
}
