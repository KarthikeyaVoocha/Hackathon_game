// ═══════════════════════════════════════════════════════════════
//  interrogation.js — Room, walk-in, thought bubbles, log strip,
//                     single & group interrogation, retry logic
// ═══════════════════════════════════════════════════════════════

const IROOM = {
  mode:     false,
  selected: [],
  active:   [],
  history:  {},
  busy:     false,
};

const WALK_ORIGINS = [
  { dx: -460, dy:  200 },
  { dx:  460, dy:  200 },
  { dx: -240, dy:  300 },
];

const SLOT_X = { 1: [50], 2: [30, 70], 3: [18, 50, 82] };

const CHAR_ACCENT = {
  victor:  '#7a9ac8',
  eleanor: '#c878a0',
  meera:   '#c8a040',
  marcus:  '#78c890',
};

// ── Hub selection mode ───────────────────────────────────────────
function startInterrogationMode() {
  cancelEavesdropMode();
  IROOM.mode     = true;
  IROOM.selected = [];
  document.getElementById('btn-interrogate-mode').style.display = 'none';
  document.getElementById('btn-eavesdrop-mode').style.display   = 'none';
  document.getElementById('interrogation-select-ui').classList.add('active');
  _updateInterrogationBar();
  updateHubCards();
}

function cancelInterrogationMode() {
  IROOM.mode     = false;
  IROOM.selected = [];
  ['btn-interrogate-mode','btn-eavesdrop-mode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  const ui = document.getElementById('interrogation-select-ui');
  if (ui) ui.classList.remove('active');
  updateHubCards();
}

function toggleInterrogationSelect(id) {
  const idx = IROOM.selected.indexOf(id);
  if (idx > -1)                        IROOM.selected.splice(idx, 1);
  else if (IROOM.selected.length < 3)  IROOM.selected.push(id);
  _updateInterrogationBar();
  updateHubCards();
}

function _updateInterrogationBar() {
  const n     = IROOM.selected.length;
  const label = document.getElementById('interrogation-select-label');
  const btn   = document.getElementById('btn-start-interrogation');
  if (label) {
    label.textContent = n === 0
      ? 'Select 1–3 suspects to interrogate'
      : IROOM.selected.map(id => G.suspects[id].name).join(' & ');
  }
  if (btn) btn.disabled = (n === 0);
}

// ── Enter room ───────────────────────────────────────────────────
async function enterInterrogationRoom() {
  if (!IROOM.selected.length) return;
  IROOM.active = [...IROOM.selected];

  IROOM.active.forEach(id => {
    IROOM.history[id] = [...(G.suspects[id].history || [])];
  });

  cancelInterrogationMode();

  const title = IROOM.active.map(id => G.suspects[id].name).join(' & ');
  const el = document.getElementById('iroom-topbar-title');
  if (el) el.textContent = `Interrogating — ${title}`;

  const log = document.getElementById('iroom-log');
  if (log) log.innerHTML = '';

  _buildRoomStage();
  showScreen('interrogation');

  for (let i = 0; i < IROOM.active.length; i++) {
    await sleep(i === 0 ? 220 : 750);
    await _walkIn(IROOM.active[i], i);
  }

  document.getElementById('iroom-question').focus();
}

function leaveInterrogationRoom() {
  stopTTS();
  IROOM.active.forEach(id => {
    if (IROOM.history[id]) G.suspects[id].history = IROOM.history[id];
  });
  IROOM.active  = [];
  IROOM.history = {};
  IROOM.busy    = false;
  showScreen('hub');
}

// ── Build stage ──────────────────────────────────────────────────
function _buildRoomStage() {
  const stage = document.getElementById('iroom-stage');
  stage.innerHTML = '';
  const n    = IROOM.active.length;
  const xPct = SLOT_X[n] || SLOT_X[1];

  IROOM.active.forEach((id, i) => {
    const s      = G.suspects[id];
    const origin = WALK_ORIGINS[i % WALK_ORIGINS.length];
    const accent = CHAR_ACCENT[id] || 'var(--gold)';

    const wrapper     = document.createElement('div');
    wrapper.className = 'ichar-wrapper';
    wrapper.id        = `ichar-${id}`;
    wrapper.style.left      = `${xPct[i]}%`;
    wrapper.style.opacity   = '0';
    wrapper.style.transform =
      `translateX(calc(-50% + ${origin.dx}px)) translateY(${origin.dy}px)`;

    wrapper.innerHTML = `
      <div class="speech-bubble" id="sbubble-${id}">
        <div class="bubble-speaker" style="color:${accent}">${s.name}</div>
        <div class="bubble-text"   id="sbtext-${id}"></div>
        <div class="bubble-action" id="sbaction-${id}" style="display:none"></div>
        <div class="bubble-tail"></div>
      </div>
      <div class="ichar-portrait-box" id="iportrait-${id}">
        ${drawPortrait(id, s.emotion, false)}
      </div>
      <div class="ichar-nameplate" style="border-color:${accent}80">
        ${s.name} <span style="color:var(--text-dim);font-style:italic">· ${s.role}</span>
      </div>`;

    stage.appendChild(wrapper);
  });
}

// ── Walk-in animation ────────────────────────────────────────────
async function _walkIn(id, index) {
  const wrapper = document.getElementById(`ichar-${id}`);
  if (!wrapper) return;

  wrapper.style.animation  = 'walk-bob 0.32s ease-in-out infinite';
  wrapper.style.transition = 'transform 1.4s cubic-bezier(0.33,1,0.68,1), opacity 0.4s ease';
  wrapper.style.opacity    = '1';
  wrapper.style.transform  = 'translateX(-50%) translateY(0)';

  await sleep(1450);

  wrapper.style.animation  = '';
  wrapper.style.transition = 'none';
  wrapper.style.transform  = 'translateX(-50%)';
  wrapper.classList.add('ichar-arrived');
}

// ── Show thought bubble with typewriter ──────────────────────────
async function _showBubble(id, dialogue, action, emotion, typeDelay = 22) {
  const bubble   = document.getElementById(`sbubble-${id}`);
  const textEl   = document.getElementById(`sbtext-${id}`);
  const actEl    = document.getElementById(`sbaction-${id}`);
  const portrait = document.getElementById(`iportrait-${id}`);
  const wrapper  = document.getElementById(`ichar-${id}`);
  if (!bubble || !textEl) return;

  const s   = G.suspects[id];
  s.emotion   = emotion || 'calm';
  s.isTalking = true;

  if (portrait) portrait.innerHTML = drawPortrait(id, s.emotion, true);
  if (wrapper) {
    wrapper.classList.remove('ichar-arrived');
    wrapper.style.animation = 'talk-bounce .44s ease-in-out infinite';
  }

  textEl.textContent = '';
  if (actEl) { actEl.textContent = ''; actEl.style.display = 'none'; }
  bubble.classList.add('sb-active');

  await _typewriterBubble(textEl, dialogue, typeDelay);

  if (action && actEl) {
    actEl.textContent   = `[ ${action} ]`;
    actEl.style.display = 'block';
  }

  s.isTalking = false;
  if (portrait) portrait.innerHTML = drawPortrait(id, s.emotion, false);
  if (wrapper) {
    wrapper.style.animation = '';
    wrapper.classList.add('ichar-arrived');
  }
}

async function _typewriterBubble(el, text, delay = 22) {
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    if (i % 3 === 0) await sleep(delay);
  }
}

