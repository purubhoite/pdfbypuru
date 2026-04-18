/**
 * router.js — Lightweight hash-based SPA router
 */

const routes = {};
let currentCleanup = null;
let appContainer = null;
let currentPath = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function initRouter(container) {
  appContainer = container;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  if (hash === currentPath) return;
  currentPath = hash;

  if (currentCleanup) {
    try { currentCleanup(); } catch (e) { console.warn('Cleanup error:', e); }
    currentCleanup = null;
  }

  const route = routes[hash];
  if (route) {
    appContainer.innerHTML = '';
    window.scrollTo(0, 0);
    try {
      currentCleanup = route(appContainer) || null;
    } catch (e) {
      console.error('Route error:', e);
      appContainer.innerHTML = `<div style="padding:80px 24px;text-align:center;color:var(--text-muted)">
        <h2 style="color:var(--text-white);margin-bottom:8px">Something went wrong</h2>
        <p>This tool encountered an error. <a href="#/">Go back home</a></p>
      </div>`;
    }
  } else {
    appContainer.innerHTML = `<div style="padding:80px 24px;text-align:center;color:var(--text-muted)">
      <h2 style="color:var(--text-white);margin-bottom:8px">Page Not Found</h2>
      <p><a href="#/">Go back home</a></p>
    </div>`;
  }
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return currentPath;
}
