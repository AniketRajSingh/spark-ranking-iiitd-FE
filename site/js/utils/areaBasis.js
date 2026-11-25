// utils/areaBasis.js — Area basis parameter resolution for SPARK
// Single source of truth for ?basis= parameter handling across all scoring endpoints.

const STORAGE_KEY = 'spark.areaBasis';
const VALID_BASES = new Set(['venue', 'title']);

/**
 * Returns 'venue' or 'title' if the user explicitly chose one, otherwise null.
 * Priority:
 *   1. Page URL query parameter (?basis=venue | ?basis=title)
 *   2. Local storage key 'spark.areaBasis'
 *   3. null (let server default apply)
 * Any invalid / nonsense value is ignored (returns null).
 * @returns {'venue'|'title'|null}
 */
export function getRequestedBasis() {
  // 1. Check URL query params first
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlBasis = params.get('basis');
      if (urlBasis && VALID_BASES.has(urlBasis)) {
        return urlBasis;
      }
    } catch (_) {}
  }

  // 2. Check localStorage key 'spark.areaBasis'
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_BASES.has(stored)) {
        return stored;
      }
    } catch (_) {}
  }

  // 3. Server default
  return null;
}

/**
 * Appends basis=<value> to an API URL only when getRequestedBasis() is not null.
 * With no user choice, returns the URL unchanged so the server default applies.
 * @param {string} url
 * @returns {string}
 */
export function withBasis(url) {
  if (!url) return url;
  const basis = getRequestedBasis();
  if (!basis) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}basis=${encodeURIComponent(basis)}`;
}

/**
 * Reads any basis explicitly stored in localStorage.
 * @returns {'venue'|'title'|null}
 */
export function getStoredBasis() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_BASES.has(stored)) {
        return stored;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Sets or clears the stored basis in localStorage.
 * @param {'venue'|'title'|null} basis
 */
export function setStoredBasis(basis) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (basis && VALID_BASES.has(basis)) {
        window.localStorage.setItem(STORAGE_KEY, basis);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }
}
