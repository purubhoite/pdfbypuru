/**
 * pdfRenderer.js
 * 
 * Handles loading and rendering PDFs using PDF.js.
 * Provides text extraction with font metadata for the text overlay.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

let pdfDoc = null;
let pdfBytes = null;

/**
 * Load a PDF document from an ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<{numPages: number}>}
 */
export async function loadDocument(arrayBuffer) {
    // Store original bytes for later export
    pdfBytes = arrayBuffer.slice(0);

    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.124/cmaps/',
        cMapPacked: true,
    });

    pdfDoc = await loadingTask.promise;

    return {
        numPages: pdfDoc.numPages,
    };
}

/**
 * Render a specific page to a canvas.
 * @param {number} pageNum - 1-indexed page number
 * @param {number} scale - Zoom scale (1.0 = 100%)
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{width: number, height: number}>}
 */
export async function renderPage(pageNum, scale, canvas) {
    if (!pdfDoc) throw new Error('No PDF loaded');

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await page.render({
        canvasContext: ctx,
        viewport,
    }).promise;

    return { width: viewport.width, height: viewport.height };
}

/**
 * Extract text content with font and position metadata from a page.
 * @param {number} pageNum - 1-indexed page number
 * @param {number} scale - Current zoom scale
 * @returns {Promise<Array<{
 *   text: string,
 *   x: number, y: number,
 *   width: number, height: number,
 *   fontSize: number,
 *   fontName: string,
 *   fontFamily: string,
 *   transform: number[],
 *   color: string
 * }>>}
 */
export async function getTextContent(pageNum, scale) {
    if (!pdfDoc) throw new Error('No PDF loaded');

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    // Build a map of PDF.js internal font name → actual font metadata
    // PDF.js registers embedded fonts as @font-face with the internal name,
    // so we can use it directly in CSS for exact matching.
    const fontDataMap = {};
    if (page.commonObjs) {
        for (const item of textContent.items) {
            if (item.fontName && !fontDataMap[item.fontName]) {
                try {
                    const fontData = page.commonObjs.get(item.fontName);
                    if (fontData) {
                        fontDataMap[item.fontName] = {
                            // The real PDF font name, e.g. "Times-Bold", "Helvetica"
                            realName: fontData.name || '',
                            // Whether it's monospace, serif, etc.
                            isMonospace: fontData.isMonospace || false,
                            isSerif: fontData.isSerif !== false,  // default to serif if unknown
                            bold: fontData.black || fontData.bold || false,
                            italic: fontData.italic || false,
                        };
                    }
                } catch (e) {
                    // Font data not available yet, skip
                }
            }
        }
    }

    const items = [];

    for (const item of textContent.items) {
        if (!item.str || item.str.trim() === '') continue;

        // The transform array: [scaleX, skewY, skewX, scaleY, translateX, translateY]
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);

        // Position from the transform
        const x = tx[4];
        const y = tx[5];

        // Width and height
        const width = item.width * scale;
        const height = item.height * scale;

        // Get the real font data if available
        const fontData = fontDataMap[item.fontName] || null;

        items.push({
            text: item.str,
            x,
            y: y - height,  // Adjust for text baseline
            width: Math.max(width, fontSize * item.str.length * 0.6),
            height: Math.max(height, fontSize),
            fontSize,
            fontName: item.fontName || '',
            fontData,   // Real font metadata from PDF.js
            transform: item.transform,
            originalItem: item,
        });
    }

    return items;
}

/**
 * Returns the stored original PDF bytes for export.
 * @returns {ArrayBuffer|null}
 */
export function getOriginalBytes() {
    return pdfBytes;
}

/**
 * Get the total number of pages.
 * @returns {number}
 */
export function getPageCount() {
    return pdfDoc ? pdfDoc.numPages : 0;
}
