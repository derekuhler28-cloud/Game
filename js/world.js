'use strict';
/* Overworld: walk around every island and your ship's deck, old-handheld style.
   Tile maps (templates + island themes), grid movement, crew followers, tap-to-walk and interactions. */

const TS = 16;
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const STEP_WALK = 0.19, STEP_RUN = 0.11;

// ---------- island themes ----------

const BASE_THEME = {
  gk: 'grass', ground: ['#78c850', '#5aa83c', '#98dc70'], path: ['#dcbc84', '#b8955e', '#c8a66c'], sand: ['#f2dca0', '#dcc07c'],
  water: ['#3a8ad8', '#8fd0f2', '#2a6ab8'], tall: ['#3f9a3a', '#287a2c', '#6cc24a'],
  tree: 'oak', leaf: ['#3f9a3a', '#2a7430', '#6cc24a'], trunk: '#7a4a24', roofs: ['#c0453a', '#3b6fd6', '#e0703a'], wall: '#f2e4c0',
  flowers: ['#ff6a6a', '#ffe14a', '#ffffff'], lair: { kind: 'fort', a: '#9aa4b1', b: '#5a6474', c: '#c0453a' },
};
const THEMES = {
  village: { lair: { kind: 'hut', a: '#9a6a3a', b: '#6a4428', c: '#c0453a' } },
  marine: { ground: ['#70c060', '#52a046', '#90d878'], path: ['#c9c9c0', '#9a9a92', '#b2b2aa'], roofs: ['#8a5a32', '#3b6fd6', '#2f5fb3'], wall: '#f4f4ee', lair: { kind: 'fort', a: '#f4f4ee', b: '#2f5fb3', c: '#9aa4b1' } },
  town: { gk: 'stone', ground: ['#e8bc88', '#cc9c66', '#f6d0a0'], path: ['#c98a5a', '#a86a3a', '#b87a4a'], tree: 'orange', roofs: ['#8a3a22', '#3b6fd6', '#e0703a'], lair: { kind: 'tent', a: '#d63c2f', b: '#ffe14a', c: '#3b6fd6' } },
  syrup: { ground: ['#82c45a', '#62a442', '#a2dc78'], leaf: ['#4a9a3a', '#2e6e2c', '#78c450'], roofs: ['#8a5a32', '#3b6fd6', '#c0453a'], lair: { kind: 'mansion', a: '#f2eee4', b: '#3b6fd6', c: '#c9a26a' } },
  baratie: { gk: 'planks', ground: ['#c08a56', '#9a6a3a', '#d8a470'], path: ['#9a6a3a', '#7a4a24', '#8a5a32'], sand: ['#c08a56', '#9a6a3a'], tall: ['#8a9aaa', '#5a6a7a', '#b8c8d8'], tree: 'barrel', edge: true, roofs: ['#2f8a6a', '#3b6fd6', '#f2f2f2'], wall: '#fff6dc', lair: { kind: 'fort', a: '#ffd04a', b: '#5a4a3a', c: '#c0453a' } },
  reef: { tree: 'palm', alt: 'orange', roofs: ['#2f8a6a', '#3b6fd6', '#e0703a'], lair: { kind: 'fort', a: '#5ab8a0', b: '#2a6a7a', c: '#3a4a5a' } },
  logue: { gk: 'stone', ground: ['#b8b0a0', '#968e80', '#d0c8b8'], path: ['#8a8478', '#6a6458', '#7a7468'], roofs: ['#5a3a2a', '#3b6fd6', '#6a5a4a'], lair: { kind: 'tower', a: '#7a6050', b: '#3a3030', c: '#c0453a' } },
  drum: { gk: 'snow', ground: ['#eef3fa', '#c8d4e4', '#ffffff'], path: ['#c8d4e4', '#9aaabf', '#b0bfd2'], sand: ['#dfe8f5', '#c0cee0'], tall: ['#d6e2f0', '#a2b4ca', '#ffffff'], tree: 'snowpine', leaf: ['#2a6a4a', '#1a4a34', '#3a8a5a'], roofs: ['#3b6fd6', '#c0453a', '#5a6474'], lair: { kind: 'castle', a: '#9aa4b1', b: '#5a6474', c: '#3b6fd6' } },
  desert: { gk: 'sand', ground: ['#e9c27b', '#cfa45e', '#f5d79a'], path: ['#c9a87a', '#a8865a', '#b8966a'], sand: ['#f0d090', '#d8b070'], tall: ['#c9a05a', '#8a6a32', '#e8c888'], tree: 'cactus', alt: 'palm', roofs: ['#c0453a', '#3b6fd6', '#d8b070'], wall: '#f2dcb0', lair: { kind: 'castle', a: '#e8c890', b: '#b08a52', c: '#ffd04a' } },
  sky: { gk: 'cloud', ground: ['#f4f7ff', '#d2dcf2', '#ffffff'], path: ['#ffe9a8', '#e0c070', '#f0d890'], sand: ['#e8eefc', '#c8d4f0'], water: ['#9ad0f5', '#e0f4ff', '#6ab4ec'], tall: ['#dfe8fa', '#b0c0e8', '#ffffff'], tree: 'cloud', edge: true, roofs: ['#ffd04a', '#3b6fd6', '#f08a3a'], lair: { kind: 'tower', a: '#ffd04a', b: '#c9963b', c: '#ffffff' } },
  water7: { gk: 'stone', ground: ['#c8d0d8', '#a6aebc', '#dde4ec'], path: ['#aab2c0', '#8a92a2', '#9aa2b2'], roofs: ['#3b6fd6', '#f08a3a', '#c0453a'], lair: { kind: 'fort', a: '#f08a3a', b: '#3b6fd6', c: '#5ab8e8' } },
  enies: { gk: 'stone', ground: ['#f2eee4', '#d6d0c2', '#ffffff'], path: ['#e0c890', '#c0a060', '#d0b478'], tree: 'pillar', roofs: ['#2f5fb3', '#3b6fd6', '#c9b88a'], lair: { kind: 'tower', a: '#f4f0e6', b: '#c9b88a', c: '#2f5fb3' } },
  thriller: { ground: ['#4e5e54', '#3a4840', '#627266'], path: ['#6a6070', '#4a4250', '#5a5260'], tall: ['#5a4a6a', '#34264a', '#7e6e92'], tree: 'dead', roofs: ['#5a3a6a', '#3a2a4a', '#6a4a5a'], wall: '#b8a8c0', flowers: ['#c0a0ff', '#ffffff', '#9aff9a'], lair: { kind: 'mansion', a: '#6a5a7a', b: '#2a1a3a', c: '#9a8aaa' }, tint: ['#2a1a3a', 0.22] },
  sabaody: { ground: ['#a8d070', '#86b04e', '#c2e492'], path: ['#b08a5a', '#8a6438', '#9a7448'], tree: 'mangrove', bubbles: true, roofs: ['#c0453a', '#3b6fd6', '#ffd04a'], lair: { kind: 'fort', a: '#c0453a', b: '#ffd04a', c: '#3a2a4a' } },
  impel: { gk: 'stone', ground: ['#6a5a5a', '#524444', '#7e6e6e'], path: ['#9a3a32', '#6a2a24', '#7a3228'], sand: ['#6a5a5a', '#524444'], tall: ['#8a7a4a', '#5a4a2a', '#b0a060'], tree: 'pillar', dark: true, roofs: ['#5a2a2a', '#3a2a2a', '#4a3a3a'], wall: '#9a8a8a', lair: { kind: 'castle', a: '#5a4a4a', b: '#2a1a1a', c: '#c0453a' }, tint: ['#2a0a0a', 0.22] },
  marineford: { gk: 'stone', ground: ['#c9c9c0', '#a8a8a0', '#dcdcd4'], path: ['#9aa4b1', '#7a8494', '#8a94a2'], roofs: ['#2f5fb3', '#3b6fd6', '#5a6474'], wall: '#f4f4ee', lair: { kind: 'fort', a: '#f4f4ee', b: '#2f5fb3', c: '#9aa4b1' } },
  fishman: { gk: 'sand', ground: ['#f2c8b8', '#d8a898', '#ffe0d0'], path: ['#e8b0c0', '#c88898', '#d8a0b0'], sand: ['#f8d8c8', '#e0b8a8'], water: ['#1a5a8a', '#5ab0e0', '#0a3a5a'], tall: ['#3a8a6a', '#1a5a4a', '#62c08e'], tree: 'coral', bubbles: true, roofs: ['#ff9ab8', '#5ab8e8', '#ffd04a'], wall: '#fff0f4', lair: { kind: 'castle', a: '#ff9ab8', b: '#c05a7a', c: '#ffd04a' }, tint: ['#0a4a6a', 0.2] },
  punkhazard: { ground: ['#a86a50', '#86503c', '#c08068'], path: ['#7a6a6a', '#5a4a4a', '#6a5a5a'], tall: ['#8a6a5a', '#5a3a2a', '#b08a7a'], tree: 'dead', roofs: ['#3a9a9a', '#3b6fd6', '#c94a2a'], lair: { kind: 'fort', a: '#e8f0f0', b: '#3a9a9a', c: '#c94a2a' } },
  dressrosa: { gk: 'stone', ground: ['#e8c898', '#c8a878', '#f8dcb0'], path: ['#c98a5a', '#a86a3a', '#b87a4a'], tree: 'sunflower', roofs: ['#ff8ab0', '#ffd04a', '#c0453a'], flowers: ['#ff6a9a', '#ffe14a', '#ff9a3a'], lair: { kind: 'castle', a: '#ffb0c8', b: '#c05a7a', c: '#ffd04a' } },
  wholecake: { gk: 'candy', ground: ['#ffc8dc', '#f0a8c4', '#ffe4ee'], path: ['#8a5a3a', '#6a4028', '#a8704a'], sand: ['#fff0d8', '#f0d8b8'], tall: ['#ff9ac0', '#d8689a', '#ffd0e4'], tree: 'candy', roofs: ['#8a5a3a', '#ff9ac0', '#5ab8e8'], wall: '#fff0d8', lair: { kind: 'castle', a: '#fff0d8', b: '#ff9ac0', c: '#8a5a3a' } },
  volcano: { gk: 'stone', ground: ['#5a4a50', '#463840', '#6c5c62'], path: ['#3a2e34', '#2a1e24', '#4a3e44'], sand: ['#4a3a40', '#3a2a30'], tall: ['#6a4a3a', '#3a2418', '#9a6a4a'], tree: 'lavarock', roofs: ['#3a2a30', '#5a3a3a', '#2a1a20'], wall: '#8a7a7a', lair: { kind: 'castle', a: '#4a3a40', b: '#2a1a20', c: '#ff5a2a' }, tint: ['#7a2a2a', 0.12] },
};
const theme = scene => Object.assign({}, BASE_THEME, THEMES[scene] || {});

// ---------- map templates (24 x 18) ----------
// T tree  . ground  # path  , sand  " wild grass  ~ water  = pier  F flowers  r rock
// B bar (D door)  M shop (N door)  H house  L boss lair  X boss  b bush  t trash can
// d training dummy  j job board  o fishing spot  S island sign  s ship  g gangplank  v villager

const MAPS = {
  A: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTLLLLLLLLTTTTTTTT',
    'TT""""TTLLLLLLLLTT""""TT',
    'TT""b"""LLLLLLLL"""b""TT',
    'TT"""""rLLLLLLLLr"""""TT',
    'TT""""...F.X#F....""""TT',
    'TT"b"......##......"b"TT',
    'T.BBBBBj..F##F...MMMMM.T',
    'T.BBBBB.v..##..d.MMMMM.T',
    'T.BBBBBt...##....MMMMMtT',
    'T.BBDBB....##....MMNMM.T',
    'T..##################..T',
    'TbHHHH..F..##.Fv.b""""TT',
    'T.HHHH.t...##....r""""TT',
    'T,,,,,,,,,S==,,,,,,,,,,T',
    '~~~~~~~~~~~==~ssssss~~~~',
    '~~~~~~~~~~~==gssssss~~~~',
    '~~~~~~~~~~~=o~ssssss~~~~',
  ],
  B: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTT"""""TLLLLLLLLTT',
    'TTBBBBBT"b""".LLLLLLLLTT',
    'T.BBBBB.""""..LLLLLLLLTT',
    'T.BBBBBj....r.LLLLLLLLTT',
    'T.BBDBB...F......X..b.TT',
    'T..################....T',
    'Td....#..~~~~.......b..T',
    'T..d.v#.F~~~~F.MMMMM...T',
    'T.....#..~~~~..MMMMM.t.T',
    'Tb..t.#.HHHH...MMMMM...T',
    'T"""""#.HHHH...MMNMM...T',
    'T"""""############....rT',
    'T"b"""#.t...........b..T',
    'T,,,S==,,,,,,,,,,,,,,,,T',
    '~~~~~==~ssssss~~~~~~~~~~',
    '~~~~~==gssssss~~~~~~~~~~',
    '~~~~~o=~ssssss~~~~~~~~~~',
  ],
};

