/**
 * pdfExporter.js
 * 
 * Uses pdf-lib to produce modified PDFs.
 * When possible, references the ORIGINAL font resource from the PDF
 * via raw content stream operators for exact font matching.
 * Falls back to pdf-lib standard fonts if the original font can't be found.
 */

import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray, PDFDict, PDFRef } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getPdfLibFontName } from './fontMapper.js';

/**
 * Export a modified PDF with all pending edits applied.
 * 
 * @param {ArrayBuffer} originalBytes - The original PDF file bytes
 * @param {Map} edits - Map of editKey → { originalText, newText, item, fontInfo }
 * @param {number} scale - The scale used during editing
 * @returns {Promise<Uint8Array>} - The modified PDF bytes
 */
export async function exportPdf(originalBytes, edits, scale) {
    const pdfDoc = await PDFDocument.load(originalBytes, {
        ignoreEncryption: true,
        updateMetadata: false,
    });

    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    const context = pdfDoc.context;

    // Group edits by page index
    const editsByPage = new Map();
    for (const [editKey, edit] of edits) {
        const pageIndex = edit.item._pageIndex || 0;
        if (!editsByPage.has(pageIndex)) editsByPage.set(pageIndex, []);
        editsByPage.get(pageIndex).push(edit);
    }

    // Standard font cache for fallback
    const fontCache = {};

    for (const [pageIndex, pageEdits] of editsByPage) {
        if (pageIndex >= pages.length) continue;
        const page = pages[pageIndex];

        // Build font resource map for this page: { baseFontName → resourceName }
        const fontResourceMap = buildFontResourceMap(page, context);

        // Collect raw PDF operators for edits that use original fonts
        let rawOps = '';
        // Collect fallback edits that need pdf-lib standard fonts
        const fallbackEdits = [];

        for (const edit of pageEdits) {
            const { item, fontInfo, newText } = edit;

            // Original PDF coordinates (unscaled)
            const tx = item.transform[4];
            const ty = item.transform[5];
            const fontSize = Math.sqrt(
                item.transform[0] * item.transform[0] +
                item.transform[1] * item.transform[1]
            );

            // Try to find the original font resource name in the PDF
            const fontResName = findMatchingFontResource(fontResourceMap, item);

            // Calculate cover rectangle size
            const approxCharWidth = fontSize * 0.55;
            const origWidth = Math.max(approxCharWidth * edit.originalText.length + 6, fontSize * 2);
            const textHeight = fontSize * 1.4;

            // White rectangle to cover original text
            rawOps += 'q\n';
            rawOps += '1 g\n';               // Grayscale fill: white
            rawOps += `${(tx - 2).toFixed(2)} ${(ty - fontSize * 0.3).toFixed(2)} ${origWidth.toFixed(2)} ${textHeight.toFixed(2)} re\n`;
            rawOps += 'f\n';
            rawOps += 'Q\n';

            if (fontResName) {
                // Draw text using the ORIGINAL font from the PDF
                const escapedText = escapePdfString(newText);
                rawOps += 'q\n';
                rawOps += '0 g\n';               // Grayscale fill: black
                rawOps += '0 G\n';               // Grayscale stroke: black
                rawOps += 'BT\n';
                rawOps += '0 Tr\n';              // Text render mode: fill
                rawOps += `/${fontResName} ${fontSize.toFixed(2)} Tf\n`;
                rawOps += `${tx.toFixed(2)} ${ty.toFixed(2)} Td\n`;
                rawOps += `(${escapedText}) Tj\n`;
                rawOps += 'ET\n';
                rawOps += 'Q\n';
            } else {
                // Queue for fallback with pdf-lib standard fonts
                fallbackEdits.push({ item, fontInfo, newText, tx, ty, fontSize });
            }
        }

        // Append raw content stream to this page
        if (rawOps.length > 0) {
            const encoder = new TextEncoder();
            const stream = context.stream(encoder.encode(rawOps));
            const streamRef = context.register(stream);

            // Add to page's Contents
            const existingContents = page.node.get(PDFName.of('Contents'));
            if (existingContents instanceof PDFArray) {
                existingContents.push(streamRef);
            } else if (existingContents instanceof PDFRef) {
                page.node.set(PDFName.of('Contents'), context.obj([existingContents, streamRef]));
            } else {
                page.node.set(PDFName.of('Contents'), streamRef);
            }
        }

        // Handle fallback edits with pdf-lib standard fonts
        for (const fb of fallbackEdits) {
            const key = getPdfLibFontName(fb.fontInfo.baseName, fb.fontInfo.fontWeight, fb.fontInfo.fontStyle);
            if (!fontCache[key]) {
                fontCache[key] = await pdfDoc.embedFont(StandardFonts[key]);
            }
            const font = fontCache[key];

            page.drawText(fb.newText, {
                x: fb.tx,
                y: fb.ty,
                size: fb.fontSize,
                font,
                color: rgb(0, 0, 0),
            });
        }
    }

    return await pdfDoc.save();
}

