#!/usr/bin/env node
// Claude Village — Claude Code 세션 하나하나를 마을로 보여주는 서버.
// 의존성 없음. 읽기 전용 (훅/설정 안 건드림).
//
//   node server.js              로컬 세션만, 이 PC 에서만 열림
//   node server.js --cloud      + claude.ai/code 클라우드 세션
//   node server.js --lan        폰에서도 보기 (같은 와이파이/Tailscale, 토큰 필요)
//   node server.js --demo       가짜 마을로 구경
//   옵션: --port 4545  --hours 6  --token <고정토큰>  --include-bridge  --cloud-feed file.json

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const PORT = Number(opt('--port', process.env.PORT || 4545));
const HOURS = Number(opt('--hours', 6));
const DEMO = flag('--demo');
const CLOUD = flag('--cloud') || DEMO;
const LAN = flag('--lan');
const TOKEN = opt('--token', process.env.CLAUDE_VILLAGE_TOKEN || crypto.randomBytes(9).toString('base64url'));
const CLOUD_FEED = opt('--cloud-feed', null);
const INCLUDE_BRIDGE = flag('--include-bridge');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const LIVE_DIR = path.join(CLAUDE_DIR, 'sessions');
const now = () => Date.now();

// ── 툴 → 건물 ──────────────────────────────────────────────────────────────
//  library 도서관(조사) · site 공사장(코드 짓기) · factory 공장(명령 실행)
//  hall 마을회관(지시/대기) · post 우체국(외부 서비스) · inn 여관(쉼)
// ── 툴 → 하는 일(kind). 화면에서 kind 가 장소(건물/야외)로 바뀐다 ─────────────
//  read 도서관 · search 들판 · web 전망대 · edit 공방 · write 공터(새 집 짓기)
//  run 공장 · test 훈련장 · git 부두 · plan/delegate 회관 · mcp 우체국
const TEST_CMD = /(^|&&|;|\|)\s*((npm|pnpm|yarn|bun)\s+(run\s+)?test\b|make\s+test\b|(npx\s+|uv\s+run\s+|python3?\s+-m\s+)?(pytest|jest|vitest|mocha|rspec|phpunit|tox|nox)\b|go\s+test\b|cargo\s+test\b|(npx\s+)?playwright\s+test\b)/;
const DATA_CMD = /\b(bq|psql|duckdb|sqlite3|snowsql|dbt|spark-submit|clickhouse)\b/;
function kindOf(tool, input) {
  if (!tool) return null;
  if (/^(Read|NotebookRead)$/.test(tool)) return 'read';
  if (/^(Grep|Glob|LS|ToolSearch)$/.test(tool)) return 'search';
  if (/^(WebSearch|WebFetch)$/.test(tool)) return 'web';
  if (/^(Edit|MultiEdit|NotebookEdit)$/.test(tool)) return 'edit';
  if (tool === 'Write') return 'write';
  if (/^(Bash|PowerShell)$/.test(tool)) {
    const c = String((input && input.command) || '');
    if (/^\s*(git|gh)\b|&&\s*git\b/.test(c)) return 'git';
    if (TEST_CMD.test(c)) return 'test';
    return 'run';
  }
  if (/^(BashOutput|KillShell|Monitor|TaskStop)$/.test(tool)) return 'run';
  if (/^(Agent|Task|Workflow|SendMessage)$/.test(tool)) return 'delegate';
  if (/^(TodoWrite|TaskCreate|TaskUpdate|TaskList|EnterPlanMode|ExitPlanMode|AskUserQuestion)$/.test(tool)) return 'plan';
  return 'mcp'; // mcp__*, Skill, Artifact …
}
const RESEARCHERS = /^(Explore|Plan|claude-code-guide|research.*)$/i;

// 마을 성격: 많이 하는 일에 따라. 툴 15번 쓰면 정해지고 60/200번에 한 번씩 다시 봄
const ARCHETYPES = ['scholar', 'artisan', 'industrial', 'harbor', 'courier', 'miner'];
function archetypeOf(v) {
  const m = v.mix, n = (k) => m[k] || 0;
  const score = {
    scholar: n('read') + n('search') + n('web') * .5,
    artisan: n('edit') + n('write') * 1.2,
    industrial: n('run') + n('test') * 1.2,
    harbor: n('git') * 2.5 + n('web'),
    courier: n('mcp') * 1.5 + n('delegate') * 2.5,
    miner: v.dataScore * 2,
  };
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
}

