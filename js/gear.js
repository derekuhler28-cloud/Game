'use strict';
/* Gear and growth: weapons, devil fruits, move mastery, and exploring islands for loot. */

const STAT_KEYS = ['atk', 'def', 'spd', 'haki'];
// The clothes your pirate wears the whole game: plain shirt, rope belt, worn trousers.
const PLAYER_PAL = { v: '#cfc6b0', y: '#7a5a3a', b: '#7a6a52' };

const weapon = () => (G.p && G.p.weapon ? WEAPONS[G.p.weapon] : null);
const styleKey = () => G.p.weapon || 'fists';
const mastery = key => Math.floor(G.p.mastery[key] || 0);
const effAtk = () => G.p.atk + (weapon() ? weapon().atk : 0) + wearBonus('atk');
const race = () => RACES[G.p.race] || RACES.human;

// How each race changes the player sprite: palette swaps plus small overlays (see OVERLAYS).
const RACE_LOOKS = {
  human: {},
  mink: { pal: { s: '#e0b070', S: '#b8864a' }, marks: ['minkEars'] },
  skypian: { marks: ['wings'] },
  fishman: { pal: { s: '#7ab4d0', S: '#5a94b0', x: '#3f6f9a' }, marks: ['fin'] },
};
const RACE_SPECS = new Map();
function raceSpec(r) {
  const key = r;
  if (!RACE_SPECS.has(key)) {
    const look = RACE_LOOKS[r] || {};
    const spec = { kind: 'player', pal: Object.assign({}, PLAYER_PAL, look.pal) };
    if (look.marks) spec.marks = look.marks.slice();
    RACE_SPECS.set(key, spec);
  }
  return RACE_SPECS.get(key);
}
const DRAGON_SPECS = new Map();
const HERO_SPECS = new Map();
// Your look: your race, the clothes you chose to wear, and dragon features for good once you eat the Dragon-Dragon Fruit.
function heroSpec(wear) {
  if (!G.p) return PLAYER_SPR;
  const w = wear || G.p.wear || {};
  const key = [G.p.race, G.p.fruit === 'dragon'].concat(SLOTS.map(sl => w[sl] || '')).join('|');
  if (!HERO_SPECS.has(key)) {
    let spec = dressSpec(raceSpec(G.p.race || 'human'), w);
    if (G.p.fruit === 'dragon') spec = dragonSpec(spec);
    HERO_SPECS.set(key, spec);
  }
  return HERO_SPECS.get(key);
}
function dressSpec(spec, w) {
  const pieces = SLOTS.map(sl => CLOTHES[w[sl]]).filter(Boolean);
  if (!pieces.length) return spec;
  const out = { kind: spec.kind, pal: Object.assign({}, spec.pal), marks: (spec.marks || []).slice() };
  for (const c of pieces) {
    const L = c.look || {};
    if (L.head) out.head = L.head;
    Object.assign(out.pal, L.pal || {});
    if (L.marks) out.marks.push(...L.marks);
  }
  if (!out.marks.length) delete out.marks;
  return out;
}

// ---------- clothes ----------

const SLOTS = ['hat', 'coat', 'charm'];
const SLOT_NAMES = { hat: 'Hat', coat: 'Coat', charm: 'Charm' };
const worn = () => (G.p && G.p.wear ? SLOTS.map(sl => CLOTHES[G.p.wear[sl]]).filter(Boolean) : []);
const wearBonus = k => worn().reduce((a, c) => a + (c[k] || 0), 0);
const pct = v => Math.round(v * 100) + '%';
const bossWear = key => Object.keys(CLOTHES).find(k => CLOTHES[k].boss === key) || null;
const islandClothes = idx => Object.keys(CLOTHES).filter(k => CLOTHES[k].find === idx);
const unfoundClothes = idx => islandClothes(idx).filter(k => !G.p.clothes.includes(k));

