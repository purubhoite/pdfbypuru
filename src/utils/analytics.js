/**
 * analytics.js — Global counter + Vercel analytics
 * 
 * Counter strategy:
 * 1. Try fetching from Supabase via /api/count (production, Vercel)
 * 2. Fall back to localStorage counter (works everywhere)
 * 3. Always increment localStorage on every tool use
 * 4. Sync localStorage → Supabase when API is available
 */

import { inject } from '@vercel/analytics';

let initialized = false;
const LOCAL_KEY = 'puru_pdf_counter';

export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  try { inject(); } catch (e) { /* analytics optional */ }
}

/**
 * Get the local counter value from localStorage.
 */
function getLocalCount() {
  try {
    return parseInt(localStorage.getItem(LOCAL_KEY) || '0', 10);
  } catch (e) {
    return 0;
  }
}

/**
 * Set the local counter value.
 */
function setLocalCount(count) {
  try {
    localStorage.setItem(LOCAL_KEY, String(count));
  } catch (e) { /* storage full or disabled */ }
}

/**
 * Fetch the global counter — tries API first, falls back to localStorage.
 * Returns the higher of the two values (in case local got ahead while offline).
 */
export async function fetchGlobalCounter() {
  const localCount = getLocalCount();

  try {
    const res = await fetch('/api/count');
    if (res.ok) {
      const data = await res.json();
      const serverCount = data.totalEdits || 0;
      // Keep the higher value — local might have incremented while API was down
      const best = Math.max(serverCount, localCount);
      setLocalCount(best);
      return best;
    }
  } catch (e) {
    // API not available (local dev, network error, etc.)
  }

  // Return local count if API failed
  return localCount;
}

/**
 * Increment the global counter — increments locally immediately,
 * then tries to sync with the server.
 */
export async function incrementGlobalCounter() {
  // Always increment locally first (instant, always works)
  const newLocal = getLocalCount() + 1;
  setLocalCount(newLocal);

  // Try to increment on server too
  try {
    const res = await fetch('/api/increment', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const serverCount = data.totalEdits || 0;
      // Sync: keep the higher value
      const best = Math.max(serverCount, newLocal);
      setLocalCount(best);
      return best;
    }
  } catch (e) {
    // API not available, local increment is fine
  }

  return newLocal;
}
