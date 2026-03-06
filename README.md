# 📝 PDF Editor by Puru Bhoite

A powerful, **100% browser-based** PDF text editor. Click on any text in a PDF to edit it inline — no server uploads, no sign-ups, completely free and unlimited.

🔗 **Live Demo:** [pdfbypuru.vercel.app](https://pdfbypuru.vercel.app)

---

## ✨ Features

- **Inline Text Editing** — Click any text in a PDF to edit it directly
- **Font Matching** — Uses the original PDF's embedded fonts for accurate rendering in the browser
- **Instant Preview** — See your edits immediately on the page
- **Download Edited PDF** — Export the modified PDF with all changes applied
- **Drag-to-Pan** — Click and drag to navigate zoomed-in PDFs
- **Mobile Responsive** — Works on phones, tablets, and desktops
- **Global Edit Counter** — Tracks total PDFs edited across all users
- **Feedback System** — Built-in feedback form for bug reports and suggestions
- **Privacy First** — All PDF processing happens locally in your browser. Your files never leave your device.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS, HTML, CSS |
| **PDF Rendering** | [PDF.js](https://mozilla.github.io/pdf.js/) |
| **PDF Export** | [pdf-lib](https://pdf-lib.js.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Backend** | Vercel Serverless Functions |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Hosting** | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com/) account (free tier works)
- A [Vercel](https://vercel.com/) account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pdf-editor.git
cd pdf-editor

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
```

> **Note:** The `.env` file is gitignored. API routes (`/api/*`) only work when deployed to Vercel.

### Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Global edit counter
CREATE TABLE analytics (
  id INT PRIMARY KEY,
  total_edits INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO analytics (id, total_edits) VALUES (1, 0);

-- User feedback
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'other',
  message TEXT NOT NULL,
  email VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📦 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository on [Vercel](https://vercel.com/new)
3. Add environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) in Project Settings → Environment Variables
4. Deploy — Vercel auto-detects Vite and the `/api` serverless functions

---

## 📁 Project Structure

```
pdf-editor/
├── api/                    # Vercel Serverless Functions
│   ├── count.js            # GET  /api/count     — fetch global edit count
│   ├── increment.js        # POST /api/increment — increment edit counter
│   └── feedback.js         # POST /api/feedback  — submit user feedback
├── lib/
│   └── supabase.js         # Supabase client singleton
├── src/
│   ├── main.js             # App entry point, UI wiring, event handlers
│   ├── pdfRenderer.js      # PDF.js loading, rendering, text extraction
│   ├── pdfExporter.js      # pdf-lib export with text replacement
│   ├── textOverlay.js      # Interactive text layer, inline editing
│   ├── fontMapper.js       # Font name parsing and mapping
│   └── styles.css          # All styles (dark theme, responsive, animations)
├── index.html              # Main HTML
├── vite.config.js          # Vite configuration
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature idea:

1. Open an [Issue](https://github.com/yourusername/pdf-editor/issues)
2. Or use the **💬 Feedback** button on the live site

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ by <strong>Puru Bhoite</strong>
</p>