function clothStats(c) {
  const out = [];
  for (const [k, label] of [['atk', 'ATK'], ['def', 'DEF'], ['spd', 'SPD'], ['hp', 'max HP']]) if (c[k]) out.push(`+${c[k]} ${label}`);
  if (c.crit) out.push(`+${pct(c.crit)} crit chance`);
  if (c.dodge) out.push(`+${pct(c.dodge)} dodge`);
  if (c.armor) out.push(`${pct(c.armor)} less damage taken`);
  if (c.sp) out.push(`+${c.sp} SP every turn`);
  if (c.xp) out.push(`+${pct(c.xp)} XP`);
  if (c.berries) out.push(`+${pct(c.berries)} berries from fights`);
  if (c.mastery) out.push(`+${pct(c.mastery)} mastery`);
  if (c.hunger) out.push(`get hungry ${pct(c.hunger)} slower`);
  return out.join(', ');
}

function clothSource(k) {
  const c = CLOTHES[k];
  if (c.boss) return `Dropped by ${BOSSES[c.boss].name}`;
  if (c.shop !== undefined) return `Sold in ${ISLANDS[c.shop].name}`;
  return `Hidden on ${ISLANDS[c.find].name}`;
}

// A little icon of the piece itself (for the loot pop-up and the shop).
function clothIcon(k) {
  const c = CLOTHES[k], pal = (c.look && c.look.pal) || {};
  if (c.slot === 'hat') return { kind: 'hathead', head: c.look.head, pal: { x: pal.x || '#e6b422', X: pal.X || '#f2f2f2' } };
  if (c.slot === 'coat') { const v = pal.v || pal.z; return { kind: 'icon', icon: 'coat', pal: { v, z: pal.z || mixColor(v, '#1b1424', 0.3) } }; }
  return { kind: 'icon', icon: 'charm', pal: { q: pal.q || '#e6b422', Q: pal.Q || '#5ab8e8' } };
}

function putOn(k) {
  const p = G.p, c = CLOTHES[k];
  const holder = clothHolder(k);
  if (holder && holder !== 'you') holder.wear[c.slot] = null;
  takeOff(c.slot);
  p.wear[c.slot] = k;
  if (c.hp) { p.maxHp += c.hp; p.hp += c.hp; }
}

function takeOff(slot) {
  const p = G.p, c = CLOTHES[p.wear[slot]];
  p.wear[slot] = null;
  if (c && c.hp) { p.maxHp -= c.hp; p.hp = clamp(p.hp, 1, p.maxHp); }
}

// ---------- clothes on crewmates ----------
// Crewmates never get hit, so on them a piece turns into attack power (ATK, half of DEF and SPD, a tenth of HP,
// plus SP, armor and dodge), crit chance, and a better chance to jump into normal fights (SPD and dodge).
// Team perks (XP, berries, mastery, slower hunger) still help you, at half strength.

const crewWorn = m => (m.wear ? SLOTS.map(sl => CLOTHES[m.wear[sl]]).filter(Boolean) : []);
const crewPower = c => (c.atk || 0) + Math.round(((c.def || 0) + (c.spd || 0)) / 2 + (c.hp || 0) / 10 + (c.sp || 0) + ((c.armor || 0) + (c.dodge || 0)) * 40);
const crewWearPower = m => crewWorn(m).reduce((a, c) => a + crewPower(c), 0);
const crewWearCrit = m => crewWorn(m).reduce((a, c) => a + (c.crit || 0), 0);
const crewJoin = m => Math.min(0.6, 0.35 + crewWorn(m).reduce((a, c) => a + (c.spd || 0) * 0.015 + (c.dodge || 0), 0));
const teamBonus = k => wearBonus(k) + 0.5 * G.p.crew.reduce((a, m) => a + crewWorn(m).reduce((b, c) => b + (c[k] || 0), 0), 0);

// Who has piece k on: 'you', a crewmate, or nobody.
function clothHolder(k) {
  const p = G.p;
  if (SLOTS.some(sl => p.wear[sl] === k)) return 'you';
  return p.crew.find(m => m.wear && SLOTS.some(sl => m.wear[sl] === k)) || null;
}

