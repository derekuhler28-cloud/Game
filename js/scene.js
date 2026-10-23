'use strict';
/* Scene rendering: island backdrops, sky and sea by time of day, the ship, and the effects engine. */

const W = 192, H = 128, HORIZON = 70, GROUND = 102;

const SKIES = [
  { top: '#6ab8ee', mid: '#a9d8f5', bot: '#ffe0b0', sea: '#2f8fd0', sea2: '#8fd0f2', shade: 0 },
  { top: '#3a92e0', mid: '#6fb8f0', bot: '#b9e2fb', sea: '#1f76c4', sea2: '#6ab4ec', shade: 0 },
  { top: '#3e2f6e', mid: '#b3537a', bot: '#ffa05a', sea: '#3b4f94', sea2: '#ff9a6a', shade: 0.15 },
  { top: '#060b22', mid: '#111a42', bot: '#25306a', sea: '#0c1838', sea2: '#41588f', shade: 0.42 },
];

function seaColors(scene, ti) {
  const s = SKIES[ti];
  if (scene === 'sky') {
    return ti === 3 ? { sea: '#59679a', sea2: '#8494c8' } : { sea: '#e6eefc', sea2: '#ffffff' };
  }
  return { sea: s.sea, sea2: s.sea2 };
}

function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- static backdrop (cached per scene + time of day) ----------

const BG_CACHE = new Map();
function backdrop(scene, ti) {
  const key = scene + '|' + ti;
  if (BG_CACHE.has(key)) return BG_CACHE.get(key);
  const cv = makeCanvas(W, H);
  const c = cv.getContext('2d');
  const S = SKIES[ti];

  // sky bands
  const bands = 14, bandH = Math.ceil(HORIZON / bands);
  let prev = null;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    let col = t < 0.5 ? mixColor(S.top, S.mid, t * 2) : mixColor(S.mid, S.bot, (t - 0.5) * 2);
    if (scene === 'volcano') col = mixColor(col, '#7a2a2a', 0.35);
    if (scene === 'sky' && ti < 3) col = mixColor(col, '#ffe9a8', 0.18);
    if (scene === 'drum') col = mixColor(col, '#dfe8f5', ti === 3 ? 0.12 : 0.35);
    if (scene === 'logue') col = mixColor(col, '#6a7088', 0.25);
    pxRect(c, 0, i * bandH, W, bandH, col);
    // checkerboard dither where two bands meet, for a smoother pixel gradient
    if (prev) for (let x = 0; x < W; x += 2) { pxRect(c, x, i * bandH, 1, 1, prev); pxRect(c, x + 1, i * bandH - 1, 1, 1, col); }
    prev = col;
  }
  // stars
  if (ti === 3) {
    const r = seeded(7);
    for (let i = 0; i < 40; i++) pxRect(c, r() * W, r() * (HORIZON - 8), 1, 1, r() > 0.7 ? '#fff6c8' : '#9aa8d8');
  }
  // sun / moon
  if (ti === 0) pxCircle(c, 158, 44, 8, '#fff1b0');
  if (ti === 1) { pxCircle(c, 34, 16, 8, '#fff8d8'); pxCircle(c, 34, 16, 6, '#ffffff'); }
  if (ti === 2) pxCircle(c, 96, 64, 11, '#ffb060');
  if (ti === 3) { pxCircle(c, 150, 18, 6, '#f0f0d8'); pxCircle(c, 148, 17, 1, '#c8c8b0'); pxCircle(c, 152, 20, 1, '#c8c8b0'); }

  // distant islands on the horizon
  if (scene !== 'sky') {
    const far = mixColor(S.mid, '#2a3a5a', 0.45);
    pxCircle(c, 116, HORIZON + 2, 7, far);
    pxCircle(c, 126, HORIZON + 3, 5, far);
  }

  // sea
  const sc = seaColors(scene, ti);
  const seaBottom = scene === 'sea' || scene === 'deck' ? H : GROUND;
  pxRect(c, 0, HORIZON, W, seaBottom - HORIZON, sc.sea);
  pxRect(c, 0, HORIZON, W, 1, sc.sea2);
  // sun glitter column
  if (ti !== 1 && scene !== 'sky') {
    const gx = ti === 0 ? 158 : ti === 2 ? 96 : 150;
    for (let y = HORIZON + 3; y < seaBottom; y += 4) pxRect(c, gx - 4 + ((y * 7) % 5), y, 6, 1, ti === 3 ? '#8a9ac8' : '#ffe0a0');
  }

  // land props on their own layer so dusk/night shading darkens them but not the sky
  const draw = PROPS[scene];
  if (draw) {
    const layer = makeCanvas(W, H);
    const lc = layer.getContext('2d');
    draw(lc, ti);
    if (S.shade) {
      lc.globalCompositeOperation = 'source-atop';
      lc.globalAlpha = S.shade;
      pxRect(lc, 0, 0, W, H, '#0a1030');
      lc.globalAlpha = 1;
      lc.globalCompositeOperation = 'source-over';
      if (LIGHTS[scene]) LIGHTS[scene](lc);
    }
    c.drawImage(layer, 0, 0);
  }
  BG_CACHE.set(key, cv);
  return cv;
}

function groundBase(c, top, body, line) {
  pxRect(c, 0, GROUND, W, H - GROUND, body);
  pxRect(c, 0, GROUND, W, 2, top);
  if (line) pxRect(c, 0, GROUND + 2, W, 1, line);
}

function drawHouse(c, x, y, wall, roof) {
  pxRect(c, x, y - 14, 24, 14, wall);
  pxRect(c, x + 19, y - 14, 5, 14, mixColor(wall, '#000000', 0.15));
  for (let i = 0; i < 8; i++) pxRect(c, x - 2 + i, y - 15 - i, 28 - 2 * i, 1, i === 0 ? mixColor(roof, '#000000', 0.25) : roof);
  pxRect(c, x + 4, y - 8, 5, 8, '#7a4a24');
  pxRect(c, x + 13, y - 11, 5, 4, '#7ac0e8');
}

function drawPalm(c, x, y) {
  for (let i = 0; i < 28; i++) {
    pxRect(c, x + Math.round(Math.sin(i / 28 * 1.3) * 5), y - i, 3, 1, i % 4 === 0 ? '#6a4428' : '#9a6a3a');
  }
  const tx = x + 6, ty = y - 28;
  const leaf = '#3f9a3a';
  pxLine(c, tx, ty, tx - 12, ty + 6, leaf, 2);
  pxLine(c, tx, ty, tx + 13, ty + 5, leaf, 2);
  pxLine(c, tx, ty, tx - 8, ty - 6, leaf, 2);
  pxLine(c, tx, ty, tx + 9, ty - 6, leaf, 2);
  pxLine(c, tx, ty, tx + 1, ty - 9, '#5ab84a', 2);
  pxCircle(c, tx - 1, ty + 2, 1, '#7a4a24');
  pxCircle(c, tx + 2, ty + 3, 1, '#7a4a24');
}

function drawCoral(c, x, y, col) {
  pxRect(c, x, y - 16, 3, 16, col);
  pxRect(c, x - 5, y - 10, 5, 2, col); pxRect(c, x - 5, y - 15, 2, 5, col);
  pxRect(c, x + 3, y - 12, 5, 2, col); pxRect(c, x + 6, y - 18, 2, 6, col);
  pxCircle(c, x + 1, y - 17, 2, col); pxCircle(c, x - 4, y - 16, 1, col); pxCircle(c, x + 7, y - 19, 1, col);
}

