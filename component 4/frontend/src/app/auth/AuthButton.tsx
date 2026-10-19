// app/auth/AuthButton.tsx
'use client';

import type { ReactNode } from 'react';
import { delay } from './anim';

export interface AuthButtonProps {
  children: ReactNode;
  type?: 'button' | 'submit';
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
  delayMs?: number;
}

export default function AuthButton({
  children,
  type = 'submit',
  loading = false,
  loadingText,
  disabled,
  variant = 'solid',
  delayMs = 0,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`auth-btn a-up${variant === 'ghost' ? ' auth-btn--ghost' : ''}`}
      style={delay(delayMs)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading && <span className="auth-btn__spinner" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
