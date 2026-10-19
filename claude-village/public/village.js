'use strict';
// 마을 = 템플릿 지도 + 스타일/바이옴 + 프리팹 조합 + 사람들 움직임.

const VW = 340, VH = 276, N = 10, DEPTH = 16;
const ORIGIN = [VW / 2, 60];

// ── 지도 템플릿 ─────────────────────────────────────────────────────────────
// . 물/하늘  g 풀밭(나무·소품·남는 집터)  r 길  h 집터  x 작은 특색
// A 도서관 B 공방 C 공장 H 회관 P 우체국 I 여관 X 특색 건물 O 전망대
// Q 광장 F 들판 L 공터 T 훈련장 D 부두
const TEMPLATES = {
  classic: [
    '.gAArHHrCC',
    'ggAArHHrCC',
    'grrrrrrrrg',
    'BBrQQrXXrh',
    'BBrQQrXXrh',
    'Prrrrrrrrg',
    'PrFFhrIIrO',
    'grFFhrIIrg',
    'TTrLLrhhrr',
    'TTrLLrhhrD',
  ],
  round: [
    '...gHHg...',
    '..ggHHgCC.',
    '.AArrrrCCg',
    'gAArQQrrrg',
    'grrrQQrXXg',
    'BBrTrrrXXg',
    'BBrTrPPrrO',
    '.rrrrrrrD.',
    '.FFrLLrII.',
    '.FFhLLhII.',
  ],
  harbor: [
    '..gAArHHg.',
    '.ggAArHHgg',
    'grrrrrrrrg',
    'BBrXXrCCrg',
    'BBrXXrCCrO',
    'rrrrrrrrrg',
    'PhrQQrFF..',
    'PhrQQrFF..',
    'grrLLrIID.',
    '.TTLLrIID.',
  ],
};
const CORE = { A: 'library', B: 'workshop', C: 'factory', H: 'hall', P: 'post', I: 'inn' };
const ZONES = { Q: 'plaza', F: 'field', L: 'lot', T: 'testground', D: 'dock' };
const WALK = new Set(['r', 'Q', 'F', 'L', 'T', 'D']);

