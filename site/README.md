SPARK — static frontend scaffold

This folder contains the static frontend codebase for SPARK.

Preview locally (Python 3):

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Files:
- `index.html`, `pages/*.html` — main pages styled with premium glassmorphic dark-teal designs.
- `css/tailwind.css` — compiled offline stylesheet.
- `env.js` — local environment file containing `API_BASE` configurations mapping to the Django REST server (copy from `env.template.js`).
- `js/pages/*.js` — page-specific modular ES6 page initializers.
- `js/widgets/*.js` — reusable, self-contained widgets:
  - `Filter.js` — collapsible top-bar filter panel supporting year ranges, check-state toggles (escaped class fallbacks), and a dedicated "Apply Filters" button.
  - `SearchBar.js` — centralized search utility handling debounced typeahead queries and Chrome/Safari clear-button format normalization.
  - `RankingTable.js`, `FacultyList.js`, `InstitutionProfile.js`, `FacultyProfile.js`, `CompareWidget.js`, `ConferenceList.js` — details widgets.

Notes on scoring/weights:
- The frontend displays publication weighting when showing scores. If a publication record includes a numeric `weight` field it is used directly. Otherwise the code maps `core_rank` values: 'A*' -> 4, 'A' -> 2, default 1. Fractional authorship is used (1/N per author) and then multiplied by the publication weight.

Authorships & Profile Mapping:
- Faculty profiles fetch from the `/api/faculty/{id}/` endpoint. To ensure compatibility with Django rest serialization, the profile widget maps nested `authorships` to publication lines when direct `publications` attributes are absent.
