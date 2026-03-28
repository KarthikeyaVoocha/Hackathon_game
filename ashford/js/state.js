// ═══════════════════════════════════════════════════════════════
//  state.js — Central game state and mutation helpers
// ═══════════════════════════════════════════════════════════════

function _freshSuspects() {
  const out = {};
  CHAR_IDS.forEach(id => {
    out[id] = {
      ...CHARS[id],
      history:      [],
      eavesdropLog: [],
      trust:        50,
      emotion:      'calm',
      isTalking:    false,
      interviewed:  false
    };
  });
  return out;
}

const G = {
  apiKey:            localStorage.getItem('ashford_api_key') || '',
  story:             null,
  eavesdropMode:     false,
  eavesdropSelected: [],
  currentSuspect:    null,
  clues:             [],
  day:               1,
  timeIndex:         2,
  suspects:          _freshSuspects()
};

// ── Clue helpers ────────────────────────────────────────────────
function addClue(text, source, suspectId = null, silent = false) {
  if (!text) return;
  if (G.clues.some(c => c.text === text)) return;   // deduplicate

  G.clues.push({ text, source, suspectId, id: Date.now() });
  updateClueCountUI();
  renderEvidenceGrid();

  if (!silent) toast(`🔍 New clue: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`);
  if (G.clues.length >= 3) {
    document.getElementById('btn-accuse').style.display = 'block';
  }
}

function updateClueCountUI() {
  const n = G.clues.length;
  ['clue-count', 'ev-count'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = n;
  });
  const acc = document.getElementById('acc-clue-count');
  if (acc) acc.textContent = n;
}

// ── Time advancement ────────────────────────────────────────────
function advanceTime() {
  G.timeIndex++;
  if (G.timeIndex > 3) { G.timeIndex = 0; G.day++; }
}

// ── Full reset for new game ─────────────────────────────────────
function resetGame() {
  G.story             = null;
  G.eavesdropMode     = false;
  G.eavesdropSelected = [];
  G.currentSuspect    = null;
  G.clues             = [];
  G.day               = 1;
  G.timeIndex         = 2;
  G.suspects          = _freshSuspects();
  updateClueCountUI();
}
