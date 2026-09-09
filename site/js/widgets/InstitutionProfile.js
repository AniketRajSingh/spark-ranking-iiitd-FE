// widgets/InstitutionProfile.js — SPARK Institution Profile
// Features:
// - Parallel API data fetching with error handling and fallback
// - Score trends line chart & area breakdown bar chart via Chart.js
// - Faculty filtering by research interest (combined 'AI & ML (All)' + FoR sub-areas),
//   conference venue, CORE rank (A*, A), and faculty name search with clean pagination
// - Publication filtering by research area, conference, CORE rank, and title search with clean pagination
// - Clean, responsive UI preserving the SPARK design system (.card p-6, uncrowded controls)

import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { renderErrorCard } from '../utils/errorCard.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';
import { renderPaginationHTML, attachPaginationListeners } from './Pagination.js';

// Hierarchical taxonomy structure for combined & sub-area filtering
const TAXONOMY_GROUPS = [
  {
    group: 'Artificial Intelligence & Machine Learning',
    options: [
      { value: 'ai:all', label: 'AI & ML (All)' },
      { value: '4601', label: 'Applied Computing (4601)' },
      { value: '4602', label: 'Artificial Intelligence (4602)' },
      { value: '4611', label: 'Machine Learning (4611)' },
    ]
  },
  {
    group: 'Computer Vision & Multimedia',
    options: [
      { value: 'vision:all', label: 'Computer Vision (4603)' },
    ]
  },
  {
    group: 'Cybersecurity & Privacy',
    options: [
      { value: 'security:all', label: 'Cybersecurity & Privacy (4604)' },
    ]
  },
  {
    group: 'Data Management & Databases',
    options: [
      { value: 'data:all', label: 'Data & Databases (All)' },
      { value: '4605', label: 'Data Management & Science (4605)' },
    ]
  },
  {
    group: 'Systems & Distributed Computing',
    options: [
      { value: 'systems:all', label: 'Systems & OS (All)' },
      { value: '4606', label: 'Distributed Systems & OS (4606)' },
      { value: 'CSE', label: 'Computer Systems (CSE)' },
    ]
  },
  {
    group: 'Theory & Software Engineering',
    options: [
      { value: 'theory:all', label: 'Theory & Languages (All)' },
      { value: '4612', label: 'Software Engineering (4612)' },
      { value: '4613', label: 'Theory of Computation (4613)' },
    ]
  },
  {
    group: 'Human-Centred Computing',
    options: [
      { value: 'hci:all', label: 'Human-Centred Computing (4608)' },
    ]
  },
  {
    group: 'Graphics & Augmented Reality',
    options: [
      { value: 'graphics:all', label: 'Graphics, AR & Games (4607)' },
    ]
  },
];

/**
 * Match a raw area code or array of area codes against the filter value.
 * Handles both broad combined filters ('ai:all') and specific FoR sub-codes ('4602').
 */
function matchesAreaFilter(itemAreaOrAreas, filterValue) {
  if (!filterValue || filterValue === 'all') return true;

  if (filterValue.endsWith(':all')) {
    const broadId = filterValue.split(':')[0];
    if (Array.isArray(itemAreaOrAreas)) {
      return itemAreaOrAreas.some(a => (AREA_TAXONOMY[a] || a) === broadId);
    }
    return (AREA_TAXONOMY[itemAreaOrAreas] || itemAreaOrAreas) === broadId;
  }

  // Specific FoR subfield code
  if (Array.isArray(itemAreaOrAreas)) {
    return itemAreaOrAreas.includes(filterValue);
  }
  return itemAreaOrAreas === filterValue;
}

