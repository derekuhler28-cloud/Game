'use strict';
/* Pocket Pirate: game state, menus, the life-sim day loop, battles, raids and mini-games. */

const $ = id => document.getElementById(id);
const canvas = $('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const SAVE_KEY = 'pocket-pirate-save-v1';
const PLAYER_SPR = { kind: 'player', pal: PLAYER_PAL };
const FIRE = ['#ff5a2a', '#ff9a3a', '#ffd04a', '#fff3a0'];
const ICE = ['#5fd3f0', '#bff2ff', '#ffffff'];
const SMOKE = ['#ffffff', '#dfe2ea', '#b9bdc9'];
const SAND = ['#e8c27b', '#c9963b', '#f5d79a'];
const SHORT = { meat: 'Meat', bigmeat: 'Giant Meat', fish: 'Fish', kingmeat: 'King Steak', medicine: 'Medicine', cola: 'Cola', water: 'Water' };
const BATTLE_CREW_SPOTS = [[24, 111], [36, 106], [12, 106], [30, 116], [16, 117]];

const G = {
  mode: 'title', p: null, battle: null, train: null, fish: null, sail: null,
  busy: false, t: 0, fade: 0, bubble: null, saved: null,
  hero: { x: 110, tx: 110, pause: 1, ox: 0, oy: 0, squash: 0, flash: 0, alpha: 1 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.round(n).toLocaleString('en-US');
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);

// ---------- player ----------

const DRAGON_FORM = { kind: 'serpent', horns: true, pal: { c: '#4a8ad9', C: '#bfe0ff', x: '#f2e6c8' } };

function newPlayer(name, raceKey) {
  const R = RACES[raceKey] || RACES.human;
  const st = R.stats;
  const hp = Math.round((60 + (st.hp || 0)) * (st.hpMult || 1));
  return {
    v: 5, name, race: RACES[raceKey] ? raceKey : 'human',
    lvl: 1, xp: 0, hp, maxHp: hp, atk: 10 + (st.atk || 0), def: 4, spd: 5 + (st.spd || 0), haki: 0,
    energy: 100, food: 70, mood: 60, berries: 50, bounty: 0,
    day: 1, tick: 0, dayLen: TICKS_PER_DAY, island: 0, unlocked: 1, bosses: {}, crew: [], fruit: null,
    bag: { meat: 1 }, owned: {}, wins: 0, trained: 0, king: false,
    weapon: null, weapons: [], mastery: {}, explored: {}, fruitMap: dealFruits({}, []), fruitsFound: [], fruitBag: [],
    ship: { paint: 'wood', head: null }, awakened: {}, clothes: [], wear: { hat: null, coat: null, charm: null },
  };
}

// The first Grand Line island comes right after Smoker's Logue Town, over Reverse Mountain.
const GL_START = ISLANDS.findIndex(i => i.boss === 'smoker') + 1;
const inGrandLine = idx => idx >= GL_START;
// Fish-Man Island sits 10,000 m under the Red Line, between Paradise and the New World.
const FISHMAN = ISLANDS.findIndex(i => i.scene === 'fishman');

// Puts every Devil Fruit that is not yet on the map (or found) onto an island: emptiest islands first.
function dealFruits(map, found) {
  const out = {};
  for (let i = 0; i < ISLANDS.length; i++) out[i] = [].concat(map[i] || []).filter(k => FRUITS[k]);
  const placed = new Set(Object.values(out).flat().concat(found));
  for (const k of shuffle(Object.keys(FRUITS))) {
    if (placed.has(k)) continue;
    const fewest = Math.min(...Object.values(out).map(a => a.length));
    const spots = Object.keys(out).filter(i => out[i].length === fewest && (fewest === 0 || +i > 0));
    out[pick(spots.length ? spots : Object.keys(out))].push(k);
  }
  // Islands added in an update start empty: hand them an unfound fruit from a crowded island.
  for (let i = 1; i < ISLANDS.length; i++) {
    if (out[i].length) continue;
    const from = Object.keys(out).find(j => out[j].length > 1 && out[j].some(k => !found.includes(k)));
    if (from === undefined) continue;
    const k = out[from].find(f => !found.includes(f));
    out[from] = out[from].filter(f => f !== k);
    out[i].push(k);
  }
  return out;
}

const island = () => ISLANDS[G.p.island];
const timeIdx = () => (G.p ? Math.min(3, Math.floor(G.p.tick / SLOT_TICKS)) : 0);
const timeName = () => (G.p.tick >= TICKS_PER_DAY ? 'Late Night' : TIME_NAMES[Math.floor(G.p.tick / SLOT_TICKS)]);
const isLate = () => G.p.tick >= TICKS_PER_DAY;
const xpNeed = l => Math.round(12 * Math.pow(l, 1.35));
const moodMult = () => (G.p.mood >= 75 ? 1.1 : G.p.mood <= 25 ? 0.9 : 1);
const fruit = () => (G.p.fruit ? FRUITS[G.p.fruit] : null);
const effDef = () => Math.round((G.p.def + ((weapon() && weapon().def) || 0) + wearBonus('def')) * ((fruit() && fruit().defMult) || 1));
const effSpd = () => G.p.spd + wearBonus('spd');
const crewOf = key => G.p.crew.find(m => m.key === key);
const crewWith = role => G.p.crew.find(m => CREW[m.key].role === role);
const foodBoost = () => (crewWith('cook') ? 1.5 : 1) * (G.p.owned.galley ? 1.25 : 1);
const trainCap = k => { const L = G.p.lvl; return Math.round({ atk: 12 + L * 4, def: 6 + L * 2.5, spd: 7 + L * 2.5, haki: 4 + L * 2 }[k]); };

function pirateTitle(b) {
  if (G.p && G.p.king) return 'Pirate King';
  if (b >= 1000000000) return 'Emperor-class menace';
  if (b >= 300000000) return 'Warlord-class terror';
  if (b >= 80000000) return 'Supernova';
  if (b >= 10000000) return 'Rising rookie';
  return 'Nobody (yet)';
}

function gainXp(n) {
  const p = G.p;
  const from = p.lvl;
  p.xp += n;
  while (p.xp >= xpNeed(p.lvl)) {
    p.xp -= xpNeed(p.lvl);
    p.lvl++;
    p.maxHp += Math.round(9 * (race().stats.hpMult || 1)) + (p.fruit === 'dragon' ? 2 : 0);
    p.atk += 2; p.def += 1; p.spd += 1;
    p.hp = p.maxHp;
  }
  return { from, to: p.lvl };
}

async function announceLevels(r) {
  const n = r.to - r.from;
  if (!n) return;
  const p = G.p;
  Sfx.play('level');
  screenFlash('#fff6a0', 0.45);
  floatText(G.hero.x, 70, 'LEVEL UP!', '#ffe14a', 2);
  await talk(`LEVEL UP! You're Lv ${p.lvl}. HP +${9 * n}, ATK +${2 * n}, DEF +${n}, SPD +${n}.`);
}

// ---------- save / load ----------

function save() {
  if (!G.p) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.p)); } catch (e) { /* storage blocked: play continues */ }
}

function restore(raw) {
  if (!raw || ![1, 2, 3, 4, 5].includes(raw.v)) return null;
  const p = Object.assign(newPlayer(raw.name || 'Nobody'), raw);
  p.bag = Object.assign({}, p.bag);
  p.owned = Object.assign(raw.weights ? { weights: true } : {}, p.owned);
  if (raw.v === 1) {
    // Saves from before weapons existed: keep the moves they had by level.
    p.v = 2;
    p.fruitsFound = p.fruit ? [p.fruit] : [];
    p.mastery = { fists: p.lvl >= 9 ? 90 : p.lvl >= 4 ? 40 : 10 };
    if (p.fruit) p.mastery[p.fruit] = p.lvl >= 9 ? 120 : p.lvl >= 4 ? 40 : 0;
  }
  if (p.v === 2) {
    // Three islands now sit between Shell Port and Arlong Park, and crewmates are hired at bars.
    const moved = i => (+i <= 1 ? +i : +i + 3);
    const remap = obj => Object.fromEntries(Object.entries(obj || {}).map(([i, v]) => [moved(i), v]));
    p.v = 3;
    p.island = moved(p.island);
    p.unlocked = p.unlocked <= 2 ? p.unlocked : p.unlocked + 3;
    p.explored = remap(p.explored);
    raw = Object.assign({}, raw, { fruitMap: remap(raw.fruitMap) });
    p.bosses = Object.assign({}, p.bosses);
    if (p.bosses.sharko) { p.bosses.arlong = p.bosses.sharko; delete p.bosses.sharko; }
    p.crew = (p.crew || []).map(key => ({ key, weapon: null, fruit: null }));
  }
  if (p.v === 3) {
    // Logue Town and Drum Island now sit between Arlong Park and Sandora.
    const moved = i => (+i <= 5 ? +i : +i + 2);
    const remap = obj => Object.fromEntries(Object.entries(obj || {}).map(([i, v]) => [moved(i), v]));
    p.v = 4;
    p.island = moved(p.island);
    p.unlocked = p.unlocked <= 6 ? p.unlocked : p.unlocked + 2;
    p.explored = remap(p.explored);
    raw = Object.assign({}, raw, { fruitMap: remap(raw.fruitMap) });
  }
  if (p.v === 4) {
    // Ten islands, from Water 7 to Whole Cake Island, now sit between Cloud Isle and Last Isle.
    const moved = i => (+i <= 9 ? +i : +i + 10);
    const remap = obj => Object.fromEntries(Object.entries(obj || {}).map(([i, v]) => [moved(i), v]));
    p.v = 5;
    p.island = moved(p.island);
    p.unlocked = p.unlocked <= 10 ? p.unlocked : p.unlocked + 10;
    p.explored = remap(p.explored);
    raw = Object.assign({}, raw, { fruitMap: remap(raw.fruitMap) });
  }
  // Days used to be 8 ticks long: keep the same time of day on older saves.
  if (!raw.dayLen) p.tick = Math.min(TICKS_PER_DAY, Math.round((raw.tick || 0) * TICKS_PER_DAY / 8));
  p.dayLen = TICKS_PER_DAY;
  p.ship = Object.assign({ paint: 'wood', head: null }, p.ship);
  // Older saves stored a straw hat or a pirate outfit; your pirate wears neither now.
  delete p.hat;
  delete p.pirate;
  p.awakened = Object.assign({}, p.awakened);
  p.clothes = (p.clothes || []).filter(k => CLOTHES[k]);
  p.wear = Object.assign({ hat: null, coat: null, charm: null }, p.wear);
  for (const sl of SLOTS) if (!p.clothes.includes(p.wear[sl])) p.wear[sl] = null;
  // Each piece is worn by one person at most.
  const taken = new Set(SLOTS.map(sl => p.wear[sl]).filter(Boolean));
  for (const m of p.crew) {
    m.wear = Object.assign({ hat: null, coat: null, charm: null }, m.wear);
    for (const sl of SLOTS) {
      const k = m.wear[sl];
      if (k && (!p.clothes.includes(k) || CLOTHES[k].slot !== sl || taken.has(k))) m.wear[sl] = null;
      else if (k) taken.add(k);
    }
  }
  // Bosses beaten before clothes existed still owe you their signature piece.
  const owed = Object.keys(CLOTHES).filter(k => CLOTHES[k].boss && p.bosses[CLOTHES[k].boss] && !p.clothes.includes(k));
  p.clothes.push(...owed);
  G.owedClothes = owed.length;
  p.crew = (p.crew || []).filter(m => m && CREW[m.key]).slice(0, CREW_MAX);
  for (const m of p.crew) {
    if (!p.weapons.includes(m.weapon) || m.weapon === p.weapon) m.weapon = null;
    if (!FRUITS[m.fruit]) m.fruit = null;
  }
  // Older saves map one fruit per island and lack the newer fruits: spread the missing ones out.
  p.fruitMap = dealFruits(raw.fruitMap || {}, p.fruitsFound);
  if (!RACES[p.race]) p.race = 'human';
  return p;
}

// ---------- save codes ----------
// Your whole save as one line of text (PP1 = compressed, PP0 = plain) plus a short check, so you can copy it
// anywhere and load it on any browser or device.

function toB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  return Uint8Array.from(bin, ch => ch.charCodeAt(0));
}

function codeCheck(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h.toString(36).slice(0, 5).toUpperCase();
}

const streamBytes = (bytes, stream) => new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(b => new Uint8Array(b));

async function makeSaveCode() {
  let bytes = new TextEncoder().encode(JSON.stringify(G.p)), tag = 'PP0';
  try { bytes = await streamBytes(bytes, new CompressionStream('deflate-raw')); tag = 'PP1'; } catch (e) { /* no compression here: plain code */ }
  const data = toB64(bytes);
  return `${tag}.${data}.${codeCheck(data)}`;
}

// Returns the player from a code, or throws an Error whose message says what went wrong.
async function readSaveCode(code) {
  const [tag, data, check] = code.replace(/\s+/g, '').split('.');
  if (!data || !['PP0', 'PP1'].includes(tag)) throw new Error("That doesn't look like a Pocket Pirate save code.");
  if (codeCheck(data) !== (check || '').toUpperCase()) throw new Error('That code has a typo or is cut off. Copy the whole thing and try again.');
  let bytes = fromB64(data);
  if (tag === 'PP1') {
    try { bytes = await streamBytes(bytes, new DecompressionStream('deflate-raw')); } catch (e) { throw new Error("This browser can't open compressed codes. Try a newer browser."); }
  }
  let p = null;
  try { p = restore(JSON.parse(new TextDecoder().decode(bytes))); } catch (e) { p = null; }
  if (!p) throw new Error("That save code couldn't be loaded.");
  return p;
}

async function saveCodeMenu() {
  const body = el('div');
  body.style.display = 'contents';
  const box = el('textarea', { class: 'codebox', readonly: true, rows: '5', 'aria-label': 'Your save code', spellcheck: 'false' });
  box.value = 'Making your code...';
  const status = el('p', { class: 'note', 'aria-live': 'polite', text: 'Keep this code somewhere safe (a notes app, or text it to yourself). Load it from the title screen on any browser to pick up right here.' });
  body.append(status, box, el('div', { class: 'btn-row' },
    el('button', { type: 'button', class: 'mini-btn red', text: 'Copy code', onclick: () => copyCode(box, status) }),
    el('button', { type: 'button', class: 'mini-btn', text: 'Load a different code', onclick: () => loadCodeMenu() })));
  openModal('Save Code', body, { onClose: backToMenu });
  save();
  box.value = await makeSaveCode();
  box.focus();
  box.select();
}

async function copyCode(box, status) {
  try { await navigator.clipboard.writeText(box.value); } catch (e) { box.select(); document.execCommand('copy'); }
  Sfx.play('coin');
  status.textContent = `Copied! Day ${G.p.day}, level ${G.p.lvl}. Paste it somewhere safe.`;
}

function loadCodeMenu() {
  const body = el('div');
  body.style.display = 'contents';
  const box = el('textarea', { class: 'codebox', rows: '5', 'aria-label': 'Paste a save code', placeholder: 'Paste your save code here (it starts with PP1)', spellcheck: 'false', autocomplete: 'off' });
  const status = el('p', { class: 'note', 'aria-live': 'polite', text: G.p || G.saved ? 'Loading a code replaces the save on this browser.' : 'Paste a code from another browser or device to keep playing that save.' });
  body.append(status, box, el('div', { class: 'btn-row' },
    el('button', { type: 'button', class: 'mini-btn red', text: 'Load', onclick: async () => {
      try {
        const p = await readSaveCode(box.value);
        G.p = p;
        G.saved = p;
        save();
        modalOnClose = null;
        closeModal();
        Sfx.play('find');
        enterGame(true);
      } catch (e) {
        Sfx.play('bad');
        status.textContent = e.message;
      }
    } }),
    el('button', { type: 'button', class: 'mini-btn', text: 'Cancel', onclick: closeModal })));
  openModal('Load Save Code', body, { onClose: G.mode === 'title' ? null : backToMenu });
  box.focus();
}

function loadSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? restore(JSON.parse(s)) : null;
  } catch (e) {
    return null;
  }
}

// ---------- DOM helpers ----------

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const k in attrs || {}) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid);
  return n;
}

function actionButton(a, cls) {
  const b = el('button', { type: 'button', class: cls + (a.cls ? ' ' + a.cls : '') + (a.blocked ? ' dim' : '') });
  if (a.icon) b.append(el('img', { src: a.icon, alt: '' }));
  b.append(el('span', { text: a.label }));
  if (a.sub) b.append(el('small', { text: a.sub }));
  if (a.badge) b.append(el('span', { class: 'badge', text: a.badge, 'aria-label': `${a.badge} left` }));
  b.addEventListener('click', () => {
    if (G.busy) return;
    Sfx.unlock();
    if (a.blocked) { Sfx.play('bad'); say(a.blocked); return; }
    Sfx.play('select');
    a.onClick();
  });
  return b;
}

// Primary actions go in the main grid; `dock` (home screen only) fills the icon bar below it.
function setActions(list, layout, dock) {
  const box = $('actions');
  box.className = 'actions' + (layout ? ' ' + layout : '') + (G.busy ? ' locked' : '');
  box.replaceChildren(...list.map(a => actionButton(a, 'btn')));
  const bar = $('dock');
  bar.hidden = !dock;
  bar.style.setProperty('--n', dock ? dock.length : 8);
  bar.classList.toggle('locked', G.busy);
  bar.replaceChildren(...(dock || []).map(a => actionButton(a, 'dock-btn')));
}

function lock(on) {
  G.busy = on;
  $('actions').classList.toggle('locked', on);
  $('dock').classList.toggle('locked', on);
}

// ---------- message box ----------

let msgFull = '', typeTimer = null, sayTimer = null, sayRes = null;

function finishTyping() {
  clearInterval(typeTimer);
  typeTimer = null;
  $('msgText').textContent = msgFull;
}

function resolveSay() {
  clearTimeout(sayTimer);
  $('msg').classList.remove('waiting');
  if (sayRes) { const r = sayRes; sayRes = null; r(); }
}

function say(text, ms) {
  resolveSay();
  finishTyping();
  msgFull = text;
  $('srMsg').textContent = text;
  const elText = $('msgText');
  let i = 0;
  elText.textContent = '';
  typeTimer = setInterval(() => {
    i += 2;
    elText.textContent = msgFull.slice(0, i);
    if (i >= msgFull.length) finishTyping();
  }, 14);
  if (!ms) return Promise.resolve();
  $('msg').classList.add('waiting');
  return new Promise(res => {
    sayRes = res;
    sayTimer = setTimeout(() => { finishTyping(); resolveSay(); }, ms);
  });
}

const talk = text => say(text, clamp(800 + text.length * 32, 1100, 3400));

function onMsgTap() {
  if (typeTimer) finishTyping();
  else resolveSay();
}

// ---------- modal ----------

let modalOnClose = null;

function openModal(title, body, opts) {
  opts = opts || {};
  $('modalTitle').textContent = title;
  $('modalBody').replaceChildren(body);
  $('modalClose').hidden = !!opts.locked;
  $('modal').hidden = false;
  modalOnClose = opts.onClose || null;
  const focusable = $('modal').querySelector('.panel-body button:not([disabled]), #modalClose:not([hidden])');
  if (focusable) focusable.focus();
}

function closeModal() {
  if ($('modal').hidden) return;
  $('modal').hidden = true;
  const cb = modalOnClose;
  modalOnClose = null;
  if (cb) cb();
}

// ---------- HUD ----------

const hudCache = {};
function setText(id, text) {
  if (hudCache[id] === text) return;
  hudCache[id] = text;
  $(id).textContent = text;
}

function updateHud() {
  const p = G.p;
  const inGame = !!p && G.mode !== 'title';
  $('hud').hidden = !inGame;
  $('hudBerries').hidden = !inGame;
  $('meters').hidden = !inGame;
  if (!inGame) return;
  setText('hudName', p.name);
  setText('hudLv', 'Lv ' + p.lvl);
  setText('hudBerries', '฿' + fmt(p.berries));
  const status = p.food <= 0 ? 'STARVING' : p.energy < 15 ? 'EXHAUSTED' : p.mood >= 75 ? 'PUMPED' : p.mood <= 25 ? 'GLOOMY' : '';
  const chip = $('hudStatus');
  chip.hidden = !status;
  if (status) { setText('hudStatus', status); chip.classList.toggle('good', status === 'PUMPED'); }

  // [label, value, max, color token, accessible name, show number]
  const B = G.battle;
  const meters = B
    ? [['HP', p.hp, p.maxHp, '--hp', 'Health', true], ['SP', B.sp, 100, '--sp', 'Spirit', true]]
    : [['HP', p.hp, p.maxHp, '--hp', 'Health', true], ['EN', p.energy, 100, '--en', 'Energy'], ['FOOD', p.food, 100, '--food', 'Food'], ['MOOD', p.mood, 100, '--mood', 'Mood']];
  const box = $('meters');
  const key = meters.map(m => m[0]).join();
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    box.style.setProperty('--n', meters.length);
    box.replaceChildren(...meters.map(m => el('div', { class: 'meter', role: 'progressbar', 'aria-label': m[4], 'aria-valuemin': '0' },
      el('div', { class: 'mtop' }, el('span', { text: m[0] }), m[5] ? el('span', { class: 'mv' }) : null),
      el('div', { class: 'mb', style: `--c: var(${m[3]})` }, el('i')))));
  }
  meters.forEach((m, i) => {
    const cell = box.children[i];
    const w = Math.round(clamp(m[1] / m[2], 0, 1) * 100) + '%';
    const bar = cell.querySelector('i');
    if (bar.style.width !== w) bar.style.width = w;
    const now = String(Math.ceil(m[1]));
    if (cell.getAttribute('aria-valuenow') !== now) {
      cell.setAttribute('aria-valuenow', now);
      cell.setAttribute('aria-valuemax', String(m[2]));
      cell.title = `${m[4]} ${now}/${m[2]}`;
    }
    const mv = cell.querySelector('.mv');
    const txt = `${now}/${m[2]}`;
    if (mv && mv.textContent !== txt) mv.textContent = txt;
  });
}

// ---------- title / new game ----------

function showTitle() {
  G.mode = 'title';
  G.battle = null;
  closeModal();
  const saved = G.saved;
  if (saved) {
    setActions([
      { label: 'Continue', sub: `${saved.name} - Lv ${saved.lvl} - Day ${saved.day}`, cls: 'raid', onClick: () => { G.p = saved; enterGame(true); } },
      { label: 'New Game', sub: 'start over', onClick: () => newGameForm(true) },
      { label: 'Load Code', sub: 'paste a save code', cls: 'ghost', onClick: loadCodeMenu },
    ], 'single');
    say('Welcome back, Captain. Your ship is waiting.');
  } else {
    newGameForm(false);
    say('Start as a nobody. Walk the islands, search for weapons and Devil Fruits, master their moves, and fight your way to Pirate King!');
  }
  updateHud();
}

function newGameForm(overwrite) {
  const box = $('actions');
  box.className = 'actions single';
  $('dock').hidden = true;
  const input = el('input', { id: 'nameInput', maxlength: '12', autocomplete: 'off', value: overwrite ? '' : 'Nobody', placeholder: 'Nobody' });
  const form = el('form', { class: 'nameform' },
    el('label', { for: 'nameInput', text: 'Name your pirate' }),
    input,
    el('button', { type: 'submit', class: 'btn raid', text: overwrite ? 'Set sail (new save)' : 'Set sail!' }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    Sfx.unlock();
    Sfx.play('select');
    const name = input.value.trim().replace(/\s+/g, ' ').slice(0, 12) || 'Nobody';
    raceMenu(name);
  });
  const kids = [form];
  if (overwrite) kids.push(el('button', { type: 'button', class: 'btn ghost', text: 'Back', onclick: () => showTitle() }));
  else kids.push(el('button', { type: 'button', class: 'btn ghost', text: 'Load a save code', onclick: loadCodeMenu }));
  box.replaceChildren(...kids);
  if (overwrite) say('Starting over replaces your current save.');
}

function raceMenu(name) {
  const body = el('div');
  body.style.display = 'contents';
  body.append(el('p', { class: 'note', text: `What kind of pirate is ${name}? Your race sets your starting stats, perks and flaws.` }));
  for (const k of Object.keys(RACES)) {
    const R = RACES[k];
    body.append(el('div', { class: 'row race' },
      el('img', { src: spriteURL(raceSpec(k), 3), alt: '' }),
      el('div', null,
        el('h3', { text: R.name }),
        el('p', { text: R.desc }),
        el('ul', { class: 'traits' },
          R.perks.map(t => el('li', { class: 'perk', text: t })),
          R.flaws.map(t => el('li', { class: 'flaw', text: t })))),
      el('button', { type: 'button', class: 'mini-btn red', text: 'Pick', 'aria-label': `Play as a ${R.name}`, onclick: () => startNewGame(name, k) })));
  }
  openModal('Choose your race', body);
  raceTitle();
}

// The "Choose" in the title is a secret button that opens the fruit circle.
function raceTitle() {
  const f = FRUITS[eggFruit];
  $('modalTitle').replaceChildren(
    el('button', { type: 'button', class: 'egg-word', id: 'eggWord', text: 'Choose', onclick: fruitEgg }),
    ' your race');
  if (f) $('modalTitle').append(el('img', { class: 'egg-mark', src: fruitURL(eggFruit), alt: ` (secret: ${f.name})` }));
}

