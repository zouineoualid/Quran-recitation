#!/usr/bin/env node
// Hook Claude Code : appelé automatiquement par Claude Code (voir install-hooks.js).
// Reçoit l'événement en JSON sur stdin et met à jour le dashboard.
//
//   PreToolUse  (Task|Agent) → l'agent démarre  : statut "online", tâche en cours, log ▶
//   PostToolUse (Task|Agent) → l'agent a fini    : log ✓
//   SessionEnd               → log "Session ended"
//
// Règle d'or : ce script ne doit JAMAIS gêner Claude Code. Il sort toujours avec le code 0,
// en silence, même si le dashboard est éteint ou si l'événement est inattendu.

import path from 'node:path';

const PORT = Number(process.env.MC_PORT) || 3000;
const done = () => process.exit(0);
setTimeout(done, 4000).unref(); // garde-fou absolu

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function responseText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (Array.isArray(r)) return r.map(responseText).join(' ');
  if (Array.isArray(r.content)) return r.content.map((c) => c?.text || '').join(' ');
  return r.text || r.result || '';
}

export function toEvent(input) {
  const project = input.cwd ? path.basename(input.cwd) : '';
  const evName = input.hook_event_name;
  if (evName === 'SessionEnd') return { type: 'session_end', project };
  const ti = input.tool_input || {};
  const agent = ti.subagent_type || ti.agent_type || ti.name;
  if (!agent) return null;
  const task = clip(ti.description || ti.prompt, 120);
  if (evName === 'PreToolUse') return { type: 'agent_start', agent, task, project };
  if (evName === 'PostToolUse') return { type: 'agent_end', agent, task, project, summary: clip(responseText(input.tool_response), 280) };
  return null;
}

// true = envoyé (ou serveur joignable mais lent : la requête arrivera, on ne double pas)
// false = serveur éteint → on écrit dans le fichier
async function viaServer(ev) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  try {
    await fetch(`http://127.0.0.1:${PORT}/api/hook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev), signal: ctrl.signal,
    });
    return true;
  } catch (err) {
    const code = err?.cause?.code || err?.code;
    return !['ECONNREFUSED', 'ECONNRESET', 'EADDRNOTAVAIL', 'ENOTFOUND'].includes(code) && err?.name === 'AbortError';
  } finally { clearTimeout(t); }
}

async function viaFile(ev) {
  // Dashboard éteint : on écrit directement dans data/state.json
  const { readState, writeState, applyHookEvent } = await import('../server.js');
  const state = readState();
  if (!state) return;
  applyHookEvent(state, ev);
  writeState(state);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  try {
    const raw = await readStdin();
    const ev = toEvent(JSON.parse(raw || '{}'));
    if (ev && !(await viaServer(ev))) await viaFile(ev);
  } catch { /* silence : ne jamais bloquer Claude Code */ }
  done();
}
