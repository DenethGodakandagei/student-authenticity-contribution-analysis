"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";

const API_BASE = 'http://localhost:8001/api/documents';

export default function Integrations() {
  const navigate = useRouter();
  const [activeTab, setActiveTab] = useState('google');
  const [docUrl, setDocUrl] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [error, setError] = useState('');

  const fetchLinkedDocs = () => {
    fetch(API_BASE)
      .then(res => res.json())
      .then(data => {
        // filter documents that are google_docs or microsoft_365
        const external = (data || []).filter(doc => doc._id.startsWith('google_docs_') || doc._id.startsWith('microsoft_365_'));
        setLinkedDocs(external);
      })
      .catch(err => console.error("Failed to fetch linked docs", err));
  };

  useEffect(() => {
    fetchLinkedDocs();
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!docUrl.trim()) {
      setError('Please provide a document URL.');
      return;
    }
    setError('');
    setImporting(true);
    setImportStep(1);

    // Simulate multi-phase auth and import flow
    const steps = [
      "Contacting Document Provider API...",
      "Requesting OAuth Access and Reading Permissions...",
      "Ingesting revision history from cloud timeline...",
      "Computing differences and reconstructing contributor profiles...",
      "Document evolution database sync complete!"
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setImportStep(i + 1);
    }

    try {
      const response = await fetch(`${API_BASE}/import-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: activeTab === 'google' ? 'google_docs' : 'microsoft_365',
          docUrl,
          title: docTitle.trim() || undefined
        })
      });
      const result = await response.json();
      if (response.ok) {
        fetchLinkedDocs();
        setDocUrl('');
        setDocTitle('');
        alert(`Successfully imported: "${result.title}"!`);
      } else {
        setError(result.error || 'Failed to import document.');
      }
    } catch (err) {
      setError('Network error connecting to backend.');
    } finally {
      setImporting(false);
      setImportStep(0);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem 2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Cloud Document Integrations</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Connect third-party collaborative document environments to reconstruct their evolution history, analyze team authorship, and evaluate collaboration behavior.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Import Panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }}></span>
            Link New Cloud Document
          </h3>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <button
              onClick={() => { setActiveTab('google'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: activeTab === 'google' ? '#4285F4' : 'rgba(0,0,0,0.05)',
                color: activeTab === 'google' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/></svg>
              Google Docs
            </button>
            <button
              onClick={() => { setActiveTab('microsoft'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: activeTab === 'microsoft' ? '#0078d4' : 'rgba(0,0,0,0.05)',
                color: activeTab === 'microsoft' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c1.38 0 2.5-1.12 2.5-2.5S17.88 7 16.5 7 14 8.12 14 9.5s1.12 2.5 2.5 2.5zm-9 0C8.88 12 10 10.88 10 9.5S8.88 7 7.5 7 5 8.12 5 9.5 6.12 12 7.5 12zm0 2c-1.67 0-5 1-5 3v2h10v-2c0-2-3.33-3-5-3zm9 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45v1.5h7v-2c0-2-3.33-3-5-3z"/></svg>
              Microsoft 365 Word
            </button>
          </div>

          {importing ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                border: '4px solid rgba(0,0,0,0.1)',
                borderTop: `4px solid ${activeTab === 'google' ? '#4285F4' : '#0078d4'}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.5rem auto'
              }}></div>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.5rem' }}>Importing Document...</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {importStep === 1 && "Connecting to secure provider server..."}
                {importStep === 2 && "Validating authentication token..."}
                {importStep === 3 && "Accessing file changes stream..."}
                {importStep === 4 && "Compiling and building revision timeline..."}
                {importStep === 5 && "Running originality baseline calculations..."}
              </p>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', marginTop: '1.5rem', overflow: 'hidden' }}>
                <div style={{
                  background: activeTab === 'google' ? '#4285F4' : '#0078d4',
                  height: '100%',
                  width: `${(importStep / 5) * 100}%`,
                  transition: 'width 0.4s'
                }}></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && <div style={{ color: '#e11d48', background: '#fff1f2', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fecdd3', fontSize: '0.875rem' }}>{error}</div>}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Document Shareable Link / ID</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'google') {
                        setDocUrl('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
                        setDocTitle('Climate Change Research Report');
                      } else {
                        setDocUrl('https://onedrive.live.com/edit.aspx?resid=9823749823!104');
                        setDocTitle('Smart Cities Infrastructure Project');
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: activeTab === 'google' ? '#4285F4' : '#0078d4', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    + Load Sample Link
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={activeTab === 'google' ? "https://docs.google.com/document/d/..." : "https://onedrive.live.com/redir?resid=..."}
                  value={docUrl}
                  onChange={e => setDocUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Custom Assignment/Title (Optional)</label>
                <input
                  type="text"
                  placeholder={activeTab === 'google' ? "e.g. Group A Climate Project" : "e.g. Group B Smart City Proposal"}
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '6px', borderLeft: `4px solid ${activeTab === 'google' ? '#4285F4' : '#0078d4'}` }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {activeTab === 'google' 
                    ? "Links the document revision history database via Google Docs REST API. Gathers contributor names, edit sizes, timestamps, and section divisions."
                    : "Accesses Microsoft Graph API to reconstruct file changes stream. Incorporates Word file versions, tracking revisions by registered MS Account holders."
                  }
                </p>
              </div>

              <button
                type="submit"
                style={{
                  background: activeTab === 'google' ? '#4285F4' : '#0078d4',
                  color: 'white',
                  border: 'none',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginTop: '0.5rem'
                }}
              >
                Authenticate & Import Document
              </button>
            </form>
          )}
        </div>

        {/* Linked Documents List */}
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '400px' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Currently Connected Documents</h3>

          {linkedDocs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-secondary)', gap: '1rem' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p style={{ margin: 0 }}>No external cloud documents linked yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {linkedDocs.map(doc => {
                const isGoogle = doc._id.startsWith('google_docs_') || doc.source === 'google_docs';
                return (
                  <div
                    key={doc._id}
                    style={{
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          color: 'white',
                          fontWeight: 'bold',
                          background: isGoogle ? '#4285F4' : '#0078d4'
                        }}>
                          {isGoogle ? 'Google Docs' : 'Microsoft 365'}
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{doc.title || doc._id}</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Document ID: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.2rem', borderRadius: '3px' }}>{doc._id}</code>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => router.push(`/editor?docId=${doc._id}`)}
                        style={{
                          background: isGoogle ? '#4285F4' : '#0078d4',
                          border: 'none',
                          color: 'white',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        ⚡ Work Collaboratively ({isGoogle ? 'Google Docs' : 'MS Word'})
                      </button>
                      <button
                        onClick={() => router.push('/dashboard', { state: { selectedDocId: doc._id } })}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--accent-teal)',
                          color: 'var(--text-primary)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.target.style.background = 'var(--accent-teal)'; e.target.style.color = 'white'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-primary)'; }}
                      >
                        View Analytics
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
  );
}
