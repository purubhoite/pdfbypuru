/**
 * pdfRenderer.js
 * 
 * Handles loading and rendering PDFs using PDF.js.
 * Provides text extraction with font metadata for the text overlay.
 * Includes mobile canvas size limits and robust error handling.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

let pdfDoc = null;
let pdfBytes = null;

// Max canvas dimensions — mobile browsers typically cap at 4096px or ~16MP
const MAX_CANVAS_DIM = 4096;
const MAX_CANVAS_PIXELS = 16777216; // 16 million pixels

/**
 * Load a PDF document from an ArrayBuffer.
 */
export async function loadDocument(arrayBuffer) {
    pdfBytes = arrayBuffer.slice(0);

    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.124/cmaps/',
        cMapPacked: true,
        // Disable worker fallback if worker fails to load
        disableAutoFetch: false,
        disableStream: false,
    });

    pdfDoc = await loadingTask.promise;

    return {
        numPages: pdfDoc.numPages,
    };
}

/**
 * Render a specific page to a canvas.
 * Automatically reduces scale if the canvas would exceed device limits.
 */
export async function renderPage(pageNum, scale, canvas) {
    if (!pdfDoc) throw new Error('No PDF loaded');

    const page = await pdfDoc.getPage(pageNum);
    let viewport = page.getViewport({ scale });

    // Clamp canvas size to avoid exceeding browser limits
    let actualScale = scale;
    const totalPixels = viewport.width * viewport.height;

    if (viewport.width > MAX_CANVAS_DIM || viewport.height > MAX_CANVAS_DIM || totalPixels > MAX_CANVAS_PIXELS) {
        // Calculate the max scale that fits within limits
        const scaleByWidth = MAX_CANVAS_DIM / (viewport.width / scale);
        const scaleByHeight = MAX_CANVAS_DIM / (viewport.height / scale);
        const scaleByPixels = Math.sqrt(MAX_CANVAS_PIXELS / ((viewport.width / scale) * (viewport.height / scale)));
        actualScale = Math.min(scale, scaleByWidth, scaleByHeight, scaleByPixels);
        viewport = page.getViewport({ scale: actualScale });
        console.warn(`Canvas too large at scale ${scale}, reduced to ${actualScale.toFixed(2)}`);
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas 2D context — your browser may not support this feature');
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill with white background first (prevents blank/transparent canvas)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
        await page.render({
            canvasContext: ctx,
            viewport,
        }).promise;
    } catch (renderErr) {
        console.error('PDF.js render error:', renderErr);
        // Even if render fails, the white background remains visible
        // Draw error message on canvas so user sees something
        ctx.fillStyle = '#666';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Failed to render this page', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Try zooming out or using a different browser', canvas.width / 2, canvas.height / 2 + 24);
    }

    return { width: viewport.width, height: viewport.height };
}

/**
 * Extract text content with font and position metadata from a page.
 */
export async function getTextContent(pageNum, scale) {
    if (!pdfDoc) throw new Error('No PDF loaded');

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    // Build a map of PDF.js internal font name → actual font metadata
    const fontDataMap = {};
    if (page.commonObjs) {
        for (const item of textContent.items) {
            if (item.fontName && !fontDataMap[item.fontName]) {
                try {
                    const fontData = page.commonObjs.get(item.fontName);
                    if (fontData) {
                        fontDataMap[item.fontName] = {
                            realName: fontData.name || '',
                            isMonospace: fontData.isMonospace || false,
                            isSerif: fontData.isSerif !== false,
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

        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        const x = tx[4];
        const y = tx[5];
        const width = item.width * scale;
        const height = item.height * scale;
        const fontData = fontDataMap[item.fontName] || null;

        items.push({
            text: item.str,
            x,
            y: y - height,
            width: Math.max(width, fontSize * item.str.length * 0.6),
            height: Math.max(height, fontSize),
            fontSize,
            fontName: item.fontName || '',
            fontData,
            transform: item.transform,
            originalItem: item,
        });
    }

    return items;
}

/**
 * Returns the stored original PDF bytes for export.
 */
export function getOriginalBytes() {
    return pdfBytes;
}

/**
 * Get the total number of pages.
 */
export function getPageCount() {
    return pdfDoc ? pdfDoc.numPages : 0;
}
