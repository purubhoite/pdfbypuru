/**
 * images-to-pdf.js — Convert images to PDF tool
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone, createFileList } from '../components/file-dropzone.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { imagesToPdf } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/images-to-pdf');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Images to PDF'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-convert-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <h1>Images to PDF</h1>
      <p>Convert your JPG, PNG, or WebP images into a single PDF</p>
    </div>
    <div class="tool-body">
      <div id="img-upload"></div>
      <div id="img-configure" class="hidden"></div>
      <div id="img-processing" class="hidden"></div>
      <div id="img-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  const uploadDiv = toolPage.querySelector('#img-upload');
  const configDiv = toolPage.querySelector('#img-configure');
  const processingDiv = toolPage.querySelector('#img-processing');
  const doneDiv = toolPage.querySelector('#img-done');

  const dropzone = createDropzone({
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    multiple: true,
    title: 'Drop your images here',
    subtitle: 'or <strong>click to browse</strong>',
    hint: 'Supports JPG, PNG, WebP',
  });
  uploadDiv.appendChild(dropzone.element);

  const fileList = createFileList();
  const addMore = createDropzone({
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    multiple: true, title: '+ Add more images', subtitle: '', hint: '',
  });
  addMore.element.classList.add('dropzone-compact');

  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'tool-options';
  optionsDiv.innerHTML = `
    <div class="tool-options-title">Page Size</div>
    <div class="option-row">
      <button class="option-btn active" data-size="fit">Fit Image</button>
      <button class="option-btn" data-size="a4">A4</button>
      <button class="option-btn" data-size="letter">Letter</button>
    </div>
  `;

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Convert to PDF';
  actionBtn.disabled = true;

  configDiv.appendChild(fileList.element);
  configDiv.appendChild(addMore.element);
  configDiv.appendChild(optionsDiv);
  configDiv.appendChild(actionBtn);

  const progress = createProgressBar();
  processingDiv.appendChild(progress.element);

  let imgFiles = [];
  let pageSize = 'fit';

  optionsDiv.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      optionsDiv.querySelectorAll('[data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pageSize = btn.dataset.size;
    });
  });

  function handleNewFiles(files) {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) { showToast('Please select image files', 'error'); return; }
    imgFiles.push(...images);
    fileList.setFiles(imgFiles);
    uploadDiv.classList.add('hidden');
    configDiv.classList.remove('hidden');
    actionBtn.disabled = imgFiles.length === 0;
  }

  dropzone.onFiles(handleNewFiles);
  addMore.onFiles(handleNewFiles);
  fileList.onChange((files) => {
    imgFiles = files;
    actionBtn.disabled = imgFiles.length === 0;
    if (imgFiles.length === 0) { configDiv.classList.add('hidden'); uploadDiv.classList.remove('hidden'); }
  });

  actionBtn.addEventListener('click', async () => {
    configDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Reading images...');

    try {
      const imageData = [];
      for (let i = 0; i < imgFiles.length; i++) {
        let data, type;
        const fileType = imgFiles[i].type;

        if (fileType === 'image/jpeg' || fileType === 'image/png') {
          // JPG and PNG can be embedded directly by pdf-lib
          data = await readFileAsArrayBuffer(imgFiles[i]);
          type = fileType;
        } else {
          // All other types (WebP, BMP, GIF, AVIF, etc.) — convert via canvas
          const converted = await convertImageToSupportedFormat(imgFiles[i]);
          data = converted.data;
          type = converted.type;
        }

        imageData.push({ data, type, name: imgFiles[i].name });
        progress.setProgress((i + 1) / imgFiles.length * 0.5, `Processing image ${i+1}/${imgFiles.length}...`);
      }

      progress.setProgress(0.5, 'Creating PDF...');
      const result = await imagesToPdf(imageData, pageSize, (p) => progress.setProgress(0.5 + p * 0.5));

      processingDiv.classList.add('hidden');
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const panel = document.createElement('div');
      panel.className = 'tool-result';
      panel.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">PDF Created</div>
        <div class="tool-result-info">${imgFiles.length} images • ${formatFileSize(result.byteLength)}</div>
      `;
      panel.appendChild(createDownloadButton(() => {
        downloadBytes(result, 'images.pdf');
        incrementGlobalCounter();
      }));

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Convert more images';
      restartBtn.addEventListener('click', () => { imgFiles = []; doneDiv.classList.add('hidden'); uploadDiv.classList.remove('hidden'); });
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

/**
 * Convert any browser-supported image (WebP, BMP, GIF, TIFF, etc.) to PNG via canvas.
 * JPG and PNG files are kept as-is by the caller.
 */
async function convertImageToSupportedFormat(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      // Use PNG for transparency support, JPEG for photos
      const outputType = 'image/png';
      c.toBlob((blob) => {
        if (!blob) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to convert image'));
          return;
        }
        blob.arrayBuffer().then(buf => {
          URL.revokeObjectURL(url);
          resolve({ data: buf, type: outputType });
        }).catch(reject);
      }, outputType);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image: ' + file.name));
    };
    img.src = url;
  });
}

