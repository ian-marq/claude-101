#!/usr/bin/env node
// Claude Office — 로컬 + 클라우드 Claude Code 세션을 픽셀 빌딩으로 보여주는 서버.
// 의존성 없음. 127.0.0.1 에만 열림. 훅/설정 변경 없음 (전부 읽기 전용).
//
//   node server.js              로컬만
//   node server.js --cloud      로컬 + 클라우드 (claude.ai/code 세션)
//   node server.js --demo       가짜 세션으로 화면 구경
//   옵션: --port 4545  --hours 6  --cloud-feed ./cloud.json  --include-bridge

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const httpMod = require('http');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const PORT = Number(opt('--port', process.env.PORT || 4545));
const HOURS = Number(opt('--hours', 6));
const DEMO = flag('--demo');
const CLOUD = flag('--cloud') || DEMO;
const CLOUD_FEED = opt('--cloud-feed', null);
const INCLUDE_BRIDGE = flag('--include-bridge');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const LIVE_DIR = path.join(CLAUDE_DIR, 'sessions');

const TICK_MS = 250;
const now = () => Date.now();

// ── 툴 이름 → 방 ────────────────────────────────────────────────────────────
// lobby: 나를 기다림 / lounge: 쉬는 중
function roomFor(tool) {
  if (!tool) return 'lounge';
  if (/^(Read|Grep|Glob|LS|NotebookRead|ToolSearch)$/.test(tool)) return 'library';
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) return 'studio';
  if (/^(Bash|BashOutput|KillShell|Monitor|TaskStop)$/.test(tool)) return 'engine';
  if (/^(Agent|Task|Workflow|SendMessage)$/.test(tool)) return 'meeting';
  if (/^(WebSearch|WebFetch)$/.test(tool) || tool.startsWith('mcp__')) return 'radio';
  return 'studio';
}

function toolDetail(name, input) {
  if (!input || typeof input !== 'object') return '';
  const s = input.description || input.file_path || input.pattern || input.query || input.url
    || input.command || input.prompt || input.path || '';
  const str = String(s).replace(/\s+/g, ' ');
  return str.length > 60 ? str.slice(0, 57) + '…' : str;
}

// ── 로컬: jsonl tail ───────────────────────────────────────────────────────
const local = new Map(); // sessionId -> state

function newLocal(id, file) {
  return {
    id, file, where: 'local', offset: 0, partial: '',
    title: '', cwd: '', branch: '', lastPrompt: '',
    tool: null, detail: '', toolAt: 0, pending: new Map(),
    subagents: new Set(), turnEnded: false, lastAt: 0,
    ctxUsed: 0, ctxMax: 0, toolCount: 0, errorAt: 0, compactAt: 0,
    live: null,
  };
}

function ingest(s, o) {
  const ts = Date.parse(o.timestamp || '') || s.lastAt;
  if (ts) s.lastAt = Math.max(s.lastAt, ts);
  if (o.cwd) s.cwd = o.cwd;
  if (o.gitBranch) s.branch = o.gitBranch;
  switch (o.type) {
    case 'ai-title': s.title = o.aiTitle || s.title; return;
    case 'summary': if (!s.title) s.title = o.summary || ''; return;
    case 'last-prompt': s.lastPrompt = o.lastPrompt || ''; return;
    case 'system':
      if (o.subtype === 'compact_boundary') s.compactAt = ts;
      if (o.subtype === 'stop_hook_summary' || o.subtype === 'turn_duration') s.turnEnded = true;
      return;
    case 'user': {
      const c = o.message && o.message.content;
      if (typeof c === 'string') { s.turnEnded = false; if (!o.isMeta) s.lastPrompt = c.slice(0, 80); return; }
      if (!Array.isArray(c)) return;
      for (const b of c) {
        if (b.type === 'tool_result') {
          s.pending.delete(b.tool_use_id);
          s.subagents.delete(b.tool_use_id);
          if (b.is_error) s.errorAt = ts;
        } else if (b.type === 'text') s.turnEnded = false;
      }
      return;
    }
    case 'assistant': {
      const m = o.message || {};
      if (o.isSidechain) return; // 서브에이전트 내부 기록은 본체 캐릭터를 흔들지 않게
      const u = m.usage;
      if (u) s.ctxUsed = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      for (const b of m.content || []) {
        if (b.type !== 'tool_use') continue;
        s.tool = b.name; s.detail = toolDetail(b.name, b.input); s.toolAt = ts; s.toolCount++;
        s.pending.set(b.id, { name: b.name, at: ts });
        if (b.name === 'Agent' || b.name === 'Task') s.subagents.add(b.id);
      }
      s.turnEnded = ['end_turn', 'stop_sequence', 'max_tokens', 'refusal'].includes(m.stop_reason);
      if (s.turnEnded) s.pending.clear();
      return;
    }
  }
}

