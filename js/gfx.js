'use strict';
/* Pixel-art toolkit: palette, ASCII sprites (auto-outlined), bitmap font, pixel primitives. */

const PAL = {
  k: '#1b1424', // outline / ink
  e: '#1b1424', // eyes
  m: '#7a2630', // mouth
  w: '#f7f4ea', // white
  s: '#f3c08c', // skin
  S: '#c98a5a', // skin shade / scar
  h: '#2a2433', // hair
  c: '#d63c2f', // main cloth / body
  C: '#f4c542', // accent cloth / belly
  p: '#3b6fd6', // pants
  f: '#3a2a22', // shoes
  x: '#b23a3a', // accessory (hat, bandana, horns)
  a: '#8a5a32', // antlers
  g: '#9aa4b1', // steel
  G: '#e6b422', // gold
  n: '#7a4a24', // wood
  y: '#f4c542', // straw
  Y: '#d0952c', // straw shade
  r: '#d63c2f', // red
  R: '#ee8a62', // light red
  v: '#d63c2f', // vest
  b: '#3b6fd6', // blue
  d: '#4a8ad9', // dragon scales
  D: '#2a5a9a', // dark dragon scales
};

// ---------- sprite shapes (16x16, '.' = empty; outline is added automatically) ----------

// Your pirate's body; the head is HUMAN_HEADS.hair.
const PLAYER_BODY = [
  '....hssssssh....',
  '....hsessesh....',
  '....sSssssss....',
  '.....swwwws.....',
  '...svvssssvvs...',
  '...svvssssvvs...',
  '...syyyyyyyys...',
  '....bbbbbbbb....',
  '....bbb..bbb....',
  '....ss....ss....',
  '....ff....ff....',
];