function crewClothStats(c) {
  const out = [], power = crewPower(c);
  if (power) out.push(`+${power} power`);
  if (c.crit) out.push(`+${pct(c.crit)} crit`);
  if (c.spd || c.dodge) out.push('joins more fights');
  for (const [k, label] of [['xp', 'XP'], ['berries', 'berries'], ['mastery', 'mastery']]) if (c[k]) out.push(`+${pct(c[k] / 2)} ${label} for you`);
  if (c.hunger) out.push(`you get hungry ${pct(c.hunger / 2)} slower`);
  return out.join(', ') || 'Looks sharp';
}

// A crewmate's sprite in their clothes. Regular builds wear everything; big brutes keep their own heads
// and only show their coat's colors.
const CREW_MARK = { furCollar: 'furCollarCrew', scarf: 'scarfCrew' };
function dressCrew(spec, w) {
  const pieces = SLOTS.map(sl => CLOTHES[w[sl]]).filter(Boolean);
  if (!pieces.length) return spec;
  const human = spec.kind === 'human';
  const out = Object.assign({}, spec, { pal: Object.assign({}, spec.pal), marks: (spec.marks || []).slice() });
  for (const c of pieces) {
    const L = c.look || {}, pal = L.pal || {};
    if (c.slot === 'hat') {
      if (human && L.head) { out.head = L.head; delete out.pal.x; delete out.pal.X; Object.assign(out.pal, pal); }
      continue;
    }
    if (pal.v) Object.assign(out.pal, { c: pal.v, v: pal.v, C: pal.z || mixColor(pal.v, '#1b1424', 0.2) });
    for (const ch of ['z', 'q', 'Q']) if (pal[ch]) out.pal[ch] = pal[ch];
    if (human && L.marks) out.marks.push(...L.marks.map(mk => CREW_MARK[mk] || mk));
  }
  if (!out.marks.length) delete out.marks;
  return out;
}

async function findClothes(k, from) {
  const p = G.p, c = CLOTHES[k];
  if (p.clothes.includes(k)) return;
  p.clothes.push(k);
  showLoot(clothIcon(k));
  Sfx.play('find');
  await talk(from ? `${from} dropped the ${c.name}! ${clothStats(c)}.` : `Clothes! You found the ${c.name}. ${clothStats(c)}.`);
  await talk(`Open Gear to put it on${p.wear[c.slot] ? ` instead of your ${CLOTHES[p.wear[c.slot]].name}` : ''}.`);
}
function dragonSpec(spec) {
  if (!DRAGON_SPECS.has(spec)) {
    DRAGON_SPECS.set(spec, Object.assign({}, spec, {
      marks: (spec.marks || []).concat('dragonHorns', 'dragonBody'),
      pal: Object.assign({}, spec.pal, { a: '#f2e6c8' }),
    }));
  }
  return DRAGON_SPECS.get(spec);
}
const weaponSpec = k => (WEAPONS[k].shape ? { kind: 'weapon', shape: WEAPONS[k].shape, pal: WEAPONS[k].pal || {} } : { kind: 'icon', icon: 'wraps' });
const weaponURL = k => (k === 'fists' ? iconURL('wraps', { w: '#f3c08c', s: '#c98a5a' }) : spriteURL(weaponSpec(k), 3));
const fruitSpec = k => ({ kind: 'icon', icon: 'fruit', pal: { c: FRUITS[k].color, C: FRUITS[k].color2 } });
const shortWeapon = () => (weapon() ? weapon().name.split(' ').pop() : 'Fists');

function styleName(key) {
  if (key === 'fists') return 'Brawling';
  if (key === 'race') return `${race().name} move`;
  return WEAPONS[key] ? WEAPONS[key].name : FRUITS[key].name;
}

function styleMoves(key) {
  if (key === 'fists') return FIST_MOVES;
  if (key === 'race') return race().move ? [race().move] : [];
  return WEAPONS[key] ? WEAPONS[key].moves : FRUITS[key].moves;
}

function rankOf(key) {
  const n = mastery(key), moves = styleMoves(key);
  if (n >= moves[2].at) return 'Master';
  if (n >= moves[1].at) return 'Adept';
  return n >= moves[0].at ? 'Novice' : 'Beginner';
}

