// js/pages/institution.js — SPARK Institution Profile Initializer
import InstitutionProfileWidget from '../widgets/InstitutionProfile.js';

document.addEventListener('DOMContentLoaded', () => {
  const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || null;
  if (document.querySelector('.institution-profile')) {
    new InstitutionProfileWidget('.institution-profile', apiBase);
  }
});
