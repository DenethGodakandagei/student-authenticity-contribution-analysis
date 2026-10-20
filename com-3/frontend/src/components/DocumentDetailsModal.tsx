"use client";

import React from 'react';

interface DocumentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  docDetails: any;
  editor: any;
  revisionsCount?: number;
  collaborators?: string[];
}

export default function DocumentDetailsModal({
  isOpen,
  onClose,
  docDetails,
  editor,
  revisionsCount = 0,
  collaborators = []
}: DocumentDetailsModalProps) {
  if (!isOpen) return null;

  const text = editor ? editor.getText() : '';
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s+/g, '').length;
  const paragraphs = text.split(/\n+/).filter((p: string) => p.trim().length > 0).length || (text.trim() ? 1 : 0);
  const readingTimeMin = Math.ceil(words / 200) || 1;

  const sourceName = docDetails?.source === 'google_docs'
    ? 'Google Docs'
    : docDetails?.source === 'microsoft_365'
    ? 'Microsoft Word 365'
    : 'Inkie Native Document';

  const sourceIcon = docDetails?.source === 'google_docs' ? (
    <span style={{ color: '#4285F4', fontWeight: 'bold' }}>📄 Google Docs</span>
  ) : docDetails?.source === 'microsoft_365' ? (
    <span style={{ color: '#0078D4', fontWeight: 'bold' }}>📘 Microsoft Word</span>
  ) : (
    <span style={{ color: '#6FAF9A', fontWeight: 'bold' }}>📝 Inkie Native</span>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Document Details &amp; Statistics
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '1.25rem',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Document Title & Source */}
          <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Document Title</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0 0.35rem 0' }}>
              {docDetails?.title || 'Untitled Document'}
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', gap: '1rem' }}>
              <div>Origin: {sourceIcon}</div>
              <div>Assignment: <strong>{docDetails?.assignmentType === 'individual' ? 'Individual' : 'Group'}</strong></div>
            </div>
          </div>

          {/* Counts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            textAlign: 'center'
          }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{words.toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Words</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{characters.toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Characters (with spaces)</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{charactersNoSpaces.toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Characters (no spaces)</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{paragraphs}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Paragraphs</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>~{readingTimeMin} min</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Reading Time</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#9333ea' }}>{revisionsCount}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Tracked Revisions</div>
            </div>
          </div>

          {/* Authors / Collaborators */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
              Collaborators &amp; Authors ({collaborators.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {collaborators.length === 0 ? (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None recorded yet</span>
              ) : (
                collaborators.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    👤 {c}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
            <div>Created: <strong>{docDetails?.createdAt ? new Date(docDetails.createdAt).toLocaleString() : 'N/A'}</strong></div>
            <div>Last Modified: <strong>{docDetails?.updatedAt ? new Date(docDetails.updatedAt).toLocaleString() : 'N/A'}</strong></div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
