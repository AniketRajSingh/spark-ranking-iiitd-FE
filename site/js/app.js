// site/js/app.js - Main Initializer

document.addEventListener('DOMContentLoaded', async () => {
  // Helper: try to fetch area options from backend, fall back to conferences or null
  async function fetchAreaOptions(apiBase) {
    if (!apiBase) return null;
    try {
      let res = await fetch(`${apiBase}/areas/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) return data.map(a => ({ id: a.slug || String(a.id || a.code || a.name), name: a.name || a.title || String(a.id), code: a.code || a.id }));
      }
      res = await fetch(`${apiBase}/conferences/`);
      if (res.ok) {
        const confs = await res.json();
        if (Array.isArray(confs) && confs.length) {
          const map = {};
          confs.forEach(c => {
            const areaKey = c.area || c.acronym || c.core_rank || 'other';
            if (!map[areaKey]) map[areaKey] = { id: String(areaKey), name: String(areaKey), code: c.area || null };
          });
          return Object.values(map);
        }
      }
    } catch (e) {
      console.warn('fetchAreaOptions error:', e);
    }
    return null;
  }

  // Global API configuration used across pages
  const apiBase = (window.API_CONFIG && window.API_CONFIG.API_BASE) ? window.API_CONFIG.API_BASE : null;
  const probeTimeout = (window.API_CONFIG && window.API_CONFIG.PROBE_TIMEOUT) ? window.API_CONFIG.PROBE_TIMEOUT : 1500;

  // Home page logic
  if (document.getElementById('ranking-table')) {
    // NOTE: area `code` values are assumptions — adapt if your backend uses different numeric codes.
    const filterConfig = {
      areas: [
        { id: 'ai', name: 'AI', code: 1 },
        { id: 'theory', name: 'Theory', code: 2 },
        { id: 'systems', name: 'Systems', code: 3 },
        { id: 'security', name: 'Security', code: 4 },
        { id: 'vision', name: 'Vision', code: 5 },
        { id: 'graphics', name: 'Graphics', code: 6 }
      ],
      startYear: 2020,
      endYear: 2023,
    };

    // 1. Initialize all widgets
    const filterWidget = new FilterWidget('filter-panel', filterConfig);
    const rankingTableWidget = new RankingTableWidget('ranking-table');
  const dataTable = new FullDataTable('/site/data/full-data.json', apiBase, probeTimeout);
    await dataTable.loadData();

    // 2. Function to update rankings — strict server-side usage of /api/rankings/
    const updateRankings = async () => {
      const currentFilters = filterWidget.getState();
      if (!apiBase) {
        // show warning banner
        const existing = document.getElementById('backend-warning-banner');
        if (!existing) {
          const b = document.createElement('div');
          b.id = 'backend-warning-banner';
          b.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4';
          b.innerHTML = `<strong>Server rankings required:</strong> no ` +
                        `API base configured. The frontend is configured to use /api/rankings/.`;
          const root = document.body || document.getElementsByTagName('body')[0];
          if (root) root.insertBefore(b, root.firstChild);
        }
        rankingTableWidget.setData([]);
        return;
      }

      try {
  const params = new URLSearchParams();
  if (currentFilters.startYear) params.set('start_year', String(currentFilters.startYear));
  if (currentFilters.endYear) params.set('end_year', String(currentFilters.endYear));
  if (currentFilters.areas && currentFilters.areas.size) params.set('area', Array.from(currentFilters.areas).map(a => String(a)).join(','));
  const res = await fetch(`${apiBase}/rankings/?${params.toString()}`);
        if (!res.ok) {
          console.error('Failed to fetch /api/rankings/:', res.status);
          rankingTableWidget.setData([]);
          return;
        }
        const payload = await res.json();
        const newRankings = (payload.institutions || []).map(i => ({ rank: i.rank, institution: i.institution, score: i.score }));
        rankingTableWidget.setData(newRankings);
      } catch (e) {
        console.error('Error fetching /api/rankings/:', e);
        rankingTableWidget.setData([]);
      }
    };

    // 3. Listen for filter changes
    document.addEventListener('filtersChanged', () => {
      updateRankings();
    });

    // 4. Initial render
    updateRankings();
  }

  // Institution page
  if (document.querySelector('.institution-profile')) {
    new InstitutionProfileWidget('.institution-profile');
  }

  // Faculty listing page: show top faculties per institution
  if (document.getElementById('faculty-listing')) {
    // ensure we have filters initialized similarly to homepage
    const defaultAreas = [
      { id: 'ai', name: 'AI', code: 1 },
      { id: 'theory', name: 'Theory', code: 2 },
      { id: 'systems', name: 'Systems', code: 3 },
      { id: 'security', name: 'Security', code: 4 },
      { id: 'vision', name: 'Vision', code: 5 },
      { id: 'graphics', name: 'Graphics', code: 6 }
    ];
    const remoteAreas = await fetchAreaOptions(apiBase);
    const filterConfig = { areas: remoteAreas || defaultAreas, startYear: 2020, endYear: 2023 };
    const filterWidget = new FilterWidget('filter-panel', filterConfig);
  const dataTable = new FullDataTable('/site/data/full-data.json', apiBase, probeTimeout);
    await dataTable.loadData();
    // Require server-side rankings to populate faculty listing
    let serverTopData = null;
    if (!apiBase) {
      const root = document.body || document.getElementsByTagName('body')[0];
      const b = document.createElement('div');
      b.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4';
      b.innerHTML = `<strong>Server rankings required for faculty listing:</strong> configure API_BASE to point to your backend.`;
      if (root) root.insertBefore(b, root.firstChild);
      const facultyList = new FacultyListWidget('faculty-listing', dataTable, filterWidget.getState(), null);
      return;
    }

    const fetchAndRender = async (filters) => {
      try {
        // spinner
        const listContainer = document.getElementById('faculty-listing');
        if (listContainer) {
          listContainer.innerHTML = `<div class="p-6 flex items-center justify-center"><svg class="animate-spin h-6 w-6 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg><span class="ml-3 text-gray-700">Loading faculty…</span></div>`;
        }
        const params = new URLSearchParams();
        if (filters.startYear) params.set('start_year', String(filters.startYear));
        if (filters.endYear) params.set('end_year', String(filters.endYear));
        if (filters.areas && filters.areas.size) params.set('area', Array.from(filters.areas).map(a => String(a)).join(','));
        const res = await fetch(`${apiBase}/rankings/?${params.toString()}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        serverTopData = await res.json();
        if (window.currentFacultyList) {
          window.currentFacultyList.serverTopData = serverTopData;
          window.currentFacultyList.filters = filters;
          window.currentFacultyList.render();
        } else {
          const facultyList = new FacultyListWidget('faculty-listing', dataTable, filters, serverTopData);
          window.currentFacultyList = facultyList;
        }
      } catch (e) {
        console.error('Could not fetch /api/rankings/ for faculty listing:', e);
        const root = document.body || document.getElementsByTagName('body')[0];
        const b = document.createElement('div');
        b.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4';
        b.innerHTML = `<strong>Failed to load server rankings:</strong> check backend availability and CORS.`;
        if (root) root.insertBefore(b, root.firstChild);
        const facultyList = new FacultyListWidget('faculty-listing', dataTable, filterWidget.getState(), null);
        window.currentFacultyList = facultyList;
      }
    };

    // initial fetch
    fetchAndRender(filterWidget.getState());

    // Listen to filter changes and re-fetch server rankings
    document.addEventListener('filtersChanged', (e) => {
      const newFilters = e.detail;
      fetchAndRender(newFilters);
      // Also update any existing client-side widget state
      if (window.currentFacultyList) {
        window.currentFacultyList.filters = newFilters;
        window.currentFacultyList.render();
      }
    });
  }
});
