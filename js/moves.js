'use strict';
/* Move animations. Every weapon, fruit, fist and race move has its own look, and every
   weapon's plain attack shows that weapon in action. Each effect gets
   m = { hit(i), hits, color } and must call hit() once per hit. */

const lerp = (a, b, k) => a + (b - a) * k;
const fc0 = () => foeC();
const MV_INK = '#1b1424';

// ---------- building blocks ----------

function drawRot(c, img, x, y, a, s) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(a);
  c.drawImage(img, Math.round(-img.width * s / 2), Math.round(-img.height * s / 2), img.width * s, img.height * s);
  c.restore();
}

// Pixel shapes the moves share: a filled ellipse, an elliptical ring and a four-point twinkle.
function mvOval(c, cx, cy, rx, ry, color) {
  cx = Math.round(cx); cy = Math.round(cy); ry = Math.max(0, Math.round(ry));
  c.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
    c.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}
function mvOvalRing(c, cx, cy, rx, ry, color, t) {
  t = t || 1;
  c.fillStyle = color;
  const n = Math.max(16, Math.round((rx + ry) * 3.4));
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    c.fillRect(Math.round(cx + Math.cos(a) * rx - t / 2), Math.round(cy + Math.sin(a) * ry - t / 2), t, t);
  }
}
function mvStar(c, x, y, r, color) {
  if (r < 1) return;
  pxLine(c, x - r, y, x + r, y, color, 1);
  pxLine(c, x, y - r, x, y + r, color, 1);
  if (r >= 4) {
    const d = r * 0.35;
    pxLine(c, x - d, y - d, x + d, y + d, color, 1);
    pxLine(c, x - d, y + d, x + d, y - d, color, 1);
    pxRect(c, x - 1, y - 1, 3, 3, color);
  }
  pxRect(c, x, y, 1, 1, '#ffffff');
}

// A crescent smear on a circle of radius r from angle aT (tail) to aH (head): a hairline at the
// tail and `thick` px deep at the head, solid colour along the outside fading to a dither inside,
// with a white leading edge and a dark rim behind it.
function mvSmear(c, cx, cy, r, aT, aH, thick, color) {
  const span = aH - aT, n = Math.max(3, Math.ceil(Math.abs(span) * r));
  c.fillStyle = color;
  for (let i = 0; i <= n; i++) {
    const t = i / n, w = thick * Math.pow(t, 0.9);
    if (w < 1) continue;
    const a = aT + span * t, ca = Math.cos(a), sa = Math.sin(a), solid = w * 0.5;
    for (let d = 0; d < w; d++) {
      const x = Math.round(cx + ca * (r - d)), y = Math.round(cy + sa * (r - d));
      if (d > solid && (x + y) & 1) continue;
      c.fillRect(x, y, 1, 1);
    }
  }
  const rim = mixColor(color, MV_INK, 0.5), m = Math.max(2, Math.ceil(n / 3));
  let px = null, py = null, qx = null, qy = null;
  for (let i = 0; i <= m; i++) {
    const t = i / m, a = aT + span * t, ca = Math.cos(a), sa = Math.sin(a), w = thick * Math.pow(t, 0.9);
    const x = cx + ca * r, y = cy + sa * r, ox = cx + ca * (r + 1.5), oy = cy + sa * (r + 1.5);
    if (px !== null && w >= 2) {
      if (t > 0.3) pxLine(c, qx, qy, ox, oy, rim, 1);
      pxLine(c, px, py, x, y, '#ffffff', w > 7 ? 2 : 1);
    }
    px = x; py = y; qx = ox; qy = oy;
  }
}

// A sweeping blade arc: a crescent smear that whips round, flares at its leading edge, then
// thins away from its tail.
function arcSweep(cx, cy, r, a0, a1, color, ms, thick) {
  thick = thick || 3;
  const span = a1 - a0;
  return fxRun(ms || 260, (c, k) => {
    const h = easeOut(Math.min(1, k / 0.55));
    const t = k < 0.55 ? Math.max(0, h - 0.75) : lerp(0.25, 1, easeIn((k - 0.55) / 0.45));
    const w = (thick + 2) * (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45 * 0.7);
    if (h - t > 0.01) mvSmear(c, cx, cy, r + 1, a0 + span * t, a0 + span * h, w, color);
    if (k < 0.45) {
      const a = a0 + span * h;
      mvStar(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + 4 * (1 - k / 0.45), '#ffffff');
    }
  });
}

function slashMarks(pos, n, color, len, angle, gap) {
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * gap;
    slashAt({ x: pos.x + nx * o, y: pos.y + ny * o }, color, angle, len);
  }
}

// A shaft that shoots out to `to` and pulls back (spears, jabs, tridents): inked, with a bright
// edge, a pointed tip, speed lines as it extends and a flash at full reach.
function thrust(from, to, color, w, ms, prongs) {
  prongs = prongs || 1;
  const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const dark = mixColor(color, MV_INK, 0.6), lite = mixColor(color, '#ffffff', 0.6);
  return fxRun(ms || 260, (c, k) => {
    const e = k < 0.4 ? easeOut(k / 0.4) : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e), sp = (prongs - 1) * 2 + 4;
    if (k < 0.5) {
      for (let i = 0; i < 4; i++) {
        const o = (i < 2 ? -1 : 1) * (sp + (i % 2) * 4), s1 = L * e - 6 - i * 5, s0 = s1 - 10 - i * 3;
        if (s0 > 0) pxLine(c, from.x + ux * s0 + nx * o, from.y + uy * s0 + ny * o, from.x + ux * s1 + nx * o, from.y + uy * s1 + ny * o, i % 2 ? lite : '#ffffff', 1);
      }
    }
    for (let p = 0; p < prongs; p++) {
      const o = (p - (prongs - 1) / 2) * 4;
      pxLine(c, from.x + nx * o, from.y + ny * o, x + nx * o, y + ny * o, dark, w + 2);
      pxLine(c, x + nx * o - ux * 2, y + ny * o - uy * 2, x + nx * o + ux * 4, y + ny * o + uy * 4, dark, 3);
    }
    for (let p = 0; p < prongs; p++) {
      const o = (p - (prongs - 1) / 2) * 4, ox = nx * o, oy = ny * o;
      pxLine(c, from.x + ox, from.y + oy, x + ox, y + oy, color, w);
      pxLine(c, from.x + ox - nx, from.y + oy - ny, x + ox - nx, y + oy - ny, lite, 1);
      pxLine(c, x + ox - ux, y + oy - uy, x + ox + ux * 3, y + oy + uy * 3, '#ffffff', 1);
    }
    if (k > 0.3 && k < 0.62) mvStar(c, x + ux * 4, y + uy * 4, 7 * (1 - Math.abs(k - 0.45) / 0.17), '#ffffff');
  });
}

// An expanding shockwave ring: thick and doubled at first, thinning out as it spreads.
const ringOut = (pos, color, r0, r1, ms, thick) => {
  const lite = mixColor(color, '#ffffff', 0.55), t0 = thick || 2;
  return fxRun(ms, (c, k) => {
    const r = lerp(r0, r1, easeOut(k)), t = Math.max(1, Math.round(t0 * (1.5 - k)));
    if (k > 0.8 && Math.floor(k * 40) % 2) return;
    pxRing(c, pos.x, pos.y, r, color, t);
    if (k < 0.6 && r - t - 2 > 2) pxRing(c, pos.x, pos.y, r - t - 2, lite, 1);
  });
};

// Tapered light rays bursting out from `pos`.
function rays(pos, color, n, len, ms, rot) {
  return fxRun(ms || 300, (c, k) => {
    for (let i = 0; i < n; i++) {
      const a = (rot || 0) + i * Math.PI * 2 / n, ca = Math.cos(a), sa = Math.sin(a);
      const r0 = len * k * 0.5, r1 = len * easeOut(Math.min(1, k * 1.4)), rm = lerp(r0, r1, 0.45);
      if (r1 - r0 < 1) continue;
      pxLine(c, pos.x + ca * r0, pos.y + sa * r0, pos.x + ca * rm, pos.y + sa * rm, color, k < 0.5 ? 3 : 2);
      pxLine(c, pos.x + ca * rm, pos.y + sa * rm, pos.x + ca * r1, pos.y + sa * r1, color, 1);
      if (k < 0.45) pxLine(c, pos.x + ca * r0, pos.y + sa * r0, pos.x + ca * rm, pos.y + sa * rm, '#ffffff', 1);
    }
  });
}

// A spinning thrown weapon with a fading trail of copies behind it.
function spinThrow(img, from, to, ms, spins, s, arc) {
  const at = k => ({ x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * (arc || 0) });
  return fxRun(ms, (c, k) => {
    for (let j = 3; j >= 1; j--) {
      const kk = k - j * 0.05;
      if (kk < 0) continue;
      const p = at(kk);
      c.globalAlpha = 0.15 * (4 - j);
      drawRot(c, img, p.x, p.y, kk * spins * Math.PI * 2, s || 1);
    }
    c.globalAlpha = 1;
    const p = at(k);
    drawRot(c, img, p.x, p.y, k * spins * Math.PI * 2, s || 1);
  });
}

function zigzag(c, x0, y0, x1, y1, n, amp, color, w) {
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k) + (i < n ? (i % 2 ? amp : -amp) : 0);
    pxLine(c, px, py, x, y, color, w || 1);
    px = x; py = y;
  }
}

// A crackling bolt from (x0, y0) to (x1, y1): new random kinks every frame, a coloured glow
// and a white core.
function mvJag(c, x0, y0, x1, y1, n, amp, color, w) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const P = [[x0, y0]];
  for (let i = 1; i <= n; i++) {
    const k = i / n, o = i < n ? rand(-amp, amp) : 0;
    P.push([x0 + dx * k + nx * o, y0 + dy * k + ny * o]);
  }
  for (let i = 1; i < P.length; i++) pxLine(c, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], color, (w || 1) + 2);
  for (let i = 1; i < P.length; i++) pxLine(c, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], '#ffffff', w || 1);
}

// A flying crescent wave (sword beams): `h` tall, bulging `w` px forward, `th` px thick in the
// middle, with a dark back edge and a white-hot front. face = 1 flies right.
function mvCrescent(c, x, y, h, w, th, color, face) {
  face = face || 1;
  const dark = mixColor(color, MV_INK, 0.55);
  for (let pass = 0; pass < 3; pass++) {
    for (let dy = -h; dy <= h; dy++) {
      const t = dy / h, q = 1 - t * t, out = w * Math.sqrt(q) - w, tk = Math.max(0.6, th * q);
      if (pass === 2 && tk < 1.6) continue;
      const a = pass === 0 ? out - tk - 1 : pass === 1 ? out - tk : out - Math.max(1, tk * 0.4), b = pass === 0 ? out + 1 : out;
      const x0 = face > 0 ? x + a : x - b, x1 = face > 0 ? x + b : x - a;
      pxRect(c, x0, y + dy, Math.max(1, x1 - x0 + 1), 1, pass === 0 ? dark : pass === 1 ? color : '#ffffff');
    }
  }
}

// Faded copies of the hero trailing behind (speed, mirages).
function ghosts(ms, color, n, dx) {
  const spr = getSprite(heroSpec(), 'tint', color);
  return fxRun(ms, (c, k) => {
    for (let i = 0; i < n; i++) {
      drawSpriteAt(c, spr, G.hero.x + G.hero.ox - (i + 1) * dx, 121 + G.hero.oy, 2, { shadow: false, alpha: 0.45 * (1 - k) * (1 - i / n) });
    }
  });
}

// Speed streaks trailing behind the hero while it dashes.
function mvDash(ms, color, dir) {
  dir = dir || 1;
  const L = Array.from({ length: 7 }, (_, i) => ({ y: 92 + i * 4 + rand(-1, 1), len: rand(10, 28), o: rand(2, 10) }));
  return fxRun(ms, (c, k) => {
    const x = G.hero.x + G.hero.ox - dir * 10, f = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
    for (const l of L) {
      const len = l.len * f;
      if (len < 2) continue;
      pxLine(c, x - dir * l.o, l.y + G.hero.oy, x - dir * (l.o + len), l.y + G.hero.oy, l.len > 20 ? '#ffffff' : (color || '#dfe9ff'), 1);
    }
  });
}

// Soft round puffs (smoke, dust, steam, gas) that drift out, swell and fade.
function mvPuffs(x, y, n, o) {
  o = Object.assign({ cols: ['#f2f2f2', '#b9bdc9'], speed: 30, dir: null, spread: Math.PI * 2, r0: 2, r1: 6, ms: 520, rise: 0, alpha: 0.9 }, o);
  const P = Array.from({ length: n }, () => {
    const a = o.dir === null ? Math.random() * Math.PI * 2 : o.dir + (Math.random() - 0.5) * o.spread, s = o.speed * rand(0.5, 1.1);
    return { vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(0.7, 1.2), d: rand(0, 0.25) };
  });
  return fxRun(o.ms, (c, k) => {
    for (const p of P) {
      const kk = (k - p.d) / (1 - p.d);
      if (kk <= 0) continue;
      const t = o.ms / 1000 * easeOut(kk), r = lerp(o.r0, o.r1, easeOut(kk)) * p.r;
      const px = x + p.vx * t, py = y + p.vy * t - o.rise * t;
      c.globalAlpha = o.alpha * (1 - kk * kk);
      pxCircle(c, px, py, r, o.cols[1]);
      if (r >= 2) pxCircle(c, px - r * 0.25, py - r * 0.3, r * 0.7, o.cols[0]);
    }
    c.globalAlpha = 1;
  });
}

// A ball of fire (or any layered colours) that blooms out and burns down to nothing.
function mvBlast(pos, r, ms, cols) {
  cols = cols || ['#a8200f', '#ff5a2a', '#ffb03a', '#fff3a0', '#ffffff'];
  const lobes = Array.from({ length: 6 }, (_, i) => ({ a: i * 1.05 + rand(-0.3, 0.3), d: rand(0.45, 0.7), s: rand(0.4, 0.6) }));
  return fxRun(ms || 380, (c, k) => {
    const g = easeOut(Math.min(1, k * 3.5)), fade = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, R = r * (0.35 + 0.65 * g);
    for (let i = 0; i < cols.length; i++) {
      const f = Math.pow(fade, 1 + i * 0.6), rr = R * (1 - i * 0.17) * f;
      if (rr < 1) continue;
      if (i < 2) for (const l of lobes) pxCircle(c, pos.x + Math.cos(l.a) * R * l.d, pos.y + Math.sin(l.a) * R * l.d * 0.85 - k * 4, rr * l.s, cols[i]);
      pxCircle(c, pos.x, pos.y - i * 0.5 - k * 3, rr, cols[i]);
    }
  });
}

// A flattened shockwave ring along the ground.
function mvShock(pos, color, rx, ms, thick) {
  const lite = mixColor(color, '#ffffff', 0.5);
  return fxRun(ms || 420, (c, k) => {
    const r = 4 + (rx - 4) * easeOut(k);
    if (k > 0.8 && Math.floor(k * 40) % 2) return;
    mvOvalRing(c, pos.x, pos.y, r, r * 0.22, color, k < 0.45 ? (thick || 2) : 1);
    if (k < 0.6) mvOvalRing(c, pos.x, pos.y, r * 0.68, r * 0.15, lite, 1);
  });
}

// Water bursting off `pos`: a crown of droplets, spray and a ring.
function mvSplash(pos, n, cols) {
  cols = cols || ['#2f6fd0', '#4fa3e0', '#bfe6ff', '#ffffff'];
  particles(pos.x, pos.y, n || 18, { colors: cols, speed: 110, grav: 220, dir: -Math.PI / 2, spread: 2.4, size: 2, life: 0.55 });
  particles(pos.x, pos.y, Math.ceil((n || 18) / 2), { colors: [cols[2], cols[3]], speed: 50, grav: 120, life: 0.4, size: 1 });
  return fxRun(320, (c, k) => {
    const e = easeOut(k);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + i * Math.PI / 8, r = 6 + e * 16, h = Math.sin(k * Math.PI) * (6 + (i % 3) * 3);
      const x = pos.x + Math.cos(a) * r, y = pos.y + Math.sin(a) * r * 0.5;
      pxLine(c, x, y, x + Math.cos(a) * 2, y - h, i % 2 ? cols[1] : cols[2], 2);
      pxRect(c, x + Math.cos(a) * 2, y - h - 1, 1, 1, '#ffffff');
    }
  });
}

function dropOn(pos, ms, drawFn) {
  return fxRun(ms, (c, k) => {
    const y = lerp(VIEW.y - 24, pos.y, easeIn(k));
    c.globalAlpha = 0.3 * k;
    mvOval(c, pos.x, 121, 6 + 18 * k, 1 + k * 2, '#000000');
    c.globalAlpha = 0.6;
    if (k > 0.2) for (const o of [-13, -6, 5, 12]) pxLine(c, pos.x + o, y - 22 - Math.abs(o) * 1.5, pos.x + o, y - 18, '#ffffff', 1);
    c.globalAlpha = 1;
    drawFn(c, pos.x, y, k);
  });
}

// A crack that races along the ground, forking as it goes and kicking up chips of earth.
function groundCrack(x0, x1, color, ms) {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 5)), dir = x1 >= x0 ? 1 : -1;
  const pts = Array.from({ length: n + 1 }, (_, i) => ({ x: lerp(x0, x1, i / n), y: 119 + (i && i < n ? Math.round(rand(-2, 2)) : 0) }));
  const forks = [];
  for (let i = 2; i < n; i += 2) forks.push({ i, a: rand(0.4, 1.1) * (Math.random() < 0.5 ? -1 : 1), L: rand(3, 7) });
  const lip = mixColor(color, '#e8d9b0', 0.55);
  let shown = 0;
  return fxRun(ms, (c, k) => {
    const f = easeOut(k) * n;
    for (let i = 1; i <= n; i++) {
      if (i - 1 > f) break;
      const a = pts[i - 1], b = pts[i], u = Math.min(1, f - (i - 1)), bx = lerp(a.x, b.x, u), by = lerp(a.y, b.y, u);
      pxLine(c, a.x, a.y + 1, bx, by + 1, lip, 1);
      pxLine(c, a.x, a.y, bx, by, color, 2);
    }
    for (const q of forks) if (q.i <= f) { const p = pts[q.i]; pxLine(c, p.x, p.y, p.x + dir * Math.cos(q.a) * q.L, p.y + Math.sin(q.a) * q.L * 0.5, color, 1); }
    while (shown < Math.floor(f)) {
      shown++;
      if (shown % 2) particles(pts[shown].x, pts[shown].y - 1, 1, { colors: ['#8a7a5a', '#c9b88a', '#5a4a3a'], speed: 60, grav: 200, dir: -Math.PI / 2, spread: 0.9, size: 2, life: 0.45 });
    }
  });
}

const dust = (x, n) => {
  particles(x, 118, n || 12, { colors: ['#c9b88a', '#e8d9b0', '#9a8a6a'], speed: 60, grav: 90, dir: -Math.PI / 2, spread: 2 });
  for (const d of [-1, 1]) mvPuffs(x + d * 4, 118, 2 + Math.round((n || 12) / 8), { cols: ['#efe4c4', '#c9b88a'], speed: 40, dir: d > 0 ? -0.15 : Math.PI + 0.15, spread: 0.5, r0: 2, r1: 5, ms: 480, rise: 6, alpha: 0.8 });
};
const hold = on => { G.hero.swing = on; };
const back = ms => tween(G.hero, { ox: 0, oy: 0, squash: 0 }, ms || 200);

function moveBanner(name, color) {
  const text = name.toUpperCase(), w = textWidth(text, 1) + 12, col = color || '#d63c2f';
  fxRun(1100, (c, k) => {
    const x = k < 0.12 ? lerp(-w, 4, k / 0.12) : k > 0.86 ? lerp(4, -w - 4, (k - 0.86) / 0.14) : 4;
    pxRect(c, x - 1, 21, w + 2, 11, PAL.k);
    pxRect(c, x, 22, w, 9, col);
    pxRect(c, x, 22, w, 1, mixColor(col, '#ffffff', 0.45));
    drawText(c, text, x + 6, 24, { color: '#ffffff' });
  });
}

// ---------- weapons in hand ----------

// How a weapon's sprite sits around its grip: F/R = sprite centre ahead of / beside the grip,
// tip = how far the tip reaches past the grip (all in sprite pixels).
function mvWeapon(key) {
  const w = WEAPONS[key], img = getSprite(weaponSpec(key)), sh = w && w.shape && WEAPON_SHAPES[w.shape];
  const gx = sh ? sh.grip[0] : img.width / 2 - 1, gy = sh ? sh.grip[1] : img.height / 2 - 1;
  return { img, F: gy + 1 - img.height / 2, R: img.width / 2 - (gx + 1), tip: gy + 1 };
}
// Draws a weapon with its grip at (x, y) and its tip pointing along angle th.
function mvDrawGrip(c, W, x, y, th, s) {
  const fx = Math.cos(th), fy = Math.sin(th);
  drawRot(c, W.img, x + (fx * W.F - fy * W.R) * s, y + (fy * W.F + fx * W.R) * s, th + Math.PI / 2, s);
}
// The hero's weapon, held at arm's length from the shoulder and pointing along S.th, for a move
// to swing about by tweening S (th, arm, dx). Fast swings leave a crescent smear. S.stop() ends it.
function mvHeld(key, col) {
  const W = mvWeapon(key), L = W.tip * 2;
  const S = { th: -Math.PI / 2, arm: 0, dx: 5, dy: 6, show: true, smear: true, col: col || '#ffffff', tr: null, lt: G.t, W };
  S.pivot = () => ({ x: G.hero.x + G.hero.ox + 4 + S.dx, y: 104 + G.hero.oy + S.dy });
  S.tip = () => { const p = S.pivot(); return { x: p.x + Math.cos(S.th) * (S.arm + L), y: p.y + Math.sin(S.th) * (S.arm + L) }; };
  const layer = {
    t: 0, dur: 1e9, res: () => {},
    draw: c => {
      if (!S.show) return;
      const p = S.pivot(), dt = FX.stopT > 0 ? 0 : Math.max(0, Math.min(0.1, G.t - S.lt));
      S.lt = G.t;
      if (S.tr === null) S.tr = S.th;
      S.tr += (S.th - S.tr) * (1 - Math.exp(-dt * 9));
      if (S.smear && Math.abs(S.th - S.tr) > 0.12) mvSmear(c, p.x, p.y, S.arm + L + 2, S.tr, S.th, Math.min(13, L * 0.55), S.col);
      mvDrawGrip(c, W, p.x + Math.cos(S.th) * S.arm, p.y + Math.sin(S.th) * S.arm, S.th, 2);
    },
  };
  FX.list.push(layer);
  S.stop = () => { layer.dur = 0; S.show = false; };
  return S;
}

// ---------- plain attacks: you can see the weapon you are using ----------

