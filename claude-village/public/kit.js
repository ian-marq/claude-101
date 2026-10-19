'use strict';
// 에셋 키트: 지형(바이옴) · 마을 스타일 · 프리팹(건물/구역/집/소품).
// 마을은 이 조각들을 템플릿 지도 위에 조합해서 만든다. /kit.html 에서 전부 볼 수 있다.

// ── 바이옴: 레포마다 고정되는 지형 색 ───────────────────────────────────────
const BIOMES = {
  meadow:   { name: '초원', grass: ['#a6d483', '#9dcc7a'], tuft: '#8cc06a', path: '#ecdcb6', pave: '#e4d6b8', dirt: ['#b58258', '#946645'], rim: ['#8dbd69', '#7aa95a'], water: '#8fd3e6', trees: ['round', 'pine', 'round'], crop: ['#e8c45a', '#d9b24a'], flowers: ['#f28fa0', '#ffd166', '#ffffff'] },
  autumn:   { name: '가을', grass: ['#d5c17c', '#cab36c'], tuft: '#b89a52', path: '#efdcb8', pave: '#e6d3b4', dirt: ['#a8714a', '#875a3a'], rim: ['#c2a85f', '#ad9450'], water: '#86c5d8', trees: ['maple', 'maple', 'round'], crop: ['#e0a43a', '#c98a2e'], flowers: ['#e86a3a', '#f2b33d', '#b5503a'] },
  snow:     { name: '설원', grass: ['#f3f7f9', '#e9eff3'], tuft: '#d6e0e6', path: '#d6dce3', pave: '#dfe4ea', dirt: ['#9aa6b2', '#7d8a96'], rim: ['#ffffff', '#e3e9ee'], water: '#a9d8ea', trees: ['snowpine', 'snowpine', 'pine'], crop: ['#cfd8de', '#c1ccd3'], flowers: ['#9cc8e8', '#ffffff', '#c8b8e8'] },
  desert:   { name: '사막', grass: ['#ecd59c', '#e4ca8d'], tuft: '#cfae6a', path: '#d6b47c', pave: '#e0c48f', dirt: ['#c98f5a', '#a8723f'], rim: ['#dcc083', '#c9ad72'], water: '#6fd0d6', trees: ['palm', 'cactus', 'palm'], crop: ['#c8a64f', '#b8963f'], flowers: ['#e8735a', '#f2c14e', '#d95d8a'] },
  sakura:   { name: '벚꽃', grass: ['#b7dd92', '#aed588'], tuft: '#98c776', path: '#f2e4cb', pave: '#ecdcc4', dirt: ['#b58258', '#946645'], rim: ['#9fcb7a', '#8dba69'], water: '#9fd8ea', trees: ['cherry', 'cherry', 'round'], crop: ['#f4b6c8', '#e9a0b6'], flowers: ['#f7b7c8', '#ffffff', '#f28fa0'] },
  tropical: { name: '열대', grass: ['#93d47c', '#89cc72'], tuft: '#72b85c', path: '#f3e3b5', pave: '#eedcae', dirt: ['#c9935e', '#a67447'], rim: ['#7fc266', '#6db058'], water: '#4fd1d9', trees: ['palm', 'round', 'palm'], crop: ['#f0c95a', '#e6b84a'], flowers: ['#ff7a8a', '#ffd23d', '#ff9f43'] },
};
const BIOME_KEYS = Object.keys(BIOMES);

// ── 마을 스타일: 세션 성격(아키타입)마다 다른 건물 구성·지도·색 ──────────────
const STYLES = {
  scholar:    { name: '학자 마을', desc: '읽고 찾는 일이 많은 세션', walls: ['#efe6d6', '#e8dfd2', '#f3ece0'], roofs: ['#6f5aa8', '#4f6d9f', '#8a6f9e', '#5d7f8f'], extras: ['academy', 'observatory', 'archive'], lookout: 'telescope', grand: 'library', templates: ['round', 'classic'], props: ['bench', 'lamp', 'statue', 'flowers'] },
  artisan:    { name: '장인 마을', desc: '코드를 많이 짓는 세션', walls: ['#f3e3cc', '#ead2b3', '#f6ead8'], roofs: ['#d0603f', '#c98140', '#b84f3a', '#d99a3a'], extras: ['sawmill', 'forge', 'windmill'], lookout: 'watchtower', grand: 'workshop', templates: ['classic', 'round'], props: ['logs', 'crates', 'haystack', 'flowers'] },
  industrial: { name: '공업 도시', desc: '명령을 많이 돌리는 세션', walls: ['#d0d2d6', '#c3c7cd', '#dcd8d0'], roofs: ['#5d6672', '#9a4f33', '#707a86', '#4a5560'], extras: ['refinery', 'watertower', 'powerplant'], lookout: 'waterlook', grand: 'factory', templates: ['classic', 'harbor'], props: ['barrels', 'crates', 'pipes', 'lamp'] },
  harbor:     { name: '항구 마을', desc: 'git 과 웹을 오가는 세션', walls: ['#f8f5ef', '#eef2f5', '#fbf6ec'], roofs: ['#3f7fc0', '#2f9a9a', '#d0603f', '#5aa0d8'], extras: ['market', 'boathouse', 'fishery'], lookout: 'lighthouse', grand: 'hall', templates: ['harbor', 'classic'], props: ['barrels', 'nets', 'crates', 'lamp'] },
  courier:    { name: '전령 마을', desc: '외부 도구와 학생을 많이 부리는 세션', walls: ['#f0eae0', '#e2ece8', '#f2e6dc'], roofs: ['#2f8f8a', '#c07a3f', '#3f8f5c', '#b8576e'], extras: ['radiotower', 'pigeonloft', 'hangar'], lookout: 'radiomast', grand: 'post', templates: ['round', 'harbor'], props: ['flags', 'lamp', 'bench', 'crates'] },
  miner:      { name: '광산 마을', desc: '데이터를 캐는 세션', walls: ['#e5dccf', '#d8cdbd', '#ece3d4'], roofs: ['#7a5c45', '#5a6270', '#a85a3a', '#6b5a8a'], extras: ['mine', 'drillrig', 'silo'], lookout: 'headframe', grand: 'hall', templates: ['harbor', 'round'], props: ['rocks', 'cart', 'barrels', 'lamp'] },
};

// ── 하는 일(kind) → 장소 ─────────────────────────────────────────────────────
const PLACE_OF = { read: 'library', search: 'field', web: 'lookout', edit: 'workshop', write: 'lot', run: 'factory', test: 'testground', git: 'dock', plan: 'hall', delegate: 'hall', mcp: 'post', wait: 'plaza', done: 'plaza', idle: 'inn' };
const KIND_LABEL = { read: '읽는 중', search: '찾는 중', web: '웹 탐색', edit: '고치는 중', write: '새 파일', run: '명령 실행', test: '테스트', git: 'git', plan: '계획', delegate: '일 나누기', mcp: '외부 도구', wait: '응답 대기', done: '완료', idle: '쉬는 중' };
const PLACE_LABEL = { library: '도서관', field: '들판', lookout: '전망대', workshop: '공방', lot: '공터', factory: '공장', testground: '훈련장', dock: '부두', hall: '마을회관', post: '우체국', plaza: '광장', inn: '여관' };
const INDOOR = new Set(['library', 'workshop', 'factory', 'hall', 'post', 'inn']);

const SPINES = ['#c0503e', '#3e78c0', '#7a54b8', '#3f9a62', '#d39a3a', '#b8476e', '#2f9a9a', '#8a6a4a', '#e8c45a'];

// ── 공통: 창문·문 ───────────────────────────────────────────────────────────
function win(c, pts, lit, warm = '#ffd27a') {
  const g = c.g;
  if (lit || c.night > .45) {
    poly(g, pts, lit ? warm : '#ffcf7a');
    if (c.lights) c.lights.push({ pts, color: lit ? 'rgba(255,200,90,.55)' : 'rgba(255,190,90,.32)' });
  } else {
    poly(g, pts, '#5d7896');
    poly(g, [pts[0], mid(pts[0], pts[1]), mid(pts[3], pts[2]), pts[3]], 'rgba(255,255,255,.18)');
  }
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
function windowRow(c, face, x, y, w, d, n, v0, v1, lit, skipMid) {
  const span = face === 'L' ? w : d, ww = Math.min(.32, span / (n * 1.9));
  for (let i = 0; i < n; i++) {
    const u = span * (i + .5) / n;
    if (skipMid && Math.abs(u - span / 2) < ww * 1.4) continue;
    const pts = face === 'L' ? faceL(x, y, d, 0, u - ww / 2, u + ww / 2, v0, v1) : faceR(x, y, w, 0, u - ww / 2, u + ww / 2, v0, v1);
    win(c, pts, lit);
  }
}
function doorOn(c, face, x, y, w, d, color = '#7a5232', hh = 9) {
  const span = face === 'L' ? w : d, u = span / 2, dw = .16;
  const pts = face === 'L' ? faceL(x, y, d, 0, u - dw, u + dw, 0, hh) : faceR(x, y, w, 0, u - dw, u + dw, 0, hh);
  poly(c.g, pts, color);
  const k = face === 'L' ? faceL(x, y, d, 0, u + dw * .55, u + dw * .7, hh * .45, hh * .55) : faceR(x, y, w, 0, u + dw * .55, u + dw * .7, hh * .45, hh * .55);
  poly(c.g, k, '#e7c35a');
}
const pick = (arr, seed) => arr[(((seed | 0) % arr.length) + arr.length) % arr.length];

// ── 건물 공통 그리기: 겉모습 ↔ 단면(안쪽) 을 open 으로 섞는다 ──────────────────
function drawBuilding(c, s) {
  const g = c.g, ins = s.inset ?? .12;
  const x = c.x + ins, y = c.y + ins, w = c.w - ins * 2, d = c.d - ins * 2, h = s.h;
  const wall = s.wall || pick(c.style.walls, c.seed), rc = s.roof || pick(c.style.roofs, c.seed >>> 3);
  const open = s.interior ? (c.open || 0) : 0, door = c.door || 'L';
  if (open > .01) {
    g.save(); g.globalAlpha = open;
    backWalls(g, x, y, w, d, h * .85, 0, s.inner || shade(wall, .05), s.floor || '#cfae84');
    s.interior(c, x, y, w, d, h);
    if (c.inside) c.inside(x, y, w, d, s.spots || [[.5, .5]]);
    cutFront(g, x, y, w, d, 4, 0, wall);
    g.restore();
  }
  if (open < .99) {
    g.save(); g.globalAlpha = 1 - open;
    if (s.plinth !== false) box(g, x - .05, y - .05, w + .1, d + .1, 2.5, 0, shade(wall, -.14));
    box(g, x, y, w, d, h, 0, wall, s.wallOpt);
    if (s.bands) for (let i = 1; i < s.bands; i++) { const v = h * i / s.bands; poly(g, faceL(x, y, d, 0, 0, w, v - .4, v + .4), shade(wall, -.1)); poly(g, faceR(x, y, w, 0, 0, d, v - .4, v + .4), shade(wall, -.22)); }
    const rows = s.rows || [[h * .4, h * .4 + 6]];
    for (const [v0, v1] of rows) {
      windowRow(c, 'L', x, y, w, d, s.winL ?? Math.max(1, Math.round(w * 1.5)), v0, v1, c.on, door === 'L' && v0 < 10);
      windowRow(c, 'R', x, y, w, d, s.winR ?? Math.max(1, Math.round(d * 1.5)), v0, v1, c.on, door === 'R' && v0 < 10);
    }
    if (s.door !== false) doorOn(c, door, x, y, w, d, s.doorColor);
    if (s.decor) s.decor(c, x, y, w, d, h, wall, rc);
    g.translate(0, -open * 26);
    if (s.roofKind) roof(g, s.roofKind, x, y, w, d, h, s.roofH ?? 12, rc, wall);
    if (s.top) s.top(c, x, y, w, d, h, wall, rc);
    g.restore();
  }
  if (s.always) s.always(c, x, y, w, d, h, wall, rc);
}

// 안쪽 가구 도우미 (로컬 좌표)
const fbox = (c, x, y, u, v, w, d, h, z, color, o) => box(c.g, x + u, y + v, w, d, h, z, color, o);
function shelf(c, x, y, w, d, h, along) { // 뒷벽 책장
  const g = c.g;
  if (along === 'x') {
    for (let s = 0; s < 2; s++) { const u0 = .08 + s * (w / 2), u1 = u0 + w / 2 - .16; box(g, x + u0, y + .02, u1 - u0, .22, h, 0, '#8a6240');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const uu = u0 + .04 + k * (u1 - u0 - .08) / 6; poly(g, [iso(x + uu, y + .24, 3 + r * (h / 3.3)), iso(x + uu + .06, y + .24, 3 + r * (h / 3.3)), iso(x + uu + .06, y + .24, 3 + r * (h / 3.3) + 4.5), iso(x + uu, y + .24, 3 + r * (h / 3.3) + 4.5)], SPINES[(k + r * 3 + s) % 9]); } }
  } else {
    for (let s = 0; s < 2; s++) { const v0 = .08 + s * (d / 2), v1 = v0 + d / 2 - .16; box(g, x + .02, y + v0, .22, v1 - v0, h, 0, '#7a5434');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const vv = v0 + .04 + k * (v1 - v0 - .08) / 6; poly(g, [iso(x + .24, y + vv, 3 + r * (h / 3.3)), iso(x + .24, y + vv + .06, 3 + r * (h / 3.3)), iso(x + .24, y + vv + .06, 3 + r * (h / 3.3) + 4.5), iso(x + .24, y + vv, 3 + r * (h / 3.3) + 4.5)], shade(SPINES[(k + r * 2 + s) % 9], -.12)); } }
  }
}

