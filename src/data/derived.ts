import { getAlerts, getAstronaut, getLogs, getMission, getToday } from './api';
import { formatDuration } from './format';
import type { Level, LogOf, Metric } from './types';

/** Mood level → label shown in the UI. */
export const MOOD_TITLE: Record<number, string> = { 5: 'Great', 4: 'Good', 3: 'Okay', 2: 'Tired', 1: 'Stressed' };
const STRESS_TAGS = ['anxious', 'overloaded', 'stressed'];
export const MOOD_TAGS = ['calm', 'focused', 'motivated', 'homesick', 'lonely', 'anxious', 'overloaded'];

export function moodLevelToLevel(level: number): Level {
  return level >= 3 ? 'ok' : level === 2 ? 'warn' : 'alert';
}

/** Latest measurement of a metric up to (and including) a mission day. */
export function latestMeasurement(metric: Metric, upToDay = getToday()): LogOf<'measurement'> | undefined {
  const list = getLogs({ type: 'measurement', toDay: upToDay }).filter((l) => l.data.metric === metric);
  return list[list.length - 1];
}

/** Level of a % change vs baseline (NASA HRP averages). */
export function deltaLevel(metric: Metric, delta: number | null | undefined): Level {
  if (delta == null) return 'ok';
  if (metric === 'bone_density') return delta <= -3 ? 'alert' : delta <= -1.5 ? 'warn' : 'ok';
  return delta <= -10 ? 'alert' : delta <= -5 ? 'warn' : 'ok';
}

export const formatDelta = (d: number) => `${d < 0 ? '−' : '+'}${Math.abs(Math.round(d * 10) / 10)}%`;

export function sleepLevel(min: number): Level {
  const goal = getMission().goals.sleepHours * 60;
  return min >= goal ? 'ok' : min >= goal - 120 ? 'warn' : 'alert';
}

/** Total personal dose in mSv up to a day (illustrative). */
export function radiationTotalMsv(upToDay = getToday()) {
  const usv = getLogs({ type: 'radiation', toDay: upToDay })
    .filter((l) => l.data.source === 'personal')
    .reduce((s, l) => s + l.data.doseUsv, 0);
  return usv / 1000;
}

export function exerciseMinutes(day = getToday()) {
  return getLogs({ type: 'exercise', missionDay: day }).reduce((s, l) => s + l.data.durationMin, 0);
}

export type Vital = { value: string; level: Level; pending: boolean; label?: string };

/** Values for the 8 Crew status callouts on a given day. */
export function dayVitals(day: number) {
  const today = getToday();
  const isToday = day === today;
  const missing = (label?: string): Vital => ({ value: isToday ? '+ Log today' : '—', level: 'ok', pending: isToday, label });

  const mood = getLogs({ type: 'mood', missionDay: day }).at(-1);
  const sleep = getLogs({ type: 'sleep', missionDay: day }).at(-1);
  const bp = getLogs({ type: 'measurement', missionDay: day }).filter((l) => l.data.metric === 'blood_pressure').at(-1);
  const strength = latestMeasurement('muscle_mass', day) ?? latestMeasurement('strength', day);
  const bone = latestMeasurement('bone_density', day);
  const rad = getLogs({ type: 'radiation', missionDay: day }).length > 0;
  const exMin = exerciseMinutes(day);
  const goal = getMission().goals.exerciseMinPerDay;

  const stressHigh = !!mood && (mood.data.level === 1 || mood.data.tags.some((t) => STRESS_TAGS.includes(t)));
  const stressMid = !!mood && mood.data.level === 2;

  return {
    mood: mood
      ? { value: MOOD_TITLE[mood.data.level], level: moodLevelToLevel(mood.data.level), pending: false }
      : missing(),
    stress: mood
      ? { value: stressHigh ? 'High' : stressMid ? 'Medium' : 'Low', level: (stressHigh ? 'alert' : stressMid ? 'warn' : 'ok') as Level, pending: false }
      : missing(),
    bp: bp
      ? (() => {
          const v = bp.data.values as { systolic: number; diastolic: number };
          const lvl: Level = v.systolic >= 140 || v.diastolic >= 90 ? 'alert' : v.systolic >= 130 ? 'warn' : 'ok';
          return { value: `${v.systolic}/${v.diastolic}`, level: lvl, pending: false, label: 'BP' };
        })()
      : missing('BP · not logged'),
    radiation: rad || radiationTotalMsv(day) > 0
      ? { value: `${radiationTotalMsv(day).toFixed(2)} mSv`, level: 'ok' as Level, pending: false }
      : missing(),
    muscle: strength?.data.deltaVsBaselinePct != null
      ? { value: formatDelta(strength.data.deltaVsBaselinePct), level: deltaLevel(strength.data.metric, strength.data.deltaVsBaselinePct), pending: false }
      : { value: '—', level: 'ok' as Level, pending: false },
    sleep: sleep
      ? { value: formatDuration(sleep.data.durationMin), level: sleepLevel(sleep.data.durationMin), pending: false }
      : missing(),
    exercise: exMin > 0
      ? { value: `${exMin} / ${goal} min`, level: (exMin >= goal ? 'ok' : 'warn') as Level, pending: false }
      : missing(),
    bone: bone?.data.deltaVsBaselinePct != null
      ? { value: formatDelta(bone.data.deltaVsBaselinePct), level: deltaLevel('bone_density', bone.data.deltaVsBaselinePct), pending: false }
      : { value: '—', level: 'ok' as Level, pending: false },
  } satisfies Record<string, Vital>;
}

