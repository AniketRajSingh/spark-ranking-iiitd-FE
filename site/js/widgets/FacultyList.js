// widgets/FacultyList.js — SPARK Faculty Listing Widget
// XSS-safe. Backend-only. Module-scoped state (no window globals).

import { escapeHTML } from '../utils/sanitize.js';
import { clearBusy } from '../utils/errorCard.js';
import { renderPaginationHTML, attachPaginationListeners } from './Pagination.js';

export default class FacultyListWidget {
  constructor(containerId, filters, serverTopData = null, searchQuery = '') {
    this.containerId   = containerId;
    this.container     = document.getElementById(containerId);
    this.filters       = filters;
    this.serverTopData = serverTopData;
    this.searchQuery   = searchQuery;
    this.pageSize      = 20;
    this.page          = 1;
    if (!this.container) return;
    this.render();
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.innerHTML = '';

    let flat = [];

    let rawList = [];
    let isLegacyLoop = false;

    if (Array.isArray(this.serverTopData)) {
      rawList = this.serverTopData;
    } else if (this.serverTopData && Array.isArray(this.serverTopData.results)) {
      rawList = this.serverTopData.results;
    } else if (this.serverTopData && Array.isArray(this.serverTopData.faculty)) {
      rawList = this.serverTopData.faculty;
    } else if (this.serverTopData && Array.isArray(this.serverTopData.institutions) && this.serverTopData.institutions.length) {
      isLegacyLoop = true;
    }

    if (isLegacyLoop) {
      this.serverTopData.institutions.forEach(inst => {
        const instObj  = inst.institution || inst;
        const instRank = inst.rank || null;
        (inst.top_faculty || []).forEach(f => {
          flat.push({
            id:           f.id,
            name:         f.name,
            score:        f.score || 0,
            institution:  { id: instObj.id, name: instObj.name },
            instRank,
          });
        });
      });
    } else if (rawList && rawList.length) {
      flat = rawList.map(f => {
        const instObj = (typeof f.institution === 'object' && f.institution !== null)
          ? f.institution
          : { id: f.institution_id || '', name: f.institution || '' };
        const instRank = f.institution_rank || f.institution?.rank || f.inst_rank || null;
        return {
          id:           f.id,
          name:         f.name || f.faculty_name || '',
          score:        f.score || 0,
          institution:  instObj,
          instRank,
        };
      });
    }


    if (flat.length === 0) {
      const emptyMsg = this.searchQuery
        ? `No faculty found matching "${escapeHTML(this.searchQuery)}"`
        : "No faculty data available for the selected filters.";
      container.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
          </svg>
          <p class="text-sm">${emptyMsg}</p>
        </div>`;
      clearBusy(container);
      return;
    }

    flat.sort((a, b) => (b.score || 0) - (a.score || 0));

    const totalPages = Math.ceil(flat.length / this.pageSize);
    if (this.page > totalPages) this.page = totalPages;
    if (this.page < 1) this.page = 1;

    const startIdx = (this.page - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageItems = flat.slice(startIdx, endIdx);

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    const rows = pageItems.map((f, idx) => `
      <li class="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 rounded-lg transition-colors duration-150">
        <span class="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-semibold text-gray-400 mt-0.5">
          ${startIdx + idx + 1}
        </span>
        <div class="flex-1 min-w-0">
          <a href="${prefix}pages/faculty-profile.html?id=${escapeHTML(f.id)}"
             class="text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline transition-colors">
            ${escapeHTML(f.name)}
          </a>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-500">${escapeHTML(f.institution?.name || '')}</span>
            ${f.instRank ? `<span class="text-xs text-gray-400">· Inst. rank #${escapeHTML(f.instRank)}</span>` : ''}
          </div>
        </div>
        <span class="flex-shrink-0 text-xs font-semibold tabular-nums text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
          ${Number(f.score || 0).toFixed(2)} pts
        </span>
      </li>`).join('');

    const paginationHTML = renderPaginationHTML({
      currentPage: this.page,
      totalPages: totalPages,
      totalItems: flat.length,
      pageSize: this.pageSize,
      idPrefix: 'faculty-pagination',
    });

    container.innerHTML = `
      <div>
        <ul class="divide-y divide-gray-100 px-1">
          ${rows}
        </ul>
        ${paginationHTML}
      </div>`;

    clearBusy(container);

    attachPaginationListeners(container, (newPage) => {
      this.page = newPage;
      this.render();
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 'faculty-pagination');
  }
}
