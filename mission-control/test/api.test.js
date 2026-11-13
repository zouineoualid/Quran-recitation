import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, parseFrontmatter } from '../server.js';

let server, base;
before(async () => {
  server = start(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const j = async (path, method = 'GET', body) => {
  const res = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
};

test('frontmatter : listes inline et en bloc', () => {
  const { meta, body } = parseFrontmatter('---\nname: a\nconnects: [b, c]\ntools:\n  - Read\n  - Bash\n---\nHello');
  assert.deepEqual(meta.connects, ['b', 'c']);
  assert.deepEqual(meta.tools, ['Read', 'Bash']);
  assert.equal(body, 'Hello');
});

test('state expose agents et skills depuis .claude/', async () => {
  const { status, data } = await j('/state');
  assert.equal(status, 200);
  assert.equal(data.agents.length, 8);
  assert.equal(data.agents[0].name, 'orchestrator');
  const edges = data.agents.reduce((s, a) => s + a.connects.length, 0);
  assert.equal(edges, 10);
  assert.ok(data.skills.length >= 1);
});

test('CRUD sur les tâches', async () => {
  const c = await j('/tasks', 'POST', { title: 'test', status: 'todo', category: 'Ops', priority: 'P3' });
  assert.equal(c.status, 201);
  const u = await j(`/tasks/${c.data.id}`, 'PATCH', { status: 'done', id: 'hijack' });
  assert.equal(u.data.status, 'done');
  assert.equal(u.data.id, c.data.id);
  const d = await j(`/tasks/${c.data.id}`, 'DELETE');
  assert.equal(d.data.deleted, 1);
  assert.equal((await j('/tasks/nope', 'PATCH', {})).status, 404);
});

test('passer un contenu en posted renseigne postedAt', async () => {
  const c = await j('/pipeline', 'POST', { title: 'x', stage: 'edited' });
  const u = await j(`/pipeline/${c.data.id}`, 'PATCH', { stage: 'posted' });
  assert.ok(u.data.postedAt);
  await j(`/pipeline/${c.data.id}`, 'DELETE');
});

test('route statique protégée contre le path traversal', async () => {
  const res = await fetch(base.replace('/api', '') + '/..%2fserver.js');
  assert.notEqual(res.status, 200);
});
