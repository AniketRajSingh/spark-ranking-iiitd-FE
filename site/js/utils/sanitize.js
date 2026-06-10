// utils/sanitize.js — XSS prevention for SPARK
// Every API-sourced string rendered via innerHTML MUST go through escapeHTML().

/**
 * Escape a string for safe insertion into HTML.
 * Prevents XSS when interpolating API data into innerHTML templates.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