const PROPS = {
  village(c) {
    groundBase(c, '#86cf5e', '#5aa846');
    pxRect(c, 0, GROUND + 9, W, 12, '#d7b27a');
    pxRect(c, 0, GROUND + 9, W, 1, '#b8935e');
    const r = seeded(3);
    for (let i = 0; i < 22; i++) pxRect(c, r() * W, GROUND + 3 + (r() > 0.5 ? 0 : 20), 1, 2, '#3f8a34');
    drawHouse(c, 50, GROUND, '#ecdcb6', '#c0453a');
    drawHouse(c, 80, GROUND - 2, '#e2d0a6', '#3f7ac0');
    drawPalm(c, 122, GROUND + 1);
    // windmill tower (blades are animated)
    const x = 162, y = GROUND;
    for (let i = 0; i < 34; i++) {
      const w = Math.round(14 - i * 6 / 34);
      pxRect(c, x - w / 2, y - i - 1, w, 1, '#efe6d2');
      pxRect(c, x + w / 2 - 2, y - i - 1, 2, 1, '#cbbf9f');
    }
    for (let i = 0; i < 6; i++) pxRect(c, x - 5 + i, y - 40 + i, 10 - 2 * i + 1, 1, '#b5463a');
    pxRect(c, x - 2, y - 7, 4, 7, '#7a4a24');
    pxRect(c, x - 1, y - 22, 3, 3, '#7ac0e8');
  },
  marine(c) {
    groundBase(c, '#c9ced6', '#a9afb9');
    for (let x = 0; x < W; x += 12) pxRect(c, x, GROUND + 2, 1, H - GROUND, '#959ca8');
    for (let y = GROUND + 8; y < H; y += 8) pxRect(c, 0, y, W, 1, '#959ca8');
    // fortress wall
    pxRect(c, 46, GROUND - 12, 74, 12, '#c9ced6');
    for (let x = 46; x < 120; x += 8) pxRect(c, x, GROUND - 15, 5, 3, '#c9ced6');
    pxRect(c, 46, GROUND - 4, 74, 1, '#959ca8');
    // tower
    pxRect(c, 140, 34, 28, GROUND - 34, '#eef0f4');
    pxRect(c, 163, 34, 5, GROUND - 34, '#cfd5df');
    pxRect(c, 140, 42, 28, 3, '#2f5fb3');
    pxRect(c, 140, 84, 28, 3, '#2f5fb3');
    pxRect(c, 137, 30, 34, 4, '#2f5fb3');
    drawText(c, 'MARINE', 154, 56, { color: '#2f5fb3', shadow: null, align: 'center' });
    pxRect(c, 149, 66, 10, 12, '#4a5a7a');
    pxRect(c, 153, 14, 1, 16, '#5a5a6a');
    pxRect(c, 154, 14, 9, 6, '#2f5fb3');
    pxRect(c, 157, 16, 3, 2, '#ffffff');
  },
  town(c) {
    groundBase(c, '#e0bc84', '#c9a26a');
    for (let y = GROUND + 6, row = 0; y < H; y += 5, row++) {
      for (let x = (row % 2) * 6; x < W; x += 12) pxRect(c, x, y, 9, 1, '#b8935e');
    }
    drawHouse(c, 48, GROUND, '#f2c27a', '#e07a3a');
    drawHouse(c, 78, GROUND - 2, '#e8b070', '#c0453a');
    // Buggy's circus tent
    const tx = 158, base = GROUND;
    for (let x = tx - 28; x < tx + 28; x++) pxRect(c, x, base - 20, 1, 20, Math.floor((x - tx + 28) / 6) % 2 ? '#f2f2f2' : '#d63c2f');
    for (let i = 0; i < 18; i++) {
      const half = 30 - i * 1.6;
      for (let x = Math.round(tx - half); x < tx + half; x++) pxRect(c, x, base - 21 - i, 1, 1, Math.floor((x - tx + 40) / 6) % 2 ? '#f2f2f2' : '#d63c2f');
    }
    pxRect(c, tx - 5, base - 12, 10, 12, '#2a2433');
    pxRect(c, tx, base - 46, 1, 8, '#5a3a22');
    pxRect(c, tx + 1, base - 46, 7, 4, '#d63c2f');
    pxRect(c, tx + 3, base - 45, 2, 2, '#ffe14a');
  },
  syrup(c) {
    // the mansion on the hill
    pxCircle(c, 158, GROUND + 30, 56, '#4f9a3a');
    pxRect(c, 136, 56, 40, 20, '#f2efe6');
    pxRect(c, 170, 56, 6, 20, '#d9d4c4');
    for (let i = 0; i < 8; i++) pxRect(c, 134 + i, 55 - i, 44 - 2 * i, 1, '#3f6fb0');
    for (const wx of [140, 150, 160]) pxRect(c, wx, 61, 5, 5, '#7ac0e8');
    pxRect(c, 153, 68, 6, 8, '#7a4a24');
    groundBase(c, '#86cf5e', '#5aa846');
    // slope path and a fence
    for (let i = 0; i < 26; i++) pxRect(c, 112 + i, GROUND + 12 - Math.round(i * 0.45), 8, 2, '#c9a26a');
    for (let x = 40; x < 108; x += 9) pxRect(c, x, GROUND - 8, 2, 9, '#9a6a3a');
    pxRect(c, 40, GROUND - 6, 68, 1, '#9a6a3a');
    pxRect(c, 40, GROUND - 3, 68, 1, '#9a6a3a');
    drawPalm(c, 120, GROUND + 1);
  },
  baratie(c) {
    // the fish-shaped floating restaurant
    pxRect(c, 104, 64, 74, 36, '#e07a3a');
    pxRect(c, 104, 64, 74, 3, '#f2a05a');
    pxCircle(c, 176, 82, 18, '#e07a3a');
    pxCircle(c, 182, 76, 4, '#ffffff');
    pxCircle(c, 183, 76, 2, '#1b1424');
    for (let i = 0; i < 10; i++) pxRect(c, 92 + i, 70 + i, 12 - i, 20 - 2 * i, '#c95a2a');
    for (let i = 0; i < 6; i++) pxRect(c, 110 + i * 11, 74, 6, 6, '#ffd36a');
    pxRect(c, 112, 52, 50, 10, '#7a4a24');
    drawText(c, 'BARATIE', 137, 54, { color: '#ffe14a', shadow: null, align: 'center' });
    // the deck you stand on
    pxRect(c, 0, GROUND, W, H - GROUND, '#9a6a3f');
    for (let y = GROUND + 5; y < H; y += 6) pxRect(c, 0, y, W, 1, '#7a5030');
    for (let x = 14; x < W; x += 32) pxRect(c, x, GROUND, 1, H - GROUND, '#86592f');
    pxRect(c, 0, GROUND - 4, W, 2, '#7a5030');
    for (let x = 30; x < W; x += 16) pxRect(c, x, GROUND - 4, 3, 5, '#6a4422');
  },
  reef(c) {
    groundBase(c, '#fbe8c4', '#f2d9a8');
    const r = seeded(11);
    for (let i = 0; i < 30; i++) pxRect(c, r() * W, GROUND + 3 + r() * 24, 1, 1, r() > 0.5 ? '#f2a7b5' : '#d9b886');
    drawCoral(c, 58, GROUND, '#ff7a9a');
    drawCoral(c, 112, GROUND, '#ff9a4a');
    // coral arch
    for (let a = 0; a <= Math.PI; a += 0.03) {
      for (let rr = 17; rr <= 21; rr++) pxRect(c, 160 + Math.cos(a) * rr, GROUND - Math.sin(a) * rr * 1.2, 1, 1, rr === 21 ? '#d9506e' : '#ff7a9a');
    }
    pxCircle(c, 160, GROUND - 27, 3, '#ffd0dc');
  },
  desert(c) {
    for (let x = 70; x < W; x++) {
      const h = Math.round(9 + Math.sin(x * 0.06) * 4 + Math.sin(x * 0.17) * 2);
      pxRect(c, x, GROUND - h, 1, h, x % 2 ? '#e2b56a' : '#dcae62');
    }
    groundBase(c, '#f5d79a', '#e9c27b');
    for (let i = 0; i < 6; i++) pxRect(c, 10 + i * 31, GROUND + 6 + (i % 3) * 6, 12, 1, '#d4a85e');
    // palace
    pxCircle(c, 155, 74, 12, '#e0b13a');
    pxCircle(c, 151, 70, 3, '#f4d26a');
    pxRect(c, 130, 74, 50, GROUND - 74, '#f1e2bf');
    pxRect(c, 172, 74, 8, GROUND - 74, '#dccaa0');
    pxRect(c, 150, 88, 10, 14, '#7a5a3a');
    pxCircle(c, 155, 88, 5, '#7a5a3a');
    for (const tx of [126, 182]) {
      pxRect(c, tx - 2, 62, 5, GROUND - 62, '#f1e2bf');
      pxCircle(c, tx, 61, 3, '#e0b13a');
    }
    // cactus
    pxRect(c, 66, GROUND - 16, 4, 16, '#4f9a4a');
    pxRect(c, 62, GROUND - 11, 4, 2, '#4f9a4a'); pxRect(c, 62, GROUND - 14, 2, 4, '#4f9a4a');
    pxRect(c, 70, GROUND - 8, 4, 2, '#4f9a4a'); pxRect(c, 72, GROUND - 12, 2, 5, '#4f9a4a');
  },
  sky(c, ti) {
    const night = ti === 3;
    // giant beanstalk in the distance
    for (let y = 0; y < GROUND; y++) {
      const x = 104 + Math.round(Math.sin(y * 0.12) * 3);
      pxRect(c, x, y, 4, 1, y % 6 === 0 ? '#2f7a3a' : '#3f9a4a');
      if (y % 14 === 0) { pxRect(c, x - 4, y, 4, 2, '#5ab84a'); pxRect(c, x + 4, y + 6, 4, 2, '#5ab84a'); }
    }
    // cloud ground
    pxRect(c, 0, GROUND + 2, W, H - GROUND, night ? '#7f8cba' : '#ffffff');
    for (let x = 0; x < W + 12; x += 12) pxCircle(c, x, GROUND + 3, 6, night ? '#8a97c4' : '#ffffff');
    for (let x = 6; x < W; x += 16) pxRect(c, x, GROUND + 16, 8, 1, night ? '#6a76a4' : '#d6e2f5');
    // golden bell on a pillar
    pxRect(c, 150, 66, 12, GROUND - 64, '#d9cfb8');
    pxRect(c, 159, 66, 3, GROUND - 64, '#bdb29a');
    pxRect(c, 147, 64, 18, 3, '#bdb29a');
    for (let i = 0; i < 16; i++) {
      const w = Math.round(5 + i * 0.75);
      pxRect(c, 156 - w, 46 + i, w * 2, 1, i === 15 ? '#b8860b' : '#e6b422');
    }
    pxRect(c, 152, 48, 2, 8, '#fff0a0');
    pxRect(c, 155, 62, 2, 3, '#8a6a1a');
  },
  volcano(c) {
    for (let i = 0; i < 62; i++) {
      const half = Math.round(7 + i * 0.9);
      pxRect(c, 150 - half, 40 + i, half * 2, 1, '#4a3a3e');
      pxRect(c, 150 + half - Math.round(half * 0.4), 40 + i, Math.round(half * 0.4), 1, '#3a2c30');
    }
    pxRect(c, 143, 40, 14, 2, '#ff5a2a');
    pxRect(c, 146, 42, 3, 18, '#ff8a3a');
    pxRect(c, 144, 60, 3, 14, '#e2582a');
    groundBase(c, '#5a4a50', '#3b3036');
    pxLine(c, 20, GROUND + 8, 60, GROUND + 14, '#ff6a3a');
    pxLine(c, 100, GROUND + 18, 150, GROUND + 10, '#ff6a3a');
    pxLine(c, 150, GROUND + 10, 180, GROUND + 20, '#e2582a');
    // skull rock
    pxCircle(c, 66, GROUND - 14, 13, '#cfc8bc');
    pxRect(c, 58, GROUND - 6, 17, 6, '#cfc8bc');
    pxCircle(c, 61, GROUND - 15, 3, '#2a2028');
    pxCircle(c, 71, GROUND - 15, 3, '#2a2028');
    pxRect(c, 65, GROUND - 9, 3, 3, '#2a2028');
    for (let x = 59; x < 75; x += 3) pxRect(c, x, GROUND - 4, 1, 4, '#8a8478');
  },
  logue(c) {
    groundBase(c, '#a8a296', '#8a8478', '#6f6a60');
    for (let y = GROUND + 6, row = 0; y < H; y += 5, row++) {
      for (let x = (row % 2) * 5; x < W; x += 10) { pxRect(c, x, y, 8, 1, '#7a756c'); pxRect(c, x + 8, y - 4, 1, 4, '#7a756c'); }
    }
    // tall town houses
    const houses = [[40, 30, '#d8cbb0', '#4a5a7a'], [62, 38, '#c9b89a', '#7a3a3a'], [86, 26, '#e2d6bc', '#4a5a7a']];
    for (const [hx, hh, wall, roof] of houses) {
      pxRect(c, hx, GROUND - hh, 20, hh, wall);
      pxRect(c, hx + 16, GROUND - hh, 4, hh, mixColor(wall, '#000000', 0.15));
      for (let i = 0; i < 7; i++) pxRect(c, hx - 1 + i, GROUND - hh - 1 - i, 22 - 2 * i, 1, i ? roof : mixColor(roof, '#000000', 0.3));
      for (let wy = GROUND - hh + 4; wy < GROUND - 9; wy += 9) { pxRect(c, hx + 3, wy, 4, 5, '#5a6a8a'); pxRect(c, hx + 11, wy, 4, 5, '#5a6a8a'); }
      pxRect(c, hx + 7, GROUND - 8, 6, 8, '#5a3a22');
    }
    // the execution platform
    const ex = 128, top = GROUND - 30;
    for (let i = 0; i < 16; i++) pxRect(c, ex - 16 + i, top + 2 + i * 1.75, 3, 2, i % 2 ? '#7a4a24' : '#8a5a32');
    pxRect(c, ex, top, 44, 4, '#8a5a32');
    pxRect(c, ex, top, 44, 1, '#b07a4a');
    for (const lx of [ex + 2, ex + 20, ex + 39]) pxRect(c, lx, top + 4, 3, GROUND - top - 4, '#6a4422');
    pxLine(c, ex + 4, top + 5, ex + 38, GROUND - 2, '#5a3818');
    pxLine(c, ex + 38, top + 5, ex + 4, GROUND - 2, '#5a3818');
    pxRect(c, ex + 12, top - 22, 3, 22, '#6a4422');
    pxRect(c, ex + 29, top - 22, 3, 22, '#6a4422');
    pxRect(c, ex + 9, top - 25, 26, 3, '#5a3818');
    pxRect(c, ex + 18, top - 8, 8, 8, '#3a3440');
    // a Marine flag over the harbor
    pxRect(c, 182, 28, 1, GROUND - 28, '#5a5a6a');
    pxRect(c, 172, 28, 10, 7, '#2f5fb3');
    pxRect(c, 175, 30, 4, 3, '#ffffff');
  },
  drum(c) {
    // drum-shaped mountains with the castle on the tallest
    const drums = [[96, 24, 40, '#c9d4e4'], [150, 34, 62, '#b8c6da'], [184, 22, 34, '#c9d4e4']];
    for (const [dx, dw, dh, col] of drums) {
      pxRect(c, dx - dw / 2, GROUND - dh, dw, dh, col);
      pxRect(c, dx + dw / 2 - 5, GROUND - dh, 5, dh, mixColor(col, '#5a6a8a', 0.25));
      pxRect(c, dx - dw / 2, GROUND - dh - 2, dw, 4, '#ffffff');
      for (let y = GROUND - dh + 8; y < GROUND; y += 9) pxRect(c, dx - dw / 2, y, dw, 1, mixColor(col, '#5a6a8a', 0.18));
    }
    const cx = 150, cy = GROUND - 64;
    pxRect(c, cx - 10, cy - 10, 20, 10, '#e8eef8');
    pxRect(c, cx - 13, cy - 16, 6, 16, '#e8eef8');
    pxRect(c, cx + 7, cy - 16, 6, 16, '#e8eef8');
    pxRect(c, cx - 13, cy - 18, 6, 2, '#c0453a'); pxRect(c, cx + 7, cy - 18, 6, 2, '#c0453a');
    pxRect(c, cx - 2, cy - 6, 4, 6, '#5a6a8a');
    // snowy ground and pines
    groundBase(c, '#ffffff', '#eef3fa', '#d6e2f2');
    for (let i = 0; i < 12; i++) pxRect(c, (i * 37) % W, GROUND + 8 + (i % 3) * 7, 10, 1, '#d6e2f2');
    for (const [tx, th] of [[22, 26], [46, 20], [66, 30]]) {
      pxRect(c, tx - 1, GROUND - 4, 3, 4, '#5a3a22');
      for (let i = 0; i < th; i++) {
        const half = Math.round(1 + i * 0.32) + (i % 6 === 5 ? 2 : 0);
        pxRect(c, tx - half, GROUND - 4 - th + i, half * 2 + 1, 1, i % 6 < 2 ? '#ffffff' : '#2f6a4a');
      }
    }
  },
  deck(c) {
    pxRect(c, 0, GROUND + 4, W, H - GROUND - 4, '#9a6a3f');
    for (let y = GROUND + 9; y < H; y += 6) pxRect(c, 0, y, W, 1, '#7a5030');
    for (let x = 10; x < W; x += 34) pxRect(c, x, GROUND + 4, 1, H - GROUND, '#86592f');
    pxRect(c, 0, GROUND - 4, W, 2, '#7a5030');
    for (let x = 4; x < W; x += 16) pxRect(c, x, GROUND - 4, 3, 9, '#6a4422');
    pxRect(c, 0, GROUND + 3, W, 2, '#6a4422');
    pxRect(c, 4, 0, 6, GROUND + 4, '#6a4422');
    pxRect(c, 8, 0, 2, GROUND + 4, '#5a3818');
  },
};