function readNew(s) {
  let st;
  try { st = fs.statSync(s.file); } catch { return; }
  if (st.size < s.offset) { s.offset = 0; s.partial = ''; } // 잘렸으면 처음부터
  if (st.size === s.offset) return;
  const fd = fs.openSync(s.file, 'r');
  try {
    const len = st.size - s.offset;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, s.offset);
    s.offset = st.size;
    const text = s.partial + buf.toString('utf8');
    const lines = text.split('\n');
    s.partial = lines.pop();
    for (const line of lines) {
      if (!line) continue;
      try { ingest(s, JSON.parse(line)); } catch { /* 깨진 줄 무시 */ }
    }
  } finally { fs.closeSync(fd); }
}

let lastScan = 0;
function scanLocal() {
  if (now() - lastScan < 2000) return; // 새 파일 탐색은 2초마다, tail 은 매 틱
  lastScan = now();
  const cutoff = now() - HOURS * 3600e3;
  let dirs = [];
  try { dirs = fs.readdirSync(PROJECTS_DIR); } catch { return; }
  for (const d of dirs) {
    const dir = path.join(PROJECTS_DIR, d);
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of files) {
      const id = f.slice(0, -6);
      if (local.has(id)) continue;
      const file = path.join(dir, f);
      try { if (fs.statSync(file).mtimeMs < cutoff) continue; } catch { continue; }
      local.set(id, newLocal(id, file));
    }
  }
  for (const [id, s] of local) {
    if (s.lastAt && s.lastAt < cutoff) local.delete(id);
  }
}

// ~/.claude/sessions/<pid>.json : 살아있는 CLI 프로세스의 상태 (busy/idle/waiting/blocked)
function readLive() {
  const byId = new Map();
  let files = [];
  try { files = fs.readdirSync(LIVE_DIR).filter((f) => /^\d+\.json$/.test(f)); } catch { return byId; }
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(LIVE_DIR, f), 'utf8'));
      if (!j.sessionId || !j.pid) continue;
      try { process.kill(j.pid, 0); } catch (e) { if (e.code === 'ESRCH') continue; }
      byId.set(j.sessionId, j);
    } catch { /* 쓰는 중 */ }
  }
  return byId;
}

function localStatus(s) {
  const t = now();
  if (s.live) {
    if (s.live.status === 'waiting' || s.live.status === 'blocked') return 'waiting';
    if (s.live.status === 'busy') return 'working';
    if (s.live.status === 'idle') return s.turnEnded && t - s.lastAt < 30 * 60e3 ? 'done' : 'idle';
  }
  // live 파일이 없으면 jsonl 만으로 추정
  if (s.pending.size && t - s.toolAt > 8000 && !/^(Bash|Agent|Task|Monitor|Workflow)$/.test(s.tool || '')) return 'waiting';
  if (!s.turnEnded && t - s.lastAt < 90e3) return 'working';
  if (s.turnEnded && t - s.lastAt < 30 * 60e3) return 'done';
  return 'idle';
}

