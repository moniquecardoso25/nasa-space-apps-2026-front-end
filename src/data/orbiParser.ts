/**
 * "Fill with Orbi" answer parser.
 *
 * Isolated behind the `OrbiFillParser` interface so it can be swapped for an
 * LLM later (same input: category + free text + context; same output: a draft
 * plus what is still missing). This implementation is rule-based: numbers,
 * times and keywords in English ("good", "tired", "slept 6 hours").
 */
import { MEAL_PICKS, MOOD_TAGS } from './derived';
import { parseHHMM, sleepMinutes } from './format';
import { spokenToDigits } from './spokenNumbers';
import type { ExerciseData, MoodData, RadiationData, SleepData } from './types';

export type FillCategory = 'mood' | 'sleep' | 'radiation' | 'body' | 'meal' | 'exercise';

export type MoodDraft = Pick<MoodData, 'level' | 'tags'>;
export type SleepDraft = { bed: string; wake: string; quality: number; wakeUps: SleepData['wakeUps'] };
export type RadiationDraft = { value: number; unit: RadiationData['unit']; source: RadiationData['source']; readAt: string };
export type BodyDraft = { systolic: number; diastolic: number; pulse: number };
export type MealDraft = { name: string; kcal: number; taste: number; time: string };
export type ExerciseDraft = { modality: ExerciseData['modality']; equipment: ExerciseData['equipment']; minutes: number; effort: number };

export interface DraftMap {
  mood: MoodDraft;
  sleep: SleepDraft;
  radiation: RadiationDraft;
  body: BodyDraft;
  meal: MealDraft;
  exercise: ExerciseDraft;
}

/** Context the parser may use for defaults (e.g. last night's band times, baseline BP). */
export interface ParseContext {
  now: string; // "HH:MM"
  lastBed?: string;
  lastWake?: string;
  restingBp?: string; // "118/76"
  restingHr?: number;
  lastDoseUsv?: number;
}

export interface ParseResult<C extends FillCategory> {
  draft: DraftMap[C];
  /** true when the answer contained the key fact (otherwise defaults were used) */
  understood: boolean;
  /** human labels of fields filled with defaults, shown on the confirm card */
  assumed: string[];
  skipped?: boolean;
}

export interface OrbiFillParser {
  parse<C extends FillCategory>(category: C, text: string, ctx: ParseContext): ParseResult<C>;
}

// ------------------------------------------------------------------ helpers

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const has = (t: string, words: string[]) => words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(t));

/**
 * Replaces spelled numbers with digits ("one hundred eighteen", "sixty-four",
 * "six and a half"): speech recognition often writes numbers in words.
 */
function digits(t: string) {
  return spokenToDigits(t);
}

const pad = (n: number) => String(n).padStart(2, '0');
const toHHMM = (min: number) => `${pad(Math.floor((((min % 1440) + 1440) % 1440) / 60))}:${pad((((min % 1440) + 1440) % 1440) % 60)}`;

/** Finds clock times like "23:30", "6h", "6am", "11 pm", "at 23h". */
function findTimes(t: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,2})(?:[:h.](\d{2}))?\s*(am|pm|h\b)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 12), m.index);
    const isClock = !!m[2] || !!m[3] || /\b(at|by|around)\s*$/.test(before);
    if (!isClock) continue;
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h <= 23 && min <= 59) out.push(h * 60 + min);
  }
  return out;
}

/** "6 hours", "6h30", "6.5 h", "7 and a half hours" → minutes */
function findDurationMin(t: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours)\b(?:\s*(?:and)?\s*(\d{1,2})\s*(?:m|min|mins|minutes)?)?/.exec(t);
  if (m) {
    let min = Math.round(Number(m[1].replace(',', '.')) * 60);
    if (m[2]) min += Number(m[2]);
    if (/(and a half|half)/.test(t.slice(m.index, m.index + m[0].length + 14))) min += 30;
    return min;
  }
  const hm = /(\d{1,2})h(\d{2})/.exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const onlyMin = /(\d{2,3})\s*(?:m|min|mins|minutes)\b/.exec(t);
  if (onlyMin) return Number(onlyMin[1]);
  return null;
}