const SOLID_CH = '~sTrBMHLbtdjoSXO';
const WALK_GROUND = { '#': 'path', 'X': 'path', ',': 'sand', 'S': 'sand', '"': 'tall', '~': 'water', 's': 'water', '=': 'pier', 'g': 'pier', 'o': 'pier' };

const MAP_CACHE = new Map();

function islandMap(idx) {
  if (MAP_CACHE.has(idx)) return MAP_CACHE.get(idx);
  const isl = ISLANDS[idx], th = theme(isl.scene);
  const variant = idx % 2 ? 'B' : 'A', mirror = idx % 4 >= 2;
  let rows = MAPS[variant].map(r => (mirror ? [...r].reverse().join('') : r));
  if (th.edge) {
    rows = rows.map((r, y) => [...r].map((ch, x) => (ch === 'T' && (y === 0 || x === 0 || x === r.length - 1) ? '~' : ch)).join(''));
  }
  const m = parseMap(rows, th, 'isl:' + idx);
  m.idx = idx;
  m.name = isl.name;
  m.mirror = mirror;
  const r = seeded(idx * 977 + 13);
  // Trees vary a little: some islands mix in a second kind.
  m.treeKind = (x, y) => (th.alt && ((x * 7 + y * 13 + idx) % 3 === 0) ? th.alt : th.tree);
  m.flowerSeed = r;
  renderMapLayer(m);
  MAP_CACHE.set(idx, m);
  return m;
}

function parseMap(rows, th, key) {
  const h = rows.length, w = rows[0].length;
  const m = { key, w, h, th, rows, ground: [], solid: new Uint8Array(w * h), obj: new Array(w * h).fill(null), objs: [], villagers: [], bushes: [], lights: [] };
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] : 'T');
  m.at = at;
  // multi-tile buildings: connected blocks of the same letter (doors count as part of their building)
  const seen = new Set();
  const group = { B: 'B', D: 'B', M: 'M', N: 'M', H: 'H', L: 'L', s: 's' };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!group[ch] || seen.has(x + ',' + y)) continue;
      const g = group[ch], cells = [], stack = [[x, y]];
      seen.add(x + ',' + y);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (group[at(nx, ny)] === g && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); stack.push([nx, ny]); }
        }
      }
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
      const b = { type: { B: 'bar', M: 'shop', H: 'house', L: 'lair', s: 'ship' }[g], x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
      const door = cells.find(([cx, cy]) => 'DN'.includes(rows[cy][cx]));
      if (door) b.door = { x: door[0], y: door[1] };
      else if (g === 'H') b.door = { x: b.x + 1, y: b.y + b.h - 1, fake: true };
      m.objs.push(b);
      for (const [cx, cy] of cells) {
        if (b.door && !b.door.fake && cx === b.door.x && cy === b.door.y) { m.obj[cy * w + cx] = { type: 'door', of: b }; continue; }
        m.obj[cy * w + cx] = b;
        m.solid[cy * w + cx] = 1;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x], i = y * w + x;
      m.ground[i] = WALK_GROUND[ch] || 'ground';
      if (SOLID_CH.includes(ch)) m.solid[i] = 1;
      const single = { b: 'bush', t: 'trash', d: 'dummy', j: 'job', o: 'fish', S: 'sign', r: 'rock', T: 'tree', O: 'mast' }[ch];
      if (single) {
        const o = { type: single, x, y, w: 1, h: 1 };
        m.obj[i] = o;
        if (single !== 'tree' && single !== 'rock') m.objs.push(o);
        if (single === 'bush') m.bushes.push(o);
      }
      if (ch === 'X') { m.boss = { x, y }; }
      if (ch === 'v') m.villagers.push({ x, y });
      if (ch === 'g') { m.gang = { x, y }; m.obj[i] = { type: 'gang' }; }
    }
  }
  // Arriving: step off the gangplank onto the pier, facing the island.
  if (m.gang) {
    const pier = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => [m.gang.x + dx, m.gang.y + dy]).find(([x, y]) => at(x, y) === '=');
    m.spawn = { x: pier[0], y: pier[1], dir: 'up' };
  }
  return m;
}

const walkable = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !m.solid[y * m.w + x];

// ---------- painting the static map layer ----------

const K = PAL.k;

function shade(c, k) { return mixColor(c, '#1b1424', k); }
function tint(c, k) { return mixColor(c, '#ffffff', k); }

function renderMapLayer(m) {
  const cv = makeCanvas(m.w * TS, m.h * TS);
  const c = cv.getContext('2d');
  const th = m.th;
  const r = seeded((m.idx || 0) * 31 + 7);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const px = x * TS, py = y * TS, g = m.ground[y * m.w + x];
      if (g === 'water') paintWater(c, px, py, th, r);
      else if (g === 'path') paintPath(c, m, x, y, th, r);
      else if (g === 'sand') paintSand(c, px, py, th, r);
      else if (g === 'tall') paintTall(c, px, py, th);
      else if (g === 'pier') paintPier(c, m, x, y);
      else paintGround(c, px, py, th, r);
      if (g === 'water') paintShore(c, m, x, y, th);
    }
  }
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const ch = m.rows[y][x], px = x * TS, py = y * TS;
      if (ch === 'F') paintFlowers(c, px, py, th, r);
      else if (ch === 'T') paintTree(c, px, py, m.treeKind ? m.treeKind(x, y) : th.tree, th, r);
      else if (ch === 'r') paintRock(c, px, py, th);
      else if (ch === 'd') paintDummy(c, px, py);
      else if (ch === 'j') paintJobBoard(c, px, py);
      else if (ch === 'o') paintFishSpot(c, px, py);
      else if (ch === 'S') paintSign(c, px, py);
    }
  }
  for (const o of m.objs) {
    if (o.type === 'bar' || o.type === 'shop' || o.type === 'house') paintBuilding(c, m, o);
    else if (o.type === 'lair') paintLair(c, m, o);
  }
  m.layer = cv;
}

function paintGround(c, x, y, th, r) {
  const [b, d, l] = th.ground;
  pxRect(c, x, y, TS, TS, b);
  if (th.gk === 'stone') {
    const odd = (y / TS) % 2;
    pxRect(c, x, y + 7, TS, 1, d);
    pxRect(c, x, y + 15, TS, 1, d);
    pxRect(c, x + (odd ? 3 : 11), y, 1, 7, d);
    pxRect(c, x + (odd ? 11 : 3), y + 8, 1, 7, d);
    pxRect(c, x + (odd ? 4 : 12), y, 3, 1, l);
    pxRect(c, x + (odd ? 12 : 4), y + 8, 3, 1, l);
    if (r() < 0.4) pxRect(c, x + 2 + (r() * 11 | 0), y + 2 + (r() * 11 | 0), 1, 1, d);
  } else if (th.gk === 'planks') {
    for (let i = 0; i < 4; i++) {
      pxRect(c, x, y + i * 4 + 3, TS, 1, d);
      pxRect(c, x + ((i * 5 + (y / TS) * 3) % 16), y + i * 4, 1, 3, d);
      pxRect(c, x, y + i * 4, TS, 1, l);
    }
    if (r() < 0.3) pxRect(c, x + 3 + (r() * 9 | 0), y + 1 + (r() * 12 | 0), 1, 1, shade(d, 0.3));
  } else if (th.gk === 'snow') {
    for (let i = 0; i < 4; i++) pxRect(c, x + (r() * 15 | 0), y + (r() * 15 | 0), 2, 1, d);
    if (r() < 0.5) pxRect(c, x + (r() * 14 | 0), y + (r() * 14 | 0), 1, 1, l);
  } else if (th.gk === 'sand') {
    for (let i = 0; i < 5; i++) pxRect(c, x + (r() * 15 | 0), y + (r() * 15 | 0), 1, 1, d);
    if (r() < 0.4) pxRect(c, x + (r() * 12 | 0), y + (r() * 13 | 0), 3, 1, l);
  } else if (th.gk === 'cloud') {
    for (let i = 0; i < 2; i++) pxCircle(c, x + 4 + (r() * 8 | 0), y + 4 + (r() * 8 | 0), 2, l);
    for (let i = 0; i < 3; i++) pxRect(c, x + (r() * 14 | 0), y + (r() * 14 | 0), 2, 1, d);
  } else if (th.gk === 'candy') {
    for (let i = 0; i < 3; i++) pxRect(c, x + (r() * 14 | 0), y + (r() * 14 | 0), 2, 1, pick2(r, ['#ffffff', '#ffe14a', '#7ad0ff', '#9aff9a']));
    for (let i = 0; i < 3; i++) pxRect(c, x + (r() * 15 | 0), y + (r() * 15 | 0), 1, 1, d);
  } else {
    for (let i = 0; i < 5; i++) pxRect(c, x + (r() * 15 | 0), y + (r() * 15 | 0), 1, 1, d);
    if (r() < 0.7) {
      const tx = x + 2 + (r() * 10 | 0), ty = y + 3 + (r() * 9 | 0);
      pxRect(c, tx, ty + 1, 1, 2, d); pxRect(c, tx + 2, ty, 1, 3, d); pxRect(c, tx + 4, ty + 1, 1, 2, d);
      pxRect(c, tx + 1, ty + 2, 1, 1, l); pxRect(c, tx + 3, ty + 2, 1, 1, l);
    }
  }
}
const pick2 = (r, arr) => arr[Math.floor(r() * arr.length)];

function paintPath(c, m, x, y, th, r) {
  const px = x * TS, py = y * TS, [b, e, d] = th.path;
  pxRect(c, px, py, TS, TS, b);
  for (let i = 0; i < 4; i++) pxRect(c, px + 1 + (r() * 13 | 0), py + 1 + (r() * 13 | 0), 2, 1, d);
  const isPath = (xx, yy) => ['path', 'pier'].includes(m.ground[yy * m.w + xx]) || 'DNg'.includes(m.at(xx, yy));
  if (y > 0 && !isPath(x, y - 1)) pxRect(c, px, py, TS, 1, e);
  if (y < m.h - 1 && !isPath(x, y + 1)) pxRect(c, px, py + 15, TS, 1, e);
  if (x > 0 && !isPath(x - 1, y)) pxRect(c, px, py, 1, TS, e);
  if (x < m.w - 1 && !isPath(x + 1, y)) pxRect(c, px + 15, py, 1, TS, e);
}

function paintSand(c, x, y, th, r) {
  pxRect(c, x, y, TS, TS, th.sand[0]);
  for (let i = 0; i < 6; i++) pxRect(c, x + (r() * 15 | 0), y + (r() * 15 | 0), 1, 1, th.sand[1]);
  if (r() < 0.25) { pxRect(c, x + 4 + (r() * 8 | 0), y + 4 + (r() * 8 | 0), 2, 1, '#ffffff'); }
}

function paintTall(c, x, y, th) {
  const [b, d, l] = th.tall;
  pxRect(c, x, y, TS, TS, shade(b, 0.15));
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const ox = x + i * 8, oy = y + j * 8;
      pxRect(c, ox, oy + 7, 8, 1, d);
      for (const [bx, top] of [[0, 3], [2, 1], [4, 2], [6, 3]]) {
        pxRect(c, ox + bx, oy + top, 2, 7 - top, b);
        pxRect(c, ox + bx, oy + top, 1, 1, l);
        pxRect(c, ox + bx + 1, oy + top + 1, 1, 6 - top, d);
      }
    }
  }
}

function paintWater(c, x, y, th, r) {
  const [b, l, d] = th.water;
  pxRect(c, x, y, TS, TS, b);
  pxRect(c, x + (r() * 10 | 0), y + 4 + (r() * 8 | 0), 4, 1, d);
}

// Foam where the water touches land.
function paintShore(c, m, x, y, th) {
  const px = x * TS, py = y * TS;
  const land = (xx, yy) => xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && m.ground[yy * m.w + xx] !== 'water' && m.ground[yy * m.w + xx] !== 'pier';
  const foam = th.water[1];
  if (land(x, y - 1)) { pxRect(c, px, py, TS, 2, foam); pxRect(c, px, py + 2, TS, 1, tint(th.water[0], 0.25)); }
  if (land(x - 1, y)) pxRect(c, px, py, 2, TS, foam);
  if (land(x + 1, y)) pxRect(c, px + 14, py, 2, TS, foam);
  if (land(x, y + 1)) pxRect(c, px, py + 14, TS, 2, foam);
}

function paintPier(c, m, x, y) {
  const px = x * TS, py = y * TS;
  const water = m.ground[y * m.w + x] === 'pier' && m.ground[Math.min(m.h - 1, y + 1) * m.w + x] !== 'sand';
  if (water) pxRect(c, px, py, TS, TS, m.th.water[0]);
  for (let i = 0; i < 4; i++) {
    pxRect(c, px, py + i * 4, TS, 4, i % 2 ? '#a06a3a' : '#b07a48');
    pxRect(c, px, py + i * 4 + 3, TS, 1, '#6a4422');
  }
  pxRect(c, px, py, 1, TS, '#6a4422');
  pxRect(c, px + 15, py, 1, TS, '#6a4422');
  if (m.at(x, y) === 'g') { pxRect(c, px + 2, py, 1, TS, '#5a3818'); pxRect(c, px + 13, py, 1, TS, '#5a3818'); }
  if ((x + y) % 2 === 0) { pxRect(c, px + 1, py + 13, 2, 3, '#5a3818'); pxRect(c, px + 13, py + 13, 2, 3, '#5a3818'); }
}

