# SPARK Frontend Development Timeline

This document tracks all design modifications, architectural shifts, and development iterations of the SPARK (Scholarly Publication & Academic Ranking Knowledgebase) frontend repository in chronological order.

## Format Guidelines
- **Date** (YYYY-MM-DD)
  - **Type**: Commit hash (or `[Local Uncommitted Changes]`)
  - **Summary**: High-level explanation of the iteration.
  - **Details**: Bullet points of specific file edits, component creations, style updates, and architectural shifts.

---

## Development History

### 2026-06-25
- **Type**: `[Local Uncommitted Changes]` (Methodology Updates)
- **Summary**: Updated the methodology and about sections to reflect the backend changes regarding geometric mean scoring for institutions and adjunct paper exclusion.
- **Details**:
  - **Methodology Page**: Updated `methodology.html` sections 3 and 4 to explain the new **geometric mean** scoring across the 10 broad CS categories for institutions, and document the exclusion of adjunct, visiting, and honorary faculty publications from institutional rankings.
  - **About Page**: Updated `about.html` description of scoring computations.

### 2026-06-17
- **Type**: `[Local Uncommitted Changes]` (Backend Integration Overhaul)
- **Summary**: Refactored frontend data fetching layer to consume compliant Django/REST backend APIs directly, eliminating massive payload transfers and reverting complex client-side calculations.
- **Details**:
  - **Institution Profile Widget**: Reverted `InstitutionProfile.js` to query `/api/institutions/{id}/`, `/api/institutions/{id}/trends/`, and `/api/publications/?institution={id}` in parallel, removing generic listings fetch. Mapped raw research area codes to broad names on the fly.
  - **Faculty rankings page**: Refactored `faculty.js` page initializer to query `/api/faculty/?${params}` directly on filter/search change, delegating fractional authorship score calculation and zero-score record filtering to the backend. Removed `/api/publications/` fetch completely.
  - **Faculty Profile page**: Modified `FacultyProfile.js` to query `/api/faculty/{id}/` directly, extracting nested publication listings and precalculated A*/A score breakdown values without downloading the full global publication database. Merged details from the generic `/api/faculty/` listing endpoint to retrieve missing profile fields (`homepage`, `irins_id`, `orcid`, `designation`, `department`).
  - **Compare Widget**: Updated `CompareWidget.js` to map raw taxonomy codes (e.g. `4602`, `4608`) to broad human-readable categories before generating comparative radar charts.
  - **Research Venues fixes**:
    - **Modal Publication List**: Fixed `ConferenceList.js` to match publication records by conference acronym (e.g. `AAAI`, `CVPR`) rather than database ID, resolving the "No papers found" empty modal state when clicking eligible venues.
    - **Research Area filtering**: Fixed `ConferenceList.js` `_filtered()` logic to map raw conference area codes to broad area IDs using `AREA_TAXONOMY` before checking selected filters, restoring correct category filtering behavior on the page.
  - **Research Area Code Resolution**: Mapped raw Field of Research taxonomy codes (e.g. `4602`, `4608`, etc.) to their broad category names (e.g. `AI & ML`, `HCI & Multimedia`) across all display locations (Faculty Profile research area chips, Conferences table columns, and Modal Publications lists) using `AREA_TAXONOMY` and `BROAD_AREAS`.

