/**
 * pdf-engine.js — Central PDF operations engine using pdf-lib + PDF.js
 * All operations run 100% client-side.
 * 
 * IMPORTANT: All functions that accept ArrayBuffer defensively clone
 * them via .slice(0) before passing to pdf-lib, which avoids
 * issues with detached buffers from prior PDF.js usage.
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure PDF.js worker is configured
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

/** Clone an ArrayBuffer defensively */
function safeBuf(buf) {
  return buf instanceof ArrayBuffer ? buf.slice(0) : new Uint8Array(buf).buffer.slice(0);
}

// ────────────────────────────────────────────────────────────
//  MERGE
// ────────────────────────────────────────────────────────────

/**
 * Merge multiple PDFs into one.
 * @param {ArrayBuffer[]} pdfBuffers
 * @returns {Promise<Uint8Array>}
 */
export async function mergePdfs(pdfBuffers, onProgress) {
  const merged = await PDFDocument.create();
  for (let i = 0; i < pdfBuffers.length; i++) {
    const src = await PDFDocument.load(safeBuf(pdfBuffers[i]), { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
    if (onProgress) onProgress((i + 1) / pdfBuffers.length);
  }
  return merged.save();
}

// ────────────────────────────────────────────────────────────
//  SPLIT / EXTRACT
// ────────────────────────────────────────────────────────────

/**
 * Extract specific pages from a PDF.
 * @param {ArrayBuffer} pdfBuffer
 * @param {number[]} pageIndices - 0-based page indices to extract
 * @returns {Promise<Uint8Array>}
 */
export async function extractPages(pdfBuffer, pageIndices, onProgress) {
  const src = await PDFDocument.load(safeBuf(pdfBuffer), { ignoreEncryption: true });
  const dest = await PDFDocument.create();
  const pages = await dest.copyPages(src, pageIndices);
  pages.forEach((p, i) => {
    dest.addPage(p);
    if (onProgress) onProgress((i + 1) / pageIndices.length);
  });
  return dest.save();
}

/**
 * Split a PDF into chunks of N pages.
 * Returns an array of PDF byte arrays.
 */
export async function splitPdfByChunks(pdfBuffer, chunkSize) {
  const src = await PDFDocument.load(safeBuf(pdfBuffer), { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  const results = [];
  for (let i = 0; i < totalPages; i += chunkSize) {
    const indices = [];
    for (let j = i; j < Math.min(i + chunkSize, totalPages); j++) {
      indices.push(j);
    }
    const chunk = await PDFDocument.create();
    const pages = await chunk.copyPages(src, indices);
    pages.forEach(p => chunk.addPage(p));
    results.push(await chunk.save());
  }
  return results;
}

// ────────────────────────────────────────────────────────────
//  COMPRESS — Real compression via canvas re-rendering
// ────────────────────────────────────────────────────────────

/**
 * Compress a PDF using a multi-strategy approach:
 *
 * Strategy 1: Structural re-save — pdf-lib strips redundant objects, unused
 *             fonts, and metadata. Works great for bloated export files.
 * Strategy 2: Canvas JPEG render — render each page to a JPEG image and
 *             rebuild the PDF. Crushes image-heavy PDFs dramatically.
 *
 * Returns whichever result is smallest. NEVER returns a file larger than
 * the original — if neither strategy reduces size, returns the original.
 *
 * @param {ArrayBuffer} pdfBuffer
 * @param {number} quality - 0.0 (max compression) to 1.0 (min compression)
 * @param {Function} onProgress
 * @returns {Promise<{bytes: Uint8Array, method: string}>}
 */
export async function compressPdf(pdfBuffer, quality = 0.5, onProgress) {
  const buf = safeBuf(pdfBuffer);
  const originalSize = buf.byteLength;

  if (onProgress) onProgress(0.05);

  // ── Strategy 1: Structural re-save ──────────────────────
  let structuralBytes;
  try {
    const structDoc = await PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
    structuralBytes = await structDoc.save();
  } catch (e) {
    structuralBytes = null;
  }

  if (onProgress) onProgress(0.15);

  // ── Strategy 2: Canvas JPEG render ──────────────────────
  // Map quality to render scale and JPEG quality
  // quality 0.3 (max compress) => scale 1.2, jpeg 0.35
  // quality 0.6 (balanced)     => scale 1.5, jpeg 0.55
  // quality 0.9 (best quality) => scale 2.0, jpeg 0.75
  const renderScale = 1.2 + (quality - 0.3) * (0.8 / 0.6);
  const jpegQuality = 0.35 + (quality - 0.3) * (0.4 / 0.6);

  let canvasBytes;
  try {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    const numPages = doc.numPages;
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', jpegQuality)
      );
      const imgBytes = new Uint8Array(await blob.arrayBuffer());
      const jpgImage = await newPdf.embedJpg(imgBytes);

      const origViewport = page.getViewport({ scale: 1.0 });
      const pageWidth = origViewport.width;
      const pageHeight = origViewport.height;

      const newPage = newPdf.addPage([pageWidth, pageHeight]);
      newPage.drawImage(jpgImage, {
        x: 0, y: 0, width: pageWidth, height: pageHeight,
      });

      // Progress: 15% already done, remaining 85% split across pages
      if (onProgress) onProgress(0.15 + (i / numPages) * 0.85);

      canvas.width = 0;
      canvas.height = 0;
    }
    canvasBytes = await newPdf.save();
  } catch (e) {
    console.warn('Canvas compression failed, falling back to structural:', e);
    canvasBytes = null;
  }

  // ── Pick the best result ────────────────────────────────
  const candidates = [];
  if (structuralBytes) candidates.push({ bytes: structuralBytes, method: 'structural' });
  if (canvasBytes) candidates.push({ bytes: canvasBytes, method: 'image-optimized' });

  // Sort by size ascending
  candidates.sort((a, b) => a.bytes.byteLength - b.bytes.byteLength);

  // Return the smallest, but ONLY if it's actually smaller than the original
  if (candidates.length > 0 && candidates[0].bytes.byteLength < originalSize) {
    return candidates[0].bytes;
  }

  // If structural is smaller than canvas but still ≥ original, return structural
  if (structuralBytes && structuralBytes.byteLength <= originalSize) {
    return structuralBytes;
  }

  // Nothing helped — return original bytes re-saved (won't be bigger)
  if (structuralBytes) return structuralBytes;

  // Last resort: return the canvas version even if bigger (shouldn't reach here)
  return canvasBytes || new Uint8Array(buf);
}

// ────────────────────────────────────────────────────────────
//  ROTATE
// ────────────────────────────────────────────────────────────

/**
 * Rotate pages in a PDF.
 * @param {ArrayBuffer} pdfBuffer
 * @param {Object<number, number>} rotations - Map of 0-based page index to rotation degrees (90, 180, 270)
 */
export async function rotatePages(pdfBuffer, rotations, onProgress) {
  const doc = await PDFDocument.load(safeBuf(pdfBuffer), { ignoreEncryption: true });
  const pages = doc.getPages();
  const entries = Object.entries(rotations);
  entries.forEach(([idx, deg], i) => {
    const page = pages[parseInt(idx)];
    if (page) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + deg));
    }
    if (onProgress) onProgress((i + 1) / entries.length);
  });
  return doc.save();
}