// ── Conversation log strip ───────────────────────────────────────
function _appendLog(speakerName, text, isDetective, charId) {
  const log = document.getElementById('iroom-log');
  if (!log) return;
  const entry     = document.createElement('div');
  entry.className = `iroom-log-entry${isDetective ? ' detective' : ''}`;
  const accent    = isDetective ? 'var(--crimson-l)' : (CHAR_ACCENT[charId] || 'var(--gold-d)');
  entry.innerHTML =
    `<span class="iroom-log-speaker" style="color:${accent}">${speakerName}:</span>` +
    `<span class="iroom-log-text">${text}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// ── API call with retry + JSON nudge ─────────────────────────────
async function apiCallWithRetry(messages, systemPrompt, maxTokens, retries = 3) {
  let lastErr;
  let msgs = messages;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const raw  = await apiCall(msgs, systemPrompt, maxTokens);
      const data = parseJSON(raw);
      if (data) return { raw, data };

      // JSON was null — nudge on retry
      lastErr = new Error('Response was not valid JSON');
      console.warn(`[Retry ${attempt + 1}/${retries}] JSON null — nudging…`);
      const last = msgs[msgs.length - 1];
      msgs = [
        ...msgs.slice(0, -1),
        { ...last, content: last.content +
          '\n\n[REMINDER: Respond with ONLY the JSON object. No other text.]' }
      ];
    } catch (e) {
      lastErr = e;
      console.warn(`[Retry ${attempt + 1}/${retries}] ${e.message}`);
    }
    if (attempt < retries - 1) await sleep(700 * (attempt + 1));
  }
  throw lastErr || new Error('All retries exhausted');
}

// ── Single-character response ────────────────────────────────────
async function _singleResponse(id, question) {
  const s    = G.suspects[id];
  const msgs = [...IROOM.history[id], { role: 'user', content: question }];
  const { data } = await apiCallWithRetry(msgs, buildSysPrompt(id), 600);
  const out = data || { dialogue: '…', emotion: 'calm', action: null, clue: null, trustDelta: 0 };

  IROOM.history[id].push({ role: 'user',      content: question    });
  IROOM.history[id].push({ role: 'assistant', content: out.dialogue });
  s.emotion     = out.emotion    || 'calm';
  s.trust       = Math.max(5, Math.min(95, s.trust + (out.trustDelta || 0)));
  s.interviewed = true;
  if (out.clue) addClue(out.clue, s.name, id);

  return [{ id, ...out }];
}

// ── Group response ───────────────────────────────────────────────
async function _groupResponse(question) {
  const chars = IROOM.active;

  const charBlocks = chars.map(id => {
    const s = G.suspects[id];
    const d = (G.story.npcs && G.story.npcs[id]) ? G.story.npcs[id] : {};
    const recent = IROOM.history[id]
      .filter(m => m.role === 'assistant').slice(-4)
      .map(m => m.content).join(' | ') || 'No prior statements in this room';
    return `${s.name} (${s.role}):
  Personality: ${d.personality || 'reserved'}
  Secret: ${d.secret || 'unknown'}
  Alibi: ${d.alibi || 'unknown'}
  Nervous triggers: ${(d.nervousTriggers || []).join(', ') || 'none'}
  ${d.isKiller ? '— IS THE KILLER — evasive, never confess directly' : '— Innocent'}
  Recent in this room: ${recent}`;
  }).join('\n\n');

  const sysP = `You are the game master of a 1920s British-India murder mystery. Control ALL suspects simultaneously. Return ONLY valid JSON.`;

  const prompt = `Detective Hartley is conducting a group interrogation at Ashford Manor.

CASE: ${G.story.victim} was killed by ${G.story.causeOfDeath}.
PRESENT: ${chars.map(id => G.suspects[id].name).join(', ')}

${charBlocks}

DETECTIVE ASKS: "${question}"

Generate a realistic, tense group response. Characters may:
- Contradict or corroborate each other
- Show alarm at what others reveal
- Use em-dashes to interrupt (—)
- Reference earlier statements in this room
- Become nervous if their triggers are mentioned

Each gets 1-3 sentences. Period-appropriate 1920s British India speech.

Return ONLY this JSON (no markdown, no extra text):
{
  "responses": [
${chars.map(id => `    {"id":"${id}","dialogue":"…","emotion":"calm|nervous|hostile|scared|shocked","action":"stage direction or null","clue":"accidental reveal or null","trustDelta":0}`).join(',\n')}
  ]
}`;

  const { data } = await apiCallWithRetry(
    [{ role: 'user', content: prompt }], sysP, 950
  );
  if (!data || !Array.isArray(data.responses)) throw new Error('Invalid group response');

  data.responses.forEach(r => {
    const s = G.suspects[r.id];
    if (!s) return;
    IROOM.history[r.id].push({ role: 'user',      content: question   });
    IROOM.history[r.id].push({ role: 'assistant', content: r.dialogue });
    s.emotion     = r.emotion    || 'calm';
    s.trust       = Math.max(5, Math.min(95, s.trust + (r.trustDelta || 0)));
    s.interviewed = true;
    if (r.clue) addClue(r.clue, s.name, r.id);
  });

  return data.responses;
}

// ── Main entry ───────────────────────────────────────────────────
async function sendInterrogationQuestion() {
  const input = document.getElementById('iroom-question');
  const btn   = document.getElementById('iroom-send-btn');
  const q     = input.value.trim();
  if (!q || IROOM.busy || !IROOM.active.length) return;

  IROOM.busy   = true;
  btn.disabled = true;
  input.value  = '';

  _appendLog('Det. Hartley', q, true, null);

  const bar     = document.getElementById('iroom-detective-bar');
  const barText = document.getElementById('iroom-detective-text');
  if (bar && barText) { barText.textContent = `"${q}"`; bar.style.display = 'block'; }

  // Close all open bubbles
  IROOM.active.forEach(id => {
    const b = document.getElementById(`sbubble-${id}`);
    if (b) b.classList.remove('sb-active');
  });

  // Thinking sway on all
  IROOM.active.forEach(id => {
    const w = document.getElementById(`ichar-${id}`);
    if (w) { w.classList.remove('ichar-arrived'); w.style.animation = 'sway 1.1s ease-in-out infinite'; }
  });

  try {
    const responses = IROOM.active.length === 1
      ? await _singleResponse(IROOM.active[0], q)
      : await _groupResponse(q);

    // Stop thinking
    IROOM.active.forEach(id => {
      const w = document.getElementById(`ichar-${id}`);
      if (w) { w.style.animation = ''; w.classList.add('ichar-arrived'); }
    });

    // Play responses — TTS fires while typewriter runs; wait for both
    for (const resp of responses) {
      const id = resp.id;
      if (!id || !G.suspects[id]) continue;

      const ttsFinished = new Promise(resolve => speakAs(id, resp.dialogue, resolve));
      await _showBubble(id, resp.dialogue, resp.action, resp.emotion, 20);
      _appendLog(G.suspects[id].name, resp.dialogue, false, id);

      await ttsFinished;
      await sleep(380);
    }

    // Linger then dismiss all bubbles
    await sleep(IROOM.active.length > 1 ? 1800 : 2600);
    IROOM.active.forEach(id => {
      const b = document.getElementById(`sbubble-${id}`);
      if (b) b.classList.remove('sb-active');
    });

  } catch (e) {
    console.error('Interrogation error:', e);
    toast('Interrogation error: ' + e.message, 'error');
    IROOM.active.forEach(id => {
      const w = document.getElementById(`ichar-${id}`);
      if (w) { w.style.animation = ''; w.classList.add('ichar-arrived'); }
    });
  }

  if (bar) bar.style.display = 'none';
  IROOM.busy   = false;
  btn.disabled = false;
  advanceTime();
  updateHubCards();
  document.getElementById('iroom-question').focus();
}
