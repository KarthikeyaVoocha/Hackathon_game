// ═══════════════════════════════════════════════════════════════
//  ui.js — All DOM rendering and screen logic
// ═══════════════════════════════════════════════════════════════

// ── Screen management ───────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`s-${name}`);
  if (el) el.classList.add('active');
  if (name !== 'hub') cancelEavesdropMode();
}

// ── Hub ─────────────────────────────────────────────────────────
function renderHub() {
  if (!G.story) return;
  const synopsis = document.getElementById('hub-synopsis');
  if (synopsis) synopsis.textContent = G.story.synopsis || G.story.worldFacts || '';
  updateHubCards();
}

function updateHubCards() {
  const grid = document.getElementById('suspects-grid');
  if (!grid) return;
  grid.innerHTML = '';

  CHAR_IDS.forEach(id => {
    const s = G.suspects[id];
    if (!s) return;

    const card = document.createElement('div');
    card.className = 'suspect-card' +
      (G.eavesdropMode && G.eavesdropSelected.includes(id) ? ' eavesdrop-selected' : '');
    card.dataset.id = id;

    const trustColor = s.trust > 65 ? '#6acc88' : s.trust < 35 ? 'var(--crimson)' : 'var(--gold-d)';
    card.innerHTML = `
      <div class="card-portrait">${drawPortrait(id, s.emotion, false)}</div>
      <div class="card-info">
        <div class="card-name">${s.name}</div>
        <div class="card-role">${s.role}</div>
        <div class="trust-mini">
          <div class="trust-mini-bar">
            <div class="trust-mini-fill" style="width:${s.trust}%;background:${trustColor}"></div>
          </div>
          <span style="font-family:'Special Elite',monospace;font-size:.58rem;color:${trustColor}">${s.trust}%</span>
        </div>
        <div class="card-badge${s.interviewed ? ' interviewed' : ''}">
          ${s.interviewed ? 'Interviewed' : 'Not interviewed'}
        </div>
      </div>`;

    card.onclick = () => handleCardClick(id);
    grid.appendChild(card);
  });

  const dayEl = document.getElementById('hub-day');
  if (dayEl) dayEl.textContent = `Day ${G.day}, ${TIME_LABELS[G.timeIndex]}`;
}

function handleCardClick(id) {
  if (G.eavesdropMode) {
    toggleEavesdropSelect(id);
  } else {
    openInterview(id);
  }
}

// ── Eavesdrop mode UI ───────────────────────────────────────────
function toggleEavesdropMode() {
  G.eavesdropMode     = true;
  G.eavesdropSelected = [];
  document.getElementById('btn-eavesdrop-mode').style.display = 'none';
  document.getElementById('eavesdrop-hint').style.display     = 'block';
  document.getElementById('eavesdrop-select-ui').classList.add('active');
  updateHubCards();
}

function cancelEavesdropMode() {
  G.eavesdropMode     = false;
  G.eavesdropSelected = [];
  const bm   = document.getElementById('btn-eavesdrop-mode');
  const hint = document.getElementById('eavesdrop-hint');
  const ui   = document.getElementById('eavesdrop-select-ui');
  if (bm)   bm.style.display   = '';
  if (hint) hint.style.display = 'none';
  if (ui)   ui.classList.remove('active');
  updateHubCards();
}

function toggleEavesdropSelect(id) {
  const idx = G.eavesdropSelected.indexOf(id);
  if (idx > -1)                             G.eavesdropSelected.splice(idx, 1);
  else if (G.eavesdropSelected.length < 2)  G.eavesdropSelected.push(id);

  const n = G.eavesdropSelected.length;
  const label = document.getElementById('eavesdrop-select-label');
  if (label) {
    label.textContent = n === 0 ? 'Select 2 suspects above'
      : n === 1 ? `${G.suspects[G.eavesdropSelected[0]].name} — select one more`
      : `${G.suspects[G.eavesdropSelected[0]].name} & ${G.suspects[G.eavesdropSelected[1]].name}`;
  }
  document.getElementById('btn-start-eavesdrop').disabled = (n !== 2);
  updateHubCards();
}