function paintFlowers(c, x, y, th, r) {
  for (let i = 0; i < 4; i++) {
    const fx = x + 2 + (i % 2) * 7 + (r() * 3 | 0), fy = y + 2 + (i >> 1) * 7 + (r() * 3 | 0);
    const col = th.flowers[i % th.flowers.length];
    pxRect(c, fx + 1, fy + 3, 1, 2, th.leaf[1]);
    pxRect(c, fx, fy + 1, 3, 1, col); pxRect(c, fx + 1, fy, 1, 3, col);
    pxRect(c, fx + 1, fy + 1, 1, 1, '#ffe14a');
  }
}

function paintRock(c, x, y, th) {
  const g = th.dark ? '#5a4a4a' : '#9aa0a8';
  pxRect(c, x + 2, y + 13, 12, 2, 'rgba(0,0,0,0.25)');
  pxCircle(c, x + 8, y + 9, 6, K);
  pxCircle(c, x + 8, y + 9, 5, g);
  pxCircle(c, x + 7, y + 8, 3, tint(g, 0.25));
  pxRect(c, x + 5, y + 6, 2, 1, tint(g, 0.5));
  pxRect(c, x + 3, y + 13, 10, 1, shade(g, 0.3));
}

// ---------- trees (one per tile; the forest walls are made of these) ----------

function paintTree(c, x, y, kind, th, r) {
  const [m, d, l] = th.leaf, tr = th.trunk;
  const shadow = () => { c.globalAlpha = 0.25; pxRect(c, x + 2, y + 13, 12, 3, '#000000'); c.globalAlpha = 1; };
  switch (kind) {
    case 'palm': {
      shadow();
      for (let i = 0; i < 9; i++) pxRect(c, x + 7 + Math.round(Math.sin(i / 3) * 1.2), y + 6 + i, 3, 1, i % 3 ? '#9a6a3a' : '#6a4428');
      const fx = x + 8, fy = y + 5;
      for (const [dx, dy] of [[-7, 2], [7, 3], [-5, -4], [5, -4], [0, -5]]) { pxLine(c, fx, fy, fx + dx, fy + dy, K, 3); }
      for (const [dx, dy] of [[-7, 2], [7, 3], [-5, -4], [5, -4], [0, -5]]) { pxLine(c, fx, fy, fx + dx, fy + dy, '#3f9a3a', 2); pxRect(c, fx + dx / 2, fy + dy / 2, 1, 1, '#6cc24a'); }
      pxRect(c, fx - 1, fy + 1, 2, 2, '#7a4a24');
      break;
    }
    case 'pine': case 'snowpine': {
      shadow();
      pxRect(c, x + 6, y + 12, 4, 4, K); pxRect(c, x + 7, y + 12, 2, 3, tr);
      for (let t = 0; t < 3; t++) {
        const ty = y + t * 4, half = 3 + t * 2;
        for (let i = 0; i < 6; i++) {
          const wdt = Math.min(half, 1 + i);
          pxRect(c, x + 8 - wdt - 1, ty + i, wdt * 2 + 2, 1, K);
        }
        for (let i = 0; i < 5; i++) {
          const wdt = Math.min(half - 1, i + 1);
          pxRect(c, x + 8 - wdt, ty + i, wdt * 2, 1, i > 2 ? d : m);
          pxRect(c, x + 8 - wdt, ty + i, 1, 1, l);
        }
        if (kind === 'snowpine') { pxRect(c, x + 7, ty, 2, 1, '#ffffff'); pxRect(c, x + 8 - Math.min(half - 1, 2), ty + 2, Math.min(half - 1, 2) * 2, 1, '#ffffff'); }
      }
      break;
    }
    case 'cactus': {
      shadow();
      const g = '#5a9a3a';
      pxRect(c, x + 5, y + 1, 6, 15, K); pxRect(c, x + 6, y + 2, 4, 14, g); pxRect(c, x + 7, y + 3, 1, 12, '#8ac860');
      pxRect(c, x + 1, y + 5, 5, 3, K); pxRect(c, x + 1, y + 3, 3, 4, K); pxRect(c, x + 2, y + 4, 2, 3, g); pxRect(c, x + 3, y + 6, 3, 1, g);
      pxRect(c, x + 10, y + 7, 5, 3, K); pxRect(c, x + 12, y + 4, 3, 5, K); pxRect(c, x + 13, y + 5, 1, 4, g); pxRect(c, x + 10, y + 8, 4, 1, g);
      pxRect(c, x + 7, y + 1, 2, 1, '#ff8ab0');
      break;
    }
    case 'cloud': {
      for (const [cx, cy, rr] of [[5, 9, 4], [11, 9, 4], [8, 5, 5]]) pxCircle(c, x + cx, y + cy, rr + 1, '#b8c4e0');
      for (const [cx, cy, rr] of [[5, 9, 4], [11, 9, 4], [8, 5, 5]]) pxCircle(c, x + cx, y + cy, rr, '#ffffff');
      pxRect(c, x + 3, y + 12, 11, 1, '#dfe6f6');
      pxRect(c, x + 6, y + 2, 3, 1, '#ffffff');
      break;
    }
    case 'pillar': {
      const s = th.dark ? '#7a6a6a' : '#f4f0e6', sd = th.dark ? '#4a3a3a' : '#c9c2b0';
      shadow();
      pxRect(c, x + 3, y + 1, 10, 15, K);
      pxRect(c, x + 4, y + 2, 8, 13, s);
      pxRect(c, x + 3, y + 1, 10, 3, K); pxRect(c, x + 4, y + 2, 8, 1, sd); pxRect(c, x + 3, y + 13, 10, 3, K); pxRect(c, x + 4, y + 13, 8, 2, sd);
      for (const cx of [5, 8, 10]) pxRect(c, x + cx, y + 4, 1, 9, sd);
      break;
    }
    case 'dead': {
      shadow();
      const b = '#6a5a5a', bd = '#3a2e2e';
      pxRect(c, x + 6, y + 5, 4, 11, K); pxRect(c, x + 7, y + 5, 2, 10, b);
      pxLine(c, x + 8, y + 7, x + 2, y + 2, K, 2); pxLine(c, x + 8, y + 6, x + 13, y + 1, K, 2);
      pxLine(c, x + 8, y + 7, x + 3, y + 2, b); pxLine(c, x + 8, y + 6, x + 12, y + 2, b);
      pxLine(c, x + 4, y + 4, x + 2, y + 6, bd); pxLine(c, x + 11, y + 3, x + 14, y + 5, bd);
      pxRect(c, x + 7, y + 9, 1, 1, bd);
      break;
    }
    case 'mangrove': {
      shadow();
      pxCircle(c, x + 8, y + 6, 7, K); pxCircle(c, x + 8, y + 6, 6, d); pxCircle(c, x + 7, y + 5, 5, m); pxCircle(c, x + 6, y + 4, 2, l);
      for (const rx of [3, 7, 11]) { pxRect(c, x + rx, y + 11, 2, 5, K); pxRect(c, x + rx, y + 11, 1, 4, '#a07a4a'); }
      pxRect(c, x + 3, y + 11, 10, 1, '#8a6a3a');
      break;
    }
    case 'coral': {
      const cc = pick2(r, ['#ff7a9a', '#ffb04a', '#c06aff', '#ff5a5a']);
      for (const [lx, ly, lw, lh] of [[7, 3, 2, 13], [3, 5, 2, 6], [11, 4, 2, 7], [3, 9, 5, 2], [8, 8, 5, 2]]) pxRect(c, x + lx - 1, y + ly - 1, lw + 2, lh + 2, K);
      for (const [lx, ly, lw, lh] of [[7, 3, 2, 13], [3, 5, 2, 6], [11, 4, 2, 7], [3, 9, 5, 2], [8, 8, 5, 2]]) pxRect(c, x + lx, y + ly, lw, lh, cc);
      for (const [lx, ly] of [[7, 3], [3, 5], [11, 4]]) pxRect(c, x + lx, y + ly, 1, 1, tint(cc, 0.5));
      break;
    }
    case 'candy': {
      shadow();
      pxRect(c, x + 7, y + 8, 2, 8, K); pxRect(c, x + 7, y + 8, 1, 7, '#ffffff');
      const cc = pick2(r, ['#ff6a9a', '#7ad0ff', '#ffe14a', '#9aff9a']);
      pxCircle(c, x + 8, y + 6, 6, K); pxCircle(c, x + 8, y + 6, 5, cc);
      pxRing(c, x + 8, y + 6, 3, '#ffffff'); pxRect(c, x + 8, y + 6, 1, 1, '#ffffff');
      break;
    }
    case 'barrel': {
      shadow();
      pxRect(c, x + 3, y + 2, 10, 13, K); pxRect(c, x + 4, y + 3, 8, 11, '#a0663a');
      pxRect(c, x + 4, y + 3, 8, 2, '#c08a56'); pxRect(c, x + 4, y + 6, 8, 1, '#5a5a6a'); pxRect(c, x + 4, y + 11, 8, 1, '#5a5a6a');
      pxRect(c, x + 6, y + 3, 1, 11, '#7a4a24'); pxRect(c, x + 9, y + 3, 1, 11, '#7a4a24');
      break;
    }
    case 'lavarock': {
      pxCircle(c, x + 8, y + 9, 7, K); pxCircle(c, x + 8, y + 9, 6, '#3a2a30'); pxCircle(c, x + 7, y + 8, 3, '#5a4a50');
      pxLine(c, x + 4, y + 10, x + 8, y + 12, '#ff6a2a'); pxLine(c, x + 9, y + 6, x + 12, y + 10, '#ff9a3a');
      break;
    }
    case 'sunflower': {
      shadow();
      pxRect(c, x + 7, y + 7, 2, 9, '#3a7a2a'); pxRect(c, x + 3, y + 10, 4, 2, '#4a9a3a'); pxRect(c, x + 9, y + 12, 4, 2, '#4a9a3a');
      pxCircle(c, x + 8, y + 5, 5, K); pxCircle(c, x + 8, y + 5, 4, '#ffd04a'); pxCircle(c, x + 8, y + 5, 2, '#7a4a24');
      break;
    }
    default: { // round leafy tree, with oranges on the orange kind
      shadow();
      pxRect(c, x + 6, y + 11, 4, 5, K); pxRect(c, x + 7, y + 11, 2, 4, tr);
      pxCircle(c, x + 8, y + 7, 7, K);
      pxCircle(c, x + 8, y + 7, 6, d);
      pxCircle(c, x + 7, y + 6, 5, m);
      pxCircle(c, x + 6, y + 4, 2, l);
      pxRect(c, x + 10, y + 8, 2, 1, d); pxRect(c, x + 4, y + 9, 2, 1, d);
      if (kind === 'orange') for (const [ox, oy] of [[4, 6], [10, 5], [8, 10], [11, 9]]) { pxRect(c, x + ox, y + oy, 2, 2, '#ff9a2a'); pxRect(c, x + ox, y + oy, 1, 1, '#ffd04a'); }
    }
  }
}

// ---------- props ----------

function paintDummy(c, x, y) {
  c.globalAlpha = 0.25; pxRect(c, x + 3, y + 13, 10, 3, '#000000'); c.globalAlpha = 1;
  pxRect(c, x + 7, y + 6, 2, 10, K); pxRect(c, x + 7, y + 6, 1, 9, '#7a4a24');
  pxRect(c, x + 2, y + 6, 12, 3, K); pxRect(c, x + 3, y + 7, 10, 1, '#c9a26a');
  pxCircle(c, x + 8, y + 4, 3, K); pxCircle(c, x + 8, y + 4, 2, '#e8c890');
  pxRect(c, x + 5, y + 9, 6, 4, K); pxRect(c, x + 6, y + 9, 4, 3, '#e8c890');
  pxRect(c, x + 7, y + 3, 1, 1, '#d63c2f'); pxRect(c, x + 9, y + 3, 1, 1, '#d63c2f');
}

function paintJobBoard(c, x, y) {
  c.globalAlpha = 0.25; pxRect(c, x + 2, y + 13, 12, 3, '#000000'); c.globalAlpha = 1;
  pxRect(c, x + 3, y + 9, 2, 7, K); pxRect(c, x + 11, y + 9, 2, 7, K);
  pxRect(c, x + 1, y + 1, 14, 10, K); pxRect(c, x + 2, y + 2, 12, 8, '#a06a3a');
  pxRect(c, x + 3, y + 3, 4, 5, '#f2e4c0'); pxRect(c, x + 8, y + 4, 5, 4, '#fff6dc'); pxRect(c, x + 4, y + 4, 2, 1, '#6a5236'); pxRect(c, x + 9, y + 5, 3, 1, '#6a5236');
  pxRect(c, x + 5, y + 3, 1, 1, '#d63c2f'); pxRect(c, x + 10, y + 4, 1, 1, '#d63c2f');
}

