'use strict';
/* The Dragon-Dragon Fruit's full form: a long azure eastern dragon in the style of Kaido from
   One Piece, with a cream belly, a white mane, bone horns, long whiskers and the clouds it rides.
   It is drawn procedurally so it can fly and coil: a move steers the head around and the body
   follows the path the head leaves behind. The head is shaded pixel by pixel from simple shapes
   (skull, snout, jaw, horns), so it stays crisp at any angle. The fruit's moves live here too. */
{
  const C = {
    k: '#0d1834', b: '#3c8ad8', bd: '#2a62b4', bl: '#8ad0f6', c: '#f4e6bc', cd: '#c9ac72',
    h: '#f7eec8', hd: '#b89c5e', m: '#f4f9ff', md: '#a9c6ea', e: '#ffe14a', p: '#c8202a',
    mouth: '#4a0c1a', tongue: '#d8506a', t: '#ffffff', cl: '#ffffff', cl2: '#dfe3f2', cl3: '#aab3d2',
  };
  const BOLT = ['#ffffff', '#fff6a0', '#7cd0ff'];
  const SEG = 3, FULL = 190;
  const k01 = v => Math.max(0, Math.min(1, v));

  // ---------- the body: a path the head leaves behind ----------

  function make(x, y) {
    return { hx: x, hy: y, trail: [], len: 0, open: 0, glow: 0, fire: 0, scale: 1, alpha: 1, wave: 1, clouds: 1 };
  }

  function grow(D) {
    const last = D.trail[0];
    if (!last || Math.hypot(D.hx - last.x, D.hy - last.y) >= 1) D.trail.unshift({ x: D.hx, y: D.hy });
    let acc = 0;
    for (let i = 1; i < D.trail.length; i++) {
      acc += Math.hypot(D.trail[i].x - D.trail[i - 1].x, D.trail[i].y - D.trail[i - 1].y);
      if (acc > FULL + 30) { D.trail.length = i + 1; break; }
    }
  }

  // Points every SEG pixels from the head back along the trail, `len` long, with a slow wave on top.
  function spine(D) {
    if (D.path) { const out = []; for (let s = 0; s <= D.len; s += SEG) out.push(D.path(s)); return out; }
    const tr = [{ x: D.hx, y: D.hy }].concat(D.trail), raw = [{ x: D.hx, y: D.hy }];
    let dist = 0, next = SEG;
    for (let j = 1; j < tr.length && next <= D.len; j++) {
      const a = tr[j - 1], b = tr[j], L = Math.hypot(b.x - a.x, b.y - a.y);
      while (L > 0 && next <= dist + L && next <= D.len) {
        const f = (next - dist) / L;
        raw.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
        next += SEG;
      }
      dist += L;
    }
    return raw.map((p, i) => {
      if (!i) return p;
      const a = raw[i - 1], b = raw[i + 1] || p;
      const dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy) || 1, s = i * SEG;
      const w = Math.sin(s * 0.07 - G.t * 5) * 2.6 * D.wave * Math.min(1, s / 40);
      return { x: p.x - dy / L * w, y: p.y + dx / L * w };
    });
  }

  const radius = (D, s) => D.scale * (s < 0.1 ? 5.2 + s * 14 : Math.max(1.4, 6.6 * Math.pow(1 - (s - 0.1) / 0.9, 0.75)));

  function cloud(c, x, y, s) {
    const P = [[0, 0, 6], [-7, 2, 5], [7, 2, 5], [-3, -4, 4], [4, -4, 4], [-12, 4, 3], [12, 4, 3]];
    for (const [dx, dy, r] of P) pxCircle(c, x + dx * s, y + dy * s, r * s + 1, C.cl3);
    for (const [dx, dy, r] of P) pxCircle(c, x + dx * s, y + dy * s + 1, r * s, C.cl2);
    for (const [dx, dy, r] of P) pxCircle(c, x + dx * s - 1, y + dy * s - 1, Math.max(1, r * s - 1.5), C.cl);
  }

  function drawBody(c, D, pts) {
    const n = pts.length;
    const Q = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const L = Math.hypot(a.x - b.x, a.y - b.y) || 1, dx = (a.x - b.x) / L, dy = (a.y - b.y) / L;
      return { x: p.x, y: p.y, dx, dy, nx: -dy, ny: dx, r: radius(D, i * SEG / FULL) };
    });
    // the belly faces down; where the body runs straight up or down it keeps its last side
    let side = 1;
    for (const q of Q) { if (Math.abs(q.ny) > 0.3) side = q.ny > 0 ? 1 : -1; q.bx = q.nx * side; q.by = q.ny * side; }

    if (D.clouds > 0) {
      for (const f of [0.3, 0.58, 0.86]) {
        const i = Math.round(f * FULL / SEG);
        if (i >= n) continue;
        const q = Q[i];
        cloud(c, q.x + q.bx * (q.r + 2), q.y + q.by * (q.r + 2) + 2 + Math.sin(G.t * 3 + i) * 1.5, 0.8 * D.clouds * D.scale);
      }
    }
    // four short legs with bone-white talons
    for (const f of [0.16, 0.21, 0.5, 0.55]) {
      const i = Math.round(f * FULL / SEG);
      if (i >= n - 1) continue;
      const q = Q[i], sw = Math.sin(G.t * 7 + f * 20), far = f === 0.21 || f === 0.55;
      const ex = q.x + q.bx * (q.r + 5) - q.dx * (3 + sw * 3), ey = q.y + q.by * (q.r + 5) - q.dy * (3 + sw * 3);
      pxLine(c, q.x, q.y, ex, ey, C.k, 5);
      pxLine(c, q.x, q.y, ex, ey, far ? C.bd : C.b, 3);
      for (let j = -1; j <= 1; j++) pxLine(c, ex, ey, ex + q.bx * 3 + q.dx * (j * 2 + 1), ey + q.by * 3 + q.dy * (j * 2 + 1), C.h, 1);
    }

    // shade in chunks, tail first, so where the body coils over itself the nearer part keeps its outline
    const CH = 12;
    for (let end = n - 1; end >= 0; end -= CH) {
      const start = Math.max(0, end - CH + 1), back = Math.min(n - 1, end + 2);
      for (let i = end; i >= start; i--) pxCircle(c, Q[i].x, Q[i].y, Q[i].r + 1, C.k);
      for (let i = back; i >= start; i--) pxCircle(c, Q[i].x, Q[i].y, Q[i].r, C.b);
      for (let i = back; i >= start; i--) { const q = Q[i]; pxCircle(c, q.x + q.bx * q.r * 0.3, q.y + q.by * q.r * 0.3, q.r * 0.72, C.bd); }
      for (let i = back; i >= start; i--) { const q = Q[i]; pxCircle(c, q.x + q.bx * q.r * 0.5, q.y + q.by * q.r * 0.5, q.r * 0.48, C.c); }
      for (let i = end; i >= start; i -= 2) {
        const q = Q[i], cx = q.x + q.bx * q.r * 0.5, cy = q.y + q.by * q.r * 0.5;
        if (q.r > 2.5) pxLine(c, cx - q.bx * q.r * 0.3, cy - q.by * q.r * 0.3, cx + q.bx * q.r * 0.45, cy + q.by * q.r * 0.45, C.cd, 1);
      }
      for (let i = back; i >= start; i--) { const q = Q[i]; pxCircle(c, q.x - q.bx * q.r * 0.45, q.y - q.by * q.r * 0.45, q.r * 0.28, C.bl); }
    }
    // a white mane running down the spine
    for (let i = 5; i < n; i += 5) {
      const q = Q[i], w = Math.sin(G.t * 8 + i * 0.7) * 1.5, L = 2 + q.r * 0.7;
      const bx = q.x - q.bx * (q.r - 1), by = q.y - q.by * (q.r - 1);
      const tx = bx - q.bx * (L + w) - q.dx * (L + 3), ty = by - q.by * (L + w) - q.dy * (L + 3);
      pxLine(c, bx + q.dx * 2, by + q.dy * 2, tx, ty, C.md, 2);
      pxLine(c, bx + q.dx * 2 - q.bx, by + q.dy * 2 - q.by, tx, ty, C.m, 1);
    }
    // tail tuft (or a puff of cloud where the body is still pouring out)
    const q = Q[n - 1];
    if (n * SEG >= FULL - 4) {
      for (let j = -2; j <= 2; j++) {
        const a = Math.atan2(-q.dy, -q.dx) + j * 0.35 + Math.sin(G.t * 6 + j) * 0.15, L = 9 - Math.abs(j) * 1.5;
        pxLine(c, q.x, q.y, q.x + Math.cos(a) * L, q.y + Math.sin(a) * L, j % 2 ? C.md : C.m, 2);
      }
    } else if (D.clouds > 0 && n > 3) {
      cloud(c, q.x, q.y, 0.7 * D.scale);
    }
    return Q;
  }

  // ---------- the head ----------

  const cap = (u, v, ax, ay, bx, by) => {
    const du = bx - ax, dv = by - ay, t = k01(((u - ax) * du + (v - ay) * dv) / (du * du + dv * dv));
    return [Math.hypot(u - ax - du * t, v - ay - dv * t), t];
  };
  const ell = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
  function horn(u, v, P, r0, r1) {
    let best = 9, bt = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const [d, t] = cap(u, v, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      const tt = (i + t) / (P.length - 1);
      if (d - (r0 + (r1 - r0) * tt) < best) { best = d - (r0 + (r1 - r0) * tt); bt = tt; }
    }
    return [best, bt];
  }
  const HORN_A = [[-1, -5.5], [-7, -11.5], [-14, -15], [-22, -14.5]];
  const HORN_B = [[3, -6.5], [-1, -12.5], [-7, -17], [-13, -18.5]];
  const snoutTop = u => -5.6 + (u - 3) * 0.17 - 1.3 * Math.exp(-(((u - 19.5) / 1.6) ** 2));
  const LIP = 3.5;

  // Which colour the head has at local point (u forward, v down), or null.
  function headAt(u, v, open, glow) {
    const eye = ell(u, v, 6, -3.3, 2.7, 1.8);
    if (eye < 1) return ell(u, v, 6.9, -3.3, 1.1, 1.3) < 1 ? (glow > 0.5 ? 't' : 'p') : 'e';
    if (Math.abs(u - 20.2) < 0.9 && Math.abs(v + 1.4) < 0.8) return 'k';
    const [ha, ta] = horn(u, v, HORN_A, 2.8, 0.6);
    if (ha < 0) return (ta * 11) % 1 < 0.28 ? 'hd' : 'h';
    // jaw angle: the lower jaw swings down around a hinge at the back of the mouth
    const th = open * 0.62, hx = 1, hy = LIP;
    const ju = hx + (u - hx) * Math.cos(-th) - (v - hy) * Math.sin(-th), jv = hy + (u - hx) * Math.sin(-th) + (v - hy) * Math.cos(-th);
    // fangs
    if (u > 16 && u < 17.4 && v >= LIP && v < LIP + 2.2 - (u - 16) * 0.6) return 't';
    if (open > 0.12) {
      for (const tu of [7, 10.5, 14]) if (Math.abs(u - tu) < 0.8 - (v - LIP) * 0.4 && v >= LIP && v < LIP + 1.6) return 't';
      for (const tu of [6, 9.5, 13]) if (Math.abs(ju - tu) < 0.8 - (LIP + 0.4 - jv) * 0.4 && jv <= LIP + 0.4 && jv > LIP - 1.2) return 't';
    }
    if (cap(u, v, -2, -6.6, 9, -5.4)[0] < 1.5) return 'bd';
    // upper jaw / snout
    if (u >= 2 && u <= 23 && v >= snoutTop(u) && v <= LIP && (u < 20.5 || ell(u, v, 20.5, -0.6, 2.6, 4.3) < 1)) {
      if (v > LIP - 1.4) return 'c';
      return v < snoutTop(u) + 1.4 ? 'bl' : 'b';
    }
    // lower jaw
    if (ju >= 1 && ju <= 19 && jv >= LIP && jv <= 7.2 - (ju - 1) * 0.14 && (ju < 17 || ell(ju, jv, 17, LIP + 1.4, 2.2, 2.2) < 1)) {
      return jv > 6.4 - (ju - 1) * 0.14 ? 'cd' : 'c';
    }
    // inside of the open mouth
    if (open > 0.05) {
      const a = Math.atan2(v - hy, u - hx), r = Math.hypot(u - hx, v - hy);
      if (u > hx && a >= 0 && a <= th && r < 19) return a > th * 0.55 && r > 5 && r < 15 ? 'tongue' : 'mouth';
    }
    // skull
    const sk = ell(u, v, -1.2, -1, 9.4, 8.3);
    if (sk < 1) return v < -5 ? 'bl' : v > 3.5 ? 'bd' : 'b';
    const [hb, tb] = horn(u, v, HORN_B, 2.4, 0.5);
    if (hb < 0) return (tb * 11) % 1 < 0.3 ? 'k' : 'hd';
    return null;
  }

  // Maps head-local (u, v) to the screen, with the head kept upright whichever way it flies.
  function headFrame(x, y, dx, dy, s) {
    const face = dx >= 0 ? 1 : -1;
    let tilt = Math.atan2(dy, dx * face);
    tilt = Math.max(-0.95, Math.min(0.95, tilt));
    const ca = Math.cos(tilt), sa = Math.sin(tilt);
    return {
      face, ca, sa, s,
      to: (u, v) => ({ x: x + face * (u * ca - v * sa) * s, y: y + (u * sa + v * ca) * s }),
      from: (px, py) => { const ddx = (px - x) * face / s, ddy = (py - y) / s; return [ddx * ca + ddy * sa, -ddx * sa + ddy * ca]; },
    };
  }

  // A flowing strand in head space: starts at (u0, v0), runs back `len` px with a wave.
  function strand(c, T, u0, v0, len, du, dv, amp, ph, col, shade, thick) {
    let prev = T.to(u0, v0);
    for (let s = 2; s <= len; s += 2) {
      const w = Math.sin(s * 0.25 - G.t * 7 + ph) * amp * (s / len);
      const p = T.to(u0 + du * s, v0 + dv * s + w);
      if (shade) pxLine(c, prev.x, prev.y + 1, p.x, p.y + 1, shade, 1);
      pxLine(c, prev.x, prev.y, p.x, p.y, col, s < len * 0.5 ? thick : 1);
      prev = p;
    }
  }

  function drawHead(c, D, q) {
    const T = headFrame(q.x, q.y, q.dx, q.dy, D.scale * 1.15);
    // a thick white mane and the whiskers sit behind the head
    for (const [u0, v0, len, dv, ph] of [[-2, -8, 18, -0.2, 4.2], [-5, -6, 24, -0.08, 0], [-8, -3, 28, 0.02, 1.3], [-8, 0.5, 27, 0.1, 2.6], [-6, 3.5, 24, 0.18, 2.1], [-3, 6.5, 19, 0.3, 3.3]]) {
      strand(c, T, u0, v0, len, -1, dv, 3, ph, C.md, null, 4);
      strand(c, T, u0, v0 - 0.8, len - 3, -1, dv, 3, ph, C.m, null, 2);
    }
    strand(c, T, 19, LIP + 0.5, 34, -1, 0.32, 3, 0.4, C.c, null, 1);
    strand(c, T, 18, 0.5, 30, -1, -0.18, 2.5, 1.7, C.c, null, 1);
    for (const [u0, ph] of [[9, 0], [13, 1.4]]) strand(c, T, u0, 6.2 + D.open * 4, 9, -0.7, 0.8, 1.5, ph, C.m, C.md, 2);

    // the head itself, one pixel at a time inside its bounding box
    const R = Math.ceil(28 * D.scale), x0 = Math.round(q.x) - R, y0 = Math.round(q.y) - R, N = R * 2 + 1;
    const grid = new Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const [u, v] = T.from(x0 + i + 0.5, y0 + j + 0.5);
      if (u < -26 || u > 26 || v < -22 || v > 14) continue;
      grid[j * N + i] = headAt(u, v, D.open, D.glow);
    }
    const col = { k: C.k, b: C.b, bd: C.bd, bl: C.bl, c: C.c, cd: C.cd, h: C.h, hd: C.hd, e: D.glow > 0.5 ? '#fff6a0' : C.e, p: C.p, t: C.t, mouth: C.mouth, tongue: C.tongue };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let key = grid[j * N + i];
      if (!key) {
        const near = (i > 0 && grid[j * N + i - 1]) || (i < N - 1 && grid[j * N + i + 1]) || (j > 0 && grid[(j - 1) * N + i]) || (j < N - 1 && grid[(j + 1) * N + i]);
        if (!near) continue;
        key = 'k';
      }
      c.fillStyle = col[key];
      c.fillRect(x0 + i, y0 + j, 1, 1);
    }
    // fire gathering in the open mouth
    if (D.fire > 0) {
      const m = T.to(21, LIP + 1 + D.open * 3);
      const r = 1 + D.fire * 7 + Math.sin(G.t * 30) * D.fire;
      pxCircle(c, m.x, m.y, r + 2, '#ff5a2a'); pxCircle(c, m.x, m.y, r, '#ffb03a'); pxCircle(c, m.x, m.y, r * 0.55, '#fff3a0');
      if (Math.random() < 0.6) particles(m.x, m.y, 1, { colors: FIRE, speed: 25, grav: -30, life: 0.3 });
    }
    if (D.glow > 0 && Math.random() < 0.5 * D.glow) {
      const e = T.to(6, -3.3);
      particles(e.x, e.y, 1, { colors: ['#fff6a0', '#ffffff'], speed: 10, grav: 0, life: 0.25, size: 1 });
    }
  }

  function draw(c, D) {
    grow(D);
    if (D.len < 1 && D.alpha <= 0) return;
    const pts = spine(D);
    c.globalAlpha = D.alpha;
    const Q = pts.length > 1 ? drawBody(c, D, pts) : [{ x: D.hx, y: D.hy, dx: D.face || 1, dy: 0 }];
    drawHead(c, D, Q[0]);
    c.globalAlpha = 1;
  }

  // Where the dragon breathes from, in screen space.
  function mouth(D) {
    const pts = spine(D), a = pts[0], b = pts[2] || { x: a.x - (D.face || 1), y: a.y };
    const L = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    return headFrame(a.x, a.y, (a.x - b.x) / L, (a.y - b.y) / L, D.scale).to(22, LIP + 1 + D.open * 3);
  }

  // ---------- flying ----------

  const bez = (P, t) => {
    const u = 1 - t;
    return P.length === 3
      ? { x: u * u * P[0].x + 2 * u * t * P[1].x + t * t * P[2].x, y: u * u * P[0].y + 2 * u * t * P[1].y + t * t * P[2].y }
      : { x: u * u * u * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t * t * t * P[3].x, y: u * u * u * P[0].y + 3 * u * u * t * P[1].y + 3 * u * t * t * P[2].y + t * t * t * P[3].y };
  };
  // Steers the head along a path function p(k) for `ms`, optionally growing the body to `len`.
  function fly(D, path, ms, ease, len) {
    const len0 = D.len;
    return fxRun(ms, (c, k) => {
      const e = (ease || linear)(k), p = path(e);
      D.hx = p.x; D.hy = p.y;
      if (len !== undefined) D.len = lerp(len0, len, k);
    });
  }

  // Starts drawing a dragon (above the fighters) until D.stop() is called.
  function summon(x, y) {
    const D = make(x, y);
    const layer = { t: 0, dur: 1e9, draw: c => draw(c, D), res: () => {} };
    FX.list.push(layer);
    D.stop = () => { layer.dur = 0; };
    // brings the dragon back in front of effects started after it (like a darkened sky)
    D.raise = () => { const i = FX.list.indexOf(layer); if (i >= 0) { FX.list.splice(i, 1); FX.list.push(layer); } };
    return D;
  }

  function puff(x, y, n) {
    particles(x, y, n || 16, { colors: [C.cl, C.cl2, C.cl3], speed: 70, grav: -10, life: 0.6, size: 3 });
  }

  // The hero bursts into the dragon, which shoots out along the `path` (from the hero).
  async function transform(path, ms) {
    const hc = heroC();
    Sfx.play('haki');
    const swirl = fxRun(320, (c, k) => {
      for (let i = 0; i < 10; i++) {
        const a = G.t * 9 + i * 0.63, r = 22 * (1 - k) + 6;
        pxRect(c, hc.x + Math.cos(a) * r, hc.y + Math.sin(a) * r * 0.7, 2, 2, i % 2 ? C.bl : C.cl);
      }
      if (Math.random() < 0.5) zigzag(c, hc.x + rand(-10, 10), hc.y - 22, hc.x + rand(-6, 6), hc.y + 10, 4, 3, '#7cd0ff', 1);
    });
    G.hero.flash = 0.2;
    await swirl;
    Sfx.play('boom');
    screenFlash('#bfe6ff', 0.6);
    shake(4, 300);
    puff(hc.x, hc.y, 22);
    G.hero.alpha = 0;
    const D = summon(hc.x, hc.y);
    await fly(D, path, ms, easeOut, FULL);
    return D;
  }

  // The dragon dives back into the hero and shrinks away in a puff of cloud.
  async function revert(D, ms) {
    ms = ms || 420;
    const hc = heroC(), from = { x: D.hx, y: D.hy };
    await fly(D, k => bez([from, { x: lerp(from.x, hc.x, 0.5), y: Math.min(from.y, hc.y) - 40 }, hc], k), ms, easeIn, 0);
    D.stop();
    puff(hc.x, hc.y, 18);
    Sfx.play('stretch');
    await tween(G.hero, { alpha: 1 }, 140);
  }

  async function roar(D, ms) {
    Sfx.play('boom');
    await tween(D, { open: 1 }, 120);
    shake(5, ms || 400);
    const hc = { x: D.hx, y: D.hy };
    fxRun(ms || 400, (c, k) => { for (let i = 0; i < 3; i++) pxRing(c, hc.x, hc.y, 12 + ((k * 3 + i / 3) % 1) * 46, i % 2 ? '#ffffff' : C.bl, 1); });
    await wait(ms || 400);
    await tween(D, { open: 0 }, 160);
  }

  // A bright lightning bolt from the top of the screen down to (x, y).
  function bolt(x, y) {
    Sfx.play('zap');
    const pts = [];
    let px = x + rand(-16, 16);
    for (let yy = VIEW.y; yy < y; yy += 9) { pts.push([px, yy]); px = x + rand(-10, 10) * (1 - (yy - VIEW.y) / (y - VIEW.y)); }
    pts.push([x, y]);
    return fxRun(300, (c, k) => {
      if (k > 0.7 && Math.floor(k * 20) % 2) return;
      for (let i = 0; i < pts.length - 1; i++) {
        pxLine(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#7cd0ff', 4);
        pxLine(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#ffffff', 2);
      }
    });
  }

  // Three huge claw marks raking across `pos`.
  function claws(pos, ms) {
    Sfx.play('slash');
    return fxRun(ms || 300, (c, k) => {
      const e = easeOut(Math.min(1, k * 2.4)), fade = Math.max(0, (k - 0.45) / 0.55);
      for (let j = 0; j < 3; j++) {
        const ox = (j - 1) * 9, x0 = pos.x - 18 + ox, y0 = pos.y - 26, x1 = pos.x + 12 + ox, y1 = pos.y + 22;
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          if (t > e || t < fade) continue;
          const x = lerp(x0, x1, t) + Math.sin(t * Math.PI) * 5, y = lerp(y0, y1, t), w = Math.max(1, Math.round(Math.sin(t * Math.PI) * 4));
          pxRect(c, x - w / 2 - 1, y - w / 2, w + 2, w, C.bd);
          pxRect(c, x - w / 2, y - w / 2, w, w, '#bfe6ff');
          if (w > 1) pxRect(c, x, y - w / 2, 1, w, '#ffffff');
        }
      }
    });
  }

  // A cone of fire from `from` that reaches `to`; returns when the flames die down.
  // `pal` swaps the five layers (edge to core) for sand, gas or anything else that billows.
  const FLAME_PAL = ['#a8200f', '#ff5a2a', '#ff9a3a', '#ffd04a', '#fff6c8'];
  function flames(from, to, ms, width, onHit, pal) {
    pal = pal || FLAME_PAL;
    let hit = false;
    Sfx.play('fire');
    return fxRun(ms, (c, k) => {
      const reach = Math.min(1, k * 3), dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, fade = k > 0.8 ? (1 - k) / 0.2 : 1;
      // one jet of fire: every layer is laid down along the whole length before the next,
      // and the width flickers so the edges lick and curl
      const P = [];
      for (let s = 0; s < L * reach; s += 2) {
        const t = s / L, fl = Math.sin(s * 0.5 - G.t * 47) * 0.5 + Math.sin(s * 0.23 + G.t * 31) * 0.5;
        const w = (2 + t * width) * fade * (1 + fl * 0.22), wob = Math.sin(s * 0.3 - G.t * 36) * (1 + t * 3);
        P.push({ x: from.x + ux * s + nx * wob, y: from.y + uy * s + ny * wob, w });
      }
      [1.18, 1, 0.72, 0.45, 0.2].forEach((f, li) => {
        for (const q of P) if (q.w * f >= 1) pxCircle(c, q.x, q.y, q.w * f, pal[li]);
      });
      if (Math.random() < 0.9) {
        const q = P[Math.floor(Math.random() * P.length)];
        if (q) FX.parts.push({ x: q.x + nx * q.w, y: q.y + ny * q.w, vx: ux * 60 + nx * rand(-30, 30), vy: uy * 60 - 40, grav: -30, life: 0.4, max: 0.4, color: pick(pal.slice(1)), size: 2 });
      }
      if (reach >= 1) {
        for (let i = 0; i < 3; i++) FX.parts.push({ x: to.x + rand(-6, 6), y: to.y + rand(-8, 8), vx: rand(-40, 60) * Math.sign(ux || 1), vy: rand(-70, -10), grav: -20, life: 0.5, max: 0.5, color: pick(pal.slice(1)), size: 3 });
        if (!hit) { hit = true; onHit && onHit(); }
      }
    });
  }

  // ---------- moves ----------

  Object.assign(MOVE_FX, {
    // Dragon Claw: the dragon bursts out, arcs over and rakes the foe, then coils back into you.
    dragonclaw: async m => {
      const hc = heroC(), fc = fc0();
      const D = await transform(k => bez([hc, { x: hc.x - 30, y: hc.y - 120 }, { x: fc.x - 90, y: fc.y - 110 }, { x: fc.x - 46, y: fc.y - 54 }], k), 620);
      await fly(D, k => bez([{ x: fc.x - 46, y: fc.y - 54 }, { x: fc.x - 20, y: fc.y - 10 }, { x: fc.x + 30, y: fc.y + 4 }], k), 200, easeIn);
      const rake = claws(fc, 320);
      m.hit(0);
      impact(fc, ['#ffffff', '#bfe6ff', '#3c8ad8'], 16);
      shake(5, 260);
      await fly(D, k => bez([{ x: fc.x + 30, y: fc.y + 4 }, { x: fc.x + 70, y: fc.y - 20 }, { x: fc.x + 30, y: fc.y - 90 }], k), 300, easeOut);
      await rake;
      await revert(D, 440);
    },

    // Blaze Breath: rises over the battlefield, fire swells in its jaws, and it pours flame on the foe.
    dragonbreath: async m => {
      const hc = heroC(), fc = fc0(), perch = { x: hc.x + 4, y: VIEW.y + 44 };
      const D = await transform(k => bez([hc, { x: hc.x + 70, y: hc.y - 40 }, { x: hc.x + 90, y: VIEW.y + 10 }, perch], k), 760);
      await fly(D, k => ({ x: perch.x + Math.sin(k * Math.PI) * 8, y: perch.y - Math.sin(k * Math.PI) * 6 }), 260);
      Sfx.play('charge');
      tween(D, { open: 1 }, 220);
      await tween(D, { fire: 1, glow: 1 }, 480);
      D.fire = 0;
      screenFlash('#ff9a3a', 0.45);
      shake(6, 700);
      const from = mouth(D);
      await flames(from, { x: fc.x, y: fc.y + 4 }, 820, 16, () => { m.hit(0); impact(fc, FIRE, 18); });
      await tween(D, { open: 0, glow: 0 }, 160);
      await revert(D, 460);
    },

    // Dragon Twister: the dragon spirals around the foe, whipping up a tornado that hurls it skyward.
    dragontwister: async m => {
      const hc = heroC(), F = G.battle.F, fc = fc0(), base = 124;
      const D = await transform(k => bez([hc, { x: hc.x + 20, y: hc.y - 60 }, { x: fc.x - 60, y: base - 10 }, { x: fc.x - 40, y: base - 6 }], k), 520);
      Sfx.play('boom');
      const R = (k, turns) => {
        const a = Math.PI + k * Math.PI * 2 * turns;
        return { x: fc.x + Math.cos(a) * (40 - k * 10), y: base - 6 - k * 110 + Math.sin(a) * 9 };
      };
      const wind = fxRun(1500, (c, k) => {
        // a funnel of wind: four helical bands, bright on the near side and dim behind
        const grow = Math.min(1, k * 2.5) * (k > 0.85 ? (1 - k) / 0.15 : 1);
        for (let band = 0; band < 4; band++) {
          for (let i = 0; i < 46; i++) {
            const h = i / 46, a = G.t * 13 + h * 11 + band * Math.PI / 2, r = (6 + h * h * 38) * grow;
            const x = fc.x + Math.cos(a) * r, y = base - h * 140 * grow, front = Math.sin(a) > -0.2;
            c.globalAlpha = front ? 0.85 : 0.35;
            pxRect(c, x, y, front ? 3 : 2, front ? 2 : 1, front ? (band % 2 ? '#ffffff' : '#d8ecff') : '#9ac4ec');
          }
        }
        c.globalAlpha = 1;
        if (Math.random() < 0.5) particles(fc.x + rand(-30, 30), base, 1, { colors: ['#c9b88a', '#9a8a6a'], speed: 60, grav: -60, dir: -Math.PI / 2, spread: 0.8, life: 0.6 });
      });
      const up = tween(F, { oy: -54, squash: -0.15 }, 900, easeOut);
      await fly(D, k => R(k, 2.2), 1000, linear);
      await up;
      m.hit(0);
      focusLines(foeC(), '#ffffff', 260);
      impact(foeC(), ['#ffffff', '#bfe6ff'], 22);
      shake(8, 420);
      await fly(D, k => bez([{ x: D.hx, y: D.hy }, { x: fc.x + 30, y: VIEW.y }, { x: hc.x + 40, y: VIEW.y + 20 }], k), 360, easeOut);
      await tween(F, { oy: 0, squash: 0.3 }, 200, easeIn);
      Sfx.play('boom');
      shake(6, 300);
      particles(fc.x, base - 2, 20, { colors: ['#c9b88a', '#e8d9b0', '#9a8a6a'], speed: 80, grav: 90, dir: -Math.PI / 2, spread: 2.2 });
      tween(F, { squash: 0 }, 200);
      await wind;
      await revert(D, 440);
    },

    // Thunder Bagua (awakened): storm clouds roll in, you leap over the foe in hybrid form, a bolt
    // charges your club, and you bring it down with a crack of thunder.
    thunderbagua: async m => {
      const fc = fc0(), F = G.battle.F;
      const club = getSprite({ kind: 'weapon', shape: 'kanabo', pal: { g: '#3a3440', w: '#c9ccd6' } });
      hold(true);
      Sfx.play('charge');
      const storm = fxRun(2300, (c, k) => {
        const a = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
        c.globalAlpha = 0.9 * a;
        for (let x = VIEW.x - 10; x < VIEW.x + VIEW.w + 14; x += 14) {
          const y = VIEW.y + 4 + Math.sin(x * 0.13 + G.t) * 4;
          pxCircle(c, x, y, 13, '#23233a'); pxCircle(c, x + 6, y + 7, 9, '#34344e');
        }
        c.globalAlpha = 1;
        if (Math.random() < 0.18) zigzag(c, rand(VIEW.x, VIEW.x + VIEW.w), VIEW.y + 12, rand(VIEW.x, VIEW.x + VIEW.w), VIEW.y + 30, 3, 4, '#bfe6ff', 1);
      });
      const raised = () => ({ x: G.hero.x + G.hero.ox + 10, y: 121 + G.hero.oy - 44 });
      await tween(G.hero, { ox: 4, squash: 0.22 }, 220);
      Sfx.play('stretch');
      const lift = fxRun(260, c => { const t = raised(); drawRot(c, club, t.x, t.y + 10, -0.5, 3); });
      await tween(G.hero, { ox: 58, oy: -64, squash: -0.15 }, 260, easeOut);
      await lift;
      bolt(raised().x, raised().y);
      screenFlash('#fff6a0', 0.5);
      await fxRun(520, c => {
        const t = raised();
        drawRot(c, club, t.x, t.y + 10, -0.5, 3);
        for (let i = 0; i < 4; i++) zigzag(c, t.x - 12 + i * 8, t.y - 12, t.x - 8 + i * 8, t.y + 26, 4, 3, i % 2 ? '#ffffff' : '#7cd0ff', 1);
        pxRing(c, t.x, t.y + 8, 15 + Math.sin(G.t * 30) * 3, '#ffe14a', 1);
      });
      Sfx.play('slash');
      const piv = { x: G.hero.x + G.hero.ox + 6, y: 121 + G.hero.oy - 26 }, a0 = -2.0, a1 = 1.0;
      arcSweep(piv.x, piv.y, 36, a0, a1, '#ffe14a', 220, 5);
      tween(G.hero, { ox: 72, oy: -18 }, 200, easeIn);
      await fxRun(200, (c, k) => { const a = lerp(a0, a1, easeIn(k)); drawRot(c, club, piv.x + Math.cos(a) * 22, piv.y + Math.sin(a) * 22, a + Math.PI / 2, 3); });
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 1);
      bolt(fc.x, fc.y + 10);
      focusLines(fc, '#fff6a0', 380);
      for (let i = 0; i < 3; i++) ringOut({ x: fc.x, y: 120 }, i % 2 ? '#7cd0ff' : '#ffe14a', 4, 46 + i * 16, 540, 2);
      groundCrack(fc.x - 56, fc.x + 56, '#1b1424', 300);
      particles(fc.x, fc.y, 40, { colors: ['#ffe14a', '#7cd0ff', '#ffffff'], speed: 140 });
      particles(fc.x, 118, 18, { colors: ['#c9b88a', '#9a8a6a'], speed: 90, grav: 140, dir: -Math.PI / 2, spread: 1.6, size: 3 });
      shake(12, 700);
      F.squash = 0.35;
      tween(F, { squash: 0 }, 400);
      await wait(260);
      hold(false);
      await tween(G.hero, { ox: 0, oy: 0, squash: 0 }, 300);
      await storm;
    },

    // Bolo Breath (awakened): the full dragon looms over the sky, a sun of fire builds in its jaws,
    // and a colossal heat beam erases everything in front of it.
    bolobreath: async m => {
      const hc = heroC(), fc = fc0(), perch = { x: hc.x - 6, y: VIEW.y + 40 };
      const D = await transform(k => bez([hc, { x: hc.x - 60, y: hc.y - 50 }, { x: hc.x - 40, y: VIEW.y }, perch], k), 820);
      D.scale = 1;
      tween(D, { scale: 1.25 }, 300);
      await roar(D, 360);
      Sfx.play('charge');
      fxRun(2300, (c, k) => { c.globalAlpha = 0.4 * Math.sin(Math.min(1, k * 1.3) * Math.PI); pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#2a0400'); c.globalAlpha = 1; });
      D.raise();
      tween(D, { open: 1, glow: 1 }, 300);
      const gather = fxRun(650, (c, k) => {
        const mp = mouth(D);
        for (let i = 0; i < 14; i++) { const a = i * 0.45 + G.t * 3, r = 40 * (1 - k) + 6; pxRect(c, mp.x + Math.cos(a) * r, mp.y + Math.sin(a) * r, 2, 2, i % 2 ? '#ffd04a' : '#ffffff'); }
      });
      await tween(D, { fire: 1.6 }, 650);
      await gather;
      D.fire = 0;
      Sfx.play('fire');
      screenFlash('#fff3a0', 0.9);
      shake(12, 1000);
      const from = mouth(D), to = { x: fc.x + 4, y: fc.y };
      let hit = false;
      await fxRun(1000, (c, k) => {
        const reach = Math.min(1, k * 4), fade = k > 0.75 ? (1 - k) / 0.25 : 1;
        const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        const end = L * reach + (reach >= 1 ? 60 : 0);
        for (let s = 0; s < end; s += 2) {
          const w = (5 + Math.min(s, 50) * 0.28) * fade * (1 + Math.sin(s * 0.4 - G.t * 50) * 0.08);
          const x = from.x + ux * s, y = from.y + uy * s;
          pxRect(c, x - nx * (w + 2) - 1, y - ny * (w + 2) - 1, 3, 3, '#a0200f');
          pxRect(c, x + nx * (w + 2) - 1, y + ny * (w + 2) - 1, 3, 3, '#a0200f');
          pxLine(c, x - nx * w, y - ny * w, x + nx * w, y + ny * w, '#ff5a2a', 2);
          pxLine(c, x - nx * w * 0.65, y - ny * w * 0.65, x + nx * w * 0.65, y + ny * w * 0.65, '#ffb03a', 2);
          pxLine(c, x - nx * w * 0.3, y - ny * w * 0.3, x + nx * w * 0.3, y + ny * w * 0.3, '#fff6c8', 2);
        }
        pxCircle(c, from.x, from.y, 9 * fade + 2, '#fff3a0');
        if (reach >= 1) {
          pxCircle(c, to.x, to.y, (18 + Math.sin(G.t * 40) * 3) * fade, '#ff9a3a');
          pxCircle(c, to.x, to.y, 11 * fade, '#fff3a0');
          if (!hit) { hit = true; m.hit(0); focusLines(to, '#fff3a0', 400); }
          if (Math.random() < 0.8) particles(to.x, to.y, 3, { colors: FIRE, speed: 140, grav: -20, size: 3, life: 0.5 });
        }
      });
      if (!hit) m.hit(0);
      Sfx.play('boom');
      screenFlash('#ff9a3a', 0.6);
      for (let i = 0; i < 3; i++) ringOut(to, i % 2 ? '#ffd04a' : '#ff5a2a', 6, 50 + i * 16, 500, 2);
      particles(to.x, to.y, 40, { colors: FIRE.concat(['#3a2a2a']), speed: 150, grav: 40, size: 3 });
      await tween(D, { open: 0, glow: 0, scale: 1 }, 260);
      await revert(D, 480);
    },
  });

  // The dragon flourish when the Dragon-Dragon Fruit awakens: it spirals up out of you through
  // a storm, roars, and lightning strikes all around before it coils back in.
  window.dragonAwaken = async () => {
    const hc = heroC();
    const D = await transform(k => {
      const a = k * Math.PI * 3;
      return { x: hc.x + 30 + Math.sin(a) * 50 * (0.4 + k * 0.6), y: lerp(hc.y, VIEW.y + 46, k) };
    }, 900);
    roar(D, 500);
    for (let i = 0; i < 4; i++) { bolt(hc.x + rand(-60, 120), 120); await wait(120); }
    await wait(200);
    await revert(D, 420);
  };
  // Emperor Drakko's dragon form, drawn in place of his sprite once he transforms: the head is
  // where his body would be, and the rest coils up and away into the sky behind him.
  const bossDragon = F => {
    if (!F.dragon) { F.dragon = make(0, 0); F.dragon.len = FULL; }
    const D = F.dragon;
    D.scale = 1.35;
    D.path = s => ({
      x: D.hx + s * 0.55 + Math.sin(s * 0.035 + G.t * 0.9) * 16 * Math.min(1, (s / 45) ** 2),
      y: D.hy - s * 0.42 + Math.sin(s * 0.05 - G.t * 1.3) * 12 * Math.min(1, (s / 45) ** 2),
    });
    return D;
  };
  window.drawBossDragon = (c, F) => {
    const D = bossDragon(F), p = foeC();
    D.hx = p.x + Math.round(F.kx || 0) - 4;
    D.hy = p.y;
    D.alpha = F.alpha;
    D.open = F.charging ? 0.55 + Math.sin(G.t * 10) * 0.2 : Math.max(0, D.open - 0.05);
    D.glow = F.charging || F.flash > 0 ? 1 : 0;
    D.fire = F.charging ? 0.6 + Math.sin(G.t * 20) * 0.2 : 0;
    draw(c, D);
  };
  // His transformation: a storm of cloud and lightning, and the dragon uncoils out of it.
  window.bossDragonRise = async F => {
    const p = foeC();
    puff(p.x, p.y, 30);
    const D = bossDragon(F);
    D.len = 0;
    for (let i = 0; i < 3; i++) bolt(p.x + rand(-50, 60), 120);
    shake(8, 900);
    await tween(D, { len: FULL }, 800, easeOut);
    Sfx.play('boom');
    await tween(D, { open: 1 }, 140);
    fxRun(500, (c, k) => { for (let i = 0; i < 3; i++) pxRing(c, D.hx, D.hy, 14 + ((k * 3 + i / 3) % 1) * 56, i % 2 ? '#ffffff' : C.bl, 1); });
    await wait(500);
  };
  // Shared with the bosses' attacks in game.js.
  window.flameJet = flames;
  window.skyBolt = bolt;
  window.dragonClaws = claws;
  window.dragonMouthOf = F => (F.dragon && F.spr === F.info.phase2.spr ? mouth(F.dragon) : null);
  window.DRAGON_COLORS = C;
}
