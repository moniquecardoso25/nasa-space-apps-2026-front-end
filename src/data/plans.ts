/**
 * What the medical team planned for each mission day (demo data until the API has it):
 * - meal plan with the nutrition already filled in;
 * - training schedule (sessions to confirm, not to type).
 * Plus simulated device readings (wrist band, dosimeter, BP cuff) for the daily check-in.
 *
 * The astronaut only confirms: "as planned", "ate part", "swapped" or "skipped".
 * Planned is never treated as done: a meal or session counts only after it is confirmed.
 */
import { addLog, getAstronaut, getLogs, getNow, getToday, getTodayLogs } from './api';
import { estimateMacros, MEAL_PICKS } from './derived';
import { hhmm, isoAt, parseHHMM } from './format';
import type { BodyDraft, RadiationDraft, SleepDraft } from './orbiParser';
import type { ExerciseData, MealData } from './types';

// ---------------------------------------------------------------- meals

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type PlannedMeal = { id: string; slot: MealSlot; time: string; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number };
export type Adherence = NonNullable<MealData['adherence']>;
/** The astronaut's answer for one planned meal. `null` = not answered yet (e.g. dinner later today). */
/** taste: 1–5 stars, 5 by default (change it only if the food was not great). */
export type MealChoice = { meal: PlannedMeal; status: Adherence | null; eatenPct: number; swapTo: string | null; taste: number };

export const SLOT_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

/** Three rotating daily menus (ISS-style), ≈ 2,500 kcal each. */
const MENUS: [MealSlot, string, string, number][][] = [
  [
    ['breakfast', '07:30', 'Oatmeal + coffee', 420],
    ['lunch', '12:30', 'Beef stew + tortilla', 780],
    ['snack', '16:00', 'Nuts + dried fruit', 450],
    ['dinner', '19:30', 'Chicken teriyaki + rice', 850],
  ],
  [
    ['breakfast', '07:30', 'Scrambled eggs + tortilla', 480],
    ['lunch', '12:30', 'Rehydrated soup + crackers', 640],
    ['snack', '16:00', 'Granola bar + coffee', 330],
    ['dinner', '19:30', 'Salmon + mashed potatoes', 1050],
  ],
  [
    ['breakfast', '07:30', 'Granola + milk', 450],
    ['lunch', '12:30', 'Shrimp cocktail + mac and cheese', 820],
    ['snack', '16:00', 'Fruit cup + nuts', 380],
    ['dinner', '19:30', 'Beef fajitas + fresh lettuce', 850],
  ],
];

export function mealPlan(day = getToday()): PlannedMeal[] {
  return MENUS[day % MENUS.length].map(([slot, time, name, kcal]) => ({ id: `mp-${day}-${slot}`, slot, time, name, kcal, ...estimateMacros(kcal) }));
}

/** Station food catalog for swaps: everything on the menus + the quick picks. */
export function foodCatalog(): { name: string; kcal: number }[] {
  const seen = new Map<string, number>();
  MENUS.flat().forEach(([, , name, kcal]) => seen.set(name, kcal));
  MEAL_PICKS.forEach((p) => seen.has(p.name) || seen.set(p.name, p.kcal));
  return [...seen].map(([name, kcal]) => ({ name, kcal }));
}

const due = (time: string) => (parseHHMM(time) ?? 0) <= (parseHHMM(hhmm(getNow())) ?? 0);

/** Planned meals of today not confirmed yet; meals already due start as "as planned". */
export function openMealChoices(): MealChoice[] {
  const done = new Set(getTodayLogs('meal').map((l) => l.data.planMealId).filter(Boolean));
  return mealPlan()
    .filter((m) => !done.has(m.id))
    .map((meal) => ({ meal, status: due(meal.time) ? 'followed' : null, eatenPct: 100, swapTo: null, taste: 5 }));
}

/** Saves one meal log per answered choice (+10 each). Returns how many were saved. */
export function saveMealChoices(choices: MealChoice[]): number {
  const today = getToday();
  let n = 0;
  for (const c of choices) {
    if (!c.status) continue;
    const swapped = c.status === 'swapped' && c.swapTo ? foodCatalog().find((f) => f.name === c.swapTo) : undefined;
    const pct = c.status === 'partial' ? c.eatenPct : c.status === 'skipped' ? 0 : 100;
    const kcal = swapped ? swapped.kcal : Math.round((c.meal.kcal * pct) / 100);
    const name = swapped ? swapped.name : c.meal.name;
    addLog(
      'meal',
      {
        name,
        items: name.split('+').map((s) => s.trim().toLowerCase()),
        kcal,
        ...estimateMacros(kcal),
        ...(c.status === 'skipped' ? {} : { tasteRating: c.taste }),
        planMealId: c.meal.id,
        adherence: c.status,
        eatenPct: pct,
      },
      { timestamp: isoAt(today, c.meal.time), environmentId: 'galley' },
    );
    n++;
  }
  return n;
}

