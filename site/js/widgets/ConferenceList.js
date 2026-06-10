// widgets/ConferenceList.js — SPARK Conference Listing Widget
import { escapeHTML } from '../utils/sanitize.js';
import { clearBusy } from '../utils/errorCard.js';

export default class ConferenceListWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [];
    this.filters = { areas: new Set() };
    this.sortBy = 'acronym';
    this.sortOrder = 'asc';

    if (!this.container) {
      console.error(`[SPARK] ConferenceListWidget: #${containerId} not found`);
    }
  }

  setData(newData) {
    this.data = newData || [];
    this.render();
  }

  setFilters(newFilters) {
    this.filters = newFilters;
    this.render();
  }

  _filtered() {
    return this.data.filter(c => {
      if (this.filters.areas && this.filters.areas.size > 0) {
        const area = c.area || c.acronym || '';
        return this.filters.areas.has(String(area));
      }
      return true;
    });
  }

  _sorted(filteredData) {
    return [...filteredData].sort((a, b) => {
      let valA = (a[this.sortBy] || '').toLowerCase();
      let valB = (b[this.sortBy] || '').toLowerCase();
      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  _sortIcon(col) {
    if (this.sortBy !== col) return `<span class="ml-1 text-gray-300">↕</span>`;
    return this.sortOrder === 'asc' ? `<span class="ml-1 text-teal-600">▲</span>` : `<span class="ml-1 text-teal-600">▼</span>`;
  }

  render() {
    if (!this.container) return;
    const filtered = this._filtered();
    const sorted = this._sorted(filtered);

    if (sorted.length === 0) {
      this.container.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <p class="text-sm">No conferences found matching the selected research areas.</p>
        </div>`;
      clearBusy(this.container);
      return;
    }

    const rows = sorted.map(c => {
      const acronym = escapeHTML(c.acronym || '');
      const name = escapeHTML(c.name || '');
      const area = escapeHTML((c.area || 'unknown').toUpperCase());
      const rank = escapeHTML(c.core_rank || c.rank || '');

      const rankBadge = rank
        ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold
            ${rank === 'A*' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
            CORE ${rank}
          </span>`
        : '';

      return `
        <tr class="hover:bg-gray-50/50 transition-colors duration-150">
          <td class="px-4 py-3.5 text-sm font-bold text-teal-700">${acronym}</td>
          <td class="px-4 py-3.5 text-sm text-gray-800 font-semibold">${name}</td>
          <td class="px-4 py-3.5 text-sm">${rankBadge}</td>
          <td class="px-4 py-3.5 text-sm font-semibold text-gray-500 font-mono">${area}</td>
        </tr>`;
    }).join('');

    this.container.innerHTML = `
      <div class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="min-w-full divide-y divide-gray-100">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none" data-sort="acronym">
                  Acronym${this._sortIcon('acronym')}
                </button>
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none" data-sort="name">
                  Venue Name${this._sortIcon('name')}
                </button>
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none" data-sort="core_rank">
                  CORE Rank${this._sortIcon('core_rank')}
                </button>
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button class="sort-btn inline-flex items-center hover:text-teal-600 focus:outline-none" data-sort="area">
                  Taxonomy Area${this._sortIcon('area')}
                </button>
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
  }
}
