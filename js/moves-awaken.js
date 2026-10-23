'use strict';
/* Devil Fruit awakening: the transformation and every awakened move. */

// Helpers shared by the awakened moves.
const AW = {
  // A cartoon fist facing right, outlined, radius r.
  fist(c, x, y, r) {
    r = Math.round(r);
    const kn = i => [x + Math.round(r * 0.7), y - Math.round(r * 0.6) + Math.round(i * r * 0.4), Math.round(r * 0.32)];
    pxCircle(c, x, y, r + 2, PAL.k);
    for (let i = 0; i < 4; i++) { const [kx, ky, kr] = kn(i); pxCircle(c, kx, ky, kr + 2, PAL.k); }
    pxCircle(c, x, y, r, '#ffffff');
    for (let i = 0; i < 4; i++) { const [kx, ky, kr] = kn(i); pxCircle(c, kx, ky, kr, '#ffffff'); }
    for (let i = 1; i < 4; i++) { const ky = y - Math.round(r * 0.8) + Math.round(i * r * 0.4); pxLine(c, x + Math.round(r * 0.4), ky, x + Math.round(r * 0.9), ky, '#c9ccd6'); }
    pxRect(c, x - r - 10, y - Math.round(r * 0.35), 12, Math.round(r * 0.7), PAL.k);
    pxRect(c, x - r - 10, y - Math.round(r * 0.35) + 2, 12, Math.round(r * 0.7) - 4, '#e8e8f0');
  },
  part(c, kind, x, y, s) {
    if (kind === 'head') { pxCircle(c, x, y, 5 * s, PAL.k); pxCircle(c, x, y, 4 * s, '#f7e0d0'); pxRect(c, x - 4 * s, y - 5 * s, 8 * s, 2 * s, '#3b6fd6'); pxCircle(c, x, y + s, s + 1, '#d63c2f'); }
    else if (kind === 'foot') { pxRect(c, x - 4 * s, y - 2 * s, 8 * s, 5 * s, PAL.k); pxRect(c, x - 3 * s, y - s, 6 * s, 3 * s, '#3a3440'); }
    else { pxCircle(c, x, y, 4 * s, PAL.k); pxCircle(c, x, y, 3 * s, '#f7e0d0'); pxRect(c, x + s, y - 2 * s, s, 4 * s, '#d8b8a0'); }
  },
  // Thick braided string from (x0,y0) toward (x1,y1), revealed up to fraction e.
  braid(c, x0, y0, x1, y1, e) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) * e / 2));
    for (let i = 0; i <= n; i++) {
      const k = (i / n) * e, x = lerp(x0, x1, k), y = lerp(y0, y1, k);
      pxRect(c, x - 1, y - 1, 3, 3, PAL.k);
      pxRect(c, x - 1, y - 1, 2, 2, i % 2 ? '#ffffff' : '#ff8ab0');
    }
  },
  // A wolf-like magma hound facing right at (x,y), jaw open by `open` pixels.
  hound(c, x, y, open, t) {
    pxCircle(c, x - 14, y + 4, 12, '#5a1a1a');
    pxRect(c, x - 26, y + 10, 4, 12, '#5a1a1a'); pxRect(c, x - 8, y + 10, 4, 12, '#5a1a1a');
    pxCircle(c, x, y - 2, 10, '#8a2a1a');
    pxRect(c, x - 6, y - 16, 4, 7, '#8a2a1a'); pxRect(c, x + 2, y - 16, 4, 7, '#8a2a1a');
    pxRect(c, x + 6, y - 6 - open / 2, 14, 5, '#8a2a1a');
    pxRect(c, x + 6, y + 1 + open / 2, 12, 4, '#5a1a1a');
    for (let i = 0; i < 3; i++) { pxRect(c, x + 8 + i * 4, y - 1 - open / 2, 2, 2, '#ffffff'); pxRect(c, x + 8 + i * 4, y + open / 2, 2, 2, '#ffffff'); }
    pxRect(c, x + 2, y - 5, 2, 2, '#ffe14a');
    for (let i = 0; i < 5; i++) pxRect(c, x - 20 + i * 6, y - 4 + ((i * 7 + Math.floor(t * 10)) % 9), 2, 2, i % 2 ? '#ff9a3a' : '#ffd04a');
  },
};

