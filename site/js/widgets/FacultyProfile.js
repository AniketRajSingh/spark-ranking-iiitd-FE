// widgets/FacultyProfile.js — SPARK Faculty Profile
// No hardcoded IDs. XSS-safe. Research area chips, DBLP/Scholar links, score breakdown.

import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { renderErrorCard } from '../utils/errorCard.js';

export default class FacultyProfileWidget {
  constructor(containerSelector, apiBase) {
    this.container = document.querySelector(containerSelector);
    this.apiBase   = apiBase;
    if (!this.container) return;
    this.init();
  }

  async init() {
    const params    = new URLSearchParams(window.location.search);
    const facultyId = params.get('id');

    if (!facultyId) {
      this.container.innerHTML = `
        <div class="error-card bg-red-50 border border-red-100 rounded-xl p-6 text-center" role="alert">
          <p class="text-sm font-medium text-red-700">No faculty ID provided in the URL.</p>
        </div>`;
      return;
    }

    if (!this.apiBase) {
      renderErrorCard(this.container, 'No API configured. Set API_BASE in env.js.', null);
      return;
    }

    // Skeleton while loading
    this.container.innerHTML = `
      <div class="card p-6 mb-4 space-y-3 animate-pulse">
        <div class="skeleton h-8 w-1/2 bg-gray-200 rounded"></div>
        <div class="skeleton h-4 w-1/3 bg-gray-200 rounded"></div>
        <div class="skeleton h-4 w-full bg-gray-200 rounded mt-3"></div>
        <div class="skeleton h-4 w-4/5 bg-gray-200 rounded"></div>
      </div>`;

    try {
      const data = await fetchJSON(`${this.apiBase}/faculty/${facultyId}/`);
      if (!data) throw new Error('Empty response');
      this.render(data);
    } catch (e) {
      console.error('[SPARK] Faculty fetch failed:', e);
      renderErrorCard(this.container, 'Could not load faculty profile.', () => this.init());
    }
  }

  render(data) {
    const name  = escapeHTML(data.name || data.full_name || 'Unknown Faculty');
    const bio   = escapeHTML(data.bio || data.description || 'No biography available.');
    const inst  = escapeHTML(
      typeof data.institution === 'object'
        ? (data.institution?.name || '')
        : (data.institution || data.institution_name || '')
    );
    const instId = data.institution?.id || data.institution_id || '';

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    // External links
    const dblpUrl    = data.dblp_url    || data.dblp_link    || null;
    const scholarUrl = data.scholar_url || data.scholar_link || data.google_scholar || null;

    // Research area chips
    const areas = Array.isArray(data.areas) ? data.areas
      : (data.research_areas || data.area ? [data.area] : []);
    const areaChips = areas.map(a => {
      const label = typeof a === 'object' ? (a.name || a.code || String(a)) : String(a);
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">${escapeHTML(label)}</span>`;
    }).join('');

    // Score breakdown
    const totalScore = data.score != null ? Number(data.score).toFixed(2) : null;
    const aStarPts   = data.a_star_score  != null ? Number(data.a_star_score).toFixed(2)  : null;
    const aPts       = data.a_score       != null ? Number(data.a_score).toFixed(2)        : null;

    // Publications list
    let pubs = data.publications || data.pubs || [];
    if (!pubs.length && Array.isArray(data.authorships)) {
      pubs = data.authorships.map(a => {
        const p = a.publication || a;
        return {
          title: p.title || '',
          year: p.year || '',
          conference: p.conference || p.venue || '',
          core_rank: p.core_rank || p.rank || '',
        };
      }).filter(p => p.title);
    }

    const pubsHTML = pubs.length
      ? pubs.map(p => {
          const title = escapeHTML(p.title || '');
          const year  = escapeHTML(p.year  || '');
          const conf  = escapeHTML(p.conference?.acronym || p.conference || p.venue || '');
          const core  = escapeHTML(p.core_rank || (p.conference && p.conference.core_rank) || '');
          const coreBadge = core
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0
                ${core === 'A*' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                ${core}
              </span>`
            : '';
          return `
            <li class="py-3.5 border-b border-gray-100 last:border-0">
              <div class="flex items-start gap-2.5">
                ${coreBadge}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 leading-snug">${title}</p>
                  <p class="text-xs text-gray-400 mt-1">
                    ${conf ? `<span class="font-semibold text-teal-600">${conf}</span> · ` : ''}${year}
                  </p>
                </div>
              </div>
            </li>`;
        }).join('')
      : `<li class="text-sm text-gray-400 py-3">No publications found.</li>`;

    this.container.innerHTML = `
      <!-- Profile header -->
      <div class="card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">${name}</h1>
            ${inst ? `<a href="${prefix}pages/institution.html?id=${escapeHTML(instId)}"
              class="text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline mt-1.5 inline-block">${inst}</a>` : ''}

            <!-- Area chips -->
            ${areaChips ? `<div class="flex flex-wrap gap-2 mt-4">${areaChips}</div>` : ''}

            <!-- Bio -->
            ${bio ? `<p class="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">${bio}</p>` : ''}

            <!-- External links -->
            <div class="flex items-center gap-3 mt-5 flex-wrap">
              ${dblpUrl ? `<a href="${escapeHTML(dblpUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                DBLP Profile
              </a>` : ''}
              ${scholarUrl ? `<a href="${escapeHTML(scholarUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Google Scholar
              </a>` : ''}
            </div>
          </div>

          <!-- Score breakdown -->
          ${totalScore ? `
            <div class="flex flex-col gap-2 sm:items-end flex-shrink-0">
              <div class="stat-card w-32 text-center bg-teal-50/55 border border-teal-100/60 rounded-xl p-3">
                <span class="text-xs text-gray-400 font-semibold block uppercase tracking-wider">SPARK Score</span>
                <span class="text-2xl font-black text-teal-600 block mt-0.5">${totalScore}</span>
              </div>
              <div class="text-[11px] text-gray-400 space-y-0.5 sm:text-right mt-1 font-medium">
                ${aStarPts ? `<p>A* papers: <strong class="text-yellow-700 font-semibold">${aStarPts} pts</strong></p>` : ''}
                ${aPts     ? `<p>A papers: <strong class="text-blue-700 font-semibold">${aPts} pts</strong></p>` : ''}
              </div>
            </div>` : ''}
        </div>
      </div>

      <!-- Publications -->
      <div class="card p-6">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <h2 class="text-lg font-bold text-gray-800">Publications</h2>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${pubs.length} papers</span>
        </div>
        <ul class="divide-y divide-gray-100">${pubsHTML}</ul>
      </div>
    `;
  }
}
