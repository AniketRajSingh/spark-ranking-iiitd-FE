ICSRank — static frontend scaffold

This folder contains a minimal static frontend scaffold for ICSRank.

Preview locally (Python 3):

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Files:
- `index.html`, `pages/*.html` — main pages
 - `index.html`, `pages/*.html` — main pages
 - Tailwind CSS via CDN is used for styling (no compiled CSS required).
 - `js/app.js` — small JS to load widgets and data
- `data/*.json` — mock API fixtures

Notes on scoring/weights:
- The frontend applies publication weighting when computing scores. If a publication record includes a numeric `weight` field it is used directly. Otherwise the code maps `core_rank` values: 'A*' -> 4, 'A' -> 2, default 1. Fractional authorship is used (1/N per author) and then multiplied by the publication weight.