const LIGHTS = {
  town(c) { pxRect(c, 61, GROUND - 11, 5, 4, '#ffd36a'); pxRect(c, 91, GROUND - 13, 5, 4, '#ffd36a'); pxRect(c, 153, GROUND - 12, 10, 12, '#ffb84a'); },
  syrup(c) { for (const wx of [140, 150, 160]) pxRect(c, wx, 61, 5, 5, '#ffd36a'); },
  baratie(c) { for (let i = 0; i < 6; i++) pxRect(c, 110 + i * 11, 74, 6, 6, '#ffd36a'); },
  village(c) { pxRect(c, 63, GROUND - 11, 5, 4, '#ffd36a'); pxRect(c, 93, GROUND - 13, 5, 4, '#ffd36a'); pxRect(c, 161, GROUND - 22, 3, 3, '#ffd36a'); },
  marine(c) { pxRect(c, 149, 66, 10, 12, '#ffd36a'); },
  desert(c) { pxRect(c, 150, 88, 10, 14, '#ffb84a'); pxCircle(c, 155, 88, 5, '#ffb84a'); },
  logue(c) { for (const hx of [40, 62, 86]) { pxRect(c, hx + 3, GROUND - 14, 4, 5, '#ffd36a'); pxRect(c, hx + 11, GROUND - 23, 4, 5, '#ffd36a'); } pxRect(c, 146, GROUND - 38, 8, 8, '#ff9a3a'); },
  drum(c) { pxRect(c, 148, GROUND - 70, 4, 6, '#ffd36a'); pxRect(c, 139, GROUND - 78, 2, 3, '#ffd36a'); pxRect(c, 159, GROUND - 78, 2, 3, '#ffd36a'); },
};