function startNewGame(name, raceKey) {
  closeModal();
  const secret = eggFruit;
  eggFruit = null;
  G.p = newPlayer(name, raceKey);
  if (secret) plantFruit(G.p.fruitMap, secret, 0);
  G.saved = null;
  save();
  enterGame(false, secret);
}

// ---------- secret fruit (Easter egg on the race picker) ----------

let eggFruit = null;
const EGG = { paused: false, hover: false };

// Hides fruit k on island idx; whatever was hidden there swaps over to k's old island.
function plantFruit(map, k, idx) {
  const others = (map[idx] || []).filter(f => f !== k);
  let from = Object.keys(map).find(i => +i !== idx && map[i].includes(k));
  for (const i in map) map[i] = map[i].filter(f => f !== k);
  if (from === undefined) from = Object.keys(map).filter(i => +i !== idx).sort((a, b) => map[a].length - map[b].length)[0];
  map[from] = map[from].concat(others);
  map[idx] = [k];
}

function fruitEgg(e) {
  if ($('egg')) return;
  Sfx.unlock();
  Sfx.play('haki');
  const r = e.currentTarget.getBoundingClientRect();
  const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
  const pop = el('div', { class: 'egg-pop' });
  pop.style.left = ox + 'px';
  pop.style.top = oy + 'px';
  pop.addEventListener('animationend', () => pop.remove());
  const fruits = Object.keys(FRUITS).map(k => {
    const f = FRUITS[k];
    return el('button', {
      type: 'button', class: 'egg-fruit', 'data-k': k, 'aria-label': f.name, title: f.name,
      onclick: () => eggAsk(k), onpointerenter: () => { EGG.hover = true; }, onpointerleave: () => { EGG.hover = false; },
    },
      el('img', { src: fruitURL(k), alt: '' }));
  });
  const layer = el('div', { class: 'egg-layer', id: 'egg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Secret Devil Fruits' },
    pop, fruits,
    el('div', { class: 'egg-card', id: 'eggCard', hidden: true }),
    el('button', { type: 'button', class: 'close egg-close', 'aria-label': 'Close', text: 'X', onclick: closeEgg }));
  layer.addEventListener('pointerdown', ev => { if (ev.target === layer && $('eggCard').hidden) closeEgg(); });
  document.body.append(layer);
  EGG.paused = EGG.hover = false;
  fruits[0].focus({ preventScroll: true });

  // Fruits burst out of the pop, then circle the edge of the screen until one is picked.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  let spin = 0, last = start;
  const frame = now => {
    if (!layer.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!still && !EGG.paused && !EGG.hover) spin += dt * 0.45;
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const rx = Math.max(70, cx - 40), ry = Math.max(70, cy - 48);
    fruits.forEach((b, i) => {
      const t = still ? 1 : Math.max(0, Math.min(1, (now - start - i * 40) / 650));
      const ease = 1 - Math.pow(1 - t, 3);
      const a = spin + (i / fruits.length) * Math.PI * 2 - Math.PI / 2;
      const x = ox + (cx + Math.cos(a) * rx - ox) * ease;
      const y = oy + (cy + Math.sin(a) * ry - oy) * ease + (still || EGG.paused ? 0 : Math.sin(now / 280 + i) * 3);
      b.style.transform = `translate(${x}px, ${y}px) scale(${0.2 + 0.8 * ease})`;
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function eggCard(k, ...kids) {
  const card = $('eggCard');
  card.replaceChildren(el('h3', { text: FRUITS[k].name }), el('img', { src: fruitURL(k), alt: '' }), ...kids);
  card.hidden = false;
  card.querySelector('button').focus({ preventScroll: true });
}

function eggAsk(k) {
  if (!$('eggCard').hidden) return;
  Sfx.play('select');
  EGG.paused = true;
  for (const b of document.querySelectorAll('.egg-fruit')) b.classList.toggle('on', b.dataset.k === k);
  eggCard(k,
    el('p', { text: 'Pick this fruit?' }),
    el('div', { class: 'btn-row' },
      el('button', { type: 'button', class: 'mini-btn red', text: 'Pick it', onclick: () => eggPick(k) }),
      el('button', { type: 'button', class: 'mini-btn', text: 'Keep looking', onclick: () => eggUnask(k) })));
}

function eggUnask(k) {
  Sfx.play('select');
  $('eggCard').hidden = true;
  EGG.paused = false;
  for (const b of document.querySelectorAll('.egg-fruit')) b.classList.remove('on');
  const b = document.querySelector(`.egg-fruit[data-k="${k}"]`);
  if (b) b.focus({ preventScroll: true });
}

function eggPick(k) {
  const f = FRUITS[k];
  eggFruit = k;
  Sfx.play('find');
  for (const b of document.querySelectorAll('.egg-fruit')) if (b.dataset.k !== k) b.classList.add('gone');
  eggCard(k,
    el('p', { text: `Secret set! The ${f.name} is hidden on Dawn Village. Look for a bush or trash can glowing in its colors!` }),
    el('div', { class: 'btn-row' }, el('button', { type: 'button', class: 'mini-btn red', text: 'OK', onclick: closeEgg })));
  if ($('eggWord')) raceTitle();
}

function closeEgg() {
  const layer = $('egg');
  if (!layer) return;
  layer.remove();
  EGG.paused = false;
  const word = $('eggWord');
  if (word) word.focus({ preventScroll: true });
}

async function enterGame(cont, secret) {
  G.mode = 'home';
  G.aboard = false;
  G.indoors = null;
  OW.respawn = true;
  resetHero();
  updateHud();
  const p = G.p;
  if (cont) {
    homeMenu();
    say(`Welcome back, Captain ${p.name}! Day ${p.day} at ${island().name}.${G.owedClothes ? ` The bosses you already beat left you ${G.owedClothes} piece${G.owedClothes > 1 ? 's' : ''} of clothing. Check Gear!` : ''}`);
    G.owedClothes = 0;
    return;
  }
  lock(true);
  homeMenu();
  await talk(`${p.name} is a nobody ${race().name.toLowerCase()} from Dawn Village. No weapon, no powers, no crew. Just a big dream.`);
  if (race().move) await talk(`As a ${race().name}, you already know one move: ${race().move.name}.`);
  await talk('Walk around with the D-pad (or arrow keys), or tap where you want to go. Press A to talk, search and go inside.');
  await talk('Search trash cans and shaking bushes for weapons and clothes. A faint glow means a Devil Fruit is hiding inside!');
  await talk('Enemies roam the edges of town. Walk up and press A to fight one, but watch out: some charge at you! Hold B to run away.');
  if (secret) await talk(`Psst... a little bird says the ${FRUITS[secret].name} is hidden somewhere on Dawn Village. Look for the glow!`);
  await talk('Hire a crew at the Bar, train at the dummies, and when you feel ready, RAID the island boss up north! (Psst: tap your pirate to chat.)');
  lock(false);
  if (G.mode !== 'home') return;
  homeMenu();
  say(island().intro);
}

function resetHero() {
  Object.assign(G.hero, { ox: 0, oy: 0, squash: 0, flash: 0, alpha: 1, form: null, swing: false });
  if (G.hero.x < 80 || G.hero.x > 140) G.hero.x = G.hero.tx = 110;
}

// ---------- home ----------

function homeMenu() {
  if (G.aboard) { boatMenu(); return; }
  G.mode = 'home';
  owLoad(G.indoors || 'island');
  setPad(worldDock());
}

// The menu bar under the controls while you walk around (islands and the deck).
function worldDock() {
  const late = isLate();
  return [
    { label: 'Gear', icon: iconURL('sword'), onClick: () => gearMenu() },
    { label: 'Bag', icon: iconURL('meat'), onClick: bagMenu },
    { label: 'Stats', icon: iconURL('poster', { C: '#f2e4c0' }), onClick: wantedMenu },
    { label: 'Sleep', icon: iconURL('moon'), onClick: sleep, cls: late ? 'pulse' : '' },
  ];
}

// D-pad and A/B buttons replace the action grid while you walk around.
function setPad(dock) {
  const box = $('actions');
  if (!box.querySelector('.pad')) {
    OW.held = null;
    box.replaceChildren(padControls());
  }
  box.className = 'actions padmode' + (G.busy ? ' locked' : '');
  const bar = $('dock');
  bar.hidden = false;
  bar.style.setProperty('--n', dock.length);
  bar.classList.toggle('locked', G.busy);
  bar.replaceChildren(...dock.map(a => actionButton(a, 'dock-btn')));
}

function needEnergy(n) {
  if (G.p.energy >= n) return true;
  Sfx.play('bad');
  bubble('SLEEPY..');
  say(`You need ${n} energy for that (you have ${Math.round(G.p.energy)}). Eat something, drink a cola, or sleep.`);
  return false;
}

function spend(energy, ticks, food) {
  const p = G.p;
  p.energy = clamp(p.energy - energy, 0, 100);
  p.tick = Math.min(TICKS_PER_DAY, p.tick + ticks);
  p.food = clamp(p.food - (food > 0 ? food * (p.race === 'mink' ? 1.25 : 1) * (1 - teamBonus('hunger')) : food), 0, 100);
  const dayShare = ticks * 8 / TICKS_PER_DAY;
  p.mood = clamp(p.mood - dayShare, 0, 100);
  if (p.food <= 0 && ticks > 0) {
    p.hp = Math.max(1, p.hp - Math.ceil(p.maxHp * 0.04 * dayShare));
    p.mood = clamp(p.mood - 4 * dayShare, 0, 100);
  }
}

function bubble(text, secs) {
  G.bubble = { text, until: G.t + (secs || 2.4) };
}

function talkToHero() {
  const [b, line] = pick(TALK_LINES);
  bubble(b);
  G.p.mood = clamp(G.p.mood + 1, 0, 100);
  tween(G.hero, { oy: -6 }, 120).then(() => tween(G.hero, { oy: 0 }, 160, easeIn));
  say(line);
}

// ---------- training ----------

function statLabel(k) {
  if (k === 'drill') return `${shortWeapon()} ${mastery(styleKey())}`;
  if (k === 'fruit') return `mastery ${mastery(G.p.fruit)}`;
  const v = G.p[k], cap = trainCap(k);
  return v >= cap ? `${k.toUpperCase()} ${v} max` : `${k.toUpperCase()} ${v}/${cap}`;
}

function trainMenu() {
  const p = G.p;
  setActions([
    ...Object.keys(TRAININGS).filter(k => k !== 'fruit' || p.fruit).map(k => ({ label: TRAININGS[k].name, sub: statLabel(k), onClick: () => startTraining(k) })),
    { label: 'Back', cls: 'ghost', onClick: homeMenu },
  ], 'cols3');
  const bonus = [p.owned.weights ? 'weights +1' : '', p.mood >= 75 ? 'pumped +1' : '', p.mood <= 25 ? 'gloomy -1' : ''].filter(Boolean).join(', ');
  say(`Each session costs 18 energy. Drills raise mastery to unlock moves.${bonus ? ' Bonus: ' + bonus + '.' : ''}`);
}

function startTraining(k) {
  const p = G.p;
  const isStat = STAT_KEYS.includes(k);
  if (isStat && p[k] >= trainCap(k)) {
    Sfx.play('bad');
    say(`Your ${TRAININGS[k].name} is maxed out for Lv ${p.lvl}. Fight and level up to raise the limit!`);
    return;
  }
  if (!needEnergy(18)) return;
  const level = isStat ? { atk: p.atk - 10, def: (p.def - 4) * 2, spd: (p.spd - 5) * 2, haki: p.haki * 2 }[k]
    : mastery(k === 'drill' ? styleKey() : p.fruit) * 0.6;
  const diff = clamp(level / 90, 0, 1);
  G.train = {
    k, rep: 0, reps: 3, results: [], cur: 0, dir: 1,
    speed: 0.8 + diff * 0.7, zoneW: 0.24 - diff * 0.09, zone: rand(0.25, 0.75),
    active: true, pose: 0, dust: 0, anim: TRAININGS[k].anim,
  };
  G.mode = 'train';
  G.hero.x = 96;
  setActions([{ label: 'Strike!', cls: 'big raid', onClick: trainStrike }], 'single');
  const what = k === 'drill' ? `${styleName(styleKey())} drills` : k === 'fruit' ? `${fruit().name} practice` : `${TRAININGS[k].name} training (${TRAININGS[k].desc})`;
  say(`${what}! Tap STRIKE (or press Space) when the marker is in the gold zone. Dead center is PERFECT.`);
}

function trainStrike() {
  const T = G.train;
  if (!T || !T.active) return;
  const d = Math.abs(T.cur - T.zone);
  const res = d <= T.zoneW * 0.18 ? 'perfect' : d <= T.zoneW / 2 ? 'good' : 'miss';
  T.results.push(res);
  T.rep++;
  T.pose = 1;
  if (res === 'perfect') {
    Sfx.play('perfect');
    floatText(96, 44, 'PERFECT!', '#7cff7a', 2);
    particles(96, 96, 16, { colors: ['#ffe14a', '#ffffff', '#7cff7a'], speed: 70, grav: 40 });
  } else if (res === 'good') {
    Sfx.play('good');
    floatText(96, 44, 'GOOD', '#ffe14a', 2);
  } else {
    Sfx.play('bad');
    floatText(96, 44, 'MISS', '#ff8a8a', 2);
  }
  if (T.rep >= T.reps) {
    T.active = false;
    setTimeout(finishTraining, 700);
  } else {
    T.zone = rand(0.2, 0.8);
    T.speed *= 1.15;
  }
}

async function finishTraining() {
  const T = G.train, p = G.p;
  const perfects = T.results.filter(r => r === 'perfect').length;
  const goods = T.results.filter(r => r === 'good').length;
  const misses = T.results.length - perfects - goods;
  if (!STAT_KEYS.includes(T.k)) return finishPractice(T, perfects, goods, misses);
  let gain = Math.round((perfects * 2 + goods) / 3);
  if (gain > 0) {
    if (p.owned.weights) gain++;
    if (p.mood >= 75) gain++;
    if (p.mood <= 25) gain = Math.max(1, gain - 1);
    if (p.food <= 0) gain = Math.max(1, Math.floor(gain / 2));
  }
  spend(18, 2, 12);
  const room = Math.max(0, trainCap(T.k) - p[T.k]);
  const capped = gain > room;
  gain = Math.min(gain, room);
  const hakiBefore = p.haki;
  let what = '';
  if (T.k === 'atk') { p.atk += gain; what = `ATK +${gain}`; }
  if (T.k === 'def') { p.def += gain; p.maxHp += gain * 4; p.hp += gain * 4; what = `DEF +${gain}, max HP +${gain * 4}`; }
  if (T.k === 'spd') { p.spd += gain; what = `SPD +${gain}`; }
  if (T.k === 'haki') { p.haki += gain; what = `HAKI +${gain}`; }
  p.mood = clamp(p.mood + perfects * 3 - misses * 2, 0, 100);
  p.trained++;
  const lv = gainXp(5 + gain * 2);
  G.train = null;
  G.mode = 'home';
  resetHero();
  lock(true);
  homeMenu();
  await talk(gain > 0
    ? `${TRAININGS[T.k].name} training done: ${what}! (${perfects} perfect, ${goods} good, ${misses} miss)${capped ? ' You hit your limit. Level up to push further!' : ''}`
    : 'You flailed around and pulled a muscle. No gains this time.');
  await announceLevels(lv);
  if (hakiBefore < HAKI.armament && p.haki >= HAKI.armament) { Sfx.play('haki'); await talk('You awakened ARMAMENT HAKI! New skill: coat your fists in invisible armor. It hits Logia users.'); }
  if (hakiBefore < HAKI.observation && p.haki >= HAKI.observation) { Sfx.play('haki'); await talk('You awakened OBSERVATION HAKI! You can sense attacks coming. Dodge chance up.'); }
  if (hakiBefore < HAKI.conqueror && p.haki >= HAKI.conqueror) { Sfx.play('haki'); await talk("CONQUEROR'S HAKI! The rarest power of all. Weak foes faint before you."); }
  save();
  lock(false);
  homeMenu();
}

async function finishPractice(T, perfects, goods, misses) {
  const p = G.p;
  const key = T.k === 'drill' ? styleKey() : p.fruit;
  let gain = 4 + perfects * 4 + goods * 2;
  if (p.owned.weights) gain += 2;
  if (p.mood >= 75) gain += 2;
  if (p.food <= 0) gain = Math.floor(gain / 2);
  spend(18, 2, 12);
  p.mood = clamp(p.mood + perfects * 3 - misses * 2, 0, 100);
  p.trained++;
  const before = mastery(key);
  const unlocked = gainMastery(key, gain);
  gain = mastery(key) - before;
  const lv = gainXp(4);
  G.train = null;
  G.mode = 'home';
  resetHero();
  lock(true);
  homeMenu();
  const next = styleMoves(key).find(m => m.at > mastery(key));
  await talk(`${styleName(key)} practice: +${gain} mastery (${mastery(key)} total). ${next ? `${next.name} unlocks at ${next.at}.` : 'Every move unlocked!'}`);
  await announceUnlocks(unlocked);
  await announceLevels(lv);
  save();
  lock(false);
  homeMenu();
}

// ---------- work: odd jobs and fishing ----------

async function oddJob() {
  if (!needEnergy(15)) return;
  lock(true);
  spend(15, 2, 10);
  const pay = 55 + G.p.island * 45 + randInt(0, 20);
  G.p.berries += pay;
  Sfx.play('coin');
  const hs = heroScreenPos();
  floatText(hs.x, hs.y - 6, '+' + pay, '#ffe14a', 1);
  await talk(`${island().job} You earned ฿${pay}.`);
  save();
  lock(false);
  homeMenu();
}

function startFishing() {
  if (!needEnergy(12)) return;
  spend(12, 2, 8);
  G.fish = { cast: 0, casts: 3, state: 'wait', timer: rand(1.2, 3.2), win: 0, total: 0, caught: 0, flying: null };
  G.mode = 'fish';
  setActions([{ label: 'Reel!', cls: 'big raid', onClick: reel }], 'single');
  say('Cast 1 of 3. When the bobber dips, tap REEL (or press Space)!');
}

function rollCatch() {
  const i = G.p.island, r = Math.random();
  if (r < 0.40) return { name: 'a Small Fish', berries: 15 + i * 12, fish: true, icon: 'fish' };
  if (r < 0.65) return { name: 'a Big Fish', berries: 45 + i * 35, fish: true, icon: 'fish' };
  if (r < 0.80) return { name: 'an Old Boot', berries: 0, icon: 'chest', pal: { n: '#5a4a3a', G: '#5a4a3a' } };
  if (r < 0.93) return { name: 'a Treasure Chest', berries: 180 + i * 140, icon: 'chest' };
  return { name: 'a GOLDEN FISH', berries: 350 + i * 220, fish: true, icon: 'fish', pal: { b: '#e6b422', w: '#fff3a0' } };
}

function reel() {
  const F = G.fish;
  if (!F || F.state === 'result') return;
  if (F.state === 'wait') { castResult(null, 'Too early! You yanked the line and scared the fish away.'); return; }
  const c = rollCatch();
  if (G.p.race === 'fishman') c.berries = Math.round(c.berries * 1.3);
  castResult(c, c.berries
    ? `You caught ${c.name}! +฿${c.berries}${c.fish ? ' and a Grilled Fish for your bag' : ''}.`
    : `You caught ${c.name}. Nobody wants this.`);
}

function castResult(c, text) {
  const F = G.fish;
  F.state = 'result';
  if (c) {
    G.p.berries += c.berries;
    F.total += c.berries;
    F.caught++;
    if (c.fish) G.p.bag.fish = (G.p.bag.fish || 0) + 1;
    Sfx.play(c.berries ? 'coin' : 'bad');
    F.flying = { spec: { kind: 'icon', icon: c.icon, pal: c.pal || {} }, t: 0 };
    particles(64, 92, 10, { colors: ['#ffffff', '#bfe6ff'], speed: 50, grav: 120, dir: -Math.PI / 2, spread: 1.4 });
  } else {
    Sfx.play('bad');
  }
  say(text);
  F.cast++;
  setTimeout(() => {
    if (G.fish !== F) return;
    if (F.cast >= F.casts) { finishFishing(); return; }
    F.state = 'wait';
    F.timer = rand(1.2, 3.6);
    F.flying = null;
    say(`Cast ${F.cast + 1} of 3. Wait for it...`);
  }, 1500);
}

async function finishFishing() {
  const F = G.fish;
  G.p.mood = clamp(G.p.mood + 6, 0, 100);
  G.fish = null;
  G.mode = 'home';
  resetHero();
  lock(true);
  homeMenu();
  await talk(`Fishing trip over: ${F.caught} catch${F.caught === 1 ? '' : 'es'}, ฿${F.total} earned. Relaxing!`);
  save();
  lock(false);
  homeMenu();
}

// ---------- bag, shop, crew ----------

function itemRow(k, right, extra) {
  const it = ITEMS[k];
  return el('div', { class: 'row' },
    el('img', { src: iconURL(it.icon, it.pal), alt: '' }),
    el('div', null, el('h3', { text: it.name }), el('p', { text: it.desc }), extra || null),
    right);
}

function bagMenu(note) {
  const p = G.p;
  const owned = BAG_ORDER.filter(k => p.bag[k] > 0);
  const body = el('div', { class: 'panel-body-inner' });
  body.style.display = 'contents';
  if (note) body.append(el('p', { class: 'note', text: note }));
  if (!owned.length) body.append(el('p', { text: 'Your bag is empty. Buy food at the Shop or go fishing.' }));
  for (const k of owned) {
    const it = ITEMS[k];
    const btn = el('button', { type: 'button', class: 'mini-btn', text: it.battleOnly ? 'Battle' : 'Use', disabled: it.battleOnly || null, onclick: () => useItem(k) });
    body.append(itemRow(k, el('div', { class: 'btn-row' }, el('span', { class: 'count', text: 'x' + p.bag[k] }), btn)));
  }
  body.append(el('p', { class: 'note', text: `Food ${Math.round(p.food)}/100 - Energy ${Math.round(p.energy)}/100 - HP ${p.hp}/${p.maxHp}${foodBoost() > 1 ? ` - food bonus +${Math.round((foodBoost() - 1) * 100)}%` : ''}` }));
  openModal('Bag', body, { onClose: () => G.mode === 'home' && homeMenu() });
}

function useItem(k) {
  const p = G.p, it = ITEMS[k];
  if (!p.bag[k] || it.battleOnly) return;
  p.bag[k]--;
  const boost = it.food ? foodBoost() : 1;
  const parts = [];
  if (it.food) { const v = Math.round(it.food * boost); p.food = clamp(p.food + v, 0, 100); parts.push(`+${v} food`); }
  if (it.energy) { const v = Math.round(it.energy * boost); p.energy = clamp(p.energy + v, 0, 100); parts.push(`+${v} energy`); }
  if (it.mood) p.mood = clamp(p.mood + it.mood, 0, 100);
  if (k === 'medicine') { const v = Math.round(p.maxHp * it.heal); p.hp = Math.min(p.maxHp, p.hp + v); parts.push(`+${v} HP`); }
  else if (it.food) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.1 * boost));
  Sfx.play(it.food ? 'eat' : 'heal');
  bubble(it.food ? 'YUM!' : 'AH!');
  particles(G.hero.x, 96, 10, { colors: ['#ff8ab0', '#ffe14a'], speed: 40, grav: -30, life: 0.7 });
  save();
  bagMenu(`${it.food ? 'Munch munch!' : 'Ahh.'} ${it.name}: ${parts.join(', ')}.`);
}

function shopMenu(note) {
  const p = G.p;
  const body = el('div');
  body.style.display = 'contents';
  body.append(el('p', { class: 'note', text: note || `${island().name} market and shipwright. You have ฿${fmt(p.berries)}.` }));
  for (const k of island().shop) {
    const it = ITEMS[k];
    const owned = it.once ? !!p.owned[k] : false;
    const btn = el('button', {
      type: 'button', class: 'mini-btn', text: owned ? 'Owned' : '฿' + it.price,
      disabled: owned || p.berries < it.price || null,
      onclick: () => buy(k),
    });
    const count = it.once ? null : el('span', { class: 'count', text: 'x' + (p.bag[k] || 0) });
    body.append(itemRow(k, el('div', { class: 'btn-row' }, count, btn)));
  }
  const clothes = Object.keys(CLOTHES).filter(k => CLOTHES[k].shop === G.p.island);
  if (clothes.length) body.append(el('h3', { class: 'sect', text: 'Clothes' }));
  for (const k of clothes) {
    const c = CLOTHES[k], owned = p.clothes.includes(k), on = p.wear[c.slot] === k;
    body.append(el('div', { class: 'row' },
      el('img', { src: spriteURL(clothIcon(k), 3), alt: '' }),
      el('div', null, el('h3', null, c.name, el('small', { text: ' ' + SLOT_NAMES[c.slot] })), el('p', { text: clothStats(c) })),
      owned
        ? (on ? el('span', { class: 'count', text: 'Wearing' }) : el('button', { type: 'button', class: 'mini-btn red', text: 'Wear', 'aria-label': `Wear ${c.name}`, onclick: () => { putOn(k); Sfx.play('select'); save(); shopMenu(`You put on the ${c.name}.`); } }))
        : el('button', { type: 'button', class: 'mini-btn', text: '฿' + fmt(c.price), 'aria-label': `Buy ${c.name} for ฿${fmt(c.price)}`, disabled: p.berries < c.price || null, onclick: () => buyClothes(k) })));
  }
  openModal('Shop', body, { onClose: () => G.mode === 'home' && homeMenu() });
}

function buyClothes(k) {
  const p = G.p, c = CLOTHES[k];
  if (p.berries < c.price || p.clothes.includes(k)) return;
  p.berries -= c.price;
  p.clothes.push(k);
  Sfx.play('coin');
  save();
  shopMenu(`Bought the ${c.name}! Tap Wear to put it on. You have ฿${fmt(p.berries)} left.`);
}

function buy(k) {
  const p = G.p, it = ITEMS[k];
  if (p.berries < it.price) return;
  p.berries -= it.price;
  if (it.once) p.owned[k] = true;
  else p.bag[k] = (p.bag[k] || 0) + 1;
  // New paint and figureheads go straight onto the ship.
  if (it.ship === 'paint') p.ship.paint = k.slice(6);
  if (it.ship === 'head') p.ship.head = k.slice(3);
  Sfx.play('coin');
  save();
  shopMenu(`Bought ${it.name}!${it.ship ? ' Board your ship to see it.' : ''} You have ฿${fmt(p.berries)} left.`);
}

// ---------- bar & crew ----------

const crewAtk = m => Math.round(3 + G.p.lvl * ROLES[CREW[m.key].role].atk + (m.weapon ? WEAPONS[m.weapon].atk : 0) + crewWearPower(m));
const crewHeal = m => Math.round(4 + G.p.lvl * ROLES[CREW[m.key].role].heal + ((m.weapon ? WEAPONS[m.weapon].atk : 0) + crewWearPower(m)) * 0.8);
const NO_WEAR = { hat: null, coat: null, charm: null };
// A crewmate's sprite in the clothes you gave them; one who ate the Dragon-Dragon Fruit is half dragon from then on.
const CREW_SPECS = new Map();
function crewSpec(m, wear) {
  const w = wear || m.wear || NO_WEAR;
  const key = [m.key, m.fruit === 'dragon'].concat(SLOTS.map(sl => w[sl] || '')).join('|');
  if (!CREW_SPECS.has(key)) {
    let spec = dressCrew(CREW[m.key].spr, w);
    if (m.fruit === 'dragon') {
      spec = Object.assign({}, spec, {
        marks: (spec.marks || []).concat(spec.kind === 'brute' ? 'dragonBrute' : 'dragonCrew', 'dragonHorns'),
        pal: Object.assign({}, spec.pal, spec.head === 'tophat' ? {} : { a: '#f2e6c8' }),
      });
    }
    CREW_SPECS.set(key, spec);
  }
  return CREW_SPECS.get(key);
}
const crewRole = k => `${CREW[k].race} ${ROLES[CREW[k].role].name}`;

function crewKit(m) {
  const r = ROLES[CREW[m.key].role];
  const gear = [m.weapon ? WEAPONS[m.weapon].name : 'Bare hands'].concat(m.fruit ? FRUITS[m.fruit].name : [], crewWorn(m).map(c => c.name)).join(' + ');
  return `${gear}. Power ${crewAtk(m)}${r.heal ? `, heals ${crewHeal(m)}` : ''}.`;
}

function barMenu(note) {
  const p = G.p;
  const body = el('div');
  body.style.display = 'contents';
  body.append(el('p', { class: 'note', text: note || 'The bartender wipes a mug. "What\'ll it be, Captain?"' }));
  body.append(el('h3', { class: 'sect' }, 'Your crew ', el('span', { text: `${p.crew.length}/${CREW_MAX}` })));
  if (!p.crew.length) body.append(el('p', { class: 'note', text: 'Sailing solo. Crewmates fight beside you, and you choose their weapon, Devil Fruit and clothes.' }));
  for (const m of p.crew) {
    const c = CREW[m.key];
    body.append(el('div', { class: 'row' },
      el('img', { src: spriteURL(crewSpec(m), 2), alt: '' }),
      el('div', null, el('h3', null, c.name, el('small', { text: ' ' + crewRole(m.key) })), el('p', { text: crewKit(m) })),
      el('button', { type: 'button', class: 'mini-btn', text: 'Manage', onclick: () => manageCrew(m.key) })));
  }
  const here = Object.keys(CREW).filter(k => CREW[k].island === p.island && !crewOf(k)).map(k => CREW[k].name);
  body.append(el('p', { class: 'note', text: here.length ? `Looking for crewmates? ${here.join(' and ')} ${here.length > 1 ? 'are' : 'is'} sitting at the tables. Go talk to them.` : 'Nobody here is looking for a crew right now. Try the bar on another island.' }));
  if (p.crew.length) {
    const cost = 30 * (p.crew.length + 1);
    body.append(el('p', { class: 'note', text: 'Crewmates jump into normal fights sometimes. In raids, everyone fights every turn.' }));
    body.append(el('button', {
      type: 'button', class: 'mini-btn red',
      text: `Throw a feast (฿${cost})`,
      disabled: p.berries < cost || isLate() || null,
      onclick: () => feast(cost),
    }));
  }
  openModal(`${island().bar}: Bartender`, body, { onClose: () => G.mode === 'home' && homeMenu() });
}

function manageCrew(k, confirmKick, note) {
  const p = G.p, m = crewOf(k);
  if (!m) return barMenu();
  const c = CREW[k], r = ROLES[c.role];
  const body = el('div');
  body.style.display = 'contents';
  if (note) body.append(el('p', { class: 'note', text: note }));
  body.append(el('div', { class: 'row current' },
    el('img', { src: spriteURL(crewSpec(m), 3), alt: '' }),
    el('div', null, el('h3', null, c.name, el('small', { text: ' ' + crewRole(k) })), el('p', { text: r.desc }), el('p', { text: crewKit(m) })),
    null));

  body.append(el('h3', { class: 'sect' }, 'Weapon'));
  for (const key of [null].concat(p.weapons)) {
    const w = key && WEAPONS[key];
    const holder = key && (p.weapon === key ? 'you' : holderOf(key) && holderOf(key) !== m ? CREW[holderOf(key).key].name : null);
    const on = m.weapon === key;
    body.append(el('div', { class: 'row gear' + (on ? ' current' : '') },
      el('img', { src: weaponURL(key || 'fists'), alt: '' }),
      el('div', null, el('h3', null, w ? w.name : 'Bare Hands', el('small', { text: w ? ` +${w.atk} power${holder ? ` - held by ${holder}` : ''}` : '' }))),
      on ? el('span', { class: 'count', text: 'Holding' })
        : el('button', { type: 'button', class: 'mini-btn', text: key ? 'Give' : 'Take back', onclick: () => giveWeapon(k, key) })));
  }

  body.append(el('h3', { class: 'sect' }, 'Devil Fruit'));
  if (m.fruit) {
    const f = FRUITS[m.fruit];
    body.append(el('div', { class: 'row gear current' },
      el('img', { src: fruitURL(m.fruit), alt: '' }),
      el('div', null, el('h3', { text: f.name }), el('p', { text: `Uses ${f.moves.map(v => v.name).join(', ')} in fights.` })),
      null));
  } else if (!p.fruitBag.length) {
    body.append(el('p', { class: 'note', text: 'No spare Devil Fruits. When you find one, keep it in your bag and you can feed it to a crewmate here.' }));
  } else {
    for (const fk of p.fruitBag) {
      const f = FRUITS[fk];
      body.append(el('div', { class: 'row gear' },
        el('img', { src: fruitURL(fk), alt: '' }),
        el('div', null, el('h3', null, f.name, el('small', { text: ' in bag' })), el('p', { text: f.desc })),
        el('button', { type: 'button', class: 'mini-btn red', text: 'Feed', 'aria-label': `Feed ${f.name} to ${c.name}`, onclick: () => feedFruit(k, fk) })));
    }
    body.append(el('p', { class: 'note', text: 'A fruit can never be taken back: it is theirs for life.' }));
  }

  body.append(el('h3', { class: 'sect' }, 'Clothes'));
  if (!p.clothes.length) body.append(el('p', { class: 'note', text: 'No clothes to hand out yet. Raid bosses drop them, shops sell them, and some hide in trash cans and bushes.' }));
  for (const slot of SLOTS) {
    for (const ck of p.clothes.filter(x => CLOTHES[x].slot === slot).sort((a, b) => (m.wear[slot] === b) - (m.wear[slot] === a))) {
      const cl = CLOTHES[ck], holder = clothHolder(ck), on = holder === m;
      const who = holder === 'you' ? 'you' : holder && !on ? CREW[holder.key].name : null;
      body.append(el('div', { class: 'row gear' + (on ? ' current' : '') },
        el('img', { src: spriteURL(crewSpec(m, Object.assign({}, m.wear, { [slot]: ck })), 2), alt: '' }),
        el('div', null, el('h3', null, cl.name, el('small', { text: ` ${SLOT_NAMES[slot]}${who ? ` - worn by ${who}` : ''}` })), el('p', { text: crewClothStats(cl) })),
        el('button', { type: 'button', class: 'mini-btn' + (on ? '' : ' red'), text: on ? 'Take back' : 'Give', 'aria-label': `${on ? 'Take back' : 'Give'} ${cl.name} ${on ? 'from' : 'to'} ${c.name}`, onclick: () => giveClothes(k, ck, on) })));
    }
  }

  if (confirmKick) {
    body.append(el('p', { text: `Kick ${c.name} out of the crew?${m.weapon || crewWorn(m).length ? ` You get the ${(m.weapon ? [WEAPONS[m.weapon].name] : []).concat(crewWorn(m).map(x => x.name)).join(', ')} back.` : ''}${m.fruit ? ` ${c.name} leaves with the ${FRUITS[m.fruit].name} powers.` : ''}` }));
    body.append(el('div', { class: 'btn-row' },
      el('button', { type: 'button', class: 'mini-btn red', text: 'Kick out', onclick: () => kickOut(k) }),
      el('button', { type: 'button', class: 'mini-btn', text: 'Keep them', onclick: () => manageCrew(k) })));
  } else {
    body.append(el('div', { class: 'btn-row' },
      el('button', { type: 'button', class: 'mini-btn', text: 'Back to bar', onclick: () => barMenu() }),
      el('button', { type: 'button', class: 'mini-btn red', text: 'Kick out...', onclick: () => manageCrew(k, true) })));
  }
  openModal(c.name, body, { onClose: () => G.mode === 'home' && homeMenu() });
}

async function hire(k) {
  const p = G.p, c = CREW[k];
  if (p.berries < c.cost || p.crew.length >= CREW_MAX || crewOf(k)) return;
  p.berries -= c.cost;
  p.crew.push({ key: k, weapon: null, fruit: null, wear: { hat: null, coat: null, charm: null } });
  OW.npcs = OW.npcs.filter(n => !(n.kind === 'recruit' && n.key === k));
  OW.trail.push(owTile());
  save();
  closeModal();
  lock(true);
  Sfx.play('level');
  const hs = heroScreenPos();
  particles(hs.x, hs.y, 18, { colors: ['#ffe14a', '#ffffff', '#ff8ab0'], speed: 60, grav: 60, life: 0.8 });
  await talk(c.join);
  await talk(`${c.name} the ${ROLES[c.role].name} joined your crew! Visit any Bar to give ${c.name} a weapon or a Devil Fruit.`);
  lock(false);
  homeMenu();
}

function giveWeapon(k, key) {
  const p = G.p, m = crewOf(k), name = CREW[k].name;
  let note;
  if (!key) {
    note = `You took the ${WEAPONS[m.weapon].name} back. ${name} fights bare-handed now.`;
  } else {
    const w = WEAPONS[key];
    const from = p.weapon === key ? 'you' : holderOf(key);
    if (from === 'you') p.weapon = null;
    else if (from) from.weapon = null;
    note = `${name} now wields the ${w.name}.` + (from === 'you' ? ' You switch to bare fists.' : from ? ` ${CREW[from.key].name} hands it over.` : '');
  }
  m.weapon = key;
  Sfx.play('find');
  save();
  manageCrew(k, false, note);
}

function feedFruit(k, fk) {
  const p = G.p, m = crewOf(k), c = CREW[k];
  if (m.fruit || !p.fruitBag.includes(fk)) return;
  p.fruitBag = p.fruitBag.filter(x => x !== fk);
  m.fruit = fk;
  Sfx.play('eat');
  screenFlash(FRUITS[fk].color, 0.4);
  save();
  const extra = fk === 'dragon' ? ` Horns burst out, scales spread and a tail swishes: ${c.name} is half dragon now!` : '';
  manageCrew(k, false, `${c.name} eats the ${FRUITS[fk].name}. "Blegh! Tastes AWFUL!" ${c.name} can't swim anymore, but now fights with its powers.${extra}`);
}

function kickOut(k) {
  const p = G.p, m = crewOf(k), c = CREW[k];
  p.crew = p.crew.filter(x => x !== m);
  Sfx.play('bad');
  save();
  refreshRoom();
  const back = (m.weapon ? [WEAPONS[m.weapon].name] : []).concat(crewWorn(m).map(x => x.name));
  barMenu(`${c.name} packs a bag and leaves the crew.${back.length ? ` You got the ${back.join(', ')} back.` : ''}`);
}

// Hand a piece of clothing to a crewmate (from you, another crewmate, or the wardrobe), or take it back.
function giveClothes(crewKey, k, back) {
  const p = G.p, m = crewOf(crewKey), c = CLOTHES[k], name = CREW[crewKey].name;
  let note;
  if (back) {
    m.wear[c.slot] = null;
    note = `You took the ${c.name} back.`;
  } else {
    const from = clothHolder(k);
    if (from === 'you') takeOff(c.slot);
    else if (from) from.wear[c.slot] = null;
    m.wear[c.slot] = k;
    note = `${name} puts on the ${c.name}.` + (from === 'you' ? ' You take it off and hand it over.' : from ? ` ${CREW[from.key].name} hands it over.` : '');
  }
  Sfx.play('select');
  save();
  manageCrew(crewKey, false, note);
}

const FEAST_LINES = {
  swordsman: n => `${n} drinks a whole barrel and falls asleep standing up.`,
  sniper: n => `${n} tells a story about defeating a giant goldfish. Nobody believes it.`,
  brawler: n => `${n} arm-wrestles the whole crew and wins. Twice.`,
  cook: n => `${n} cooks a twelve-course meal. You eat eleven courses.`,
  navigator: n => `${n} charges everyone a cover fee.`,
  doctor: n => `${n} does a chopstick dance. Everyone cries laughing.`,
};

async function feast(cost) {
  const p = G.p;
  closeModal();
  lock(true);
  p.berries -= cost;
  spend(5, 2, -40);
  p.mood = clamp(p.mood + 35, 0, 100);
  Sfx.play('win');
  for (let i = 0; i < 4; i++) particles(rand(30, 170), rand(70, 100), 14, { colors: ['#ff8ab0', '#ffe14a', '#7cd0ff', '#7cff7a'], speed: 60, grav: 60, life: 1 });
  bubble('PARTY!', 3);
  const c = CREW[pick(p.crew).key];
  await talk('FEAST! Meat, music and dancing on the deck!');
  await talk(FEAST_LINES[c.role](c.name));
  await talk('Mood +35, food +40. Best crew on the seas.');
  save();
  lock(false);
  homeMenu();
}

// ---------- map & sailing ----------

// Chart positions: the East Blue along the bottom, up Reverse Mountain on the right, Paradise across the middle,
// down under the Red Line to Fish-Man Island on the left, then the New World along the top.
function chartPoint(i) {
  if (!inGrandLine(i)) return [14 + i * 24, i % 2 ? 86 : 92];
  if (i < FISHMAN) { const j = i - GL_START; return [158 - j * 17.5, j % 2 ? 50 : 56]; }
  if (i === FISHMAN) return [9, 33];
  const j = i - FISHMAN - 1;
  return [36 + j * 40, j % 2 ? 13 : 19];
}
const MOUNTAIN_PT = [177, 72];

function drawRouteMap() {
  const cv = makeCanvas(192, 108);
  cv.className = 'routemap';
  const c = cv.getContext('2d');
  pxRect(c, 0, 0, 192, 108, '#1f76c4');
  pxRect(c, 0, 0, 192, 32, '#16609e');
  pxRect(c, 0, 36, 192, 32, '#2a82cc');
  for (let i = 0; i < 50; i++) pxRect(c, (i * 37) % 192, (i * 17) % 108, 4, 1, '#4aa3e8');
  // the Red Line: Reverse Mountain on the right, Fish-Man Island beneath it on the left
  const redLine = (x, y0, y1) => { pxRect(c, x, y0, 14, y1 - y0, '#b0443a'); pxRect(c, x, y0, 2, y1 - y0, '#8a2a24'); for (let y = y0 + 4; y < y1; y += 7) pxRect(c, x + 3 + (y % 3), y, 6, 1, '#9a3a32'); };
  redLine(170, 34, 108);
  redLine(2, 0, 66);
  pxRect(c, MOUNTAIN_PT[0] - 2, MOUNTAIN_PT[1] - 10, 4, 20, '#4aa3e8');
  for (let i = 0; i < 6; i++) pxRect(c, MOUNTAIN_PT[0] - 1, MOUNTAIN_PT[1] - 9 + ((i * 4 + Math.floor(G.t * 8)) % 20), 2, 1, '#ffffff');
  drawText(c, 'EAST BLUE', 96, 101, { color: '#bfe6ff', shadow: null, align: 'center' });
  drawText(c, 'PARADISE', 96, 37, { color: '#ffe9a8', shadow: null, align: 'center' });
  drawText(c, 'NEW WORLD', 120, 1, { color: '#ffb0a0', shadow: null, align: 'center' });
  const pts = ISLANDS.map((_, i) => chartPoint(i));
  const route = pts.slice(0, GL_START).concat([MOUNTAIN_PT], pts.slice(GL_START));
  for (let i = 0; i < route.length - 1; i++) {
    const [x0, y0] = route[i], [x1, y1] = route[i + 1];
    for (let k = 0; k < 1; k += 0.1) pxRect(c, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 2, 1, '#f2e4c0');
  }
  pts.forEach(([x, y], i) => {
    const open = i < G.p.unlocked;
    const col = ISLAND_COLS[ISLANDS[i].scene] || '#e9c27b';
    pxCircle(c, x, y, 6, PAL.k);
    pxCircle(c, x, y, 5, open ? col : '#3a4a6a');
    if (i === FISHMAN) pxRing(c, x, y, 7, '#bfe6ff');
    if (G.p.bosses[ISLANDS[i].boss]) { pxLine(c, x - 3, y - 3, x + 3, y + 3, '#d8432f', 2); pxLine(c, x + 3, y - 3, x - 3, y + 3, '#d8432f', 2); }
    if (i === G.p.island) { pxRect(c, x - 1, y - 14, 3, 6, PAL.k); pxRect(c, x, y - 13, 1, 4, '#ffe14a'); drawText(c, 'YOU', x + (i === FISHMAN ? 6 : 0), y + 8, { color: '#ffe14a', align: 'center' }); }
  });
  return cv;
}
const ISLAND_COLS = {
  village: '#5aa846', marine: '#a9afb9', town: '#f08a3a', syrup: '#b98a4a', baratie: '#e8e0c8', reef: '#ff7a9a', logue: '#8a8478',
  drum: '#eef3fa', desert: '#e9c27b', sky: '#ffffff', water7: '#5ab8e8', enies: '#f2eee4', thriller: '#5a4a6a', sabaody: '#c8e07a',
  impel: '#c0453a', marineford: '#2f5fb3', fishman: '#ff9ab8', punkhazard: '#c94a2a', dressrosa: '#ffd04a', wholecake: '#ffb0c8', volcano: '#5a4a50',
};

function mapMenu() {
  const p = G.p;
  const body = el('div');
  body.style.display = 'contents';
  body.append(drawRouteMap());
  body.append(el('p', { class: 'note', text: `Sailing takes ${p.owned.sails ? 'a quarter' : 'half'} of a day (10 energy, 15 food). Watch out for Sea Kings.` }));
  const smokerBeaten = !!p.bosses.smoker;
  ISLANDS.forEach((isl, i) => {
    if (i === GL_START) {
      const there = inGrandLine(p.island);
      body.append(el('div', { class: 'row' + (smokerBeaten ? '' : ' dim') },
        el('img', { src: iconURL('map', { C: smokerBeaten ? '#b0443a' : '#8a8a8a', b: '#4aa3e8', r: '#ffffff' }), alt: '' }),
        el('div', null, el('h3', { text: 'Reverse Mountain' }),
          el('p', { text: smokerBeaten ? 'The current flows UP the Red Line and drops you into the Grand Line.' : 'The gateway to the Grand Line. Beat Captain Smoker in Logue Town to cross.' })),
        smokerBeaten && !there
          ? el('button', { type: 'button', class: 'mini-btn red', text: 'Cross', disabled: isLate() || null, onclick: () => sailTo(GL_START) })
          : el('span', { class: 'count', text: smokerBeaten ? 'Crossed' : 'Locked' })));
    }
    const open = i < p.unlocked;
    const here = i === p.island;
    const boss = BOSSES[isl.boss];
    const lc = lootCount(i);
    const status = (p.bosses[isl.boss] ? `${boss.name} defeated` : `Raid boss: ${boss.name} (Lv ${boss.lvl})`) + `. Secrets found: ${lc.found}/${lc.total}.`;
    let right;
    const needsCoat = i === FISHMAN && !p.owned.coating;
    if (here) right = el('span', { class: 'count', text: 'Here' });
    else if (open && needsCoat) right = el('span', { class: 'count', text: 'Coat ship' });
    else if (open) right = el('button', { type: 'button', class: 'mini-btn', text: i === FISHMAN ? 'Dive' : 'Sail', disabled: isLate() || null, onclick: () => sailTo(i) });
    else right = el('span', { class: 'count', text: 'Locked' });
    body.append(el('div', { class: 'row' + (here ? ' current' : '') },
      el('img', { src: iconURL('chest', open ? {} : { n: '#8a8a8a', G: '#bdbdbd' }), alt: '' }),
      el('div', null, el('h3', { text: `${i + 1}. ${open ? isl.name : '???'}` }),
        el('p', { text: open && needsCoat ? `10,000 m under the sea. Your ship needs a Bubble Coating from ${ISLANDS[FISHMAN - 3].name} to dive.` : open ? status : i === GL_START ? 'Cross Reverse Mountain to reach the Grand Line.' : `Beat ${BOSSES[ISLANDS[i - 1].boss].name} to unlock.` })),
      right));
  });
  openModal('Sea Chart', body, { onClose: backToMenu });
}

async function sailTo(idx) {
  if (!needEnergy(10)) { closeModal(); return; }
  closeModal();
  const p = G.p;
  if (idx === FISHMAN && !p.owned.coating) { Sfx.play('bad'); say('Your ship needs a Bubble Coating to dive to Fish-Man Island.'); return; }
  const dive = idx === FISHMAN, surface = p.island === FISHMAN;
  const climb = !inGrandLine(p.island) && inGrandLine(idx);
  const descend = inGrandLine(p.island) && !inGrandLine(idx);
  spend(10, p.owned.sails ? 2 : 4, 15);
  lock(true);
  G.mode = 'sail';
  G.sail = { x: -60, dest: idx };
  say(`Setting sail for ${ISLANDS[idx].name}!`);
  await tween(G.sail, { x: 60 }, 1600, linear);
  if (climb) {
    await crossReverseMountain();
    await arrive(idx);
    lock(false);
    homeMenu();
    return;
  }
  if (dive) {
    await diveToFishman();
    await arrive(idx);
    lock(false);
    homeMenu();
    return;
  }
  if (surface) await talk(idx > FISHMAN ? 'Your bubble floats up and up... and pops out into the New World!' : 'Your bubble floats back up into Paradise.');
  if (descend) await talk('You ride the gentle current back over the Red Line into the East Blue.');
  const r = Math.random();
  if (r < (p.owned.nest ? 0.11 : 0.22) && p.owned.burst) {
    shake(4, 600);
    Sfx.play('boom');
    await talk('A Sea King rises out of the waves... COUP DE BURST! Your ship blasts into the sky and lands far away.');
  } else if (r < (p.owned.nest ? 0.11 : 0.22)) {
    shake(4, 800);
    Sfx.play('boss');
    await talk('The sea starts to churn and bubble...');
    const lvl = ENEMIES[ISLANDS[idx].enemies[0]].lvl + 1;
    startBattle({
      def: BOSSES.seaking, key: 'seaking', lvl, boss: true, scene: 'deck',
      after: async res => {
        if (res === 'win') await arrive(idx);
        else await talk(`Your crew turned the ship around. You are back at ${island().name}.`);
      },
    });
    return;
  }
  if (r < 0.42) {
    const b = 60 + idx * 50 + randInt(0, 40);
    p.berries += b;
    p.bag.meat = (p.bag.meat || 0) + 1;
    Sfx.play('coin');
    await talk(`You fished a floating barrel out of the sea: ฿${b} and a Meat on the Bone!`);
  } else if (r < 0.57) {
    if (p.owned.sails) await talk('A storm rolls in, but your Storm Sails slice right through it!');
    else if (crewWith('navigator')) await talk(`${CREW[crewWith('navigator').key].name}: "Storm ahead! Hard to port!" Your navigator steers you safely around it.`);
    else { p.energy = clamp(p.energy - 15, 0, 100); shake(3, 600); await talk('A storm batters the ship! You bail water all night. -15 energy.'); }
  } else if (r < 0.67 && p.fruit) {
    p.mood = clamp(p.mood - 5, 0, 100);
    const swimmer = p.crew.find(m => !m.fruit);
    await talk(`A wave knocks you overboard! Devil Fruit users sink like rocks... ${swimmer ? CREW[swimmer.key].name + ' dives in and drags you out.' : 'You grab a floating barrel just in time.'}`);
  } else {
    await talk(pick(['Smooth sailing. A seagull steals your lunch for a second.', 'Calm seas. You nap on the figurehead.', 'A school of flying fish races the ship!']));
  }
  await tween(G.sail, { x: 230 }, 1300, linear);
  await arrive(idx);
  lock(false);
  homeMenu();
}

async function crossReverseMountain() {
  const p = G.p;
  G.mode = 'mountain';
  G.cut = { k: 0 };
  Sfx.play('boss');
  const run = tween(G.cut, { k: 1 }, 9000, linear);
  await talk('The Red Line! A wall of rock that circles the whole world.');
  await talk('The current flows UP the mountain! Hold on tight!');
  shake(3, 1500);
  await talk(`${p.crew.length ? 'Your crew screams' : 'You scream'} as the ship rockets up Reverse Mountain!`);
  await run;
  Sfx.play('win');
  screenFlash('#ffffff', 0.8);
  shake(6, 600);
  await talk('Over the top and down the waterfall! SPLASH! Welcome to the Grand Line!');
  G.cut = null;
}

async function diveToFishman() {
  G.mode = 'dive';
  G.cut = { k: 0 };
  Sfx.play('splash');
  const run = tween(G.cut, { k: 1 }, 9500, linear);
  await talk('The coating wraps your ship in a giant bubble. Down you go!');
  await talk('Deeper and deeper. The sunlight fades away...');
  await talk('A Sea King swims right past the bubble. Nobody breathes.');
  await run;
  Sfx.play('win');
  await talk('There it is, glowing at the bottom of the sea: Fish-Man Island!');
  G.cut = null;
}

async function arrive(idx) {
  const p = G.p;
  p.island = idx;
  G.aboard = false;
  G.indoors = null;
  G.mode = 'home';
  G.sail = null;
  G.hero.x = G.hero.tx = 110;
  resetHero();
  save();
  homeMenu();
  Sfx.play('coin');
  await talk(`Land ho! Welcome to ${ISLANDS[idx].name}.`);
  await talk(ISLANDS[idx].intro);
}

// ---------- Devil Fruit awakening ----------

const TRIAL_FX = { rubber: 'flurry', flame: 'fire', frost: 'water', quake: 'rokuogan', smoke: 'smoke', light: 'lightrain', dough: 'mochi', dragon: 'bolt', split: 'bomb', magma: 'magma', string: 'strings', paw: 'beam', phoenix: 'fire', ope: 'beam', dark: 'shadows', rumble: 'bolt', sand: 'smoke', flower: 'strings' };

function awakenChecks() {
  const p = G.p;
  return [
    [`Fruit mastery ${mastery(p.fruit)}/${AWAKEN_REQ.mastery}`, mastery(p.fruit) >= AWAKEN_REQ.mastery],
    [`Level ${p.lvl}/${AWAKEN_REQ.lvl}`, p.lvl >= AWAKEN_REQ.lvl],
    [`Conqueror's Haki (Haki ${p.haki}/${HAKI.conqueror})`, p.haki >= HAKI.conqueror],
    [`Survive the war: defeat ${BOSSES[AWAKEN_REQ.boss].name}`, !!p.bosses[AWAKEN_REQ.boss]],
  ];
}

// The awakening panel shown under your Devil Fruit in the Gear menu.
function awakenPanel() {
  const p = G.p, f = fruit(), aw = f.awaken;
  if (p.awakened[p.fruit]) {
    return el('p', { class: 'note', text: `AWAKENED: ${aw.name}. In battle, use "Awaken: ${aw.name}" for 3 turns of power and the ultimate moves ${aw.moves.map(m => m.name).join(' and ')}.` });
  }
  const checks = awakenChecks(), ready = checks.every(c => c[1]);
  return el('div', { class: 'awaken' },
    el('h3', { class: 'sect' }, 'Awakening ', el('span', { text: aw.name })),
    el('p', { class: 'note', text: `A Devil Fruit can awaken when its user is strong enough. Then you must beat the fruit's own Will in a solo trial. Unlocks ${aw.moves.map(m => m.name).join(' and ')}.` }),
    el('ul', { class: 'checks' }, checks.map(([t, ok]) => el('li', { class: ok ? 'ok' : '', text: (ok ? '[x] ' : '[ ] ') + t }))),
    el('button', { type: 'button', class: 'mini-btn red', text: 'Begin the Awakening Trial (40 EN)', disabled: !ready || isLate() || null, onclick: startAwakeningTrial }));
}

function startAwakeningTrial() {
  const p = G.p, f = fruit(), aw = f.awaken;
  modalOnClose = null;
  closeModal();
  if (!needEnergy(40)) { homeMenu(); return; }
  spend(40, 2, 10);
  const short = f.name.split('-')[0];
  const dark = mixColor(f.color, '#1b1424', 0.55);
  const lvl = Math.max(66, p.lvl + 6);
  const def = {
    name: `Will of the ${short} Fruit`, lvl, hpMult: 13, atkMult: 1.6, bounty: 0, berries: 5000, scale: 3, heals: true, dodge: 0.1,
    spr: { kind: 'player', marks: p.fruit === 'dragon' ? ['dragonHorns', 'dragonBody'] : undefined, pal: { a: '#f2e6c8', d: f.color2, D: f.color, s: dark, S: mixColor(f.color, '#1b1424', 0.7), h: f.color2, v: f.color, b: dark, y: f.color2, Y: f.color, r: f.color, w: '#ffffff', e: '#ffffff', f: '#1b1424' } },
    intro: '"So you want ALL of my power? Then beat me. Alone."',
    basic: f.moves[0].name, charge: 'gathers the full power of the fruit...', big: aw.moves[1].name, fx: TRIAL_FX[p.fruit] || 'bolt',
    enrage: 'The Will roars. "Is that all? Show me more!"',
  };
  startBattle({
    def, key: 'trial', lvl, boss: true, solo: true,
    after: async res => {
      if (res !== 'win') { await talk('The fruit\'s Will fades. "Come back when you are stronger."'); return; }
      p.awakened[p.fruit] = true;
      save();
      Sfx.play('level');
      await MOVE_FX.awaken({ fruit: p.fruit, name: aw.name, colors: [f.color, f.color2] });
      await talk(`Your ${f.name} has AWAKENED: ${aw.name}!`);
      await talk(`In battle, use "Awaken: ${aw.name}" to transform. While awakened you hit harder, take less damage, and can use ${aw.moves.map(m => m.name).join(' and ')}.`);
    },
  });
}

// ---------- your ship ----------

const shipLook = () => ({ owned: G.p.owned, paint: G.p.ship.paint, head: G.p.ship.head, night: timeIdx() === 3 || isLate() });
const backToMenu = () => { if (G.mode === 'boat') boatMenu(); else if (G.mode === 'home') homeMenu(); };
const travelReady = () => G.p.unlocked - 1 > G.p.island;

async function boardShip() {
  lock(true);
  Sfx.play('door');
  await tween(G, { fade: 1 }, 250, linear);
  G.aboard = true;
  OW.respawn = true;
  boatMenu();
  await tween(G, { fade: 0 }, 300, linear);
  lock(false);
  boatMenu();
  say(travelReady() ? 'All aboard! A new island is on the chart. Walk to the map table to set a course.' : 'All aboard! The map table has the sea chart. The gangplank takes you back ashore.');
}

function boatMenu() {
  G.mode = 'boat';
  owLoad('deck');
  setPad(worldDock());
}

async function goAshore() {
  lock(true);
  Sfx.play('door');
  await tween(G, { fade: 1 }, 250, linear);
  G.aboard = false;
  OW.respawn = true;
  resetHero();
  homeMenu();
  await tween(G, { fade: 0 }, 300, linear);
  lock(false);
  homeMenu();
  say(`Back on ${island().name}.`);
}

const SHIP_ITEMS = Object.keys(ITEMS).filter(k => ITEMS[k].ship);
const soldAt = k => ISLANDS.filter(i => i.shop.includes(k)).map(i => i.name);

function customizeMenu(note) {
  const p = G.p;
  const body = el('div');
  body.style.display = 'contents';
  if (note) body.append(el('p', { class: 'note', text: note }));
  const section = (title, slot, choices) => {
    body.append(el('h3', { class: 'sect', text: title }));
    for (const [val, name, icon] of choices) {
      const on = p.ship[slot] === val;
      body.append(el('div', { class: 'row gear' + (on ? ' current' : '') },
        el('img', { src: icon, alt: '' }),
        el('div', null, el('h3', { text: name })),
        on ? el('span', { class: 'count', text: 'On ship' })
          : el('button', { type: 'button', class: 'mini-btn', text: 'Use', onclick: () => { p.ship[slot] = val; Sfx.play('select'); save(); customizeMenu(`${name} is on your ship now.`); } })));
    }
  };
  const paints = ['wood'].concat(Object.keys(PAINTS).filter(k => p.owned['paint_' + k]));
  section('Hull paint', 'paint', paints.map(k => [k, PAINTS[k].name, iconURL('paint', { c: PAINTS[k].hull })]));
  const heads = [null].concat(Object.keys(FIGURES).filter(k => p.owned['fh_' + k]));
  section('Figurehead', 'head', heads.map(k => k ? [k, ITEMS['fh_' + k].name, spriteURL({ kind: 'figure', head: k }, 3)] : [null, 'Plain bow', iconURL('ship')]));
  body.append(el('h3', { class: 'sect' }, 'Upgrades ', el('span', { text: `${SHIP_ITEMS.filter(k => p.owned[k]).length}/${SHIP_ITEMS.length} owned` })));
  for (const k of SHIP_ITEMS.filter(k => ITEMS[k].ship === true)) {
    const where = soldAt(k);
    body.append(itemRow(k, el('span', { class: 'count', text: p.owned[k] ? 'Installed' : 'Not yet' }),
      p.owned[k] ? null : el('p', { class: 'where', text: `Sold at: ${where.join(', ')}` })));
  }
  const more = Object.keys(ITEMS).filter(k => ITEMS[k].ship && ITEMS[k].ship !== true && !p.owned[k]);
  if (more.length) body.append(el('p', { class: 'note', text: `More paints and figureheads are sold in island shops: ${more.map(k => `${ITEMS[k].name} (${soldAt(k).join(', ')})`).join('; ')}.` }));
  openModal('Customize Ship', body, { onClose: backToMenu });
}

// ---------- sleep ----------

async function sleep() {
  const p = G.p;
  const aboard = !!G.aboard;
  lock(true);
  Sfx.play('sleep');
  say(aboard ? 'You curl up in your hammock...' : 'You find a cozy spot and curl up...');
  G.sleeping = true;
  await tween(G, { fade: 1 }, 700, linear);
  p.day++;
  p.tick = 0;
  const fed = p.food > 0;
  p.energy = fed ? 100 : 60;
  p.hp = p.maxHp;
  p.food = clamp(p.food - 15, 0, 100);
  p.mood = clamp(p.mood + (fed ? 6 : -10) + (p.owned.bunks ? 8 : 0), 0, 100);
  const ev = dailyEvent();
  save();
  await wait(500);
  await tween(G, { fade: 0 }, 700, linear);
  G.sleeping = false;
  await talk(`Day ${p.day}. ${fed ? 'You slept like a log. Fully rested!' : 'You went to bed hungry and slept badly. Only 60 energy.'}`);
  if (ev) await talk(ev);
  if (p.food < 30) { bubble('HUNGRY..'); await talk('Your stomach growls. Better eat something soon.'); }
  lock(false);
  if (aboard) boatMenu(); else homeMenu();
}

function dailyEvent() {
  const p = G.p, r = Math.random();
  const cook = crewWith('cook');
  if (cook && r < 0.3) { p.food = clamp(p.food + 30, 0, 100); return `${CREW[cook.key].name} made breakfast for everyone! +30 food.`; }
  if (p.owned.aquarium && Math.random() < 0.3) p.bag.fish = (p.bag.fish || 0) + 1;
  if (r < 0.4) { const b = randInt(20, 60); p.berries += b; return `A News Coo drops the morning paper. You find ฿${b} folded inside!`; }
  if (r < 0.5) { p.bag.meat = (p.bag.meat || 0) + 1; return 'A grateful villager left a Meat on the Bone at your door!'; }
  if (r < 0.62 && p.bounty > 0) return `Headline: "${p.name}, bounty ฿${fmt(p.bounty)}, terrorizes the seas!" You look great in the photo.`;
  return null;
}

// ---------- stats / wanted poster ----------

function wantedMenu(confirmReset) {
  const p = G.p;
  const body = el('div');
  body.style.display = 'contents';
  body.append(el('div', { class: 'poster' },
    el('div', { class: 'wanted', text: 'WANTED' }),
    el('img', { src: spriteURL(heroSpec(), 6), alt: `${p.name}'s wanted poster portrait` }),
    el('div', { class: 'doa', text: 'DEAD OR ALIVE' }),
    el('div', { class: 'pname', text: p.name }),
    el('div', { class: 'pbounty', text: '฿ ' + fmt(p.bounty) + ' -' }),
    el('div', { class: 'ptitle', text: pirateTitle(p.bounty) })));
  const hakiNext = p.haki < HAKI.armament ? `Armament at ${HAKI.armament}` : p.haki < HAKI.observation ? `Observation at ${HAKI.observation}` : p.haki < HAKI.conqueror ? `Conqueror's at ${HAKI.conqueror}` : 'All awakened';
  const stats = [['LV', p.lvl], ['HP', p.maxHp], ['HAKI', p.haki], ['ATK', effAtk()], ['DEF', effDef()], ['SPD', effSpd()]];
  body.append(el('div', { class: 'statgrid' }, stats.map(([k, v]) => el('div', null, el('b', { text: k }), el('span', { text: String(v) })))));
  const facts = [
    ['XP', `${p.xp}/${xpNeed(p.lvl)} to Lv ${p.lvl + 1}`],
    ['Race', race().name],
    ['Weapon', weapon() ? weapon().name : 'Bare fists'],
    ['Fruit', fruit() ? fruit().name : 'None yet'],
    ['Wearing', worn().length ? worn().map(c => c.name).join(', ') : 'Just the clothes on your back'],
    ['Haki', hakiNext],
    ['Crew', p.crew.length ? p.crew.map(m => CREW[m.key].name).join(', ') : 'Nobody yet'],
    ['Awakened', Object.keys(p.awakened).length ? Object.keys(p.awakened).map(k => FRUITS[k].awaken.name).join(', ') : 'Not yet'],
    ['Record', `${ISLANDS.filter(i => p.bosses[i.boss]).length}/${ISLANDS.length} bosses, ${p.wins} wins, day ${p.day}`],
  ];
  body.append(el('dl', { class: 'facts' }, facts.map(([k, v]) => el('div', null, el('dt', { text: k }), el('dd', { text: v })))));
  if (confirmReset) {
    body.append(el('p', { text: 'Erase this save and return to the title screen? This cannot be undone.' }));
    body.append(el('div', { class: 'btn-row' },
      el('button', { type: 'button', class: 'mini-btn red', text: 'Yes, erase it', onclick: resetSave }),
      el('button', { type: 'button', class: 'mini-btn', text: 'Keep playing', onclick: () => wantedMenu(false) })));
  } else {
    body.append(el('div', { class: 'btn-row' },
      el('button', { type: 'button', class: 'mini-btn red', text: 'Save code', onclick: saveCodeMenu }),
      el('button', { type: 'button', class: 'mini-btn', text: 'Load code', onclick: loadCodeMenu }),
      el('button', { type: 'button', class: 'mini-btn', text: 'Erase save...', onclick: () => wantedMenu(true) })));
  }
  openModal('Wanted Poster', body, { onClose: () => G.mode === 'home' && homeMenu() });
}

function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  G.p = null;
  G.saved = null;
  modalOnClose = null;
  closeModal();
  lock(false);
  showTitle();
}

// ---------- raids ----------

function bossLevel(key) {
  return BOSSES[key].lvl + (G.p.bosses[key] || 0) * 4;
}

function raidMenu() {
  const p = G.p, key = island().boss, def = BOSSES[key];
  const lvl = bossLevel(key);
  const beaten = p.bosses[key];
  const body = el('div');
  body.style.display = 'contents';
  body.append(el('div', { class: 'row' },
    el('img', { src: spriteURL(def.spr, 2), alt: '' }),
    el('div', null, el('h3', { text: `${def.name} - Lv ${lvl}` }), el('p', { text: def.intro })),
    null));
  const facts = [['Level', beaten ? `Rematch #${beaten}, stronger` : `${lvl - (key === 'grizzle' ? 1 : 2)}+ suggested (you: ${p.lvl})`]];
  if (!beaten && def.drop) facts.push(['Loot', WEAPONS[def.drop].name + (bossWear(key) ? ` + ${CLOTHES[bossWear(key)].name}` : '')]);
  if (def.logia) facts.push(['Logia', p.haki >= HAKI.armament ? 'Use Armament Haki to land hits' : `Hits pass through. Get Haki ${HAKI.armament} or Water Barrels`]);
  if (def.element === 'lightning' && p.fruit === 'rubber') facts.push(['Rubber', "Lightning can't hurt you"]);
  for (const t in TWIST_TIPS) if (def[t]) facts.push(TWIST_TIPS[t]);
  facts.push(['Tip', 'Guard when the boss charges up']);
  body.append(el('dl', { class: 'facts' }, facts.map(([k, v]) => el('div', null, el('dt', { text: k }), el('dd', { text: v })))));
  body.append(el('div', { class: 'btn-row' },
    el('button', { type: 'button', class: 'mini-btn red', text: 'Start raid (25 EN)', onclick: () => startRaid(key, lvl) }),
    el('button', { type: 'button', class: 'mini-btn', text: 'Not yet', onclick: closeModal })));
  openModal(beaten ? 'Raid Rematch' : 'Raid Boss', body, { onClose: () => G.mode === 'home' && homeMenu() });
}

const TWIST_TIPS = {
  unsliceable: ['Splits', 'Blades barely hurt. Punch, shoot or blast'],
  dodge: ['Fast', 'Dodges a lot. Sure-hit moves, stuns and freezes help'],
  armor: ['Armor', 'Blunts hits until half HP. Piercing moves get through'],
  seastone: ['Seastone', 'Drains a Devil Fruit user\'s SP on every hit'],
  eatsShots: ['Big mouth', 'Swallows shots and cannonballs. Fight up close'],
  fastCharge: ['Cola', 'Charges his big attack every other turn'],
  tekkai: ['Tekkai', 'Every other turn his body turns to iron. Piercing moves get through'],
  reflect: ['Shadow', 'Part of every hit you land comes back at you'],
  poison: ['Venom', 'His hits poison you for 3 turns'],
  scorch: ['Magma', 'His hits set you on fire'],
  steroids: ['Steroids', 'Hits much harder after half HP, but hurts himself'],
  suffocate: ['No air', 'Your SP drains every turn'],
  birdcage: ['Birdcage', 'The cage cuts you harder every turn. Win fast'],
  futureSight: ['Future sight', `Dodges almost everything unless you have Observation Haki (${HAKI.observation})`],
};

function startRaid(key, lvl) {
  modalOnClose = null;
  closeModal();
  if (!needEnergy(25)) { homeMenu(); return; }
  spend(25, 2, 10);
  startBattle({ def: BOSSES[key], key, lvl, boss: true });
}

// A fight with one of the enemies roaming the island.
function fightEnemy(key, o) {
  o = o || {};
  if (!needEnergy(10)) return false;
  const night = G.p.tick >= NIGHT_TICK;
  spend(10, 1, 6);
  startBattle({ def: ENEMIES[key], key, lvl: ENEMIES[key].lvl + randInt(0, 1) + (night ? 2 : 0), night, after: o.after, intro: o.intro });
  return true;
}

// ---------- battle ----------

function startBattle(o) {
  const def = o.def, lvl = o.lvl;
  const hp = Math.round((22 + lvl * 12) * (o.boss ? def.hpMult : 1));
  const F = {
    key: o.key, info: def, name: def.name, lvl, boss: !!o.boss, night: !!o.night,
    hp, maxHp: hp,
    atk: Math.round((5 + lvl * 2.1) * (o.boss ? 1.12 * (def.atkMult || 1) : 1)),
    defense: Math.round((1 + lvl * 0.95) * (o.boss ? 1.1 : 1)),
    spd: Math.round(3 + lvl * 0.9),
    spr: def.spr, scale: o.boss ? (def.scale || 3) : 2, flies: !!def.flies,
    phase: 1, charging: false, turn: 0, freeze: 0, stun: 0, burn: 0, burnDmg: 0, solid: 0, weak: 0, healed: false,
    x: 142, y: 121, ox: 0, oy: 0, flash: 0, alpha: 1, squash: 0,
  };
  G.battle = { F, sp: 20, guard: false, armament: 0, awake: 0, conqUsed: false, over: false, note: null, scene: o.scene || island().scene, after: o.after || null, solo: !!o.solo };
  G.mode = 'battle';
  G.hero.x = 58;
  resetHeroPose();
  lock(true);
  setActions([]);
  (async () => {
    if (F.boss) {
      Sfx.play('boss');
      shake(4, 700);
      raidBanner();
      await talk(`RAID BOSS! ${F.name} (Lv ${lvl}) blocks your path!`);
      await talk(def.intro);
    } else {
      await talk(o.intro ? o.intro(F) : `${F.night ? 'Night prowler! ' : ''}A wild ${F.name} (Lv ${lvl}) appears!`);
    }
    lock(false);
    battleMenu();
    say('What will you do?');
  })();
}

function resetHeroPose() {
  Object.assign(G.hero, { ox: 0, oy: 0, squash: 0, flash: 0, alpha: 1, form: null, swing: false });
}

function battleMenu() {
  const B = G.battle;
  setActions([
    { label: 'Attack', onClick: () => playerTurn({ type: 'attack' }) },
    { label: 'Skills', cls: 'raid', onClick: skillMenu },
    { label: 'Guard', onClick: () => playerTurn({ type: 'guard' }) },
    { label: 'Bag', onClick: battleBag },
    { label: 'Run', onClick: () => playerTurn({ type: 'run' }), blocked: B.F.boss ? "You can't run from a raid boss!" : null },
  ]);
}

function availableSkills() {
  const p = G.p, out = [];
  const add = key => styleMoves(key).forEach(m => out.push(Object.assign({}, m, { style: key, locked: mastery(key) < m.at ? m.at : 0 })));
  add(styleKey());
  if (p.fruit) add(p.fruit);
  if (p.fruit && p.awakened[p.fruit]) {
    const aw = fruit().awaken;
    out.push({ name: `Awaken: ${aw.name}`, sp: 50, awaken: true, style: p.fruit });
    aw.moves.forEach(m => out.push(Object.assign({}, m, { style: p.fruit, needAwake: true })));
  }
  if (race().move) add('race');
  if (p.haki >= HAKI.armament) out.push(ARMAMENT_SKILL);
  if (p.haki >= HAKI.conqueror) out.push(CONQUEROR_SKILL);
  return out;
}

function skillMenu() {
  const B = G.battle;
  const list = availableSkills().map(s => ({
    label: s.name,
    sub: s.locked ? `${mastery(s.style)}/${s.locked} mastery` : s.needAwake && !(B.awake > 0) ? 'Awakened only' : `${s.sp} SP`,
    cls: s.awaken || s.needAwake ? 'raid' : '',
    blocked: s.locked ? `${s.name} unlocks at ${s.locked} ${styleName(s.style)} mastery (you have ${mastery(s.style)}). Fight with it or do Drills.`
      : s.needAwake && !(B.awake > 0) ? `${s.name} only works while your fruit is awakened. Use Awaken first.`
      : s.awaken && B.awake > 0 ? 'Your fruit is already awakened!'
      : (s.conq && B.conqUsed) ? "You already unleashed your Conqueror's Will this battle."
      : B.sp < s.sp ? `Not enough spirit (${B.sp}/${s.sp} SP). Attack or Guard to build SP.` : null,
    onClick: () => playerTurn({ type: 'skill', skill: s }),
  }));
  list.push({ label: 'Back', cls: 'ghost', onClick: battleMenu });
  setActions(list, 'cols3');
  say('Choose a move. Grayed-out moves need more SP or mastery.');
}

function battleBag() {
  const p = G.p;
  const owned = BAG_ORDER.filter(k => p.bag[k] > 0);
  if (!owned.length) { Sfx.play('bad'); say('Your bag is empty!'); return; }
  setActions([
    ...owned.map(k => ({ label: SHORT[k], sub: 'x' + p.bag[k], icon: iconURL(ITEMS[k].icon, ITEMS[k].pal), onClick: () => playerTurn({ type: 'item', item: k }) })),
    { label: 'Back', cls: 'ghost', onClick: battleMenu },
  ], 'cols3');
  say('Using an item takes your turn.');
}

const heroC = () => ({ x: G.hero.x + G.hero.ox, y: 103 + G.hero.oy });
const heroHand = () => ({ x: G.hero.x + G.hero.ox + 10, y: 104 + G.hero.oy });
function foeH() { const F = G.battle.F; return getSprite(F.spr).height * F.scale; }
function foeLift() { const F = G.battle.F; return F.flies ? 16 + Math.round(Math.sin(G.t * 3) * 3) : 0; }
function foeC() {
  const F = G.battle.F;
  return { x: F.x + F.ox, y: F.y + F.oy - foeLift() - Math.min(foeH() * 0.45, 30) };
}
const foeTop = () => { const F = G.battle.F; return F.y - foeLift() - foeH() + 4; };

function impact(pos, colors, n) {
  particles(pos.x, pos.y, n || 12, { colors: colors || ['#ffffff', '#ffe14a'], speed: 80, grav: 60, life: 0.4 });
  fxRun(180, (c, k) => pxRing(c, pos.x, pos.y, 3 + k * 10, '#ffffff'));
}

function hitFoe(mult, o) {
  o = o || {};
  const B = G.battle, F = B.F, p = G.p;
  if (F.hp <= 0) return 0;
  const sight = F.info.futureSight ? (p.haki >= HAKI.observation ? 0.12 : 0.4) : 0;
  const dodge = clamp(0.04 + (F.spd - effSpd()) * 0.012, 0.02, 0.2) + (F.info.dodge || 0) + sight;
  if (!F.freeze && !F.stun && !o.sure && Math.random() < dodge) {
    if (sight && !B.dodgeHint) { B.dodgeHint = true; B.note = p.haki >= HAKI.observation ? `${F.name} sees the future, but your Observation Haki reads him right back!` : `${F.name} saw that coming! He dodges almost everything unless you have Observation Haki (${HAKI.observation} Haki).`; }
    if (F.info.dodge && !B.dodgeHint) { B.dodgeHint = true; B.note = `${F.name} vanishes and reappears behind you! Sure-hit moves, stuns and freezes pin him down.`; }
    floatText(foeC().x, foeTop() - 4, 'MISS', '#cfd6e6');
    Sfx.play('miss');
    tween(F, { ox: 10 }, 90).then(() => tween(F, { ox: 0 }, 140));
    return 0;
  }
  let atk = (o.atk || effAtk() * moodMult()) * (B.armament > 0 ? 1.35 : 1) * (!o.atk && B.awake > 0 ? 1.4 : 1);
  if (!o.atk && p.race === 'mink' && (p.tick >= NIGHT_TICK || F.night)) atk *= 1.15;
  if (!o.atk && p.race === 'fishman' && (B.scene === 'desert' || B.scene === 'sky')) atk *= 0.9;
  let dmg = atk * mult * rand(0.9, 1.1) - (o.pierce ? 0 : F.defense * 0.5);
  const crit = Math.random() < clamp(0.05 + effSpd() * 0.003, 0.05, 0.3) + (o.critBonus || 0) + (o.atk ? 0 : wearBonus('crit'));
  if (crit) dmg *= o.critMult || 1.6;
  if (F.info.armor && F.phase === 1 && !o.pierce) {
    dmg *= 1 - F.info.armor;
    if (!B.armorHint) { B.armorHint = true; B.note = `${F.name}'s steel armor blunts the blow! Piercing moves get through, and it cracks at half HP.`; }
  }
  if (F.tekkai && !o.pierce) {
    dmg *= 0.4;
    if (!B.tekkaiHint) { B.tekkaiHint = true; B.note = `Tekkai! ${F.name}'s body is hard as iron this turn. Piercing moves get through, or wait for his guard to drop.`; }
  }
  dmg = Math.max(1, Math.round(dmg));
  let phased = false;
  if (F.info.logia && B.armament <= 0 && F.solid <= 0 && !o.logiaHit) {
    dmg = Math.max(1, Math.round(dmg * 0.12));
    phased = true;
    if (!B.phaseHint) { B.phaseHint = true; B.note = `Your attack passes right through the ${F.info.logia}! Use Armament Haki, a Water Barrel or a Seastone weapon.`; }
  } else if (F.info.eatsShots && o.shot) {
    dmg = Math.max(1, Math.round(dmg * 0.15));
    phased = true;
    if (!B.chompHint) { B.chompHint = true; B.note = `${F.name} chomps the shot right out of the air! Shots barely hurt him. Get in close!`; }
  } else if (F.info.unsliceable && o.slash) {
    dmg = Math.max(1, Math.round(dmg * 0.15));
    phased = true;
    if (!B.sliceHint) { B.sliceHint = true; B.note = `${F.name} splits apart and the blade cuts nothing! Punch, shoot or blast him instead.`; }
  }
  F.hp = Math.max(0, F.hp - dmg);
  F.flash = 0.12;
  if (F.info.reflect && !o.atk && !phased && dmg > 1) {
    const back = Math.max(1, Math.round(dmg * F.info.reflect));
    p.hp = Math.max(1, p.hp - back);
    G.hero.flash = 0.08;
    floatText(heroC().x, 70, '-' + back, '#9a7ac0');
    if (!B.reflectHint) { B.reflectHint = true; B.note = 'Your stolen shadow strikes back! Part of every hit you land comes back at you.'; }
  }
  const c = foeC();
  if (phased) {
    floatText(c.x, foeTop() - 4, dmg, '#9aa4b1');
    particles(c.x, c.y, 8, { colors: F.info.logia === 'sand' ? SAND : F.info.logia === 'smoke' ? SMOKE : F.info.unsliceable ? ['#e0483a', '#f7f4ea'] : F.info.eatsShots ? ['#9aa4b1', '#ffffff'] : ['#fff6a0', '#7cd0ff'], speed: 50, grav: 0, life: 0.5 });
    Sfx.play('miss');
  } else if (crit) {
    floatText(c.x, foeTop() - 6, dmg + '!', '#ffe14a', 2);
    Sfx.play('crit');
    shake(3, 160);
  } else {
    floatText(c.x, foeTop() - 4, dmg, '#ffffff');
    Sfx.play('hit');
  }
  return dmg;
}

function hitPlayer(mult, o) {
  o = o || {};
  const B = G.battle, F = B.F, p = G.p;
  let dodge = clamp(0.04 + (effSpd() - F.spd) * 0.01, 0.02, 0.22);
  if (p.haki >= HAKI.observation) dodge += 0.12;
  if (fruit() && fruit().dodge) dodge += fruit().dodge;
  dodge += wearBonus('dodge');
  if (p.race === 'skypian') dodge += 0.1;
  if (o.big) dodge *= 0.5;
  const hc = heroC();
  if (Math.random() < dodge) {
    floatText(hc.x, 76, 'DODGE', '#7cd0ff');
    Sfx.play('miss');
    tween(G.hero, { ox: -12 }, 100).then(() => tween(G.hero, { ox: 0 }, 160));
    return 0;
  }
  if (F.info.element === 'lightning' && p.fruit === 'rubber') {
    floatText(hc.x, 76, 'RUBBER!', '#ffe14a');
    particles(hc.x, hc.y, 10, { colors: ['#fff6a0', '#ffe14a'], speed: 40, grav: 0 });
    if (!B.rubberHint) { B.rubberHint = true; B.note = "Shishishi! You're made of rubber. Lightning can't hurt you!"; }
    return 0;
  }
  const atk = F.atk * (F.weak > 0 ? 0.75 : 1) * (F.phase === 2 ? (F.info.steroids ? 1.6 : 1.25) : 1);
  let dmg = atk * mult * rand(0.9, 1.1) - effDef() * 0.5;
  if (fruit() && fruit().guard) dmg *= 1 - fruit().guard;
  if (B.awake > 0) dmg *= 0.75;
  if (B.guard) dmg *= o.big ? 0.3 : 0.5;
  dmg *= 1 - wearBonus('armor');
  dmg = Math.max(1, Math.round(dmg));
  p.hp = Math.max(0, p.hp - dmg);
  G.hero.flash = 0.15;
  Sfx.play('hurt');
  shake(o.big ? 6 : 2, o.big ? 420 : 150);
  floatText(hc.x, 74, '-' + dmg, '#ff6a5a', o.big ? 2 : 1);
  impact(hc, ['#ffffff', '#ff6a5a'], o.big ? 18 : 8);
  if (B.guard) floatText(hc.x, 64, 'GUARD', '#7cd0ff');
  if (F.info.poison || F.info.scorch) {
    const fresh = !B.dot || B.dot.turns <= 0;
    B.dot = F.info.poison ? { turns: 3, pct: 0.05, name: 'poison', color: '#c48ae8' } : { turns: 2, pct: 0.06, name: 'burn', color: '#ff9a3a' };
    if (fresh) floatText(hc.x, 58, F.info.poison ? 'POISON' : 'BURN', B.dot.color);
    if (!B.dotHint) { B.dotHint = true; B.note = F.info.poison ? "Magellan's venom seeps into you! You'll take poison damage every turn." : "Akainu's magma sets you on fire! You'll burn every turn."; }
  }
  if (F.info.seastone && p.fruit && B.sp > 0) {
    B.sp = Math.max(0, B.sp - 15);
    floatText(hc.x, 58, '-15 SP', '#9ab0c8');
    if (!B.seaHint) { B.seaHint = true; B.note = `${F.name}'s seastone jitte drains your Devil Fruit power! Every hit costs you 15 SP.`; }
  }
  return dmg;
}

async function showNote() {
  const B = G.battle;
  if (B && B.note) { const n = B.note; B.note = null; await talk(n); }
}

async function playerTurn(act) {
  const B = G.battle;
  if (!B || B.over || G.busy) return;
  if (act.type === 'skill' && act.skill.needAwake && !(B.awake > 0)) return;
  const F = B.F, p = G.p;
  lock(true);
  B.guard = false;
  let unlocked = [];
  if (act.type === 'attack') {
    const w = weapon();
    say(`${p.name} ${!w ? 'attacks' : w.hit === 'shot' ? 'fires' : 'swings the ' + w.name}!`);
    const fx = w ? w.hit : 'punch';
    await fxPlayer(fx, () => hitFoe(1, { logiaHit: !!(w && w.logiaHit), slash: isSlash(fx, styleKey()), shot: isShot(fx) }), 1, w && w.color, { basic: styleKey() });
    B.sp = Math.min(100, B.sp + 12);
    unlocked = gainMastery(styleKey(), 1);
  } else if (act.type === 'skill') {
    const s = act.skill;
    B.sp -= s.sp;
    say(`${p.name} uses ${s.name}!`);
    moveBanner(s.name, s.color || (WEAPONS[s.style] && WEAPONS[s.style].color) || (FRUITS[s.style] && FRUITS[s.style].color) || (s.buff || s.conq ? '#7a4ac0' : '#d63c2f'));
    if (s.buff) {
      await fxPlayer('armament');
      B.armament = 4;
      await talk('Your fists turn black as steel. Armament Haki! Hits connect with Logias for 3 turns.');
    } else if (s.awaken) {
      const f = fruit();
      B.awake = 4;
      await MOVE_FX.awaken({ fruit: p.fruit, name: f.awaken.name, colors: [f.color, f.color2] });
      await talk(`${f.awaken.name}! Your ${f.name} awakens. Attack up, damage down, and your ultimate moves are ready for 3 turns!`);
    } else if (s.conq) {
      B.conqUsed = true;
      await fxPlayer('conqueror');
      if (!F.boss && F.lvl <= p.lvl + 2) { F.hp = 0; await talk(`${F.name} foams at the mouth and faints!`); }
      else { F.stun = 1; F.charging = false; await talk(`${F.name} staggers under the pressure of your will! Stunned.`); }
    } else {
      const wp = s.style === styleKey() ? weapon() : null;
      const dragon = s.style === p.fruit && fruit().form;
      if (dragon) {
        G.hero.form = 'dragon';
        Sfx.play('haki');
        particles(heroC().x, heroC().y, 20, { colors: ['#4a8ad9', '#bfe0ff', '#ffffff'], speed: 70 });
        await wait(300);
      }
      let dealt = 0;
      await fxPlayer(s.fx, () => {
        dealt += hitFoe(s.mult, { sure: s.sure, critBonus: s.crit, pierce: s.pierce, logiaHit: !!(wp && wp.logiaHit), slash: isSlash(s.fx, s.style), shot: isShot(s.fx) });
      }, s.hits || 1, s.color || (wp && wp.color), { move: s });
      if (dragon) G.hero.form = null;
      if (s.style === p.fruit) B.usedFruit = true;
      unlocked = gainMastery(s.style, 3);
      if (F.hp > 0 && s.burn) { F.burn = s.burn; F.burnDmg = Math.max(3, Math.round(effAtk() * 0.4)); await talk(`${F.name} is on fire!`); }
      if (F.hp > 0 && s.freeze) {
        if (!F.boss || Math.random() < 0.5) { F.freeze = 1; F.charging = false; await talk(`${F.name} is frozen solid!`); }
        else await talk(`${F.name} shatters the ice!`);
      }
      if (F.hp > 0 && s.atkDown) { F.weak = 3; await talk(`${F.name} is weakened! Its attacks hit softer.`); }
      if (F.hp > 0 && s.stun && Math.random() < (F.boss ? s.stun / 2 : s.stun)) { F.stun = 1; await talk(`${F.name} is dazed and stunned!`); }
      if (F.hp > 0 && s.wet && F.info.logia) { F.solid = Math.max(F.solid, 3); await talk(`${F.name} is soaked! Your hits will connect for a while.`); }
      if (s.drain && dealt > 0) {
        const h = Math.max(1, Math.round(dealt * s.drain));
        p.hp = Math.min(p.maxHp, p.hp + h);
        floatText(heroC().x, 74, '+' + h, '#7cff7a');
      }
      if (s.heal) {
        const h = Math.max(1, Math.round(p.maxHp * s.heal));
        p.hp = Math.min(p.maxHp, p.hp + h);
        Sfx.play('heal');
        floatText(heroC().x, 74, '+' + h, '#7cff7a');
      }
      if (s.recoil) {
        const r = Math.round(p.maxHp * s.recoil);
        p.hp = Math.max(1, p.hp - r);
        G.hero.flash = 0.12;
        await talk(`The recoil slams into you too! -${r} HP.`);
      }
    }
  } else if (act.type === 'guard') {
    B.guard = true;
    B.sp = Math.min(100, B.sp + 20);
    tween(G.hero, { squash: 0.12 }, 120);
    await talk(F.charging ? 'You plant your feet and brace for the big one!' : 'You raise your guard. Damage is halved this turn.');
  } else if (act.type === 'item') {
    await useBattleItem(act.item);
  } else if (act.type === 'run') {
    const chance = clamp(0.55 + (effSpd() - F.spd) * 0.04, 0.2, 0.95);
    if (Math.random() < chance) {
      Sfx.play('miss');
      await tween(G.hero, { ox: -70, alpha: 0 }, 400, easeIn);
      await talk('You got away safely!');
      return endBattle('run');
    }
    await talk("You couldn't get away!");
  }
  await announceUnlocks(unlocked);
  await showNote();
  if (F.hp <= 0) return winBattle();
  await checkPhase();
  await crewTurn();
  if (F.hp <= 0) return winBattle();
  await checkPhase();
  await foeTurn();
  await showNote();
  tween(G.hero, { squash: 0 }, 150);
  if (p.hp <= 0) return loseBattle();
  await endRound();
  if (F.hp <= 0) return winBattle();
  if (p.hp <= 0) return loseBattle();
  lock(false);
  battleMenu();
  say(F.charging ? `${F.name} is about to unleash ${F.info.big}! GUARD!` : 'What will you do?');
}

async function useBattleItem(k) {
  const p = G.p, B = G.battle, F = B.F, it = ITEMS[k];
  if (!p.bag[k]) return;
  p.bag[k]--;
  const hc = heroC();
  if (k === 'water') {
    Sfx.play('splash');
    await projectile(heroHand(), foeC(), 300, (c, x, y) => { pxCircle(c, x, y, 4, '#4fa3e0'); pxCircle(c, x - 1, y - 1, 2, '#bfe6ff'); });
    particles(foeC().x, foeC().y, 20, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 70, grav: 120 });
    if (F.info.logia) { F.solid = 4; await talk(`SPLASH! ${F.name} is soaked. Your hits will connect for 3 turns!`); }
    else await talk(`SPLASH! ${F.name} is wet now. That did nothing.`);
    return;
  }
  if (k === 'cola') {
    B.sp = Math.min(100, B.sp + it.sp);
    Sfx.play('heal');
    floatText(hc.x, 74, '+' + it.sp + ' SP', '#7cd0ff');
    await talk(`You chug an Energy Cola! +${it.sp} SP.`);
    return;
  }
  const boost = k !== 'medicine' ? foodBoost() : 1;
  const heal = Math.round(p.maxHp * it.heal * boost);
  p.hp = Math.min(p.maxHp, p.hp + heal);
  if (it.food) p.food = clamp(p.food + Math.round(it.food * 0.5), 0, 100);
  Sfx.play(it.food ? 'eat' : 'heal');
  floatText(hc.x, 74, '+' + heal, '#7cff7a');
  particles(hc.x, hc.y, 12, { colors: ['#7cff7a', '#ffffff'], speed: 30, grav: -40, life: 0.7 });
  await talk(k === 'medicine' ? `You take some Medicine. +${heal} HP.` : `You scarf down the ${it.name}! +${heal} HP.`);
}