const SWING_STYLE = {
  sword: 'slash', curved: 'slash', saw: 'slash', cleaver: 'slash', axe: 'chop', hook: 'slash', claws: 'claw',
  staff: 'thrust', gstaff: 'thrust', trident: 'thrust', spear: 'thrust', jitte: 'thrust',
  club: 'smash', kanabo: 'smash', hammer: 'smash', scepter: 'smash',
  gun: 'gun', cannon: 'cannon', knives: 'throw', ring: 'throw', shell: 'shell',
  rope: 'throw', cannonarm: 'cannon', gloves: 'punch', scissors: 'slash', bubbler: 'shell', chain: 'smash', dagger: 'slash', bisento: 'slash',
  gauntlet: 'punch', knuckles: 'punch', nodachi: 'slash', lamp: 'shell', slingshot: 'gun', whip: 'slash', bicorne: 'slash', mogura: 'thrust',
};

// A single thrown knife, used by the knife moves.
const mvKnife = () => getSprite({ kind: 'weapon', shape: 'dagger', pal: { v: '#e8e8f0', G: '#d63c2f', n: '#3a2433' } });

const MV_BASIC = {
  // Flintlock and slingshot: aim, a muzzle flash (or a snap of the band), a tracer, a kick back.
  gun: async (key, w, col, m) => {
    const H = G.hero, fc = fc0();
    if (w.shape === 'slingshot') {
      Sfx.play('stretch');
      const band = (c, bx, by) => {
        const h = heroHand();
        pxLine(c, h.x - 4, h.y - 1, bx, by, '#c9a26a', 1);
        pxLine(c, h.x + 4, h.y - 1, bx, by, '#c9a26a', 1);
      };
      tween(H, { ox: -3, squash: 0.08 }, 180);
      await fxRun(180, (c, k) => {
        const h = heroHand(), bx = h.x - 2 - easeOut(k) * 8, by = h.y + 1;
        band(c, bx, by);
        pxCircle(c, bx, by, 2, MV_INK); pxCircle(c, bx, by, 1, col);
      });
      Sfx.play('shot');
      const h = heroHand(), from = { x: h.x + 2, y: h.y - 2 };
      fxRun(90, (c, k) => band(c, h.x + 6 - k * 6, h.y - 1));
      const kick = tween(H, { ox: 2, squash: -0.05 }, 60).then(() => tween(H, { ox: 0, squash: 0 }, 180));
      await projectile(from, fc, 190, (c, x, y, k) => {
        for (let j = 1; j <= 3; j++) { const kk = Math.max(0, k - j * 0.07); pxRect(c, lerp(from.x, fc.x, kk), lerp(from.y, fc.y, kk) - Math.sin(kk * Math.PI) * 5, 1, 1, j < 2 ? '#ffffff' : col); }
        pxCircle(c, x, y, 3, MV_INK); pxCircle(c, x, y, 2, col); pxRect(c, x - 1, y - 1, 1, 1, '#ffffff');
      });
      m.hit(0);
      impact(fc, ['#ffffff', col], 10);
      particles(fc.x, fc.y, 8, { colors: [col, mixColor(col, MV_INK, 0.4)], speed: 70, grav: 160, size: 2 });
      ringOut(fc, col, 3, 13, 220, 2);
      await kick;
      return;
    }
    await tween(H, { ox: 2, squash: 0.05 }, 90);
    Sfx.play('shot');
    const h = heroHand(), mz = { x: h.x + 11, y: h.y + 1 };
    fxRun(120, (c, k) => {
      const r = 8 * (1 - k);
      mvStar(c, mz.x + 4, mz.y, r + 2, '#ffe14a');
      pxCircle(c, mz.x + 3, mz.y, r * 0.5, '#ffffff');
    });
    mvPuffs(mz.x + 3, mz.y, 4, { cols: ['#ffffff', '#b9bdc9'], speed: 22, dir: -0.2, spread: 1.2, r0: 1, r1: 4, ms: 480, rise: 14 });
    const kick = tween(H, { ox: -6, squash: -0.06 }, 55).then(() => tween(H, { ox: 0, squash: 0 }, 220));
    await projectile(mz, fc, 110, (c, x, y, k) => {
      const k0 = Math.max(0, k - 0.4), sx = lerp(mz.x, fc.x, k0), sy = lerp(mz.y, fc.y, k0) - Math.sin(k0 * Math.PI) * 5;
      pxLine(c, sx, sy, x, y, '#ffe14a', 1);
      pxLine(c, lerp(sx, x, 0.6), lerp(sy, y, 0.6), x, y, '#ffffff', 1);
      pxRect(c, x - 1, y - 1, 3, 3, '#fff6a0'); pxRect(c, x, y, 2, 1, '#ffffff');
    });
    m.hit(0);
    impact(fc, ['#ffffff', '#ffe14a'], 10);
    particles(fc.x, fc.y, 5, { colors: ['#9aa4b1', '#ffffff'], speed: 60, grav: 120, size: 1, dir: Math.PI, spread: 1.5 });
    await kick;
  },

  // Cannons: brace, a roaring muzzle blast that shoves you back, a smoking ball, an explosion.
  cannon: async (key, w, col, m) => {
    const H = G.hero, fc = fc0(), arm = w.shape === 'cannonarm';
    const muzzle = () => { const h = heroHand(); return { x: h.x + (arm ? 13 : 15), y: h.y + (arm ? 5 : 2) }; };
    if (arm) Sfx.play('charge');
    tween(H, { ox: -3, squash: 0.12 }, 170);
    await fxRun(170, (c, k) => {
      const p = muzzle();
      if (arm) { pxCircle(c, p.x, p.y, 1 + k * 4, col); pxCircle(c, p.x, p.y, k * 2, '#ffffff'); }
      else { const h = heroHand(); mvStar(c, h.x - 2, h.y - 3, 2 + Math.random() * 3, Math.random() < 0.5 ? '#ffe14a' : '#ff9a3a'); }
    });
    Sfx.play('boom');
    const mz = muzzle();
    shake(2, 140);
    fxRun(140, (c, k) => {
      const r = 10 * (1 - k);
      mvStar(c, mz.x + 5, mz.y, r + 3, arm ? col : '#ffd04a');
      pxCircle(c, mz.x + 3, mz.y, r * 0.6, '#ffffff');
    });
    mvPuffs(mz.x + 2, mz.y, 6, { cols: ['#ffffff', '#b9bdc9'], speed: 34, dir: -0.3, spread: 1.6, r0: 2, r1: 6, ms: 600, rise: 12 });
    if (!arm) mvBlast({ x: mz.x + 6, y: mz.y }, 7, 220);
    const kick = tween(H, { ox: -12, squash: -0.1 }, 70).then(() => tween(H, { ox: 0, squash: 0 }, 260));
    await projectile(mz, fc, 230, (c, x, y) => {
      if (arm) {
        pxCircle(c, x - 4, y, 3, mixColor(col, '#ffffff', 0.4)); pxCircle(c, x, y, 5, col); pxCircle(c, x + 1, y, 3, '#ffffff');
        if (Math.random() < 0.6) particles(x - 4, y, 1, { colors: [col, '#ffffff'], speed: 20, grav: 0, life: 0.25, size: 1 });
      } else {
        pxCircle(c, x, y, 5, MV_INK); pxCircle(c, x, y, 4, '#3a3440'); pxRect(c, x - 2, y - 2, 2, 1, '#9aa4b1');
        if (Math.random() < 0.7) particles(x - 5, y, 1, { colors: SMOKE, speed: 8, grav: -20, life: 0.4, size: 2 });
      }
    });
    m.hit(0);
    mvBlast(fc, arm ? 12 : 14, 380, arm ? [mixColor(col, MV_INK, 0.4), col, mixColor(col, '#ffffff', 0.5), '#ffffff'] : null);
    impact(fc, arm ? [col, '#ffffff'] : FIRE, 14);
    mvPuffs(fc.x, fc.y - 4, 5, { cols: ['#dfe2ea', '#9aa4b1'], speed: 26, r0: 3, r1: 7, ms: 620, rise: 16, alpha: 0.75 });
    shake(4, 240);
    await kick;
  },

  // Shock Shell: a pulse of sound rings. Bubble Blaster: a stream of bubbles. The lamp: a cloud of gas.
  shell: async (key, w, col, m) => {
    const H = G.hero, fc = fc0();
    if (w.shape === 'bubbler') {
      Sfx.play('splash');
      await tween(H, { ox: 3, squash: 0.06 }, 100);
      const h = heroHand(), from = { x: h.x + 2, y: h.y - 4 };
      const B = Array.from({ length: 6 }, (_, i) => ({ d: i * 0.07, r: [5, 3, 4, 2, 3, 2][i], wob: rand(0, 6), dy: rand(-8, 8) }));
      let hit = false;
      const kick = tween(H, { ox: 0, squash: 0 }, 200);
      await fxRun(420, (c, k) => {
        for (const b of B) {
          const kk = (k - b.d) / 0.6;
          if (kk < 0) continue;
          const at = { x: lerp(from.x, fc.x + b.dy * 0.4, Math.min(1, kk)), y: lerp(from.y, fc.y + b.dy, Math.min(1, kk)) + Math.sin(kk * 9 + b.wob) * 3 };
          if (kk < 1) {
            pxCircle(c, at.x, at.y, b.r, mixColor(col, '#ffffff', 0.55));
            pxRing(c, at.x, at.y, b.r, col, 1);
            pxRect(c, at.x - b.r * 0.5, at.y - b.r * 0.5, b.r > 3 ? 2 : 1, 1, '#ffffff');
          } else if (kk < 1.25) {
            const e = (kk - 1) / 0.25;
            for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, r = b.r + e * 5; pxRect(c, at.x + Math.cos(a) * r, at.y + Math.sin(a) * r, 1, 1, i % 2 ? col : '#ffffff'); }
            if (!hit) { hit = true; m.hit(0); impact(fc, ['#ffffff', col], 8); }
          }
        }
      });
      if (!hit) m.hit(0);
      particles(fc.x, fc.y, 10, { colors: [col, '#ffffff'], speed: 60, grav: 140, size: 1 });
      await kick;
      return;
    }
    if (w.shape === 'lamp') {
      Sfx.play('fire');
      await tween(H, { ox: 4, squash: 0.06 }, 110);
      const h = heroHand(), from = { x: h.x + 1, y: h.y - 4 };
      const dark = mixColor(col, MV_INK, 0.45), lite = mixColor(col, '#ffffff', 0.45);
      const P = Array.from({ length: 9 }, (_, i) => ({ d: i * 0.045, r: rand(3, 6), dy: rand(-9, 9), wob: rand(0, 6) }));
      let hit = false;
      const kick = tween(H, { ox: 0, squash: 0 }, 220);
      await fxRun(480, (c, k) => {
        for (const p of P) {
          const kk = Math.min(1, (k - p.d) / 0.6);
          if (kk <= 0) continue;
          const x = lerp(from.x, fc.x + p.dy * 0.5, easeOut(kk)), y = lerp(from.y, fc.y + p.dy, easeOut(kk)) + Math.sin(kk * 6 + p.wob) * 3, r = p.r * (0.5 + kk * 0.7);
          c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 0.9;
          pxCircle(c, x, y, r + 1, dark); pxCircle(c, x - 1, y - 1, r, col); pxCircle(c, x - r * 0.35, y - r * 0.4, r * 0.4, lite);
        }
        c.globalAlpha = 1;
        if (!hit && k > 0.55) { hit = true; m.hit(0); impact(fc, [lite, col], 8); }
      });
      if (!hit) m.hit(0);
      mvPuffs(fc.x, fc.y, 5, { cols: [lite, col], speed: 26, r0: 3, r1: 7, ms: 520, rise: 10, alpha: 0.7 });
      await kick;
      return;
    }
    // Shock Shell: charge the dial, then let the stored blow out as rings of sound
    const at = () => { const h = heroHand(); return { x: h.x + 2, y: h.y + 4 }; };
    tween(H, { ox: 6, squash: 0.08 }, 160);
    await fxRun(160, (c, k) => { const p = at(); pxRing(c, p.x, p.y, 10 * (1 - k) + 3, col, 1); pxCircle(c, p.x, p.y, 1 + k * 2, '#ffffff'); });
    Sfx.play('boom');
    const from = at();
    const kick = tween(H, { ox: -4, squash: -0.06 }, 70).then(() => tween(H, { ox: 0, squash: 0 }, 220));
    let hit = false;
    await fxRun(300, (c, k) => {
      for (let i = 0; i < 4; i++) {
        const kk = k * 1.5 - i * 0.16;
        if (kk <= 0 || kk >= 1) continue;
        const x = lerp(from.x + 4, fc.x - 6, kk), y = lerp(from.y, fc.y, kk), r = 6 + kk * 12;
        mvSmear(c, x - r, y, r, -1.1, 0, 3, i % 2 ? col : '#ffffff');
        mvSmear(c, x - r, y, r, 1.1, 0, 3, i % 2 ? col : '#ffffff');
      }
      if (!hit && k * 1.5 >= 1) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    impact(fc, ['#ffffff', col], 12);
    ringOut(fc, col, 4, 20, 260, 2);
    shake(2, 160);
    await kick;
  },

  // Knives fan out and stick, the chakram curves out and comes back, the rope lassoes the foe.
  throw: async (key, w, col, m) => {
    const H = G.hero, fc = fc0();
    if (w.shape === 'rope') {
      Sfx.play('stretch');
      await tween(H, { ox: -3, squash: 0.08 }, 100);
      const kick = tween(H, { ox: 4, squash: -0.04 }, 90);
      let hit = false;
      await fxRun(420, (c, k) => {
        const h = heroHand(), reach = easeOut(Math.min(1, k / 0.45)), loop = k < 0.45 ? 9 : 9 - easeIn((k - 0.45) / 0.55) * 4;
        const ex = lerp(h.x, fc.x - 4, reach), ey = lerp(h.y - 10, fc.y, reach) - Math.sin(reach * Math.PI) * 14;
        let px = h.x, py = h.y;
        for (let i = 1; i <= 12; i++) {
          const t = i / 12, x = lerp(h.x, ex, t), y = lerp(h.y, ey, t) - Math.sin(t * Math.PI) * (1 - reach) * 10;
          pxLine(c, px, py, x, y, '#7a5a32', 2); pxLine(c, px, py - 1, x, y - 1, col, 1);
          px = x; py = y;
        }
        mvOvalRing(c, ex + 4, ey, loop * 0.8, loop, '#7a5a32', 2);
        mvOvalRing(c, ex + 4, ey - 1, loop * 0.8, loop, col, 1);
        if (!hit && k >= 0.62) { hit = true; m.hit(0); impact(fc, ['#ffffff', col], 10); Sfx.play('slash'); }
      });
      if (!hit) m.hit(0);
      await kick;
      await back(180);
      return;
    }
    if (w.shape === 'ring') {
      const img = getSprite(weaponSpec(key));
      Sfx.play('slash');
      await tween(H, { ox: -3, squash: 0.1 }, 100);
      hold(true);
      tween(H, { ox: 4, squash: -0.06 }, 90);
      const h = heroHand(), path = (k, up) => ({ x: lerp(h.x, fc.x, Math.sin(k * Math.PI / 2)), y: lerp(h.y - 4, fc.y, k) - Math.sin(k * Math.PI) * (up ? 22 : -10) });
      const fly = (ms, up, rev) => fxRun(ms, (c, k) => {
        for (let j = 3; j >= 0; j--) {
          const kk = Math.max(0, k - j * 0.06), p = path(rev ? 1 - kk : kk, up);
          c.globalAlpha = j ? 0.18 * (4 - j) : 1;
          drawRot(c, img, p.x, p.y, kk * 14, 2);
        }
        c.globalAlpha = 1;
      });
      await fly(220, true, false);
      m.hit(0);
      impact(fc, ['#ffffff', col], 10);
      ringOut(fc, col, 4, 16, 220, 1);
      await fly(240, false, true);
      hold(false);
      await back(140);
      return;
    }
    // knives
    const knife = mvKnife();
    Sfx.play('slash');
    await tween(H, { ox: -3, squash: 0.1 }, 90);
    tween(H, { ox: 5, squash: -0.06 }, 80);
    const h = heroHand(), T = [{ x: fc.x - 6, y: fc.y - 9 }, { x: fc.x - 8, y: fc.y }, { x: fc.x - 5, y: fc.y + 9 }];
    const fly = T.map((t, i) => {
      const from = { x: h.x, y: h.y - 4 + i * 3 }, a = Math.atan2(t.y - from.y, t.x - from.x);
      return wait(i * 45).then(() => fxRun(150, (c, k) => {
        const x = lerp(from.x, t.x, k), y = lerp(from.y, t.y, k);
        pxLine(c, x - Math.cos(a) * 14, y - Math.sin(a) * 14, x - Math.cos(a) * 4, y - Math.sin(a) * 4, '#ffffff', 1);
        drawRot(c, knife, x, y, a + Math.PI / 2, 2);
      }));
    });
    await fly[0];
    m.hit(0);
    impact(fc, ['#ffffff', col], 8);
    await Promise.all(fly);
    fxRun(220, (c, k) => { if (k > 0.7 && Math.floor(k * 30) % 2) return; for (const t of T) drawRot(c, knife, t.x + 2, t.y, Math.PI / 2 + 0.25, 2); });
    particles(fc.x - 4, fc.y, 6, { colors: ['#ffffff', col], speed: 50, grav: 60, size: 1 });
    await back(200);
  },

  // Blades, clubs, staffs and claws: wind up, dash in, swing through the foe, follow through.
  melee: async (key, w, col, style, m) => {
    const H = G.hero, fc = fc0(), sh = w.shape;
    if (style === 'claw') {
      await tween(H, { ox: -5, squash: 0.14 }, 110);
      const d = mvDash(220);
      await tween(H, { ox: 48, squash: -0.08 }, 110, easeIn);
      Sfx.play('slash');
      tween(H, { ox: 52, oy: 2, squash: 0.08 }, 90);
      mvRake(fc, col, 260, 1);
      await wait(90);
      m.hit(0);
      impact(fc, ['#ffffff', col], 10);
      await d;
      await back(200);
      return;
    }
    if (sh === 'whip') {
      Sfx.play('stretch');
      await tween(H, { ox: 10, squash: 0.12 }, 120);
      const kick = tween(H, { ox: 16, squash: -0.06 }, 90);
      const dark = mixColor(col, MV_INK, 0.5);
      let hit = false;
      await fxRun(360, (c, k) => {
        const h = heroHand(), reach = easeOut(Math.min(1, k / 0.5)), crack = { x: lerp(h.x, fc.x + 6, reach), y: lerp(h.y - 26, fc.y, reach) };
        let px = h.x, py = h.y;
        for (let i = 1; i <= 14; i++) {
          const t = i / 14, x = lerp(h.x, crack.x, t), y = lerp(h.y, crack.y, t) - Math.sin(t * Math.PI) * 18 * (1 - reach * 0.7) + Math.sin(t * 9 - k * 20) * 3 * t;
          pxLine(c, px, py, x, y, dark, 3); pxLine(c, px, py, x, y, col, 1);
          px = x; py = y;
        }
        if (!hit && k >= 0.5) { hit = true; m.hit(0); impact(fc, ['#ffffff', col], 12); Sfx.play('slash'); }
        if (k >= 0.5 && k < 0.8) mvStar(c, px, py, 8 * (1 - (k - 0.5) / 0.3) + 2, '#ffffff');
      });
      if (!hit) m.hit(0);
      await kick;
      await back(200);
      return;
    }
    if (style === 'thrust') {
      // the shaft is pulled back level, then jabbed straight into the foe
      const S = await mvJabIn(key, col), t = S.tip(), p = { x: Math.min(t.x, fc.x + 4), y: t.y };
      m.hit(0);
      impact(p, ['#ffffff', col], 10);
      rays(p, col, 6, 16, 220, 0.25);
      if (sh === 'gstaff') { Sfx.play('zap'); fxRun(200, c => { if (Math.random() < 0.7) mvJag(c, t.x - 4, t.y, fc.x + rand(-8, 8), fc.y + rand(-12, 12), 4, 3, '#fff3a0', 1); }); }
      if (sh === 'trident') for (const o of [-4, 4]) mvStar2({ x: t.x - 2, y: t.y + o }, 120);
      await mvJabOut(S);
      return;
    }
    if (style === 'smash') {
      // heave it overhead, hop in and bring it down on the foe; the ground shakes
      const S = mvHeld(key, col);
      hold(true);
      tween(S, { th: -2.0, dx: -2, dy: -2, arm: 8 }, 170, easeOut);
      await tween(H, { ox: -4, squash: 0.16 }, 170);
      mvGlint(S.tip(), 160);
      const d = mvDash(260);
      tween(S, { th: -1.85 }, 130);
      await tween(H, { ox: 34, oy: -12, squash: -0.1 }, 130, easeOut);
      Sfx.play('slash');
      tween(H, { ox: 46, oy: 0, squash: 0.12 }, 100, easeIn);
      await tween(S, { th: 0.55, dx: 0, dy: 0, arm: 7 }, 100, easeIn);
      Sfx.play('boom');
      m.hit(0);
      const g = { x: fc.x - 4, y: 120 };
      impact({ x: fc.x - 4, y: fc.y + 4 }, ['#ffffff', col], 12);
      mvShock(g, col, 30, 380, 2);
      dust(fc.x - 4, 12);
      particles(g.x, 118, 6, { colors: ['#8a7a5a', '#c9b88a', '#5a4a3a'], speed: 90, grav: 260, dir: -Math.PI / 2, spread: 1.2, size: 3 });
      shake(4, 220);
      await tween(S, { th: 0.42 }, 90);
      await wait(70);
      await d;
      S.stop(); hold(false);
      await back(220);
      return;
    }
    // blades: a diagonal slash down through the foe (the hook rakes upward, the axe chops overhead)
    const up = sh === 'hook', chop = style === 'chop', long = sh === 'nodachi' || sh === 'bisento';
    const S = await mvBladeIn(key, col, { a0: up ? 1.3 : chop ? -1.95 : -2.35, a1: up ? -1.5 : chop ? 0.95 : 1.0, ox: long ? 36 : 44 });
    m.hit(0);
    const cut = up ? -0.95 : chop ? 1.25 : 0.85;
    slashAt(fc, col, cut, long ? 46 : 38);
    if (sh === 'scissors') slashAt(fc, '#ffffff', -cut, 30);
    impact(fc, ['#ffffff', col], 10);
    if (chop || sh === 'saw') particles(fc.x, fc.y + 4, 8, { colors: ['#ffe14a', '#ffffff'], speed: 110, grav: 200, size: 1 });
    if (chop) shake(3, 160);
    if (up) tween(G.battle.F, { oy: -4 }, 90).then(() => tween(G.battle.F, { oy: 0 }, 160));
    await mvBladeOut(S);
  },
};

// Wind up, dash in and start a swing of weapon `key` from angle a0 to a1. Resolves as the blade
// crosses the foe, with S.swing (the rest of the swing) and S.d (the dash streaks) still running.
async function mvBladeIn(key, col, o) {
  o = Object.assign({ a0: -2.35, a1: 1.0, ox: 46, oy: 0, windup: 110, dash: 110, swing: 150, back: 0.3, arm: 6, glint: true }, o);
  const H = G.hero, S = mvHeld(key, col), dir = Math.sign(o.a1 - o.a0) || 1;
  hold(true);
  S.dir = dir;
  tween(S, { th: o.a0 - o.back * dir, dx: 0, dy: 0, arm: o.arm }, o.windup, easeOut);
  await tween(H, { ox: -5, squash: 0.14 }, o.windup);
  if (o.glint) mvGlint(S.tip(), 150);
  S.d = mvDash(o.dash + o.swing + 80);
  tween(S, { th: o.a0 }, o.dash);
  await tween(H, { ox: o.ox, oy: o.oy, squash: -0.08 }, o.dash, easeIn);
  Sfx.play('slash');
  tween(H, { ox: o.ox + 4, oy: 0, squash: 0.06 }, o.swing);
  S.swing = tween(S, { th: o.a1 }, o.swing, easeOut);
  await wait(o.swing * 0.37);
  return S;
}
// Follow the swing through, then put the weapon away and step back home.
async function mvBladeOut(S, ms) {
  await S.swing;
  await tween(S, { th: S.th + 0.12 * (S.dir || 1) }, 90);
  await S.d;
  S.stop(); hold(false);
  await back(ms || 200);
}

// Level a shaft weapon (staff, spear, trident, jitte), dash in and jab it into the foe.
// Resolves at full reach; finish with mvJabOut(S).
async function mvJabIn(key, col, o) {
  o = Object.assign({ windup: 120, dash: 120, jab: 70, deep: 8, maxOx: 46 }, o);
  const H = G.hero, fc = fc0(), S = mvHeld(key, col), L = S.W.tip * 2;
  hold(true);
  S.smear = false;
  tween(S, { th: 0, dx: -8, dy: 0, arm: 2 }, o.windup);
  await tween(H, { ox: -4, squash: 0.12 }, o.windup);
  mvGlint(S.tip(), 160);
  S.d = mvDash(o.dash + o.jab + 140);
  await tween(H, { ox: Math.min(o.maxOx, fc.x + o.deep - 74 - L), squash: -0.06 }, o.dash, easeIn);
  Sfx.play('slash');
  const jab = tween(S, { dx: 10 }, o.jab, easeOut);
  await fxRun(o.jab, (c, k) => {
    const t = S.tip();
    for (let i = 0; i < 4; i++) { const y = t.y + (i - 1.5) * 4, x1 = t.x - 6 - (i % 2) * 4; pxLine(c, x1 - 14 * (1 - k), y, x1, y, i % 2 ? col : '#ffffff', 1); }
  });
  await jab;
  return S;
}
async function mvJabOut(S, ms) {
  await wait(80);
  await tween(S, { dx: 0 }, 110);
  await S.d;
  S.stop(); hold(false);
  await back(ms || 200);
}

// The shock of a punch: an upright oval ring that bursts forward from the fist.
function mvPunchShock(p, color, size) {
  const s = size || 1, lite = mixColor(color, '#ffffff', 0.55);
  return fxRun(220, (c, k) => {
    const e = easeOut(k), x = p.x + 3 + e * 12 * s;
    if (k > 0.75 && Math.floor(k * 40) % 2) return;
    mvOvalRing(c, x, p.y, (3 + e * 5) * s, (6 + e * 12) * s, color, k < 0.5 ? 2 : 1);
    if (k < 0.6) mvOvalRing(c, x - 3 * s, p.y, (2 + e * 3) * s, (4 + e * 8) * s, lite, 1);
  });
}

// Three claw gashes raking down across `pos` (s scales them): they tear in fast, then thin away.
function mvRake(pos, color, ms, s) {
  s = s || 1;
  const dark = mixColor(color, MV_INK, 0.55);
  return fxRun(ms || 260, (c, k) => {
    const head = easeOut(Math.min(1, k * 2.6)), tail = Math.max(0, (k - 0.4) / 0.6);
    for (let j = 0; j < 3; j++) {
      const x0 = pos.x - 13 * s + j * 7 * s, y0 = pos.y - 17 * s, x1 = x0 + 13 * s, y1 = pos.y + 15 * s;
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          if (t > head || t < tail) continue;
          const w = Math.sin(t * Math.PI) * 3.5 * s * (1 - tail * 0.6), x = lerp(x0, x1, t) + Math.sin(t * Math.PI) * 3 * s, y = lerp(y0, y1, t);
          if (pass === 0) pxRect(c, x - w / 2 - 1, y - 1, w + 2, 3, dark);
          else if (pass === 1) pxRect(c, x - w / 2, y, Math.max(1, w), 1, color);
          else if (w > 1.5) pxRect(c, x - w / 2, y, 1, 1, '#ffffff');
        }
      }
    }
  });
}