function localSnapshot() {
  const live = readLive();
  const out = [];
  for (const s of local.values()) {
    readNew(s);
    s.live = live.get(s.id) || null;
    if (!s.lastAt) continue;
    const status = localStatus(s);
    out.push({
      id: s.id, where: 'local',
      name: (s.live && s.live.name) || path.basename(s.cwd || '') || s.id.slice(0, 8),
      title: s.title || s.lastPrompt || '(제목 없음)',
      repo: path.basename(s.cwd || ''), branch: s.branch,
      status, room: status === 'waiting' || status === 'done' ? 'lobby' : status === 'working' ? roomFor(s.tool) : 'lounge',
      tool: s.tool, detail: s.detail, toolCount: s.toolCount,
      subagents: s.subagents.size,
      ctx: s.ctxUsed ? { used: s.ctxUsed, max: s.ctxMax || guessMax(s.ctxUsed) } : null,
      error: now() - s.errorAt < 4000, compacted: now() - s.compactAt < 8000,
      lastAt: s.lastAt,
    });
  }
  return out;
}
const guessMax = (u) => (u > 200000 ? 1000000 : 200000);

// ── 클라우드 ───────────────────────────────────────────────────────────────
// claude.ai/code 세션은 내 PC 에 jsonl 이 없어서 API 로 가져온다.
// Claude Code CLI 가 `--teleport` 목록에 쓰는 것과 같은 엔드포인트 (공개 문서화된 API 아님 → 바뀔 수 있음).
const API = process.env.CLAUDE_OFFICE_API || 'https://api.anthropic.com';
const cloud = { sessions: [], error: null, at: 0, events: new Map() };

