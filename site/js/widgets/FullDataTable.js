// site/js/widgets/FullDataTable.js

async function fetchJSON(path, opts = {}) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), opts.timeout || 5000);
    const res = await fetch(path, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Fetch error: ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.warn('Fetch failed for path:', path, e);
    return null;
  }
  }

class FullDataTable {
  constructor(dataUrl, apiBase = null, probeTimeout = 1500) {
    this.dataUrl = dataUrl; // local fallback
    this.apiBase = apiBase; // e.g. http://192.168.52.89:8000/api
    this.probeTimeout = probeTimeout;
    this.data = null;
    this.backendAvailable = false;
  }

  async probeBackend() {
    if (!this.apiBase) return false;
    try {
      const probe = await fetchJSON(`${this.apiBase}/`, { timeout: this.probeTimeout });
      this.backendAvailable = !!probe;
    } catch (e) {
      this.backendAvailable = false;
    }
    return this.backendAvailable;
  }

  async loadData() {
    if (this.data) return;
    // Try to use backend if configured and alive
    if (this.apiBase) {
      await this.probeBackend();
      if (this.backendAvailable) {
  console.info('FullDataTable: using live backend at', this.apiBase);
        // Fetch institutions, faculty, publications from API endpoints
        const [institutions, faculty, publications] = await Promise.all([
          fetchJSON(`${this.apiBase}/institutions`),
          fetchJSON(`${this.apiBase}/faculty`),
          fetchJSON(`${this.apiBase}/publications`),
        ]);

        if (institutions && faculty && publications) {
          // Normalize to expected local structure
          const normalizedPubs = publications.map(p => {
            // authors could be array of ids, array of objects, or nested via authorship relations
              let authors = [];
              if (Array.isArray(p.authors) && p.authors.length > 0) {
                // authors array might contain numbers or objects with id or 'author' key
                authors = p.authors.map(a => {
                  if (!a) return null;
                  if (typeof a === 'object') return a.id || a.uid || a.author_id || a.author || a.faculty || null;
                  return a;
                }).filter(Boolean);
              } else if (Array.isArray(p.author_ids)) {
                authors = p.author_ids;
              } else if (Array.isArray(p.authors_raw)) {
                authors = p.authors_raw;
              } else if (Array.isArray(p.authorships) && p.authorships.length > 0) {
                // some APIs expose an authorship relation array
                authors = p.authorships.map(a => (a.author || a.faculty || a.author_id || a.faculty_id || a.id)).filter(Boolean);
              } else if (Array.isArray(p.authorship_set) && p.authorship_set.length > 0) {
                authors = p.authorship_set.map(a => (a.author || a.faculty || a.author_id || a.faculty_id || a.id)).filter(Boolean);
              }

              return {
                id: p.id,
                title: p.title,
                year: p.year,
                // keep conference object for better matching later
                conference: p.conference || null,
                // area fallback: prefer explicit area, then conference.area or acronym
                area: p.area || (p.conference && (p.conference.area || p.conference.acronym)) || 'unknown',
                authors: authors,
                // capture weight/core_rank if present on publication or its conference
                weight: p.weight || (p.conference && p.conference.weight) || null,
                core_rank: p.core_rank || (p.conference && p.conference.core_rank) || null,
              };
          });

          this.data = {
            institutions: institutions.map(i => ({ id: i.id || i.pk || i._id, name: i.name || i.full_name || i.title || i.institution_name })),
            faculty: faculty.map(f => ({ id: f.id || f.pk || f._id, name: f.name || f.full_name || f.display_name, institution_id: f.institution_id || f.institution || (f.institution && (f.institution.id || f.institution.pk)) || f.department || null, authorships: f.authorships || f.authorship_set || null, score: (typeof f.score === 'number') ? f.score : (f.total_score || f.metrics && f.metrics.score || null) })),
            publications: normalizedPubs,
          };

          // If publications didn't include authors, try common authorship endpoints
          const pubsHaveAuthors = this.data.publications.some(p => Array.isArray(p.authors) && p.authors.length > 0);
          if (!pubsHaveAuthors) {
            // try several common endpoint names; whichever responds with an array we'll use
            const candidates = ['authorships', 'publication_authors', 'publication-authors', 'publicationauthor', 'pub_authors'];
            for (const c of candidates) {
              try {
                // fetch with a short timeout
                const rel = await fetchJSON(`${this.apiBase}/${c}` , { timeout: 2000 });
                if (Array.isArray(rel) && rel.length > 0) {
                  // rel items commonly have publication, author/faculty fields
                  const map = {};
                  rel.forEach(r => {
                    const pubId = r.publication || r.publication_id || r.pub || r.publication_id;
                    const authorId = r.author || r.author_id || r.faculty || r.faculty_id || r.person || r.person_id;
                    if (!pubId || !authorId) return;
                    const key = String(pubId);
                    if (!map[key]) map[key] = [];
                    map[key].push(authorId);
                  });
                  // attach to publications where possible
                  this.data.publications.forEach(p => {
                    const key = String(p.id);
                    if (map[key]) p.authors = map[key];
                  });
                  console.info('FullDataTable: populated publication authors from', c);
                  break;
                }
              } catch (e) {
                // ignore and try next candidate
              }
            }
          }
          return;
        }
      }
      // if backend configured but we couldn't normalize/fetch expected endpoints
      // show a small banner so the user knows the live API wasn't used (CORS/network)
      const existingBanner = document.getElementById('backend-warning-banner');
      if (!this.backendAvailable && this.apiBase && !existingBanner && typeof document !== 'undefined') {
        const b = document.createElement('div');
        b.id = 'backend-warning-banner';
        b.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 m-4';
        b.innerHTML = `<strong>Live API not used:</strong> frontend could not load data from the configured API (${this.apiBase}). This is commonly caused by CORS or network restrictions. To use the live API either enable CORS on the backend (e.g. add django-cors-headers) or serve this site from the same origin or via a reverse proxy.`;
        const root = document.body || document.getElementsByTagName('body')[0];
        if (root) root.insertBefore(b, root.firstChild);
      }
    }

  // Fallback to local JSON
  console.info('FullDataTable: falling back to local data at', this.dataUrl);
  this.data = await fetchJSON(this.dataUrl);
  }