// ── 프리팹 목록 ─────────────────────────────────────────────────────────────
// group: core(일하는 건물, 단면 있음) · extra(마을 특색 건물) · lookout · zone(야외) · house · prop
const PREFABS = {};
const def = (id, o) => (PREFABS[id] = { id, ...o });

// ━━ 핵심 건물: 케이크처럼 앞쪽 한 조각을 잘라낸 단면 ━━
// 잘린 면에는 층이 보인다: 바닥판 · 방 · 천장 · 다락 · 지붕. 안에서 일하는 모습이 늘 보인다.
const CUT = '#fbf2e2', CUT_EDGE = '#d9c3a0', CEIL = '#ead6b4', ATTIC = '#f4e6cc';
function roofZ(kind, x, y, w, d, H, rh, px, py) {
  const ax = 1 - Math.abs(px - (x + w / 2)) / (w / 2), ay = 1 - Math.abs(py - (y + d / 2)) / (d / 2);
  if (kind === 'gableX') return H + rh * ay;
  if (kind === 'gableY') return H + rh * ax;
  if (kind === 'hip') return H + rh * Math.min(ax, ay);
  return H + 3; // flat
}
// 지붕을 작은 면으로 나눠 높이대로 칠함 (L자 모양에도 맞음)
function roofCells(g, x0, y0, x1, y1, zr, rc) {
  const nx = Math.max(2, Math.round((x1 - x0) * 6)), ny = Math.max(2, Math.round((y1 - y0) * 6));
  const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny, cells = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) cells.push([i, j]);
  cells.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [i, j] of cells) {
    const ax = x0 + i * dx, ay = y0 + j * dy, bx = ax + dx, by = ay + dy;
    const z00 = zr(ax, ay), z10 = zr(bx, ay), z11 = zr(bx, by), z01 = zr(ax, by);
    const gx = ((z10 - z00) + (z11 - z01)) / 2 / dx, gy = ((z01 - z00) + (z11 - z10)) / 2 / dy;
    const col = gy < -2 && gy <= gx ? rc : gx < -2 ? shade(rc, -.24) : (gx > 2 || gy > 2) ? shade(rc, .12) : shade(rc, .06);
    poly(g, [iso(ax, ay, z00), iso(bx, ay, z10), iso(bx, by, z11), iso(ax, by, z01)], col, col, .5);
  }
}
// 세로 면 하나(바닥 z0 ~ 위쪽 윤곽선)를 채움. along: 'x' 면 y 고정, 'y' 면 x 고정
function profileFace(g, along, fixed, a0, a1, z0, ztop, fill, edge) {
  const n = 10, top = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); top.push(along === 'x' ? iso(a, fixed, ztop(a)) : iso(fixed, a, ztop(a))); }
  const pts = along === 'x' ? [iso(a0, fixed, z0), iso(a1, fixed, z0)] : [iso(fixed, a0, z0), iso(fixed, a1, z0)];
  poly(g, [pts[0], pts[1], ...top.reverse()], fill, edge, .8);
  return top.reverse();
}
function drawCake(c, s) {
  const g = c.g, ins = s.inset ?? .1;
  const x = c.x + ins, y = c.y + ins, w = c.w - ins * 2, d = c.d - ins * 2, H = s.h;
  const wall = s.wall || pick(c.style.walls, c.seed), rc = s.roof || pick(c.style.roofs, c.seed >>> 3);
  const inner = s.inner || '#efe2cc', kind = s.roofKind || 'gableX', rh = s.roofH ?? 12, t = .09;
  const cx = w >= 1.2 ? x + w * .4 : x, cy = d >= 1.2 ? y + d * .4 : y; // 잘라낼 조각: [cx..x+w] × [cy..y+d]
  const zr = (px, py) => roofZ(kind, x, y, w, d, H, rh, px, py);
  const busy = !!(c.on || c.inside);
  // 1. 바닥판(케이크 받침)
  box(g, x - .05, y - .05, w + .1, d + .1, 2.5, 0, shade(wall, -.2), { top: s.floor || '#c99c6c' });
  g.save(); g.translate(0, -2.5);
  // 2. 안쪽 뒷벽 + 바닥 무늬
  poly(g, [iso(x, y, 0), iso(x + w, y, 0), iso(x + w, y, H), iso(x, y, H)], inner);
  poly(g, [iso(x, y, 0), iso(x, y + d, 0), iso(x, y + d, H), iso(x, y, H)], shade(inner, -.12));
  poly(g, [iso(x, y, 0), iso(x + w, y, 0), iso(x + w, y, 2), iso(x, y, 2)], shade(inner, -.25));
  poly(g, [iso(x, y, 0), iso(x, y + d, 0), iso(x, y + d, 2), iso(x, y, 2)], shade(inner, -.3));
  for (let i = 1; i < 6; i++) line(g, iso(x, y + d * i / 6), iso(x + w, y + d * i / 6), 'rgba(90,60,30,.12)', .5);
  // 3. 안쪽 살림 + 사람
  if (s.interior) s.interior(c, x, y, w, d, H);
  if (c.inside) c.inside(x, y, w, d, s.spots || [[.7, .7]]);
  if (!busy) poly(g, [iso(x, y + d), iso(x + w, y + d), iso(x + w, y), iso(x + w, y, H), iso(x, y, H), iso(x, y + d, H)], c.night > .45 ? 'rgba(10,15,40,.35)' : 'rgba(30,30,50,.16)');
  else if (c.lights) c.lights.push({ x: iso(x + w * .55, y + d * .55, 10)[0], y: iso(x + w * .55, y + d * .55, 10)[1], r: 34, color: 'rgba(255,214,140,.35)' });
  // 4. 남은 바깥벽 (잘린 끝은 크림색 단면)
  const door = cx - x >= .5 ? 'L' : 'R';
  if (cx > x + .01) {
    box(g, x, y + d - t, cx - x, t, H, 0, wall, { right: CUT, top: CUT });
    const span = cx - x, n = Math.max(1, Math.round(span * 1.6));
    for (const [v0, v1] of s.rows || [[H * .42, H * .42 + 6]]) for (let i = 0; i < n; i++) { const u = span * (i + .5) / n; if (door === 'L' && v0 < 10 && Math.abs(u - span / 2) < .25) continue; win(c, faceL(x, y + d - t, t, 0, u - .13, u + .13, v0, v1), busy); }
    if (door === 'L') doorOn(c, 'L', x, y + d - t, span, t, s.doorColor);
  }
  if (cy > y + .01) {
    box(g, x + w - t, y, t, cy - y, H, 0, wall, { left: CUT, top: CUT, right: shade(wall, -.16) });
    const span = cy - y, n = Math.max(1, Math.round(span * 1.6));
    for (const [v0, v1] of s.rows || [[H * .42, H * .42 + 6]]) for (let i = 0; i < n; i++) { const u = span * (i + .5) / n; if (door === 'R' && v0 < 10 && Math.abs(u - span / 2) < .2) continue; win(c, faceR(x + w - t, y, t, 0, u - .12, u + .12, v0, v1), busy); }
    if (door === 'R') doorOn(c, 'R', x + w - t, y, t, span, s.doorColor);
  }
  if (s.decor) s.decor(c, x, y, w, d, H, wall, rc, cx, cy);
  // 5. 천장 · 다락 · 지붕 — 뒤쪽 덩어리 먼저, 그다음 왼쪽 덩어리
  const sectionX = (a0, a1) => { // y=cy 평면을 자른 면
    profileFace(g, 'x', cy, a0, a1, H, (a) => zr(a, cy), ATTIC, CUT_EDGE);
    poly(g, [iso(a0, cy, H), iso(a1, cy, H), iso(a1, cy, H + 2.5), iso(a0, cy, H + 2.5)], CEIL);
    const top = []; for (let i = 0; i <= 10; i++) { const a = lerp(a0, a1, i / 10); top.push(iso(a, cy, zr(a, cy))); }
    g.lineJoin = 'round'; g.strokeStyle = shade(rc, -.1); g.lineWidth = 3; g.beginPath(); top.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 1.2) : g.moveTo(p[0], p[1] + 1.2))); g.stroke();
  };
  const sectionY = (a0, a1) => { // x=cx 평면을 자른 면
    profileFace(g, 'y', cx, a0, a1, H, (a) => zr(cx, a), shade(ATTIC, -.05), CUT_EDGE);
    poly(g, [iso(cx, a0, H), iso(cx, a1, H), iso(cx, a1, H + 2.5), iso(cx, a0, H + 2.5)], shade(CEIL, -.06));
    const top = []; for (let i = 0; i <= 10; i++) { const a = lerp(a0, a1, i / 10); top.push(iso(cx, a, zr(cx, a))); }
    g.lineJoin = 'round'; g.strokeStyle = shade(rc, -.2); g.lineWidth = 3; g.beginPath(); top.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 1.2) : g.moveTo(p[0], p[1] + 1.2))); g.stroke();
  };
  if (cy > y + .01) { // 뒤쪽 덩어리 [x..x+w] × [y..cy]
    profileFace(g, 'y', x + w, y, cy, H, (a) => zr(x + w, a), shade(wall, -.16));
    roofCells(g, x, y, x + w, cy, zr, rc);
    sectionX(cx, x + w);
  }
  if (cx > x + .01) { // 왼쪽 덩어리 [x..cx] × [cy..y+d]
    profileFace(g, 'x', y + d, x, cx, H, (a) => zr(a, y + d), wall);
    roofCells(g, x, cy, cx, y + d, zr, rc);
    sectionY(cy, y + d);
  }
  if (s.top) s.top(c, x, y, w, d, H, wall, rc, zr);
  g.restore();
  // 6. 바닥판 앞쪽 단면 띠
  poly(g, [iso(cx, y + d + .05, 0), iso(x + w + .05, y + d + .05, 0), iso(x + w + .05, y + d + .05, 2.5), iso(cx, y + d + .05, 2.5)], shade(CUT, -.06), CUT_EDGE, .6);
  poly(g, [iso(x + w + .05, cy, 0), iso(x + w + .05, y + d + .05, 0), iso(x + w + .05, y + d + .05, 2.5), iso(x + w + .05, cy, 2.5)], shade(CUT, -.14), CUT_EDGE, .6);
  if (s.always) s.always(c, x, y, w, d, H, wall, rc);
}

