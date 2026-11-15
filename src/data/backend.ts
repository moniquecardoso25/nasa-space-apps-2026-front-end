const API_URL = 'https://crew-health-api-univesp.azurewebsites.net';

type JsonObject = Record<string, unknown>;

export interface BackendUser {
  username: string;
  displayName: string;
  role: string;
  astronautId: string | null;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshInProgress: Promise<boolean> | null = null;

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const body = payload as JsonObject;
    const detail = body.detail ?? body.message;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof item === 'object' ? (item as JsonObject).msg : null))
        .filter((item): item is string => typeof item === 'string');
      if (messages.length) return messages.join(' ');
    }
  }
  return `The server returned HTTP ${status}.`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  if (refreshInProgress) return refreshInProgress;

  const currentRefreshToken = refreshToken;
  refreshInProgress = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
        signal: controller.signal,
      });
      const body = (await readBody(response)) as RefreshResponse | null;
      if (!response.ok || !body?.accessToken || !body.refreshToken) {
        accessToken = null;
        refreshToken = null;
        return false;
      }
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

export async function backendRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
  canRefresh = true,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new BackendError('The Crew Health API did not respond in time. Please try again.');
    }
    throw new BackendError('Could not connect to the Crew Health API. Check your internet connection and try again.');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && canRefresh && options.auth !== false && (await refreshSession())) {
    return backendRequest<T>(path, options, false);
  }

  const payload = await readBody(response);
  if (!response.ok) throw new BackendError(errorMessage(payload, response.status), response.status);
  return payload as T;
}

export async function backendLogin(crewId: string, pin: string): Promise<BackendUser> {
  clearBackendSession();
  const result = await backendRequest<TokenResponse>(
    '/api/v1/app/auth/login',
    { method: 'POST', auth: false, body: { crewId: crewId.trim(), pin } },
    false,
  );
  if (!result.accessToken || !result.refreshToken || !result.user) {
    throw new BackendError('The server returned an incomplete sign-in response.');
  }
  accessToken = result.accessToken;
  refreshToken = result.refreshToken;
  return result.user;
}

export function clearBackendSession() {
  accessToken = null;
  refreshToken = null;
}

export function hasBackendSession() {
  return accessToken !== null;
}