function toolDetail(input) {
  if (!input || typeof input !== 'object') return '';
  const s = input.description || input.file_path || input.pattern || input.query || input.url
    || input.command || input.prompt || input.path || input.skill || '';
  const str = String(s).replace(/\s+/g, ' ');
  return str.length > 60 ? str.slice(0, 57) + '…' : str;
}

function hashStr(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// ── 마을(세션) 모델: 로컬 jsonl 과 클라우드 이벤트가 같은 함수로 들어온다 ───────
let effectSeq = 0;
function newVillage(id, where) {
  return {
    id, where, title: '', name: '', repo: '', branch: '', cwd: '', lastPrompt: '',
    tool: null, detail: '', toolAt: 0, pending: new Map(), turnEnded: false, lastAt: 0,
    ctxUsed: 0, ctxMax: 0, toolCount: 0, edits: 0, commits: 0, pushes: 0, prs: 0,
    files: new Map(),     // 고친 파일 = 마을의 집
    students: new Map(),  // 서브에이전트 = 학생 (key: Agent tool_use id)
    effects: [], errorAt: 0, compactAt: 0, seen: new Set(),
    kind: null, mix: {}, log: [], todos: 0, tests: { pass: 0, fail: 0 }, dataScore: 0, archetype: null, archAt: 0,
  };
}

function effect(v, kind, text, at) {
  v.effects.push({ id: ++effectSeq, kind, text: text || '', at: at || now() });
  if (v.effects.length > 30) v.effects.shift();
}

function onToolUse(v, b, ts, parent) {
  if (b.id) { if (v.seen.has(b.id)) return; v.seen.add(b.id); }
  const input = b.input || {};
  // 서브에이전트 안에서 일어난 툴 → 학생이 움직임
  if (parent) {
    const st = v.students.get(parent);
    if (st) { st.tool = b.name; st.kind = kindOf(b.name, input); st.detail = toolDetail(input); st.at = ts; }
    return;
  }
  const kind = kindOf(b.name, input);
  v.tool = b.name; v.kind = kind; v.detail = toolDetail(input); v.toolAt = ts; v.toolCount++;
  v.mix[kind] = (v.mix[kind] || 0) + 1;
  v.log.push({ kind, tool: b.name, detail: toolDetail(input), at: ts });
  if (v.log.length > 8) v.log.shift();
  v.pending.set(b.id, { name: b.name, kind, at: ts });
  if (b.name === 'TodoWrite' && Array.isArray(input.todos)) v.todos = input.todos.filter((x) => x.status !== 'completed').length;
  if (b.name === 'TaskCreate') v.todos++;
  if (b.name === 'TaskUpdate' && input.status === 'completed') v.todos = Math.max(0, v.todos - 1);
  if (DATA_CMD.test(String(input.command || ''))) v.dataScore += 2;
  const fpath = String(input.file_path || input.notebook_path || '');
  if (/\.(sql|ipynb|csv|parquet|dbt)$/i.test(fpath)) v.dataScore += 1;
  if (b.name === 'Write' && fpath) effect(v, 'build', path.basename(fpath), ts);
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(b.name)) {
    const fp = input.file_path || input.notebook_path;
    if (fp) {
      const f = v.files.get(fp) || { name: path.basename(fp), path: fp, edits: 0, at: ts };
      f.edits++; f.last = ts;
      if (f.edits === 1) effect(v, 'house', f.name, ts);
      v.files.set(fp, f);
    }
    v.edits++;
  }
  if (b.name === 'Agent' || b.name === 'Task') {
    v.students.set(b.id, { id: b.id, type: input.subagent_type || 'general-purpose', desc: input.description || '', tool: null, detail: '', at: ts, done: false, doneAt: 0 });
    effect(v, 'students', input.description, ts);
  }
  const cmd = b.name === 'Bash' ? String(input.command || '') : '';
  if (/\bgit\s+commit\b/.test(cmd)) { v.commits++; effect(v, 'commit', '', ts); }
  if (/\bgit\s+push\b/.test(cmd)) { v.pushes++; effect(v, 'push', '', ts); }
  if (/\bgh\s+pr\s+create\b/.test(cmd) || /create_pull_request$/.test(b.name)) { v.prs++; effect(v, 'pr', '', ts); }
}

