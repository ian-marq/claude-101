'use strict';
// 화면: 카드 · 상단 · 알림 · 상세 시트 · 범례 · 폰 QR · 실시간 연결

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const base = (p) => String(p || '').split(/[\\/]/).filter(Boolean).pop() || '';
const STATUS = { working: ['일하는 중', '#d48a1f'], waiting: ['응답 필요', '#e5534b'], done: ['완료', '#2f9e6a'], idle: ['쉬는 중', '#a39a90'], failed: ['실패', '#e5534b'] };

const sv = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  read: sv('<path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  web: sv('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>'),
  edit: sv('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>'),
  write: sv('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>'),
  run: sv('<path d="M4 17l6-6-6-6M12 19h8"/>'),
  test: sv('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  git: sv('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 4-6 3-10 5"/>'),
  plan: sv('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>'),
  delegate: sv('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>'),
  mcp: sv('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M22 7l-10 6L2 7"/>'),
  idle: sv('<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>'),
  wait: sv('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  done: sv('<path d="M20 6L9 17l-5-5"/>'),
  house: sv('<path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>'),
  cap: sv('<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
  commit: sv('<circle cx="12" cy="12" r="3.5"/><path d="M2 12h6.5M15.5 12H22"/>'),
  pr: sv('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7M18 15.5V9a2 2 0 00-2-2h-4"/>'),
};
const DOING = { read: '도서관에서 읽는 중', search: '들판에서 찾는 중', web: '전망대에서 웹 탐색', edit: '공방에서 고치는 중', write: '공터에 새 집 짓는 중', run: '공장에서 명령 실행', test: '훈련장에서 테스트', git: '부두에서 git 작업', plan: '회관에서 계획 짜는 중', delegate: '회관에서 학생들에게 일 나누는 중', mcp: '우체국에서 외부 도구 사용' };
const shortDetail = (k, d) => (/^(read|edit|write)$/.test(k) ? base(d) : d) || '';

// ── 카드 ────────────────────────────────────────────────────────────────────
class Card {
  constructor(v) {
    this.el = document.createElement('article'); this.el.className = 'card';
    this.el.innerHTML = `<div class="scene"><canvas></canvas><div class="tag"><i></i><span></span></div><div class="where"></div><div class="pin" hidden></div></div>
      <div class="info"><div class="name"><b></b><span></span></div><div class="title"></div><div class="act"><span class="ico"></span><span class="txt"></span></div><div class="log"></div><div class="stats"></div></div>`;
    this.cv = this.el.querySelector('canvas'); this.g = this.cv.getContext('2d');
    this.pin = this.el.querySelector('.pin');
    this.el.onclick = () => openDetail(v.id);
    this.scene = new VillageScene(v);
    this.update(v);
  }
  update(v) {
    this.v = v; this.scene.setData(v);
    const L = this.scene.L, [slabel, scolor] = STATUS[v.status] || STATUS.idle;
    this.el.className = 'card ' + v.status;
    const pct = v.ctx ? v.ctx.pct : .2, dt = daytime(pct);
    this.el.querySelector('.scene').style.background = `linear-gradient(180deg, ${dt.sky[0]} 0%, ${dt.sky[1]} 75%)`;
    const tag = this.el.querySelector('.tag'); tag.querySelector('i').style.background = scolor; tag.querySelector('span').textContent = slabel;
    this.el.querySelector('.where').textContent = `${L.style.name} · ${L.biome.name}${v.where === 'cloud' ? ' · ☁' : ''}`;
    this.el.querySelector('.name b').textContent = v.name;
    this.el.querySelector('.name span').textContent = v.branch || '';
    this.el.querySelector('.title').textContent = v.title;
    const act = this.el.querySelector('.act');
    act.className = 'act ' + v.status;
    act.querySelector('.ico').innerHTML = ICONS[v.kind] || ICONS.idle;
    act.querySelector('.txt').innerHTML = activityText(v);
    this.el.querySelector('.log').innerHTML = [...(v.log || [])].reverse().map((l) => `<span>${ICONS[l.kind] || ''}${esc(clip(shortDetail(l.kind, l.detail) || l.tool, 22))}</span>`).join('');
    const kids = v.students.filter((s) => !s.done).length, bar = pct > .9 ? '#e5534b' : pct > .75 ? '#e08a3c' : '#5fb98a';
    this.el.querySelector('.stats').innerHTML =
      `<span class="s" title="고친 파일 = 집">${ICONS.house}${v.stats.files}</span><span class="s" title="일하는 서브에이전트 = 학생">${ICONS.cap}${kids}</span>`
      + (v.stats.commits ? `<span class="s" title="커밋 = 부두의 상자">${ICONS.commit}${v.stats.commits}</span>` : '')
      + (v.stats.prs ? `<span class="s" title="PR">${ICONS.pr}${v.stats.prs}</span>` : '')
      + `<span class="day" title="컨텍스트 ${Math.round(pct * 100)}% — 하루가 저무는 정도">${{ day: '낮', golden: '오후', dusk: '저녁', night: '밤' }[dt.name]}<span class="track"><b style="width:${Math.max(3, pct * 100)}%;background:${bar}"></b></span></span>`;
  }
  draw(t, dt) {
    const css = this.cv.clientWidth || 360, dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const pw = Math.round(css * dpr), ph = Math.round(pw * VH / VW);
    if (this.cv.width !== pw) { this.cv.width = pw; this.cv.height = ph; }
    const g = this.g;
    g.setTransform(pw / VW, 0, 0, pw / VW, 0, 0); g.clearRect(0, 0, VW, VH);
    this.scene.draw(g, t, dt);
    // 지금 장소 위에 말풍선 라벨
    const lp = this.scene.labelPos, v = this.v;
    if (lp && (v.status !== 'idle')) {
      this.pin.hidden = false;
      this.pin.style.left = (lp[0] * 100) + '%'; this.pin.style.top = (lp[1] * 100) + '%';
      const k = v.kind, text = v.status === 'waiting' ? '응답 필요' : v.status === 'done' ? '완료!' : `${esc(PLACE_LABEL[lp[2]] || '')} <em>${esc(clip(shortDetail(k, v.detail) || v.tool || '', 24))}</em>`;
      if (this.pinText !== text) { this.pin.innerHTML = text; this.pinText = text; }
      this.pin.className = 'pin ' + v.status;
    } else this.pin.hidden = true;
  }
}
function activityText(v) {
  if (v.status === 'waiting') return esc(v.detail || v.note || '내 차례를 기다리고 있어요');
  if (v.status === 'done') return esc(v.detail || v.note || '끝났어요 · 확인해 주세요');
  if (v.status === 'failed') return '문제가 생겼어요';
  if (v.status === 'idle') return '촌장이 여관에서 자는 중';
  const kids = v.students.filter((s) => !s.done).length;
  return `${DOING[v.kind] || '일하는 중'} <em>· ${esc(clip(shortDetail(v.kind, v.detail) || v.tool, 40))}</em>${kids ? ` <em>· 학생 ${kids}명</em>` : ''}`;
}

// ── 화면 ───────────────────────────────────────────────────────────────────
const cards = new Map();
let data = { villages: [], cloud: {} };
const rank = { waiting: 0, working: 1, done: 2, failed: 2, idle: 3 };
function render() {
  const vs = data.villages, ids = new Set(vs.map((v) => v.id));
  for (const [id, c] of cards) if (!ids.has(id)) { c.el.remove(); cards.delete(id); }
  for (const v of vs) { const c = cards.get(v.id); if (c) c.update(v); else cards.set(v.id, new Card(v)); }
  for (const where of ['local', 'cloud']) {
    const grid = where === 'local' ? $('gLocal') : $('gCloud');
    const list = vs.filter((v) => v.where === where).sort((a, b) => (rank[a.status] - rank[b.status]) || (b.lastAt - a.lastAt));
    if (!list.length) {
      const msg = where === 'local' ? '최근 6시간 안에 열린 로컬 세션이 없어요.'
        : !data.cloud.enabled ? '클라우드 세션도 보려면 <code>node server.js --cloud</code>로 실행하세요.'
        : data.cloud.error ? esc(data.cloud.error) : '최근 클라우드 세션이 없어요.';
      if (grid.dataset.msg !== msg) { grid.innerHTML = `<div class="empty">${msg}</div>`; grid.dataset.msg = msg; }
    } else {
      grid.dataset.msg = ''; grid.querySelector('.empty')?.remove();
      list.forEach((v, i) => { const el = cards.get(v.id).el; if (grid.children[i] !== el) grid.insertBefore(el, grid.children[i] || null); });
    }
  }
  hud();
  if (dlg.open && dlg.dataset.id) openDetail(dlg.dataset.id, true);
}
let last = 0;
function loop(t) {
  const dt = last ? (t - last) / 1000 : 0;
  if (t - last > 30) {
    for (const c of cards.values()) { const r = c.cv.getBoundingClientRect(); if (r.bottom > -50 && r.top < innerHeight + 50) c.draw(t, dt); else c.scene.stepActors(Math.min(.1, dt)); }
    last = t;
  }
  requestAnimationFrame(loop);
}

// ── 상단 / 알림 ─────────────────────────────────────────────────────────────
const dlg = $('dlg'), bell = $('bell');
let notify = false; try { notify = localStorage.getItem('cv-notify') === '1'; } catch {}
const paintBell = () => bell.classList.toggle('on', notify);
paintBell();
bell.onclick = async () => {
  notify = !notify;
  if (notify && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
  try { localStorage.setItem('cv-notify', notify ? '1' : '0'); } catch {}
  paintBell(); if (notify) ding();
};
let actx;
function ding() {
  try {
    actx = actx || new AudioContext();
    [880, 1175].forEach((f, i) => { const o = actx.createOscillator(), v = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
      const s = actx.currentTime + i * .14; v.gain.setValueAtTime(.0001, s); v.gain.exponentialRampToValueAtTime(.12, s + .02); v.gain.exponentialRampToValueAtTime(.0001, s + .35);
      o.connect(v).connect(actx.destination); o.start(s); o.stop(s + .4); });
  } catch {}
}
const seenWait = new Set(); let firstHud = true;
function hud() {
  const vs = data.villages, n = (f) => vs.filter(f).length;
  const waiting = vs.filter((v) => v.status === 'waiting');
  const kids = vs.reduce((a, v) => a + v.students.filter((s) => !s.done).length, 0);
  const parts = [`마을 ${vs.length}곳`];
  if (n((v) => v.status === 'working')) parts.push(`${n((v) => v.status === 'working')}곳 일하는 중`);
  if (waiting.length) parts.push(`${waiting.length}곳이 기다려요`);
  if (kids) parts.push(`학생 ${kids}명`);
  $('summary').textContent = parts.join(' · ');
  $('cLocal').textContent = `${n((v) => v.where === 'local')}곳`;
  $('cCloud').textContent = data.cloud.enabled ? `${n((v) => v.where === 'cloud')}곳 · claude.ai/code` : 'claude.ai/code';
  document.title = (waiting.length ? `(${waiting.length}) ` : '') + 'Claude Village';
  const wl = $('waitlist');
  wl.style.display = waiting.length ? 'flex' : 'none';
  wl.replaceChildren(...waiting.map((v) => {
    const a = document.createElement('a');
    a.innerHTML = `<b>${esc(clip(v.name, 18))}</b><span>${esc(clip(v.detail || v.note || v.title, 40))}</span>`;
    if (v.url) { a.href = v.url; a.target = '_blank'; a.rel = 'noopener'; } else a.onclick = () => openDetail(v.id);
    return a;
  }));
  for (const v of waiting) if (!seenWait.has(v.id)) {
    seenWait.add(v.id);
    if (!firstHud && notify) { ding(); try { if (Notification.permission === 'granted') new Notification(`${v.name} — 응답이 필요해요`, { body: v.detail || v.note || v.title }); } catch {} }
  }
  for (const id of [...seenWait]) if (!waiting.some((v) => v.id === id)) seenWait.delete(id);
  firstHud = false;
}

// ── 상세 시트 ───────────────────────────────────────────────────────────────
$('dlgx').onclick = () => dlg.close();
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
function openDetail(id, refresh) {
  const v = data.villages.find((x) => x.id === id); if (!v) return;
  const L = cards.get(id)?.scene.L;
  const ago = v.lastAt ? Math.round((Date.now() - v.lastAt) / 1000) : null;
  const kids = v.students.filter((s) => !s.done);
  const kv = (k, val) => (val ? `<dt>${k}</dt><dd>${val}</dd>` : '');
  const mix = Object.entries(v.mix || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${KIND_LABEL[k] || k} ${n}`).join(' · ');
  dlgb.innerHTML = `<h3>${esc(v.title)}</h3><div class="sub">${esc(v.name)}${v.branch ? ' · ' + esc(v.branch) : ''}${L ? ` · ${esc(L.style.name)} (${esc(L.style.desc)}) · ${esc(L.biome.name)}` : ''}</div>`
    + `<dl class="kv">`
    + kv('상태', `<span style="color:${(STATUS[v.status] || STATUS.idle)[1]};font-weight:600">${(STATUS[v.status] || STATUS.idle)[0]}</span>`)
    + kv('지금', activityText(v))
    + kv('한 일', mix)
    + kv('컨텍스트', v.ctx ? `${Math.round(v.ctx.used / 1000)}k / ${Math.round(v.ctx.max / 1000)}k (${Math.round(v.ctx.pct * 100)}%)` : '')
    + kv('기록', `파일 ${v.stats.files}개 · 수정 ${v.stats.edits} · 커밋 ${v.stats.commits} · 푸시 ${v.stats.pushes} · PR ${v.stats.prs} · 테스트 ✓${v.tests?.pass || 0} ✗${v.tests?.fail || 0}`)
    + kv('마지막 활동', ago != null ? (ago < 60 ? `${ago}초 전` : ago < 3600 ? `${Math.round(ago / 60)}분 전` : `${Math.round(ago / 3600)}시간 전`) : '')
    + `</dl>`
    + (v.log?.length ? `<h4>최근에 한 일</h4><div class="list">${[...v.log].reverse().map((l) => `<div>${ICONS[l.kind] || ''}${esc(l.tool)} <span style="margin-left:0;color:var(--muted)">${esc(clip(shortDetail(l.kind, l.detail), 34))}</span><span>${esc(PLACE_LABEL[PLACE_OF[l.kind]] || '')}</span></div>`).join('')}</div>` : '')
    + (kids.length ? `<h4>학생 ${kids.length}명 (서브에이전트)</h4><div class="list">${kids.map((s) => `<div>${ICONS.cap}<b>${esc(s.type)}</b> ${esc(clip(s.desc, 26))}<span>${esc(PLACE_LABEL[PLACE_OF[s.kind]] || '')}${s.tool ? ' · ' + esc(s.tool) : ''}</span></div>`).join('')}</div>` : '')
    + (v.houses.length ? `<h4>지은 집 ${v.houses.length}채 (고친 파일)</h4><div class="list">${v.houses.slice(-10).reverse().map((h) => `<div>${ICONS.house}${esc(h.name)}<span>${h.edits}번 수정</span></div>`).join('')}</div>` : '')
    + `<h4>이어서 하기</h4>`
    + (v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">claude.ai에서 열기 ↗</a>` : '')
    + (v.resume ? `<code>${esc(v.resume)}</code>` : '');
  dlg.dataset.id = id;
  if (!refresh) dlg.showModal();
}
$('legend').onclick = () => {
  dlg.dataset.id = '';
  const rows = [['read', 'library', '파일을 읽으면 도서관 안에서 책을 읽어요'], ['search', 'field', 'Grep·Glob 은 들판에서 돋보기로 찾아요'], ['web', 'lookout', '웹 검색은 전망대에서 멀리 내다봐요'],
    ['edit', 'workshop', '파일을 고치면 공방에서 망치질'], ['write', 'lot', '새 파일은 공터에 집을 새로 지어요 → 다 지으면 마을에 집이 생겨요'], ['run', 'factory', '명령은 공장 기계가 돌아가요'],
    ['test', 'testground', '테스트는 훈련장 과녁. 통과 초록 깃발 · 실패 과녁에 불'], ['git', 'dock', '커밋은 부두에 상자, 푸시하면 배가 떠나요'], ['plan', 'hall', '할 일·계획은 회관 게시판에 핀'],
    ['delegate', 'hall', '서브에이전트를 부르면 회관에서 학생이 나와요'], ['mcp', 'post', 'MCP·외부 도구는 우체국에서 비둘기를 날려요'], ['wait', 'plaza', '응답이 필요하면 광장 종이 울리고 촌장이 손을 흔들어요'], ['idle', 'inn', '쉬면 촌장이 여관에서 자요']];
  dlgb.innerHTML = `<h3>마을에서 일어나는 일</h3><div class="sub">마을 = 세션 하나. 촌장 = 메인 Claude, 학생 = 서브에이전트. 일이 벌어지는 건물은 지붕이 열려 안이 보여요.</div>`
    + `<div class="list">${rows.map(([k, p, d]) => `<div>${ICONS[k]}<b style="white-space:nowrap">${PLACE_LABEL[p]}</b><span style="margin-left:0;color:var(--fg);white-space:normal">${d}</span></div>`).join('')}</div>`
    + `<h4>마을 모양</h4><div class="list">${Object.values(STYLES).map((s) => `<div><b style="white-space:nowrap">${s.name}</b><span style="margin-left:0;white-space:normal">${s.desc}</span></div>`).join('')}</div>`
    + `<div class="sub" style="margin-top:12px">컨텍스트를 쓸수록 하루가 저물어요(낮 → 오후 → 저녁 → 밤). 압축되면 새로운 하루. 지형 색은 레포마다 고정돼요. 전체 조각은 <a href="kit.html">에셋 키트</a>에서 볼 수 있어요.</div>`;
  dlg.showModal();
};

// ── 폰으로 보기 (QR) ────────────────────────────────────────────────────────
fetch('/lan').then((r) => r.json()).then((j) => {
  if (!j.urls || !j.urls.length) return;
  $('phone').hidden = false;
  $('phone').onclick = async () => {
    dlg.dataset.id = '';
    const u = j.urls[0].url;
    dlgb.innerHTML = `<h3>폰으로 보기</h3><div class="sub">폰 카메라로 찍으세요. 노트북과 같은 와이파이(또는 Tailscale)에 있어야 해요.</div><div id="qr"></div><div class="list">`
      + j.urls.map((l) => `<div style="word-break:break-all">${esc(l.url)}<span>${l.tailscale ? 'Tailscale' : esc(l.ifname)}</span></div>`).join('')
      + `</div><div class="sub" style="margin-top:12px">이 주소에는 접속 토큰이 들어 있어요. 다른 사람과 공유하지 마세요.</div>`;
    dlg.showModal();
    try {
      if (!window.qrcode) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
      const q = qrcode(0, 'M'); q.addData(u); q.make(); $('qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch { $('qr').textContent = 'QR을 불러오지 못했어요. 아래 주소를 폰에 직접 입력하세요.'; }
  };
}).catch(() => {});

// ── 실시간 연결 ─────────────────────────────────────────────────────────────
function connect() {
  const es = new EventSource('/events');
  es.onopen = () => $('live').classList.add('ok');
  es.onmessage = (e) => { data = JSON.parse(e.data); render(); };
  es.onerror = () => { $('live').classList.remove('ok'); $('summary').textContent = '다시 연결하는 중…'; };
}
connect(); requestAnimationFrame(loop);