// Adds mastery (humans learn 25% faster) and returns the moves that just unlocked.
function gainMastery(key, n) {
  if (!key || key === 'race' || n <= 0) return [];
  const p = G.p;
  const raw = p.mastery[key] || 0;
  p.mastery[key] = Math.round((raw + n * (p.race === 'human' ? 1.25 : 1) * (1 + teamBonus('mastery'))) * 100) / 100;
  const before = Math.floor(raw), after = mastery(key);
  return styleMoves(key).filter(m => before < m.at && after >= m.at).map(move => ({ move, key }));
}

async function announceUnlocks(list) {
  for (const u of list) {
    Sfx.play('level');
    screenFlash('#fff6a0', 0.35);
    floatText(G.hero.x + G.hero.ox, 64, 'NEW MOVE!', '#ffe14a', 2);
    await talk(`NEW MOVE UNLOCKED: ${u.move.name}! (${styleName(u.key)})`);
  }
}

// ---------- drawing ----------

// Draws weapon `key` in the right hand of a sprite standing at (x, y). Brutes have wider arms.
function drawWeaponAt(c, x, y, scale, key, brute) {
  const w = key && WEAPONS[key];
  if (!w || !w.shape) return;
  const sh = WEAPON_SHAPES[w.shape];
  const spr = getSprite(weaponSpec(key));
  const hx = x + (brute ? 6.5 : 4.5) * scale, hy = y - 5.5 * scale;
  c.drawImage(spr, Math.round(hx - (sh.grip[0] + 1) * scale), Math.round(hy - (sh.grip[1] + 1) * scale), spr.width * scale, spr.height * scale);
}

function drawHeldWeapon(c, x, y, scale) {
  drawWeaponAt(c, x, y, scale, G.p.weapon);
}

// Which crewmate (if any) is holding weapon `key`.
const holderOf = key => G.p.crew.find(m => m.weapon === key);
// Blade weapons and slashing moves; Buggy splits apart when they hit him.
const BLADES = ['sword', 'curved', 'saw', 'axe', 'hook', 'claws', 'cleaver', 'scissors', 'dagger', 'bisento', 'nodachi', 'bicorne'];
// Blade moves (Buggy splits away from them) and shots (Wapol swallows them); lists live in moves.js.
function isSlash(fx, key) {
  if (!SLASH_MOVES.includes(fx) || key === 'fists' || key === 'race') return false;
  const w = WEAPONS[key];
  return !w || BLADES.includes(w.shape);
}
const isShot = fx => SHOT_MOVES.includes(fx);

function showLoot(spec) {
  G.loot = { spec, t: G.t };
}

// The thing you just found floats up over your head.
function drawLoot(c, x, top) {
  const L = G.loot;
  if (!L) return;
  const k = G.t - L.t;
  if (k > 2.6) { G.loot = null; return; }
  const y = top - Math.min(1, k * 3) * 8 + Math.sin(G.t * 4) * 1.5;
  drawSpriteAt(c, getSprite(L.spec), x, y, L.spec.kind === 'icon' || L.spec.kind === 'hathead' ? 2 : 1, { shadow: false });
  if (Math.floor(G.t * 8) % 2) {
    for (const [dx, dy] of [[-14, -16], [13, -22], [-10, -4], [12, -6]]) {
      pxRect(c, x + dx, y + dy - 1, 1, 3, '#fff6a0');
      pxRect(c, x + dx - 1, y + dy, 3, 1, '#fff6a0');
    }
  }
}

// ---------- island secrets ----------

function islandFruits(idx) {
  return G.p.fruitMap[idx] || [];
}

function islandFruit(idx) {
  return islandFruits(idx).find(k => !G.p.fruitsFound.includes(k)) || null;
}

function unfoundWeapons(idx) {
  return ISLANDS[idx].weapons.filter(w => !G.p.weapons.includes(w));
}

