# Mission Control — le QG de ton équipe d'agents Claude Code

Un dashboard local (`http://localhost:3000`) pour piloter une équipe d'agents Claude Code :
un orchestrateur qui délègue à 7 agents spécialisés, et une interface qui montre en direct
ce qu'ils font.

**Zéro dépendance** : Node.js ≥ 18 suffit. Pas de `npm install`, pas de build.

## Démarrer

```bash
cd mission-control
npm start            # → http://localhost:3000
```

Au premier lancement, des données de démonstration sont créées dans `data/state.json`.
(Settings → *Reset demo data* pour revenir à zéro, *Export/Import JSON* pour sauvegarder.)

## Les 10 pages

| Page | Contenu |
|---|---|
| **Command Center** | Tâches actives, agents en ligne (7/8), valeur du pipeline commercial, contenus publiés cette semaine, alertes (tâches en retard/bloquées, agents hors ligne), activité récente, statut des agents |
| **Agents** | Le réseau des agents (Orchestrator → Inbox / Research / Marketing → Deals / Content / Self Improve → Brain), calculé depuis `.claude/agents/*.md`. Clic sur un agent → détail, prompt, logs, changement de statut |
| **Board** | Kanban des tâches (To Do / In Progress / Blocked / Done), filtres par catégorie et priorité, glisser-déposer, barre de progression |
| **Pipeline** | Production de contenu : Idea → Scripted → Filmed → Edited → Posted |
| **Deals** | Pipeline commercial : Lead → Contacted → Proposal → Negotiation → Won / Lost |
| **Skills** | Les skills de `.claude/skills/*/SKILL.md` |
| **Analytics** | Tâches terminées sur 14 jours, activité par agent, contenus par étape, valeur des deals (chaque graphique a une vue tableau) |
| **Logs** | Journal d'activité : Today / Yesterday / All, filtre par agent, recherche |
| **Memory** | Faits durables partagés par les agents (ton de la marque, tarifs, règles…) |
| **Settings** | Nom de l'espace, devise, thème clair/sombre, export/import, reset |

## Brancher Claude Code

Le dossier contient déjà tout ce qu'il faut :

- `CLAUDE.md` : les règles de l'équipe et les commandes à utiliser ;
- `.claude/agents/` : les 8 agents (orchestrator, inbox, research, content, deals, marketing, brain, self-improve) ;
- `.claude/skills/` : 4 skills d'exemple (daily-brief, reel-script, newsletter-pipeline, weekly-review).

Lance Claude Code **dans ce dossier** et parle à l'orchestrateur :

```bash
cd mission-control
claude
> Utilise l'agent orchestrator : fais-moi le brief du jour et prépare la newsletter.
```

Les agents mettent à jour le dashboard via la CLI `scripts/mc.js`. Le serveur surveille
`data/state.json` et `.claude/` : **le dashboard se rafraîchit tout seul**, sans recharger la page.

```bash
node scripts/mc.js summary
node scripts/mc.js log content-agent "Script du reel terminé" --detail "content/drafts/reel.md"
node scripts/mc.js agent research-agent online "Veille IA"
node scripts/mc.js task add "Relire la newsletter" --category Newsletter --priority P1 --due 2026-12-01
node scripts/mc.js task move "newsletter" done
node scripts/mc.js content add "Mon idée de reel" --stage idea
node scripts/mc.js content move "Mon idée" scripted
node scripts/mc.js deal add "Acme" "Atelier IA" 1500 --stage proposal
node scripts/mc.js memory add "Tarifs" "Atelier 1 jour : 1 750 $" --tags deals
```

## Personnaliser

- **Ajouter un agent** : crée `.claude/agents/mon-agent.md` avec un frontmatter `name`, `description`,
  `model`, et `connects: [autre-agent]` pour le relier dans le réseau. Il apparaît immédiatement.
- **Ajouter une skill** : crée `.claude/skills/ma-skill/SKILL.md` (`name`, `description`, `agents`).
- **Port** : `PORT=4000 npm start`. Le serveur n'écoute que sur `127.0.0.1` (mets `HOST=0.0.0.0`
  seulement si tu sais ce que tu fais : il n'y a pas d'authentification).

## Structure

```
server.js          serveur HTTP + API JSON + live (Server-Sent Events)
seed.js            données de démonstration
scripts/mc.js      CLI utilisée par les agents
public/            le dashboard (HTML/CSS/JS vanilla)
data/state.json    l'état (créé au premier lancement, ignoré par git)
test/              tests de l'API (npm test)
```
