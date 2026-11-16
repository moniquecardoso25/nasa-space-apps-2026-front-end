/**
 * Offline-first link between the in-memory database (store.ts) and the Crew Health API.
 *
 * - Sign-in: POST /app/auth/login, then GET /app/snapshot replaces the mock with live data
 *   in the same shape, so the screens keep reading synchronously through api.ts.
 * - Writes: api.ts changes the local database first (the screen updates at once) and puts
 *   the change in a queue. The queue is sent with POST /app/me/sync, where each operation
 *   has its own id and is applied at most once, so sending again after a dropped link is safe.
 * - With no link the queue waits on the device (and survives a reload on web); when the
 *   link is back it is sent and the snapshot is fetched again.
 */
import { useSyncExternalStore } from 'react';

import { backendEnabled, getTokens, HttpError, login, NetworkError, newId, request, restoreSession, setTokens, storage } from './backend';
import { getDb, onDbChange, replaceDb } from './store';
import type { Db, Log, LogType } from './types';

// ---------------------------------------------------------------- status (for the banner)

export interface SyncStatus {
  /** mock: bundled demo data, nothing is sent. live: connected to the backend. */
  mode: 'mock' | 'live';
  /** False after a request got no answer; true again after the next one that did. */
  online: boolean;
  /** Changes saved on the device and not yet received by the server. */
  pending: number;
  lastSyncAt: string | null;
  /** Last problem worth showing (a change the server refused, or the session ended). */
  problem: string | null;
}

let status: SyncStatus = { mode: 'mock', online: true, pending: 0, lastSyncAt: null, problem: null };
const statusListeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  statusListeners.forEach((l) => l());
}
export const getSyncStatus = () => status;
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => status,
  );
}
export const isLive = () => status.mode === 'live';

// ---------------------------------------------------------------- queue

interface SyncOp {
  opId: string;
  type: 'log.create' | 'log.update' | 'message.send' | 'chat.save';
  recordedAt: string;
  missionDay?: number;
  targetId?: string;
  payload: Record<string, unknown>;
}
type QueueItem =
  | { kind: 'op'; op: SyncOp }
  /** Routes outside /sync (shop, onboarding). A 4xx answer drops the item: the server is the truth. */
  | { kind: 'rest'; id: string; method: 'POST' | 'PUT' | 'PATCH'; path: string; body: unknown };

interface Saved {
  crewId: string;
  queue: QueueItem[];
  /** Logs created on this device that the server has not named yet: local id → opId of their log.create. */
  localLogs: Record<string, string>;
  db: Db | null;
}

const SAVED_KEY = 'cosmomedic.offline.v1';
const DEVICE_KEY = 'cosmomedic.device.v1';
const RETRY_MS = 15000;
const REFRESH_MS = 60000;
const MAX_BATCH = 100;

let queue: QueueItem[] = [];
let localLogs: Record<string, string> = {};
let flushing = false;
let activeFlush: Promise<void> | null = null;
let sessionEpoch = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let stopWatching: (() => void) | null = null;

const deviceId = (() => {
  let id = storage.get<string>(DEVICE_KEY);
  if (!id) {
    id = newId();
    storage.set(DEVICE_KEY, id);
  }
  return id;
})();

function save() {
  const t = getTokens();
  if (!isLive() || !t) return;
  storage.set(SAVED_KEY, { crewId: t.crewId, queue, localLogs, db: getDb() } satisfies Saved);
}
/** The database changes often (every write); keep the device copy at most ~3x per second. */
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save();
  }, 300);
}

function enqueue(item: QueueItem) {
  if (!isLive()) return;
  queue.push(item);
  setStatus({ pending: queue.length });
  save();
  void flush();
}

// ---------------------------------------------------------------- server <-> app formats

/** Voice notes: the app keeps a local `uri`; the API field is `url`. */
function toServerData(type: LogType, data: unknown): Record<string, unknown> {
  const d = { ...(data as Record<string, unknown>) };
  const vn = d.voiceNote as { uri?: string; durationSec?: number; transcript?: string } | undefined;
  if (type === 'mood' && vn) {
    d.voiceNote = { url: vn.uri || 'local://voice-note', durationSec: vn.durationSec ?? 0, transcript: vn.transcript };
  }
  return d;
}

