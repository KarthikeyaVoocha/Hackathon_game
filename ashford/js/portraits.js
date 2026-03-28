// ═══════════════════════════════════════════════════════════════
//  portraits.js — SVG portrait generator with emotion/talking states
// ═══════════════════════════════════════════════════════════════

// ── Colour helpers ──────────────────────────────────────────────
function hexToRgb(h) {
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16)
  };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}
function darken(h, amount) {
  const { r, g, b } = hexToRgb(h);
  return rgbToHex(r - amount, g - amount, b - amount);
}

// ── Main portrait draw ──────────────────────────────────────────
function drawPortrait(id, emotion = 'calm', talking = false) {
  const c = CHARS[id];
  if (!c) {
    return `<svg viewBox="0 0 200 280"><rect width="200" height="280" fill="#3a2a1a"/>
      <text x="100" y="140" text-anchor="middle" fill="#e0d4ba" font-size="14">?</text></svg>`;
  }

  const W = 200, H = 280;
  const fX = 100, fY = 115;

  const EMOTIONS = {
    calm:    { ey: 0.9,  brow: 0,   mouth: 2,  sweat: false, open: false },
    nervous: { ey: 1.05, brow: -4,  mouth: -3, sweat: true,  open: false },
    hostile: { ey: 0.7,  brow: 8,   mouth: -6, sweat: false, open: false },
    scared:  { ey: 1.25, brow: -8,  mouth: 5,  sweat: false, open: false },
    shocked: { ey: 1.4,  brow: -11, mouth: 12, sweat: false, open: true  }
  };
  const em = EMOTIONS[emotion] || EMOTIONS.calm;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="faceGrad_${id}" cx="48%" cy="42%" r="65%">
    <stop offset="0%" stop-color="${c.skin}"/>
    <stop offset="100%" stop-color="${darken(c.skin, 35)}"/>
  </radialGradient>
  <radialGradient id="bgGrad_${id}" cx="50%" cy="40%" r="70%">
    <stop offset="0%" stop-color="${c.bg[1]}"/>
    <stop offset="100%" stop-color="${c.bg[0]}"/>
  </radialGradient>
</defs>`;

  // Background
  svg += `<rect width="${W}" height="${H}" fill="url(#bgGrad_${id})"/>`;

  // Outfit / body (simplified per character)
  svg += _drawOutfit(id, c, fX, W, H);

  // Neck
  svg += `<rect x="78" y="165" width="44" height="45" rx="15" fill="${c.skin}"/>`;

  // Head
  svg += `<path d="
    M${fX - 42} ${fY - 38}
    Q${fX - 48} ${fY + 8} ${fX - 38} ${fY + 48}
    Q${fX - 22} ${fY + 68} ${fX} ${fY + 72}
    Q${fX + 22} ${fY + 68} ${fX + 38} ${fY + 48}
    Q${fX + 48} ${fY + 8} ${fX + 42} ${fY - 38}
    Q${fX + 28} ${fY - 55} ${fX} ${fY - 60}
    Q${fX - 28} ${fY - 55} ${fX - 42} ${fY - 38} Z"
    fill="url(#faceGrad_${id})"/>`;

  // Hair
  svg += _drawHair(id, c, fX, fY);

  // Eyes
  const eyeY = fY - 8;
  [-19, 19].forEach(dx => {
    const ex = fX + dx;
    svg += `<ellipse cx="${ex}" cy="${eyeY}" rx="9" ry="${8.5 * em.ey}" fill="#f8f0e0"/>`;
    svg += `<ellipse cx="${ex}" cy="${eyeY}" rx="5" ry="${Math.min(5 * em.ey, 6)}" fill="${c.eyeColor}"/>`;
    svg += `<circle  cx="${ex - 2}" cy="${eyeY - 2}" r="1.8" fill="#ffffff" opacity="0.9"/>`;
  });

  // Glasses (Victor & Marcus)
  if (c.hasGlasses) {
    const gl = eyeY;
    svg += `
      <rect x="${fX-31}" y="${gl-9}" width="25" height="19" rx="5" fill="none" stroke="#6a5040" stroke-width="1.8" opacity="0.85"/>
      <rect x="${fX+6}"  y="${gl-9}" width="25" height="19" rx="5" fill="none" stroke="#6a5040" stroke-width="1.8" opacity="0.85"/>
      <line x1="${fX-6}" y1="${gl}" x2="${fX+6}" y2="${gl}" stroke="#6a5040" stroke-width="1.6"/>
      <line x1="${fX-32}" y1="${gl-4}" x2="${fX-40}" y2="${gl-2}" stroke="#6a5040" stroke-width="1.5"/>
      <line x1="${fX+31}" y1="${gl-4}" x2="${fX+40}" y2="${gl-2}" stroke="#6a5040" stroke-width="1.5"/>`;
  }

  // Eyebrows
  const browY = eyeY - 16 + em.brow;
  if (emotion === 'hostile') {
    svg += `<path d="M${fX-29} ${browY+4} L${fX-6} ${browY-2}" fill="none" stroke="#2a2118" stroke-width="3.5" stroke-linecap="round"/>`;
    svg += `<path d="M${fX+6} ${browY-2} L${fX+29} ${browY+4}" fill="none" stroke="#2a2118" stroke-width="3.5" stroke-linecap="round"/>`;
  } else {
    svg += `<path d="M${fX-29} ${browY} Q${fX-15} ${browY-2} ${fX-6} ${browY}" fill="none" stroke="#2a2118" stroke-width="3.5" stroke-linecap="round"/>`;
    svg += `<path d="M${fX+6}  ${browY} Q${fX+15} ${browY-2} ${fX+29} ${browY}" fill="none" stroke="#2a2118" stroke-width="3.5" stroke-linecap="round"/>`;
  }

  // Nose
  svg += `<path d="M${fX - 4} ${fY + 8} Q${fX} ${fY + 18} ${fX + 4} ${fY + 8}" fill="none" stroke="${darken(c.skin, 40)}" stroke-width="1.4" opacity="0.5"/>`;

  // Mouth
  const mouthY = fY + 32;
  if (talking || em.open) {
    const mh = talking ? 7 + Math.random() * 5 : 11;
    svg += `<ellipse cx="${fX}" cy="${mouthY}" rx="10" ry="${mh / 2}" fill="#3c1f1f"/>`;
    svg += `<rect x="${fX-8}" y="${mouthY - mh/2}" width="16" height="${mh*0.3}" rx="1" fill="#e8e0d0" opacity="0.8"/>`;
  } else {
    svg += `<path d="M${fX - 12} ${mouthY} Q${fX} ${mouthY + em.mouth} ${fX + 12} ${mouthY}"
      fill="none" stroke="#3c1f1f" stroke-width="2.8" stroke-linecap="round"/>`;
    // Lipstick for Lakshmi / Meera
    if (id === 'eleanor' || id === 'meera') {
      svg += `<path d="M${fX-12} ${mouthY} Q${fX-5} ${mouthY-3} ${fX} ${mouthY-1.5} Q${fX+5} ${mouthY-3} ${fX+12} ${mouthY}"
        fill="#8b2a2a" opacity="0.6"/>`;
    }
  }

  // Mustache
  if (c.hasMustache) {
    if (c.mustacheStyle === 'thin') {
      svg += `<path d="M${fX-14} ${mouthY-9} Q${fX-6} ${mouthY-6} ${fX} ${mouthY-8} Q${fX+6} ${mouthY-6} ${fX+14} ${mouthY-9}"
        fill="none" stroke="${c.hair}" stroke-width="2.8" stroke-linecap="round"/>`;
    } else {
      svg += `<path d="M${fX-15} ${mouthY-9} Q${fX-7} ${mouthY-4} ${fX} ${mouthY-7} Q${fX+7} ${mouthY-4} ${fX+15} ${mouthY-9}"
        fill="${c.hair}" opacity="0.85"/>`;
    }
  }

  // Bindi (Lakshmi & Meera)
  if (id === 'eleanor' || id === 'meera') {
    svg += `<circle cx="${fX}" cy="${fY - 52}" r="3" fill="#c0253a" opacity="0.85"/>`;
  }

  // Sweat drop (nervous)
  if (em.sweat) {
    svg += `<path d="M${fX + 46} ${eyeY - 4} L${fX + 44} ${eyeY + 10} Q${fX + 46} ${eyeY + 13} ${fX + 48} ${eyeY + 10}Z"
      fill="rgba(100,160,220,0.65)"/>`;
  }

  // Vignette
  svg += `<radialGradient id="vig_${id}" cx="50%" cy="50%" r="70%">
    <stop offset="55%" stop-color="transparent"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#vig_${id})"/>`;

  svg += `</svg>`;
  return svg;
}

