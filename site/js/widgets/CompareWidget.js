// widgets/CompareWidget.js — SPARK Comparative Intelligence Engine
// Features:
// - Side-by-side multi-dimensional comparison for Institutions & Faculty
// - Reliable 2-column responsive layout (.cmp-grid-2) that never collapses into a single column on desktop
// - 1-Click preset comparison chips (IIIT Delhi vs IISc, IIT Bombay, IIT Delhi, etc.)
// - Instant suggestion dropdowns on focus/click featuring IIIT Delhi & top CS researchers
// - Historical Score Trends line chart (2015-2026) & Radar / Grouped Bar discipline chart side-by-side
// - Comprehensive head-to-head comparative metric progress bars with leader badges
// - Discipline-by-discipline advantage matrix table with visual mini-bars
// - Side-by-side Top Faculty lists with sorting & area filtering
// - Side-by-side Verified Publications lists with sorting, year range, and CORE rank filtering
// - Clean, responsive SPARK design system with rich aesthetics

import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';

// Hierarchical taxonomy for combined & sub-area filtering
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

// Curated suggestions shown on focus / empty click (prominently featuring IIIT Delhi)
const SUGGESTED_INSTITUTIONS = [
  { id: 1, name: 'IIIT Delhi', subtitle: 'New Delhi · National CS Research Hub', featured: true },
  { id: 3, name: 'IISc Bangalore', subtitle: 'Bengaluru · National Rank #1' },
  { id: 2, name: 'IIT Bombay', subtitle: 'Mumbai · National Rank #2' },
  { id: 5, name: 'IIT Delhi', subtitle: 'New Delhi · Premier IIT' },
  { id: 8, name: 'IIIT Hyderabad', subtitle: 'Hyderabad · Premier IIIT' },
  { id: 4, name: 'IIT Madras', subtitle: 'Chennai · Premier IIT' },
  { id: 6, name: 'IIT Kanpur', subtitle: 'Kanpur · Premier IIT' },
];

const SUGGESTED_FACULTY = [
  { id: 5, name: 'Rajiv Ratn Shah', inst: 'IIIT Delhi', score: '49.94', featured: true },
  { id: 11, name: 'Md. Shad Akhtar', inst: 'IIIT Delhi', score: '33.48', featured: true },
  { id: 86, name: 'Sunita Sarawagi', inst: 'IIT Bombay', score: '55.70' },
  { id: 234, name: 'Tanmoy Chakraborty', inst: 'IIT Delhi', score: '99.19' },
  { id: 129, name: 'R. Venkatesh Babu', inst: 'IISc Bangalore', score: '92.78' },
  { id: 336, name: 'C.V. Jawahar', inst: 'IIIT Hyderabad', score: '81.20' },
];

// 1-Click quick compare presets
const PRESET_INSTITUTIONS = [
  { label: 'IIIT Delhi vs IISc Bangalore', id1: 1, name1: 'IIIT Delhi', id2: 3, name2: 'IISc Bangalore' },
  { label: 'IIIT Delhi vs IIT Bombay', id1: 1, name1: 'IIIT Delhi', id2: 2, name2: 'IIT Bombay' },
  { label: 'IIIT Delhi vs IIT Delhi', id1: 1, name1: 'IIIT Delhi', id2: 5, name2: 'IIT Delhi' },
  { label: 'IIIT Delhi vs IIIT Hyderabad', id1: 1, name1: 'IIIT Delhi', id2: 8, name2: 'IIIT Hyderabad' },
];

const PRESET_FACULTY = [
  { label: 'Rajiv Ratn Shah (IIITD) vs Sunita Sarawagi (IITB)', id1: 5, name1: 'Rajiv Ratn Shah', id2: 86, name2: 'Sunita Sarawagi' },
  { label: 'Md. Shad Akhtar (IIITD) vs Tanmoy Chakraborty (IITD)', id1: 11, name1: 'Md. Shad Akhtar', id2: 234, name2: 'Tanmoy Chakraborty' },
  { label: 'Rajiv Ratn Shah (IIITD) vs C.V. Jawahar (IIITH)', id1: 5, name1: 'Rajiv Ratn Shah', id2: 336, name2: 'C.V. Jawahar' },
];

function matchesAreaFilter(itemAreaOrAreas, filterValue) {
  if (!filterValue || filterValue === 'all') return true;

  if (filterValue.endsWith(':all')) {
    const broadId = filterValue.split(':')[0];
    if (Array.isArray(itemAreaOrAreas)) {
      return itemAreaOrAreas.some(a => (AREA_TAXONOMY[a] || a) === broadId);
    }
    return (AREA_TAXONOMY[itemAreaOrAreas] || itemAreaOrAreas) === broadId;
  }

  if (Array.isArray(itemAreaOrAreas)) {
    return itemAreaOrAreas.includes(filterValue);
  }
  return itemAreaOrAreas === filterValue;
}

function matchesRankFilter(itemRank, confName, filterValue) {
  if (!filterValue || filterValue === 'all') return true;
  if (filterValue === 'Journal') {
    if (itemRank === 'Journal') return true;
    const c = String(confName || '').toLowerCase();
    return c.includes('journal') || c.includes('trans') || c.includes('commu') || c.includes('letters');
  }
  return itemRank === filterValue;
}

function matchesYearFilter(year, filterValue) {
  if (!filterValue || filterValue === 'all') return true;
  const yr = Number(year || 0);
  if (filterValue === '5yr') return yr >= 2022;
  if (filterValue === '3yr') return yr >= 2024;
  if (filterValue === '2026') return yr === 2026;
  return true;
}

export default class CompareWidget {
  constructor(containerId, apiBase) {
    this.container = document.getElementById(containerId);
    this.apiBase = apiBase;

    this.activeTab = 'institutions'; // 'institutions' | 'faculty'
    this.areaFilter = 'all';
    this.rankFilter = 'all';
    this.yearFilter = 'all';
    this.sortByFaculty = 'score_desc'; // 'score_desc' | 'astar_desc' | 'name_asc'
    this.sortByPubs = 'year_desc'; // 'year_desc' | 'rank_desc' | 'title_asc'
    this.chartType = 'radar'; // 'radar' | 'bar'

    // Institution comparison state
    this.inst1 = null;
    this.inst2 = null;
    this.inst1Trends = [];
    this.inst2Trends = [];
    this.inst1Pubs = [];
    this.inst2Pubs = [];
    this.loadingInst = false;

    // Faculty comparison state
    this.fac1 = null;
    this.fac2 = null;
    this.loadingFac = false;

    // Chart instances
    this.disciplineChart = null;
    this.trendsChart = null;

    if (!this.container) return;
    this.render();

    // Auto-load default comparison on initial page visit: IIIT Delhi vs IISc Bangalore
    this._loadInitialDefaults();
  }

  async _loadInitialDefaults() {
    try {
      await this._selectInstitutionPair(1, 'IIIT Delhi', 3, 'IISc Bangalore');
    } catch (e) {
      console.warn('[SPARK Compare] Default auto-load deferred:', e);
    }
  }

  _buildAreaOptionsHTML() {
    return TAXONOMY_GROUPS.map(g => {
      const opts = g.options.map(opt =>
        `<option value="${escapeHTML(opt.value)}" ${this.areaFilter === opt.value ? 'selected' : ''}>${escapeHTML(opt.label)}</option>`
      ).join('');
      return `<optgroup label="${escapeHTML(g.group)}">${opts}</optgroup>`;
    }).join('');
  }

