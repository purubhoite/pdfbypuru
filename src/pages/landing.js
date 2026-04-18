/**
 * landing.js — Landing page with tool grid
 */

import { navigate } from '../router.js';
import { updateSEO } from '../utils/seo.js';
import { fetchGlobalCounter } from '../utils/analytics.js';
import { createFooter } from '../components/footer.js';

const TOOLS = [
  { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDFs into one file', category: 'organize', icon: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h3M8 17h3"/><path d="M15 13h-1M15 17h-1"/>' },
  { id: 'split', name: 'Split PDF', desc: 'Extract specific pages from your PDF', category: 'organize', icon: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><path d="M10 17h4"/><path d="M12 15v4"/>' },
  { id: 'compress', name: 'Compress PDF', desc: 'Reduce PDF file size', category: 'optimize', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/>' },
  { id: 'rotate', name: 'Rotate Pages', desc: 'Rotate PDF pages in any direction', category: 'optimize', icon: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>' },
  { id: 'reorder', name: 'Reorder Pages', desc: 'Drag and drop to rearrange pages', category: 'organize', icon: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="6"/><line x1="10" y1="3" x2="12" y2="6"/><line x1="14" y1="21" x2="12" y2="18"/><line x1="14" y1="21" x2="16" y2="18"/>' },
  { id: 'delete-pages', name: 'Delete Pages', desc: 'Remove unwanted pages from PDF', category: 'organize', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/>' },
  { id: 'images-to-pdf', name: 'Images to PDF', desc: 'Convert JPG, PNG images to PDF', category: 'convert', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
  { id: 'pdf-to-images', name: 'PDF to Images', desc: 'Export PDF pages as JPG or PNG', category: 'convert', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13l-2 2 2 2"/><path d="M14 13l2 2-2 2"/>' },
  { id: 'watermark', name: 'Add Watermark', desc: 'Add text watermark to your PDF', category: 'protect', icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>' },
  { id: 'edit-text', name: 'Edit PDF Text', desc: 'Click on any text to edit it inline', category: 'edit', icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
];

export function render(container) {
  updateSEO('/');

  const page = document.createElement('div');
  page.className = 'landing-page';

  page.innerHTML = `
    <section class="hero">
      <h1 class="hero-logo"><span style="color: var(--text-white)">Puru </span><span class="logo-accent">PDF</span></h1>
      <p class="hero-subtitle">Every PDF tool you need, right in your browser</p>
      <div class="hero-badges">
        <span class="hero-badge">🔒 100% Private</span>
        <span class="hero-badge">♾️ Unlimited & Free</span>
        <span class="hero-badge">⚡ Lightning Fast</span>
      </div>
      <div class="hero-counter">
        <span>🌍</span>
        <span><span id="landing-counter" class="counter-value">—</span> PDFs processed</span>
      </div>
    </section>

    <section class="tools-section">
      <h2 class="tools-section-title">All PDF Tools</h2>
      <div class="tools-grid" id="tools-grid"></div>
    </section>

    <section class="features-section">
      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-icon">🔒</div>
          <div class="feature-title">100% Private</div>
          <div class="feature-desc">Files never leave your device</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">♾️</div>
          <div class="feature-title">Unlimited Use</div>
          <div class="feature-desc">No daily limits or sign-ups</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <div class="feature-title">Lightning Fast</div>
          <div class="feature-desc">Client-side processing</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📱</div>
          <div class="feature-title">Works Everywhere</div>
          <div class="feature-desc">Desktop, tablet & mobile</div>
        </div>
      </div>
    </section>

    <div class="ad-slot" id="landing-ad"></div>
  `;

  // Render tool cards
  const grid = page.querySelector('#tools-grid');
  TOOLS.forEach((tool, i) => {
    const card = document.createElement('a');
    card.className = 'tool-card';
    card.href = `#/${tool.id}`;
    card.dataset.category = tool.category;
    card.style.animationDelay = `${0.4 + i * 0.05}s`;
    card.innerHTML = `
      <div class="tool-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tool.icon}</svg>
      </div>
      <div class="tool-card-content">
        <div class="tool-card-title">${tool.name}</div>
        <div class="tool-card-desc">${tool.desc}</div>
      </div>
    `;
    card.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(`/${tool.id}`);
    });
    grid.appendChild(card);
  });

  page.appendChild(createFooter());
  container.appendChild(page);

  // Fetch counter
  fetchGlobalCounter().then(count => {
    const el = page.querySelector('#landing-counter');
    if (el && count > 0) el.textContent = count.toLocaleString();
  });
}
