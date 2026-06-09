// site/js/widgets/RankingTable.js

async function fetchJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Fetch error: ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.warn('Fetch failed for path:', path, e);
    return null;
  }
}

class RankingTableWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentSortBy = 'rank';
    this.currentSortOrder = 'asc';
    this.rankingsData = []; // Data will be passed in, not fetched

    if (!this.container) {
      console.error(`RankingTableWidget: Container with id "${containerId}" not found.`);
    }
  }

  setData(newData) {
    this.rankingsData = newData;
    this.render();
  }

  render() {
    if (!this.rankingsData || this.rankingsData.length === 0) {
      this.container.innerHTML = '<div class="bg-white shadow rounded p-4">No ranking data available for the selected filters.</div>';
      return;
    }

    const sortedItems = [...this.rankingsData].sort((a, b) => {
      const valA = this.currentSortBy === 'name' ? a.institution.name : a[this.currentSortBy];
      const valB = this.currentSortBy === 'name' ? b.institution.name : b[this.currentSortBy];
      if (valA < valB) return this.currentSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.currentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    let html = `
      <div class="overflow-x-auto bg-white shadow rounded">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-600"><a href="#" data-sort="rank">Rank</a></th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-600"><a href="#" data-sort="name">Institution</a></th>
              <th class="px-4 py-2 text-left text-sm font-medium text-gray-600"><a href="#" data-sort="score">Score</a></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            ${sortedItems.map(r => `
              <tr class="clickable-row hover:bg-teal-50" data-href="/site/pages/institution.html?id=${r.institution.id}">
                <td class="px-4 py-3 text-sm text-gray-700">${r.rank}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${r.institution.name}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${r.score}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    this.container.innerHTML = html;
    this.addEventListeners();
  }

  addEventListeners() {
    this.container.querySelectorAll('thead a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const newSortBy = e.target.dataset.sort;
        this.currentSortOrder = (this.currentSortBy === newSortBy && this.currentSortOrder === 'asc') ? 'desc' : 'asc';
        this.currentSortBy = newSortBy;
        this.render();
      });
    });

    this.container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = row.dataset.href;
      });
    });
  }
}
