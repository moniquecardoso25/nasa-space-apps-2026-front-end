import { dateOfDay, getToday } from './api';
import type { MoodLabel } from './types';

export const formatCoins = (n: number) => n.toLocaleString('en-US');

/** 318 → "5h 18m" */
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}

/** ISO → "08:30" in station time (UTC). */
export function hhmm(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayOfDay = (day: number) => WD[dateOfDay(day).getUTCDay()];
export const monthName = (m: number) => MONTHS[m];

/** "Today · Day 12", "Yesterday · Day 11", "Day 10" */
export function relativeDay(day: number) {
  const today = getToday();
  if (day === today) return `Today · Day ${day}`;
  if (day === today - 1) return `Yesterday · Day ${day}`;
  return `Day ${day}`;
}

export const MOOD_LABELS: Record<number, MoodLabel> = { 5: 'great', 4: 'good', 3: 'okay', 2: 'tired', 1: 'stressed' };
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
