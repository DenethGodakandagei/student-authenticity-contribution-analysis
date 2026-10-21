// app/components/DevNavDrawer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DevNavDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState('a16cc781-3a3f-43ec-911e-20030a4a548e');
  const [customSessionId, setCustomSessionId] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // If the URL has /session/[id], extract it as default
    const match = pathname.match(/\/session\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setSessionId(match[1]);
    }
  }, [pathname]);

  const activeId = customSessionId.trim() || sessionId;

  const routes = [
    {
      category: 'Public & Auth',
      items: [
        { label: 'Landing Page (Home)', href: '/' },
        { label: 'Sign In (Login)', href: '/login' },
        { label: 'Sign Up (Register)', href: '/register' },
      ],
    },
    {
      category: 'Core Views',
      items: [
        { label: 'Student Dashboard', href: '/dashboard' },
        { label: 'Lecturer Dashboard', href: '/lecturer' },
        { label: 'Student Profile', href: '/profile' },
        { label: 'Create New Session (Upload)', href: '/sessions/new' },
      ],
    },
    {
      category: `Active Session (ID: ${activeId.slice(0, 8)}…)`,
      items: [
        { label: 'Teaching Chat Workspace', href: `/session/${activeId}/chat` },
        { label: 'Study Guide', href: `/session/${activeId}/study` },
        { label: 'Pre-Test Diagnostic', href: `/session/${activeId}/pretest` },
        { label: 'Post-Test Diagnostic', href: `/session/${activeId}/posttest` },
        { label: 'Session Details & State', href: `/session/${activeId}/details` },
        { label: 'Learning Evaluation Report', href: `/session/${activeId}/report` },
        { label: 'Session Exam View', href: `/session/${activeId}/exam` },
      ],
    },
  ];

  return (
    <>
      {/* Floating launcher trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Temporary View Navigator"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #0d1110 0%, #1a2e26 100%)',
          color: '#6faf9a',
          border: '1.5px solid #3e8b75',
          borderRadius: '50px',
          padding: '10px 18px',
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#3e8b75',
            boxShadow: '0 0 10px #3e8b75',
          }}
        />
        {isOpen ? '✕ Close Views' : '⚡ All Views Navigator'}
      </button>

      {/* Floating drawer modal */}
      {isOpen && (
        <aside
          style={{
            position: 'fixed',
            bottom: '72px',
            right: '20px',
            width: '360px',
            maxHeight: '82vh',
            overflowY: 'auto',
            background: 'rgba(13, 17, 16, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(111, 175, 154, 0.4)',
            borderRadius: '20px',
            boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
            zIndex: 99998,
            padding: '18px 20px',
            color: '#eff8f3',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '1px solid rgba(111, 175, 154, 0.2)',
              paddingBottom: '10px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  margin: 0,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🗺️</span> View Navigator
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#6faf9a' }}>
                Quick developer jump-bar
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6faf9a',
                fontSize: '1.1rem',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Session ID modifier */}
          <div
            style={{
              marginBottom: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '10px 12px',
              borderRadius: '12px',
              border: '1px solid rgba(111, 175, 154, 0.2)',
            }}
          >
            <label
              htmlFor="dev-session-id"
              style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#6faf9a',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              Session ID target:
            </label>
            <input
              id="dev-session-id"
              type="text"
              placeholder={sessionId}
              value={customSessionId}
              onChange={(e) => setCustomSessionId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(111, 175, 154, 0.3)',
                background: '#070a09',
                color: '#ffffff',
                fontSize: '0.75rem',
                outline: 'none',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Categorized links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {routes.map((group) => (
              <div key={group.category}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#3e8b75',
                    marginBottom: '6px',
                  }}
                >
                  {group.category}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 12px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#0d1110' : '#d2e7de',
                          background: isActive
                            ? '#6faf9a'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isActive
                            ? '1px solid #6faf9a'
                            : '1px solid rgba(111, 175, 154, 0.12)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{item.label}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            opacity: 0.7,
                            fontFamily: 'monospace',
                          }}
                        >
                          {isActive ? 'active' : '→'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
