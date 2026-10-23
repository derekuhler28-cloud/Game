'use strict';
/* Move animations for the weapons found from Water 7 to Whole Cake Island. */
{
  // ---------- small drawing helpers (block-scoped so they can't clash with game.js) ----------

  const shine = (c, x, y, r, col) => {
    pxRing(c, x, y, r, col || '#bfe6ff', 1);
    pxRect(c, x - r * 0.5, y - r * 0.6, Math.max(1, r * 0.3), 1, '#ffffff');
    pxRect(c, x - r * 0.6, y - r * 0.4, 1, Math.max(1, r * 0.25), '#ffffff');
  };

  const elephant = (c, x, y, step) => {
    pxRect(c, x - 6, y - 9, 11, 6, '#7a808b');
    pxCircle(c, x + 6, y - 9, 3, '#7a808b');
    pxRect(c, x + 8, y - 8, 2, 6, '#7a808b');
    pxRect(c, x + 3, y - 11, 3, 5, '#9aa0ab');
    pxRect(c, x + 7, y - 10, 1, 1, PAL.k);
    pxRect(c, x + 9, y - 5, 2, 1, '#f2f2f2');
    for (let i = 0; i < 4; i++) pxRect(c, x - 5 + i * 3, y - 3 + ((i + step) % 2), 2, 3, '#5a6070');
  };

  const bat = (c, x, y, up) => {
    const w = up ? -1 : 2;
    pxRect(c, x - 1, y - 1, 3, 3, '#1b1424');
    pxRect(c, x - 5, y + w, 4, 1, '#1b1424'); pxRect(c, x + 2, y + w, 4, 1, '#1b1424');
    pxRect(c, x - 4, y + w - 1, 1, 1, '#1b1424'); pxRect(c, x + 4, y + w - 1, 1, 1, '#1b1424');
    pxRect(c, x, y, 1, 1, '#ff3a3a');
  };

  const chainLinks = (c, x0, y0, x1, y1, amp, ph) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t) + Math.sin(t * 9 + ph) * amp * (1 - t);
      if (i % 2) pxRect(c, x - 1, y - 1, 3, 3, '#5a5a6a');
      else pxRing(c, x, y, 2, '#9aa4b1', 1);
    }
  };

  const spikeBall = (c, x, y, r) => {
    pxCircle(c, x, y, r + 1, PAL.k);
    pxCircle(c, x, y, r, '#5a5a6a');
    pxCircle(c, x - r / 3, y - r / 3, r / 3, '#9aa4b1');
    for (let i = 0; i < 8; i++) { const a = i * 0.785; pxRect(c, x + Math.cos(a) * (r + 2) - 1, y + Math.sin(a) * (r + 2) - 1, 2, 2, '#c9ccd6'); }
  };

  const ropeNet = (c, x, y, s) => {
    const w = 18 * s, h = 16 * s;
    for (let i = 0; i <= 4; i++) {
      const t = -w + i * w / 2;
      pxLine(c, x + t, y - h, x + t + w / 2, y + h, '#c9a26a');
      pxLine(c, x + t + w / 2, y - h, x + t, y + h, '#c9a26a');
    }
    pxLine(c, x - w, y - h, x + w, y - h, '#8a6a3a');
    for (let i = 0; i < 5; i++) pxRect(c, x - w + i * w / 2, y + h, 2, 2, '#8a6a3a');
  };

  const foeHp = () => G.battle.F.hp > 0;

  Object.assign(MOVE_FX, {
    // ---------- Water 7: Paulie's Ropes ----------
    lasso: async m => {
      const F = G.battle.F, h = heroHand(), fc = fc0();
      Sfx.play('stretch');
      await fxRun(360, (c, k) => {
        const cx = G.hero.x + G.hero.ox + Math.cos(k * 14) * 8, cy = 72 + Math.sin(k * 14) * 3;
        pxLine(c, h.x - 4, h.y - 6, cx, cy, '#c9a26a');
        for (let a = 0; a < 6.28; a += 0.45) pxRect(c, cx + Math.cos(a) * 7, cy + Math.sin(a) * 2, 1, 1, '#e8d9b0');
      });
      await projectile({ x: G.hero.x, y: 72 }, { x: fc.x, y: fc.y - 4 }, 220, (c, x, y) => { pxLine(c, h.x - 4, h.y - 6, x, y, '#c9a26a'); pxRing(c, x, y, 7, '#e8d9b0', 1); });
      m.hit(0);
      const rope = fxRun(520, c => {
        const fx = F.x + F.ox;
        pxLine(c, h.x - 4, h.y - 6, fx - 8, fc.y, '#c9a26a');
        for (let i = -1; i <= 1; i++) pxRect(c, fx - 10, fc.y + i * 4, 20, 1, '#e8d9b0');
      });
      await tween(F, { ox: -22 }, 200, easeIn);
      Sfx.play('hit');
      impact(foeC(), ['#e8d9b0', '#ffffff'], 10);
      await tween(F, { ox: 0 }, 260);
      await rope;
    },
    ropenet: async m => {
      const fc = fc0();
      Sfx.play('stretch');
      await dropOn(fc, 380, (c, x, y) => ropeNet(c, x, y, 1));
      m.hit(0);
      Sfx.play('hit');
      await fxRun(420, (c, k) => ropeNet(c, fc.x, fc.y, 1 - 0.3 * easeOut(Math.min(1, k * 2))));
      particles(fc.x, fc.y, 8, { colors: ['#c9a26a', '#e8d9b0'], speed: 40, grav: 60, size: 1 });
    },
    anchordrop: async m => {
      const fc = fc0(), px = fc.x - 30, py = -20;
      const L = Math.hypot(fc.x - px, fc.y - py), a1 = Math.atan2(fc.x - px, fc.y - py);
      const anchor = (c, a, lift) => {
        const x = px + Math.sin(a) * L, y = py + Math.cos(a) * L - 8 - (lift || 0);
        pxLine(c, px, py, x, y - 4, '#c9a26a');
        pxRing(c, x, y - 4, 2, '#9aa4b1', 1);
        pxRect(c, x - 1, y - 2, 3, 12, '#5a5a6a');
        pxRect(c, x - 5, y + 1, 11, 2, '#5a5a6a');
        for (let t = 0; t <= Math.PI; t += 0.2) pxRect(c, x + Math.cos(t) * 7, y + 10 + Math.sin(t) * 4, 2, 2, '#3a3440');
        pxRect(c, x - 9, y + 8, 3, 3, '#3a3440'); pxRect(c, x + 7, y + 8, 3, 3, '#3a3440');
      };
      Sfx.play('charge');
      await fxRun(620, (c, k) => anchor(c, lerp(-1.3, a1, easeIn(k))));
      Sfx.play('boom');
      m.hit(0);
      shake(6, 400); dust(fc.x, 16);
      impact(fc, ['#9aa4b1', '#ffffff'], 14);
      await fxRun(300, (c, k) => anchor(c, a1, k * 6));
    },

    // ---------- Water 7: Cola Cannon Arm ----------
    strongright: async m => {
      const h = heroHand(), fc = fc0();
      const draw = (c, x, y) => {
        for (let i = 0; i < 1; i += 0.08) pxRect(c, lerp(h.x + 6, x, i) - 1, lerp(h.y, y, i) - 1, 2, 2, Math.round(i * 12) % 2 ? '#9aa4b1' : '#5a5a6a');
        pxRect(c, x - 4, y - 4, 9, 8, PAL.k);
        pxRect(c, x - 3, y - 3, 7, 6, '#5ab8e8');
        pxRect(c, x + 2, y - 3, 2, 6, '#c9ccd6');
      };
      Sfx.play('shot');
      await fxRun(220, (c, k) => draw(c, lerp(h.x + 6, fc.x - 6, easeOut(k)), lerp(h.y, fc.y, k)));
      m.hit(0);
      Sfx.play('boom');
      impact(fc, ['#5ab8e8', '#ffffff'], 12);
      shake(3, 200);
      await fxRun(260, (c, k) => draw(c, lerp(fc.x - 6, h.x + 6, easeIn(k)), lerp(fc.y, h.y, k)));
    },
    weaponsleft: async m => {
      const h = heroHand(), fc = fc0();
      for (let i = 0; i < m.hits && foeHp(); i++) {
        Sfx.play('boom');
        tween(G.hero, { ox: -4 }, 60).then(() => tween(G.hero, { ox: 0 }, 100));
        particles(h.x + 10, h.y, 6, { colors: ['#7a4a24', '#c98a5a', '#ffffff'], speed: 30, grav: -60, size: 1, life: 0.6 });
        const p = { x: fc.x, y: fc.y + (i % 3 - 1) * 8 };
        await projectile({ x: h.x + 10, y: h.y }, p, 150, (c, x, y) => { pxCircle(c, x, y, 3, PAL.k); pxRect(c, x - 6, y - 1, 3, 2, '#5ab8e8'); });
        m.hit(i);
        ringOut(p, '#5ab8e8', 1, 9, 220, 1);
        particles(p.x, p.y, 8, { colors: ['#7a4a24', '#ffe14a', '#ffffff'], speed: 70 });
      }
    },
    radicalbeam: async m => {
      const h = heroHand(), fc = fc0();
      const o = { x: h.x + 4, y: h.y - 2 }, a = Math.atan2(fc.y - o.y, fc.x - o.x);
      Sfx.play('charge');
      await fxRun(420, (c, k) => {
        pxCircle(c, o.x, o.y, 2 + k * 5, '#5ae8f0');
        pxCircle(c, o.x, o.y, 1 + k * 3, '#ffffff');
        for (let i = 0; i < 4; i++) { const b = k * 8 + i * 1.57; pxRect(c, o.x + Math.cos(b) * 10, o.y + Math.sin(b) * 10, 1, 1, '#ffe14a'); }
      });
      Sfx.play('zap');
      screenFlash('#bff8ff', 0.5);
      fxRun(520, (c, k) => {
        const w = Math.max(2, Math.round(12 * Math.sin(Math.min(1, k * 1.5) * Math.PI)));
        const ex = o.x + Math.cos(a) * 220, ey = o.y + Math.sin(a) * 220;
        pxLine(c, o.x, o.y, ex, ey, '#2ad0e0', w);
        pxLine(c, o.x, o.y, ex, ey, '#ffffff', Math.max(1, Math.round(w / 2)));
        for (let i = 0; i < 6; i++) {
          const d = ((i * 29 + k * 160) % 160) + 10, side = (i % 2 ? 1 : -1) * (w / 2 + 3);
          const sx = o.x + Math.cos(a) * d - Math.sin(a) * side, sy = o.y + Math.sin(a) * d + Math.cos(a) * side;
          pxRect(c, sx - 1, sy, 3, 1, '#ffe14a'); pxRect(c, sx, sy - 1, 1, 3, '#ffe14a');
        }
      });
      await wait(160);
      m.hit(0);
      shake(6, 400);
      particles(fc.x, fc.y, 24, { colors: ['#2ad0e0', '#ffffff', '#ffe14a'], speed: 100 });
      await wait(360);
    },

    // ---------- Enies Lobby: Funkfreed ----------
    trunkwhip: async m => {
      hold(true);
      await tween(G.hero, { ox: 20 }, 120, easeIn);
      const fc = fc0();
      Sfx.play('stretch');
      await fxRun(380, (c, k) => {
        const hx = G.hero.x + G.hero.ox + 10, hy = 102;
        const len = lerp(10, fc.x - hx, easeOut(Math.min(1, k * 1.6))), sw = Math.sin(k * Math.PI) * -24;
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, x = hx + len * t, y = hy + sw * t * t - Math.sin(t * Math.PI) * 6 + (fc.y - hy) * t * t;
          const r = Math.max(1, Math.round(4 - t * 2.5));
          pxCircle(c, x, y, r + 1, '#5a6070');
          pxCircle(c, x, y, r, '#9aa0ab');
          if (i % 3 === 0) pxRect(c, x, y - r, 1, r * 2, '#7a808b');
        }
      });
      m.hit(0);
      Sfx.play('hit');
      impact(fc, ['#9aa0ab', '#ffffff'], 10);
      shake(3, 180);
      hold(false);
      await back();
    },
    stampede: async m => {
      const fc = fc0();
      Sfx.play('boom');
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const x0 = G.hero.x + 4;
        await fxRun(200, (c, k) => elephant(c, lerp(x0, fc.x - 6, k), 121, Math.floor(k * 8)));
        m.hit(i);
        dust(fc.x - 8, 5);
        impact({ x: fc.x - 6, y: 112 }, ['#9aa0ab', '#ffffff'], 5);
        shake(2, 100);
      }
    },
    ivorylance: async m => {
      const fc = fc0(), hx = G.hero.x + 12, hy = 104;
      const tusk = (c, ext) => {
        const len = (fc.x + 12 - hx) * ext;
        for (let i = 0; i <= 20; i++) {
          const t = i / 20, x = hx + len * t, y = hy - Math.sin(t * Math.PI * 0.8) * 14 * ext + (fc.y - hy) * t * ext;
          const r = Math.max(1, Math.round(6 * (1 - t)));
          pxCircle(c, x, y, r + 1, '#c9c0a8');
          pxCircle(c, x, y, r, '#f7f2e2');
        }
      };
      Sfx.play('charge');
      await fxRun(260, (c, k) => tusk(c, easeIn(k)));
      m.hit(0);
      Sfx.play('crit');
      shake(5, 300);
      impact(fc, ['#f7f2e2', '#ffffff'], 16);
      await fxRun(300, (c, k) => tusk(c, 1 - easeOut(k)));
    },

    // ---------- Enies Lobby: Rokushiki Gloves ----------
    shigan: async m => {
      const g = ghosts(260, '#ffffff', 3, 8);
      await tween(G.hero, { ox: 54 }, 90, easeIn);
      const fc = fc0(), p = { x: fc.x - 4, y: fc.y - 2 };
      m.hit(0);
      Sfx.play('crit');
      fxRun(380, (c, k) => {
        pxCircle(c, p.x, p.y, 2, PAL.k);
        pxRect(c, p.x - 1, p.y - 1, 1, 1, '#5a5a6a');
        pxRing(c, p.x, p.y, 3 + k * 4, k < 0.5 ? '#ffffff' : '#c9ccd6', 1);
      });
      particles(p.x, p.y, 5, { colors: ['#ffffff'], speed: 40, grav: 0, life: 0.2, size: 1 });
      await g;
      await wait(120);
      await back(160);
    },
    rankyaku: async m => {
      const hero = G.hero;
      await tween(hero, { oy: -10, squash: -0.15 }, 140);
      Sfx.play('slash');
      const fc = fc0(), h = heroHand();
      arcSweep(h.x - 4, h.y - 4, 12, 1.4, -1.0, '#e8f0ff', 180, 2);
      await projectile({ x: h.x + 8, y: h.y - 8 }, fc, 260, (c, x, y) => {
        for (let t = -1.2; t <= 1.2; t += 0.1) pxRect(c, x + Math.cos(t) * 5 - 5, y + Math.sin(t) * 14, 1, 1, '#e8f0ff');
        for (let i = 1; i < 4; i++) pxRect(c, x - 6 - i * 7, y - 6 + i * 3, 5, 1, '#c9d4e4');
      });
      m.hit(0);
      slashAt(fc, '#e8f0ff', Math.PI / 2 - 0.2, 30);
      await back();
    },
    rokuogan: async m => {
      const hero = G.hero, F = G.battle.F;
      await tween(hero, { ox: 58 }, 140, easeIn);
      const fc = fc0();
      await fxRun(300, (c, k) => {
        for (const dy of [-5, 5]) { pxCircle(c, fc.x - 14, fc.y + dy, 3, PAL.k); pxCircle(c, fc.x - 14, fc.y + dy, 2, '#f3c08c'); }
        if (k > 0.6) pxRing(c, fc.x - 14, fc.y, 2 + (k - 0.6) * 10, '#ffffff', 1);
      });
      Sfx.play('boom');
      screenFlash('#ffffff', 0.6);
      m.hit(0);
      fxRun(600, (c, k) => {
        for (let i = 0; i < 4; i++) {
          const kk = k - i * 0.12;
          if (kk <= 0) continue;
          const x = fc.x - 14 + kk * 60;
          for (let y = -24; y <= 24; y += 2) pxRect(c, x + Math.sin(y * 0.3 + kk * 10) * 2 + Math.abs(y) * 0.3, fc.y + y, 1, 1, i % 2 ? '#c9d4e4' : '#ffffff');
        }
      });
      shake(8, 500);
      await tween(F, { ox: 16, squash: -0.1 }, 120);
      tween(F, { ox: 0, squash: 0 }, 300);
      await wait(300);
      await back();
    },

    // ---------- Thriller Bark: Shusui ----------
    ryumadraw: async m => {
      hold(true);
      const ghost = getSprite({ kind: 'human', head: 'hair', weapon: 'swords', pal: { h: '#2a3a5a', c: '#3a5a8a', C: '#9ab0c8', p: '#2a3a5a', s: '#c9d4e4' } }, 'tint', '#7ab8ff');
      const hx = G.hero.x;
      const show = fxRun(900, (c, k) => drawSpriteAt(c, ghost, hx - 14, 121, 3, { alpha: 0.45 * Math.sin(Math.min(1, k * 1.2) * Math.PI), shadow: false }));
      await wait(300);
      Sfx.play('slash');
      await tween(G.hero, { ox: 62 }, 80, easeIn);
      const fc = fc0();
      fxRun(260, (c, k) => {
        c.globalAlpha = 1 - k;
        pxRect(c, hx, fc.y - 1, fc.x + 30 - hx, 2, '#2a5a3a');
        pxRect(c, hx, fc.y, fc.x + 30 - hx, 1, '#7cff9a');
        c.globalAlpha = 1;
      });
      await wait(200);
      m.hit(0);
      particles(fc.x, fc.y, 12, { colors: ['#2a5a3a', '#7cff9a', '#1b1424'], speed: 70 });
      await show;
      hold(false);
      await back(220);
    },
    shadowlion: async m => {
      const fc = fc0(), h = heroHand();
      const lion = (c, x, y) => {
        for (let i = 0; i < 10; i++) { const a = i * 0.628; pxLine(c, x + Math.cos(a) * 5, y + Math.sin(a) * 5, x + Math.cos(a) * 10, y + Math.sin(a) * 10, '#1b3a24', 2); }
        pxCircle(c, x, y, 5, '#2a5a3a');
        pxRect(c, x + 1, y - 2, 2, 1, '#7cff9a');
        pxRect(c, x + 1, y + 2, 4, 1, '#1b1424');
      };
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const ty = fc.y - 4 + (i % 2) * 8;
        Sfx.play('slash');
        await projectile({ x: h.x, y: h.y - 4 - (i % 2) * 8 }, { x: fc.x, y: ty }, 240, lion);
        m.hit(i);
        slashAt({ x: fc.x, y: ty }, '#2a5a3a', i % 2 ? -0.7 : 0.7, 28);
      }
    },
    blacktornado: async m => {
      const F = G.battle.F, fc = fc0();
      Sfx.play('boom');
      const spin = fxRun(1100, c => {
        for (let i = 0; i < 22; i++) {
          const up = i * 4, r = 4 + i * 0.9, a = G.t * 14 + i * 0.7;
          pxRect(c, F.x + Math.cos(a) * r, 121 - up, 3, 2, i % 3 ? '#2a5a3a' : '#1b1424');
          if (i % 4 === 0) pxRect(c, F.x - Math.cos(a) * r, 121 - up, 2, 1, '#7cff9a');
        }
      });
      await tween(F, { oy: -26 }, 420, easeOut);
      m.hit(0);
      slashMarks({ x: F.x, y: fc.y - 26 }, 3, '#2a5a3a', 26, -0.9, 6);
      await tween(F, { oy: 0 }, 260, easeIn);
      Sfx.play('hit');
      shake(4, 200);
      dust(F.x, 10);
      await spin;
    },

    // ---------- Thriller Bark: Shadow Scissors ----------
    snipsnip: async m => {
      const fc = fc0(), px = fc.x - 22, py = fc.y;
      const sc = (c, open) => {
        for (const s of [-1, 1]) {
          const a = s * open, ha = Math.PI + a;
          pxLine(c, px, py, px + Math.cos(a) * 40, py + Math.sin(a) * 40, '#c9ccd6', 3);
          pxLine(c, px, py, px + Math.cos(a) * 40, py + Math.sin(a) * 40, '#ffffff', 1);
          pxRing(c, px + Math.cos(ha) * 10, py + Math.sin(ha) * 10, 4, '#6a4a8a', 2);
        }
        pxCircle(c, px, py, 2, '#3a3440');
      };
      for (let i = 0; i < m.hits && foeHp(); i++) {
        Sfx.play('slash');
        await fxRun(260, (c, k) => sc(c, k < 0.5 ? lerp(0.1, 0.6, k * 2) : lerp(0.6, 0, (k - 0.5) * 2)));
        m.hit(i);
        impact(fc, ['#ffffff', '#6a4a8a'], 8);
      }
    },
    shadowcut: async m => {
      const F = G.battle.F, sx = F.x + F.ox, sy = 121;
      const sh = (c, x, y) => {
        c.globalAlpha = 0.85;
        pxRect(c, x - 14, y - 1, 28, 3, '#1b1424');
        pxRect(c, x - 10, y - 2, 20, 1, '#1b1424');
        pxRect(c, x - 3, y - 4, 2, 2, '#ff3a3a'); pxRect(c, x + 3, y - 4, 2, 2, '#ff3a3a');
        c.globalAlpha = 1;
      };
      Sfx.play('slash');
      slashAt({ x: sx, y: sy - 2 }, '#6a4a8a', 0, 34);
      await wait(160);
      m.hit(0);
      await fxRun(480, (c, k) => sh(c, lerp(sx, G.hero.x + 10, easeIn(k)), sy - Math.sin(k * Math.PI) * 26));
      particles(G.hero.x, 116, 10, { colors: ['#1b1424', '#6a4a8a'], speed: 40, grav: -30 });
    },
    brickbats: async m => {
      const fc = fc0(), h = heroHand();
      Sfx.play('charge');
      const swarm = fxRun(220 * m.hits + 300, (c, k) => {
        for (let i = 0; i < 12; i++) {
          const q = Math.min(1, k * 1.5 + (i % 4) * 0.05);
          const x = lerp(h.x - 10 + (i % 3) * 6, fc.x + Math.sin(i) * 10, q);
          const y = lerp(h.y - 30 + (i * 7) % 30, fc.y + Math.cos(i * 2) * 10, q) + Math.sin(k * 20 + i) * 3;
          bat(c, x, y, Math.floor(k * 30 + i) % 2);
        }
      });
      await wait(300);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        m.hit(i);
        impact({ x: fc.x + rand(-8, 8), y: fc.y + rand(-8, 8) }, ['#1b1424', '#6a4a8a'], 4);
        Sfx.play('bite');
        await wait(180);
      }
      await swarm;
    },

    // ---------- Sabaody: Bubble Blaster ----------
    bubbletrap: async m => {
      const F = G.battle.F, fc = fc0(), h = heroHand();
      Sfx.play('stretch');
      await fxRun(500, (c, k) => shine(c, lerp(h.x + 8, fc.x, easeOut(k)), lerp(h.y - 10, fc.y, k) - Math.sin(k * Math.PI) * 20, lerp(4, 22, k), '#bfe6ff'));
      m.hit(0);
      await Promise.all([tween(F, { oy: -10 }, 400), fxRun(400, (c, k) => shine(c, fc.x, fc.y - 10 * k, 22 + Math.sin(k * 12), '#bfe6ff'))]);
      Sfx.play('splash');
      particles(fc.x, fc.y - 10, 16, { colors: ['#bfe6ff', '#ffffff'], speed: 70, grav: 40, size: 1 });
      await tween(F, { oy: 0 }, 200, easeIn);
    },
    bubbleburst: async m => {
      const fc = fc0();
      const pts = Array.from({ length: 9 }, (_, i) => ({ x: fc.x + Math.cos(i * 2.4) * (6 + (i % 3) * 5), y: fc.y + Math.sin(i * 2.4) * (6 + (i % 3) * 5), r: 3 + (i % 3) * 2 }));
      Sfx.play('stretch');
      await fxRun(450, (c, k) => pts.forEach((p, i) => { const q = Math.min(1, k * 2 - i * 0.08); if (q > 0) shine(c, p.x, p.y, p.r * q, '#9ad8f0'); }));
      m.hit(0);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i % 2 === 0) Sfx.play('miss');
        ringOut(p, '#ffffff', p.r, p.r + 5, 160, 1);
        particles(p.x, p.y, 4, { colors: ['#9ad8f0', '#ffffff'], speed: 50, grav: 0, life: 0.3, size: 1 });
        await wait(45);
      }
      shake(3, 200);
    },
    bubblebarrage: async m => {
      const h = heroHand(), fc = fc0();
      for (let i = 0; i < m.hits && foeHp(); i++) {
        Sfx.play('shot');
        const ty = fc.y + rand(-8, 8);
        await fxRun(120, (c, k) => { for (let j = 0; j < 3; j++) { const q = k - j * 0.15; if (q > 0) shine(c, lerp(h.x + 8, fc.x, q), lerp(h.y, ty, q), 3, '#e8c27b'); } });
        m.hit(i);
        ringOut({ x: fc.x, y: ty }, '#e8c27b', 2, 8, 160, 1);
      }
    },

    // ---------- Sabaody: Murakumo Light Blade ----------
    lightedge: async m => {
      hold(true);
      await tween(G.hero, { ox: 48 }, 110, easeIn);
      const fc = fc0();
      Sfx.play('zap');
      arcSweep(fc.x - 10, fc.y + 6, 24, -2.4, 0.4, '#fff3a0', 260, 4);
      await wait(140);
      m.hit(0);
      fxRun(400, (c, k) => {
        const a = 1 - k;
        c.globalAlpha = a;
        pxLine(c, fc.x - 30 * a, fc.y - 8, fc.x + 30 * a, fc.y - 8, '#ffffff');
        pxLine(c, fc.x, fc.y - 8 - 20 * a, fc.x, fc.y - 8 + 20 * a, '#ffffff');
        pxCircle(c, fc.x, fc.y - 8, 3 * a + 1, '#fff3a0');
        pxRing(c, fc.x + 14, fc.y + 4, 4 * a + 1, '#ffd04a', 1);
        pxRing(c, fc.x + 22, fc.y + 9, 2 * a + 1, '#ffd04a', 1);
        c.globalAlpha = 1;
      });
      hold(false);
      await back();
    },
    flashstep: async m => {
      const hero = G.hero, fc = fc0(), spots = [[fc.x - 26, -4], [fc.x + 22, -18], [fc.x - 4, -30]];
      hold(true);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        Sfx.play('zap');
        const [sx, sy] = spots[i % 3], from = { x: hero.x + hero.ox, y: 104 + hero.oy };
        hero.alpha = 0;
        await fxRun(80, (c, k) => pxLine(c, from.x, from.y, lerp(from.x, sx, k), lerp(from.y, 104 + sy, k), '#fff3a0', 2));
        hero.ox = sx - hero.x; hero.oy = sy; hero.alpha = 1;
        screenFlash('#fff6a0', 0.25);
        m.hit(i);
        slashAt(fc, '#fff3a0', i * 1.1 - 1, 30);
        await wait(160);
      }
      hero.alpha = 0;
      await wait(60);
      hero.ox = 0; hero.oy = 0; hero.alpha = 1;
      hold(false);
    },
    yatamirror: async m => {
      const h = heroHand(), fc = fc0(), m1 = { x: 70, y: 18 }, m2 = { x: 150, y: 30 };
      const mirror = (c, p, lit) => { pxRect(c, p.x - 5, p.y - 1, 11, 3, '#e6b422'); pxRect(c, p.x - 4, p.y, 9, 1, '#ffffff'); if (lit) pxCircle(c, p.x, p.y, 3, '#fff3a0'); };
      const segs = [[h, m1], [m1, m2], [m2, fc]];
      Sfx.play('charge');
      for (let s = 0; s < 3; s++) {
        await fxRun(s === 2 ? 260 : 160, (c, k) => {
          mirror(c, m1, s >= 1); mirror(c, m2, s >= 2);
          for (let j = 0; j <= s; j++) {
            const [p, q] = segs[j], e = j < s ? 1 : easeOut(k);
            pxLine(c, p.x, p.y, lerp(p.x, q.x, e), lerp(p.y, q.y, e), j === 2 ? '#ffd04a' : '#fff3a0', j === 2 ? 4 : 1);
            if (j === 2) pxLine(c, p.x, p.y, lerp(p.x, q.x, e), lerp(p.y, q.y, e), '#ffffff', 2);
          }
        });
        Sfx.play('zap');
      }
      screenFlash('#fffbe0', 0.6);
      m.hit(0);
      shake(5, 300);
      particles(fc.x, fc.y, 26, { colors: ['#fff3a0', '#ffffff', '#ffd04a'], speed: 110 });
      await wait(250);
    },

    // ---------- Impel Down: Jailer Chains ----------
    chainlash: async m => {
      const h = heroHand(), fc = fc0();
      Sfx.play('stretch');
      await fxRun(320, (c, k) => { const e = easeOut(Math.min(1, k * 1.4)); chainLinks(c, h.x, h.y, lerp(h.x, fc.x, e), lerp(h.y, fc.y, e), 8, k * 12); });
      m.hit(0);
      Sfx.play('hit');
      impact(fc, ['#9aa4b1', '#ffffff'], 10);
      await fxRun(200, (c, k) => chainLinks(c, h.x, h.y, lerp(fc.x, h.x, k), lerp(fc.y, h.y, k), 4, k * 8));
    },
    ironball: async m => {
      const fc = fc0(), hero = G.hero, cx = hero.x + 4, cy = 90;
      Sfx.play('charge');
      await fxRun(500, (c, k) => {
        const a = -Math.PI / 2 + k * Math.PI * 3, x = cx + Math.cos(a) * 18, y = cy + Math.sin(a) * 10 - 10;
        chainLinks(c, hero.x + 8, 100, x, y, 0, 0);
        spikeBall(c, x, y, 6);
      });
      await fxRun(260, (c, k) => {
        const x = lerp(cx, fc.x, k), y = lerp(70, fc.y, easeIn(k)) - Math.sin(k * Math.PI) * 30;
        chainLinks(c, hero.x + 8, 100, x, y, 3, k * 6);
        spikeBall(c, x, y, 7);
      });
      Sfx.play('boom');
      m.hit(0);
      shake(6, 360);
      dust(fc.x, 14);
      rays(fc, '#c9ccd6', 8, 22, 260);
    },
    lockdown: async m => {
      const fc = fc0(), from = [[0, 20], [W, 20], [fc.x - 40, H], [fc.x + 40, H]];
      const end = i => [fc.x + (i % 2 ? 6 : -6), fc.y + (i < 2 ? -6 : 6)];
      Sfx.play('stretch');
      await fxRun(380, (c, k) => from.forEach(([x, y], i) => { const [ex, ey] = end(i); chainLinks(c, x, y, lerp(x, ex, easeOut(k)), lerp(y, ey, easeOut(k)), 3, k * 10); }));
      m.hit(0);
      Sfx.play('coin');
      await fxRun(500, (c, k) => {
        from.forEach(([x, y], i) => { const [ex, ey] = end(i); chainLinks(c, x, y, ex, ey, 0, 0); });
        for (const dy of [-6, 0, 6]) pxRect(c, fc.x - 14, fc.y + dy, 28, 2, '#5a5a6a');
        const s = k < 0.3 ? 3 : 0;
        pxRect(c, fc.x - 4, fc.y - 2, 8, 7, '#e6b422');
        pxRing(c, fc.x, fc.y - 3 - s, 3, '#9aa4b1', 1);
        pxRect(c, fc.x - 1, fc.y + 1, 2, 2, PAL.k);
      });
    },

    // ---------- Impel Down: Hydra Fang ----------
    venomslash: async m => {
      hold(true);
      await tween(G.hero, { ox: 46 }, 130, easeIn);
      const fc = fc0();
      Sfx.play('slash');
      m.hit(0);
      slashAt(fc, '#9a4ad0', 0.75, 38);
      fxRun(700, (c, k) => {
        for (let i = 0; i < 6; i++) {
          const x = fc.x - 12 + i * 5, y0 = fc.y - 10 + i * 4, d = Math.max(0, k * 1.6 - i * 0.08) * 24;
          pxRect(c, x, y0, 1, Math.min(d, 6), '#7a2aa0');
          if (d > 6) pxRect(c, x, y0 + d, 2, 2, '#b06ad0');
        }
      });
      particles(fc.x, fc.y, 8, { colors: ['#9a4ad0', '#5a1a7a'], speed: 30, grav: 120, size: 1 });
      hold(false);
      await back();
      await wait(200);
    },
    hydra: async m => {
      const h = heroHand(), fc = fc0();
      const head = (c, x, y) => {
        pxCircle(c, x, y, 5, '#7a2aa0');
        pxRect(c, x + 2, y - 1, 6, 4, '#7a2aa0');
        pxRect(c, x + 3, y - 3, 1, 1, '#ffe14a');
        pxRect(c, x + 4, y + 2, 4, 1, '#ffffff');
      };
      Sfx.play('fire');
      await fxRun(520, (c, k) => {
        const e = easeOut(Math.min(1, k * 1.3));
        for (let n = 0; n < 3; n++) {
          const ty = fc.y + (n - 1) * 12;
          let px = h.x, py = h.y;
          for (let i = 1; i <= 10; i++) {
            const t = i / 10 * e, x = lerp(h.x, fc.x - 6, t), y = lerp(h.y, ty, t) + Math.sin(t * 8 + n * 2 + k * 6) * 5;
            pxLine(c, px, py, x, y, '#5a1a7a', 4);
            pxLine(c, px, py, x, y, '#9a4ad0', 2);
            px = x; py = y;
          }
          head(c, px, py);
        }
      });
      m.hit(0);
      Sfx.play('bite');
      shake(4, 260);
      particles(fc.x, fc.y, 20, { colors: ['#9a4ad0', '#5a1a7a', '#b06ad0'], speed: 80, grav: 60 });
    },
    venomdemon: async m => {
      const fc = fc0();
      const demon = (c, y, a) => {
        const x = fc.x - 10;
        c.globalAlpha = a;
        pxCircle(c, x, y, 22, '#5a1a7a');
        pxRect(c, x - 30, y + 10, 60, 50, '#5a1a7a');
        for (const s of [-1, 1]) { pxLine(c, x + s * 14, y - 14, x + s * 22, y - 34, '#7a2aa0', 4); pxRect(c, x + s * 8 - 2, y - 4, 5, 3, '#ffe14a'); }
        pxRect(c, x - 10, y + 8, 20, 3, '#b06ad0');
        c.globalAlpha = 1;
      };
      Sfx.play('haki');
      await fxRun(600, (c, k) => demon(c, lerp(150, 50, easeOut(k)), 0.85));
      await fxRun(220, (c, k) => { demon(c, 50, 0.85); for (const s of [-1, 1]) pxCircle(c, fc.x + s * lerp(40, 8, easeIn(k)), fc.y - 10 + k * 10, 10, '#7a2aa0'); });
      Sfx.play('boom');
      m.hit(0);
      shake(8, 500);
      screenFlash('#5a1a7a', 0.5);
      particles(fc.x, fc.y, 30, { colors: ['#9a4ad0', '#5a1a7a', '#ffe14a'], speed: 120 });
      await fxRun(300, (c, k) => demon(c, 50, 0.85 * (1 - k)));
    },

    // ---------- Marineford: Murakumogiri Bisento ----------
    bisentosweep: async m => {
      hold(true);
      await tween(G.hero, { ox: 30, squash: 0.15 }, 160, easeIn);
      const fc = fc0();
      Sfx.play('slash');
      arcSweep(G.hero.x + 50, 60, 60, 2.5, 0.6, '#e8e8f0', 320, 4);
      fxRun(500, (c, k) => { for (let i = 0; i < 7; i++) pxRect(c, lerp(40, W, (k + i * 0.13) % 1), 98 + (i * 5) % 22, 12, 1, '#c9d4e4'); });
      await wait(200);
      m.hit(0);
      dust(fc.x, 14);
      shake(4, 260);
      hold(false);
      await back();
    },
    tremorstrike: async m => {
      hold(true);
      await tween(G.hero, { ox: 26, oy: -6 }, 140, easeIn);
      const p = { x: G.hero.x + G.hero.ox + 26, y: 92 }, fc = fc0();
      const cracks = Array.from({ length: 8 }, (_, i) => [i * 0.785 + rand(-0.2, 0.2), 14 + rand(0, 12)]);
      Sfx.play('boom');
      await fxRun(380, (c, k) => {
        const e = easeOut(Math.min(1, k * 2));
        for (const [a, l] of cracks) zigzag(c, p.x, p.y, p.x + Math.cos(a) * l * e, p.y + Math.sin(a) * l * e, 3, 2, '#ffffff', 1);
        pxCircle(c, p.x, p.y, 2, '#ffffff');
      });
      screenFlash('#ffffff', 0.5);
      shake(7, 500);
      fxRun(400, (c, k) => { pxRing(c, p.x, p.y, 8 + k * 70, '#ffffff', 2); pxRing(c, p.x, p.y, 4 + k * 50, '#c9d4e4', 1); });
      await wait(160);
      m.hit(0);
      impact(fc, null, 12);
      hold(false);
      await back();
    },
    captainstand: async m => {
      const fc = fc0();
      const cap = (c, a, sw) => {
        const x = 40, y = 30;
        c.globalAlpha = a;
        pxRect(c, x - 18, y + 14, 36, 70, '#e8e8f0');
        pxCircle(c, x, y, 14, '#f2c7a0');
        pxRect(c, x - 14, y - 16, 28, 6, '#2a2433');
        for (let t = 0; t <= Math.PI; t += 0.15) pxRect(c, x - 14 + (t / Math.PI) * 28, y + 4 + Math.sin(t) * 2 - (1 - Math.sin(t)) * 8, 2, 2, '#ffffff');
        pxRect(c, x - 6, y - 4, 3, 2, PAL.k); pxRect(c, x + 4, y - 4, 3, 2, PAL.k);
        const a2 = lerp(-1.6, 0.3, sw);
        pxLine(c, x + 14, y + 30, x + 14 + Math.cos(a2) * 110, y + 30 + Math.sin(a2) * 110, '#9aa4b1', 3);
        pxLine(c, x + 14 + Math.cos(a2) * 96, y + 30 + Math.sin(a2) * 96, x + 14 + Math.cos(a2) * 112, y + 30 + Math.sin(a2) * 112, '#e8e8f0', 5);
        c.globalAlpha = 1;
      };
      Sfx.play('haki');
      await fxRun(500, (c, k) => cap(c, 0.6 * k, 0));
      Sfx.play('slash');
      await fxRun(260, (c, k) => cap(c, 0.6, easeIn(k)));
      m.hit(0);
      Sfx.play('boom');
      shake(8, 500);
      screenFlash('#ffffff', 0.4);
      slashAt(fc, '#ffffff', 0.4, 60);
      await fxRun(400, (c, k) => cap(c, 0.6 * (1 - k), 1));
    },

    // ---------- Marineford: Magma Gauntlet ----------
    magmapunch: async m => {
      await tween(G.hero, { ox: 54 }, 140, easeIn);
      const fc = fc0(), cx = fc.x - 6;
      Sfx.play('fire');
      m.hit(0);
      fxRun(800, (c, k) => {
        c.globalAlpha = 1 - k;
        pxCircle(c, cx, fc.y, 9, '#5a1a1a');
        pxRing(c, cx, fc.y, 9, '#ff5a2a', 2);
        pxCircle(c, cx, fc.y, 4, '#ffd04a');
        for (let i = 0; i < 6; i++) { const a = i * 1.05; pxLine(c, cx + Math.cos(a) * 9, fc.y + Math.sin(a) * 9, cx + Math.cos(a) * 15, fc.y + Math.sin(a) * 15, '#ff9a3a'); }
        c.globalAlpha = 1;
      });
      particles(fc.x, fc.y, 18, { colors: ['#ff5a2a', '#ffd04a', '#5a1a1a'], speed: 90, grav: 120 });
      shake(4, 240);
      await wait(200);
      await back();
    },
    houndfist: async m => {
      const h = heroHand(), fc = fc0(), to = { x: fc.x - 12, y: fc.y };
      const dog = (c, x, y, bite) => {
        pxCircle(c, x, y, 7, '#8a1a1a');
        pxRect(c, x, y - 4 - bite, 11, 4, '#c0301a');
        pxRect(c, x, y + 1 + bite, 10, 3, '#c0301a');
        for (let i = 0; i < 4; i++) pxRect(c, x + 2 + i * 2, y - bite, 1, 2, '#ffffff');
        pxRect(c, x - 4, y - 9, 3, 4, '#c0301a');
        pxRect(c, x + 3, y - 5 - bite, 2, 1, '#ffd04a');
        particles(x - 6, y, 1, { colors: ['#ff5a2a', '#ffd04a'], speed: 20, grav: -40, life: 0.3 });
      };
      Sfx.play('fire');
      await projectile(h, to, 340, (c, x, y) => dog(c, x, y, 3));
      await fxRun(160, (c, k) => dog(c, to.x, to.y, 3 * (1 - k)));
      Sfx.play('bite');
      m.hit(0);
      shake(4, 260);
      particles(fc.x, fc.y, 20, { colors: ['#ff5a2a', '#8a1a1a', '#ffd04a'], speed: 80, grav: 100 });
    },
    meteorvolcano: async m => {
      const fc = fc0();
      const fist = (c, x, y) => {
        pxRect(c, x - 5, y - 4, 10, 8, '#8a1a1a');
        for (let i = 0; i < 4; i++) pxRect(c, x - 5 + i * 3, y + 3, 2, 2, '#c0301a');
        pxRect(c, x - 7, y - 2, 2, 4, '#c0301a');
        pxRect(c, x - 3, y - 3, 6, 2, '#ff9a3a');
        pxRect(c, x - 2, y - 10, 4, 6, '#ff5a2a');
      };
      Sfx.play('fire');
      screenFlash('#ff5a2a', 0.25);
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const tx = fc.x + rand(-14, 14), ty = fc.y + rand(-8, 8);
        await fxRun(150, (c, k) => {
          const x = lerp(tx - 30, tx, k), y = lerp(-12, ty, easeIn(k));
          fist(c, x, y);
          particles(x, y - 8, 1, { colors: FIRE, speed: 10, grav: -30, life: 0.3 });
        });
        m.hit(i);
        Sfx.play('boom');
        impact({ x: tx, y: ty }, ['#ff5a2a', '#ffd04a'], 8);
        shake(3, 120);
      }
    },

    // ---------- Fish-Man Island: Neptune's Trident ----------
    kingsthrust: async m => {
      hold(true);
      await tween(G.hero, { ox: 28 }, 120, easeIn);
      const fc = fc0();
      await thrust({ x: G.hero.x + G.hero.ox + 10, y: 102 }, { x: fc.x + 6, y: fc.y }, '#e6b422', 2, 260, 3);
      m.hit(0);
      Sfx.play('coin');
      fxRun(500, (c, k) => {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.256 + k * 3, r = 10 + k * 12, x = fc.x + Math.cos(a) * r, y = fc.y + Math.sin(a) * r;
          pxRect(c, x - 1, y, 3, 1, '#ffe14a'); pxRect(c, x, y - 1, 1, 3, '#ffe14a');
        }
        pxRect(c, fc.x - 6, fc.y - 22 - k * 6, 12, 3, '#ffd04a');
        for (let i = 0; i < 3; i++) pxRect(c, fc.x - 6 + i * 5, fc.y - 25 - k * 6, 2, 3, '#ffd04a');
      });
      hold(false);
      await back();
    },
    seakingcall: async m => {
      const fc = fc0(), x = fc.x;
      const sk = (c, y, open) => {
        pxRect(c, x - 12, y, 24, 80, '#3a9a7a');
        pxRect(c, x - 6, y, 12, 80, '#e8d79a');
        pxCircle(c, x, y, 13, '#3a9a7a');
        pxRect(c, x - 15, y - 5 - open, 30, 5, '#3a9a7a');
        pxRect(c, x - 15, y + 3 + open, 30, 5, '#2a7a5a');
        for (let i = 0; i < 6; i++) { pxRect(c, x - 13 + i * 5, y - open, 2, 3, '#ffffff'); pxRect(c, x - 13 + i * 5, y + 1 + open, 2, 2, '#ffffff'); }
        pxRect(c, x - 9, y - 12 - open, 3, 3, '#ffe14a'); pxRect(c, x + 6, y - 12 - open, 3, 3, '#ffe14a');
      };
      Sfx.play('splash');
      await fxRun(450, (c, k) => sk(c, lerp(150, fc.y + 4, easeOut(k)), 12));
      await fxRun(160, (c, k) => sk(c, fc.y + 4, 12 * (1 - k)));
      Sfx.play('bite');
      m.hit(0);
      shake(5, 300);
      particles(fc.x, 118, 20, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 90, grav: 140, dir: -Math.PI / 2, spread: 1.6 });
      await fxRun(320, (c, k) => sk(c, lerp(fc.y + 4, 150, easeIn(k)), 0));
    },
    ryugutide: async m => {
      const F = G.battle.F;
      Sfx.play('splash');
      const col = fxRun(1000, (c, k) => {
        const hgt = Math.min(1, k * 2.5) * 120;
        c.globalAlpha = 0.3;
        pxRect(c, F.x - 16, 122 - hgt, 32, hgt, '#4fa3e0');
        c.globalAlpha = 1;
        for (let y = 0; y < hgt; y += 2) {
          const yy = 122 - y, w = 14 + Math.sin(y * 0.15 + k * 20) * 4;
          pxRect(c, F.x - w, yy, 2, 2, '#2f6fd0');
          pxRect(c, F.x + w - 2, yy, 2, 2, '#2f6fd0');
          pxRect(c, F.x + Math.sin(y * 0.3 + k * 30) * w, yy, 3, 1, '#bfe6ff');
        }
      });
      await wait(300);
      for (let i = 0; i < 6; i++) { F.ox = Math.sin(i * 1.5) * 4; await tween(F, { squash: i % 2 ? 0.15 : -0.15 }, 70); }
      F.ox = 0; F.squash = 0;
      m.hit(0);
      shake(5, 300);
      await col;
      particles(F.x, 100, 24, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 90, grav: 140 });
    },

    // ---------- Fish-Man Island: Shark Fang Knuckles ----------
    fangpunch: async m => {
      await tween(G.hero, { ox: 54 }, 140, easeIn);
      const fc = fc0();
      m.hit(0);
      Sfx.play('bite');
      fxRun(600, (c, k) => {
        c.globalAlpha = 1 - k * 0.7;
        for (let i = 0; i < 6; i++) {
          const x = fc.x - 14 + i * 5;
          for (let j = 0; j < 4; j++) { pxRect(c, x + j * 0.5, fc.y - 10 + j, 4 - j, 1, '#ffffff'); pxRect(c, x + j * 0.5, fc.y + 10 - j, 4 - j, 1, '#ffffff'); }
        }
        c.globalAlpha = 1;
      });
      impact(fc, ['#7ab0c8', '#ffffff'], 10);
      shake(3, 200);
      await wait(200);
      await back();
    },
    waterheart: async m => {
      const fc = fc0(), h = heroHand();
      Sfx.play('splash');
      await projectile(h, fc, 260, (c, x, y, k) => { pxCircle(c, x, y, 3 + k * 4, '#2f8fd0'); pxCircle(c, x - 1, y - 1, 1 + k * 2, '#bfe6ff'); });
      await fxRun(420, (c, k) => {
        const r = 6 + easeOut(k) * 18;
        pxCircle(c, fc.x, fc.y, r, '#2f8fd0');
        c.globalAlpha = 0.5;
        pxCircle(c, fc.x, fc.y, r - 3, '#4fa3e0');
        c.globalAlpha = 1;
        pxRing(c, fc.x, fc.y, r, '#bfe6ff', 1);
        pxRect(c, fc.x - r * 0.5, fc.y - r * 0.6, 4, 1, '#ffffff');
        for (let i = 0; i < 3; i++) pxRect(c, fc.x - 6 + i * 6, fc.y + r - ((k * 40 + i * 9) % (r * 2)), 1, 1, '#ffffff');
      });
      Sfx.play('boom');
      m.hit(0);
      shake(4, 240);
      particles(fc.x, fc.y, 30, { colors: ['#2f8fd0', '#bfe6ff', '#ffffff'], speed: 110, grav: 140 });
    },
    sharkdarts: async m => {
      const h = heroHand(), fc = fc0();
      for (let i = 0; i < m.hits && foeHp(); i++) {
        Sfx.play('shot');
        G.hero.squash = i % 2 ? 0.05 : -0.05;
        const ty = fc.y + rand(-10, 10);
        await fxRun(110, (c, k) => {
          const x = lerp(h.x + 6, fc.x, k), y = lerp(h.y - 4, ty, k);
          pxRect(c, x - 2, y - 1, 4, 3, '#4fa3e0');
          pxRect(c, x + 2, y, 2, 1, '#bfe6ff');
          pxRect(c, x - 8, y, 5, 1, '#bfe6ff');
        });
        m.hit(i);
        particles(fc.x, ty, 5, { colors: ['#4fa3e0', '#ffffff'], speed: 50, grav: 100, size: 1 });
      }
      G.hero.squash = 0;
    },

    // ---------- Punk Hazard: Kikoku Nodachi ----------
    shambles: async m => {
      const hero = G.hero, F = G.battle.F;
      Sfx.play('charge');
      const room = fxRun(1300, (c, k) => {
        const r = Math.min(1, k * 3) * 70;
        c.globalAlpha = 0.18;
        pxCircle(c, 100, 121, r, '#7cd0ff');
        c.globalAlpha = 1;
        pxRing(c, 100, 121, r, '#bfe6ff', 1);
      });
      await wait(380);
      floatText(100, 44, 'ROOM', '#bfe6ff');
      Sfx.play('miss');
      const dx = F.x - hero.x;
      hero.ox = dx; F.ox = -dx;
      await wait(380);
      hero.ox = 0; F.ox = 0;
      await wait(100);
      hold(true);
      await tween(hero, { ox: 50 }, 90, easeIn);
      m.hit(0);
      slashAt(fc0(), '#7cd0ff', -0.4, 44);
      slashAt(fc0(), '#ffffff', -0.4, 34);
      await room;
      hold(false);
      await back();
    },
    countershock: async m => {
      await tween(G.hero, { ox: 54 }, 140, easeIn);
      const fc = fc0();
      Sfx.play('zap');
      screenFlash('#bfe6ff', 0.4);
      m.hit(0);
      fxRun(600, (c, k) => {
        for (let i = 0; i < 3; i++) {
          const r = ((k * 3 + i / 3) % 1) * 22 + 4;
          for (let a = 0; a < 6.28; a += 0.4) {
            const j = Math.floor(k * 30 + a * 5) % 2 ? 1 : -1;
            pxRect(c, fc.x - 6 + Math.cos(a) * (r + j), fc.y + Math.sin(a) * (r + j), 1, 1, i % 2 ? '#7cd0ff' : '#ffffff');
          }
        }
      });
      await wait(450);
      await back();
    },
    injection: async m => {
      hold(true);
      const hero = G.hero, fc = fc0(), x0 = hero.x;
      await tween(hero, { ox: -8, squash: 0.15 }, 160);
      Sfx.play('slash');
      const trail = fxRun(700, (c, k) => {
        c.globalAlpha = 1 - k;
        pxRect(c, x0, fc.y - 1, W - x0, 3, '#7cd0ff');
        pxRect(c, x0, fc.y, W - x0, 1, '#ffffff');
        c.globalAlpha = 1;
      });
      await tween(hero, { ox: 150, oy: fc.y - 104, squash: 0 }, 140, easeIn);
      m.hit(0);
      Sfx.play('crit');
      impact(fc, ['#7cd0ff', '#ffffff'], 14);
      shake(5, 300);
      await wait(200);
      hero.ox = -90; hero.oy = 0;
      await tween(hero, { ox: 0 }, 260);
      await trail;
      hold(false);
    },

    // ---------- Punk Hazard: Shinokuni Lamp ----------
    gastanet: async m => {
      const fc = fc0();
      Sfx.play('charge');
      await fxRun(300, (c, k) => {
        const g = lerp(24, 2, easeIn(k));
        for (const s of [-1, 1]) { const x = fc.x + s * g; pxRect(c, x - 4, fc.y - 6, 8, 12, '#d0b0f0'); pxRect(c, x - 3, fc.y - 9, 6, 3, '#d0b0f0'); }
        c.globalAlpha = 0.5;
        pxCircle(c, fc.x, fc.y, 6, '#b06ad0');
        c.globalAlpha = 1;
      });
      Sfx.play('boom');
      screenFlash('#ffd04a', 0.5);
      m.hit(0);
      ringOut(fc, '#b06ad0', 4, 30, 400, 3);
      ringOut(fc, '#ffd04a', 2, 22, 300, 2);
      particles(fc.x, fc.y, 30, { colors: ['#b06ad0', '#ffd04a', '#ff5a2a'], speed: 110 });
      shake(6, 360);
      await wait(200);
    },
    browncloud: async m => {
      const fc = fc0(), h = heroHand();
      const puffs = Array.from({ length: 10 }, (_, i) => [rand(-16, 16), rand(-12, 10), 4 + (i % 3) * 2]);
      Sfx.play('fire');
      const run = fxRun(900, (c, k) => {
        const q = Math.min(1, k * 2), cx = lerp(h.x + 10, fc.x, easeOut(q)), cy = lerp(h.y - 10, fc.y, q);
        c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 0.9;
        for (const [dx, dy, r] of puffs) pxCircle(c, cx + dx * q + Math.sin(k * 6 + dx) * 2, cy + dy * q, r, dx > 0 ? '#7a5a3a' : '#9a7a4a');
        for (let i = 0; i < 4; i++) pxRect(c, cx - 10 + i * 6, cy - 2 + Math.sin(k * 10 + i) * 6, 2, 2, '#c9a26a');
        c.globalAlpha = 1;
      });
      await wait(450);
      m.hit(0);
      await run;
    },
    shinokuni: async m => {
      const F = G.battle.F, fc = fc0();
      const blob = (c, x, r) => {
        pxCircle(c, x, 121 - r * 0.7, r, '#7a3aa0');
        pxCircle(c, x - r * 0.3, 121 - r, r * 0.5, '#9a5ac0');
        pxRect(c, x - r * 0.4, 121 - r * 1.1, 3, 2, '#ffffff');
        pxRect(c, x - 6, 121 - r * 0.9, 3, 3, '#ffe14a'); pxRect(c, x + 4, 121 - r * 0.9, 3, 3, '#ffe14a');
        pxRect(c, x - 6, 121 - r * 0.5, 12, 2, '#3a1a5a');
      };
      Sfx.play('charge');
      await fxRun(700, (c, k) => blob(c, lerp(-40, fc.x, easeOut(k)), 30 + Math.sin(k * 20) * 2));
      m.hit(0);
      Sfx.play('boom');
      shake(6, 400);
      await Promise.all([tween(F, { squash: 0.3 }, 150), fxRun(300, (c, k) => blob(c, fc.x, 30 + k * 6))]);
      tween(F, { squash: 0 }, 300);
      particles(fc.x, fc.y, 26, { colors: ['#7a3aa0', '#9a5ac0', '#d0b0f0'], speed: 90, grav: 40, size: 3 });
    },

    // ---------- Dressrosa: Kabuto Slingshot ----------
    trampolia: async m => {
      const F = G.battle.F, h = heroHand();
      const pad = (c, hgt) => {
        pxRect(c, F.x - 1, 121 - hgt, 3, hgt, '#3f9a3a');
        for (let i = 0; i < 8; i++) { const a = i * 0.785; pxCircle(c, F.x + Math.cos(a) * 12, 121 - hgt + Math.sin(a) * 3, 4, i % 2 ? '#ff7ab0' : '#ff9ac8'); }
        pxCircle(c, F.x, 121 - hgt, 4, '#ffe14a');
      };
      Sfx.play('shot');
      await projectile(h, { x: F.x, y: 119 }, 260, (c, x, y) => pxRect(c, x - 1, y - 1, 3, 3, '#5a3a22'));
      Sfx.play('stretch');
      const show = fxRun(1000, (c, k) => pad(c, Math.min(1, k * 4) * 16));
      m.hit(0);
      await tween(F, { oy: -40 }, 280, easeOut);
      await tween(F, { oy: -16 }, 220, easeIn);
      await tween(F, { oy: -28 }, 160, easeOut);
      await tween(F, { oy: 0 }, 220, easeIn);
      Sfx.play('hit');
      impact(fc0(), null, 8);
      await show;
    },
    firebird: async m => {
      const h = heroHand(), fc = fc0();
      Sfx.play('fire');
      await projectile({ x: h.x + 4, y: h.y - 6 }, fc, 420, (c, x, y, k) => {
        const f = Math.sin(k * 40) * 4;
        pxRect(c, x - 3, y - 2, 8, 4, '#ff9a3a');
        pxRect(c, x + 5, y - 1, 3, 2, '#ffd04a');
        pxLine(c, x, y, x - 8, y - 6 - f, '#ff5a2a', 2);
        pxLine(c, x, y, x - 8, y + 6 + f, '#ff5a2a', 2);
        pxRect(c, x - 10, y - 1, 4, 2, '#ffd04a');
        pxRect(c, x + 6, y - 2, 1, 1, PAL.k);
        particles(x - 8, y, 2, { colors: FIRE, speed: 20, grav: -40, life: 0.3 });
      });
      m.hit(0);
      Sfx.play('boom');
      particles(fc.x, fc.y, 24, { colors: FIRE, speed: 90, grav: -20 });
      ringOut(fc, '#ff9a3a', 2, 18, 300, 2);
      shake(3, 200);
    },
    devilplant: async m => {
      const F = G.battle.F, fc = fc0(), top = 121 - fc.y;
      const plant = (c, hgt, open) => {
        const x = F.x - 22, hy = 121 - hgt;
        for (let y = 0; y < hgt; y += 2) pxRect(c, x + Math.sin(y * 0.15) * 4, 121 - y, 4, 2, '#3f9a3a');
        pxRect(c, x + 2, 121 - hgt / 2, 10, 4, '#5ab84a');
        pxCircle(c, x + 6, hy, 10, '#c0453a');
        pxRect(c, x - 2, hy - 4 - open, 20, 5, '#c0453a');
        pxRect(c, x - 2, hy + 1 + open, 20, 5, '#8a2a22');
        for (let i = 0; i < 5; i++) { pxRect(c, x + i * 4, hy + 1 - open, 2, 3, '#ffffff'); pxRect(c, x + i * 4, hy + open, 2, 2, '#ffffff'); }
        for (let i = 0; i < 3; i++) pxRect(c, x - 6 + i * 2, hy - 8 + i * 3, 2, 2, '#f2f2f2');
      };
      Sfx.play('charge');
      await fxRun(450, (c, k) => plant(c, easeOut(k) * top, 10));
      await fxRun(150, (c, k) => plant(c, top, 10 * (1 - k)));
      Sfx.play('bite');
      m.hit(0);
      shake(5, 300);
      await fxRun(300, (c, k) => plant(c, top * (1 - easeIn(k)), 0));
    },

    // ---------- Dressrosa: Overheat Rope ----------
    overheat: async m => {
      const h = heroHand(), fc = fc0();
      const rope = (c, e, col, w) => {
        let px = h.x, py = h.y - 6;
        for (let i = 1; i <= 14; i++) {
          const t = i / 14 * e, x = lerp(h.x, fc.x + 8, t), y = lerp(h.y - 6, fc.y, t) + Math.sin(t * 6) * 10 * (1 - t);
          pxLine(c, px, py, x, y, col, w);
          px = x; py = y;
        }
      };
      Sfx.play('fire');
      await fxRun(260, (c, k) => { rope(c, easeOut(k), '#c0301a', 3); rope(c, easeOut(k), '#ffd04a', 1); });
      m.hit(0);
      Sfx.play('hit');
      fxRun(400, (c, k) => { c.globalAlpha = 1 - k; rope(c, 1, '#ff6a3a', 3); rope(c, 1, '#ffffff', 1); c.globalAlpha = 1; });
      particles(fc.x, fc.y, 16, { colors: ['#ff6a3a', '#ffd04a', '#c0301a'], speed: 80, grav: 60 });
      await wait(300);
    },
    spiderweb: async m => {
      const fc = fc0();
      const web = (c, s) => {
        for (let i = 0; i < 8; i++) { const a = i * 0.785; pxLine(c, fc.x, fc.y, fc.x + Math.cos(a) * 30 * s, fc.y + Math.sin(a) * 30 * s, '#f2f2f2'); }
        for (let r = 8; r <= 28; r += 7) {
          for (let i = 0; i < 8; i++) { const a = i * 0.785, b = a + 0.785; pxLine(c, fc.x + Math.cos(a) * r * s, fc.y + Math.sin(a) * r * s, fc.x + Math.cos(b) * r * s, fc.y + Math.sin(b) * r * s, '#d8d8e8'); }
        }
      };
      Sfx.play('stretch');
      await fxRun(320, (c, k) => web(c, easeOut(k)));
      m.hit(0);
      await fxRun(500, (c, k) => web(c, 1 - k * 0.15));
      particles(fc.x, fc.y, 8, { colors: ['#ffffff'], speed: 40, grav: 60, size: 1 });
    },
    parasite: async m => {
      const F = G.battle.F, fc = fc0(), xs = [-10, -4, 4, 10];
      Sfx.play('stretch');
      await fxRun(260, (c, k) => xs.forEach(dx => pxLine(c, F.x + dx * 3, -2, F.x + dx, lerp(-2, fc.y - 8, easeOut(k)), '#f2f2f2')));
      const str = fxRun(900, c => xs.forEach(dx => pxLine(c, F.x + dx * 3, -2, F.x + F.ox + dx, fc.y - 8 + F.oy, '#f2f2f2')));
      await tween(F, { oy: -34 }, 260, easeOut);
      await tween(F, { oy: 0, squash: 0.25 }, 140, easeIn);
      m.hit(0);
      Sfx.play('boom');
      shake(7, 400);
      dust(F.x, 18);
      await tween(F, { squash: 0 }, 200);
      await str;
    },

    // ---------- Whole Cake Island: Napoleon Sword ----------
    homieslash: async m => {
      hold(true);
      const img = getSprite(weaponSpec('napoleon'));
      await tween(G.hero, { ox: 44 }, 130, easeIn);
      const fc = fc0(), hx = () => G.hero.x + G.hero.ox + 12;
      floatText(hx(), 78, 'FOR MAMA!', '#ffe14a');
      Sfx.play('slash');
      await fxRun(240, (c, k) => drawRot(c, img, hx() + 4, 96, lerp(-1.4, 1.2, easeOut(k)), 2));
      m.hit(0);
      slashAt(fc, '#ffd04a', 0.9, 36);
      for (let i = 0; i < 5; i++) particles(fc.x + rand(-10, 10), fc.y + rand(-10, 10), 1, { colors: ['#ff8ab0', '#ffe14a', '#7cd0ff'], speed: 30, grav: 20 });
      hold(false);
      await back();
    },
    soulpocus: async m => {
      const fc = fc0(), F = G.battle.F;
      const soul = (c, x, y, k) => {
        c.globalAlpha = 0.8;
        pxCircle(c, x, y, 6, '#e8f0ff');
        pxRect(c, x - 6, y, 12, 6, '#e8f0ff');
        for (let i = 0; i < 3; i++) pxRect(c, x - 6 + i * 4, y + 6, 3, 2 + ((i + Math.floor(k * 10)) % 2) * 2, '#e8f0ff');
        pxRect(c, x - 3, y - 2, 2, 2, PAL.k); pxRect(c, x + 2, y - 2, 2, 2, PAL.k); pxRect(c, x - 1, y + 2, 2, 2, PAL.k);
        c.globalAlpha = 1;
      };
      Sfx.play('haki');
      await fxRun(400, (c, k) => { pxLine(c, fc.x, fc.y, fc.x, fc.y - k * 8, '#bfe6ff'); soul(c, fc.x, fc.y - k * 8, k); });
      m.hit(0);
      F.flash = 0.2;
      await fxRun(500, (c, k) => soul(c, lerp(fc.x, G.hero.x + 12, easeIn(k)), fc.y - 8 - Math.sin(k * Math.PI) * 20, k));
      Sfx.play('heal');
      particles(G.hero.x + 10, 96, 12, { colors: ['#e8f0ff', '#bfe6ff'], speed: 30, grav: -30 });
    },
    cakecrush: async m => {
      const fc = fc0();
      Sfx.play('charge');
      await dropOn(fc, 460, (c, x, y) => {
        [['#f2c7d8', 34], ['#ffffff', 28], ['#8a5a3a', 22]].forEach(([col, w], i) => {
          pxRect(c, x - w / 2, y + 6 - i * 9, w, 9, col);
          pxRect(c, x - w / 2, y + 6 - i * 9, w, 2, '#fff6f0');
        });
        for (let i = 0; i < 5; i++) pxRect(c, x - 10 + i * 5, y - 19, 2, 4, '#ff5a7a');
        pxRect(c, x - 1, y - 26, 2, 6, '#ffe14a');
      });
      Sfx.play('boom');
      m.hit(0);
      shake(7, 420);
      particles(fc.x, fc.y, 30, { colors: ['#ffffff', '#f2c7d8', '#ff5a7a', '#8a5a3a'], speed: 110, grav: 140, size: 3 });
    },

    // ---------- Whole Cake Island: Mogura Trident ----------
    moguradrill: async m => {
      hold(true);
      await tween(G.hero, { ox: 24 }, 120, easeIn);
      const fc = fc0(), from = { x: G.hero.x + G.hero.ox + 10, y: 102 };
      Sfx.play('charge');
      await fxRun(380, (c, k) => {
        const e = k < 0.6 ? easeOut(k / 0.6) : 1, tip = lerp(from.x, fc.x + 4, e), ty = lerp(from.y, fc.y, e);
        pxLine(c, from.x, from.y, tip, ty, '#3a1a1a', 3);
        for (let i = 0; i < 10; i++) { const t = i / 10; pxRect(c, lerp(from.x, tip, t), lerp(from.y, ty, t) + Math.sin(t * 20 + k * 40) * 3, 1, 1, '#c0453a'); }
        for (let i = 0; i < 3; i++) pxRing(c, tip, ty, 2 + i * 2 + Math.sin(k * 30 + i), i % 2 ? '#c0453a' : '#ffffff', 1);
      });
      m.hit(0);
      Sfx.play('hit');
      impact(fc, ['#c0453a', '#ffffff'], 12);
      shake(3, 200);
      hold(false);
      await back();
    },
    buzzcut: async m => {
      const fc = fc0(), h = heroHand();
      const donut = (c, x, y, a) => {
        pxCircle(c, x, y, 9, '#e8dcc8');
        pxCircle(c, x, y, 3, '#5a3c26');
        for (let i = 0; i < 8; i++) { const b = a + i * 0.785; pxRect(c, x + Math.cos(b) * 9 - 1, y + Math.sin(b) * 9 - 1, 3, 3, '#c9a26a'); }
      };
      Sfx.play('stretch');
      await fxRun(260, (c, k) => donut(c, lerp(h.x, fc.x, easeOut(k)), lerp(h.y, fc.y, k), k * 20));
      for (let i = 0; i < m.hits && foeHp(); i++) {
        await fxRun(170, (c, k) => donut(c, fc.x + Math.sin(k * 6) * 3, fc.y, (i + k) * 12));
        Sfx.play('slash');
        m.hit(i);
        particles(fc.x, fc.y + 8, 6, { colors: ['#e8dcc8', '#ffffff'], speed: 60, grav: 80, size: 1 });
      }
    },
    snakedance: async m => {
      hold(true);
      await tween(G.hero, { ox: 26 }, 120, easeIn);
      const fc = fc0();
      for (let i = 0; i < m.hits && foeHp(); i++) {
        const ty = fc.y + Math.sin(i * 1.3) * 14, f = { x: G.hero.x + G.hero.ox + 10, y: 102 };
        Sfx.play('slash');
        await fxRun(90, (c, k) => {
          let px = f.x, py = f.y;
          for (let j = 1; j <= 8; j++) {
            const t = j / 8 * easeOut(k), x = lerp(f.x, fc.x, t), y = lerp(f.y, ty, t) + Math.sin(t * Math.PI * 2 + i) * 6;
            pxLine(c, px, py, x, y, '#3a1a1a', 2);
            px = x; py = y;
          }
          pxRect(c, px - 1, py - 2, 3, 5, '#c0453a');
        });
        m.hit(i);
        impact({ x: fc.x, y: ty }, ['#c0453a', '#ffffff'], 4);
      }
      hold(false);
      await back();
    },
  });

  SLASH_MOVES.push('ryumadraw', 'shadowlion', 'blacktornado', 'snipsnip', 'shadowcut', 'lightedge', 'flashstep', 'venomslash', 'bisentosweep', 'homieslash', 'injection', 'shambles');
  SHOT_MOVES.push('weaponsleft', 'bubblebarrage', 'bubbleburst', 'sharkdarts', 'firebird', 'trampolia');
}