function buildLayout(v) {
  const seed = v.seed >>> 0, arch = STYLES[v.archetype] ? v.archetype : 'artisan', style = STYLES[arch];
  const biomeKey = BIOME_KEYS[seed % BIOME_KEYS.length], biome = BIOMES[biomeKey];
  const tname = style.templates[(seed >>> 4) % style.templates.length];
  const mirror = ((seed >>> 7) & 1) === 1;
  let rows = TEMPLATES[tname];
  if (mirror) rows = rows[0].split('').map((_, x) => rows.map((r) => r[x]).join('')); // 대각선 뒤집기
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? '.' : rows[y][x]);
  const rects = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = at(x, y);
    if (!/[A-Z]/.test(ch)) continue;
    const r = rects[ch] || (rects[ch] = { x, y, x2: x, y2: y });
    r.x = Math.min(r.x, x); r.y = Math.min(r.y, y); r.x2 = Math.max(r.x2, x); r.y2 = Math.max(r.y2, y);
  }
  const walk = (x, y) => WALK.has(at(x, y));
  const L = { seed, arch, style, biomeKey, biome, tname, mirror, at, walk, places: {}, items: [], houseSlots: [], decor: [] };
  const R = mulberry(seed);
  for (const [ch, r] of Object.entries(rects)) {
    const x = r.x, y = r.y, w = r.x2 - r.x + 1, d = r.y2 - r.y + 1;
    let pf, role;
    if (CORE[ch]) { role = CORE[ch]; pf = PREFABS[role]; }
    else if (ZONES[ch]) { role = ZONES[ch]; pf = PREFABS[role]; }
    else if (ch === 'X') { pf = PREFABS[style.extras[seed % style.extras.length]]; role = 'extra'; }
    else if (ch === 'O') { pf = PREFABS[style.lookout]; role = 'lookout'; }
    if (!pf) continue;
    // 문: 길이 닿는 앞면(왼쪽 앞 L / 오른쪽 앞 R)
    let door = 'L', stand = null;
    for (let i = 0; i < w && !stand; i++) if (walk(x + ((w - 1) >> 1) + (i % 2 ? -1 : 1) * Math.ceil(i / 2), y + d)) { const xx = x + ((w - 1) >> 1) + (i % 2 ? -1 : 1) * Math.ceil(i / 2); stand = [xx + .5, y + d + .5]; door = 'L'; }
    for (let i = 0; i < d && !stand; i++) if (walk(x + w, y + i)) { stand = [x + w + .5, y + i + .5]; door = 'R'; }
    if (!stand && !ZONES[ch]) { // 앞면에 길이 없으면 가까운 길
      let best = null;
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) if (at(xx, yy) === 'r') { const dd = Math.abs(xx - (x + w / 2)) + Math.abs(yy - (y + d / 2)); if (!best || dd < best[0]) best = [dd, xx, yy]; }
      if (best) stand = [best[1] + .5, best[2] + .5];
    }
    if (ZONES[ch]) stand = [x + w / 2, y + d / 2];
    let dockDir = null;
    if (role === 'dock') dockDir = at(x + w, y) === '.' || x + w >= N ? 'x' : 'y';
    const it = { ch, role, pf, x, y, w, d, door, stand, dockDir, open: 0, grand: style.grand === role, seed: hash(seed + ch) };
    L.items.push(it);
    if (role !== 'extra') L.places[role] = it;
  }
  // 집터: h 먼저, 그다음 g (앞쪽부터 뒤섞어서)
  const gs = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const ch = at(x, y); if (ch === 'h') L.houseSlots.push([x, y]); else if (ch === 'g' || ch === 'x') gs.push([x, y]); }
  gs.sort((a, b) => hash(seed + ':' + a) - hash(seed + ':' + b));
  L.houseSlots.push(...gs.slice(0, Math.ceil(gs.length * .6)));
  // 장식: 남는 풀밭에 나무와 스타일 소품
  for (const [x, y] of gs) {
    const r = R();
    if (r < .5) L.decor.push({ x, y, kind: 'tree', tree: biome.trees[Math.floor(R() * biome.trees.length)], s: .85 + R() * .3, ox: (R() - .5) * .3, oy: (R() - .5) * .3 });
    else if (r < .72) L.decor.push({ x, y, kind: 'prop', pf: PREFABS[style.props[Math.floor(R() * style.props.length)]] });
  }
  return L;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 길찾기 (길 + 야외 구역 타일)
