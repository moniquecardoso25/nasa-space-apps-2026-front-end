import { ANIMATIONS, IDLE, STATUS_PRIORITY, byId } from './animations';
import type { AnimationDef, StatusKey } from './types';

/**
 * Bolt animation state machine (pure reducer, no XState).
 *
 *   ┌────────┐ NEXT (no status)        ┌────────┐
 *   │  idle  │ ──────────────────────▶ │  idle  │  weighted random, no repeat
 *   └────────┘                         └────────┘
 *       │ NEXT (statuses active)            ▲
 *       ▼                                   │ NEXT (statuses cleared)
 *   ┌────────┐ ────────────────────────────┘
 *   │ status │  top status ×1, other active statuses ×0.5, idle ×0.05
 *   └────────┘
 *       ▲  SAVED (interrupts anything except forced) · a new top status interrupts an idle animation
 *       │  ┌───────────┐ NEXT
 *       └──│ celebrate │──────▶ idle/status
 *          └───────────┘
 *   FORCE(anim) → forced (dev selector) · RELEASE → back to automatic
 */
export interface BoltState {
  anim: string;
  reason: StatusKey | 'idle' | 'forced';
  /** Increments on every transition so the actor restarts even when anim repeats. */
  seq: number;
  forced: string | null;
}

export type BoltEvent =
  | { type: 'NEXT'; statuses: StatusKey[]; hasPet: boolean; rand: number }
  | { type: 'SAVED' }
  | { type: 'FORCE'; anim: string }
  | { type: 'RELEASE'; statuses: StatusKey[]; hasPet: boolean; rand: number };

export const initialBoltState: BoltState = { anim: 'walk', reason: 'idle', seq: 0, forced: null };

export function sortStatuses(s: StatusKey[]): StatusKey[] {
  return STATUS_PRIORITY.filter((k) => s.includes(k));
}

/** Weighted candidates for the next animation. */
export function candidates(statuses: StatusKey[], hasPet: boolean, last: string): { def: AnimationDef; w: number; reason: BoltState['reason'] }[] {
  const active = sortStatuses(statuses).filter((s) => s !== 'saved');
  const ok = (d: AnimationDef) => !d.needsPet || hasPet;
  let list: { def: AnimationDef; w: number; reason: BoltState['reason'] }[];
  if (!active.length) {
    list = IDLE.filter(ok).map((def) => ({ def, w: def.weight, reason: 'idle' as const }));
  } else {
    const [top, ...rest] = active;
    const byStatus = (s: StatusKey, k: number) =>
      ANIMATIONS.filter((d) => d.kind === 'status' && d.statuses?.includes(s) && ok(d)).map((def) => ({ def, w: def.weight * k, reason: s }));
    list = [
      ...byStatus(top, 1),
      ...rest.flatMap((s) => byStatus(s, 0.5)),
      // a little everyday life so status moods don't look frozen
      ...IDLE.filter(ok).map((def) => ({ def, w: def.weight * 0.05, reason: 'idle' as const })),
    ];
  }
  // Idle animations don't repeat back to back; status animations may (a status can have a single one).
  const noRepeat = list.filter((c) => c.def.id !== last || c.def.kind !== 'idle');
  return noRepeat.length ? noRepeat : list;
}

export function pick(list: ReturnType<typeof candidates>, rand: number) {
  const total = list.reduce((s, c) => s + c.w, 0);
  let r = rand * total;
  for (const c of list) {
    r -= c.w;
    if (r <= 0) return c;
  }
  return list[list.length - 1];
}

export function boltReducer(state: BoltState, ev: BoltEvent): BoltState {
  switch (ev.type) {
    case 'FORCE':
      return { anim: byId(ev.anim).id, reason: 'forced', seq: state.seq + 1, forced: ev.anim };
    case 'SAVED':
      if (state.forced) return state;
      return { anim: 'celebrate', reason: 'saved', seq: state.seq + 1, forced: null };
    case 'RELEASE':
    case 'NEXT': {
      if (ev.type === 'NEXT' && state.forced) return { ...state, seq: state.seq + 1 }; // replay forced anim
      const c = pick(candidates(ev.statuses, ev.hasPet, state.anim), ev.rand);
      return { anim: c.def.id, reason: c.reason, seq: state.seq + 1, forced: null };
    }
  }
}

/** Reduced motion: one static pose for the current top status (or a neutral stand). */
export function staticAnimFor(statuses: StatusKey[]): string | null {
  const top = sortStatuses(statuses).find((s) => s !== 'saved');
  if (!top) return null;
  return ANIMATIONS.find((d) => d.kind === 'status' && d.statuses?.includes(top))?.id ?? null;
}
