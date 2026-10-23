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
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    let col = t < 0.5 ? mixColor(S.top, S.mid, t * 2) : mixColor(S.mid, S.bot, (t - 0.5) * 2);
    if (scene === 'volcano') col = mixColor(col, '#7a2a2a', 0.35);
    if (scene === 'sky' && ti < 3) col = mixColor(col, '#ffe9a8', 0.18);
    pxRect(c, 0, i * bandH, W, bandH, col);
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
  village(c) { pxRect(c, 63, GROUND - 11, 5, 4, '#ffd36a'); pxRect(c, 93, GROUND - 13, 5, 4, '#ffd36a'); pxRect(c, 161, GROUND - 22, 3, 3, '#ffd36a'); },
  marine(c) { pxRect(c, 149, 66, 10, 12, '#ffd36a'); },
  desert(c) { pxRect(c, 150, 88, 10, 14, '#ffb84a'); pxCircle(c, 155, 88, 5, '#ffb84a'); },
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
  if (scene === 'reef') {
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.3 + i / 6) % 1);
      pxRect(c, 20 + i * 14 + Math.sin(k * 8) * 2, GROUND - 2 - k * 28, 2, 2, '#d8f4ff');
    }
  }
}

// ---------- ship ----------

function drawShip(c, x, y, up) {
  up = up || {};
  for (let i = 0; i < 8; i++) pxRect(c, x + i, y - 8 + i, 36 - i * 2, 1, i < 2 ? '#8a5a32' : '#6a4422');
  if (up.cannon) { pxRect(c, x + 26, y - 7, 9, 3, '#1b1424'); pxRect(c, x + 33, y - 7, 2, 3, '#4a4a5a'); }
  pxRect(c, x - 2, y - 9, 40, 2, '#5a3818');
  pxRect(c, x + 2, y - 6, 30, 1, '#c99a5a');
  pxRect(c, x + 17, y - 36, 2, 28, '#5a3818');
  pxRect(c, x + 7, y - 31, 22, 17, '#f4efe1');
  pxRect(c, x + 7, y - 16, 22, 2, '#d8d0bc');
  if (up.sails) { pxRect(c, x + 7, y - 31, 22, 2, '#d63c2f'); pxRect(c, x + 7, y - 18, 22, 2, '#d63c2f'); }
  if (up.galley) { pxRect(c, x + 4, y - 14, 3, 5, '#5a3818'); pxRect(c, x + 4, y - 17 - Math.round(Date.now() / 300) % 3, 2, 2, '#dfe2ea'); }
  // straw-hat jolly roger
  const sx = x + 15, sy = y - 27;
  pxRect(c, sx, sy, 6, 1, '#f4c542');
  pxRect(c, sx - 1, sy + 1, 8, 1, '#d63c2f');
  pxRect(c, sx + 1, sy + 2, 4, 4, '#1b1424');
  pxRect(c, sx + 2, sy + 3, 1, 1, '#f4efe1');
  pxRect(c, sx + 4, sy + 3, 1, 1, '#f4efe1');
  pxRect(c, sx + 2, sy + 6, 3, 1, '#1b1424');
  pxLine(c, sx - 2, sy + 4, sx + 8, sy + 9, '#1b1424');
  pxLine(c, sx + 8, sy + 4, sx - 2, sy + 9, '#1b1424');
  pxRect(c, x + 19, y - 38, 7, 4, '#1b1424');
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
