// navbar.js — SPARK Navigation Bar
// Renders: Logo, nav links (active-aware), mobile hamburger menu.
// No hardcoded institution IDs. Accessible with ARIA attributes.

(function () {
  const NAV_LINKS = [
    { href: '/site/index.html',              label: 'Home' },
    { href: '/site/pages/faculty.html',      label: 'Faculty' },
    { href: '/site/pages/conference.html',   label: 'Conferences' },
    { href: '/site/pages/compare.html',      label: 'Compare' },
    { href: '/site/pages/methodology.html',  label: 'Methodology' },
    { href: '/site/pages/about.html',        label: 'About' },
  ];

  function isActive(href) {
    const current = window.location.pathname;
    // treat /site/index.html and / both as home
    if (href.endsWith('index.html')) return current.endsWith('index.html') || current === '/' || current.endsWith('/site/');
    return current.endsWith(href.split('/').pop());
  }

  function renderNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const linksHTML = NAV_LINKS.map(link => {
      const active = isActive(link.href);
      return `<a
        href="${link.href}"
        class="nav-link${active ? ' nav-link-active' : ''}"
        ${active ? 'aria-current="page"' : ''}
      >${link.label}</a>`;
    }).join('');

    const mobileLinksHTML = NAV_LINKS.map(link => {
      const active = isActive(link.href);
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
            <a href="/site/index.html" class="flex items-center gap-3 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg" aria-label="SPARK home">
              <img src="/logo.png" alt="SPARK logo" class="h-9 w-auto" onerror="this.style.display='none'">
              <div class="flex flex-col leading-tight">
                <span class="text-lg font-bold text-gray-900 tracking-tight">SPARK</span>
                <span class="text-[10px] text-gray-400 font-medium tracking-wide hidden sm:block">Scholarly Publication Rankings</span>
              </div>
            </a>

            <!-- Desktop nav -->
            <nav class="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation">
              ${linksHTML}
            </nav>

            <!-- Hamburger (mobile) -->
            <button
              id="nav-toggle"
              class="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-teal-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-150"
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
          class="md:hidden hidden border-t border-gray-100 bg-white"
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

  document.addEventListener('DOMContentLoaded', renderNavbar);
})();
