// js/pages/faculty.js — SPARK Faculty Page Initializer
import fetchJSON from '../utils/fetchJSON.js';
import { renderSkeleton, renderErrorCard } from '../utils/errorCard.js';
import { groupAreasByBroadCategory, expandToSubCodes, AREA_TAXONOMY } from '../utils/areaTaxonomy.js';
import FilterWidget from '../widgets/Filter.js';
import FacultyListWidget from '../widgets/FacultyList.js';
import SearchBarWidget from '../widgets/SearchBar.js';


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
    if (filters.rank && filters.rank !== 'all') params.set('rank', filters.rank);
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
  let currentSearchQuery = '';

  const loadAndRender = async () => {
    renderSkeleton(listContainer);
    try {
      const filters = filterWidget.getState();
      const params = buildFilterParams(filters, groupedAreas);
      if (currentSearchQuery) {
        params.set('search', currentSearchQuery);
      }

      const facultyData = await fetchJSON(`${apiBase}/faculty/?${params.toString()}`);
      if (!facultyData) {
        throw new Error('Failed to load faculty data');
      }

      let facultyItems = Array.isArray(facultyData) ? facultyData : (facultyData.results || facultyData.faculty || []);

      // Filter out zero scores if filters are active (non-default state)
      const currentYear = new Date().getFullYear();
      const isDefault = filters.startYear === 2015 &&
                        filters.endYear === currentYear &&
                        (!filters.rank || filters.rank === 'all') &&
                        (!filters.areas || filters.areas.size === 0);

      if (!isDefault) {
        facultyItems = facultyItems.filter(f => (f.score || 0) > 0);
      }

      if (facultyList) {
        facultyList.serverTopData = facultyItems;
        facultyList.filters = filters;
        facultyList.searchQuery = currentSearchQuery;
        facultyList.page = 1; // Reset to page 1 on filter/search change
        facultyList.render();
      } else {
        facultyList = new FacultyListWidget('faculty-listing', filters, facultyItems, currentSearchQuery);
      }
    } catch (e) {
      console.error('[SPARK] Faculty load error:', e.message);
      renderErrorCard(listContainer,
        'Could not load faculty data.',
        () => loadAndRender()
      );
    }
  };

  document.addEventListener('filtersChanged', e => {
    loadAndRender();
  });

  new SearchBarWidget('search-bar-container', {
    placeholder: 'Search faculty by name…',
    onSearch: (q) => {
      currentSearchQuery = q;
      loadAndRender();
    }
  });

  loadAndRender();
});