function findPath(L, from, to) {
  const sx = Math.floor(from[0]), sy = Math.floor(from[1]), tx = Math.floor(to[0]), ty = Math.floor(to[1]);
  if (sx === tx && sy === ty) return [to];
  const key = (x, y) => y * N + x, prev = new Map([[key(sx, sy), -1]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !(L.walk(nx, ny) || (nx === tx && ny === ty))) continue;
      prev.set(k, key(x, y)); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return [to];
  const out = []; let k = key(tx, ty);
  while (k !== -1 && k !== key(sx, sy)) { out.unshift([k % N + .5, Math.floor(k / N) + .5]); k = prev.get(k); }
  out[out.length - 1] = to;
  return out;
}

// ── 바다/구름 섬 ─────────────────────────────────────────────────────────────
function drawIsland(g, L, cloudy, night) {
  const b = L.biome, land = (x, y) => L.at(x, y) !== '.';
  if (!cloudy) { // 바다
    const [cx, cy] = iso(N / 2, N / 2, -DEPTH);
    const gr = g.createRadialGradient(cx, cy + 10, 20, cx, cy + 10, 200);
    gr.addColorStop(0, night > .5 ? '#2f5a7a' : b.water); gr.addColorStop(1, night > .5 ? 'rgba(47,90,122,0)' : b.water + '00');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + 14, 190, 78, 0, 0, Math.PI * 2); g.fill();
  } else { // 떠 있는 섬 바위 뿌리
    let mx = 0, my = 0, n = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (land(x, y)) { mx += x; my += y; n++; }
    const tip = iso(mx / n + .5, my / n + .5, -DEPTH - 58);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!land(x, y)) continue;
      if (!land(x, y + 1)) poly(g, [iso(x, y + 1, -DEPTH), iso(x + 1, y + 1, -DEPTH), tip], shade(b.dirt[0], -.12));
      if (!land(x + 1, y)) poly(g, [iso(x + 1, y, -DEPTH), iso(x + 1, y + 1, -DEPTH), tip], shade(b.dirt[1], -.15));
    }
  }
  // 옆면: 앞쪽으로 드러난 가장자리마다
  for (let s = 0; s < N * 2; s++) for (let y = 0; y < N; y++) { const x = s - y; if (x < 0 || x >= N || !land(x, y)) continue;
    if (!land(x, y + 1)) { poly(g, [iso(x, y + 1), iso(x + 1, y + 1), iso(x + 1, y + 1, -DEPTH), iso(x, y + 1, -DEPTH)], b.dirt[0]); poly(g, [iso(x, y + 1), iso(x + 1, y + 1), iso(x + 1, y + 1, -3), iso(x, y + 1, -3)], b.rim[0]); }
    if (!land(x + 1, y)) { poly(g, [iso(x + 1, y), iso(x + 1, y + 1), iso(x + 1, y + 1, -DEPTH), iso(x + 1, y, -DEPTH)], b.dirt[1]); poly(g, [iso(x + 1, y), iso(x + 1, y + 1), iso(x + 1, y + 1, -3), iso(x + 1, y, -3)], b.rim[1]); }
  }
  if (!cloudy) { g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (land(x, y)) {
      if (!land(x, y + 1)) line(g, iso(x - .05, y + 1.08, -DEPTH + 2), iso(x + 1.05, y + 1.08, -DEPTH + 2), 'rgba(255,255,255,.6)', 1.2);
      if (!land(x + 1, y)) line(g, iso(x + 1.08, y - .05, -DEPTH + 2), iso(x + 1.08, y + 1.05, -DEPTH + 2), 'rgba(255,255,255,.6)', 1.2);
    } }
  // 바닥 타일
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = L.at(x, y); if (ch === '.') continue;
    const road = ch === 'r';
    tile(g, x, y, 1, 1, 0, road ? b.path : b.grass[(x + y) % 2]);
    if (road) { if (hash(L.seed + 'p' + x + y) % 3 === 0) { const [px, py] = iso(x + .5, y + .5); ellipse(g, px - 3, py, 2, 1, shade(b.path, -.06)); } }
    else if (hash(L.seed + ':' + x + ':' + y) % 3 === 0) { const [px, py] = iso(x + .5, y + .5); ellipse(g, px + 3, py, 2, 1, b.tuft); }
  }
}
function cloudPuff(g, x, y, s, a) { g.globalAlpha = a; ellipse(g, x, y, 16 * s, 6 * s, '#ffffff'); circle(g, x - 6 * s, y - 3 * s, 6 * s, '#ffffff'); circle(g, x + 5 * s, y - 4 * s, 7.5 * s, '#ffffff'); g.globalAlpha = 1; }

// ── 시간대 ──────────────────────────────────────────────────────────────────
function daytime(p) {
  if (p < .55) return { name: 'day', sky: ['#bfe3f5', '#e9f5fb'], overlay: null, night: 0 };
  if (p < .78) return { name: 'golden', sky: ['#f6cf9a', '#fbe9cf'], overlay: ['#ff9d4d', .16], night: 0 };
  if (p < .92) return { name: 'dusk', sky: ['#8f78b8', '#f1a587'], overlay: ['#6a4f9f', .32], night: .6 };
  return { name: 'night', sky: ['#1b2348', '#3a4b82'], overlay: ['#2a3a78', .5], night: 1 };
}

// ── 장소 → 서 있을 곳/자세 ───────────────────────────────────────────────────
const POSE_AT = { field: 'search', lot: 'carry', testground: 'look', dock: 'carry', lookout: 'look', plaza: 'stand' };
function slotIn(it, i, n) { // 구역 안에서 i 번째 사람 자리
  const cols = Math.max(1, it.w * 2), u = (i % cols + .5) / cols, v = ((Math.floor(i / cols) % (it.d * 2)) + .5) / (it.d * 2);
  return [it.x + .15 + u * (it.w - .3), it.y + .15 + v * (it.d - .3)];
}

