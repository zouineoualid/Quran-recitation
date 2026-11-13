// État initial : vide. Le dashboard se remplit avec TES agents (lus dans ~/.claude et
// dans tes projets) et avec ce qu'ils font (via les hooks Claude Code).

export const DEFAULT_CATEGORIES = ['Trading', 'YouTube', 'App Coran', 'Perso'];

export function buildSeed() {
  return {
    version: 2,
    settings: {
      name: 'Mission Control',
      owner: '',
      currency: 'USD',
      theme: 'system',
      categories: DEFAULT_CATEGORIES,
      projects: [],
      hiddenPages: ['/deals'],
    },
    tasks: [],
    pipeline: [],
    deals: [],
    logs: [{
      id: `log_${Date.now().toString(36)}`,
      ts: new Date().toISOString(),
      agent: 'system',
      message: 'Mission Control installé',
      detail: 'Les exécutions de tes agents apparaîtront ici dès que les hooks sont installés (npm run install-hooks).',
    }],
    memory: [],
    agentStatus: {},
  };
}
