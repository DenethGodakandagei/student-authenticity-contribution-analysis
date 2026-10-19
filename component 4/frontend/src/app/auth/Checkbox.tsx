// app/auth/Checkbox.tsx
'use client';

import type { ReactNode } from 'react';

export interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  describedBy?: string;
}

/** Accessible custom checkbox (real input kept for keyboard + screen readers). */
export default function Checkbox({ id, checked, onChange, children, describedBy }: CheckboxProps) {
  return (
    <label className="check" htmlFor={id}>
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="check__box" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="m5 13 4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