// ── 마을 시뮬레이션 + 그리기 ────────────────────────────────────────────────
class VillageScene {
  constructor(v) {
    this.id = v.id;
    this.actors = new Map(); this.fx = []; this.seenFx = new Set(); this.first = true;
    this.houseAt = new Map(); this.label = null;
    this.timers = { push: 0, pr: 0, build: 0, buildName: '', test: 0, testRes: null, boom: 0, party: 0 };
    this.setData(v);
  }
  setData(v) {
    const lk = v.archetype + ':' + v.seed;
    if (lk !== this.layoutKey) { this.layoutKey = lk; this.L = buildLayout(v); this.ground = null; }
    this.v = v;
    const now = performance.now();
    for (const h of v.houses) if (!this.houseAt.has(h.path)) this.houseAt.set(h.path, this.first ? 0 : now);
    for (const e of v.effects) {
      if (this.seenFx.has(e.id)) continue; this.seenFx.add(e.id);
      if (this.first || Date.now() - e.at > 15000) continue;
      const T = this.timers;
      if (e.kind === 'push') T.push = now; else if (e.kind === 'pr') T.pr = now;
      else if (e.kind === 'build') { T.build = now; T.buildName = e.text; }
      else if (e.kind === 'testpass' || e.kind === 'testfail') { T.test = now; T.testRes = e.kind; }
      else if (e.kind === 'boom') T.boom = now;
      if (['commit', 'pr', 'dawn', 'testpass'].includes(e.kind)) this.fx.push({ kind: e.kind, t0: now, seed: e.id });
    }
    if (v.status === 'done' && this.prevStatus !== 'done') this.timers.party = now;
    this.prevStatus = v.status;
    // 사람들: 촌장 + 학생
    const want = new Map();
    want.set('mayor', { role: 'mayor', kind: v.kind });
    for (const s of v.students) want.set(s.id, { role: 'student', kind: s.done ? 'home' : s.kind, desc: s.desc });
    for (const [id, w] of want) {
      let a = this.actors.get(id);
      if (!a) {
        const start = id === 'mayor' ? this.placeStand('inn') : this.placeStand('hall');
        a = { id, x: start[0], y: start[1], path: [], dir: 1, inside: null, h: hash(id), alpha: id === 'mayor' ? 1 : 0, place: null };
        if (id === 'mayor' && this.first && v.kind && INDOOR.has(PLACE_OF[v.kind])) { a.inside = this.L.places[PLACE_OF[v.kind]]; const st = this.placeStand(PLACE_OF[v.kind]); a.x = st[0]; a.y = st[1]; a.place = PLACE_OF[v.kind]; }
        this.actors.set(id, a);
      }
      Object.assign(a, w, { gone: false });
    }
    for (const [id, a] of this.actors) if (!want.has(id)) a.gone = true;
    this.first = false;
  }
  placeStand(place) { const it = this.L.places[place]; return it ? it.stand.slice() : [N / 2, N / 2]; }

  // 사람마다 갈 곳을 정하고 걷게 한다
  stepActors(dt) {
    const counts = {};
    for (const a of this.actors.values()) {
      const place = a.gone || a.kind === 'home' ? 'hall' : PLACE_OF[a.kind] || 'inn';
      const it = this.L.places[place];
      if (!it) continue;
      const idx = counts[place] = (counts[place] || 0) + 1;
      if (a.place !== place) { // 새 목적지
        if (a.inside) { const st = a.inside.stand; a.x = st[0]; a.y = st[1]; a.inside = null; }
        a.place = place;
        const goal = INDOOR.has(place) || place === 'lookout' ? it.stand : slotIn(it, idx - 1 + (a.role === 'mayor' ? 0 : 1));
        a.path = findPath(this.L, [a.x, a.y], goal);
      }
      const sp = (a.role === 'mayor' ? 2.4 : 2.0) * dt;
      if (a.path.length) {
        const p = a.path[0], dx = p[0] - a.x, dy = p[1] - a.y, d = Math.hypot(dx, dy);
        if (d <= sp) { a.x = p[0]; a.y = p[1]; a.path.shift(); } else { a.x += dx / d * sp; a.y += dy / d * sp; }
        if (Math.abs(dx - dy) > .01) a.dir = Math.sign(dx - dy);
        a.walking = true;
      } else {
        a.walking = false;
        if (INDOOR.has(place) && !a.inside && !a.gone && a.kind !== 'home') a.inside = it;
        if (place === 'field' && Math.random() < dt * .4) { const g2 = slotIn(it, Math.floor(Math.random() * 8)); a.path = [g2]; } // 들판은 돌아다니며 찾음
      }
      if ((a.gone || a.kind === 'home') && !a.walking) a.alpha = Math.max(0, a.alpha - dt * 1.5); else a.alpha = Math.min(1, a.alpha + dt * 2);
      if (a.alpha <= 0 && a.id !== 'mayor') this.actors.delete(a.id);
    }
  }

