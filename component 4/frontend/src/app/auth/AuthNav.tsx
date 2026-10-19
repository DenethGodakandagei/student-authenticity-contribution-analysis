// app/auth/AuthNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NovaLogo from './NovaLogo';
import { delay } from './anim';

const LINKS = [
  { href: '/', label: 'Home', className: 'auth-nav__link auth-nav__link--home' },
  { href: '/login', label: 'Sign in', className: 'auth-nav__link' },
  { href: '/register', label: 'Create account', className: 'auth-nav__link' },
] as const;

/** Top navigation bar shared by the auth screens. Logo sits on the left. */
export default function AuthNav() {
  const pathname = usePathname();

  return (
    <nav className="auth-nav a-up" style={delay(20)} aria-label="Primary">
      <div className="auth-nav__left">
        <Link className="auth-nav__brand" href="/" aria-label="NOVA — home">
          <NovaLogo size={36} tagline />
        </Link>
        
      </div>

      <div className="auth-nav__links">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={link.className}
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
