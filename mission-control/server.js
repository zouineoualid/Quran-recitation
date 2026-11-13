// Mission Control — serveur local sans dépendance.
// - Sert le dashboard (public/)
// - Expose une API JSON sur data/state.json
// - Découvre TES agents et skills Claude Code :
//     ~/.claude/agents, ~/.claude/skills                (agents globaux)
//     <projet>/.claude/agents, <projet>/.claude/skills  (chaque projet connu de Claude Code
//                                                        dans ~/.claude.json + ceux ajoutés dans Settings)
// - Pousse les changements en direct (Server-Sent Events).

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.MC_DATA_DIR || path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const CLAUDE_HOME = process.env.MC_CLAUDE_HOME || path.join(os.homedir(), '.claude');
const CLAUDE_JSON = process.env.MC_CLAUDE_JSON || path.join(os.homedir(), '.claude.json');
const HOOK_SCRIPT = path.join(ROOT, 'scripts', 'hook.js');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ACTIVE_WINDOW_MS = 24 * 3600 * 1000;

const COLLECTIONS = new Set(['tasks', 'pipeline', 'deals', 'logs', 'memory']);
const PREFIX = { tasks: 'task', pipeline: 'cnt', deals: 'deal', logs: 'log', memory: 'mem' };
const MAX_LOGS = 5000;

// ---------- état ----------
export function readState() {
  if (!fs.existsSync(STATE_FILE)) writeState(buildSeed());
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (err) {
    console.error('state.json illisible :', err.message);
    return null;
  }
}

export function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (state.logs?.length > MAX_LOGS) state.logs = state.logs.slice(-MAX_LOGS);
  const tmp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

const newId = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- frontmatter (sous-ensemble YAML suffisant pour les agents) ----------
export function parseFrontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) { meta[listKey].push(unquote(item[1])); continue; }
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { meta[k] = []; listKey = k; continue; }
    listKey = null;
    if (/^\[.*\]$/.test(v)) meta[k] = v.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
    else meta[k] = unquote(v);
  }
  return { meta, body: m[2] };
}
const unquote = (s) => s.replace(/^["'](.*)["']$/, '$1');
const toList = (v) => (Array.isArray(v) ? v : v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

// ---------- découverte des sources (global + projets) ----------
function knownProjects() {
  try {
    const json = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf8'));
    return Object.keys(json.projects || {});
  } catch { return []; }
}

export function discoverSources(state) {
  const sources = [{ id: 'global', label: 'Global', kind: 'user', root: path.dirname(CLAUDE_HOME), claudeDir: CLAUDE_HOME, auto: true }];
  const manual = toList(state?.settings?.projects);
  const seen = new Set([path.resolve(CLAUDE_HOME)]);
  for (const [p, auto] of [...knownProjects().map((p) => [p, true]), ...manual.map((p) => [p, false])]) {
    const root = path.resolve(p);
    const claudeDir = path.join(root, '.claude');
    if (seen.has(claudeDir)) continue;
    seen.add(claudeDir);
    const has = fs.existsSync(path.join(claudeDir, 'agents')) || fs.existsSync(path.join(claudeDir, 'skills'));
    if (!has && auto) continue; // projets auto-détectés sans agents : on les ignore
    sources.push({ id: root, label: path.basename(root) || root, kind: 'project', root, claudeDir, auto, missing: !has });
  }
  return sources;
}

function agentStatus(st) {
  if (st.status === 'offline') return 'offline';
  if (st.lastSeen && Date.now() - new Date(st.lastSeen) < ACTIVE_WINDOW_MS) return 'online';
  return 'idle';
}

function readAgents(state, sources) {
  const out = [];
  for (const src of sources) {
    const dir = path.join(src.claudeDir, 'agents');
    if (!fs.existsSync(dir)) continue;
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')); } catch { continue; }
    for (const f of files) {
      let text;
      try { text = fs.readFileSync(path.join(dir, f), 'utf8'); } catch { continue; }
      const { meta, body } = parseFrontmatter(text);
      const name = meta.name || f.replace(/\.md$/, '');
      const st = state?.agentStatus?.[name] || {};
      out.push({
        id: `${src.id}::${name}`,
        name,
        label: meta.label || name,
        description: meta.description || '',
        model: meta.model || 'inherit',
        tools: toList(meta.tools),
        connects: toList(meta.connects),
        icon: meta.icon || 'bot',
        color: meta.color || '',
        source: src.label,
        sourceKind: src.kind,
        file: path.join(dir, f),
        prompt: body.trim(),
        status: agentStatus(st),
        running: !!st.running,
        lastSeen: st.lastSeen || null,
        currentTask: st.currentTask || '',
        runs: st.runs || 0,
      });
    }
  }
  return out.sort((a, b) => (a.sourceKind === b.sourceKind ? a.source.localeCompare(b.source) || a.name.localeCompare(b.name) : a.sourceKind === 'user' ? -1 : 1));
}

function readSkills(sources) {
  const out = [];
  for (const src of sources) {
    const dir = path.join(src.claudeDir, 'skills');
    if (!fs.existsSync(dir)) continue;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const d of entries) {
      const file = path.join(dir, d.name, 'SKILL.md');
      if (!d.isDirectory() || !fs.existsSync(file)) continue;
      const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      out.push({
        name: meta.name || d.name,
        description: meta.description || '',
        agents: toList(meta.agents),
        source: src.label,
        file,
        body: body.trim(),
        updatedAt: fs.statSync(file).mtime.toISOString(),
      });
    }
  }
  return out;
}

export function hooksInstalled() {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(CLAUDE_HOME, 'settings.json'), 'utf8'));
    return JSON.stringify(s.hooks || {}).includes('mission-control');
  } catch { return false; }
}

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 2_000_000) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const clients = new Set();
function broadcast(event = 'change') {
  for (const res of clients) res.write(`event: ${event}\ndata: ${Date.now()}\n\n`);
}

