import { useMemo, useSyncExternalStore } from 'react';

import raw from '@/mocks/mock-db.json';

import type { Db } from './types';

/**
 * In-memory database seeded from src/mocks/mock-db.json.
 * Screens never import the JSON: they go through src/data/api.ts.
 * Writes replace the root object (immutable), so subscribers re-render.
 * With the backend on (src/data/sync.ts) the mock is replaced at sign-in by the
 * server snapshot, which has the same shape; without it, data resets on reload.
 */
let db: Db = structuredClone(raw as unknown as Db);
let version = 0;
const listeners = new Set<() => void>();

export function getDb(): Db {
  return db;
}

export function setDb(update: (draft: Db) => Db) {
  db = update(db);
  version++;
  listeners.forEach((l) => l());
}

/** Replaces the whole database (server snapshot or a copy saved on the device). */
export function replaceDb(next: Db) {
  setDb(() => next);
}

/** Runs `l` after every change (used to keep a copy on the device). */
export function onDbChange(l: () => void) {
  return subscribe(l);
}

/** True for the Crew IDs of the bundled demo crew (TEST, ORB3-ANA, …). */
export function isDemoCrewId(id: string) {
  const want = id.trim().toUpperCase();
  return (raw as unknown as Db).astronauts.some((a) => a.crewId.toUpperCase() === want);
}

/** Test/dev helper: restore the original mock. */
export function resetDb() {
  setDb(() => structuredClone(raw as unknown as Db));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-renders when the db changes and memoizes `read` per version. */
export function useData<T>(read: () => T, deps: unknown[] = []): T {
  const v = useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  const key = JSON.stringify(deps);
  // `read` is a fresh closure every render; recompute only when the db or deps change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [v, key]);
}