def('library', { name: '도서관', group: 'core', role: 'library', size: [2, 2], desc: 'Read — 파일을 읽어요',
  draw(c) {
    const grand = c.grand;
    drawCake(c, { h: grand ? 28 : 24, roofKind: 'hip', roofH: grand ? 18 : 14, roof: grand ? '#6f86b0' : undefined, rows: [[9, 17]], floor: '#b98a5c', inner: '#efe2cc',
      decor: grand ? (c, x, y, w, d, h, wall, rc, cx) => { for (let i = 0; i < 3; i++) { const u = .1 + i * .3; if (u + .1 < cx - x) poly(c.g, faceL(x, y, d, 0, u, u + .08, 2, h), shade(wall, .25)); } } : null,
      interior(c, x, y, w, d, h) {
        shelf(c, x, y, w, d, h * .78, 'x'); shelf(c, x, y, w, d, h * .78, 'y');
        fbox(c, x, y, w * .5, d * .5, w * .38, d * .28, 6, 0, '#9a6b45'); // 책상
        poly(c.g, [iso(x + w * .55, y + d * .55, 6.2), iso(x + w * .7, y + d * .55, 6.2), iso(x + w * .7, y + d * .68, 6.2), iso(x + w * .55, y + d * .68, 6.2)], '#fff');
        const [lx, ly] = iso(x + w * .8, y + d * .58, 9); line(c.g, [lx, ly + 3], [lx, ly - 3], '#5d5a55', .8); circle(c.g, lx, ly - 4, 2.2, c.on ? '#ffe08a' : '#e8d9b8');
        if (c.on && c.lights) c.lights.push({ x: lx, y: ly - 4, r: 18, color: 'rgba(255,220,130,.6)' });
        if (c.on) for (let i = 0; i < 3; i++) { const p = (c.t / 1800 + i / 3) % 1, [bx, by] = iso(x + w * (.55 + i * .12), y + d * .45, 12 + p * 16); c.g.save(); c.g.globalAlpha *= 1 - p; c.g.fillStyle = SPINES[i * 3]; c.g.fillRect(bx - 2.5, by - 1.5, 5, 3); c.g.restore(); }
      },
      spots: [[.62, .82, 'read'], [.88, .55, 'read'], [.5, .48, 'stand'], [.82, .85, 'read']] });
  } });

def('workshop', { name: '공방', group: 'core', role: 'workshop', size: [2, 2], desc: 'Edit — 파일을 고쳐요',
  draw(c) {
    drawCake(c, { h: c.grand ? 24 : 21, roofKind: 'gableX', roofH: c.grand ? 15 : 12, rows: [[8, 14]], floor: '#c79a6a', inner: '#f0dfc6',
      top: (c, x, y, w, d, h, wall, rc, zr) => box(c.g, x + w * .75, y + d * .15, .2, .2, 14, zr(x + w * .85, y + d * .25) - 3, '#8e6a52'),
      decor: (c, x, y, w, d) => { const [sx, sy] = iso(x + w, y + d * .22, 15); c.g.fillStyle = '#6a4428'; c.g.fillRect(sx - 1, sy - 4, 9, 6); circle(c.g, sx + 3.5, sy - 1, 1.6, '#f2d24b'); },
      interior(c, x, y, w, d) {
        const g = c.g;
        poly(g, [iso(x + w * .45, y + .02, 6), iso(x + w * .95, y + .02, 6), iso(x + w * .95, y + .02, 17), iso(x + w * .45, y + .02, 17)], '#a07a52'); // 공구판
        for (let i = 0; i < 5; i++) { const [tx, ty] = iso(x + w * (.5 + i * .09), y + .03, 15); g.fillStyle = '#5d5a55'; g.fillRect(tx, ty, 1, 5); }
        poly(g, [iso(x + .02, y + d * .2, 8), iso(x + .02, y + d * .55, 8), iso(x + .02, y + d * .55, 17), iso(x + .02, y + d * .2, 17)], '#dbe9f6'); // 설계도
        for (let i = 0; i < 4; i++) line(g, iso(x + .02, y + d * .25, 10 + i * 1.8), iso(x + .02, y + d * .5, 10 + i * 1.8), '#7aa0c8', .5);
        fbox(c, x, y, w * .5, d * .45, w * .36, d * .26, 7, 0, '#9a6b45'); // 작업대
        const n = 1 + ((c.t / 900) | 0) % 4;
        for (let i = 0; i < n; i++) fbox(c, x, y, w * .55 + (i % 2) * .16, d * .5, .14, .14, 3, 7 + Math.floor(i / 2) * 3, SPINES[i + 1]);
        if (c.on && ((c.t / 120) | 0) % 3 === 0) { const [sx, sy] = iso(x + w * .65, y + d * .6, 12); for (let i = 0; i < 4; i++) circle(g, sx + Math.cos(i * 1.6) * 4, sy + Math.sin(i * 1.6) * 3, .8, '#ffe27a'); }
      },
      spots: [[.72, .82, 'hammer'], [.9, .6, 'hammer'], [.55, .85, 'work'], [.88, .85, 'work']] });
  } });

def('factory', { name: '공장', group: 'core', role: 'factory', size: [2, 2], desc: 'Bash — 명령을 돌려요',
  draw(c) {
    const grand = c.grand;
    drawCake(c, { h: 20, roofKind: 'gableX', roofH: 8, wall: '#c3c8d0', roof: '#7c8491', rows: [[6, 12]], floor: '#9aa0a8', inner: '#d6d9de', doorColor: '#59606b',
      always(c, x, y, w, d) {
        const g = c.g;
        for (let k = 0; k < (grand ? 2 : 1); k++) {
          const cx = x + w * (.86 - k * .2), cy = y + .14;
          cylinder(g, cx, cy, .14, 46 + k * 6, 0, '#b8653e', '#7a3e22');
          const [sx, sy] = iso(cx, cy, 48 + k * 6);
          if (c.on || c.boom) for (let i = 0; i < 5; i++) puff(g, c.t, sx, sy, i + k, c.boom ? 'rgba(60,55,55,.75)' : 'rgba(255,255,255,.85)', c.boom ? 900 : 2200);
        }
        if (c.boom) { const [ex, ey] = iso(x + w * .7, y + d * .7, 14); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 4 + ((c.t / 40) % 14); g.globalAlpha = clamp(1 - r / 20, 0, 1); circle(g, ex + Math.cos(a) * r, ey + Math.sin(a) * r * .7, 1.8, i % 2 ? '#ff6a3d' : '#ffd23d'); } g.globalAlpha = 1; if (c.lights) c.lights.push({ x: ex, y: ey, r: 30, color: 'rgba(255,120,40,.7)' }); }
      },
      interior(c, x, y, w, d) {
        const g = c.g;
        const scr = [iso(x + w * .45, y + .02, 7), iso(x + w * .92, y + .02, 7), iso(x + w * .92, y + .02, 17), iso(x + w * .45, y + .02, 17)];
        poly(g, scr, '#1d2a33'); // 뒷벽 모니터 = 명령 출력
        for (let i = 0; i < 4; i++) { const len = .08 + ((hash(i + ((c.t / 400) | 0)) % 100) / 100) * .3; line(g, iso(x + w * .48, y + .03, 15 - i * 2), iso(x + w * (.48 + len), y + .03, 15 - i * 2), c.on ? '#7cf0a0' : '#3f6a52', .8); }
        if (c.on && c.lights) c.lights.push({ pts: scr, color: 'rgba(120,240,160,.3)' });
        fbox(c, x, y, .08, d * .3, .45, .45, 12, 0, '#7c8491'); // 기계
        fbox(c, x, y, .2, d * .3 + .12, .2, .2, 4, 12 + (c.on ? Math.abs(Math.sin(c.t / 200)) * 5 : 0), '#d0a040');
        fbox(c, x, y, w * .35, d * .62, w * .6, .24, 4, 0, '#4a5160', { top: '#3a3f4a' }); // 컨베이어
        for (let i = 0; i < 3; i++) { const u = ((c.on ? c.t / 2200 : 0) + i / 3) % 1; fbox(c, x, y, w * (.37 + u * .5), d * .64, .16, .16, 3.5, 4, '#c79a5a'); }
      },
      spots: [[.68, .45, 'type'], [.6, .86, 'work'], [.9, .8, 'work']] });
  } });

def('hall', { name: '마을회관', group: 'core', role: 'hall', size: [2, 2], desc: '계획 · 서브에이전트에게 일 나누기',
  draw(c) {
    drawCake(c, { h: c.grand ? 28 : 25, roofKind: 'gableX', roofH: 13, rows: [[10, 18]], floor: '#b7875a', inner: '#f3eadb',
      decor: (c, x, y, w, d, h, wall, rc, cx) => { for (let i = 0; i < 3; i++) { const u = .06 + i * .25; if (u + .08 < cx - x) poly(c.g, faceL(x, y, d, 0, u, u + .07, 3, h - 2), shade(wall, .3)); } },
      top(c, x, y, w, d, h, wall, rc, zr) {
        const g = c.g, tx = x + w * .12, ty = y + d * .12, tz = zr(tx + .25, ty + .25) - 2;
        box(g, tx, ty, .48, .48, 12, tz, shade(wall, .05));
        const sw = c.ring ? Math.sin(c.t / 110) * .35 : 0, [bx, by] = iso(tx + .24, ty + .48, tz + 4);
        g.save(); g.translate(bx, by - 5); g.rotate(sw); poly(g, [[-2.6, 4], [2.6, 4], [1.6, 0], [-1.6, 0]], '#e2b33c'); circle(g, 0, 4.4, .9, '#a8801f'); g.restore();
        hip(g, tx, ty, .48, .48, tz + 12, 9, rc);
        if (c.ring) for (let i = 0; i < 2; i++) { const p = ((c.t / 800) + i / 2) % 1; g.globalAlpha = 1 - p; g.fillStyle = '#fff'; g.font = '700 9px sans-serif'; g.fillText('♪', bx + 8 + p * 8 - i * 22, by - 10 - p * 12); g.globalAlpha = 1; }
      },
      interior(c, x, y, w, d) {
        const g = c.g;
        const board = [iso(x + w * .45, y + .02, 8), iso(x + w * .95, y + .02, 8), iso(x + w * .95, y + .02, 19), iso(x + w * .45, y + .02, 19)];
        poly(g, board, '#b98a5a'); // 게시판: 할 일 = 핀
        const todos = Math.min(8, c.state?.todos ?? 3);
        for (let i = 0; i < todos; i++) { const u = .5 + (i % 4) * .11, v = 16 - Math.floor(i / 4) * 5; poly(g, [iso(x + w * u, y + .03, v - 3), iso(x + w * (u + .08), y + .03, v - 3), iso(x + w * (u + .08), y + .03, v), iso(x + w * u, y + .03, v)], '#fff7d6'); }
        fbox(c, x, y, w * .45, d * .5, w * .45, d * .24, 6, 0, '#8a5e3c'); // 탁자 + 지도
        poly(g, [iso(x + w * .5, y + d * .53, 6.1), iso(x + w * .85, y + d * .53, 6.1), iso(x + w * .85, y + d * .7, 6.1), iso(x + w * .5, y + d * .7, 6.1)], '#efe2b8');
        line(g, iso(x + w * .53, y + d * .6, 6.2), iso(x + w * .82, y + d * .56, 6.2), '#c0503e', .7);
      },
      spots: [[.65, .4, 'stand'], [.6, .85, 'sit'], [.8, .85, 'sit'], [.92, .62, 'stand'], [.45, .85, 'sit']] });
  } });

