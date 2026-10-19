// app/auth/RoleCard.tsx
'use client';

import type { ReactNode } from 'react';
import { delay } from './anim';
import type { AuthRole } from './authService';

export interface RoleCardProps {
  role: AuthRole;
  name: string;
  title: string;
  description: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (role: AuthRole) => void;
  delayMs?: number;
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RoleCard({
  role,
  name,
  title,
  description,
  icon,
  checked,
  onChange,
  delayMs = 0,
}: RoleCardProps) {
  return (
    <label
      className={`role-card a-up${checked ? ' is-selected' : ''}`}
      style={delay(delayMs)}
      data-role={role}
    >
      <input
        type="radio"
        name={name}
        value={role}
        checked={checked}
        onChange={() => onChange(role)}
      />
      <span className="role-card__check">
        <CheckIcon />
      </span>
      <span className="role-card__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="role-card__title">{title}</span>
      <span className="role-card__desc">{description}</span>
    </label>
  );
}
