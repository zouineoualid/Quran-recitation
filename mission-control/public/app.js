// Mission Control — front-end (vanilla JS, aucun build).

// ---------------------------------------------------------------- icônes
const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 17h5"/>',
  columns: '<path d="M5 4v16M12 4v10M19 4v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  logs: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  brain: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  dollar: '<path d="M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.8c0 4.9 10 2.7 10 7.9 0 2.2-2.2 3.8-5 3.8s-5-1.3-5-3.3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5h.01"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  pen: '<path d="M14 4l6 6L9 21H3v-6z"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  megaphone: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a2 2 0 0 0-2 2"/><path d="M20 4v14h-7"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8.5L20 20M8.5 15.5L20 4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  loader: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  handshake: '<path d="M3 11l4-4 5 2 5-2 4 4-8 8z"/><path d="M8 13l3 3"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
};
const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.circle}</svg>`;

// ---------------------------------------------------------------- config
const NAV = [
  ['/', 'Command Center', 'grid'], ['/agents', 'Agents', 'bot'], ['/board', 'Board', 'columns'],
  ['/pipeline', 'Pipeline', 'calendar'], ['/deals', 'Deals', 'tag'], ['/skills', 'Skills', 'spark'],
  ['/analytics', 'Analytics', 'chart'], ['/logs', 'Logs', 'logs'], ['/memory', 'Memory', 'brain'],
  ['/settings', 'Settings', 'settings'],
];
const CATEGORIES = ['Collabs', 'Content', 'Ops', 'Newsletter', 'Consulting', 'Personal'];
const CAT_TAG = { Content: 'blue', Consulting: 'green', Collabs: 'orange', Ops: 'gray', Newsletter: 'violet', Personal: 'pink' };
const TASK_COLS = [
  { key: 'todo', label: 'To Do', icon: 'circle', head: 'gray' },
  { key: 'in_progress', label: 'In Progress', icon: 'loader', head: 'blue' },
  { key: 'blocked', label: 'Blocked', icon: 'ban', head: 'red' },
  { key: 'done', label: 'Done', icon: 'check', head: 'green' },
];
const STATUS_LABEL = Object.fromEntries(TASK_COLS.map((c) => [c.key, c.label]));
const STATUS_DOT = { todo: 'dot-blue', in_progress: 'dot-blue', blocked: 'dot-critical', done: 'dot-good' };
const STAGES = [
  { key: 'idea', label: 'Idea', icon: 'bulb', head: 'gray' },
  { key: 'scripted', label: 'Scripted', icon: 'doc', head: 'blue' },
  { key: 'filmed', label: 'Filmed', icon: 'video', head: 'yellow' },
  { key: 'edited', label: 'Edited', icon: 'scissors', head: 'violet' },
  { key: 'posted', label: 'Posted', icon: 'check', head: 'green' },
];
const DEAL_STAGES = [
  { key: 'lead', label: 'Lead', icon: 'user', head: 'gray' },
  { key: 'contacted', label: 'Contacted', icon: 'mail', head: 'blue' },
  { key: 'proposal', label: 'Proposal', icon: 'doc', head: 'violet' },
  { key: 'negotiation', label: 'Negotiation', icon: 'handshake', head: 'yellow' },
  { key: 'won', label: 'Won', icon: 'check', head: 'green' },
  { key: 'lost', label: 'Lost', icon: 'x', head: 'red' },
];
const OPEN_DEAL = (d) => !['won', 'lost'].includes(d.stage);
const NODE_COLOR = { 'brain-agent': 'pink', 'self-improve-agent': 'green' };

// ---------------------------------------------------------------- état
let S = null;
const ui = {
  board: { cat: 'All', prio: 'All' },
  logs: { range: 'today', agent: 'all', q: '' },
  agents: { selected: null },
  memory: { q: '' },
  analytics: { table: {} },
  dragging: false,
  pendingRender: false,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, opts = {}) {
  const res = await fetch(`/api/${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function load() {
  S = await api('state');
  applyTheme();
}
async function mutate(path, method, body, msg) {
  try {
    await api(path, { method, body });
    await load();
    render();
    if (msg) toast(msg);
  } catch (e) { toast(`Error: ${e.message}`); }
}

// ---------------------------------------------------------------- dates & formats
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const today = () => startOfDay(new Date());
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
const parseDue = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const fmtShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtHour = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric' });
const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: S?.settings?.currency || 'USD', maximumFractionDigits: 0 }).format(Number(v) || 0);
function ago(d) {
  if (!d) return '—';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
const isOverdue = (t) => t.status !== 'done' && t.due && parseDue(t.due) < today();
const ymd = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

// ---------------------------------------------------------------- shell
function renderNav() {
  const path = location.pathname;
  $('#nav').innerHTML = NAV.map(([href, label, ic]) =>
    `<a href="${href}" data-link class="${path === href ? 'active' : ''}" ${path === href ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
  const name = S?.settings?.name || 'CIPHER';
  $('#brand-name').textContent = name.toUpperCase();
  $('#brand-logo').textContent = name.trim()[0]?.toUpperCase() || 'C';
  document.title = `${name} · Mission Control`;
  const offline = S ? S.agents.filter((a) => a.status === 'offline').length : 0;
  $('#system-status').innerHTML = offline
    ? `<span class="dot dot-warning"></span><span>${offline} agent${offline > 1 ? 's' : ''} offline</span>`
    : '<span class="dot dot-good"></span><span>All systems online</span>';
}

const head = (title, sub, actions = '') => `
  <div class="page-head"><div><h1>${title}</h1><div class="sub">${sub}</div></div>
  <div class="head-actions">${actions}</div></div>`;

const PAGES = {};
function render() {
  if (!S) return;
  if (ui.dragging) { ui.pendingRender = true; return; }
  renderNav();
  const page = PAGES[location.pathname] || PAGES['/'];
  $('#main').innerHTML = page();
  afterRender[location.pathname]?.();
}
const afterRender = {};

function navigate(href) {
  if (href === location.pathname) return;
  history.pushState(null, '', href);
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- Command Center
PAGES['/'] = () => {
  const active = S.tasks.filter((t) => ['todo', 'in_progress', 'blocked'].includes(t.status));
  const inProg = S.tasks.filter((t) => t.status === 'in_progress').length;
  const online = S.agents.filter((a) => a.status === 'online').length;
  const openDeals = S.deals.filter(OPEN_DEAL);
  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const week = S.pipeline.filter((c) => c.stage === 'posted' && c.postedAt && dayDiff(new Date(), c.postedAt) < 7);

  const alerts = [
    ...S.tasks.filter(isOverdue).map((t) => ({ title: t.title, sub: `Overdue · was due ${fmtShort(parseDue(t.due))}`, prio: t.priority, id: t.id })),
    ...S.tasks.filter((t) => t.status === 'blocked').map((t) => ({ title: t.title, sub: 'Blocked', prio: t.priority, id: t.id })),
    ...S.agents.filter((a) => a.status === 'offline').map((a) => ({ title: `${a.label} is offline`, sub: a.lastSeen ? `Last seen ${ago(a.lastSeen)} ago` : 'Never seen' })),
  ];
  const recent = [...S.tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);

  // 7 derniers jours de publication
  const days = [...Array(7)].map((_, i) => { const d = today(); d.setDate(d.getDate() - 6 + i); return d; });
  const perDay = days.map((d) => S.pipeline.filter((c) => c.stage === 'posted' && c.postedAt && dayDiff(c.postedAt, d) === 0).length);
  const maxDay = Math.max(1, ...perDay);

  const kpi = (ic, label, value, foot, href) => `
    <a class="card kpi" href="${href}" data-link>
      <div class="kpi-top"><span class="kpi-icon">${icon(ic)}</span><span class="kpi-label">${label}</span></div>
      <div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div>
    </a>`;

  return `${head('Command Center', 'Mission Control')}
  <div class="kpis">
    ${kpi('list', 'Active Tasks', active.length, `${inProg} in progress`, '/board')}
    ${kpi('bot', 'Agents Online', `${online}<span class="of">/${S.agents.length}</span>`, `${S.agents.length - online} idle or offline`, '/agents')}
    ${kpi('dollar', 'Deal Pipeline', money(pipelineValue), `${openDeals.length} open deals`, '/deals')}
    ${kpi('video', 'Content', week.length, 'posted this week', '/pipeline')}
  </div>
  <div class="cc-grid">
    <div class="stack">
      <section class="card card-pad">
        <h2 class="section-title">${icon('alert')} System Alerts <span class="count">${alerts.length}</span></h2>
        ${alerts.length ? alerts.map((a) => `
          <div class="alert" ${a.id ? `data-action="edit-task" data-id="${a.id}" role="button" tabindex="0" style="cursor:pointer"` : ''}>
            <span class="dot dot-critical" style="margin-top:6px"></span>
            <div><div class="alert-title">${esc(a.title)}</div><div class="alert-sub">${esc(a.sub)}</div></div>
            ${a.prio ? `<span class="prio prio-${esc(a.prio)}">${esc(a.prio)}</span>` : ''}
          </div>`).join('') : '<div class="empty">Nothing needs attention. ✓</div>'}
      </section>
      <section class="card card-pad">
        <h2 class="section-title">${icon('activity')} Recent Activity</h2>
        <ul class="activity">
          ${recent.map((t) => `
            <li><span class="dot ${STATUS_DOT[t.status] || ''}"></span>
              <div><div class="activity-title">${esc(t.title)}</div>
              <div class="activity-meta"><span>${esc(t.category)}</span><span>•</span><span>${STATUS_LABEL[t.status] || esc(t.status)}</span>${t.agent ? `<span>•</span><span class="mono">${esc(t.agent)}</span>` : ''}</div></div>
            </li>`).join('') || '<li class="empty">No tasks yet.</li>'}
        </ul>
      </section>
    </div>
    <div class="stack">
      <section class="card card-pad">
        <h2 class="section-title">${icon('bot')} Agent Status</h2>
        <ul class="agent-list">
          ${S.agents.map((a) => `<li title="${esc(a.currentTask || a.status)}"><span class="dot dot-${a.status === 'online' ? 'good' : a.status}"></span>${esc(a.name)}<span class="when">${ago(a.lastSeen)}</span></li>`).join('')}
        </ul>
      </section>
      <section class="card card-pad">
        <h2 class="section-title">${icon('calendar')} This Week <span class="count">${week.length} posted</span></h2>
        <div class="week">
          ${days.map((d, i) => `
            <div class="week-col" data-tip="<b>${perDay[i]}</b> posted · ${fmtShort(d)}">
              <div class="week-bar ${perDay[i] ? '' : 'zero'}" style="height:${perDay[i] ? Math.max(8, (perDay[i] / maxDay) * 64) : 2}px"></div>
              <span class="week-day ${i === 6 ? 'today' : ''}">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
            </div>`).join('')}
        </div>
      </section>
    </div>
  </div>`;
};

// ---------------------------------------------------------------- Agents
function layoutNetwork(agents) {
  const names = new Set(agents.map((a) => a.name));
  const edges = agents.flatMap((a) => a.connects.filter((t) => names.has(t) && t !== a.name).map((t) => [a.name, t]));
  const depth = Object.fromEntries(agents.map((a) => [a.name, 0]));
  for (let i = 0; i < agents.length; i++) { // plus long chemin (borné → résiste aux cycles)
    for (const [s, t] of edges) if (depth[t] < depth[s] + 1 && depth[s] + 1 < agents.length) depth[t] = depth[s] + 1;
  }
  const cols = [];
  for (const a of agents) (cols[depth[a.name]] ||= []).push(a.name);
  // ordre barycentrique pour limiter les croisements
  const pos = {};
  cols.forEach((col, ci) => {
    if (ci > 0) {
      const bary = (n) => { const ps = edges.filter(([, t]) => t === n).map(([s]) => pos[s]).filter((v) => v !== undefined); return ps.length ? ps.reduce((x, y) => x + y, 0) / ps.length : 99; };
      col.sort((a, b) => bary(a) - bary(b));
    }
    col.forEach((n, i) => { pos[n] = i; });
  });
  const W = 196, H = 108, GX = 64, GY = 20;
  const maxRows = Math.max(...cols.map((c) => c.length));
  const height = maxRows * (H + GY) - GY;
  const xy = {};
  cols.forEach((col, ci) => {
    const colH = col.length * (H + GY) - GY;
    col.forEach((n, i) => { xy[n] = { x: ci * (W + GX), y: (height - colH) / 2 + i * (H + GY) }; });
  });
  return { edges, xy, W, H, width: cols.length * (W + GX) - GX, height };
}

PAGES['/agents'] = () => {
  const { edges, xy, W, H, width, height } = layoutNetwork(S.agents);
  const by = Object.fromEntries(S.agents.map((a) => [a.name, a]));
  const sel = by[ui.agents.selected];
  const recent = (a) => a.status === 'online' && a.lastSeen && Date.now() - new Date(a.lastSeen) < 864e5;
  const paths = edges.map(([s, t]) => {
    const a = xy[s], b = xy[t];
    const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
    const hot = recent(by[s]) && recent(by[t]);
    return `<path class="edge ${hot ? 'hot' : ''}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
  }).join('');
  const counts = { online: 0, idle: 0, offline: 0 };
  S.agents.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });

  const node = (a) => `
    <button class="node node-${NODE_COLOR[a.name] || 'blue'} ${ui.agents.selected === a.name ? 'selected' : ''}" style="left:${xy[a.name].x}px;top:${xy[a.name].y}px;height:${H}px"
      data-action="select-agent" data-name="${esc(a.name)}">
      <div class="node-head"><span class="node-icon">${icon(a.icon)}</span>
        <div><div class="node-name"><span class="dot dot-${a.status === 'online' ? 'good' : a.status}"></span>${esc(a.label)}</div></div></div>
      <div class="node-desc">${esc(a.description)}</div>
      <span class="node-model">${esc(a.model)}</span>
    </button>`;

  const panel = sel ? `
    <aside class="card panel">
      <div style="display:flex;align-items:center;gap:8px"><span class="dot dot-${sel.status === 'online' ? 'good' : sel.status}"></span><h3>${esc(sel.label)}</h3>
        <button class="icon-btn" style="margin-left:auto" data-action="select-agent" data-name="${esc(sel.name)}" aria-label="Close">${icon('x')}</button></div>
      <p class="muted" style="font-size:12.5px">${esc(sel.description)}</p>
      <dl class="kv">
        <dt>Status</dt><dd>
          <select data-action="agent-status" data-name="${esc(sel.name)}" aria-label="Status">
            ${['online', 'idle', 'offline'].map((s) => `<option ${s === sel.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select></dd>
        <dt>Model</dt><dd class="mono">${esc(sel.model)}</dd>
        <dt>Last seen</dt><dd>${sel.lastSeen ? `${ago(sel.lastSeen)} ago` : '—'}</dd>
        <dt>Working on</dt><dd>${esc(sel.currentTask || '—')}</dd>
        <dt>Delegates to</dt><dd>${sel.connects.map((c) => `<code class="inline">${esc(c)}</code>`).join(' ') || '—'}</dd>
        <dt>Tools</dt><dd>${sel.tools.length ? esc(sel.tools.join(', ')) : 'all (inherit)'}</dd>
        <dt>File</dt><dd><code class="inline">${esc(sel.file)}</code></dd>
        <dt>Open tasks</dt><dd>${S.tasks.filter((t) => t.agent === sel.name && t.status !== 'done').length}</dd>
      </dl>
      <h2 class="section-title">System prompt</h2>
      <pre>${esc(sel.prompt)}</pre>
      <h2 class="section-title" style="margin-top:16px">Recent logs</h2>
      ${S.logs.filter((l) => l.agent === sel.name).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 5)
        .map((l) => `<div style="font-size:12.5px;margin-bottom:8px"><span class="mono muted">${fmtShort(l.ts)} ${fmtTime(l.ts)}</span><br>${esc(l.message)}</div>`).join('') || '<div class="empty">No logs yet.</div>'}
    </aside>` : '';

  return `${head('Agent Network', 'System topology')}
  <div class="agents-layout ${sel ? 'with-panel' : ''}">
    <div class="stack">
      <section class="card network-card">
        <h2 class="section-title">${icon('bot')} Agent Workflow <span class="tag">${S.agents.length} agents</span></h2>
        ${S.agents.length ? `<div class="network-wrap"><div class="network" style="width:${width}px;height:${height}px">
          <svg class="edges" width="${width}" height="${height}">${paths}</svg>
          ${S.agents.map(node).join('')}
        </div></div>` : '<div class="empty">No agents found in <code class="inline">.claude/agents/</code>.</div>'}
        <div class="network-foot">
          <span><span class="dot dot-good"></span>${counts.online} Active</span>
          <span><span class="dot dot-idle"></span>${counts.idle} Idle</span>
          ${counts.offline ? `<span><span class="dot dot-offline"></span>${counts.offline} Offline</span>` : ''}
          <span>→ ${edges.length} Connections</span>
        </div>
      </section>
      <section>
        <h2 class="section-title">All Agents</h2>
        <div class="grid-cards">
          ${S.agents.map((a) => `
            <button class="card agent-card" data-action="select-agent" data-name="${esc(a.name)}">
              <div style="display:flex;align-items:center;gap:8px"><span class="dot dot-${a.status === 'online' ? 'good' : a.status}"></span><b style="font-size:13.5px">${esc(a.label)}</b><span class="node-model" style="margin:0 0 0 auto">${esc(a.model)}</span></div>
              <div class="desc">${esc(a.description)}</div>
              <div class="kcard-meta" style="margin-top:8px"><span>${S.tasks.filter((t) => t.agent === a.name && t.status !== 'done').length} open tasks</span><span>•</span><span>seen ${ago(a.lastSeen)}</span></div>
            </button>`).join('')}
        </div>
      </section>
    </div>
    ${panel}
  </div>`;
};

// ---------------------------------------------------------------- Kanban générique
function kanban({ cols, items, field, kind, card, addLabel }) {
  return `<div class="kanban ${cols.length > 5 ? 'dense' : ''}">${cols.map((c) => {
    const list = items.filter((x) => x[field] === c.key);
    return `<div class="col">
      <div class="col-head h-${c.head}">${icon(c.icon)} ${c.label}<span class="n">${list.length}</span></div>
      <div class="col-body" data-drop="${kind}" data-key="${c.key}">
        ${list.map(card).join('') || '<div class="col-empty">No items</div>'}
        ${addLabel ? `<button class="add-inline" data-action="new-${kind}" data-key="${c.key}">+ ${addLabel}</button>` : ''}
      </div></div>`;
  }).join('')}</div>`;
}

// ---------------------------------------------------------------- Board
PAGES['/board'] = () => {
  const { cat, prio } = ui.board;
  const items = S.tasks.filter((t) => (cat === 'All' || t.category === cat) && (prio === 'All' || t.priority === prio));
  const done = items.filter((t) => t.status === 'done').length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const card = (t) => `
    <div class="kcard ${isOverdue(t) ? 'overdue' : ''}" draggable="true" data-drag="task" data-id="${t.id}" data-action="edit-task" tabindex="0">
      <div class="kcard-top"><span class="tag tag-${CAT_TAG[t.category] || 'gray'}">${esc(t.category)}</span><span class="prio prio-${esc(t.priority)}">${esc(t.priority)}</span></div>
      <div class="kcard-title">${esc(t.title)}</div>
      <div class="kcard-meta">
        ${t.due ? `<span class="${isOverdue(t) ? 'late' : ''}">${isOverdue(t) ? '⊘ ' : ''}${fmtShort(parseDue(t.due))}</span>` : ''}
        ${t.agent ? `<span class="mono">${esc(t.agent)}</span>` : ''}
      </div>
    </div>`;
  return `${head('Task Board', 'Active work items', `<button class="btn btn-primary" data-action="new-task">${icon('plus')} New task</button>`)}
  <div class="card toolbar">
    <div class="chips">${['All', ...CATEGORIES].map((c) => `<button class="chip ${cat === c ? 'active' : ''}" data-action="board-cat" data-v="${c}">${c}</button>`).join('')}</div>
    <div class="chips">${['All', 'P1', 'P2', 'P3'].map((p) => `<button class="chip ${prio === p ? 'active' : ''}" data-action="board-prio" data-v="${p}">${p}</button>`).join('')}
      <span class="muted mono" style="font-size:12px;margin-left:6px">${items.length}/${S.tasks.length} tasks</span></div>
  </div>
  ${kanban({ cols: TASK_COLS, items, field: 'status', kind: 'task', card, addLabel: 'Add task' })}
  <div class="card progress-card">
    <div class="progress"><span class="kpi-label">Completion</span><div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${pct}%"></div></div></div>
    <div class="mini-stats">
      <div class="mini-stat"><b>${pct}%</b><span>Rate</span></div>
      <div class="mini-stat"><b>${items.length}</b><span>Total</span></div>
      <div class="mini-stat"><b>${items.filter((t) => t.status === 'in_progress').length}</b><span>Active</span></div>
      <div class="mini-stat"><b>${items.filter((t) => t.status === 'blocked').length}</b><span>Blocked</span></div>
      <div class="mini-stat"><b>${done}</b><span>Done</span></div>
    </div>
  </div>`;
};

// ---------------------------------------------------------------- Pipeline
PAGES['/pipeline'] = () => {
  const card = (c) => `
    <div class="kcard" draggable="true" data-drag="content" data-id="${c.id}" data-action="edit-content" tabindex="0">
      <div class="kcard-top"><span class="tag">${esc(c.format || 'Reel')}</span><span class="dot dot-${c.stage === 'posted' ? 'good' : 'blue'}"></span></div>
      <div class="kcard-title" dir="auto">${esc(c.title)}</div>
      <div class="kcard-meta">${(c.platforms || []).map((p) => `<span class="tag">${esc(p)}</span>`).join('')}
        ${c.postedAt && c.stage === 'posted' ? `<span>${fmtShort(c.postedAt)}</span>` : ''}</div>
    </div>`;
  const stepper = STAGES.map((s, i) => {
    const n = S.pipeline.filter((c) => c.stage === s.key).length;
    return `${i ? '<div class="step-line"></div>' : ''}<div class="step ${n ? 'has' : ''} ${i === STAGES.length - 1 ? 'last' : ''}">
      <div class="step-circle">${icon(s.icon)}${n ? `<span class="badge">${n}</span>` : ''}</div><span class="step-label">${s.label}</span></div>`;
  }).join('');
  return `${head('Content Pipeline', 'Track content from idea to posted', `<button class="btn btn-primary" data-action="new-content">${icon('plus')} New idea</button>`)}
  <section class="card card-pad" style="margin-bottom:16px"><h2 class="section-title">Production Stages</h2><div class="stepper">${stepper}</div></section>
  <h2 class="section-title">Kanban — drag to move</h2>
  ${kanban({ cols: STAGES, items: S.pipeline, field: 'stage', kind: 'content', card, addLabel: 'Add' })}`;
};

// ---------------------------------------------------------------- Deals
PAGES['/deals'] = () => {
  const open = S.deals.filter(OPEN_DEAL);
  const won = S.deals.filter((d) => d.stage === 'won');
  const lost = S.deals.filter((d) => d.stage === 'lost');
  const sum = (l) => l.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const rate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const card = (d) => `
    <div class="kcard" draggable="true" data-drag="deal" data-id="${d.id}" data-action="edit-deal" tabindex="0">
      <div class="kcard-top"><b style="font-size:12.5px">${esc(d.company)}</b><span class="mono" style="font-size:12.5px">${money(d.value)}</span></div>
      <div class="kcard-title">${esc(d.title)}</div>
      ${d.nextStep ? `<div class="kcard-meta">→ ${esc(d.nextStep)}</div>` : ''}
    </div>`;
  const kpi = (ic, label, value, foot) => `<div class="card kpi"><div class="kpi-top"><span class="kpi-icon">${icon(ic)}</span><span class="kpi-label">${label}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;
  return `${head('Deals', 'Collaborations, clients & revenue', `<button class="btn btn-primary" data-action="new-deal">${icon('plus')} New deal</button>`)}
  <div class="kpis">
    ${kpi('dollar', 'Open Pipeline', money(sum(open)), `${open.length} open deals`)}
    ${kpi('check', 'Won', money(sum(won)), `${won.length} deals`)}
    ${kpi('trend', 'Win Rate', `${rate}%`, `${won.length} won · ${lost.length} lost`)}
    ${kpi('handshake', 'Avg Deal', money(open.length ? sum(open) / open.length : 0), 'open deals')}
  </div>
  ${kanban({ cols: DEAL_STAGES, items: S.deals, field: 'stage', kind: 'deal', card, addLabel: 'Add' })}`;
};

