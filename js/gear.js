'use strict';
/* Gear and growth: weapons, devil fruits, move mastery, and exploring islands for loot. */

const STAT_KEYS = ['atk', 'def', 'spd', 'haki'];
const NOBODY_SPR = { kind: 'player', hat: false, pal: { v: '#cfc6b0', y: '#7a5a3a', b: '#7a6a52' } };

const weapon = () => (G.p && G.p.weapon ? WEAPONS[G.p.weapon] : null);
const styleKey = () => G.p.weapon || 'fists';
const mastery = key => G.p.mastery[key] || 0;
const effAtk = () => G.p.atk + (weapon() ? weapon().atk : 0);
const heroSpec = () => (G.p && !G.p.hat ? NOBODY_SPR : PLAYER_SPR);
const weaponSpec = k => (WEAPONS[k].shape ? { kind: 'weapon', shape: WEAPONS[k].shape, pal: WEAPONS[k].pal || {} } : { kind: 'icon', icon: 'wraps' });
const weaponURL = k => (k === 'fists' ? iconURL('wraps', { w: '#f3c08c', s: '#c98a5a' }) : spriteURL(weaponSpec(k), 3));
const fruitSpec = k => ({ kind: 'icon', icon: 'fruit', pal: { c: FRUITS[k].color, C: FRUITS[k].color2 } });
const shortWeapon = () => (weapon() ? weapon().name.split(' ').pop() : 'Fists');

function styleName(key) {
  if (key === 'fists') return 'Brawling';
  return WEAPONS[key] ? WEAPONS[key].name : FRUITS[key].name;
}

function styleMoves(key) {
  if (key === 'fists') return FIST_MOVES;
  return WEAPONS[key] ? WEAPONS[key].moves : FRUITS[key].moves;
}

function rankOf(key) {
  const n = mastery(key), moves = styleMoves(key);
  if (n >= moves[2].at) return 'Master';
  if (n >= moves[1].at) return 'Adept';
  return n >= moves[0].at ? 'Novice' : 'Beginner';
}

