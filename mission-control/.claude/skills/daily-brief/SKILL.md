---
name: daily-brief
description: Produit le brief du matin — tâches du jour, retards, deals à relancer, contenus en cours. À utiliser au début de chaque journée.
agents: [orchestrator]
---
1. Lance `node scripts/mc.js summary`.
2. Liste les tâches en retard (échéance passée, statut ≠ done) en premier.
3. Liste les deals sans mise à jour depuis 7 jours.
4. Propose 3 priorités maximum pour la journée.
5. Journalise : `node scripts/mc.js log orchestrator "Plan du jour : ..."`.