const SKIP = ['skip', 'pass', 'later', 'not now', 'no data'];

// ------------------------------------------------------------------ categories

function parseMood(raw: string): ParseResult<'mood'> {
  const t = digits(norm(raw));
  let level: MoodDraft['level'] | null = null;
  const score = /([1-5])\s*(?:\/|out of)\s*5/.exec(t);
  if (score) level = Number(score[1]) as MoodDraft['level'];
  else if (/not\s+(so\s+|very\s+)?(great|good|well)/.test(t)) level = 2;
  else if (has(t, ['stressed', 'stress', 'anxious', 'overwhelmed', 'terrible', 'awful', 'bad', 'panic'])) level = 1;
  else if (has(t, ['tired', 'exhausted', 'sleepy', 'drained', 'worn out'])) level = 2;
  else if (has(t, ['okay', 'ok', 'meh', 'so so', 'so-so', 'normal', 'alright', 'fine'])) level = 3;
  else if (has(t, ['great', 'amazing', 'excellent', 'awesome', 'fantastic'])) level = 5;
  else if (has(t, ['good', 'well', 'happy'])) level = 4;

  const tagWords: Record<string, string[]> = {
    calm: ['calm', 'relaxed'],
    focused: ['focused', 'focus'],
    motivated: ['motivated', 'productive'],
    homesick: ['homesick', 'miss home', 'family'],
    lonely: ['lonely', 'alone'],
    anxious: ['anxious', 'worried', 'nervous'],
    overloaded: ['overloaded', 'overwhelmed', 'busy'],
  };
  const tags = MOOD_TAGS.filter((tag) => has(t, tagWords[tag] ?? [tag]));
  return { draft: { level: level ?? 3, tags }, understood: level !== null, assumed: level === null ? ['mood level'] : [] };
}

function parseSleep(raw: string, ctx: ParseContext): ParseResult<'sleep'> {
  const t = digits(norm(raw));
  const dur = findDurationMin(t);
  const times = findTimes(t);
  let bed: number | null = null;
  let wake: number | null = null;
  // A clock time needs a preposition ("at 23h", "around 11") or a clock format ("23:30", "6am");
  // "slept 6 hours" / "woke 3 times" are a duration and a count, not times.
  const clock = String.raw`(?:(?:at|by|around)\s*(\d{1,2}(?:[:h]\d{2})?\s*(?:am|pm|h)?)|(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)))`;
  const bedRe = new RegExp(String.raw`(bed|slept|sleep|went to sleep)[^0-9]{0,14}?` + clock);
  const wakeRe = new RegExp(String.raw`(woke|wake|got up)[^0-9]{0,14}?` + clock);
  const bm = bedRe.exec(t);
  const wm = wakeRe.exec(t);
  const bedM = bm ? [bm[0], bm[1], bm[2] ?? bm[3]] : null;
  const wakeM = wm ? [wm[0], wm[1], wm[2] ?? wm[3]] : null;
  if (bedM) bed = findTimes(`at ${bedM[2]}`)[0] ?? null;
  if (wakeM) wake = findTimes(`at ${wakeM[2]}`)[0] ?? null;
  if (bed === null && wake === null && times.length >= 2) [bed, wake] = times;
  // Bedtime said without am/pm ("bed at eleven thirty"): 7–11 means the evening.
  const bedSaid = bedM?.[2] ?? '';
  if (bed !== null && !/am|pm/.test(bedSaid) && bed >= 7 * 60 && bed < 12 * 60) bed += 12 * 60;

  const lastWake = parseHHMM(ctx.lastWake ?? '') ?? 6 * 60 + 30;
  const lastBed = parseHHMM(ctx.lastBed ?? '') ?? 23 * 60;
  const assumed: string[] = [];
  if (wake === null && bed !== null && dur !== null) wake = (bed + dur) % 1440;
  if (wake === null) {
    wake = lastWake;
    assumed.push('wake time');
  }
  if (bed === null) {
    if (dur !== null) bed = (wake - dur + 1440) % 1440;
    else {
      bed = lastBed;
      assumed.push('bedtime');
    }
  }

  let quality = 3;
  const q = /(rested|quality)\D{0,6}([1-5])/.exec(t);
  if (q) quality = Number(q[2]);
  else if (has(t, ['great', 'very well', 'deep', 'rested'])) quality = 4;
  else if (has(t, ['bad', 'badly', 'terrible', 'awful', 'tired', 'insomnia'])) quality = 2;
  else assumed.push('how rested');

  let wakeUps: SleepData['wakeUps'] = '1-2';
  if (/(didn.?t wake|no wake|slept through|none)/.test(t)) wakeUps = 'none';
  else if (/(3|three|several|many)\s*(times|x)/.test(t) || /(kept waking|a lot)/.test(t)) wakeUps = '3+';
  else if (/(once|twice|1|2)\s*(times|x)?/.test(t) && /(woke|wake)/.test(t)) wakeUps = '1-2';
  else assumed.push('wake-ups');

  const understood = dur !== null || (bedM !== null && wakeM !== null) || times.length >= 2;
  return { draft: { bed: toHHMM(bed), wake: toHHMM(wake), quality, wakeUps }, understood, assumed: understood ? assumed : ['duration', ...assumed] };
}

