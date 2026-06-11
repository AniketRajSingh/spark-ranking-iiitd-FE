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

  let rawFaculty = [];
  let rawPublications = [];
  let facultyList = null;
  let currentSearchQuery = '';

  const computeAndRender = () => {
    if (rawFaculty.length === 0) return;

    const filters = filterWidget.getState();
    const currentYear = new Date().getFullYear();
    const isDefault = filters.startYear === 2015 &&
                      filters.endYear === currentYear &&
                      (!filters.areas || filters.areas.size === 0);

    // Build publication map for fast lookup
    const pubMap = new Map();
    rawPublications.forEach(p => pubMap.set(p.id, p));

    // Calculate dynamic scores based on filters
    let calculatedFaculty = rawFaculty.map(f => {
      let score = 0;
      (f.authorships || []).forEach(auth => {
        const pub = pubMap.get(auth.publication_id);
        if (pub) {
          // Check year
          const yearMatch = pub.year >= filters.startYear && pub.year <= filters.endYear;
          // Check area
          const rawCode = pub.conference ? pub.conference.area : null;
          const broadArea = AREA_TAXONOMY[rawCode];
          const areaMatch = !filters.areas || filters.areas.size === 0 || filters.areas.has(broadArea);

          if (yearMatch && areaMatch) {
            // Get weight
            let weight = 0;
            const rank = pub.core_rank || (pub.conference && pub.conference.core_rank);
            if (rank === 'A*') {
              weight = 4;
            } else if (rank === 'A') {
              weight = 2;
            }
            score += (auth.credit || 0) * weight;
          }
        }
      });
      return {
        ...f,
        score: isDefault ? (f.score || 0) : score
      };
    });

    // Filter by search query if any
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      calculatedFaculty = calculatedFaculty.filter(f =>
        (f.name || f.faculty_name || '').toLowerCase().includes(q)
      );
    }

    // Filter out 0 scores ONLY if NOT default state
    if (!isDefault) {
      calculatedFaculty = calculatedFaculty.filter(f => (f.score || 0) > 0);
    }

    if (facultyList) {
      facultyList.serverTopData = calculatedFaculty;
      facultyList.filters = filters;
      facultyList.searchQuery = currentSearchQuery;
      facultyList.render();
    } else {
      facultyList = new FacultyListWidget('faculty-listing', filters, calculatedFaculty, currentSearchQuery);
    }
  };

  const loadData = async () => {
    renderSkeleton(listContainer);
    try {
      const [facultyData, publicationsData] = await Promise.all([
        fetchJSON(`${apiBase}/faculty/`),
        fetchJSON(`${apiBase}/publications/`)
      ]);
      if (!facultyData || !publicationsData) {
        throw new Error('Failed to load initial data');
      }
      rawFaculty = Array.isArray(facultyData) ? facultyData : (facultyData.results || facultyData.faculty || []);
      rawPublications = Array.isArray(publicationsData) ? publicationsData : (publicationsData.results || []);

      computeAndRender();
    } catch (e) {
      console.error('[SPARK] Initial load error:', e.message);
      renderErrorCard(listContainer,
        'Could not load faculty data or publications.',
        () => loadData()
      );
    }
  };

  document.addEventListener('filtersChanged', e => {
    computeAndRender();
  });

  new SearchBarWidget('search-bar-container', {
    placeholder: 'Search faculty by name…',
    onSearch: (q) => {
      currentSearchQuery = q;
      computeAndRender();
    }
  });

  loadData();
});
