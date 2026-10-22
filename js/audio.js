'use strict';
/* Tiny chiptune sound effects built with Web Audio oscillators. */

const Sfx = (() => {
  let ac = null;
  let noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('pocket-pirate-muted') === '1'; } catch (e) { /* storage blocked */ }

  function audio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, delay) {
    const a = audio();
    if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (delay || 0);
    const src = a.createBufferSource();
    const g = a.createGain();
    src.buffer = noiseBuf;
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const notes = (list, gap, type, vol, dur) =>
    list.forEach((f, i) => tone(f, dur || gap * 1.2, type || 'square', vol || 0.045, null, i * gap));

  const SOUNDS = {
    select:  () => tone(660, 0.05, 'square', 0.03),
    hit:     () => { noise(0.1, 0.12); tone(180, 0.12, 'square', 0.05, 60); },
    crit:    () => { noise(0.2, 0.16); tone(520, 0.16, 'sawtooth', 0.05, 90); },
    miss:    () => tone(320, 0.16, 'triangle', 0.05, 180),
    hurt:    () => { noise(0.15, 0.12); tone(150, 0.2, 'square', 0.06, 50); },
    heal:    () => { tone(520, 0.1, 'triangle', 0.06, 780); tone(780, 0.14, 'triangle', 0.06, 1040, 0.08); },
    coin:    () => { tone(988, 0.07, 'square', 0.04); tone(1319, 0.16, 'square', 0.04, null, 0.07); },
    level:   () => notes([523, 659, 784, 1047, 1319], 0.09),
    win:     () => notes([392, 523, 659, 784, 659, 784, 1047], 0.1),
    lose:    () => notes([392, 330, 262, 196], 0.18, 'triangle', 0.06),
    boss:    () => { tone(90, 0.7, 'sawtooth', 0.07, 40); noise(0.6, 0.07); },
    charge:  () => tone(180, 0.55, 'sawtooth', 0.04, 700),
    zap:     () => { noise(0.25, 0.14); tone(1400, 0.22, 'sawtooth', 0.04, 200); },
    fire:    () => { noise(0.35, 0.12); tone(220, 0.3, 'sawtooth', 0.03, 90); },
    ice:     () => { tone(1800, 0.12, 'triangle', 0.05, 2400); tone(1200, 0.2, 'triangle', 0.04, 1600, 0.06); },
    boom:    () => { noise(0.5, 0.2); tone(70, 0.5, 'square', 0.07, 30); },
    stretch: () => tone(180, 0.18, 'triangle', 0.07, 760),
    shot:    () => { noise(0.07, 0.16); tone(900, 0.07, 'square', 0.04, 160); },
    find:    () => notes([523, 784, 659, 1047], 0.08, 'square', 0.045),
    slash:   () => { noise(0.08, 0.1); tone(1200, 0.08, 'sawtooth', 0.03, 400); },
    perfect: () => { tone(880, 0.06, 'square', 0.04); tone(1760, 0.14, 'square', 0.04, null, 0.05); },
    good:    () => tone(660, 0.1, 'square', 0.04),
    bad:     () => tone(170, 0.18, 'square', 0.04, 120),
    splash:  () => noise(0.3, 0.1),
    eat:     () => notes([300, 380, 300, 420], 0.07, 'square', 0.035),
    bite:    () => notes([880, 1175], 0.06, 'square', 0.05),
    sleep:   () => notes([523, 440, 392, 330], 0.2, 'triangle', 0.045, 0.3),
    haki:    () => { tone(110, 0.6, 'sawtooth', 0.05, 55); tone(220, 0.6, 'square', 0.03, 110); },
  };

  return {
    play(name) {
      if (muted || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* audio unavailable */ }
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('pocket-pirate-muted', muted ? '1' : '0'); } catch (e) { /* storage blocked */ }
      if (!muted) audio();
      return muted;
    },
    unlock() { if (!muted) audio(); },
  };
})();