function paintFishSpot(c, x, y) {
  pxRect(c, x + 3, y + 7, 7, 7, K); pxRect(c, x + 4, y + 8, 5, 5, '#5a7aa8'); pxRect(c, x + 4, y + 8, 5, 1, '#8ab0d8');
  pxLine(c, x + 6, y + 9, x + 14, y + 1, K, 2); pxLine(c, x + 6, y + 9, x + 13, y + 2, '#c99a5a');
  pxLine(c, x + 14, y + 1, x + 15, y + 8, '#ffffff');
  pxRect(c, x + 5, y + 9, 2, 1, '#ffd04a');
}

function paintSign(c, x, y) {
  c.globalAlpha = 0.25; pxRect(c, x + 3, y + 13, 10, 3, '#000000'); c.globalAlpha = 1;
  pxRect(c, x + 7, y + 8, 2, 8, K); pxRect(c, x + 7, y + 8, 1, 7, '#7a4a24');
  pxRect(c, x + 1, y + 2, 14, 8, K); pxRect(c, x + 2, y + 3, 12, 6, '#c99a5a'); pxRect(c, x + 2, y + 3, 12, 1, '#e0b878');
  pxRect(c, x + 4, y + 5, 8, 1, '#6a4422'); pxRect(c, x + 4, y + 7, 6, 1, '#6a4422');
}

// ---------- buildings ----------

function paintRoof(c, x, y, w, h, col) {
  pxRect(c, x - 1, y - 1, w + 2, h + 2, K);
  pxRect(c, x, y, w, h, col);
  for (let i = 3; i < h; i += 4) pxRect(c, x, y + i, w, 1, shade(col, 0.22));
  for (let i = 0; i < h; i += 4) for (let j = (i / 4) % 2 ? 2 : 6; j < w; j += 8) pxRect(c, x + j, y + i, 1, 3, shade(col, 0.15));
  pxRect(c, x, y, w, 2, tint(col, 0.3));
  pxRect(c, x, y + h - 2, w, 2, shade(col, 0.35));
}

function paintWindow(c, m, x, y, w, h) {
  pxRect(c, x - 1, y - 1, w + 2, h + 2, K);
  pxRect(c, x, y, w, h, '#7ac0e8');
  pxRect(c, x, y, w, 1, '#bfe6ff');
  pxRect(c, x + 1, y + 1, 1, 1, '#ffffff');
  pxRect(c, x + Math.floor(w / 2), y, 1, h, '#5a8ab8');
  m.lights.push([x, y, w, h]);
}

function paintDoor(c, x, y, col) {
  pxRect(c, x + 3, y, 10, 16, K);
  pxRect(c, x + 4, y + 1, 8, 15, col || '#6a4422');
  pxRect(c, x + 4, y + 1, 8, 1, tint(col || '#6a4422', 0.3));
  pxRect(c, x + 8, y + 1, 1, 15, shade(col || '#6a4422', 0.3));
  pxRect(c, x + 10, y + 8, 1, 2, '#ffd04a');
}

function paintBuilding(c, m, o) {
  const th = m.th;
  const x = o.x * TS, y = o.y * TS, w = o.w * TS, h = o.h * TS;
  const roofCol = o.type === 'bar' ? th.roofs[0] : o.type === 'shop' ? th.roofs[1] : th.roofs[2];
  const wall = o.type === 'bar' ? '#c99a62' : th.wall;
  const roofH = Math.round(h * 0.52);
  // walls
  pxRect(c, x, y + roofH - 2, w, h - roofH + 2, K);
  pxRect(c, x + 1, y + roofH, w - 2, h - roofH, wall);
  if (o.type === 'bar') for (let yy = y + roofH + 3; yy < y + h; yy += 4) pxRect(c, x + 1, yy, w - 2, 1, shade(wall, 0.18));
  else for (let xx = x + 8; xx < x + w - 2; xx += 16) pxRect(c, xx, y + roofH, 1, h - roofH, shade(wall, 0.08));
  pxRect(c, x + 1, y + h - 3, w - 2, 3, shade(wall, 0.3));
  paintRoof(c, x + 1, y + 1, w - 2, roofH - 2, roofCol);
  // door, windows and the sign over the door
  const dx = o.door ? o.door.x * TS : x + TS;
  paintDoor(c, dx, y + h - 16, o.type === 'shop' ? '#3a5a8a' : null);
  for (let wx = x + 5; wx < x + w - 12; wx += 18) {
    if (Math.abs(wx + 4 - (dx + 8)) < 14) continue;
    paintWindow(c, m, wx, y + roofH + 4, 8, 7);
  }
  if (o.type === 'bar' || o.type === 'shop') {
    const label = o.type === 'bar' ? 'BAR' : 'SHOP';
    const tw = textWidth(label, 1) + 6, sx = Math.round(dx + 8 - tw / 2), sy = y + roofH - 6;
    pxRect(c, sx - 1, sy - 1, tw + 2, 9, K);
    pxRect(c, sx, sy, tw, 7, o.type === 'bar' ? '#7a4a24' : '#f2f2f2');
    drawText(c, label, sx + 3, sy + 1, { color: o.type === 'bar' ? '#ffe14a' : '#2f5fb3', shadow: null });
    if (o.type === 'bar') {
      const mx = x + w - 12, my = y + roofH + 2;
      pxRect(c, mx + 3, my - 2, 1, 2, K);
      c.drawImage(getSprite({ kind: 'icon', icon: 'mug' }), mx, my);
    }
  }
}

function paintLair(c, m, o) {
  const L = m.th.lair, x = o.x * TS, y = o.y * TS, w = o.w * TS, h = o.h * TS;
  const gx = x + w / 2 - 12, gy = y + h - 22;
  const gate = (col) => {
    pxRect(c, gx - 1, gy - 1, 26, 23, K);
    pxRect(c, gx, gy, 24, 22, col || '#2a1a1a');
    for (let i = 3; i < 24; i += 5) pxRect(c, gx + i, gy, 1, 22, shade(col || '#2a1a1a', 0.3));
    pxRect(c, gx, gy, 24, 2, tint(col || '#2a1a1a', 0.2));
  };
  const flag = (fx, fy, col) => {
    pxRect(c, fx, fy, 1, 12, K);
    pxRect(c, fx + 1, fy, 9, 6, K);
    pxRect(c, fx + 1, fy + 1, 8, 4, col);
    pxRect(c, fx + 4, fy + 2, 2, 2, '#f4efe1');
  };
  if (L.kind === 'hut') {
    pxRect(c, x + 4, y + 26, w - 8, h - 26, K);
    pxRect(c, x + 5, y + 27, w - 10, h - 28, L.a);
    for (let xx = x + 8; xx < x + w - 6; xx += 6) pxRect(c, xx, y + 27, 1, h - 28, L.b);
    for (let i = 0; i < 9; i++) pxRect(c, x + 2 + i * 2, y + 26 - i * 2, w - 4 - i * 4, 2, i ? shade(L.a, 0.1 + i * 0.03) : K);
    for (let xx = x; xx < x + w; xx += 6) { pxRect(c, xx, y + 30, 4, 34, K); pxRect(c, xx + 1, y + 32, 2, 32, L.b); pxRect(c, xx + 1, y + 30, 2, 2, '#c9a26a'); }
    gate('#3a2418');
    flag(x + w - 18, y + 2, L.c);
    pxCircle(c, x + w / 2, y + 22, 4, '#f4efe1'); pxRect(c, x + w / 2 - 2, y + 21, 1, 1, K); pxRect(c, x + w / 2 + 1, y + 21, 1, 1, K);
  } else if (L.kind === 'tent') {
    for (let i = 0; i < 40; i++) {
      const half = 10 + i * 1.4;
      pxRect(c, x + w / 2 - half - 1, y + 4 + i, half * 2 + 2, 1, K);
      for (let s = -half; s < half; s += 1) {
        const col = Math.floor((s + 200) / 9) % 2 ? L.a : L.b;
        pxRect(c, x + w / 2 + s, y + 4 + i, 1, 1, col);
      }
    }
    pxRect(c, x + 6, y + 44, w - 12, h - 44, K);
    pxRect(c, x + 7, y + 45, w - 14, h - 46, shade(L.a, 0.2));
    gate('#2a1a3a');
    flag(x + w / 2, y - 6, L.c);
  } else if (L.kind === 'mansion') {
    paintRoof(c, x + 2, y + 2, w - 4, 26, L.b);
    pxRect(c, x + 1, y + 28, w - 2, h - 28, K);
    pxRect(c, x + 2, y + 29, w - 4, h - 30, L.a);
    for (let wx = x + 8; wx < x + w - 10; wx += 16) { if (Math.abs(wx - gx) < 26) continue; paintWindow(c, m, wx, y + 33, 7, 9); paintWindow(c, m, wx, y + 48, 7, 7); }
    for (const px of [gx - 6, gx + 28]) { pxRect(c, px, y + 28, 3, h - 28, K); pxRect(c, px + 1, y + 29, 1, h - 30, L.c); }
    gate(L.c);
    flag(x + 6, y - 8, L.b);
  } else if (L.kind === 'tower') {
    pxRect(c, x + 2, y + 34, w - 4, h - 34, K);
    pxRect(c, x + 3, y + 35, w - 6, h - 36, L.b);
    for (let xx = x + 4; xx < x + w - 4; xx += 8) pxRect(c, xx, y + 35, 1, h - 36, shade(L.b, 0.3));
    pxRect(c, x + w / 2 - 20, y + 2, 40, 36, K);
    pxRect(c, x + w / 2 - 19, y + 3, 38, 34, L.a);
    for (let i = 0; i < 5; i++) pxRect(c, x + w / 2 - 19 + i * 8, y - 1, 5, 4, K), pxRect(c, x + w / 2 - 18 + i * 8, y, 3, 3, L.a);
    paintWindow(c, m, x + w / 2 - 12, y + 10, 6, 10);
    paintWindow(c, m, x + w / 2 + 6, y + 10, 6, 10);
    gate('#2a1a1a');
    flag(x + w / 2 - 1, y - 14, L.c);
  } else {
    // fort / castle: walls with battlements, side towers for castles
    const castle = L.kind === 'castle';
    pxRect(c, x + 1, y + 14, w - 2, h - 14, K);
    pxRect(c, x + 2, y + 15, w - 4, h - 16, L.a);
    for (let yy = y + 20; yy < y + h; yy += 6) for (let xx = x + 2 + ((yy / 6) % 2 ? 0 : 6); xx < x + w - 2; xx += 12) pxRect(c, xx, yy, 1, 6, shade(L.a, 0.15)), pxRect(c, xx, yy, 12, 1, shade(L.a, 0.12));
    for (let xx = x + 2; xx < x + w - 2; xx += 8) { pxRect(c, xx - 1, y + 9, 6, 6, K); pxRect(c, xx, y + 10, 4, 5, L.a); }
    pxRect(c, x + 2, y + 15, w - 4, 2, shade(L.a, 0.25));
    if (castle) {
      for (const tx of [x, x + w - 22]) {
        pxRect(c, tx, y - 4, 22, h + 4, K);
        pxRect(c, tx + 1, y - 3, 20, h + 2, shade(L.a, 0.08));
        pxRect(c, tx + 1, y - 3, 20, 3, L.b);
        for (let i = 0; i < 3; i++) pxRect(c, tx + 1 + i * 8, y - 8, 4, 5, K), pxRect(c, tx + 2 + i * 8, y - 7, 2, 4, L.b);
        paintWindow(c, m, tx + 8, y + 10, 6, 9);
      }
      flag(x + 10, y - 20, L.c);
      flag(x + w - 12, y - 20, L.c);
    } else {
      pxRect(c, x + 6, y + 22, w - 12, 6, L.b);
      flag(x + w / 2 - 1, y - 8, L.c);
      paintWindow(c, m, x + 12, y + 24, 7, 8);
      paintWindow(c, m, x + w - 19, y + 24, 7, 8);
    }
    gate(L.b);
  }
}

// ---------- the ship, seen from above ----------
// x, y: top-left of a 96 x 48 box. The stern faces the gangplank side.

