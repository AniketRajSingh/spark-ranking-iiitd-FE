// widgets/InstitutionProfile.js — SPARK Institution Profile
// Fetches from API by ?id= param. XSS-safe. No hardcoded IDs.
// Includes Chart.js visualizations for trends and area distributions, and paginated publications.

import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { renderErrorCard } from '../utils/errorCard.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';

export default class InstitutionProfileWidget {
  constructor(containerSelector, apiBase) {
    this.container = document.querySelector(containerSelector);
    this.apiBase   = apiBase;
    this.pubPage   = 1;
    this.pubPageSize = 10;
    this.pubData = [];

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
      // Fetch in parallel: institution profile details, score trends, and publications
      const [instData, trendsData, pubData] = await Promise.all([
        fetchJSON(`${this.apiBase}/institutions/${instId}/`),
        fetchJSON(`${this.apiBase}/institutions/${instId}/trends/`),
        fetchJSON(`${this.apiBase}/publications/?institution=${instId}`)
      ]);

      if (!instData) throw new Error('Empty institution response');

      // Map publications
      const pubsList = Array.isArray(pubData) ? pubData : (pubData?.results || pubData?.publications || []);
      this.pubData = pubsList;

      // Extract trends
      const trends = Array.isArray(trendsData) ? trendsData : [];

      // Extract area breakdown/scores from instData
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

    // Render top faculty
    const topFacultyHTML = Array.isArray(data.top_faculty) && data.top_faculty.length
      ? data.top_faculty.map(f => `
          <li class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 rounded transition-colors">
            <a href="${prefix}pages/faculty-profile.html?id=${escapeHTML(f.id)}"
               class="text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline">
              ${escapeHTML(f.name)}
            </a>
            <span class="text-xs font-mono font-medium text-gray-500 tabular-nums">${escapeHTML(Number(f.score || 0).toFixed(2))} pts</span>
          </li>`).join('')
      : `<li class="text-sm text-gray-400 py-3">No faculty data available.</li>`;

    // Outer layout structure
    this.container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column (Main Info & Lists) -->
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
              
              <!-- Big Stat Medals -->
              ${rank || score ? `
                <div class="flex gap-4 sm:flex-col sm:items-end flex-shrink-0">
                  ${rank ? `
                    <div class="stat-card w-32 text-center bg-teal-50/55 border border-teal-100/60 rounded-xl p-3">
                      <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">National Rank</span>
                      <span class="text-2xl font-black text-teal-600 block mt-0.5">#${rank}</span>
                    </div>` : ''}
                  ${score ? `
                    <div class="stat-card w-32 text-center bg-teal-50/55 border border-teal-100/60 rounded-xl p-3 relative group">
                      <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">
                        SPARK Score
                        <a href="${prefix}pages/methodology.html#computing-scores" class="inline-flex items-center text-teal-500 hover:text-teal-700 ml-0.5" title="View Scoring Methodology">
                          <svg class="w-3.5 h-3.5 inline-block align-text-top" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
                          </svg>
                        </a>
                      </span>
                      <span class="text-2xl font-black text-teal-600 block mt-0.5">${score}</span>
                      <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 w-44 text-center leading-normal shadow-md z-10">
                        Calculated as the geometric mean across positive research areas. Click icon to learn more.
                      </div>
                    </div>` : ''}
                </div>` : ''}
            </div>
          </div>

          <!-- Top Faculty List -->
          <div class="card p-6">
            <h2 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-3">Top Faculty</h2>
            <ul class="divide-y divide-gray-100">
              ${topFacultyHTML}
            </ul>
            <div class="mt-4 pt-3 border-t border-gray-100">
              <a href="${prefix}pages/faculty.html" class="inline-flex items-center text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline gap-1">
                View all faculty <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <!-- Publications Listing -->
          <div class="card p-6">
            <h2 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-3">Publications</h2>
            <div id="pubs-list-container">
              <!-- Rendered dynamically below -->
            </div>
          </div>

        </div>

        <!-- Right Column (Charts & Stats) -->
        <div class="space-y-6">

          <!-- Trends Chart -->
          <div class="card p-6">
            <h2 class="text-base font-bold text-gray-800 mb-4">Score Trends</h2>
            <div class="relative h-48 w-full">
              <canvas id="trends-chart"></canvas>
            </div>
          </div>

          <!-- Research Area Distribution Chart -->
          <div class="card p-6">
            <h2 class="text-base font-bold text-gray-800 mb-4">Area Breakdown</h2>
            <div class="relative h-64 w-full">
              <canvas id="areas-chart"></canvas>
            </div>
          </div>

        </div>

      </div>
    `;

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

  _renderPublications() {
    const container = this.container.querySelector('#pubs-list-container');
    if (!container) return;

    if (!this.pubData || this.pubData.length === 0) {
      container.innerHTML = `<p class="text-sm text-gray-400 py-3">No publications found.</p>`;
      return;
    }

    const startIdx = (this.pubPage - 1) * this.pubPageSize;
    const endIdx = startIdx + this.pubPageSize;
    const pageItems = this.pubData.slice(startIdx, endIdx);
    const totalPages = Math.ceil(this.pubData.length / this.pubPageSize);

    const pubsHTML = pageItems.map(p => {
      const title = escapeHTML(p.title || '');
      const year  = escapeHTML(p.year  || '');
      const conf  = escapeHTML(p.conference?.acronym || p.conference || p.venue || '');
      const core  = escapeHTML(p.core_rank || (p.conference && p.conference.core_rank) || '');
      let coreBadge = '';
      if (core && core !== 'Unknown') {
        coreBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0
            ${core === 'A*' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
            ${core}
          </span>`;
      } else if (conf) {
        const fullName = escapeHTML(p.conference?.full_name || '');
        const isTrans = conf.toLowerCase().includes('trans') || fullName.toLowerCase().includes('transactions');
        const isJournal = conf.toLowerCase().includes('journal') || conf.toLowerCase().includes('commu') || fullName.toLowerCase().includes('letters');
        if (isTrans) {
          coreBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 bg-slate-100 text-slate-700">
                        Transaction
                      </span>`;
        } else if (isJournal) {
          coreBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 bg-slate-100 text-slate-700">
                        Journal
                      </span>`;
        }
      }
      return `
        <li class="py-3 border-b border-gray-100 last:border-0 flex items-start gap-2.5">
          ${coreBadge}
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-gray-800 leading-snug">${title}</h4>
            <p class="text-xs text-gray-400 mt-1">
              ${conf ? `<span class="font-medium text-teal-600">${conf}</span> · ` : ''}${year}
            </p>
          </div>
        </li>`;
    }).join('');

    container.innerHTML = `
      <ul class="divide-y divide-gray-50 mb-4">
        ${pubsHTML}
      </ul>
      <div class="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <span class="text-xs text-gray-400">Page ${this.pubPage} of ${totalPages} (${this.pubData.length} total)</span>
        <div class="flex gap-2">
          <button id="pub-prev" ${this.pubPage === 1 ? 'disabled' : ''}
            class="px-2.5 py-1 text-xs font-semibold rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors">
            Prev
          </button>
          <button id="pub-next" ${this.pubPage === totalPages ? 'disabled' : ''}
            class="px-2.5 py-1 text-xs font-semibold rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors">
            Next
          </button>
        </div>
      </div>
    `;

    const prevBtn = container.querySelector('#pub-prev');
    const nextBtn = container.querySelector('#pub-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { this.pubPage--; this._renderPublications(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { this.pubPage++; this._renderPublications(); });
  }

  _renderCharts(trends, areaScores) {
    if (typeof Chart === 'undefined') {
      console.warn('[SPARK] Chart.js is not loaded.');
      return;
    }

    // 1. Trends Line Chart
    const trendsCanvas = this.container.querySelector('#trends-chart');
    if (trendsCanvas && trends.length > 0) {
      const sortedTrends = [...trends].sort((a, b) => a.year - b.year);
      new Chart(trendsCanvas, {
        type: 'line',
        data: {
          labels: sortedTrends.map(t => t.year),
          datasets: [{
            label: 'Score',
            data: sortedTrends.map(t => t.score),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: '#f3f4f6' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } }
          }
        }
      });
    }

    // 2. Area Bar Chart
    const areasCanvas = this.container.querySelector('#areas-chart');
    if (areasCanvas && areaScores && Object.keys(areaScores).length > 0) {
      const labels = Object.keys(areaScores);
      const data = Object.values(areaScores);
      new Chart(areasCanvas, {
        type: 'bar',
        data: {
          labels: labels.map(l => l.toUpperCase()),
          datasets: [{
            data: data,
            backgroundColor: 'rgba(13, 148, 136, 0.75)',
            hoverBackgroundColor: 'rgba(13, 148, 136, 0.95)',
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: '#f3f4f6' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: '#4b5563', font: { size: 10, weight: 'bold' } } }
          }
        }
      });
    }
  }
}