async function crewTurn() {
  const B = G.battle, F = B.F, p = G.p;
  if (B.solo) return;
  for (let i = 0; i < p.crew.length; i++) {
    if (F.hp <= 0) return;
    if (!F.boss && Math.random() > crewJoin(p.crew[i])) continue;
    await crewAct(p.crew[i], i);
  }
  if (F.boss && p.owned.cannon && F.hp > 0) {
    say("Your ship's cannon fires!");
    Sfx.play('boom');
    await projectile({ x: 0, y: 84 }, foeC(), 300, (c, x, y) => { pxCircle(c, x, y, 3, PAL.k); pxRect(c, x - 1, y - 1, 1, 1, '#9aa4b1'); });
    particles(foeC().x, foeC().y, 18, { colors: ['#ffffff', '#ffe14a', '#5a5a6a'], speed: 90 });
    shake(3, 200);
    hitFoe(1, { atk: 8 + p.lvl * 1.6, sure: true, shot: true });
    await wait(250);
  }
}

// A crewmate's turn: doctors heal when you are hurt; everyone else attacks with their weapon,
// their role's signature move, or (40% of the time) their Devil Fruit.
async function crewAct(m, i) {
  const p = G.p, B = G.battle, F = B.F;
  const c = CREW[m.key], r = ROLES[c.role];
  const [cx, cy] = BATTLE_CREW_SPOTS[i];
  const from = { x: cx + 6, y: cy - 10 };
  if (r.heal && p.hp < p.maxHp * 0.8) {
    const heal = crewHeal(m);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    say(`${c.name}: "Hold still! ${c.call || r.call}!"`);
    Sfx.play('heal');
    const hc = heroC();
    floatText(hc.x, 74, '+' + heal, '#7cff7a');
    particles(hc.x, hc.y, 12, { colors: ['#7cff7a', '#ffffff', '#ff8ab0'], speed: 30, grav: -40, life: 0.7 });
    await wait(450);
    return;
  }
  const atk = crewAtk(m);
  const sure = !F.info.dodge;
  const fr = m.fruit && FRUITS[m.fruit];
  if (fr && Math.random() < 0.4) {
    const mv = pick(fr.moves);
    say(`${c.name}: "${mv.name}!"`);
    Sfx.play(mv.burn || /fire|meteor|pillar/.test(mv.fx) ? 'fire' : 'boom');
    const cols = [fr.color, fr.color2, '#ffffff'];
    await projectile(from, foeC(), 280, (cv, x, y) => {
      pxCircle(cv, x, y, 5, PAL.k); pxCircle(cv, x, y, 4, fr.color); pxCircle(cv, x - 1, y - 1, 2, fr.color2);
      particles(x, y, 1, { colors: cols, speed: 15, grav: 0, life: 0.3 });
    });
    particles(foeC().x, foeC().y, 20, { colors: cols, speed: 80 });
    shake(3, 200);
    hitFoe(1, { atk: atk * 1.4, sure });
    if (F.hp > 0 && mv.burn) { F.burn = Math.max(F.burn, 2); F.burnDmg = Math.max(3, F.burnDmg || 0, Math.round(atk * 0.3)); floatText(foeC().x, foeTop() - 12, 'BURN', '#ff9a3a'); }
    if (F.hp > 0 && mv.freeze && Math.random() < (F.boss ? 0.15 : 0.35)) { F.freeze = 1; F.charging = false; floatText(foeC().x, foeTop() - 12, 'FROZEN', '#7fe8ff'); }
    if (F.hp > 0 && mv.stun && Math.random() < mv.stun / 3) { F.stun = 1; floatText(foeC().x, foeTop() - 12, 'STUN', '#ffe14a'); }
    if (F.hp > 0 && mv.atkDown) { F.weak = Math.max(F.weak, 2); floatText(foeC().x, foeTop() - 12, 'WEAK', '#c48ae8'); }
    if (F.hp > 0 && mv.wet && F.info.logia) F.solid = Math.max(F.solid, 2);
    await wait(320);
    return;
  }
  const w = m.weapon && WEAPONS[m.weapon];
  const fx = w ? (w.hit === 'shot' ? 'shot' : BLADES.includes(w.shape) ? 'slash' : 'punch') : r.fx === 'heal' ? 'punch' : r.fx;
  say(`${c.name}: "${w ? w.moves[0].name : r.strike || c.call || r.call}!"`);
  const fc = foeC();
  if (fx === 'slash') {
    await fxSlash();
  } else if (fx === 'shot') {
    Sfx.play('shot');
    await projectile(from, fc, 200, (cv, x, y) => pxRect(cv, x - 1, y - 1, 3, 3, (w && w.color) || '#ff5a2a'));
    particles(fc.x, fc.y, 10, { colors: ['#ff5a2a', '#ffd04a'], speed: 60 });
  } else if (fx === 'kick') {
    Sfx.play('fire');
    await projectile(from, fc, 220, (cv, x, y) => { pxCircle(cv, x, y, 3, '#ff9a3a'); particles(x, y, 2, { colors: FIRE, speed: 20, grav: -40, life: 0.25 }); });
    particles(fc.x, fc.y, 14, { colors: FIRE, speed: 70 });
  } else if (fx === 'bolt') {
    await fxBolt(fc.x, fc.y, 0.6);
  } else {
    await projectile(from, fc, 170, (cv, x, y) => { pxCircle(cv, x, y, 3, PAL.k); pxCircle(cv, x, y, 2, (w && w.color) || '#f3c08c'); });
    Sfx.play('hit');
    impact(fc, null, 10);
  }
  hitFoe(1, { atk, sure, critBonus: (r.crit || 0) + crewWearCrit(m), critMult: r.critMult, slash: fx === 'slash', shot: fx === 'shot', logiaHit: !!(w && w.logiaHit) });
  if (r.weak && F.hp > 0 && Math.random() < r.weak) { F.weak = Math.max(F.weak, 2); floatText(foeC().x, foeTop() - 12, 'WEAK', '#c48ae8'); }
  await wait(320);
}

