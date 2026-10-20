// app/auth/PasswordStrengthIndicator.tsx
'use client';

export interface StrengthResult {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const COLORS = {
  weak: '#B4443C',
  fair: '#B7791F',
  good: '#6FAF9A',
  strong: '#1E4D3E',
} as const;

/** Heuristic 0–4 strength score — never leaves the browser, never stored. */
export function passwordStrength(password: string): StrengthResult {
  if (!password) return { level: 0, label: '', color: COLORS.weak };

  let raw = 0;
  if (password.length >= 8) raw += 1;
  if (password.length >= 12) raw += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) raw += 1;
  if (/\d/.test(password)) raw += 1;
  if (/[^\w\s]/.test(password)) raw += 1;

  if (raw <= 1) return { level: 1, label: 'Weak', color: COLORS.weak };
  if (raw === 2) return { level: 2, label: 'Fair', color: COLORS.fair };
  if (raw === 3 || raw === 4) return { level: 3, label: 'Good', color: COLORS.good };
  return { level: 4, label: 'Strong', color: COLORS.strong };
}

export default function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const { level, label, color } = passwordStrength(password);

  return (
    <div className="strength" data-level={level} style={{ ['--strength-color' as string]: color }}>
      <div className="strength__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="strength__row">
        <span>Password strength</span>
        <span className="strength__label" role="status">
          {label}
        </span>
      </div>
    </div>
  );
}
