// js/pages/faculty-profile.js — SPARK Faculty Profile Initializer
import FacultyProfileWidget from '../widgets/FacultyProfile.js';

document.addEventListener('DOMContentLoaded', () => {
  const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || null;
  if (document.querySelector('.faculty-profile-page')) {
    new FacultyProfileWidget('.faculty-profile-page', apiBase);
  }
});
