// site/js/widgets/InstitutionProfile.js

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

class InstitutionProfileWidget {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;

    this.nameEl = this.container.querySelector('#inst-name');
    this.summaryEl = this.container.querySelector('#inst-summary');
    this.websiteEl = this.container.querySelector('#inst-website');
    this.facultyListEl = this.container.querySelector('#top-faculty');
    
    this.init();
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const instId = params.get('id');
    if (!instId) {
        this.container.innerHTML = "<p>No institution ID provided.</p>";
        return;
    }

    // In a real app, this would be `/api/institutions/${instId}`
    const dataUrl = instId === '8' ? '/site/data/institution.json' : '/site/data/institution-generic.json';
    const data = await fetchJSON(dataUrl);

    if (data) {
      this.render(data);
    } else {
      this.container.innerHTML = "<p>Could not load institution data.</p>";
    }
  }

  render(data) {
    this.nameEl.textContent = data.name;
    this.summaryEl.textContent = data.summary || '';
    
    if (this.websiteEl && data.website) {
      this.websiteEl.href = data.website;
      this.websiteEl.textContent = data.website;
    }

    if (this.facultyListEl && data.top_faculty) {
      this.facultyListEl.innerHTML = data.top_faculty
        .map(f => `<li><a href="${f.url}">${f.name}</a> — ${f.score}</li>`)
        .join('');
    }
  }
}
