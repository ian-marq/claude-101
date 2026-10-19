'use strict';
// 아이소메트릭 그리기 기본기. 모든 프리팹이 이걸로 그려진다.
// 좌표: x 는 화면 오른쪽 아래, y 는 왼쪽 아래, z 는 위. 보는 사람은 +x+y 쪽에 있다.

const TW = 30, TH = 15;
let OX = 0, OY = 0;
function setOrigin(x, y) { OX = x; OY = y; }
const iso = (x, y, z = 0) => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z];

function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { let a = seed >>> 0 || 1; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return ((a >>> 0) % 100000) / 100000; }; }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shade(hex, f) { // f<0 어둡게, f>0 밝게. 항상 #rrggbb 를 돌려준다
  const n = parseInt(hex.slice(1, 7), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  return '#' + c.map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f).toString(16).padStart(2, '0')).join('');
}
function mixc(a, b, t) {
  const p = (h) => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}

function poly(g, pts, fill, stroke, lw = .6) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function line(g, a, b, color, w = 1) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
function circle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function ellipse(g, x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
function tile(g, x, y, w, d, z, fill, stroke) { poly(g, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)], fill, stroke); }

// 상자: 앞쪽 두 면 + 윗면
function box(g, x, y, w, d, h, z, color, o = {}) {
  const A = iso(x, y, z + h), B = iso(x + w, y, z + h), C = iso(x + w, y + d, z + h), D = iso(x, y + d, z + h);
  const Cb = iso(x + w, y + d, z), Db = iso(x, y + d, z), Bb = iso(x + w, y, z);
  if (!o.noL) poly(g, [D, C, Cb, Db], o.left || color);
  if (!o.noR) poly(g, [B, C, Cb, Bb], o.right || shade(color, -.16));
  if (!o.noTop) poly(g, [A, B, C, D], o.top || shade(color, .14));
}
// 원기둥 (탑, 굴뚝, 탱크)
function cylinder(g, cx, cy, r, h, z, color, top) {
  const [x0, y0] = iso(cx, cy, z), [, y1] = iso(cx, cy, z + h), rx = r * TW * .72, ry = rx / 2;
  const gr = g.createLinearGradient(x0 - rx, 0, x0 + rx, 0);
  gr.addColorStop(0, shade(color, .1)); gr.addColorStop(.55, color); gr.addColorStop(1, shade(color, -.3));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - rx, y1); g.lineTo(x0 - rx, y0); g.ellipse(x0, y0, rx, ry, 0, Math.PI, 0, true); g.lineTo(x0 + rx, y1); g.closePath(); g.fill();
  ellipse(g, x0, y1, rx, ry, top || shade(color, .18));
}
// 원뿔 지붕
function cone(g, cx, cy, r, h, z, color) {
  const [x0, y0] = iso(cx, cy, z), rx = r * TW * .72, ry = rx / 2;
  g.fillStyle = color; g.beginPath(); g.moveTo(x0 - rx, y0); g.ellipse(x0, y0, rx, ry, 0, Math.PI, 0, true); g.lineTo(x0, y0 - h); g.closePath(); g.fill();
  g.fillStyle = shade(color, -.25); g.beginPath(); g.moveTo(x0, y0 + ry); g.ellipse(x0, y0, rx, ry, 0, Math.PI / 2, 0, true); g.lineTo(x0, y0 - h); g.closePath(); g.fill();
}
// 돔 지붕
function dome(g, cx, cy, r, z, color) {
  const [x0, y0] = iso(cx, cy, z), rx = r * TW * .72;
  const gr = g.createRadialGradient(x0 - rx * .35, y0 - rx * .5, 1, x0, y0, rx * 1.2);
  gr.addColorStop(0, shade(color, .35)); gr.addColorStop(1, shade(color, -.25));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x0, y0, rx, rx * .5, 0, 0, Math.PI); g.ellipse(x0, y0, rx, rx * .95, 0, Math.PI, 0); g.fill();
}

// 앞-왼쪽 면(y=y+d 평면) 위 사각형: u = x 방향(0..w), v = 높이
function faceL(x, y, d, z, u0, u1, v0, v1) { const Y = y + d; return [iso(x + u0, Y, z + v0), iso(x + u1, Y, z + v0), iso(x + u1, Y, z + v1), iso(x + u0, Y, z + v1)]; }
// 앞-오른쪽 면(x=x+w 평면) 위 사각형: u = y 방향(0..d)
function faceR(x, y, w, z, u0, u1, v0, v1) { const X = x + w; return [iso(X, y + u0, z + v0), iso(X, y + u1, z + v0), iso(X, y + u1, z + v1), iso(X, y + u0, z + v1)]; }