// ── Private helpers ─────────────────────────────────────────────

function _drawHair(id, c, fX, fY) {
  if (id === 'victor') {
    return `<path d="M${fX-48} ${fY-48} Q${fX-55} ${fY-72} ${fX-25} ${fY-82}
      Q${fX} ${fY-88} ${fX+25} ${fY-82} Q${fX+55} ${fY-72} ${fX+48} ${fY-48} Z" fill="${c.hair}"/>
      <line x1="${fX-8}" y1="${fY-62}" x2="${fX-8}" y2="${fY-28}" stroke="${darken(c.hair,20)}" stroke-width="1.5" opacity="0.6"/>`;
  }
  if (id === 'eleanor') {
    // Bun / parted hair
    return `<path d="M${fX-48} ${fY-48} Q${fX-56} ${fY-70} ${fX-22} ${fY-83}
      Q${fX} ${fY-90} ${fX+22} ${fY-83} Q${fX+56} ${fY-70} ${fX+48} ${fY-48}" fill="${c.hair}"/>
      <ellipse cx="${fX}" cy="${fY-82}" rx="16" ry="12" fill="${c.hair}"/>
      <path d="M${fX-48} ${fY-48} Q${fX-52} ${fY-10} ${fX-44} ${fY+15}" fill="none" stroke="${c.hair}" stroke-width="14" stroke-linecap="round"/>
      <path d="M${fX+48} ${fY-48} Q${fX+52} ${fY-10} ${fX+44} ${fY+15}" fill="none" stroke="${c.hair}" stroke-width="14" stroke-linecap="round"/>`;
  }
  if (id === 'meera') {
    // Long loose hair
    return `<path d="M${fX-48} ${fY-46} Q${fX-54} ${fY-72} ${fX-20} ${fY-85}
      Q${fX} ${fY-92} ${fX+20} ${fY-85} Q${fX+54} ${fY-72} ${fX+48} ${fY-46}" fill="${c.hair}"/>
      <path d="M${fX-48} ${fY-46} Q${fX-58} ${fY+20} ${fX-46} ${fY+70}" fill="none" stroke="${c.hair}" stroke-width="18" stroke-linecap="round"/>
      <path d="M${fX+48} ${fY-46} Q${fX+58} ${fY+20} ${fX+46} ${fY+70}" fill="none" stroke="${c.hair}" stroke-width="18" stroke-linecap="round"/>
      <path d="M${fX-5} ${fY-82} L${fX-5} ${fY-28}" stroke="${darken(c.hair,15)}" stroke-width="2" opacity="0.5"/>`;
  }
  // marcus
  return `<path d="M${fX-48} ${fY-46} Q${fX-55} ${fY-70} ${fX-24} ${fY-82}
    Q${fX} ${fY-88} ${fX+24} ${fY-82} Q${fX+55} ${fY-70} ${fX+48} ${fY-46}" fill="${c.hair}"/>
    <path d="M${fX-48} ${fY-46} Q${fX-50} ${fY-15} ${fX-44} ${fY+10}" fill="none" stroke="${c.hair}" stroke-width="12" stroke-linecap="round"/>
    <path d="M${fX+48} ${fY-46} Q${fX+50} ${fY-15} ${fX+44} ${fY+10}" fill="none" stroke="${c.hair}" stroke-width="12" stroke-linecap="round"/>`;
}