function readCredentials() {
  if (process.env.CLAUDE_OFFICE_TOKEN) return { token: process.env.CLAUDE_OFFICE_TOKEN, org: process.env.CLAUDE_OFFICE_ORG };
  let raw = null;
  try { raw = fs.readFileSync(path.join(CLAUDE_DIR, '.credentials.json'), 'utf8'); } catch {}
  if (!raw && process.platform === 'darwin') {
    try { raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch {}
  }
  let token = null, expiresAt = 0;
  try { const j = JSON.parse(raw).claudeAiOauth; token = j.accessToken; expiresAt = j.expiresAt || 0; } catch {}
  let org = process.env.CLAUDE_OFFICE_ORG || null;
  for (const p of [path.join(os.homedir(), '.claude.json'), path.join(CLAUDE_DIR, '.claude.json')]) {
    if (org) break;
    try { org = JSON.parse(fs.readFileSync(p, 'utf8')).oauthAccount.organizationUuid; } catch {}
  }
  return { token, org, expiresAt };
}

function apiGet(p, creds) {
  return new Promise((resolve, reject) => {
    const headers = {
      Authorization: `Bearer ${creds.token}`, 'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json', 'User-Agent': 'claude-office/0.1',
    };
    if (creds.org) headers['x-organization-uuid'] = creds.org;
    const req = (API.startsWith('http:') ? httpMod : https).get(API + p, { headers, timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { status: res.statusCode }));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// 응답 모양이 조금 달라도 버티도록 느슨하게 읽는다 (list_sessions MCP 결과와도 호환)
function normCloud(r) {
  const em = r.external_metadata || {};
  const pts = r.post_turn_summary || em.post_turn_summary || {};
  const bucket = String(r.status_bucket || '').replace('SESSION_STATUS_BUCKET_', '').toLowerCase();
  const st = String(r.session_status || r.status || '').replace('SESSION_STATUS_', '').toLowerCase();
  const cat = pts.status_category;
  let status = 'idle';
  if (bucket === 'blocked' || cat === 'need_input' || pts.needs_action) status = 'waiting';
  else if (bucket === 'working' || st === 'running') status = 'working';
  else if (bucket === 'review_ready' || bucket === 'completed' || cat === 'completed' || cat === 'review_ready') status = 'done';
  else if (bucket === 'failed') status = 'failed';
  const src = (r.session_context && r.session_context.sources) || (r.config && r.config.sources) || [];
  const url = (src.find((x) => x.git_repository || x.type === 'git_repository') || {});
  const gitUrl = (url.git_repository && url.git_repository.url) || url.url || '';
  const cu = em.context_usage || {};
  return {
    id: r.id, where: 'cloud', kind: r.environment_kind || 'anthropic_cloud',
    name: gitUrl ? gitUrl.replace(/^.*\//, '').replace(/\.git$/, '') : 'cloud',
    title: r.title || '(제목 없음)',
    repo: gitUrl.replace(/^.*github\.com\//, '').replace(/\.git$/, ''),
    branch: '', status,
    note: pts.needs_action || pts.status_detail || '',
    ctx: cu.used_tokens ? { used: cu.used_tokens, max: cu.max_tokens || guessMax(cu.used_tokens) } : null,
    lastAt: Date.parse(r.updated_at || '') || 0,
    url: r.id ? `https://claude.ai/code/${r.id}` : null,
  };
}

// 이벤트에서 마지막 tool_use 를 찾는다 (구조가 깊어도 재귀로)
function lastToolUse(events) {
  let best = null;
  const walk = (x, at) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { for (const y of x) walk(y, at); return; }
    if (x.type === 'tool_use' && x.name) { if (!best || at >= best.at) best = { name: x.name, input: x.input, at }; return; }
    for (const k in x) if (k !== 'input' && k !== 'signature') walk(x[k], at);
  };
  for (const e of events || []) walk(e, Date.parse(e.created_at || e.timestamp || '') || 0);
  return best;
}

let cloudBusy = false, lastEventsPoll = 0;
async function pollCloud() {
  if (cloudBusy) return;
  cloudBusy = true;
  try {
    let rows;
    if (DEMO) rows = demoCloud();
    else if (CLOUD_FEED) {
      const j = JSON.parse(fs.readFileSync(CLOUD_FEED, 'utf8'));
      rows = (j.ccr || j).data || j;
    } else {
      const creds = readCredentials();
      if (!creds.token) throw new Error('로그인 정보를 못 찾음 — `claude` 로 한 번 로그인하거나 CLAUDE_OFFICE_TOKEN 을 지정');
      const j = await apiGet('/v1/code/sessions?limit=50', creds);
      rows = j.data || [];
      // 일하는 세션만 최근 이벤트를 조금 더 자세히
      if (now() - lastEventsPoll > 3000) {
        lastEventsPoll = now();
        const working = rows.map(normCloud).filter((s) => s.status === 'working').slice(0, 8);
        await Promise.all(working.map(async (s) => {
          try {
            const ev = await apiGet(`/v1/code/sessions/${encodeURIComponent(s.id)}/events?limit=30&sort_order=desc`, creds);
            const t = lastToolUse(ev.data || []);
            if (t) cloud.events.set(s.id, { tool: t.name, detail: toolDetail(t.name, t.input), at: t.at });
          } catch { /* 이벤트는 없어도 됨 */ }
        }));
      }
    }
    const cutoff = now() - HOURS * 3600e3;
    cloud.sessions = rows.map(normCloud)
      .filter((s) => s.id && (INCLUDE_BRIDGE || s.kind !== 'bridge'))
      .filter((s) => s.status === 'working' || s.status === 'waiting' || s.lastAt > cutoff);
    cloud.error = null;
  } catch (e) {
    cloud.error = e.status === 401 ? '토큰 만료 — 터미널에서 `claude` 를 한 번 실행하면 갱신돼요'
      : e.status === 403 ? '권한 없음 (403) — 이 계정/조직에서 API 접근이 막혀 있어요'
      : String(e.message || e);
  } finally {
    cloud.at = now();
    cloudBusy = false;
  }
}

function cloudSnapshot() {
  return cloud.sessions.map((s) => {
    const ev = cloud.events.get(s.id) || (DEMO && demoTool(s.id));
    const tool = s.status === 'working' && ev ? ev.tool : null;
    return {
      ...s, tool, detail: tool ? ev.detail : s.note,
      room: s.status === 'waiting' || s.status === 'done' ? 'lobby' : s.status === 'working' ? roomFor(tool) : 'lounge',
      subagents: 0,
    };
  });
}

// ── 데모 ───────────────────────────────────────────────────────────────────
const DEMO_TOOLS = [
  ['Read', 'src/app.ts'], ['Grep', 'TODO'], ['Edit', 'src/api/user.ts'], ['Bash', 'npm test'],
  ['WebSearch', 'playwright screenshot'], ['Agent', '테스트 실패 원인 조사'], ['Write', 'README.md'],
  ['mcp__github__create_pull_request', 'feat: office'], ['Glob', '**/*.tsx'], ['Bash', 'git push'],
];
function demoTool(id) {
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const i = Math.floor(now() / 4000 + h) % DEMO_TOOLS.length;
  return { tool: DEMO_TOOLS[i][0], detail: DEMO_TOOLS[i][1] };
}
function demoLocal() {
  const t = now();
  const mk = (id, name, title, status, ctx) => {
    const d = demoTool(id);
    const tool = status === 'working' ? d.tool : null;
    return {
      id, where: 'local', name, title, repo: name, branch: 'main', status,
      room: status === 'waiting' || status === 'done' ? 'lobby' : status === 'working' ? roomFor(tool) : 'lounge',
      tool, detail: status === 'waiting' ? 'Bash 실행 허락 대기' : tool ? d.detail : '', toolCount: 42,
      subagents: tool === 'Agent' ? 2 : 0, ctx: { used: ctx, max: 200000 },
      error: status === 'working' && (t / 1000 | 0) % 17 === 0, compacted: false, lastAt: t,
    };
  };
  return [
    mk('demo-l1', 'web-app', '로그인 페이지 리팩터링', 'working', 120000),
    mk('demo-l2', 'api-server', 'N+1 쿼리 수정', 'working', 64000),
    mk('demo-l3', 'infra', 'terraform plan 검토', (t / 15000 | 0) % 2 ? 'waiting' : 'working', 30000),
    mk('demo-l4', 'notes', '회의록 정리', 'idle', 12000),
  ];
}
function demoCloud() {
  const t = new Date().toISOString();
  return [
    { id: 'session_demo_c1', title: 'CI 고치기', status_bucket: 'SESSION_STATUS_BUCKET_WORKING', updated_at: t, environment_kind: 'anthropic_cloud', external_metadata: { context_usage: { used_tokens: 410000, max_tokens: 1000000 } } },
    { id: 'session_demo_c2', title: '대시보드 리포트', status_bucket: 'SESSION_STATUS_BUCKET_REVIEW_READY', updated_at: t, environment_kind: 'anthropic_cloud', post_turn_summary: { status_category: 'review_ready', status_detail: 'PR #12 올림, 리뷰 대기' } },
    { id: 'session_demo_c3', title: '마이그레이션 계획', status_bucket: 'SESSION_STATUS_BUCKET_BLOCKED', updated_at: t, environment_kind: 'anthropic_cloud', post_turn_summary: { status_category: 'need_input', needs_action: 'A안/B안 중 골라주세요' } },
  ];
}

// ── HTTP + SSE ─────────────────────────────────────────────────────────────
const clients = new Set();
let lastPayload = '';

function snapshot() {
  const sessions = [...(DEMO ? demoLocal() : localSnapshot()), ...(CLOUD ? cloudSnapshot() : [])];
  return JSON.stringify({ sessions, cloud: { enabled: CLOUD, error: cloud.error, at: cloud.at }, demo: DEMO });
}

function tick() {
  if (!DEMO) scanLocal();
  const p = snapshot();
  if (p === lastPayload) return;
  lastPayload = p;
  for (const res of clients) res.write(`data: ${p}\n\n`);
}

const INDEX = path.join(__dirname, 'index.html');
const server = http.createServer((req, res) => {
  // 같은 PC 의 다른 사이트가 몰래 읽지 못하게 Host 확인 (DNS rebinding 방지)
  const host = String(req.headers.host || '').replace(/:\d+$/, '');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) { res.writeHead(403); return res.end(); }
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${lastPayload || snapshot()}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(INDEX).pipe(res);
  }
  res.writeHead(404); res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🏢 Claude Office → http://localhost:${PORT}`);
  console.log(`   로컬: ${DEMO ? '데모' : PROJECTS_DIR} (최근 ${HOURS}시간)`);
  console.log(`   클라우드: ${!CLOUD ? '꺼짐 (--cloud 로 켜기)' : DEMO ? '데모' : CLOUD_FEED ? CLOUD_FEED : API + '/v1/code/sessions'}`);
});
setInterval(tick, TICK_MS);
if (CLOUD) { pollCloud(); setInterval(pollCloud, DEMO ? 2000 : 5000); }
