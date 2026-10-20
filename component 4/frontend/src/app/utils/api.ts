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

// ── Token storage (localStorage) + change subscription ────────────────────────
const TOKEN_KEY = 'nova_access_token';
const USER_KEY = 'nova_user';

const authListeners = new Set<() => void>();

function notifyAuthChange() {
  authListeners.forEach((listener) => listener());
}

/** Subscribe to auth changes (login/logout in this tab or another one). */
export function subscribeAuth(listener: () => void): () => void {
  authListeners.add(listener);
  const onStorage = () => listener();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    authListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

/** useSyncExternalStore client snapshot: the raw access token (or null). */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Session-scoped token first (sign-in with "remember me" unchecked),
    // then the persistent one.
    return (
      window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

/** useSyncExternalStore server snapshot: never authenticated while rendering. */
export function getServerAuthSnapshot(): string | null {
  return null;
}

/** useSyncExternalStore snapshot for the stored user (raw JSON, stable value). */
export function getStoredUserRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.sessionStorage.getItem(USER_KEY) ?? window.localStorage.getItem(USER_KEY)
    );
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  const raw = getStoredUserRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export interface SaveAuthOptions {
  /**
   * true (default) keeps the session across browser restarts (localStorage);
   * false scopes it to the current tab/session only (sessionStorage).
   */
  remember?: boolean;
}

/** Persists the response of POST /auth/register or POST /auth/login. */
export function saveAuth(auth: AuthResponse, options: SaveAuthOptions = {}): void {
  const remember = options.remember ?? true;
  if (typeof window === 'undefined') return;
  try {
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
    target.setItem(TOKEN_KEY, auth.access_token);
    target.setItem(USER_KEY, JSON.stringify(auth.user));
  } catch {
    // storage unavailable — the current tab still works via in-memory notify
  }
  notifyAuthChange();
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  notifyAuthChange();
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** On 401: drop the dead token and send the user to /login. */
function handleUnauthorized(): void {
  clearAuth();
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/register') {
    // Full page reset (not a client-side route change) so every cached
    // authenticated view is thrown away with the expired token.
    window.location.replace('/login');
  }
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetch wrapper: injects NEXT_PUBLIC_API_URL, JSON headers and the stored
 * bearer token, and turns a 401 into a logout + redirect to /login.
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
      ...authHeaders(),
    },
    credentials: 'same-origin',
  };

  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      // Let the browser set the multipart boundary itself.
      init.body = body;
    } else {
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  } else {
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, init);
    let data: T | undefined;
    try {
      data = (await res.json()) as T;
    } catch {
      data = undefined;
    }
    // Bad credentials on the auth routes are a form error, not a session expiry.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      handleUnauthorized();
    }
    return { ok: res.ok, data, status: res.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** POST /auth/logout, then always drop the local token. */
export async function logoutRequest(): Promise<void> {
  try {
    await apiRequest('/auth/logout', 'POST');
  } catch {
    // JWTs are stateless — the local token is cleared either way
  }
  clearAuth();
}
