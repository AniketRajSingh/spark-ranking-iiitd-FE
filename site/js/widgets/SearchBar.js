// js/widgets/SearchBar.js — SPARK Reusable Search Bar Widget
// Centralizes HTML structure, input type formatting, absolute clear triggers, and debounce handlers.
import { escapeHTML } from '../utils/sanitize.js';

export default class SearchBarWidget {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.placeholder = options.placeholder || 'Search...';
    this.onSearch = options.onSearch || (() => {});
    this.debounceMs = options.debounceMs !== undefined ? options.debounceMs : 300;
    
    this._debounceTimer = null;

    if (!this.container) return;
    this.render();
    this._attachListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="relative search-wrapper w-full" id="search-wrapper">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
        </div>
        <input
          id="search-input"
          type="text"
          placeholder="${escapeHTML(this.placeholder)}"
          class="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
          aria-label="${escapeHTML(this.placeholder)}"
          autocomplete="off"
        />
        <button
          id="search-clear"
          class="search-clear absolute inset-y-0 right-0 items-center pr-3 text-gray-400 hover:text-gray-600 hidden"
          aria-label="Clear search"
          type="button"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Inject styles for displaying search clear button if not already in document
    if (!document.getElementById('search-bar-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'search-bar-custom-styles';
      style.textContent = `
        .search-clear.show-clear {
          display: flex !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  _attachListeners() {
    const input = this.container.querySelector('#search-input');
    const clearBtn = this.container.querySelector('#search-clear');
    const wrapper = this.container.querySelector('#search-wrapper');

    if (!input || !clearBtn || !wrapper) return;

    const handleInput = (val) => {
      if (val.trim()) {
        clearBtn.classList.add('show-clear');
        wrapper.classList.add('has-value');
      } else {
        clearBtn.classList.remove('show-clear');
        wrapper.classList.remove('has-value');
      }

      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.onSearch(val.trim());
      }, this.debounceMs);
    };

    input.addEventListener('input', e => handleInput(e.target.value));

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(this._debounceTimer);
        this.onSearch(input.value.trim());
      }
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.remove('show-clear');
      wrapper.classList.remove('has-value');
      this.onSearch('');
    });
  }

  getValue() {
    const input = this.container.querySelector('#search-input');
    return input ? input.value.trim() : '';
  }

  setValue(val) {
    const input = this.container.querySelector('#search-input');
    const clearBtn = this.container.querySelector('#search-clear');
    const wrapper = this.container.querySelector('#search-wrapper');
    if (!input) return;
    input.value = val;
    if (val.trim()) {
      if (clearBtn) clearBtn.classList.add('show-clear');
      if (wrapper) wrapper.classList.add('has-value');
    } else {
      if (clearBtn) clearBtn.classList.remove('show-clear');
      if (wrapper) wrapper.classList.remove('has-value');
    }
  }
}
