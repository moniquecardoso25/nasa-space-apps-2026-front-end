import { getDb, setDb } from './store';
import { backendLogin, backendRequest, clearBackendSession, hasBackendSession } from './backend';
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

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function list(value: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const body = record(value);
  for (const key of keys) if (Array.isArray(body[key])) return body[key] as unknown[];
  return [];
}

function levelFromBackend(value: unknown): Level {
  if (value === 'ok' || value === 'normal' || value === 'stable') return 'ok';
  if (value === 'alert' || value === 'out_of_range' || value === 'invalid' || value === 'high') return 'alert';
  if (value === 'warn' || value === 'watch' || value === 'no_data' || value === 'no_reference' || value === 'attention') return 'warn';
  return 'ok';
}

function optionalRequest<T>(path: string): Promise<T | null> {
  return backendRequest<T>(path).catch(() => null);
}

function blankAstronaut(id: string, name: string, crewId: string): Astronaut {
  return {
    id,
    name,
    crewId,
    role: 'astronaut',
    profile: { age: 0, heightCm: 0, weightKg: 0, foodPreferences: [] },
    baseline: {
      boneDensity: 0,
      muscleMassKg: 0,
      strengthScore: 0,
      aerobicScore: 0,
      bodyFatPct: 0,
      restingHr: 0,
      restingBp: '—',
      usualSleepH: 0,
      usualBedtime: '—',
    },
    devices: { wristBand: { model: 'ARCHeR', paired: false }, dosimeterBadgeId: '', bpCuff: false },
    avatar: {
      name: 'Bolt',
      level: 1,
      coins: 0,
      owned: [],
      equipped: { helmet: '', suit: '', pet: null, room: { window: '', wall: '', floor: '' } },
      state: 'idle',
    },
    onboardingDone: false,
  };
}

function astronautFromBackend(response: unknown, id: string, crewId: string, displayName: string): Astronaut {
  const root = record(response);
  const raw = { ...root, ...record(root.astronaut ?? root.crewMember) };
  const defaults = blankAstronaut(
    id,
    String(raw.name ?? raw.displayName ?? displayName),
    String(raw.crewId ?? raw.username ?? crewId),
  );
  const profile = record(raw.profile);
  const baseline = record(raw.baseline ?? raw.preflightBaseline);
  const rawDevices = record(raw.devices);
  const band = record(rawDevices.wristBand ?? rawDevices.wristband);
  const rawAvatar = record(raw.avatar);
  const equipped = record(rawAvatar.equipped);
  const room = record(equipped.room);

  return {
    ...defaults,
    ...raw,
    id,
    name: defaults.name,
    crewId: defaults.crewId,
    role: 'astronaut',
    profile: { ...defaults.profile, ...profile } as Astronaut['profile'],
    baseline: { ...defaults.baseline, ...baseline } as Astronaut['baseline'],
    devices: {
      ...defaults.devices,
      ...rawDevices,
      wristBand: { ...defaults.devices.wristBand, ...band, paired: Boolean(band.paired ?? rawDevices.wristBandPaired) },
      bpCuff: Boolean(rawDevices.bpCuff),
    } as Astronaut['devices'],
    avatar: {
      ...defaults.avatar,
      ...rawAvatar,
      equipped: {
        ...defaults.avatar.equipped,
        ...equipped,
        room: { ...defaults.avatar.equipped.room, ...room },
      },
    } as Astronaut['avatar'],
    onboardingDone: Boolean(raw.onboardingDone ?? raw.onboarded ?? false),
  };
}

function missionFromBackend(response: unknown, today: number): Db['mission'] {
  const root = record(response);
  const remote = record(root.mission ?? response);
  const seed = getDb().mission;
  const firstDay = Number(remote.firstDay ?? 1);
  const lastDay = Number(remote.lastDay ?? remote.lengthDays ?? seed.lengthDays);
  const lengthDays = Number(remote.lengthDays ?? (firstDay <= 0 ? lastDay : lastDay - firstDay + 1));
  const goals = record(remote.goals);
  const environments = list(remote.environments ?? remote.modules, 'items', 'environments', 'modules');
  return {
    ...seed,
    id: String(remote.id ?? seed.id),
    name: String(remote.name ?? seed.name),
    startDate: String(remote.launchDate ?? remote.startDate ?? seed.startDate).slice(0, 10),
    lengthDays: Math.max(1, lengthDays),
    today: Number(remote.today ?? remote.missionDay ?? root.missionDay ?? today),
    commDelaySec: Number(remote.commDelaySec ?? seed.commDelaySec),
    goals: { ...seed.goals, ...goals } as Db['mission']['goals'],
    environments: environments.length ? (environments as Db['mission']['environments']) : seed.environments,
  };
}

