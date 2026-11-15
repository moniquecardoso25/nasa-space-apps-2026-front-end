/** HTTP transport. Tokens stay in memory and are never bundled or persisted. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://crew-health-api-univesp.azurewebsites.net/api/v1').replace(/\/+$/, '');
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

interface Tokens { accessToken: string; refreshToken: string }
export interface LoginResponse extends Tokens {
  role?: string;
  astronautId?: string | null;
  user?: { role: string; astronautId: string | null };
}

let tokens: Tokens | null = null;
let role: string | null = null;
let sessionVersion = 0;
let renewing: Promise<void> | null = null;
const listeners = new Set<() => void>();
export const getSessionRole = () => role;
export const getSessionVersion = () => sessionVersion;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setSession(value: LoginResponse | null) {
  sessionVersion++;
  tokens = value;
  role = value ? value.role ?? value.user?.role ?? 'astronaut' : null;
  listeners.forEach((listener) => listener());
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      const message = typeof detail === 'string' ? detail : Array.isArray(detail)
        ? detail.map((item: { loc?: unknown[]; msg?: string }) => `${item.loc?.slice(1).join('.') ?? 'Input'}: ${item.msg}`).join('\n')
        : `Request failed (${response.status}). Please try again.`;
      throw new ApiError(message, response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to reach Mission Control. Check your connection and try again.', 0);
  } finally { clearTimeout(timer); }
}

export async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const version = sessionVersion;
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    if (!tokens) throw new ApiError('Your session has ended. Please sign in again.', 401);
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  try {
    const result = await send<T>(path, { ...init, headers });
    if (authenticated && version !== sessionVersion) throw new ApiError('Session changed. Please sign in again.', 401);
    return result;
  }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !authenticated) throw error;
    if (version !== sessionVersion) throw error;
    if (!renewing) {
      const session = tokens;
      renewing = send<Tokens>('/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session?.refreshToken }),
      }).then((next) => { if (tokens === session) tokens = next; }).catch((failure) => {
        if (tokens === session && failure instanceof ApiError && failure.status >= 400 && failure.status < 500) setSession(null);
        throw failure;
      }).finally(() => { renewing = null; });
    }
    await renewing;
    if (!tokens || version !== sessionVersion) throw new ApiError('Your session has ended. Please sign in again.', 401);
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    try {
      const result = await send<T>(path, { ...init, headers });
      if (version !== sessionVersion) throw new ApiError('Session changed. Please sign in again.', 401);
      return result;
    }
    catch (failure) {
      if (failure instanceof ApiError && failure.status === 401 && version === sessionVersion) setSession(null);
      throw failure;
    }
  }
}

export async function logout() {
  const previous = tokens;
  setSession(null);
  if (previous) await request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: previous.refreshToken }) }, false);
}

export const newRequestId = () => `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
