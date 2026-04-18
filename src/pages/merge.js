/**
 * merge.js — Merge PDF tool page
 */

import { createHeader } from '../components/header.js';
import { createFooter } from '../components/footer.js';
import { createDropzone, createFileList } from '../components/file-dropzone.js';
import { createProgressBar, createDownloadButton } from '../components/progress-bar.js';
import { mergePdfs } from '../core/pdf-engine.js';
import { readFileAsArrayBuffer, downloadBytes, formatFileSize, showToast } from '../utils/file-utils.js';
import { updateSEO } from '../utils/seo.js';
import { incrementGlobalCounter } from '../utils/analytics.js';

export function render(container) {
  updateSEO('/merge');

  const page = document.createElement('div');
  page.className = 'page-content';
  page.appendChild(createHeader('Merge PDF'));

  const toolPage = document.createElement('div');
  toolPage.className = 'tool-page';
  toolPage.innerHTML = `
    <div class="tool-hero" style="--tool-glow: var(--cat-organize-glow)">
      <div class="tool-hero-icon" style="background: linear-gradient(135deg, #3b82f6, #60a5fa)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <h1>Merge PDF</h1>
      <p>Combine multiple PDF files into a single document</p>
    </div>
    <div class="tool-body">
      <div id="merge-upload" class="tool-upload"></div>
      <div id="merge-files" class="hidden"></div>
      <div id="merge-processing" class="hidden"></div>
      <div id="merge-done" class="hidden"></div>
    </div>
    <div class="ad-slot"></div>
  `;

  // Upload state
  const uploadDiv = toolPage.querySelector('#merge-upload');
  const filesDiv = toolPage.querySelector('#merge-files');
  const processingDiv = toolPage.querySelector('#merge-processing');
  const doneDiv = toolPage.querySelector('#merge-done');

  const dropzone = createDropzone({
    accept: '.pdf',
    multiple: true,
    title: 'Drop your PDFs here',
    subtitle: 'or <strong>click to browse</strong>',
    hint: 'Select multiple PDF files to merge',
  });
  uploadDiv.appendChild(dropzone.element);

  const fileList = createFileList();
  const addMoreDropzone = createDropzone({
    accept: '.pdf', multiple: true,
    title: '+ Add more PDFs', subtitle: '', hint: '',
  });
  addMoreDropzone.element.classList.add('dropzone-compact');

  const actionBtn = document.createElement('button');
  actionBtn.className = 'tool-action-btn';
  actionBtn.textContent = 'Merge PDFs';
  actionBtn.disabled = true;

  filesDiv.appendChild(fileList.element);
  filesDiv.appendChild(addMoreDropzone.element);
  filesDiv.appendChild(actionBtn);

  const progress = createProgressBar();
  processingDiv.appendChild(progress.element);

  // File handling
  let pdfFiles = [];

  function handleNewFiles(files) {
    const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length === 0) { showToast('Please select PDF files', 'error'); return; }
    pdfFiles.push(...pdfs);
    fileList.setFiles(pdfFiles);
    uploadDiv.classList.add('hidden');
    filesDiv.classList.remove('hidden');
    actionBtn.disabled = pdfFiles.length < 2;
  }

  dropzone.onFiles(handleNewFiles);
  addMoreDropzone.onFiles(handleNewFiles);

  fileList.onChange((files) => {
    pdfFiles = files;
    actionBtn.disabled = pdfFiles.length < 2;
    if (pdfFiles.length === 0) {
      filesDiv.classList.add('hidden');
      uploadDiv.classList.remove('hidden');
    }
  });

  // Merge action
  actionBtn.addEventListener('click', async () => {
    filesDiv.classList.add('hidden');
    processingDiv.classList.remove('hidden');
    progress.setProgress(0, 'Reading PDF files...');

    try {
      const buffers = [];
      for (let i = 0; i < pdfFiles.length; i++) {
        const buf = await readFileAsArrayBuffer(pdfFiles[i]);
        buffers.push(buf);
        progress.setProgress((i + 1) / pdfFiles.length * 0.5, `Reading file ${i + 1} of ${pdfFiles.length}...`);
      }

      progress.setProgress(0.5, 'Merging PDFs...');
      const merged = await mergePdfs(buffers, (p) => {
        progress.setProgress(0.5 + p * 0.5, 'Merging PDFs...');
      });

      progress.setProgress(1, 'Done!');
      processingDiv.classList.add('hidden');

      // Show result
      const resultSize = formatFileSize(merged.byteLength);
      doneDiv.innerHTML = '';
      doneDiv.classList.remove('hidden');

      const result = document.createElement('div');
      result.className = 'tool-result';
      result.innerHTML = `
        <div class="tool-result-icon">✅</div>
        <div class="tool-result-title">PDFs Merged Successfully</div>
        <div class="tool-result-info">${pdfFiles.length} files combined • ${resultSize}</div>
      `;
      const dlBtn = createDownloadButton(() => {
        downloadBytes(merged, 'merged.pdf');
        incrementGlobalCounter();
      });
      result.appendChild(dlBtn);

      const restartBtn = document.createElement('button');
      restartBtn.className = 'tool-restart-btn';
      restartBtn.textContent = '← Merge more PDFs';
      restartBtn.addEventListener('click', () => {
        pdfFiles = [];
        fileList.setFiles([]);
        doneDiv.classList.add('hidden');
        uploadDiv.classList.remove('hidden');
        actionBtn.disabled = true;
      });
      result.appendChild(restartBtn);
      doneDiv.appendChild(result);
    } catch (err) {
      processingDiv.classList.add('hidden');
      filesDiv.classList.remove('hidden');
      showToast('Error merging PDFs: ' + err.message, 'error');
    }
  });

  page.appendChild(toolPage);
  page.appendChild(createFooter());
  container.appendChild(page);
}
