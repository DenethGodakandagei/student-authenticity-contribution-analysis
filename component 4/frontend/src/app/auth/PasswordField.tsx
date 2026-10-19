// app/auth/PasswordField.tsx
'use client';

import { useState } from 'react';

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  delayMs?: number;
  /** Rendered directly below the input — used for the strength meter. */
  after?: React.ReactNode;
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6.2 5.5 12 5.5 21.5 12 21.5 12 17.8 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      {!open && (
        <path
          d="M4 4l16 16"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required,
  disabled,
  delayMs = 0,
  after,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const invalid = Boolean(error);
  const describedBy =
    [hint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={`field a-up${invalid ? ' has-error' : ''}`} style={{ '--d': `${delayMs}ms` } as React.CSSProperties}>
      <label className="field__label" htmlFor={id}>
        <span>{label}</span>
      </label>

      <div className="field__wrap">
        <input
          id={id}
          name={id}
          className="field__control"
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <EyeIcon open={visible} />
        </button>
      </div>

      {after}

      {hint && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}

      <p className="field__msg" id={`${id}-error`} aria-live="polite">
        <span>{error ?? ''}</span>
      </p>
    </div>
  );
}
