/**
 * fontMapper.js
 * 
 * Maps PDF internal font names to usable web/system fonts.
 * Handles parsing of PDF font names like "BCDFGH+TimesNewRoman,Bold"
 * into CSS font-family, weight, and style values.
 */

// Maps common PDF font base names to standard web font stacks
const FONT_MAP = {
    // Times variants
    'timesnewroman': 'Times New Roman, Times, serif',
    'times': 'Times New Roman, Times, serif',
    'timesroman': 'Times New Roman, Times, serif',
    'tinos': 'Times New Roman, Times, serif',

    // Arial / Helvetica variants
    'arial': 'Arial, Helvetica, sans-serif',
    'helvetica': 'Arial, Helvetica, sans-serif',
    'arimo': 'Arial, Helvetica, sans-serif',
    'helveticaneue': 'Arial, Helvetica, sans-serif',

    // Calibri / modern sans
    'calibri': 'Calibri, Carlito, Arial, sans-serif',
    'carlito': 'Calibri, Carlito, Arial, sans-serif',

    // Courier variants
    'courier': 'Courier New, Courier, monospace',
    'couriernew': 'Courier New, Courier, monospace',
    'cousine': 'Courier New, Courier, monospace',

    // Cambria
    'cambria': 'Cambria, Georgia, serif',
    'caladea': 'Cambria, Georgia, serif',

    // Georgia
    'georgia': 'Georgia, serif',

    // Verdana
    'verdana': 'Verdana, Geneva, sans-serif',

    // Tahoma
    'tahoma': 'Tahoma, Geneva, sans-serif',

    // Garamond
    'garamond': 'Garamond, Georgia, serif',
    'ebgaramond': 'Garamond, Georgia, serif',

    // Comic Sans
    'comicsansms': 'Comic Sans MS, cursive',

    // Impact
    'impact': 'Impact, Haettenschweiler, sans-serif',

    // Symbol / ZapfDingbats
    'symbol': 'Symbol, serif',
    'zapfdingbats': 'ZapfDingbats, serif',

    // Segoe
    'segoeui': 'Segoe UI, Arial, sans-serif',

    // Roboto
    'roboto': 'Roboto, Arial, sans-serif',

    // Noto
    'notosans': 'Noto Sans, Arial, sans-serif',
    'notoserif': 'Noto Serif, Times New Roman, serif',
};

// Keywords that indicate weight/style
const BOLD_KEYWORDS = ['bold', 'black', 'heavy', 'demi', 'semibold', 'extrabold', 'demibold'];
const ITALIC_KEYWORDS = ['italic', 'oblique', 'inclined', 'slanted'];

/**
 * Parse a PDF font name and return CSS-compatible font info.
 * 
 * @param {string} pdfFontName - The raw font name from PDF.js (e.g., "BCDFGH+TimesNewRoman-BoldItalic")
 * @returns {{ fontFamily: string, fontWeight: string, fontStyle: string, baseName: string }}
 */
export function parseFontName(pdfFontName) {
    if (!pdfFontName) {
        return {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
            baseName: 'arial',
        };
    }

    let name = pdfFontName;

    // Remove the subset prefix (e.g. "BCDFGH+" → "")
    const plusIndex = name.indexOf('+');
    if (plusIndex !== -1) {
        name = name.substring(plusIndex + 1);
    }

    const nameLower = name.toLowerCase();

    // Detect weight and style from the full name
    let fontWeight = 'normal';
    let fontStyle = 'normal';

    for (const kw of BOLD_KEYWORDS) {
        if (nameLower.includes(kw)) {
            fontWeight = 'bold';
            break;
        }
    }

    for (const kw of ITALIC_KEYWORDS) {
        if (nameLower.includes(kw)) {
            fontStyle = 'italic';
            break;
        }
    }

    // Extract the base font name by stripping style descriptors and separators
    let baseName = name
        .replace(/[-_,]/g, '')   // Remove separators
        .replace(/\s+/g, '')
        .toLowerCase();

    // Strip weight/style keywords from the base to do a clean lookup
    const strippable = [...BOLD_KEYWORDS, ...ITALIC_KEYWORDS, 'regular', 'medium', 'light', 'roman', 'normal', 'book', 'mt', 'ps', 'std'];
    let cleanBase = baseName;
    for (const kw of strippable) {
        cleanBase = cleanBase.replace(new RegExp(kw, 'g'), '');
    }
    cleanBase = cleanBase.trim();

    // Look up in the font map
    const fontFamily = FONT_MAP[cleanBase] || FONT_MAP[baseName] || `${name.split(/[-_,]/)[0]}, Arial, sans-serif`;

    return {
        fontFamily,
        fontWeight,
        fontStyle,
        baseName: cleanBase || baseName,
    };
}

/**
 * Returns the matching pdf-lib standard font name for common fonts.
 * Falls back to Helvetica if not recognized.
 * 
 * @param {string} baseName 
 * @param {string} fontWeight 
 * @param {string} fontStyle 
 * @returns {string} pdf-lib StandardFonts key
 */
export function getPdfLibFontName(baseName, fontWeight, fontStyle) {
    const isBold = fontWeight === 'bold';
    const isItalic = fontStyle === 'italic';

    // Check for Times
    if (['timesnewroman', 'times', 'timesroman', 'tinos', 'cambria', 'caladea', 'georgia', 'garamond', 'ebgaramond', 'notoserif'].includes(baseName)) {
        if (isBold && isItalic) return 'TimesRomanBoldItalic';
        if (isBold) return 'TimesRomanBold';
        if (isItalic) return 'TimesRomanItalic';
        return 'TimesRoman';
    }

    // Check for Courier
    if (['courier', 'couriernew', 'cousine'].includes(baseName)) {
        if (isBold && isItalic) return 'CourierBoldOblique';
        if (isBold) return 'CourierBold';
        if (isItalic) return 'CourierOblique';
        return 'Courier';
    }

    // Default: Helvetica (matches Arial, Calibri, etc.)
    if (isBold && isItalic) return 'HelveticaBoldOblique';
    if (isBold) return 'HelveticaBold';
    if (isItalic) return 'HelveticaOblique';
    return 'Helvetica';
}