// A brief twinkle on a blade's edge before it strikes.
function mvGlint(p, ms, color) {
  return fxRun(ms || 160, (c, k) => mvStar(c, p.x, p.y, Math.sin(k * Math.PI) * 6, color || '#ffffff'));
}
// A small four-point flash (a prong tip catching the light).
function mvStar2(p, ms, color) {
  return fxRun(ms || 140, (c, k) => mvStar(c, p.x, p.y, (1 - k) * 5 + 1, color || '#ffffff'));
}

async function basicAttack(key, m) {
  const w = WEAPONS[key];
  if (!w || !w.shape || SWING_STYLE[w.shape] === 'punch') return MOVE_FX.punch(m);
  const col = w.color || (w.pal && w.pal.w) || '#ffffff';
  const style = SWING_STYLE[w.shape] || 'slash';
  if (MV_BASIC[style]) return MV_BASIC[style](key, w, col, m);
  return MV_BASIC.melee(key, w, col, style, m);
}

// ---------- named moves ----------

const MOVE_FX = {
  // A plain punch (fists, wraps, gloves, gauntlets): crouch, burst forward, a fist-shaped shock.
  punch: async m => {
    const H = G.hero, w = G.p && G.p.weapon && WEAPONS[G.p.weapon], col = (w && w.color) || '#ffe14a';
    await tween(H, { ox: -5, squash: 0.14 }, 110);
    const d = mvDash(220);
    await tween(H, { ox: 52, squash: -0.1 }, 110, easeIn);
    const fc = fc0(), p = { x: fc.x - 8, y: heroHand().y - 2 };
    m.hit(0);
    impact(p, ['#ffffff', col], 10);
    mvPunchShock(p, col);
    fxRun(160, (c, k) => {
      for (let i = 0; i < 5; i++) {
        const y = p.y + (i - 2) * 4, x0 = p.x + 6 + k * 20 + (i % 2) * 4, len = 8 * (1 - k);
        if (len >= 1) pxLine(c, x0, y, x0 + len, y, i === 2 ? '#ffffff' : col, 1);
      }
    });
    if (w && w.shape === 'gauntlet') particles(p.x, p.y, 8, { colors: FIRE, speed: 70, grav: -40, life: 0.4 });
    H.squash = 0.12;
    await tween(H, { ox: 48, squash: 0 }, 90);
    await d;
    await back(200);
  },

  // --- fists and race moves ---
  // Power Punch: pull the fist way back while power gathers in it, then a blow that bursts out
  // the far side of the foe.
  powerpunch: async m => {
    const H = G.hero;
    Sfx.play('charge');
    tween(H, { ox: -10, squash: 0.2 }, 300, easeOut);
    await fxRun(300, (c, k) => {
      const h = heroHand(), p = { x: h.x - 6, y: h.y };
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + k * 3, r = 16 * (1 - k) + 3;
        pxRect(c, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2, 2, i % 2 ? '#ffe14a' : '#ffffff');
      }
      pxCircle(c, p.x, p.y, 1 + k * 3, '#fff6a0');
    });
    const d = mvDash(260, '#ffe14a');
    await tween(H, { ox: 54, squash: -0.14 }, 100, easeIn);
    const fc = fc0(), p = { x: fc.x - 8, y: heroHand().y - 2 };
    m.hit(0);
    screenFlash('#fff6a0', 0.3);
    impact(p, ['#ffffff', '#ffe14a'], 14);
    mvPunchShock(p, '#ffe14a', 1.5);
    ringOut(fc, '#ffe14a', 4, 24, 300, 2);
    rays(fc, '#ffffff', 8, 22, 260);
    fxRun(260, (c, k) => {
      for (let i = 0; i < 6; i++) {
        const y = fc.y + (i - 2.5) * 5, x0 = fc.x + 10 + k * 34 + (i % 2) * 6, len = 14 * (1 - k);
        if (len >= 1) pxLine(c, x0, y, x0 + len, y, i % 2 ? '#ffe14a' : '#ffffff', 1);
      }
    });
    shake(4, 240);
    H.squash = 0.14;
    await tween(H, { ox: 50, squash: 0 }, 120);
    await d;
    await back(220);
  },
  // Electro Claw: static crackles over you, then you rake the foe with lightning in your claws.
  electroclaw: async m => {
    const H = G.hero;
    Sfx.play('zap');
    tween(H, { ox: -4, squash: 0.15 }, 220);
    await fxRun(220, c => {
      const hc = heroC();
      for (let i = 0; i < 2; i++) mvJag(c, hc.x + rand(-12, 12), hc.y - 14 + rand(-4, 4), hc.x + rand(-12, 12), hc.y + 16, 4, 3, '#7cd0ff', 1);
    });
    const d = mvDash(240, '#7cd0ff');
    await tween(H, { ox: 50, squash: -0.1 }, 100, easeIn);
    const fc = fc0();
    Sfx.play('slash');
    mvRake(fc, '#bfe6ff', 300, 1.15);
    await wait(70);
    m.hit(0);
    Sfx.play('zap');
    screenFlash('#bfe6ff', 0.3);
    impact(fc, ['#ffffff', '#7cd0ff'], 12);
    fxRun(380, (c, k) => {
      if (Math.floor(k * 18) % 2) return;
      for (let i = 0; i < 3; i++) mvJag(c, fc.x - 14 + i * 9, fc.y - 18, fc.x - 4 + i * 9, fc.y + 16, 5, 3, i === 1 ? '#ffe14a' : '#7cd0ff', 1);
    });
    particles(fc.x, fc.y, 16, { colors: ['#7cd0ff', '#ffffff', '#ffe14a'], speed: 90, grav: 0, life: 0.4 });
    H.squash = 0.1;
    await wait(200);
    await d;
    await back();
  },
  // Impact Dial: press the shell to the foe, it soaks up a beat of force, then lets it all go;
  // the recoil throws you back.
  impactdial: async m => {
    const H = G.hero;
    await tween(H, { ox: -4, squash: 0.12 }, 120);
    const d = mvDash(220);
    await tween(H, { ox: 52, squash: -0.06 }, 120, easeIn);
    const fc = fc0(), p = { x: fc.x - 14, y: fc.y + 2 };
    Sfx.play('charge');
    await fxRun(280, (c, k) => {
      for (let i = 0; i < 3; i++) pxRing(c, p.x, p.y, (1 - ((k * 2 + i / 3) % 1)) * 18 + 5, i % 2 ? '#f2c7d8' : '#ffffff', 1);
      pxCircle(c, p.x, p.y, 5, MV_INK); pxCircle(c, p.x, p.y, 4, '#f2c7d8'); pxRing(c, p.x, p.y, 2, '#ffffff', 1);
      if (k > 0.6) mvStar(c, p.x, p.y, (k - 0.6) / 0.4 * 9, '#ffffff');
    });
    Sfx.play('boom');
    screenFlash('#ffffff', 0.7);
    m.hit(0);
    focusLines(fc, '#ffffff', 300);
    impact(fc, ['#ffffff', '#f2c7d8'], 18);
    for (let i = 0; i < 3; i++) ringOut(fc, i ? '#f2c7d8' : '#ffffff', 2, 18 + i * 10, 420, 3 - i);
    mvShock({ x: fc.x, y: 120 }, '#f2c7d8', 34, 420);
    shake(7, 380);
    await tween(H, { ox: 4, squash: 0.22 }, 170, easeOut);
    dust(H.x + H.ox, 6);
    await d;
    await back(240);
  },
  // Fishman Karate: water swirls round your fist, and the blow sends ripples through the water
  // inside the foe and out the far side.
  fishkarate: async m => {
    const H = G.hero;
    Sfx.play('splash');
    tween(H, { ox: -5, squash: 0.15 }, 260);
    await fxRun(260, (c, k) => {
      const h = heroHand();
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + k * 9, r = 9 - k * 3;
        pxRect(c, h.x - 4 + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.7, 2, 2, i % 2 ? '#4fa3e0' : '#bfe6ff');
      }
    });
    const d = mvDash(240, '#bfe6ff');
    await tween(H, { ox: 50, squash: -0.1 }, 110, easeIn);
    const fc = fc0();
    m.hit(0);
    impact(fc, ['#ffffff', '#4fa3e0'], 12);
    fxRun(440, (c, k) => {
      for (let i = 0; i < 4; i++) {
        const kk = k * 1.3 - i * 0.12;
        if (kk <= 0 || kk >= 1) continue;
        mvOvalRing(c, fc.x - 10 + kk * 32, fc.y, 3 + kk * 6, 8 + kk * 12, i % 2 ? '#4fa3e0' : '#bfe6ff', kk < 0.5 ? 2 : 1);
      }
    });
    mvSplash({ x: fc.x + 10, y: fc.y + 4 }, 18);
    shake(4, 260);
    await wait(240);
    await d;
    await back();
  },

  // --- Rusty Cutlass ---
  // Rusty Slash: a big two-handed diagonal cut that showers flakes of rust.
  rustyslash: async m => {
    const fc = fc0(), S = await mvBladeIn('cutlass', '#c9875a', { a0: -2.5, a1: 1.15, windup: 150 });
    m.hit(0);
    slashAt(fc, '#c9875a', 0.85, 46);
    slashAt({ x: fc.x + 3, y: fc.y + 2 }, '#ffe9c8', 0.85, 30);
    impact(fc, ['#ffffff', '#c9875a'], 12);
    particles(fc.x, fc.y, 14, { colors: ['#8a5a32', '#c9875a', '#5a3818'], speed: 80, grav: 180, size: 2 });
    shake(2, 140);
    await mvBladeOut(S);
  },

  // --- Oak Bo Staff ---
  // Staff Sweep: the staff trails low behind you, then scythes along the ground through the
  // foe's legs and bounces it off its feet.
  staffsweep: async m => {
    const H = G.hero, F = G.battle.F, fc = fc0(), S = mvHeld('bostaff', '#e8d9b0');
    hold(true);
    tween(S, { th: 2.75, dx: 0, dy: 6, arm: 3 }, 150);
    await tween(H, { ox: -4, squash: 0.2 }, 150);
    const d = mvDash(330);
    await tween(H, { ox: 40, squash: 0.14 }, 120, easeIn);
    Sfx.play('slash');
    const sw = tween(S, { th: 0.3 }, 170, easeOut);
    fxRun(170, (c, k) => { if (Math.random() < 0.8) particles(lerp(fc.x - 30, fc.x, k), 119, 1, { colors: ['#c9b88a', '#e8d9b0'], speed: 40, grav: 120, dir: -Math.PI / 2, spread: 1.2, size: 2 }); });
    await wait(80);
    m.hit(0);
    impact({ x: fc.x - 6, y: 112 }, ['#ffffff', '#e8d9b0'], 10);
    dust(fc.x - 4, 14);
    shake(2, 160);
    tween(F, { oy: -8, squash: -0.1 }, 110, easeOut).then(() => tween(F, { oy: 0, squash: 0.2 }, 120, easeIn)).then(() => tween(F, { squash: 0 }, 140));
    await sw;
    await tween(S, { th: 0.15 }, 90);
    await d;
    S.stop(); hold(false);
    await back();
  },
  // Whirlwind: the staff spins like a propeller in front of you, battering the foe again and again.
  whirlwind: async m => {
    const H = G.hero, S = mvHeld('bostaff', '#e8d9b0');
    hold(true);
    tween(S, { th: -1.2, dx: 6, dy: 0, arm: -6 }, 130);
    await tween(H, { ox: -4, squash: 0.12 }, 130);
    const d = mvDash(240);
    await tween(H, { ox: 40, squash: -0.06 }, 120, easeIn);
    const fc = fc0(), n = m.hits, spinMs = 150 * n + 120;
    Sfx.play('slash');
    const spin = tween(S, { th: -1.2 + Math.PI * 2 * (n + 0.5) }, spinMs, linear);
    const wind = fxRun(spinMs, (c, k) => {
      const p = S.pivot(), cx = p.x;
      for (let i = 0; i < 3; i++) {
        const a = G.t * 14 + i * 2.1;
        mvSmear(c, cx, p.y, 22 + i * 3, a - 1.2, a, 2, i % 2 ? '#e8d9b0' : '#ffffff');
      }
      if (Math.random() < 0.3) particles(cx + rand(-14, 14), 119, 1, { colors: ['#c9b88a', '#e8d9b0'], speed: 40, grav: -20, dir: -Math.PI / 2, spread: 1, life: 0.4 });
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      await wait(150);
      if (i) Sfx.play('slash');
      H.squash = i % 2 ? 0.08 : -0.08;
      m.hit(i);
      impact({ x: fc.x - 4 + rand(-6, 6), y: fc.y + rand(-10, 10) }, ['#ffffff', '#e8d9b0'], 7);
    }
    await spin;
    await wind;
    await d;
    S.stop(); hold(false);
    await back();
  },
  // Pole Vault Strike: plant the staff, vault high over the field and come down on the foe.
  polevault: async m => {
    const H = G.hero, fc = fc0();
    await tween(H, { ox: 6, squash: 0.18 }, 140);
    const plant = { x: H.x + 30, y: 120 };
    Sfx.play('stretch');
    hold(true);
    const pole = fxRun(300, (c, k) => {
      const h = heroHand(), f = k > 0.85 ? (1 - k) / 0.15 : 1;
      if (f <= 0) return;
      pxLine(c, plant.x, plant.y, h.x, h.y - 2, MV_INK, 4);
      pxLine(c, plant.x, plant.y, h.x, h.y - 2, '#9a6a3a', 2);
      pxLine(c, plant.x, plant.y - 1, h.x, h.y - 3, '#c9a26a', 1);
    });
    dust(plant.x, 6);
    await tween(H, { ox: 32, oy: -48, squash: -0.15 }, 300, easeOut);
    await pole;
    const S = mvHeld('bostaff', '#e8d9b0');
    S.arm = 6; S.dx = 0; S.dy = 0; S.th = -1.9;
    mvGlint(S.tip(), 120);
    await wait(80);
    Sfx.play('slash');
    tween(S, { th: 0.7 }, 150, easeIn);
    await tween(H, { ox: 48, oy: -4, squash: 0.1 }, 150, easeIn);
    Sfx.play('boom');
    m.hit(0);
    impact({ x: fc.x - 4, y: fc.y - 4 }, ['#ffffff', '#e8d9b0'], 14);
    mvShock({ x: fc.x, y: 120 }, '#e8d9b0', 32, 380);
    ringOut({ x: fc.x, y: 118 }, '#ffffff', 2, 20, 300, 1);
    dust(fc.x, 16);
    shake(5, 280);
    tween(G.battle.F, { squash: 0.25 }, 80).then(() => tween(G.battle.F, { squash: 0 }, 200));
    await tween(H, { oy: 0, squash: 0.15 }, 90);
    await wait(80);
    S.stop(); hold(false);
    await back(240);
  },

  // --- Flintlock Pistol ---
  // Quick Draw: a gleam in your eye and the shot is already home - one blinding line of fire.
  quickdraw: async m => {
    const H = G.hero, fc = fc0(), hc = heroC();
    mvGlint({ x: hc.x + 3, y: hc.y - 9 }, 150, '#fff6a0');
    await wait(150);
    Sfx.play('shot');
    screenFlash('#fff6c8', 0.35);
    const h = heroHand(), mz = { x: h.x + 15, y: h.y + 1 };
    fxRun(200, (c, k) => {
      const w = k < 0.3 ? 3 : k < 0.6 ? 2 : 1;
      pxLine(c, mz.x, mz.y, fc.x, fc.y, '#ffe14a', w + 1);
      pxLine(c, mz.x, mz.y, fc.x, fc.y, '#ffffff', Math.max(1, w - 1));
      mvStar(c, mz.x, mz.y, 10 * (1 - k) + 1, '#ffe14a');
    });
    const kick = tween(H, { ox: -7, squash: -0.06 }, 50).then(() => tween(H, { ox: 0, squash: 0 }, 240));
    await wait(40);
    m.hit(0);
    floatText(fc.x, foeTop() - 14, 'BANG', '#ffe14a');
    impact(fc, null, 12);
    ringOut(mz, '#dfe2ea', 1, 9, 300, 1);
    mvPuffs(mz.x, mz.y, 4, { cols: ['#ffffff', '#b9bdc9'], speed: 16, dir: -0.6, spread: 1, r0: 1, r1: 4, ms: 560, rise: 16 });
    await kick;
  },
  // Trick Shot: the bullet ricochets off the ground and back down out of the sky; its path
  // hangs in the air as a dotted line.
  trickshot: async m => {
    const H = G.hero, fc = fc0();
    await tween(H, { ox: 2, squash: 0.05 }, 90);
    Sfx.play('shot');
    const h = heroHand(), mz = { x: h.x + 15, y: h.y + 1 };
    fxRun(110, (c, k) => mvStar(c, mz.x, mz.y, 8 * (1 - k) + 1, '#ffe14a'));
    const kick = tween(H, { ox: -5 }, 50).then(() => tween(H, { ox: 0, squash: 0 }, 220));
    const pts = [mz, { x: 100, y: 120 }, { x: 120, y: 34 }, fc];
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[i + 1], T = 110, all = 560;
      fxRun(all, (c, k) => {
        const t = Math.min(1, k * all / T), f = Math.max(0, (k * all - T) / (all - T));
        c.globalAlpha = 1 - f;
        for (let s = 0; s <= t; s += 0.05) if (Math.round(s / 0.05) % 2 === 0) pxRect(c, lerp(a.x, b.x, s), lerp(a.y, b.y, s), 1, 1, '#ffe14a');
        c.globalAlpha = 1;
        if (t < 1) {
          const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t), t0 = Math.max(0, t - 0.35);
          pxLine(c, lerp(a.x, b.x, t0), lerp(a.y, b.y, t0), x, y, '#ffffff', 1);
          pxRect(c, x - 1, y - 1, 3, 3, '#fff6a0');
        }
      });
      await wait(T);
      if (i < 2) {
        Sfx.play('miss');
        mvStar2(b, 180, '#ffe14a');
        ringOut(b, '#ffffff', 1, 7, 200, 1);
        particles(b.x, b.y, 6, { colors: ['#ffe14a', '#ffffff'], speed: 50, grav: 0, life: 0.25, size: 1 });
      }
    }
    m.hit(0);
    impact(fc, null, 12);
    rays(fc, '#ffe14a', 6, 18, 220, 0.5);
    await kick;
  },

  // --- Marine Saber ---
  // Iron Rule Slash: leap and bring the saber straight down; a tall line of justice splits the foe.
  ironrule: async m => {
    const fc = fc0(), S = await mvBladeIn('saber', '#9ad0ff', { a0: -1.8, a1: 1.3, oy: -10, back: 0.5 });
    m.hit(0);
    Sfx.play('slash');
    fxRun(340, (c, k) => {
      const e = easeOut(Math.min(1, k * 2.5)), f = k < 0.5 ? 1 : 1 - (k - 0.5) * 2, y0 = fc.y - 30, y1 = y0 + 60 * e;
      if (f <= 0) return;
      pxLine(c, fc.x, y0, fc.x, y1, mixColor('#9ad0ff', MV_INK, 0.5), Math.round(5 * f) + 1);
      pxLine(c, fc.x, y0, fc.x, y1, '#9ad0ff', Math.round(3 * f) + 1);
      pxLine(c, fc.x, y0, fc.x, y1, '#ffffff', 1);
    });
    impact(fc, ['#ffffff', '#9ad0ff'], 12);
    particles(fc.x, fc.y, 10, { colors: ['#9ad0ff', '#ffffff'], speed: 70, grav: 60, size: 1 });
    shake(3, 180);
    await mvBladeOut(S);
  },
  // Saber Flurry: the saber flashes back and forth, too fast to follow.
  saberflurry: async m => {
    const H = G.hero, S = await mvBladeIn('saber', '#9ad0ff', { swing: 110 });
    const angs = [0.8, -0.7, 0.15, -0.4];
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      if (i) {
        await S.swing;
        Sfx.play('slash');
        S.dir = i % 2 ? -1 : 1;
        S.swing = tween(S, { th: i % 2 ? -2.3 : 1.0 }, 100, easeOut);
        H.ox = 48 + (i % 2) * 4;
        await wait(40);
      }
      const fc = fc0();
      m.hit(i);
      slashAt({ x: fc.x + rand(-6, 6), y: fc.y + rand(-8, 8) }, i % 2 ? '#ffffff' : '#9ad0ff', angs[i % 4] + rand(-0.2, 0.2), 32);
      impact({ x: fc.x + rand(-4, 4), y: fc.y + rand(-6, 6) }, ['#ffffff', '#9ad0ff'], 6);
      await wait(50);
    }
    await mvBladeOut(S);
  },
  // Justice Crescent: the raised saber drinks in light, and one cut sends a great crescent flying.
  justice: async m => {
    const H = G.hero, fc = fc0(), col = m.color || '#9ad0ff', S = mvHeld('saber', col);
    hold(true);
    Sfx.play('charge');
    tween(S, { th: -1.7, dx: 0, dy: 0, arm: 6 }, 200);
    await tween(H, { squash: 0.15 }, 200);
    await fxRun(320, (c, k) => {
      const t = S.tip();
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63 + k * 2, r = 26 * (1 - k) + 3;
        pxLine(c, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, t.x + Math.cos(a) * (r + 5), t.y + Math.sin(a) * (r + 5), i % 2 ? col : '#ffffff', 1);
      }
      mvStar(c, t.x, t.y, 2 + k * 7, '#ffffff');
    });
    Sfx.play('slash');
    tween(H, { ox: 8, squash: -0.1 }, 110);
    await tween(S, { th: 0.9 }, 110, easeOut);
    const x0 = H.x + 30;
    await fxRun(260, (c, k) => {
      const x = lerp(x0, fc.x, easeIn(k));
      for (let j = 3; j >= 1; j--) { c.globalAlpha = 0.22 * (4 - j); mvCrescent(c, x - j * 9, fc.y, 20, 9, 4, col, 1); }
      c.globalAlpha = 1;
      mvCrescent(c, x, fc.y, 22, 10, 6, col, 1);
    });
    m.hit(0);
    screenFlash('#e8f4ff', 0.5);
    slashAt(fc, col, 0.8, 46);
    slashAt(fc, '#ffffff', -0.8, 46);
    impact(fc, ['#ffffff', col], 16);
    ringOut(fc, col, 4, 30, 380, 3);
    shake(5, 300);
    await wait(220);
    S.stop(); hold(false);
    await back();
  },

  // --- Coral Trident ---
  // Trident Thrust: three prongs drive into the foe and burst out the back in spray.
  tridentthrust: async m => {
    const fc = fc0(), S = await mvJabIn('trident', '#ff9ab0'), t = S.tip();
    m.hit(0);
    for (const o of [-4, 0, 4]) impact({ x: Math.min(t.x, fc.x + 6), y: t.y + o * 1.5 }, ['#ffffff', '#ff9ab0'], 5);
    mvSplash({ x: fc.x + 8, y: fc.y + 2 }, 14);
    shake(2, 140);
    await mvJabOut(S);
  },
  // Tsunami Spear: you hurl the trident and a towering wave rides in behind it.
  tsunamispear: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('trident'));
    hold(true);
    Sfx.play('splash');
    await tween(H, { ox: -6, squash: 0.16 }, 160);
    tween(H, { ox: 8, squash: -0.1 }, 120);
    const x0 = H.x + 6;
    let hit = false;
    await fxRun(640, (c, k) => {
      const e = easeIn(Math.min(1, k / 0.8)), x = lerp(x0, fc.x + 6, e), hgt = 10 + 22 * Math.min(1, k * 2);
      for (let i = 0; i < 22; i++) {
        const xx = x - i * 3, h = hgt * (1 - i / 24) * (0.85 + Math.sin(i * 0.9 + G.t * 12) * 0.15), top = 121 - h;
        pxRect(c, xx - 1, top - 1, 4, h + 1, '#1f4f9a');
        pxRect(c, xx, top, 3, h, i % 4 ? '#2f6fd0' : '#4fa3e0');
        pxRect(c, xx, top, 3, 2, i < 6 ? '#ffffff' : '#bfe6ff');
      }
      for (let i = 0; i < 4; i++) pxRect(c, x - 4 - i * 3, 121 - hgt - 2 - Math.sin(i + G.t * 20) * 2, 2, 2, '#ffffff');
      drawRot(c, img, x + 6, 121 - hgt - 2, Math.PI / 2, 2);
      if (Math.random() < 0.6) particles(x, 121 - hgt, 1, { colors: ['#bfe6ff', '#ffffff'], speed: 50, grav: 160, dir: -Math.PI / 2, spread: 1.2, size: 2 });
      if (!hit && k >= 0.8) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    Sfx.play('splash');
    screenFlash('#bfe6ff', 0.4);
    mvSplash(fc, 26);
    mvSplash({ x: fc.x + 10, y: 116 }, 14);
    impact(fc, ['#ffffff', '#4fa3e0'], 14);
    shake(5, 300);
    hold(false);
    await back(240);
  },

  // --- Karate Wraps ---
  // Tidal Palm: an open palm that blasts a fan of water through the foe.
  tidalpalm: async m => {
    const H = G.hero;
    await tween(H, { ox: -4, squash: 0.14 }, 120);
    const d = mvDash(240, '#bfe6ff');
    await tween(H, { ox: 50, squash: -0.08 }, 110, easeIn);
    const fc = fc0(), p = { x: fc.x - 10, y: fc.y };
    m.hit(0);
    Sfx.play('splash');
    impact(p, ['#ffffff', '#4fa3e0'], 10);
    fxRun(360, (c, k) => {
      for (let i = 0; i < 4; i++) {
        const kk = k * 1.4 - i * 0.14;
        if (kk <= 0 || kk >= 1) continue;
        const r = 6 + kk * 26;
        mvSmear(c, p.x, p.y, r, -0.7, 0, 3 * (1 - kk) + 1, i % 2 ? '#4fa3e0' : '#bfe6ff');
        mvSmear(c, p.x, p.y, r, 0.7, 0, 3 * (1 - kk) + 1, i % 2 ? '#4fa3e0' : '#bfe6ff');
      }
    });
    particles(fc.x, fc.y, 16, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 110, grav: 140, dir: 0, spread: 1.2 });
    H.squash = 0.1;
    await wait(200);
    await d;
    await back();
  },
  // Coral Breaker: a piercing punch that cracks the foe like coral; pink shards fly everywhere.
  coralbreaker: async m => {
    const H = G.hero;
    await tween(H, { ox: -8, squash: 0.18 }, 170);
    const d = mvDash(240, '#ff7a9a');
    await tween(H, { ox: 56, squash: -0.12 }, 100, easeIn);
    const fc = fc0();
    m.hit(0);
    Sfx.play('boom');
    const cracks = Array.from({ length: 7 }, (_, i) => ({ a: i * 0.9 + rand(-0.2, 0.2), L: rand(10, 18) }));
    fxRun(420, (c, k) => {
      if (k > 0.7 && Math.floor(k * 30) % 2) return;
      const e = easeOut(Math.min(1, k * 3));
      for (const q of cracks) {
        const x1 = fc.x + Math.cos(q.a) * q.L * e, y1 = fc.y + Math.sin(q.a) * q.L * e;
        zigzag(c, fc.x, fc.y, x1, y1, 3, 1.5, '#ff7a9a', 2);
        zigzag(c, fc.x, fc.y, x1, y1, 3, 1.5, '#ffffff', 1);
      }
    });
    impact(fc, ['#ffffff', '#ff7a9a'], 12);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      particles(fc.x + Math.cos(a) * 6, fc.y + Math.sin(a) * 6, 2, { colors: ['#ff7a9a', '#ffb0c0', '#ffffff'], speed: 110, grav: 160, size: 3 });
    }
    rays(fc, '#ff7a9a', 7, 22, 300, 0.3);
    shake(4, 240);
    H.squash = 0.12;
    await wait(160);
    await d;
    await back();
  },
  // Thousand Wave Fist: a still stance, water gathering, then a punch whose shockwave rolls on
  // through the foe in wave after wave.
  thousandwave: async m => {
    const H = G.hero;
    Sfx.play('charge');
    tween(H, { ox: -6, squash: 0.18 }, 360);
    await fxRun(360, (c, k) => {
      const h = heroHand();
      for (let i = 0; i < 12; i++) {
        const a = i * 0.52 + k * 4, r = 26 * (1 - k) + 4;
        pxRect(c, h.x - 4 + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.8, 2, 2, i % 3 ? '#4fa3e0' : '#ffffff');
      }
      pxCircle(c, h.x - 4, h.y, 1 + k * 3, '#bfe6ff');
    });
    const d = mvDash(260, '#bfe6ff');
    await tween(H, { ox: 50, squash: -0.12 }, 110, easeIn);
    const fc = fc0(), p = { x: fc.x - 10, y: fc.y };
    Sfx.play('boom');
    m.hit(0);
    screenFlash('#bfe6ff', 0.45);
    focusLines(fc, '#bfe6ff', 280);
    impact(p, ['#ffffff', '#4fa3e0'], 16);
    fxRun(760, (c, k) => {
      for (let i = 0; i < 6; i++) {
        const kk = k * 1.5 - i * 0.1;
        if (kk <= 0 || kk >= 1) continue;
        const x = p.x + kk * 70, ry = 10 + kk * 30, col = i % 2 ? '#4fa3e0' : '#ffffff';
        mvOvalRing(c, x, p.y, 3 + kk * 8, ry, col, kk < 0.4 ? 2 : 1);
      }
    });
    mvSplash({ x: fc.x + 12, y: fc.y }, 22);
    mvShock({ x: fc.x, y: 120 }, '#4fa3e0', 40, 500);
    shake(6, 520);
    H.squash = 0.14;
    await wait(380);
    await d;
    await back();
  },

  // --- Sunset Scimitar ---
  // Mirage Slash: heat haze shimmers round you, you blur into after-images and strike from the haze.
  mirage: async m => {
    const H = G.hero;
    const haze = fxRun(720, (c, k) => {
      const hc = heroC(), f = Math.sin(k * Math.PI);
      c.globalAlpha = 0.7 * f;
      for (let i = 0; i < 6; i++) {
        const y = hc.y - 16 + i * 6, x = hc.x - 12 + Math.sin(G.t * 18 + i * 1.7) * 3;
        pxLine(c, x, y, x + 24, y, i % 2 ? '#ffb84a' : '#ffe9a8', 1);
      }
      c.globalAlpha = 1;
    });
    const g = ghosts(520, '#ffb84a', 4, 10);
    const fc = fc0(), S = await mvBladeIn('scimitar', '#ffb84a', { a0: -2.45, a1: 1.05, windup: 140 });
    m.hit(0);
    slashAt(fc, '#ffb84a', 0.6, 44);
    impact(fc, ['#ffffff', '#ffb84a'], 12);
    fxRun(320, (c, k) => {
      c.globalAlpha = 0.6 * (1 - k);
      for (let i = 0; i < 3; i++) pxRect(c, fc.x - 20 + Math.sin(G.t * 20 + i) * 3, fc.y - 4 + i * 3, 40, 1, '#ffe9a8');
      c.globalAlpha = 1;
    });
    await mvBladeOut(S);
    await g;
    await haze;
  },
  // Sunset Cleave: the sky turns to dusk behind you, and a sweeping arc the colour of the setting
  // sun cleaves through the foe.
  sunsetcleave: async m => {
    const H = G.hero, fc = fc0(), col = m.color || '#ff9a3a', S = mvHeld('scimitar', col);
    hold(true);
    Sfx.play('charge');
    const dusk = fxRun(1250, (c, k) => {
      const a = Math.min(1, k * 4) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      c.globalAlpha = 0.28 * a;
      pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#ff6a2a');
      c.globalAlpha = 0.85 * a;
      pxCircle(c, H.x - 10, 64, 26, '#ff9a3a'); pxCircle(c, H.x - 10, 64, 20, '#ffd04a'); pxCircle(c, H.x - 10, 64, 13, '#fff3a0');
      c.globalAlpha = 1;
    });
    tween(S, { th: -2.0, dx: 0, dy: 0, arm: 6 }, 260);
    await tween(H, { squash: 0.18 }, 260);
    mvGlint(S.tip(), 180, '#fff3a0');
    await wait(180);
    Sfx.play('slash');
    screenFlash('#ff9a3a', 0.35);
    tween(H, { ox: 14, squash: -0.1 }, 140);
    tween(S, { th: 0.9 }, 160, easeOut);
    arcSweep(G.hero.x + 10, 104, 90, -0.95, 0.6, '#ff5a2a', 400, 7);
    await arcSweep(G.hero.x + 10, 104, 84, -0.95, 0.6, '#ffd04a', 380, 3);
    m.hit(0);
    slashAt(fc, '#ffd04a', 0.55, 50);
    impact(fc, ['#ffffff', '#ff9a3a'], 18);
    mvBlast(fc, 12, 360, ['#a8200f', '#ff5a2a', '#ffb03a', '#fff3a0']);
    particles(fc.x, fc.y, 24, { colors: ['#ff9a3a', '#ffd04a', '#ff5a5a'], speed: 100, grav: 40 });
    particles(fc.x, fc.y - 10, 10, { colors: ['#ffd04a', '#fff3a0'], speed: 30, grav: -30, life: 0.8, size: 1 });
    shake(6, 320);
    await wait(160);
    S.stop(); hold(false);
    await back();
    await dusk;
  },

  // --- Shock Shell ---
  // Shell Blast: thrust the shell out and a burst of shockwaves slams the foe.
  shellblast: async m => {
    const H = G.hero, fc = fc0(), at = () => { const h = heroHand(); return { x: h.x + 2, y: h.y + 4 }; };
    tween(H, { ox: 6, squash: 0.1 }, 140);
    await fxRun(140, (c, k) => { const p = at(); pxRing(c, p.x, p.y, 12 * (1 - k) + 3, '#f2c7d8', 1); pxCircle(c, p.x, p.y, 1 + k * 3, '#ffffff'); });
    Sfx.play('boom');
    const from = at();
    mvStar2(from, 160);
    const kick = tween(H, { ox: -6, squash: -0.08 }, 70).then(() => tween(H, { ox: 0, squash: 0 }, 220));
    let hit = false;
    await fxRun(300, (c, k) => {
      for (let i = 0; i < 4; i++) {
        const kk = k * 1.5 - i * 0.15;
        if (kk <= 0 || kk >= 1) continue;
        const x = lerp(from.x + 4, fc.x - 4, kk), y = lerp(from.y, fc.y, kk), r = 6 + kk * 14, col = i % 2 ? '#f2c7d8' : '#ffffff';
        mvSmear(c, x - r, y, r, -1.15, 0, 4, col);
        mvSmear(c, x - r, y, r, 1.15, 0, 4, col);
      }
      if (!hit && k * 1.5 >= 1) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    impact(fc, ['#f2c7d8', '#ffffff'], 14);
    ringOut(fc, '#f2c7d8', 4, 22, 300, 2);
    shake(3, 200);
    await kick;
  },
  // Echo Burst: the shell hums and echoes roll out over and over, ringing the foe's head.
  echoburst: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('charge');
    tween(H, { ox: 4, squash: 0.1 }, 160);
    const h = heroHand(), from = { x: h.x + 6, y: h.y + 2 };
    await fxRun(640, (c, k) => {
      for (let i = 0; i < 6; i++) {
        const kk = k * 1.5 - i * 0.1;
        if (kk <= 0 || kk >= 1) continue;
        const x = lerp(from.x, fc.x, kk), y = lerp(from.y, fc.y, kk), r = 5 + kk * 18;
        c.globalAlpha = 1 - kk * 0.5;
        mvSmear(c, x - r, y, r, -1.2, 0, 2, i % 2 ? '#f2c7d8' : '#ffffff');
        mvSmear(c, x - r, y, r, 1.2, 0, 2, i % 2 ? '#f2c7d8' : '#ffffff');
      }
      c.globalAlpha = 1;
      pxRing(c, from.x - 4, from.y, 3 + Math.sin(k * 40) * 1.5, '#f2c7d8', 1);
    });
    Sfx.play('boom');
    m.hit(0);
    impact(fc, ['#ffffff', '#f2c7d8'], 12);
    for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#f2c7d8' : '#ffffff', 4 + i * 4, 28 + i * 8, 420, 2);
    fxRun(520, (c, k) => {
      const top = foeTop() - 4;
      for (let i = 0; i < 3; i++) { const a = G.t * 7 + i * 2.1; mvStar(c, fc.x + Math.cos(a) * 10, top + Math.sin(a) * 3, 2, '#ffe14a'); }
    });
    shake(3, 260);
    await tween(H, { ox: 0, squash: 0 }, 200);
  },
  // Recoil Burst: press the Reject-style shell to the foe, everything goes quiet for a beat, then a
  // blinding blast throws you both apart.
  recoilburst: async m => {
    const H = G.hero;
    await tween(H, { ox: -4, squash: 0.12 }, 120);
    const d = mvDash(220);
    await tween(H, { ox: 54, squash: -0.06 }, 130, easeIn);
    const fc = fc0(), p = { x: fc.x - 12, y: fc.y + 2 };
    Sfx.play('charge');
    await fxRun(380, (c, k) => {
      c.globalAlpha = 0.35 * k;
      pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#1b1424');
      c.globalAlpha = 1;
      for (let i = 0; i < 4; i++) pxRing(c, p.x, p.y, (1 - ((k * 2.5 + i / 4) % 1)) * 26 + 3, i % 2 ? '#f2c7d8' : '#ffffff', 1);
      pxCircle(c, p.x, p.y, 2 + k * 4, '#ffffff');
      if (Math.random() < 0.5) mvJag(c, p.x, p.y, p.x + rand(-14, 14), p.y + rand(-14, 14), 3, 2, '#f2c7d8', 1);
    });
    Sfx.play('boom');
    screenFlash('#ffffff', 1);
    m.hit(0);
    focusLines(fc, '#f2c7d8', 360);
    mvBlast(p, 22, 460, ['#c97aa0', '#f2c7d8', '#ffffff', '#ffffff']);
    for (let i = 0; i < 4; i++) ringOut(fc, i % 2 ? '#f2c7d8' : '#ffffff', 2, 22 + i * 14, 520, 3);
    mvShock({ x: fc.x, y: 120 }, '#f2c7d8', 50, 520);
    particles(fc.x, fc.y, 30, { colors: ['#f2c7d8', '#ffffff', '#ffe14a'], speed: 150 });
    shake(9, 520);
    await tween(H, { ox: -14, oy: -6, squash: 0.25 }, 220, easeOut);
    await tween(H, { oy: 0 }, 100, easeIn);
    dust(H.x + H.ox, 8);
    await d;
    await back(280);
  },

  // --- Night Edge ---
  // Black Crescent: the light dims and a crescent of black steel cuts across the field.
  blackcrescent: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('nightedge', '#9a6ae0');
    hold(true);
    const dim = fxRun(760, (c, k) => { c.globalAlpha = 0.35 * Math.sin(k * Math.PI); pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#0a0014'); c.globalAlpha = 1; });
    tween(S, { th: -2.4, dx: 0, dy: 0, arm: 6 }, 170);
    await tween(H, { squash: 0.16 }, 170);
    mvGlint(S.tip(), 140, '#c9a8ff');
    await wait(100);
    Sfx.play('slash');
    tween(H, { ox: 8, squash: -0.1 }, 110);
    await tween(S, { th: 1.0 }, 120, easeOut);
    const x0 = H.x + 28;
    await fxRun(280, (c, k) => {
      const x = lerp(x0, fc.x, easeIn(k));
      for (let j = 3; j >= 1; j--) { c.globalAlpha = 0.2 * (4 - j); mvCrescent(c, x - j * 8, fc.y, 18, 9, 5, '#3a3048', 1); }
      c.globalAlpha = 1;
      mvCrescent(c, x, fc.y, 20, 10, 6, '#3a3048', 1);
      mvCrescent(c, x - 1, fc.y, 18, 9, 2, '#9a6ae0', 1);
    });
    m.hit(0);
    slashAt(fc, '#9a6ae0', 1.2, 42);
    impact(fc, ['#c9a8ff', '#9a6ae0'], 14);
    particles(fc.x, fc.y, 20, { colors: ['#3a3048', '#9a6ae0', '#1b1424'], speed: 90 });
    shake(3, 200);
    await wait(120);
    S.stop(); hold(false);
    await back();
    await dim;
  },
  // Night Rain: black blades fall out of a darkened sky, one after another.
  nightrain: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('nightedge', '#9a6ae0');
    hold(true);
    const dark = fxRun(260 + 140 * m.hits + 300, (c, k) => {
      const a = Math.min(1, k * 5) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      c.globalAlpha = 0.45 * a;
      pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#0a0014');
      c.globalAlpha = 1;
    });
    Sfx.play('slash');
    tween(S, { th: -1.6, dx: 0, dy: 0, arm: 6 }, 200);
    await tween(H, { squash: 0.14 }, 200);
    mvGlint(S.tip(), 160, '#c9a8ff');
    await tween(H, { squash: 0 }, 100);
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const x = fc.x + rand(-14, 14), a = rand(-0.25, 0.25);
      Sfx.play('slash');
      await fxRun(110, (c, k) => {
        const y = lerp(VIEW.y - 10, fc.y + 4, easeIn(k)), dx = Math.sin(a) * 30;
        pxLine(c, x - dx, y - 30, x, y, '#1b1424', 4);
        pxLine(c, x - dx, y - 30, x, y, '#9a6ae0', 2);
        pxLine(c, x - dx * 0.4, y - 12, x, y, '#ffffff', 1);
      });
      m.hit(i);
      slashAt({ x, y: fc.y }, i % 2 ? '#c9a8ff' : '#9a6ae0', Math.PI / 2 + a, 26);
      particles(x, fc.y, 6, { colors: ['#9a6ae0', '#3a3048', '#ffffff'], speed: 60, size: 1 });
    }
    S.stop(); hold(false);
    await dark;
  },
  // Edge of the World: the world goes dark, you streak across the whole screen in one stroke - and
  // only after a heartbeat of silence does the line split open.
  edgeworld: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('nightedge', '#9a6ae0');
    hold(true);
    Sfx.play('haki');
    const night = fxRun(1500, (c, k) => {
      const a = Math.min(1, k * 5) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      c.globalAlpha = 0.65 * a;
      pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#0a0014');
      c.globalAlpha = 1;
    });
    tween(S, { th: -2.8, dx: 0, dy: 0, arm: 6 }, 260);
    await tween(H, { squash: 0.2 }, 260);
    mvGlint(S.tip(), 200, '#c9a8ff');
    await wait(160);
    Sfx.play('slash');
    const y = fc.y + 2, xa = H.x + H.ox;
    tween(S, { th: 0.2 }, 120, easeOut);
    await tween(H, { ox: 124, squash: -0.15 }, 120, easeIn);
    const line = fxRun(760, (c, k) => {
      const e = easeOut(Math.min(1, k * 6)), x1 = lerp(xa, VIEW.x + VIEW.w, e), split = k > 0.45 ? easeOut((k - 0.45) / 0.55) : 0;
      pxLine(c, VIEW.x, y, x1, y, '#1b1424', 5 + split * 6);
      pxLine(c, VIEW.x, y, x1, y, '#9a6ae0', 3 + split * 4);
      pxLine(c, VIEW.x, y, x1, y, '#ffffff', 1 + Math.round(split * 2));
    });
    await wait(340);
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#c9a8ff', 0.9);
    focusLines(fc, '#9a6ae0', 360);
    impact(fc, ['#ffffff', '#9a6ae0'], 20);
    for (let i = 0; i < 2; i++) ringOut(fc, i ? '#9a6ae0' : '#ffffff', 4, 30 + i * 14, 460, 2);
    particles(fc.x, fc.y, 30, { colors: ['#9a6ae0', '#ffffff', '#1b1424'], speed: 130 });
    shake(9, 700);
    await wait(260);
    S.stop(); hold(false);
    await back(300);
    await line;
    await night;
  },

  // --- Grizzle's Club ---
  // Ground Pound: leap and slam the club into the earth; the crack races to the foe and the
  // ground bursts up under it.
  groundpound: async m => {
    const H = G.hero, F = G.battle.F, fc = fc0(), S = mvHeld('club', '#e8d9b0');
    hold(true);
    tween(S, { th: -1.9, dx: -2, dy: -2, arm: 8 }, 160);
    await tween(H, { squash: 0.18 }, 160);
    await tween(H, { ox: 18, oy: -36, squash: -0.12 }, 240, easeOut);
    Sfx.play('slash');
    tween(S, { th: 0.9, dx: 0, dy: 0, arm: 6 }, 120, easeIn);
    await tween(H, { oy: 0, squash: 0.2 }, 120, easeIn);
    Sfx.play('boom');
    const gx = H.x + H.ox + 22;
    mvShock({ x: gx, y: 120 }, '#c9b88a', 22, 300);
    dust(gx, 10);
    shake(4, 200);
    groundCrack(gx, fc.x + 10, '#5a4a3a', 300);
    await wait(260);
    m.hit(0);
    for (let i = 0; i < 5; i++) particles(fc.x - 12 + i * 6, 120, 2, { colors: ['#8a7a5a', '#c9b88a', '#5a4a3a'], speed: 120, grav: 240, dir: -Math.PI / 2, spread: 0.6, size: 3 });
    mvPuffs(fc.x, 118, 6, { cols: ['#efe4c4', '#c9b88a'], speed: 30, dir: -Math.PI / 2, spread: 2.4, r0: 3, r1: 7, ms: 520, rise: 10 });
    impact({ x: fc.x, y: fc.y + 10 }, ['#ffffff', '#c9b88a'], 10);
    tween(F, { oy: -10, squash: -0.15 }, 110, easeOut).then(() => tween(F, { oy: 0, squash: 0.2 }, 130, easeIn)).then(() => tween(F, { squash: 0 }, 150));
    shake(5, 320);
    await wait(160);
    S.stop(); hold(false);
    await back();
  },
  // Mountain Crusher: you heave upward and a club the size of a mountain comes down on the foe.
  mountaincrusher: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('club'));
    hold(true);
    Sfx.play('charge');
    await tween(H, { squash: 0.22 }, 200);
    await tween(H, { oy: -6, squash: -0.15 }, 140, easeOut);
    await dropOn({ x: fc.x + 6, y: fc.y - 22 }, 420, (c, x, y) => drawRot(c, img, x, y, 0.35, 6));
    Sfx.play('boom');
    m.hit(0);
    screenFlash('#ffffff', 0.6);
    focusLines(fc, '#e8d9b0', 300);
    fxRun(260, (c, k) => drawRot(c, img, fc.x + 6, fc.y - 22 + k * 3, 0.35 + k * 0.05, 6));
    for (let i = 0; i < 4; i++) particles(fc.x, fc.y + 10, 6, { colors: ['#6a5a4a', '#8a7a5a', '#c9b88a'], speed: 130, grav: 220, size: 3 });
    mvPuffs(fc.x, 116, 10, { cols: ['#efe4c4', '#c9b88a'], speed: 60, dir: -Math.PI / 2, spread: 3, r0: 4, r1: 10, ms: 700, rise: 8 });
    mvShock({ x: fc.x, y: 120 }, '#c9b88a', 56, 520, 3);
    groundCrack(fc.x - 6, fc.x - 56, '#3a2a1a', 360);
    groundCrack(fc.x + 6, fc.x + 56, '#3a2a1a', 360);
    shake(8, 560);
    await tween(H, { oy: 0, squash: 0 }, 160);
    await wait(240);
    hold(false);
    await back();
  },

  // --- Ironjaw's Axe ---
  // Axe Chop: a heavy overhead chop that bites deep and sprays sparks and splinters.
  axechop: async m => {
    const fc = fc0(), S = await mvBladeIn('ironaxe', '#c9ccd6', { a0: -1.9, a1: 1.05, oy: -8, windup: 150, back: 0.4 });
    Sfx.play('boom');
    m.hit(0);
    slashAt(fc, '#c9ccd6', 1.3, 40);
    impact(fc, ['#ffffff', '#c9ccd6'], 12);
    particles(fc.x, fc.y + 6, 12, { colors: ['#ffe14a', '#ffffff'], speed: 120, grav: 220, dir: -Math.PI / 2, spread: 2.4, size: 1 });
    particles(fc.x, fc.y + 6, 6, { colors: ['#8a6a3a', '#5a3818'], speed: 70, grav: 200, size: 2 });
    shake(3, 200);
    await mvBladeOut(S);
  },
  // Spinning Axe: the axe whirls out, grinds into the foe in a shower of sparks and flies back.
  spinaxe: async m => {
    const H = G.hero, img = getSprite(weaponSpec('ironaxe')), fc = fc0();
    hold(true);
    await tween(H, { ox: -4, squash: 0.14 }, 120);
    tween(H, { ox: 6, squash: -0.08 }, 100);
    Sfx.play('slash');
    const h = heroHand(), at = { x: fc.x - 4, y: fc.y };
    await spinThrow(img, h, at, 220, 2, 2, 12);
    const grind = fxRun(110 * m.hits + 60, (c, k) => {
      drawRot(c, img, at.x + Math.sin(k * 60) * 1.5, at.y, k * 40, 2);
      mvSmear(c, at.x, at.y, 12, G.t * 30 - 2, G.t * 30, 3, '#c9ccd6');
      if (Math.random() < 0.7) particles(at.x + 4, at.y + 6, 2, { colors: ['#ffe14a', '#ffffff'], speed: 90, grav: 200, dir: -Math.PI / 4, spread: 1, size: 1, life: 0.3 });
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('slash');
      m.hit(i);
      impact({ x: at.x + rand(-6, 6), y: at.y + rand(-6, 6) }, ['#ffffff', '#c9ccd6'], 6);
      await wait(110);
    }
    await grind;
    await spinThrow(img, at, heroHand(), 220, 2, 2, -12);
    hold(false);
    await back(160);
  },
  // Iron Cleave: you leap high and bring a giant axe blade down that splits the ground in two.
  ironcleave: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('ironaxe'));
    hold(true);
    Sfx.play('charge');
    await tween(H, { squash: 0.22 }, 200);
    await tween(H, { ox: 20, oy: -60, squash: -0.15 }, 260, easeOut);
    mvGlint({ x: fc.x - 10, y: VIEW.y + 20 }, 160);
    Sfx.play('slash');
    let hit = false;
    tween(H, { ox: 44, oy: 0, squash: 0.2 }, 300, easeIn);
    await fxRun(320, (c, k) => {
      const e = easeIn(Math.min(1, k / 0.85)), y = lerp(VIEW.y - 30, fc.y - 6, e), a = lerp(-0.6, 0.45, e);
      for (let j = 3; j >= 1; j--) { c.globalAlpha = 0.18 * (4 - j); drawRot(c, img, fc.x - 10, y - j * 12, a - j * 0.04, 5); }
      c.globalAlpha = 1;
      drawRot(c, img, fc.x - 10, y, a, 5);
      if (!hit && k >= 0.85) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 0.7);
    slashAt(fc, '#ffffff', Math.PI / 2, 60);
    impact(fc, ['#ffffff', '#c9ccd6'], 18);
    groundCrack(fc.x - 2, fc.x - 50, '#3a3440', 320);
    groundCrack(fc.x + 2, fc.x + 50, '#3a3440', 320);
    mvShock({ x: fc.x, y: 120 }, '#c9ccd6', 46, 460);
    dust(fc.x, 18);
    shake(8, 480);
    await wait(260);
    hold(false);
    await back();
  },

  // --- Shark Saw ---
  // Saw Slash: the saw tears a jagged gash through the foe, spitting sparks all the way along.
  sawslash: async m => {
    const fc = fc0(), S = await mvBladeIn('sawblade', '#bfe6ff', { a0: -2.3, a1: 1.0 });
    m.hit(0);
    fxRun(340, (c, k) => {
      const e = easeOut(Math.min(1, k * 2.5)), f = k > 0.6 ? (k - 0.6) / 0.4 : 0;
      const x0 = fc.x - 18, y0 = fc.y - 16, x1 = lerp(x0, fc.x + 18, e), y1 = lerp(y0, fc.y + 16, e);
      zigzag(c, lerp(x0, x1, f), lerp(y0, y1, f), x1, y1, 9, 3, '#4a6a9a', 4);
      zigzag(c, lerp(x0, x1, f), lerp(y0, y1, f), x1, y1, 9, 3, '#e8e8f0', 2);
      if (k < 0.5) particles(x1, y1, 2, { colors: ['#ffe14a', '#ffffff'], speed: 110, grav: 160, size: 1, life: 0.3 });
    });
    impact(fc, ['#ffffff', '#bfe6ff'], 10);
    await mvBladeOut(S);
  },
  // Shark Bite: great jaws snap shut on the foe, twice, and you drink in its strength.
  sharkbite: async m => {
    const H = G.hero;
    await tween(H, { ox: -4, squash: 0.12 }, 110);
    const d = mvDash(200);
    await tween(H, { ox: 44, squash: -0.06 }, 120, easeIn);
    const fc = fc0();
    const jaw = (c, y, dir) => {
      pxRect(c, fc.x - 17, y - (dir < 0 ? 5 : 0), 34, 5, MV_INK);
      pxRect(c, fc.x - 16, y - (dir < 0 ? 4 : 0), 32, 4, '#7ab0c8');
      pxRect(c, fc.x - 16, y - (dir < 0 ? 4 : -3), 32, 1, dir < 0 ? '#bfe6ff' : '#4a6a9a');
      for (let t = 0; t < 8; t++) {
        const tx = fc.x - 15 + t * 4;
        for (let r = 0; r < 4; r++) pxRect(c, tx + r * 0.5, dir < 0 ? y + r : y - 1 - r, Math.max(1, 3 - r), 1, '#ffffff');
      }
    };
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('bite');
      await fxRun(170, (c, k) => {
        const open = 18 * (1 - easeIn(k));
        c.globalAlpha = 0.5;
        mvOval(c, fc.x, fc.y, 18, open + 2, '#4a0c1a');
        c.globalAlpha = 1;
        jaw(c, fc.y - open, -1);
        jaw(c, fc.y + open, 1);
      });
      m.hit(i);
      shake(2, 120);
      impact(fc, ['#ffffff', '#7ab0c8'], 8);
      fxRun(120, c => { jaw(c, fc.y, -1); jaw(c, fc.y + 1, 1); });
      const hc = heroC();
      fxRun(420, (c, k) => {
        for (let j = 0; j < 4; j++) {
          const kk = Math.min(1, k * 1.4 - j * 0.1);
          if (kk <= 0) continue;
          pxRect(c, lerp(fc.x, hc.x, kk), lerp(fc.y, hc.y, kk) - Math.sin(kk * Math.PI) * (10 + j * 4), 2, 2, j % 2 ? '#7cff7a' : '#ffffff');
        }
      });
      await wait(110);
    }
    await d;
    await back();
  },
  // Shark Torpedo: you dive and shoot along the ground as a shark, fin first, and burst into the foe.
  sharktorpedo: async m => {
    const H = G.hero, fc = fc0(), x0 = H.x + 8;
    Sfx.play('splash');
    await tween(H, { squash: 0.2 }, 140);
    mvSplash({ x: x0, y: 118 }, 12);
    tween(H, { alpha: 0 }, 80);
    await fxRun(460, (c, k) => {
      const x = lerp(x0, fc.x, easeIn(k)), y = 108;
      for (let i = 0; i < 8; i++) pxRect(c, x - 14 - i * 5, 116 + (i % 2), 4, 1, i % 2 ? '#bfe6ff' : '#ffffff');
      for (let i = 0; i < 6; i++) pxLine(c, x - 18 - i * 4, 110 + Math.sin(G.t * 30 + i) * 2, x - 26 - i * 4, 108 + i, '#ffffff', 1);
      mvOval(c, x, y, 13, 5, MV_INK);
      mvOval(c, x, y, 12, 4, '#7ab0c8');
      mvOval(c, x + 1, y + 2, 9, 2, '#e8f4ff');
      for (let i = 0; i < 6; i++) pxRect(c, x - 4 + i, y - 10 + i, 1, 7 - i, i ? '#5a7a98' : MV_INK);
      pxLine(c, x - 12, y, x - 18, y - 5, '#5a7a98', 2); pxLine(c, x - 12, y, x - 18, y + 5, '#5a7a98', 2);
      pxRect(c, x + 7, y - 1, 1, 1, MV_INK);
      for (let t = 0; t < 3; t++) pxRect(c, x + 6 + t * 2, y + 2, 1, 1, '#ffffff');
      if (Math.random() < 0.7) particles(x - 10, 116, 1, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 60, grav: 200, dir: -Math.PI * 0.7, spread: 0.6, size: 2 });
    });
    m.hit(0);
    Sfx.play('splash');
    impact(fc, ['#ffffff', '#7ab0c8'], 14);
    mvSplash({ x: fc.x, y: 112 }, 28);
    shake(5, 300);
    await tween(H, { alpha: 1 }, 160);
  },

  // --- Golden Hook ---
  // Hook Rake: the golden hook catches the foe and yanks it in.
  hookrake: async m => {
    const F = G.battle.F, fc = fc0(), S = await mvBladeIn('goldhook', '#e6b422', { a0: 1.3, a1: -1.5, ox: 42 });
    m.hit(0);
    slashAt(fc, '#e6b422', -0.9, 36);
    impact(fc, ['#ffffff', '#e6b422'], 10);
    particles(fc.x, fc.y, 10, { colors: ['#e6b422', '#fff3a0'], speed: 60 });
    tween(F, { ox: -14, oy: -3 }, 120, easeOut).then(() => tween(F, { ox: 0, oy: 0 }, 220));
    await mvBladeOut(S);
  },
  // Desert Grip: a vortex of sand closes on the foe and your hook drinks the moisture out of it.
  desertgrip: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('fire');
    tween(H, { ox: 6, squash: 0.1 }, 160);
    await fxRun(720, (c, k) => {
      for (let i = 0; i < 26; i++) {
        const a = k * 12 + i * 0.6, r = 26 * (1 - k * 0.6) * (0.5 + (i % 4) / 6), x = fc.x + Math.cos(a) * r, y = fc.y + Math.sin(a) * r * 0.5 + (i % 5 - 2) * 4;
        pxRect(c, x, y, i % 3 ? 2 : 3, i % 3 ? 2 : 1, SAND[i % 3]);
      }
      if (k > 0.45) {
        const g = easeOut((k - 0.45) / 0.55);
        for (let f = 0; f < 3; f++) {
          const a = -1.2 + f * 1.2;
          pxLine(c, fc.x + Math.cos(a) * 22 * (1 - g), fc.y + Math.sin(a) * 22 * (1 - g), fc.x + Math.cos(a) * (8 + 14 * (1 - g)), fc.y + Math.sin(a) * (8 + 14 * (1 - g)), '#c9963b', 3);
          pxLine(c, fc.x + Math.cos(a) * 22 * (1 - g), fc.y + Math.sin(a) * 22 * (1 - g), fc.x + Math.cos(a) * (8 + 14 * (1 - g)), fc.y + Math.sin(a) * (8 + 14 * (1 - g)), '#f5d79a', 1);
        }
      }
    });
    m.hit(0);
    impact(fc, ['#f5d79a', '#e6b422'], 10);
    particles(fc.x, fc.y, 16, { colors: SAND, speed: 60, grav: 40 });
    const hc = heroC();
    fxRun(460, (c, k) => {
      for (let j = 0; j < 6; j++) {
        const kk = Math.min(1, k * 1.5 - j * 0.08);
        if (kk <= 0) continue;
        pxRect(c, lerp(fc.x, hc.x, kk), lerp(fc.y, hc.y, kk) - Math.sin(kk * Math.PI) * (8 + j * 3), 2, 2, j % 2 ? '#4fa3e0' : '#bfe6ff');
      }
    });
    await tween(H, { ox: 0, squash: 0 }, 220);
  },
  // Desert Blade: blades of sand rise out of the ground in a racing line and slice through the foe.
  desertblade: async m => {
    const H = G.hero, x0 = H.x + 12, fc = fc0();
    Sfx.play('fire');
    await tween(H, { squash: 0.15 }, 140);
    tween(H, { ox: 6, squash: -0.08 }, 100);
    await fxRun(520, (c, k) => {
      const x = lerp(x0, fc.x + 14, easeIn(k));
      for (let i = 0; i < 12; i++) {
        const hgt = Math.max(0, 34 - i * 3) * (0.8 + Math.sin(i * 1.3 + G.t * 10) * 0.2), xx = x - i * 4;
        pxRect(c, xx - 1, 121 - hgt - 1, 4, hgt + 1, '#8a6a2a');
        pxRect(c, xx, 121 - hgt, 2, hgt, SAND[i % 3]);
        pxRect(c, xx, 121 - hgt, 1, 2, '#fff3a0');
      }
      pxLine(c, x + 1, 121, x + 1, 86, '#fff3a0', 2);
      pxRect(c, x, 84, 3, 3, '#ffffff');
      if (Math.random() < 0.7) particles(x, 118, 1, { colors: SAND, speed: 60, grav: 140, dir: -Math.PI / 2, spread: 1.4 });
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { m.hit(i); slashAt(fc, '#e6b422', 1.45, 42); }
    impact(fc, ['#fff3a0', '#e6b422'], 14);
    particles(fc.x, fc.y, 24, { colors: SAND, speed: 100, grav: 80 });
    mvPuffs(fc.x, 116, 6, { cols: ['#f5d79a', '#c9963b'], speed: 40, dir: -Math.PI / 2, spread: 2.6, r0: 3, r1: 8, ms: 600, rise: 10 });
    shake(5, 300);
    await tween(H, { ox: 0, squash: 0 }, 220);
  },

  // --- Thunder Staff ---
  // Static Jab: the staff crackles as you jab, and the charge jumps into the foe.
  staticjab: async m => {
    const fc = fc0();
    Sfx.play('zap');
    const crackle = fxRun(560, c => {
      if (Math.random() < 0.5) { const t = heroHand(); mvJag(c, t.x - 6, t.y - 10, t.x + rand(-6, 10), t.y + rand(-4, 8), 3, 2, '#fff3a0', 1); }
    });
    const S = await mvJabIn('thunderstaff', '#ffe14a'), t = S.tip();
    m.hit(0);
    Sfx.play('zap');
    impact({ x: Math.min(t.x, fc.x + 4), y: t.y }, ['#ffffff', '#ffe14a'], 10);
    fxRun(300, (c, k) => {
      if (Math.floor(k * 20) % 2) return;
      for (let i = 0; i < 3; i++) mvJag(c, fc.x + rand(-4, 4), fc.y + rand(-4, 4), fc.x + rand(-18, 18), fc.y + rand(-18, 18), 4, 3, '#ffe14a', 1);
    });
    particles(fc.x, fc.y, 12, { colors: ['#fff3a0', '#ffffff'], speed: 70, grav: 0, life: 0.3 });
    await mvJabOut(S);
    await crackle;
  },
  // Lightning Lance: you level the staff and a spear of lightning leaps from its tip into the foe.
  lightninglance: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('thunderstaff', '#ffe14a');
    hold(true);
    S.smear = false;
    Sfx.play('charge');
    tween(S, { th: -0.15, dx: 2, dy: 0, arm: 2 }, 220);
    await tween(H, { ox: -4, squash: 0.14 }, 220);
    await fxRun(240, (c, k) => {
      const t = S.tip();
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 6, r = 12 * (1 - k) + 2; pxRect(c, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, 2, 2, i % 2 ? '#ffe14a' : '#ffffff'); }
      pxCircle(c, t.x, t.y, 1 + k * 3, '#fff6a0');
    });
    Sfx.play('zap');
    screenFlash('#fff6a0', 0.45);
    tween(H, { ox: -10, squash: -0.08 }, 80);
    const from = S.tip();
    let hit = false;
    await fxRun(420, (c, k) => {
      const reach = Math.min(1, k * 2.6), x = lerp(from.x, fc.x + 10, reach), y = lerp(from.y, fc.y, reach);
      if (k > 0.75 && Math.floor(k * 30) % 2) return;
      mvJag(c, from.x, from.y, x, y, 9, 5, '#ffe14a', 3);
      mvJag(c, from.x, from.y, x, y, 7, 3, '#fff6a0', 1);
      pxCircle(c, from.x, from.y, 4, '#ffffff');
      if (reach >= 1) {
        pxCircle(c, x, y, 6 + Math.sin(G.t * 40) * 2, '#ffe14a'); pxCircle(c, x, y, 4, '#ffffff');
        if (!hit) { hit = true; m.hit(0); impact(fc, ['#ffffff', '#ffe14a'], 16); }
      }
    });
    if (!hit) m.hit(0);
    particles(fc.x, fc.y, 20, { colors: ['#ffe14a', '#ffffff'], speed: 100, grav: 0 });
    ringOut(fc, '#ffe14a', 4, 24, 300, 2);
    shake(4, 260);
    S.stop(); hold(false);
    await back();
  },

  // --- Dragon Kanabo ---
  // Kanabo Smash: a two-handed blow with the iron club; a blue dragon's roar of light bursts from it.
  kanabosmash: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('kanabo', '#bfe0ff');
    hold(true);
    tween(S, { th: -2.0, dx: -2, dy: -2, arm: 8 }, 180, easeOut);
    await tween(H, { ox: -4, squash: 0.18 }, 180);
    mvGlint(S.tip(), 150, '#bfe0ff');
    const d = mvDash(300);
    await tween(H, { ox: 30, oy: -18, squash: -0.12 }, 140, easeOut);
    Sfx.play('slash');
    tween(H, { ox: 46, oy: 0, squash: 0.15 }, 110, easeIn);
    await tween(S, { th: 0.5, dx: 0, dy: 0, arm: 7 }, 110, easeIn);
    Sfx.play('boom');
    m.hit(0);
    impact(fc, ['#ffffff', '#bfe0ff'], 14);
    rays(fc, '#bfe0ff', 10, 26, 340, 0.2);
    rays(fc, '#3a3440', 5, 16, 320, 0.5);
    mvShock({ x: fc.x - 4, y: 120 }, '#bfe0ff', 34, 400);
    dust(fc.x, 14);
    shake(5, 300);
    await tween(S, { th: 0.38 }, 90);
    await wait(80);
    await d;
    S.stop(); hold(false);
    await back();
  },
  // Dragon Quake: the kanabo splits the ground and a blue dragon's head erupts beneath the foe.
  dragonquake: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('kanabo', '#bfe0ff');
    hold(true);
    tween(S, { th: -1.9, dx: -2, dy: -2, arm: 8 }, 180);
    await tween(H, { squash: 0.18 }, 180);
    Sfx.play('slash');
    tween(S, { th: 1.0, dx: 0, dy: 0, arm: 6 }, 110, easeIn);
    await tween(H, { ox: 6, squash: 0.2 }, 110, easeIn);
    Sfx.play('boom');
    const gx = H.x + H.ox + 20;
    mvShock({ x: gx, y: 120 }, '#bfe0ff', 22, 300);
    shake(4, 260);
    groundCrack(gx, fc.x + 20, '#1b1424', 380);
    await wait(320);
    const head = (c, x, y) => {
      pxRect(c, x - 8, y + 2, 16, 40, MV_INK); pxRect(c, x - 7, y + 3, 14, 40, '#4a8ad9'); pxRect(c, x - 2, y + 4, 6, 40, '#f2e6c8');
      pxCircle(c, x, y, 11, MV_INK); pxCircle(c, x, y, 10, '#4a8ad9'); pxCircle(c, x - 2, y - 3, 5, '#8ac0f0');
      pxRect(c, x + 2, y + 1, 12, 7, MV_INK); pxRect(c, x + 3, y + 2, 10, 5, '#4a8ad9'); pxRect(c, x + 3, y + 6, 10, 1, '#f2e6c8');
      for (let t = 0; t < 4; t++) pxRect(c, x + 4 + t * 2, y + 7, 1, 2, '#ffffff');
      pxRect(c, x + 1, y - 4, 3, 2, '#ffe14a'); pxRect(c, x + 2, y - 4, 1, 1, '#c8202a');
      pxLine(c, x - 4, y - 8, x - 12, y - 18, '#f2e6c8', 2); pxLine(c, x + 2, y - 9, x - 3, y - 20, '#f2e6c8', 2);
      pxLine(c, x - 9, y + 2, x - 16, y + 8, '#ffffff', 1); pxLine(c, x - 9, y - 1, x - 18, y - 2, '#ffffff', 1);
    };
    let hit = false;
    await fxRun(480, (c, k) => {
      const y = lerp(134, fc.y - 8, easeOut(Math.min(1, k * 1.6)));
      head(c, fc.x - 2, y);
      if (!hit && k >= 0.5) { hit = true; m.hit(0); impact(fc, ['#ffffff', '#4a8ad9'], 16); Sfx.play('boom'); }
    });
    if (!hit) m.hit(0);
    for (let i = 0; i < 3; i++) particles(fc.x - 10 + i * 10, 120, 4, { colors: ['#5a4a3a', '#8a7a5a', '#c9b88a'], speed: 120, grav: 240, dir: -Math.PI / 2, spread: 0.8, size: 3 });
    particles(fc.x, fc.y, 24, { colors: ['#4a8ad9', '#bfe0ff', '#ffffff'], speed: 100 });
    shake(6, 420);
    fxRun(220, (c, k) => { c.globalAlpha = 1 - k; head(c, fc.x - 2, fc.y - 8 + k * 30); c.globalAlpha = 1; });
    await wait(200);
    S.stop(); hold(false);
    await back();
  },
  // Emperor's Wrath: Conqueror's lightning splits a black sky, and a colossal kanabo falls on the foe.
  emperorwrath: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('kanabo'));
    Sfx.play('haki');
    hold(true);
    const sky = fxRun(1700, (c, k) => {
      const a = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      c.globalAlpha = 0.55 * a;
      pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#1b0010');
      c.globalAlpha = 1;
      if (k < 0.8 && Math.random() < 0.35) mvJag(c, rand(VIEW.x, VIEW.x + VIEW.w), VIEW.y, rand(VIEW.x, VIEW.x + VIEW.w), rand(40, 110), 6, 6, Math.random() < 0.5 ? '#9a2040' : '#1b1424', 1);
    });
    const aura = fxRun(560, c => {
      const hc = heroC();
      for (let i = 0; i < 2; i++) mvJag(c, hc.x + rand(-14, 14), hc.y - 20, hc.x + rand(-14, 14), hc.y + 18, 4, 4, Math.random() < 0.5 ? '#9a2040' : '#1b1424', 1);
    });
    await tween(H, { squash: 0.22 }, 300);
    await tween(H, { oy: -6, squash: -0.15 }, 160, easeOut);
    await aura;
    let hit = false;
    await fxRun(360, (c, k) => {
      const e = easeIn(Math.min(1, k / 0.85)), y = lerp(VIEW.y - 40, fc.y - 10, e);
      c.globalAlpha = 0.3 * (1 - k);
      mvOval(c, fc.x, 121, 8 + 22 * e, 3, '#000000');
      c.globalAlpha = 1;
      for (let j = 3; j >= 1; j--) { c.globalAlpha = 0.18 * (4 - j); drawRot(c, img, fc.x, y - j * 14, 0.3, 6); }
      c.globalAlpha = 1;
      drawRot(c, img, fc.x, y, 0.3, 6);
      if (!hit && k >= 0.85) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 0.9);
    focusLines(fc, '#9a2040', 420);
    fxRun(300, (c, k) => drawRot(c, img, fc.x, fc.y - 10 + k * 4, 0.3, 6));
    mvBlast(fc, 20, 420, ['#1b1424', '#9a2040', '#ff5a5a', '#ffffff']);
    for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#9a2040' : '#ffffff', 2, 34 + i * 20, 600, 2);
    mvShock({ x: fc.x, y: 120 }, '#9a2040', 60, 560, 3);
    groundCrack(fc.x - 8, fc.x - 64, '#1b1424', 360);
    groundCrack(fc.x + 8, fc.x + 64, '#1b1424', 360);
    shake(10, 760);
    await tween(H, { oy: 0, squash: 0 }, 160);
    await wait(320);
    hold(false);
    await sky;
  },

  // --- Meito Katana ---
  // Shigure Draw: a glint, and you are already past the foe; the cut only shows as you sheathe.
  shigure: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('katana', '#c8b0ff');
    hold(true);
    tween(S, { th: 2.6, dx: 0, dy: 4, arm: 5 }, 160);
    await tween(H, { ox: -3, squash: 0.18 }, 160);
    mvGlint({ x: H.x + H.ox + 6, y: 106 }, 160, '#c8b0ff');
    await wait(140);
    Sfx.play('slash');
    const xa = H.x + H.ox + 10;
    S.th = -0.1; S.tr = 2.6;
    await tween(H, { ox: 108, squash: -0.1 }, 70, easeIn);
    fxRun(260, (c, k) => {
      c.globalAlpha = 1 - k;
      pxLine(c, xa, 104, H.x + H.ox, 104, '#c8b0ff', 3);
      pxLine(c, xa, 104, H.x + H.ox, 104, '#ffffff', 1);
      c.globalAlpha = 1;
    });
    await tween(S, { th: -1.4 }, 160);
    await wait(120);
    m.hit(0);
    Sfx.play('slash');
    slashAt(fc, '#c8b0ff', -0.12, 52);
    fxRun(240, (c, k) => {
      const f = 1 - k;
      pxLine(c, fc.x - 26, fc.y + 3, fc.x + 26, fc.y - 3, '#ffffff', Math.max(1, Math.round(3 * f)));
    });
    impact(fc, ['#ffffff', '#c8b0ff'], 12);
    particles(fc.x, fc.y, 10, { colors: ['#c8b0ff', '#ffffff'], speed: 50, grav: 0 });
    await wait(100);
    S.stop(); hold(false);
    await back(280);
  },
  // Twin Moon Flash: two crescent moons, violet then white, carve round the foe.
  twinmoon: async m => {
    const fc = fc0(), S = await mvBladeIn('katana', '#c8b0ff', { a0: -2.4, a1: 0.8, ox: 40, swing: 140 });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const col = i ? '#ffffff' : '#c8b0ff';
      if (i) {
        await S.swing;
        Sfx.play('slash');
        S.dir = -1;
        S.swing = tween(S, { th: -2.4 }, 140, easeOut);
      }
      await arcSweep(fc.x, fc.y, 18, i ? 0.6 : -2.5, i ? 3.7 : 0.6, col, 170, 4);
      m.hit(i);
      impact({ x: fc.x + (i ? -10 : 10), y: fc.y + (i ? 8 : -8) }, ['#ffffff', '#c8b0ff'], 8);
    }
    ringOut(fc, '#c8b0ff', 6, 22, 260, 1);
    await mvBladeOut(S);
  },
  // Lion Song: a blink-fast draw through the foe; a heartbeat later the cut roars open.
  lionsong: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('katana', '#c8b0ff');
    hold(true);
    Sfx.play('charge');
    tween(S, { th: 2.7, dx: 0, dy: 4, arm: 5 }, 200);
    await tween(H, { ox: -4, squash: 0.2 }, 200);
    await fxRun(260, (c, k) => {
      const p = S.pivot();
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 2, r = 22 * (1 - k) + 4; pxLine(c, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.x + Math.cos(a) * (r + 4), p.y + Math.sin(a) * (r + 4), i % 2 ? '#c8b0ff' : '#ffffff', 1); }
    });
    mvGlint({ x: H.x + H.ox + 8, y: 106 }, 140, '#ffffff');
    await wait(120);
    Sfx.play('slash');
    const xa = H.x + H.ox + 10;
    S.th = -0.4; S.tr = 2.7;
    await tween(H, { ox: 118, squash: -0.12 }, 110, easeIn);
    fxRun(420, (c, k) => {
      c.globalAlpha = 1 - k * k;
      pxLine(c, xa, 102, H.x + 104, 106, '#c8b0ff', 4);
      pxLine(c, xa, 102, H.x + 104, 106, '#ffffff', 2);
      c.globalAlpha = 1;
    });
    await tween(S, { th: -1.5 }, 180);
    await wait(200);
    Sfx.play('crit');
    m.hit(0);
    screenFlash('#ffffff', 0.6);
    focusLines(fc, '#c8b0ff', 320);
    slashAt(fc, '#c8b0ff', 0.4, 56);
    slashAt(fc, '#ffffff', 0.45, 44);
    impact(fc, ['#ffffff', '#c8b0ff'], 16);
    particles(fc.x, fc.y, 18, { colors: ['#c8b0ff', '#ffffff', '#ffe14a'], speed: 100 });
    shake(5, 300);
    await wait(120);
    S.stop(); hold(false);
    await back(320);
  },

  // --- Seastone Jitte ---
  // Jitte Jab: a seastone-tipped jab that saps the foe's strength in a grey shimmer.
  jittejab: async m => {
    const fc = fc0(), S = await mvJabIn('jitte', '#9ab0c8'), t = S.tip(), p = { x: Math.min(t.x, fc.x + 4), y: t.y };
    m.hit(0);
    impact(p, ['#ffffff', '#9ab0c8'], 10);
    rays(p, '#5a6a7a', 6, 16, 240, 0.25);
    particles(fc.x, fc.y, 10, { colors: ['#9ab0c8', '#5a6a7a', '#ffffff'], speed: 60, grav: 40 });
    await mvJabOut(S);
  },
  // Seastone Pin: you leap and drive the jitte down; a seastone ring clamps shut round the foe.
  seastonepin: async m => {
    const H = G.hero, F = G.battle.F, fc = fc0(), S = mvHeld('jitte', '#9ab0c8');
    hold(true);
    tween(S, { th: -1.7, dx: 0, dy: 0, arm: 6 }, 160);
    await tween(H, { ox: 30, oy: -24, squash: -0.1 }, 220, easeOut);
    Sfx.play('slash');
    tween(S, { th: 1.2 }, 110, easeIn);
    await tween(H, { ox: 48, oy: 0, squash: 0.15 }, 110, easeIn);
    Sfx.play('boom');
    m.hit(0);
    impact(fc, ['#ffffff', '#9ab0c8'], 12);
    fxRun(640, (c, k) => {
      const r = k < 0.3 ? lerp(26, 14, easeOut(k / 0.3)) : 14 + Math.sin(k * 30) * (1 - k);
      mvOvalRing(c, fc.x, fc.y + 4, r, r * 0.45, MV_INK, 4);
      mvOvalRing(c, fc.x, fc.y + 4, r, r * 0.45, '#5a6a7a', 2);
      mvOvalRing(c, fc.x, fc.y + 3, r, r * 0.45, '#9ab0c8', 1);
    });
    tween(F, { squash: 0.25 }, 100).then(() => tween(F, { squash: 0 }, 300));
    shake(3, 200);
    await wait(260);
    S.stop(); hold(false);
    await back();
  },
  // White Out: billows of smoke roll in from every side and swallow the foe in white.
  whiteout: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('fire');
    tween(H, { ox: 6, squash: 0.12 }, 200);
    const P = Array.from({ length: 22 }, (_, i) => ({ a: i * 0.9 + rand(-0.3, 0.3), r: rand(4, 7), d: rand(55, 80) }));
    await fxRun(680, (c, k) => {
      for (const p of P) {
        const e = easeOut(k), a = p.a + k * 2, r = p.d * (1 - e) + 8, x = fc.x + Math.cos(a) * r, y = fc.y + Math.sin(a) * r * 0.6;
        pxCircle(c, x, y, p.r + 1 + e * 2, '#b9bdc9');
        pxCircle(c, x - 1, y - 1, p.r + e * 2, '#dfe2ea');
        pxCircle(c, x - 2, y - 2, (p.r + e * 2) * 0.5, '#ffffff');
      }
    });
    m.hit(0);
    Sfx.play('boom');
    fxRun(460, (c, k) => { c.globalAlpha = 0.85 * (1 - k); pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#ffffff'); c.globalAlpha = 1; });
    mvPuffs(fc.x, fc.y, 10, { cols: ['#ffffff', '#dfe2ea'], speed: 50, r0: 5, r1: 10, ms: 700, rise: 6 });
    shake(4, 300);
    await tween(H, { ox: 0, squash: 0 }, 220);
  },

  // --- Frost Mallet ---
  // Frost Smash: the mallet comes down and a flower of ice crystals bursts out of the foe.
  frostsmash: async m => {
    const H = G.hero, fc = fc0(), S = mvHeld('frostmallet', '#bff2ff');
    hold(true);
    tween(S, { th: -1.9, dx: -2, dy: -2, arm: 8 }, 160);
    await tween(H, { ox: -3, squash: 0.16 }, 160);
    const d = mvDash(260);
    await tween(H, { ox: 32, oy: -12, squash: -0.1 }, 130, easeOut);
    Sfx.play('slash');
    tween(H, { ox: 46, oy: 0, squash: 0.12 }, 100, easeIn);
    await tween(S, { th: 0.5, dx: 0, dy: 0, arm: 7 }, 100, easeIn);
    Sfx.play('ice');
    m.hit(0);
    impact(fc, ['#ffffff', '#bff2ff'], 12);
    fxRun(420, (c, k) => {
      const e = easeOut(Math.min(1, k * 3)), f = k > 0.7 ? (1 - k) / 0.3 : 1;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3, L = (8 + (i % 2) * 6) * e * f;
        const x1 = fc.x + Math.cos(a) * L, y1 = fc.y + Math.sin(a) * L;
        pxLine(c, fc.x, fc.y, x1, y1, '#5fd3f0', 4);
        pxLine(c, fc.x, fc.y, x1, y1, '#bff2ff', 2);
        pxLine(c, fc.x, fc.y, lerp(fc.x, x1, 0.6), lerp(fc.y, y1, 0.6), '#ffffff', 1);
      }
    });
    for (let i = 0; i < 8; i++) { const a = -Math.PI + i * Math.PI / 7; particles(fc.x + Math.cos(a) * 8, fc.y + Math.sin(a) * 8, 1, { colors: ICE, speed: 90, grav: 160, size: 3 }); }
    dust(fc.x, 8);
    shake(3, 200);
    await wait(120);
    await d;
    S.stop(); hold(false);
    await back();
  },
  // Snowslide: a rolling wall of snow sweeps across the field and buries the foe.
  snowslide: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('ice');
    tween(H, { ox: 6, squash: 0.12 }, 140);
    let hit = false;
    await fxRun(660, (c, k) => {
      const x = lerp(VIEW.x - 10, fc.x + 16, easeIn(Math.min(1, k / 0.8)));
      for (let i = 0; i < 12; i++) {
        const xx = x - i * 8, hgt = 30 - Math.abs(i - 3) * 2.5 + Math.sin(i * 1.7 + G.t * 9) * 3;
        if (hgt <= 0) continue;
        pxCircle(c, xx, 121 - hgt * 0.5, hgt * 0.5 + 1, '#9ad8f0');
        pxCircle(c, xx - 1, 120 - hgt * 0.5, hgt * 0.5, '#e8f6ff');
        pxCircle(c, xx - 3, 118 - hgt * 0.6, hgt * 0.25, '#ffffff');
      }
      if (Math.random() < 0.8) particles(x + 4, rand(96, 118), 1, { colors: ['#ffffff', '#bff2ff'], speed: 70, grav: 80, dir: -0.4, spread: 1, size: 2 });
      if (!hit && k >= 0.8) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    impact(fc, ['#ffffff', '#bff2ff'], 12);
    particles(fc.x, fc.y, 20, { colors: ['#ffffff', '#bff2ff'], speed: 80, grav: 80 });
    mvPuffs(fc.x, fc.y + 6, 8, { cols: ['#ffffff', '#bff2ff'], speed: 40, r0: 4, r1: 9, ms: 640, rise: 4 });
    shake(3, 240);
    await tween(H, { ox: 0, squash: 0 }, 220);
  },
  // Avalanche Drop: a snowball the size of a house falls out of the sky and bursts over the foe.
  avalanche: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('charge');
    await tween(H, { squash: 0.2 }, 200);
    tween(H, { squash: -0.1 }, 120).then(() => tween(H, { squash: 0 }, 160));
    await dropOn(fc, 480, (c, x, y, k) => {
      const r = 22, spin = k * 8;
      pxCircle(c, x, y - 4, r + 1, '#5fa8d0');
      pxCircle(c, x, y - 4, r, '#e8f6ff');
      pxCircle(c, x - 6, y - 10, 10, '#ffffff');
      for (let i = 0; i < 4; i++) { const a = spin + i * 1.57; pxRect(c, x + Math.cos(a) * 13, y - 4 + Math.sin(a) * 13, 3, 2, '#bfe6ff'); }
    });
    Sfx.play('boom');
    m.hit(0);
    screenFlash('#ffffff', 0.6);
    impact(fc, ['#ffffff', '#bff2ff'], 16);
    particles(fc.x, fc.y, 36, { colors: ['#ffffff', '#bff2ff', '#9ad8f0'], speed: 140, grav: 160, size: 3 });
    mvPuffs(fc.x, fc.y + 4, 12, { cols: ['#ffffff', '#dfeff8'], speed: 70, r0: 5, r1: 12, ms: 760, rise: 4 });
    mvShock({ x: fc.x, y: 120 }, '#bff2ff', 50, 480);
    shake(7, 500);
    await wait(260);
  },

  // --- Royal Scepter ---
  // Royal Decree: a crack of the scepter, and a golden crown slams down on the foe's head.
  royaldecree: async m => {
    const fc = fc0(), F = G.battle.F, S = await mvBladeIn('scepter', '#ffe14a', { a0: -2.0, a1: 0.9, ox: 44 });
    m.hit(0);
    Sfx.play('coin');
    impact(fc, ['#ffffff', '#ffe14a'], 10);
    const top = foeTop();
    fxRun(560, (c, k) => {
      const y = k < 0.3 ? lerp(top - 34, top - 6, easeIn(k / 0.3)) : top - 6 - Math.sin((k - 0.3) * 8) * 2 * (1 - k);
      const x = fc.x - 7;
      pxRect(c, x - 1, y - 1, 16, 7, MV_INK);
      pxRect(c, x, y, 14, 5, '#e6b422');
      for (let i = 0; i < 3; i++) { pxRect(c, x + i * 6 - 1, y - 5, 4, 5, MV_INK); pxRect(c, x + i * 6, y - 4, 2, 4, '#e6b422'); pxRect(c, x + i * 6, y - 4, 1, 1, '#fff3a0'); }
      pxRect(c, x, y, 14, 1, '#fff3a0');
      pxRect(c, x + 6, y + 2, 2, 2, '#d63c2f');
      if (k > 0.3 && k < 0.36) for (let i = 0; i < 3; i++) mvStar(c, x - 4 + i * 11, y - 8, 3, '#fff3a0');
    });
    setTimeout(() => { if (G.battle) { tween(F, { squash: 0.15 }, 80).then(() => tween(F, { squash: 0 }, 180)); particles(fc.x, top - 6, 14, { colors: ['#ffe14a', '#e6b422', '#ffffff'], speed: 80, grav: 120 }); } }, 170);
    await mvBladeOut(S);
  },
  // Tin Plate Barrage: tin plates fly from your hand like spinning discs.
  tinbarrage: async m => {
    const H = G.hero, fc = fc0();
    const plate = (c, x, y, a) => {
      const w = Math.max(1, Math.abs(Math.cos(a)) * 6);
      mvOval(c, x, y, w + 1, 5, MV_INK);
      mvOval(c, x, y, w, 4, '#c9ccd6');
      mvOval(c, x, y, Math.max(1, w - 2), 2, '#eef0f4');
      pxRect(c, x - 1, y - 3, 1, 1, '#ffffff');
    };
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('slash');
      H.squash = i % 2 ? 0.08 : -0.06;
      const h = heroHand(), from = { x: h.x, y: h.y - 6 + i * 5 }, to = { x: fc.x + rand(-4, 4), y: fc.y - 8 + i * 7 };
      await fxRun(170, (c, k) => {
        for (let j = 2; j >= 0; j--) {
          const kk = Math.max(0, k - j * 0.08);
          c.globalAlpha = j ? 0.25 : 1;
          plate(c, lerp(from.x, to.x, kk), lerp(from.y, to.y, kk) - Math.sin(kk * Math.PI) * 8, kk * 14);
        }
        c.globalAlpha = 1;
      });
      m.hit(i);
      impact(to, ['#c9ccd6', '#ffffff'], 6);
      particles(to.x, to.y, 4, { colors: ['#c9ccd6', '#ffffff'], speed: 70, grav: 160, size: 1 });
    }
    await tween(H, { squash: 0 }, 160);
  },
  // Kingdom Crusher: a whole golden castle drops out of the sky onto the foe.
  kingdomcrusher: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('charge');
    await tween(H, { squash: 0.18 }, 200);
    tween(H, { squash: -0.1 }, 120).then(() => tween(H, { squash: 0 }, 160));
    const castle = (c, x, y) => {
      pxRect(c, x - 25, y - 15, 50, 22, MV_INK);
      for (let i = 0; i < 5; i++) pxRect(c, x - 25 + i * 11, y - 25, 6, 12, MV_INK);
      pxRect(c, x - 24, y - 14, 48, 20, '#e6b422');
      for (let i = 0; i < 5; i++) { pxRect(c, x - 24 + i * 11, y - 24, 4, 11, '#e6b422'); pxRect(c, x - 24 + i * 11, y - 24, 4, 1, '#fff3a0'); }
      pxRect(c, x - 24, y - 14, 48, 2, '#fff3a0');
      pxRect(c, x - 24, y + 4, 48, 2, '#b07a10');
      pxRect(c, x - 4, y - 4, 8, 10, '#7a4a10');
      pxRect(c, x - 3, y - 6, 6, 2, '#7a4a10');
      for (let i = 0; i < 3; i++) pxRect(c, x - 16 + i * 14 - (i === 1 ? 0 : 0), y - 9, 3, 3, '#d63c2f');
      pxRect(c, x + 12, y - 38, 1, 14, MV_INK); pxRect(c, x + 13, y - 38, 7, 5, '#d63c2f');
    };
    await dropOn({ x: fc.x, y: fc.y + 2 }, 480, castle);
    Sfx.play('boom');
    m.hit(0);
    screenFlash('#fff3a0', 0.6);
    fxRun(260, (c, k) => castle(c, fc.x, fc.y + 2 + k * 3));
    impact(fc, ['#fff3a0', '#e6b422'], 16);
    particles(fc.x, fc.y, 30, { colors: ['#e6b422', '#fff3a0', '#d63c2f'], speed: 130, grav: 120 });
    mvPuffs(fc.x, 118, 8, { cols: ['#efe4c4', '#c9b88a'], speed: 60, dir: -Math.PI / 2, spread: 3, r0: 4, r1: 9, ms: 640, rise: 6 });
    mvShock({ x: fc.x, y: 120 }, '#e6b422', 54, 500, 3);
    shake(8, 520);
    await wait(260);
  },

  // --- Circus Knives ---
  // Knife Toss: a flick of the wrist and three knives thud into the foe in a neat row.
  knifetoss: async m => {
    const H = G.hero, fc = fc0(), knife = mvKnife();
    await tween(H, { ox: -3, squash: 0.12 }, 110);
    mvGlint({ x: heroHand().x, y: heroHand().y - 8 }, 120);
    tween(H, { ox: 6, squash: -0.08 }, 90);
    Sfx.play('slash');
    const h = heroHand(), T = [{ x: fc.x - 7, y: fc.y - 10 }, { x: fc.x - 9, y: fc.y }, { x: fc.x - 7, y: fc.y + 10 }];
    const fly = T.map((t, i) => {
      const from = { x: h.x, y: h.y - 6 + i * 4 }, a = Math.atan2(t.y - from.y, t.x - from.x);
      return wait(i * 60).then(() => fxRun(160, (c, k) => {
        const x = lerp(from.x, t.x, k), y = lerp(from.y, t.y, k);
        pxLine(c, x - Math.cos(a) * 18, y - Math.sin(a) * 18, x - Math.cos(a) * 5, y - Math.sin(a) * 5, '#ffffff', 1);
        drawRot(c, knife, x, y, a + Math.PI / 2, 2);
      })).then(() => { Sfx.play('hit'); particles(t.x, t.y, 4, { colors: ['#ffffff', '#e8e8f0'], speed: 50, grav: 60, size: 1 }); });
    });
    await fly[0];
    m.hit(0);
    impact(fc, ['#e8e8f0', '#d63c2f'], 10);
    await Promise.all(fly);
    fxRun(300, (c, k) => {
      if (k > 0.7 && Math.floor(k * 30) % 2) return;
      for (const t of T) drawRot(c, knife, t.x + 3, t.y, Math.PI / 2 + 0.2, 2);
    });
    await tween(H, { ox: 0, squash: 0 }, 200);
  },
  // Blade Fan: seven knives fan out wide and converge on the foe from every angle.
  bladefan: async m => {
    const H = G.hero, fc = fc0(), knife = mvKnife();
    await tween(H, { ox: -3, squash: 0.14 }, 120);
    Sfx.play('slash');
    tween(H, { ox: 5, squash: -0.08 }, 90);
    const h = heroHand();
    const K = Array.from({ length: 7 }, (_, i) => ({ a: -0.9 + i * 0.3, t: { x: fc.x - 6 + rand(-4, 4), y: fc.y - 12 + i * 4 } }));
    await fxRun(360, (c, k) => {
      for (const q of K) {
        const p0 = { x: h.x, y: h.y - 4 }, p1 = { x: h.x + 34, y: h.y - 4 + Math.sin(q.a) * 46 }, e = easeIn(k);
        const u = 1 - e, x = u * u * p0.x + 2 * u * e * p1.x + e * e * q.t.x, y = u * u * p0.y + 2 * u * e * p1.y + e * e * q.t.y;
        const dx = 2 * u * (p1.x - p0.x) + 2 * e * (q.t.x - p1.x), dy = 2 * u * (p1.y - p0.y) + 2 * e * (q.t.y - p1.y), a = Math.atan2(dy, dx);
        pxLine(c, x - Math.cos(a) * 12, y - Math.sin(a) * 12, x - Math.cos(a) * 4, y - Math.sin(a) * 4, '#ffffff', 1);
        drawRot(c, knife, x, y, a + Math.PI / 2, 2);
      }
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      m.hit(i);
      impact({ x: fc.x + rand(-6, 6), y: fc.y + rand(-10, 10) }, ['#ffffff', '#d63c2f'], 6);
      await wait(60);
    }
    fxRun(260, (c, k) => { if (k > 0.7 && Math.floor(k * 30) % 2) return; for (const q of K) drawRot(c, knife, q.t.x + 3, q.t.y, Math.PI / 2 + 0.15, 2); });
    await tween(H, { ox: 0, squash: 0 }, 200);
  },
  // Grand Finale: fireworks burst overhead and a rain of knives comes down on the foe.
  grandfinale: async m => {
    const H = G.hero, fc = fc0(), knife = mvKnife();
    Sfx.play('win');
    await tween(H, { squash: 0.15 }, 160);
    tween(H, { oy: -6, squash: -0.1 }, 140).then(() => tween(H, { oy: 0, squash: 0 }, 200));
    const cols = ['#ff5a5a', '#ffd04a', '#7cd0ff', '#7cff7a'];
    for (let i = 0; i < 3; i++) {
      const p = { x: fc.x - 50 + i * 50, y: 22 + (i % 2) * 14 };
      wait(i * 120).then(() => {
        if (!G.battle) return;
        Sfx.play('shot');
        particles(p.x, p.y, 18, { colors: [cols[i], cols[(i + 1) % 4], '#ffffff'], speed: 70, grav: 30, life: 0.7 });
        ringOut(p, cols[i], 2, 14, 360, 1);
      });
    }
    const R = Array.from({ length: 12 }, (_, i) => ({ x: fc.x - 28 + i * 5 + rand(-2, 2), d: (i % 4) * 0.08 + rand(0, 0.05) }));
    let hit = false;
    await fxRun(620, (c, k) => {
      for (const q of R) {
        const kk = Math.min(1, Math.max(0, (k - q.d) / 0.6));
        const y = lerp(VIEW.y - 10, fc.y + 2, easeIn(kk));
        if (kk < 1) pxLine(c, q.x, y - 16, q.x, y - 6, '#ffffff', 1);
        drawRot(c, knife, q.x, y, Math.PI, 2);
      }
      if (!hit && k >= 0.62) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    impact(fc, ['#ffffff', '#ffd04a'], 16);
    particles(fc.x, fc.y, 30, { colors: cols, speed: 110, grav: 90 });
    particles(fc.x, fc.y - 20, 16, { colors: cols, speed: 40, grav: 40, life: 0.9, size: 1 });
    shake(4, 300);
    await wait(200);
  },

  // --- Hypno Chakram ---
  // Ring Toss: the chakram sails out in a curve, bites the foe and swings back to your hand.
  ringtoss: async m => {
    const H = G.hero, img = getSprite(weaponSpec('chakram')), fc = fc0();
    await tween(H, { ox: -3, squash: 0.12 }, 110);
    hold(true);
    Sfx.play('slash');
    tween(H, { ox: 5, squash: -0.08 }, 90);
    const h = heroHand();
    const path = (k, up) => ({ x: lerp(h.x, fc.x, Math.sin(k * Math.PI / 2)), y: lerp(h.y - 4, fc.y, k) - Math.sin(k * Math.PI) * (up ? 26 : -12) });
    const fly = (ms, up, rev) => fxRun(ms, (c, k) => {
      for (let j = 3; j >= 0; j--) {
        const kk = Math.max(0, k - j * 0.06), p = path(rev ? 1 - kk : kk, up);
        c.globalAlpha = j ? 0.18 * (4 - j) : 1;
        drawRot(c, img, p.x, p.y, kk * 16, 2);
      }
      c.globalAlpha = 1;
      const p = path(rev ? 1 - k : k, up);
      mvSmear(c, p.x, p.y, 7, G.t * 30 - 2, G.t * 30, 2, '#c94a9a');
    });
    await fly(240, true, false);
    m.hit(0);
    impact(fc, ['#ffffff', '#c94a9a'], 10);
    ringOut(fc, '#c94a9a', 4, 16, 220, 1);
    await fly(240, false, true);
    hold(false);
    await tween(H, { ox: 0, squash: 0 }, 160);
  },
  // Hypnotize: the chakram swings like a pendulum and spirals of light pull the foe's eyes in.
  hypnotize: async m => {
    const H = G.hero, fc = fc0(), h = heroHand(), img = getSprite(weaponSpec('chakram'));
    Sfx.play('charge');
    hold(true);
    await fxRun(760, (c, k) => {
      const sw = Math.sin(k * 16) * 0.7, px = h.x + 2, py = h.y - 22;
      pxLine(c, px, py, px + Math.sin(sw) * 16, py + Math.cos(sw) * 16, '#e8e8f0', 1);
      drawRot(c, img, px + Math.sin(sw) * 18, py + Math.cos(sw) * 18, sw, 2);
      for (let i = 0; i < 4; i++) {
        const r = ((k * 40 + i * 6) % 22) + 2;
        mvOvalRing(c, fc.x, fc.y - 6, r, r * 0.8, i % 2 ? '#c94a9a' : '#ffffff', 1);
      }
      for (let i = 0; i < 10; i++) {
        const a = i * 0.6 + G.t * 6, r = 4 + i * 2;
        pxRect(c, fc.x + Math.cos(a) * r, fc.y - 6 + Math.sin(a) * r * 0.8, 1, 1, '#ffd0f0');
      }
    });
    m.hit(0);
    Sfx.play('sleep');
    floatText(fc.x + 10, foeTop() - 8, 'ZZZ', '#c94a9a');
    ringOut({ x: fc.x, y: fc.y - 6 }, '#c94a9a', 4, 20, 300, 2);
    hold(false);
    await tween(H, { squash: 0 }, 100);
  },
  // Ring Storm: four chakrams whirl round the foe, slicing on every pass.
  ringstorm: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('chakram'));
    Sfx.play('slash');
    await tween(H, { ox: -3, squash: 0.14 }, 120);
    hold(true);
    tween(H, { ox: 4, squash: -0.08 }, 100);
    const h = heroHand(), T = 170 * m.hits + 300;
    const orbit = fxRun(T, (c, k) => {
      const gather = Math.min(1, k * T / 220), leave = k > 0.85 ? (k - 0.85) / 0.15 : 0;
      for (let i = 0; i < 4; i++) {
        const a = k * 16 + i * Math.PI / 2, ox = fc.x + Math.cos(a) * 22, oy = fc.y + Math.sin(a) * 13;
        const x = lerp(lerp(h.x, ox, gather), h.x, leave), y = lerp(lerp(h.y - 6, oy, gather), h.y - 6, leave);
        mvSmear(c, fc.x, fc.y, 22, a - 0.8, a, 2, '#c94a9a');
        drawRot(c, img, x, y, a * 2, 2);
      }
    });
    await wait(220);
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      await wait(170);
      Sfx.play('slash');
      m.hit(i);
      slashAt({ x: fc.x + rand(-6, 6), y: fc.y + rand(-6, 6) }, '#c94a9a', rand(-1.2, 1.2), 22);
      impact({ x: fc.x + rand(-10, 10), y: fc.y + rand(-8, 8) }, ['#ffffff', '#c94a9a'], 5);
    }
    await orbit;
    hold(false);
    await tween(H, { ox: 0, squash: 0 }, 160);
  },

  // --- Chef's Cleaver ---
  // Chop: a downward chop like splitting a melon - and a little salad goes flying.
  cleaverchop: async m => {
    const fc = fc0(), S = await mvBladeIn('cleaver', '#e8e8f0', { a0: -1.75, a1: 1.3, oy: -10, back: 0.4 });
    m.hit(0);
    slashAt(fc, '#e8e8f0', Math.PI / 2, 40);
    impact(fc, ['#ffffff', '#e8e8f0'], 10);
    particles(fc.x, fc.y + 8, 10, { colors: ['#7cff7a', '#ff9a3a', '#ff5a5a', '#ffffff'], speed: 80, grav: 200, dir: -Math.PI / 2, spread: 2.2, size: 2 });
    shake(2, 140);
    await mvBladeOut(S);
  },
  // Mince: a blur of chops on a chopping-board rhythm.
  mince: async m => {
    const H = G.hero, S = await mvBladeIn('cleaver', '#e8e8f0', { a0: -1.6, a1: 0.9, swing: 90 });
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      if (i) {
        await S.swing;
        S.th = -1.6; S.tr = -1.6;
        Sfx.play('slash');
        S.swing = tween(S, { th: 0.9 }, 80, easeIn);
        H.oy = i % 2 ? -3 : 0;
        await wait(50);
      }
      const x = fc.x - 12 + (i % 4) * 8;
      fxRun(160, (c, k) => {
        const e = easeOut(Math.min(1, k * 2.5)), f = 1 - k;
        pxLine(c, x, fc.y - 18, x, lerp(fc.y - 18, fc.y + 16, e), '#4a5060', 3);
        pxLine(c, x, fc.y - 18, x, lerp(fc.y - 18, fc.y + 16, e), f > 0.5 ? '#ffffff' : '#e8e8f0', 1);
      });
      m.hit(i);
      particles(x, fc.y, 3, { colors: ['#7cff7a', '#ffffff'], speed: 60, grav: 200, size: 1 });
    }
    H.oy = 0;
    await mvBladeOut(S);
  },
  // Grand Cleave: you hurl the cleaver up and it comes down giant-sized, splitting the foe.
  grandcleave: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('cleaver'));
    await tween(H, { squash: 0.18 }, 160);
    hold(true);
    Sfx.play('stretch');
    tween(H, { oy: -6, squash: -0.12 }, 120).then(() => tween(H, { oy: 0, squash: 0 }, 200));
    await spinThrow(img, heroHand(), { x: heroHand().x + 20, y: VIEW.y - 20 }, 220, 2, 2, 0);
    mvGlint({ x: fc.x, y: VIEW.y + 16 }, 160);
    await wait(120);
    Sfx.play('slash');
    let hit = false;
    await fxRun(320, (c, k) => {
      const e = easeIn(Math.min(1, k / 0.85)), y = lerp(VIEW.y - 30, fc.y - 6, e);
      c.globalAlpha = 0.3 * e;
      mvOval(c, fc.x, 121, 6 + 18 * e, 2, '#000000');
      for (let j = 3; j >= 1; j--) { c.globalAlpha = 0.18 * (4 - j); drawRot(c, img, fc.x, y - j * 14, 0, 6); }
      c.globalAlpha = 1;
      drawRot(c, img, fc.x, y, 0, 6);
      if (!hit && k >= 0.85) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 0.6);
    fxRun(240, (c, k) => drawRot(c, img, fc.x, fc.y - 6 + k * 3, 0, 6));
    slashAt(fc, '#ffffff', Math.PI / 2, 64);
    impact(fc, ['#ffffff', '#e8e8f0'], 16);
    groundCrack(fc.x, fc.x - 40, '#3a3440', 300);
    groundCrack(fc.x, fc.x + 40, '#3a3440', 300);
    particles(fc.x, fc.y, 16, { colors: ['#7cff7a', '#ff9a3a', '#ffffff'], speed: 110, grav: 200 });
    shake(6, 420);
    await wait(260);
    hold(false);
    await back();
  },

  // --- Buggy Cannon ---
  // Cannon Shot: brace, light the fuse, BOOM - a smoking cannonball and a fiery blast.
  cannonshot: async m => {
    const H = G.hero, fc = fc0(), muzzle = () => { const h = heroHand(); return { x: h.x + 15, y: h.y + 2 }; };
    tween(H, { ox: -4, squash: 0.14 }, 220);
    await fxRun(220, c => { const h = heroHand(); mvStar(c, h.x - 2, h.y - 3, 2 + Math.random() * 3, Math.random() < 0.5 ? '#ffe14a' : '#ff9a3a'); });
    Sfx.play('boom');
    const mz = muzzle();
    screenFlash('#ffd04a', 0.25);
    shake(3, 160);
    mvBlast({ x: mz.x + 7, y: mz.y }, 9, 260);
    mvPuffs(mz.x + 2, mz.y, 8, { cols: ['#ffffff', '#b9bdc9'], speed: 40, dir: -0.3, spread: 1.8, r0: 2, r1: 7, ms: 700, rise: 14 });
    const kick = tween(H, { ox: -14, squash: -0.12 }, 70).then(() => tween(H, { ox: 0, squash: 0 }, 280));
    await projectile(mz, fc, 260, (c, x, y) => {
      pxCircle(c, x, y, 6, MV_INK); pxCircle(c, x, y, 5, '#3a3440'); pxRect(c, x - 3, y - 3, 2, 2, '#9aa4b1');
      if (Math.random() < 0.8) particles(x - 6, y, 1, { colors: SMOKE, speed: 8, grav: -20, life: 0.5, size: 2 });
    });
    m.hit(0);
    mvBlast(fc, 16, 420);
    impact(fc, FIRE, 16);
    particles(fc.x, fc.y, 18, { colors: FIRE.concat(['#3a3440']), speed: 110 });
    mvPuffs(fc.x, fc.y - 4, 6, { cols: ['#dfe2ea', '#9aa4b1'], speed: 30, r0: 3, r1: 8, ms: 700, rise: 18, alpha: 0.75 });
    shake(5, 280);
    await kick;
  },
  // Scatter Shot: a spray of grapeshot peppers the foe with little blasts.
  scattershot: async m => {
    const H = G.hero, fc = fc0();
    tween(H, { ox: -4, squash: 0.12 }, 160);
    await wait(160);
    Sfx.play('boom');
    const h = heroHand(), mz = { x: h.x + 15, y: h.y + 2 };
    mvBlast({ x: mz.x + 6, y: mz.y }, 7, 220);
    mvPuffs(mz.x + 2, mz.y, 6, { cols: ['#ffffff', '#b9bdc9'], speed: 40, dir: -0.3, spread: 1.8, r0: 2, r1: 6, ms: 600, rise: 12 });
    const kick = tween(H, { ox: -10, squash: -0.1 }, 70).then(() => tween(H, { ox: 0, squash: 0 }, 260));
    const B = Array.from({ length: 7 }, (_, i) => ({ dy: (i - 3) * 5 + rand(-2, 2), arc: rand(-14, 14) }));
    await fxRun(260, (c, k) => {
      for (const b of B) {
        const x = lerp(mz.x, fc.x + rand(-1, 1), k), y = lerp(mz.y, fc.y + b.dy, k) + Math.sin(k * Math.PI) * b.arc;
        pxCircle(c, x, y, 2, MV_INK); pxRect(c, x - 1, y - 1, 1, 1, '#9aa4b1');
        pxLine(c, x - 6, y, x - 3, y, '#dfe2ea', 1);
      }
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const p = { x: fc.x + rand(-10, 10), y: fc.y + B[i % B.length].dy };
      m.hit(i);
      mvBlast(p, 6, 220);
      impact(p, FIRE, 6);
      await wait(70);
    }
    shake(3, 200);
    await kick;
  },
  // Buggy Ball: a huge striped ball with a sputtering fuse lobs high and goes off like a volcano.
  buggyball: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('charge');
    tween(H, { ox: -5, squash: 0.18 }, 260);
    await fxRun(260, c => { const h = heroHand(); mvStar(c, h.x - 2, h.y - 3, 2 + Math.random() * 4, pick(FIRE)); });
    Sfx.play('boom');
    const h = heroHand(), from = { x: h.x + 14, y: h.y - 2 };
    mvBlast({ x: from.x + 6, y: from.y }, 9, 260);
    mvPuffs(from.x, from.y, 8, { cols: ['#ffffff', '#b9bdc9'], speed: 40, dir: -0.5, spread: 1.8, r0: 2, r1: 7, ms: 700, rise: 14 });
    const kick = tween(H, { ox: -16, squash: -0.12 }, 80).then(() => tween(H, { ox: 0, squash: 0 }, 300));
    await fxRun(700, (c, k) => {
      const x = lerp(from.x, fc.x, k), y = lerp(from.y, fc.y, k) - Math.sin(k * Math.PI) * 44, sp = k * 10;
      pxCircle(c, x, y, 9, MV_INK); pxCircle(c, x, y, 8, '#d63c2f');
      pxRect(c, x - 8, y - 1 + Math.round(Math.sin(sp) * 2), 17, 3, '#ffffff');
      pxCircle(c, x - 3, y - 3, 2, '#ff8a7a');
      drawText(c, 'B', x - 1, y - 7 + Math.round(Math.sin(sp) * 2), { color: '#ffe14a', shadow: null });
      pxRect(c, x + 3, y - 12, 1, 4, '#c9b88a');
      mvStar(c, x + 4, y - 13, 2 + Math.random() * 2, pick(FIRE));
      if (Math.random() < 0.6) particles(x + 4, y - 13, 1, { colors: FIRE, speed: 20, grav: -20, life: 0.3, size: 1 });
    });
    Sfx.play('boom');
    screenFlash('#ffd04a', 0.8);
    m.hit(0);
    focusLines(fc, '#ffd04a', 360);
    mvBlast(fc, 26, 560);
    for (let i = 0; i < 3; i++) ringOut(fc, ['#ffe14a', '#ff5a2a', '#ffffff'][i], 4, 30 + i * 10, 520, 3);
    particles(fc.x, fc.y, 40, { colors: FIRE.concat(['#d63c2f', '#ffffff']), speed: 150 });
    mvPuffs(fc.x, fc.y - 6, 10, { cols: ['#dfe2ea', '#7a7f8c'], speed: 40, r0: 4, r1: 11, ms: 900, rise: 22, alpha: 0.8 });
    shake(8, 520);
    await kick;
    await wait(200);
  },

  // --- Cat Claws ---
  // Cat Swipe: a pounce and five claw gashes across the foe.
  catswipe: async m => {
    const H = G.hero;
    await tween(H, { ox: -4, squash: 0.16 }, 110);
    const d = mvDash(220, '#e8e8f0');
    await tween(H, { ox: 50, oy: -6, squash: -0.1 }, 110, easeIn);
    const fc = fc0();
    Sfx.play('slash');
    tween(H, { oy: 0, squash: 0.1 }, 100);
    mvRake({ x: fc.x - 4, y: fc.y }, '#e8e8f0', 260, 1.1);
    mvRake({ x: fc.x + 6, y: fc.y + 2 }, '#e8e8f0', 260, 0.8);
    await wait(80);
    m.hit(0);
    impact(fc, ['#ffffff', '#e8e8f0'], 10);
    await wait(80);
    await d;
    await back(160);
  },
  // Silent Steps: you vanish - and claw marks rip open around the foe from every side.
  silentsteps: async m => {
    const H = G.hero;
    Sfx.play('miss');
    mvPuffs(H.x + H.ox, 112, 5, { cols: ['#dfe2ea', '#9aa4b1'], speed: 30, r0: 2, r1: 6, ms: 420, rise: 10 });
    await tween(H, { alpha: 0 }, 120);
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const a = i * 2.1, p = { x: fc.x + Math.cos(a) * 9, y: fc.y + Math.sin(a) * 9 };
      const hc = { x: fc.x + Math.cos(a) * 26, y: fc.y + Math.sin(a) * 18 };
      fxRun(120, (c, k) => drawSpriteAt(c, getSprite(heroSpec(), 'tint', '#9aa4b1'), hc.x, hc.y + 18, 2, { shadow: false, alpha: 0.5 * (1 - k) }));
      slashMarks(p, 3, '#d9d9e0', 22, a + Math.PI / 2, 3);
      m.hit(i);
      await wait(110);
    }
    impact(fc, ['#ffffff', '#d9d9e0'], 10);
    mvPuffs(H.x, 112, 5, { cols: ['#dfe2ea', '#9aa4b1'], speed: 30, r0: 2, r1: 6, ms: 420, rise: 10 });
    await tween(H, { alpha: 1 }, 160);
  },
  // Hundred Plans: you blur into a whirlwind of after-images, then a storm of claw cuts lands at once.
  hundredplans: async m => {
    const H = G.hero, fc = fc0();
    const g = ghosts(820, '#d9d9e0', 6, -14);
    Sfx.play('slash');
    await tween(H, { ox: -4, squash: 0.16 }, 140);
    const blur = fxRun(560, (c, k) => {
      for (let i = 0; i < 4; i++) {
        const a = G.t * 9 + i * 1.6, x = fc.x + Math.cos(a) * 26, y = fc.y + Math.sin(a) * 16;
        drawSpriteAt(c, getSprite(heroSpec(), 'tint', '#ffffff'), x, y + 16, 2, { shadow: false, alpha: 0.35 });
      }
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63 + k * 5, r = 30 * (1 - k) + 6;
        pxLine(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r, fc.x + Math.cos(a) * (r - 8), fc.y + Math.sin(a) * (r - 8), '#ffffff', 1);
      }
    });
    await tween(H, { ox: 46, alpha: 0.4, squash: -0.1 }, 140, easeIn);
    await blur;
    m.hit(0);
    Sfx.play('crit');
    screenFlash('#ffffff', 0.4);
    mvRake({ x: fc.x - 6, y: fc.y }, '#ffffff', 300, 1.3);
    mvRake({ x: fc.x + 6, y: fc.y }, '#d9d9e0', 300, 1.1);
    slashMarks(fc, 5, '#ffffff', 40, 0.9, 4);
    slashMarks(fc, 5, '#d9d9e0', 40, -0.9, 4);
    impact(fc, ['#ffffff', '#d9d9e0'], 16);
    shake(5, 300);
    await tween(H, { alpha: 1 }, 120);
    await g;
    await back();
  },

  // --- Battle Spear ---
  // Spear Thrust: a straight, deep thrust with a gleam of gold at the point.
  spearthrust: async m => {
    const fc = fc0(), S = await mvJabIn('battlespear', '#ffd04a', { deep: 14 }), t = S.tip(), p = { x: Math.min(t.x, fc.x + 10), y: t.y };
    m.hit(0);
    impact(p, ['#ffffff', '#ffd04a'], 10);
    rays(p, '#e6b422', 6, 16, 240, 0.25);
    mvStar2({ x: fc.x + 14, y: t.y }, 200, '#ffd04a');
    await mvJabOut(S);
  },
  // Exploding Tip: the spear point goes in - and blows up.
  explodingtip: async m => {
    const fc = fc0(), S = await mvJabIn('battlespear', '#ffd04a'), t = S.tip(), p = { x: Math.min(t.x, fc.x + 4), y: t.y };
    await fxRun(120, (c, k) => { mvStar(c, p.x, p.y, 2 + Math.random() * 3, pick(FIRE)); });
    Sfx.play('boom');
    m.hit(0);
    mvBlast(p, 14, 380);
    impact(p, FIRE, 14);
    ringOut(p, '#ff9a3a', 2, 18, 300, 3);
    particles(p.x, p.y, 20, { colors: FIRE, speed: 100 });
    mvPuffs(p.x, p.y, 5, { cols: ['#dfe2ea', '#9aa4b1'], speed: 30, r0: 3, r1: 7, ms: 600, rise: 16, alpha: 0.7 });
    shake(4, 260);
    G.hero.ox -= 6;
    await mvJabOut(S);
  },
  // Great War Spear: you hurl the spear wreathed in fire; it streaks in and erupts.
  warspear: async m => {
    const H = G.hero, fc = fc0(), img = getSprite(weaponSpec('battlespear'));
    hold(true);
    Sfx.play('fire');
    await tween(H, { ox: -10, squash: 0.18 }, 220);
    await fxRun(200, (c, k) => {
      const h = heroHand();
      drawRot(c, img, h.x - 6, h.y - 10, Math.PI / 2 - 0.15, 3);
      for (let i = 0; i < 2; i++) particles(h.x - 6 + rand(-18, 18), h.y - 10, 1, { colors: FIRE, speed: 20, grav: -40, life: 0.3 });
    });
    tween(H, { ox: 8, squash: -0.12 }, 100);
    const h = heroHand(), from = { x: h.x, y: h.y - 10 };
    await fxRun(320, (c, k) => {
      const e = easeIn(k), x = lerp(from.x, fc.x, e), y = lerp(from.y, fc.y, e);
      for (let i = 0; i < 6; i++) { pxCircle(c, x - 18 - i * 6, y + Math.sin(G.t * 30 + i) * 2, 5 - i * 0.7, FIRE[i % 4]); }
      for (let i = 0; i < 3; i++) particles(x - 16, y, 1, { colors: FIRE, speed: 20, grav: -30, life: 0.3 });
      drawRot(c, img, x, y, Math.PI / 2, 3);
    });
    Sfx.play('boom');
    screenFlash('#ff9a3a', 0.6);
    m.hit(0);
    focusLines(fc, '#ff9a3a', 300);
    mvBlast(fc, 22, 480);
    impact(fc, FIRE, 18);
    particles(fc.x, fc.y, 36, { colors: FIRE, speed: 140 });
    mvPuffs(fc.x, fc.y - 4, 8, { cols: ['#dfe2ea', '#7a7f8c'], speed: 36, r0: 3, r1: 9, ms: 800, rise: 20, alpha: 0.75 });
    shake(7, 450);
    await wait(200);
    hold(false);
    await back();
  },

  // --- Devil Fruits ---
  // Dough Avalanche: great sticky lumps of dough rain down and splat over the foe.
  doughavalanche: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('stretch');
    await tween(H, { squash: 0.18 }, 160);
    tween(H, { oy: -4, squash: -0.12 }, 120).then(() => tween(H, { oy: 0, squash: 0 }, 200));
    const L = Array.from({ length: 12 }, (_, i) => ({ x: fc.x - 26 + (i % 6) * 10 + rand(-2, 2), row: Math.floor(i / 6), d: (i % 6) * 0.04 + Math.floor(i / 6) * 0.12, r: rand(6, 8) }));
    let hit = false;
    await fxRun(720, (c, k) => {
      for (const q of L) {
        const kk = Math.min(1, Math.max(0, (k - q.d) / 0.6)), land = fc.y - 4 + q.row * 8;
        const y = lerp(VIEW.y - 20 - q.row * 20, land, easeIn(kk)), sq = kk >= 1 ? 1.3 : 1 - kk * 0.2;
        mvOval(c, q.x, y, q.r * sq + 1, q.r / sq + 1, '#9a7a4a');
        mvOval(c, q.x, y, q.r * sq, q.r / sq, '#efe2c8');
        mvOval(c, q.x - 2, y - 2, q.r * sq * 0.45, q.r / sq * 0.4, '#fffaf0');
        if (kk < 1) pxLine(c, q.x, y - q.r - 10, q.x, y - q.r - 3, '#ffffff', 1);
      }
      if (!hit && k >= 0.75) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    Sfx.play('boom');
    impact(fc, ['#ffffff', '#efe2c8'], 12);
    particles(fc.x, fc.y, 20, { colors: ['#efe2c8', '#c9a26a', '#fffaf0'], speed: 80, grav: 200, size: 3 });
    mvShock({ x: fc.x, y: 120 }, '#efe2c8', 34, 400);
    shake(5, 400);
    await wait(120);
  },
  // Bara Bara Festival: your body splits apart and fists, feet and your head fly in from all sides.
  festival: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('stretch');
    await tween(H, { squash: 0.15 }, 120);
    await tween(H, { alpha: 0.35, squash: -0.05 }, 100);
    const parts = ['fist', 'foot', 'fist', 'head', 'fist', 'foot'];
    const starts = [[20, 10], [100, VIEW.y + 6], [VIEW.x + 6, 80], [VIEW.x + VIEW.w - 6, 20], [60, VIEW.y + 4], [VIEW.x + VIEW.w - 10, 128]];
    const drawPart = (c, part, x, y, a) => {
      if (part === 'head') {
        pxCircle(c, x, y, 5, PAL.k); pxCircle(c, x, y, 4, '#f7e0d0');
        pxRect(c, x - 3, y + 1, 5, 1, '#d63c2f'); pxRect(c, x - 4, y - 5, 8, 3, '#3b6fd6'); pxRect(c, x + 1, y - 1, 1, 1, PAL.k);
      } else if (part === 'foot') {
        pxRect(c, x - 4, y - 3, 9, 6, PAL.k); pxRect(c, x - 3, y - 2, 7, 4, '#3a3440'); pxRect(c, x - 3, y - 2, 7, 1, '#5a5a6a');
      } else {
        pxCircle(c, x, y, 4, PAL.k); pxCircle(c, x, y, 3, '#f7e0d0'); pxRect(c, x - 1, y - 2, 2, 1, '#ffffff');
        pxLine(c, x - Math.cos(a) * 4, y - Math.sin(a) * 4, x - Math.cos(a) * 9, y - Math.sin(a) * 9, '#f7e0d0', 2);
      }
    };
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const from = { x: starts[i % 6][0], y: starts[i % 6][1] }, part = parts[i % parts.length], a = Math.atan2(fc.y - from.y, fc.x - from.x);
      await fxRun(150, (c, k) => {
        const e = easeIn(k), x = lerp(from.x, fc.x, e), y = lerp(from.y, fc.y, e);
        for (let j = 1; j <= 3; j++) pxLine(c, x - Math.cos(a) * (6 + j * 5), y - Math.sin(a) * (6 + j * 5), x - Math.cos(a) * (8 + j * 5), y - Math.sin(a) * (8 + j * 5), '#ffffff', 1);
        drawPart(c, part, x, y, a);
      });
      m.hit(i);
      impact({ x: fc.x + rand(-4, 4), y: fc.y + rand(-6, 6) }, ['#ffffff', '#d63c2f'], 6);
    }
    await tween(H, { alpha: 1, squash: 0 }, 160);
  },
  // Great Eruption: a giant fist of molten rock flies in, dripping lava, and bursts on the foe.
  magmafist: async m => {
    const H = G.hero, fc = fc0();
    Sfx.play('fire');
    tween(H, { ox: -4, squash: 0.16 }, 220);
    await fxRun(220, (c, k) => {
      const h = heroHand();
      pxCircle(c, h.x + 2, h.y, 2 + k * 5, '#c0301a'); pxCircle(c, h.x + 2, h.y, 1 + k * 3, '#ff9a3a');
      if (Math.random() < 0.6) particles(h.x + 2, h.y, 1, { colors: FIRE, speed: 20, grav: -40, life: 0.3 });
    });
    tween(H, { ox: 6, squash: -0.1 }, 100);
    const from = heroHand();
    await projectile(from, fc, 380, (c, x, y) => {
      for (let j = 1; j <= 4; j++) pxCircle(c, x - j * 6, y + Math.sin(G.t * 20 + j) * 1.5, 7 - j, j % 2 ? '#5a1a1a' : '#c0301a');
      pxCircle(c, x, y, 10, MV_INK);
      pxCircle(c, x, y, 9, '#5a1a1a');
      pxCircle(c, x + 1, y, 7, '#c0301a');
      pxCircle(c, x + 2, y - 1, 4, '#ff9a3a');
      pxCircle(c, x + 3, y - 2, 2, '#ffd04a');
      for (let i = 0; i < 3; i++) { pxRect(c, x + 4, y - 6 + i * 4, 4, 3, MV_INK); pxRect(c, x + 4, y - 5 + i * 4, 3, 2, '#ff5a2a'); }
      if (Math.random() < 0.7) particles(x - 4, y + 6, 1, { colors: ['#ff5a2a', '#c0301a'], speed: 15, grav: 160, life: 0.5, size: 2 });
      if (Math.random() < 0.5) particles(x - 6, y - 4, 1, { colors: ['#5a4a4a', '#3a2a2a'], speed: 10, grav: -40, life: 0.6, size: 2 });
    });
    Sfx.play('boom');
    m.hit(0);
    screenFlash('#ff9a3a', 0.4);
    mvBlast(fc, 18, 440, ['#3a0a0a', '#c0301a', '#ff5a2a', '#ffd04a', '#fff3a0']);
    impact(fc, FIRE, 14);
    particles(fc.x, fc.y, 26, { colors: ['#ff5a2a', '#5a1a1a', '#ffd04a'], speed: 110, grav: 200, size: 2 });
    mvPuffs(fc.x, fc.y - 6, 6, { cols: ['#7a6a6a', '#4a3a3a'], speed: 30, r0: 3, r1: 8, ms: 760, rise: 22, alpha: 0.8 });
    shake(5, 320);
    await tween(H, { ox: 0, squash: 0 }, 220);
  },
  // Lava Flood: a tide of glowing lava rolls across the ground and swallows the foe's feet.
  lavaflood: async m => {
    const H = G.hero, x0 = H.x + 12, fc = fc0();
    Sfx.play('fire');
    await tween(H, { squash: 0.16 }, 140);
    tween(H, { squash: -0.08 }, 100).then(() => tween(H, { squash: 0 }, 160));
    let hit = false;
    await fxRun(700, (c, k) => {
      const x = lerp(x0, fc.x + 24, easeIn(Math.min(1, k / 0.8)));
      for (let i = 0; i < 22; i++) {
        const xx = x - i * 3, hh = (16 + Math.sin(i * 0.8 + G.t * 8) * 3) * (1 - i / 26), top = 122 - hh;
        pxRect(c, xx - 1, top - 1, 4, hh + 1, '#3a0a0a');
        pxRect(c, xx, top, 3, hh, i % 3 ? '#c0301a' : '#8a1a10');
        pxRect(c, xx, top, 3, 2, i % 4 ? '#ff9a3a' : '#ffd04a');
        if ((i + Math.floor(G.t * 10)) % 7 === 0) pxRect(c, xx, top + 4, 2, 2, '#ff5a2a');
      }
      if (Math.random() < 0.6) particles(x - rand(0, 40), 112, 1, { colors: FIRE, speed: 30, grav: -40, life: 0.5, size: 2 });
      if (!hit && k >= 0.8) { hit = true; m.hit(0); }
    });
    if (!hit) m.hit(0);
    impact({ x: fc.x, y: fc.y + 8 }, FIRE, 12);
    particles(fc.x, fc.y + 8, 26, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 100, grav: 160 });
    mvPuffs(fc.x, 112, 8, { cols: ['#8a7a7a', '#5a4a4a'], speed: 26, dir: -Math.PI / 2, spread: 2, r0: 3, r1: 8, ms: 760, rise: 20, alpha: 0.75 });
    shake(4, 300);
    await wait(120);
  },
  // Puppet Strings: threads drop out of the sky, hook the foe and jerk it around like a doll.
  puppet: async m => {
    const H = G.hero, fc = fc0(), F = G.battle.F;
    Sfx.play('stretch');
    tween(H, { squash: 0.12 }, 200);
    const sx = i => fc.x - 12 + i * 6, sy = i => fc.y - 10 + (i % 2) * 6;
    await fxRun(320, (c, k) => {
      for (let i = 0; i < 5; i++) {
        const y = lerp(VIEW.y, sy(i), easeOut(k));
        pxLine(c, sx(i), VIEW.y, sx(i), y, '#f2f2f2', 1);
        pxRect(c, sx(i) - 1, y - 1, 3, 3, '#ffffff');
      }
    });
    m.hit(0);
    impact(fc, ['#ffffff', '#f2f2f2'], 8);
    const strings = fxRun(760, c => {
      for (let i = 0; i < 5; i++) {
        const x = sx(i) + F.ox, y = sy(i) + F.oy;
        pxLine(c, sx(i) - F.ox * 0.5, VIEW.y, x, y, '#f2f2f2', 1);
        pxRect(c, x - 1, y - 1, 2, 2, '#ffffff');
      }
      const h = heroHand();
      for (let i = 0; i < 3; i++) pxLine(c, h.x, h.y - 2, h.x - 4 + i * 4, VIEW.y, '#f2f2f2', 1);
    });
    for (let i = 0; i < 4; i++) {
      H.ox = i % 2 ? -3 : 3;
      await tween(F, { ox: i % 2 ? 7 : -7, oy: -5, squash: i % 2 ? 0.1 : -0.1 }, 90, easeOut);
    }
    H.ox = 0;
    await tween(F, { ox: 0, oy: 0, squash: 0 }, 140);
    await tween(H, { squash: 0 }, 100);
    await strings;
  },
  // Paw Repel: you dash in and a paw-shaped shove of air flings the foe away.
  repel: async m => {
    const H = G.hero, F = G.battle.F;
    await tween(H, { ox: -4, squash: 0.14 }, 120);
    const d = mvDash(220);
    await tween(H, { ox: 46, squash: -0.08 }, 130, easeIn);
    const fc = fc0();
    Sfx.play('boom');
    m.hit(0);
    const paw = (c, x, y, s, col) => {
      pxCircle(c, x, y, 5 * s, col);
      for (let i = 0; i < 3; i++) pxCircle(c, x + 4 * s, y - 6 * s + i * 6 * s, 2.2 * s, col);
    };
    fxRun(420, (c, k) => {
      const e = easeOut(k), s = 1 + e * 1.2;
      c.globalAlpha = 1 - k * 0.6;
      for (let i = 0; i < 3; i++) {
        const x = fc.x - 12 + e * 34 + i * 8;
        paw(c, x, fc.y, s, MV_INK);
        paw(c, x - 1, fc.y, s * 0.85, i % 2 ? '#ffffff' : '#f2c7d8');
      }
      c.globalAlpha = 1;
    });
    impact(fc, ['#ffffff', '#f2c7d8'], 10);
    await tween(F, { ox: 22, squash: -0.1 }, 160, easeOut);
    tween(F, { ox: 0, squash: 0 }, 300);
    await d;
    await back();
  },
  // Ursus Shock: you squeeze the air into a giant paw-shaped bubble, launch it, and it detonates.
  bearshock: async m => {
    const H = G.hero, fc = fc0(), h = heroHand(), c0 = { x: h.x + 16, y: h.y - 12 };
    Sfx.play('charge');
    tween(H, { squash: 0.15 }, 520);
    const paw = (c, x, y, r) => {
      pxCircle(c, x, y, r + 1, MV_INK); pxCircle(c, x, y, r, '#f2c7d8'); pxCircle(c, x - r * 0.2, y - r * 0.2, r - 3, '#ffffff');
      for (let t = -1; t <= 1; t++) { pxCircle(c, x + r + 3, y + t * (r - 3), r * 0.28 + 1, MV_INK); pxCircle(c, x + r + 3, y + t * (r - 3), r * 0.28, '#f2c7d8'); }
    };
    await fxRun(520, (c, k) => {
      for (let i = 0; i < 12; i++) { const a = i * 0.52 + k * 3, r = 34 * (1 - k) + 10; pxRect(c, c0.x + Math.cos(a) * r, c0.y + Math.sin(a) * r, 2, 2, i % 2 ? '#f2c7d8' : '#ffffff'); }
      paw(c, c0.x, c0.y, 4 + easeOut(k) * 10);
    });
    tween(H, { ox: 6, squash: -0.1 }, 100);
    await projectile(c0, fc, 300, (c, x, y) => {
      for (let j = 1; j <= 3; j++) { c.globalAlpha = 0.15 * (4 - j); pxCircle(c, x - j * 8, y, 12, '#f2c7d8'); }
      c.globalAlpha = 1;
      paw(c, x, y, 14);
    });
    Sfx.play('boom');
    screenFlash('#ffffff', 0.8);
    m.hit(0);
    focusLines(fc, '#f2c7d8', 360);
    mvBlast(fc, 26, 520, ['#c97aa0', '#f2c7d8', '#ffffff', '#ffffff']);
    for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#f2c7d8' : '#ffffff', 6, 40 + i * 12, 520, 3);
    mvShock({ x: fc.x, y: 120 }, '#f2c7d8', 56, 520, 3);
    dust(fc.x, 18);
    shake(8, 520);
    await tween(H, { ox: 0, squash: 0 }, 220);
    await wait(200);
  },
};

// Blade moves (Buggy splits away from them) and shots (Wapol eats them).
const SLASH_MOVES = ['swing', 'multislash', 'crescent', 'sandslash', 'rustyslash', 'ironrule', 'saberflurry', 'justice', 'mirage', 'sunsetcleave',
  'blackcrescent', 'nightrain', 'edgeworld', 'axechop', 'spinaxe', 'ironcleave', 'sawslash', 'sharkbite', 'hookrake', 'desertblade', 'shigure',
  'twinmoon', 'lionsong', 'cleaverchop', 'mince', 'grandcleave', 'catswipe', 'silentsteps', 'hundredplans', 'dragonclaw', 'claw'];
const SHOT_MOVES = ['shot', 'quickdraw', 'trickshot', 'knifetoss', 'bladefan', 'grandfinale', 'ringtoss', 'ringstorm', 'cannonshot', 'scattershot',
  'buggyball', 'bomb', 'tinbarrage', 'gun', 'cannon', 'throw'];
