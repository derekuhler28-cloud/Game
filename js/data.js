'use strict';
/* Game content: islands, enemies, raid bosses, crew, devil fruits, items. */

const TIME_NAMES = ['Morning', 'Noon', 'Evening', 'Night'];
const TICKS_PER_DAY = 8; // two ticks per time slot; tick 8 = late night

const ISLANDS = [
  {
    name: 'Dawn Village', scene: 'village', bar: 'Windmill Tavern', enemies: ['seaslug', 'bandit', 'boar'], boss: 'grizzle', weapons: ['cutlass', 'bostaff'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'lanterns', 'paint_red'],
    intro: 'Windmills, quiet farms and a bandit problem. Search trash cans and shaking bushes for a weapon, and visit the Bar to hire a crew. Locals whisper about a strange fruit hidden somewhere...',
    job: 'You fixed the windmill sails for the village chief.',
  },
  {
    name: 'Shell Port', scene: 'marine', bar: 'The Rusty Anchor', enemies: ['recruit', 'dog', 'sergeant'], boss: 'ironjaw', weapons: ['flintlock', 'saber'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'weights', 'sails', 'galley', 'paint_blue', 'bunks'],
    intro: 'A Marine base town. Captain Ironjaw rules it with an iron... jaw.',
    job: 'You scrubbed the Marine base decks. Nobody recognized you.',
  },
  {
    name: 'Orange Town', scene: 'town', bar: 'Big Top Saloon', enemies: ['buggypirate', 'lion', 'acrobat'], boss: 'buggy', weapons: ['knives'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'weights', 'sails', 'galley', 'lanterns', 'fh_lion'],
    intro: 'A town painted orange and emptied by Buggy the Clown. Careful: Buggy splits apart, so blades barely scratch him. Punch, shoot or smash!',
    job: 'You helped the old mayor clean up after a Buggy Ball blast.',
  },
  {
    name: 'Syrup Village', scene: 'syrup', bar: 'Hilltop Pub', enemies: ['blackcat', 'catbrother', 'hypnotist'], boss: 'kuro', weapons: ['chakram'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'weights', 'sails', 'galley', 'cannon', 'fh_ram'],
    intro: 'A sleepy village on a slope. The mansion butler is secretly Captain Kuro, so fast he dodges most attacks. Moves that never miss, stuns and freezes help.',
    job: 'You helped a tall-tale-telling kid paint targets for slingshot practice.',
  },
  {
    name: 'Baratie', scene: 'baratie', bar: 'Baratie Dining Hall', enemies: ['kriegpirate', 'ironwall', 'combatchef'], boss: 'krieg', weapons: ['cleaver'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'weights', 'sails', 'galley', 'cannon', 'aquarium'],
    intro: 'A floating restaurant at sea. Don Krieg wants the ship, and his steel armor shrugs off hits until it cracks.',
    job: 'You washed 400 dishes at the floating restaurant.',
  },
  {
    name: 'Arlong Park', scene: 'reef', bar: 'Tangerine Grove Bar', enemies: ['fishthug', 'crab', 'seapup'], boss: 'arlong', weapons: ['trident', 'wraps'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'fh_shark', 'paint_black'],
    intro: 'Fishman pirates rule this coast from their coral fortress, and Arlong taxes every villager to the bone.',
    job: 'You helped the villagers tend their tangerine groves.',
  },
  {
    name: 'Logue Town', scene: 'logue', bar: 'Gold Roger Tavern', enemies: ['marinecorp', 'marineblade', 'stormgull'], boss: 'smoker', weapons: ['katana'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'nest', 'bunks'],
    intro: 'The town where the Pirate King was born and executed. The Grand Line starts past here, but Captain Smoker guards the harbor. He is made of smoke: use Armament Haki, a Water Barrel or a Seastone weapon.',
    job: 'You swept the square around the old execution platform.',
  },
  {
    name: 'Drum Island', scene: 'drum', bar: "Doctor's Lodge", enemies: ['lapahn', 'drumsoldier', 'yeti'], boss: 'wapol', weapons: ['frostmallet'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'paint_white', 'aquarium'],
    intro: 'A snowy kingdom of drum-shaped mountains. Tin-plated King Wapol eats anything, so bullets and cannonballs vanish down his throat. Fight him up close!',
    job: 'You shoveled snow off the road up to the castle.',
  },
  {
    name: 'Sandora Kingdom', scene: 'desert', bar: 'Oasis Cantina', enemies: ['sandcroc', 'raider', 'scorpion'], boss: 'sandor', weapons: ['scimitar'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'paint_gold'],
    intro: 'A kingdom drying out. Warlord Sandor is a Logia: hits pass through him unless you use Armament Haki or soak him with Water.',
    job: 'You hauled water barrels across the dunes for thirsty villagers.',
  },
  {
    name: 'Cloud Isle', scene: 'sky', bar: 'Cloud Nine Lounge', enemies: ['skyguard', 'cloudeel', 'thunderbird'], boss: 'voltz', weapons: ['shockshell'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'nest', 'fh_swan'],
    intro: 'An island floating on a sea of clouds. Sky God Voltz is pure lightning. Haki is a must.',
    job: 'You ferried cloud-boats for the sky folk.',
  },
  {
    name: 'Water 7', scene: 'water7', bar: 'Blue Station Bar', enemies: ['shipwright', 'frankythug', 'yagara'], boss: 'franky', weapons: ['ropes'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'burst', 'paint_green'],
    intro: 'The city of water, home of the world\'s greatest shipwrights. Cyborg Franky rules the back alleys. He refuels on cola, so his big attacks come twice as often!',
    job: 'You hauled timber for the Galley-La shipwrights.',
  },
  {
    name: 'Enies Lobby', scene: 'enies', bar: 'Justice Canteen', enemies: ['cpagent', 'oimo', 'justiceguard'], boss: 'lucci', weapons: ['funkfreed'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'The island of justice where the sun never sets. CP9\'s Rob Lucci masters the Six Powers: every other turn he hardens his body with Tekkai. Strike between his guards, or use piercing moves!',
    job: 'You filed paperwork for the World Government. Sneaky.',
  },
  {
    name: 'Thriller Bark', scene: 'thriller', bar: 'Ghost Ship Galley', enemies: ['zombie', 'hollow', 'zombiewolf'], boss: 'moria', weapons: ['shusui'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'fh_skull'],
    intro: 'A ghost island wrapped in fog. Gecko Moria steals shadows, and your stolen shadow fights for him: part of every hit you land comes back at you.',
    job: 'You helped a skeleton musician tune his violin.',
  },
  {
    name: 'Sabaody Archipelago', scene: 'sabaody', bar: "Shakky's Rip-off Bar", enemies: ['pacifista', 'auctionguard', 'bubblecrab'], boss: 'kizaru', weapons: ['bubbler'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'coating'],
    intro: 'Giant mangroves that blow bubbles. Admiral Kizaru is a light Logia who dodges at light speed. Buy a Bubble Coating here: your ship needs it to dive to Fish-Man Island.',
    job: 'You helped coat a ship in bubble resin.',
  },
  {
    name: 'Impel Down', scene: 'impel', bar: 'Newkama Land', enemies: ['blugori', 'minotaur', 'jailer'], boss: 'magellan', weapons: ['chains'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'The great underwater prison. Chief Warden Magellan is made of poison: his hits poison you, and the poison hurts every turn.',
    job: 'You scrubbed cells on Level 1. The Crimson Hell was not fun.',
  },
  {
    name: 'Marineford', scene: 'marineford', bar: 'HQ Mess Hall', enemies: ['viceadmiral', 'marineelite', 'marinegiant'], boss: 'akainu', weapons: ['bisento'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'Marine Headquarters, scarred by the great war. Admiral Akainu is a magma Logia, and every blow of his sets you on fire.',
    job: 'You cleared rubble from the frozen bay.',
  },
  {
    name: 'Fish-Man Island', scene: 'fishman', bar: 'Mermaid Cafe', enemies: ['newfishman', 'kraken', 'lanternfish'], boss: 'hody', weapons: ['neptune'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'An island in a bubble 10,000 meters under the sea. Hody Jones gobbles Energy Steroids: when he rages he hits far harder, but the pills hurt him every turn.',
    job: 'You polished coral at the Ryugu Palace.',
  },
  {
    name: 'Punk Hazard', scene: 'punkhazard', bar: 'Biscuit Room', enemies: ['centaur', 'smiley', 'labguard'], boss: 'caesar', weapons: ['kikoku'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'An island half on fire and half frozen. Caesar Clown is a gas Logia who steals the air: your SP drains away every turn.',
    job: 'You helped a group of giant kids escape the lab.',
  },
  {
    name: 'Dressrosa', scene: 'dressrosa', bar: 'Spider Cafe', enemies: ['gladiator', 'toysoldier', 'donquixote'], boss: 'doflamingo', weapons: ['kabuto'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'paint_pink'],
    intro: 'A kingdom of love, passion and toys. Doflamingo traps you in his Birdcage, and the strings cut deeper every turn. Win fast!',
    job: 'You swept the stands of the Corrida Colosseum.',
  },
  {
    name: 'Whole Cake Island', scene: 'wholecake', bar: 'Sweet City Patisserie', enemies: ['chesssoldier', 'homie', 'cookiesoldier'], boss: 'katakuri', weapons: ['napoleon'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon'],
    intro: 'An island made of sweets, ruled by the Big Mom Pirates. Charlotte Katakuri sees the future: he dodges almost everything unless you have Observation Haki.',
    job: 'You taste-tested forty cakes for a tea party.',
  },
  {
    name: 'Last Isle', scene: 'volcano', bar: "Dragon's Den", enemies: ['beastpirate', 'gorilla', 'dragonwhelp'], boss: 'drakko', weapons: ['nightedge'],
    shop: ['meat', 'bigmeat', 'medicine', 'cola', 'water', 'weights', 'sails', 'galley', 'cannon', 'fh_dragon'],
    intro: 'The end of the Grand Line, a land of samurai and dragons. Emperor Drakko guards the legendary treasure.',
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
  buggypirate: { name: 'Buggy Pirate', lvl: 8, spr: { kind: 'human', head: 'bandana', pal: { x: '#d63c2f', h: '#2a2433', c: '#f2f2f2', C: '#3b6fd6', p: '#3b6fd6', m: '#d63c2f' } }, moves: ['Juggling Club', 'Pie to the Face'] },
  lion:     { name: 'Circus Lion', lvl: 9, spr: { kind: 'quad', pal: { c: '#e8a040', C: '#f2c070', h: '#8a4a1a', n: '#5a2a10' } }, moves: ['Maul', 'Ring of Fire Leap'] },
  acrobat:  { name: 'Acrobat Swordsman', lvl: 10, spr: { kind: 'human', head: 'hair', pal: { h: '#e07a3a', c: '#3a7a5a', C: '#e6b422', p: '#2a2433' } }, moves: ['Unicycle Slash', 'Flip Kick'] },
  blackcat: { name: 'Black Cat Pirate', lvl: 11, spr: { kind: 'human', head: 'cap', pal: { x: '#2a2433', w: '#4a4458', c: '#2a2433', C: '#e6b422', p: '#4a4458' } }, moves: ['Cat Scratch', 'Sneak Attack'] },
  catbrother: { name: 'Cat Brother', lvl: 12, spr: { kind: 'brute', head: 'ape', pal: { h: '#2a2433', c: '#4a4458', C: '#e6b422', s: '#c9a26a', p: '#2a2433' } }, moves: ['Cat Pounce', 'Tail Whip'] },
  hypnotist: { name: 'Hypnotist', lvl: 13, spr: { kind: 'human', head: 'hair', pal: { h: '#3a2433', c: '#c94a9a', C: '#ffffff', p: '#2a2433' } }, moves: ['Chakram Toss', 'One, Two... Sleep!'] },
  kriegpirate: { name: 'Krieg Pirate', lvl: 14, spr: { kind: 'human', head: 'bandana', pal: { x: '#5a5a6a', h: '#2a2433', c: '#6a5a4a', C: '#e6b422', p: '#3a3440' } }, moves: ['Cutlass Swing', 'Pistol Shot'] },
  ironwall: { name: 'Iron Wall Guard', lvl: 15, spr: { kind: 'brute', head: 'ape', pal: { h: '#3a3440', c: '#9aa4b1', C: '#e6b422', s: '#e8b080', p: '#3a3440' } }, moves: ['Shield Bash', 'Iron Wall'] },
  combatchef: { name: 'Rogue Chef', lvl: 16, spr: { kind: 'human', head: 'cap', pal: { x: '#ffffff', w: '#ffffff', c: '#ffffff', C: '#2c2c34', p: '#2c2c34', h: '#6a4228' } }, moves: ['Frying Pan', 'Hot Soup'] },
  fishthug: { name: 'Fishman Thug', lvl: 17, spr: { kind: 'brute', head: 'ape', pal: { s: '#6fa8c9', h: '#2c3e66', c: '#e2a64a', C: '#c0453a', p: '#2c3e66' } }, moves: ['Karate Chop', 'Water Shot'] },
  crab:     { name: 'Giant Crab', lvl: 18, spr: { kind: 'crab', pal: { c: '#d8573e', C: '#f29a7a' } }, moves: ['Pinch', 'Bubble Blast'] },
  seapup:   { name: 'Sea King Pup', lvl: 19, spr: { kind: 'serpent', pal: { c: '#5b8fd9', C: '#cfe3f7' } }, moves: ['Bite', 'Tail Whip'] },
  marinecorp: { name: 'Marine Corporal', lvl: 20, spr: { kind: 'human', head: 'cap', pal: { x: '#2f5fb3', c: '#e9edf5', C: '#2f5fb3', p: '#2f5fb3', h: '#3a2a1a' } }, moves: ['Rifle Volley', 'Bayonet Charge'] },
  marineblade: { name: 'Marine Swordswoman', lvl: 21, spr: { kind: 'human', head: 'long', long: true, weapon: 'swords', pal: { h: '#1b1424', c: '#e9edf5', C: '#3b6fd6', p: '#3b6fd6' } }, moves: ['Shigure Slash', 'Steel Edge'] },
  stormgull: { name: 'Storm Gull', lvl: 22, spr: { kind: 'bird', pal: { c: '#e8e8f0', w: '#9aa4b1', y: '#e6b422' } }, flies: true, moves: ['Thunder Dive', 'Gust Peck'] },
  lapahn:   { name: 'Lapahn', lvl: 23, spr: { kind: 'quad', pal: { c: '#f2f2f2', C: '#d8dce8', h: '#f2f2f2', n: '#c94a6a' } }, moves: ['Avalanche Stomp', 'Snow Kick'] },
  drumsoldier: { name: 'Wapol Soldier', lvl: 24, spr: { kind: 'human', head: 'helmet', pal: { x: '#9aa4b1', w: '#c9ccd6', c: '#5a6a8a', C: '#e6b422', p: '#3a4a6a' } }, moves: ['Musket Shot', 'Tin Bash'] },
  yeti:     { name: 'Snow Yeti', lvl: 25, spr: { kind: 'brute', head: 'ape', pal: { h: '#f2f2f2', c: '#f2f2f2', C: '#d8dce8', s: '#9ab0c8', p: '#e8e8f0', f: '#c9ccd6' } }, moves: ['Blizzard Punch', 'Ice Roar'] },
  sandcroc: { name: 'Sand Croc', lvl: 26, spr: { kind: 'serpent', pal: { c: '#a8925a', C: '#e6d39a' } }, moves: ['Death Roll', 'Chomp'] },
  raider:   { name: 'Desert Raider', lvl: 27, spr: { kind: 'human', head: 'turban', pal: { x: '#e8e0c8', h: '#2a2433', c: '#c0453a', C: '#e6b422', p: '#e8e0c8', s: '#c98a5a' } }, moves: ['Scimitar Slash', 'Sand Toss'] },
  scorpion: { name: 'Dune Scorpion', lvl: 28, spr: { kind: 'crab', pal: { c: '#c9963b', C: '#7a5a2a' } }, moves: ['Venom Sting', 'Pinch'] },
  skyguard: { name: 'Sky Guard', lvl: 30, spr: { kind: 'human', head: 'helmet', pal: { x: '#e6b422', w: '#ffffff', c: '#ffffff', C: '#e6b422', p: '#6aa0e0' } }, moves: ['Dial Blast', 'Spear Thrust'] },
  cloudeel: { name: 'Cloud Eel', lvl: 31, spr: { kind: 'serpent', pal: { c: '#e8f0ff', C: '#a9bde8' } }, moves: ['Wrap', 'Static Bite'] },
  thunderbird: { name: 'Thunder Bird', lvl: 32, spr: { kind: 'bird', pal: { c: '#f2d03b', w: '#fff3a8', y: '#e07a2a' } }, flies: true, moves: ['Thunder Peck', 'Gale Wing'] },
  shipwright: { name: 'Galley-La Shipwright', lvl: 33, spr: { kind: 'human', head: 'cap', pal: { x: '#f2f2f2', w: '#e07a3a', h: '#3a2a22', c: '#e07a3a', C: '#f2f2f2', p: '#3a4a6a' } }, moves: ['Hammer Swing', 'Plank Toss'] },
  frankythug: { name: 'Franky Family Thug', lvl: 34, spr: { kind: 'human', head: 'swoop', pal: { h: '#3b6fd6', c: '#f2c27a', C: '#e07a3a', p: '#2a2433' } }, moves: ['Pompadour Rush', 'Cola Bottle'] },
  yagara:   { name: 'Rogue Yagara Bull', lvl: 35, spr: { kind: 'serpent', pal: { c: '#f2d03b', C: '#fff3a8' } }, moves: ['Tail Splash', 'Bull Rush'] },
  cpagent:  { name: 'CP Agent', lvl: 36, spr: { kind: 'human', head: 'hair', pal: { h: '#1b1424', c: '#2a2433', C: '#f2f2f2', p: '#2a2433' } }, moves: ['Finger Pistol', 'Tempest Kick'] },
  oimo:     { name: 'Giant Gatekeeper', lvl: 37, spr: { kind: 'brute', head: 'ape', pal: { h: '#3a2a22', c: '#5a6a8a', C: '#e6b422', s: '#e8b080', p: '#3a4a6a' } }, moves: ['Giant Axe', 'Stomp'] },
  justiceguard: { name: 'Justice Guard', lvl: 38, spr: { kind: 'human', head: 'helmet', pal: { x: '#f2f2f2', w: '#c9ccd6', c: '#3b6fd6', C: '#f2f2f2', p: '#f2f2f2' } }, moves: ['Bayonet', 'Iron Shield'] },
  zombie:   { name: 'Zombie Soldier', lvl: 39, spr: { kind: 'human', head: 'hair', pal: { s: '#8ab88a', S: '#5a8a5a', h: '#3a2a3a', c: '#5a4a6a', C: '#8a7a5a', p: '#3a3440' } }, moves: ['Grave Claw', 'Rotten Bite'] },
  hollow:   { name: 'Negative Hollow', lvl: 40, spr: { kind: 'slug', pal: { c: '#f2f2f8', C: '#c9ccd6', m: '#5a4a6a' } }, flies: true, moves: ['Negative Hollow', 'Ghost Rap'] },
  zombiewolf: { name: 'Zombie Wolf', lvl: 41, spr: { kind: 'quad', pal: { c: '#6a7a6a', C: '#8a9a8a', h: '#4a5a4a', n: '#1b1424' } }, moves: ['Howl', 'Feral Bite'] },
  pacifista: { name: 'Pacifista', lvl: 42, spr: { kind: 'brute', head: 'pacifista', pal: { x: '#1b1424', g: '#9aa4b1', s: '#c98a5a', c: '#3a3440', C: '#f2f2f2', p: '#3a3440' } }, moves: ['Paw Laser', 'Axe Swing'] },
  auctionguard: { name: 'Auction Guard', lvl: 43, spr: { kind: 'human', head: 'tophat', pal: { x: '#1b1424', a: '#1b1424', w: '#e6b422', h: '#3a2a22', c: '#3a3440', C: '#e6b422', p: '#1b1424' } }, moves: ['Slaver Whip', 'Net Throw'] },
  bubblecrab: { name: 'Bubble Crab', lvl: 44, spr: { kind: 'crab', pal: { c: '#9ad8f0', C: '#e8f6ff' } }, moves: ['Bubble Pinch', 'Soap Spray'] },
  blugori:  { name: 'Blugori', lvl: 45, spr: { kind: 'brute', head: 'ape', pal: { h: '#3a6ab8', c: '#3a6ab8', C: '#9ad8f0', s: '#7a9ab8', p: '#2a4a8a' } }, moves: ['Scythe Swing', 'Jail Pound'] },
  minotaur: { name: 'Minotaurus', lvl: 46, spr: { kind: 'brute', head: 'ape', horns: true, pal: { h: '#5a3a22', x: '#f2e6c8', s: '#8a5a32', c: '#8a5a32', C: '#c0453a', p: '#3a2a22' } }, moves: ['Iron Ball Swing', 'Horn Charge'] },
  jailer:   { name: 'Prison Jailer', lvl: 47, spr: { kind: 'human', head: 'cap', pal: { x: '#1b1424', w: '#3a3440', h: '#1b1424', c: '#3a3440', C: '#c0453a', p: '#1b1424' } }, moves: ['Baton Strike', 'Tear Gas'] },
  viceadmiral: { name: 'Vice Admiral', lvl: 48, spr: { kind: 'human', head: 'cap', pal: { x: '#2f5fb3', w: '#f2f2f2', h: '#9aa4b1', c: '#f2f2f2', C: '#2f5fb3', p: '#2f5fb3' } }, moves: ['Justice Fist', 'Moon Walk Kick'] },
  marineelite: { name: 'Marine Elite', lvl: 49, spr: { kind: 'human', head: 'helmet', pal: { x: '#2f5fb3', w: '#f2f2f2', c: '#e9edf5', C: '#2f5fb3', p: '#2f5fb3' } }, moves: ['Rifle Volley', 'Saber Rush'] },
  marinegiant: { name: 'Marine Giant', lvl: 50, spr: { kind: 'brute', head: 'ape', pal: { h: '#3a2a22', c: '#e9edf5', C: '#2f5fb3', s: '#e8b080', p: '#2f5fb3' } }, moves: ['Giant Blade', 'Crushing Step'] },
  newfishman: { name: 'New Fish-Man Pirate', lvl: 51, spr: { kind: 'brute', head: 'ape', pal: { s: '#5a8ab8', h: '#2a3a5a', c: '#2a2433', C: '#c0453a', p: '#2a3a5a' } }, moves: ['Fishman Karate', 'Water Bullet'] },
  kraken:   { name: 'Giant Kraken', lvl: 52, spr: { kind: 'crab', pal: { c: '#9a4ad0', C: '#d9b3ff' } }, moves: ['Tentacle Slam', 'Ink Cloud'] },
  lanternfish: { name: 'Deep-Sea Lanternfish', lvl: 53, spr: { kind: 'serpent', pal: { c: '#2a3a5a', C: '#ffe14a' } }, moves: ['Lure Flash', 'Abyss Bite'] },
  centaur:  { name: 'Centaur Guard', lvl: 54, spr: { kind: 'quad', pal: { c: '#8a5a32', C: '#c98a5a', h: '#3a2a22', n: '#1b1424' } }, moves: ['Spear Charge', 'Hoof Stomp'] },
  smiley:   { name: 'Smiley Slime', lvl: 55, spr: { kind: 'slug', pal: { c: '#c94a9a', C: '#8a2a6a' } }, moves: ['Gas Burst', 'Slime Smother'] },
  labguard: { name: 'Lab Guard', lvl: 56, spr: { kind: 'human', head: 'helmet', marks: ['mask'], pal: { x: '#5a6a7a', w: '#9aa4b1', g: '#3a4a5a', c: '#5a6a7a', C: '#e6b422', p: '#3a4a5a' } }, moves: ['Gas Grenade', 'Stun Baton'] },
  gladiator: { name: 'Gladiator', lvl: 57, spr: { kind: 'human', head: 'helmet', pal: { x: '#e6b422', w: '#c0453a', c: '#8a5a32', C: '#e6b422', p: '#5a3a22' } }, moves: ['Colosseum Strike', 'Shield Bash'] },
  toysoldier: { name: 'Toy Soldier', lvl: 58, spr: { kind: 'human', head: 'cap', pal: { x: '#c0453a', w: '#1b1424', h: '#5a3a22', c: '#c0453a', C: '#e6b422', p: '#2a2433', s: '#e8b080' } }, moves: ['Tin Bayonet', 'March'] },
  donquixote: { name: 'Donquixote Officer', lvl: 59, spr: { kind: 'brute', head: 'ape', pal: { h: '#e6b422', c: '#ff8ab0', C: '#f2f2f2', s: '#e8b080', p: '#3a3440' } }, moves: ['String Shot', 'Stone Fist'] },
  chesssoldier: { name: 'Chess Soldier', lvl: 60, spr: { kind: 'human', head: 'helmet', pal: { x: '#1b1424', w: '#f2f2f2', c: '#f2f2f2', C: '#1b1424', p: '#1b1424' } }, moves: ['Chess Lance', 'Checkmate'] },
  homie:    { name: 'Homie Tree', lvl: 61, spr: { kind: 'brute', head: 'ape', pal: { h: '#3f9a3a', c: '#7a4a24', C: '#5aa846', s: '#a0663a', p: '#5a3a22', f: '#3a2a1a' } }, moves: ['Branch Slap', 'Root Grab'] },
  cookiesoldier: { name: 'Cookie Soldier', lvl: 62, spr: { kind: 'quad', pal: { c: '#c98a5a', C: '#e8b070', h: '#7a4a24', n: '#5a3a22' } }, moves: ['Crumble Bash', 'Sugar Rush'] },
  beastpirate: { name: 'Beast Pirate', lvl: 64, spr: { kind: 'human', head: 'horns', pal: { x: '#e8e0c8', h: '#2a2433', c: '#5a3a7a', C: '#c0453a', p: '#2a2433' } }, moves: ['Club Bash', 'Beast Roar'] },
  gorilla:  { name: 'Iron Gorilla', lvl: 65, spr: { kind: 'brute', head: 'ape', pal: { h: '#3a3440', c: '#3a3440', C: '#5a5262', s: '#9a8a9a', p: '#3a3440', f: '#1b1424' } }, moves: ['Gorilla Punch', 'Chest Pound'] },
  dragonwhelp: { name: 'Dragon Whelp', lvl: 66, spr: { kind: 'serpent', horns: true, pal: { c: '#c94a4a', C: '#f2b25a', x: '#f2e6c8' } }, flies: true, moves: ['Flame Bite', 'Wing Slam'] },
};

// Raid bosses. hpMult scales HP over a normal enemy of the same level.
// Special rules: unsliceable (blades do 15%), dodge (extra dodge chance), armor (damage cut until phase 2), logia.
const BOSSES = {
  grizzle: {
    name: 'Bandit King Grizzle', drop: 'club', lvl: 5, hpMult: 2.2, atkMult: 0.9, bounty: 5000000, berries: 600, scale: 3,
    spr: { kind: 'brute', head: 'grizzle', weapon: 'club', pal: { x: '#b23a3a', h: '#5a3a22', c: '#7a4a2a', C: '#c9a26a', p: '#3a4a2a', s: '#e8b080' } },
    intro: '"Gwahaha! This village pays ME now, brat!"',
    basic: 'Club Swing', charge: 'raises his giant club overhead!', big: 'Mountain Crusher',
    enrage: 'Grizzle roars and goes berserk!',
  },
  ironjaw: {
    name: 'Captain Ironjaw', drop: 'ironaxe', lvl: 10, hpMult: 3.4, atkMult: 0.95, bounty: 10000000, berries: 1000, scale: 3,
    spr: { kind: 'brute', head: 'ironjaw', weapon: 'axe', pal: { x: '#2f5fb3', c: '#e9edf5', C: '#2f5fb3', p: '#2f5fb3', s: '#e8b080' } },
    intro: '"Justice is whatever I say it is!"',
    basic: 'Axe Chop', charge: 'spins his axe-arm faster and faster!', big: 'Iron Cleave',
    enrage: 'Ironjaw bites down so hard his steel jaw sparks!',
  },
  buggy: {
    name: 'Buggy the Clown', drop: 'buggycannon', lvl: 13, hpMult: 3.9, bounty: 15000000, berries: 1300, scale: 3, unsliceable: true,
    spr: { kind: 'brute', head: 'buggy', weapon: 'knives', pal: { x: '#2a2433', w: '#f7f4ea', b: '#3b6fd6', r: '#e0483a', c: '#e07a3a', C: '#f2e6c8', p: '#3b6fd6', s: '#f7e0d0', m: '#c0453a' } },
    intro: '"Did you just laugh at my NOSE?! Flashy execution time!"',
    basic: 'Split-Split Cannon', charge: 'loads a Buggy Ball into his cannon!', big: 'Buggy Ball', fx: 'bomb',
    enrage: 'Buggy splits into pieces, and every piece is FURIOUS!',
  },
  kuro: {
    name: 'Captain Kuro', drop: 'catclaws', lvl: 16, hpMult: 3.9, bounty: 20000000, berries: 1600, scale: 3, dodge: 0.3,
    spr: { kind: 'brute', head: 'kuro', weapon: 'claws', pal: { h: '#1b1424', w: '#d9d9e0', c: '#2a2433', C: '#4a4458', p: '#2a2433', s: '#e8c8a0' } },
    intro: '"Everything is going exactly according to my plan."',
    basic: 'Cat Claw', charge: 'pushes his glasses up with his palm...', big: 'Silent Steps', fx: 'flurry',
    enrage: 'Kuro drops the butler act and moves even faster!',
  },
  krieg: {
    name: 'Don Krieg', drop: 'battlespear', lvl: 19, hpMult: 4.2, bounty: 25000000, berries: 2000, scale: 3, armor: 0.35,
    spr: { kind: 'brute', head: 'krieg', weapon: 'spear', pal: { h: '#1b1424', G: '#e6b422', c: '#e6b422', C: '#b8860b', p: '#3a3440', n: '#7a4a24', g: '#c9ccd6' } },
    intro: '"I am the strongest man in the East Blue! Hand over this ship!"',
    basic: 'Machine Gun Burst', charge: 'pulls on a gas mask...', big: 'MH5 Poison Gas', fx: 'gas',
    enrage: "Krieg's steel armor cracks wide open! Now your hits land.",
  },
  arlong: {
    name: 'Arlong', drop: 'sawblade', lvl: 22, hpMult: 4.7, bounty: 30000000, berries: 2400, scale: 3, heals: true,
    spr: { kind: 'brute', head: 'sharko', pal: { s: '#7ab0c8', h: '#2c3e66', x: '#4a6a9a', g: '#e8e8f0', c: '#e9edf5', C: '#3a7a5a', p: '#2c3e66' } },
    intro: '"Humans are lower than plankton!"',
    basic: 'Saw Slash', charge: 'dives into the water and circles you...', big: 'Shark Torpedo', fx: 'water',
    enrage: "Arlong's eyes go red. Fishman fury!",
  },
  smoker: {
    name: 'Captain Smoker', drop: 'jitte', lvl: 25, hpMult: 5.4, bounty: 40000000, berries: 2800, scale: 3, logia: 'smoke', seastone: true,
    spr: { kind: 'brute', head: 'smoker', weapon: 'jitte', pal: { h: '#e8e8f0', G: '#a0663a', c: '#e9edf5', C: '#e8b080', s: '#e8b080', p: '#3a4a6a', f: '#2a2433' } },
    intro: '"You won\'t reach the Grand Line. This harbor is closed to pirates."',
    basic: 'White Blow', charge: 'breathes out a huge cloud of smoke...', big: 'White Snake', fx: 'smoke',
    enrage: 'Smoker bites down on his two cigars. "Now I\'m serious."',
  },
  wapol: {
    name: 'King Wapol', drop: 'scepter', lvl: 28, hpMult: 5.8, bounty: 60000000, berries: 3200, scale: 3, eatsShots: true,
    spr: { kind: 'brute', head: 'wapol', pal: { h: '#3a7a5a', G: '#e6b422', c: '#c0453a', C: '#f2e6c8', s: '#f2c7a0', p: '#3a3440', g: '#9aa4b1' } },
    intro: '"Munch-munch! I\'ll eat your ship, your crew, and that silly hat!"',
    basic: 'Munch Munch Bite', charge: 'unhinges his metal jaw impossibly wide...', big: 'Baku Baku Chomp', fx: 'chomp',
    enrage: 'Wapol swallows his own cannon and turns into the Wapo-Cannon!',
  },
  sandor: {
    name: 'Warlord Sandor', drop: 'goldhook', lvl: 31, hpMult: 6.0, bounty: 150000000, berries: 3500, scale: 3, logia: 'sand',
    spr: { kind: 'brute', head: 'sandor', weapon: 'hook', pal: { h: '#1b1424', c: '#3a2f2a', C: '#e6b422', p: '#3a2f2a', S: '#a86a4a' } },
    intro: '"Water? In MY desert? Don\'t make me laugh."',
    basic: 'Sand Grip', charge: 'turns his arm into a howling sandstorm!', big: 'Desert Blade', fx: 'sand',
    enrage: 'The whole desert starts to swirl around Sandor!',
  },
  voltz: {
    name: 'Sky God Voltz', drop: 'thunderstaff', lvl: 35, hpMult: 6.6, bounty: 350000000, berries: 6000, scale: 3, logia: 'lightning', element: 'lightning',
    spr: { kind: 'brute', head: 'voltz', pal: { c: '#f3c08c', C: '#f08a3a', p: '#ffffff', f: '#e6b422' } },
    drums: true,
    intro: '"I am GOD. You are an insect who wandered into heaven."',
    basic: 'Lightning Lance', charge: 'gathers a black thundercloud overhead!', big: 'Thunder Judgment', fx: 'bolt',
    enrage: 'Voltz laughs. His drums crackle with ten million volts!',
  },
  franky: {
    name: 'Cyborg Franky', drop: 'colaarm', lvl: 38, hpMult: 7.0, bounty: 380000000, berries: 7000, scale: 3, fastCharge: true,
    spr: { kind: 'brute', head: 'franky', pal: { h: '#3b6fd6', c: '#f2c27a', C: '#e07a3a', s: '#f3c08c', p: '#3b6fd6' } },
    intro: '"SUPER! You wanna fight Franky? Cola-powered and ready to roll!"',
    basic: 'Strong Right', charge: 'chugs three bottles of cola...', big: 'Radical Beam', fx: 'beam',
    enrage: 'Franky slams his forearms together. "Time to get SUPER serious!"',
  },
  lucci: {
    name: 'Rob Lucci', drop: 'rokushiki', lvl: 41, hpMult: 7.2, bounty: 450000000, berries: 8000, scale: 3, tekkai: true,
    spr: { kind: 'brute', head: 'lucci', pal: { x: '#1b1424', h: '#1b1424', c: '#1b1424', C: '#f2f2f2', s: '#e8b080', p: '#1b1424' } },
    phase2: { spr: { kind: 'quad', pal: { c: '#e6b422', C: '#f2d15a', h: '#1b1424', n: '#1b1424' } }, scale: 4, name: 'Leopard Lucci', basic: 'Leopard Claw' },
    intro: '"Justice is whatever the World Government says it is. And you are a criminal."',
    basic: 'Shigan', charge: 'sinks into a Rokushiki stance...', big: 'Rokuogan', fx: 'rokuogan',
    enrage: 'Lucci transforms into a leopard-man! His Tekkai still guards every other turn.',
  },
  moria: {
    name: 'Gecko Moria', drop: 'scissors', lvl: 44, hpMult: 7.4, bounty: 520000000, berries: 9000, scale: 3, reflect: 0.2,
    spr: { kind: 'brute', head: 'moria', pal: { h: '#f08a3a', s: '#9ab0c8', S: '#7a90a8', c: '#3a2a4a', C: '#e6b422', p: '#2a2433' } },
    intro: '"Kishishishi! Your shadow is mine now, and it fights for ME!"',
    basic: 'Shadow Box', charge: 'pulls a thousand shadows into his body...', big: 'Shadows Asgard', fx: 'shadows',
    enrage: 'Moria swells into a giant, packed with a thousand shadows!',
  },
  kizaru: {
    name: 'Admiral Kizaru', drop: 'lightblade', lvl: 47, hpMult: 7.2, bounty: 700000000, berries: 10000, scale: 3, logia: 'light', dodge: 0.18,
    spr: { kind: 'brute', head: 'kizaru', pal: { h: '#5a3a22', G: '#e6b422', c: '#e6b422', C: '#f2f2f2', s: '#e8b080', p: '#e6b422' } },
    intro: '"Ooooh, how scaaary. A rookie coming at an Admiral?"',
    basic: 'Light Kick', charge: 'gathers light at his fingertips...', big: 'Yasakani no Magatama', fx: 'lightrain',
    enrage: '"Speed is weight. Ever been kicked at the speed of light?"',
  },
  magellan: {
    name: 'Magellan', drop: 'venomfang', lvl: 50, hpMult: 7.8, bounty: 800000000, berries: 11000, scale: 3, poison: true,
    spr: { kind: 'brute', head: 'magellan', pal: { x: '#1b1424', h: '#1b1424', c: '#3a3440', C: '#9a4ad0', s: '#e8b080', p: '#1b1424' } },
    intro: '"Nobody escapes Impel Down. ...Excuse me. I need the bathroom first."',
    basic: 'Venom Coat', charge: 'grows a three-headed venom dragon...', big: 'Hydra', fx: 'venom',
    enrage: 'Magellan calls up the Venom Demon: Hell\'s Judgment!',
  },
  akainu: {
    name: 'Admiral Akainu', drop: 'magmagauntlet', lvl: 53, hpMult: 7.6, bounty: 1000000000, berries: 12500, scale: 3, logia: 'magma', scorch: true,
    spr: { kind: 'brute', head: 'akainu', pal: { x: '#f2f2f2', h: '#3a2a22', c: '#c0453a', C: '#f2f2f2', s: '#e8b080', p: '#c0453a' } },
    intro: '"Absolute Justice. Evil must be burned out at the root."',
    basic: 'Magma Fist', charge: 'his fist turns into roaring magma...', big: 'Meteor Volcano', fx: 'magma',
    enrage: 'Akainu\'s whole body boils into magma!',
  },
  hody: {
    name: 'Hody Jones', drop: 'sharkknuckles', lvl: 56, hpMult: 8.2, bounty: 1100000000, berries: 13500, scale: 3, steroids: true,
    spr: { kind: 'brute', head: 'hody', pal: { s: '#9ab0c8', h: '#5a7a98', c: '#3a3440', C: '#c0453a', p: '#3a3440', r: '#d63c2f' } },
    intro: '"The New Fish-Man Pirates will drag you down to the deep!"',
    basic: 'Shark Arrow', charge: 'swallows a handful of Energy Steroids...', big: 'Shark Water Bullets', fx: 'tide',
    enrage: 'Hody pops ten more Energy Steroids! His eyes go bloodshot, and the pills start eating him alive.',
  },
  caesar: {
    name: 'Caesar Clown', drop: 'gaslamp', lvl: 59, hpMult: 7.8, bounty: 1300000000, berries: 15000, scale: 3, logia: 'gas', suffocate: true,
    spr: { kind: 'brute', head: 'caesar', pal: { h: '#2a2433', s: '#c9ccd6', c: '#3a3440', C: '#b06ad0', p: '#5a4a6a' } },
    intro: '"Shurororo! I am the greatest scientist alive! Breathe deep... oh wait, you can\'t!"',
    basic: 'Gas Robe', charge: 'gathers poison gas into a giant slime...', big: 'Shinokuni', fx: 'gasbomb',
    enrage: 'Caesar sucks every bit of oxygen out of the room!',
  },
  doflamingo: {
    name: 'Doflamingo', drop: 'overheat', lvl: 62, hpMult: 8.6, bounty: 1600000000, berries: 17000, scale: 3, birdcage: true,
    spr: { kind: 'brute', head: 'doflamingo', pal: { h: '#f2d15a', g: '#c0453a', c: '#ff8ab0', C: '#f2f2f2', s: '#e8b080', p: '#3a6ab8' } },
    intro: '"Fufufu... Pirates, Marines, kings. Everyone dances on my strings."',
    basic: 'Five Color Strings', charge: 'pulls the Birdcage tighter...', big: 'God Thread', fx: 'strings',
    enrage: 'Doflamingo awakens his fruit: the ground itself turns to string!',
  },
  katakuri: {
    name: 'Charlotte Katakuri', drop: 'mogura', lvl: 65, hpMult: 8.8, bounty: 2000000000, berries: 19000, scale: 3, futureSight: true,
    spr: { kind: 'brute', head: 'katakuri', pal: { h: '#7a2630', x: '#e8d9b0', c: '#3a3440', C: '#7a2630', s: '#e8b080', p: '#3a3440' } },
    intro: '"I already know how this ends. I can see the future."',
    basic: 'Mogura', charge: 'swells his arm into a huge spiked mochi fist...', big: 'Zan Giri Mochi', fx: 'mochi',
    enrage: 'Katakuri unwraps his scarf. His Observation Haki sharpens even further!',
  },
  drakko: {
    name: 'Emperor Drakko', drop: 'kanabo', lvl: 70, hpMult: 9.6, bounty: 4611100000, berries: 30000, scale: 3,
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

// Crew roles: how a hired crewmate fights and what they do for the ship.
// atk scales with your level; a weapon you give them adds to it, and a Devil Fruit adds a power attack.
const ROLES = {
  swordsman: { name: 'Swordsman', atk: 1.1, crit: 0.15, fx: 'slash', call: 'Iron Slash', desc: 'Slashes with frequent critical hits.' },
  sniper:    { name: 'Sniper', atk: 0.9, crit: 0.25, critMult: 2, fx: 'shot', call: 'Sure Shot', desc: 'Long-range trick shots that crit often.' },
  brawler:   { name: 'Brawler', atk: 1.2, fx: 'punch', call: 'Haymaker', desc: 'Plain, hard-hitting punches.' },
  cook:      { name: 'Cook', atk: 1.0, fx: 'kick', call: 'Flame Kick', desc: 'Flaming kicks. Your food restores 50% more.' },
  navigator: { name: 'Navigator', atk: 0.75, weak: 0.3, fx: 'bolt', call: 'Storm Rod', desc: 'Weakens foes. +20% berries, and steers around storms.' },
  doctor:    { name: 'Doctor', atk: 0.6, heal: 1.3, fx: 'heal', call: 'Patch Up', strike: 'Scalpel Toss', desc: 'Patches you up when you are hurt, and joins the attack when you are not.' },
};
const CREW_MAX = 5;

// Hireable at each island's bar (island = index into ISLANDS).
const CREW = {
  rin:   { name: 'Rin', role: 'brawler', race: 'Human', island: 0, cost: 150, spr: { kind: 'human', head: 'hair', pal: { h: '#c0453a', c: '#3b6fd6', C: '#f2f2f2', p: '#2c2c34' } }, join: 'Rin cracks her knuckles. "Finally, someone worth following."' },
  tobi:  { name: 'Tobi', role: 'sniper', race: 'Human', island: 0, cost: 200, spr: { kind: 'human', head: 'bandana', pal: { x: '#3a7a5a', h: '#6a4228', c: '#e9b43a', C: '#7a5a2a', p: '#6a7a3a' } }, join: 'Tobi tips his bandana. "I never miss. Well. Rarely."' },
  kenji: { name: 'Kenji', role: 'swordsman', race: 'Human', island: 1, cost: 400, call: 'Triple Fang', spr: { kind: 'human', head: 'hair', weapon: 'swords', pal: { h: '#46b35a', c: '#f2f2f2', C: '#2c2c34', p: '#2c2c34', f: '#2c2c34' } }, join: 'Kenji sheathes his three blades. "You fight like a lunatic. I\'m in."' },
  gus:   { name: 'Gus', role: 'cook', race: 'Human', island: 1, cost: 350, spr: { kind: 'human', head: 'cap', pal: { x: '#ffffff', w: '#ffffff', c: '#ffffff', C: '#d63c2f', p: '#2c2c34', h: '#6a4228' } }, join: 'Gus the mess cook ties on his apron. "Marine food was a crime anyway."' },
  coral: { name: 'Coral', role: 'navigator', race: 'Human', island: 2, cost: 600, call: 'Storm Rod, Squall', spr: { kind: 'human', head: 'long', long: true, pal: { h: '#f08a3a', c: '#4fa3e0', C: '#ffffff', p: '#e7c07a' } }, join: 'Coral rolls up her map. "Fine. But I\'m in charge of the money."' },
  hana:  { name: 'Hana', role: 'doctor', race: 'Human', island: 2, cost: 650, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#2a2433', c: '#f2c7d8', C: '#ffffff', p: '#e46a9a' } }, join: 'Hana, the circus medic, packs her bag. "Somebody has to stitch you lot up."' },
  pip:   { name: 'Pip', role: 'sniper', race: 'Human', island: 3, cost: 800, call: 'Pepper Star Shot', spr: { kind: 'human', head: 'goggles', pal: { h: '#3a2a22', x: '#8a6a3a', w: '#bfe6ff', c: '#e9b43a', C: '#7a5a2a', p: '#6a7a3a', s: '#c98a5a' } }, join: 'Pip lowers his slingshot. "I have 8,000 followers back home. They\'d want me to join."' },
  nyx:   { name: 'Nyx', role: 'swordsman', race: 'Mink', island: 3, cost: 900, spr: { kind: 'human', head: 'hair', marks: ['minkEars'], pal: { s: '#9a9aa8', S: '#6a6a78', h: '#2a2433', c: '#7a4ac0', C: '#e6b422', p: '#2a2433' } }, join: 'Nyx the cat mink flicks her tail. "Kuro\'s gang was boring. You look fun."' },
  basil: { name: 'Basil', role: 'cook', race: 'Human', island: 4, cost: 1100, call: 'Flambe Kick', spr: { kind: 'human', head: 'swoop', pal: { h: '#f2d15a', c: '#2c2c34', C: '#e8e8e8', p: '#2c2c34' } }, join: 'Basil lights a cigarette. "Someone has to feed this crew properly."' },
  patty: { name: 'Big Patty', role: 'brawler', race: 'Human', island: 4, cost: 1000, spr: { kind: 'brute', head: 'ape', pal: { h: '#2a2433', c: '#ffffff', C: '#d63c2f', s: '#e8b080', p: '#2c2c34' } }, join: 'Big Patty slams down a ladle. "I fight the way I cook: LOUD."' },
  octo:  { name: 'Octo', role: 'swordsman', race: 'Fishman', island: 5, cost: 1500, call: 'Six Sword Style', spr: { kind: 'human', head: 'fin', pal: { s: '#d98a9a', h: '#7a2a4a', x: '#7a2a4a', c: '#e6b422', C: '#2c2c34', p: '#2c2c34' } }, join: 'Octo the octopus fishman juggles six swords. "I was always too nice for Arlong."' },
  shoal: { name: 'Shoal', role: 'brawler', race: 'Fishman', island: 5, cost: 1400, spr: { kind: 'brute', head: 'ape', pal: { s: '#6fa8c9', h: '#2c3e66', c: '#3a7a5a', C: '#e6b422', p: '#2c3e66' } }, join: 'Shoal bows. "Fishman karate is for protecting people. Let me prove it."' },
  tashi: { name: 'Tashi', role: 'swordsman', race: 'Human', island: 6, cost: 2400, call: 'Shigure', spr: { kind: 'human', head: 'long', long: true, weapon: 'swords', pal: { h: '#1b1424', c: '#f2c7d8', C: '#3b6fd6', p: '#3b6fd6' } }, join: 'Tashi pushes up her glasses. "I quit the Marines. I would rather collect famous swords with you."' },
  daddy: { name: 'Daddy', role: 'sniper', race: 'Human', island: 6, cost: 2300, call: 'Dead Eye', spr: { kind: 'human', head: 'cap', pal: { x: '#7a4a24', w: '#7a4a24', h: '#3a2a1a', c: '#3a3440', C: '#e6b422', p: '#5a4a3a' } }, join: 'Daddy spins his rifle. "Bounty hunting is boring. Let\'s go make some trouble."' },
  dalt:  { name: 'Dalt', role: 'brawler', race: 'Zoan', island: 7, cost: 3000, call: 'Bison Charge', spr: { kind: 'brute', head: 'ape', horns: true, pal: { h: '#3a2a22', x: '#f2e6c8', s: '#c98a5a', c: '#5a6a8a', C: '#f2f2f2', p: '#3a3440' } }, join: 'Dalt, the bison-horned captain of the guard, kneels. "Wapol abandoned this island. I will not abandon you."' },
  moss:  { name: 'Moss', role: 'doctor', race: 'Reindeer', island: 7, cost: 2800, call: 'Rumble Bandage', spr: { kind: 'human', head: 'tophat', pal: { x: '#e46a9a', s: '#a0663a', S: '#7a4a2a', h: '#a0663a', c: '#e46a9a', C: '#f2c7d8', p: '#7a4a2a', f: '#4a2a1a', w: '#ffffff', m: '#4a2a1a' } }, join: 'Moss the reindeer doctor hides behind a palm tree. "I-I\'m not happy you asked, you jerk!"' },
  zara:  { name: 'Zara', role: 'swordsman', race: 'Human', island: 8, cost: 3200, spr: { kind: 'human', head: 'turban', pal: { x: '#f2e6c8', h: '#2a2433', c: '#c0453a', C: '#e6b422', s: '#c98a5a', p: '#e8e0c8' } }, join: 'Zara, a royal guard, salutes. "Sandora owes you. So do I."' },
  lina:  { name: 'Lina', role: 'sniper', race: 'Human', island: 8, cost: 3400, call: 'Peacock Slasher', spr: { kind: 'human', head: 'long', long: true, pal: { h: '#5ab8d8', c: '#f2f2f2', C: '#e6b422', p: '#3b6fd6' } }, join: 'Lina, a runaway princess, ties up her hair. "Help me save my kingdom, and I will follow you anywhere."' },
  wyn:   { name: 'Wyn', role: 'sniper', race: 'Skypian', island: 9, cost: 3800, spr: { kind: 'human', head: 'hair', marks: ['wings'], pal: { h: '#f2f2f2', c: '#6aa0e0', C: '#ffffff', p: '#ffffff' } }, join: 'Wyn spins a dial. "Earth below looks fun. Let\'s go."' },
  gale:  { name: 'Gale', role: 'navigator', race: 'Skypian', island: 9, cost: 4000, spr: { kind: 'human', head: 'long', long: true, marks: ['wings'], pal: { h: '#e6b422', c: '#ffffff', C: '#6aa0e0', p: '#6aa0e0' } }, join: 'Gale reads the clouds. "Storms are just weather that hasn\'t met me yet."' },
  rivet: { name: 'Rivet', role: 'brawler', race: 'Cyborg', island: 10, cost: 5800, call: 'Coup de Vent', spr: { kind: 'brute', head: 'ape', pal: { h: '#3b6fd6', c: '#f2c27a', C: '#e07a3a', s: '#f3c08c', p: '#3b6fd6' } }, join: 'Rivet bolts a new plate onto his arm. "A ship that carries dreams needs a SUPER mechanic!"' },
  paula: { name: 'Paula', role: 'navigator', race: 'Human', island: 10, cost: 6000, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#f2d15a', c: '#2a2433', C: '#f2f2f2', p: '#2a2433' } }, join: 'Paula snaps her notebook shut. "I have charted every canal in Water 7. Let me chart the sea."' },
  nosu:  { name: 'Nosu', role: 'swordsman', race: 'Zoan', island: 11, cost: 6600, call: 'Rankyaku: Amanedachi', spr: { kind: 'human', head: 'cap', pal: { x: '#1b1424', w: '#1b1424', h: '#f2a03a', c: '#f2f2f2', C: '#1b1424', p: '#1b1424' } }, join: 'Nosu, a giraffe-man who quit the government, tips his cap. "Freedom suits me better."' },
  lily:  { name: 'Lily', role: 'sniper', race: 'Human', island: 11, cost: 6400, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#3a2a22', c: '#c94a6a', C: '#f2f2f2', p: '#2a2433' } }, join: 'Lily strings her bow. "I will fire a flag at the World Government for you."' },
  bones: { name: 'Bones', role: 'swordsman', race: 'Skeleton', island: 12, cost: 7200, call: 'Soul Solid', spr: { kind: 'human', head: 'hair', pal: { h: '#1b1424', s: '#f2f2f2', S: '#c9ccd6', c: '#1b1424', C: '#e6b422', p: '#1b1424' } }, join: 'Bones the skeleton tips his hat. "May I join your crew? Yohoho! Though I have no ears to hear your answer!"' },
  perri: { name: 'Perri', role: 'navigator', race: 'Human', island: 12, cost: 7000, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#ff8ab0', c: '#1b1424', C: '#c94a6a', p: '#1b1424' } }, join: 'Perri floats a little ghost. "Horohoro! Your ship is cute. I am coming."' },
  duval: { name: 'Duval', role: 'brawler', race: 'Human', island: 13, cost: 7800, spr: { kind: 'brute', head: 'ape', pal: { h: '#f2d15a', c: '#ff8ab0', C: '#f2f2f2', s: '#e8b080', p: '#3a6ab8' } }, join: 'Duval flashes a handsome grin. "Let me protect your ship, like you protected Sabaody."' },
  kimi:  { name: 'Kimi', role: 'cook', race: 'Mermaid', island: 13, cost: 7600, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#5ab8a8', c: '#ff8ab0', C: '#f2f2f2', p: '#5ab8a8' } }, join: 'Kimi the mermaid claps. "I make the best takoyaki under the sea!"' },
  ivo:   { name: 'Ivo', role: 'doctor', race: 'Human', island: 14, cost: 8600, call: 'Hormone Hope', spr: { kind: 'brute', head: 'ape', pal: { h: '#9a4ad0', c: '#ff8ab0', C: '#f2f2f2', s: '#e8b080', p: '#2a2433' } }, join: 'Ivo winks. "Candy boy! My hormones can heal anyone. Hee-haw!"' },
  inazo: { name: 'Inazo', role: 'swordsman', race: 'Human', island: 14, cost: 8400, spr: { kind: 'human', head: 'swoop', pal: { h: '#e8e8f0', c: '#2a2433', C: '#c0453a', p: '#2a2433' } }, join: 'Inazo snaps a pair of scissors. "Scissors cut anything. Even prison walls."' },
  phoenix: { name: 'Phoenix', role: 'doctor', race: 'Zoan', island: 15, cost: 9400, call: 'Blue Flames of Rebirth', spr: { kind: 'human', head: 'swoop', pal: { h: '#f2d15a', c: '#5ab8e8', C: '#f2c27a', p: '#3a3440' } }, join: 'Phoenix bursts into blue flame. "The war is over. Let me heal your crew instead."' },
  jozo:  { name: 'Jozo', role: 'brawler', race: 'Human', island: 15, cost: 9200, call: 'Diamond Punch', spr: { kind: 'brute', head: 'ape', pal: { h: '#3a2a22', c: '#f2f2f2', C: '#9ad8f0', s: '#e8b080', p: '#3a3440' } }, join: 'Jozo turns his fist to diamond. "Nothing gets past me."' },
  jinn:  { name: 'Jinn', role: 'brawler', race: 'Fishman', island: 16, cost: 10000, call: 'Fishman Karate: Vagabond Drill', spr: { kind: 'brute', head: 'ape', pal: { s: '#5a8ab8', h: '#2a2433', c: '#e07a3a', C: '#f2f2f2', p: '#3a3440' } }, join: 'Jinn bows low. "I owe you a debt. A man of the sea repays his debts."' },
  ryu:   { name: 'Ryu', role: 'sniper', race: 'Fishman', island: 16, cost: 9800, spr: { kind: 'human', head: 'fin', pal: { s: '#7ab0c8', h: '#2a3a5a', x: '#2a3a5a', c: '#3a3440', C: '#e6b422', p: '#3a3440' } }, join: 'Ryu, an archerfish fishman, spits a perfect water shot. "Never miss underwater."' },
  trafal: { name: 'Trafal', role: 'doctor', race: 'Human', island: 17, cost: 11000, call: 'Room: Scan', spr: { kind: 'human', head: 'cap', pal: { x: '#f2f2f2', w: '#f2f2f2', h: '#1b1424', c: '#f2d15a', C: '#1b1424', p: '#5a4a3a' } }, join: 'Trafal shoulders his nodachi. "An alliance, then. I am a surgeon, after all."' },
  kine:  { name: 'Kine', role: 'swordsman', race: 'Human', island: 17, cost: 10800, call: 'Foxfire Style', spr: { kind: 'human', head: 'hair', pal: { h: '#1b1424', c: '#3a6ab8', C: '#c0453a', p: '#3a3440' } }, join: 'Kine the samurai bows. "My sword is yours until we reach the land of Wano."' },
  becca: { name: 'Becca', role: 'swordsman', race: 'Human', island: 18, cost: 12000, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#ff8ab0', c: '#c9ccd6', C: '#e6b422', p: '#c9ccd6' } }, join: 'Becca, undefeated in the Colosseum, sheathes her sword. "I fight without hurting anyone. Mostly."' },
  barto: { name: 'Barto', role: 'brawler', race: 'Human', island: 18, cost: 11800, call: 'Barrier Bash', spr: { kind: 'human', head: 'fin', pal: { x: '#5aa846', h: '#5aa846', c: '#2a2433', C: '#e6b422', p: '#2a2433' } }, join: 'Barto bursts into tears. "Senpai! I have been your fan FOREVER!"' },
  puri:  { name: 'Puri', role: 'cook', race: 'Human', island: 19, cost: 13000, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#c9853a', c: '#ff8ab0', C: '#f2f2f2', p: '#7a4a24' } }, join: 'Puri ties on an apron. "My chocolate can make anyone happy. Even you."' },
  pedro: { name: 'Pedro', role: 'swordsman', race: 'Mink', island: 19, cost: 12800, spr: { kind: 'human', head: 'hair', marks: ['minkEars'], pal: { s: '#e6b422', S: '#b8860b', h: '#2a2433', c: '#3a6a3a', C: '#e6b422', p: '#2a2433' } }, join: 'Pedro the jaguar mink draws his sword. "I will guide you to the dawn."' },
  rook:  { name: 'Rook', role: 'brawler', race: 'Human', island: 20, cost: 15000, spr: { kind: 'brute', head: 'grizzle', pal: { x: '#3a3440', h: '#5a3a22', c: '#3a3440', C: '#c0453a', s: '#e8b080', p: '#2a2433' } }, join: 'Rook, a deserter from the Beast Pirates, grins. "Drakko\'s mine to punch."' },
  mei:   { name: 'Mei', role: 'doctor', race: 'Human', island: 20, cost: 15000, spr: { kind: 'human', head: 'long', long: true, pal: { h: '#1b1424', c: '#c0453a', C: '#e6b422', p: '#2a2433' } }, join: 'Mei closes her medical book. "You will need a doctor where you are going."' },
};

// Moves unlock with mastery: use a style in battle, win with it, or do Drills.
const FIST_MOVES = [
  { name: 'Power Punch', at: 10, sp: 25, mult: 1.5, fx: 'powerpunch' },
  { name: 'Fury Rush', at: 40, sp: 45, mult: 0.7, hits: 3, fx: 'rush' },
  { name: 'Haymaker', at: 90, sp: 75, mult: 2.5, fx: 'haymaker' },
];

// Every island hides at least one fruit (shuffled every new game; a few hide a second). Only one can ever be eaten.
// Clothes for your pirate: a hat, a coat and a charm. Each piece comes from one place: a raid boss drops it the
// first time you beat them (boss), an island shop sells it (shop: island index, price), or it hides in an island's
// trash cans and shaking bushes (find: island index). atk/def/spd/hp add to your stats. Perks: crit and dodge
// chance, armor (less damage taken), sp (extra SP every turn), xp, berries and mastery bonuses, and hunger
// (food lasts longer). look: hats swap your head for a HUMAN_HEADS shape (x main, X trim); coats recolor v and
// add marks (z trim); charms add marks (q metal, Q lenses).
const CLOTHES = {
  headband:      { name: 'Cloth Headband', slot: 'hat', shop: 0, price: 150, atk: 1, look: { head: 'headband', pal: { x: '#d63c2f' } } },
  luckycoin:     { name: 'Lucky Coin', slot: 'charm', shop: 0, price: 300, berries: 0.1, look: { marks: ['pendant'], pal: { q: '#e6b422' } } },
  sailorshirt:   { name: 'Sailor Shirt', slot: 'coat', shop: 1, price: 400, def: 2, hp: 10, look: { pal: { v: '#f2f2f2', z: '#2f5fb3' }, marks: ['coatClosed', 'stripes'] } },
  jugglervest:   { name: "Juggler's Vest", slot: 'coat', shop: 2, price: 700, spd: 1, crit: 0.03, look: { pal: { v: '#7a4ac0', z: '#ffe14a' }, marks: ['flowers'] } },
  chefwhites:    { name: "Chef's Whites", slot: 'coat', shop: 4, price: 900, hp: 15, hunger: 0.25, look: { pal: { v: '#f4f4ee' }, marks: ['coatClosed'] } },
  skullbandana:  { name: 'Skull Bandana', slot: 'hat', shop: 6, price: 1200, atk: 3, look: { head: 'bandana', pal: { x: '#2a2433' } } },
  leatherjacket: { name: 'Leather Jacket', slot: 'coat', shop: 6, price: 1600, def: 4, hp: 20, look: { pal: { v: '#6a4428' }, marks: ['coatClosed', 'coatLong'] } },
  furhat:        { name: 'Fur Hat', slot: 'hat', shop: 7, price: 1800, hp: 40, look: { head: 'furhat', pal: { x: '#8a5a3a', X: '#f2eee4' } } },
  turban:        { name: 'Desert Turban', slot: 'hat', shop: 8, price: 2400, spd: 3, look: { head: 'turban', pal: { x: '#f2eee4' } } },
  goggles:       { name: 'Shipwright Goggles', slot: 'hat', shop: 10, price: 3500, mastery: 0.15, look: { head: 'goggles', pal: { x: '#6a4428' } } },
  bubblecharm:   { name: 'Bubble Charm', slot: 'charm', shop: 13, price: 6000, xp: 0.15, look: { marks: ['pendant'], pal: { q: '#bfe6ff' } } },
  gladhelm:      { name: 'Gladiator Helm', slot: 'hat', shop: 18, price: 9000, def: 8, hp: 40, look: { head: 'helmet', pal: { x: '#9aa4b1' } } },
  candychain:    { name: 'Candy Necklace', slot: 'charm', shop: 19, price: 12000, sp: 3, look: { marks: ['necklace'], pal: { q: '#ff8ab0' } } },
  oldcape:       { name: 'Tattered Cape', slot: 'coat', find: 3, hp: 25, look: { pal: { z: '#a0302a' }, marks: ['cape'] } },
  tangerine:     { name: 'Tangerine Charm', slot: 'charm', find: 5, hp: 15, hunger: 0.15, look: { marks: ['pendant'], pal: { q: '#ff9a2a' } } },
  skyscarf:      { name: 'Sky Scarf', slot: 'charm', find: 9, dodge: 0.04, look: { marks: ['scarf'], pal: { q: '#7ad0ff' } } },
  officercoat:   { name: 'Marine Officer Coat', slot: 'coat', find: 11, def: 6, hp: 30, look: { pal: { v: '#f4f4ee' }, marks: ['coatClosed', 'coatLong'] } },
  bandages:      { name: 'Zombie Bandages', slot: 'hat', find: 12, hp: 50, look: { head: 'bandana', pal: { x: '#e8e2d0' } } },
  stripes:       { name: 'Prisoner Stripes', slot: 'coat', find: 14, armor: 0.05, hunger: 0.2, look: { pal: { v: '#f2f2f2', z: '#2a2433' }, marks: ['coatClosed', 'stripes'] } },
  herocap:       { name: "Marine Hero's Cap", slot: 'hat', find: 15, atk: 6, crit: 0.03, look: { head: 'cap', pal: { x: '#2f5fb3' } } },
  pearls:        { name: 'Pearl Necklace', slot: 'charm', find: 16, xp: 0.15, look: { marks: ['necklace'], pal: { q: '#fff6dc' } } },
  hazmat:        { name: 'Hazmat Goggles', slot: 'hat', find: 17, armor: 0.06, hp: 30, look: { head: 'goggles', pal: { x: '#e9b43a' } } },
  beastcape:     { name: 'Beast Pirate Cape', slot: 'coat', find: 20, atk: 10, hp: 50, look: { pal: { z: '#2a2433' }, marks: ['cape'] } },
  banditbandana: { name: 'Bandit Bandana', slot: 'hat', boss: 'grizzle', atk: 2, crit: 0.03, look: { head: 'bandana', pal: { x: '#b23a3a' } } },
  captaincoat:   { name: "Ironjaw's Captain Coat", slot: 'coat', boss: 'ironjaw', def: 3, hp: 15, look: { pal: { v: '#f4f4ee', z: '#2f5fb3' }, marks: ['coatClosed', 'coatLong'] } },
  clownhat:      { name: "Buggy's Captain Hat", slot: 'hat', boss: 'buggy', atk: 2, berries: 0.2, look: { head: 'bicorne', pal: { x: '#d63c2f', X: '#ffe14a' } } },
  kuroglasses:   { name: "Kuro's Glasses", slot: 'charm', boss: 'kuro', spd: 2, dodge: 0.05, look: { marks: ['shades'], pal: { Q: '#bfe6ff' } } },
  goldarmor:     { name: "Krieg's Gold Armor", slot: 'coat', boss: 'krieg', def: 6, armor: 0.08, look: { pal: { v: '#c9a26a', z: '#d63c2f' }, marks: ['armor'] } },
  sharktooth:    { name: 'Shark-Tooth Necklace', slot: 'charm', boss: 'arlong', atk: 4, crit: 0.04, look: { marks: ['necklace'], pal: { q: '#f2f2f2' } } },
  smokerjacket:  { name: "Smoker's Jacket", slot: 'coat', boss: 'smoker', def: 4, hp: 40, look: { pal: { v: '#3a5a8a', z: '#f2eee4' }, marks: ['coatClosed', 'coatLong', 'furCollar'] } },
  wapolcrown:    { name: "Wapol's Crown", slot: 'hat', boss: 'wapol', hp: 30, hunger: 0.3, look: { head: 'crown', pal: { X: '#d63c2f' } } },
  furcoat:       { name: 'Desert King Fur Coat', slot: 'coat', boss: 'sandor', atk: 5, def: 4, look: { pal: { v: '#2a2433', z: '#c9a26a' }, marks: ['coatClosed', 'coatLong', 'furCollar'] } },
  thunderdrums:  { name: 'Thunder Drums', slot: 'charm', boss: 'voltz', sp: 4, look: { marks: ['drums'], pal: { q: '#e6b422' } } },
  supershirt:    { name: 'SUPER Hawaiian Shirt', slot: 'coat', boss: 'franky', spd: 3, hp: 30, look: { pal: { v: '#3a8ad8', z: '#ffe14a' }, marks: ['flowers'] } },
  cp9tophat:     { name: 'CP9 Top Hat', slot: 'hat', boss: 'lucci', spd: 4, dodge: 0.05, look: { head: 'silk', pal: { x: '#2a2433', X: '#f2f2f2' } } },
  shadowcape:    { name: 'Shadow Cape', slot: 'coat', boss: 'moria', hp: 60, armor: 0.08, look: { pal: { z: '#4a2a6a' }, marks: ['cape'] } },
  admiralshades: { name: 'Admiral Shades', slot: 'charm', boss: 'kizaru', spd: 5, crit: 0.06, look: { marks: ['shades'], pal: { Q: '#e6b422' } } },
  wardenhelm:    { name: "Warden's Horned Helm", slot: 'hat', boss: 'magellan', def: 8, armor: 0.08, look: { head: 'helmet', pal: { x: '#5a2a6a' } } },
  admiralcoat:   { name: "Admiral's Coat", slot: 'coat', boss: 'akainu', atk: 8, def: 6, look: { pal: { v: '#c0453a', z: '#f4f4ee' }, marks: ['coatClosed', 'coatLong', 'furCollar'] } },
  fishbandana:   { name: 'New Fish-Man Bandana', slot: 'hat', boss: 'hody', atk: 8, crit: 0.05, look: { head: 'bandana', pal: { x: '#2a6a9a' } } },
  labcoat:       { name: "Caesar's Lab Coat", slot: 'coat', boss: 'caesar', hp: 30, mastery: 0.3, look: { pal: { v: '#f4f4ee', z: '#3a9a9a' }, marks: ['coatClosed', 'coatLong'] } },
  pinkfeathers:  { name: 'Pink Feather Coat', slot: 'coat', boss: 'doflamingo', atk: 9, spd: 5, look: { pal: { v: '#ff8ab0', z: '#ffb0c8' }, marks: ['coatLong', 'furCollar'] } },
  mochiscarf:    { name: "Katakuri's Scarf", slot: 'charm', boss: 'katakuri', spd: 5, dodge: 0.08, look: { marks: ['scarf'], pal: { q: '#7a2a3a' } } },
  dragonhelm:    { name: 'Dragon Horn Helm', slot: 'hat', boss: 'drakko', atk: 12, hp: 80, look: { head: 'horns', pal: { x: '#f2e6c8' } } },
};

const FRUIT_PRICE = 4000;
const FRUITS = {
  rubber: {
    name: 'Rubber-Rubber Fruit', color: '#8e4ec6', color2: '#c48ae8', guard: 0.1,
    desc: 'Your body stretches like rubber: blunt hits bounce off (10% less damage) and lightning can\'t hurt you.',
    awaken: { name: 'Gear 5', look: { h: '#f2f2f2', v: '#f2f2f2', b: '#f2f2f2', e: '#c0453a' }, moves: [{ name: 'Toon Force', sp: 45, mult: 3.2, stun: 0.6, fx: 'toonforce' }, { name: 'Bajrang Gun', sp: 70, mult: 5.2, fx: 'bajrang' }] },
    moves: [
      { name: 'Rubber Pistol', at: 0, sp: 25, mult: 1.7, fx: 'arm' },
      { name: 'Rubber Gatling', at: 40, sp: 45, mult: 0.55, hits: 5, fx: 'gatling' },
      { name: 'Rubber Bazooka', at: 120, sp: 75, mult: 3.0, fx: 'bazooka' },
    ],
  },
  flame: {
    name: 'Flame-Flame Fruit', color: '#f07a2a', color2: '#ffd04a', dodge: 0.12,
    desc: 'Become living fire. Attacks sometimes pass right through you.',
    awaken: { name: 'Flame Emperor', look: { h: '#ff9a3a', v: '#ff5a2a', b: '#3a2a22' }, moves: [{ name: 'Firefly Swarm', sp: 45, mult: 3.0, burn: 3, fx: 'fireflies' }, { name: 'Entei', sp: 70, mult: 5.0, fx: 'entei' }] },
    moves: [
      { name: 'Fire Fist', at: 0, sp: 30, mult: 2.0, fx: 'fireball' },
      { name: 'Flame Spray', at: 40, sp: 40, mult: 1.3, burn: 3, fx: 'flamespray' },
      { name: 'Great Blaze', at: 120, sp: 80, mult: 3.1, fx: 'pillar' },
    ],
  },
  frost: {
    name: 'Frost-Frost Fruit', color: '#5fd3f0', color2: '#e8fbff',
    desc: 'Freeze anything. Ice Age can freeze foes solid for a turn.',
    awaken: { name: 'Ice Age Lord', look: { h: '#bff2ff', v: '#5fd3f0', b: '#e8fbff' }, moves: [{ name: 'Ice Time Capsule', sp: 45, mult: 3.0, freeze: true, fx: 'icecapsule' }, { name: 'Frozen World', sp: 70, mult: 4.9, fx: 'frozenworld' }] },
    moves: [
      { name: 'Ice Spear', at: 0, sp: 25, mult: 1.6, fx: 'icespear' },
      { name: 'Ice Age', at: 40, sp: 50, mult: 1.0, freeze: true, fx: 'iceage' },
      { name: 'Glacier Drop', at: 120, sp: 80, mult: 2.9, fx: 'glacier' },
    ],
  },
  quake: {
    name: 'Quake-Quake Fruit', color: '#e8e3d3', color2: '#9aa4b1', defMult: 1.15,
    desc: 'Crack the very air. +15% defense from your sturdy body.',
    awaken: { name: 'World Shaker', look: { h: '#e8e3d3', v: '#f2f2f2', b: '#9aa4b1' }, moves: [{ name: 'Sky Crack', sp: 45, mult: 3.3, fx: 'skycrack' }, { name: 'Island Shaker', sp: 70, mult: 5.3, fx: 'islandshaker' }] },
    moves: [
      { name: 'Quake Punch', at: 0, sp: 30, mult: 1.9, fx: 'quake' },
      { name: 'Seaquake', at: 40, sp: 55, mult: 2.3, fx: 'seaquake' },
      { name: 'World Splitter', at: 120, sp: 90, mult: 3.6, fx: 'split' },
    ],
  },
  smoke: {
    name: 'Smoke-Smoke Fruit', color: '#c9ccd6', color2: '#ffffff', dodge: 0.12,
    desc: 'Drift like smoke. Smoke Bind weakens the enemy\'s attacks.',
    awaken: { name: 'Smoke Leviathan', look: { h: '#f2f2f2', v: '#c9ccd6', b: '#5a6a7a' }, moves: [{ name: 'Smoke Prison', sp: 45, mult: 2.8, atkDown: true, stun: 0.4, fx: 'smokeprison' }, { name: 'White Leviathan', sp: 70, mult: 4.9, fx: 'smokeserpent' }] },
    moves: [
      { name: 'White Blow', at: 0, sp: 25, mult: 1.6, fx: 'smokeblow' },
      { name: 'Smoke Bind', at: 40, sp: 45, mult: 1.1, atkDown: true, fx: 'smokebind' },
      { name: 'White Launcher', at: 120, sp: 75, mult: 2.9, fx: 'launcher' },
    ],
  },
  light: {
    name: 'Light-Light Fruit', color: '#fff3a0', color2: '#ffd04a', dodge: 0.12,
    desc: 'Become living light. Blinding speed, and attacks sometimes pass right through you.',
    awaken: { name: 'Speed of Light', look: { h: '#fff3a0', v: '#ffd04a', b: '#fff3a0' }, moves: [{ name: 'Sacred Yasakani', sp: 50, mult: 0.55, hits: 8, fx: 'yasakani' }, { name: 'Ama no Murakumo', sp: 70, mult: 5.0, sure: true, fx: 'lightsword' }] },
    moves: [
      { name: 'Flash Kick', at: 0, sp: 25, mult: 1.8, sure: true, fx: 'lightkick' },
      { name: 'Light Rain', at: 40, sp: 50, mult: 0.5, hits: 6, fx: 'lightrain' },
      { name: 'Solar Lance', at: 120, sp: 85, mult: 3.3, fx: 'beam' },
    ],
  },
  dough: {
    name: 'Dough-Dough Fruit', color: '#efe2c8', color2: '#c9a26a', guard: 0.12,
    desc: 'A squishy, sticky body that soaks up hits (12% less damage). Sticky Snare traps foes.',
    awaken: { name: 'Awakened Dough', look: { h: '#7a2630', v: '#efe2c8', b: '#3a3440' }, moves: [{ name: 'Dough World', sp: 45, mult: 3.0, stun: 0.6, fx: 'doughworld' }, { name: 'Heavenly Pestle', sp: 70, mult: 5.1, fx: 'pestle' }] },
    moves: [
      { name: 'Dough Fist', at: 0, sp: 25, mult: 1.7, fx: 'doughfist' },
      { name: 'Sticky Snare', at: 40, sp: 45, mult: 1.1, stun: 0.6, fx: 'doughsnare' },
      { name: 'Dough Avalanche', at: 120, sp: 80, mult: 3.0, fx: 'doughavalanche', color: '#e8dcc8' },
    ],
  },
  dragon: {
    name: 'Dragon-Dragon Fruit', color: '#4a8ad9', color2: '#bfe0ff', hpBonus: 0.2, form: true,
    desc: 'A mythical Zoan. You become half human, half azure dragon for good, and turn fully into the dragon to attack. +20% max HP.',
    awaken: { name: 'Azure Emperor', look: { h: '#4a8ad9', v: '#bfe0ff', b: '#2a4a8a' }, moves: [{ name: 'Thunder Bagua', sp: 45, mult: 3.4, stun: 0.3, fx: 'thunderbagua' }, { name: 'Bolo Breath', sp: 70, mult: 5.2, fx: 'bolobreath' }] },
    moves: [
      { name: 'Dragon Claw', at: 0, sp: 25, mult: 1.8, fx: 'dragonclaw', color: '#bfe0ff' },
      { name: 'Blaze Breath', at: 40, sp: 50, mult: 1.5, burn: 3, fx: 'breath' },
      { name: 'Dragon Twister', at: 120, sp: 90, mult: 3.5, fx: 'twister' },
    ],
  },
  split: {
    name: 'Split-Split Fruit', color: '#e8504a', color2: '#3b6fd6', dodge: 0.1,
    desc: 'Split your body into flying pieces, so attacks sometimes miss you. Split Bomb blows up in their face.',
    awaken: { name: 'Flashy Festival', look: { h: '#3b6fd6', v: '#e8504a', b: '#3b6fd6' }, moves: [{ name: 'Grand Parade', sp: 50, mult: 0.65, hits: 6, fx: 'grandparade' }, { name: 'Muggy Ball', sp: 70, mult: 5.0, fx: 'muggyball' }] },
    moves: [
      { name: 'Split Cannon', at: 0, sp: 25, mult: 1.7, fx: 'splitfist' },
      { name: 'Split Festival', at: 40, sp: 50, mult: 0.5, hits: 6, fx: 'festival' },
      { name: 'Split Bomb', at: 120, sp: 80, mult: 3.0, fx: 'bomb' },
    ],
  },
  magma: {
    name: 'Magma-Magma Fruit', color: '#ff5a2a', color2: '#5a1a1a', dodge: 0.12,
    desc: 'Become molten rock, the hottest Logia. Magma sets foes on fire.',
    awaken: { name: 'Volcano Lord', look: { h: '#5a1a1a', v: '#c0301a', b: '#1b1424' }, moves: [{ name: 'Inugami Guren', sp: 45, mult: 3.2, burn: 2, fx: 'magmahound' }, { name: 'Great Eruption', sp: 70, mult: 4.8, burn: 3, fx: 'eruption' }] },
    moves: [
      { name: 'Magma Fist', at: 0, sp: 30, mult: 2.0, burn: 2, fx: 'magmafist' },
      { name: 'Meteor Shower', at: 40, sp: 55, mult: 0.8, hits: 4, burn: 3, fx: 'meteor' },
      { name: 'Lava Flood', at: 120, sp: 90, mult: 3.4, fx: 'lavaflood', color: '#ff5a2a' },
    ],
  },
  string: {
    name: 'String-String Fruit', color: '#f2f2f2', color2: '#c94ac9',
    desc: 'Make razor-sharp strings. Puppet Strings can freeze a foe in place.',
    awaken: { name: 'Awakened Strings', look: { h: '#f2d15a', v: '#ff8ab0', b: '#f2f2f2' }, moves: [{ name: 'String Tsunami', sp: 45, mult: 3.0, stun: 0.5, fx: 'stringwave' }, { name: 'God Thread', sp: 70, mult: 5.1, pierce: true, fx: 'godthread' }] },
    moves: [
      { name: 'Five Color Strings', at: 0, sp: 25, mult: 0.45, hits: 5, fx: 'strings' },
      { name: 'Puppet Strings', at: 40, sp: 45, mult: 1.1, stun: 0.65, fx: 'puppet', color: '#f2f2f2' },
      { name: 'Birdcage', at: 120, sp: 85, mult: 3.3, fx: 'cage' },
    ],
  },
  paw: {
    name: 'Paw-Paw Fruit', color: '#5a4a7a', color2: '#d9b3ff', guard: 0.1,
    desc: 'Paw pads on your palms repel anything, even part of every hit (10% less damage).',
    awaken: { name: 'Ursus Awakening', look: { h: '#1b1424', v: '#3a3440', b: '#1b1424' }, moves: [{ name: 'Pain Bubble', sp: 45, mult: 3.0, drain: 0.3, fx: 'painbubble' }, { name: 'Ursus Supernova', sp: 70, mult: 5.3, fx: 'supernova' }] },
    moves: [
      { name: 'Pad Cannon', at: 0, sp: 25, mult: 1.8, fx: 'pawcannon' },
      { name: 'Pressure Repel', at: 40, sp: 50, mult: 1.5, stun: 0.4, fx: 'repel' },
      { name: 'Bear Shock', at: 120, sp: 90, mult: 3.5, fx: 'bearshock' },
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
    move: { name: 'Electro Claw', at: 0, sp: 25, mult: 1.6, stun: 0.3, fx: 'electroclaw' },
  },
  skypian: {
    name: 'Skypian', desc: 'Winged folk from the islands above the clouds. Nimble and handy with dials.',
    perks: ['Wings: +10% dodge', 'Dial tech: +4 SP every turn', 'Impact Dial move from day one'],
    flaws: ['Light frame: 15% less max HP'],
    stats: { hpMult: 0.85 },
    move: { name: 'Impact Dial', at: 0, sp: 30, mult: 2.1, recoil: 0.05, fx: 'impactdial' },
  },
  fishman: {
    name: 'Fishman', desc: 'Born under the sea with ten times the strength of a human.',
    perks: ['+4 ATK, +15 max HP', 'Fishman Karate from day one (ignores defense)', 'Born swimmer: fishing pays 30% more'],
    flaws: ['Slow on land: -2 SPD', 'Dries out: -10% damage on Sandora and Cloud Isle'],
    stats: { atk: 4, hp: 15, spd: -2 },
    move: { name: 'Fishman Karate', at: 0, sp: 25, mult: 1.5, pierce: true, fx: 'fishkarate' },
  },
};

// Weapons hide on islands (ISLANDS[].weapons) or drop from raid bosses (BOSSES[].drop).
// `shape` picks the hand-held sprite, `hit` the basic attack effect, `color` the slash color.
const WEAPONS = {
  cutlass: {
    name: 'Rusty Cutlass', atk: 3, shape: 'sword', pal: { w: '#c8bca4', G: '#8a6a3a' }, hit: 'swing',
    desc: 'A chipped blade from a shipwreck. Better than nothing!',
    moves: [
      { name: 'Rusty Slash', at: 0, sp: 20, mult: 1.45, fx: 'rustyslash' },
      { name: 'Double Cut', at: 30, sp: 40, mult: 0.85, hits: 2, fx: 'multislash' },
      { name: 'Flying Slash', at: 80, sp: 70, mult: 2.4, fx: 'crescent' },
    ],
  },
  bostaff: {
    name: 'Oak Bo Staff', atk: 2, def: 2, shape: 'staff', pal: { n: '#9a6a3a' }, hit: 'swing', color: '#e8d9b0',
    desc: 'A sturdy staff. Good reach, and it can daze enemies.',
    moves: [
      { name: 'Staff Sweep', at: 0, sp: 20, mult: 1.3, stun: 0.3, fx: 'staffsweep' },
      { name: 'Pole Vault Strike', at: 30, sp: 45, mult: 1.9, fx: 'polevault' },
      { name: 'Whirlwind', at: 80, sp: 70, mult: 0.6, hits: 4, fx: 'whirlwind' },
    ],
  },
  flintlock: {
    name: 'Flintlock Pistol', atk: 4, shape: 'gun', pal: { g: '#5a5a6a', n: '#7a4a24' }, hit: 'shot',
    desc: 'One shot at a time, but its special moves never miss.',
    moves: [
      { name: 'Quick Draw', at: 0, sp: 20, mult: 1.4, sure: true, fx: 'quickdraw' },
      { name: 'Trick Shot', at: 30, sp: 40, mult: 1.6, crit: 0.4, sure: true, fx: 'trickshot' },
      { name: 'Point Blank', at: 80, sp: 75, mult: 2.8, fx: 'blast' },
    ],
  },
  saber: {
    name: 'Marine Saber', atk: 6, shape: 'sword', pal: { w: '#e8edf5', G: '#2f5fb3' }, hit: 'swing',
    desc: 'Standard Marine issue. Polished and sharp.',
    moves: [
      { name: 'Iron Rule Slash', at: 0, sp: 25, mult: 1.6, fx: 'ironrule' },
      { name: 'Saber Flurry', at: 30, sp: 45, mult: 0.75, hits: 3, fx: 'saberflurry' },
      { name: 'Justice Crescent', at: 80, sp: 75, mult: 2.7, fx: 'justice', color: '#9ad0ff' },
    ],
  },
  trident: {
    name: 'Coral Trident', atk: 10, shape: 'trident', pal: { w: '#ff7a9a', n: '#c98a5a' }, hit: 'swing', color: '#ff9ab0',
    desc: 'Pulls the sea with it. Riptide soaks Logia users so your hits connect.',
    moves: [
      { name: 'Trident Thrust', at: 0, sp: 25, mult: 1.6, fx: 'tridentthrust' },
      { name: 'Riptide', at: 30, sp: 40, mult: 1.2, wet: true, fx: 'wave' },
      { name: 'Tsunami Spear', at: 80, sp: 80, mult: 3.0, fx: 'tsunamispear' },
    ],
  },
  wraps: {
    name: 'Karate Wraps', atk: 8, def: 3, shape: null, hit: 'punch',
    desc: 'Fishman karate hand wraps. Strikes that rattle armor.',
    moves: [
      { name: 'Tidal Palm', at: 0, sp: 25, mult: 1.6, fx: 'tidalpalm' },
      { name: 'Coral Breaker', at: 30, sp: 45, mult: 1.6, pierce: true, fx: 'coralbreaker' },
      { name: 'Thousand Wave Fist', at: 80, sp: 80, mult: 2.9, fx: 'thousandwave' },
    ],
  },
  scimitar: {
    name: 'Sunset Scimitar', atk: 14, shape: 'curved', pal: { w: '#f2e6c8', G: '#e6b422' }, hit: 'swing', color: '#ffb84a',
    desc: 'A royal blade of Sandora, curved like the dunes.',
    moves: [
      { name: 'Mirage Slash', at: 0, sp: 25, mult: 1.7, fx: 'mirage' },
      { name: 'Sandstorm Dance', at: 30, sp: 50, mult: 0.65, hits: 4, fx: 'sandslash' },
      { name: 'Sunset Cleave', at: 80, sp: 80, mult: 3.1, fx: 'sunsetcleave', color: '#ff9a3a' },
    ],
  },
  shockshell: {
    name: 'Shock Shell', atk: 15, shape: 'shell', pal: { C: '#f2c7d8', w: '#ffffff' }, hit: 'shot',
    desc: 'A sky-island seashell that stores blasts of force.',
    moves: [
      { name: 'Shell Blast', at: 0, sp: 25, mult: 1.7, fx: 'shellblast' },
      { name: 'Echo Burst', at: 30, sp: 50, mult: 2.2, stun: 0.25, fx: 'echoburst' },
      { name: 'Recoil Burst', at: 80, sp: 85, mult: 4.0, recoil: 0.1, fx: 'recoilburst' },
    ],
  },
  nightedge: {
    name: 'Night Edge', atk: 30, shape: 'sword', pal: { w: '#3a3048', G: '#e6b422', n: '#7a2630' }, hit: 'swing', color: '#9a6ae0', logiaHit: true,
    desc: 'A legendary black blade. It cuts right through Logia users.',
    moves: [
      { name: 'Black Crescent', at: 0, sp: 30, mult: 2.0, fx: 'blackcrescent' },
      { name: 'Night Rain', at: 30, sp: 55, mult: 0.6, hits: 5, fx: 'nightrain' },
      { name: 'Edge of the World', at: 80, sp: 90, mult: 3.8, fx: 'edgeworld' },
    ],
  },
  club: {
    name: "Grizzle's Club", atk: 5, shape: 'club', pal: { n: '#7a4a24' }, hit: 'swing', color: '#e8d9b0',
    desc: 'Heavy, dumb and very effective. Ground Pound can stun.',
    moves: [
      { name: 'Club Smash', at: 0, sp: 25, mult: 1.6, fx: 'smash' },
      { name: 'Ground Pound', at: 30, sp: 45, mult: 1.8, stun: 0.35, fx: 'groundpound' },
      { name: 'Mountain Crusher', at: 80, sp: 80, mult: 3.0, fx: 'mountaincrusher' },
    ],
  },
  ironaxe: {
    name: "Ironjaw's Axe", atk: 8, shape: 'axe', pal: { g: '#b8c0cc', n: '#5a3818' }, hit: 'swing',
    desc: 'The captain\'s axe. Made for cleaving.',
    moves: [
      { name: 'Axe Chop', at: 0, sp: 25, mult: 1.7, fx: 'axechop' },
      { name: 'Spinning Axe', at: 30, sp: 50, mult: 0.85, hits: 3, fx: 'spinaxe' },
      { name: 'Iron Cleave', at: 80, sp: 80, mult: 3.0, fx: 'ironcleave' },
    ],
  },
  sawblade: {
    name: 'Shark Saw', atk: 12, shape: 'saw', pal: { w: '#e8e8f0', g: '#9aa4b1', G: '#4a6a9a' }, hit: 'swing', color: '#bfe6ff',
    desc: 'Sharko\'s saw-toothed blade. Shark Bite heals you.',
    moves: [
      { name: 'Saw Slash', at: 0, sp: 25, mult: 1.7, fx: 'sawslash' },
      { name: 'Shark Bite', at: 30, sp: 45, mult: 0.9, hits: 2, drain: 0.3, fx: 'sharkbite' },
      { name: 'Shark Torpedo', at: 80, sp: 80, mult: 3.1, fx: 'sharktorpedo' },
    ],
  },
  goldhook: {
    name: 'Golden Hook', atk: 15, shape: 'hook', pal: { G: '#e6b422', n: '#3a2f2a' }, hit: 'swing', color: '#e6b422',
    desc: 'The Warlord\'s hook. Drains the strength out of anything it grabs.',
    moves: [
      { name: 'Hook Rake', at: 0, sp: 25, mult: 1.8, fx: 'hookrake' },
      { name: 'Desert Grip', at: 30, sp: 50, mult: 1.5, atkDown: true, drain: 0.25, fx: 'desertgrip' },
      { name: 'Desert Blade', at: 80, sp: 85, mult: 3.3, fx: 'desertblade' },
    ],
  },
  thunderstaff: {
    name: 'Thunder Staff', atk: 17, def: 2, shape: 'gstaff', pal: { G: '#e6b422', y: '#fff3a0' }, hit: 'swing', color: '#ffe14a',
    desc: 'A golden staff that crackles with stolen lightning.',
    moves: [
      { name: 'Static Jab', at: 0, sp: 25, mult: 1.8, stun: 0.2, fx: 'staticjab' },
      { name: 'Lightning Lance', at: 30, sp: 50, mult: 2.4, fx: 'lightninglance' },
      { name: 'Thunder Judgment', at: 80, sp: 90, mult: 3.6, fx: 'thunder' },
    ],
  },
  kanabo: {
    name: 'Dragon Kanabo', atk: 33, shape: 'kanabo', pal: { g: '#3a3440', w: '#c9ccd6' }, hit: 'swing', color: '#bfe0ff',
    desc: 'The Emperor\'s spiked club. Only a Pirate King could lift it.',
    moves: [
      { name: 'Kanabo Smash', at: 0, sp: 30, mult: 2.0, fx: 'kanabosmash' },
      { name: 'Dragon Quake', at: 30, sp: 55, mult: 2.6, fx: 'dragonquake' },
      { name: "Emperor's Wrath", at: 80, sp: 95, mult: 4.2, fx: 'emperorwrath' },
    ],
  },
  katana: {
    name: 'Meito Katana', atk: 12, shape: 'sword', pal: { w: '#e8eef8', G: '#5a3a7a', n: '#3a2a5a' }, hit: 'swing', color: '#c8b0ff',
    desc: 'A famous blade found in a Logue Town sword shop. Light, fast and deadly.',
    moves: [
      { name: 'Shigure Draw', at: 0, sp: 25, mult: 1.8, critBonus: 0.1, fx: 'shigure' },
      { name: 'Twin Moon Flash', at: 30, sp: 50, mult: 1.25, hits: 2, fx: 'twinmoon' },
      { name: 'Lion Song', at: 80, sp: 80, mult: 3.2, crit: 0.2, fx: 'lionsong' },
    ],
  },
  jitte: {
    name: 'Seastone Jitte', atk: 13, shape: 'jitte', pal: { g: '#5a6a7a', w: '#9ab0c8', G: '#3a4a6a' }, hit: 'swing', color: '#9ab0c8', logiaHit: true,
    desc: 'Smoker\'s jitte, tipped with seastone. It hits Logias, and Devil Fruit users hate it.',
    moves: [
      { name: 'Jitte Jab', at: 0, sp: 25, mult: 1.8, fx: 'jittejab' },
      { name: 'Seastone Pin', at: 30, sp: 50, mult: 1.4, stun: 0.55, fx: 'seastonepin' },
      { name: 'White Out', at: 80, sp: 85, mult: 3.3, fx: 'whiteout' },
    ],
  },
  frostmallet: {
    name: 'Frost Mallet', atk: 13, def: 2, shape: 'hammer', pal: { g: '#9ad8f0', w: '#ffffff', n: '#5a6a8a' }, hit: 'swing', color: '#bff2ff',
    desc: 'A war hammer from Drum Island, frosted with ice that never melts.',
    moves: [
      { name: 'Frost Smash', at: 0, sp: 25, mult: 1.8, fx: 'frostsmash' },
      { name: 'Snowslide', at: 30, sp: 50, mult: 1.2, freeze: true, fx: 'snowslide' },
      { name: 'Avalanche Drop', at: 80, sp: 85, mult: 3.4, fx: 'avalanche' },
    ],
  },
  scepter: {
    name: 'Royal Scepter', atk: 14, shape: 'scepter', pal: { G: '#e6b422', r: '#d63c2f', w: '#ffffff' }, hit: 'swing', color: '#ffe14a',
    desc: 'King Wapol\'s golden scepter. Heavy, gaudy, and surprisingly sturdy.',
    moves: [
      { name: 'Royal Decree', at: 0, sp: 25, mult: 1.9, fx: 'royaldecree' },
      { name: 'Tin Plate Barrage', at: 30, sp: 50, mult: 0.75, hits: 3, fx: 'tinbarrage' },
      { name: 'Kingdom Crusher', at: 80, sp: 90, mult: 3.6, fx: 'kingdomcrusher' },
    ],
  },
  ropes: {
    name: "Paulie's Ropes", atk: 17, shape: 'rope', pal: { n: '#c9a26a' }, hit: 'swing', color: '#e8d9b0',
    desc: 'Shipwright ropes from Water 7, good for tying up pirates and tossing anchors.',
    moves: [
      { name: 'Rope Lasso', at: 0, sp: 25, mult: 1.8, fx: 'lasso' },
      { name: 'Rope Snare Net', at: 30, sp: 50, mult: 1.3, stun: 0.6, fx: 'ropenet' },
      { name: 'Anchor Drop', at: 80, sp: 85, mult: 3.3, fx: 'anchordrop' },
    ],
  },
  colaarm: {
    name: 'Cola Cannon Arm', atk: 18, shape: 'cannonarm', pal: { g: '#9aa4b1', b: '#3b6fd6' }, hit: 'shot', color: '#5ab8e8',
    desc: "Franky's spare cyborg arm. Runs on cola. SUPER!",
    moves: [
      { name: 'Strong Right', at: 0, sp: 25, mult: 1.9, fx: 'strongright' },
      { name: 'Weapons Left', at: 30, sp: 50, mult: 0.8, hits: 3, fx: 'weaponsleft' },
      { name: 'Radical Beam', at: 80, sp: 90, mult: 3.6, fx: 'radicalbeam' },
    ],
  },
  funkfreed: {
    name: 'Funkfreed', atk: 18, shape: 'sword', pal: { w: '#c9ccd6', G: '#9aa4b1', n: '#7a8a9a' }, hit: 'swing', color: '#c9ccd6',
    desc: 'A sword that ate the Elephant-Elephant Fruit. It trumpets when it swings.',
    moves: [
      { name: 'Trunk Whip', at: 0, sp: 25, mult: 1.8, fx: 'trunkwhip' },
      { name: 'Elephant Stampede', at: 30, sp: 50, mult: 0.6, hits: 4, fx: 'stampede' },
      { name: 'Ivory Lance', at: 80, sp: 85, mult: 3.3, pierce: true, fx: 'ivorylance' },
    ],
  },
  rokushiki: {
    name: 'Rokushiki Gloves', atk: 19, shape: 'gloves', pal: { w: '#2a2433' }, hit: 'swing', color: '#f2f2f2',
    desc: "Rob Lucci's gloves. Wear them and your body learns the Six Powers.",
    moves: [
      { name: 'Shigan', at: 0, sp: 25, mult: 1.7, sure: true, fx: 'shigan' },
      { name: 'Rankyaku', at: 30, sp: 50, mult: 2.2, fx: 'rankyaku' },
      { name: 'Rokuogan', at: 80, sp: 90, mult: 3.8, pierce: true, fx: 'rokuogan' },
    ],
  },
  shusui: {
    name: 'Black Blade Shusui', atk: 19, shape: 'sword', pal: { w: '#2a3a2a', G: '#c9a23a', n: '#3a6a3a' }, hit: 'swing', color: '#5ab86a',
    desc: 'The legendary black blade of the samurai Ryuma, found in a Thriller Bark grave.',
    moves: [
      { name: 'Ryuma Draw', at: 0, sp: 25, mult: 1.9, fx: 'ryumadraw' },
      { name: 'Shadow Lion Strike', at: 30, sp: 55, mult: 1.2, hits: 2, fx: 'shadowlion' },
      { name: 'Black Tornado', at: 80, sp: 90, mult: 3.6, fx: 'blacktornado' },
    ],
  },
  scissors: {
    name: 'Shadow Scissors', atk: 21, shape: 'scissors', pal: { g: '#c9ccd6', G: '#e6b422', n: '#6a4a8a' }, hit: 'swing', color: '#9a7ac0',
    desc: "Gecko Moria's giant scissors. They cut shadows right off their owners.",
    moves: [
      { name: 'Snip Snip', at: 0, sp: 25, mult: 0.95, hits: 2, fx: 'snipsnip' },
      { name: 'Shadow Cut', at: 30, sp: 50, mult: 1.6, atkDown: true, fx: 'shadowcut' },
      { name: 'Brick Bat Swarm', at: 80, sp: 85, mult: 0.7, hits: 5, fx: 'brickbats' },
    ],
  },
  bubbler: {
    name: 'Bubble Blaster', atk: 20, shape: 'bubbler', pal: { w: '#9ad8f0', n: '#7a4a24' }, hit: 'shot', color: '#9ad8f0',
    desc: 'A Sabaody bubble wand that blows bubbles as hard as rock.',
    moves: [
      { name: 'Bubble Trap', at: 0, sp: 25, mult: 1.4, stun: 0.5, fx: 'bubbletrap' },
      { name: 'Bubble Burst', at: 30, sp: 50, mult: 2.3, fx: 'bubbleburst' },
      { name: 'Resin Bubble Barrage', at: 80, sp: 85, mult: 0.75, hits: 5, fx: 'bubblebarrage' },
    ],
  },
  lightblade: {
    name: 'Murakumo Light Blade', atk: 22, shape: 'sword', pal: { w: '#fff3a0', G: '#e6b422', n: '#ffd04a' }, hit: 'swing', color: '#fff3a0', logiaHit: true,
    desc: "A sword of solid light, left behind by Admiral Kizaru. It even cuts Logias.",
    moves: [
      { name: 'Light Edge', at: 0, sp: 30, mult: 2.0, fx: 'lightedge' },
      { name: 'Flash Step Slash', at: 30, sp: 55, mult: 1.0, hits: 3, fx: 'flashstep' },
      { name: 'Yata Mirror Strike', at: 80, sp: 90, mult: 3.7, sure: true, fx: 'yatamirror' },
    ],
  },
  chains: {
    name: 'Jailer Chains', atk: 21, def: 2, shape: 'chain', pal: { g: '#5a5a6a', w: '#c9ccd6', n: '#3a3440' }, hit: 'swing', color: '#9aa4b1',
    desc: 'A ball and chain taken from an Impel Down jailer.',
    moves: [
      { name: 'Chain Lash', at: 0, sp: 25, mult: 1.8, fx: 'chainlash' },
      { name: 'Iron Ball Crush', at: 30, sp: 50, mult: 2.4, fx: 'ironball' },
      { name: 'Lockdown', at: 80, sp: 85, mult: 2.6, stun: 0.6, fx: 'lockdown' },
    ],
  },
  venomfang: {
    name: 'Hydra Fang', atk: 23, shape: 'dagger', pal: { v: '#9a4ad0', G: '#3a3440', n: '#5a3a7a' }, hit: 'swing', color: '#9a4ad0',
    desc: "A dagger dipped in Magellan's venom. Everything it cuts gets poisoned.",
    moves: [
      { name: 'Venom Slash', at: 0, sp: 25, mult: 1.6, burn: 3, fx: 'venomslash' },
      { name: 'Hydra', at: 30, sp: 55, mult: 2.3, burn: 2, fx: 'hydra' },
      { name: 'Venom Demon', at: 80, sp: 95, mult: 3.6, burn: 3, fx: 'venomdemon' },
    ],
  },
  bisento: {
    name: 'Murakumogiri', atk: 23, def: 2, shape: 'bisento', pal: { w: '#e8e8f0', G: '#e6b422', n: '#5a3a22' }, hit: 'swing', color: '#e8e8f0',
    desc: 'The great bisento of the strongest man in the world, left on the Marineford battlefield.',
    moves: [
      { name: 'Bisento Sweep', at: 0, sp: 25, mult: 1.9, fx: 'bisentosweep' },
      { name: 'Tremor Strike', at: 30, sp: 55, mult: 2.4, fx: 'tremorstrike' },
      { name: "Captain's Stand", at: 80, sp: 95, mult: 3.9, fx: 'captainstand' },
    ],
  },
  magmagauntlet: {
    name: 'Magma Gauntlet', atk: 25, shape: 'gauntlet', pal: { r: '#c0301a', R: '#ff9a3a', g: '#3a3440' }, hit: 'swing', color: '#ff5a2a',
    desc: "A gauntlet still glowing from Admiral Akainu's magma.",
    moves: [
      { name: 'Magma Punch', at: 0, sp: 30, mult: 2.0, burn: 2, fx: 'magmapunch' },
      { name: 'Hound Fist', at: 30, sp: 55, mult: 2.5, burn: 2, fx: 'houndfist' },
      { name: 'Meteor Volcano', at: 80, sp: 95, mult: 0.8, hits: 5, burn: 3, fx: 'meteorvolcano' },
    ],
  },
  neptune: {
    name: "Neptune's Trident", atk: 24, shape: 'trident', pal: { w: '#ffd04a', n: '#e6b422' }, hit: 'swing', color: '#ffd04a',
    desc: 'The golden trident of the Sea King of Fish-Man Island.',
    moves: [
      { name: "King's Thrust", at: 0, sp: 25, mult: 1.9, fx: 'kingsthrust' },
      { name: 'Sea King Call', at: 30, sp: 55, mult: 2.4, fx: 'seakingcall' },
      { name: 'Ryugu Tide', at: 80, sp: 90, mult: 3.6, wet: true, fx: 'ryugutide' },
    ],
  },
  sharkknuckles: {
    name: 'Shark Fang Knuckles', atk: 26, shape: 'knuckles', pal: { g: '#7ab0c8', w: '#ffffff' }, hit: 'swing', color: '#7ab0c8',
    desc: "Knuckles set with Hody Jones's shark teeth.",
    moves: [
      { name: 'Fang Punch', at: 0, sp: 25, mult: 2.0, fx: 'fangpunch' },
      { name: 'Water Heart', at: 30, sp: 55, mult: 2.3, wet: true, fx: 'waterheart' },
      { name: 'Shark Darts', at: 80, sp: 85, mult: 0.8, hits: 5, fx: 'sharkdarts' },
    ],
  },
  kikoku: {
    name: 'Kikoku Nodachi', atk: 25, shape: 'nodachi', pal: { w: '#e8eef8', G: '#3a3440', n: '#f2f2f2' }, hit: 'swing', color: '#7cd0ff',
    desc: 'A huge nodachi from Punk Hazard, owned by a surgeon who can cut without wounding.',
    moves: [
      { name: 'Room: Shambles', at: 0, sp: 30, mult: 1.8, sure: true, fx: 'shambles' },
      { name: 'Counter Shock', at: 30, sp: 55, mult: 2.3, stun: 0.4, fx: 'countershock' },
      { name: 'Injection Shot', at: 80, sp: 90, mult: 3.7, pierce: true, fx: 'injection' },
    ],
  },
  gaslamp: {
    name: 'Shinokuni Lamp', atk: 27, shape: 'lamp', pal: { y: '#b06ad0', g: '#3a3440', n: '#5a4a6a' }, hit: 'shot', color: '#b06ad0',
    desc: "Caesar Clown's lamp of poison gas. Handle with care.",
    moves: [
      { name: 'Gastanet', at: 0, sp: 25, mult: 2.0, fx: 'gastanet' },
      { name: 'Brown Cloud', at: 30, sp: 55, mult: 1.6, burn: 3, fx: 'browncloud' },
      { name: 'Shinokuni', at: 80, sp: 95, mult: 3.8, fx: 'shinokuni' },
    ],
  },
  kabuto: {
    name: 'Kabuto Slingshot', atk: 26, shape: 'slingshot', pal: { n: '#5a3a22', w: '#7cff7a' }, hit: 'shot', color: '#7cff7a',
    desc: 'A sniper\'s slingshot that fires Pop Green seeds. They sprout into weird plants.',
    moves: [
      { name: 'Pop Green: Trampolia', at: 0, sp: 25, mult: 1.8, fx: 'trampolia' },
      { name: 'Firebird Star', at: 30, sp: 55, mult: 2.4, burn: 2, fx: 'firebird' },
      { name: 'Pop Green: Devil', at: 80, sp: 90, mult: 3.6, stun: 0.4, fx: 'devilplant' },
    ],
  },
  overheat: {
    name: 'Overheat Rope', atk: 28, shape: 'whip', pal: { r: '#ff6a3a', n: '#c0453a' }, hit: 'swing', color: '#ff6a3a',
    desc: "Doflamingo's strings, twisted into a red-hot rope.",
    moves: [
      { name: 'Overheat', at: 0, sp: 30, mult: 2.0, burn: 2, fx: 'overheat' },
      { name: 'Spiderweb', at: 30, sp: 55, mult: 1.6, stun: 0.5, fx: 'spiderweb' },
      { name: 'Parasite Pull', at: 80, sp: 90, mult: 3.7, fx: 'parasite' },
    ],
  },
  napoleon: {
    name: 'Napoleon Sword', atk: 27, shape: 'bicorne', pal: { x: '#1b1424', G: '#e6b422', w: '#e8eef8', n: '#5a3a22' }, hit: 'swing', color: '#ffd04a',
    desc: 'A talking hat that turns into a sword. A Homie made from a piece of someone\'s soul.',
    moves: [
      { name: 'Homie Slash', at: 0, sp: 25, mult: 2.0, fx: 'homieslash' },
      { name: 'Soul Pocus', at: 30, sp: 55, mult: 1.8, atkDown: true, fx: 'soulpocus' },
      { name: 'Cake Crusher', at: 80, sp: 90, mult: 3.7, fx: 'cakecrush' },
    ],
  },
  mogura: {
    name: 'Mogura', atk: 29, def: 2, shape: 'mogura', pal: { r: '#7a2630', n: '#3a3440' }, hit: 'swing', color: '#c0453a',
    desc: "Charlotte Katakuri's mochi trident. It drills like a mole.",
    moves: [
      { name: 'Mogura Drill', at: 0, sp: 30, mult: 2.1, fx: 'moguradrill' },
      { name: 'Buzz Cut Mochi', at: 30, sp: 55, mult: 1.0, hits: 3, fx: 'buzzcut' },
      { name: 'Snake Dance', at: 80, sp: 95, mult: 0.75, hits: 6, fx: 'snakedance' },
    ],
  },
  knives: {
    name: 'Circus Knives', atk: 5, shape: 'knives', pal: { w: '#e8e8f0', n: '#d63c2f' }, hit: 'shot', color: '#e8e8f0',
    desc: 'Throwing knives from Buggy\'s circus. The first two moves never miss.',
    moves: [
      { name: 'Knife Toss', at: 0, sp: 20, mult: 1.4, sure: true, fx: 'knifetoss' },
      { name: 'Blade Fan', at: 30, sp: 45, mult: 0.55, hits: 4, sure: true, fx: 'bladefan' },
      { name: 'Grand Finale', at: 80, sp: 75, mult: 2.7, fx: 'grandfinale' },
    ],
  },
  chakram: {
    name: 'Hypno Chakram', atk: 6, shape: 'ring', pal: { g: '#c9ccd6', w: '#ffffff' }, hit: 'shot', color: '#c94a9a',
    desc: 'A hypnotist\'s ring blade. Its swinging glint can put foes to sleep.',
    moves: [
      { name: 'Ring Toss', at: 0, sp: 20, mult: 1.5, fx: 'ringtoss' },
      { name: 'Hypnotize', at: 30, sp: 45, mult: 1.0, stun: 0.55, fx: 'hypnotize' },
      { name: 'Ring Storm', at: 80, sp: 75, mult: 0.7, hits: 4, fx: 'ringstorm' },
    ],
  },
  cleaver: {
    name: "Chef's Cleaver", atk: 7, shape: 'cleaver', pal: { g: '#d9dde6', n: '#5a3818' }, hit: 'swing',
    desc: 'A heavy kitchen cleaver from the Baratie. Chops through anything.',
    moves: [
      { name: 'Chop', at: 0, sp: 20, mult: 1.5, fx: 'cleaverchop' },
      { name: 'Mince', at: 30, sp: 45, mult: 0.6, hits: 4, fx: 'mince' },
      { name: 'Grand Cleave', at: 80, sp: 80, mult: 2.9, fx: 'grandcleave' },
    ],
  },
  buggycannon: {
    name: 'Buggy Cannon', atk: 7, shape: 'cannon', pal: { h: '#2a2433', g: '#5a5a6a', n: '#7a4a24' }, hit: 'shot', color: '#2a2433',
    desc: 'Buggy\'s hand cannon. Loud, smoky and very effective.',
    moves: [
      { name: 'Cannon Shot', at: 0, sp: 25, mult: 1.7, fx: 'cannonshot' },
      { name: 'Scatter Shot', at: 30, sp: 45, mult: 0.6, hits: 4, fx: 'scattershot' },
      { name: 'Buggy Ball', at: 80, sp: 80, mult: 3.1, fx: 'buggyball' },
    ],
  },
  catclaws: {
    name: 'Cat Claws', atk: 9, shape: 'claws', pal: { w: '#e8e8f0', h: '#2a2433' }, hit: 'swing',
    desc: 'Kuro\'s bladed gloves. Strike faster than the eye can follow.',
    moves: [
      { name: 'Cat Swipe', at: 0, sp: 25, mult: 1.6, sure: true, fx: 'catswipe' },
      { name: 'Silent Steps', at: 30, sp: 50, mult: 0.5, hits: 6, fx: 'silentsteps' },
      { name: 'Hundred Plans', at: 80, sp: 80, mult: 3.0, fx: 'hundredplans' },
    ],
  },
  battlespear: {
    name: 'Battle Spear', atk: 10, shape: 'spear', pal: { n: '#7a4a24', g: '#c9ccd6', G: '#e6b422' }, hit: 'swing', color: '#ffd04a',
    desc: 'Don Krieg\'s great spear. The tip explodes on impact.',
    moves: [
      { name: 'Spear Thrust', at: 0, sp: 25, mult: 1.7, fx: 'spearthrust' },
      { name: 'Exploding Tip', at: 30, sp: 45, mult: 2.0, fx: 'explodingtip' },
      { name: 'Great War Spear', at: 80, sp: 85, mult: 3.2, fx: 'warspear' },
    ],
  },
};

const HAKI = { armament: 10, observation: 20, conqueror: 35 };
// Awakening a Devil Fruit: all of these, then win the Awakening Trial (Gear menu).
const AWAKEN_REQ = { mastery: 300, lvl: 55, boss: 'akainu' };
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
  weights:  { name: 'Training Weights', price: 600, icon: 'weights', desc: 'Ship upgrade: a gym corner on deck. +1 to every training session.', once: true, ship: true },
  sails:    { name: 'Storm Sails', price: 1200, icon: 'sails', desc: 'Ship upgrade: sailing takes half as long and storms can\'t touch you.', once: true, ship: true },
  galley:   { name: 'Galley Kitchen', price: 1800, icon: 'galley', desc: 'Ship upgrade: all food restores 25% more.', once: true, ship: true },
  nest:     { name: "Crow's Nest", price: 900, icon: 'nest', desc: 'Ship upgrade: a lookout on the mast. Sea Kings attack half as often.', once: true, ship: true },
  bunks:    { name: 'Crew Bunks', price: 700, icon: 'bunks', desc: 'Ship upgrade: comfy hammocks below deck. +8 mood every morning.', once: true, ship: true },
  aquarium: { name: 'Aquarium Bar', price: 1500, icon: 'aquarium', desc: 'Ship upgrade: a fish tank lounge. Some mornings a fresh Fish is waiting.', once: true, ship: true },
  lanterns: { name: 'Paper Lanterns', price: 250, icon: 'lantern', desc: 'Ship decoration: lanterns strung over the deck that glow at night.', once: true, ship: true },
  fh_ram:   { name: 'Ram Figurehead', price: 600, icon: 'figurehead', pal: { w: '#f2f2f2', y: '#e6b422' }, desc: 'Ship decoration: a curly-horned ram on the bow.', once: true, ship: 'head' },
  fh_lion:  { name: 'Lion Figurehead', price: 1200, icon: 'figurehead', pal: { w: '#f2b03a', y: '#e07a2a' }, desc: 'Ship decoration: a sunny lion with a big mane.', once: true, ship: 'head' },
  fh_shark: { name: 'Shark Figurehead', price: 1000, icon: 'figurehead', pal: { w: '#7a9ab8', y: '#ffffff' }, desc: 'Ship decoration: a toothy shark that bites the waves.', once: true, ship: 'head' },
  fh_swan:  { name: 'Swan Figurehead', price: 1800, icon: 'figurehead', pal: { w: '#ffffff', y: '#f08a3a' }, desc: 'Ship decoration: an elegant white swan. Very fancy.', once: true, ship: 'head' },
  fh_dragon: { name: 'Dragon Figurehead', price: 4000, icon: 'figurehead', pal: { w: '#4a8ad9', y: '#f2e6c8' }, desc: 'Ship decoration: an azure dragon worthy of a Pirate King.', once: true, ship: 'head' },
  burst:    { name: 'Coup de Burst', price: 6000, icon: 'burst', desc: 'Ship upgrade: a giant cola cannon in the stern. Blast away from any Sea King.', once: true, ship: true },
  coating:  { name: 'Bubble Coating', price: 8000, icon: 'bubble', desc: 'Ship upgrade: wraps the ship in a bubble so it can dive 10,000 meters to Fish-Man Island.', once: true, ship: true },
  fh_skull: { name: 'Skull Figurehead', price: 5000, icon: 'figurehead', pal: { w: '#f2f2f2', y: '#1b1424' }, desc: 'Ship decoration: a grinning skull from Thriller Bark.', once: true, ship: 'head' },
  paint_green: { name: 'Lawn Green Paint', price: 2500, icon: 'paint', pal: { c: '#5aa846' }, desc: 'Ship paint: a fresh green hull, like a lawn deck.', once: true, ship: 'paint' },
  paint_pink:  { name: 'Flamingo Pink Paint', price: 9000, icon: 'paint', pal: { c: '#ff8ab0' }, desc: 'Ship paint: a loud pink hull. Fufufu.', once: true, ship: 'paint' },
  paint_red:   { name: 'Red Paint', price: 200, icon: 'paint', pal: { c: '#c0453a' }, desc: 'Ship paint: a bold red hull.', once: true, ship: 'paint' },
  paint_blue:  { name: 'Ocean Blue Paint', price: 300, icon: 'paint', pal: { c: '#3a6ab8' }, desc: 'Ship paint: a deep blue hull.', once: true, ship: 'paint' },
  paint_black: { name: 'Black Paint', price: 600, icon: 'paint', pal: { c: '#3a3440' }, desc: 'Ship paint: a scary black hull.', once: true, ship: 'paint' },
  paint_white: { name: 'Snow White Paint', price: 800, icon: 'paint', pal: { c: '#e8eef8' }, desc: 'Ship paint: a clean white hull.', once: true, ship: 'paint' },
  paint_gold:  { name: 'Gold Leaf Paint', price: 5000, icon: 'paint', pal: { c: '#e6b422' }, desc: 'Ship paint: a gleaming gold hull. Pure showing off.', once: true, ship: 'paint' },
  cannon:   { name: 'Ship Cannon', price: 2500, icon: 'cannon', desc: 'Ship upgrade: blasts raid bosses every turn.', once: true, ship: true },
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