function fromServerLog(l: Log): Log {
  const vn = (l.data as { voiceNote?: { url?: string; uri?: string } }).voiceNote;
  if (l.type === 'mood' && vn && vn.url && !vn.uri) {
    return { ...l, data: { ...l.data, voiceNote: { ...vn, uri: vn.url } } } as Log;
  }
  return l;
}

/**
 * The app's station clock keeps the date on mission.today and only the time of day moves
 * (api.ts getNow). The server stamps messages with the real date, which can be days later in
 * the demo; those are put back on mission.today, keeping their time, so they sort and group
 * with what the astronaut sees as "today".
 */
function stationClock(snap: Db) {
  const start = Date.parse(snap.mission.startDate + 'T00:00:00Z');
  const todayEnd = start + snap.mission.today * 86400000;
  /** Whole days `iso` is past mission.today (0 when it is on or before it). */
  const ahead = (iso: string) => {
    const t = Date.parse(iso);
    return Number.isNaN(t) || t < todayEnd ? 0 : Math.floor((t - todayEnd) / 86400000) + 1;
  };
  const back = (iso: string, days: number) => (days ? new Date(Date.parse(iso) - days * 86400000).toISOString() : iso);
  return { ahead, back, pin: (iso: string) => back(iso, ahead(iso)) };
}

function fromSnapshot(snap: Db): Db {
  const { ahead, back, pin } = stationClock(snap);
  return {
    ...snap,
    logs: snap.logs.map(fromServerLog).map((l) => ({ ...l, timestamp: pin(l.timestamp) })),
    // The arrival moves with the sending time, so a message never arrives before it was sent.
    ground_messages: snap.ground_messages.map((m) => {
      const days = ahead(m.sentAt);
      return { ...m, sentAt: back(m.sentAt, days), estimatedArrivalAt: back(m.estimatedArrivalAt, days) };
    }),
    ai_chat: {
      ...snap.ai_chat,
      messages: snap.ai_chat.messages.map((m) => ({ ...m, timestamp: pin(m.timestamp) })),
      journal: snap.ai_chat.journal.map((j) => ({ ...j, timestamp: pin(j.timestamp) })),
      alerts: snap.ai_chat.alerts.map((x) => ({ ...x, timestamp: pin(x.timestamp) })),
    },
  };
}

/** Persist uploaded URLs in the queue so retries do not upload the audio again. */
async function prepareOp(op: SyncOp): Promise<SyncOp> {
  const data = op.payload.data as { voiceNote?: { url: string; durationSec: number; transcript?: string } } | undefined;
  const note = data?.voiceNote;
  if ((op.type !== 'log.create' && op.type !== 'log.update') || op.payload.type !== 'mood' || !note || /^https?:/.test(note.url)) return op;
  const form = new FormData();
  if (/^blob:|^data:/.test(note.url)) {
    const blob = await fetch(note.url).then((response) => response.blob());
    form.append('file', blob, blob.type.includes('mp4') ? 'voice.m4a' : 'voice.webm');
  } else {
    form.append('file', { uri: note.url, name: 'voice.m4a', type: 'audio/mp4' } as unknown as Blob);
  }
  const uploaded = await request<{ url: string }>('POST', '/api/v1/app/me/uploads', form);
  data!.voiceNote = { ...note, url: uploaded.url };
  save();
  return op;
}

// ---------------------------------------------------------------- snapshot

/** Fetches the server copy. Skipped (false) while changes are still waiting, so they are never lost from the screen. */
async function hydrate(): Promise<boolean> {
  const snap = await request<Db>('GET', '/api/v1/app/snapshot');
  if (queue.length) return false;
  replaceDb(fromSnapshot(snap));
  setStatus({ online: true, pending: 0, lastSyncAt: new Date().toISOString() });
  save();
  return true;
}

// ---------------------------------------------------------------- sending the queue

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, RETRY_MS);
}