function drawShipTop(c, x, y, look, flip, t) {
  const P = PAINTS[look.paint] || PAINTS.wood, up = look.owned || {};
  const L = 92, cy = y + 22;
  const halfW = i => {
    if (i < 3) return 13 + i;
    if (i > L - 26) { const k = (i - (L - 26)) / 26; return Math.max(1, Math.round(17 * Math.sqrt(1 - k * k))); }
    return 17;
  };
  const X = i => (flip ? x + 94 - i : x + 2 + i);
  for (let i = 0; i < L; i++) {
    const hw = halfW(i), px = X(i);
    pxRect(c, px, cy - hw - 1, 1, hw * 2 + 6, K);
  }
  for (let i = 1; i < L - 1; i++) {
    const hw = halfW(i) - 1, px = X(i);
    if (hw < 1) continue;
    pxRect(c, px, cy - hw, 1, hw * 2 + 4, P.dark);
    pxRect(c, px, cy - hw, 1, hw * 2, P.hull);
    pxRect(c, px, cy - hw, 1, 1, P.trim);
    pxRect(c, px, cy + hw - 1, 1, 1, P.trim);
    if (hw > 3) {
      pxRect(c, px, cy - hw + 2, 1, hw * 2 - 4, '#b07a48');
      for (let k = cy - hw + 5; k < cy + hw - 3; k += 4) pxRect(c, px, k, 1, 1, '#8a5a32');
      if ((i + 3) % 14 === 0) pxRect(c, px, cy - hw + 2, 1, hw * 2 - 4, '#8a5a32');
    }
  }
  // stern cabin
  const cab0 = X(3), cab1 = X(20);
  const cx0 = Math.min(cab0, cab1), cw = Math.abs(cab1 - cab0);
  pxRect(c, cx0 - 1, cy - 11, cw + 2, 22, K);
  pxRect(c, cx0, cy - 10, cw, 20, P.dark);
  pxRect(c, cx0, cy - 10, cw, 3, P.trim);
  pxRect(c, cx0 + 2, cy - 5, cw - 4, 1, shade(P.dark, 0.3));
  pxRect(c, cx0 + cw / 2 - 2, cy + 3, 4, 3, look.night ? '#ffd36a' : '#7ac0e8');
  if (up.cannon) for (const i of [32, 60]) for (const sd of [-1, 1]) { const px = X(i); pxRect(c, px - 2, cy + sd * 17 - 1, 5, 3, K); pxRect(c, px - 1, cy + sd * 17, 3, 1, '#5a5a6a'); }
  if (up.lanterns) for (let i = 8; i < L - 20; i += 9) { const px = X(i), col = LANTERN_COLS[(i / 9 | 0) % LANTERN_COLS.length]; pxRect(c, px, cy - halfW(i) + 1, 2, 2, col); pxRect(c, px, cy + halfW(i) - 3, 2, 2, col); }
  // the mast stands up out of the deck, sail full of wind, flag on top
  const mx = X(46), top = cy - 46;
  pxRect(c, mx - 2, top - 1, 5, 48, K);
  pxRect(c, mx - 1, top, 3, 46, '#6a4422');
  pxRect(c, mx - 1, top, 1, 46, '#8a5a32');
  const sl = mx - 18, sw = 37, st = top + 8, sh = 24;
  pxRect(c, sl - 2, st - 3, sw + 4, 3, K);
  pxRect(c, sl - 1, st - 2, sw + 2, 1, '#6a4422');
  for (let yy = 0; yy < sh; yy++) {
    const belly = Math.round(Math.sin(yy / sh * Math.PI) * 2);
    const band = up.sails && (yy % 8 < 2);
    pxRect(c, sl - belly - 1, st + yy, sw + belly * 2 + 2, 1, K);
    pxRect(c, sl - belly, st + yy, sw + belly * 2, 1, band ? '#d63c2f' : yy > sh - 3 ? '#d8d0bc' : '#f4efe1');
  }
  pxRect(c, sl - 1, st + sh, sw + 2, 1, K);
  drawJollyRoger(c, mx - 5, st + 7, 1);
  if (up.nest) { pxRect(c, mx - 5, top + 2, 11, 4, K); pxRect(c, mx - 4, top + 3, 9, 2, '#a0663a'); }
  const fy = top - 7 + Math.round(Math.sin(t * 3) * 0.5);
  pxRect(c, flip ? mx - 8 : mx + 1, fy, 8, 6, K);
  pxRect(c, flip ? mx - 7 : mx + 1, fy + 1, 7, 4, '#1b1424');
  pxRect(c, flip ? mx - 4 : mx + 3, fy + 2, 2, 2, '#f4efe1');
  // figurehead at the bow
  const bx = X(L);
  if (look.head) {
    const fig = getSprite({ kind: 'figure', head: look.head });
    if (flip) { c.save(); c.translate(bx, 0); c.scale(-1, 1); c.drawImage(fig, -6, cy - 8); c.restore(); }
    else c.drawImage(fig, bx - 6, cy - 8);
  } else pxRect(c, bx - 2, cy - 1, 3, 3, P.trim);
  if (up.burst) { const sx = X(0); pxRect(c, sx - 3, cy - 3, 5, 6, K); pxRect(c, sx - 2, cy - 2, 3, 4, '#3a3440'); }
}

// ---------- characters that turn and walk ----------
// Front-facing 16x16 grids get turned around (back view) or sideways, and their legs animate.

const TURN_CACHE = new Map();
const FACE = { player: { rows: [5, 6, 7], mouth: -1 }, human: { rows: [5, 6, 7], mouth: 8 }, brute: { rows: [3, 4], mouth: 5 } };
const SKIN_CH = 'sSemwrRGg';

function backOfShirt(row) {
  const cnt = {};
  for (const ch of row) if (ch !== '.' && ch !== 's') cnt[ch] = (cnt[ch] || 0) + 1;
  const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  if (!main) return;
  const filled = row.map(ch => ch !== '.');
  const L = filled.indexOf(true), R = filled.lastIndexOf(true);
  for (let x = L + 1; x < R; x++) {
    if (row[x] !== 's') continue;
    const left = row.slice(L, x).some(ch => ch !== 's' && ch !== '.'), right = row.slice(x + 1, R + 1).some(ch => ch !== 's' && ch !== '.');
    if (left && right) row[x] = main;
  }
  if (row.includes('c')) for (let x = 0; x < row.length; x++) if (row[x] === 'C') row[x] = 'c';
}

function turnedGrid(spec, dir, frame) {
  const g = buildGrid(spec).map(r => r.slice());
  const F = FACE[spec.kind] || FACE.human;
  const side = dir === 'left' || dir === 'right';
  if (dir === 'up') {
    for (const y of F.rows) g[y] = g[y].map(ch => (SKIN_CH.includes(ch) ? 'h' : ch));
    if (F.mouth >= 0) g[F.mouth] = g[F.mouth].map(ch => (ch === 'm' || ch === 'r' ? 's' : ch));
    for (let y = Math.max(...F.rows, F.mouth) + 1; y < g.length - 2; y++) backOfShirt(g[y]);
  } else if (side) {
    F.rows.forEach((y, i) => {
      const row = g[y];
      const filled = row.map(ch => ch !== '.');
      const L = filled.indexOf(true), R = filled.lastIndexOf(true);
      if (L < 0) return;
      const back = i === F.rows.length - 1 ? 2 : 3;
      for (let x = L; x < L + back; x++) if (SKIN_CH.includes(row[x]) || row[x] === 'h') row[x] = 'h';
      if (row[R] === 'h') row[R] = 's';
      if (i === F.rows.length - 1 && R + 1 < row.length && row[R + 1] === '.') row[R + 1] = 's';
    });
    if (F.mouth >= 0) {
      const row = g[F.mouth], a = row.indexOf('m'), b = row.lastIndexOf('m');
      if (a >= 0) { row[a] = 's'; if (row[b + 1] === 's') row[b + 1] = 'm'; }
    }
  }
  if (frame) {
    const foot = g.length - 1, shin = g.length - 2;
    if (side) {
      for (const y of [shin, foot]) {
        const row = g[y], out = row.slice();
        for (let x = 2; x <= 13; x++) out[x] = '.';
        for (let x = 2; x <= 13; x++) if (row[x] !== '.') out[x < 8 ? x - 1 : x + 1] = row[x];
        g[y] = out;
      }
    } else {
      for (let x = 2; x <= 13; x++) {
        if ((frame === 1) !== (x < 8)) continue;
        if (g[foot][x] !== '.') { g[shin][x] = g[foot][x]; g[foot][x] = '.'; }
      }
    }
  }
  return dir === 'left' ? g.map(r => r.slice().reverse()) : g;
}

function walkSprite(spec, dir, frame) {
  const key = JSON.stringify(spec) + '|' + dir + '|' + frame;
  let cv = TURN_CACHE.get(key);
  if (!cv) {
    cv = renderGrid(turnedGrid(spec, dir, frame), Object.assign({}, PAL, spec.pal || {}), true);
    TURN_CACHE.set(key, cv);
  }
  return cv;
}

// ---------- overworld state ----------

const OW = {
  key: null, map: null, x: 0, y: 0, dir: 'up', mv: null, parity: 0, trail: [], held: null, keys: [], run: false,
  path: null, goal: null, turnT: 0, npcs: [], inside: null, respawn: false, search: null, lastTarget: null,
};

function owLoad(kind) {
  const key = kind === 'deck' ? 'deck' : 'isl:' + G.p.island;
  if (OW.key === key && !OW.respawn) {
    if (kind === 'deck') OW.map = deckMap();
    if (OW.inside) owExit();
    return;
  }
  OW.key = key;
  OW.respawn = false;
  OW.map = kind === 'deck' ? deckMap() : islandMap(G.p.island);
  const s = OW.map.spawn;
  owPlace(s.x, s.y, s.dir);
  OW.npcs = kind === 'deck' ? deckCrew(OW.map) : villagers(OW.map);
}

function owPlace(x, y, dir) {
  Object.assign(OW, { x, y, dir, mv: null, path: null, goal: null, inside: null, fdir: [] });
  OW.trail = (G.p ? G.p.crew : []).map(() => ({ x, y }));
}
const dirTo = (a, b) => (b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.y < a.y ? 'up' : 'down');

// Leaving a building: step out below the door.
function owExit() {
  const d = OW.inside;
  OW.inside = null;
  owPlace(d.x, d.y + 1, 'down');
}

const owTile = () => (OW.mv ? { x: OW.mv.tx, y: OW.mv.ty } : { x: OW.x, y: OW.y });

function occupied(x, y, except) {
  if (OW.map.boss && OW.map.boss.x === x && OW.map.boss.y === y && OW.key !== 'deck') return true;
  return OW.npcs.some(n => n !== except && ((n.x === x && n.y === y) || (n.mv && n.mv.tx === x && n.mv.ty === y)));
}

function canWalk(x, y) {
  return walkable(OW.map, x, y) && !occupied(x, y);
}

// ---------- villagers and deck crew ----------

const FOLK_HEADS = ['hair', 'long', 'cap', 'bandana', 'swoop', 'hair'];
const FOLK_COLS = ['#d63c2f', '#3b6fd6', '#46b35a', '#e9b43a', '#7a4ac0', '#f08a3a', '#2a9a9a', '#f2f2f2'];

function villagers(m) {
  const r = seeded(m.idx * 53 + 5);
  return m.villagers.map((v, i) => {
    const head = pick2(r, FOLK_HEADS);
    const spec = { kind: 'human', head, long: head === 'long', pal: { h: pick2(r, ['#2a2433', '#6a4228', '#c0453a', '#e9c27b', '#9aa4b1']), x: pick2(r, FOLK_COLS), c: pick2(r, FOLK_COLS), C: pick2(r, FOLK_COLS), p: pick2(r, ['#3b6fd6', '#2c2c34', '#6a7a3a', '#7a5a3a']), s: pick2(r, ['#f3c08c', '#e0a070', '#c98a5a', '#8a5a3a']) } };
    return { kind: 'folk', spec, x: v.x, y: v.y, home: { x: v.x, y: v.y }, dir: 'down', mv: null, wait: 1 + r() * 3, i };
  });
}

function deckCrew(m) {
  const spots = m.crewSpots.slice();
  return G.p.crew.map((cm, i) => {
    const [x, y] = spots[i % spots.length];
    return { kind: 'crew', m: cm, x, y, home: { x, y }, dir: pick(['down', 'left', 'right']), mv: null, wait: 1 + Math.random() * 3, i };
  });
}

function folkLine(n) {
  const isl = island(), boss = BOSSES[isl.boss], beaten = G.p.bosses[isl.boss];
  const lines = [
    beaten ? `You beat ${boss.name}? Drinks are on me tonight!` : `${boss.name} lives up north. Don't go up there unless you're tough!`,
    'Shaking bushes and old trash cans hide all kinds of stuff. Some say even Devil Fruits!',
    `Looking for a crew? The ${isl.bar} is where sailors hang out.`,
    `The wild grass is crawling with ${ENEMIES[pick(isl.enemies)].name}s. Watch your step!`,
    'The job board by the bar always has odd jobs. Steady pay!',
    isl.intro,
  ];
  return lines[(n.i + Math.floor(G.t / 7) + G.p.day) % lines.length];
}

function crewLine(n) {
  const c = CREW[n.m.key];
  const role = {
    swordsman: 'I could nap right here on the deck...',
    sniper: 'I can see a seagull three islands away. True story.',
    brawler: 'Point me at somebody to punch, Captain.',
    cook: "Hungry? Of course you're hungry.",
    navigator: travelReady() ? 'A new island is on the chart! Check the map table.' : 'The sea looks calm today.',
    doctor: G.p.hp < G.p.maxHp * 0.5 ? "You're hurt! Get some sleep tonight." : 'Eat well and sleep well, Captain.',
  }[c.role] || 'Ready when you are, Captain!';
  return `${c.name}: "${role}"`;
}