function lootCount(idx) {
  const fruits = islandFruits(idx);
  const total = ISLANDS[idx].weapons.length + fruits.length + islandClothes(idx).length;
  const left = unfoundWeapons(idx).length + fruits.filter(k => !G.p.fruitsFound.includes(k)).length + unfoundClothes(idx).length;
  return { total, found: total - left, left };
}

// Searching a trash can or a shaking bush (spot = { kind, x, y } on the island map).
async function explore(spot) {
  if (!needEnergy(12)) return;
  const p = G.p, idx = p.island;
  const trash = spot && spot.kind === 'trash';
  spend(12, 1, 8);
  lock(true);
  if (spot) markSearched(spot.x, spot.y);
  say(trash
    ? pick(['You lift the lid and dig through the trash...', 'You hold your nose and rummage around...', 'Something rattles at the bottom of the can...'])
    : pick(['You push into the rustling bush...', 'Something is moving in there...', 'You part the leaves and look inside...']));
  Sfx.play('rustle');
  OW.search = spot || null;
  await wait(900);
  OW.search = null;
  const n = (p.explored[idx] || 0) + 1;
  p.explored[idx] = n;
  const fruitK = islandFruit(idx), weps = unfoundWeapons(idx), clothK = unfoundClothes(idx)[0];
  if (fruitK && Math.random() < Math.min(0.45, 0.03 + n * 0.03)) {
    await findFruit(fruitK);
  } else if (weps.length && Math.random() < (p.weapons.length ? Math.min(0.6, 0.14 + n * 0.04) : 0.35 + n * 0.2)) {
    await findWeapon(pick(weps));
  } else if (clothK && Math.random() < Math.min(0.5, 0.1 + n * 0.04)) {
    await findClothes(clothK);
  } else {
    const r = Math.random();
    if (r < 0.2) {
      const key = pick(island().enemies);
      Sfx.play('hurt');
      await talk(`Ambush! A ${ENEMIES[key].name} jumps out of the ${trash ? 'trash can' : 'bush'}!`);
      startBattle({ def: ENEMIES[key], key, lvl: ENEMIES[key].lvl + randInt(0, 1) });
      return;
    }
    if (r < 0.46) {
      const b = randInt(25, 60) + idx * 40;
      p.berries += b;
      showLoot({ kind: 'icon', icon: 'chest' });
      Sfx.play('coin');
      await talk(pick([`You dig up a buried pouch with ฿${b} inside!`, `A drunk pirate dropped his wallet. ฿${b}! Finders keepers.`, `You find ฿${b} stuffed in an old boot.`]));
    } else if (r < 0.62) {
      const k = Math.random() < 0.6 ? 'fish' : 'meat';
      p.bag[k] = (p.bag[k] || 0) + 1;
      showLoot({ kind: 'icon', icon: ITEMS[k].icon });
      Sfx.play('eat');
      await talk(k === 'fish' ? 'You catch a fish with your bare hands! Got a Grilled Fish.' : 'A farmer gives you a Meat on the Bone for chasing off a crow.');
    } else if (r < 0.72) {
      const k = pick(idx >= 2 ? ['medicine', 'cola', 'water'] : ['medicine', 'cola']);
      p.bag[k] = (p.bag[k] || 0) + 1;
      showLoot({ kind: 'icon', icon: ITEMS[k].icon });
      Sfx.play('coin');
      await talk(`You found a crate washed ashore. Inside: ${ITEMS[k].name}!`);
    } else if (r < 0.82) {
      const fruitTip = p.fruit && Math.random() < 0.4;
      const key = fruitTip ? p.fruit : styleKey();
      const who = fruitTip ? 'An old scholar explains how Devil Fruit powers grow.'
        : key === 'fists' ? 'A retired brawler shows you how to throw a real punch.'
        : weapon().shape === 'gun' || weapon().shape === 'shell' ? 'A grizzled gunslinger fixes your aim.'
        : `An old master watches you swing your ${weapon().name} and corrects your form.`;
      const before = mastery(key);
      const unlocked = gainMastery(key, 8);
      await talk(`${who} +${mastery(key) - before} ${styleName(key)} mastery.`);
      await announceUnlocks(unlocked);
    } else {
      const left = lootCount(idx).left;
      await talk(left
        ? `${trash ? 'Just old fish bones' : 'Just leaves and a startled bird'}... but the locals swear ${left} treasure${left > 1 ? 's are' : ' is'} still hidden on this island.`
        : pick(['You find a nice view. This island has no more hidden treasures.', 'Just seagulls and sand. You have found every secret here.']));
    }
  }
  save();
  lock(false);
  homeMenu();
}

