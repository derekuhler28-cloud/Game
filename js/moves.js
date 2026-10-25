'use strict';
/* Move animations. Every weapon, fruit, fist and race move has its own look, and every
   weapon's plain attack shows that weapon in action. Each effect gets
   m = { hit(i), hits, color } and must call hit() once per hit. */

const lerp = (a, b, k) => a + (b - a) * k;
const fc0 = () => foeC();

// ---------- building blocks ----------

function drawRot(c, img, x, y, a, s) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(a);
  c.drawImage(img, Math.round(-img.width * s / 2), Math.round(-img.height * s / 2), img.width * s, img.height * s);
  c.restore();
}

// A sweeping arc that is thickest at its leading edge, like a blade trail.
function arcSweep(cx, cy, r, a0, a1, color, ms, thick) {
  thick = thick || 3;
  return fxRun(ms || 260, (c, k) => {
    if (k > 0.75 && Math.floor(k * 24) % 2) return;
    const e = easeOut(Math.min(1, k * 1.6));
    const a = a0 + (a1 - a0) * e, tail = a0 + (a1 - a0) * Math.max(0, e - 0.6);
    const steps = Math.max(4, Math.ceil(Math.abs(a - tail) * r / 2));
    for (let i = 0; i <= steps; i++) {
      const t = tail + (a - tail) * i / steps, w = Math.max(1, Math.round(thick * i / steps));
      pxRect(c, cx + Math.cos(t) * r - w / 2, cy + Math.sin(t) * r - w / 2, w, w, color);
      pxRect(c, cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), 1, 1, '#ffffff');
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

// A line that shoots out to `to` and pulls back (spears, jabs, tridents).
function thrust(from, to, color, w, ms, prongs) {
  prongs = prongs || 1;
  return fxRun(ms || 260, (c, k) => {
    const e = k < 0.4 ? easeOut(k / 0.4) : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e);
    for (let p = 0; p < prongs; p++) {
      const dy = (p - (prongs - 1) / 2) * 4;
      pxLine(c, from.x, from.y + dy, x, y + dy, color, w);
      pxLine(c, from.x, from.y + dy, x, y + dy, '#ffffff', 1);
      pxRect(c, x, y + dy - 1, 3, 3, '#ffffff');
    }
  });
}

const ringOut = (pos, color, r0, r1, ms, thick) => fxRun(ms, (c, k) => pxRing(c, pos.x, pos.y, lerp(r0, r1, easeOut(k)), color, thick || 2));

function rays(pos, color, n, len, ms, rot) {
  return fxRun(ms || 300, (c, k) => {
    for (let i = 0; i < n; i++) {
      const a = (rot || 0) + i * Math.PI * 2 / n, r0 = len * k * 0.5, r1 = len * easeOut(Math.min(1, k * 1.4));
      pxLine(c, pos.x + Math.cos(a) * r0, pos.y + Math.sin(a) * r0, pos.x + Math.cos(a) * r1, pos.y + Math.sin(a) * r1, color, k < 0.5 ? 2 : 1);
    }
  });
}

function spinThrow(img, from, to, ms, spins, s, arc) {
  return fxRun(ms, (c, k) => drawRot(c, img, lerp(from.x, to.x, k), lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * (arc || 0), k * spins * Math.PI * 2, s || 1));
}

function zigzag(c, x0, y0, x1, y1, n, amp, color, w) {
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k) + (i < n ? (i % 2 ? amp : -amp) : 0);
    pxLine(c, px, py, x, y, color, w || 1);
    px = x; py = y;
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

function dropOn(pos, ms, drawFn) {
  return fxRun(ms, (c, k) => drawFn(c, pos.x, lerp(VIEW.y - 24, pos.y, easeIn(k)), k));
}

function groundCrack(x0, x1, color, ms) {
  return fxRun(ms, (c, k) => {
    const x = lerp(x0, x1, easeOut(k));
    zigzag(c, x0, 119, x, 119, Math.max(2, Math.round((x - x0) / 6)), 2, color, 2);
  });
}

const dust = (x, n) => particles(x, 118, n || 12, { colors: ['#c9b88a', '#e8d9b0', '#9a8a6a'], speed: 60, grav: 90, dir: -Math.PI / 2, spread: 2 });
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

// ---------- plain attacks: you can see the weapon you are using ----------

const SWING_STYLE = {
  sword: 'slash', curved: 'slash', saw: 'slash', cleaver: 'slash', axe: 'chop', hook: 'slash', claws: 'claw',
  staff: 'thrust', gstaff: 'thrust', trident: 'thrust', spear: 'thrust', jitte: 'thrust',
  club: 'smash', kanabo: 'smash', hammer: 'smash', scepter: 'smash',
  gun: 'gun', cannon: 'cannon', knives: 'throw', ring: 'throw', shell: 'shell',
  rope: 'throw', cannonarm: 'cannon', gloves: 'punch', scissors: 'slash', bubbler: 'shell', chain: 'smash', dagger: 'slash', bisento: 'slash',
  gauntlet: 'punch', knuckles: 'punch', nodachi: 'slash', lamp: 'shell', slingshot: 'gun', whip: 'slash', bicorne: 'slash', mogura: 'thrust',
};

async function basicAttack(key, m) {
  const w = WEAPONS[key];
  if (!w || !w.shape || SWING_STYLE[w.shape] === 'punch') return MOVE_FX.punch(m);
  const img = getSprite(weaponSpec(key)), col = w.color || '#ffffff', H = G.hero;
  const style = SWING_STYLE[w.shape] || 'slash';
  if (style === 'gun' || style === 'cannon' || style === 'shell') {
    const h = heroHand(), fc = fc0();
    Sfx.play(style === 'cannon' ? 'boom' : 'shot');
    tween(H, { ox: -5 }, 60).then(() => tween(H, { ox: 0 }, 160));
    particles(h.x + 12, h.y + 1, 8, { colors: style === 'shell' ? [col, '#ffffff'] : ['#ffe14a', '#ffffff', '#9aa4b1'], speed: 50, grav: 0, life: 0.25 });
    if (style === 'shell') {
      await fxRun(260, (c, k) => { for (let i = 0; i < 3; i++) pxRing(c, lerp(h.x + 10, fc.x, k) - i * 5, h.y, 3 + i * 2, col); });
    } else {
      await projectile({ x: h.x + 12, y: h.y + 1 }, fc, style === 'cannon' ? 260 : 140, (c, x, y) => {
        if (style === 'cannon') { pxCircle(c, x, y, 4, PAL.k); pxCircle(c, x - 1, y - 1, 1, '#9aa4b1'); particles(x, y, 1, { colors: SMOKE, speed: 10, grav: -10, life: 0.3 }); }
        else { pxRect(c, x - 3, y - 1, 5, 2, col); pxRect(c, x - 6, y, 3, 1, '#ffffff'); }
      });
    }
    m.hit(0);
    impact(fc, style === 'cannon' ? FIRE : null, style === 'cannon' ? 16 : 8);
    if (style === 'cannon') shake(3, 200);
    return;
  }
  if (style === 'throw') {
    const fc = fc0();
    Sfx.play('slash');
    await spinThrow(img, heroHand(), fc, 300, 2.5, 2, 6);
    m.hit(0);
    impact(fc, [col, '#ffffff'], 10);
    return;
  }
  hold(true);
  await tween(H, { ox: 44 }, 130, easeIn);
  const hx = () => G.hero.x + G.hero.ox + 10, hy = 102;
  if (style === 'thrust') {
    const fc = fc0();
    await fxRun(220, (c, k) => {
      const e = k < 0.5 ? easeOut(k * 2) : 1 - (k - 0.5);
      drawRot(c, img, hx() + e * 18, hy, Math.PI / 2, 2);
    });
    m.hit(0);
    impact(fc, [col, '#ffffff'], 10);
  } else if (style === 'smash') {
    await fxRun(260, (c, k) => drawRot(c, img, hx() + 6, hy - 14 + k * 14, lerp(-1.2, 1.4, easeIn(k)), 2));
    Sfx.play('boom');
    m.hit(0);
    dust(fc0().x, 10);
    impact(fc0(), ['#ffffff', col], 12);
    shake(3, 180);
  } else if (style === 'claw') {
    m.hit(0);
    slashMarks(fc0(), 3, col, 26, 1.1, 5);
  } else {
    const chop = style === 'chop';
    const a0 = chop ? -1.6 : -2.3, a1 = chop ? 0.9 : 0.8;
    Sfx.play('slash');
    const run = fxRun(240, (c, k) => drawRot(c, img, hx() + 4 + Math.cos(lerp(a0, a1, easeOut(k))) * 10, hy - 8 + Math.sin(lerp(a0, a1, easeOut(k))) * 10, lerp(a0, a1, easeOut(k)) + Math.PI / 2, 2));
    arcSweep(hx() + 6, hy - 6, 24, a0, a1, col, 260, 3);
    await run;
    m.hit(0);
    impact(fc0(), [col, '#ffffff'], 8);
  }
  hold(false);
  await back();
}

// ---------- named moves ----------

const MOVE_FX = {
  punch: async m => {
    await tween(G.hero, { ox: 56 }, 150, easeIn);
    m.hit(0); impact(fc0());
    await back();
  },

  // --- fists and race moves ---
  powerpunch: async m => {
    const H = G.hero;
    await tween(H, { ox: -6, squash: 0.15 }, 180);
    const g = ghosts(300, '#ffe14a', 3, 10);
    await tween(H, { ox: 58, squash: -0.1 }, 100, easeIn);
    m.hit(0);
    ringOut(fc0(), '#ffe14a', 2, 18, 260, 2);
    rays(fc0(), '#ffffff', 8, 18, 260);
    shake(3, 200);
    await g; await back();
  },
  electroclaw: async m => {
    await tween(G.hero, { ox: 50 }, 120, easeIn);
    Sfx.play('zap');
    const fc = fc0();
    fxRun(400, (c, k) => { if (Math.floor(k * 16) % 2) for (let i = 0; i < 3; i++) zigzag(c, fc.x - 14 + i * 9, fc.y - 16, fc.x - 4 + i * 9, fc.y + 14, 4, 3, i === 1 ? '#ffffff' : '#7cd0ff', 2); });
    m.hit(0);
    particles(fc.x, fc.y, 16, { colors: ['#7cd0ff', '#ffffff', '#ffe14a'], speed: 80, grav: 0, life: 0.4 });
    await wait(300); await back();
  },
  impactdial: async m => {
    const H = G.hero;
    await tween(H, { ox: 52 }, 140, easeIn);
    const fc = fc0();
    await fxRun(260, (c, k) => { pxCircle(c, fc.x - 14, fc.y, 3 + k * 3, '#f2c7d8'); pxCircle(c, fc.x - 14, fc.y, 1 + k * 2, '#ffffff'); });
    Sfx.play('boom'); screenFlash('#ffffff', 0.5);
    m.hit(0);
    for (let i = 0; i < 3; i++) ringOut(fc, i ? '#f2c7d8' : '#ffffff', 2, 14 + i * 9, 420, 2);
    shake(6, 350);
    await tween(H, { ox: 10, squash: 0.15 }, 160);
    await back();
  },
  fishkarate: async m => {
    const H = G.hero;
    Sfx.play('splash');
    await tween(H, { ox: 50 }, 140, easeIn);
    const fc = fc0();
    m.hit(0);
    fxRun(420, (c, k) => { for (let i = 0; i < 4; i++) pxRing(c, fc.x - 10 + i * 3, fc.y, 4 + k * (10 + i * 5), i % 2 ? '#4fa3e0' : '#bfe6ff', 1); });
    particles(fc.x, fc.y, 18, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 80, grav: 120 });
    await wait(260); await back();
  },

  // --- Rusty Cutlass ---
  rustyslash: async m => {
    hold(true);
    await tween(G.hero, { ox: 48 }, 140, easeIn);
    const fc = fc0();
    m.hit(0);
    slashAt(fc, '#c9875a', 0.9, 38);
    particles(fc.x, fc.y, 12, { colors: ['#8a5a32', '#c9875a', '#5a3818'], speed: 50, grav: 120, size: 1 });
    hold(false); await back();
  },

  // --- Oak Bo Staff ---
  staffsweep: async m => {
    hold(true);
    await tween(G.hero, { ox: 46, squash: 0.15 }, 140, easeIn);
    const fc = fc0();
    await arcSweep(fc.x - 20, 118, 26, Math.PI, 0, '#e8d9b0', 260, 3);
    m.hit(0); dust(fc.x, 14); shake(2, 160);
    hold(false); await back();
  },
  whirlwind: async m => {
    hold(true);
    await tween(G.hero, { ox: 44 }, 130, easeIn);
    const fc = fc0();
    const spin = fxRun(560, (c, k) => { for (let i = 0; i < 3; i++) pxRing(c, G.hero.x + G.hero.ox + 12, 104, 10 + i * 5 + Math.sin(k * 20 + i) * 2, i % 2 ? '#e8d9b0' : '#ffffff', 1); });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { G.hero.squash = i % 2 ? 0.1 : -0.1; m.hit(i); impact({ x: fc.x + rand(-6, 6), y: fc.y + rand(-8, 8) }, ['#e8d9b0', '#ffffff'], 6); await wait(150); }
    await spin; hold(false); await back();
  },
  polevault: async m => {
    hold(true);
    const H = G.hero;
    await tween(H, { ox: 20, oy: -40 }, 260);
    await tween(H, { ox: 54, oy: -10 }, 160, easeIn);
    const fc = fc0();
    Sfx.play('boom');
    m.hit(0);
    ringOut({ x: fc.x, y: 118 }, '#e8d9b0', 2, 22, 300, 1);
    dust(fc.x, 16); shake(4, 260);
    hold(false); await back(240);
  },

  // --- Flintlock Pistol ---
  quickdraw: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('shot');
    screenFlash('#fff6c8', 0.35);
    fxRun(160, (c, k) => { pxLine(c, h.x + 12, h.y + 1, fc.x, fc.y, k < 0.5 ? '#ffffff' : '#ffe14a', 1); pxCircle(c, h.x + 13, h.y + 1, 3 * (1 - k), '#ffe14a'); });
    await wait(60);
    m.hit(0);
    floatText(fc.x, foeTop() - 14, 'BANG', '#ffe14a');
    impact(fc, null, 8);
    ringOut({ x: h.x + 14, y: h.y }, '#dfe2ea', 1, 7, 300, 1);
  },
  trickshot: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('shot');
    const pts = [{ x: h.x + 12, y: h.y }, { x: 100, y: 120 }, { x: 118, y: 36 }, fc];
    for (let i = 0; i < 3; i++) {
      await projectile(pts[i], pts[i + 1], 110, (c, x, y) => { pxRect(c, x - 1, y - 1, 3, 3, '#ffe14a'); pxRect(c, x, y, 1, 1, '#ffffff'); });
      if (i < 2) { Sfx.play('miss'); particles(pts[i + 1].x, pts[i + 1].y, 6, { colors: ['#ffe14a', '#ffffff'], speed: 40, grav: 0, life: 0.25 }); }
    }
    m.hit(0);
    impact(fc, null, 10);
  },

  // --- Marine Saber ---
  ironrule: async m => {
    hold(true);
    await tween(G.hero, { ox: 48, oy: -6 }, 140, easeIn);
    const fc = fc0();
    m.hit(0);
    fxRun(300, (c, k) => { const e = easeOut(Math.min(1, k * 2)); pxLine(c, fc.x, fc.y - 26, fc.x, fc.y - 26 + 52 * e, '#9ad0ff', 3); pxLine(c, fc.x, fc.y - 26, fc.x, fc.y - 26 + 52 * e, '#ffffff', 1); });
    Sfx.play('slash');
    particles(fc.x, fc.y, 10, { colors: ['#9ad0ff', '#ffffff'], speed: 60, grav: 40 });
    hold(false); await back();
  },
  saberflurry: async m => {
    hold(true);
    await tween(G.hero, { ox: 48 }, 130, easeIn);
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const fc = fc0();
      G.hero.ox = 46 + (i % 2) * 5;
      m.hit(i);
      slashAt({ x: fc.x + rand(-8, 8), y: fc.y + rand(-10, 10) }, '#9ad0ff', rand(-1.4, 1.4), 22);
      await wait(90);
    }
    hold(false); await back();
  },
  justice: async m => {
    hold(true);
    await tween(G.hero, { squash: 0.15 }, 150);
    const fc = fc0(), col = m.color || '#9ad0ff';
    Sfx.play('slash');
    await projectile(heroHand(), fc, 300, (c, x, y) => {
      for (let a = -1.2; a <= 1.2; a += 0.08) { pxRect(c, x + Math.cos(a) * 9 - 6, y + Math.sin(a) * 12, 2, 2, col); }
      pxLine(c, x - 6, y - 8, x + 2, y + 8, '#ffffff'); pxLine(c, x + 2, y - 8, x - 6, y + 8, '#ffffff');
    });
    m.hit(0);
    slashMarks(fc, 2, col, 34, 0.8, 0); slashAt(fc, col, -0.8, 34);
    shake(4, 240);
    hold(false); await back();
  },

  // --- Coral Trident ---
  tridentthrust: async m => {
    hold(true);
    await tween(G.hero, { ox: 30 }, 120, easeIn);
    const fc = fc0();
    await thrust({ x: G.hero.x + G.hero.ox + 10, y: 102 }, { x: fc.x, y: fc.y }, '#f2c7d8', 2, 260, 3);
    m.hit(0);
    particles(fc.x, fc.y, 12, { colors: ['#4fa3e0', '#bfe6ff'], speed: 60, grav: 100 });
    hold(false); await back();
  },
  tsunamispear: async m => {
    Sfx.play('splash');
    const x0 = G.hero.x + 12, fc = fc0();
    await fxRun(560, (c, k) => {
      const x = lerp(x0, fc.x, k);
      for (let i = 0; i < 14; i++) { const hh = 22 * (1 - i / 14); pxRect(c, x - i * 3, 104 - hh / 2, 3, hh, i % 3 ? '#4fa3e0' : '#2f6fd0'); }
      pxLine(c, x - 4, 104, x + 12, 104, '#f2c7d8', 3); pxRect(c, x + 12, 102, 4, 5, '#ffffff');
    });
    m.hit(0);
    particles(fc.x, fc.y, 26, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 100, grav: 120 });
    shake(4, 260);
  },

  // --- Karate Wraps ---
  tidalpalm: async m => {
    await tween(G.hero, { ox: 52 }, 140, easeIn);
    const fc = fc0();
    m.hit(0);
    Sfx.play('splash');
    await fxRun(300, (c, k) => { pxCircle(c, fc.x - 10, fc.y, 3 + k * 10, '#bfe6ff'); pxCircle(c, fc.x - 10, fc.y, 1 + k * 7, '#4fa3e0'); });
    particles(fc.x, fc.y, 14, { colors: ['#4fa3e0', '#ffffff'], speed: 80, grav: 100, dir: 0, spread: 1.4 });
    await back();
  },
  coralbreaker: async m => {
    await tween(G.hero, { ox: -6, squash: 0.15 }, 150);
    await tween(G.hero, { ox: 56, squash: -0.1 }, 110, easeIn);
    const fc = fc0();
    m.hit(0);
    Sfx.play('boom');
    for (let i = 0; i < 7; i++) { const a = i * 0.9; particles(fc.x + Math.cos(a) * 6, fc.y + Math.sin(a) * 6, 2, { colors: ['#ff7a9a', '#ffb0c0', '#ffffff'], speed: 90, grav: 90, size: 2 }); }
    rays(fc, '#ff7a9a', 7, 20, 300, 0.3);
    shake(4, 240); await back();
  },
  thousandwave: async m => {
    await tween(G.hero, { ox: 50 }, 140, easeIn);
    const fc = fc0();
    Sfx.play('boom');
    m.hit(0);
    fxRun(700, (c, k) => { for (let i = 0; i < 5; i++) { const kk = k - i * 0.12; if (kk > 0) pxRing(c, fc.x - 12, fc.y, kk * 60, i % 2 ? '#4fa3e0' : '#ffffff', 1); } });
    shake(5, 500);
    await wait(400); await back();
  },

  // --- Sunset Scimitar ---
  mirage: async m => {
    hold(true);
    const g = ghosts(420, '#ffb84a', 4, 9);
    await tween(G.hero, { ox: 52 }, 160, easeIn);
    const fc = fc0();
    m.hit(0);
    slashAt(fc, '#ffb84a', 0.6, 40);
    fxRun(300, (c, k) => { c.globalAlpha = 0.5 * (1 - k); pxRect(c, fc.x - 18, fc.y - 2, 36, 4, '#ffe9a8'); c.globalAlpha = 1; });
    await g; hold(false); await back();
  },
  sunsetcleave: async m => {
    hold(true);
    await tween(G.hero, { squash: 0.15 }, 160);
    Sfx.play('slash');
    screenFlash('#ff9a3a', 0.35);
    const fc = fc0();
    await arcSweep(G.hero.x + 10, 104, 90, -0.9, 0.6, '#ff9a3a', 380, 5);
    m.hit(0);
    particles(fc.x, fc.y, 24, { colors: ['#ff9a3a', '#ffd04a', '#ff5a5a'], speed: 90 });
    shake(5, 300);
    hold(false); await back();
  },

  // --- Shock Shell ---
  shellblast: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('boom');
    tween(G.hero, { ox: -6 }, 80).then(() => tween(G.hero, { ox: 0 }, 160));
    await fxRun(320, (c, k) => {
      const x = lerp(h.x + 8, fc.x, k);
      for (let i = 0; i < 4; i++) { const r = 2 + i * 3 + k * 4; pxRing(c, x - i * 6, h.y + lerp(0, fc.y - h.y, k), r, i % 2 ? '#f2c7d8' : '#ffffff', 1); }
    });
    m.hit(0); impact(fc, ['#f2c7d8', '#ffffff'], 12);
  },
  echoburst: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('charge');
    await fxRun(600, (c, k) => {
      for (let i = 0; i < 6; i++) {
        const kk = k * 1.4 - i * 0.12; if (kk <= 0 || kk >= 1) continue;
        const x = lerp(h.x + 6, fc.x, kk);
        for (let a = -0.9; a <= 0.9; a += 0.15) pxRect(c, x + Math.cos(a) * 8, h.y + lerp(0, fc.y - h.y, kk) + Math.sin(a) * 12, 1, 1, i % 2 ? '#f2c7d8' : '#ffffff');
      }
    });
    m.hit(0); Sfx.play('boom');
    ringOut(fc, '#f2c7d8', 4, 26, 400, 2); shake(3, 260);
  },
  recoilburst: async m => {
    const H = G.hero;
    await tween(H, { ox: 54 }, 150, easeIn);
    const fc = fc0();
    await fxRun(320, (c, k) => { pxCircle(c, fc.x - 12, fc.y, 2 + k * 4, '#ffffff'); pxRing(c, fc.x - 12, fc.y, 8 - k * 6, '#f2c7d8'); });
    Sfx.play('boom'); screenFlash('#ffffff', 0.8);
    m.hit(0);
    for (let i = 0; i < 4; i++) ringOut(fc, i % 2 ? '#f2c7d8' : '#ffffff', 2, 20 + i * 14, 500, 2);
    particles(fc.x, fc.y, 30, { colors: ['#f2c7d8', '#ffffff', '#ffe14a'], speed: 140 });
    shake(8, 500);
    await tween(H, { ox: -6, squash: 0.2 }, 200, easeOut);
    await back(260);
  },

  // --- Night Edge ---
  blackcrescent: async m => {
    hold(true);
    await tween(G.hero, { squash: 0.15 }, 150);
    Sfx.play('slash');
    const fc = fc0();
    const dim = fxRun(500, (c, k) => { c.globalAlpha = 0.3 * Math.sin(k * Math.PI); pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#0a0014'); c.globalAlpha = 1; });
    await projectile(heroHand(), fc, 300, (c, x, y) => {
      for (let a = -1.3; a <= 1.3; a += 0.07) { pxRect(c, x + Math.cos(a) * 10 - 6, y + Math.sin(a) * 13, 3, 2, '#3a3048'); pxRect(c, x + Math.cos(a) * 8 - 6, y + Math.sin(a) * 11, 1, 1, '#9a6ae0'); }
    });
    m.hit(0);
    particles(fc.x, fc.y, 20, { colors: ['#3a3048', '#9a6ae0', '#1b1424'], speed: 80 });
    await dim; hold(false); await back();
  },
  nightrain: async m => {
    hold(true);
    Sfx.play('slash');
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const x = fc.x + rand(-14, 14);
      await fxRun(110, (c, k) => { pxLine(c, x - 6, lerp(VIEW.y - 10, fc.y - 10, k), x + 2, lerp(VIEW.y + 4, fc.y + 6, k), '#9a6ae0', 2); pxLine(c, x - 6, lerp(VIEW.y - 10, fc.y - 10, k), x + 2, lerp(VIEW.y + 4, fc.y + 6, k), '#1b1424', 1); });
      m.hit(i);
      particles(x, fc.y, 5, { colors: ['#9a6ae0', '#3a3048'], speed: 40 });
    }
    hold(false); await wait(150);
  },
  edgeworld: async m => {
    hold(true);
    Sfx.play('boom');
    const fc = fc0();
    await fxRun(260, (c, k) => { c.globalAlpha = 0.6 * k; pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#0a0014'); c.globalAlpha = 1; });
    screenFlash('#9a6ae0', 0.8);
    fxRun(900, (c, k) => {
      const e = easeOut(Math.min(1, k * 2.5));
      const x0 = VIEW.x, y0 = VIEW.y + VIEW.h, x1 = x0 + VIEW.w * e, y1 = y0 - VIEW.h * e;
      pxLine(c, x0, y0, x1, y1, '#1b1424', 5);
      pxLine(c, x0, y0, x1, y1, '#9a6ae0', 3);
      pxLine(c, x0, y0, x1, y1, '#ffffff', 1);
    });
    shake(9, 900);
    await wait(300); m.hit(0);
    particles(fc.x, fc.y, 30, { colors: ['#9a6ae0', '#ffffff', '#1b1424'], speed: 120 });
    await wait(500); hold(false);
  },

  // --- Grizzle's Club ---
  groundpound: async m => {
    const H = G.hero;
    hold(true);
    await tween(H, { ox: 20, oy: -34 }, 240);
    await tween(H, { oy: 0 }, 120, easeIn);
    Sfx.play('boom');
    const fc = fc0();
    groundCrack(H.x + H.ox + 10, fc.x + 10, '#5a4a3a', 300);
    await wait(240);
    m.hit(0);
    for (let i = 0; i < 5; i++) particles(fc.x - 12 + i * 6, 120, 2, { colors: ['#8a7a5a', '#c9b88a'], speed: 90, grav: 140, dir: -Math.PI / 2, spread: 0.6, size: 3 });
    shake(5, 320); hold(false); await back();
  },
  mountaincrusher: async m => {
    hold(true);
    const fc = fc0();
    await tween(G.hero, { squash: 0.2 }, 200);
    Sfx.play('charge');
    await dropOn(fc, 420, (c, x, y) => { pxCircle(c, x, y - 10, 18, '#6a5a4a'); pxCircle(c, x - 4, y - 14, 10, '#8a7a5a'); pxRect(c, x + 4, y - 30, 4, 22, '#7a4a24'); });
    Sfx.play('boom'); m.hit(0);
    for (let i = 0; i < 4; i++) particles(fc.x, fc.y, 6, { colors: ['#6a5a4a', '#8a7a5a', '#c9b88a'], speed: 110, grav: 160, size: 3 });
    dust(fc.x, 20); shake(7, 500);
    hold(false); await back();
  },

  // --- Ironjaw's Axe ---
  axechop: async m => {
    hold(true);
    await tween(G.hero, { ox: 46, oy: -8 }, 140, easeIn);
    const fc = fc0();
    await arcSweep(fc.x - 16, fc.y - 10, 22, -1.8, 0.4, '#c9ccd6', 220, 4);
    m.hit(0); Sfx.play('boom');
    particles(fc.x, 118, 10, { colors: ['#ffe14a', '#ffffff'], speed: 70, grav: 120, dir: -Math.PI / 2, spread: 1.6, size: 1 });
    hold(false); await back();
  },
  spinaxe: async m => {
    hold(true);
    const img = getSprite(weaponSpec('ironaxe')), fc = fc0(), h = heroHand();
    Sfx.play('slash');
    await spinThrow(img, h, fc, 240, 2, 2, 10);
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { m.hit(i); impact({ x: fc.x + rand(-6, 6), y: fc.y + rand(-6, 6) }, ['#c9ccd6', '#ffffff'], 6); await wait(110); }
    await spinThrow(img, fc, h, 220, 2, 2, -10);
    hold(false);
  },
  ironcleave: async m => {
    hold(true);
    const fc = fc0(), img = getSprite(weaponSpec('ironaxe'));
    await tween(G.hero, { squash: 0.2 }, 200);
    await fxRun(360, (c, k) => drawRot(c, img, fc.x - 10, lerp(VIEW.y - 30, fc.y - 6, easeIn(k)), lerp(-0.4, 0.5, k), 5));
    Sfx.play('boom'); m.hit(0);
    groundCrack(fc.x - 20, fc.x + 24, '#3a3440', 260);
    shake(6, 400); hold(false); await back();
  },

  // --- Shark Saw ---
  sawslash: async m => {
    hold(true);
    await tween(G.hero, { ox: 46 }, 140, easeIn);
    const fc = fc0();
    Sfx.play('slash');
    fxRun(320, (c, k) => { const e = easeOut(Math.min(1, k * 2)); zigzag(c, fc.x - 18, fc.y - 16, lerp(fc.x - 18, fc.x + 18, e), lerp(fc.y - 16, fc.y + 16, e), 9, 3, '#e8e8f0', 2); });
    m.hit(0);
    particles(fc.x, fc.y, 12, { colors: ['#ffe14a', '#ffffff'], speed: 90, grav: 60, size: 1 });
    await wait(200); hold(false); await back();
  },
  sharkbite: async m => {
    await tween(G.hero, { ox: 44 }, 140, easeIn);
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('slash');
      await fxRun(180, (c, k) => {
        const open = 16 * (1 - easeIn(k));
        for (const dir of [-1, 1]) {
          const y = fc.y + dir * open;
          pxRect(c, fc.x - 14, y - (dir < 0 ? 3 : 0), 28, 3, '#7ab0c8');
          for (let t = 0; t < 7; t++) pxRect(c, fc.x - 13 + t * 4, dir < 0 ? y : y - 2, 2, 2, '#ffffff');
        }
      });
      m.hit(i); impact(fc, ['#7ab0c8', '#ffffff'], 6);
    }
    await back();
  },
  sharktorpedo: async m => {
    const fc = fc0(), x0 = G.hero.x + 8;
    Sfx.play('splash');
    await fxRun(520, (c, k) => {
      const x = lerp(x0, fc.x, easeIn(k));
      for (let i = 0; i < 6; i++) pxRect(c, x - 10 - i * 4, 112 + (i % 2), 3, 1, '#bfe6ff');
      pxRect(c, x - 10, 106, 20, 6, '#7ab0c8'); pxRect(c, x + 6, 108, 6, 3, '#7ab0c8');
      for (let i = 0; i < 5; i++) pxRect(c, x - 2 + i, 100 + i, 1, 6 - i, '#5a7a98');
      pxRect(c, x + 8, 108, 1, 1, PAL.k);
    });
    m.hit(0);
    particles(fc.x, 110, 24, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 100, grav: 140, dir: -Math.PI / 2, spread: 1.8 });
    shake(4, 260);
  },

  // --- Golden Hook ---
  hookrake: async m => {
    hold(true);
    await tween(G.hero, { ox: 42 }, 140, easeIn);
    const F = G.battle.F, fc = fc0();
    await arcSweep(fc.x - 4, fc.y + 4, 16, -2.6, 0.3, '#e6b422', 240, 3);
    m.hit(0);
    await tween(F, { ox: -12 }, 120);
    tween(F, { ox: 0 }, 200);
    particles(fc.x, fc.y, 10, { colors: ['#e6b422', '#fff3a0'], speed: 50 });
    hold(false); await back();
  },
  desertgrip: async m => {
    Sfx.play('fire');
    const fc = fc0();
    await fxRun(700, (c, k) => {
      for (let i = 0; i < 18; i++) {
        const a = k * 10 + i * 0.7, r = 22 * (1 - k * 0.6) * (0.5 + (i % 3) / 4);
        pxRect(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r * 0.6, 2, 2, SAND[i % 3]);
      }
      if (k > 0.5) pxRect(c, fc.x - 8, fc.y - 2, 16, 4, '#e6b422');
    });
    m.hit(0);
    particles(fc.x, fc.y, 14, { colors: SAND, speed: 50, grav: 30 });
  },
  desertblade: async m => {
    Sfx.play('fire');
    const x0 = G.hero.x + 12, fc = fc0();
    await fxRun(520, (c, k) => {
      const x = lerp(x0, fc.x + 12, k);
      for (let i = 0; i < 10; i++) { const hgt = 30 - i * 3; pxRect(c, x - i * 4, 120 - hgt, 3, hgt, SAND[i % 3]); }
      pxRect(c, x + 1, 90, 2, 30, '#fff3a0');
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { m.hit(i); slashAt(fc, '#e6b422', 1.4, 34); }
    particles(fc.x, fc.y, 20, { colors: SAND, speed: 90 });
    shake(4, 260);
  },

  // --- Thunder Staff ---
  staticjab: async m => {
    hold(true);
    await tween(G.hero, { ox: 32 }, 120, easeIn);
    const fc = fc0(), from = { x: G.hero.x + G.hero.ox + 10, y: 102 };
    Sfx.play('zap');
    fxRun(300, (c, k) => { if (Math.floor(k * 20) % 2) zigzag(c, from.x, from.y, fc.x, fc.y, 6, 3, '#fff3a0', 1); });
    await thrust(from, fc, '#e6b422', 2, 240);
    m.hit(0);
    particles(fc.x, fc.y, 10, { colors: ['#fff3a0', '#ffffff'], speed: 60, grav: 0, life: 0.3 });
    hold(false); await back();
  },
  lightninglance: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('zap');
    screenFlash('#fff6a0', 0.4);
    await fxRun(380, (c, k) => {
      const x = lerp(h.x + 6, fc.x + 10, Math.min(1, k * 1.8));
      zigzag(c, h.x + 6, h.y, x, fc.y, 8, 4, '#ffe14a', 3);
      zigzag(c, h.x + 6, h.y, x, fc.y, 8, 4, '#ffffff', 1);
      pxRect(c, x - 2, fc.y - 4, 5, 9, '#ffffff');
    });
    m.hit(0);
    particles(fc.x, fc.y, 20, { colors: ['#ffe14a', '#ffffff'], speed: 90, grav: 0 });
    shake(4, 240);
  },

  // --- Dragon Kanabo ---
  kanabosmash: async m => {
    hold(true);
    await tween(G.hero, { ox: 28, oy: -22 }, 200);
    await tween(G.hero, { ox: 50, oy: 0 }, 120, easeIn);
    const fc = fc0();
    Sfx.play('boom');
    m.hit(0);
    rays(fc, '#bfe0ff', 10, 24, 320, 0.2);
    rays(fc, '#3a3440', 5, 16, 320, 0.5);
    dust(fc.x, 14); shake(5, 300);
    hold(false); await back();
  },
  dragonquake: async m => {
    Sfx.play('boom');
    const fc = fc0();
    groundCrack(G.hero.x + 10, fc.x + 20, '#1b1424', 400);
    await wait(320);
    await fxRun(420, (c, k) => {
      const y = lerp(130, fc.y - 6, easeOut(k));
      pxCircle(c, fc.x, y, 10, '#4a8ad9'); pxRect(c, fc.x - 6, y + 4, 12, 30, '#4a8ad9');
      pxRect(c, fc.x - 4, y - 3, 2, 2, '#ffe14a'); pxRect(c, fc.x - 10, y - 12, 2, 6, '#f2e6c8'); pxRect(c, fc.x + 8, y - 12, 2, 6, '#f2e6c8');
    });
    m.hit(0); shake(6, 500);
    particles(fc.x, fc.y, 24, { colors: ['#4a8ad9', '#bfe0ff', '#ffffff'], speed: 100 });
  },
  emperorwrath: async m => {
    Sfx.play('haki');
    const fc = fc0(), img = getSprite(weaponSpec('kanabo'));
    await fxRun(400, (c, k) => { c.globalAlpha = 0.5 * k; pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#1b0010'); c.globalAlpha = 1; for (let i = 0; i < 6; i++) zigzag(c, rand(VIEW.x, VIEW.x + VIEW.w), VIEW.y, rand(VIEW.x, VIEW.x + VIEW.w), VIEW.y + VIEW.h * k, 5, 4, '#9a6ae0', 1); });
    await fxRun(320, (c, k) => drawRot(c, img, fc.x, lerp(VIEW.y - 40, fc.y - 8, easeIn(k)), 0.3, 6));
    Sfx.play('boom'); screenFlash('#ffffff', 0.9);
    m.hit(0);
    for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#9a6ae0' : '#ffffff', 2, 30 + i * 20, 600, 2);
    shake(10, 800);
    await wait(400);
  },

  // --- Meito Katana ---
  shigure: async m => {
    hold(true);
    Sfx.play('slash');
    const fc = fc0();
    await tween(G.hero, { ox: 50 }, 70, easeIn);
    fxRun(200, (c, k) => { c.globalAlpha = 1 - k; pxRect(c, G.hero.x - 4, 100, 60, 2, '#c8b0ff'); c.globalAlpha = 1; });
    await wait(180);
    m.hit(0);
    slashAt(fc, '#c8b0ff', -0.15, 46);
    particles(fc.x, fc.y, 8, { colors: ['#c8b0ff', '#ffffff'], speed: 40, grav: 0 });
    hold(false); await back(260);
  },
  twinmoon: async m => {
    hold(true);
    await tween(G.hero, { ox: 40 }, 130, easeIn);
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('slash');
      await arcSweep(fc.x, fc.y, 18, i ? 0.6 : -2.5, i ? 3.7 : 0.6, i ? '#ffffff' : '#c8b0ff', 200, 3);
      m.hit(i);
    }
    hold(false); await back();
  },
  lionsong: async m => {
    hold(true);
    const H = G.hero, fc = fc0();
    await tween(H, { squash: 0.15 }, 160);
    Sfx.play('slash');
    await tween(H, { ox: 118, squash: 0 }, 120, easeIn);
    await wait(380);
    Sfx.play('crit');
    m.hit(0);
    slashAt(fc, '#c8b0ff', 0.4, 50); slashAt(fc, '#ffffff', 0.45, 40);
    particles(fc.x, fc.y, 18, { colors: ['#c8b0ff', '#ffffff', '#ffe14a'], speed: 90 });
    shake(4, 260);
    await tween(H, { ox: 0 }, 300);
    hold(false);
  },

  // --- Seastone Jitte ---
  jittejab: async m => {
    hold(true);
    await tween(G.hero, { ox: 34 }, 120, easeIn);
    const fc = fc0();
    await thrust({ x: G.hero.x + G.hero.ox + 10, y: 102 }, fc, '#5a6a7a', 3, 220);
    m.hit(0);
    particles(fc.x, fc.y, 10, { colors: ['#9ab0c8', '#5a6a7a', '#ffffff'], speed: 50, grav: 30 });
    hold(false); await back();
  },
  seastonepin: async m => {
    hold(true);
    await tween(G.hero, { ox: 46, oy: -16 }, 180);
    await tween(G.hero, { oy: 0 }, 100, easeIn);
    const fc = fc0();
    Sfx.play('boom');
    m.hit(0);
    fxRun(600, (c, k) => { pxRing(c, fc.x, fc.y, 18 - k * 8, '#5a6a7a', 3); pxRing(c, fc.x, fc.y, 18 - k * 8, '#9ab0c8', 1); });
    hold(false); await wait(250); await back();
  },
  whiteout: async m => {
    Sfx.play('fire');
    const fc = fc0();
    await fxRun(700, (c, k) => {
      for (let i = 0; i < 26; i++) {
        const a = i * 0.9 + k * 2, r = (1 - k) * 60 + 10;
        pxCircle(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r * 0.6, 4 + (i % 3), i % 2 ? '#ffffff' : '#dfe2ea');
      }
    });
    m.hit(0);
    fxRun(400, (c, k) => { c.globalAlpha = 0.8 * (1 - k); pxRect(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, '#ffffff'); c.globalAlpha = 1; });
    shake(4, 300);
  },

  // --- Frost Mallet ---
  frostsmash: async m => {
    hold(true);
    await tween(G.hero, { ox: 46, oy: -12 }, 160);
    await tween(G.hero, { oy: 0 }, 100, easeIn);
    const fc = fc0();
    Sfx.play('ice');
    m.hit(0);
    for (let i = 0; i < 8; i++) { const a = -Math.PI + i * Math.PI / 7; particles(fc.x + Math.cos(a) * 8, fc.y + Math.sin(a) * 8, 1, { colors: ICE, speed: 80, grav: 120, size: 3 }); }
    rays(fc, '#bff2ff', 8, 20, 300);
    hold(false); await back();
  },
  snowslide: async m => {
    Sfx.play('ice');
    const fc = fc0();
    await fxRun(620, (c, k) => {
      for (let i = 0; i < 40; i++) {
        const x = lerp(-20, fc.x + 20, k) - (i % 10) * 6, y = 40 + (i * 7) % 80 + k * 10;
        pxRect(c, x, y, 3, 3, i % 4 ? '#ffffff' : '#bff2ff');
      }
    });
    m.hit(0);
    particles(fc.x, fc.y, 20, { colors: ['#ffffff', '#bff2ff'], speed: 70, grav: 60 });
  },
  avalanche: async m => {
    Sfx.play('charge');
    const fc = fc0();
    await dropOn(fc, 480, (c, x, y, k) => { pxCircle(c, x, y - 4, 20, '#e8f6ff'); pxCircle(c, x - 6, y - 10, 9, '#ffffff'); pxRing(c, x, y - 4, 20, '#9ad8f0', 1); });
    Sfx.play('boom'); m.hit(0);
    particles(fc.x, fc.y, 36, { colors: ['#ffffff', '#bff2ff', '#9ad8f0'], speed: 120, grav: 100, size: 3 });
    screenFlash('#ffffff', 0.5); shake(7, 500);
  },

  // --- Royal Scepter ---
  royaldecree: async m => {
    hold(true);
    await tween(G.hero, { ox: 46 }, 140, easeIn);
    const fc = fc0();
    m.hit(0); Sfx.play('coin');
    fxRun(500, (c, k) => {
      const y = fc.y - 20 - k * 10;
      pxRect(c, fc.x - 6, y, 13, 4, '#e6b422'); for (let i = 0; i < 3; i++) pxRect(c, fc.x - 6 + i * 6, y - 3, 1, 3, '#e6b422');
      pxRect(c, fc.x, y + 1, 1, 1, '#d63c2f');
    });
    particles(fc.x, fc.y, 14, { colors: ['#ffe14a', '#e6b422', '#ffffff'], speed: 70, grav: 40 });
    hold(false); await back();
  },
  tinbarrage: async m => {
    const fc = fc0(), h = heroHand();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('slash');
      await fxRun(180, (c, k) => {
        const x = lerp(h.x, fc.x, k), y = lerp(h.y - 6 + i * 6, fc.y, k), a = k * 12;
        pxRect(c, x - 4, y - Math.abs(Math.cos(a)) * 4, 8, Math.max(1, Math.abs(Math.cos(a)) * 8), '#c9ccd6');
        pxRect(c, x - 3, y, 6, 1, '#ffffff');
      });
      m.hit(i); impact(fc, ['#c9ccd6', '#ffffff'], 6);
    }
  },
  kingdomcrusher: async m => {
    const fc = fc0();
    Sfx.play('charge');
    await dropOn(fc, 460, (c, x, y) => {
      pxRect(c, x - 22, y - 10, 44, 16, '#e6b422');
      for (let i = 0; i < 5; i++) pxRect(c, x - 22 + i * 10, y - 20, 4, 10, '#e6b422');
      pxRect(c, x - 22, y - 10, 44, 2, '#fff3a0');
      for (let i = 0; i < 3; i++) pxRect(c, x - 14 + i * 12, y - 4, 4, 4, '#d63c2f');
    });
    Sfx.play('boom'); m.hit(0);
    particles(fc.x, fc.y, 30, { colors: ['#e6b422', '#fff3a0', '#d63c2f'], speed: 120 });
    shake(8, 500);
  },

  // --- Circus Knives ---
  knifetoss: async m => {
    const fc = fc0(), h = heroHand();
    const img = getSprite({ kind: 'weapon', shape: 'sword', pal: { w: '#e8e8f0', G: '#d63c2f', n: '#3a2433' } });
    Sfx.play('slash');
    const runs = [0, 1, 2].map(i => spinThrow(img, { x: h.x, y: h.y - 6 + i * 6 }, { x: fc.x, y: fc.y - 8 + i * 8 }, 260 + i * 60, 3, 1, 8));
    await runs[0]; m.hit(0); await Promise.all(runs);
    impact(fc, ['#e8e8f0', '#d63c2f'], 10);
  },
  bladefan: async m => {
    const fc = fc0(), h = heroHand();
    Sfx.play('slash');
    await fxRun(360, (c, k) => {
      for (let i = 0; i < 7; i++) {
        const a = -0.6 + i * 0.2, d = 70 * k;
        const x = h.x + Math.cos(a) * d * (1 - k) + (fc.x - h.x) * k, y = h.y + Math.sin(a) * 30 * Math.sin(k * Math.PI) + (fc.y - h.y) * k;
        pxLine(c, x - 4, y, x + 3, y, '#e8e8f0', 1); pxRect(c, x - 5, y, 1, 1, '#d63c2f');
      }
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { m.hit(i); impact({ x: fc.x + rand(-6, 6), y: fc.y + rand(-8, 8) }, null, 5); await wait(60); }
  },
  grandfinale: async m => {
    const fc = fc0();
    Sfx.play('win');
    await fxRun(700, (c, k) => {
      for (let i = 0; i < 12; i++) {
        const x = fc.x - 30 + i * 5, y = lerp(-10 - (i % 4) * 12, fc.y, Math.min(1, k * 1.4));
        pxLine(c, x, y - 6, x, y, '#e8e8f0', 1); pxRect(c, x, y - 8, 1, 2, '#d63c2f');
      }
      for (let i = 0; i < 6; i++) pxRect(c, VIEW.x + (i * 31 + k * 60) % VIEW.w, VIEW.y + (i * 17 + k * 90) % (60 - VIEW.y), 2, 2, ['#ff5a5a', '#ffd04a', '#7cd0ff'][i % 3]);
    });
    m.hit(0);
    particles(fc.x, fc.y, 30, { colors: ['#ff5a5a', '#ffd04a', '#7cd0ff', '#7cff7a'], speed: 100, grav: 80 });
    shake(4, 300);
  },

  // --- Hypno Chakram ---
  ringtoss: async m => {
    const img = getSprite(weaponSpec('chakram')), fc = fc0(), h = heroHand();
    Sfx.play('slash');
    await spinThrow(img, h, fc, 260, 3, 2, 14);
    m.hit(0); impact(fc, ['#c94a9a', '#ffffff'], 8);
    await spinThrow(img, fc, h, 240, 3, 2, -14);
  },
  hypnotize: async m => {
    const fc = fc0(), h = heroHand(), img = getSprite(weaponSpec('chakram'));
    Sfx.play('charge');
    await fxRun(700, (c, k) => {
      drawRot(c, img, h.x + 10 + Math.sin(k * 18) * 8, h.y - 10 + Math.abs(Math.cos(k * 18)) * 4, Math.sin(k * 18) * 0.6, 2);
      for (let i = 0; i < 3; i++) pxRing(c, fc.x, fc.y - 6, (k * 30 + i * 6) % 18, i % 2 ? '#c94a9a' : '#ffffff', 1);
    });
    m.hit(0);
    floatText(fc.x + 10, foeTop() - 8, 'ZZZ', '#c94a9a');
  },
  ringstorm: async m => {
    const fc = fc0(), img = getSprite(weaponSpec('chakram'));
    Sfx.play('slash');
    const orbit = fxRun(160 * m.hits + 200, (c, k) => {
      for (let i = 0; i < 4; i++) { const a = k * 14 + i * Math.PI / 2; drawRot(c, img, fc.x + Math.cos(a) * 20, fc.y + Math.sin(a) * 12, a * 2, 1); }
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { await wait(160); m.hit(i); impact({ x: fc.x + rand(-10, 10), y: fc.y + rand(-8, 8) }, ['#c94a9a', '#ffffff'], 5); }
    await orbit;
  },

  // --- Chef's Cleaver ---
  cleaverchop: async m => {
    hold(true);
    await tween(G.hero, { ox: 46, oy: -10 }, 150);
    const fc = fc0();
    await tween(G.hero, { oy: 0 }, 80, easeIn);
    Sfx.play('slash');
    m.hit(0);
    slashAt(fc, '#e8e8f0', Math.PI / 2, 36);
    particles(fc.x, fc.y + 10, 8, { colors: ['#7cff7a', '#ff9a3a', '#ffffff'], speed: 60, grav: 120 });
    hold(false); await back();
  },
  mince: async m => {
    hold(true);
    await tween(G.hero, { ox: 46 }, 140, easeIn);
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('slash');
      const x = fc.x - 12 + (i % 4) * 8;
      fxRun(120, (c, k) => pxLine(c, x, fc.y - 18, x, lerp(fc.y - 18, fc.y + 16, easeOut(k)), '#e8e8f0', 2));
      G.hero.oy = i % 2 ? -3 : 0;
      m.hit(i); await wait(90);
    }
    G.hero.oy = 0; hold(false); await back();
  },
  grandcleave: async m => {
    const fc = fc0(), img = getSprite(weaponSpec('cleaver'));
    await tween(G.hero, { squash: 0.15 }, 160);
    await fxRun(360, (c, k) => drawRot(c, img, fc.x, lerp(VIEW.y - 30, fc.y - 6, easeIn(k)), 0, 6));
    Sfx.play('boom'); m.hit(0);
    slashAt(fc, '#ffffff', Math.PI / 2, 60);
    shake(6, 400); await back();
  },

  // --- Buggy Cannon ---
  cannonshot: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('boom');
    tween(G.hero, { ox: -10 }, 80).then(() => tween(G.hero, { ox: 0 }, 220));
    particles(h.x + 14, h.y, 14, { colors: SMOKE, speed: 40, grav: -20, size: 3 });
    await projectile({ x: h.x + 14, y: h.y }, fc, 300, (c, x, y) => { pxCircle(c, x, y, 5, PAL.k); pxCircle(c, x - 2, y - 2, 1, '#9aa4b1'); });
    m.hit(0);
    particles(fc.x, fc.y, 22, { colors: FIRE.concat(['#3a3440']), speed: 100 });
    shake(4, 260);
  },
  scattershot: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('boom');
    await fxRun(320, (c, k) => {
      for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.12; const x = lerp(h.x + 12, fc.x, k), y = lerp(h.y, fc.y, k) + Math.sin(a) * 60 * k * (1 - k); pxCircle(c, x, y, 2, PAL.k); }
    });
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) { m.hit(i); impact({ x: fc.x + rand(-10, 10), y: fc.y + rand(-10, 10) }, FIRE, 6); await wait(70); }
  },
  buggyball: async m => {
    const h = heroHand(), fc = fc0();
    Sfx.play('charge');
    await fxRun(700, (c, k) => {
      const x = lerp(h.x + 8, fc.x, k), y = lerp(h.y - 6, fc.y, k) - Math.sin(k * Math.PI) * 36;
      pxCircle(c, x, y, 8, PAL.k); pxCircle(c, x, y, 7, '#d63c2f'); pxRect(c, x - 7, y - 1, 15, 2, '#ffffff');
      drawText(c, 'B', x - 1, y - 6, { color: '#ffe14a', shadow: null });
      pxRect(c, x + 3, y - 11, 1, 3, '#c9b88a'); pxRect(c, x + 2, y - 13, 3, 2, pick(FIRE));
    });
    Sfx.play('boom'); screenFlash('#ffd04a', 0.7);
    m.hit(0);
    for (let i = 0; i < 3; i++) ringOut(fc, ['#ffe14a', '#ff5a2a', '#ffffff'][i], 4, 30 + i * 8, 500, 3);
    particles(fc.x, fc.y, 40, { colors: FIRE.concat(['#d63c2f', '#ffffff']), speed: 140 });
    shake(8, 500);
  },

  // --- Cat Claws ---
  catswipe: async m => {
    hold(true);
    await tween(G.hero, { ox: 50 }, 110, easeIn);
    const fc = fc0();
    m.hit(0);
    slashMarks(fc, 5, '#e8e8f0', 30, 1.2, 3);
    hold(false); await back(160);
  },
  silentsteps: async m => {
    const H = G.hero;
    Sfx.play('miss');
    await tween(H, { alpha: 0 }, 120);
    const fc = fc0();
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const a = i * 2.1;
      slashMarks({ x: fc.x + Math.cos(a) * 8, y: fc.y + Math.sin(a) * 8 }, 3, '#d9d9e0', 22, a, 3);
      m.hit(i); await wait(120);
    }
    await tween(H, { alpha: 1 }, 160);
  },
  hundredplans: async m => {
    const fc = fc0();
    const g = ghosts(700, '#d9d9e0', 6, -14);
    Sfx.play('slash');
    await fxRun(600, (c, k) => { for (let i = 0; i < 10; i++) { const a = i * 0.63 + k * 3; const r = 30 * (1 - k) + 6; pxLine(c, fc.x + Math.cos(a) * r, fc.y + Math.sin(a) * r, fc.x + Math.cos(a) * (r - 8), fc.y + Math.sin(a) * (r - 8), '#ffffff', 1); } });
    m.hit(0);
    slashMarks(fc, 5, '#ffffff', 40, 0.9, 4); slashMarks(fc, 5, '#d9d9e0', 40, -0.9, 4);
    shake(5, 300);
    await g;
  },

  // --- Battle Spear ---
  spearthrust: async m => {
    hold(true);
    await tween(G.hero, { ox: 26 }, 120, easeIn);
    const fc = fc0();
    await thrust({ x: G.hero.x + G.hero.ox + 10, y: 102 }, { x: fc.x + 14, y: fc.y }, '#7a4a24', 2, 240);
    m.hit(0);
    rays({ x: fc.x + 14, y: fc.y }, '#e6b422', 4, 10, 200);
    hold(false); await back();
  },
  explodingtip: async m => {
    hold(true);
    await tween(G.hero, { ox: 26 }, 120, easeIn);
    const fc = fc0();
    await thrust({ x: G.hero.x + G.hero.ox + 10, y: 102 }, fc, '#7a4a24', 2, 220);
    Sfx.play('boom'); m.hit(0);
    ringOut(fc, '#ff9a3a', 2, 16, 300, 3);
    particles(fc.x, fc.y, 20, { colors: FIRE, speed: 100 });
    shake(4, 240); hold(false); await back();
  },
  warspear: async m => {
    hold(true);
    const fc = fc0(), h = heroHand(), img = getSprite(weaponSpec('battlespear'));
    await tween(G.hero, { ox: -8, squash: 0.15 }, 200);
    Sfx.play('fire');
    await fxRun(360, (c, k) => {
      const x = lerp(h.x, fc.x, easeIn(k)), y = lerp(h.y - 10, fc.y, k);
      for (let i = 0; i < 4; i++) particles(x - 16, y, 1, { colors: FIRE, speed: 20, grav: -30, life: 0.3 });
      drawRot(c, img, x, y, Math.PI / 2, 3);
    });
    Sfx.play('boom'); screenFlash('#ff9a3a', 0.6);
    m.hit(0);
    particles(fc.x, fc.y, 36, { colors: FIRE, speed: 130 });
    shake(7, 450); hold(false); await back();
  },

  // --- Devil Fruits ---
  doughavalanche: async m => {
    Sfx.play('stretch');
    const fc = fc0();
    await fxRun(700, (c, k) => {
      for (let i = 0; i < 12; i++) {
        const x = fc.x - 26 + (i % 6) * 10, y = lerp(-20 - Math.floor(i / 6) * 20, fc.y - 4 + Math.floor(i / 6) * 8, Math.min(1, easeIn(k * 1.2)));
        pxCircle(c, x, y, 7, '#c9a26a'); pxCircle(c, x - 1, y - 1, 6, '#efe2c8'); pxCircle(c, x - 3, y - 3, 2, '#fffaf0');
      }
    });
    m.hit(0); Sfx.play('boom'); shake(5, 400);
    particles(fc.x, fc.y, 20, { colors: ['#efe2c8', '#c9a26a'], speed: 70, grav: 120, size: 3 });
  },
  festival: async m => {
    const fc = fc0();
    Sfx.play('stretch');
    const parts = ['fist', 'foot', 'fist', 'head', 'fist', 'foot'];
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      const from = { x: [20, 100, 0, 192, 60, 160][i % 6], y: [10, 0, 80, 20, -10, 128][i % 6] }, part = parts[i % parts.length];
      await projectile(from, fc, 140, (c, x, y) => {
        if (part === 'head') { pxCircle(c, x, y, 4, PAL.k); pxCircle(c, x, y, 3, '#f7e0d0'); pxRect(c, x - 2, y + 1, 4, 1, '#d63c2f'); pxRect(c, x - 2, y - 4, 4, 2, '#3b6fd6'); }
        else if (part === 'foot') { pxRect(c, x - 3, y - 2, 7, 4, PAL.k); pxRect(c, x - 2, y - 1, 5, 2, '#3a3440'); }
        else { pxCircle(c, x, y, 3, PAL.k); pxCircle(c, x, y, 2, '#f7e0d0'); }
      });
      m.hit(i); impact(fc, ['#ffffff', '#d63c2f'], 5);
    }
  },
  magmafist: async m => {
    Sfx.play('fire');
    const fc = fc0();
    await projectile(heroHand(), fc, 360, (c, x, y) => {
      pxCircle(c, x, y, 8, '#5a1a1a'); pxCircle(c, x, y, 6, '#c0301a'); pxCircle(c, x, y, 3, '#ff9a3a');
      for (let i = 0; i < 3; i++) pxRect(c, x - 6 + i * 4, y + 6 + (i % 2) * 2, 2, 2, '#ff5a2a');
      particles(x, y, 2, { colors: ['#ff5a2a', '#5a1a1a'], speed: 15, grav: 80, life: 0.4 });
    });
    m.hit(0);
    particles(fc.x, fc.y, 30, { colors: ['#ff5a2a', '#5a1a1a', '#ffd04a'], speed: 100, grav: 120 });
    shake(4, 260);
  },
  lavaflood: async m => {
    Sfx.play('fire');
    const x0 = G.hero.x + 12, fc = fc0();
    await fxRun(640, (c, k) => {
      const x = lerp(x0, fc.x + 20, k);
      for (let i = 0; i < 20; i++) {
        const hh = (14 + Math.sin(i + G.t * 8) * 3) * (1 - i / 22);
        pxRect(c, x - i * 3, 122 - hh, 3, hh, i % 3 ? '#c0301a' : '#5a1a1a');
        pxRect(c, x - i * 3, 122 - hh, 3, 1, '#ffd04a');
      }
    });
    m.hit(0);
    particles(fc.x, fc.y, 26, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 90, grav: 100 });
  },
  puppet: async m => {
    const fc = fc0(), F = G.battle.F;
    Sfx.play('stretch');
    await fxRun(320, (c, k) => { for (let i = 0; i < 5; i++) pxLine(c, fc.x - 12 + i * 6, VIEW.y, fc.x - 12 + i * 6, lerp(VIEW.y, fc.y - 10 + (i % 2) * 6, k), '#f2f2f2', 1); });
    m.hit(0);
    const strings = fxRun(700, c => { for (let i = 0; i < 5; i++) pxLine(c, fc.x - 12 + i * 6, VIEW.y, fc.x - 12 + i * 6 + F.ox, fc.y - 10 + (i % 2) * 6, '#f2f2f2', 1); });
    for (let i = 0; i < 4; i++) { await tween(F, { ox: i % 2 ? 6 : -6, oy: -4 }, 80); }
    await tween(F, { ox: 0, oy: 0 }, 120);
    await strings;
  },
  repel: async m => {
    const F = G.battle.F;
    await tween(G.hero, { ox: 46 }, 140, easeIn);
    const fc = fc0();
    Sfx.play('boom');
    m.hit(0);
    fxRun(400, (c, k) => {
      for (let i = 0; i < 3; i++) { const x = fc.x - 10 + k * 30 + i * 6; pxCircle(c, x, fc.y, 4, '#f2c7d8'); pxCircle(c, x, fc.y - 7, 2, '#f2c7d8'); pxCircle(c, x + 4, fc.y - 5, 2, '#f2c7d8'); }
    });
    await tween(F, { ox: 20 }, 160);
    tween(F, { ox: 0 }, 300);
    await back();
  },
  bearshock: async m => {
    const fc = fc0(), h = heroHand();
    Sfx.play('charge');
    await fxRun(500, (c, k) => {
      const r = 4 + k * 10;
      pxCircle(c, h.x + 14, h.y - 10, r, '#f2c7d8'); pxCircle(c, h.x + 14, h.y - 10, r - 2, '#ffffff');
      for (let t = -1; t <= 1; t++) pxCircle(c, h.x + 14 + r + 2, h.y - 10 + t * (r - 2), 3, '#f2c7d8');
    });
    await projectile({ x: h.x + 14, y: h.y - 10 }, fc, 280, (c, x, y) => { pxCircle(c, x, y, 14, '#f2c7d8'); pxCircle(c, x, y, 12, '#ffffff'); });
    Sfx.play('boom'); screenFlash('#ffffff', 0.7);
    m.hit(0);
    for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#f2c7d8' : '#ffffff', 6, 40 + i * 10, 500, 3);
    shake(8, 500);
  },
};

// Blade moves (Buggy splits away from them) and shots (Wapol eats them).
const SLASH_MOVES = ['swing', 'multislash', 'crescent', 'sandslash', 'rustyslash', 'ironrule', 'saberflurry', 'justice', 'mirage', 'sunsetcleave',
  'blackcrescent', 'nightrain', 'edgeworld', 'axechop', 'spinaxe', 'ironcleave', 'sawslash', 'sharkbite', 'hookrake', 'desertblade', 'shigure',
  'twinmoon', 'lionsong', 'cleaverchop', 'mince', 'grandcleave', 'catswipe', 'silentsteps', 'hundredplans', 'dragonclaw', 'claw'];
const SHOT_MOVES = ['shot', 'quickdraw', 'trickshot', 'knifetoss', 'bladefan', 'grandfinale', 'ringtoss', 'ringstorm', 'cannonshot', 'scattershot',
  'buggyball', 'bomb', 'tinbarrage', 'gun', 'cannon', 'throw'];
