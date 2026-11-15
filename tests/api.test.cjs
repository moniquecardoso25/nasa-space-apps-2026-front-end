const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Execute the app's TypeScript with Node's built-in test runner (no test dependency).
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  module._compile(code, filename);
};

const http = require('../src/data/http.ts');
const api = require('../src/data/api.ts');
const remote = require('../src/data/remote.ts');
const store = require('../src/data/store.ts');
const seed = require('../src/mocks/mock-db.json');
const originalFetch = global.fetch;
const token = { accessToken: 'access', refreshToken: 'refresh', user: { role: 'astronaut', astronautId: seed.currentAstronautId } };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
let snapshot;
let calls;
let handler;

test.beforeEach(() => {
  snapshot = structuredClone(seed);
  calls = [];
  http.setSession(token);
  store.resetDb();
  handler = () => { throw new Error('Unexpected request'); };
  global.fetch = async (url, init = {}) => {
    const request = { path: new URL(url).pathname.replace('/api/v1', ''), method: init.method ?? 'GET', headers: new Headers(init.headers), body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body };
    calls.push(request);
    if (request.path === '/app/snapshot') return json(snapshot);
    if (request.path === '/app/leaderboard') return json({ rows: snapshot.astronauts.map((a, i) => ({ astronautId: a.id, rank: i + 1, logs: 40 - i, coins: a.avatar.coins })) });
    return handler(request);
  };
});
test.after(() => { global.fetch = originalFetch; http.setSession(null); });

test('login sends username/password and loads the authenticated snapshot', async () => {
  handler = (r) => {
    assert.equal(r.path, '/auth/login');
    assert.deepEqual(r.body, { username: 'ana', password: 'secret-letters' });
    assert.equal(r.headers.has('Authorization'), false);
    return json(token);
  };
  snapshot.astronauts[0].name = 'Server astronaut';
  await api.signIn(' ana ', 'secret-letters');
  assert.equal(store.getDb().astronauts[0].name, 'Server astronaut');
  assert.equal(calls[1].headers.get('Authorization'), 'Bearer access');
});

test('invalid credentials clear the old session without loading data', async () => {
  handler = () => json({ detail: 'Invalid username or password' }, 401);
  await assert.rejects(api.signIn('ana', 'bad'), /Invalid username/);
  assert.equal(http.getSessionRole(), null);
  assert.equal(calls.length, 1);
});

test('concurrent 401s rotate the refresh token only once and retry with the new access token', async () => {
  let refreshes = 0;
  handler = async (r) => {
    if (r.path === '/auth/refresh') {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(r.body.refreshToken, 'refresh');
      return json({ accessToken: 'next-access', refreshToken: 'next-refresh' });
    }
    return r.headers.get('Authorization') === 'Bearer next-access' ? json({ ok: true }) : json({ detail: 'Expired' }, 401);
  };
  const results = await Promise.all([http.request('/one'), http.request('/two')]);
  assert.equal(refreshes, 1);
  assert.deepEqual(results, [{ ok: true }, { ok: true }]);
});

test('rejected refresh expires the session', async () => {
  handler = () => json({ detail: 'Expired' }, 401);
  await assert.rejects(http.request('/one'));
  assert.equal(http.getSessionRole(), null);
});

test('log writes unwrap LogSaved and use server coins, bonus, and ID', async () => {
  const log = { id: 'server-log', astronautId: seed.currentAstronautId, type: 'mood', missionDay: 12, timestamp: '2026-11-14T12:00:00Z', environmentId: null, note: null, coinsEarned: 10, data: { level: 4, label: 'good', tags: [] } };
  handler = (r) => {
    assert.equal(r.path, '/app/me/logs');
    assert.ok(r.headers.get('Idempotency-Key').length >= 8);
    return json({ log, coins: 800, coinsEarned: 10, bonus: { coins: 50 } }, 201);
  };
  const result = await api.addLog('mood', log.data);
  assert.equal(result.id, 'server-log');
  assert.equal(api.getAstronaut().avatar.coins, 800);
  assert.equal(api.getLastSaved().coins, 60);
  assert.equal(api.getLogs().filter((l) => l.id === 'server-log').length, 1);
});

test('failed writes leave local logs and coins unchanged', async () => {
  const before = structuredClone(store.getDb());
  handler = () => json({ detail: [{ loc: ['body', 'data', 'level'], msg: 'Must be at most 5' }] }, 422);
  await assert.rejects(api.addLog('mood', { level: 8, tags: [] }), /data.level/);
  assert.deepEqual(store.getDb(), before);
});

test('uncertain writes preserve the original idempotency key and timestamp on retry', async () => {
  let attempts = 0;
  const data = { modality: 'aerobic', equipment: 'cycle', durationMin: 15, effort: 2 };
  handler = (r) => {
    if (++attempts === 1) throw new TypeError('Network lost after commit');
    return json({ log: { id: 'retried', astronautId: seed.currentAstronautId, type: 'exercise', missionDay: 12, timestamp: r.body.timestamp, coinsEarned: 10, data }, coins: 500, coinsEarned: 10 }, 201);
  };
  await assert.rejects(api.addLog('exercise', data));
  await api.addLog('exercise', data);
  const writes = calls.filter((r) => r.path === '/app/me/logs');
  assert.equal(writes[0].headers.get('Idempotency-Key'), writes[1].headers.get('Idempotency-Key'));
  assert.equal(writes[0].body.timestamp, writes[1].body.timestamp);
});

test('voice note URLs from the server are adapted for the local audio player', async () => {
  snapshot.logs.push({ id: 'voice', astronautId: seed.currentAstronautId, type: 'mood', missionDay: 12, timestamp: '2026-11-14T12:00:00Z', coinsEarned: 10, data: { level: 3, tags: [], voiceNote: { url: 'https://example.test/voice.m4a', durationSec: 3 } } });
  await api.refreshData();
  assert.equal(api.getLogs({ type: 'mood' }).find((l) => l.id === 'voice').data.voiceNote.uri, 'https://example.test/voice.m4a');
});

test('successful writes stay successful when snapshot refresh is unavailable', async () => {
  global.fetch = async (url) => url.endsWith('/app/snapshot') ? json({ detail: 'Unavailable' }, 503) : json({ ok: true });
  assert.deepEqual(await remote.mutate('/app/me/onboarding', { avatarName: 'Bolt' }), { ok: true });
  assert.match(remote.getRefreshWarning(), /Saved on the server/);
});

test('private Orbi messages are sent as private and never inserted in the local journal', async () => {
  const before = structuredClone(store.getDb().ai_chat);
  handler = (r) => {
    assert.equal(r.path, '/app/me/orbi/chat');
    assert.deepEqual(r.body, { text: 'hello', mode: 'private' });
    return json({ message: { id: 'mine' }, reply: { id: 'reply', text: 'Hello' } });
  };
  await api.chatWithOrbi('hello', 'private');
  assert.deepEqual(store.getDb().ai_chat, before);
  assert.equal(calls.length, 1);
});


test('leaderboard uses server counts instead of counting the private snapshot logs', async () => {
  snapshot.logs = [];
  await api.refreshData();
  assert.equal(api.getLeaderboard('logs')[0].logs, 40);
});
