// ═══════════════════════════════════════════════════════════════
//  tts.js — Web Speech API TTS with per-character voice matching
// ═══════════════════════════════════════════════════════════════

const TTS = {
  enabled: true,
  synth:   null,
  voices:  [],
  voiceMap:{},   // charId → SpeechSynthesisVoice

  // Voice personality per character
  // preferName: substrings to search in voice.name (case-insensitive)
  // pitch/rate tune the prosody after voice is selected
  config: {
    victor: {
      pitch: 0.72, rate: 0.80,
      gender: 'male',
      // older, formal, deep — British male preferred
      preferName: ['George','Daniel','Arthur','Malcolm','Brian','David','James','Oliver','Richard'],
    },
    eleanor: {
      pitch: 1.10, rate: 0.86,
      gender: 'female',
      // mature widow, composed — British female preferred
      preferName: ['Kate','Victoria','Alice','Moira','Fiona','Serena','Martha','Veena','Tessa'],
    },
    meera: {
      pitch: 1.24, rate: 0.94,
      gender: 'female',
      // younger, brighter — Indian-English accent first, then British female
      preferName: ['Priya','Veena','Heera','Karen','Susan','Samantha','Tessa','Alice'],
    },
    marcus: {
      pitch: 0.65, rate: 0.76,
      gender: 'male',
      // measured, clinical, deep — older male
      preferName: ['Oliver','Gordon','Mark','David','James','Thomas','Ralph','Arthur'],
    }
  }
};

// ── Initialise ───────────────────────────────────────────────────
function initTTS() {
  if (!window.speechSynthesis) { TTS.enabled = false; return; }
  TTS.synth = window.speechSynthesis;

  const tryMap = () => {
    const voices = TTS.synth.getVoices();
    if (!voices.length) return;
    TTS.voices = voices;
    _buildVoiceMap(voices);
    console.log(
      '[TTS] Mapped voices:',
      Object.entries(TTS.voiceMap).map(([id, v]) => `${id}→${v.name}(${v.lang})`).join(', ')
    );
  };

  tryMap();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = tryMap;
  }
  // Some browsers need a small delay after page load
  setTimeout(tryMap, 800);
}

// ── Build charId → voice map ─────────────────────────────────────
function _buildVoiceMap(voices) {
  // Prefer en-GB, then en-IN (Indian English), then any English
  const enGB = voices.filter(v => v.lang === 'en-GB');
  const enIN = voices.filter(v => v.lang === 'en-IN');
  const enUS = voices.filter(v => v.lang === 'en-US');
  const enAny= voices.filter(v => v.lang.startsWith('en'));

  CHAR_IDS.forEach(id => {
    const cfg = TTS.config[id];

    // 1. Preferred names in en-GB
    // 2. Preferred names in en-IN (good for Meera)
    // 3. Preferred names in any English
    // 4. Gender heuristic in en-GB
    // 5. Gender heuristic in any English
    // 6. Index-spread fallback

    const pools = id === 'meera'
      ? [enIN, enGB, enUS, enAny]
      : [enGB, enIN, enUS, enAny];

    let picked = null;

    // Step 1-3: preferred name search across pools
    outer:
    for (const pool of pools) {
      for (const name of cfg.preferName) {
        const found = pool.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
        if (found) { picked = found; break outer; }
      }
    }

    // Step 4-5: gender heuristic
    if (!picked) {
      const femaleRx = /female|woman|fiona|kate|alice|victoria|samantha|karen|susan|moira|tessa|priya|veena/i;
      const maleRx   = /male|man|daniel|george|david|james|mark|richard|gordon|oliver|arthur|thomas/i;
      const rx = cfg.gender === 'female' ? femaleRx : maleRx;
      for (const pool of [enGB, enIN, enAny]) {
        picked = pool.find(v => rx.test(v.name));
        if (picked) break;
      }
    }

    // Step 6: spread by index so all four chars get different voices
    if (!picked) {
      const pool = enGB.length ? enGB : enAny;
      picked = pool[CHAR_IDS.indexOf(id) % Math.max(pool.length, 1)] || pool[0] || null;
    }

    if (picked) TTS.voiceMap[id] = picked;
  });
}

// ── Speak a line as a character ──────────────────────────────────
function speakAs(charId, text, onEnd) {
  if (!TTS.enabled || !TTS.synth || !text) {
    if (onEnd) onEnd();
    return;
  }

  // Cancel ongoing speech
  TTS.synth.cancel();

  const utter   = new SpeechSynthesisUtterance(text);
  const cfg     = TTS.config[charId] || { pitch: 1, rate: 0.9 };
  utter.pitch   = cfg.pitch;
  utter.rate    = cfg.rate;
  utter.volume  = 0.92;

  const voice = TTS.voiceMap[charId];
  if (voice) {
    utter.voice = voice;
    utter.lang  = voice.lang;
  } else {
    utter.lang = 'en-GB';
  }

  utter.onend   = () => { if (onEnd) onEnd(); };
  utter.onerror = () => { if (onEnd) onEnd(); };   // never block on TTS failure

  TTS.synth.speak(utter);
}

// ── Controls ─────────────────────────────────────────────────────
function stopTTS() {
  if (TTS.synth) TTS.synth.cancel();
}

function toggleTTS() {
  TTS.enabled = !TTS.enabled;
  const btn = document.getElementById('btn-tts-toggle');
  if (btn) btn.textContent = `🔊 Voice: ${TTS.enabled ? 'On' : 'Off'}`;
  if (!TTS.enabled) stopTTS();
}