async function foeTurn() {
  const B = G.battle, F = B.F, info = F.info;
  if (F.hp <= 0) return;
  if (F.freeze > 0) { F.freeze--; await talk(`${F.name} is frozen and can't move!`); return; }
  if (F.stun > 0) { F.stun--; await talk(`${F.name} is too stunned to move!`); return; }
  F.turn++;
  if (info.tekkai) {
    F.tekkai = F.turn % 2 === 1;
    if (F.tekkai) floatText(foeC().x, foeTop() - 12, 'TEKKAI', '#c9ccd6');
  }
  if (F.boss) {
    if (F.charging) { F.charging = false; await foeBig(); return; }
    if (info.heals && !F.healed && F.hp < F.maxHp * 0.35) {
      F.healed = true;
      const h = Math.round(F.maxHp * 0.2);
      F.hp += h;
      Sfx.play('heal');
      floatText(foeC().x, foeTop() - 4, '+' + h, '#7cff7a');
      await talk(`${F.name} gulps down seawater and recovers ${h} HP!`);
      return;
    }
    if (F.turn % (info.fastCharge ? 2 : 3) === 0) {
      F.charging = true;
      Sfx.play('charge');
      await talk(`${F.name} ${info.charge} (Guard next turn!)`);
      return;
    }
  }
  const move = F.boss ? (F.phase === 2 && info.phase2 ? info.phase2.basic : info.basic) : pick(info.moves);
  say(`${F.name} uses ${move}!`);
  await fxFoeLunge(() => hitPlayer(1));
  await wait(250);
}

