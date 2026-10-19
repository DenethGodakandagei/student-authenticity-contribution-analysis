// app/auth/LoginForm.tsx
'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import AuthButton from './AuthButton';
import AuthFooter from './AuthFooter';
import Checkbox from './Checkbox';
import FormField from './FormField';
import PasswordField from './PasswordField';
import RoleSelector from './RoleSelector';
import { delay } from './anim';
import {
  destinationFor,
  loadRememberedEmail,
  login,
  type AuthRole,
} from './authService';
import {
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../utils/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The remembered-address snapshot never pushes events — it is read-only. */
const subscribeNoop = () => () => {};
const getServerNone = () => null;

interface LoginErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(trimmed)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.2m0 3.2h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AuthRole>('student');
  const [rememberOverride, setRememberOverride] = useState<boolean | null>(null);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showResetHint, setShowResetHint] = useState(false);

  // Remembered address (never a password) — read as an external snapshot so the
  // first client render can differ from the server markup without a mismatch.
  const rememberedEmail = useSyncExternalStore(subscribeNoop, loadRememberedEmail, getServerNone);
  const email = emailOverride ?? rememberedEmail ?? '';
  const remember = rememberOverride ?? rememberedEmail !== null;

  const skipAutoRedirect = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (token && !skipAutoRedirect.current) router.replace('/');
  }, [token, router]);

  useEffect(() => () => void (timerRef.current && window.clearTimeout(timerRef.current)), []);

  const errors = validate(email, password);
  const emailError = (submitted || touched.email) ? errors.email : undefined;
  const passwordError = (submitted || touched.password) ? errors.password : undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || success) return;

    setSubmitted(true);
    setServerError('');
    const current = validate(email, password);
    if (current.email || current.password) {
      const first = current.email ? 'login-email' : 'login-password';
      document.getElementById(first)?.focus();
      return;
    }

    setBusy(true);
    skipAutoRedirect.current = true;
    const outcome = await login({
      email: email.trim(),
      password,
      role,
      remember,
    });
    setBusy(false);

    if (!outcome.ok) {
      skipAutoRedirect.current = false;
      setServerError(outcome.error);
      return;
    }

    setSuccess(true);
    timerRef.current = window.setTimeout(
      () => router.push(destinationFor(outcome.role)),
      650
    );
  };

  return (
    <>
      <header className="auth-head">
        <p className="auth-kicker a-up" style={delay(40)}>
          {role === 'student' ? 'Student access' : 'Lecturer access'}
        </p>
        <h1 className="auth-title a-up" style={delay(95)}>
          Welcome back
        </h1>
        <p className="auth-sub a-up" style={delay(150)}>
          Continue your learning journey with NOVA.
        </p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="a-up" style={delay(205)}>
          <RoleSelector
            value={role}
            onChange={setRole}
            name="login-role"
            variant="segmented"
            delayMs={0}
          />
          <p className="auth-note" style={{ marginTop: '0.55rem' }}>
            Sets your landing page after sign-in — permissions are always granted by
            the NOVA server.
          </p>
        </div>

        <FormField
          id="login-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(value) => {
            setEmailOverride(value);
            setServerError('');
          }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="you@university.edu"
          autoComplete="email"
          inputMode="email"
          error={emailError}
          delayMs={280}
        />

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setServerError('');
          }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          autoComplete="current-password"
          error={passwordError}
          delayMs={330}
        />

        <div className="row-between a-up" style={delay(380)}>
          <Checkbox
            id="login-remember"
            checked={remember}
            onChange={(next) => setRememberOverride(next)}
          >
            Remember me
          </Checkbox>
          <button
            type="button"
            className="link link--muted"
            onClick={() => setShowResetHint((v) => !v)}
            aria-expanded={showResetHint}
          >
            Forgot password?
          </button>
        </div>

        {showResetHint && (
          <p className="auth-note auth-note--box">
            Automated password recovery isn&apos;t available yet — ask your course
            administrator or lecturer to reset access to your NOVA account.
          </p>
        )}

        {serverError && (
          <p className="auth-alert" role="alert">
            <AlertIcon />
            <span>{serverError}</span>
          </p>
        )}

        {success && (
          <p className="auth-success" role="status">
            <span className="auth-success__ring" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="m5 13 4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Signed in — taking you to your workspace…
          </p>
        )}

        <AuthButton loading={busy} loadingText="Signing in…" delayMs={430}>
          Sign in
        </AuthButton>
      </form>

      <AuthFooter
        prompt="Don't have an account?"
        action="Create one"
        href="/register"
        delayMs={480}
      >
        <p className="auth-legal">
          Teaching sessions are part of a university research project and are
          analysed in anonymised form.
        </p>
      </AuthFooter>
    </>
  );
}
