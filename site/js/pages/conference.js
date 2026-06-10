// js/pages/conference.js — SPARK Conferences Page Initializer
import fetchJSON from '../utils/fetchJSON.js';
import { renderSkeleton, renderErrorCard } from '../utils/errorCard.js';
import { groupAreasByBroadCategory } from '../utils/areaTaxonomy.js';
import FilterWidget from '../widgets/Filter.js';
import ConferenceListWidget from '../widgets/ConferenceList.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || null;
  const listContainer = document.getElementById('conference-list');

  if (!listContainer) return;
  renderSkeleton(listContainer);

  // ── Fetch & group research areas from API ──────────────────────────────
  async function loadGroupedAreas() {
    let rawAreas = [];
    if (apiBase) {
      const data = await fetchJSON(`${apiBase}/areas/`);
      if (data) {
        rawAreas = Array.isArray(data) ? data : (data.results || data.areas || []);
      }
    }
    return groupAreasByBroadCategory(rawAreas);
  }

  const groupedAreas = await loadGroupedAreas();

  // Hide publication years filter block on filter widget for conferences
  const filterWidget = new FilterWidget('filter-panel', {
    areas: groupedAreas,
  });

  // Since FilterWidget includes year fields by default, let's hide the year fieldset on the conferences page
  const yearFieldset = document.querySelector('#filter-panel fieldset:nth-of-type(2)');
  if (yearFieldset) {
    yearFieldset.style.display = 'none';
    const hr = yearFieldset.previousElementSibling;
    if (hr && hr.tagName === 'HR') hr.style.display = 'none';
  }

  const conferenceListWidget = new ConferenceListWidget('conference-list');

  if (!apiBase) {
    renderErrorCard(listContainer,
      'No API configured. Copy env.template.js → env.js and fill in your API_BASE.',
      null
    );
    return;
  }

  const fetchAndRender = async () => {
    renderSkeleton(listContainer);
    try {
      const data = await fetchJSON(`${apiBase}/conferences/`);
      if (!data) throw new Error('Could not fetch conferences');
      const list = Array.isArray(data) ? data : (data.results || []);
      conferenceListWidget.setData(list);
      conferenceListWidget.setFilters(filterWidget.getState());
    } catch (e) {
      console.error('[SPARK] conferences error:', e.message);
      renderErrorCard(listContainer,
        'Could not load conferences.',
        () => fetchAndRender()
      );
    }
  };

  document.addEventListener('filtersChanged', e => {
    conferenceListWidget.setFilters(e.detail);
  });

  fetchAndRender();
});