// ---------- animated layer ----------

function drawCloud(c, x, y, s, col) {
  pxCircle(c, x, y, 4 * s, col);
  pxCircle(c, x + 6 * s, y - 2 * s, 5 * s, col);
  pxCircle(c, x + 12 * s, y, 4 * s, col);
  pxRect(c, x - 4 * s, y, 20 * s, 4 * s, col);
}

function drawAnimated(c, scene, ti, t, seaSpeed) {
  const cloudCol = ti === 3 ? '#2a3466' : ti === 2 ? '#ffd0b0' : '#ffffff';
  const clouds = [[10, 14, 1], [90, 26, 1], [150, 8, 1]];
  for (const [x0, y, s] of clouds) {
    const x = ((x0 + t * 3) % (W + 40)) - 20;
    drawCloud(c, Math.round(x), y, s, cloudCol);
  }
  if (ti === 3) {
    for (let i = 0; i < 6; i++) {
      if (Math.sin(t * 2 + i * 1.7) > 0.6) pxRect(c, (i * 37 + 11) % W, (i * 13 + 5) % 50, 1, 1, '#ffffff');
    }
  }
  const sc = seaColors(scene, ti);
  const seaBottom = scene === 'sea' ? H : scene === 'deck' ? GROUND - 5 : GROUND;
  const rows = Math.max(1, Math.floor((seaBottom - HORIZON - 6) / 5));
  const spd = seaSpeed || 1;
  for (let i = 0; i < rows * 3; i++) {
    const y = HORIZON + 4 + (i % rows) * 5 + (i % 3);
    if (y >= seaBottom - 1) continue;
    const len = 4 + (i % 4) * 2;
    const x = ((i * 41 + t * (6 + (i % 3) * 3) * spd) % (W + 24)) - 12;
    pxRect(c, Math.round(x), y, len, 1, sc.sea2);
  }
  if (scene === 'village') {
    const hx = 162, hy = GROUND - 36;
    for (let b = 0; b < 4; b++) {
      const a = t * 1.2 + b * Math.PI / 2;
      const ex = hx + Math.cos(a) * 16, ey = hy + Math.sin(a) * 16;
      pxLine(c, hx, hy, ex, ey, '#8a6a4a', 1);
      pxLine(c, hx + Math.cos(a + 0.25) * 6, hy + Math.sin(a + 0.25) * 6, ex + Math.cos(a + 0.2) * 2, ey + Math.sin(a + 0.2) * 2, '#f2ead8', 2);
    }
    pxRect(c, hx - 1, hy - 1, 3, 3, '#5a3a22');
  }
  if (scene === 'volcano') {
    for (let i = 0; i < 5; i++) {
      const k = ((t * 0.25 + i / 5) % 1);
      pxCircle(c, 150 + Math.sin(k * 6 + i) * 4 + k * 10, 38 - k * 38, 3 + k * 5, mixColor('#5a4a50', '#2a2028', k));
    }
  }
  if (scene === 'drum') {
    for (let i = 0; i < 34; i++) {
      const x = ((i * 53 + t * (6 + (i % 4) * 2) + Math.sin(t + i) * 4) % (W + 8)) - 4;
      const y = (i * 29 + t * (10 + (i % 3) * 5)) % H;
      pxRect(c, Math.round(x), Math.round(y), i % 5 ? 1 : 2, i % 5 ? 1 : 2, '#ffffff');
    }
  }
  if (scene === 'logue') {
    const k = (t * 0.7) % 1;
    for (let i = 0; i < 4; i++) pxRect(c, 172 + Math.round(Math.sin(t * 3 + i) * 1), 28 + i * 2, 10 - i, 1, '#2f5fb3');
    if (k < 0.04) for (let i = 0; i < 3; i++) pxRect(c, 20 + i * 60, 0, 1, 2, '#ffffff');
  }
  if (scene === 'reef') {
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.3 + i / 6) % 1);
      pxRect(c, 20 + i * 14 + Math.sin(k * 8) * 2, GROUND - 2 - k * 28, 2, 2, '#d8f4ff');
    }
  }
}