def('post', { name: '우체국', group: 'core', role: 'post', size: [1, 2], desc: 'MCP · 외부 도구와 연락해요',
  draw(c) {
    drawCake(c, { h: c.grand ? 21 : 17, roofKind: c.w >= c.d ? 'gableX' : 'gableY', roofH: 9, roof: '#d6584a', rows: [[6, 12]], floor: '#c9a477', inner: '#f6e6d6', doorColor: '#a8453a',
      top(c, x, y, w, d, h, wall, rc, zr) {
        const g = c.g, ax0 = x + w * .5, ay0 = y + d * .18, [ax, ay] = iso(ax0, ay0, zr(ax0, ay0));
        line(g, [ax, ay], [ax, ay - 16], '#6d6a66', 1); circle(g, ax, ay - 17, 1.6, c.on ? '#ff5d4f' : '#a8a29a');
        if (c.on) { for (let r = 1; r <= 3; r++) { const p = ((c.t / 900) + r / 3) % 1; g.globalAlpha = 1 - p; g.strokeStyle = 'rgba(255,190,80,.95)'; g.lineWidth = 1.2; g.beginPath(); g.arc(ax, ay - 17, 3 + p * 12, -2.6, -.5); g.stroke(); } g.globalAlpha = 1; }
      },
      always(c, x, y, w, d) {
        box(c.g, x + w + .05, y + d * .2, .16, .16, 7, 0, '#d84a3c');
        if (c.on) { const p = (c.t / 3000) % 1, [ax, ay] = iso(x + w / 2, y + d * .2, 30); const bx = ax + p * 110, by = ay - Math.sin(p * Math.PI) * 26; c.g.globalAlpha = 1 - p * .6; ellipse(c.g, bx, by, 3.2, 2, '#fff'); poly(c.g, [[bx - 1, by], [bx + 1, by - 3 - ((c.t / 140 | 0) % 2) * 2], [bx + 3, by]], '#e9e4dc'); c.g.globalAlpha = 1; }
      },
      interior(c, x, y, w, d) {
        const g = c.g, along = w >= d ? 'x' : 'y';
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { // 분류함
          const z = 6 + r * 4, col = (k + r) % 3 ? '#7a5434' : '#fff6e0';
          if (along === 'y') { const v = .1 + k * (d - .2) / 4; poly(g, [iso(x + .02, y + v, z), iso(x + .02, y + v + (d - .2) / 4 - .04, z), iso(x + .02, y + v + (d - .2) / 4 - .04, z + 3.4), iso(x + .02, y + v, z + 3.4)], col); }
          else { const u = .1 + k * (w - .2) / 4; poly(g, [iso(x + u, y + .02, z), iso(x + u + (w - .2) / 4 - .04, y + .02, z), iso(x + u + (w - .2) / 4 - .04, y + .02, z + 3.4), iso(x + u, y + .02, z + 3.4)], col); }
        }
        fbox(c, x, y, w * .4, d * .55, w * .5, d * .2, 6, 0, '#a8453a'); // 창구
        if (c.on) for (let i = 0; i < 3; i++) { const p = (c.t / 1300 + i / 3) % 1, [lx, ly] = iso(x + w * .5, y + d * (.45 + p * .4), 8 + Math.sin(p * Math.PI) * 10); g.fillStyle = '#fff'; g.fillRect(lx - 2, ly - 1.4, 4, 2.8); }
      },
      spots: [[.6, .88, 'work'], [.4, .5, 'stand']] });
  } });

def('inn', { name: '여관', group: 'core', role: 'inn', size: [2, 2], desc: '쉬는 중 — 촌장이 자요',
  draw(c) {
    drawCake(c, { h: 18, roofKind: 'gableX', roofH: 12, wall: '#d6a473', roof: '#9a5b3a', rows: [[6, 12]], floor: '#b07a4e', inner: '#e9c79e', doorColor: '#6a4428',
      decor: (c, x, y, w, d, h, wall, rc, cx, cy) => { for (let i = 0; i < 4; i++) poly(c.g, faceL(x, y, d, 0, 0, cx - x, i * 4.5 + 1, i * 4.5 + 1.3), 'rgba(110,70,40,.25)'); const [sx, sy] = iso(x + w, y + (cy - y) * .5, 12); c.g.fillStyle = '#6a4428'; c.g.fillRect(sx, sy - 3, 10, 6); c.g.fillStyle = '#f6e4c0'; c.g.font = '700 4.5px sans-serif'; c.g.fillText('INN', sx + 1.3, sy + 1.6); },
      top: (c, x, y, w, d, h, wall, rc, zr) => box(c.g, x + w * .7, y + d * .12, .2, .2, 14, zr(x + w * .8, y + d * .22) - 3, '#8e6a52'),
      always(c, x, y, w, d, h) { const [cx, cy] = iso(x + w * .8, y + d * .22, h + 26); puff(c.g, c.t, cx, cy, 0, 'rgba(255,255,255,.5)', 3000); },
      interior(c, x, y, w, d) {
        const g = c.g;
        fbox(c, x, y, w * .55, .02, .5, .22, 12, 0, '#9a8a7a'); // 벽난로
        const fl = 1 + Math.sin(c.t / 120) * .3, [fx, fy] = iso(x + w * .55 + .25, y + .26, 3);
        circle(g, fx, fy, 2.4 * fl, '#ff9a3a'); circle(g, fx, fy - 1, 1.3 * fl, '#ffe27a');
        if (c.lights) c.lights.push({ x: fx, y: fy, r: 22, color: 'rgba(255,150,60,.5)' });
        poly(g, [iso(x + w * .45, y + d * .45), iso(x + w * .95, y + d * .45), iso(x + w * .95, y + d * .95), iso(x + w * .45, y + d * .95)], '#c25d4a'); // 깔개
        for (let i = 0; i < 2; i++) { const bx = w * (.5 + i * .25); fbox(c, x, y, bx, d * .5, .36, .55, 4, 0, '#8a5e3c'); fbox(c, x, y, bx, d * .5, .36, .14, 5.5, 0, '#f4efe4'); fbox(c, x, y, bx, d * .64, .36, .4, 1, 4, i ? '#5b7fb5' : '#c0503e'); }
      },
      spots: [[.58, .62, 'sleep'], [.83, .62, 'sleep'], [.6, .9, 'sit']] });
  } });

// ━━ 특색 건물 (마을 스타일마다) ━━
const simple = (id, name, tags, o) => def(id, { name, group: 'extra', size: o.size || [2, 2], tags, desc: o.desc || '', draw(c) { drawBuilding(c, o.spec(c)); if (o.after) o.after(c); } });

simple('academy', '아카데미', ['scholar'], { desc: '학생들이 다니는 학교', spec: () => ({ h: 28, roofKind: 'gableY', roofH: 14, rows: [[8, 14], [17, 23]], bands: 2,
  top: (c, x, y, w, d, h, wall, rc) => { const [cx, cy] = iso(x + w / 2, y + d, h + 6); circle(c.g, cx, cy, 3.5, '#fff8e8'); line(c.g, [cx, cy], [cx + Math.cos(c.t / 4000) * 2.4, cy + Math.sin(c.t / 4000) * 2.4], '#333', .7); line(c.g, [cx, cy], [cx, cy - 2.6], '#333', .7); } }) });
simple('observatory', '천문대', ['scholar', 'miner'], { desc: '돔이 천천히 돌아요', spec: () => ({ h: 16, roofKind: null, rows: [[6, 11]], wall: '#e9e4dc',
  top: (c, x, y, w, d, h) => { dome(c.g, x + w / 2, y + d / 2, .75, h, '#b9c3cf'); const a = c.t / 3000; const [cx, cy] = iso(x + w / 2, y + d / 2, h + 10); c.g.save(); c.g.translate(cx, cy); c.g.rotate(Math.sin(a) * .5 - .6); c.g.fillStyle = '#4a5160'; c.g.fillRect(-1.5, -12, 3, 13); c.g.restore(); } }) });
simple('archive', '기록탑', ['scholar'], { desc: '오래된 문서를 모아둔 탑', spec: () => ({ h: 2, roofKind: null, door: false, rows: [], plinth: true,
  always: (c, x, y, w, d) => { cylinder(c.g, x + w / 2, y + d / 2, .55, 40, 0, '#e3d8c6'); for (let i = 0; i < 3; i++) { const [wx, wy] = iso(x + w / 2 + .4, y + d / 2 + .4, 12 + i * 10); win(c, [[wx - 2, wy], [wx + 2, wy - 1], [wx + 2, wy + 5], [wx - 2, wy + 6]], c.on); } cone(c.g, x + w / 2, y + d / 2, .65, 18, 40, pick(c.style.roofs, c.seed)); } }) });
simple('sawmill', '제재소', ['artisan'], { desc: '통나무가 쌓여 있어요', spec: () => ({ h: 15, roofKind: 'gableX', roofH: 9, wall: '#c99a6b', rows: [[5, 10]] }),
  after: (c) => { for (let i = 0; i < 3; i++) cylinderLog(c, c.x + 1.65, c.y + .3 + i * .45, i); } });
simple('forge', '대장간', ['artisan'], { desc: '화덕 불빛이 새어나와요', spec: () => ({ h: 16, roofKind: 'gableY', roofH: 10, wall: '#b8aa98', rows: [[5, 11]],
  always: (c, x, y, w, d, h) => { cylinder(c.g, x + w * .75, y + d * .2, .16, 34, 0, '#6d5a4c'); const [sx, sy] = iso(x + w * .75, y + d * .2, 35); for (let i = 0; i < 4; i++) puff(c.g, c.t, sx, sy, i, 'rgba(90,80,80,.5)', 2600); const [fx, fy] = iso(x + w, y + d * .55, 5); circle(c.g, fx, fy, 2.4 + Math.sin(c.t / 100) * .4, '#ff8a3a'); if (c.lights) c.lights.push({ x: fx, y: fy, r: 16, color: 'rgba(255,130,50,.6)' }); } }) });
simple('windmill', '풍차', ['artisan'], { desc: '날개가 돌아요', spec: () => ({ h: 2, roofKind: null, door: false, rows: [],
  always: (c, x, y, w, d) => { cylinder(c.g, x + w / 2, y + d / 2, .5, 36, 0, '#efe6d6'); cone(c.g, x + w / 2, y + d / 2, .58, 14, 36, '#a0522d'); const [hx, hy] = iso(x + w / 2 + .45, y + d / 2 + .45, 34); const a = c.t / 900; for (let k = 0; k < 4; k++) { const an = a + k * Math.PI / 2; c.g.save(); c.g.translate(hx, hy); c.g.rotate(an); c.g.fillStyle = '#f6efe2'; c.g.fillRect(-1.5, 2, 3, 18); c.g.strokeStyle = '#8a6a4a'; c.g.lineWidth = .5; c.g.strokeRect(-1.5, 2, 3, 18); c.g.restore(); } circle(c.g, hx, hy, 1.8, '#6a4428'); } }) });