Object.assign(MOVE_FX, {
  // The transformation cut-in when you awaken in battle.
  awaken: async a => {
    const hc = heroC(), cols = a.colors || ['#ffffff', '#ffe9a8'];
    const lum = h => { const [r, g, b] = hexToRgb(h); return r * 0.3 + g * 0.59 + b * 0.11; };
    const [c2, c1] = [cols[0], cols[1] || '#ffffff'].map(h => mixColor(h, '#ffffff', 0.35)).sort((x, y) => lum(x) - lum(y)).reverse().map((h, i) => (i ? h : mixColor(h, '#ffffff', 0.3)));
    const title = String(a.name || 'Awakening').toUpperCase();
    Sfx.play('haki');
    screenFlash('#ffffff', 0.9);
    shake(4, 600);
    const band = fxRun(1900, (c, k) => {
      const al = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
      c.globalAlpha = 0.8 * al;
      pxRect(c, 0, 16, W, 26, '#05081a');
      c.globalAlpha = al;
      pxRect(c, 0, 16, W, 1, c1); pxRect(c, 0, 41, W, 1, c1);
      drawText(c, title, W / 2 + Math.round((1 - Math.min(1, k * 5)) * 40), 20, { color: c2, scale: 2, align: 'center' });
      drawText(c, 'AWAKENING', W / 2, 34, { color: c1, align: 'center' });
      c.globalAlpha = 1;
    });
    const aura = fxRun(1900, (c, k) => {
      for (let i = 0; i < 3; i++) pxRing(c, hc.x, hc.y - 6, ((k * 3 + i / 3) % 1) * 34, i % 2 ? c1 : c2, 1);
      if (Math.random() < 0.7) particles(hc.x + rand(-10, 10), hc.y + 10, 1, { colors: [c1, c2, '#ffffff'], speed: 30, grav: -70, life: 0.6 });
    });
    tween(G.hero, { squash: -0.12 }, 200).then(() => tween(G.hero, { squash: 0 }, 400));
    let flourish;
    switch (a.fruit) {
      case 'rubber':
        flourish = (async () => {
          for (let i = 0; i < 5; i++) {
            Sfx.play('boom');
            floatText(hc.x + rand(-26, 26), 62 + rand(-10, 8), i % 2 ? 'DOKUN' : 'DON', '#ffffff', 2);
            ringOut({ x: hc.x, y: hc.y - 6 }, '#ffffff', 4, 44, 320, 2);
            await wait(340);
          }
        })();
        break;
      case 'flame':
        Sfx.play('fire');
        flourish = fxRun(1400, (c, k) => {
          const h = Math.min(1, k * 3) * 110;
          for (let i = 0; i < 5; i++) { const w = 18 - i * 3 + Math.sin(G.t * 30 + i) * 2; pxRect(c, hc.x - w / 2, hc.y + 18 - h + i * 7, w, h - i * 7, FIRE[i % 4]); }
        });
        break;
      case 'frost':
        Sfx.play('ice');
        flourish = fxRun(1300, (c, k) => {
          for (let i = 0; i < 10; i++) {
            const a2 = i * 0.63, r = 8 + Math.min(1, k * 2) * 22;
            const x = hc.x + Math.cos(a2) * r, y = hc.y - 6 + Math.sin(a2) * r;
            pxLine(c, hc.x + Math.cos(a2) * (r - 8), hc.y - 6 + Math.sin(a2) * (r - 8), x, y, i % 2 ? '#bff2ff' : '#ffffff', 2);
          }
        });
        break;
      case 'quake':
        Sfx.play('boom');
        shake(7, 1200);
        flourish = fxRun(1300, (c, k) => {
          for (let i = 0; i < 6; i++) { const a2 = i * 1.05 + 0.3, r = Math.min(1, k * 2) * 60; zigzag(c, hc.x, hc.y - 6, hc.x + Math.cos(a2) * r, hc.y - 6 + Math.sin(a2) * r, 5, 3, '#ffffff', 1); }
        });
        break;
      case 'smoke':
        Sfx.play('fire');
        flourish = fxRun(1400, (c, k) => {
          for (let i = 0; i < 12; i++) { const a2 = G.t * 6 + i * 0.52, r = 26 - k * 10; pxCircle(c, hc.x + Math.cos(a2) * r, hc.y - 6 + Math.sin(a2) * r * 0.8, 4, i % 2 ? '#ffffff' : '#dfe2ea'); }
        });
        break;
      case 'light':
        Sfx.play('zap');
        flourish = rays({ x: hc.x, y: hc.y - 6 }, '#fff3a0', 14, 70, 1300, 0.1);
        break;
      case 'dough':
        Sfx.play('stretch');
        flourish = fxRun(1400, (c, k) => {
          for (let i = 0; i < 4; i++) { const kk = (k * 2 + i * 0.25) % 1; pxRing(c, hc.x, 120, kk * 60, i % 2 ? '#efe2c8' : '#c9a26a', 2); }
        });
        break;
      case 'dragon':
        flourish = (async () => { for (let i = 0; i < 3; i++) { await fxBolt(hc.x + rand(-14, 14), hc.y - 4, 1.2); } })();
        break;
      case 'split':
        Sfx.play('win');
        flourish = (async () => {
          for (let i = 0; i < 6; i++) { particles(rand(20, 170), rand(0, 20), 10, { colors: ['#ff5a5a', '#ffd04a', '#7cd0ff', '#7cff7a', '#ff8ab0'], speed: 40, grav: 60, life: 1.2 }); await wait(200); }
        })();
        break;
      case 'magma':
        Sfx.play('fire');
        flourish = (async () => {
          for (let i = 0; i < 6; i++) { particles(hc.x + rand(-24, 24), 120, 10, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 110, grav: 160, dir: -Math.PI / 2, spread: 0.6, size: 3 }); await wait(200); }
        })();
        break;
      case 'string':
        Sfx.play('slash');
        flourish = fxRun(1300, (c, k) => {
          for (let i = 0; i < 9; i++) { const x = hc.x - 32 + i * 8, e = Math.min(1, k * 2.5 - i * 0.08); if (e > 0) pxLine(c, x, -2, x, lerp(-2, hc.y + 16, e), i % 2 ? '#ffffff' : '#ff8ab0', 1); }
        });
        break;
      case 'paw':
        Sfx.play('charge');
        flourish = fxRun(1400, (c, k) => {
          for (let i = 0; i < 5; i++) {
            const y = 120 - ((k * 90 + i * 22) % 90), x = hc.x - 30 + i * 15;
            c.globalAlpha = 0.6;
            pxCircle(c, x, y, 4, '#f2c7d8'); pxCircle(c, x - 4, y - 5, 2, '#f2c7d8'); pxCircle(c, x, y - 7, 2, '#f2c7d8'); pxCircle(c, x + 4, y - 5, 2, '#f2c7d8');
            c.globalAlpha = 1;
          }
        });
        break;
      default:
        flourish = wait(1200);
    }
    await Promise.all([band, aura, flourish]);
    G.hero.squash = 0;
  },

  // --- Rubber: Gear 5 ---
  bajrang: async m => {
    const fc = fc0();
    Sfx.play('charge');
    await tween(G.hero, { ox: -8, squash: 0.2 }, 280);
    Sfx.play('boom');
    await fxRun(420, (c, k) => {
      const x = lerp(-70, fc.x - 26, easeIn(k));
      for (let i = 0; i < 8; i++) pxRect(c, x - 70 - i * 9, fc.y - 30 + i * 8, 40, 1, '#ffffff');
      AW.fist(c, x, fc.y, 32);
    });
    m.hit(0);
    screenFlash('#ffffff', 1);
    for (let i = 0; i < 3; i++) ringOut(fc, i % 2 ? '#ffe9a8' : '#ffffff', 6, 50 + i * 24, 600, 3);
    rays(fc, '#ffffff', 16, 70, 500);
    particles(fc.x, fc.y, 40, { colors: ['#ffffff', '#ffe9a8', '#f2f2f2'], speed: 160 });
    shake(12, 800);
    floatText(fc.x, foeTop() - 12, 'BAJRANG!!', '#ffffff', 2);
    const hold2 = fxRun(500, (c, k) => { c.globalAlpha = 1 - k; AW.fist(c, fc.x - 26 - k * 30, fc.y, 32); c.globalAlpha = 1; });
    await tween(G.hero, { ox: 0, squash: 0 }, 300);
    await hold2;
  },
  toonforce: async m => {
    const F = G.battle.F, fc = fc0();
    Sfx.play('stretch');
    const ground = fxRun(1500, (c, k) => {
      for (let j = 0; j < 3; j++) for (let x = 0; x < W; x += 2) {
        const y = 112 + j * 5 + Math.sin(x * 0.12 + G.t * 14 + j) * 4 * (1 - k);
        pxRect(c, x, y, 2, 1, j % 2 ? '#ffffff' : '#ffe9a8');
      }
    });
    const eyes = fxRun(1300, (c, k) => {
      const pop = Math.min(1, k * 3) * 14, ey = foeTop() + 4;
      for (const dx of [-8, 8]) {
        const x = fc.x + F.ox + dx + pop * 0.6, y = ey + F.oy - pop * 0.3;
        pxLine(c, fc.x + F.ox + dx * 0.4, ey + 8 + F.oy, x, y, '#ffffff', 2);
        pxCircle(c, x, y, 7, PAL.k); pxCircle(c, x, y, 6, '#ffffff'); pxCircle(c, x + 2, y, 2, PAL.k);
      }
    });
    floatText(fc.x, foeTop() - 14, 'BOING', '#ffe14a', 2);
    m.hit(0);
    for (const [sq, oy, ms] of [[0.4, 0, 140], [-0.35, -30, 200], [0.3, 0, 160], [-0.2, -14, 150], [0.15, 0, 120], [0, 0, 120]]) {
      await tween(F, { squash: sq, oy }, ms, oy ? easeOut : easeIn);
      if (!oy && sq > 0.2) { Sfx.play('stretch'); floatText(fc.x + rand(-14, 14), foeTop() - 8, 'BOING', '#ffffff'); }
    }
    F.squash = 0; F.oy = 0;
    await Promise.all([ground, eyes]);
  },

  // --- Flame: Flame Emperor ---
  entei: async m => {
    const hc = heroC(), sx = hc.x + 14, sy = 22, fc = fc0();
    Sfx.play('charge');
    await tween(G.hero, { oy: -4 }, 200);
    await fxRun(800, (c, k) => {
      const r = 3 + easeOut(k) * 20;
      for (let i = 0; i < 12; i++) { const a = i * 0.52 + G.t * 3; pxLine(c, sx + Math.cos(a) * r, sy + Math.sin(a) * r, sx + Math.cos(a) * (r + 6 + (i % 3) * 3), sy + Math.sin(a) * (r + 6 + (i % 3) * 3), FIRE[i % 3], 2); }
      pxCircle(c, sx, sy, r, '#ff5a2a'); pxCircle(c, sx, sy, r * 0.75, '#ff9a3a'); pxCircle(c, sx, sy, r * 0.45, '#fff3a0');
      if (Math.random() < 0.8) particles(sx + rand(-40, 40), sy + rand(10, 40), 1, { colors: FIRE, speed: 10, grav: -20, life: 0.3 });
    });
    Sfx.play('fire');
    await projectile({ x: sx, y: sy }, fc, 380, (c, x, y) => {
      for (let i = 0; i < 10; i++) { const a = i * 0.63 + G.t * 6; pxLine(c, x + Math.cos(a) * 22, y + Math.sin(a) * 22, x + Math.cos(a) * 28, y + Math.sin(a) * 28, FIRE[i % 3], 2); }
      pxCircle(c, x, y, 23, '#ff5a2a'); pxCircle(c, x, y, 17, '#ff9a3a'); pxCircle(c, x, y, 10, '#fff3a0');
      particles(x - 20, y, 2, { colors: FIRE, speed: 20, grav: -40, life: 0.4, size: 3 });
    });
    m.hit(0);
    screenFlash('#ff9a3a', 0.9);
    for (let i = 0; i < 3; i++) ringOut(fc, FIRE[i], 10, 50 + i * 16, 600, 3);
    particles(fc.x, fc.y, 50, { colors: FIRE, speed: 140, grav: -30, size: 3 });
    shake(9, 700);
    await tween(G.hero, { oy: 0 }, 200);
    await wait(250);
  },
  fireflies: async m => {
    const hc = heroC(), fc = fc0(), n = 30;
    const flies = Array.from({ length: n }, (_, i) => ({ x: hc.x + rand(-20, 40), y: rand(20, 110), ph: i * 0.7, tx: fc.x + rand(-18, 18), ty: fc.y + rand(-20, 16) }));
    Sfx.play('charge');
    await fxRun(1100, (c, k) => {
      const e = easeIn(Math.min(1, k * 1.1));
      for (const f of flies) {
        const x = lerp(f.x, f.tx, e) + Math.sin(G.t * 6 + f.ph) * 6 * (1 - e), y = lerp(f.y, f.ty, e) + Math.cos(G.t * 5 + f.ph) * 4 * (1 - e);
        const on = Math.sin(G.t * 12 + f.ph) > -0.3;
        pxRect(c, x, y, 2, 2, on ? '#d8ff5a' : '#7a9a2a');
        if (on) { c.globalAlpha = 0.3; pxCircle(c, x, y, 3, '#fff3a0'); c.globalAlpha = 1; }
      }
    });
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffd04a', 0.6);
    for (let i = 0; i < 10; i++) {
      const f = flies[i * 3];
      particles(f.tx, f.ty, 8, { colors: FIRE, speed: 70, grav: -20 });
      ringOut({ x: f.tx, y: f.ty }, '#ffd04a', 1, 10, 260, 1);
    }
    shake(6, 500);
    await wait(450);
  },

  // --- Frost: Ice Age Lord ---
  icecapsule: async m => {
    const fc = fc0(), top = foeTop() - 6, x0 = fc.x - 24, x1 = fc.x + 24;
    Sfx.play('ice');
    await fxRun(600, (c, k) => {
      const y = lerp(121, top, easeOut(k));
      c.globalAlpha = 0.65;
      pxRect(c, x0, y, x1 - x0, 121 - y, '#9ad8f0');
      c.globalAlpha = 1;
      pxRect(c, x0, y, x1 - x0, 2, '#ffffff');
      pxRect(c, x0, y, 2, 121 - y, '#5fd3f0'); pxRect(c, x1 - 2, y, 2, 121 - y, '#5fd3f0');
      pxLine(c, x0 + 6, y + 4, x0 + 14, Math.min(121, y + 20), '#ffffff');
    });
    m.hit(0);
    const block = fxRun(500, c => {
      c.globalAlpha = 0.7; pxRect(c, x0, top, x1 - x0, 121 - top, '#bff2ff'); c.globalAlpha = 1;
      pxRect(c, x0, top, x1 - x0, 2, '#ffffff'); pxLine(c, x0 + 6, top + 4, x0 + 14, top + 20, '#ffffff'); pxLine(c, x1 - 10, top + 10, x1 - 4, top + 26, '#ffffff');
    });
    floatText(fc.x, top - 8, 'FROZEN', '#bff2ff');
    await block;
    Sfx.play('boom');
    for (let i = 0; i < 14; i++) particles(lerp(x0, x1, i / 13), lerp(top, 121, (i * 7 % 13) / 13), 3, { colors: ['#bff2ff', '#ffffff', '#5fd3f0'], speed: 120, grav: 160, size: 3 });
    shake(6, 400);
    await wait(300);
  },
  frozenworld: async m => {
    const fc = fc0();
    Sfx.play('ice');
    const ice = fxRun(1500, (c, k) => {
      const a = Math.min(1, k * 3) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      c.globalAlpha = 0.35 * a; pxRect(c, 0, 0, W, H, '#5fa8e0'); c.globalAlpha = a;
      for (let i = 0; i < 24; i++) {
        const len = 6 + ((i * 37) % 14) * Math.min(1, k * 2.5);
        pxRect(c, i * 8, 0, 3, len, '#ffffff'); pxRect(c, i * 8 + 3, H - len, 3, len, '#e8fbff');
        if (i < 16) { pxRect(c, 0, i * 8, len, 2, '#ffffff'); pxRect(c, W - len, i * 8 + 4, len, 2, '#e8fbff'); }
      }
      c.globalAlpha = 1;
    });
    await wait(500);
    Sfx.play('ice');
    await fxRun(420, (c, k) => {
      for (let i = 0; i < 7; i++) {
        const x = fc.x - 30 + i * 10, h = easeOut(k) * (22 + (i % 3) * 12);
        for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round(5 * (1 - j / h))); pxRect(c, x - w / 2, 121 - j, w, 1, j % 4 ? '#bff2ff' : '#5fd3f0'); }
      }
    });
    m.hit(0);
    particles(fc.x, fc.y, 36, { colors: ICE, speed: 120, grav: 140, size: 3 });
    shake(7, 500);
    await ice;
  },

  // --- Quake: World Shaker ---
  islandshaker: async m => {
    const fc = fc0();
    await tween(G.hero, { ox: 18, squash: -0.1 }, 160, easeIn);
    Sfx.play('boom');
    screenFlash('#ffffff', 0.7);
    shake(14, 1400);
    const wave = fxRun(1200, (c, k) => {
      const rise = Math.sin(Math.min(1, k * 1.4) * Math.PI);
      for (let x = 0; x < W; x += 2) {
        const top = 70 - 46 * rise * (1 - x / W * 0.6) + Math.sin(x * 0.12 + k * 14) * 3;
        pxRect(c, x, top, 2, 104 - top, x % 6 ? '#2f6fd0' : '#1f5aa8');
        pxRect(c, x, top, 2, 2, '#ffffff');
      }
      for (let i = 0; i < 5; i++) zigzag(c, 70 + i * 4, 104, W, 20 + i * 18, 9, 4, '#ffffff', 1);
    });
    await wait(650);
    m.hit(0);
    particles(fc.x, fc.y, 40, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 140, grav: 150 });
    await tween(G.hero, { ox: 0, squash: 0 }, 220);
    await wave;
  },
  skycrack: async m => {
    const fc = fc0(), cx = 112, cy = 26;
    const segs = [];
    for (let i = 0; i < 9; i++) {
      let x = cx, y = cy;
      const a = i * 0.7 - 0.2;
      for (let j = 0; j < 4; j++) { const nx = x + Math.cos(a + (j % 2 ? 0.35 : -0.35)) * 12, ny = y + Math.sin(a + (j % 2 ? 0.35 : -0.35)) * 12; segs.push([x, y, nx, ny, i / 9 + j * 0.06]); x = nx; y = ny; }
    }
    await tween(G.hero, { oy: -8, ox: 10 }, 150, easeIn);
    Sfx.play('boom');
    await fxRun(700, (c, k) => {
      for (const [x0, y0, x1, y1, d] of segs) {
        const e = Math.max(0, Math.min(1, (k * 1.6 - d) * 3));
        if (!e) continue;
        pxLine(c, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), PAL.k, 3);
        pxLine(c, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), '#ffffff', 1);
      }
    });
    Sfx.play('crit');
    screenFlash('#ffffff', 0.8);
    const shards = segs.filter((_, i) => i % 2 === 0).map(s => ({ x: s[2], y: s[3], tx: fc.x + rand(-16, 16), ty: fc.y + rand(-16, 16) }));
    await fxRun(420, (c, k) => {
      for (const s of shards) { const x = lerp(s.x, s.tx, easeIn(k)), y = lerp(s.y, s.ty, easeIn(k)); pxLine(c, x - 3, y - 2, x + 3, y + 2, '#ffffff', 2); pxRect(c, x, y, 1, 1, '#bfe6ff'); }
    });
    m.hit(0);
    particles(fc.x, fc.y, 30, { colors: ['#ffffff', '#bfe6ff', '#9aa4b1'], speed: 120, grav: 100 });
    shake(9, 600);
    await tween(G.hero, { oy: 0, ox: 0 }, 220);
  },

  // --- Smoke: Smoke Leviathan ---
  smokeserpent: async m => {
    const hc = heroC(), fc = fc0();
    const path = t => ({ x: lerp(hc.x, fc.x, t) + Math.sin(t * Math.PI * 2) * 40, y: lerp(hc.y, fc.y, t) - Math.sin(t * Math.PI) * 70 + Math.sin(t * Math.PI * 4) * 8 });
    Sfx.play('fire');
    await fxRun(1200, (c, k) => {
      const head = Math.min(1, k * 1.15);
      for (let i = 22; i >= 0; i--) {
        const t = head - i * 0.025;
        if (t < 0) continue;
        const p = path(t), r = 7 - i * 0.2;
        pxCircle(c, p.x, p.y, r + 1, '#b9bdc9'); pxCircle(c, p.x, p.y, r, i % 3 ? '#ffffff' : '#dfe2ea');
      }
      const h = path(head), open = 4 + Math.sin(k * 20) * 2;
      pxCircle(c, h.x, h.y, 10, '#ffffff');
      pxRect(c, h.x + 4, h.y - 2 - open, 12, 4, '#ffffff'); pxRect(c, h.x + 4, h.y + open, 10, 4, '#dfe2ea');
      pxRect(c, h.x + 2, h.y - 6, 3, 2, PAL.k);
    });
    m.hit(0);
    Sfx.play('boom');
    const puff = fxRun(500, (c, k) => {
      c.globalAlpha = 1 - k;
      for (let i = 0; i < 9; i++) pxCircle(c, fc.x + Math.cos(i * 0.7) * (8 + k * 14), fc.y + Math.sin(i * 0.7) * (8 + k * 10), 7, i % 2 ? '#ffffff' : '#dfe2ea');
      c.globalAlpha = 1;
    });
    shake(6, 400);
    await puff;
  },
  smokeprison: async m => {
    const F = G.battle.F, fc = fc0();
    Sfx.play('fire');
    const dome = fxRun(1100, (c, k) => {
      const r = lerp(46, 22, easeIn(Math.min(1, k * 1.3)));
      for (let i = 0; i < 18; i++) {
        const a = Math.PI + i * Math.PI / 17 + Math.sin(G.t * 4 + i) * 0.04;
        pxCircle(c, fc.x + Math.cos(a) * r, 121 + Math.sin(a) * r * 1.2, 6, i % 2 ? '#ffffff' : '#dfe2ea');
      }
      for (let i = 0; i < 6; i++) pxCircle(c, fc.x - r + i * r / 2.5, 120, 5, '#dfe2ea');
    });
    await wait(650);
    m.hit(0);
    await tween(F, { squash: 0.3 }, 140);
    await tween(F, { squash: 0 }, 220);
    particles(fc.x, fc.y, 24, { colors: SMOKE, speed: 70, grav: -20, size: 3 });
    await dome;
  },

  // --- Light: Speed of Light ---
  yasakani: async m => {
    const hc = heroC(), ox = hc.x + 12, oy = 24, fc = fc0();
    Sfx.play('charge');
    await tween(G.hero, { oy: -3 }, 120);
    const orb = fxRun(400 + m.hits * 130, (c, k) => {
      const r = 6 + Math.sin(G.t * 20) * 1.5;
      c.globalAlpha = 0.35; pxCircle(c, ox, oy, r + 5, '#fff3a0'); c.globalAlpha = 1;
      pxCircle(c, ox, oy, r, '#ffd04a'); pxCircle(c, ox, oy, r - 3, '#ffffff');
      pxLine(c, hc.x + 4, hc.y - 16, ox, oy, '#fff3a0', 1);
    });
    await wait(300);
    for (let i = 0; i < m.hits && G.battle.F.hp > 0; i++) {
      Sfx.play('zap');
      const tx = fc.x + rand(-16, 16), ty = fc.y + rand(-18, 14);
      for (let j = 0; j < 3; j++) {
        const sx = ox + rand(-4, 4), sy = oy + rand(-4, 4), ex = tx + rand(-6, 6), ey = ty + rand(-6, 6);
        fxRun(120, (c, k) => { const x = lerp(sx, ex, k), y = lerp(sy, ey, k); pxLine(c, lerp(sx, ex, Math.max(0, k - 0.3)), lerp(sy, ey, Math.max(0, k - 0.3)), x, y, '#ffd04a', 2); pxCircle(c, x, y, 2, '#ffffff'); });
      }
      await wait(110);
      m.hit(i);
      particles(tx, ty, 6, { colors: ['#ffffff', '#fff3a0'], speed: 60, grav: 0, life: 0.3 });
    }
    await orb;
    await tween(G.hero, { oy: 0 }, 150);
  },
  lightsword: async m => {
    const fc = fc0();
    const piv = () => ({ x: G.hero.x + G.hero.ox + 10, y: 100 + G.hero.oy });
    const blade = (c, a, len, w) => {
      const p = piv(), ex = p.x + Math.cos(a) * len, ey = p.y + Math.sin(a) * len;
      c.globalAlpha = 0.4; pxLine(c, p.x, p.y, ex, ey, '#fff3a0', w + 6); c.globalAlpha = 1;
      pxLine(c, p.x, p.y, ex, ey, '#ffd04a', w + 2); pxLine(c, p.x, p.y, ex, ey, '#ffffff', w);
      pxLine(c, p.x + Math.cos(a + Math.PI / 2) * 6, p.y + Math.sin(a + Math.PI / 2) * 6, p.x - Math.cos(a + Math.PI / 2) * 6, p.y - Math.sin(a + Math.PI / 2) * 6, '#e6b422', 3);
    };
    hold(true);
    Sfx.play('charge');
    await fxRun(550, (c, k) => blade(c, -Math.PI / 2, easeOut(k) * 120, 3));
    await tween(G.hero, { ox: 24 }, 120, easeIn);
    Sfx.play('slash');
    const a0 = -Math.PI / 2, a1 = 0.55;
    await fxRun(260, (c, k) => {
      const e = easeIn(k), p = piv();
      for (let t = 0; t < 1; t += 0.12) { const a = lerp(a0, lerp(a0, a1, e), t); pxRect(c, p.x + Math.cos(a) * 110, p.y + Math.sin(a) * 110, 3, 3, '#fff3a0'); }
      blade(c, lerp(a0, a1, e), 120, 3);
    });
    m.hit(0);
    screenFlash('#fffbe0', 0.9);
    slashAt(fc, '#ffd04a', 1.0, 60);
    particles(fc.x, fc.y, 36, { colors: ['#ffffff', '#fff3a0', '#ffd04a'], speed: 130 });
    shake(8, 500);
    await fxRun(250, (c, k) => { c.globalAlpha = 1 - k; blade(c, a1, 120, 3); c.globalAlpha = 1; });
    hold(false);
    await back(220);
  },

  // --- Dough: Awakened Dough ---
  doughworld: async m => {
    const hc = heroC(), fc = fc0();
    Sfx.play('stretch');
    await fxRun(700, (c, k) => {
      const edge = lerp(hc.x, W, easeOut(k));
      for (let x = 0; x < edge; x += 2) { const top = 111 + Math.sin(x * 0.2 + G.t * 8) * 2; pxRect(c, x, top, 2, H - top, '#efe2c8'); pxRect(c, x, top, 2, 1, '#fffaf0'); }
    });
    Sfx.play('boom');
    await fxRun(700, (c, k) => {
      for (let x = 0; x < W; x += 2) { const top = 111 + Math.sin(x * 0.2 + G.t * 8) * 2; pxRect(c, x, top, 2, H - top, '#efe2c8'); }
      for (let i = 0; i < 3; i++) {
        const q = Math.max(0, Math.min(1, k * 1.6 - i * 0.25)), cx = lerp(fc.x - 40 + i * 10, fc.x + i * 6, q), h = Math.sin(q * Math.PI) * (40 + i * 6);
        for (let dx = -16; dx <= 16; dx += 2) { const hh = h * Math.cos(dx / 16 * Math.PI / 2); pxRect(c, cx + dx, 112 - hh, 2, hh, dx % 4 ? '#efe2c8' : '#c9a26a'); pxRect(c, cx + dx, 112 - hh, 2, 1, '#fffaf0'); }
      }
    });
    m.hit(0);
    particles(fc.x, fc.y, 30, { colors: ['#efe2c8', '#c9a26a', '#fffaf0'], speed: 90, grav: 140, size: 3 });
    shake(7, 500);
    await wait(250);
  },
  pestle: async m => {
    const F = G.battle.F, fc = fc0(), top = foeTop();
    const draw = (c, y) => {
      pxRect(c, fc.x - 18, y - 46, 36, 44, PAL.k);
      pxRect(c, fc.x - 16, y - 44, 32, 40, '#efe2c8');
      pxRect(c, fc.x - 16, y - 44, 6, 40, '#fffaf0');
      pxRect(c, fc.x + 10, y - 44, 6, 40, '#d8c8a0');
      pxRect(c, fc.x - 18, y - 4, 36, 4, '#c9a26a');
    };
    Sfx.play('charge');
    for (let i = 0; i < 3; i++) {
      await fxRun(i ? 160 : 360, (c, k) => draw(c, lerp(i ? top - 30 : -10, top + 6, easeIn(k))));
      Sfx.play('boom');
      if (!i) m.hit(0);
      F.squash = 0.4;
      dust(fc.x, 12);
      shake(6 + i * 2, 220);
      ringOut({ x: fc.x, y: 120 }, '#efe2c8', 4, 30 + i * 10, 260, 2);
      await fxRun(i < 2 ? 160 : 260, (c, k) => draw(c, lerp(top + 6, i < 2 ? top - 30 : -20, easeOut(k))));
      F.squash = 0;
    }
    floatText(fc.x, top - 10, 'MOCHI!', '#efe2c8');
  },

  // --- Dragon: Hybrid Dragon ---
  thunderbagua: async m => {
    const fc = fc0();
    const club = getSprite({ kind: 'weapon', shape: 'kanabo', pal: { g: '#3a3440', w: '#c9ccd6' } });
    hold(true);
    Sfx.play('charge');
    await tween(G.hero, { ox: 36, oy: -44 }, 320);
    const crackle = fxRun(500, (c, k) => {
      const x = G.hero.x + G.hero.ox + 12, y = 76 + G.hero.oy;
      drawRot(c, club, x, y - 12, -0.4, 3);
      for (let i = 0; i < 3; i++) zigzag(c, x - 10 + i * 8, y - 30, x - 6 + i * 8, y + 4, 4, 3, i % 2 ? '#ffffff' : '#7cd0ff', 1);
    });
    await crackle;
    Sfx.play('zap');
    screenFlash('#fff6a0', 0.9);
    const bolt = fxBolt(fc.x, fc.y, 2.2);
    await fxRun(160, (c, k) => drawRot(c, club, lerp(G.hero.x + G.hero.ox + 12, fc.x - 8, k), lerp(64 + G.hero.oy, fc.y - 6, k), lerp(-0.4, 1.4, k), 3));
    m.hit(0);
    Sfx.play('boom');
    for (let i = 0; i < 3; i++) ringOut({ x: fc.x, y: 120 }, i % 2 ? '#7cd0ff' : '#ffe14a', 4, 40 + i * 14, 500, 2);
    groundCrack(fc.x - 40, fc.x + 40, '#1b1424', 300);
    particles(fc.x, fc.y, 36, { colors: ['#ffe14a', '#7cd0ff', '#ffffff'], speed: 130 });
    shake(10, 600);
    await bolt;
    hold(false);
    await tween(G.hero, { ox: 0, oy: 0 }, 260);
  },
  bolobreath: async m => {
    const hc = heroC(), mx = hc.x + 12, my = hc.y - 14, fc = fc0();
    Sfx.play('charge');
    await fxRun(500, (c, k) => {
      for (let i = 0; i < 10; i++) { const a = i * 0.63, r = 30 * (1 - k) + 4; pxRect(c, mx + Math.cos(a) * r, my + Math.sin(a) * r, 2, 2, i % 2 ? '#ffd04a' : '#ffffff'); }
      pxCircle(c, mx, my, 2 + k * 5, '#ffd04a');
    });
    Sfx.play('fire');
    screenFlash('#ff9a3a', 0.7);
    let hit = false;
    await fxRun(800, (c, k) => {
      const w = Math.round(Math.sin(Math.min(1, k * 1.2) * Math.PI) * 18), reach = lerp(mx, W + 10, Math.min(1, k * 3));
      for (let x = mx; x < reach; x += 3) {
        const wob = Math.sin(x * 0.3 + G.t * 30) * 2;
        pxRect(c, x, my - w - 3 + wob, 3, (w + 3) * 2, '#ff5a2a');
        pxRect(c, x, my - w + wob, 3, w * 2, '#ffd04a');
        pxRect(c, x, my - w / 2 + wob, 3, w, '#ffffff');
      }
      if (!hit && k > 0.3) { hit = true; m.hit(0); particles(fc.x, fc.y, 40, { colors: FIRE, speed: 140, grav: -40, size: 3 }); shake(10, 600); }
    });
    if (!hit) m.hit(0);
  },

  // --- Split: Flashy Festival ---
  grandparade: async m => {
    const fc = fc0(), n = Math.max(1, m.hits), parts = ['fist', 'foot', 'head', 'fist', 'foot', 'fist'];
    let launched = 0;
    const ringPos = (i, t) => { const a = t * 4 + i * Math.PI * 2 / n; return { x: fc.x + Math.cos(a) * 46, y: fc.y - 4 + Math.sin(a) * 34 }; };
    Sfx.play('stretch');
    const ring = fxRun(500 + n * 220, c => { for (let i = launched; i < n; i++) { const p = ringPos(i, G.t); AW.part(c, parts[i % parts.length], p.x, p.y, 2); } });
    await wait(450);
    for (let i = 0; i < n && G.battle.F.hp > 0; i++) {
      const from = ringPos(i, G.t);
      launched = i + 1;
      await projectile(from, fc, 150, (c, x, y) => AW.part(c, parts[i % parts.length], x, y, 2));
      m.hit(i);
      impact(fc, ['#ffffff', '#d63c2f', '#ffd04a'], 8);
      shake(3, 120);
    }
    launched = n;
    await ring;
  },
  muggyball: async m => {
    const fc = fc0();
    Sfx.play('charge');
    await fxRun(900, (c, k) => {
      const x = lerp(20, fc.x, k), y = lerp(-30, fc.y - 8, easeIn(k)) - Math.sin(k * Math.PI) * 20, r = 22, rot = k * 8;
      pxCircle(c, x, y, r + 2, PAL.k); pxCircle(c, x, y, r, '#d63c2f');
      for (let i = -2; i <= 2; i++) { const yy = y + i * 8 + Math.round(Math.sin(rot) * 3); const half = Math.sqrt(Math.max(0, r * r - (yy - y) * (yy - y))); pxRect(c, x - half, yy - 1, half * 2, 3, '#ffffff'); }
      drawText(c, 'B', x - 3, y - 7, { color: '#ffe14a', scale: 3, shadow: null });
      pxRect(c, x + 8, y - r - 6, 2, 6, '#c9b88a');
      pxRect(c, x + 6, y - r - 9, 5, 3, pick(FIRE));
      particles(x + 9, y - r - 8, 1, { colors: FIRE, speed: 30, grav: 40, life: 0.3 });
    });
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 1);
    for (let i = 0; i < 4; i++) ringOut(fc, ['#ffffff', '#ffe14a', '#ff5a2a', '#d63c2f'][i], 6, 70 + i * 20, 700, 3);
    particles(fc.x, fc.y, 80, { colors: FIRE.concat(['#d63c2f', '#ffffff', '#3a3440']), speed: 180, size: 3 });
    shake(14, 1000);
    await fxRun(800, (c, k) => {
      const y = lerp(fc.y, 20, easeOut(k));
      c.globalAlpha = 1 - k * 0.7;
      pxRect(c, fc.x - 6, y, 12, fc.y - y + 20, '#5a4a50');
      for (let i = 0; i < 7; i++) pxCircle(c, fc.x + Math.cos(i * 0.9) * 18 * (0.5 + k), y + Math.sin(i * 0.9) * 8, 10, i % 2 ? '#ff9a3a' : '#5a4a50');
      c.globalAlpha = 1;
    });
  },

  // --- Magma: Volcano Lord ---
  eruption: async m => {
    const fc = fc0();
    Sfx.play('boom');
    shake(5, 1300);
    await fxRun(500, (c, k) => {
      zigzag(c, fc.x - 30, 120, fc.x + 30, 120, 10, 2, k > 0.5 ? '#ff5a2a' : '#5a1a1a', 2);
      const h = easeOut(k) * 26;
      for (let j = 0; j < h; j++) { const half = 30 - j; pxRect(c, fc.x - half, 121 - j, half * 2, 1, j % 5 ? '#6a3a2a' : '#4a2a1a'); }
    });
    Sfx.play('fire');
    screenFlash('#ff5a2a', 0.8);
    m.hit(0);
    const column = fxRun(800, (c, k) => {
      const h = Math.sin(Math.min(1, k * 1.3) * Math.PI) * 120;
      for (let j = 0; j < 26; j++) { const half = 30 - j; pxRect(c, fc.x - half, 121 - j, half * 2, 1, j % 5 ? '#6a3a2a' : '#4a2a1a'); }
      for (let i = 0; i < 4; i++) { const w = 18 - i * 4 + Math.sin(G.t * 30 + i) * 2; pxRect(c, fc.x - w / 2, 96 - h, w, h, ['#5a1a1a', '#c0301a', '#ff5a2a', '#ffd04a'][i]); }
    });
    for (let i = 0; i < 4; i++) { particles(fc.x, 60, 14, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 130, grav: 200, dir: -Math.PI / 2, spread: 1.6, size: 3 }); await wait(160); }
    await column;
  },
  magmahound: async m => {
    const hc = heroC(), fc = fc0();
    Sfx.play('fire');
    await fxRun(650, (c, k) => {
      const x = lerp(hc.x + 10, fc.x - 18, easeIn(k)), y = 96 - Math.sin(k * Math.PI) * 26;
      for (let i = 0; i < 6; i++) pxRect(c, x - 30 - i * 6, 118 - (i % 2), 4, 2, i % 2 ? '#ff5a2a' : '#ffd04a');
      AW.hound(c, x, y, 10, G.t);
      particles(x - 20, y, 1, { colors: SMOKE, speed: 10, grav: -30, life: 0.4 });
    });
    Sfx.play('bite');
    await fxRun(220, (c, k) => AW.hound(c, fc.x - 18, 96, 10 * (1 - k), G.t));
    m.hit(0);
    screenFlash('#ff5a2a', 0.5);
    particles(fc.x, fc.y, 36, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 110, grav: 130, size: 3 });
    shake(8, 500);
    await fxRun(350, (c, k) => { c.globalAlpha = 1 - k; AW.hound(c, fc.x - 18, 96 + k * 10, 0, G.t); c.globalAlpha = 1; });
  },

  // --- String: Awakened Strings ---
  godthread: async m => {
    const fc = fc0();
    const from = [[0, 10], [40, -4], [110, -4], [192, 6], [192, 60], [0, 90], [70, -4], [160, -4]];
    Sfx.play('slash');
    const shown = [];
    const strings = fxRun(from.length * 90 + 600, c => { for (const s of shown) AW.braid(c, s.x0, s.y0, s.x1, s.y1, s.e); });
    for (let i = 0; i < from.length; i++) {
      const [x0, y0] = from[i], ang = Math.atan2(fc.y - y0, fc.x - x0);
      const s = { x0, y0, x1: fc.x + Math.cos(ang) * 24, y1: fc.y + Math.sin(ang) * 24, e: 0 };
      shown.push(s);
      tween(s, { e: 1 }, 90, easeIn);
      Sfx.play('slash');
      await wait(80);
    }
    m.hit(0);
    Sfx.play('crit');
    impact(fc, ['#ffffff', '#ff8ab0'], 24);
    shake(8, 500);
    await strings;
  },
  stringwave: async m => {
    const hc = heroC(), fc = fc0();
    Sfx.play('stretch');
    let hit = false;
    await fxRun(1100, (c, k) => {
      const cx = lerp(hc.x, fc.x + 16, Math.min(1, k * 1.2));
      for (let x = 0; x < W; x += 3) {
        const d = (x - cx) / 20, h = Math.max(2, 52 * Math.exp(-d * d) * Math.min(1, k * 3));
        pxLine(c, x, 121, x + Math.sin(G.t * 10 + x) * 2, 121 - h, x % 6 ? '#ffffff' : '#ff8ab0', 1);
      }
      if (!hit && k > 0.8) { hit = true; m.hit(0); Sfx.play('boom'); particles(fc.x, fc.y, 30, { colors: ['#ffffff', '#ff8ab0'], speed: 100, grav: 60, size: 1 }); shake(7, 400); }
    });
    if (!hit) m.hit(0);
  },

  // --- Paw: Ursus Awakening ---
  painbubble: async m => {
    const hc = heroC(), fc = fc0();
    const bubble = (c, x, y, s) => {
      c.globalAlpha = 0.5;
      pxCircle(c, x, y + 4 * s, 9 * s, '#f2c7d8');
      for (const [dx, dy] of [[-8, -6], [0, -10], [8, -6]]) pxCircle(c, x + dx * s, y + dy * s, 4 * s, '#f2c7d8');
      c.globalAlpha = 1;
      pxRing(c, x, y + 4 * s, 9 * s, '#ff8ab0', 1);
      for (let i = 0; i < 6; i++) { const a = G.t * 8 + i; pxRect(c, x + Math.cos(a) * 5 * s, y + 4 * s + Math.sin(a) * 4 * s, 2, 2, i % 2 ? '#8a1a2a' : '#1b1424'); }
    };
    Sfx.play('charge');
    await fxRun(500, (c, k) => bubble(c, hc.x + 18, hc.y - 14, 0.5 + k * 0.7));
    await fxRun(700, (c, k) => bubble(c, lerp(hc.x + 18, fc.x, easeIn(k)), lerp(hc.y - 14, fc.y - 4, k) - Math.sin(k * Math.PI) * 12, 1.2 - k * 0.3));
    m.hit(0);
    Sfx.play('hurt');
    screenFlash('#8a1a2a', 0.5);
    particles(fc.x, fc.y, 30, { colors: ['#8a1a2a', '#1b1424', '#ff8ab0'], speed: 90, grav: 20 });
    floatText(fc.x, foeTop() - 10, 'PAIN', '#ff8ab0');
    shake(5, 300);
    await wait(250);
  },
  supernova: async m => {
    const fc = fc0();
    Sfx.play('charge');
    await fxRun(1100, (c, k) => {
      const r = k < 0.6 ? easeOut(k / 0.6) * 36 : lerp(36, 1, easeIn((k - 0.6) / 0.4));
      c.globalAlpha = 0.45; pxCircle(c, fc.x, fc.y, r, '#f2c7d8'); c.globalAlpha = 1;
      pxRing(c, fc.x, fc.y, r, '#ffffff', 2);
      if (r > 10) { pxCircle(c, fc.x, fc.y + r * 0.2, r * 0.3, '#ffffff'); for (const [dx, dy] of [[-0.3, -0.25], [0, -0.38], [0.3, -0.25]]) pxCircle(c, fc.x + dx * r, fc.y + dy * r, r * 0.12, '#ffffff'); }
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + G.t * 4, rr = r + 10; pxRect(c, fc.x + Math.cos(a) * rr, fc.y + Math.sin(a) * rr, 2, 2, '#ffffff'); }
    });
    await fxRun(160, (c, k) => pxCircle(c, fc.x, fc.y, 2 + k * 2, '#ffffff'));
    m.hit(0);
    Sfx.play('boom');
    screenFlash('#ffffff', 1);
    for (let i = 0; i < 4; i++) ringOut(fc, i % 2 ? '#f2c7d8' : '#ffffff', 2, 90 + i * 30, 700, 3);
    rays(fc, '#ffffff', 18, 100, 600);
    particles(fc.x, fc.y, 60, { colors: ['#ffffff', '#f2c7d8', '#ff8ab0'], speed: 180 });
    shake(12, 900);
    await wait(500);
  },
});
SLASH_MOVES.push('lightsword');
SHOT_MOVES.push('muggyball', 'yasakani');
