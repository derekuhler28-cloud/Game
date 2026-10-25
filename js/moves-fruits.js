'use strict';
/* Move animations for the Phoenix, Op-Op, Dark-Dark, Rumble-Rumble, Sand-Sand and Flower-Flower fruits,
   awakened moves included. Every move is staged like an anime attack: a wind-up, the travel, a heavy
   impact and a follow-through, in the look of the fruit's famous user (Marco's blue phoenix fire,
   Law's ROOM, Blackbeard's darkness, Enel's lightning, Crocodile's sand and Robin's sprouting arms). */
{
  // ---------- small drawing helpers (block-scoped so they can't clash with game.js) ----------

  const PHX = ['#1f5aa8', '#3a9ae8', '#bfe6ff', '#ffd04a'];
  const PHX_EMBER = ['#3a9ae8', '#7cd0ff', '#bfe6ff', '#ffd04a', '#ffffff'];
  const PHX_LAYERS = [['#16407a', 1.25], ['#1f5aa8', 1], ['#3a9ae8', 0.74], ['#7cd0ff', 0.48], ['#e8f6ff', 0.22]];
  const GOLDF = ['#c98a1a', '#ffd04a', '#fff3a0'];
  const DARK = ['#1b1424', '#3a2a4a', '#8a5ac0'];
  const VOLT = ['#3a7ad8', '#bfe6ff', '#ffffff', '#ffe14a'];
  const DUNE = ['#e8c890', '#a8864a', '#f5e0b0', '#c9a46a'];
  const PETAL = ['#ffb0e0', '#ff8ac8', '#9a5ac8', '#ffffff'];
  const MED = ['#7cff7a', '#eaffea', '#2ad65a'];
  const SKIN = '#f3c08c', SKIN_SH = '#d8a070';

  const k01 = v => Math.max(0, Math.min(1, v));
  const foeW = () => getSprite(G.battle.F.spr).width * G.battle.F.scale;
  const petals = (x, y, n, spd) => particles(x, y, n, { colors: PETAL, speed: spd || 50, grav: 30, life: 0.8 });
  const embers = (x, y, n, spd) => particles(x, y, n, { colors: PHX_EMBER, speed: spd || 40, grav: -60, life: 0.6 });
  const smokeUp = (x, y, n) => particles(x, y, n, { colors: ['#4a4458', '#6a6478', '#8a8498'], speed: 22, grav: -40, life: 0.8, size: 3, dir: -Math.PI / 2, spread: 1.2 });
  const sandSpray = (x, y, n, spd) => particles(x, y, n, { colors: DUNE, speed: spd || 90, grav: 160, dir: -Math.PI / 2, spread: 1.4, size: 2 });

  // A drawing layer that stays up until the returned stop() is called (for effects that follow a whole move).
  const layer = draw => {
    const L = { t: 0, dur: 1e9, draw, res: () => {} };
    FX.list.push(L);
    return () => { L.dur = 0; };
  };

  // False while the foe is drawn by something other than its sprite (Drakko's dragon form), so the helpers
  // below that redraw, tint, split or tip the foe's sprite leave it alone.
  const plainFoe = () => { const F = G.battle.F, P = F.info && F.info.phase2; return !(P && P.dragon && F.spr === P.spr); };

  // Draws the foe again on top of an effect, so a pit or a shadow can sit behind it.
  const foeOver = c => {
    if (!plainFoe()) return;
    const F = G.battle.F;
    drawSpriteAt(c, getSprite(F.spr, F.flash > 0 ? 'flash' : ''), F.x + F.ox + Math.round(F.kx || 0), F.y + F.oy - foeLift(), F.scale, { squash: F.squash + Math.sin(G.t * 4) * 0.02, alpha: F.alpha, shadow: false });
  };

  // The foe drawn over itself in a tint ('tint' + colour, or 'flash'): x-rays, shocks, glows.
  const foeTint = (c, kind, col, a, dx, dy) => {
    if (!plainFoe()) return;
    const F = G.battle.F;
    drawSpriteAt(c, getSprite(F.spr, kind, col), F.x + F.ox + Math.round(F.kx || 0) + (dx || 0), F.y + F.oy - foeLift() + (dy || 0), F.scale, { squash: F.squash, alpha: a * F.alpha, shadow: false });
  };

  // The foe cut in two at `cut` (0 top .. 1 feet), its upper part shifted by (dx, dy). Hide the real foe first.
  const foeSplit = (c, cut, dx, dy, a) => {
    const F = G.battle.F, spr = getSprite(F.spr, F.flash > 0 ? 'flash' : ''), s = F.scale;
    const w = spr.width * s, x0 = Math.round(F.x + F.ox + (F.kx || 0) - w / 2), y0 = Math.round(F.y + F.oy - foeLift() - spr.height * s);
    const row = Math.max(1, Math.min(spr.height - 1, Math.round(spr.height * cut)));
    c.globalAlpha = a === undefined ? 1 : a;
    c.drawImage(spr, 0, row, spr.width, spr.height - row, x0, y0 + row * s, w, (spr.height - row) * s);
    c.drawImage(spr, 0, 0, spr.width, row, x0 + Math.round(dx), y0 + Math.round(dy), w, row * s);
    c.globalAlpha = 1;
    return { x: x0, y: y0 + row * s, w };
  };

  // The foe tipped over by `ang` around its feet (positive leans it back, away from you). Hide the real foe first.
  const foeRot = (c, ang) => {
    const F = G.battle.F, spr = getSprite(F.spr, F.flash > 0 ? 'flash' : ''), s = F.scale, w = spr.width * s, h = spr.height * s;
    c.save();
    c.translate(Math.round(F.x + F.ox + (F.kx || 0)), Math.round(F.y + F.oy - foeLift()));
    c.rotate(ang);
    c.drawImage(spr, Math.round(-w / 2), -h, w, h);
    c.restore();
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

  // A flat shockwave racing out along the ground at x.
  const groundWave = (x, cols, r1, ms) => fxRun(ms || 420, (c, k) => {
    const e = easeOut(k);
    c.globalAlpha = 1 - k * 0.7;
    cols.forEach((col, i) => { const q = k01(e * 1.2 - i * 0.14); if (q > 0) ellipse(c, x, 121, 4 + q * r1, 1 + q * r1 * 0.18, 0, col, i ? 1 : 2); });
    c.globalAlpha = 1;
  });

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

  // Speed lines streaming behind something moving along angle `ang`.
  const speedLines = (c, x, y, ang, n, len, col, gap) => {
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * (gap || 4), ph = (G.t * 7 + i * 0.37) % 1, s0 = 4 + ph * len * 0.6, l = len * (0.4 + 0.15 * ((i * 7) % 5));
      pxLine(c, x - ux * s0 + nx * o, y - uy * s0 + ny * o, x - ux * (s0 + l) + nx * o, y - uy * (s0 + l) + ny * o, col, 1);
    }
  };

  // A spike that tapers from w at (x,y) to a point `l` away along angle a.
  const spikeLine = (c, x, y, a, l, w, col) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const [f0, f1, d] of [[0, 0.45, 0], [0.45, 0.8, 1], [0.8, 1, 2]]) {
      pxLine(c, x + ca * l * f0, y + sa * l * f0, x + ca * l * f1, y + sa * l * f1, col, Math.max(1, w - d));
    }
  };

  // Tapered spikes bursting out of a point, each with a dark rim, a body and a bright core.
  const flare = (pos, n, len, ms, cols, rot) => {
    cols = cols || ['#1f5aa8', '#3a9ae8', '#e8f6ff'];
    const lens = Array.from({ length: n }, (_, i) => (i % 2 ? 0.55 : 1) * rand(0.8, 1.1));
    return fxRun(ms || 320, (c, k) => {
      const e = easeOut(Math.min(1, k * 2.6)), w = Math.max(1, Math.round(4 * (1 - k01((k - 0.35) / 0.65))));
      for (let L = 0; L < 3; L++) {
        for (let i = 0; i < n; i++) {
          const a = (rot || 0) + i * Math.PI * 2 / n, l = len * e * lens[i] * (L === 2 ? 0.6 : 1);
          if (l >= 1) spikeLine(c, pos.x, pos.y, a, l, L === 0 ? w + 2 : L === 1 ? w : Math.max(1, w - 2), cols[L]);
        }
      }
    });
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
  // A heavy bolt: deep blue glow, blue body, white-hot core.
  const bolt3 = (c, pts, w) => {
    for (const [col, d] of [['#1f4a98', 4], ['#7cb8ff', 2], ['#ffffff', 0]]) {
      for (let i = 1; i < pts.length; i++) pxLine(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, w + d);
    }
  };
  // Little arcs of static crawling over a spot (re-rolled several times a second).
  const static_ = (getPos, n, r) => flicker(() => {
    const p = getPos();
    return Array.from({ length: n }, () => { const a = rand(0, 6.28), b = a + rand(-1.2, 1.2), r0 = rand(0, r * 0.5); return jag(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0, p.x + Math.cos(b) * r, p.y + Math.sin(b) * r, 3, 2); });
  });

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
  // A row of flame tongues standing on the ground around x, `h` tall at the middle.
  const flameRow = (c, x, n, gap, h, w, cols) => {
    for (let i = 0; i < n; i++) {
      const q = n > 1 ? Math.abs(i / (n - 1) - 0.5) * 2 : 0;
      flame(c, x - (n - 1) * gap / 2 + i * gap, 122, Math.round(h * (1 - q * 0.45) * (0.85 + 0.15 * Math.sin(G.t * 9 + i * 2))), w, i * 1.9, cols);
    }
  };

  // A tapering trail of blue fire through `pts` (newest first), laid down layer by layer.
  // The points are resampled along the path so a fast mover leaves one unbroken tongue of fire.
  const fireTrail = (c, pts, w, layers) => {
    layers = layers || PHX_LAYERS;
    const n = pts.length, D = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      D.push({ x: a.x, y: a.y - i * 0.6, f: i / n });
      if (!b) continue;
      const L = Math.hypot(b.x - a.x, b.y - a.y), step = Math.max(2, w * (1 - i / n) * 0.6);
      for (let s = step; s < L; s += step) { const t = s / L; D.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - (i + t) * 0.6, f: (i + t) / n }); }
    }
    for (const [col, lf] of layers) {
      for (let j = 0; j < D.length; j++) {
        const d = D[j], r = w * (1 - d.f) * lf * (1 + Math.sin(G.t * 41 + j * 0.9) * 0.12);
        if (r >= 0.8) pxCircle(c, d.x, d.y, r, col);
      }
    }
  };

  // A ball of blue phoenix fire with tongues licking off its top.
  const blueBall = (c, x, y, r) => {
    if (r < 1) return;
    for (let i = 0; i < 3; i++) flame(c, x - r * 0.45 + i * r * 0.45, y - r * 0.5, Math.round(r * (0.9 + 0.35 * (i % 2))), Math.max(3, Math.round(r * 0.7)), i * 2.3);
    const w = 1 + Math.sin(G.t * 37) * 0.06;
    for (const [col, f] of PHX_LAYERS) pxCircle(c, x, y - r * (1 - f) * 0.3, r * f * w, col);
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

  // A single blue-flame feather flying point-first along angle a.
  const feather = (c, x, y, a, len) => {
    const ca = Math.cos(a), sa = Math.sin(a), bx = x - ca * len, by = y - sa * len;
    c.globalAlpha = 0.6;
    pxLine(c, bx - ca * len, by - sa * len, bx, by, '#ffffff', 1);
    c.globalAlpha = 1;
    pxLine(c, bx, by, x, y, '#0e2a5a', 5);
    pxLine(c, bx + ca, by + sa, x - ca, y - sa, '#3a9ae8', 3);
    pxLine(c, bx + ca * len * 0.3, by + sa * len * 0.3, x, y, '#ffffff', 1);
    pxRect(c, x - 1, y - 1, 3, 3, '#ffd04a');
    pxRect(c, bx - 1, by - 1, 2, 2, '#7cd0ff');
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

  // Law's ROOM: a pale see-through dome sitting on the ground; `edge` brightens and thickens its skin.
  const room = (c, cx, r, a, edge) => {
    if (r < 2 || a <= 0) return;
    c.globalAlpha = 0.16 * a;
    for (let dy = 0; dy <= r; dy++) { const hw = Math.sqrt(r * r - dy * dy); pxRect(c, cx - hw, 121 - dy, hw * 2, 1, '#7cd0ff'); }
    c.globalAlpha = 0.45 * a;
    for (let mi = 0; mi < 3; mi++) {
      const f = Math.cos(G.t * 0.9 + mi * Math.PI / 3);
      for (let i = 0; i <= 28; i++) { const t = Math.PI * i / 28; pxRect(c, cx + Math.cos(t) * r * f, 121 - Math.sin(t) * r, 1, 1, '#bfe6ff'); }
    }
    for (const h of [0.45, 0.8]) { const yy = 121 - r * h, hw = Math.sqrt(Math.max(0, r * r - (r * h) * (r * h))); for (let x = -hw; x <= hw; x += 3) pxRect(c, cx + x, yy + Math.sin(x * 0.1) * 0.5, 1, 1, '#bfe6ff'); }
    c.globalAlpha = a;
    const n = Math.max(16, Math.round(r * 3)), t = 1 + Math.round(edge || 0);
    for (let i = 0; i <= n; i++) { const u = Math.PI * i / n; pxRect(c, cx + Math.cos(u) * r, 121 - Math.sin(u) * r, t, t, edge > 0.5 ? '#ffffff' : '#e8f6ff'); }
    c.globalAlpha = 1;
  };

  const box = (c, x, y, w, h, col) => {
    pxRect(c, x, y, w, 1, col); pxRect(c, x, y + h - 1, w, 1, col);
    pxRect(c, x, y, 1, h, col); pxRect(c, x + w - 1, y, 1, h, col);
  };

  // A wire-frame cube around a figure standing at (x, y): what Shambles boxes things in before it swaps them.
  const cubeFrame = (c, x, y, w, h, col) => {
    const d = Math.round(w / 4), x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
    for (const [o, cc] of [[1, '#1f5aa8'], [0, col]]) {
      box(c, x0 + o, y0 + o, w, h, cc);
      box(c, x0 + d + o, y0 - d + o, w, h, cc);
      for (const [px, py] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) pxLine(c, x0 + px + o, y0 + py + o, x0 + px + d + o, y0 + py - d + o, cc, 1);
    }
  };

  // Mes: the little cube a heart gets kept in; `sq` squeezes it.
  const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
  const cube = (c, x, y, s, beat, sq) => {
    sq = sq || 0;
    const w = Math.max(3, Math.round(s * (1 + sq))), h = Math.max(3, Math.round(s * (1 - sq)));
    const d = Math.max(2, Math.round(s / 3)), x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
    const faces = (dx, dy, f, t, r) => {
      pxRect(c, x0 + dx, y0 + dy, w, h, f);
      for (let i = 1; i <= d; i++) { pxRect(c, x0 + i + dx, y0 - i + dy, w, 1, t); pxRect(c, x0 + w - 1 + i + dx, y0 - i + dy, 1, h, r); }
    };
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) faces(dx, dy, PAL.k, PAL.k, PAL.k);
    faces(0, 0, '#ffd0e0', '#fff0f6', '#e08aa8');
    const p = s >= 12 ? 2 : 1, hx = x0 + Math.round((w - 5 * p) / 2), hy = y0 + Math.round((h - 5 * p) / 2);
    HEART.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === 'X') pxRect(c, hx + i * p, hy + j * p, p, p, beat ? '#ff3a5a' : '#c0203a'); });
    pxRect(c, x0 + 1, y0 + 1, Math.max(1, Math.round(w / 3)), 1, '#ffffff');
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

  // A balled fist at (x,y) punching along angle a.
  const fist = (c, x, y, a, r, col) => {
    pxCircle(c, x, y, r + 1, PAL.k);
    pxCircle(c, x, y, r, col || SKIN);
    pxLine(c, x - Math.sin(a) * r * 0.6, y + Math.cos(a) * r * 0.6, x + Math.cos(a) * r * 0.5 - Math.sin(a) * r * 0.6, y + Math.sin(a) * r * 0.5 + Math.cos(a) * r * 0.6, SKIN_SH, 1);
    pxRect(c, x - Math.cos(a) * r * 0.3 - 1, y - r * 0.5, 2, 1, '#ffe0c0');
  };

  // A sprouted arm reaching from (x0,y0) to a hand at (x1,y1); `closed` makes a fist.
  const arm = (c, x0, y0, x1, y1, w, col, closed) => {
    col = col || SKIN;
    const a = Math.atan2(y1 - y0, x1 - x0);
    pxLine(c, x0, y0, x1, y1, PAL.k, w + 2);
    if (closed) fist(c, x1, y1, a, Math.max(2, Math.round(w * 1.1)), col);
    else hand(c, x1, y1, a, Math.max(1, Math.round(w * 0.8)), w, col, PAL.k);
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

  // Robin's crossed-arms pose in front of the hero's chest, petals drifting off it.
  const crossArms = (c, a) => {
    if (a <= 0) return;
    const hc = heroC(), x = hc.x + 6, y = hc.y - 4;
    c.globalAlpha = a;
    arm(c, x - 6, y + 5, x + 6, y - 5, 2);
    arm(c, x - 6, y - 5, x + 6, y + 5, 2);
    c.globalAlpha = 1;
    if (Math.random() < 0.15 * a) petals(x, y, 1, 20);
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

  // A wavy tendril of darkness from (x0,y0) to (x1,y1).
  const tendril = (c, x0, y0, x1, y1, w, ph) => {
    let px = x0, py = y0;
    const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
    for (let j = 1; j <= 8; j++) {
      const q = j / 8, o = Math.sin(G.t * 14 + ph + q * 5) * 3 * Math.sin(q * Math.PI), x = lerp(x0, x1, q) + nx / l * o, y = lerp(y0, y1, q) + ny / l * o;
      pxLine(c, px, py, x, y, '#0a0612', Math.max(1, Math.round(w * (1 - q * 0.6))) + 1);
      pxLine(c, px, py, x, y, j > 5 ? '#8a5ac0' : '#3a2a4a', Math.max(1, Math.round(w * (1 - q * 0.6)) - 1));
      px = x; py = y;
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
  // A bank of storm clouds across the top of the screen over x; `a` 0..1 rolls it in.
  const stormSky = (c, x, a, dim) => {
    if (a <= 0) return;
    c.globalAlpha = (dim || 0.35) * a;
    pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#0a1430');
    c.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      const cx = x - 90 + i * 30 + Math.sin(G.t * 0.8 + i) * 3, cy = VIEW.y + 24 + (i % 2) * 8 - (1 - a) * 40;
      cloud(c, cx, cy, 10 + (i % 3) * 3);
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

  // A billowing puff of dust: dark rim, sandy body, pale top.
  const dustPuff = (c, x, y, r) => {
    if (r < 1) return;
    pxCircle(c, x, y, r + 1, '#8a6a3a');
    pxCircle(c, x, y, r, '#d8b070');
    pxCircle(c, x - r * 0.25, y - r * 0.3, r * 0.6, '#f0d8a0');
  };

  // A spinning column of sand standing on the ground at x, `h` tall: bright bands in front, dim behind.
  // part 1 draws only the body and the back (to go behind the foe), part 2 only the front.
  const twister = (c, x, h, wide, part) => {
    if (h < 2) return;
    c.globalAlpha = 0.35;
    if (part !== 2) for (let y = 0; y < h; y += 2) { const rr = 5 + y / 100 * 30 * wide + Math.sin(G.t * 12 + y * 0.2) * 2; pxRect(c, x - rr, 121 - y, rr * 2, 2, y % 6 < 3 ? '#e8c890' : '#c9a46a'); }
    for (const front of [false, true]) {
      if ((part === 1 && front) || (part === 2 && !front)) continue;
      c.globalAlpha = front ? 0.95 : 0.5;
      for (let band = 0; band < 4; band++) {
        for (let i = 0; i < 40; i++) {
          const q = i / 40, a = G.t * 13 + q * 10 + band * Math.PI / 2, s = Math.sin(a), y = 121 - q * h, r = 5 + q * 30 * wide;
          if ((s > -0.2) !== front) continue;
          pxRect(c, x + Math.cos(a) * r, y + s * r * 0.15, front ? 3 : 2, front ? 2 : 1, front ? (band % 2 ? '#f5e0b0' : '#e8c890') : '#a8864a');
        }
      }
    }
    c.globalAlpha = 1;
  };

  // A quicksand whirlpool on the ground; `front` redraws the half in front of the foe.
  const whirl = (c, cx, rx, ry, front) => {
    if (rx < 2) return;
    oval(c, cx, 121, rx + 1, ry + 1, '#8a6a3a', front);
    oval(c, cx, 121, rx, ry, '#e8c890', front);
    oval(c, cx, 121, rx * 0.7, ry * 0.7, '#d8b070', front);
    oval(c, cx, 121, rx * 0.42, ry * 0.42, '#b8945a', front);
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
  const demon = (c, x, y, rise, wing, a) => {
    if (rise <= 0.02) return;
    a = a === undefined ? 1 : a;
    const sh = y - 70 * rise, top = y - 98 * rise;
    for (const s of [-1, 1]) {
      const root = [x + s * 12, sh + 4];
      const tips = [0, 1, 2, 3].map(i => { const an = -Math.PI / 2 + s * (0.3 + i * (0.12 + 0.35 * wing)), l = [54, 60, 56, 46][i] * rise; return [root[0] + Math.cos(an) * l, root[1] + Math.sin(an) * l]; });
      c.globalAlpha = 0.85 * a;
      for (let i = 0; i < 3; i++) tri(c, root, tips[i], tips[i + 1], '#2a1a3a');
      c.globalAlpha = a;
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

  // A point on a cubic bezier through four {x, y} points.
  const bez = (P, t) => {
    const u = 1 - t;
    return { x: u * u * u * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t * t * t * P[3].x, y: u * u * u * P[0].y + 3 * u * u * t * P[1].y + 3 * u * t * t * P[2].y + t * t * t * P[3].y };
  };

  // ---------- Bird-Bird Fruit: Phoenix (Marco's blue flames of rebirth) ----------
  Object.assign(MOVE_FX, {
    // Phoenix Brand: crouch, a winged leap, your foot bursts into blue flame at the top of it and you
    // drive it down into the foe like a comet, then flip clear.
    phoenixbrand: async m => {
      const hero = G.hero, foot = () => ({ x: hero.x + hero.ox + 7, y: 117 + hero.oy });
      const S = { wing: 0, fire: 0.25, dive: false }, trail = [];
      hold(true);
      Sfx.play('fire');
      const stop = layer(c => {
        const f = foot();
        trail.unshift(f);
        if (trail.length > (S.dive ? 12 : 4)) trail.length = S.dive ? 12 : 4;
        if (S.wing > 0.05) {
          const flap = S.dive ? 0.35 : Math.sin(G.t * 24) * 0.35;
          wing(c, hero.x + hero.ox - 3, 98 + hero.oy, Math.PI + 0.15 + flap, Math.PI + 0.15 + flap + 1.3 * S.wing, 8 + 20 * S.wing, 6);
          heroOver(c);
        }
        if (S.dive) speedLines(c, f.x, f.y, 0.72, 7, 30, '#bfe6ff', 5);
        fireTrail(c, trail, 1.5 + 5 * S.fire);
        if (S.fire > 0.5 && Math.random() < 0.6) embers(f.x, f.y, 1, 25);
      });
      // wind-up and leap
      await tween(hero, { squash: 0.22, ox: -4 }, 170);
      Sfx.play('stretch');
      dust(hero.x - 2, 6);
      tween(S, { wing: 1 }, 220);
      await tween(hero, { ox: 18, oy: -50, squash: -0.15 }, 250);
      // the foot ignites at the top of the leap
      Sfx.play('fire');
      ringOut(foot(), '#7cd0ff', 2, 16, 240, 1);
      flare(foot(), 8, 10, 200);
      await tween(S, { fire: 1 }, 110);
      // comet dive
      S.dive = true;
      tween(S, { wing: 0.4 }, 120);
      await tween(hero, { ox: 70, oy: -4, squash: 0.08 }, 130, easeIn);
      const fc = fc0();
      m.hit(0);
      Sfx.play('boom');
      impact(fc, ['#ffffff', '#7cd0ff', '#ffd04a'], 16);
      flare(fc, 10, 26, 340);
      groundWave(fc.x, ['#7cd0ff', '#1f5aa8'], 34, 380);
      fxRun(480, (c, k) => flameRow(c, fc.x, 4, 8, Math.sin(k * Math.PI) * 26, 9));
      embers(fc.x, fc.y, 18, 80);
      shake(6, 300);
      // flip clear and land
      S.dive = false;
      tween(S, { fire: 0, wing: 0 }, 300);
      await tween(hero, { ox: 46, oy: -24, squash: -0.1 }, 150);
      await back(230);
      stop();
      hold(false);
    },

    // Flames of Rebirth: blue fire wraps you and mends you, then rolls along the ground as a wave that
    // crashes over the foe, and its embers drift back into you.
    rebirth: async m => {
      const hero = G.hero, fc = fc0(), S = { up: 0, glow: 0 };
      const glowSpr = variantOf(heroSprite(), 'flash');
      hold(true);
      Sfx.play('fire');
      tween(S, { up: 1 }, 260);
      const aura = fxRun(1500, (c, k) => {
        const up = S.up * (k > 0.75 ? (1 - k) / 0.25 : 1), hc = heroC();
        if (up <= 0.02) return;
        flameRow(c, hc.x, 5, 7, up * 34, 10);
        heroOver(c);
        if (S.glow > 0) drawSpriteAt(c, glowSpr, hero.x + hero.ox, 121 + hero.oy, 2, { squash: hero.squash, alpha: S.glow * (0.45 + 0.2 * Math.sin(G.t * 40)), shadow: false, flip: !!hero.form });
        c.globalAlpha = 0.7;
        flameRow(c, hc.x, 3, 9, up * 14, 8);
        c.globalAlpha = up;
        for (let i = 0; i < 2; i++) { const q = (k * 2.2 + i / 2) % 1; ellipse(c, hc.x, 120 - q * 40, 17 - q * 7, 3, 0, q < 0.5 ? '#bfe6ff' : '#7cd0ff'); }
        c.globalAlpha = 1;
        if (up > 0.3) for (let i = 0; i < 4; i++) { const q = (k * 1.6 + i / 4) % 1; plus(c, hc.x - 12 + i * 8, 108 - q * 40, q < 0.5 ? '#fff3a0' : '#ffd04a'); }
        if (Math.random() < 0.5 * up) embers(hc.x + rand(-12, 12), 118, 1, 30);
      });
      await wait(380);
      Sfx.play('heal');
      S.glow = 1;
      tween(S, { glow: 0 }, 520);
      ringOut(heroC(), '#bfe6ff', 6, 28, 320, 1);
      await wait(160);
      // the fire rolls out along the ground in a wave
      Sfx.play('fire');
      tween(hero, { ox: 8, squash: -0.08 }, 120);
      const x0 = heroC().x + 16, x1 = fc.x - 8;
      await fxRun(330, (c, k) => {
        const front = lerp(x0, x1, easeIn(k));
        for (let x = x0, i = 0; x < front; x += 6, i++) { const q = (x - x0) / Math.max(1, front - x0); flame(c, x, 122, Math.round(3 + q * q * 20), 7, i * 1.3); }
        speedLines(c, front - 6, 112, 0, 4, 22, '#bfe6ff', 4);
        blueBall(c, front, 113, 6);
      });
      m.hit(0);
      Sfx.play('fire');
      impact(fc, ['#ffffff', '#7cd0ff'], 12);
      flare(fc, 8, 20, 300);
      shake(5, 300);
      fxRun(560, (c, k) => flameRow(c, fc.x, 5, 8, Math.sin(Math.min(1, k * 2.5) * Math.PI / 2) * (1 - k01((k - 0.55) / 0.45)) * 46, 11));
      embers(fc.x, fc.y, 20, 70);
      // embers drift home and mend you
      const motes = Array.from({ length: 12 }, (_, i) => ({ d: i * 0.035, y: fc.y + rand(-14, 10), arc: rand(14, 34) }));
      tween(hero, { ox: 0, squash: 0 }, 220);
      let healed = false;
      await fxRun(640, (c, k) => {
        const h = heroC();
        for (const mo of motes) {
          const q = k01((k - 0.15 - mo.d) * 1.8);
          if (q <= 0 || q >= 1) continue;
          const x = lerp(fc.x, h.x, easeIn(q)), y = lerp(mo.y, h.y, q) - Math.sin(q * Math.PI) * mo.arc;
          pxCircle(c, x, y, 1.5, '#3a9ae8');
          pxRect(c, x, y, 1, 1, q > 0.5 ? '#ffd04a' : '#ffffff');
        }
        if (!healed && k > 0.75) { healed = true; S.glow = 0.8; tween(S, { glow: 0 }, 300); }
      });
      await aura;
      await back(100);
      hold(false);
    },

    // Phoenix Pyreapple: wings flare, blue fire spirals into a pineapple-shaped blaze over your hand,
    // you hurl it as a phoenix, and it bursts into a towering pyre on the foe.
    pyreapple: async m => {
      const hero = G.hero, fc = fc0(), S = { wing: 0, s: 0 };
      const orb = () => ({ x: hero.x + hero.ox + 8, y: 72 + hero.oy });
      hold(true);
      Sfx.play('charge');
      const stopW = layer(c => {
        if (S.wing < 0.05) return;
        wing(c, hero.x + hero.ox - 3, 98 + hero.oy, Math.PI - 0.15 + Math.sin(G.t * 10) * 0.1, Math.PI - 0.15 + 1.45 * S.wing, 10 + 22 * S.wing, 7);
        heroOver(c);
      });
      tween(S, { wing: 1 }, 280);
      tween(hero, { oy: -6, squash: -0.1 }, 280);
      const streams = Array.from({ length: 14 }, (_, i) => ({ a: i * 0.449, r: rand(30, 46), gold: i % 3 === 0 }));
      await fxRun(600, (c, k) => {
        const o = orb();
        for (const s of streams) {
          const r = s.r * (1 - easeIn(k)) + 4, a = s.a + k * 5;
          pxLine(c, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.8, o.x + Math.cos(a - 0.25) * (r + 7), o.y + Math.sin(a - 0.25) * (r + 7) * 0.8, s.gold ? '#ffd04a' : '#7cd0ff', 1);
        }
        S.s = 0.15 + easeOut(k) * 0.55;
        pyre(c, o.x, o.y, S.s);
        if (Math.random() < 0.4) embers(o.x, o.y - 8, 1, 20);
      });
      // hurl it: it takes flight as a phoenix
      Sfx.play('fire');
      tween(S, { wing: 0 }, 300);
      tween(hero, { ox: 12, oy: -2, squash: 0.1 }, 110, easeIn);
      const o = orb(), tx = fc.x, ty = fc.y - 4, trail = [];
      const at = k => { const e = k * (0.45 + 0.55 * k); return { x: lerp(o.x, tx, e), y: lerp(o.y, ty, e) - Math.sin(e * Math.PI) * 30 }; };
      await fxRun(400, (c, k) => {
        const p = at(k), q = at(Math.max(0, k - 0.04)), a = Math.atan2(p.y - q.y, p.x - q.x);
        trail.unshift({ x: p.x - Math.cos(a) * 10, y: p.y - Math.sin(a) * 10 });
        if (trail.length > 18) trail.length = 18;
        fireTrail(c, trail, 10);
        for (let i = 2; i < trail.length; i += 3) pxRect(c, trail[i].x + rand(-6, 6), trail[i].y + rand(-6, 6), 2, 2, i % 2 ? '#ffd04a' : '#ffffff');
        phoenix(c, p.x, p.y, 2.2, a, Math.sin(G.t * 20));
        if (Math.random() < 0.7) embers(p.x, p.y, 1, 20);
      });
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#3a9ae8', 0.55);
      focusLines(fc, '#bfe6ff', 360);
      ringOut(fc, '#ffd04a', 6, 48, 500, 2);
      ringOut(fc, '#7cd0ff', 4, 38, 450, 3);
      flare(fc, 12, 34, 380);
      groundWave(fc.x, ['#7cd0ff', '#ffd04a', '#1f5aa8'], 52, 500);
      particles(fc.x, fc.y, 36, { colors: PHX_EMBER, speed: 130, grav: -30, size: 3 });
      shake(8, 500);
      const home = back(300);
      // the pyre stands on the foe and burns itself out
      await fxRun(720, (c, k) => {
        if (k > 0.72 && Math.floor(k * 24) % 2) return;
        const g = k < 0.18 ? easeOut(k / 0.18) * 1.15 : lerp(1.15, 1, k01((k - 0.18) / 0.15));
        flameRow(c, fc.x, 5, 9, 26 * (1 - k * 0.5), 11);
        pyre(c, fc.x, fc.y - 6, g);
        if (Math.random() < 0.6) embers(fc.x + rand(-14, 14), fc.y - rand(0, 20), 1, 30);
      });
      embers(fc.x, fc.y - 6, 24, 60);
      await home;
      stopW();
      hold(false);
    },

    // Blue Flame Wings (awakened): you rise on vast wings of blue fire, beat them twice, then sweep them
    // forward and loose a storm of burning feathers; the embers drift back to heal you.
    bluewings: async m => {
      const hero = G.hero, fc = fc0(), S = { open: 0, flap: 0, a: 1, glow: 0, heal: 0 };
      const sh = () => ({ x: hero.x + hero.ox - 2, y: 96 + hero.oy });
      const glowSpr = variantOf(heroSprite(), 'flash');
      hold(true);
      Sfx.play('fire');
      const stop = layer(c => {
        const p = sh(), f = S.flap;
        c.globalAlpha = S.a;
        wing(c, p.x, p.y, Math.PI + 0.15 + f * 0.5, Math.PI + 0.15 + 1.25 * S.open + f * 0.5, 22 + 34 * S.open, 8);
        wing(c, p.x + 4, p.y, -1.4 * S.open - f * 0.6, -0.15 * S.open - f * 0.6, 26 + 52 * S.open, 9);
        c.globalAlpha = 1;
        heroOver(c);
        if (S.heal > 0) drawSpriteAt(c, glowSpr, hero.x + hero.ox, 121 + hero.oy, 2, { squash: hero.squash, alpha: S.heal * (0.45 + 0.2 * Math.sin(G.t * 40)), shadow: false, flip: !!hero.form });
        if (S.glow > 0 && Math.random() < S.glow) particles(p.x + rand(-30, 70), p.y + rand(-70, 0), 1, { colors: GOLDF, speed: 15, grav: -20, life: 0.4 });
      });
      await Promise.all([tween(hero, { oy: -14 }, 320), tween(S, { open: 1 }, 380)]);
      // two great wingbeats, each kicking a gust off the ground
      for (let i = 0; i < 2; i++) {
        await tween(S, { flap: 1 }, 120);
        Sfx.play('stretch');
        tween(hero, { oy: -19 }, 110);
        await tween(S, { flap: -0.8 }, 110, easeIn);
        const gx = hero.x + hero.ox;
        for (const d of [0, Math.PI]) particles(gx, 118, 6, { colors: ['#c9b88a', '#e8d9b0', '#bfe6ff'], speed: 80, grav: 10, dir: d, spread: 0.5, life: 0.4 });
        groundWave(gx, ['#bfe6ff'], 28, 280);
        tween(hero, { oy: -14 }, 120);
      }
      // wind-up: wings high, gold sparks at the tips
      Sfx.play('charge');
      S.glow = 1;
      await tween(S, { flap: 1.3 }, 220);
      // sweep forward and loose the feathers
      Sfx.play('slash');
      S.glow = 0;
      tween(S, { flap: -1 }, 120, easeIn);
      const p0 = sh();
      arcSweep(p0.x + 4, p0.y, 72, -1.6, 0.5, '#7cd0ff', 280, 4);
      const fs = Array.from({ length: 11 }, (_, i) => ({ d: i * 0.032, x0: p0.x + 24 + rand(-8, 26), y0: p0.y - 52 + i * 6 + rand(-3, 3), tx: fc.x + rand(-10, 8), ty: fc.y + rand(-16, 14), bend: rand(-14, 14), done: false }));
      let hit = false;
      await fxRun(440, (c, k) => {
        for (const f of fs) {
          const q = k01((k - f.d) / 0.5);
          if (q <= 0) continue;
          if (q >= 1) {
            if (f.done) continue;
            f.done = true;
            particles(f.tx, f.ty, 4, { colors: PHX_EMBER, speed: 60, grav: -20, life: 0.3 });
            if (!hit) {
              hit = true;
              m.hit(0);
              Sfx.play('fire');
              screenFlash('#7cd0ff', 0.45);
              focusLines(fc, '#bfe6ff', 380);
              flare(fc, 12, 30, 380);
              ringOut(fc, '#ffffff', 4, 40, 400, 2);
              shake(8, 500);
            } else impact({ x: f.tx, y: f.ty }, ['#ffffff', '#7cd0ff'], 3);
            continue;
          }
          const e = easeIn(q), e2 = easeIn(Math.max(0, q - 0.06));
          const x = lerp(f.x0, f.tx, e), y = lerp(f.y0, f.ty, e) + Math.sin(e * Math.PI) * f.bend;
          const x2 = lerp(f.x0, f.tx, e2), y2 = lerp(f.y0, f.ty, e2) + Math.sin(e2 * Math.PI) * f.bend;
          feather(c, x, y, Math.atan2(y - y2, x - x2), 13);
        }
      });
      if (!hit) m.hit(0);
      // the feathers flare up into a blaze on the foe
      Sfx.play('fire');
      particles(fc.x, fc.y, 30, { colors: PHX_EMBER, speed: 110, grav: -40, size: 3 });
      const blaze = fxRun(560, (c, k) => flameRow(c, fc.x, 5, 9, Math.sin(Math.min(1, k * 2) * Math.PI / 2) * (1 - k01((k - 0.6) / 0.4)) * 42, 12));
      // embers drift back and mend you while the wings fold away
      const motes = Array.from({ length: 14 }, (_, i) => ({ d: i * 0.03, y: fc.y + rand(-16, 12), arc: rand(18, 40) }));
      tween(S, { flap: 0 }, 200);
      await fxRun(560, (c, k) => {
        const h = heroC();
        for (const mo of motes) {
          const q = k01((k - mo.d) * 1.7);
          if (q <= 0 || q >= 1) continue;
          const x = lerp(fc.x, h.x, easeIn(q)), y = lerp(mo.y, h.y - 8, q) - Math.sin(q * Math.PI) * mo.arc;
          pxCircle(c, x, y, 1.5, '#3a9ae8');
          pxRect(c, x, y, 1, 1, '#ffd04a');
        }
        if (k > 0.6 && !S.healed) { S.healed = true; Sfx.play('heal'); S.heal = 1; tween(S, { heal: 0 }, 360); }
      });
      await Promise.all([tween(S, { open: 0, a: 0 }, 260), back(260)]);
      await blaze;
      stop();
      hold(false);
    },

    // Phoenix Rebirth Dive (awakened): a pillar of blue fire swallows you and a great phoenix bursts out,
    // soars to the top of the sky, spreads its wings with a cry, then dives as a comet; the foe vanishes
    // in a dome of blue fire and you re-form out of the flames.
    phoenixdive: async m => {
      const hero = G.hero, hc = heroC(), fc = fc0();
      hold(true);
      Sfx.play('fire');
      tween(hero, { squash: 0.18 }, 200);
      const column = fxRun(560, (c, k) => {
        const h = Math.sin(Math.min(1, k * 1.8) * Math.PI / 2) * (k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1);
        flameRow(c, hc.x, 5, 8, h * 52, 13);
      });
      await wait(230);
      hero.alpha = 0;
      hero.squash = 0;
      screenFlash('#bfe6ff', 0.6);
      Sfx.play('boom');
      ringOut(hc, '#7cd0ff', 4, 36, 320, 2);
      embers(hc.x, hc.y, 20, 90);
      const B = { x: hc.x, y: hc.y - 6, ang: -1.3, s: 2.2, dive: false, on: true, halo: 0, flap: null }, trail = [];
      const sky = fxRun(2100, (c, k) => {
        c.globalAlpha = 0.38 * Math.min(1, k * 5) * (k > 0.76 ? (1 - k) / 0.24 : 1);
        pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#06122e');
        c.globalAlpha = 1;
      });
      const stop = layer(c => {
        if (!B.on) return;
        trail.unshift({ x: B.x, y: B.y });
        if (trail.length > (B.dive ? 16 : 9)) trail.length = B.dive ? 16 : 9;
        if (B.dive) speedLines(c, B.x, B.y, B.ang, 9, 60, '#bfe6ff', 6);
        fireTrail(c, trail, B.dive ? 15 : 7);
        if (B.halo > 0) {
          for (let i = 0; i < 10; i++) { const a = i * 0.628 + G.t * 2, r = 22 + 6 * Math.sin(G.t * 9 + i); pxRect(c, B.x + Math.cos(a) * r * B.halo, B.y + Math.sin(a) * r * B.halo, 2, 2, i % 2 ? '#ffd04a' : '#ffffff'); }
          pxRing(c, B.x, B.y, 26 * B.halo, '#7cd0ff', 1);
        }
        phoenix(c, B.x, B.y, B.s, B.ang, B.flap !== null ? B.flap : Math.sin(G.t * 14));
        if (Math.random() < 0.6) embers(B.x - Math.cos(B.ang) * 18, B.y - Math.sin(B.ang) * 18, 1, 20);
      });
      // the phoenix spirals up to the top of the sky
      Sfx.play('charge');
      const p0 = { x: B.x, y: B.y }, top = { x: 100, y: VIEW.y + 60 };
      const path = [p0, { x: p0.x - 46, y: 40 }, { x: p0.x + 4, y: VIEW.y + 18 }, top];
      tween(B, { s: 3.2 }, 520);
      await fxRun(520, (c, k) => {
        const e = easeOut(k), P = bez(path, e), Q = bez(path, Math.max(0, e - 0.03));
        B.x = P.x; B.y = P.y; B.ang = Math.atan2(P.y - Q.y, P.x - Q.x);
      });
      // wings spread wide with a cry
      Sfx.play('boom');
      B.flap = 1;
      tween(B, { ang: 0.2 }, 120);
      fxRun(440, (c, k) => {
        for (let i = 0; i < 3; i++) { const q = (k * 2 + i / 3) % 1; c.globalAlpha = 1 - q; pxRing(c, B.x, B.y, 10 + q * 54, i % 2 ? '#ffffff' : '#7cd0ff', 1); }
        c.globalAlpha = 1;
      });
      particles(B.x, B.y, 16, { colors: GOLDF, speed: 60, grav: 0, life: 0.5 });
      shake(4, 300);
      await tween(B, { halo: 1 }, 400);
      // comet dive
      B.dive = true;
      B.flap = 0.12;
      B.halo = 0;
      B.ang = Math.atan2(fc.y - B.y, fc.x - B.x);
      Sfx.play('fire');
      await tween(B, { x: fc.x, y: fc.y }, 200, easeIn);
      B.on = false;
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 1);
      focusLines(fc, '#bfe6ff', 520);
      for (let i = 0; i < 4; i++) ringOut(fc, ['#ffffff', '#7cd0ff', '#3a9ae8', '#ffd04a'][i], 6, 50 + i * 18, 600, 3);
      groundWave(fc.x, ['#ffffff', '#7cd0ff', '#1f5aa8'], 92, 620);
      particles(fc.x, fc.y, 60, { colors: PHX_EMBER, speed: 170, grav: -30, size: 3 });
      shake(12, 800);
      const blast = fxRun(780, (c, k) => {
        const r = easeOut(Math.min(1, k * 1.6)) * 44, fade = 1 - k01((k - 0.3) / 0.7);
        // a pillar of blue fire up to the sky
        const pw = 13 * fade;
        if (pw >= 1) {
          for (let y = VIEW.y; y < 121; y += 3) {
            const w = pw * (0.55 + 0.45 * (y - VIEW.y) / (121 - VIEW.y)) + Math.sin(G.t * 40 + y * 0.3) * 2;
            pxRect(c, fc.x - w - 2, y, (w + 2) * 2, 3, '#1f5aa8');
            pxRect(c, fc.x - w, y, w * 2, 3, '#3a9ae8');
            pxRect(c, fc.x - w * 0.4, y, w * 0.8, 3, '#e8f6ff');
          }
        }
        // the dome of fire
        if (fade > 0.05) {
          c.globalAlpha = fade;
          for (const [col, f] of PHX_LAYERS) pxCircle(c, fc.x, fc.y + 4, r * f, col);
          c.globalAlpha = 1;
        }
        flameRow(c, fc.x, 7, 10, Math.sin(k * Math.PI) * 40, 12);
      });
      // you re-form out of a small blaze back home
      await wait(380);
      Sfx.play('heal');
      const reform = fxRun(460, (c, k) => {
        flameRow(c, hc.x, 3, 8, Math.sin(k * Math.PI) * 32, 11);
        if (k < 0.5) embers(hc.x + rand(-8, 8), 118, 1, 30);
      });
      hero.flash = 0.18;
      await tween(hero, { alpha: 1 }, 260);
      await Promise.all([blast, reform, column, sky]);
      stop();
      hold(false);
    },
  });

  // ---------- Op-Op Fruit (Law's ROOM) ----------
  Object.assign(MOVE_FX, {
    // Room: Shambles: a little ROOM sphere spins up on your palm and swells into a dome over the field;
    // you and the foe are boxed in cubes and swap places, one long stroke cuts the foe in two, and
    // you swap back.
    roomshambles: async m => {
      const hero = G.hero, F = G.battle.F, cx = Math.round((hero.x + F.x) / 2), R = 78;
      const S = { r: 0, a: 1, edge: 0, cubes: 0, split: false, gap: 0 };
      hold(true);
      Sfx.play('charge');
      tween(hero, { squash: -0.08 }, 160);
      await fxRun(200, (c, k) => {
        const h = heroHand(), x = h.x + 2, y = h.y - 10, r = 2 + easeOut(k) * 5;
        c.globalAlpha = 0.35;
        pxCircle(c, x, y, r, '#7cd0ff');
        c.globalAlpha = 1;
        for (let i = 0; i <= 12; i++) { const t = Math.PI * 2 * i / 12; pxRect(c, x + Math.cos(t) * r * Math.cos(G.t * 9), y + Math.sin(t) * r, 1, 1, '#bfe6ff'); }
        pxRing(c, x, y, r, '#e8f6ff', 1);
      });
      floatText(cx, 24, 'ROOM', '#bfe6ff');
      Sfx.play('stretch');
      const dome = layer(c => {
        room(c, cx, S.r, S.a, S.edge);
        if (S.cubes > 0 && Math.floor(G.t * 30) % 2 === 0) for (const x of [hero.x + hero.ox, F.x + F.ox]) cubeFrame(c, x, 123, 30, 36, '#e8f6ff');
        if (S.split) {
          const cut = foeSplit(c, 0.5, -7 * S.gap, -3 * S.gap);
          if (S.gap > 0.2) pxLine(c, cut.x - 2, cut.y, cut.x + cut.w + 2, cut.y, '#ffffff', 1);
        }
      });
      S.edge = 1;
      await tween(S, { r: R }, 240, easeOut);
      tween(S, { edge: 0 }, 200);
      await wait(60);
      // SHAMBLES: boxed up and swapped
      floatText(cx, 38, 'SHAMBLES', '#ffb0c8');
      Sfx.play('miss');
      S.cubes = 1;
      await wait(130);
      const dx = F.x - hero.x;
      for (const x of [hero.x, F.x]) particles(x, 104, 8, { colors: ['#e8f6ff', '#7cd0ff'], speed: 50, grav: 0, life: 0.3 });
      hero.ox = dx; F.ox = -dx;
      screenFlash('#e8f6ff', 0.3);
      await wait(70);
      S.cubes = 0;
      // one stroke right across the ROOM
      const fc = fc0();
      tween(hero, { ox: dx - 7, squash: -0.1 }, 80);
      slashAt({ x: cx, y: fc.y + 2 }, '#bfe6ff', Math.PI - 0.04, R * 2 - 12);
      await wait(60);
      m.hit(0);
      const split = plainFoe();
      if (split) { F.alpha = 0; S.split = true; }
      impact(fc, ['#ffffff', '#ffb0c8'], 10);
      shake(4, 200);
      tween(S, { gap: 1 }, 110);
      await wait(260);
      await tween(S, { gap: 0 }, 80);
      S.split = false;
      if (split) F.alpha = 1;
      // and swap back
      Sfx.play('miss');
      S.cubes = 1;
      await wait(110);
      for (const x of [hero.x, F.x]) particles(x, 104, 6, { colors: ['#e8f6ff', '#7cd0ff'], speed: 50, grav: 0, life: 0.3 });
      hero.ox = 0; F.ox = 0;
      S.cubes = 0;
      hold(false);
      await Promise.all([tween(S, { a: 0 }, 180), tween(hero, { squash: 0 }, 120)]);
      dome();
    },

    // Mes: a small ROOM blinks around the foe, you dash in and press your palm to its chest, and its heart
    // pops out of its back in a cube. You squeeze it twice, then push it back in.
    mes: async m => {
      const hero = G.hero, F = G.battle.F, R = { r: 0, a: 1 };
      hold(true);
      Sfx.play('charge');
      const dome = layer(c => room(c, F.x, R.r, R.a, 0));
      tween(R, { r: 42 }, 220);
      await tween(hero, { squash: 0.14, ox: -3 }, 130);
      await tween(hero, { ox: 54, squash: -0.08 }, 130, easeIn);
      const fc = fc0(), px = hero.x + hero.ox + 14, py = fc.y - 2;
      m.hit(0);
      Sfx.play('slash');
      impact({ x: px + 4, y: py }, ['#ffffff', '#ffb0c8'], 8);
      fxRun(300, (c, k) => {
        if (k < 0.7) hand(c, px + Math.round(easeOut(Math.min(1, k * 3)) * 3), py, 0, 3, 3, SKIN, PAL.k);
        for (let i = 0; i < 2; i++) { const q = k01(k * 1.6 - i * 0.25); if (q > 0 && q < 1) ellipse(c, fc.x + 8 + q * 12, py, 2 + q * 2, 6 + q * 10, 0, i ? '#ffb0c8' : '#ffffff'); }
      });
      floatText(fc.x, foeTop() - 12, 'MES', '#ffb0c8');
      // the heart pops out of the foe's back in a cube
      Sfx.play('find');
      const C = { x: fc.x + 6, y: py, s: 4, sq: 0, on: true };
      const heart = layer(c => {
        if (!C.on) return;
        const beat = Math.floor(G.t * 5) % 2;
        if (beat && C.s > 8) { c.globalAlpha = 0.6; pxRing(c, C.x + 2, C.y - 2, C.s + 2, '#ffb0c8', 1); c.globalAlpha = 1; }
        cube(c, C.x, C.y, Math.round(C.s), beat, C.sq);
      });
      tween(C, { s: 12 }, 200);
      tween(C, { y: fc.y - 30 }, 230);
      await Promise.all([tween(C, { x: fc.x + 26 }, 230, easeOut), back(240)]);
      // two squeezes: the foe doubles up with each one
      for (let i = 0; i < 2; i++) {
        await wait(100);
        Sfx.play('hurt');
        tween(C, { sq: 0.35 }, 60);
        ringOut(C, '#ff3a5a', 4, 15, 200, 1);
        F.flash = 0.06;
        F.squash = 0.14;
        tween(F, { squash: 0 }, 180);
        particles(C.x, C.y, 4, { colors: ['#ffb0c8', '#ff3a5a'], speed: 40, grav: 40, life: 0.3 });
        await wait(90);
        tween(C, { sq: 0 }, 100);
      }
      await wait(110);
      // and back in it goes
      Sfx.play('miss');
      tween(C, { s: 4 }, 180, easeIn);
      await tween(C, { x: fc.x + 2, y: fc.y - 2 }, 180, easeIn);
      C.on = false;
      impact(fc, ['#ffb0c8', '#ffffff'], 6);
      F.squash = 0;
      hold(false);
      await tween(R, { a: 0 }, 160);
      heart();
      dome();
    },

    // Gamma Knife: inside a ROOM, green energy coils into your palm and hardens into a long blade; you
    // drive it through the foe, which lights up like an x-ray as shocks bloom inside it.
    gammaknife: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), y = fc.y - 2, R = { r: 0, a: 1 };
      hold(true);
      Sfx.play('charge');
      const dome = layer(c => room(c, F.x, R.r, R.a, 0));
      tween(R, { r: 48 }, 260);
      tween(hero, { squash: 0.1, ox: -4 }, 300);
      const streams = Array.from({ length: 10 }, (_, i) => ({ a: i * 0.628, r: rand(18, 28) }));
      await fxRun(440, (c, k) => {
        const h = heroHand(), x = h.x + 4, yy = h.y - 2;
        for (const s of streams) { const r = s.r * (1 - easeIn(k)) + 3, a = s.a + k * 7; pxLine(c, x + Math.cos(a) * r, yy + Math.sin(a) * r * 0.7, x + Math.cos(a - 0.3) * (r + 5), yy + Math.sin(a - 0.3) * (r + 5) * 0.7, s.a > 3 ? '#7cff7a' : '#eaffea', 1); }
        const L = easeOut(k) * 10;
        pxLine(c, x, yy, x + L, yy, '#2ad65a', 3);
        pxLine(c, x, yy, x + L, yy, '#eaffea', 1);
        pxCircle(c, x, yy, 1 + k * 3, '#2ad65a');
        pxCircle(c, x, yy, k * 1.6, '#eaffea');
      });
      await tween(hero, { ox: 28, squash: -0.1 }, 100, easeIn);
      Sfx.play('zap');
      const blade = (c, e) => {
        const x0 = hero.x + hero.ox + 14, x1 = lerp(x0, fc.x + 46, e);
        for (let x = Math.round(x0); x <= x1; x++) {
          const q = (x - x0) / Math.max(1, x1 - x0), hw = 4 * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * q)), 0.6), band = ((x - Math.floor(G.t * 90)) % 7 + 7) % 7 < 2;
          c.globalAlpha = 0.3; pxRect(c, x, y - hw - 3, 1, hw * 2 + 6, '#7cff7a'); c.globalAlpha = 1;
          pxRect(c, x, y - hw - 1, 1, hw * 2 + 2, '#1a9a4a');
          pxRect(c, x, y - hw, 1, hw * 2, '#2ad65a');
          pxRect(c, x, y - hw * 0.55, 1, hw * 1.1, band ? '#eaffea' : '#9aff9a');
          if (hw > 1.2) pxRect(c, x, y, 1, 1, '#ffffff');
        }
        pxRect(c, x1, y - 1, 2, 2, '#ffffff');
      };
      await fxRun(150, (c, k) => blade(c, easeOut(k)));
      m.hit(0);
      Sfx.play('crit');
      focusLines(fc, '#9aff9a', 320);
      particles(fc.x, fc.y, 16, { colors: MED, speed: 60, grav: 0, life: 0.4 });
      shake(5, 320);
      // the foe lights up like an x-ray while shocks bloom inside it, never breaking the skin
      await fxRun(460, (c, k) => {
        blade(c, 1);
        if (Math.floor(k * 18) % 2 === 0) foeTint(c, 'tint', '#0a6a2a', 0.95);
        for (let i = 0; i < 3; i++) { const q = (k * 2 + i / 3) % 1; pxRing(c, fc.x, fc.y, 2 + q * 11, i % 2 ? '#eaffea' : '#7cff7a', 1); }
        for (let i = 0; i < 5; i++) { const a = i * 1.26 + k * 6, r = 8 + k * 12; plus(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r, '#9aff9a'); }
      });
      await fxRun(130, (c, k) => blade(c, 1 - k));
      hold(false);
      await Promise.all([back(), tween(R, { a: 0 }, 200)]);
      dome();
    },

    // Counter Shock (awakened): static crackles over your palm, you dash in and press it to the foe's
    // chest, hold for a breath, then a huge shock goes through it and it flickers like an x-ray.
    lawshock: async m => {
      const hero = G.hero, F = G.battle.F, R = { r: 0, a: 1 };
      hold(true);
      Sfx.play('charge');
      const dome = layer(c => room(c, F.x, R.r, R.a, 0));
      tween(R, { r: 46 }, 240);
      const sparks = static_(() => { const h = heroHand(); return { x: h.x + 2, y: h.y - 2 }; }, 4, 10);
      tween(hero, { squash: 0.14, ox: -4 }, 260);
      await fxRun(340, c => {
        const h = heroHand();
        for (const p of sparks()) bolt(c, p, 1, '#ffd04a', '#ffffff');
        pxCircle(c, h.x + 2, h.y - 2, 2 + Math.sin(G.t * 40), '#fff6a0');
      });
      Sfx.play('stretch');
      await tween(hero, { ox: 54, squash: -0.1 }, 140, easeIn);
      const fc = fc0(), px = hero.x + hero.ox + 14, py = fc.y - 2;
      // palm to the chest... a breath...
      await fxRun(120, (c, k) => {
        hand(c, px, py, 0, 3, 3, SKIN, PAL.k);
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 9, r = 12 * (1 - k) + 3; pxRect(c, px + 4 + Math.cos(a) * r, py + Math.sin(a) * r, 1, 1, i % 2 ? '#ffe14a' : '#ffffff'); }
      });
      // ...then the shock
      Sfx.play('zap');
      Sfx.play('boom');
      screenFlash('#fff6a0', 0.9);
      m.hit(0);
      focusLines(fc, '#ffe14a', 420);
      ringOut(fc, '#ffe14a', 4, 62, 500, 2);
      rays(fc, '#ffffff', 12, 54, 400, 0.2);
      particles(fc.x, fc.y, 30, { colors: ['#ffe14a', '#ffffff', '#bfe6ff'], speed: 140, grav: 0, life: 0.4 });
      shake(9, 600);
      const arcs = flicker(() => Array.from({ length: 10 }, (_, i) => {
        const a = (i < 6 ? -1.1 + i * 0.44 : 2 + (i - 6) * 0.75) + rand(-0.15, 0.15), l = rand(44, 76);
        return jag(fc.x, fc.y, fc.x + Math.cos(a) * l, fc.y + Math.sin(a) * l, 6, 5);
      }));
      const shock = fxRun(720, (c, k) => {
        if (k > 0.65 && Math.floor(k * 20) % 2) return;
        const fl = Math.floor(G.t * 24) % 2;
        foeTint(c, fl ? 'flash' : 'tint', fl ? '' : '#1b1424', 0.95);
        for (const p of arcs()) bolt(c, p, 1, '#ffd04a', '#ffffff');
        hand(c, px, py, 0, 3, 3, '#fff3a0', PAL.k);
        pxCircle(c, px + 4, py, 3 + 6 * (1 - k), '#ffffff');
      });
      tween(hero, { ox: 48, squash: 0.08 }, 120);
      for (let i = 0; i < 4; i++) { F.ox = i % 2 ? 2 : -2; await wait(110); }
      F.ox = 0;
      await shock;
      smokeUp(fc.x, foeTop() + 6, 8);
      hold(false);
      await Promise.all([back(), tween(R, { a: 0 }, 240)]);
      dome();
    },

    // Puncture Wille (awakened): the ROOM blows up over the whole battlefield, crackling at its skin, then
    // folds down into a single colossal needle that runs the foe through and bursts out of its back.
    puncturewille: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), S = { r: 0, a: 1, tint: 0, edge: 0, need: 0, d: 0.7, na: 1 };
      const ax = fc.x - 120, ay = fc.y - 92, ang = Math.atan2(fc.y - ay, fc.x - ax), L = Math.hypot(fc.x - ax, fc.y - ay) + 34;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const tipX = ax + ca * L * 0.3, tipY = ay + sa * L * 0.3;
      const needle = (c, d, a, g) => {
        const bx = ax - ca * d, by = ay - sa * d;
        c.globalAlpha = a;
        for (const [col, grow, off] of [['#e8f6ff', 1, 0], ['#5fb8f0', 0, 0], ['#bfe6ff', -0.55, -0.35]]) {
          for (let i = 0; i <= 64; i++) {
            const q = i / 64, r = 11 * g * (1 - q), px = bx + ca * L * q - sa * r * off, py = by + sa * L * q + ca * r * off;
            const rr = grow < 0 ? r * -grow : r + grow;
            if (rr >= 0.5) pxCircle(c, px, py, rr, col);
          }
        }
        c.globalAlpha = 1;
      };
      const rim = flicker(() => Array.from({ length: 6 }, () => { const t = rand(0.1, Math.PI - 0.1), x = 100 + Math.cos(t) * S.r, y = 121 - Math.sin(t) * S.r; return jag(x, y, x + rand(-14, 14), y + rand(-14, 14), 3, 3); }));
      hold(true);
      Sfx.play('charge');
      const stop = layer(c => {
        c.globalAlpha = 0.32 * S.tint;
        pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#081830');
        c.globalAlpha = 1;
        room(c, 100, S.r, S.a, S.edge);
        if (S.r > 20 && S.edge > 0.3) for (const p of rim()) bolt(c, p, 1, '#3a9ae8', '#ffffff');
        if (S.need > 0) needle(c, S.d * L, S.na, S.need);
      });
      tween(S, { tint: 1 }, 300);
      tween(hero, { oy: -2, squash: -0.12 }, 300);
      S.edge = 1;
      await tween(S, { r: 150 }, 460, easeOut);
      shake(3, 300);
      await wait(120);
      // the ROOM folds down into one needle aimed at the foe
      Sfx.play('stretch');
      tween(S, { r: 0, edge: 0 }, 320, easeIn);
      fxRun(320, (c, k) => {
        for (let i = 0; i < 9; i++) {
          const t = 0.2 + i * 0.33, r = 150 * (1 - easeIn(k)), x = 100 + Math.cos(t) * r, y = 121 - Math.sin(t) * r;
          pxLine(c, x, y, lerp(x, tipX, 0.35 + k * 0.6), lerp(y, tipY, 0.35 + k * 0.6), '#bfe6ff', 1);
        }
      });
      await tween(S, { need: 1 }, 320);
      // a glint at the point
      Sfx.play('charge');
      await fxRun(200, (c, k) => {
        const r = 3 + Math.sin(k * Math.PI) * 6;
        pxLine(c, tipX - r * 2, tipY, tipX + r * 2, tipY, '#ffffff', 1);
        pxLine(c, tipX, tipY - r * 2, tipX, tipY + r * 2, '#ffffff', 1);
        pxCircle(c, tipX, tipY, r * 0.5, '#ffffff');
      });
      // it runs the foe through
      Sfx.play('slash');
      await tween(S, { d: 0 }, 130, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 0.9);
      focusLines(fc, '#bfe6ff', 480);
      particles(fc.x, fc.y, 36, { colors: ['#bfe6ff', '#ffffff', '#5fb8f0'], speed: 140, grav: 40 });
      shake(12, 700);
      // the shock bursts out of its back
      const exit = { x: fc.x + ca * 18, y: fc.y + sa * 18 };
      for (let i = 0; i < 3; i++) particles(exit.x, exit.y, 10, { colors: ['#ffffff', '#bfe6ff', '#7cd0ff'], speed: 160, grav: 30, dir: ang, spread: 0.9, size: 2 });
      await fxRun(700, (c, k) => {
        for (let i = 0; i < 7; i++) {
          const a = ang + (i - 3) * 0.2, l = (30 + (i % 2) * 18) * easeOut(Math.min(1, k * 3)) * (1 - k01((k - 0.4) / 0.6));
          if (l >= 1) spikeLine(c, exit.x, exit.y, a, l, 3, i % 2 ? '#7cd0ff' : '#ffffff');
        }
        for (let i = 0; i < 3; i++) {
          const q = k * 1.4 - i * 0.2;
          if (q <= 0 || q >= 1) continue;
          ellipse(c, fc.x + ca * q * 52, fc.y + sa * q * 52, 3 + q * 6, 10 + q * 32, ang, i % 2 ? '#7cd0ff' : '#ffffff', 2);
        }
      });
      // the needle breaks up into light
      Sfx.play('miss');
      for (let i = 0; i < 8; i++) particles(lerp(ax, fc.x, i / 8), lerp(ay, fc.y, i / 8), 3, { colors: ['#e8f6ff', '#5fb8f0'], speed: 40, grav: 60, life: 0.5 });
      await Promise.all([tween(S, { na: 0, tint: 0 }, 260), back(260)]);
      stop();
      hold(false);
    },
  });

  // ---------- Dark-Dark Fruit (Blackbeard's darkness) ----------
  const BLACKFIRE = ['#0a0612', '#1b1424', '#3a2a4a', '#8a5ac0'];
  const dim = (c, a, col) => {
    if (a <= 0) return;
    c.globalAlpha = a;
    pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, col || '#0a0612');
    c.globalAlpha = 1;
  };
  // Motes of stolen strength drifting from `from` back into you.
  const drain = (from, n, ms) => {
    const motes = Array.from({ length: n }, (_, i) => ({ d: i * 0.03, x: from.x + rand(-12, 12), y: from.y + rand(-14, 14), arc: rand(10, 32) }));
    return fxRun(ms, (c, k) => {
      const hc = heroC();
      for (const mo of motes) {
        const q = k01((k - mo.d) * 1.5);
        if (q <= 0 || q >= 1) continue;
        const x = lerp(mo.x, hc.x, easeIn(q)), y = lerp(mo.y, hc.y, q) - Math.sin(q * Math.PI) * mo.arc;
        pxRect(c, x - 1, y - 1, 3, 3, '#1b1424');
        pxRect(c, x, y, 1, 1, mo.d * 100 % 2 < 1 ? '#c8a0ff' : '#8a5ac0');
      }
    });
  };

  Object.assign(MOVE_FX, {
    // Black Hole: palm to the ground; a stain of darkness creeps across to the foe, opens into a pool,
    // and black tendrils drag it down while its strength drifts back to you.
    blackhole: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), rx0 = foeW() / 2 + 14, x0 = hero.x + 14;
      const S = { creep: 0, pool: 0, grab: 0, fade: 1 };
      const tend = Array.from({ length: 6 }, (_, i) => ({ dx: (i - 2.5) / 2.5, h: 0.45 + (i % 3) * 0.17, ph: i * 1.7, front: i % 2 === 1 }));
      hold(true);
      Sfx.play('haki');
      await tween(hero, { squash: 0.2, oy: 2, ox: 4 }, 150);
      dust(x0, 5);
      const fh = 121 - foeTop();
      const vine = (c, t, rx) => tendril(c, F.x + t.dx * rx * 0.85, 121, F.x + F.ox + t.dx * 6, 121 + F.oy - fh * t.h * S.grab, 3, t.ph);
      const stop = layer(c => {
        const front = lerp(x0, F.x, S.creep);
        if (S.fade > 0 && front > x0 + 1) {
          c.globalAlpha = S.fade;
          for (let x = x0; x < front; x += 2) {
            const q = (x - x0) / (F.x - x0), w = 1.5 + Math.sin(x * 0.4 + G.t * 9) + q * 1.5;
            pxRect(c, x, 121 - w * 0.5, 2, w + 1, '#0a0612');
            if (((x + Math.floor(G.t * 30)) % 10) < 2) pxRect(c, x, 120 - w * 0.5, 2, 1, '#8a5ac0');
          }
          c.globalAlpha = 1;
        }
        const rx = rx0 * S.pool, ry = Math.min(8, rx * 0.3);
        if (rx < 1) return;
        darkPool(c, F.x, rx, ry);
        if (S.grab > 0.05) for (const t of tend) if (!t.front) vine(c, t, rx);
        foeOver(c);
        darkPool(c, F.x, rx, ry, true);
        if (S.grab > 0.05) for (const t of tend) if (t.front) vine(c, t, rx);
      });
      await tween(S, { creep: 1 }, 200, easeIn);
      Sfx.play('hurt');
      tween(S, { pool: 1 }, 180, easeOut);
      await tween(S, { grab: 1 }, 180);
      await tween(F, { oy: foeLift() + 12, squash: 0.12 }, 220, easeIn);
      m.hit(0);
      impact({ x: fc.x, y: 112 }, ['#ffffff', '#8a5ac0'], 10);
      particles(F.x, 118, 12, { colors: DARK, speed: 50, grav: -30, dir: -Math.PI / 2, spread: 1.6, life: 0.5 });
      shake(4, 220);
      drain(fc, 14, 620);
      await wait(160);
      tween(S, { grab: 0 }, 200);
      await tween(F, { oy: 0, squash: 0 }, 220);
      F.oy = 0; F.squash = 0;
      tween(S, { fade: 0 }, 200);
      await Promise.all([tween(S, { pool: 0 }, 220), back(220)]);
      stop();
      hold(false);
    },

    // Black Vortex: a whirlpool of darkness opens on your palm and everything is pulled toward it; the foe
    // is dragged across the field into a point-blank blow and knocked back out.
    kurouzu: async m => {
      const hero = G.hero, F = G.battle.F, fc0_ = fc0(), S = { r: 0, pull: 0 };
      const palmAt = () => ({ x: hero.x + hero.ox + 16, y: 100 + hero.oy });
      hold(true);
      Sfx.play('haki');
      const stop = layer(c => {
        const p = palmAt();
        if (S.r > 1) {
          for (let i = 0; i < 14; i++) {
            const a = i * 0.449 + 0.2, ph = (G.t * 2.6 + i * 0.37) % 1, r0 = 7 + (1 - ph) * 46 * S.r / 13;
            pxLine(c, p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0 * 0.8, p.x + Math.cos(a + 0.15) * (r0 + 9), p.y + Math.sin(a + 0.15) * (r0 + 9) * 0.8, i % 2 ? '#3a2a4a' : '#8a5ac0', 1);
          }
        }
        vortex(c, p.x, p.y, S.r, -G.t * 10);
        if (S.pull > 0) {
          const fc = fc0();
          for (let i = 0; i < 3; i++) tendril(c, p.x, p.y, fc.x - 4, fc.y - 6 + i * 6, 3, i * 2);
          speedLines(c, fc.x + 12, fc.y, Math.PI, 5, 24, '#3a2a4a', 7);
        }
      });
      tween(hero, { squash: -0.06 }, 200);
      await tween(S, { r: 13 }, 300, easeOut);
      for (let i = 0; i < 4; i++) particles(palmAt().x + 24 + i * 14, 118, 2, { colors: ['#c9b88a', '#9a8a6a'], speed: 60, grav: -50, dir: Math.PI + 0.6, spread: 0.5, life: 0.5 });
      Sfx.play('stretch');
      const pull = hero.x + 30 - F.x;
      S.pull = 1;
      await tween(F, { ox: pull, squash: -0.1 }, 260, easeIn);
      S.pull = 0;
      await tween(hero, { ox: 8, squash: -0.12 }, 60, easeIn);
      const fc = fc0();
      m.hit(0);
      Sfx.play('boom');
      impact(fc, ['#ffffff', '#8a5ac0', '#3a2a4a'], 14);
      flare(fc, 8, 22, 300, ['#1b1424', '#8a5ac0', '#e8d8ff']);
      ringOut(fc, '#3a2a4a', 2, 22, 300, 3);
      particles(fc.x, fc.y, 20, { colors: DARK, speed: 90 });
      shake(7, 300);
      await tween(F, { ox: pull + 18, squash: 0.15 }, 90);
      tween(S, { r: 0 }, 260);
      dust(fc0_.x, 8);
      await Promise.all([tween(F, { ox: 0, squash: 0 }, 260), back()]);
      F.ox = 0; F.squash = 0;
      stop();
      hold(false);
    },

    // Liberation: a rift of darkness tears open in front of you, crackling, and everything it ever
    // swallowed comes roaring out in a torrent of rock, timber, brick, cannonballs and blades.
    liberation: async m => {
      const hero = G.hero, hc = heroC(), fc = fc0(), ox = hc.x + 26, oy = 96, P = { s: 0 };
      const rim = flicker(() => Array.from({ length: 5 }, () => { const a = rand(0, 6.28), x = ox + Math.cos(a) * 9 * P.s, y = oy + Math.sin(a) * 21 * P.s; return jag(x, y, x + Math.cos(a) * rand(4, 9), y + Math.sin(a) * rand(4, 9), 2, 2); }));
      hold(true);
      Sfx.play('haki');
      tween(hero, { ox: -4, squash: -0.1 }, 220);
      shake(2, 420);
      const portal = layer(c => {
        const s = P.s;
        if (s < 0.02) return;
        oval(c, ox, oy, 9 * s + 2, 21 * s + 2, '#3a2a4a');
        oval(c, ox, oy, 8 * s + 1, 20 * s + 1, '#8a5ac0');
        oval(c, ox, oy, 7 * s, 19 * s, '#1b1424');
        oval(c, ox, oy, 4 * s, 13 * s, '#0a0612');
        for (let i = 0; i < 8; i++) { const a = G.t * 6 + i * 0.785; pxRect(c, ox + Math.cos(a) * 9 * s, oy + Math.sin(a) * 21 * s, 2, 2, i % 2 ? '#c8a0ff' : '#3a2a4a'); }
        for (const p of rim()) bolt(c, p, 1, '#3a2a4a', '#c8a0ff');
      });
      await tween(P, { s: 1 }, 340, easeOut);
      await wait(80);
      Sfx.play('boom');
      tween(hero, { ox: -10, squash: 0.12 }, 100);
      const junk = Array.from({ length: 24 }, (_, i) => ({ d: i * 0.022, kind: i % 5, tx: fc.x + rand(-14, 14), ty: fc.y + rand(-22, 18), arc: rand(-24, 24), vx: rand(-30, 70) }));
      let hit = false;
      await fxRun(760, (c, k) => {
        const reach = lerp(ox, fc.x + 30, Math.min(1, k * 2.2)), fade = k > 0.6 ? (1 - k) / 0.4 : 1;
        for (let x = ox; x < reach; x += 3) {
          const w = (6 + (x - ox) * 0.14) * fade, wob = Math.sin(x * 0.3 + G.t * 20) * 2;
          if (w < 0.5) continue;
          pxRect(c, x, oy - w - 1 + wob, 3, w * 2 + 2, '#8a5ac0');
          pxRect(c, x, oy - w + wob, 3, w * 2, '#1b1424');
          pxRect(c, x, oy - w * 0.4 + wob, 3, w * 0.8, '#3a2a4a');
          if (((x - Math.floor(G.t * 120)) % 12 + 12) % 12 < 3) pxRect(c, x, oy - w * 0.7 + wob, 3, 1, '#c8a0ff');
        }
        if (fade > 0.3) speedLines(c, reach, oy, 0, 5, 30, '#c8a0ff', 6);
        for (const j of junk) {
          const q = (k - j.d) * 2.2;
          if (q <= 0) continue;
          if (q < 1) { debris(c, j.kind, lerp(ox, j.tx, q), lerp(oy, j.ty, q) + Math.sin(q * Math.PI) * j.arc, k); continue; }
          // after it lands it tumbles to the ground and lies there
          const t = (q - 1) / 2.2 * 0.76;
          if (k > 0.85 && Math.floor(k * 30) % 2) continue;
          debris(c, j.kind, j.tx + j.vx * Math.min(t, 0.25), Math.min(117, j.ty + 160 * t * t), Math.min(k, 0.5 + t));
        }
        if (!hit && k > 0.45) {
          hit = true;
          m.hit(0);
          shake(9, 600);
          screenFlash('#3a2a4a', 0.5);
          focusLines(fc, '#c8a0ff', 380);
          particles(fc.x, fc.y, 36, { colors: ['#6a5a4a', '#9aa4b1', '#7a4a24', '#3a2a4a', '#1b1424'], speed: 130, grav: 160, size: 3 });
        }
      });
      if (!hit) m.hit(0);
      dust(fc.x, 12);
      // the rift snaps shut
      Sfx.play('miss');
      await tween(P, { s: 0 }, 160, easeIn);
      ringOut({ x: ox, y: oy }, '#8a5ac0', 2, 14, 200, 1);
      portal();
      hold(false);
      await back();
    },

    // Black World (awakened): black flames boil up around you, then darkness floods the whole field with
    // purple lightning crawling through it; the foe crumbles to pieces that are sucked into you, and
    // re-forms only when the darkness drains back.
    blackworld: async m => {
      const hero = G.hero, F = G.battle.F, hc = heroC(), fc = fc0(), spr = getSprite(F.spr), sc = F.scale;
      const fx0 = Math.round(F.x - spr.width * sc / 2), fy0 = Math.round(F.y - foeLift() - spr.height * sc);
      const S = { r: 0, a: 1, pill: 0, dim: 0 };
      const cracks = flicker(() => Array.from({ length: 4 }, () => { const a = Math.PI + rand(0.2, 2.9), r0 = rand(10, Math.max(12, S.r * 0.8)), x = hc.x + Math.cos(a) * r0, y = 121 + Math.sin(a) * r0; return jag(x, y, x + rand(-24, 24), y + rand(-24, 24), 4, 4); }));
      hold(true);
      Sfx.play('haki');
      tween(hero, { oy: -3, squash: -0.12 }, 300);
      tween(S, { dim: 1 }, 300);
      const stop = layer(c => {
        dim(c, 0.3 * S.dim * S.a);
        if (S.pill > 0.02) for (let i = 0; i < 6; i++) flame(c, hc.x - 25 + i * 10, 122, Math.round(S.pill * (22 + ((i * 13) % 7) * 5)), 10, i * 1.4, BLACKFIRE);
        const r = S.r;
        if (r > 1) {
          c.globalAlpha = 0.9 * S.a;
          pxCircle(c, hc.x, 121, r, '#0a0612');
          c.globalAlpha = S.a;
          pxRing(c, hc.x, 121, r, '#8a5ac0', 2);
          for (let i = 0; i < 10; i++) {
            const a = Math.PI + 0.15 + i * 0.31 + Math.sin(G.t * 3 + i) * 0.08;
            flame(c, hc.x + Math.cos(a) * r, 121 + Math.sin(a) * r + 2, 10 + (i % 3) * 4, 8, i * 2, BLACKFIRE);
          }
          for (const p of cracks()) bolt(c, p, 1, '#3a2a4a', '#c8a0ff');
          c.globalAlpha = 1;
        }
        if (r > 1) foeOver(c);
        if (S.pill > 0.02 || r > 1) heroOver(c);
      });
      await tween(S, { pill: 1 }, 320);
      Sfx.play('boom');
      shake(4, 700);
      tween(S, { pill: 0 }, 400);
      await tween(S, { r: 250 }, 520, easeIn);
      // the foe crumbles and is swallowed
      m.hit(0);
      const crumble = plainFoe();
      if (crumble) F.alpha = 0;
      screenFlash('#3a2a4a', 0.5);
      shake(8, 700);
      const tint = getSprite(F.spr, 'tint', '#e0c8ff'), Bk = 3, chunks = [];
      for (let y = 0; y < spr.height; y += Bk) for (let x = 0; x < spr.width; x += Bk) chunks.push({ x, y, w: Math.min(Bk, spr.width - x), h: Math.min(Bk, spr.height - y), d: y / spr.height * 0.35 + Math.random() * 0.15, arc: rand(10, 40), drift: rand(-8, 8) });
      Sfx.play('hurt');
      drain(fc, 16, 800);
      await fxRun(800, (c, k) => {
        if (!crumble) return;
        const h = heroC();
        for (const ch of chunks) {
          const q = k01((k - ch.d) * 1.8);
          const sx = fx0 + ch.x * sc, sy = fy0 + ch.y * sc;
          let x = sx, y = sy, s = sc;
          if (q > 0) {
            const lift = k01(q / 0.25), pull = easeIn(k01((q - 0.2) / 0.8));
            x = sx + ch.drift * lift; y = sy - 6 * lift;
            x = lerp(x, h.x, pull); y = lerp(y, h.y, pull) - Math.sin(pull * Math.PI) * ch.arc;
            s = sc * (1 - pull * 0.7);
          }
          if (q >= 1) continue;
          c.globalAlpha = q > 0.85 ? (1 - q) / 0.15 : 1;
          c.drawImage(q > 0 && Math.floor(G.t * 20 + ch.x) % 2 ? tint : spr, ch.x, ch.y, ch.w, ch.h, Math.round(x), Math.round(y), Math.max(1, Math.round(ch.w * s)), Math.max(1, Math.round(ch.h * s)));
        }
        c.globalAlpha = 1;
      });
      // the darkness drains back into you and the foe re-forms
      Sfx.play('haki');
      await tween(S, { r: 0 }, 380, easeOut);
      ringOut(fc, '#8a5ac0', 4, 26, 300, 2);
      tween(S, { dim: 0 }, 260);
      await Promise.all([tween(F, { alpha: 1 }, 240), back(240)]);
      F.alpha = 1;
      stop();
      hold(false);
    },

    // Dark Quake (awakened): darkness coils round one fist while the air shivers around it; you punch
    // the sky itself and it cracks like glass, black and white, and a shockwave tears along the ground
    // into the foe before the cracks shatter and fall.
    darkquake: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), S = { dim: 0, aura: 1 };
      const fist = () => ({ x: hero.x + hero.ox + 16, y: 100 + hero.oy });
      hold(true);
      Sfx.play('haki');
      const aura = layer(c => {
        dim(c, 0.3 * S.dim);
        const f = fist(), s = S.aura;
        if (s <= 0.02) return;
        for (let i = 0; i < 8; i++) { const a = G.t * 9 + i * 0.785, r = (6 + Math.sin(G.t * 20 + i) * 2) * s; pxCircle(c, f.x + Math.cos(a) * r * 0.7, f.y + Math.sin(a) * r, 3 * s, i % 2 ? '#3a2a4a' : '#1b1424'); }
        pxCircle(c, f.x, f.y, 3 * s, '#8a5ac0');
        for (let i = 0; i < 2; i++) {
          const q = (G.t * 3 + i / 2) % 1, r = (10 + q * 14) * s;
          c.globalAlpha = 1 - q;
          for (const a0 of [-0.6, Math.PI - 0.6]) for (let t = 0; t <= 1.2; t += 0.1) pxRect(c, f.x + Math.cos(a0 + t) * r, f.y + Math.sin(a0 + t) * r, 1, 1, '#ffffff');
        }
        c.globalAlpha = 1;
      });
      tween(S, { dim: 1 }, 400);
      shake(2, 500);
      await tween(hero, { ox: -10, squash: 0.2 }, 380);
      await tween(hero, { ox: 22, squash: -0.12 }, 80, easeIn);
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
      // the air cracks like glass
      Sfx.play('boom');
      screenFlash('#ffffff', 0.8);
      shake(14, 1000);
      const cracks = fxRun(1100, (c, k) => {
        if (k > 0.72 && Math.floor(k * 24) % 2) return;
        for (const [col, w] of [['#1b1424', 4], ['#8a5ac0', 2], ['#ffffff', 1]]) {
          for (const [x0, y0, x1, y1, d] of segs) {
            const e = k01((k * 2.5 - d) * 4);
            if (e) pxLine(c, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), col, w);
          }
        }
        pxCircle(c, p.x, p.y, 7 + Math.sin(k * 30) * 2, '#1b1424');
        pxRing(c, p.x, p.y, 8 + Math.sin(k * 30) * 2, '#ffffff', 1);
      });
      // the shockwave rolls along the ground into the foe
      groundCrack(p.x, fc.x + 40, '#1b1424', 320);
      await fxRun(260, (c, k) => {
        const x = lerp(p.x, fc.x, easeIn(k)), y = lerp(p.y, fc.y, k);
        speedLines(c, x, y, 0, 6, 26, '#3a2a4a', 7);
        for (let i = 0; i < 3; i++) ellipse(c, x - i * 9, y, 4 + i * 2, 14 + i * 5, 0, i % 2 ? '#8a5ac0' : '#ffffff', i > 1 ? 1 : 2);
        if (Math.random() < 0.7) particles(x, 118, 2, { colors: ['#6a5a4a', '#9a8a6a'], speed: 70, grav: 200, dir: -Math.PI / 2, spread: 0.8, size: 2 });
      });
      m.hit(0);
      focusLines(fc, '#c8a0ff', 450);
      for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#8a5ac0' : '#1b1424', 4, 30 + i * 16, 500, 3);
      flare(fc, 12, 34, 380, ['#1b1424', '#8a5ac0', '#ffffff']);
      groundWave(fc.x, ['#ffffff', '#8a5ac0'], 70, 500);
      particles(fc.x, fc.y, 40, { colors: DARK.concat(['#ffffff']), speed: 140 });
      particles(fc.x, 118, 16, { colors: ['#6a5a4a', '#9a8a6a', '#3a2a4a'], speed: 110, grav: 220, dir: -Math.PI / 2, spread: 1.4, size: 3 });
      F.squash = 0.25;
      tween(F, { squash: 0 }, 300);
      await wait(320);
      // the cracks shatter and rain down
      Sfx.play('miss');
      for (let i = 0; i < segs.length; i += 4) particles(segs[i][2], segs[i][3], 2, { colors: ['#ffffff', '#8a5ac0', '#e8d8ff'], speed: 30, grav: 200, life: 0.6 });
      tween(S, { aura: 0, dim: 0 }, 300);
      hold(false);
      await back();
      await cracks;
      aura();
    },
  });

  // ---------- Rumble-Rumble Fruit (Enel's lightning) ----------
  // The foe jolting between a white flash and a dark x-ray silhouette, as if electrocuted.
  const jolt = (c, k, rate) => { if (Math.floor(k * (rate || 14)) % 2) foeTint(c, 'tint', '#1b1424', 0.85); };
  // Static running up your raised arm.
  const armStatic = () => static_(() => { const h = heroHand(); return { x: h.x, y: h.y - 14 }; }, 4, 10);

  Object.assign(MOVE_FX, {
    // Vari: static gathers on your raised finger, then a forked bolt cracks across to the foe and jolts it.
    vari: async m => {
      const hero = G.hero, fc = fc0();
      const tip = () => { const h = heroHand(); return { x: h.x + 4, y: h.y - 6 }; };
      const sparks = static_(tip, 4, 9);
      hold(true);
      Sfx.play('charge');
      tween(hero, { squash: -0.08 }, 200);
      await fxRun(300, (c, k) => {
        const t = tip();
        for (const p of sparks()) bolt(c, p, 1, '#3a7ad8', '#ffffff');
        pxCircle(c, t.x, t.y, 1 + k * 3, '#bfe6ff');
        pxCircle(c, t.x, t.y, k * 1.5, '#ffffff');
      });
      Sfx.play('zap');
      screenFlash('#bfe6ff', 0.3);
      tween(hero, { squash: 0.06, ox: -3 }, 80);
      const t = tip(), main = flicker(() => jag(t.x, t.y, fc.x, fc.y, 9, 6));
      const forks = flicker(() => [0, 1, 2, 3].map(() => { const q = rand(0.25, 0.85), x = lerp(t.x, fc.x, q), y = lerp(t.y, fc.y, q); return jag(x, y, x + rand(6, 18), y + rand(-16, 16), 3, 3); }));
      let hit = false;
      await fxRun(440, (c, k) => {
        if (k > 0.7 && Math.floor(k * 24) % 2) return;
        const pts = main(), head = Math.min(1, k * 5);
        bolt3(c, pts.slice(0, Math.max(2, Math.ceil(pts.length * head))), 1);
        if (head >= 1) {
          for (const f of forks()) bolt(c, f, 1, '#3a7ad8', '#ffe14a');
          pxCircle(c, fc.x, fc.y, 5 + Math.sin(G.t * 50) * 2, '#bfe6ff');
          pxCircle(c, fc.x, fc.y, 3, '#ffffff');
        }
        pxCircle(c, t.x, t.y, 3, '#ffffff');
        if (!hit && head >= 1) {
          hit = true;
          m.hit(0);
          impact(fc, VOLT, 14);
          ringOut(fc, '#bfe6ff', 3, 20, 240, 1);
          shake(3, 200);
        }
        if (hit) jolt(c, k, 16);
      });
      if (!hit) m.hit(0);
      smokeUp(fc.x, foeTop() + 4, 6);
      await back(140);
      hold(false);
    },

    // El Thor: you point to the sky, storm clouds roll in over the foe, a target glows on the ground and
    // thin leaders feel their way down; then a pillar of lightning slams into it, and the ground smokes.
    elthor: async m => {
      const hero = G.hero, fc = fc0(), x = fc.x, S = { sky: 0 };
      const arm = armStatic();
      hold(true);
      Sfx.play('charge');
      tween(hero, { squash: -0.12, oy: -2 }, 220);
      const sky = layer(c => {
        stormSky(c, x, S.sky, 0.4);
        if (S.sky > 0.5 && Math.random() < 0.15) { c.globalAlpha = 0.6; pxCircle(c, x + rand(-60, 60), VIEW.y + 16, 7, '#7a8ac0'); c.globalAlpha = 1; }
      });
      await Promise.all([tween(S, { sky: 1 }, 420), fxRun(420, c => { for (const p of arm()) bolt(c, p, 1, '#3a7ad8', '#ffffff'); })]);
      Sfx.play('zap');
      await fxRun(300, (c, k) => {
        c.globalAlpha = 0.5 + 0.5 * Math.sin(k * 30);
        ellipse(c, x, 121, 14 - k * 4, 3, 0, '#bfe6ff', 1);
        oval(c, x, 121, 6, 1.5, '#ffffff');
        c.globalAlpha = 1;
        if (Math.random() < 0.5) bolt(c, jag(x + rand(-10, 10), VIEW.y + 22, x + rand(-14, 14), lerp(VIEW.y + 22, 110, k * 0.8), 5, 4), 1, '#3a7ad8', '#bfe6ff');
      });
      Sfx.play('boom');
      screenFlash('#ffffff', 0.9);
      const edge = flicker(() => Array.from({ length: 30 }, () => rand(-3, 3)));
      const sides = flicker(() => [-1, 1, -1, 1, -1].map((s, i) => { const y = VIEW.y + 30 + i * 30; return jag(x + s * 12, y, x + s * rand(28, 44), y + rand(-12, 12), 3, 3); }));
      let hit = false;
      await fxRun(600, (c, k) => {
        const wd = (k < 0.12 ? k / 0.12 : k > 0.55 ? Math.max(0, 1 - (k - 0.55) / 0.45) : 1) * 15, e = edge();
        if (wd >= 0.5) {
          for (let j = 0; j < 30; j++) {
            const y = VIEW.y + j * 6, w2 = Math.max(1, wd + e[j]);
            if (y > 121) break;
            pxRect(c, x - w2 - 3, y, (w2 + 3) * 2, 6, '#1f4a98');
            pxRect(c, x - w2 - 1, y, (w2 + 1) * 2, 6, '#7cb8ff');
            pxRect(c, x - w2 * 0.55, y, w2 * 1.1, 6, '#ffffff');
          }
          oval(c, x, 121, wd * 3.2, 4, '#7cb8ff');
          oval(c, x, 121, wd * 1.8, 2, '#ffffff');
          if (k < 0.55) for (const s of sides()) bolt(c, s, 1, '#3a7ad8', '#ffe14a');
        }
        if (hit) jolt(c, k, 18);
        if (!hit && k > 0.1) {
          hit = true;
          m.hit(0);
          shake(9, 520);
          focusLines(fc, '#bfe6ff', 320);
          groundWave(x, ['#ffffff', '#7cb8ff', '#3a7ad8'], 56, 460);
          particles(x, 118, 30, { colors: VOLT, speed: 130, grav: 140, dir: -Math.PI / 2, spread: 2.4 });
          particles(x, 118, 12, { colors: ['#6a5a4a', '#9a8a6a'], speed: 90, grav: 220, dir: -Math.PI / 2, spread: 1.2, size: 3 });
        }
      });
      if (!hit) m.hit(0);
      // a scorch mark smokes where it struck
      smokeUp(x, 116, 10);
      fxRun(600, (c, k) => { c.globalAlpha = 1 - k; oval(c, x, 121, 20, 3, '#2a2a33', true); if (k < 0.5) oval(c, x, 121, 10, 1.5, '#ffb03a', true); c.globalAlpha = 1; });
      tween(hero, { squash: 0, oy: 0 }, 200);
      await tween(S, { sky: 0 }, 320);
      sky();
      hold(false);
    },

    // Raigo: the sky goes dark as a vast thundercloud ball swells over the foe, crackling inside; it sinks
    // slowly, its shadow spreading on the ground, then detonates in a white-hot burst of lightning.
    raigo: async m => {
      const hero = G.hero, fc = fc0(), S = { r: 6, x: fc.x - 10, y: VIEW.y + 46, dim: 0, on: true };
      const inner = flicker(() => [0, 1, 2].map(() => { const a = rand(0, 6.28), b = a + rand(1.5, 3); return [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)]; }));
      const rimArcs = flicker(() => Array.from({ length: 3 }, () => [rand(0, 6.28), rand(8, 16)]));
      hold(true);
      Sfx.play('charge');
      tween(hero, { squash: -0.12, oy: -2 }, 220);
      const stop = layer(c => {
        dim(c, 0.45 * S.dim, '#0a0a1e');
        if (!S.on) return;
        const sh = k01(1 - (121 - S.y - S.r) / 140);
        if (sh > 0) { c.globalAlpha = 0.5 * sh; oval(c, S.x, 121, S.r * 1.2 * sh + 4, 3 + 3 * sh, '#0a0a1e'); c.globalAlpha = 1; }
        cloudBall(c, S.x, S.y, S.r);
        for (const [a, b, d, e] of inner()) bolt(c, jag(S.x + a * S.r * 0.6, S.y + b * S.r * 0.6, S.x + d * S.r * 0.6, S.y + e * S.r * 0.6, 4, 3), 1, '#ffe14a', '#ffffff');
        if (S.r > 12) for (const [a, l] of rimArcs()) { const x0 = S.x + Math.cos(a) * S.r, y0 = S.y + Math.sin(a) * S.r; bolt(c, jag(x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, 3, 2), 1, '#3a7ad8', '#bfe6ff'); }
      });
      tween(S, { dim: 1 }, 300);
      await tween(S, { r: 34 }, 640, easeOut);
      Sfx.play('boom');
      shake(3, 500);
      await tween(S, { x: fc.x, y: fc.y - 12 }, 440, easeIn);
      S.on = false;
      m.hit(0);
      Sfx.play('zap');
      screenFlash('#ffffff', 1);
      focusLines(fc, '#ffe14a', 420);
      for (let i = 0; i < 4; i++) ringOut(fc, ['#ffffff', '#bfe6ff', '#3a7ad8', '#ffe14a'][i], 6, 60 + i * 20, 600, 3);
      rays(fc, '#ffe14a', 14, 80, 450);
      groundWave(fc.x, ['#ffffff', '#bfe6ff'], 80, 520);
      particles(fc.x, fc.y, 50, { colors: VOLT.concat(['#4a5070']), speed: 160, size: 3 });
      particles(fc.x, fc.y - 10, 16, { colors: ['#2a3048', '#4a5070'], speed: 70, grav: -10, size: 4, life: 0.8 });
      shake(12, 800);
      fxRun(360, (c, k) => { const r = easeOut(k) * 54; c.globalAlpha = 1 - k; pxCircle(c, fc.x, fc.y, r, '#bfe6ff'); pxCircle(c, fc.x, fc.y, r * 0.7, '#ffffff'); c.globalAlpha = 1; });
      const arcs = flicker(() => Array.from({ length: 5 }, () => { const a = rand(0, 6.28), l = rand(30, 60); return jag(fc.x, fc.y, fc.x + Math.cos(a) * l, fc.y + Math.sin(a) * l, 4, 4); }));
      await fxRun(480, (c, k) => {
        jolt(c, k, 12);
        if (Math.floor(k * 16) % 2) for (const p of arcs()) bolt(c, p, 1, '#3a7ad8', '#ffffff');
      });
      smokeUp(fc.x, foeTop() + 6, 8);
      tween(hero, { squash: 0, oy: 0 }, 200);
      await tween(S, { dim: 0 }, 260);
      stop();
      hold(false);
    },

    // Thunder Dragon (awakened): storm clouds gather, you call a bolt up into them, and a dragon of
    // lightning pours out of the sky, snakes down and crashes into the foe.
    thunderdragon: async m => {
      const hero = G.hero, fc = fc0(), S = { sky: 0 };
      const path = t => ({ x: lerp(VIEW.x - 30, fc.x, t) + Math.sin(t * Math.PI) * 34, y: lerp(VIEW.y + 26, fc.y, easeIn(t)) + Math.sin(t * Math.PI * 4) * 16 * (1 - t) });
      const arm = armStatic();
      hold(true);
      Sfx.play('charge');
      const sky = layer(c => stormSky(c, 40, S.sky, 0.45));
      tween(hero, { squash: -0.12, oy: -2 }, 220);
      await Promise.all([tween(S, { sky: 1 }, 380), fxRun(380, c => { for (const p of arm()) bolt(c, p, 1, '#3a7ad8', '#ffffff'); })]);
      // a bolt from your hand up into the clouds calls it down
      Sfx.play('zap');
      screenFlash('#bfe6ff', 0.4);
      const h0 = heroHand(), call = jag(h0.x, h0.y - 14, h0.x - 34, VIEW.y + 20, 8, 6);
      fxRun(220, (c, k) => { if (k < 0.75) bolt3(c, call, 1); });
      await wait(140);
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
          if (i % 5 === 2 && Math.random() < 0.4) bolt(c, jag(p.x, p.y, p.x + rand(-14, 14), p.y + rand(6, 16), 3, 2), 1, '#3a7ad8', '#ffffff');
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
        if (hit) jolt(c, k, 18);
        if (!hit && k >= 0.87) {
          hit = true;
          m.hit(0);
          Sfx.play('boom');
          screenFlash('#bfe6ff', 0.9);
          focusLines(fc, '#bfe6ff', 420);
          for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#ffe14a' : '#bfe6ff', 6, 40 + i * 16, 500, 2);
          groundWave(fc.x, ['#ffffff', '#7cb8ff'], 60, 480);
          particles(fc.x, fc.y, 40, { colors: VOLT, speed: 140, grav: 0, life: 0.5 });
          shake(10, 600);
        }
      });
      if (!hit) m.hit(0);
      // the dragon breaks up into crackling sparks
      const arcs = flicker(() => Array.from({ length: 4 }, () => { const a = rand(0, 6.28), l = rand(20, 40); return jag(fc.x, fc.y, fc.x + Math.cos(a) * l, fc.y + Math.sin(a) * l, 4, 4); }));
      await fxRun(320, (c, k) => { jolt(c, k, 12); if (Math.floor(k * 14) % 2) for (const p of arcs()) bolt(c, p, 1, '#3a7ad8', '#ffffff'); });
      smokeUp(fc.x, foeTop() + 6, 6);
      tween(hero, { squash: 0, oy: 0 }, 200);
      await tween(S, { sky: 0 }, 300);
      sky();
      hold(false);
    },

    // 200 Million Volt Amaru (awakened): the sky blackens and the six thunder drums ring out behind you;
    // a bolt strikes you and you swell into a giant of lightning that leaps and smashes down on the foe.
    amaru: async m => {
      const hero = G.hero, fc = fc0(), hc = heroC(), S = { sky: 0, drums: 0 };
      const base = heroSprite(), glow = variantOf(base, 'tint', '#9ad8ff'), halo = variantOf(base, 'flash');
      const g = { x: hero.x, y: 121, s: 2, a: 1, on: false };
      const drumAt = i => { const a = Math.PI + 0.25 + i * 0.53; return { x: hc.x + Math.cos(a) * 26, y: hc.y - 4 + Math.sin(a) * 24 }; };
      const links = flicker(() => [0, 1, 2, 3, 4].map(i => { const a = drumAt(i), b = drumAt(i + 1); return jag(a.x, a.y, b.x, b.y, 4, 3); }));
      hold(true);
      Sfx.play('charge');
      const sky = layer(c => {
        stormSky(c, 100, S.sky, 0.5);
        if (S.drums <= 0.02) return;
        c.globalAlpha = S.drums;
        for (const p of links()) bolt(c, p, 1, '#3a7ad8', '#ffffff');
        for (let i = 0; i < 6; i++) {
          const d = drumAt(i), r = Math.max(1, 5 * S.drums);
          pxCircle(c, d.x, d.y, r + 1, PAL.k); pxCircle(c, d.x, d.y, r, '#e6b422'); pxCircle(c, d.x, d.y, Math.max(1, r - 2), '#ffd04a');
          pxRect(c, d.x - 1, d.y - 1, 2, 2, '#a8641a');
        }
        c.globalAlpha = 1;
      });
      tween(S, { sky: 1 }, 400);
      tween(hero, { squash: -0.1 }, 300);
      await tween(S, { drums: 1 }, 300);
      for (let i = 0; i < 3; i++) {
        Sfx.play('boom');
        ringOut(drumAt(i * 2 + 1), '#ffe14a', 3, 16, 240, 1);
        shake(2, 120);
        await wait(110);
      }
      // a bolt from the sky strikes you
      fxBolt(hc.x, hc.y + 12, 1.6);
      screenFlash('#ffffff', 0.8);
      ringOut(hc, '#bfe6ff', 4, 34, 300, 2);
      tween(S, { drums: 0 }, 160);
      hero.alpha = 0;
      hero.squash = 0;
      g.on = true;
      const ghosts = [];
      const body = flicker(() => Array.from({ length: 3 }, (_, i) => { const s = Math.round(g.s), w = base.width * s, h = base.height * s, x = g.x - w / 2 + (i + 1) * w / 4; return jag(x, g.y - h + 4, x + rand(-6, 6), g.y - 6, 4, 3); }));
      const stopG = layer(c => {
        if (!g.on) return;
        const s = Math.max(2, Math.round(g.s)), h = base.height * s;
        ghosts.unshift({ x: g.x, y: g.y, s });
        if (ghosts.length > 5) ghosts.length = 5;
        for (let i = 2; i < ghosts.length; i += 2) drawSpriteAt(c, glow, ghosts[i].x, ghosts[i].y, ghosts[i].s, { shadow: false, alpha: 0.25 * g.a });
        c.globalAlpha = g.a;
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + 0.3 + i * 0.51, dx = g.x + Math.cos(a) * h * 0.5, dy = g.y - h * 0.6 + Math.sin(a) * h * 0.34, r = s + 2;
          pxCircle(c, dx, dy, r + 1, PAL.k); pxCircle(c, dx, dy, r, '#e6b422'); pxCircle(c, dx, dy, Math.max(1, r - 2), '#ffd04a');
          pxRect(c, dx - 1, dy - 1, 2, 2, '#a8641a');
        }
        c.globalAlpha = 1;
        for (const [ox, oy] of [[-s, 0], [s, 0], [0, -s], [0, s]]) drawSpriteAt(c, halo, g.x + ox, g.y + oy, s, { shadow: false, alpha: g.a });
        drawSpriteAt(c, glow, g.x, g.y, s, { shadow: false, alpha: g.a });
        c.globalAlpha = g.a;
        if (s > 2) for (const p of body()) bolt(c, p, 1, '#7cd0ff', '#ffffff');
        c.globalAlpha = 1;
      });
      await tween(g, { s: 5, x: hero.x + 10 }, 340);
      Sfx.play('zap');
      fxRun(300, (c, k) => { for (let i = 0; i < 2; i++) { const q = (k * 2 + i / 2) % 1; c.globalAlpha = 1 - q; pxRing(c, g.x, g.y - 40, 16 + q * 40, '#bfe6ff', 1); } c.globalAlpha = 1; });
      await wait(140);
      Sfx.play('stretch');
      await tween(g, { y: 64, x: fc.x - 24 }, 190);
      await tween(g, { y: 121, x: fc.x - 8 }, 130, easeIn);
      m.hit(0);
      Sfx.play('boom'); Sfx.play('zap');
      screenFlash('#ffffff', 1);
      fxBolt(fc.x, 121, 2.4);
      focusLines(fc, '#ffe14a', 480);
      for (let i = 0; i < 3; i++) ringOut({ x: fc.x, y: 120 }, i % 2 ? '#ffe14a' : '#bfe6ff', 6, 60 + i * 24, 600, 3);
      groundWave(fc.x, ['#ffffff', '#bfe6ff', '#3a7ad8'], 96, 600);
      groundCrack(fc.x - 60, fc.x + 60, '#1b1424', 300);
      rays(fc, '#ffffff', 16, 80, 500);
      particles(fc.x, fc.y, 50, { colors: VOLT, speed: 170, size: 3 });
      particles(fc.x, 118, 16, { colors: ['#6a5a4a', '#9a8a6a'], speed: 110, grav: 220, dir: -Math.PI / 2, spread: 1.4, size: 3 });
      shake(14, 900);
      const arcs = flicker(() => Array.from({ length: 6 }, () => { const a = rand(0, 6.28), l = rand(30, 60); return jag(fc.x, fc.y, fc.x + Math.cos(a) * l, fc.y + Math.sin(a) * l, 4, 4); }));
      fxRun(500, (c, k) => { if (Math.floor(k * 16) % 2) for (const p of arcs()) bolt(c, p, 1, '#3a7ad8', '#ffffff'); });
      await wait(220);
      await tween(g, { s: 2, x: hero.x, a: 0 }, 260);
      g.on = false;
      stopG();
      hero.alpha = 1;
      tween(hero, { squash: 0 }, 120);
      await tween(S, { sky: 0 }, 300);
      sky();
      hold(false);
    },
  });

  // ---------- Sand-Sand Fruit (Crocodile's sand) ----------
  Object.assign(MOVE_FX, {
    // Sables: a flick of the hand sends sand skimming along the ground; it winds up into a twister around
    // the foe that lifts it, spins it and drops it.
    sables: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), x = F.x, S = { h: 0, wide: 0 };
      hold(true);
      Sfx.play('fire');
      tween(hero, { ox: 6, squash: -0.08 }, 140);
      const x0 = hero.x + 14;
      await fxRun(260, (c, k) => {
        const front = lerp(x0, x - 4, easeIn(k));
        for (let xx = x0; xx < front; xx += 3) { const q = (xx - x0) / Math.max(1, x - x0), y = 119 - Math.abs(Math.sin(xx * 0.3 + G.t * 20)) * (2 + q * 4); pxRect(c, xx, y, 3, 1, DUNE[Math.floor(xx / 3) % 4]); }
        for (let i = 0; i < 10; i++) { const a = G.t * 20 + i * 0.63, r = 2 + i * 0.6; pxRect(c, front + Math.cos(a) * r, 120 - i * 1.6, 2, 1, DUNE[i % 4]); }
        if (Math.random() < 0.6) sandSpray(front, 119, 1, 40);
      });
      const tw = layer(c => {
        twister(c, x, S.h, S.wide, 1);
        foeOver(c);
        twister(c, x, S.h, S.wide, 2);
        if (S.h > 10 && Math.random() < 0.4) particles(x + rand(-30, 30), 120, 1, { colors: DUNE, speed: 50, grav: -40, dir: -Math.PI / 2, spread: 0.6, life: 0.5 });
      });
      tween(hero, { ox: 0, squash: 0 }, 200);
      tween(S, { wide: 1 }, 300);
      await tween(S, { h: 100 }, 260, easeOut);
      Sfx.play('fire');
      const spin = fxRun(520, (c, k) => { F.squash = Math.sin(k * 30) * 0.12; });
      await tween(F, { oy: -18 }, 240, easeOut);
      m.hit(0);
      impact({ x: fc.x, y: fc.y - 18 }, ['#ffffff', '#e8c890'], 10);
      particles(fc.x, fc.y - 18, 20, { colors: DUNE, speed: 90, grav: 40 });
      shake(4, 260);
      await spin;
      F.squash = 0;
      tween(S, { h: 0, wide: 0.4 }, 240);
      await tween(F, { oy: 0 }, 170, easeIn);
      F.oy = 0;
      shake(3, 150);
      dust(F.x, 14);
      await wait(80);
      tw();
      hold(false);
    },

    // Desert Spada: sand swirls round your raised hand and you drive it into the ground; a line of sand
    // blades races along the earth and one great blade erupts through the foe, then it all crumbles.
    spada: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), x0 = hero.x + 14, x1 = fc.x + 2;
      hold(true);
      Sfx.play('charge');
      const swirl = fxRun(330, (c, k) => {
        const h = heroHand();
        for (let i = 0; i < 12; i++) { const a = G.t * 14 + i * 0.52, r = 5 + (i % 3) * 2; pxRect(c, h.x + Math.cos(a) * r, h.y - 8 + Math.sin(a) * r * 0.6 - i * 0.5, 2, 1, DUNE[i % 4]); }
      });
      await tween(hero, { oy: -4, squash: -0.12 }, 240);
      await tween(hero, { oy: 2, squash: 0.24 }, 90, easeIn);
      await swirl;
      Sfx.play('boom');
      dust(x0, 10);
      shake(3, 160);
      groundWave(x0, ['#e8c890', '#a8864a'], 22, 260);
      Sfx.play('slash');
      groundCrack(x0, x1 + 16, '#6a4a2a', 380);
      const row = (c, front, sink) => {
        for (let x = x0; x < front; x += 6) {
          const hgt = Math.max(0, 22 * (1 - (front - x) / 44)) * (0.7 + ((x * 7) % 5) / 10) * sink;
          if (hgt >= 1) spike(c, x, 121, hgt, 4, 0.3);
        }
      };
      let hit = false;
      await fxRun(440, (c, k) => {
        const front = lerp(x0, x1, easeIn(Math.min(1, k * 1.35)));
        row(c, front, 1);
        if (!hit) {
          spike(c, front, 121, 30, 6, 0.4);
          speedLines(c, front - 4, 110, 0, 4, 18, '#f5e0b0', 5);
          if (Math.random() < 0.8) sandSpray(front, 119, 2, 70);
        }
        if (!hit && k * 1.35 >= 1) {
          hit = true;
          m.hit(0);
          Sfx.play('slash');
          slashAt({ x: fc.x + 2, y: fc.y }, '#f5e0b0', -1.35, 46);
          impact(fc, ['#ffffff', '#e8c890', '#a8864a'], 12);
          sandSpray(fc.x, 119, 16, 110);
          shake(6, 300);
        }
        if (hit) spike(c, x1, 121, Math.round(52 * easeOut(Math.min(1, (k - 0.74) * 6 + 0.2))), 7, 0.15);
      });
      if (!hit) m.hit(0);
      // the blades crumble back to sand; the foe is left drained of strength
      const home = back(240);
      await fxRun(380, (c, k) => {
        row(c, x1, 1 - k);
        spike(c, x1, 121, Math.round(52 * (1 - easeIn(k))), 7, 0.15);
        if (Math.floor(k * 10) % 2) foeTint(c, 'tint', '#6a4a2a', 0.7);
        if (Math.random() < 0.7) particles(lerp(x0, x1, Math.random()), 112, 1, { colors: DUNE, speed: 20, grav: 120, life: 0.5 });
      });
      dust(fc.x, 10);
      await home;
      hold(false);
    },

    // Ground Death: palm to the earth; the land dries and cracks in a line all the way to the foe, the ground
    // under it collapses into a sinkhole that swallows it to the waist, and a spray of sand bursts up.
    grounddeath: async m => {
      const hero = G.hero, F = G.battle.F, cx = F.x, fc = fc0(), rx = foeW() / 2 + 22, x0 = hero.x + 12;
      const S = { dry: 0, sink: 0, fade: 1 };
      const cracks = Array.from({ length: 16 }, (_, i) => ({ x: lerp(x0, cx + rx, i / 15) + rand(-3, 3), len: rand(5, 11), a: rand(-0.5, 0.5) }));
      hold(true);
      await tween(hero, { squash: 0.22, oy: 2, ox: 4 }, 160);
      Sfx.play('fire');
      const stop = layer(c => {
        const front = lerp(x0, cx + rx, S.dry);
        c.globalAlpha = S.fade;
        if (front > x0 + 1) {
          pxRect(c, x0, 121, front - x0, 3, '#b08a5a');
          pxRect(c, x0, 120, front - x0, 1, '#d8b070');
          for (const cr of cracks) if (cr.x < front) zigzag(c, cr.x, 122, cr.x + Math.cos(cr.a) * cr.len, 122 + Math.sin(cr.a) * 2, 2, 1, '#5a3a1a', 1);
          for (let i = 0; i < 6; i++) {
            const hx = x0 + ((i * 37 + G.t * 25) % Math.max(1, front - x0)), hy = 118 - ((G.t * 30 + i * 9) % 22);
            pxRect(c, hx + Math.sin(hy * 0.5) * 1.5, hy, 1, 3, '#fff3c0');
          }
        }
        if (S.sink > 0.02) {
          const r = rx * S.sink, ry = 8 * S.sink;
          whirl(c, cx, r, ry);
          foeOver(c);
          whirl(c, cx, r, ry, true);
        }
        c.globalAlpha = 1;
      });
      await tween(S, { dry: 1 }, 420);
      // the ground gives way
      Sfx.play('boom');
      shake(4, 300);
      tween(S, { sink: 1 }, 220, easeOut);
      for (let x = cx - rx; x < cx + rx; x += 6) particles(x, 119, 2, { colors: DUNE, speed: 40, grav: 120, dir: -Math.PI / 2, spread: 1 });
      await tween(F, { oy: foeLift() + 14, squash: 0.15 }, 280, easeIn);
      m.hit(0);
      impact({ x: cx, y: 112 }, ['#ffffff', '#e8c890'], 10);
      sandSpray(cx, 118, 26, 120);
      shake(6, 400);
      await wait(240);
      // it claws its way back out
      await tween(F, { oy: 0, squash: 0 }, 220);
      F.oy = 0; F.squash = 0;
      dust(F.x, 14);
      tween(S, { fade: 0 }, 240);
      await Promise.all([tween(S, { sink: 0 }, 240), back(240)]);
      stop();
      hold(false);
    },

    // Desert Girasole (awakened): cracks race out from under the foe, the whole field caves into a giant
    // quicksand whirlpool that drags it down spinning, then a geyser of sand flings it out again.
    girasole: async m => {
      const hero = G.hero, F = G.battle.F, cx = F.x, fc = fc0(), S = { g: 0, crack: 0, gey: 0 };
      const cr = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2 + 0.2; return [Math.cos(a), Math.sin(a)]; });
      hold(true);
      Sfx.play('fire');
      await tween(hero, { squash: 0.22, oy: 2, ox: 4 }, 160);
      shake(3, 1500);
      const stop = layer(c => {
        const rx = 84 * S.g, ry = 13 * S.g;
        if (S.crack > 0 && S.g < 0.6) for (const [dx, dy] of cr) zigzag(c, cx, 121, cx + dx * 84 * S.crack, 121 + dy * 13 * S.crack, 4, 1, '#6a4a2a', 1);
        whirl(c, cx, rx, ry);
        if (S.g > 0.3) {
          for (let i = 0; i < 18; i++) {
            const a = i * 0.349 + G.t * 3, q = (G.t * 1.5 + i * 0.27) % 1, r = 1 - q;
            pxRect(c, cx + Math.cos(a) * rx * r, 121 + Math.sin(a) * ry * r - 1, 2, 1, '#f5e0b0');
          }
        }
        if (S.gey > 0) {
          // a spout of sand that widens as it climbs, crowned with billowing dust
          const h = S.gey * 100;
          for (let y = 0; y < h; y += 2) {
            const q = y / h, w = 9 + q * 7 + Math.sin(G.t * 40 + y * 0.4) * 1.5;
            pxRect(c, cx - w - 1, 119 - y, w * 2 + 2, 2, '#8a6a3a');
            pxRect(c, cx - w, 119 - y, w * 2, 2, '#d8b070');
            pxRect(c, cx - w * 0.45 + Math.sin(G.t * 25 + y * 0.2) * 2, 119 - y, w * 0.9, 2, '#f5e0b0');
          }
          for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; dustPuff(c, cx + Math.cos(a) * 15, 125 - h + Math.sin(a) * 6, 6 + (i % 2) * 3); }
          if (Math.random() < 0.7) particles(cx + rand(-16, 16), 121 - h, 2, { colors: DUNE, speed: 60, grav: 200, dir: -Math.PI / 2, spread: 2.2, life: 0.7 });
        }
        foeOver(c);
        whirl(c, cx, rx, ry, true);
      });
      await tween(S, { crack: 1 }, 260);
      Sfx.play('boom');
      await tween(S, { g: 1 }, 480, easeOut);
      S.crack = 0;
      // the foe spirals down into the pit
      const down = foeLift() + 16;
      await fxRun(600, (c, k) => {
        F.ox = Math.round(Math.sin(k * 14) * 12 * (1 - k));
        F.oy = easeIn(k) * down;
        F.squash = Math.sin(k * 20) * 0.08;
        if (Math.random() < 0.5) sandSpray(cx + F.ox, 119, 1, 50);
      });
      F.ox = 0; F.oy = down; F.squash = 0;
      m.hit(0);
      Sfx.play('boom');
      impact({ x: cx, y: 112 }, ['#ffffff', '#e8c890'], 10);
      sandSpray(cx, 118, 20, 100);
      shake(6, 300);
      await wait(180);
      // a geyser of sand bursts up and flings it out
      Sfx.play('fire');
      focusLines({ x: cx, y: 100 }, '#f5e0b0', 300);
      tween(S, { gey: 1 }, 160, easeOut);
      particles(cx, 110, 40, { colors: DUNE, speed: 150, grav: 200, dir: -Math.PI / 2, spread: 0.9, size: 3 });
      await tween(F, { oy: -28, squash: -0.1 }, 220, easeOut);
      tween(S, { gey: 0 }, 300, easeIn);
      await tween(F, { oy: 0, squash: 0.2 }, 220, easeIn);
      F.oy = 0;
      shake(8, 400);
      dust(cx, 16);
      tween(F, { squash: 0 }, 160);
      await Promise.all([tween(S, { g: 0 }, 320), back(260)]);
      F.squash = 0;
      stop();
      hold(false);
    },

    // Sables Pesado (awakened): sand streams in from every side and packs into a heavy, churning ball over
    // your hand; you hurl it and it bursts into a sandstorm that boils across the field.
    pesado: async m => {
      const hero = G.hero, hc = heroC(), fc = fc0(), sx = hc.x + 16, sy = 44, S = { r: 4, x: sx, y: sy, on: true, tint: 0 };
      hold(true);
      Sfx.play('charge');
      tween(hero, { squash: -0.12, oy: -2 }, 200);
      const stop = layer(c => {
        dim(c, 0.22 * S.tint, '#8a6a3a');
        if (S.on) sandBall(c, S.x, S.y, S.r);
      });
      tween(S, { tint: 1 }, 400);
      const streaks = Array.from({ length: 22 }, (_, i) => ({ a: i * 0.2856, r: rand(50, 90) }));
      await fxRun(620, (c, k) => {
        for (const s of streaks) {
          const r = s.r * (1 - easeIn(k)) + S.r, a = s.a + k * 4;
          pxLine(c, sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.7, sx + Math.cos(a + 0.2) * (r + 10), sy + Math.sin(a + 0.2) * (r + 10) * 0.7, DUNE[Math.floor(s.a * 3) % 4], 2);
        }
        S.r = 4 + easeOut(k) * 24;
        if (Math.random() < 0.5) particles(hc.x + rand(-40, 60), 119, 1, { colors: DUNE, speed: 40, grav: -60, dir: -Math.PI / 2, spread: 0.4, life: 0.6 });
      });
      // it packs down, heavy
      Sfx.play('boom');
      await tween(S, { r: 21 }, 120, easeIn);
      shake(3, 200);
      await tween(S, { r: 26 }, 120, easeOut);
      // hurl it
      Sfx.play('fire');
      S.on = false;
      tween(hero, { ox: 10, oy: 0, squash: 0.12 }, 110, easeIn);
      const trail = [], ang = Math.atan2(fc.y - 6 - sy, fc.x - sx);
      await fxRun(300, (c, k) => {
        S.x = lerp(sx, fc.x, easeIn(k)); S.y = lerp(sy, fc.y - 6, easeIn(k));
        trail.unshift({ x: S.x, y: S.y });
        if (trail.length > 8) trail.length = 8;
        for (let i = trail.length - 1; i >= 1; i--) dustPuff(c, trail[i].x - i * 2, trail[i].y, 14 * (1 - i / 8));
        speedLines(c, S.x, S.y, ang, 7, 30, '#f5e0b0', 6);
        sandBall(c, S.x, S.y, 26);
      });
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#e8c890', 0.8);
      focusLines(fc, '#f5e0b0', 450);
      shake(12, 800);
      particles(fc.x, fc.y, 60, { colors: DUNE, speed: 150, grav: 100, size: 3 });
      groundWave(fc.x, ['#f5e0b0', '#a8864a'], 90, 560);
      const home = back(260);
      // the sandstorm boils out and slowly settles
      const puffs = Array.from({ length: 16 }, (_, i) => ({ a: i * 0.39 + rand(-0.2, 0.2), d: rand(0.6, 1), r: rand(8, 14) }));
      await fxRun(780, (c, k) => {
        const e = easeOut(Math.min(1, k * 1.8)), fade = 1 - k01((k - 0.45) / 0.55);
        c.globalAlpha = fade;
        for (const p of puffs) dustPuff(c, fc.x + Math.cos(p.a) * 52 * e * p.d, fc.y + Math.sin(p.a) * 26 * e * p.d - k * 8, p.r * (0.6 + e * 0.6));
        dustPuff(c, fc.x, fc.y, 18 * (1 - k * 0.5));
        for (let i = 0; i < 3; i++) { const q = k01(k * 1.3 - i * 0.15); ellipse(c, fc.x, 121, 10 + q * 90, 3 + q * 12, 0, DUNE[i], 2); }
        c.globalAlpha = 1;
      });
      await Promise.all([home, tween(S, { tint: 0 }, 260)]);
      stop();
      hold(false);
    },
  });

  // ---------- Flower-Flower Fruit (Robin's sprouting arms) ----------
  Object.assign(MOVE_FX, {
    // Clutch: you cross your arms, petals pop on the foe's back and arms sprout from it, wrap around its
    // chest and wrench it over backwards with a crack.
    clutch: async m => {
      const F = G.battle.F, fc = fc0(), spr = getSprite(F.spr), sh = spr.height * F.scale, hw = spr.width * F.scale / 2;
      const S = { grab: 0, bend: 0, a: 1, rot: false };
      // [root x, root y, hand x, hand y] relative to the foe's feet
      const limbs = [[hw - 2, -sh * 0.7, -hw + 5, -sh * 0.68], [hw - 1, -sh * 0.5, -hw + 3, -sh * 0.46], [hw - 3, -sh * 0.32, -2, -sh * 0.28]];
      const toScreen = (lx, ly) => {
        const ca = Math.cos(S.bend), sa = Math.sin(S.bend), ox = F.x + F.ox + (F.kx || 0), oy = F.y + F.oy - foeLift();
        return [ox + lx * ca - ly * sa, oy + lx * sa + ly * ca];
      };
      hold(true);
      const pose = fxRun(1250, (c, k) => crossArms(c, k > 0.85 ? (1 - k) / 0.15 : 1));
      Sfx.play('stretch');
      for (const [bx, by] of limbs) petals(F.x + bx, F.y + by, 4, 40);
      const stop = layer(c => {
        if (S.rot) foeRot(c, S.bend);
        c.globalAlpha = S.a;
        const e = easeOut(Math.min(1, S.grab));
        for (const [bx, by, tx, ty] of limbs) {
          const [x0, y0] = toScreen(bx, by), [x1, y1] = toScreen(lerp(bx, tx, e), lerp(by, ty, e));
          bloom(c, x0, y0, 2);
          arm(c, x0, y0, x1, y1, 2);
        }
        c.globalAlpha = 1;
      });
      await tween(S, { grab: 1 }, 260);
      await wait(80);
      // CLUTCH
      Sfx.play('crit');
      const tip = plainFoe();
      if (tip) { F.alpha = 0; S.rot = true; } else F.squash = 0.25;
      await tween(S, { bend: tip ? 0.5 : 0 }, 160, easeIn);
      m.hit(0);
      floatText(fc.x, foeTop() - 12, 'CLUTCH', '#ffb0e0');
      const [wx, wy] = toScreen(0, -sh * 0.45);
      impact({ x: wx, y: wy }, ['#ffffff', '#ffb0e0'], 10);
      rays({ x: wx + 4, y: wy }, '#ffffff', 8, 20, 240, 0.4);
      shake(5, 240);
      await wait(240);
      await tween(S, { bend: 0 }, 180);
      if (tip) F.alpha = 1;
      S.rot = false;
      F.squash = 0;
      Sfx.play('stretch');
      await tween(S, { a: 0 }, 160);
      for (const [bx, by] of limbs) petals(F.x + bx, F.y + by, 5, 60);
      stop();
      hold(false);
      await pose;
    },

    // Mil Fleur: blossoms open all around the foe and arms burst out of the ground; pair after pair they
    // punch it from every side, and on the last hit every arm strikes at once.
    milfleur: async m => {
      const F = G.battle.F, fc = fc0(), n = Math.max(1, m.hits);
      const field = Array.from({ length: 12 }, (_, i) => ({ x: F.x - 50 + i * 9 + (i > 5 ? 10 : 0), ph: i * 1.3, h: 10 + (i * 7) % 9, d: (i % 6) * 0.04 }));
      const S = { grow: 0, slap: 0, wave: -1, a: 1, all: 0 };
      const target = (f, i) => ({ x: fc.x + (f.x < fc.x ? -7 : 7), y: fc.y - 8 + (i % 3) * 7 });
      hold(true);
      Sfx.play('stretch');
      for (const f of field) petals(f.x, 120, 3, 30);
      const pose = fxRun(700 + n * 150, (c, k) => crossArms(c, 1 - k01((k - 0.88) / 0.12)));
      const stop = layer(c => {
        c.globalAlpha = S.a;
        field.forEach((f, i) => {
          const g = k01((S.grow - f.d) * 1.6);
          if (g <= 0) return;
          let hx = f.x + Math.sin(G.t * 6 + f.ph) * 3, hy = 121 - f.h * g;
          const pair = S.wave >= 0 && (i === (S.wave * 5) % 12 || i === (S.wave * 5 + 6) % 12);
          const s = pair ? S.slap : S.all;
          if (s > 0) {
            const t = target(f, i), px = lerp(hx, t.x, s), py = lerp(hy, t.y, s);
            if (s > 0.3) { c.globalAlpha = 0.45 * S.a; pxLine(c, lerp(hx, t.x, s * 0.4), lerp(hy, t.y, s * 0.4), px, py, '#ffffff', 3); c.globalAlpha = S.a; }
            hx = px; hy = py;
          }
          bloom(c, f.x, 121, 3);
          arm(c, f.x, 121, hx, hy, 2, SKIN, s > 0.5);
        });
        c.globalAlpha = 1;
      });
      await tween(S, { grow: 1 }, 300);
      for (let i = 0; i < n && F.hp > 0; i++) {
        const last = n > 1 && i === n - 1;
        S.wave = last ? -1 : i;
        await tween(S, last ? { all: 1 } : { slap: 1 }, last ? 100 : 70, easeIn);
        m.hit(i);
        F.squash = i % 2 ? 0.12 : -0.12;
        const p = { x: fc.x + rand(-6, 6), y: fc.y - 8 + (i % 3) * 7 };
        impact(p, PETAL, 6);
        petals(p.x, p.y, 4, 60);
        if (last) {
          Sfx.play('boom');
          focusLines(fc, '#ffb0e0', 260);
          ringOut(fc, '#ffb0e0', 4, 34, 360, 2);
          flare(fc, 10, 24, 300, ['#9a5ac8', '#ff8ac8', '#ffffff']);
          shake(6, 300);
        } else shake(2, 80);
        await tween(S, last ? { all: 0 } : { slap: 0 }, last ? 160 : 60);
      }
      S.wave = -1;
      F.squash = 0;
      await tween(S, { a: 0, grow: 0 }, 180);
      for (const f of field) petals(f.x, 116, 2, 40);
      stop();
      hold(false);
      await pose;
    },

    // Gigantesco Mano: petals swirl on either side of the foe, the ground heaves and two giant arms rise
    // out of it, draw back and clap together on the foe, squeeze, then scatter into petals.
    gigantesco: async m => {
      const F = G.battle.F, fc = fc0(), S = { rise: 0, clap: 0, a: 1, squeeze: 0 };
      hold(true);
      Sfx.play('stretch');
      const pose = fxRun(1500, (c, k) => crossArms(c, k > 0.86 ? (1 - k) / 0.14 : 1));
      fxRun(320, (c, k) => {
        for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const a = G.t * 8 + i * 0.785, r = 6 + k * 8; pxRect(c, F.x + s * 42 + Math.cos(a) * r, 120 + Math.sin(a) * r * 0.3, 2, 2, PETAL[i % 4]); }
      });
      await wait(200);
      shake(4, 400);
      for (const s of [-1, 1]) { dust(F.x + s * 42, 8); petals(F.x + s * 42, 120, 14, 60); }
      const stop = layer(c => {
        c.globalAlpha = S.a;
        for (const s of [-1, 1]) {
          const bx = F.x + s * 42, open = 1 - S.clap, ex = bx - s * 4 * S.clap + s * 4 * open * S.rise, ey = 124 - 40 * S.rise;
          const a = -Math.PI / 2 - s * S.clap * 2.15 + s * 0.3 * open, L = 34 * S.rise, jx = S.squeeze ? Math.sin(G.t * 60) : 0;
          bloom(c, bx, 122, 5);
          bigArm(c, bx, 124, ex, ey, ex + Math.cos(a) * L + jx, ey + Math.sin(a) * L, 7);
        }
        c.globalAlpha = 1;
      });
      Sfx.play('stretch');
      await tween(S, { rise: 1 }, 380, easeOut);
      await wait(120);
      Sfx.play('slash');
      await tween(S, { clap: 1 }, 150, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffb0e0', 0.5);
      focusLines(fc, '#ffffff', 320);
      ringOut(fc, '#ffffff', 4, 36, 360, 2);
      flare(fc, 10, 26, 320, ['#9a5ac8', '#ff8ac8', '#ffffff']);
      particles(fc.x, fc.y, 30, { colors: PETAL, speed: 110, grav: 40 });
      shake(9, 500);
      // squeeze
      S.squeeze = 1;
      F.squash = -0.2;
      await wait(280);
      S.squeeze = 0;
      tween(F, { squash: 0 }, 200);
      for (const s of [-1, 1]) for (let j = 0; j < 4; j++) petals(F.x + s * (42 - j * 8), 120 - j * 10, 5, 70);
      await tween(S, { a: 0 }, 220);
      F.squash = 0;
      stop();
      hold(false);
      await pose;
    },

    // Demonio Fleur (awakened): a storm of petals swirls up behind the foe and becomes a towering demon of
    // arms; its eyes flash, its wings of arms unfold, its giant hands crush the foe, then it bursts into petals.
    demonio: async m => {
      const F = G.battle.F, fc = fc0(), cx = F.x + 8, S = { rise: 0, wing: 0, crush: 0, fade: 1, swirl: 1 };
      Sfx.play('haki');
      hold(true);
      const pose = fxRun(1900, (c, k) => crossArms(c, k > 0.88 ? (1 - k) / 0.12 : 1));
      const stop = layer(c => {
        dim(c, 0.35 * S.fade, '#1a0a2a');
        if (S.swirl > 0) {
          for (let i = 0; i < 30; i++) {
            const q = (G.t * 0.8 + i / 30) % 1, a = G.t * 5 + i * 1.7, r = (30 - q * 10) * (1 - S.rise * 0.4);
            c.globalAlpha = S.swirl * (1 - q);
            pxRect(c, cx + Math.cos(a) * r, 121 - q * 100 * Math.max(0.3, S.rise), 2, 2, PETAL[i % 4]);
          }
          c.globalAlpha = 1;
        }
        demon(c, cx, 121, S.rise, S.wing, S.fade);
        c.globalAlpha = 1;
        foeOver(c);
        if (S.crush > 0) {
          c.globalAlpha = S.fade;
          for (const s of [-1, 1]) arm(c, cx + s * 14, 121 - 66 * S.rise, fc.x + s * lerp(40, 13, S.crush), fc.y, 5, '#6a4a8a');
          c.globalAlpha = 1;
        }
      });
      await tween(S, { rise: 1 }, 420, easeOut);
      // its eyes flash
      Sfx.play('crit');
      fxRun(240, (c, k) => {
        for (const s of [-1, 1]) { const x = cx + s * 4 + (s < 0 ? -1 : 2), y = 121 - 98 + 9; c.globalAlpha = 1 - k; pxRing(c, x, y, 2 + k * 8, '#ffb0e0', 1); pxLine(c, x - 6 - k * 6, y, x + 6 + k * 6, y, '#ffffff', 1); }
        c.globalAlpha = 1;
      });
      await tween(S, { wing: 1, crush: 0.01, swirl: 0 }, 260);
      Sfx.play('charge');
      await wait(80);
      await tween(S, { crush: 1 }, 150, easeIn);
      m.hit(0);
      F.squash = -0.25;
      Sfx.play('boom');
      screenFlash('#9a5ac8', 0.6);
      focusLines(fc, '#ffb0e0', 400);
      flare(fc, 10, 28, 340, ['#3a2050', '#9a5ac8', '#ffb0e0']);
      ringOut(fc, '#ffffff', 4, 36, 380, 2);
      particles(fc.x, fc.y, 30, { colors: PETAL, speed: 100, grav: 30 });
      shake(9, 500);
      await wait(320);
      tween(F, { squash: 0 }, 200);
      // it bursts apart into petals
      for (let i = 0; i < 8; i++) petals(cx - 40 + i * 12, 40 + (i % 4) * 18, 8, 70);
      await tween(S, { fade: 0 }, 300);
      F.squash = 0;
      stop();
      hold(false);
      await pose;
    },

    // Gigantesco Mano: Mil (awakened): the ground rumbles and a wave of petals sweeps the field, then a
    // forest of giant arms erupts in waves from the outside in, closes on the foe and crushes it, and the
    // whole forest bursts into a storm of petals.
    milgigante: async m => {
      const F = G.battle.F, fc = fc0(), S = { rise: 0, crush: 0, a: 1 };
      const bases = [-24, -6, 8, 24, 86, 102, 118, 128, 158, 170, 186, 206].map((bx, i) => ({ bx, h: 60 + (i * 13) % 22, d: (1 - Math.abs(bx - fc.x) / 180) * 0.45, up: false }));
      bases.sort((a, b) => Math.abs(b.bx - fc.x) - Math.abs(a.bx - fc.x));
      Sfx.play('stretch');
      hold(true);
      shake(3, 1700);
      for (let x = VIEW.x + 4; x < VIEW.x + VIEW.w; x += 12) petals(x, 120, 3, 50);
      const pose = fxRun(1800, (c, k) => crossArms(c, k > 0.88 ? (1 - k) / 0.12 : 1));
      const stop = layer(c => {
        dim(c, 0.18 * S.a, '#2a0a2a');
        c.globalAlpha = S.a;
        for (const b of bases) {
          const r = k01((S.rise - b.d) / 0.55);
          if (r <= 0) continue;
          if (!b.up) { b.up = true; dust(b.bx, 6); petals(b.bx, 120, 4, 50); }
          const toward = Math.sign(fc.x - b.bx), ex = b.bx + toward * 8 * S.crush, ey = 124 - b.h * 0.55 * r, L = b.h * 0.45 * r;
          const aim = Math.atan2(fc.y - 4 - ey, fc.x - ex), reach = lerp(L, Math.min(Math.hypot(fc.x - ex, fc.y - 4 - ey) - 4, L * 2.2), Math.min(1, S.crush));
          const a = lerp(-Math.PI / 2 + Math.sin(G.t * 4 + b.bx) * 0.1, aim, Math.min(1, S.crush));
          bloom(c, b.bx, 122, 4);
          bigArm(c, b.bx, 124, ex, ey, ex + Math.cos(a) * reach, ey + Math.sin(a) * reach, 5);
        }
        c.globalAlpha = 1;
      });
      await tween(S, { rise: 1 }, 700);
      await wait(100);
      Sfx.play('charge');
      await tween(S, { crush: 1 }, 200, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 0.8);
      focusLines(fc, '#ffb0e0', 500);
      for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#ffb0e0' : '#ffffff', 4, 40 + i * 16, 500, 3);
      flare(fc, 12, 34, 380, ['#9a5ac8', '#ff8ac8', '#ffffff']);
      groundWave(fc.x, ['#ffffff', '#ffb0e0'], 90, 560);
      particles(fc.x, fc.y, 50, { colors: PETAL.concat([SKIN]), speed: 150, grav: 60, size: 3 });
      shake(13, 800);
      F.squash = -0.2;
      await wait(340);
      tween(F, { squash: 0 }, 200);
      for (const b of bases) for (let j = 1; j <= 3; j++) petals(lerp(b.bx, fc.x, j * 0.2), 124 - b.h * 0.25 * j, 3, 70);
      await tween(S, { a: 0 }, 260);
      F.squash = 0;
      stop();
      hold(false);
      await pose;
    },
  });
}
