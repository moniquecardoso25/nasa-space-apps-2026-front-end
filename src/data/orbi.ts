import { getAstronaut, getLatestLog, getMission, getTodayLogs, isLoggedToday } from './api';
import { exerciseMinutes } from './derived';
import { formatDuration } from './format';

export type OrbiAction = { label: string; href?: string; send?: string };
export type OrbiReply = { text: string; actions?: OrbiAction[] };

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

/**
 * Rule-based Orbi replies (no real AI yet). Reads the astronaut's data so the
 * answers feel grounded. Swap this function for an LLM call later.
 */
export function orbiReply(input: string): OrbiReply {
  const t = input.toLowerCase();
  const me = getAstronaut();
  const name = me.name.split(' ')[0];

  if (has(t, ['wind-down', 'wind down', 'winddown', 'dim the', 'plan'])) {
    return {
      text: 'Done. Wind-down at 21:00: cabin lights dim, screens off at 21:30, and I will check in with you before bed. Want me to tell the ground team?',
      actions: [{ label: 'Message ground team', href: '/messages' }],
    };
  }
  if (has(t, ['sleep', 'slept', 'tired', 'woke', 'insomnia', 'awake', 'nap'])) {
    const s = getLatestLog('sleep');
    const band = s?.data.band;
    return {
      text: s
        ? `Your wrist band shows ${formatDuration(s.data.durationMin)}${band && band.lightExposureLux < 100 ? ' and low light exposure in the evening' : ''}. With 16 sunrises a day, a fixed wind-down helps a lot.`
        : 'Let us log last night first so I can look at your band data.',
      actions: [
        { label: 'Make a wind-down plan', send: 'Make a wind-down plan' },
        { label: isLoggedToday('sleep') ? 'Open sleep' : 'Log sleep', href: isLoggedToday('sleep') ? '/logs/sleep' : '/logs/sleep/add' },
      ],
    };
  }
  if (has(t, ['stress', 'anxious', 'anxiety', 'overwhelm', 'overload', 'panic', 'nervous'])) {
    return {
      text: 'That sounds heavy. Try this with me: breathe in for 4, hold for 4, out for 6. Three rounds. Then tell me what is weighing most right now.',
      actions: [{ label: 'Log mood', href: '/logs/mood/add' }],
    };
  }
  if (has(t, ['home', 'family', 'lonely', 'miss ', 'kids', 'partner'])) {
    return {
      text: `Missing home is part of long missions, ${name}. A family call slot is on Thursday at 18:00. Want to ask the ground team for an extra one?`,
      actions: [{ label: 'Message ground team', href: '/messages' }],
    };
  }
  if (has(t, ['pain', 'hurt', 'injur', 'bruise', 'cut', 'sprain', 'strain'])) {
    return {
      text: 'Let us report it so the medical team can follow it. If the pain is severe, it goes to the ground team right away.',
      actions: [{ label: 'Report injury', href: '/logs/body/injury' }],
    };
  }
  if (has(t, ['food', 'meal', 'eat', 'taste', 'menu', 'hungry', 'lunch', 'dinner'])) {
    const meals = getTodayLogs('meal');
    const kcal = meals.reduce((s, m) => s + m.data.kcal, 0);
    return {
      text: `You logged ${meals.length} meal${meals.length === 1 ? '' : 's'} today (${kcal} of ${getMission().goals.kcalPerDay} kcal). Rotating flavors helps with menu fatigue.`,
      actions: [{ label: 'Log a meal', href: '/logs/meals/add' }],
    };
  }
  if (has(t, ['exercise', 'workout', 'treadmill', 'gym', 'run', 'train'])) {
    const min = exerciseMinutes();
    const goal = getMission().goals.exerciseMinPerDay;
    return {
      text: min >= goal ? `${min} minutes today, goal reached. Nice work protecting bone and muscle.` : `${min} of ${goal} minutes today. A ${goal - min}-minute session keeps bone loss in check.`,
      actions: [{ label: 'Log a session', href: '/logs/exercise/add' }],
    };
  }
  if (has(t, ['good', 'great', 'happy', 'fine', 'productive', 'well'])) {
    return { text: `Love to hear it, ${name}. What made today good?`, actions: isLoggedToday('mood') ? [] : [{ label: 'Log mood', href: '/logs/mood/add' }] };
  }
  return {
    text: 'Thanks for telling me. I am here whenever you want to talk it through.',
    actions: isLoggedToday('mood') ? [{ label: 'Message ground team', href: '/messages' }] : [{ label: 'Log mood', href: '/logs/mood/add' }],
  };
}

/** Short journal summary of what the astronaut wrote. */
export function journalSummary(text: string) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 90 ? clean.slice(0, 87) + '…' : clean;
}
