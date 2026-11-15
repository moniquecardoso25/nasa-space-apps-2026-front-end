/** "Fill with Orbi": which categories are still open today, and saving the confirmed drafts. */
import { addLog, getAstronaut, getLogs, getNow, getToday, getTodayLogs, isLoggedToday, saveDailyLog } from './api';
import { estimateMacros } from './derived';
import { hhmm, isoAt, parseHHMM } from './format';
import { draftSleepMinutes, type DraftMap, type FillCategory, type ParseContext } from './orbiParser';
import { session } from './session';
import { setDb } from './store';

export const FILL_ORDER: FillCategory[] = ['mood', 'sleep', 'radiation', 'body', 'meal', 'exercise'];

export const FILL_LABEL: Record<FillCategory, string> = {
  mood: 'Mood',
  sleep: 'Sleep',
  radiation: 'Radiation',
  body: 'Blood pressure',
  meal: 'Meal',
  exercise: 'Exercise',
};

export const FILL_QUESTION: Record<FillCategory, { q: string; hint: string }> = {
  mood: { q: 'How are you feeling today?', hint: 'e.g. “good, a bit tired” or “four out of five, focused”' },
  sleep: { q: 'How did you sleep last night? Hours or bed/wake times both work.', hint: 'e.g. “slept six and a half hours, woke twice” or “bed at eleven thirty, up at six”' },
  radiation: { q: 'What does your dosimeter badge read today?', hint: 'e.g. “38 microsieverts” or “forty point five microsieverts”' },
  body: { q: 'Blood pressure time. What were your numbers?', hint: 'e.g. “118 over 76, pulse 64”' },
  meal: { q: 'What did you eat today, and how did it taste?', hint: 'e.g. “beef stew and tortilla, 600 calories, bland”' },
  exercise: { q: 'Any exercise today? Tell me what and for how long.', hint: 'e.g. “45 min on the treadmill, hard”' },
};

/** Categories with no log today, in interview order. */
export function openCategories(): FillCategory[] {
  const bpToday = getTodayLogs('measurement').some((l) => l.data.metric === 'blood_pressure');
  return FILL_ORDER.filter((c) => {
    if (c === 'body') return !bpToday;
    if (c === 'meal') return !isLoggedToday('meal');
    return !isLoggedToday(c);
  });
}

export function parseContext(): ParseContext {
  const me = getAstronaut();
  const lastSleep = getLogs({ type: 'sleep' }).at(-1);
  return {
    now: hhmm(getNow()),
    lastBed: lastSleep ? hhmm(lastSleep.data.bedtime) : undefined,
    lastWake: lastSleep ? hhmm(lastSleep.data.wakeTime) : undefined,
    restingBp: me.baseline.restingBp,
    restingHr: me.baseline.restingHr,
    lastDoseUsv: getLogs({ type: 'radiation' }).at(-1)?.data.doseUsv,
  };
}

export type Drafts = Partial<{ [K in FillCategory]: DraftMap[K] }>;

const MOOD_LABEL = { 5: 'great', 4: 'good', 3: 'okay', 2: 'tired', 1: 'stressed' } as const;

/** Saves every confirmed draft with addLog (+10 each) and records a summary for Home. */
export function saveDrafts(drafts: Drafts) {
  const today = getToday();
  const saved: string[] = [];
  let coins = 0;
  const lastSleep = getLogs({ type: 'sleep' }).at(-1);

  if (drafts.mood) {
    const d = drafts.mood;
    coins += saveDailyLog('mood', { level: d.level, label: MOOD_LABEL[d.level], tags: d.tags }).coins;
    saved.push('Mood');
  }
  if (drafts.sleep) {
    const d = drafts.sleep;
    const b = parseHHMM(d.bed) ?? 0;
    const w = parseHHMM(d.wake) ?? 0;
    coins += saveDailyLog(
      'sleep',
      {
        bedtime: isoAt(today, d.bed, b > w ? -1 : 0),
        wakeTime: isoAt(today, d.wake),
        durationMin: draftSleepMinutes(d),
        quality: d.quality,
        wakeUps: d.wakeUps,
        source: lastSleep?.data.band ? 'archer_band' : 'manual',
        band: lastSleep?.data.band,
      },
      { environmentId: 'sleep', timestamp: isoAt(today, d.wake), note: 'Filled with Orbi' },
    ).coins;
    saved.push('Sleep');
  }
  if (drafts.radiation) {
    const d = drafts.radiation;
    coins += saveDailyLog(
      'radiation',
      {
        value: d.value,
        unit: d.unit,
        doseUsv: d.unit === 'mSv' ? d.value * 1000 : d.value,
        source: d.source,
        badgeId: d.source === 'personal' ? getAstronaut().devices.dosimeterBadgeId : null,
        particle: 'total',
        illustrative: true,
      },
      { timestamp: isoAt(today, d.readAt) },
    ).coins;
    saved.push('Radiation');
  }
  if (drafts.body) {
    const d = drafts.body;
    addLog('measurement', { metric: 'blood_pressure', cadence: 'daily', values: { systolic: d.systolic, diastolic: d.diastolic, pulse: d.pulse } });
    coins += 10;
    saved.push('Blood pressure');
  }
  if (drafts.meal) {
    const d = drafts.meal;
    addLog(
      'meal',
      { name: d.name, items: d.name.split('+').map((s) => s.trim().toLowerCase()), kcal: d.kcal, ...estimateMacros(d.kcal), tasteRating: d.taste },
      { timestamp: isoAt(today, d.time), environmentId: 'galley' },
    );
    coins += 10;
    saved.push('Meal');
  }
  if (drafts.exercise) {
    const d = drafts.exercise;
    addLog('exercise', { modality: d.modality, equipment: d.equipment, durationMin: d.minutes, effort: d.effort }, { environmentId: 'gym' });
    coins += 10;
    saved.push('Exercise');
  }
  session.orbiFill = { saved, coins, at: Date.now() };
  setDb((db) => ({ ...db })); // notify screens (Home shows the summary)
  return { saved, coins };
}