/** Sends everything that is waiting, in order, then refreshes the local copy from the server. */
export function flush(): Promise<void> {
  if (!isLive()) return Promise.resolve();
  if (activeFlush) return activeFlush;
  activeFlush = flushQueue().finally(() => { activeFlush = null; });
  return activeFlush;
}

async function flushQueue(): Promise<void> {
  const epoch = sessionEpoch;
  if (flushing || !isLive()) return;
  flushing = true;
  try {
    if (getTokens()?.role === 'ground') { await hydrate(); return; }
    for (;;) {
      while (queue.length) {
        const head = queue[0];
        if (head.kind === 'op') {
          const batch: SyncOp[] = [];
          for (const item of queue) {
            if (item.kind !== 'op' || batch.length >= MAX_BATCH) break;
            batch.push(await prepareOp(item.op));
          }
          const out = await request('POST', '/api/v1/app/me/sync', {
            deviceId,
            clientTime: new Date().toISOString(),
            queuedRemaining: queue.length - batch.length,
            ops: batch,
          });
          if (epoch !== sessionEpoch) return;
          queue.splice(0, batch.length);
          const refused = (out.results as { status: string; type: string; error?: { detail?: unknown } }[]).filter(
            (r) => r.status === 'rejected' || r.status === 'conflict',
          );
          if (refused.length) {
            const d = refused[0].error?.detail;
            setStatus({ problem: `The server did not accept ${refused.length} change(s): ${typeof d === 'string' ? d : refused[0].type}` });
          }
        } else {
          try {
            await request(head.method, head.path, head.body);
          } catch (e) {
            if (!(e instanceof HttpError) || e.status === 401 || e.status >= 500) throw e;
            setStatus({ problem: `The server did not accept a change: ${e.detail}` });
          }
          queue.shift();
        }
        if (epoch !== sessionEpoch) return;
        setStatus({ online: true, pending: queue.length });
        save();
      }
      if (await hydrate()) break;
    }
  } catch (e) {
    if (epoch !== sessionEpoch) return;
    if (e instanceof NetworkError || (e instanceof HttpError && e.status >= 500)) {
      setStatus({ online: false, pending: queue.length });
      if (isLive()) scheduleRetry();
    } else if (e instanceof HttpError && e.status === 401) {
      setStatus({ problem: 'Your session ended. Sign in again to send the changes saved on this device.' });
    } else {
      setStatus({ problem: e instanceof Error ? e.message : 'Sync failed' });
      scheduleRetry();
    }
  } finally {
    flushing = false;
  }
}

const onOnline = () => { void flush(); };

function start() {
  sessionEpoch++;
  setStatus({ mode: 'live', pending: queue.length, problem: null });
  stopWatching?.();
  stopWatching = onDbChange(saveSoon);
  if (refreshTimer) clearInterval(refreshTimer);
  // New ground messages and alerts arrive by asking again; also retries after the link comes back.
  refreshTimer = setInterval(() => void flush(), REFRESH_MS);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.removeEventListener('online', onOnline);
    window.addEventListener('online', onOnline);
  }
}

export function stopLive(persist = true) {
  sessionEpoch++;
  if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
  if (persist) save();
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  stopWatching?.();
  stopWatching = null;
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
  queue = [];
  localLogs = {};
  setStatus({ mode: 'mock', pending: 0, problem: null });
}

// ---------------------------------------------------------------- sign in

export type SignInResult =
  | { ok: true; role: 'astronaut' | 'ground'; mode: 'live' | 'offline' | 'mock' }
  | { ok: false; reason: 'credentials' | 'no_server'; message?: string };

/**
 * Signs in on the backend and loads the live data.
 * - Wrong Crew ID / PIN: `credentials`.
 * - No link, but this Crew ID used this device before: opens the copy saved on the device (`offline`).
 * - No link and no saved copy: `no_server` (the login screen shows a connection error; demo mode requires explicit configuration).
 */
