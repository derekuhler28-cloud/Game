'use strict';
/* Devil Fruit awakening: the transformation and every awakened move. The awakened moves are the
   biggest finishers in the game, so each is staged like an anime ultimate: a wind-up, the attack
   travelling, a heavy impact and a follow-through. */

// Helpers shared by the awakened moves.
const AW = {
  k01: v => Math.max(0, Math.min(1, v)),
  // 0 -> 1 -> 0 over k: rises during the first `a` of it and falls during the last `b`.
  env: (k, a, b) => Math.max(0, Math.min(1, k / a, (1 - k) / b)),
  // An elastic pop that overshoots and settles at 1 (inflating, sprouting).
  boing: k => 1 - Math.cos(k * Math.PI * 2.5) * Math.exp(-k * 5),
  smooth: k => k * k * (3 - 2 * k),
  FIRE: ['#a8200f', '#ff5a2a', '#ffb03a', '#fff3a0'],
  SMOKE: ['#ffffff', '#c9ccd6', '#7a7f8e'],
  DOUGH: ['#fffaf0', '#efe2c8', '#c9a26a', '#6a4a2a'],
  ICEK: '#1a4a6a',

  // Keeps drawing until the returned stop() is called.
  layer(draw) {
    const L = { t: 0, dur: 1e9, draw, res: () => {} };
    FX.list.push(L);
    return () => { L.dur = 0; };
  },
  // A wash of colour over the whole visible screen.
  tint(c, color, a) {
    if (a <= 0) return;
    c.globalAlpha = Math.min(1, a);
    pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, color);
    c.globalAlpha = 1;
  },
  // The sky darkening for `ms`, fading in and out.
  dim: (ms, color, a) => fxRun(ms, (c, k) => AW.tint(c, color, a * AW.env(k, 0.12, 0.2))),
  // Filled ellipse (only the upper half when `half`).
  oval(c, cx, cy, rx, ry, color, half) {
    if (rx < 0.5 || ry < 0.5) return;
    c.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy); ry = Math.round(ry);
    for (let dy = -ry; dy <= (half ? 0 : ry); dy++) {
      const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
      c.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  },
  ovalRing(c, cx, cy, rx, ry, color, t, half) {
    t = t || 1;
    c.fillStyle = color;
    const n = Math.max(16, Math.round((rx + ry) * 3));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, s = Math.sin(a);
      if (half && s > 0) continue;
      c.fillRect(Math.round(cx + Math.cos(a) * rx - t / 2), Math.round(cy + s * ry - t / 2), t, t);
    }
  },
  // A flat shockwave racing out along the ground.
  groundRing: (x, color, rx, ms) => fxRun(ms, (c, k) => {
    if (k > 0.7 && Math.floor(k * 24) % 2) return;
    const e = easeOut(k);
    AW.ovalRing(c, x, 121, 4 + e * rx, 1 + e * rx * 0.15, color, k < 0.45 ? 2 : 1);
  }),
  // Filled triangle.
  tri(c, x0, y0, x1, y1, x2, y2, color) {
    const [a, b, d] = [[x0, y0], [x1, y1], [x2, y2]].sort((p, q) => p[1] - q[1]);
    const at = (p, q, y) => (q[1] === p[1] ? q[0] : p[0] + (q[0] - p[0]) * Math.max(0, Math.min(1, (y - p[1]) / (q[1] - p[1]))));
    c.fillStyle = color;
    for (let y = Math.round(a[1]); y <= Math.round(d[1]); y++) {
      const xa = at(a, d, y), xb = y < b[1] ? at(a, b, y) : at(b, d, y);
      const l = Math.round(Math.min(xa, xb)), r = Math.round(Math.max(xa, xb));
      c.fillRect(l, y, r - l + 1, 1);
    }
  },
  // A bendy tube (a stretched arm, a neck of magma) along a curve from (x0,y0) through the pull
  // of (qx,qy) to (x1,y1), r0 thick at the start and r1 at the end. cols: outline, body, shine.
  tube(c, x0, y0, qx, qy, x1, y1, r0, r1, cols) {
    const L = Math.hypot(qx - x0, qy - y0) + Math.hypot(x1 - qx, y1 - qy);
    if (L < 1) return;
    const P = [];
    for (let s = 0; s <= L;) {
      const t = s / L, u = 1 - t, r = lerp(r0, r1, t * t);
      P.push([u * u * x0 + 2 * u * t * qx + t * t * x1, u * u * y0 + 2 * u * t * qy + t * t * y1, r]);
      s += Math.max(1.5, r * 0.5);
    }
    P.push([x1, y1, r1]);
    for (const [x, y, r] of P) pxCircle(c, x, y, r + 1, cols[0]);
    for (const [x, y, r] of P) pxCircle(c, x, y, r, cols[1]);
    for (const [x, y, r] of P) if (r > 1.5) pxCircle(c, x - r * 0.25, y - r * 0.35, r * 0.45, cols[2]);
  },
  // Anime speed lines streaming across the screen (dir 1: toward the right).
  speed(ms, color, dir, y0, y1, n) {
    const L = Array.from({ length: n || 16 }, () => ({ y: Math.round(rand(y0, y1)), len: rand(18, 60), ph: Math.random(), sp: rand(1.5, 2.6) }));
    return fxRun(ms, (c, k) => {
      c.globalAlpha = 0.8 * AW.env(k, 0.1, 0.35);
      for (const l of L) {
        const u = (l.ph + k * l.sp) % 1, span = VIEW.w + l.len;
        pxRect(c, dir > 0 ? VIEW.x - l.len + u * span : VIEW.x + VIEW.w - u * span, l.y, l.len, 1, color);
      }
      c.globalAlpha = 1;
    });
  },
  // Streaks rushing in toward `pos`: power gathering.
  gather(pos, colors, ms, R) {
    const L = Array.from({ length: 18 }, (_, i) => ({ a: i * 0.35 + Math.random() * 0.3, ph: Math.random(), len: rand(6, 14), col: colors[i % colors.length] }));
    return fxRun(ms, (c, k) => {
      const fade = k > 0.85 ? (1 - k) / 0.15 : 1;
      for (const l of L) {
        const u = (l.ph + k * ms / 450) % 1, r = R * (1 - u) * fade + 4, cs = Math.cos(l.a), sn = Math.sin(l.a), len = l.len * (1 - u * 0.6);
        pxLine(c, pos.x + cs * r, pos.y + sn * r, pos.x + cs * (r + len), pos.y + sn * (r + len), l.col, 1);
      }
    });
  },
  // Chunks of rock (or whatever `colors` says) thrown up from the ground at x.
  debris(x, n, colors, speed) {
    particles(x, 117, n, { colors: colors || ['#7a6a5a', '#5a4a3a', '#b8a888'], speed: speed || 140, grav: 280, dir: -Math.PI / 2, spread: 1.5, size: 3, life: 0.9 });
  },
  // A shaded puff of smoke or cloud: dark rim, body, bright top-left.
  puff(c, x, y, r, cols) {
    pxCircle(c, x, y, r + 1, cols[2]);
    pxCircle(c, x, y + 0.5, r, cols[1]);
    if (r > 2) pxCircle(c, x - r * 0.3, y - r * 0.3, r * 0.55, cols[0]);
  },
  // A licking tongue of flame rising from (x, y), h tall and w wide; pal runs dark edge -> hot core.
  flame(c, x, y, h, w, ph, pal) {
    pal = pal || AW.FIRE;
    for (let li = 0; li < pal.length; li++) {
      const f = 1 - li * 0.24, hh = h * (1 - li * 0.17);
      for (let j = 0; j < hh; j += 2) {
        const t = j / hh, ww = Math.max(1, Math.round(w * f * Math.pow(1 - t, 0.7))), wob = Math.sin(j * 0.22 - G.t * 17 + ph) * 2.2 * t;
        pxRect(c, x - ww / 2 + wob, y - j - 2, ww, 2, pal[li]);
      }
    }
  },
  // A comic "POW" burst: an outlined spiky star.
  burst(c, x, y, r, color, rot) {
    for (const [col, rr, t] of [[PAL.k, r + 2, 3], [color, r, 3], ['#ffffff', r * 0.45, 2]]) {
      for (let i = 0; i < 40; i++) {
        const a = rot + i / 40 * Math.PI * 2, R = rr * (0.55 + 0.45 * Math.abs((i % 4) - 2) / 2);
        pxLine(c, x, y, x + Math.cos(a) * R, y + Math.sin(a) * R, col, t);
      }
    }
  },
  pow(pos, color, r, ms) {
    const rot = Math.random();
    return fxRun(ms || 240, (c, k) => {
      if (k > 0.7 && Math.floor(k * 20) % 2) return;
      AW.burst(c, pos.x, pos.y, r * (0.5 + 0.5 * easeOut(Math.min(1, k * 3))), color, rot);
    });
  },
  // A four-point twinkle.
  twinkle(c, x, y, s, color) {
    if (s < 1) return;
    pxRect(c, x - s, y, s * 2 + 1, 1, color); pxRect(c, x, y - s, 1, s * 2 + 1, color);
    pxRect(c, x - 1, y - 1, 3, 3, color); pxRect(c, x, y, 1, 1, '#ffffff');
  },
  // A snowflake.
  flake(c, x, y, s) {
    pxRect(c, x - s * 2, y, s * 4 + 1, 1, '#ffffff'); pxRect(c, x, y - s * 2, 1, s * 4 + 1, '#ffffff');
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pxRect(c, x + dx * s, y + dy * s, 1, 1, '#bff2ff');
  },
  // An ice spike from (x, y) pointing along angle a, len long and w wide at the base.
  shard(c, x, y, a, len, w) {
    if (len < 2) return;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, tx = x + ux * len, ty = y + uy * len;
    AW.tri(c, x + nx * (w + 1), y + ny * (w + 1), x - nx * (w + 1), y - ny * (w + 1), tx + ux * 2, ty + uy * 2, AW.ICEK);
    AW.tri(c, x + nx * w, y + ny * w, x - nx * w, y - ny * w, tx, ty, '#7cc8ea');
    AW.tri(c, x - nx * w, y - ny * w, x, y, tx, ty, '#e8fbff');
  },
  // A white quake bubble (Whitebeard's power) of radius r.
  quakeOrb(c, x, y, r) {
    if (r < 1) return;
    c.globalAlpha = 0.3; pxCircle(c, x, y, r, '#ffffff'); c.globalAlpha = 1;
    pxRing(c, x, y, r + 1, PAL.k, 1);
    pxRing(c, x, y, r, '#ffffff', 1);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; zigzag(c, x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 1, '#ffffff', 1); }
  },
  // Conqueror's Haki: black lightning with a red glow crackling off a body of radius r.
  haki(c, x, y, r, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = a + rand(-0.4, 0.4), r1 = r + rand(6, 18);
      const x0 = x + Math.cos(a) * r * 0.85, y0 = y + Math.sin(a) * r * 0.85, x1 = x + Math.cos(b) * r1, y1 = y + Math.sin(b) * r1;
      zigzag(c, x0, y0, x1, y1, 4, 3, '#ff3a3a', 3);
      zigzag(c, x0, y0, x1, y1, 4, 3, '#1b1424', 1);
    }
  },
  // A lumpy fireball that swells and billows into smoke. pal: darkest -> white-hot.
  boom(pos, R, ms, pal) {
    const lobes = Array.from({ length: 7 }, (_, i) => ({ a: i / 7 * Math.PI * 2 + rand(-0.2, 0.2), d: rand(0.45, 0.7), s: rand(0.42, 0.6) }));
    return fxRun(ms, (c, k) => {
      const r = R * easeOut(Math.min(1, k * 2.4)), x = pos.x, y = pos.y - k * k * R * 0.5;
      if (k > 0.35) {
        c.globalAlpha = Math.min(1, (1 - k) / 0.4);
        for (const l of lobes) AW.puff(c, x + Math.cos(l.a) * r * l.d, y + Math.sin(l.a) * r * l.d * 0.8 - (k - 0.35) * 16, r * l.s, ['#8a8090', '#5a5060', '#3a3440']);
        c.globalAlpha = 1;
      }
      if (k < 0.6) {
        const heat = 1 - k / 0.6;
        for (let li = 0; li < pal.length; li++) {
          const f = (1 - li * 0.17) * (li > 1 ? 0.3 + 0.7 * heat : 1);
          pxCircle(c, x, y, r * f * 0.7, pal[li]);
          for (const l of lobes) pxCircle(c, x + Math.cos(l.a) * r * l.d * f, y + Math.sin(l.a) * r * l.d * f * 0.85, r * l.s * f, pal[li]);
        }
      }
    });
  },
  // A bead of light shot from `from` to `to` in ms, trailing a streak.
  bead(from, to, ms) {
    const f = { x: from.x, y: from.y };
    return fxRun(ms, (c, k) => {
      const x = lerp(f.x, to.x, k), y = lerp(f.y, to.y, k), tk = Math.max(0, k - 0.35), tx = lerp(f.x, to.x, tk), ty = lerp(f.y, to.y, tk);
      pxLine(c, tx, ty, x, y, '#ffd04a', 3); pxLine(c, tx, ty, x, y, '#fff6c8', 1);
      pxCircle(c, x, y, 3, '#ffd04a'); pxCircle(c, x, y, 2, '#ffffff');
    });
  },
  // A burst of light: a white flash, a cross-shaped flare and a ring.
  flash(pos, r) {
    return fxRun(260, (c, k) => {
      const e = easeOut(k), s = Math.round(r * 2 * (1 - k));
      if (k < 0.35) pxCircle(c, pos.x, pos.y, r * (1 - k), '#ffffff');
      pxRing(c, pos.x, pos.y, r * (0.4 + e * 1.4), k < 0.5 ? '#ffffff' : '#ffd04a', 1);
      if (s > 0) { pxRect(c, pos.x - s, pos.y, s * 2 + 1, 1, '#fff6c8'); pxRect(c, pos.x, pos.y - s, 1, s * 2 + 1, '#fff6c8'); }
    });
  },
  // A molten rock falling from the sky onto the ground at x, bursting where it lands.
  meteor(x, ms) {
    const x0 = x - 34, y0 = VIEW.y - 10;
    return fxRun(ms, (c, k) => {
      for (let i = 4; i >= 1; i--) { const e = easeIn(Math.max(0, k - i * 0.05)); pxCircle(c, lerp(x0, x, e), lerp(y0, 117, e), 4.5 - i * 0.8, AW.FIRE[4 - i]); }
      const e = easeIn(k), mx = lerp(x0, x, e), my = lerp(y0, 117, e);
      pxCircle(c, mx, my, 5, '#1b0604'); pxCircle(c, mx, my, 4, '#7a2614'); pxRect(c, mx - 1, my - 2, 2, 2, '#ffb03a');
    }).then(() => {
      Sfx.play('fire');
      particles(x, 116, 12, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 90, grav: 220, dir: -Math.PI / 2, spread: 1.6, size: 3 });
      ringOut({ x, y: 119 }, '#ff9a3a', 2, 18, 260, 1);
      shake(3, 120);
    });
  },
  // A jagged polyline from (x0,y0) to (x1,y1) in n steps, and drawing the first fraction e of one.
  jag(x0, y0, x1, y1, n, amp) {
    const P = [[x0, y0]];
    for (let i = 1; i < n; i++) P.push([lerp(x0, x1, i / n) + rand(-amp, amp), lerp(y0, y1, i / n) + rand(-amp, amp)]);
    P.push([x1, y1]);
    return P;
  },
  poly(c, P, e, color, t, dx, dy) {
    const n = P.length - 1, f = e * n;
    dx = dx || 0; dy = dy || 0;
    for (let i = 0; i < n && i < f; i++) {
      const k = Math.min(1, f - i), [x0, y0] = P[i], [x1, y1] = P[i + 1];
      pxLine(c, x0 + dx, y0 + dy, lerp(x0, x1, k) + dx, lerp(y0, y1, k) + dy, color, t);
    }
  },
  // Catmull-Rom spline through the points P, at t (0..1).
  spline(P, t) {
    const n = P.length - 1, f = Math.max(0, Math.min(0.9999, t)) * n, i = Math.floor(f), u = f - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
    const cr = (a, b, q, d) => 0.5 * (2 * b + (q - a) * u + (2 * a - 5 * b + 4 * q - d) * u * u + (3 * b - a - 3 * q + d) * u * u * u);
    return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
  },
  // A paw (palm pad and three toe beans) at scale s: the Paw-Paw Fruit's shape.
  PAW: [[0, 4, 9], [-8, -6, 4], [0, -10, 4], [8, -6, 4]],
  paw(c, x, y, s, fill, rim) {
    for (const [dx, dy, r] of AW.PAW) pxCircle(c, x + dx * s, y + dy * s, r * s + 1, rim);
    for (const [dx, dy, r] of AW.PAW) pxCircle(c, x + dx * s, y + dy * s, r * s, fill);
  },
  pawRing(c, x, y, s, color, t) { for (const [dx, dy, r] of AW.PAW) pxRing(c, x + dx * s, y + dy * s, r * s, color, t); },

  // A cartoon fist facing right, outlined and shaded, radius r.
  fist(c, x, y, r) {
    r = Math.round(r);
    if (r < 2) return;
    const K = PAL.k, th = r > 12 ? 2 : 1;
    const kn = i => [x + Math.round(r * 0.7), y - Math.round(r * 0.6) + Math.round(i * r * 0.4), Math.max(1, Math.round(r * 0.32))];
    pxRect(c, x - r - 10, y - Math.round(r * 0.4), 14, Math.round(r * 0.8), K);
    pxRect(c, x - r - 10, y - Math.round(r * 0.4) + 2, 14, Math.round(r * 0.8) - 4, '#d8dbe6');
    pxCircle(c, x, y, r + 2, K);
    for (let i = 0; i < 4; i++) { const [kx, ky, kr] = kn(i); pxCircle(c, kx, ky, kr + 2, K); }
    pxCircle(c, x, y, r, '#c9ccd6');
    for (let i = 0; i < 4; i++) { const [kx, ky, kr] = kn(i); pxCircle(c, kx, ky, kr, '#c9ccd6'); }
    pxCircle(c, x - r * 0.12, y - r * 0.12, r * 0.86, '#ffffff');
    for (let i = 0; i < 4; i++) { const [kx, ky, kr] = kn(i); pxCircle(c, kx - 1, ky - 1, Math.max(1, kr - 1), '#ffffff'); }
    for (let i = 1; i < 4; i++) { const ky = y - Math.round(r * 0.8) + Math.round(i * r * 0.4); pxLine(c, x + Math.round(r * 0.35), ky, x + Math.round(r * 0.95), ky, '#9aa0b0', th); }
    pxLine(c, x - r * 0.2, y + r * 0.5, x + r * 0.5, y + r * 0.3, '#9aa0b0', th);
  },
  // A flying body part (Buggy's festival): fist, foot or head, scale s.
  part(c, kind, x, y, s) {
    if (kind === 'head') { pxCircle(c, x, y, 5 * s, PAL.k); pxCircle(c, x, y, 4 * s, '#f7e0d0'); pxRect(c, x - 4 * s, y - 5 * s, 8 * s, 2 * s, '#3b6fd6'); pxCircle(c, x, y + s, s + 1, '#d63c2f'); pxRect(c, x - 2 * s, y - s, s, s, PAL.k); pxRect(c, x + s, y - s, s, s, PAL.k); }
    else if (kind === 'foot') { pxRect(c, x - 4 * s, y - 2 * s, 8 * s, 5 * s, PAL.k); pxRect(c, x - 3 * s, y - s, 6 * s, 3 * s, '#3a3440'); pxRect(c, x - 3 * s, y - s, 6 * s, 1, '#5a5464'); }
    else { pxCircle(c, x, y, 4 * s, PAL.k); pxCircle(c, x, y, 3 * s, '#f7e0d0'); pxCircle(c, x - s, y - s, s + 1, '#fff2e8'); pxRect(c, x + s, y - 2 * s, s, 4 * s, '#d8b8a0'); }
  },
  // A thick braided thread from (x0,y0) toward (x1,y1), revealed up to s.e and humming by s.vib.
  thread(c, s) {
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L * s.e / 2)), nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= n; i++) {
      const t = i / n * s.e, off = (s.vib || 0) * Math.sin(t * Math.PI) * Math.sin(G.t * 60 + s.ph);
      const x = s.x0 + dx * t + nx * off, y = s.y0 + dy * t + ny * off;
      pxRect(c, x - 1.5, y - 1.5, 3, 3, s.lit ? '#ff8ab0' : '#7a2450');
      pxRect(c, x - 1, y - 1, 2, 2, !s.lit && i % 3 === 0 ? '#ff8ab0' : '#ffffff');
    }
    if (s.e > 0 && s.e < 1) AW.twinkle(c, s.x0 + dx * s.e, s.y0 + dy * s.e, 3, '#ffffff');
  },
  // A wolf's head of magma facing right at (x, y), jaws open by `open`, scale s.
  hound(c, x, y, open, s) {
    if (s < 0.1) return;
    const P = (u, v) => [x + u * s, y + v * s];
    const T = (a, b, d, col) => AW.tri(c, ...P(a[0], a[1]), ...P(b[0], b[1]), ...P(d[0], d[1]), col);
    const K = '#1b0604', crust = '#5a1a12', crust2 = '#7a2614', glow = Math.floor(G.t * 12) % 2 ? '#ffb03a' : '#ff7a2a', o = open;
    // ears
    T([-10, -5], [-3, -8], [-11, -20], K); T([-8.5, -6], [-4.5, -8], [-10, -16.5], crust2);
    T([-4, -8], [3, -8], [-3, -19], K); T([-2.5, -8], [1.5, -8], [-2.5, -15.5], crust2);
    // the white-hot inside of the mouth, then the lower jaw and its fangs
    T([0, -1], [22, -1.5], [19, 4 + o], '#ffd04a');
    T([2, 0], [18, -0.5], [15, 3 + o * 0.8], '#fff3a0');
    T([-1, 2], [20, 3 + o], [-1, 9], K); T([0, 3], [18.5, 3.5 + o], [0, 7.5], crust);
    for (const u of [7, 11.5, 16]) { const e = 3.2 + (0.5 + o) * u / 18.5; T([u, e], [u + 2, e], [u + 1, e - 2.6], '#fff3d0'); }
    // skull and snout
    pxCircle(c, ...P(-5, 0), 10 * s + 1, K); pxCircle(c, ...P(-5, 0), 10 * s, crust);
    T([-3, -8.5], [24, -2.5], [-3, 2.5], K); T([-2, -7.5], [22, -2.5], [-2, 1.5], crust2);
    for (const u of [6, 10.5, 15]) T([u, 0.3], [u + 2, 0.3], [u + 1, 3], '#fff3d0');
    pxCircle(c, ...P(22.5, -2.5), 1.6 * s, K);
    // glowing seams in the crust and a burning eye under a heavy brow
    for (const [a, b, d, e] of [[-12, -3, -7, 2], [-8, -6, -2, -4], [4, -5.5, 12, -4.5], [-13, 4, -8, 6], [12, -4.5, 17, -3]]) pxLine(c, ...P(a, b), ...P(d, e), glow, 1);
    pxRect(c, ...P(2, -6), Math.max(2, 4 * s), Math.max(1, 1.6 * s), '#ffe14a');
    pxLine(c, ...P(0, -8), ...P(7, -6.5), K, 2);
  },
  // A tall ice crystal standing on (cx, base): hw half-wide, h tall. crack 0..1 splits it,
  // glint 0..1 runs a shine up it, a fades it.
  CRACKS: [[[0, 0.1], [-0.3, 0.3], [-0.1, 0.5], [-0.45, 0.65]], [[-0.1, 0.5], [0.35, 0.58], [0.2, 0.72]], [[0.25, 0.15], [0.6, 0.32], [0.4, 0.45]]],
  crystal(c, cx, base, hw, h, crack, glint, a) {
    if (h < 2 || a <= 0) return;
    const K = AW.ICEK, tip = Math.min(h * 0.6, hw * 1.3), top = base - h, sh = top + tip;
    const half = j => (j < tip ? hw * j / tip : hw);
    c.globalAlpha = 0.75 * a;
    for (let j = 0; j < h; j++) {
      const y = top + j, w = half(j), l = cx - w, m1 = cx - w * 0.3, m2 = cx + w * 0.35;
      pxRect(c, l, y, m1 - l, 1, '#8ad2ee'); pxRect(c, m1, y, m2 - m1, 1, '#c8f4ff'); pxRect(c, m2, y, cx + w - m2, 1, '#5fa8d8');
    }
    c.globalAlpha = a;
    pxLine(c, cx - hw - 1, base, cx - hw - 1, sh, K); pxLine(c, cx + hw + 1, base, cx + hw + 1, sh, K);
    pxLine(c, cx - hw - 1, sh, cx, top - 1, K); pxLine(c, cx + hw + 1, sh, cx, top - 1, K);
    pxLine(c, cx - hw * 0.3, base, cx - hw * 0.3, sh, '#e8fbff'); pxLine(c, cx - hw * 0.3, sh, cx, top, '#e8fbff');
    pxLine(c, cx + hw * 0.35, base, cx + hw * 0.35, sh, '#3a88b8'); pxLine(c, cx + hw * 0.35, sh, cx, top, '#3a88b8');
    if (glint > 0 && glint < 1) {
      const gy = base - h * glint * 0.85, w = half(gy - top);
      pxLine(c, cx - w + 1, gy + 4, cx + w - 1, gy - 4, '#ffffff', 2);
    }
    if (crack > 0) {
      for (const path of AW.CRACKS) {
        for (let i = 0; i < path.length - 1; i++) {
          const e = AW.k01(crack * path.length - i);
          if (e <= 0) break;
          const [u0, v0] = path[i], [u1, v1] = path[i + 1];
          const x0 = cx + u0 * hw, y0 = base - v0 * h, x1 = cx + lerp(u0, u1, e) * hw, y1 = base - lerp(v0, v1, e) * h;
          pxLine(c, x0, y0, x1, y1, K, 2); pxLine(c, x0 + 1, y0, x1 + 1, y1, '#ffffff', 1);
        }
      }
    }
    c.globalAlpha = 1;
  },
  // Aokiji's ice pheasant facing right at (x, y), scale s, wings from -1 (down) to 1 (up).
  pheasant(c, x, y, s, flap) {
    if (s < 0.1) return;
    const P = (u, v) => [x + u * s, y + v * s], K = AW.ICEK;
    const T = (a, b, d, col) => AW.tri(c, ...P(a[0], a[1]), ...P(b[0], b[1]), ...P(d[0], d[1]), col);
    // long streaming tail
    for (let j = 0; j < 3; j++) {
      let [px, py] = P(-8, j - 1);
      for (let i = 1; i <= 7; i++) {
        const [qx, qy] = P(-8 - i * 4, j * 1.5 - 1 + i * (0.5 + j * 0.45) + Math.sin(G.t * 9 + i * 0.9 + j) * 1.3);
        pxLine(c, px, py, qx, qy, K, i < 4 ? 3 : 2);
        pxLine(c, px, py, qx, qy, j === 1 ? '#ffffff' : '#9ad8f0', 1);
        px = qx; py = qy;
      }
    }
    // broad swept wings: shoulder, tip, a trailing elbow and the back of the body
    const wy = -24 * flap, wx = -5 + Math.abs(flap) * 2, my = wy * 0.55;
    const wing = (dx, dy, edge, fill) => {
      const Q = [[3, -1.5], [wx, wy], [-13, my], [-15, 0]].map(([u, v]) => [u + dx, v + dy]);
      const G2 = Q.map(([u, v]) => [lerp(-6 + dx, u, 1.15), lerp(-1 + dy, v, 1.15)]);
      T(G2[0], G2[1], G2[2], edge); T(G2[0], G2[2], G2[3], edge);
      T(Q[0], Q[1], Q[2], fill); T(Q[0], Q[2], Q[3], fill);
      return Q;
    };
    wing(-3, -1, K, '#5fa8d8');
    AW.oval(c, x, y, 11 * s + 1, 5.5 * s + 1, K); AW.oval(c, x, y, 11 * s, 5.5 * s, '#bff2ff'); AW.oval(c, x - s, y + 2 * s, 8 * s, 2.5 * s, '#8ad2ee');
    pxLine(c, ...P(9, -8), ...P(3, -16), K, 3); pxLine(c, ...P(9, -8), ...P(3, -16), '#ffffff', 1);
    pxCircle(c, ...P(11, -5), 4 * s + 1, K); pxCircle(c, ...P(11, -5), 4 * s, '#e8fbff');
    T([13.5, -7], [13.5, -2.5], [21.5, -4.6], K); T([14, -6.2], [14, -3.6], [19.8, -4.7], '#ffffff');
    pxRect(c, ...P(12, -6.5), Math.max(1, s), Math.max(1, s), K);
    const Q = wing(0, 0, K, '#bff2ff');
    for (let i = 1; i <= 3; i++) {
      const t = i / 4, [ex, ey] = t < 0.5 ? [lerp(Q[1][0], Q[2][0], t * 2), lerp(Q[1][1], Q[2][1], t * 2)] : [lerp(Q[2][0], Q[3][0], t * 2 - 1), lerp(Q[2][1], Q[3][1], t * 2 - 1)];
      pxLine(c, ...P(lerp(Q[0][0], ex, 0.25), lerp(Q[0][1], ey, 0.25)), ...P(ex, ey), '#ffffff', 1);
    }
  },
  // Buggy's Muggy Ball: a giant striped bomb with a lit fuse; rot rolls the stripes.
  muggy(c, x, y, s, rot, fuse) {
    if (s < 0.05) return;
    const r = Math.round(20 * s), sc = Math.max(1, Math.round(s * 3));
    pxCircle(c, x, y, r + 2, PAL.k);
    pxCircle(c, x, y, r, '#a8201a');
    pxCircle(c, x - r * 0.1, y - r * 0.1, r * 0.86, '#d63c2f');
    for (let i = -2; i <= 2; i++) {
      const yy = y + i * r * 0.36 + Math.sin(rot) * r * 0.14, dy = yy - y, half = Math.sqrt(Math.max(0, r * r - dy * dy)) - 1;
      if (half > 1) pxRect(c, x - half, yy - 1, half * 2, Math.max(2, Math.round(r * 0.12)), '#f2f2f2');
    }
    pxCircle(c, x - r * 0.45, y - r * 0.45, Math.max(1, r * 0.16), '#ffffff');
    drawText(c, 'B', x - 1.5 * sc, y - 2.5 * sc, { color: '#ffe14a', scale: sc, shadow: PAL.k });
    if (fuse > 0) {
      const fh = 3 + 7 * s * fuse, fx = x + r * 0.35, fy = y - r - 1;
      pxRect(c, fx - 1, fy - fh, 3, fh, PAL.k); pxRect(c, fx, fy - fh, 1, fh, '#c9b88a');
      pxRect(c, fx - 2, fy - fh - 3, 5, 4, pick(FIRE)); pxRect(c, fx - 1, fy - fh - 2, 3, 2, '#ffffff');
    }
  },
  // A giant mochi mallet: a fat dough cylinder lying level, centred on (x, y), scale s.
  mallet(c, x, y, s) {
    if (s < 0.05) return;
    const [hi, body, sh, K] = AW.DOUGH, hw = 28 * s, hh = 14 * s;
    AW.oval(c, x + hw, y, 6 * s + 1, hh + 1, K); AW.oval(c, x + hw, y, 6 * s, hh, sh);
    pxRect(c, x - hw, y - hh - 1, hw * 2, hh * 2 + 2, K);
    pxRect(c, x - hw, y - hh, hw * 2, hh * 2, body);
    pxRect(c, x - hw, y - hh, hw * 2, hh * 0.4, hi);
    pxRect(c, x - hw, y + hh * 0.45, hw * 2, hh * 0.55, sh);
    for (const f of [-0.5, 0.55]) pxRect(c, x + f * hw - s, y - hh, Math.max(1, 2 * s), hh * 2, '#d8c8a0');
    AW.oval(c, x - hw, y, 6 * s + 1, hh + 1, K); AW.oval(c, x - hw, y, 6 * s, hh, body); AW.oval(c, x - hw - s, y - hh * 0.3, 2.5 * s, hh * 0.45, hi);
  },
};

