// widgets/Pagination.js — Reusable Clean Pagination Component for SPARK
import { escapeHTML } from '../utils/sanitize.js';

/**
 * Render pagination controls HTML.
 * @param {Object} options
 * @param {number} options.currentPage - 1-based current page
 * @param {number} options.totalPages - Total number of pages
 * @param {number} options.totalItems - Total count of items
 * @param {number} options.pageSize - Items per page
 * @param {string} [options.idPrefix='pagination'] - Unique ID prefix for buttons
 * @returns {string} HTML string
 */
export function renderPaginationHTML({ currentPage, totalPages, totalItems, pageSize, idPrefix = 'pagination' }) {
  if (totalPages <= 1) return '';

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis window
  const pages = [];
  const delta = 2; // surrounding pages
  const left = currentPage - delta;
  const right = currentPage + delta;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const pageButtons = pages.map(p => {
    if (p === '...') {
      return `<span class="px-2 py-1 text-xs text-gray-400 select-none">…</span>`;
    }
    const isCurrent = p === currentPage;
    return `
      <button
        type="button"
        data-page="${p}"
        class="${idPrefix}-page-btn w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg transition-colors
               ${isCurrent
                 ? 'bg-teal-600 text-white shadow-sm'
                 : 'text-gray-700 hover:bg-gray-100 hover:text-teal-700 border border-gray-200'}"
        ${isCurrent ? 'aria-current="page"' : ''}
      >
        ${p}
      </button>
    `;
  }).join('');

  return `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 bg-white">
      <p class="text-xs text-gray-500 font-medium">
        Showing <span class="font-semibold text-gray-800">${startItem}</span> to <span class="font-semibold text-gray-800">${endItem}</span> of <span class="font-semibold text-gray-800">${totalItems}</span> results
      </p>

      <div class="flex items-center gap-1.5 flex-wrap justify-center">
        <!-- Prev Button -->
        <button
          type="button"
          data-page="${currentPage - 1}"
          class="${idPrefix}-prev-btn px-2.5 h-8 flex items-center gap-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          ${currentPage <= 1 ? 'disabled' : ''}
          aria-label="Previous page"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          <span>Prev</span>
        </button>

        <!-- Page Numbers -->
        ${pageButtons}

        <!-- Next Button -->
        <button
          type="button"
          data-page="${currentPage + 1}"
          class="${idPrefix}-next-btn px-2.5 h-8 flex items-center gap-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          ${currentPage >= totalPages ? 'disabled' : ''}
          aria-label="Next page"
        >
          <span>Next</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Attach click listeners to pagination buttons.
 * @param {HTMLElement} container
 * @param {Function} onPageChange - Callback receiving new page number
 * @param {string} [idPrefix='pagination']
 */
export function attachPaginationListeners(container, onPageChange, idPrefix = 'pagination') {
  if (!container || typeof onPageChange !== 'function') return;

  const handleBtnClick = (e) => {
    const btn = e.target.closest(`button[data-page]`);
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page, 10);
    if (!isNaN(page)) {
      onPageChange(page);
    }
  };

  container.querySelectorAll(`.${idPrefix}-page-btn, .${idPrefix}-prev-btn, .${idPrefix}-next-btn`).forEach(btn => {
    btn.addEventListener('click', handleBtnClick);
  });
}
