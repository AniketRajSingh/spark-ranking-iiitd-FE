// utils/areaTaxonomy.js — SPARK Research Area Taxonomy
//
// Maps raw area codes (ICORE FoR codes + IEEE/ACM journal abbreviations)
// to 10 broad human-readable categories displayed in the filter UI.
//
// When the user selects e.g. "AI & ML", the filter expands it to all
// raw sub-codes (4601, 4602, 4611, TNNLS, …) before querying the API.

// ─── 10 Broad categories shown in the filter UI ───────────────────────────
export const BROAD_AREAS = [
  { id: 'ai',       name: 'AI & ML',           icon: '🤖' },
  { id: 'vision',   name: 'Computer Vision',   icon: '👁️' },
  { id: 'systems',  name: 'Systems & OS',       icon: '⚙️' },
  { id: 'networks', name: 'Networks',           icon: '🌐' },
  { id: 'security', name: 'Security',           icon: '🔒' },
  { id: 'theory',   name: 'Theory & Languages', icon: '📐' },
  { id: 'graphics', name: 'Graphics & Viz',     icon: '🎨' },
  { id: 'data',     name: 'Data & Databases',   icon: '🗄️' },
  { id: 'hci',      name: 'HCI & Multimedia',   icon: '🖱️' },
  { id: 'robotics', name: 'Robotics & Signal',  icon: '🦾' },
];