function _drawOutfit(id, c, fX, W, H) {
  const neckBase = 210;
  if (id === 'victor') {
    return `
      <path d="M0 ${H} L15 ${neckBase-10} Q${W*0.3} ${neckBase-22} ${W*0.43} ${neckBase-15} L${W*0.43} ${H}Z" fill="${c.outfit}"/>
      <path d="M${W} ${H} L${W-15} ${neckBase-10} Q${W*0.7} ${neckBase-22} ${W*0.57} ${neckBase-15} L${W*0.57} ${H}Z" fill="${c.outfit}"/>
      <path d="M${W*0.41} ${neckBase-14} L${W*0.44} ${neckBase-22} L${W*0.5} ${neckBase-13} L${W*0.56} ${neckBase-22} L${W*0.59} ${neckBase-14}Z" fill="white"/>
      <line x1="${W*0.5}" y1="${neckBase-12}" x2="${W*0.5}" y2="${H-30}" stroke="#1a1010" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (id === 'eleanor') {
    return `
      <path d="M0 ${H} Q10 ${neckBase-18} ${W*0.5} ${neckBase-20} Q${W*0.9} ${neckBase-18} ${W} ${H}Z" fill="${c.outfit}"/>
      ${[0.35,0.40,0.45,0.50,0.55,0.60,0.65].map(x=>`<circle cx="${W*x}" cy="${neckBase-7}" r="3" fill="#e8e0d0" opacity="0.9"/>`).join('')}`;
  }
  if (id === 'meera') {
    // Saree / dupatta
    return `
      <path d="M0 ${H} L18 ${neckBase-5} Q${W*0.28} ${neckBase-20} ${W*0.44} ${neckBase-15} L${W*0.44} ${H}Z" fill="${c.outfit}"/>
      <path d="M${W} ${H} L${W-18} ${neckBase-5} Q${W*0.72} ${neckBase-20} ${W*0.56} ${neckBase-15} L${W*0.56} ${H}Z" fill="${c.outfit}"/>
      <path d="M${W*0.3} ${neckBase-15} Q${W*0.5} ${neckBase-25} ${W*0.7} ${neckBase-15}" fill="none" stroke="#d4a0a8" stroke-width="3" opacity="0.7"/>`;
  }
  // marcus — doctor's coat
  return `
    <path d="M0 ${H} L15 ${neckBase-8} Q${W*0.28} ${neckBase-22} ${W*0.43} ${neckBase-16} L${W*0.43} ${H}Z" fill="${c.outfit}"/>
    <path d="M${W} ${H} L${W-15} ${neckBase-8} Q${W*0.72} ${neckBase-22} ${W*0.57} ${neckBase-16} L${W*0.57} ${H}Z" fill="${c.outfit}"/>
    <rect x="${W*0.44}" y="${neckBase-16}" width="${W*0.12}" height="${H*0.06}" fill="white"/>
    <line x1="${W*0.5}" y1="${neckBase-14}" x2="${W*0.5}" y2="${H-32}" stroke="#2a1808" stroke-width="7" stroke-linecap="round"/>`;
}
