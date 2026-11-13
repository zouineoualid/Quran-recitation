// Données de démonstration, générées relativement à la date du jour
// pour que le dashboard ait l'air "vivant" au premier lancement.

function day(offset, h = 10, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d;
}
const iso = (d) => d.toISOString();
const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

let n = 0;
const id = (p) => `${p}_${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function buildSeed() {
  const tasks = [
    { title: 'Envoyer le mail de suivi au client — récap de l\'appel + cas d\'usage + prochaine étape', category: 'Consulting', priority: 'P1', status: 'done', due: ymd(day(-2)), agent: 'inbox-agent' },
    { title: 'Reel « Nouveau modèle IA » — relire le script, envoyer pour validation, tourner', category: 'Content', priority: 'P2', status: 'in_progress', due: ymd(day(-1)), agent: 'content-agent' },
    { title: 'Répondre au sponsor avec les stats d\'audience + demander budget/planning', category: 'Collabs', priority: 'P1', status: 'done', due: ymd(day(-3)), agent: 'deals-agent' },
    { title: 'Atelier : Claude Code & Cowork', category: 'Content', priority: 'P2', status: 'todo', due: ymd(day(2)), agent: 'content-agent' },
    { title: 'Newsletter #7 — sélectionner les 5 actus IA de la semaine', category: 'Newsletter', priority: 'P2', status: 'todo', due: ymd(day(3)), agent: 'research-agent' },
    { title: 'Facturer la mission de mars', category: 'Ops', priority: 'P1', status: 'done', due: ymd(day(-5)), agent: 'deals-agent' },
    { title: 'Mettre à jour la base de connaissances (notes Obsidian)', category: 'Personal', priority: 'P3', status: 'done', due: ymd(day(-4)), agent: 'brain-agent' },
  ].map((t, i) => ({
    id: id('task'),
    notes: '',
    createdAt: iso(day(-7 + i, 9)),
    updatedAt: iso(day(t.status === 'done' ? -6 + i : 0, 11)),
    ...t,
  }));

  const pipeline = [
    { title: 'Attaque supply-chain sur une lib Python — 3 réflexes sécurité', stage: 'idea' },
    { title: 'Agent-to-Agent via le terminal — Claude Code + MCP', stage: 'idea' },
    { title: 'Anatomie du dossier .claude/ — pourquoi Claude garde le contexte', stage: 'idea' },
    { title: 'Nouveau modèle IA vs Cursor — ce qui change vraiment', stage: 'scripted' },
    { title: 'Pourquoi la plupart des gens utilisent mal l\'IA en cybersécurité', stage: 'scripted' },
    { title: 'Claude Dispatch — piloter son desktop depuis le téléphone', stage: 'posted', postedAt: iso(day(-1, 18)) },
    { title: 'Claude Code Channels — parler à Claude Code depuis Telegram', stage: 'posted', postedAt: iso(day(-2, 19)) },
    { title: 'Mon équipe d\'agents IA : le dashboard', stage: 'posted', postedAt: iso(day(-4, 20)) },
    { title: 'Les 5 skills Claude que j\'utilise chaque jour', stage: 'posted', postedAt: iso(day(-6, 18)) },
  ].map((c) => ({
    id: id('cnt'),
    format: 'Reel',
    platforms: ['Instagram', 'TikTok'],
    agent: 'content-agent',
    notes: '',
    createdAt: iso(day(-8)),
    updatedAt: iso(day(-1)),
    ...c,
  }));

  const deals = [
    { company: 'Studio Atlas', title: 'Formation Claude Code (2 jours)', value: 3500, stage: 'proposal', contact: 'contact@exemple.com', nextStep: 'Relancer jeudi' },
    { company: 'NovaTech', title: 'Sponsoring vidéo YouTube', value: 2000, stage: 'negotiation', contact: '', nextStep: 'Envoyer le média kit' },
    { company: 'Agence Médina', title: 'Audit automatisation IA', value: 3250, stage: 'contacted', contact: '', nextStep: 'Appel découverte' },
    { company: 'Kappa SaaS', title: 'Intégration agent support', value: 4800, stage: 'won', contact: '', nextStep: 'Kick-off' },
    { company: 'Blue Fintech', title: 'Atelier sécurité IA', value: 1500, stage: 'lost', contact: '', nextStep: '' },
    { company: 'Lead entrant', title: 'Demande de devis — chatbot', value: 0, stage: 'lead', contact: '', nextStep: 'Qualifier le besoin' },
  ].map((d) => ({ id: id('deal'), updatedAt: iso(day(-2)), ...d }));

  const rawLogs = [
    [-0, 23, 50, 'system', '[cipher] Newsletter #6 — pipeline complet : recherche, rédaction, relecture, injectée dans l\'éditeur', 'Brouillon : content/newsletter/drafts/edition-06.md. En attente : relecture humaine, insertion du schéma, image de couverture.'],
    [-0, 23, 44, 'system', 'Session ended'],
    [-0, 23, 42, 'system', 'Session ended'],
    [-0, 23, 32, 'system', 'Session ended'],
    [-0, 22, 17, 'inbox-agent', '14 emails triés — 2 demandes de collab transmises au deals-agent'],
    [-0, 21, 44, 'research-agent', 'Veille IA 24h — 16 idées (22 brutes → 6 écartées). Top 5 envoyées sur Telegram.', 'content/research/veille-24h.md'],
    [-0, 9, 12, 'orchestrator', 'Plan du jour généré : 4 tâches, 1 en retard'],
    [-1, 1, 52, 'content-agent', 'Newsletter du vendredi rédigée — « Ce que les entreprises ignorent sur les risques IA »', 'Sauvegardée dans content/newsletter/'],
    [-1, 18, 3, 'marketing-agent', 'Reel « Claude Dispatch » publié — légendes Instagram + TikTok générées'],
    [-1, 15, 20, 'deals-agent', 'Proposition envoyée à Studio Atlas (3 500 $)'],
    [-1, 11, 0, 'self-improve-agent', 'Analyse des sessions de la semaine — 2 améliorations proposées au CLAUDE.md'],
    [-2, 10, 30, 'brain-agent', '12 notes indexées dans le second cerveau'],
    [-3, 16, 45, 'deals-agent', 'Deal Kappa SaaS gagné — 4 800 $'],
    [-4, 20, 0, 'marketing-agent', 'Reel « Mon équipe d\'agents IA » publié'],
    [-5, 9, 15, 'inbox-agent', 'Facture de mars envoyée'],
    [-6, 14, 5, 'research-agent', 'Benchmark de 4 outils d\'agents IA terminé'],
  ];
  const logs = rawLogs.map(([o, h, m, agent, message, detail]) => ({
    id: id('log'), ts: iso(day(o, h, m)), agent, message, detail: detail || '',
  }));

  const memory = [
    { title: 'Ton de la marque', content: 'Darija + termes techniques en anglais. Phrases courtes. Toujours une démo concrète à l\'écran.', tags: ['content', 'style'] },
    { title: 'Tarifs', content: 'Atelier 1 jour : 1 750 $. Formation 2 jours : 3 500 $. Sponsoring reel : 2 000 $.', tags: ['deals'] },
    { title: 'Règle des validations', content: 'Aucun email sortant ni publication sans validation humaine. Les agents préparent, je valide.', tags: ['règle'] },
  ].map((x) => ({ id: id('mem'), updatedAt: iso(day(-3)), ...x }));

  const agentStatus = {
    orchestrator: { status: 'online', lastSeen: iso(day(0, 9, 12)), currentTask: 'Coordination' },
    'inbox-agent': { status: 'online', lastSeen: iso(day(0, 22, 17)), currentTask: 'Tri des emails' },
    'research-agent': { status: 'online', lastSeen: iso(day(0, 21, 44)), currentTask: 'Veille IA' },
    'content-agent': { status: 'online', lastSeen: iso(day(-1, 1, 52)), currentTask: 'Script du reel' },
    'deals-agent': { status: 'online', lastSeen: iso(day(-1, 15, 20)), currentTask: 'Suivi Studio Atlas' },
    'marketing-agent': { status: 'online', lastSeen: iso(day(-1, 18, 3)), currentTask: '' },
    'brain-agent': { status: 'idle', lastSeen: iso(day(-2, 10, 30)), currentTask: '' },
    'self-improve-agent': { status: 'online', lastSeen: iso(day(-1, 11)), currentTask: '' },
  };

  return {
    version: 1,
    settings: { name: 'CIPHER', owner: '', currency: 'USD', theme: 'system' },
    tasks, pipeline, deals, logs, memory, agentStatus,
  };
}
