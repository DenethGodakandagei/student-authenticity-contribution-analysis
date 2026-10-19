// app/auth/authService.ts
//
// Authentication logic for the NOVA sign-in / registration screens.
// UI components never talk to the API directly — they call this module, which
// wraps the shared fetch wrapper in ../utils/api.
//
// Role notes
// ----------
// The backend (backend/app/auth.py) currently issues JWTs with no role claim:
// every account is a single, server-defined identity. The role the user picks
// in the UI is therefore used for two harmless things only:
//   1. where to send the browser after a successful request,
//   2. a forward-compatible `role` field included in the register payload.
// It is never treated as proof of authorisation — a lecturer account can only
// ever be granted lecturer privileges by the server.
import { apiRequest, saveAuth, type AuthResponse } from '../utils/api';
import type { ApiError } from '../utils/types';

export type AuthRole = 'student' | 'lecturer';

/** Where each role lands after a successful sign-in / registration. */
export function destinationFor(role: AuthRole): string {
  return role === 'lecturer' ? '/lecturer' : '/';
}

export interface LoginInput {
  email: string;
  password: string;
  role: AuthRole;
  remember: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: AuthRole;
  /** Student ID (student) or lecturer / staff ID (lecturer). */
  identifier: string;
  /** Lecturer only — sent as extra data the backend may ignore today. */
  department?: string;
  consent: boolean;
}

export type AuthOutcome =
  | { ok: true; role: AuthRole }
  | { ok: false; error: string };

type UserWithRole = AuthResponse['user'] & { role?: unknown };

function resolveRole(user: AuthResponse['user'] | undefined, fallback: AuthRole): AuthRole {
  const role = (user as UserWithRole | undefined)?.role;
  return role === 'student' || role === 'lecturer' ? role : fallback;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '(unset NEXT_PUBLIC_API_URL)';
}

function mapError(
  res: { data?: (ApiError & Record<string, unknown>) | AuthResponse | undefined; error?: string },
  action: string
): string {
  const detail = (res.data as ApiError | undefined)?.detail;
  if (detail) return detail;
  if (res.error) {
    return `Can't reach the NOVA server at ${apiBase()}. Start the backend and try again.`;
  }
  return `We couldn't ${action} right now. Please try again.`;
}

/** POST /auth/login — the server decides whether the credentials are valid. */
export async function login(input: LoginInput): Promise<AuthOutcome> {
  const res = await apiRequest<AuthResponse & ApiError>('/auth/login', 'POST', {
    email: input.email,
    password: input.password,
  });

  if (res.ok && res.data?.access_token) {
    saveAuth(res.data, { remember: input.remember });
    if (input.remember) rememberEmail(input.email);
    else clearRememberedEmail();
    return { ok: true, role: resolveRole(res.data.user, input.role) };
  }

  return { ok: false, error: mapError(res, 'sign in') };
}

/**
 * POST /auth/register.
 * `role` and `department` are forwarded for forward compatibility; the current
 * backend ignores fields it does not know and always assigns privileges itself.
 */
export async function register(input: RegisterInput): Promise<AuthOutcome> {
  const res = await apiRequest<AuthResponse & ApiError>('/auth/register', 'POST', {
    name: input.name,
    email: input.email,
    password: input.password,
    student_id: input.identifier || null,
    consent: input.consent,
    role: input.role,
    ...(input.department ? { department: input.department } : {}),
  });

  if (res.ok && res.data?.access_token) {
    saveAuth(res.data, { remember: true });
    clearRememberedEmail();
    return { ok: true, role: resolveRole(res.data.user, input.role) };
  }

  return { ok: false, error: mapError(res, 'create your account') };
}

/* ── "Remember me" e-mail only (never a password) ───────────────────────── */
const EMAIL_KEY = 'nova_remembered_email';

export function rememberEmail(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // storage unavailable — nothing to do
  }
}

export function clearRememberedEmail(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    // ignore
  }
}

export function loadRememberedEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}