// ---------------------------------------------------------------- Skills
PAGES['/skills'] = () => `${head('Skills', 'Reusable playbooks in .claude/skills/')}
  <div class="grid-cards">
    ${S.skills.map((s, i) => `
      <button class="card agent-card" data-action="show-skill" data-i="${i}">
        <div style="display:flex;align-items:center;gap:8px">${icon('spark')}<b style="font-size:13.5px">${esc(s.name)}</b></div>
        <div class="desc">${esc(s.description)}</div>
        <div class="chips" style="margin-top:10px">${s.agents.map((a) => `<span class="tag tag-blue">${esc(a)}</span>`).join('')}</div>
      </button>`).join('') || '<div class="empty">No skills yet.</div>'}
  </div>
  <p class="muted" style="font-size:12.5px;margin-top:18px">Add a skill: create <code class="inline">.claude/skills/&lt;name&gt;/SKILL.md</code> with a <code class="inline">name</code> and <code class="inline">description</code> frontmatter. It appears here instantly.</p>`;

// ---------------------------------------------------------------- Analytics
function hbar(id, title, hint, rows, fmt = (v) => v) {
  const showTable = ui.analytics.table[id];
  const max = Math.max(1, ...rows.map((r) => r.v));
  const labelW = 120, w = 520, rowH = 28, barH = 16, h = rows.length * rowH;
  const body = showTable
    ? `<table class="table"><thead><tr><th>Item</th><th class="num">Value</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.k)}</td><td class="num">${esc(fmt(r.v))}</td></tr>`).join('')}</tbody></table>`
    : `<svg viewBox="0 0 ${w} ${h + 4}" role="img" aria-label="${esc(title)}">
        <line class="axis" x1="${labelW}" x2="${labelW}" y1="0" y2="${h}"/>
        ${rows.map((r, i) => {
          const bw = (r.v / max) * (w - labelW - 70);
          const y = i * rowH + (rowH - barH) / 2;
          return `<g class="m" data-tip="${esc(r.k)} · <b>${esc(fmt(r.v))}</b>">
            <rect class="hit" x="0" y="${i * rowH}" width="${w}" height="${rowH}"/>
            <text class="lbl" x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end">${esc(r.k)}</text>
            ${r.v ? `<path class="bar" d="M${labelW},${y} h${Math.max(bw - 4, 0)} a4,4 0 0 1 4,4 v${barH - 8} a4,4 0 0 1 -4,4 h-${Math.max(bw - 4, 0)} z"/>` : ''}
            <text class="val" x="${labelW + bw + 6}" y="${y + barH / 2 + 4}">${esc(fmt(r.v))}</text></g>`;
        }).join('')}
      </svg>`;
  return chartCard(id, title, hint, body);
}
function vbars(id, title, hint, rows) {
  const showTable = ui.analytics.table[id];
  const max = Math.max(1, ...rows.map((r) => r.v));
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const w = 520, h = 180, padL = 26, padB = 22, plotH = h - padB - 6, slot = (w - padL) / rows.length, bw = Math.min(22, slot - 6);
  const body = showTable
    ? `<table class="table"><thead><tr><th>Day</th><th class="num">Completed</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.k)}</td><td class="num">${r.v}</td></tr>`).join('')}</tbody></table>`
    : `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
      ${[0, 0.5, 1].map((f) => { const y = 6 + plotH - f * plotH; return `<line class="${f ? 'grid' : 'axis'}" x1="${padL}" x2="${w}" y1="${y}" y2="${y}"/><text class="tick" x="${padL - 6}" y="${y + 3}" text-anchor="end">${Math.round(f * nice)}</text>`; }).join('')}
      ${rows.map((r, i) => {
        const x = padL + i * slot + (slot - bw) / 2;
        const bh = (r.v / nice) * plotH, y = 6 + plotH - bh;
        return `<g class="m" data-tip="${esc(r.k)} · <b>${r.v}</b> completed">
          <rect class="hit" x="${padL + i * slot}" y="0" width="${slot}" height="${h}"/>
          ${r.v ? `<path class="bar" d="M${x},${6 + plotH} v-${Math.max(bh - 4, 0)} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 v${Math.max(bh - 4, 0)} z"/>` : ''}
          ${i % 2 === rows.length % 2 ? '' : `<text class="tick" x="${x + bw / 2}" y="${h - 6}" text-anchor="middle">${esc(r.short)}</text>`}</g>`;
      }).join('')}
    </svg>`;
  return chartCard(id, title, hint, body);
}
const chartCard = (id, title, hint, body) => `
  <section class="card chart-card"><div class="chart-head"><div><h3>${esc(title)}</h3><div class="hint">${esc(hint)}</div></div>
  <button class="icon-btn" data-action="toggle-table" data-id="${id}" title="${ui.analytics.table[id] ? 'Show chart' : 'Show table'}" aria-label="Toggle table view">${icon(ui.analytics.table[id] ? 'chart' : 'table')}</button></div>
  <div class="chart">${body}</div></section>`;