function syncInBackground(task: Promise<unknown>) {
  void task.catch(() => {
    console.warn('[Crew Health API] A background update could not be synchronized.');
  });
}

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

/** Sign in through the API and replace demo data with the authenticated crew member's data. */
export async function signIn(crewId: string, pin: string): Promise<Astronaut> {
  const user = await backendLogin(crewId, pin);
  if (user.role !== 'astronaut' || !user.astronautId) {
    clearBackendSession();
    throw new Error('This account does not have access to the astronaut app.');
  }

  let profile: unknown;
  let missionResponse: unknown;
  let logsResponse: unknown;
  try {
    [profile, missionResponse, logsResponse] = await Promise.all([
      backendRequest('/api/v1/app/me/profile'),
      backendRequest('/api/v1/app/mission'),
      backendRequest('/api/v1/app/me/logs?limit=1000'),
    ]);
  } catch (error) {
    clearBackendSession();
    throw error;
  }

  const id = user.astronautId;
  const profileRoot = record(profile);
  const missionDay = Number(profileRoot.missionDay ?? record(profileRoot.mission).today ?? getDb().mission.today);
  const astronaut = astronautFromBackend(profile, id, crewId, user.displayName);
  const mission = missionFromBackend(missionResponse, missionDay);
  const remoteLogs = list(logsResponse, 'logs', 'items').filter((entry) => {
    const item = record(entry);
    return typeof item.id === 'string' && typeof item.type === 'string' && typeof item.timestamp === 'string';
  }) as Log[];

  const [summariesResponse, groundResponse, shopResponse, alertsResponse, chatResponse, journalResponse] = await Promise.all([
    optionalRequest<unknown>('/api/v1/app/me/summaries'),
    optionalRequest<unknown>('/api/v1/app/me/ground-messages'),
    optionalRequest<unknown>('/api/v1/app/shop'),
    optionalRequest<unknown>('/api/v1/app/me/alerts'),
    optionalRequest<unknown>('/api/v1/app/me/orbi/messages'),
    optionalRequest<unknown>('/api/v1/app/me/journal'),
  ]);
  const summaries = list(summariesResponse, 'summaries', 'items').map((value) => {
    const summary = record(value);
    const areas = record(summary.areas);
    const supportedTypes: LogType[] = ['mood', 'sleep', 'radiation', 'measurement', 'injury', 'meal', 'exercise', 'meditation'];
    return {
      astronautId: id,
      missionDay: Number(summary.missionDay ?? 0),
      logsDone: Array.isArray(summary.logsDone)
        ? summary.logsDone.filter((type): type is LogType => typeof type === 'string' && supportedTypes.includes(type as LogType))
        : [],
      logsDoneCount: Number(summary.logsDoneCount ?? 0),
      logsTotal: Number(summary.logsTotal ?? LOGS_TOTAL),
      overallScore: Number(summary.overallScore ?? 60),
      areas: {
        head: levelFromBackend(areas.head),
        torso: levelFromBackend(areas.torso),
        armL: levelFromBackend(areas.armL),
        armR: levelFromBackend(areas.armR),
        legL: levelFromBackend(areas.legL),
        legR: levelFromBackend(areas.legR),
      },
    } satisfies DailySummary;
  });
  const messages = list(groundResponse, 'messages', 'items').map((value) => {
    const message = record(value);
    return { ...message, from: message.from === 'astronaut' ? 'astronaut' : 'ground' } as GroundMessage;
  });
  const alerts = list(alertsResponse, 'alerts', 'items') as Db['ai_chat']['alerts'];
  const chatMessages = list(chatResponse, 'messages', 'items').flatMap((value): AiMessage[] => {
    const message = record(value);
    const text = message.text ?? message.content;
    if (typeof text !== 'string') return [];
    const role = message.author ?? message.role;
    return [
      {
        id: String(message.id ?? `api-msg-${Math.random().toString(36).slice(2)}`),
        astronautId: id,
        author: role === 'astronaut' || role === 'user' ? 'astronaut' : 'orbi',
        text,
        timestamp: String(message.timestamp ?? message.createdAt ?? new Date().toISOString()),
        mode: 'journal',
      },
    ];
  });
  const journal = list(journalResponse, 'journal', 'entries', 'items').map((value) => {
    const entry = record(value);
    return {
      id: String(entry.id ?? ''),
      astronautId: id,
      timestamp: String(entry.timestamp ?? entry.createdAt ?? new Date().toISOString()),
      summary: String(entry.summary ?? entry.text ?? ''),
      ...(typeof entry.moodLevel === 'number' ? { moodLevel: entry.moodLevel } : {}),
      sourceMessageIds: Array.isArray(entry.sourceMessageIds) ? (entry.sourceMessageIds as string[]) : [],
    } as JournalEntry;
  });
  const remoteItems = list(shopResponse, 'items', 'shop');
  const shop = remoteItems.length
    ? remoteItems
        .map((value) => {
          const remoteItem = record(value);
          return getDb().shop.find((item) => item.id === remoteItem.id);
        })
        .filter((item): item is ShopItem => Boolean(item))
    : getDb().shop;

  setDb((db) => ({
    ...db,
    currentAstronautId: id,
    mission,
    astronauts: [astronaut],
    logs: remoteLogs,
    daily_summaries: summaries,
    ground_messages: messages,
    shop,
    calendar: [],
    environment_readings: [],
    ai_chat: { messages: chatMessages, journal, alerts },
  }));
  return astronaut;
}

