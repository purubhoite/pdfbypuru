/**
 * analytics.js — Global counter + Vercel analytics
 */

import { inject } from '@vercel/analytics';

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  try { inject(); } catch (e) { /* analytics optional */ }
}

export async function fetchGlobalCounter() {
  try {
    const res = await fetch('/api/count');
    if (res.ok) {
      const data = await res.json();
      return data.totalEdits || 0;
    }
  } catch (e) { /* non-critical */ }
  return 0;
}

export async function incrementGlobalCounter() {
  try {
    const res = await fetch('/api/increment', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return data.totalEdits || 0;
    }
  } catch (e) { /* non-critical */ }
  return 0;
}