async function startEavesdrop() {
  if (G.eavesdropSelected.length !== 2) return;
  const [id1, id2] = G.eavesdropSelected;
  const s1 = G.suspects[id1], s2 = G.suspects[id2];
  cancelEavesdropMode();

  // Setup eavesdrop screen
  document.getElementById('eavesdrop-title').textContent    = `${s1.name} & ${s2.name}`;
  document.getElementById('ev-portrait-left').innerHTML     = drawPortrait(id1, s1.emotion, false);
  document.getElementById('ev-portrait-right').innerHTML    = drawPortrait(id2, s2.emotion, false);
  document.getElementById('ev-name-left').textContent       = s1.name;
  document.getElementById('ev-name-right').textContent      = s2.name;

  const scroll   = document.getElementById('eavesdrop-scroll');
  const clueArea = document.getElementById('eavesdrop-clue-area');
  scroll.innerHTML   = '';
  clueArea.innerHTML = '';
  showScreen('eavesdrop');

  scroll.innerHTML = `<div class="eavesdrop-loading">
    <div class="loading-spinner"></div>
    <p style="font-style:italic;color:var(--text-dim)">You press your ear to the door…<br>
    <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></p>
  </div>`;

  try {
    const data = await generateEavesdrop(id1, id2);
    scroll.innerHTML = '';
    scroll.innerHTML = `<div class="msg-system" style="margin:.4rem auto">Overheard: "${data.topic}"</div>`;

    for (const ex of data.exchanges) {
      const isLeft   = ex.speaker === s1.name;
      const side     = isLeft ? 'left' : 'right';
      const pId      = isLeft ? id1 : id2;
      const otherId  = isLeft ? id2 : id1;

      document.getElementById(`ev-portrait-${side}`).innerHTML           = drawPortrait(pId, ex.emotion, true);
      document.getElementById(`ev-portrait-${isLeft ? 'right' : 'left'}`).innerHTML = drawPortrait(otherId, 'calm', false);

      const exDiv  = document.createElement('div');
      exDiv.className = `eavesdrop-exchange ${side}`;
      const msgDiv = document.createElement('div');
      msgDiv.innerHTML = `<div class="ex-speaker">${ex.speaker}</div>
        <div class="ex-bubble ${ex.emotion !== 'calm' ? ex.emotion : ''}">
          <span class="cursor-blink"></span>
        </div>`;
      exDiv.appendChild(msgDiv);
      scroll.appendChild(exDiv);
      scroll.scrollTop = scroll.scrollHeight;
      await typewriterEl(msgDiv.querySelector('.ex-bubble'), ex.text, 18);
      await sleep(600);
    }

    // Restore calm portraits
    document.getElementById('ev-portrait-left').innerHTML  = drawPortrait(id1, s1.emotion, false);
    document.getElementById('ev-portrait-right').innerHTML = drawPortrait(id2, s2.emotion, false);

    const clueText = data.clueText || data.clue;
    if (clueText) {
      addClue(clueText, `Overheard (${s1.name} & ${s2.name})`, null);
      clueArea.innerHTML = `<div class="eavesdrop-clue-reveal">🔍 Clue Discovered: ${clueText}</div>`;
    } else {
      clueArea.innerHTML = `<div style="font-family:'Special Elite',monospace;font-size:.7rem;color:var(--text-dim);text-align:center;padding:.6rem">Nothing overtly incriminating… but their words linger.</div>`;
    }

  } catch (e) {
    scroll.innerHTML = `<div class="msg-system">You couldn't make out what was said. (${e.message})</div>`;
    toast('Eavesdrop failed: ' + e.message, 'error');
  }
}

// ── Interview ───────────────────────────────────────────────────
function openInterview(id) {
  G.currentSuspect = id;
  const s = G.suspects[id];
  if (!s) { toast('Suspect not found', 'error'); return; }

  document.getElementById('interview-topbar-name').textContent = `Interviewing ${s.name}`;
  document.getElementById('interview-name').textContent        = s.name;
  document.getElementById('interview-role').textContent        = s.role || 'Resident';

  updatePortraitDisplay(id);
  renderDialogueHistory(id);
  updateEavesdropLogUI(id);
  showScreen('interview');
  document.getElementById('question-input').focus();
}

function updatePortraitDisplay(id) {
  const s = G.suspects[id];
  if (!s) return;

  const wrap = document.getElementById('interview-portrait');
  if (wrap) {
    wrap.innerHTML  = drawPortrait(id, s.emotion, s.isTalking);
    wrap.className  = 'portrait-wrap' +
      (s.isTalking ? ' talking' : s.emotion === 'nervous' ? ' nervous-sway' : s.emotion === 'shocked' ? ' shocked-shake' : '');
  }

  const etag = document.getElementById('interview-emotion-tag');
  if (etag) {
    etag.textContent = s.emotion.charAt(0).toUpperCase() + s.emotion.slice(1);
    etag.className   = `emotion-tag emotion-${s.emotion}`;
  }

  const trustColor = s.trust > 65 ? '#6acc88' : s.trust < 35 ? 'var(--crimson)' : 'var(--gold-d)';
  const tv = document.getElementById('trust-val');
  const tf = document.getElementById('trust-fill');
  if (tv) tv.textContent  = `${s.trust}%`;
  if (tf) { tf.style.width = `${s.trust}%`; tf.style.background = trustColor; }

  const relEl = document.getElementById('rel-indicator');
  if (relEl) {
    const relation = G.story?.npcs?.[id]?.relationToVictim || 'Resident of Ashford Manor';
    relEl.innerHTML = `<span>${relation}</span>`;
  }
}

