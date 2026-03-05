/**
 * textOverlay.js
 * 
 * Builds a transparent, interactive text layer over the PDF canvas.
 * Each text item becomes a clickable span that can be edited inline.
 * Uses PDF.js internal @font-face names for exact font matching.
 */

import { parseFontName } from './fontMapper.js';

/** @type {Map<string, {originalText: string, newText: string, item: object, fontInfo: object}>} */
const pendingEdits = new Map();

let currentEditSpan = null;
let currentInput = null;
let onEditCallback = null;

/**
 * Set a callback that fires whenever an edit is made.
 * @param {function} cb - Called with (editCount: number)
 */
export function onEdit(cb) {
    onEditCallback = cb;
}

/**
 * Build the text overlay layer with clickable spans.
 * @param {HTMLElement} textLayer - The text layer container div
 * @param {Array} textItems - Text items from pdfRenderer.getTextContent()
 * @param {number} scale - Current zoom scale
 */
export function buildTextLayer(textLayer, textItems, scale) {
    // Clear existing
    textLayer.innerHTML = '';
    closeCurrentEdit();

    for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i];

        // Resolve font: use PDF.js internal @font-face name for exact match
        const fontInfo = resolveFontInfo(item);

        const span = document.createElement('span');
        span.className = 'text-item';
        span.textContent = item.text;

        // Check if this item was previously edited
        const editKey = makeEditKey(item);
        if (pendingEdits.has(editKey)) {
            span.classList.add('edited');
            span.textContent = pendingEdits.get(editKey).newText;
        }

        // Position and size
        span.style.left = `${item.x}px`;
        span.style.top = `${item.y}px`;
        span.style.fontSize = `${item.fontSize}px`;
        span.style.fontFamily = fontInfo.fontFamily;
        span.style.fontWeight = fontInfo.fontWeight;
        span.style.fontStyle = fontInfo.fontStyle;

        // Make the span wide enough to be clickable
        if (item.width > 0) {
            span.style.width = `${item.width}px`;
        }
        if (item.height > 0) {
            span.style.height = `${item.height}px`;
        }

        // Store metadata
        span.dataset.index = i;
        span.dataset.editKey = editKey;
        span._textItem = item;
        span._fontInfo = fontInfo;

        // Click handler
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            startEdit(span, item, fontInfo, textLayer);
        });

        textLayer.appendChild(span);
    }
}

/**
 * Resolve font info for a text item.
 * Uses PDF.js internal @font-face name as primary (exact embedded font),
 * with fallback from the real PDF font name via fontMapper.
 */
function resolveFontInfo(item) {
    const pdfJsFontName = item.fontName;  // e.g. "g_d0_f1" - registered as @font-face by PDF.js
    const fontData = item.fontData;       // { realName, isSerif, isMonospace, bold, italic }

    // Parse the real font name through the mapper for weight/style + fallback stack
    const realName = fontData?.realName || '';
    const mapped = parseFontName(realName);

    // Use fontData flags if available (more reliable than name parsing)
    let fontWeight = mapped.fontWeight;
    let fontStyle = mapped.fontStyle;
    if (fontData) {
        if (fontData.bold) fontWeight = 'bold';
        if (fontData.italic) fontStyle = 'italic';
    }

    // Build font-family: PDF.js internal name first (exact embedded font),
    // then the mapped fallback stack
    let fontFamily;
    if (pdfJsFontName) {
        fontFamily = `"${pdfJsFontName}", ${mapped.fontFamily}`;
    } else {
        fontFamily = mapped.fontFamily;
    }

    return {
        fontFamily,
        fontWeight,
        fontStyle,
        baseName: mapped.baseName,
    };
}

/**
 * Start inline editing on a text span.
 */
function startEdit(span, item, fontInfo, textLayer) {
    closeCurrentEdit();

    currentEditSpan = span;
    span.classList.add('editing');

    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-edit-input';

    // Pre-fill with current text (either edited or original)
    const editKey = span.dataset.editKey;
    if (pendingEdits.has(editKey)) {
        input.value = pendingEdits.get(editKey).newText;
    } else {
        input.value = item.text;
    }

    // Position the input at the span location
    const spanRect = span.getBoundingClientRect();
    const layerRect = textLayer.getBoundingClientRect();

    input.style.left = `${span.offsetLeft}px`;
    input.style.top = `${span.offsetTop - 4}px`;
    input.style.fontSize = span.style.fontSize;
    input.style.fontFamily = fontInfo.fontFamily;
    input.style.fontWeight = fontInfo.fontWeight;
    input.style.fontStyle = fontInfo.fontStyle;
    input.style.minWidth = `${Math.max(item.width, 120)}px`;

    textLayer.appendChild(input);
    currentInput = input;

    // Focus and select all
    requestAnimationFrame(() => {
        input.focus();
        input.select();
    });

    // Event listeners
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            closeCurrentEdit(); // saves automatically
        } else if (e.key === 'Escape') {
            e.preventDefault();
            // Revert input to original before closing (so closeCurrentEdit doesn't save)
            input.value = item.text;
            closeCurrentEdit();
        }
    });

    input.addEventListener('blur', () => {
        // Small delay to let click events on other spans fire first
        setTimeout(() => {
            if (currentInput === input) {
                closeCurrentEdit();
            }
        }, 50);
    });
}

/**
 * Commit an edit.
 */
function commitEdit(span, item, fontInfo, newText) {
    const editKey = span.dataset.editKey;

    if (newText !== item.text && newText.trim() !== '') {
        pendingEdits.set(editKey, {
            originalText: item.text,
            newText,
            item,
            fontInfo,
        });
        span.classList.add('edited');
        span.textContent = newText;
    } else if (newText === item.text) {
        // Reverted to original
        pendingEdits.delete(editKey);
        span.classList.remove('edited');
        span.textContent = item.text;
    }

    closeCurrentEdit();

    if (onEditCallback) {
        onEditCallback(pendingEdits.size);
    }
}

/**
 * Close the current edit input, saving changes first.
 */
function closeCurrentEdit() {
    if (currentInput && currentEditSpan) {
        const input = currentInput;
        const span = currentEditSpan;
        const item = span._textItem;
        const fontInfo = span._fontInfo;
        const editKey = span.dataset.editKey;
        const newText = input.value;

        // Save the edit if text changed
        if (newText !== item.text && newText.trim() !== '') {
            pendingEdits.set(editKey, {
                originalText: item.text,
                newText,
                item,
                fontInfo,
            });
            span.classList.add('edited');
            span.textContent = newText;
        } else if (newText === item.text) {
            pendingEdits.delete(editKey);
            span.classList.remove('edited');
            span.textContent = item.text;
        }

        if (onEditCallback) {
            onEditCallback(pendingEdits.size);
        }
    }

    if (currentInput && currentInput.parentNode) {
        currentInput.parentNode.removeChild(currentInput);
    }
    if (currentEditSpan) {
        currentEditSpan.classList.remove('editing');
    }
    currentInput = null;
    currentEditSpan = null;
}

/**
 * Generate a unique key for a text item based on its position and content.
 */
function makeEditKey(item) {
    return `${item.transform[4].toFixed(1)}_${item.transform[5].toFixed(1)}_${item.text}`;
}

/**
 * Get all pending edits.
 * @returns {Map}
 */
export function getPendingEdits() {
    return pendingEdits;
}

/**
 * Clear all edits.
 */
export function clearEdits() {
    pendingEdits.clear();
    if (onEditCallback) onEditCallback(0);
}

/**
 * Get number of pending edits.
 * @returns {number}
 */
export function getEditCount() {
    return pendingEdits.size;
}
