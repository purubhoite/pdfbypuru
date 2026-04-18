/**
 * thumbnail-grid.js — PDF page thumbnail grid with selection, rotation, drag-reorder
 * 
 * Defensive buffer handling: always clones ArrayBuffer before passing to PDF.js
 * to avoid DetachedArrayBuffer errors when the original buffer is reused later.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is configured
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

/**
 * Creates a thumbnail grid component.
 * @param {object} opts
 * @param {boolean} opts.selectable - Allow page selection
 * @param {boolean} opts.draggable - Allow drag reordering
 * @param {boolean} opts.rotatable - Show rotate buttons
 * @param {boolean} opts.deletable - Show delete buttons
 * @returns {object} Grid API
 */
export function createThumbnailGrid(opts = {}) {
  const { selectable = false, draggable = false, rotatable = false, deletable = false } = opts;

  const container = document.createElement('div');
  container.className = 'thumbnail-grid';

  let pages = []; // { index, selected, rotation, deleted }
  let pdfDoc = null;
  let selectionCallback = null;
  let orderCallback = null;
  let dragSrcIdx = null;

  /**
   * Load PDF and generate thumbnails.
   * IMPORTANT: We clone the buffer so the caller's original ArrayBuffer stays usable.
   */
  async function loadPdf(buffer) {
    // Clone the buffer — PDF.js may transfer ownership, which would detach the original
    const clonedBuffer = buffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(clonedBuffer) });
    pdfDoc = await loadingTask.promise;
    pages = [];
    for (let i = 0; i < pdfDoc.numPages; i++) {
      pages.push({ index: i, selected: selectable, rotation: 0, deleted: false });
    }
    await renderAll();
  }

  async function renderAll() {
    container.innerHTML = '';
    // Render thumbnails in parallel batches for performance
    const batchSize = 6;
    for (let batch = 0; batch < pages.length; batch += batchSize) {
      const promises = [];
      for (let i = batch; i < Math.min(batch + batchSize, pages.length); i++) {
        promises.push(createThumbnailItem(pages[i], i));
      }
      const items = await Promise.all(promises);
      items.forEach(item => container.appendChild(item));
    }
  }

  /**
   * Re-render only a single thumbnail item at the given array index.
   */
  async function renderSingle(arrIdx) {
    const oldItem = container.children[arrIdx];
    if (!oldItem) return;
    const newItem = await createThumbnailItem(pages[arrIdx], arrIdx);
    container.replaceChild(newItem, oldItem);
  }

  async function createThumbnailItem(pageData, arrIdx) {
    const item = document.createElement('div');
    item.className = 'thumbnail-item';
    if (pageData.selected) item.classList.add('selected');
    if (pageData.deleted) item.classList.add('deleted');
    if (draggable) item.draggable = true;
    item.dataset.idx = arrIdx;

    // Render thumbnail
    const canvas = document.createElement('canvas');
    try {
      const page = await pdfDoc.getPage(pageData.index + 1);
      const vp = page.getViewport({ scale: 0.4, rotation: pageData.rotation });
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, vp.width, vp.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    } catch (e) {
      console.warn('Thumbnail render failed for page', pageData.index + 1, e);
    }
    item.appendChild(canvas);

    // Page number
    const pageNum = document.createElement('span');
    pageNum.className = 'thumbnail-page-num';
    pageNum.textContent = pageData.index + 1;
    item.appendChild(pageNum);

    // Action buttons
    if (rotatable || deletable) {
      const actions = document.createElement('div');
      actions.className = 'thumbnail-actions';

      if (rotatable) {
        const rotBtn = document.createElement('button');
        rotBtn.className = 'thumbnail-action-btn';
        rotBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
        rotBtn.title = 'Rotate 90°';
        rotBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pageData.rotation = (pageData.rotation + 90) % 360;
          renderSingle(arrIdx); // Only re-render this one thumbnail
        });
        actions.appendChild(rotBtn);
      }

      if (deletable) {
        const delBtn = document.createElement('button');
        delBtn.className = 'thumbnail-action-btn';
        delBtn.style.cssText = pageData.deleted ? 'background: var(--success); color: white;' : '';
        delBtn.innerHTML = pageData.deleted
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.title = pageData.deleted ? 'Restore page' : 'Delete page';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pageData.deleted = !pageData.deleted;
          renderSingle(arrIdx); // Only re-render this one thumbnail
        });
        actions.appendChild(delBtn);
      }
      item.appendChild(actions);
    }

    if (pageData.rotation > 0 && rotatable) {
      const rot = document.createElement('span');
      rot.className = 'thumbnail-rotate-indicator';
      rot.textContent = `${pageData.rotation}°`;
      item.appendChild(rot);
    }

    // Click for selection
    if (selectable) {
      item.addEventListener('click', () => {
        pageData.selected = !pageData.selected;
        item.classList.toggle('selected', pageData.selected);
        if (selectionCallback) selectionCallback(getSelectedIndices());
      });
    }

    // Drag handlers
    if (draggable) {
      item.addEventListener('dragstart', (e) => {
        dragSrcIdx = arrIdx;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => { item.classList.remove('drag-over'); });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (dragSrcIdx !== null && dragSrcIdx !== arrIdx) {
          const moved = pages.splice(dragSrcIdx, 1)[0];
          pages.splice(arrIdx, 0, moved);
          renderAll(); // Full re-render needed after reorder
          if (orderCallback) orderCallback(pages.map(p => p.index));
        }
        dragSrcIdx = null;
      });
    }

    return item;
  }

  function getSelectedIndices() { return pages.filter(p => p.selected).map(p => p.index); }
  function getDeletedIndices() { return pages.filter(p => p.deleted).map(p => p.index); }
  function getOrder() { return pages.map(p => p.index); }
  function getRotations() {
    const r = {};
    pages.forEach(p => { if (p.rotation > 0) r[p.index] = p.rotation; });
    return r;
  }
  function selectAll() { pages.forEach(p => p.selected = true); renderAll(); }
  function selectNone() { pages.forEach(p => p.selected = false); renderAll(); }

  return {
    element: container,
    loadPdf,
    getSelectedIndices,
    getDeletedIndices,
    getOrder,
    getRotations,
    selectAll,
    selectNone,
    getPageCount: () => pages.length,
    onSelectionChange(cb) { selectionCallback = cb; },
    onOrderChange(cb) { orderCallback = cb; },
  };
}
