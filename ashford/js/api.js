// ═══════════════════════════════════════════════════════════════
//  api.js — All Anthropic/Featherless API calls
// ═══════════════════════════════════════════════════════════════

// ── Low-level call ──────────────────────────────────────────────
async function apiCall(messages, systemPrompt, maxTokens = 700) {
  if (!G.apiKey) throw new Error('No API key set. Please enter your API key.');

  const fullMessages = [
    {
      role: 'system',
      content: systemPrompt +
        '\n\nCRITICAL: Respond with ONLY valid JSON. No explanations, no markdown, no extra text.'
    },
    ...messages
  ];

  const res = await fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${API_CONFIG.authHeader} ${G.apiKey}`
    },
    body: JSON.stringify({
      model:             API_CONFIG.model,
      messages:          fullMessages,
      max_tokens:        maxTokens,
      temperature:       0.75,
      top_p:             0.9,
      presence_penalty:  0.05
    })
  });

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from model');
  return content;
}

// ── JSON parser ─────────────────────────────────────────────────
function parseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    return JSON.parse(clean);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    console.warn('JSON parse failed. Snippet:', text.slice(0, 300));
    return null;
  }
}

// ── Story generation ────────────────────────────────────────────
async function generateStory() {
  showLoading('Summoning the Mystery…', 'Weaving secrets into the manor walls');

  const prompt = `Create a 1920s murder mystery set at Ashford Manor in British India.

Cast:
- Vikram Rao (Butler)         → use key "victor"
- Lakshmi Bai (Widow)         → use key "eleanor"
- Meera Sharma (Niece)        → use key "meera"
- Dr. Arjun Malhotra (Doctor) → use key "marcus"

Rules:
- Victim is a unique person not in the cast (invent name + role).
- Exactly ONE of the four cast members is the killer.
- Secrets, motives, and alibis must be fresh and creative.
- The killer key must match one of: victor / eleanor / meera / marcus.

Return ONLY valid JSON — no extra text:
{
  "victim": "Full Name",
  "victimRelation": "brief relation",
  "causeOfDeath": "method",
  "timeDeath": "approx time",
  "location": "where found",
  "killer": "victor|eleanor|meera|marcus",
  "weapon": "specific item or method",
  "worldFacts": "2-3 sentence public summary",
  "npcs": {
    "victor":  {"secret":"...","alibi":"...","personality":"2-3 traits","nervousTriggers":["w1","w2"],"relationToVictim":"...","isKiller":false},
    "eleanor": {"secret":"...","alibi":"...","personality":"2-3 traits","nervousTriggers":["w1","w2"],"relationToVictim":"...","isKiller":false},
    "meera":   {"secret":"...","alibi":"...","personality":"2-3 traits","nervousTriggers":["w1","w2"],"relationToVictim":"...","isKiller":false},
    "marcus":  {"secret":"...","alibi":"...","personality":"2-3 traits","nervousTriggers":["w1","w2"],"relationToVictim":"...","isKiller":false}
  },
  "initialClues": ["clue 1","clue 2","clue 3"],
  "synopsis": "Atmospheric 2-sentence summary"
}
Set "isKiller":true for exactly one character — the killer.`;

  try {
    const raw  = await apiCall(
      [{ role: 'user', content: prompt }],
      'You are a professional murder mystery game master. Output complete valid JSON only.',
      1400
    );
    const data = parseJSON(raw);
    if (!data || !data.npcs) throw new Error('Invalid story structure');

    // Safety: ensure isKiller is consistent with the killer field
    const killerId = data.killer;
    CHAR_IDS.forEach(id => {
      if (!data.npcs[id]) data.npcs[id] = {};
      data.npcs[id].isKiller = (id === killerId);
    });

    G.story = data;
    (data.initialClues || []).forEach(c => addClue(c, 'Crime Scene', null, true));

    hideLoading();
    renderHub();
    showScreen('hub');
    toast('🕯️ A new mystery begins at Ashford Manor…');

  } catch (e) {
    hideLoading();
    console.error('Story generation error:', e);
    toast(`Story generation failed: ${e.message}`, 'error');
    showScreen('title');
  }
}

// ── Build NPC system prompt ─────────────────────────────────────
function buildSysPrompt(id) {
  const s = G.suspects[id];
  if (!s || !G.story) return 'You are a resident of Ashford Manor.';

  // Safely get NPC story data — THIS is the fix for the eavesdrop "role" crash
  const d = (G.story.npcs && G.story.npcs[id]) ? G.story.npcs[id] : {};

  const eLog = s.eavesdropLog.length > 0
    ? '\n\nPrivate conversations you remember:\n' + s.eavesdropLog.map(e => `- ${e}`).join('\n')
    : '';

  const killerInstr = d.isKiller
    ? `\nYOU ARE THE KILLER. You killed ${G.story.victim} using ${G.story.weapon}. Your motive: ${d.secret || 'unknown'}. Never confess easily — become nervous or hostile when pressed about the weapon or your motive.`
    : '';

  return `You are ${s.name}, ${s.role} at Ashford Manor in 1920s British India.

KNOWN FACTS: ${G.story.worldFacts || ''}
VICTIM: ${G.story.victim} (${G.story.victimRelation || ''})
CAUSE OF DEATH: ${G.story.causeOfDeath || ''}
YOUR SECRET: ${d.secret || 'none'}
YOUR ALIBI: ${d.alibi || 'none'}
YOUR PERSONALITY: ${d.personality || 'polite and reserved'}
YOUR RELATION TO VICTIM: ${d.relationToVictim || 'resident'}
NERVOUS TOPICS: ${(d.nervousTriggers || []).join(', ') || 'none'}
${killerInstr}${eLog}

Speak like a well-educated Indian person in 1920s colonial India — polite, formal; use "sir", "ji", "kindly" naturally.
Remember everything said so far in this conversation.

Respond ONLY as valid JSON:
{
  "dialogue": "2-4 sentence spoken response",
  "emotion":   "calm|nervous|hostile|scared|shocked",
  "action":    "brief stage direction or null",
  "clue":      "subtle clue you inadvertently reveal, or null",
  "trustDelta": number between -15 and +15
}`;
}

// ── Interview call ──────────────────────────────────────────────
async function askSuspect(id, question) {
  const s = G.suspects[id];
  s.isTalking = true;
  updatePortraitDisplay(id);

  try {
    const msgs = [...s.history, { role: 'user', content: question }];
    const raw  = await apiCall(msgs, buildSysPrompt(id));
    const data = parseJSON(raw) || { dialogue: '…', emotion: 'calm', action: null, clue: null, trustDelta: 0 };

    s.history.push({ role: 'user',      content: question      });
    s.history.push({ role: 'assistant', content: data.dialogue });
    s.emotion     = data.emotion    || 'calm';
    s.trust       = Math.max(5, Math.min(95, s.trust + (data.trustDelta || 0)));
    s.interviewed = true;
    s.isTalking   = false;

    if (data.clue) addClue(data.clue, s.name, id);
    advanceTime();
    updatePortraitDisplay(id);
    updateHubCards();
    return data;

  } catch (e) {
    s.isTalking = false;
    throw e;
  }
}

// ── Eavesdrop call — BUG FIXED: safe access to d1/d2.role ──────
async function generateEavesdrop(id1, id2) {
  const s1 = G.suspects[id1];
  const s2 = G.suspects[id2];

  // ✅ FIX: safe fallback so we never read .role on undefined
  const d1 = (G.story.npcs && G.story.npcs[id1]) ? G.story.npcs[id1] : {};
  const d2 = (G.story.npcs && G.story.npcs[id2]) ? G.story.npcs[id2] : {};

  const role1 = d1.role || s1.role || 'resident';
  const role2 = d2.role || s2.role || 'resident';

  const h1 = s1.history.filter(m => m.role === 'assistant').slice(-3).map(m => m.content).join(' | ') || 'No prior interview';
  const h2 = s2.history.filter(m => m.role === 'assistant').slice(-3).map(m => m.content).join(' | ') || 'No prior interview';

  const prompt = `Generate a private overheard conversation between two suspects at Ashford Manor.

MURDER: ${G.story.victim} was killed by ${G.story.causeOfDeath}. The real killer is ${G.story.killer}.

${s1.name} (${role1}):
  Secret: ${d1.secret || 'unknown'}
  Alibi: ${d1.alibi || 'unknown'}
  Personality: ${d1.personality || 'reserved'}
  ${d1.isKiller ? '— IS THE KILLER' : '— Not the killer'}

${s2.name} (${role2}):
  Secret: ${d2.secret || 'unknown'}
  Alibi: ${d2.alibi || 'unknown'}
  Personality: ${d2.personality || 'reserved'}
  ${d2.isKiller ? '— IS THE KILLER' : '— Not the killer'}

Recent detective exchanges:
  ${s1.name}: ${h1}
  ${s2.name}: ${h2}

Generate 5-7 natural exchanges. They don't know the detective is listening.
They may argue, confide, gossip, or accuse. The killer should be more guarded.
Use period-appropriate dialogue for 1920s colonial India.

Return ONLY valid JSON:
{
  "topic": "brief summary",
  "exchanges": [
    {"speaker": "${s1.name}", "text": "...", "emotion": "calm|nervous|hostile|scared"},
    {"speaker": "${s2.name}", "text": "...", "emotion": "calm|nervous|hostile|scared"}
  ],
  "clue": "suspicious detail overheard, or null",
  "clueText": "expanded clue for evidence board, or null"
}`;

  const raw  = await apiCall(
    [{ role: 'user', content: prompt }],
    'You are a murder mystery narrator. Return ONLY valid JSON.',
    1000
  );
  const data = parseJSON(raw);
  if (!data || !Array.isArray(data.exchanges)) throw new Error('Invalid eavesdrop response from model');

  // Log to both suspects so they remember the conversation
  const snippet1 = data.exchanges.slice(0, 2).map(e => e.text).join(' / ');
  s1.eavesdropLog.push(`[Private with ${s2.name}]: ${snippet1}`);
  s2.eavesdropLog.push(`[Private with ${s1.name}]: ${snippet1}`);

  return data;
}

// ── Accusation evaluation ───────────────────────────────────────
async function evaluateAccusation(accusedId) {
  const accused    = G.suspects[accusedId];
  const realKiller = G.suspects[G.story.killer];
  const isCorrect  = G.story.killer === accusedId;
  const cluesStr   = G.clues.map(c => c.text).join('; ') || 'minimal evidence';

  const prompt = `The detective has accused ${accused.name} of murdering ${G.story.victim}.
Real killer: ${realKiller.name} (accusation is ${isCorrect ? 'CORRECT' : 'WRONG'}).
Weapon: ${G.story.weapon}
Motive: ${G.story.npcs[G.story.killer]?.secret || 'unknown'}
Evidence: ${cluesStr}

Write a dramatic ${isCorrect ? 'victory' : 'defeat'} narrative (3-4 sentences, period prose).
${isCorrect
  ? 'Describe the killer breaking under pressure and confessing.'
  : 'Describe the detective\'s error and the real killer escaping or gloating.'}

Return ONLY JSON:
{"narrative":"...","isCorrect":${isCorrect},"realKillerReveal":"one sentence about the killer's fate"}`;

  const raw  = await apiCall([{ role: 'user', content: prompt }],
    'You are a dramatic murder mystery narrator. Return only valid JSON.', 500);
  return parseJSON(raw) || { narrative: 'The case reaches its conclusion.', isCorrect, realKillerReveal: '' };
}