function updateEavesdropLogUI(id) {
  const s     = G.suspects[id];
  const logEl = document.getElementById('eavesdrop-log');
  if (!logEl) return;
  if (!s.eavesdropLog.length) { logEl.innerHTML = ''; return; }

  logEl.innerHTML = '<div class="eavesdrop-log-title">Overheard:</div>' +
    s.eavesdropLog.map(e =>
      `<div class="eavesdrop-log-item" title="${e}">${e.slice(0, 55)}${e.length > 55 ? '…' : ''}</div>`
    ).join('');
}

function renderDialogueHistory(id) {
  const s    = G.suspects[id];
  const hist = document.getElementById('dialogue-history');
  hist.innerHTML = '';

  if (!s.history.length) {
    hist.innerHTML = `<div class="msg-system">You approach ${s.name}. How will you begin?</div>`;
    return;
  }
  s.history.forEach(m => {
    const d = document.createElement('div');
    d.className  = `msg msg-${m.role === 'user' ? 'player' : 'npc'}`;
    d.textContent = m.content;
    hist.appendChild(d);
  });
  hist.scrollTop = hist.scrollHeight;
}

async function sendQuestion() {
  const input = document.getElementById('question-input');
  const btn   = document.getElementById('send-btn');
  const q     = input.value.trim();
  if (!q || !G.currentSuspect) return;

  const id = G.currentSuspect;
  input.value  = '';
  btn.disabled = true;

  const hist = document.getElementById('dialogue-history');

  const playerMsg     = document.createElement('div');
  playerMsg.className = 'msg msg-player';
  playerMsg.textContent = q;
  hist.appendChild(playerMsg);

  const thinkMsg      = document.createElement('div');
  thinkMsg.className  = 'msg msg-npc';
  thinkMsg.innerHTML  = `<span class="thinking-dots"><span>●</span><span>●</span><span>●</span></span>`;
  hist.appendChild(thinkMsg);
  hist.scrollTop = hist.scrollHeight;

  try {
    const data = await askSuspect(id, q);
    hist.removeChild(thinkMsg);

    const npcMsg     = document.createElement('div');
    npcMsg.className = 'msg msg-npc';
    if (data.action) {
      const act = document.createElement('span');
      act.className   = 'action-text';
      act.textContent = `[${data.action}]`;
      npcMsg.appendChild(act);
    }
    const textSpan = document.createElement('span');
    textSpan.innerHTML = '<span class="cursor-blink"></span>';
    npcMsg.appendChild(textSpan);
    hist.appendChild(npcMsg);
    hist.scrollTop = hist.scrollHeight;

    await typewriterEl(textSpan, data.dialogue, 20);

    if (data.clue) {
      const clueMsg     = document.createElement('div');
      clueMsg.className = 'msg msg-clue';
      clueMsg.textContent = `🔍 ${data.clue}`;
      hist.appendChild(clueMsg);
    }

    updatePortraitDisplay(id);
    updateEavesdropLogUI(id);

  } catch (e) {
    hist.removeChild(thinkMsg);
    const err     = document.createElement('div');
    err.className = 'msg msg-system';
    err.textContent = `[Communication interrupted: ${e.message}]`;
    hist.appendChild(err);
    toast('API error: ' + e.message, 'error');
  }

  btn.disabled = false;
  input.focus();
  hist.scrollTop = hist.scrollHeight;
}

