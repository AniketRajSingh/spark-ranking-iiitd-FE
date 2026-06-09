function renderNavbar() {
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  if (!navbarPlaceholder) {
    console.error('Navbar placeholder not found!');
    return;
  }

  const navbarHTML = `
    <header class="w-full bg-white shadow-sm">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <a href="/site/index.html" class="inline-flex items-center gap-3">
            <img src="/logo.png" alt="ICSRank logo" class="h-10 w-auto">
            <span class="text-xl font-semibold text-gray-800">ICSRank</span>
          </a>
        </div>
        <nav class="space-x-6 hidden sm:flex">
          <a href="/site/index.html" class="text-gray-700 hover:text-teal-600 font-medium">Home</a>
          <a href="/site/pages/institution.html?id=8" class="text-gray-700 hover:text-teal-600 font-medium">Institution</a>
          <a href="/site/pages/faculty.html" class="text-gray-700 hover:text-teal-600 font-medium">Faculty</a>
          <a href="/site/pages/methodology.html" class="text-gray-700 hover:text-teal-600 font-medium">Methodology</a>
        </nav>
      </div>
    </header>
  `;

  navbarPlaceholder.innerHTML = navbarHTML;
}

document.addEventListener('DOMContentLoaded', renderNavbar);
