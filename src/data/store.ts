import { useMemo, useSyncExternalStore } from 'react';

import raw from '@/mocks/mock-db.json';

import type { Db } from './types';

/**
 * In-memory database seeded from src/mocks/mock-db.json.
 * Screens never import the JSON: they go through src/data/api.ts.
 * Writes replace the root object (immutable), so subscribers re-render.
 * Data resets on reload (no backend yet).
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