function updateNpcs(dt) {
  for (const n of OW.npcs) {
    if (n.mv) {
      n.mv.k += dt / 0.36;
      if (n.mv.k >= 1) { n.x = n.mv.tx; n.y = n.mv.ty; n.mv = null; }
      continue;
    }
    if (n.talking) continue;
    n.wait -= dt;
    if (n.wait > 0) continue;
    n.wait = 1.5 + Math.random() * 3;
    const dir = pick(['up', 'down', 'left', 'right']);
    n.dir = dir;
    const [dx, dy] = DIRV[dir];
    const tx = n.x + dx, ty = n.y + dy;
    const t = owTile();
    if (Math.abs(tx - n.home.x) + Math.abs(ty - n.home.y) > 2) continue;
    if (!walkable(OW.map, tx, ty) || occupied(tx, ty, n) || (tx === t.x && ty === t.y) || (tx === OW.x && ty === OW.y)) continue;
    const ch = OW.map.at(tx, ty);
    if (OW.map.ground[ty * OW.map.w + tx] === 'tall' || 'DNg='.includes(ch)) continue;
    n.mv = { tx, ty, k: 0 };
  }
}

// ---------- the boat deck (12 x 8, fits one screen) ----------
// R hull rail  O mast  h helm  m map table  c paint locker  y hammock  w weights  k galley  q aquarium

const DECK_ROWS = [
  '~~~~~~~~~~~~',
  '~RRRRRRRRRR~',
  '~R.w..c.q..R',
  '~Rh..O..m..R',
  '~R.........R',
  '~R.k..y....R',
  '~RRRRgRRRRR~',
  '~~~~~=~~~~~~',
];

function deckMap() {
  const p = G.p;
  const rows = DECK_ROWS.map(r => r
    .replace('w', p.owned.weights ? 'w' : '.')
    .replace('k', p.owned.galley ? 'k' : '.')
    .replace('q', p.owned.aquarium ? 'q' : '.'));
  const m = { key: 'deck', w: 12, h: 8, rows, th: theme(island().scene), solid: new Uint8Array(96), obj: new Array(96).fill(null), objs: [], lights: [], villagers: [], bushes: [] };
  m.at = (x, y) => (y >= 0 && y < 8 && x >= 0 && x < 12 ? rows[y][x] : '~');
  m.ground = [];
  const types = { O: 'mast', h: 'helm', m: 'table', c: 'locker', y: 'hammock', w: 'weights', k: 'galley', q: 'tank' };
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 12; x++) {
      const ch = rows[y][x], i = y * 12 + x;
      m.ground[i] = ch === '~' ? 'water' : ch === '=' ? 'pier' : 'deck';
      if ('~RohmcywkqO'.includes(ch)) m.solid[i] = 1;
      if (types[ch]) { const o = { type: types[ch], x, y }; m.obj[i] = o; m.objs.push(o); }
      if (ch === 'g') { m.gang = { x, y }; m.obj[i] = { type: 'gang' }; }
    }
  }
  m.spawn = { x: m.gang.x, y: m.gang.y - 1, dir: 'up' };
  m.crewSpots = [[4, 4], [7, 4], [3, 3], [8, 5], [7, 2], [4, 2]].filter(([x, y]) => !m.solid[y * 12 + x]);
  const look = shipLook();
  const lk = JSON.stringify([look.paint, look.head, Object.keys(p.owned).filter(k => p.owned[k]).sort()]);
  if (!DECK_LAYERS.has(lk)) DECK_LAYERS.set(lk, renderDeck(m, look));
  m.layer = DECK_LAYERS.get(lk);
  return m;
}
const DECK_LAYERS = new Map();

function renderDeck(m, look) {
  const cv = makeCanvas(192, 128), c = cv.getContext('2d');
  const P = PAINTS[look.paint] || PAINTS.wood, up = look.owned;
  // hull outline: rows 1-6, columns 1-10, with a pointed bow on the right
  const top = 16, bot = 112, left = 14, right = 168;
  pxRect(c, left - 2, top - 2, right - left + 4, bot - top + 8, K);
  pxRect(c, left - 1, top - 1, right - left + 2, bot - top + 6, P.dark);
  for (let i = 0; i < 24; i++) {
    const hw = Math.round((bot - top) / 2 * Math.sqrt(1 - Math.pow(i / 24, 2)));
    pxRect(c, right + i, 64 - hw - 2, 1, hw * 2 + 8, K);
    pxRect(c, right + i, 64 - hw - 1, 1, hw * 2 + 6, P.dark);
    pxRect(c, right + i, 64 - hw - 1, 1, hw * 2 + 2, P.hull);
  }
  pxRect(c, left - 1, top - 1, right - left + 2, bot - top + 2, P.hull);
  // deck planks
  pxRect(c, 32, 32, 144, 64, '#b07a48');
  for (let y = 32; y < 96; y += 4) { pxRect(c, 32, y + 3, 144, 1, '#8a5a32'); pxRect(c, 32 + ((y * 7) % 40), y, 1, 3, '#8a5a32'); pxRect(c, 100 + ((y * 11) % 50), y, 1, 3, '#8a5a32'); }
  for (let i = 0; i < 20; i++) {
    const hw = Math.round(32 * Math.sqrt(1 - Math.pow((i + 4) / 24, 2)));
    pxRect(c, 176 + i, 64 - hw, 1, hw * 2, '#b07a48');
  }
  // rails
  pxRect(c, 30, 30, 148, 2, P.trim);
  pxRect(c, 30, 96, 148, 2, P.trim);
  pxRect(c, 30, 30, 2, 68, P.trim);
  for (let x = 34; x < 176; x += 8) { pxRect(c, x, 26, 2, 4, P.dark); pxRect(c, x, 98, 2, 4, P.dark); }
  if (look.head) {
    const fig = getSprite({ kind: 'figure', head: look.head });
    c.imageSmoothingEnabled = false;
    c.drawImage(fig, 168, 52, fig.width * 2, fig.height * 2);
  }
  if (up.cannon) {
    for (const cx of [72, 136]) {
      for (const [cy, dy] of [[18, -1], [100, 1]]) {
        pxRect(c, cx - 1, cy - 1, 8, 10, K);
        pxRect(c, cx, cy, 6, 8, '#3a3440');
        pxRect(c, cx + 1, dy < 0 ? cy : cy + 6, 4, 2, '#5a5a6a');
      }
    }
  }
  // gangplank gap and pier below it
  const gx = m.gang.x * TS;
  pxRect(c, gx, 96, 16, 16, '#b07a48');
  for (let y = 96; y < 112; y += 4) pxRect(c, gx, y + 3, 16, 1, '#8a5a32');
  pxRect(c, gx, 96, 1, 16, '#6a4422'); pxRect(c, gx + 15, 96, 1, 16, '#6a4422');
  for (let y = 112; y < 128; y += 4) { pxRect(c, gx, y, 16, 4, y % 8 ? '#a06a3a' : '#b07a48'); pxRect(c, gx, y + 3, 16, 1, '#6a4422'); }
  // fixtures
  for (const o of m.objs) {
    const x = o.x * TS, y = o.y * TS;
    if (o.type === 'mast') {
      pxCircle(c, x + 8, y + 8, 7, K); pxCircle(c, x + 8, y + 8, 6, '#6a4422'); pxCircle(c, x + 8, y + 8, 3, '#8a5a32');
      if (up.nest) { pxRing(c, x + 8, y + 8, 9, K); pxRing(c, x + 8, y + 8, 8, '#a0663a'); }
    } else if (o.type === 'helm') {
      pxRect(c, x + 6, y + 9, 4, 7, K); pxRect(c, x + 7, y + 10, 2, 5, '#6a4422');
      pxCircle(c, x + 8, y + 7, 6, K); pxCircle(c, x + 8, y + 7, 5, '#a0663a'); pxCircle(c, x + 8, y + 7, 3, K); pxCircle(c, x + 8, y + 7, 1, '#c99a5a');
      for (let a = 0; a < 8; a++) pxRect(c, x + 8 + Math.round(Math.cos(a * Math.PI / 4) * 6), y + 7 + Math.round(Math.sin(a * Math.PI / 4) * 6), 1, 1, '#c99a5a');
    } else if (o.type === 'table') {
      pxRect(c, x + 1, y + 3, 14, 12, K); pxRect(c, x + 2, y + 4, 12, 8, '#8a5a32'); pxRect(c, x + 3, y + 12, 2, 3, '#6a4422'); pxRect(c, x + 11, y + 12, 2, 3, '#6a4422');
      pxRect(c, x + 3, y + 4, 10, 7, '#f2e4c0'); pxRect(c, x + 4, y + 5, 3, 2, '#4aa3e8'); pxRect(c, x + 8, y + 7, 3, 2, '#5aa846'); pxRect(c, x + 6, y + 8, 2, 1, '#d63c2f');
    } else if (o.type === 'locker') {
      pxRect(c, x + 2, y + 4, 12, 11, K); pxRect(c, x + 3, y + 5, 10, 9, '#7a4a24'); pxRect(c, x + 3, y + 5, 10, 2, '#a0663a');
      pxRect(c, x + 4, y + 1, 4, 4, K); pxRect(c, x + 5, y + 2, 2, 2, PAINTS[look.paint] ? P.hull : '#c0453a');
      pxRect(c, x + 9, y + 2, 4, 3, K); pxRect(c, x + 10, y + 3, 2, 1, '#9aa4b1');
    } else if (o.type === 'hammock') {
      pxRect(c, x + 1, y + 5, 2, 8, K); pxRect(c, x + 13, y + 5, 2, 8, K);
      for (let i = 0; i < 12; i++) pxRect(c, x + 2 + i, y + 7 + Math.round(Math.sin(i / 11 * Math.PI) * 3), 1, 3, i % 2 ? '#e8dcc0' : '#d0c4a6');
      pxRect(c, x + 3, y + 6, 2, 2, up.bunks ? '#d63c2f' : '#f2f2f2');
    } else if (o.type === 'weights') {
      pxRect(c, x + 2, y + 7, 12, 2, '#9aa4b1'); pxRect(c, x + 1, y + 4, 4, 8, K); pxRect(c, x + 11, y + 4, 4, 8, K); pxRect(c, x + 2, y + 5, 2, 6, '#5a5a6a'); pxRect(c, x + 12, y + 5, 2, 6, '#5a5a6a');
    } else if (o.type === 'galley') {
      pxRect(c, x + 1, y + 3, 14, 12, K); pxRect(c, x + 2, y + 4, 12, 10, '#5a5a6a'); pxRect(c, x + 3, y + 5, 4, 3, '#2a2a34'); pxRect(c, x + 9, y + 5, 4, 3, '#2a2a34');
      pxRect(c, x + 4, y + 10, 8, 3, '#3a3440'); pxRect(c, x + 5, y + 11, 6, 1, '#ff9a3a');
    } else if (o.type === 'tank') {
      pxRect(c, x + 1, y + 2, 14, 13, K); pxRect(c, x + 2, y + 3, 12, 11, '#4fa3e0'); pxRect(c, x + 2, y + 3, 12, 2, '#bfe6ff');
      pxRect(c, x + 4, y + 9, 2, 2, '#2a7a3a'); pxRect(c, x + 10, y + 8, 1, 5, '#2a7a3a');
    }
  }
  return cv;
}

// ---------- shaking bushes and searched spots ----------

const spotKey = (x, y) => `${G.p.island}:${x},${y}`;
function searchedToday(x, y) {
  const s = G.p.searched;
  return !!(s && s.day === G.p.day && s.keys.includes(spotKey(x, y)));
}
function markSearched(x, y) {
  if (!G.p.searched || G.p.searched.day !== G.p.day) G.p.searched = { day: G.p.day, keys: [] };
  G.p.searched.keys.push(spotKey(x, y));
}
// A few bushes rustle each day; the rest are just bushes.
const SHAKE_CACHE = new Map();
function shakingBushes(m) {
  const key = m.idx + ':' + G.p.day;
  if (!SHAKE_CACHE.has(key)) {
    const r = seeded(m.idx * 7919 + G.p.day * 104729);
    const list = m.bushes.filter(() => r() < 0.45);
    if (!list.length && m.bushes.length) list.push(m.bushes[Math.floor(r() * m.bushes.length)]);
    SHAKE_CACHE.set(key, new Set(list));
  }
  return SHAKE_CACHE.get(key);
}
const bushReady = (m, b) => shakingBushes(m).has(b) && !searchedToday(b.x, b.y);

// ---------- what's in front of you ----------

function owFacing() {
  const [dx, dy] = DIRV[OW.dir];
  return { x: OW.x + dx, y: OW.y + dy };
}

