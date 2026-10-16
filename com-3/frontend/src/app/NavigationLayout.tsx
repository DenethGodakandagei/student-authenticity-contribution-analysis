'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, openAuthModal, authModalOpen, closeAuthModal } = useAuth();

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h2>DocAnalytics</h2>

        <div style={{
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '1rem',
          margin: '0.5rem 0 1.5rem 0',
          textAlign: 'left'
        }}>
          {isAuthenticated ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Account
                </span>
                <span style={{ fontSize: '0.68rem', background: '#0D9488', color: '#FFFFFF', padding: '0.15rem 0.45rem', borderRadius: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {user?.role || 'Student'}
                </span>
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFFFFF' }}>
                {user?.name || user?.username}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#38BDF8', marginBottom: '0.75rem' }}>
                ID: {user?.studentId || 'N/A'}
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#FCA5A5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                Sign in to verify student authorship & track group evolution.
              </div>
              <button
                onClick={openAuthModal}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        <div className="nav-links">
          <Link href="/editor" className="nav-link">Collaborative Editor</Link>
          <Link href="/integrations" className="nav-link">External Integrations</Link>
          <Link href="/dashboard" className="nav-link">Lecturer Dashboard</Link>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </div>
  );
}