async function foeBig() {
  const F = G.battle.F, info = F.info;
  say(`${F.name}: "${info.big}!!"`);
  const hc = heroC();
  if (info.fx === 'bolt') {
    Sfx.play('zap');
    screenFlash('#fff6a0', 0.8);
    await fxBolt(hc.x, hc.y, 1.4);
    hitPlayer(2.2, { big: true });
  } else if (info.fx === 'fire' || info.fx === 'sand') {
    Sfx.play('fire');
    const cols = info.fx === 'fire' ? FIRE : SAND;
    const start = foeC();
    await fxRun(700, () => {
      for (let i = 0; i < 4; i++) {
        FX.parts.push({ x: start.x - 10, y: start.y - 4 + rand(-4, 4), vx: -170 + rand(-20, 20), vy: rand(-20, 20), grav: 0, life: 0.55, max: 0.55, color: pick(cols), size: 3 });
      }
    });
    hitPlayer(2.2, { big: true });
  } else if (info.fx === 'bomb') {
    Sfx.play('charge');
    const start = foeC();
    await fxRun(650, (c, k) => {
      const x = start.x + (hc.x - start.x) * k, y = start.y + (hc.y - start.y) * k - Math.sin(k * Math.PI) * 40;
      pxCircle(c, x, y, 7, PAL.k); pxCircle(c, x, y, 6, '#3a3440'); pxRect(c, x - 3, y - 3, 2, 2, '#9aa4b1');
      pxRect(c, x, y - 9, 1, 3, '#c9b88a'); pxRect(c, x - 1, y - 11, 3, 2, pick(FIRE));
    });
    Sfx.play('boom');
    screenFlash('#ffd04a', 0.6);
    fxRun(500, (c, k) => { pxRing(c, hc.x, hc.y, 4 + k * 30, '#ffe14a', 2); pxRing(c, hc.x, hc.y, 2 + k * 20, '#ff5a2a', 2); });
    particles(hc.x, hc.y, 36, { colors: FIRE.concat(['#3a3440']), speed: 120 });
    hitPlayer(2.2, { big: true });
  } else if (info.fx === 'flurry') {
    Sfx.play('slash');
    for (let i = 0; i < 4; i++) {
      F.alpha = 0.2;
      await wait(90);
      F.alpha = 1;
      slashAt({ x: hc.x + rand(-6, 6), y: hc.y + rand(-10, 6) }, '#d9d9e0', rand(-1.2, 1.2), 30);
      hitPlayer(0.6, { big: true });
      await wait(150);
    }
  } else if (info.fx === 'gas') {
    Sfx.play('fire');
    const start = foeC();
    const GAS = ['#8a4ac0', '#b98ae0', '#6a8a3a', '#c9e08a'];
    await fxRun(900, () => {
      for (let i = 0; i < 3; i++) {
        FX.parts.push({ x: start.x - 8, y: start.y + rand(-10, 10), vx: -120 + rand(-20, 20), vy: rand(-15, 15), grav: -10, life: 0.9, max: 0.9, color: pick(GAS), size: 4 });
      }
    });
    hitPlayer(2.2, { big: true });
  } else if (info.fx === 'smoke') {
    Sfx.play('fire');
    const start = foeC();
    await fxRun(800, (c, k) => {
      for (let i = 0; i < 14; i++) {
        const q = Math.max(0, k * 1.3 - i * 0.03);
        if (q <= 0 || q > 1) continue;
        const x = start.x + (hc.x - start.x) * q, y = start.y + Math.sin(q * 9 + i) * 10 + (hc.y - start.y) * q;
        pxCircle(c, x, y, 5 - i * 0.2, i % 3 ? '#dfe2ea' : '#ffffff');
      }
      if (k > 0.2) { pxRect(c, start.x + (hc.x - start.x) * k - 6, start.y + (hc.y - start.y) * k - 4, 3, 2, PAL.k); }
    });
    particles(hc.x, hc.y, 26, { colors: SMOKE, speed: 70, grav: -20, size: 3 });
    hitPlayer(2.2, { big: true });
  } else if (info.fx === 'chomp') {
    Sfx.play('boom');
    await tween(F, { ox: -70, squash: -0.2 }, 220, easeIn);
    await fxRun(420, (c, k) => {
      const open = k < 0.6 ? 14 : 14 * (1 - (k - 0.6) / 0.4);
      for (const dir of [-1, 1]) {
        const y = hc.y + dir * (2 + open);
        pxRect(c, hc.x - 14, y - (dir < 0 ? 6 : 0), 28, 6, '#9aa4b1');
        for (let i = 0; i < 7; i++) pxRect(c, hc.x - 13 + i * 4, dir < 0 ? y : y - 3, 3, 3, '#ffffff');
      }
    });
    shake(6, 400);
    hitPlayer(2.2, { big: true });
    await tween(F, { ox: 0, squash: 0 }, 300);
  } else if (FOE_FX[info.fx]) {
    await FOE_FX[info.fx](hc, F);
    hitPlayer(2.2, { big: true });
  } else if (info.fx === 'water') {
    Sfx.play('splash');
    await tween(F, { ox: -96, squash: -0.15 }, 260, easeIn);
    particles(hc.x, hc.y, 22, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 90, grav: 120 });
    hitPlayer(2.2, { big: true });
    await tween(F, { ox: 0, squash: 0 }, 300);
  } else {
    await tween(F, { ox: 10, squash: 0.2 }, 250);
    Sfx.play('boom');
    await tween(F, { ox: -72, squash: -0.15 }, 150, easeIn);
    hitPlayer(2.2, { big: true });
    await tween(F, { ox: 0, squash: 0 }, 300);
  }
  await wait(300);
}