simple('refinery', '정유 탱크', ['industrial'], { desc: '탱크와 파이프', spec: () => ({ h: 2, roofKind: null, door: false, rows: [],
  always: (c, x, y, w, d) => { cylinder(c.g, x + .55, y + .55, .42, 24, 0, '#d9dde2'); cylinder(c.g, x + 1.35, y + 1.25, .38, 20, 0, '#c9cfd6'); box(c.g, x + .5, y + 1.1, .9, .08, 3, 14, '#8a8f99'); box(c.g, x + 1.1, y + .4, .08, .8, 3, 12, '#8a8f99'); const [lx, ly] = iso(x + .55, y + .55, 26); circle(c.g, lx, ly, 1, (c.t / 600 | 0) % 2 ? '#ff4a3a' : '#7a2a22'); } }) });
simple('watertower', '급수탑', ['industrial'], { desc: '다리 달린 물탱크', spec: () => ({ h: 2, roofKind: null, door: false, rows: [],
  always: (c, x, y, w, d) => { for (const [u, v] of [[.4, .4], [1.4, .4], [.4, 1.4], [1.4, 1.4]]) box(c.g, x + u, y + v, .08, .08, 26, 0, '#7a6a5a'); cylinder(c.g, x + .95, y + .95, .62, 18, 26, '#8fb0c8'); cone(c.g, x + .95, y + .95, .66, 8, 44, '#5d6672'); } }) });
simple('powerplant', '발전소', ['industrial'], { desc: '냉각탑에서 김이 나요', spec: () => ({ h: 2, roofKind: null, door: false, rows: [],
  always: (c, x, y, w, d) => { const [cx, cy] = iso(x + w / 2, y + d / 2, 0), rx = 22; const gr = c.g.createLinearGradient(cx - rx, 0, cx + rx, 0); gr.addColorStop(0, '#e6e8ea'); gr.addColorStop(1, '#a8adb4'); c.g.fillStyle = gr; c.g.beginPath(); c.g.moveTo(cx - rx, cy); c.g.quadraticCurveTo(cx - rx * .55, cy - 22, cx - rx * .7, cy - 40); c.g.lineTo(cx + rx * .7, cy - 40); c.g.quadraticCurveTo(cx + rx * .55, cy - 22, cx + rx, cy); c.g.closePath(); c.g.fill(); ellipse(c.g, cx, cy - 40, rx * .7, 5, '#8c9198'); for (let i = 0; i < 5; i++) puff(c.g, c.t, cx - 4, cy - 44, i, 'rgba(255,255,255,.9)', 3000); } }) });
simple('market', '시장', ['harbor'], { desc: '천막 가판대', spec: () => ({ h: 2, roofKind: null, door: false, rows: [], plinth: false,
  always: (c, x, y, w, d) => { for (let i = 0; i < 3; i++) { const sx = x + .15 + (i % 2) * .95, sy = y + .15 + Math.floor(i / 2) * .95 + (i === 2 ? 0 : 0); box(c.g, sx, sy, .7, .5, 5, 0, '#a07448'); const col = ['#e0607e', '#3f7fc0', '#e6b030'][i]; poly(c.g, [iso(sx - .05, sy + .55, 12), iso(sx + .75, sy + .55, 12), iso(sx + .75, sy - .05, 15), iso(sx - .05, sy - .05, 15)], col); for (let k = 0; k < 4; k++) { const [fx, fy] = iso(sx + .1 + k * .15, sy + .25, 6); circle(c.g, fx, fy, 1.4, SPINES[(k + i * 2) % 9]); } } } }) });
simple('boathouse', '보트하우스', ['harbor'], { desc: '배를 고치는 창고', spec: () => ({ h: 14, roofKind: 'gableY', roofH: 12, wall: '#7fa7c4', rows: [[5, 9]], wallOpt: { left: '#7fa7c4', right: '#6a90ad' } }) });
simple('fishery', '어시장', ['harbor'], { desc: '생선 말리는 줄', spec: () => ({ h: 13, roofKind: 'gableX', roofH: 8, rows: [[5, 9]],
  always: (c, x, y, w, d) => { const a = iso(x + .1, y + d + .3, 10), b = iso(x + w, y + d + .3, 10); line(c.g, a, b, '#6a5a4a', .6); for (let i = 1; i < 6; i++) { const p = [lerp(a[0], b[0], i / 6), lerp(a[1], b[1], i / 6) + 2]; ellipse(c.g, p[0], p[1] + 2, 1.2, 2.6, '#9fb4c4'); } } }) });
simple('radiotower', '전파탑', ['courier'], { desc: '빨간 불이 깜빡여요', spec: () => ({ h: 10, roofKind: 'flat', rows: [[3, 7]],
  always: (c, x, y, w, d, h) => { const b = iso(x + w / 2, y + d / 2, h), t = iso(x + w / 2, y + d / 2, h + 50); line(c.g, [b[0] - 6, b[1]], t, '#b8403a', 1); line(c.g, [b[0] + 6, b[1]], t, '#b8403a', 1); for (let i = 1; i < 6; i++) { const yy = lerp(b[1], t[1], i / 6), half = 6 * (1 - i / 6); line(c.g, [t[0] - half, yy], [t[0] + half, yy], '#d0d4d8', .6); } circle(c.g, t[0], t[1], 1.6, (c.t / 500 | 0) % 2 ? '#ff4a3a' : '#7a2a22'); if (c.lights && (c.t / 500 | 0) % 2) c.lights.push({ x: t[0], y: t[1], r: 8, color: 'rgba(255,80,60,.7)' }); } }) });
simple('pigeonloft', '비둘기장', ['courier'], { desc: '전령 비둘기들의 집', spec: () => ({ h: 2, roofKind: null, door: false, rows: [],
  always: (c, x, y, w, d) => { box(c.g, x + .85, y + .85, .1, .1, 18, 0, '#7a5a3c'); box(c.g, x + .55, y + .55, .7, .7, 10, 18, '#efe2c8'); hip(c.g, x + .55, y + .55, .7, .7, 28, 8, pick(c.style.roofs, c.seed)); for (let i = 0; i < 3; i++) { const a = c.t / 1400 + i * 2.1, [px, py] = iso(x + .9 + Math.cos(a) * 1.1, y + .9 + Math.sin(a) * 1.1, 40 + Math.sin(a * 2) * 4); ellipse(c.g, px, py, 2.2, 1.2, '#fff'); poly(c.g, [[px - 1, py], [px + .5, py - 2 - ((c.t / 130 + i) | 0) % 2 * 1.5], [px + 2, py]], '#e3e3e3'); } } }) });
simple('hangar', '비행선 격납고', ['courier'], { desc: '둥근 지붕 창고', spec: () => ({ h: 8, roofKind: null, rows: [], door: false,
  always: (c, x, y, w, d, h) => { const g = c.g; for (let i = 0; i < 9; i++) { const v = i / 8; poly(g, [iso(x, y + v * d, h + Math.sin(v * Math.PI) * 14), iso(x + w, y + v * d, h + Math.sin(v * Math.PI) * 14), iso(x + w, y + Math.min(1, v + 1 / 8) * d, h + Math.sin(Math.min(1, v + 1 / 8) * Math.PI) * 14), iso(x, y + Math.min(1, v + 1 / 8) * d, h + Math.sin(Math.min(1, v + 1 / 8) * Math.PI) * 14)], shade('#9fb0be', -v * .25)); } poly(g, faceL(x, y, d, 0, w * .25, w * .75, 0, h + 8), '#4a5160'); } }) });
simple('mine', '광산 입구', ['miner'], { desc: '광차가 들락날락', spec: () => ({ h: 2, roofKind: null, door: false, rows: [], plinth: false,
  always: (c, x, y, w, d) => { const g = c.g; poly(g, [iso(x, y + d), iso(x + w, y + d), iso(x + w, y), iso(x + w * .5, y + d * .2, 30), iso(x + w * .15, y + d * .5, 26)], '#9a8a78'); poly(g, [iso(x + w, y + d), iso(x + w, y), iso(x + w * .5, y + d * .2, 30)], '#7d6e5e'); poly(g, faceL(x, y, d - .05, 0, w * .35, w * .7, 0, 11), '#2a2622'); box(g, x + w * .33, y + d - .1, .05, .1, 12, 0, '#7a5a3c'); box(g, x + w * .7, y + d - .1, .05, .1, 12, 0, '#7a5a3c'); box(g, x + w * .33, y + d - .1, w * .42, .1, 1.5, 12, '#7a5a3c'); const p = (Math.sin(c.t / 1500) + 1) / 2; box(g, x + w * .4, y + d + .1 + p * .5, .3, .25, 4, 0, '#6c7380'); for (let i = 0; i < 3; i++) { const [ox, oy] = iso(x + w * .45 + i * .06, y + d + .2 + p * .5, 5); circle(g, ox, oy, 1.2, ['#e3c35a', '#9fd0e8', '#c0503e'][i]); } } }) });
simple('drillrig', '시추탑', ['miner'], { desc: '위아래로 쿵쿵', spec: () => ({ h: 6, roofKind: 'flat', rows: [],
  always: (c, x, y, w, d, h) => { const b = iso(x + w / 2, y + d / 2, h), t = iso(x + w / 2, y + d / 2, h + 40); line(c.g, [b[0] - 8, b[1]], t, '#6c7380', 1.2); line(c.g, [b[0] + 8, b[1]], t, '#6c7380', 1.2); const p = Math.abs(Math.sin(c.t / 400)) * 10; c.g.fillStyle = '#e0a03a'; c.g.fillRect(t[0] - 2.5, t[1] + 8 + p, 5, 6); } }) });
simple('silo', '저장고', ['miner', 'artisan'], { desc: '곡식/광석 저장', spec: () => ({ h: 2, roofKind: null, door: false, rows: [],
  always: (c, x, y, w, d) => { cylinder(c.g, x + .7, y + .7, .45, 30, 0, '#d8d0c2'); dome(c.g, x + .7, y + .7, .45, 30, '#b8653e'); cylinder(c.g, x + 1.4, y + 1.35, .32, 22, 0, '#cfc7b8'); dome(c.g, x + 1.4, y + 1.35, .32, 22, '#8a6a4a'); } }) });
simple('clocktower', '시계탑', ['courier', 'scholar'], { size: [1, 1], desc: '시간이 흘러요', spec: () => ({ h: 34, roofKind: 'hip', roofH: 12, rows: [], inset: .2,
  decor: (c, x, y, w, d, h) => { const [cx, cy] = iso(x + w / 2, y + d, h - 7); circle(c.g, cx, cy, 3.2, '#fff8e8'); line(c.g, [cx, cy], [cx + Math.cos(c.t / 3000) * 2.4, cy + Math.sin(c.t / 3000) * 2.4], '#333', .7); } }) });
simple('cafe', '카페', ['artisan', 'harbor', 'scholar'], { size: [1, 1], desc: '줄무늬 차양', spec: () => ({ h: 14, roofKind: 'flat', rows: [[5, 10]], inset: .15,
  decor: (c, x, y, w, d) => { for (let i = 0; i < 5; i++) poly(c.g, [iso(x + i * w / 5, y + d + .25, 9), iso(x + (i + 1) * w / 5, y + d + .25, 9), iso(x + (i + 1) * w / 5, y + d, 13), iso(x + i * w / 5, y + d, 13)], i % 2 ? '#fff' : '#d0603f'); } }) });

function cylinderLog(c, x, y, i) { const g = c.g, [a0, b0] = iso(x, y, 3 + (i % 2) * 3), [a1, b1] = iso(x + .9, y, 3 + (i % 2) * 3); g.strokeStyle = '#8a5e3c'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(a0, b0); g.lineTo(a1, b1); g.stroke(); g.lineCap = 'butt'; circle(g, a1, b1, 2.5, '#d9b07a'); }

