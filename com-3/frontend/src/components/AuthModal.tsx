"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Registration specific fields
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(identifier, password);
      } else {
        await register({
          username,
          name,
          studentId,
          email,
          password,
          role,
        });
      }
      if (onClose) onClose();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (loginMode: boolean) => {
    setError('');
    setIsLoginMode(loginMode);
  };

  return (
    <div
      className="login-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)', // Reduced black darkness
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1.25rem'
      }}
    >
      <div
        className="login-box"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          maxWidth: isLoginMode ? '420px' : '520px',
          width: '100%',
          padding: '2rem 2.25rem',
          position: 'relative',
          textAlign: 'left',
          boxSizing: 'border-box',
          transition: 'max-width 0.25s ease'
        }}
      >
        {/* Top Bar: Brand Badge & Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0D1110',
              color: '#6FAF9A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1rem',
              boxShadow: '0 2px 6px rgba(13,17,16,0.1)'
            }}>
              I
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0D1110', letterSpacing: '-0.02em' }}>
              Inkie
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              type="button"
              title="Close modal"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                fontSize: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                lineHeight: 1
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#f1f5f9',
          padding: '0.3rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => toggleMode(true)}
            style={{
              padding: '0.55rem',
              borderRadius: '7px',
              border: 'none',
              background: isLoginMode ? '#ffffff' : 'transparent',
              color: isLoginMode ? '#0f172a' : '#64748b',
              fontWeight: isLoginMode ? 800 : 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: isLoginMode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => toggleMode(false)}
            style={{
              padding: '0.55rem',
              borderRadius: '7px',
              border: 'none',
              background: !isLoginMode ? '#ffffff' : 'transparent',
              color: !isLoginMode ? '#0f172a' : '#64748b',
              fontWeight: !isLoginMode ? 800 : 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: !isLoginMode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Modal Titles */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
            {isLoginMode ? 'Welcome Back' : 'Register Platform Account'}
          </h2>
          <p style={{ margin: '0.3rem 0 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.4 }}>
            {isLoginMode
              ? 'Access real-time document collaboration and authenticity telemetry.'
              : 'Join as a Student Member, Group Leader, or Academic Reviewer.'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#b91c1c',
            padding: '0.65rem 0.9rem',
            borderRadius: '9px',
            fontSize: '0.82rem',
            marginBottom: '1.25rem',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isLoginMode ? (
            /* ================= LOGIN FORM ================= */
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Username, Student ID, or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rashi or IT23217522"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#121417';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#121417';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </>
          ) : (
            /* ================= REGISTER FORM ================= */
            <>
              {/* Row 1: Full Name & Username */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rashi Sansala"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '0.86rem',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#121417';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rashi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '0.86rem',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#121417';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Student ID & Platform Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    Student / Staff ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT23217522"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '0.86rem',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#121417';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    Platform Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#121417';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="student">Student Member</option>
                    <option value="group_leader">Group Leader</option>
                    <option value="lecturer">Lecturer / Staff</option>
                    <option value="admin">System Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rashi@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#121417';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Row 4: Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#121417';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(163, 230, 53, 0.25)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.4rem',
              width: '100%',
              height: '46px',
              borderRadius: '10px',
              border: 'none',
              background: '#6FAF9A', // Primary Sage
              color: '#ffffff',     // White
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(111, 175, 154, 0.35)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.75 : 1
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.background = '#5d9d88';
            }}
            onMouseOut={(e) => {
              if (!loading) e.currentTarget.style.background = '#6FAF9A';
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : isLoginMode ? (
              <span>Sign In & Open Dashboard &rarr;</span>
            ) : (
              <span>Register & Open Dashboard &rarr;</span>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          {isLoginMode ? "Don't have an account yet?" : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={() => toggleMode(!isLoginMode)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0f172a',
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
          >
            {isLoginMode ? 'Create one here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
}