PAGES['/analytics'] = () => {
  const days = [...Array(14)].map((_, i) => { const d = today(); d.setDate(d.getDate() - 13 + i); return d; });
  const completed = days.map((d) => ({
    k: fmtShort(d), short: d.toLocaleDateString('en-US', { day: 'numeric' }),
    v: S.tasks.filter((t) => t.status === 'done' && t.updatedAt && dayDiff(t.updatedAt, d) === 0).length,
  }));
  const weekAgo = Date.now() - 7 * 864e5;
  const byAgent = S.agents.map((a) => ({ k: a.name, v: S.logs.filter((l) => l.agent === a.name && new Date(l.ts) >= weekAgo).length })).sort((a, b) => b.v - a.v);
  const content = STAGES.map((s) => ({ k: s.label, v: S.pipeline.filter((c) => c.stage === s.key).length }));
  const deals = DEAL_STAGES.map((s) => ({ k: s.label, v: S.deals.filter((d) => d.stage === s.key).reduce((x, d) => x + (Number(d.value) || 0), 0) }));
  const totalDone = completed.reduce((s, r) => s + r.v, 0);
  return `${head('Analytics', 'Last 14 days')}
  <div class="charts">
    ${vbars('done', 'Tasks completed', `${totalDone} in the last 14 days`, completed)}
    ${hbar('agents', 'Agent activity', 'Log entries, last 7 days', byAgent)}
    ${hbar('content', 'Content by stage', `${S.pipeline.length} pieces in the pipeline`, content)}
    ${hbar('deals', 'Deal value by stage', 'Sum of deal values', deals, money)}
  </div>`;
};

