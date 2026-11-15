import { ApiError, getSessionVersion, request } from './http';
import { setDb } from './store';
import type { Db, LeaderboardRow, Log } from './types';

let queue: Promise<unknown> = Promise.resolve();
let refreshWarning: string | null = null;
const pendingKeys = new Map<string, string>();
export const getRefreshWarning = () => refreshWarning;

export function decodeLog(log: Log): Log {
  if (log.type !== 'mood' || !log.data.voiceNote) return log;
  const note = log.data.voiceNote as typeof log.data.voiceNote & { url?: string };
  return { ...log, data: { ...log.data, voiceNote: { ...note, uri: note.url ?? note.uri } } };
}

async function loadSnapshot() {
  const version = getSessionVersion();
  const snapshot = await request<Db>('/app/snapshot');
  if (!snapshot?.mission || !Array.isArray(snapshot.astronauts) || !Array.isArray(snapshot.logs) || !snapshot.ai_chat) {
    throw new Error('Mission Control returned an invalid snapshot.');
  }
  if (version !== getSessionVersion()) return;
  snapshot.logs = snapshot.logs.map(decodeLog);
  refreshWarning = null;
  // Other astronauts' logs are private; their ranking must come from the ranking API.
  const rankings = await Promise.allSettled((['logs', 'coins'] as const).map(async (by) => {
    const data = await request<unknown>(`/app/leaderboard?by=${by}`);
    return readLeaderboard(data, by, snapshot);
  }));
  if (version !== getSessionVersion()) return;
  snapshot.leaderboards = {
    logs: rankings[0].status === 'fulfilled' ? rankings[0].value : [],
    coins: rankings[1].status === 'fulfilled' ? rankings[1].value : [],
  };
  if (rankings.some((result) => result.status === 'rejected')) refreshWarning = 'Crew ranking is unavailable. Tap Refresh to try again.';
  setDb(() => snapshot);
}

function readLeaderboard(data: unknown, by: 'logs' | 'coins', snapshot: Db): LeaderboardRow[] {
  const envelope = data as Record<string, unknown> | null;
  const rows = Array.isArray(data) ? data : envelope?.rows ?? envelope?.items ?? envelope?.leaderboard ?? envelope?.ranking;
  if (!Array.isArray(rows)) throw new Error('Invalid leaderboard response.');
  return rows.map((row, index) => {
    const id = row.astronautId ?? row.astronaut?.id ?? row.id;
    const astronaut = snapshot.astronauts.find((a) => a.id === id);
    const logs = row.logs ?? row.logsCount ?? row.logCount;
    const coins = row.coins ?? row.avatar?.coins ?? row.astronaut?.avatar?.coins;
    const value = row.value ?? (by === 'logs' ? logs : coins);
    if (!astronaut || typeof value !== 'number') throw new Error('Invalid leaderboard row.');
    return { astronaut, logs: typeof logs === 'number' ? logs : by === 'logs' ? value : 0, coins: typeof coins === 'number' ? coins : astronaut.avatar.coins, rank: row.rank ?? index + 1, value };
  });
}

/** Reads share the write queue to prevent stale polling results. */
export function refreshData(): Promise<void> {
  const task = queue.catch(() => {}).then(loadSnapshot);
  queue = task;
  return task;
}

/** Serialize writes and refreshes so an older snapshot cannot overwrite a newer one. */
export function mutate<T>(path: string, body: unknown, method = 'POST', idempotencyKey?: string): Promise<T> {
  const version = getSessionVersion();
  const signature = `${version}:${path}:${JSON.stringify(body)}`;
  const key = idempotencyKey ? pendingKeys.get(signature) ?? idempotencyKey : undefined;
  if (key) pendingKeys.set(signature, key);
  const task = queue.catch(() => {}).then(async () => {
    if (version !== getSessionVersion()) throw new ApiError('Session changed. Please sign in again.', 401);
    let result: T;
    try {
      result = await request<T>(path, {
        method, body: JSON.stringify(body),
        headers: key ? { 'Idempotency-Key': key } : undefined,
      });
      pendingKeys.delete(signature);
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) pendingKeys.delete(signature);
      throw error;
    }
    // A committed write must not look failed just because the subsequent read failed.
    try { await loadSnapshot(); }
    catch {
      refreshWarning = 'Saved on the server. Data could not refresh; tap Refresh to update this screen.';
      setDb((db) => ({ ...db }));
    }
    return result;
  });
  queue = task;
  return task;
}
