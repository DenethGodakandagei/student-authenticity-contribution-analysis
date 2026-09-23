"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReportsManagerModal({ isOpen, onClose, onSelectDocument, onShareDocument, onDocumentDeleted }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchAllReports = async () => {
    if (!isOpen || !user) return;
    setLoading(true);
    setError('');

    try {
      const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
      const res = await fetch(`http://localhost:8001/api/documents?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load documents');
      setDocuments(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleRename = async (docId, currentTitle, e) => {
    e.stopPropagation();
    const newTitle = window.prompt("Rename Document Title:", currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) return;

    try {
      const res = await fetch(`http://localhost:8001/api/documents/${docId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          username: user?.username,
          studentId: user?.studentId,
          role: user?.role
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename document');

      setDocuments(prev => prev.map(d => d._id === docId ? { ...d, title: data.title } : d));
    } catch (err) {
      alert(`Error renaming document: ${err.message}`);
    }
  };

  const handleDelete = async (docId, docTitle, e) => {
    e.stopPropagation();
    
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${docTitle || docId}"?\n\nThis will remove the document and all associated revision history. This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeletingId(docId);
    setError('');

    try {
      const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
      const res = await fetch(`http://localhost:8001/api/documents/${docId}?${query}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');

      setDocuments(prev => prev.filter(d => d._id !== docId));
      if (onDocumentDeleted) onDocumentDeleted(docId);
    } catch (err) {
      alert(`Error deleting document: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const term = searchTerm.toLowerCase();
    const titleMatch = (doc.title || doc._id).toLowerCase().includes(term);
    const ownerMatch = (doc.ownerName || doc.owner || '').toLowerCase().includes(term);
    const sourceMatch = (doc.source || '').toLowerCase().includes(term);
    return titleMatch || ownerMatch || sourceMatch;
  });

  return (
    <div className="reports-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(6px)'
    }}>
      <div className="reports-modal-box" style={{
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '14px',
        padding: '2rem',
        maxWidth: '850px',
        width: '92%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.5)',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: '#38bdf8' }}>
              📁 All Created Reports & Documents
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              View all project documents, rename titles, manage permissions, or delete unwanted reports.
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.75rem',
              cursor: 'pointer',
              padding: '0 0.5rem'
            }}
          >
            &times;
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="🔍 Search reports by title, owner name, or source..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: '#0f172a',
              color: '#fff',
              outline: 'none',
              fontSize: '0.95rem'
            }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Reports Table / List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              ⏳ Loading created reports...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
              No reports found matching your criteria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredDocs.map(doc => {
                const isG = doc._id.startsWith('google_docs_') || doc.source === 'google_docs';
                const isM = doc._id.startsWith('microsoft_365_') || doc.source === 'microsoft_365';
                const sourceBadge = isG ? 'Google Docs' : isM ? 'MS Word' : 'In-Built';
                const badgeBg = isG ? '#4285F4' : isM ? '#0078d4' : '#10b981';
                
                const ownerText = doc.ownerName || doc.owner || 'Group Leader';
                const collabsCount = doc.collaborators ? doc.collaborators.length : 1;
                const formattedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A';

                return (
                  <div
                    key={doc._id}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', background: badgeBg, color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 'bold' }}>
                          {sourceBadge}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 600 }}>
                          {doc.title || doc._id}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                        <span>👑 Owner: <strong style={{ color: '#e2e8f0' }}>{ownerText}</strong></span>
                        <span>👥 Collaborators: <strong style={{ color: '#e2e8f0' }}>{collabsCount}</strong></span>
                        <span>📅 Created: <strong style={{ color: '#e2e8f0' }}>{formattedDate}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => { onSelectDocument(doc._id); onClose(); }}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        👁️ Open
                      </button>

                      <button
                        onClick={(e) => handleRename(doc._id, doc.title || doc._id, e)}
                        style={{
                          background: '#334155',
                          color: '#e2e8f0',
                          border: '1px solid #475569',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Rename
                      </button>

                      {onShareDocument && (
                        <button
                          onClick={() => { onShareDocument(doc); }}
                          style={{
                            background: '#334155',
                            color: '#38bdf8',
                            border: '1px solid #475569',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          🔒 Share
                        </button>
                      )}

                      <button
                        disabled={deletingId === doc._id}
                        onClick={(e) => handleDelete(doc._id, doc.title, e)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          border: '1px solid #ef4444',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          cursor: deletingId === doc._id ? 'not-allowed' : 'pointer',
                          opacity: deletingId === doc._id ? 0.6 : 1
                        }}
                      >
                        {deletingId === doc._id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Total Reports: {filteredDocs.length}
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#334155',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 'bold',
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
