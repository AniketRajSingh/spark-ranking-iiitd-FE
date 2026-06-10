// utils/errorCard.js — Unified error display for SPARK
// Replaces ad-hoc <p>Could not load...</p> patterns with a consistent, accessible card.

/**
 * Render a styled error card inside a container element.
 * @param {HTMLElement} container - Element to render the error card into
 * @param {string} message - Human-readable error message
 * @param {Function|null} [retryFn] - Optional retry callback; shows a Retry button if provided
 */
function renderErrorCard(container, message, retryFn = null) {
  if (!container) return;
  const retryBtn = retryFn
    ? `<button
         class="mt-2 px-4 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
         id="error-retry-btn"
       >Try Again</button>`
    : '';

  container.innerHTML = `
    <div class="error-card" role="alert" aria-live="assertive">
      <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-sm font-medium text-red-700">${escapeHTML(message)}</p>
      ${retryBtn}
    </div>
  `;

  if (retryFn) {
    const btn = container.querySelector('#error-retry-btn');
    if (btn) btn.addEventListener('click', () => retryFn());
  }
}

/**
 * Render a skeleton placeholder while data is loading.
 * @param {HTMLElement} container
 * @param {number} [rows=5] - Number of skeleton rows to show
 */
function renderSkeleton(container, rows = 5) {
  if (!container) return;
  container.setAttribute('aria-busy', 'true');
  const skeletonRows = Array.from({ length: rows }, (_, i) => `
    <tr>
      <td class="px-4 py-3"><div class="skeleton h-4 w-8"></div></td>
      <td class="px-4 py-3"><div class="skeleton h-4 w-48 ${i % 2 === 0 ? '' : 'w-40'}"></div></td>
      <td class="px-4 py-3"><div class="skeleton h-4 w-16"></div></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="overflow-x-auto rounded-xl border border-gray-100">
      <table class="min-w-full" aria-label="Loading...">
        <tbody class="divide-y divide-gray-100 bg-white animate-pulse">
          ${skeletonRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Remove aria-busy once loading is complete.
 * @param {HTMLElement} container
 */
function clearBusy(container) {
  if (container) container.removeAttribute('aria-busy');
}
