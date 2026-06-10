// js/pages/compare.js — SPARK Compare Page Initializer
import CompareWidget from '../widgets/CompareWidget.js';

document.addEventListener('DOMContentLoaded', () => {
  const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || null;
  if (document.getElementById('compare-widget-container')) {
    new CompareWidget('compare-widget-container', apiBase);
  }
});