// ---------------------------------------------------------------- Logs
PAGES['/logs'] = () => {
  const { range, agent, q } = ui.logs;
  const agentsInLogs = [...new Set([...S.agents.map((a) => a.name), ...S.logs.map((l) => l.agent)])];
  const list = S.logs
    .filter((l) => range === 'all' || dayDiff(new Date(), l.ts) === (range === 'today' ? 0 : 1))
    .filter((l) => agent === 'all' || l.agent === agent)
    .filter((l) => !q || `${l.message} ${l.detail}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const groups = [];
  for (const l of list) {
    const key = range === 'all' ? `${fmtShort(l.ts)} · ${fmtHour(l.ts)}` : fmtHour(l.ts);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1).items.push(l);
  }
  return `${head('Activity Logs', 'System events', `<input class="search" type="search" placeholder="Search logs…" value="${esc(q)}" data-action="logs-q" aria-label="Search logs">`)}
  <div class="logs-filters">
    <div class="seg">${[['today', 'Today'], ['yesterday', 'Yesterday'], ['all', 'All']].map(([k, l]) => `<button class="${range === k ? 'active' : ''}" data-action="logs-range" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chips"><button class="chip ${agent === 'all' ? 'active' : ''}" data-action="logs-agent" data-v="all">All agents</button>
      ${agentsInLogs.map((a) => `<button class="chip ${agent === a ? 'active' : ''}" data-action="logs-agent" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div>
  </div>
  <section class="card card-pad">
    ${groups.map((g) => `<div class="log-group"><h3 class="log-hour">${esc(g.key)}</h3><ul class="log-list">
      ${g.items.map((l) => `<li class="log-item ${l.agent === 'system' ? 'sys' : ''}">
        <div class="log-head"><span class="log-time">${fmtTime(l.ts)}</span><span class="tag ${l.agent === 'system' ? '' : 'tag-blue'}">${esc(l.agent)}</span></div>
        <div class="log-msg">${esc(l.message)}</div>${l.detail ? `<div class="log-detail">${esc(l.detail)}</div>` : ''}</li>`).join('')}
    </ul></div>`).join('') || '<div class="empty">No events for this filter.</div>'}
  </section>`;
};

// ---------------------------------------------------------------- Memory
PAGES['/memory'] = () => {
  const q = ui.memory.q.toLowerCase();
  const list = S.memory.filter((m) => !q || `${m.title} ${m.content} ${(m.tags || []).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return `${head('Memory', 'Long-term facts your agents can rely on',
    `<input class="search" type="search" placeholder="Search memory…" value="${esc(ui.memory.q)}" data-action="memory-q" aria-label="Search memory">
     <button class="btn btn-primary" data-action="new-memory">${icon('plus')} Add</button>`)}
  <div class="grid-cards">
    ${list.map((m) => `<article class="card mem-card">
      <h4>${icon('brain')}${esc(m.title)}<button class="icon-btn" data-action="edit-memory" data-id="${m.id}" aria-label="Edit">${icon('edit')}</button></h4>
      <p>${esc(m.content)}</p>
      <div class="chips">${(m.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}<span class="muted" style="font-size:11px;margin-left:auto">${fmtShort(m.updatedAt)}</span></div>
    </article>`).join('') || '<div class="empty">Nothing stored yet.</div>'}
  </div>`;
};

// ---------------------------------------------------------------- Settings
PAGES['/settings'] = () => {
  const s = S.settings;
  return `${head('Settings', 'Workspace configuration')}
  <div class="settings">
    <section class="card card-pad">
      <h2 class="section-title">Workspace</h2>
      <form data-form="settings">
        <div class="field-row">
          <div class="field"><label for="s-name">Name</label><input id="s-name" name="name" value="${esc(s.name)}" maxlength="24"></div>
          <div class="field"><label for="s-owner">Owner</label><input id="s-owner" name="owner" value="${esc(s.owner)}" placeholder="Your name"></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="s-cur">Currency</label><select id="s-cur" name="currency">${['USD', 'EUR', 'MAD', 'GBP', 'CAD'].map((c) => `<option ${c === s.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="s-theme">Theme</label><select id="s-theme" name="theme">${['system', 'light', 'dark'].map((c) => `<option ${c === s.theme ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
        <button class="btn btn-primary" type="submit">Save</button>
      </form>
    </section>
    <section class="card card-pad">
      <h2 class="section-title">Connect your agents</h2>
      <p style="margin-top:0;font-size:13px">Your Claude Code agents update this dashboard by running the CLI from the project folder:</p>
      <pre style="white-space:pre-wrap;font:12px/1.6 var(--mono);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px;margin:0">node scripts/mc.js log content-agent "Script du reel terminé"
node scripts/mc.js task add "Relire la newsletter" --priority P1 --category Newsletter
node scripts/mc.js task move "newsletter" done
node scripts/mc.js content move "Claude Dispatch" posted
node scripts/mc.js deal add "Acme" "Atelier IA" 1500
node scripts/mc.js summary</pre>
      <p class="muted" style="font-size:12.5px;margin-bottom:0">Changes to <code class="inline">data/state.json</code>, <code class="inline">.claude/agents/</code> and <code class="inline">.claude/skills/</code> show up here live.</p>
    </section>
    <section class="card card-pad">
      <h2 class="section-title">Data</h2>
      <div class="chips">
        <button class="btn" data-action="export">${icon('download')} Export JSON</button>
        <label class="btn">${icon('upload')} Import JSON<input type="file" accept="application/json" data-action="import" hidden></label>
        <button class="btn btn-danger" data-action="reset">Reset demo data</button>
      </div>
    </section>
  </div>`;
};

// ---------------------------------------------------------------- modales
function openModal(html, onSubmit, onDelete) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="card modal" role="dialog" aria-modal="true">${html}</div>`;
  root.hidden = false;
  const form = $('form', root);
  const prev = document.activeElement;
  const close = () => { root.hidden = true; root.innerHTML = ''; document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.onclick = (e) => { if (e.target === root || e.target.closest('[data-close]')) close(); };
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    close();
    await onSubmit(data);
  });
  $('[data-delete]', root)?.addEventListener('click', async () => {
    if (!confirm('Delete this item?')) return;
    close();
    await onDelete();
  });
  $('input, textarea, select', root)?.focus();
}
const opt = (list, cur) => list.map((x) => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const actions = (isEdit) => `<div class="modal-actions">${isEdit ? '<button type="button" class="btn btn-danger" data-delete>Delete</button>' : ''}<button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${isEdit ? 'Save' : 'Create'}</button></div>`;
const agentOpts = (cur) => opt([['', '—'], ...S.agents.map((a) => a.name)], cur || '');

function taskModal(t = {}, status) {
  const isEdit = !!t.id;
  openModal(`<h2>${isEdit ? 'Edit task' : 'New task'}</h2><form>
    <div class="field"><label for="f-title">Title</label><input id="f-title" name="title" required value="${esc(t.title)}"></div>
    <div class="field-row">
      <div class="field"><label for="f-cat">Category</label><select id="f-cat" name="category">${opt(CATEGORIES, t.category || 'Content')}</select></div>
      <div class="field"><label for="f-prio">Priority</label><select id="f-prio" name="priority">${opt(['P1', 'P2', 'P3'], t.priority || 'P2')}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="f-status">Status</label><select id="f-status" name="status">${opt(TASK_COLS.map((c) => [c.key, c.label]), t.status || status || 'todo')}</select></div>
      <div class="field"><label for="f-due">Due date</label><input id="f-due" type="date" name="due" value="${esc(t.due)}"></div>
    </div>
    <div class="field"><label for="f-agent">Assigned agent</label><select id="f-agent" name="agent">${agentOpts(t.agent)}</select></div>
    <div class="field"><label for="f-notes">Notes</label><textarea id="f-notes" name="notes">${esc(t.notes)}</textarea></div>
    ${actions(isEdit)}</form>`,
  (d) => (isEdit ? mutate(`tasks/${t.id}`, 'PATCH', d, 'Task saved') : mutate('tasks', 'POST', d, 'Task created')),
  () => mutate(`tasks/${t.id}`, 'DELETE', null, 'Task deleted'));
}
function contentModal(c = {}, stage) {
  const isEdit = !!c.id;
  openModal(`<h2>${isEdit ? 'Edit content' : 'New content'}</h2><form>
    <div class="field"><label for="f-title">Title</label><input id="f-title" name="title" dir="auto" required value="${esc(c.title)}"></div>
    <div class="field-row">
      <div class="field"><label for="f-stage">Stage</label><select id="f-stage" name="stage">${opt(STAGES.map((s) => [s.key, s.label]), c.stage || stage || 'idea')}</select></div>
      <div class="field"><label for="f-format">Format</label><select id="f-format" name="format">${opt(['Reel', 'Short', 'Video', 'Post', 'Carousel', 'Newsletter'], c.format || 'Reel')}</select></div>
    </div>
    <div class="field"><label for="f-pl">Platforms (comma separated)</label><input id="f-pl" name="platforms" value="${esc((c.platforms || ['Instagram', 'TikTok']).join(', '))}"></div>
    <div class="field"><label for="f-notes">Notes / script</label><textarea id="f-notes" name="notes" dir="auto">${esc(c.notes)}</textarea></div>
    ${actions(isEdit)}</form>`,
  (d) => { d.platforms = d.platforms.split(',').map((s) => s.trim()).filter(Boolean); return isEdit ? mutate(`pipeline/${c.id}`, 'PATCH', d, 'Saved') : mutate('pipeline', 'POST', { ...d, agent: 'content-agent', ...(d.stage === 'posted' ? { postedAt: new Date().toISOString() } : {}) }, 'Added to pipeline'); },
  () => mutate(`pipeline/${c.id}`, 'DELETE', null, 'Deleted'));
}
function dealModal(d = {}, stage) {
  const isEdit = !!d.id;
  openModal(`<h2>${isEdit ? 'Edit deal' : 'New deal'}</h2><form>
    <div class="field-row">
      <div class="field"><label for="f-co">Company</label><input id="f-co" name="company" required value="${esc(d.company)}"></div>
      <div class="field"><label for="f-val">Value (${esc(S.settings.currency)})</label><input id="f-val" name="value" type="number" min="0" step="50" value="${esc(d.value ?? 0)}"></div>
    </div>
    <div class="field"><label for="f-title">Deal</label><input id="f-title" name="title" required value="${esc(d.title)}"></div>
    <div class="field-row">
      <div class="field"><label for="f-stage">Stage</label><select id="f-stage" name="stage">${opt(DEAL_STAGES.map((s) => [s.key, s.label]), d.stage || stage || 'lead')}</select></div>
      <div class="field"><label for="f-contact">Contact</label><input id="f-contact" name="contact" value="${esc(d.contact)}"></div>
    </div>
    <div class="field"><label for="f-next">Next step</label><input id="f-next" name="nextStep" value="${esc(d.nextStep)}"></div>
    ${actions(isEdit)}</form>`,
  (x) => { x.value = Number(x.value) || 0; return isEdit ? mutate(`deals/${d.id}`, 'PATCH', x, 'Deal saved') : mutate('deals', 'POST', x, 'Deal created'); },
  () => mutate(`deals/${d.id}`, 'DELETE', null, 'Deal deleted'));
}
function memoryModal(m = {}) {
  const isEdit = !!m.id;
  openModal(`<h2>${isEdit ? 'Edit memory' : 'New memory'}</h2><form>
    <div class="field"><label for="f-title">Title</label><input id="f-title" name="title" required value="${esc(m.title)}"></div>
    <div class="field"><label for="f-content">Content</label><textarea id="f-content" name="content" dir="auto" required>${esc(m.content)}</textarea></div>
    <div class="field"><label for="f-tags">Tags (comma separated)</label><input id="f-tags" name="tags" value="${esc((m.tags || []).join(', '))}"></div>
    ${actions(isEdit)}</form>`,
  (d) => { d.tags = d.tags.split(',').map((s) => s.trim()).filter(Boolean); return isEdit ? mutate(`memory/${m.id}`, 'PATCH', d, 'Saved') : mutate('memory', 'POST', d, 'Stored'); },
  () => mutate(`memory/${m.id}`, 'DELETE', null, 'Deleted'));
}

// ---------------------------------------------------------------- interactions
const find = (col, id) => S[col].find((x) => x.id === id);
const ACTIONS = {
  'edit-task': (el) => taskModal(find('tasks', el.dataset.id)),
  'new-task': (el) => taskModal({}, el.dataset.key),
  'edit-content': (el) => contentModal(find('pipeline', el.dataset.id)),
  'new-content': (el) => contentModal({}, el.dataset.key),
  'edit-deal': (el) => dealModal(find('deals', el.dataset.id)),
  'new-deal': (el) => dealModal({}, el.dataset.key),
  'edit-memory': (el) => memoryModal(find('memory', el.dataset.id)),
  'new-memory': () => memoryModal(),
  'board-cat': (el) => { ui.board.cat = el.dataset.v; render(); },
  'board-prio': (el) => { ui.board.prio = el.dataset.v; render(); },
  'logs-range': (el) => { ui.logs.range = el.dataset.v; render(); },
  'logs-agent': (el) => { ui.logs.agent = el.dataset.v; render(); },
  'select-agent': (el) => { ui.agents.selected = ui.agents.selected === el.dataset.name ? null : el.dataset.name; render(); },
  'toggle-table': (el) => { ui.analytics.table[el.dataset.id] = !ui.analytics.table[el.dataset.id]; render(); },
  'show-skill': (el) => {
    const s = S.skills[Number(el.dataset.i)];
    openModal(`<h2>${esc(s.name)}</h2><p class="muted" style="font-size:13px">${esc(s.description)}</p>
      <pre style="white-space:pre-wrap;font:12px/1.55 var(--mono);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px">${esc(s.body)}</pre>
      <p class="muted" style="font-size:12px"><code class="inline">${esc(s.file)}</code></p>
      <div class="modal-actions"><button class="btn" data-close>Close</button></div>`);
  },
  export: () => {
    const { agents, skills, serverTime, ...data } = S;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `mission-control-${ymd(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  reset: () => { if (confirm('Replace all data with the demo data?')) mutate('reset', 'POST', null, 'Demo data restored'); },
};

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-link]');
  if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); navigate(link.getAttribute('href')); return; }
  const el = e.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action] && el.tagName !== 'SELECT' && el.tagName !== 'INPUT') ACTIONS[el.dataset.action](el);
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.kcard, .alert[role=button]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Escape' && ui.agents.selected && $('#modal-root').hidden) { ui.agents.selected = null; render(); }
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.action === 'agent-status') mutate(`agents/${encodeURIComponent(el.dataset.name)}`, 'PATCH', { status: el.value }, 'Status updated');
  if (el.dataset.action === 'import' && el.files[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      if (confirm('Replace all current data with this file?')) await mutate('import', 'POST', data, 'Data imported');
    } catch (err) { toast(`Invalid file: ${err.message}`); }
  }
});
let qTimer;
document.addEventListener('input', (e) => {
  const el = e.target;
  const map = { 'logs-q': () => { ui.logs.q = el.value; }, 'memory-q': () => { ui.memory.q = el.value; } };
  if (!map[el.dataset.action]) return;
  map[el.dataset.action]();
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    const pos = el.selectionStart;
    render();
    const again = $(`[data-action="${el.dataset.action}"]`);
    again?.focus(); again?.setSelectionRange(pos, pos);
  }, 150);
});
document.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'settings') return;
  e.preventDefault();
  mutate('settings', 'PATCH', Object.fromEntries(new FormData(e.target)), 'Settings saved');
});
window.addEventListener('popstate', render);

