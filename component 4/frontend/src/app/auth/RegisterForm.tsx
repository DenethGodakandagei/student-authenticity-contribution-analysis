// app/auth/RegisterForm.tsx
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
import { destinationFor, register, type AuthRole } from './authService';
import {
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  subscribeAuth,
} from '../utils/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads the role the API stored on the signed-in user. */
function storedRole(): AuthRole | undefined {
  const raw = getStoredUserRaw();
  if (!raw) return undefined;
  try {
    const role = (JSON.parse(raw) as { role?: string }).role;
    return role === 'student' || role === 'lecturer' ? role : undefined;
  } catch {
    return undefined;
  }
}

interface RegisterErrors {
  role?: string;
  name?: string;
  email?: string;
  lecturerCode?: string;
  password?: string;
  confirm?: string;
  consent?: string;
}

function validate(values: {
  role: AuthRole | null;
  name: string;
  email: string;
  password: string;
  confirm: string;
  consent: boolean;
  lecturerCode: string;
}): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!values.role) errors.role = 'Please select Student or Lecturer.';

  const name = values.name.trim();
  const email = values.email.trim();

  if (!name) errors.name = 'Enter your full name.';
  else if (name.length < 2) errors.name = 'That name looks too short.';

  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  if (values.role === 'lecturer') {
    if (!values.lecturerCode.trim()) {
      errors.lecturerCode = 'Enter the lecturer access code.';
    }
  }

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

  // null = nothing selected yet (user must pick before submitting)
  const [role, setRole] = useState<AuthRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [lecturerCode, setLecturerCode] = useState('');
  const [consent, setConsent] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | null>(null);

  const skipAutoRedirect = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Already logged-in → send to their role's home.
  useEffect(() => {
    if (token && !skipAutoRedirect.current) {
      router.replace(destinationFor(storedRole() ?? 'student'));
    }
  }, [token, router]);

  useEffect(() => () => void (timerRef.current && window.clearTimeout(timerRef.current)), []);

  const errors = validate({ role, name, email, password, confirm, consent, lecturerCode });
  const errorFor = (key: keyof RegisterErrors) =>
    submitted || touched[key] ? errors[key] : undefined;

  const handleRoleChange = (next: AuthRole) => {
    setRole(next);
    setServerError('');
    // clear lecturer code when switching away from lecturer
    if (next !== 'lecturer') setLecturerCode('');
  };

  const focusFirstError = (current: RegisterErrors) => {
    if (current.role) {
      const el = document.querySelector<HTMLElement>('input[name="register-role"]');
      el?.focus();
      return;
    }
    const order: Array<[keyof RegisterErrors, string]> = [
      ['name', 'reg-name'],
      ['email', 'reg-email'],
      ['lecturerCode', 'reg-lecturer-code'],
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
    const current = validate({ role, name, email, password, confirm, consent, lecturerCode });
    if (Object.values(current).some(Boolean)) {
      focusFirstError(current);
      return;
    }

    // role is guaranteed non-null here (validated above)
    const chosenRole = role!;

    setBusy(true);
    skipAutoRedirect.current = true;
    const outcome = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      role: chosenRole,
      identifier: '',
      lecturer_code: chosenRole === 'lecturer' ? lecturerCode.trim() : undefined,
      consent,
    });
    setBusy(false);

    if (!outcome.ok) {
      skipAutoRedirect.current = false;
      setServerError(outcome.error);
      return;
    }

    setSuccess(true);
    // Always redirect to the role the SERVER returned — not the UI selection.
    timerRef.current = window.setTimeout(
      () => router.push(destinationFor(outcome.role)),
      750
    );
  };

  const roleError = submitted ? errors.role : undefined;
  const alertMessage = serverError || (submitted && errors.consent ? errors.consent : '');

  return (
    <>
      <header className="auth-head">
        <p className="auth-kicker a-up" style={delay(40)}>
          {role === 'lecturer' ? 'Lecturer account' : 'Student account'}
        </p>
        <h1 className="auth-title a-up" style={delay(95)}>
          Create your account
        </h1>
      </header>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="a-up" style={delay(180)}>
          <RoleSelector
            value={role}
            onChange={handleRoleChange}
            name="register-role"
            variant="segmented"
            delayMs={0}
          />
          {roleError && (
            <p className="auth-alert" role="alert" style={{ marginTop: '0.5rem' }}>
              <AlertIcon />
              <span>{roleError}</span>
            </p>
          )}
        </div>

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

        {role === 'lecturer' && (
          <FormField
            id="reg-lecturer-code"
            label="Lecturer Access Code"
            type="password"
            value={lecturerCode}
            onChange={(value) => {
              setLecturerCode(value);
              setServerError('');
            }}
            onBlur={() => setTouched((t) => ({ ...t, lecturerCode: true }))}
            placeholder="Enter lecturer code provided by institution"
            autoComplete="off"
            error={errorFor('lecturerCode')}
            hint="Required to verify educator credentials."
            delayMs={295}
          />
        )}

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
          {role === 'lecturer' ? 'Create Lecturer Account' : 'Create Student Account'}
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