// Big attacks of the bosses from Water 7 on. Each draws its attack and lands on the hero.
const FOE_FX = {
  beam: async (hc, F) => {
    Sfx.play('charge');
    const s = foeC();
    await fxRun(300, (c, k) => { pxCircle(c, s.x - 14, s.y, 2 + k * 5, '#bfe6ff'); });
    Sfx.play('zap');
    await fxRun(420, (c, k) => {
      const w = Math.round(8 * Math.sin(k * Math.PI)) + 1;
      pxLine(c, s.x - 14, s.y, hc.x, hc.y, '#5ab8e8', w + 3); pxLine(c, s.x - 14, s.y, hc.x, hc.y, '#ffffff', w);
      for (let i = 0; i < 4; i++) pxRect(c, lerp(s.x, hc.x, (k * 2 + i / 4) % 1), hc.y + (i % 2 ? -6 : 6), 2, 2, '#ffe14a');
    });
  },
  rokuogan: async (hc, F) => {
    await tween(F, { ox: -80 }, 160, easeIn);
    Sfx.play('boom');
    screenFlash('#ffffff', 0.5);
    for (let i = 0; i < 3; i++) ringOut(hc, i % 2 ? '#c9ccd6' : '#ffffff', 2, 18 + i * 10, 420, 2);
    await wait(200);
    tween(F, { ox: 0 }, 300);
  },
  shadows: async hc => {
    Sfx.play('charge');
    const s = foeC();
    await fxRun(750, (c, k) => {
      for (let i = 0; i < 18; i++) {
        const q = Math.min(1, Math.max(0, k * 1.6 - i * 0.03));
        const x = lerp(s.x, hc.x, q) + Math.sin(i * 2 + k * 10) * 8, y = lerp(s.y - 20, hc.y, q) + Math.cos(i * 3 + k * 9) * 8;
        pxRect(c, x - 2, y, 5, 2, '#1b1424'); pxRect(c, x, y - 1, 1, 1, '#9a7ac0');
      }
    });
  },
  lightrain: async hc => {
    Sfx.play('zap');
    screenFlash('#fff6a0', 0.4);
    await fxRun(700, (c, k) => {
      for (let i = 0; i < 12; i++) {
        const q = (k * 3 + i / 12) % 1, sx = 100 + (i * 23) % 90;
        pxLine(c, lerp(sx, hc.x + rand(-6, 6), q), lerp(-4, hc.y, q), lerp(sx, hc.x, Math.min(1, q + 0.1)), lerp(-4, hc.y, Math.min(1, q + 0.1)), '#fff3a0', 2);
      }
    });
  },
  venom: async hc => {
    Sfx.play('fire');
    const s = foeC();
    await fxRun(700, (c, k) => {
      for (let h = 0; h < 3; h++) {
        const x = lerp(s.x, hc.x, k), y = lerp(s.y, hc.y, k) + (h - 1) * 12 + Math.sin(k * 10 + h) * 4;
        pxCircle(c, x, y, 6, '#7a2a9a'); pxCircle(c, x - 2, y - 2, 3, '#c48ae8'); pxRect(c, x - 5, y - 2, 2, 2, '#ffe14a');
      }
      for (let i = 0; i < 3; i++) pxRect(c, lerp(s.x, hc.x, k) + rand(-12, 12), lerp(s.y, hc.y, k) + 14 + i * 3, 2, 2, '#9a4ad0');
    });
    particles(hc.x, hc.y, 20, { colors: ['#9a4ad0', '#c48ae8', '#1b1424'], speed: 70, grav: 60 });
  },
  magma: async hc => {
    Sfx.play('fire');
    for (let i = 0; i < 4; i++) {
      const x = hc.x + (i - 1.5) * 10;
      await fxRun(140, (c, k) => { const y = lerp(-10, hc.y, k); pxCircle(c, x, y, 6, '#5a1a1a'); pxCircle(c, x, y, 4, '#c0301a'); pxRect(c, x - 1, y - 2, 3, 2, '#ffd04a'); });
      particles(x, hc.y, 8, { colors: FIRE, speed: 60, grav: 80 });
    }
  },
  tide: async hc => {
    Sfx.play('splash');
    const s = foeC();
    for (let i = 0; i < 5; i++) {
      projectile({ x: s.x - 12, y: s.y + (i - 2) * 4 }, { x: hc.x, y: hc.y + (i - 2) * 5 }, 220, (c, x, y) => { pxCircle(c, x, y, 2, '#4fa3e0'); pxRect(c, x - 1, y - 1, 1, 1, '#ffffff'); });
      await wait(70);
    }
    await wait(220);
    particles(hc.x, hc.y, 18, { colors: ['#4fa3e0', '#bfe6ff', '#ffffff'], speed: 80, grav: 100 });
  },
  gasbomb: async hc => {
    Sfx.play('fire');
    const s = foeC();
    await projectile(s, hc, 500, (c, x, y, k) => { pxCircle(c, x, y, 6 + k * 10, '#7a3a8a'); pxCircle(c, x - 3, y - 3, 3 + k * 5, '#b06ad0'); pxRect(c, x - 3, y, 2, 2, '#1b1424'); pxRect(c, x + 2, y, 2, 2, '#1b1424'); });
    Sfx.play('boom');
    ringOut(hc, '#b06ad0', 4, 30, 400, 3);
    particles(hc.x, hc.y, 26, { colors: ['#7a3a8a', '#b06ad0', '#3a3440'], speed: 80, grav: -10, size: 3 });
  },
  strings: async hc => {
    Sfx.play('slash');
    await fxRun(600, (c, k) => {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i - 3.5) * 0.35, len = 90 * Math.min(1, k * 2.2);
        pxLine(c, hc.x + Math.cos(a) * 100, hc.y + Math.sin(a) * 100, hc.x + Math.cos(a) * (100 - len), hc.y + Math.sin(a) * (100 - len), i % 2 ? '#ffffff' : '#ff8ab0', 1);
      }
    });
  },
  mochi: async hc => {
    Sfx.play('charge');
    const s = foeC();
    await fxRun(420, (c, k) => {
      const x = lerp(s.x, hc.x + 16, easeIn(k)), y = lerp(s.y, hc.y, k);
      pxCircle(c, x, y, 13, '#efe2c8'); pxCircle(c, x + 2, y - 2, 9, '#fffaf0');
      for (let i = 0; i < 6; i++) { const a = i * 1.05; pxRect(c, x + Math.cos(a) * 14 - 1, y + Math.sin(a) * 14 - 1, 3, 3, '#7a2630'); }
    });
    Sfx.play('boom');
  },
};

async function checkPhase() {
  const F = G.battle.F;
  if (!F.boss || F.phase !== 1 || F.hp <= 0 || F.hp > F.maxHp / 2) return;
  F.phase = 2;
  Sfx.play('boss');
  shake(5, 800);
  screenFlash('#ff3030', 0.6);
  const ph = F.info.phase2;
  if (ph) {
    for (let i = 0; i < 4; i++) { F.flash = 0.1; await wait(140); }
    F.spr = ph.spr;
    F.scale = ph.scale;
    F.flies = !!ph.flies;
    F.name = ph.name;
    particles(foeC().x, foeC().y, 30, { colors: ['#4a8ad9', '#bfe0ff', '#ffffff'], speed: 90 });
  }
  await talk(`${F.info.enrage} (Attack up!)`);
}

async function endRound() {
  const B = G.battle, F = B.F;
  if (F.burn > 0 && F.hp > 0) {
    F.burn--;
    F.hp = Math.max(0, F.hp - F.burnDmg);
    F.flash = 0.1;
    floatText(foeC().x, foeTop() - 4, F.burnDmg, '#ff9a3a');
    particles(foeC().x, foeC().y, 10, { colors: FIRE, speed: 30, grav: -60 });
    await talk(`${F.name} takes ${F.burnDmg} burn damage!`);
  }
  if (B.armament > 0) { B.armament--; if (!B.armament) await talk('Your Armament Haki fades.'); }
  if (F.weak > 0) F.weak--;
  if (F.solid > 0) { F.solid--; if (!F.solid && F.hp > 0) await talk(`${F.name} has dried off.`); }
  const p = G.p, hc = heroC();
  const ouch = async (d, color, text, first) => {
    p.hp = Math.max(0, p.hp - d);
    G.hero.flash = 0.1;
    floatText(hc.x, 74, '-' + d, color);
    if (first) await talk(text); else { say(text); await wait(500); }
  };
  if (B.dot && B.dot.turns > 0 && p.hp > 0 && F.hp > 0) {
    B.dot.turns--;
    await ouch(Math.max(1, Math.round(p.maxHp * B.dot.pct)), B.dot.color, `The ${B.dot.name} hurts!`, false);
  }
  if (F.info.birdcage && F.hp > 0 && p.hp > 0) {
    B.cage = (B.cage || 0) + 1;
    await ouch(Math.max(1, Math.round(p.maxHp * 0.02 * B.cage)), '#ff8ab0', B.cage === 1 ? 'The Birdcage closes in. The strings will cut deeper every turn!' : 'The Birdcage tightens!', B.cage === 1);
  }
  if (F.info.steroids && F.phase === 2 && F.hp > 0) {
    const d = Math.max(1, Math.round(F.maxHp * 0.03));
    F.hp = Math.max(1, F.hp - d);
    floatText(foeC().x, foeTop() - 4, d, '#c48ae8');
  }
  if (B.awake > 0) { B.awake--; if (!B.awake) await talk('Your awakening fades... for now.'); }
  B.sp = Math.min(100, B.sp + 8 + (G.p.race === 'skypian' ? 4 : 0) + wearBonus('sp') + ((fruit() && fruit().sp) || 0));
  if (fruit() && fruit().regen && G.p.hp > 0 && G.p.hp < G.p.maxHp) {
    const h = Math.max(1, Math.round(G.p.maxHp * fruit().regen));
    G.p.hp = Math.min(G.p.maxHp, G.p.hp + h);
    floatText(heroC().x, 66, '+' + h, '#7cd0ff');
  }
  if (F.info.suffocate && F.hp > 0) {
    B.sp = Math.max(0, B.sp - 15);
    floatText(hc.x, 60, '-15 SP', '#b06ad0');
    if (!B.airHint) { B.airHint = true; await talk(`${F.name} is stealing the air! Your SP drains every turn.`); }
  }
}

async function winBattle() {
  const B = G.battle, F = B.F, p = G.p, info = F.info;
  B.over = true;
  lock(true);
  for (let i = 0; i < 3; i++) { F.flash = 0.08; await wait(130); }
  if (F.boss) { Sfx.play('boom'); shake(6, 600); particles(foeC().x, foeC().y, 40, { colors: ['#ffffff', '#ffe14a', '#ff8a3a'], speed: 110 }); }
  await tween(F, { alpha: 0, oy: 8 }, 500);
  Sfx.play('win');
  const first = F.boss && !p.bosses[F.key];
  const xp = Math.round((10 + F.lvl * 7) * (F.boss ? 6 : 1) * (F.night ? 1.5 : 1) * (1 + teamBonus('xp')));
  let berries = Math.round((15 + F.lvl * 10) * (F.night ? 1.5 : 1));
  let bounty = F.lvl * 100000;
  if (F.boss) {
    berries = Math.round(info.berries * (first ? 1 : 0.5) * (1 + (F.lvl - (info.lvl || F.lvl)) * 0.05));
    bounty = first ? info.bounty : Math.round(info.bounty * 0.08);
  }
  if (crewWith('navigator')) berries = Math.round(berries * 1.2);
  berries = Math.round(berries * (1 + teamBonus('berries')));
  p.berries += berries;
  p.bounty += bounty;
  p.mood = clamp(p.mood + 4, 0, 100);
  p.wins++;
  if (F.boss) p.bosses[F.key] = (p.bosses[F.key] || 0) + 1;
  let drop = F.key === 'seaking' ? 'kingmeat' : (!F.boss && Math.random() < 0.22 ? 'meat' : null);
  if (drop) p.bag[drop] = (p.bag[drop] || 0) + 1;
  await talk(`${F.name} is defeated!`);
  Sfx.play('coin');
  await talk(`+${xp} XP, +฿${fmt(berries)}, bounty +฿${fmt(bounty)}.${drop ? ` Got ${ITEMS[drop].name}!` : ''}`);
  await announceLevels(gainXp(xp));
  await announceUnlocks(gainMastery(styleKey(), 2).concat(B.usedFruit ? gainMastery(p.fruit, 2) : []));
  const after = B.after, key = F.key;
  G.battle = null;
  G.mode = 'home';
  resetHero();
  save();
  homeMenu();
  if (first) await bossAftermath(key);
  if (after) await after('win');
  save();
  lock(false);
  homeMenu();
  if (!after && !first) say('Victory! What next, Captain?');
}

async function loseBattle() {
  const B = G.battle, p = G.p;
  B.over = true;
  lock(true);
  Sfx.play('lose');
  await tween(G.hero, { alpha: 0.35, oy: 4, squash: 0.3 }, 600);
  await talk('You were knocked out...');
  const lost = Math.floor(p.berries * 0.2);
  p.berries -= lost;
  const after = B.after;
  G.battle = null;
  G.mode = 'home';
  resetHero();
  p.day++;
  p.tick = 0;
  p.hp = Math.ceil(p.maxHp * 0.5);
  p.energy = 60;
  p.food = clamp(p.food - 10, 0, 100);
  p.mood = clamp(p.mood - 20, 0, 100);
  save();
  G.aboard = false;
  G.indoors = null;
  OW.respawn = true;
  homeMenu();
  await talk(`You wake up in the clinic the next morning. The doctor charged ฿${fmt(lost)}.`);
  if (after) await after('lose');
  lock(false);
  homeMenu();
  say(`Day ${p.day}. Train up, eat well, and try again!`);
}

async function endBattle(res) {
  const after = G.battle.after;
  G.battle = null;
  G.mode = 'home';
  resetHero();
  save();
  homeMenu();
  if (after) await after(res);
  lock(false);
  homeMenu();
}

async function bossAftermath(key) {
  const p = G.p;
  const idx = ISLANDS.findIndex(i => i.boss === key);
  if (idx < 0) return;
  if (key === 'grizzle') {
    Sfx.play('find');
    screenFlash('#ffe14a', 0.5);
    await talk("Grizzle's bandits scatter. Word spreads fast: the nobody from Dawn Village took down the Bandit King!");
    await talk("You're not a nobody anymore. You're a PIRATE!");
  }
  const drop = BOSSES[key].drop;
  if (drop && !p.weapons.includes(drop)) await findWeapon(drop, BOSSES[key].name);
  const wear = bossWear(key);
  if (wear && !p.clothes.includes(wear)) await findClothes(wear, BOSSES[key].name);
  if (idx + 1 < ISLANDS.length && p.unlocked < idx + 2) {
    p.unlocked = idx + 2;
    if (key === 'smoker') {
      await talk('Smoker growls from the ground: "Go, then. The Grand Line will eat you alive."');
      await talk('The way is open! Board your ship and cross Reverse Mountain into the Grand Line.');
    } else {
      await talk(`Your Log Pose now points to ${ISLANDS[idx + 1].name}. Board your ship and check the Sea Chart!`);
    }
  }
  if (key === 'akainu') {
    await talk('The war is over. An old pirate with glasses finds you in the rubble...');
    await talk('"Your Devil Fruit can do more than you think. When you are strong enough, it can AWAKEN." (Check the Gear menu.)');
    if (!p.owned.coating) await talk(`Next stop is Fish-Man Island, 10,000 meters under the sea. Your ship needs a Bubble Coating from ${ISLANDS[FISHMAN - 3].name}.`);
  }
  if (key === 'drakko') await ending();
  save();
}

function ending() {
  const p = G.p;
  p.king = true;
  save();
  Sfx.play('win');
  return new Promise(res => {
    const body = el('div');
    body.style.display = 'contents';
    body.append(el('div', { class: 'poster' },
      el('div', { class: 'wanted', text: 'KING' }),
      el('img', { src: spriteURL(heroSpec(), 6), alt: '' }),
      el('div', { class: 'pname', text: p.name }),
      el('div', { class: 'pbounty', text: '฿ ' + fmt(p.bounty) + ' -' }),
      el('div', { class: 'ptitle', text: 'King of the Pirates' })));
    body.append(el('p', { text: `Beyond Drakko's lair you found it: the legendary treasure at the end of the Grand Line. On day ${p.day}, ${p.name} became the Pirate King!` }));
    body.append(el('p', { class: 'note', text: 'Keep playing: rematch raid bosses for loot and bounty, or erase your save from the Wanted poster to start a new voyage.' }));
    openModal('You are the Pirate King!', body, { onClose: res });
  });
}

function raidBanner() {
  fxRun(1700, (c, k) => {
    const y = 40;
    const a = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1;
    c.globalAlpha = a * 0.85;
    pxRect(c, 0, y, W, 24, '#8a1a1a');
    for (let x = -24; x < W; x += 12) pxRect(c, x + ((k * 200) % 12), y, 6, 2, '#d8432f');
    for (let x = -24; x < W; x += 12) pxRect(c, x - ((k * 200) % 12), y + 22, 6, 2, '#d8432f');
    c.globalAlpha = a;
    const tx = k < 0.2 ? W + 60 - (k / 0.2) * (W / 2 + 60) : k > 0.8 ? W / 2 - ((k - 0.8) / 0.2) * (W / 2 + 80) : W / 2;
    drawText(c, 'RAID BOSS', tx, y + 6, { color: '#ffe14a', scale: 3, align: 'center' });
    c.globalAlpha = 1;
  });
}

// ---------- attack effects ----------

function projectile(from, to, ms, drawFn) {
  const f = { x: from.x, y: from.y }, t = { x: to.x, y: to.y };
  return fxRun(ms, (c, k) => drawFn(c, f.x + (t.x - f.x) * k, f.y + (t.y - f.y) * k - Math.sin(k * Math.PI) * 5, k));
}

function stretchArms(n, ms, onHit, yOff, thick) {
  let done = false;
  thick = thick || 3;
  const target = foeC();
  return fxRun(ms, (c, k) => {
    const from = heroHand();
    from.y += yOff || 0;
    const to = { x: target.x, y: target.y + (yOff || 0) };
    const ext = k < 0.45 ? easeOut(k / 0.45) : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    if (!done && k >= 0.45) { done = true; onHit(); impact(to); }
    for (let a = 0; a < n; a++) {
      const dy = n > 1 ? (a ? 5 : -5) : 0;
      const ex = from.x + (to.x - 8 - from.x) * ext, ey = from.y + dy + (to.y - from.y) * ext;
      pxLine(c, from.x, from.y + dy, ex, ey, PAL.k, thick + 2);
      pxLine(c, from.x, from.y + dy, ex, ey, '#f3c08c', thick);
      pxCircle(c, ex, ey, thick + 1, PAL.k);
      pxCircle(c, ex, ey, thick, '#f3c08c');
    }
  });
}