async function findWeapon(k, from) {
  const p = G.p, w = WEAPONS[k];
  if (p.weapons.includes(k)) return;
  p.weapons.push(k);
  showLoot(weaponSpec(k));
  Sfx.play('find');
  await talk(from ? `${from} dropped a weapon: the ${w.name}!` : `You found a weapon: the ${w.name}! ${w.desc}`);
  if (!p.weapon) {
    p.weapon = k;
    await talk(`You grab it. +${w.atk} ATK${w.def ? `, +${w.def} DEF` : ''}. First move ready: ${w.moves[0].name}! Fight with it to unlock more moves.`);
  } else {
    await talk(`+${w.atk} ATK${w.def ? `, +${w.def} DEF` : ''}. Open Gear to equip it. Every weapon has its own moves to master.`);
  }
}

async function findFruit(k) {
  const f = FRUITS[k];
  G.p.fruitsFound.push(k);
  showLoot(fruitSpec(k));
  Sfx.play('haki');
  screenFlash(f.color, 0.5);
  shake(2, 300);
  await talk(`!!! Hidden in a ${pick(['hollow log', 'sunken chest', "seagull's nest", 'cave behind a waterfall', 'pile of junk'])}: a strange swirly fruit. A DEVIL FRUIT! The ${f.name}!`);
  await fruitChoice(k);
}

function fruitChoice(k) {
  return new Promise(res => {
    const p = G.p, f = FRUITS[k];
    const act = fn => async () => { modalOnClose = null; closeModal(); await fn(k); save(); res(); };
    const body = el('div');
    body.style.display = 'contents';
    body.append(el('div', { class: 'row' },
      el('img', { src: iconURL('fruit', { c: f.color, C: f.color2 }), alt: '' }),
      el('div', null, el('h3', { text: f.name }), el('p', { text: f.desc }), movesList(k, 0)),
      null));
    body.append(el('p', {
      text: p.fruit
        ? `You already ate the ${FRUITS[p.fruit].name}. A second Devil Fruit would blow you to pieces! Keep it or sell it.`
        : 'Eat it to gain its power forever. You can only ever eat ONE Devil Fruit, and you will never swim again. Or keep it for later.',
    }));
    body.append(el('div', { class: 'btn-row' },
      p.fruit ? null : el('button', { type: 'button', class: 'mini-btn red', text: 'Eat it', onclick: act(eatFruit) }),
      el('button', { type: 'button', class: 'mini-btn', text: 'Keep it', onclick: act(keepFruit) }),
      el('button', { type: 'button', class: 'mini-btn', text: `Sell (฿${fmt(FRUIT_PRICE)})`, onclick: act(sellFruit) })));
    openModal('Devil Fruit!', body, { locked: true });
  });
}

async function eatFruit(k) {
  const p = G.p, f = FRUITS[k];
  p.fruit = k;
  p.fruitBag = p.fruitBag.filter(x => x !== k);
  if (f.hpBonus) {
    const add = Math.round(p.maxHp * f.hpBonus);
    p.maxHp += add;
    p.hp += add;
  }
  Sfx.play('haki');
  screenFlash(f.color, 0.8);
  particles(G.hero.x, 100, 30, { colors: [f.color, f.color2, '#ffffff'], speed: 80 });
  bubble('BLEH!');
  await talk(`You ate the ${f.name}! It tastes like old socks... but power surges through you!`);
  if (f.hpBonus) await talk(`Your body grows tougher. Max HP +${Math.round(f.hpBonus * 100)}%!`);
  if (k === 'dragon') await talk('Horns burst out of your head, azure scales spread down your arms and legs, and a tail swishes behind you. You are half dragon now, for good!');
  if (p.race === 'fishman') await talk("A fishman who can't swim anymore... Well, that's ironic.");
  await talk(`First move ready: ${f.moves[0].name}. Use your power in fights or practice it to unlock ${f.moves[1].name} and ${f.moves[2].name}.`);
}

