// Mission Control — serveur local sans dépendance.
// - Sert le dashboard (public/)
// - Expose une API JSON sur data/state.json
// - Lit les agents (.claude/agents/*.md) et les skills (.claude/skills/*/SKILL.md)
// - Pousse les changements en direct (Server-Sent Events) : quand un agent Claude Code
//   modifie data/state.json ou un fichier .claude/, le dashboard se met à jour tout seul.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const SKILLS_DIR = path.join(ROOT, '.claude', 'skills');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const COLLECTIONS = new Set(['tasks', 'pipeline', 'deals', 'logs', 'memory']);
const PREFIX = { tasks: 'task', pipeline: 'cnt', deals: 'deal', logs: 'log', memory: 'mem' };

// ---------- état ----------
export function readState() {
  if (!fs.existsSync(STATE_FILE)) writeState(buildSeed());
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (err) {
    // Fichier en cours d'écriture par un agent, ou JSON invalide : on ne casse rien.
    console.error('state.json illisible :', err.message);
    return null;
  }
}

export function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

const newId = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- frontmatter (sous-ensemble YAML suffisant pour les agents) ----------
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
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

function readAgents(state) {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8'));
      const name = meta.name || f.replace(/\.md$/, '');
      const st = state?.agentStatus?.[name] || {};
      return {
        name,
        label: meta.label || name,
        description: meta.description || '',
        model: meta.model || 'inherit',
        tools: Array.isArray(meta.tools) ? meta.tools : (meta.tools ? String(meta.tools).split(',').map((s) => s.trim()) : []),
        connects: Array.isArray(meta.connects) ? meta.connects : [],
        icon: meta.icon || 'bot',
        file: `.claude/agents/${f}`,
        prompt: body.trim(),
        status: st.status || 'offline',
        lastSeen: st.lastSeen || null,
        currentTask: st.currentTask || '',
      };
    })
    .sort((a, b) => (a.name === 'orchestrator' ? -1 : b.name === 'orchestrator' ? 1 : a.name.localeCompare(b.name)));
}

function readSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map((d) => {
      const file = path.join(SKILLS_DIR, d.name, 'SKILL.md');
      const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      return {
        name: meta.name || d.name,
        description: meta.description || '',
        agents: Array.isArray(meta.agents) ? meta.agents : [],
        file: `.claude/skills/${d.name}/SKILL.md`,
        body: body.trim(),
        updatedAt: fs.statSync(file).mtime.toISOString(),
      };
    });
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
      if (size > 1_000_000) { reject(new Error('payload too large')); req.destroy(); return; }
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

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // sans "api"
  const method = req.method;

  if (method === 'GET' && parts[0] === 'state') {
    const state = readState();
    if (!state) return send(res, 503, { error: 'state.json illisible' });
    return send(res, 200, { ...state, agents: readAgents(state), skills: readSkills(), serverTime: new Date().toISOString() });
  }

  if (method === 'GET' && parts[0] === 'events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
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
      return (s.agentStatus[parts[1]] = { ...cur, ...pick(body, ['status', 'currentTask']), lastSeen: new Date().toISOString() });
    }));
  }

  if (method === 'POST' && parts[0] === 'reset') {
    const seed = buildSeed();
    writeState(seed);
    broadcast();
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && parts[0] === 'import') {
    const body = await readBody(req);
    for (const c of COLLECTIONS) if (!Array.isArray(body[c])) return send(res, 400, { error: `champ "${c}" manquant` });
    writeState({ version: 1, settings: body.settings || {}, agentStatus: body.agentStatus || {}, ...Object.fromEntries([...COLLECTIONS].map((c) => [c, body[c]])) });
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

  // Les agents écrivent directement dans les fichiers : on surveille et on rafraîchit.
  let debounce;
  const onFsChange = () => {
    if (Date.now() < suppressWatchUntil) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => broadcast(), 120);
  };
  // Surveillance non récursive : le mode récursif de Linux perd la trace d'un fichier
  // remplacé par renommage atomique (ce que font writeState et la CLI).
  const watchers = new Map();
  const watchDir = (dir) => {
    if (watchers.has(dir) || !fs.existsSync(dir)) return;
    try { watchers.set(dir, fs.watch(dir, onFsChange)); } catch { /* ignoré */ }
  };
  const watchSkills = () => {
    watchDir(SKILLS_DIR);
    if (!fs.existsSync(SKILLS_DIR)) return;
    for (const d of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) if (d.isDirectory()) watchDir(path.join(SKILLS_DIR, d.name));
  };
  watchDir(DATA_DIR);
  watchDir(AGENTS_DIR);
  watchSkills();
  const rescan = setInterval(watchSkills, 5000); // nouveaux dossiers de skills
  // Filet de sécurité (volumes Docker, partages réseau…) : polling léger du fichier d'état.
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
    console.log(`\n  ▸ Mission Control : http://${host === '0.0.0.0' ? 'localhost' : host}:${port}\n`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) start();