// 지붕들
function gableX(g, x, y, w, d, z, rh, color, wall) { // 용마루가 x 방향
  const o = .1;
  poly(g, [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d / 2, z + rh)], shade(wall, -.18));
  poly(g, [iso(x - o, y + d + o, z - 1), iso(x + w + o, y + d + o, z - 1), iso(x + w + o, y + d / 2, z + rh), iso(x - o, y + d / 2, z + rh)], color);
  poly(g, [iso(x + w + o, y - o, z - 1), iso(x + w + o, y + d / 2, z + rh), iso(x + w + o, y + d + o, z - 1)], shade(color, -.32));
  line(g, iso(x - o, y + d / 2, z + rh), iso(x + w + o, y + d / 2, z + rh), shade(color, .25), 1);
}
function gableY(g, x, y, w, d, z, rh, color, wall) { // 용마루가 y 방향
  const o = .1;
  poly(g, [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w / 2, y + d, z + rh)], shade(wall, .04));
  poly(g, [iso(x + w + o, y - o, z - 1), iso(x + w + o, y + d + o, z - 1), iso(x + w / 2, y + d + o, z + rh), iso(x + w / 2, y - o, z + rh)], shade(color, -.2));
  poly(g, [iso(x - o, y + d + o, z - 1), iso(x + w + o, y + d + o, z - 1), iso(x + w / 2, y + d + o, z + rh)], color);
  line(g, iso(x + w / 2, y - o, z + rh), iso(x + w / 2, y + d + o, z + rh), shade(color, .2), 1);
}
function hip(g, x, y, w, d, z, rh, color) {
  const o = .1, P = iso(x + w / 2, y + d / 2, z + rh);
  poly(g, [iso(x - o, y + d + o, z), iso(x + w + o, y + d + o, z), P], color);
  poly(g, [iso(x + w + o, y - o, z), iso(x + w + o, y + d + o, z), P], shade(color, -.24));
}
function flatRoof(g, x, y, w, d, z, color) {
  tile(g, x, y, w, d, z, shade(color, .1));
  box(g, x, y + d - .08, w, .08, 2, z, color, { top: shade(color, .25) });
  box(g, x + w - .08, y, .08, d, 2, z, color, { top: shade(color, .25) });
}
function sawRoof(g, x, y, w, d, z, n, color) {
  for (let i = 0; i < n; i++) {
    const y0 = y + i * d / n, y1 = y0 + d / n;
    poly(g, [iso(x, y1, z), iso(x + w, y1, z), iso(x + w, y1 - .03, z + 9), iso(x, y1 - .03, z + 9)], shade(color, i === n - 1 ? -.08 : 0));
    poly(g, [iso(x + w, y0, z), iso(x + w, y1, z), iso(x + w, y1 - .03, z + 9)], shade(color, -.22));
  }
}
function roof(g, kind, x, y, w, d, z, rh, color, wall) {
  if (kind === 'gableX') gableX(g, x, y, w, d, z, rh, color, wall);
  else if (kind === 'gableY') gableY(g, x, y, w, d, z, rh, color, wall);
  else if (kind === 'hip') hip(g, x, y, w, d, z, rh, color);
  else if (kind === 'flat') flatRoof(g, x, y, w, d, z, color);
  else if (kind === 'saw') sawRoof(g, x, y, w, d, z, Math.max(2, Math.round(d * 1.5)), color);
  else if (kind === 'dome') { tile(g, x, y, w, d, z, shade(wall, -.05)); dome(g, x + w / 2, y + d / 2, Math.min(w, d) * .45, z, color); }
}

// 단면도: 안쪽 바닥 + 뒤쪽 두 벽(안쪽 면)
function backWalls(g, x, y, w, d, h, z, wall, floor) {
  tile(g, x, y, w, d, z, floor);
  poly(g, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y, z + h), iso(x, y, z + h)], shade(wall, -.04));
  poly(g, [iso(x, y, z), iso(x, y + d, z), iso(x, y + d, z + h), iso(x, y, z + h)], shade(wall, -.16));
  const t = .07, cut = shade(wall, .45); // 잘린 벽 윗면
  tile(g, x, y, w, t, z + h, cut); tile(g, x, y, t, d, z + h, cut);
}
// 단면도: 잘려 나간 앞벽(낮은 턱)
function cutFront(g, x, y, w, d, h, z, wall) {
  const t = .07, cut = shade(wall, .45);
  box(g, x, y + d - t, w, t, h, z, wall, { top: cut });
  box(g, x + w - t, y, t, d, h, z, wall, { top: cut });
}