// ---------- ship ----------

const PAINTS = {
  wood:  { name: 'Natural Wood', hull: '#8a5a32', dark: '#6a4422', trim: '#c99a5a' },
  red:   { name: 'Red', hull: '#c0453a', dark: '#8a2a22', trim: '#f2c27a' },
  blue:  { name: 'Ocean Blue', hull: '#3a6ab8', dark: '#2a4a8a', trim: '#f2f2f2' },
  black: { name: 'Black', hull: '#3a3440', dark: '#1b1424', trim: '#d63c2f' },
  white: { name: 'Snow White', hull: '#e8eef8', dark: '#b8c4d8', trim: '#3b6fd6' },
  gold:  { name: 'Gold Leaf', hull: '#e6b422', dark: '#b8860b', trim: '#fff3a0' },
};
const LANTERN_COLS = ['#ff5a5a', '#ffd04a', '#7cff7a', '#7cd0ff', '#ff8ab0'];

function drawJollyRoger(c, sx, sy, s) {
  s = s || 1;
  const r = (x, y, w, h, col) => pxRect(c, sx + x * s, sy + y * s, w * s, h * s, col);
  r(1, 0, 6, 1, '#f4c542');
  r(0, 1, 8, 1, '#d63c2f');
  r(2, 2, 4, 4, '#1b1424');
  r(3, 3, 1, 1, '#f4efe1');
  r(5, 3, 1, 1, '#f4efe1');
  r(3, 6, 3, 1, '#1b1424');
  for (let i = 0; i < 5; i++) { r(i * 2 - 1, 4 + i, 1, 1, '#1b1424'); r(9 - i * 2, 4 + i, 1, 1, '#1b1424'); }
}

// A sagging string of lanterns from (x0,y0) to (x1,y1).
function drawLanternString(c, x0, y0, x1, y1, night, size, sag) {
  const n = Math.max(3, Math.round(Math.abs(x1 - x0) / (size > 1 ? 16 : 7)));
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * (sag === undefined ? 6 * size : sag);
    pxLine(c, px, py, x, y, '#3a2a1a');
    if (i < n) {
      const col = LANTERN_COLS[i % LANTERN_COLS.length];
      if (night) { c.globalAlpha = 0.3; pxCircle(c, x, y + size, 3 * size, col); c.globalAlpha = 1; }
      pxRect(c, x - size, y, 2 * size, 2 * size + 1, col);
    }
    px = x; py = y;
  }
}

// Side view of your ship. o: { owned, paint, head, t, night, onDeck(c, deckY) }.
// x is the stern end of the hull, y is the waterline; the hull is 50px long.
function drawShip(c, x, y, o) {
  o = o || {};
  const up = o.owned || {}, P = PAINTS[o.paint] || PAINTS.wood, t = o.t || 0;
  const L = 50, mx = x + 24;
  // mast, sail and flag
  pxRect(c, mx, y - 52, 2, 42, '#5a3818');
  const sl = x + 12, sr = x + 38, st = y - 46, sb = y - 23;
  pxRect(c, sl - 1, st - 1, sr - sl + 2, 1, '#5a3818');
  for (let yy = st; yy < sb; yy++) {
    const belly = Math.round(Math.sin((yy - st) / (sb - st) * Math.PI) * 2);
    pxRect(c, sl + belly, yy, sr - sl, 1, yy > sb - 3 ? '#d8d0bc' : '#f4efe1');
  }
  if (up.sails) { pxRect(c, sl + 1, st + 2, sr - sl, 2, '#d63c2f'); pxRect(c, sl + 1, sb - 6, sr - sl, 2, '#d63c2f'); }
  drawJollyRoger(c, mx - 4, st + 6);
  pxRect(c, mx + 2, y - 52, 7, 4, '#1b1424');
  pxRect(c, mx + 4, y - 51, 2, 2, '#f4efe1');
  if (up.nest) {
    pxRect(c, mx - 4, y - 48, 10, 4, '#7a4a24');
    pxRect(c, mx - 4, y - 48, 10, 1, '#a0663a');
    for (let i = 0; i < 10; i += 3) pxRect(c, mx - 4 + i, y - 47, 1, 3, '#5a3818');
  }
  if (up.lanterns) {
    drawLanternString(c, mx + 1, y - 44, x + 1, y - 15, o.night, 1);
    drawLanternString(c, mx + 1, y - 44, x + L - 4, y - 14, o.night, 1);
  }
  // stern cabin with the galley chimney
  pxRect(c, x + 1, y - 18, 12, 7, P.dark);
  pxRect(c, x + 1, y - 18, 12, 1, P.trim);
  pxRect(c, x + 4, y - 16, 3, 2, o.night ? '#ffd36a' : '#7ac0e8');
  if (up.galley) {
    pxRect(c, x + 9, y - 22, 3, 4, '#3a3440');
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i / 3) % 1);
      pxRect(c, x + 9 + Math.round(Math.sin(k * 6 + i) * 2), y - 24 - k * 10, 2, 2, mixColor('#ffffff', '#b9bdc9', k));
    }
  }
  if (o.onDeck) o.onDeck(c, y - 9);
  // hull
  for (let i = 0; i < 10; i++) {
    const l = x + Math.round(i * 0.7), r = x + L - Math.round(i * 1.9);
    pxRect(c, l, y - 10 + i, r - l, 1, i === 0 || i === 4 ? P.trim : i < 4 ? P.hull : P.dark);
  }
  pxRect(c, x - 1, y - 13, L - 2, 1, P.dark);
  for (let i = 0; i < L - 4; i += 5) pxRect(c, x + i, y - 13, 1, 3, P.dark);
  for (const wx of [x + 12, x + 22, x + 32]) {
    pxRect(c, wx, y - 5, 2, 2, up.aquarium ? '#4fa3e0' : PAL.k);
    if (up.aquarium && Math.floor(t * 2 + wx) % 3 === 0) pxRect(c, wx + 1, y - 5, 1, 1, '#ffd04a');
  }
  if (up.cannon) for (const cx of [x + 17, x + 29]) { pxRect(c, cx, y - 8, 3, 2, PAL.k); pxRect(c, cx + 3, y - 8, 1, 2, '#5a5a6a'); }
  if (up.weights) { pxRect(c, x + 34, y - 15, 6, 1, '#9aa4b1'); pxRect(c, x + 34, y - 16, 1, 3, '#5a5a6a'); pxRect(c, x + 39, y - 16, 1, 3, '#5a5a6a'); }
  // bowsprit and figurehead
  pxLine(c, x + L - 3, y - 10, x + L + 9, y - 17, '#5a3818');
  if (o.head) c.drawImage(getSprite({ kind: 'figure', head: o.head }), x + L - 6, y - 23);
  else { pxRect(c, x + L - 3, y - 13, 3, 3, P.trim); }
  // foam at the waterline
  for (let i = 0; i < L + 6; i += 4) pxRect(c, x - 2 + i + Math.round(Math.sin(t * 3 + i) * 1), y - 1, 2, 1, '#e8f6ff');
}