const HUMAN_HEADS = {
  hair:    ['................', '.....h.hh.h.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...'],
  bandana: ['................', '................', '.....xxxxxx.....', '....xxxxxxxxxx..', '....xxxxxxxx.xx.'],
  cap:     ['................', '.....wwwwww.....', '....wwwwwwww....', '....xxxxxxxx....', '..wwwwwwwwww....'],
  turban:  ['......xxxx......', '....xxxxxxxx....', '...xxxxxxxxxx...', '...xxxxxxxxxx...', '....hhhhhhhh....'],
  helmet:  ['................', '.w...xxxxxx...w.', '.ww.xxxxxxxx.ww.', '..wxxxxxxxxxxw..', '...xxxxxxxxxx...'],
  horns:   ['..x..........x..', '..xx........xx..', '...xxhhhhhhxx...', '...hhhhhhhhhh...', '...hhhhhhhhhh...'],
  long:    ['................', '.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...'],
  goggles: ['................', '....hhhhhhhh....', '...hhhhhhhhhh...', '...xxwwxxwwxx...', '...hhhhhhhhhh...'],
  tophat:  ['..a..xxxxxx..a..', '..aa.xxxxxx.aa..', '...a.xxwwxx.a...', '...xxxxxxxxxx...', '....hhhhhhhh....'],
  fin:     ['......xx........', '.....xxx........', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...'],
  swoop:   ['................', '....hhhhhhh.....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhh......'],
};

const HUMAN_BODY = [
  '....hssssssh....',
  '....hsessesh....',
  '....ssssssss....',
  '.....ssmmss.....',
  '...cccccccccc...',
  '...sccCCCCccs...',
  '...sccccccccs...',
  '....pppppppp....',
  '....pppppppp....',
  '....ppp..ppp....',
  '....ff....ff....',
];

const BRUTE_HEADS = {
  ape:     ['................', '......hhhh......', '.....hhhhhh.....', '.....hssssh.....', '.....sesses.....', '.....ssmmss.....'],
  grizzle: ['................', '......xxxx......', '.....xxxxxxx....', '.....hssssh.....', '.....sesses.....', '.....hhhhhh.....'],
  ironjaw: ['....wwwwwwww....', '....xxxxxxxx....', '...wwwwwwwww....', '.....ssssss.....', '.....sesses.....', '.....gggggg.....'],
  sharko:  ['......xx........', '.....xxxx.......', '.....hhhhhh.....', '.....hssssh.....', '.ggggsesses.....', '..g.gssmmss.....'],
  sandor:  ['................', '......hhhh......', '.....hhhhhh.....', '.....hhhhhh.....', '.....sesses.....', '.....sSSSSsww...'],
  voltz:   ['................', '......ssss......', '.....ssssss.....', '....ssssssss....', '....ssessess....', '....sssmmsss....'],
  buggy:   ['....xxxxxxxx....', '...xxxxwwxxxx...', '.....bbbbbb.....', '....bbssssbb....', '.....serres.....', '.....smmmms.....'],
  kuro:    ['................', '......hhhh......', '.....hhhhhh.....', '.....hhhhhh.....', '.....wewwew.....', '.....ssmmss.....'],
  krieg:   ['................', '.....h.hh.h.....', '.....hhhhhh.....', '.....hssssh.....', '.....sesses.....', '.....GGGGGG.....'],
  smoker:  ['................', '.....h.hh.h.....', '.....hhhhhh.....', '.....hssssh.....', '.....sesses.....', '...GGsSmmSsGG...'],
  wapol:   ['....G.G..G.G....', '....GGGGGGGG....', '.....hhhhhh.....', '....hssssssh....', '....ssessess....', '...gggggggggg...'],
  franky:  ['....hhhhhhh.....', '...hhhhhhhhhh...', '.....hhhhhh.....', '.....hssssh.....', '.....sesses.....', '....ssssmmss....'],
  lucci:   ['.....xxxxxx.....', '.....xxxxxx.....', '...xxxxxxxxxx...', '....hhssssh.....', '....hsessesh....', '....hhsmmshh....'],
  moria:   ['..h.h.hh.h.h....', '...hhhhhhhhh....', '....hhhhhhhh....', '....ssssssss....', '....sessssess...', '....smmmmmms....'],
  kizaru:  ['................', '......hhhh......', '.....hhhhhh.....', '.....hssssh.....', '.....GGsGGs.....', '.....ssmmss.....'],
  magellan: ['....x......x....', '....xx....xx....', '.....xxxxxx.....', '.....xxxxxx.....', '.....sesses.....', '.....ssmmss.....'],
  akainu:  ['................', '....xxxxxxxx....', '...xxxxxxxxxx...', '.....hssssh.....', '.....sesses.....', '.....ssmmss.....'],
  hody:    ['......hh........', '.....hhhh.......', '.....hhhhhh.....', '.....hssssh.....', '.....srssrs.....', '....wwwwwwww....'],
  caesar:  ['.......hh.......', '......hhhh......', '.....hhhhhh.....', '....hhssssh.....', '....hsesses.....', '....hsmmmms.....'],
  doflamingo: ['................', '.....h.hh.h.....', '.....hhhhhh.....', '.....hssssh.....', '.....ggsggs.....', '.....smmmms.....'],
  katakuri: ['.....h.hh.h.....', '....hhhhhhhh....', '.....hhhhhh.....', '.....hssssh.....', '.....sesses.....', '....xxxxxxxx....'],
  pacifista: ['....x......x....', '....xxxxxxxx....', '...xxxxxxxxxx...', '.....ssssss.....', '.....ggsggs.....', '.....ssmmss.....'],
  drakko:  ['..x..........x..', '..xx..hhhh..xx..', '....xhhhhhhx....', '.....hssssh.....', '....hsesses.....', '....hssmmssh....'],
};

const BRUTE_BODY = [
  '..cccccccccccc..',
  '.cccccccccccccc.',
  '.scccCCCCCCcccs.',
  '.sccccccccccccs.',
  '.ss.cccccccc.ss.',
  '.ss.CCCCCCCC.ss.',
  '....pppppppp....',
  '....pppppppp....',
  '...ppp....ppp...',
  '...fff....fff...',
];

const SHAPES = {
  serpent: [
    '................', '................', '................', '................',
    '...cccc.........',
    '..cccccc........',
    '.cceccccc.......',
    'cccccccccc......',
    'wcwcwcCccc......',
    '......Cccc......',
    '.....CCccc......',
    '.....CCccc...cc.',
    '.....CCccc..ccc.',
    '......CCcccccc..',
    '.......CCcccc...',
    '................',
  ],
  quad: [
    '................', '................', '................', '................', '................', '................',
    '..hh............',
    '..cccccccccccc..',
    '.cecccccccccccc.',
    'wcccccccccccccc.',
    '.nccccccccccccc.',
    '..cCCCCCCCCCCc..',
    '..cc.cc..cc.cc..',
    '..cc.cc..cc.cc..',
    '..ff.ff..ff.ff..',
    '................',
  ],
  crab: [
    '................', '................', '................', '................',
    '.cc..........cc.',
    'cccc........cccc',
    'cc.c........c.cc',
    '.c.c..e..e..c.c.',
    '...cc.c..c.cc...',
    '....cccccccc....',
    '...cccccccccc...',
    '..cccccccccccc..',
    '...cCCCCCCCCc...',
    '..c.c.c..c.c.c..',
    '.c.c.c....c.c.c.',
    '................',
  ],
  bird: [
    '................', '................', '................',
    '......cc........',
    '.....ccec.......',
    '...yyccccc......',
    '.....ccccc......',
    '..wwwcccccwww...',
    '.wwwwcccccwwww..',
    'wwwww.ccc.wwwww.',
    'ww.....c.....ww.',
    '......c.c.......',
    '......y.y.......',
    '................', '................', '................',
  ],
  slug: [
    '................', '................', '................', '................', '................', '................',
    '.....c....c.....',
    '......c..c......',
    '......cccc......',
    '.....cccccc.....',
    '....cceccecc....',
    '...cccccccccc...',
    '..cccccmmccccc..',
    '.cccccccccccccc.',
    'CCCCCCCCCCCCCCCC',
    '................',
  ],
};

// Overlays: [x, y, w, h, paletteChar]
const OVERLAYS = {
  club:   [[0, 1, 3, 4, 'n'], [1, 5, 1, 6, 'n']],
  axe:    [[0, 6, 3, 5, 'g'], [1, 4, 1, 2, 'g']],
  hook:   [[0, 12, 1, 2, 'G'], [1, 14, 1, 1, 'G'], [2, 13, 1, 1, 'G']],
  kanabo: [[0, 0, 3, 9, 'g'], [1, 9, 1, 2, 'n'], [1, 1, 1, 1, 'w'], [0, 4, 1, 1, 'w'], [2, 6, 1, 1, 'w']],
  swords: [[12, 12, 1, 3, 'g'], [13, 11, 1, 3, 'w'], [14, 12, 1, 3, 'r']],
  knives: [[0, 6, 1, 4, 'g'], [2, 6, 1, 3, 'g'], [0, 5, 1, 1, 'w'], [2, 5, 1, 1, 'w']],
  claws:  [[0, 10, 1, 5, 'w'], [2, 11, 1, 4, 'w']],
  spear:  [[1, 0, 1, 12, 'n'], [0, 0, 3, 2, 'g']],
  jitte:  [[1, 2, 1, 10, 'g'], [2, 5, 1, 2, 'g'], [1, 12, 1, 2, 'n']],
  mask:   [[5, 6, 6, 1, 'g'], [6, 7, 4, 2, 'g']],
  horns:  [[2, 2, 1, 1, 'x'], [3, 3, 1, 1, 'x'], [6, 2, 1, 1, 'x'], [5, 3, 1, 1, 'x']],
  // race marks for the player sprite
  minkEars:    [[3, 0, 2, 2, 'S'], [11, 0, 2, 2, 'S']],
  wings:       [[1, 8, 2, 3, 'w'], [13, 8, 2, 3, 'w'], [0, 9, 1, 1, 'w'], [15, 9, 1, 1, 'w']],
  fin:         [[7, 0, 2, 1, 'x'], [6, 1, 1, 1, 'x'], [9, 1, 1, 1, 'x']],
  // Dragon-Dragon Fruit eaters stay half dragon: horns, scaly arms, cheeks and shins, and a tail.
  dragonHorns:    [[5, 0, 1, 2, 'a'], [10, 0, 1, 2, 'a'], [4, 0, 1, 1, 'a'], [11, 0, 1, 1, 'a']],
  dragonBody:     [[3, 9, 1, 3, 'd'], [12, 9, 1, 3, 'd'], [10, 6, 1, 3, 'd'], [11, 7, 1, 1, 'd'], [9, 6, 1, 1, 'y'], [4, 14, 2, 1, 'd'], [10, 14, 2, 1, 'd'],
    [3, 12, 1, 1, 'd'], [2, 13, 1, 1, 'd'], [1, 14, 1, 1, 'd'], [0, 15, 2, 1, 'D'], [2, 12, 1, 1, 'D']],
  // The same for crewmates who eat it: regular builds and big brute builds.
  dragonCrew:     [[3, 10, 1, 2, 'd'], [12, 10, 1, 2, 'd'], [10, 6, 1, 2, 'd'], [11, 7, 1, 1, 'd'], [9, 6, 1, 1, 'y'],
    [3, 12, 1, 1, 'd'], [2, 13, 1, 1, 'd'], [1, 14, 1, 1, 'd'], [0, 15, 2, 1, 'D'], [2, 12, 1, 1, 'D']],
  dragonBrute:    [[1, 8, 1, 4, 'd'], [14, 8, 1, 4, 'd'], [2, 10, 1, 2, 'd'], [13, 10, 1, 2, 'd'], [10, 4, 1, 2, 'd'], [9, 4, 1, 1, 'y'],
    [3, 12, 1, 1, 'd'], [2, 13, 1, 1, 'd'], [1, 14, 1, 1, 'd'], [0, 15, 2, 1, 'D'], [2, 12, 1, 1, 'D']],
};

// Hand-held weapons. `grip` is the [x, y] cell that sits in the pirate's hand.
const WEAPON_SHAPES = {
  sword:   { grip: [1, 9], rows: ['.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', 'GGG', '.n.', '.n.'] },
  curved:  { grip: [1, 9], rows: ['...w', '..ww', '..w.', '.ww.', '.w..', '.w..', '.w..', 'GGG.', '.n..', '.n..'] },
  saw:     { grip: [1, 9], rows: ['ww.', 'wwg', 'ww.', 'wwg', 'ww.', 'wwg', 'ww.', 'GGG', '.n.', '.n.'] },
  staff:   { grip: [0, 11], rows: Array(16).fill('n') },
  gstaff:  { grip: [1, 11], rows: ['.y.', 'yGy', '.y.'].concat(Array(13).fill('.G.')) },
  trident: { grip: [2, 11], rows: ['w.w.w', 'w.w.w', 'wwwww'].concat(Array(13).fill('..n..')) },
  club:    { grip: [1, 9], rows: ['.nn.', 'nnnn', 'nnnn', 'nnnn', 'nnnn', '.nn.', '.n..', '.n..', '.n..', '.n..', '.n..'] },
  kanabo:  { grip: [1, 11], rows: ['.gg.', 'gwgg', 'gggg', 'ggwg', 'gggg', 'gwgg', 'gggg', 'ggwg', '.gg.', '.n..', '.n..', '.n..', '.n..'] },
  axe:     { grip: [3, 9], rows: ['.gg..', 'gggn.', 'gggn.', 'gggn.', '.ggn.', '...n.', '...n.', '...n.', '...n.', '...n.', '...n.'] },
  gun:     { grip: [0, 2], rows: ['gggggg', 'nng...', 'nn....'] },
  hook:    { grip: [1, 4], rows: ['.G.', 'G.G', '..G', '.GG', 'nnn'] },
  shell:   { grip: [1, 3], rows: ['.CC.', 'CwCC', 'CCwC', '.CC.'] },
  knives:  { grip: [2, 4], rows: ['w...w', '.w.w.', '..w..', '.nnn.', '..n..'] },
  ring:    { grip: [2, 4], rows: ['.ggg.', 'g.w.g', 'g...g', 'g...g', '.ggg.'] },
  cleaver: { grip: [3, 5], rows: ['gggg.', 'gggg.', 'gggg.', 'gggn.', '...n.', '...n.'] },
  cannon:  { grip: [0, 3], rows: ['.hhhhhhh', 'hhhhhhhh', 'nnhhhhhh', 'nn......'] },
  claws:   { grip: [1, 0], rows: ['hhh', 'w.w', 'w.w', 'w.w', '..w'] },
  jitte:   { grip: [1, 9], rows: ['.w..', '.g..', '.g.g', '.ggg', '.g..', '.g..', '.g..', 'GGG.', '.n..', '.n..'] },
  hammer:  { grip: [2, 8], rows: ['.ggg.', 'gwggg', 'ggggg', 'ggggg', '.ggg.', '..n..', '..n..', '..n..', '..n..', '..n..'] },
  scepter: { grip: [2, 9], rows: ['.G.G.', 'GrGrG', '.GwG.', '..G..', '..G..', '..G..', '..G..', '..G..', '..G..', '..G..', '..G..'] },
  rope:    { grip: [2, 6], rows: ['.nnn.', 'n...n', 'n.n.n', 'n...n', '.nnn.', '..n..', '..n..'] },
  cannonarm: { grip: [0, 2], rows: ['.gggggg', 'gbbbbbg', 'gbbbbbg', '.gggggg'] },
  gloves:  { grip: [2, 3], rows: ['w.w.w', 'wwwww', 'wwwww', '.www.'] },
  scissors: { grip: [3, 5], rows: ['g.....g', '.g...g.', '..g.g..', '...G...', '..n.n..', '.n...n.', 'n.....n'] },
  bubbler: { grip: [2, 6], rows: ['.www.', 'w...w', 'w...w', '.www.', '..n..', '..n..', '..n..'] },
  chain:   { grip: [2, 8], rows: ['w.g.w', '.ggg.', 'ggwgg', '.ggg.', 'w.g.w', '..n..', '..n..', '..n..', '..n..'] },
  dagger:  { grip: [1, 6], rows: ['..v', '.vv', '.vv', '.v.', 'GGG', '.n.', '.n.'] },
  bisento: { grip: [1, 13], rows: ['..ww', '.www', '.ww.', 'GGG.'].concat(Array(12).fill('.n..')) },
  gauntlet: { grip: [1, 3], rows: ['rRrr', 'rrRr', 'rrrr', '.gg.'] },
  knuckles: { grip: [2, 2], rows: ['wgwgw', 'ggggg', 'ggggg'] },
  nodachi: { grip: [1, 14], rows: Array(11).fill('.w.').concat(['GGG', '.n.', '.n.', '.n.', '.n.']) },
  lamp:    { grip: [2, 5], rows: ['..g..', '.ggg.', 'gyyyg', 'gyyyg', '.ggg.', '..n..'] },
  slingshot: { grip: [2, 4], rows: ['n...n', 'nw.wn', '.n.n.', '..n..', '..n..'] },
  whip:    { grip: [2, 5], rows: ['.rrr.', 'r...r', 'r.r.r', 'r...r', '.rr..', '..n..'] },
  bicorne: { grip: [2, 10], rows: ['.xxx.', 'xxGxx', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '.GGG.', '..n..', '..n..'] },
  mogura:  { grip: [2, 13], rows: ['r.r.r', 'r.r.r', 'rrrrr', '..r..'].concat(Array(11).fill('..n..')) },
  spear:   { grip: [1, 11], rows: ['.G.', 'ggg', '.g.'].concat(Array(13).fill('.n.')) },
};

// Ship figureheads, facing right (10x10). Each has its own palette.
const FIGURES = {
  ram:    { pal: { w: '#f2f2f2', y: '#e6b422', k: '#1b1424' }, rows: ['...yyyy...', '..y....y..', '..y.wwwwy.', '...wwwwww.', '..wwwwwkww', '.wwwwwwwww', '.wwwwwwww.', '.wwwwww...', '.www......', '.ww.......'] },
  lion:   { pal: { o: '#f08a3a', y: '#ffd04a', k: '#1b1424', R: '#c0453a' }, rows: ['..o.o.o...', '.oooooooo.', 'ooyyyyyyoo', '.oyyykyyo.', 'ooyyyyyRoo', '.oyyyyyyo.', 'ooyyyyyyoo', '.oooooooo.', '..o.o.o...', '..........'] },
  shark:  { pal: { g: '#7a9ab8', w: '#ffffff', k: '#1b1424' }, rows: ['....g.....', '...gg.....', '..ggggg...', '.gggggkgg.', '.ggggggggg', '.gggwwwww.', '.ggggwww..', '.ggggg....', '.ggg......', '.gg.......'] },
  swan:   { pal: { w: '#ffffff', k: '#1b1424', o: '#f08a3a' }, rows: ['......ww..', '.....wwkoo', '.....www..', '.....ww...', '....ww....', '....ww....', '...www....', '.wwwwww...', 'wwwwwww...', '.wwwww....'] },
  skull:  { pal: { w: '#f2f2f2', k: '#1b1424' }, rows: ['..wwwwww..', '.wwwwwwww.', 'wwwwwwwwww', 'wkkwwwkkww', 'wkkwwwkkww', 'wwwwkwwwww', '.wwwwwwww.', '..wkwkwk..', '..wwwwww..', '..........'] },
  dragon: { pal: { b: '#4a8ad9', x: '#f2e6c8', w: '#bfe0ff', k: '#1b1424' }, rows: ['..x...x...', '...x.x....', '..bbbbbb..', '.bbbbkbbbb', '.bbbbbbbbw', '.bbbbbww..', '.bbbb.....', '.bbb......', '.bb.......', '.bb.......'] },
};

// 8x8 item icons
const ICONS = {
  meat:     ['......ww', '.....ww.', '..rrrw..', '.rrrrrr.', 'rrRrrrr.', 'rRrrrr..', '.rrrr...', '........'],
  bigmeat:  ['w......w', '.ww..ww.', '..rrrr..', '.rrRrrr.', 'rrrrrRrr', 'rRrrrrrr', '.rrrrrr.', '..rrrr..'],
  medicine: ['..gggg..', '...ww...', '..wwww..', '.wwrrww.', '.wrrrrw.', '.wwrrww.', '.wwwwww.', '..wwww..'],
  cola:     ['...gg...', '...bb...', '..bbbb..', '.bbbbbb.', '.brrrrb.', '.bbbbbb.', '.bbbbbb.', '..bbbb..'],
  water:    ['...bb...', '..bbbb..', '.nnnnnn.', 'nggggggn', 'nnnnnnnn', 'nnnnnnnn', 'nggggggn', '.nnnnnn.'],
  weights:  ['........', 'gg....gg', 'gg....gg', 'ggwwwwgg', 'gg....gg', 'gg....gg', '........', '........'],
  fish:     ['........', '..bbb..b', '.bbbbbbb', 'bwbbbbb.', 'bbbbbbbb', '.bbbbb.b', '..bbb...', '........'],
  fruit:    ['....g...', '...gg...', '.cccccc.', 'cCccCccc', 'ccCccCcc', 'cCccCccc', 'ccCccCcc', '.cccccc.'],
  chest:    ['........', '.nnnnnn.', 'nGGGGGGn', 'nnnGGnnn', 'nnnGGnnn', 'nnnnnnnn', 'nnnnnnnn', '........'],
  sails:    ['...n....', '..wwww..', '.rrrrrr.', '.wwwwww.', '.rrrrrr.', '..wwww..', '...n....', 'nnnnnnnn'],
  galley:   ['.w..w...', '..w..w..', '.w..w...', 'gggggggg', '.hhhhhh.', '.hhhhhh.', '.hhhhhh.', '..hhhh..'],
  sword:    ['......ww', '.....www', '....www.', '.n.www..', '..nww...', '..nn....', '.n..n...', 'n.......'],
  map:      ['.CCCCCC.', 'CCCCCCCC', 'CbCCCrCr', 'CCbCCCrC', 'CCCbCrCr', 'CCCCbCCC', 'CCCCCCCC', '.CCCCCC.'],
  poster:   ['CCCCCCCC', 'ChhhhhhC', 'CCCCCCCC', 'CCssssCC', 'CCseesCC', 'CCssssCC', 'ChhhhhhC', 'CCCCCCCC'],
  moon:     ['..yyy...', '.yy.....', 'yy....w.', 'yy...ww.', 'yy......', 'yy......', '.yy.....', '..yyy...'],
  mug:      ['.wwwww..', 'wwwwwww.', 'GGGGGnn.', 'GGyGGn.n', 'GGyGGn.n', 'GGyGGnn.', 'GGGGG...', '.GGG....'],
  wraps:    ['..wwww..', '.wwwwww.', 'wwswswsw', 'wwwwwwww', 'wwwwwww.', '.wwwww..', '..sss...', '..sss...'],
  nest:     ['.nnnnnn.', 'nwnnnnwn', 'nnnnnnnn', '.nnnnnn.', '...nn...', '...nn...', '...nn...', '...nn...'],
  bunks:    ['n......n', 'n......n', 'nwwwwwwn', 'n.wwww.n', 'n......n', 'nwwwwwwn', 'n.wwww.n', 'n......n'],
  aquarium: ['gggggggg', 'gbbbbbbg', 'gbCbbbbg', 'gCCCbbbg', 'gbCbbbyg', 'gbbbbyyg', 'gggggggg', '.n....n.'],
  lantern:  ['...k....', '..rrr...', '.rrrrr..', '.rGrGr..', '.rrrrr..', '..rrr...', '...k....', '........'],
  figurehead: ['..y..y..', '.y.ww.y.', '..wwww..', '.wwkwkw.', '.wwwwww.', '..wwww..', '..nnnn..', '.nnnnnn.'],
  paint:    ['..cccc..', '.c....c.', 'gggggggg', 'gccccccg', 'gccccccg', 'gccccccg', '.gccccg.', '..gggg..'],
  ship:     ['...n....', '..wwww..', '.wwwwww.', '..wwww..', '...n....', 'nnnnnnnn', '.nnnnnn.', '..bbbb..'],
  burst:    ['........', 'rr......', 'Rrhhhhhh', 'RRhhhhhh', 'Rrhhhhhh', 'rr......', '.nnnnnn.', '........'],
  bubble:   ['..wwww..', '.w....w.', 'w..ww..w', 'w.w....w', 'w......w', 'w......w', '.w....w.', '..wwww..'],
  cannon:   ['........', '.......g', 'hhhhhhhh', 'hhhhhhh.', 'hhhhhh..', '.nn.nn..', 'nnnnnn..', '.nn.nn..'],
};

// ---------- sprite building ----------

function buildGrid(spec) {
  let rows;
  if (spec.kind === 'player') rows = HUMAN_HEADS.hair.concat(PLAYER_BODY);
  else if (spec.kind === 'human') rows = HUMAN_HEADS[spec.head || 'hair'].concat(HUMAN_BODY);
  else if (spec.kind === 'brute') rows = BRUTE_HEADS[spec.head || 'ape'].concat(BRUTE_BODY);
  else if (spec.kind === 'icon') rows = ICONS[spec.icon];
  else if (spec.kind === 'weapon') rows = WEAPON_SHAPES[spec.shape].rows;
  else if (spec.kind === 'figure') rows = FIGURES[spec.head].rows;
  else rows = SHAPES[spec.kind];
  const width = rows[0].length;
  const g = rows.map(r => r.padEnd(width, '.').slice(0, width).split(''));
  if (spec.long) for (let y = 5; y <= 8; y++) { g[y][3] = 'h'; g[y][12] = 'h'; }
  if (spec.head === 'swoop') { g[5][5] = 'h'; g[6][5] = 'h'; g[6][6] = 'h'; }
  const overlays = [].concat(spec.weapon ? OVERLAYS[spec.weapon] : [], spec.horns ? OVERLAYS.horns : [], ...(spec.marks || []).map(m => OVERLAYS[m]));
  for (const [x, y, w, h, ch] of overlays) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (g[y + j] && x + i < width) g[y + j][x + i] = ch;
    }
  }
  return g;
}

function makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

// Characters get simple pixel shading: a darker rim on the lower-right edge,
// a highlight on the upper-left, and a shadow under hair and hats.
const SHADE_SKIP = 'ekmw';
const CAST_SHADOW = 'hxyYr';
function shadeColor(grid, x, y, ch, col, filled) {
  if (SHADE_SKIP.includes(ch)) return col;
  if (!filled(x + 1, y) || !filled(x, y + 1)) return mixColor(col, '#1b1424', 0.24);
  if (ch === 's' && y > 0 && CAST_SHADOW.includes(grid[y - 1][x])) return mixColor(col, '#1b1424', 0.2);
  if (!filled(x - 1, y) || !filled(x, y - 1)) return mixColor(col, '#ffffff', 0.18);
  return col;
}

function renderGrid(grid, pal, shade) {
  const h = grid.length, w = grid[0].length;
  const cv = makeCanvas(w + 2, h + 2);
  const c = cv.getContext('2d');
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== '.';
  c.fillStyle = pal.k;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) c.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      const col = pal[ch] || '#ff00ff';
      c.fillStyle = shade ? shadeColor(grid, x, y, ch, col, filled) : col;
      c.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  return cv;
}

function variantOf(cv, kind, color) {
  const v = makeCanvas(cv.width, cv.height);
  const c = v.getContext('2d');
  c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  if (kind === 'flash') {
    c.fillStyle = '#ffffff';
  } else {
    c.globalAlpha = 0.5;
    c.fillStyle = color;
  }
  c.fillRect(0, 0, v.width, v.height);
  return v;
}

