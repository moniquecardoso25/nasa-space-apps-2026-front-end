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
const backend = require('../src/data/backend.ts');
const sync = require('../src/data/sync.ts');
const store = require('../src/data/store.ts');
const seed = require('../src/mocks/mock-db.json');
const originalFetch = global.fetch;
const token = { accessToken: 'access', refreshToken: 'refresh', user: { role: 'astronaut', astronautId: seed.currentAstronautId } };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
let snapshot;
let snapshotStatus;
let calls;
let handler;

test.beforeEach(() => {
  sync.stopLive(false);
  backend.storage.remove('cosmomedic.offline.v1');
  backend.setTokens({ accessToken: 'access', refreshToken: 'refresh', role: 'astronaut', crewId: 'ana' });
  snapshot = { ...structuredClone(seed), role: 'astronaut' };
  snapshotStatus = 200;
  calls = [];
  store.resetDb();
  handler = (r) => {
    if (r.path === '/auth/login') return json(token);
    throw new Error('Unexpected request: ' + r.path);
  };
  global.fetch = async (url, init = {}) => {
    if (url.startsWith('data:')) return originalFetch(url, init);
    const r = { path: new URL(url).pathname.replace('/api/v1', ''), method: init.method ?? 'GET', headers: new Headers(init.headers), body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body };
    calls.push(r);
    if (r.path === '/app/snapshot') return json(snapshotStatus === 200 ? snapshot : { detail: 'This account has no CosmoMedic profile' }, snapshotStatus);
    return handler(r);
  };
});
test.afterEach(() => { sync.stopLive(false); backend.setTokens(null); });
test.after(() => { global.fetch = originalFetch; });

async function authenticate() { await api.signIn('ana', 'letters-and-numbers'); calls = []; }

test('login sends username/password and loads the authenticated snapshot', async () => {
  handler = (r) => {
    assert.equal(r.path, '/auth/login');
    assert.deepEqual(r.body, { username: 'ana', password: 'secret-letters' });
    assert.equal(r.headers.has('Authorization'), false);
    return json(token);
  };
  snapshot.astronauts[0].name = 'Server astronaut';
  await api.signIn(' Ana ', 'secret-letters');
  assert.equal(store.getDb().astronauts[0].name, 'Server astronaut');
  assert.equal(calls[1].headers.get('Authorization'), 'Bearer access');
});

test('medical and admin accounts map to the ground dashboard', async () => {
  for (const role of ['medical', 'admin']) {
    handler = () => json({ ...token, user: { role, astronautId: null } });
    snapshot.role = 'ground';
    assert.equal(await api.signIn('surgeon', 'password'), null);
    assert.equal(http.getSessionRole(), 'ground');
  }
});

test('invalid credentials clear the session without loading demo data', async () => {
  handler = () => json({ detail: 'Invalid username or password' }, 401);
  await assert.rejects(api.signIn('ana', 'bad'), /Invalid username/);
  assert.equal(http.getSessionRole(), null);
  assert.equal(calls.length, 1);
});

test('demo Crew IDs fall back to the bundled demo data when the server refuses them', async () => {
  handler = () => json({ detail: 'Invalid username or password' }, 401);
  const a = await api.signIn('orb3-leo', '1234');
  assert.equal(a.crewId, 'ORB3-LEO');
  assert.equal(http.isDemoSession(), true);
  assert.equal(http.getSessionRole(), null);
  assert.equal(sync.getSyncStatus().mode, 'mock');
  // a real account with a wrong password still fails, and a demo ID needs a 4-digit PIN
  await assert.rejects(api.signIn('ana', '1234'), /Invalid username/);
  assert.equal(http.isDemoSession(), false);
  await assert.rejects(api.signIn('ORB3-LEO', 'not-a-pin'), /Invalid username/);
});

test('accounts without a CosmoMedic profile retain the server error and cannot navigate', async () => {
  snapshotStatus = 403;
  await assert.rejects(api.signIn('ana', 'password'), /no CosmoMedic profile/);
  assert.equal(http.getSessionRole(), null);
  assert.equal(sync.getSyncStatus().mode, 'mock');
});

test('concurrent 401s rotate the refresh token only once and retry with the new token', async () => {
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
  assert.deepEqual(await Promise.all([http.request('/one'), http.request('/two')]), [{ ok: true }, { ok: true }]);
  assert.equal(refreshes, 1);
  assert.equal(backend.getTokens().refreshToken, 'next-refresh');
  assert.equal(backend.storage.get('cosmomedic.tokens.v1').refreshToken, 'next-refresh');
});

test('rejected refresh expires the session and removes stored tokens', async () => {
  handler = () => json({ detail: 'Expired' }, 401);
  await assert.rejects(http.request('/one'));
  assert.equal(http.getSessionRole(), null);
  assert.equal(backend.getTokens(), null);
});

