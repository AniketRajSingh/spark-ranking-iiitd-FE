// widgets/CompareWidget.js — SPARK Institution Comparison Widget
import fetchJSON from '../utils/fetchJSON.js';
import { escapeHTML } from '../utils/sanitize.js';
import { renderErrorCard } from '../utils/errorCard.js';
import { AREA_TAXONOMY, BROAD_AREAS } from '../utils/areaTaxonomy.js';

export default class CompareWidget {
  constructor(containerId, apiBase) {
    this.container = document.getElementById(containerId);
    this.apiBase = apiBase;
    this.inst1 = null;
    this.inst2 = null;
    this.search1Results = [];
    this.search2Results = [];
    this.chart = null;

    if (!this.container) return;
    this.render();
    this._attachAutocomplete();
  }

  render() {
    this.container.innerHTML = `
      <div class="space-y-6">

        <!-- Selector Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          
          <!-- Selector 1 -->
          <div class="relative">
            <label for="search-inst-1" class="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Select Institution 1</label>
            <input
              type="text"
              id="search-inst-1"
              placeholder="Type to search..."
              autocomplete="off"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div id="results-inst-1" class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden max-h-48 overflow-y-auto"></div>
          </div>

          <!-- Selector 2 -->
          <div class="relative">
            <label for="search-inst-2" class="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Select Institution 2</label>
            <input
              type="text"
              id="search-inst-2"
              placeholder="Type to search..."
              autocomplete="off"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div id="results-inst-2" class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden max-h-48 overflow-y-auto"></div>
          </div>

        </div>

        <!-- Comparison Display -->
        <div id="comparison-display" class="hidden space-y-6">
          
          <!-- Scorecards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div id="card-inst-1" class="card p-6"></div>
            <div id="card-inst-2" class="card p-6"></div>
          </div>

          <!-- Radar Chart & Score Breakdown -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Chart Panel -->
            <div class="card p-6 lg:col-span-2">
              <h3 class="text-base font-bold text-gray-800 mb-4">Research Area Comparison</h3>
              <div class="relative h-96 w-full flex items-center justify-center">
                <canvas id="compare-radar-chart"></canvas>
              </div>
            </div>

            <!-- Details Compare Panel -->
            <div class="card p-6 flex flex-col justify-between">
              <div>
                <h3 class="text-base font-bold text-gray-800 mb-4">Metrics Comparison</h3>
                <div class="divide-y divide-gray-100 text-sm">
                  <div class="py-2.5 flex justify-between">
                    <span class="text-gray-500 font-medium">National Rank</span>
                    <div class="flex gap-4 font-bold font-mono">
                      <span id="cmp-rank-1" class="text-teal-600">—</span>
                      <span class="text-gray-300">vs</span>
                      <span id="cmp-rank-2" class="text-teal-600">—</span>
                    </div>
                  </div>
                  <div class="py-2.5 flex justify-between">
                    <span class="text-gray-500 font-medium">SPARK Score</span>
                    <div class="flex gap-4 font-bold font-mono">
                      <span id="cmp-score-1" class="text-teal-600">—</span>
                      <span class="text-gray-300">vs</span>
                      <span id="cmp-score-2" class="text-teal-600">—</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg mt-4 font-medium leading-relaxed">
                Comparative analysis tracks cumulative weighted scores from eligible CORE A*/A venues. Higher points imply a larger verified publication volume in top venues.
              </div>
            </div>

          </div>

        </div>

      </div>
    `;
  }

