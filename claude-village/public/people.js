'use strict';
// 마을 사람들. 촌장 = 메인 Claude, 학생 = 서브에이전트.
// pose: walk stand work read type hammer carry search look wave cheer sleep sit fish

const SHIRTS = ['#e07a52', '#5b8fd6', '#9b7be0', '#4fae7c', '#e06a8a', '#e3b341', '#40b5b5', '#c98a4f'];
const HAIRS = ['#3b2a20', '#6b4428', '#c79352', '#24242e', '#8a3a2e', '#d8cbb8'];
const SKIN = '#f2c9a3';

function person(g, x, y, o) {
  const s = o.s || 1, t = o.t || 0, dir = o.dir || 1, pose = o.pose || 'stand';
  if (pose === 'sleep') return sleeper(g, x, y, o);
  const walk = pose === 'walk' || pose === 'carry' || pose === 'search', ph = t / 130;
  const sit = pose === 'sit' || pose === 'read' || pose === 'type';
  const bob = walk ? Math.abs(Math.sin(ph)) * 1.1 : pose === 'cheer' ? Math.abs(Math.sin(t / 160)) * 2.5 : pose === 'hammer' || pose === 'work' ? Math.abs(Math.sin(t / 260)) * .7 : 0;
  ellipse(g, x, y, 4.4 * s, 1.9 * s, 'rgba(30,40,20,.25)');
  g.save(); g.translate(x, y - bob - (sit ? -1.5 * s : 0)); g.scale(s * dir, s);
  const lean = pose === 'search' ? .25 : 0;
  // 다리
  g.fillStyle = '#3d4256';
  if (sit) { rr(g, -2.6, -4.5, 6, 2, 1); rr(g, 2.2, -4.5, 1.8, 4.5, .9); }
  else { const lg = walk ? Math.sin(ph) * 1.7 : 0; rr(g, -2.6 + lg * .3, -5, 2, 5, 1); rr(g, .6 - lg * .3, -5, 2, 5, 1); }
  g.rotate(lean);
  if (o.pack) { g.fillStyle = o.packColor || '#d6533f'; rr(g, -5.4, -11.8, 2.9, 5.2, 1.2); }
  // 몸
  g.fillStyle = o.shirt || '#5b8fd6'; rr(g, -3.5, -12.6, 7, 8.4, 3);
  g.fillStyle = 'rgba(0,0,0,.12)'; rr(g, .8, -12.6, 2.7, 8.4, 2);
  if (o.apron) { g.fillStyle = o.apron; rr(g, -2.6, -9.5, 5.2, 5.4, 1); }
  // 팔 + 손에 든 것
  g.fillStyle = SKIN;
  const arm = (ang, len = 5, fn) => { g.save(); g.translate(3, -11); g.rotate(ang); g.fillStyle = SKIN; rr(g, -.9, 0, 1.8, len, .9); if (fn) { g.translate(0, len); fn(); } g.restore(); };
  if (pose === 'wave') arm(-2.4 + Math.sin(t / 160) * .5, 5.5);
  else if (pose === 'cheer') { arm(-2.7, 5.5); g.save(); g.translate(-3, -11); g.rotate(2.7); rr(g, -.9, 0, 1.8, 5.5, .9); g.restore(); }
  else if (pose === 'hammer') arm(-1.2 - Math.abs(Math.sin(t / 180)) * 1.4, 5, () => { g.fillStyle = '#7a5a3c'; g.fillRect(-.5, -1, 1, 5); g.fillStyle = '#8a8f99'; g.fillRect(-2.2, 3.4, 4.4, 2); });
  else if (pose === 'carry') { arm(-2.9, 5.5); g.fillStyle = '#c0603e'; g.fillRect(-3.5, -23, 7, 4); g.fillStyle = '#d0784e'; g.fillRect(-3.5, -23, 7, 1.2); }
  else if (pose === 'read') arm(-1.1, 4.5, () => { g.fillStyle = o.bookColor || '#7e62b0'; g.fillRect(-3, -2, 6, 4.2); g.fillStyle = '#fff'; g.fillRect(-.3, -2, .6, 4.2); });
  else if (pose === 'type') arm(-1.35 + Math.sin(t / 90) * .15, 5);
  else if (pose === 'search') arm(-.9, 5, () => { g.strokeStyle = '#5d5a55'; g.lineWidth = .8; g.beginPath(); g.arc(0, 3, 2, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(200,230,255,.6)'; g.beginPath(); g.arc(0, 3, 1.6, 0, Math.PI * 2); g.fill(); });
  else if (pose === 'look') arm(-2.2, 4, () => { g.fillStyle = '#4a5a7a'; rr(g, -1.4, -6, 2.8, 8, 1.2); g.fillStyle = '#c9a24a'; g.fillRect(-1.5, -6.4, 3, 1.4); });
  else if (pose === 'fish') arm(-1.4, 5, () => { g.strokeStyle = '#7a5a3c'; g.lineWidth = .7; g.beginPath(); g.moveTo(0, 0); g.lineTo(10, -10); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .3; g.beginPath(); g.moveTo(10, -10); g.lineTo(12, 6); g.stroke(); });
  else if (pose === 'work') arm(Math.sin(t / 200) * .5 - .5, 5);
  else arm(walk ? Math.sin(ph) * .5 : 0, 5, o.hold ? () => o.hold(g) : null);
  // 머리
  circle(g, 0, -16, 4.2, SKIN);
  g.fillStyle = o.hair || '#3b2a20'; g.beginPath(); g.arc(0, -16.6, 4.3, Math.PI * 1.02, Math.PI * 2.05); g.fill();
  circle(g, 2, -15.6, .55, '#2a2420');
  g.fillStyle = 'rgba(230,120,110,.35)'; g.beginPath(); g.arc(2.6, -14.2, 1, 0, Math.PI * 2); g.fill();
  if (o.hat === 'top') { g.fillStyle = '#3a3330'; rr(g, -5, -20.2, 10, 1.6, .8); rr(g, -3.2, -25, 6.4, 5.2, 1.2); g.fillStyle = o.hatColor || '#c0503e'; g.fillRect(-3.2, -21.6, 6.4, 1.5); }
  else if (o.hat === 'cap') { g.fillStyle = o.hatColor || '#4c79c7'; g.beginPath(); g.arc(0, -17.2, 4.4, Math.PI, Math.PI * 2); g.fill(); rr(g, 0, -17.8, 6, 1.4, .7); }
  else if (o.hat === 'hard') { g.fillStyle = '#f2c230'; g.beginPath(); g.arc(0, -17.4, 4.6, Math.PI, Math.PI * 2); g.fill(); rr(g, -5.4, -17.8, 10.8, 1.3, .6); }
  g.restore();
}

function sleeper(g, x, y, o) {
  const s = o.s || 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  circle(g, -6, -5, 3.6, SKIN); g.fillStyle = o.hair || '#3b2a20'; g.beginPath(); g.arc(-6.6, -5.4, 3.7, Math.PI * .6, Math.PI * 1.6); g.fill();
  g.fillStyle = o.blanket || '#c0503e'; rr(g, -3, -8, 12, 6, 3);
  if (o.hat === 'top') { g.fillStyle = '#3a3330'; rr(g, -11, -9, 4, 6, 1); }
  g.restore();
  const p = ((o.t || 0) / 2000) % 1;
  g.globalAlpha *= 1 - p; g.fillStyle = '#5a6a9a'; g.font = '700 7px sans-serif'; g.fillText('z', x - 4 + p * 6, y - 12 - p * 10); g.globalAlpha /= Math.max(.01, 1 - p);
}

function bubble(g, x, y, t, ch, color) {
  const p = 1 + Math.sin(t / 220) * .06;
  g.save(); g.translate(x, y); g.scale(p, p);
  g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = 4; g.shadowOffsetY = 1;
  g.fillStyle = '#fff'; rr(g, -6.5, -7, 13, 12, 6);
  g.shadowColor = 'transparent'; poly(g, [[-2, 4.5], [2, 4.5], [0, 7.5]], '#fff');
  g.fillStyle = color; g.font = '800 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 0, -.6);
  g.restore(); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
