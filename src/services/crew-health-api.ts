/** Typed access layer for the Crew Health API described in Crew_Health_API_JSONs.docx.pdf. */
export type JsonRecord = Record<string, unknown>;

export type ApiUser = {
  username: string;
  displayName: string;
  role: 'astronaut' | 'medical' | 'surgeon' | 'admin' | string;
  astronautId?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: ApiUser;
};

export type CrewMe = {
  username: string;
  displayName: string;
  astronautId: string;
  missionId: string;
  missionDay: number;
  preferences: { proactiveMessages: boolean; minDaysBetweenMessages: number };
  unreadMessages: number;
  openSupportRequests: number;
};

export type CheckinOptions = {
  scale: Record<string, string>;
  symptoms: { code: string; label: string; urgent: boolean }[];
};

export type DailyCheckin = {
  id: number;
  astronautId: string;
  missionDay: number;
  stress: number;
  fatigue: number;
  symptoms: string[];
  notes: string | null;
  source: string;
};

export type ProactiveMessage = {
  id: number;
  missionDay: number;
  title: string;
  body: string;
  patterns: string[];
  actions: string[];
  status: 'unread' | 'read' | 'dismissed' | string;
  astronautId?: string;
};

export type SupportRequest = {
  id: number;
  astronautId: string;
  missionDay: number;
  reason: string;
  topic: string;
  topicLabel: string;
  priority: string;
  message: string;
  status: string;
  response: string | null;
  createdAt: string;
  updatedAt: string;
  detail?: string;
  assignedTo?: string | null;
  careNotes?: string | null;
  notified?: boolean;
};

export type ApiSession = { user: ApiUser; me?: CrewMe; offlineDemo: boolean };

export class CrewHealthApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    const message = typeof detail === 'string'
      ? detail
      : detail && typeof detail === 'object' && 'detail' in detail
        ? formatApiDetail((detail as { detail: unknown }).detail)
        : `Request failed (${status})`;
    super(message);
    this.name = 'CrewHealthApiError';
    this.status = status;
    this.detail = detail;
  }
}

function formatApiDetail(detail: unknown) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item && typeof item === 'object' && 'msg' in item ? String(item.msg) : String(item)).join(' ');
  }
  return 'The API rejected the request.';
}

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');
let accessToken: string | null = null;

export function setApiToken(token: string | null) {
  accessToken = token;
}

