/**
 * Connection to the Crew Health API (backend).
 *
 * EXPO_PUBLIC_API_URL picks the server; explicit mock mode restores the bundled demo.
 * Tokens: 30-minute access token + rotating refresh token (POST /api/v1/auth/refresh).
 */
import { ApiError, API_URL, USE_MOCK_DATA, getSessionRole, getSessionTokens, subscribeTokenChanges, request as httpRequest, setSession, type LoginResponse } from './http';
export { API_URL };
export const backendEnabled = !USE_MOCK_DATA;

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

subscribeTokenChanges(() => {
  const active = getSessionTokens();
  if (active && tokens) { tokens = { ...tokens, ...active }; storage.set(TOKENS_KEY, tokens); }
  else if (!active) { tokens = null; storage.remove(TOKENS_KEY); }
});

export const getTokens = () => tokens;
export function setTokens(next: Tokens | null) {
  tokens = next;
  setSession(next);
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

/** The shared transport supports JSON, uploads and rotating refresh tokens. */
export async function request<T = any>(method: string, path: string, body?: unknown, extra?: Record<string, string>): Promise<T> {
  try {
    return await httpRequest<T>(path.replace(/^\/api\/v1/, ''), {
      method, headers: extra, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 0 || (error.status >= 502 && error.status <= 504)) throw new NetworkError(error.message);
      throw new HttpError(error.status, error.message);
    }
    throw error;
  }
}

export interface LoginOut {
  accessToken: string;
  refreshToken: string;
  role: 'astronaut' | 'ground';
}

export async function login(username: string, password: string): Promise<LoginOut> {
  const result = await httpRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) }, false).catch((error) => {
    if (error instanceof ApiError && error.status === 0) throw new NetworkError(error.message);
    if (error instanceof ApiError) throw new HttpError(error.status, error.message);
    throw error;
  });
  const rawRole = result.user?.role ?? result.role;
  // The standard auth route names the ground team's roles medical/admin.
  const role = rawRole === 'medical' || rawRole === 'admin' ? 'ground' : rawRole;
  if (role !== 'astronaut' && role !== 'ground') throw new HttpError(403, 'This account cannot access CosmoMedic.');
  return { accessToken: result.accessToken, refreshToken: result.refreshToken, role };
}

/** Do not restore a stored token into route guards before its snapshot is loaded. */
export function restoreSession() {
  if (tokens && !getSessionRole()) setSession(tokens);
}

export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
