# SPARK Frontend Development Timeline

This document tracks all design modifications, architectural shifts, and development iterations of the SPARK (Scholarly Publication & Academic Ranking Knowledgebase) frontend repository in chronological order.

## Format Guidelines
- **Date** (YYYY-MM-DD)
  - **Type**: Commit hash (or `[Local Uncommitted Changes]`)
  - **Summary**: High-level explanation of the iteration.
  - **Details**: Bullet points of specific file edits, component creations, style updates, and architectural shifts.

---

## Development History

### 2026-06-11
- **Type**: `[Local Uncommitted Changes]` (Current Active Overhaul)
- **Summary**: Comprehensive refactoring to ES6 modules, dynamic relative link resolution, Chart.js integrations, addition of elite sub-pages, and responsive layout fine-tuning.
- **Details**:
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
    - Styled the homepage search input in `index.html` with premium Tailwind CSS utility classes to avoid overlaps with the search and clear icons.
    - Injected dynamic responsive CSS utilities (`sm:hidden`, `sm:flex`, `sm:block`, etc.) within `navbar.js` to ensure the mobile dropdown toggle menu and desktop navigation layout display correctly across all viewports, overcoming compiled Tailwind CSS purge omissions.
  - **New Features & Pages**:
    - Created static About page (`about.html`).
    - Created Conferences directory (`conference.html` and `ConferenceList.js` widget) to list CORE A*/A venues with area-wise category filter bindings.
    - Created Compare page (`compare.html` and `CompareWidget.js` widget) providing typeahead searches for side-by-side scorecard comparisons and a Chart.js radar chart.
    - Integrated interactive Chart.js line graphs (annual score trends) and bar graphs (research area distributions) inside `InstitutionProfile.js`.
    - Implemented a clean, client-side pagination controller for publication tables on the institution profile page.
  - **Data Integration & Contracts**:
    - Developed `requirements_for_BE.txt` to serve as a specifications contract for backend developers.
    - Normalized the naming conventions, renaming all occurrences of "ICSRank" to "SPARK" universally.

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
