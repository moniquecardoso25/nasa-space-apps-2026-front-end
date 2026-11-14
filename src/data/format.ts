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

/** "08:30" → minutes after midnight (null when invalid). */
export function parseHHMM(s: string): number | null {
  const m = /^\s*(\d{1,2})[:h.]?(\d{2})\s*$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** ISO timestamp for a mission day at "HH:MM" (station time = UTC). */
export function isoAt(day: number, hhmmStr: string, dayOffset = 0): string {
  const d = dateOfDay(day + dayOffset);
  const min = parseHHMM(hhmmStr) ?? 0;
  d.setUTCHours(Math.floor(min / 60), min % 60, 0, 0);
  return d.toISOString();
}

/** Formats a time-of-day input while typing ("0830" → "08:30"). */
export function maskTime(t: string) {
  const digits = t.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

/** Minutes between bed and wake (crosses midnight when wake < bed). */
export function sleepMinutes(bed: string, wake: string) {
  const b = parseHHMM(bed);
  const w = parseHHMM(wake);
  if (b === null || w === null) return null;
  return w >= b ? w - b : 24 * 60 - b + w;
}