export async function signInLive(crewId: string, pin: string): Promise<SignInResult> {
  if (!backendEnabled) return { ok: false, reason: 'no_server' };
  const id = crewId.trim().toLowerCase();
  const saved = storage.get<Saved>(SAVED_KEY);
  const sameUser = saved?.crewId.toLowerCase() === id;
  try {
    const out = await login(id, pin);
    setTokens({ accessToken: out.accessToken, refreshToken: out.refreshToken, role: out.role, crewId: id });
    // Changes this same person left on the device go up first; someone else's are dropped.
    const mine = sameUser;
    queue = mine ? saved!.queue : [];
    localLogs = mine ? saved!.localLogs : {};
    if (mine && saved!.db && queue.length) replaceDb(saved!.db);
    start();
    if (queue.length) await flush();
    else await hydrate();
    return { ok: true, role: out.role, mode: 'live' };
  } catch (e) {
    if (e instanceof HttpError) {
      // Refused, or a server without the app routes: nothing live is left running on the demo data.
      stopLive(false);
      setTokens(null);
      return { ok: false, reason: e.status === 401 || e.status === 403 ? 'credentials' : 'no_server', message: e.detail };
    }
    const t = getTokens();
    if (saved?.db && sameUser && t?.crewId.toLowerCase() === id) {
      restoreSession();
      queue = saved.queue;
      localLogs = saved.localLogs;
      replaceDb(saved.db);
      start();
      setStatus({ online: false });
      scheduleRetry();
      return { ok: true, role: t.role, mode: 'offline' };
    }
    stopLive(false);
    return { ok: false, reason: 'no_server' };
  }
}

// ---------------------------------------------------------------- changes made on the device (called by api.ts)

const now = () => new Date().toISOString();
/** A log that only exists on this device is addressed by the operation that creates it. */
const logRef = (id: string) => (localLogs[id] ? `op:${localLogs[id]}` : id);

export const remote = {
  logCreated(log: Log) {
    if (!isLive()) return;
    const opId = newId();
    localLogs[log.id] = opId;
    enqueue({
      kind: 'op',
      op: {
        opId,
        type: 'log.create',
        recordedAt: now(),
        missionDay: log.missionDay,
        payload: {
          type: log.type,
          data: toServerData(log.type, log.data),
          note: log.note ?? null,
          environmentId: log.environmentId ?? null,
          timestamp: log.timestamp,
        },
      },
    });
  },

  logUpdated(log: Log) {
    enqueue({
      kind: 'op',
      op: {
        opId: newId(),
        type: 'log.update',
        recordedAt: now(),
        targetId: logRef(log.id),
        payload: { type: log.type, data: toServerData(log.type, log.data), note: log.note ?? null, environmentId: log.environmentId ?? null },
      },
    });
  },

  messageSent(text: string, urgent: boolean, attachments: string[]) {
    enqueue({
      kind: 'op',
      op: { opId: newId(), type: 'message.send', recordedAt: now(), payload: { text, urgent, attachments: attachments.map(logRef) } },
    });
  },

  /** A journal-mode exchange with Orbi (the reply is made on the device, so it also works with no link). */
  chatSaved(text: string, reply: string, summary: string, moodLevel?: number) {
    enqueue({
      kind: 'op',
      op: { opId: newId(), type: 'chat.save', recordedAt: now(), payload: { text, reply, summary, ...(moodLevel ? { moodLevel } : {}) } },
    });
  },

  itemBought(itemId: string) {
    enqueue({ kind: 'rest', id: newId(), method: 'POST', path: '/api/v1/app/me/avatar/purchase', body: { itemId } });
  },

  /** `itemId: null` with category `pet` takes the pet off. */
  itemEquipped(itemId: string | null, category?: string) {
    enqueue({ kind: 'rest', id: newId(), method: 'POST', path: '/api/v1/app/me/avatar/equip', body: itemId ? { itemId } : { itemId: null, category } });
  },

  devicePaired(device: 'bpCuff' | 'wristBandPaired') {
    enqueue({ kind: 'rest', id: newId(), method: 'PATCH', path: '/api/v1/app/me/devices', body: { [device]: true } });
  },

  onboardingDone(avatarName: string, dailyReminders: boolean) {
    enqueue({ kind: 'rest', id: newId(), method: 'POST', path: '/api/v1/app/me/onboarding', body: { avatarName, dailyReminders } });
  },
};