function onToolResult(v, b, ts, parent) {
  if (parent) return;
  const p = v.pending.get(b.tool_use_id);
  v.pending.delete(b.tool_use_id);
  const st = v.students.get(b.tool_use_id);
  if (st) st.resultAt = ts; // 백그라운드 에이전트는 결과가 바로 와서, 끝남 판정은 따로 함
  if (p && p.kind === 'test') { v.tests[b.is_error ? 'fail' : 'pass']++; effect(v, b.is_error ? 'testfail' : 'testpass', '', ts); }
  else if (b.is_error) { v.errorAt = ts; if (p && p.name === 'Bash') effect(v, 'boom', '', ts); }
}

function onAssistant(v, m, ts, parent) {
  if (!parent && m.usage) {
    const u = m.usage;
    v.ctxUsed = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  }
  for (const b of m.content || []) if (b.type === 'tool_use') onToolUse(v, b, ts, parent);
  if (!parent) {
    v.turnEnded = ['end_turn', 'stop_sequence', 'max_tokens', 'refusal'].includes(m.stop_reason);
    if (v.turnEnded) v.pending.clear();
  }
}

function onUser(v, m, ts, parent) {
  const c = m.content;
  if (typeof c === 'string') { if (!parent) { v.turnEnded = false; v.lastPrompt = c.slice(0, 80); } return; }
  for (const b of c || []) {
    if (b.type === 'tool_result') onToolResult(v, b, ts, parent);
    else if (b.type === 'text' && !parent) v.turnEnded = false;
  }
}

// jsonl 한 줄
function ingestLine(v, o, parent) {
  const ts = Date.parse(o.timestamp || '') || v.lastAt || now();
  if (!parent) {
    v.lastAt = Math.max(v.lastAt, ts);
    if (o.cwd) v.cwd = o.cwd;
    if (o.gitBranch) v.branch = o.gitBranch;
  }
  switch (o.type) {
    case 'ai-title': v.title = o.aiTitle || v.title; return;
    case 'summary': if (!v.title) v.title = o.summary || ''; return;
    case 'last-prompt': v.lastPrompt = o.lastPrompt || v.lastPrompt; return;
    case 'system':
      if (parent) return;
      if (o.subtype === 'compact_boundary') { v.compactAt = ts; effect(v, 'dawn', '', ts); }
      if (o.subtype === 'stop_hook_summary' || o.subtype === 'turn_duration') v.turnEnded = true;
      return;
    case 'user': if (o.message && !o.isMeta) onUser(v, o.message, ts, parent); return;
    case 'assistant': if (o.message) onAssistant(v, o.message, ts, parent || (o.isSidechain ? '?' : null)); return;
  }
}

// ── 로컬: jsonl tail (본체 + subagents/*.jsonl) ───────────────────────────
const local = new Map();
const tails = new Map(); // file -> {offset, partial}

function tail(file, fn) {
  let t = tails.get(file);
  if (!t) { t = { offset: 0, partial: '' }; tails.set(file, t); }
  let size;
  try { size = fs.statSync(file).size; } catch { return; }
  if (size < t.offset) { t.offset = 0; t.partial = ''; }
  if (size === t.offset) return;
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(size - t.offset);
    fs.readSync(fd, buf, 0, buf.length, t.offset);
    t.offset = size;
    const lines = (t.partial + buf.toString('utf8')).split('\n');
    t.partial = lines.pop();
    for (const line of lines) if (line) { try { fn(JSON.parse(line)); } catch { /* 깨진 줄 */ } }
  } finally { fs.closeSync(fd); }
}

function tailSubagents(v) {
  const dir = path.join(path.dirname(v.file), v.id, 'subagents');
  let files;
  try { files = fs.readdirSync(dir); } catch { return; }
  for (const f of files) {
    if (!f.endsWith('.meta.json')) continue;
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    const key = meta.toolUseId;
    if (!key) continue;
    let st = v.students.get(key);
    if (!st) { // Agent 툴 호출이 아직 안 읽혔으면 먼저 만들어 둠
      st = { id: key, type: meta.agentType || 'general-purpose', desc: meta.description || '', tool: null, detail: '', at: now(), done: false, doneAt: 0 };
      v.students.set(key, st);
    }
    st.hasMeta = true;
    if (meta.finished && !st.done) { st.done = true; st.doneAt = now(); }
    const jf = path.join(dir, f.replace(/\.meta\.json$/, '.jsonl'));
    tail(jf, (o) => ingestLine(v, o, key));
  }
}

