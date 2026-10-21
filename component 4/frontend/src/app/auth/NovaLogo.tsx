// app/auth/NovaLogo.tsx
'use client';

interface NovaLogoProps {
  size?: number;
  tagline?: boolean;
  className?: string;
}

/** The NOVA mark: an "N" cut from a node path with a cyan knowledge node. */
export function NovaMark({ size = 38 }: { size?: number }) {
  return (
    <svg
      className="nova-logo__mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="novaMarkGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A3D4C4" />
          <stop offset="45%" stopColor="#6FAF9A" />
          <stop offset="100%" stopColor="#1E4D3E" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9.5" fill="url(#novaMarkGrad)" />
      <rect
        x="0.6"
        y="0.6"
        width="30.8"
        height="30.8"
        rx="9"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.2"
      />
      <path
        d="M9.5 22.5V10.2c0-.6.75-.9 1.16-.44L21.6 21.9"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 10v12.3"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <circle cx="22.5" cy="9.4" r="3.4" fill="#C2EBDD" />
      <circle cx="9.5" cy="22.7" r="2.1" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

export default function NovaLogo({ size = 38, className }: NovaLogoProps) {
  return (
    <span
      className={className ? `nova-logo ${className}` : 'nova-logo'}
      style={{
        ['--mark-size' as string]: `${Math.max(size * 0.42, 14)}px`,
        textDecoration: 'none',
      }}
    >
      <NovaMark size={size} />
      <span
        style={{
          color: '#000000',
          fontWeight: 800,
          textDecoration: 'none',
          letterSpacing: '0.12em',
          fontSize: '1.15rem',
        }}
      >
        NOVA
      </span>
    </span>
  );
}
