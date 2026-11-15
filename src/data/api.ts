import { API_URL, ApiError, USE_MOCK_DATA, getSessionVersion, newRequestId, request, setSession, type LoginResponse } from './http';
import { decodeLog, mutate, refreshData } from './remote';
import { session } from './session';
import { getDb, setDb } from './store';
import type {
  AiMessage,
  Areas,
  BodyArea,
  InjuryData,
  Astronaut,
  CalendarEvent,
  ChatMode,
  DailySummary,
  Db,
  GroundMessage,
  JournalEntry,
  Level,
  Log,
  LogDataMap,
  LogOf,
  LogType,
  ShopCategory,
  ShopItem,
} from './types';

export const COINS_PER_LOG = 10;
export const DAILY_CHECKIN_COINS = 50;

/**
 * The 6 log types counted in the daily ring and "N of 6 logs done" — the ones in
 * the Home log menu. Not counted: injury, and meditation (Relax is "coming soon").
 */
export const COUNTED_TYPES: LogType[] = ['mood', 'sleep', 'radiation', 'meal', 'exercise', 'measurement'];
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

/** Authenticate with the same username/password contract as the backend. */
export async function signIn(username: string, password: string): Promise<Astronaut | null> {
  if (USE_MOCK_DATA) {
    const a = findAstronautByCrewId(username);
    if (!a || !/^\d{4}$/.test(password)) return null;
    setDb((db) => ({ ...db, currentAstronautId: a.id }));
    return a;
  }
  setSession(null);
  const result = await request<LoginResponse>('/auth/login', {
    method: 'POST', body: JSON.stringify({ username: username.trim(), password }),
  }, false);
  const role = result.user?.role ?? result.role;
  if (role !== 'astronaut' && role !== 'ground') throw new Error('This account cannot access CosmoMedic.');
  setSession(result);
  try {
    await refreshData();
    session.orbiFill = null;
    lastSaved = null;
    return role === 'ground' ? null : getAstronaut();
  } catch (error) { setSession(null); throw error; }
}

function updateAstronaut(id: string, fn: (a: Astronaut) => Astronaut) {
  setDb((db) => ({ ...db, astronauts: db.astronauts.map((a) => (a.id === id ? fn(a) : a)) }));
}

export async function completeOnboarding(avatarName: string) {
  if (!USE_MOCK_DATA) {
    await mutate('/app/me/onboarding', { avatarName: avatarName.trim() || 'Bolt', dailyReminders: session.reminders });
    return;
  }
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

interface LogSaved<T extends LogType> {
  log: LogOf<T>;
  coins: number;
  coinsEarned: number;
  bonus?: { coins?: number } | null;
}
const pendingLogs = new Map<string, { key: string; body: unknown }>();

/** Saves a new log for the current astronaut and gives +10 coins. */
export async function addLog<T extends LogType>(type: T, data: LogDataMap[T], opts: AddLogOptions = {}): Promise<LogOf<T>> {
  if (!USE_MOCK_DATA) {
    const signature = JSON.stringify([getSessionVersion(), type, data, opts]);
    let pending = pendingLogs.get(signature);
    if (!pending) {
      pending = { key: newRequestId(), body: { type, data: await uploadLogMedia(type, data), ...opts, timestamp: opts.timestamp ?? getNow().toISOString() } };
      pendingLogs.set(signature, pending);
    }
    let result: LogSaved<T>;
    try { result = await mutate<LogSaved<T>>('/app/me/logs', pending.body, 'POST', pending.key); }
    catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) pendingLogs.delete(signature);
      throw error;
    }
    pendingLogs.delete(signature);
    const log = decodeLog(result.log as Log) as LogOf<T>;
    lastSaved = { type, at: Date.now(), coins: result.coinsEarned + (result.bonus?.coins ?? 0) };
    setDb((db) => ({ ...db, logs: [...db.logs.filter((l) => l.id !== log.id), log as Log], astronauts: db.astronauts.map((a) => a.id === log.astronautId ? { ...a, avatar: { ...a.avatar, coins: result.coins } } : a) }));
    return log;
  }
  const me = getCurrentAstronautId();
  let created!: LogOf<T>;
  lastSaved = { type, at: Date.now(), coins: COINS_PER_LOG };
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
  return created;
}

