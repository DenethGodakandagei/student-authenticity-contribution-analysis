"use client";

import React from 'react';

interface GuestDashboardViewProps {
  onSignIn: () => void;
}

export default function GuestDashboardView({ onSignIn }: GuestDashboardViewProps) {
  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '2.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem',
      color: '#0f172a'
    }}>
      {/* 1. Security Disclaimer Banner */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.06)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.84rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
          }} />
          <span style={{ color: '#991b1b', fontWeight: 700 }}>
            Restricted Access:
          </span>
          <span style={{ color: '#7f1d1d' }}>
            Unauthenticated visitors cannot view coursework, student identities, or revision telemetry.
          </span>
        </div>
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          background: '#991b1b',
          color: '#ffffff',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          Authentication Required
        </span>
      </div>

      {/* 2. Hero Presentation Card (Light Theme) */}
      <div style={{
        background: 'linear-gradient(135deg, #EFF8F3 0%, #FFFFFF 100%)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        color: '#0D1110',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1.25rem',
        boxShadow: '0 8px 30px rgba(13, 17, 16, 0.05)',
        border: '1px solid rgba(111, 175, 154, 0.35)'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid rgba(111, 175, 154, 0.4)',
          color: '#225243',
          padding: '0.35rem 0.95rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 1px 3px rgba(111, 175, 154, 0.15)'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6FAF9A', boxShadow: '0 0 6px #6FAF9A' }} />
          Inkie Academic Repository
        </div>

        <h1 style={{
          margin: 0,
          fontSize: '2.35rem',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
          maxWidth: '780px',
          color: '#0D1110'
        }}>
          Student Authenticity &amp; Contribution Analysis Platform
        </h1>

        <p style={{
          margin: 0,
          fontSize: '0.96rem',
          color: '#43574f',
          maxWidth: '650px',
          lineHeight: 1.6
        }}>
          Please sign in to access your assigned coursework, participate in collaborative drafting sessions with keystroke telemetry, or evaluate student revision forensics.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            id="guest-signin-btn"
            type="button"
            onClick={onSignIn}
            style={{
              background: '#6FAF9A',
              color: '#0D1110',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.85rem 2.25rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(111, 175, 154, 0.35)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
            onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
          >
            Sign In / Register &rarr;
          </button>
        </div>
      </div>

      {/* 3. Role-Based Access Architecture (3 Cards) */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            Strict Role-Based Access Isolation
          </h2>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Course materials, submissions, and telemetry data are segregated by assigned academic roles.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Card 1: Student Workspace */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#15803d',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                Student Node
              </span>
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>Assigned Scope</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Relevant Assignments Only
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.55 }}>
              Students only see documents they own or have been invited to collaborate on as a team member. Other cohorts or peer assignments remain completely private and unexposed.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Collaborative editor with keystroke logging</li>
              <li>Organic typing vs. bulk paste detection</li>
              <li>Individual and group submission workflow</li>
            </ul>
          </div>

          {/* Card 2: Lecturer Supervision */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#4f46e5',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                Lecturer Node
              </span>
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>Supervisory Scope</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Assignment Creation &amp; Evaluation
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.55 }}>
              Lecturers publish structured assignments for student cohorts, inspect student submissions without access barriers, view multi-author heatmaps, and grade authentic contributions.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Create individual and group assignments</li>
              <li>Multi-author contribution heatmaps</li>
              <li>Direct grading, viva flags, and feedback</li>
            </ul>
          </div>

          {/* Card 3: Administrator Console */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                background: 'rgba(217, 119, 6, 0.1)',
                color: '#d97706',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                Administrator Node
              </span>
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>Superuser Scope</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Unrestricted Superuser Registry
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.55 }}>
              Administrators hold full access to all documents across the platform without permission restrictions, can edit any document in the editor, inspect forensics, and manage user accounts.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>View and edit all platform documents</li>
              <li>Role management and permission assignment</li>
              <li>Platform-wide forensic inspection &amp; audit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Platform Security Trust Bar */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.82rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          <span>Keystroke Telemetry &amp; Anomaly Classification Active</span>
        </div>
        <div>
          Institutional Academic Integrity Engine &bull; Real-Time Evolution Pipeline
        </div>
      </div>
    </div>
  );
}
