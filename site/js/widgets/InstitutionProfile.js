// widgets/InstitutionProfile.js — SPARK Institution Profile
// Fetches from API by ?id= param. XSS-safe. No hardcoded IDs.
// Includes Chart.js visualizations for trends and area distributions,
// faculty search & pagination, and publications filtering & pagination.

import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { renderErrorCard } from '../utils/errorCard.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';
import { renderPaginationHTML, attachPaginationListeners } from './Pagination.js';

export default class InstitutionProfileWidget {
  constructor(containerSelector, apiBase) {
    this.container = document.querySelector(containerSelector);
    this.apiBase   = apiBase;

    // Faculty state
    this.facultyAll = [];
    this.facultySearchQuery = '';
    this.facultyPage = 1;
    this.facultyPageSize = 10;

    // Publication state
    this.pubAll = [];
    this.pubPage = 1;
    this.pubPageSize = 15;
    this.pubAreaFilter = 'all';
    this.pubCoreFilter = 'all';
    this.pubSearchQuery = '';

    // Chart instances
    this.trendsChartInstance = null;
    this.areasChartInstance = null;

    if (!this.container) return;
    this.init();
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const instId = params.get('id');

    if (!instId) {
      this.container.innerHTML = `
        <div class="error-card bg-red-50 border border-red-100 rounded-xl p-6 text-center" role="alert">
          <p class="text-sm font-medium text-red-700">No institution ID provided in the URL.</p>
        </div>`;
      return;
    }

    if (!this.apiBase) {
      renderErrorCard(this.container, 'No API configured. Set API_BASE in env.js.', null);
      return;
    }

    // Show skeleton loader
    this.container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div class="lg:col-span-2 space-y-6">
          <div class="card p-6 space-y-3">
            <div class="skeleton h-8 w-2/3 bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-1/3 bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-full bg-gray-200 rounded mt-4"></div>
          </div>
          <div class="card p-6 space-y-4">
            <div class="skeleton h-6 w-1/4 bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-full bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="card p-6 space-y-4">
            <div class="skeleton h-32 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>`;

    try {
      // Fetch in parallel: institution details, score trends, publications, and all faculty
      const [instData, trendsData, pubData, facData] = await Promise.all([
        fetchJSON(`${this.apiBase}/institutions/${instId}/`),
        fetchJSON(`${this.apiBase}/institutions/${instId}/trends/`),
        fetchJSON(`${this.apiBase}/publications/?institution=${instId}`),
        fetchJSON(`${this.apiBase}/faculty/`)
      ]);

      if (!instData) throw new Error('Empty institution response');

      // Publications
      const pubsList = Array.isArray(pubData) ? pubData : (pubData?.results || pubData?.publications || []);
      this.pubAll = pubsList;

      // Filter all faculty belonging to this institution
      const numInstId = Number(instId);
      const allFacultyList = Array.isArray(facData) ? facData : (facData?.results || []);
      const instFaculty = allFacultyList.filter(f => {
        const fi = f.institution;
        if (!fi) return false;
        return (typeof fi === 'object' ? fi.id === numInstId : Number(fi) === numInstId);
      });

      // If backend didn't have full list, fallback to top_faculty from institution object
      if (instFaculty.length === 0 && Array.isArray(instData.top_faculty)) {
        this.facultyAll = instData.top_faculty.map(f => ({
          id: f.id,
          name: f.name,
          score: f.score,
          designation: f.designation || '',
          department: f.department || ''
        }));
      } else {
        this.facultyAll = instFaculty;
      }

      const trends = Array.isArray(trendsData) ? trendsData : [];
      const areaScores = instData.area_breakdown || instData.area_scores || {};

      this.render(instData, trends, areaScores);
    } catch (e) {
      console.error('[SPARK] Institution fetch failed:', e);
      renderErrorCard(this.container, 'Could not load institution data.', () => this.init());
    }
  }

