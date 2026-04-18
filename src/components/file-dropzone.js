/**
 * file-dropzone.js — Reusable drag-and-drop file upload component
 */

import { formatFileSize } from '../utils/file-utils.js';

/**
 * Creates a file dropzone component.
 * @param {object} options
 * @param {string} options.accept - File accept string, e.g. '.pdf' or 'image/*'
 * @param {boolean} options.multiple - Allow multiple files
 * @param {string} options.title - Dropzone title
 * @param {string} options.subtitle - Dropzone subtitle
 * @param {string} options.hint - Small hint text
 * @returns {{ element: HTMLElement, onFiles: (cb: Function) => void }}
 */
export function createDropzone(options = {}) {
  const {
    accept = '.pdf',
    multiple = false,
    title = 'Drop your file here',
    subtitle = 'or <strong>click to browse</strong>',
    hint = 'All processing happens in your browser',
  } = options;

  let filesCallback = null;

  const wrapper = document.createElement('div');
  wrapper.className = 'dropzone';
  wrapper.innerHTML = `
    <div class="dropzone-content">
      <div class="dropzone-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 12 15 15"/>
        </svg>
      </div>
      <div class="dropzone-title">${title}</div>
      <div class="dropzone-subtitle">${subtitle}</div>
      <div class="dropzone-hint">${hint}</div>
      <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''}>
    </div>
  `;

  const fileInput = wrapper.querySelector('input[type="file"]');

  wrapper.addEventListener('click', (e) => {
    if (e.target !== fileInput) fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  // Drag events
  wrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrapper.classList.add('drag-over');
  });

  wrapper.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrapper.classList.remove('drag-over');
  });

  wrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrapper.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  function handleFiles(files) {
    if (filesCallback) filesCallback(files);
  }

  return {
    element: wrapper,
    onFiles(cb) { filesCallback = cb; },
  };
}

/**
 * Creates a file list display with remove/reorder capabilities.
 */
export function createFileList() {
  const container = document.createElement('div');
  container.className = 'file-list';
  let files = [];
  let changeCallback = null;
  let dragSrcIdx = null;

  function render() {
    container.innerHTML = '';
    files.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.draggable = true;
      item.dataset.idx = idx;
      item.innerHTML = `
        <div class="file-item-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <span class="file-item-name">${file.name}</span>
        <span class="file-item-size">${formatFileSize(file.size)}</span>
        <button class="file-item-remove" data-remove="${idx}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      // Drag handlers for reordering
      item.addEventListener('dragstart', (e) => { dragSrcIdx = idx; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); });
      item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => { item.classList.remove('drag-over'); });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (dragSrcIdx !== null && dragSrcIdx !== idx) {
          const moved = files.splice(dragSrcIdx, 1)[0];
          files.splice(idx, 0, moved);
          render();
          if (changeCallback) changeCallback(files);
        }
        dragSrcIdx = null;
      });

      item.querySelector('[data-remove]').addEventListener('click', (e) => {
        e.stopPropagation();
        files.splice(idx, 1);
        render();
        if (changeCallback) changeCallback(files);
      });

      container.appendChild(item);
    });
  }

  return {
    element: container,
    setFiles(f) { files = [...f]; render(); },
    addFiles(f) { files.push(...f); render(); if (changeCallback) changeCallback(files); },
    getFiles() { return files; },
    onChange(cb) { changeCallback = cb; },
  };
}
