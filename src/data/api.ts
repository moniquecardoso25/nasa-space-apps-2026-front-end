import { getDb, setDb } from './store';
import type {
  AiMessage,
  Areas,
  Astronaut,
  CalendarEvent,
  ChatMode,
  DailySummary,
  Db,
  GroundMessage,
  JournalEntry,
  Log,
  LogDataMap,
  LogOf,
  LogType,
  ShopCategory,
  ShopItem,
} from './types';

export const COINS_PER_LOG = 10;
export const DAILY_CHECKIN_COINS = 50;

/** The 7 log types counted in the daily ring (injury is not counted). */
export const COUNTED_TYPES: LogType[] = ['mood', 'sleep', 'radiation', 'meal', 'exercise', 'measurement', 'meditation'];
export const LOGS_TOTAL = COUNTED_TYPES.length;

// ---------------------------------------------------------------- mission / time

export const getMission = () => getDb().mission;
export const getToday = () => getDb().mission.today;
export const getCurrentAstronautId = () => getDb().currentAstronautId;

/** Calendar date (UTC midnight) of a mission day. Day 1 = mission.startDate. */
export function dateOfDay(day: number): Date {
  const d = new Date(getMission().startDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + day - 1);
  return d;
}

export function dayOfDate(iso: string): number {
  const start = new Date(getMission().startDate + 'T00:00:00Z').getTime();
  const t = new Date(iso.slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((t - start) / 86400000) + 1;
}

/**
 * Station clock. Station time = UTC (like the ISS). The date is always
 * mission.today; the time of day follows the real clock.
 */
export function getNow(): Date {
  const real = new Date();
  const d = dateOfDay(getToday());
  d.setUTCHours(real.getUTCHours(), real.getUTCMinutes(), real.getUTCSeconds(), 0);
  return d;
}

// ---------------------------------------------------------------- astronauts

export const getAstronauts = () => getDb().astronauts;

export function getAstronaut(id: string = getCurrentAstronautId()): Astronaut {
  const a = getDb().astronauts.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown astronaut ${id}`);
  return a;
}

export function findAstronautByCrewId(crewId: string): Astronaut | undefined {
  const id = crewId.trim().toUpperCase();
  return getDb().astronauts.find((a) => a.crewId.toUpperCase() === id);
}

/** Mock login: any 4-digit PIN works for a known Crew ID. */
export function signIn(crewId: string, pin: string): Astronaut | null {
  const a = findAstronautByCrewId(crewId);
  if (!a || !/^\d{4}$/.test(pin)) return null;
  setDb((db) => ({ ...db, currentAstronautId: a.id }));
  return a;
}

function updateAstronaut(id: string, fn: (a: Astronaut) => Astronaut) {
  setDb((db) => ({ ...db, astronauts: db.astronauts.map((a) => (a.id === id ? fn(a) : a)) }));
}

export function completeOnboarding(avatarName: string) {
  updateAstronaut(getCurrentAstronautId(), (a) => ({
    ...a,
    onboardingDone: true,
    avatar: { ...a.avatar, name: avatarName.trim() || 'Bolt' },
  }));
}

export function firstName(a: Astronaut = getAstronaut()) {
  return a.name.split(' ')[0];
}

// ---------------------------------------------------------------- logs

export interface LogFilter {
  astronautId?: string;
  type?: LogType | LogType[];
  missionDay?: number;
  fromDay?: number;
  toDay?: number;
}

/** Logs sorted by timestamp ascending. Defaults to the current astronaut. */
export function getLogs<T extends LogType>(filter: LogFilter & { type: T }): LogOf<T>[];
export function getLogs(filter?: LogFilter): Log[];
export function getLogs(filter: LogFilter = {}): Log[] {
  const me = filter.astronautId ?? getCurrentAstronautId();
  const types = filter.type ? (Array.isArray(filter.type) ? filter.type : [filter.type]) : null;
  return getDb()
    .logs.filter(
      (l) =>
        l.astronautId === me &&
        (!types || types.includes(l.type)) &&
        (filter.missionDay === undefined || l.missionDay === filter.missionDay) &&
        (filter.fromDay === undefined || l.missionDay >= filter.fromDay) &&
        (filter.toDay === undefined || l.missionDay <= filter.toDay),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getLatestLog<T extends LogType>(type: T, astronautId?: string): LogOf<T> | undefined {
  const logs = getLogs({ type, astronautId });
  return logs[logs.length - 1];
}

export function getTodayLogs<T extends LogType>(type: T, astronautId?: string): LogOf<T>[] {
  return getLogs({ type, astronautId, missionDay: getToday() });
}

export function isLoggedToday(type: LogType, astronautId?: string) {
  return getTodayLogs(type, astronautId).length > 0;
}

function nextLogId(db: Db) {
  const max = db.logs.reduce((m, l) => Math.max(m, Number(l.id.replace(/\D/g, '')) || 0), 0);
  return `log-${String(max + 1).padStart(4, '0')}`;
}

export interface AddLogOptions {
  note?: string | null;
  environmentId?: string | null;
  timestamp?: string;
}

/** Saves a new log for the current astronaut and gives +10 coins. */
export function addLog<T extends LogType>(type: T, data: LogDataMap[T], opts: AddLogOptions = {}): LogOf<T> {
  const me = getCurrentAstronautId();
  let created!: LogOf<T>;
  setDb((db) => {
    created = {
      id: nextLogId(db),
      astronautId: me,
      type,
      timestamp: opts.timestamp ?? getNow().toISOString(),
      missionDay: db.mission.today,
      environmentId: opts.environmentId ?? null,
      note: opts.note ?? null,
      coinsEarned: COINS_PER_LOG,
      data,
    } as LogOf<T>;
    return {
      ...db,
      logs: [...db.logs, created as Log],
      astronauts: db.astronauts.map((a) =>
        a.id === me ? { ...a, avatar: { ...a.avatar, coins: a.avatar.coins + COINS_PER_LOG } } : a,
      ),
    };
  });
  lastSaved = { type, at: Date.now() };
  return created;
}

/** Edits an existing log (no extra coins). */
export function updateLog<T extends LogType>(id: string, data: LogDataMap[T], opts: AddLogOptions = {}) {
  setDb((db) => ({
    ...db,
    logs: db.logs.map((l) =>
      l.id === id ? ({ ...l, data, note: opts.note !== undefined ? opts.note : l.note } as Log) : l,
    ),
  }));
  lastSaved = { type: getDb().logs.find((l) => l.id === id)?.type ?? 'mood', at: Date.now() };
}

/** Saves today's log of a once-a-day type: updates if it exists, otherwise adds (+10). */
export function saveDailyLog<T extends LogType>(type: T, data: LogDataMap[T], opts: AddLogOptions = {}) {
  const existing = getTodayLogs(type)[0];
  if (existing) {
    updateLog<T>(existing.id, data, opts);
    return { log: existing, coins: 0 };
  }
  return { log: addLog(type, data, opts), coins: COINS_PER_LOG };
}

let lastSaved: { type: LogType; at: number } | null = null;
/** Last log saved in this session (drives the avatar "celebrate" animation). */
export const getLastSaved = () => lastSaved;

// ---------------------------------------------------------------- daily summaries

const EMPTY_AREAS: Areas = { head: 'ok', torso: 'ok', armL: 'ok', armR: 'ok', legL: 'ok', legR: 'ok' };

/**
 * Daily summary. The mock file is the base (score, areas); logsDone is always
 * recomputed from logs so new logs show up immediately. Each new log after the
 * stored snapshot adds +2 to the score (cap 100).
 */
export function getDailySummary(day: number = getToday(), astronautId: string = getCurrentAstronautId()): DailySummary {
  const stored = getDb().daily_summaries.find((d) => d.astronautId === astronautId && d.missionDay === day);
  const dayLogs = getLogs({ astronautId, missionDay: day });
  const logsDone = COUNTED_TYPES.filter((t) => dayLogs.some((l) => l.type === t));
  const storedCount = stored?.logsDoneCount ?? 0;
  const baseScore = stored?.overallScore ?? 60;
  const overallScore = Math.min(100, baseScore + Math.max(0, logsDone.length - storedCount) * 2);
  return {
    astronautId,
    missionDay: day,
    logsDone,
    logsDoneCount: logsDone.length,
    logsTotal: LOGS_TOTAL,
    overallScore,
    areas: { ...(stored?.areas ?? EMPTY_AREAS) },
  };
}

export function getDailySummaries(fromDay: number, toDay: number = getToday(), astronautId?: string) {
  const out: DailySummary[] = [];
  for (let d = Math.max(1, fromDay); d <= toDay; d++) out.push(getDailySummary(d, astronautId));
  return out;
}

export type OverallLabel = 'Stable' | 'Attention' | 'Alert';
export function overallLabel(score: number): OverallLabel {
  if (score >= 70) return 'Stable';
  if (score >= 50) return 'Attention';
  return 'Alert';
}

/** Consecutive days (ending today or yesterday) with at least one counted log. */
export function getStreak(astronautId?: string) {
  let streak = 0;
  for (let d = getToday(); d >= 1; d--) {
    const done = getDailySummary(d, astronautId).logsDoneCount > 0;
    if (!done) break;
    streak++;
  }
  return streak;
}

// ---------------------------------------------------------------- Orbi / journal / alerts

export function getAiMessages(astronautId: string = getCurrentAstronautId()): AiMessage[] {
  return getDb().ai_chat.messages.filter((m) => m.astronautId === astronautId);
}

/**
 * Adds a chat message. Private mode never touches the database: the caller
 * keeps those messages in component state only.
 */
export function addAiMessage(text: string, author: AiMessage['author'], mode: ChatMode): AiMessage {
  const msg: AiMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    astronautId: getCurrentAstronautId(),
    author,
    text,
    timestamp: getNow().toISOString(),
    mode,
  };
  if (mode === 'private') return msg;
  setDb((db) => ({ ...db, ai_chat: { ...db.ai_chat, messages: [...db.ai_chat.messages, msg] } }));
  return msg;
}

export function getJournal(astronautId: string = getCurrentAstronautId()): JournalEntry[] {
  return getDb()
    .ai_chat.journal.filter((j) => j.astronautId === astronautId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function addJournalEntry(summary: string, sourceMessageIds: string[], moodLevel?: number) {
  const entry: JournalEntry = {
    id: `jr-${Date.now().toString(36)}`,
    astronautId: getCurrentAstronautId(),
    timestamp: getNow().toISOString(),
    summary,
    moodLevel,
    sourceMessageIds,
  };
  setDb((db) => ({ ...db, ai_chat: { ...db.ai_chat, journal: [...db.ai_chat.journal, entry] } }));
  return entry;
}

export function getAlerts(astronautId: string = getCurrentAstronautId()) {
  return getDb()
    .ai_chat.alerts.filter((a) => a.astronautId === astronautId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ---------------------------------------------------------------- ground messages

export function getGroundMessages(astronautId: string = getCurrentAstronautId()): GroundMessage[] {
  return getDb()
    .ground_messages.filter((m) => m.astronautId === astronautId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** ETA = sentAt + mission.commDelaySec (always computed, never trusted from storage). */
export function etaOf(m: Pick<GroundMessage, 'sentAt'>): Date {
  return new Date(new Date(m.sentAt).getTime() + getMission().commDelaySec * 1000);
}

export function sendGroundMessage(text: string, urgent = false, attachments: string[] = []): GroundMessage {
  const sentAt = getNow();
  const msg: GroundMessage = {
    id: `gm-${Date.now().toString(36)}`,
    astronautId: getCurrentAstronautId(),
    from: 'astronaut',
    text,
    urgent,
    sentAt: sentAt.toISOString(),
    estimatedArrivalAt: etaOf({ sentAt: sentAt.toISOString() }).toISOString(),
    status: 'in_transit',
    attachments,
  };
  setDb((db) => ({ ...db, ground_messages: [...db.ground_messages, msg] }));
  return msg;
}

// ---------------------------------------------------------------- shop / avatar

export function getShop(category?: ShopCategory): ShopItem[] {
  return getDb().shop.filter((s) => !category || s.category === category);
}

export function getShopItem(id: string | null | undefined) {
  return id ? getDb().shop.find((s) => s.id === id) : undefined;
}

export type BuyResult = 'ok' | 'owned' | 'no_coins';
export function buyItem(id: string): BuyResult {
  const me = getAstronaut();
  const item = getShopItem(id);
  if (!item) throw new Error(`Unknown item ${id}`);
  if (me.avatar.owned.includes(id)) return 'owned';
  if (me.avatar.coins < item.price) return 'no_coins';
  updateAstronaut(me.id, (a) => ({
    ...a,
    avatar: { ...a.avatar, coins: a.avatar.coins - item.price, owned: [...a.avatar.owned, id] },
  }));
  return 'ok';
}

/** Equips an owned item (pets can be toggled off). */
export function equipItem(id: string) {
  const item = getShopItem(id);
  if (!item) return;
  updateAstronaut(getCurrentAstronautId(), (a) => {
    const eq = { ...a.avatar.equipped, room: { ...a.avatar.equipped.room } };
    if (item.category === 'helmet') eq.helmet = id;
    else if (item.category === 'suit') eq.suit = id;
    else if (item.category === 'pet') eq.pet = eq.pet === id ? null : id;
    else eq.room[item.category] = id;
    return { ...a, avatar: { ...a.avatar, equipped: eq } };
  });
}

export function isOwned(id: string) {
  const item = getShopItem(id);
  return !!item && (item.price === 0 || getAstronaut().avatar.owned.includes(id));
}

export function isEquipped(id: string) {
  const eq = getAstronaut().avatar.equipped;
  return eq.helmet === id || eq.suit === id || eq.pet === id || Object.values(eq.room).includes(id);
}

// ---------------------------------------------------------------- leaderboard / calendar

export type LeaderboardMode = 'logs' | 'coins';
export function getLeaderboard(mode: LeaderboardMode) {
  const db = getDb();
  return db.astronauts
    .map((a) => ({
      astronaut: a,
      logs: db.logs.filter((l) => l.astronautId === a.id).length,
      coins: a.avatar.coins,
    }))
    .sort((x, y) => (mode === 'logs' ? y.logs - x.logs : y.coins - x.coins))
    .map((row, i) => ({ ...row, rank: i + 1, value: mode === 'logs' ? row.logs : row.coins }));
}

export function getCalendar(astronautId: string = getCurrentAstronautId()): CalendarEvent[] {
  return getDb()
    .calendar.filter((c) => c.astronautId === astronautId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const getEnvironmentReadings = () => getDb().environment_readings;