function owTarget(x, y) {
  const m = OW.map;
  if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
  if (OW.key !== 'deck' && m.boss && m.boss.x === x && m.boss.y === y) {
    return { kind: 'boss', label: G.p.bosses[island().boss] ? 'REMATCH' : 'RAID', act: () => raidMenu() };
  }
  const n = OW.npcs.find(v => v.x === x && v.y === y && !v.mv);
  if (n) return { kind: 'npc', label: 'TALK', act: () => npcTalk(n) };
  const o = m.obj[y * m.w + x];
  if (!o) return null;
  switch (o.type) {
    case 'bush': return { kind: 'bush', label: bushReady(m, o) ? 'SEARCH' : null, act: () => (bushReady(m, o) ? explore({ kind: 'bush', x, y }) : say('Just an ordinary bush. Shaking bushes are the ones worth searching.')) };
    case 'trash': return { kind: 'trash', label: searchedToday(x, y) ? null : 'SEARCH', act: () => (searchedToday(x, y) ? say('You already dug through this trash can today.') : explore({ kind: 'trash', x, y })) };
    case 'dummy': return { kind: 'dummy', label: 'TRAIN', act: () => trainMenu() };
    case 'job': return { kind: 'job', label: 'WORK', act: () => jobBoard() };
    case 'fish': return { kind: 'fish', label: 'FISH', act: () => startFishing() };
    case 'sign': return { kind: 'sign', label: 'READ', act: () => say(`${island().name}. ${island().intro}`) };
    case 'door': return { kind: 'door', label: 'ENTER', act: () => owStepTo(x, y) };
    case 'bar': return { kind: 'wall', label: null, act: () => say(`The ${island().bar}. The door is around the front.`) };
    case 'shop': return { kind: 'wall', label: null, act: () => say('The shop. The door is around the front.') };
    case 'house': return { kind: 'wall', label: null, act: () => say(pick(["Someone's house. The door is locked.", 'You hear snoring inside.', 'Smells like soup in there.'])) };
    case 'lair': return { kind: 'wall', label: null, act: () => say(`${BOSSES[island().boss].name}'s hideout. The boss is standing guard out front.`) };
    case 'ship': return { kind: 'ship', label: 'BOARD', act: () => boardShip() };
    case 'gang': return { kind: 'gang', label: OW.key === 'deck' ? 'ASHORE' : 'BOARD', act: () => owStepTo(x, y) };
    case 'helm': return { kind: 'helm', label: 'SAIL', act: () => mapMenu() };
    case 'table': return { kind: 'table', label: 'MAP', act: () => mapMenu() };
    case 'locker': return { kind: 'locker', label: 'PAINT', act: () => customizeMenu() };
    case 'hammock': return { kind: 'hammock', label: 'SLEEP', act: () => sleep() };
    case 'weights': return { kind: 'weights', label: 'TRAIN', act: () => trainMenu() };
    case 'galley': return { kind: 'galley', label: 'EAT', act: () => bagMenu() };
    case 'tank': return { kind: 'tank', label: 'LOOK', act: () => say(pick(['A fat little fish blows bubbles at you.', 'The fish in the aquarium look happy.'])) };
    case 'mast': return { kind: 'mast', label: null, act: () => say(G.p.owned.nest ? "The mainmast. Your lookout's crow's nest is way up top." : 'The mainmast. A crow\'s nest would look great up there.') };
    default: return null;
  }
}

function npcTalk(n) {
  const [dx, dy] = [OW.x - n.x, OW.y - n.y];
  n.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  n.wait = 3;
  say(n.kind === 'crew' ? crewLine(n) : folkLine(n));
}

function jobBoard() {
  const body = el('div');
  body.style.display = 'contents';
  const pay = 55 + G.p.island * 45;
  body.append(el('p', { text: `Odd jobs posted all over the board. A few hours of honest work pays about ฿${fmt(pay)}.` }));
  body.append(el('div', { class: 'btn-row' },
    el('button', { type: 'button', class: 'mini-btn red', text: 'Take the job (15 EN)', disabled: isLate() || null, onclick: () => { modalOnClose = null; closeModal(); oddJob(); } }),
    el('button', { type: 'button', class: 'mini-btn', text: 'Not now', onclick: closeModal })));
  openModal('Job Board', body, { onClose: backToMenu });
}

// ---------- moving ----------

function owStepTo(x, y) {
  const t = owTile();
  const dx = x - t.x, dy = y - t.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return;
  OW.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  if (canWalk(x, y)) startStep(x, y);
}

function startStep(tx, ty) {
  OW.trail.unshift({ x: OW.x, y: OW.y });
  OW.trail.length = Math.min(OW.trail.length, Math.max(6, G.p.crew.length + 2));
  OW.mv = { fx: OW.x, fy: OW.y, tx, ty, k: 0, t: OW.run ? STEP_RUN : STEP_WALK };
  OW.parity = 1 - OW.parity;
}

function owInputDir() {
  return OW.held || OW.keys[OW.keys.length - 1] || null;
}

function owUpdate(dt) {
  if (!OW.map) return;
  updateNpcs(dt);
  const free = !G.busy && $('modal').hidden && !$('egg');
  if (OW.mv) {
    OW.mv.k += dt / OW.mv.t;
    if (OW.mv.k < 1) return;
    OW.x = OW.mv.tx;
    OW.y = OW.mv.ty;
    OW.mv = null;
    OW.stepEnd = G.t;
    if (onStep()) return;
  }
  if (!free) { OW.path = null; return; }
  const dir = owInputDir();
  if (dir) {
    OW.path = null;
    OW.goal = null;
    if (OW.dir !== dir && !OW.turning && G.t - (OW.stepEnd || 0) > 0.12) { OW.dir = dir; OW.turnT = 0.08; OW.turning = true; return; }
    if (OW.turnT > 0) { OW.turnT -= dt; return; }
    OW.turning = false;
    OW.dir = dir;
    const [dx, dy] = DIRV[dir];
    if (canWalk(OW.x + dx, OW.y + dy)) startStep(OW.x + dx, OW.y + dy);
    else if (!OW.bumpT || G.t > OW.bumpT) { OW.bumpT = G.t + 0.35; Sfx.play('bump'); }
    return;
  }
  OW.turning = false;
  if (OW.path && OW.path.length) {
    const n = OW.path.shift();
    OW.dir = n.x > OW.x ? 'right' : n.x < OW.x ? 'left' : n.y > OW.y ? 'down' : 'up';
    if (canWalk(n.x, n.y)) startStep(n.x, n.y);
    else { OW.path = null; OW.goal = null; }
    return;
  }
  if (OW.goal) {
    const g = OW.goal;
    OW.goal = null;
    OW.dir = g.x > OW.x ? 'right' : g.x < OW.x ? 'left' : g.y > OW.y ? 'down' : 'up';
    const t = owTarget(g.x, g.y);
    if (t) { Sfx.play('select'); t.act(); }
  }
}

// Things that happen when you step on a tile. Returns true if it took over.
function onStep() {
  const m = OW.map, ch = m.at(OW.x, OW.y), o = m.obj[OW.y * m.w + OW.x];
  if (o && o.type === 'door') {
    OW.inside = { x: OW.x, y: OW.y };
    OW.path = null; OW.goal = null; OW.keys = []; OW.held = null;
    Sfx.play('door');
    if (o.of.type === 'bar') barMenu(); else shopMenu();
    return true;
  }
  if (ch === 'g') {
    OW.path = null; OW.goal = null; OW.keys = []; OW.held = null;
    if (OW.key === 'deck') goAshore(); else boardShip();
    return true;
  }
  if (m.ground[OW.y * m.w + OW.x] === 'tall') {
    particles(...owScreen(OW.x, OW.y, 8, 12), 3, { colors: m.th.tall, speed: 25, grav: 60, dir: -Math.PI / 2, spread: 1.2, life: 0.35 });
    const p = G.p;
    if (p.energy >= 10 && !isLate() && Math.random() < 0.12) {
      OW.path = null; OW.goal = null;
      wildEncounter();
      return true;
    }
  }
  return false;
}

async function wildEncounter() {
  lock(true);
  Sfx.play('alert');
  bubble('!', 0.9);
  await wait(650);
  screenFlash('#ffffff', 0.9);
  await wait(150);
  screenFlash('#ffffff', 0.9);
  await wait(200);
  lock(false);
  fightRandom();
}

// Tap the screen to walk somewhere (or to whatever you tapped).
function owTap(sx, sy) {
  const m = OW.map, cam = owCam();
  const x = Math.floor((sx + cam.x) / TS), y = Math.floor((sy + cam.y) / TS);
  const t = owTile();
  if (x === t.x && y === t.y) { talkToHero(); return; }
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  let goal = null, target = null;
  const o = m.obj[y * m.w + x];
  const n = OW.npcs.find(v => v.x === x && v.y === y);
  if (o && (o.type === 'bar' || o.type === 'shop') && o.door) goal = { x: o.door.x, y: o.door.y };
  else if (o && o.type === 'door') goal = { x, y };
  else if (o && o.type === 'ship' && m.gang) goal = m.gang;
  else if (o && o.type === 'lair' && m.boss) target = m.boss;
  else if (walkable(m, x, y) && !occupied(x, y)) goal = { x, y };
  else if (owTarget(x, y) || n) target = { x, y };
  if (target) {
    const p = findPath(t, (xx, yy) => Math.abs(xx - target.x) + Math.abs(yy - target.y) === 1);
    if (!p) { Sfx.play('bad'); return; }
    OW.path = p;
    OW.goal = target;
  } else if (goal) {
    const p = findPath(t, (xx, yy) => xx === goal.x && yy === goal.y);
    if (!p) { Sfx.play('bad'); return; }
    OW.path = p;
    OW.goal = null;
  }
  if (OW.path && !OW.path.length && OW.goal) {
    // already next to it
    const g = OW.goal;
    OW.goal = null;
    OW.path = null;
    OW.dir = g.x > OW.x ? 'right' : g.x < OW.x ? 'left' : g.y > OW.y ? 'down' : 'up';
    const tg = owTarget(g.x, g.y);
    if (tg) { Sfx.play('select'); tg.act(); }
  }
}

// Shortest walk to a goal; wild grass costs extra so tapping somewhere avoids fights when it can.
function findPath(from, isGoal) {
  const m = OW.map, key = (x, y) => y * m.w + x;
  const dist = new Map([[key(from.x, from.y), 0]]), prev = new Map();
  const open = [[0, from.x, from.y]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, x, y] = open.shift();
    if (d > dist.get(key(x, y))) continue;
    if (isGoal(x, y)) {
      const path = [];
      for (let k = key(x, y); k !== key(from.x, from.y); k = prev.get(k)) path.unshift({ x: k % m.w, y: Math.floor(k / m.w) });
      return path;
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (!walkable(m, nx, ny) || occupied(nx, ny)) continue;
      const o = m.obj[k];
      if ((m.at(nx, ny) === 'g' || (o && o.type === 'door')) && !isGoal(nx, ny)) continue;
      const nd = d + (m.ground[k] === 'tall' ? 6 : 1);
      if (nd < (dist.has(k) ? dist.get(k) : Infinity)) { dist.set(k, nd); prev.set(k, key(x, y)); open.push([nd, nx, ny]); }
    }
  }
  return null;
}

// The A button: talk, search, enter, or (while text is showing) continue.
function owPressA() {
  Sfx.unlock();
  if (G.busy) { onMsgTap(); return; }
  if (!$('modal').hidden || OW.mv || !OW.map) return;
  const f = owFacing();
  const t = owTarget(f.x, f.y);
  if (t) { Sfx.play('select'); t.act(); }
}

// ---------- drawing ----------

function owCam() {
  const m = OW.map;
  const hp = owHeroPx();
  const cx = m.w * TS <= W ? (m.w * TS - W) / 2 : clamp(Math.round(hp.x + 8 - W / 2), 0, m.w * TS - W);
  const cy = m.h * TS <= H ? (m.h * TS - H) / 2 : clamp(Math.round(hp.y + 8 - H / 2), 0, m.h * TS - H);
  return { x: cx, y: cy };
}

function owHeroPx() {
  if (OW.mv) { const k = Math.min(1, OW.mv.k); return { x: (OW.mv.fx + (OW.mv.tx - OW.mv.fx) * k) * TS, y: (OW.mv.fy + (OW.mv.ty - OW.mv.fy) * k) * TS }; }
  return { x: OW.x * TS, y: OW.y * TS };
}

function owScreen(x, y, ox, oy) {
  const cam = owCam();
  return [x * TS + (ox || 0) - cam.x, y * TS + (oy || 0) - cam.y];
}

function heroScreenPos() {
  if ((G.mode !== 'home' && G.mode !== 'boat') || !OW.map) return { x: G.hero.x, y: 82 };
  const cam = owCam(), hp = owHeroPx();
  return { x: Math.round(hp.x - cam.x + 8), y: Math.round(hp.y - cam.y - 4) };
}