function parseRadiation(raw: string, ctx: ParseContext): ParseResult<'radiation'> {
  const t = digits(norm(raw)).replace('µ', 'u');
  const m = /(\d+(?:[.,]\d+)?)\s*(usv|u\s*sv|micro\s*sieverts?|microsieverts?|msv|milli\s*sieverts?|millisieverts?)?/.exec(t);
  const value = m ? Number(m[1].replace(',', '.')) : null;
  const unitRaw = m?.[2] ?? '';
  const unit: RadiationData['unit'] = /^m(sv|ill|il)/.test(unitRaw) ? 'mSv' : 'uSv';
  const source: RadiationData['source'] = has(t, ['area', 'monitor', 'module']) ? 'area' : 'personal';
  const time = findTimes(t)[0];
  const assumed: string[] = [];
  if (value === null) assumed.push('dose');
  if (time === undefined) assumed.push('read time');
  return {
    draft: { value: value ?? ctx.lastDoseUsv ?? 40, unit, source, readAt: time !== undefined ? toHHMM(time) : ctx.now },
    understood: value !== null,
    assumed,
  };
}

function parseBody(raw: string, ctx: ParseContext): ParseResult<'body'> {
  const t = digits(norm(raw));
  const bp = /(\d{2,3})\s*(?:\/|over|x|by)\s*(\d{2,3})/.exec(t);
  const pulseM = /(pulse|heart rate|hr)\D{0,6}(\d{2,3})|(\d{2,3})\s*bpm/.exec(t);
  const [rs, rd] = (ctx.restingBp ?? '118/76').split('/').map(Number);
  const assumed: string[] = [];
  if (!bp) assumed.push('blood pressure');
  if (!pulseM) assumed.push('pulse');
  return {
    draft: {
      systolic: bp ? Number(bp[1]) : rs,
      diastolic: bp ? Number(bp[2]) : rd,
      pulse: pulseM ? Number(pulseM[2] ?? pulseM[3]) : ctx.restingHr ?? 66,
    },
    understood: !!bp,
    assumed,
  };
}