let suppressWatchUntil = 0;
function mutate(fn) {
  const state = readState();
  if (!state) throw new Error('state.json illisible');
  const result = fn(state);
  writeState(state);
  suppressWatchUntil = Date.now() + 150;
  broadcast();
  return result;
}

// Événement envoyé par les hooks Claude Code (scripts/hook.js)
export function applyHookEvent(state, ev) {
  const now = new Date().toISOString();
  const project = ev.project || '';
  state.agentStatus ||= {};
  state.logs ||= [];
  const log = (agent, message, detail = '') => state.logs.push({ id: newId('log'), ts: now, agent, message, detail, project });
  if (ev.type === 'agent_start' && ev.agent) {
    const st = (state.agentStatus[ev.agent] ||= {});
    Object.assign(st, { status: 'online', running: true, currentTask: ev.task || '', lastSeen: now, runs: (st.runs || 0) + 1 });
    log(ev.agent, `▶ ${ev.task || 'Démarrage'}`, project ? `Projet : ${project}` : '');
  } else if (ev.type === 'agent_end' && ev.agent) {
    const st = (state.agentStatus[ev.agent] ||= {});
    Object.assign(st, { status: 'online', running: false, lastSeen: now, lastTask: ev.task || st.currentTask || '', currentTask: '' });
    log(ev.agent, `✓ ${ev.task || 'Terminé'}`, ev.summary || '');
  } else if (ev.type === 'session_end') {
    for (const st of Object.values(state.agentStatus)) if (st.running) { st.running = false; st.currentTask = ''; }
    log('system', 'Session ended', project ? `Projet : ${project}` : '');
  } else if (ev.type === 'log' && ev.message) {
    log(ev.agent || 'system', ev.message, ev.detail || '');
  }
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
  const method = req.method;

  if (method === 'GET' && parts[0] === 'state') {
    const state = readState();
    if (!state) return send(res, 503, { error: 'state.json illisible' });
    const sources = discoverSources(state);
    return send(res, 200, {
      ...state,
      agents: readAgents(state, sources),
      skills: readSkills(sources),
      sources: sources.map(({ id, label, kind, root, auto, missing }) => ({ id, label, kind, root, auto, missing: !!missing })),
      system: { claudeHome: CLAUDE_HOME, hooksInstalled: hooksInstalled(), hookScript: HOOK_SCRIPT, platform: process.platform },
      serverTime: new Date().toISOString(),
    });
  }

  if (method === 'GET' && parts[0] === 'events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  if (method === 'POST' && parts[0] === 'hook') {
    const body = await readBody(req);
    mutate((s) => applyHookEvent(s, body));
    return send(res, 200, { ok: true });
  }

  if (method === 'PATCH' && parts[0] === 'settings') {
    const body = await readBody(req);
    return send(res, 200, mutate((s) => Object.assign(s.settings, body)));
  }

  if (method === 'PATCH' && parts[0] === 'agents' && parts[1]) {
    const body = await readBody(req);
    return send(res, 200, mutate((s) => {
      s.agentStatus ||= {};
      const cur = s.agentStatus[parts[1]] || {};
      const next = { ...cur, ...pick(body, ['status', 'currentTask']) };
      if (body.status === 'online') next.lastSeen = new Date().toISOString();
      if (body.status === 'idle') next.lastSeen = null;
      return (s.agentStatus[parts[1]] = next);
    }));
  }

  if (method === 'POST' && parts[0] === 'reset') {
    const cur = readState();
    const seed = buildSeed();
    if (cur?.settings) seed.settings = { ...seed.settings, ...cur.settings }; // on garde les réglages
    writeState(seed);
    broadcast();
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && parts[0] === 'import') {
    const body = await readBody(req);
    for (const c of COLLECTIONS) if (!Array.isArray(body[c])) return send(res, 400, { error: `champ "${c}" manquant` });
    writeState({ version: 2, settings: { ...buildSeed().settings, ...(body.settings || {}) }, agentStatus: body.agentStatus || {}, ...Object.fromEntries([...COLLECTIONS].map((c) => [c, body[c]])) });
    broadcast();
    return send(res, 200, { ok: true });
  }

  const [col, itemId] = parts;
  if (COLLECTIONS.has(col)) {
    if (method === 'POST' && !itemId) {
      const body = await readBody(req);
      const now = new Date().toISOString();
      const item = { ...body, id: newId(PREFIX[col]) };
      if (col === 'logs') item.ts ||= now; else { item.createdAt = now; item.updatedAt = now; }
      return send(res, 201, mutate((s) => { (s[col] ||= []).push(item); return item; }));
    }
    if ((method === 'PATCH' || method === 'PUT') && itemId) {
      const body = await readBody(req);
      try {
        return send(res, 200, mutate((s) => {
          const it = (s[col] || []).find((x) => x.id === itemId);
          if (!it) throw Object.assign(new Error('not found'), { code: 404 });
          const before = col === 'pipeline' ? it.stage : null;
          Object.assign(it, body, { id: it.id, updatedAt: new Date().toISOString() });
          if (col === 'pipeline' && it.stage === 'posted' && before !== 'posted' && !body.postedAt) it.postedAt = it.updatedAt;
          return it;
        }));
      } catch (e) { if (e.code === 404) return send(res, 404, { error: 'introuvable' }); throw e; }
    }
    if (method === 'DELETE' && itemId) {
      return send(res, 200, mutate((s) => {
        const before = (s[col] || []).length;
        s[col] = (s[col] || []).filter((x) => x.id !== itemId);
        return { deleted: before - s[col].length };
      }));
    }
  }

  send(res, 404, { error: 'route inconnue' });
}

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || !path.extname(rel)) rel = '/index.html'; // routes du front (/board, /logs…)
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

