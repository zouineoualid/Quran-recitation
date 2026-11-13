# Mission Control — le dashboard de TES agents Claude Code

Un dashboard local (`http://localhost:3000`) qui affiche **tes propres agents Claude Code**, déjà présents sur ton PC,
et ce qu'ils font en temps réel.

- **Tes agents, détectés tout seuls** : les agents globaux (`~/.claude/agents/`) et ceux de chacun de tes projets
  (`<projet>/.claude/agents/`). Les projets sont trouvés via `~/.claude.json`, le fichier où Claude Code liste
  les dossiers que tu as ouverts. Tu peux en ajouter d'autres dans *Settings*.
- **Suivi automatique** : des hooks Claude Code signalent au dashboard chaque fois qu'un agent démarre ou termine
  (tâche en cours, projet, résumé du résultat). Tu n'as rien à modifier dans tes agents.
- **Zéro dépendance** : seul Node.js ≥ 18 est nécessaire. Pas de `npm install`, pas de build.

## Installation (Windows, macOS, Linux)

Prérequis : [Node.js](https://nodejs.org) (version LTS) et [Git](https://git-scm.com).

```powershell
cd $HOME\Documents
git clone -b ccr-c6052b07-6s67ig https://github.com/zouineoualid/quran-recitation.git
cd quran-recitation\mission-control
npm run install-hooks     # une seule fois : active le suivi automatique
npm start                 # → ouvre http://localhost:3000
```

Après `install-hooks`, **redémarre tes sessions Claude Code** pour qu'elles prennent les hooks en compte.

- Pour retirer les hooks : `npm run uninstall-hooks`.
- `install-hooks` ajoute 3 hooks à `~/.claude/settings.json` (`PreToolUse` et `PostToolUse` sur les outils
  `Task`/`Agent`, plus `SessionEnd`). Il fait d'abord une sauvegarde (`settings.json.bak`) et garde tes autres
  réglages et hooks.
- Les hooks ne bloquent jamais Claude Code. Si le dashboard est éteint, ils écrivent directement dans
  `data/state.json` et tout s'affiche au prochain lancement.

## Les pages

| Page | Contenu |
|---|---|
| **Command Center** | Tâches actives, agents actifs (24 h), exécutions du jour, alertes, activité récente, statut de chaque agent, exécutions de la semaine |
| **Agents** | Le réseau : Claude Code → tes agents, groupés par projet (couleur = projet). Un agent en cours d'exécution est surligné avec sa tâche. Clic sur un agent : prompt, outils, fichier, dernières exécutions |
| **Board** | Tes tâches en kanban (To Do / In Progress / Blocked / Done). Les catégories se règlent dans Settings (par défaut : Trading, YouTube, App Coran, Perso) |
| **Pipeline** | Production de vidéos : Idea → Scripted → Filmed → Edited → Posted |
| **Skills** | Tes skills (`~/.claude/skills` et celles des projets) |
| **Analytics** | Tâches terminées, activité par agent, contenus par étape |
| **Logs** | Toutes les exécutions d'agents, filtrables par jour et par agent |
| **Memory** | Notes durables |
| **Settings** | Sources d'agents, catégories, pages affichées (Deals est masquée par défaut), thème, export/import |

## Relier des agents entre eux (optionnel)

Par défaut, le réseau montre « Claude Code → chaque agent ». Si un agent en délègue à d'autres, ajoute dans son
frontmatter :

```yaml
connects: [risk-manager, market-analyst]
```

## En ligne de commande

```bash
node scripts/mc.js task add "Backtest stratégie EMA" --category Trading --priority P1
node scripts/mc.js task move "Backtest" done
node scripts/mc.js log market-analyst "Analyse BTC terminée"
node scripts/mc.js summary
```

## Options

- Autre port : `PORT=4000 npm start` (PowerShell : `$env:PORT=4000; npm start`). Les hooks utilisent
  `MC_PORT` (3000 par défaut).
- Le serveur n'écoute que sur `127.0.0.1` : il n'est pas accessible depuis le réseau.
- Tests : `npm test`.
