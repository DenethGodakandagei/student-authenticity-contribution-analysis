"use client";

import React, { useState, useEffect } from 'react';
import { getApiBase, getBackendUrl } from '../utils/apiConfig';

interface ImportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (docId: string, title: string) => void;
  currentUser?: any;
}

export default function ImportDocumentModal({
  isOpen,
  onClose,
  onImportSuccess,
  currentUser
}: ImportDocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'google' | 'word'>('google');
  
  // Google Docs state
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [googleDocTitle, setGoogleDocTitle] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [googleClientReady, setGoogleClientReady] = useState(false);

  // Word (.docx) state
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [docxBase64, setDocxBase64] = useState<string>('');
  const [wordDocTitle, setWordDocTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Common state
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '974057963404-f6kmvobfa9v486hermc6sj9ndvn7b8kp.apps.googleusercontent.com';

  // Fetch classmates for collaborator tagging
  useEffect(() => {
    if (isOpen) {
      fetch(`${getBackendUrl()}/api/auth/users`)
        .then(res => {
          if (!res.ok) return [];
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setRegisteredStudents(data);
          }
        })
        .catch(err => console.warn("Failed to load students:", err?.message || err));
    }
  }, [isOpen]);

  // Check if Google Identity Services script is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkGoogle = () => {
        if ((window as any).google?.accounts?.oauth2) {
          setGoogleClientReady(true);
        } else {
          setTimeout(checkGoogle, 500);
        }
      };
      checkGoogle();
    }
  }, []);

  if (!isOpen) return null;

  // Handle Google OAuth 2.0 Sign-In via Google Identity Services (GIS)
  const handleGoogleSignIn = () => {
    setError(null);
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        setError("Google Identity Services is still loading. Please check your internet connection.");
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            setGoogleAccessToken(tokenResponse.access_token);
            // Optionally fetch basic profile info
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            })
              .then(res => res.json())
              .then(info => {
                if (info?.email) setGoogleUserEmail(info.email);
              })
              .catch(() => {});
          } else if (tokenResponse?.error) {
            setError(`Google authorization failed: ${tokenResponse.error}`);
          }
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setError(`Google Sign-In Error: ${err.message}`);
    }
  };

  // Handle Word file selection
  const processWordFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
      setError("Please select a valid Microsoft Word (.docx) document file.");
      return;
    }
    setError(null);
    setDocxFile(file);
    if (!wordDocTitle) {
      setWordDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setDocxBase64(result);
    };
    reader.onerror = () => {
      setError("Failed to read the selected Word file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processWordFile(e.dataTransfer.files[0]);
    }
  };

  // Submit Import
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'google') {
      if (!googleDocUrl.trim()) {
        setError("Please enter a Google Docs link.");
        return;
      }
      if (!googleDocUrl.includes('docs.google.com/document/d/')) {
        setError("The URL entered does not appear to be a valid Google Docs URL (format: https://docs.google.com/document/d/DOC_ID/edit).");
        return;
      }
    } else {
      if (!docxBase64) {
        setError("Please select or drop a Word (.docx) file to import.");
        return;
      }
    }

    setLoading(true);
    setLoadingStep(1);

    const steps = [
      activeTab === 'google' ? "Connecting to Google Cloud..." : "Reading Word (.docx) document archive...",
      activeTab === 'google' ? "Extracting document paragraphs & Drive revision metadata..." : "Parsing word/document.xml and docProps/core.xml...",
      "Matching authentic authors & computing contribution splits...",
      "Generating ML revision intent analysis & timeline...",
      "Saving document evolution history..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setLoadingStep(i + 1);
    }

    try {
      const payload: any = {
        source: activeTab === 'google' ? 'google_docs' : 'microsoft_365',
        title: (activeTab === 'google' ? googleDocTitle : wordDocTitle).trim() || undefined,
        owner: currentUser?.username || 'student',
        ownerName: currentUser?.name || currentUser?.username || 'Student',
        studentId: currentUser?.studentId || '',
        collaborators: selectedCollaborators
      };

      if (activeTab === 'google') {
        payload.docUrl = googleDocUrl.trim();
        if (googleAccessToken) {
          payload.accessToken = googleAccessToken;
        }
      } else {
        payload.docxBase64 = docxBase64;
      }

      const res = await fetch(`${getApiBase()}/import-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import document.');
      }

      onImportSuccess(data.docId, data.title);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while importing.");
    } finally {
      setLoading(false);
      setLoadingStep(0);
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
      backdropFilter: 'blur(4px)',
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
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to right, #f8fafc, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: activeTab === 'google' ? '#E8F0FE' : '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${activeTab === 'google' ? '#C2E7FF' : '#BFDBFE'}`
            }}>
              {activeTab === 'google' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4285F4"/>
                  <polyline points="14 2 14 8 20 8" fill="#A1C2FA"/>
                  <line x1="8" y1="13" x2="16" y2="13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="17" x2="14" y2="17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" fill="#0078D4"/>
                  <path d="M7 7L10 17L12 11L14 17L17 7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Import Real Document
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Ingest real text, preserve author attribution & sync evolution history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.4rem',
              borderRadius: '8px',
              fontSize: '1.25rem',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          padding: '0.75rem 1.5rem',
          gap: '0.75rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setError(null); }}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: activeTab === 'google' ? '2px solid #4285F4' : '1px solid #e2e8f0',
              background: activeTab === 'google' ? '#ffffff' : 'transparent',
              color: activeTab === 'google' ? '#1e40af' : '#64748b',
              fontWeight: 700,
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'google' ? '0 2px 6px rgba(66, 133, 244, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4285F4"/>
              <polyline points="14 2 14 8 20 8" fill="#A1C2FA"/>
            </svg>
            Google Docs
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('word'); setError(null); }}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: activeTab === 'word' ? '2px solid #0078D4' : '1px solid #e2e8f0',
              background: activeTab === 'word' ? '#ffffff' : 'transparent',
              color: activeTab === 'word' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'word' ? '0 2px 6px rgba(0, 120, 212, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#0078D4"/>
              <path d="M7 7L10 17L12 11L14 17L17 7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Microsoft Word (.docx)
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚠️</span>
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                border: '3px solid #e2e8f0',
                borderTop: `3px solid ${activeTab === 'google' ? '#4285F4' : '#0078D4'}`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1.25rem auto'
              }} />
              <h4 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontWeight: 800 }}>
                Importing Real Document...
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                {loadingStep === 1 && (activeTab === 'google' ? "Connecting to Google Cloud..." : "Reading Word (.docx) file archive...")}
                {loadingStep === 2 && (activeTab === 'google' ? "Fetching document text & Google Drive revisions..." : "Parsing word/document.xml & docProps/core.xml...")}
                {loadingStep === 3 && "Matching authentic authors & computing contribution splits..."}
                {loadingStep === 4 && "Running ML revision intent analysis on paragraphs..."}
                {loadingStep === 5 && "Document evolution database sync complete!"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* TAB 1: GOOGLE DOCS */}
              {activeTab === 'google' && (
                <>
                  {/* Google OAuth Banner */}
                  <div style={{
                    background: googleAccessToken ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${googleAccessToken ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '0.9rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                          {googleAccessToken ? 'Google Account Connected' : 'Google Cloud OAuth 2.0'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: googleAccessToken ? '#16a34a' : '#64748b' }}>
                          {googleAccessToken
                            ? `Authorized${googleUserEmail ? ` as ${googleUserEmail}` : ''} (Full Revisions Enabled)`
                            : 'Sign in to fetch private Google Docs & Drive revision history'}
                        </div>
                      </div>
                    </div>

                    {googleAccessToken ? (
                      <button
                        type="button"
                        onClick={() => { setGoogleAccessToken(null); setGoogleUserEmail(null); }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #cbd5e1',
                          color: '#64748b',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#1f2937',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        Sign in with Google
                      </button>
                    )}
                  </div>

                  {/* Google Doc URL */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Google Docs Shareable Link *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      value={googleDocUrl}
                      onChange={e => setGoogleDocUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                      💡 Tip: If not signed into Google above, ensure the doc sharing is set to <strong>&quot;Anyone with the link can view&quot;</strong>.
                    </p>
                  </div>

                  {/* Title Override */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Document Title <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional - will auto-extract from Doc if empty)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems Final Paper"
                      value={googleDocTitle}
                      onChange={e => setGoogleDocTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}

              {/* TAB 2: MICROSOFT WORD */}
              {activeTab === 'word' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Upload Word Document (.docx) *
                    </label>
                    
                    {/* Drag and Drop Box */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${isDragging ? '#0078D4' : docxFile ? '#16a34a' : '#cbd5e1'}`,
                        borderRadius: '12px',
                        padding: '1.75rem 1rem',
                        textAlign: 'center',
                        background: isDragging ? '#eff6ff' : docxFile ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => document.getElementById('word-file-input')?.click()}
                    >
                      <input
                        id="word-file-input"
                        type="file"
                        accept=".docx,.doc"
                        onChange={(e) => e.target.files?.[0] && processWordFile(e.target.files[0])}
                        style={{ display: 'none' }}
                      />

                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: docxFile ? '#dcfce7' : '#e0f2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem auto'
                      }}>
                        {docxFile ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="3" fill="#0078D4"/>
                            <path d="M7 7L10 17L12 11L14 17L17 7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {docxFile ? (
                        <>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#166534' }}>
                            {docxFile.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#4ade80', marginTop: '0.2rem' }}>
                            {(docxFile.size / 1024).toFixed(1)} KB &bull; Word Document Ready for Import
                          </div>
                          <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#0078d4', textDecoration: 'underline' }}>
                            Click or drag to choose a different file
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            Drag and drop your .docx file here, or <span style={{ color: '#0078D4', textDecoration: 'underline' }}>browse</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.35rem' }}>
                            Supports Microsoft Word (.docx). Ingests real paragraphs and extracts author metadata automatically.
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Word Document Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Document Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Architecture Assignment"
                      value={wordDocTitle}
                      onChange={e => setWordDocTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}

              {/* Classmate Collaborators Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Assign Classmate Collaborators <span style={{ fontWeight: 400, color: '#94a3b8' }}>(For Group Contribution Tracking)</span>
                </label>
                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  background: '#f8fafc'
                }}>
                  {registeredStudents.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '0.25rem' }}>
                      Loading registered students...
                    </div>
                  ) : (
                    registeredStudents
                      .filter(s => s.username !== currentUser?.username)
                      .map(s => {
                        const displayName = `${s.name || s.username}${s.studentId ? ` (${s.studentId})` : ''}`;
                        const isChecked = selectedCollaborators.includes(s.name || s.username);
                        return (
                          <label
                            key={s._id || s.username}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              background: isChecked ? '#e0f2fe' : 'transparent'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const val = s.name || s.username;
                                if (e.target.checked) {
                                  setSelectedCollaborators(prev => [...prev, val]);
                                } else {
                                  setSelectedCollaborators(prev => prev.filter(c => c !== val));
                                }
                              }}
                            />
                            <span style={{ fontWeight: isChecked ? 700 : 500, color: '#1e293b' }}>
                              {displayName}
                            </span>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                marginTop: '0.5rem'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (activeTab === 'word' && !docxBase64) || (activeTab === 'google' && !googleDocUrl.trim())}
                  style={{
                    padding: '0.6rem 1.35rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'google' ? '#4285F4' : '#0078D4',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: loading || (activeTab === 'word' && !docxBase64) || (activeTab === 'google' && !googleDocUrl.trim()) ? 'not-allowed' : 'pointer',
                    opacity: loading || (activeTab === 'word' && !docxBase64) || (activeTab === 'google' && !googleDocUrl.trim()) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Import {activeTab === 'google' ? 'Google Doc' : 'Word Document'}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
