"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBackendUrl } from '../utils/apiConfig';

export default function ShareModal({ isOpen, onClose, documentId, docDetails, onShareUpdated }: any) {
  const { user } = useAuth();
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const ownerName = docDetails?.ownerName || docDetails?.owner || 'Group Leader';
  const allowedUsers = docDetails?.allowedUsers || [];
  const collaborators = docDetails?.collaborators || [];

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      fetch(`${getBackendUrl()}/api/auth/users`)
        .then(res => res.json())
        .then(data => setRegisteredUsers(data || []))
        .catch(err => console.error("Failed to load registered users", err));
    }
  }, [isOpen]);

  if (!isOpen || !documentId) return null;

  const handleShare = async (e: any, identifierToShare: string | null = null, action: string = 'add') => {
    if (e) e.preventDefault();
    const identifier = identifierToShare || targetIdentifier;

    if (!identifier || !identifier.trim()) {
      setError('Please enter or select a Student ID, Username, or Email.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${getBackendUrl()}/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUsername: user?.username || '',
          currentStudentId: user?.studentId || '',
          currentUserEmail: user?.email || '',
          currentRole: user?.role || '',
          targetUserIdentifier: identifier.trim(),
          action
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update document access permissions');
      }

      setSuccessMsg(action === 'remove' ? `Access revoked for "${identifier}"` : `Access granted successfully to "${identifier}"`);
      setTargetIdentifier('');
      if (onShareUpdated) onShareUpdated(data.document);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(6px)',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        maxWidth: '540px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(30, 58, 138, 0.22)',
        color: '#0F172A',
        overflow: 'hidden'
      }}>
        {/* Deep Navy Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
          padding: '1.25rem 1.75rem',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                Document Access & Security
              </h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#BFDBFE', marginTop: '0.2rem', display: 'block' }}>
              {docDetails?.title || documentId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#FFFFFF',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '1.5rem 1.75rem' }}>
          {/* Owner Info Card */}
          <div style={{
            background: '#F0FDFA',
            border: '1px solid #CCFBF1',
            borderRadius: '10px',
            padding: '0.85rem 1.15rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0D9488', fontWeight: 700, letterSpacing: '0.04em' }}>
                Group Leader / Document Owner
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E3A8A', marginTop: '0.15rem' }}>
                {ownerName}
              </div>
            </div>
            <span style={{
              fontSize: '0.75rem',
              background: '#0D9488',
              color: '#FFFFFF',
              padding: '0.25rem 0.65rem',
              borderRadius: '12px',
              fontWeight: 700
            }}>
              Private Group
            </span>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FEE2E2',
              color: '#991B1B',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #DCFCE7',
              color: '#166534',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {successMsg}
            </div>
          )}

          {/* Add Student Form */}
          <form onSubmit={(e) => handleShare(e, null, 'add')} style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
              Grant Access to Collaborator:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter Student ID / IT Number, Username, or Email (e.g. IT23217522)"
                value={targetIdentifier}
                onChange={(e) => setTargetIdentifier(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                  fontSize: '0.9rem',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => (e.target.style.borderColor = '#4F46E5')}
                onBlur={e => (e.target.style.borderColor = '#CBD5E1')}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.7rem 1.35rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? 'Adding...' : 'Grant Access'}
              </button>
            </div>
          </form>

          {/* Quick Select registered students */}
          {registeredUsers.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginBottom: '0.45rem' }}>
                Quick Add Registered Students:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '90px', overflowY: 'auto' }}>
                {registeredUsers
                  .filter(u => u.username !== user?.username && !allowedUsers.includes(u.username) && !allowedUsers.includes(u.studentId))
                  .map(u => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => handleShare(null, u.username, 'add')}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#EEF2FF';
                        e.currentTarget.style.borderColor = '#A5B4FC';
                        e.currentTarget.style.color = '#4F46E5';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.color = '#334155';
                      }}
                    >
                      + {u.name} ({u.studentId})
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Permitted Group Members */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Active Authorized Members ({collaborators.length || allowedUsers.length}):
            </div>
            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '0.4rem',
              maxHeight: '160px',
              overflowY: 'auto'
            }}>
              {(collaborators.length > 0 ? collaborators : allowedUsers).map(collab => {
                const isOwner = collab.includes(ownerName) || collab === ownerName;
                return (
                  <div
                    key={collab}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      marginBottom: '0.3rem',
                      border: '1px solid #F1F5F9'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 600 }}>
                        {collab}
                      </span>
                      {isOwner && (
                        <span style={{
                          fontSize: '0.7rem',
                          background: '#FEF3C7',
                          color: '#B45309',
                          border: '1px solid #FDE68A',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '10px',
                          fontWeight: 700
                        }}>
                          Owner
                        </span>
                      )}
                    </div>
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => handleShare(null, collab, 'remove')}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