const SPRITE_CACHE = new Map();
function getSprite(spec, variant, color) {
  const key = JSON.stringify(spec) + '|' + (variant || '') + (color || '');
  let cv = SPRITE_CACHE.get(key);
  if (!cv) {
    cv = variant ? variantOf(getSprite(spec), variant, color)
      : renderGrid(buildGrid(spec), Object.assign({}, PAL, spec.kind === 'figure' ? FIGURES[spec.head].pal : {}, spec.pal || {}), !['icon', 'weapon', 'figure'].includes(spec.kind));
    SPRITE_CACHE.set(key, cv);
  }
  return cv;
}

// Sprite rendered at an integer scale, as a data URL for <img> tags in menus.
const URL_CACHE = new Map();
function spriteURL(spec, scale) {
  const key = JSON.stringify(spec) + '@' + scale;
  if (!URL_CACHE.has(key)) {
    const src = getSprite(spec);
    const cv = makeCanvas(src.width * scale, src.height * scale);
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, cv.width, cv.height);
    URL_CACHE.set(key, cv.toDataURL());
  }
  return URL_CACHE.get(key);
}
function iconURL(name, pal) {
  return spriteURL({ kind: 'icon', icon: name, pal: pal || {} }, 3);
}

// ---------- 3x5 bitmap font ----------