export function start(port = PORT, host = HOST) {
  readState(); // crée data/state.json au premier lancement

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
      if (url.pathname.startsWith('/api/')) await api(req, res, url);
      else serveStatic(req, res, url);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 400, { error: err.message });
    }
  });

  let debounce;
  const onFsChange = () => {
    if (Date.now() < suppressWatchUntil) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => broadcast(), 150);
  };

  // Surveillance non récursive (le mode récursif de Linux perd les fichiers remplacés par
  // renommage) de data/ et des dossiers agents/skills de chaque source, re-scannés toutes les 5 s.
  const watchers = new Map();
  const watchDir = (dir) => {
    if (watchers.has(dir) || !fs.existsSync(dir)) return;
    try {
      const w = fs.watch(dir, onFsChange);
      w.on('error', () => { w.close(); watchers.delete(dir); });
      watchers.set(dir, w);
    } catch { /* ignoré */ }
  };
  const watchAll = () => {
    watchDir(DATA_DIR);
    const state = readState();
    for (const src of discoverSources(state)) {
      watchDir(path.join(src.claudeDir, 'agents'));
      const skills = path.join(src.claudeDir, 'skills');
      watchDir(skills);
      try { for (const d of fs.readdirSync(skills, { withFileTypes: true })) if (d.isDirectory()) watchDir(path.join(skills, d.name)); } catch { /* pas de skills */ }
    }
  };
  watchAll();
  const rescan = setInterval(watchAll, 5000);
  fs.watchFile(STATE_FILE, { interval: 1000 }, (cur, prev) => { if (cur.mtimeMs !== prev.mtimeMs) onFsChange(); });

  const close = server.close.bind(server);
  server.close = (cb) => {
    clearInterval(rescan);
    fs.unwatchFile(STATE_FILE);
    watchers.forEach((w) => w.close());
    for (const res of clients) res.end();
    clients.clear();
    return close(cb);
  };

  server.listen(port, host, () => {
    const { port: p } = server.address();
    console.log(`\n  ▸ Mission Control : http://${host === '0.0.0.0' ? 'localhost' : host}:${p}`);
    console.log(`  ▸ Agents lus depuis : ${CLAUDE_HOME} + tes projets Claude Code`);
    if (!hooksInstalled()) console.log('  ▸ Suivi automatique non installé : lance « npm run install-hooks »');
    console.log('');
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) start();
