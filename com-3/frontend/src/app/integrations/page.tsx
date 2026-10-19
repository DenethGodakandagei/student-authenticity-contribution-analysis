"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '../../context/AuthContext';
import { getApiBase, getBackendUrl } from '../../utils/apiConfig';
import { ToastContainer, ToastItem } from '../../components/CustomDialog';

const API_BASE = getApiBase();

export default function Integrations() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'google' | 'microsoft'>('google');
  const [importMode, setImportMode] = useState<'link' | 'paste'>('link');
  const [docUrl, setDocUrl] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [docxBase64, setDocxBase64] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchLinkedDocs = () => {
    fetch(API_BASE)
      .then(res => res.json())
      .then(data => {
        const external = (data || []).filter((doc: any) =>
          doc._id.startsWith('google_docs_') || doc._id.startsWith('microsoft_365_') ||
          doc.source === 'google_docs' || doc.source === 'microsoft_365'
        );
        setLinkedDocs(external);
      })
      .catch(err => console.error("Failed to fetch linked docs", err));
  };

  const fetchStudents = () => {
    fetch(`${getBackendUrl()}/api/auth/users`)
      .then(res => res.json())
      .then(data => setRegisteredStudents(data || []))
      .catch(err => console.error("Failed to fetch students", err));
  };

  useEffect(() => {
    if (user?.role === 'lecturer') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchLinkedDocs();
    fetchStudents();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const isDocx = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc');
    if (isDocx) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setDocxBase64(base64);
        setRawContent(`[Word Document "${file.name}" loaded for import]`);
        showToast(`Loaded Word Document: "${file.name}"`, "info", "File Uploaded");
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawContent(text);
          setDocxBase64('');
          showToast(`Loaded content from "${file.name}"`, "info", "File Uploaded");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteLinkedDoc = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove document "${title || docId}"?`)) return;
    try {
      const params = new URLSearchParams();
      if (user?.username) params.append('username', user.username);
      if (user?.studentId) params.append('studentId', user.studentId);
      if (user?.role) params.append('role', user.role);

      const res = await fetch(`${API_BASE}/${docId}?${params.toString()}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete document");
      showToast(`Document "${title || docId}" deleted.`, "success", "Deleted");
      fetchLinkedDocs();
    } catch (err: any) {
      showToast(err.message, "error", "Delete Failed");
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (importMode === 'link' && !docUrl.trim()) {
      setError('Please provide a Google Docs or Word shareable link.');
      return;
    }
    if (importMode === 'paste' && !rawContent.trim() && !docxBase64) {
      setError('Please paste document content or upload a document file.');
      return;
    }

    setImporting(true);
    setImportStep(1);

    const steps = [
      "Connecting to cloud provider...",
      "Resolving document access permissions...",
      "Extracting actual text paragraphs and section content...",
      "Computing authentic author metrics...",
      "Document evolution database sync complete!"
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setImportStep(i + 1);
    }

    try {
      const response = await fetch(`${API_BASE}/import-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: activeTab === 'google' ? 'google_docs' : 'microsoft_365',
          docUrl: docUrl.trim() || undefined,
          rawContent: docxBase64 ? undefined : (rawContent.trim() || undefined),
          docxBase64: docxBase64 || undefined,
          title: docTitle.trim() || undefined,
          owner: user?.username || 'student',
          ownerName: user?.name || user?.username || 'Student',
          studentId: user?.studentId || '',
          collaborators: selectedCollaborators
        })
      });

      const result = await response.json();
      if (response.ok) {
        fetchLinkedDocs();
        setDocUrl('');
        setDocTitle('');
        setRawContent('');
        setDocxBase64('');
        setUploadedFileName('');
        setSelectedCollaborators([]);
        showToast(`Successfully imported: "${result.title}"`, 'success', 'Import Complete');
        router.push(`/editor?docId=${result.docId}`);
      } else {
        setError(result.error || 'Failed to import document.');
        showToast(result.error || 'Failed to import document', 'error', 'Import Failed');
      }
    } catch (err) {
      setError('Network error connecting to backend.');
      showToast('Network error connecting to backend', 'error', 'Connection Error');
    } finally {
      setImporting(false);
      setImportStep(0);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem 3rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Header Banner */}
        <div style={{
          background: '#ffffff',
          padding: '1.5rem 2rem',
          borderRadius: '14px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
        }}>
          <h2 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontSize: '1.45rem', fontWeight: 800 }}>
            Real Cloud Document Integrations
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Import your real Google Docs and Word documents without any dummy sample data. Ingest real paragraphs, calculate authentic word counts, and assign real classmates.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
          
          {/* Left: Import Panel */}
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Import Real Document
            </h3>

            {/* Platform Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('google'); setError(''); }}
                style={{
                  padding: '0.65rem',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: activeTab === 'google' ? '#4285F4' : '#f1f5f9',
                  color: activeTab === 'google' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Google Docs
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('microsoft'); setError(''); }}
                style={{
                  padding: '0.65rem',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: activeTab === 'microsoft' ? '#0078d4' : '#f1f5f9',
                  color: activeTab === 'microsoft' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Microsoft 365 Word
              </button>
            </div>

            {/* Mode Toggle: URL vs Direct Content / File */}
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setImportMode('link')}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: importMode === 'link' ? 700 : 500,
                  background: importMode === 'link' ? '#ffffff' : 'transparent',
                  color: importMode === 'link' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: importMode === 'link' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Via Shareable Link
              </button>
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: importMode === 'paste' ? 700 : 500,
                  background: importMode === 'paste' ? '#ffffff' : 'transparent',
                  color: importMode === 'paste' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: importMode === 'paste' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Upload File / Paste Text
              </button>
            </div>

            {importing ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #e2e8f0',
                  borderTop: `3px solid ${activeTab === 'google' ? '#4285F4' : '#0078d4'}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.25rem auto'
                }} />
                <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                  Extracting Real Document Content...
                </p>
                <p style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  {importStep === 1 && "Connecting to cloud provider..."}
                  {importStep === 2 && "Resolving document access permissions..."}
                  {importStep === 3 && "Extracting actual text paragraphs and section content..."}
                  {importStep === 4 && "Computing authentic author metrics..."}
                  {importStep === 5 && "Document evolution database sync complete!"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {error && (
                  <div style={{
                    color: '#b91c1c',
                    background: 'rgba(239, 68, 68, 0.08)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '0.82rem',
                    lineHeight: 1.4
                  }}>
                    {error}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={activeTab === 'google' ? "e.g. Research Proposal - Team Alpha" : "e.g. Distributed Systems Lab Report"}
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {importMode === 'link' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      {activeTab === 'google' ? "Google Docs Shareable Link" : "Word Online / Cloud Link"}
                    </label>
                    <input
                      type="url"
                      required
                      placeholder={activeTab === 'google' ? "https://docs.google.com/document/d/.../edit" : "https://onedrive.live.com/..."}
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                      Ensure link sharing in Google Docs or Word is set to <strong>&quot;Anyone with the link can view&quot;</strong> so Inkie can fetch your real document text without authentication errors.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                        Upload Document File (.txt, .html, .md)
                      </label>
                      <input
                        type="file"
                        accept=".txt,.html,.htm,.md,.doc,.docx"
                        onChange={handleFileUpload}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                          background: '#f8fafc',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                      {uploadedFileName && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                          Selected: {uploadedFileName}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                        Or Paste Real Document Text / HTML Content
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Paste your real report content, paragraphs, or headings directly here..."
                        value={rawContent}
                        onChange={e => setRawContent(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          color: '#0f172a',
                          fontSize: '0.85rem',
                          outline: 'none',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Real Collaborators Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    Select Real Group Members ({selectedCollaborators.length} selected)
                  </label>
                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    {registeredStudents.map((st: any) => {
                      const key = `${st.name} (${st.studentId})`;
                      const isSelected = selectedCollaborators.includes(key);
                      return (
                        <label
                          key={st._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                            color: isSelected ? '#0f172a' : '#64748b',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedCollaborators(prev =>
                                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                              );
                            }}
                          />
                          <span>{st.name} ({st.studentId})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    background: activeTab === 'google' ? '#4285F4' : '#0078d4',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(66, 133, 244, 0.35)',
                    marginTop: '0.5rem'
                  }}
                >
                  Import Real Document
                </button>
              </form>
            )}
          </div>

          {/* Right: Connected Documents List with Delete */}
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Connected Cloud Documents ({linkedDocs.length})
            </h3>

            {linkedDocs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #e2e8f0'
              }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  No External Documents Connected
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem' }}>
                  Import your actual Google Docs or Word assignments on the left.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {linkedDocs.map((doc: any) => {
                  const isGoogle = doc._id.startsWith('google_docs_') || doc.source === 'google_docs';
                  return (
                    <div
                      key={doc._id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          color: '#ffffff',
                          fontWeight: 700,
                          background: isGoogle ? '#4285F4' : '#0078d4'
                        }}>
                          {isGoogle ? 'Google Docs' : 'Microsoft 365'}
                        </span>

                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Leader: {doc.ownerName || doc.owner || 'You'}
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                        {doc.title || doc._id}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Collaborators: {(doc.collaborators || []).join(', ') || 'Self'}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          onClick={() => router.push(`/editor?docId=${doc._id}`)}
                          style={{
                            flex: 1,
                            background: '#6FAF9A',
                            color: '#0D1110',
                            border: 'none',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(111, 175, 154, 0.3)'
                          }}
                        >
                          Open in Editor
                        </button>

                        <button
                          onClick={() => handleDeleteLinkedDoc(doc._id, doc.title)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </>
  );
}