  render(data, trends, areaScores) {
    const name    = escapeHTML(data.name || 'Unknown Institution');
    const website = escapeHTML(data.website || '');
    const summary = escapeHTML(data.summary || data.description || 'No overview available.');
    const rank    = data.rank ? escapeHTML(data.rank) : null;
    const score   = data.score != null ? escapeHTML(Number(data.score).toFixed(2)) : null;

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    // Unique research areas present in publications
    const availableAreaCodes = new Set();
    this.pubAll.forEach(p => {
      if (p.area) availableAreaCodes.add(p.area);
    });

    const areaOptionsHTML = Array.from(availableAreaCodes).sort().map(code => {
      const broadId = AREA_TAXONOMY[code] || code;
      const bInfo = BROAD_AREAS.find(b => b.id === broadId);
      const label = bInfo ? bInfo.name : code;
      return `<option value="${escapeHTML(code)}">${escapeHTML(label)} (${escapeHTML(code)})</option>`;
    }).join('');

    this.container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column (Main Profile & Content) -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Profile Header -->
          <div class="card p-6">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div class="flex-1">
                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">${name}</h1>
                ${website ? `
                  <a href="${website}" target="_blank" rel="noopener noreferrer"
                     class="text-sm text-teal-600 hover:text-teal-800 hover:underline mt-2 inline-flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    ${website}
                  </a>` : ''}
                <p class="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">${summary}</p>
              </div>
              
              <!-- Stats -->
              ${rank || score ? `
                <div class="flex gap-4 sm:flex-col sm:items-end flex-shrink-0">
                  ${rank ? `
                    <div class="stat-card w-36 text-center bg-teal-50/50 border border-teal-100 rounded-xl p-3">
                      <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">National Rank</span>
                      <span class="text-2xl font-black text-teal-600 block mt-0.5">#${rank}</span>
                    </div>` : ''}
                  ${score ? `
                    <div class="stat-card w-36 text-center bg-teal-50/50 border border-teal-100 rounded-xl p-3 relative spark-tooltip-container">
                      <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">
                        SPARK Score
                        <a href="${prefix}pages/methodology.html#computing-scores" class="inline-flex items-center text-teal-500 hover:text-teal-700 ml-0.5" title="View Scoring Methodology">
                          <svg class="w-3.5 h-3.5 inline-block align-text-top" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
                          </svg>
                        </a>
                      </span>
                      <span class="text-2xl font-black text-teal-600 block mt-0.5">${score}</span>

                      <!-- Hover Popup -->
                      <div class="spark-tooltip-box absolute right-0 top-full mt-2 w-72 p-3 bg-white text-gray-700 text-xs rounded-xl shadow-xl border border-teal-200 z-50 text-left">
                        <span class="font-bold text-teal-900 block border-b pb-1 mb-1">Geometric Mean Score</span>
                        <div class="bg-teal-50 p-1.5 rounded font-mono text-center font-bold text-teal-950 my-1">
                          Score = &prod; (S<sub>a</sub>)<sup>1 / |A<sub>pos</sub>|</sup>
                        </div>
                        <p class="text-[11px] text-gray-600">Rewards balanced research across distinct positive areas.</p>
                      </div>
                    </div>` : ''}
                </div>` : ''}
            </div>
          </div>

          <!-- Faculty of Institution Section -->
          <div class="card p-0 overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
              <div>
                <h2 class="text-lg font-bold text-gray-800">Faculty Members</h2>
                <p class="text-xs text-gray-400 mt-0.5">Faculty affiliated with ${name}</p>
              </div>
              
              <!-- Faculty Search Bar -->
              <div class="relative w-full sm:w-64">
                <input
                  type="text"
                  id="inst-faculty-search"
                  placeholder="Search faculty by name..."
                  value="${escapeHTML(this.facultySearchQuery)}"
                  class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>

            <!-- Faculty List -->
            <div id="inst-faculty-container">
              <!-- Rendered via _renderFacultyList() -->
            </div>
          </div>

          <!-- Publications Listing Section -->
          <div class="card p-0 overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
              <div>
                <h2 class="text-lg font-bold text-gray-800">Publications</h2>
                <p class="text-xs text-gray-400 mt-0.5">Peer-reviewed conference & journal publications</p>
              </div>

              <!-- Filter & Search Controls for Publications -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Search pub title -->
                <div class="relative">
                  <input
                    type="text"
                    id="inst-pub-search"
                    placeholder="Search titles..."
                    value="${escapeHTML(this.pubSearchQuery)}"
                    class="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>

                <!-- Area filter dropdown -->
                <select id="inst-pub-area-filter" class="text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="all">All Areas</option>
                  ${areaOptionsHTML}
                </select>

                <!-- CORE rank filter dropdown -->
                <select id="inst-pub-core-filter" class="text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="all">All CORE Ranks</option>
                  <option value="A*">CORE A*</option>
                  <option value="A">CORE A</option>
                </select>
              </div>
            </div>

            <div id="inst-pubs-container">
              <!-- Rendered via _renderPublications() -->
            </div>
          </div>

        </div>

        <!-- Right Column (Charts & Stats) -->
        <div class="space-y-6">

          <!-- Trends Chart -->
          <div class="card p-6">
            <h2 class="text-base font-bold text-gray-800 mb-1">Score Trends</h2>
            <p class="text-xs text-gray-400 mb-4">Historical weighted publication score over time</p>
            <div class="relative w-full" style="min-height: 220px; height: 220px;">
              <canvas id="trends-chart"></canvas>
            </div>
          </div>

          <!-- Research Area Distribution Chart -->
          <div class="card p-6">
            <h2 class="text-base font-bold text-gray-800 mb-1">Area Breakdown</h2>
            <p class="text-xs text-gray-400 mb-4">Weighted points across CS sub-disciplines</p>
            <div class="relative w-full" style="min-height: 280px; height: 280px;">
              <canvas id="areas-chart"></canvas>
            </div>
          </div>

        </div>

      </div>
    `;

    this._attachFilterListeners();
    this._renderFacultyList();
    this._renderPublications();

    // Map raw area codes in areaScores to broad area names
    const mappedAreaScores = {};
    Object.entries(areaScores || {}).forEach(([key, val]) => {
      const broadId = AREA_TAXONOMY[key] || key;
      const areaInfo = BROAD_AREAS.find(b => b.id === broadId);
      const name = areaInfo ? areaInfo.name : broadId;
      mappedAreaScores[name] = (mappedAreaScores[name] || 0) + Number(val);
    });

    this._renderCharts(trends, mappedAreaScores);
  }

  _attachFilterListeners() {
    // Faculty search
    const facInput = this.container.querySelector('#inst-faculty-search');
    if (facInput) {
      facInput.addEventListener('input', (e) => {
        this.facultySearchQuery = e.target.value.trim().toLowerCase();
        this.facultyPage = 1;
        this._renderFacultyList();
      });
    }

    // Pub search
    const pubSearch = this.container.querySelector('#inst-pub-search');
    if (pubSearch) {
      pubSearch.addEventListener('input', (e) => {
        this.pubSearchQuery = e.target.value.trim().toLowerCase();
        this.pubPage = 1;
        this._renderPublications();
      });
    }

    // Pub area
    const pubArea = this.container.querySelector('#inst-pub-area-filter');
    if (pubArea) {
      pubArea.addEventListener('change', (e) => {
        this.pubAreaFilter = e.target.value;
        this.pubPage = 1;
        this._renderPublications();
      });
    }

    // Pub core rank
    const pubCore = this.container.querySelector('#inst-pub-core-filter');
    if (pubCore) {
      pubCore.addEventListener('change', (e) => {
        this.pubCoreFilter = e.target.value;
        this.pubPage = 1;
        this._renderPublications();
      });
    }
  }

  _renderFacultyList() {
    const container = this.container.querySelector('#inst-faculty-container');
    if (!container) return;

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    let list = this.facultyAll;
    if (this.facultySearchQuery) {
      list = list.filter(f => (f.name || '').toLowerCase().includes(this.facultySearchQuery));
    }

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / this.facultyPageSize);
    if (this.facultyPage > totalPages && totalPages > 0) this.facultyPage = totalPages;

    if (totalItems === 0) {
      container.innerHTML = `
        <div class="py-10 text-center text-gray-400 text-xs">
          No faculty found matching "${escapeHTML(this.facultySearchQuery)}"
        </div>`;
      return;
    }

    const startIdx = (this.facultyPage - 1) * this.facultyPageSize;
    const pageItems = list.slice(startIdx, startIdx + this.facultyPageSize);

    const itemsHTML = pageItems.map((f, idx) => {
      const globalRank = startIdx + idx + 1;
      const score = Number(f.score || 0).toFixed(2);
      return `
        <li class="flex items-center justify-between py-3 px-5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
          <div class="flex items-center gap-3">
            <span class="w-6 text-xs text-gray-400 font-mono font-medium">${globalRank}</span>
            <div>
              <a href="${prefix}pages/faculty-profile.html?id=${escapeHTML(f.id)}"
                 class="text-sm font-semibold text-gray-800 hover:text-teal-600 hover:underline transition-colors">
                ${escapeHTML(f.name)}
              </a>
              ${f.designation ? `<p class="text-xs text-gray-400">${escapeHTML(f.designation)}</p>` : ''}
            </div>
          </div>
          <span class="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
            ${score} pts
          </span>
        </li>`;
    }).join('');

    const paginationHTML = renderPaginationHTML({
      currentPage: this.facultyPage,
      totalPages: totalPages,
      totalItems: totalItems,
      pageSize: this.facultyPageSize,
      idPrefix: 'inst-fac'
    });

    container.innerHTML = `
      <ul class="divide-y divide-gray-50">
        ${itemsHTML}
      </ul>
      ${paginationHTML}
    `;

    attachPaginationListeners(container, (newPage) => {
      this.facultyPage = newPage;
      this._renderFacultyList();
    }, 'inst-fac');
  }

  _renderPublications() {
    const container = this.container.querySelector('#inst-pubs-container');
    if (!container) return;

    let list = this.pubAll;

    // Filter by area
    if (this.pubAreaFilter !== 'all') {
      list = list.filter(p => p.area === this.pubAreaFilter);
    }

    // Filter by CORE rank
    if (this.pubCoreFilter !== 'all') {
      list = list.filter(p => {
        const rank = p.core_rank || (p.conference && p.conference.core_rank);
        return rank === this.pubCoreFilter;
      });
    }

    // Filter by Search query
    if (this.pubSearchQuery) {
      list = list.filter(p => (p.title || '').toLowerCase().includes(this.pubSearchQuery));
    }

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / this.pubPageSize);
    if (this.pubPage > totalPages && totalPages > 0) this.pubPage = totalPages;

    if (totalItems === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400 text-xs">
          No publications match the current filters.
        </div>`;
      return;
    }