  render() {
    const areaOptionsHTML = this._buildAreaOptionsHTML();

    this.container.innerHTML = `
      <div class="space-y-6">

        <!-- Top Header & Mode Switcher -->
        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <!-- Mode Switch Tabs -->
            <div class="inline-flex p-1 bg-gray-100 rounded-xl">
              <button
                id="tab-inst-btn"
                type="button"
                class="px-5 py-2 text-xs font-bold rounded-lg transition-all ${this.activeTab === 'institutions' ? 'cmp-tab-active shadow-sm' : 'cmp-tab-inactive'}"
              >
                🏢 Compare Institutions
              </button>
              <button
                id="tab-fac-btn"
                type="button"
                class="px-5 py-2 text-xs font-bold rounded-lg transition-all ${this.activeTab === 'faculty' ? 'cmp-tab-active shadow-sm' : 'cmp-tab-inactive'}"
              >
                👤 Compare Faculty
              </button>
            </div>

            <!-- Multi-Dimensional Filters Bar (Responsive Row) -->
            <div class="cmp-filter-bar">
              <!-- Research Area Filter -->
              <div class="min-w-[170px] flex-1 sm:flex-initial">
                <label for="cmp-area-filter" class="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Research Area</label>
                <select id="cmp-area-filter" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm cursor-pointer truncate">
                  <option value="all">All Research Areas</option>
                  ${areaOptionsHTML}
                </select>
              </div>

              <!-- CORE Rank / Venue Filter -->
              <div class="min-w-[130px] flex-1 sm:flex-initial">
                <label for="cmp-rank-filter" class="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">CORE Rank / Venue</label>
                <select id="cmp-rank-filter" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm cursor-pointer truncate">
                  <option value="all" ${this.rankFilter === 'all' ? 'selected' : ''}>All Ranks & Venues</option>
                  <option value="A*" ${this.rankFilter === 'A*' ? 'selected' : ''}>CORE A* Only</option>
                  <option value="A" ${this.rankFilter === 'A' ? 'selected' : ''}>CORE A Only</option>
                  <option value="Journal" ${this.rankFilter === 'Journal' ? 'selected' : ''}>Journals & Trans.</option>
                </select>
              </div>

              <!-- Publication Year Range Filter -->
              <div class="min-w-[130px] flex-1 sm:flex-initial">
                <label for="cmp-year-filter" class="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Publication Year</label>
                <select id="cmp-year-filter" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm cursor-pointer truncate">
                  <option value="all" ${this.yearFilter === 'all' ? 'selected' : ''}>All Years (2015–2026)</option>
                  <option value="5yr" ${this.yearFilter === '5yr' ? 'selected' : ''}>Last 5 Years (2022–2026)</option>
                  <option value="3yr" ${this.yearFilter === '3yr' ? 'selected' : ''}>Last 3 Years (2024–2026)</option>
                  <option value="2026" ${this.yearFilter === '2026' ? 'selected' : ''}>Current Year (2026)</option>
                </select>
              </div>

              <!-- Sort Order Filter -->
              <div class="min-w-[130px] flex-1 sm:flex-initial">
                <label for="cmp-sort-filter" class="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sort Mode</label>
                <select id="cmp-sort-filter" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm cursor-pointer truncate">
                  <option value="score_desc">Highest Score ↓</option>
                  <option value="astar_desc">CORE A* Score ↓</option>
                  <option value="year_desc">Newest Year ↓</option>
                  <option value="name_asc">Alphabetical (A-Z)</option>
                </select>
              </div>

              <!-- Reset Button -->
              <div class="flex-shrink-0 self-end">
                <button id="cmp-reset-filters-btn" class="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors shadow-sm" title="Reset all filters">
                  Reset
                </button>
              </div>
            </div>

          </div>

          <!-- Quick 1-Click Comparison Presets -->
          <div class="pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span class="text-2xs font-bold text-gray-400 uppercase tracking-wider">Quick Compare:</span>
            <div id="cmp-presets-container" class="flex items-center gap-1.5 flex-wrap">
              ${this._renderPresetChips()}
            </div>
          </div>

        </div>

        <!-- Dynamic Selector Row for Active Mode -->
        <div id="cmp-active-view">
          ${this.activeTab === 'institutions' ? this._renderInstitutionSelectRow() : this._renderFacultySelectRow()}
        </div>

        <!-- Detailed Comparison Output Section -->
        <div id="cmp-details-container">
          <div class="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 text-teal-600 mb-3 animate-pulse">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p class="text-sm font-bold text-gray-700">Loading Head-to-Head Analytics...</p>
            <p class="text-xs text-gray-400 mt-1">Fetching metrics, multi-year trends, and verified publications.</p>
          </div>
        </div>

      </div>
    `;

    this._attachTabListeners();
    this._attachFilterListeners();
    this._attachPresetListeners();

    if (this.activeTab === 'institutions') {
      this._attachInstitutionSelectors();
      if (this.inst1 && this.inst2) this._renderInstitutionComparison();
    } else {
      this._attachFacultySelectors();
      if (this.fac1 && this.fac2) this._renderFacultyComparison();
    }
  }

  _renderPresetChips() {
    const list = this.activeTab === 'institutions' ? PRESET_INSTITUTIONS : PRESET_FACULTY;
    return list.map((p, idx) => `
      <button
        type="button"
        class="preset-chip"
        data-preset-idx="${idx}"
      >
        <span>⚡</span> ${escapeHTML(p.label)}
      </button>
    `).join('');
  }

