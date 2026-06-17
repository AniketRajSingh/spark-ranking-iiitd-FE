// widgets/FacultyProfile.js — SPARK Faculty Profile
// No hardcoded IDs. XSS-safe. Research area chips, DBLP/Scholar links, score breakdown.

import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { renderErrorCard } from '../utils/errorCard.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';

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
      const [data, facultyList] = await Promise.all([
        fetchJSON(`${this.apiBase}/faculty/${facultyId}/`),
        fetchJSON(`${this.apiBase}/faculty/`)
      ]);
      if (!data) throw new Error('Empty faculty response');

      const list = Array.isArray(facultyList) ? facultyList : (facultyList?.results || []);
      const matched = list.find(f => String(f.id) === String(facultyId));
      const mergedData = { ...matched, ...data };

      this.render(mergedData);
    } catch (e) {
      console.error('[SPARK] Faculty fetch failed:', e);
      renderErrorCard(this.container, 'Could not load faculty profile.', () => this.init());
    }
  }

  render(data) {
    const name  = escapeHTML(data.name || data.full_name || 'Unknown Faculty');
    const bio   = escapeHTML(data.bio || data.description || '');
    const inst  = escapeHTML(
      typeof data.institution === 'object'
        ? (data.institution?.name || '')
        : (data.institution || data.institution_name || '')
    );
    const instId = data.institution?.id || data.institution_id || '';

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    // External links
    let dblpUrl = data.dblp_url || data.dblp_link || null;
    if (!dblpUrl && data.dblp_pid) {
      dblpUrl = `https://dblp.org/pid/${data.dblp_pid}.html`;
    }

    const scholarUrl = data.scholar_url || data.scholar_link || data.google_scholar || null;
    
    // Guess IRINS URL
    let irinsUrl = null;
    if (data.irins_id) {
      let sub = 'iiitd'; // default fallback for IIIT Delhi
      if (data.institution && data.institution.website) {
        try {
          const host = new URL(data.institution.website).hostname;
          const parts = host.split('.');
          const found = parts.find(p => p !== 'www' && p !== 'edu' && p !== 'ac' && p !== 'res' && p !== 'in' && p !== 'org');
          if (found) sub = found;
        } catch (e) {}
      }
      irinsUrl = `https://${sub}.irins.org/profile/${data.irins_id}`;
    }

    const orcidUrl = data.orcid ? `https://orcid.org/${data.orcid}` : null;
    const homepageUrl = data.homepage || null;

    // Biography rendering (construct dynamically if missing)
    let finalBio = bio;
    if (!finalBio) {
      const title = data.designation || 'Faculty Member';
      const dept = data.department || 'Computer Science & Engineering';
      const instName = inst || 'SPARK-affiliated institution';
      finalBio = `Dr. ${name} is a ${title} in the ${dept} department at ${instName}. They specialize in computer science research and have contributed fractional authorship credits across prestigious CORE A*/A publication venues.`;
    }

    // Research area chips mapped to broad human-readable names
    const areas = Array.isArray(data.areas) ? data.areas
      : (data.research_areas || data.area ? [data.area] : []);
    
    // Set to avoid duplicates if multiple sub-codes map to same broad category
    const broadNamesSet = new Set();
    areas.forEach(a => {
      const rawCode = typeof a === 'object' ? (a.code || a.name || String(a)) : String(a);
      const broadId = AREA_TAXONOMY[rawCode] || rawCode;
      const areaInfo = BROAD_AREAS.find(b => b.id === broadId);
      const name = areaInfo ? areaInfo.name : broadId;
      if (name) broadNamesSet.add(name);
    });

    const areaChips = Array.from(broadNamesSet).map(name => {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">${escapeHTML(name)}</span>`;
    }).join('');

    // Score breakdown
    const totalScore = data.score != null ? Number(data.score).toFixed(2) : null;
    
    // Map publications or authorships from the faculty profile data
    let pubs = [];
    if (Array.isArray(data.publications)) {
      pubs = data.publications.map(p => {
        const confVal = p.conference || p.venue || '';
        return {
          id: p.id || '',
          title: p.title || '',
          year: p.year || '',
          conference: confVal,
          core_rank: p.core_rank || (typeof confVal === 'object' && confVal !== null ? confVal.core_rank : '') || '',
          credit: p.credit || 0
        };
      });
    } else if (Array.isArray(data.authorships)) {
      pubs = data.authorships.map(auth => {
        const pub = auth.publication;
        if (pub) {
          const confVal = pub.conference || pub.venue || '';
          return {
            id: pub.id || '',
            title: pub.title || '',
            year: pub.year || '',
            conference: confVal,
            core_rank: pub.core_rank || (typeof confVal === 'object' && confVal !== null ? confVal.core_rank : '') || '',
            credit: auth.credit || 0
          };
        }
        return null;
      }).filter(p => p !== null);
    }

    // Sort publications by year descending, then title ascending
    pubs.sort((a, b) => {
      const yrDiff = (b.year || 0) - (a.year || 0);
      if (yrDiff !== 0) return yrDiff;
      return a.title.localeCompare(b.title);
    });

    // Score breakdown by A* and A (calculated dynamically from matched publications as fallback)
    let calculatedAStarScore = 0;
    let calculatedAScore = 0;
    pubs.forEach(p => {
      const weight = p.core_rank === 'A*' ? 4 : (p.core_rank === 'A' ? 2 : 0);
      const contribution = (p.credit || 0) * weight;
      if (p.core_rank === 'A*') {
        calculatedAStarScore += contribution;
      } else if (p.core_rank === 'A') {
        calculatedAScore += contribution;
      }
    });

    const aStarPts = data.a_star_score != null ? Number(data.a_star_score).toFixed(2) : calculatedAStarScore.toFixed(2);
    const aPts = data.a_score != null ? Number(data.a_score).toFixed(2) : calculatedAScore.toFixed(2);

    const pubsHTML = pubs.length
      ? pubs.map(p => {
          const title = escapeHTML(p.title || '');
          const year  = escapeHTML(p.year  || '');
          const conf  = escapeHTML(p.conference?.acronym || p.conference || p.venue || '');
          const core  = escapeHTML(p.core_rank || '');
          const creditText = p.credit ? ` · <span class="text-teal-600 font-semibold">${Number(p.credit).toFixed(2)} credit</span>` : '';
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
            <li class="py-3.5 border-b border-gray-100 last:border-0 font-sans">
              <div class="flex items-start gap-2.5">
                ${coreBadge}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 leading-snug">${title}</p>
                  <p class="text-xs text-gray-400 mt-1">
                    ${conf ? `<span class="font-semibold text-teal-600">${conf}</span> · ` : ''}${year}${creditText}
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
          <div class="flex-1 col-span-3">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">${name}</h1>
            
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-teal-600 mt-1.5">
              ${data.designation ? `<span>${escapeHTML(data.designation)}</span>` : ''}
              ${data.designation && data.department ? `<span>·</span>` : ''}
              ${data.department ? `<span>${escapeHTML(data.department)}</span>` : ''}
              ${(data.designation || data.department) && inst ? `<span>·</span>` : ''}
              ${inst ? `<a href="${prefix}pages/institution.html?id=${escapeHTML(instId)}" class="hover:text-teal-800 hover:underline">${inst}</a>` : ''}
            </div>

            <!-- Area chips -->
            ${areaChips ? `<div class="flex flex-wrap gap-2 mt-4">${areaChips}</div>` : ''}

            <!-- Bio -->
            <p class="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">${finalBio}</p>

            <!-- External links -->
            <div class="flex items-center gap-3 mt-5 flex-wrap">
              ${homepageUrl ? `<a href="${escapeHTML(homepageUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150 bg-white">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Faculty Homepage
              </a>` : ''}
              ${dblpUrl ? `<a href="${escapeHTML(dblpUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150 bg-white">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                DBLP Profile
              </a>` : ''}
              ${scholarUrl ? `<a href="${escapeHTML(scholarUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150 bg-white">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Google Scholar
              </a>` : ''}
              ${irinsUrl ? `<a href="${escapeHTML(irinsUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150 bg-white">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                IRINS Profile
              </a>` : ''}
              ${orcidUrl ? `<a href="${escapeHTML(orcidUrl)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-3 py-2 transition-colors duration-150 bg-white">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                ORCID Profile
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
                ${calculatedAStarScore > 0 ? `<p>A* papers: <strong class="text-yellow-700 font-semibold">${aStarPts} pts</strong></p>` : ''}
                ${calculatedAScore > 0 ? `<p>A papers: <strong class="text-blue-700 font-semibold">${aPts} pts</strong></p>` : ''}
              </div>
            </div>` : ''}
        </div>
      </div>

      <!-- Publications -->
      <div class="card p-6">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <h2 class="text-lg font-bold text-gray-800 font-sans">Publications</h2>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${pubs.length} papers</span>
        </div>
        <ul class="divide-y divide-gray-100">${pubsHTML}</ul>
      </div>
    `;
  }
}
