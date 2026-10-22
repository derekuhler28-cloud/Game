'use strict';
/* Game content: islands, enemies, raid bosses, crew, devil fruits, items. */

const TIME_NAMES = ['Morning', 'Noon', 'Evening', 'Night'];
const TICKS_PER_DAY = 8; // two ticks per time slot; tick 8 = late night

const ISLANDS = [
  {
    name: 'Dawn Village', scene: 'village', enemies: ['seaslug', 'bandit', 'boar'], boss: 'grizzle', recruit: 'kenji',
    shop: ['meat', 'bigmeat', 'medicine', 'cola'],
    intro: 'Windmills, quiet farms and a bandit problem. Every legend starts somewhere.',
    job: 'You fixed the windmill sails for the village chief.',
  },
  {
    name: 'Shell Port', scene: 'marine', enemies: ['recruit', 'dog', 'sergeant'], boss: 'ironjaw', recruit: 'coral',
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'weights', 'sails', 'galley'],
    intro: 'A Marine base town. Captain Ironjaw rules it with an iron... jaw.',
    job: 'You scrubbed the Marine base decks. Nobody recognized you.',
  },
  {
    name: 'Coral Reef Park', scene: 'reef', enemies: ['fishthug', 'crab', 'seapup'], boss: 'sharko', recruit: 'basil',
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'Pink coral and sea-salt air. Fishman pirates took over the floating restaurant.',
    job: 'You washed 400 dishes at the floating restaurant.',
  },
  {
    name: 'Sandora Kingdom', scene: 'desert', enemies: ['sandcroc', 'raider', 'scorpion'], boss: 'sandor', recruit: 'moss',
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'A kingdom drying out. Warlord Sandor is a Logia: hits pass through him unless you use Armament Haki or soak him with Water.',
    job: 'You hauled water barrels across the dunes for thirsty villagers.',
  },
  {
    name: 'Cloud Isle', scene: 'sky', enemies: ['skyguard', 'cloudeel', 'thunderbird'], boss: 'voltz', recruit: 'pip',
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'An island floating on a sea of clouds. Sky God Voltz is pure lightning. Haki is a must.',
    job: 'You ferried cloud-boats for the sky folk.',
  },
  {
    name: 'Last Isle', scene: 'volcano', enemies: ['beastpirate', 'gorilla', 'dragonwhelp'], boss: 'drakko', recruit: null,
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
    name: 'Bandit King Grizzle', lvl: 5, hpMult: 2.2, atkMult: 0.9, bounty: 15000000, berries: 600, scale: 3,
    spr: { kind: 'brute', head: 'grizzle', weapon: 'club', pal: { x: '#b23a3a', h: '#5a3a22', c: '#7a4a2a', C: '#c9a26a', p: '#3a4a2a', s: '#e8b080' } },
    intro: '"Gwahaha! This village pays ME now, brat!"',
    basic: 'Club Swing', charge: 'raises his giant club overhead!', big: 'Mountain Crusher',
    enrage: 'Grizzle roars and goes berserk!',
  },
  ironjaw: {
    name: 'Captain Ironjaw', lvl: 10, hpMult: 2.8, atkMult: 0.95, bounty: 40000000, berries: 1100, scale: 3,
    spr: { kind: 'brute', head: 'ironjaw', weapon: 'axe', pal: { x: '#2f5fb3', c: '#e9edf5', C: '#2f5fb3', p: '#2f5fb3', s: '#e8b080' } },
    intro: '"Justice is whatever I say it is!"',
    basic: 'Axe Chop', charge: 'spins his axe-arm faster and faster!', big: 'Iron Cleave',
    enrage: 'Ironjaw bites down so hard his steel jaw sparks!',
  },
  sharko: {
    name: 'Sawtooth Sharko', lvl: 15, hpMult: 3.5, bounty: 90000000, berries: 2000, scale: 3, heals: true,
    spr: { kind: 'brute', head: 'sharko', pal: { s: '#7ab0c8', h: '#2c3e66', x: '#4a6a9a', g: '#e8e8f0', c: '#e9edf5', C: '#3a7a5a', p: '#2c3e66' } },
    intro: '"Humans are lower than plankton!"',
    basic: 'Saw Slash', charge: 'dives into the water and circles you...', big: 'Shark Torpedo', fx: 'water',
    enrage: 'Sharko\'s eyes go red. Fishman fury!',
  },
  sandor: {
    name: 'Warlord Sandor', lvl: 21, hpMult: 3.9, bounty: 180000000, berries: 3500, scale: 3, logia: 'sand',
    spr: { kind: 'brute', head: 'sandor', weapon: 'hook', pal: { h: '#1b1424', c: '#3a2f2a', C: '#e6b422', p: '#3a2f2a', S: '#a86a4a' } },
    intro: '"Water? In MY desert? Don\'t make me laugh."',
    basic: 'Sand Grip', charge: 'turns his arm into a howling sandstorm!', big: 'Desert Blade', fx: 'sand',
    enrage: 'The whole desert starts to swirl around Sandor!',
  },
  voltz: {
    name: 'Sky God Voltz', lvl: 27, hpMult: 4.3, bounty: 400000000, berries: 6000, scale: 3, logia: 'lightning', element: 'lightning',
    spr: { kind: 'brute', head: 'voltz', pal: { c: '#f3c08c', C: '#f08a3a', p: '#ffffff', f: '#e6b422' } },
    drums: true,
    intro: '"I am GOD. You are an insect who wandered into heaven."',
    basic: 'Lightning Lance', charge: 'gathers a black thundercloud overhead!', big: 'Thunder Judgment', fx: 'bolt',
    enrage: 'Voltz laughs. His drums crackle with ten million volts!',
  },
  drakko: {
    name: 'Emperor Drakko', lvl: 34, hpMult: 5, bounty: 1500000000, berries: 15000, scale: 3,
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

// Skills unlock at levels 1 / 4 / 9.
const SKILL_LEVELS = [1, 4, 9];
const BASE_SKILLS = [
  { name: 'Power Punch', sp: 25, mult: 1.5, fx: 'haymaker' },
  { name: 'Fury Rush', sp: 45, mult: 0.7, hits: 3, fx: 'rush' },
  { name: 'Haymaker', sp: 75, mult: 2.5, fx: 'haymaker' },
];

const FRUITS = {
  rubber: {
    name: 'Rubber-Rubber Fruit', color: '#8e4ec6', color2: '#c48ae8',
    desc: 'Your body stretches like rubber. Lightning can\'t hurt you.',
    skills: [
      { name: 'Rubber Pistol', sp: 25, mult: 1.7, fx: 'arm' },
      { name: 'Rubber Gatling', sp: 45, mult: 0.55, hits: 5, fx: 'gatling' },
      { name: 'Rubber Bazooka', sp: 75, mult: 3.0, fx: 'bazooka' },
    ],
  },
  flame: {
    name: 'Blaze-Blaze Fruit', color: '#f07a2a', color2: '#ffd04a', dodge: 0.12,
    desc: 'Become living fire. Attacks sometimes pass right through you.',
    skills: [
      { name: 'Fire Fist', sp: 30, mult: 2.0, fx: 'fireball' },
      { name: 'Flame Spray', sp: 40, mult: 1.3, burn: 3, fx: 'flamespray' },
      { name: 'Great Blaze', sp: 80, mult: 3.1, fx: 'pillar' },
    ],
  },
  frost: {
    name: 'Frost-Frost Fruit', color: '#5fd3f0', color2: '#e8fbff',
    desc: 'Freeze anything. Ice Age can freeze foes solid for a turn.',
    skills: [
      { name: 'Ice Spear', sp: 25, mult: 1.6, fx: 'icespear' },
      { name: 'Ice Age', sp: 50, mult: 1.0, freeze: true, fx: 'iceage' },
      { name: 'Glacier Drop', sp: 80, mult: 2.9, fx: 'glacier' },
    ],
  },
  quake: {
    name: 'Quake-Quake Fruit', color: '#e8e3d3', color2: '#9aa4b1', defMult: 1.15,
    desc: 'Crack the very air. +15% defense from your sturdy body.',
    skills: [
      { name: 'Quake Punch', sp: 30, mult: 1.9, fx: 'quake' },
      { name: 'Seaquake', sp: 55, mult: 2.3, fx: 'seaquake' },
      { name: 'World Splitter', sp: 90, mult: 3.6, fx: 'split' },
    ],
  },
  smoke: {
    name: 'Smoke-Smoke Fruit', color: '#c9ccd6', color2: '#ffffff', dodge: 0.12,
    desc: 'Drift like smoke. Smoke Bind weakens the enemy\'s attacks.',
    skills: [
      { name: 'White Blow', sp: 25, mult: 1.6, fx: 'smokeblow' },
      { name: 'Smoke Bind', sp: 45, mult: 1.1, atkDown: true, fx: 'smokebind' },
      { name: 'White Launcher', sp: 75, mult: 2.9, fx: 'launcher' },
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
};

const TALK_LINES = [
  ['KING!', "I'm gonna be the Pirate King!"],
  ['MEAT!', 'Hey cook, MEAT! ...Oh wait.'],
  ['SHISHI', 'Shishishi! This is fun!'],
  ['ADVENTURE', "Let's go find an adventure!"],
  ['HUP!', 'You do a little stretch. Your mood improves.'],
  ['HMM', 'You stare at the horizon dramatically.'],
];
