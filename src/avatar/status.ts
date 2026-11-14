import { getAstronaut, getLastSaved, getLogs, getMission, getToday } from '@/data/api';
import { exerciseMinutes, menuFatigue } from '@/data/derived';

import { sortStatuses } from './machine';
import type { StatusKey } from './types';

const STRESS_TAGS = ['anxious', 'overloaded', 'stressed'];
export const SAVED_WINDOW_MS = 6000;

/**
 * Bolt's status from the astronaut's data (daily_summaries/logs/avatar.state).
 * Returned in priority order (see STATUS_PRIORITY).
 */
export function deriveStatuses(): StatusKey[] {
  const out = new Set<StatusKey>();
  const me = getAstronaut();
  const today = getToday();
  const state = me.avatar.state;

  // just saved a log
  const saved = getLastSaved();
  if (saved && Date.now() - saved.at < SAVED_WINDOW_MS) out.add('saved');

  // injuries (active or healing)
  for (const inj of getLogs({ type: 'injury' })) {
    if (inj.data.status === 'resolved') continue;
    const p = inj.data.bodyPart;
    if (p === 'leg' || p === 'knee' || p === 'foot') out.add('injuryLeg');
    else if (p === 'arm' || p === 'hand') out.add('injuryArm');
    else out.add('injuryBack');
  }

  // sleep
  const sleep = getLogs({ type: 'sleep', fromDay: today - 1 }).at(-1);
  if ((sleep && sleep.data.durationMin < 6 * 60) || state === 'tired' || state === 'sleepy') out.add('tired');

  // mood / stress / happy
  const mood = getLogs({ type: 'mood', fromDay: today - 1 }).at(-1);
  if (mood) {
    if (mood.data.level === 1 || mood.data.tags.some((t) => STRESS_TAGS.includes(t))) out.add('stress');
    else if (mood.data.level === 2) out.add('lowMood');
    else if (mood.data.level >= 4) out.add('happy');
  }
  if (state === 'sad') out.add('lowMood');
  if (state === 'happy') out.add('happy');

  // food and exercise
  if (menuFatigue()) out.add('menuFatigue');
  const goal = getMission().goals.exerciseMinPerDay;
  if (exerciseMinutes(today) === 0 && exerciseMinutes(today - 1) < goal / 2) out.add('lowExercise');

  return sortStatuses([...out]);
}
