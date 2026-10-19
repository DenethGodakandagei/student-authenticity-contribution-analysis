// app/auth/AuthFooter.tsx
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { delay } from './anim';

export interface AuthFooterProps {
  prompt: string;
  action: string;
  href: '/login' | '/register' | string;
  children?: ReactNode;
  delayMs?: number;
}

/** Switch row between sign-in / registration plus optional legal content. */
export default function AuthFooter({ prompt, action, href, children, delayMs = 0 }: AuthFooterProps) {
  return (
    <div className="auth-foot a-up" style={delay(delayMs)}>
      <p className="auth-foot__switch">
        {prompt}{' '}
        <Link className="link" href={href}>
          {action}
        </Link>
      </p>
      {children}
    </div>
  );
}
