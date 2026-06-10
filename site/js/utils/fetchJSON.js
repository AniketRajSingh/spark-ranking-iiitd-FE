// utils/fetchJSON.js — Shared HTTP utility for SPARK
// Single source of truth for all API calls; avoids the 4× duplication that existed before.

/**
 * Fetch JSON from a URL with an abort-controller timeout.
 * @param {string} url
 * @param {{ timeout?: number }} [opts]
 * @returns {Promise<any|null>} parsed JSON or null on failure
 */
export default async function fetchJSON(url, opts = {}) {
  const timeout = opts.timeout ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn(`[SPARK] fetchJSON timed out after ${timeout}ms →`, url);
    } else {
      console.warn('[SPARK] fetchJSON error →', url, err.message);
    }
    return null;
  }
}