export default class InstitutionProfileWidget {
  constructor(containerSelector, apiBase) {
    this.container = document.querySelector(containerSelector);
    this.apiBase   = apiBase;

    // Faculty filtering & pagination state
    this.facultyAll = [];
    this.facultySearchQuery = '';
    this.facultyAreaFilter = 'all';
    this.facultyConfFilter = 'all';
    this.facultyRankFilter = 'all';
    this.facultyPage = 1;
    this.facultyPageSize = 10;

    // Publication filtering & pagination state
    this.pubAll = [];
    this.pubSearchQuery = '';
    this.pubAreaFilter = 'all';
    this.pubConfFilter = 'all';
    this.pubCoreFilter = 'all';
    this.pubPage = 1;
    this.pubPageSize = 15;

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
        <div class="bg-red-50 border border-red-100 rounded-2xl p-6 text-center" role="alert">
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
          <div class="card p-6 space-y-3 bg-white rounded-2xl border border-gray-100">
            <div class="skeleton h-8 w-2/3 bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-1/3 bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-full bg-gray-200 rounded mt-4"></div>
          </div>
          <div class="card p-6 space-y-4 bg-white rounded-2xl border border-gray-100">
            <div class="skeleton h-6 w-1/4 bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-full bg-gray-200 rounded"></div>
            <div class="skeleton h-4 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="card p-6 space-y-4 bg-white rounded-2xl border border-gray-100">
            <div class="skeleton h-48 w-full bg-gray-200 rounded"></div>
          </div>
          <div class="card p-6 space-y-4 bg-white rounded-2xl border border-gray-100">
            <div class="skeleton h-64 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>`;

    try {
      // Fetch in parallel: institution details, score trends, publications, and faculty
      const [instData, trendsData, pubData, facData] = await Promise.all([
        fetchJSON(`${this.apiBase}/institutions/${instId}/`),
        fetchJSON(`${this.apiBase}/institutions/${instId}/trends/`),
        fetchJSON(`${this.apiBase}/publications/?institution=${instId}`),
        fetchJSON(`${this.apiBase}/faculty/`)
      ]);

      if (!instData) throw new Error('Empty institution response');

      // Publications list
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

      // Fallback to top_faculty from institution object if needed
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

      // Asynchronously fetch detailed faculty profiles (areas, venues, A*/A scores)
      this._enrichFacultyDetails();
    } catch (e) {
      console.error('[SPARK] Institution fetch failed:', e);
      renderErrorCard(this.container, 'Could not load institution data.', () => this.init());
    }
  }

  async _enrichFacultyDetails() {
    const toEnrich = this.facultyAll.filter(f => Number(f.score || 0) > 0);
    const batchSize = 12;

    for (let i = 0; i < toEnrich.length; i += batchSize) {
      const chunk = toEnrich.slice(i, i + batchSize);
      await Promise.all(chunk.map(async (fac) => {
        try {
          const detail = await fetchJSON(`${this.apiBase}/faculty/${fac.id}/`);
          if (detail) {
            fac.areas = detail.areas || [];
            fac.a_star_score = Number(detail.a_star_score || 0);
            fac.a_score = Number(detail.a_score || 0);

            // Extract venues & publication counts
            const venues = new Set();
            let hasJournal = false;
            (detail.authorships || []).forEach(a => {
              const pub = a.publication || {};
              const v = pub.venue || (typeof pub.conference === 'object' ? pub.conference.acronym : pub.conference);
              if (v) {
                venues.add(v);
                const vl = String(v).toLowerCase();
                if (vl.includes('journal') || vl.includes('trans') || vl.includes('commu') || vl.includes('letters')) {
                  hasJournal = true;
                }
              }
              const r = pub.core_rank || (typeof pub.conference === 'object' ? pub.conference.core_rank : '');
              if (r === 'Journal') hasJournal = true;
            });
            fac.venues = Array.from(venues);
            fac.pub_count = (detail.authorships || []).length;
            fac.has_journal = hasJournal;
          }
        } catch (err) {
          // ignore single detail failure
        }
      }));
    }

    // Refresh faculty list if filters are active
    this._renderFacultyList();
  }

  _buildAreaOptionsHTML() {
    // Generate optgroups with combined 'AI & ML (All)' + specific subfields
    return TAXONOMY_GROUPS.map(g => {
      const opts = g.options.map(opt =>
        `<option value="${escapeHTML(opt.value)}">${escapeHTML(opt.label)}</option>`
      ).join('');
      return `<optgroup label="${escapeHTML(g.group)}">${opts}</optgroup>`;
    }).join('');
  }

