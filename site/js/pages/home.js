// js/pages/home.js — SPARK Home Page Initializer
import fetchJSON from '../utils/fetchJSON.js';
import { renderSkeleton, renderErrorCard } from '../utils/errorCard.js';
import { groupAreasByBroadCategory, expandToSubCodes } from '../utils/areaTaxonomy.js';
import FilterWidget from '../widgets/Filter.js';
import RankingTableWidget from '../widgets/RankingTable.js';
import SearchBarWidget from '../widgets/SearchBar.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || null;
  const rankingTableEl = document.getElementById('ranking-table');

  if (!rankingTableEl) return;
  renderSkeleton(rankingTableEl);

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

  // ── Normalise rankings payload ─────────────────────────────────────────
  function normaliseRankings(payload) {
    if (!payload) return [];
    const raw = Array.isArray(payload)
      ? payload
      : (payload.institutions || payload.results || []);
    return raw.map(i => ({
      rank: i.rank,
      institution: (typeof i.institution === 'object' && i.institution !== null)
        ? i.institution
        : { id: i.institution_id || i.id || '', name: i.institution || i.name || '' },
      score: i.score,
    }));
  }

  // ── Update results count badge ─────────────────────────────────────────
  function setResultsCount(n) {
    const el = document.getElementById('results-count');
    if (el) el.textContent = n > 0 ? `${n} institutions` : '';
  }

  // ── Load Stats ─────────────────────────────────────────────────────────
  if (apiBase) {
    fetchJSON(`${apiBase}/stats/`).then(stats => {
      if (!stats) return;
      const fmt = n => n ? Number(n).toLocaleString() : '—';
      const si = document.getElementById('stat-institutions');
      const sf = document.getElementById('stat-faculty');
      const sp = document.getElementById('stat-pubs');
      if (si) si.textContent = fmt(stats.institutions || stats.institution_count);
      if (sf) sf.textContent = fmt(stats.faculty      || stats.faculty_count);
      if (sp) sp.textContent = fmt(stats.publications || stats.publication_count);
    });
  }

  // ── Load areas & init widgets ────────────────────────────────────────
  const groupedAreas = await loadGroupedAreas();
  const filterWidget = new FilterWidget('filter-panel', {
    areas: groupedAreas,
    startYear: 2015,
    endYear: new Date().getFullYear(),
  });
  const rankingTableWidget = new RankingTableWidget('ranking-table');

  if (!apiBase) {
    renderErrorCard(rankingTableEl,
      'No API configured. Copy env.template.js → env.js and fill in your API_BASE.',
      null
    );
    return;
  }

  // ── Fetch rankings ───────────────────────────────────────────────────
  const updateRankings = async (filters) => {
    renderSkeleton(rankingTableEl);
    setResultsCount(0);
    try {
      const activeFilters = filters || filterWidget.getState();
      const params = buildFilterParams(activeFilters, groupedAreas);
      const data = await fetchJSON(`${apiBase}/rankings/?${params}`);
      if (!data) throw new Error('Could not fetch rankings data');
      const normalised = normaliseRankings(data);

      // Filter out 0 scores only if filters are active (non-default state)
      const currentYear = new Date().getFullYear();
      const isDefault = activeFilters.startYear === 2015 &&
                        activeFilters.endYear === currentYear &&
                        (!activeFilters.areas || activeFilters.areas.size === 0);

      let finalData = normalised;
      if (!isDefault) {
        finalData = normalised.filter(item => {
          const scoreNum = parseFloat(item.score);
          return !isNaN(scoreNum) && scoreNum > 0;
        });
      }

      rankingTableWidget.setData(finalData);
      setResultsCount(finalData.length);
    } catch (e) {
      console.error('[SPARK] /rankings/ error:', e.message);
      renderErrorCard(rankingTableEl,
        'Could not load rankings. Check your network or backend.',
        () => updateRankings()
      );
    }
  };

  document.addEventListener('filtersChanged', e => updateRankings(e.detail));
  updateRankings();

  // ── Search bar ────────────────────────────────────────────────────────
  const performSearch = async (q) => {
    if (!q) {
      updateRankings();
      return;
    }
    renderSkeleton(rankingTableEl);
    setResultsCount(0);
    try {
      const payload = await fetchJSON(`${apiBase}/institutions/?search=${encodeURIComponent(q)}`);
      if (!payload) throw new Error('Search failed');
      const items = Array.isArray(payload) ? payload : (payload.results || []);
      
      // Client-side fallback filtering to guarantee correct results even if API ignores search param
      const filtered = items.filter(inst => 
        (inst.name || inst.institution_name || '').toLowerCase().includes(q.toLowerCase())
      );
      
      const data = filtered.map((inst, idx) => ({
        rank: idx + 1,
        institution: { id: inst.id, name: inst.name || inst.institution_name || '' },
        score: inst.score || inst.total_score || '—',
      }));
      rankingTableWidget.setData(data, q);
      setResultsCount(data.length);
    } catch (e) {
      renderErrorCard(rankingTableEl, 'Search failed. Try again.', () => performSearch(q));
    }
  };

  new SearchBarWidget('search-bar-container', {
    placeholder: 'Search institutions…',
    onSearch: performSearch
  });
});
