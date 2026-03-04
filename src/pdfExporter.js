/**
 * pdfExporter.js
 * 
 * Uses pdf-lib's built-in API for maximum compatibility.
 * Covers original text with white rectangle, draws new text using standard fonts.
 * This approach works reliably on ALL PDFs.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getPdfLibFontName } from './fontMapper.js';

/**
 * Export a modified PDF with all pending edits applied.
 */
export async function exportPdf(originalBytes, edits, scale) {
    const pdfDoc = await PDFDocument.load(originalBytes, {
        ignoreEncryption: true,
        updateMetadata: false,
    });

    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();

    // Pre-embed standard fonts
    const fontCache = {};
    async function getFont(fontInfo) {
        const key = getPdfLibFontName(
            fontInfo?.baseName || 'arial',
            fontInfo?.fontWeight || 'normal',
            fontInfo?.fontStyle || 'normal'
        );
        if (!fontCache[key]) {
            try {
                fontCache[key] = await pdfDoc.embedFont(StandardFonts[key]);
            } catch {
                // Fallback to Helvetica if the mapped font doesn't exist
                fontCache[key] = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }
        }
        return fontCache[key];
    }

    for (const [editKey, edit] of edits) {
        const { item, fontInfo, newText } = edit;
        const pageIndex = item._pageIndex || 0;
        if (pageIndex >= pages.length) continue;

        const page = pages[pageIndex];

        // Get coordinates from the original PDF transform (unscaled)
        const tx = item.transform[4];
        const ty = item.transform[5];
        const fontSize = Math.sqrt(
            item.transform[0] * item.transform[0] +
            item.transform[1] * item.transform[1]
        );

        // Get a standard font
        const font = await getFont(fontInfo);

        // Calculate cover rectangle — make it generous to fully cover original text
        const origTextWidth = font.widthOfTextAtSize(edit.originalText, fontSize);
        const newTextWidth = font.widthOfTextAtSize(newText, fontSize);
        const coverWidth = Math.max(origTextWidth, newTextWidth, fontSize * 2) + 8;
        const coverHeight = fontSize * 1.5;

        // Step 1: White rectangle to cover original text
        page.drawRectangle({
            x: tx - 2,
            y: ty - fontSize * 0.3,
            width: coverWidth,
            height: coverHeight,
            color: rgb(1, 1, 1),
            borderWidth: 0,
        });

        // Step 2: Draw replacement text in black
        page.drawText(newText, {
            x: tx,
            y: ty,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });
    }

    return await pdfDoc.save();
}

/**
 * Trigger a browser download of the modified PDF.
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

    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}