async function fxPlayer(kind, hit, hits, color, opts) {
  hits = hits || 1;
  const Hr = G.hero, F = G.battle.F;
  const m = { hit, hits, color };
  if (opts && opts.basic && opts.basic !== 'fists') return basicAttack(opts.basic, m);
  if (MOVE_FX[kind]) return MOVE_FX[kind](m);
  switch (kind) {
    case 'swing':
      await tween(Hr, { ox: 50 }, 140, easeIn);
      hit(0);
      slashAt(foeC(), color || '#ffffff', 0.8, 36);
      impact(foeC(), null, 8);
      await tween(Hr, { ox: 0 }, 200);
      break;
    case 'multislash':
      await tween(Hr, { ox: 48 }, 130, easeIn);
      for (let i = 0; i < hits && F.hp > 0; i++) {
        Hr.ox = 46 + (i % 2) * 6;
        hit(i);
        slashAt(foeC(), color || '#ffffff', (i % 2 ? -0.8 : 0.8) + rand(-0.3, 0.3), 30);
        await wait(140);
      }
      await tween(Hr, { ox: 0 }, 200);
      break;
    case 'crescent': {
      await tween(Hr, { squash: 0.15 }, 150);
      Sfx.play('slash');
      tween(Hr, { squash: 0 }, 150);
      const col = color || '#ffffff';
      await projectile(heroHand(), foeC(), 320, (c, x, y) => {
        for (let a = -1.3; a <= 1.3; a += 0.08) {
          pxRect(c, x + Math.cos(a) * 9 - 6, y + Math.sin(a) * 12, 2, 2, col);
          pxRect(c, x + Math.cos(a) * 6 - 6, y + Math.sin(a) * 9, 1, 1, '#ffffff');
        }
      });
      hit(0);
      particles(foeC().x, foeC().y, 18, { colors: [col, '#ffffff'], speed: 90 });
      shake(4, 250);
      break;
    }
    case 'shot':
      for (let i = 0; i < hits && F.hp > 0; i++) {
        Sfx.play('shot');
        const h = heroHand();
        particles(h.x + 12, h.y + 2, 6, { colors: ['#ffe14a', '#ffffff'], speed: 50, grav: 0, life: 0.2 });
        tween(Hr, { ox: -4 }, 60).then(() => tween(Hr, { ox: 0 }, 120));
        await projectile({ x: h.x + 12, y: h.y + 2 }, foeC(), 150, (c, x, y) => pxRect(c, x - 2, y - 1, 4, 2, color || '#ffe14a'));
        hit(i);
        impact(foeC(), null, 8);
      }
      break;
    case 'blast': {
      await tween(Hr, { ox: 40 }, 140, easeIn);
      Sfx.play('boom');
      hit(0);
      const fc = foeC();
      screenFlash('#ffd04a', 0.35);
      fxRun(400, (c, k) => { pxRing(c, fc.x, fc.y, 4 + k * 22, '#ffe14a', 2); pxRing(c, fc.x, fc.y, 2 + k * 14, '#ff8a3a', 2); });
      particles(fc.x, fc.y, 30, { colors: FIRE, speed: 100 });
      shake(5, 320);
      await tween(Hr, { ox: 0 }, 220);
      break;
    }
    case 'wave': {
      Sfx.play('splash');
      const x0 = G.hero.x + 12, x1 = foeC().x;
      const col = color || '#4fa3e0', deep = mixColor(col, '#000000', 0.25);
      await fxRun(620, (c, k) => {
        const x = x0 + (x1 - x0) * k;
        const h = 12 + Math.sin(k * Math.PI) * 12;
        for (let i = 0; i < 18; i++) {
          const hh = h * (1 - i / 18);
          pxRect(c, x - i * 2, 122 - hh, 2, hh, i % 3 ? col : deep);
          pxRect(c, x - i * 2, 122 - hh, 2, 1, '#ffffff');
        }
      });
      hit(0);
      particles(foeC().x, foeC().y, 24, { colors: [col, mixColor(col, '#ffffff', 0.5), '#ffffff'], speed: 90, grav: 120 });
      break;
    }
    case 'sandslash': {
      Sfx.play('fire');
      const h = heroHand();
      fxRun(500, () => {
        for (let i = 0; i < 3; i++) FX.parts.push({ x: h.x, y: h.y + rand(-6, 6), vx: 200 + rand(-30, 30), vy: rand(-20, 20), grav: 0, life: 0.45, max: 0.45, color: pick(SAND), size: 2 });
      });
      await wait(260);
      for (let i = 0; i < hits && F.hp > 0; i++) {
        hit(i);
        slashAt(foeC(), color || '#e8c27b', rand(-1, 1), 30);
        await wait(120);
      }
      break;
    }
    case 'thunder':
      screenFlash('#fff6a0', 0.5);
      await fxBolt(foeC().x, foeC().y, 1.3);
      hit(0);
      particles(foeC().x, foeC().y, 20, { colors: ['#ffe14a', '#ffffff'], speed: 90 });
      shake(4, 260);
      break;
    case 'smash':
      await tween(Hr, { ox: 28, oy: -26 }, 220);
      await tween(Hr, { ox: 52, oy: 0 }, 130, easeIn);
      Sfx.play('boom');
      hit(0);
      impact(foeC(), ['#ffffff', '#ffe14a', '#c9b88a'], 14);
      particles(foeC().x, 118, 14, { colors: ['#c9b88a', '#e8d9b0'], speed: 60, grav: 80, dir: -Math.PI / 2, spread: 2 });
      shake(5, 300);
      await tween(Hr, { ox: 0 }, 220);
      break;
    case 'lightkick': {
      Sfx.play('zap');
      const x0 = Hr.x + 6;
      await tween(Hr, { ox: 56 }, 90, easeIn);
      fxRun(260, (c, k) => {
        if (k > 0.6 && Math.floor(k * 20) % 2) return;
        for (let i = 0; i < 5; i++) pxRect(c, x0 + i * 10, 98 + (i % 2) * 5, 10, 2, i % 2 ? '#fff3a0' : '#ffffff');
      });
      hit(0);
      impact(foeC(), ['#ffffff', '#fff3a0'], 14);
      screenFlash('#fff6a0', 0.3);
      await wait(140);
      await tween(Hr, { ox: 0 }, 160);
      break;
    }
    case 'lightrain':
      Sfx.play('zap');
      screenFlash('#fff6a0', 0.25);
      for (let i = 0; i < hits && F.hp > 0; i++) {
        const fc = foeC();
        const sx = rand(10, 90), sy = rand(0, 16), tx = fc.x + rand(-10, 10), ty = fc.y + rand(-12, 12);
        fxRun(160, (c, k) => {
          const e = Math.min(1, k * 2);
          pxLine(c, sx, sy, sx + (tx - sx) * e, sy + (ty - sy) * e, '#ffd04a', 2);
          pxLine(c, sx, sy, sx + (tx - sx) * e, sy + (ty - sy) * e, '#ffffff', 1);
        });
        await wait(85);
        hit(i);
        particles(tx, ty, 5, { colors: ['#ffffff', '#fff3a0'], speed: 50 });
      }
      await wait(150);
      break;
    case 'beam': {
      Sfx.play('charge');
      await fxRun(350, (c, k) => {
        const h = heroHand();
        pxCircle(c, h.x + 4, h.y, 2 + k * 5, '#fff3a0');
        pxCircle(c, h.x + 4, h.y, 1 + k * 3, '#ffffff');
      });
      Sfx.play('zap');
      screenFlash('#fffbe0', 0.6);
      const h = heroHand(), fc = foeC();
      fxRun(450, (c, k) => {
        const w = Math.max(1, Math.round(7 * (1 - Math.abs(k - 0.3))));
        pxLine(c, h.x + 4, h.y, fc.x + 20, fc.y, '#ffd04a', w + 2);
        pxLine(c, h.x + 4, h.y, fc.x + 20, fc.y, '#ffffff', w);
      });
      await wait(120);
      hit(0);
      shake(5, 300);
      particles(fc.x, fc.y, 24, { colors: ['#ffffff', '#fff3a0', '#ffd04a'], speed: 100 });
      await wait(330);
      break;
    }
    case 'doughfist':
      Sfx.play('stretch');
      await projectile(heroHand(), foeC(), 330, (c, x, y, k) => {
        const r = 4 + k * 4;
        pxCircle(c, x, y, r + 1, PAL.k);
        pxCircle(c, x, y, r, '#efe2c8');
        pxCircle(c, x - 2, y - 2, Math.max(1, r - 4), '#fffaf0');
      });
      hit(0);
      impact(foeC(), ['#efe2c8', '#ffffff'], 14);
      shake(3, 200);
      break;
    case 'doughsnare': {
      Sfx.play('stretch');
      const fc = foeC();
      const col = color || '#efe2c8', dark = color ? mixColor(color, '#000000', 0.3) : '#c9a26a';
      fxRun(800, (c, k) => {
        for (let i = 0; i < 4; i++) {
          const r = 22 - Math.min(1, k * 2) * (10 - i * 2);
          pxRing(c, fc.x, fc.y + i * 4 - 6, r * 0.8, i % 2 ? col : dark, 2);
        }
      });
      await wait(500);
      hit(0);
      await wait(300);
      break;
    }
    case 'breath': {
      Sfx.play('fire');
      const h = heroHand();
      fxRun(650, () => {
        for (let i = 0; i < 4; i++) FX.parts.push({ x: h.x + 6, y: h.y - 8 + rand(-4, 4), vx: 170 + rand(-20, 20), vy: rand(-20, 20), grav: 0, life: 0.5, max: 0.5, color: pick(FIRE), size: 3 });
      });
      await wait(400);
      hit(0);
      await wait(260);
      break;
    }
    case 'twister': {
      Sfx.play('boom');
      const fc = foeC();
      fxRun(900, c => {
        for (let i = 0; i < 16; i++) {
          const a = G.t * 10 + i * 0.9, up = (i / 16) * 64, r = 6 + (i / 16) * 16;
          pxRect(c, fc.x + Math.cos(a) * r, 120 - up, 3, 2, i % 3 ? '#bfe0ff' : '#ffffff');
        }
      });
      shake(6, 800);
      await wait(250);
      hit(0);
      await wait(650);
      break;
    }
    case 'bomb': {
      Sfx.play('charge');
      const h = heroHand(), fc = foeC();
      await fxRun(520, (c, k) => {
        const x = h.x + (fc.x - h.x) * k, y = h.y + (fc.y - h.y) * k - Math.sin(k * Math.PI) * 30;
        pxCircle(c, x, y, 5, PAL.k); pxCircle(c, x, y, 4, color || '#3a3440'); pxRect(c, x - 2, y - 2, 1, 1, '#9aa4b1');
        pxRect(c, x, y - 7, 1, 2, '#c9b88a'); pxRect(c, x - 1, y - 8, 2, 1, pick(FIRE));
      });
      Sfx.play('boom');
      hit(0);
      screenFlash('#ffd04a', 0.4);
      fxRun(450, (c, k) => { pxRing(c, fc.x, fc.y, 4 + k * 24, '#ffe14a', 2); pxRing(c, fc.x, fc.y, 2 + k * 16, '#ff5a2a', 2); });
      particles(fc.x, fc.y, 30, { colors: FIRE.concat(['#3a3440']), speed: 110 });
      shake(5, 320);
      break;
    }
    case 'splitfist': {
      Sfx.play('slash');
      await projectile(heroHand(), foeC(), 280, (c, x, y) => {
        pxCircle(c, x, y, 4, PAL.k); pxCircle(c, x, y, 3, '#f7e0d0');
        pxRect(c, x - 7, y - 1, 3, 3, PAL.k); pxRect(c, x - 6, y, 2, 1, '#3b6fd6');
        pxRect(c, x - 10, y + rand(-1, 1), 2, 1, '#e0483a');
      });
      hit(0);
      impact(foeC(), ['#ffffff', '#e0483a'], 12);
      break;
    }
    case 'meteor':
      Sfx.play('fire');
      screenFlash('#ff8a3a', 0.25);
      for (let i = 0; i < hits && F.hp > 0; i++) {
        const fc = foeC(), sx = fc.x + rand(-40, 10), tx = fc.x + rand(-8, 8), ty = fc.y + rand(-10, 10);
        await fxRun(200, (c, k) => {
          const x = sx + (tx - sx) * k, y = -10 + (ty + 10) * k;
          pxCircle(c, x, y, 4, '#5a2a1a'); pxCircle(c, x, y, 3, '#ff5a2a'); pxRect(c, x - 1, y - 1, 2, 2, '#ffd04a');
          particles(x, y, 1, { colors: FIRE, speed: 10, grav: -40, life: 0.3 });
        });
        hit(i);
        Sfx.play('boom');
        particles(tx, ty, 12, { colors: FIRE, speed: 70 });
        shake(3, 150);
      }
      await wait(150);
      break;
    case 'strings': {
      Sfx.play('slash');
      const STR = ['#ff5a5a', '#ffd04a', '#7cff7a', '#7cd0ff', '#e88aff'];
      for (let i = 0; i < hits && F.hp > 0; i++) {
        const h = heroHand(), fc = foeC(), col = STR[i % STR.length], ty = fc.y + rand(-14, 14);
        fxRun(240, (c, k) => {
          const e = Math.min(1, k * 2.5);
          pxLine(c, h.x, h.y - 8, h.x + (fc.x + 14 - h.x) * e, h.y - 8 + (ty - h.y + 8) * e, col, 1);
        });
        await wait(90);
        hit(i);
        slashAt({ x: fc.x, y: ty }, col, rand(-0.4, 0.4), 26);
      }
      await wait(200);
      break;
    }
    case 'cage': {
      Sfx.play('charge');
      const fc = foeC();
      await fxRun(900, (c, k) => {
        const r = 46 - Math.min(1, k * 1.3) * 30;
        for (let i = 0; i < 12; i++) {
          const x = fc.x - r + (i / 11) * r * 2;
          pxLine(c, fc.x, -4, x, GROUND + 22, '#f2f2f2', 1);
        }
      });
      Sfx.play('slash');
      hit(0);
      screenFlash('#ffffff', 0.4);
      particles(fc.x, fc.y, 24, { colors: ['#ffffff', '#f2c7d8'], speed: 90 });
      shake(5, 300);
      break;
    }
    case 'pawcannon': {
      Sfx.play('boom');
      tween(Hr, { ox: 6 }, 80).then(() => tween(Hr, { ox: 0 }, 160));
      await projectile(heroHand(), foeC(), 300, (c, x, y, k) => {
        const r = 4 + k * 3;
        pxCircle(c, x, y + 2, r, '#ffffff');
        pxCircle(c, x, y + 2, Math.max(1, r - 2), '#f2c7d8');
        for (let t = -1; t <= 1; t++) { pxCircle(c, x + r + 1, y + 2 + t * (r - 1), 2, '#ffffff'); pxCircle(c, x + r + 1, y + 2 + t * (r - 1), 1, '#f2c7d8'); }
      });
      hit(0);
      fxRun(300, (c, k) => pxRing(c, foeC().x, foeC().y, 4 + k * 18, '#ffffff', 2));
      shake(4, 260);
      break;
    }
    case 'punch':
      await tween(Hr, { ox: 56 }, 150, easeIn);
      hit(0); impact(foeC());
      await tween(Hr, { ox: 0 }, 200);
      break;
    case 'haymaker':
      await tween(Hr, { ox: -8, squash: 0.15 }, 220);
      await tween(Hr, { ox: 60, squash: -0.1 }, 110, easeIn);
      hit(0); impact(foeC(), ['#ffffff', '#ffe14a', '#ff8a3a'], 18); shake(4, 250);
      await tween(Hr, { ox: 0, squash: 0 }, 220);
      break;
    case 'rush':
      await tween(Hr, { ox: 52 }, 130, easeIn);
      for (let i = 0; i < hits && F.hp > 0; i++) {
        Hr.ox = 48 + (i % 2) * 6;
        hit(i);
        const c = foeC();
        impact({ x: c.x + rand(-6, 6), y: c.y + rand(-8, 8) }, null, 8);
        await wait(140);
      }
      await tween(Hr, { ox: 0 }, 200);
      break;
    case 'arm':
      Sfx.play('stretch');
      await stretchArms(1, 420, () => hit(0), 0);
      break;
    case 'gatling':
      Sfx.play('stretch');
      for (let i = 0; i < hits && F.hp > 0; i++) {
        const idx = i;
        stretchArms(1, 260, () => hit(idx), rand(-9, 9), 2);
        await wait(110);
      }
      await wait(300);
      break;
    case 'bazooka':
      await tween(Hr, { ox: -10, squash: 0.15 }, 260);
      Sfx.play('stretch');
      await stretchArms(2, 480, () => { hit(0); shake(6, 400); Sfx.play('boom'); }, 0, 4);
      await tween(Hr, { ox: 0, squash: 0 }, 160);
      break;
    case 'fireball':
      Sfx.play('fire');
      await projectile(heroHand(), foeC(), 320, (c, x, y) => {
        pxCircle(c, x, y, 6, '#ff5a2a'); pxCircle(c, x, y, 4, '#ff9a3a'); pxCircle(c, x, y, 2, '#fff3a0');
        particles(x, y, 2, { colors: FIRE, speed: 20, grav: -50, life: 0.3 });
      });
      hit(0);
      particles(foeC().x, foeC().y, 26, { colors: FIRE, speed: 90, grav: -30 });
      shake(3, 220);
      break;
    case 'flamespray': {
      Sfx.play('fire');
      const h = heroHand();
      fxRun(650, () => {
        for (let i = 0; i < 4; i++) FX.parts.push({ x: h.x, y: h.y + rand(-3, 3), vx: 180 + rand(-20, 30), vy: rand(-25, 25), grav: -20, life: 0.5, max: 0.5, color: pick(FIRE), size: 3 });
      });
      await wait(380); hit(0); await wait(300);
      break;
    }
    case 'pillar': {
      Sfx.play('fire');
      screenFlash('#ff8a3a', 0.5);
      const fx = foeC().x;
      fxRun(850, (c, k) => {
        const hgt = Math.min(1, k * 3) * 110;
        for (let i = 0; i < 6; i++) {
          const w = 16 - i * 2 + Math.sin(G.t * 30 + i) * 2;
          pxRect(c, fx - w / 2, GROUND + 20 - hgt + i * 8, w, hgt - i * 8, FIRE[i % 4]);
        }
      });
      await wait(320); hit(0); shake(5, 450); await wait(560);
      break;
    }
    case 'icespear':
      Sfx.play('ice');
      await projectile(heroHand(), foeC(), 260, (c, x, y) => {
        pxLine(c, x - 12, y, x, y, '#bff2ff', 3); pxLine(c, x - 12, y, x + 2, y, '#5fd3f0', 1);
        pxRect(c, x, y - 1, 3, 3, '#ffffff');
      });
      hit(0);
      particles(foeC().x, foeC().y, 18, { colors: ICE, speed: 90, grav: 100 });
      break;
    case 'iceage': {
      Sfx.play('ice');
      const x0 = G.hero.x + 12, x1 = foeC().x + 10;
      fxRun(700, (c, k) => {
        const n = 10;
        for (let i = 0; i < n; i++) {
          if (i / n > k * 1.4) break;
          const x = x0 + (x1 - x0) * i / n, hgt = 6 + (i % 3) * 4;
          for (let j = 0; j < hgt; j++) pxRect(c, x - (hgt - j) / 3, GROUND + 22 - j, Math.max(1, (hgt - j) / 1.5), 1, j % 3 ? '#bff2ff' : '#5fd3f0');
        }
      });
      await wait(520); hit(0); particles(foeC().x, foeC().y, 16, { colors: ICE, speed: 60 }); await wait(250);
      break;
    }
    case 'glacier': {
      Sfx.play('ice');
      const fc = foeC();
      await fxRun(450, (c, k) => {
        const y = -30 + (fc.y + 4) * easeIn(k);
        pxRect(c, fc.x - 15, y - 15, 30, 26, '#5fd3f0');
        pxRect(c, fc.x - 13, y - 13, 26, 22, '#bff2ff');
        pxRect(c, fc.x - 10, y - 11, 6, 14, '#ffffff');
      });
      hit(0); shake(7, 450); Sfx.play('boom');
      particles(fc.x, fc.y, 30, { colors: ICE, speed: 110, grav: 140 });
      break;
    }
    case 'quake': {
      await tween(Hr, { ox: 48 }, 140, easeIn);
      hit(0);
      Sfx.play('boom');
      const fc = foeC();
      fxRun(600, (c, k) => {
        pxRing(c, fc.x - 6, fc.y, 4 + k * 26, '#ffffff', 2);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; pxLine(c, fc.x - 6, fc.y, fc.x - 6 + Math.cos(a) * 14 * k, fc.y + Math.sin(a) * 14 * k, '#ffffff'); }
      });
      shake(5, 420);
      await tween(Hr, { ox: 0 }, 220);
      break;
    }
    case 'seaquake': {
      Sfx.play('boom');
      shake(7, 800);
      const hc = heroC();
      fxRun(800, (c, k) => { for (let i = 0; i < 3; i++) { const kk = k - i * 0.15; if (kk > 0) pxRing(c, hc.x + 10, hc.y, kk * 150, '#ffffff', 2); } });
      await wait(450); hit(0); await wait(350);
      break;
    }
    case 'split': {
      Sfx.play('boom');
      screenFlash('#ffffff', 1);
      fxRun(900, (c, k) => {
        let x = 0, y = 64;
        for (let i = 0; i < 12; i++) {
          const nx = (i + 1) * 17 * Math.min(1, k * 2), ny = 64 + ((i * 37) % 21) - 10;
          pxLine(c, x, y, nx, ny, '#1b1424', 3); pxLine(c, x, y, nx, ny, '#ffffff', 1);
          x = nx; y = ny;
        }
      });
      shake(9, 900);
      await wait(320); hit(0); await wait(560);
      break;
    }
    case 'smokeblow':
      Sfx.play('fire');
      await projectile(heroHand(), foeC(), 300, (c, x, y) => {
        pxCircle(c, x, y, 5, '#dfe2ea'); pxCircle(c, x - 1, y - 1, 3, '#ffffff');
        particles(x, y, 2, { colors: SMOKE, speed: 15, grav: -20, life: 0.4 });
      });
      hit(0);
      particles(foeC().x, foeC().y, 20, { colors: SMOKE, speed: 60, grav: -20, size: 3 });
      break;
    case 'smokebind': {
      Sfx.play('fire');
      const fc = foeC();
      fxRun(750, (c, k) => {
        for (let i = 0; i < 8; i++) {
          const a = G.t * 8 + i * 0.8;
          pxCircle(c, fc.x + Math.cos(a) * (18 - k * 6), fc.y + Math.sin(a) * (14 - k * 4), 3, i % 2 ? '#ffffff' : '#dfe2ea');
        }
      });
      await wait(550); hit(0); await wait(200);
      break;
    }
    case 'launcher':
      Sfx.play('fire');
      await projectile(heroHand(), foeC(), 360, (c, x, y) => {
        pxCircle(c, x, y, 8, '#b9bdc9'); pxCircle(c, x, y, 6, '#dfe2ea'); pxCircle(c, x - 2, y - 2, 3, '#ffffff');
        particles(x, y, 3, { colors: SMOKE, speed: 20, grav: -20, life: 0.4, size: 3 });
      });
      hit(0); shake(4, 300); Sfx.play('boom');
      particles(foeC().x, foeC().y, 30, { colors: SMOKE, speed: 90, grav: -10, size: 3 });
      break;
    case 'armament': {
      Sfx.play('haki');
      const hc = heroC();
      fxRun(700, (c, k) => {
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63 + k * 4, r = 26 * (1 - k);
          pxRect(c, hc.x + Math.cos(a) * r, hc.y + Math.sin(a) * r, 2, 2, i % 2 ? '#1b1424' : '#7a4ac0');
        }
      });
      await wait(720);
      break;
    }
    case 'conqueror': {
      Sfx.play('haki');
      screenFlash('#1b0010', 0.9);
      const hc = heroC();
      fxRun(900, (c, k) => {
        for (let i = 0; i < 10; i++) {
          let x = hc.x, y = hc.y;
          const a = i * 0.63;
          for (let s = 1; s < 6; s++) {
            const nx = hc.x + Math.cos(a + Math.sin(s * 3 + i) * 0.3) * s * 26 * k, ny = hc.y + Math.sin(a + Math.sin(s * 3 + i) * 0.3) * s * 20 * k;
            pxLine(c, x, y, nx, ny, s % 2 ? '#1b1424' : '#d8432f', 2);
            x = nx; y = ny;
          }
        }
      });
      shake(8, 800);
      await wait(900);
      break;
    }
    default:
      // A move without its own animation still lands every hit.
      await tween(Hr, { ox: 50 }, 140, easeIn);
      for (let i = 0; i < hits && F.hp > 0; i++) { hit(i); impact(foeC(), [color || '#ffffff', '#ffffff'], 8); await wait(120); }
      await tween(Hr, { ox: 0 }, 200);
  }
}

function slashAt(pos, color, angle, len) {
  Sfx.play('slash');
  const dx = Math.cos(angle) * len / 2, dy = Math.sin(angle) * len / 2;
  const x0 = pos.x - dx, y0 = pos.y - dy;
  fxRun(260, (c, k) => {
    if (k > 0.7 && Math.floor(k * 20) % 2) return;
    const e = easeOut(Math.min(1, k * 1.8));
    pxLine(c, x0, y0, x0 + dx * 2 * e, y0 + dy * 2 * e, color, 3);
    pxLine(c, x0, y0, x0 + dx * 2 * e, y0 + dy * 2 * e, '#ffffff', 1);
  });
}

async function fxSlash() {
  const fc = foeC();
  for (let i = 0; i < 3; i++) {
    Sfx.play('slash');
    const off = (i - 1) * 7;
    fxRun(220, (c, k) => {
      const e = easeOut(k);
      pxLine(c, fc.x - 16 + off, fc.y - 16, fc.x - 16 + off + 32 * e, fc.y - 16 + 32 * e, '#ffffff', 2);
    });
    await wait(90);
  }
  await wait(200);
}

