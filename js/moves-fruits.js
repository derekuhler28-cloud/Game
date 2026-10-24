'use strict';
/* Move animations for the Phoenix, Op-Op, Dark-Dark, Rumble-Rumble, Sand-Sand and Flower-Flower fruits,
   awakened moves included. */
{
  // ---------- small drawing helpers (block-scoped so they can't clash with game.js) ----------

  const PHX = ['#1f5aa8', '#3a9ae8', '#bfe6ff', '#ffd04a'];
  const GOLDF = ['#c98a1a', '#ffd04a', '#fff3a0'];
  const DARK = ['#1b1424', '#3a2a4a', '#8a5ac0'];
  const VOLT = ['#3a7ad8', '#bfe6ff', '#ffffff', '#ffe14a'];
  const DUNE = ['#e8c890', '#a8864a', '#f5e0b0', '#c9a46a'];
  const PETAL = ['#ffb0e0', '#ff8ac8', '#9a5ac8', '#ffffff'];
  const SKIN = '#f3c08c', SKIN_SH = '#d8a070';

  const k01 = v => Math.max(0, Math.min(1, v));
  const foeW = () => getSprite(G.battle.F.spr).width * G.battle.F.scale;
  const petals = (x, y, n, spd) => particles(x, y, n, { colors: PETAL, speed: spd || 50, grav: 30, life: 0.8 });

  // Draws the foe again on top of an effect, so a pit or a shadow can sit behind it.
  const foeOver = c => {
    const F = G.battle.F;
    drawSpriteAt(c, getSprite(F.spr, F.flash > 0 ? 'flash' : ''), F.x + F.ox, F.y + F.oy - foeLift(), F.scale, { squash: F.squash + Math.sin(G.t * 4) * 0.02, alpha: F.alpha, shadow: false });
  };

  // Draws the hero again on top of an effect (wings that grow from its back).
  const heroOver = c => {
    const hero = G.hero;
    drawSpriteAt(c, heroSprite(), hero.x + hero.ox, 121 + hero.oy, 2, { squash: hero.squash, alpha: hero.alpha, shadow: false, flip: !!hero.form });
  };

  // Filled oval; `front` draws only the half below its centre line (the part in front of the foe's feet).
  const oval = (c, x, y, rx, ry, col, front) => {
    if (rx < 1 || ry < 1) return;
    for (let dy = front ? 0 : -Math.floor(ry); dy <= ry; dy++) {
      const hw = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry)));
      pxRect(c, x - hw, y + dy, hw * 2, 1, col);
    }
  };

  // A tilted ellipse outline (shockwaves seen from the side).
  const ellipse = (c, x, y, rx, ry, ang, col, t) => {
    const n = Math.max(16, Math.round((rx + ry) * 3)), ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < n; i++) {
      const u = i / n * Math.PI * 2, ex = Math.cos(u) * rx, ey = Math.sin(u) * ry;
      pxRect(c, x + ex * ca - ey * sa, y + ex * sa + ey * ca, t || 1, t || 1, col);
    }
  };

  // Scanline-filled triangle.
  const tri = (c, a, b, d, col) => {
    const y0 = Math.round(Math.min(a[1], b[1], d[1])), y1 = Math.round(Math.max(a[1], b[1], d[1]));
    c.fillStyle = col;
    for (let y = y0; y <= y1; y++) {
      let lo = Infinity, hi = -Infinity;
      for (const [p, q] of [[a, b], [b, d], [d, a]]) {
        if ((p[1] - y) * (q[1] - y) > 0) continue;
        if (p[1] === q[1]) { lo = Math.min(lo, p[0], q[0]); hi = Math.max(hi, p[0], q[0]); continue; }
        const x = p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
        lo = Math.min(lo, x); hi = Math.max(hi, x);
      }
      if (hi >= lo) c.fillRect(Math.round(lo), y, Math.round(hi) - Math.round(lo) + 1, 1);
    }
  };

  // Jagged lightning path from (x0,y0) to (x1,y1), and a cached version that re-rolls a few times a second.
  const jag = (x0, y0, x1, y1, n, amp) => {
    const nx = y0 - y1, ny = x1 - x0, l = Math.hypot(nx, ny) || 1, pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const o = rand(-amp, amp); pts.push([lerp(x0, x1, i / n) + nx / l * o, lerp(y0, y1, i / n) + ny / l * o]); }
    pts.push([x1, y1]);
    return pts;
  };
  const flicker = make => { let tick = -1, v; return () => { const t = Math.floor(G.t * 20); if (t !== tick) { tick = t; v = make(); } return v; }; };
  const bolt = (c, pts, w, outer, inner) => {
    for (let i = 1; i < pts.length; i++) pxLine(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], outer, w + 2);
    for (let i = 1; i < pts.length; i++) pxLine(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], inner, w);
  };

  // A licking flame tongue standing on (x,y), h tall and w wide. cols = [edge, body, core, base].
  const flame = (c, x, y, h, w, ph, cols) => {
    cols = cols || PHX;
    for (let j = 0; j < h; j++) {
      const q = j / h, hw = w / 2 * Math.sqrt(1 - q), cx = x + Math.sin(G.t * 16 + ph + j * 0.3) * q * w * 0.35;
      pxRect(c, cx - hw - 1, y - j, hw * 2 + 2, 1, cols[0]);
      if (hw > 1) pxRect(c, cx - hw * 0.65, y - j, hw * 1.3, 1, cols[1]);
      if (q < 0.6 && hw > 1.5) pxRect(c, cx - hw * 0.3, y - j, hw * 0.6, 1, cols[3] && q < 0.22 ? cols[3] : cols[2]);
    }
  };

  // A fan of blue-flame feathers rooted at (x,y), spread between angles a0 and a1.
  const wing = (c, x, y, a0, a1, len, n) => {
    n = n || 7;
    const w = Math.max(1, Math.round(len / 14));
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1), a = lerp(a0, a1, q), l = len * (0.72 + 0.28 * Math.sin(q * Math.PI)) * (1 + Math.sin(G.t * 16 + i) * 0.04);
      const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l, mx = x + Math.cos(a) * l * 0.6, my = y + Math.sin(a) * l * 0.6;
      pxLine(c, x, y, ex, ey, '#1f5aa8', w + 2);
      pxLine(c, x, y, mx, my, '#3a9ae8', w);
      pxLine(c, mx, my, ex, ey, '#7cd0ff', w);
      pxRect(c, ex - 1, ey - 1, 2, 2, i % 2 ? '#ffd04a' : '#ffffff');
    }
  };

  // A phoenix of blue flame facing angle `ang`; flap 1 = wings up, -1 = down, 0 = folded back.
  const phoenix = (c, x, y, s, ang, flap) => {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (lx, ly) => [x + (lx * ca - ly * sa) * s, y + (lx * sa + ly * ca) * s];
    const seg = (a, b, col, w) => { const p = P(a[0], a[1]), q = P(b[0], b[1]); pxLine(c, p[0], p[1], q[0], q[1], col, Math.max(1, Math.round(w * s))); };
    const dot = (lx, ly, r, col) => { const p = P(lx, ly); pxCircle(c, p[0], p[1], r * s, col); };
    const wingOf = (ox, oy, near) => {
      for (let i = 0; i < 6; i++) {
        const q = i / 5, a = Math.PI + (0.35 + q * 1.15) * flap, l = 9 + Math.sin(q * Math.PI) * 3 - q * 1.5;
        const root = [ox, oy - 1], tip = [root[0] + Math.cos(a) * l, root[1] + Math.sin(a) * l], mid = [lerp(root[0], tip[0], 0.6), lerp(root[1], tip[1], 0.6)];
        seg(root, tip, near ? '#1f5aa8' : '#16407a', 1.6);
        seg(root, mid, near ? '#3a9ae8' : '#1f5aa8', 0.9);
        seg(mid, tip, near ? '#7cd0ff' : '#3a9ae8', 0.9);
      }
    };
    wingOf(1.2, -0.6, false);
    for (let i = 0; i < 3; i++) {
      const end = [-14 - i * 1.5, -3 + i * 3 + Math.sin(G.t * 14 + i * 2) * 1.5], mid = [lerp(-3, end[0], 0.55), lerp(0, end[1], 0.55)];
      seg([-3, 0], end, '#1f5aa8', 1.4);
      seg([-3, 0], mid, '#3a9ae8', 0.8);
      seg(mid, end, '#ffd04a', 0.8);
    }
    dot(-2, 0.4, 2.2, '#1f5aa8'); dot(0, 0, 2.6, '#3a9ae8'); dot(0.6, 0.7, 1.5, '#7cd0ff');
    wingOf(0, 0, true);
    dot(3.4, -1.4, 1.8, '#3a9ae8');
    seg([4.6, -1.2], [6.6, -0.4], '#ffd04a', 0.9);
    seg([2.8, -2.8], [0.6, -5.2], '#ffd04a', 0.6); seg([3.6, -3], [2.8, -6], '#ffd04a', 0.6);
    const e = P(3.9, -1.9);
    pxRect(c, e[0], e[1], 1, 1, '#ffffff');
  };

  // The pineapple-shaped blue blaze of Phoenix Pyreapple.
  const pyre = (c, x, y, s) => {
    const rx = Math.max(1, 14 * s), ry = Math.max(1, 19 * s);
    for (let i = -2; i <= 2; i++) flame(c, x + i * 5 * s, y - ry + 3, Math.round((16 - Math.abs(i) * 4) * s), Math.max(2, Math.round(7 * s)), i * 1.7, GOLDF);
    for (let dy = -Math.floor(ry); dy <= ry; dy++) {
      const hw = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))) + Math.sin(G.t * 24 + dy * 0.7) * s;
      pxRect(c, x - hw - 1, y + dy, hw * 2 + 2, 1, '#1f5aa8');
      pxRect(c, x - hw + 1, y + dy, Math.max(0, hw * 2 - 2), 1, dy < 0 ? '#3a9ae8' : '#2a7ad0');
    }
    for (let d = -4; d <= 4; d++) {
      for (let t = -Math.floor(ry); t <= ry; t++) {
        for (const sg of [1, -1]) {
          const px = x + d * 7 * s + sg * t * 0.7, py = y + t, u = (px - x) / rx, v = t / ry;
          if (u * u + v * v < 0.8) pxRect(c, px, py, 1, 1, '#ffd04a');
        }
      }
    }
    pxCircle(c, x - rx * 0.4, y - ry * 0.35, Math.max(1, 3 * s), '#bfe6ff');
  };

  const plus = (c, x, y, col) => {
    pxRect(c, x - 3, y - 1, 7, 3, PAL.k); pxRect(c, x - 1, y - 3, 3, 7, PAL.k);
    pxRect(c, x - 2, y, 5, 1, col); pxRect(c, x, y - 2, 1, 5, col);
  };

  // Law's ROOM: a pale see-through dome sitting on the ground.
  const room = (c, cx, r, a) => {
    if (r < 2 || a <= 0) return;
    c.globalAlpha = 0.16 * a;
    for (let dy = 0; dy <= r; dy++) { const hw = Math.sqrt(r * r - dy * dy); pxRect(c, cx - hw, 121 - dy, hw * 2, 1, '#7cd0ff'); }
    c.globalAlpha = 0.45 * a;
    for (const f of [0.35, 0.72]) for (let i = 0; i <= 28; i++) { const t = Math.PI * i / 28; pxRect(c, cx + Math.cos(t) * r * f, 121 - Math.sin(t) * r, 1, 1, '#bfe6ff'); }
    c.globalAlpha = a;
    const n = Math.max(16, Math.round(r * 3));
    for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; pxRect(c, cx + Math.cos(t) * r, 121 - Math.sin(t) * r, 1, 1, '#e8f6ff'); }
    c.globalAlpha = 1;
  };

  const box = (c, x, y, w, h, col) => {
    pxRect(c, x, y, w, 1, col); pxRect(c, x, y + h - 1, w, 1, col);
    pxRect(c, x, y, 1, h, col); pxRect(c, x + w - 1, y, 1, h, col);
  };

  // Mes: the little cube a heart gets kept in.
  const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
  const cube = (c, x, y, s, beat) => {
    const d = Math.max(2, Math.round(s / 3)), x0 = Math.round(x - s / 2), y0 = Math.round(y - s / 2);
    const faces = (dx, dy, f, t, r) => {
      pxRect(c, x0 + dx, y0 + dy, s, s, f);
      for (let i = 1; i <= d; i++) { pxRect(c, x0 + i + dx, y0 - i + dy, s, 1, t); pxRect(c, x0 + s - 1 + i + dx, y0 - i + dy, 1, s, r); }
    };
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) faces(dx, dy, PAL.k, PAL.k, PAL.k);
    faces(0, 0, '#ffd0e0', '#fff0f6', '#e08aa8');
    const p = s >= 12 ? 2 : 1, hx = x0 + Math.round((s - 5 * p) / 2), hy = y0 + Math.round((s - 5 * p) / 2);
    HEART.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === 'X') pxRect(c, hx + i * p, hy + j * p, p, p, beat ? '#ff3a5a' : '#c0203a'); });
  };

  // An open hand (palm, four fingers, thumb) pointing along angle a.
  const hand = (c, x, y, a, r, w, col, ink) => {
    const big = w > 3, fw = Math.max(1, Math.round(w * (big ? 0.4 : 0.5))), fl = r + Math.max(2, Math.round(w * (big ? 1.1 : 0.9))), spread = big ? 0.42 : 0.32;
    for (const fill of [false, true]) {
      const cc = fill ? col : ink, ex = fill ? 0 : 2;
      pxCircle(c, x, y, r + (fill ? 0 : 1), cc);
      for (let f = 0; f < 4; f++) { const fa = a + (f - 1.5) * spread; pxLine(c, x, y, x + Math.cos(fa) * fl, y + Math.sin(fa) * fl, cc, fw + ex); }
      const ta = a - (big ? 1.4 : 1.25);
      pxLine(c, x, y, x + Math.cos(ta) * fl * 0.75, y + Math.sin(ta) * fl * 0.75, cc, fw + ex);
    }
  };

  // A sprouted arm reaching from (x0,y0) to a hand at (x1,y1).
  const arm = (c, x0, y0, x1, y1, w, col) => {
    col = col || SKIN;
    pxLine(c, x0, y0, x1, y1, PAL.k, w + 2);
    hand(c, x1, y1, Math.atan2(y1 - y0, x1 - x0), Math.max(1, Math.round(w * 0.8)), w, col, PAL.k);
    pxLine(c, x0, y0, x1, y1, col, w);
  };

  // A giant arm from the ground: base -> elbow -> hand.
  const bigArm = (c, bx, by, ex, ey, hx, hy, w, col) => {
    col = col || SKIN;
    const sh = col === SKIN ? SKIN_SH : mixColor(col, '#000000', 0.25);
    pxLine(c, bx, by, ex, ey, PAL.k, w + 4);
    pxLine(c, ex, ey, hx, hy, PAL.k, w + 2);
    hand(c, hx, hy, Math.atan2(hy - ey, hx - ex), Math.round(w * 0.9), w, col, PAL.k);
    pxLine(c, bx, by, ex, ey, col, w + 2);
    pxLine(c, ex, ey, hx, hy, col, w);
    pxLine(c, bx + w * 0.4, by, ex + w * 0.3, ey, sh, Math.max(1, Math.round(w / 3)));
    pxCircle(c, ex, ey, Math.round(w / 2) + 1, col);
  };

  // A little flower where a limb sprouts.
  const bloom = (c, x, y, r) => {
    for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.3; pxCircle(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, Math.max(1, r * 0.7), i % 2 ? '#ffb0e0' : '#ff8ac8'); }
    pxCircle(c, x, y, Math.max(1, r * 0.5), '#9a5ac8');
  };

  // Robin's crossed-arms pose in front of the hero's chest.
  const crossArms = (c, a) => {
    if (a <= 0) return;
    const hc = heroC(), x = hc.x + 6, y = hc.y - 4;
    c.globalAlpha = a;
    arm(c, x - 6, y + 5, x + 6, y - 5, 2);
    arm(c, x - 6, y - 5, x + 6, y + 5, 2);
    c.globalAlpha = 1;
  };

  // A swirling hole of darkness.
  const vortex = (c, x, y, r, rot) => {
    if (r < 1) return;
    pxCircle(c, x, y, r * 0.45, '#0a0612');
    for (let j = 0; j < 3; j++) {
      for (let t = 0; t <= 1; t += 0.05) {
        const a = rot + j * 2.094 + t * 4.2, rr = r * (0.3 + t * 0.7);
        pxRect(c, x + Math.cos(a) * rr - 1, y + Math.sin(a) * rr - 1, 2, 2, t > 0.7 ? '#8a5ac0' : t > 0.35 ? '#3a2a4a' : '#1b1424');
      }
    }
  };

  // A pool of darkness on the ground, rim swirling purple.
  const darkPool = (c, x, rx, ry, front) => {
    oval(c, x, 121, rx, ry, '#0a0612', front);
    const n = Math.round(rx * 1.6);
    for (let i = 0; i < n; i++) {
      if (i % 3 === 0) continue;
      const t = i / n * Math.PI * 2 + G.t * 2, py = 121 + Math.sin(t) * ry;
      if (front && py < 121) continue;
      pxRect(c, x + Math.cos(t) * rx, py, 2, 1, i % 2 ? '#8a5ac0' : '#3a2a4a');
    }
  };

  // Things the darkness swallowed: a rock, a plank, a brick, a cannonball or a sword.
  const debris = (c, kind, x, y, t) => {
    const v = Math.floor(t * 12) % 2;
    if (kind === 0) { pxCircle(c, x, y, 4, PAL.k); pxCircle(c, x, y, 3, '#a8a498'); pxRect(c, x - 2, y - 2, 2, 1, '#e0dcd0'); }
    else if (kind === 1) { pxRect(c, x - (v ? 2 : 6), y - (v ? 6 : 2), v ? 5 : 12, v ? 12 : 5, PAL.k); pxRect(c, x - (v ? 1 : 5), y - (v ? 5 : 1), v ? 3 : 10, v ? 10 : 3, '#c98a4a'); }
    else if (kind === 2) { pxRect(c, x - 4, y - 3, 9, 6, PAL.k); pxRect(c, x - 3, y - 2, 7, 4, '#d0604a'); pxRect(c, x - 3, y - 2, 7, 1, '#f09a7a'); }
    else if (kind === 3) { pxCircle(c, x, y, 4, '#1b1424'); pxCircle(c, x, y, 3, '#4a4458'); pxRect(c, x - 1, y - 2, 1, 1, '#ffffff'); }
    else { const a = t * 14; pxLine(c, x - Math.cos(a) * 6, y - Math.sin(a) * 6, x + Math.cos(a) * 6, y + Math.sin(a) * 6, '#e8e8f0', 2); pxRect(c, x - Math.cos(a) * 6 - 1, y - Math.sin(a) * 6 - 1, 3, 3, '#7a4a24'); }
  };

  // A thundercloud, wide and flat; and a round thundercloud ball.
  const PUFFS = [[0, 0, 1], [-0.8, 0.2, 0.7], [0.8, 0.25, 0.7], [-0.4, -0.35, 0.65], [0.45, -0.3, 0.6], [-1.4, 0.4, 0.45], [1.4, 0.45, 0.45]];
  const cloud = (c, x, y, r) => {
    for (const [px, py, s] of PUFFS) pxCircle(c, x + px * r, y + py * r * 0.7, s * r + 1, PAL.k);
    for (const [px, py, s] of PUFFS) pxCircle(c, x + px * r, y + py * r * 0.7, s * r, '#2a3048');
    for (const [px, py, s] of PUFFS) pxCircle(c, x + px * r - s * r * 0.2, y + py * r * 0.7 - s * r * 0.3, s * r * 0.55, '#4a5070');
  };
  const cloudBall = (c, x, y, r) => {
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i <= 9; i++) {
        const a = i * 0.698 + G.t * 0.8, d = i === 9 ? 0 : r * 0.62, pr = i === 9 ? r * 0.7 : r * 0.42;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (pass === 0) pxCircle(c, px, py, pr + 1, PAL.k);
        else if (pass === 1) pxCircle(c, px, py, pr, '#2a3048');
        else pxCircle(c, px - pr * 0.25, py - pr * 0.3, pr * 0.55, '#4a5070');
      }
    }
  };

  // A spike of hard sand jutting out of the ground at (x,y).
  const spike = (c, x, y, h, w, lean) => {
    for (let j = 0; j < h; j++) {
      const q = j / h, hw = w * (1 - q), sx = x + lean * j;
      pxRect(c, sx - hw - 1, y - j, hw * 2 + 2, 1, '#6a4a2a');
      pxRect(c, sx - hw, y - j, hw * 2, 1, q > 0.6 ? '#f5e0b0' : '#e8c890');
      pxRect(c, sx - hw, y - j, Math.max(1, hw * 0.6), 1, '#c9a46a');
    }
  };

  // A ball of packed, spinning sandstorm.
  const sandBall = (c, x, y, r) => {
    pxCircle(c, x, y, r + 1, '#6a4a2a');
    pxCircle(c, x, y, r, '#d8b070');
    const step = Math.max(3, r / 4);
    for (let j = -4; j <= 4; j++) {
      const yy = j * step + ((G.t * 30) % step);
      if (Math.abs(yy) >= r) continue;
      const hw = Math.sqrt(r * r - yy * yy);
      pxRect(c, x - hw * 0.9, y + yy, hw * 1.8, 1, '#a8864a');
    }
    pxCircle(c, x - r * 0.35, y - r * 0.35, r * 0.3, '#f5e0b0');
    for (let i = 0; i < 12; i++) { const a = G.t * 8 + i * 0.52, rr = r + 3 + (i % 3) * 2; pxRect(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5, 2, 1, DUNE[i % 4]); }
  };

  // A quicksand whirlpool on the ground; `front` redraws the half in front of the foe.
  const whirl = (c, cx, rx, ry, front) => {
    if (rx < 2) return;
    oval(c, cx, 121, rx + 1, ry + 1, '#8a6a3a', front);
    oval(c, cx, 121, rx, ry, '#e8c890', front);
    oval(c, cx, 121, rx * 0.7, ry * 0.7, '#d8b070', front);
    for (let j = 0; j < 4; j++) {
      for (let t = 0.1; t < 1; t += 0.015) {
        const a = G.t * 5 + j * Math.PI / 2 + t * 5, x = cx + Math.cos(a) * rx * t, y = 121 + Math.sin(a) * ry * t;
        if (front && y < 121) continue;
        pxRect(c, x, y, 3, 1, t < 0.5 ? '#6a4a2a' : '#a8864a');
        pxRect(c, x, y - 1, 2, 1, '#f5e0b0');
      }
    }
    oval(c, cx, 121, rx * 0.14, ry * 0.3, '#5a3a1a', front);
  };

  // Demonio Fleur: a towering shadow built of arms, with wings of arms. rise and wing go 0..1.
  const demon = (c, x, y, rise, wing) => {
    if (rise <= 0.02) return;
    const sh = y - 70 * rise, top = y - 98 * rise;
    for (const s of [-1, 1]) {
      const root = [x + s * 12, sh + 4];
      const tips = [0, 1, 2, 3].map(i => { const a = -Math.PI / 2 + s * (0.3 + i * (0.12 + 0.35 * wing)), l = [54, 60, 56, 46][i] * rise; return [root[0] + Math.cos(a) * l, root[1] + Math.sin(a) * l]; });
      c.globalAlpha = 0.85;
      for (let i = 0; i < 3; i++) tri(c, root, tips[i], tips[i + 1], '#2a1a3a');
      c.globalAlpha = 1;
      for (const t of tips) arm(c, root[0], root[1], t[0], t[1], 2, '#6a4a8a');
    }
    tri(c, [x - 15, sh], [x + 15, sh], [x + 10, y - 26 * rise], '#3a2050');
    tri(c, [x - 15, sh], [x + 10, y - 26 * rise], [x - 10, y - 26 * rise], '#3a2050');
    tri(c, [x - 10, y - 26 * rise], [x + 10, y - 26 * rise], [x + 18, y], '#2a1a3a');
    tri(c, [x - 10, y - 26 * rise], [x + 18, y], [x - 18, y], '#2a1a3a');
    for (let i = 0; i < 4; i++) pxLine(c, x - 12 + i * 6, sh + 6 + i * 4, x + 8 - i * 4, sh + 26 + i * 8, '#5a3a7a', 2);
    pxCircle(c, x, top + 10, 11, PAL.k);
    pxCircle(c, x, top + 10, 10, '#3a2050');
    for (const s of [-1, 1]) {
      pxLine(c, x + s * 6, top + 3, x + s * 12, top - 4, '#5a3a7a', 3);
      pxLine(c, x + s * 12, top - 4, x + s * 11, top - 12, '#5a3a7a', 2);
      pxRect(c, x + s * 4 - (s < 0 ? 3 : 0), top + 8, 3, 2, '#ffb0e0');
      pxRect(c, x + s * 4 - (s < 0 ? 2 : -1), top + 8, 1, 1, '#ffffff');
    }
    zigzag(c, x - 5, top + 15, x + 5, top + 15, 5, 1, '#ffb0e0', 1);
  };

  Object.assign(MOVE_FX, {
    // --- Bird-Bird Fruit: Phoenix ---
    phoenixbrand: async m => {
      const hero = G.hero, foot = () => ({ x: hero.x + hero.ox + 6, y: 118 + hero.oy });
      const trail = [];
      Sfx.play('fire');
      hold(true);
      const fire = fxRun(820, c => {
        const f = foot();
        trail.unshift(f);
        if (trail.length > 9) trail.pop();
        trail.forEach((p, i) => { const r = 5 - i * 0.5; pxCircle(c, p.x, p.y, r + 1, '#1f5aa8'); pxCircle(c, p.x, p.y, r, i < 3 ? '#7cd0ff' : '#3a9ae8'); });
        const air = k01(-hero.oy / 20);
        if (air > 0) { wing(c, hero.x + hero.ox - 4, 96 + hero.oy, Math.PI + 0.3, Math.PI + 1.5, 20 * air, 5); heroOver(c); }
        for (let i = -1; i <= 1; i++) pxLine(c, f.x + 2, f.y + i * 2, f.x + 7, f.y + i * 3 + 2, '#ffd04a', 1);
      });
      await tween(hero, { ox: 16, oy: -44, squash: -0.12 }, 260);
      await wait(70);
      await tween(hero, { ox: 66, oy: -6, squash: 0.1 }, 150, easeIn);
      const fc = fc0();
      m.hit(0);
      Sfx.play('boom');
      slashMarks(fc, 3, '#ffd04a', 22, 1.0, 6);
      ringOut(fc, '#7cd0ff', 3, 24, 320, 2);
      particles(fc.x, fc.y, 24, { colors: PHX, speed: 90, grav: -40 });
      fxRun(420, (c, k) => { for (let i = 0; i < 3; i++) flame(c, fc.x - 10 + i * 10, 121, Math.round(Math.sin(k * Math.PI) * (i === 1 ? 26 : 18)), 9, i * 2); });
      shake(5, 300);
      await tween(hero, { ox: 42, oy: -14, squash: 0 }, 120);
      await back(220);
      await fire;
      hold(false);
    },
    rebirth: async m => {
      const hc = heroC(), fc = fc0();
      Sfx.play('fire');
      const wash = fxRun(1250, (c, k) => {
        const up = k01(Math.min(k * 3, (1 - k) / 0.3));
        c.globalAlpha = 0.8;
        for (let i = 0; i < 5; i++) flame(c, hc.x - 14 + i * 7, 122, Math.round(up * (20 + (i % 2) * 12 + (i === 2 ? 8 : 0))), 10, i * 1.9);
        c.globalAlpha = up;
        for (let i = 0; i < 2; i++) { const q = (k * 2 + i / 2) % 1; ellipse(c, hc.x, 120 - q * 36, 18 - q * 6, 3, 0, '#bfe6ff'); }
        c.globalAlpha = 1;
        if (up > 0.3) for (let i = 0; i < 4; i++) { const q = (k * 1.5 + i / 4) % 1; plus(c, hc.x - 12 + i * 8, 112 - q * 40, q < 0.5 ? '#fff3a0' : '#ffd04a'); }
      });
      await wait(320);
      Sfx.play('heal');
      const x0 = hc.x + 16;
      await fxRun(380, (c, k) => {
        const front = lerp(x0, fc.x - 8, easeIn(k));
        for (let x = x0, i = 0; x < front; x += 7, i++) flame(c, x, 122, Math.round(6 + (x - x0) / (front - x0 + 1) * 10), 7, i * 1.3);
      });
      m.hit(0);
      Sfx.play('fire');
      particles(fc.x, fc.y, 20, { colors: PHX, speed: 70, grav: -60 });
      await fxRun(420, (c, k) => { for (let i = 0; i < 4; i++) flame(c, fc.x - 15 + i * 10, 122, Math.round(Math.sin(k * Math.PI) * (26 + (i % 2) * 8)), 10, i * 2.3); });
      await wash;
    },
    pyreapple: async m => {
      const hc = heroC(), fc = fc0(), sx = hc.x + 12, sy = hc.y - 16;
      Sfx.play('charge');
      await fxRun(300, (c, k) => {
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 3, r = 26 * (1 - k) + 3; pxRect(c, sx + Math.cos(a) * r, sy + Math.sin(a) * r, 2, 2, i % 2 ? '#ffd04a' : '#7cd0ff'); }
        pxCircle(c, sx, sy, 2 + k * 5, '#3a9ae8');
      });
      Sfx.play('fire');
      const tx = fc.x, ty = fc.y - 4;
      await fxRun(440, (c, k) => {
        const x = lerp(sx, tx, k), y = lerp(sy, ty, k) - Math.sin(k * Math.PI) * 36;
        const ang = Math.atan2(ty - sy - Math.cos(k * Math.PI) * 36 * Math.PI, tx - sx);
        c.globalAlpha = 0.8;
        pxCircle(c, x, y, 13, '#1f5aa8'); pxCircle(c, x, y, 10, '#3a9ae8'); pxCircle(c, x, y, 6, '#ffd04a'); pxCircle(c, x, y, 3, '#fff3a0');
        c.globalAlpha = 1;
        phoenix(c, x, y, 1.8, ang, Math.sin(G.t * 18));
        particles(x - 6, y, 2, { colors: PHX, speed: 20, grav: -30, life: 0.35 });
      });
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#3a9ae8', 0.6);
      ringOut(fc, '#ffd04a', 6, 46, 500, 2);
      ringOut(fc, '#7cd0ff', 4, 36, 450, 3);
      particles(fc.x, fc.y, 40, { colors: PHX, speed: 130, grav: -30, size: 3 });
      shake(8, 500);
      await fxRun(560, (c, k) => {
        if (k > 0.7 && Math.floor(k * 20) % 2) return;
        pyre(c, fc.x, fc.y - 6, k < 0.25 ? easeOut(k / 0.25) : 1);
      });
    },
    bluewings: async m => {
      const hero = G.hero, fc = fc0(), S = { open: 0, sweep: 0, a: 1 };
      const sh = () => ({ x: hero.x + hero.ox - 2, y: 96 + hero.oy });
      Sfx.play('fire');
      hold(true);
      const wings = fxRun(1150, c => {
        const p = sh();
        c.globalAlpha = S.a;
        wing(c, p.x, p.y, Math.PI + 0.15, Math.PI + 0.15 + 1.25 * S.open, 26 + 30 * S.open, 8);
        wing(c, p.x + 4, p.y, -1.4 * S.open + S.sweep * 1.6, -0.15 * S.open + S.sweep * 1.6, 30 + 62 * S.open, 9);
        c.globalAlpha = 1;
        heroOver(c);
      });
      await Promise.all([tween(hero, { oy: -10 }, 300), tween(S, { open: 1 }, 380)]);
      Sfx.play('slash');
      const p = sh();
      arcSweep(p.x + 4, p.y, 88, -1.2, 1.2, '#7cd0ff', 320, 5);
      await tween(S, { sweep: 0.6 }, 140, easeIn);
      m.hit(0);
      Sfx.play('fire');
      screenFlash('#7cd0ff', 0.5);
      particles(fc.x, fc.y, 36, { colors: PHX, speed: 120, grav: -40, size: 3 });
      fxRun(500, (c, k) => { for (let i = 0; i < 4; i++) flame(c, fc.x - 15 + i * 10, 122, Math.round(Math.sin(k * Math.PI) * (30 + (i % 2) * 10)), 11, i * 2.1); });
      shake(8, 500);
      await tween(S, { sweep: 1 }, 120, easeOut);
      await wait(180);
      await Promise.all([tween(S, { open: 0, a: 0 }, 260), back(260)]);
      await wings;
      hold(false);
    },
    phoenixdive: async m => {
      const hero = G.hero, hc = heroC(), fc = fc0();
      Sfx.play('fire');
      const engulf = fxRun(280, (c, k) => { for (let i = 0; i < 4; i++) flame(c, hc.x - 12 + i * 8, 122, Math.round(Math.sin(k * Math.PI) * (30 + (i % 2) * 10)), 11, i * 2); });
      await wait(140);
      hero.alpha = 0;
      await engulf;
      const B = { x: hc.x, y: hc.y - 6, ang: -1.2, dive: false, gone: false }, trail = [];
      const bird = fxRun(900, c => {
        if (B.gone) return;
        trail.unshift({ x: B.x, y: B.y });
        if (trail.length > 8) trail.pop();
        if (B.dive) trail.forEach((p, i) => { c.globalAlpha = 0.5 * (1 - i / 8); pxCircle(c, p.x, p.y, 8 - i, i % 2 ? '#3a9ae8' : '#7cd0ff'); });
        c.globalAlpha = 1;
        phoenix(c, B.x, B.y, 3, B.ang, B.dive ? 0.15 : Math.sin(G.t * 14));
        particles(B.x - Math.cos(B.ang) * 20, B.y - Math.sin(B.ang) * 20, 1, { colors: PHX, speed: 20, grav: -30, life: 0.4 });
      });
      Sfx.play('charge');
      await tween(B, { x: 92, y: 30, ang: -0.35 }, 340);
      await wait(90);
      B.dive = true;
      B.ang = Math.atan2(fc.y - B.y, fc.x - B.x);
      Sfx.play('fire');
      await tween(B, { x: fc.x, y: fc.y }, 190, easeIn);
      B.gone = true;
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#7cd0ff', 1);
      for (let i = 0; i < 4; i++) ringOut(fc, ['#ffffff', '#7cd0ff', '#3a9ae8', '#ffd04a'][i], 6, 50 + i * 18, 600, 3);
      rays(fc, '#bfe6ff', 14, 70, 450);
      particles(fc.x, fc.y, 60, { colors: PHX, speed: 170, grav: -30, size: 3 });
      shake(12, 800);
      const blast = fxRun(480, (c, k) => {
        const r = easeOut(k) * 42;
        c.globalAlpha = 1 - k;
        pxCircle(c, fc.x, fc.y, r, '#3a9ae8'); pxCircle(c, fc.x, fc.y, r * 0.7, '#7cd0ff'); pxCircle(c, fc.x, fc.y, r * 0.35, '#ffffff');
        c.globalAlpha = 1;
        for (let i = 0; i < 5; i++) flame(c, fc.x - 24 + i * 12, 122, Math.round(Math.sin(k * Math.PI) * (24 + (i % 2) * 14)), 12, i * 1.7);
      });
      fxRun(360, (c, k) => { for (let i = 0; i < 3; i++) flame(c, hc.x - 8 + i * 8, 122, Math.round(Math.sin(k * Math.PI) * 26), 10, i * 2); });
      await tween(hero, { alpha: 1 }, 300);
      await Promise.all([blast, bird]);
    },

    // --- Op-Op Fruit ---
    roomshambles: async m => {
      const hero = G.hero, F = G.battle.F, cx = Math.round((hero.x + F.x) / 2);
      hold(true);
      Sfx.play('charge');
      ringOut(heroHand(), '#bfe6ff', 2, 12, 300, 1);
      const dome = fxRun(1300, (c, k) => room(c, cx, easeOut(Math.min(1, k * 3)) * 76, k > 0.85 ? (1 - k) / 0.15 : 1));
      await wait(320);
      floatText(cx, 30, 'ROOM', '#bfe6ff');
      await wait(120);
      const frames = () => fxRun(180, (c, k) => { if (Math.floor(k * 12) % 2 === 0) for (const x of [hero.x, F.x]) box(c, x - 16, 84, 32, 38, '#e8f6ff'); });
      const dx = F.x - hero.x;
      Sfx.play('miss');
      frames();
      hero.ox = dx; F.ox = -dx;
      floatText(cx, 44, 'SHAMBLES', '#ffb0c8');
      await wait(160);
      const fc = fc0();
      m.hit(0);
      slashAt(fc, '#ffb0c8', -0.5, 40);
      impact(fc, ['#ffb0c8', '#ffffff'], 10);
      await wait(260);
      Sfx.play('miss');
      frames();
      hero.ox = 0; F.ox = 0;
      hold(false);
      await dome;
    },
    mes: async m => {
      const hero = G.hero;
      hold(true);
      await tween(hero, { ox: 52 }, 140, easeIn);
      const fc = fc0(), px = hero.x + hero.ox + 14, py = fc.y - 2;
      Sfx.play('slash');
      fxRun(300, (c, k) => {
        const x = px + Math.round(easeOut(Math.min(1, k * 3)) * 4);
        hand(c, x, py, 0, 3, 3, SKIN, PAL.k);
        if (k < 0.5) pxRing(c, x + 6, py, 3 + k * 16, '#ffb0c8', 1);
      });
      await wait(110);
      m.hit(0);
      Sfx.play('find');
      const ox = fc.x - 2, oy = py, tx = fc.x - 22, ty = fc.y - 34;
      floatText(tx, ty - 22, 'MES', '#ffb0c8');
      await fxRun(720, (c, k) => {
        let x, y, s;
        if (k < 0.3) { const e = easeOut(k / 0.3); x = lerp(ox, tx, e); y = lerp(oy, ty, e) - Math.sin(e * Math.PI) * 8; s = Math.round(lerp(4, 12, e)); }
        else if (k < 0.72) { x = tx; y = ty + Math.round(Math.sin((k - 0.3) * 20) * 2); s = 12; }
        else { const e = easeIn((k - 0.72) / 0.28); x = lerp(tx, ox, e); y = lerp(ty, oy, e); s = Math.round(lerp(12, 4, e)); }
        const beat = Math.floor(G.t * 5) % 2;
        if (beat && s > 8) pxRing(c, x + 2, y - 2, s, '#ffb0c8', 1);
        cube(c, x, y, s, beat);
      });
      Sfx.play('miss');
      impact(fc, ['#ffb0c8', '#ffffff'], 6);
      hold(false);
      await back();
    },
    gammaknife: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), y = fc.y - 2;
      hold(true);
      Sfx.play('charge');
      const dome = fxRun(1300, (c, k) => room(c, F.x, easeOut(Math.min(1, k * 4)) * 46, k > 0.85 ? (1 - k) / 0.15 : 1));
      await fxRun(300, (c, k) => {
        const h = heroHand();
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 4, r = 18 * (1 - k) + 2; pxRect(c, h.x + 4 + Math.cos(a) * r, h.y - 2 + Math.sin(a) * r, 2, 2, i % 2 ? '#7cff7a' : '#eaffea'); }
        pxCircle(c, h.x + 4, h.y - 2, 1 + k * 2, '#7cff7a');
      });
      await tween(hero, { ox: 26 }, 90, easeIn);
      Sfx.play('zap');
      const blade = (c, e) => {
        const x0 = hero.x + hero.ox + 14, x1 = lerp(x0, fc.x + 44, e);
        for (let x = Math.round(x0); x <= x1; x++) {
          const q = (x - x0) / Math.max(1, x1 - x0), hw = 4 * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * q)), 0.6);
          c.globalAlpha = 0.35; pxRect(c, x, y - hw - 2, 1, hw * 2 + 4, '#7cff7a'); c.globalAlpha = 1;
          pxRect(c, x, y - hw, 1, hw * 2, '#2ad65a');
          pxRect(c, x, y - hw * 0.55, 1, hw * 1.1, '#9aff9a');
          if (hw > 1.2) pxRect(c, x, y, 1, 1, '#ffffff');
        }
      };
      await fxRun(160, (c, k) => blade(c, easeOut(k)));
      m.hit(0);
      Sfx.play('crit');
      particles(fc.x, fc.y, 16, { colors: ['#7cff7a', '#eaffea', '#2ad65a'], speed: 60, grav: 0, life: 0.4 });
      await fxRun(380, (c, k) => {
        blade(c, 1);
        c.globalAlpha = 0.5 * (1 - k);
        pxCircle(c, fc.x, fc.y, 8 + Math.sin(k * 30) * 3, '#7cff7a');
        c.globalAlpha = 1;
        for (let i = 0; i < 5; i++) { const a = i * 1.26 + k * 6, r = 6 + k * 10; plus(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r, '#9aff9a'); }
      });
      await fxRun(150, (c, k) => blade(c, 1 - k));
      hold(false);
      await back();
      await dome;
    },
    lawshock: async m => {
      const hero = G.hero, F = G.battle.F;
      hold(true);
      Sfx.play('charge');
      await tween(hero, { ox: 54 }, 150, easeIn);
      const fc = fc0(), px = hero.x + hero.ox + 14;
      await fxRun(240, (c, k) => {
        hand(c, px, fc.y - 2, 0, 3, 3, SKIN, PAL.k);
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 9, r = 6 + (i % 2) * 3; pxRect(c, px + Math.cos(a) * r, fc.y - 2 + Math.sin(a) * r, 1, 1, i % 2 ? '#ffe14a' : '#ffffff'); }
      });
      Sfx.play('zap');
      screenFlash('#fff6a0', 0.9);
      m.hit(0);
      const arcs = flicker(() => Array.from({ length: 10 }, (_, i) => {
        const a = (i < 6 ? -1.1 + i * 0.44 : 2 + (i - 6) * 0.75) + rand(-0.15, 0.15), l = rand(44, 76);
        return jag(fc.x, fc.y, fc.x + Math.cos(a) * l, fc.y + Math.sin(a) * l, 6, 5);
      }));
      fxRun(650, (c, k) => {
        if (k > 0.6 && Math.floor(k * 20) % 2) return;
        for (const p of arcs()) bolt(c, p, 1, '#ffd04a', '#ffffff');
        hand(c, px, fc.y - 2, 0, 3, 3, '#fff3a0', PAL.k);
        pxCircle(c, fc.x, fc.y, 4 + 8 * (1 - k), '#ffffff');
      });
      ringOut(fc, '#ffe14a', 4, 60, 500, 2);
      rays(fc, '#ffffff', 12, 50, 400, 0.2);
      particles(fc.x, fc.y, 30, { colors: ['#ffe14a', '#ffffff', '#bfe6ff'], speed: 140, grav: 0, life: 0.4 });
      shake(9, 600);
      for (let i = 0; i < 4; i++) { F.flash = 0.06; await wait(120); }
      hold(false);
      await back();
    },
    puncturewille: async m => {
      const fc = fc0();
      hold(true);
      Sfx.play('charge');
      await fxRun(450, (c, k) => room(c, 100, easeOut(k) * 112, 1));
      const ax = fc.x - 120, ay = fc.y - 92, ang = Math.atan2(fc.y - ay, fc.x - ax), L = Math.hypot(fc.x - ax, fc.y - ay) + 34;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const needle = (c, d, a) => {
        const bx = ax - ca * d, by = ay - sa * d;
        c.globalAlpha = a;
        for (const [col, grow, off] of [['#e8f6ff', 1, 0], ['#5fb8f0', 0, 0], ['#bfe6ff', -0.55, -0.35]]) {
          for (let i = 0; i <= 64; i++) {
            const q = i / 64, r = 11 * (1 - q), px = bx + ca * L * q + sa * r * off * -1, py = by + sa * L * q + ca * r * off;
            const rr = grow < 0 ? r * -grow : r + grow;
            if (rr >= 0.5) pxCircle(c, px, py, rr, col);
          }
        }
        c.globalAlpha = 1;
      };
      Sfx.play('slash');
      await fxRun(220, (c, k) => { room(c, 100, 112 * (1 - k), 1 - k); needle(c, (1 - easeIn(k)) * L, 1); });
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#bfe6ff', 0.9);
      particles(fc.x, fc.y, 36, { colors: ['#bfe6ff', '#ffffff', '#5fb8f0'], speed: 140, grav: 40 });
      shake(12, 700);
      await fxRun(700, (c, k) => {
        needle(c, 0, k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
        for (let i = 0; i < 3; i++) {
          const q = k * 1.4 - i * 0.2;
          if (q <= 0 || q >= 1) continue;
          ellipse(c, fc.x + ca * q * 44, fc.y + sa * q * 44, 3 + q * 6, 10 + q * 30, ang, i % 2 ? '#7cd0ff' : '#ffffff', 2);
        }
      });
      hold(false);
    },

    // --- Dark-Dark Fruit ---
    blackhole: async m => {
      const F = G.battle.F, fc = fc0(), rx0 = foeW() / 2 + 12;
      Sfx.play('haki');
      const pool = fxRun(1350, (c, k) => {
        const rx = rx0 * easeOut(Math.min(1, k * 3)) * (k > 0.85 ? (1 - k) / 0.15 : 1), ry = Math.min(8, rx * 0.3);
        darkPool(c, F.x, rx, ry);
        for (let i = 0; i < 5; i++) {
          const bx = F.x - rx * 0.8 + i * rx * 0.4, h = Math.min(1, k * 3) * (10 + (i % 2) * 8) * (k > 0.7 ? 0 : 1);
          for (let j = 0; j < h; j++) pxRect(c, bx + Math.sin(G.t * 10 + i + j * 0.4) * 2, 121 - j, 2, 1, j > h - 3 ? '#8a5ac0' : '#1b1424');
        }
        foeOver(c);
        darkPool(c, F.x, rx, ry, true);
      });
      await wait(350);
      Sfx.play('hurt');
      await tween(F, { oy: foeLift() + 12, squash: 0.1 }, 280, easeIn);
      m.hit(0);
      const hc = heroC(), motes = Array.from({ length: 14 }, (_, i) => ({ d: i * 0.03, x: fc.x + rand(-12, 12), y: rand(108, 120), arc: rand(10, 30) }));
      fxRun(700, (c, k) => {
        for (const mo of motes) {
          const q = k01((k - mo.d) * 1.5);
          if (q <= 0 || q >= 1) continue;
          pxRect(c, lerp(mo.x, hc.x, easeIn(q)), lerp(mo.y, hc.y, q) - Math.sin(q * Math.PI) * mo.arc, 2, 2, mo.d * 100 % 2 < 1 ? '#8a5ac0' : '#c8a0ff');
        }
      });
      await wait(260);
      await tween(F, { oy: 0, squash: 0 }, 260);
      await pool;
    },
    kurouzu: async m => {
      const hero = G.hero, F = G.battle.F;
      const palmAt = () => ({ x: hero.x + hero.ox + 16, y: 100 + hero.oy });
      Sfx.play('haki');
      hold(true);
      const swirl = fxRun(1200, (c, k) => { const p = palmAt(); vortex(c, p.x, p.y, 11 * Math.min(1, k * 4) * (k > 0.8 ? (1 - k) / 0.2 : 1), -G.t * 10); });
      await wait(250);
      Sfx.play('stretch');
      const pull = hero.x + 34 - F.x;
      const reach = fxRun(300, (c, k) => {
        const p = palmAt(), fc = fc0();
        for (let i = 0; i < 3; i++) {
          let lx = p.x, ly = p.y;
          for (let j = 1; j <= 8; j++) { const q = j / 8, x = lerp(p.x, fc.x, q), y = lerp(p.y, fc.y - 6 + i * 6, q) + Math.sin(G.t * 20 + j + i * 2) * 3; pxLine(c, lx, ly, x, y, i === 1 ? '#3a2a4a' : '#1b1424', 2); lx = x; ly = y; }
        }
        for (let i = 0; i < 4; i++) pxRect(c, fc.x + 14 + i * 6, fc.y - 12 + i * 7, 8, 1, '#8a5ac0');
      });
      await tween(F, { ox: pull }, 260, easeIn);
      await reach;
      await tween(hero, { ox: 8, squash: -0.1 }, 70, easeIn);
      const fc = fc0();
      m.hit(0);
      Sfx.play('boom');
      rays(fc, '#8a5ac0', 8, 22, 260);
      ringOut(fc, '#3a2a4a', 2, 20, 300, 3);
      particles(fc.x, fc.y, 20, { colors: DARK, speed: 90 });
      shake(6, 300);
      await tween(F, { ox: pull + 16 }, 90);
      await Promise.all([tween(F, { ox: 0 }, 260), back()]);
      F.ox = 0;
      hold(false);
      await swirl;
    },
    liberation: async m => {
      const hc = heroC(), fc = fc0(), ox = hc.x + 24, oy = 98;
      Sfx.play('haki');
      const portal = fxRun(1300, (c, k) => {
        const s = easeOut(Math.min(1, k * 4)) * (k > 0.8 ? (1 - k) / 0.2 : 1);
        oval(c, ox, oy, 8 * s + 1, 20 * s + 1, '#8a5ac0');
        oval(c, ox, oy, 7 * s, 19 * s, '#0a0612');
        for (let i = 0; i < 8; i++) { const a = G.t * 6 + i * 0.785; pxRect(c, ox + Math.cos(a) * 9 * s, oy + Math.sin(a) * 21 * s, 2, 2, i % 2 ? '#8a5ac0' : '#3a2a4a'); }
      });
      await wait(320);
      Sfx.play('boom');
      const junk = Array.from({ length: 24 }, (_, i) => ({ d: i * 0.022, kind: i % 5, tx: fc.x + rand(-14, 14), ty: fc.y + rand(-22, 18), arc: rand(-24, 24) }));
      let hit = false;
      await fxRun(650, (c, k) => {
        const reach = lerp(ox, fc.x + 24, Math.min(1, k * 2)), fade = k > 0.7 ? (1 - k) / 0.3 : 1;
        for (let x = ox; x < reach; x += 3) {
          const w = (6 + (x - ox) * 0.12) * fade, wob = Math.sin(x * 0.3 + G.t * 20) * 2;
          pxRect(c, x, oy - w + wob, 3, w * 2, '#1b1424');
          pxRect(c, x, oy - w * 0.4 + wob, 3, w * 0.8, '#3a2a4a');
        }
        for (const j of junk) {
          const q = k01((k - j.d) * 2.2);
          if (q <= 0 || q >= 1) continue;
          debris(c, j.kind, lerp(ox, j.tx, q), lerp(oy, j.ty, q) + Math.sin(q * Math.PI) * j.arc, k);
        }
        if (!hit && k > 0.45) {
          hit = true;
          m.hit(0);
          shake(9, 600);
          screenFlash('#3a2a4a', 0.5);
          particles(fc.x, fc.y, 36, { colors: ['#6a5a4a', '#9aa4b1', '#7a4a24', '#3a2a4a', '#1b1424'], speed: 130, grav: 160, size: 3 });
        }
      });
      if (!hit) m.hit(0);
      await portal;
    },
    blackworld: async m => {
      const F = G.battle.F, hc = heroC(), spr = getSprite(F.spr), sc = F.scale;
      const fx0 = Math.round(F.x - spr.width * sc / 2), fy0 = Math.round(F.y - foeLift() - spr.height * sc);
      Sfx.play('haki');
      const dark = fxRun(1450, (c, k) => {
        const r = easeIn(Math.min(1, k * 2.2)) * 230, fade = k > 0.85 ? (1 - k) / 0.15 : 1;
        c.globalAlpha = 0.92 * fade;
        pxCircle(c, hc.x, 121, r, '#0a0612');
        c.globalAlpha = fade;
        pxRing(c, hc.x, 121, r, '#8a5ac0', 2);
        for (let i = 0; i < 10; i++) {
          const a = Math.PI + i * 0.35 + Math.sin(G.t * 3 + i) * 0.1;
          zigzag(c, hc.x + Math.cos(a) * r, 121 + Math.sin(a) * r, hc.x + Math.cos(a) * (r - 14), 121 + Math.sin(a) * (r - 14), 3, 2, '#3a2a4a', 1);
        }
        c.globalAlpha = 1;
      });
      await wait(560);
      Sfx.play('boom');
      m.hit(0);
      F.alpha = 0;
      const tint = getSprite(F.spr, 'tint', '#8a5ac0'), Bk = 3, chunks = [];
      for (let y = 0; y < spr.height; y += Bk) for (let x = 0; x < spr.width; x += Bk) chunks.push({ x, y, w: Math.min(Bk, spr.width - x), h: Math.min(Bk, spr.height - y), d: (spr.height - y) / spr.height * 0.3 + Math.random() * 0.2, vx: rand(-14, 14) });
      shake(8, 700);
      await fxRun(650, (c, k) => {
        for (const ch of chunks) {
          const q = Math.max(0, k - ch.d);
          c.globalAlpha = k01(1 - q * 1.6);
          c.drawImage(tint, ch.x, ch.y, ch.w, ch.h, Math.round(fx0 + ch.x * sc + ch.vx * q), Math.round(fy0 + ch.y * sc + q * q * 220), ch.w * sc, ch.h * sc);
        }
        c.globalAlpha = 1;
      });
      await tween(F, { alpha: 1 }, 230);
      F.alpha = 1;
      await dark;
    },
    darkquake: async m => {
      const hero = G.hero, fc = fc0();
      const fist = () => ({ x: hero.x + hero.ox + 16, y: 100 + hero.oy });
      Sfx.play('haki');
      hold(true);
      const aura = fxRun(1350, (c, k) => {
        const f = fist(), s = k > 0.8 ? (1 - k) / 0.2 : 1;
        for (let i = 0; i < 8; i++) { const a = G.t * 9 + i * 0.785, r = (6 + Math.sin(G.t * 20 + i) * 2) * s; pxCircle(c, f.x + Math.cos(a) * r * 0.7, f.y + Math.sin(a) * r, 3 * s, i % 2 ? '#3a2a4a' : '#1b1424'); }
        pxCircle(c, f.x, f.y, 3 * s, '#8a5ac0');
      });
      await tween(hero, { ox: -8, squash: 0.18 }, 300);
      await tween(hero, { ox: 22, squash: -0.1 }, 90, easeIn);
      const p = fist(), segs = [];
      for (let i = 0; i < 11; i++) {
        let x = p.x, y = p.y;
        const a = i * 0.571 + 0.2;
        for (let j = 0; j < 6; j++) {
          const b = a + (j % 2 ? 0.3 : -0.3) + rand(-0.15, 0.15), nx = x + Math.cos(b) * 16, ny = y + Math.sin(b) * 16;
          segs.push([x, y, nx, ny, j * 0.12 + i * 0.01]);
          x = nx; y = ny;
        }
      }
      Sfx.play('boom');
      screenFlash('#8a5ac0', 0.7);
      shake(14, 900);
      const cracks = fxRun(1000, (c, k) => {
        if (k > 0.75 && Math.floor(k * 24) % 2) return;
        for (const [x0, y0, x1, y1, d] of segs) {
          const e = k01((k * 2.5 - d) * 4);
          if (!e) continue;
          pxLine(c, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), '#8a5ac0', 4);
          pxLine(c, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), '#1b1424', 2);
        }
        pxCircle(c, p.x, p.y, 7 + Math.sin(k * 30) * 2, '#1b1424');
        pxRing(c, p.x, p.y, 8 + Math.sin(k * 30) * 2, '#8a5ac0', 1);
      });
      await fxRun(260, (c, k) => { for (let i = 0; i < 3; i++) { const x = lerp(p.x, fc.x, k) - i * 8; pxRing(c, x, lerp(p.y, fc.y, k), 6 + i * 4, i % 2 ? '#8a5ac0' : '#1b1424', 2); } });
      m.hit(0);
      for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#8a5ac0' : '#1b1424', 4, 30 + i * 16, 500, 3);
      particles(fc.x, fc.y, 40, { colors: DARK.concat(['#ffffff']), speed: 140 });
      await wait(260);
      hold(false);
      await back();
      await Promise.all([cracks, aura]);
    },

    // --- Rumble-Rumble Fruit ---
    vari: async m => {
      const fc = fc0(), tip = () => { const h = heroHand(); return { x: h.x + 4, y: h.y - 6 }; };
      Sfx.play('charge');
      hold(true);
      await fxRun(260, (c, k) => {
        const t = tip();
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + G.t * 20, r = 6 * (1 - k) + 2; pxRect(c, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, 1, 1, i % 2 ? '#ffe14a' : '#ffffff'); }
        pxCircle(c, t.x, t.y, 1 + k * 2, '#bfe6ff');
      });
      Sfx.play('zap');
      const t = tip(), main = flicker(() => jag(t.x, t.y, fc.x, fc.y, 9, 5));
      const forks = flicker(() => [0, 1, 2].map(() => { const q = rand(0.3, 0.8), x = lerp(t.x, fc.x, q), y = lerp(t.y, fc.y, q); return jag(x, y, x + rand(6, 16), y + rand(-14, 14), 3, 3); }));
      let hit = false;
      await fxRun(420, (c, k) => {
        if (k > 0.7 && Math.floor(k * 24) % 2) return;
        const pts = main();
        bolt(c, pts.slice(0, Math.max(2, Math.ceil(pts.length * Math.min(1, k * 4)))), 1, '#3a7ad8', '#ffffff');
        if (k > 0.25) for (const f of forks()) bolt(c, f, 1, '#3a7ad8', '#ffe14a');
        pxCircle(c, t.x, t.y, 3, '#bfe6ff');
        if (!hit && k >= 0.25) {
          hit = true;
          m.hit(0);
          particles(fc.x, fc.y, 16, { colors: VOLT, speed: 90, grav: 0, life: 0.35 });
        }
      });
      if (!hit) m.hit(0);
      hold(false);
    },
    elthor: async m => {
      const fc = fc0(), x = fc.x;
      Sfx.play('charge');
      const sky = fxRun(1250, (c, k) => {
        const a = Math.min(1, k * 3) * (k > 0.8 ? (1 - k) / 0.2 : 1);
        c.globalAlpha = 0.3 * a;
        pxRect(c, 0, 0, W, H, '#0a1430');
        c.globalAlpha = a;
        cloud(c, x, 8, 10 + 14 * Math.min(1, k * 3));
        c.globalAlpha = 1;
      });
      await fxRun(400, (c, k) => { if (Math.random() < 0.3) bolt(c, jag(x + rand(-16, 16), 12, x + rand(-24, 24), 30, 3, 3), 1, '#3a7ad8', '#ffe14a'); });
      Sfx.play('zap');
      Sfx.play('boom');
      screenFlash('#bfe6ff', 0.9);
      const edge = flicker(() => Array.from({ length: 22 }, () => rand(-3, 3)));
      const sides = flicker(() => [-1, 1, -1, 1].map((s, i) => { const y = 30 + i * 22; return jag(x + s * 12, y, x + s * rand(28, 40), y + rand(-10, 10), 3, 3); }));
      let hit = false;
      await fxRun(560, (c, k) => {
        const wd = (k < 0.15 ? k / 0.15 : k > 0.6 ? Math.max(0, 1 - (k - 0.6) / 0.4) : 1) * 13, e = edge();
        if (wd < 0.5) return;
        for (let j = 0; j < 22; j++) {
          const y = j * 6 - 4, w2 = Math.max(1, wd + e[j]);
          pxRect(c, x - w2 - 2, y, (w2 + 2) * 2, 6, '#3a7ad8');
          pxRect(c, x - w2, y, w2 * 2, 6, '#bfe6ff');
          pxRect(c, x - w2 * 0.4, y, w2 * 0.8, 6, '#ffffff');
        }
        oval(c, x, 121, wd * 3, 4, '#bfe6ff');
        oval(c, x, 121, wd * 1.6, 2, '#ffffff');
        if (k < 0.6) for (const s of sides()) bolt(c, s, 1, '#3a7ad8', '#ffe14a');
        if (!hit && k > 0.12) {
          hit = true;
          m.hit(0);
          shake(8, 500);
          for (let i = 0; i < 2; i++) ringOut({ x, y: 121 }, i ? '#ffe14a' : '#bfe6ff', 6, 40 + i * 14, 400, 2);
          particles(x, 118, 30, { colors: VOLT, speed: 120, grav: 120, dir: -Math.PI / 2, spread: 2.4 });
        }
      });
      if (!hit) m.hit(0);
      await sky;
    },
    raigo: async m => {
      const fc = fc0(), cx = fc.x - 14, cy = 30;
      Sfx.play('charge');
      const dim = fxRun(1400, (c, k) => {
        c.globalAlpha = 0.35 * Math.min(1, k * 3) * (k > 0.8 ? (1 - k) / 0.2 : 1);
        pxRect(c, 0, 0, W, H, '#0a0a1e');
        c.globalAlpha = 1;
      });
      const inner = flicker(() => [0, 1].map(() => { const a = rand(0, 6.28), b = a + rand(1.5, 3); return [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)]; }));
      const ball = (c, x, y, r) => {
        cloudBall(c, x, y, r);
        for (const [a, b, d, e] of inner()) bolt(c, jag(x + a * r * 0.6, y + b * r * 0.6, x + d * r * 0.6, y + e * r * 0.6, 4, 3), 1, '#ffe14a', '#ffffff');
      };
      await fxRun(600, (c, k) => ball(c, cx, cy, 6 + easeOut(k) * 28));
      Sfx.play('boom');
      await fxRun(260, (c, k) => ball(c, lerp(cx, fc.x, k), lerp(cy, fc.y - 10, easeIn(k)), 34));
      m.hit(0);
      Sfx.play('zap');
      screenFlash('#ffffff', 1);
      for (let i = 0; i < 4; i++) ringOut(fc, ['#ffffff', '#bfe6ff', '#3a7ad8', '#ffe14a'][i], 6, 60 + i * 20, 600, 3);
      rays(fc, '#ffe14a', 14, 80, 450);
      particles(fc.x, fc.y, 50, { colors: VOLT.concat(['#4a5070']), speed: 160, size: 3 });
      shake(12, 800);
      const arcs = flicker(() => Array.from({ length: 5 }, () => { const a = rand(0, 6.28), l = rand(30, 60); return jag(fc.x, fc.y, fc.x + Math.cos(a) * l, fc.y + Math.sin(a) * l, 4, 4); }));
      await fxRun(420, (c, k) => { if (Math.floor(k * 16) % 2) for (const p of arcs()) bolt(c, p, 1, '#3a7ad8', '#ffffff'); });
      await dim;
    },
    thunderdragon: async m => {
      const fc = fc0(), hc = heroC();
      const path = t => ({ x: lerp(-24, fc.x, t) + Math.sin(t * Math.PI) * 30, y: lerp(30, fc.y, easeIn(t)) + Math.sin(t * Math.PI * 4) * 14 * (1 - t) });
      Sfx.play('charge');
      tween(G.hero, { squash: -0.1 }, 200);
      particles(hc.x, hc.y - 10, 12, { colors: VOLT, speed: 60, grav: 0, life: 0.4 });
      Sfx.play('zap');
      let hit = false;
      await fxRun(1000, (c, k) => {
        const head = Math.min(1, k * 1.15);
        let prev = null;
        for (let i = 26; i >= 0; i--) {
          const t = head - i * 0.022;
          if (t < 0) continue;
          const p = path(t), jx = rand(-1.5, 1.5), jy = rand(-1.5, 1.5), w = Math.max(2, Math.round(9 - i * 0.28));
          if (prev) {
            pxLine(c, prev.x, prev.y, p.x + jx, p.y + jy, '#1f4a98', w + 4);
            pxLine(c, prev.x, prev.y, p.x + jx, p.y + jy, '#3a7ad8', w + 2);
            pxLine(c, prev.x, prev.y, p.x + jx, p.y + jy, '#bfe6ff', Math.max(1, w - 2));
            pxLine(c, prev.x, prev.y, p.x + jx, p.y + jy, '#ffffff', 1);
          }
          if (i % 3 === 0 && i) zigzag(c, p.x, p.y - w, p.x - 4, p.y - w - 9, 2, 2, '#ffe14a', 2);
          prev = { x: p.x + jx, y: p.y + jy };
        }
        const h = path(head), h2 = path(Math.max(0, head - 0.02)), a = Math.atan2(h.y - h2.y, h.x - h2.x), ca = Math.cos(a), sa = Math.sin(a);
        const P = (lx, ly) => [h.x + (lx * ca - ly * sa) * 1.5, h.y + (lx * sa + ly * ca) * 1.5];
        const ln = (p, q, col, w) => { const A = P(p[0], p[1]), Bq = P(q[0], q[1]); pxLine(c, A[0], A[1], Bq[0], Bq[1], col, w); };
        const open = 3 + Math.sin(G.t * 30) * 2;
        ln([-2, -5], [-13, -13], '#ffe14a', 3); ln([-4, -3], [-15, -6], '#ffe14a', 3);
        pxCircle(c, h.x, h.y, 11, '#1f4a98'); pxCircle(c, h.x, h.y, 9, '#3a7ad8'); pxCircle(c, h.x, h.y, 6, '#bfe6ff');
        ln([2, -4], [15, -2 - open], '#1f4a98', 7); ln([2, -4], [15, -2 - open], '#bfe6ff', 3);
        ln([2, 4], [13, 2 + open], '#1f4a98', 6); ln([2, 4], [13, 2 + open], '#bfe6ff', 2);
        for (let i = 0; i < 3; i++) { const q = P(7 + i * 3, -2 - open * 0.6); pxRect(c, q[0], q[1], 1, 2, '#ffffff'); }
        ln([12, -2 - open], [18, -8 - open], '#ffe14a', 1); ln([11, 2 + open], [17, 7 + open], '#ffe14a', 1);
        const e = P(2, -3);
        pxRect(c, e[0] - 1, e[1] - 1, 3, 2, '#ffe14a');
        if (!hit && k >= 0.87) {
          hit = true;
          m.hit(0);
          Sfx.play('boom');
          screenFlash('#bfe6ff', 0.9);
          for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#ffe14a' : '#bfe6ff', 6, 40 + i * 16, 500, 2);
          particles(fc.x, fc.y, 40, { colors: VOLT, speed: 140, grav: 0, life: 0.5 });
          shake(10, 600);
        }
      });
      if (!hit) m.hit(0);
      await tween(G.hero, { squash: 0 }, 150);
      await wait(200);
    },
    amaru: async m => {
      const hero = G.hero, fc = fc0(), hc = heroC();
      const base = heroSprite(), glow = variantOf(base, 'tint', '#9ad8ff'), halo = variantOf(base, 'flash');
      const g = { x: hero.x, y: 121, s: 2, a: 1, on: false };
      Sfx.play('charge');
      const arcs = flicker(() => Array.from({ length: 4 }, () => { const a = rand(0, 6.28); return jag(hc.x, hc.y - 4, hc.x + Math.cos(a) * 22, hc.y - 4 + Math.sin(a) * 22, 3, 3); }));
      await fxRun(300, c => { for (const p of arcs()) bolt(c, p, 1, '#3a7ad8', '#ffffff'); });
      hero.alpha = 0;
      g.on = true;
      const body = flicker(() => Array.from({ length: 3 }, (_, i) => { const s = Math.round(g.s), w = base.width * s, h = base.height * s, x = g.x - w / 2 + (i + 1) * w / 4; return jag(x, g.y - h + 4, x + rand(-6, 6), g.y - 6, 4, 3); }));
      const giant = fxRun(1100, c => {
        if (!g.on) return;
        const s = Math.max(2, Math.round(g.s)), h = base.height * s;
        c.globalAlpha = g.a;
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + 0.3 + i * 0.51, dx = g.x + Math.cos(a) * h * 0.5, dy = g.y - h * 0.6 + Math.sin(a) * h * 0.34, r = s + 2;
          pxCircle(c, dx, dy, r + 1, PAL.k); pxCircle(c, dx, dy, r, '#e6b422'); pxCircle(c, dx, dy, Math.max(1, r - 2), '#ffd04a');
          pxRect(c, dx - 1, dy - 1, 2, 2, '#a8641a');
        }
        for (const [ox, oy] of [[-s, 0], [s, 0], [0, -s], [0, s]]) drawSpriteAt(c, halo, g.x + ox, g.y + oy, s, { shadow: false, alpha: g.a });
        drawSpriteAt(c, glow, g.x, g.y, s, { shadow: false, alpha: g.a });
        c.globalAlpha = g.a;
        if (s > 2) for (const p of body()) bolt(c, p, 1, '#7cd0ff', '#ffffff');
        c.globalAlpha = 1;
      });
      await tween(g, { s: 5, x: hero.x + 10 }, 340);
      await tween(g, { y: 64, x: fc.x - 24 }, 180);
      await tween(g, { y: 121, x: fc.x - 8 }, 130, easeIn);
      m.hit(0);
      Sfx.play('boom'); Sfx.play('zap');
      screenFlash('#ffffff', 1);
      for (let i = 0; i < 3; i++) ringOut({ x: fc.x, y: 120 }, i % 2 ? '#ffe14a' : '#bfe6ff', 6, 60 + i * 24, 600, 3);
      rays(fc, '#ffffff', 16, 80, 500);
      particles(fc.x, fc.y, 50, { colors: VOLT, speed: 170, size: 3 });
      shake(14, 900);
      await wait(200);
      await tween(g, { s: 2, x: hero.x, a: 0 }, 260);
      g.on = false;
      hero.alpha = 1;
      await giant;
    },

    // --- Sand-Sand Fruit ---
    sables: async m => {
      const F = G.battle.F, fc = fc0(), x = F.x;
      Sfx.play('fire');
      const storm = fxRun(1300, (c, k) => {
        const h = Math.min(1, k * 2.5) * 96 * (k > 0.8 ? (1 - k) / 0.2 : 1), wide = h / 96;
        c.globalAlpha = 0.35;
        for (let y = 0; y < h; y++) { const rr = 6 + y / 96 * 28 * wide + Math.sin(G.t * 12 + y * 0.2) * 2; pxRect(c, x - rr, 121 - y, rr * 2, 1, y % 6 < 3 ? '#e8c890' : '#c9a46a'); }
        c.globalAlpha = 1;
        for (let j = 0; j < 18; j++) {
          const q = j / 17, yy = 121 - q * h, rr = 6 + q * 28 * wide;
          for (let a = 0; a < Math.PI * 2; a += 0.16) {
            const t = a + G.t * 10 + j * 0.5;
            if ((a + j * 0.7) % 2.2 < 0.4) continue;
            const s = Math.sin(t);
            pxRect(c, x + Math.cos(t) * rr, yy + s * rr * 0.2, 2, 1, s > 0 ? DUNE[(j + Math.floor(a * 3)) % 3] : '#a8864a');
          }
        }
      });
      await wait(350);
      await tween(F, { oy: -14, squash: -0.1 }, 260);
      m.hit(0);
      particles(fc.x, fc.y - 14, 20, { colors: DUNE, speed: 90, grav: 40 });
      await wait(240);
      await tween(F, { oy: 0, squash: 0 }, 200, easeIn);
      dust(F.x, 12);
      await storm;
    },
    spada: async m => {
      const hero = G.hero, fc = fc0(), x0 = hero.x + 14, x1 = fc.x + 4;
      await tween(hero, { squash: 0.2, oy: 2 }, 160);
      Sfx.play('slash');
      groundCrack(x0, x1 + 14, '#6a4a2a', 420);
      let hit = false;
      await fxRun(520, (c, k) => {
        const front = lerp(x0, x1, easeIn(Math.min(1, k * 1.3)));
        for (let x = x0; x < front; x += 6) {
          const hgt = Math.max(0, 24 * (1 - (front - x) / 48)) * (0.7 + ((x * 7) % 5) / 10);
          if (hgt >= 1) spike(c, x, 121, hgt, 4, 0.3);
        }
        spike(c, front, 121, 32, 6, 0.35);
        if (!hit && k * 1.3 >= 1) {
          hit = true;
          m.hit(0);
          Sfx.play('slash');
          particles(fc.x, fc.y, 20, { colors: DUNE, speed: 90, grav: 100 });
          shake(5, 300);
        }
      });
      if (!hit) m.hit(0);
      await Promise.all([fxRun(240, (c, k) => spike(c, x1, 121, Math.round(46 * Math.sin(k * Math.PI)), 6, 0.2)), back()]);
      dust(fc.x, 12);
    },
    grounddeath: async m => {
      const hero = G.hero, F = G.battle.F, cx = F.x, rx = foeW() / 2 + 22;
      const cracks = Array.from({ length: 8 }, (_, i) => { const a = i * 0.785 + 0.2; return [Math.cos(a), Math.sin(a)]; });
      await tween(hero, { squash: 0.2, oy: 2 }, 160);
      Sfx.play('fire');
      const S = { dry: 0, sand: 0 };
      tween(S, { dry: 1 }, 400);
      const ground = fxRun(1250, (c, k) => {
        const fade = k > 0.85 ? (1 - k) / 0.15 : 1, r = rx * S.dry, ry = 7 * S.dry;
        if (r < 2) return;
        c.globalAlpha = fade;
        const patch = front => {
          oval(c, cx, 121, r, ry, S.sand > 0 ? mixColor('#b08a5a', '#e8c890', S.sand) : '#b08a5a', front);
          if (S.sand < 1) for (const [dx, dy] of cracks) {
            if (front && dy < 0) continue;
            zigzag(c, cx + dx * r * 0.15, 121 + dy * ry * 0.15, cx + dx * r * (1 - S.sand * 0.6), 121 + dy * ry * (1 - S.sand * 0.6), 3, 1, '#5a3a1a', 1);
          }
          if (S.sand > 0) oval(c, cx, 121, r * 0.6 * S.sand, ry * 0.6 * S.sand, '#a8864a', front);
        };
        patch(false);
        foeOver(c);
        patch(true);
        c.globalAlpha = 1;
      });
      await wait(400);
      Sfx.play('boom');
      tween(S, { sand: 1 }, 220);
      for (let x = cx - rx; x < cx + rx; x += 6) particles(x, 118, 2, { colors: DUNE, speed: 40, grav: 120, dir: -Math.PI / 2, spread: 1 });
      await tween(F, { oy: foeLift() + 12, squash: 0.15 }, 280, easeIn);
      m.hit(0);
      shake(6, 400);
      await wait(220);
      await tween(F, { oy: 0, squash: 0 }, 200);
      dust(F.x, 14);
      await Promise.all([ground, back()]);
    },
    girasole: async m => {
      const F = G.battle.F, cx = F.x, fc = fc0();
      Sfx.play('fire');
      shake(3, 1300);
      const pit = fxRun(1450, (c, k) => {
        const g = easeOut(Math.min(1, k * 2.5)) * (k > 0.85 ? (1 - k) / 0.15 : 1), rx = 82 * g, ry = 13 * g;
        whirl(c, cx, rx, ry);
        foeOver(c);
        whirl(c, cx, rx, ry, true);
      });
      await wait(350);
      const down = foeLift() + 14;
      await fxRun(560, (c, k) => { F.ox = Math.round(Math.sin(k * 14) * 10 * (1 - k)); F.oy = easeIn(k) * down; });
      F.ox = 0; F.oy = down;
      m.hit(0);
      Sfx.play('boom');
      await wait(140);
      fxRun(360, (c, k) => {
        const h = Math.sin(k * Math.PI) * 70;
        for (let i = 0; i < 3; i++) { const w = 14 - i * 4; pxRect(c, cx - w / 2 + Math.sin(G.t * 30 + i) * 2, 121 - h, w, h, ['#a8864a', '#d8b070', '#f5e0b0'][i]); }
      });
      particles(cx, 110, 40, { colors: DUNE, speed: 150, grav: 200, dir: -Math.PI / 2, spread: 0.9, size: 3 });
      await tween(F, { oy: 0 }, 220, easeOut);
      F.oy = 0;
      shake(8, 400);
      particles(fc.x, fc.y, 16, { colors: DUNE, speed: 80, grav: 120 });
      await pit;
    },
    pesado: async m => {
      const hero = G.hero, hc = heroC(), fc = fc0(), sx = hc.x + 18, sy = 44;
      Sfx.play('charge');
      hold(true);
      tween(hero, { squash: -0.1 }, 120);
      const streaks = Array.from({ length: 18 }, (_, i) => ({ a: i * 0.35, r: rand(50, 80) }));
      await fxRun(520, (c, k) => {
        for (const s of streaks) { const r = s.r * (1 - k) + 20, a = s.a + k * 4; pxLine(c, sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.7, sx + Math.cos(a + 0.2) * (r + 8), sy + Math.sin(a + 0.2) * (r + 8) * 0.7, DUNE[Math.floor(s.a * 3) % 4], 1); }
        sandBall(c, sx, sy, 4 + easeOut(k) * 22);
      });
      Sfx.play('fire');
      await fxRun(260, (c, k) => {
        const x = lerp(sx, fc.x, easeIn(k)), y = lerp(sy, fc.y - 6, easeIn(k));
        for (let i = 1; i < 5; i++) pxLine(c, x - i * 10, y - i * 6 + (i % 2) * 6, x - i * 10 - 10, y - i * 6 - 6 + (i % 2) * 6, '#e8c890', 2);
        sandBall(c, x, y, 26);
      });
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#e8c890', 0.8);
      shake(12, 800);
      particles(fc.x, fc.y, 60, { colors: DUNE, speed: 150, grav: 100, size: 3 });
      await fxRun(460, (c, k) => {
        c.globalAlpha = 1 - k;
        for (let i = 0; i < 3; i++) { const q = k01(k * 1.3 - i * 0.15); ellipse(c, fc.x, 121, 10 + q * 90, 3 + q * 12, 0, DUNE[i], 2); }
        for (let i = 0; i < 8; i++) { const a = i * 0.785, r = 14 + k * 26; pxCircle(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r * 0.6, 8 - k * 4, i % 2 ? '#e8c890' : '#c9a46a'); }
        c.globalAlpha = 1;
      });
      hold(false);
      await back(180);
    },

    // --- Flower-Flower Fruit ---
    clutch: async m => {
      const F = G.battle.F, fc = fc0(), top = foeTop(), hw = foeW() / 2;
      hold(true);
      const pose = fxRun(1200, (c, k) => crossArms(c, k > 0.85 ? (1 - k) / 0.15 : 1));
      Sfx.play('stretch');
      petals(fc.x, fc.y, 16);
      const limbs = [[hw - 2, top + 8 - fc.y, -hw + 6, top + 6 - fc.y], [hw - 2, top + 12 - fc.y, -2, top + 14 - fc.y], [hw, 4, -hw + 4, 2], [hw - 4, 9, -4, 10]];
      const grab = fxRun(900, (c, k) => {
        const e = easeOut(Math.min(1, k * 3)), a = k > 0.8 ? (1 - k) / 0.2 : 1, x = F.x + F.ox, y = fc.y + F.oy;
        c.globalAlpha = a;
        for (const [bx, by, tx, ty] of limbs) { bloom(c, x + bx, y + by, 2); arm(c, x + bx, y + by, x + lerp(bx, tx, e), y + lerp(by, ty, e), 2); }
        c.globalAlpha = 1;
      });
      await wait(320);
      Sfx.play('crit');
      await tween(F, { ox: 5, squash: 0.25 }, 120, easeIn);
      m.hit(0);
      floatText(fc.x, top - 12, 'CLUTCH', '#ffb0e0');
      rays({ x: fc.x + 4, y: fc.y }, '#ffffff', 6, 16, 220, 0.4);
      shake(4, 220);
      await wait(260);
      await tween(F, { ox: 0, squash: 0 }, 200);
      F.ox = 0; F.squash = 0;
      petals(fc.x, fc.y, 24, 70);
      await Promise.all([grab, pose]);
      hold(false);
    },
    milfleur: async m => {
      const F = G.battle.F, fc = fc0(), n = Math.max(1, m.hits);
      const field = Array.from({ length: 12 }, (_, i) => ({ x: F.x - 48 + i * 8.7 + (i > 5 ? 8 : 0), ph: i * 1.3, h: 10 + (i * 7) % 9, d: (i % 6) * 0.04 }));
      const S = { grow: 0, slap: 0, wave: -1, a: 1 };
      hold(true);
      Sfx.play('stretch');
      for (const f of field) petals(f.x, 120, 3, 30);
      const pose = fxRun(500 + n * 140, (c, k) => crossArms(c, 1 - k01((k - 0.85) / 0.15)));
      const arms = fxRun(560 + n * 140, c => {
        c.globalAlpha = S.a;
        field.forEach((f, i) => {
          const g = k01((S.grow - f.d) * 1.6);
          if (g <= 0) return;
          let hx = f.x + Math.sin(G.t * 6 + f.ph) * 3, hy = 121 - f.h * g;
          const pair = S.wave >= 0 && (i === (S.wave * 5) % 12 || i === (S.wave * 5 + 6) % 12);
          if (pair) { const tx = fc.x + (f.x < fc.x ? -6 : 6), ty = fc.y - 6 + (S.wave % 3) * 6; hx = lerp(hx, tx, S.slap); hy = lerp(hy, ty, S.slap); }
          bloom(c, f.x, 121, 3);
          arm(c, f.x, 121, hx, hy, 2);
        });
        c.globalAlpha = 1;
      });
      await tween(S, { grow: 1 }, 300);
      for (let i = 0; i < n && F.hp > 0; i++) {
        S.wave = i;
        await tween(S, { slap: 1 }, 70, easeIn);
        m.hit(i);
        F.squash = i % 2 ? 0.1 : -0.1;
        impact({ x: fc.x + rand(-6, 6), y: fc.y - 6 + (i % 3) * 6 }, PETAL, 6);
        await tween(S, { slap: 0 }, 60);
      }
      S.wave = -1;
      F.squash = 0;
      await tween(S, { a: 0, grow: 0 }, 160);
      for (const f of field) petals(f.x, 116, 2, 40);
      hold(false);
      await Promise.all([arms, pose]);
    },
    gigantesco: async m => {
      const F = G.battle.F, fc = fc0(), S = { rise: 0, clap: 0, a: 1 };
      hold(true);
      Sfx.play('stretch');
      const pose = fxRun(1250, (c, k) => crossArms(c, k > 0.85 ? (1 - k) / 0.15 : 1));
      for (const s of [-1, 1]) petals(F.x + s * 42, 120, 14, 60);
      const arms = fxRun(1250, c => {
        c.globalAlpha = S.a;
        for (const s of [-1, 1]) {
          const bx = F.x + s * 42, ex = bx - s * 4 * S.clap, ey = 124 - 40 * S.rise;
          const a = -Math.PI / 2 + s * -1 * S.clap * 2.15, L = 34 * S.rise;
          bloom(c, bx, 122, 5);
          bigArm(c, bx, 124, ex, ey, ex + Math.cos(a) * L, ey + Math.sin(a) * L, 7);
        }
        c.globalAlpha = 1;
      });
      await tween(S, { rise: 1 }, 380);
      await wait(120);
      Sfx.play('slash');
      await tween(S, { clap: 1 }, 160, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffb0e0', 0.5);
      ringOut(fc, '#ffffff', 4, 34, 360, 2);
      particles(fc.x, fc.y, 30, { colors: PETAL, speed: 110, grav: 40 });
      shake(9, 500);
      await wait(260);
      await tween(S, { a: 0 }, 220);
      for (const s of [-1, 1]) petals(F.x + s * 30, 90, 20, 80);
      hold(false);
      await Promise.all([arms, pose]);
    },
    demonio: async m => {
      const F = G.battle.F, fc = fc0(), cx = F.x + 8, S = { rise: 0, wing: 0, crush: 0, fade: 1 };
      Sfx.play('haki');
      hold(true);
      const pose = fxRun(1450, (c, k) => crossArms(c, k > 0.85 ? (1 - k) / 0.15 : 1));
      const show = fxRun(1450, c => {
        c.globalAlpha = 0.35 * S.fade;
        pxRect(c, 0, 0, W, H, '#1a0a2a');
        c.globalAlpha = S.fade;
        demon(c, cx, 121, S.rise, S.wing);
        c.globalAlpha = 1;
        foeOver(c);
        if (S.crush > 0) {
          c.globalAlpha = S.fade;
          for (const s of [-1, 1]) arm(c, cx + s * 14, 121 - 66 * S.rise, fc.x + s * lerp(40, 13, S.crush), fc.y, 5, '#6a4a8a');
          c.globalAlpha = 1;
        }
      });
      await tween(S, { rise: 1 }, 380);
      Sfx.play('charge');
      await tween(S, { wing: 1, crush: 0.01 }, 240);
      Sfx.play('crit');
      await tween(S, { crush: 1 }, 160, easeIn);
      m.hit(0);
      F.squash = -0.25;
      Sfx.play('boom');
      screenFlash('#9a5ac8', 0.6);
      particles(fc.x, fc.y, 30, { colors: PETAL, speed: 100, grav: 30 });
      shake(9, 500);
      await wait(300);
      tween(F, { squash: 0 }, 200);
      await tween(S, { fade: 0 }, 260);
      F.squash = 0;
      for (let i = 0; i < 6; i++) petals(cx - 50 + i * 20, 40 + (i % 3) * 20, 8, 60);
      hold(false);
      await Promise.all([show, pose]);
    },
    milgigante: async m => {
      const F = G.battle.F, fc = fc0(), S = { rise: 0, crush: 0, a: 1 };
      const bases = [8, 24, 86, 102, 118, 128, 158, 170, 186].map((bx, i) => ({ bx, h: 60 + (i * 13) % 20, d: Math.abs(bx - fc.x) / 300 }));
      bases.sort((a, b) => Math.abs(b.bx - fc.x) - Math.abs(a.bx - fc.x));
      Sfx.play('stretch');
      hold(true);
      shake(3, 1400);
      for (let x = 4; x < W; x += 12) petals(x, 120, 3, 50);
      const pose = fxRun(1400, (c, k) => crossArms(c, k > 0.85 ? (1 - k) / 0.15 : 1));
      const forest = fxRun(1400, c => {
        c.globalAlpha = S.a;
        for (const b of bases) {
          const r = k01((S.rise - b.d) / 0.7);
          if (r <= 0) continue;
          const toward = Math.sign(fc.x - b.bx), ex = b.bx + toward * 8 * S.crush, ey = 124 - b.h * 0.55 * r, L = b.h * 0.45 * r;
          const aim = Math.atan2(fc.y - 4 - ey, fc.x - ex), reach = lerp(L, Math.min(Math.hypot(fc.x - ex, fc.y - 4 - ey) - 4, L * 2.2), S.crush);
          const a = lerp(-Math.PI / 2 + Math.sin(G.t * 4 + b.bx) * 0.1, aim, S.crush);
          bloom(c, b.bx, 122, 4);
          bigArm(c, b.bx, 124, ex, ey, ex + Math.cos(a) * reach, ey + Math.sin(a) * reach, 5);
        }
        c.globalAlpha = 1;
      });
      await tween(S, { rise: 1 }, 520);
      await wait(100);
      Sfx.play('charge');
      await tween(S, { crush: 1 }, 200, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffb0e0', 0.8);
      for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#ffb0e0' : '#ffffff', 4, 40 + i * 16, 500, 3);
      particles(fc.x, fc.y, 50, { colors: PETAL.concat([SKIN]), speed: 150, grav: 60, size: 3 });
      shake(13, 800);
      await wait(300);
      await tween(S, { a: 0 }, 240);
      for (let x = 4; x < W; x += 16) petals(x, 80, 4, 70);
      hold(false);
      await Promise.all([forest, pose]);
    },
  });
}