/**
 * Build a map of font resources for a page.
 * Returns entries like: [{ resourceName: "F1", baseFont: "TimesNewRomanPSMT" }, ...]
 */
function buildFontResourceMap(page, context) {
    const result = [];
    try {
        let resources = page.node.get(PDFName.of('Resources'));
        if (resources instanceof PDFRef) resources = context.lookup(resources);
        if (!resources || !(resources instanceof PDFDict)) return result;

        let fontDict = resources.get(PDFName.of('Font'));
        if (fontDict instanceof PDFRef) fontDict = context.lookup(fontDict);
        if (!fontDict || !(fontDict instanceof PDFDict)) return result;

        const entries = fontDict.entries();
        for (const [nameObj, ref] of entries) {
            let fontObj = ref;
            if (fontObj instanceof PDFRef) fontObj = context.lookup(fontObj);
            if (!(fontObj instanceof PDFDict)) continue;

            const baseFontEntry = fontObj.get(PDFName.of('BaseFont'));
            if (!baseFontEntry) continue;

            // Get the resource name (e.g., "F1") and base font name (e.g., "TimesNewRomanPSMT")
            const resName = nameObj.toString().replace(/^\//, '');
            const baseFont = baseFontEntry.toString().replace(/^\//, '');

            result.push({ resourceName: resName, baseFont });
        }
    } catch (e) {
        console.warn('Error building font resource map:', e);
    }
    return result;
}

/**
 * Find the font resource name that matches a text item's font.
 * Returns the resource name (e.g., "F1") or null.
 */
function findMatchingFontResource(fontResourceMap, item) {
    const realName = item.fontData?.realName;
    if (!realName || fontResourceMap.length === 0) return null;

    const realNameClean = realName.replace(/[-\s]/g, '').toLowerCase();

    for (const { resourceName, baseFont } of fontResourceMap) {
        // Strip subset prefix (e.g., "ABCDEF+TimesNewRomanPSMT" → "TimesNewRomanPSMT")
        const cleanBase = baseFont.includes('+')
            ? baseFont.split('+')[1]
            : baseFont;

        const cleanBaseLower = cleanBase.replace(/[-\s]/g, '').toLowerCase();

        // Match by various strategies
        if (cleanBase === realName ||
            baseFont === realName ||
            cleanBaseLower === realNameClean ||
            cleanBaseLower.includes(realNameClean) ||
            realNameClean.includes(cleanBaseLower)) {
            return resourceName;
        }
    }

    return null;
}

/**
 * Escape special characters for a PDF string literal.
 */
function escapePdfString(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

/**
 * Trigger a browser download of the modified PDF.
 * @param {Uint8Array} pdfBytes 
 * @param {string} filename 
 */
export function downloadPdf(pdfBytes, filename = 'edited.pdf') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}
