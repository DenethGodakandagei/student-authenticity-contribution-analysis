// app/auth/AuthLayout.tsx
'use client';

import type { ReactNode } from 'react';
import './auth.css';
import NovaBrandPanel from './NovaBrandPanel';
import { delay } from './anim';

export interface AuthLayoutProps {
  mode: 'login' | 'register' | 'info';
  children: ReactNode;
}

const PANE_LABEL: Record<AuthLayoutProps['mode'], string> = {
  login: 'Sign in to NOVA',
  register: 'Create your NOVA account',
  info: 'NOVA account information',
};

/** Deterministic ambient particles (fixed values keep SSR markup stable). */
const PARTICLES = [
  { left: '12%', top: '18%', size: 3, dur: 6.5, d: 0 },
  { left: '26%', top: '72%', size: 2, dur: 8, d: 900 },
  { left: '44%', top: '12%', size: 2, dur: 7, d: 1800 },
  { left: '58%', top: '80%', size: 3, dur: 9, d: 400 },
  { left: '72%', top: '24%', size: 2, dur: 7.5, d: 2400 },
  { left: '84%', top: '66%', size: 2, dur: 8.5, d: 1200 },
  { left: '34%', top: '44%', size: 2, dur: 6, d: 3000 },
  { left: '90%', top: '38%', size: 3, dur: 7.8, d: 600 },
] as const;

/** Full-screen animated backdrop (orbs, particles, constellation). */
function AuthFx() {
  return (
    <div className="auth-fx" aria-hidden="true">
      <span className="orb orb--violet" style={{ ['--d' as string]: '-2s' }} />
      <span className="orb orb--indigo" style={{ ['--d' as string]: '-6s' }} />
      <span className="orb orb--cyan" style={{ ['--d' as string]: '-11s' }} />

      <span className="particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={
              {
                left: p.left,
                top: p.top,
                '--size': `${p.size}px`,
                '--dur': `${p.dur}s`,
                '--d': `${p.d}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>

      <svg
        className="brand-links"
        viewBox="0 0 800 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="novaLinkGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#5ee7f5" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          className="brand-links__line"
          d="M40 500 L200 400 L340 470 L500 340 L660 400 L770 300"
          stroke="url(#novaLinkGrad)"
          strokeWidth="1.3"
          strokeDasharray="7 12"
        />
        <circle className="brand-links__node" cx="200" cy="400" r="4.5" fill="#a08cff" />
        <circle
          className="brand-links__node"
          cx="500"
          cy="340"
          r="4.5"
          fill="#5ee7f5"
          style={{ animationDelay: '1.4s' }}
        />
        <circle
          className="brand-links__node"
          cx="770"
          cy="300"
          r="4.5"
          fill="#a08cff"
          style={{ animationDelay: '2.6s' }}
        />
      </svg>
    </div>
  );
}

/** Split-shell auth layout: shared nav lives in the root layout. */
export default function AuthLayout({ mode, children }: AuthLayoutProps) {
  return (
    <main className="auth-page" data-mode={mode}>
      <AuthFx />
      <NovaBrandPanel />

      <section className="auth-pane" aria-label={PANE_LABEL[mode]}>
        <div className="auth-pane__inner">
          <div className="auth-card">{children}</div>
          <p className="pane-foot a-up" style={delay(260)}>
            Learn deeper by teaching smarter.
          </p>
        </div>
      </section>
    </main>
  );
}
