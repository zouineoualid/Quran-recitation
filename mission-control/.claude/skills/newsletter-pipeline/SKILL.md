---
name: newsletter-pipeline
description: Pipeline complet de la newsletter hebdo — veille, sélection des 5 sujets, rédaction, relecture, brouillon prêt à valider.
agents: [research-agent, content-agent]
---
1. research-agent : veille 7 jours, 15–20 candidats, garder les 5 meilleurs avec sources.
2. content-agent : rédiger (intro, 5 sections, conclusion), ton de la marque.
3. Relecture : faits vérifiés, liens valides.
4. Sauvegarder dans `content/newsletter/drafts/` et créer la tâche « Relire la newsletter » (P1).