  _attachPresetListeners() {
    const container = this.container.querySelector('#cmp-presets-container');
    if (!container) return;

    container.querySelectorAll('button[data-preset-idx]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.presetIdx);
        if (this.activeTab === 'institutions') {
          const p = PRESET_INSTITUTIONS[idx];
          if (p) {
            await this._selectInstitutionPair(p.id1, p.name1, p.id2, p.name2);
          }
        } else {
          const p = PRESET_FACULTY[idx];
          if (p) {
            await this._selectFacultyPair(p.id1, p.name1, p.id2, p.name2);
          }
        }
      });
    });
  }

  async _selectInstitutionPair(id1, name1, id2, name2) {
    const in1 = this.container.querySelector('#search-inst-1');
    const in2 = this.container.querySelector('#search-inst-2');
    if (in1) in1.value = name1;
    if (in2) in2.value = name2;

    const [inst1, trends1, pubs1, inst2, trends2, pubs2] = await Promise.all([
      fetchJSON(`${this.apiBase}/institutions/${id1}/`),
      fetchJSON(`${this.apiBase}/institutions/${id1}/trends/`),
      fetchJSON(`${this.apiBase}/publications/?institution=${id1}`),
      fetchJSON(`${this.apiBase}/institutions/${id2}/`),
      fetchJSON(`${this.apiBase}/institutions/${id2}/trends/`),
      fetchJSON(`${this.apiBase}/publications/?institution=${id2}`),
    ]);

    this.inst1 = inst1;
    this.inst1Trends = Array.isArray(trends1) ? trends1 : (trends1?.results || []);
    this.inst1Pubs = Array.isArray(pubs1) ? pubs1 : (pubs1?.results || []);

    this.inst2 = inst2;
    this.inst2Trends = Array.isArray(trends2) ? trends2 : (trends2?.results || []);
    this.inst2Pubs = Array.isArray(pubs2) ? pubs2 : (pubs2?.results || []);

    this._renderInstitutionComparison();
  }

  async _selectFacultyPair(id1, name1, id2, name2) {
    const in1 = this.container.querySelector('#search-fac-1');
    const in2 = this.container.querySelector('#search-fac-2');
    if (in1) in1.value = name1;
    if (in2) in2.value = name2;

    const [fac1, fac2] = await Promise.all([
      fetchJSON(`${this.apiBase}/faculty/${id1}/`),
      fetchJSON(`${this.apiBase}/faculty/${id2}/`),
    ]);

    this.fac1 = fac1;
    this.fac2 = fac2;

    this._renderFacultyComparison();
  }

  _attachTabListeners() {
    const tabInst = this.container.querySelector('#tab-inst-btn');
    const tabFac = this.container.querySelector('#tab-fac-btn');

    if (tabInst) {
      tabInst.addEventListener('click', () => {
        if (this.activeTab === 'institutions') return;
        this.activeTab = 'institutions';
        this.render();
      });
    }

    if (tabFac) {
      tabFac.addEventListener('click', async () => {
        if (this.activeTab === 'faculty') return;
        this.activeTab = 'faculty';
        this.render();
        // If faculty not selected yet, auto-select Rajiv Ratn Shah vs Sunita Sarawagi
        if (!this.fac1 || !this.fac2) {
          const p = PRESET_FACULTY[0];
          await this._selectFacultyPair(p.id1, p.name1, p.id2, p.name2);
        }
      });
    }
  }

  _attachFilterListeners() {
    const areaSel = this.container.querySelector('#cmp-area-filter');
    if (areaSel) {
      areaSel.addEventListener('change', (e) => {
        this.areaFilter = e.target.value;
        this._refreshCurrentComparison();
      });
    }

    const rankSel = this.container.querySelector('#cmp-rank-filter');
    if (rankSel) {
      rankSel.addEventListener('change', (e) => {
        this.rankFilter = e.target.value;
        this._refreshCurrentComparison();
      });
    }

    const yearSel = this.container.querySelector('#cmp-year-filter');
    if (yearSel) {
      yearSel.addEventListener('change', (e) => {
        this.yearFilter = e.target.value;
        this._refreshCurrentComparison();
      });
    }

    const sortSel = this.container.querySelector('#cmp-sort-filter');
    if (sortSel) {
      sortSel.addEventListener('change', (e) => {
        const val = e.target.value;
        this.sortByFaculty = val;
        this.sortByPubs = val;
        this._refreshCurrentComparison();
      });
    }

    const resetBtn = this.container.querySelector('#cmp-reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.areaFilter = 'all';
        this.rankFilter = 'all';
        this.yearFilter = 'all';
        this.sortByFaculty = 'score_desc';
        this.sortByPubs = 'year_desc';
        if (areaSel) areaSel.value = 'all';
        if (rankSel) rankSel.value = 'all';
        if (yearSel) yearSel.value = 'all';
        if (sortSel) sortSel.value = 'score_desc';
        this._refreshCurrentComparison();
      });
    }
  }

  _refreshCurrentComparison() {
    if (this.activeTab === 'institutions' && this.inst1 && this.inst2) {
      this._renderInstitutionComparison();
    } else if (this.activeTab === 'faculty' && this.fac1 && this.fac2) {
      this._renderFacultyComparison();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INSTITUTION COMPARISON
  // ══════════════════════════════════════════════════════════════════════════

  _renderInstitutionSelectRow() {
    const name1 = this.inst1 ? escapeHTML(this.inst1.name) : 'IIIT Delhi';
    const name2 = this.inst2 ? escapeHTML(this.inst2.name) : 'IISc Bangalore';

    return `
      <div class="cmp-grid-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <!-- Institution 1 (Teal Accent) -->
        <div class="relative">
          <div class="flex items-center justify-between mb-1.5">
            <label for="search-inst-1" class="text-xs text-teal-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Institution 1 (Teal)
            </label>
            <span class="text-2xs text-gray-400">Click input for instant suggestions</span>
          </div>
          <div class="relative">
            <input
              type="text"
              id="search-inst-1"
              placeholder="Click for suggestions (e.g. IIIT Delhi) or type..."
              value="${name1}"
              autocomplete="off"
              class="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
            />
            <svg class="w-4 h-4 text-teal-600 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div id="results-inst-1" class="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 hidden max-h-72 overflow-y-auto"></div>
        </div>

        <!-- Institution 2 (Blue Accent) -->
        <div class="relative">
          <div class="flex items-center justify-between mb-1.5">
            <label for="search-inst-2" class="text-xs text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Institution 2 (Blue)
            </label>
            <span class="text-2xs text-gray-400">Click input for instant suggestions</span>
          </div>
          <div class="relative">
            <input
              type="text"
              id="search-inst-2"
              placeholder="Click for suggestions (e.g. IISc Bangalore) or type..."
              value="${name2}"
              autocomplete="off"
              class="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            <svg class="w-4 h-4 text-blue-600 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div id="results-inst-2" class="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 hidden max-h-72 overflow-y-auto"></div>
        </div>
      </div>
    `;
  }

  _attachInstitutionSelectors() {
    this._setupAutocomplete({
      inputId: 'search-inst-1',
      resultsId: 'results-inst-1',
      endpoint: 'institutions',
      suggestions: SUGGESTED_INSTITUTIONS,
      onSelect: async (item) => {
        const [inst, trends, pubs] = await Promise.all([
          fetchJSON(`${this.apiBase}/institutions/${item.id}/`),
          fetchJSON(`${this.apiBase}/institutions/${item.id}/trends/`),
          fetchJSON(`${this.apiBase}/publications/?institution=${item.id}`),
        ]);
        this.inst1 = inst;
        this.inst1Trends = Array.isArray(trends) ? trends : (trends?.results || []);
        this.inst1Pubs = Array.isArray(pubs) ? pubs : (pubs?.results || []);
        this._renderInstitutionComparison();
      }
    });

    this._setupAutocomplete({
      inputId: 'search-inst-2',
      resultsId: 'results-inst-2',
      endpoint: 'institutions',
      suggestions: SUGGESTED_INSTITUTIONS,
      onSelect: async (item) => {
        const [inst, trends, pubs] = await Promise.all([
          fetchJSON(`${this.apiBase}/institutions/${item.id}/`),
          fetchJSON(`${this.apiBase}/institutions/${item.id}/trends/`),
          fetchJSON(`${this.apiBase}/publications/?institution=${item.id}`),
        ]);
        this.inst2 = inst;
        this.inst2Trends = Array.isArray(trends) ? trends : (trends?.results || []);
        this.inst2Pubs = Array.isArray(pubs) ? pubs : (pubs?.results || []);
        this._renderInstitutionComparison();
      }
    });
  }

  _renderInstitutionComparison() {
    const container = this.container.querySelector('#cmp-details-container');
    if (!container) return;

    if (!this.inst1 || !this.inst2) {
      container.innerHTML = `
        <div class="card p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
          </svg>
          <p class="text-sm font-semibold text-gray-600">Select Institutions</p>
          <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Select two institutions above or click a quick compare preset to generate the side-by-side analysis.</p>
        </div>`;
      return;
    }

    const i1 = this.inst1;
    const i2 = this.inst2;

    const score1 = Number(i1.score || 0);
    const score2 = Number(i2.score || 0);
    const rank1 = i1.rank ? Number(i1.rank) : 999;
    const rank2 = i2.rank ? Number(i2.rank) : 999;

    // Filter publications by active filters
    const filterPubs = (pubs) => {
      let list = pubs.filter(p => {
        if (!matchesAreaFilter(p.area, this.areaFilter)) return false;
        const rank = p.core_rank || (p.conference && p.conference.core_rank) || '';
        const conf = p.conference?.acronym || p.conference || p.venue || '';
        if (!matchesRankFilter(rank, conf, this.rankFilter)) return false;
        if (!matchesYearFilter(p.year, this.yearFilter)) return false;
        return true;
      });

      if (this.sortByPubs === 'year_desc') {
        list.sort((a, b) => (b.year || 0) - (a.year || 0));
      } else if (this.sortByPubs === 'rank_desc') {
        const order = { 'A*': 1, 'A': 2, 'Journal': 3 };
        list.sort((a, b) => (order[a.core_rank] || 9) - (order[b.core_rank] || 9));
      } else if (this.sortByPubs === 'name_asc') {
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
      return list;
    };

    const filteredPubs1 = filterPubs(this.inst1Pubs);
    const filteredPubs2 = filterPubs(this.inst2Pubs);

    // Compute CORE A* and A counts
    const aStarCount1 = filteredPubs1.filter(p => (p.core_rank === 'A*' || p.conference?.core_rank === 'A*')).length;
    const aStarCount2 = filteredPubs2.filter(p => (p.core_rank === 'A*' || p.conference?.core_rank === 'A*')).length;
    const aCount1 = filteredPubs1.filter(p => (p.core_rank === 'A' || p.conference?.core_rank === 'A')).length;
    const aCount2 = filteredPubs2.filter(p => (p.core_rank === 'A' || p.conference?.core_rank === 'A')).length;

    // Filter faculty
    const filterFac = (facList) => {
      let list = (facList || []).filter(f => {
        if (this.areaFilter !== 'all') {
          if (!f.areas || !matchesAreaFilter(f.areas, this.areaFilter)) return false;
        }
        return true;
      });

      if (this.sortByFaculty === 'score_desc') {
        list.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (this.sortByFaculty === 'astar_desc') {
        list.sort((a, b) => (b.a_star_score || b.score || 0) - (a.a_star_score || a.score || 0));
      } else if (this.sortByFaculty === 'name_asc') {
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      return list;
    };

    const fac1List = filterFac(i1.top_faculty || []);
    const fac2List = filterFac(i2.top_faculty || []);

    // Disciplines breakdown
    const b1 = i1.area_scores || i1.area_breakdown || {};
    const b2 = i2.area_scores || i2.area_breakdown || {};

    const mapAreas = (breakdown) => {
      const mapped = {};
      Object.entries(breakdown).forEach(([k, v]) => {
        const broad = AREA_TAXONOMY[k] || k;
        const info = BROAD_AREAS.find(b => b.id === broad);
        const name = info ? info.name : broad;
        mapped[name] = (mapped[name] || 0) + Number(v);
      });
      return mapped;
    };

    const areas1 = mapAreas(b1);
    const areas2 = mapAreas(b2);
    const allDisciplineNames = Array.from(new Set([...Object.keys(areas1), ...Object.keys(areas2)])).sort();

    // Table rows with visual mini-bars
    const disciplineRowsHTML = allDisciplineNames.map(name => {
      const pts1 = Number(areas1[name] || 0).toFixed(2);
      const pts2 = Number(areas2[name] || 0).toFixed(2);
      const num1 = Number(pts1);
      const num2 = Number(pts2);
      const total = num1 + num2 || 1;
      const pct1 = Math.round((num1 / total) * 100);
      const pct2 = 100 - pct1;
      const diff = (num1 - num2).toFixed(2);
      const leader1 = num1 > num2;
      const leader2 = num2 > num1;

      return `
        <tr class="hover:bg-gray-50/70 transition-colors border-b border-gray-100 last:border-0">
          <td class="px-5 py-3 text-xs font-semibold text-gray-900">${escapeHTML(name)}</td>
          <td class="px-5 py-3 text-xs font-mono text-center ${leader1 ? 'font-bold text-teal-700 bg-teal-50/40' : 'text-gray-600'}">
            ${pts1} pts ${leader1 ? '<span class="ml-1 text-3xs px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-bold uppercase">Lead</span>' : ''}
          </td>
          <td class="px-5 py-3 text-xs font-mono text-center ${leader2 ? 'font-bold text-blue-700 bg-blue-50/40' : 'text-gray-600'}">
            ${pts2} pts ${leader2 ? '<span class="ml-1 text-3xs px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold uppercase">Lead</span>' : ''}
          </td>
          <td class="px-5 py-3 text-xs text-center">
            ${Number(diff) > 0
              ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-teal-100 text-teal-800">+${diff} (${escapeHTML(i1.name)})</span>`
              : (Number(diff) < 0
                ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-blue-100 text-blue-800">${diff} (${escapeHTML(i2.name)})</span>`
                : '<span class="text-gray-400 text-2xs">Tied</span>')}
          </td>
          <td class="px-5 py-3 text-center min-w-[120px]">
            <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
              <div class="bg-teal-500 h-full" style="width: ${pct1}%;"></div>
              <div class="bg-blue-500 h-full" style="width: ${pct2}%;"></div>
            </div>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">

        <!-- Executive Side-by-Side Summary Cards (Strict cmp-grid-2) -->
        <div class="cmp-grid-2">
          
          <!-- Inst 1 Card (Teal) -->
          <div class="card p-6 bg-white rounded-2xl border-2 ${rank1 < rank2 ? 'border-teal-500 shadow-md ring-4 ring-teal-500/10' : 'border-teal-200 shadow-sm'} space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Institution 1</span>
                <h3 class="text-xl sm:text-2xl font-black text-gray-900 mt-1">${escapeHTML(i1.name)}</h3>
                ${i1.website ? `<a href="${escapeHTML(i1.website)}" target="_blank" rel="noopener noreferrer" class="text-xs text-teal-600 hover:underline mt-0.5 flex items-center gap-1"><span>🌐</span> ${escapeHTML(i1.website)}</a>` : ''}
              </div>
              <div class="text-right">
                <span class="text-3xl font-black text-teal-600 font-mono block">${score1.toFixed(2)}</span>
                <span class="text-2xs text-gray-400 font-bold uppercase tracking-wider block">SPARK Score</span>
                <span class="inline-block mt-1 text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${rank1 < rank2 ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-gray-100 text-gray-700'}">National Rank #${i1.rank || '—'}</span>
              </div>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">${escapeHTML(i1.description || 'Indian premier computer science research institution.')}</p>
          </div>

          <!-- Inst 2 Card (Blue) -->
          <div class="card p-6 bg-white rounded-2xl border-2 ${rank2 < rank1 ? 'border-blue-500 shadow-md ring-4 ring-blue-500/10' : 'border-blue-200 shadow-sm'} space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">Institution 2</span>
                <h3 class="text-xl sm:text-2xl font-black text-gray-900 mt-1">${escapeHTML(i2.name)}</h3>
                ${i2.website ? `<a href="${escapeHTML(i2.website)}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-1"><span>🌐</span> ${escapeHTML(i2.website)}</a>` : ''}
              </div>
              <div class="text-right">
                <span class="text-3xl font-black text-blue-600 font-mono block">${score2.toFixed(2)}</span>
                <span class="text-2xs text-gray-400 font-bold uppercase tracking-wider block">SPARK Score</span>
                <span class="inline-block mt-1 text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${rank2 < rank1 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-700'}">National Rank #${i2.rank || '—'}</span>
              </div>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">${escapeHTML(i2.description || 'Indian premier computer science research institution.')}</p>
          </div>

        </div>

        <!-- Head-to-Head Comparative Metric Matrix -->
        <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Direct Head-to-Head Comparison</h3>
              <p class="text-xs text-gray-400">Quantitative metric distribution between both institutions</p>
            </div>
            <div class="flex items-center gap-3 text-xs font-bold">
              <span class="flex items-center gap-1 text-teal-700"><span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span> ${escapeHTML(i1.name)}</span>
              <span class="flex items-center gap-1 text-blue-700"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> ${escapeHTML(i2.name)}</span>
            </div>
          </div>
          
          <div class="space-y-4">
            <!-- Metric 1: Overall Score -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${score1.toFixed(2)} pts</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">SPARK Overall Score</span>
                <span class="text-blue-700 font-mono font-bold">${score2.toFixed(2)} pts</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(score1 / ((score1 + score2) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(score2 / ((score1 + score2) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 2: Total Verified Publications -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${filteredPubs1.length} papers</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">Verified Publications Matching Filters</span>
                <span class="text-blue-700 font-mono font-bold">${filteredPubs2.length} papers</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(filteredPubs1.length / ((filteredPubs1.length + filteredPubs2.length) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(filteredPubs2.length / ((filteredPubs1.length + filteredPubs2.length) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 3: CORE A* Papers -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${aStarCount1} CORE A*</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">CORE A* Elite Publications</span>
                <span class="text-blue-700 font-mono font-bold">${aStarCount2} CORE A*</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(aStarCount1 / ((aStarCount1 + aStarCount2) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(aStarCount2 / ((aStarCount1 + aStarCount2) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 4: CORE A Papers -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${aCount1} CORE A</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">CORE A Publications</span>
                <span class="text-blue-700 font-mono font-bold">${aCount2} CORE A</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(aCount1 / ((aCount1 + aCount2) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(aCount2 / ((aCount1 + aCount2) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 5: Active Faculty Size -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${fac1List.length} faculty</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">Key Faculty Members</span>
                <span class="text-blue-700 font-mono font-bold">${fac2List.length} faculty</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(fac1List.length / ((fac1List.length + fac2List.length) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(fac2List.length / ((fac1List.length + fac2List.length) || 1) * 100)}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive Visual Analytics Section: 2 Charts Side-by-Side (cmp-grid-2) -->
        <div class="cmp-grid-2">
          
          <!-- Chart 1: Historical Score Trends Over Time -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Historical Score Trajectory (2015 – 2026)</h3>
              <p class="text-xs text-gray-400">Multi-year weighted research output trajectory</p>
            </div>
            <div class="relative w-full" style="min-height: 290px; height: 290px;">
              <canvas id="cmp-trends-chart"></canvas>
            </div>
          </div>

          <!-- Chart 2: Research Discipline Comparison (Toggle Radar / Bar) -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-gray-900">Research Discipline Breakdown</h3>
                <p class="text-xs text-gray-400">Cross-area research points distribution</p>
              </div>
              <div class="inline-flex p-1 bg-gray-100 rounded-lg">
                <button id="cmp-chart-radar-btn" class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${this.chartType === 'radar' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">
                  Radar
                </button>
                <button id="cmp-chart-bar-btn" class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${this.chartType === 'bar' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">
                  Grouped Bar
                </button>
              </div>
            </div>
            <div class="relative w-full" style="min-height: 290px; height: 290px;">
              <canvas id="cmp-discipline-chart"></canvas>
            </div>
          </div>

        </div>

        <!-- Discipline Points Matrix Table -->
        <div class="card p-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Discipline Advantage Matrix</h3>
              <p class="text-xs text-gray-400">Head-to-head point totals across verified Australian FoR CS subfields</p>
            </div>
            <span class="text-xs text-gray-500 font-mono font-semibold">${allDisciplineNames.length} Subfields</span>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-100">
              <thead class="bg-gray-50 text-2xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3 text-left">Sub-discipline</th>
                  <th class="px-5 py-3 text-center text-teal-700">${escapeHTML(i1.name)}</th>
                  <th class="px-5 py-3 text-center text-blue-700">${escapeHTML(i2.name)}</th>
                  <th class="px-5 py-3 text-center">Advantage</th>
                  <th class="px-5 py-3 text-center">Share</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${disciplineRowsHTML}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Side-by-Side Top Faculty Comparison (cmp-grid-2) -->
        <div class="cmp-grid-2">
          <!-- Inst 1 Faculty -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                Top Faculty · ${escapeHTML(i1.name)}
              </h4>
              <span class="text-xs font-mono text-teal-700 font-semibold">${fac1List.length} Active</span>
            </div>
            <ul class="divide-y divide-gray-100">
              ${fac1List.slice(0, 8).map((f, idx) => `
                <li class="py-2.5 flex items-center justify-between">
                  <div class="min-w-0 pr-2">
                    <span class="text-xs font-semibold text-gray-900 block truncate">${idx + 1}. ${escapeHTML(f.name)}</span>
                    <span class="text-2xs text-gray-400">${escapeHTML(f.designation || 'Faculty Member')}</span>
                  </div>
                  <span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full flex-shrink-0">
                    ${Number(f.score || 0).toFixed(2)} pts
                  </span>
                </li>
              `).join('') || '<li class="py-4 text-xs text-gray-400 text-center">No faculty match selected filters</li>'}
            </ul>
          </div>

          <!-- Inst 2 Faculty -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Top Faculty · ${escapeHTML(i2.name)}
              </h4>
              <span class="text-xs font-mono text-blue-700 font-semibold">${fac2List.length} Active</span>
            </div>
            <ul class="divide-y divide-gray-100">
              ${fac2List.slice(0, 8).map((f, idx) => `
                <li class="py-2.5 flex items-center justify-between">
                  <div class="min-w-0 pr-2">
                    <span class="text-xs font-semibold text-gray-900 block truncate">${idx + 1}. ${escapeHTML(f.name)}</span>
                    <span class="text-2xs text-gray-400">${escapeHTML(f.designation || 'Faculty Member')}</span>
                  </div>
                  <span class="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full flex-shrink-0">
                    ${Number(f.score || 0).toFixed(2)} pts
                  </span>
                </li>
              `).join('') || '<li class="py-4 text-xs text-gray-400 text-center">No faculty match selected filters</li>'}
            </ul>
          </div>
        </div>

        <!-- Side-by-Side Filtered Publications List (cmp-grid-2) -->
        <div class="cmp-grid-2">
          <!-- Inst 1 Publications -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 class="text-sm font-bold text-gray-900">Publications · ${escapeHTML(i1.name)}</h4>
              <span class="text-xs font-mono text-teal-700 font-semibold">${filteredPubs1.length} papers</span>
            </div>
            <ul class="divide-y divide-gray-100">
              ${filteredPubs1.slice(0, 8).map(p => {
                const conf = p.conference?.acronym || p.conference || p.venue || '';
                const rank = p.core_rank || (p.conference && p.conference.core_rank) || '';
                const badgeClass = rank === 'A*' ? 'badge-a-star' : (rank === 'A' ? 'badge-a' : 'badge-journal');
                return `
                  <li class="py-2.5 space-y-1">
                    <p class="text-xs font-semibold text-gray-800 leading-snug">${escapeHTML(p.title)}</p>
                    <div class="flex items-center gap-2 text-2xs text-gray-500">
                      ${rank ? `<span class="px-1.5 py-0.2 rounded font-bold ${badgeClass}">${escapeHTML(rank)}</span>` : ''}
                      <span class="font-medium text-teal-700">${escapeHTML(conf)}</span>
                      <span>${escapeHTML(p.year || '')}</span>
                    </div>
                  </li>
                `;
              }).join('') || '<li class="py-4 text-xs text-gray-400 text-center">No publications match active filters</li>'}
            </ul>
          </div>

          <!-- Inst 2 Publications -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 class="text-sm font-bold text-gray-900">Publications · ${escapeHTML(i2.name)}</h4>
              <span class="text-xs font-mono text-blue-700 font-semibold">${filteredPubs2.length} papers</span>
            </div>
            <ul class="divide-y divide-gray-100">
              ${filteredPubs2.slice(0, 8).map(p => {
                const conf = p.conference?.acronym || p.conference || p.venue || '';
                const rank = p.core_rank || (p.conference && p.conference.core_rank) || '';
                const badgeClass = rank === 'A*' ? 'badge-a-star' : (rank === 'A' ? 'badge-a' : 'badge-journal');
                return `
                  <li class="py-2.5 space-y-1">
                    <p class="text-xs font-semibold text-gray-800 leading-snug">${escapeHTML(p.title)}</p>
                    <div class="flex items-center gap-2 text-2xs text-gray-500">
                      ${rank ? `<span class="px-1.5 py-0.2 rounded font-bold ${badgeClass}">${escapeHTML(rank)}</span>` : ''}
                      <span class="font-medium text-blue-700">${escapeHTML(conf)}</span>
                      <span>${escapeHTML(p.year || '')}</span>
                    </div>
                  </li>
                `;
              }).join('') || '<li class="py-4 text-xs text-gray-400 text-center">No publications match active filters</li>'}
            </ul>
          </div>
        </div>

      </div>
    `;

    // Attach chart toggle listeners
    const radarBtn = container.querySelector('#cmp-chart-radar-btn');
    const barBtn = container.querySelector('#cmp-chart-bar-btn');

    if (radarBtn && barBtn) {
      radarBtn.addEventListener('click', () => {
        this.chartType = 'radar';
        radarBtn.className = 'px-2.5 py-1 text-xs font-semibold rounded-md transition-all bg-white text-teal-700 shadow-sm';
        barBtn.className = 'px-2.5 py-1 text-xs font-semibold rounded-md transition-all text-gray-500 hover:text-gray-900';
        this._renderDisciplineChart(allDisciplineNames, areas1, areas2);
      });
      barBtn.addEventListener('click', () => {
        this.chartType = 'bar';
        barBtn.className = 'px-2.5 py-1 text-xs font-semibold rounded-md transition-all bg-white text-teal-700 shadow-sm';
        radarBtn.className = 'px-2.5 py-1 text-xs font-semibold rounded-md transition-all text-gray-500 hover:text-gray-900';
        this._renderDisciplineChart(allDisciplineNames, areas1, areas2);
      });
    }

    this._renderDisciplineChart(allDisciplineNames, areas1, areas2);
    this._renderTrendsChart();
  }

  _renderDisciplineChart(labels, areas1, areas2) {
    if (typeof Chart === 'undefined') return;

    const canvas = this.container.querySelector('#cmp-discipline-chart');
    if (!canvas) return;

    if (this.disciplineChart) {
      this.disciplineChart.destroy();
      this.disciplineChart = null;
    }

    const data1 = labels.map(l => Number(areas1[l] || 0));
    const data2 = labels.map(l => Number(areas2[l] || 0));

    if (this.chartType === 'radar') {
      this.disciplineChart = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [
            {
              label: this.inst1.name,
              data: data1,
              backgroundColor: 'rgba(13, 148, 136, 0.25)',
              borderColor: '#0d9488',
              pointBackgroundColor: '#0d9488',
              borderWidth: 2,
            },
            {
              label: this.inst2.name,
              data: data2,
              backgroundColor: 'rgba(59, 130, 246, 0.25)',
              borderColor: '#3b82f6',
              pointBackgroundColor: '#3b82f6',
              borderWidth: 2,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          },
          scales: {
            r: {
              angleLines: { color: '#f1f5f9' },
              grid: { color: '#f1f5f9' },
              pointLabels: { color: '#334155', font: { size: 10, weight: '600' } }
            }
          }
        }
      });
    } else {
      this.disciplineChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: this.inst1.name,
              data: data1,
              backgroundColor: 'rgba(13, 148, 136, 0.85)',
              borderRadius: 4,
            },
            {
              label: this.inst2.name,
              data: data2,
              backgroundColor: 'rgba(59, 130, 246, 0.85)',
              borderRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#334155', font: { size: 10, weight: '600' } }
            },
            y: {
              grid: { color: '#f1f5f9' },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            }
          }
        }
      });
    }
  }

  _renderTrendsChart() {
    if (typeof Chart === 'undefined') return;

    const canvas = this.container.querySelector('#cmp-trends-chart');
    if (!canvas) return;

    if (this.trendsChart) {
      this.trendsChart.destroy();
      this.trendsChart = null;
    }

    const t1 = [...this.inst1Trends].sort((a, b) => a.year - b.year);
    const t2 = [...this.inst2Trends].sort((a, b) => a.year - b.year);

    const yearsSet = new Set([...t1.map(x => x.year), ...t2.map(x => x.year)]);
    const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);

    const mapYearScore = (trendsList) => {
      const m = {};
      trendsList.forEach(item => { m[item.year] = item.score; });
      return sortedYears.map(yr => m[yr] !== undefined ? Number(m[yr]) : null);
    };

    this.trendsChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sortedYears,
        datasets: [
          {
            label: this.inst1.name,
            data: mapYearScore(t1),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.08)',
            pointBackgroundColor: '#0d9488',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
          },
          {
            label: this.inst2.name,
            data: mapYearScore(t2),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            pointBackgroundColor: '#3b82f6',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} pts`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FACULTY COMPARISON
  // ══════════════════════════════════════════════════════════════════════════

  _renderFacultySelectRow() {
    const name1 = this.fac1 ? escapeHTML(this.fac1.name) : 'Rajiv Ratn Shah';
    const name2 = this.fac2 ? escapeHTML(this.fac2.name) : 'Sunita Sarawagi';

    return `
      <div class="cmp-grid-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <!-- Faculty 1 (Teal Accent) -->
        <div class="relative">
          <div class="flex items-center justify-between mb-1.5">
            <label for="search-fac-1" class="text-xs text-teal-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Faculty Member 1 (Teal)
            </label>
            <span class="text-2xs text-gray-400">Click input for instant suggestions</span>
          </div>
          <div class="relative">
            <input
              type="text"
              id="search-fac-1"
              placeholder="Click for suggestions (e.g. Rajiv Ratn Shah) or type..."
              value="${name1}"
              autocomplete="off"
              class="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
            />
            <svg class="w-4 h-4 text-teal-600 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div id="results-fac-1" class="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 hidden max-h-72 overflow-y-auto"></div>
        </div>

        <!-- Faculty 2 (Blue Accent) -->
        <div class="relative">
          <div class="flex items-center justify-between mb-1.5">
            <label for="search-fac-2" class="text-xs text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Faculty Member 2 (Blue)
            </label>
            <span class="text-2xs text-gray-400">Click input for instant suggestions</span>
          </div>
          <div class="relative">
            <input
              type="text"
              id="search-fac-2"
              placeholder="Click for suggestions (e.g. Sunita Sarawagi) or type..."
              value="${name2}"
              autocomplete="off"
              class="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            <svg class="w-4 h-4 text-blue-600 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div id="results-fac-2" class="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 hidden max-h-72 overflow-y-auto"></div>
        </div>
      </div>
    `;
  }

  _attachFacultySelectors() {
    this._setupAutocomplete({
      inputId: 'search-fac-1',
      resultsId: 'results-fac-1',
      endpoint: 'faculty',
      suggestions: SUGGESTED_FACULTY,
      onSelect: async (item) => {
        this.fac1 = await fetchJSON(`${this.apiBase}/faculty/${item.id}/`);
        this._renderFacultyComparison();
      }
    });

    this._setupAutocomplete({
      inputId: 'search-fac-2',
      resultsId: 'results-fac-2',
      endpoint: 'faculty',
      suggestions: SUGGESTED_FACULTY,
      onSelect: async (item) => {
        this.fac2 = await fetchJSON(`${this.apiBase}/faculty/${item.id}/`);
        this._renderFacultyComparison();
      }
    });
  }

  _renderFacultyComparison() {
    const container = this.container.querySelector('#cmp-details-container');
    if (!container) return;

    if (!this.fac1 || !this.fac2) {
      container.innerHTML = `
        <div class="card p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <p class="text-sm font-semibold text-gray-600">Select Faculty Members</p>
          <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Select two faculty members above to analyze their verified publications and research metrics side-by-side.</p>
        </div>`;
      return;
    }

    const f1 = this.fac1;
    const f2 = this.fac2;

    const s1 = Number(f1.score || 0);
    const s2 = Number(f2.score || 0);
    const aStar1 = Number(f1.a_star_score || 0);
    const aStar2 = Number(f2.a_star_score || 0);
    const a1 = Number(f1.a_score || 0);
    const a2 = Number(f2.a_score || 0);

    // Extract publications from authorships
    const extractPubs = (fac) => {
      const pubs = [];
      (fac.authorships || []).forEach(a => {
        const p = a.publication;
        if (p) {
          const conf = p.venue || (typeof p.conference === 'object' ? p.conference.acronym : p.conference) || '';
          const rank = p.core_rank || (typeof p.conference === 'object' ? p.conference.core_rank : '') || '';
          pubs.push({
            title: p.title || '',
            year: p.year || '',
            venue: conf,
            rank: rank,
            credit: a.credit || 0,
            area: p.area || ''
          });
        }
      });
      return pubs;
    };

    const allPubs1 = extractPubs(f1);
    const allPubs2 = extractPubs(f2);

    const filterPubs = (pubs) => {
      let list = pubs.filter(p => {
        if (!matchesAreaFilter(p.area, this.areaFilter)) return false;
        if (!matchesRankFilter(p.rank, p.venue, this.rankFilter)) return false;
        if (!matchesYearFilter(p.year, this.yearFilter)) return false;
        return true;
      });

      if (this.sortByPubs === 'year_desc') {
        list.sort((a, b) => (b.year || 0) - (a.year || 0));
      } else if (this.sortByPubs === 'rank_desc') {
        const order = { 'A*': 1, 'A': 2, 'Journal': 3 };
        list.sort((a, b) => (order[a.rank] || 9) - (order[b.rank] || 9));
      } else if (this.sortByPubs === 'name_asc') {
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
      return list;
    };

    const pubs1 = filterPubs(allPubs1);
    const pubs2 = filterPubs(allPubs2);

    // Area overlaps
    const getBroadAreas = (areas) => {
      const s = new Set();
      (areas || []).forEach(code => {
        const b = AREA_TAXONOMY[code] || code;
        const info = BROAD_AREAS.find(x => x.id === b);
        if (info) s.add(info.name);
      });
      return Array.from(s);
    };

    const areas1 = getBroadAreas(f1.areas);
    const areas2 = getBroadAreas(f2.areas);
    const commonAreas = areas1.filter(a => areas2.includes(a));

    const renderAreaChips = (areas, isCommonList) => {
      return areas.map(a => {
        const isOverlap = isCommonList || commonAreas.includes(a);
        return `
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${isOverlap ? 'bg-teal-100 text-teal-900 border border-teal-200' : 'bg-gray-100 text-gray-700'}">
            ${escapeHTML(a)} ${isOverlap && !isCommonList ? '★' : ''}
          </span>
        `;
      }).join(' ');
    };

    const instName1 = typeof f1.institution === 'object' ? (f1.institution?.name || '') : (f1.institution || '');
    const instName2 = typeof f2.institution === 'object' ? (f2.institution?.name || '') : (f2.institution || '');

    container.innerHTML = `
      <div class="space-y-6">

        <!-- Scorecards Comparison (cmp-grid-2) -->
        <div class="cmp-grid-2">
          
          <!-- Faculty 1 Card (Teal) -->
          <div class="card p-6 bg-white rounded-2xl border-2 ${s1 > s2 ? 'border-teal-500 shadow-md ring-4 ring-teal-500/10' : 'border-teal-200 shadow-sm'} space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Faculty 1</span>
                <h3 class="text-xl sm:text-2xl font-black text-gray-900 mt-1">${escapeHTML(f1.name)}</h3>
                <p class="text-xs text-gray-500 mt-0.5 font-medium">${escapeHTML(f1.designation || 'Faculty Member')} · <span class="text-teal-700 font-semibold">${escapeHTML(instName1)}</span></p>
                ${f1.dblp_url ? `<a href="${escapeHTML(f1.dblp_url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-teal-600 hover:underline mt-1 inline-block">DBLP Profile ↗</a>` : ''}
              </div>
              <div class="text-right">
                <span class="text-3xl font-black text-teal-600 font-mono block">${s1.toFixed(2)}</span>
                <span class="text-2xs text-gray-400 font-bold uppercase tracking-wider block">Total Points</span>
                ${s1 > s2 ? '<span class="inline-block mt-1 text-2xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">Overall Leader</span>' : ''}
              </div>
            </div>
            
            <div>
              <p class="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Research Interests</p>
              <div class="flex flex-wrap gap-1.5">${renderAreaChips(areas1, false) || '<span class="text-xs text-gray-400">General Computer Science</span>'}</div>
            </div>
          </div>

          <!-- Faculty 2 Card (Blue) -->
          <div class="card p-6 bg-white rounded-2xl border-2 ${s2 > s1 ? 'border-blue-500 shadow-md ring-4 ring-blue-500/10' : 'border-blue-200 shadow-sm'} space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">Faculty 2</span>
                <h3 class="text-xl sm:text-2xl font-black text-gray-900 mt-1">${escapeHTML(f2.name)}</h3>
                <p class="text-xs text-gray-500 mt-0.5 font-medium">${escapeHTML(f2.designation || 'Faculty Member')} · <span class="text-blue-700 font-semibold">${escapeHTML(instName2)}</span></p>
                ${f2.dblp_url ? `<a href="${escapeHTML(f2.dblp_url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline mt-1 inline-block">DBLP Profile ↗</a>` : ''}
              </div>
              <div class="text-right">
                <span class="text-3xl font-black text-blue-600 font-mono block">${s2.toFixed(2)}</span>
                <span class="text-2xs text-gray-400 font-bold uppercase tracking-wider block">Total Points</span>
                ${s2 > s1 ? '<span class="inline-block mt-1 text-2xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">Overall Leader</span>' : ''}
              </div>
            </div>

            <div>
              <p class="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Research Interests</p>
              <div class="flex flex-wrap gap-1.5">${renderAreaChips(areas2, false) || '<span class="text-xs text-gray-400">General Computer Science</span>'}</div>
            </div>
          </div>

        </div>

        <!-- Head-to-Head Comparative Metric Matrix -->
        <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Head-to-Head Metric Performance</h3>
              <p class="text-xs text-gray-400">Direct comparison across publication points and CORE tiers</p>
            </div>
            <div class="flex items-center gap-3 text-xs font-bold">
              <span class="flex items-center gap-1 text-teal-700"><span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span> ${escapeHTML(f1.name)}</span>
              <span class="flex items-center gap-1 text-blue-700"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> ${escapeHTML(f2.name)}</span>
            </div>
          </div>
          
          <div class="space-y-4">
            
            <!-- Metric 1: Total Points -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${s1.toFixed(2)} pts</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">Total Weighted Score</span>
                <span class="text-blue-700 font-mono font-bold">${s2.toFixed(2)} pts</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(s1 / ((s1 + s2) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(s2 / ((s1 + s2) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 2: CORE A* Score -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${aStar1.toFixed(2)} pts</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">CORE A* Excellence</span>
                <span class="text-blue-700 font-mono font-bold">${aStar2.toFixed(2)} pts</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(aStar1 / ((aStar1 + aStar2) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(aStar2 / ((aStar1 + aStar2) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 3: CORE A Score -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${a1.toFixed(2)} pts</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">CORE A Publications</span>
                <span class="text-blue-700 font-mono font-bold">${a2.toFixed(2)} pts</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(a1 / ((a1 + a2) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(a2 / ((a1 + a2) || 1) * 100)}%;"></div>
              </div>
            </div>

            <!-- Metric 4: Total Papers -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-teal-700 font-mono font-bold">${allPubs1.length} papers</span>
                <span class="text-gray-500 uppercase text-2xs font-bold">Total Verified Papers</span>
                <span class="text-blue-700 font-mono font-bold">${allPubs2.length} papers</span>
              </div>
              <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="meter-fill-inst1 h-full" style="width: ${(allPubs1.length / ((allPubs1.length + allPubs2.length) || 1) * 100)}%;"></div>
                <div class="meter-fill-inst2 h-full" style="width: ${(allPubs2.length / ((allPubs1.length + allPubs2.length) || 1) * 100)}%;"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- Overlapping Research Disciplines -->
        ${commonAreas.length > 0 ? `
          <div class="card p-4 bg-teal-50/50 border border-teal-200 rounded-2xl text-xs space-y-1">
            <span class="font-bold text-teal-900 block flex items-center gap-1.5">
              <span>★</span> Shared Research Intersections (${commonAreas.length}):
            </span>
            <div class="flex flex-wrap gap-1.5 mt-1">${renderAreaChips(commonAreas, true)}</div>
          </div>
        ` : ''}

        <!-- Side-by-Side Filtered Publications List (cmp-grid-2) -->
        <div class="cmp-grid-2">
          <!-- Faculty 1 Publications -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 class="text-sm font-bold text-gray-900">Papers · ${escapeHTML(f1.name)}</h4>
              <span class="text-xs font-mono text-teal-700 font-semibold">${pubs1.length} papers</span>
            </div>
            <ul class="divide-y divide-gray-100">
              ${pubs1.slice(0, 10).map(p => {
                const badgeClass = p.rank === 'A*' ? 'badge-a-star' : (p.rank === 'A' ? 'badge-a' : 'badge-journal');
                return `
                  <li class="py-2.5 space-y-1">
                    <p class="text-xs font-semibold text-gray-800 leading-snug">${escapeHTML(p.title)}</p>
                    <div class="flex items-center gap-2 text-2xs text-gray-500">
                      ${p.rank ? `<span class="px-1.5 py-0.2 rounded font-bold ${badgeClass}">${escapeHTML(p.rank)}</span>` : ''}
                      <span class="font-medium text-teal-700">${escapeHTML(p.venue)}</span>
                      <span>${escapeHTML(p.year)}</span>
                      <span class="text-gray-400">· credit: ${Number(p.credit).toFixed(2)}</span>
                    </div>
                  </li>
                `;
              }).join('') || '<li class="py-4 text-xs text-gray-400 text-center">No publications match active filters</li>'}
            </ul>
          </div>

          <!-- Faculty 2 Publications -->
          <div class="card p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 class="text-sm font-bold text-gray-900">Papers · ${escapeHTML(f2.name)}</h4>
              <span class="text-xs font-mono text-blue-700 font-semibold">${pubs2.length} papers</span>
            </div>
            <ul class="divide-y divide-gray-100">
              ${pubs2.slice(0, 10).map(p => {
                const badgeClass = p.rank === 'A*' ? 'badge-a-star' : (p.rank === 'A' ? 'badge-a' : 'badge-journal');
                return `
                  <li class="py-2.5 space-y-1">
                    <p class="text-xs font-semibold text-gray-800 leading-snug">${escapeHTML(p.title)}</p>
                    <div class="flex items-center gap-2 text-2xs text-gray-500">
                      ${p.rank ? `<span class="px-1.5 py-0.2 rounded font-bold ${badgeClass}">${escapeHTML(p.rank)}</span>` : ''}
                      <span class="font-medium text-blue-700">${escapeHTML(p.venue)}</span>
                      <span>${escapeHTML(p.year)}</span>
                      <span class="text-gray-400">· credit: ${Number(p.credit).toFixed(2)}</span>
                    </div>
                  </li>
                `;
              }).join('') || '<li class="py-4 text-xs text-gray-400 text-center">No publications match active filters</li>'}
            </ul>
          </div>
        </div>

      </div>
    `;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOCOMPLETE & SUGGESTIONS HELPER
  // ══════════════════════════════════════════════════════════════════════════

  _setupAutocomplete({ inputId, resultsId, endpoint, suggestions, onSelect }) {
    const input = this.container.querySelector(`#${inputId}`);
    const resultsDiv = this.container.querySelector(`#${resultsId}`);
    if (!input || !resultsDiv) return;

    let debounce = null;

    const renderDropdownList = (items, isSuggested = false) => {
      if (items.length === 0) {
        resultsDiv.innerHTML = `<p class="p-3 text-xs text-gray-400 text-center">No matching results found.</p>`;
        resultsDiv.classList.remove('hidden');
        return;
      }

      const headerHTML = isSuggested ? `
        <div class="px-3.5 py-2 bg-gray-50 border-b border-gray-100 text-2xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
          <span>✨ Featured Suggestions</span>
          <span class="text-3xs text-teal-600 font-semibold">Quick Select</span>
        </div>` : '';

      resultsDiv.innerHTML = `
        ${headerHTML}
        ${items.map(item => {
          const name = escapeHTML(item.name || item.full_name || '');
          const sub = escapeHTML(item.subtitle || item.inst || (typeof item.institution === 'object' ? item.institution?.name : item.institution) || item.designation || '');
          const score = item.score ? `<span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">${Number(item.score).toFixed(2)} pts</span>` : '';
          const isFeatured = item.featured ? `<span class="px-1.5 py-0.5 rounded text-3xs font-bold bg-teal-600 text-white uppercase ml-1.5">Featured</span>` : '';

          return `
            <button
              type="button"
              class="w-full text-left px-3.5 py-2.5 hover:bg-teal-50/60 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between gap-2"
              data-item='${JSON.stringify({ id: item.id, name: item.name })}'
            >
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-gray-800 flex items-center truncate">
                  ${name} ${isFeatured}
                </p>
                ${sub ? `<p class="text-xs-plus text-gray-400 mt-0.5 truncate">${sub}</p>` : ''}
              </div>
              ${score}
            </button>
          `;
        }).join('')}
      `;
      resultsDiv.classList.remove('hidden');

      resultsDiv.querySelectorAll('button[data-item]').forEach(btn => {
        btn.addEventListener('click', () => {
          const data = JSON.parse(btn.dataset.item);
          input.value = data.name;
          resultsDiv.classList.add('hidden');
          onSelect(data);
        });
      });
    };

    // Show suggestions on focus / click
    const showSuggestions = () => {
      if (!input.value.trim()) {
        renderDropdownList(suggestions, true);
      }
    };

    input.addEventListener('focus', showSuggestions);
    input.addEventListener('click', showSuggestions);

    // Live dynamic search when typing
    const performSearch = async (val) => {
      if (!val.trim()) {
        renderDropdownList(suggestions, true);
        return;
      }

      try {
        const data = await fetchJSON(`${this.apiBase}/${endpoint}/?search=${encodeURIComponent(val.trim())}`);
        const items = Array.isArray(data) ? data : (data?.results || []);
        renderDropdownList(items.slice(0, 10), false);
      } catch (e) {
        console.error(`[SPARK] autocomplete error for ${endpoint}:`, e);
      }
    };

    input.addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => performSearch(e.target.value), 250);
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
        resultsDiv.classList.add('hidden');
      }
    });
  }
}