  pose(a) {
    const v = this.v;
    if (a.walking) return a.place === 'lot' || a.place === 'dock' ? 'carry' : 'walk';
    if (a.role === 'mayor' && v.status === 'waiting') return 'wave';
    if (a.role === 'mayor' && v.status === 'done') return 'cheer';
    return POSE_AT[a.place] || 'stand';
  }

  draw(g, t, dt) {
    const v = this.v, L = this.L, cloudy = v.where === 'cloud';
    const pct = v.ctx ? v.ctx.pct : .2, dt0 = daytime(pct), night = dt0.night;
    this.stepActors(Math.min(.1, dt));
    setOrigin(ORIGIN[0], ORIGIN[1] + (cloudy ? Math.sin(t / 1800 + L.seed) * 2 : 0));
    const lights = [];
    const now = performance.now(), T = this.timers;
    const working = v.status === 'working';
    const activePlaces = new Set();
    for (const a of this.actors.values()) if (!a.gone && a.place && !a.walking && (working || a.role === 'student')) activePlaces.add(a.place);
    if (v.status === 'idle') activePlaces.add('inn');
    const state = {
      todos: v.todos || 0, ring: v.status === 'waiting', party: v.status === 'done' && now - T.party < 8000,
      crates: v.stats.commits, prFlag: v.stats.prs > 0,
      sail: T.push && now - T.push < 9000 ? clamp((now - T.push) / 5000, 0, 1) : 0,
      building: (v.kind === 'write' && working) || now - T.build < 7000, progress: T.build ? clamp((now - T.build) / 7000, 0, 1) : undefined, buildName: T.buildName,
      pass: T.testRes === 'testpass' && now - T.test < 30000, fail: T.testRes === 'testfail' && now - T.test < 30000,
    };
    // 하늘
    if (night > .5) for (let i = 0; i < 26; i++) { const r = hash('s' + i + L.seed); circle(g, r % VW, (r >> 9) % 90, .7, `rgba(255,255,255,${.3 + .6 * Math.abs(Math.sin(t / 900 + i))})`); }
    for (let i = 0; i < 3; i++) cloudPuff(g, ((hash('c' + i + L.seed) % VW) + t / (120 + i * 50)) % (VW + 80) - 50, 14 + i * 13, 1 - i * .15, night ? .25 : .85);
    drawIsland(g, L, cloudy, night);
    if (cloudy) { const [cx, cy] = iso(N / 2, N / 2, -DEPTH - 40); for (let i = 0; i < 8; i++) cloudPuff(g, cx - 150 + i * 42 + Math.sin(t / 2000 + i) * 6, cy + 24 + (i % 2) * 10, 1.3, .95); }

    const items = [];
    const add = (depth, fn) => items.push({ depth, fn });
    const base = (it, extra) => Object.assign({ g, t, x: it.x, y: it.y, w: it.w, d: it.d, style: L.style, biome: L.biome, seed: it.seed, night, lights, door: it.door, grand: it.grand, state, cloudy, dockDir: it.dockDir }, extra);
    for (const it of L.items) {
      const on = activePlaces.has(it.role) && (working || it.role === 'inn' || this.anyStudentAt(it.role));
      const isZone = it.pf.group === 'zone';
      const insideHere = [...this.actors.values()].filter((a) => a.inside === it && !a.gone);
      const wantOpen = INDOOR.has(it.role) && insideHere.length > 0 ? 1 : 0;
      it.open = lerp(it.open, wantOpen, Math.min(1, dt * 4));
      const c = base(it, { on, open: it.open, boom: it.role === 'factory' && now - T.boom < 2600, ring: it.role === 'hall' && v.status === 'waiting' });
      if (insideHere.length) c.inside = (x, y, w, d, spots) => insideHere.forEach((a, i) => { const sp = spots[i % spots.length]; const [px, py] = iso(x + w * sp[0], y + d * sp[1]); this.drawActor(g, a, px, py, t, sp[2]); });
      add(isZone ? it.x + it.y - .5 : it.x + it.w / 2 + it.y + it.d / 2, () => it.pf.draw(c));
      if (on || (it.role === 'plaza' && (v.status === 'waiting' || v.status === 'done'))) this.labelAt = it;
    }
    // 집
    const slots = L.houseSlots, hs = v.houses.slice(-slots.length);
    const housed = new Set();
    hs.forEach((h, i) => {
      const [x, y] = slots[i]; housed.add(x + ',' + y);
      const ext = (h.name.split('.').pop() || '').toLowerCase(), pf = PREFABS[HOUSE_OF_EXT[ext] || ['cottage', 'aframe', 'hut'][hash(h.path) % 3]];
      const born = this.houseAt.get(h.path) || 0, age = born ? (now - born) / 700 : 9;
      const grow = clamp(age, 0, 1), k = 1 - Math.pow(1 - grow, 3) + (grow < 1 ? Math.sin(grow * Math.PI) * .15 : 0);
      add(x + y + 1, () => {
        pf.draw({ g, t, x, y, w: 1, d: 1, night, lights, grow: k, level: Math.min(4, Math.floor((h.edits - 1) / 2)), roofColor: ROOF_OF_EXT[ext] || pick(L.style.roofs, hash(h.path)), wall: pick(L.style.walls, hash(h.path) >>> 2), on: h.edits > 3, biome: L.biome, style: L.style });
        if (age < 4) { const p = age / 4; for (let i2 = 0; i2 < 5; i2++) { const [px, py] = iso(x + .5, y + .5, 22 + p * 12); const a2 = i2 / 5 * Math.PI * 2 + t / 500; g.globalAlpha = 1 - p; circle(g, px + Math.cos(a2) * 8 * p, py + Math.sin(a2) * 4 * p, 1.1, '#fff6c9'); } g.globalAlpha = 1; }
      });
    });
    for (const dcr of L.decor) {
      if (housed.has(dcr.x + ',' + dcr.y)) continue;
      if (dcr.kind === 'tree') add(dcr.x + dcr.y + 1, () => treeAt({ g, t }, dcr.tree, dcr.x + .5 + dcr.ox, dcr.y + .5 + dcr.oy, dcr.s));
      else add(dcr.x + dcr.y + 1, () => dcr.pf.draw({ g, t, x: dcr.x, y: dcr.y, w: 1, d: 1, biome: L.biome, night, lights }));
    }
    // 바깥에 있는 사람들
    for (const a of this.actors.values()) {
      if (a.inside) continue;
      add(a.x + a.y + .3, () => { const [px, py] = iso(a.x, a.y); this.drawActor(g, a, px, py, t); });
    }
    items.sort((p, q) => p.depth - q.depth).forEach((it) => it.fn());

    // 시간대 색 + 불빛
    if (dt0.overlay) { g.globalCompositeOperation = 'multiply'; g.fillStyle = dt0.overlay[0]; g.globalAlpha = dt0.overlay[1]; g.fillRect(0, 0, VW, VH); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
    if (lights.length) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const li of lights) {
        if (li.pts) { g.shadowColor = li.color; g.shadowBlur = 8; poly(g, li.pts, li.color); g.shadowBlur = 0; }
        else { const gr = g.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r); gr.addColorStop(0, li.color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(li.x - li.r, li.y - li.r, li.r * 2, li.r * 2); }
      }
      g.restore();
    }
    this.fx = this.fx.filter((f) => effect(g, t, f, L));
    if (T.pr && now - T.pr < 6500) bannerPlane(g, t, (now - T.pr) / 1000);
    // 라벨 위치 (HTML 로 띄움)
    const m = this.actors.get('mayor');
    const lit = m && m.place ? L.places[m.place] : null;
    if (lit) { const top = lit.pf.group === 'zone' ? 18 : 46; const [lx, ly] = iso(lit.x + lit.w / 2, lit.y + lit.d / 2, top); this.labelPos = [lx / VW, ly / VH, m.place]; }
    else this.labelPos = null;
  }
  anyStudentAt(role) { for (const a of this.actors.values()) if (a.role === 'student' && a.place === role && !a.walking) return true; return false; }

  drawActor(g, a, px, py, t, spotPose) {
    const v = this.v, mayor = a.role === 'mayor';
    const pose = spotPose && a.inside ? (a.inside.role === 'inn' && !(mayor && v.status === 'idle') ? 'sit' : spotPose) : this.pose(a);
    g.globalAlpha = a.alpha;
    person(g, px, py, {
      s: mayor ? 1.25 : .95, t: t + a.h % 900, dir: a.dir, pose,
      shirt: SHIRTS[a.h % 8], hair: HAIRS[a.h % 6],
      hat: mayor ? 'top' : a.place === 'lot' || a.place === 'factory' ? 'hard' : 'cap', hatColor: mayor ? pick(this.L.style.roofs, this.L.seed) : '#4c79c7',
      pack: !mayor, bookColor: SPINES[a.h % 9],
    });
    if (mayor && !a.inside) {
      if (v.status === 'waiting') bubble(g, px, py - 38, t, '!', '#e5534b');
      else if (v.status === 'done' && !a.walking) bubble(g, px, py - 38, t, '✓', '#2f9e6a');
    }
    if (mayor && a.inside && v.status === 'waiting') bubble(g, px, py - 30, t, '!', '#e5534b');
    g.globalAlpha = 1;
  }
}