function fxBolt(x, y, size) {
  Sfx.play('zap');
  const pts = [];
  let px = x + rand(-10, 10);
  for (let yy = 0; yy <= y; yy += 10) { pts.push([px, yy]); px = x + rand(-8, 8) * (1 - yy / y); }
  pts.push([x, y]);
  const w = Math.max(1, Math.round(2 * size));
  return fxRun(320, (c, k) => {
    if (k > 0.75 && Math.floor(k * 20) % 2) return;
    for (let i = 0; i < pts.length - 1; i++) {
      pxLine(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#ffe14a', w + 2);
      pxLine(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#ffffff', w);
    }
  });
}

async function fxFoeLunge(hit) {
  const F = G.battle.F;
  const dist = F.boss ? -52 : -60;
  await tween(F, { ox: dist }, 160, easeIn);
  hit();
  await tween(F, { ox: 0 }, 220);
}

// ---------- rendering ----------

function sceneName() {
  if (G.mode === 'sail') return 'sea';
  if (G.mode === 'fish') return 'deck';
  if (G.mode === 'battle' && G.battle) return G.battle.scene;
  if (G.mode === 'title' || !G.p) return 'village';
  return island().scene;
}

function heroSprite() {
  if (G.hero.form) return getSprite(DRAGON_FORM, G.hero.flash > 0 ? 'flash' : '');
  if (G.battle && G.battle.awake > 0 && fruit() && fruit().awaken) {
    const spec = heroSpec();
    return getSprite(Object.assign({}, spec, { pal: Object.assign({}, spec.pal, fruit().awaken.look) }), G.hero.flash > 0 ? 'flash' : '');
  }
  if (G.hero.flash > 0) return getSprite(heroSpec(), 'flash');
  if (G.battle && G.battle.armament > 0) return getSprite(heroSpec(), 'tint', '#2a1a3a');
  return getSprite(heroSpec());
}

function drawActors(list) {
  list.sort((a, b) => a.y - b.y);
  for (const a of list) drawSpriteAt(ctx, a.spr, a.x, a.y, a.scale, a);
}

function drawCrewWeapons(actors) {
  for (const a of actors) if (a.m && a.m.weapon) drawWeaponAt(ctx, a.x, a.y, a.scale, a.m.weapon, CREW[a.m.key].spr.kind === 'brute');
}

function drawTitle() {
  const bob = Math.round(Math.sin(G.t * 3) * 1.5);
  drawText(ctx, 'POCKET', W / 2, 12 + bob, { color: '#ffe14a', scale: 3, align: 'center' });
  drawText(ctx, 'PIRATE', W / 2, 32 - bob, { color: '#ff6a4a', scale: 3, align: 'center' });
  drawActors([{ spr: getSprite(PLAYER_SPR), x: 110, y: 121, scale: 2, squash: Math.sin(G.t * 4) * 0.03 }]);
  if (Math.floor(G.t * 1.5) % 4 === 0) drawBubble(ctx, 110, 84, 'AHOY!');
}

function drawPlaceLabel() {
  const a = G.mode === 'boat' ? 'Your ship' : G.indoors === 'bar' ? island().bar : G.indoors === 'shop' ? `${island().name} Shop` : island().name, b = `Day ${G.p.day}  ${timeName()}`;
  const w = Math.max(textWidth(a, 1), textWidth(b, 1)) + 6;
  ctx.globalAlpha = 0.5;
  pxRect(ctx, 2, 2, w, 15, '#05081a');
  ctx.globalAlpha = 1;
  drawText(ctx, a, 5, 4, { color: '#ffffff', shadow: null });
  drawText(ctx, b, 5, 10, { color: '#ffe14a', shadow: null });
  // treasures still hidden in this island's bushes and trash cans
  const left = G.mode === 'home' && !G.indoors ? lootCount(G.p.island).left : 0;
  if (left) {
    const t = `${left} LEFT`, tw = textWidth(t, 1) + 16;
    ctx.globalAlpha = 0.5;
    pxRect(ctx, canvas.width - tw - 2, 2, tw, 12, '#05081a');
    ctx.globalAlpha = 1;
    ctx.drawImage(getSprite({ kind: 'icon', icon: 'chest' }), canvas.width - tw, 3);
    drawText(ctx, t, canvas.width - tw + 12, 5, { color: '#ffe14a', shadow: null });
  }
}

function drawBattle() {
  const B = G.battle, F = B.F, p = G.p;
  const actors = (B.solo ? [] : p.crew).map((m, i) => {
    const [x, y] = BATTLE_CREW_SPOTS[i];
    return { spr: getSprite(crewSpec(m)), x, y: y + Math.round(Math.sin(G.t * 4 + i) * 0.6), scale: 1, m };
  });
  if (B.awake > 0 && fruit() && Math.random() < 0.7) {
    particles(G.hero.x + G.hero.ox + rand(-10, 10), 118, 1, { colors: [fruit().color, fruit().color2, '#ffffff'], speed: 30, grav: -70, dir: -Math.PI / 2, spread: 0.6, life: 0.7 });
  }
  actors.push({ spr: heroSprite(), x: G.hero.x + G.hero.ox, y: 121 + G.hero.oy, scale: 2, squash: G.hero.squash + Math.sin(G.t * 5) * 0.02, alpha: G.hero.alpha, flip: !!G.hero.form });
  drawActors(actors);
  drawCrewWeapons(actors);
  if (G.hero.alpha > 0.5 && !G.hero.form && !G.hero.swing) drawHeldWeapon(ctx, G.hero.x + G.hero.ox, 121 + G.hero.oy, 2);

  // foe
  const lift = foeLift();
  if (F.info.birdcage && F.alpha > 0) {
    ctx.globalAlpha = 0.35;
    const r = Math.max(20, 120 - (B.cage || 0) * 9);
    for (let i = 0; i < 14; i++) pxLine(ctx, 100, -10, 100 + (i - 6.5) * r / 6.5, 124, '#ffffff', 1);
    ctx.globalAlpha = 1;
  }
  if (F.info.logia === 'smoke' && F.alpha > 0) {
    for (let i = 0; i < 4; i++) {
      const k = (G.t * 0.7 + i / 4) % 1;
      ctx.globalAlpha = 0.8 * (1 - k);
      pxCircle(ctx, F.x + F.ox - 4 + Math.sin(k * 5 + i) * 4, foeTop() + 14 - k * 22, 1 + k * 4, '#dfe2ea');
    }
    ctx.globalAlpha = 1;
  }
  if (F.info.drums && F.alpha > 0) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + i * Math.PI / 5;
      const dx = F.x + F.ox + Math.cos(a) * 30, dy = F.y - 34 + Math.sin(a) * 24;
      pxCircle(ctx, dx, dy, 5, PAL.k); pxCircle(ctx, dx, dy, 4, '#f08a3a'); pxCircle(ctx, dx, dy, 2, '#ffd04a');
    }
  }
  let spr = getSprite(F.spr);
  if (F.flash > 0) spr = getSprite(F.spr, 'flash');
  else if (F.freeze > 0) spr = getSprite(F.spr, 'tint', '#7fe8ff');
  else if (F.solid > 0) spr = getSprite(F.spr, 'tint', '#2f6fd0');
  else if (F.tekkai) spr = getSprite(F.spr, 'tint', '#9aa4b1');
  else if (F.phase === 2 && !F.info.phase2) spr = getSprite(F.spr, 'tint', '#ff2020');
  if (lift) { ctx.globalAlpha = 0.25; pxRect(ctx, F.x + F.ox - 10, F.y - 1, 20, 2, '#000000'); ctx.globalAlpha = 1; }
  drawSpriteAt(ctx, spr, F.x + F.ox, F.y + F.oy - lift, F.scale, { squash: F.squash + Math.sin(G.t * 4) * 0.02, alpha: F.alpha, shadow: !lift });
  if (F.charging && F.hp > 0) {
    if (Math.random() < 0.5) {
      const c = foeC(), a = Math.random() * Math.PI * 2;
      FX.parts.push({ x: c.x + Math.cos(a) * 26, y: c.y + Math.sin(a) * 26, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, grav: 0, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#ff4a3a' : '#ffd04a', size: 2 });
    }
    if (Math.floor(G.t * 4) % 2) drawText(ctx, '!!', F.x + F.ox, foeTop() - 12, { color: '#ff4a3a', scale: 2, align: 'center' });
  }

  // foe HUD
  const nameCol = F.boss ? '#ffd04a' : '#ffffff';
  drawText(ctx, `${F.name} LV${F.lvl}`, 4, 4, { color: nameCol });
  const tags = [];
  if (F.freeze) tags.push(['ICE', '#7fe8ff']);
  if (F.burn) tags.push(['BURN', '#ff9a3a']);
  if (F.solid) tags.push(['WET', '#7cb0ff']);
  if (F.weak) tags.push(['WEAK', '#c48ae8']);
  if (F.stun) tags.push(['STUN', '#ffe14a']);
  if (F.phase === 2) tags.push(['RAGE', '#ff4a3a']);
  if (B.armament) tags.push(['HAKI', '#b38aff']);
  let tx = 188;
  for (const [t, col] of tags.reverse()) { drawText(ctx, t, tx, 4, { color: col, align: 'right' }); tx -= textWidth(t, 1) + 6; }
  const frac = F.hp / F.maxHp;
  drawBar(ctx, 4, 12, 184, 3, frac, frac > 0.5 ? '#5ad65a' : frac > 0.2 ? '#f2c230' : '#e0483a');
}

function drawTrain() {
  const T = G.train, Hr = G.hero;
  const x = 96, y = 121;
  const spr = getSprite(heroSpec());
  let squash = 0, oy = 0, ox = 0;
  if (T.anim === 'lift') {
    squash = -T.pose * 0.08 + 0.04;
    const by = 80 - T.pose * 8;
    pxLine(ctx, x - 20, by, x + 20, by, '#5a5a6a', 2);
    for (const s of [-1, 1]) { pxRect(ctx, x + s * 20 - 3, by - 6, 6, 12, PAL.k); pxRect(ctx, x + s * 20 - 2, by - 5, 4, 10, '#9aa4b1'); }
  } else if (T.anim === 'boulder') {
    squash = 0.1 - T.pose * 0.1;
    const jx = Math.round(Math.sin(G.t * 40) * (T.active ? 1 : 0));
    const by = 74 - T.pose * 8;
    pxCircle(ctx, x + jx, by, 12, PAL.k);
    pxCircle(ctx, x + jx, by, 11, '#8a8478');
    pxCircle(ctx, x + jx - 4, by - 4, 4, '#aaa498');
    pxRect(ctx, x + jx + 3, by + 2, 4, 1, '#5a5448');
  } else if (T.anim === 'run') {
    oy = -(Math.floor(G.t * 14) % 2) * 2;
    ox = T.pose * 20;
    for (let i = 0; i < 4; i++) pxRect(ctx, x - 40 - ((G.t * 120 + i * 30) % 60), 92 + i * 7, 10, 1, '#ffffff');
  } else if (T.anim === 'drill') {
    ox = T.pose * 14;
    const wob = Math.round(T.pose * 4);
    pxRect(ctx, 133, 98, 3, 23, '#6a4422');
    pxRect(ctx, 127 + wob, 90, 15, 17, PAL.k);
    pxRect(ctx, 128 + wob, 91, 13, 15, '#c9a26a');
    pxRect(ctx, 128 + wob, 98, 13, 1, '#8a6a3a');
    pxCircle(ctx, 134 + wob, 86, 4, PAL.k);
    pxCircle(ctx, 134 + wob, 86, 3, '#c9a26a');
    if (T.pose > 0.55) { pxLine(ctx, 120, 86, 146, 110, '#ffffff', 2); particles(130, 98, 1, { colors: ['#e8d9b0'], speed: 40, life: 0.3 }); }
  } else if (T.anim === 'fruit') {
    const f = fruit();
    const r = 12 + Math.sin(G.t * 5) * 2 + T.pose * 14;
    pxRing(ctx, x, 104, r, f.color, 2);
    pxRing(ctx, x, 104, r * 0.6, f.color2, 1);
    if (Math.random() < 0.3) particles(x + rand(-14, 14), 116, 1, { colors: [f.color, f.color2], speed: 20, grav: -40, life: 0.6 });
  } else {
    squash = 0.22;
    const r = 14 + Math.sin(G.t * 4) * 2 + T.pose * 12;
    pxRing(ctx, x, 104, r, '#b38aff', 1);
    pxRing(ctx, x, 104, r * 0.7, '#7a4ac0', 1);
  }
  drawSpriteAt(ctx, spr, x + ox + Hr.ox, y + oy, 2, { squash });
  if (T.anim === 'drill') drawHeldWeapon(ctx, x + ox + Hr.ox, y + oy, 2);

  // timing bar panel
  pxRect(ctx, 22, 4, 148, 34, PAL.k);
  pxRect(ctx, 23, 5, 146, 32, '#22305a');
  drawText(ctx, `${TRAININGS[T.k].name}`, 28, 9, { color: '#ffe14a', shadow: null });
  drawText(ctx, `REP ${Math.min(T.rep + 1, T.reps)}/${T.reps}`, 164, 9, { color: '#ffffff', shadow: null, align: 'right' });
  const bx = 30, bw = 132, by = 20;
  pxRect(ctx, bx - 1, by - 1, bw + 2, 10, PAL.k);
  pxRect(ctx, bx, by, bw, 8, '#4a3a5a');
  pxRect(ctx, bx + (T.zone - T.zoneW / 2) * bw, by, T.zoneW * bw, 8, '#e3b04b');
  pxRect(ctx, bx + (T.zone - T.zoneW * 0.18) * bw, by, Math.max(2, T.zoneW * 0.36 * bw), 8, '#7cff7a');
  const cx = bx + T.cur * bw;
  pxRect(ctx, cx - 2, by - 3, 4, 14, PAL.k);
  pxRect(ctx, cx - 1, by - 2, 2, 12, '#ffffff');
  T.results.forEach((r, i) => pxRect(ctx, 30 + i * 8, 31, 5, 3, r === 'perfect' ? '#7cff7a' : r === 'good' ? '#e3b04b' : '#e0483a'));
}

function drawFish() {
  const F = G.fish;
  const hx = 150, hy = 121;
  drawSpriteAt(ctx, getSprite(heroSpec()), hx, hy, 2, { squash: Math.sin(G.t * 3) * 0.02 });
  const tip = { x: 120, y: 74 };
  pxLine(ctx, hx - 10, 104, tip.x, tip.y, '#7a4a24', 2);
  const bite = F.state === 'bite';
  const bx = 64, by = 92 + Math.round(Math.sin(G.t * 3)) + (bite ? 3 + Math.round(Math.sin(G.t * 40)) : 0);
  for (let i = 0; i <= 24; i++) {
    const k = i / 24;
    pxRect(ctx, tip.x + (bx - tip.x) * k, tip.y + (by - tip.y) * k + Math.sin(k * Math.PI) * 7, 1, 1, '#e8e8f0');
  }
  pxRect(ctx, bx - 1, by - 3, 3, 2, '#e0483a');
  pxRect(ctx, bx - 1, by - 1, 3, 2, '#ffffff');
  if (bite) {
    pxRing(ctx, bx, by + 1, 4 + (G.t * 12) % 6, '#ffffff');
    drawBubble(ctx, hx, 82, '!!');
  }
  if (F.flying) {
    const k = F.flying.t;
    const ix = bx + (hx - bx) * k, iy = by - Math.sin(k * Math.PI) * 40 + (70 - by) * k;
    drawSpriteAt(ctx, getSprite(F.flying.spec), ix, iy, 2, { shadow: false });
  }
  drawText(ctx, `CAST ${Math.min(F.cast + 1, F.casts)}/${F.casts}`, 4, 4, { color: '#ffffff' });
}

// Hero and crew peeking over the rail of the small ship.
function drawCrewAboard(c, x, deckY) {
  const people = [heroSprite()].concat(G.p.crew.map(m => getSprite(crewSpec(m))));
  const spots = [30, 18, 38, 10, 44, 4];
  people.forEach((spr, i) => drawSpriteAt(c, spr, x + spots[i], deckY + 2 + Math.round(Math.sin(G.t * 5 + i) * 0.5), 1, { shadow: false }));
}

function drawSail() {
  const S = G.sail;
  const bob = Math.round(Math.sin(G.t * 4));
  drawShip(ctx, S.x, 110 + bob, Object.assign(shipLook(), { t: G.t, onDeck: (c, dy) => drawCrewAboard(c, S.x, dy) }));
  if (Math.random() < 0.6) particles(S.x + 50, 108, 1, { colors: ['#ffffff', '#bfe6ff'], speed: 30, grav: 80, dir: -2.4, spread: 0.8, life: 0.5 });
  drawText(ctx, `TO ${ISLANDS[S.dest].name}`, W / 2, 6, { color: '#ffffff', align: 'center' });
}

function drawDiveCut() {
  const look = Object.assign(shipLook(), { t: G.t });
  if (!G.shipCv) G.shipCv = makeCanvas(76, 64);
  const sc = G.shipCv, c = sc.getContext('2d');
  c.clearRect(0, 0, sc.width, sc.height);
  drawShip(c, 6, 60, Object.assign(look, { onDeck: (cc, dy) => drawCrewAboard(cc, 6, dy) }));
  drawDive(ctx, G.cut ? G.cut.k : 1, G.t, sc);
}

function drawMountainCut() {
  const look = Object.assign(shipLook(), { t: G.t });
  if (!G.shipCv) G.shipCv = makeCanvas(76, 64);
  const sc = G.shipCv, c = sc.getContext('2d');
  c.clearRect(0, 0, sc.width, sc.height);
  drawShip(c, 6, 60, Object.assign(look, { onDeck: (cc, dy) => drawCrewAboard(cc, 6, dy) }));
  drawReverseMountain(ctx, G.cut ? G.cut.k : 1, G.t, sc);
}

// Walking around renders at 288x192 (finer pixels, more of the island on screen); everything else at 192x128.
function setScreen(w, h) {
  if (canvas.width === w) return;
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
}

function draw() {
  const world = (G.mode === 'home' || G.mode === 'boat') && G.p && OW.map;
  setScreen(world ? VW : W, world ? VH : H);
  const SW = canvas.width, SH = canvas.height;
  pxRect(ctx, 0, 0, SW, SH, '#05081a');
  ctx.save();
  if (FX.shakeMag > 0) ctx.translate(Math.round(rand(-1, 1) * FX.shakeMag), Math.round(rand(-1, 1) * FX.shakeMag));
  if (world) {
    drawWorld();
  } else {
    const ti = G.mode === 'title' ? 0 : timeIdx();
    const scene = sceneName();
    ctx.drawImage(backdrop(scene, ti), 0, 0);
    drawAnimated(ctx, scene, ti, G.t, G.mode === 'sail' ? 5 : 1);
    const docked = G.mode === 'title' ? { t: G.t } : G.p ? Object.assign(shipLook(), { t: G.t }) : null;
    if (docked && G.p && G.mode !== 'title') docked.bubble = island().scene === 'fishman';
    if (scene !== 'sea' && scene !== 'deck' && G.mode !== 'mountain' && G.mode !== 'dive') drawShip(ctx, -8, GROUND - 2 + Math.round(Math.sin(G.t * 1.5)), docked);
    if (G.mode === 'mountain') drawMountainCut();
    else if (G.mode === 'dive') drawDiveCut();
    else if (G.mode === 'title') drawTitle();
    else if (G.mode === 'battle' && G.battle) drawBattle();
    else if (G.mode === 'train' && G.train) drawTrain();
    else if (G.mode === 'fish' && G.fish) drawFish();
    else if (G.mode === 'sail' && G.sail) drawSail();
  }
  drawFx(ctx);
  ctx.restore();
  if (world) drawPlaceLabel();
  if (FX.flashA > 0) { ctx.globalAlpha = Math.min(1, FX.flashA); pxRect(ctx, 0, 0, SW, SH, FX.flashColor); ctx.globalAlpha = 1; }
  if (G.fade > 0) {
    ctx.globalAlpha = G.fade;
    pxRect(ctx, 0, 0, SW, SH, '#05081a');
    ctx.globalAlpha = 1;
    if (G.fade > 0.6 && G.sleeping) drawText(ctx, 'Z Z Z', SW / 2, SH / 2 - 5, { color: '#9aa8d8', scale: 2, align: 'center' });
  }
}

// ---------- update loop ----------

let idleBubbleAt = 4;

function update(dt) {
  G.t += dt;
  updateFx(dt);
  const Hr = G.hero;
  Hr.flash = Math.max(0, Hr.flash - dt);
  if (G.battle) G.battle.F.flash = Math.max(0, G.battle.F.flash - dt);

  if ((G.mode === 'home' || G.mode === 'boat') && G.p) {
    owUpdate(dt);
    if (!G.busy && G.t > idleBubbleAt) {
      idleBubbleAt = G.t + rand(6, 10);
      const p = G.p;
      const line = isLate() ? 'ZZZ...' : p.food < 25 ? 'HUNGRY..' : p.energy < 20 ? 'SLEEPY..' : p.hp < p.maxHp * 0.3 ? 'OUCH..' : p.mood >= 85 ? 'SHISHI!' : null;
      if (line) bubble(line);
    }
  }
  const T = G.train;
  if (G.mode === 'train' && T) {
    if (T.active) {
      T.cur += T.dir * T.speed * dt;
      if (T.cur > 1) { T.cur = 1; T.dir = -1; }
      if (T.cur < 0) { T.cur = 0; T.dir = 1; }
    }
    T.pose = Math.max(0, T.pose - dt * 2.5);
    if (T.anim === 'run') {
      T.dust -= dt;
      if (T.dust <= 0) { T.dust = 0.12; particles(88, 119, 2, { colors: ['#e8d9b0', '#c9b88a'], speed: 30, grav: -10, dir: Math.PI, spread: 0.8, life: 0.4 }); }
    }
  }
  const F = G.fish;
  if (G.mode === 'fish' && F) {
    if (F.flying) F.flying.t = Math.min(1, F.flying.t + dt * 1.2);
    if (F.state === 'wait') {
      F.timer -= dt;
      if (F.timer <= 0) { F.state = 'bite'; F.win = Math.max(0.45, 0.95 - G.p.island * 0.08); Sfx.play('bite'); }
    } else if (F.state === 'bite') {
      F.win -= dt;
      if (F.win <= 0) castResult(null, 'Too slow! The fish stole your bait.');
    }
  }
}

let last = performance.now(), hudAt = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    update(dt);
    draw();
    if (now - hudAt > 120) { hudAt = now; updateHud(); }
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

// ---------- input ----------

function onCanvasTap(e) {
  Sfx.unlock();
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * canvas.width / r.width;
  const y = (e.clientY - r.top) * canvas.height / r.height;
  if (G.mode === 'train') { trainStrike(); return; }
  if (G.mode === 'fish') { reel(); return; }
  if ((G.mode === 'home' || G.mode === 'boat') && OW.map) {
    if (G.busy) onMsgTap();
    else if ($('modal').hidden) owTap(x, y);
    return;
  }
  if (G.busy) onMsgTap();
}

const KEY_DIRS = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const walking = () => (G.mode === 'home' || G.mode === 'boat') && $('modal').hidden && !$('egg');

function onKeyUp(e) {
  const d = KEY_DIRS[e.key.toLowerCase()];
  if (d) OW.keys = OW.keys.filter(k => k !== d);
  if (e.key === 'Shift' || e.key.toLowerCase() === 'x') OW.run = false;
}

function onKey(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'Escape' && $('egg')) { closeEgg(); return; }
  if (e.key === 'Escape' && !$('modal').hidden && !$('modalClose').hidden) { closeModal(); return; }
  if (walking() && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const d = KEY_DIRS[e.key.toLowerCase()];
    if (d) { e.preventDefault(); if (!OW.keys.includes(d)) OW.keys.push(d); OW.pending = d; return; }
    if (e.key === 'Shift' || e.key.toLowerCase() === 'x') { OW.run = true; return; }
    // Enter on a focused menu button presses that button; otherwise Space, Enter and Z are the A button.
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON' && !document.activeElement.closest('.pad');
    if (e.code === 'Space' || e.key.toLowerCase() === 'z' || (e.key === 'Enter' && !onButton)) {
      e.preventDefault();
      if (!e.repeat) owPressA();
      return;
    }
  }
  if (e.code === 'Space' || e.key === 'Enter') {
    if (G.mode === 'train') { e.preventDefault(); trainStrike(); }
    else if (G.mode === 'fish') { e.preventDefault(); reel(); }
    else if (e.code === 'Space' && document.activeElement === document.body) { e.preventDefault(); onMsgTap(); }
  }
}

const SPEAKER = '<rect x="1" y="4" width="3" height="4"/><rect x="4" y="3" width="1" height="6"/><rect x="5" y="2" width="1" height="8"/><rect x="6" y="1" width="1" height="10"/>';
const WAVES = '<rect x="8" y="4" width="1" height="4"/><rect x="10" y="2" width="1" height="8"/>';
const MUTED = '<rect x="8" y="4" width="1" height="1"/><rect x="9" y="5" width="1" height="2"/><rect x="10" y="4" width="1" height="1"/><rect x="8" y="7" width="1" height="1"/><rect x="10" y="7" width="1" height="1"/>';

function updateMuteLabel() {
  const b = $('muteBtn');
  b.innerHTML = `<svg viewBox="0 0 12 12" width="18" height="18" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${SPEAKER}${Sfx.muted ? MUTED : WAVES}</svg>`;
  b.setAttribute('aria-pressed', Sfx.muted ? 'false' : 'true');
  b.title = Sfx.muted ? 'Sound off' : 'Sound on';
}

function boot(data) {
  canvas.addEventListener('pointerdown', onCanvasTap);
  $('msg').addEventListener('click', onMsgTap);
  $('msg').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMsgTap(); } });
  $('modalClose').addEventListener('click', () => { Sfx.play('select'); closeModal(); });
  $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal') && !$('modalClose').hidden) closeModal(); });
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { OW.keys = []; OW.held = null; OW.pending = null; OW.run = false; });
  $('muteBtn').addEventListener('click', () => { Sfx.toggle(); updateMuteLabel(); Sfx.play('select'); });
  updateMuteLabel();

  const hotSave = data && data.save ? restore(data.save) : null;
  G.saved = hotSave || loadSave();
  if (hotSave && data.inGame) {
    G.p = hotSave;
    enterGame(true);
  } else {
    showTitle();
  }
  requestAnimationFrame(t => { last = t; frame(t); });
}

try {
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
    window.claude.hot.snapshot(() => ({ save: G.p ? JSON.parse(JSON.stringify(G.p)) : null, inGame: G.mode !== 'title' && !!G.p }));
  }
} catch (e) { /* hot reload hook unavailable */ }

if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