let lastScan = 0;
function scanLocal() {
  if (now() - lastScan < 2000) return;
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
      const v = newVillage(id, 'local');
      v.file = file;
      local.set(id, v);
    }
  }
  for (const [id, v] of local) if (v.lastAt && v.lastAt < cutoff) { local.delete(id); tails.delete(v.file); }
}

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

function localStatus(v, live) {
  const t = now();
  if (live) {
    if (live.status === 'waiting' || live.status === 'blocked') return 'waiting';
    if (live.status === 'busy') return 'working';
    if (live.status === 'idle') return v.turnEnded && t - v.lastAt < 30 * 60e3 ? 'done' : 'idle';
  }
  if (v.pending.size && t - v.toolAt > 8000 && !/^(Bash|Agent|Task|Monitor|Workflow)$/.test(v.tool || '')) return 'waiting';
  if (!v.turnEnded && t - v.lastAt < 90e3) return 'working';
  if (v.turnEnded && t - v.lastAt < 30 * 60e3) return 'done';
  return 'idle';
}

// ── 클라우드 ───────────────────────────────────────────────────────────────
// claude.ai/code 세션은 PC 에 jsonl 이 없어서 API 로 가져온다.
// Claude Code CLI 가 쓰는 엔드포인트 (공개 문서화된 API 아님 → 바뀔 수 있음).
const API = process.env.CLAUDE_VILLAGE_API || 'https://api.anthropic.com';
const cloud = { list: [], error: null, at: 0 };
const cloudVillages = new Map();

