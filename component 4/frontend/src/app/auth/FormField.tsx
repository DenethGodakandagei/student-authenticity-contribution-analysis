// app/auth/FormField.tsx
'use client';

import type { ReactNode } from 'react';
import { delay } from './anim';

export interface FormFieldProps {
  id: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'numeric' | 'search' | 'tel' | 'url';
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  optionalLabel?: string;
  error?: string;
  hint?: string;
  delayMs?: number;
  /** Replace the default input with a custom control (e.g. password + toggle). */
  children?: ReactNode;
}

export default function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  required,
  disabled,
  maxLength,
  optionalLabel,
  error,
  hint,
  delayMs = 0,
  children,
}: FormFieldProps) {
  const invalid = Boolean(error);
  const describedBy =
    [hint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={`field a-up${invalid ? ' has-error' : ''}`} style={delay(delayMs)}>
      <label className="field__label" htmlFor={id}>
        <span>{label}</span>
        {optionalLabel && <span className="field__optional">{optionalLabel}</span>}
      </label>

      <div className="field__wrap">
        {children ?? (
          <input
            id={id}
            name={id}
            className="field__control"
            type={type}
            value={value ?? ''}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange?.(event.target.value)}
            onBlur={onBlur}
          />
        )}
      </div>

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