// ---------- on-deck view (boat mode) ----------
// Back layer: sky rigging, sail, lanterns and the rail behind the seated crew.
function drawDeckBack(c, o) {
  const up = o.owned || {}, P = PAINTS[o.paint] || PAINTS.wood;
  pxLine(c, 97, 2, 4, 64, '#3a2a1a');
  pxLine(c, 97, 2, 188, 64, '#3a2a1a');
  pxLine(c, 97, 2, 40, 64, '#3a2a1a');
  pxLine(c, 97, 2, 154, 64, '#3a2a1a');
  pxRect(c, 94, 0, 6, 66, '#6a4422');
  pxRect(c, 94, 0, 2, 66, '#8a5a32');
  if (up.nest) {
    pxRect(c, 84, 0, 26, 8, '#7a4a24');
    pxRect(c, 84, 7, 26, 1, '#5a3818');
    for (let i = 0; i < 26; i += 4) pxRect(c, 84 + i, 0, 1, 8, '#a0663a');
  }
  // the main sail, bellied by the wind
  const sl = 54, sr = 140, st = 12, sb = 50;
  pxRect(c, sl - 6, st - 3, sr - sl + 12, 3, '#5a3818');
  for (let y = st; y < sb; y++) {
    const off = Math.round(Math.sin((y - st) / (sb - st) * Math.PI) * 5);
    const band = up.sails && ((y - st) % 12 < 3);
    pxRect(c, sl - off, y, sr - sl + off * 2, 1, band ? '#d63c2f' : y > sb - 4 ? '#ddd5c0' : '#f4efe1');
    pxRect(c, sr + off - 3, y, 3, 1, band ? '#b02a22' : '#e2dccb');
  }
  pxRect(c, sl - 6, sb, sr - sl + 12, 2, '#5a3818');
  drawJollyRoger(c, 86, 20, 2);
  if (up.lanterns) {
    drawLanternString(c, 97, 22, 4, 30, o.night, 2, 8);
    drawLanternString(c, 97, 22, 190, 30, o.night, 2, 8);
  }
  // figurehead rising at the bow, the helm at the stern
  if (o.head) {
    const f = getSprite({ kind: 'figure', head: o.head });
    c.drawImage(f, 166, 32, f.width * 2, f.height * 2);
  }
  pxRect(c, 168, 54, 24, 12, P.hull);
  pxRect(c, 168, 54, 24, 2, P.trim);
  pxCircle(c, 16, 52, 9, '#5a3818');
  pxCircle(c, 16, 52, 7, '#8a5a32');
  pxCircle(c, 16, 52, 5, '#5a3818');
  for (let a = 0; a < 8; a++) pxLine(c, 16, 52, 16 + Math.cos(a * Math.PI / 4) * 11, 52 + Math.sin(a * Math.PI / 4) * 11, '#6a4422', 2);
  pxCircle(c, 16, 52, 2, '#c99a5a');
  // rail behind the crew
  pxRect(c, 0, 62, W, 3, P.hull);
  pxRect(c, 0, 62, W, 1, P.trim);
  for (let x = 2; x < W; x += 10) pxRect(c, x, 65, 3, 11, P.dark);
  pxRect(c, 0, 72, W, 2, P.hull);
  if (up.cannon) for (const [cx, dir] of [[34, -1], [160, 1]]) {
    pxRect(c, cx - 6, 66, 12, 6, '#3a3440');
    pxRect(c, dir > 0 ? cx + 6 : cx - 10, 67, 4, 4, '#3a3440');
    pxRect(c, cx - 5, 72, 4, 4, '#6a4422'); pxRect(c, cx + 1, 72, 4, 4, '#6a4422');
  }
}

const ROOM_NAMES = { galley: 'GALLEY', weights: 'GYM', aquarium: 'AQUARIUM', bunks: 'BUNKS' };

function drawRoom(c, kind, x, y, w, h, t) {
  if (kind === 'galley') {
    pxRect(c, x + 5, y + h - 16, 14, 16, '#3a3440');
    pxRect(c, x + 7, y + h - 8, 10, 5, Math.sin(t * 9) > 0 ? '#ff9a3a' : '#ffd04a');
    pxRect(c, x + 7, y + h - 22, 10, 6, '#9aa4b1');
    pxRect(c, x + 6, y + h - 23, 12, 1, '#c9ccd6');
    for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; pxRect(c, x + 9 + i * 3, y + h - 26 - k * 10, 1, 2, '#ffffff'); }
    pxRect(c, x + 24, y + 14, w - 28, 1, '#a0663a');
    for (let i = 0; i < 3; i++) pxCircle(c, x + 28 + i * 6, y + 11, 2, '#f2f2f2');
    pxRect(c, x + 23, y + h - 10, w - 26, 2, '#a0663a');
    pxRect(c, x + 26, y + h - 13, 5, 3, '#c0453a');
  } else if (kind === 'weights') {
    pxRect(c, x + 5, y + h - 14, w - 10, 2, '#9aa4b1');
    for (const bx of [x + 6, x + w - 10]) pxRect(c, bx, y + h - 19, 4, 12, '#3a3440');
    pxRect(c, x + 8, y + h - 3, 6, 3, '#5a5a6a'); pxRect(c, x + 16, y + h - 3, 6, 3, '#5a5a6a');
    const sw = Math.sin(t * 2) * 2;
    pxLine(c, x + w - 12, y, x + w - 12 + sw, y + 8, '#3a2a1a');
    pxRect(c, x + w - 15 + sw, y + 8, 7, 12, '#c0453a');
  } else if (kind === 'aquarium') {
    pxRect(c, x + 3, y + 2, w - 6, h - 4, '#1f76c4');
    pxRect(c, x + 3, y + 2, w - 6, 2, '#8fd0f2');
    for (let i = 0; i < 3; i++) {
      const fx = x + 6 + ((t * (8 + i * 4) + i * 13) % (w - 14)), fy = y + 8 + i * 8;
      pxRect(c, fx, fy, 4, 2, ['#ffd04a', '#ff8a5a', '#f2f2f2'][i]); pxRect(c, fx - 1, fy, 1, 2, ['#e6a03a', '#d8573e', '#c9ccd6'][i]);
    }
    for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; pxRect(c, x + 8 + i * 9, y + h - 4 - k * (h - 8), 1, 1, '#d8f4ff'); }
    for (const sx of [x + 7, x + w - 9]) for (let j = 0; j < 8; j++) pxRect(c, sx + Math.round(Math.sin(t * 2 + j) * 1), y + h - 4 - j, 1, 1, '#3f9a3a');
  } else if (kind === 'bunks') {
    for (const [hy, ph] of [[y + 9, 0], [y + 21, 1.5]]) {
      const sw = Math.sin(t * 1.5 + ph) * 1.5;
      for (let i = 0; i <= 10; i++) {
        const k = i / 10, hx = x + 4 + (w - 8) * k;
        pxRect(c, hx, hy + Math.sin(k * Math.PI) * 4 + sw * Math.sin(k * Math.PI), 4, 2, i % 2 ? '#e8dcc0' : '#d8c8a0');
      }
      pxRect(c, x + 8, hy + 1 + sw, 5, 2, '#ffffff');
    }
  } else {
    for (const [bx, bw] of [[x + 4, 10], [x + 17, 10]]) { pxRect(c, bx, y + h - 13, bw, 13, '#7a4a24'); pxRect(c, bx, y + h - 9, bw, 1, '#5a3818'); pxRect(c, bx, y + h - 4, bw, 1, '#5a3818'); }
    pxRect(c, x + 30, y + h - 10, w - 34, 10, '#a0763a');
    pxLine(c, x + 30, y + h - 10, x + w - 4, y + h - 1, '#7a5a2a');
  }
}

