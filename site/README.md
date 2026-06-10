SPARK — static frontend scaffold

This folder contains the static frontend codebase for SPARK.

Preview locally (Python 3):

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Files:
- `index.html`, `pages/*.html` — main pages
- `css/tailwind.css` — compiled offline stylesheet.
- `js/pages/*.js` — page-specific modular ES6 initializers.
- `js/widgets/*.js` — reusable widget components.

Notes on scoring/weights:
- The frontend displays publication weighting when showing scores. If a publication record includes a numeric `weight` field it is used directly. Otherwise the code maps `core_rank` values: 'A*' -> 4, 'A' -> 2, default 1. Fractional authorship is used (1/N per author) and then multiplied by the publication weight.
