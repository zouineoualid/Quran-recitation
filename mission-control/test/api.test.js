import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Faux environnement utilisateur : ~/.claude avec un agent global, deux projets
// connus de Claude Code (un avec agents, un sans), et un dossier de données isolé.
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-test-'));
const HOME = path.join(TMP, 'home');
const CLAUDE = path.join(HOME, '.claude');
const PROJ_A = path.join(TMP, 'trading-bot');
const PROJ_B = path.join(TMP, 'sans-agents');
const write = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };

write(path.join(CLAUDE, 'agents', 'market-analyst.md'), '---\nname: market-analyst\ndescription: Analyse les marchés\nmodel: sonnet\ntools: Read, WebSearch\n---\nTu analyses BTC.');
write(path.join(CLAUDE, 'skills', 'journal', 'SKILL.md'), '---\nname: journal\ndescription: Journal de trading\n---\nÉtapes…');
write(path.join(PROJ_A, '.claude', 'agents', 'backtester.md'), '---\nname: backtester\ndescription: Backtests\nconnects: [market-analyst]\n---\nBacktest.');
fs.mkdirSync(PROJ_B, { recursive: true });
write(path.join(HOME, '.claude.json'), JSON.stringify({ projects: { [PROJ_A]: {}, [PROJ_B]: {} } }));

const env = { MC_CLAUDE_HOME: CLAUDE, MC_CLAUDE_JSON: path.join(HOME, '.claude.json'), MC_DATA_DIR: path.join(TMP, 'data') };
Object.assign(process.env, env);
const { start, parseFrontmatter } = await import('../server.js');

let server, base, port;
before(async () => {
  server = start(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  port = server.address().port;
  base = `http://127.0.0.1:${port}/api`;
});
after(() => { server.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

const j = async (p, method = 'GET', body) => {
  const res = await fetch(base + p, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
};
// spawn asynchrone : le serveur de test tourne dans ce même processus et doit pouvoir répondre
const runHook = (input, extraEnv = {}) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'hook.js')], { env: { ...process.env, ...env, MC_PORT: String(port), ...extraEnv } });
  child.stdin.end(JSON.stringify(input));
  child.on('close', (status) => resolve({ status }));
});

test('frontmatter : listes inline, en bloc, BOM', () => {
  const { meta, body } = parseFrontmatter('﻿---\nname: a\nconnects: [b, c]\ntools:\n  - Read\n  - Bash\n---\nHello');
  assert.deepEqual(meta.connects, ['b', 'c']);
  assert.deepEqual(meta.tools, ['Read', 'Bash']);
  assert.equal(body, 'Hello');
});

test('découvre les agents globaux et ceux des projets, ignore les projets sans agents', async () => {
  const { data } = await j('/state');
  assert.deepEqual(data.agents.map((a) => `${a.source}/${a.name}`).sort(), ['Global/market-analyst', 'trading-bot/backtester']);
  assert.deepEqual(data.sources.map((s) => s.label), ['Global', 'trading-bot']);
  assert.equal(data.skills[0].name, 'journal');
  assert.equal(data.agents.find((a) => a.name === 'market-analyst').status, 'idle');
  assert.equal(data.tasks.length, 0, 'aucune donnée de démo');
});

test('un dossier ajouté à la main dans Settings est pris en compte', async () => {
  const extra = path.join(TMP, 'youtube');
  write(path.join(extra, '.claude', 'agents', 'scripter.md'), '---\nname: scripter\ndescription: Scripts vidéo\n---\n');
  await j('/settings', 'PATCH', { projects: [extra] });
  const { data } = await j('/state');
  assert.ok(data.agents.some((a) => a.name === 'scripter' && a.source === 'youtube'));
});

test('hooks : démarrage puis fin d\'un agent, via le serveur', async () => {
  const start = await runHook({ hook_event_name: 'PreToolUse', tool_name: 'Task', cwd: PROJ_A, tool_input: { subagent_type: 'backtester', description: 'Backtest EMA 20/50', prompt: '...' } });
  assert.equal(start.status, 0);
  let { data } = await j('/state');
  let a = data.agents.find((x) => x.name === 'backtester');
  assert.equal(a.running, true);
  assert.equal(a.status, 'online');
  assert.equal(a.currentTask, 'Backtest EMA 20/50');
  assert.equal(data.logs.at(-1).project, 'trading-bot');

  await runHook({ hook_event_name: 'PostToolUse', tool_name: 'Agent', cwd: PROJ_A, tool_input: { subagent_type: 'backtester', description: 'Backtest EMA 20/50' }, tool_response: { content: [{ type: 'text', text: 'Sharpe 1.4' }] } });
  ({ data } = await j('/state'));
  a = data.agents.find((x) => x.name === 'backtester');
  assert.equal(a.running, false);
  assert.equal(a.runs, 1);
  assert.match(data.logs.at(-1).message, /^✓ Backtest/);
  assert.equal(data.logs.at(-1).detail, 'Sharpe 1.4');
});

test('hook : serveur éteint → écrit dans le fichier ; entrée invalide → sort en 0 sans rien casser', async () => {
  const r = await runHook({ hook_event_name: 'PreToolUse', tool_name: 'Task', cwd: PROJ_A, tool_input: { subagent_type: 'market-analyst', description: 'BTC daily' } }, { MC_PORT: '1' });
  assert.equal(r.status, 0);
  const { data } = await j('/state');
  assert.equal(data.agents.find((x) => x.name === 'market-analyst').running, true);
  const bad = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'hook.js')], { input: 'pas du json', env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout + bad.stderr, '');
});

test('install-hooks : idempotent, conserve les réglages existants, désinstallable', () => {
  write(path.join(CLAUDE, 'settings.json'), JSON.stringify({ model: 'opus', hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo mine' }] }] } }));
  const run = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'install-hooks.js'), ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(run().status, 0);
  assert.equal(run().status, 0);
  let s = JSON.parse(fs.readFileSync(path.join(CLAUDE, 'settings.json'), 'utf8'));
  assert.equal(s.model, 'opus');
  assert.equal(s.hooks.PreToolUse.length, 2);
  assert.equal(s.hooks.PostToolUse.length, 1);
  assert.equal(s.hooks.SessionEnd.length, 1);
  assert.ok(fs.existsSync(path.join(CLAUDE, 'settings.json.bak')));
  run('--uninstall');
  s = JSON.parse(fs.readFileSync(path.join(CLAUDE, 'settings.json'), 'utf8'));
  assert.deepEqual(s.hooks, { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo mine' }] }] });
});

test('CRUD sur les tâches', async () => {
  const c = await j('/tasks', 'POST', { title: 'test', status: 'todo', category: 'Trading', priority: 'P3' });
  assert.equal(c.status, 201);
  const u = await j(`/tasks/${c.data.id}`, 'PATCH', { status: 'done', id: 'hijack' });
  assert.equal(u.data.status, 'done');
  assert.equal(u.data.id, c.data.id);
  assert.equal((await j(`/tasks/${c.data.id}`, 'DELETE')).data.deleted, 1);
  assert.equal((await j('/tasks/nope', 'PATCH', {})).status, 404);
});

test('route statique protégée contre le path traversal', async () => {
  const res = await fetch(base.replace('/api', '') + '/..%2fserver.js');
  assert.notEqual(res.status, 200);
});
