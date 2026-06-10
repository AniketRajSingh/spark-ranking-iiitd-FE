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
    this.state = {
      areas: new Set(),
      startYear: this.config.startYear || 2015,
      endYear: this.config.endYear || new Date().getFullYear(),
    };
    this._debounceTimer = null;

    this.render();
    this._attachListeners();
  }

  render() {
    const currentYear = new Date().getFullYear();
    const areasHTML = (this.config.areas || []).map(area => {
      const icon = AREA_ICONS[area.id] || AREA_ICONS.default;
      const checked = this.state.areas.has(String(area.id)) ? 'checked' : '';
      return `
        <label class="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700
                       bg-white hover:border-teal-400 hover:text-teal-700 cursor-pointer transition-colors duration-150
                       has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 has-[:checked]:text-teal-700">
          <input
            type="checkbox"
            id="area-${area.id}"
            data-area="${area.id}"
            ${checked}
            class="sr-only"
          >
          <span aria-hidden="true">${icon}</span>
          <span>${area.name}</span>
        </label>`;
    }).join('');

    this.container.innerHTML = `
      <div class="card p-4 space-y-4">

        <h2 class="text-base font-semibold text-gray-800">Filters</h2>

        <!-- Area filter -->
        <fieldset>
          <legend class="text-sm font-medium text-gray-600 mb-2">Research Area</legend>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Research area filters">
            ${areasHTML}
          </div>
          <button
            id="toggle-all-areas"
            class="mt-2 text-xs text-teal-600 hover:text-teal-800 hover:underline focus:outline-none focus:underline"
            type="button"
          >Select all areas</button>
        </fieldset>

        <hr class="border-gray-100">

        <!-- Year filter -->
        <fieldset>
          <legend class="text-sm font-medium text-gray-600 mb-2">Publication Year Range</legend>
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label for="start-year" class="text-xs text-gray-500 block mb-1">From</label>
              <input
                type="number" id="start-year"
                value="${this.state.startYear}"
                min="1990" max="${currentYear}"
                class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="Start year"
              >
            </div>
            <span class="text-gray-400 mt-4">—</span>
            <div class="flex-1">
              <label for="end-year" class="text-xs text-gray-500 block mb-1">To</label>
              <input
                type="number" id="end-year"
                value="${this.state.endYear}"
                min="1990" max="${currentYear}"
                class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="End year"
              >
            </div>
          </div>
          <p id="year-error" class="mt-1 text-xs text-red-500 hidden" role="alert"></p>
        </fieldset>

      </div>
    `;
  }

  _dispatch() {
    document.dispatchEvent(new CustomEvent('filtersChanged', { detail: this.getState() }));
  }

  _debounce(fn, ms = 250) {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(fn, ms);
  }

  _validateYears(startVal, endVal) {
    const errorEl = this.container.querySelector('#year-error');
    const currentYear = new Date().getFullYear();
    if (!errorEl) return true;
    if (startVal && endVal && startVal > endVal) {
      errorEl.textContent = '"From" year cannot be after "To" year.';
      errorEl.classList.remove('hidden');
      return false;
    }
    if ((startVal && startVal > currentYear) || (endVal && endVal > currentYear)) {
      errorEl.textContent = `Year cannot exceed ${currentYear}.`;
      errorEl.classList.remove('hidden');
      return false;
    }
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    return true;
  }

  _attachListeners() {
    // Area checkboxes — live filter on change
    this.container.addEventListener('change', e => {
      if (e.target.type === 'checkbox') {
        const code = e.target.dataset.area;
        if (e.target.checked) {
          this.state.areas.add(String(code));
        } else {
          this.state.areas.delete(String(code));
        }
        this._debounce(() => this._dispatch());
      }
    });

    // Year inputs — live filter with validation
    const onYearChange = () => {
      const startInput = this.container.querySelector('#start-year');
      const endInput = this.container.querySelector('#end-year');
      if (!startInput || !endInput) return;
      const sy = parseInt(startInput.value, 10);
      const ey = parseInt(endInput.value, 10);
      if (!this._validateYears(sy, ey)) return;
      this.state.startYear = isNaN(sy) ? null : sy;
      this.state.endYear = isNaN(ey) ? null : ey;
      this._debounce(() => this._dispatch(), 400);
    };

    const startYrEl = this.container.querySelector('#start-year');
    const endYrEl = this.container.querySelector('#end-year');
    if (startYrEl) startYrEl.addEventListener('input', onYearChange);
    if (endYrEl) endYrEl.addEventListener('input', onYearChange);

    // Toggle all areas
    const toggleBtn = this.container.querySelector('#toggle-all-areas');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const allChecked = this.state.areas.size === this.config.areas.length;
        if (allChecked) {
          this.state.areas.clear();
          toggleBtn.textContent = 'Select all areas';
        } else {
          this.config.areas.forEach(a => this.state.areas.add(String(a.id)));
          toggleBtn.textContent = 'Deselect all areas';
        }
        // Re-render to update checkbox states
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
    };
  }
}
