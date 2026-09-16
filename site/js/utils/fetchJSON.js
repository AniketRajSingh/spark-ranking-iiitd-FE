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
    if (!res.ok) {
      let errorDetail = '';
      try {
        const errorJson = await res.json();
        if (errorJson) {
          if (typeof errorJson === 'string') {
            errorDetail = errorJson;
          } else if (typeof errorJson === 'object') {
            errorDetail = Object.entries(errorJson)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join('; ');
          }
        }
      } catch (_) {
        // Non-JSON response body
      }
      const msg = errorDetail ? `HTTP ${res.status}: ${errorDetail}` : `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status;
      err.detail = errorDetail;
      throw err;
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn('[SPARK] fetchJSON timed out:', timeout, url);
    } else {
      console.warn('[SPARK] fetchJSON error:', url, err ? err.message : '');
    }
    return null;
  }
}