const FONT = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '!': '010010010000010', '+': '000010111010000', '-': '000000111000000', '.': '000000000000010',
  '?': '110001010000010', ' ': '000000000000000', ':': '000010000010000', "'": '010010000000000',
  ',': '000000000010100', '/': '001001010100100', '%': '101001010100101', '&': '010101010101011',
};

function textWidth(str, scale) {
  return Math.max(0, String(str).length * 4 * scale - scale);
}

function glyph(c, ch, x, y, scale, color) {
  const bits = FONT[ch] || FONT['?'];
  c.fillStyle = color;
  for (let i = 0; i < 15; i++) {
    if (bits[i] === '1') c.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
  }
}

function drawText(c, str, x, y, opts) {
  const o = Object.assign({ color: '#ffffff', scale: 1, shadow: PAL.k, align: 'left' }, opts);
  str = String(str).toUpperCase();
  const w = textWidth(str, o.scale);
  x = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  y = Math.round(y);
  for (let i = 0; i < str.length; i++) {
    const gx = x + i * 4 * o.scale;
    if (o.shadow) {
      glyph(c, str[i], gx - 1, y, o.scale, o.shadow);
      glyph(c, str[i], gx + 1, y, o.scale, o.shadow);
      glyph(c, str[i], gx, y - 1, o.scale, o.shadow);
      glyph(c, str[i], gx, y + 1, o.scale, o.shadow);
    }
    glyph(c, str[i], gx, y, o.scale, o.color);
  }
}

// ---------- pixel primitives ----------

function pxRect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pxCircle(c, cx, cy, r, color) {
  c.fillStyle = color;
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    c.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}

function pxRing(c, cx, cy, r, color, t) {
  t = t || 1;
  c.fillStyle = color;
  const steps = Math.max(12, Math.round(r * 7));
  for (let i = 0; i < steps; i++) {
    const a = i / steps * Math.PI * 2;
    c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), t, t);
  }
}

function pxLine(c, x0, y0, x1, y1, color, t) {
  t = t || 1;
  c.fillStyle = color;
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const o = Math.floor(t / 2);
  for (let i = 0; i <= n; i++) {
    c.fillRect(Math.round(x0 + dx * i / n) - o, Math.round(y0 + dy * i / n) - o, t, t);
  }
}

// ---------- color helpers ----------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return '#' + r.map(v => v.toString(16).padStart(2, '0')).join('');
}
