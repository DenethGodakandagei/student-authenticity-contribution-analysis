'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, openAuthModal, authModalOpen, closeAuthModal } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getRoleLabel = () => {
    if (!user) return 'Student Node';
    if (user.role === 'lecturer') return 'Lecturer Node';
    if (user.role === 'group_leader' || user.isLeader) return 'Leader Node';
    return 'Student Node';
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Editor', href: '/editor' },
    { label: 'Integrations', href: '/integrations' }
  ];

  return (
    <div className="app-layout">
      {/* Top Navigation Bar matching Component 1 design */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '0.65rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Left: Brand, Node Pill, Telemetry Simulator / Editor Pill, and Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <div style={{
              background: '#121417',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              &lt;/&gt;
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              DocuTrace
            </span>
          </Link>

          {/* Node Role Pill */}
          <span style={{
            background: 'rgba(163, 230, 53, 0.16)',
            color: '#275306',
            border: '1px solid rgba(163, 230, 53, 0.35)',
            padding: '0.22rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            letterSpacing: '0.01em'
          }}>
            {getRoleLabel()}
          </span>

          {/* Quick Pill Button: Telemetry Simulator / Editor */}
          <Link
            href="/editor"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>&gt;_</span> Document Editor
          </Link>

          {/* Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#275306' : '#64748b',
                    background: isActive ? 'rgba(163, 230, 53, 0.16)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User Avatar, Profile, and Sign In/Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {!mounted ? (
            <div style={{ width: '120px', height: '36px', background: '#f1f5f9', borderRadius: '8px' }} />
          ) : isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#121417',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}>
                  {(user.name || user.username || 'U')[0].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                    {user.name || user.username}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {user.email || user.studentId || 'Student'}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'transparent',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <span>[→</span> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              style={{
                background: '#a3e635',
                color: '#121417',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(163, 230, 53, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#8ee01d';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#a3e635';
              }}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </div>
  );
}
