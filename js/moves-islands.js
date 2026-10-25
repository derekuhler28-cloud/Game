'use strict';
/* Move animations for the weapons found from Water 7 to Whole Cake Island. Each move is staged like
   an anime cut: a wind-up, a clear travelling motion, a heavy impact, and a follow-through. */
{
  // ---------- drawing helpers (block-scoped so they can't clash with other files) ----------

  const k01 = v => Math.max(0, Math.min(1, v));
  // rises to 1 over the first `a` of k, holds, and falls back to 0 over the last `b`
  const env = (k, a, b) => k01(Math.min(k / a, (1 - k) / b));
  const easeIO = k => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
  const foeHp = () => G.battle.F.hp > 0;
  const wImg = key => getSprite(weaponSpec(key));
  const qb = (a, b, c, t) => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * b.x + t * t * c.x, y: u * u * a.y + 2 * u * t * b.y + t * t * c.y }; };
  const path = (n, f) => { const P = []; for (let i = 0; i <= n; i++) P.push(f(i / n)); return P; };

  // Layered strokes: every path's dark rim first, then every main body, then every bright core, so the
  // joints between the pieces of one object stay clean. `list` holds [points, width or width(t)].
  function strokeAll(c, list, cols) {
    for (let L = 0; L < cols.length; L++) {
      if (!cols[L]) continue;
      for (const [P, w] of list) {
        const n = P.length - 1;
        for (let i = 1; i <= n; i++) {
          const b = Math.round(typeof w === 'function' ? w(i / n) : w);
          const lw = L === 0 ? b + 2 : L === 1 ? b : (b > 1 ? Math.max(1, b - 2) : 0);
          if (lw >= 1) pxLine(c, P[i - 1].x, P[i - 1].y, P[i].x, P[i].y, cols[L], lw);
        }
      }
    }
  }
  const stroke = (c, P, cols, w) => strokeAll(c, [[P, w]], cols);

  // An ellipse outline (rings along the ground, loops of rope), optionally just the arc a0..a1.
  function ellRing(c, cx, cy, rx, ry, col, t, a0, a1) {
    if (rx < 0.5) return;
    t = t || 1; a0 = a0 || 0; a1 = a1 === undefined ? Math.PI * 2 : a1;
    c.fillStyle = col;
    const n = Math.max(6, Math.round(Math.max(rx, ry) * 6.5 * Math.abs(a1 - a0) / (Math.PI * 2))), o = Math.floor(t / 2);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      c.fillRect(Math.round(cx + Math.cos(a) * rx) - o, Math.round(cy + Math.sin(a) * ry) - o, t, t);
    }
  }

  function ellFill(c, cx, cy, rx, ry, col) {
    if (rx < 0.5 || ry < 0) return;
    c.fillStyle = col;
    cx = Math.round(cx); cy = Math.round(cy);
    const R = Math.round(ry);
    for (let dy = -R; dy <= R; dy++) {
      const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
      c.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  // A shaded ball: dark rim, body, lit side and a white glint. cols = [rim, body, light].
  function orb(c, x, y, r, cols) {
    pxCircle(c, x, y, r + 1, cols[0]);
    pxCircle(c, x, y, r, cols[1]);
    if (r >= 2) pxCircle(c, x - r * 0.3, y - r * 0.3, r * 0.5, cols[2]);
    pxRect(c, x - r * 0.5, y - r * 0.5, 1, 1, '#ffffff');
  }

  // A four-point twinkle.
  function glint(c, x, y, r, col) {
    col = col || '#ffffff';
    pxLine(c, x - r, y, x + r, y, col, 1);
    pxLine(c, x, y - r, x, y + r, col, 1);
    if (r >= 5) { const d = r * 0.35; pxLine(c, x - d, y - d, x + d, y + d, col, 1); pxLine(c, x - d, y + d, x + d, y - d, col, 1); }
    pxRect(c, x - 1, y - 1, 3, 3, col);
    pxRect(c, x, y, 1, 1, '#ffffff');
  }

  // An anime blade smear: a crescent swept from angle a0 to a1 around (cx, cy). It is thickest just
  // behind its leading edge, with a dark rim, the main colour and a bright cutting edge on the outside,
  // and it thins away from its tail. `sq` < 1 flattens it into a sideways sweep seen from the side.
  function crescent(cx, cy, r, a0, a1, cols, ms, thick, sq) {
    sq = sq || 1;
    return fxRun(ms, (c, k) => {
      const head = easeOut(k01(k * 1.7)), tail = Math.max(head - 0.8, k01((k - 0.3) / 0.7)), fade = 1 - 0.6 * k01((k - 0.55) / 0.45);
      if (head - tail < 0.01) return;
      const steps = Math.max(4, Math.ceil(Math.abs(a1 - a0) * (head - tail) * (r + 2)));
      for (let L = 0; L < 3; L++) {
        for (let i = 0; i <= steps; i++) {
          const u = i / steps, a = a0 + (a1 - a0) * (tail + (head - tail) * u);
          const w = thick * fade * Math.min(u * 1.3, (1 - u) * 4 + 0.3);
          if (w < 0.7) continue;
          const ca = Math.cos(a), sa = Math.sin(a) * sq;
          const r0 = L === 0 ? r - w - 1 : L === 1 ? r - w : r - Math.max(1, w * 0.35), r1 = L === 0 ? r + 1 : r;
          pxLine(c, cx + ca * r0, cy + sa * r0, cx + ca * r1, cy + sa * r1, cols[L], 1);
        }
      }
    });
  }

  // An expanding shock ring; `sq` flattens it (about 0.25 for a ring running along the ground).
  function shock(pos, cols, r0, r1, ms, thick, sq) {
    sq = sq || 1;
    return fxRun(ms, (c, k) => {
      if (k > 0.75 && Math.floor(k * 30) % 2) return;
      const r = lerp(r0, r1, easeOut(k)), t = Math.max(1, Math.round((thick || 2) * (1 - k * 0.6)));
      ellRing(c, pos.x, pos.y, r, r * sq, cols[0], t + 1);
      ellRing(c, pos.x, pos.y, r, r * sq, cols[1] || '#ffffff', Math.max(1, t - 1));
    });
  }

  // Speed streaks sliding along between heights y0 and y1 (dir 1 = toward +x).
  function streaks(c, k, y0, y1, n, col, dir, x0, x1) {
    x0 = x0 === undefined ? VIEW.x : x0; x1 = x1 === undefined ? VIEW.x + VIEW.w : x1;
    for (let i = 0; i < n; i++) {
      const y = y0 + ((i * 0.618) % 1) * (y1 - y0), len = 8 + (i * 7) % 16;
      let f = (i * 0.37 + k * 2.2) % 1;
      if (dir < 0) f = 1 - f;
      pxRect(c, lerp(x0, x1, f) - len / 2, y, len, 1, col);
    }
  }

  // Sparks rushing in toward a point (a charge-up). `pos` may be a function.
  function gather(pos, cols, ms, r, n) {
    n = n || 10; r = r || 30;
    return fxRun(ms, (c, k) => {
      const p = typeof pos === 'function' ? pos() : pos;
      for (let i = 0; i < n; i++) {
        const f = k * 1.6 + i / n, q = f % 1, a = i * 2.4 + Math.floor(f) * 1.3, d = r * (1 - easeIn(q)) + 2, l = 2 + 5 * (1 - q);
        const ca = Math.cos(a), sa = Math.sin(a);
        pxLine(c, p.x + ca * d, p.y + sa * d, p.x + ca * (d + l), p.y + sa * (d + l), cols[i % cols.length], 1);
      }
    });
  }

  // A swelling ball of fire (or any colours, rim first) that cools into smoke and thins away.
  function blast(pos, r, ms, cols) {
    cols = cols || ['#a8200f', '#ff5a2a', '#ffb03a', '#fff3a0'];
    const lumps = [0, 1, 2, 3, 4].map(i => ({ a: i * 1.26 + rand(0, 0.6), d: rand(0.45, 0.7), s: rand(0.4, 0.6) }));
    return fxRun(ms || 420, (c, k) => {
      const cool = k01((k - 0.3) / 0.7);
      if (cool > 0.8 && Math.floor(k * 30) % 2) return;
      const R = r * (0.35 + 0.65 * easeOut(k01(k * 2.5))) * (1 + cool * 0.2), up = cool * r * 0.5, n = cols.length;
      for (let i = 0; i < n; i++) {
        const rr = R * (1 - i / n) * (i ? 1 - cool : 1 - cool * 0.5), y = pos.y - up * (i / n);
        if (rr < 1) continue;
        pxCircle(c, pos.x, y, rr, cols[i]);
        for (const L of lumps) pxCircle(c, pos.x + Math.cos(L.a) * rr * L.d, y + Math.sin(L.a) * rr * L.d * 0.8, rr * L.s, cols[i]);
      }
    });
  }

  // An effect step that resolves like fxRun, but whose last frame lingers one more frame. The await
  // that chains the next step resumes after the frame is drawn, so a plain fxRun would leave a blank
  // frame between steps and a prop drawn by both would blink.
  function step(ms, draw) {
    return new Promise(res => FX.list.push({ t: 0, dur: ms, draw, res: () => { FX.list.push({ t: 0, dur: 1, draw: c => draw(c, 1), res: () => {} }); res(); } }));
  }

  // Draws a prop every frame until stop() is called (for things that live across several steps).
  function layer(draw) {
    const L = { t: 0, dur: 1e9, draw: c => draw(c), res: () => {} };
    FX.list.push(L);
    return () => { L.dur = 0; };
  }

  // Tints the whole screen for `ms`, easing in and out.
  const tint = (col, a, ms) => fxRun(ms, (c, k) => { c.globalAlpha = a * env(k, 0.15, 0.3); pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, col); c.globalAlpha = 1; });

  const smoke = (x, y, n, cols, spd) => particles(x, y, n, { colors: cols || SMOKE, speed: spd || 30, grav: -35, life: 0.8, size: 3 });
  const rocks = (x, y, n, cols) => particles(x, y, n, { colors: cols || ['#8a7a5a', '#5a4a3a', '#c9b88a'], speed: 130, grav: 320, dir: -Math.PI / 2, spread: 1.8, size: 2, life: 0.8 });
  const puff = (x, n) => particles(x, 118, n || 8, { colors: ['#e8d9b0', '#c9b88a', '#ffffff'], speed: 45, grav: -10, dir: -Math.PI / 2, spread: 2.8, life: 0.4 });
  const splash = (x, y, n, up) => particles(x, y, n, { colors: ['#2f8fd0', '#7cc8f0', '#e6f8ff', '#ffffff'], speed: up ? 130 : 95, grav: 280, dir: up ? -Math.PI / 2 : null, spread: up ? 1.3 : Math.PI * 2, size: 2, life: 0.7 });
  const lava = (x, y, n, spd) => particles(x, y, n, { colors: ['#ff5a2a', '#ffb03a', '#c0301a', '#fff3a0'], speed: spd || 110, grav: 280, size: 3, life: 0.7, dir: -Math.PI / 2, spread: 2.6 });
  const stars = (c, x, y) => { for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.09; glint(c, x + Math.cos(a) * 10, y + Math.sin(a) * 3, 2, '#ffe14a'); } };

  // the hero: anticipation, a dash with a stretch, and a full return to rest
  const crouch = (ms, ox) => tween(G.hero, { ox: ox === undefined ? -5 : ox, squash: 0.2 }, ms || 110);
  const dash = (ox, ms, oy) => tween(G.hero, { ox, oy: oy || 0, squash: -0.12 }, ms || 110, easeIn);
  const settle = ms => tween(G.hero, { ox: 0, oy: 0, squash: 0, alpha: 1 }, ms || 220);
  // a weapon sprite held at pivot (px, py), pointing along angle a, `r` px out from the pivot
  const wield = (c, img, px, py, a, r, s) => drawRot(c, img, px + Math.cos(a) * r, py + Math.sin(a) * r, a + Math.PI / 2, s || 2);
  // Soru: vanish in a kick of dust and reappear at `ox` in a blink
  async function soru(ox, ms) {
    const hero = G.hero, x0 = hero.x + hero.ox;
    puff(x0, 10);
    Sfx.play('miss');
    fxRun(180, (c, k) => { for (let i = 0; i < 3; i++) pxRect(c, x0 - 8 + i * 6, 96 + i * 7, 6 * (1 - k) + 1, 1, '#ffffff'); });
    await tween(hero, { ox, squash: -0.1 }, ms || 70, easeIn);
    puff(hero.x + hero.ox, 6);
    hero.squash = 0.12;
    tween(hero, { squash: 0 }, 120);
  }

  // ---------- props ----------

  const ROPE = ['#4a321a', '#c9a26a', '#f0dcaa'];
  // a braided rope: dark edge, tan body and little light twists
  function rope(c, P, w) {
    stroke(c, P, [ROPE[0], ROPE[1]], w || 2);
    for (let i = 1; i < P.length; i += 2) pxRect(c, P[i].x - 1, P[i].y - 1, 1, 1, ROPE[2]);
  }

  const STEEL = ['#2a2433', '#9aa4b1', '#e8eef8'];
  // an iron chain from a to b: round links and edge-on links, with a sag and an optional travelling wave
  function links(c, a, b, sag, wave) {
    const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * (sag || 0) + (wave ? Math.sin(t * 9 - G.t * 25) * wave * Math.sin(t * Math.PI) : 0);
      if (i % 2) { pxRect(c, x - 2, y - 1, 4, 3, STEEL[0]); pxRect(c, x - 1, y, 2, 1, STEEL[1]); }
      else { pxCircle(c, x, y, 2, STEEL[0]); pxRing(c, x, y, 1, STEEL[1], 1); pxRect(c, x - 1, y - 1, 1, 1, STEEL[2]); }
    }
  }

  const spikeBall = (c, x, y, r) => {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + G.t * 2, ex = x + Math.cos(a) * (r + 3), ey = y + Math.sin(a) * (r + 3);
      pxLine(c, x + Math.cos(a) * r, y + Math.sin(a) * r, ex, ey, PAL.k, 3);
      pxRect(c, ex, ey, 1, 1, '#c9ccd6');
    }
    pxCircle(c, x, y, r + 1, PAL.k);
    pxCircle(c, x, y, r, '#5a5a6a');
    pxCircle(c, x - r / 3, y - r / 3, r / 2.5, '#9aa4b1');
    pxRect(c, x - r / 2, y - r / 2, 1, 1, '#ffffff');
  };

  const BLUE = ['#1a2a6a', '#3b6fd6', '#8ac0ff'];
  // Franky's rocket fist (facing right) with its steel cuff and a thruster flame
  function rocketFist(c, x, y, flame) {
    if (flame > 0) {
      const f = flame * (5 + Math.sin(G.t * 60) * 2);
      pxRect(c, x - 13 - f, y - 3, f + 3, 6, '#ff5a2a'); pxRect(c, x - 12 - f * 0.6, y - 2, f * 0.6 + 2, 4, '#ffd04a'); pxRect(c, x - 12, y - 1, 2, 2, '#ffffff');
    }
    pxRect(c, x - 11, y - 5, 6, 10, STEEL[0]); pxRect(c, x - 10, y - 4, 4, 8, STEEL[1]); pxRect(c, x - 10, y - 4, 4, 1, STEEL[2]);
    pxRect(c, x - 6, y - 7, 13, 14, BLUE[0]); pxRect(c, x - 5, y - 6, 11, 12, BLUE[1]); pxRect(c, x - 5, y - 6, 11, 2, BLUE[2]);
    for (let i = 0; i < 4; i++) { pxRect(c, x + 2, y - 6 + i * 3, 4, 2, '#bfe0ff'); pxRect(c, x + 6, y - 6 + i * 3, 1, 3, BLUE[0]); }
    pxRect(c, x - 4, y + 3, 6, 2, '#bfe0ff');
  }

  const ELE = ['#2a2e3a', '#8a909c', '#c9ced8'];
  const IVORY = ['#6a5a3a', '#f2ecd8', '#ffffff', '#c9bc98'];
  // Funkfreed's trunk along spine P: thick at the base, wrinkled, with a lit top edge
  function trunk(c, P) {
    const n = P.length - 1;
    for (let L = 0; L < 3; L++) {
      for (let i = n; i >= 0; i--) {
        const t = i / n, r = 4.5 - t * 2.5, p = P[i];
        if (L === 0) pxCircle(c, p.x, p.y, r + 1, ELE[0]);
        else if (L === 1) pxCircle(c, p.x, p.y, r, ELE[1]);
        else {
          const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)], dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          let nx = -(b.y - a.y) / dl, ny = (b.x - a.x) / dl;
          if (ny > 0) { nx = -nx; ny = -ny; }
          pxRect(c, p.x + nx * r * 0.5, p.y + ny * r * 0.5, 1, 1, ELE[2]);
          if (i % 3 === 1 && r > 2) pxLine(c, p.x + nx * r * 0.8, p.y + ny * r * 0.8, p.x - nx * r * 0.6, p.y - ny * r * 0.6, '#5a606c', 1);
        }
      }
    }
    pxRect(c, P[n].x, P[n].y, 1, 1, ELE[0]);
  }

  // a charging elephant (facing right) standing at (x, y); `step` animates the legs
  function elephant(c, x, y, step, s) {
    const leg = (dx, ph) => { const up = (step + ph) % 2 ? 2 : 0; pxRect(c, x + dx * s - 1, y - 8 * s - up, 4 * s + 2, 8 * s, ELE[0]); pxRect(c, x + dx * s, y - 8 * s - up, 4 * s, 7 * s, ph ? '#6a707c' : ELE[1]); };
    leg(-8, 1); leg(3, 0);
    ellFill(c, x - 2 * s, y - 14 * s, 11 * s + 1, 7 * s + 1, ELE[0]);
    ellFill(c, x - 2 * s, y - 14 * s, 11 * s, 7 * s, ELE[1]);
    ellFill(c, x - 4 * s, y - 18 * s, 7 * s, 2 * s, ELE[2]);
    pxLine(c, x - 13 * s, y - 15 * s, x - 15 * s, y - 9 * s, ELE[0], 1);
    stroke(c, path(4, t => ({ x: x + (12 + t * 6) * s, y: y - (13 + Math.sin(t * 2.6) * 6 + t * 5) * s })), [ELE[0], ELE[1]], Math.max(2, Math.round(3 * s)));
    pxCircle(c, x + 9 * s, y - 16 * s, 6 * s + 1, ELE[0]);
    pxCircle(c, x + 9 * s, y - 16 * s, 6 * s, ELE[1]);
    ellFill(c, x + 5 * s, y - 15 * s, 3 * s, 5 * s, '#6a707c');
    pxLine(c, x + 12 * s, y - 12 * s, x + 18 * s, y - 13 * s, IVORY[1], 2);
    pxRect(c, x + 11 * s, y - 18 * s, 1, 1, '#1b1424');
    leg(-6, 0); leg(5, 1);
  }

  // Rankyaku's flying air blade: a crescent bowed toward its direction of travel (right)
  function airBlade(c, x, y, s) {
    const R = 13 * s;
    for (let L = 0; L < 3; L++) {
      for (let i = 0; i <= 26; i++) {
        const t = -1.15 + i / 26 * 2.3, w = Math.max(1, 5 * Math.cos(t) * s), ct = Math.cos(t), st = Math.sin(t) * 1.25;
        const ox = x + ct * R - R, oy = y + st * R;
        const r0 = L === 0 ? -w - 1 : L === 1 ? -w : -Math.max(1, w * 0.35), r1 = L === 0 ? 1 : 0;
        pxLine(c, ox + ct * r0, oy + st * r0, ox + ct * r1, oy + st * r1, ['#5a7aa0', '#c9e4ff', '#ffffff'][L], 1);
      }
    }
  }

  const SHU = ['#0e1a12', '#2a5a3a', '#5ab86a', '#b8ffc8'];
  // a lion's head of black shadow (facing right) with a green-lit mane, glowing eyes and open jaws
  function lionHead(c, x, y, s, open) {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + Math.sin(G.t * 14 + i) * 0.1, r = (i % 2 ? 10 : 15) * s, bx = x - 3 * s;
      const ex = bx + Math.cos(a) * r, ey = y + Math.sin(a) * r;
      pxLine(c, bx, y, ex, ey, SHU[0], 4);
      pxLine(c, bx + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, ex, ey, SHU[1], 2);
      pxRect(c, ex, ey, 1, 1, SHU[2]);
    }
    pxCircle(c, x, y, 7 * s + 1, SHU[0]);
    pxCircle(c, x, y, 7 * s, '#1b2a20');
    pxRect(c, x + 2 * s, y - open, 9 * s, open * 2 + 2, '#5a0a14');
    pxRect(c, x + 2 * s, y - 4 * s - open, 10 * s, 4 * s, SHU[0]); pxRect(c, x + 3 * s, y - 4 * s - open, 8 * s, 2, '#1b2a20');
    pxRect(c, x + 2 * s, y + 2 + open, 8 * s, 3 * s, SHU[0]);
    for (let i = 0; i < 3; i++) { pxRect(c, x + (4 + i * 2.5) * s, y - open, 1, 2, '#ffffff'); pxRect(c, x + (4 + i * 2.5) * s, y + open, 1, 2, '#ffffff'); }
    pxRect(c, x + s, y - 5 * s, 3, 2, SHU[3]);
    pxRect(c, x + 2 * s, y - 5 * s, 1, 1, '#ffffff');
  }

  // a whirlwind funnel standing on y: helical bands, bright in front and dim behind
  function funnel(c, x, y, grow, a, cols) {
    const H = 92 * grow;
    c.globalAlpha = 0.3 * a;
    for (let h = 0; h < 1; h += 0.04) { const r = (5 + h * h * 26) * grow; pxRect(c, x - r, y - h * H - 2, r * 2, 4, cols[0]); }
    for (let band = 0; band < 4; band++) {
      for (let i = 0; i < 44; i++) {
        const h = i / 44, ang = G.t * 14 + h * 9 + band * Math.PI / 2, r = (5 + h * h * 26) * grow, front = Math.sin(ang) > -0.1;
        c.globalAlpha = a * (front ? 0.95 : 0.45);
        pxRect(c, x + Math.cos(ang) * r - 1, y - h * H, front ? 4 : 2, front ? 2 : 1, front ? (band % 2 ? cols[1] : cols[2]) : cols[0]);
      }
    }
    c.globalAlpha = 1;
  }

  const SCI = ['#2a2433', '#c9ccd6', '#ffffff', '#6a4a8a', '#e6b422'];
  // Moria's giant scissors: pivot at (x, y), blades along `rot`, spread by `open`
  function shears(c, x, y, rot, open, s) {
    const list = [];
    for (const d of [-1, 1]) {
      const a = rot + d * open, ux = Math.cos(a), uy = Math.sin(a);
      list.push([path(4, t => ({ x: x + ux * t * 36 * s, y: y + uy * t * 36 * s })), t => Math.max(1, (4.5 - t * 3.5) * s)]);
    }
    strokeAll(c, list, SCI.slice(0, 3));
    for (const d of [-1, 1]) {
      const ha = rot + Math.PI + d * (open * 0.8 + 0.35), hx = x + Math.cos(ha) * 11 * s, hy = y + Math.sin(ha) * 11 * s;
      pxLine(c, x, y, hx, hy, SCI[0], 3);
      ellRing(c, hx, hy, 4 * s, 3 * s, SCI[0], 4);
      ellRing(c, hx, hy, 4 * s, 3 * s, SCI[3], 2);
    }
    pxCircle(c, x, y, 2, SCI[0]);
    pxRect(c, x, y - 1, 1, 1, SCI[4]);
  }

  // a shadow peeled off the ground: a flat smear (rise 0) that stands up into a grinning silhouette
  function shadowFig(c, x, y, rise) {
    const h = 4 + rise * 28;
    c.globalAlpha = 0.88;
    ellFill(c, x, y - h / 2, 10 - rise * 3, h / 2, '#1b1424');
    if (rise > 0.2) {
      pxCircle(c, x, y - h - 2, 6 * rise, '#1b1424');
      for (let i = 0; i < 4; i++) pxLine(c, x - 4 + i * 3, y - h - 5 * rise, x - 7 + i * 4, y - h - 11 * rise, '#1b1424', 2);
    }
    if (rise > 0.6) {
      pxRect(c, x - 3, y - h - 4, 2, 2, '#ff3a3a'); pxRect(c, x + 2, y - h - 4, 2, 2, '#ff3a3a');
      pxRect(c, x - 3, y - h + 1, 7, 1, '#ff3a3a');
    }
    c.globalAlpha = 1;
  }

  // a bat in flight; flap picks the wing frame
  function batDraw(c, x, y, flap) {
    const wy = flap ? -3 : 2;
    for (const d of [-1, 1]) {
      pxLine(c, x, y, x + d * 4, y + wy - 1, '#1b1424', 2);
      pxLine(c, x + d * 4, y + wy - 1, x + d * 8, y + wy + 1, '#1b1424', 2);
      pxRect(c, x + d * 4, y + wy - 2, 1, 1, '#6a4a8a');
    }
    pxCircle(c, x, y, 2, '#1b1424');
    pxRect(c, x - 2, y - 3, 1, 2, '#1b1424'); pxRect(c, x + 2, y - 3, 1, 2, '#1b1424');
    pxRect(c, x - 1, y - 1, 1, 1, '#ff3a3a'); pxRect(c, x + 1, y - 1, 1, 1, '#ff3a3a');
  }

  const BUB = ['#5aa0c8', '#9ad8f0', '#e6f8ff', '#ffb0e0'];
  // a soap bubble: faint fill, shaded rim, an iridescent edge and a curved highlight
  function bubble(c, x, y, r, wob, a) {
    if (r < 1) return;
    a = a === undefined ? 1 : a;
    const rx = r * (1 + (wob || 0)), ry = r * (1 - (wob || 0));
    c.globalAlpha = 0.28 * a;
    ellFill(c, x, y, rx, ry, BUB[2]);
    c.globalAlpha = a;
    if (r > 6) ellRing(c, x, y, rx + 1, ry + 1, BUB[0], 1);
    ellRing(c, x, y, rx, ry, BUB[1], r > 6 ? 2 : 1);
    if (r > 4) {
      ellRing(c, x, y, rx, ry, BUB[3], 2, 2.0, 2.9);
      ellRing(c, x, y, rx - 3, ry - 3, '#ffffff', 2, 3.6, 4.5);
      pxRect(c, x - rx * 0.45, y - ry * 0.5, 2, 2, '#ffffff');
      pxRect(c, x + rx * 0.35, y + ry * 0.45, 1, 1, '#ffffff');
    } else pxRect(c, x - r * 0.4, y - r * 0.4, 1, 1, '#ffffff');
    c.globalAlpha = 1;
  }

  const LIGHT = ['#c08a1a', '#ffd04a', '#fff3a0', '#ffffff'];
  // a bolt of light from a to b that thins out (Kizaru's light-speed travel)
  const lightTrail = (a, b, ms, w) => fxRun(ms || 220, (c, k) => {
    stroke(c, [a, b], [LIGHT[1], LIGHT[2], '#ffffff'], Math.max(1, Math.round((w || 4) * (1 - k))));
    if (Math.random() < 0.6) { const t = Math.random(); particles(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 1, { colors: LIGHT.slice(1), speed: 20, grav: 0, life: 0.3, size: 1 }); }
  });

  const VEN = ['#2a0a3a', '#7a2aa0', '#b06ad0', '#e8b0ff'];
  // a venom serpent's head facing along angle a, jaws opened by `open`
  function snakeHead(c, x, y, a, open, s) {
    s = s || 1.6;
    const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => ({ x: x + (u * ca - v * sa) * s, y: y + (u * sa + v * ca) * s });
    const th = open * 5;
    if (open > 0.1) { const m0 = P(-3, 0), m1 = P(8, th * -0.1); pxLine(c, m0.x, m0.y, m1.x, m1.y, '#4a0a24', Math.max(1, Math.round(th * s))); }
    strokeAll(c, [[[P(-6, -2), P(3, -3 - th * 0.6), P(11, -2 - th)], t => (6 - t * 4) * s], [[P(-6, 2), P(3, 3 + th * 0.5), P(9, 2 + th * 0.8)], t => (4 - t * 2.5) * s]], [VEN[0], VEN[1], VEN[2]]);
    const b = P(-5, 0);
    pxCircle(c, b.x, b.y, 4 * s + 1, VEN[0]);
    pxCircle(c, b.x, b.y, 4 * s, VEN[1]);
    pxCircle(c, b.x - s, b.y - s, 2 * s, VEN[2]);
    if (open > 0.1) {
      for (const [u, v, d] of [[10, -1 - th, 1], [6, -1 - th * 0.6, 1], [8, 1 + th * 0.8, -1]]) { const f = P(u, v); pxLine(c, f.x, f.y, f.x, f.y + d * 3 * s, '#ffffff', 1); }
    }
    const e = P(0, -4 - th * 0.3);
    pxRect(c, e.x - 2, e.y - 1, 4, 3, '#1b0a24'); pxRect(c, e.x - 1, e.y, 3, 1, '#ffe14a');
  }

  // Magellan's Venom Demon: a hulking, dripping giant of poison with horns and burning eyes.
  // arms 0 = at its sides, 1 = raised; slam 0..1 brings the fists down on (tx, ty); melt sinks it.
  function demon(c, x, y, a, arms, slam, melt, tx, ty) {
    if (a <= 0) return;
    c.globalAlpha = a;
    const sq = 1 - melt * 0.5, yy = y + melt * 50, B = '#5a1a7a';
    ellFill(c, x, yy + 54 * sq, 33, 40 * sq, VEN[0]);
    ellFill(c, x, yy + 54 * sq, 31, 38 * sq, B);
    ellFill(c, x - 9, yy + 42 * sq, 13, 18 * sq, VEN[1]);
    for (const d of [-1, 1]) stroke(c, path(5, t => ({ x: x + d * (8 + t * 10), y: yy + 4 - t * 15 + t * t * 5 })), [VEN[0], '#e8dcc8', '#ffffff'], t => 4 - t * 3);
    pxCircle(c, x, yy + 13, 15, VEN[0]); pxCircle(c, x, yy + 13, 14, B); pxCircle(c, x - 4, yy + 9, 6, VEN[1]);
    for (const d of [-1, 1]) { pxRect(c, x + d * 6 - 3, yy + 9, 7, 3, '#1b0a24'); pxRect(c, x + d * 6 - 2, yy + 10, 5, 1, '#ffe14a'); }
    pxRect(c, x - 9, yy + 18, 19, 6, '#1b0a24');
    for (let i = 0; i < 5; i++) { pxRect(c, x - 8 + i * 4, yy + 18, 2, 2, '#ffffff'); pxRect(c, x - 6 + i * 4, yy + 22, 2, 2, '#ffffff'); }
    for (const d of [-1, 1]) {
      const sh = { x: x + d * 25, y: yy + 34 * sq }, rest = { x: x + d * 38, y: yy + 62 * sq }, up = { x: x + d * 24, y: yy - 20 }, down = { x: tx + d * 9, y: ty - 4 };
      const f = slam > 0 ? { x: lerp(up.x, down.x, slam), y: lerp(up.y, down.y, slam) } : { x: lerp(rest.x, up.x, arms), y: lerp(rest.y, up.y, arms) };
      stroke(c, [sh, { x: lerp(sh.x, f.x, 0.5) + d * 8, y: lerp(sh.y, f.y, 0.5) }, f], [VEN[0], B, VEN[1]], 8);
      pxCircle(c, f.x, f.y, 9, VEN[0]); pxCircle(c, f.x, f.y, 8, B); pxCircle(c, f.x - 2, f.y - 2, 4, VEN[1]);
    }
    for (let i = 0; i < 6; i++) {
      const dx = -25 + i * 10, L = 3 + ((G.t * 18 + i * 7) % 9);
      pxRect(c, x + dx, yy + 86 * sq, 3, L, B); pxRect(c, x + dx, yy + 86 * sq + L, 3, 2, VEN[2]);
    }
    c.globalAlpha = 1;
  }

  // Whitebeard's spirit: a towering, pale figure with his captain's coat over his shoulders, a bare
  // chest, his bandana and the famous moustache. S.sw swings the bisento: 0 raised behind him,
  // 1 swept all the way through.
  const WB = { x: 8, y: 4 };
  const wbHand = S => ({ x: WB.x + 40, y: WB.y + 46 - S.rise });
  function whitebeard(c, S) {
    if (S.a <= 0) return;
    const x = WB.x, y = WB.y - S.rise, O = '#2a3a5a', AURA = '#bfe6ff', COAT = '#e4ecfa', FOLD = '#b4c2de', SKIN = '#b8c8e8', SKD = '#8a9ac0', H = wbHand(S);
    c.globalAlpha = S.a;
    // coat and chest, row by row
    for (let yy = y + 18; yy < VIEW.y + VIEW.h; yy += 2) {
      const t = yy - y - 18, co = 30 + t * 0.1, ci = 13 + t * 0.02, fold = ci + (co - ci) * 0.55;
      pxRect(c, x - co - 2, yy, 1, 2, AURA); pxRect(c, x + co + 2, yy, 1, 2, AURA);
      pxRect(c, x - co - 1, yy, co * 2 + 2, 2, O);
      pxRect(c, x - co, yy, co * 2, 2, COAT);
      pxRect(c, x - fold, yy, 1, 2, FOLD); pxRect(c, x + fold, yy, 1, 2, FOLD);
      pxRect(c, x - ci - 1, yy, ci * 2 + 2, 2, O);
      pxRect(c, x - ci, yy, ci * 2, 2, SKIN);
      if (t < 70) pxRect(c, x, yy, 1, 2, SKD);
    }
    pxLine(c, x - 10, y + 30, x - 2, y + 32, SKD, 1); pxLine(c, x + 2, y + 32, x + 10, y + 30, SKD, 1);
    pxRect(c, x - 14, y + 66, 28, 5, '#2a3a5a');
    for (const d of [-1, 1]) { pxCircle(c, x + d * 22, y + 25, 11, O); pxCircle(c, x + d * 22, y + 25, 10, COAT); pxRect(c, x + d * 22 - 4, y + 17, 8, 2, '#ffffff'); }
    // the bisento: a long pole with a broad blade on the end
    const a = lerp(-1.75, 0.62, S.sw), ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    stroke(c, [{ x: H.x - ux * 18, y: H.y - uy * 18 }, { x: H.x + ux * 80, y: H.y + uy * 80 }], [O, '#7a5a3a', '#a8865a'], 3);
    stroke(c, path(6, t => ({ x: H.x + ux * (78 + t * 30) + nx * Math.sin(t * Math.PI) * 5, y: H.y + uy * (78 + t * 30) + ny * Math.sin(t * Math.PI) * 5 })), [O, '#e8eef8', '#ffffff'], t => 8 - t * 6);
    // the arm that swings it
    stroke(c, [{ x: x + 24, y: y + 28 }, { x: x + 34, y: y + 40 }, H], [O, SKIN, null], 7);
    pxCircle(c, H.x, H.y, 5, O); pxCircle(c, H.x, H.y, 4, SKIN);
    // head: bandana with trailing knot, stern brows and the moustache
    stroke(c, path(5, t => ({ x: x - 12 - t * 16, y: y - 9 + t * 6 + Math.sin(G.t * 8 + t * 4) * 2 * t })), [O, '#2a3a5a'], 3);
    pxCircle(c, x, y, 16, AURA);
    pxCircle(c, x, y, 15, O); pxCircle(c, x, y, 14, SKIN);
    pxRect(c, x - 14, y - 14, 28, 7, '#2a3a5a'); pxRect(c, x - 12, y - 13, 24, 1, '#4a5a7a');
    pxLine(c, x - 10, y - 5, x - 3, y - 3, O, 2); pxLine(c, x + 3, y - 3, x + 10, y - 5, O, 2);
    pxRect(c, x - 7, y - 2, 2, 2, '#1b1424'); pxRect(c, x + 5, y - 2, 2, 2, '#1b1424');
    stroke(c, path(12, t => { const u = t * 2 - 1; return { x: x + u * 20, y: y + 7 + 2 * (1 - u * u) - Math.pow(Math.abs(u), 3) * 14 }; }), [O, '#ffffff'], 4);
    c.globalAlpha = 1;
  }

  const MAG = ['#3a0a08', '#8a1a1a', '#c0301a', '#ff5a2a', '#ffb03a', '#fff3a0'];
  // Akainu's magma hound: a dog's head of molten rock (facing right), jaws opened by `bite`
  function hound(c, x, y, bite, s) {
    const P = (u, v) => ({ x: x + u * s, y: y + v * s }), b = bite;
    // the glow inside the open jaws
    if (b > 0.5) { const m0 = P(1, 0), m1 = P(12, 0); pxLine(c, m0.x, m0.y, m1.x, m1.y, MAG[4], Math.round(b * 2 * s)); pxLine(c, m0.x, m0.y, m1.x - 3, m1.y, MAG[5], Math.max(1, Math.round(b * s))); }
    strokeAll(c, [
      [[P(-5, -6), P(-11, -15)], t => 4 - t * 3], [[P(-1, -7), P(-6, -16)], t => 4 - t * 3],
      [[P(0, -3 - b), P(8, -3 - b * 0.8), P(16, -1 - b * 0.4)], t => 6 - t * 3],
      [[P(0, 3 + b), P(7, 3 + b * 0.8), P(13, 2 + b * 0.5)], t => 4 - t * 2],
    ], [MAG[0], MAG[2], MAG[3]]);
    pxCircle(c, P(-3, -1).x, P(-3, -1).y, 8 * s + 1, MAG[0]);
    pxCircle(c, P(-3, -1).x, P(-3, -1).y, 8 * s, MAG[1]);
    pxCircle(c, P(-5, -4).x, P(-5, -4).y, 4 * s, MAG[2]);
    for (let i = 0; i < 4; i++) {
      const t1 = P(4 + i * 3, -1 - b * 0.8), t2 = P(4 + i * 3, 1 + b * 0.7);
      pxRect(c, t1.x, t1.y, 1, 2, '#fff3a0'); pxRect(c, t2.x, t2.y - 1, 1, 2, '#fff3a0');
    }
    const e = P(2, -6 - b * 0.5);
    pxRect(c, e.x - 1, e.y, 4, 2, MAG[0]); pxRect(c, e.x, e.y, 3, 1, MAG[5]);
    const k0 = P(-9, -3), k1 = P(-4, 3), k2 = P(1, 1);
    pxLine(c, k0.x, k0.y, k1.x, k1.y, MAG[4], 1); pxLine(c, k1.x, k1.y, k2.x, k2.y, MAG[4], 1);
  }

  // a fist of magma: crusted rock with glowing cracks, pointing along angle a
  function magmaFist(c, x, y, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 1; j <= 4; j++) pxCircle(c, x - ca * j * 6, y - sa * j * 6, 5 - j, FIRE[j - 1]);
    pxCircle(c, x, y, 7, MAG[0]);
    pxCircle(c, x, y, 6, MAG[1]);
    for (let i = -1; i <= 2; i++) { const kx = x + ca * 4 - sa * i * 3, ky = y + sa * 4 + ca * i * 3; pxRect(c, kx - 1, ky - 1, 3, 3, MAG[2]); pxRect(c, kx, ky, 1, 1, MAG[4]); }
    pxLine(c, x - 3, y - 2, x + 1, y + 2, MAG[4], 1);
    pxRect(c, x - 2, y - 3, 2, 1, MAG[5]);
  }

  const GOLD = ['#6a4a0a', '#e6b422', '#ffd04a', '#fff3a0'];
  const SEA = ['#0e2a5a', '#2f6fd0', '#4fa3e0', '#bfe6ff', '#ffffff'];
  // a sea king bursting up out of the ground: upper jaw over (x, y), lower jaw and long neck below
  function seaKing(c, x, y, open) {
    const O = '#0e3a2a', G1 = '#3a9a7a', G2 = '#6ac8a0', BELLY = '#e8d79a', top = y - 5 - open, low = y + 5 + open, bot = VIEW.y + VIEW.h + 4;
    pxRect(c, x - 14, low, 28, bot - low, O);
    pxRect(c, x - 13, low, 26, bot - low, G1);
    pxRect(c, x - 6, low + 6, 12, bot - low, BELLY);
    for (let yy = low + 9; yy < bot; yy += 6) { pxRect(c, x - 6, yy, 12, 1, '#b8a76a'); pxRect(c, x - 12, yy + 3, 4, 1, '#2a7a5a'); pxRect(c, x + 8, yy, 4, 1, '#2a7a5a'); }
    // lower jaw
    ellFill(c, x, low + 3, 17, 6, O); ellFill(c, x, low + 3, 16, 5, '#2a7a5a');
    for (let i = 0; i < 6; i++) pxRect(c, x - 13 + i * 5, low - 3, 2, 3, '#ffffff');
    // upper jaw / head with fins and eyes
    for (let i = 0; i < 3; i++) { pxLine(c, x - 8 + i * 8, top - 10, x - 13 + i * 8, top - 22 - (i % 2) * 4, O, 4); pxLine(c, x - 8 + i * 8, top - 10, x - 13 + i * 8, top - 22 - (i % 2) * 4, '#d05a4a', 2); }
    ellFill(c, x, top - 6, 18, 10, O); ellFill(c, x, top - 6, 17, 9, G1); ellFill(c, x - 4, top - 10, 10, 4, G2);
    for (let i = 0; i < 6; i++) pxRect(c, x - 13 + i * 5, top + 2, 2, 3, '#ffffff');
    for (const d of [-1, 1]) { pxRect(c, x + d * 9 - 2, top - 11, 5, 3, '#1b1424'); pxRect(c, x + d * 9 - 1, top - 11, 3, 2, '#ffe14a'); }
  }

  // a rolling wall of water from x0 to its crest at `front`, h tall, curling over at the front
  function wave(c, x0, front, h) {
    if (h < 1) return;
    for (let x = x0; x < front; x += 2) {
      const u = (front - x) / 50, prof = (u < 0.3 ? Math.sin(u / 0.3 * Math.PI / 2) : 1 - Math.min(0.4, (u - 0.3) * 0.35)) * Math.min(1, 0.15 + (x - x0) / 28);
      const top = 121 - h * prof + Math.sin(x * 0.15 + G.t * 8) * 2;
      c.globalAlpha = 0.88;
      pxRect(c, x, top, 2, 123 - top, SEA[1]);
      pxRect(c, x, Math.max(top + 6, 112), 2, 10, SEA[0]);
      c.globalAlpha = 1;
      pxRect(c, x, top + 8 + ((x * 7) % 13) + Math.sin(G.t * 6 + x) * 2, 2, 1, SEA[2]);
      pxRect(c, x, top + 2, 2, 2, SEA[3]);
      pxRect(c, x, top, 2, 2, '#ffffff');
    }
    const r = h * 0.24, cx = front - 9, cy = 121 - h + r;
    ellRing(c, cx, cy, r, r, SEA[1], 5, Math.PI, Math.PI * 2.35);
    ellRing(c, cx, cy - 1, r, r, '#ffffff', 2, Math.PI * 1.1, Math.PI * 2.1);
  }

  // a water shark dart (facing right)
  function shark(c, x, y, s) {
    pxLine(c, x - 1, y - 2 * s, x - 5 * s, y - 7 * s, SEA[0], 3);
    pxLine(c, x - 7 * s, y, x - 11 * s, y - 4 * s, SEA[0], 3); pxLine(c, x - 7 * s, y, x - 11 * s, y + 4 * s, SEA[0], 3);
    pxLine(c, x - 7 * s, y, x - 10 * s, y - 3 * s, SEA[2], 1); pxLine(c, x - 7 * s, y, x - 10 * s, y + 3 * s, SEA[2], 1);
    ellFill(c, x, y, 7 * s + 1, 3 * s + 1, SEA[0]);
    ellFill(c, x, y, 7 * s, 3 * s, SEA[2]);
    ellFill(c, x + s, y + s, 5 * s, 1.2 * s, '#e6f8ff');
    pxRect(c, x - 3 * s, y - 2 * s, 6 * s, 1, SEA[3]);
    pxRect(c, x + 4 * s, y - 1, 1, 1, SEA[0]);
  }

  // a ball of water with a rim, caustic glints and a highlight
  function waterBall(c, x, y, r, ph) {
    c.globalAlpha = 0.55;
    pxCircle(c, x, y, r, SEA[2]);
    c.globalAlpha = 1;
    pxRing(c, x, y, r, SEA[1], r > 6 ? 2 : 1);
    if (r > 6) {
      ellRing(c, x, y, r - 3, r - 3, '#ffffff', 1, 3.7, 4.6);
      for (let i = 0; i < 4; i++) { const a = ph * 6 + i * 1.6, d = r * 0.5; pxRect(c, x + Math.cos(a) * d, y + Math.sin(a * 1.3) * d, 2, 1, SEA[3]); }
    }
    pxRect(c, x - r * 0.4, y - r * 0.5, 2, 1, '#ffffff');
  }

  const ROOM = ['#1a4a7a', '#7cd0ff', '#bfe6ff', '#ffffff'];
  // Law's Room: a translucent dome over the battlefield
  function roomDome(c, r, a) {
    c.globalAlpha = 0.12 * a;
    pxCircle(c, 100, 121, r, ROOM[1]);
    c.globalAlpha = a;
    pxRing(c, 100, 121, r, ROOM[2], 1);
    ellRing(c, 100, 121, r, r * 0.2, ROOM[1], 1);
    c.globalAlpha = 1;
  }

  const GAS = ['#3a1a5a', '#7a3aa0', '#b06ad0', '#d0b0f0'];
  // a billow of gas: overlapping puffs with a dark underside and lit tops; P = [dx, dy, r]
  function billow(c, x, y, P, s, cols) {
    for (let L = 0; L < 3; L++) {
      for (let i = 0; i < P.length; i++) {
        const [dx, dy, r] = P[i], w = Math.sin(G.t * 4 + i) * 1.2;
        const px = x + dx * s + w, py = y + dy * s + (L === 0 ? 1 : L === 2 ? -1.5 : 0);
        pxCircle(c, px - (L === 2 ? 1 : 0), py, L === 0 ? r * s + 1 : L === 1 ? r * s : r * s * 0.55, cols[L]);
      }
    }
  }

  // Caesar's Shinokuni: a giant slime of gas with a leering face, creeping along the ground
  function slime(c, x, r, open, a) {
    c.globalAlpha = a;
    const ry = r * 0.8, cy = 121 - ry;
    for (let L = 0; L < 2; L++) {
      for (let dy = -Math.round(ry); dy <= ry; dy++) {
        const hw = r * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))) * (1 + 0.06 * Math.sin(dy * 0.35 + G.t * 8)) + (L ? 0 : 1);
        pxRect(c, x - hw, cy + dy, hw * 2, 1, L ? GAS[1] : GAS[0]);
      }
    }
    ellFill(c, x - r * 0.3, cy - ry * 0.35, r * 0.4, ry * 0.3, GAS[2]);
    pxRect(c, x - r * 0.45, cy - ry * 0.55, 3, 2, '#ffffff');
    const fx = x + r * 0.3;
    for (const d of [-1, 1]) { pxRect(c, fx + d * 8 - 3, cy - ry * 0.2, 6, 4, '#1b0a24'); pxRect(c, fx + d * 8 - 2, cy - ry * 0.2 + 1, 3, 2, '#ffe14a'); }
    const mh = 2 + open * r * 0.45;
    ellFill(c, fx, cy + ry * 0.25, r * 0.35, mh, '#1b0a24');
    if (open > 0.2) for (let i = 0; i < 4; i++) pxRect(c, fx - r * 0.25 + i * r * 0.16, cy + ry * 0.25 - mh, 2, 3, '#f2f2f2');
    c.globalAlpha = 1;
  }

  const LEAF = ['#1f4a1a', '#3f9a3a', '#7cff7a', '#c8ffb0'];
  // the slingshot: pull back and let fly; resolves with where the shot starts
  async function slingshot(ms, glow) {
    const hero = G.hero;
    Sfx.play('stretch');
    tween(hero, { ox: -4, squash: 0.15 }, ms);
    await step(ms, (c, k) => {
      const x = hero.x + hero.ox + 15, y = 97 + hero.oy, px = x - 4 - k * 7;
      pxLine(c, x, y - 4, px, y, '#ffe0a0', 1); pxLine(c, x, y + 4, px, y, '#ffe0a0', 1);
      pxRect(c, px - 1, y - 1, 3, 3, glow || LEAF[2]);
    });
    Sfx.play('shot');
    tween(hero, { ox: 2, squash: -0.08 }, 60).then(() => tween(hero, { ox: 0, squash: 0 }, 160));
    return { x: hero.x + hero.ox + 15, y: 97 + hero.oy };
  }

  // a Pop Green seed in flight with a green streak behind it
  const seed = (c, x, y) => { pxRect(c, x - 9, y, 6, 1, LEAF[3]); orb(c, x, y, 2, [LEAF[0], LEAF[1], LEAF[2]]); };

  // a venus flytrap head facing angle a, its two lobes opened by `open` (0 shut .. 1 wide).
  // Shaded pixel by pixel from two hinged half-ellipses, with teeth along the lips and an outline.
  function trapHead(c, x, y, a, open, s) {
    const ca = Math.cos(a), sa = Math.sin(a), th = open * 0.8, ct = Math.cos(th), st = Math.sin(th);
    const R = Math.ceil(22 * s), N = R * 2 + 1, x0 = Math.round(x) - R, y0 = Math.round(y) - R;
    const at = (u, v) => {
      const du = u + 10;
      const lobes = [[du * ct - v * st, du * st + v * ct, -1], [du * ct + v * st, -du * st + v * ct, 1]];
      for (const [hu, hv, d] of lobes) {
        if (hu < 0 || hu > 23) continue;
        const e = ((hu - 11.5) / 11.5) ** 2 + (hv / (d < 0 ? 9 : 8)) ** 2;
        if (d * hv >= 0 && e < 1) {
          if (d < 0 && (Math.hypot(hu - 8, hv + 5) < 1.4 || Math.hypot(hu - 15, hv + 4) < 1.2)) return '#f2e0d0';
          return Math.abs(hv) < 1.6 ? '#ff9a8a' : Math.abs(hv) > 5.5 ? '#8a2a22' : '#c0453a';
        }
        const tv = -d * hv;
        if (tv > 0 && tv < 2.8 && hu > 3 && hu < 20 && (hu % 3.2) < 1.7 - tv * 0.6) return '#ffffff';
      }
      if (open > 0.08) {
        const ang = Math.atan2(v, du);
        if (Math.abs(ang) < th && du > 1 && du < 21) return '#4a0a14';
      }
      return null;
    };
    const grid = new Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const dx = x0 + i + 0.5 - x, dy = y0 + j + 0.5 - y;
        grid[j * N + i] = at((dx * ca + dy * sa) / s, (-dx * sa + dy * ca) / s);
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let col = grid[j * N + i];
        if (!col) {
          const near = (i > 0 && grid[j * N + i - 1]) || (i < N - 1 && grid[j * N + i + 1]) || (j > 0 && grid[(j - 1) * N + i]) || (j < N - 1 && grid[(j + 1) * N + i]);
          if (!near) continue;
          col = '#2a0a0a';
        }
        c.fillStyle = col;
        c.fillRect(x0 + i, y0 + j, 1, 1);
      }
    }
  }

  const HOT = ['#4a0a0a', '#c0301a', '#ff6a3a', '#ffd04a', '#fff3a0'];
  // a red-hot string: crust, glow and a white-hot core that cools as `heat` drops
  const hotString = (c, P, w, heat) => stroke(c, P, heat > 0.5 ? [HOT[1], HOT[2], HOT[4]] : [HOT[0], HOT[1], HOT[2]], w);

  // a ghostly soul with a wavy tail and a startled face
  function soul(c, x, y, k, s) {
    c.globalAlpha = 0.9;
    const O = '#7a8ac8', W = '#e8f0ff';
    for (let L = 0; L < 2; L++) {
      const col = L ? W : O, e = L ? 0 : 1;
      pxCircle(c, x, y, 7 * s + e, col);
      for (let i = 0; i < 4; i++) pxCircle(c, x - 2 * s - i * 3 * s + Math.sin(G.t * 10 + i) * 1.5, y + 4 * s + i * 2 * s, (5 - i) * s + e, col);
    }
    pxRect(c, x - 3 * s, y - 2 * s, 2, 2, '#1b1424'); pxRect(c, x + 2 * s, y - 2 * s, 2, 2, '#1b1424');
    ellFill(c, x, y + 3 * s, 1.5 * s, 2 * s, '#1b1424');
    pxRect(c, x - 4 * s, y - 5 * s, 2, 1, '#ffffff');
    c.globalAlpha = 1;
  }

  // a three-tier cake (bottom on y) squashed by sq
  function cake(c, x, y, sq) {
    const tiers = [['#f2c7d8', 46, 13, '#d89ab0'], ['#ffffff', 36, 11, '#d8d0e0'], ['#8a5a3a', 26, 10, '#5a3a22']];
    const fw = 1 + sq * 0.35, fh = 1 - sq * 0.35;
    let by = y;
    for (const [col, w0, h0, dk] of tiers) {
      const w = w0 * fw, h = h0 * fh, tx = x - w / 2, ty = by - h;
      pxRect(c, tx - 1, ty - 1, w + 2, h + 2, '#4a2a3a');
      pxRect(c, tx, ty, w, h, col);
      pxRect(c, tx, ty + h - 2, w, 2, dk);
      pxRect(c, tx, ty, w, 2, '#fff6f0');
      for (let i = 0; i < w / 5; i++) pxRect(c, tx + 2 + i * 5, ty + 2, 2, 2 + (i % 2) * 2, '#fff6f0');
      by = ty;
    }
    for (let i = 0; i < 4; i++) { pxCircle(c, x - 9 + i * 6, by - 1, 2, '#ff3a5a'); pxRect(c, x - 9 + i * 6, by - 4, 1, 2, '#3f9a3a'); }
    pxRect(c, x - 2, by - 12 * fh, 4, 11 * fh, '#4a2a3a'); pxRect(c, x - 1, by - 12 * fh, 2, 11 * fh, '#7cd0ff');
    const f = Math.sin(G.t * 30);
    pxRect(c, x - 1, by - 16 * fh - f, 3, 4, '#ff9a3a'); pxRect(c, x, by - 15 * fh - f, 1, 2, '#fff3a0');
  }

  const MOCHI = ['#5a4a3a', '#e8dcc8', '#fffaf0'];
  const MOG = ['#3a1018', '#7a2630', '#c0453a', '#ff8a7a'];
  // a Buzz Cut ring of mochi studded with spikes, spinning like a saw blade
  function buzz(c, x, y, a, s) {
    for (let i = 0; i < 10; i++) {
      const b = a + i * 0.628, ex = x + Math.cos(b + 0.3) * 14 * s, ey = y + Math.sin(b + 0.3) * 14 * s;
      pxLine(c, x + Math.cos(b) * 8 * s, y + Math.sin(b) * 8 * s, ex, ey, MOCHI[0], 3);
      pxLine(c, x + Math.cos(b) * 9 * s, y + Math.sin(b) * 9 * s, ex, ey, MOCHI[1], 1);
    }
    pxCircle(c, x, y, 10 * s + 1, MOCHI[0]);
    pxCircle(c, x, y, 10 * s, MOCHI[1]);
    ellRing(c, x, y, 7 * s, 7 * s, MOCHI[2], 2, a * 2, a * 2 + 2);
    pxCircle(c, x, y, 4 * s, MOCHI[0]);
    pxCircle(c, x, y, 3 * s, '#7a2630');
  }

  // a Mogura's three red prongs at (x, y) pointing along angle a
  function prongs(c, x, y, a, s) {
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const list = [[[{ x: x - ux * 6 * s, y: y - uy * 6 * s }, { x, y }], 2]];
    for (const d of [-1, 0, 1]) list.push([[{ x: x + nx * d * 3 * s, y: y + ny * d * 3 * s }, { x: x + ux * (d ? 6 : 8) * s + nx * d * 3 * s, y: y + uy * (d ? 6 : 8) * s + ny * d * 3 * s }], 1]);
    list.push([[{ x: x - nx * 3.5 * s, y: y - ny * 3.5 * s }, { x: x + nx * 3.5 * s, y: y + ny * 3.5 * s }], 2]);
    strokeAll(c, list, [MOG[0], MOG[2], MOG[3]]);
  }

  Object.assign(MOVE_FX, {
    // ---------- Water 7: Paulie's Ropes ----------

    // Rope Lasso: twirl a loop overhead, fling it over the foe, cinch it and yank them off their feet.
    lasso: async m => {
      const F = G.battle.F, hero = G.hero, fc = fc0(), top = foeTop();
      const hand = () => ({ x: hero.x + hero.ox + 8, y: 98 + hero.oy });
      const S = { x: 0, y: 0, rx: 7, ry: 2.5, spin: 0, over: true, onFoe: false, sag: 5, vib: 0, a: 1 };
      const stop = layer(c => {
        const h = hand();
        if (S.over) { S.x = h.x + 1 + Math.cos(S.spin) * 3; S.y = h.y - 28 + Math.sin(S.spin); }
        if (S.onFoe) S.x = F.x + F.ox;
        const knot = { x: S.x + Math.cos(S.spin) * S.rx, y: S.y + Math.sin(S.spin) * S.ry };
        if (S.over) { c.globalAlpha = 0.5; ellRing(c, S.x, S.y, S.rx + 5, S.ry + 2, ROPE[2], 1, S.spin - 2.4, S.spin); }
        c.globalAlpha = S.a;
        rope(c, path(10, t => ({ x: lerp(h.x, knot.x, t), y: lerp(h.y, knot.y, t) + Math.sin(t * Math.PI) * (S.sag + S.vib * Math.sin(t * 9 + G.t * 60)) })));
        ellRing(c, S.x, S.y, S.rx, S.ry, ROPE[0], 4);
        ellRing(c, S.x, S.y, S.rx, S.ry, ROPE[1], 2);
        ellRing(c, S.x, S.y - 1, S.rx, S.ry, ROPE[2], 1, Math.PI * 1.1, Math.PI * 1.6);
        pxRect(c, knot.x - 2, knot.y - 2, 4, 4, ROPE[0]);
        pxRect(c, knot.x - 1, knot.y - 1, 2, 2, ROPE[1]);
        c.globalAlpha = 1;
      });
      Sfx.play('stretch');
      tween(hero, { ox: -3, squash: 0.12 }, 200);
      await tween(S, { spin: Math.PI * 4 }, 380, linear);
      // the fling: the loop sails up in a high arc and comes down over the foe's head
      S.over = false;
      Sfx.play('slash');
      tween(hero, { ox: 8, squash: -0.1 }, 120, easeIn);
      const from = { x: S.x, y: S.y }, over = { x: fc.x, y: top - 6 };
      await step(240, (c, k) => {
        const p = qb(from, { x: lerp(from.x, over.x, 0.5), y: VIEW.y + 26 }, over, easeOut(k));
        S.x = p.x; S.y = p.y; S.rx = lerp(7, 13, k); S.ry = lerp(2.5, 4, k); S.spin += 0.4; S.sag = lerp(5, 16, k);
        for (let i = 1; i <= 3; i++) pxRect(c, p.x - 10 - i * 6, p.y + i * 2, 5, 1, '#ffffff');
      });
      // it drops over them and cinches tight
      await tween(S, { y: fc.y + 2, rx: 12, sag: 10 }, 110, easeIn);
      S.onFoe = true;
      Sfx.play('stretch');
      await tween(S, { rx: 8, ry: 3, sag: 0 }, 90);
      // yank!
      S.vib = 3;
      tween(hero, { ox: -10, squash: 0.18 }, 120);
      await tween(F, { ox: -22, squash: -0.15 }, 130, easeIn);
      m.hit(0);
      Sfx.play('hit');
      impact(foeC(), ['#ffffff', ROPE[2], ROPE[1]], 12);
      shake(4, 220);
      dust(F.x + F.ox + 10, 8);
      tween(S, { vib: 0 }, 300);
      tween(F, { ox: 0, squash: 0 }, 300);
      // the loop slips off and the rope is reeled in
      S.onFoe = false;
      await Promise.all([tween(S, { rx: 15, ry: 6, a: 0, sag: 14, y: fc.y + 8 }, 320), settle(320)]);
      stop();
    },

    // Rope Snare Net: toss a bundle high; a weighted net unfurls on the way down and snares the foe.
    ropenet: async m => {
      const F = G.battle.F, fc = fc0(), h = heroHand(), top = foeTop();
      const net = (c, x, y, w, hgt, pinch, a) => {
        c.globalAlpha = a;
        const N = (i, j) => { const f = lerp(1, 1 - pinch, j / 3); return { x: x + (i / 4 - 0.5) * w * f + Math.sin(G.t * 9 + i + j) * 0.6, y: y + (j / 3 - 0.5) * hgt + Math.sin(i / 4 * Math.PI) * hgt * 0.12 }; };
        for (let L = 0; L < 2; L++) {
          const col = L ? ROPE[1] : ROPE[0], t = L ? 1 : 3;
          for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 4; i++) {
              const a1 = N(i, j), b1 = N(i + 1, j + 1), a2 = N(i + 1, j), b2 = N(i, j + 1);
              pxLine(c, a1.x, a1.y, b1.x, b1.y, col, t);
              pxLine(c, a2.x, a2.y, b2.x, b2.y, col, t);
            }
          }
          const l = N(0, 0), r = N(4, 0);
          pxLine(c, l.x, l.y, r.x, r.y, col, t + 1);
        }
        for (let j = 0; j <= 3; j++) for (let i = 0; i <= 4; i++) if ((i + j) % 2 === 0) { const p = N(i, j); pxRect(c, p.x - 1, p.y - 1, 2, 2, ROPE[0]); }
        for (const i of [0, 2, 4]) { const p = N(i, 3); orb(c, p.x, p.y + 2, 2, ['#1b1424', '#5a5a6a', '#9aa4b1']); }
        c.globalAlpha = 1;
      };
      Sfx.play('stretch');
      await tween(G.hero, { squash: 0.18, ox: -3 }, 100);
      tween(G.hero, { squash: -0.12, oy: -4, ox: 2 }, 120, easeOut);
      await step(220, (c, k) => { const p = qb(h, { x: lerp(h.x, fc.x, 0.4), y: VIEW.y + 10 }, { x: fc.x, y: VIEW.y - 20 }, k); orb(c, p.x, p.y, 3, ROPE); });
      settle(200);
      // the net unfurls as it falls
      Sfx.play('slash');
      await step(340, (c, k) => {
        const e = easeOut(k), y = lerp(VIEW.y - 10, fc.y, easeIn(k));
        for (let i = 0; i < 4; i++) pxRect(c, fc.x - 18 + i * 12, y - 30 - (i % 2) * 6, 1, 10 + k * 10, '#ffffff');
        net(c, fc.x, y, lerp(14, 44, e), lerp(10, 36, e), 0, 1);
      });
      m.hit(0);
      Sfx.play('hit');
      F.squash = 0.25; tween(F, { squash: 0 }, 260);
      impact(fc, ['#ffffff', ROPE[2], ROPE[1]], 10);
      dust(fc.x - 16, 6); dust(fc.x + 16, 6);
      shake(3, 200);
      // it pulls tight round them; stars circle their head
      await step(600, (c, k) => {
        const pinch = easeOut(k01(k * 3)) * 0.45, tug = Math.sin(k01((k - 0.3) / 0.3) * Math.PI) * 2;
        net(c, F.x + F.ox, fc.y + 2, 44 - tug * 3, 36, pinch, k > 0.8 ? (1 - k) / 0.2 : 1);
        stars(c, fc.x, top - 4);
      });
      particles(fc.x, fc.y + 8, 8, { colors: ROPE.slice(1), speed: 40, grav: 120, size: 1 });
      await settle(80);
    },

    // Anchor Drop: whirl a ship's anchor round on its rope, hurl it into the sky, and drop it on the foe.
    anchordrop: async m => {
      const F = G.battle.F, fc = fc0(), hero = G.hero, IRON = ['#1b1424', '#6a7080', '#b9c0cc'], SC = 1.4;
      const anchor = (c, x, y, a) => {
        const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => ({ x: x + (u * ca - v * sa) * SC, y: y + (u * sa + v * ca) * SC });
        strokeAll(c, [
          [[P(0, 3), P(0, 23)], 4], [[P(-8, 7), P(8, 7)], 3],
          [path(8, t => P(Math.cos(Math.PI * t) * 11, 15 + Math.sin(Math.PI * t) * 8)), 3],
          [[P(-14, 9), P(-11, 15), P(-7, 13)], 2], [[P(14, 9), P(11, 15), P(7, 13)], 2],
        ], IRON);
        const r = P(0, 0);
        pxRing(c, r.x, r.y, 3, IRON[0], 2); pxRing(c, r.x, r.y, 2, IRON[2], 1);
      };
      const S = { x: 0, y: 0, a: 0, on: false, shadow: 0 };
      const hand = () => ({ x: hero.x + hero.ox + 8, y: 84 + hero.oy });
      const stop = layer(c => {
        if (S.shadow > 0) { c.globalAlpha = 0.35; ellFill(c, fc.x, 121, 4 + S.shadow * 14, 1 + S.shadow * 3, '#1b1424'); c.globalAlpha = 1; }
        if (!S.on) return;
        const h = hand();
        rope(c, path(8, t => ({ x: lerp(h.x, S.x, t), y: lerp(h.y, S.y, t) + Math.sin(t * Math.PI) * 4 })));
        anchor(c, S.x, S.y, S.a);
      });
      // whirl it round, faster and faster
      Sfx.play('charge');
      tween(hero, { ox: -4, squash: 0.15 }, 300);
      await step(560, (c, k) => {
        const h = hand(), th = Math.PI / 2 - easeIn(k) * Math.PI * 2.25, R = 14;
        S.x = h.x + Math.cos(th) * R; S.y = h.y - 12 + Math.sin(th) * R; S.a = th - Math.PI / 2; S.on = true;
        c.globalAlpha = 0.5 * k01(k * 3);
        for (let i = 0; i < 10; i++) {
          const a = th + i * 0.12, r = R + 28;
          pxLine(c, h.x + Math.cos(a) * r, h.y - 12 + Math.sin(a) * r, h.x + Math.cos(a + 0.12) * r, h.y - 12 + Math.sin(a + 0.12) * r, '#dfe4ec', Math.max(1, 4 - (i >> 2)));
        }
        c.globalAlpha = 1;
      });
      // let go: it sails up out of sight
      Sfx.play('stretch');
      tween(hero, { ox: 6, squash: -0.12 }, 140, easeIn);
      const r0 = { x: S.x, y: S.y }, a0 = S.a;
      await step(260, (c, k) => {
        const p = qb(r0, { x: lerp(r0.x, fc.x, 0.6), y: VIEW.y - 10 }, { x: fc.x + 10, y: VIEW.y - 70 }, easeOut(k));
        S.x = p.x; S.y = p.y; S.a = a0 - k * 5;
      });
      settle(240);
      // a shadow spreads under the foe and something glints high above...
      Sfx.play('charge');
      await step(320, (c, k) => { S.shadow = easeOut(k) * 0.8; if (Math.floor(k * 12) % 2) glint(c, fc.x, VIEW.y + 6, 3 + k * 4, '#ffffff'); });
      // ...and the anchor comes straight down
      const land = 123 - 23 * SC;
      S.a = 0; S.x = fc.x;
      Sfx.play('slash');
      await step(200, (c, k) => {
        S.y = lerp(VIEW.y - 50, land, easeIn(k)); S.shadow = 0.8 + k * 0.4;
        for (let i = 0; i < 5; i++) pxRect(c, fc.x - 14 + i * 7, S.y - 34 - (i % 2) * 12, 1, 18 + k * 12, i % 2 ? '#dfe4ec' : '#ffffff');
      });
      S.shadow = 0;
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 0.5);
      shake(9, 520);
      focusLines(fc, '#ffffff', 300);
      impact({ x: fc.x, y: fc.y + 6 }, ['#ffffff', IRON[2], IRON[1]], 18);
      shock({ x: fc.x, y: 120 }, ['#c9b88a', '#ffffff'], 6, 64, 440, 3, 0.25);
      shock({ x: fc.x, y: 120 }, ['#e8d9b0', '#ffffff'], 4, 40, 540, 2, 0.25);
      groundCrack(fc.x, fc.x + 50, '#5a4a3a', 260);
      groundCrack(fc.x, fc.x - 50, '#5a4a3a', 260);
      rocks(fc.x, 118, 16);
      dust(fc.x, 20);
      F.squash = 0.35; tween(F, { squash: 0 }, 420);
      await wait(300);
      // the rope hauls it back up into the sky
      Sfx.play('stretch');
      tween(hero, { ox: -8, squash: 0.15 }, 160);
      const y0 = S.y;
      await step(300, (c, k) => { const e = easeIn(k); S.y = lerp(y0, VIEW.y - 60, e); S.x = fc.x - e * 30; S.a = -e * 0.8; });
      stop();
      await settle(220);
    },

    // ---------- Water 7: Cola Cannon Arm ----------

    // Strong Right: Franky's fist fires off on its chain, rockets into the foe and reels back in.
    strongright: async m => {
      const fc = fc0(), hero = G.hero;
      const hand = () => ({ x: hero.x + hero.ox + 12, y: 102 + hero.oy });
      Sfx.play('charge');
      await crouch(140, -6);
      const tgt = { x: fc.x - 10, y: fc.y };
      Sfx.play('shot');
      hold(true);
      tween(hero, { ox: -10, squash: -0.05 }, 90);
      await step(190, (c, k) => {
        const h = hand(), e = easeOut(k), x = lerp(h.x, tgt.x, e), y = lerp(h.y, tgt.y, e) - Math.sin(e * Math.PI) * 4;
        links(c, h, { x: x - 10, y }, 0);
        for (let i = 1; i <= 3; i++) pxRect(c, x - 16 - i * 9, y - 6 + i * 3, 7, 1, '#ffffff');
        rocketFist(c, x, y, 1);
        if (Math.random() < 0.6) particles(x - 14, y, 1, { colors: SMOKE, speed: 15, grav: -20, life: 0.4, size: 2 });
      });
      m.hit(0);
      Sfx.play('boom');
      impact({ x: tgt.x + 6, y: tgt.y }, ['#ffffff', BLUE[2], BLUE[1]], 14);
      shock({ x: tgt.x + 6, y: tgt.y }, [BLUE[2], '#ffffff'], 4, 22, 260, 2);
      shake(4, 220);
      await step(90, (c, k) => { links(c, hand(), { x: tgt.x - 12, y: tgt.y }, 0); rocketFist(c, tgt.x - 2 - k * 3, tgt.y, 0); });
      await Promise.all([settle(240), step(240, (c, k) => {
        const h = hand(), e = easeIn(k), x = lerp(tgt.x - 5, h.x + 4, e), y = lerp(tgt.y, h.y, e);
        links(c, h, { x: x - 10, y }, 3 * Math.sin(k * Math.PI));
        rocketFist(c, x, y, 0);
      })]);
      hold(false);
    },

    // Weapons Left: the arm opens into a cannon and pumps cannonballs into the foe, each bursting in fire.
    weaponsleft: async m => {
      const fc = fc0(), hero = G.hero;
      const muzzle = () => ({ x: hero.x + hero.ox + 16, y: 102 + hero.oy });
      const stopB = layer(c => {
        const p = muzzle();
        pxRect(c, p.x - 9, p.y - 4, 11, 8, STEEL[0]); pxRect(c, p.x - 8, p.y - 3, 9, 6, STEEL[1]); pxRect(c, p.x - 8, p.y - 3, 9, 1, STEEL[2]);
        pxRect(c, p.x + 1, p.y - 2, 2, 4, '#1b1424');
      });
      Sfx.play('charge');
      await crouch(160, -3);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const p = muzzle(), last = i === m.hits - 1, tgt = { x: fc.x + rand(-4, 4), y: fc.y + (i % 3 - 1) * 9 };
        Sfx.play('boom');
        tween(hero, { ox: -9, squash: 0.1 }, 50).then(() => tween(hero, { ox: -3, squash: 0.05 }, 110));
        fxRun(90, (c, k) => { pxCircle(c, p.x + 5, p.y, 5 * (1 - k) + 1, '#ffd04a'); glint(c, p.x + 5, p.y, 9 * (1 - k) + 2, '#fff3a0'); });
        smoke(p.x + 4, p.y, 4, SMOKE, 20);
        await step(150, (c, k) => {
          const x = lerp(p.x + 4, tgt.x, k), y = lerp(p.y, tgt.y, k) - Math.sin(k * Math.PI) * 6;
          for (let j = 3; j >= 1; j--) pxCircle(c, x - j * 5, y + j * 0.5, 4 - j, FIRE[j - 1]);
          orb(c, x, y, 3, ['#0e0a14', '#3a3440', '#7a7a8a']);
        });
        m.hit(i);
        blast(tgt, last ? 16 : 11, last ? 460 : 360);
        rocks(tgt.x, tgt.y, 6, ['#3a3440', '#ff9a3a', '#ffd04a']);
        impact(tgt, ['#ffffff', '#ffd04a', '#ff5a2a'], last ? 12 : 6);
        shake(last ? 6 : 3, last ? 260 : 140);
        await wait(70);
      }
      smoke(muzzle().x + 4, muzzle().y - 2, 6, SMOKE, 15);
      await wait(140);
      stopB();
      await settle(200);
    },

    // Radical Beam: brace, charge a ball of cola energy in the arm, and fire a beam clean off the screen.
    radicalbeam: async m => {
      const fc = fc0(), hero = G.hero, F = G.battle.F, BEAM = ['#1a3a9a', '#2ad0e0', '#bff8ff', '#ffffff'];
      const o = () => ({ x: hero.x + hero.ox + 16, y: 100 + hero.oy });
      Sfx.play('charge');
      crouch(220, -6);
      tint('#000814', 0.3, 1800);
      gather(o, ['#bff8ff', '#2ad0e0', '#ffe14a'], 640, 44, 16);
      await step(640, (c, k) => {
        const p = o(), r = 2 + easeOut(k) * 6 + Math.sin(G.t * 40);
        pxCircle(c, p.x, p.y, r + 2, BEAM[0]); pxCircle(c, p.x, p.y, r + 1, BEAM[1]); pxCircle(c, p.x, p.y, r * 0.6, BEAM[2]); pxCircle(c, p.x, p.y, r * 0.3, '#ffffff');
        pxRing(c, p.x, p.y, (1 - ((k * 3) % 1)) * 18 + r, BEAM[1], 1);
        if (k > 0.55) glint(c, p.x, p.y, 6 + k * 8, '#ffffff');
      });
      Sfx.play('zap'); Sfx.play('boom');
      screenFlash('#bff8ff', 0.7);
      shake(7, 760);
      const p = o(), ang = Math.atan2(fc.y - p.y, fc.x - p.x), ux = Math.cos(ang), uy = Math.sin(ang);
      const far = (VIEW.x + VIEW.w + 20 - p.x) / ux, toFoe = Math.hypot(fc.x - p.x, fc.y - p.y) - 6;
      let hit = false;
      tween(hero, { ox: -12, squash: 0.1 }, 160);
      await step(780, (c, k) => {
        const reach = far * easeOut(k01(k * 5)), e = k < 0.1 ? k / 0.1 : k > 0.7 ? (1 - k) / 0.3 : 1;
        const w = Math.max(1, (14 + Math.sin(G.t * 50) * 1.5) * e), ex = p.x + ux * reach, ey = p.y + uy * reach;
        pxLine(c, p.x, p.y, ex, ey, BEAM[0], Math.round(w + 4));
        pxLine(c, p.x, p.y, ex, ey, BEAM[1], Math.round(w));
        if (w > 4) pxLine(c, p.x, p.y, ex, ey, BEAM[2], Math.round(w * 0.55));
        if (w > 6) pxLine(c, p.x, p.y, ex, ey, '#ffffff', Math.round(w * 0.25));
        for (let i = 0; i < 4; i++) { const d = ((k * 3 + i / 4) % 1) * reach; ellRing(c, p.x + ux * d, p.y + uy * d, 2, w / 2 + 4, BEAM[2], 1); }
        pxCircle(c, p.x, p.y, w * 0.7 + 3, BEAM[2]); pxCircle(c, p.x, p.y, w * 0.4 + 1, '#ffffff');
        if (!hit && reach >= toFoe) {
          hit = true;
          m.hit(0);
          focusLines(fc, BEAM[2], 380);
          impact(fc, ['#ffffff', BEAM[2], BEAM[1]], 20);
          blast(fc, 16, 520, [BEAM[1], BEAM[2], '#ffffff']);
          tween(F, { ox: 12 }, 160).then(() => tween(F, { ox: 0 }, 360));
        }
      });
      if (!hit) m.hit(0);
      smoke(o().x, o().y, 8, SMOKE, 20);
      await settle(260);
    },

    // ---------- Enies Lobby: Funkfreed ----------

    // Trunk Whip: Funkfreed turns into an elephant, rears its trunk back with a trumpet and lashes it down.
    trunkwhip: async m => {
      const fc = fc0(), hero = G.hero;
      hold(true);
      await crouch(90, -3);
      await dash(18, 110);
      const base = () => ({ x: hero.x + hero.ox + 12, y: 99 + hero.oy });
      const spine = (tip, ctrl) => { const b = base(); return path(14, t => qb(b, ctrl, tip, t)); };
      Sfx.play('stretch');
      await step(220, (c, k) => { const b = base(), e = easeOut(k); trunk(c, spine({ x: lerp(b.x + 6, b.x - 6, e), y: lerp(b.y - 6, 48, e) }, { x: b.x + 12, y: lerp(b.y - 4, 72, e) })); });
      floatText(base().x, 40, 'PAOO!', '#e8e8f0');
      Sfx.play('slash');
      const trail = [];
      await step(150, (c, k) => {
        const b = base(), e = easeIn(k), tip = qb({ x: b.x - 6, y: 48 }, { x: fc.x - 8, y: 26 }, { x: fc.x - 2, y: fc.y - 2 }, e);
        trail.push(tip);
        for (let i = 1; i < trail.length; i++) pxLine(c, trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, i === trail.length - 1 ? '#ffffff' : ELE[2], Math.max(1, 6 - (trail.length - i)));
        trunk(c, spine(tip, { x: lerp(b.x + 12, b.x + 32, e), y: lerp(72, 50, e) }));
      });
      m.hit(0);
      Sfx.play('hit');
      impact({ x: fc.x - 2, y: fc.y - 2 }, ['#ffffff', ELE[2], ELE[1]], 14);
      shock({ x: fc.x - 2, y: fc.y - 2 }, [ELE[2], '#ffffff'], 4, 20, 240, 2);
      shake(4, 200);
      dust(fc.x, 8);
      // the trunk rebounds and shrinks back into the blade
      await step(240, (c, k) => {
        const b = base(), e = easeIn(k);
        trunk(c, spine({ x: lerp(fc.x - 2, b.x + 4, e), y: lerp(fc.y - 2 + Math.sin(k * 9) * 3 * (1 - k), b.y - 2, e) }, { x: lerp(b.x + 32, b.x + 6, e), y: lerp(56, b.y - 4, e) }));
      });
      hold(false);
      await settle(200);
    },

    // Elephant Stampede: Funkfreed trumpets and a herd thunders in, each bull ramming the foe in turn.
    stampede: async m => {
      const fc = fc0(), F = G.battle.F;
      Sfx.play('charge');
      floatText(G.hero.x + 10, 70, 'PAOOO!', '#e8e8f0');
      await tween(G.hero, { squash: 0.15, oy: -3 }, 140);
      tween(G.hero, { squash: 0, oy: 0 }, 140);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const far = i % 2, s = far ? 1.05 : 1.25, y = far ? 118 : 123, x1 = fc.x - 24, last = i === m.hits - 1;
        Sfx.play('bump');
        await step(230, (c, k) => {
          const x = lerp(VIEW.x - 20, x1, k), bob = Math.abs(Math.sin(k * 20)) * 2;
          for (let j = 0; j < 3; j++) pxRect(c, x - 36 - j * 10, y - 20 + j * 6, 12, 1, '#ffffff');
          elephant(c, x, y - bob, Math.floor(k * 12), s);
          if (Math.random() < 0.6) particles(x - 10, 119, 1, { colors: ['#c9b88a', '#e8d9b0'], speed: 30, grav: -20, dir: -2.6, spread: 0.8, life: 0.4, size: 2 });
        });
        m.hit(i);
        Sfx.play('hit');
        impact({ x: x1 + 18 * s, y: y - 17 * s }, ['#ffffff', ELE[2], '#c9b88a'], last ? 14 : 8);
        dust(fc.x - 6, last ? 14 : 6);
        F.squash = -0.12; tween(F, { squash: 0 }, 160);
        shake(last ? 6 : 3, last ? 300 : 140);
        if (last) shock({ x: fc.x, y: 121 }, ['#c9b88a', '#ffffff'], 4, 40, 380, 2, 0.25);
        // the bull bounces off and stomps away
        fxRun(320, (c, k) => { c.globalAlpha = 1 - k; elephant(c, lerp(x1, x1 - 30, easeOut(k)), y - Math.sin(k * Math.PI) * 14, Math.floor(k * 10), s); c.globalAlpha = 1; });
        await wait(60);
      }
      await wait(280);
    },

    // Ivory Lance: Funkfreed's tusk grows into a giant lance that skewers straight through the foe.
    ivorylance: async m => {
      const fc = fc0(), F = G.battle.F, hero = G.hero;
      hold(true);
      const base = () => ({ x: hero.x + hero.ox + 12, y: 100 + hero.oy });
      const end = { x: fc.x + 36, y: fc.y - 2 };
      const lance = (c, ext) => {
        const b = base(), tip = { x: lerp(b.x, end.x, ext), y: lerp(b.y, end.y, ext) };
        const P = path(16, t => ({ x: lerp(b.x, tip.x, t), y: lerp(b.y, tip.y, t) - Math.sin(t * Math.PI) * 6 * ext }));
        for (let L = 0; L < 4; L++) {
          for (let i = 0; i <= 16; i++) {
            const r = Math.max(1, 8 * Math.pow(1 - i / 16, 0.8) * Math.min(1, ext * 4)), p = P[i];
            if (L === 0) pxCircle(c, p.x, p.y, r + 1, IVORY[0]);
            else if (L === 1) pxCircle(c, p.x, p.y, r, IVORY[1]);
            else if (L === 2) { if (r > 2) pxRect(c, p.x - 1, p.y + r * 0.3, 3, r * 0.6, IVORY[3]); }
            else pxRect(c, p.x, p.y - r * 0.6, 2, 1, '#ffffff');
          }
        }
        return tip;
      };
      // wind-up: draw way back as the tusk starts to grow and gleam
      Sfx.play('charge');
      tween(hero, { ox: -8, squash: 0.22 }, 320);
      gather(() => base(), ['#ffffff', IVORY[1]], 340, 28, 12);
      await step(340, (c, k) => { const t = lance(c, 0.08 + k * 0.04); if (k > 0.4) glint(c, t.x, t.y, 3 + k * 5, '#ffffff'); });
      // thrust!
      Sfx.play('slash');
      tween(hero, { ox: 16, squash: -0.15 }, 110, easeIn);
      const reach = (fc.x - 4 - base().x) / (end.x - base().x);
      await step(110, (c, k) => { lance(c, lerp(0.12, reach, easeIn(k))); streaks(c, k, fc.y - 22, fc.y + 16, 8, '#ffffff', 1, base().x, fc.x); });
      m.hit(0);
      Sfx.play('crit');
      focusLines(fc, '#ffffff', 280);
      impact(fc, ['#ffffff', IVORY[1], IVORY[3]], 18);
      shake(6, 340);
      tween(F, { ox: 10 }, 120).then(() => tween(F, { ox: 0 }, 320));
      // it bursts out of the far side
      fxRun(320, (c, k) => {
        for (let i = 0; i < 7; i++) {
          const a = (i - 3) * 0.17, r0 = 12 + k * 22, r1 = r0 + 16 * (1 - k);
          pxLine(c, fc.x + Math.cos(a) * r0, fc.y + Math.sin(a) * r0, fc.x + Math.cos(a) * r1, fc.y + Math.sin(a) * r1, i % 2 ? IVORY[3] : '#ffffff', k < 0.4 ? 2 : 1);
        }
      });
      particles(fc.x + 12, fc.y, 12, { colors: ['#ffffff', IVORY[1]], speed: 130, grav: 40, dir: 0, spread: 0.7 });
      await step(90, (c, k) => lance(c, lerp(reach, 1, easeOut(k))));
      await step(180, c => lance(c, 1 + Math.sin(G.t * 90) * 0.012));
      await step(200, (c, k) => lance(c, 1 - easeIn(k) * 0.9));
      hold(false);
      await settle(200);
    },

    // ---------- Enies Lobby: Rokushiki Gloves ----------

    // Shigan: Soru up to the foe in a blink and drive one finger into them like a bullet.
    shigan: async m => {
      const hero = G.hero;
      await crouch(90, -3);
      await soru(56, 70);
      const fc = fc0(), p = { x: fc.x - 6, y: fc.y - 2 }, h = () => ({ x: hero.x + hero.ox + 8, y: 100 + hero.oy });
      Sfx.play('crit');
      await step(60, (c, k) => { const a = h(); stroke(c, [a, { x: lerp(a.x, p.x, easeIn(k)), y: lerp(a.y, p.y, easeIn(k)) }], [PAL.k, '#f3c08c'], 2); });
      tween(hero, { ox: 60, squash: -0.08 }, 50);
      m.hit(0);
      focusLines(p, '#ffffff', 200);
      shock(p, ['#ffffff', '#c9ccd6'], 2, 15, 240, 2);
      shock(p, ['#c9ccd6', '#ffffff'], 1, 8, 160, 1);
      particles(p.x, p.y, 8, { colors: ['#ffffff', '#c9ccd6'], speed: 110, grav: 0, life: 0.2, size: 1, dir: 0, spread: 1.2 });
      shake(3, 160);
      // the finger stays planted for a beat, leaving a cracked dent
      await step(260, (c, k) => {
        stroke(c, [h(), p], [PAL.k, '#f3c08c'], 2);
        c.globalAlpha = 1 - k * 0.5;
        pxCircle(c, p.x + 1, p.y, 2, '#1b1424');
        for (let i = 0; i < 6; i++) { const b = i * 1.05 + 0.3, L = 6 + (i % 2) * 3; pxLine(c, p.x + Math.cos(b) * 3, p.y + Math.sin(b) * 3, p.x + Math.cos(b) * L, p.y + Math.sin(b) * L, '#3a3440', 1); }
        c.globalAlpha = 1;
      });
      await soru(0, 80);
      await settle(120);
    },

    // Rankyaku: leap and kick so fast the air itself becomes a crescent blade that flies at the foe.
    rankyaku: async m => {
      const hero = G.hero, fc = fc0();
      await crouch(90, -2);
      Sfx.play('stretch');
      await tween(hero, { oy: -18, ox: 4, squash: -0.15 }, 150, easeOut);
      const foot = { x: hero.x + hero.ox + 4, y: 104 + hero.oy };
      Sfx.play('slash');
      tween(hero, { squash: 0.1 }, 80);
      crescent(foot.x, foot.y - 4, 15, 2.0, -1.0, ['#5a7aa0', '#c9e4ff', '#ffffff'], 220, 6);
      await wait(80);
      const from = { x: foot.x + 14, y: foot.y - 6 };
      await step(240, (c, k) => {
        const x = lerp(from.x, fc.x, k), y = lerp(from.y, fc.y, k);
        for (let i = 0; i < 5; i++) pxRect(c, x - 16 - i * 8 - (i % 2) * 3, y - 10 + i * 5, 10 - i, 1, i % 2 ? '#c9e4ff' : '#ffffff');
        airBlade(c, x, y, 1.3 + k * 0.4);
      });
      m.hit(0);
      slashAt(fc, '#c9e4ff', Math.PI / 2 - 0.25, 44);
      impact(fc, ['#ffffff', '#c9e4ff', '#7aa0c8'], 12);
      shake(4, 200);
      // the blade carries on through and dissipates
      fxRun(220, (c, k) => { c.globalAlpha = 1 - k; airBlade(c, fc.x + 10 + k * 46, fc.y, 1.7 + k * 0.5); c.globalAlpha = 1; });
      await tween(hero, { oy: 0, ox: 0, squash: 0.15 }, 160, easeIn);
      dust(hero.x, 6);
      await settle(140);
    },

    // Rokuogan: Soru in, press both fists to the foe, gather everything, and release a shockwave that
    // blasts through them and out the other side.
    rokuogan: async m => {
      const hero = G.hero, F = G.battle.F;
      await crouch(80, -3);
      await soru(56, 80);
      const fc = fc0(), p = { x: fc.x - 14, y: fc.y };
      const fists = (c, j) => { for (const dy of [-5, 5]) { pxCircle(c, p.x + j, p.y + dy, 4, PAL.k); pxCircle(c, p.x + j, p.y + dy, 3, '#f3c08c'); pxRect(c, p.x + j - 1, p.y + dy - 2, 2, 1, '#ffe0c0'); } };
      Sfx.play('haki');
      tween(hero, { squash: 0.22 }, 200);
      tint('#000000', 0.35, 1300);
      gather(p, ['#ffffff', '#c9d4e4'], 520, 44, 16);
      await step(520, (c, k) => { fists(c, Math.sin(G.t * 80) * 0.6 * k); pxRing(c, p.x, p.y, (1 - ((k * 2) % 1)) * 28 + 6, '#ffffff', 1); });
      Sfx.play('boom'); Sfx.play('crit');
      screenFlash('#ffffff', 0.9);
      m.hit(0);
      shake(10, 600);
      focusLines(fc, '#ffffff', 380);
      impact(p, ['#ffffff', '#c9d4e4'], 18);
      tween(hero, { squash: -0.1, ox: 50 }, 100);
      tween(F, { ox: 26, squash: -0.12 }, 140, easeOut).then(() => tween(F, { ox: 0, squash: 0 }, 360));
      // the shockwave: rings round the fists, and wave fronts surging out the far side
      await step(640, (c, k) => {
        if (k < 0.4) fists(c, 0);
        for (let i = 0; i < 3; i++) {
          const q = k01(k * 1.4 - i * 0.15);
          if (q > 0 && q < 1) ellRing(c, p.x, p.y, 4 + q * 40, (4 + q * 40) * 1.1, i % 2 ? '#c9d4e4' : '#ffffff', q < 0.5 ? 2 : 1);
        }
        for (let i = 0; i < 4; i++) {
          const q = k01(k * 1.3 - i * 0.12);
          if (q <= 0 || q >= 1) continue;
          const x = p.x + 12 + q * 110, hh = 14 + q * 26;
          c.globalAlpha = 1 - q;
          for (let y = -hh; y <= hh; y += 2) pxRect(c, x + Math.abs(y) * 0.35 + Math.sin(y * 0.4 + q * 12) * 1.5, p.y + y, 2, 2, i % 2 ? '#c9d4e4' : '#ffffff');
          c.globalAlpha = 1;
        }
        if (k < 0.5 && Math.random() < 0.6) particles(p.x + 20 + Math.random() * 60, 119, 1, { colors: ['#c9b88a', '#e8d9b0'], speed: 50, grav: -20, dir: -0.3, spread: 0.6, life: 0.5, size: 2 });
      });
      await soru(0, 90);
      await settle(160);
    },

    // ---------- Thriller Bark: Shusui ----------

    // Ryuma Draw: Ryuma's ghost rises behind you; you sink into a quick-draw stance, flash past the
    // foe, and the cut only lands a heartbeat later.
    ryumadraw: async m => {
      const hero = G.hero, img = wImg('shusui');
      hold(true);
      const ghost = getSprite({ kind: 'human', head: 'hair', weapon: 'swords', pal: { h: '#2a3a5a', c: '#3a5a8a', C: '#9ab0c8', p: '#2a3a5a', s: '#c9d4e4' } }, 'tint', '#7ab8ff');
      const hx0 = hero.x;
      const show = fxRun(1000, (c, k) => drawSpriteAt(c, ghost, hx0 - 16, 121, 3, { alpha: 0.45 * env(k, 0.2, 0.3), shadow: false }));
      Sfx.play('haki');
      tween(hero, { ox: -4, squash: 0.22 }, 200);
      // iai stance: the blade low at the hip, a glint running along it
      await step(380, (c, k) => {
        const x = hero.x + hero.ox + 4, y = 106 + hero.oy, g = lerp(-10, 10, k);
        drawRot(c, img, x, y, -Math.PI / 2 - 0.25, 2);
        if (k > 0.3) glint(c, x - Math.cos(0.25) * g, y + Math.sin(0.25) * g, 3, SHU[3]);
        if (Math.random() < 0.4) particles(x + rand(-10, 6), 114, 1, { colors: [SHU[2], SHU[3]], speed: 20, grav: -60, dir: -Math.PI / 2, spread: 0.4, life: 0.5, size: 1 });
      });
      // the draw: one flash and you are already past them
      const fc = fc0(), endX = fc.x + 40 - hero.x, startX = hero.x + hero.ox + 10, cutY = fc.y + 2;
      Sfx.play('slash');
      await tween(hero, { ox: endX, squash: -0.15 }, 80, easeIn);
      fxRun(460, (c, k) => {
        c.globalAlpha = 1 - k * 0.6;
        stroke(c, [{ x: startX, y: cutY + 4 }, { x: hero.x + endX, y: cutY - 4 }], [SHU[0], SHU[2], '#ffffff'], Math.max(1, Math.round(4 * (1 - k))));
        c.globalAlpha = 1;
      });
      // a beat of silence, blade held out...
      const pose = layer(c => drawRot(c, img, hero.x + hero.ox + 15, 101 + hero.oy, Math.PI / 2 + 0.35, 2));
      await wait(240);
      // ...then the cut lands
      m.hit(0);
      Sfx.play('crit');
      slashAt(fc, SHU[2], -0.2, 52);
      slashAt(fc, '#ffffff', -0.2, 36);
      impact(fc, ['#ffffff', SHU[3], SHU[1]], 16);
      shake(5, 260);
      particles(fc.x, fc.y, 14, { colors: [SHU[0], SHU[2], SHU[3]], speed: 80 });
      await wait(120);
      pose();
      await tween(hero, { ox: 0, squash: 0 }, 150, easeIn);
      hold(false);
      await settle(120);
      await show;
    },

    // Shadow Lion Strike: each cut throws a lion's head of black shadow that bites into the foe.
    shadowlion: async m => {
      const hero = G.hero, fc = fc0(), img = wImg('shusui');
      hold(true);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const up = i % 2, pv = { x: hero.x + hero.ox + 8, y: 98 }, a0 = up ? 1.3 : -2.2, a1 = up ? -1.5 : 0.9;
        Sfx.play('slash');
        crescent(pv.x, pv.y, 16, a0, a1, [SHU[0], SHU[2], '#ffffff'], 200, 5);
        tween(hero, { ox: 6, squash: -0.08 }, 80);
        await step(100, (c, k) => wield(c, img, pv.x, pv.y, lerp(a0, a1, easeOut(k)), 8, 2));
        const from = { x: pv.x + 14, y: pv.y - 4 }, ty = fc.y - 5 + up * 10;
        Sfx.play('haki');
        await step(220, (c, k) => {
          const x = lerp(from.x, fc.x - 4, k), y = lerp(from.y, ty, k);
          wield(c, img, pv.x, pv.y, a1, 8, 2);
          for (let j = 3; j >= 1; j--) { c.globalAlpha = 0.45 / j; lionHead(c, x - j * 9, y, 0.9, 2); }
          c.globalAlpha = 1;
          lionHead(c, x, y, 1, 3 + Math.sin(k * 20));
        });
        m.hit(i);
        Sfx.play('bite');
        fxRun(150, (c, k) => { c.globalAlpha = 1 - k; lionHead(c, fc.x - 4 + k * 6, ty, 1 + k * 0.4, 3 * (1 - k)); c.globalAlpha = 1; });
        slashAt({ x: fc.x, y: ty }, SHU[2], up ? -0.7 : 0.7, 34);
        impact({ x: fc.x, y: ty }, ['#ffffff', SHU[2], SHU[0]], 10);
        particles(fc.x, ty, 8, { colors: [SHU[0], SHU[1]], speed: 60, grav: -20, size: 2 });
        shake(3, 140);
        await wait(100);
      }
      hold(false);
      await settle(200);
    },

    // Black Tornado: spin the black blade into a whirlwind, send it at the foe, lift them inside it,
    // cut them in mid-air, and let them crash down.
    blacktornado: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), img = wImg('shusui');
      hold(true);
      Sfx.play('charge');
      tween(hero, { squash: 0.15 }, 200);
      await step(380, (c, k) => {
        const p = { x: hero.x + hero.ox + 2, y: 100 }, a = easeIn(k) * Math.PI * 5;
        c.globalAlpha = 0.6 * k; ellRing(c, p.x, p.y + 4, 18, 6, SHU[2], 1); c.globalAlpha = 1;
        wield(c, img, p.x, p.y, a, 10, 2);
        if (Math.random() < 0.5) particles(p.x + rand(-14, 14), 120, 1, { colors: ['#c9b88a', SHU[1]], speed: 40, grav: -30, dir: -Math.PI / 2, spread: 1, life: 0.4, size: 2 });
      });
      Sfx.play('boom');
      const T = { x: hero.x + hero.ox + 14, grow: 0.3, a: 1 };
      const stop = layer(c => {
        funnel(c, T.x, 122, T.grow, T.a, ['#1b2a20', SHU[0], SHU[2]]);
        if (T.a > 0.5 && Math.random() < 0.5) particles(T.x + rand(-20, 20), 120, 1, { colors: ['#c9b88a', '#9a8a6a'], speed: 60, grav: -60, dir: -Math.PI / 2, spread: 0.8, life: 0.5 });
      });
      tween(hero, { squash: -0.1, ox: 6 }, 120);
      await tween(T, { x: F.x, grow: 1 }, 380, linear);
      // lift: the foe rises inside it while blades flash within
      Sfx.play('slash');
      const up = tween(F, { oy: -34, squash: -0.15 }, 420, easeOut);
      for (let j = 0; j < 3; j++) { slashAt({ x: F.x + rand(-8, 8), y: fc.y - 10 - j * 8 }, SHU[2], rand(-1, 1), 22); await wait(110); }
      await up;
      m.hit(0);
      Sfx.play('crit');
      const top = foeC();
      slashMarks(top, 3, SHU[3], 36, -0.9, 7);
      focusLines(top, SHU[3], 280);
      impact(top, ['#ffffff', SHU[3], SHU[1]], 18);
      shake(7, 380);
      await wait(100);
      // the wind dies and the foe crashes down
      tween(T, { a: 0, grow: 1.3 }, 300);
      await tween(F, { oy: 0, squash: 0.3 }, 200, easeIn);
      Sfx.play('boom');
      shake(5, 240);
      dust(F.x, 16);
      shock({ x: F.x, y: 121 }, ['#c9b88a', '#ffffff'], 4, 40, 360, 2, 0.25);
      tween(F, { squash: 0 }, 220);
      await wait(120);
      stop();
      hold(false);
      await settle(220);
    },

    // ---------- Thriller Bark: Shadow Scissors ----------

    // Snip Snip: Moria's giant scissors appear at the foe, spread wide and snap shut, twice.
    snipsnip: async m => {
      const fc = fc0();
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const rot = i % 2 ? -0.35 : 0.25, px = fc.x - 26, py = fc.y + (i % 2 ? 6 : -4);
        Sfx.play('stretch');
        await step(170, (c, k) => { c.globalAlpha = k01(k * 4); shears(c, px - (1 - easeOut(k)) * 10, py, rot, lerp(0.15, 0.75, easeOut(k)), 1); c.globalAlpha = 1; });
        Sfx.play('slash');
        await step(60, (c, k) => shears(c, px, py, rot, lerp(0.75, 0, easeIn(k)), 1));
        m.hit(i);
        const cx = px + Math.cos(rot) * 26, cy = py + Math.sin(rot) * 26;
        fxRun(200, (c, k) => { const r = 14 * (1 - k) + 2; pxLine(c, cx - r, cy - r, cx + r, cy + r, '#ffffff', k < 0.4 ? 2 : 1); pxLine(c, cx - r, cy + r, cx + r, cy - r, SCI[3], k < 0.4 ? 2 : 1); });
        impact({ x: cx, y: cy }, ['#ffffff', SCI[1], SCI[3]], 10);
        shake(3, 120);
        await step(140, (c, k) => { c.globalAlpha = 1 - k; shears(c, px, py, rot, 0.05, 1); c.globalAlpha = 1; });
      }
    },

    // Shadow Cut: the scissors snip the foe's shadow off at their feet; it stands up and slinks over to you.
    shadowcut: async m => {
      const F = G.battle.F, hero = G.hero, sx = F.x + F.ox;
      Sfx.play('haki');
      await step(260, (c, k) => {
        c.globalAlpha = 0.7; ellFill(c, sx, 121, 16, 3, '#1b1424'); c.globalAlpha = 1;
        ellRing(c, sx, 121, 16 + Math.sin(k * 20) * 2, 3, SCI[3], 1);
        c.globalAlpha = k01(k * 4); shears(c, sx - 30, 119, 0, lerp(0.1, 0.55, easeOut(k)), 0.9); c.globalAlpha = 1;
      });
      Sfx.play('slash');
      await step(60, (c, k) => { ellFill(c, sx, 121, 16, 3, '#1b1424'); shears(c, sx - 30, 119, 0, lerp(0.55, 0, easeIn(k)), 0.9); });
      m.hit(0);
      F.flash = 0.25;
      impact({ x: sx, y: 118 }, ['#ffffff', SCI[3], '#1b1424'], 10);
      slashAt({ x: sx, y: 119 }, SCI[3], 0, 40);
      shake(3, 160);
      // the shadow peels off the ground, stands up and slinks over to you
      Sfx.play('stretch');
      const toX = hero.x + 6;
      await step(560, (c, k) => {
        const x = lerp(sx, toX, easeIn(k01((k - 0.25) / 0.75))) + Math.sin(k * 18) * 2;
        shadowFig(c, x, 121, easeOut(k01(k * 3)) * (1 - k01((k - 0.85) / 0.15) * 0.8));
        if (Math.random() < 0.5) particles(x, 118, 1, { colors: ['#1b1424', SCI[3]], speed: 20, grav: -30, life: 0.4, size: 2 });
      });
      // and sinks into your own shadow
      Sfx.play('haki');
      hero.flash = 0.2;
      particles(hero.x, 116, 12, { colors: ['#1b1424', SCI[3], '#9a7ac0'], speed: 50, grav: -40 });
      shock({ x: hero.x, y: 120 }, [SCI[3], '#9a7ac0'], 4, 24, 300, 2, 0.3);
      await wait(220);
    },

    // Brick Bat Swarm: bats boil up out of your shadow, stream across and tear at the foe, then scatter.
    brickbats: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0();
      const B = Array.from({ length: 16 }, (_, i) => ({ ph: i * 0.39, r: 8 + (i * 7) % 16, sp: 6 + (i % 5), d: (i % 4) * 0.1 }));
      const S = { r: 0, go: 0, dive: 0, burst: 0, a: 1 };
      const stop = layer(c => {
        const h = { x: hero.x + hero.ox, y: 96 }, f = { x: F.x + F.ox, y: fc.y };
        c.globalAlpha = S.a;
        for (let i = 0; i < B.length; i++) {
          const b = B[i], q = easeIO(k01((S.go - b.d) / 0.7)), ang = G.t * b.sp + b.ph;
          const rr = b.r * S.r * (1 - S.dive * 0.6) * (1 + S.burst * 4);
          const x = lerp(h.x, f.x, q) + Math.cos(ang) * rr, y = lerp(h.y, f.y, q) - Math.sin(q * Math.PI) * 26 + Math.sin(ang) * rr * 0.6 - S.burst * 24;
          batDraw(c, x, y, Math.floor(G.t * 16 + i) % 2);
        }
        c.globalAlpha = 1;
      });
      Sfx.play('charge');
      particles(hero.x, 118, 10, { colors: ['#1b1424', '#3a2a4a'], speed: 40, grav: -40, size: 3 });
      await tween(S, { r: 1 }, 260);
      Sfx.play('stretch');
      await tween(S, { go: 1 }, 380, linear);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        tween(S, { dive: 1 }, 70).then(() => tween(S, { dive: 0 }, 120));
        await wait(70);
        m.hit(i);
        Sfx.play('bite');
        impact({ x: fc.x + rand(-8, 8), y: fc.y + rand(-8, 8) }, ['#ffffff', SCI[3], '#1b1424'], 6);
        shake(2, 80);
        await wait(120);
      }
      await tween(S, { burst: 1, a: 0 }, 320);
      stop();
    },

    // ---------- Sabaody: Bubble Blaster ----------

    // Bubble Trap: blow a big wobbling bubble that drifts over, swallows the foe and lifts them, then
    // pops and drops them.
    bubbletrap: async m => {
      const F = G.battle.F, fc = fc0(), hero = G.hero;
      const tip = () => ({ x: hero.x + hero.ox + 14, y: 94 + hero.oy });
      const R = Math.max(16, Math.min(26, foeH() * 0.55));
      Sfx.play('stretch');
      tween(hero, { squash: 0.12 }, 200);
      await step(240, (c, k) => { const p = tip(), e = easeOut(k); bubble(c, p.x + e * 4, p.y - e * 4, 2 + e * 6, Math.sin(k * 20) * 0.12); });
      tween(hero, { squash: 0 }, 120);
      const p0 = tip(), from = { x: p0.x + 4, y: p0.y - 4 };
      await step(360, (c, k) => {
        const p = qb(from, { x: lerp(from.x, fc.x, 0.5), y: from.y - 30 }, fc, easeIO(k));
        for (let j = 1; j <= 3; j++) bubble(c, p.x - j * 8, p.y + Math.sin(G.t * 10 + j) * 3, 2, 0);
        bubble(c, p.x, p.y, lerp(8, R * 0.8, k), Math.sin(G.t * 14) * 0.1);
      });
      // it swallows them whole...
      Sfx.play('stretch');
      m.hit(0);
      particles(fc.x, fc.y, 10, { colors: [BUB[1], BUB[2]], speed: 50, grav: 0, life: 0.3, size: 1 });
      const lift = tween(F, { oy: -14 }, 380, easeOut);
      await step(380, (c, k) => { const p = foeC(); bubble(c, p.x, p.y, R * (1 + 0.12 * Math.sin(k * 14) * (1 - k)), Math.sin(G.t * 10) * 0.06); });
      await lift;
      // ...and pops
      Sfx.play('splash');
      const pc = foeC();
      fxRun(200, (c, k) => { for (let i = 0; i < 10; i++) { const a = i * 0.628, r0 = R + k * 8, r1 = r0 + 6 * (1 - k); pxLine(c, pc.x + Math.cos(a) * r0, pc.y + Math.sin(a) * r0, pc.x + Math.cos(a) * r1, pc.y + Math.sin(a) * r1, '#ffffff', 1); } });
      shock(pc, [BUB[1], '#ffffff'], R, R + 12, 220, 1);
      particles(pc.x, pc.y, 18, { colors: [BUB[1], BUB[2], '#ffffff'], speed: 90, grav: 120, size: 1 });
      await tween(F, { oy: 0 }, 180, easeIn);
      F.squash = 0.25; tween(F, { squash: 0 }, 220);
      Sfx.play('hit');
      dust(F.x, 8);
      shake(3, 140);
      await settle(80);
    },

    // Bubble Burst: a stream of bubbles drifts onto the foe, they flare up, then pop in a chain of blasts.
    bubbleburst: async m => {
      const fc = fc0(), hero = G.hero, tip = { x: hero.x + 14, y: 94 };
      const pts = Array.from({ length: 9 }, (_, i) => ({ x: fc.x + Math.cos(i * 2.4) * (5 + (i % 3) * 6), y: fc.y + Math.sin(i * 2.4) * (5 + (i % 3) * 6), r: 3 + (i % 3) * 2, d: i * 0.06, pop: false }));
      Sfx.play('stretch');
      tween(hero, { squash: 0.1 }, 200);
      await step(560, (c, k) => pts.forEach(p => {
        const q = k01((k - p.d) / 0.5);
        if (q <= 0) return;
        const e = easeOut(q);
        bubble(c, lerp(tip.x, p.x, e), lerp(tip.y, p.y, e) - Math.sin(e * Math.PI) * 18, p.r * (0.5 + 0.5 * e), Math.sin(G.t * 12 + p.d * 30) * 0.1);
      }));
      tween(hero, { squash: 0 }, 120);
      const stop = layer(c => pts.forEach(p => { if (!p.pop) bubble(c, p.x, p.y, p.r, Math.sin(G.t * 12 + p.d * 30) * 0.08); }));
      // they flare up...
      Sfx.play('charge');
      await step(200, (c, k) => pts.forEach((p, i) => { if (Math.floor(k * 12 + i) % 2) pxRing(c, p.x, p.y, p.r + 1, '#ffe14a', 1); }));
      // ...and burst one after another
      m.hit(0);
      Sfx.play('boom');
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.pop = true;
        if (i % 3 === 0) Sfx.play('miss');
        fxRun(200, (c, k) => { if (k < 0.3) pxCircle(c, p.x, p.y, p.r * (1 - k), '#ffffff'); for (let j = 0; j < 6; j++) { const a = j * 1.05, r0 = p.r + k * 6, r1 = r0 + 4 * (1 - k); pxLine(c, p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0, p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1, j % 2 ? BUB[1] : '#ffe14a', 1); } });
        particles(p.x, p.y, 5, { colors: [BUB[1], '#ffffff', '#ffe14a'], speed: 70, grav: 40, life: 0.3, size: 1 });
        await wait(40);
      }
      stop();
      screenFlash('#e6f8ff', 0.4);
      shock(fc, ['#ffe14a', '#ffffff'], 8, 40, 320, 2);
      impact(fc, ['#ffffff', '#ffe14a', BUB[1]], 18);
      shake(5, 260);
      await wait(220);
    },

    // Resin Bubble Barrage: rapid-fire bubbles of hardened amber that shatter on impact.
    bubblebarrage: async m => {
      const hero = G.hero, fc = fc0(), AMB = ['#6a3a0a', '#e8a23a', '#ffe0a0'];
      Sfx.play('charge');
      await crouch(120, -2);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const tip = { x: hero.x + hero.ox + 14, y: 96 + hero.oy }, ty = fc.y + [-8, 6, -2, 9, 0][i % 5], last = i === m.hits - 1, r = last ? 5 : 3;
        Sfx.play('shot');
        tween(hero, { ox: -6, squash: 0.08 }, 40).then(() => tween(hero, { ox: -2, squash: 0.02 }, 80));
        fxRun(80, (c, k) => pxRing(c, tip.x + 2, tip.y, 2 + k * 5, AMB[2], 1));
        await step(last ? 160 : 120, (c, k) => {
          const x = lerp(tip.x, fc.x - 4, k), y = lerp(tip.y, ty, k) - Math.sin(k * Math.PI) * 4;
          for (let j = 1; j <= 3; j++) pxRect(c, x - j * 6 - 4, y, 4, 1, j % 2 ? AMB[2] : '#ffffff');
          orb(c, x, y, r, AMB);
        });
        m.hit(i);
        Sfx.play('hit');
        impact({ x: fc.x - 4, y: ty }, ['#ffffff', AMB[2], AMB[1]], last ? 14 : 6);
        particles(fc.x - 4, ty, last ? 14 : 6, { colors: AMB, speed: 90, grav: 200, size: 2, life: 0.5 });
        if (last) { shock({ x: fc.x - 4, y: ty }, [AMB[1], '#ffffff'], 4, 26, 280, 2); shake(4, 200); } else shake(1, 60);
        await wait(50);
      }
      await settle(200);
    },

    // ---------- Sabaody: Murakumo Light Blade ----------

    // Light Edge: dissolve into a beam of light, reappear at the foe and cut a gold crescent.
    lightedge: async m => {
      const hero = G.hero, img = wImg('lightblade');
      hold(true);
      Sfx.play('zap');
      hero.flash = 0.15;
      await crouch(80, -2);
      const fc = fc0(), ox = 46;
      hero.alpha = 0;
      lightTrail({ x: hero.x + hero.ox, y: 104 }, { x: hero.x + ox, y: 104 }, 260, 4);
      particles(hero.x + hero.ox, 104, 6, { colors: LIGHT.slice(1), speed: 40, grav: 0, life: 0.3, size: 1 });
      await wait(50);
      hero.ox = ox; hero.alpha = 1; hero.squash = 0.12;
      Sfx.play('slash');
      const pv = { x: hero.x + ox + 10, y: 98 };
      crescent(pv.x + 4, pv.y + 2, 22, -2.3, 0.8, [LIGHT[0], LIGHT[1], '#ffffff'], 240, 7);
      await step(110, (c, k) => wield(c, img, pv.x, pv.y, lerp(-2.3, 0.8, easeOut(k)), 9, 2));
      m.hit(0);
      impact(fc, ['#ffffff', LIGHT[2], LIGHT[1]], 14);
      shake(3, 160);
      fxRun(420, (c, k) => {
        for (let i = 0; i < 4; i++) {
          if (Math.floor(k * 16 + i * 2) % 3 === 0) continue;
          glint(c, fc.x + [-10, 12, 4, -4][i], fc.y + [-12, -6, 10, 4][i], (4 - (i % 2) * 2) * (1 - k) + 1, LIGHT[2]);
        }
      });
      await step(160, c => wield(c, img, pv.x, pv.y, 0.8, 9, 2));
      // back the way you came, as light
      hero.alpha = 0;
      lightTrail({ x: hero.x + hero.ox, y: 104 }, { x: hero.x, y: 104 }, 200, 3);
      await wait(60);
      hold(false);
      hero.ox = 0;
      await settle(120);
    },

    // Flash Step Slash: blink around the foe as light, cutting from a new angle each time.
    flashstep: async m => {
      const hero = G.hero, fc = fc0();
      const spots = [[-26, -2, -2.4, 0.6], [24, -18, -0.6, 2.4], [-6, -32, -1.6, 1.4]];
      hold(true);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const [dx, oy, a0, a1] = spots[i % 3], from = { x: hero.x + hero.ox, y: 104 + hero.oy }, to = { x: fc.x + dx, y: 104 + oy };
        Sfx.play('zap');
        hero.alpha = 0;
        lightTrail(from, to, 240, 3);
        await wait(60);
        hero.ox = to.x - hero.x; hero.oy = oy; hero.alpha = 1;
        screenFlash('#fff6a0', 0.2);
        Sfx.play('slash');
        crescent(fc.x, fc.y, 18, a0, a1, [LIGHT[0], LIGHT[1], '#ffffff'], 220, 6);
        await wait(80);
        m.hit(i);
        impact(fc, ['#ffffff', LIGHT[2], LIGHT[1]], 10);
        particles(fc.x, fc.y, 6, { colors: LIGHT.slice(1), speed: 60, grav: 0, life: 0.3, size: 1 });
        await wait(110);
      }
      hero.alpha = 0;
      lightTrail({ x: hero.x + hero.ox, y: 104 + hero.oy }, { x: hero.x, y: 104 }, 220, 3);
      await wait(70);
      hero.ox = 0; hero.oy = 0;
      hold(false);
      await settle(120);
    },

    // Yata Mirror Strike: light bounces between two hovering mirrors and comes down on the foe as a
    // blinding beam.
    yatamirror: async m => {
      const hero = G.hero, fc = fc0();
      const h = { x: hero.x + 12, y: 94 }, m1 = { x: hero.x + 22, y: VIEW.y + 34 }, m2 = { x: fc.x + 46, y: VIEW.y + 22 };
      const M = { a: 0, l1: 0, l2: 0, b: 1 };
      const mirror = (c, p, l) => {
        pxCircle(c, p.x, p.y, 8, LIGHT[0]); pxCircle(c, p.x, p.y, 7, LIGHT[1]);
        pxCircle(c, p.x, p.y, 5, l > 0 ? '#ffffff' : '#bfe6ff');
        pxRect(c, p.x - 3, p.y - 3, 2, 1, '#ffffff');
        for (let i = 0; i < 8; i++) { const a = i * 0.785; pxRect(c, p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8, 1, 1, '#fff3a0'); }
        if (l > 0) glint(c, p.x, p.y, 6 + l * 8, LIGHT[2]);
      };
      const segs = [{ a: h, b: m1, e: 0, w: 2 }, { a: m1, b: m2, e: 0, w: 2 }, { a: m2, b: fc, e: 0, w: 5 }];
      const stop = layer(c => {
        c.globalAlpha = M.a; mirror(c, m1, M.l1); mirror(c, m2, M.l2);
        c.globalAlpha = M.b;
        for (const s of segs) {
          if (s.e <= 0) continue;
          const x = lerp(s.a.x, s.b.x, s.e), y = lerp(s.a.y, s.b.y, s.e);
          stroke(c, [s.a, { x, y }], [LIGHT[1], LIGHT[2], '#ffffff'], Math.max(1, Math.round(s.w + Math.sin(G.t * 40))));
          if (s.e < 1) pxCircle(c, x, y, s.w * 0.6 + 1, '#ffffff');
        }
        c.globalAlpha = 1;
      });
      Sfx.play('charge');
      tween(hero, { squash: 0.15 }, 200);
      tween(M, { a: 1 }, 300);
      gather(h, LIGHT.slice(1), 420, 30, 12);
      await step(420, (c, k) => { pxCircle(c, h.x, h.y, 1 + k * 3, LIGHT[2]); if (k > 0.5) glint(c, h.x, h.y, 3 + k * 5, '#ffffff'); });
      tween(hero, { squash: -0.1 }, 100);
      Sfx.play('zap');
      await tween(segs[0], { e: 1 }, 110, easeIn);
      M.l1 = 1; tween(M, { l1: 0.3 }, 300);
      Sfx.play('zap');
      await tween(segs[1], { e: 1 }, 110, easeIn);
      M.l2 = 1; tween(M, { l2: 0.3 }, 300);
      Sfx.play('zap');
      await tween(segs[2], { e: 1 }, 100, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#fffbe0', 0.8);
      focusLines(fc, LIGHT[2], 380);
      shake(7, 440);
      blast(fc, 18, 520, [LIGHT[1], LIGHT[2], '#ffffff']);
      impact(fc, ['#ffffff', LIGHT[2], LIGHT[1]], 22);
      rays(fc, '#fff3a0', 10, 34, 360);
      tween(segs[2], { w: 9 }, 120);
      await wait(380);
      await tween(M, { a: 0, b: 0 }, 280);
      stop();
      await settle(150);
    },

    // ---------- Impel Down: Jailer Chains ----------

    // Chain Lash: whirl the chain once and crack its weighted end across the foe like a whip.
    chainlash: async m => {
      const hero = G.hero, fc = fc0();
      const hand = () => ({ x: hero.x + hero.ox + 10, y: 100 + hero.oy });
      Sfx.play('stretch');
      tween(hero, { ox: -4, squash: 0.12 }, 160);
      await step(180, (c, k) => { const h = hand(), a = -Math.PI / 2 - k * Math.PI * 1.6, e = { x: h.x + Math.cos(a) * 14, y: h.y - 10 + Math.sin(a) * 8 }; links(c, h, e, 0); spikeBall(c, e.x, e.y, 3); });
      Sfx.play('slash');
      tween(hero, { ox: 6, squash: -0.1 }, 100, easeIn);
      const tip = { x: fc.x - 2, y: fc.y };
      await step(200, (c, k) => {
        const h = hand(), e = easeOut(k), x = lerp(h.x, tip.x, e), y = lerp(h.y - 14, tip.y, e) - Math.sin(e * Math.PI) * 16;
        links(c, h, { x, y }, 0, 6 * (1 - k));
        for (let i = 1; i <= 3; i++) pxRect(c, x - 8 - i * 6, y - 4 + i * 2, 5, 1, '#ffffff');
        spikeBall(c, x, y, 3 + e);
      });
      m.hit(0);
      Sfx.play('hit');
      fxRun(160, (c, k) => { if (Math.floor(k * 10) % 2) return; for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; zigzag(c, tip.x, tip.y, tip.x + Math.cos(a) * 16, tip.y + Math.sin(a) * 16, 3, 2, '#ffffff', 1); } });
      impact(tip, ['#ffffff', STEEL[1], STEEL[0]], 12);
      shake(4, 180);
      await step(220, (c, k) => { const h = hand(), e = easeIn(k), x = lerp(tip.x, h.x + 4, e), y = lerp(tip.y, h.y, e); links(c, h, { x, y }, 0, 5 * Math.sin(k * Math.PI)); spikeBall(c, x, y, 4 - k); });
      await settle(160);
    },

    // Iron Ball Crush: swing the iron ball round overhead, then bring it down on the foe like a meteor.
    ironball: async m => {
      const fc = fc0(), hero = G.hero, F = G.battle.F;
      const hand = () => ({ x: hero.x + hero.ox + 6, y: 82 + hero.oy });
      Sfx.play('charge');
      tween(hero, { squash: 0.15, ox: -3 }, 300);
      await step(520, (c, k) => {
        const h = hand(), a = -Math.PI / 2 + easeIn(k) * Math.PI * 4, x = h.x + Math.cos(a) * 22, y = h.y - 8 + Math.sin(a) * 7;
        c.globalAlpha = 0.5 * k;
        ellRing(c, h.x, h.y - 8, 22, 7, '#dfe4ec', 1);
        ellRing(c, h.x, h.y - 8, 23, 8, '#ffffff', 2, a - 1.2, a);
        c.globalAlpha = 1;
        links(c, h, { x, y }, 0);
        spikeBall(c, x, y, 7);
      });
      Sfx.play('stretch');
      tween(hero, { ox: 6, squash: -0.12 }, 120, easeIn);
      const h0 = hand(), from = { x: h0.x + 22, y: h0.y - 8 };
      await step(300, (c, k) => {
        const e = easeIn(k), p = qb(from, { x: lerp(from.x, fc.x, 0.5), y: VIEW.y + 20 }, { x: fc.x, y: fc.y - 4 }, e);
        links(c, hand(), p, 4);
        if (k > 0.5) for (let i = 0; i < 3; i++) pxRect(c, p.x - 6 + i * 6, p.y - 22 - (i % 2) * 6, 1, 12, '#ffffff');
        spikeBall(c, p.x, p.y, 7 + k * 2);
      });
      m.hit(0);
      Sfx.play('boom');
      shake(7, 380);
      impact(fc, ['#ffffff', '#c9ccd6', '#5a5a6a'], 16);
      shock({ x: fc.x, y: 121 }, ['#c9b88a', '#ffffff'], 4, 42, 380, 2, 0.28);
      rocks(fc.x, 116, 12);
      dust(fc.x, 14);
      F.squash = 0.3; tween(F, { squash: 0 }, 320);
      // a heavy bounce, then the chain reels it home
      const p1 = { x: fc.x, y: fc.y - 4 };
      await step(160, (c, k) => { const p = { x: p1.x + k * 8, y: p1.y + 8 - Math.sin(k * Math.PI) * 12 }; links(c, hand(), p, 4); spikeBall(c, p.x, p.y, 9); });
      await Promise.all([settle(260), step(260, (c, k) => {
        const h = hand(), e = easeIn(k), x = lerp(p1.x + 8, h.x + 6, e), y = lerp(p1.y + 8, h.y + 10, e);
        links(c, h, { x, y }, 6 * (1 - k));
        spikeBall(c, x, y, 9 - k * 3);
      })]);
    },

    // Lockdown: chains lash in from every side, wind round the foe, and a padlock clamps them shut.
    lockdown: async m => {
      const F = G.battle.F, fc = fc0();
      const from = [{ x: VIEW.x, y: 30 }, { x: VIEW.x + VIEW.w, y: 10 }, { x: fc.x - 70, y: VIEW.y + VIEW.h }, { x: fc.x + 70, y: VIEW.y + VIEW.h }];
      const end = i => ({ x: fc.x + (i % 2 ? 7 : -7), y: fc.y + (i < 2 ? -7 : 7) });
      const S = { e: 0, wrap: 0, lock: 0, sq: 0, a: 1 };
      const padlock = (c, x, y) => {
        ellRing(c, x, y - 6, 4, 5, STEEL[0], 4, Math.PI, Math.PI * 2); ellRing(c, x, y - 6, 4, 5, STEEL[1], 2, Math.PI, Math.PI * 2);
        pxRect(c, x - 7, y - 6, 14, 11, STEEL[0]); pxRect(c, x - 6, y - 5, 12, 9, GOLD[1]); pxRect(c, x - 6, y - 5, 12, 2, GOLD[3]);
        pxRect(c, x - 1, y - 2, 2, 4, '#1b1424');
      };
      const stop = layer(c => {
        c.globalAlpha = S.a;
        from.forEach((p, i) => { const q = end(i), e = easeOut(S.e); links(c, p, { x: lerp(p.x, q.x, e), y: lerp(p.y, q.y, e) }, 0, 4 * (1 - S.e)); });
        for (let j = 0; j < 3; j++) {
          const y = fc.y - 10 + j * 10, w = 16 - S.sq * 3, q = k01(S.wrap * 3 - j);
          if (q > 0) links(c, { x: fc.x - w, y: y + 2 }, { x: fc.x - w + 2 * w * q, y: y - 2 }, 0);
        }
        if (S.lock > 0) padlock(c, fc.x, fc.y + 2 - (1 - S.lock) * 16);
        c.globalAlpha = 1;
      });
      Sfx.play('stretch');
      await tween(S, { e: 1 }, 340, linear);
      Sfx.play('hit');
      impact(fc, ['#ffffff', STEEL[1]], 8);
      await tween(S, { wrap: 1 }, 260);
      F.squash = -0.1;
      Sfx.play('coin');
      await tween(S, { lock: 1 }, 120, easeIn);
      Sfx.play('boom');
      m.hit(0);
      shock({ x: fc.x, y: fc.y + 2 }, [GOLD[1], '#ffffff'], 6, 30, 300, 2);
      impact({ x: fc.x, y: fc.y + 2 }, ['#ffffff', GOLD[2], STEEL[1]], 14);
      fxRun(260, (c, k) => glint(c, fc.x + 5, fc.y - 4, 8 * (1 - k) + 2, '#ffffff'));
      shake(5, 260);
      // two hard squeezes
      for (let j = 0; j < 2; j++) {
        await tween(S, { sq: 1 }, 90);
        F.squash = -0.14;
        particles(fc.x, fc.y, 6, { colors: ['#ffffff', '#ffe14a'], speed: 60, grav: 60, size: 1, life: 0.3 });
        await tween(S, { sq: 0 }, 120);
        F.squash = -0.06;
      }
      tween(F, { squash: 0 }, 200);
      await tween(S, { a: 0 }, 260);
      stop();
    },

    // ---------- Impel Down: Hydra Fang ----------

    // Venom Slash: dash in, cut a poisonous crescent, and the venom drips from the wound.
    venomslash: async m => {
      const hero = G.hero, img = wImg('venomfang');
      hold(true);
      await crouch(90, -3);
      await dash(46, 110);
      const fc = fc0(), pv = { x: hero.x + hero.ox + 10, y: 98 };
      Sfx.play('slash');
      crescent(pv.x + 4, pv.y + 2, 20, -2.1, 1.0, [VEN[0], VEN[2], '#ffffff'], 240, 6);
      await step(100, (c, k) => wield(c, img, pv.x, pv.y, lerp(-2.1, 1.0, easeOut(k)), 7, 2));
      m.hit(0);
      slashAt(fc, VEN[2], 0.75, 36);
      impact(fc, ['#ffffff', VEN[3], VEN[1]], 12);
      shake(3, 160);
      fxRun(720, (c, k) => {
        for (let i = 0; i < 5; i++) {
          const x = fc.x - 10 + i * 5, y0 = fc.y - 8 + i * 4, q = k01(k * 1.5 - i * 0.1), fall = 121 - y0, d = easeIn(q) * fall;
          if (q <= 0) continue;
          pxRect(c, x, y0, 2, Math.min(d, 5), VEN[1]);
          if (q < 1 && d > 5) { pxRect(c, x - 1, y0 + d, 3, 3, VEN[0]); pxRect(c, x, y0 + d, 2, 2, VEN[2]); }
          if (q >= 1) ellFill(c, x + 1, 121, 2 + k * 2, 1, VEN[1]);
        }
        for (let i = 0; i < 3; i++) { const q = (k * 2 + i / 3) % 1; pxRing(c, fc.x - 6 + i * 6 + Math.sin(q * 9) * 2, fc.y - q * 20, 1 + q * 1.5, VEN[3], 1); }
      });
      await step(120, c => wield(c, img, pv.x, pv.y, 1.0, 7, 2));
      hold(false);
      await settle(200);
      await wait(250);
    },

    // Hydra: three venom serpents rear up out of the blade and strike the foe together.
    hydra: async m => {
      const hero = G.hero, fc = fc0(), hand = { x: hero.x + 12, y: 100 };
      const S = { rise: 0, strike: 0, open: 0.3, a: 1 };
      const stop = layer(c => {
        c.globalAlpha = S.a;
        for (let n = 0; n < 3; n++) {
          const rear = { x: hand.x - 8 + n * 20, y: 62 - n * 8 + Math.sin(G.t * 6 + n * 2) * 3 }, hit = { x: fc.x - 14, y: fc.y - 14 + n * 13 };
          const r = { x: lerp(hand.x, rear.x, S.rise), y: lerp(hand.y, rear.y, S.rise) }, hd = { x: lerp(r.x, hit.x, S.strike), y: lerp(r.y, hit.y, S.strike) };
          const ctrl = { x: lerp(hand.x + 24, (hand.x + hd.x) / 2, S.strike), y: lerp(hand.y - 26, Math.max(hand.y, hd.y) + 6, S.strike) };
          const P = path(10, t => qb(hand, ctrl, hd, t));
          stroke(c, P, VEN.slice(0, 3), t => 5 - t * 1.5);
          for (let i = 2; i < 10; i += 2) pxRect(c, P[i].x, P[i].y - 1, 1, 1, VEN[3]);
          snakeHead(c, hd.x, hd.y, lerp(1.1 - n * 0.2, 0.15 - (n - 1) * 0.1, S.strike), S.open);
        }
        c.globalAlpha = 1;
      });
      Sfx.play('haki');
      await Promise.all([tween(S, { rise: 1, open: 1 }, 380, easeOut), tween(hero, { squash: 0.15 }, 300)]);
      Sfx.play('slash');
      tween(hero, { squash: -0.1, ox: 4 }, 120);
      await tween(S, { strike: 1, open: 1.2 }, 150, easeIn);
      await tween(S, { open: 0 }, 50);
      m.hit(0);
      Sfx.play('bite');
      impact(fc, ['#ffffff', VEN[3], VEN[1]], 16);
      particles(fc.x, fc.y, 18, { colors: [VEN[1], VEN[2], VEN[3]], speed: 90, grav: 160, size: 2 });
      shake(5, 260);
      await wait(180);
      await Promise.all([tween(S, { rise: 0, strike: 0, a: 0 }, 260, easeIn), settle(260)]);
      stop();
    },

    // Venom Demon: a poison swamp spreads under the foe, the Venom Demon rises out of it, raises
    // both fists and smashes them down.
    venomdemon: async m => {
      const fc = fc0(), F = G.battle.F;
      const D = { y: 170, a: 0, arms: 0, slam: 0, melt: 0 }, dx = fc.x + 30;
      tint('#1a0024', 0.35, 2150);
      Sfx.play('haki');
      const swamp = fxRun(2150, (c, k) => {
        const w = 40 * easeOut(k01(k * 4)) * (1 - k01((k - 0.85) / 0.15));
        ellFill(c, fc.x + 10, 121, w, w * 0.16, VEN[0]);
        ellFill(c, fc.x + 10, 120, w * 0.8, w * 0.1, VEN[1]);
        for (let i = 0; i < 4; i++) { const q = (k * 3 + i / 4) % 1; if (w > 10) pxRing(c, fc.x + 10 + (i - 1.5) * w * 0.4, 119 - q * 6, 1 + q * 2, VEN[3], 1); }
      });
      const stop = layer(c => demon(c, dx, D.y, D.a, D.arms, D.slam, D.melt, fc.x, fc.y));
      await wait(250);
      Sfx.play('boom');
      shake(3, 600);
      await tween(D, { y: 34, a: 0.88 }, 600, easeOut);
      Sfx.play('charge');
      await tween(D, { arms: 1 }, 260, easeOut);
      await tween(D, { slam: 1 }, 140, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#9a4ad0', 0.6);
      shake(9, 600);
      focusLines(fc, VEN[3], 360);
      impact(fc, ['#ffffff', VEN[3], VEN[1]], 22);
      shock({ x: fc.x, y: 120 }, [VEN[2], VEN[3]], 6, 60, 460, 3, 0.25);
      particles(fc.x, fc.y, 36, { colors: [VEN[1], VEN[2], VEN[3], '#5a1a7a'], speed: 140, grav: 160, size: 3 });
      F.squash = 0.35; tween(F, { squash: 0 }, 420);
      await wait(260);
      await tween(D, { melt: 1, a: 0 }, 520, easeIn);
      stop();
      await swamp;
    },

    // ---------- Marineford: Murakumogiri Bisento ----------

    // Bisento Sweep: haul the great bisento back and sweep it through the foe in one wide arc.
    bisentosweep: async m => {
      const hero = G.hero, img = wImg('bisento'), F = G.battle.F;
      hold(true);
      const pv = () => ({ x: hero.x + hero.ox + 6, y: 96 + hero.oy });
      Sfx.play('stretch');
      tween(hero, { ox: -5, squash: 0.2 }, 160);
      await step(160, (c, k) => { const p = pv(); wield(c, img, p.x, p.y, lerp(-1.2, -2.6, easeOut(k)), 14, 2); });
      Sfx.play('slash');
      tween(hero, { ox: 30, squash: -0.12 }, 140, easeIn);
      const fc = fc0();
      crescent(hero.x + 40, 100, 52, -2.7, 0.9, ['#5a5a6a', '#e8e8f0', '#ffffff'], 340, 9, 0.5);
      await step(160, (c, k) => { const p = pv(); wield(c, img, p.x, p.y, lerp(-2.6, 0.7, easeIn(k)), 14, 2); });
      m.hit(0);
      Sfx.play('hit');
      impact(fc, ['#ffffff', '#e8e8f0', '#9aa4b1'], 14);
      dust(fc.x, 14);
      shake(5, 260);
      tween(F, { ox: 10 }, 100).then(() => tween(F, { ox: 0 }, 260));
      fxRun(360, (c, k) => streaks(c, k, 98, 120, 7, '#e8eef8', 1, hero.x + 40, VIEW.x + VIEW.w));
      await step(220, (c, k) => { const p = pv(); wield(c, img, p.x, p.y, 0.7 + easeOut(k) * 0.3, 14, 2); });
      hold(false);
      await settle(200);
    },

    // Tremor Strike: Whitebeard's quake. Punch the air itself; it cracks like glass, and the shock
    // ripples out across the battlefield into the foe.
    tremorstrike: async m => {
      const hero = G.hero, F = G.battle.F, img = wImg('bisento');
      hold(true);
      const pv = () => ({ x: hero.x + hero.ox + 6, y: 96 + hero.oy });
      Sfx.play('charge');
      tween(hero, { ox: -6, squash: 0.22 }, 260);
      await step(300, (c, k) => {
        const p = pv();
        wield(c, img, p.x - 4, p.y, -2.0, 12, 2);
        c.globalAlpha = 0.4; pxCircle(c, p.x + 8, p.y + 4, 2 + k * 5, '#ffffff'); c.globalAlpha = 1;
        pxRing(c, p.x + 8, p.y + 4, 2 + k * 5, '#ffffff', 1);
      });
      tween(hero, { ox: 22, squash: -0.12 }, 110, easeIn);
      await wait(110);
      const P = { x: hero.x + 22 + 20, y: 98 };
      Sfx.play('boom');
      screenFlash('#ffffff', 0.6);
      shake(9, 800);
      const cracks = Array.from({ length: 9 }, (_, i) => ({ a: i * 0.7 + rand(-0.2, 0.2), l: rand(30, 90) }));
      const crack = fxRun(820, (c, k) => {
        const e = easeOut(k01(k * 4)), f = 1 - k01((k - 0.7) / 0.3);
        c.globalAlpha = f;
        for (const cr of cracks) zigzag(c, P.x, P.y, P.x + Math.cos(cr.a) * cr.l * e, P.y + Math.sin(cr.a) * cr.l * e, 5, 3, '#ffffff', 1);
        pxCircle(c, P.x, P.y, 3, '#ffffff');
        c.globalAlpha = 0.25 * f; pxCircle(c, P.x, P.y, 10 + e * 6, '#ffffff');
        c.globalAlpha = f; pxRing(c, P.x, P.y, 10 + e * 6, '#ffffff', 1);
        c.globalAlpha = 1;
      });
      for (let i = 0; i < 3; i++) shock(P, ['#ffffff', '#c9d4e4'], 8, 140 + i * 30, 700 + i * 120, 2);
      shock({ x: P.x, y: 121 }, ['#e8d9b0', '#ffffff'], 6, 120, 700, 2, 0.25);
      await wait(150);
      m.hit(0);
      const fc = fc0();
      impact(fc, ['#ffffff', '#c9d4e4'], 16);
      groundCrack(fc.x - 40, fc.x + 50, '#5a4a3a', 300);
      rocks(fc.x, 118, 12);
      tween(F, { ox: 16, squash: -0.1 }, 120).then(() => tween(F, { ox: 0, squash: 0 }, 320));
      await crack;
      hold(false);
      await settle(200);
    },

    // Captain's Stand: Whitebeard's spirit towers up behind you and cleaves the field with his bisento.
    captainstand: async m => {
      const fc = fc0(), F = G.battle.F, hero = G.hero;
      const S = { a: 0, rise: 14, sw: 0 };
      tint('#0a0010', 0.35, 2300);
      const stop = layer(c => whitebeard(c, S));
      Sfx.play('haki');
      tween(hero, { squash: 0.15 }, 300);
      fxRun(700, () => { if (Math.random() < 0.7) particles(hero.x + rand(-10, 10), 118, 1, { colors: ['#ffffff', '#dfe8f8', '#d63c2f'], speed: 30, grav: -80, dir: -Math.PI / 2, spread: 0.5, life: 0.6 }); });
      await tween(S, { a: 0.8, rise: 0 }, 520, easeOut);
      // he raises the bisento...
      Sfx.play('charge');
      await step(320, (c, k) => {
        S.sw = -0.12 * easeOut(k);
        const H = wbHand(S), a = lerp(-1.75, 0.62, S.sw);
        if (k > 0.4) glint(c, H.x + Math.cos(a) * 100, H.y + Math.sin(a) * 100, 4 + k * 6, '#ffffff');
      });
      // ...and brings it down through everything
      Sfx.play('slash');
      const H = wbHand(S);
      crescent(H.x, H.y, 104, -1.85, 0.62, ['#5a6a8a', '#e8eef8', '#ffffff'], 380, 12);
      await tween(S, { sw: 1 }, 200, easeIn);
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 0.7);
      shake(11, 700);
      focusLines(fc, '#ffffff', 420);
      slashAt(fc, '#e8eef8', 2.05, 70);
      impact(fc, ['#ffffff', '#e8eef8', '#9aa4b1'], 22);
      groundCrack(fc.x, fc.x + 60, '#3a2a2a', 300);
      groundCrack(fc.x, fc.x - 60, '#3a2a2a', 300);
      shock({ x: fc.x, y: 120 }, ['#ffffff', '#c9d4e4'], 6, 70, 520, 3, 0.25);
      rocks(fc.x, 118, 18);
      tween(F, { ox: 18, squash: -0.12 }, 140).then(() => tween(F, { ox: 0, squash: 0 }, 380));
      await wait(320);
      await Promise.all([tween(S, { a: 0, rise: -6 }, 480), settle(400)]);
      stop();
    },

    // ---------- Marineford: Magma Gauntlet ----------

    // Magma Punch: the gauntlet glows white-hot, you dash in, and the punch bursts into magma.
    magmapunch: async m => {
      const hero = G.hero, F = G.battle.F;
      const fist = () => ({ x: hero.x + hero.ox + 12, y: 102 + hero.oy });
      Sfx.play('fire');
      tween(hero, { ox: -6, squash: 0.2 }, 180);
      await step(220, (c, k) => {
        const p = fist(), r = 2 + k * 4 + Math.sin(G.t * 40);
        pxCircle(c, p.x, p.y, r + 1, MAG[2]); pxCircle(c, p.x, p.y, r, MAG[3]); pxCircle(c, p.x, p.y, r * 0.5, MAG[5]);
        if (Math.random() < 0.5) particles(p.x, p.y, 1, { colors: FIRE, speed: 20, grav: -40, life: 0.3 });
      });
      tween(hero, { ox: 54, squash: -0.12 }, 120, easeIn);
      await step(120, () => { const p = fist(); particles(p.x - 4, p.y, 2, { colors: FIRE, speed: 25, grav: -30, life: 0.3, size: 2 }); });
      const fc = fc0(), cx = fc.x - 6;
      m.hit(0);
      Sfx.play('boom');
      blast({ x: cx, y: fc.y }, 16, 520, MAG.slice(1));
      lava(cx, fc.y, 14);
      smoke(cx, fc.y - 6, 6, ['#4a3a3a', '#6a5a5a', '#8a7a7a'], 25);
      impact({ x: cx, y: fc.y }, ['#ffffff', '#ffb03a', '#ff5a2a'], 10);
      shake(5, 260);
      F.squash = -0.15; tween(F, { squash: 0 }, 260);
      fxRun(760, (c, k) => { for (let i = 0; i < 3; i++) ellFill(c, cx - 14 + i * 16, 121, 4 - (i % 2), 1, mixColor('#ffb03a', '#3a0a08', k)); });
      await wait(220);
      await settle(240);
    },

    // Hound Fist: magma pours off the fist into the shape of a hound that flies at the foe and bites.
    houndfist: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0();
      const fist = () => ({ x: hero.x + hero.ox + 12, y: 100 + hero.oy });
      Sfx.play('fire');
      tween(hero, { ox: -6, squash: 0.2 }, 200);
      gather(fist, FIRE, 260, 24, 10);
      await step(260, (c, k) => { const p = fist(); pxCircle(c, p.x, p.y, 2 + k * 5, MAG[2]); pxCircle(c, p.x, p.y, 1 + k * 3, MAG[4]); });
      Sfx.play('fire');
      tween(hero, { ox: 10, squash: -0.12 }, 120, easeIn);
      const from = fist(), to = { x: fc.x - 18, y: fc.y };
      await step(300, (c, k) => {
        const x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * 10;
        for (let j = 4; j >= 1; j--) pxCircle(c, x - 10 - j * 6, y - 2 + Math.sin(G.t * 20 + j) * 2, 7 - j, FIRE[j - 1]);
        hound(c, x, y, 4, 1.2);
        if (Math.random() < 0.6) particles(x - 10, y, 1, { colors: FIRE, speed: 20, grav: -40, life: 0.4, size: 2 });
      });
      await step(70, (c, k) => hound(c, to.x, to.y, 4 * (1 - k), 1.2));
      m.hit(0);
      Sfx.play('bite');
      blast(fc, 18, 560, MAG.slice(1));
      lava(fc.x, fc.y, 18, 120);
      smoke(fc.x, fc.y - 10, 8, ['#4a3a3a', '#6a5a5a'], 25);
      impact(fc, ['#ffffff', '#ffb03a', '#c0301a'], 14);
      shake(6, 320);
      F.squash = 0.2; tween(F, { squash: 0 }, 300);
      await wait(200);
      await settle(240);
    },

    // Meteor Volcano: punch a volley of magma fists into the sky, and they rain back down on the foe.
    meteorvolcano: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0();
      Sfx.play('fire');
      tint('#3a0000', 0.3, 2200);
      await crouch(140, -2);
      tween(hero, { oy: -6, squash: -0.15 }, 120, easeOut);
      Sfx.play('boom');
      const x0 = hero.x + 12;
      await step(420, (c, k) => {
        for (let i = 0; i < 5; i++) {
          const q = k01(k * 1.6 - i * 0.12);
          if (q <= 0 || q >= 1) continue;
          magmaFist(c, x0 + i * 5 - 10, lerp(96, VIEW.y - 20, easeIn(q)), -Math.PI / 2);
        }
      });
      settle(180);
      await step(160, (c, k) => { for (let i = 0; i < 3; i++) if (Math.floor(k * 10 + i) % 2) glint(c, fc.x - 30 + i * 30, VIEW.y + 8, 3, '#ff9a3a'); });
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const tx = fc.x + [-10, 12, -2, 8, 0][i % 5], ty = fc.y + [-4, 4, -10, 8, 0][i % 5], last = i === m.hits - 1;
        Sfx.play('fire');
        await step(160, (c, k) => {
          const e = easeIn(k), x = lerp(tx - 40, tx, e), y = lerp(VIEW.y - 20, ty, e);
          stroke(c, [{ x: x - 20, y: y - 70 * (1 - k * 0.3) }, { x, y }], ['#8a1a1a', '#ff5a2a', '#ffd04a'], 3);
          magmaFist(c, x, y, Math.atan2(ty - VIEW.y + 20, 40));
        });
        m.hit(i);
        Sfx.play('boom');
        blast({ x: tx, y: ty }, last ? 18 : 10, last ? 520 : 380, MAG.slice(1));
        lava(tx, ty, last ? 14 : 6);
        F.squash = 0.15; tween(F, { squash: 0 }, 160);
        if (last) { screenFlash('#ff9a3a', 0.4); focusLines(fc, '#ffd04a', 300); shake(7, 400); } else shake(3, 120);
      }
      smoke(fc.x, fc.y, 10, ['#4a3a3a', '#6a5a5a', '#8a7a7a'], 25);
      await wait(320);
      await settle(160);
    },

    // ---------- Fish-Man Island: Neptune's Trident ----------

    // King's Thrust: draw the golden trident back and drive it home, leaving three punctures and a crown.
    kingsthrust: async m => {
      const hero = G.hero, img = wImg('neptune');
      hold(true);
      const grip = () => ({ x: hero.x + hero.ox + 6, y: 100 + hero.oy });
      Sfx.play('charge');
      tween(hero, { ox: -6, squash: 0.2 }, 160);
      await step(160, (c, k) => { const g = grip(); drawRot(c, img, g.x + 6 - k * 6, g.y, Math.PI / 2, 2); if (k > 0.5) glint(c, g.x + 22 - k * 6, g.y - 4, 4, GOLD[3]); });
      Sfx.play('slash');
      tween(hero, { ox: 30, squash: -0.12 }, 100, easeIn);
      const fc = fc0();
      await step(100, (c, k) => { const g = grip(); drawRot(c, img, g.x + easeIn(k) * 20, g.y, Math.PI / 2, 2); streaks(c, k, g.y - 8, g.y + 8, 5, '#fff3a0', 1, g.x - 30, g.x); });
      const g = grip(), tip = { x: g.x + 36, y: g.y };
      m.hit(0);
      Sfx.play('coin');
      impact(fc, ['#ffffff', GOLD[2], GOLD[1]], 14);
      splash(fc.x, fc.y, 8, false);
      shake(4, 200);
      fxRun(260, (c, k) => { for (let p = -1; p <= 1; p++) stroke(c, [{ x: tip.x - 6, y: tip.y + p * 4 }, { x: fc.x + 18 + k * 10, y: tip.y + p * 4 }], [GOLD[0], GOLD[2], '#ffffff'], Math.max(1, Math.round(3 * (1 - k)))); });
      fxRun(520, (c, k) => {
        const y = fc.y - 24 - k * 6, a = k < 0.7 ? 1 : (1 - k) / 0.3;
        c.globalAlpha = a;
        pxRect(c, fc.x - 7, y - 1, 15, 5, GOLD[0]); pxRect(c, fc.x - 6, y, 13, 3, GOLD[2]);
        for (let i = 0; i < 3; i++) { pxRect(c, fc.x - 7 + i * 6, y - 4, 3, 4, GOLD[0]); pxRect(c, fc.x - 6 + i * 6, y - 3, 1, 3, GOLD[3]); }
        pxRect(c, fc.x, y + 1, 1, 1, '#d63c2f');
        c.globalAlpha = 1;
        for (let i = 0; i < 5; i++) { const b = i * 1.256 + k * 3, r = 10 + k * 12; glint(c, fc.x + Math.cos(b) * r, fc.y + Math.sin(b) * r, 2, '#ffe14a'); }
      });
      await step(220, (c, k) => { const g2 = grip(); drawRot(c, img, g2.x + 20 - easeIn(k) * 16, g2.y, Math.PI / 2, 2); });
      hold(false);
      await settle(200);
    },

    // Sea King Call: raise the trident; the ground under the foe churns, and a sea king bursts up
    // out of it and bites down.
    seakingcall: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), img = wImg('neptune');
      hold(true);
      const stopT = layer(c => drawRot(c, img, hero.x + hero.ox + 10, 86 + hero.oy, 0, 2));
      Sfx.play('charge');
      tween(hero, { squash: 0.15 }, 200);
      shake(2, 380);
      await step(380, (c, k) => {
        glint(c, hero.x + hero.ox + 10, 70 + hero.oy, 3 + k * 4, GOLD[3]);
        for (let i = 0; i < 3; i++) { const q = (k * 2 + i / 3) % 1; ellRing(c, fc.x, 121, 6 + q * 26, (6 + q * 26) * 0.22, i % 2 ? SEA[2] : SEA[3], 1); }
        if (Math.random() < 0.5) particles(fc.x + rand(-16, 16), 120, 1, { colors: [SEA[3], '#ffffff'], speed: 40, grav: 60, dir: -Math.PI / 2, spread: 0.6, life: 0.4, size: 1 });
      });
      // ...and a sea king erupts
      Sfx.play('splash');
      splash(fc.x, 120, 24, true);
      tween(hero, { squash: -0.08 }, 120);
      const S = { y: 172, open: 14 };
      const stop = layer(c => seaKing(c, fc.x + 2, S.y, S.open));
      await tween(S, { y: fc.y + 2 }, 360, easeOut);
      shake(3, 200);
      await wait(90);
      await tween(S, { open: 0 }, 80, easeIn);
      m.hit(0);
      Sfx.play('bite');
      impact(fc, ['#ffffff', SEA[3], SEA[2]], 16);
      splash(fc.x, fc.y, 18, false);
      shake(6, 320);
      F.squash = -0.15; tween(F, { squash: 0 }, 260);
      await wait(220);
      await tween(S, { y: 172, open: 4 }, 320, easeIn);
      splash(fc.x, 120, 16, true);
      stop(); stopT();
      hold(false);
      await settle(200);
    },

    // Ryugu Tide: water spirals into the raised trident, then a great wave rises in front of you and
    // rolls right over the foe before it crashes and drains away.
    ryugutide: async m => {
      const hero = G.hero, F = G.battle.F, fc = fc0(), img = wImg('neptune');
      hold(true);
      const stopT = layer(c => drawRot(c, img, hero.x + hero.ox + 10, 86 + hero.oy, 0, 2));
      Sfx.play('charge');
      tween(hero, { squash: 0.18 }, 300);
      tint('#001030', 0.25, 1900);
      gather({ x: hero.x + 10, y: 70 }, [SEA[3], SEA[2], '#ffffff'], 440, 36, 14);
      await step(440, (c, k) => { pxCircle(c, hero.x + 10, 70, 1 + k * 4, SEA[2]); if (k > 0.5) glint(c, hero.x + 10, 70, 4 + k * 6, '#ffffff'); });
      Sfx.play('splash');
      tween(hero, { squash: -0.1 }, 120);
      const x0 = hero.x + 14, W = { front: x0 + 4, h: 0 };
      const stopW = layer(c => {
        wave(c, x0, W.front, W.h);
        if (W.h > 20 && Math.random() < 0.8) particles(W.front - 8, 121 - W.h * 0.9, 1, { colors: [SEA[3], '#ffffff'], speed: 60, grav: 160, dir: -0.6, spread: 1, life: 0.5, size: 2 });
      });
      await tween(W, { h: 66, front: x0 + 34 }, 280, easeOut);
      Sfx.play('boom');
      shake(4, 500);
      let hit = false;
      await step(440, (c, k) => {
        W.front = lerp(x0 + 34, VIEW.x + VIEW.w + 40, easeIn(k));
        if (!hit && W.front >= F.x - 6) {
          hit = true;
          m.hit(0);
          Sfx.play('splash');
          focusLines(fc, SEA[3], 320);
          impact(fc, ['#ffffff', SEA[3], SEA[2]], 18);
          splash(fc.x, fc.y, 24, false);
          shake(8, 500);
          tween(F, { oy: -16, ox: 14, squash: -0.15 }, 200, easeOut);
        }
      });
      if (!hit) m.hit(0);
      // the wave crashes and drains away; the foe drops back down
      splash(VIEW.x + VIEW.w - 30, 100, 20, true);
      tween(F, { oy: 0, ox: 0, squash: 0.2 }, 260, easeIn).then(() => tween(F, { squash: 0 }, 200));
      await tween(W, { h: 0 }, 360, easeIn);
      stopW(); stopT();
      hold(false);
      await settle(200);
    },

    // ---------- Fish-Man Island: Shark Fang Knuckles ----------

    // Fang Punch: dash in, and a shark's jaws snap shut on the foe with the punch.
    fangpunch: async m => {
      const F = G.battle.F;
      await crouch(100, -4);
      await dash(54, 120);
      const fc = fc0();
      const jaws = (c, open) => {
        for (const d of [-1, 1]) {
          const y = fc.y + d * (6 + open);
          pxRect(c, fc.x - 19, y + d * 2 - 2, 38, 5, '#1a2a3a');
          pxRect(c, fc.x - 18, y + d * 2 - 1, 36, 3, d < 0 ? '#7ab0c8' : '#5a8aa8');
          for (let i = 0; i < 7; i++) {
            const x = fc.x - 16 + i * 5;
            for (let j = 0; j < 4; j++) { pxRect(c, x + j * 0.5 - 1, y - d * j, 5 - j, 1, '#1a2a3a'); pxRect(c, x + j * 0.5, y - d * j, 3 - j * 0.7, 1, '#ffffff'); }
          }
        }
      };
      Sfx.play('bite');
      await step(90, (c, k) => jaws(c, lerp(16, 12, k)));
      await step(50, (c, k) => jaws(c, lerp(12, 0, easeIn(k))));
      m.hit(0);
      impact(fc, ['#ffffff', '#7ab0c8', '#2a4a5a'], 14);
      particles(fc.x, fc.y, 8, { colors: ['#ffffff', '#7ab0c8'], speed: 80, grav: 100, size: 1 });
      shake(4, 200);
      F.squash = 0.15; tween(F, { squash: 0 }, 220);
      await step(220, (c, k) => { c.globalAlpha = 1 - k; jaws(c, k * 4); c.globalAlpha = 1; });
      await settle(220);
    },

    // Water Heart: cup a ball of water, punch it at the foe; it swells into a sphere round them and bursts.
    waterheart: async m => {
      const hero = G.hero, fc = fc0(), F = G.battle.F;
      const hand = () => ({ x: hero.x + hero.ox + 12, y: 100 + hero.oy });
      Sfx.play('splash');
      tween(hero, { ox: -5, squash: 0.18 }, 220);
      gather(hand, [SEA[3], SEA[2], '#ffffff'], 300, 24, 10);
      await step(300, (c, k) => { const h = hand(); waterBall(c, h.x, h.y, 1 + k * 4, k); });
      tween(hero, { ox: 10, squash: -0.12 }, 110, easeIn);
      const from = hand();
      await step(240, (c, k) => {
        const x = lerp(from.x, fc.x, k), y = lerp(from.y, fc.y, k) - Math.sin(k * Math.PI) * 6;
        for (let j = 1; j <= 3; j++) pxRect(c, x - 6 - j * 6, y + Math.sin(G.t * 30 + j) * 2, 4, 1, j % 2 ? SEA[3] : '#ffffff');
        waterBall(c, x, y, 5, k);
        if (Math.random() < 0.5) particles(x, y, 1, { colors: [SEA[2], SEA[3]], speed: 20, grav: 100, life: 0.3, size: 1 });
      });
      Sfx.play('splash');
      const R = Math.max(16, Math.min(24, foeH() * 0.55));
      await step(360, (c, k) => { waterBall(c, fc.x, fc.y, lerp(5, R, easeOut(k)) + Math.sin(k * 30) * (1 - k), k); F.ox = Math.sin(k * 30) * 1.5; });
      F.ox = 0;
      m.hit(0);
      Sfx.play('boom');
      shock(fc, [SEA[3], '#ffffff'], R, R + 20, 300, 2);
      splash(fc.x, fc.y, 30, false);
      impact(fc, ['#ffffff', SEA[3], SEA[2]], 14);
      shake(5, 260);
      await settle(240);
    },

    // Shark Darts: a rapid volley of punches, each flinging a shark of water at the foe.
    sharkdarts: async m => {
      const hero = G.hero, fc = fc0();
      Sfx.play('splash');
      await crouch(120, -3);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const h = { x: hero.x + hero.ox + 12, y: 100 + hero.oy }, ty = fc.y + [-8, 6, -2, 10, 0][i % 5], last = i === m.hits - 1, s = last ? 1.4 : 1;
        Sfx.play('shot');
        tween(hero, { ox: i % 2 ? -1 : 4, squash: i % 2 ? 0.05 : -0.08 }, 50);
        await step(last ? 150 : 120, (c, k) => {
          const x = lerp(h.x + 4, fc.x - 6, k), y = lerp(h.y, ty, k) + Math.sin(k * 14) * 2;
          for (let j = 1; j <= 3; j++) pxRect(c, x - 12 * s - j * 6, y + Math.sin(k * 14 - j) * 2, 4, 1, j % 2 ? SEA[3] : '#ffffff');
          shark(c, x, y, s);
        });
        m.hit(i);
        Sfx.play('hit');
        splash(fc.x - 6, ty, last ? 18 : 7, false);
        shock({ x: fc.x - 6, y: ty }, [SEA[3], '#ffffff'], 2, last ? 20 : 10, 200, 1);
        if (last) { impact({ x: fc.x - 6, y: ty }, ['#ffffff', SEA[3], SEA[2]], 12); shake(4, 220); } else shake(1, 60);
        await wait(40);
      }
      await settle(200);
    },

    // ---------- Punk Hazard: Kikoku Nodachi ----------

    // Room: Shambles: open a Room, swap places with the foe and back, then cut straight through them.
    shambles: async m => {
      const hero = G.hero, F = G.battle.F, img = wImg('kikoku');
      hold(true);
      const R = { r: 0, a: 1 };
      const stopR = layer(c => { if (R.r > 0) roomDome(c, R.r, R.a); });
      const box = (x, y) => fxRun(220, (c, k) => {
        const s = 10 + k * 8;
        c.globalAlpha = 1 - k;
        pxRect(c, x - s, y - s, s * 2, 1, ROOM[2]); pxRect(c, x - s, y + s, s * 2, 1, ROOM[2]);
        pxRect(c, x - s, y - s, 1, s * 2, ROOM[2]); pxRect(c, x + s, y - s, 1, s * 2 + 1, ROOM[2]);
        c.globalAlpha = 1;
      });
      Sfx.play('charge');
      tween(hero, { squash: 0.12 }, 200);
      await tween(R, { r: 76 }, 280, easeOut);
      floatText(100, 40, 'ROOM', ROOM[2]);
      Sfx.play('miss');
      const dx = F.x - hero.x, fy = fc0().y;
      box(hero.x, 104); box(F.x, fy);
      hero.ox = dx; F.ox = -dx;
      await wait(280);
      Sfx.play('miss');
      box(hero.x, 104); box(F.x, fy);
      hero.ox = 0; F.ox = 0; hero.squash = 0;
      await wait(100);
      await crouch(70, -4);
      await dash(50, 90);
      Sfx.play('slash');
      const fc = fc0(), pv = { x: hero.x + hero.ox + 8, y: 96 };
      crescent(pv.x + 2, pv.y + 4, 28, -2.4, 0.7, [ROOM[0], ROOM[1], '#ffffff'], 260, 7);
      await step(100, (c, k) => wield(c, img, pv.x, pv.y, lerp(-2.4, 0.7, easeOut(k)), 14, 2));
      m.hit(0);
      slashAt(fc, ROOM[1], -0.4, 46);
      impact(fc, ['#ffffff', ROOM[2], ROOM[1]], 14);
      shake(4, 200);
      await step(140, c => wield(c, img, pv.x, pv.y, 0.7, 14, 2));
      tween(R, { a: 0, r: 90 }, 300);
      hold(false);
      await settle(220);
      stopR();
    },

    // Counter Shock: plant a palm on the foe and let a jolt of electricity crawl all over them.
    countershock: async m => {
      const F = G.battle.F;
      await crouch(90, -3);
      await dash(54, 120);
      const fc = fc0(), p = { x: fc.x - 8, y: fc.y };
      Sfx.play('charge');
      gather(p, [ROOM[2], '#ffffff', '#ffe14a'], 240, 26, 12);
      await step(240, (c, k) => { pxCircle(c, p.x, p.y, 2 + k * 3, ROOM[1]); pxCircle(c, p.x, p.y, 1 + k * 2, '#ffffff'); });
      Sfx.play('zap');
      screenFlash('#bfe6ff', 0.6);
      m.hit(0);
      shake(5, 400);
      impact(p, ['#ffffff', ROOM[2], ROOM[1]], 14);
      const bolts = Array.from({ length: 6 }, (_, i) => i * 1.05 + rand(-0.3, 0.3));
      await step(560, (c, k) => {
        F.ox = (Math.floor(k * 40) % 2 ? 1.5 : -1.5) * (1 - k);
        if (Math.floor(k * 20) % 3 === 2) return;
        for (const a of bolts) {
          const L = 14 + Math.random() * 16, ex = p.x + Math.cos(a + k) * L, ey = p.y + Math.sin(a + k) * L;
          zigzag(c, p.x, p.y, ex, ey, 4, 3, ROOM[1], 2);
          zigzag(c, p.x, p.y, ex, ey, 4, 3, '#ffffff', 1);
        }
        pxRing(c, p.x, p.y, 6 + ((k * 4) % 1) * 18, '#ffffff', 1);
      });
      F.ox = 0;
      await settle(220);
    },

    // Injection Shot: level the nodachi, then shoot straight through the foe and out the far side,
    // and the Room carries you home from behind.
    injection: async m => {
      const hero = G.hero, img = wImg('kikoku');
      hold(true);
      const R = { r: 0, a: 0.8 };
      const stopR = layer(c => { if (R.r > 0) roomDome(c, R.r, R.a); });
      Sfx.play('charge');
      tween(R, { r: 76 }, 260, easeOut);
      tween(hero, { ox: -10, squash: 0.25 }, 300);
      const tipAt = () => ({ x: hero.x + hero.ox + 32, y: 100 + hero.oy });
      gather(tipAt, [ROOM[2], '#ffffff'], 400, 26, 10);
      await step(400, (c, k) => { const x = hero.x + hero.ox + 14, y = 100 + hero.oy; drawRot(c, img, x, y, Math.PI / 2, 2); glint(c, x - 8 + k * 26, y - 1, 2 + k * 3, ROOM[2]); });
      const fc = fc0(), x0 = hero.x + hero.ox + 14, y = fc.y, oy = fc.y - 100;
      Sfx.play('slash');
      const blade = layer(c => drawRot(c, img, hero.x + hero.ox + 14, 100 + hero.oy, Math.PI / 2, 2));
      fxRun(700, (c, k) => {
        const x1 = Math.max(x0, hero.x + hero.ox + 24);
        c.globalAlpha = 1 - k * 0.8;
        stroke(c, [{ x: x0, y }, { x: x1, y }], [ROOM[0], ROOM[1], '#ffffff'], Math.max(1, Math.round(4 * (1 - k))));
        c.globalAlpha = 1;
      });
      await tween(hero, { ox: fc.x - hero.x - 20, oy, squash: -0.15 }, 70, easeIn);
      m.hit(0);
      Sfx.play('crit');
      screenFlash('#bfe6ff', 0.5);
      focusLines(fc, ROOM[2], 300);
      impact(fc, ['#ffffff', ROOM[2], ROOM[1]], 18);
      shake(6, 320);
      await tween(hero, { ox: VIEW.x + VIEW.w + 24 - hero.x, oy }, 80, linear);
      blade();
      // the hole bursts open out the back a beat later
      fxRun(300, (c, k) => { for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.2, r0 = 8 + k * 24, r1 = r0 + 14 * (1 - k); pxLine(c, fc.x + Math.cos(a) * r0, y + Math.sin(a) * r0, fc.x + Math.cos(a) * r1, y + Math.sin(a) * r1, i % 2 ? ROOM[1] : '#ffffff', k < 0.4 ? 2 : 1); } });
      shock(fc, [ROOM[1], '#ffffff'], 4, 24, 280, 2);
      particles(fc.x + 10, y, 14, { colors: [ROOM[1], ROOM[2], '#ffffff'], speed: 130, grav: 40, dir: 0, spread: 0.8 });
      await wait(200);
      hero.ox = VIEW.x - 24 - hero.x; hero.oy = 0;
      await tween(hero, { ox: 0, squash: 0 }, 260, easeOut);
      hold(false);
      tween(R, { a: 0 }, 260);
      await settle(160);
      stopR();
    },

    // ---------- Punk Hazard: Shinokuni Lamp ----------

    // Gastanet: two hands of gas clap together on the foe and the lamp's spark sets them off.
    gastanet: async m => {
      const hero = G.hero, fc = fc0(), F = G.battle.F;
      const hand = (c, x, y, d) => {
        for (let L = 0; L < 3; L++) {
          const col = GAS[L], e = L === 0 ? 1 : 0, sh = L === 2 ? 0.55 : 1;
          pxCircle(c, x, y + 2, 7 * sh + e, col);
          for (let i = 0; i < 4; i++) pxCircle(c, x + d * (3 - i * 2), y - 8 + Math.abs(i - 1.5) * 1.5, 2.5 * sh + e, col);
          pxCircle(c, x - d * 7, y - 1, 2.5 * sh + e, col);
        }
      };
      Sfx.play('charge');
      tween(hero, { squash: 0.12 }, 160);
      smoke(hero.x + 16, 92, 8, GAS.slice(1), 30);
      await step(320, (c, k) => { const g = lerp(30, 6, easeIn(k)); hand(c, fc.x - g, fc.y, 1); hand(c, fc.x + g, fc.y, -1); });
      Sfx.play('boom');
      screenFlash('#ffd04a', 0.5);
      m.hit(0);
      blast(fc, 20, 500, [GAS[0], GAS[2], '#ff9a3a', '#ffd04a', '#fff3a0']);
      shock(fc, [GAS[2], '#ffd04a'], 6, 36, 360, 3);
      particles(fc.x, fc.y, 24, { colors: [GAS[2], '#ffd04a', '#ff5a2a'], speed: 120 });
      smoke(fc.x, fc.y - 8, 8, GAS.slice(1), 25);
      shake(6, 360);
      F.squash = -0.15; tween(F, { squash: 0 }, 300);
      await wait(260);
      await settle(160);
    },

    // Brown Cloud: the lamp breathes out a billowing cloud of choking gas that rolls over the foe.
    browncloud: async m => {
      const fc = fc0(), hero = G.hero, F = G.battle.F, BR = ['#3a2a1a', '#7a5a3a', '#a8865a'];
      const P = [[0, 0, 7], [-8, 2, 6], [8, 2, 6], [-4, -6, 5], [5, -5, 5], [-13, 5, 4], [13, 5, 4], [0, 6, 5]];
      Sfx.play('fire');
      tween(hero, { squash: 0.12 }, 160);
      const from = { x: hero.x + 16, y: 92 };
      let hit = false;
      await step(1000, (c, k) => {
        const q = easeOut(k01(k / 0.5)), x = lerp(from.x, fc.x, q), y = lerp(from.y, fc.y, q), s = lerp(0.35, 1.25, q) + Math.sin(G.t * 6) * 0.04;
        c.globalAlpha = 0.92 * (k > 0.75 ? (1 - k) / 0.25 : 1);
        billow(c, x, y, P, s, BR);
        if (q >= 1) for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * 2.1; ellRing(c, fc.x + Math.cos(a) * 12, fc.y - 4 + Math.sin(a) * 6, 2, 2, BR[2], 1); }
        c.globalAlpha = 1;
        if (Math.random() < 0.4) particles(x + rand(-12, 12), y + rand(-8, 8), 1, { colors: BR, speed: 15, grav: -15, life: 0.6, size: 2 });
        if (!hit && k >= 0.5) {
          hit = true;
          m.hit(0);
          Sfx.play('hit');
          F.squash = 0.12; tween(F, { squash: 0 }, 260);
          shake(3, 200);
        }
      });
      if (!hit) m.hit(0);
      await settle(160);
    },

    // Shinokuni: the lamp pours out a giant slime of gas with a leering face that creeps over and
    // swallows the foe, then bursts into a choking fog.
    shinokuni: async m => {
      const F = G.battle.F, fc = fc0(), hero = G.hero;
      const S = { x: hero.x + 34, r: 6, open: 0, a: 0.95 };
      Sfx.play('charge');
      tween(hero, { squash: 0.15 }, 260);
      smoke(hero.x + 14, 90, 14, GAS.slice(1), 30);
      gather({ x: hero.x + 16, y: 92 }, GAS.slice(1), 300, 20, 8);
      const stop = layer(c => slime(c, S.x, S.r, S.open, S.a));
      await tween(S, { r: 24 }, 380, easeOut);
      Sfx.play('haki');
      tween(hero, { squash: 0 }, 200);
      await tween(S, { x: fc.x - 14, r: 36, open: 1 }, 600, easeIO);
      Sfx.play('boom');
      await tween(S, { x: fc.x, open: 0 }, 140, easeIn);
      m.hit(0);
      screenFlash('#b06ad0', 0.5);
      focusLines(fc, GAS[3], 320);
      shake(8, 500);
      F.squash = 0.3; tween(F, { squash: 0 }, 400);
      impact(fc, ['#ffffff', GAS[3], GAS[2]], 18);
      await wait(220);
      particles(fc.x, fc.y, 30, { colors: GAS, speed: 100, grav: 30, size: 3 });
      smoke(fc.x, fc.y, 12, GAS.slice(1), 40);
      await tween(S, { r: 50, a: 0 }, 360);
      stop();
      await settle(160);
    },

    // ---------- Dressrosa: Kabuto Slingshot ----------

    // Pop Green: Trampolia: a seed lands at the foe's feet and bursts into a trampoline flower that
    // launches them into the air.
    trampolia: async m => {
      const F = G.battle.F;
      const pad = (c, h) => {
        if (h <= 0) return;
        stroke(c, [{ x: F.x, y: 122 }, { x: F.x + Math.sin(G.t * 8), y: 121 - h }], [LEAF[0], LEAF[1]], 3);
        for (let L = 0; L < 2; L++) {
          for (let i = 0; i < 8; i++) {
            const a = i * 0.785 + 0.2, x = F.x + Math.cos(a) * 12, y = 121 - h + Math.sin(a) * 3;
            ellFill(c, x, y, 5 + (L ? 0 : 1), 2.5 + (L ? 0 : 1), L ? (i % 2 ? '#ff7ab0' : '#ff9ac8') : '#8a2a5a');
          }
        }
        pxCircle(c, F.x, 121 - h, 4, '#8a6a1a'); pxCircle(c, F.x, 121 - h, 3, '#ffe14a');
      };
      const from = await slingshot(140);
      await step(220, (c, k) => seed(c, lerp(from.x, F.x, k), lerp(from.y, 118, k) - Math.sin(k * Math.PI) * 14));
      Sfx.play('stretch');
      particles(F.x, 118, 10, { colors: LEAF.slice(1), speed: 60, grav: 120, dir: -Math.PI / 2, spread: 2 });
      const P = { h: 0 };
      const stop = layer(c => pad(c, P.h));
      await tween(P, { h: 18 }, 90, easeOut);
      m.hit(0);
      Sfx.play('hit');
      impact({ x: F.x, y: 103 }, ['#ffffff', '#ff9ac8', LEAF[2]], 10);
      await tween(F, { oy: -46, squash: -0.2 }, 260, easeOut);
      await tween(F, { oy: -16, squash: 0 }, 200, easeIn);
      tween(P, { h: 12 }, 60).then(() => tween(P, { h: 18 }, 100));
      await tween(F, { oy: -26 }, 140, easeOut);
      tween(P, { h: 0 }, 160);
      await tween(F, { oy: 0, squash: 0.25 }, 180, easeIn);
      Sfx.play('hit');
      dust(F.x, 10);
      shake(3, 160);
      await tween(F, { squash: 0 }, 160);
      stop();
    },

    // Firebird Star: the slingshot looses a bird of flame that beats its wings all the way to the foe.
    firebird: async m => {
      const fc = fc0();
      const bird = (c, x, y, s) => {
        const w = Math.sin(G.t * 30) * 6;
        for (let j = 0; j < 4; j++) pxLine(c, x - 6 * s, y, x - (16 + j * 4) * s, y + (j - 1.5) * 3 * s + Math.sin(G.t * 30 + j) * 2, FIRE[j], Math.max(1, 3 - (j >> 1)));
        for (const d of [-1, 1]) stroke(c, [{ x: x - 2, y }, { x: x - 8 * s, y: y + d * (6 + w * d) * s }, { x: x - 15 * s, y: y + d * (9 + w * d) * s }], ['#a8200f', '#ff9a3a', '#fff3a0'], t => 4 - t * 3);
        ellFill(c, x, y, 6 * s + 1, 3 * s + 1, '#a8200f'); ellFill(c, x, y, 6 * s, 3 * s, '#ff9a3a'); ellFill(c, x + 1, y - 1, 3 * s, 1, '#ffd04a');
        pxCircle(c, x + 6 * s, y - 2, 3 * s, '#ff5a2a'); pxRect(c, x + 9 * s, y - 2, 3, 2, '#ffd04a'); pxRect(c, x + 6 * s, y - 3, 1, 1, '#1b1424');
        pxLine(c, x + 5 * s, y - 4 * s, x + 2 * s, y - 9 * s, '#ffd04a', 2);
      };
      Sfx.play('fire');
      const from = await slingshot(160, '#ff9a3a');
      Sfx.play('fire');
      await step(440, (c, k) => {
        const x = lerp(from.x, fc.x - 4, easeIn(k)), y = lerp(from.y, fc.y, k) - Math.sin(k * Math.PI) * 12;
        bird(c, x, y, lerp(0.7, 1.25, k));
        particles(x - 10, y, 2, { colors: FIRE, speed: 20, grav: -40, life: 0.35, size: 2 });
      });
      m.hit(0);
      Sfx.play('boom');
      blast(fc, 18, 500);
      shock(fc, ['#ff9a3a', '#fff3a0'], 4, 28, 320, 2);
      particles(fc.x, fc.y, 24, { colors: FIRE, speed: 110, grav: -10, size: 2 });
      impact(fc, ['#ffffff', '#ffd04a', '#ff5a2a'], 12);
      shake(4, 240);
      await wait(260);
    },

    // Pop Green: Devil: a seed buried at the foe's feet erupts into a giant flytrap that chomps them.
    devilplant: async m => {
      const F = G.battle.F, fc = fc0(), gx = F.x - 22;
      const S = { h: 0, open: 0, lunge: 0 };
      const devil = c => {
        if (S.h <= 0) return;
        const s = 0.5 + 0.5 * S.h, rest = { x: gx + 6, y: 121 - 66 * S.h }, tgt = { x: F.x - 2, y: fc.y };
        const hp = { x: lerp(rest.x, tgt.x, S.lunge), y: lerp(rest.y, tgt.y, S.lunge) }, a = lerp(1.0, 0.1, S.lunge);
        const hinge = { x: hp.x - Math.cos(a) * 10 * s, y: hp.y - Math.sin(a) * 10 * s }, base = { x: gx, y: 123 };
        stroke(c, path(10, t => qb(base, { x: gx - 14, y: lerp(121, hinge.y, 0.6) }, hinge, t)), [LEAF[0], LEAF[1], LEAF[2]], t => 6 - t * 2);
        for (const d of [-1, 1]) stroke(c, path(4, t => ({ x: gx + d * t * 14, y: 121 - Math.sin(t * Math.PI) * 6 - t * 2 })), [LEAF[0], LEAF[1], LEAF[3]], t => 5 - t * 4);
        trapHead(c, hp.x, hp.y, a, S.open, s);
      };
      const from = await slingshot(140);
      await step(200, (c, k) => seed(c, lerp(from.x, gx, k), lerp(from.y, 119, k) - Math.sin(k * Math.PI) * 12));
      Sfx.play('charge');
      dust(gx, 8);
      shake(2, 300);
      await step(260, (c, k) => {
        zigzag(c, gx - 10 * k, 120, gx + 10 * k, 120, 4, 1, '#5a4a3a', 1);
        for (let i = 0; i < 3; i++) pxLine(c, gx - 4 + i * 4, 120, gx - 6 + i * 6, 120 - k * (4 + i * 2), LEAF[1], 2);
      });
      const stop = layer(devil);
      Sfx.play('boom');
      rocks(gx, 118, 12, ['#5a4a3a', '#3f9a3a', '#8a7a5a']);
      await tween(S, { h: 1, open: 1 }, 340, easeOut);
      shake(3, 160);
      await wait(120);
      Sfx.play('slash');
      await tween(S, { lunge: 1, open: 0 }, 120, easeIn);
      m.hit(0);
      Sfx.play('bite');
      impact(fc, ['#ffffff', '#ff9a8a', LEAF[2]], 16);
      shake(6, 320);
      F.squash = 0.2; tween(F, { squash: 0 }, 300);
      particles(fc.x, fc.y, 12, { colors: [LEAF[1], LEAF[2], '#c0453a'], speed: 90, grav: 120, size: 2 });
      for (let i = 0; i < 2; i++) { await tween(S, { open: 0.25 }, 80); await tween(S, { open: 0 }, 80); shake(2, 80); }
      await tween(S, { lunge: 0, h: 0 }, 320, easeIn);
      dust(gx, 10);
      stop();
    },

    // ---------- Dressrosa: Overheat Rope ----------

    // Overheat: coil the red-hot rope back over your shoulder and lash it across the foe.
    overheat: async m => {
      const hero = G.hero, fc = fc0();
      const hand = () => ({ x: hero.x + hero.ox + 10, y: 98 + hero.oy });
      Sfx.play('fire');
      tween(hero, { ox: -5, squash: 0.15 }, 140);
      await step(160, (c, k) => { const h = hand(); hotString(c, path(10, t => ({ x: h.x - Math.sin(t * Math.PI * 1.5) * 10 * t - t * 8 * k, y: h.y - t * 20 - Math.cos(t * 4) * 4 })), 2, k); });
      Sfx.play('slash');
      tween(hero, { ox: 6, squash: -0.1 }, 100, easeIn);
      await step(170, (c, k) => {
        const h = hand(), e = easeOut(k), tip = { x: lerp(h.x - 8, fc.x + 6, e), y: lerp(h.y - 20, fc.y, e) - Math.sin(e * Math.PI) * 20 };
        hotString(c, path(14, t => ({ x: lerp(h.x, tip.x, t), y: lerp(h.y, tip.y, t) + Math.sin(t * 7 - k * 12) * 8 * (1 - k) * t })), 2, 1);
        if (Math.random() < 0.7) particles(tip.x, tip.y, 1, { colors: [HOT[2], HOT[3]], speed: 20, grav: -40, life: 0.3, size: 1 });
      });
      m.hit(0);
      Sfx.play('fire');
      slashAt(fc, HOT[2], 0.5, 40);
      blast(fc, 11, 360, HOT.slice(0, 4));
      impact(fc, ['#ffffff', HOT[3], HOT[2]], 14);
      particles(fc.x, fc.y, 10, { colors: [HOT[2], HOT[3], HOT[4]], speed: 80, grav: -20, size: 1 });
      shake(4, 200);
      await step(300, (c, k) => {
        const h = hand();
        c.globalAlpha = 1 - k01((k - 0.6) / 0.4);
        hotString(c, path(10, t => ({ x: lerp(h.x, fc.x + 6, t), y: lerp(h.y, fc.y, t) + Math.sin(t * Math.PI) * k * 10 })), 2, 1 - k);
        c.globalAlpha = 1;
      });
      await settle(200);
    },

    // Spiderweb: strings shoot from your fingers and spin a web round the foe that snaps tight.
    spiderweb: async m => {
      const fc = fc0(), hero = G.hero, F = G.battle.F, hand = { x: hero.x + 12, y: 98 }, top = foeTop();
      const W = { e: 0, ring: 0, s: 1, glow: 0, a: 1 };
      const stop = layer(c => {
        c.globalAlpha = W.a;
        const col = W.glow > 0 ? mixColor('#f2f2f2', '#ff6a3a', W.glow) : '#f2f2f2', L = 34 * W.s;
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + 0.2, e = k01(W.e * 1.5 - i * 0.06);
          pxLine(c, fc.x, fc.y, fc.x + Math.cos(a) * L * e, fc.y + Math.sin(a) * L * e, '#6a6a7a', 2);
          pxLine(c, fc.x, fc.y, fc.x + Math.cos(a) * L * e, fc.y + Math.sin(a) * L * e, col, 1);
        }
        for (let j = 0; j < 4; j++) {
          if (W.ring * 4 <= j) continue;
          const r = (8 + j * 7) * W.s;
          for (let i = 0; i < 8; i++) {
            const a = i * 0.785 + 0.2, b = a + 0.785, mid = (a + b) / 2;
            pxLine(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r, fc.x + Math.cos(mid) * r * 0.9, fc.y + Math.sin(mid) * r * 0.9, col, 1);
            pxLine(c, fc.x + Math.cos(mid) * r * 0.9, fc.y + Math.sin(mid) * r * 0.9, fc.x + Math.cos(b) * r, fc.y + Math.sin(b) * r, col, 1);
          }
        }
        c.globalAlpha = 1;
      });
      Sfx.play('stretch');
      tween(hero, { squash: 0.12, ox: 3 }, 160);
      await step(200, (c, k) => { for (let i = 0; i < 5; i++) pxLine(c, hand.x, hand.y, lerp(hand.x, fc.x + (i - 2) * 9, easeOut(k)), lerp(hand.y, fc.y + (i - 2) * 7, easeOut(k)), '#f2f2f2', 1); });
      await tween(W, { e: 1 }, 220, easeOut);
      await tween(W, { ring: 1 }, 260);
      Sfx.play('hit');
      await tween(W, { s: 0.55, glow: 1 }, 120, easeIn);
      m.hit(0);
      impact(fc, ['#ffffff', '#ff6a3a'], 12);
      F.squash = -0.12; tween(F, { squash: 0 }, 300);
      shake(3, 200);
      await step(320, c => stars(c, fc.x, top - 4));
      await tween(W, { a: 0 }, 220);
      stop();
      await settle(160);
    },

    // Parasite Pull: strings drop from the sky onto the foe; you haul them up like a puppet, jerk them
    // about, and slam them into the ground.
    parasite: async m => {
      const F = G.battle.F, fc = fc0(), hero = G.hero, xs = [-12, -5, 3, 11];
      const S = { e: 0, a: 1 };
      const stop = layer(c => {
        c.globalAlpha = S.a;
        const fx = F.x + F.ox, fy = foeC().y - 6;
        xs.forEach((dx, i) => {
          const top = { x: F.x + dx * 4, y: VIEW.y }, e = easeOut(k01(S.e * 1.4 - i * 0.1));
          const x = lerp(top.x, fx + dx, e), y = lerp(top.y, fy + (i % 2) * 6, e);
          pxLine(c, top.x, top.y, x, y, '#c9ccd6', 1);
          pxLine(c, top.x + 1, top.y, x + 1, y, '#ffffff', 1);
          if (e < 1) glint(c, x, y, 3, '#ffffff');
        });
        c.globalAlpha = 1;
      });
      Sfx.play('stretch');
      tween(hero, { squash: 0.12, oy: -2 }, 200);
      await tween(S, { e: 1 }, 320);
      Sfx.play('charge');
      tween(hero, { squash: -0.1, oy: -4 }, 200);
      await tween(F, { oy: -42, squash: -0.15 }, 280, easeOut);
      for (let i = 0; i < 3; i++) await tween(F, { ox: i % 2 ? 6 : -6, oy: -40 - (i % 2) * 4 }, 70);
      Sfx.play('slash');
      tween(hero, { squash: 0.2, oy: 0 }, 140);
      await tween(F, { ox: 0, oy: 0, squash: 0.3 }, 140, easeIn);
      m.hit(0);
      Sfx.play('boom');
      shake(8, 460);
      impact({ x: F.x, y: 114 }, ['#ffffff', '#e8d9b0', '#c9b88a'], 16);
      focusLines(fc, '#ffffff', 300);
      shock({ x: F.x, y: 121 }, ['#e8d9b0', '#ffffff'], 6, 56, 420, 3, 0.25);
      groundCrack(F.x, F.x + 42, '#5a4a3a', 260);
      groundCrack(F.x, F.x - 42, '#5a4a3a', 260);
      rocks(F.x, 118, 14);
      dust(F.x, 18);
      tween(F, { squash: 0 }, 320);
      await tween(S, { a: 0 }, 300);
      stop();
      await settle(160);
    },

    // ---------- Whole Cake Island: Napoleon Sword ----------

    // Homie Slash: Napoleon cheers you on, and you cut a gold crescent through the foe.
    homieslash: async m => {
      const hero = G.hero, img = wImg('napoleon');
      hold(true);
      const pv = () => ({ x: hero.x + hero.ox + 8, y: 98 + hero.oy });
      floatText(pv().x, 74, 'FOR MAMA!', '#ffe14a');
      Sfx.play('charge');
      tween(hero, { ox: -4, squash: 0.18 }, 140);
      await step(180, (c, k) => { const p = pv(); wield(c, img, p.x, p.y, -2.3, 9, 2); if (k > 0.5) glint(c, p.x - 6, p.y - 10, 3, '#ffe14a'); });
      Sfx.play('slash');
      await dash(44, 120);
      const fc = fc0(), p = pv();
      crescent(p.x + 4, p.y + 2, 22, -2.3, 0.9, ['#8a5a0a', '#ffd04a', '#ffffff'], 260, 7);
      await step(110, (c, k) => wield(c, img, p.x, p.y, lerp(-2.3, 0.9, easeOut(k)), 9, 2));
      m.hit(0);
      impact(fc, ['#ffffff', '#ffd04a', '#ff8ab0'], 14);
      shake(3, 160);
      particles(fc.x, fc.y, 12, { colors: ['#ff8ab0', '#ffe14a', '#7cd0ff', '#ffffff'], speed: 70, grav: 40, size: 2 });
      await step(160, c => wield(c, img, p.x, p.y, 0.9, 9, 2));
      hold(false);
      await settle(200);
    },

    // Soul Pocus: "Life or death?" The foe's soul is wrenched out of them and drifts over to you.
    soulpocus: async m => {
      const fc = fc0(), F = G.battle.F, hero = G.hero;
      floatText(fc.x, foeTop() - 8, 'LIFE OR DEATH?', '#e8f0ff');
      Sfx.play('haki');
      tint('#0a0a2a', 0.3, 1500);
      await step(380, (c, k) => {
        for (let i = 0; i < 3; i++) { const r = (1 - ((k * 2 + i / 3) % 1)) * 30 + 6; ellRing(c, fc.x, fc.y, r, r * 0.9, i % 2 ? '#9ab0ff' : '#e8f0ff', 1); }
        F.ox = Math.sin(G.t * 60) * k;
      });
      F.ox = 0;
      Sfx.play('crit');
      F.flash = 0.3;
      await step(260, (c, k) => {
        const y = fc.y - easeOut(k) * 20;
        stroke(c, path(6, t => ({ x: fc.x + Math.sin(t * 6 + G.t * 20) * 2 * t, y: lerp(fc.y, y + 6, t) })), ['#7a8ac8', '#e8f0ff'], 2);
        soul(c, fc.x, y, k, lerp(0.8, 1.2, k));
      });
      m.hit(0);
      shock(fc, ['#e8f0ff', '#9ab0ff'], 4, 26, 260, 2);
      impact(fc, ['#ffffff', '#e8f0ff', '#9ab0ff'], 12);
      shake(3, 160);
      const s0 = { x: fc.x, y: fc.y - 20 }, to = { x: hero.x + 4, y: 92 };
      await step(480, (c, k) => {
        const p = qb(s0, { x: lerp(s0.x, to.x, 0.5), y: fc.y - 54 }, to, easeIn(k));
        if (Math.random() < 0.5) particles(p.x, p.y + 6, 1, { colors: ['#e8f0ff', '#9ab0ff'], speed: 10, grav: -10, life: 0.4, size: 2 });
        soul(c, p.x, p.y, k, 1.2 - k * 0.5);
      });
      Sfx.play('heal');
      hero.flash = 0.2;
      particles(to.x, 100, 14, { colors: ['#e8f0ff', '#bfe6ff', '#ffffff'], speed: 40, grav: -40 });
      shock({ x: hero.x, y: 120 }, ['#9ab0ff', '#ffffff'], 4, 22, 300, 2, 0.3);
      await wait(200);
    },

    // Cake Crusher: a shadow grows under the foe, and a giant three-tier cake drops out of the sky on them.
    cakecrush: async m => {
      const fc = fc0(), F = G.battle.F;
      const S = { y: VIEW.y - 60, sq: 0, a: 1, sh: 0 };
      const stop = layer(c => {
        if (S.sh > 0) { c.globalAlpha = 0.35; ellFill(c, fc.x, 121, 6 + S.sh * 20, 1 + S.sh * 3, '#1b1424'); }
        c.globalAlpha = S.a;
        cake(c, fc.x, S.y, S.sq);
        c.globalAlpha = 1;
      });
      Sfx.play('charge');
      tween(G.hero, { squash: 0.12, oy: -2 }, 200);
      await step(380, (c, k) => { S.sh = easeOut(k) * 0.8; if (Math.floor(k * 12) % 2) glint(c, fc.x, VIEW.y + 6, 3 + k * 4, '#ff9ac8'); });
      tween(G.hero, { squash: 0, oy: 0 }, 160);
      Sfx.play('slash');
      await step(240, (c, k) => {
        S.y = lerp(VIEW.y - 20, 122, easeIn(k)); S.sh = 0.8 + k * 0.3;
        for (let i = 0; i < 5; i++) pxRect(c, fc.x - 20 + i * 10, S.y - 70 - (i % 2) * 12, 1, 20 + k * 10, i % 2 ? '#ffd0e0' : '#ffffff');
      });
      S.sh = 0;
      m.hit(0);
      Sfx.play('boom');
      screenFlash('#ffffff', 0.45);
      shake(8, 460);
      focusLines(fc, '#ffffff', 300);
      F.squash = 0.4;
      tween(S, { sq: 1 }, 70).then(() => tween(S, { sq: 0 }, 260));
      shock({ x: fc.x, y: 120 }, ['#ff9ac8', '#ffffff'], 8, 64, 440, 3, 0.25);
      particles(fc.x, 100, 26, { colors: ['#ffffff', '#fff6f0', '#f2c7d8', '#ff5a7a'], speed: 120, grav: 200, size: 3, dir: -Math.PI / 2, spread: 2.4 });
      particles(fc.x, 104, 18, { colors: ['#ff5a7a', '#7cd0ff', '#ffe14a', '#7cff7a'], speed: 110, grav: 160, size: 1 });
      impact({ x: fc.x, y: 110 }, ['#ffffff', '#ff9ac8'], 14);
      await wait(320);
      await tween(S, { a: 0 }, 300);
      tween(F, { squash: 0 }, 220);
      stop();
    },

    // ---------- Whole Cake Island: Mogura Trident ----------

    // Mogura Drill: the trident spins into a drill and you bore it into the foe in a spray of sparks.
    moguradrill: async m => {
      const hero = G.hero, img = wImg('mogura'), F = G.battle.F;
      hold(true);
      const grip = () => ({ x: hero.x + hero.ox + 6, y: 100 + hero.oy });
      const drill = (c, ext, spin) => {
        const g = grip(), x = g.x + 10 + ext, tip = x + 15;
        drawRot(c, img, x, g.y, Math.PI / 2, 2);
        for (let i = 0; i < 5; i++) {
          const ph = spin + i * 1.2, px = tip - 3 - i * 4, dy = Math.sin(ph) * (5 - i * 0.5);
          pxRect(c, px, g.y + dy - 1, 2, 2, i % 2 ? MOCHI[1] : MOG[3]);
          pxRect(c, px - 1, g.y - dy, 1, 1, MOCHI[2]);
        }
        return { x: tip, y: g.y };
      };
      Sfx.play('charge');
      tween(hero, { ox: -6, squash: 0.2 }, 180);
      await step(200, (c, k) => drill(c, 0, G.t * 40 * k));
      Sfx.play('slash');
      tween(hero, { ox: 28, squash: -0.12 }, 110, easeIn);
      await step(110, (c, k) => { const t = drill(c, 0, G.t * 50); streaks(c, k, t.y - 8, t.y + 8, 5, '#ffffff', 1, t.x - 50, t.x - 10); });
      const fc = fc0();
      m.hit(0);
      Sfx.play('hit');
      impact(fc, ['#ffffff', MOG[3], MOG[2]], 14);
      shake(4, 280);
      await step(280, (c, k) => {
        const t = drill(c, 6 + Math.sin(k * 40) * 2, G.t * 60);
        F.ox = Math.sin(k * 50) * 1.5;
        if (Math.random() < 0.9) particles(t.x, t.y, 2, { colors: ['#ffffff', '#ffe14a', MOG[3]], speed: 120, grav: 200, dir: -2.4, spread: 1.2, size: 1, life: 0.3 });
      });
      F.ox = 0;
      await step(140, (c, k) => drill(c, 6 - k * 6, 0));
      hold(false);
      await settle(200);
    },

    // Buzz Cut Mochi: a spiked ring of mochi spins like a saw blade and grinds into the foe.
    buzzcut: async m => {
      const fc = fc0(), hero = G.hero, F = G.battle.F, h = { x: hero.x + 12, y: 92 };
      Sfx.play('stretch');
      tween(hero, { ox: -4, squash: 0.15 }, 140);
      await step(180, (c, k) => buzz(c, h.x, h.y, G.t * 20, 0.4 + easeOut(k) * 0.6));
      tween(hero, { ox: 4, squash: -0.1 }, 100, easeIn);
      Sfx.play('slash');
      await step(220, (c, k) => {
        const x = lerp(h.x, fc.x, easeOut(k)), y = lerp(h.y, fc.y, k);
        c.globalAlpha = 0.5; ellRing(c, x, y, 15, 15, MOCHI[2], 1); c.globalAlpha = 1;
        for (let j = 1; j <= 3; j++) pxRect(c, x - 16 - j * 7, y - 6 + j * 3, 6, 1, '#ffffff');
        buzz(c, x, y, G.t * 30, 1);
      });
      for (let i = 0; i < m.hits && foeHp(); i++) {
        Sfx.play('slash');
        await step(150, (c, k) => {
          buzz(c, fc.x + Math.sin(k * 30) * 2, fc.y + Math.cos(k * 25), G.t * 40, 1);
          if (Math.random() < 0.8) particles(fc.x + 10, fc.y + 6, 2, { colors: ['#ffffff', '#ffe14a', MOCHI[1]], speed: 110, grav: 220, dir: -0.6, spread: 1, size: 1, life: 0.3 });
        });
        m.hit(i);
        impact({ x: fc.x + rand(-6, 6), y: fc.y + rand(-6, 6) }, ['#ffffff', MOCHI[1], MOG[2]], 6);
        F.ox = i % 2 ? 2 : -2;
        shake(2 + i, 100);
      }
      F.ox = 0;
      await Promise.all([step(220, (c, k) => buzz(c, lerp(fc.x, h.x, easeIn(k)), lerp(fc.y, h.y, k), G.t * 30, 1 - k * 0.6)), settle(220)]);
    },

    // Snake Dance: mochi snakes whip out of the Mogura one after another, each driving its prongs
    // into the foe from a new angle.
    snakedance: async m => {
      const hero = G.hero, fc = fc0();
      hold(true);
      Sfx.play('charge');
      await crouch(140, -4);
      await dash(24, 110);
      const base = () => ({ x: hero.x + hero.ox + 12, y: 100 + hero.oy });
      const snake = (c, k, ty, ph) => {
        const b = base(), e = easeOut(k01(k * 1.7)), tip = { x: lerp(b.x, fc.x - 6, e), y: lerp(b.y, ty, e) };
        const P = path(12, t => ({ x: lerp(b.x, tip.x, t), y: lerp(b.y, tip.y, t) + Math.sin(t * Math.PI * 2 + ph) * 10 * Math.sin(t * Math.PI) * (1 - e * 0.5) }));
        stroke(c, P, MOCHI, t => 6 - t * 2);
        prongs(c, tip.x, tip.y, Math.atan2(P[12].y - P[10].y, P[12].x - P[10].x), 1.2);
      };
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const ty = fc.y + [-12, 10, -4, 14, -14, 2][i % 6], ph = i * 1.7, last = i === m.hits - 1;
        Sfx.play('slash');
        tween(hero, { squash: i % 2 ? 0.08 : -0.08 }, 60);
        await step(120, (c, k) => snake(c, k, ty, ph));
        m.hit(i);
        impact({ x: fc.x - 4, y: ty }, ['#ffffff', MOCHI[1], MOG[2]], last ? 14 : 6);
        if (last) { focusLines(fc, MOCHI[2], 260); shake(5, 260); } else shake(2, 80);
        fxRun(200, (c, k) => { c.globalAlpha = 1 - k; snake(c, 1 - k * 0.6, ty, ph); c.globalAlpha = 1; });
        await wait(50);
      }
      await wait(160);
      hold(false);
      await settle(200);
    },
  });

  SLASH_MOVES.push('ryumadraw', 'shadowlion', 'blacktornado', 'snipsnip', 'shadowcut', 'lightedge', 'flashstep', 'venomslash', 'bisentosweep', 'homieslash', 'injection', 'shambles');
  SHOT_MOVES.push('weaponsleft', 'bubblebarrage', 'bubbleburst', 'sharkdarts', 'firebird', 'trampolia');
}
