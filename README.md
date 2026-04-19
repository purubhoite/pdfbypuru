<div align="center">

# Puru PDF

### Every PDF tool you need — right in your browser.

A blazing-fast, privacy-first PDF toolkit that runs **100% client-side**. No uploads, no servers, no sign-ups.  
Built with vanilla JavaScript, PDF.js & pdf-lib.

[![Live Demo](https://img.shields.io/badge/Live_Demo-pdfbypuru.vercel.app-7c5cfc?style=for-the-badge&logo=vercel&logoColor=white)](https://pdfbypuru.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-34d399.svg?style=for-the-badge)](LICENSE)

<br/>

<img src="https://img.shields.io/badge/🔒_100%25_Private-Files_never_leave_your_device-0a0a10?style=flat-square&labelColor=1a1a24" />
<img src="https://img.shields.io/badge/♾️_Unlimited-No_daily_limits_or_signups-0a0a10?style=flat-square&labelColor=1a1a24" />
<img src="https://img.shields.io/badge/⚡_Lightning_Fast-Client--side_processing-0a0a10?style=flat-square&labelColor=1a1a24" />

</div>

---

## 🛠️ Tools

| Tool | Description |
|------|-------------|
| ✏️ **Edit PDF Text** | Click on any text in a PDF to edit it inline — matches original fonts |
| 📑 **Merge PDF** | Combine multiple PDFs into a single document |
| ✂️ **Split PDF** | Select and extract specific pages |
| 🗜️ **Compress PDF** | Dual-strategy compression (structural + image-based JPEG re-render) |
| 🔄 **Rotate Pages** | Rotate individual pages by 90° with visual preview |
| ↕️ **Reorder Pages** | Drag-and-drop page thumbnail reordering |
| 🗑️ **Delete Pages** | Click to mark and remove unwanted pages |
| 🖼️ **Images → PDF** | Convert JPG, PNG, WebP, BMP, GIF, AVIF images to PDF |
| 📸 **PDF → Images** | Export each page as high-quality JPG or PNG |
| 💧 **Add Watermark** | Configurable text watermark (size, opacity, rotation, color) |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/purubhoite/pdfbypuru.git
cd pdfbypuru

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start editing PDFs.

---

## 🏗️ Architecture

```
src/
├── main.js                  # App entry point, route registration
├── router.js                # Hash-based SPA router
│
├── core/
│   └── pdf-engine.js        # All PDF operations (merge, split, compress, etc.)
│
├── pages/                   # Route-level page modules
│   ├── landing.js           # Tool grid homepage
│   ├── edit-text.js         # Inline PDF text editor
│   ├── merge.js             # Merge multiple PDFs
│   ├── split.js             # Extract pages
│   ├── compress.js          # Reduce file size
│   ├── rotate.js            # Rotate pages
│   ├── reorder.js           # Drag-and-drop reorder
│   ├── delete-pages.js      # Remove pages
│   ├── images-to-pdf.js     # Image → PDF converter
│   ├── pdf-to-images.js     # PDF → Image exporter
│   └── watermark.js         # Text watermark
│
├── components/              # Reusable UI components
│   ├── header.js            # Header + feedback button
│   ├── footer.js            # Footer
│   ├── file-dropzone.js     # Drag-and-drop upload + file list
│   ├── thumbnail-grid.js    # Page thumbnails (select/drag/rotate/delete)
│   └── progress-bar.js      # Progress indicator + download button
│
├── utils/
│   ├── file-utils.js        # File I/O, downloads, toast notifications
│   ├── analytics.js         # Vercel Analytics + usage counter
│   └── seo.js               # Dynamic meta tags per tool
│
├── styles/
│   ├── global.css           # Design tokens, reset, animations
│   ├── landing.css          # Landing page styles
│   ├── tool-page.css        # Shared tool layout + editor styles
│   └── components.css       # Component-level styles
│
└── [legacy modules]         # Original PDF editor modules
    ├── pdfRenderer.js       # PDF.js rendering engine
    ├── pdfExporter.js       # pdf-lib export pipeline
    ├── textOverlay.js       # Interactive text layer
    └── fontMapper.js        # Font detection & matching
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Build** | [Vite](https://vitejs.dev/) — instant HMR, optimized production builds |
| **PDF Manipulation** | [pdf-lib](https://pdf-lib.js.org/) — create, modify, merge, split PDFs |
| **PDF Rendering** | [PDF.js](https://mozilla.github.io/pdf.js/) — render pages, extract text |
| **Font Handling** | [@pdf-lib/fontkit](https://github.com/Hopding/fontkit) — custom font embedding |
| **Hosting** | [Vercel](https://vercel.com/) — edge deployment, serverless functions |
| **Analytics** | [Vercel Analytics](https://vercel.com/analytics) — privacy-friendly traffic tracking |
| **Feedback** | [Supabase](https://supabase.com/) — stores user feedback via serverless API |

---

## 🔒 Privacy

**Your files never leave your device.** Every operation — editing, merging, splitting, compressing — runs entirely in your browser using JavaScript. No file is ever uploaded to any server. This is a core design principle, not a feature toggle.

---

## 📦 Build & Deploy

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

Deploy to Vercel with zero config:

```bash
npx vercel
```

### Environment Variables (for feedback feature)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key |


## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made by [Puru Bhoite](https://github.com/purubhoite)**

*Your files never leave your device — all processing happens in your browser.*

</div>