/** Edits an existing log (no extra coins). */
export async function updateLog<T extends LogType>(id: string, data: LogDataMap[T], opts: AddLogOptions = {}) {
  if (!USE_MOCK_DATA) {
    const old = getDb().logs.find((l) => l.id === id);
    if (!old) throw new Error('Log not found. Refresh and try again.');
    const result = await mutate<LogSaved<T>>(`/app/me/logs/${encodeURIComponent(id)}`, { type: old.type, data: await uploadLogMedia(old.type, data), note: old.note, environmentId: old.environmentId, timestamp: old.timestamp, ...opts }, 'PUT');
    const log = result.log;
    lastSaved = { type: old.type, at: Date.now(), coins: 0 };
    setDb((db) => ({ ...db, logs: db.logs.map((l) => l.id === id ? decodeLog(log as Log) : l) }));
    return;
  }
  lastSaved = { type: getDb().logs.find((l) => l.id === id)?.type ?? 'mood', at: Date.now(), coins: 0 };
  setDb((db) => ({
    ...db,
    logs: db.logs.map((l) =>
      l.id === id ? ({ ...l, data, note: opts.note !== undefined ? opts.note : l.note } as Log) : l,
    ),
  }));
}

/**
 * Saves today's log of a once-a-day type: updates if it exists, otherwise adds (+10).
 * A new mood check-in that completes a 7-day streak also gives the +50 check-in bonus.
 */
export async function saveDailyLog<T extends LogType>(type: T, data: LogDataMap[T], opts: AddLogOptions = {}) {
  const existing = getTodayLogs(type)[0];
  if (existing) {
    await updateLog<T>(existing.id, data, opts);
    return { log: existing, coins: 0 };
  }
  const log = await addLog(type, data, opts);
  let coins = USE_MOCK_DATA ? log.coinsEarned : lastSaved?.coins ?? log.coinsEarned;
  if (USE_MOCK_DATA && type === 'mood' && getCheckinStreak() % 7 === 0) {
    coins += DAILY_CHECKIN_COINS;
    lastSaved = { type, at: Date.now(), coins };
    addCoins(DAILY_CHECKIN_COINS);
  }
  return { log, coins };
}

export function addCoins(amount: number, astronautId: string = getCurrentAstronautId()) {
  updateAstronaut(astronautId, (a) => ({ ...a, avatar: { ...a.avatar, coins: a.avatar.coins + amount } }));
}

/**
 * Daily check-in = mood log. Streak = consecutive days with a check-in, ending
 * today (or yesterday when today's check-in is still open).
 */
export function getCheckinStreak(astronautId?: string) {
  const days = new Set(getLogs({ type: 'mood', astronautId }).map((l) => l.missionDay));
  let d = getToday();
  if (!days.has(d)) d--;
  let streak = 0;
  while (d >= 1 && days.has(d)) {
    streak++;
    d--;
  }
  return streak;
}

let lastSaved: { type: LogType; at: number; coins: number } | null = null;
/** Last log saved in this session (drives the "Saved +10" banner and Bolt's celebrate animation). */
export const getLastSaved = () => lastSaved;

// ---------------------------------------------------------------- daily summaries

const EMPTY_AREAS: Areas = { head: 'ok', torso: 'ok', armL: 'ok', armR: 'ok', legL: 'ok', legR: 'ok' };

/**
 * Hologram areas hit by an injury. head/neck → head, back → torso,
 * arm/hand → armL/armR, leg/knee/foot → legL/legR (side; "center" marks both).
 */
export function injuryAreas(d: Pick<InjuryData, 'bodyPart' | 'side'>): BodyArea[] {
  const both = (l: BodyArea, r: BodyArea): BodyArea[] => (d.side === 'left' ? [l] : d.side === 'right' ? [r] : [l, r]);
  switch (d.bodyPart) {
    case 'head':
    case 'neck':
      return ['head'];
    case 'back':
      return ['torso'];
    case 'arm':
    case 'hand':
      return both('armL', 'armR');
    default:
      return both('legL', 'legR');
  }
}

/** Injuries reported up to a day that are still active or healing. */
export function getOpenInjuries(day: number = getToday(), astronautId?: string) {
  return getLogs({ type: 'injury', astronautId, toDay: day }).filter((l) => l.data.status !== 'resolved');
}

/**
 * Daily summary. The mock file is the base (score, areas); logsDone is always
 * recomputed from logs so new logs show up immediately. Each new log after the
 * stored snapshot adds +2 to the score (cap 100).
 */
export function getDailySummary(day: number = getToday(), astronautId: string = getCurrentAstronautId()): DailySummary {
  const stored = getDb().daily_summaries.find((d) => d.astronautId === astronautId && d.missionDay === day);
  const dayLogs = getLogs({ astronautId, missionDay: day });
  const logsDone = COUNTED_TYPES.filter((t) => dayLogs.some((l) => l.type === t));
  // compare with the stored snapshot using the same counted types
  const storedCount = stored?.logsDone ? stored.logsDone.filter((t) => COUNTED_TYPES.includes(t as LogType)).length : (stored?.logsDoneCount ?? 0);
  const baseScore = stored?.overallScore ?? 60;
  const overallScore = Math.min(100, baseScore + Math.max(0, logsDone.length - storedCount) * 2);
  return {
    astronautId,
    missionDay: day,
    logsDone,
    logsDoneCount: logsDone.length,
    logsTotal: LOGS_TOTAL,
    overallScore,
    areas: withInjuries({ ...(stored?.areas ?? EMPTY_AREAS) }, day, astronautId),
  };
}