// glisser-déposer (board, pipeline, deals)
const DRAG = { task: ['tasks', 'status'], content: ['pipeline', 'stage'], deal: ['deals', 'stage'] };
document.addEventListener('dragstart', (e) => {
  const card = e.target.closest?.('[data-drag]');
  if (!card) return;
  ui.dragging = true;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify({ kind: card.dataset.drag, id: card.dataset.id }));
});
document.addEventListener('dragend', (e) => {
  e.target.closest?.('[data-drag]')?.classList.remove('dragging');
  $$('.col-body.drop').forEach((c) => c.classList.remove('drop'));
  ui.dragging = false;
  if (ui.pendingRender) { ui.pendingRender = false; render(); }
});
document.addEventListener('dragover', (e) => {
  const col = e.target.closest?.('[data-drop]');
  if (!col) return;
  e.preventDefault();
  $$('.col-body.drop').forEach((c) => c !== col && c.classList.remove('drop'));
  col.classList.add('drop');
});
document.addEventListener('drop', (e) => {
  const col = e.target.closest?.('[data-drop]');
  if (!col) return;
  e.preventDefault();
  ui.dragging = false;
  let payload;
  try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
  if (payload.kind !== col.dataset.drop) return;
  const [collection, field] = DRAG[payload.kind];
  const item = find(collection, payload.id);
  if (!item || item[field] === col.dataset.key) { render(); return; }
  item[field] = col.dataset.key; // optimiste
  render();
  mutate(`${collection}/${payload.id}`, 'PATCH', { [field]: col.dataset.key });
});

// infobulles
const tip = $('#tooltip');
document.addEventListener('pointermove', (e) => {
  const t = e.target.closest?.('[data-tip]');
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.dataset.tip; // contenu déjà échappé à la construction
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(e.clientX + 12, innerWidth - r.width - 8)}px`;
  tip.style.top = `${Math.max(8, e.clientY - r.height - 12)}px`;
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function applyTheme() {
  const pref = S?.settings?.theme || 'system';
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ---------------------------------------------------------------- live
function connectLive() {
  const es = new EventSource('/api/events');
  let t;
  es.addEventListener('change', () => {
    clearTimeout(t);
    t = setTimeout(async () => { try { await load(); render(); } catch { /* fichier en cours d'écriture */ } }, 80);
  });
}

(async function boot() {
  try {
    await load();
    render();
    connectLive();
    setInterval(() => { if (!$('#modal-root').hidden || document.activeElement?.matches('input,textarea,select')) return; render(); }, 60000); // rafraîchit les "il y a X min"
  } catch (e) {
    $('#main').innerHTML = `<div class="loading">Cannot reach the server: ${esc(e.message)}</div>`;
  }
})();
