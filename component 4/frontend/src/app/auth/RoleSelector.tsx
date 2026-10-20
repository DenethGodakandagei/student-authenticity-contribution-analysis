// app/auth/RoleSelector.tsx
'use client';

import RoleCard from './RoleCard';
import { delay } from './anim';
import type { AuthRole } from './authService';

function GraduationCapIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4 2.5 8.6 12 13.2l9.5-4.6L12 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.8v4.4c0 1.5 2.5 2.9 5.5 2.9s5.5-1.4 5.5-2.9v-4.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M21.5 8.6v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LecturerIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M7.5 8.5h6M7.5 12h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 16v3m-3.5 0h7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="11.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

export const ROLE_OPTIONS: Record<
  AuthRole,
  { title: string; description: string; short: string }
> = {
  student: {
    short: 'Student',
    title: "I'm a Student",
    description:
      'Learn by teaching NOVA and discover how well you understand your subjects.',
  },
  lecturer: {
    short: 'Lecturer',
    title: "I'm a Lecturer",
    description:
      'Prepare learning materials and support students through AI-powered learning activities.',
  },
};

export interface RoleSelectorProps {
  /** null means nothing selected yet (initial state). */
  value: AuthRole | null;
  onChange: (role: AuthRole) => void;
  name: string;
  variant?: 'cards' | 'segmented';
  delayMs?: number;
}

export default function RoleSelector({
  value,
  onChange,
  name,
  variant = 'cards',
  delayMs = 0,
}: RoleSelectorProps) {
  if (variant === 'segmented') {
    return (
      <div
        className="seg a-up"
        data-value={value ?? ''}
        role="radiogroup"
        aria-label="Choose the account you are signing in with"
        style={delay(delayMs)}
      >
        <span className="seg__pill" aria-hidden="true" />
        {(['student', 'lecturer'] as const).map((role) => (
          <label className="seg__opt" key={role}>
            <input
              type="radio"
              name={name}
              value={role}
              checked={value === role}
              onChange={() => onChange(role)}
            />
            {role === 'student' ? <GraduationCapIcon /> : <LecturerIcon />}
            {ROLE_OPTIONS[role].short}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div
      className="roles"
      role="radiogroup"
      aria-label="Choose your role"
      style={delay(delayMs)}
    >
      <RoleCard
        role="student"
        name={name}
        title={ROLE_OPTIONS.student.title}
        description={ROLE_OPTIONS.student.description}
        icon={<GraduationCapIcon />}
        checked={value === 'student'}
        onChange={onChange}
        delayMs={delayMs}
      />
      <RoleCard
        role="lecturer"
        name={name}
        title={ROLE_OPTIONS.lecturer.title}
        description={ROLE_OPTIONS.lecturer.description}
        icon={<LecturerIcon />}
        checked={value === 'lecturer'}
        onChange={onChange}
        delayMs={delayMs + 90}
      />
    </div>
  );
}