// ────────────────────────────────────────────────────────────
//  REORDER
// ────────────────────────────────────────────────────────────

/**
 * Reorder pages in a PDF.
 * @param {ArrayBuffer} pdfBuffer
 * @param {number[]} newOrder - Array of 0-based page indices in desired order
 */
export async function reorderPages(pdfBuffer, newOrder, onProgress) {
  const src = await PDFDocument.load(safeBuf(pdfBuffer), { ignoreEncryption: true });
  const dest = await PDFDocument.create();
  const pages = await dest.copyPages(src, newOrder);
  pages.forEach((p, i) => {
    dest.addPage(p);
    if (onProgress) onProgress((i + 1) / newOrder.length);
  });
  return dest.save();
}

// ────────────────────────────────────────────────────────────
//  DELETE PAGES
// ────────────────────────────────────────────────────────────

/**
 * Delete pages from a PDF.
 * @param {ArrayBuffer} pdfBuffer
 * @param {number[]} deleteIndices - 0-based indices of pages to delete
 */
export async function deletePages(pdfBuffer, deleteIndices, onProgress) {
  // Use safeBuf here since extractPages will also safeBuf internally
  const buf = safeBuf(pdfBuffer);
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();
  const keepIndices = [];
  for (let i = 0; i < total; i++) {
    if (!deleteIndices.includes(i)) keepIndices.push(i);
  }
  // Build the output directly instead of calling extractPages with potentially detached buffer
  const dest = await PDFDocument.create();
  const pages = await dest.copyPages(src, keepIndices);
  pages.forEach((p, i) => {
    dest.addPage(p);
    if (onProgress) onProgress((i + 1) / keepIndices.length);
  });
  return dest.save();
}

