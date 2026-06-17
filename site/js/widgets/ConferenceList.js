// widgets/ConferenceList.js — SPARK Conference Listing Widget
import { escapeHTML } from '../utils/sanitize.js';
import { clearBusy, renderSkeleton } from '../utils/errorCard.js';
import fetchJSON from '../utils/fetchJSON.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';

export default class ConferenceListWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [];
    this.filters = { areas: new Set() };
    this.searchQuery = '';
    this.rankFilter = 'all';
    this.sortBy = 'acronym';
    this.sortOrder = 'asc';
    this._pubsPromise = null;

    if (!this.container) {
      console.error(`[SPARK] ConferenceListWidget: #${containerId} not found`);
    }

    this._setupModalListeners();
  }

  setData(newData) {
    this.data = newData || [];
    this.render();
  }

  setFilters(newFilters) {
    this.filters = newFilters;
    this.render();
  }

  setSearch(q) {
    this.searchQuery = q || '';
    this.render();
  }

  setRankFilter(rank) {
    this.rankFilter = rank || 'all';
    this.render();
  }

  _filtered() {
    return this.data.filter(c => {
      // 1. Filter by Research Area category mapping
      if (this.filters.areas && this.filters.areas.size > 0) {
        const rawArea = c.area || '';
        const broadArea = AREA_TAXONOMY[rawArea] || rawArea;
        if (!this.filters.areas.has(String(broadArea))) return false;
      }

      // 2. Filter by CORE Rank (A* / A)
      if (this.rankFilter && this.rankFilter !== 'all') {
        const rank = c.core_rank || c.rank || '';
        if (rank !== this.rankFilter) return false;
      }

      // 3. Search query matching acronym or name
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const name = (c.name || c.full_name || '').toLowerCase();
        const acronym = (c.acronym || '').toLowerCase();
        if (!name.includes(q) && !acronym.includes(q)) return false;
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
      const parts = [];
      if (this.filters.areas && this.filters.areas.size > 0) parts.push("selected research areas");
      if (this.rankFilter && this.rankFilter !== 'all') parts.push(`CORE ${this.rankFilter} rank`);
      if (this.searchQuery) parts.push(`"${this.searchQuery}"`);
      
      const filterDesc = parts.length > 0 ? "matching " + parts.join(", ") : "available";
      this.container.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <p class="text-sm">No conferences found ${filterDesc}.</p>
        </div>`;
      clearBusy(this.container);
      return;
    }

    const rows = sorted.map(c => {
      const id = escapeHTML(c.id || '');
      const acronym = escapeHTML(c.acronym || '');
      const name = escapeHTML(c.name || c.full_name || '');
      const rawArea = c.area || '';
      const broadId = AREA_TAXONOMY[rawArea] || rawArea;
      const areaInfo = BROAD_AREAS.find(b => b.id === broadId);
      const area = escapeHTML(areaInfo ? areaInfo.name : rawArea);
      const rank = escapeHTML(c.core_rank || c.rank || '');

      const rankBadge = rank
        ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold
            ${rank === 'A*' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
            CORE ${rank}
          </span>`
        : '';

      return `
        <tr
          class="clickable-row hover:bg-teal-50/50 transition-colors duration-100 cursor-pointer focus:outline-none"
          tabindex="0"
          role="row"
          data-id="${id}"
          data-acronym="${acronym}"
          data-name="${name}"
          data-rank="${rank}"
          aria-label="${acronym}, ${name}, rank ${rank}, area ${area}"
        >
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

    this.container.querySelectorAll('.clickable-row').forEach(row => {
      const confId = row.dataset.id;
      const acronym = row.dataset.acronym;
      const name = row.dataset.name;
      const rank = row.dataset.rank;
      
      const trigger = () => this._showPublicationsModal(confId, acronym, name, rank);

      row.addEventListener('click', trigger);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });
    });
  }

  _setupModalListeners() {
    const modal = document.getElementById('publication-modal');
    const closeBtn = document.getElementById('modal-close');
    const backdrop = document.getElementById('modal-backdrop');

    if (!modal) return;

    const hideModal = () => modal.classList.add('hidden');

    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (backdrop) backdrop.addEventListener('click', hideModal);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        hideModal();
      }
    });
  }

  async _showPublicationsModal(confId, acronym, name, rank) {
    const modal = document.getElementById('publication-modal');
    const titleEl = document.getElementById('modal-title');
    const subtitleEl = document.getElementById('modal-subtitle');
    const body = document.getElementById('modal-body');

    if (!modal || !body) return;

    titleEl.textContent = `${acronym} Publications`;
    subtitleEl.textContent = `Rank: CORE ${rank || 'unknown'} · ${name}`;
    body.innerHTML = '';
    renderSkeleton(body);
    modal.classList.remove('hidden');

    try {
      if (!this._pubsPromise) {
        const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) || '';
        this._pubsPromise = fetchJSON(`${apiBase}/publications/`);
      }
      const data = await this._pubsPromise;
      if (!data) throw new Error('Failed to load publications');

      const list = Array.isArray(data) ? data : (data.results || []);
      const filteredPubs = list.filter(pub => {
        const pubAcronym = pub.conference?.acronym || pub.conference || pub.venue || '';
        return String(pubAcronym).trim().toLowerCase() === String(acronym).trim().toLowerCase();
      });

      if (filteredPubs.length === 0) {
        body.innerHTML = `
          <div class="text-center py-12 text-gray-500">
            <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p class="text-sm font-medium">No papers found in the database for ${escapeHTML(acronym)}.</p>
          </div>`;
        return;
      }

      // Sort publications by year descending
      filteredPubs.sort((a, b) => (b.year || 0) - (a.year || 0));

      const rows = filteredPubs.map((pub, idx) => {
        const pTitle = escapeHTML(pub.title || '');
        const pYear = escapeHTML(pub.year || '');
        const rawPArea = pub.area || '';
        const broadId = AREA_TAXONOMY[rawPArea] || rawPArea;
        const areaInfo = BROAD_AREAS.find(b => b.id === broadId);
        const pArea = escapeHTML(areaInfo ? areaInfo.name : rawPArea);
        const pRank = escapeHTML(pub.core_rank || '');
        const rankBadge = pRank
          ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold
              ${pRank === 'A*' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
              CORE ${pRank}
            </span>`
          : '';

        return `
          <tr class="hover:bg-gray-50/50 transition-colors duration-150">
            <td class="px-4 py-3.5 text-sm text-gray-500 font-mono font-medium">${idx + 1}</td>
            <td class="px-4 py-3.5 text-sm text-gray-900 font-semibold max-w-lg whitespace-normal leading-relaxed">${pTitle}</td>
            <td class="px-4 py-3.5 text-sm text-gray-600 font-mono font-medium">${pYear}</td>
            <td class="px-4 py-3.5 text-sm">${rankBadge}</td>
            <td class="px-4 py-3.5 text-sm font-semibold text-gray-400 font-mono">${pArea}</td>
          </tr>`;
      }).join('');

      body.innerHTML = `
        <div class="overflow-x-auto border border-gray-100 rounded-xl">
          <table class="min-w-full divide-y divide-gray-100">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paper Title</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Year</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Area</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              ${rows}
            </tbody>
          </table>
        </div>`;

    } catch (e) {
      body.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <p class="text-sm font-medium">Failed to load publications. Please check your network or try again.</p>
        </div>`;
    }
  }
}
