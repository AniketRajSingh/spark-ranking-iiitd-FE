// widgets/Filter.js — SPARK Filter Panel
// Features: live filtering (debounced), year validation, area icons,
// "All Areas" toggle, ARIA fieldset grouping.

const AREA_ICONS = {
  ai:       '🤖', ml:       '🧠', nlp:      '💬',
  vision:   '👁️', systems:  '⚙️', theory:   '📐',
  security: '🔒', networks: '🌐', graphics: '🎨',
  hci:      '🖱️', robotics: '🦾', db:       '🗄️',
  default:  '📚',
};

export default class FilterWidget {
  constructor(containerId, initialConfig) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.config = initialConfig;
    this.showYearRange = this.config.showYearRange !== false;

    // Inject custom styling fallback
    if (!document.getElementById('filter-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'filter-custom-styles';
      style.textContent = `
        .filter-active {
          background-color: #f0fdfa !important;
          border-color: #0d9488 !important;
          color: #0f766e !important;
        }
      `;
      document.head.appendChild(style);
    }

    this.storageKey = this.config.storageKey || 'spark_shared_filter';

    // Restore from sessionStorage if exists
    const savedState = this._loadFromSession();

    this.state = {
      areas: savedState ? new Set(savedState.areas) : new Set(),
      startYear: savedState && savedState.startYear !== undefined ? savedState.startYear : (this.config.startYear || 2015),
      endYear: savedState && savedState.endYear !== undefined ? savedState.endYear : (this.config.endYear || new Date().getFullYear()),
      rank: savedState && savedState.rank ? savedState.rank : 'all',
      isCollapsed: savedState && savedState.isCollapsed !== undefined ? savedState.isCollapsed : (this.config.isCollapsed !== undefined ? this.config.isCollapsed : this.showYearRange),
    };
    this._debounceTimer = null;

    this.render();
    this._attachListeners();
  }

