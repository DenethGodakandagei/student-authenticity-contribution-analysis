"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBackendUrl } from '../utils/apiConfig';
import { ToastContainer, CustomPromptDialog, CustomConfirmDialog, ToastItem } from './CustomDialog';

export default function ReportsManagerModal({ isOpen, onClose, onSelectDocument, onShareDocument, onDocumentDeleted }: any) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Dialog states replacing window.prompt & window.confirm
  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    onConfirm: () => {}
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchAllReports = async () => {
    if (!isOpen || !user) return;
    setLoading(true);
    setError('');

    try {
      const uName = user.username || '';
      const sId = user.studentId || '';
      const uRole = user.role || '';
      const query = `username=${encodeURIComponent(uName)}&studentId=${encodeURIComponent(sId)}&role=${encodeURIComponent(uRole)}`;
      const res = await fetch(`${getBackendUrl()}/api/documents?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load documents');
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleRename = (docId: string, currentTitle: string, e: any) => {
    e.stopPropagation();
    setPromptDialog({
      isOpen: true,
      title: 'Rename Document Title',
      subtitle: `Current title: "${currentTitle}"`,
      defaultValue: currentTitle,
      placeholder: 'Enter new document title...',
      confirmLabel: 'Update Title',
      onConfirm: async (newTitle: string) => {
        if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) {
          setPromptDialog(prev => ({ ...prev, isOpen: false }));
          return;
        }

        try {
          const res = await fetch(`${getBackendUrl()}/api/documents/${docId}/rename`, {
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
          showToast(`Document renamed to "${data.title}"`, 'success', 'Title Updated');
        } catch (err: any) {
          showToast(err.message, 'error', 'Rename Error');
        } finally {
          setPromptDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDelete = (docId: string, docTitle: string, e: any) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete Document',
      message: `Are you sure you want to permanently delete "${docTitle || docId}"?\n\nThis will remove the document and all associated contribution and revision records. This action cannot be undone.`,
      confirmLabel: 'Permanently Delete',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setDeletingId(docId);
        setError('');

        try {
          const uName = user?.username || '';
          const sId = user?.studentId || '';
          const uRole = user?.role || '';
          const query = `username=${encodeURIComponent(uName)}&studentId=${encodeURIComponent(sId)}&role=${encodeURIComponent(uRole)}`;
          const res = await fetch(`${getBackendUrl()}/api/documents/${docId}?${query}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete document');

          setDocuments(prev => prev.filter(d => d._id !== docId));
          if (onDocumentDeleted) onDocumentDeleted(docId);
          showToast(`"${docTitle || docId}" deleted successfully`, 'success', 'Deleted');
        } catch (err: any) {
          showToast(err.message, 'error', 'Delete Failed');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const filteredDocs = documents.filter(doc => {
    const term = searchTerm.toLowerCase();
    const titleMatch = (doc.title || doc._id).toLowerCase().includes(term);
    const ownerMatch = (doc.ownerName || doc.owner || '').toLowerCase().includes(term);
    const sourceMatch = (doc.source || '').toLowerCase().includes(term);
    return titleMatch || ownerMatch || sourceMatch;
  });

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      <CustomPromptDialog
        isOpen={promptDialog.isOpen}
        title={promptDialog.title}
        subtitle={promptDialog.subtitle}
        defaultValue={promptDialog.defaultValue}
        placeholder={promptDialog.placeholder}
        confirmLabel={promptDialog.confirmLabel}
        onConfirm={promptDialog.onConfirm}
        onCancel={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <CustomConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        isDanger={confirmDialog.isDanger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

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
          maxWidth: '880px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
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
                <span style={{ fontSize: '1.3rem' }}>📁</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                  All Created Reports & Documents
                </h2>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#BFDBFE', marginTop: '0.2rem', display: 'block' }}>
                Secure verification hub: review authorship histories, rename documents, or manage access.
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
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

          <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Search Bar */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ position: 'absolute', left: '1rem', color: '#94A3B8', fontSize: '1rem' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search reports by title, student owner, or source environment..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    outline: 'none',
                    fontSize: '0.92rem',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#4F46E5';
                    e.target.style.background = '#FFFFFF';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.background = '#F8FAFC';
                  }}
                />
              </div>
            </div>

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
                ⚠️ {error}
              </div>
            )}

            {/* Reports List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                  Loading document reports...
                </div>
              ) : filteredDocs.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                  <div style={{ fontWeight: 600, color: '#334155' }}>No document reports found</div>
                  <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Try clearing the search filter or create a new document.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredDocs.map(doc => {
                    const isG = doc._id.startsWith('google_docs_') || doc.source === 'google_docs';
                    const isM = doc._id.startsWith('microsoft_365_') || doc.source === 'microsoft_365';
                    const sourceBadge = isG ? 'Google Docs' : isM ? 'MS Word' : 'In-Built';
                    
                    const ownerText = doc.ownerName || doc.owner || 'Group Leader';
                    const collabsCount = doc.collaborators ? doc.collaborators.length : 1;
                    const formattedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A';

                    return (
                      <div
                        key={doc._id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '1.1rem 1.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.85rem',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.08)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              background: isG ? '#EFF6FF' : isM ? '#EFF6FF' : '#F0FDFA',
                              color: isG ? '#1D4ED8' : isM ? '#0369A1' : '#0D9488',
                              border: `1px solid ${isG ? '#BFDBFE' : isM ? '#BAE6FD' : '#99F6E4'}`,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '12px',
                              fontWeight: 700
                            }}>
                              {sourceBadge}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1E3A8A', fontWeight: 700 }}>
                              {doc.title || doc._id}
                            </h4>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                            <span>👑 Owner: <strong style={{ color: '#334155' }}>{ownerText}</strong></span>
                            <span>👥 Collaborators: <strong style={{ color: '#334155' }}>{collabsCount}</strong></span>
                            <span>📅 Created: <strong style={{ color: '#334155' }}>{formattedDate}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => { onSelectDocument(doc._id); onClose(); }}
                            style={{
                              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '0.5rem 0.95rem',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                            }}
                          >
                            👁️ Open
                          </button>

                          <button
                            onClick={(e) => handleRename(doc._id, doc.title || doc._id, e)}
                            style={{
                              background: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              fontWeight: 600,
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
                                background: '#F0FDFA',
                                color: '#0D9488',
                                border: '1px solid #99F6E4',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                fontWeight: 600,
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
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              fontWeight: 600,
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
            <div style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                Total Reports: <strong style={{ color: '#1E3A8A' }}>{filteredDocs.length}</strong>
              </span>
              <button
                onClick={onClose}
                style={{
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  padding: '0.55rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
