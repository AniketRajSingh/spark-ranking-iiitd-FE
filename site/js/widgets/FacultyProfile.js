// site/js/widgets/FacultyProfile.js

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

class FacultyProfileWidget {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.nameEl = this.container.querySelector('#faculty-name');
        this.bioEl = this.container.querySelector('#faculty-bio');
        this.pubsEl = this.container.querySelector('#faculty-pubs');

        this.init();
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        const facultyId = params.get('id');

        if (!facultyId) {
            this.container.innerHTML = '<p>Faculty member not found.</p>';
            return;
        }

        // This is a simplified loader. In a real app, you'd have a single endpoint like /api/faculty/${facultyId}
        const dataUrl = facultyId === '101' ? '/site/data/faculty.json' : `/site/data/faculty-${facultyId}.json`;
        const data = await fetchJSON(dataUrl);

        if (data) {
            this.render(data);
        } else {
            this.container.innerHTML = '<p>Could not load faculty data.</p>';
        }
    }

    render(data) {
        this.nameEl.textContent = data.name;
        this.bioEl.textContent = data.bio || '';

        if (this.pubsEl && data.pubs) {
            this.pubsEl.innerHTML = data.pubs
                .map(p => `<li><b>${p.title}</b> (${p.year}) - <i>${p.conference}</i></li>`)
                .join('');
        }
    }
}
