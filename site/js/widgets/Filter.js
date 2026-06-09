// site/js/widgets/Filter.js

class FilterWidget {
  constructor(containerId, initialConfig) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.config = initialConfig;
    // Default: no area filters selected unless user chooses
    this.state = {
      areas: new Set(),
      startYear: this.config.startYear || null,
      endYear: this.config.endYear || null,
    };

    this.render();
    this.addEventListeners();
  }

  render() {
    const areasHTML = this.config.areas.map(area => `
      <label class="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm text-gray-700 bg-gray-50">
        <input type="checkbox" id="area-${area.id}" data-area="${area.id}" data-area-code="${area.code || ''}" ${this.state.areas.has(area.code || area.id) ? 'checked' : ''} class="form-checkbox h-4 w-4 text-teal-600">
        <span>${area.name}</span>
      </label>
    `).join('');

    const html = `
      <div class="bg-white shadow rounded p-4">
        <h4 class="text-lg font-semibold text-gray-800 mb-3">Filter by Research Area</h4>
        <div class="flex flex-wrap gap-2 mb-4">${areasHTML}</div>
        <hr class="my-3">
        <h4 class="text-lg font-semibold text-gray-800 mb-2">Filter by Year</h4>
        <div class="flex items-center gap-2 mb-3">
          <label for="start-year" class="text-sm text-gray-600">From</label>
          <input type="number" id="start-year" value="${this.state.startYear || ''}" placeholder="e.g. 2018" class="border rounded px-2 py-1 w-20">
          <label for="end-year" class="text-sm text-gray-600">To</label>
          <input type="number" id="end-year" value="${this.state.endYear || ''}" placeholder="e.g. 2023" class="border rounded px-2 py-1 w-20">
        </div>
        <button id="update-filters" class="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded">Update</button>
      </div>
    `;
    this.container.innerHTML = html;
  }

  addEventListeners() {
    this.container.querySelector('#update-filters').addEventListener('click', () => {
      // Update state from UI
      this.state.areas.clear();
      this.container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        // prefer an explicit area code if provided, otherwise use the id
        const code = cb.dataset.areaCode && cb.dataset.areaCode.length ? cb.dataset.areaCode : cb.dataset.area;
        this.state.areas.add(code);
      });
  const sy = this.container.querySelector('#start-year').value;
  const ey = this.container.querySelector('#end-year').value;
  this.state.startYear = sy && sy.length ? parseInt(sy, 10) : null;
  this.state.endYear = ey && ey.length ? parseInt(ey, 10) : null;

      // Dispatch a custom event that other widgets can listen to
      const event = new CustomEvent('filtersChanged', { detail: this.getState() });
      document.dispatchEvent(event);
    });
  }

  getState() {
    return this.state;
  }
}