function drawWorld() {
  const m = OW.map, cam = owCam(), t = G.t;
  pxRect(ctx, 0, 0, W, H, m.th.water[0]);
  if (m.key !== 'deck') ctx.drawImage(m.layer, -cam.x, -cam.y);
  // moving water sparkles on visible tiles
  const x0 = Math.max(0, Math.floor(cam.x / TS)), y0 = Math.max(0, Math.floor(cam.y / TS));
  for (let y = y0; y < Math.min(m.h, y0 + 10); y++) {
    for (let x = x0; x < Math.min(m.w, x0 + 14); x++) {
      if (m.ground[y * m.w + x] !== 'water') continue;
      const ph = (x * 5 + y * 3) % 7;
      const k = Math.floor(t * 2 + ph) % 4;
      const sx = x * TS - cam.x, sy = y * TS - cam.y;
      pxRect(ctx, sx + 2 + ((ph * 3 + Math.floor(t * 3)) % 9), sy + 4 + k * 2, 4, 1, m.th.water[1]);
      if ((ph + Math.floor(t)) % 3 === 0) pxRect(ctx, sx + 9, sy + 11, 2, 1, tint(m.th.water[0], 0.35));
    }
  }
  if (m.key === 'deck') ctx.drawImage(m.layer, -cam.x, -cam.y);
  const actors = [];
  if (m.key !== 'deck') {
    const ship = m.objs.find(o => o.type === 'ship');
    if (ship) actors.push({ y: ship.y * TS + 20, draw: () => drawShipTop(ctx, ship.x * TS - cam.x, ship.y * TS - cam.y + Math.round(Math.sin(t * 1.6)), Object.assign(shipLook(), { t }), !!m.mirror, t) });
    const shake = shakingBushes(m);
    for (const b of m.bushes) actors.push({ y: b.y * TS + 15, draw: () => drawBush(b, cam, shake.has(b) && !searchedToday(b.x, b.y)) });
    for (const o of m.objs) if (o.type === 'trash') actors.push({ y: o.y * TS + 15, draw: () => drawTrash(o, cam, !searchedToday(o.x, o.y)) });
    if (m.boss) {
      const def = BOSSES[island().boss];
      actors.push({ y: m.boss.y * TS + 15, draw: () => drawBossOw(def, m.boss, cam) });
    }
  } else {
    if (G.p.owned.lanterns) drawDeckLanterns();
  }
  for (const n of OW.npcs) {
    const spec = n.kind === 'crew' ? crewSpec(n.m) : n.spec;
    const pos = n.mv ? { x: n.x + (n.mv.tx - n.x) * n.mv.k, y: n.y + (n.mv.ty - n.y) * n.mv.k } : n;
    const frame = n.mv ? (n.mv.k < 0.5 ? 1 : 0) : 0;
    actors.push({ y: pos.y * TS + 15, draw: () => drawWalker(walkSprite(spec, n.dir, frame), pos.x * TS - cam.x + 8, pos.y * TS - cam.y + 15) });
  }
  // crew follow you around islands in a line
  if (m.key !== 'deck' && !OW.inside) {
    const k = OW.mv ? Math.min(1, OW.mv.k) : 1;
    const taken = new Set([OW.x + ',' + OW.y]);
    G.p.crew.forEach((cm, i) => {
      const to = OW.trail[i];
      if (!to) return;
      const from = OW.mv ? (OW.trail[i + 1] || to) : to;
      const moving = !!OW.mv && (from.x !== to.x || from.y !== to.y);
      if (!moving && taken.has(to.x + ',' + to.y)) return;
      taken.add(to.x + ',' + to.y);
      const fx = from.x + (to.x - from.x) * k, fy = from.y + (to.y - from.y) * k;
      const ahead = i === 0 ? owTile() : OW.trail[i - 1];
      let dir = OW.fdir[i] || 'up';
      if (moving) dir = dirTo(from, to);
      else if (ahead && (ahead.x !== to.x || ahead.y !== to.y)) dir = dirTo(to, ahead);
      OW.fdir[i] = dir;
      const side = dir === 'left' || dir === 'right';
      const frame = moving && k < 0.5 ? (side ? 1 : (OW.parity ? 2 : 1)) : 0;
      actors.push({ y: fy * TS + 14.9 - i * 0.01, draw: () => drawWalker(walkSprite(crewSpec(cm), dir, frame), fx * TS - cam.x + 8, fy * TS - cam.y + 15) });
    });
  }
  if (!OW.inside) {
    const hp = owHeroPx(), Hr = G.hero;
    const k = OW.mv ? OW.mv.k : 1;
    const side = OW.dir === 'left' || OW.dir === 'right';
    const frame = OW.mv && k < 0.5 ? (side ? 1 : (OW.parity ? 1 : 2)) : 0;
    actors.push({ y: hp.y + 15.5, draw: () => drawWalker(walkSprite(heroSpec(), OW.dir, frame), hp.x - cam.x + 8 + Hr.ox, hp.y - cam.y + 15 + Hr.oy, Hr.flash > 0) });
  }
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();
  // night falls
  const ti = timeIdx(), late = isLate();
  const th = m.th;
  if (th.tint) { ctx.globalAlpha = th.tint[1]; pxRect(ctx, 0, 0, W, H, th.tint[0]); ctx.globalAlpha = 1; }
  if (ti === 2 && !late) { ctx.globalAlpha = 0.16; pxRect(ctx, 0, 0, W, H, '#ff8a3a'); ctx.globalAlpha = 1; }
  if (ti === 3 || late) {
    ctx.globalAlpha = late ? 0.55 : 0.45;
    pxRect(ctx, 0, 0, W, H, '#0a1030');
    ctx.globalAlpha = 1;
    for (const [lx, ly, lw, lh] of m.lights) { pxRect(ctx, lx - cam.x, ly - cam.y, lw, lh, '#ffd36a'); ctx.globalAlpha = 0.25; pxRect(ctx, lx - cam.x - 2, ly - cam.y - 2, lw + 4, lh + 4, '#ffd36a'); ctx.globalAlpha = 1; }
  }
  if (th.bubbles) {
    for (let i = 0; i < 6; i++) {
      const bx = (i * 47 + Math.sin(t + i) * 6) % W, by = H - ((t * 14 + i * 37) % (H + 20));
      ctx.globalAlpha = 0.6; pxRing(ctx, bx, by, 2 + (i % 2), '#e0f6ff'); ctx.globalAlpha = 1;
    }
  }
  // what's in front of you
  if (!G.busy && !OW.mv && $('modal').hidden && !OW.inside) {
    const f = owFacing(), tg = owTarget(f.x, f.y);
    OW.lastTarget = tg;
    if (tg && tg.label) {
      const hs = heroScreenPos();
      const [sx, sy] = OW.dir === 'down' ? [hs.x, hs.y - 14] : owScreen(f.x, f.y, 8, -3);
      drawBubble(ctx, sx, sy, tg.label);
    }
  } else if (OW.mv) OW.lastTarget = null;
  updateALabel();
  const hs = heroScreenPos();
  if (G.bubble && G.t < G.bubble.until) drawBubble(ctx, hs.x, hs.y - 14, G.bubble.text);
  drawLoot(ctx, hs.x, hs.y - 10);
}

function drawWalker(spr, x, footY, flash) {
  const m = OW.map, cam = owCam();
  const tx = Math.floor((x + cam.x) / TS), ty = Math.floor((footY + cam.y) / TS);
  const inGrass = m.key !== 'deck' && tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && m.ground[ty * m.w + tx] === 'tall';
  if (!inGrass) {
    ctx.globalAlpha = 0.28;
    pxRect(ctx, Math.round(x - 5), Math.round(footY - 1), 10, 2, '#000000');
    ctx.globalAlpha = 1;
  }
  const img = flash ? variantOf(spr, 'flash') : spr;
  ctx.drawImage(img, Math.round(x - spr.width / 2), Math.round(footY - spr.height + 1));
  // tall grass hides the legs of anyone standing in it
  if (inGrass) ctx.drawImage(m.layer, tx * TS, ty * TS + 9, TS, 7, tx * TS - cam.x, ty * TS - cam.y + 9, TS, 7);
}

function drawBush(b, cam, shaking) {
  const th = OW.map.th, [m, d, l] = th.leaf;
  const s = OW.search && OW.search.x === b.x && OW.search.y === b.y;
  const jig = (shaking && Math.floor(G.t * 3) % 3 === 0) || s ? Math.round(Math.sin(G.t * 40)) : 0;
  const x = b.x * TS - cam.x + jig, y = b.y * TS - cam.y;
  ctx.globalAlpha = 0.25; pxRect(ctx, x + 2, y + 12, 12, 3, '#000000'); ctx.globalAlpha = 1;
  pxCircle(ctx, x + 5, y + 9, 5, K); pxCircle(ctx, x + 11, y + 9, 5, K); pxCircle(ctx, x + 8, y + 6, 5, K);
  pxCircle(ctx, x + 5, y + 9, 4, d); pxCircle(ctx, x + 11, y + 9, 4, d); pxCircle(ctx, x + 8, y + 6, 4, m);
  pxRect(ctx, x + 6, y + 3, 2, 1, l); pxRect(ctx, x + 3, y + 7, 2, 1, l); pxRect(ctx, x + 10, y + 6, 2, 1, l);
  if (shaking && Math.random() < 0.04) particles(x + 8, y + 4, 1, { colors: [m, l], speed: 20, grav: 40, life: 0.5 });
}

function drawTrash(o, cam, full) {
  const s = OW.search && OW.search.x === o.x && OW.search.y === o.y;
  const jig = s ? Math.round(Math.sin(G.t * 40)) : 0;
  const x = o.x * TS - cam.x + jig, y = o.y * TS - cam.y;
  ctx.globalAlpha = 0.25; pxRect(ctx, x + 3, y + 13, 10, 3, '#000000'); ctx.globalAlpha = 1;
  pxRect(ctx, x + 3, y + 5, 10, 10, K); pxRect(ctx, x + 4, y + 6, 8, 8, '#8a94a2');
  for (const cx of [6, 9]) pxRect(ctx, x + cx, y + 7, 1, 6, '#6a7484');
  pxRect(ctx, x + 4, y + 6, 1, 8, '#b0b8c4');
  const lift = full ? 2 : 0;
  pxRect(ctx, x + 2, y + 3 - lift, 12, 3, K); pxRect(ctx, x + 3, y + 4 - lift, 10, 1, '#9aa4b1');
  pxRect(ctx, x + 7, y + 2 - lift, 2, 1, K);
  if (full) {
    pxRect(ctx, x + 5, y + 4, 3, 1, '#e9d27a'); pxRect(ctx, x + 9, y + 4, 2, 1, '#f2f2f2');
    if (Math.floor(G.t * 4) % 6 === 0) { pxRect(ctx, x + 12, y + 1, 1, 1, K); pxRect(ctx, x + 2, y, 1, 1, K); }
  }
}

function drawBossOw(def, pos, cam) {
  const spr = walkSprite(def.spr, 'down', 0);
  const x = pos.x * TS - cam.x + 8, y = pos.y * TS - cam.y + 15;
  const bob = Math.round(Math.sin(G.t * 2.5));
  drawWalker(spr, x, y + bob * 0);
  if (!G.p.bosses[island().boss] && Math.floor(G.t * 2) % 4 === 0) drawText(ctx, '!', x + 6, y - 22, { color: '#ff5a4a' });
}

function drawDeckLanterns() {
  const night = timeIdx() === 3 || isLate();
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 16, col = LANTERN_COLS[i % LANTERN_COLS.length];
    for (const y of [28, 99]) {
      pxRect(ctx, x, y, 3, 3, K); pxRect(ctx, x + 1, y + 1, 1, 1, col);
      if (night) { ctx.globalAlpha = 0.3; pxCircle(ctx, x + 1, y + 1, 4, col); ctx.globalAlpha = 1; }
    }
  }
}

// ---------- on-screen controls ----------

function updateALabel() {
  const lab = $('aLabel');
  if (!lab) return;
  const t = OW.lastTarget;
  const text = G.busy ? 'NEXT' : t && t.label ? t.label : t ? 'LOOK' : 'A';
  if (lab.textContent !== text) lab.textContent = text;
}

function padControls() {
  const pad = el('div', { class: 'pad' });
  const dpad = el('div', { class: 'dpad', role: 'group', 'aria-label': 'Walk' });
  for (const d of ['up', 'left', 'right', 'down']) {
    dpad.append(el('button', {
      type: 'button', class: 'dp ' + d, 'aria-label': 'Walk ' + d,
      onclick: e => { if (e.detail === 0 && !G.busy) { OW.keys = [d]; setTimeout(() => { OW.keys = OW.keys.filter(k => k !== d); }, 120); } },
    }));
  }
  dpad.append(el('span', { class: 'dp-mid', 'aria-hidden': 'true' }));
  const dirFrom = e => {
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  const show = d => { for (const b of dpad.querySelectorAll('.dp')) b.classList.toggle('on', b.classList.contains(d)); };
  dpad.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sfx.unlock();
    if (G.busy) { onMsgTap(); return; }
    try { dpad.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    OW.held = dirFrom(e);
    show(OW.held);
  });
  dpad.addEventListener('pointermove', e => { if (dpad.hasPointerCapture(e.pointerId)) { OW.held = dirFrom(e); show(OW.held); } });
  const release = () => { OW.held = null; show(null); };
  dpad.addEventListener('pointerup', release);
  dpad.addEventListener('pointercancel', release);
  dpad.addEventListener('lostpointercapture', release);
  const bBtn = el('button', { type: 'button', class: 'abtn b', 'aria-label': 'B: hold to run' }, el('span', { text: 'B' }), el('small', { text: 'RUN' }));
  bBtn.addEventListener('pointerdown', e => { e.preventDefault(); OW.run = true; bBtn.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) bBtn.addEventListener(ev, () => { OW.run = false; bBtn.classList.remove('on'); });
  const aBtn = el('button', { type: 'button', class: 'abtn a', 'aria-label': 'A: talk, search, enter' }, el('span', { text: 'A' }), el('small', { id: 'aLabel', text: 'A' }));
  aBtn.addEventListener('click', owPressA);
  pad.append(dpad, el('div', { class: 'abtns' }, bBtn, aBtn));
  return pad;
}