  _buildConferenceOptionsHTML() {
    const confSet = new Set();
    this.pubAll.forEach(p => {
      const acronym = p.conference?.acronym || p.conference || p.venue;
      if (acronym && typeof acronym === 'string' && acronym.trim()) {
        confSet.add(acronym.trim());
      }
    });
    return Array.from(confSet).sort().map(c =>
      `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join('');
  }

  render(data, trends, areaScores) {
    const name    = escapeHTML(data.name || 'Unknown Institution');
    const website = escapeHTML(data.website || '');
    const summary = escapeHTML(data.summary || data.description || 'No overview available.');
    const rank    = data.rank ? escapeHTML(data.rank) : null;
    const score   = data.score != null ? escapeHTML(Number(data.score).toFixed(2)) : null;

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    const areaOptionsHTML = this._buildAreaOptionsHTML();
    const confOptionsHTML = this._buildConferenceOptionsHTML();

    this.container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column (Main Profile, Faculty & Publications) -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Profile Header Card -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
              
              <!-- Key Stat Medals -->
              ${rank || score ? `
                <div class="flex gap-4 sm:flex-col sm:items-end flex-shrink-0">
                  ${rank ? `
                    <div class="stat-card w-36 text-center bg-teal-50/60 border border-teal-100 rounded-xl p-3">
                      <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">National Rank</span>
                      <span class="text-2xl font-black text-teal-600 block mt-0.5">#${rank}</span>
                    </div>` : ''}
                  ${score ? `
                    <div class="stat-card w-36 text-center bg-teal-50/60 border border-teal-100 rounded-xl p-3 relative spark-tooltip-container">
                      <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">
                        SPARK Score
                        <a href="${prefix}pages/methodology.html#computing-scores" class="inline-flex items-center text-teal-500 hover:text-teal-700 ml-0.5" title="View Scoring Methodology">
                          <svg class="w-3.5 h-3.5 inline-block align-text-top" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
                          </svg>
                        </a>
                      </span>
                      <span class="text-2xl font-black text-teal-600 block mt-0.5">${score}</span>

                      <!-- Hover Tooltip Popup -->
                      <div class="spark-tooltip-box absolute right-0 top-full mt-2 w-72 p-3 bg-white text-gray-700 text-xs rounded-xl shadow-xl border border-teal-200 z-50 text-left">
                        <span class="font-bold text-teal-900 block border-b pb-1 mb-1">Geometric Mean Score</span>
                        <div class="bg-teal-50 p-1.5 rounded font-mono text-center font-bold text-teal-950 my-1">
                          Score = &prod; (S<sub>a</sub>)<sup>1 / |A<sub>pos</sub>|</sup>
                        </div>
                        <p class="text-[11px] text-gray-600">Rewards balanced research across positive subfields.</p>
                      </div>
                    </div>` : ''}
                </div>` : ''}
            </div>
          </div>

          <!-- Faculty Members Section (Clean Card with Spacious Controls) -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 class="text-lg font-bold text-gray-800">Faculty Members</h2>
                <p class="text-xs text-gray-500 mt-0.5">Faculty affiliated with ${name}</p>
              </div>
              <span id="inst-faculty-count" class="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 self-start sm:self-auto">
                ${this.facultyAll.length} Faculty
              </span>
            </div>

            <!-- Filter Controls: Single unified line across desktop and laptop -->
            <div class="inst-filters-row">
              <!-- Search Faculty -->
              <div class="inst-filter-item inst-filter-search relative">
                <input
                  type="text"
                  id="inst-faculty-search"
                  placeholder="Search faculty name..."
                  value="${escapeHTML(this.facultySearchQuery)}"
                  class="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all"
                />
                <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>

              <!-- Research Area Filter -->
              <div class="inst-filter-item">
                <select id="inst-faculty-area-filter" class="w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all cursor-pointer truncate">
                  <option value="all">All Research Areas</option>
                  ${areaOptionsHTML}
                </select>
              </div>

              <!-- Conference Filter -->
              <div class="inst-filter-item">
                <select id="inst-faculty-conf-filter" class="w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all cursor-pointer truncate">
                  <option value="all">All Conferences</option>
                  ${confOptionsHTML}
                </select>
              </div>

              <!-- CORE Rank & Reset -->
              <div class="inst-filter-item inst-filter-rank flex items-center gap-1.5">
                <select id="inst-faculty-rank-filter" class="flex-1 min-w-0 px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all cursor-pointer truncate">
                  <option value="all">All CORE Ranks</option>
                  <option value="A*">CORE A* Only</option>
                  <option value="A">CORE A Only</option>
                  <option value="Journal">With Journals</option>
                </select>
                <button id="inst-faculty-clear-btn" class="px-2.5 py-2 text-xs font-medium text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors flex-shrink-0" title="Reset Filters">
                  Reset
                </button>
              </div>
            </div>

            <!-- Faculty Listing Container -->
            <div id="inst-faculty-container" class="pt-1">
              <!-- Rendered via _renderFacultyList() -->
            </div>
          </div>

          <!-- Publications Section (Clean Card with Spacious Controls) -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 class="text-lg font-bold text-gray-800">Publications</h2>
                <p class="text-xs text-gray-500 mt-0.5">Peer-reviewed conference & journal publications</p>
              </div>
              <span id="inst-pub-count" class="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 self-start sm:self-auto">
                ${this.pubAll.length} Publications
              </span>
            </div>

            <!-- Filter Controls: Single unified line across desktop and laptop -->
            <div class="inst-filters-row">
              <!-- Title Search -->
              <div class="inst-filter-item inst-filter-search relative">
                <input
                  type="text"
                  id="inst-pub-search"
                  placeholder="Search titles..."
                  value="${escapeHTML(this.pubSearchQuery)}"
                  class="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all"
                />
                <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>

              <!-- Research Area Filter -->
              <div class="inst-filter-item">
                <select id="inst-pub-area-filter" class="w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all cursor-pointer truncate">
                  <option value="all">All Research Areas</option>
                  ${areaOptionsHTML}
                </select>
              </div>

              <!-- Conference Filter -->
              <div class="inst-filter-item">
                <select id="inst-pub-conf-filter" class="w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all cursor-pointer truncate">
                  <option value="all">All Conferences</option>
                  ${confOptionsHTML}
                </select>
              </div>

              <!-- CORE Rank & Reset -->
              <div class="inst-filter-item inst-filter-rank flex items-center gap-1.5">
                <select id="inst-pub-core-filter" class="flex-1 min-w-0 px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all cursor-pointer truncate">
                  <option value="all">All CORE Ranks</option>
                  <option value="A*">CORE A* Only</option>
                  <option value="A">CORE A Only</option>
                  <option value="Journal">Journals & Trans.</option>
                </select>
                <button id="inst-pub-clear-btn" class="px-2.5 py-2 text-xs font-medium text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors flex-shrink-0" title="Reset Filters">
                  Reset
                </button>
              </div>
            </div>

            <!-- Publications Listing Container -->
            <div id="inst-pubs-container" class="pt-1">
              <!-- Rendered via _renderPublications() -->
            </div>
          </div>

        </div>

        <!-- Right Column (Charts & Visualizations) -->
        <div class="space-y-6">

          <!-- Trends Chart Card -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h2 class="text-base font-bold text-gray-800 mb-1">Score Trends</h2>
            <p class="text-xs text-gray-400 mb-4">Historical weighted publication score over time</p>
            <div class="relative w-full" style="min-height: 220px; height: 220px;">
              <canvas id="trends-chart"></canvas>
            </div>
          </div>

          <!-- Research Area Distribution Chart Card -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
      const bName = areaInfo ? areaInfo.name : broadId;
      mappedAreaScores[bName] = (mappedAreaScores[bName] || 0) + Number(val);
    });

    this._renderCharts(trends, mappedAreaScores);
  }

  _attachFilterListeners() {
    // ── Faculty Listeners ─────────────────────────────
    const facInput = this.container.querySelector('#inst-faculty-search');
    if (facInput) {
      facInput.addEventListener('input', (e) => {
        this.facultySearchQuery = e.target.value.trim().toLowerCase();
        this.facultyPage = 1;
        this._renderFacultyList();
      });
    }

    const facArea = this.container.querySelector('#inst-faculty-area-filter');
    if (facArea) {
      facArea.addEventListener('change', (e) => {
        this.facultyAreaFilter = e.target.value;
        this.facultyPage = 1;
        this._renderFacultyList();
      });
    }

    const facConf = this.container.querySelector('#inst-faculty-conf-filter');
    if (facConf) {
      facConf.addEventListener('change', (e) => {
        this.facultyConfFilter = e.target.value;
        this.facultyPage = 1;
        this._renderFacultyList();
      });
    }

    const facRank = this.container.querySelector('#inst-faculty-rank-filter');
    if (facRank) {
      facRank.addEventListener('change', (e) => {
        this.facultyRankFilter = e.target.value;
        this.facultyPage = 1;
        this._renderFacultyList();
      });
    }

    const facReset = this.container.querySelector('#inst-faculty-clear-btn');
    if (facReset) {
      facReset.addEventListener('click', () => {
        this.facultySearchQuery = '';
        this.facultyAreaFilter = 'all';
        this.facultyConfFilter = 'all';
        this.facultyRankFilter = 'all';
        this.facultyPage = 1;
        if (facInput) facInput.value = '';
        if (facArea) facArea.value = 'all';
        if (facConf) facConf.value = 'all';
        if (facRank) facRank.value = 'all';
        this._renderFacultyList();
      });
    }

    // ── Publications Listeners ─────────────────────────
    const pubSearch = this.container.querySelector('#inst-pub-search');
    if (pubSearch) {
      pubSearch.addEventListener('input', (e) => {
        this.pubSearchQuery = e.target.value.trim().toLowerCase();
        this.pubPage = 1;
        this._renderPublications();
      });
    }

    const pubArea = this.container.querySelector('#inst-pub-area-filter');
    if (pubArea) {
      pubArea.addEventListener('change', (e) => {
        this.pubAreaFilter = e.target.value;
        this.pubPage = 1;
        this._renderPublications();
      });
    }

    const pubConf = this.container.querySelector('#inst-pub-conf-filter');
    if (pubConf) {
      pubConf.addEventListener('change', (e) => {
        this.pubConfFilter = e.target.value;
        this.pubPage = 1;
        this._renderPublications();
      });
    }

    const pubCore = this.container.querySelector('#inst-pub-core-filter');
    if (pubCore) {
      pubCore.addEventListener('change', (e) => {
        this.pubCoreFilter = e.target.value;
        this.pubPage = 1;
        this._renderPublications();
      });
    }

    const pubReset = this.container.querySelector('#inst-pub-clear-btn');
    if (pubReset) {
      pubReset.addEventListener('click', () => {
        this.pubSearchQuery = '';
        this.pubAreaFilter = 'all';
        this.pubConfFilter = 'all';
        this.pubCoreFilter = 'all';
        this.pubPage = 1;
        if (pubSearch) pubSearch.value = '';
        if (pubArea) pubArea.value = 'all';
        if (pubConf) pubConf.value = 'all';
        if (pubCore) pubCore.value = 'all';
        this._renderPublications();
      });
    }
  }

  _renderFacultyList() {
    const container = this.container.querySelector('#inst-faculty-container');
    if (!container) return;

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    let list = [...this.facultyAll];

    // Filter by Search Query
    if (this.facultySearchQuery) {
      list = list.filter(f => (f.name || '').toLowerCase().includes(this.facultySearchQuery));
    }

    // Filter by Research Area / Interest
    if (this.facultyAreaFilter !== 'all') {
      list = list.filter(f => {
        if (!f.areas || f.areas.length === 0) return false;
        return matchesAreaFilter(f.areas, this.facultyAreaFilter);
      });
    }

    // Filter by Conference Venue
    if (this.facultyConfFilter !== 'all') {
      list = list.filter(f => {
        if (!f.venues || f.venues.length === 0) return false;
        return f.venues.includes(this.facultyConfFilter);
      });
    }

    // Filter and Sort by CORE Rank / Venue type
    if (this.facultyRankFilter === 'A*') {
      list = list.filter(f => (f.a_star_score != null ? f.a_star_score > 0 : Number(f.score || 0) > 0));
      list.sort((a, b) => (b.a_star_score ?? b.score ?? 0) - (a.a_star_score ?? a.score ?? 0));
    } else if (this.facultyRankFilter === 'A') {
      list = list.filter(f => (f.a_score != null ? f.a_score > 0 : Number(f.score || 0) > 0));
      list.sort((a, b) => (b.a_score ?? b.score ?? 0) - (a.a_score ?? a.score ?? 0));
    } else if (this.facultyRankFilter === 'Journal') {
      list = list.filter(f => f.has_journal);
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else {
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    // Update count badge
    const countBadge = this.container.querySelector('#inst-faculty-count');
    if (countBadge) countBadge.textContent = `${list.length} Faculty`;

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / this.facultyPageSize);
    if (this.facultyPage > totalPages && totalPages > 0) this.facultyPage = totalPages;

    if (totalItems === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400 text-sm">
          No faculty members match the selected filters.
        </div>`;
      return;
    }

    const startIdx = (this.facultyPage - 1) * this.facultyPageSize;
    const pageItems = list.slice(startIdx, startIdx + this.facultyPageSize);

    const itemsHTML = pageItems.map((f, idx) => {
      const globalRank = startIdx + idx + 1;
      let displayScore = Number(f.score || 0).toFixed(2);
      let scoreLabel = 'Total Score';
      if (this.facultyRankFilter === 'A*' && f.a_star_score != null) {
        displayScore = Number(f.a_star_score).toFixed(2);
        scoreLabel = 'CORE A*';
      } else if (this.facultyRankFilter === 'A' && f.a_score != null) {
        displayScore = Number(f.a_score).toFixed(2);
        scoreLabel = 'CORE A';
      } else if (this.facultyRankFilter === 'Journal') {
        scoreLabel = 'Journals';
      }

      // Display research area chips
      let areaChips = '';
      if (f.areas && f.areas.length > 0) {
        const broadSet = new Set();
        f.areas.forEach(code => {
          const bId = AREA_TAXONOMY[code] || code;
          const bObj = BROAD_AREAS.find(b => b.id === bId);
          if (bObj) broadSet.add(bObj.name);
        });
        areaChips = Array.from(broadSet).slice(0, 3).map(areaName => `
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-teal-50 text-teal-700 border border-teal-100 font-medium">
            ${escapeHTML(areaName)}
          </span>
        `).join(' ');
      }

      return `
        <li class="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0 hover:bg-teal-50/20 px-2 rounded-xl transition-colors">
          <div class="flex items-center gap-3.5 min-w-0">
            <span class="w-6 text-xs text-gray-400 font-mono font-semibold flex-shrink-0 text-center">${globalRank}</span>
            <div class="min-w-0">
              <a href="${prefix}pages/faculty-profile.html?id=${escapeHTML(f.id)}"
                 class="text-sm font-semibold text-gray-900 hover:text-teal-600 transition-colors block truncate">
                ${escapeHTML(f.name)}
              </a>
              <div class="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                ${f.designation ? `<span>${escapeHTML(f.designation)}</span>` : ''}
                ${areaChips}
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end flex-shrink-0 ml-4">
            <span class="text-sm font-mono font-bold text-teal-800">${displayScore} pts</span>
            <span class="inst-score-sublabel" style="font-size: 8.5px; line-height: 1.1; color: #9ca3af; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 500;">${scoreLabel}</span>
          </div>
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
      <ul class="divide-y divide-gray-100 mb-2">
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

    // Filter by Research Area (Combined or Subfield)
    if (this.pubAreaFilter !== 'all') {
      list = list.filter(p => matchesAreaFilter(p.area, this.pubAreaFilter));
    }

    // Filter by Conference Venue
    if (this.pubConfFilter !== 'all') {
      list = list.filter(p => {
        const acronym = p.conference?.acronym || p.conference || p.venue;
        return acronym === this.pubConfFilter;
      });
    }

    // Filter by CORE Rank / Journals
    if (this.pubCoreFilter !== 'all') {
      list = list.filter(p => {
        const rank = p.core_rank || (p.conference && p.conference.core_rank);
        if (this.pubCoreFilter === 'Journal') {
          if (rank === 'Journal') return true;
          const conf = (p.conference?.acronym || p.conference || p.venue || '').toLowerCase();
          const fullName = (p.conference?.full_name || '').toLowerCase();
          return conf.includes('journal') || conf.includes('trans') || conf.includes('commu') || conf.includes('letters') || fullName.includes('journal') || fullName.includes('transaction');
        }
        return rank === this.pubCoreFilter;
      });
    }

    // Filter by Search Query
    if (this.pubSearchQuery) {
      list = list.filter(p => (p.title || '').toLowerCase().includes(this.pubSearchQuery));
    }

    // Update count badge
    const countBadge = this.container.querySelector('#inst-pub-count');
    if (countBadge) countBadge.textContent = `${list.length} Publications`;

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / this.pubPageSize);
    if (this.pubPage > totalPages && totalPages > 0) this.pubPage = totalPages;

    if (totalItems === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400 text-sm">
          No publications match the selected filters.
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

      // FoR Area label
      const broadId = AREA_TAXONOMY[p.area] || p.area;
      const bInfo = BROAD_AREAS.find(b => b.id === broadId);
      const areaName = bInfo ? bInfo.name : p.area;

      return `
        <li class="py-3.5 border-b border-gray-100 last:border-0 flex items-start gap-3 hover:bg-gray-50/50 px-2 rounded-xl transition-colors">
          <div class="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            ${coreBadge}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-gray-900 leading-snug">${title}</h4>
            <div class="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
              ${conf ? `<span class="font-medium text-teal-600">${conf}</span> · ` : ''}
              <span>${year}</span>
              ${areaName ? ` · <span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium">${escapeHTML(areaName)}</span>` : ''}
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
      <ul class="divide-y divide-gray-100 mb-2">
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

    // 1. Score Trends Chart
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

    // 2. Area Breakdown Chart
    const areasCanvas = this.container.querySelector('#areas-chart');
    if (areasCanvas && areaScores && Object.keys(areaScores).length > 0) {
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
