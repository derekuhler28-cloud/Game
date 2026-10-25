'use strict';
/* The original moves, redrawn as the One Piece techniques they are named after: the Rubber (Gum-Gum),
   Flame, Frost, Quake, Smoke, Light, Dough, Split, Magma, String and Paw fruit moves, the plain fists,
   the first weapon moves, and Armament and Conqueror's Haki. They take the place of the old cases in
   fxPlayer's switch (MOVE_FX runs first). Each move keeps its hit count and lands every hit at the
   moment it visibly connects. */
{
  // ---------- palettes (outline, body, shade, light) ----------

  const INK = '#1b1424';
  const EMBER = ['#ff5a2a', '#ff9a3a', '#ffd04a', '#fff3a0'];
  const FLAME_L = [['#a8200f', 1.2], ['#ff5a2a', 1], ['#ff9a3a', 0.72], ['#ffd04a', 0.45], ['#fff6c8', 0.2]];
  const TONGUE = ['#c8301a', '#ff8a2a', '#ffe08a'];
  const FIREFIST = ['#8a1a0a', '#ff9a3a', '#ff5a2a', '#fff3a0'];
  const SMK = ['#8a90a0', '#b9bdc9', '#e4e6ee', '#ffffff'];
  const SMK_DIM = ['#6a7080', '#8a90a0', '#aab0bc', '#c9ccd6'];
  const SMOKEFIST = ['#7a8090', '#e4e6ee', '#b9bdc9', '#ffffff'];
  const DSMK = ['#140e18', '#2a2430', '#3e3644', '#5a5260'];
  const ICEC = ['#2a6fa8', '#5fd3f0', '#bff2ff', '#ffffff'];
  const ICEP = ['#5fd3f0', '#bff2ff', '#ffffff'];
  const LITE = ['#ffd04a', '#fff3a0', '#ffffff'];
  const DOUGH = ['#8a6a3a', '#efe2c8', '#c9a26a', '#fffaf0'];
  const DOUGHB = ['#8a6a3a', '#c9a26a', '#efe2c8', '#fffaf0'];
  const MAGMA = ['#1a0604', '#5a1a10', '#3a0c08', '#ff8a2a'];
  const HAKIC = ['#05030a', '#1b1424', '#0b0812', '#8a7aaa'];
  const HAKI_T = ['#0b0812', '#3a1430', '#d8432f'];
  const SANDC = ['#e8c27b', '#c9963b', '#f5d79a'];
  const DIRT = ['#c9b88a', '#e8d9b0', '#9a8a6a'];
  const STR = ['#ff5a5a', '#ffd04a', '#7cff7a', '#7cd0ff', '#e88aff'];

  // ---------- small helpers ----------

  const k01 = v => Math.max(0, Math.min(1, v));
  const hash = n => { const s = Math.sin(n * 91.345 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const once = fn => { let done = false; return () => { if (!done) { done = true; fn(); } }; };
  const skin = () => { const s = heroSpec(); return (s && s.pal && s.pal.s) || PAL.s; };
  const LIMB = new Map();
  const limbCols = () => {
    const s = skin();
    if (!LIMB.has(s)) LIMB.set(s, [INK, s, mixColor(s, INK, 0.3), mixColor(s, '#ffffff', 0.45)]);
    return LIMB.get(s);
  };
  const shoulder = () => ({ x: G.hero.x + G.hero.ox + 8, y: 106 + G.hero.oy });
  const backShoulder = () => ({ x: G.hero.x + G.hero.ox - 8, y: 106 + G.hero.oy });
  const gripAt = () => ({ x: G.hero.x + G.hero.ox + 9, y: 106 + G.hero.oy });
  const foeW = () => getSprite(G.battle.F.spr).width * G.battle.F.scale;
  // The near side of the foe, where fists and blades connect.
  const front = () => { const c = foeC(); return { x: c.x - Math.min(14, foeW() * 0.28), y: c.y }; };

  // An effect that keeps drawing until the returned function is called; draw(c, ms) gets its age.
  const layer = draw => {
    const L = { t: 0, dur: 1e9, res: () => {} };
    L.draw = c => draw(c, L.t);
    FX.list.push(L);
    return () => { L.dur = 0; };
  };

  const tintView = (c, col, a) => {
    if (a <= 0) return;
    c.globalAlpha = Math.min(1, a);
    pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, col);
    c.globalAlpha = 1;
  };

  // Redraws the hero (and the foe) on top of an effect, so the effect sits behind them.
  const heroOver = c => {
    const h = G.hero;
    drawSpriteAt(c, heroSprite(), h.x + h.ox, 121 + h.oy, 2, { squash: h.squash + Math.sin(G.t * 5) * 0.02, alpha: h.alpha, shadow: false, flip: !!h.form });
    if (h.alpha > 0.5 && !h.form && !h.swing) drawHeldWeapon(c, h.x + h.ox, 121 + h.oy, 2);
  };
  const foeOver = c => {
    const F = G.battle.F;
    if (F.alpha <= 0 || (F.info.phase2 && F.info.phase2.dragon && F.spr === F.info.phase2.spr)) return;
    let spr = getSprite(F.spr);
    if (F.flash > 0) spr = getSprite(F.spr, 'flash');
    else if (F.freeze > 0) spr = getSprite(F.spr, 'tint', '#7fe8ff');
    else if (F.solid > 0) spr = getSprite(F.spr, 'tint', '#2f6fd0');
    else if (F.tekkai) spr = getSprite(F.spr, 'tint', '#9aa4b1');
    else if (F.phase === 2 && !F.info.phase2) spr = getSprite(F.spr, 'tint', '#ff2020');
    drawSpriteAt(c, spr, F.x + F.ox + Math.round(F.kx || 0), F.y + F.oy - foeLift(), F.scale, { squash: F.squash + Math.sin(G.t * 4) * 0.02, alpha: F.alpha, shadow: false });
  };

  // ---------- shapes ----------

  // Scanline fill of a polygon that is convex along each row.
  function poly(c, P, col) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of P) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    c.fillStyle = col;
    for (let y = Math.round(y0); y <= Math.round(y1); y++) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < P.length; i++) {
        const p = P[i], q = P[(i + 1) % P.length];
        if ((p[1] - y) * (q[1] - y) > 0) continue;
        if (p[1] === q[1]) { lo = Math.min(lo, p[0], q[0]); hi = Math.max(hi, p[0], q[0]); continue; }
        const x = p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
        lo = Math.min(lo, x); hi = Math.max(hi, x);
      }
      if (hi >= lo) c.fillRect(Math.round(lo), y, Math.round(hi) - Math.round(lo) + 1, 1);
    }
  }
  const tri = (c, ax, ay, bx, by, cx, cy, col) => poly(c, [[ax, ay], [bx, by], [cx, cy]], col);
  const polyLine = (c, P, col, t) => { for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; pxLine(c, p[0], p[1], q[0], q[1], col, t || 1); } };

  // Filled ellipse, and an ellipse outline (optionally only the arc a0..a1).
  function oval(c, x, y, rx, ry, col) {
    if (rx < 0.5 || ry < 0.5) return;
    c.fillStyle = col;
    const n = Math.round(ry);
    for (let dy = -n; dy <= n; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      c.fillRect(Math.round(x) - hw, Math.round(y) + dy, hw * 2 + 1, 1);
    }
  }
  function ringE(c, x, y, rx, ry, col, t, a0, a1) {
    t = t || 1; a0 = a0 || 0; a1 = a1 === undefined ? Math.PI * 2 : a1;
    const n = Math.max(12, Math.round((rx + ry) * (t > 1 ? 1.6 : 3) * Math.abs(a1 - a0) / (Math.PI * 2)));
    c.fillStyle = col;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      c.fillRect(Math.round(x + Math.cos(a) * rx - t / 2), Math.round(y + Math.sin(a) * ry - t / 2), t, t);
    }
  }

  // A four-point twinkle.
  function twinkle(c, x, y, r, col) {
    col = col || '#ffffff';
    r = Math.round(r);
    if (r < 1) return;
    pxLine(c, x - r, y, x + r, y, col, 1);
    pxLine(c, x, y - r, x, y + r, col, 1);
    if (r >= 4) { const d = Math.round(r * 0.35); pxLine(c, x - d, y - d, x + d, y + d, col, 1); pxLine(c, x - d, y + d, x + d, y - d, col, 1); }
    if (r >= 3) pxRect(c, x - 1, y - 1, 3, 3, col);
  }

  // Layered round puffs (smoke, cloud, dough): outline, shade, body and a glint, each laid down
  // for every puff before the next so neighbouring puffs merge into one mass. P = [[x, y, r], ...].
  function clouds(c, P, cols) {
    cols = cols || SMK;
    for (const p of P) pxCircle(c, p[0], p[1], p[2] + 1, cols[0]);
    for (const p of P) pxCircle(c, p[0], p[1] + p[2] * 0.15, p[2], cols[1]);
    for (const p of P) pxCircle(c, p[0] - p[2] * 0.12, p[1] - p[2] * 0.15, p[2] * 0.8, cols[2]);
    for (const p of P) if (p[2] > 2.5) pxCircle(c, p[0] - p[2] * 0.35, p[1] - p[2] * 0.42, p[2] * 0.33, cols[3]);
  }

  // A mass of fire: every layer (dark rim to white-hot core) for every blob before the next layer.
  function blaze(c, P, f) {
    f = f === undefined ? 1 : f;
    for (const [col, s] of FLAME_L) for (const q of P) { const r = q.w * s * f; if (r >= 0.8) pxCircle(c, q.x, q.y, r, col); }
  }

  // A licking flame tongue standing on (x, y).
  function tongue(c, x, y, h, w, ph, cols) {
    cols = cols || TONGUE;
    for (let j = 0; j < h; j++) {
      const q = j / h, hw = w / 2 * Math.sqrt(1 - q), cx = x + Math.sin(G.t * 17 + ph + j * 0.35) * q * w * 0.4;
      pxRect(c, cx - hw - 1, y - j, hw * 2 + 2, 1, cols[0]);
      if (hw > 1) pxRect(c, cx - hw * 0.6, y - j, hw * 1.2, 1, cols[1]);
      if (q < 0.5 && hw > 1.5) pxRect(c, cx - hw * 0.25, y - j, hw * 0.5, 1, cols[2]);
    }
  }

  // ---------- bodies: fists, arms, palms ----------

  // A clenched fist centred on (x, y), r = half its height. Knuckles face dir: 1 right, -1 left,
  // 0 up, 2 down. cols = [outline, skin, shade, light]; sq squashes it flat against what it hits.
  function fist(c, x, y, r, dir, cols, sq) {
    cols = cols || limbCols();
    const k = cols[0], s = cols[1], sh = cols[2], hi = cols[3];
    r = Math.max(2, r);
    const side = dir === 1 || dir === -1;
    let w = side ? r * 2.4 : r * 2, h = side ? r * 2 : r * 2.4;
    if (sq) { if (side) { w *= 1 - sq * 0.35; h *= 1 + sq * 0.3; } else { h *= 1 - sq * 0.35; w *= 1 + sq * 0.3; } }
    w = Math.max(4, Math.round(w)); h = Math.max(4, Math.round(h));
    const L = Math.round(x - w / 2), T = Math.round(y - h / 2);
    pxRect(c, L - 1, T, w + 2, h, k);
    pxRect(c, L, T - 1, w, h + 2, k);
    pxRect(c, L, T, w, h, s);
    const sd = Math.max(1, Math.round(h * 0.25));
    pxRect(c, L, T + h - sd, w, sd, sh);
    pxRect(c, L + 1, T, Math.max(1, w - 3), 1, hi);
    const g = Math.max(1, Math.round(r * 0.55)), nf = r >= 5 ? 4 : 3;
    if (side) {
      const gx = dir > 0 ? L + w - g : L;
      for (let i = 1; i < nf; i++) pxRect(c, gx, T + Math.round(h * i / nf), g, 1, k);
      const tw = Math.max(2, Math.round(w * 0.38)), tx = dir > 0 ? L + Math.round(w * 0.2) : L + w - Math.round(w * 0.2) - tw, ty = T + Math.round(h * 0.5);
      pxRect(c, tx, ty, tw, 1, k);
      pxRect(c, tx, ty - 1, tw, 1, hi);
    } else {
      const gy = dir === 0 ? T : T + h - g;
      for (let i = 1; i < nf; i++) pxRect(c, L + Math.round(w * i / nf), gy, 1, g, k);
      const th = Math.max(2, Math.round(h * 0.38)), ty = dir === 0 ? T + Math.round(h * 0.25) : T + h - Math.round(h * 0.25) - th;
      pxRect(c, L + Math.round(w * 0.45), ty, 1, th, k);
    }
  }

  // An arm (or a stretched rubber one) from (x0, y0) to (x1, y1), t px thick, wobbling sideways by wob.
  function limb(c, x0, y0, x1, y1, t, wob, cols) {
    cols = cols || limbCols();
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const n = Math.max(1, Math.ceil(L / 4)), P = [];
    for (let i = 0; i <= n; i++) {
      const q = i / n, w = wob ? wob * Math.sin(q * Math.PI) * Math.sin(q * 11 - G.t * 46) : 0;
      P.push(x0 + dx * q + nx * w, y0 + dy * q + ny * w);
    }
    const run = (col, th, ox, oy) => { for (let i = 2; i < P.length; i += 2) pxLine(c, P[i - 2] + ox, P[i - 1] + oy, P[i] + ox, P[i + 1] + oy, col, th); };
    run(cols[0], t + 2, 0, 0);
    run(cols[1], t, 0, 0);
    if (t >= 3) {
      const sg = ny >= 0 ? 1 : -1, o = Math.max(1, Math.floor((t - 1) / 2));
      run(cols[2], 1, nx * o * sg, ny * o * sg);
      run(cols[3], 1, -nx * o * sg, -ny * o * sg);
    }
  }

  // An open hand thrust at the foe, fingers up and spread; u = finger width. pad adds a paw pad.
  function palm(c, x, y, u, cols, pad) {
    cols = cols || limbCols();
    const w = u * 4 + 3, L = Math.round(x - w / 2), T = Math.round(y - u * 1.2), ph = u * 3 + 1;
    const parts = [[L, T, w, ph]];
    const fl = [2.2, 2.9, 2.7, 2.1];
    for (let i = 0; i < 4; i++) { const h = Math.round(u * fl[i]); parts.push([L + i * (u + 1), T - h, u, h + 1]); }
    parts.push([L - u, T + u, u + 1, u + 1], [L - u * 2, T + Math.round(u * 0.2), u, u + 1]);
    for (const p of parts) pxRect(c, p[0] - 1, p[1] - 1, p[2] + 2, p[3] + 2, cols[0]);
    for (const p of parts) pxRect(c, p[0], p[1], p[2], p[3], cols[1]);
    pxRect(c, L, T + ph - Math.max(1, u), w, Math.max(1, u), cols[2]);
    for (let i = 0; i < 4; i++) pxRect(c, parts[i + 1][0], parts[i + 1][1], u, 1, cols[3]);
    if (pad) {
      oval(c, L + w / 2, T + ph / 2 + 1, w * 0.3, ph * 0.28, '#d87a98');
      oval(c, L + w / 2, T + ph / 2, w * 0.24, ph * 0.2, '#f2a8c0');
      for (let i = 0; i < 4; i++) pxRect(c, parts[i + 1][0], parts[i + 1][1] + 1, u, Math.max(1, u - 1), '#f2a8c0');
    }
  }

  // A blade smear: a filled crescent hugging radius r around (cx, cy) from angle a0 to a1, thick at
  // the leading edge (a1) and thinning to the tail; `cut` (0..1) eats it away from the tail.
  function smear(c, cx, cy, r, w, a0, a1, col, cut) {
    const span = a1 - a0, n = Math.max(6, Math.ceil(Math.abs(span) * r / 1.5)), dk = mixColor(col, INK, 0.45);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (t < (cut || 0)) continue;
      const a = a0 + span * t, ww = Math.max(1, w * Math.pow(t, 0.7)), ca = Math.cos(a), sa = Math.sin(a);
      pxLine(c, cx + ca * (r - ww), cy + sa * (r - ww), cx + ca * r, cy + sa * r, col, 2);
      pxRect(c, cx + ca * (r - ww - 1), cy + sa * (r - ww - 1), 1, 1, dk);
      pxRect(c, cx + ca * (r + 1), cy + sa * (r + 1), 1, 1, '#ffffff');
      if (ww > 3) pxRect(c, cx + ca * r, cy + sa * r, 1, 1, '#ffffff');
    }
  }

  // ---------- weapons ----------

  // The weapon a move uses: the one you hold if it has a fitting shape, otherwise `def`.
  // `shapes` is a list of shapes, or a test on the shape.
  function wpn(def, shapes) {
    const k = G.p && G.p.weapon, w = k && WEAPONS[k];
    const fits = sh => !shapes || (typeof shapes === 'function' ? shapes(sh) : shapes.includes(sh));
    const key = w && w.shape && WEAPON_SHAPES[w.shape] && fits(w.shape) ? k : def;
    return { img: getSprite(weaponSpec(key)), grip: WEAPON_SHAPES[WEAPONS[key].shape].grip };
  }
  // Draws weapon W with its grip at (px, py) and its tip pointing along angle a.
  function drawWpn(c, W, px, py, a, s) {
    s = s || 2;
    const gx = W.grip[0] + 1.5 - W.img.width / 2, gy = W.grip[1] + 1.5 - W.img.height / 2;
    const r = a + Math.PI / 2, ca = Math.cos(r), sa = Math.sin(r);
    drawRot(c, W.img, px - (gx * ca - gy * sa) * s, py - (gx * sa + gy * ca) * s, r, s);
  }
  // Holds weapon W while a move runs. P.a is the blade angle; while P.sw is set a smear follows the
  // blade from P.from to where it is now, eaten away from its tail by P.cut.
  function bladeLayer(W, P, col, R) {
    return layer(c => {
      const g = gripAt();
      if (P.sw) smear(c, g.x, g.y, R || 24, P.w || 8, P.from, P.a, col, P.cut || 0);
      drawWpn(c, W, g.x, g.y, P.a);
      if (P.behind) heroOver(c);
    });
  }

  // ---------- reusable bits of action ----------

  // The shock ring a punch leaves in the air: an upright oval bursting outward from the hit.
  function pow(pos, ms, s, col) {
    s = s || 1;
    return fxRun(ms || 220, (c, k) => {
      if (k > 0.7 && Math.floor(k * 24) % 2) return;
      const e = easeOut(k);
      ringE(c, pos.x + 2 + e * 7 * s, pos.y, (1.5 + e * 3.5) * s, (4 + e * 12) * s, col || '#ffffff', k < 0.45 ? 2 : 1);
    });
  }
  const groundRing = (x, col, r0, r1, ms, t) => fxRun(ms, (c, k) => {
    if (k > 0.75 && Math.floor(k * 24) % 2) return;
    const r = lerp(r0, r1, easeOut(k));
    ringE(c, x, 121, r, r * 0.22, col, t || 1);
  });
  // Motion streaks trailing behind something moving right.
  function streaks(c, x, y, n, len, spread, col) {
    for (let i = 0; i < n; i++) {
      const yy = y + (i - (n - 1) / 2) * spread, l = len * (0.6 + 0.4 * hash(i * 3 + Math.floor(G.t * 20)));
      pxLine(c, x - l, yy, x, yy, col || '#ffffff', 1);
    }
  }
  // A ball of fire blooming out of `pos` and rising away.
  const fireBurst = (pos, R, ms) => fxRun(ms || 480, (c, k) => {
    const e = easeOut(k01(k * 2.2)), fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6, P = [];
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + k * 1.2;
      P.push({ x: pos.x + Math.cos(a) * R * 0.5 * e, y: pos.y + Math.sin(a) * R * 0.38 * e - k * 10, w: R * 0.32 * fade * (0.8 + 0.2 * Math.sin(G.t * 30 + i)) });
    }
    P.push({ x: pos.x, y: pos.y - k * 8, w: R * 0.5 * fade });
    blaze(c, P);
  });
  // A ring of smoke puffs bursting out of `pos`.
  const smokeBurst = (pos, R, ms, cols) => fxRun(ms || 480, (c, k) => {
    const e = easeOut(k), P = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 0.698 + hash(i) * 0.4;
      P.push([pos.x + Math.cos(a) * R * e, pos.y + Math.sin(a) * R * 0.7 * e - k * 8, (3 + R * 0.16) * (1 - k * 0.8)]);
    }
    clouds(c, P, cols);
  });
  // Shards of ice flying out of `pos`, spinning and falling.
  function shatter(pos, n, size, ms, up) {
    const S = Array.from({ length: n }, () => {
      const a = rand(0, Math.PI * 2), sp = rand(40, 120);
      return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (up || 40), r: rand(0, 6.28), vr: rand(-12, 12), s: size * rand(0.6, 1.25) };
    });
    const dur = ms || 650;
    return fxRun(dur, (c, k) => {
      const t = k * dur / 1000;
      for (const q of S) {
        if (k > 0.7 && hash(q.r * 10 + Math.floor(k * 20)) < 0.4) continue;
        const x = pos.x + q.vx * t, y = pos.y + q.vy * t + 170 * t * t, a = q.r + q.vr * t, ca = Math.cos(a), sa = Math.sin(a), s = q.s;
        const P = [[x + ca * s, y + sa * s], [x - sa * s * 0.45, y + ca * s * 0.45], [x - ca * s, y - sa * s], [x + sa * s * 0.45, y - ca * s * 0.45]];
        poly(c, P, ICEC[1]);
        tri(c, P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1], ICEC[2]);
        pxRect(c, P[0][0], P[0][1], 1, 1, '#ffffff');
      }
    });
  }
  // An ice spike standing on (x, y): a lit left face, a shaded right face and a glinting ridge.
  function spike(c, x, y, w, h, lean) {
    if (h < 1) return;
    const tx = x + lean, ty = y - h, l = x - w / 2, r = x + w / 2, m = x + lean * 0.3 + w * 0.08;
    tri(c, l - 1, y + 1, r + 1, y + 1, tx, ty - 1, ICEC[0]);
    tri(c, l, y, m, y, tx, ty, ICEC[2]);
    tri(c, m, y, r, y, tx, ty, ICEC[1]);
    pxLine(c, m, y - 1, tx, ty + 1, '#ffffff', 1);
  }
  // A crystal growing from (x, y) along angle a.
  function crystal(c, x, y, a, L, w) {
    const ca = Math.cos(a), sa = Math.sin(a), tx = x + ca * L, ty = y + sa * L, nx = -sa * w / 2, ny = ca * w / 2;
    tri(c, x + nx * 1.4, y + ny * 1.4, tx + ca, ty + sa, x - nx * 1.4, y - ny * 1.4, ICEC[0]);
    tri(c, x + nx, y + ny, tx, ty, x, y, ICEC[2]);
    tri(c, x, y, tx, ty, x - nx, y - ny, ICEC[1]);
  }

  // Lightning: a jagged path, a cached one that re-rolls a few times a second, and a way to draw it.
  const jag = (x0, y0, x1, y1, n, amp) => {
    const nx = y0 - y1, ny = x1 - x0, l = Math.hypot(nx, ny) || 1, pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const o = rand(-amp, amp); pts.push([lerp(x0, x1, i / n) + nx / l * o, lerp(y0, y1, i / n) + ny / l * o]); }
    pts.push([x1, y1]);
    return pts;
  };
  const flicker = make => { let tick = -1, v; return () => { const t = Math.floor(G.t * 18); if (t !== tick) { tick = t; v = make(); } return v; }; };
  const zap = (c, pts, w, outer, inner) => {
    for (let i = 1; i < pts.length; i++) pxLine(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], outer, w + 2);
    for (let i = 1; i < pts.length; i++) pxLine(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], inner, w);
  };

  // Whitebeard's quake bubble: a trembling sphere of white around a fist.
  function quakeBall(c, x, y, r) {
    const jx = rand(-1, 1), jy = rand(-1, 1);
    c.globalAlpha = 0.35;
    pxCircle(c, x + jx, y + jy, r, '#dff4ff');
    c.globalAlpha = 1;
    pxRing(c, x + jx, y + jy, r, '#ffffff', 1);
    pxRing(c, x - jx, y - jy, r + 1.5, '#9ad0ff', 1);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + G.t * 7;
      pxLine(c, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + 0.35) * (r + 3), y + Math.sin(a + 0.35) * (r + 3), '#ffffff', 1);
    }
  }
  // A spider-web of cracks in the air around (x, y), as if the air itself were glass.
  function makeCracks(x, y, R, n) {
    const arms = [];
    for (let i = 0; i < n; i++) {
      let a = (i + rand(-0.3, 0.3)) / n * Math.PI * 2, r = 0;
      const pts = [[x, y]], len = R * rand(0.7, 1.15);
      while (r < len) { r += rand(4, 8); a += rand(-0.22, 0.22); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      arms.push(pts);
    }
    const links = [];
    for (const f of [0.3, 0.6, 0.85]) {
      for (let i = 0; i < n; i++) {
        if (Math.random() < 0.3) continue;
        const A = arms[i], B = arms[(i + 1) % n], pa = A[Math.round(f * (A.length - 1))], pb = B[Math.round(f * (B.length - 1))];
        links.push({ f, pts: [pa, [(pa[0] + pb[0]) / 2 + rand(-2, 2), (pa[1] + pb[1]) / 2 + rand(-2, 2)], pb] });
      }
    }
    return { arms, links };
  }
  function drawCracks(c, CR, k, glow) {
    const seg = (pts, upto, col, t, o) => { for (let i = 1; i <= upto && i < pts.length; i++) pxLine(c, pts[i - 1][0] + o, pts[i - 1][1] + o, pts[i][0] + o, pts[i][1] + o, col, t); };
    if (glow > 0) {
      c.globalAlpha = glow * 0.55;
      for (const p of CR.arms) seg(p, Math.floor((p.length - 1) * k), '#bfe6ff', 3, 0);
      c.globalAlpha = 1;
    }
    for (const p of CR.arms) seg(p, Math.floor((p.length - 1) * k), '#2a3048', 1, 1);
    for (const p of CR.arms) seg(p, Math.floor((p.length - 1) * k), '#ffffff', 1, 0);
    for (const L of CR.links) if (k > L.f) { seg(L.pts, 2, '#2a3048', 1, 1); seg(L.pts, 2, '#ffffff', 1, 0); }
  }

  // Light: a streak between two points, a bullet of light, and the pop where one lands.
  const lightStreak = (a, b, ms, w) => fxRun(ms, (c, k) => {
    const ww = Math.max(1, Math.round(w * (1 - k)));
    pxLine(c, a.x, a.y, b.x, b.y, '#ffd04a', ww + 2);
    pxLine(c, a.x, a.y, b.x, b.y, '#ffffff', ww);
    if (Math.random() < 0.7) { const t = Math.random(); particles(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 1, { colors: LITE, speed: 20, grav: 0, life: 0.3 }); }
  });
  const lightBullet = (from, to, ms) => fxRun(ms, (c, k) => {
    const x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k), t = Math.max(0, k - 0.4);
    pxLine(c, lerp(from.x, to.x, t), lerp(from.y, to.y, t), x, y, '#ffd04a', 3);
    pxLine(c, lerp(from.x, to.x, t), lerp(from.y, to.y, t), x, y, '#ffffff', 1);
    pxCircle(c, x, y, 2, '#ffffff');
  });
  const lightPop = (pos, s) => fxRun(300, (c, k) => {
    const e = easeOut(k);
    if (k < 0.4) { pxCircle(c, pos.x, pos.y, (7 - k * 12) * s, '#fff3a0'); pxCircle(c, pos.x, pos.y, (5 - k * 10) * s, '#ffffff'); }
    pxRing(c, pos.x, pos.y, (3 + e * 12) * s, k < 0.5 ? '#ffffff' : '#ffd04a', 1);
    twinkle(c, pos.x, pos.y, (3 + 8 * (1 - k)) * s, k < 0.5 ? '#ffffff' : '#fff3a0');
  });

  // ---------- props ----------

  // A round bomb with a skull on it and a sparking fuse.
  function drawBomb(c, x, y, r, col, spark) {
    pxCircle(c, x, y, r + 1, INK);
    pxCircle(c, x, y, r, col);
    pxCircle(c, x + r * 0.25, y + r * 0.3, r * 0.6, mixColor(col, '#000000', 0.35));
    pxCircle(c, x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.3), mixColor(col, '#ffffff', 0.45));
    // a little skull and crossbones
    pxRect(c, x - 2, y - 1, 4, 3, '#f2f2f2');
    pxRect(c, x - 1, y, 1, 1, INK); pxRect(c, x + 1, y, 1, 1, INK);
    pxRect(c, x - 3, y + 3, 1, 1, '#f2f2f2'); pxRect(c, x + 3, y + 3, 1, 1, '#f2f2f2');
    // the fuse
    pxRect(c, x - 1, y - r - 2, 3, 2, '#9aa4b1');
    pxLine(c, x, y - r - 2, x + 2, y - r - 5, '#c9b88a', 1);
    if (spark) {
      twinkle(c, x + 2, y - r - 6, 2 + Math.round(Math.random() * 2), Math.random() < 0.5 ? '#ffd04a' : '#ffffff');
      if (Math.random() < 0.6) particles(x + 2, y - r - 6, 1, { colors: EMBER, speed: 40, grav: 60, life: 0.25, size: 1 });
    }
  }
  // A big explosion: a fireball with a ring of dark smoke rolling out and up.
  const explode = (pos, R, ms) => fxRun(ms, (c, k) => {
    const e = easeOut(k01(k * 2.4)), fade = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, P = [];
    for (let i = 0; i < 10; i++) {
      const a = i * 0.628 + k * 0.8;
      P.push([pos.x + Math.cos(a) * R * 0.85 * e, pos.y - 4 + Math.sin(a) * R * 0.5 * e - k * 16, (4 + R * 0.2) * (0.5 + 0.5 * fade)]);
    }
    if (k > 0.12) clouds(c, P, DSMK);
    const F = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + G.t * 3;
      F.push({ x: pos.x + Math.cos(a) * R * 0.35 * e, y: pos.y - 4 + Math.sin(a) * R * 0.3 * e - k * 14, w: R * 0.3 * fade * (0.8 + 0.2 * Math.sin(G.t * 30 + i)) });
    }
    F.push({ x: pos.x, y: pos.y - 6 - k * 14, w: R * 0.55 * fade });
    blaze(c, F);
  });

  // ---------- the moves ----------

  Object.assign(MOVE_FX, {

    // ===== Fists =====

    // Plain fists (and every punch-style weapon): step in, snap a jab into the foe, hop back out.
    punch: async m => {
      const H = G.hero, acc = m.color || '#ffe14a';
      await tween(H, { ox: -4, squash: 0.12 }, 80);
      dust(H.x - 4, 4);
      const lines = fxRun(200, (c, k) => { const hc = heroC(); c.globalAlpha = 1 - k; streaks(c, hc.x - 12, hc.y, 4, 18, 6); c.globalAlpha = 1; });
      await tween(H, { ox: 46, squash: -0.06 }, 110, easeIn);
      const tgt = front();
      const w = G.p && G.p.weapon && WEAPONS[G.p.weapon];
      const land = once(() => {
        m.hit(0);
        impact(tgt, ['#ffffff', acc], 10);
        pow(tgt, 220, 1);
        shake(2, 120);
        if (w && w.shape === 'gauntlet') particles(tgt.x, tgt.y, 10, { colors: FIRE, speed: 70, grav: -40, life: 0.4 });
      });
      await fxRun(240, (c, k) => {
        const s = shoulder(), e = k < 0.28 ? easeOut(k / 0.28) : 1 - easeIn((k - 0.28) / 0.72) * 0.8;
        const x = lerp(s.x + 3, tgt.x, e), y = lerp(s.y, tgt.y, e);
        if (k < 0.4) streaks(c, x - 6, y, 3, 14, 3);
        limb(c, s.x, s.y, x - 3, y, 3, 0);
        fist(c, x, y, 3, 1, null, k > 0.28 && k < 0.42 ? 0.6 : 0);
        if (k >= 0.28) land();
      });
      land();
      await lines;
      await tween(H, { ox: 18, oy: -5, squash: 0 }, 120);
      await tween(H, { ox: 0, oy: 0 }, 130, easeIn);
      dust(H.x, 3);
    },

    // Fury Rush: a dash, a blur of phantom fists, and real jabs landing in it, the last an uppercut.
    rush: async m => {
      const H = G.hero, F = G.battle.F, acc = m.color || '#ffe14a', pale = mixColor(skin(), '#ffffff', 0.5);
      await tween(H, { ox: -4, squash: 0.12 }, 90);
      dust(H.x - 4, 5);
      await tween(H, { ox: 42, squash: -0.04 }, 120, easeIn);
      const blur = layer((c, t) => {
        const s = shoulder(), fr = front(), tick = Math.floor(t / 40);
        c.globalAlpha = 0.5;
        for (let j = 0; j < 4; j++) {
          const x = fr.x - 3 + hash(tick * 5 + j) * 7, y = fr.y - 13 + hash(tick * 9 + j * 3 + 1) * 26;
          pxLine(c, s.x, s.y - 3 + j * 2, x - 3, y, pale, 3);
          pxCircle(c, x, y, 3, pale);
        }
        c.globalAlpha = 0.8;
        for (let j = 0; j < 3; j++) { const y = fr.y - 10 + hash(tick * 3 + j * 7) * 20; pxLine(c, fr.x - 26, y, fr.x - 8, y, '#ffffff', 1); }
        c.globalAlpha = 1;
      });
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const last = i === m.hits - 1 && m.hits > 1, fr = front();
        H.ox = 40 + (i % 2) * 6;
        const p = { x: fr.x + rand(-1, 3), y: fr.y + (last ? -4 : i % 2 ? -8 : 5) }, low = { x: p.x - 4, y: p.y + 16 };
        if (last) tween(H, { oy: -6, squash: -0.1 }, 90);
        const land = once(() => {
          m.hit(i);
          impact(p, ['#ffffff', acc], last ? 14 : 8);
          pow(p, 180, last ? 1.3 : 0.8);
          shake(last ? 4 : 2, last ? 200 : 90);
          if (last) tween(F, { oy: -8 }, 90).then(() => tween(F, { oy: 0 }, 170, easeIn));
        });
        await fxRun(150, (c, k) => {
          const s = shoulder(), e = easeOut(k01(k * 2.6));
          const x = last ? lerp(low.x, p.x, e) : lerp(s.x + 3, p.x, e), y = last ? lerp(low.y, p.y, e) : lerp(s.y, p.y, e);
          if (k < 0.5) last ? pxLine(c, x, y + 6, x, y + 18, '#ffffff', 1) : streaks(c, x - 6, y, 3, 12, 3);
          limb(c, s.x, s.y, x, y + (last ? 3 : 0), 3, 0);
          fist(c, x, y, 3, last ? 0 : 1);
          if (k >= 0.38) land();
        });
        land();
      }
      blur();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Haymaker: the arm winds round like a windmill, then one huge blow that shakes the ground.
    haymaker: async m => {
      const H = G.hero, F = G.battle.F;
      Sfx.play('charge');
      tween(H, { ox: -10, squash: 0.18 }, 320);
      await fxRun(560, (c, k) => {
        const s = { x: H.x + H.ox - 1, y: 102 + H.oy }, a = Math.PI + easeIn(k) * Math.PI * 4, r = 11;
        for (let j = 6; j >= 1; j--) {
          const b = a - j * 0.26, sz = j < 3 ? 3 : 2;
          pxRect(c, s.x + Math.cos(b) * r - 1, s.y + Math.sin(b) * r - 1, sz, sz, j < 3 ? '#ffffff' : '#ffe08a');
        }
        const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
        limb(c, s.x, s.y, x, y, 3, 0);
        fist(c, x, y, 3, Math.cos(a) >= 0 ? 1 : -1);
        if (k > 0.7) twinkle(c, x, y - 5, 2 + Math.round((k - 0.7) * 10), '#fff3a0');
      });
      dust(H.x - 10, 8);
      await tween(H, { ox: 54, squash: -0.12 }, 110, easeIn);
      const tgt = front();
      const land = once(() => {
        m.hit(0);
        Sfx.play('boom');
        focusLines(tgt, '#ffffff', 280);
        impact(tgt, ['#ffffff', '#ffe14a', '#ff8a3a'], 20);
        screenFlash('#fff6c8', 0.3);
        pow(tgt, 300, 1.6);
        pow({ x: tgt.x + 6, y: tgt.y }, 400, 2.3, '#ffe14a');
        groundRing(fc0().x, '#ffffff', 6, 36, 420, 1);
        dust(fc0().x, 12);
        shake(6, 360);
        tween(F, { ox: 12, squash: -0.08 }, 110).then(() => tween(F, { ox: 0, squash: 0 }, 300));
      });
      await fxRun(320, (c, k) => {
        const s = shoulder(), e = easeOut(k01(k * 3.5)), x = lerp(s.x, tgt.x, e), y = lerp(s.y - 2, tgt.y, e);
        if (k < 0.5) streaks(c, x - 8, y, 5, 24, 3, k < 0.25 ? '#ffffff' : '#ffe08a');
        limb(c, s.x, s.y, x - 4, y, 4, 0);
        fist(c, x, y, 5, 1, null, k > 0.28 && k < 0.5 ? 0.5 : 0);
        if (k >= 0.28) land();
      });
      land();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 260);
    },

    // ===== Rubber-Rubber Fruit =====

    // Gum-Gum Pistol: the arm stretches way back behind you, then snaps forward like a slingshot.
    arm: async m => {
      const H = G.hero, A = { x: 0, y: 0, wob: 0, back: true, abs: false, fly: false };
      Sfx.play('stretch');
      const draw = layer(c => {
        const s = A.back ? backShoulder() : shoulder(), x = A.abs ? A.x : s.x + A.x, y = A.abs ? A.y : s.y + A.y;
        if (A.fly) streaks(c, x - 6, y, 3, 30, 4);
        limb(c, s.x, s.y, x, y, 3, A.wob);
        fist(c, x, y, 3, x < s.x - 2 ? -1 : 1);
        if (A.back) heroOver(c);
      });
      tween(H, { ox: -5, squash: 0.1 }, 260);
      await tween(A, { x: -32, y: -5, wob: 1.5 }, 260, easeOut);
      await wait(80);
      const b = backShoulder(), tgt = front();
      Object.assign(A, { back: false, abs: true, fly: true, wob: 0, x: b.x + A.x, y: b.y + A.y });
      tween(H, { ox: 3, squash: -0.06 }, 110, easeIn);
      await tween(A, { x: tgt.x, y: tgt.y }, 120, easeIn);
      A.fly = false;
      m.hit(0);
      impact(tgt, ['#ffffff', '#ffe14a'], 12);
      pow(tgt, 240, 1.2);
      shake(3, 160);
      await wait(90);
      Sfx.play('stretch');
      const s = shoulder();
      await tween(A, { x: s.x + 2, y: s.y, wob: 3 }, 190, easeIn);
      draw();
      await tween(H, { ox: 0, oy: 0, squash: 0.14 }, 70);
      await tween(H, { squash: 0 }, 120);
    },

    // Gum-Gum Gatling: feet planted, a storm of rubber fists blurs into the foe.
    gatling: async m => {
      const H = G.hero, pale = mixColor(skin(), '#ffffff', 0.5);
      Sfx.play('stretch');
      await tween(H, { ox: 6, squash: 0.14 }, 160);
      const storm = layer((c, t) => {
        const s = shoulder(), fr = front();
        c.globalAlpha = 0.45;
        for (let j = 0; j < 9; j++) {
          const ph = t / 90 + j * 0.37, cyc = Math.floor(ph), e = Math.sin((ph - cyc) * Math.PI);
          const tx = fr.x - 4 + hash(cyc * 3 + j) * 10, ty = fr.y - 18 + hash(cyc * 7 + j * 5) * 34;
          const x = lerp(s.x, tx, e), y = lerp(s.y + (j % 3) - 1, ty, e);
          pxLine(c, s.x, s.y + (j % 3) - 1, x, y, pale, 3);
          pxCircle(c, x, y, 3, pale);
        }
        c.globalAlpha = 1;
        for (let j = 0; j < 3; j++) {
          const ph = t / 75 + j / 3, cyc = Math.floor(ph), e = Math.sin((ph - cyc) * Math.PI);
          const tx = fr.x - 2 + hash(cyc * 11 + j) * 6, ty = fr.y - 14 + hash(cyc * 13 + j * 3) * 28;
          const x = lerp(s.x + 2, tx, e), y = lerp(s.y, ty, e);
          if (e > 0.6) streaks(c, x - 6, y, 2, 12, 4);
          limb(c, s.x, s.y, x - 2, y, 3, 0);
          fist(c, x, y, 3, 1);
        }
      });
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        await wait(i ? 150 : 120);
        const fr = front(), p = { x: fr.x + rand(-2, 4), y: fr.y + rand(-14, 12) };
        m.hit(i);
        impact(p, ['#ffffff', '#ffe14a'], 7);
        pow(p, 160, 0.7);
        shake(2, 100);
        if (i % 2) Sfx.play('stretch');
      }
      await wait(160);
      storm();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
    },

    // Gum-Gum Bazooka: both arms stretch far behind you, quiver, then two palms slam the foe away.
    bazooka: async m => {
      const H = G.hero, F = G.battle.F, A = { x: 0, wob: 0, back: true, abs: false, fly: false };
      const roots = () => { const x = H.x + H.ox + (A.back ? -7 : 7); return [{ x, y: 103 + H.oy }, { x, y: 108 + H.oy }]; };
      Sfx.play('stretch');
      const arms = layer(c => {
        const R = roots();
        for (let i = 0; i < 2; i++) {
          const r = R[i], x = A.abs ? A.x : r.x + A.x, y = r.y + (i ? 5 : -6) * Math.min(1, Math.abs(x - r.x) / 20);
          if (A.fly) streaks(c, x - 8, y, 3, 34, 4);
          limb(c, r.x, r.y, x, y, 3, A.wob * (i ? -1 : 1));
          palm(c, x, y, 2);
        }
        if (A.back) heroOver(c);
      });
      tween(H, { ox: -9, squash: 0.16 }, 380);
      await tween(A, { x: -56, wob: 3 }, 440, easeOut);
      Sfx.play('charge');
      dust(H.x - 10, 8);
      await fxRun(260, () => { A.wob = 2 + Math.sin(G.t * 60) * 2; });
      const R = roots(), tgt = front();
      Object.assign(A, { back: false, abs: true, fly: true, wob: 0, x: R[0].x + A.x });
      tween(H, { ox: 6, squash: -0.1 }, 140, easeIn);
      await tween(A, { x: tgt.x - 2 }, 140, easeIn);
      A.fly = false;
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 0.55);
      focusLines(tgt, '#ffffff', 340);
      impact(tgt, ['#ffffff', '#ffe14a', '#ff8a3a'], 22);
      pow(tgt, 300, 1.8);
      pow({ x: tgt.x + 4, y: tgt.y }, 420, 2.6, '#ffe14a');
      groundRing(fc0().x, '#ffffff', 8, 44, 500, 2);
      dust(fc0().x, 14);
      shake(8, 480);
      tween(F, { ox: 22, oy: -8, squash: -0.12 }, 150).then(() => tween(F, { ox: 0, oy: 0, squash: 0 }, 330, easeIn));
      await wait(230);
      Sfx.play('stretch');
      A.abs = false;
      A.x -= roots()[0].x;
      await tween(A, { x: 4, wob: 4 }, 220, easeIn);
      arms();
      await tween(H, { ox: 0, oy: 0, squash: 0.12 }, 120);
      await tween(H, { squash: 0 }, 120);
    },

    // ===== Flame-Flame Fruit =====

    // Fire Fist: flames swallow your fist, and the punch throws a giant fist of fire.
    fireball: async m => {
      const H = G.hero, tgt = front();
      Sfx.play('fire');
      tween(H, { ox: -6, squash: 0.12 }, 260);
      await fxRun(320, (c, k) => {
        const h = heroHand();
        for (let i = 0; i < 3; i++) tongue(c, h.x - 4 + i * 4, h.y + 4, 3 + k * 9 + (i % 2) * 3, 5, i * 1.9);
        fist(c, h.x + 1, h.y, 3, 1, FIREFIST);
        if (Math.random() < 0.7) particles(h.x, h.y - 4, 1, { colors: EMBER, speed: 25, grav: -70, life: 0.45 });
      });
      Sfx.play('fire');
      tween(H, { ox: 10, squash: -0.08 }, 100, easeIn);
      const from = heroHand(), to = { x: tgt.x + 2, y: tgt.y };
      const land = once(() => {
        m.hit(0);
        Sfx.play('boom');
        fireBurst(to, 28, 540);
        impact(to, ['#ffffff', '#ffd04a', '#ff5a2a'], 14);
        particles(to.x, to.y, 22, { colors: EMBER, speed: 90, grav: -40, life: 0.6 });
        shake(4, 260);
      });
      await fxRun(300, (c, k) => {
        const e = easeIn(k), hx = lerp(from.x + 6, to.x, e), hy = lerp(from.y, to.y, e), P = [];
        for (let x = from.x; x < hx - 4; x += 2.5) {
          const t = (x - from.x) / Math.max(1, hx - from.x);
          P.push({ x, y: lerp(from.y, hy, t) + Math.sin(x * 0.4 - G.t * 40) * t * 1.5, w: 2 + t * 8 * (1 + Math.sin(x * 0.7 + G.t * 50) * 0.15) });
        }
        P.push({ x: hx, y: hy, w: 11 + Math.sin(G.t * 45) });
        blaze(c, P);
        fist(c, hx + 1, hy, 6, 1, FIREFIST);
        if (Math.random() < 0.8) particles(hx - 6, hy + rand(-6, 6), 1, { colors: EMBER, speed: 30, grav: -60, life: 0.4 });
        if (k >= 0.97) land();
      });
      land();
      await wait(180);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Flame Spray: a roaring jet of fire from the palm engulfs the foe and leaves it burning.
    flamespray: async m => {
      const H = G.hero, fc = fc0(), to = { x: fc.x + 2, y: fc.y + 3 };
      Sfx.play('fire');
      tween(H, { ox: -3, squash: 0.08 }, 200);
      await fxRun(220, (c, k) => {
        const h = heroHand();
        tongue(c, h.x + 1, h.y + 3, 2 + k * 8, 5, 0);
        fist(c, h.x + 1, h.y, 3, 1, FIREFIST);
      });
      tween(H, { ox: 3, squash: -0.04 }, 120);
      Sfx.play('fire');
      const land = once(() => { m.hit(0); impact(to, ['#ffffff', '#ffd04a', '#ff5a2a'], 10); shake(3, 420); });
      await fxRun(860, (c, k) => {
        const h = heroHand(), from = { x: h.x + 4, y: h.y }, reach = Math.min(1, k * 3.2), fade = k > 0.78 ? (1 - k) / 0.22 : 1;
        const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        const P = [];
        for (let s = 0; s < L * reach; s += 2.5) {
          const t = s / L, fl = Math.sin(s * 0.45 - G.t * 45) * 0.5 + Math.sin(s * 0.21 + G.t * 29) * 0.5;
          const w = (1.5 + t * 13) * fade * (1 + fl * 0.25), wob = Math.sin(s * 0.28 - G.t * 34) * (0.5 + t * 3);
          P.push({ x: from.x + ux * s + nx * wob, y: from.y + uy * s + ny * wob - t * t * 3, w });
        }
        if (reach >= 1) for (let i = 0; i < 4; i++) P.push({ x: to.x + 4 + Math.cos(G.t * 9 + i * 1.6) * 8, y: to.y - 4 + Math.sin(G.t * 11 + i * 1.6) * 9, w: 7 * fade });
        blaze(c, P);
        // droplets of flame sprayed off the jet
        if (Math.random() < 0.9 && P.length) {
          const q = P[Math.floor(Math.random() * P.length)];
          FX.parts.push({ x: q.x, y: q.y, vx: ux * 90 + rand(-20, 30), vy: uy * 90 + rand(-50, 10), grav: 40, life: 0.4, max: 0.4, color: pick(EMBER), size: 2 });
        }
        if (reach >= 1) land();
      });
      land();
      const burn = fxRun(500, (c, k) => {
        const f = fc0(), w = foeW() * 0.45;
        for (let i = 0; i < 4; i++) tongue(c, f.x - w + 4 + i * (w * 2 - 8) / 3, f.y + 14 - (i % 2) * 6, (9 + (i % 2) * 5) * (1 - k), 6, i * 2.1);
        if (Math.random() < 0.4) particles(f.x + rand(-8, 8), f.y - 10, 1, { colors: SMK.slice(1), speed: 20, grav: -40, life: 0.6, size: 2 });
      });
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
      await burn;
    },

    // Great Blaze (Flame Commandment: Fire Pillar): a ring of fire marks the ground under the foe,
    // then a pillar of flame erupts out of it all the way to the sky.
    pillar: async m => {
      const H = G.hero, fc = fc0(), x = fc.x;
      Sfx.play('fire');
      tween(H, { oy: -2, squash: -0.1 }, 260);
      const sky = fxRun(2050, (c, k) => tintView(c, '#4a0800', 0.3 * Math.sin(Math.min(1, k * 1.3) * Math.PI)));
      await fxRun(520, (c, k) => {
        const e = easeOut(k), rx = 6 + e * 22, ry = 1.5 + e * 5;
        ringE(c, x, 121, rx + 1, ry + 1, '#a8200f', 1);
        ringE(c, x, 121, rx, ry, '#ff9a3a', 2);
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + G.t * 2.5;
          tongue(c, x + Math.cos(a) * rx, 121 + Math.sin(a) * ry, 2 + e * 6 + Math.sin(G.t * 20 + i) * 1.5, 3, i);
        }
        if (Math.random() < 0.6) particles(x + rand(-rx, rx), 121, 1, { colors: EMBER, speed: 40, grav: -90, dir: -Math.PI / 2, spread: 0.5, life: 0.5 });
      });
      Sfx.play('boom');
      Sfx.play('fire');
      screenFlash('#ff9a3a', 0.6);
      shake(6, 800);
      const land = once(() => { m.hit(0); focusLines(fc, '#ffd04a', 300); impact(fc, ['#ffffff', '#ffd04a', '#ff5a2a'], 18); });
      await fxRun(1050, (c, k) => {
        const rise = easeOut(Math.min(1, k * 3.2)), top = lerp(122, VIEW.y - 12, rise), narrow = k > 0.72 ? 1 - easeIn((k - 0.72) / 0.28) : 1;
        if (rise > 0.45) land();
        if (narrow <= 0.02) return;
        for (const [cl, f] of FLAME_L) {
          for (let y = 123; y > top; y -= 2) {
            const q = (122 - y) / 170, w = (13 + q * 10 + Math.sin(y * 0.17 + G.t * 26) * 2.5) * f * narrow;
            if (w >= 1) pxRect(c, x + Math.sin(y * 0.07 - G.t * 13) * 2.5 - w, y, w * 2, 2, cl);
          }
        }
        const P = [];
        for (let i = 0; i < 12; i++) {
          const ph = (G.t * 1.8 + i / 12) % 1, y = lerp(122, top, ph), sd = i % 2 ? 1 : -1;
          if (y < top + 4) continue;
          P.push({ x: x + sd * (13 + ph * 10) * narrow + Math.sin(G.t * 9 + i) * 2, y, w: 3.5 * (1 - ph) * narrow + 0.5 });
        }
        if (rise >= 1) for (let i = -2; i <= 2; i++) P.push({ x: x + i * 7 * narrow, y: top + 6 + Math.abs(i) * 3, w: (6 - Math.abs(i)) * narrow });
        blaze(c, P);
        if (Math.random() < 0.9) particles(x + rand(-14, 14), rand(top, 120), 1, { colors: EMBER, speed: 50, grav: -100, life: 0.6 });
      });
      land();
      particles(x, 110, 18, { colors: SMK.slice(1), speed: 40, grav: -50, life: 0.9, size: 3 });
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 260);
      await sky;
    },

    // ===== Frost-Frost Fruit =====

    // Ice Spear: cold mist crystallizes into a lance in your hand, and you hurl it.
    icespear: async m => {
      const H = G.hero, tgt = front();
      const lance = (c, x, y, L) => {
        const hx = x + L - 10;
        if (hx > x) {
          pxRect(c, x - 1, y - 2, hx - x + 2, 5, ICEC[0]);
          pxRect(c, x, y - 1, hx - x, 3, ICEC[1]);
          pxRect(c, x, y - 1, hx - x, 1, ICEC[2]);
          for (let xx = x + 3; xx < hx - 2; xx += 6) pxRect(c, xx, y - 1, 1, 3, ICEC[2]);
        }
        tri(c, hx - 1, y - 7, x + L + 2, y, hx - 1, y + 7, ICEC[0]);
        tri(c, hx, y - 6, x + L, y, hx, y, ICEC[2]);
        tri(c, hx, y, x + L, y, hx, y + 6, ICEC[1]);
        pxLine(c, hx + 1, y - 1, x + L - 2, y, '#ffffff', 1);
        pxRect(c, hx - 3, y - 4, 3, 9, ICEC[0]);
        pxRect(c, hx - 2, y - 3, 1, 7, ICEC[2]);
      };
      Sfx.play('ice');
      tween(H, { ox: -4, squash: 0.1 }, 260);
      await fxRun(320, (c, k) => {
        const h = heroHand();
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + G.t * 8, r = 12 * (1 - k) + 3;
          pxRect(c, h.x + 6 + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.6, 1, 1, i % 2 ? '#ffffff' : '#bff2ff');
        }
        lance(c, h.x - 8, h.y - 1, 8 + easeOut(k) * 26);
        if (k > 0.7) twinkle(c, h.x + 24, h.y - 4, 3);
      });
      Sfx.play('slash');
      tween(H, { ox: 8, squash: -0.06 }, 90, easeIn);
      const from = heroHand();
      const land = once(() => {
        m.hit(0);
        Sfx.play('ice');
        shatter(tgt, 9, 3, 600);
        impact(tgt, ['#ffffff', '#bff2ff', '#5fd3f0'], 12);
        particles(tgt.x, tgt.y, 10, { colors: ICEP, speed: 70, grav: 120 });
        // frost crystals cling where it struck, then crack away
        fxRun(420, (c, k) => {
          if (k > 0.7 && Math.floor(k * 20) % 2) return;
          for (let i = 0; i < 5; i++) crystal(c, tgt.x, tgt.y, Math.PI + (i - 2) * 0.55, 6 + (i % 2) * 3, 3);
        });
        shake(3, 180);
      });
      await fxRun(170, (c, k) => {
        const x = lerp(from.x - 8, tgt.x - 32, easeIn(k)), y = lerp(from.y - 1, tgt.y, k);
        c.globalAlpha = 0.6;
        pxLine(c, from.x, from.y - 1, x, y, '#dff8ff', 1);
        c.globalAlpha = 1;
        lance(c, x, y, 34);
        if (Math.random() < 0.8) FX.parts.push({ x: x + rand(0, 10), y: y + rand(-2, 2), vx: rand(-20, 0), vy: rand(-10, 10), grav: 30, life: 0.35, max: 0.35, color: pick(ICEP), size: 1 });
        if (k >= 0.98) land();
      });
      land();
      await wait(200);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Ice Age: a palm to the ground, and a sheet of ice races across the field, spikes bursting
    // up behind it, until it seals the foe inside a block of ice.
    iceage: async m => {
      const H = G.hero, fc = fc0(), x0 = H.x + 4, x1 = fc.x + 36;
      Sfx.play('ice');
      await tween(H, { squash: 0.24, oy: 2 }, 170);
      particles(H.x + 6, 120, 12, { colors: ICEP, speed: 50, grav: -10, life: 0.5 });
      const S = [];
      for (let x = x0 + 8; x < x1; x += rand(5, 9)) S.push({ x, w: rand(4, 7), h: rand(5, 12) * (Math.abs(x - fc.x) < 22 ? 1.5 : 1), lean: rand(-3, 3) });
      const cold = fxRun(1650, (c, k) => tintView(c, '#bfefff', 0.16 * Math.sin(Math.min(1, k * 1.4) * Math.PI)));
      const encase = () => fxRun(900, (c, k) => {
        const f = fc0(), w = foeW() * 0.5 + 5, top = foeTop() - 5, bot = 122, grow = easeOut(k01(k / 0.25)), fade = k > 0.75 ? (1 - k) / 0.25 : 1;
        const y = lerp(bot, top, grow);
        const P = [[f.x - w, bot], [f.x - w - 3, lerp(bot, y, 0.6)], [f.x - w * 0.4, y], [f.x + w * 0.6, y + 3], [f.x + w + 3, lerp(bot, y, 0.5)], [f.x + w, bot]];
        c.globalAlpha = 0.45 * fade;
        poly(c, P, '#bff2ff');
        c.globalAlpha = 0.35 * fade;
        poly(c, [P[0], P[1], P[2], [f.x - w * 0.1, bot]], '#ffffff');
        c.globalAlpha = 0.9 * fade;
        polyLine(c, P, ICEC[1]);
        pxLine(c, P[1][0] + 2, P[1][1] + 2, P[2][0] + 2, P[2][1] + 3, '#ffffff', 1);
        pxLine(c, P[2][0] + 3, P[2][1] + 2, P[3][0] - 2, P[3][1] + 1, '#ffffff', 1);
        c.globalAlpha = 1;
        if (grow >= 1 && Math.random() < 0.25) twinkle(c, f.x + rand(-w, w), rand(top, bot - 8), 2 + Math.round(Math.random() * 2));
      });
      const land = once(() => { m.hit(0); Sfx.play('ice'); screenFlash('#e8fbff', 0.45); shake(3, 220); impact(fc0(), ['#ffffff', '#bff2ff'], 12); encase(); });
      await fxRun(1400, (c, k) => {
        const fr = lerp(x0, x1, easeOut(k01(k / 0.4))), fade = k > 0.82 ? (1 - k) / 0.18 : 1;
        c.globalAlpha = fade;
        pxRect(c, x0 - 4, 118, fr - x0 + 4, 6, ICEC[0]);
        pxRect(c, x0 - 4, 119, fr - x0 + 4, 4, ICEC[1]);
        pxRect(c, x0 - 4, 119, fr - x0 + 4, 1, '#ffffff');
        for (let xx = x0; xx < fr - 6; xx += 11) pxRect(c, xx + 3, 121, 4, 1, ICEC[2]);
        for (const s of S) { if (s.x > fr) break; spike(c, s.x, 120, s.w, s.h * k01((fr - s.x) / 12), s.lean); }
        if (k < 0.45) for (let i = 0; i < 4; i++) pxCircle(c, fr - i * 3, 115 - (i % 2) * 3, 3 - i * 0.5, i % 2 ? '#ffffff' : '#dff8ff');
        c.globalAlpha = 1;
        if (fr >= fc.x - 4) land();
      });
      land();
      await tween(H, { squash: 0, oy: 0, ox: 0 }, 160);
      await cold;
    },

    // Glacier Drop: snow begins to fall, a shadow spreads, and a mountain of ice drops on the foe
    // and bursts into shards.
    glacier: async m => {
      const H = G.hero, F = G.battle.F, fc = fc0(), gx = fc.x, s = 1.45;
      const B = { out: [[-22, 0], [-27, -16], [-17, -38], [2, -46], [21, -34], [25, -12], [19, 0]],
        lit: [[-22, 0], [-27, -16], [-17, -38], [-6, -24], [-9, 0]],
        dark: [[2, -46], [21, -34], [25, -12], [19, 0], [8, 0], [6, -26]],
        top: [[-17, -38], [2, -46], [6, -26], [-6, -24]] };
      const berg = (c, x, y, cr) => {
        const T = P => P.map(p => [x + p[0] * s, y + p[1] * s]), O = T(B.out);
        poly(c, O.map(p => [p[0] + (p[0] < x ? -1 : 1), p[1] + (p[1] < y - 1 ? -1 : 0)]), '#1a4a7a');
        poly(c, O, ICEC[1]);
        poly(c, T(B.lit), ICEC[2]);
        poly(c, T(B.dark), '#3a9ad0');
        poly(c, T(B.top), '#e8fbff');
        const L = T(B.lit);
        pxLine(c, L[1][0] + 1, L[1][1], L[2][0] + 1, L[2][1] + 1, '#ffffff', 1);
        pxLine(c, L[2][0] + 1, L[2][1] + 1, L[3][0], L[3][1], '#ffffff', 1);
        if (cr > 0) {
          const P = [[x - 2, y - 40], [x + 3, y - 30], [x - 4, y - 20], [x + 2, y - 10], [x - 1, y]];
          for (let i = 1; i < P.length && i <= cr * 5; i++) { pxLine(c, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], '#1a4a7a', 2); pxLine(c, P[i - 1][0] - 1, P[i - 1][1], P[i][0] - 1, P[i][1], '#ffffff', 1); }
        }
      };
      Sfx.play('ice');
      tween(H, { oy: -2, squash: -0.1 }, 300);
      const snow = fxRun(1750, (c, k) => {
        const a = Math.sin(Math.min(1, k * 1.3) * Math.PI);
        tintView(c, '#cfefff', 0.2 * a);
        c.globalAlpha = a;
        for (let i = 0; i < 40; i++) {
          const x = VIEW.x + ((hash(i) * VIEW.w + G.t * 14 * (0.5 + hash(i + 50))) % VIEW.w), y = VIEW.y + ((hash(i + 9) * VIEW.h + G.t * 40 * (0.6 + hash(i + 3))) % VIEW.h), big = hash(i + 7) < 0.3 ? 2 : 1;
          pxRect(c, x, y, big, big, '#ffffff');
        }
        c.globalAlpha = 1;
      });
      await fxRun(300, (c, k) => { c.globalAlpha = 0.3 * k; oval(c, gx, 121, 6 + k * 12, 1.5 + k * 2.5, '#0a2a40'); c.globalAlpha = 1; });
      Sfx.play('charge');
      await fxRun(420, (c, k) => {
        const y = lerp(VIEW.y - 60, 121, easeIn(k));
        c.globalAlpha = 0.3 + 0.2 * k;
        oval(c, gx, 121, 18 + k * 12, 4 + k * 2, '#0a2a40');
        c.globalAlpha = 1;
        for (let i = 0; i < 5; i++) pxLine(c, gx - 24 + i * 12, y - 72 - 10 - hash(i) * 22, gx - 24 + i * 12, y - 72, '#ffffff', 1);
        berg(c, gx, y, 0);
      });
      m.hit(0);
      Sfx.play('boom');
      Sfx.play('ice');
      screenFlash('#ffffff', 0.8);
      focusLines(fc, '#bff2ff', 320);
      shake(9, 550);
      tween(F, { squash: 0.3 }, 80).then(() => tween(F, { squash: 0 }, 360));
      await fxRun(170, (c, k) => berg(c, gx, 121, k));
      shatter({ x: gx, y: 92 }, 22, 6, 820, 80);
      particles(gx, 110, 24, { colors: ICEP, speed: 120, grav: 160 });
      groundRing(gx, '#ffffff', 8, 52, 520, 2);
      groundRing(gx, ICEC[1], 6, 40, 440, 1);
      fxRun(700, (c, k) => {
        const g = k < 0.25 ? easeOut(k / 0.25) : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        for (let i = 0; i < 8; i++) { const x = gx - 40 + i * 11 + (i % 2) * 3; spike(c, x, 122, 5, (7 + (i % 3) * 4) * g * (1 - Math.abs(i - 3.5) / 6), (i - 3.5) * 1.2); }
      });
      await wait(480);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
      await snow;
    },

    // ===== Quake-Quake Fruit =====

    // Quake Punch: a fist wrapped in a quake bubble, and the air cracks like glass where it lands.
    quake: async m => {
      const H = G.hero, F = G.battle.F;
      Sfx.play('charge');
      tween(H, { ox: -6, squash: 0.12 }, 240);
      await fxRun(280, (c, k) => { const h = heroHand(); fist(c, h.x + 1, h.y, 3, 1); quakeBall(c, h.x + 1, h.y, 2 + k * 4); });
      const ball = layer(c => { const h = heroHand(); fist(c, h.x + 1, h.y, 3, 1); quakeBall(c, h.x + 1, h.y, 6); });
      await tween(H, { ox: 42, squash: -0.06 }, 130, easeIn);
      ball();
      const tgt = front();
      m.hit(0);
      Sfx.play('boom');
      const CR = makeCracks(tgt.x, tgt.y, 30, 9);
      fxRun(640, (c, k) => {
        if (k > 0.6 && Math.floor(k * 24) % 2) return;
        drawCracks(c, CR, k01(k * 6), 1 - k);
        if (k < 0.2) { c.globalAlpha = 0.6 * (1 - k / 0.2); pxCircle(c, tgt.x, tgt.y, 8 + k * 30, '#ffffff'); c.globalAlpha = 1; }
      });
      screenFlash('#ffffff', 0.35);
      ringOut(tgt, '#ffffff', 4, 34, 420, 2);
      ringOut(tgt, '#9ad0ff', 2, 24, 320, 1);
      impact(tgt, ['#ffffff', '#bfe6ff'], 14);
      shake(6, 420);
      dust(fc0().x, 10);
      fxRun(320, () => { F.kx = Math.max(F.kx || 0, rand(0, 4)); });
      await wait(380);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Seaquake: both fists grip the air and wrench it; the air cracks, the world lurches, and the
    // sea answers with a towering wave that comes crashing down on the foe.
    seaquake: async m => {
      const H = G.hero, F = G.battle.F, fc = fc0(), cx = fc.x + 30;
      const WC = ['#123a6a', '#1f5aa8', '#3a8ad8', '#8ad0f6', '#ffffff'];
      const tsunami = (c, Hh, Wd, lean) => {
        if (Hh < 2) return;
        for (let h = 0; h <= Hh; h += 2) {
          const q = h / Hh, sq = Math.sqrt(Math.log(Hh / Math.max(1, h))), sh = -lean * q * q;
          const l = Math.min(Wd * 1.4, Wd * 0.55 * sq), r = Math.min(Wd * 3, Wd * 1.5 * sq);
          if (l + r < 2) continue;
          const y = 121 - h, x0 = cx + sh - l, w = l + r;
          pxRect(c, x0 - 1, y - 1, w + 2, 3, WC[0]);
          pxRect(c, x0, y, w, 2, q < 0.3 ? WC[1] : q < 0.75 ? WC[2] : WC[3]);
          pxRect(c, x0, y, 3, 2, q < 0.5 ? WC[2] : WC[3]);
          if (h % 6 === 0) pxRect(c, x0 + 4 + (h * 7) % Math.max(1, Math.round(w * 0.5)), y, Math.max(2, w * 0.2), 1, WC[3]);
        }
        // the crest curls over toward you, foaming
        const tx = cx - lean, ty = 121 - Hh, R = Math.min(12, 4 + lean * 0.2), L = [];
        for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 - i / 6 * Math.PI * 0.9; L.push([tx + Math.cos(a) * R, ty + R + Math.sin(a) * R, Math.max(1, 3.5 - i * 0.4)]); }
        for (const p of L) pxCircle(c, p[0], p[1], p[2] + 1, WC[0]);
        for (const p of L) pxCircle(c, p[0], p[1], p[2], WC[3]);
        for (const p of L) pxCircle(c, p[0] + 0.5, p[1] - p[2] * 0.4, p[2] * 0.6, WC[4]);
      };
      Sfx.play('charge');
      await tween(H, { ox: 8, squash: 0.14 }, 200);
      await fxRun(300, (c, k) => {
        for (const y of [100, 110]) { const x = H.x + H.ox + 13, yy = y + H.oy; limb(c, H.x + H.ox + 6, yy + 2, x, yy, 3, 0); fist(c, x, yy, 3, 1); quakeBall(c, x, yy, 2 + k * 3); }
      });
      Sfx.play('boom');
      const cp = { x: H.x + H.ox + 22, y: 104 };
      const CR = makeCracks(cp.x, cp.y, 26, 8);
      fxRun(1100, (c, k) => { if (k > 0.7 && Math.floor(k * 24) % 2) return; drawCracks(c, CR, k01(k * 7), 1 - k); });
      screenFlash('#ffffff', 0.5);
      shake(8, 1300);
      ringOut(cp, '#ffffff', 4, 40, 500, 2);
      tween(H, { ox: -4, squash: -0.06 }, 160);
      Sfx.play('splash');
      const land = once(() => {
        m.hit(0);
        Sfx.play('boom');
        Sfx.play('splash');
        const f = fc0();
        impact(f, ['#ffffff', '#8ad0f6'], 16);
        particles(f.x, f.y, 30, { colors: WC.slice(2), speed: 130, grav: 200, life: 0.7, size: 2 });
        groundRing(f.x, '#ffffff', 10, 60, 520, 2);
        tween(F, { squash: 0.25 }, 90).then(() => tween(F, { squash: 0 }, 300));
      });
      await fxRun(1100, (c, k) => {
        let Hh, lean;
        if (k < 0.45) { Hh = easeOut(k / 0.45) * 96; lean = 8 * k; }
        else if (k < 0.62) { const q = (k - 0.45) / 0.17; Hh = 96 - easeIn(q) * 40; lean = 4 + easeIn(q) * 50; }
        else { const q = (k - 0.62) / 0.38; Hh = 56 * (1 - easeOut(q)); lean = 54 + q * 20; }
        tsunami(c, Hh, 30 + k * 30, lean);
        if (k < 0.55) foeOver(c);
        if (Math.random() < 0.8) particles(cx - lean + rand(-10, 10), 121 - Hh, 1, { colors: ['#ffffff', '#8ad0f6'], speed: 50, grav: 120, life: 0.5 });
        if (k >= 0.6) land();
      });
      land();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // World Splitter: quake bubbles swell on both fists while the ground trembles, then one punch
    // cracks the whole sky in two.
    split: async m => {
      const H = G.hero, F = G.battle.F, fc = fc0();
      Sfx.play('charge');
      const dark = fxRun(2450, (c, k) => tintView(c, '#0a0c18', 0.42 * Math.sin(Math.min(1, k * 1.25) * Math.PI)));
      tween(H, { ox: -6, squash: 0.18 }, 420);
      shake(2, 650);
      await fxRun(650, (c, k) => {
        const h = heroHand(), b = { x: H.x + H.ox - 10, y: 108 + H.oy };
        fist(c, h.x + 1, h.y, 3, 1);
        quakeBall(c, h.x + 1, h.y, 2 + k * 6);
        quakeBall(c, b.x, b.y, 2 + k * 4);
        if (Math.random() < 0.6) particles(rand(VIEW.x, VIEW.x + VIEW.w), 121, 1, { colors: DIRT, speed: 20, grav: -40, dir: -Math.PI / 2, spread: 0.3, life: 0.8 });
      });
      tween(H, { ox: 16, squash: -0.1 }, 90, easeIn);
      await wait(90);
      Sfx.play('boom');
      screenFlash('#ffffff', 1);
      shake(12, 1100);
      const h = heroHand(), xs = h.x + 4, ys = h.y, xR = VIEW.x + VIEW.w + 8, xL = VIEW.x - 8;
      const right = [[xs, ys]], left = [[xs, ys]], branches = [];
      for (let x = xs; x < xR;) { x += rand(6, 12); right.push([x, (x < fc.x ? lerp(ys, fc.y, (x - xs) / (fc.x - xs)) : fc.y + (x - fc.x) * 0.1) + rand(-4, 4)]); }
      for (let x = xs; x > xL;) { x -= rand(6, 12); left.push([x, ys - (xs - x) * 0.25 + rand(-4, 4)]); }
      for (const path of [right, left]) {
        for (let i = 2; i < path.length; i += 2) {
          if (Math.random() < 0.35) continue;
          const up = Math.random() < 0.5 ? -1 : 1, len = rand(14, 60), pts = [path[i]];
          let x = path[i][0], y = path[i][1];
          while (Math.abs(y - path[i][1]) < len) { x += rand(-6, 6); y += up * rand(5, 9); pts.push([x, y]); }
          branches.push({ x0: path[i][0], pts });
        }
      }
      const seg = (c, a, b, gap) => {
        c.globalAlpha = 0.45;
        pxLine(c, a[0], a[1], b[0], b[1], '#bfe6ff', Math.round(gap) + 5);
        c.globalAlpha = 1;
        pxLine(c, a[0], a[1] - gap / 2 - 1, b[0], b[1] - gap / 2 - 1, '#ffffff', 1);
        pxLine(c, a[0], a[1] + gap / 2 + 1, b[0], b[1] + gap / 2 + 1, '#ffffff', 1);
        if (gap >= 1) pxLine(c, a[0], a[1], b[0], b[1], '#05060c', Math.max(1, Math.round(gap)));
      };
      const land = once(() => {
        m.hit(0);
        focusLines(fc, '#ffffff', 360);
        impact(fc, ['#ffffff', '#bfe6ff'], 22);
        ringOut(fc, '#ffffff', 6, 60, 520, 2);
        groundRing(fc.x, '#ffffff', 8, 60, 600, 2);
        tween(F, { squash: 0.25 }, 90).then(() => tween(F, { squash: 0 }, 300));
        dust(fc.x, 16);
      });
      await fxRun(1400, (c, k) => {
        const reach = easeOut(k01(k * 3.5)), gap = k < 0.2 ? k / 0.2 * 3 : 3 - (k - 0.2) / 0.8 * 2.5;
        const xr = lerp(xs, xR, reach), xl = lerp(xs, xL, reach);
        if (xr >= fc.x) land();
        if (k > 0.75 && Math.floor(k * 30) % 2) return;
        for (let i = 1; i < right.length && right[i][0] <= xr; i++) seg(c, right[i - 1], right[i], gap);
        for (let i = 1; i < left.length && left[i][0] >= xl; i++) seg(c, left[i - 1], left[i], gap * 0.7);
        for (const b of branches) {
          if (b.x0 > xr || b.x0 < xl) continue;
          const n = Math.min(b.pts.length - 1, Math.floor((b.x0 >= xs ? xr - b.x0 : b.x0 - xl) / 5));
          for (let i = 1; i <= n; i++) {
            pxLine(c, b.pts[i - 1][0] + 1, b.pts[i - 1][1], b.pts[i][0] + 1, b.pts[i][1], '#2a3048', 1);
            pxLine(c, b.pts[i - 1][0], b.pts[i - 1][1], b.pts[i][0], b.pts[i][1], '#ffffff', 1);
          }
        }
      });
      land();
      particles(fc.x, 110, 20, { colors: DIRT.concat(['#6a5a4a']), speed: 100, grav: 200, dir: -Math.PI / 2, spread: 1.8, size: 2 });
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 260);
      await dark;
    },

    // ===== Smoke-Smoke Fruit =====

    // White Blow: your arm turns to smoke and shoots out as a long fist of smoke.
    smokeblow: async m => {
      const H = G.hero, tgt = front(), S = { e: 0, sq: 0 };
      Sfx.play('fire');
      tween(H, { ox: -4, squash: 0.1 }, 220);
      await fxRun(240, (c, k) => {
        const h = heroHand(), P = [];
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + G.t * 9, r = 8 * (1 - k) + 3; P.push([h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.7, 2 + k * 1.5]); }
        clouds(c, P);
      });
      tween(H, { ox: 6, squash: -0.05 }, 110);
      const arm = layer(c => {
        const h = heroHand(), x1 = lerp(h.x + 2, tgt.x - 4, S.e), y1 = lerp(h.y, tgt.y, S.e), P = [];
        const n = Math.max(2, Math.round((x1 - h.x) / 3.5));
        for (let i = 0; i <= n; i++) {
          const q = i / n;
          P.push([lerp(h.x, x1, q), lerp(h.y, y1, q) + Math.sin(q * 7 - G.t * 18) * 2 * q, 3 + q * 3 + Math.sin(i * 1.9 + G.t * 11) * 0.6]);
        }
        P.push([x1 - 1, y1 - 7, 3.4], [x1 - 2, y1 + 7, 3.4]);
        clouds(c, P);
        fist(c, x1 + 3, y1, 6, 1, SMOKEFIST, S.sq);
      });
      await tween(S, { e: 1 }, 190, easeIn);
      m.hit(0);
      smokeBurst(tgt, 16, 520);
      impact(tgt, ['#ffffff', '#dfe2ea'], 10);
      pow(tgt, 240, 1.2);
      shake(3, 180);
      await tween(S, { sq: 1 }, 60);
      await tween(S, { sq: 0 }, 90);
      await tween(S, { e: 0 }, 220, easeOut);
      arm();
      particles(heroHand().x, heroHand().y, 8, { colors: SMK.slice(1), speed: 30, grav: -30, life: 0.5, size: 2 });
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
    },

    // Smoke Bind (White Snake): a serpent of smoke slithers to the foe, coils round it and squeezes.
    smokebind: async m => {
      const H = G.hero, F = G.battle.F;
      Sfx.play('fire');
      tween(H, { ox: 4, squash: 0.08 }, 200);
      const from = heroHand(), fc = fc0();
      await fxRun(360, (c, k) => {
        const e = easeOut(k), hx = lerp(from.x, fc.x - 18, e), hy = lerp(from.y, fc.y + 8, e), P = [];
        for (let i = 0; i < 12; i++) { const q = i / 11; P.push([lerp(from.x, hx, q), lerp(from.y, hy, q) + Math.sin(q * 9 - G.t * 18) * 4 * q, 1.8 + q * 2.6]); }
        clouds(c, P);
        // the serpent's head: dark eyes and a flicking tongue
        pxRect(c, hx + 1, hy - 3, 1, 1, INK);
        pxRect(c, hx + 3, hy - 3, 1, 1, INK);
        if (Math.floor(G.t * 12) % 2) { pxLine(c, hx + 5, hy, hx + 8, hy, '#d8432f', 1); pxRect(c, hx + 9, hy - 1, 1, 1, '#d8432f'); pxRect(c, hx + 9, hy + 1, 1, 1, '#d8432f'); }
      });
      tween(F, { squash: -0.14 }, 450, easeIn);
      const land = once(() => { m.hit(0); impact(fc0(), ['#ffffff', '#dfe2ea'], 12); shake(3, 220); });
      await fxRun(760, (c, k) => {
        const f = fc0(), tight = easeIn(k01(k / 0.6)), loose = k > 0.8 ? (k - 0.8) / 0.2 : 0;
        const rx = lerp(foeW() * 0.5 + 16, foeW() * 0.5 + 3, tight) + loose * 14, rear = [], near = [];
        for (let j = 0; j < 3; j++) {
          const cy = f.y - 12 + j * 11;
          for (let i = 0; i < 20; i++) {
            const a = i / 20 * Math.PI * 2 + G.t * 7 + j * 1.3, p = [f.x + Math.cos(a) * rx, cy + Math.sin(a) * 4 + Math.cos(a) * 3, 3 - loose * 1.6];
            (Math.sin(a) < 0 ? rear : near).push(p);
          }
        }
        clouds(c, rear, SMK_DIM);
        foeOver(c);
        clouds(c, near, [SMK[0], SMK[1], SMK[2], SMK[2]]);
        if (k >= 0.6) land();
      });
      land();
      tween(F, { squash: 0 }, 200);
      smokeBurst(fc0(), 20, 420);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
    },

    // White Launcher: your legs become a churning cloud and you rocket into the foe on a column of
    // smoke, then drift back together at your spot.
    launcher: async m => {
      const H = G.hero, F = G.battle.F, trail = [], B = { v: 0 };
      Sfx.play('fire');
      const smoke = layer(c => {
        const now = G.t, P = [];
        if (B.v > 0) for (let i = 0; i < 6; i++) { const a = i * 1.05 + now * 6; P.push([H.x + H.ox + Math.cos(a) * 7 * B.v, 116 + H.oy + Math.sin(a) * 3 * B.v, (3 + (i % 3)) * B.v]); }
        const hc = heroC(), last = trail[trail.length - 1];
        if (B.v > 0 && H.ox > 2 && (!last || Math.hypot(hc.x - last.x, hc.y - last.y) > 3)) trail.push({ x: hc.x - 6, y: hc.y + 6, t: now, s: 0.75 + Math.random() * 0.5 });
        for (let i = trail.length - 1; i >= 0; i--) {
          const age = now - trail[i].t;
          if (age > 0.9) { trail.splice(i, 1); continue; }
          const r = Math.min(7, 3 + age * 14) * (age > 0.6 ? (0.9 - age) / 0.3 : 1);
          if (r >= 1) P.push([trail[i].x - age * 6, trail[i].y - age * 8, r * trail[i].s]);
        }
        clouds(c, P);
      });
      tween(B, { v: 1 }, 380);
      await tween(H, { oy: -8, squash: -0.08 }, 420);
      Sfx.play('fire');
      await tween(H, { ox: 56, oy: -2, squash: -0.16 }, 210, easeIn);
      const fc = fc0();
      m.hit(0);
      Sfx.play('boom');
      focusLines(fc, '#ffffff', 300);
      screenFlash('#ffffff', 0.4);
      smokeBurst(fc, 26, 700);
      smokeBurst(fc, 13, 520);
      impact(fc, ['#ffffff', '#dfe2ea'], 16);
      shake(6, 420);
      tween(F, { ox: 14 }, 120).then(() => tween(F, { ox: 0 }, 300));
      await tween(H, { alpha: 0.25, squash: 0 }, 140);
      await wait(160);
      B.v = 0;
      H.ox = 0;
      H.oy = 0;
      particles(H.x, 108, 14, { colors: SMK, speed: 40, grav: -20, life: 0.5, size: 3 });
      await tween(H, { alpha: 1 }, 220);
      await wait(220);
      smoke();
    },

    // ===== Light-Light Fruit =====

    // Flash Kick: light gathers, you are simply there at the speed of light, and kick.
    lightkick: async m => {
      const H = G.hero;
      Sfx.play('charge');
      await fxRun(240, (c, k) => {
        const hc = heroC();
        for (let i = 0; i < 10; i++) { const a = i * 0.628 + G.t * 4, r = 28 * (1 - easeIn(k)) + 2; pxRect(c, hc.x + Math.cos(a) * r, hc.y + Math.sin(a) * r, 2, 2, i % 2 ? '#fff3a0' : '#ffffff'); }
        if (k > 0.6) twinkle(c, hc.x + 2, hc.y - 4, 3 + k * 4);
      });
      H.flash = 0.12;
      Sfx.play('zap');
      const a = heroC();
      H.alpha = 0;
      H.ox = 46;
      H.oy = -6;
      const b = heroC();
      lightStreak(a, b, 220, 5);
      await wait(70);
      H.alpha = 1;
      H.flash = 0.1;
      const tgt = front(), pv = { x: b.x + 4, y: b.y + 4 };
      const kick = fxRun(220, (c, k) => smear(c, pv.x, pv.y, 22, 10, 2.0, lerp(2.0, -0.9, easeOut(k01(k * 2.2))), '#ffd04a', k01((k - 0.45) / 0.55)));
      await wait(70);
      m.hit(0);
      Sfx.play('zap');
      lightPop(tgt, 1.6);
      rays(tgt, '#fff3a0', 12, 34, 300);
      impact(tgt, ['#ffffff', '#fff3a0'], 14);
      screenFlash('#fff6a0', 0.45);
      shake(4, 220);
      await kick;
      await wait(100);
      Sfx.play('zap');
      const c0 = heroC();
      H.alpha = 0;
      H.ox = 0;
      H.oy = 0;
      lightStreak(c0, heroC(), 200, 3);
      await wait(70);
      H.alpha = 1;
      particles(heroC().x, heroC().y, 8, { colors: LITE, speed: 40, grav: 0, life: 0.4 });
      await wait(120);
    },

    // Light Rain (Yasakani no Magatama): you leap up, gather beads of light between your hands and
    // rain them down on the foe.
    lightrain: async m => {
      const H = G.hero;
      Sfx.play('charge');
      const dim = fxRun(1650, (c, k) => tintView(c, '#0a0820', 0.3 * Math.sin(Math.min(1, k * 1.25) * Math.PI)));
      await tween(H, { oy: -22, squash: -0.1 }, 220, easeOut);
      const src = () => ({ x: H.x + H.ox + 2, y: 121 + H.oy - 40 });
      await fxRun(380, (c, k) => {
        const s = src();
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + G.t * 6, r = 20 * (1 - easeIn(k)) + 3, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r * 0.6;
          pxCircle(c, x, y, 2, '#ffd04a');
          pxRect(c, x - 1, y - 1, 2, 2, '#ffffff');
        }
        pxCircle(c, s.x, s.y, 1 + k * 4, '#fff3a0');
        pxCircle(c, s.x, s.y, k * 2.5, '#ffffff');
      });
      const glow = layer(c => {
        const s = src(), r = 4 + Math.sin(G.t * 40);
        pxCircle(c, s.x, s.y, r + 2, '#ffd04a');
        pxCircle(c, s.x, s.y, r, '#fff3a0');
        pxCircle(c, s.x, s.y, r * 0.5, '#ffffff');
        twinkle(c, s.x, s.y, r + 4);
      });
      Sfx.play('zap');
      // a downpour of light: stray bullets keep raining around the foe the whole time
      const stray = [];
      let nextAt = 0;
      const rain = layer((c, t) => {
        if (t >= nextAt) {
          nextAt = t + 22;
          const f = fc0();
          stray.push({ from: src(), to: { x: f.x + rand(-40, 36), y: Math.random() < 0.6 ? 120 : f.y + rand(-20, 14) }, t0: t });
        }
        for (let i = stray.length - 1; i >= 0; i--) {
          const b = stray[i], k = (t - b.t0) / 120;
          if (k >= 1) { stray.splice(i, 1); lightPop(b.to, 0.5); continue; }
          const q = Math.max(0, k - 0.4), x = lerp(b.from.x, b.to.x, k), y = lerp(b.from.y, b.to.y, k), tx = lerp(b.from.x, b.to.x, q), ty = lerp(b.from.y, b.to.y, q);
          pxLine(c, tx, ty, x, y, '#ffd04a', 3);
          pxLine(c, tx, ty, x, y, '#ffffff', 1);
        }
      });
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const f = fc0(), tgt = { x: f.x + rand(-12, 12), y: f.y + rand(-14, 12) };
        await lightBullet(src(), tgt, 90);
        m.hit(i);
        lightPop(tgt, 1.3);
        if (i % 2 === 0) Sfx.play('zap');
        await wait(30);
      }
      rain();
      glow();
      await wait(160);
      await tween(H, { oy: 0, squash: 0.12 }, 160, easeIn);
      dust(H.x, 5);
      await tween(H, { ox: 0, squash: 0 }, 100);
      await dim;
    },

    // Solar Lance: the screen dims, light condenses at your fingertip, and a lance of light pierces
    // the foe and runs on to the edge of the world.
    beam: async m => {
      const H = G.hero, fc = fc0();
      Sfx.play('charge');
      const dim = fxRun(1650, (c, k) => tintView(c, '#100c00', 0.45 * Math.sin(Math.min(1, k * 1.2) * Math.PI)));
      tween(H, { ox: -3, squash: 0.06 }, 300);
      await fxRun(560, (c, k) => {
        const h = heroHand(), x = h.x + 3, y = h.y - 1;
        for (let i = 0; i < 12; i++) {
          const a = i * 0.524 + G.t * 2, r0 = 34 * (1 - k) + 4, r1 = r0 + 6 + 8 * (1 - k);
          pxLine(c, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, i % 2 ? '#fff3a0' : '#ffffff', 1);
        }
        const r = 1 + easeIn(k) * 5;
        pxCircle(c, x, y, r + 2, '#ffd04a');
        pxCircle(c, x, y, r, '#fff3a0');
        pxCircle(c, x, y, r * 0.5, '#ffffff');
        pxLine(c, x - 6 - k * 14, y, x + 6 + k * 14, y, '#ffffff', 1);
        pxLine(c, x, y - 3 - k * 7, x, y + 3 + k * 7, '#ffffff', 1);
      });
      Sfx.play('zap');
      const h = heroHand(), x0 = h.x + 3, y0 = h.y - 1, x1 = VIEW.x + VIEW.w + 4, slope = (fc.y - y0) / (fc.x - x0), yAt = x => y0 + (x - x0) * slope;
      await fxRun(70, (c, k) => pxLine(c, x0, y0, lerp(x0, x1, k), yAt(lerp(x0, x1, k)), '#ffffff', 1));
      screenFlash('#fffbe0', 0.7);
      shake(6, 600);
      tween(H, { ox: -8 }, 120);
      m.hit(0);
      Sfx.play('boom');
      fxRun(700, (c, k) => {
        const e = easeOut(k01(k * 2)), fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
        if (fade <= 0) return;
        c.globalAlpha = fade;
        pxCircle(c, fc.x, fc.y, 6 + e * 16, '#fff3a0');
        pxCircle(c, fc.x, fc.y, 4 + e * 11, '#ffffff');
        c.globalAlpha = 1;
        pxRing(c, fc.x, fc.y, 8 + e * 26, '#ffd04a', 1);
      });
      rays(fc, '#fff3a0', 14, 40, 420);
      particles(fc.x, fc.y, 24, { colors: LITE, speed: 110 });
      await fxRun(600, (c, k) => {
        const w = Math.max(1, Math.round(7 * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85 * 0.9) + Math.sin(G.t * 60)));
        pxLine(c, x0, y0, x1, yAt(x1), '#c98a1a', w + 4);
        pxLine(c, x0, y0, x1, yAt(x1), '#ffd04a', w + 2);
        pxLine(c, x0, y0, x1, yAt(x1), '#fff3a0', w);
        pxLine(c, x0, y0, x1, yAt(x1), '#ffffff', Math.max(1, w - 3));
        pxCircle(c, x0, y0, w + 2, '#ffffff');
        if (Math.random() < 0.8) { const t = Math.random(); particles(lerp(x0, x1, t), yAt(lerp(x0, x1, t)), 1, { colors: LITE, speed: 30, grav: 0, life: 0.35 }); }
      });
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
      await dim;
    },

    // ===== Dough-Dough Fruit =====

    // Dough Fist: your arm swells into soft, heavy dough and a giant mochi fist punches the foe.
    doughfist: async m => {
      const H = G.hero, tgt = front(), S = { e: 0, sq: 0 };
      Sfx.play('stretch');
      tween(H, { ox: -4, squash: 0.12 }, 260);
      await fxRun(280, (c, k) => { const h = heroHand(); clouds(c, [[h.x + 1, h.y, 2 + easeOut(k) * 4 + Math.sin(G.t * 30) * 0.6]], DOUGHB); });
      const arm = layer(c => {
        const h = heroHand(), x = lerp(h.x + 2, tgt.x - 2, S.e), y = lerp(h.y, tgt.y, S.e);
        if (x - h.x > 6) limb(c, h.x, h.y, x - 6, y, 7, 0.8, DOUGH);
        clouds(c, [[h.x + 1, h.y, 4.5]], DOUGHB);
        fist(c, x, y, 7, 1, DOUGH, S.sq);
      });
      tween(H, { ox: 4, squash: -0.06 }, 140, easeIn);
      await tween(S, { e: 1 }, 170, easeIn);
      m.hit(0);
      Sfx.play('bump');
      impact(tgt, ['#ffffff', '#efe2c8'], 12);
      pow(tgt, 240, 1.4, '#fffaf0');
      shake(4, 200);
      await tween(S, { sq: 1 }, 60);
      await tween(S, { sq: 0 }, 110);
      fxRun(320, (c, k) => {
        const h = heroHand(), x = lerp(h.x + 2, tgt.x - 2, S.e) + 6;
        if (k > 0.75) return;
        for (let i = -1; i <= 1; i++) { const sag = (1 - k) * 3 + Math.abs(i); pxLine(c, x, tgt.y + i * 3, (x + tgt.x + 4) / 2, tgt.y + i * 3 + sag, DOUGH[2], 1); pxLine(c, (x + tgt.x + 4) / 2, tgt.y + i * 3 + sag, tgt.x + 4, tgt.y + i * 4, DOUGH[2], 1); }
      });
      await tween(S, { e: 0 }, 240, easeIn);
      arm();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 180);
    },

    // Sticky Snare: a glob of sticky mochi splats over the foe and pins it to the ground.
    doughsnare: async m => {
      const H = G.hero, F = G.battle.F, col = m.color || '#efe2c8', dark = m.color ? mixColor(m.color, '#000000', 0.3) : '#c9a26a';
      const cols = [mixColor(dark, INK, 0.45), dark, col, mixColor(col, '#ffffff', 0.6)];
      Sfx.play('stretch');
      await tween(H, { ox: -3, squash: 0.1 }, 160);
      tween(H, { ox: 4, squash: -0.05 }, 120);
      const from = heroHand(), fc = fc0();
      await fxRun(340, (c, k) => {
        const x = lerp(from.x, fc.x, k), y = lerp(from.y, fc.y - 8, k) - Math.sin(k * Math.PI) * 26;
        c.globalAlpha = 1 - k;
        pxLine(c, heroHand().x, heroHand().y, x, y, cols[1], 1);
        c.globalAlpha = 1;
        clouds(c, [[x, y, 5 + Math.sin(G.t * 25) * 0.8], [x - 4, y + 2, 3]], cols);
      });
      Sfx.play('bump');
      tween(F, { squash: 0.14 }, 200);
      const land = once(() => { m.hit(0); impact(fc0(), ['#ffffff', col], 10); shake(2, 160); });
      await fxRun(860, (c, k) => {
        const f = fc0(), w = foeW() * 0.5, top = foeTop(), sp = easeOut(k01(k * 2.4)), fade = k > 0.82 ? (1 - k) / 0.18 : 1;
        c.globalAlpha = fade;
        for (const sd of [-1, 1]) {
          const ax = f.x + sd * (w + 1) * sp, ay = f.y + 2, gx = f.x + sd * (w + 12) * sp, gy = 121;
          pxLine(c, ax, ay, gx, gy, cols[0], 4);
          pxLine(c, ax, ay, gx, gy, cols[2], 2);
          oval(c, gx, gy, 1 + 4 * sp, 1.5, cols[1]);
        }
        // a lumpy glob of mochi stuck over its body, the head poking out of the top
        const P = [], yTop = lerp(top, 121, 0.45), R = (2.5 + w * 0.2) * (0.5 + 0.5 * sp);
        const rows = [[-1, 0, 1], [-1.5, -0.5, 0.5, 1.5], [-1.2, -0.4, 0.4, 1.2]];
        rows.forEach((row, r) => row.forEach((o, i) => {
          const y = lerp(f.y - 6, lerp(yTop, f.y + 8, r / 2), sp);
          P.push([f.x + o * w * (r ? 0.42 : 0.5) * sp + Math.sin(G.t * 9 + i + r) * 0.8, y, R + Math.sin(G.t * 14 + i * 2 + r) * 0.6 + (r === 1 ? 1 : 0)]);
        }));
        clouds(c, P, [cols[0], cols[1], cols[2], cols[2]]);
        for (let i = 0; i < 3; i++) { const p = P[i]; pxRect(c, p[0] - p[2] * 0.4, p[1] - p[2] * 0.6, Math.max(1, p[2] * 0.5), 1, cols[3]); }
        for (let i = 0; i < 4; i++) {
          const dx = f.x + (i - 1.5) * w * 0.5, len = 2 + k * 10 * (0.5 + hash(i)), dy = f.y + 6 + (3 + w * 0.22);
          pxRect(c, dx - 1, dy, 3, len, cols[0]);
          pxRect(c, dx, dy, 1, len, cols[2]);
          pxCircle(c, dx, dy + len, 1.5, cols[2]);
        }
        c.globalAlpha = 1;
        if (k > 0.5) land();
      });
      land();
      tween(F, { squash: 0 }, 200);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
    },

    // ===== Split-Split Fruit =====

    // Split Cannon (Bara Bara Ho): your hand pops off at the wrist and flies at the foe, knives
    // between its fingers, then boomerangs home.
    splitfist: async m => {
      const H = G.hero, tgt = front();
      const flying = (c, x, y, dir) => {
        const bx = x - dir * 8;
        pxRect(c, bx - 4, y - 4, 8, 8, INK);
        pxRect(c, bx - 3, y - 3, 6, 6, '#3b6fd6');
        pxRect(c, bx - 3, y - 2, 6, 1, '#e8504a');
        pxRect(c, bx - 3, y + 1, 6, 1, '#e8504a');
        zigzag(c, bx - dir * 4, y - 4, bx - dir * 4, y + 4, 4, 1, '#ffffff', 1);
        for (let i = 0; i < 3; i++) { const yy = y - 3 + i * 3; pxLine(c, x + dir * 4, yy, x + dir * 11, yy, INK, 3); pxLine(c, x + dir * 4, yy, x + dir * 11, yy, '#e8edf5', 1); pxRect(c, x + dir * 11, yy, 1, 1, '#ffffff'); }
        fist(c, x, y, 4, dir);
      };
      Sfx.play('slash');
      await tween(H, { ox: -4, squash: 0.1 }, 160);
      const h0 = heroHand();
      fxRun(160, (c, k) => { if (k < 0.6) zigzag(c, h0.x - 3, h0.y - 4, h0.x - 3, h0.y + 4, 3, 2, '#ffffff', 1); });
      particles(h0.x - 2, h0.y, 8, { colors: ['#ffffff', '#e8504a', '#3b6fd6'], speed: 50, grav: 60, life: 0.35 });
      tween(H, { ox: 0, squash: 0 }, 160);
      const F0 = { x: h0.x + 2, y: h0.y };
      await fxRun(260, (c, k) => {
        const e = easeIn(k), x = lerp(F0.x, tgt.x, e), y = lerp(F0.y, tgt.y, e) - Math.sin(k * Math.PI) * 6;
        streaks(c, x - 10, y, 3, 18, 3);
        flying(c, x, y + Math.sin(k * 30) * 1.5, 1);
      });
      m.hit(0);
      for (let i = 0; i < 3; i++) slashAt({ x: tgt.x + 2, y: tgt.y - 4 + i * 4 }, '#e8edf5', 0.15 + i * 0.1, 20);
      impact(tgt, ['#ffffff', '#e8504a'], 12);
      shake(3, 160);
      const h1 = heroHand();
      await fxRun(300, (c, k) => {
        const e = easeOut(k), x = lerp(tgt.x, h1.x, e), y = lerp(tgt.y, h1.y, e) - Math.sin(k * Math.PI) * 20;
        flying(c, x, y, -1);
      });
      particles(h1.x, h1.y, 8, { colors: ['#ffffff', '#e8504a', '#3b6fd6'], speed: 40, grav: 40, life: 0.3 });
      Sfx.play('bump');
      await tween(H, { ox: 0, oy: 0, squash: 0.1 }, 70);
      await tween(H, { squash: 0 }, 110);
    },

    // Split Bomb: a huge skull-marked bomb lobbed high, a bounce, two red flashes... and BOOM.
    bomb: async m => {
      const H = G.hero, fc = fc0(), col = m.color || '#3a3440';
      Sfx.play('charge');
      await tween(H, { ox: -6, squash: 0.14 }, 220);
      tween(H, { ox: 6, squash: -0.08 }, 140, easeIn);
      const from = { x: heroHand().x, y: heroHand().y - 6 }, land = { x: fc.x - 10, y: 112 };
      await fxRun(560, (c, k) => {
        const x = lerp(from.x, land.x, k), y = lerp(from.y, land.y, k) - Math.sin(k * Math.PI) * 54;
        drawBomb(c, x, y, 9, col, true);
      });
      Sfx.play('bump');
      dust(land.x, 5);
      const at = { x: land.x + 6, y: land.y };
      await fxRun(220, (c, k) => drawBomb(c, lerp(land.x, at.x, k), land.y - Math.sin(k * Math.PI) * 8, 9, col, true));
      await fxRun(320, (c, k) => {
        const red = Math.floor(k * 6) % 2 === 1;
        drawBomb(c, at.x + (red ? rand(-1, 1) : 0), at.y, red ? 10 : 9, red ? '#e0483a' : col, true);
        if (red) pxRing(c, at.x, at.y, 13, '#ff5a2a', 1);
      });
      Sfx.play('boom');
      m.hit(0);
      screenFlash('#fff3a0', 0.8);
      focusLines(fc, '#fff3a0', 320);
      shake(8, 520);
      explode({ x: at.x, y: at.y - 6 }, 34, 900);
      groundRing(at.x, '#ffd04a', 6, 54, 520, 2);
      particles(at.x, at.y - 6, 30, { colors: EMBER.concat(['#3a3440']), speed: 140, grav: 120, life: 0.6 });
      particles(at.x, 118, 12, { colors: ['#3a3440', '#6a5a4a'], speed: 110, grav: 220, dir: -Math.PI / 2, spread: 1.6, size: 2 });
      await wait(560);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // ===== Magma =====

    // Meteor Shower (Meteor Volcano): you punch a magma fist into the sky, and molten fists rain
    // down on the foe.
    meteor: async m => {
      const H = G.hero;
      const magma = (c, x, y, r) => {
        fist(c, x, y, r, 2, MAGMA);
        pxLine(c, x - r * 0.6, y - r * 0.4, x + r * 0.1, y + r * 0.2, '#ff8a2a', 1);
        pxLine(c, x + r * 0.1, y + r * 0.2, x + r * 0.5, y - r * 0.1, '#ffd04a', 1);
        pxLine(c, x - r * 0.2, y + r * 0.7, x + r * 0.4, y + r * 0.9, '#ff8a2a', 1);
      };
      const fall = (to, ms, r) => {
        const from = { x: to.x - 34 + rand(-6, 6), y: VIEW.y - 14 };
        return fxRun(ms, (c, k) => {
          const e = easeIn(k), x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e), P = [];
          for (let i = 1; i <= 6; i++) { const t = Math.max(0, e - i * 0.06); P.push({ x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), w: (r + 2) * (1 - i / 7) }); }
          blaze(c, P);
          magma(c, x, y, r);
          if (Math.random() < 0.5) particles(x, y - r, 1, { colors: ['#3a3440', '#5a5260'], speed: 15, grav: -30, life: 0.5, size: 2 });
        });
      };
      const splash = (p, big) => {
        Sfx.play('boom');
        fireBurst(p, big ? 20 : 12, 420);
        particles(p.x, p.y, big ? 16 : 8, { colors: ['#ff5a2a', '#ff9a3a', '#ffd04a', '#5a1a10'], speed: 90, grav: 200, life: 0.6, dir: -Math.PI / 2, spread: 2.4 });
        fxRun(600, (c, k) => { c.globalAlpha = 1 - k; oval(c, p.x, 121, (big ? 9 : 6) * (1 + k * 0.3), 2, '#ff5a2a'); oval(c, p.x, 121, (big ? 5 : 3), 1, '#ffd04a'); c.globalAlpha = 1; });
      };
      Sfx.play('fire');
      const red = fxRun(1850, (c, k) => tintView(c, '#5a0800', 0.26 * Math.sin(Math.min(1, k * 1.3) * Math.PI)));
      await tween(H, { squash: 0.14, oy: 2 }, 160);
      tween(H, { squash: -0.12, oy: -6 }, 120, easeOut);
      const up = heroHand();
      await fxRun(300, (c, k) => {
        const y = lerp(up.y - 6, VIEW.y - 20, easeIn(k)), P = [];
        for (let i = 1; i <= 5; i++) P.push({ x: up.x, y: y + i * 6, w: 4 * (1 - i / 6) });
        blaze(c, P);
        magma(c, up.x, y, 4);
      });
      tween(H, { squash: 0, oy: 0 }, 140);
      await wait(60);
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const f = fc0(), to = { x: f.x + rand(-10, 10), y: f.y + rand(-8, 10) };
        if (i < 3) { const g = { x: f.x + (i % 2 ? 30 : -34) + rand(-6, 6), y: 119 }; fall(g, 240, 5).then(() => splash(g, false)); }
        await fall(to, 210, 7);
        m.hit(i);
        splash(to, true);
        shake(3, 150);
        await wait(50);
      }
      await wait(180);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 160);
      await red;
    },

    // ===== String-String Fruit =====

    // Five Color Strings: five strings spring from your fingertips and whip down through the foe.
    strings: async m => {
      const H = G.hero;
      Sfx.play('slash');
      tween(H, { oy: -2, squash: -0.06 }, 200);
      await fxRun(240, (c, k) => {
        const h = heroHand(), e = easeOut(k);
        for (let j = 0; j < 5; j++) { const a = -1.9 + j * 0.22; pxLine(c, h.x, h.y - 4, h.x + Math.cos(a) * 26 * e, h.y - 4 + Math.sin(a) * 26 * e, STR[j], 1); }
        twinkle(c, h.x, h.y - 4, 2 + k * 3);
      });
      const runs = [];
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const col = STR[i % 5], f = fc0(), off = (i - (m.hits - 1) / 2) * 5;
        const p0 = { x: f.x - 14 + off, y: f.y - 32 }, p1 = { x: f.x + 10 + off, y: f.y + 26 };
        const land = once(() => {
          if (G.battle.F.hp <= 0) return;
          m.hit(i);
          slashAt({ x: f.x + off * 0.6, y: f.y }, col, 1.18, 34);
          particles(f.x + off * 0.6, f.y, 6, { colors: [col, '#ffffff'], speed: 60, grav: 40, life: 0.35 });
        });
        runs.push(fxRun(230, (c, k) => {
          const h = heroHand(), e = easeIn(k01(k * 1.6)), x = lerp(p0.x, p1.x, e), y = lerp(p0.y, p1.y, e);
          for (let j = 1; j <= 3; j++) {
            const ee = Math.max(0, e - j * 0.08);
            c.globalAlpha = 0.5 - j * 0.12;
            pxLine(c, h.x, h.y - 4, lerp(p0.x, p1.x, ee), lerp(p0.y, p1.y, ee), col, 1);
          }
          c.globalAlpha = 1;
          pxLine(c, h.x, h.y - 4, x, y, col, 1);
          const g = (G.t * 4 + i * 0.2) % 1;
          pxRect(c, lerp(h.x, x, g), lerp(h.y - 4, y, g), 1, 1, '#ffffff');
          if (e >= 0.5) land();
        }).then(land));
        await wait(115);
      }
      await Promise.all(runs);
      await wait(200);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 180);
    },

    // Birdcage: strings shoot into the sky and come down around the foe as a cage of thread,
    // which closes in until it cuts.
    cage: async m => {
      const H = G.hero, fc = fc0(), apex = { x: fc.x, y: VIEW.y + 4 };
      Sfx.play('charge');
      const dark = fxRun(2250, (c, k) => tintView(c, '#14081c', 0.35 * Math.sin(Math.min(1, k * 1.2) * Math.PI)));
      tween(H, { oy: -2, squash: -0.1 }, 260);
      await fxRun(380, (c, k) => {
        const h = { x: H.x + H.ox + 8, y: 94 + H.oy }, e = easeIn(k);
        for (let j = 0; j < 4; j++) pxLine(c, h.x, h.y, lerp(h.x, apex.x - 6 + j * 4, e), lerp(h.y, apex.y, e), '#ffffff', 1);
        twinkle(c, h.x, h.y, 3);
      });
      const N = 18, phis = Array.from({ length: N }, (_, i) => i / N * Math.PI * 2 + 0.17);
      const S = { reach: 0, R: 96 };
      const str = (c, phi, col, glint) => {
        let px = apex.x, py = apex.y;
        for (let s = 1; s <= 12; s++) {
          const q = s / 12;
          if (q > S.reach) break;
          const x = apex.x + Math.cos(phi) * S.R * Math.sin(q * Math.PI / 2), y = lerp(apex.y, 122 + Math.sin(phi) * S.R * 0.12, q);
          pxLine(c, px, py, x, y, col, 1);
          if (glint && Math.abs(q - ((G.t * 1.5 + phi) % 1)) < 0.05) pxRect(c, x - 1, y - 1, 2, 2, '#ffffff');
          px = x; py = y;
        }
      };
      const cageDraw = layer(c => {
        for (const phi of phis) if (Math.sin(phi) < 0) str(c, phi, '#8a7a98', false);
        foeOver(c);
        for (const phi of phis) if (Math.sin(phi) >= 0) str(c, phi, S.R < 40 && Math.floor(G.t * 20) % 2 ? '#ff8ab0' : '#f4eef8', true);
        twinkle(c, apex.x, apex.y, 3 + Math.sin(G.t * 20));
      });
      Sfx.play('slash');
      await tween(S, { reach: 1 }, 520, easeIn);
      Sfx.play('charge');
      shake(2, 600);
      await tween(S, { R: foeW() * 0.5 + 8 }, 620, easeIn);
      m.hit(0);
      Sfx.play('slash');
      screenFlash('#ffffff', 0.55);
      shake(6, 360);
      const f = fc0();
      for (let i = 0; i < 4; i++) slashAt({ x: f.x + (i - 1.5) * 4, y: f.y + (i % 2 ? 4 : -4) }, i % 2 ? '#ffffff' : '#ff8ab0', i % 2 ? 0.7 : -0.7, 34);
      particles(f.x, f.y, 24, { colors: ['#ffffff', '#ff8ab0', '#f2c7d8'], speed: 100, grav: 60 });
      await wait(260);
      await tween(S, { reach: 0 }, 260, easeOut);
      cageDraw();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
      await dark;
    },

    // ===== Paw-Paw Fruit =====

    // Pad Cannon: a shove with the paw pad so hard the air itself flies at the foe as a paw.
    pawcannon: async m => {
      const H = G.hero, F = G.battle.F, tgt = front();
      const paw = (c, x, y, s, a, col) => {
        const parts = [[0, 2.5, 6, 4.6], [-6.2, -3.6, 2, 2.6], [-2.3, -6.6, 2.1, 2.8], [2.3, -6.6, 2.1, 2.8], [6.2, -3.6, 2, 2.6]];
        c.globalAlpha = a;
        for (const [dx, dy, rx, ry] of parts) oval(c, x + dx * s, y + dy * s, rx * s + 1, ry * s + 1, '#ffffff');
        for (const [dx, dy, rx, ry] of parts) oval(c, x + dx * s, y + dy * s, rx * s, ry * s, col || '#f2a8c0');
        for (const [dx, dy, rx, ry] of parts) oval(c, x + (dx - rx * 0.3) * s, y + (dy - ry * 0.35) * s, rx * s * 0.4, ry * s * 0.35, '#ffe0ea');
        c.globalAlpha = 1;
      };
      Sfx.play('charge');
      tween(H, { ox: -5, squash: 0.1 }, 220);
      await fxRun(240, (c, k) => {
        const h = heroHand();
        palm(c, h.x + 3, h.y - 2, 2, null, true);
        c.globalAlpha = 0.6;
        pxRing(c, h.x + 3, h.y - 4, 8 + Math.sin(G.t * 30) + (1 - k) * 6, '#f2a8c0', 1);
        c.globalAlpha = 1;
      });
      Sfx.play('boom');
      tween(H, { ox: 8, squash: -0.06 }, 90, easeIn);
      const from = { x: heroHand().x + 10, y: heroHand().y - 3 };
      const land = once(() => {
        m.hit(0);
        Sfx.play('boom');
        fxRun(380, (c, k) => paw(c, tgt.x + 2, tgt.y, 1.2 + k * 1.2, 0.9 * (1 - k), '#ffffff'));
        ringOut(tgt, '#f2a8c0', 4, 30, 380, 2);
        ringOut(tgt, '#ffffff', 2, 20, 300, 1);
        impact(tgt, ['#ffffff', '#f2c7d8'], 14);
        shake(4, 240);
        tween(F, { ox: 10 }, 100).then(() => tween(F, { ox: 0 }, 240));
      });
      await fxRun(280, (c, k) => {
        const e = easeIn(k) * 0.6 + k * 0.4, x = lerp(from.x, tgt.x, e), y = lerp(from.y, tgt.y, e), s = 0.6 + e * 0.6;
        c.globalAlpha = 0.5;
        for (let i = 1; i <= 3; i++) { const t = Math.max(0, e - i * 0.12); ringE(c, lerp(from.x, tgt.x, t), lerp(from.y, tgt.y, t), 2 + i, (5 + i * 2) * s, '#ffffff', 1); }
        c.globalAlpha = 1;
        paw(c, x, y, s, 0.85);
        if (k >= 0.98) land();
      });
      land();
      await wait(160);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
    },

    // ===== Weapons =====

    // A plain weapon swing: step in and carve an arc through the foe.
    swing: async m => {
      const H = G.hero, col = m.color || '#ffffff', P = { a: -2.5, sw: false, from: 0, cut: 0, behind: true };
      hold(true);
      const bl = bladeLayer(wpn('cutlass', sh => !['gun', 'cannon', 'cannonarm', 'shell', 'bubbler', 'lamp', 'slingshot', 'knives', 'ring', 'rope', 'gloves', 'gauntlet', 'knuckles', 'claws', 'whip'].includes(sh)), P, col, 22);
      await tween(H, { ox: -3, squash: 0.1 }, 90);
      await tween(H, { ox: 44, squash: -0.04 }, 120, easeIn);
      Sfx.play('slash');
      Object.assign(P, { sw: true, from: P.a, behind: false });
      await tween(P, { a: 0.9 }, 110, easeOut);
      m.hit(0);
      slashAt(fc0(), col, 0.8, 34);
      impact(fc0(), ['#ffffff', col], 10);
      shake(2, 120);
      await tween(P, { cut: 1 }, 160);
      bl();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 200);
    },

    // Double Cut: two quick cuts, down then up, that cross into an X and flare.
    multislash: async m => {
      const H = G.hero, col = m.color || '#ffffff', P = { a: -2.4, sw: false, from: 0, cut: 0, behind: true };
      hold(true);
      const bl = bladeLayer(wpn('cutlass', BLADES), P, col, 22);
      await tween(H, { ox: -3, squash: 0.1 }, 90);
      await tween(H, { ox: 42, squash: -0.04 }, 120, easeIn);
      let n = 0;
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const down = i % 2 === 0;
        Object.assign(P, { sw: true, from: P.a, cut: 0, behind: false });
        Sfx.play('slash');
        tween(H, down ? { ox: 42, oy: 0 } : { ox: 48, oy: -4 }, 100);
        await tween(P, { a: down ? 0.9 : -1.0 }, 100, easeOut);
        m.hit(i);
        n++;
        const f = fc0();
        slashAt(f, col, down ? 0.75 : -0.75, 38);
        impact(f, ['#ffffff', col], 8);
        shake(2, 100);
        tween(P, { cut: 1 }, 140);
        await wait(110);
      }
      if (n > 1) {
        const f = fc0();
        await fxRun(260, (c, k) => {
          const w = Math.max(1, Math.round(4 * (1 - k))), L = 16 + k * 6;
          for (const a of [0.75, -0.75]) {
            const dx = Math.cos(a) * L, dy = Math.sin(a) * L;
            pxLine(c, f.x - dx, f.y - dy, f.x + dx, f.y + dy, col, w + 2);
            pxLine(c, f.x - dx, f.y - dy, f.x + dx, f.y + dy, '#ffffff', w);
          }
          if (k < 0.3) twinkle(c, f.x, f.y, 6, '#ffffff');
        });
        particles(f.x, f.y, 14, { colors: [col, '#ffffff'], speed: 90, grav: 40 });
      }
      bl();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Flying Slash: the blade is raised as wind rushes to its edge, then one swing throws a
    // crescent of cutting air through the foe and on across the field.
    crescent: async m => {
      const H = G.hero, col = m.color || '#ffffff', P = { a: -0.6, sw: false, from: 0, cut: 0, behind: true };
      const moon = (c, x, y, R) => {
        const dk = mixColor(col, '#3a5a8a', 0.45);
        for (let i = 0; i <= 28; i++) {
          const a = -1.35 + i / 28 * 2.7, ox = x + Math.cos(a) * R - R, oy = y + Math.sin(a) * R * 1.25, th = Math.max(1, R * 0.55 * Math.cos(a * 1.1));
          pxLine(c, ox - th, oy, ox, oy, col, 2);
          pxRect(c, ox - th - 1, oy, 1, 1, dk);
          pxRect(c, ox, oy, 2, 2, '#ffffff');
        }
      };
      hold(true);
      const bl = bladeLayer(wpn('cutlass', BLADES), P, col, 24);
      Sfx.play('charge');
      tween(H, { ox: -6, squash: 0.16 }, 300);
      tween(P, { a: -2.8 }, 300);
      await fxRun(400, (c, k) => {
        const g = gripAt(), tip = { x: g.x + Math.cos(P.a) * 18, y: g.y + Math.sin(P.a) * 18 };
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + 0.3, r0 = 30 * (1 - k) + 6;
          pxLine(c, tip.x + Math.cos(a) * r0, tip.y + Math.sin(a) * r0, tip.x + Math.cos(a) * (r0 + 7), tip.y + Math.sin(a) * (r0 + 7), i % 2 ? col : '#ffffff', 1);
        }
        if (k > 0.7) twinkle(c, tip.x, tip.y, 4);
      });
      dust(H.x - 6, 6);
      Sfx.play('slash');
      Object.assign(P, { sw: true, from: P.a, cut: 0, behind: false });
      tween(H, { ox: 10, squash: -0.08 }, 120, easeIn);
      await tween(P, { a: 1.0 }, 130, easeOut);
      tween(P, { cut: 1 }, 200);
      const x0 = H.x + H.ox + 24, y0 = 102, fc = fc0(), x1 = VIEW.x + VIEW.w + 30;
      const land = once(() => {
        m.hit(0);
        Sfx.play('slash');
        slashAt(fc0(), col, 1.35, 48);
        impact(fc0(), ['#ffffff', col], 16);
        focusLines(fc0(), '#ffffff', 220);
        shake(5, 280);
      });
      await fxRun(520, (c, k) => {
        const x = lerp(x0, x1, easeIn(k) * 0.5 + k * 0.5), y = lerp(y0, fc.y, k01((x - x0) / (fc.x - x0)));
        c.globalAlpha = 0.7;
        streaks(c, x - 20, y, 5, 26, 5, col);
        c.globalAlpha = 1;
        moon(c, x, y, 14);
        if (Math.random() < 0.7) particles(x - 6, 119, 1, { colors: DIRT, speed: 40, grav: 120, dir: -Math.PI * 0.75, spread: 0.6, life: 0.4 });
        if (x >= fc.x) land();
      });
      land();
      bl();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // A gunshot: the pistol kicks, a muzzle flash, a tracer, a spark where it hits.
    shot: async m => {
      const H = G.hero, W = wpn('flintlock', ['gun']), P = { kick: 0 };
      hold(true);
      const gunAt = () => ({ x: H.x + H.ox + 10, y: 105 + H.oy });
      const gun = layer(c => { const g = gunAt(); drawWpn(c, W, g.x, g.y, -Math.PI / 2 - P.kick); });
      await wait(60);
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const g = gunAt(), mz = { x: g.x + 13, y: g.y - 4 }, tgt = fc0();
        Sfx.play('shot');
        fxRun(110, (c, k) => {
          if (k > 0.7) return;
          pxCircle(c, mz.x + 2, mz.y, 3 * (1 - k * 0.8), '#ffd04a');
          twinkle(c, mz.x + 3, mz.y, 4 + 3 * (1 - k), '#fff3a0');
        });
        particles(mz.x + 2, mz.y, 4, { colors: SMK.slice(1), speed: 20, grav: -30, life: 0.4, size: 2 });
        FX.parts.push({ x: g.x + 4, y: g.y - 4, vx: -30, vy: -70, grav: 300, life: 0.5, max: 0.5, color: '#e6b422', size: 1 });
        P.kick = 0.45;
        tween(P, { kick: 0 }, 180);
        tween(H, { ox: -4 }, 50).then(() => tween(H, { ox: 0 }, 150));
        await fxRun(110, (c, k) => {
          const x = lerp(mz.x, tgt.x, k), y = lerp(mz.y, tgt.y, k), t = Math.max(0, k - 0.35);
          pxLine(c, lerp(mz.x, tgt.x, t), lerp(mz.y, tgt.y, t), x, y, '#ffe14a', 1);
          pxRect(c, x - 2, y - 1, 4, 2, m.color || '#ffe14a');
          pxRect(c, x - 1, y - 1, 2, 1, '#ffffff');
        });
        m.hit(i);
        impact(tgt, ['#ffffff', '#ffe14a'], 8);
        await wait(110);
      }
      await wait(80);
      gun();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 120);
    },

    // Point Blank: step right up, press the muzzle to the foe, and blow it away.
    blast: async m => {
      const H = G.hero, F = G.battle.F, W = wpn('flintlock', ['gun']), P = { kick: 0 };
      hold(true);
      const gunAt = () => ({ x: H.x + H.ox + 10, y: 105 + H.oy });
      const gun = layer(c => { const g = gunAt(); drawWpn(c, W, g.x, g.y, -Math.PI / 2 - P.kick); });
      await tween(H, { ox: -3, squash: 0.08 }, 90);
      await tween(H, { ox: 38, squash: -0.04 }, 140, easeIn);
      Sfx.play('charge');
      await fxRun(260, (c, k) => { const g = gunAt(); if (Math.floor(k * 8) % 2) twinkle(c, g.x + 13, g.y - 4, 3, '#ff5a2a'); });
      Sfx.play('boom');
      const g = gunAt(), mz = { x: g.x + 13, y: g.y - 4 }, fc = fc0();
      m.hit(0);
      screenFlash('#ffd04a', 0.5);
      focusLines(fc, '#ffe14a', 280);
      shake(6, 380);
      P.kick = 0.7;
      tween(P, { kick: 0 }, 360);
      fxRun(320, (c, k) => {
        const fade = 1 - k, Q = [];
        for (let s = 0; s < 50; s += 3) Q.push({ x: mz.x + s, y: mz.y + Math.sin(s * 0.5 + G.t * 40) * s * 0.06, w: (2 + s * 0.22) * fade });
        blaze(c, Q);
      });
      impact(fc, ['#ffffff', '#ffd04a', '#ff5a2a'], 18);
      tween(F, { ox: 18 }, 120).then(() => tween(F, { ox: 0 }, 320));
      tween(H, { ox: 18, squash: 0.1 }, 200, easeOut);
      dust(H.x + 30, 6);
      fxRun(650, (c, k) => {
        c.globalAlpha = 1 - k;
        for (let i = 0; i < 2; i++) ringE(c, mz.x - 4 - k * 10 - i * 6, mz.y - k * 18 - i * 4, 3 + k * 5 + i, 2 + k * 3, '#dfe2ea', 1);
        c.globalAlpha = 1;
      });
      particles(mz.x, mz.y, 10, { colors: SMK, speed: 30, grav: -30, life: 0.7, size: 3 });
      await wait(420);
      gun();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Riptide: drive the trident into the ground and a breaking wave rolls across onto the foe.
    wave: async m => {
      const H = G.hero, F = G.battle.F, col = m.color || '#4fa3e0', P = { a: -1.6 };
      const WV = [mixColor(col, INK, 0.6), mixColor(col, '#000000', 0.3), col, mixColor(col, '#ffffff', 0.5)];
      const curl = (c, fx, h, len) => {
        for (let x = fx - len; x <= fx; x += 2) {
          const q = (x - (fx - len)) / len, hh = Math.round(h * Math.pow(q, 1.4) * (1 + Math.sin(x * 0.3 - G.t * 20) * 0.05));
          if (hh < 1) continue;
          const y = 122 - hh;
          pxRect(c, x, y - 1, 2, hh + 1, WV[0]);
          pxRect(c, x, y, 2, hh, WV[2]);
          pxRect(c, x, 122 - Math.round(hh * 0.4), 2, Math.round(hh * 0.4), WV[1]);
          pxRect(c, x, y, 2, 2, WV[3]);
          if (((x - fx) >> 1) % 5 === 0) pxRect(c, x, y + 4 + Math.abs(x % 5), 2, 1, WV[3]);
        }
        const R = h * 0.3, cy = 122 - h + R, L = [];
        for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI * 0.9; L.push([fx + Math.cos(a) * R, cy + Math.sin(a) * R, Math.max(1, (3.5 - i * 0.45) * h / 30)]); }
        for (const p of L) pxCircle(c, p[0], p[1], p[2] + 1, WV[0]);
        for (const p of L) pxCircle(c, p[0], p[1], p[2], WV[2]);
        for (const p of L) pxCircle(c, p[0] - 0.5, p[1] - p[2] * 0.4, p[2] * 0.6, '#ffffff');
      };
      hold(true);
      const W = wpn('trident', ['trident', 'spear', 'staff', 'gstaff', 'mogura']);
      const held = layer(c => { const g = gripAt(); drawWpn(c, W, g.x, g.y, P.a); });
      await tween(P, { a: -1.9 }, 160);
      Sfx.play('splash');
      await tween(P, { a: 1.3 }, 120, easeIn);
      dust(H.x + 14, 5);
      particles(H.x + 16, 118, 10, { colors: [col, WV[3], '#ffffff'], speed: 70, grav: 200, dir: -Math.PI / 2, spread: 1, life: 0.5 });
      const x0 = H.x + 16, fc = fc0();
      const land = once(() => {
        m.hit(0);
        Sfx.play('splash');
        const f = fc0();
        impact(f, ['#ffffff', WV[3]], 12);
        particles(f.x, f.y, 26, { colors: [col, WV[3], '#ffffff'], speed: 120, grav: 220, life: 0.7, dir: -Math.PI / 2, spread: 2.6 });
        groundRing(f.x, '#ffffff', 6, 34, 420, 1);
        shake(3, 220);
        tween(F, { squash: 0.15 }, 90).then(() => tween(F, { squash: 0 }, 220));
      });
      await fxRun(900, (c, k) => {
        const kt = Math.min(1, k / 0.82), fx = lerp(x0, fc.x + 4, easeIn(kt) * 0.4 + kt * 0.6), h0 = 10 + Math.sin(Math.min(1, kt * 1.4) * Math.PI / 2) * 26;
        const h = k < 0.82 ? h0 : h0 * (1 - easeIn((k - 0.82) / 0.18));
        if (h < 2) return;
        curl(c, fx + (k - kt * 0.82) * 30, h, 42);
        if (Math.random() < 0.7) particles(fx + 4, 122 - h, 1, { colors: ['#ffffff', WV[3]], speed: 40, grav: 120, life: 0.4 });
        if (fx >= fc.x - 6) land();
      });
      land();
      await fxRun(360, (c, k) => {
        const w = 20 + k * 30;
        c.globalAlpha = 1 - k;
        pxRect(c, fc.x - w, 119, w * 2, 3, col);
        pxRect(c, fc.x - w, 119, w * 2, 1, '#ffffff');
        c.globalAlpha = 1;
      });
      held();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 160);
    },

    // Sandstorm Dance: a sandstorm whips up and you dance through it, a curved cut on every step.
    sandslash: async m => {
      const H = G.hero, col = m.color || '#e8c27b', P = { a: -2.2, sw: false, from: 0, cut: 0 };
      hold(true);
      const bl = bladeLayer(wpn('scimitar', BLADES), P, col, 22);
      Sfx.play('fire');
      const storm = layer((c, t) => {
        const f = fc0(), h = heroC();
        for (let j = 0; j < 3; j++) { const a0 = G.t * 9 + j * 2.1; ringE(c, f.x, f.y + 8 - j * 10, 20 + j * 3, 5, SANDC[j], 1, a0, a0 + 2.4); }
        for (let i = 0; i < 46; i++) {
          const ph = (t / 650 + hash(i)) % 1;
          let x, y;
          if (ph < 0.45) { const q = ph / 0.45; x = lerp(h.x - 10, f.x, q); y = lerp(h.y + 10, f.y, q) + Math.sin(q * 9 + i) * 6; }
          else { const a = (ph - 0.45) * 14 + i; x = f.x + Math.cos(a) * (18 + hash(i + 4) * 8); y = f.y + Math.sin(a) * 9 - (ph - 0.45) * 22; }
          pxRect(c, x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2, SANDC[i % 3]);
        }
      });
      await tween(H, { ox: -3, squash: 0.1 }, 120);
      await tween(H, { ox: 42, squash: 0 }, 140, easeIn);
      for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
        const up = i % 2 === 1;
        Object.assign(P, { sw: true, from: P.a, cut: 0 });
        H.ox = 40 + (i % 2) * 8;
        H.oy = up ? -5 : 0;
        Sfx.play('slash');
        await tween(P, { a: up ? -1.1 : 1.0 }, 80, easeOut);
        m.hit(i);
        const f = fc0(), p = { x: f.x + rand(-5, 5), y: f.y + rand(-8, 8) };
        slashAt(p, col, (up ? -0.7 : 0.8) + rand(-0.3, 0.3), 30);
        particles(p.x, p.y, 8, { colors: SANDC, speed: 70, grav: 60, life: 0.45 });
        shake(2, 90);
        tween(P, { cut: 1 }, 120);
        await wait(110);
      }
      storm();
      particles(fc0().x, 116, 16, { colors: SANDC, speed: 50, grav: 120, life: 0.6 });
      bl();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // Thunder Judgment: storm clouds swirl together above the foe while lightning crawls up your
    // staff, then a pillar of lightning crashes down.
    thunder: async m => {
      const H = G.hero, F = G.battle.F, fc = fc0(), P = { a: -1.3 };
      const W = wpn('thunderstaff', ['gstaff', 'staff', 'trident', 'spear', 'scepter']);
      hold(true);
      const staff = layer(c => { const g = gripAt(); drawWpn(c, W, g.x, g.y, P.a); });
      Sfx.play('charge');
      tween(P, { a: -1.65 }, 240);
      tween(H, { oy: -2, squash: -0.08 }, 240);
      const sky = { x: fc.x, y: VIEW.y + 18 };
      const storm = fxRun(2100, (c, k) => {
        const a = Math.min(1, k * 3) * (k > 0.85 ? (1 - k) / 0.15 : 1);
        tintView(c, '#0a0a1a', 0.38 * a);
        c.globalAlpha = 0.95 * a;
        const P = [];
        for (let i = 0; i < 24; i++) {
          const ang = i / 24 * Math.PI * 2 + G.t * 1.6, r = 70 - k * 18;
          P.push([sky.x + Math.cos(ang) * r, sky.y + Math.sin(ang) * r * 0.22, 9 + (i % 3) * 2]);
        }
        clouds(c, P, ['#0e0e1c', '#1c1c30', '#2c2c46', '#4a4a6a']);
        pxCircle(c, sky.x, sky.y, 4 + k * 6, k > 0.3 ? '#bfe6ff' : '#3c3c5a');
        c.globalAlpha = 1;
        if (Math.random() < 0.18 * a) { const x = sky.x + rand(-60, 60); zigzag(c, x, sky.y, x + rand(-10, 10), sky.y + 16, 3, 3, '#bfe6ff', 1); }
      });
      await fxRun(700, (c, k) => {
        const g = gripAt(), tip = { x: g.x + Math.cos(P.a) * 26, y: g.y + Math.sin(P.a) * 26 };
        if (Math.floor(k * 18) % 2) for (let i = 0; i < 2; i++) zigzag(c, g.x - 2 + i * 4, g.y, tip.x - 2 + i * 4, tip.y, 4, 2, i ? '#ffffff' : '#ffe14a', 1);
        pxRing(c, tip.x, tip.y, 3 + k * 3 + Math.sin(G.t * 40), '#ffe14a', 1);
        if (k > 0.5) zigzag(c, tip.x, tip.y, sky.x, sky.y + 8, 7, 4, k > 0.8 ? '#ffffff' : '#7cd0ff', 1);
      });
      Sfx.play('zap');
      Sfx.play('boom');
      m.hit(0);
      screenFlash('#ffffff', 1);
      shake(9, 650);
      focusLines(fc, '#fff6a0', 360);
      const bolts = flicker(() => [0, 1, 2].map(i => jag(sky.x + rand(-4, 4), sky.y + 6, fc.x + rand(-3, 3), 121, 9, 5 + i * 3)));
      fxRun(650, (c, k) => {
        if (k > 0.55 && Math.floor(k * 24) % 2) return;
        const w = Math.max(2, Math.round(13 * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88 * 0.7)));
        const B = bolts();
        c.globalAlpha = 0.45;
        pxRect(c, fc.x - w - 6, sky.y, (w + 6) * 2, 121 - sky.y, '#7cd0ff');
        c.globalAlpha = 1;
        zap(c, B[1], Math.max(1, w - 4), '#3a6ad8', '#7cd0ff');
        zap(c, B[2], Math.max(1, w - 6), '#3a6ad8', '#bfe6ff');
        zap(c, B[0], w, '#7cd0ff', '#ffe14a');
        for (let i = 1; i < B[0].length; i++) pxLine(c, B[0][i - 1][0], B[0][i - 1][1], B[0][i][0], B[0][i][1], '#ffffff', Math.max(1, Math.round(w * 0.4)));
        oval(c, fc.x, 121, 14 + w, 3, '#fff6a0');
      });
      groundRing(fc.x, '#ffe14a', 6, 56, 560, 2);
      groundRing(fc.x, '#7cd0ff', 4, 40, 460, 1);
      groundCrack(fc.x - 40, fc.x + 40, INK, 300);
      particles(fc.x, fc.y, 36, { colors: ['#ffe14a', '#7cd0ff', '#ffffff'], speed: 140 });
      tween(F, { squash: 0.25 }, 80).then(() => tween(F, { squash: 0 }, 320));
      await fxRun(420, (c, k) => {
        if (Math.random() < 0.6 * (1 - k)) { const f = fc0(); zigzag(c, f.x + rand(-12, 12), f.y - 14, f.x + rand(-12, 12), f.y + 14, 4, 3, Math.random() < 0.5 ? '#ffffff' : '#ffe14a', 1); }
        if (Math.random() < 0.3) particles(fc.x + rand(-8, 8), fc.y - 6, 1, { colors: ['#3a3440', '#5a5260'], speed: 20, grav: -40, life: 0.6, size: 2 });
      });
      staff();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
      await storm;
    },

    // Club Smash: leap with the club raised high and bring it crashing down.
    smash: async m => {
      const H = G.hero, F = G.battle.F, col = m.color || '#e8d9b0', P = { a: -1.2, sw: false, from: 0, cut: 0, behind: true };
      hold(true);
      const bl = bladeLayer(wpn('club', ['club', 'kanabo', 'hammer', 'scepter', 'chain']), P, col, 22);
      tween(P, { a: -2.7 }, 220);
      await tween(H, { ox: 26, oy: -28, squash: -0.1 }, 220, easeOut);
      Object.assign(P, { sw: true, from: P.a, cut: 0, behind: false });
      tween(P, { a: 0.7 }, 120, easeIn);
      await tween(H, { ox: 48, oy: 0, squash: 0.18 }, 120, easeIn);
      Sfx.play('boom');
      m.hit(0);
      const fc = fc0();
      impact(fc, ['#ffffff', '#ffe14a', '#c9b88a'], 16);
      groundRing(fc.x, '#ffffff', 6, 36, 380, 1);
      groundCrack(fc.x - 30, fc.x + 34, INK, 260);
      dust(fc.x - 8, 10);
      dust(fc.x + 10, 10);
      particles(fc.x, 118, 8, { colors: ['#6a5a4a', '#8a7a6a'], speed: 90, grav: 220, dir: -Math.PI / 2, spread: 1.6, size: 2 });
      tween(F, { squash: 0.3 }, 70).then(() => tween(F, { squash: 0 }, 260));
      shake(5, 300);
      tween(P, { cut: 1 }, 160);
      await wait(220);
      bl();
      hold(false);
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 220);
    },

    // ===== Haki =====

    // Armament Haki: a dark aura rushes in, you raise your fist and black creeps up it from the
    // knuckles, hard and glossy as steel; a gleam runs down it with a ring of steel.
    armament: async m => {
      const H = G.hero, C = { coat: 0, raise: 0, gleam: -1, body: 0 };
      const steel = HAKIC;
      Sfx.play('haki');
      tween(H, { squash: 0.1 }, 200);
      const aura = fxRun(1250, (c, k) => {
        const hc = heroC(), env = k > 0.8 ? (1 - k) / 0.2 : 1;
        for (let i = 0; i < 22; i++) {
          const a = i * 0.2856 + hash(i) * 0.6, ph = (k * 2.6 + hash(i + 5)) % 1, r0 = 26 * (1 - ph) + 5, r1 = r0 + 4 + 7 * (1 - ph);
          c.globalAlpha = Math.min(1, ph * 3) * env;
          pxLine(c, hc.x + Math.cos(a) * r1, hc.y + Math.sin(a) * r1 * 0.85, hc.x + Math.cos(a) * r0, hc.y + Math.sin(a) * r0 * 0.85, i % 4 === 0 ? '#c9a8ff' : i % 2 ? '#2a1a3a' : '#7a4ac0', i % 3 ? 1 : 2);
        }
        c.globalAlpha = 0.5 * env;
        pxRing(c, hc.x, hc.y, 30 - ((k * 3) % 1) * 22, '#3a2a5a', 1);
        c.globalAlpha = 1;
      });
      const arm = layer(c => {
        const x = H.x + H.ox, oy = H.oy;
        if (C.body > 0) {
          drawSpriteAt(c, getSprite(heroSpec(), 'tint', '#2a1a3a'), x, 121 + oy, 2, { squash: H.squash + Math.sin(G.t * 5) * 0.02, alpha: C.body, shadow: false });
          if (!H.swing && G.p.weapon) drawHeldWeapon(c, x, 121 + oy, 2);
        }
        // both arms blacken from the hands up
        const ch = Math.round(7 * C.coat);
        if (ch > 0) {
          pxRect(c, x - 10, 112 + oy - ch, 2, ch, steel[2]);
          pxRect(c, x + 8, 112 + oy - ch, 2, ch, steel[2]);
          pxRect(c, x - 10, 112 + oy - ch, 1, 1, steel[3]);
        }
        if (C.raise <= 0.02) return;
        // the raised forearm, black creeping from the fist to the elbow
        const el = { x: x + 10, y: 109 + oy }, fs = { x: x + 13, y: lerp(108, 95, C.raise) + oy };
        limb(c, el.x, el.y, fs.x, fs.y + 3, 3, 0);
        if (C.coat > 0) { const t = Math.min(1, C.coat); limb(c, fs.x, fs.y + 3, lerp(fs.x, el.x, t), lerp(fs.y + 3, el.y, t), 3, 0, steel); }
        fist(c, fs.x, fs.y, 3, 0, C.coat > 0.15 ? steel : null);
        if (C.coat > 0.15) { pxRect(c, fs.x - 2, fs.y - 2, 1, 2, '#c9b8e8'); pxRect(c, fs.x - 1, fs.y - 3, 2, 1, '#c9b8e8'); }
        // the gleam sliding down the steel
        if (C.gleam >= 0 && C.gleam <= 1) {
          const gx = lerp(fs.x, el.x, C.gleam), gy = lerp(fs.y, el.y, C.gleam);
          pxLine(c, gx - 2, gy + 1, gx + 2, gy - 1, '#ffffff', 1);
          pxRect(c, gx - 1, gy - 1, 1, 1, '#ffffff');
        }
      });
      await tween(C, { raise: 1 }, 220, easeOut);
      Sfx.play('charge');
      await tween(C, { coat: 1 }, 440, easeIn);
      Sfx.play('perfect');
      const fs = { x: H.x + H.ox + 13, y: 95 + H.oy };
      fxRun(320, (c, k) => twinkle(c, fs.x - 2, fs.y - 3, Math.round(7 * (1 - k)) + 1, k < 0.5 ? '#ffffff' : '#c9b8e8'));
      tween(C, { gleam: 1.2 }, 260);
      tween(C, { body: 1 }, 360);
      ringOut(heroC(), '#7a4ac0', 4, 30, 360, 2);
      ringOut(heroC(), '#1b1424', 2, 22, 300, 1);
      screenFlash('#1b1424', 0.25);
      shake(2, 120);
      await wait(380);
      await tween(C, { raise: 0 }, 160);
      arm();
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 120);
      await aura;
    },

    // Conqueror's Haki: dark flames of will lick up around you, then it is released: the air goes
    // black and red, black lightning cracks outward and the foe trembles under the pressure.
    conqueror: async m => {
      const H = G.hero, F = G.battle.F;
      Sfx.play('haki');
      tween(H, { squash: 0.12 }, 260);
      await fxRun(440, (c, k) => {
        const x = H.x + H.ox;
        for (let i = 0; i < 6; i++) tongue(c, x - 13 + i * 5, 121, (6 + k * 14) * (0.7 + 0.3 * Math.sin(G.t * 9 + i)), 5, i * 1.3, HAKI_T);
        heroOver(c);
        if (Math.random() < 0.6) particles(x + rand(-12, 12), 110, 1, { colors: ['#1b1424', '#d8432f'], speed: 30, grav: -60, life: 0.5 });
      });
      Sfx.play('boom');
      Sfx.play('haki');
      screenFlash('#1b0010', 0.9);
      shake(8, 1100);
      tween(H, { squash: -0.06 }, 120);
      const hc = heroC();
      groundCrack(hc.x - 30, hc.x + 44, INK, 300);
      const bolts = flicker(() => Array.from({ length: 9 }, (_, i) => {
        const a = i / 9 * Math.PI * 2 + rand(-0.3, 0.3), L = rand(50, 130);
        return jag(hc.x, hc.y - 4, hc.x + Math.cos(a) * L, hc.y - 4 + Math.sin(a) * L * 0.7, 6, 7);
      }));
      await fxRun(1150, (c, k) => {
        const env = k < 0.1 ? k / 0.1 : k > 0.75 ? (1 - k) / 0.25 : 1;
        tintView(c, '#2a0010', env * (0.55 + 0.1 * Math.sin(G.t * 30)));
        for (let i = 0; i < 3; i++) {
          const q = (k * 1.6 + i / 3) % 1;
          c.globalAlpha = env * (1 - q);
          ringE(c, hc.x, hc.y, q * 260, q * 190, i % 2 ? '#d8432f' : '#7a0a1a', 2);
        }
        c.globalAlpha = 1;
        if (k < 0.8) {
          for (const pts of bolts()) zap(c, pts, 2, '#d8432f', '#05030a');
          const B = bolts();
          for (let j = 0; j < B.length; j += 3) for (let i = 1; i < B[j].length; i += 2) pxLine(c, B[j][i - 1][0], B[j][i - 1][1], B[j][i][0], B[j][i][1], '#ff9a8a', 1);
        }
        heroOver(c);
        // the foe trembles, cold sweat flying off it
        F.kx = Math.max(F.kx || 0, rand(0, 3));
        const t = foeTop(), f = fc0();
        if (Math.floor(G.t * 10) % 2) for (let i = -1; i <= 1; i++) pxLine(c, f.x + i * 6, t - 10 - Math.abs(i) * 2, f.x + i * 8, t - 4 - Math.abs(i) * 2, '#bfe6ff', 1);
      });
      await tween(H, { ox: 0, oy: 0, squash: 0 }, 160);
    },
  });
}
