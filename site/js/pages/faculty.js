// js/pages/faculty.js — SPARK Faculty Page Initializer
import fetchJSON from '../utils/fetchJSON.js';
import { renderSkeleton, renderErrorCard } from '../utils/errorCard.js';
import { groupAreasByBroadCategory, expandToSubCodes } from '../utils/areaTaxonomy.js';
import FilterWidget from '../widgets/Filter.js';
import FacultyListWidget from '../widgets/FacultyList.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || null;
  const listContainer = document.getElementById('faculty-listing');

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

  // ── Build URLSearchParams expanding broad IDs → raw sub-codes ──────────
  function buildFilterParams(filters, groupedAreas) {
    const params = new URLSearchParams();
    if (filters.startYear) params.set('start_year', String(filters.startYear));
    if (filters.endYear)   params.set('end_year',   String(filters.endYear));
    if (filters.areas && filters.areas.size > 0) {
      const subCodes = expandToSubCodes(filters.areas, groupedAreas);
      if (subCodes.length > 0) params.set('area', subCodes.join(','));
    }
    return params;
  }

  const groupedAreas = await loadGroupedAreas();
  const filterWidget = new FilterWidget('filter-panel', {
    areas: groupedAreas,
    startYear: 2015,
    endYear: new Date().getFullYear(),
  });

  if (!apiBase) {
    renderErrorCard(listContainer,
      'No API configured. Copy env.template.js → env.js and fill in your API_BASE.',
      null
    );
    return;
  }

  let facultyList = null;

  const fetchAndRender = async (filters) => {
    renderSkeleton(listContainer);
    try {
      const params = buildFilterParams(filters, groupedAreas);
      const serverData = await fetchJSON(`${apiBase}/rankings/?${params}`);
      if (!serverData) throw new Error('Failed to load rankings data');
      
      if (facultyList) {
        facultyList.serverTopData = serverData;
        facultyList.filters = filters;
        facultyList.render();
      } else {
        facultyList = new FacultyListWidget('faculty-listing', filters, serverData);
      }
    } catch (e) {
      console.error('[SPARK] faculty rankings error:', e.message);
      renderErrorCard(listContainer,
        'Could not load faculty rankings.',
        () => fetchAndRender(filterWidget.getState())
      );
    }
  };

  document.addEventListener('filtersChanged', e => fetchAndRender(e.detail));
  fetchAndRender(filterWidget.getState());
});
