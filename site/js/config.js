// config.js — SPARK Frontend Configuration
// Reads API_BASE from window.__ENV__ (set by env.js, which is gitignored).
// Never hardcode IP addresses or credentials here.

(function () {
  const env = window.__ENV__ || {};
  const apiBase = env.API_BASE || null;

  if (!apiBase) {
    console.warn(
      '[SPARK] API_BASE is not configured. ' +
      'Copy env.template.js → env.js and set your backend URL.'
    );
  }

  window.SPARK_CONFIG = {
    API_BASE: apiBase,
  };
})();