  /**
   * Compute per-faculty rankings from either explicit authorship relations (preferred)
   * or by aggregating publications (fractional credit). The faculty objects may include
   * an `authorships` array where each entry has { id, publication: { conference:{core_rank, area}, ... }, credit, faculty }
   */
  getFacultyRankings(filters, topN = 100) {
    if (!this.data) return [];
    const { areas, startYear, endYear } = filters;

    const facultyScores = {};
    this.data.faculty.forEach(f => { facultyScores[String(f.id)] = { id: f.id, name: f.name, institution_id: f.institution_id, score: 0 }; });

    // Prefer explicit authorship relations attached to faculty records
    let usedAuthorships = false;
    this.data.faculty.forEach(f => {
      const auths = f.authorships;
      if (Array.isArray(auths) && auths.length) {
        usedAuthorships = true;
        auths.forEach(a => {
          // a: { id, publication: {...}, credit: 0.25, faculty: f.id }
          const pub = a.publication || a.pub || null;
          if (!pub) return;
          const year = pub.year || pub.publication_year || null;
          if (year && (startYear && endYear) && (year < startYear || year > endYear)) return;
          // check area
          const pubArea = pub.conference && (pub.conference.area || pub.conference.acronym || pub.conference.core_rank) || pub.area || null;
          if (areas && areas.size && pubArea) {
            if (!areas.has(String(pubArea))) return;
          }
          // weight from conference core_rank or publication weight
          const core = (pub.conference && pub.conference.core_rank) || pub.core_rank || null;
          const weight = (pub.weight && Number(pub.weight)) ? Number(pub.weight) : (core === 'A*' ? 4 : (core === 'A' ? 2 : 1));
          const credit = (typeof a.credit === 'number') ? a.credit : 1;
          facultyScores[String(f.id)].score += (credit * weight);
        });
      }
    });

    // If no explicit authorships found, fall back to publications aggregation (fractional credit)
    if (!usedAuthorships) {
      this.data.publications.forEach(pub => {
        const pubHasAreaFields = (pub.area && pub.area !== 'unknown') || (pub.conference && (pub.conference.acronym || pub.conference.area || pub.conference.core_rank));
        const areaMatch = (() => {
          if (!pubHasAreaFields) return true;
          if (areas && areas.has && areas.has(String(pub.area))) return true;
          if (pub.conference) {
            if (pub.conference.acronym && areas && areas.has && areas.has(pub.conference.acronym)) return true;
            if (pub.conference.core_rank && areas && areas.has && areas.has(pub.conference.core_rank)) return true;
            if (pub.conference.area && areas && areas.has && areas.has(String(pub.conference.area))) return true;
          }
          return false;
        })();

        if (pub.year >= startYear && pub.year <= endYear && areaMatch) {
          const weight = pub.weight || (pub.core_rank === 'A*' ? 4 : (pub.core_rank === 'A' ? 2 : 1));
          const authorCount = pub.authors ? pub.authors.length : 1;
          const creditPerAuthor = authorCount ? (1 / authorCount) : 0;
          (pub.authors || []).forEach(authorId => {
            const fid = String(authorId);
            if (facultyScores[fid]) facultyScores[fid].score += (creditPerAuthor * weight);
          });
        }
      });
    }

    const arr = Object.values(facultyScores).sort((a,b)=>b.score-a.score).slice(0, topN);
    return arr.map((f, idx) => ({ rank: idx+1, id: f.id, name: f.name, institution_id: f.institution_id, score: parseFloat((f.score || 0).toFixed(4)) }));
  }

