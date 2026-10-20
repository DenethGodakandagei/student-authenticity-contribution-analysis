"use client";

import React, { useState } from 'react';

interface DocumentOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: any[];
  activeDocId: string;
  onSelectDoc: (docId: string) => void;
  onOpenImportModal: () => void;
}

export default function DocumentOpenModal({
  isOpen,
  onClose,
  documents,
  activeDocId,
  onSelectDoc,
  onOpenImportModal
}: DocumentOpenModalProps) {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'google_docs' | 'microsoft_365' | 'native'>('all');

  if (!isOpen) return null;

  const filtered = documents.filter(doc => {
    const titleMatch = (doc.title || doc._id || '').toLowerCase().includes(search.toLowerCase());
    if (!titleMatch) return false;

    if (filterSource === 'all') return true;
    if (filterSource === 'google_docs') return doc.source === 'google_docs' || doc._id.startsWith('google_docs_');
    if (filterSource === 'microsoft_365') return doc.source === 'microsoft_365' || doc._id.startsWith('microsoft_365_');
    if (filterSource === 'native') return !doc.source || doc.source === 'native' || (!doc._id.startsWith('google_') && !doc._id.startsWith('microsoft_'));
    return true;
  });

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
        borderRadius: '16px',
        width: '100%',
        maxWidth: '650px',
        maxHeight: '85vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Open Document
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              Select a native, Google Docs, or Word document to work on
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '1.25rem'
            }}
          >
            &times;
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search documents by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setFilterSource('all')}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: filterSource === 'all' ? '#0f172a' : '#ffffff',
                color: filterSource === 'all' ? '#ffffff' : '#475569',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              All ({documents.length})
            </button>
            <button
              onClick={() => setFilterSource('google_docs')}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: filterSource === 'google_docs' ? '#4285F4' : '#ffffff',
                color: filterSource === 'google_docs' ? '#ffffff' : '#475569',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Google Docs
            </button>
            <button
              onClick={() => setFilterSource('microsoft_365')}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: filterSource === 'microsoft_365' ? '#0078D4' : '#ffffff',
                color: filterSource === 'microsoft_365' ? '#ffffff' : '#475569',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Word (.docx)
            </button>
          </div>
        </div>

        {/* Document List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              <div style={{ fontWeight: 600 }}>No documents found</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try clearing your search or import a new Google Doc or Word file.</div>
            </div>
          ) : (
            filtered.map((doc: any) => {
              const isSelected = doc._id === activeDocId;
              const isGoogle = doc.source === 'google_docs' || doc._id.startsWith('google_docs_');
              const isWord = doc.source === 'microsoft_365' || doc._id.startsWith('microsoft_365_');

              return (
                <div
                  key={doc._id}
                  onClick={() => {
                    onSelectDoc(doc._id);
                    onClose();
                  }}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.12s ease'
                  }}
                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = '#ffffff'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isGoogle ? '#E8F0FE' : isWord ? '#EFF6FF' : '#E6F4EA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isGoogle ? '📄' : isWord ? '📘' : '📝'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.title || doc._id}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                        <span>Origin: <strong>{isGoogle ? 'Google Docs' : isWord ? 'Word' : 'Native'}</strong></span>
                        <span>&bull;</span>
                        <span>Owner: {doc.ownerName || doc.owner || 'Student'}</span>
                        {doc.updatedAt && (
                          <>
                            <span>&bull;</span>
                            <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px'
                    }}>
                      Active
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.5rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => {
              onClose();
              onOpenImportModal();
            }}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#2563eb',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            📥 Import New Word / Google Doc...
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
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
