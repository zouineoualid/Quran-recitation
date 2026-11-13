#!/usr/bin/env node
// Installe (ou retire avec --uninstall) les hooks Claude Code qui alimentent le dashboard.
// Modifie ~/.claude/settings.json (une sauvegarde settings.json.bak est faite avant).
// Tes autres réglages et hooks existants sont conservés.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLAUDE_HOME = process.env.MC_CLAUDE_HOME || path.join(os.homedir(), '.claude');
const SETTINGS = path.join(CLAUDE_HOME, 'settings.json');
const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'hook.js').split(path.sep).join('/');
const COMMAND = `node "${HOOK}"`;
const uninstall = process.argv.includes('--uninstall');

let settings = {};
if (fs.existsSync(SETTINGS)) {
  const raw = fs.readFileSync(SETTINGS, 'utf8');
  try { settings = raw.trim() ? JSON.parse(raw) : {}; } catch (e) {
    console.error(`✗ ${SETTINGS} n'est pas un JSON valide (${e.message}). Rien n'a été modifié.`);
    process.exit(1);
  }
  fs.writeFileSync(`${SETTINGS}.bak`, raw);
}

const ours = (entry) => (entry?.hooks || []).some((h) => String(h.command || '').includes('mission-control') && String(h.command || '').includes('hook.js'));
settings.hooks ||= {};
for (const ev of ['PreToolUse', 'PostToolUse', 'SessionEnd']) {
  settings.hooks[ev] = (settings.hooks[ev] || []).filter((e) => !ours(e));
  if (!uninstall) {
    const hook = { type: 'command', command: COMMAND, timeout: 10 };
    settings.hooks[ev].push(ev === 'SessionEnd' ? { hooks: [hook] } : { matcher: 'Task|Agent', hooks: [hook] });
  }
  if (!settings.hooks[ev].length) delete settings.hooks[ev];
}
if (!Object.keys(settings.hooks).length) delete settings.hooks;

fs.mkdirSync(CLAUDE_HOME, { recursive: true });
fs.writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
console.log(uninstall
  ? `✓ Hooks Mission Control retirés de ${SETTINGS}`
  : `✓ Hooks installés dans ${SETTINGS}\n  Chaque agent lancé par Claude Code apparaîtra maintenant dans le dashboard.\n  (Redémarre tes sessions Claude Code ouvertes pour qu'elles prennent les hooks en compte.)`);