### 2026-06-11
- **Type**: `[Local Uncommitted Changes]` (Current Active Overhaul)
- **Summary**: Comprehensive refactoring to ES6 modules, dynamic relative link resolution, Chart.js integrations, addition of elite sub-pages, responsive layout fine-tuning, and client-side dynamic faculty score calculations.
- **Details**:
  - **Client-Side Dynamic Faculty Score Calculations**:
    - Resolved issues where the backend `/api/faculty/` endpoint returned static total scores regardless of active year range or research area filters.
    - Loaded the `/api/publications/` dataset on page initialisation and computed dynamically-filtered fractional authorship credits (scaled with CORE prestige weights: A*=4, A=2) on the client side.
    - Configured the faculty list to conditionally display 0-score records by default (when no filters are applied) and when searching, but exclude them when custom year or area filters are active.
    - Fixed the Filter panel "Clear" button to completely reset year fields and checked boxes, collapse the panel, and trigger the filter change dispatch immediately.
  - **Architectural Overhaul (ES Modules)**:
    - Transformed all utility scripts under `site/js/utils/` (`sanitize.js`, `errorCard.js`, `fetchJSON.js`, `areaTaxonomy.js`) to exportable ES modules.
    - Converted all widgets (`Filter.js`, `RankingTable.js`, `FacultyList.js`, `InstitutionProfile.js`, `FacultyProfile.js`) to ES6 class modules.
    - Split `app.js` into page-specific module scripts under `site/js/pages/` (`home.js`, `faculty.js`, `institution.js`, `faculty-profile.js`, `conference.js`, `compare.js`).
    - Deleted obsolete `FullDataTable.js` and legacy JS initializers.
  - **Dynamic Routing & Path Portability**:
    - Created dynamic relative prefix resolver in `navbar.js` to ensure the application works whether hosted at the server root, a subdirectory, or loaded directly via `file://`.
    - Copied the logo asset to `site/logo.png` to support relative layout resolving.
    - Standardized navigation links with explicit, responsive Tailwind CSS classes (`text-gray-700 hover:text-teal-600 font-medium`) instead of unstyled custom tags.
    - Adjusted the responsive breakpoint in `navbar.js` from `md:` (768px) to `sm:` (640px) to hide the hamburger button and collapsible drawer on tablet and laptop viewports, keeping the dropdown strictly on mobile.
  - **Premium UI / UX Design System**:
    - Overhauled `faculty.html`, `institution.html`, `faculty-profile.html`, and `methodology.html` to reference compiled offline `css/tailwind.css` and use the matching glassmorphism typography and dark-teal design styles.
    - Integrated standard SEO metadata blocks, descriptive page titles, and favicon anchors across all pages.
    - Created a reusable `SearchBarWidget` class (`widgets/SearchBar.js`) to centralize input markup, clear button interactions, and debounced callback queries, which resolved native vs custom double-clear button redundancies on Chrome/Safari.
    - Injected dynamic responsive CSS utilities (`sm:hidden`, `sm:flex`, `sm:block`, etc.) within `navbar.js` to ensure the mobile dropdown toggle menu and desktop navigation layout display correctly across all viewports, overcoming compiled Tailwind CSS purge omissions.
    - Moved the filter panel from the right sidebar to a horizontal, collapsible layout at the top of all pages (`index.html`, `faculty.html`, `conference.html`), expanding the list cards to full width.
    - Redesigned the filter panel to display only the Publication Year Range by default, adding a toggle to expand/collapse Research Areas, and an "Apply Filters" button to execute updates.
    - Handled checkbox visual active states by toggling custom `.filter-active` classes in JS and injecting the required styles dynamically, bypasssing purged tailwind class bugs.
    - Switched the Faculty rankings page to fetch from `/api/faculty/` directly instead of nested institution ranking records, resolving display restrictions to show the full list of faculty members and their true leaderboard rankings.
    - Added a search input bar to the Faculty leaderboard (`faculty.html`) to allow searching faculty members by name via a debounced API query.
    - Overhauled `FacultyProfile.js` to fetch `/api/faculty/{id}/` and `/api/publications/` in parallel. Mapped numeric authorship publication IDs to the publications list to dynamically display verified paper details.
    - Replaced confusing `"Unknown"` CORE rank badges for journals and transactions in `FacultyProfile.js` and `InstitutionProfile.js` with semantic slate `"Transaction"` or `"Journal"` badges (based on name patterns), while hiding badges for unranked conferences to preserve premium layout aesthetics.
    - Added dynamic biography generation in `FacultyProfile.js` that constructs a professional descriptive paragraph utilizing designation, department, and institution name when the bio field is null in the API.
    - Integrated direct URL links for Faculty Homepages, DBLP Profiles (resolving `dblp_pid`), Google Scholar, IRINS Profiles (resolving `irins_id` with website subdomain guessing), and ORCID Profiles.
  - **New Features & Pages**:
    - Created static About page (`about.html`).
    - Created Conferences directory (`conference.html` and `ConferenceList.js` widget) to list CORE A*/A venues with area-wise category filter bindings.
    - Created Compare page (`compare.html` and `CompareWidget.js` widget) providing typeahead searches for side-by-side scorecard comparisons and a Chart.js radar chart.
    - Integrated interactive Chart.js line graphs (annual score trends) and bar graphs (research area distributions) inside `InstitutionProfile.js`.
    - Overhauled `InstitutionProfile.js` to fetch institution details, rankings lists, faculty lists, and publications in parallel, dynamically computing the score, national rank, top faculty, annual score trends, and research area breakdown client-side to ensure full functionality when the backend returns minimal data or 404s on trends/stats/areas.
    - Implemented a clean, client-side pagination controller for publication tables on the institution profile page.
  - **Data Integration & Contracts**:
    - Developed `requirements_for_BE.txt` to serve as a specifications contract for backend developers.
    - Updated `requirements_for_BE.txt` to formally specify the new direct `/api/faculty/` leaderboard/search API endpoints and document support for Django through-model `authorships` nested schema mapping.
    - Normalized the naming conventions, renaming all occurrences of "ICSRank" to "SPARK" universally.
  - **Search Robustness & Custom Empty States**:
    - Integrated client-side fallback filtering in page initializers (`home.js`, `faculty.js`) to guarantee correct query results even if the backend search endpoints ignore search query parameters.
    - Updated `RankingTableWidget` (`RankingTable.js`) and `FacultyListWidget` (`FacultyList.js`) to cache and track the active `searchQuery`.
    - Added specific, clear empty states ("No institutions found matching 'IIT Kanpur'" or similar search query contexts) to replace confusing "No ranking data available for the selected filters." messages when searches yield zero results.
    - Added a keydown 'Enter' listener to `SearchBarWidget` (`SearchBar.js`) to allow immediate search query executions, bypassing the default 300ms debounce.
    - Updated `RankingTableWidget` (`RankingTable.js`) and `FacultyListWidget` (`FacultyList.js`) to exclude institutions and faculty members with 0 or negative points/scores when rendering, but bypass this filter if a search query is active (resolving search failures for autocomplete results lacking scores).
  - **Research Venues Enhancements**:
    - Integrated `SearchBarWidget` and added a CORE Rank selector dropdown to [conference.html](file:///Users/aniketrajsingh/Documents/GitHub/spark-ranking-iiitd-FE/site/pages/conference.html).
    - Updated [ConferenceList.js](file:///Users/aniketrajsingh/Documents/GitHub/spark-ranking-iiitd-FE/site/js/widgets/ConferenceList.js) to filter lists based on search queries, CORE rank values, and FoR category codes.
    - Implemented a detailed publication listing modal popup triggered by clicking any conference row, loading and caching all papers fetched from `/api/publications/` client-side.




### 2026-06-10
- **Type**: Commit `53ee12f`
- **Summary**: Integrated compiled Tailwind CSS stylesheet and cleaned up mock data fallbacks.
- **Details**:
  - Compiled and generated initial Tailwind CSS resources (`site/css/tailwind.css`).
  - Deleted legacy uncompiled CSS files (`styles.css`, `styles.legacy.css`).
  - Configured project environment structures with `env.template.js` and `.env.example`.

### 2026-06-09
- **Type**: Commit `c5d818f` & `dd68c0e`
- **Summary**: Initial repository scaffolding and base static layout profiles.
- **Details**:
  - Committed the base system specifications and layout document templates.
  - Created early structures for homepage rankings, institution overviews, and faculty listing files.
  - Formatted mock JSON profiles under a temporary local data directory.

---

## Instructions for Future AI Developers (System Prompt)

> [!IMPORTANT]
> When you modify this repository or prepare changes, you **MUST** update this timeline before concluding your turn or submitting your walkthrough.
> Maintain the chronological descending order (newest dates on top). Use the following format structure:
>
> ```markdown
> ### YYYY-MM-DD
> - **Type**: Commit `<hash>` / `[Local Uncommitted Changes]`
> - **Summary**: Brief summary of changes.
> - **Details**:
>   - Detail 1
>   - Detail 2
> ```