Object.assign(MOVE_FX, {
  // The transformation cut-in when you awaken: cinematic bars, the title slamming in on a slanted
  // band, an aura flaring around you, and a flourish of the fruit's own power.
  awaken: async a => {
    const hc = heroC(), cols = a.colors || ['#ffffff', '#ffe9a8'];
    const lum = h => { const [r, g, b] = hexToRgb(h); return r * 0.3 + g * 0.59 + b * 0.11; };
    const [c2, c1] = [cols[0], cols[1] || '#ffffff'].map(h => mixColor(h, '#ffffff', 0.35)).sort((x, y) => lum(x) - lum(y)).reverse().map((h, i) => (i ? h : mixColor(h, '#ffffff', 0.3)));
    const deep = mixColor(cols[0], '#05081a', 0.75), streakCol = mixColor(deep, c1, 0.35), title = String(a.name || 'Awakening').toUpperCase();
    const mid = VIEW.x + VIEW.w / 2, by = VIEW.y + Math.round(VIEW.h * 0.24), bar = Math.round(VIEW.h * 0.09);
    const streaks = Array.from({ length: 12 }, () => ({ y: Math.round(rand(-11, 11)), len: rand(16, 50), ph: Math.random(), sp: rand(1.6, 2.8) }));
    Sfx.play('haki');
    screenFlash('#ffffff', 0.9);
    G.hero.flash = 0.25;
    shake(4, 600);
    wait(330).then(() => { Sfx.play('boom'); shake(5, 200); });
    const band = fxRun(2000, (c, k) => {
      // letterbox bars
      const lb = Math.round(bar * easeOut(Math.min(1, k * 6)) * Math.min(1, (1 - k) * 8));
      pxRect(c, VIEW.x, VIEW.y, VIEW.w, lb, '#05081a'); pxRect(c, VIEW.x, VIEW.y + VIEW.h - lb, VIEW.w, lb, '#05081a');
      // the slanted band sweeps in from the left and out to the right
      const R = lerp(VIEW.x - 30, VIEW.x + VIEW.w + 30, easeOut(Math.min(1, k * 7))), Lx = lerp(VIEW.x - 30, VIEW.x + VIEW.w + 30, easeIn(AW.k01((k - 0.86) / 0.14)));
      for (let r = -15; r <= 15; r++) {
        const sh = -r * 0.6, e = Math.abs(r);
        c.globalAlpha = e >= 13 ? 1 : 0.88;
        pxRect(c, Lx + sh, by + r, R - Lx, 1, e >= 14 ? c1 : e === 13 ? '#05081a' : e === 12 ? c2 : deep);
      }
      c.globalAlpha = 0.5;
      for (const s of streaks) { const u = (s.ph + k * s.sp) % 1; pxRect(c, Math.max(Lx, lerp(R, Lx - s.len, u)), by + s.y, s.len, 1, streakCol); }
      c.globalAlpha = 1;
      if (R - Lx < 40) return;
      // the title slams in from the right, flashing white as it lands, and rides out with the band
      const tk = AW.k01((k - 0.05) / 0.13), out = Math.round(Lx - (VIEW.x - 30));
      if (tk > 0) drawText(c, title, mid + out + Math.round((1 - easeOut(tk)) * 170), by - 8, { color: tk >= 1 && k < 0.24 ? '#ffffff' : c2, scale: 2, align: 'center' });
      const sub = 'AWAKENING', n = Math.floor(AW.k01((k - 0.18) / 0.2) * sub.length);
      for (let i = 0; i < n; i++) drawText(c, sub[i], mid + out - (sub.length * 6 - 2) / 2 + i * 6, by + 6, { color: c1 });
      // a shine sweeps across
      if (k > 0.3 && k < 0.46) {
        const gx = lerp(VIEW.x, VIEW.x + VIEW.w, (k - 0.3) / 0.16);
        c.globalAlpha = 0.7;
        for (let r = -11; r <= 11; r++) pxRect(c, gx - r * 0.6, by + r, 3, 1, '#ffffff');
        c.globalAlpha = 1;
      }
    });
    // an aura flares up around you
    const aura = fxRun(2000, (c, k) => {
      const al = AW.env(k, 0.1, 0.25), x = G.hero.x + G.hero.ox, base = 122 + G.hero.oy;
      c.globalAlpha = 0.6 * al;
      for (const [dx, h] of [[-17, 22], [-12, 40], [12, 42], [17, 24]]) AW.flame(c, x + dx, base, h * (0.7 + 0.3 * al) + Math.sin(G.t * 23 + dx) * 4, 7, dx, [deep, c1, c2, '#ffffff']);
      c.globalAlpha = 1;
      for (let i = 0; i < 2; i++) { const kk = (k * 2.5 + i / 2) % 1; AW.ovalRing(c, x, 121, 8 + kk * 34, 2 + kk * 6, i ? c1 : c2, 1); }
      if (Math.random() < 0.7) particles(x + rand(-12, 12), 118, 1, { colors: [c1, c2, '#ffffff'], speed: 40, grav: -90, dir: -Math.PI / 2, spread: 0.4, life: 0.6 });
    });
    tween(G.hero, { squash: -0.12 }, 200).then(() => tween(G.hero, { squash: 0 }, 400));
    let flourish;
    switch (a.fruit) {
      case 'rubber':
        // the Drums of Liberation: heartbeats, a sun-god glow and puffs of white steam
        flourish = (async () => {
          const glow = fxRun(1600, (c, k) => {
            const al = AW.env(k, 0.15, 0.25), x = G.hero.x + G.hero.ox, y = hc.y - 8 + G.hero.oy;
            c.globalAlpha = 0.5 * al;
            for (let i = 0; i < 16; i++) { const ang = G.t * 0.7 + i * Math.PI / 8, r1 = 36 + (i % 2) * 12; pxLine(c, x + Math.cos(ang) * 20, y + Math.sin(ang) * 20, x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, '#fff6c8', i % 2 ? 1 : 2); }
            c.globalAlpha = al;
            for (let i = 0; i < 8; i++) { const ang = G.t * 1.6 + i * 0.785; AW.puff(c, x + Math.cos(ang) * 13, y - 10 + Math.sin(ang) * 4 - (i % 3) * 2, 3 + (i % 3), ['#ffffff', '#e8e8f0', '#b9bdc9']); }
            c.globalAlpha = 1;
          });
          for (let i = 0; i < 4; i++) {
            Sfx.play('boom');
            floatText(hc.x + (i % 2 ? 22 : -22), hc.y - 30 - i * 5, i % 2 ? 'DOKUN' : 'DON', '#ffffff', 2);
            ringOut({ x: hc.x, y: hc.y - 6 }, '#ffffff', 4, 48, 320, 2);
            await wait(360);
          }
          await glow;
        })();
        break;
      case 'flame':
        // a pillar of fire engulfs you, then opens into a ring of flame on the ground
        Sfx.play('fire');
        flourish = fxRun(1500, (c, k) => {
          const al = AW.env(k, 0.1, 0.4), x = G.hero.x + G.hero.ox, rise = easeOut(Math.min(1, k * 3));
          for (let i = 0; i < 12; i++) {
            const ang = i / 12 * Math.PI * 2 + G.t, rr = 16 + k * 26;
            AW.flame(c, x + Math.cos(ang) * rr, 122 + Math.sin(ang) * rr * 0.18, (7 + Math.sin(G.t * 20 + i) * 3) * Math.min(1, k * 4) * (k > 0.8 ? (1 - k) / 0.2 : 1), 5, i);
          }
          for (let i = 0; i < 7; i++) {
            const h = (74 - Math.abs(i - 3) * 13) * rise * al + Math.sin(G.t * 24 + i * 2) * 6 * al;
            if (h > 3) AW.flame(c, x + (i - 3) * 5, 123, h, 9, i * 1.3);
          }
          if (Math.random() < 0.8) particles(x + rand(-16, 16), rand(60, 110), 1, { colors: FIRE, speed: 20, grav: -60, life: 0.6 });
        });
        break;
      case 'frost':
        // ice spikes burst out of the ground around you while snow drifts down
        Sfx.play('ice');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, g = AW.boing(Math.min(1, k * 2.2)), al = k > 0.75 ? (1 - k) / 0.25 : 1;
          c.globalAlpha = al;
          for (let i = 0; i < 8; i++) {
            const side = i < 4 ? -1 : 1, j = i % 4;
            AW.shard(c, x + side * (9 + j * 6), 122, -Math.PI / 2 + side * (0.3 + j * 0.3), (32 - j * 6) * g, 3.5);
          }
          for (let i = 0; i < 16; i++) AW.flake(c, x - 70 + (i * 41) % 150 + Math.sin(G.t * 2 + i) * 4, VIEW.y + (G.t * 30 + i * 47) % VIEW.h, i % 3 ? 1 : 2);
          c.globalAlpha = 1;
        });
        break;
      case 'quake':
        // the air cracks all around you, quake bubbles swell on your fists, and the ground heaves
        Sfx.play('boom');
        shake(7, 1200);
        flourish = (async () => {
          const cr = Array.from({ length: 7 }, (_, i) => ({ a: i * 0.9 + rand(-0.2, 0.2), len: rand(42, 70) }));
          const air = fxRun(1400, (c, k) => {
            const x = G.hero.x + G.hero.ox, y = hc.y - 6 + G.hero.oy, g = easeOut(Math.min(1, k * 2.5)), al = k > 0.75 ? (1 - k) / 0.25 : 1;
            c.globalAlpha = al;
            for (const q of cr) {
              const r = q.len * g, x0 = x + Math.cos(q.a) * 12, y0 = y + Math.sin(q.a) * 12, x1 = x + Math.cos(q.a) * r, y1 = y + Math.sin(q.a) * r;
              if (r > 14) { zigzag(c, x0, y0, x1, y1, 5, 3, PAL.k, 3); zigzag(c, x0, y0, x1, y1, 5, 3, '#ffffff', 1); }
            }
            AW.quakeOrb(c, x + 12, y + 2, 6 + Math.sin(G.t * 30)); AW.quakeOrb(c, x - 9, y + 2, 5 + Math.sin(G.t * 30 + 1));
            c.globalAlpha = 1;
          });
          for (let i = 0; i < 3; i++) { AW.debris(hc.x + rand(-34, 34), 6); dust(hc.x, 6); await wait(300); }
          await air;
        })();
        break;
      case 'smoke':
        // a twister of smoke spirals up around you
        Sfx.play('fire');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.15, 0.3);
          for (let i = 0; i < 24; i++) {
            const t = i / 24, ang = G.t * 7 + t * 14, r = (9 + t * 20) * (0.5 + 0.5 * al);
            c.globalAlpha = (Math.sin(ang) > 0 ? 0.9 : 0.35) * al;
            AW.puff(c, x + Math.cos(ang) * r, 121 - t * 80 * al, 3 + t * 3, AW.SMOKE);
          }
          c.globalAlpha = 1;
        });
        break;
      case 'light':
        // a column of light lances down onto you from the sky, and sparkles glitter all around
        Sfx.play('zap');
        rays({ x: hc.x, y: hc.y - 6 }, '#fff3a0', 14, 70, 1300, 0.1);
        flourish = fxRun(1400, (c, k) => {
          const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.06, 0.45), w = 4 + 12 * al, h = 122 - VIEW.y;
          c.globalAlpha = 0.3 * al; pxRect(c, x - w - 5, VIEW.y, (w + 5) * 2, h, '#fff3a0');
          c.globalAlpha = 0.55 * al; pxRect(c, x - w, VIEW.y, w * 2, h, '#fff6c8');
          c.globalAlpha = 0.8 * al; pxRect(c, x - w * 0.3, VIEW.y, w * 0.6, h, '#ffffff');
          c.globalAlpha = 1;
          AW.ovalRing(c, x, 121, 10 + w * 2, 3 + w * 0.3, '#fff3a0', 1);
          for (let i = 0; i < 10; i++) { const ph = (G.t * 1.5 + i * 0.37) % 1; if (ph < 0.5) AW.twinkle(c, x - 50 + (i * 53) % 100, 30 + (i * 29) % 80, Math.round(3 * Math.sin(ph * 2 * Math.PI)), '#fff6c8'); }
        });
        break;
      case 'dough':
        // the ground goes soft as mochi around you and dough tendrils rise and sway
        Sfx.play('stretch');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.15, 0.3), [hi, body, sh, K] = AW.DOUGH;
          for (let i = 0; i < 3; i++) { const kk = (k * 1.6 + i / 3) % 1; AW.ovalRing(c, x, 121, 6 + kk * 60, 2 + kk * 10, i % 2 ? body : sh, 2); }
          for (let i = 0; i < 4; i++) {
            const bx = x + (i < 2 ? -1 : 1) * (18 + (i % 2) * 14), h = (28 + (i % 2) * 12) * al, rows = [];
            for (let j = 0; j <= h; j += 2) { const t = j / h; rows.push([bx + Math.sin(G.t * 5 + i + t * 3) * 5 * t, 121 - j, 4.5 * (1 - t * 0.5)]); }
            for (const [cx, y, w] of rows) pxRect(c, cx - w - 1, y - 2, w * 2 + 2, 3, K);
            for (const [cx, y, w] of rows) { pxRect(c, cx - w, y - 2, w * 2, 3, body); pxRect(c, cx - w, y - 2, 1, 3, hi); pxRect(c, cx + w * 0.3, y - 2, w * 0.7, 3, sh); }
            if (rows.length) { const [cx, y] = rows[rows.length - 1]; pxCircle(c, cx, y - 2, 4, K); pxCircle(c, cx, y - 2, 3, body); pxRect(c, cx - 2, y - 4, 2, 2, hi); }
          }
        });
        break;
      case 'dragon':
        flourish = dragonAwaken();
        break;
      case 'split':
        // you pop apart into a whirl of flying pieces and confetti
        Sfx.play('win');
        flourish = (async () => {
          const parts = ['fist', 'foot', 'head', 'fist', 'foot', 'fist'];
          const whirl = fxRun(1400, (c, k) => {
            const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.2, 0.25);
            for (let i = 0; i < 6; i++) { const ang = G.t * 5 + i * Math.PI / 3; AW.part(c, parts[i], x + Math.cos(ang) * 30 * al, hc.y - 10 + Math.sin(ang) * 16 * al, 2); }
          });
          floatText(hc.x, hc.y - 40, 'FLASHY!', '#ff5a5a', 2);
          for (let i = 0; i < 6; i++) { particles(rand(VIEW.x + 20, VIEW.x + VIEW.w - 20), rand(VIEW.y, VIEW.y + 20), 10, { colors: ['#ff5a5a', '#ffd04a', '#7cd0ff', '#7cff7a', '#ff8ab0'], speed: 40, grav: 60, life: 1.2 }); await wait(200); }
          await whirl;
        })();
        break;
      case 'magma':
        // the ground splits with glowing cracks and magma geysers burst up around you
        Sfx.play('fire');
        flourish = (async () => {
          const cr = [-1, 1].map(s => AW.jag(hc.x, 121, hc.x + s * 76, 119, 9, 2));
          const glow = fxRun(1600, (c, k) => {
            const al = AW.env(k, 0.12, 0.25), g = easeOut(Math.min(1, k * 3)), hot = Math.floor(G.t * 10) % 2 ? '#ffd04a' : '#ff5a2a';
            c.globalAlpha = al;
            for (const P of cr) { AW.poly(c, P, g, '#3a0c08', 3); AW.poly(c, P, g, hot, 1); }
            c.globalAlpha = 1;
          });
          for (let i = 0; i < 5; i++) {
            const gx = hc.x + (i % 2 ? 1 : -1) * rand(14, 44);
            fxRun(420, (c, k) => {
              const h = Math.sin(k * Math.PI) * (36 + i * 6);
              for (const [col, w] of [['#5a1a1a', 7], ['#c0301a', 5], ['#ff5a2a', 3.5], ['#ffd04a', 1.5]]) pxRect(c, gx - w, 121 - h, w * 2, h, col);
              pxCircle(c, gx, 121 - h, 6, '#ff5a2a'); pxCircle(c, gx, 122 - h, 3, '#ffd04a');
            });
            particles(gx, 112, 8, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 120, grav: 200, dir: -Math.PI / 2, spread: 0.7, size: 3 });
            await wait(200);
          }
          await glow;
        })();
        break;
      case 'string':
        // strings rain down from the sky and weave a birdcage around you
        Sfx.play('slash');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, ay = VIEW.y + 6, al = k > 0.8 ? (1 - k) / 0.2 : 1;
          c.globalAlpha = al;
          for (let i = 0; i < 11; i++) {
            const bx = x - 50 + i * 10, e = AW.k01(k * 2.4 - i * 0.06);
            if (e <= 0) continue;
            let px = x, py = ay;
            for (let j = 1; j <= 12; j++) {
              const t = j / 12 * e, qx = lerp(x, bx, t) + Math.sin(t * Math.PI) * (bx - x) * 0.35, qy = lerp(ay, 121, t);
              pxLine(c, px, py, qx, qy, i % 2 ? '#ffffff' : '#ff8ab0', 1);
              px = qx; py = qy;
            }
          }
          c.globalAlpha = 1;
        });
        break;
      case 'paw':
        // paw-print bubbles float up from you and paw-shaped shocks pulse out of your palms
        Sfx.play('charge');
        flourish = (async () => {
          const prints = fxRun(1500, (c, k) => {
            for (let i = 0; i < 5; i++) {
              const y = 120 - ((k * 90 + i * 22) % 90), x = hc.x - 30 + i * 15 + Math.sin(G.t * 3 + i) * 3;
              c.globalAlpha = 0.65 * (k > 0.8 ? (1 - k) / 0.2 : 1);
              AW.paw(c, x, y, 0.5, '#f2c7d8', '#8a5a9a');
              c.globalAlpha = 1;
            }
          });
          for (let i = 0; i < 3; i++) {
            Sfx.play('boom');
            fxRun(420, (c, k) => { c.globalAlpha = 1 - k; AW.pawRing(c, hc.x, hc.y - 8, 0.6 + easeOut(k) * 3, '#ffffff', 1); c.globalAlpha = 1; });
            await wait(380);
          }
          await prints;
        })();
        break;
      case 'phoenix':
        // great wings of blue flame unfurl from your back
        Sfx.play('fire');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, y = hc.y - 10 + G.hero.oy, open = AW.boing(Math.min(1, k * 1.8)), al = k > 0.8 ? (1 - k) / 0.2 : 1, flap = Math.sin(G.t * 7) * 0.12;
          c.globalAlpha = al;
          for (const s of [-1, 1]) {
            for (let f = 0; f < 6; f++) {
              const ang = -Math.PI / 2 + s * (0.3 + f * 0.24 + flap) * open, len = (36 - f * 3) * open, wob = Math.sin(G.t * 16 + f) * 2;
              const tx = x + s * 3 + Math.cos(ang) * len, ty = y + Math.sin(ang) * len + wob;
              pxLine(c, x + s * 3, y, tx, ty, '#1a4ab8', 5); pxLine(c, x + s * 3, y, tx, ty, '#3a9ae8', 3); pxLine(c, x + s * 3, y, tx, ty, '#bfe6ff', 1);
              pxRect(c, tx - 1, ty - 1, 3, 3, '#ffd04a');
            }
          }
          c.globalAlpha = 1;
          if (Math.random() < 0.8) particles(x + rand(-34, 34), y + rand(-24, 4), 1, { colors: ['#3a9ae8', '#bfe6ff', '#ffd04a'], speed: 20, grav: -50, life: 0.5 });
        });
        break;
      case 'ope':
        // a ROOM: a dome of power spreads out from you across the whole field
        Sfx.play('charge');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, r = 120 * easeOut(Math.min(1, k * 1.8)), al = AW.env(k, 0.05, 0.25);
          c.globalAlpha = 0.16 * al; AW.oval(c, x, 121, r, r * 0.75, '#7cd0ff', true);
          c.globalAlpha = 0.9 * al; AW.ovalRing(c, x, 121, r, r * 0.75, '#bfe6ff', 1, true); AW.ovalRing(c, x, 121, r * 0.97, r * 0.73, '#3a7ad8', 1, true);
          c.globalAlpha = 1;
          if (k > 0.2 && k < 0.85) drawText(c, 'ROOM', x, hc.y - 40, { color: '#bfe6ff', scale: 2, align: 'center' });
        });
        break;
      case 'dark':
        // darkness pools at your feet and writhes up around you, swallowing the light
        Sfx.play('haki');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.15, 0.3);
          AW.tint(c, '#05000a', 0.25 * al);
          AW.oval(c, x, 121, 40 * al, 6 * al, '#1b1424'); AW.ovalRing(c, x, 121, 40 * al, 6 * al, '#8a5ac0', 1);
          for (let i = 0; i < 9; i++) {
            const bx = x - 32 + i * 8, h = (16 + ((i * 17) % 22)) * al;
            for (const [col, add] of [['#8a5ac0', 2], ['#1b1424', 0]]) {
              let px = bx, py = 121;
              for (let j = 2; j <= h; j += 2) { const qx = bx + Math.sin(j * 0.2 + G.t * 7 + i) * 3 * (j / h + 0.3), qy = 121 - j; pxLine(c, px, py, qx, qy, col, Math.max(1, Math.round(4 * (1 - j / h))) + add); px = qx; py = qy; }
            }
          }
          for (let i = 0; i < 12; i++) { const ph = (G.t * 0.9 + i / 12) % 1, ang = i * 2.4 + ph * 3, r = 56 * (1 - ph); pxRect(c, x + Math.cos(ang) * r, 112 + Math.sin(ang) * r * 0.5, 2, 1, '#d9b3ff'); }
        });
        break;
      case 'rumble':
        // thunder drums ring out behind you as lightning strikes you again and again
        flourish = (async () => {
          const drums = fxRun(1500, (c, k) => {
            const x = G.hero.x + G.hero.ox, y = hc.y - 12 + G.hero.oy, r = 24 * AW.env(k, 0.15, 0.2);
            const D = [0, 1, 2, 3].map(i => [x + Math.cos(Math.PI + i * Math.PI / 3) * r, y + Math.sin(Math.PI + i * Math.PI / 3) * r * 0.9]);
            for (let i = 0; i < 3; i++) pxLine(c, D[i][0], D[i][1], D[i + 1][0], D[i + 1][1], '#e6b422', 1);
            for (const [dx, dy] of D) { pxCircle(c, dx, dy, 5, '#1b1424'); pxCircle(c, dx, dy, 4, '#e6b422'); pxCircle(c, dx, dy, 2, '#ffe14a'); pxRect(c, dx - 1, dy - 1, 1, 1, '#1b1424'); }
            if (r > 10 && Math.random() < 0.5) { const p = pick(D), q = pick(D); zigzag(c, p[0], p[1], q[0], q[1], 4, 3, '#bfe6ff', 1); }
          });
          for (let i = 0; i < 4; i++) {
            fxBolt(hc.x + rand(-5, 5), hc.y - 4, 1.4);
            screenFlash('#bfe6ff', 0.35);
            shake(4, 160);
            particles(hc.x, hc.y, 8, { colors: ['#ffffff', '#ffe14a', '#7cd0ff'], speed: 90, grav: 0, life: 0.3 });
            await wait(300);
          }
          await drums;
        })();
        break;
      case 'sand':
        // a sandstorm whirls up around you and gusts sweep across the ground
        Sfx.play('rustle');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.15, 0.3), S = ['#e8c890', '#c9a46a', '#f6e2b0'];
          for (let i = 0; i < 90; i++) {
            const t = i / 90, ang = G.t * 8 + i * 1.7, r = (8 + t * 26) * al, front = Math.sin(ang) > 0;
            pxRect(c, x + Math.cos(ang) * r, 121 - t * 76 * al + Math.sin(ang) * 3, front ? 2 : 1, front ? 2 : 1, front ? S[i % 3] : '#a8864a');
          }
          c.globalAlpha = 0.6 * al;
          for (let i = 0; i < 10; i++) pxRect(c, VIEW.x + ((G.t * 220 + i * 61) % (VIEW.w + 40)) - 20, 104 + (i * 7) % 20, 14 + (i % 3) * 6, 1, '#e8c890');
          c.globalAlpha = 1;
        });
        break;
      case 'flower':
        // arms sprout from the ground in a ring around you, and petals swirl through the air
        Sfx.play('rustle');
        flourish = fxRun(1500, (c, k) => {
          const x = G.hero.x + G.hero.ox, al = AW.env(k, 0.12, 0.3);
          [-36, -26, -16, 16, 26, 36].forEach((dx, i) => {
            const h = (12 + (i % 3) * 5) * AW.boing(AW.k01(k * 2.5 - i * 0.08)) * (k > 0.75 ? (1 - k) / 0.25 : 1), bx = x + dx;
            if (h < 1) return;
            pxRect(c, bx - 3, 121 - h, 7, h, PAL.k); pxRect(c, bx - 2, 121 - h, 5, h, '#f7e0d0'); pxRect(c, bx + 1, 121 - h, 1, h, '#d8b8a0');
            pxRect(c, bx - 4, 123 - h * 0.35, 9, 3, PAL.k); pxRect(c, bx - 3, 123 - h * 0.35, 7, 1, '#9a5ac8');
            pxCircle(c, bx, 119 - h, 4, PAL.k); pxCircle(c, bx, 119 - h, 3, '#f7e0d0');
            for (let f = -1; f <= 1; f++) { pxRect(c, bx + f * 2 - 1, 112 - h, 3, 5, PAL.k); pxRect(c, bx + f * 2, 113 - h, 1, 4, '#f7e0d0'); }
            for (let p = 0; p < 5; p++) { const pa = p * 1.26; pxRect(c, bx + Math.cos(pa) * 3 - 1, 120 + Math.sin(pa) * 1.5, 2, 2, p % 2 ? '#ffb0e0' : '#9a5ac8'); }
          });
          c.globalAlpha = al;
          for (let i = 0; i < 18; i++) { const ang = G.t * 2 + i * 0.35, r = 20 + (i * 7) % 30; pxRect(c, x + Math.cos(ang) * r, 70 + (i * 13) % 50 + Math.sin(G.t * 3 + i) * 4, 2, 1 + (i % 2), i % 3 ? '#ffb0e0' : '#9a5ac8'); }
          c.globalAlpha = 1;
        });
        break;
      default:
        flourish = wait(1200);
    }
    await Promise.all([band, aura, flourish]);
    G.hero.squash = 0;
  },

  // --- Rubber: Gear 5 ---
  // Bajrang Gun: you leap up, inflate a fist the size of a house crackling with Conqueror's Haki,
  // and drive it down onto the foe; then the arm snaps back like rubber.
  bajrang: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const S = { x: 0, y: 0, r: 0, haki: 0, on: false };
    const dark = AW.dim(2400, '#1b1424', 0.35);
    const hand = () => ({ x: G.hero.x + G.hero.ox + 6, y: 98 + G.hero.oy });
    const stop = AW.layer(c => {
      if (!S.on) return;
      const h = hand(), wx = S.x - S.r - 4;
      AW.tube(c, h.x, h.y, (h.x + wx) / 2 - 14, Math.min(h.y, S.y) - 26, wx, S.y, 2.5, Math.max(3, S.r * 0.42), [PAL.k, '#dfe2ea', '#ffffff']);
      AW.fist(c, S.x, S.y, S.r);
      if (S.haki > 0.05) AW.haki(c, S.x, S.y, S.r, Math.round(1 + S.haki * 4));
    });
    Sfx.play('haki');
    floatText(hc.x, hc.y - 30, 'DOKUN', '#ffffff', 2);
    ringOut({ x: hc.x, y: hc.y - 6 }, '#ffffff', 4, 40, 300, 2);
    await tween(G.hero, { ox: -6, squash: 0.25 }, 240);
    // leap, and the fist inflates high above you
    Sfx.play('stretch');
    tween(G.hero, { ox: 2, oy: -26, squash: -0.15 }, 300, easeOut);
    S.on = true; S.x = G.hero.x - 28; S.y = VIEW.y + 46;
    AW.gather({ x: S.x, y: S.y }, ['#ffffff', '#ff3a3a', '#c9ccd6'], 700, 70);
    Sfx.play('charge');
    await fxRun(700, (c, k) => { S.r = 4 + 26 * AW.boing(k); S.haki = k; S.y = VIEW.y + 46 - k * 4; });
    // wind back...
    const p0 = { x: S.x, y: S.y };
    await fxRun(150, (c, k) => { S.x = p0.x - easeOut(k) * 10; S.y = p0.y - easeOut(k) * 8; });
    // ...and drive it down
    Sfx.play('boom');
    const q0 = { x: S.x, y: S.y }, q2 = { x: fc.x - S.r * 0.45, y: fc.y }, q1 = { x: lerp(q0.x, q2.x, 0.65), y: q0.y - 16 };
    AW.speed(520, '#ffffff', -1, VIEW.y + 10, 118, 18);
    await fxRun(190, (c, k) => {
      const e = easeIn(k), u = 1 - e;
      S.x = u * u * q0.x + 2 * u * e * q1.x + e * e * q2.x; S.y = u * u * q0.y + 2 * u * e * q1.y + e * e * q2.y;
    });
    m.hit(0);
    screenFlash('#ffffff', 1);
    focusLines(fc, '#ffffff', 500);
    impact(fc, ['#ffffff', '#ff3a3a', '#1b1424'], 24);
    ringOut(fc, '#ffffff', 8, 60, 520, 3); ringOut(fc, '#ff3a3a', 8, 86, 620, 2);
    AW.groundRing(fc.x, '#ffffff', 96, 620);
    groundCrack(fc.x, fc.x - 80, '#1b1424', 260); groundCrack(fc.x, fc.x + 80, '#1b1424', 260);
    const crackle = fxRun(520, (c, k) => { if (Math.random() < 0.7) AW.haki(c, fc.x, fc.y, 10 + k * 40, 3); });
    AW.debris(fc.x, 22);
    dust(fc.x - 20, 10); dust(fc.x + 20, 10);
    shake(14, 900);
    F.squash = 0.45;
    tween(F, { squash: 0 }, 500);
    floatText(fc.x, foeTop() - 16, 'BAJRANG GUN!!', '#ffffff', 2);
    // the fist grinds in, then the arm snaps back like rubber
    await fxRun(260, (c, k) => { S.x = q2.x + Math.sin(k * 40) * 2 * (1 - k); S.y = q2.y + Math.cos(k * 33) * 1.5 * (1 - k); });
    Sfx.play('stretch');
    const r0 = { x: S.x, y: S.y, r: S.r };
    await Promise.all([
      fxRun(240, (c, k) => { const e = easeIn(k), h = hand(); S.x = lerp(r0.x, h.x + 4, e); S.y = lerp(r0.y, h.y, e); S.r = lerp(r0.r, 3, e); S.haki = 1 - k; }),
      tween(G.hero, { ox: 0, oy: 0, squash: 0.2 }, 240, easeIn),
    ]);
    S.on = false;
    stop();
    dust(G.hero.x, 8);
    Sfx.play('bump');
    await tween(G.hero, { squash: 0 }, 160);
    await Promise.all([dark, crackle]);
  },
  // Toon Force: you laugh, slap the ground and it turns to rubber; the foe is flung around like a
  // cartoon, eyes popping out on springs, and bounces until it sees stars.
  toonforce: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const Wv = { x: hc.x, amp: 0 }, pop = { p: 0 };
    floatText(hc.x, hc.y - 30, 'HAHAHA', '#ffffff');
    Sfx.play('stretch');
    for (let i = 0; i < 2; i++) {
      await tween(G.hero, { oy: -8, squash: -0.18 }, 110, easeOut);
      await tween(G.hero, { oy: 0, squash: 0.22 }, 100, easeIn);
    }
    // the ground turns to rubber
    const ground = fxRun(2300, (c, k) => {
      c.globalAlpha = AW.env(k, 0.06, 0.15);
      for (let x = VIEW.x; x < VIEW.x + VIEW.w; x += 2) {
        const d = (x - Wv.x) / 13, bump = -Wv.amp * Math.exp(-d * d), wob = Math.sin(x * 0.15 + G.t * 16) * 1.5, y = 121 + bump + wob;
        pxRect(c, x, y - 1, 2, 1, PAL.k); pxRect(c, x, y, 2, 2, '#ffffff'); pxRect(c, x, y + 2, 2, 1, '#c9ccd6');
        pxRect(c, x, y + 7 + bump * 0.4 - wob * 0.5, 2, 1, '#ffe9a8');
      }
      c.globalAlpha = 1;
    });
    // slap!
    await tween(G.hero, { ox: 6, oy: 3, squash: 0.32 }, 90, easeIn);
    Sfx.play('boom');
    AW.pow({ x: hc.x + 14, y: 117 }, '#ffe14a', 8, 200);
    dust(hc.x + 10, 8);
    shake(3, 150);
    const home = tween(G.hero, { ox: 0, oy: 0, squash: 0 }, 260);
    // a rubber wave rolls across to the foe and flings it sky-high, eyes popping out on springs
    await fxRun(400, (c, k) => { Wv.x = lerp(hc.x + 12, fc.x, easeIn(k)); Wv.amp = 5 + k * 12; });
    m.hit(0);
    Sfx.play('stretch');
    floatText(fc.x, foeTop() - 14, 'BOING', '#ffe14a', 2);
    tween(Wv, { amp: 0 }, 400);
    tween(pop, { p: 1 }, 220, AW.boing);
    const eyes = fxRun(1500, c => {
      const p = pop.p * 14, ey = foeTop() + 6 + F.oy;
      if (p < 1) return;
      for (const dx of [-6, 6]) {
        const bx = fc.x + F.ox + dx * 0.5, x = fc.x + F.ox + dx * 1.4 + p * 0.5 + Math.sin(G.t * 25 + dx) * pop.p * 1.5, y = ey - p * 0.7;
        zigzag(c, bx, ey, x, y, 4, 1.5, PAL.k, 3); zigzag(c, bx, ey, x, y, 4, 1.5, '#ffffff', 1);
        pxCircle(c, x, y, 7, PAL.k); pxCircle(c, x, y, 6, '#ffffff'); pxCircle(c, x + 2, y, 2, PAL.k);
      }
    });
    F.squash = 0.4;
    await tween(F, { oy: -58, squash: -0.4 }, 280, easeOut);
    await tween(F, { squash: 0.1 }, 70);
    // ...and it bounces, smaller each time, denting the rubber ground
    const land = big => {
      Sfx.play(big ? 'boom' : 'bump');
      F.squash = big ? 0.55 : 0.4;
      AW.pow({ x: fc.x, y: 119 }, '#ffe14a', big ? 12 : 8, 220);
      dust(fc.x, big ? 14 : 8);
      shake(big ? 6 : 3, 180);
      Wv.x = fc.x; Wv.amp = big ? -6 : -3;
      tween(Wv, { amp: 0 }, 300);
    };
    await tween(F, { oy: 0, squash: -0.25 }, 220, easeIn);
    land(true);
    await wait(50);
    await tween(F, { oy: -26, squash: -0.3 }, 190, easeOut);
    await tween(F, { oy: 0, squash: -0.15 }, 170, easeIn);
    land(false);
    await tween(F, { oy: -9, squash: -0.15 }, 120, easeOut);
    await tween(F, { oy: 0, squash: 0 }, 110, easeIn);
    land(false);
    await tween(F, { squash: 0 }, 150);
    tween(pop, { p: 0 }, 220, easeIn);
    // stars circle its head
    const stars = fxRun(450, c => {
      for (let i = 0; i < 3; i++) { const a = G.t * 7 + i * 2.1; AW.twinkle(c, fc.x + Math.cos(a) * 13, foeTop() - 4 + Math.sin(a) * 3, 2, '#ffe14a'); }
    });
    await Promise.all([home, ground, eyes, stars]);
  },

  // --- Flame: Flame Emperor ---
  // Entei: fire spirals up out of your raised hand into a blazing sun overhead; you hurl it and it
  // detonates on the foe in a towering fireball that billows into smoke.
  entei: async m => {
    const F = G.battle.F, hc = heroC(), fc = fc0();
    const S = { x: hc.x + 8, y: VIEW.y + 56, r: 0, on: true, tail: [] };
    const heat = AW.dim(2700, '#3a0800', 0.35);
    const stop = AW.layer(c => {
      if (!S.on || S.r < 1) return;
      const { x, y, r } = S, last = S.tail[0];
      if (!last || Math.hypot(x - last.x, y - last.y) > 3) { S.tail.unshift({ x, y }); S.tail.length = Math.min(S.tail.length, 7); }
      for (let i = S.tail.length - 1; i >= 1; i--) { const p = S.tail[i], rr = r * (1 - i * 0.12); pxCircle(c, p.x, p.y, rr, '#ff5a2a'); pxCircle(c, p.x, p.y, rr * 0.6, '#ffb03a'); }
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2 + G.t * 2, l = r * (0.3 + 0.25 * Math.abs(Math.sin(G.t * 11 + i * 2.1)));
        pxLine(c, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, x + Math.cos(a + 0.18) * (r + l), y + Math.sin(a + 0.18) * (r + l), i % 2 ? '#ff5a2a' : '#ffb03a', Math.max(2, Math.round(r / 6)));
      }
      pxCircle(c, x, y, r + 1, '#a8200f'); pxCircle(c, x, y, r, '#ff5a2a'); pxCircle(c, x - r * 0.08, y - r * 0.08, r * 0.8, '#ff9a3a');
      pxCircle(c, x - r * 0.15, y - r * 0.15, r * 0.56, '#ffd04a'); pxCircle(c, x - r * 0.22, y - r * 0.22, r * 0.3, '#fff6c8');
    });
    Sfx.play('charge');
    await tween(G.hero, { oy: -4, squash: -0.12 }, 200);
    // fire spirals up out of your raised hand and swells into a sun; embers fly in to feed it
    shake(2, 900);
    await fxRun(950, (c, k) => {
      S.r = 3 + easeOut(k) * 23;
      const hx = G.hero.x + G.hero.ox + 6, hy = 90 + G.hero.oy;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 12; i++) {
        const t = (i / 12 + k * 2.2 + j / 3) % 1, y = lerp(hy, S.y + S.r * 0.6, t), x = hx + (S.x - hx) * t + Math.sin(t * 9 + j * 2.1 + G.t * 6) * 9 * (1 - t);
        pxRect(c, x - 1, y - 1, 3, 3, FIRE[(i + j) % 4]);
      }
      if (Math.random() < 0.7) {
        const a = Math.random() * Math.PI * 2, d = S.r + rand(20, 50);
        particles(S.x + Math.cos(a) * d, S.y + Math.sin(a) * d, 1, { colors: FIRE, speed: 90, grav: 0, dir: a + Math.PI, spread: 0.1, life: 0.35 });
      }
    });
    // hurl it
    Sfx.play('fire');
    await tween(G.hero, { ox: 8, oy: -2, squash: 0.18 }, 110, easeIn);
    const from = { x: S.x, y: S.y }, to = { x: fc.x, y: fc.y - 4 };
    tween(G.hero, { ox: 0, oy: 0, squash: 0 }, 320);
    await fxRun(400, (c, k) => {
      const e = easeIn(k);
      S.x = lerp(from.x, to.x, e); S.y = lerp(from.y, to.y, e) - Math.sin(k * Math.PI) * 12;
      c.globalAlpha = 0.35; AW.oval(c, S.x, 121, 22, 3, '#ffb03a'); c.globalAlpha = 1;
      particles(S.x + rand(-S.r, S.r), S.y + rand(-S.r, S.r), 1, { colors: FIRE, speed: 30, grav: -40, life: 0.4, size: 3 });
    });
    S.on = false;
    stop();
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffd04a', 1);
    AW.boom(to, 50, 1000, ['#5a1a1a', '#c0301a', '#ff5a2a', '#ffb03a', '#fff6c8']);
    focusLines(to, '#ffd04a', 420);
    ringOut(to, '#ffd04a', 10, 70, 500, 3); ringOut(to, '#ff5a2a', 10, 92, 650, 2);
    AW.groundRing(fc.x, '#ff9a3a', 100, 600);
    particles(to.x, to.y, 46, { colors: FIRE, speed: 170, grav: 60, size: 3 });
    shake(12, 800);
    F.squash = 0.4;
    tween(F, { squash: 0 }, 500);
    // embers drift down as the fireball billows into smoke
    await wait(450);
    for (let i = 0; i < 3; i++) particles(fc.x + rand(-50, 50), VIEW.y + 40, 6, { colors: FIRE, speed: 20, grav: 60, life: 1.0 });
    await wait(500);
    await heat;
  },
  // Firefly Swarm (Hotarubi, then Hidaruma): glowing fireflies drift out of you and settle around
  // the foe; at a snap of your fingers every one bursts into flame and the blaze engulfs it.
  fireflies: async m => {
    const F = G.battle.F, hc = heroC(), fc = fc0(), n = 32;
    const flies = Array.from({ length: n }, (_, i) => ({
      sx: hc.x + rand(-6, 6), sy: hc.y + rand(-14, 6), mx: hc.x + rand(-14, 50), my: rand(46, 96),
      a: i / n * Math.PI * 2, rr: rand(16, 30), ph: rand(0, 6), d: rand(0, 0.25),
    }));
    const st = { k: 0, lit: 0, rush: 0 };
    const at = f => {
      const k = AW.k01((st.k - f.d * 0.5) / 0.95), oa = f.a + G.t * 1.6;
      const ox = fc.x + Math.cos(oa) * f.rr, oy = fc.y - 4 + Math.sin(oa) * f.rr * 0.7;
      let x, y;
      if (k < 0.4) { const e = easeOut(k / 0.4); x = lerp(f.sx, f.mx, e); y = lerp(f.sy, f.my, e); }
      else { const e = AW.smooth((k - 0.4) / 0.6); x = lerp(f.mx, ox, e); y = lerp(f.my, oy, e); }
      x += Math.sin(G.t * 6 + f.ph) * 4 * (1 - st.rush); y += Math.cos(G.t * 5 + f.ph) * 3 * (1 - st.rush);
      const r = easeIn(st.rush);
      return { x: lerp(x, fc.x, r), y: lerp(y, fc.y, r) };
    };
    const swarm = AW.layer(c => {
      for (const f of flies) {
        const p = at(f), lit = AW.k01(st.lit * 1.6 - f.d * 2.4);
        if (lit > 0) { const r = 1.5 + lit * 3.5; pxCircle(c, p.x, p.y, r + 1, '#a8200f'); pxCircle(c, p.x, p.y, r, '#ff5a2a'); pxCircle(c, p.x, p.y - 1, r * 0.55, '#ffd04a'); continue; }
        const on = Math.sin(G.t * 12 + f.ph) > -0.3;
        if (on) { c.globalAlpha = 0.45; pxCircle(c, p.x, p.y, 4, '#fff3a0'); c.globalAlpha = 1; }
        pxRect(c, p.x - 1, p.y - 1, 4, 4, '#2a3a10');
        pxRect(c, p.x, p.y, 2, 2, on ? '#eaff7a' : '#7a9a2a');
        if (on) pxRect(c, p.x, p.y, 1, 1, '#ffffff');
      }
    });
    Sfx.play('charge');
    tween(G.hero, { squash: -0.12 }, 250);
    await fxRun(1250, (c, k) => { st.k = k; });
    // snap!
    Sfx.play('perfect');
    await tween(G.hero, { squash: 0.15 }, 70);
    tween(G.hero, { squash: 0 }, 200);
    floatText(fc.x, foeTop() - 14, 'HIDARUMA', '#ff9a3a');
    Sfx.play('fire');
    await tween(st, { lit: 1 }, 260);
    m.hit(0);
    screenFlash('#ffd04a', 0.5);
    for (let i = 0; i < 10; i++) ringOut(at(flies[i * 3]), '#ffd04a', 1, 10, 240, 1);
    shake(6, 400);
    await tween(st, { rush: 1 }, 200, easeIn);
    swarm();
    // the flames rush together into a blaze that swallows the foe
    impact(fc, FIRE, 16);
    F.squash = 0.3;
    tween(F, { squash: 0 }, 400);
    Sfx.play('fire');
    await fxRun(760, (c, k) => {
      const al = AW.env(k, 0.08, 0.45), up = easeOut(Math.min(1, k * 4));
      for (let i = 0; i < 9; i++) AW.flame(c, fc.x + (i - 4) * 5, 123, (72 - Math.abs(i - 4) * 11) * up * al + Math.sin(G.t * 22 + i) * 6 * al, 11, i * 1.7);
      if (Math.random() < 0.9) particles(fc.x + rand(-18, 18), fc.y + rand(-24, 10), 2, { colors: FIRE, speed: 30, grav: -90, life: 0.6 });
      if (k > 0.4 && Math.random() < 0.4) particles(fc.x + rand(-10, 10), fc.y - 30, 1, { colors: ['#5a5060', '#8a8090'], speed: 15, grav: -40, life: 0.7, size: 3 });
    });
    await wait(120);
  },

  // --- Frost: Ice Age Lord ---
  // Ice Time Capsule: you slap the ground, a sheet of ice races across the field throwing up spikes,
  // and a great crystal bursts up around the foe and seals it in.
  icecapsule: async m => {
    const fc = fc0(), hc = heroC(), top = foeTop() - 12, cw = 20, x0 = hc.x + 10;
    Sfx.play('ice');
    await tween(G.hero, { oy: 3, squash: 0.28 }, 150, easeIn);
    particles(x0, 118, 10, { colors: ICE, speed: 50, grav: -10, life: 0.5 });
    const spikes = Array.from({ length: 6 }, (_, i) => ({ x: lerp(x0 + 8, fc.x - cw - 6, i / 5), h: 7 + i * 3, lean: rand(-0.3, 0.3), t: i / 6 }));
    const sheet = fxRun(1800, (c, k) => {
      const reach = easeOut(Math.min(1, k * 2.6)), xe = lerp(x0, fc.x + cw + 12, reach);
      c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      pxRect(c, x0, 119, xe - x0, 4, '#8ad2ee'); pxRect(c, x0, 119, xe - x0, 1, '#ffffff'); pxRect(c, x0, 123, xe - x0, 1, AW.ICEK);
      for (const s of spikes) { const g = AW.boing(AW.k01((reach * 1.05 - s.t) * 4)); if (g > 0.02) AW.shard(c, s.x, 121, -Math.PI / 2 + s.lean, s.h * g, 3); }
      c.globalAlpha = 1;
    });
    tween(G.hero, { oy: 0, squash: 0 }, 220);
    await wait(360);
    // the crystal bursts up around the foe
    Sfx.play('ice');
    const C = { h: 0, crack: 0, glint: 0, a: 1 };
    const crystal = AW.layer(c => {
      AW.crystal(c, fc.x - cw - 8, 121, 7, (121 - top) * 0.45 * C.h, 0, C.glint, C.a);
      AW.crystal(c, fc.x + cw + 7, 121, 6, (121 - top) * 0.35 * C.h, 0, C.glint, C.a);
      AW.crystal(c, fc.x, 121, cw, (121 - top) * C.h, C.crack, C.glint, C.a);
    });
    await tween(C, { h: 1 }, 190, easeOut);
    m.hit(0);
    screenFlash('#bff2ff', 0.6);
    particles(fc.x, top + 10, 18, { colors: ICE, speed: 110, grav: 120 });
    AW.groundRing(fc.x, '#bff2ff', 60, 400);
    shake(6, 300);
    floatText(fc.x, top - 8, 'FROZEN', '#bff2ff');
    // a glint runs up the ice, then cracks spread and chunks break away
    await tween(C, { glint: 1 }, 380);
    Sfx.play('ice');
    await tween(C, { crack: 1 }, 260);
    Sfx.play('boom');
    for (let i = 0; i < 14; i++) particles(fc.x + rand(-cw, cw), lerp(top, 121, i / 13), 2, { colors: ['#bff2ff', '#ffffff', '#5fd3f0', '#8ad2ee'], speed: 110, grav: 220, size: 3, life: 0.7 });
    shake(5, 250);
    await tween(C, { a: 0 }, 200);
    crystal();
    await sheet;
  },
  // Frozen World: a blizzard freezes the whole battlefield, an ice pheasant swoops down on the foe,
  // ice explodes out of it in every direction, and then the frozen world shatters.
  frozenworld: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const flakes = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.6, 1.4), l: rand(3, 8) }));
    Sfx.play('ice');
    const world = fxRun(2700, (c, k) => {
      const al = AW.env(k, 0.2, 0.15), g = Math.min(1, k * 2), L = VIEW.x, T = VIEW.y, B = T + VIEW.h, R = L + VIEW.w;
      AW.tint(c, '#5fa8e0', 0.3 * al);
      c.globalAlpha = al;
      for (const f of flakes) { const x = L + ((f.x + G.t * 0.8 * f.s) % 1) * VIEW.w, y = T + ((f.y + G.t * 0.3 * f.s) % 1) * VIEW.h; pxRect(c, x - f.l, y, f.l, 1, '#bff2ff'); pxRect(c, x, y, 2, 2, '#ffffff'); }
      for (let i = 0; i < VIEW.w / 8; i++) {
        const x = L + i * 8, len = (5 + (i * 37) % 14) * g;
        if (len > 1) AW.tri(c, x, T, x + 7, T, x + 3.5, T + len * 1.5, i % 2 ? '#e8fbff' : '#bff2ff');
        pxRect(c, x, B - len * 0.7, 8, len * 0.7, i % 2 ? '#e8fbff' : '#ffffff');
      }
      for (let j = 0; j < VIEW.h / 8; j++) { const len = (4 + (j * 23) % 10) * g; pxRect(c, L, T + j * 8, len, 7, '#e8fbff'); pxRect(c, R - len, T + j * 8 + 3, len, 7, '#e8fbff'); }
      c.globalAlpha = 1;
    });
    // an ice pheasant takes shape in front of you...
    tween(G.hero, { oy: -4, squash: -0.12 }, 260);
    await wait(250);
    const P = { x: hc.x + 22, y: hc.y - 26, s: 0, flap: 0, on: true };
    const bird = AW.layer(c => { if (P.on) AW.pheasant(c, P.x, P.y, P.s, P.flap); });
    Sfx.play('charge');
    AW.gather({ x: P.x, y: P.y }, ['#ffffff', '#bff2ff', '#5fd3f0'], 480, 50);
    await fxRun(480, (c, k) => { P.s = AW.boing(k) * 1.4; P.flap = Math.sin(k * 14); });
    // ...and swoops down onto the foe
    Sfx.play('ice');
    tween(G.hero, { oy: 0, squash: 0 }, 300);
    const p0 = { x: P.x, y: P.y }, p1 = { x: (hc.x + fc.x) / 2, y: VIEW.y + 8 }, p2 = { x: fc.x - 4, y: fc.y };
    await fxRun(440, (c, k) => {
      const e = easeIn(k), u = 1 - e;
      P.x = u * u * p0.x + 2 * u * e * p1.x + e * e * p2.x; P.y = u * u * p0.y + 2 * u * e * p1.y + e * e * p2.y;
      P.flap = Math.sin(G.t * 26) * (1 - e) + 0.35 * e;
      if (Math.random() < 0.9) particles(P.x - 12, P.y, 2, { colors: ['#ffffff', '#bff2ff'], speed: 20, grav: 20, life: 0.5 });
    });
    P.on = false;
    bird();
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 1);
    focusLines(fc, '#bff2ff', 420);
    shake(11, 600);
    ringOut(fc, '#ffffff', 6, 60, 500, 3);
    AW.groundRing(fc.x, '#bff2ff', 100, 600);
    // ice explodes out of it in every direction and seals it in
    const spikes = Array.from({ length: 9 }, (_, i) => ({ a: -Math.PI + 0.2 + i / 8 * (Math.PI - 0.4), len: rand(30, 52) }));
    const C = { g: 0, a: 1 };
    const burst = AW.layer(c => {
      c.globalAlpha = C.a;
      for (const s of spikes) AW.shard(c, fc.x + Math.cos(s.a) * 6, 121 + Math.sin(s.a) * 2, s.a, s.len * C.g, 5);
      c.globalAlpha = 1;
      AW.crystal(c, fc.x, 121, 18, (131 - foeTop()) * C.g, 0, 0, C.a);
    });
    await tween(C, { g: 1 }, 160, easeOut);
    particles(fc.x, fc.y, 30, { colors: ICE, speed: 140, grav: 160, size: 3 });
    F.squash = -0.1;
    await wait(600);
    // the frozen world shatters
    Sfx.play('ice'); Sfx.play('boom');
    screenFlash('#e8fbff', 0.6);
    for (const s of spikes) { const d = s.len * 0.6; particles(fc.x + Math.cos(s.a) * d, 121 + Math.sin(s.a) * d, 4, { colors: ['#e8fbff', '#7cc8ea', '#ffffff', AW.ICEK], speed: 90, grav: 240, size: 3, life: 0.8 }); }
    shake(6, 300);
    tween(F, { squash: 0 }, 200);
    await tween(C, { a: 0 }, 220);
    burst();
    await world;
  },

  // --- Quake: World Shaker ---
  // Sky Crack: a quake bubble swells on your fist, you punch the empty air and it cracks like glass;
  // the crack splits all the way to the foe, the shockwave hits, and the broken sky falls away.
  skycrack: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC(), P = { x: hc.x + 32, y: hc.y - 8 };
    const cracks = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + rand(-0.25, 0.25) + 0.2, L = rand(38, 64), main = AW.jag(P.x, P.y, P.x + Math.cos(a) * L, P.y + Math.sin(a) * L, 4, 4);
      cracks.push({ P: main, d: rand(0, 0.15), main: true });
      const [bx, by] = main[2], b = a + (i % 2 ? 0.8 : -0.8);
      cracks.push({ P: AW.jag(bx, by, bx + Math.cos(b) * 16, by + Math.sin(b) * 16, 2, 2), d: 0.35 + rand(0, 0.1) });
    }
    cracks.push({ P: AW.jag(P.x, P.y, fc.x - 8, fc.y, 6, 5), d: 0, main: true });
    const mains = cracks.filter(r => r.main).slice(0, 8);
    const C = { t: 0, fall: 0 }, orb = { r: 0 };
    const fist = AW.layer(c => { if (orb.r > 0.5) { const h = heroHand(); AW.quakeOrb(c, h.x + 3, h.y - 4, orb.r); } });
    Sfx.play('charge');
    tween(orb, { r: 9 }, 320, easeOut);
    await tween(G.hero, { ox: -6, squash: 0.18 }, 320);
    await tween(G.hero, { ox: 16, squash: -0.12 }, 100, easeIn);
    orb.r = 0;
    fist();
    // the air cracks like glass
    Sfx.play('boom'); Sfx.play('crit');
    hitStop(70);
    screenFlash('#ffffff', 0.7);
    shake(8, 900);
    const crack = fxRun(1700, c => {
      const al = 1 - C.fall, dy = C.fall * C.fall * 26;
      if (al <= 0) return;
      if (C.t < 0.5) { c.globalAlpha = al * (1 - C.t * 2) * 0.8; pxCircle(c, P.x, P.y, 6 + C.t * 20, '#ffffff'); }
      // pale panes of broken glass between the main cracks
      c.globalAlpha = al * 0.22 * AW.k01(C.t * 3);
      for (let i = 0; i < mains.length; i++) {
        const a = mains[i].P[1], b = mains[(i + 1) % mains.length].P[1];
        AW.tri(c, P.x, P.y + dy, a[0], a[1] + dy, b[0], b[1] + dy, i % 2 ? '#ffffff' : '#bfe6ff');
      }
      c.globalAlpha = al;
      for (const r of cracks) {
        const e = AW.k01((C.t - r.d) * 2.2);
        if (e <= 0) continue;
        AW.poly(c, r.P, e, PAL.k, r.main ? 4 : 3, 0, dy); AW.poly(c, r.P, e, '#ffffff', r.main ? 2 : 1, 0, dy); AW.poly(c, r.P, e, '#bfe6ff', 1, 1, dy + 1);
      }
      c.globalAlpha = 1;
    });
    await tween(C, { t: 0.7 }, 300, easeOut);
    // the crack reaches the foe and the shockwave hits
    const dist = Math.hypot(fc.x - P.x, fc.y - P.y), ang = Math.atan2(fc.y - P.y, fc.x - P.x);
    const wave = fxRun(240, (c, k) => {
      for (let i = 0; i < 3; i++) {
        const r = lerp(8, dist, easeIn(k)) - i * 7;
        if (r < 4) continue;
        for (let s = -6; s <= 6; s++) { const a = ang + s * 0.09; pxRect(c, P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 2, 2, i ? '#bfe6ff' : '#ffffff'); }
      }
    });
    tween(C, { t: 1.2 }, 300);
    await wave;
    m.hit(0);
    impact(fc, ['#ffffff', '#bfe6ff', '#9aa4b1'], 18);
    focusLines(fc, '#ffffff', 300);
    ringOut(fc, '#ffffff', 6, 46, 400, 2);
    shake(10, 500);
    F.squash = 0.3;
    tween(F, { squash: 0 }, 300);
    await wait(200);
    // the broken sky falls away in shards
    Sfx.play('ice');
    for (const r of cracks) { const [x, y] = r.P[r.P.length - 1]; particles(x, y, 2, { colors: ['#ffffff', '#bfe6ff', '#9aa4b1'], speed: 40, grav: 260, size: 3, life: 0.8 }); }
    await Promise.all([tween(C, { fall: 1 }, 420, easeIn), back(260)]);
    await crack;
  },
  // Island Shaker: you seize the air and wrench it down; the horizon cracks from end to end and the
  // sea rears up into a tsunami that comes crashing down on the foe.
  islandshaker: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const dark = AW.dim(2600, '#0a1020', 0.35);
    Sfx.play('charge');
    const orb = { r: 0 };
    const fists = AW.layer(c => {
      if (orb.r < 0.5) return;
      const x = G.hero.x + G.hero.ox, y = 96 + G.hero.oy;
      AW.quakeOrb(c, x + 12, y - 6, orb.r); AW.quakeOrb(c, x - 8, y - 8, orb.r * 0.8);
    });
    tween(orb, { r: 8 }, 350, easeOut);
    await tween(G.hero, { oy: -10, squash: -0.15 }, 350, easeOut);
    // you wrench the air down: the horizon cracks from end to end
    await tween(G.hero, { ox: 6, oy: 2, squash: 0.28 }, 110, easeIn);
    orb.r = 0;
    fists();
    Sfx.play('boom');
    screenFlash('#ffffff', 0.8);
    shake(7, 1900);
    const sky = [VIEW.x, VIEW.x + VIEW.w].map(ex => AW.jag(hc.x + 10, 66, ex, 66 + rand(-6, 6), 12, 4));
    const hz = fxRun(2100, (c, k) => {
      const e = easeOut(Math.min(1, k * 4));
      c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      for (const P of sky) { AW.poly(c, P, e, PAL.k, 3); AW.poly(c, P, e, '#ffffff', 1); }
      c.globalAlpha = 1;
    });
    AW.debris(hc.x + 10, 10);
    dust(hc.x, 10);
    tween(G.hero, { ox: 0, oy: 0, squash: 0 }, 300);
    // the sea rears up behind the foe into a tsunami...
    Sfx.play('splash');
    const T = { h: 0, crash: 0, a: 1 };
    const wave = AW.layer(c => {
      if (T.h <= 0.01 || T.a <= 0) return;
      const px = lerp(fc.x + 36, fc.x + 14, T.crash), H = 150 * T.h * (1 - 0.55 * T.crash * T.crash);
      c.globalAlpha = T.a;
      for (let x = Math.round(px - 50); x < VIEW.x + VIEW.w; x += 2) {
        const d = (x - px) / 30, sh = d < 0 ? Math.exp(-d * d * 2.2) : 1 - 0.35 * Math.min(1, d / 3);
        const top = 121 - H * sh + Math.sin(x * 0.2 + G.t * 9) * 2 * T.h, hh = 121 - top;
        if (hh < 2) continue;
        pxRect(c, x, top, 2, hh, '#1f5aa8');
        pxRect(c, x, top + hh * 0.12, 2, hh * 0.28, '#2f7fd0');
        if ((x >> 1) % 5 === 0) pxRect(c, x, top + 8, 1, hh * 0.6, '#4a9ae8');
        pxRect(c, x, top, 2, 3, '#bfe6ff'); pxRect(c, x, top, 2, 1, '#ffffff');
      }
      // the crest curls over at the top, and reaches out over the foe as it breaks
      const rr = (14 + 26 * T.crash) * T.h, cx = px - 6 - 10 * T.crash, cy = 121 - H + rr;
      for (let i = 0; i <= 12; i++) {
        const th = -Math.PI / 2 - i / 12 * (2.3 + 0.5 * T.crash), x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr, r = 6 + 3 * T.crash - i * 0.4;
        pxCircle(c, x, y, r + 1, '#1f5aa8'); pxCircle(c, x, y, r, '#2f7fd0'); pxCircle(c, x - 1, y - 1, Math.max(1, r * 0.5), '#ffffff');
      }
      c.globalAlpha = 1;
      if (Math.random() < 0.6) particles(px + rand(-10, 30), 121 - H, 1, { colors: ['#ffffff', '#bfe6ff'], speed: 50, grav: 120, life: 0.6 });
    });
    await tween(T, { h: 1 }, 650, easeOut);
    // ...and comes crashing down on it
    Sfx.play('splash');
    await tween(T, { crash: 1 }, 250, easeIn);
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#bfe6ff', 0.8);
    focusLines(fc, '#ffffff', 350);
    particles(fc.x, fc.y, 50, { colors: ['#ffffff', '#bfe6ff', '#4fa3e0', '#2f7fd0'], speed: 180, grav: 240, dir: -Math.PI / 2, spread: 2.4, size: 3 });
    AW.groundRing(fc.x, '#ffffff', 120, 700);
    shake(14, 800);
    F.squash = 0.45;
    tween(F, { squash: 0 }, 500);
    // the water surges across the ground and drains away
    await tween(T, { h: 0.12, a: 0 }, 650);
    wave();
    await Promise.all([dark, hz]);
  },

  // --- Smoke: Smoke Leviathan ---
  // White Leviathan: your body dissolves into smoke that rears up as a colossal serpent; it arcs
  // over the battlefield, dives jaws-first onto the foe, coils around it and drifts apart.
  smokeserpent: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const pts = [{ x: hc.x, y: hc.y + 6 }, { x: hc.x - 16, y: 64 }, { x: hc.x - 2, y: VIEW.y + 26 }, { x: hc.x + 46, y: VIEW.y + 6 }, { x: fc.x - 8, y: VIEW.y + 20 }, { x: fc.x - 6, y: 54 }, { x: fc.x, y: fc.y }];
    const path = t => AW.spline(pts, t);
    const S = { head: 0, open: 0.2, a: 1 };
    const serpent = AW.layer(c => {
      if (S.a <= 0 || S.head <= 0.01) return;
      c.globalAlpha = S.a;
      const N = 30;
      for (let i = N; i >= 1; i--) {
        const t = S.head - i * 0.022;
        if (t < 0) continue;
        const p = path(t), w = Math.sin(i * 1.3 + G.t * 6) * 1.5;
        AW.puff(c, p.x + w, p.y - w * 0.5, 2.5 + 8 * Math.pow(1 - i / N, 0.7), AW.SMOKE);
      }
      // the head: jaws that open along the direction it travels
      const h = path(S.head), b = path(Math.max(0, S.head - 0.015));
      let ux = h.x - b.x, uy = h.y - b.y;
      const L = Math.hypot(ux, uy);
      if (L < 0.01) { ux = 1; uy = 0; } else { ux /= L; uy /= L; }
      const upx = ux >= 0 ? uy : -uy, upy = ux >= 0 ? -ux : ux, o = S.open * 0.5, co = Math.cos(o), so = Math.sin(o);
      const du = [ux * co + upx * so, uy * co + upy * so], dl = [ux * co - upx * so, uy * co - upy * so];
      if (S.open > 0.15) AW.tri(c, h.x, h.y, h.x + du[0] * 28, h.y + du[1] * 28, h.x + dl[0] * 28, h.y + dl[1] * 28, '#4a4f5e');
      for (let j = 5; j >= 1; j--) AW.puff(c, h.x + dl[0] * j * 5, h.y + dl[1] * j * 5, 7 - j * 0.7, AW.SMOKE);
      AW.puff(c, h.x - ux * 4, h.y - uy * 4, 14, AW.SMOKE);
      for (let j = 5; j >= 1; j--) AW.puff(c, h.x + du[0] * j * 5.5 + upx, h.y + du[1] * j * 5.5 + upy, 9 - j * 0.8, AW.SMOKE);
      if (S.open > 0.3) {
        for (const d of [11, 18]) {
          const fx = h.x + du[0] * d - upx * 4, fy = h.y + du[1] * d - upy * 4;
          AW.tri(c, fx - ux * 2, fy - uy * 2, fx + ux * 2, fy + uy * 2, fx - upx * 6, fy - upy * 6, '#ffffff');
        }
      }
      const ex = h.x + upx * 7 + ux * 4, ey = h.y + upy * 7 + uy * 4;
      pxRect(c, ex - 3, ey - 1, 6, 3, '#1b1424'); pxRect(c, ex - 1, ey, 3, 1, '#ff5a5a');
      pxLine(c, ex - 4, ey - 3, ex + 3, ey - 1, '#7a7f8e', 1);
      c.globalAlpha = 1;
      if (Math.random() < 0.5) particles(h.x - ux * 12, h.y - uy * 12, 1, { colors: AW.SMOKE, speed: 15, grav: -20, life: 0.5, size: 3 });
    });
    // you dissolve into smoke
    Sfx.play('fire');
    const melt = fxRun(700, (c, k) => {
      const x = G.hero.x + G.hero.ox;
      c.globalAlpha = 0.85;
      for (let i = 0; i < 10; i++) { const a = G.t * 6 + i * 0.63, r = 14 - k * 6; AW.puff(c, x + Math.cos(a) * r, 112 - k * 18 + Math.sin(a) * r * 0.5, 4, AW.SMOKE); }
      c.globalAlpha = 1;
    });
    await tween(G.hero, { alpha: 0.35, squash: 0.1 }, 400);
    // the serpent rears up out of you and arcs over the battlefield
    Sfx.play('charge');
    await tween(S, { head: 0.74 }, 1000, AW.smooth);
    // then dives jaws-first onto the foe
    Sfx.play('boom');
    tween(S, { open: 1 }, 160);
    await tween(S, { head: 1 }, 230, easeIn);
    await tween(S, { open: 0 }, 70, easeIn);
    m.hit(0);
    screenFlash('#ffffff', 0.7);
    impact(fc, ['#ffffff', '#c9ccd6'], 18);
    focusLines(fc, '#ffffff', 300);
    shake(9, 500);
    F.squash = 0.35;
    tween(F, { squash: 0 }, 400);
    // its coils wrap around the foe, then the whole serpent drifts apart
    const coil = fxRun(700, (c, k) => {
      const al = AW.env(k, 0.1, 0.5);
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 10; i++) {
        const a = G.t * 5 * (ring % 2 ? -1 : 1) + i * 0.63, r = 22 - ring * 3 - k * 4;
        c.globalAlpha = (Math.sin(a) > 0 ? 0.95 : 0.4) * al;
        AW.puff(c, fc.x + Math.cos(a) * r, fc.y + 14 - ring * 13 + Math.sin(a) * 4, 4.5, AW.SMOKE);
      }
      c.globalAlpha = 1;
    });
    await wait(150);
    await Promise.all([tween(S, { a: 0 }, 450), tween(G.hero, { alpha: 1, squash: 0 }, 450)]);
    serpent();
    particles(fc.x, fc.y - 10, 20, { colors: AW.SMOKE, speed: 40, grav: -30, size: 3, life: 0.8 });
    await Promise.all([coil, melt]);
  },
  // Smoke Prison: smoke rolls along the ground from your hand, spirals up into a cage around the foe,
  // and crushes in when you clench your fist.
  smokeprison: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC(), x0 = hc.x + 16;
    Sfx.play('fire');
    await tween(G.hero, { ox: 6, squash: -0.1 }, 140, easeIn);
    // a stream of smoke rolls along the ground to the foe
    await fxRun(340, (c, k) => {
      const xe = lerp(x0, fc.x - 8, easeOut(k));
      for (let x = x0; x < xe; x += 5) AW.puff(c, x, 117 - Math.sin(x * 0.2 + G.t * 8) * 1.5, 2.5 + 2.5 * (x - x0) / (fc.x - x0) + Math.sin(x * 0.4 + G.t * 10), AW.SMOKE);
    });
    // it spirals up around the foe into a cage
    const S = { r: 34, h: 0, a: 1 };
    const cage = fxRun(1500, c => {
      for (let i = 0; i < 34; i++) {
        const t = i / 34, ang = G.t * 6 + t * Math.PI * 7, rr = S.r * (1 - t * 0.3);
        c.globalAlpha = (Math.sin(ang) > 0 ? 0.95 : 0.4) * S.a;
        AW.puff(c, fc.x + Math.cos(ang) * rr, 118 - t * 70 * S.h + Math.sin(ang) * 4, 5 + (1 - t) * 3, AW.SMOKE);
      }
      c.globalAlpha = 1;
    });
    tween(G.hero, { ox: 0, squash: 0 }, 220);
    await tween(S, { h: 1, r: 26 }, 450, easeOut);
    // you clench your fist and it crushes in
    Sfx.play('stretch');
    await tween(G.hero, { squash: 0.22 }, 90);
    await tween(S, { r: 11 }, 110, easeIn);
    m.hit(0);
    F.squash = -0.3;
    impact(fc, ['#ffffff', '#c9ccd6'], 14);
    particles(fc.x, fc.y, 14, { colors: AW.SMOKE, speed: 70, grav: -20, size: 3 });
    shake(6, 300);
    await wait(320);
    // then lets go and drifts away
    tween(F, { squash: 0 }, 300);
    tween(G.hero, { squash: 0 }, 200);
    await tween(S, { r: 32, a: 0, h: 1.3 }, 450, easeOut);
    await cage;
  },

  // --- Light: Speed of Light ---
  // Sacred Yasakani: you rise and gather light into a blazing orb, then unleash a storm of light
  // beads; each that lands explodes in a flash, and stray shots blast the ground around the foe.
  yasakani: async m => {
    const fc = fc0(), hc = heroC(), O = { x: hc.x + 16, y: hc.y - 18, r: 0 };
    Sfx.play('charge');
    tween(G.hero, { oy: -8, squash: -0.1 }, 300);
    const orb = AW.layer(c => {
      if (O.r < 0.5) return;
      O.x = G.hero.x + G.hero.ox + 16; O.y = 103 + G.hero.oy - 16;
      const r = O.r + Math.sin(G.t * 40) * 0.8, x = O.x, y = O.y;
      c.globalAlpha = 0.35; pxCircle(c, x, y, r + 5, '#fff3a0'); c.globalAlpha = 1;
      pxRect(c, x - r * 3.5, y, r * 7, 1, '#fff6c8'); pxRect(c, x, y - r * 2.5, 1, r * 5, '#fff6c8');
      pxCircle(c, x, y, r + 1, '#ffd04a'); pxCircle(c, x, y, r - 1, '#fff6c8'); pxCircle(c, x, y, Math.max(1, r - 3), '#ffffff');
    });
    AW.gather({ x: hc.x + 16, y: hc.y - 24 }, ['#ffffff', '#fff3a0', '#ffd04a'], 460, 48);
    await tween(O, { r: 6 }, 460, easeOut);
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('zap');
      const tx = fc.x + rand(-14, 14), ty = fc.y + rand(-16, 12);
      AW.bead(O, { x: tx, y: ty }, 90);
      if (i % 2 === 0) { const gx = fc.x + rand(-44, 44); AW.bead(O, { x: gx, y: 119 }, 110).then(() => { AW.flash({ x: gx, y: 116 }, 7); dust(gx, 3); }); }
      O.r = 4.5;
      tween(O, { r: 6 }, 80);
      await wait(90);
      m.hit(i);
      AW.flash({ x: tx, y: ty }, 9);
      await wait(45);
    }
    // the last of it blooms into one great flash
    Sfx.play('boom');
    screenFlash('#fff6c8', 0.6);
    AW.flash(fc, 22);
    rays(fc, '#fff3a0', 12, 50, 400);
    shake(6, 400);
    await tween(O, { r: 0 }, 160);
    orb();
    await tween(G.hero, { oy: 0, squash: 0 }, 220);
  },
  // Ama no Murakumo: a sword of light grows from your hands; you cross the field at the speed of
  // light, sweep a huge arc through the foe, and a heartbeat later the cut erupts into light.
  lightsword: async m => {
    const F = G.battle.F, fc = fc0();
    const piv = () => ({ x: G.hero.x + G.hero.ox + 9, y: 98 + G.hero.oy });
    const B = { a: -Math.PI / 2 - 0.25, len: 0, al: 1 };
    const sword = AW.layer(c => {
      if (B.len < 1 || B.al <= 0) return;
      const p = piv(), ex = p.x + Math.cos(B.a) * B.len, ey = p.y + Math.sin(B.a) * B.len, nx = -Math.sin(B.a), ny = Math.cos(B.a);
      c.globalAlpha = 0.35 * B.al; pxLine(c, p.x, p.y, ex, ey, '#fff3a0', 9);
      c.globalAlpha = B.al;
      pxLine(c, p.x, p.y, ex, ey, '#ffd04a', 5); pxLine(c, p.x, p.y, ex, ey, '#fff6c8', 3); pxLine(c, p.x, p.y, ex, ey, '#ffffff', 1);
      pxLine(c, p.x + nx * 6, p.y + ny * 6, p.x - nx * 6, p.y - ny * 6, '#e6b422', 3);
      pxRect(c, ex - 1, ey - 1, 3, 3, '#ffffff');
      if (Math.random() < 0.6) { const t = Math.random(); AW.twinkle(c, lerp(p.x, ex, t) + nx * rand(-6, 6), lerp(p.y, ey, t) + ny * rand(-6, 6), 2, '#fff6c8'); }
      c.globalAlpha = 1;
    });
    hold(true);
    Sfx.play('charge');
    tween(G.hero, { oy: -2, squash: -0.12 }, 300);
    AW.gather(piv(), ['#ffffff', '#fff3a0', '#ffd04a'], 520, 46);
    await tween(B, { len: 64 }, 540, easeOut);
    // a glint runs up the blade
    await fxRun(160, (c, k) => { const p = piv(); AW.twinkle(c, p.x + Math.cos(B.a) * B.len * k, p.y + Math.sin(B.a) * B.len * k, 4, '#ffffff'); });
    // you cross the field at the speed of light
    Sfx.play('zap');
    const sx = G.hero.x + G.hero.ox;
    screenFlash('#fffbe0', 0.4);
    const streak = { w: 6 };
    const beam = fxRun(320, c => {
      const ex = G.hero.x + G.hero.ox, w = Math.round(streak.w);
      if (w < 1) return;
      pxRect(c, sx, 104 - w, ex - sx, w * 2, '#fff3a0'); pxRect(c, sx, 104 - Math.ceil(w / 2), ex - sx, Math.max(1, w), '#ffffff');
    });
    tween(streak, { w: 0 }, 320);
    await tween(G.hero, { ox: 50, oy: 0, squash: 0 }, 80, easeIn);
    // one huge sweep through the foe
    Sfx.play('slash');
    const p = piv(), a1 = 0.9;
    arcSweep(p.x, p.y, 64, B.a, a1, '#ffd04a', 300, 6);
    arcSweep(p.x, p.y, 57, B.a, a1, '#fff6c8', 300, 4);
    arcSweep(p.x, p.y, 50, B.a, a1, '#ffffff', 300, 2);
    tween(G.hero, { ox: 56, squash: 0.12 }, 160);
    await tween(B, { a: a1 }, 150, easeIn);
    // stillness... then the cut erupts
    const dir = 0.75, ux = Math.cos(dir), uy = Math.sin(dir);
    await fxRun(260, c => pxLine(c, fc.x - ux * 34, fc.y - uy * 34, fc.x + ux * 34, fc.y + uy * 34, '#ffffff', 1));
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#fffbe0', 1);
    fxRun(560, (c, k) => {
      const w = 2 + 16 * easeOut(Math.min(1, k * 4)) * (1 - k), L = 220;
      const x0 = fc.x - ux * L, y0 = fc.y - uy * L, x1 = fc.x + ux * L, y1 = fc.y + uy * L;
      c.globalAlpha = 0.5; pxLine(c, x0, y0, x1, y1, '#ffd04a', Math.round(w + 6)); c.globalAlpha = 1;
      pxLine(c, x0, y0, x1, y1, '#fff6c8', Math.round(w)); pxLine(c, x0, y0, x1, y1, '#ffffff', Math.max(1, Math.round(w * 0.4)));
    });
    focusLines(fc, '#fff3a0', 420);
    particles(fc.x, fc.y, 36, { colors: ['#ffffff', '#fff3a0', '#ffd04a'], speed: 150 });
    shake(10, 500);
    F.squash = 0.3;
    tween(F, { squash: 0 }, 400);
    // the blade dissolves into motes of light and you flash back home
    const pp = piv();
    for (let i = 0; i < 10; i++) { const t = i / 9; particles(pp.x + Math.cos(B.a) * B.len * t, pp.y + Math.sin(B.a) * B.len * t, 1, { colors: ['#fff6c8', '#ffffff'], speed: 20, grav: -30, life: 0.6 }); }
    await tween(B, { al: 0 }, 300);
    sword();
    hold(false);
    await Promise.all([back(200), beam]);
  },

  // --- Dough: Awakened Dough ---
  // Dough World: you press a palm to the ground and the whole field turns to mochi; two great waves
  // of it rise on either side of the foe and clap shut over it, then it all sinks back down.
  doughworld: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC(), [hi, body, sh, K] = AW.DOUGH;
    const Gd = { l: hc.x + 8, r: hc.x + 8, a: 1 };
    const bubbles = Array.from({ length: 10 }, (_, i) => ({ x: VIEW.x + 20 + i * 27 + rand(-6, 6), ph: Math.random() }));
    Sfx.play('stretch');
    await tween(G.hero, { oy: 3, squash: 0.25 }, 150, easeIn);
    const field = AW.layer(c => {
      c.globalAlpha = Gd.a;
      for (let x = Math.round(Gd.l); x < Gd.r; x += 2) {
        const top = 114 + Math.sin(x * 0.18 + G.t * 7) * 1.5;
        pxRect(c, x, top - 1, 2, 1, K); pxRect(c, x, top, 2, VIEW.y + VIEW.h - top, body); pxRect(c, x, top, 2, 1, hi);
        if ((x >> 1) % 7 === 0) pxRect(c, x, top + 4, 2, 2, sh);
      }
      for (const b of bubbles) {
        if (b.x < Gd.l || b.x > Gd.r) continue;
        const r = Math.sin(((b.ph + G.t * 0.9) % 1) * Math.PI) * 3.5;
        if (r > 0.8) { pxCircle(c, b.x, 116 - r, r + 1, K); pxCircle(c, b.x, 116 - r, r, hi); }
      }
      c.globalAlpha = 1;
    });
    tween(Gd, { l: VIEW.x, r: VIEW.x + VIEW.w }, 500, easeOut);
    tween(G.hero, { oy: 0, squash: 0 }, 250);
    await wait(420);
    // two great mochi waves rise beside the foe...
    Sfx.play('stretch');
    const Wv = { h: 0, close: 0 };
    const wave = (c, side) => {
      const bx = fc.x + side * 36, h = Wv.h * 62;
      if (h < 3) return;
      const rows = [];
      for (let j = 0; j <= h; j += 2) { const t = j / h; rows.push([bx - side * Wv.close * 34 * t * t, 116 - j, 11 * (1 - t * 0.35)]); }
      for (const [cx, y, w] of rows) pxRect(c, cx - w - 1, y - 2, w * 2 + 2, 3, K);
      for (const [cx, y, w] of rows) { pxRect(c, cx - w, y - 2, w * 2, 3, body); pxRect(c, cx - w + 1, y - 2, 2, 3, hi); pxRect(c, cx + w * 0.35, y - 2, w * 0.65, 3, sh); }
      const [tx, ty] = rows[rows.length - 1];
      pxCircle(c, tx, ty - 2, 9, K); pxCircle(c, tx, ty - 2, 8, body); pxCircle(c, tx - 2, ty - 5, 3, hi);
    };
    const waves = AW.layer(c => { wave(c, -1); wave(c, 1); });
    await tween(Wv, { h: 1 }, 380, AW.boing);
    // ...and clap shut over it
    Sfx.play('boom');
    await tween(Wv, { close: 1 }, 150, easeIn);
    waves();
    m.hit(0);
    F.squash = -0.3;
    shake(8, 500);
    AW.pow({ x: fc.x, y: 54 }, '#fffaf0', 12, 260);
    particles(fc.x, 60, 24, { colors: [body, hi, sh], speed: 110, grav: 200, size: 3 });
    // the foe is stuck fast in a wobbling blob of mochi, which slowly sinks back into the ground
    await fxRun(700, (c, k) => {
      const e = easeIn(AW.k01((k - 0.35) / 0.65)), jig = Math.sin(k * 32) * 3 * (1 - k), ry = lerp(36, 3, e), rx = 26 + jig + e * 8, cy = 120 - ry;
      AW.oval(c, fc.x, cy, rx + 1, ry + 1, K); AW.oval(c, fc.x, cy, rx, ry, body);
      AW.oval(c, fc.x + rx * 0.2, cy + ry * 0.35, rx * 0.7, ry * 0.5, sh); AW.oval(c, fc.x - rx * 0.4, cy - ry * 0.5, rx * 0.25, ry * 0.2, hi);
      if (cy - ry > fc.y + 2 && e < 0.92) for (const dx of [-8, 3, 10]) { pxLine(c, fc.x + dx, fc.y, fc.x + dx * 1.3, cy - ry + 2, K, 3); pxLine(c, fc.x + dx, fc.y, fc.x + dx * 1.3, cy - ry + 2, body, 1); }
    });
    tween(F, { squash: 0 }, 300);
    await tween(Gd, { a: 0 }, 250);
    field();
  },
  // Heavenly Pestle: your arm stretches into the sky as dough and forms a giant mochi mallet; it
  // rises, pounds the foe into the ground with a mighty PETTAN, and lifts away in sticky strands.
  pestle: async m => {
    const F = G.battle.F, fc = fc0(), top = foeTop(), [hi, body, sh, K] = AW.DOUGH;
    const hand = () => ({ x: G.hero.x + G.hero.ox + 6, y: 92 + G.hero.oy });
    const M = { x: fc.x, y: VIEW.y + 60, s: 0.15, on: true };
    const layer = AW.layer(c => {
      if (!M.on) return;
      const h = hand(), ax = M.x - 4, ay = M.y - 14 * M.s;
      AW.tube(c, h.x, h.y, lerp(h.x, ax, 0.4), Math.min(h.y, ay) - 40, ax, ay, 2.5, 4.5, [K, body, hi]);
      AW.mallet(c, M.x, M.y, M.s);
    });
    Sfx.play('charge');
    await tween(G.hero, { oy: -4, squash: -0.15 }, 200);
    // the dough arm stretches into the sky and a giant mochi mallet takes shape
    Sfx.play('stretch');
    await tween(M, { y: VIEW.y + 46, s: 1 }, 520, AW.boing);
    // it rises higher...
    await tween(M, { y: VIEW.y + 32 }, 260, easeOut);
    // ...and comes down
    Sfx.play('boom');
    const yHit = top - 6;
    const smear = fxRun(170, c => {
      c.globalAlpha = 0.6;
      for (let i = 0; i < 7; i++) { const x = M.x - 24 + i * 8; pxRect(c, x, M.y - 14 - 30 + (i % 3) * 6, 1, 26, '#ffffff'); }
      c.globalAlpha = 1;
    });
    await tween(M, { y: yHit }, 170, easeIn);
    m.hit(0);
    F.squash = 0.55;
    screenFlash('#ffffff', 0.9);
    shake(14, 700);
    focusLines(fc, '#fffaf0', 350);
    AW.groundRing(fc.x, body, 100, 600);
    ringOut({ x: fc.x, y: 120 }, hi, 6, 50, 400, 2);
    dust(fc.x - 20, 12); dust(fc.x + 20, 12);
    AW.debris(fc.x, 12, [body, sh, hi]);
    floatText(fc.x, top - 34, 'PETTAN!!', '#fffaf0', 2);
    const splat = fxRun(900, (c, k) => {
      const e = easeOut(Math.min(1, k * 4)), rx = 10 + e * 34;
      c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      AW.oval(c, fc.x, 121, rx + 1, 3 + e * 3, K); AW.oval(c, fc.x, 121, rx, 2 + e * 3, body); AW.oval(c, fc.x - 6, 120, rx * 0.5, 1.5, hi);
      c.globalAlpha = 1;
    });
    await wait(240);
    // it lifts away trailing sticky strands, and your arm snaps back
    const y1 = M.y;
    await fxRun(380, (c, k) => {
      M.y = lerp(y1, y1 - 44, easeOut(k));
      if (k < 0.85) {
        const th = Math.max(1, Math.round(4 * (1 - k)));
        for (const dx of [-16, -4, 9, 18]) { const x = M.x + dx, yb = M.y + 14; pxLine(c, x, yb, x + dx * 0.15, top + 8, K, th + 2); pxLine(c, x, yb, x + dx * 0.15, top + 8, body, th); }
      }
    });
    tween(F, { squash: 0 }, 300);
    Sfx.play('stretch');
    const h = hand();
    await tween(M, { x: h.x, y: h.y, s: 0.12 }, 260, easeIn);
    M.on = false;
    layer();
    await tween(G.hero, { oy: 0, squash: 0 }, 180);
    await Promise.all([splat, smear]);
  },

  // --- Split: Flashy Festival ---
  // Grand Parade: you burst apart and your pieces whirl around the foe in a carnival ring, then dive
  // in one after another; every hit pops with a comic burst and confetti.
  grandparade: async m => {
    const fc = fc0(), hc = heroC(), n = Math.max(1, m.hits), parts = ['fist', 'foot', 'fist', 'foot', 'head', 'fist'];
    const CONF = ['#ff5a5a', '#ffd04a', '#7cd0ff', '#7cff7a', '#ff8ab0'];
    let launched = 0;
    const R = { fly: 0 };
    const ringPos = (i, t) => { const a = t * 4 + i * Math.PI * 2 / n; return { x: fc.x + Math.cos(a) * 44, y: fc.y - 6 + Math.sin(a) * 30 }; };
    Sfx.play('stretch');
    G.hero.flash = 0.2;
    floatText(hc.x, hc.y - 34, 'BARA BARA', '#ffd04a');
    particles(hc.x, hc.y, 24, { colors: CONF, speed: 90, grav: 80, life: 0.9 });
    tween(G.hero, { alpha: 0.45, squash: -0.15 }, 200);
    const ring = AW.layer(c => {
      for (let i = launched; i < n; i++) {
        const p = ringPos(i, G.t), d = AW.k01(R.fly * 1.4 - i * 0.08), e = easeOut(d);
        AW.part(c, parts[i % parts.length], lerp(hc.x, p.x, e), lerp(hc.y - 6, p.y, e) - Math.sin(d * Math.PI) * 30, 2);
      }
    });
    await tween(R, { fly: 1 }, 520);
    await wait(100);
    for (let i = 0; i < n && G.battle.F.hp > 0; i++) {
      const from = ringPos(i, G.t), kind = parts[i % parts.length], last = i === n - 1;
      launched = i + 1;
      Sfx.play('slash');
      await fxRun(last ? 160 : 120, (c, k) => {
        for (let j = 3; j >= 0; j--) {
          const e = easeIn(Math.max(0, k - j * 0.12));
          c.globalAlpha = j ? 0.3 : 1;
          AW.part(c, kind, lerp(from.x, fc.x, e), lerp(from.y, fc.y, e), 2);
        }
        c.globalAlpha = 1;
      });
      m.hit(i);
      AW.pow(fc, CONF[i % CONF.length], last ? 16 : 10, 220);
      particles(fc.x, fc.y, last ? 24 : 8, { colors: CONF, speed: last ? 140 : 90, grav: 120, life: 0.8 });
      shake(last ? 9 : 3, last ? 400 : 140);
      if (last) { Sfx.play('boom'); screenFlash('#ffffff', 0.5); }
      await wait(60);
    }
    launched = n;
    ring();
    // the pieces fly home in a shower of confetti
    floatText(fc.x, foeTop() - 14, 'FLASHY!', '#ff5a5a', 2);
    for (let i = 0; i < 3; i++) particles(rand(VIEW.x + 30, VIEW.x + VIEW.w - 30), VIEW.y + 10, 12, { colors: CONF, speed: 40, grav: 70, life: 1.2 });
    G.hero.flash = 0.15;
    await tween(G.hero, { alpha: 1, squash: 0 }, 260);
    await wait(150);
  },
  // Muggy Ball: you hoist a giant striped bomb and heave it in a high arc onto the foe; the fuse
  // fizzles for a heartbeat... then a flashy circus explosion and a mushroom cloud.
  muggyball: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC(), CONF = ['#ff5a5a', '#ffd04a', '#7cd0ff', '#7cff7a', '#ff8ab0'];
    const B = { x: hc.x, y: hc.y - 36, s: 0, rot: 0, fuse: 1, on: true };
    const ball = AW.layer(c => {
      if (!B.on) return;
      AW.muggy(c, B.x, B.y, B.s, B.rot, B.fuse);
      if (B.s > 0.5 && B.fuse > 0 && Math.random() < 0.7) particles(B.x + 7 * B.s, B.y - 20 * B.s - 8 * B.fuse, 1, { colors: FIRE, speed: 40, grav: 60, life: 0.3 });
    });
    Sfx.play('charge');
    tween(G.hero, { squash: 0.25 }, 300);
    await tween(B, { s: 1 }, 400, AW.boing);
    // heave!
    await tween(G.hero, { ox: -6, squash: 0.32 }, 120);
    Sfx.play('stretch');
    const throwT = tween(G.hero, { ox: 8, squash: -0.15 }, 110, easeIn).then(() => tween(G.hero, { ox: 0, squash: 0 }, 260));
    const p0 = { x: B.x, y: B.y }, p2 = { x: fc.x, y: fc.y - 8 }, p1 = { x: (p0.x + p2.x) / 2, y: VIEW.y - 20 };
    const shadow = fxRun(680, (c, k) => { c.globalAlpha = 0.3 * k; AW.oval(c, fc.x, 121, 6 + 16 * k, 2 + 2 * k, '#000000'); c.globalAlpha = 1; });
    await fxRun(680, (c, k) => { const u = 1 - k; B.x = u * u * p0.x + 2 * u * k * p1.x + k * k * p2.x; B.y = u * u * p0.y + 2 * u * k * p1.y + k * k * p2.y; B.rot = k * 9; });
    // it lands on the foe... the fuse fizzles...
    Sfx.play('bump');
    F.squash = 0.3;
    tween(F, { squash: 0 }, 200);
    shake(4, 150);
    await fxRun(340, (c, k) => {
      B.fuse = 1 - k; B.y = p2.y - Math.abs(Math.sin(k * Math.PI * 2)) * 5 * (1 - k);
      if (Math.floor(k * 12) % 2) { c.globalAlpha = 0.5; pxCircle(c, B.x, B.y, 21, '#ffffff'); c.globalAlpha = 1; }
    });
    // KABOOM
    B.on = false;
    ball();
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 1);
    AW.boom(fc, 46, 1100, ['#5a1a1a', '#d63c2f', '#ff9a3a', '#ffe14a', '#ffffff']);
    focusLines(fc, '#ffe14a', 450);
    ringOut(fc, '#ffffff', 6, 70, 600, 3); ringOut(fc, '#d63c2f', 6, 92, 700, 2);
    AW.groundRing(fc.x, '#ffe14a', 110, 700);
    particles(fc.x, fc.y, 40, { colors: CONF, speed: 170, grav: 120, life: 1.0 });
    particles(fc.x, fc.y, 30, { colors: FIRE, speed: 150, grav: 40, size: 3 });
    AW.debris(fc.x, 14);
    shake(16, 1000);
    F.squash = 0.45;
    tween(F, { squash: 0 }, 500);
    floatText(fc.x, foeTop() - 18, 'KABOOM!!', '#ffe14a', 2);
    // a mushroom cloud rises
    await fxRun(1000, (c, k) => {
      if (k < 0.25) return;
      const e = easeOut((k - 0.25) / 0.75), y = lerp(fc.y, VIEW.y + 24, e);
      c.globalAlpha = 1 - e * 0.8;
      for (let yy = Math.round(y); yy < 118; yy += 7) AW.puff(c, fc.x + Math.sin(yy * 0.3 + G.t * 4) * 2, yy, 5 + (118 - yy) * 0.02, ['#8a8090', '#5a5060', '#3a3440']);
      for (let i = 0; i < 7; i++) AW.puff(c, fc.x + Math.cos(i * 0.9) * 18 * (0.5 + e), y + Math.sin(i * 0.9) * 7, 9 + e * 3, i % 2 ? ['#ffd04a', '#ff9a3a', '#a8401a'] : ['#8a8090', '#5a5060', '#3a3440']);
      c.globalAlpha = 1;
    });
    await Promise.all([shadow, throwT]);
  },

  // --- Magma: Volcano Lord ---
  // Inugami Guren: your fist swells into a hound's head of magma that lunges out on a molten neck,
  // clamps its jaws on the foe, shakes it, and crumbles into lava and smoke.
  magmahound: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const hand = () => ({ x: G.hero.x + G.hero.ox + 8, y: 100 + G.hero.oy });
    const H = { x: hc.x + 16, y: hc.y - 8, open: 0, s: 0.2, on: true };
    const layer = AW.layer(c => {
      if (!H.on) return;
      const h = hand();
      AW.tube(c, h.x, h.y, (h.x + H.x) / 2, Math.min(h.y, H.y) - 8, H.x - 9 * H.s, H.y + 1, 2.5, Math.max(2.5, 7 * H.s), ['#1b0604', '#a8301a', '#ff9a3a']);
      AW.hound(c, H.x, H.y, H.open, H.s);
      if (Math.random() < 0.5) particles(H.x + 8 * H.s, H.y + 6 * H.s, 1, { colors: ['#ff5a2a', '#ffd04a'], speed: 10, grav: 160, life: 0.4 });
      if (Math.random() < 0.4) particles(H.x - 6 * H.s, H.y - 10 * H.s, 1, { colors: ['#5a5060', '#8a8090'], speed: 10, grav: -40, life: 0.6, size: 3 });
    });
    Sfx.play('fire');
    tween(G.hero, { ox: -4, squash: 0.18 }, 300);
    await tween(H, { s: 1.15, open: 5 }, 400, AW.boing);
    // it lunges, jaws wide
    Sfx.play('fire');
    tween(G.hero, { ox: 8, squash: -0.1 }, 160, easeIn);
    const from = { x: H.x, y: H.y }, to = { x: fc.x - 18, y: fc.y };
    AW.speed(380, '#ff9a3a', -1, 70, 118, 10);
    await fxRun(300, (c, k) => { const e = easeIn(k); H.x = lerp(from.x, to.x, e); H.y = lerp(from.y, to.y, e) - Math.sin(k * Math.PI) * 18; H.open = 5 + k * 6; });
    // and bites down
    Sfx.play('bite');
    await tween(H, { open: 0, x: to.x + 4 }, 70, easeIn);
    m.hit(0);
    screenFlash('#ff5a2a', 0.6);
    impact(fc, FIRE, 18);
    particles(fc.x, fc.y, 26, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 120, grav: 200, size: 3 });
    focusLines(fc, '#ff9a3a', 260);
    shake(9, 500);
    F.squash = 0.3;
    // it shakes the foe like a dog...
    const bx = H.x, by = H.y;
    await fxRun(340, (c, k) => { H.x = bx + Math.cos(k * 34) * 3; H.y = by + Math.sin(k * 40) * 3; });
    tween(F, { squash: 0 }, 300);
    // ...then crumbles into lava and smoke as your arm pulls back
    Sfx.play('fire');
    particles(H.x, H.y, 20, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 50, grav: 220, size: 3 });
    particles(H.x, H.y - 6, 14, { colors: ['#5a5060', '#8a8090', '#3a3440'], speed: 30, grav: -40, size: 3, life: 0.8 });
    const h = hand();
    await Promise.all([tween(H, { s: 0.2, x: h.x + 6, y: h.y - 2, open: 0 }, 260, easeIn), tween(G.hero, { ox: 0, squash: 0 }, 260)]);
    H.on = false;
    layer();
    await wait(150);
  },
  // Great Eruption: red-hot cracks race through the ground, it swells under the foe and erupts in a
  // towering pillar of magma that hurls it skyward, then molten rocks rain down.
  eruption: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const heat = AW.dim(2800, '#2a0400', 0.4);
    Sfx.play('boom');
    shake(3, 900);
    await tween(G.hero, { oy: 2, squash: 0.25 }, 160, easeIn);
    tween(G.hero, { oy: 0, squash: 0 }, 240);
    // red-hot cracks race through the ground toward the foe and smoke vents from them
    const cracks = [{ P: AW.jag(hc.x + 6, 121, fc.x, 121, 10, 2), d: 0 }];
    for (let i = 0; i < 4; i++) { const x = lerp(hc.x + 20, fc.x, i / 3); cracks.push({ P: AW.jag(x, 121, x + rand(-16, 16), 132 + rand(0, 10), 3, 2), d: 0.2 + i * 0.12 }); }
    for (const s of [-1, 1]) cracks.push({ P: AW.jag(fc.x, 121, fc.x + s * 46, 124, 5, 2), d: 0.65 });
    const C = { t: 0 };
    const ground = fxRun(2600, (c, k) => {
      const hot = Math.floor(G.t * 10) % 2 ? '#ffd04a' : '#ff7a2a';
      c.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      for (const cr of cracks) { const e = AW.k01((C.t - cr.d) * 2.5); if (e > 0) { AW.poly(c, cr.P, e, '#2a0804', 3); AW.poly(c, cr.P, e, hot, 1); } }
      c.globalAlpha = 1;
      if (C.t > 0.2 && Math.random() < 0.4) { const p = pick(pick(cracks).P); particles(p[0], p[1] - 2, 1, { colors: ['#5a5060', '#8a8090'], speed: 15, grav: -50, life: 0.7, size: 3 }); }
    });
    await tween(C, { t: 1 }, 600);
    // the ground swells under the foe...
    Sfx.play('fire');
    const cone = { h: 0 };
    const mound = fxRun(2000, (c, k) => {
      const h = 18 * cone.h;
      if (h < 1) return;
      c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      AW.tri(c, fc.x - 42, 123, fc.x + 42, 123, fc.x, 119 - h, '#1b0604');
      AW.tri(c, fc.x - 40, 123, fc.x + 40, 123, fc.x, 121 - h, '#4a2a1a');
      AW.tri(c, fc.x - 40, 123, fc.x - 6, 123, fc.x, 121 - h, '#6a3a2a');
      pxRect(c, fc.x - 6, 121 - h, 12, 2, '#ff5a2a'); pxRect(c, fc.x - 3, 121 - h, 6, 1, '#ffd04a');
      c.globalAlpha = 1;
    });
    tween(F, { oy: -6 }, 260);
    await tween(cone, { h: 1 }, 260, easeOut);
    // ...and erupts straight up through it
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ff5a2a', 0.9);
    focusLines(fc, '#ffd04a', 400);
    shake(14, 900);
    const col = { h: 0 };
    const pillar = fxRun(1000, (c, k) => {
      const fade = k > 0.55 ? (1 - k) / 0.45 : 1, top = lerp(112, VIEW.y - 10, col.h);
      const pal = ['#5a1a1a', '#c0301a', '#ff5a2a', '#ffb03a', '#fff3a0'];
      for (let li = 0; li < pal.length; li++) {
        const w0 = (24 - li * 5) * fade;
        if (w0 < 1) continue;
        for (let y = Math.round(top); y < 112; y += 2) {
          const t = (112 - y) / (112 - top + 1), w = w0 * (0.7 + 0.3 * t) + Math.sin(y * 0.15 - G.t * 30 + li) * 2.5;
          pxRect(c, fc.x - w, y, w * 2, 2, pal[li]);
        }
      }
      if (Math.random() < 0.8 * fade) particles(fc.x + rand(-10, 10), top + 10, 3, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 120, grav: 240, dir: -Math.PI / 2, spread: 1.8, size: 3 });
    });
    tween(col, { h: 1 }, 150, easeOut);
    const fly = tween(F, { oy: -36, squash: -0.2 }, 260, easeOut)
      .then(() => tween(F, { oy: 0, squash: 0.3 }, 280, easeIn))
      .then(() => { Sfx.play('bump'); dust(fc.x, 10); return tween(F, { squash: 0 }, 200); });
    await wait(550);
    // molten rocks rain down around it
    for (let i = 0; i < 5; i++) { AW.meteor(fc.x + rand(-56, 56), 300); await wait(110); }
    await Promise.all([pillar, heat, ground, mound, fly]);
  },

  // --- String: Awakened Strings ---
  // String Tsunami: you press a hand to the ground and it unravels into strings; they rear up into a
  // great breaking wave of thread that sweeps over the foe, then fall flat again.
  stringwave: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    Sfx.play('stretch');
    await tween(G.hero, { oy: 3, squash: 0.25 }, 150, easeIn);
    const net = fxRun(2000, (c, k) => {
      const reach = easeOut(Math.min(1, k * 3)) * 300;
      c.globalAlpha = 0.75 * (k > 0.85 ? (1 - k) / 0.15 : 1);
      for (let x = VIEW.x - 30; x < VIEW.x + VIEW.w; x += 16) {
        if (Math.abs(x + 15 - hc.x) > reach) continue;
        pxLine(c, x, 120, x + 30, VIEW.y + VIEW.h, '#ffffff'); pxLine(c, x + 30, 120, x, VIEW.y + VIEW.h, '#ff8ab0');
      }
      pxRect(c, Math.max(VIEW.x, hc.x - reach), 120, reach * 2, 1, '#ffffff');
      c.globalAlpha = 1;
    });
    tween(G.hero, { oy: 0, squash: 0 }, 250);
    await wait(250);
    // the strings rear up into a great wave and break over the foe
    Sfx.play('stretch');
    let hit = false;
    await fxRun(1100, (c, k) => {
      const wx = lerp(hc.x - 30, fc.x + 40, easeIn(Math.min(1, k * 1.15))), wh = 92 * Math.min(1, k * 3) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      const hAt = x => { const d = (x - wx) / 28; return wh * Math.exp(-d * d * (d > 0 ? 3 : 0.45)); };
      // a translucent body of woven thread with a dark-edged crest...
      c.globalAlpha = 0.4;
      for (let x = VIEW.x; x < VIEW.x + VIEW.w; x += 2) { const hh = hAt(x); if (hh >= 2) pxRect(c, x + hh * 0.35, 121 - hh, 2, hh, '#ff8ab0'); }
      c.globalAlpha = 1;
      for (let x = VIEW.x; x < VIEW.x + VIEW.w; x += 2) { const hh = hAt(x); if (hh >= 4) { pxRect(c, x + hh * 0.35, 120 - hh, 2, 1, '#5a1a3a'); pxRect(c, x + hh * 0.35, 121 - hh, 2, 1, '#ffffff'); } }
      // ...and the strands themselves, bowing forward at the top like a breaking wave
      for (let x = VIEW.x; x < VIEW.x + VIEW.w; x += 4) {
        const hh = hAt(x);
        if (hh < 3) continue;
        const lean = hh * 0.35, col = (x / 4) % 4 === 0 ? '#ff8ab0' : '#ffffff', mx = x + lean * 0.3, my = 121 - hh * 0.65, tx = x + lean, ty = 121 - hh;
        pxLine(c, x, 121, mx, my, col, 1); pxLine(c, mx, my, tx, ty, col, 1);
        // near the crest the strands hook forward and down as the wave breaks
        const curl = AW.k01((hh / (wh || 1) - 0.55) / 0.45);
        if (curl > 0) { const cx = tx + 16 * curl, cy = ty + 3 + 12 * curl * curl; pxLine(c, tx, ty, cx - 4 * curl, ty - 4 * curl, col, 1); pxLine(c, cx - 4 * curl, ty - 4 * curl, cx, cy, col, 1); pxRect(c, cx - 1, cy - 1, 2, 2, '#ffffff'); }
        else if (hh > 24 && (x / 4) % 2 === 0) pxRect(c, tx - 1, ty - 2, 2, 2, '#ffffff');
      }
      if (!hit && wx >= fc.x - 4) {
        hit = true;
        m.hit(0);
        Sfx.play('boom');
        for (let i = 0; i < 3; i++) slashAt({ x: fc.x + rand(-6, 6), y: fc.y + rand(-8, 8) }, '#ff8ab0', rand(-1, 1), 40);
        particles(fc.x, fc.y, 26, { colors: ['#ffffff', '#ff8ab0'], speed: 110, grav: 80 });
        shake(8, 450);
        focusLines(fc, '#ff8ab0', 260);
        tween(F, { oy: -16, squash: -0.2 }, 160, easeOut).then(() => tween(F, { oy: 0, squash: 0.25 }, 200, easeIn)).then(() => tween(F, { squash: 0 }, 160));
      }
    });
    if (!hit) m.hit(0);
    await net;
  },
  // God Thread: threads stream up from your raised fingers, then a dozen thick braided threads shoot
  // in from every side of the screen and pierce the foe; they pull taut, hum, and slice.
  godthread: async m => {
    const F = G.battle.F, fc = fc0(), L = VIEW.x, T = VIEW.y, R = VIEW.x + VIEW.w;
    const from = [[L, T + 30], [L + 60, T], [R, T + 24], [L + 130, T], [R, 70], [L, 90], [R - 50, T], [L + 20, T], [R, 112], [L + 170, T], [L, T + 60], [L + 95, T]];
    const dark = AW.dim(2200, '#1b1424', 0.3);
    Sfx.play('slash');
    // threads stream up from your raised fingertips
    tween(G.hero, { oy: -2, squash: -0.14 }, 250);
    const up = fxRun(1900, (c, k) => {
      const e = easeOut(Math.min(1, k * 4)), hx = G.hero.x + G.hero.ox + 8, hy = 88 + G.hero.oy;
      c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      for (let i = 0; i < 5; i++) { const x = hx - 4 + i * 2; pxLine(c, x, hy, x + (i - 2) * 3, lerp(hy, T, e), i % 2 ? '#ff8ab0' : '#ffffff', 1); }
      c.globalAlpha = 1;
    });
    await wait(320);
    // a dozen thick threads shoot in from every side and pierce the foe
    const shown = [];
    const strings = AW.layer(c => { for (const s of shown) AW.thread(c, s); });
    for (let i = 0; i < from.length; i++) {
      const [x0, y0] = from[i], ang = Math.atan2(fc.y - y0, fc.x - x0);
      const s = { x0, y0, x1: fc.x + Math.cos(ang) * 4, y1: fc.y + Math.sin(ang) * 4, e: 0, vib: 0, ph: i, lit: false };
      shown.push(s);
      tween(s, { e: 1 }, 120, easeIn).then(() => particles(s.x1, s.y1, 3, { colors: ['#ffffff', '#ff8ab0'], speed: 60, grav: 0, life: 0.25 }));
      if (i % 2 === 0) Sfx.play('slash');
      await wait(55);
    }
    await wait(140);
    F.squash = -0.12;
    // they pull taut and hum...
    Sfx.play('charge');
    await fxRun(320, (c, k) => { for (const s of shown) s.vib = 3 * (1 - k) + 0.5; });
    // ...and slice
    await tween(G.hero, { squash: 0.2 }, 80);
    for (const s of shown) { s.lit = true; s.vib = 0; }
    m.hit(0);
    Sfx.play('crit');
    screenFlash('#ffffff', 0.9);
    slashAt(fc, '#ff8ab0', 0.8, 56); slashAt(fc, '#ffffff', -0.8, 56);
    impact(fc, ['#ffffff', '#ff8ab0'], 24);
    focusLines(fc, '#ff8ab0', 380);
    shake(10, 500);
    tween(F, { squash: 0 }, 300);
    await wait(220);
    // the threads snap and whip back out of sight
    Sfx.play('stretch');
    shown.forEach((s, i) => { s.lit = false; tween(s, { e: 0 }, 200 + i * 12, easeIn); });
    await Promise.all([tween(G.hero, { oy: 0, squash: 0 }, 260), wait(360)]);
    strings();
    await Promise.all([dark, up]);
  },

  // --- Paw: Ursus Awakening ---
  // Pain Bubble: your paw pad squeezes the pain out into a throbbing paw-shaped bubble; it drifts
  // onto the foe and bursts over it, and its strength drains back into you.
  painbubble: async m => {
    const F = G.battle.F, fc = fc0(), hc = heroC();
    const Bb = { x: hc.x + 24, y: hc.y - 16, s: 0, on: true };
    const bubble = AW.layer(c => {
      if (!Bb.on || Bb.s < 0.05) return;
      const s = Bb.s * (1 + Math.sin(G.t * 14) * 0.05);
      c.globalAlpha = 0.85;
      AW.paw(c, Bb.x, Bb.y, s, '#4a1424', '#ff8ab0');
      c.globalAlpha = 1;
      for (let i = 0; i < 8; i++) { const a = G.t * 6 + i * 0.8, r = (2 + i) * s * 0.8; pxRect(c, Bb.x + Math.cos(a) * r, Bb.y + 3 * s + Math.sin(a) * r * 0.8, 2, 2, i % 2 ? '#c0303a' : '#1b1424'); }
      pxRect(c, Bb.x - 6 * s, Bb.y - s, 2, 3, '#ffffff'); pxRect(c, Bb.x - 1.5 * s, Bb.y - 12 * s, 2, 1, '#ffffff');
    });
    Sfx.play('charge');
    tween(G.hero, { ox: 4, squash: -0.1 }, 250);
    // the paw pad glows as it draws the pain out
    fxRun(520, (c, k) => { const h = heroHand(); c.globalAlpha = 0.6 * (1 - k); AW.paw(c, h.x + 2, h.y - 4, 0.3 + k * 0.2, '#ff8ab0', '#ffffff'); c.globalAlpha = 1; });
    AW.gather({ x: Bb.x, y: Bb.y }, ['#c0303a', '#1b1424', '#ff8ab0'], 520, 36);
    await tween(Bb, { s: 1.1 }, 520, AW.boing);
    // it drifts toward the foe, throbbing and trailing wisps
    Sfx.play('stretch');
    const from = { x: Bb.x, y: Bb.y }, to = { x: fc.x, y: fc.y - 4 };
    tween(G.hero, { ox: 0, squash: 0 }, 300);
    await fxRun(560, (c, k) => {
      const e = easeIn(k);
      Bb.x = lerp(from.x, to.x, e); Bb.y = lerp(from.y, to.y, e) - Math.sin(k * Math.PI) * 14;
      if (Math.random() < 0.6) particles(Bb.x - 8, Bb.y + rand(-6, 10), 1, { colors: ['#4a1424', '#1b1424'], speed: 10, grav: -20, life: 0.5, size: 3 });
    });
    // and bursts over it
    Bb.on = false;
    bubble();
    m.hit(0);
    Sfx.play('hurt');
    screenFlash('#8a1a2a', 0.6);
    fxRun(420, (c, k) => { c.globalAlpha = 1 - k; AW.pawRing(c, to.x, to.y, 1.1 + easeOut(k) * 2.4, '#ff8ab0', 2); c.globalAlpha = 1; });
    ringOut(to, '#8a1a2a', 6, 50, 420, 3);
    particles(to.x, to.y, 36, { colors: ['#8a1a2a', '#1b1424', '#ff8ab0'], speed: 120, grav: 40, size: 3 });
    floatText(fc.x, foeTop() - 12, 'PAIN', '#ff8ab0', 2);
    F.squash = 0.35;
    tween(F, { squash: 0 }, 400);
    shake(7, 400);
    // its strength drains back into you
    const motes = Array.from({ length: 10 }, () => ({ x: fc.x + rand(-12, 12), y: fc.y + rand(-14, 10), d: rand(0, 0.3) }));
    await fxRun(640, (c, k) => {
      const h = heroC();
      for (const o of motes) {
        const t = AW.k01((k - o.d) / 0.7);
        if (t <= 0 || t >= 1) continue;
        const e = easeIn(t), x = lerp(o.x, h.x, e), y = lerp(o.y, h.y - 4, e) - Math.sin(t * Math.PI) * 18;
        pxRect(c, x - 1, y - 1, 3, 3, '#ff8ab0'); pxRect(c, x, y, 1, 1, '#ffffff');
      }
    });
    G.hero.flash = 0.12;
    particles(hc.x, hc.y, 8, { colors: ['#ff8ab0', '#ffffff'], speed: 30, grav: -40, life: 0.5 });
    await wait(120);
  },
  // Ursus Shock: you press your paws together and the air itself rushes in, swelling into a giant
  // paw-shaped bubble around the foe; it crushes down to a single point... and bursts.
  supernova: async m => {
    const F = G.battle.F, fc = fc0();
    const dark = AW.dim(2700, '#05081a', 0.32);
    Sfx.play('charge');
    tween(G.hero, { squash: 0.2 }, 300);
    AW.gather(fc, ['#ffffff', '#f2c7d8', '#d9b3ff'], 1100, 110);
    const Bb = { s: 0 };
    const bub = AW.layer(c => {
      const s = Bb.s;
      if (s < 0.05) return;
      c.globalAlpha = 0.28; AW.paw(c, fc.x, fc.y - 2, s, '#f2c7d8', '#ffffff'); c.globalAlpha = 1;
      AW.pawRing(c, fc.x, fc.y - 2, s, '#ffffff', s > 1.5 ? 2 : 1);
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + G.t * 4, rr = 12 * s; pxRect(c, fc.x + Math.cos(a) * rr, fc.y - 2 + Math.sin(a) * rr, 2, 2, '#ffffff'); }
    });
    // a paw-shaped bubble of air swells around the foe...
    await tween(Bb, { s: 2.6 }, 650, AW.boing);
    await wait(150);
    // ...crushes down to a single point...
    Sfx.play('charge');
    await tween(Bb, { s: 0.12 }, 420, easeIn);
    bub();
    await fxRun(240, (c, k) => { AW.twinkle(c, fc.x, fc.y, Math.round(2 + k * 8), '#ffffff'); pxCircle(c, fc.x, fc.y, 2 + Math.sin(k * 40), '#ffffff'); });
    // ...and bursts in a shock the shape of a giant paw
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 1);
    fxRun(800, (c, k) => {
      const s = 0.6 + easeOut(k) * 7;
      c.globalAlpha = 1 - k; AW.pawRing(c, fc.x, fc.y, s, k < 0.4 ? '#ffffff' : '#f2c7d8', 2); c.globalAlpha = 1;
    });
    ringOut(fc, '#ffffff', 2, 96, 700, 3); ringOut(fc, '#f2c7d8', 2, 124, 760, 2);
    rays(fc, '#ffffff', 14, 96, 600);
    focusLines(fc, '#ffffff', 450);
    AW.groundRing(fc.x, '#f2c7d8', 130, 700);
    AW.debris(fc.x, 20);
    dust(fc.x - 30, 10); dust(fc.x + 30, 10);
    particles(fc.x, fc.y, 50, { colors: ['#ffffff', '#f2c7d8', '#ff8ab0'], speed: 180 });
    shake(16, 1000);
    F.squash = 0.4;
    tween(F, { squash: 0 }, 500);
    tween(G.hero, { squash: 0 }, 200);
    await wait(700);
    await dark;
  },
});
SLASH_MOVES.push('lightsword');
SHOT_MOVES.push('muggyball', 'yasakani');
