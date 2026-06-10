// utils/areaTaxonomy.js — SPARK Research Area Taxonomy
//
// Maps raw area codes (ICORE FoR codes + IEEE/ACM journal abbreviations)
// to broad human-readable categories shown in the filter UI.
//
// When the user selects "AI", the filter expands it to all AI sub-codes
// (4601, 4602, 4611, TNNLS, ...) before sending to the API.

// ─── Broad categories shown in the filter UI ──────────────────────────────
const BROAD_AREAS = [
  { id: 'ai',       name: 'AI & ML',   icon: '🤖' },
  { id: 'vision',   name: 'Vision',    icon: '👁️' },
  { id: 'systems',  name: 'Systems',   icon: '⚙️' },
  { id: 'security', name: 'Security',  icon: '🔒' },
  { id: 'theory',   name: 'Theory',    icon: '📐' },
  { id: 'graphics', name: 'Graphics',  icon: '🎨' },
];

// ─── Raw code → broad category mapping ────────────────────────────────────
// ICORE FoR (Field of Research) codes: 46xx = Information and Computing Sciences
// IEEE/ACM journal abbreviations used as area identifiers in SPARK backend
const AREA_TAXONOMY = {
  // ── ICORE FoR codes ────────────────────────────────────────────────────
  '4601': 'ai',       // Applied Computing
  '4602': 'ai',       // Artificial Intelligence
  '4603': 'vision',   // Computer Vision and Multimedia Computation
  '4604': 'security', // Cybersecurity and Privacy
  '4605': 'systems',  // Data Management and Data Science
  '4606': 'systems',  // Distributed Computing and Systems Software
  '4607': 'graphics', // Graphics, Augmented Reality and Games
  '4608': 'ai',       // Human-Centred Computing (AI-adjacent)
  '4611': 'ai',       // Machine Learning
  '4612': 'theory',   // Software Engineering
  '4613': 'theory',   // Theory of Computation
  'CSE':  'systems',  // General CS&E

  // ── IEEE Transactions — AI / ML ─────────────────────────────────────────
  'TNNLS': 'ai',   // Neural Networks and Learning Systems
  'TCYB':  'ai',   // Cybernetics
  'TCSS':  'ai',   // Computational Social Systems
  'TAFFC': 'ai',   // Affective Computing
  'CL':    'ai',   // Computational Linguistics
  'JSTSP': 'ai',   // J. Selected Topics in Signal Processing
  'TSP':   'ai',   // Signal Processing
  'SPL':   'ai',   // Signal Processing Letters
  'TBD':   'ai',   // Big Data
  'TRO':   'ai',   // Robotics
  'TCBB':  'ai',   // Computational Biology & Bioinformatics

  // ── ACM Trans — AI / IR ─────────────────────────────────────────────────
  'TIST':  'ai',   // Intelligent Systems and Technology
  'TKDD':  'ai',   // Knowledge Discovery from Data
  'TOIS':  'ai',   // Information Systems (IR)

  // ── IEEE Transactions — Vision ───────────────────────────────────────────
  'TPAMI': 'vision', // Pattern Analysis and Machine Intelligence
  'TIP':   'vision', // Image Processing
  'TMM':   'vision', // Multimedia
  'TCSVT': 'vision', // Circuits and Systems for Video Technology

  // ── ACM Trans — Vision / Multimedia ─────────────────────────────────────
  'TOMM':  'vision', // Multimedia Computing, Communications and Applications

  // ── IEEE Transactions — Security ────────────────────────────────────────
  'TIFS':  'security', // Information Forensics and Security
  'TDSC':  'security', // Dependable and Secure Computing

  // ── ACM Trans — Security ────────────────────────────────────────────────
  'TOPS':  'security', // Privacy and Security

  // ── IEEE Transactions — Systems / Networks ──────────────────────────────
  'TKDE':   'systems', // Knowledge and Data Engineering
  'TMC':    'systems', // Mobile Computing
  'TPDS':   'systems', // Parallel and Distributed Systems
  'TC':     'systems', // Computers
  'TVT':    'systems', // Vehicular Technology
  'TCOM':   'systems', // Communications
  'TWC':    'systems', // Wireless Communications
  'TCAD':   'systems', // Computer-Aided Design
  'TVLSI':  'systems', // Very Large Scale Integration
  'TETC':   'systems', // Emerging Topics in Computing
  'IoTJ':   'systems', // Internet of Things
  'TII':    'systems', // Industrial Informatics
  'TSC':    'systems', // Services Computing
  'TCC':    'systems', // Cloud Computing
  'TNSE':   'systems', // Network Science and Engineering
  'TECS':   'systems', // Embedded Computing Systems
  'TODAES': 'systems', // Design Automation of Electronic Systems
  'TOCS':   'systems', // Computer Systems

  // ── IEEE/ACM — Networking ────────────────────────────────────────────────
  'TON':  'systems', // Networking (IEEE/ACM)
  'TOSN': 'systems', // Sensor Networks

  // ── ACM Trans — Web / Databases ─────────────────────────────────────────
  'TWEB': 'systems', // Web
  'TODS': 'systems', // Database Systems

  // ── IEEE/ACM — Theory / Software Engineering ────────────────────────────
  'TSE':    'theory', // Software Engineering
  'TOSEM':  'theory', // Software Engineering and Methodology
  'TOPLAS': 'theory', // Programming Languages and Systems
  'JACM':   'theory', // Journal of ACM

  // ── ACM — HCI ────────────────────────────────────────────────────────────
  'TOCHI': 'systems', // Computer-Human Interaction

  // ── ACM Trans — Graphics ─────────────────────────────────────────────────
  'TOG':  'graphics', // Graphics

  // ── IEEE — Graphics / Visualization ─────────────────────────────────────
  'TVCG': 'graphics', // Visualization and Computer Graphics

  // ── General / Broad scope → systems as default ──────────────────────────
  'Access': 'systems', // IEEE Access
  'CSUR':   'systems', // ACM Computing Surveys
  'CACM':   'systems', // Communications of the ACM
};