function readCredentials() {
  if (process.env.CLAUDE_VILLAGE_TOKEN_API) return { token: process.env.CLAUDE_VILLAGE_TOKEN_API, org: process.env.CLAUDE_VILLAGE_ORG };
  let raw = null;
  try { raw = fs.readFileSync(path.join(CLAUDE_DIR, '.credentials.json'), 'utf8'); } catch {}
  if (!raw && process.platform === 'darwin') {
    try { raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch {}
  }
  let token = null;
  try { token = JSON.parse(raw).claudeAiOauth.accessToken; } catch {}
  let org = process.env.CLAUDE_VILLAGE_ORG || null;
  for (const p of [path.join(os.homedir(), '.claude.json'), path.join(CLAUDE_DIR, '.claude.json')]) {
    if (org) break;
    try { org = JSON.parse(fs.readFileSync(p, 'utf8')).oauthAccount.organizationUuid; } catch {}
  }
  return { token, org };
}

function apiGet(p, creds) {
  return new Promise((resolve, reject) => {
    const headers = {
      Authorization: `Bearer ${creds.token}`, 'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json', 'User-Agent': 'claude-village/0.2',
    };
    if (creds.org) headers['x-organization-uuid'] = creds.org;
    const req = (API.startsWith('http:') ? http : https).get(API + p, { headers, timeout: 10000 }, (res) => {
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

// 응답 모양이 조금 달라도 버티도록 느슨하게 (list_sessions MCP 결과와도 호환)
function normCloud(r) {
  const em = r.external_metadata || {};
  const pts = r.post_turn_summary || em.post_turn_summary || {};
  const bucket = String(r.status_bucket || '').replace('SESSION_STATUS_BUCKET_', '').toLowerCase();
  const st = String(r.session_status || r.status || '').replace('SESSION_STATUS_', '').toLowerCase();
  const cat = pts.status_category;
  let status = 'idle';
  if (bucket === 'blocked' || cat === 'need_input' || pts.needs_action) status = 'waiting';
  else if (bucket === 'working' || st === 'running') status = 'working';
  else if (['review_ready', 'completed'].includes(bucket) || ['completed', 'review_ready'].includes(cat)) status = 'done';
  else if (bucket === 'failed') status = 'failed';
  const src = (r.session_context && r.session_context.sources) || (r.config && r.config.sources) || [];
  const g = src.find((x) => x.git_repository || x.type === 'git_repository') || {};
  const gitUrl = (g.git_repository && g.git_repository.url) || g.url || '';
  const repo = gitUrl.replace(/^.*github\.com\//, '').replace(/\.git$/, '');
  const cu = em.context_usage || {};
  return {
    id: r.id, kind: r.environment_kind || 'anthropic_cloud', status,
    title: r.title || '(제목 없음)', repo, name: repo ? repo.split('/').pop() : '구름마을',
    note: pts.needs_action || pts.status_detail || '',
    ctxUsed: cu.used_tokens || 0, ctxMax: cu.max_tokens || 0,
    lastAt: Date.parse(r.updated_at || '') || 0,
    url: r.id ? `https://claude.ai/code/${r.id}` : null,
  };
}

// 이벤트 하나에서 message 를 찾아 같은 모델로 흘려 넣는다
function findMessage(x, depth = 0) {
  if (!x || typeof x !== 'object' || depth > 4) return null;
  if (x.message && Array.isArray(x.message.content) || (x.message && typeof x.message.content === 'string')) return x;
  for (const k of Object.keys(x)) { const r = findMessage(x[k], depth + 1); if (r) return r; }
  return null;
}
function ingestCloudEvents(v, events) {
  const list = [...events].sort((a, b) => (Date.parse(a.created_at || '') || 0) - (Date.parse(b.created_at || '') || 0));
  for (const e of list) {
    const ts = Date.parse(e.created_at || '') || now();
    const holder = findMessage(e);
    if (!holder) continue;
    const m = holder.message, parent = holder.parent_tool_use_id || null;
    if (m.role === 'assistant') onAssistant(v, m, ts, parent);
    else if (m.role === 'user') {
      // tool_result 는 seen 으로 중복 제거
      const c = Array.isArray(m.content) ? m.content.filter((b) => b.type !== 'tool_result' || !v.seen.has('r' + b.tool_use_id)) : m.content;
      if (Array.isArray(c)) c.forEach((b) => b.type === 'tool_result' && v.seen.add('r' + b.tool_use_id));
      onUser(v, { content: c }, ts, parent);
    }
    if (parent) { const st = v.students.get(parent); if (st) st.at = Math.max(st.at, ts); }
  }
}

let cloudBusy = false, lastEvents = 0;
async function pollCloud() {
  if (cloudBusy || DEMO) return;
  cloudBusy = true;
  try {
    let rows, creds = null;
    if (CLOUD_FEED) { const j = JSON.parse(fs.readFileSync(CLOUD_FEED, 'utf8')); rows = (j.ccr || j).data || j; }
    else {
      creds = readCredentials();
      if (!creds.token) throw new Error('로그인 정보를 못 찾음 — `claude` 로 로그인했는지 확인');
      rows = (await apiGet('/v1/code/sessions?limit=50', creds)).data || [];
    }
    const cutoff = now() - HOURS * 3600e3;
    cloud.list = rows.map(normCloud)
      .filter((s) => s.id && (INCLUDE_BRIDGE || s.kind !== 'bridge'))
      .filter((s) => s.status === 'working' || s.status === 'waiting' || s.lastAt > cutoff);
    for (const s of cloud.list) if (!cloudVillages.has(s.id)) cloudVillages.set(s.id, newVillage(s.id, 'cloud'));
    if (creds && now() - lastEvents > 2500) {
      lastEvents = now();
      const busy = cloud.list.filter((s) => s.status === 'working' || cloudVillages.get(s.id).toolCount === 0).slice(0, 8);
      await Promise.all(busy.map(async (s) => {
        try {
          const ev = await apiGet(`/v1/code/sessions/${encodeURIComponent(s.id)}/events?limit=60&sort_order=desc`, creds);
          ingestCloudEvents(cloudVillages.get(s.id), ev.data || []);
        } catch { /* 이벤트는 없어도 마을은 보임 */ }
      }));
    }
    cloud.error = null;
  } catch (e) {
    cloud.error = e.status === 401 ? '토큰 만료 — 터미널에서 `claude` 를 한 번 실행하면 갱신돼요'
      : e.status === 403 ? '권한 없음 (403) — 이 계정/조직에서 막혀 있어요'
      : String(e.message || e);
  } finally { cloud.at = now(); cloudBusy = false; }
}

// ── 스냅샷 ─────────────────────────────────────────────────────────────────
function studentView(st) {
  const t = now();
  // 메타 파일이 없으면(클라우드) 결과 후 15초 동안 소식 없으면 하교
  if (!st.done && !st.hasMeta && st.resultAt && t - Math.max(st.at, st.resultAt) > 15000) { st.done = true; st.doneAt = t; }
  return {
    id: st.id, type: st.type, desc: st.desc, tool: st.tool, detail: st.detail, done: st.done,
    kind: st.kind || (RESEARCHERS.test(st.type) ? 'read' : 'edit'),
  };
}

function view(v, status, extra) {
  const t = now();
  for (const [k, st] of v.students) if (st.done && t - st.doneAt > 25000) v.students.delete(k);
  const max = v.ctxMax || (v.ctxUsed > 200000 ? 1000000 : 200000);
  const kind = status === 'waiting' ? 'wait' : status === 'done' || status === 'failed' ? 'done'
    : status === 'working' ? (v.kind || 'plan') : 'idle';
  const total = v.toolCount;
  if (!v.archetype || (total >= 15 && v.archAt < 15) || (total >= 60 && v.archAt < 60) || (total >= 200 && v.archAt < 200)) {
    // 툴을 거의 안 썼으면 레포 이름으로 정함 (같은 레포는 늘 같은 마을)
    v.archetype = total >= 15 ? archetypeOf(v) : ARCHETYPES[hashStr(v.repo || v.name || v.id) % ARCHETYPES.length];
    v.archAt = total;
  }
  const houses = [...v.files.values()].sort((a, b) => a.at - b.at).map((f) => ({ name: f.name, path: f.path, edits: f.edits }));
  return {
    id: v.id, where: v.where, status, kind, tool: status === 'working' ? v.tool : null,
    archetype: v.archetype, seed: hashStr(v.repo || v.name || v.id), mix: v.mix, log: v.log.slice(-5), todos: v.todos, tests: v.tests,
    detail: status === 'working' ? v.detail : '',
    name: v.name, title: v.title || v.lastPrompt || '(제목 없음)', repo: v.repo, branch: v.branch,
    ctx: v.ctxUsed ? { used: v.ctxUsed, max, pct: Math.min(1, v.ctxUsed / max) } : null,
    students: [...v.students.values()].map(studentView),
    houses, stats: { files: v.files.size, edits: v.edits, commits: v.commits, pushes: v.pushes, prs: v.prs, tools: v.toolCount },
    effects: v.effects.slice(-12), error: t - v.errorAt < 4000, lastAt: v.lastAt,
    ...extra,
  };
}

function snapshot() {
  const out = [];
  if (DEMO) for (const v of demo.villages) out.push(view(v, v.status, { url: v.url, note: v.note }));
  else {
    const live = readLive();
    for (const v of local.values()) {
      tail(v.file, (o) => ingestLine(v, o, null));
      tailSubagents(v);
      if (!v.lastAt) continue;
      const lv = live.get(v.id);
      v.name = (lv && lv.name) || path.basename(v.cwd || '') || v.id.slice(0, 8);
      v.repo = path.basename(v.cwd || '');
      out.push(view(v, localStatus(v, lv), { resume: `claude --resume ${v.id}` }));
    }
    if (CLOUD) for (const s of cloud.list) {
      const v = cloudVillages.get(s.id);
      Object.assign(v, { name: s.name, title: s.title, repo: s.repo, lastAt: Math.max(v.lastAt, s.lastAt) });
      if (s.ctxUsed) { v.ctxUsed = s.ctxUsed; v.ctxMax = s.ctxMax; }
      const vv = view(v, s.status, { url: s.url, note: s.note });
      if (s.status === 'waiting' || s.status === 'done') vv.detail = s.note;
      out.push(vv);
    }
  }
  return JSON.stringify({ villages: out, cloud: { enabled: CLOUD, error: cloud.error }, demo: DEMO, lan: LAN });
}

// ── 데모: 정해진 각본대로 가짜 이벤트를 같은 모델에 흘려 넣는다 ───────────────
const demo = { villages: [] };
function demoInit() {
  const mk = (id, where, name, title, script, ctx, archetype) => {
    const v = newVillage(id, where);
    Object.assign(v, { name, title, repo: name, branch: 'main', script, i: 0, status: 'working', ctxUsed: ctx, ctxMax: where === 'cloud' ? 1000000 : 200000, lastAt: now() });
    if (archetype) { v.archetype = archetype; v.archAt = 999; }
    if (where === 'cloud') v.url = 'https://claude.ai/code/' + id;
    return v;
  };
  const T = (n, x) => ['tool', n, n === 'Bash' ? { command: x } : /Web/.test(n) ? { query: x, url: x } : /Grep|Glob/.test(n) ? { pattern: x } : n === 'TodoWrite' ? { todos: Array.from({ length: x }, () => ({ status: 'pending' })) } : { file_path: x }];
  const research = [['agent', 'Explore', '코드베이스 조사'], ['agent', 'Explore', '기존 테스트 찾기'], T('Grep', 'useAuth'), ['sub', 0, 'Glob'], ['sub', 1, 'Read'], T('Read', 'src/auth/session.ts'), T('WebSearch', 'oauth pkce 표준'), ['sub', 0, 'Grep'], T('TodoWrite', 4), ['subdone', 0], ['subdone', 1]];
  const build = [T('Edit', 'src/auth/session.ts'), T('Write', 'src/auth/pkce.ts'), T('Edit', 'src/auth/login.tsx'), T('Bash', 'npm test'), ['result', true], T('Edit', 'src/auth/pkce.ts'), T('Bash', 'npm test'), ['result', false], T('Write', 'src/auth/pkce.test.ts'), T('Bash', 'git commit -m "feat: pkce"'), T('Bash', 'git push'), ['wait', 'git push 허락 대기'], T('Bash', 'gh pr create'), ['done', '끝! PR 확인해 주세요'], ['idle']];
  demo.villages = [
    mk('demo-1', 'local', 'web-app', '로그인 PKCE 붙이기', [...research, ...build], 60000, 'artisan'),
    mk('demo-2', 'local', 'api-server', 'N+1 쿼리 수정', [T('Grep', 'findMany'), T('Read', 'src/repo/user.ts'), T('Bash', 'pnpm build'), T('Edit', 'src/repo/user.ts'), T('Edit', 'src/repo/order.ts'), T('Bash', 'pnpm test repo'), ['result', false], ['wait', 'Bash 실행 허락 대기'], T('Bash', 'git commit -m fix'), ['done', 'N+1 해결']], 150000, 'industrial'),
    mk('demo-3', 'local', 'paper-notes', '논문 읽고 정리', [T('WebFetch', 'arxiv.org/abs/2401'), T('Read', 'notes/attention.md'), T('Grep', 'transformer'), T('Read', 'notes/rope.md'), ['idle']], 20000, 'scholar'),
    mk('session_demo_c1', 'cloud', 'infra', 'CI 고치기', [['agent', 'general-purpose', 'CI 로그 분석'], ['sub', 0, 'Bash'], T('mcp__github__get_job_logs', ''), ['sub', 0, 'Read'], T('Edit', '.github/workflows/ci.yml'), ['subdone', 0], T('Bash', 'git push'), T('mcp__slack__send_message', '#dev'), ['done', 'PR #12 올림, 리뷰 대기']], 400000, 'courier'),
    mk('session_demo_c2', 'cloud', 'growth-data', '이탈 분석 쿼리', [T('Read', 'models/churn.sql'), T('Bash', 'bq query --use_legacy_sql=false'), T('Write', 'analysis/churn.ipynb'), T('WebFetch', 'docs.cloud.google.com'), ['wait', 'A안/B안 중 골라주세요']], 700000, 'miner'),
    mk('session_demo_c3', 'cloud', 'release', '릴리스 노트', [T('Bash', 'git log --oneline'), T('Read', 'CHANGELOG.md'), T('Edit', 'CHANGELOG.md'), T('Bash', 'git commit -m release'), T('Bash', 'git push --tags'), T('WebSearch', 'semver'), ['done', 'v1.4.0 태그 푸시']], 300000, 'harbor'),
  ];
}
function demoTick() {
  for (const v of demo.villages) {
    if (v.hold && now() < v.hold) continue;
    const step = v.script[v.i % v.script.length];
    v.i++;
    const ts = now(); v.lastAt = ts;
    const subs = [...v.students.values()];
    switch (step[0]) {
      case 'tool': v.lastId = 'd' + Math.random(); onToolUse(v, { id: v.lastId, name: step[1], input: step[2] }, ts); v.status = 'working'; v.ctxUsed += 5000; break;
      case 'result': onToolResult(v, { tool_use_id: v.lastId, is_error: step[1] }, ts); break;
      case 'agent': onToolUse(v, { id: 'a' + Math.random(), name: 'Agent', input: { subagent_type: step[1], description: step[2] } }, ts); v.status = 'working'; break;
      case 'sub': if (subs[step[1]]) { subs[step[1]].tool = step[2]; subs[step[1]].kind = kindOf(step[2], {}); subs[step[1]].at = ts; } break;
      case 'subdone': if (subs[step[1]]) { subs[step[1]].done = true; subs[step[1]].doneAt = ts; subs[step[1]].hasMeta = true; } break;
      case 'wait': v.status = 'waiting'; v.note = step[1]; v.hold = ts + 9000; break;
      case 'done': v.status = 'done'; v.note = step[1]; v.hold = ts + 9000; break;
      case 'idle': v.status = 'idle'; v.hold = ts + 12000;
        if (v.i >= v.script.length && v.script.length > 1) { const n = newVillage(v.id, v.where); Object.assign(v, { files: n.files, students: n.students, edits: 0, commits: 0, pushes: 0, prs: 0, i: 0, ctxUsed: 30000, log: [], tests: { pass: 0, fail: 0 }, todos: 0 }); effect(v, 'dawn', '', ts); }
        break;
    }
  }
}

// ── HTTP + SSE ─────────────────────────────────────────────────────────────
const clients = new Set();
let lastPayload = '';
function tick() {
  if (!DEMO) scanLocal();
  const p = snapshot();
  if (p === lastPayload) return;
  lastPayload = p;
  for (const res of clients) res.write(`data: ${p}\n\n`);
}

function lanUrls() {
  const out = [];
  for (const [ifname, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) out.push({ ifname, url: `http://${a.address}:${PORT}/?t=${TOKEN}`, tailscale: a.address.startsWith('100.') });
  }
  return out.sort((a, b) => b.tailscale - a.tailscale);
}

function cookie(req, k) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const same = (a, b) => a && b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const host = String(req.headers.host || '').replace(/:\d+$/, '');
  const fromHere = ['127.0.0.1', 'localhost', '[::1]'].includes(host) && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (!LAN && !fromHere) { res.writeHead(403); return res.end('forbidden'); } // DNS rebinding 방지
  if (LAN && !fromHere) {
    const q = u.searchParams.get('t');
    if (same(q, TOKEN)) { // 토큰 붙은 링크로 처음 들어오면 쿠키로 바꾸고 주소창에서 지움
      res.writeHead(302, { 'Set-Cookie': `cv_t=${TOKEN}; HttpOnly; SameSite=Strict; Max-Age=2592000; Path=/`, Location: '/' });
      return res.end();
    }
    if (!same(cookie(req, 'cv_t'), TOKEN)) { res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('토큰이 필요해요. 노트북 화면의 QR 이나 터미널에 찍힌 주소로 들어오세요.'); }
  }
  if (u.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${lastPayload || snapshot()}\n\n`);
    clients.add(res);
    const ka = setInterval(() => res.write(': ka\n\n'), 20000);
    req.on('close', () => { clients.delete(res); clearInterval(ka); });
    return;
  }
  if (u.pathname === '/lan') { // 폰 연결용 주소(토큰 포함)는 노트북 자신에게만 알려준다
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(fromHere && LAN ? { urls: lanUrls() } : { urls: [] }));
  }
  const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);
  if (file.startsWith(PUBLIC + path.sep) && MIME[path.extname(file)] && fs.existsSync(file)) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Cache-Control': 'no-store' });
    return fs.createReadStream(file).pipe(res);
  }
  res.writeHead(404); res.end();
});

server.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`🏘  Claude Village → http://localhost:${PORT}`);
  console.log(`   로컬: ${DEMO ? '데모' : PROJECTS_DIR} (최근 ${HOURS}시간)`);
  console.log(`   클라우드: ${!CLOUD ? '꺼짐 (--cloud)' : DEMO ? '데모' : CLOUD_FEED || API + '/v1/code/sessions'}`);
  if (LAN) {
    console.log('   📱 폰에서 (노트북 화면의 QR 로도 열 수 있어요):');
    for (const l of lanUrls()) console.log(`      ${l.tailscale ? '[Tailscale] ' : ''}${l.url}`);
    console.log('   ⚠ 이 주소(토큰 포함)를 가진 사람은 세션 제목/파일명을 볼 수 있어요.');
  }
});
if (DEMO) { demoInit(); setInterval(demoTick, 1600); }
setInterval(tick, 250);
if (CLOUD && !DEMO) { pollCloud(); setInterval(pollCloud, 3000); }