function parseMeal(raw: string, ctx: ParseContext): ParseResult<'meal'> {
  const t = digits(norm(raw));
  const spoken = spokenToDigits(raw.toLowerCase());
  const kcalM = /(\d{2,4})\s*(kcal|calories|cal)/.exec(t);
  const starM = /([1-5])\s*(stars?|\/\s*5)/.exec(t);
  let taste: number | null = starM ? Number(starM[1]) : null;
  if (taste === null) {
    if (has(t, ['delicious', 'amazing', 'great'])) taste = 5;
    else if (has(t, ['awful', 'disgusting', 'terrible'])) taste = 1;
    else if (has(t, ['bland', 'boring', 'same again', 'again'])) taste = 2;
    else if (has(t, ['good', 'tasty', 'nice'])) taste = 4;
    else if (has(t, ['ok', 'okay', 'fine', 'normal'])) taste = 3;
  }
  // Name: strip fillers and the rating/kcal parts.
  let name = spoken
    .replace(/\d{2,4}\s*(kcal|calories|cal)/gi, '')
    .replace(/[1-5]\s*(stars?|\/\s*5)/gi, '')
    .replace(/^(i\s+)?(had|ate|eat|i had|for (breakfast|lunch|dinner))\s*/i, '')
    .replace(/[,.;]?\s*(it was|was|tasted)\b.*$/i, '')
    .replace(/\s+and\s+/gi, ' + ')
    .trim()
    .replace(/[\s.,;!+]+$/, '');
  const picks = MEAL_PICKS.filter((p) => norm(raw).includes(norm(p.name)));
  if (!name && picks.length) name = picks.map((p) => p.name).join(' + ');
  name = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const kcal = kcalM ? Number(kcalM[1]) : picks.reduce((s, p) => s + p.kcal, 0) || 500;
  const time = findTimes(t)[0];
  const assumed: string[] = [];
  if (!kcalM) assumed.push('calories');
  if (taste === null) assumed.push('taste');
  return {
    draft: { name: name || 'Meal', kcal, taste: taste ?? 3, time: time !== undefined ? toHHMM(time) : ctx.now },
    understood: !!name,
    assumed: name ? assumed : ['what you ate', ...assumed],
  };
}

function parseExercise(raw: string): ParseResult<'exercise'> {
  const t = digits(norm(raw));
  const dur = findDurationMin(t);
  let equipment: ExerciseData['equipment'] | null = null;
  if (has(t, ['treadmill', 'run', 'ran', 'running', 'jog'])) equipment = 'treadmill';
  else if (has(t, ['bike', 'cycle', 'cycling', 'cycled'])) equipment = 'cycle';
  else if (has(t, ['ared', 'resistive', 'weights', 'squat', 'squats', 'lifting', 'strength'])) equipment = 'resistive_device';
  let effort: number | null = null;
  const e = /(effort|intensity)\D{0,6}([1-5])/.exec(t);
  if (e) effort = Number(e[2]);
  else if (has(t, ['very hard', 'max', 'maximum', 'brutal'])) effort = 5;
  else if (has(t, ['hard', 'tough', 'heavy'])) effort = 4;
  else if (has(t, ['moderate', 'medium', 'normal'])) effort = 3;
  else if (has(t, ['easy', 'light'])) effort = 2;
  const assumed: string[] = [];
  if (!equipment) assumed.push('equipment');
  if (effort === null) assumed.push('effort');
  return {
    draft: {
      modality: (equipment ?? 'resistive_device') === 'resistive_device' ? 'resistive' : 'aerobic',
      equipment: equipment ?? 'resistive_device',
      minutes: dur ?? 30,
      effort: effort ?? 3,
    },
    understood: dur !== null,
    assumed: dur === null ? ['duration', ...assumed] : assumed,
  };
}

/** Rule-based implementation of the parser interface. */
export const ruleParser: OrbiFillParser = {
  parse(category, text, ctx) {
    const t = norm(text);
    if (SKIP.some((w) => t === w || t.startsWith(w + ' '))) {
      return { ...(fallbackDraft(category, ctx) as ParseResult<typeof category>), skipped: true };
    }
    switch (category) {
      case 'mood':
        return parseMood(text) as ParseResult<typeof category>;
      case 'sleep':
        return parseSleep(text, ctx) as ParseResult<typeof category>;
      case 'radiation':
        return parseRadiation(text, ctx) as ParseResult<typeof category>;
      case 'body':
        return parseBody(text, ctx) as ParseResult<typeof category>;
      case 'meal':
        return parseMeal(text, ctx) as ParseResult<typeof category>;
      default:
        return parseExercise(text) as ParseResult<typeof category>;
    }
  },
};

function fallbackDraft(category: FillCategory, ctx: ParseContext): ParseResult<FillCategory> {
  return ruleParser.parse(category, '', ctx);
}

/** Total sleep minutes of a draft. */
export const draftSleepMinutes = (d: SleepDraft) => sleepMinutes(d.bed, d.wake) ?? 0;

/** The parser in use. Replace with an LLM-backed implementation later. */
export const orbiParser: OrbiFillParser = ruleParser;
