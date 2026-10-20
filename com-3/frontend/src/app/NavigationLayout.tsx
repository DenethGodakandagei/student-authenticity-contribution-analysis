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
    if (!user) return 'Guest';
    if (user.role === 'admin') return 'System Administrator Node';
    if (user.role === 'lecturer') return 'Lecturer / Academic Evaluator';
    if (user.role === 'group_leader' || user.isLeader) return 'Group Leader Node';
    return 'Student Node';
  };

  const isAdmin = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';
  const isLeader = user?.role === 'group_leader' || user?.isLeader;

  const navItems = !user
    ? [
        { label: 'Platform Home', href: '/dashboard' }
      ]
    : isAdmin
    ? [
        { label: 'Admin Dashboard', href: '/dashboard' },
        { label: 'Document Editor', href: '/editor' }
      ]
    : isLecturer
    ? [
        { label: 'Academic Evaluation Dashboard', href: '/dashboard' }
      ]
    : [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Document Editor', href: '/editor' },
        { label: 'Integrations', href: '/integrations' }
      ];

  return (
    <div className="app-layout">
      {/* Top Navigation Bar matching Component 1 design */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid rgba(111, 175, 154, 0.25)',
        padding: '0.65rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(13, 17, 16, 0.03)'
      }}>
        {/* Left: Brand, Node Pill, Telemetry Simulator / Editor Pill, and Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <div style={{
              background: '#0D1110',
              color: '#6FAF9A',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#0D1110',
              letterSpacing: '-0.02em'
            }}>
              Inkie
            </span>
          </Link>

          {/* Node Role Pill */}
          <span style={{
            background: isAdmin ? 'rgba(217, 119, 6, 0.14)' : isLecturer ? 'rgba(111, 175, 154, 0.18)' : isLeader ? 'rgba(111, 175, 154, 0.22)' : user ? '#EFF8F3' : '#EFF8F3',
            color: isAdmin ? '#b45309' : isLecturer ? '#225243' : isLeader ? '#0D1110' : user ? '#225243' : '#43574f',
            border: `1px solid ${isAdmin ? 'rgba(217, 119, 6, 0.35)' : 'rgba(111, 175, 154, 0.35)'}`,
            padding: '0.22rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            letterSpacing: '0.01em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            {isAdmin && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />}
            {isLecturer && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6FAF9A' }} />}
            {getRoleLabel()}
          </span>

          {/* Quick Pill Button: Telemetry Simulator / Editor (Student and Admin view only when logged in) */}
          {Boolean(user && !isLecturer) && (
            <Link
              href="/editor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#EFF8F3',
                border: '1px solid rgba(111, 175, 154, 0.3)',
                color: '#0D1110',
                padding: '0.35rem 0.9rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ color: '#6FAF9A' }}>&gt;_</span> Document Editor
            </Link>
          )}

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
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? '#0D1110' : '#43574f',
                    background: isActive ? '#EFF8F3' : 'transparent',
                    border: isActive ? '1px solid rgba(111, 175, 154, 0.35)' : '1px solid transparent',
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
            <div style={{ width: '120px', height: '36px', background: '#EFF8F3', borderRadius: '8px' }} />
          ) : isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#0D1110',
                  color: '#6FAF9A',
                  border: '1px solid rgba(111, 175, 154, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}>
                  {(user.name || user.username || 'U')[0].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0D1110' }}>
                    {user.name || user.username}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#43574f' }}>
                    {user.email || user.studentId || 'Student'}
                  </span>
                </div>
              </div>

              <button
                id="logout-btn"
                type="button"
                onClick={logout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'transparent',
                  border: '1px solid rgba(111, 175, 154, 0.3)',
                  color: '#43574f',
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
                  e.currentTarget.style.borderColor = 'rgba(111, 175, 154, 0.3)';
                  e.currentTarget.style.color = '#43574f';
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              id="signin-btn"
              type="button"
              onClick={openAuthModal}
              style={{
                background: '#6FAF9A',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(111, 175, 154, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#5d9d88';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#6FAF9A';
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
