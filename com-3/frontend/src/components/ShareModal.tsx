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
          currentUsername: user?.username || user?.studentId || '',
          targetUserIdentifier: identifier.trim(),
          action
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update document access permissions');
      }

      setSuccessMsg(action === 'remove' ? `Access revoked for ${identifier}` : `Access granted successfully to ${identifier}`);
      setTargetIdentifier('');
      if (onShareUpdated) onShareUpdated(data.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="share-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(5px)'
    }}>
      <div className="share-modal-box" style={{
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '520px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#38bdf8' }}>
              🔒 Document Access & Group Security
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {docDetails?.title || documentId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.5rem'
            }}
          >
            &times;
          </button>
        </div>

        {/* Owner Info */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold' }}>
              Group Leader / Document Owner
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', marginTop: '0.1rem' }}>
              👑 {ownerName}
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', background: '#0284c7', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' }}>
            Private Group
          </span>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.65rem 0.9rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.65rem 0.9rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Add Student Form */}
        <form onSubmit={(e) => handleShare(e, null, 'add')} style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
            Grant Access to Student:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Enter Student ID, Username, or Email"
              value={targetIdentifier}
              onChange={(e) => setTargetIdentifier(e.target.value)}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#fff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.7rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Adding...' : 'Grant Access'}
            </button>
          </div>
        </form>

        {/* Quick Add registered students */}
        {registeredUsers.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Quick Select Registered Students:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '100px', overflowY: 'auto' }}>
              {registeredUsers
                .filter(u => u.username !== user?.username && !allowedUsers.includes(u.username) && !allowedUsers.includes(u.studentId))
                .map(u => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => handleShare(null, u.username, 'add')}
                    style={{
                      background: '#334155',
                      border: '1px solid #475569',
                      color: '#e2e8f0',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
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
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.6rem' }}>
            Members With Permission ({collaborators.length || allowedUsers.length}):
          </div>
          <div style={{
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            padding: '0.5rem',
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
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #1e293b'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>👤</span>
                    <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 500 }}>
                      {collab}
                    </span>
                    {isOwner && (
                      <span style={{ fontSize: '0.7rem', background: '#f59e0b', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                        Owner
                      </span>
                    )}
                  </div>
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => handleShare(null, collab, 'remove')}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
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
  );
}
