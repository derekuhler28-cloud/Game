'use strict';
/* Game content: islands, enemies, raid bosses, crew, devil fruits, items. */

const TIME_NAMES = ['Morning', 'Noon', 'Evening', 'Night'];
const TICKS_PER_DAY = 8; // two ticks per time slot; tick 8 = late night

const ISLANDS = [
  {
    name: 'Dawn Village', scene: 'village', enemies: ['seaslug', 'bandit', 'boar'], boss: 'grizzle', recruit: 'kenji', weapons: ['cutlass', 'bostaff'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola'],
    intro: 'Windmills, quiet farms and a bandit problem. Explore to find a weapon. Locals whisper about a strange fruit hidden somewhere...',
    job: 'You fixed the windmill sails for the village chief.',
  },
  {
    name: 'Shell Port', scene: 'marine', enemies: ['recruit', 'dog', 'sergeant'], boss: 'ironjaw', recruit: 'coral', weapons: ['flintlock', 'saber'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'weights', 'sails', 'galley'],
    intro: 'A Marine base town. Captain Ironjaw rules it with an iron... jaw.',
    job: 'You scrubbed the Marine base decks. Nobody recognized you.',
  },
  {
    name: 'Coral Reef Park', scene: 'reef', enemies: ['fishthug', 'crab', 'seapup'], boss: 'sharko', recruit: 'basil', weapons: ['trident', 'wraps'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'Pink coral and sea-salt air. Fishman pirates took over the floating restaurant.',
    job: 'You washed 400 dishes at the floating restaurant.',
  },
  {
    name: 'Sandora Kingdom', scene: 'desert', enemies: ['sandcroc', 'raider', 'scorpion'], boss: 'sandor', recruit: 'moss', weapons: ['scimitar'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'A kingdom drying out. Warlord Sandor is a Logia: hits pass through him unless you use Armament Haki or soak him with Water.',
    job: 'You hauled water barrels across the dunes for thirsty villagers.',
  },
  {
    name: 'Cloud Isle', scene: 'sky', enemies: ['skyguard', 'cloudeel', 'thunderbird'], boss: 'voltz', recruit: 'pip', weapons: ['shockshell'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'An island floating on a sea of clouds. Sky God Voltz is pure lightning. Haki is a must.',
    job: 'You ferried cloud-boats for the sky folk.',
  },
  {
    name: 'Last Isle', scene: 'volcano', enemies: ['beastpirate', 'gorilla', 'dragonwhelp'], boss: 'drakko', recruit: null, weapons: ['nightedge'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'The end of the Grand Line. Emperor Drakko guards the legendary treasure.',
    job: 'You stacked cannonballs for a very nervous merchant.',
  },
];

// Normal enemies. lvl is the base level; sprite specs use the shared pixel templates.
const ENEMIES = {
  seaslug:  { name: 'Sea Slug', lvl: 1, spr: { kind: 'slug', pal: { c: '#7fc8a9', C: '#4f9a7d' } }, moves: ['Slime Spit', 'Squish'] },
  bandit:   { name: 'Mountain Bandit', lvl: 2, spr: { kind: 'human', head: 'bandana', pal: { x: '#b23a3a', h: '#3a2a1a', c: '#6b4f2f', C: '#8a6a3f', p: '#3a3a4a' } }, moves: ['Knife Slash', 'Dirty Kick'] },
  boar:     { name: 'Wild Boar', lvl: 3, spr: { kind: 'quad', pal: { c: '#8a5a3a', C: '#b07a52', h: '#6a4228', n: '#3a2218' } }, moves: ['Tusk Charge', 'Stomp'] },
  recruit:  { name: 'Marine Recruit', lvl: 4, spr: { kind: 'human', head: 'cap', pal: { x: '#2f5fb3', c: '#e9edf5', C: '#2f5fb3', p: '#2f5fb3' } }, moves: ['Rifle Butt', 'Salute Punch'] },
  dog:      { name: 'Guard Dog', lvl: 5, spr: { kind: 'quad', pal: { c: '#6f7480', C: '#9aa0ab', h: '#4a4e58', n: '#1b1424' } }, moves: ['Bite', 'Pounce'] },
  sergeant: { name: 'Marine Sergeant', lvl: 6, spr: { kind: 'human', head: 'cap', pal: { x: '#2f5fb3', c: '#2f5fb3', C: '#e9edf5', p: '#e9edf5', h: '#6a4228' } }, moves: ['Saber Strike', 'Justice Jab'] },
  fishthug: { name: 'Fishman Thug', lvl: 9, spr: { kind: 'brute', head: 'ape', pal: { s: '#6fa8c9', h: '#2c3e66', c: '#e2a64a', C: '#c0453a', p: '#2c3e66' } }, moves: ['Karate Chop', 'Water Shot'] },
  crab:     { name: 'Giant Crab', lvl: 10, spr: { kind: 'crab', pal: { c: '#d8573e', C: '#f29a7a' } }, moves: ['Pinch', 'Bubble Blast'] },
  seapup:   { name: 'Sea King Pup', lvl: 11, spr: { kind: 'serpent', pal: { c: '#5b8fd9', C: '#cfe3f7' } }, moves: ['Bite', 'Tail Whip'] },
  sandcroc: { name: 'Sand Croc', lvl: 14, spr: { kind: 'serpent', pal: { c: '#a8925a', C: '#e6d39a' } }, moves: ['Death Roll', 'Chomp'] },
  raider:   { name: 'Desert Raider', lvl: 15, spr: { kind: 'human', head: 'turban', pal: { x: '#e8e0c8', h: '#2a2433', c: '#c0453a', C: '#e6b422', p: '#e8e0c8', s: '#c98a5a' } }, moves: ['Scimitar Slash', 'Sand Toss'] },
  scorpion: { name: 'Dune Scorpion', lvl: 16, spr: { kind: 'crab', pal: { c: '#c9963b', C: '#7a5a2a' } }, moves: ['Venom Sting', 'Pinch'] },
  skyguard: { name: 'Sky Guard', lvl: 20, spr: { kind: 'human', head: 'helmet', pal: { x: '#e6b422', w: '#ffffff', c: '#ffffff', C: '#e6b422', p: '#6aa0e0' } }, moves: ['Dial Blast', 'Spear Thrust'] },
  cloudeel: { name: 'Cloud Eel', lvl: 22, spr: { kind: 'serpent', pal: { c: '#e8f0ff', C: '#a9bde8' } }, moves: ['Wrap', 'Static Bite'] },
  thunderbird: { name: 'Thunder Bird', lvl: 23, spr: { kind: 'bird', pal: { c: '#f2d03b', w: '#fff3a8', y: '#e07a2a' } }, flies: true, moves: ['Thunder Peck', 'Gale Wing'] },
  beastpirate: { name: 'Beast Pirate', lvl: 27, spr: { kind: 'human', head: 'horns', pal: { x: '#e8e0c8', h: '#2a2433', c: '#5a3a7a', C: '#c0453a', p: '#2a2433' } }, moves: ['Club Bash', 'Beast Roar'] },
  gorilla:  { name: 'Iron Gorilla', lvl: 28, spr: { kind: 'brute', head: 'ape', pal: { h: '#3a3440', c: '#3a3440', C: '#5a5262', s: '#9a8a9a', p: '#3a3440', f: '#1b1424' } }, moves: ['Gorilla Punch', 'Chest Pound'] },
  dragonwhelp: { name: 'Dragon Whelp', lvl: 30, spr: { kind: 'serpent', horns: true, pal: { c: '#c94a4a', C: '#f2b25a', x: '#f2e6c8' } }, flies: true, moves: ['Flame Bite', 'Wing Slam'] },
};

// Raid bosses. hpMult scales HP over a normal enemy of the same level.
const BOSSES = {
  grizzle: {
    name: 'Bandit King Grizzle', drop: 'club', lvl: 5, hpMult: 2.2, atkMult: 0.9, bounty: 15000000, berries: 600, scale: 3,
    spr: { kind: 'brute', head: 'grizzle', weapon: 'club', pal: { x: '#b23a3a', h: '#5a3a22', c: '#7a4a2a', C: '#c9a26a', p: '#3a4a2a', s: '#e8b080' } },
    intro: '"Gwahaha! This village pays ME now, brat!"',
    basic: 'Club Swing', charge: 'raises his giant club overhead!', big: 'Mountain Crusher',
    enrage: 'Grizzle roars and goes berserk!',
  },
  ironjaw: {
    name: 'Captain Ironjaw', drop: 'ironaxe', lvl: 10, hpMult: 2.8, atkMult: 0.95, bounty: 40000000, berries: 1100, scale: 3,
    spr: { kind: 'brute', head: 'ironjaw', weapon: 'axe', pal: { x: '#2f5fb3', c: '#e9edf5', C: '#2f5fb3', p: '#2f5fb3', s: '#e8b080' } },
    intro: '"Justice is whatever I say it is!"',
    basic: 'Axe Chop', charge: 'spins his axe-arm faster and faster!', big: 'Iron Cleave',
    enrage: 'Ironjaw bites down so hard his steel jaw sparks!',
  },
  sharko: {
    name: 'Sawtooth Sharko', drop: 'sawblade', lvl: 15, hpMult: 3.5, bounty: 90000000, berries: 2000, scale: 3, heals: true,
    spr: { kind: 'brute', head: 'sharko', pal: { s: '#7ab0c8', h: '#2c3e66', x: '#4a6a9a', g: '#e8e8f0', c: '#e9edf5', C: '#3a7a5a', p: '#2c3e66' } },
    intro: '"Humans are lower than plankton!"',
    basic: 'Saw Slash', charge: 'dives into the water and circles you...', big: 'Shark Torpedo', fx: 'water',
    enrage: 'Sharko\'s eyes go red. Fishman fury!',
  },
  sandor: {
    name: 'Warlord Sandor', drop: 'goldhook', lvl: 21, hpMult: 3.9, bounty: 180000000, berries: 3500, scale: 3, logia: 'sand',
    spr: { kind: 'brute', head: 'sandor', weapon: 'hook', pal: { h: '#1b1424', c: '#3a2f2a', C: '#e6b422', p: '#3a2f2a', S: '#a86a4a' } },
    intro: '"Water? In MY desert? Don\'t make me laugh."',
    basic: 'Sand Grip', charge: 'turns his arm into a howling sandstorm!', big: 'Desert Blade', fx: 'sand',
    enrage: 'The whole desert starts to swirl around Sandor!',
  },
  voltz: {
    name: 'Sky God Voltz', drop: 'thunderstaff', lvl: 27, hpMult: 4.3, bounty: 400000000, berries: 6000, scale: 3, logia: 'lightning', element: 'lightning',
    spr: { kind: 'brute', head: 'voltz', pal: { c: '#f3c08c', C: '#f08a3a', p: '#ffffff', f: '#e6b422' } },
    drums: true,
    intro: '"I am GOD. You are an insect who wandered into heaven."',
    basic: 'Lightning Lance', charge: 'gathers a black thundercloud overhead!', big: 'Thunder Judgment', fx: 'bolt',
    enrage: 'Voltz laughs. His drums crackle with ten million volts!',
  },
  drakko: {
    name: 'Emperor Drakko', drop: 'kanabo', lvl: 34, hpMult: 5, bounty: 1500000000, berries: 15000, scale: 3,
    spr: { kind: 'brute', head: 'drakko', weapon: 'kanabo', pal: { x: '#f2e6c8', h: '#1b1424', c: '#5a3a7a', C: '#e6b422', p: '#2a2433' } },
    phase2: { spr: { kind: 'serpent', horns: true, pal: { c: '#4a8ad9', C: '#bfe0ff', x: '#f2e6c8' } }, scale: 4, name: 'Dragon Drakko', basic: 'Dragon Claw', flies: true },
    intro: '"Entertain me, rookie. Then die."',
    basic: 'Kanabo Smash', charge: 'breathes in. The air gets hot...', big: 'Dragon Flame', fx: 'fire',
    enrage: 'Drakko transforms into a giant azure dragon!',
  },
  seaking: {
    name: 'Sea King', lvl: 8, hpMult: 2.0, bounty: 5000000, berries: 900, scale: 4, sea: true,
    spr: { kind: 'serpent', pal: { c: '#3a9a7a', C: '#e8d79a' } },
    intro: 'A SEA KING rises out of the waves!',
    basic: 'Tail Slam', charge: 'opens its enormous jaws!', big: 'Abyssal Chomp', fx: 'water',
    enrage: 'The Sea King thrashes wildly!',
  },
};

const CREW = {
  kenji: {
    name: 'Kenji', role: 'Swordsman', perk: 'Slashes every turn in raids. Big critical hits.',
    spr: { kind: 'human', head: 'hair', weapon: 'swords', pal: { h: '#46b35a', c: '#f2f2f2', C: '#2c2c34', p: '#2c2c34', f: '#2c2c34' } },
    join: 'Kenji the swordsman sheathes his three blades. "You fight like a lunatic. I\'m in."',
  },
  coral: {
    name: 'Coral', role: 'Navigator', perk: 'Storm Rod weakens foes. +20% berries. Steers around storms.',
    spr: { kind: 'human', head: 'long', long: true, pal: { h: '#f08a3a', c: '#4fa3e0', C: '#ffffff', p: '#e7c07a' } },
    join: 'Coral the navigator rolls up her map. "Fine. But I\'m in charge of the money."',
  },
  basil: {
    name: 'Basil', role: 'Cook', perk: 'Mighty kicks. Food restores 50% more.',
    spr: { kind: 'human', head: 'swoop', pal: { h: '#f2d15a', c: '#2c2c34', C: '#e8e8e8', p: '#2c2c34' } },
    join: 'Basil the cook lights a cigarette. "Someone has to feed this crew properly."',
  },
  moss: {
    name: 'Moss', role: 'Doctor', perk: 'Heals you every turn in raids.',
    spr: { kind: 'human', head: 'tophat', pal: { x: '#e46a9a', s: '#a0663a', S: '#7a4a2a', h: '#a0663a', c: '#e46a9a', C: '#f2c7d8', p: '#7a4a2a', f: '#4a2a1a', w: '#ffffff', m: '#4a2a1a' } },
    join: 'Moss the reindeer doctor hides behind a palm tree. "I-I\'m not happy you asked, you jerk!"',
  },
  pip: {
    name: 'Pip', role: 'Sniper', perk: 'Trick shots that crit often.',
    spr: { kind: 'human', head: 'goggles', pal: { h: '#3a2a22', x: '#8a6a3a', w: '#bfe6ff', c: '#e9b43a', C: '#7a5a2a', p: '#6a7a3a', s: '#c98a5a' } },
    join: 'Pip the sniper lowers his slingshot. "I have 8,000 followers back home. They\'d want me to join."',
  },
};

// Moves unlock with mastery: use a style in battle, win with it, or do Drills.
const FIST_MOVES = [
  { name: 'Power Punch', at: 10, sp: 25, mult: 1.5, fx: 'haymaker' },
  { name: 'Fury Rush', at: 40, sp: 45, mult: 0.7, hits: 3, fx: 'rush' },
  { name: 'Haymaker', at: 90, sp: 75, mult: 2.5, fx: 'haymaker' },
];

// Every island hides at least one fruit (shuffled every new game; two islands hide a second). Only one can ever be eaten.
const FRUIT_PRICE = 4000;
const FRUITS = {
  rubber: {
    name: 'Rubber-Rubber Fruit', color: '#8e4ec6', color2: '#c48ae8',
    desc: 'Your body stretches like rubber. Lightning can\'t hurt you.',
    moves: [
      { name: 'Rubber Pistol', at: 0, sp: 25, mult: 1.7, fx: 'arm' },
      { name: 'Rubber Gatling', at: 40, sp: 45, mult: 0.55, hits: 5, fx: 'gatling' },
      { name: 'Rubber Bazooka', at: 120, sp: 75, mult: 3.0, fx: 'bazooka' },
    ],
  },
  flame: {
    name: 'Flame-Flame Fruit', color: '#f07a2a', color2: '#ffd04a', dodge: 0.12,
    desc: 'Become living fire. Attacks sometimes pass right through you.',
    moves: [
      { name: 'Fire Fist', at: 0, sp: 30, mult: 2.0, fx: 'fireball' },
      { name: 'Flame Spray', at: 40, sp: 40, mult: 1.3, burn: 3, fx: 'flamespray' },
      { name: 'Great Blaze', at: 120, sp: 80, mult: 3.1, fx: 'pillar' },
    ],
  },
  frost: {
    name: 'Frost-Frost Fruit', color: '#5fd3f0', color2: '#e8fbff',
    desc: 'Freeze anything. Ice Age can freeze foes solid for a turn.',
    moves: [
      { name: 'Ice Spear', at: 0, sp: 25, mult: 1.6, fx: 'icespear' },
      { name: 'Ice Age', at: 40, sp: 50, mult: 1.0, freeze: true, fx: 'iceage' },
      { name: 'Glacier Drop', at: 120, sp: 80, mult: 2.9, fx: 'glacier' },
    ],
  },
  quake: {
    name: 'Quake-Quake Fruit', color: '#e8e3d3', color2: '#9aa4b1', defMult: 1.15,
    desc: 'Crack the very air. +15% defense from your sturdy body.',
    moves: [
      { name: 'Quake Punch', at: 0, sp: 30, mult: 1.9, fx: 'quake' },
      { name: 'Seaquake', at: 40, sp: 55, mult: 2.3, fx: 'seaquake' },
      { name: 'World Splitter', at: 120, sp: 90, mult: 3.6, fx: 'split' },
    ],
  },
  smoke: {
    name: 'Smoke-Smoke Fruit', color: '#c9ccd6', color2: '#ffffff', dodge: 0.12,
    desc: 'Drift like smoke. Smoke Bind weakens the enemy\'s attacks.',
    moves: [
      { name: 'White Blow', at: 0, sp: 25, mult: 1.6, fx: 'smokeblow' },
      { name: 'Smoke Bind', at: 40, sp: 45, mult: 1.1, atkDown: true, fx: 'smokebind' },
      { name: 'White Launcher', at: 120, sp: 75, mult: 2.9, fx: 'launcher' },
    ],
  },
  light: {
    name: 'Light-Light Fruit', color: '#fff3a0', color2: '#ffd04a', dodge: 0.12,
    desc: 'Become living light. Blinding speed, and attacks sometimes pass right through you.',
    moves: [
      { name: 'Flash Kick', at: 0, sp: 25, mult: 1.8, sure: true, fx: 'lightkick' },
      { name: 'Light Rain', at: 40, sp: 50, mult: 0.5, hits: 6, fx: 'lightrain' },
      { name: 'Solar Lance', at: 120, sp: 85, mult: 3.3, fx: 'beam' },
    ],
  },
  dough: {
    name: 'Dough-Dough Fruit', color: '#efe2c8', color2: '#c9a26a', guard: 0.12,
    desc: 'A squishy, sticky body that soaks up hits (12% less damage). Sticky Snare traps foes.',
    moves: [
      { name: 'Dough Fist', at: 0, sp: 25, mult: 1.7, fx: 'doughfist' },
      { name: 'Sticky Snare', at: 40, sp: 45, mult: 1.1, stun: 0.6, fx: 'doughsnare' },
      { name: 'Dough Avalanche', at: 120, sp: 80, mult: 3.0, fx: 'wave', color: '#e8dcc8' },
    ],
  },
  dragon: {
    name: 'Dragon-Dragon Fruit', color: '#4a8ad9', color2: '#bfe0ff', hpBonus: 0.2, form: true,
    desc: 'A mythical Zoan. Turn into an azure dragon to attack. +20% max HP.',
    moves: [
      { name: 'Dragon Claw', at: 0, sp: 25, mult: 1.8, fx: 'swing', color: '#bfe0ff' },
      { name: 'Blaze Breath', at: 40, sp: 50, mult: 1.5, burn: 3, fx: 'breath' },
      { name: 'Dragon Twister', at: 120, sp: 90, mult: 3.5, fx: 'twister' },
    ],
  },
};

// Picked when starting a new game. `stats` adjust the starting stats; perks and flaws are listed on the picker.
const RACES = {
  human: {
    name: 'Human', desc: 'Stubborn and adaptable. The most common folk on the seas.',
    perks: ['Quick learner: +25% mastery from everything'],
    flaws: ['No racial move'],
    stats: {},
  },
  mink: {
    name: 'Mink', desc: 'A furry warrior tribe. Fast, fierce, and crackling with Electro.',
    perks: ['+3 SPD, +2 ATK', 'Electro Claw move from day one', 'Moonlight: +15% damage at night'],
    flaws: ['Big appetite: gets hungry 25% faster'],
    stats: { spd: 3, atk: 2 },
    move: { name: 'Electro Claw', at: 0, sp: 25, mult: 1.6, stun: 0.3, fx: 'thunder' },
  },
  skypian: {
    name: 'Skypian', desc: 'Winged folk from the islands above the clouds. Nimble and handy with dials.',
    perks: ['Wings: +10% dodge', 'Dial tech: +4 SP every turn', 'Impact Dial move from day one'],
    flaws: ['Light frame: 15% less max HP'],
    stats: { hpMult: 0.85 },
    move: { name: 'Impact Dial', at: 0, sp: 30, mult: 2.1, recoil: 0.05, fx: 'blast' },
  },
  fishman: {
    name: 'Fishman', desc: 'Born under the sea with ten times the strength of a human.',
    perks: ['+4 ATK, +15 max HP', 'Fishman Karate from day one (ignores defense)', 'Born swimmer: fishing pays 30% more'],
    flaws: ['Slow on land: -2 SPD', 'Dries out: -10% damage on Sandora and Cloud Isle'],
    stats: { atk: 4, hp: 15, spd: -2 },
    move: { name: 'Fishman Karate', at: 0, sp: 25, mult: 1.5, pierce: true, fx: 'haymaker' },
  },
};

// Weapons hide on islands (ISLANDS[].weapons) or drop from raid bosses (BOSSES[].drop).
// `shape` picks the hand-held sprite, `hit` the basic attack effect, `color` the slash color.
const WEAPONS = {
  cutlass: {
    name: 'Rusty Cutlass', atk: 3, shape: 'sword', pal: { w: '#c8bca4', G: '#8a6a3a' }, hit: 'swing',
    desc: 'A chipped blade from a shipwreck. Better than nothing!',
    moves: [
      { name: 'Rusty Slash', at: 0, sp: 20, mult: 1.45, fx: 'swing' },
      { name: 'Double Cut', at: 30, sp: 40, mult: 0.85, hits: 2, fx: 'multislash' },
      { name: 'Flying Slash', at: 80, sp: 70, mult: 2.4, fx: 'crescent' },
    ],
  },
  bostaff: {
    name: 'Oak Bo Staff', atk: 2, def: 2, shape: 'staff', pal: { n: '#9a6a3a' }, hit: 'swing', color: '#e8d9b0',
    desc: 'A sturdy staff. Good reach, and it can daze enemies.',
    moves: [
      { name: 'Staff Sweep', at: 0, sp: 20, mult: 1.3, stun: 0.3, fx: 'swing' },
      { name: 'Pole Vault Strike', at: 30, sp: 45, mult: 1.9, fx: 'smash' },
      { name: 'Whirlwind', at: 80, sp: 70, mult: 0.6, hits: 4, fx: 'multislash' },
    ],
  },
  flintlock: {
    name: 'Flintlock Pistol', atk: 4, shape: 'gun', pal: { g: '#5a5a6a', n: '#7a4a24' }, hit: 'shot',
    desc: 'One shot at a time, but its special moves never miss.',
    moves: [
      { name: 'Quick Draw', at: 0, sp: 20, mult: 1.4, sure: true, fx: 'shot' },
      { name: 'Trick Shot', at: 30, sp: 40, mult: 1.6, crit: 0.4, sure: true, fx: 'shot' },
      { name: 'Point Blank', at: 80, sp: 75, mult: 2.8, fx: 'blast' },
    ],
  },
  saber: {
    name: 'Marine Saber', atk: 6, shape: 'sword', pal: { w: '#e8edf5', G: '#2f5fb3' }, hit: 'swing',
    desc: 'Standard Marine issue. Polished and sharp.',
    moves: [
      { name: 'Iron Rule Slash', at: 0, sp: 25, mult: 1.6, fx: 'swing' },
      { name: 'Saber Flurry', at: 30, sp: 45, mult: 0.75, hits: 3, fx: 'multislash' },
      { name: 'Justice Crescent', at: 80, sp: 75, mult: 2.7, fx: 'crescent', color: '#9ad0ff' },
    ],
  },
  trident: {
    name: 'Coral Trident', atk: 7, shape: 'trident', pal: { w: '#ff7a9a', n: '#c98a5a' }, hit: 'swing', color: '#ff9ab0',
    desc: 'Pulls the sea with it. Riptide soaks Logia users so your hits connect.',
    moves: [
      { name: 'Trident Thrust', at: 0, sp: 25, mult: 1.6, fx: 'swing' },
      { name: 'Riptide', at: 30, sp: 40, mult: 1.2, wet: true, fx: 'wave' },
      { name: 'Tsunami Spear', at: 80, sp: 80, mult: 3.0, fx: 'wave' },
    ],
  },
  wraps: {
    name: 'Karate Wraps', atk: 5, def: 3, shape: null, hit: 'punch',
    desc: 'Fishman karate hand wraps. Strikes that rattle armor.',
    moves: [
      { name: 'Tidal Palm', at: 0, sp: 25, mult: 1.6, fx: 'haymaker' },
      { name: 'Coral Breaker', at: 30, sp: 45, mult: 1.6, pierce: true, fx: 'quake' },
      { name: 'Thousand Wave Fist', at: 80, sp: 80, mult: 2.9, fx: 'seaquake' },
    ],
  },
  scimitar: {
    name: 'Sunset Scimitar', atk: 9, shape: 'curved', pal: { w: '#f2e6c8', G: '#e6b422' }, hit: 'swing', color: '#ffb84a',
    desc: 'A royal blade of Sandora, curved like the dunes.',
    moves: [
      { name: 'Mirage Slash', at: 0, sp: 25, mult: 1.7, fx: 'swing' },
      { name: 'Sandstorm Dance', at: 30, sp: 50, mult: 0.65, hits: 4, fx: 'sandslash' },
      { name: 'Sunset Cleave', at: 80, sp: 80, mult: 3.1, fx: 'crescent', color: '#ff9a3a' },
    ],
  },
  shockshell: {
    name: 'Shock Shell', atk: 8, shape: 'shell', pal: { C: '#f2c7d8', w: '#ffffff' }, hit: 'shot',
    desc: 'A sky-island seashell that stores blasts of force.',
    moves: [
      { name: 'Shell Blast', at: 0, sp: 25, mult: 1.7, fx: 'shot' },
      { name: 'Echo Burst', at: 30, sp: 50, mult: 2.2, stun: 0.25, fx: 'blast' },
      { name: 'Recoil Burst', at: 80, sp: 85, mult: 4.0, recoil: 0.1, fx: 'blast' },
    ],
  },
  nightedge: {
    name: 'Night Edge', atk: 14, shape: 'sword', pal: { w: '#3a3048', G: '#e6b422', n: '#7a2630' }, hit: 'swing', color: '#9a6ae0', logiaHit: true,
    desc: 'A legendary black blade. It cuts right through Logia users.',
    moves: [
      { name: 'Black Crescent', at: 0, sp: 30, mult: 2.0, fx: 'crescent' },
      { name: 'Night Rain', at: 30, sp: 55, mult: 0.6, hits: 5, fx: 'multislash' },
      { name: 'Edge of the World', at: 80, sp: 90, mult: 3.8, fx: 'split' },
    ],
  },
  club: {
    name: "Grizzle's Club", atk: 5, shape: 'club', pal: { n: '#7a4a24' }, hit: 'swing', color: '#e8d9b0',
    desc: 'Heavy, dumb and very effective. Ground Pound can stun.',
    moves: [
      { name: 'Club Smash', at: 0, sp: 25, mult: 1.6, fx: 'smash' },
      { name: 'Ground Pound', at: 30, sp: 45, mult: 1.8, stun: 0.35, fx: 'quake' },
      { name: 'Mountain Crusher', at: 80, sp: 80, mult: 3.0, fx: 'smash' },
    ],
  },
  ironaxe: {
    name: "Ironjaw's Axe", atk: 8, shape: 'axe', pal: { g: '#b8c0cc', n: '#5a3818' }, hit: 'swing',
    desc: 'The captain\'s axe. Made for cleaving.',
    moves: [
      { name: 'Axe Chop', at: 0, sp: 25, mult: 1.7, fx: 'swing' },
      { name: 'Spinning Axe', at: 30, sp: 50, mult: 0.85, hits: 3, fx: 'multislash' },
      { name: 'Iron Cleave', at: 80, sp: 80, mult: 3.0, fx: 'smash' },
    ],
  },
  sawblade: {
    name: 'Shark Saw', atk: 10, shape: 'saw', pal: { w: '#e8e8f0', g: '#9aa4b1', G: '#4a6a9a' }, hit: 'swing', color: '#bfe6ff',
    desc: 'Sharko\'s saw-toothed blade. Shark Bite heals you.',
    moves: [
      { name: 'Saw Slash', at: 0, sp: 25, mult: 1.7, fx: 'swing' },
      { name: 'Shark Bite', at: 30, sp: 45, mult: 0.9, hits: 2, drain: 0.3, fx: 'multislash' },
      { name: 'Shark Torpedo', at: 80, sp: 80, mult: 3.1, fx: 'wave' },
    ],
  },
  goldhook: {
    name: 'Golden Hook', atk: 12, shape: 'hook', pal: { G: '#e6b422', n: '#3a2f2a' }, hit: 'swing', color: '#e6b422',
    desc: 'The Warlord\'s hook. Drains the strength out of anything it grabs.',
    moves: [
      { name: 'Hook Rake', at: 0, sp: 25, mult: 1.8, fx: 'swing' },
      { name: 'Desert Grip', at: 30, sp: 50, mult: 1.5, atkDown: true, drain: 0.25, fx: 'sandslash' },
      { name: 'Desert Blade', at: 80, sp: 85, mult: 3.3, fx: 'sandslash' },
    ],
  },
  thunderstaff: {
    name: 'Thunder Staff', atk: 13, def: 2, shape: 'gstaff', pal: { G: '#e6b422', y: '#fff3a0' }, hit: 'swing', color: '#ffe14a',
    desc: 'A golden staff that crackles with stolen lightning.',
    moves: [
      { name: 'Static Jab', at: 0, sp: 25, mult: 1.8, stun: 0.2, fx: 'swing' },
      { name: 'Lightning Lance', at: 30, sp: 50, mult: 2.4, fx: 'thunder' },
      { name: 'Thunder Judgment', at: 80, sp: 90, mult: 3.6, fx: 'thunder' },
    ],
  },
  kanabo: {
    name: 'Dragon Kanabo', atk: 18, shape: 'kanabo', pal: { g: '#3a3440', w: '#c9ccd6' }, hit: 'swing', color: '#bfe0ff',
    desc: 'The Emperor\'s spiked club. Only a Pirate King could lift it.',
    moves: [
      { name: 'Kanabo Smash', at: 0, sp: 30, mult: 2.0, fx: 'smash' },
      { name: 'Dragon Quake', at: 30, sp: 55, mult: 2.6, fx: 'seaquake' },
      { name: "Emperor's Wrath", at: 80, sp: 95, mult: 4.2, fx: 'split' },
    ],
  },
};

const HAKI = { armament: 10, observation: 20, conqueror: 35 };
const ARMAMENT_SKILL = { name: 'Armament Haki', sp: 30, buff: true, fx: 'armament' };
const CONQUEROR_SKILL = { name: "Conqueror's Will", sp: 60, conq: true, fx: 'conqueror' };

const ITEMS = {
  meat:     { name: 'Meat on the Bone', price: 40, icon: 'meat', desc: '+35 food, +5 energy. Heals 25% in battle.', food: 35, energy: 5, mood: 5, heal: 0.25 },
  bigmeat:  { name: 'Giant Meat', price: 120, icon: 'bigmeat', desc: '+80 food, +15 energy. Heals 55% in battle.', food: 80, energy: 15, mood: 12, heal: 0.55 },
  fish:     { name: 'Grilled Fish', price: 0, icon: 'fish', desc: '+22 food. Heals 15% in battle.', food: 22, energy: 3, mood: 4, heal: 0.15 },
  kingmeat: { name: 'Sea King Steak', price: 0, icon: 'bigmeat', pal: { r: '#3a9a7a', R: '#8ad0b0' }, desc: 'Full food, +30 energy. Heals 70% in battle.', food: 100, energy: 30, mood: 20, heal: 0.7 },
  medicine: { name: 'Medicine', price: 80, icon: 'medicine', desc: 'Heals 50% HP, in or out of battle.', heal: 0.5 },
  cola:     { name: 'Energy Cola', price: 100, icon: 'cola', desc: '+40 energy. In battle: +50 spirit (SP).', energy: 40, sp: 50 },
  water:    { name: 'Water Barrel', price: 150, icon: 'water', desc: 'Battle only. Soaks a Logia so hits connect for 4 turns.', battleOnly: true },
  weights:  { name: 'Training Weights', price: 600, icon: 'weights', desc: 'Permanent: +1 to every training session.', once: true },
  sails:    { name: 'Storm Sails', price: 1200, icon: 'sails', desc: 'Ship upgrade: sailing takes half as long and storms can\'t touch you.', once: true },
  galley:   { name: 'Galley Kitchen', price: 1800, icon: 'galley', desc: 'Ship upgrade: all food restores 25% more.', once: true },
  cannon:   { name: 'Ship Cannon', price: 2500, icon: 'cannon', desc: 'Ship upgrade: blasts raid bosses every turn.', once: true },
};
const BAG_ORDER = ['meat', 'bigmeat', 'fish', 'kingmeat', 'medicine', 'cola', 'water'];

const TRAININGS = {
  atk:  { name: 'Strength', stat: 'ATK', desc: 'Barbell lifts', anim: 'lift' },
  def:  { name: 'Toughness', stat: 'DEF + HP', desc: 'Boulder hold', anim: 'boulder' },
  spd:  { name: 'Speed', stat: 'SPD', desc: 'Beach sprints', anim: 'run' },
  haki: { name: 'Haki', stat: 'HAKI', desc: 'Meditation', anim: 'meditate' },
  drill: { name: 'Drills', stat: 'MASTERY', desc: 'weapon drills', anim: 'drill' },
  fruit: { name: 'Fruit Power', stat: 'MASTERY', desc: 'Devil Fruit practice', anim: 'fruit' },
};

const TALK_LINES = [
  ['KING!', "I'm gonna be the Pirate King! Even if I'm a nobody right now."],
  ['MEAT!', 'Hey cook, MEAT! ...Oh wait.'],
  ['SHISHI', 'Shishishi! This is fun!'],
  ['ADVENTURE', "Let's go find an adventure!"],
  ['HUP!', 'You do a little stretch. Your mood improves.'],
  ['HMM', 'You stare at the horizon dramatically.'],
];