  /**
   * Compute institution rankings using the provided filters.
   * Weighting rules used:
   *  - If a publication object contains `weight`, that numeric value is used.
   *  - Else, if `core_rank` is present and equals 'A*' -> weight = 4, 'A' -> weight = 2.
   *  - Otherwise weight defaults to 1.
   *
   * Fractional authorship is applied: each author gets 1/N credit and the credit
   * is multiplied by the publication weight.
   */
  getRankings(filters) {
    if (!this.data) return [];

    const { areas, startYear, endYear } = filters;
    const institutionScores = {};

    // Initialize scores for all institutions to ensure they appear even with 0 score
    for (const inst of this.data.institutions) {
        institutionScores[inst.id] = { score: 0, name: inst.name, id: inst.id };
    }

    // Filter publications and calculate scores
    // Area matching is lenient: if the publication has no clear area/conference fields
    // we include it so we don't accidentally drop valid records from the API.
    this.data.publications.forEach(pub => {
      const pubHasAreaFields = (pub.area && pub.area !== 'unknown') || (pub.conference && (pub.conference.acronym || pub.conference.area || pub.conference.core_rank));
      const areaMatch = (() => {
        if (!pubHasAreaFields) return true; // be permissive when API doesn't provide mapping
        if (areas.has(String(pub.area))) return true;
        if (pub.conference) {
          if (pub.conference.acronym && areas.has(pub.conference.acronym)) return true;
          if (pub.conference.core_rank && areas.has(pub.conference.core_rank)) return true;
          if (pub.conference.area && areas.has(String(pub.conference.area))) return true;
        }
        return false;
      })();

      if (pub.year >= startYear && pub.year <= endYear && areaMatch) {
        const weight = pub.weight || (pub.core_rank === 'A*' ? 4 : (pub.core_rank === 'A' ? 2 : 1));
        const authorCount = pub.authors ? pub.authors.length : 1;
        const creditPerAuthor = authorCount ? (1 / authorCount) : 0;
        pub.authors.forEach(authorId => {
          const faculty = this.data.faculty.find(f => String(f.id) === String(authorId));
          if (faculty) {
            const instId = faculty.institution_id;
            // normalize key to string when checking map
            if (institutionScores[String(instId)]) {
              institutionScores[String(instId)].score += (creditPerAuthor * weight);
            }
          }
        });
      }
    });

    // Convert to array and sort
    const sortedInstitutions = Object.values(institutionScores)
      .sort((a, b) => b.score - a.score);

    // Assign ranks
    return sortedInstitutions.map((inst, index) => ({
      rank: index + 1,
      institution: { id: inst.id, name: inst.name },
      score: parseFloat(inst.score.toFixed(2)),
    }));
  }

  // Return top N faculty per institution based on the same filter criteria
  getTopFacultyPerInstitution(filters, topN = 3) {
    if (!this.data) return [];
    const { areas, startYear, endYear } = filters;

    // compute credits per faculty
    const facultyScores = {};
    this.data.faculty.forEach(f => { facultyScores[f.id] = { id: f.id, name: f.name, institution_id: f.institution_id, score: 0 }; });

    this.data.publications.forEach(pub => {
        const pubHasAreaFields = (pub.area && pub.area !== 'unknown') || (pub.conference && (pub.conference.acronym || pub.conference.area || pub.conference.core_rank));
        const areaMatch = (() => {
          if (!pubHasAreaFields) return true;
          if (areas.has(String(pub.area))) return true;
          if (pub.conference) {
            if (pub.conference.acronym && areas.has(pub.conference.acronym)) return true;
            if (pub.conference.core_rank && areas.has(pub.conference.core_rank)) return true;
            if (pub.conference.area && areas.has(String(pub.conference.area))) return true;
          }
          return false;
        })();

        if (pub.year >= startYear && pub.year <= endYear && areaMatch) {
        const weight = pub.weight || (pub.core_rank === 'A*' ? 4 : (pub.core_rank === 'A' ? 2 : 1));
        const authorCount = pub.authors ? pub.authors.length : 1;
        const creditPerAuthor = authorCount ? (1 / authorCount) : 0;
        (pub.authors || []).forEach(authorId => {
          const fid = String(authorId);
          if (facultyScores[fid]) facultyScores[fid].score += (creditPerAuthor * weight);
        });
      }
    });

    // group by institution
    const instMap = {};
    Object.values(facultyScores).forEach(f => {
      if (!instMap[f.institution_id]) instMap[f.institution_id] = [];
      instMap[f.institution_id].push(f);
    });

    // sort faculty in each institution and take topN
    const result = Object.keys(instMap).map(instId => {
      const facs = instMap[instId].sort((a,b)=>b.score-a.score).slice(0, topN);
      const inst = this.data.institutions.find(i=>String(i.id)===String(instId)) || { id: instId, name: String(instId) };
      return { institution: { id: inst.id, name: inst.name }, top_faculty: facs };
    });
    return result;
  }
}