// ━━ 전망대 (WebSearch/WebFetch 가 일어나는 곳) ━━
const lookout = (id, name, tags, draw) => def(id, { name, group: 'lookout', role: 'lookout', size: [1, 1], tags, desc: '웹 탐색 — 멀리 내다봐요', draw });
lookout('lighthouse', '등대', ['harbor'], (c) => { const g = c.g, x = c.x + .5, y = c.y + .5; cylinder(g, x, y, .3, 38, 0, '#f4f1ea'); for (let i = 0; i < 3; i++) { const [a, b] = iso(x, y, 8 + i * 11); g.fillStyle = '#d0503e'; g.fillRect(a - 6.5, b - 3, 13, 4); } box(g, x - .22, y - .22, .44, .44, 7, 38, '#3a4250', { top: '#ffe9a0' }); cone(g, x, y, .3, 8, 45, '#d0503e');
  const [lx, ly] = iso(x, y, 42); if (c.on || c.night > .4) { const a = c.t / 900; g.save(); g.globalAlpha = .35; g.fillStyle = '#fff3b0'; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 70, a, a + .35); g.closePath(); g.fill(); g.restore(); if (c.lights) c.lights.push({ x: lx, y: ly, r: 14, color: 'rgba(255,240,170,.8)' }); } });
lookout('telescope', '망원경 탑', ['scholar'], (c) => { const g = c.g, x = c.x + .2, y = c.y + .2; box(g, x, y, .6, .6, 24, 0, '#d9cfbf'); box(g, x - .05, y - .05, .7, .7, 2, 24, '#b8ab98'); const [tx, ty] = iso(x + .3, y + .3, 26), a = c.on ? Math.sin(c.t / 1500) * .4 - .7 : -.6; g.save(); g.translate(tx, ty); g.rotate(a); g.fillStyle = '#4a5a7a'; rr(g, -1.5, -2, 14, 4, 2); g.fillStyle = '#c9a24a'; g.fillRect(10, -2.2, 2, 4.4); g.restore(); });
lookout('watchtower', '망루', ['artisan'], (c) => { const g = c.g, x = c.x + .25, y = c.y + .25; for (const [u, v] of [[0, 0], [.5, 0], [0, .5], [.5, .5]]) box(g, x + u, y + v, .07, .07, 26, 0, '#8a6240'); box(g, x - .05, y - .05, .64, .64, 2, 26, '#a07448'); box(g, x - .05, y + .55, .64, .04, 5, 28, '#8a6240'); box(g, x + .55, y - .05, .04, .64, 5, 28, '#8a6240'); gableX(g, x - .05, y - .05, .64, .64, 37, 7, '#c0503e', '#a07448'); });
lookout('waterlook', '감시탑', ['industrial'], (c) => { const g = c.g, x = c.x + .5, y = c.y + .5; cylinder(g, x, y, .12, 30, 0, '#8a8f99'); box(g, x - .3, y - .3, .6, .6, 8, 30, '#c3c8d0'); win(c, faceL(x - .3, y - .3, .6, 30, .1, .5, 2, 6), c.on); flatRoof(g, x - .3, y - .3, .6, .6, 38, '#5d6672'); });
lookout('radiomast', '안테나', ['courier'], (c) => { const g = c.g, b = iso(c.x + .5, c.y + .5, 0), t = iso(c.x + .5, c.y + .5, 46); line(g, [b[0] - 5, b[1]], t, '#9aa2af', 1); line(g, [b[0] + 5, b[1]], t, '#9aa2af', 1); for (let i = 1; i < 6; i++) { const yy = lerp(b[1], t[1], i / 6), hw = 5 * (1 - i / 6); line(g, [t[0] - hw, yy], [t[0] + hw, yy], '#c3c8d0', .6); } ellipse(g, t[0], t[1] + 6, 6, 3, '#e8ecf0'); if (c.on) for (let r = 1; r <= 3; r++) { const p = ((c.t / 900) + r / 3) % 1; g.globalAlpha = 1 - p; g.strokeStyle = '#ffbe50'; g.lineWidth = 1; g.beginPath(); g.arc(t[0], t[1], 4 + p * 16, -2.8, -.3); g.stroke(); } g.globalAlpha = 1; });
lookout('headframe', '권양탑', ['miner'], (c) => { const g = c.g, x = c.x + .2, y = c.y + .2; box(g, x, y, .6, .6, 3, 0, '#7d6e5e'); const b1 = iso(x, y + .6, 3), b2 = iso(x + .6, y, 3), t = iso(x + .3, y + .3, 40); line(g, b1, t, '#5a4a3c', 1.4); line(g, b2, t, '#5a4a3c', 1.4); const [wx, wy] = t; g.strokeStyle = '#3a3330'; g.lineWidth = 1.2; g.beginPath(); g.arc(wx, wy, 4, 0, Math.PI * 2); g.stroke(); line(g, [wx, wy], [wx + Math.cos(c.t / 300) * 4, wy + Math.sin(c.t / 300) * 4], '#3a3330', 1); });

// ━━ 집: 고친 파일 하나 = 집 한 채. 파일 종류마다 모양이 달라요 ━━
const HOUSE_OF_EXT = { ts: 'townhouse', tsx: 'townhouse', js: 'townhouse', jsx: 'townhouse', py: 'cottage', rb: 'cottage', go: 'cube', rs: 'cube', java: 'cube', kt: 'cube', md: 'aframe', mdx: 'aframe', txt: 'aframe', json: 'hut', yml: 'hut', yaml: 'hut', toml: 'hut', sql: 'cube', ipynb: 'cube', css: 'cottage', html: 'townhouse', sh: 'hut' };
const ROOF_OF_EXT = { ts: '#3f7fc0', tsx: '#3f9ac0', js: '#d9b23a', jsx: '#4fb5c9', py: '#3f6fa8', md: '#7a6a5a', json: '#8a6a4a', yml: '#b8476e', yaml: '#b8476e', sql: '#d0603f', ipynb: '#e08a3a', css: '#7a54b8', html: '#d0603f', go: '#3fb0c0', rs: '#b85a3a', sh: '#4f9a6f' };
const house = (id, name, draw) => def(id, { name, group: 'house', size: [1, 1], desc: '고친 파일 한 개', draw });
function houseBase(c, w, d, h, roofKind, rh) {
  const x = c.x + (1 - w) / 2, y = c.y + (1 - d) / 2, g = c.g, k = c.grow ?? 1;
  if (k <= .02) return;
  const H = h * k, wall = c.wall || '#f6efe3', rc = c.roofColor || '#d0603f';
  poly(g, [iso(x + w, y + .1), iso(x + w + .3, y + .25), iso(x + w + .3, y + d + .2), iso(x + .2, y + d + .2), iso(x, y + d)], 'rgba(40,60,20,.15)');
  box(g, x, y, w, d, H, 0, wall);
  if (H > 6) { win(c, faceL(x, y, d, 0, w * .2, w * .38, H * .45, H * .45 + 3.2), false); win(c, faceR(x, y, w, 0, d * .5, d * .7, H * .45, H * .45 + 3.2), c.on); poly(g, faceL(x, y, d, 0, w * .58, w * .78, 0, Math.min(5.5, H * .5)), '#8a5e3c'); }
  if (H > 14) win(c, faceR(x, y, w, 0, d * .5, d * .7, H * .75, H * .75 + 3), c.on);
  roof(g, roofKind, x, y, w, d, H, rh * k, rc, wall);
  return { x, y, H };
}
house('cottage', '오두막', (c) => { const r = houseBase(c, .62, .62, 10 + (c.level || 0) * 2.5, 'gableX', 7); if (r) box(c.g, r.x + .4, r.y + .1, .1, .1, 6, r.H + 2, '#8e6a52'); });
house('townhouse', '타운하우스', (c) => houseBase(c, .55, .55, 14 + (c.level || 0) * 4, 'flat', 0));
house('aframe', 'A자집', (c) => houseBase(c, .62, .6, 6 + (c.level || 0) * 2, 'gableY', 14 + (c.level || 0) * 2));
house('hut', '둥근 오두막', (c) => { const g = c.g, k = c.grow ?? 1; if (k < .02) return; const x = c.x + .5, y = c.y + .5; cylinder(g, x, y, .3, (9 + (c.level || 0) * 2) * k, 0, c.wall || '#efe2c8'); cone(g, x, y, .36, 10 * k, (9 + (c.level || 0) * 2) * k, c.roofColor || '#a0784a'); const [dx, dy] = iso(x + .2, y + .2, 0); g.fillStyle = '#8a5e3c'; g.fillRect(dx - 1.5, dy - 6 * k, 3, 6 * k); });
house('cube', '네모 집', (c) => { const r = houseBase(c, .6, .6, 12 + (c.level || 0) * 3.5, 'flat', 0); if (r) { box(c.g, r.x + .1, r.y + .1, .25, .2, 3, r.H + 2, '#9aa2af'); } });

