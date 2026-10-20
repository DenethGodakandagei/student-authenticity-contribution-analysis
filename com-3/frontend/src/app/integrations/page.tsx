"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '../../context/AuthContext';
import { getApiBase, getBackendUrl } from '../../utils/apiConfig';
import { ToastContainer, ToastItem } from '../../components/CustomDialog';

const API_BASE = getApiBase();

function GoogleGIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

const GmailIcon = GoogleGIcon;

export default function Integrations() {
  const router = useRouter();
  const { user } = useAuth();

  // Active Provider Tab: 'google' | 'word'
  const [activeProvider, setActiveProvider] = useState<'google' | 'word'>('google');

  // Google Docs Form State
  const [googleUrl, setGoogleUrl] = useState('');
  const [googleTitle, setGoogleTitle] = useState('');
  const [googleCollaborators, setGoogleCollaborators] = useState<string[]>([]);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);

  // Google Drive Live Files State
  const [driveDocs, setDriveDocs] = useState<any[]>([]);
  const [loadingDriveDocs, setLoadingDriveDocs] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');

  const filteredDriveDocs = driveDocs.filter(f =>
    !driveSearchQuery.trim() || (f.name || '').toLowerCase().includes(driveSearchQuery.toLowerCase())
  );

  // Word Form State
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [wordBase64, setWordBase64] = useState('');
  const [wordTitle, setWordTitle] = useState('');
  const [wordCollaborators, setWordCollaborators] = useState<string[]>([]);
  const [wordLinkUrl, setWordLinkUrl] = useState('');
  const [wordInputType, setWordInputType] = useState<'file' | 'link'>('file');

  // General State
  const [importing, setImporting] = useState(false);
  const [importStepText, setImportStepText] = useState('');
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '974057963404-f6kmvobfa9v486hermc6sj9ndvn7b8kp.apps.googleusercontent.com';

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchDriveDocs = async (token?: string) => {
    const t = token || googleAccessToken;
    if (!t) return;
    setLoadingDriveDocs(true);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document' and trashed=false&fields=files(id,name,modifiedTime,webViewLink,owners)&orderBy=modifiedTime desc&pageSize=35",
        { headers: { Authorization: `Bearer ${t}` } }
      );
      if (!res.ok) {
        if (res.status === 401) {
          setGoogleAccessToken(null);
          setGoogleUserEmail(null);
          try { localStorage.removeItem('google_access_token'); } catch (e) {}
        }
        return;
      }
      const data = await res.json();
      setDriveDocs(data.files || []);
    } catch (err: any) {
      console.warn("Could not fetch Google Drive files:", err);
    } finally {
      setLoadingDriveDocs(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError('');
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        showToast("Google Identity Services is loading. Please retry in a few seconds.", "error", "Google Auth");
        return;
      }
      const client = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            setGoogleAccessToken(tokenResponse.access_token);
            try {
              localStorage.setItem('google_access_token', tokenResponse.access_token);
            } catch (e) {}
            fetchDriveDocs(tokenResponse.access_token);
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            })
              .then(res => res.json())
              .then(info => {
                if (info?.email) setGoogleUserEmail(info.email);
              })
              .catch(() => {});
            showToast("Google Account connected! Private docs & revision history enabled.", "success", "Google Authorized");
          } else if (tokenResponse?.error) {
            setError(`Google authorization error: ${tokenResponse.error}`);
          }
        }
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setError(`Google Sign-In failed: ${err.message}`);
    }
  };

  const handleGoogleDisconnect = () => {
    setGoogleAccessToken(null);
    setGoogleUserEmail(null);
    setDriveDocs([]);
    try {
      localStorage.removeItem('google_access_token');
    } catch (e) {}
    showToast("Google Account disconnected.", "info", "Disconnected");
  };

  const fetchLinkedDocs = () => {
    const params = new URLSearchParams();
    if (user?.username) params.append('username', user.username);
    if (user?.studentId) params.append('studentId', user.studentId);
    if (user?.role) params.append('role', user.role);
    if (user?.email) params.append('email', user.email);

    fetch(`${getApiBase()}?${params.toString()}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        const external = (data || []).filter((doc: any) =>
          doc._id?.startsWith('google_docs_') ||
          doc._id?.startsWith('microsoft_365_') ||
          doc.source === 'google_docs' ||
          doc.source === 'microsoft_365'
        );
        setLinkedDocs(external);
      })
      .catch(err => console.warn("Could not fetch linked docs:", err?.message || err));
  };

  const fetchStudents = () => {
    fetch(`${getBackendUrl()}/api/auth/users`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        const students = (data || []).filter((u: any) => {
          const r = (u.role || '').toLowerCase();
          const isStaff = r === 'admin' || r === 'lecturer' || r === 'teacher';
          const isSelf = u.username === user?.username || u.studentId === user?.studentId;
          return !isStaff && !isSelf;
        });
        setRegisteredStudents(students);
      })
      .catch(err => console.warn("Could not fetch students:", err?.message || err));
  };

  useEffect(() => {
    if (user?.role === 'lecturer') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchLinkedDocs();
      fetchStudents();
    }
    try {
      const saved = localStorage.getItem('google_access_token');
      if (saved) {
        setGoogleAccessToken(saved);
        fetchDriveDocs(saved);
      }
    } catch (e) {}
  }, [user]);

  // Handle Word .docx file upload
  const handleWordFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWordFile(file);
    if (!wordTitle) {
      setWordTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setWordBase64(base64);
      showToast(`Selected Word Document: "${file.name}"`, "info", "File Ready");
    };
    reader.readAsDataURL(file);
  };

  // Import Google Doc
  const handleImportGoogleDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!googleUrl.trim()) {
      setError('Please provide a Google Docs shareable link.');
      return;
    }

    setImporting(true);
    setImportStepText('Connecting to Google Docs...');

    try {
      const steps = [
        "Connecting to Google Docs API...",
        "Resolving document permissions & Drive revision history...",
        "Extracting real document paragraphs & structure...",
        "Computing ML author attribution telemetry..."
      ];
      for (const step of steps) {
        setImportStepText(step);
        await new Promise(r => setTimeout(r, 400));
      }

      const response = await fetch(`${API_BASE}/import-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'google_docs',
          docUrl: googleUrl.trim(),
          accessToken: googleAccessToken || undefined,
          title: googleTitle.trim() || undefined,
          owner: user?.username || 'student',
          ownerName: user?.name || user?.username || 'Student',
          studentId: user?.studentId || '',
          collaborators: googleCollaborators
        })
      });

      const result = await response.json();
      if (response.ok) {
        showToast(`Successfully imported: "${result.title}"`, 'success', 'Import Complete');
        router.push(`/editor?docId=${result.docId}`);
      } else {
        setError(result.error || 'Failed to import Google Doc.');
        showToast(result.error || 'Failed to import Google Doc', 'error', 'Import Failed');
      }
    } catch (err: any) {
      setError('Network error connecting to backend.');
      showToast('Network error connecting to backend', 'error', 'Connection Error');
    } finally {
      setImporting(false);
      setImportStepText('');
    }
  };

  // 1-Click Import directly from Google Drive list
  const handleOneClickImportGoogleDoc = async (file: any) => {
    const url = `https://docs.google.com/document/d/${file.id}/edit`;
    const title = file.name || 'Google Doc';
    setGoogleUrl(url);
    setGoogleTitle(title);
    setError('');
    setImporting(true);
    setImportStepText(`Connecting to Google Docs & importing "${title}"...`);

    try {
      const response = await fetch(`${API_BASE}/import-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'google_docs',
          docUrl: url,
          accessToken: googleAccessToken || undefined,
          title: title,
          owner: user?.username || 'student',
          ownerName: user?.name || user?.username || 'Student',
          studentId: user?.studentId || '',
          collaborators: googleCollaborators
        })
      });

      const result = await response.json();
      if (response.ok) {
        showToast(`Successfully imported: "${result.title}"`, 'success', 'Import Complete');
        router.push(`/editor?docId=${result.docId}`);
      } else {
        setError(result.error || 'Failed to import Google Doc.');
        showToast(result.error || 'Failed to import Google Doc', 'error', 'Import Failed');
      }
    } catch (err: any) {
      setError('Network error connecting to backend.');
      showToast('Network error connecting to backend', 'error', 'Connection Error');
    } finally {
      setImporting(false);
      setImportStepText('');
    }
  };

  // Import Word Document
  const handleImportWordDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (wordInputType === 'file' && !wordBase64) {
      setError('Please choose a .docx file to import.');
      return;
    }
    if (wordInputType === 'link' && !wordLinkUrl.trim()) {
      setError('Please provide a Word Online / OneDrive shareable link.');
      return;
    }

    setImporting(true);
    setImportStepText('Reading Word document paragraphs and core XML...');

    try {
      const steps = [
        "Unpacking Word package XML & metadata...",
        "Extracting document paragraphs and author signatures...",
        "Storing revision snapshots in database..."
      ];
      for (const step of steps) {
        setImportStepText(step);
        await new Promise(r => setTimeout(r, 400));
      }

      const response = await fetch(`${API_BASE}/import-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'microsoft_365',
          docUrl: wordInputType === 'link' ? wordLinkUrl.trim() : undefined,
          docxBase64: wordInputType === 'file' ? wordBase64 : undefined,
          title: wordTitle.trim() || undefined,
          owner: user?.username || 'student',
          ownerName: user?.name || user?.username || 'Student',
          studentId: user?.studentId || '',
          collaborators: wordCollaborators
        })
      });

      const result = await response.json();
      if (response.ok) {
        showToast(`Successfully imported: "${result.title}"`, 'success', 'Import Complete');
        router.push(`/editor?docId=${result.docId}`);
      } else {
        setError(result.error || 'Failed to import Word document.');
        showToast(result.error || 'Failed to import Word document', 'error', 'Import Failed');
      }
    } catch (err: any) {
      setError('Network error connecting to backend.');
      showToast('Network error connecting to backend', 'error', 'Connection Error');
    } finally {
      setImporting(false);
      setImportStepText('');
    }
  };

  // Sync latest revisions directly from card
  const handleSyncDoc = async (docId: string, title: string) => {
    setSyncingDocId(docId);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null;
      const res = await fetch(`${API_BASE}/${docId}/sync-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: storedToken || undefined,
          author: user?.name || user?.username,
          username: user?.username,
          studentId: user?.studentId,
          role: user?.role,
          email: user?.email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Google Docs');
      showToast(
        data.message || `Synchronized "${title}" (+${data.wordsAdded || 0}/-${data.wordsDeleted || 0} words)!`,
        'success',
        'Revisions Synced'
      );
      fetchLinkedDocs();
    } catch (err: any) {
      showToast(err.message, 'error', 'Sync Failed');
    } finally {
      setSyncingDocId(null);
    }
  };

  // Delete external document
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
      showToast(`Document "${title || docId}" removed.`, "success", "Deleted");
      fetchLinkedDocs();
    } catch (err: any) {
      showToast(err.message, "error", "Delete Failed");
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div style={{
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '2rem 1.25rem 4rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a'
      }}>

        {/* 1. Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          padding: '2rem 2.25rem',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Cloud Document Integrations
              </h1>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Import Google Docs and Microsoft Word assignments. Track continuous student revisions, analyze collaborative ML intents, and inspect version history just like Google Docs.
            </p>
          </div>

          {/* Quick Status Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: googleAccessToken ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${googleAccessToken ? '#6FAF9A' : '#e2e8f0'}`,
              fontSize: '0.76rem',
              fontWeight: 600,
              color: googleAccessToken ? '#234e40' : '#64748b'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: googleAccessToken ? '#6FAF9A' : '#94a3b8' }} />
              <span>
                {googleAccessToken ? (googleUserEmail ? `Google: ${googleUserEmail}` : 'Google Account Connected') : 'Google Account: Not Connected'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155'
            }}>
              <span>{linkedDocs.length} Connected Documents</span>
            </div>
          </div>
        </div>

        {/* 2. Platform Selector Tabs (Clean & Compact) */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0.4rem'
        }}>
          <button
            type="button"
            onClick={() => { setActiveProvider('google'); setError(''); }}
            style={{
              padding: '0.4rem 1.05rem',
              borderRadius: '9999px',
              border: activeProvider === 'google' ? '1px solid rgba(111, 175, 154, 0.45)' : '1px solid transparent',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.84rem',
              background: activeProvider === 'google' ? '#EFF8F3' : 'transparent',
              color: activeProvider === 'google' ? '#0D1110' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Google Docs
          </button>

          <button
            type="button"
            onClick={() => { setActiveProvider('word'); setError(''); }}
            style={{
              padding: '0.4rem 1.05rem',
              borderRadius: '9999px',
              border: activeProvider === 'word' ? '1px solid rgba(111, 175, 154, 0.45)' : '1px solid transparent',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.84rem',
              background: activeProvider === 'word' ? '#EFF8F3' : 'transparent',
              color: activeProvider === 'word' ? '#0D1110' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Microsoft Word (.docx)
          </button>
        </div>

        {/* 3. Main Import Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2.25rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)'
        }}>

          {error && (
            <div style={{
              color: '#b91c1c',
              background: '#fef2f2',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              fontSize: '0.85rem',
              lineHeight: 1.4,
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {importing ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #6FAF9A',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.5rem auto'
              }} />
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Importing & Synchronizing Document...
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                {importStepText || 'Processing document content and setting up revision tracking...'}
              </p>
            </div>
          ) : activeProvider === 'google' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* OAuth Connection Status Banner */}
              <div style={{
                background: googleAccessToken ? 'rgba(111, 175, 154, 0.08)' : '#f8fafc',
                border: `1px solid ${googleAccessToken ? 'rgba(111, 175, 154, 0.35)' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    flexShrink: 0
                  }}>
                    <GmailIcon size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      {googleAccessToken ? 'Google Cloud OAuth 2.0 Connected' : 'Google Cloud OAuth 2.0 Integration'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: googleAccessToken ? '#234e40' : '#64748b', marginTop: '2px' }}>
                      {googleAccessToken
                        ? `Authorized as ${googleUserEmail || 'Google User'} — Your Google Drive documents are listed on the right.`
                        : 'Sign in to automatically list all your Google Docs and enable 1-click import.'}
                    </div>
                  </div>
                </div>

                {googleAccessToken ? (
                  <button
                    type="button"
                    onClick={handleGoogleDisconnect}
                    style={{
                      background: '#EFF8F3',
                      border: '1px solid rgba(111, 175, 154, 0.4)',
                      color: '#0D1110',
                      padding: '0.35rem 0.8rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#EFF8F3',
                      border: '1px solid rgba(111, 175, 154, 0.45)',
                      color: '#0D1110',
                      padding: '0.4rem 0.95rem',
                      borderRadius: '9999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(13, 17, 16, 0.04)'
                    }}
                  >
                    <GmailIcon size={16} />
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>

              {/* 2-Column Section: Form on Left, Drive Documents on Right */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.75rem',
                alignItems: 'start'
              }}>

                {/* Left Column: Import Form */}
                <form onSubmit={handleImportGoogleDoc} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      Import by Link
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      Paste a shareable link or pick any document from your Google Drive on the right.
                    </p>
                  </div>

                  {/* Step 1: Google Docs Link */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Google Docs Shareable Link *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://docs.google.com/document/d/1.../edit"
                      value={googleUrl}
                      onChange={e => setGoogleUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.86rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                      Paste any Google Docs URL, or click <strong>Use Link</strong> on the right panel.
                    </p>
                  </div>

                  {/* Step 2: Document Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Document Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems Group Project"
                      value={googleTitle}
                      onChange={e => setGoogleTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.86rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                      Leave blank to auto-detect title from Google Docs.
                    </p>
                  </div>

                  {/* Step 3: Classmate Collaborators */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Assign Group Members ({googleCollaborators.length} selected)
                    </label>
                    <div style={{
                      maxHeight: '110px',
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      background: '#f8fafc',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: '0.35rem'
                    }}>
                      {registeredStudents.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.76rem', padding: '0.4rem' }}>
                          No other registered classmates found.
                        </div>
                      ) : (
                        registeredStudents.map((st: any) => {
                          const key = `${st.name} (${st.studentId})`;
                          const isSelected = googleCollaborators.includes(key);
                          return (
                            <label
                              key={st._id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                fontSize: '0.76rem',
                                color: isSelected ? '#0f172a' : '#64748b',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                padding: '0.25rem 0.45rem',
                                borderRadius: '5px',
                                background: isSelected ? 'rgba(111, 175, 154, 0.18)' : 'transparent',
                                transition: 'background 0.1s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setGoogleCollaborators(prev =>
                                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                  );
                                }}
                              />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {st.name} ({st.studentId})
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    style={{
                      background: '#EFF8F3',
                      border: '1px solid rgba(111, 175, 154, 0.45)',
                      color: '#0D1110',
                      padding: '0.42rem 1.15rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      marginTop: '0.2rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Import Google Doc & Track Revisions
                  </button>
                </form>

                {/* Right Column: Live Google Docs in Drive list */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  minHeight: '360px'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                        Your Google Docs
                      </span>
                      {googleAccessToken && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: 'rgba(111, 175, 154, 0.22)',
                          color: '#1b3f33',
                          padding: '0.12rem 0.5rem',
                          borderRadius: '9999px'
                        }}>
                          {driveDocs.length}
                        </span>
                      )}
                    </div>

                    {googleAccessToken && (
                      <button
                        type="button"
                        onClick={() => fetchDriveDocs()}
                        disabled={loadingDriveDocs}
                        title="Refresh documents list"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          padding: '0.28rem 0.65rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#475569',
                          cursor: loadingDriveDocs ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Refresh
                      </button>
                    )}
                  </div>

                  {!googleAccessToken ? (
                    /* Not signed in prompt */
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '2.2rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '0.85rem',
                      margin: 'auto 0',
                      background: '#ffffff'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                          Connect Google to List Docs
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45, maxWidth: '260px' }}>
                          Sign in with Google OAuth to see all your documents listed here and import in 1 click.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          background: '#EFF8F3',
                          border: '1px solid rgba(111, 175, 154, 0.45)',
                          color: '#0D1110',
                          padding: '0.4rem 0.95rem',
                          borderRadius: '9999px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <GmailIcon size={16} />
                        <span>Sign in with Google</span>
                      </button>
                    </div>
                  ) : (
                    /* Signed in: Search bar + Document List */
                    <>
                      <div>
                        <input
                          type="text"
                          placeholder="Search your Google Docs..."
                          value={driveSearchQuery}
                          onChange={e => setDriveSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.48rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8rem',
                            background: '#ffffff',
                            color: '#0f172a',
                            boxSizing: 'border-box',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '320px',
                        paddingRight: '0.2rem'
                      }}>
                        {loadingDriveDocs ? (
                          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                            <div style={{
                              width: '22px',
                              height: '22px',
                              border: '2px solid #e2e8f0',
                              borderTop: '2px solid #6FAF9A',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                              margin: '0 auto 0.6rem auto'
                            }} />
                            Fetching your Google Docs from Drive...
                          </div>
                        ) : filteredDriveDocs.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '2rem 1rem',
                            color: '#64748b',
                            fontSize: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span>{driveSearchQuery ? `No documents matching "${driveSearchQuery}"` : 'No Google Docs found in this Google account.'}</span>
                            <a
                              href="https://docs.new"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#4f8574',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textDecoration: 'none'
                              }}
                            >
                              Create a new Google Doc
                            </a>
                          </div>
                        ) : (
                          filteredDriveDocs.map((doc: any) => {
                            const docUrl = `https://docs.google.com/document/d/${doc.id}/edit`;
                            const updatedDate = doc.modifiedTime ? new Date(doc.modifiedTime).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            }) : '';

                            return (
                              <div
                                key={doc.id}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  padding: '0.65rem 0.75rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.4rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                  <span
                                    title={doc.name}
                                    style={{
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      color: '#0f172a',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {doc.name || 'Untitled document'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                                  <span>{updatedDate ? `Updated ${updatedDate}` : ''}</span>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGoogleUrl(docUrl);
                                        setGoogleTitle(doc.name || '');
                                        showToast(`Loaded "${doc.name}" into form`, 'info', 'Doc Selected');
                                      }}
                                      style={{
                                        background: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '9999px',
                                        padding: '0.18rem 0.5rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: '#334155',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Use Link
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOneClickImportGoogleDoc(doc)}
                                      style={{
                                        background: '#EFF8F3',
                                        border: '1px solid rgba(111, 175, 154, 0.45)',
                                        borderRadius: '9999px',
                                        padding: '0.18rem 0.55rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: '#0D1110',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      1-Click Import
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          ) : (
            /* Microsoft Word Import Form */
            <form onSubmit={handleImportWordDoc} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Toggle Input Mode: File Upload vs Web Link */}
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => setWordInputType('file')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: wordInputType === 'file' ? 700 : 500,
                    fontSize: '0.8rem',
                    background: wordInputType === 'file' ? '#6FAF9A' : '#f1f5f9',
                    color: wordInputType === 'file' ? '#0D1110' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Upload .docx File
                </button>
                <button
                  type="button"
                  onClick={() => setWordInputType('link')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: wordInputType === 'link' ? 700 : 500,
                    fontSize: '0.8rem',
                    background: wordInputType === 'link' ? '#6FAF9A' : '#f1f5f9',
                    color: wordInputType === 'link' ? '#0D1110' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Word Online Link
                </button>
              </div>

              {wordInputType === 'file' ? (
                /* Drag and drop / File Picker */
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                    Select Word Document (.docx, .doc) *
                  </label>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept=".docx,.doc"
                      required
                      onChange={handleWordFileUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      {wordFile ? wordFile.name : 'Click or drag and drop your .docx file here'}
                    </div>
                    <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                      Inkie extracts actual XML paragraphs, section headings, and core metadata without any loss.
                    </p>
                  </div>
                </div>
              ) : (
                /* Word Online Link */
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                    Word Online / OneDrive Shareable Link *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://onedrive.live.com/... or https://company-my.sharepoint.com/..."
                    value={wordLinkUrl}
                    onChange={e => setWordLinkUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab Report 3 - Data Science"
                  value={wordTitle}
                  onChange={e => setWordTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Collaborators */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  Assign Group Members ({wordCollaborators.length} selected)
                </label>
                <div style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  background: '#f8fafc',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {registeredStudents.map((st: any) => {
                    const key = `${st.name} (${st.studentId})`;
                    const isSelected = wordCollaborators.includes(key);
                    return (
                      <label
                        key={st._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem',
                          color: isSelected ? '#0f172a' : '#64748b',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          background: isSelected ? '#f0fdf4' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setWordCollaborators(prev =>
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

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  background: '#EFF8F3',
                  border: '1px solid rgba(111, 175, 154, 0.45)',
                  color: '#0D1110',
                  padding: '0.42rem 1.15rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  transition: 'all 0.15s ease'
                }}
              >
                Import Word Document
              </button>
            </form>
          )}

        </div>

        {/* 4. Connected Documents List (Compact & Clean Cards) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Connected Cloud Documents ({linkedDocs.length})
            </h2>
            <button
              type="button"
              onClick={fetchLinkedDocs}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.28rem 0.65rem',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </div>

          {linkedDocs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: '0.3rem' }}>
                No External Documents Connected Yet
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Paste a Google Docs link or drop a Word .docx file above to start tracking collaborative revisions.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
              gap: '0.65rem'
            }}>
              {linkedDocs.map((doc: any) => {
                const isGoogle = doc._id.startsWith('google_docs_') || doc.source === 'google_docs';
                const isSyncing = syncingDocId === doc._id;

                return (
                  <div
                    key={doc._id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.45rem',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                    }}
                  >
                    <div>
                      {/* Top Badges & Leader */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', gap: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '9999px',
                          color: '#0D1110',
                          fontWeight: 700,
                          background: '#EFF8F3',
                          border: '1px solid rgba(111, 175, 154, 0.4)',
                          letterSpacing: '0.02em',
                          flexShrink: 0
                        }}>
                          {isGoogle ? 'Google Docs' : 'Microsoft Word'}
                        </span>

                        <span style={{
                          fontSize: '0.68rem',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={`Leader: ${doc.ownerName || doc.owner || 'You'}`}>
                          Leader: <strong style={{ color: '#0f172a' }}>{doc.ownerName || doc.owner || 'You'}</strong>
                        </span>
                      </div>

                      {/* Title */}
                      <div
                        title={doc.title || doc._id}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#0f172a',
                          lineHeight: 1.25,
                          marginBottom: '0.2rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {doc.title || doc._id}
                      </div>

                      {/* Collaborators */}
                      <div
                        title={`Collaborators: ${(doc.collaborators || []).length > 0 ? doc.collaborators.join(', ') : 'Individual Document'}`}
                        style={{
                          fontSize: '0.68rem',
                          color: '#64748b',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Collaborators:{' '}
                        <span style={{ color: '#334155', fontWeight: 500 }}>
                          {(doc.collaborators || []).length > 0 ? doc.collaborators.join(', ') : 'Individual Document'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => router.push(`/editor?docId=${doc._id}`)}
                        style={{
                          flex: 1,
                          background: '#EFF8F3',
                          border: '1px solid rgba(111, 175, 154, 0.45)',
                          color: '#0D1110',
                          padding: '0.24rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Open in Editor
                      </button>

                      {isGoogle && (
                        <button
                          type="button"
                          onClick={() => handleSyncDoc(doc._id, doc.title || doc._id)}
                          disabled={isSyncing}
                          title="Pull latest edits from Google Docs"
                          style={{
                            background: '#EFF8F3',
                            border: '1px solid rgba(111, 175, 154, 0.35)',
                            color: '#0D1110',
                            padding: '0.24rem 0.45rem',
                            borderRadius: '9999px',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            cursor: isSyncing ? 'default' : 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSyncing ? 'Syncing...' : 'Sync'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteLinkedDoc(doc._id, doc.title)}
                        title="Remove document connection"
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          padding: '0.24rem 0.45rem',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
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
    </>
  );
}
