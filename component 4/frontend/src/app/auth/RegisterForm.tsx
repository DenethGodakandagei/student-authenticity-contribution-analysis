// app/auth/RegisterForm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthButton from './AuthButton';
import AuthFooter from './AuthFooter';
import Checkbox from './Checkbox';
import FormField from './FormField';
import PasswordField from './PasswordField';
import RoleSelector from './RoleSelector';
import { delay } from './anim';
import { destinationFor, register, type AuthRole } from './authService';
import {
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../utils/api';
import { useSyncExternalStore } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  consent?: string;
}

function validate(values: {
  name: string;
  email: string;
  password: string;
  confirm: string;
  consent: boolean;
}): RegisterErrors {
  const errors: RegisterErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (!name) errors.name = 'Enter your full name.';
  else if (name.length < 2) errors.name = 'That name looks too short.';

  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  if (!values.password) errors.password = 'Choose a password.';
  else if (values.password.length < 8) errors.password = 'Use at least 8 characters.';

  if (!values.confirm) errors.confirm = 'Repeat your password.';
  else if (values.confirm !== values.password) errors.confirm = 'Passwords do not match.';

  if (!values.consent) errors.consent = 'Consent is required to register.';

  return errors;
}

const CONSENT_TEXT =
  'I agree to the teaching-session data being used for this NOVA App.';

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.2m0 3.2h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [role, setRole] = useState<AuthRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | null>(null);

  const skipAutoRedirect = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (token && !skipAutoRedirect.current) router.replace('/');
  }, [token, router]);

  useEffect(() => () => void (timerRef.current && window.clearTimeout(timerRef.current)), []);

  const errors = validate({ name, email, password, confirm, consent });
  const errorFor = (key: keyof RegisterErrors) =>
    submitted || touched[key] ? errors[key] : undefined;

  const handleRoleChange = (next: AuthRole) => {
    if (next === role) return;
    setRole(next);
    setServerError('');
  };

  const focusFirstError = (current: RegisterErrors) => {
    const order: Array<[keyof RegisterErrors, string]> = [
      ['name', 'reg-name'],
      ['email', 'reg-email'],
      ['password', 'reg-password'],
      ['confirm', 'reg-confirm'],
      ['consent', 'reg-consent'],
    ];
    const first = order.find(([key]) => current[key]);
    if (first) document.getElementById(first[1])?.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || success) return;

    setSubmitted(true);
    setServerError('');
    const current = validate({ name, email, password, confirm, consent });
    if (Object.values(current).some(Boolean)) {
      focusFirstError(current);
      return;
    }

    setBusy(true);
    skipAutoRedirect.current = true;
    const outcome = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      identifier: '',
      consent,
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
      750
    );
  };

  const alertMessage = serverError || (submitted && errors.consent ? errors.consent : '');

  return (
    <>
      <header className="auth-head">
        <p className="auth-kicker a-up" style={delay(40)}>
          {role === 'student' ? 'Student account' : 'Lecturer account'}
        </p>
        <h1 className="auth-title a-up" style={delay(95)}>
          Create your account
        </h1>
      </header>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <RoleSelector
          value={role}
          onChange={handleRoleChange}
          name="register-role"
          variant="segmented"
          delayMs={180}
        />

        <div className="auth-row">
          <FormField
            id="reg-name"
            label="Full name"
            value={name}
            onChange={(value) => {
              setName(value);
              setServerError('');
            }}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Alex Tan"
            autoComplete="name"
            error={errorFor('name')}
            delayMs={250}
          />

          <FormField
            id="reg-email"
            label="Email address"
            type="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setServerError('');
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@university.edu"
            autoComplete="email"
            inputMode="email"
            error={errorFor('email')}
            delayMs={280}
          />
        </div>

        <div className="auth-row">
          <PasswordField
            id="reg-password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setServerError('');
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            autoComplete="new-password"
            error={errorFor('password')}
            hint="At least 8 characters."
            delayMs={310}
          />

          <PasswordField
            id="reg-confirm"
            label="Confirm password"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              setServerError('');
            }}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            autoComplete="new-password"
            error={errorFor('confirm')}
            delayMs={340}
          />
        </div>

        <div className="a-up" style={{ ...delay(450), display: 'grid', gap: '0.75rem' }}>
          <Checkbox id="reg-consent" checked={consent} onChange={setConsent}>
            {CONSENT_TEXT}
          </Checkbox>

          <p className="auth-legal">
            By creating an account you agree to our{' '}
            <span className="auth-legal__links">
              <button
                type="button"
                onClick={() => setOpenDoc((d) => (d === 'terms' ? null : 'terms'))}
                aria-expanded={openDoc === 'terms'}
              >
                Terms
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setOpenDoc((d) => (d === 'privacy' ? null : 'privacy'))}
                aria-expanded={openDoc === 'privacy'}
              >
                Privacy Policy
              </button>
            </span>
          </p>

          <div className={`disclosure${openDoc === 'terms' ? ' is-open' : ''}`}>
            <div>
              <p>
                NOVA is a university research prototype. Accounts are for the linked
                course and study only; automated or abusive use of teaching sessions
                may end your access.
              </p>
            </div>
          </div>

          <div className={`disclosure${openDoc === 'privacy' ? ' is-open' : ''}`}>
            <div>
              <p>
                We store your name, email and teaching-session transcripts on the NOVA
                backend for this research project. Results are reported in anonymised
                form only. Passwords are never stored in plain text.
              </p>
            </div>
          </div>
        </div>

        {alertMessage && (
          <p className="auth-alert" role="alert">
            <AlertIcon />
            <span>{alertMessage}</span>
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
            Account created — opening your workspace…
          </p>
        )}

        <AuthButton loading={busy} loadingText="Creating account…" delayMs={500}>
          {role === 'student' ? 'Create Student Account' : 'Create Lecturer Account'}
        </AuthButton>
      </form>

      <AuthFooter
        prompt="Already have an account?"
        action="Sign in"
        href="/login"
        delayMs={540}
      />
    </>
  );
}