function updateAstronaut(id: string, fn: (a: Astronaut) => Astronaut) {
  setDb((db) => ({ ...db, astronauts: db.astronauts.map((a) => (a.id === id ? fn(a) : a)) }));
}

export function completeOnboarding(avatarName: string, dailyReminders?: boolean) {
  const name = avatarName.trim() || 'Bolt';
  updateAstronaut(getCurrentAstronautId(), (a) => ({
    ...a,
    onboardingDone: true,
    avatar: { ...a.avatar, name },
  }));
  if (hasBackendSession()) {
    syncInBackground(
      backendRequest('/api/v1/app/me/onboarding', { method: 'POST', body: { avatarName: name, dailyReminders } }),
    );
  }
}

export function updateDevicePairing(values: { wristBandPaired?: boolean; bpCuff?: boolean }) {
  updateAstronaut(getCurrentAstronautId(), (astronaut) => ({
    ...astronaut,
    devices: {
      ...astronaut.devices,
      ...(typeof values.wristBandPaired === 'boolean'
        ? { wristBand: { ...astronaut.devices.wristBand, paired: values.wristBandPaired } }
        : {}),
      ...(typeof values.bpCuff === 'boolean' ? { bpCuff: values.bpCuff } : {}),
    },
  }));
  if (hasBackendSession()) {
    syncInBackground(backendRequest('/api/v1/app/me/devices', { method: 'PATCH', body: values }));
  }
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

function backendLogBody(log: Log) {
  const data = { ...(log.data as unknown as Record<string, unknown>) };
  const voiceNote = record(data.voiceNote);
  if (Object.keys(voiceNote).length) {
    const shareableVoiceNote = { ...voiceNote };
    delete shareableVoiceNote.uri;
    data.voiceNote = shareableVoiceNote;
  }
  return {
    type: log.type,
    data,
    timestamp: log.timestamp,
    environmentId: log.environmentId,
    note: log.note,
  };
}

function syncSavedLog(localLog: Log, method: 'POST' | 'PUT') {
  if (!hasBackendSession()) return;
  const path = method === 'POST' ? '/api/v1/app/me/logs' : `/api/v1/app/me/logs/${encodeURIComponent(localLog.id)}`;
  syncInBackground(
    backendRequest<unknown>(path, { method, body: backendLogBody(localLog) }).then((response) => {
      const result = record(response);
      const remoteLog = record(result.log ?? response);
      if (typeof remoteLog.id !== 'string') return;
      setDb((db) => ({
        ...db,
        logs: db.logs.map((entry) =>
          entry.id === localLog.id
            ? ({ ...entry, id: String(remoteLog.id), missionDay: Number(remoteLog.missionDay ?? entry.missionDay), coinsEarned: Number(remoteLog.coinsEarned ?? entry.coinsEarned) } as Log)
            : entry,
        ),
        astronauts:
          typeof result.coins === 'number'
            ? db.astronauts.map((astronaut) =>
                astronaut.id === localLog.astronautId ? { ...astronaut, avatar: { ...astronaut.avatar, coins: result.coins as number } } : astronaut,
              )
            : db.astronauts,
      }));
    }),
  );
}

/** Saves a new log for the current astronaut and gives +10 coins. */
export function addLog<T extends LogType>(type: T, data: LogDataMap[T], opts: AddLogOptions = {}): LogOf<T> {
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
  syncSavedLog(created as Log, 'POST');
  return created;
}

/** Edits an existing log (no extra coins). */
export function updateLog<T extends LogType>(id: string, data: LogDataMap[T], opts: AddLogOptions = {}) {
  lastSaved = { type: getDb().logs.find((l) => l.id === id)?.type ?? 'mood', at: Date.now(), coins: 0 };
  let updated: Log | undefined;
  setDb((db) => ({
    ...db,
    logs: db.logs.map((l) => {
      if (l.id !== id) return l;
      updated = { ...l, data, note: opts.note !== undefined ? opts.note : l.note, timestamp: opts.timestamp ?? l.timestamp } as Log;
      return updated;
    }),
  }));
  if (updated) syncSavedLog(updated, 'PUT');
}

/**
 * Saves today's log of a once-a-day type: updates if it exists, otherwise adds (+10).
 * A new mood check-in that completes a 7-day streak also gives the +50 check-in bonus.
 */
export function saveDailyLog<T extends LogType>(type: T, data: LogDataMap[T], opts: AddLogOptions = {}) {
  const existing = getTodayLogs(type)[0];
  if (existing) {
    updateLog<T>(existing.id, data, opts);
    return { log: existing, coins: 0 };
  }
  const log = addLog(type, data, opts);
  let coins = COINS_PER_LOG;
  if (type === 'mood' && getCheckinStreak() % 7 === 0) {
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

/** Uses the server summary as the baseline and overlays logs created in this session. */
export function getDailySummary(day: number = getToday(), astronautId: string = getCurrentAstronautId()): DailySummary {
  const stored = getDb().daily_summaries.find((d) => d.astronautId === astronautId && d.missionDay === day);
  const dayLogs = getLogs({ astronautId, missionDay: day });
  const serverTypes = new Set((stored?.logsDone ?? []).filter((type): type is LogType => COUNTED_TYPES.includes(type)));
  const sessionTypes = new Set(dayLogs.map((log) => log.type).filter((type) => COUNTED_TYPES.includes(type)));
  const logsDone = COUNTED_TYPES.filter((type) => serverTypes.has(type) || sessionTypes.has(type));
  const newSessionTypes = [...sessionTypes].filter((type) => !serverTypes.has(type)).length;
  const baseScore = stored?.overallScore ?? 60;
  const overallScore = Math.min(100, baseScore + newSessionTypes * 2);
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

export interface OrbiChatResult {
  reply: string;
  mode: ChatMode;
  topic: string | null;
  saved: boolean;
  journalEntry: JournalEntry | null;
  messages: AiMessage[];
  provenance: string | null;
}

/** Sends a real chat request. Only server-returned Journal messages enter the shared store. */
export async function sendOrbiChat(text: string, mode: ChatMode): Promise<OrbiChatResult> {
  const response = record(
    await backendRequest<unknown>('/api/v1/app/me/orbi/chat', { method: 'POST', body: { text, mode } }),
  );
  if (typeof response.reply !== 'string') throw new Error('Orbi returned an invalid response. Please try again.');
  const actualMode: ChatMode = response.mode === 'private' || response.mode === 'journal' ? response.mode : mode;

  const messages = list(response.messages).flatMap((value): AiMessage[] => {
    const message = record(value);
    const content = message.text ?? message.content;
    if (typeof content !== 'string') return [];
    const role = message.author ?? message.role;
    return [
      {
        id: String(message.id ?? `orbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        astronautId: String(message.astronautId ?? getCurrentAstronautId()),
        author: role === 'astronaut' || role === 'user' ? 'astronaut' : 'orbi',
        text: content,
        timestamp: String(message.timestamp ?? message.createdAt ?? new Date().toISOString()),
        mode: actualMode,
      },
    ];
  });

  let journalEntry: JournalEntry | null = null;
  const rawEntry = record(response.journalEntry);
  if (actualMode === 'journal' && response.saved === true && Object.keys(rawEntry).length) {
    journalEntry = {
      id: String(rawEntry.id ?? ''),
      astronautId: String(rawEntry.astronautId ?? getCurrentAstronautId()),
      timestamp: String(rawEntry.timestamp ?? rawEntry.createdAt ?? new Date().toISOString()),
      summary: String(rawEntry.summary ?? ''),
      ...(typeof rawEntry.moodLevel === 'number' ? { moodLevel: rawEntry.moodLevel } : {}),
      sourceMessageIds: Array.isArray(rawEntry.sourceMessageIds) ? (rawEntry.sourceMessageIds as string[]) : [],
    };
  }

  if (actualMode === 'journal') {
    setDb((db) => {
      const knownIds = new Set(db.ai_chat.messages.map((message) => message.id));
      return {
        ...db,
        ai_chat: {
          ...db.ai_chat,
          messages: [...db.ai_chat.messages, ...messages.filter((message) => !knownIds.has(message.id))],
          journal:
            journalEntry && !db.ai_chat.journal.some((entry) => entry.id === journalEntry?.id)
              ? [...db.ai_chat.journal, journalEntry]
              : db.ai_chat.journal,
        },
      };
    });
  }

  return {
    reply: response.reply,
    mode: actualMode,
    topic: typeof response.topic === 'string' ? response.topic : null,
    saved: response.saved === true,
    journalEntry,
    messages,
    provenance: typeof response.provenance === 'string' ? response.provenance : null,
  };
}

export function getJournal(astronautId: string = getCurrentAstronautId()): JournalEntry[] {
  return getDb()
    .ai_chat.journal.filter((j) => j.astronautId === astronautId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
  if (hasBackendSession()) {
    syncInBackground(
      backendRequest<unknown>('/api/v1/app/me/ground-messages', {
        method: 'POST',
        body: { text, urgent, attachments },
      }).then((response) => {
        const remote = record(response);
        if (typeof remote.id !== 'string') return;
        const saved = { ...msg, ...remote, from: remote.from === 'ground' ? 'ground' : 'astronaut' } as GroundMessage;
        setDb((db) => ({ ...db, ground_messages: db.ground_messages.map((entry) => (entry.id === msg.id ? saved : entry)) }));
      }),
    );
  }
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
  if (hasBackendSession()) {
    syncInBackground(
      backendRequest<unknown>('/api/v1/app/me/avatar/purchase', { method: 'POST', body: { itemId: id } }).then((response) => {
        const result = record(response);
        const remoteAvatar = record(result.avatar ?? response);
        if (typeof remoteAvatar.coins === 'number' || Array.isArray(remoteAvatar.owned)) {
          updateAstronaut(me.id, (a) => ({
            ...a,
            avatar: {
              ...a.avatar,
              ...(typeof remoteAvatar.coins === 'number' ? { coins: remoteAvatar.coins } : {}),
              ...(Array.isArray(remoteAvatar.owned) ? { owned: remoteAvatar.owned as string[] } : {}),
            },
          }));
        }
      }),
    );
  }
  return 'ok';
}

/** Equips an owned item (pets can be toggled off). */
export function equipItem(id: string) {
  const item = getShopItem(id);
  if (!item) return;
  const backendItemId = item.category === 'pet' && getAstronaut().avatar.equipped.pet === id ? null : id;
  updateAstronaut(getCurrentAstronautId(), (a) => {
    const eq = { ...a.avatar.equipped, room: { ...a.avatar.equipped.room } };
    if (item.category === 'helmet') eq.helmet = id;
    else if (item.category === 'suit') eq.suit = id;
    else if (item.category === 'pet') eq.pet = eq.pet === id ? null : id;
    else eq.room[item.category] = id;
    return { ...a, avatar: { ...a.avatar, equipped: eq } };
  });
  if (hasBackendSession()) {
    syncInBackground(
      backendRequest('/api/v1/app/me/avatar/equip', { method: 'POST', body: { itemId: backendItemId, category: item.category } }),
    );
  }
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
