// widgets/RankingTable.js — SPARK Institution Ranking Table
// Features: sort indicators (▲/▼), rank medals (top 3), accessible rows
//           (tabindex + keyboard nav), XSS-safe rendering via escapeHTML.

import { escapeHTML } from '../utils/sanitize.js';
import { clearBusy } from '../utils/errorCard.js';

export default class RankingTableWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.sortBy = 'rank';
    this.sortOrder = 'asc';
    this.data = [];

    if (!this.container) {
      console.error(`[SPARK] RankingTableWidget: #${containerId} not found`);
    }
  }

  setData(newData, searchQuery = '') {
    this.data = newData || [];
    this.searchQuery = searchQuery;
    this.sortBy = 'rank';
    this.sortOrder = 'asc';
    this.render();
  }

  _sorted() {
    return [...this.data].sort((a, b) => {
      let valA, valB;
      if (this.sortBy === 'name') {
        valA = (a.institution?.name || '').toLowerCase();
        valB = (b.institution?.name || '').toLowerCase();
      } else {
        valA = a[this.sortBy] ?? 0;
        valB = b[this.sortBy] ?? 0;
      }
      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  _sortIcon(col) {
    if (this.sortBy !== col) {
      return `<span class="ml-1 text-gray-300" aria-hidden="true">↕</span>`;
    }
    return this.sortOrder === 'asc'
      ? `<span class="ml-1 text-teal-600" aria-hidden="true">▲</span>`
      : `<span class="ml-1 text-teal-600" aria-hidden="true">▼</span>`;
  }

  _rankBadge(rank) {
    if (rank === 1) return `<span class="rank-badge rank-1" title="Rank 1" aria-label="Rank 1">🥇</span>`;
    if (rank === 2) return `<span class="rank-badge rank-2" title="Rank 2" aria-label="Rank 2">🥈</span>`;
    if (rank === 3) return `<span class="rank-badge rank-3" title="Rank 3" aria-label="Rank 3">🥉</span>`;
    return `<span class="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">${escapeHTML(rank)}</span>`;
  }

  _ariaSortAttr(col) {
    if (this.sortBy !== col) return 'aria-sort="none"';
    return this.sortOrder === 'asc' ? 'aria-sort="ascending"' : 'aria-sort="descending"';
  }

  render() {
    if (!this.container) return;

    const isSubpage = window.location.pathname.includes('/pages/');
    const prefix = isSubpage ? '../' : './';

    if (!this.data || this.data.length === 0) {
      const emptyMsg = this.searchQuery
        ? `No institutions found matching "${escapeHTML(this.searchQuery)}"`
        : "No ranking data available for the selected filters.";
      this.container.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2v-1a4 4 0 014-4h1"/>
          </svg>
          <p class="text-sm">${emptyMsg}</p>
        </div>`;
      clearBusy(this.container);
      return;
    }

    const rows = this._sorted().map(r => {
      const instName = escapeHTML(r.institution?.name || r.institution || '');
      const instId   = escapeHTML(r.institution?.id   || '');
      const score    = escapeHTML(r.score);
      const href     = `${prefix}pages/institution.html?id=${instId}`;

      return `
        <tr
          class="clickable-row hover:bg-teal-50/50 transition-colors duration-100 cursor-pointer focus:outline-none"
          data-href="${href}"
          tabindex="0"
          role="row"
          aria-label="${instName}, rank ${escapeHTML(r.rank)}, score ${score}"
        >
          <td class="px-4 py-3.5 text-sm">${this._rankBadge(r.rank)}</td>
          <td class="px-4 py-3.5 text-sm font-semibold text-gray-800 hover:text-teal-600 transition-colors">${instName}</td>
          <td class="px-4 py-3.5 text-sm text-gray-600 font-mono font-medium">${score}</td>
        </tr>`;
    }).join('');

    this.container.innerHTML = `
      <div class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="min-w-full divide-y divide-gray-100" role="grid" aria-label="National CS Research Rankings">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" ${this._ariaSortAttr('rank')}
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none focus:underline" data-sort="rank">
                  Rank${this._sortIcon('rank')}
                </button>
              </th>
              <th scope="col" ${this._ariaSortAttr('name')}
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none focus:underline" data-sort="name">
                  Institution${this._sortIcon('name')}
                </button>
              </th>
              <th scope="col" ${this._ariaSortAttr('score')}
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div class="inline-flex items-center gap-1">
                  <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none focus:underline" data-sort="score">
                    SPARK Score${this._sortIcon('score')}
                  </button>
                  <a href="${prefix}pages/methodology.html#computing-scores" class="text-teal-500 hover:text-teal-700 inline-flex items-center" title="Scores are calculated as the geometric mean across positive research areas. Click to read methodology.">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
                    </svg>
                  </a>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            ${rows}
          </tbody>
        </table>
      </div>`;

    clearBusy(this.container);
    this._attachListeners();
  }

  _attachListeners() {
    this.container.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const col = btn.dataset.sort;
        this.sortOrder = (this.sortBy === col && this.sortOrder === 'asc') ? 'desc' : 'asc';
        this.sortBy = col;
        this.render();
      });
    });

    this.container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = row.dataset.href;
      });
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = row.dataset.href;
        }
      });
    });
  }
}
