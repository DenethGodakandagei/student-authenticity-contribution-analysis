// app/utils/api.ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface AuthUser {
  id: number | string;
  name: string;
  email: string;
  student_id?: string | null;
  consent_at?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

// ── Auth token storage ────────────────────────────────────────────────────────
const TOKEN_KEY = 'nova_access_token';
const USER_KEY = 'nova_user';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthResponse): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, auth.access_token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  } catch {
    // storage unavailable — auth still works for this tab via in-memory state
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** Returns the `Authorization` header value when a token is stored. */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple wrapper around fetch that injects the base URL from .env.local,
 * adds JSON headers, sends the stored bearer token, and returns a typed result.
 */
export async function apiRequest<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown
): Promise<ApiResponse<T>> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
  const url = `${base}${path}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    credentials: 'same-origin',
  };

  if (body !== undefined) init.body = JSON.stringify(body);

  try {
    const res = await fetch(url, init);
    const data = (await res.json()) as T;
    return { ok: res.ok, data, status: res.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