    const startIdx = (this.pubPage - 1) * this.pubPageSize;
    const pageItems = list.slice(startIdx, startIdx + this.pubPageSize);

    const pubsHTML = pageItems.map(p => {
      const title = escapeHTML(p.title || '');
      const year  = escapeHTML(p.year  || '');
      const conf  = escapeHTML(p.conference?.acronym || p.conference || p.venue || '');
      const core  = escapeHTML(p.core_rank || (p.conference && p.conference.core_rank) || '');
      let coreBadge = '';
      if (core && core !== 'Unknown') {
        coreBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0
            ${core === 'A*' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'}">
            CORE ${core}
          </span>`;
      } else if (conf) {
        const fullName = escapeHTML(p.conference?.full_name || '');
        const isTrans = conf.toLowerCase().includes('trans') || fullName.toLowerCase().includes('transactions');
        const isJournal = conf.toLowerCase().includes('journal') || conf.toLowerCase().includes('commu') || fullName.toLowerCase().includes('letters');
        if (isTrans) {
          coreBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 bg-slate-100 text-slate-700">
                        Transaction
                      </span>`;
        } else if (isJournal) {
          coreBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 bg-slate-100 text-slate-700">
                        Journal
                      </span>`;
        }
      }

      // FoR area badge
      const broadId = AREA_TAXONOMY[p.area] || p.area;
      const bInfo = BROAD_AREAS.find(b => b.id === broadId);
      const areaName = bInfo ? bInfo.name : p.area;

      return `
        <li class="py-3 px-5 border-b border-gray-50 last:border-0 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
          <div class="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            ${coreBadge}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-gray-800 leading-snug">${title}</h4>
            <div class="flex items-center gap-2 text-xs text-gray-400 mt-1">
              ${conf ? `<span class="font-medium text-teal-600">${conf}</span> · ` : ''}
              <span>${year}</span>
              ${areaName ? ` · <span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">${escapeHTML(areaName)}</span>` : ''}
            </div>
          </div>
        </li>`;
    }).join('');

    const paginationHTML = renderPaginationHTML({
      currentPage: this.pubPage,
      totalPages: totalPages,
      totalItems: totalItems,
      pageSize: this.pubPageSize,
      idPrefix: 'inst-pub'
    });

    container.innerHTML = `
      <ul class="divide-y divide-gray-50">
        ${pubsHTML}
      </ul>
      ${paginationHTML}
    `;

    attachPaginationListeners(container, (newPage) => {
      this.pubPage = newPage;
      this._renderPublications();
    }, 'inst-pub');
  }

  _renderCharts(trends, areaScores) {
    if (typeof Chart === 'undefined') {
      console.warn('[SPARK] Chart.js is not loaded.');
      return;
    }

    if (this.trendsChartInstance) {
      this.trendsChartInstance.destroy();
      this.trendsChartInstance = null;
    }

    if (this.areasChartInstance) {
      this.areasChartInstance.destroy();
      this.areasChartInstance = null;
    }

    // 1. Trends Line Chart
    const trendsCanvas = this.container.querySelector('#trends-chart');
    if (trendsCanvas && trends.length > 0) {
      const sortedTrends = [...trends].sort((a, b) => a.year - b.year);
      this.trendsChartInstance = new Chart(trendsCanvas, {
        type: 'line',
        data: {
          labels: sortedTrends.map(t => t.year),
          datasets: [{
            label: 'Weighted Score',
            data: sortedTrends.map(t => t.score),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: '#0d9488',
            pointRadius: 3,
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Score: ${ctx.parsed.y}`
              }
            }
          },
          scales: {
            y: {
              grid: { color: '#f3f4f6' },
              ticks: { color: '#9ca3af', font: { size: 10 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af', font: { size: 10 } }
            }
          }
        }
      });
    }

    // 2. Area Bar Chart
    const areasCanvas = this.container.querySelector('#areas-chart');
    if (areasCanvas && areaScores && Object.keys(areaScores).length > 0) {
      // Sort areas by score descending
      const sortedEntries = Object.entries(areaScores).sort((a, b) => b[1] - a[1]);
      const labels = sortedEntries.map(e => e[0]);
      const data = sortedEntries.map(e => Number(e[1].toFixed(2)));

      this.areasChartInstance = new Chart(areasCanvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: 'rgba(13, 148, 136, 0.8)',
            hoverBackgroundColor: 'rgba(13, 148, 136, 1.0)',
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Score: ${ctx.parsed.x} pts`
              }
            }
          },
          scales: {
            x: {
              grid: { color: '#f3f4f6' },
              ticks: { color: '#9ca3af', font: { size: 10 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#374151', font: { size: 10, weight: '500' } }
            }
          }
        }
      });
    }
  }
}
