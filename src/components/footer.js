/**
 * footer.js — Shared site footer component
 */

export function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-content">
      <div class="footer-brand">Made with <span class="heart">❤️</span> by <strong>Puru Bhoite</strong></div>
      <div class="footer-privacy">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Your files never leave your device — all processing happens in your browser
      </div>
    </div>
  `;
  return footer;
}
