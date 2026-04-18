/**
 * seo.js — Dynamic meta tag management for each tool page
 */

const BASE_TITLE = 'Puru PDF';
const BASE_DESC = 'Free online PDF tools — merge, split, compress, convert, edit and more. 100% browser-based, no uploads, unlimited use.';

const toolSEO = {
  '/': {
    title: `${BASE_TITLE} — Free Online PDF Tools`,
    description: BASE_DESC,
  },
  '/merge': {
    title: `Merge PDF Online Free — Combine PDF Files | ${BASE_TITLE}`,
    description: 'Combine multiple PDF files into one document. Free, no sign-up, 100% browser-based. Files never leave your device.',
  },
  '/split': {
    title: `Split PDF — Extract Pages from PDF for Free | ${BASE_TITLE}`,
    description: 'Split and extract pages from your PDF. Select specific pages or split by range. Free, private, browser-based.',
  },
  '/compress': {
    title: `Compress PDF — Reduce PDF File Size Online | ${BASE_TITLE}`,
    description: 'Compress PDF files to reduce size while maintaining quality. Free online PDF compressor, no uploads required.',
  },
  '/rotate': {
    title: `Rotate PDF Pages Online Free | ${BASE_TITLE}`,
    description: 'Rotate individual or all PDF pages by 90, 180, or 270 degrees. Free, instant, browser-based.',
  },
  '/reorder': {
    title: `Reorder PDF Pages — Rearrange Pages Free | ${BASE_TITLE}`,
    description: 'Drag and drop to reorder pages in your PDF. Free online tool, no uploads, instant results.',
  },
  '/delete-pages': {
    title: `Delete PDF Pages — Remove Pages from PDF | ${BASE_TITLE}`,
    description: 'Remove unwanted pages from your PDF file. Select pages to delete, download the result. Free and private.',
  },
  '/images-to-pdf': {
    title: `Images to PDF — Convert JPG PNG to PDF | ${BASE_TITLE}`,
    description: 'Convert images (JPG, PNG, WebP) to a single PDF document. Free online converter, no uploads needed.',
  },
  '/pdf-to-images': {
    title: `PDF to Images — Convert PDF to JPG PNG | ${BASE_TITLE}`,
    description: 'Convert PDF pages to high-quality JPG or PNG images. Free, instant, browser-based conversion.',
  },
  '/watermark': {
    title: `Add Watermark to PDF Online Free | ${BASE_TITLE}`,
    description: 'Add text watermarks to your PDF. Customize text, opacity, rotation, and position. Free online tool.',
  },
  '/edit-text': {
    title: `Edit PDF Text Online — Modify PDF Content | ${BASE_TITLE}`,
    description: 'Click on any text in a PDF to edit it inline. Preserves original fonts and formatting. Free unlimited editing.',
  },
};

export function updateSEO(path) {
  const seo = toolSEO[path] || toolSEO['/'];

  document.title = seo.title;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = seo.description;

  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.content = seo.title;

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.content = seo.description;
}