// ━━ 야외 구역 ━━
const zone = (id, name, role, desc, draw) => def(id, { name, group: 'zone', role, size: [2, 2], desc, draw });
zone('plaza', '광장', 'plaza', '응답 대기 땐 종이 울리고, 끝나면 축하해요', (c) => {
  const g = c.g, x = c.x, y = c.y, w = c.w, d = c.d;
  for (let i = 0; i < w * 2; i++) for (let j = 0; j < d * 2; j++) tile(g, x + i / 2, y + j / 2, .5, .5, 0, (i + j) % 2 ? c.biome.pave : shade(c.biome.pave, -.04));
  // 분수
  const cx = x + w / 2, cy = y + d / 2;
  cylinder(g, cx, cy, .42, 3, 0, '#c9cfd6', '#7fc4e6'); cylinder(g, cx, cy, .1, 8, 3, '#c9cfd6', '#9fd8f0');
  const [fx, fy] = iso(cx, cy, 11); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, p = (c.t / 700 + i / 6) % 1; circle(g, fx + Math.cos(a) * p * 7, fy + Math.sin(a) * p * 3.5 - Math.sin(p * Math.PI) * 4 + p * 6, .9, 'rgba(200,235,255,.9)'); }
  // 게시판 (할 일)
  box(g, x + .15, y + .2, .06, .06, 9, 0, '#6a4428'); box(g, x + .15, y + .7, .06, .06, 9, 0, '#6a4428');
  poly(g, [iso(x + .18, y + .15, 7), iso(x + .18, y + .8, 7), iso(x + .18, y + .8, 15), iso(x + .18, y + .15, 15)], '#b98a5a');
  for (let i = 0; i < Math.min(6, c.state?.todos ?? 2); i++) poly(g, [iso(x + .19, y + .22 + (i % 3) * .19, 12 - Math.floor(i / 3) * 4), iso(x + .19, y + .36 + (i % 3) * .19, 12 - Math.floor(i / 3) * 4), iso(x + .19, y + .36 + (i % 3) * .19, 14.5 - Math.floor(i / 3) * 4), iso(x + .19, y + .22 + (i % 3) * .19, 14.5 - Math.floor(i / 3) * 4)], '#fff7d6');
  // 종
  const bx = x + w - .3, by = y + .3; box(g, bx - .25, by, .05, .05, 16, 0, '#6a4428'); box(g, bx + .2, by, .05, .05, 16, 0, '#6a4428'); box(g, bx - .25, by, .5, .05, 1.5, 16, '#6a4428');
  const [kx, ky] = iso(bx, by, 14), sw = c.state?.ring ? Math.sin(c.t / 110) * .5 : 0;
  g.save(); g.translate(kx, ky); g.rotate(sw); poly(g, [[-3, 6], [3, 6], [2, 0], [-2, 0]], '#e2b33c'); g.restore();
  if (c.state?.ring) for (let i = 0; i < 2; i++) { const p = ((c.t / 700) + i / 2) % 1; g.globalAlpha = 1 - p; g.fillStyle = '#e5534b'; g.font = '700 9px sans-serif'; g.fillText('!', kx + 7 + p * 6 - i * 20, ky - 4 - p * 10); g.globalAlpha = 1; }
  if (c.state?.party) for (let i = 0; i < 18; i++) { const p = ((c.t / 1600) + i / 18) % 1, [px, py] = iso(x + (hash(i) % 100) / 50, y + (hash(i + 7) % 100) / 50, 30 - p * 30); g.fillStyle = SPINES[i % 9]; g.fillRect(px, py, 2, 1.2); }
});
zone('field', '들판', 'field', 'Grep · Glob — 돋보기로 찾아요', (c) => {
  const g = c.g, x = c.x, y = c.y, w = c.w, d = c.d;
  tile(g, x, y, w, d, 0, shade(c.biome.dirt[0], .35));
  for (let r = 0; r < d * 3; r++) for (let k = 0; k < w * 4; k++) {
    const u = x + .12 + k / 4, v = y + .15 + r / 3; if (u > x + w - .1 || v > y + d - .1) continue;
    const [px, py] = iso(u, v), sw = Math.sin(c.t / 700 + k + r) * .8, col = c.biome.crop[(k + r) % 2];
    line(g, [px, py], [px + sw, py - 5], shade(col, -.2), 1); ellipse(g, px + sw, py - 5.5, 1.2, 2, col);
  }
  if (c.on) for (let i = 0; i < 3; i++) { const p = (c.t / 1200 + i / 3) % 1, [px, py] = iso(x + .3 + (hash(i + ((c.t / 1200) | 0)) % 100) / 70, y + .3 + (hash(i * 9 + ((c.t / 1200) | 0)) % 100) / 70, 8 + p * 8); g.globalAlpha = 1 - p; g.fillStyle = '#fff6b0'; g.font = '700 7px sans-serif'; g.fillText('✦', px, py); g.globalAlpha = 1; }
});
zone('lot', '공터', 'lot', 'Write — 새 파일 = 새 집을 지어요', (c) => {
  const g = c.g, x = c.x, y = c.y, w = c.w, d = c.d;
  tile(g, x + .05, y + .05, w - .1, d - .1, 0, shade(c.biome.dirt[0], .25));
  if (!c.on && !(c.state?.building)) { // 벽돌 더미 + 표지판
    for (let i = 0; i < 6; i++) box(g, x + .3 + (i % 3) * .2, y + d - .6 + Math.floor(i / 3) * .12, .18, .1, 2.5, Math.floor(i / 3) * 2.5, '#c0603e');
    box(g, x + w - .4, y + .3, .05, .05, 8, 0, '#7a5a3c'); poly(g, [iso(x + w - .38, y + .15, 6), iso(x + w - .38, y + .55, 6), iso(x + w - .38, y + .55, 11), iso(x + w - .38, y + .15, 11)], '#f2d24b');
    return;
  }
  // 짓는 중: 크레인 + 올라가는 건물
  const p = c.state?.progress ?? ((c.t / 6000) % 1);
  const H = 4 + p * 22;
  box(g, x + .5, y + .5, w - 1, d - 1, H, 0, '#efe3cf');
  for (let z = 6; z < H; z += 6) { win(c, faceL(x + .5, y + .5, d - 1, z - 6, .15, .35, 2, 4.5), false); win(c, faceR(x + .5, y + .5, w - 1, z - 6, .5, .7, 2, 4.5), false); }
  g.globalAlpha = .55 + .25 * Math.sin(c.t / 300); box(g, x + .5, y + .5, w - 1, d - 1, 5, H, '#f4ead8'); g.globalAlpha = 1;
  g.strokeStyle = '#b7894d'; g.lineWidth = .8;
  for (const [u, v] of [[.4, d - .4], [w - .4, d - .4], [w - .4, .4]]) line(g, iso(x + u, y + v, 0), iso(x + u, y + v, H + 8), '#b7894d', .8);
  for (let z = 7; z < H + 8; z += 7) { g.beginPath(); const a = iso(x + .4, y + d - .4, z), b = iso(x + w - .4, y + d - .4, z), e = iso(x + w - .4, y + .4, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(e[0], e[1]); g.stroke(); }
  box(g, x + .2, y + .2, .14, .14, 56, 0, '#f0b43a');
  const ang = Math.sin(c.t / 1600) * .9 + .6, L = 1.7, top = iso(x + .27, y + .27, 56), end = iso(x + .27 + Math.cos(ang) * L, y + .27 + Math.sin(ang) * L, 56), back = iso(x + .27 - Math.cos(ang) * .6, y + .27 - Math.sin(ang) * .6, 56);
  line(g, back, end, '#e09a1f', 2.2); box(g, x + .14, y + .14, .26, .26, 4, 54, '#d98f1a');
  const rope = 16 + Math.sin(c.t / 700) * 7; line(g, end, [end[0], end[1] + rope], '#5c5650', .7); g.fillStyle = '#c0603e'; g.fillRect(end[0] - 3, end[1] + rope, 6, 3);
  if (((c.t / 90) | 0) % 4 === 0) { const [sx, sy] = iso(x + w / 2, y + d - .5, H + 3); for (let i = 0; i < 4; i++) circle(g, sx + Math.cos(i * 1.7) * 4, sy + Math.sin(i * 1.7) * 2, .8, '#ffe27a'); }
  if (c.state?.buildName) { g.font = '600 6px sans-serif'; const tw = g.measureText(c.state.buildName).width + 6, [sx, sy] = iso(x + w - .3, y + d - .1, 10); g.fillStyle = '#fff7d6'; g.fillRect(sx - tw / 2, sy - 5, tw, 8); g.fillStyle = '#5a4630'; g.fillText(c.state.buildName, sx - tw / 2 + 3, sy + 1); }
});
zone('testground', '훈련장', 'testground', '테스트 — 과녁 맞히기. 통과면 초록 깃발', (c) => {
  const g = c.g, x = c.x, y = c.y, w = c.w, d = c.d;
  tile(g, x + .05, y + .05, w - .1, d - .1, 0, shade(c.biome.grass[0], -.08));
  for (let i = 0; i <= 4; i++) { box(g, x + i * (w / 4) - .03, y + d - .1, .05, .05, 5, 0, '#8a6240'); box(g, x + w - .1, y + i * (d / 4) - .03, .05, .05, 5, 0, '#8a6240'); }
  box(g, x, y + d - .1, w, .03, 1, 3.5, '#a07448'); box(g, x + w - .1, y, .03, d, 1, 3.5, '#a07448');
  const fail = c.state?.fail, pass = c.state?.pass;
  for (let i = 0; i < 3; i++) {
    const tx = x + .35 + i * .55, ty = y + .3;
    box(g, tx, ty, .05, .05, 7, 0, '#7a5a3c');
    const [cx, cy] = iso(tx + .02, ty + .02, 12);
    circle(g, cx, cy, 5, '#fff'); circle(g, cx, cy, 3.6, '#e5534b'); circle(g, cx, cy, 2.2, '#fff'); circle(g, cx, cy, 1, '#e5534b');
    if (fail && i === 1) { for (let k = 0; k < 4; k++) puff(g, c.t, cx, cy - 4, k, 'rgba(255,120,50,.85)', 700); if (c.lights) c.lights.push({ x: cx, y: cy, r: 16, color: 'rgba(255,110,40,.6)' }); }
  }
  if (c.on) for (let i = 0; i < 2; i++) { const p = (c.t / 900 + i / 2) % 1, a = iso(x + w - .4, y + d - .4, 8), b = iso(x + .35 + ((i + (c.t / 900 | 0)) % 3) * .55, y + .3, 12); const px = lerp(a[0], b[0], p), py = lerp(a[1], b[1], p) - Math.sin(p * Math.PI) * 8; line(g, [px, py], [px - 4, py + 1.5], '#6a4428', 1); }
  // 깃발: 마지막 결과
  const fx = x + w - .2, fy = y + d - .25, [ax, ay] = iso(fx, fy, 0);
  line(g, [ax, ay], [ax, ay - 22], '#6d6a66', .9);
  const col = pass ? '#3fb27a' : fail ? '#e5534b' : '#d8d0c2', wv = Math.sin(c.t / 250) * 1.2;
  g.fillStyle = col; g.beginPath(); g.moveTo(ax, ay - 22); g.quadraticCurveTo(ax + 5, ay - 23 + wv, ax + 10, ay - 21); g.lineTo(ax + 10, ay - 15); g.quadraticCurveTo(ax + 5, ay - 16 + wv, ax, ay - 15); g.fill();
});
zone('dock', '부두', 'dock', 'git — 커밋은 상자, 푸시하면 배가 떠나요', (c) => {
  const g = c.g, x = c.x, y = c.y, w = c.w, d = c.d, dir = c.dockDir || 'x', cloudy = c.cloudy;
  // 잔교: 섬 밖으로 뻗음
  const len = 2.2, px0 = dir === 'x' ? x + w - .1 : x + .15, py0 = dir === 'x' ? y + .15 : y + d - .1;
  const pw = dir === 'x' ? len : w - .3, pd = dir === 'x' ? d - .3 : len;
  if (!cloudy) for (let i = 0; i <= 3; i++) { const u = i / 3; const [a, b] = dir === 'x' ? [px0 + u * pw, py0 + pd] : [px0 + pw, py0 + u * pd]; box(g, a - .04, b - .04, .08, .08, 16, -16, '#6a4c32'); }
  box(g, px0, py0, pw, pd, 1.6, cloudy ? 0 : -1, '#a07448', { top: '#b98a5a' });
  for (let i = 0; i < 10; i++) { const u = i / 10; if (dir === 'x') line(g, iso(px0 + u * pw, py0, .7), iso(px0 + u * pw, py0 + pd, .7), '#8a6240', .4); else line(g, iso(px0, py0 + u * pd, .7), iso(px0 + pw, py0 + u * pd, .7), '#8a6240', .4); }
  tile(g, x + .05, y + .05, w - .1, d - .1, 0, '#b98a5a');
  // 상자 = 커밋
  const n = Math.min(8, c.state?.crates ?? 2);
  for (let i = 0; i < n; i++) box(g, x + .15 + (i % 3) * .3, y + .15 + Math.floor(i / 3 % 2) * .3, .26, .26, 5, Math.floor(i / 6) * 5, i % 2 ? '#c79a5a' : '#b5874a');
  // 배 / 비행선
  const away = c.state?.sail ?? 0; // 0 정박, 0..1 출항
  const bx = dir === 'x' ? px0 + pw * .55 : px0 + pw + .35, by = dir === 'x' ? py0 + pd + .35 : py0 + pd * .55;
  const ox = dir === 'x' ? away * 3 : away * 1.2, oy = dir === 'x' ? away * 1.2 : away * 3;
  g.globalAlpha = clamp(1.3 - away * 1.3, 0, 1);
  if (cloudy) ship(g, c, bx + ox, by + oy, 18 + Math.sin(c.t / 900) * 2 + away * 20, true);
  else ship(g, c, bx + ox, by + oy, 0, false, dir);
  g.globalAlpha = 1;
  if (cloudy) { box(g, x + .8, y + .8, .1, .1, 30, 0, '#8a8f99'); const [mx, my] = iso(x + .85, y + .85, 30); circle(g, mx, my, 1.6, '#e5534b'); }
});
function ship(g, c, x, y, z, air, dir) {
  if (air) { const [sx, sy] = iso(x, y, z); ellipse(g, sx, sy - 6, 18, 6.5, '#e8e2d6'); ellipse(g, sx - 3, sy - 8, 12, 2.5, 'rgba(255,255,255,.6)'); for (let i = -2; i <= 2; i++) line(g, [sx + i * 6, sy - 1], [sx + i * 2.5, sy + 3], '#8a7a6a', .5); g.fillStyle = '#9a6b45'; rr(g, sx - 7, sy + 3, 14, 4, 2); poly(g, [[sx + 16, sy - 6], [sx + 22, sy - 11], [sx + 22, sy - 1]], '#d0603f'); return; }
  const bob = Math.sin(c.t / 800) * 1, [sx, sy] = iso(x, y, -2 + bob);
  g.fillStyle = '#7a4a2a'; g.beginPath(); g.moveTo(sx - 14, sy - 4); g.lineTo(sx + 14, sy - 4); g.lineTo(sx + 9, sy + 3); g.lineTo(sx - 10, sy + 3); g.closePath(); g.fill();
  g.fillStyle = '#f4efe4'; g.fillRect(sx - 14, sy - 5, 28, 1.6);
  line(g, [sx, sy - 4], [sx, sy - 28], '#5a4030', 1.2);
  g.fillStyle = '#fbf6ea'; g.beginPath(); g.moveTo(sx + 1, sy - 27); g.quadraticCurveTo(sx + 11, sy - 18, sx + 1, sy - 7); g.closePath(); g.fill();
  g.fillStyle = '#f0e8d8'; g.beginPath(); g.moveTo(sx - 1, sy - 24); g.quadraticCurveTo(sx - 8, sy - 16, sx - 1, sy - 8); g.closePath(); g.fill();
  if (c.state?.prFlag) { g.fillStyle = '#e0607e'; g.fillRect(sx, sy - 32, 7, 4); }
}

// ━━ 소품 ━━
const prop = (id, name, draw) => def(id, { name, group: 'prop', size: [1, 1], desc: '', draw });
function treeAt(c, kind, x, y, s = 1) {
  const g = c.g, [px, py] = iso(x, y), sw = Math.sin(c.t / 1300 + x * 3 + y) * .8;
  ellipse(g, px + 4, py + 1, 6 * s, 2.6 * s, 'rgba(40,60,20,.16)');
  if (kind === 'pine' || kind === 'snowpine') {
    g.fillStyle = '#6a4a30'; g.fillRect(px - 1, py - 5 * s, 2, 5 * s);
    for (let i = 0; i < 3; i++) { const yy = py - 5 * s - i * 5 * s, ww = (7 - i * 1.8) * s; poly(g, [[px - ww + sw * i * .3, yy], [px + ww + sw * i * .3, yy], [px + sw * (i + 1) * .3, yy - 9 * s]], i % 2 ? '#3f7f58' : '#4a8c62'); if (kind === 'snowpine') poly(g, [[px - ww * .5 + sw * i * .3, yy - 4.5 * s], [px + ww * .5 + sw * i * .3, yy - 4.5 * s], [px + sw * (i + 1) * .3, yy - 9 * s]], '#ffffff'); }
  } else if (kind === 'palm') {
    g.strokeStyle = '#8a6a4a'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 4 * s, py - 10 * s, px + 2 * s + sw, py - 20 * s); g.stroke();
    const tx = px + 2 * s + sw, ty = py - 20 * s;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; g.strokeStyle = i % 2 ? '#4f9a4a' : '#5fae58'; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * 6 * s, ty + Math.sin(a) * 2 * s - 4 * s, tx + Math.cos(a) * 10 * s, ty + Math.sin(a) * 4 * s + 2 * s); g.stroke(); }
    circle(g, tx, ty + 1, 1.5 * s, '#7a5a3a');
  } else if (kind === 'cactus') {
    g.fillStyle = '#5f9a5a'; rr(g, px - 2 * s, py - 16 * s, 4 * s, 16 * s, 2 * s); rr(g, px - 6 * s, py - 11 * s, 3 * s, 6 * s, 1.5 * s); rr(g, px + 3 * s, py - 13 * s, 3 * s, 7 * s, 1.5 * s);
  } else {
    g.fillStyle = '#7a5a3c'; g.fillRect(px - 1, py - 7 * s, 2, 7 * s);
    const col = kind === 'cherry' ? '#f4b6c8' : kind === 'maple' ? ['#e07a3a', '#d0503e', '#e8a23a'][(hash(x * 7 + y) % 3)] : ['#5fa463', '#6aae5c', '#4f9a6a'][(hash(x * 5 + y) % 3)];
    circle(g, px + sw, py - 12 * s, 6.5 * s, col); circle(g, px - 2 + sw, py - 14 * s, 4.5 * s, shade(col, .15)); circle(g, px + 2.5 + sw, py - 10 * s, 3.5 * s, shade(col, -.15));
    if (kind === 'cherry' && c.t) for (let i = 0; i < 2; i++) { const p = (c.t / 3000 + i / 2 + x) % 1; circle(g, px + p * 14 + sw, py - 12 * s + p * 14, .8, '#f9cad6'); }
  }
}
['round', 'pine', 'palm', 'cherry', 'maple', 'snowpine', 'cactus'].forEach((k) => prop('tree-' + k, { round: '둥근 나무', pine: '소나무', palm: '야자수', cherry: '벚나무', maple: '단풍나무', snowpine: '눈 덮인 소나무', cactus: '선인장' }[k], (c) => treeAt(c, k, c.x + .5, c.y + .5, c.s || 1)));
prop('rocks', '바위', (c) => { const g = c.g; for (let i = 0; i < 3; i++) { const [px, py] = iso(c.x + .3 + i * .2, c.y + .4 + (i % 2) * .2); ellipse(g, px, py - 2, 4 - i, 3 - i * .5, i ? '#a8a29a' : '#9a948c'); ellipse(g, px - 1, py - 3, 2 - i * .3, 1.2, '#c4beb6'); } });
prop('bench', '벤치', (c) => { box(c.g, c.x + .25, c.y + .45, .5, .16, 1, 3, '#a07448'); box(c.g, c.x + .25, c.y + .42, .5, .04, 4, 4, '#8a6240'); box(c.g, c.x + .27, c.y + .5, .05, .05, 3, 0, '#5d5a55'); box(c.g, c.x + .68, c.y + .5, .05, .05, 3, 0, '#5d5a55'); });
prop('lamp', '가로등', (c) => { const g = c.g, [px, py] = iso(c.x + .5, c.y + .5); line(g, [px, py], [px, py - 16], '#5d5a55', 1); circle(g, px, py - 17, 2, c.night > .3 ? '#ffe39a' : '#f4efe4'); if (c.night > .3 && c.lights) c.lights.push({ x: px, y: py - 17, r: 15, color: 'rgba(255,214,120,.6)' }); });
prop('statue', '동상', (c) => { box(c.g, c.x + .3, c.y + .3, .4, .4, 6, 0, '#cfc8bd'); const [px, py] = iso(c.x + .5, c.y + .5, 6); c.g.fillStyle = '#8a9a8a'; rr(c.g, px - 2, py - 11, 4, 11, 2); circle(c.g, px, py - 13, 2.4, '#8a9a8a'); });
prop('flowers', '꽃밭', (c) => { for (let i = 0; i < 9; i++) { const [px, py] = iso(c.x + .2 + (i % 3) * .3, c.y + .2 + Math.floor(i / 3) * .3); line(c.g, [px, py], [px, py - 3], '#5a9a4a', .6); circle(c.g, px, py - 3.5, 1.4, c.biome.flowers[i % 3]); } });
prop('crates', '나무 상자', (c) => { box(c.g, c.x + .25, c.y + .3, .3, .3, 5, 0, '#c79a5a'); box(c.g, c.x + .55, c.y + .45, .25, .25, 4, 0, '#b5874a'); box(c.g, c.x + .3, c.y + .35, .22, .22, 4, 5, '#d0a868'); });
prop('barrels', '술통', (c) => { for (let i = 0; i < 3; i++) cylinder(c.g, c.x + .3 + i * .22, c.y + .45 + (i % 2) * .15, .1, 6, 0, '#8a5a34', '#a8784a'); });
prop('haystack', '건초더미', (c) => { const [px, py] = iso(c.x + .5, c.y + .5); ellipse(c.g, px, py - 4, 9, 6, '#e3c35a'); ellipse(c.g, px - 2, py - 6, 5, 3, '#efd47a'); });
prop('logs', '통나무 더미', (c) => { for (let i = 0; i < 3; i++) cylinderLog(c, c.x + .1, c.y + .3 + i * .2, i); });
prop('pipes', '파이프', (c) => { box(c.g, c.x + .1, c.y + .45, .8, .1, 3, 4, '#8a8f99'); box(c.g, c.x + .45, c.y + .1, .1, .8, 3, 7, '#9aa2af'); cylinder(c.g, c.x + .5, c.y + .5, .1, 12, 0, '#7c8491'); });
prop('nets', '그물', (c) => { box(c.g, c.x + .2, c.y + .4, .05, .05, 10, 0, '#7a5a3c'); box(c.g, c.x + .8, c.y + .4, .05, .05, 10, 0, '#7a5a3c'); const a = iso(c.x + .22, c.y + .42, 10), b = iso(c.x + .82, c.y + .42, 10); for (let i = 0; i < 6; i++) line(c.g, [lerp(a[0], b[0], i / 5), lerp(a[1], b[1], i / 5)], [lerp(a[0], b[0], i / 5), lerp(a[1], b[1], i / 5) + 7], 'rgba(90,70,50,.6)', .4); line(c.g, a, b, '#7a5a3c', .6); });
prop('flags', '깃발 줄', (c) => { const a = iso(c.x + .1, c.y + .5, 14), b = iso(c.x + .9, c.y + .5, 14); box(c.g, c.x + .08, c.y + .48, .04, .04, 14, 0, '#7a5a3c'); box(c.g, c.x + .88, c.y + .48, .04, .04, 14, 0, '#7a5a3c'); for (let i = 0; i < 6; i++) { const p = (i + .5) / 6, px = lerp(a[0], b[0], p), py = lerp(a[1], b[1], p) + Math.sin(p * Math.PI) * 3; poly(c.g, [[px - 2, py], [px + 2, py], [px, py + 4]], SPINES[i]); } });
prop('cart', '광차', (c) => { box(c.g, c.x + .3, c.y + .35, .4, .3, 4, 1, '#6c7380'); for (let i = 0; i < 3; i++) { const [ox, oy] = iso(c.x + .4 + i * .1, c.y + .5, 6); circle(c.g, ox, oy, 1.3, ['#e3c35a', '#9fd0e8', '#c0503e'][i]); } });
prop('well', '우물', (c) => { cylinder(c.g, c.x + .5, c.y + .5, .25, 5, 0, '#b8b0a4', '#4a7aa8'); box(c.g, c.x + .28, c.y + .48, .04, .04, 12, 0, '#7a5a3c'); box(c.g, c.x + .7, c.y + .48, .04, .04, 12, 0, '#7a5a3c'); gableX(c.g, c.x + .25, c.y + .3, .5, .4, 12, 5, '#a0522d', '#7a5a3c'); });

function puff(g, t, x, y, i, color, period) {
  const p = ((t / period) + i / 5) % 1;
  g.globalAlpha = (1 - p) * .9; circle(g, x + p * 16 + Math.sin(p * 6 + i) * 2, y - p * 28, 2 + p * 6, color); g.globalAlpha = 1;
}