/** Short friendly line from Orbi for the Home speech bubble (latest alert). */
export function orbiNudge(): string {
  const a = getAlerts()[0];
  const me = getAstronaut();
  if (!a) return `all logs look good today. Keep it up, ${me.name.split(' ')[0]}!`;
  switch (a.type) {
    case 'poor_sleep':
      return 'sleep was short last night. Wind down at 21:00?';
    case 'low_mood':
      return 'rough few days. Want to talk it through?';
    case 'injury':
      return 'how is the injury today? Log how it feels.';
    case 'fitness_drop':
      return 'fitness is dipping. A short session today?';
    case 'menu_fatigue':
      return 'same menu again? Try a new combo today.';
    case 'bone_loss':
      return 'bone density is dropping. Resistive exercise today?';
  }
}

/** Time of the latest log or alert of a day (Crew status "synced HH:MM"). */
export function lastSyncIso(day: number): string | undefined {
  const logs = getLogs({ missionDay: day });
  const t = logs.at(-1)?.timestamp;
  const alert = getAlerts().find((a) => a.timestamp.slice(0, 10) === (t ?? '').slice(0, 10));
  return [t, alert?.timestamp].filter(Boolean).sort().at(-1);
}

// ---------------------------------------------------------------- body measurements

export type BodyMetricDef = {
  metric: Metric;
  label: string;
  short: string;
  cadence: 'daily' | 'weekly';
  icon: 'heart' | 'bone' | 'muscle' | 'zap' | 'activity';
  unit: string;
  baseline: (a: ReturnType<typeof getAstronaut>) => number;
};

export const BODY_METRICS: BodyMetricDef[] = [
  { metric: 'blood_pressure', label: 'Blood pressure', short: 'Blood pressure', cadence: 'daily', icon: 'heart', unit: 'mmHg', baseline: () => 0 },
  { metric: 'bone_density', label: 'Bone density', short: 'Bone density', cadence: 'weekly', icon: 'bone', unit: 'g/cm²', baseline: (a) => a.baseline.boneDensity },
  { metric: 'muscle_mass', label: 'Muscle mass', short: 'Muscle mass', cadence: 'weekly', icon: 'muscle', unit: 'kg', baseline: (a) => a.baseline.muscleMassKg },
  { metric: 'strength', label: 'Strength test', short: 'Strength', cadence: 'weekly', icon: 'zap', unit: 'score', baseline: (a) => a.baseline.strengthScore },
  { metric: 'aerobic', label: 'Aerobic test', short: 'Aerobic', cadence: 'weekly', icon: 'activity', unit: 'score', baseline: (a) => a.baseline.aerobicScore },
];

