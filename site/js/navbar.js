// navbar.js — SPARK Navigation Bar
// Renders: Logo, nav links (active-aware), mobile hamburger menu.
// No hardcoded institution IDs. Accessible with ARIA attributes.
// Dynamic pathing for portability.

(function () {
  const isSubpage = window.location.pathname.includes('/pages/');
  const prefix = isSubpage ? '../' : './';

  const NAV_LINKS = [
    { href: `${prefix}index.html`,              label: 'Home', key: 'index.html' },
    { href: `${prefix}pages/faculty.html`,      label: 'Faculty', key: 'faculty.html' },
    { href: `${prefix}pages/conference.html`,   label: 'Conferences', key: 'conference.html' },
    { href: `${prefix}pages/compare.html`,      label: 'Compare', key: 'compare.html' },
    { href: `${prefix}pages/methodology.html`,  label: 'Methodology', key: 'methodology.html' },
    { href: `${prefix}pages/about.html`,        label: 'About', key: 'about.html' },
  ];

  function isActive(link) {
    const current = window.location.pathname;
    if (link.key === 'index.html') {
      return current.endsWith('index.html') || current === '/' || current.endsWith('/site/') || current.endsWith('/site');
    }
    return current.endsWith(link.key) || current.includes(`/${link.key.split('.')[0]}`);
  }

  function renderNavbar() {
    // Inject responsive utility classes that might have been purged or are missing in compiled css
    if (!document.getElementById('navbar-responsive-styles')) {
      const style = document.createElement('style');
      style.id = 'navbar-responsive-styles';
      style.textContent = `
        @media (min-width: 640px) {
          .sm\\:hidden { display: none !important; }
          .sm\\:flex { display: flex !important; }
          .sm\\:block { display: block !important; }
        }
        @media (min-width: 768px) {
          .md\\:hidden { display: none !important; }
          .md\\:flex { display: flex !important; }
          .md\\:block { display: block !important; }
        }
      `;
      document.head.appendChild(style);
    }

    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    // Basis detection
    const urlParams = new URLSearchParams(window.location.search);
    const urlBasis = urlParams.get('basis');
    const validUrlBasis = (urlBasis === 'venue' || urlBasis === 'title') ? urlBasis : null;
    let storedBasis = null;
    try {
      const s = localStorage.getItem('spark.areaBasis');
      if (s === 'venue' || s === 'title') storedBasis = s;
    } catch (_) {}

    const requestedBasis = validUrlBasis || storedBasis || null;
    let activeBasis = requestedBasis || 'venue'; // visual default before server header check
    const hasStoredChoice = Boolean(storedBasis || validUrlBasis);

    function createBasisToggleHTML(idPrefix) {
      const isVenue = activeBasis === 'venue';
      const isTitle = activeBasis === 'title';
      return `
        <div class="flex items-center gap-1.5 bg-gray-100/90 p-0.5 rounded-lg border border-gray-200/70 text-xs font-medium" role="group" aria-label="Area classification basis">
          <span class="text-[10px] uppercase font-bold text-gray-400 pl-1.5 pr-0.5 hidden xl:inline">Basis:</span>
          <button type="button" id="${idPrefix}-basis-venue"
            class="px-2 py-1 rounded-md transition-all duration-150 ${isVenue ? 'bg-white text-teal-800 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'}"
            title="Classify paper area using conference venue FoR codes">
            By venue
          </button>
          <button type="button" id="${idPrefix}-basis-title"
            class="px-2 py-1 rounded-md transition-all duration-150 ${isTitle ? 'bg-white text-teal-800 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'}"
            title="Classify paper area using title-based language model (SPECTER2)">
            By title
          </button>
          ${hasStoredChoice ? `
            <button type="button" id="${idPrefix}-basis-reset"
              class="px-1.5 py-1 text-[11px] text-gray-400 hover:text-red-600 transition-colors"
              title="Reset to server default">
              ✕
            </button>` : ''}
        </div>
      `;
    }

    const linksHTML = NAV_LINKS.map(link => {
      const active = isActive(link);
      return `<a
        href="${link.href}"
        class="${active ? 'text-teal-600 font-semibold border-b-2 border-teal-600 pb-1' : 'text-gray-700 hover:text-teal-600 font-medium'} transition-colors duration-150"
        ${active ? 'aria-current="page"' : ''}
      >${link.label}</a>`;
    }).join('');

    const mobileLinksHTML = NAV_LINKS.map(link => {
      const active = isActive(link);
      return `<a
        href="${link.href}"
        class="block px-4 py-3 text-base font-medium rounded-lg transition-colors duration-150
               ${active ? 'text-teal-600 bg-teal-50' : 'text-gray-700 hover:bg-gray-50 hover:text-teal-600'}"
        ${active ? 'aria-current="page"' : ''}
      >${link.label}</a>`;
    }).join('');

    /* escapeHTML */
    placeholder.innerHTML = `
      <header class="w-full bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">

            <!-- Logo -->
            <a href="${prefix}index.html" class="flex items-center gap-3 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg" aria-label="SPARK home">
              <img src="${prefix}logo.png" alt="SPARK logo" class="h-9 w-auto" onerror="this.style.display='none'">
              <div class="flex flex-col leading-tight">
                <span class="text-lg font-bold text-gray-900 tracking-tight">SPARK</span>
                <span class="text-[10px] text-gray-400 font-medium tracking-wide hidden sm:block">Scholarly Publication Rankings</span>
              </div>
            </a>

            <!-- Desktop nav & Basis toggle -->
            <div class="hidden sm:flex items-center gap-6">
              <nav class="flex items-center gap-6" role="navigation" aria-label="Main navigation">
                ${linksHTML}
              </nav>
              <div id="desktop-basis-toggle" class="flex items-center">
                ${createBasisToggleHTML('desktop')}
              </div>
            </div>

            <!-- Hamburger (mobile) -->
            <button
              id="nav-toggle"
              class="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-teal-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-150"
              aria-expanded="false"
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
              <svg id="hamburger-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              <svg id="close-icon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

          </div>
        </div>

        <!-- Mobile drawer -->
        <div
          id="mobile-menu"
          class="sm:hidden hidden border-t border-gray-100 bg-white"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div class="px-4 py-3 space-y-1">
            ${mobileLinksHTML}
            <div class="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Area Basis</span>
              ${createBasisToggleHTML('mobile')}
            </div>
          </div>
        </div>
      </header>
    `;

    function updateToggleVisuals(basisVal) {
      ['desktop', 'mobile'].forEach(prefix => {
        const vBtn = document.getElementById(`${prefix}-basis-venue`);
        const tBtn = document.getElementById(`${prefix}-basis-title`);
        if (vBtn && tBtn) {
          if (basisVal === 'title') {
            vBtn.className = 'px-2 py-1 rounded-md transition-all duration-150 text-gray-500 hover:text-gray-900';
            tBtn.className = 'px-2 py-1 rounded-md transition-all duration-150 bg-white text-teal-800 shadow-sm font-semibold';
          } else {
            tBtn.className = 'px-2 py-1 rounded-md transition-all duration-150 text-gray-500 hover:text-gray-900';
            vBtn.className = 'px-2 py-1 rounded-md transition-all duration-150 bg-white text-teal-800 shadow-sm font-semibold';
          }
        }
      });
    }

    // Basis toggle handlers
    function setupBasisListeners(idPrefix) {
      const btnVenue = document.getElementById(`${idPrefix}-basis-venue`);
      const btnTitle = document.getElementById(`${idPrefix}-basis-title`);
      const btnReset = document.getElementById(`${idPrefix}-basis-reset`);

      const applyBasis = (basisVal) => {
        try {
          if (basisVal) {
            localStorage.setItem('spark.areaBasis', basisVal);
          } else {
            localStorage.removeItem('spark.areaBasis');
          }
        } catch (_) {}
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('basis');
        if (cleanUrl.toString() !== window.location.href) {
          window.location.href = cleanUrl.toString();
        } else {
          window.location.reload();
        }
      };

      if (btnVenue) btnVenue.addEventListener('click', () => applyBasis('venue'));
      if (btnTitle) btnTitle.addEventListener('click', () => applyBasis('title'));
      if (btnReset) btnReset.addEventListener('click', () => applyBasis(null));
    }

    setupBasisListeners('desktop');
    setupBasisListeners('mobile');

    // React to server basis detection from any API response
    document.addEventListener('spark:basisDetected', (e) => {
      if (!requestedBasis && e.detail && e.detail.basis) {
        updateToggleVisuals(e.detail.basis);
      }
    });

    // If no choice was stored, detect server default basis from header and update buttons visually
    if (!requestedBasis) {
      const apiBase = (window.SPARK_CONFIG && window.SPARK_CONFIG.API_BASE) ||
                      (window.__ENV__ && window.__ENV__.API_BASE) || '';
      if (apiBase) {
        fetch(`${apiBase}/areas/`).then(res => {
          const header = res.headers ? res.headers.get('x-spark-area-basis') : null;
          if (header && (header === 'venue' || header === 'title') && header !== activeBasis) {
            updateToggleVisuals(header);
          }
        }).catch(() => {});
      }
    }

    // Hamburger toggle logic
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('mobile-menu');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const closeIcon = document.getElementById('close-icon');

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', String(!open));
        hamburgerIcon.classList.toggle('hidden');
        closeIcon.classList.toggle('hidden');
      });

      // Close drawer when a link is clicked
      menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          menu.classList.add('hidden');
          toggle.setAttribute('aria-expanded', 'false');
          hamburgerIcon.classList.remove('hidden');
          closeIcon.classList.add('hidden');
        });
      });
    }
  }

  // Load handler
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavbar);
  } else {
    renderNavbar();
  }
})();
