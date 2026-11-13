# Mission Control — notes de développement

Dashboard local, sans dépendance, qui affiche les agents Claude Code de l'utilisateur.

- `server.js` : API JSON + SSE. Découvre les agents et skills dans `~/.claude/` et dans les projets listés
  dans `~/.claude.json` (+ `settings.projects`). Variables d'environnement pour les tests :
  `MC_CLAUDE_HOME`, `MC_CLAUDE_JSON`, `MC_DATA_DIR`.
- `scripts/hook.js` : hook Claude Code (PreToolUse/PostToolUse sur `Task|Agent`, SessionEnd).
  Il doit toujours sortir en 0, en silence, et ne jamais bloquer.
- `scripts/install-hooks.js` : ajoute/retire ces hooks dans `~/.claude/settings.json` (idempotent, avec sauvegarde).
- `scripts/mc.js` : CLI (tâches, logs, contenus, deals, mémoire).
- `public/` : front en JS vanilla, aucun build.
- `data/state.json` : l'état, ignoré par git. Ne jamais y mettre de données d'exemple : le dashboard démarre vide.

Avant de commiter : `npm test`.