/** Active/healing injuries paint their area as `alert` (holoAlert). */
function withInjuries(areas: Areas, day: number, astronautId: string): Areas {
  for (const inj of getOpenInjuries(day, astronautId)) for (const a of injuryAreas(inj.data)) areas[a] = 'alert';
  return areas;
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

/**
 * What the crew sees instead of a numeric overall score: a status tag only.
 * The score stays internal (it only decides the tag).
 */
export function healthTag(score: number): { level: Level; label: string } {
  const l = overallLabel(score);
  return l === 'Stable' ? { level: 'ok', label: 'Doing well' } : l === 'Attention' ? { level: 'warn', label: 'Attention' } : { level: 'alert', label: 'Alert' };
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

export async function sendGroundMessage(text: string, urgent = false, attachments: string[] = []): Promise<GroundMessage> {
  if (!USE_MOCK_DATA) {
    const msg = await mutate<GroundMessage>('/app/me/ground-messages', { text, urgent, attachments }, 'POST', newRequestId());
    setDb((db) => ({ ...db, ground_messages: [...db.ground_messages.filter((m) => m.id !== msg.id), msg] }));
    return msg;
  }
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
export async function buyItem(id: string): Promise<BuyResult> {
  const me = getAstronaut();
  const item = getShopItem(id);
  if (!item) throw new Error(`Unknown item ${id}`);
  if (me.avatar.owned.includes(id)) return 'owned';
  if (me.avatar.coins < item.price) return 'no_coins';
  if (!USE_MOCK_DATA) { await mutate('/app/me/avatar/purchase', { itemId: id }); return 'ok'; }
  updateAstronaut(me.id, (a) => ({
    ...a,
    avatar: { ...a.avatar, coins: a.avatar.coins - item.price, owned: [...a.avatar.owned, id] },
  }));
  return 'ok';
}

/** Equips an owned item (pets can be toggled off). */
export async function equipItem(id: string) {
  const item = getShopItem(id);
  if (!item) return;
  if (!USE_MOCK_DATA) {
    await mutate('/app/me/avatar/equip', { itemId: item.category === 'pet' && isEquipped(id) ? null : id, category: item.category });
    return;
  }
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
  if (!USE_MOCK_DATA) return db.leaderboards?.[mode] ?? [];
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


/** Persist device settings through the same API boundary as screens. */
export async function pairDevice(device: 'bpCuff' | 'wristBandPaired') {
  if (!USE_MOCK_DATA) await mutate('/app/me/devices', { [device]: true }, 'PATCH');
}

/** Chat response contract is validated because the OpenAPI response is untyped. */
export async function chatWithOrbi(text: string, mode: ChatMode): Promise<{ message: AiMessage; reply: AiMessage }> {
  type ChatResult = { message: AiMessage; reply: AiMessage };
  const body = { text, mode };
  const result = mode === 'private'
    ? await request<ChatResult>('/app/me/orbi/chat', { method: 'POST', body: JSON.stringify(body) })
    : await mutate<ChatResult>('/app/me/orbi/chat', body);
  if (!result?.message?.id || !result?.reply?.text) throw new Error('Orbi returned an invalid response.');
  if (mode === 'journal') {
    setDb((db) => {
      const ids = new Set([result.message.id, result.reply.id]);
      return { ...db, ai_chat: { ...db.ai_chat, messages: [...db.ai_chat.messages.filter((m) => !ids.has(m.id)), result.message, result.reply] } };
    });
  }
  return result;
}

async function uploadLogMedia<T extends LogType>(type: LogType, data: LogDataMap[T]): Promise<unknown> {
  if (type !== 'mood') return data;
  const mood = data as LogDataMap['mood'];
  if (!mood.voiceNote) return data;
  const { uri, ...note } = mood.voiceNote;
  if (/^https?:/.test(uri)) return { ...mood, voiceNote: { ...note, url: uri } };
  const form = new FormData();
  if (/^blob:|^data:/.test(uri)) {
    const blob = await fetch(uri).then((response) => response.blob());
    form.append('file', blob, blob.type.includes('mp4') ? 'voice.m4a' : 'voice.webm');
  } else {
    // React Native's FormData accepts a local file descriptor.
    form.append('file', { uri, name: 'voice.m4a', type: 'audio/mp4' } as unknown as Blob);
  }
  const uploaded = await request<{ url: string }>('/app/me/uploads', { method: 'POST', body: form });
  const url = new URL(uploaded.url, API_URL.replace(/\/api\/v1$/, '') + '/').toString();
  return { ...mood, voiceNote: { ...note, url } };
}

export { getSessionRole, logout, subscribeSession, USE_MOCK_DATA } from './http';
export { getRefreshWarning, refreshData } from './remote';
