/**
 * Connection to the Crew Health API (backend).
 *
 * EXPO_PUBLIC_API_URL picks the server; set it to "mock" to run on the bundled mock only.
 * Tokens: 30-minute access token + rotating refresh token (POST /api/v1/auth/refresh).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://crew-health-api-univesp.azurewebsites.net').replace(/\/+$/, '');
export const backendEnabled = API_URL !== '' && API_URL.toLowerCase() !== 'mock';

const REQUEST_TIMEOUT_MS = 20000;

// ---------------------------------------------------------------- storage on the device

/** localStorage on web; in memory on the phone (add AsyncStorage here to keep data across app restarts). */
const memory = new Map<string, string>();
const web = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = web()?.getItem(key) ?? memory.get(key) ?? null;
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    try {
      web()?.setItem(key, raw);
    } catch {
      // storage full or blocked: the in-memory copy still works for this session
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      web()?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// ---------------------------------------------------------------- tokens

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  role: 'astronaut' | 'ground';
  crewId: string;
}

const TOKENS_KEY = 'cosmomedic.tokens.v1';
let tokens: Tokens | null = storage.get<Tokens>(TOKENS_KEY);

export const getTokens = () => tokens;
export function setTokens(next: Tokens | null) {
  tokens = next;
  if (next) storage.set(TOKENS_KEY, next);
  else storage.remove(TOKENS_KEY);
}

// ---------------------------------------------------------------- http

/** The server answered with an error status (the request arrived). */
export class HttpError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`HTTP ${status}: ${detail}`);
  }
}
/** No answer: no link, timeout or DNS. The request can be sent again later. */
export class NetworkError extends Error {}

async function send(method: string, path: string, body: unknown, token: string | null, extra?: Record<string, string>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : 'network error');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data?.detail === 'string' ? data.detail : JSON.stringify(data?.detail ?? data);
    } catch {
      // not JSON
    }
    // 502/503/504: the server is restarting or unreachable behind the gateway; same as no link
    if (res.status >= 502 && res.status <= 504) throw new NetworkError(detail);
    throw new HttpError(res.status, detail);
  }
  return res.status === 204 ? null : res.json();
}

let refreshing: Promise<boolean> | null = null;
/** Trades the refresh token for a new pair. False when the session ended (sign in again). */
function refresh(): Promise<boolean> {
  if (!tokens) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const out = await send('POST', '/api/v1/auth/refresh', { refreshToken: tokens!.refreshToken }, null);
      setTokens({ ...tokens!, accessToken: out.accessToken, refreshToken: out.refreshToken });
      return true;
    } catch (e) {
      if (e instanceof NetworkError) throw e;
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Authenticated request. Renews the access token once on 401. */
export async function request<T = any>(method: string, path: string, body?: unknown, extra?: Record<string, string>): Promise<T> {
  try {
    return await send(method, path, body, tokens?.accessToken ?? null, extra);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401 && (await refresh())) {
      return send(method, path, body, tokens?.accessToken ?? null, extra);
    }
    throw e;
  }
}

export interface LoginOut {
  accessToken: string;
  refreshToken: string;
  role: 'astronaut' | 'ground';
  astronaut: { id: string; name: string; crewId: string; onboardingDone: boolean } | null;
}

export function login(crewId: string, pin: string): Promise<LoginOut> {
  return send('POST', '/api/v1/app/auth/login', { crewId: crewId.trim(), pin }, null);
}

export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
