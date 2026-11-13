---
name: reel-script
description: Écrit un script de reel 60–90 secondes (hook 3 s, démo, call-to-action) à partir d'une idée du pipeline.
agents: [content-agent]
---
Structure : HOOK (≤ 3 s, une phrase choc) → PROBLÈME → DÉMO à l'écran (étapes numérotées) → RÉSULTAT → CTA.
- 150 à 220 mots maximum.
- Indique entre crochets ce qui est montré à l'écran.
- Sauvegarde dans `content/drafts/<slug>.md`, puis `node scripts/mc.js content move "<titre>" scripted`.
