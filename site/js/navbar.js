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

            <!-- Desktop nav -->
            <nav class="hidden sm:flex items-center gap-6" role="navigation" aria-label="Main navigation">
              ${linksHTML}
            </nav>

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
          </div>
        </div>
      </header>
    `;

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