/** Daily metrics are up to date when logged today; weekly ones when logged in the last 7 days. */
export function measurementStatus(def: BodyMetricDef) {
  const today = getToday();
  const last = latestMeasurement(def.metric);
  const upToDate = !!last && (def.cadence === 'daily' ? last.missionDay === today : last.missionDay > today - 7);
  let text: string;
  if (upToDate) text = last!.missionDay === today ? 'Logged today' : `Logged ${weekdayOfDayLocal(last!.missionDay)}`;
  else text = def.cadence === 'daily' ? 'Not logged today' : 'Due today';
  return { upToDate, last, text };
}

function weekdayOfDayLocal(day: number) {
  const d = new Date(getMission().startDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + day - 1);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
}

/** % change vs the pre-flight baseline (negative = loss). */
export function deltaVsBaseline(def: BodyMetricDef, value: number) {
  const base = def.baseline(getAstronaut());
  return base ? Math.round((value / base - 1) * 1000) / 10 : null;
}

// ---------------------------------------------------------------- injuries

export const INJURY_PART_LABEL: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  back: 'Back',
  arm: 'Arm',
  hand: 'Hand',
  leg: 'Leg',
  knee: 'Knee',
  foot: 'Foot',
};
export const INJURY_KIND_LABEL: Record<string, string> = { bruise: 'Bruise', cut: 'Cut', strain: 'Strain', burn: 'Burn', pain: 'Pain, no cause' };

export function injuryTitle(d: { bodyPart: string; side: string }) {
  const part = INJURY_PART_LABEL[d.bodyPart] ?? d.bodyPart;
  return d.side === 'center' ? part : `${d.side === 'left' ? 'Left' : 'Right'} ${part.toLowerCase()}`;
}

export function injuryStatusLevel(status: 'active' | 'healing' | 'resolved'): Level {
  return status === 'active' ? 'alert' : status === 'healing' ? 'warn' : 'ok';
}

// ---------------------------------------------------------------- meals

/** Daily macro targets shown in AppMeals (not in mission.goals). */
export const MACRO_GOALS = { proteinG: 90, carbsG: 300, fatG: 80 };

/** Quick picks for the meal form with an approximate kcal each (ISS-style menu). */
export const MEAL_PICKS: { name: string; kcal: number }[] = [
  { name: 'Shrimp cocktail', kcal: 180 },
  { name: 'Beef stew', kcal: 520 },
  { name: 'Tortilla', kcal: 260 },
  { name: 'Fresh lettuce', kcal: 20 },
  { name: 'Coffee', kcal: 10 },
  { name: 'Rehydrated soup', kcal: 300 },
  { name: 'Oatmeal', kcal: 300 },
  { name: 'Nuts', kcal: 290 },
];

/** Macros estimated from kcal (15% protein, 55% carbs, 30% fat) when not entered. */
export function estimateMacros(kcal: number) {
  return {
    proteinG: Math.round((kcal * 0.15) / 4),
    carbsG: Math.round((kcal * 0.55) / 4),
    fatG: Math.round((kcal * 0.3) / 9),
  };
}

/**
 * Menu fatigue: the same meal on 3+ consecutive days with a falling/low taste
 * rating (NASA "menu fatigue"), or an Orbi menu_fatigue alert.
 */
export function menuFatigue(): string | null {
  const meals = getLogs({ type: 'meal' });
  const today = getToday();
  const names = [...new Set(meals.map((m) => m.data.name))];
  for (const name of names) {
    const days = new Set(meals.filter((m) => m.data.name === name).map((m) => m.missionDay));
    let run = 0;
    for (let d = today; d >= 1 && (days.has(d) || d === today); d--) {
      if (days.has(d)) run++;
      else if (d !== today) break;
    }
    const ratings = meals.filter((m) => m.data.name === name).slice(-3).map((m) => m.data.tasteRating);
    const low = ratings.length > 0 && ratings.reduce((a, b) => a + b, 0) / ratings.length <= 3;
    if (run >= 3 && low) return `${name} ${run} days in a row and ratings are dropping. Try something new to avoid menu fatigue.`;
  }
  const alert = getAlerts().find((a) => a.type === 'menu_fatigue');
  return alert ? `${alert.text} Try something new to avoid menu fatigue.` : null;
}

export const EFFORT_LABEL = ['', 'very easy', 'easy', 'moderate', 'hard', 'max effort'];
