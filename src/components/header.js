/**
 * header.js — Shared site header component
 */

import { navigate } from '../router.js';

export function createHeader(currentToolName = '') {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="header-left">
      <a href="#/" class="header-logo" id="header-logo">
        <span class="header-logo-icon">📄</span>
        <span class="header-logo-text">Puru <span class="logo-accent">PDF</span></span>
      </a>
      ${currentToolName ? `
        <div class="header-breadcrumb">
          <span class="header-breadcrumb-sep">›</span>
          <span class="header-breadcrumb-current">${currentToolName}</span>
        </div>
      ` : ''}
    </div>
    <div class="header-right">
      <button class="header-btn header-btn--accent" id="header-feedback-btn" title="Send Feedback">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Feedback</span>
      </button>
    </div>
  `;

  header.querySelector('#header-feedback-btn').addEventListener('click', () => {
    showFeedbackModal();
  });

  return header;
}

export function showFeedbackModal() {
  let modal = document.getElementById('feedback-modal-global');
  if (modal) { modal.classList.remove('hidden'); return; }

  modal = document.createElement('div');
  modal.id = 'feedback-modal-global';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="feedback-card">
      <div class="feedback-header">
        <h2 class="feedback-title">💬 Send Feedback</h2>
        <button class="feedback-close-btn" id="fb-close">&times;</button>
      </div>
      <p class="feedback-subtitle">Found a bug? Have a suggestion? Let us know!</p>
      <form id="fb-form">
        <div class="feedback-field">
          <label>Type</label>
          <div class="feedback-type-group">
            <label class="feedback-type-option"><input type="radio" name="type" value="bug" checked><span>🐛 Bug</span></label>
            <label class="feedback-type-option"><input type="radio" name="type" value="feature"><span>💡 Feature</span></label>
            <label class="feedback-type-option"><input type="radio" name="type" value="other"><span>💬 Other</span></label>
          </div>
        </div>
        <div class="feedback-field">
          <label for="fb-message">Message</label>
          <textarea id="fb-message" name="message" rows="4" placeholder="Describe the issue or suggestion..." required></textarea>
        </div>
        <div class="feedback-field">
          <label for="fb-email">Email (optional)</label>
          <input type="email" id="fb-email" name="email" placeholder="your@email.com">
        </div>
        <button type="submit" class="feedback-submit-btn" id="fb-submit">Send Feedback</button>
        <div id="fb-status" class="feedback-status"></div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.classList.add('hidden');
  modal.querySelector('#fb-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('#fb-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = modal.querySelector('#fb-submit');
    const status = modal.querySelector('#fb-status');
    btn.disabled = true; btn.textContent = 'Sending...';
    status.textContent = ''; status.className = 'feedback-status';

    const fd = new FormData(e.target);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: fd.get('type'), message: fd.get('message'), email: fd.get('email') }),
      });
      if (res.ok) {
        status.textContent = '✅ Thanks for your feedback!';
        status.className = 'feedback-status success';
        e.target.reset();
        setTimeout(close, 2000);
      } else throw new Error();
    } catch {
      status.textContent = '❌ Failed to send. Please try again.';
      status.className = 'feedback-status error';
    }
    btn.disabled = false; btn.textContent = 'Send Feedback';
  });
}