// Front layer: benches, the map easel, the deck and a cut-away hull showing the rooms below.
function drawDeckFront(c, o) {
  const up = o.owned || {}, P = PAINTS[o.paint] || PAINTS.wood, t = o.t || 0;
  for (const [bx, bw] of [[20, 58], [116, 58]]) {
    pxRect(c, bx, 72, bw, 4, '#8a5a32');
    pxRect(c, bx, 72, bw, 1, '#b07a4a');
    pxRect(c, bx + 3, 76, 3, 3, '#5a3818'); pxRect(c, bx + bw - 6, 76, 3, 3, '#5a3818');
  }
  // the map on its easel, center stage
  pxRect(c, 87, 66, 2, 12, '#5a3818'); pxRect(c, 105, 66, 2, 12, '#5a3818');
  pxRect(c, 81, 44, 32, 24, '#5a3818');
  pxRect(c, 83, 46, 28, 20, '#f2e4c0');
  pxRect(c, 83, 46, 28, 1, '#fff6dc');
  for (let i = 0; i < 6; i++) pxRect(c, 86 + i * 4, 60 - (i % 2) * 4 - i, 2, 1, '#c0453a');
  pxCircle(c, 88, 58, 2, '#5aa846'); pxCircle(c, 101, 52, 2, '#e9c27b'); pxCircle(c, 107, 60, 2, '#a9afb9');
  pxLine(c, 103, 48, 106, 51, '#d63c2f'); pxLine(c, 106, 48, 103, 51, '#d63c2f');
  if (o.ready && Math.floor(t * 3) % 2) pxRect(c, 82, 45, 30, 1, '#ffe14a');
  // deck planks
  pxRect(c, 0, 78, W, 5, '#9a6a3f');
  for (let x = 0; x < W; x += 16) pxRect(c, x, 78, 1, 5, '#7a5030');
  pxRect(c, 0, 82, W, 1, '#6a4422');
  // cut-away hull
  const top = 83, h = 34;
  pxRect(c, 0, top, W, h, '#4a3220');
  const rooms = ['galley', 'weights', 'aquarium', 'bunks'];
  const rw = Math.floor((W - 10) / 4);
  rooms.forEach((r, i) => {
    const rx = 4 + i * (rw + 1);
    pxRect(c, rx, top + 2, rw - 2, h - 4, '#5a3c26');
    for (let yy = top + 6; yy < top + h - 2; yy += 7) pxRect(c, rx, yy, rw - 2, 1, '#4e3420');
    drawRoom(c, up[r] ? r : 'cargo', rx, top + 2, rw - 2, h - 4, t + i);
    drawText(c, up[r] ? ROOM_NAMES[r] : 'CARGO', rx + 2, top + 3, { color: up[r] ? '#ffe9b0' : '#a08060', shadow: null });
    pxRect(c, rx + rw - 2, top, 3, h, '#3a2414');
  });
  pxRect(c, 0, top, 4, h, P.dark);
  pxRect(c, W - 4, top, 4, h, P.dark);
  pxRect(c, 0, top + h, W, 3, P.hull);
  pxRect(c, 0, top + h, W, 1, P.trim);
  pxRect(c, 0, top + h + 3, W, H - top - h - 3, P.dark);
  // water lapping at the hull
  const sea = o.sea || '#1f76c4';
  pxRect(c, 0, H - 6, W, 6, sea);
  for (let x = 0; x < W; x += 6) pxRect(c, x + Math.round(Math.sin(t * 2 + x) * 2), H - 6 + (x % 12 ? 0 : 1), 4, 1, '#bfe6ff');
}

// ---------- Reverse Mountain cut-scene ----------
// k runs 0..1: approach, ride the current UP the Red Line, crest the top, plunge into the Grand Line.
function drawReverseMountain(c, k, t, shipCanvas) {
  const phase = k < 0.22 ? 0 : k < 0.62 ? 1 : k < 0.74 ? 2 : 3;
  const sky = phase === 3 ? ['#3a92e0', '#9ad8f5'] : ['#6ab8ee', '#cfe9fb'];
  for (let i = 0; i < 16; i++) pxRect(c, 0, i * 8, W, 8, mixColor(sky[0], sky[1], i / 15));
  const ship = (x, y, a, s) => {
    c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(a);
    c.drawImage(shipCanvas, Math.round(-shipCanvas.width * s / 2), Math.round(-shipCanvas.height * s * 0.8), shipCanvas.width * s, shipCanvas.height * s);
    c.restore();
  };
  if (phase === 0) {
    // wide shot: the Red Line wall with a channel of water flowing upward
    const q = k / 0.22;
    for (let i = 0; i < 5; i++) drawCloud(c, (i * 47 + t * 4) % (W + 30) - 20, 10 + (i % 3) * 9, 1, '#ffffff');
    pxRect(c, 104, 0, 88, 112, '#b0443a');
    for (let y = 0; y < 112; y += 6) pxRect(c, 104 + ((y * 7) % 11), y, 88 - ((y * 7) % 11), 2, '#9a3a32');
    pxRect(c, 104, 0, 3, 112, '#7a2a24');
    pxRect(c, 136, 0, 22, 112, '#3a8ad0');
    for (let i = 0; i < 18; i++) pxRect(c, 138 + (i * 5) % 18, (112 - ((t * 60 + i * 13) % 112)), 2, 5, '#bfe6ff');
    pxRect(c, 0, 100, W, 28, '#1f76c4');
    for (let x = 0; x < W; x += 9) pxRect(c, x + (t * 12) % 9, 104 + (x % 3) * 4, 5, 1, '#8fd0f2');
    ship(-30 + q * 172, 108, 0, 1);
    drawText(c, 'THE RED LINE', 52, 4, { color: '#ffffff', align: 'center' });
  } else if (phase === 1) {
    // close shot: the ship rides the current up the mountain
    const q = (k - 0.22) / 0.4, a = -0.6;
    const scroll = q * 400 + t * 40;
    c.save();
    c.translate(96, 64); c.rotate(a);
    pxRect(c, -200, -200, 400, 400, '#b0443a');
    for (let i = 0; i < 40; i++) pxRect(c, -200 + ((i * 37 - scroll) % 400 + 400) % 400, -60 + ((i * 23) % 120) - 60, 14, 3, i % 2 ? '#9a3a32' : '#c4584a');
    pxRect(c, -200, -14, 400, 28, '#3a8ad0');
    pxRect(c, -200, -14, 400, 2, '#7ab8f0');
    for (let i = 0; i < 30; i++) pxRect(c, -200 + ((i * 29 - scroll * 1.6) % 400 + 400) % 400, -10 + (i * 7) % 22, 8, 1, '#bfe6ff');
    c.restore();
    for (let i = 0; i < 4; i++) drawCloud(c, (i * 61 - q * 260) % (W + 60) + W - 10, ((i * 37 + q * 200) % 150) - 20, 1, '#ffffff');
    ship(96 + Math.sin(t * 9) * 1.5, 70, a, 1);
    for (let i = 0; i < 3; i++) particles(70 + rand(-10, 10), 88, 1, { colors: ['#ffffff', '#bfe6ff'], speed: 40, grav: 60, life: 0.4 });
  } else if (phase === 2) {
    // the summit: a glimpse of the Grand Line far below
    const q = (k - 0.62) / 0.12;
    pxRect(c, 0, 92, W, 36, '#1f76c4');
    for (let x = 0; x < W; x += 13) pxRect(c, x, 100 + (x % 5) * 3, 6, 1, '#8fd0f2');
    for (let i = 0; i < 70; i++) pxRect(c, 60 + i * 1, 60 - Math.round(Math.sin(i / 70 * Math.PI) * 6), 1, 70, i % 9 ? '#b0443a' : '#9a3a32');
    pxRect(c, 60, 52, 70, 8, '#3a8ad0');
    ship(70 + q * 50, 56, (q - 0.5) * 0.6, 1);
    drawText(c, 'GRAND LINE', W / 2, 10, { color: '#ffe14a', scale: 2, align: 'center' });
  } else {
    // plunge down the waterfall and into the sea
    const q = (k - 0.74) / 0.26;
    pxRect(c, 0, 96, W, 32, '#1f76c4');
    pxRect(c, 40, 0, 50, 100, '#b0443a');
    pxRect(c, 58, 0, 18, 100, '#3a8ad0');
    for (let i = 0; i < 16; i++) pxRect(c, 60 + (i * 5) % 14, (t * 120 + i * 19) % 100, 2, 6, '#bfe6ff');
    const y = Math.min(100, -10 + q * 160);
    ship(68 + q * 50, y, q < 0.6 ? 1.0 : 1.0 - (q - 0.6) * 2.5, 1);
    if (q > 0.6) {
      for (let i = 0; i < 6; i++) particles(110 + rand(-10, 10), 98, 1, { colors: ['#ffffff', '#bfe6ff'], speed: 90, grav: 140, life: 0.6, dir: -Math.PI / 2, spread: 1.6 });
      // a lonely giant whale says hello
      const wy = 120 - Math.min(1, (q - 0.6) * 3) * 30;
      pxCircle(c, 166, wy, 22, '#7a9ab8');
      pxRect(c, 144, wy, 44, 22, '#7a9ab8');
      pxCircle(c, 156, wy - 6, 2, '#1b1424');
      pxRect(c, 150, wy + 8, 30, 2, '#5a7a98');
      pxLine(c, 170, wy - 14, 180, wy - 4, '#c9d4e4', 1);
    }
  }
}