async function keepFruit(k) {
  if (!G.p.fruitBag.includes(k)) G.p.fruitBag.push(k);
  await talk('You stash the fruit in your bag. You can eat or sell it from the Gear menu.');
}

async function sellFruit(k) {
  const p = G.p;
  p.fruitBag = p.fruitBag.filter(x => x !== k);
  p.berries += FRUIT_PRICE;
  Sfx.play('coin');
  await talk(`A shady collector pays ฿${fmt(FRUIT_PRICE)} for the ${FRUITS[k].name}. Ka-ching!`);
}

// ---------- gear menu ----------

// A small progress bar from the last unlocked move toward the next one.
function masteryBar(key) {
  const n = mastery(key), moves = styleMoves(key);
  // Once every move is unlocked, a Devil Fruit keeps counting toward its awakening.
  const next = moves.find(m => m.at > n) || (FRUITS[key] && FRUITS[key].awaken && n < AWAKEN_REQ.mastery ? { at: AWAKEN_REQ.mastery } : null);
  const lo = moves.filter(m => m.at <= n).reduce((a, m) => Math.max(a, m.at), 0);
  const frac = next ? (n - lo) / (next.at - lo) : 1;
  return el('div', { class: 'mastery', title: `${rankOf(key)} mastery` },
    el('div', { class: 'mbar' }, el('i', { style: `width: ${Math.round(frac * 100)}%` })),
    el('span', { text: next ? `${n}/${next.at}` : 'MAX' }));
}

function movesList(key, n) {
  n = n === undefined ? mastery(key) : n;
  return el('p', { class: 'moves' }, styleMoves(key).map(m => el('span', {
    class: 'move' + (n >= m.at ? ' on' : ''),
    text: n >= m.at ? m.name : `${m.name} (${m.at})`,
  })));
}

function gearMenu(note) {
  const p = G.p;
  const body = el('div');
  body.style.display = 'contents';
  if (note) body.append(el('p', { class: 'note', text: note }));
  const total = ISLANDS.reduce((a, i) => a + i.weapons.length, 0) + Object.values(BOSSES).filter(b => b.drop).length;
  body.append(el('h3', { class: 'sect' }, 'Weapons ', el('span', { text: `${p.weapons.length}/${total} found` })));
  for (const key of ['fists'].concat(p.weapons)) {
    const w = WEAPONS[key];
    const on = styleKey() === key;
    const holder = holderOf(key);
    body.append(el('div', { class: 'row gear' + (on ? ' current' : '') },
      el('img', { src: weaponURL(key), alt: '' }),
      el('div', null,
        el('h3', null, w ? w.name : 'Bare Fists', w ? el('small', { text: ` +${w.atk} ATK${w.def ? ` +${w.def} DEF` : ''}${holder ? ` - held by ${CREW[holder.key].name}` : ''}` }) : null),
        masteryBar(key), movesList(key)),
      on ? el('span', { class: 'count', text: 'Equipped' })
        : el('button', { type: 'button', class: 'mini-btn', text: 'Equip', onclick: () => equip(key) })));
  }

  body.append(el('h3', { class: 'sect' }, 'Devil Fruit ', el('span', { text: `${p.fruitsFound.length}/${Object.keys(FRUITS).length} found` })));
  if (p.fruit) {
    const f = FRUITS[p.fruit];
    body.append(el('div', { class: 'row gear current' },
      el('img', { src: iconURL('fruit', { c: f.color, C: f.color2 }), alt: '' }),
      el('div', null, el('h3', { text: f.name }), masteryBar(p.fruit), movesList(p.fruit)),
      null));
    if (f.awaken) body.append(awakenPanel());
  } else {
    body.append(el('p', { class: 'note', text: 'No powers yet. Devil Fruits hide on every island. Keep exploring!' }));
  }
  for (const k of p.fruitBag) {
    const f = FRUITS[k];
    body.append(el('div', { class: 'row gear' },
      el('img', { src: iconURL('fruit', { c: f.color, C: f.color2 }), alt: '' }),
      el('div', null, el('h3', null, f.name, el('small', { text: ' in bag' })), movesList(k, 0)),
      el('div', { class: 'btn-row' },
        p.fruit ? null : el('button', { type: 'button', class: 'mini-btn red', text: 'Eat', onclick: () => eatFromBag(k) }),
        el('button', { type: 'button', class: 'mini-btn', text: `฿${fmt(FRUIT_PRICE)}`, 'aria-label': `Sell ${f.name}`, onclick: () => sellFromBag(k) }))));
  }
  body.append(el('p', { class: 'note', text: 'Fight with a weapon or power, or do Drills, to raise mastery and unlock its moves.' }));
  clothesSection(body);
  openModal('Gear', body, { onClose: () => G.mode === 'home' && homeMenu() });
}

