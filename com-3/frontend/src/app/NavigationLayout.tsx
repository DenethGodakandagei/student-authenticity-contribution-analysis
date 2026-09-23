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
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.85rem',
          margin: '0.5rem 0 1.5rem 0',
          textAlign: 'left'
        }}>
          {isAuthenticated ? (
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                Logged In As ({user?.role})
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#f8fafc', marginTop: '0.2rem' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '0.6rem' }}>
                ID: {user?.studentId}
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.6rem' }}>
                Not authenticated. Sign in to edit & track your document.
              </div>
              <button
                onClick={openAuthModal}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  cursor: 'pointer'
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
