# Mission Control — consignes pour Claude Code

Ce dossier est le QG d'une équipe d'agents. Le dashboard (`npm start` → http://localhost:3000)
affiche en direct l'état stocké dans `data/state.json`.

## Équipe
Les agents sont définis dans `.claude/agents/*.md`. Le champ `connects` du frontmatter
décrit à qui chaque agent délègue (c'est ce qui dessine la page « Agent Network »).
Point d'entrée par défaut : l'agent **orchestrator**.

## Mettre à jour le dashboard
Toujours passer par la CLI (jamais d'édition à la main de `data/state.json`) :

```bash
node scripts/mc.js summary                                   # état actuel : à lire avant de commencer
node scripts/mc.js log <agent> "<ce qui a été fait>" [--detail "chemin ou précision"]
node scripts/mc.js agent <agent> online|idle|offline ["tâche en cours"]
node scripts/mc.js task add "<titre>" --category Content|Collabs|Ops|Newsletter|Consulting|Personal --priority P1|P2|P3 [--due AAAA-MM-JJ] [--agent <agent>]
node scripts/mc.js task move "<id ou bout du titre>" todo|in_progress|blocked|done
node scripts/mc.js content add "<titre>" [--stage idea]
node scripts/mc.js content move "<titre>" idea|scripted|filmed|edited|posted
node scripts/mc.js deal add "<entreprise>" "<objet>" <montant> [--stage lead]
node scripts/mc.js deal move "<entreprise>" lead|contacted|proposal|negotiation|won|lost
node scripts/mc.js memory add "<titre>" "<contenu>" --tags a,b
```

## Règles
- Chaque agent journalise ce qu'il fait à la fin de son travail (`log`).
- Une tâche passe en `in_progress` quand on commence, `done` quand c'est fini, `blocked` avec une note si on attend quelqu'un.
- Aucun email envoyé, aucune publication, aucun paiement sans validation humaine explicite :
  les agents préparent des brouillons, l'humain valide.
- Les faits durables (préférences, tarifs, règles) vont dans la mémoire (`memory add`).