// Your wardrobe: wear one hat, one coat and one charm. Each row shows your pirate wearing that piece.
function clothesSection(body) {
  const p = G.p;
  body.append(el('h3', { class: 'sect' }, 'Clothes ', el('span', { text: `${p.clothes.length}/${Object.keys(CLOTHES).length} found` })));
  if (!p.clothes.length) {
    body.append(el('p', { class: 'note', text: 'Just the clothes on your back. Raid bosses drop their signature gear, shops sell some, and a few hide in trash cans and bushes.' }));
    return;
  }
  for (const slot of SLOTS) {
    const mine = p.clothes.filter(k => CLOTHES[k].slot === slot).sort((a, b) => (p.wear[slot] === b) - (p.wear[slot] === a));
    for (const k of mine) {
      const c = CLOTHES[k], on = p.wear[slot] === k, holder = clothHolder(k);
      const crew = holder && holder !== 'you' ? ` - worn by ${CREW[holder.key].name}` : '';
      body.append(el('div', { class: 'row gear' + (on ? ' current' : '') },
        el('img', { src: spriteURL(heroSpec(Object.assign({}, p.wear, { [slot]: k })), 2), alt: '' }),
        el('div', null, el('h3', null, c.name, el('small', { text: ' ' + SLOT_NAMES[slot] + crew })), el('p', { text: clothStats(c) })),
        el('button', { type: 'button', class: 'mini-btn' + (on ? '' : ' red'), text: on ? 'Take off' : 'Wear', 'aria-label': `${on ? 'Take off' : 'Wear'} ${c.name}`, onclick: () => dress(k, on) })));
    }
  }
}

function dress(k, off) {
  const c = CLOTHES[k];
  const from = off ? null : clothHolder(k);
  if (off) takeOff(c.slot); else putOn(k);
  Sfx.play('select');
  save();
  gearMenu(off ? `You took off the ${c.name}.` : `You put on the ${c.name}.${from && from !== 'you' ? ` ${CREW[from.key].name} hands it over.` : ''} ${clothStats(c)}.`);
}

function equip(key) {
  const holder = key === 'fists' ? null : holderOf(key);
  if (holder) holder.weapon = null;
  G.p.weapon = key === 'fists' ? null : key;
  save();
  gearMenu(holder ? `You took the ${WEAPONS[key].name} back from ${CREW[holder.key].name} and equipped it.`
    : `Equipped ${key === 'fists' ? 'your bare fists' : 'the ' + WEAPONS[key].name}.`);
}

async function eatFromBag(k) {
  modalOnClose = null;
  closeModal();
  lock(true);
  await eatFruit(k);
  save();
  lock(false);
  homeMenu();
}

function sellFromBag(k) {
  const p = G.p;
  p.fruitBag = p.fruitBag.filter(x => x !== k);
  p.berries += FRUIT_PRICE;
  Sfx.play('coin');
  save();
  gearMenu(`Sold the ${FRUITS[k].name} for ฿${fmt(FRUIT_PRICE)}.`);
}
