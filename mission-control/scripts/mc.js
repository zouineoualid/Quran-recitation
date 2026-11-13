#!/usr/bin/env node
// CLI utilisée par les agents Claude Code pour mettre à jour le dashboard.
// Elle écrit directement dans data/state.json : le serveur détecte le changement
// et rafraîchit le dashboard en direct (le serveur n'a même pas besoin de tourner).
//
//   node scripts/mc.js log <agent> "<message>" [--detail "..."]
//   node scripts/mc.js task add "<titre>" [--category Content] [--priority P2] [--due 2026-12-01] [--agent content-agent]
//   node scripts/mc.js task move <id|bout-de-titre> <todo|in_progress|blocked|done>
//   node scripts/mc.js task list [--status todo]
//   node scripts/mc.js content add "<titre>" [--stage idea] [--format Reel] [--platforms Instagram,TikTok]
//   node scripts/mc.js content move <id|bout-de-titre> <idea|scripted|filmed|edited|posted>
//   node scripts/mc.js deal add "<entreprise>" "<objet>" <montant> [--stage lead] [--next "..."]
//   node scripts/mc.js deal move <id|bout-de-titre> <lead|contacted|proposal|negotiation|won|lost>
//   node scripts/mc.js agent <nom> <online|idle|offline> ["tâche en cours"]
//   node scripts/mc.js memory add "<titre>" "<contenu>" [--tags a,b]
//   node scripts/mc.js summary

import { readState, writeState } from '../server.js';

const STAGES = {
  task: ['todo', 'in_progress', 'blocked', 'done'],
  content: ['idea', 'scripted', 'filmed', 'edited', 'posted'],
  deal: ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'],
};
const COL = { task: 'tasks', content: 'pipeline', deal: 'deals' };
const FIELD = { task: 'status', content: 'stage', deal: 'stage' };

const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  else pos.push(argv[i]);
}

const now = () => new Date().toISOString();
const newId = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

const state = readState() || die('data/state.json illisible');
const [cmd, sub, ...rest] = pos;

function touchAgent(name, extra = {}) {
  if (!name) return;
  state.agentStatus ||= {};
  state.agentStatus[name] = { ...(state.agentStatus[name] || {}), status: 'online', ...extra, lastSeen: now() };
}
function find(kind, ref) {
  const list = state[COL[kind]];
  const q = String(ref || '').toLowerCase();
  const hit = list.find((x) => x.id === ref) || list.filter((x) => (x.title || x.company || '').toLowerCase().includes(q));
  if (!Array.isArray(hit)) return hit;
  if (hit.length === 1) return hit[0];
  die(hit.length ? `"${ref}" est ambigu (${hit.length} résultats) — utilise l'id` : `aucun élément "${ref}"`);
}
function addLog(agent, message, detail = '') {
  state.logs.push({ id: newId('log'), ts: now(), agent, message, detail });
}

switch (cmd) {
  case 'log': {
    const [agent, message] = [sub, rest[0]];
    if (!agent || !message) die('usage : log <agent> "<message>"');
    addLog(agent, message, flags.detail === true ? '' : flags.detail || '');
    touchAgent(agent);
    break;
  }
  case 'task': case 'content': case 'deal': {
    const col = COL[cmd];
    if (sub === 'add') {
      const t = now();
      let item;
      if (cmd === 'task') {
        if (!rest[0]) die('usage : task add "<titre>"');
        item = { title: rest[0], category: flags.category || 'Ops', priority: flags.priority || 'P2', status: flags.status || 'todo', due: flags.due || '', agent: flags.agent || '', notes: flags.notes || '' };
      } else if (cmd === 'content') {
        if (!rest[0]) die('usage : content add "<titre>"');
        item = { title: rest[0], stage: flags.stage || 'idea', format: flags.format || 'Reel', platforms: String(flags.platforms || 'Instagram,TikTok').split(',').map((s) => s.trim()), agent: flags.agent || 'content-agent', notes: flags.notes || '' };
      } else {
        if (!rest[0] || !rest[1]) die('usage : deal add "<entreprise>" "<objet>" <montant>');
        item = { company: rest[0], title: rest[1], value: Number(rest[2]) || 0, stage: flags.stage || 'lead', contact: flags.contact || '', nextStep: flags.next || '' };
      }
      if (!STAGES[cmd].includes(item[FIELD[cmd]])) die(`étape invalide : ${item[FIELD[cmd]]} (${STAGES[cmd].join(', ')})`);
      item = { id: newId(cmd), ...item, createdAt: t, updatedAt: t };
      if (cmd === 'content' && item.stage === 'posted') item.postedAt = t;
      state[col].push(item);
      console.log(`✓ ${cmd} ajouté : ${item.id}`);
      if (flags.agent) touchAgent(flags.agent);
    } else if (sub === 'move') {
      const [ref, to] = rest;
      if (!STAGES[cmd].includes(to)) die(`étape invalide : ${to} (${STAGES[cmd].join(', ')})`);
      const it = find(cmd, ref);
      it[FIELD[cmd]] = to;
      it.updatedAt = now();
      if (cmd === 'content' && to === 'posted') it.postedAt = it.updatedAt;
      console.log(`✓ ${it.title || it.company} → ${to}`);
    } else if (sub === 'list') {
      const list = state[col].filter((x) => !flags.status || x[FIELD[cmd]] === flags.status);
      for (const x of list) console.log(`${x.id}\t${x[FIELD[cmd]]}\t${x.title || ''}${x.company ? ` (${x.company})` : ''}`);
      process.exit(0);
    } else die(`usage : ${cmd} add|move|list`);
    break;
  }
  case 'agent': {
    const [name, status, task] = [sub, rest[0], rest[1]];
    if (!name || !['online', 'idle', 'offline'].includes(status)) die('usage : agent <nom> <online|idle|offline> ["tâche"]');
    touchAgent(name, { status, ...(task !== undefined ? { currentTask: task } : {}) });
    break;
  }
  case 'memory': {
    if (sub !== 'add' || !rest[0] || !rest[1]) die('usage : memory add "<titre>" "<contenu>" [--tags a,b]');
    state.memory.push({ id: newId('mem'), title: rest[0], content: rest[1], tags: flags.tags ? String(flags.tags).split(',').map((s) => s.trim()) : [], updatedAt: now() });
    break;
  }
  case 'summary': {
    const open = state.tasks.filter((t) => t.status !== 'done');
    console.log(`Tâches ouvertes : ${open.length}`);
    for (const t of open) console.log(`  [${t.priority}] ${t.status.padEnd(11)} ${t.title}${t.due ? ` (échéance ${t.due})` : ''}`);
    const deals = state.deals.filter((d) => !['won', 'lost'].includes(d.stage));
    console.log(`Deals en cours : ${deals.length} — ${deals.reduce((s, d) => s + (Number(d.value) || 0), 0)} ${state.settings.currency}`);
    const byStage = Object.fromEntries(STAGES.content.map((s) => [s, state.pipeline.filter((c) => c.stage === s).length]));
    console.log(`Contenu : ${Object.entries(byStage).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
    process.exit(0);
  }
  default:
    console.log('Commandes : log, task, content, deal, agent, memory, summary (voir l\'en-tête de scripts/mc.js)');
    process.exit(cmd ? 1 : 0);
}

writeState(state);
if (cmd === 'log' || cmd === 'agent' || cmd === 'memory') console.log('✓ ok');