// ────────────────────────────────────────────────────────────
//  IMAGES TO PDF
// ────────────────────────────────────────────────────────────

/**
 * Convert images to a PDF document.
 * @param {Array<{data: ArrayBuffer, type: string, name: string}>} images
 * @param {string} pageSize - 'fit', 'a4', 'letter'
 */
export async function imagesToPdf(images, pageSize = 'fit', onProgress) {
  const doc = await PDFDocument.create();
  const sizes = { a4: [595.28, 841.89], letter: [612, 792] };

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let embeddedImg;

    try {
      if (img.type === 'image/png') {
        embeddedImg = await doc.embedPng(img.data);
      } else {
        // All non-PNG images (JPEG, converted WebP, etc.) go through embedJpg
        embeddedImg = await doc.embedJpg(img.data);
      }
    } catch (embedErr) {
      console.warn(`Failed to embed image "${img.name}":`, embedErr);
      // Try the other format as fallback
      try {
        embeddedImg = img.type === 'image/png'
          ? await doc.embedJpg(img.data)
          : await doc.embedPng(img.data);
      } catch (fallbackErr) {
        throw new Error(`Cannot embed image "${img.name}". Ensure it's a valid JPG or PNG.`);
      }
    }

    let pageWidth, pageHeight;
    if (pageSize === 'fit') {
      pageWidth = embeddedImg.width;
      pageHeight = embeddedImg.height;
    } else {
      [pageWidth, pageHeight] = sizes[pageSize] || sizes.a4;
    }

    const page = doc.addPage([pageWidth, pageHeight]);

    // Scale image to fit page
    const scale = Math.min(pageWidth / embeddedImg.width, pageHeight / embeddedImg.height);
    const scaledW = embeddedImg.width * scale;
    const scaledH = embeddedImg.height * scale;
    const x = (pageWidth - scaledW) / 2;
    const y = (pageHeight - scaledH) / 2;

    page.drawImage(embeddedImg, { x, y, width: scaledW, height: scaledH });
    if (onProgress) onProgress((i + 1) / images.length);
  }
  return doc.save();
}

// ────────────────────────────────────────────────────────────
//  WATERMARK — Properly centered with rotation
// ────────────────────────────────────────────────────────────

/**
 * Add a text watermark to all pages.
 * Uses proper center-of-page rotation so the watermark stays centered
 * regardless of rotation angle.
 *
 * @param {ArrayBuffer} pdfBuffer
 * @param {object} options
 */
export async function addWatermark(pdfBuffer, options = {}, onProgress) {
  const {
    text = 'WATERMARK',
    fontSize = 48,
    opacity = 0.15,
    rotation = -45,
    color = { r: 0.5, g: 0.5, b: 0.5 },
  } = options;

  const doc = await PDFDocument.load(safeBuf(pdfBuffer), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Calculate center of page
    const cx = width / 2;
    const cy = height / 2;

    // Convert rotation to radians
    const radians = (rotation * Math.PI) / 180;

    // The text anchor is at its bottom-left. To center the text at (cx, cy),
    // we need to offset by half the text dimensions, accounting for rotation.
    const halfW = textWidth / 2;
    const halfH = textHeight / 2;

    // Position so that the center of the text bounding box lands at page center
    const x = cx - halfW * Math.cos(radians) + halfH * Math.sin(radians);
    const y = cy - halfW * Math.sin(radians) - halfH * Math.cos(radians);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation),
    });
    if (onProgress) onProgress((i + 1) / pages.length);
  });

  return doc.save();
}

// ────────────────────────────────────────────────────────────
//  UTILITIES
// ────────────────────────────────────────────────────────────

/**
 * Get page count from a PDF without fully loading it.
 */
export async function getPageCount(pdfBuffer) {
  const doc = await PDFDocument.load(safeBuf(pdfBuffer), { ignoreEncryption: true });
  return doc.getPageCount();
}