// ── 한 번씩 터지는 일 ───────────────────────────────────────────────────────
function effect(g, t, f, L) {
  const a = (t - f.t0) / 1000;
  if (f.kind === 'commit' || f.kind === 'testpass') { // 불꽃놀이
    if (a > 3.4) return false;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let b = 0; b < (f.kind === 'commit' ? 3 : 2); b++) {
      const bt = a - b * .55; if (bt < 0 || bt > 1.9) continue;
      const cx = 70 + ((f.seed * 47 + b * 83) % 200), cy = 26 + (b * 13) % 30, col = f.kind === 'testpass' ? '#5fd39a' : SHIRTS[(f.seed + b * 3) % 8];
      if (bt < .45) circle(g, cx, cy + 50 * (1 - bt / .45), 1.2, '#fff4c8');
      else for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2, r = (bt - .45) * 26; g.globalAlpha = clamp(1.2 - (bt - .45), 0, 1); circle(g, cx + Math.cos(an) * r, cy + Math.sin(an) * r + (bt - .45) ** 2 * 10, 1.4, col); }
    }
    g.restore(); return true;
  }
  if (f.kind === 'dawn') {
    if (a > 3) return false;
    g.globalAlpha = clamp(.85 - a / 3, 0, 1); g.fillStyle = '#fff4d6'; g.fillRect(0, 0, VW, VH); g.globalAlpha = clamp(1.6 - a / 2, 0, 1);
    g.fillStyle = '#b8653e'; g.font = '800 13px sans-serif'; g.textAlign = 'center'; g.fillText('새로운 하루', VW / 2, 44); g.textAlign = 'left'; g.globalAlpha = 1; return true;
  }
  return false;
}
function bannerPlane(g, t, a) {
  const x = VW + 20 - a * 75, y = 30 + Math.sin(a * 2) * 3;
  g.fillStyle = '#f3f1ec'; rr(g, x, y, 16, 5, 2.5); g.fillStyle = '#d6584a'; g.fillRect(x + 6, y - 4, 3, 13); g.fillRect(x + 14, y - 1, 2, 4);
  line(g, [x + 16, y + 2.5], [x + 22, y + 2.5], '#9b958c', .6);
  g.fillStyle = '#fff6c2'; g.beginPath(); g.moveTo(x + 22, y - 3); g.lineTo(x + 60, y - 3 + Math.sin(t / 150)); g.lineTo(x + 60, y + 8 + Math.sin(t / 150)); g.lineTo(x + 22, y + 8); g.fill();
  g.fillStyle = '#b8476e'; g.font = '800 7px sans-serif'; g.fillText('PR 올림!', x + 26, y + 5);
}