// ─── Raw code → broad category ────────────────────────────────────────────
export const AREA_TAXONOMY = {

  // ── ICORE FoR (Field of Research) codes ──────────────────────────────
  '4601': 'ai',       // Applied Computing
  '4602': 'ai',       // Artificial Intelligence
  '4603': 'vision',   // Computer Vision & Multimedia Computation
  '4604': 'security', // Cybersecurity and Privacy
  '4605': 'data',     // Data Management and Data Science
  '4606': 'systems',  // Distributed Computing & Systems Software
  '4607': 'graphics', // Graphics, Augmented Reality and Games
  '4608': 'hci',      // Human-Centred Computing
  '4611': 'ai',       // Machine Learning
  '4612': 'theory',   // Software Engineering
  '4613': 'theory',   // Theory of Computation
  'CSE':  'systems',  // General CS&E (broad catch-all)

  // ── IEEE Transactions — AI / ML ───────────────────────────────────────
  'TNNLS': 'ai',   // Neural Networks and Learning Systems
  'TCYB':  'ai',   // Cybernetics
  'TCSS':  'ai',   // Computational Social Systems
  'CL':    'ai',   // Computational Linguistics / NLP
  'TIST':  'ai',   // Intelligent Systems and Technology
  'TKDD':  'ai',   // Knowledge Discovery from Data

  // ── IEEE Transactions — Robotics & Signal Processing ─────────────────
  'TRO':   'robotics', // Robotics
  'TSP':   'robotics', // Signal Processing
  'SPL':   'robotics', // Signal Processing Letters
  'JSTSP': 'robotics', // J. Selected Topics in Signal Processing
  'TBD':   'data',     // Big Data (data-heavy workloads)
  'TCBB':  'ai',       // Computational Biology & Bioinformatics

  // ── IEEE — Affective Computing (HCI adjacent) ─────────────────────────
  'TAFFC': 'hci',  // Affective Computing

  // ── IEEE Transactions — Computer Vision ──────────────────────────────
  'TPAMI': 'vision', // Pattern Analysis and Machine Intelligence
  'TIP':   'vision', // Image Processing
  'TCSVT': 'vision', // Circuits and Systems for Video Technology

  // ── IEEE/ACM — Security & Privacy ────────────────────────────────────
  'TIFS': 'security', // Information Forensics and Security
  'TDSC': 'security', // Dependable and Secure Computing
  'TOPS': 'security', // ACM Trans on Privacy and Security

  // ── IEEE Transactions — Systems & OS ─────────────────────────────────
  'TC':     'systems', // Computers
  'TPDS':   'systems', // Parallel and Distributed Systems
  'TOCS':   'systems', // Computer Systems
  'TODAES': 'systems', // Design Automation of Electronic Systems
  'TECS':   'systems', // Embedded Computing Systems
  'TCAD':   'systems', // Computer-Aided Design
  'TVLSI':  'systems', // Very Large Scale Integration
  'TETC':   'systems', // Emerging Topics in Computing
  'TSC':    'systems', // Services Computing
  'TCC':    'systems', // Cloud Computing

  // ── IEEE/ACM — Networks & Mobile ─────────────────────────────────────
  'TON':  'networks', // Networking (IEEE/ACM joint)
  'TMC':  'networks', // Mobile Computing
  'TWC':  'networks', // Wireless Communications
  'TCOM': 'networks', // Communications
  'TVT':  'networks', // Vehicular Technology
  'TNSE': 'networks', // Network Science and Engineering
  'IoTJ': 'networks', // Internet of Things Journal
  'TII':  'networks', // Industrial Informatics
  'TOSN': 'networks', // Sensor Networks

  // ── IEEE/ACM — Theory & Software Engineering ──────────────────────────
  'TSE':    'theory', // Software Engineering
  'TOSEM':  'theory', // Software Engineering and Methodology
  'TOPLAS': 'theory', // Programming Languages and Systems
  'JACM':   'theory', // Journal of the ACM

  // ── IEEE — Graphics & Visualization ──────────────────────────────────
  'TVCG': 'graphics', // Visualization and Computer Graphics
  'TOG':  'graphics', // ACM Trans on Graphics

  // ── ACM — Data & Databases ────────────────────────────────────────────
  'TKDE': 'data',    // Knowledge and Data Engineering
  'TODS': 'data',    // Database Systems
  'TWEB': 'data',    // Web
  'TOIS': 'data',    // Information Systems (Information Retrieval)

  // ── ACM — HCI & Multimedia ────────────────────────────────────────────
  'TOCHI': 'hci',   // Computer-Human Interaction
  'TMM':   'hci',   // Multimedia (IEEE)
  'TOMM':  'hci',   // ACM Trans on Multimedia Computing

  // ── General / Broad scope ─────────────────────────────────────────────
  'Access': 'systems', // IEEE Access (multidisciplinary)
  'CSUR':   'systems', // ACM Computing Surveys
  'CACM':   'systems', // Communications of the ACM
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Given raw area objects from the API, group them into BROAD_AREAS.
 * @param {Array<{id?:string|number, code?:string, slug?:string, name?:string}>} rawAreas
 * @returns {Array<{id:string, name:string, icon:string, subCodes:string[]}>}
 */
export function groupAreasByBroadCategory(rawAreas) {
  const subCodeMap = {};
  BROAD_AREAS.forEach(b => { subCodeMap[b.id] = []; });

  const areasToProcess = (Array.isArray(rawAreas) && rawAreas.length > 0)
    ? rawAreas
    : Object.keys(AREA_TAXONOMY).map(code => ({ code })); // static fallback

  areasToProcess.forEach(area => {
    const rawCode = String(area.code || area.id || area.slug || '');
    const broadId = AREA_TAXONOMY[rawCode];
    if (broadId && subCodeMap[broadId] !== undefined) {
      if (!subCodeMap[broadId].includes(rawCode)) {
        subCodeMap[broadId].push(rawCode);
      }
    }
  });

  return BROAD_AREAS
    .map(b => ({ ...b, subCodes: subCodeMap[b.id] }))
    .filter(b => b.subCodes.length > 0);
}

/**
 * Expand selected broad area IDs to their full list of raw sub-codes.
 * @param {Set<string>} selectedBroadIds
 * @param {Array<{id:string, subCodes:string[]}>} groupedAreas
 * @returns {string[]}
 */
export function expandToSubCodes(selectedBroadIds, groupedAreas) {
  const codes = [];
  groupedAreas.forEach(broad => {
    if (selectedBroadIds.has(broad.id)) {
      broad.subCodes.forEach(c => { if (!codes.includes(c)) codes.push(c); });
    }
  });
  return codes;
}