  _attachAutocomplete() {
    const apiBase = this.apiBase;
    const self = this;

    const setupAutocompleteFor = (inputId, resultsId, selectCallback) => {
      const input = this.container.querySelector(`#${inputId}`);
      const resultsDiv = this.container.querySelector(`#${resultsId}`);
      let debounce = null;

      if (!input || !resultsDiv) return;

      const performSearch = async (val) => {
        if (!val.trim()) {
          resultsDiv.classList.add('hidden');
          return;
        }
        try {
          const res = await fetchJSON(`${apiBase}/institutions/?search=${encodeURIComponent(val.trim())}`);
          const items = Array.isArray(res) ? res : (res?.results || []);
          if (items.length === 0) {
            resultsDiv.innerHTML = `<p class="p-3 text-xs text-gray-400">No results found.</p>`;
          } else {
            resultsDiv.innerHTML = items.map(inst => `
              <button
                class="w-full text-left p-3 hover:bg-teal-50 text-xs font-semibold text-gray-800 transition-colors border-b border-gray-100 last:border-0"
                data-id="${inst.id}"
                data-name="${escapeHTML(inst.name)}"
              >
                ${escapeHTML(inst.name)}
              </button>
            `).join('');
          }
          resultsDiv.classList.remove('hidden');

          resultsDiv.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              input.value = btn.dataset.name;
              resultsDiv.classList.add('hidden');
              selectCallback(btn.dataset.id);
            });
          });
        } catch (e) {
          console.error(e);
        }
      };

      input.addEventListener('input', e => {
        clearTimeout(debounce);
        debounce = setTimeout(() => performSearch(e.target.value), 300);
      });

      // Close results when clicking outside
      document.addEventListener('click', e => {
        if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
          resultsDiv.classList.add('hidden');
        }
      });
    };

    setupAutocompleteFor('search-inst-1', 'results-inst-1', async (id) => {
      self.inst1 = await fetchJSON(`${apiBase}/institutions/${id}/`);
      self._checkAndRenderComparison();
    });

    setupAutocompleteFor('search-inst-2', 'results-inst-2', async (id) => {
      self.inst2 = await fetchJSON(`${apiBase}/institutions/${id}/`);
      self._checkAndRenderComparison();
    });
  }

  _checkAndRenderComparison() {
    const display = this.container.querySelector('#comparison-display');
    if (!this.inst1 || !this.inst2) {
      if (display) display.classList.add('hidden');
      return;
    }

    if (display) display.classList.remove('hidden');

    const renderCard = (inst, elementId) => {
      const el = this.container.querySelector(`#${elementId}`);
      if (!el) return;

      const name = escapeHTML(inst.name || '');
      const website = escapeHTML(inst.website || '');
      const description = escapeHTML(inst.description || inst.summary || 'No overview available.');

      const topFac = (inst.top_faculty || []).slice(0, 3).map((f, idx) => `
        <li class="flex items-center justify-between text-xs py-1.5 font-medium">
          <span class="text-teal-800 font-semibold">${idx + 1}. ${escapeHTML(f.name)}</span>
          <span class="text-gray-400 font-mono">${Number(f.score || 0).toFixed(2)} pts</span>
        </li>
      `).join('');

      el.innerHTML = `
        <div class="space-y-4">
          <div>
            <h4 class="text-lg font-bold text-gray-900 leading-snug">${name}</h4>
            ${website ? `<a href="${website}" target="_blank" class="text-xs text-teal-600 hover:underline inline-flex items-center gap-0.5 mt-1">${website}</a>` : ''}
          </div>
          <p class="text-xs text-gray-500 leading-relaxed">${description}</p>
          <div class="pt-3 border-t border-gray-100">
            <h5 class="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Top Faculty Leaders</h5>
            <ul class="divide-y divide-gray-50">
              ${topFac || '<li class="text-xs text-gray-400">No faculty list</li>'}
            </ul>
          </div>
        </div>
      `;
    };

    renderCard(this.inst1, 'card-inst-1');
    renderCard(this.inst2, 'card-inst-2');

    // Update Metrics
    this.container.querySelector('#cmp-rank-1').textContent = this.inst1.rank ? `#${this.inst1.rank}` : '—';
    this.container.querySelector('#cmp-rank-2').textContent = this.inst2.rank ? `#${this.inst2.rank}` : '—';
    this.container.querySelector('#cmp-score-1').textContent = this.inst1.score != null ? Number(this.inst1.score).toFixed(2) : '—';
    this.container.querySelector('#cmp-score-2').textContent = this.inst2.score != null ? Number(this.inst2.score).toFixed(2) : '—';

    this._renderRadarChart();
  }

  _renderRadarChart() {
    if (typeof Chart === 'undefined') return;

    const canvas = this.container.querySelector('#compare-radar-chart');
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const b1 = this.inst1.area_scores || this.inst1.area_breakdown || {};
    const b2 = this.inst2.area_scores || this.inst2.area_breakdown || {};

    const mapToBroadNames = (breakdown) => {
      const mapped = {};
      Object.entries(breakdown || {}).forEach(([key, val]) => {
        const broadId = AREA_TAXONOMY[key] || key;
        const areaInfo = BROAD_AREAS.find(b => b.id === broadId);
        const name = areaInfo ? areaInfo.name : broadId;
        mapped[name] = (mapped[name] || 0) + Number(val);
      });
      return mapped;
    };

    const mappedB1 = mapToBroadNames(b1);
    const mappedB2 = mapToBroadNames(b2);

    const allKeys = new Set([...Object.keys(mappedB1), ...Object.keys(mappedB2)]);
    const labels = Array.from(allKeys);

    if (labels.length === 0) return;

    const data1 = labels.map(key => Number(mappedB1[key] || 0));
    const data2 = labels.map(key => Number(mappedB2[key] || 0));

    this.chart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels.map(l => l.toUpperCase()),
        datasets: [
          {
            label: this.inst1.name || 'Institution 1',
            data: data1,
            fill: true,
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            borderColor: 'rgba(13, 148, 136, 1)',
            pointBackgroundColor: 'rgba(13, 148, 136, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(13, 148, 136, 1)'
          },
          {
            label: this.inst2.name || 'Institution 2',
            data: data2,
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
          line: { borderWidth: 2 }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
        },
        scales: {
          r: {
            angleLines: { color: '#f3f4f6' },
            grid: { color: '#f3f4f6' },
            pointLabels: { color: '#4b5563', font: { size: 10, weight: 'semibold' } },
            ticks: { display: false }
          }
        }
      }
    });
  }
}
