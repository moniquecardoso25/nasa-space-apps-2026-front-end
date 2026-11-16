/** Daily check-in ("Fill with Orbi"): which categories are still open today, and saving the confirmed drafts. */
import { addLog, getAstronaut, getLogs, getNow, getToday, getTodayLogs, isLoggedToday, saveDailyLog } from './api';
import { estimateMacros } from './derived';
import { hhmm, isoAt, parseHHMM } from './format';
import { draftSleepMinutes, type DraftMap, type FillCategory, type ParseContext } from './orbiParser';
import { saveMealChoices, saveSessionChoices, type MealChoice, type SessionChoice } from './plans';
import { session } from './session';
import { setDb } from './store';

export const FILL_ORDER: FillCategory[] = ['mood', 'sleep', 'radiation', 'body', 'meal', 'exercise'];

/** Read automatically from the devices (demo): no question, the astronaut only checks the card. */
export const AUTO_FILLED: FillCategory[] = ['sleep', 'radiation', 'body'];

/** Where each auto-filled card comes from. */
export const SOURCE_LABEL: Partial<Record<FillCategory, string>> = {
  sleep: 'From your ARCHeR wrist band · demo',
  radiation: 'From your personal dosimeter badge · demo',
  body: 'From the blood pressure cuff · demo',
  meal: 'From your meal plan (medical team) · demo',
  exercise: 'From your training schedule · demo',
};

export const FILL_LABEL: Record<FillCategory, string> = {
  mood: 'Mood',
  sleep: 'Sleep',
  radiation: 'Radiation',
  body: 'Blood pressure',
  meal: 'Meal',
  exercise: 'Exercise',
};

export const FILL_QUESTION: Record<FillCategory, { q: string; hint: string }> = {
  mood: { q: 'How are you feeling? Great, good, okay, tired or stressed?', hint: 'You can add how: “good, focused” or “tired, homesick”' },
  sleep: { q: 'How did you sleep?', hint: 'e.g. “slept six and a half hours, woke twice” or “bed at eleven thirty, up at six”' },
  radiation: { q: 'What does your badge read?', hint: 'e.g. “38 microsieverts” or “forty point five microsieverts”' },
  body: { q: 'Your blood pressure?', hint: 'e.g. “118 over 76, pulse 64”' },
  meal: { q: 'Meals as planned, taste 5 stars? Say OK, or what to change.', hint: '“OK” · “half the lunch” · “lunch was 3 stars” · “didn’t like the stew”' },
  exercise: { q: 'Training as planned?', hint: 'e.g. “yes” or “only 20 minutes on the treadmill”' },
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
export async function saveDrafts(
  drafts: Drafts,
  plan: { meals?: MealChoice[]; sessions?: SessionChoice[] } = {},
  onSaved?: (category: FillCategory) => void,
) {
  const today = getToday();
  const saved: string[] = [];
  let coins = 0;
  const lastSleep = getLogs({ type: 'sleep' }).at(-1);

  if (drafts.mood) {
    const d = drafts.mood;
    coins += (await saveDailyLog('mood', { level: d.level, label: MOOD_LABEL[d.level], tags: d.tags })).coins;
    saved.push('Mood');
    onSaved?.('mood');
    session.orbiFill = { saved: [...saved], coins, at: Date.now() };
  }
  if (drafts.sleep) {
    const d = drafts.sleep;
    const b = parseHHMM(d.bed) ?? 0;
    const w = parseHHMM(d.wake) ?? 0;
    coins += (await saveDailyLog(
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
    )).coins;
    saved.push('Sleep');
    onSaved?.('sleep');
    session.orbiFill = { saved: [...saved], coins, at: Date.now() };
  }
  if (drafts.radiation) {
    const d = drafts.radiation;
    coins += (await saveDailyLog(
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
    )).coins;
    saved.push('Radiation');
    onSaved?.('radiation');
    session.orbiFill = { saved: [...saved], coins, at: Date.now() };
  }
  if (drafts.body) {
    const d = drafts.body;
    await addLog('measurement', { metric: 'blood_pressure', cadence: 'daily', values: { systolic: d.systolic, diastolic: d.diastolic, pulse: d.pulse } });
    coins += 10;
    saved.push('Blood pressure');
    onSaved?.('body');
    session.orbiFill = { saved: [...saved], coins, at: Date.now() };
  }
  if (drafts.meal) {
    const d = drafts.meal;
    await addLog(
      'meal',
      { name: d.name, items: d.name.split('+').map((s) => s.trim().toLowerCase()), kcal: d.kcal, ...estimateMacros(d.kcal), tasteRating: d.taste },
      { timestamp: isoAt(today, d.time), environmentId: 'galley' },
    );
    coins += 10;
    saved.push('Meal');
    onSaved?.('meal');
    session.orbiFill = { saved: [...saved], coins, at: Date.now() };
  }
  if (plan.meals?.length) {
    const n = saveMealChoices(plan.meals.filter((c) => c.status !== 'swapped' || c.swapTo));
    if (n) {
      coins += n * 10;
      saved.push(n === 1 ? 'Meal' : `${n} meals`);
      onSaved?.('meal');
      session.orbiFill = { saved: [...saved], coins, at: Date.now() };
    }
  }
  if (plan.sessions?.length) {
    const n = saveSessionChoices(plan.sessions);
    if (n) {
      coins += n * 10;
      saved.push(n === 1 ? 'Exercise' : `${n} sessions`);
      onSaved?.('exercise');
      session.orbiFill = { saved: [...saved], coins, at: Date.now() };
    }
  }
  if (drafts.exercise) {
    const d = drafts.exercise;
    await addLog('exercise', { modality: d.modality, equipment: d.equipment, durationMin: d.minutes, effort: d.effort }, { environmentId: 'gym' });
    coins += 10;
    saved.push('Exercise');
    onSaved?.('exercise');
    session.orbiFill = { saved: [...saved], coins, at: Date.now() };
  }
  session.orbiFill = { saved, coins, at: Date.now() };
  setDb((db) => ({ ...db })); // notify screens (Home shows the summary)
  return { saved, coins };
}