/**
 * Given a list of raw area objects from the API (each with an `id` or `code` field),
 * group them into BROAD_AREAS. Returns an array of broad area objects,
 * each with an added `subCodes` array listing all raw codes in that group.
 *
 * @param {Array<{id:string|number, name:string, code?:string}>} rawAreas
 * @returns {Array<{id:string, name:string, icon:string, subCodes:string[]}>}
 */
function groupAreasByBroadCategory(rawAreas) {
  // Build a map: broadId → [rawCode, ...]
  const subCodeMap = {};
  BROAD_AREAS.forEach(b => { subCodeMap[b.id] = []; });

  rawAreas.forEach(area => {
    const rawCode = String(area.code || area.id || area.slug || '');
    const broadId = AREA_TAXONOMY[rawCode];
    if (broadId && subCodeMap[broadId] !== undefined) {
      subCodeMap[broadId].push(rawCode);
    }
    // Unknown codes → skip (don't pollute UI with unmapped codes)
  });

  return BROAD_AREAS.map(b => ({
    ...b,
    subCodes: subCodeMap[b.id],
  }));
}

/**
 * Given the set of selected broad area IDs (e.g. Set{'ai', 'vision'}),
 * expand to all raw sub-codes for the API query.
 * e.g. 'ai' → ['4601','4602','4611','TNNLS', ...]
 *
 * @param {Set<string>} selectedBroadIds
 * @param {Array} groupedAreas - result of groupAreasByBroadCategory()
 * @returns {string[]} flat list of raw codes
 */
function expandToSubCodes(selectedBroadIds, groupedAreas) {
  const codes = [];
  groupedAreas.forEach(broad => {
    if (selectedBroadIds.has(broad.id)) {
      codes.push(...broad.subCodes);
    }
  });
  return codes;
}