// Adds mastery and returns the moves that just unlocked.
function gainMastery(key, n) {
  if (!key || n <= 0) return [];
  const before = mastery(key);
  G.p.mastery[key] = before + n;
  return styleMoves(key).filter(m => before < m.at && before + n >= m.at).map(move => ({ move, key }));
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

function drawHeldWeapon(c, x, y, scale) {
  const w = weapon();
  if (!w || !w.shape) return;
  const sh = WEAPON_SHAPES[w.shape];
  const spr = getSprite(weaponSpec(G.p.weapon));
  const hx = x + 4.5 * scale, hy = y - 5.5 * scale;
  c.drawImage(spr, Math.round(hx - (sh.grip[0] + 1) * scale), Math.round(hy - (sh.grip[1] + 1) * scale), spr.width * scale, spr.height * scale);
}

function showLoot(spec) {
  G.loot = { spec, t: G.t };
}

function drawLoot(c) {
  const L = G.loot;
  if (!L) return;
  const k = G.t - L.t;
  if (k > 2.6) { G.loot = null; return; }
  const x = G.hero.x + G.hero.ox;
  const y = 80 - Math.min(1, k * 3) * 10 + Math.sin(G.t * 4) * 1.5;
  drawSpriteAt(c, getSprite(L.spec), x, y, 2, { shadow: false });
  if (Math.floor(G.t * 8) % 2) {
    for (const [dx, dy] of [[-14, -16], [13, -22], [-10, -4], [12, -6]]) {
      pxRect(c, x + dx, y + dy - 1, 1, 3, '#fff6a0');
      pxRect(c, x + dx - 1, y + dy, 3, 1, '#fff6a0');
    }
  }
}

// ---------- island secrets ----------

function islandFruit(idx) {
  const k = G.p.fruitMap[idx];
  return k && !G.p.fruitsFound.includes(k) ? k : null;
}

function unfoundWeapons(idx) {
  return ISLANDS[idx].weapons.filter(w => !G.p.weapons.includes(w));
}

function lootCount(idx) {
  const total = ISLANDS[idx].weapons.length + (G.p.fruitMap[idx] ? 1 : 0);
  const left = unfoundWeapons(idx).length + (islandFruit(idx) ? 1 : 0);
  return { total, found: total - left, left };
}

async function explore() {
  if (!needEnergy(12)) return;
  const p = G.p, idx = p.island, Hr = G.hero;
  spend(12, 1, 8);
  lock(true);
  say(pick(['You head into the brush to look around...', 'You poke around behind the houses...', 'You climb the rocks to scout the island...', 'You follow a suspicious trail of footprints...']));
  await tween(Hr, { x: W + 24 }, 650, linear);
  await wait(450);
  Hr.x = -24;
  await tween(Hr, { x: 104 }, 650, linear);
  Hr.tx = 104;
  const n = (p.explored[idx] || 0) + 1;
  p.explored[idx] = n;
  const fruitK = islandFruit(idx), weps = unfoundWeapons(idx);
  if (fruitK && Math.random() < Math.min(0.45, 0.03 + n * 0.03)) {
    await findFruit(fruitK);
  } else if (weps.length && Math.random() < (p.weapons.length ? Math.min(0.6, 0.14 + n * 0.04) : 0.35 + n * 0.2)) {
    await findWeapon(pick(weps));
  } else {
    const r = Math.random();
    if (r < 0.2) {
      const key = pick(island().enemies);
      Sfx.play('hurt');
      await talk(`Ambush! A ${ENEMIES[key].name} jumps out of the bushes!`);
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
      await talk(`${who} +8 ${styleName(key)} mastery.`);
      await announceUnlocks(gainMastery(key, 8));
    } else {
      const left = lootCount(idx).left;
      await talk(left
        ? `Nothing this time... but the locals swear ${left} treasure${left > 1 ? 's are' : ' is'} still hidden on this island.`
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
  Sfx.play('haki');
  screenFlash(f.color, 0.8);
  particles(G.hero.x, 100, 30, { colors: [f.color, f.color2, '#ffffff'], speed: 80 });
  bubble('BLEH!');
  await talk(`You ate the ${f.name}! It tastes like old socks... but power surges through you!`);
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
  const next = moves.find(m => m.at > n);
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
    body.append(el('div', { class: 'row gear' + (on ? ' current' : '') },
      el('img', { src: weaponURL(key), alt: '' }),
      el('div', null,
        el('h3', null, w ? w.name : 'Bare Fists', w ? el('small', { text: ` +${w.atk} ATK${w.def ? ` +${w.def} DEF` : ''}` }) : null),
        masteryBar(key), movesList(key)),
      on ? el('span', { class: 'count', text: 'Equipped' })
        : el('button', { type: 'button', class: 'mini-btn', text: 'Equip', onclick: () => equip(key) })));
  }

  body.append(el('h3', { class: 'sect' }, 'Devil Fruit ', el('span', { text: `${p.fruitsFound.length}/5 found` })));
  if (p.fruit) {
    const f = FRUITS[p.fruit];
    body.append(el('div', { class: 'row gear current' },
      el('img', { src: iconURL('fruit', { c: f.color, C: f.color2 }), alt: '' }),
      el('div', null, el('h3', { text: f.name }), masteryBar(p.fruit), movesList(p.fruit)),
      null));
  } else {
    body.append(el('p', { class: 'note', text: 'No powers yet. One Devil Fruit hides on each of the first five islands.' }));
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
  openModal('Gear', body, { onClose: () => G.mode === 'home' && homeMenu() });
}

function equip(key) {
  G.p.weapon = key === 'fists' ? null : key;
  save();
  gearMenu(`Equipped ${key === 'fists' ? 'your bare fists' : 'the ' + WEAPONS[key].name}.`);
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