// ---------- small UI-in-world helpers ----------

function drawSpriteAt(c, spr, x, y, scale, o) {
  o = o || {};
  const sq = o.squash || 0;
  const w = Math.round(spr.width * scale * (1 + sq));
  const h = Math.round(spr.height * scale * (1 - sq));
  if (o.shadow !== false) {
    c.globalAlpha = 0.25;
    pxRect(c, x - w * 0.32, y - 1, w * 0.64, 2, '#000000');
  }
  c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  if (o.flip) {
    c.save();
    c.translate(Math.round(x), 0);
    c.scale(-1, 1);
    c.drawImage(spr, Math.round(-w / 2), Math.round(y - h), w, h);
    c.restore();
  } else {
    c.drawImage(spr, Math.round(x - w / 2), Math.round(y - h), w, h);
  }
  c.globalAlpha = 1;
}

function drawBubble(c, x, y, text) {
  const w = textWidth(text, 1) + 6;
  const bx = Math.round(Math.min(W - w - 2, Math.max(2, x - w / 2)));
  const by = Math.round(y - 11);
  pxRect(c, bx - 1, by - 1, w + 2, 11, PAL.k);
  pxRect(c, bx, by, w, 9, '#ffffff');
  pxRect(c, x - 1, by + 9, 3, 2, '#ffffff');
  pxRect(c, x - 2, by + 9, 1, 2, PAL.k);
  pxRect(c, x + 2, by + 9, 1, 2, PAL.k);
  pxRect(c, x - 1, by + 11, 3, 1, PAL.k);
  drawText(c, text, bx + 3, by + 2, { color: PAL.k, shadow: null });
}

function drawBar(c, x, y, w, h, frac, col, back) {
  pxRect(c, x - 1, y - 1, w + 2, h + 2, PAL.k);
  pxRect(c, x, y, w, h, back || '#4a2a3a');
  pxRect(c, x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, frac)))), h, col);
  pxRect(c, x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, frac)))), 1, mixColor(col, '#ffffff', 0.4));
}

// ---------- effects engine ----------

const FX = { list: [], parts: [], floats: [], tweens: [], shakeMag: 0, shakeT: 0, flashColor: '#ffffff', flashA: 0 };

const easeOut = k => 1 - (1 - k) * (1 - k);
const easeIn = k => k * k;
const linear = k => k;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function fxRun(dur, draw) {
  return new Promise(res => FX.list.push({ t: 0, dur, draw, res }));
}

function tween(obj, props, ms, ease) {
  return new Promise(res => {
    const from = {};
    for (const k in props) from[k] = obj[k];
    FX.tweens.push({ obj, from, to: props, t: 0, ms: Math.max(1, ms), ease: ease || easeOut, res });
  });
}

function particles(x, y, n, o) {
  o = Object.assign({ colors: ['#ffffff'], speed: 60, grav: 80, life: 0.5, size: 2, dir: null, spread: Math.PI * 2 }, o);
  for (let i = 0; i < n; i++) {
    const a = o.dir === null ? Math.random() * Math.PI * 2 : o.dir + (Math.random() - 0.5) * o.spread;
    const s = o.speed * (0.4 + Math.random() * 0.8);
    const life = o.life * (0.6 + Math.random() * 0.6);
    FX.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: o.grav, life, max: life,
      color: o.colors[Math.floor(Math.random() * o.colors.length)], size: o.size,
    });
  }
}

function floatText(x, y, str, color, scale) {
  FX.floats.push({ x, y, str: String(str), color, scale: scale || 1, t: 0, dur: 950 });
}

function shake(mag, ms) {
  FX.shakeMag = Math.max(FX.shakeMag, mag);
  FX.shakeT = Math.max(FX.shakeT, ms);
}

function screenFlash(color, a) {
  FX.flashColor = color;
  FX.flashA = a === undefined ? 0.8 : a;
}

function updateFx(dt) {
  const ms = dt * 1000;
  for (let i = FX.tweens.length - 1; i >= 0; i--) {
    const tw = FX.tweens[i];
    tw.t += ms;
    const k = Math.min(1, tw.t / tw.ms);
    const e = tw.ease(k);
    for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e;
    if (k >= 1) { FX.tweens.splice(i, 1); tw.res(); }
  }
  for (let i = FX.list.length - 1; i >= 0; i--) {
    const f = FX.list[i];
    f.t += ms;
    if (f.t >= f.dur) { FX.list.splice(i, 1); f.res(); }
  }
  for (let i = FX.parts.length - 1; i >= 0; i--) {
    const p = FX.parts[i];
    p.life -= dt;
    if (p.life <= 0) { FX.parts.splice(i, 1); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = FX.floats.length - 1; i >= 0; i--) {
    FX.floats[i].t += ms;
    if (FX.floats[i].t >= FX.floats[i].dur) FX.floats.splice(i, 1);
  }
  if (FX.shakeT > 0) { FX.shakeT -= ms; if (FX.shakeT <= 0) FX.shakeMag = 0; }
  FX.flashA = Math.max(0, FX.flashA - dt * 3);
}

function drawFx(c) {
  for (const f of FX.list) f.draw(c, Math.min(1, f.t / f.dur));
  for (const p of FX.parts) {
    if (p.life < p.max * 0.25 && Math.random() < 0.4) continue;
    pxRect(c, p.x, p.y, p.size, p.size, p.color);
  }
  for (const f of FX.floats) {
    const k = f.t / f.dur;
    drawText(c, f.str, f.x, f.y - easeOut(Math.min(1, k * 1.6)) * 14, { color: f.color, scale: f.scale, align: 'center' });
  }
}

function clearFx() {
  for (const f of FX.list) f.res();
  for (const tw of FX.tweens) tw.res();
  FX.list.length = 0; FX.tweens.length = 0; FX.parts.length = 0; FX.floats.length = 0;
  FX.shakeMag = 0; FX.shakeT = 0; FX.flashA = 0;
}