function query(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new CrewHealthApiError(0, `Cannot reach the Crew Health API at ${API_BASE_URL}.`);
  }

  if (!response.ok) {
    let detail: unknown;
    try { detail = await response.json(); } catch { detail = await response.text(); }
    throw new CrewHealthApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const crewHealthApi = {
  baseUrl: API_BASE_URL,
  health: () => get<{ status: string; dataReady: boolean }>('/health'),
  login: (username: string, password: string) => post<LoginResponse>('/api/v1/auth/login', { username, password }),
  oauthToken: (username: string, password: string) => request<{ access_token: string; token_type: string }>('/api/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }).toString(),
  }),
  currentUser: () => get<ApiUser>('/api/v1/auth/me'),
  me: () => get<CrewMe>('/api/v1/me'),
  checkinOptions: () => get<CheckinOptions>('/api/v1/me/checkins/options'),
  submitCheckin: (body: { stress: number; fatigue: number; symptoms: string[]; notes?: string }) => post<{ checkin: DailyCheckin; urgentSymptoms: string[]; supportRequestId?: number; message?: string }>('/api/v1/me/checkins', body),
  checkins: (params: { fromDay?: number; toDay?: number } = {}) => get<DailyCheckin[]>(`/api/v1/me/checkins${query(params)}`),
  patterns: (day?: number) => get<JsonRecord[]>(`/api/v1/me/patterns${query({ day })}`),
  messages: () => get<ProactiveMessage[]>('/api/v1/me/messages'),
  updateMessage: (id: number, action: 'read' | 'dismiss') => post<ProactiveMessage>(`/api/v1/me/messages/${id}/${action}`),
  preferences: () => get<{ proactiveMessages: boolean; minDaysBetweenMessages: number }>('/api/v1/me/preferences'),
  updatePreferences: (proactiveMessages: boolean) => put<{ proactiveMessages: boolean; minDaysBetweenMessages: number }>('/api/v1/me/preferences', { proactiveMessages }),
  requestSupport: (body: { topic: 'medical' | 'psychological' | 'family' | 'operational' | 'other'; message: string; urgent: boolean }) => post<SupportRequest>('/api/v1/me/support', body),
  supportRequests: () => get<SupportRequest[]>('/api/v1/me/support'),

  // Medical-team operations. These paths require a medical or admin bearer token.
  care: {
    support: (status = 'open') => get<SupportRequest[]>(`/api/v1/care/support${query({ status })}`),
    updateSupport: (id: number, body: { status?: string; response?: string; careNotes?: string }) => patch<SupportRequest>(`/api/v1/care/support/${id}`, body),
    checkins: (params: { astronautId?: string; fromDay?: number; toDay?: number } = {}) => get<DailyCheckin[]>(`/api/v1/care/checkins${query(params)}`),
    patterns: (params: { day?: number; fromDay?: number; toDay?: number; minSeverity?: string } = {}) => get<JsonRecord[]>(`/api/v1/care/patterns${query(params)}`),
    messages: (astronautId?: string) => get<ProactiveMessage[]>(`/api/v1/care/messages${query({ astronautId })}`),
    runPatterns: (day: number) => post<JsonRecord>(`/api/v1/care/patterns/run${query({ day })}`),
  },

  // Synthetic long-duration mission (authenticated; crew-wide views require medical/admin access).
  mission: {
    list: () => get<JsonRecord[]>('/api/v1/missions'),
    detail: (missionId: string) => get<JsonRecord>(`/api/v1/missions/${encodeURIComponent(missionId)}`),
    metrics: (missionId: string) => get<JsonRecord[]>(`/api/v1/missions/${encodeURIComponent(missionId)}/metrics`),
    crew: (missionId: string) => get<JsonRecord[]>(`/api/v1/missions/${encodeURIComponent(missionId)}/astronauts`),
    daily: (missionId: string, astronautId: string, params: { fromDay?: number; toDay?: number } = {}) => get<JsonRecord[]>(`/api/v1/missions/${encodeURIComponent(missionId)}/astronauts/${encodeURIComponent(astronautId)}/daily${query(params)}`),
    today: (missionId: string, astronautId: string, day?: number) => get<JsonRecord>(`/api/v1/missions/${encodeURIComponent(missionId)}/astronauts/${encodeURIComponent(astronautId)}/today${query({ day })}`),
    baseline: (missionId: string, astronautId: string) => get<JsonRecord>(`/api/v1/missions/${encodeURIComponent(missionId)}/astronauts/${encodeURIComponent(astronautId)}/baseline`),
    astronautEpisodes: (missionId: string, astronautId: string, params: { fromDay?: number; toDay?: number } = {}) => get<JsonRecord[]>(`/api/v1/missions/${encodeURIComponent(missionId)}/astronauts/${encodeURIComponent(astronautId)}/episodes${query(params)}`),
    agentContext: (missionId: string, astronautId: string, includeDaily = false) => get<JsonRecord>(`/api/v1/missions/${encodeURIComponent(missionId)}/astronauts/${encodeURIComponent(astronautId)}/agent-context${query({ includeDaily })}`),
    crewDay: (missionId: string, day: number) => get<JsonRecord>(`/api/v1/missions/${encodeURIComponent(missionId)}/dashboard${query({ day })}`),
    metricSeries: (missionId: string, metric: string, params: { fromDay?: number; toDay?: number } = {}) => get<JsonRecord>(`/api/v1/missions/${encodeURIComponent(missionId)}/metrics/${encodeURIComponent(metric)}/series${query(params)}`),
    episodes: (missionId: string, minMeasurements?: number) => get<JsonRecord[]>(`/api/v1/missions/${encodeURIComponent(missionId)}/episodes${query({ minMeasurements })}`),
    plantedEvents: (missionId: string) => get<JsonRecord[]>(`/api/v1/missions/${encodeURIComponent(missionId)}/events`),
    exportCsvUrl: (missionId: string) => `${API_BASE_URL}/api/v1/missions/${encodeURIComponent(missionId)}/export.csv`,
    regenerate: (seed = 42) => post<JsonRecord>(`/api/v1/missions/regenerate${query({ seed })}`),
  },

  // Public Inspiration4/OSDR crew health data.
  osdr: {
    crew: (timepoint?: string) => get<JsonRecord[]>(`/api/v1/crew${query({ timepoint })}`),
    crewSummary: (crewId: string) => get<JsonRecord>(`/api/v1/crew/${encodeURIComponent(crewId)}/summary`),
    timeline: (crewId: string) => get<JsonRecord[]>(`/api/v1/crew/${encodeURIComponent(crewId)}/timeline`),
    measurements: (crewId: string, params: { timepoint?: string; status?: string } = {}) => get<JsonRecord[]>(`/api/v1/crew/${encodeURIComponent(crewId)}/measurements${query(params)}`),
    crewAlerts: (crewId: string, timepoint?: string) => get<JsonRecord[]>(`/api/v1/crew/${encodeURIComponent(crewId)}/alerts${query({ timepoint })}`),
    analyteSeries: (crewId: string, analyte: string) => get<JsonRecord>(`/api/v1/crew/${encodeURIComponent(crewId)}/analytes/${encodeURIComponent(analyte)}/series`),
    overview: () => get<JsonRecord>('/api/v1/dashboard/overview'),
    alerts: (params: { timepoint?: string; severity?: string } = {}) => get<JsonRecord[]>(`/api/v1/dashboard/alerts${query(params)}`),
    heatmap: (params: { panel?: string; metric?: string } = {}) => get<JsonRecord>(`/api/v1/dashboard/heatmap${query(params)}`),
    analyteTrend: (analyte: string) => get<JsonRecord>(`/api/v1/dashboard/analytes/${encodeURIComponent(analyte)}/trend`),
    studies: () => get<JsonRecord[]>('/api/v1/studies'),
    timepoints: () => get<JsonRecord[]>('/api/v1/timepoints'),
    analytes: (panel?: string) => get<JsonRecord[]>(`/api/v1/analytes${query({ panel })}`),
    categories: () => get<JsonRecord[]>('/api/v1/categories'),
    searchMeasurements: (params: { crewId?: string; status?: string; limit?: number } = {}) => get<JsonRecord[]>(`/api/v1/measurements${query(params)}`),
    exportCsvUrl: () => `${API_BASE_URL}/api/v1/export/measurements.csv`,
  },

  // Real AGBRESA bed-rest analogue data. This is Earth-based research, not astronaut flight data.
  agbresa: {
    overview: () => get<JsonRecord>('/api/v1/analog/agbresa'),
    subjects: (group?: string) => get<JsonRecord[]>(`/api/v1/analog/agbresa/subjects${query({ group })}`),
    subject: (subjectId: string) => get<JsonRecord>(`/api/v1/analog/agbresa/subjects/${encodeURIComponent(subjectId)}`),
    observations: (subjectId: string, params: { metric?: string; moment?: string } = {}) => get<JsonRecord[]>(`/api/v1/analog/agbresa/subjects/${encodeURIComponent(subjectId)}/observations${query(params)}`),
    compareGroups: (params: { metric?: string; moment?: string } = {}) => get<JsonRecord>(`/api/v1/analog/agbresa/groups/compare${query(params)}`),
    quality: () => get<JsonRecord[]>('/api/v1/analog/agbresa/quality'),
    exportCsvUrl: () => `${API_BASE_URL}/api/v1/analog/agbresa/export.csv`,
  },

  // Searchable NASA crew-health references.
  knowledge: {
    documents: () => get<JsonRecord[]>('/api/v1/knowledge/documents'),
    search: (q: string, limit = 5) => get<{ query: string; total: number; hits: JsonRecord[] }>(`/api/v1/knowledge/search${query({ q, limit })}`),
    page: (documentId: number, page: number) => get<JsonRecord>(`/api/v1/knowledge/documents/${documentId}/pages/${page}`),
    upload: async (file: File, title?: string) => {
      const form = new FormData();
      form.append('file', file);
      if (title) form.append('title', title);
      return request<JsonRecord>('/api/v1/knowledge/documents', { method: 'POST', body: form });
    },
  },

  // Public dataset maintenance and restricted admin mission maintenance.
  ingest: {
    run: (source: 'auto' | 'remote' | 'bundled' = 'bundled') => post<JsonRecord>(`/api/v1/ingest${query({ source })}`),
    runs: () => get<JsonRecord[]>('/api/v1/ingest/runs'),
  },
};
