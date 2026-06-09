// site/js/widgets/FacultyList.js

class FacultyListWidget {
  constructor(containerId, dataTable, filters, serverTopData = null) {
  this.containerId = containerId;
  this.container = document.getElementById(this.containerId);
    this.dataTable = dataTable;
    this.filters = filters;
    this.serverTopData = serverTopData;
  this.pageSize = 20;
  this.page = 1;
    if (!this.container) return;
    this.render();
  }

  render() {
    // Require server-provided precomputed rankings with top_faculty
      const container = document.getElementById(this.containerId);
      container.innerHTML = '';
      // If server provided precomputed data, use it; otherwise fall back to client-side computation
      let flat = [];
      if (this.serverTopData && Array.isArray(this.serverTopData.institutions) && this.serverTopData.institutions.length) {
        const institutions = this.serverTopData.institutions;
        // Flatten top_faculty across all institutions and attach institution info
        institutions.forEach(inst => {
          const instObj = inst.institution || inst;
          const instRank = inst.rank || null;
          const topFac = inst.top_faculty || [];
          topFac.forEach(f => {
            flat.push({
              id: f.id,
              name: f.name,
              score: f.score || 0,
              institution: { id: instObj.id, name: instObj.name },
              institution_rank: instRank,
            });
          });
        });
      } else {
        // client-side fallback: compute top faculty using publications and conferences via dataTable
        if (!this.dataTable || !this.dataTable.data) {
          const msg = document.createElement('div');
          msg.className = 'text-gray-600 p-4 bg-gray-50 border rounded';
          msg.textContent = 'No faculty data available locally. Try enabling the backend or provide local full-data.json.';
          container.appendChild(msg);
          return;
        }

        // Normalize filters for dataTable functions: areas as Set, years default to wide range
        const rawFilters = this.filters || {};
        const areas = rawFilters.areas instanceof Set ? rawFilters.areas : new Set(rawFilters.areas || []);
        const startYear = rawFilters.startYear || 1900;
        const endYear = rawFilters.endYear || (new Date()).getFullYear();
        // If backend faculty objects already have a `score` field use that directly
        const localFac = this.dataTable.data.faculty || [];
        const anyHasScore = localFac.some(f => typeof f.score === 'number');
        if (anyHasScore) {
          localFac.forEach(f => {
            const inst = this.dataTable.data.institutions.find(i => String(i.id) === String(f.institution_id)) || { id: f.institution_id, name: String(f.institution_id) };
            flat.push({ id: f.id, name: f.name, score: f.score || 0, institution: { id: inst.id, name: inst.name }, institution_rank: null });
          });
        } else {
          // Use getFacultyRankings which prefers explicit authorships (credit + weight)
          const facultyRanks = this.dataTable.getFacultyRankings({ areas, startYear, endYear }, 1000);
          // facultyRanks is [{ rank, id, name, institution_id, score }, ...]
          facultyRanks.forEach(f => {
            const inst = this.dataTable.data.institutions.find(i => String(i.id) === String(f.institution_id)) || { id: f.institution_id, name: String(f.institution_id) };
            flat.push({ id: f.id, name: f.name, score: f.score || 0, institution: { id: inst.id, name: inst.name }, institution_rank: null });
          });
        }
      }

    // Sort globally by faculty score descending
    flat.sort((a,b) => (b.score || 0) - (a.score || 0));

    // Pagination
    const start = 0;
    const end = this.pageSize * this.page;
    const pageItems = flat.slice(0, end);

    const html = `
      <div class="bg-white shadow rounded p-4">
        <h3 class="text-xl font-semibold mb-4">Top Faculty (global)</h3>
        <ol class="list-decimal pl-6 space-y-2">
          ${pageItems.map((f, idx) => `
            <li class="py-2">
              <a href="/site/pages/faculty-profile.html?id=${f.id}" class="text-teal-600 font-medium hover:underline">${f.name}</a>
              <span class="text-sm text-gray-600"> — ${Number(f.score || 0).toFixed(2)} pts</span>
              <div class="text-sm text-gray-500">${f.institution && f.institution.name ? f.institution.name : ''} ${f.institution_rank ? `(Inst. rank: ${f.institution_rank})` : ''}</div>
            </li>
          `).join('')}
        </ol>
        ${end < flat.length ? `<div class="mt-4 text-center"><button id="show-more-faculty" class="px-4 py-2 bg-teal-600 text-white rounded">Show more</button></div>` : ''}
      </div>
    `;

    this.container.innerHTML = html;

    if (end < flat.length) {
      const btn = document.getElementById('show-more-faculty');
      if (btn) btn.addEventListener('click', () => {
        this.page += 1;
        this.render();
      });
    }
  }
}