test('logs enter the offline queue and server synchronization replaces optimistic IDs and coins', async () => {
  await authenticate();
  handler = (r) => {
    assert.equal(r.path, '/app/me/sync');
    const op = r.body.ops[0];
    assert.equal(op.type, 'log.create');
    snapshot.logs.push({ id: 'server-log', astronautId: seed.currentAstronautId, missionDay: 12, coinsEarned: 10, ...op.payload });
    snapshot.astronauts.find((a) => a.id === seed.currentAstronautId).avatar.coins = 800;
    return json({ results: [{ status: 'applied', type: 'log.create' }] });
  };
  const log = api.addLog('mood', { level: 4, label: 'good', tags: [] });
  assert.ok(api.getLogs().some((l) => l.id === log.id));
  await sync.flush();
  assert.equal(sync.getSyncStatus().pending, 0);
  assert.equal(api.getAstronaut().avatar.coins, 800);
  assert.equal(api.getLogs().filter((l) => l.id === 'server-log').length, 1);
});

test('network failures retain local logs and replay the same operation ID and timestamp', async () => {
  await authenticate();
  handler = () => { throw new TypeError('Offline'); };
  const log = api.addLog('exercise', { modality: 'aerobic', equipment: 'cycle', durationMin: 15, effort: 2 });
  await sync.flush();
  assert.equal(sync.getSyncStatus().pending, 1);
  assert.equal(sync.getSyncStatus().online, false);
  assert.ok(api.getLogs().some((l) => l.id === log.id));
  assert.equal(backend.storage.get('cosmomedic.offline.v1').queue.length, 1);
  handler = () => json({ results: [{ status: 'applied', type: 'log.create' }] });
  await sync.flush();
  const writes = calls.filter((r) => r.path === '/app/me/sync');
  assert.equal(writes.length, 2);
  assert.equal(writes[0].body.ops[0].opId, writes[1].body.ops[0].opId);
  assert.equal(writes[0].body.ops[0].payload.timestamp, writes[1].body.ops[0].payload.timestamp);
  assert.equal(sync.getSyncStatus().pending, 0);
});

test('server rejection is visible and restores authoritative data', async () => {
  await authenticate();
  const before = snapshot.logs.length;
  handler = () => json({ results: [{ status: 'rejected', type: 'log.create', error: { detail: 'Invalid measurement' } }] });
  api.addLog('mood', { level: 4, label: 'good', tags: [] });
  await sync.flush();
  assert.match(sync.getSyncStatus().problem, /Invalid measurement/);
  assert.equal(api.getLogs({ astronautId: seed.currentAstronautId }).length, snapshot.logs.filter((l) => l.astronautId === seed.currentAstronautId).length);
  assert.equal(snapshot.logs.length, before);
});

test('voice audio uploads before its log is synchronized and remote URLs map to player URIs', async () => {
  await authenticate();
  handler = (r) => {
    if (r.path === '/app/me/uploads') {
      assert.ok(r.body instanceof FormData);
      assert.equal(r.headers.has('Content-Type'), false);
      return json({ url: 'https://example.test/voice.webm' }, 201);
    }
    assert.equal(r.path, '/app/me/sync');
    const op = r.body.ops[0];
    assert.equal(op.payload.data.voiceNote.url, 'https://example.test/voice.webm');
    snapshot.logs.push({ id: 'voice-log', astronautId: seed.currentAstronautId, missionDay: 12, coinsEarned: 10, ...op.payload });
    return json({ results: [{ status: 'applied', type: 'log.create' }] });
  };
  api.addLog('mood', { level: 3, label: 'okay', tags: [], voiceNote: { uri: 'data:audio/webm;base64,AA==', durationSec: 1 } });
  await sync.flush();
  assert.equal(api.getLogs({ type: 'mood' }).find((l) => l.id === 'voice-log').data.voiceNote.uri, 'https://example.test/voice.webm');
});

test('private Orbi messages remain on the device and never enter the journal or offline queue', async () => {
  await authenticate();
  const before = structuredClone(store.getDb().ai_chat);
  api.addAiMessage('hello', 'astronaut', 'private');
  api.addAiMessage('Hello', 'orbi', 'private');
  assert.deepEqual(store.getDb().ai_chat, before);
  assert.equal(sync.getSyncStatus().pending, 0);
  assert.equal(calls.length, 0);
});

test('crew rankings use snapshot counts rather than other astronauts private logs', async () => {
  const other = snapshot.astronauts.find((a) => a.id !== seed.currentAstronautId);
  snapshot.logs = [];
  snapshot.leaderboard = [{ astronautId: other.id, logs: 40, coins: 1500 }];
  await authenticate();
  assert.equal(api.getLeaderboard('logs')[0].logs, 40);
});
