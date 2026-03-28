// ═══════════════════════════════════════════════════════════════
//  main.js — Event listeners, startup, new-game orchestration
// ═══════════════════════════════════════════════════════════════

async function startNewGame() {
  resetGame();
  renderEvidenceGrid();

  if (!G.apiKey) {
    showScreen('title');
    showModal('modal-api');
    return;
  }
  await generateStory();
}

// ── Wire up all static buttons ──────────────────────────────────
document.getElementById('btn-newgame').onclick = () => {
  if (!G.apiKey) { showModal('modal-api'); return; }
  startNewGame();
};

document.getElementById('btn-apikey').onclick    = () => showModal('modal-api');
document.getElementById('btn-newgame-hub').onclick = () => startNewGame();
document.getElementById('btn-eavesdrop-mode').onclick = toggleEavesdropMode;
document.getElementById('btn-cancel-eavesdrop').onclick = cancelEavesdropMode;

// Watch accusation screen activation → re-render grid
const accuseObserver = new MutationObserver(() => {
  if (document.getElementById('s-accusation').classList.contains('active')) {
    renderAccusationScreen();
  }
});
accuseObserver.observe(
  document.getElementById('s-accusation'),
  { attributeFilter: ['class'] }
);

// ── Pre-fill API key field if stored ───────────────────────────
if (G.apiKey) {
  const inp = document.getElementById('api-key-input');
  if (inp) inp.value = G.apiKey;
}

console.log('🕯️ Ashford Manor Mystery Engine loaded.');
