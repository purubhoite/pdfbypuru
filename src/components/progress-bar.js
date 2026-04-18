/**
 * progress-bar.js — Animated progress bar component
 */

export function createProgressBar() {
  const container = document.createElement('div');
  container.className = 'progress-container';
  container.innerHTML = `
    <div class="progress-percent">0%</div>
    <div class="progress-bar-wrapper">
      <div class="progress-bar-fill" style="width: 0%"></div>
    </div>
    <div class="progress-text">Processing...</div>
  `;

  const fill = container.querySelector('.progress-bar-fill');
  const pctText = container.querySelector('.progress-percent');
  const statusText = container.querySelector('.progress-text');

  return {
    element: container,
    setProgress(pct, text) {
      const p = Math.round(pct * 100);
      fill.style.width = `${p}%`;
      pctText.textContent = `${p}%`;
      if (text) statusText.textContent = text;
    },
  };
}

/**
 * download-button.js — Large download CTA button
 */

export function createDownloadButton(onClick) {
  const btn = document.createElement('button');
  btn.className = 'download-btn-large';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Download
  `;
  btn.addEventListener('click', onClick);
  return btn;
}