  _loadFromSession() {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        areas: Array.isArray(parsed.areas) ? parsed.areas : [],
        startYear: parsed.startYear,
        endYear: parsed.endYear,
        rank: parsed.rank || 'all',
        isCollapsed: parsed.isCollapsed,
      };
    } catch (e) {
      return null;
    }
  }

  _saveToSession() {
    try {
      const data = {
        areas: Array.from(this.state.areas),
        startYear: this.state.startYear,
        endYear: this.state.endYear,
        rank: this.state.rank,
        isCollapsed: this.state.isCollapsed,
      };
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('[SPARK] Could not save filters to sessionStorage', e);
    }
  }

  _clearSession() {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('[SPARK] Could not clear filters from sessionStorage', e);
    }
  }

  render() {
    const currentYear = new Date().getFullYear();
    const areasHTML = (this.config.areas || []).map(area => {
      const icon = AREA_ICONS[area.id] || AREA_ICONS.default;
      const isChecked = this.state.areas.has(String(area.id));
      const checkedAttr = isChecked ? 'checked' : '';
      const activeClass = isChecked ? 'filter-active' : '';
      return `
        <label class="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700
                       bg-white hover:border-teal-400 hover:text-teal-700 cursor-pointer transition-colors duration-150 ${activeClass}">
          <input
            type="checkbox"
            id="area-${area.id}"
            data-area="${area.id}"
            ${checkedAttr}
            class="sr-only"
          >
          <span aria-hidden="true">${icon}</span>
          <span>${area.name}</span>
        </label>`;
    }).join('');

    const isCollapsed = this.state.isCollapsed;

    this.container.innerHTML = `
      <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
        
        <!-- Top bar: Year range (always visible if enabled) and Expand / Apply buttons -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <!-- Year Inputs or Title -->
          <div class="flex items-center gap-3">
            ${this.showYearRange ? `
              <span class="text-sm font-semibold text-gray-700">Year Range:</span>
              <div class="flex items-center gap-2">
                <input
                  type="number" id="start-year"
                  value="${this.state.startYear}"
                  min="1990" max="${currentYear}"
                  class="w-24 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  aria-label="Start year"
                >
                <span class="text-gray-400">—</span>
                <input
                  type="number" id="end-year"
                  value="${this.state.endYear}"
                  min="1990" max="${currentYear}"
                  class="w-24 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  aria-label="End year"
                >
              </div>
              <p id="year-error" class="text-xs text-red-500 hidden ml-2" role="alert"></p>
            ` : `
              <span class="text-sm font-bold text-gray-800">Filter Venues</span>
            `}

            <!-- CORE Rank Filter -->
            <div class="flex items-center gap-2 pl-2 sm:border-l sm:border-gray-200">
              <label for="filter-rank-select" class="text-sm font-semibold text-gray-700 whitespace-nowrap">CORE Rank:</label>
              <select
                id="filter-rank-select"
                class="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer"
                aria-label="Filter by CORE rank"
              >
                <option value="all" ${this.state.rank === 'all' ? 'selected' : ''}>All Ranks</option>
                <option value="A*" ${this.state.rank === 'A*' ? 'selected' : ''}>CORE A*</option>
                <option value="A" ${this.state.rank === 'A' ? 'selected' : ''}>CORE A</option>
              </select>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-2 self-end md:self-auto">
            <button
              id="btn-toggle-filters"
              class="px-3.5 py-1.5 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              type="button"
            >
              <span>⚙️ Research Areas</span>
              <svg id="chevron-icon" class="w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <button
              id="btn-clear-filters"
              class="px-3.5 py-1.5 text-sm font-medium border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              type="button"
            >
              Clear
            </button>
            <button
              id="btn-apply-filters"
              class="px-4 py-1.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all"
              type="button"
            >
              Apply Filters
            </button>
          </div>

        </div>

        <!-- Collapsible Content: Research Areas -->
        <div id="collapsible-filters" class="${isCollapsed ? 'hidden' : ''} pt-4 border-t border-gray-100 space-y-3">
          <fieldset>
            <div class="flex items-center justify-between mb-2">
              <legend class="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter by Research Area</legend>
              <button
                id="toggle-all-areas"
                class="text-xs font-semibold text-teal-600 hover:text-teal-800 focus:outline-none"
                type="button"
              >
                ${this.state.areas.size === this.config.areas.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Research area filters">
              ${areasHTML}
            </div>
          </fieldset>
        </div>

      </div>
    `;
  }

  _dispatch() {
    document.dispatchEvent(new CustomEvent('filtersChanged', { detail: this.getState() }));
  }

  _validateYears(startVal, endVal) {
    const errorEl = this.container.querySelector('#year-error');
    const currentYear = new Date().getFullYear();
    if (!errorEl) return true;
    if (startVal && endVal && startVal > endVal) {
      errorEl.textContent = 'Invalid range.';
      errorEl.classList.remove('hidden');
      return false;
    }
    if ((startVal && startVal > currentYear) || (endVal && endVal > currentYear)) {
      errorEl.textContent = `Max ${currentYear}.`;
      errorEl.classList.remove('hidden');
      return false;
    }
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    return true;
  }

  _attachListeners() {
    // Area checkboxes — live update state and visual checks, no dispatch
    const collapsible = this.container.querySelector('#collapsible-filters');
    if (collapsible) {
      collapsible.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
          const code = e.target.dataset.area;
          const label = e.target.closest('label');
          if (e.target.checked) {
            this.state.areas.add(String(code));
            if (label) label.classList.add('filter-active');
          } else {
            this.state.areas.delete(String(code));
            if (label) label.classList.remove('filter-active');
          }
        }
      });
    }

    // Toggle collapse button
    const toggleBtn = this.container.querySelector('#btn-toggle-filters');
    const chevronIcon = this.container.querySelector('#chevron-icon');
    if (toggleBtn && collapsible) {
      toggleBtn.addEventListener('click', () => {
        const collapsed = collapsible.classList.toggle('hidden');
        this.state.isCollapsed = collapsed;
        if (chevronIcon) {
          if (collapsed) {
            chevronIcon.classList.remove('rotate-180');
          } else {
            chevronIcon.classList.add('rotate-180');
          }
        }
      });
    }

    // Select/deselect all areas
    const toggleAllBtn = this.container.querySelector('#toggle-all-areas');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const allChecked = this.state.areas.size === this.config.areas.length;
        if (allChecked) {
          this.state.areas.clear();
        } else {
          this.config.areas.forEach(a => this.state.areas.add(String(a.id)));
        }
        // Re-render to update checkbox states visually
        this.render();
        this._attachListeners();
      });
    }

    // Year inputs — validate on input but do not dispatch
    if (this.showYearRange) {
      const onYearInput = () => {
        const startInput = this.container.querySelector('#start-year');
        const endInput = this.container.querySelector('#end-year');
        if (!startInput || !endInput) return;
        const sy = parseInt(startInput.value, 10);
        const ey = parseInt(endInput.value, 10);
        this._validateYears(sy, ey);
      };

      const startYrEl = this.container.querySelector('#start-year');
      const endYrEl = this.container.querySelector('#end-year');
      if (startYrEl) startYrEl.addEventListener('input', onYearInput);
      if (endYrEl) endYrEl.addEventListener('input', onYearInput);
    }

    // Rank select dropdown
    const rankSelect = this.container.querySelector('#filter-rank-select');
    if (rankSelect) {
      rankSelect.addEventListener('change', e => {
        this.state.rank = e.target.value || 'all';
      });
    }

    // Apply button
    const applyBtn = this.container.querySelector('#btn-apply-filters');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        if (this.showYearRange) {
          const startInput = this.container.querySelector('#start-year');
          const endInput = this.container.querySelector('#end-year');
          if (startInput && endInput) {
            const sy = parseInt(startInput.value, 10);
            const ey = parseInt(endInput.value, 10);
            if (!this._validateYears(sy, ey)) return;
            this.state.startYear = isNaN(sy) ? null : sy;
            this.state.endYear = isNaN(ey) ? null : ey;
          }
        }
        const rankSel = this.container.querySelector('#filter-rank-select');
        if (rankSel) {
          this.state.rank = rankSel.value || 'all';
        }
        this._saveToSession();
        this._dispatch();
      });
    }

    // Clear button
    const clearBtn = this.container.querySelector('#btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.state.areas.clear();
        this.state.startYear = this.config.startYear || 2015;
        this.state.endYear = this.config.endYear || new Date().getFullYear();
        this.state.rank = 'all';
        this.state.isCollapsed = true; // Collapse by default

        this._clearSession();
        this.render();
        this._attachListeners();
        this._dispatch();
      });
    }
  }

  getState() {
    return {
      areas: new Set(this.state.areas),
      startYear: this.state.startYear,
      endYear: this.state.endYear,
      rank: this.state.rank || 'all',
    };
  }
}