export function adherenceText(d: Pick<MealData, 'adherence' | 'eatenPct'>): string | null {
  if (!d.adherence) return null;
  if (d.adherence === 'partial') return `Ate ${d.eatenPct ?? 50}%`;
  return { followed: 'As planned', swapped: 'Swapped', skipped: 'Skipped' }[d.adherence];
}

// ---------------------------------------------------------------- exercise

export type PlannedSession = {
  id: string;
  time: string;
  label: string;
  modality: ExerciseData['modality'];
  equipment: ExerciseData['equipment'];
  minutes: number;
  effort: number;
};
export type SessionChoice = { session: PlannedSession; status: 'done' | 'changed' | 'skipped' | null; minutes: number };

/** ISS-style routine: resistive + aerobic every day, rest every 7th day. */
export function trainingPlan(day = getToday()): PlannedSession[] {
  if (day % 7 === 0) return [];
  const aerobicCycle = day % 2 === 0;
  return [
    { id: `tp-${day}-res`, time: '07:10', label: 'Resistive (ARED)', modality: 'resistive', equipment: 'resistive_device', minutes: 45, effort: 3 },
    {
      id: `tp-${day}-aer`,
      time: '11:00',
      label: aerobicCycle ? 'Aerobic · cycle' : 'Aerobic · treadmill',
      modality: 'aerobic',
      equipment: aerobicCycle ? 'cycle' : 'treadmill',
      minutes: 45,
      effort: 3,
    },
  ];
}

export function openSessionChoices(): SessionChoice[] {
  const done = new Set(getTodayLogs('exercise').map((l) => l.data.plannedId).filter(Boolean));
  return trainingPlan()
    .filter((s) => !done.has(s.id))
    .map((session) => ({ session, status: due(session.time) ? 'done' : null, minutes: session.minutes }));
}

export function saveSessionChoices(choices: SessionChoice[]): number {
  let n = 0;
  for (const c of choices) {
    if (!c.status || c.status === 'skipped') continue;
    const s = c.session;
    addLog(
      'exercise',
      { modality: s.modality, equipment: s.equipment, durationMin: c.status === 'changed' ? c.minutes : s.minutes, effort: s.effort, plannedId: s.id },
      { environmentId: 'gym', timestamp: isoAt(getToday(), s.time) },
    );
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- simulated devices

/** Small deterministic wobble per day so demo readings look alive but repeatable. */
const wobble = (day: number, salt: number, span: number) => (((day * 37 + salt * 11) % (span * 2 + 1)) - span);

export type DeviceReadings = { sleep: SleepDraft; radiation: RadiationDraft; body: BodyDraft; sync: string };

/** What the wrist band, dosimeter badge and BP cuff "send" this morning (demo data, no hardware). */
export function readDevices(day = getToday()): DeviceReadings {
  const me = getAstronaut();
  const last = getLogs({ type: 'sleep' }).at(-1);
  const bed = parseHHMM(last ? hhmm(last.data.bedtime) : me.baseline.usualBedtime) ?? 23 * 60;
  const bedMin = (bed + wobble(day, 1, 20) + 1440) % 1440;
  const wakeMin = 6 * 60 + wobble(day, 2, 15);
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const [sys, dia] = me.baseline.restingBp.split('/').map(Number);
  const dose = getLogs({ type: 'radiation' }).filter((l) => l.data.source === 'personal').at(-1)?.data.doseUsv ?? 40;
  return {
    sleep: { bed: fmt(bedMin), wake: fmt(wakeMin), quality: last?.data.quality ?? 3, wakeUps: last?.data.wakeUps ?? '1-2' },
    radiation: { value: Math.max(1, Math.round(dose + wobble(day, 3, 3))), unit: 'uSv', source: 'personal', readAt: '08:00' },
    body: { systolic: sys + wobble(day, 4, 4), diastolic: dia + wobble(day, 5, 3), pulse: me.baseline.restingHr + wobble(day, 6, 4) },
    sync: fmt(wakeMin + 2),
  };
}

/** Extra daily vitals for My health (demo): skin temperature from the band, glucose from a finger-stick. */
export function extraVitals(day = getToday()) {
  const temp = Math.round((36.6 + wobble(day, 7, 3) / 10) * 10) / 10;
  const glucose = 92 + wobble(day, 8, 9);
  return {
    temp: { value: temp, level: temp >= 37.5 || temp < 35.5 ? 'alert' : temp >= 37.2 ? 'warn' : 'ok' } as const,
    glucose: { value: glucose, level: glucose > 140 || glucose < 70 ? 'alert' : glucose > 110 ? 'warn' : 'ok' } as const,
  };
}