// ── Evidence board ──────────────────────────────────────────────
function renderEvidenceGrid() {
  const grid  = document.getElementById('evidence-grid');
  const empty = document.getElementById('evidence-empty');
  if (!grid) return;

  if (!G.clues.length) {
    grid.style.display  = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.style.display  = 'grid';
  if (empty) empty.style.display = 'none';
  grid.innerHTML = '';

  G.clues.forEach((c, i) => {
    const card      = document.createElement('div');
    card.className  = 'evidence-card';
    const sourceName = c.suspectId && G.suspects[c.suspectId]
      ? G.suspects[c.suspectId].name
      : (c.source || 'Crime Scene');

    card.innerHTML = `
      <div class="ev-pin"></div>
      <div class="ev-number">#${String(i + 1).padStart(2, '0')}</div>
      <div class="ev-type">${sourceName}</div>
      <div class="ev-text">${c.text}</div>
      ${c.source ? `<div class="ev-source">Source: ${c.source}</div>` : ''}`;
    grid.appendChild(card);
  });
}

// ── Accusation ──────────────────────────────────────────────────
let selectedAccused = null;

function renderAccusationScreen() {
  const grid = document.getElementById('accusation-grid');
  if (!grid) return;
  grid.innerHTML  = '';
  selectedAccused = null;

  const btn = document.getElementById('btn-confirm-accuse');
  if (btn) btn.disabled = true;
  updateClueCountUI();

  CHAR_IDS.forEach(id => {
    const s    = G.suspects[id];
    const card = document.createElement('div');
    card.className = 'accuse-card';
    card.innerHTML = `
      <div class="card-portrait">${drawPortrait(id, s.emotion, false)}</div>
      <div class="card-name">${s.name}</div>
      <div class="card-role" style="font-size:.6rem;color:var(--text-dim)">${s.role}</div>`;
    card.onclick = () => {
      document.querySelectorAll('.accuse-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedAccused = id;
      if (btn) btn.disabled = false;
    };
    grid.appendChild(card);
  });
}

async function confirmAccusation() {
  if (!selectedAccused) return;
  const btn = document.getElementById('btn-confirm-accuse');
  if (btn) { btn.disabled = true; btn.textContent = 'Deliberating…'; }

  showLoading('The Moment of Truth…', 'The manor holds its breath');
  try {
    const result = await evaluateAccusation(selectedAccused);
    hideLoading();
    renderEnding(result, selectedAccused);
    showScreen('ending');
  } catch (e) {
    hideLoading();
    if (btn) { btn.disabled = false; btn.textContent = '⚖️ Accuse This Person'; }
    toast('Accusation failed: ' + e.message, 'error');
  }
}

function renderEnding(result, accusedId) {
  const ending = document.getElementById('s-ending');
  const wrap   = document.getElementById('ending-wrap');
  const isWin  = result.isCorrect;
  ending.className = `screen ${isWin ? 'win' : 'lose'}`;

  const realKiller = G.suspects[G.story.killer];
  wrap.innerHTML = `
    <div class="ending-verdict ${isWin ? 'win' : 'lose'}">${isWin ? 'Case Solved' : 'Wrong Accusation'}</div>
    <div class="ending-title">${isWin ? 'Justice is served' : 'The real killer walks free'}</div>
    <div class="ending-story">${result.narrative || ''}</div>
    <div class="ending-truth">
      <strong>The Truth:</strong><br>
      Victim: ${G.story.victim} (${G.story.victimRelation})<br>
      Cause of Death: ${G.story.causeOfDeath}<br>
      Weapon: ${G.story.weapon}<br>
      Killer: <strong>${realKiller.name}</strong><br>
      Motive: ${G.story.npcs[G.story.killer]?.secret || 'unknown'}<br>
      ${result.realKillerReveal ? `<br>${result.realKillerReveal}` : ''}
    </div>
    <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
      <button class="btn-primary" onclick="startNewGame()">New Investigation</button>
      <button class="btn-ghost" onclick="showScreen('evidence')">Review Evidence</button>
    </div>`;
}

// ── Modals / loading / toast ────────────────────────────────────
function showLoading(title = 'Loading…', sub = '') {
  document.getElementById('loading-title').textContent = title;
  document.getElementById('loading-sub').textContent   = sub;
  document.getElementById('loading-overlay').classList.add('active');
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('active');
}
function showModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className   = `toast${type === 'error' ? ' error' : ''}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity    = '0';
    t.style.transform  = 'translateX(110%)';
    t.style.transition = 'all .4s';
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

// ── Text utilities ──────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function typewriterEl(el, text, delay = 18) {
  const cursor = el.querySelector('.cursor-blink');
  if (cursor) el.removeChild(cursor);
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    if (i % 3 === 0) await sleep(delay);
  }
}

function saveApiKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val) { toast('Please enter a valid API key', 'error'); return; }
  G.apiKey = val;
  localStorage.setItem('ashford_api_key', val);
  closeModal('modal-api');
  toast('API key saved');
}
