"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ContributionHeatmap from './ContributionHeatmap';
import DocumentTimeline from './DocumentTimeline';
import WordGrowthChart from './WordGrowthChart';
import AuthorHighlightViewer from './AuthorHighlightViewer';
import MLRevisionAnalytics from './MLRevisionAnalytics';
import { useAuth } from '../context/AuthContext';
import { getApiBase, getBackendUrl } from '../utils/apiConfig';
import { ToastContainer, ToastItem } from './CustomDialog';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const [activeTab, setActiveTab] = useState<'documents' | 'users' | 'inspector'>('documents');
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalLecturers: 0,
    totalAdmins: 0,
    avgAuthenticity: 0,
    totalRevisions: 0,
    totalWords: 0,
    totalAnomalies: 0
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'individual' | 'submitted' | 'in_progress'>('all');

  // Selected document for deep-dive inspection
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [inspectorTab, setInspectorTab] = useState<'heatmap' | 'markup' | 'timeline' | 'ml_analytics'>('heatmap');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [authorMarkup, setAuthorMarkup] = useState<any>(null);
  const [mlAnalytics, setMlAnalytics] = useState<any>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  // Read-only text preview modal
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Delete document modal confirmation
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getBackendUrl()}/api/admin/overview`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {});
        setDocuments(data.documents || []);
        setUsersList(data.users || []);
        if (data.documents && data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(data.documents[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load admin overview", err);
      showToast("Failed to load admin telemetry data.", "error", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchDocAnalytics = async (docId: string) => {
    try {
      setSelectedLoading(true);
      const fetchJson = async (url: string) => {
        try {
          const sep = url.includes('?') ? '&' : '?';
          const res = await fetch(`${url}${sep}_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const [timelineRes, heatmapRes, growthRes, anomaliesRes, markupRes, mlAnalyticsRes] = await Promise.all([
        fetchJson(`${getApiBase()}/${docId}/timeline`),
        fetchJson(`${getApiBase()}/${docId}/heatmap`),
        fetchJson(`${getApiBase()}/${docId}/growth`),
        fetchJson(`${getApiBase()}/${docId}/anomalies`),
        fetchJson(`${getApiBase()}/${docId}/author-markup`),
        fetchJson(`${getBackendUrl()}/api/documents/${docId}/revision-analytics`)
      ]);

      if (timelineRes !== null) setTimeline(timelineRes || []);
      if (heatmapRes !== null) setHeatmap(heatmapRes);
      if (growthRes !== null) setGrowth(growthRes || []);
      if (anomaliesRes !== null) setAnomalies(anomaliesRes || []);
      if (markupRes !== null) setAuthorMarkup(markupRes);
      if (mlAnalyticsRes !== null) setMlAnalytics(mlAnalyticsRes);
    } catch (err) {
      console.error("Failed to load document analytics", err);
    } finally {
      setSelectedLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDocId) {
      fetchDocAnalytics(selectedDocId);
    }
  }, [selectedDocId]);

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/${docId}?role=admin&username=${encodeURIComponent(user?.username || 'admin')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Document deleted successfully from platform.", "success", "Deleted");
        setDocuments(prev => prev.filter(d => d._id !== docId));
        setDeleteDocId(null);
        if (selectedDocId === docId) setSelectedDocId('');
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete document.", "error", "Delete Failed");
      }
    } catch (err) {
      showToast("Error communicating with server.", "error", "Network Error");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast(`User role successfully updated to ${newRole}.`, "success", "Role Updated");
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update role", "error", "Update Error");
      }
    } catch {
      showToast("Server communication error", "error", "Error");
    }
  };

  const handleExportAllPlatformCSV = async () => {
    try {
      showToast("Fetching all actual database revisions across all documents...", "info", "Exporting Dataset");
      const res = await fetch(`${getBackendUrl()}/api/admin/overview`);
      const data = await res.json();
      const docs = data.documents || [];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/\r\n|\r|\n/g, ' ').replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        "sample_id",
        "document_id",
        "document_title",
        "author",
        "anonymized_author_id",
        "timestamp",
        "section",
        "before_text",
        "after_text",
        "words_added",
        "words_deleted",
        "predicted_intent",
        "predicted_significance",
        "semantic_distance",
        "confidence",
        "is_bulk_insertion",
        "anomaly_flag",
        "explanation"
      ];

      let csv = headers.join(',') + '\n';
      let rowCount = 0;

      for (const doc of docs) {
        try {
          const revRes = await fetch(`${getBackendUrl()}/api/documents/${doc._id}/revisions`);
          if (revRes.ok) {
            const revs = await revRes.json();
            for (const r of revs) {
              rowCount++;
              const row = [
                escapeCsv(`LIVE_${String(rowCount).padStart(4, '0')}`),
                escapeCsv(doc._id),
                escapeCsv(doc.title),
                escapeCsv(r.author || doc.ownerName || 'Author'),
                escapeCsv(r.anonymizedAuthorId || 'STU_ANON'),
                escapeCsv(r.timestamp),
                escapeCsv(r.section || 'General'),
                escapeCsv(r.beforeText || r.deletedText || ''),
                escapeCsv(r.afterText || r.addedText || ''),
                r.words_added || r.wordCountAdded || 0,
                r.words_deleted || r.wordCountDeleted || 0,
                escapeCsv(r.predictedIntent || 'Content Addition'),
                escapeCsv(r.predictedSignificance || 'Moderate'),
                Number((r.semanticDistance || 0.05).toFixed(4)),
                Number((r.confidence || 0.95).toFixed(4)),
                r.isBulkInsertion ? 1 : 0,
                escapeCsv(r.anomalyFlag || 'None'),
                escapeCsv(r.explanation || '')
              ];
              csv += row.join(',') + '\n';
            }
          }
        } catch (e) {}
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `actual_database_all_documents_dataset.csv`;
      a.click();
      showToast(`Exported all ${rowCount} actual revisions from all documents!`, "success", "Download Complete");
    } catch (err: any) {
      showToast("Failed to export complete platform dataset", "error", "Export Error");
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter(doc => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q ||
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc._id && doc._id.toLowerCase().includes(q)) ||
      (doc.ownerName && doc.ownerName.toLowerCase().includes(q)) ||
      (doc.course && doc.course.toLowerCase().includes(q));

    if (!matchQuery) return false;

    if (filterType === 'group') return doc.assignmentType === 'group';
    if (filterType === 'individual') return doc.assignmentType === 'individual';
    if (filterType === 'submitted') return doc.submissionStatus === 'submitted';
    if (filterType === 'in_progress') return doc.submissionStatus === 'in_progress';

    return true;
  });

  const selectedDocObj = documents.find(d => d._id === selectedDocId) || null;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* 1. Executive Admin Header Banner (Light Theme) */}
        <div style={{
          background: 'linear-gradient(135deg, #EFF8F3 0%, #FFFFFF 100%)',
          borderRadius: '18px',
          padding: '1.75rem 2.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 4px 20px rgba(13, 17, 16, 0.05)',
          border: '1px solid rgba(111, 175, 154, 0.35)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxWidth: '750px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#ffffff',
                color: '#225243',
                border: '1px solid rgba(111, 175, 154, 0.4)',
                padding: '0.25rem 0.8rem',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 1px 3px rgba(111, 175, 154, 0.15)'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6FAF9A', boxShadow: '0 0 6px #6FAF9A' }} />
                Platform Superuser Control Console
              </span>
              <span style={{ fontSize: '0.8rem', color: '#556c63' }}>
                Administrator: <strong style={{ color: '#0D1110' }}>{user?.name || user?.username || 'Admin'}</strong> ({user?.studentId || 'Superuser'})
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.025em', color: '#0D1110' }}>
              System Administration &amp; Document Registry
            </h1>

            <p style={{ margin: 0, fontSize: '0.88rem', color: '#43574f', lineHeight: 1.5 }}>
              Unrestricted access to all student assignments, collaborative sessions, and cohort records. Administrators have full capability to write in the editor, inspect ML forensics, and manage platform users.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: '#ffffff', borderRadius: '10px', padding: '0.3rem', border: '1px solid rgba(111, 175, 154, 0.3)', boxShadow: '0 2px 6px rgba(13, 17, 16, 0.03)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                style={{
                  background: activeTab === 'documents' ? '#6FAF9A' : 'transparent',
                  color: activeTab === 'documents' ? '#0D1110' : '#43574f',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'documents' ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'documents' ? '0 2px 6px rgba(111, 175, 154, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                All Documents ({documents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                style={{
                  background: activeTab === 'users' ? '#6FAF9A' : 'transparent',
                  color: activeTab === 'users' ? '#0D1110' : '#43574f',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'users' ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'users' ? '0 2px 6px rgba(111, 175, 154, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Platform Users ({usersList.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inspector')}
                style={{
                  background: activeTab === 'inspector' ? '#6FAF9A' : 'transparent',
                  color: activeTab === 'inspector' ? '#0D1110' : '#43574f',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'inspector' ? 900 : 600,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'inspector' ? '0 2px 6px rgba(111, 175, 154, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Forensic Center
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportAllPlatformCSV}
              style={{
                background: '#ffffff',
                color: '#0D1110',
                border: '1px solid rgba(111, 175, 154, 0.4)',
                borderRadius: '10px',
                padding: '0.65rem 1.15rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(13, 17, 16, 0.03)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#EFF8F3'}
              onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
              title="Download all actual student revisions across all documents as a clean CSV"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download All Documents CSV {stats.totalRevisions ? `(${stats.totalRevisions} Revisions)` : ''}
            </button>

            <Link
              href="/editor"
              style={{
                background: '#6FAF9A',
                color: '#0D1110',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.84rem',
                fontWeight: 900,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 3px 10px rgba(111, 175, 154, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#5d9d88'}
              onMouseOut={e => e.currentTarget.style.background = '#6FAF9A'}
            >
              Open Document Editor &rarr;
            </Link>
          </div>
        </div>

        {/* 2. Platform KPI Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ALL DOCUMENTS
            </span>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', marginTop: '0.4rem', lineHeight: 1 }}>
              {stats.totalDocuments}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.35rem' }}>Full platform registry</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              REGISTERED USERS
            </span>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', marginTop: '0.4rem', lineHeight: 1 }}>
              {stats.totalUsers}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.35rem' }}>
              {stats.totalStudents} Students &bull; {stats.totalLecturers} Lecturers
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL WORDS &amp; REVISIONS
            </span>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0ea5e9', marginTop: '0.4rem', lineHeight: 1 }}>
              {stats.totalWords.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.35rem' }}>
              Across {stats.totalRevisions} revision steps
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              COHORT AUTHENTICITY AVG
            </span>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: stats.avgAuthenticity >= 75 ? '#16a34a' : '#d97706', marginTop: '0.4rem', lineHeight: 1 }}>
              {stats.avgAuthenticity}%
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.35rem' }}>
              {stats.totalAnomalies} burst events flagged
            </div>
          </div>
        </div>

        {/* ================= TAB 1: ALL DOCUMENTS REGISTRY ================= */}
        {activeTab === 'documents' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header, Search, and Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  All System Documents &amp; Assignments
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Administrators can open any document in the collaborative editor, inspect telemetry forensics, or delete entries.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filter by title, owner, or course..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.55rem 1rem',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    width: '260px',
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '0.25rem', border: '1px solid #e2e8f0' }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'submitted', label: 'Submitted' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'group', label: 'Group' },
                    { id: 'individual', label: 'Individual' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id as any)}
                      style={{
                        border: 'none',
                        background: filterType === f.id ? '#ffffff' : 'transparent',
                        color: filterType === f.id ? '#0f172a' : '#64748b',
                        fontWeight: filterType === f.id ? 800 : 600,
                        fontSize: '0.78rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.9rem 1rem' }}>Title &amp; Course</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Format</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Owner / Submitter</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Words / Revs</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Authenticity</th>
                    <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        No documents matched your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map(item => {
                      const isSelected = item._id === selectedDocId;
                      const isSubmitted = item.submissionStatus === 'submitted';

                      return (
                        <tr
                          key={item._id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? 'rgba(217, 119, 6, 0.05)' : '#ffffff',
                            borderLeft: isSelected ? '4px solid #d97706' : '4px solid transparent'
                          }}
                        >
                          <td style={{ padding: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            <div style={{ fontSize: '0.92rem', color: isSelected ? '#b45309' : '#0f172a' }}>
                              {item.title || item._id}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                              {item.course || 'Software Engineering'}
                            </div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              background: item.assignmentType === 'individual' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                              color: item.assignmentType === 'individual' ? '#0369a1' : '#4338ca',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              {item.assignmentType === 'individual' ? 'Individual' : 'Group'}
                            </span>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.ownerName || item.owner}</div>
                            {item.studentId && (
                              <span style={{ background: '#f1f5f9', color: '#0284c7', padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                {item.studentId}
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.totalWords} words</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{item.revisionsCount || 1} revision step(s)</div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              background: isSubmitted ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                              color: isSubmitted ? '#16a34a' : '#d97706',
                              border: `1px solid ${isSubmitted ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                              padding: '0.2rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSubmitted ? '#16a34a' : '#d97706' }} />
                              {isSubmitted ? 'Submitted' : 'In Progress'}
                            </span>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              background: item.authenticityScore >= 75 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: item.authenticityScore >= 75 ? '#16a34a' : '#d97706',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '8px',
                              fontWeight: 900,
                              fontSize: '0.9rem'
                            }}>
                              {item.authenticityScore}%
                            </span>
                          </td>

                          {/* Admin Superuser Action Buttons */}
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                              {/* Open in Editor: Admin can edit any document directly */}
                              <Link
                                href={`/editor?docId=${item._id}`}
                                style={{
                                  background: '#6FAF9A',
                                  color: '#0D1110',
                                  textDecoration: 'none',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  boxShadow: '0 2px 6px rgba(111, 175, 154, 0.3)'
                                }}
                              >
                                Edit in Editor
                              </Link>

                              {/* Inspect Forensics */}
                              <button
                                onClick={() => {
                                  setSelectedDocId(item._id);
                                  setActiveTab('inspector');
                                }}
                                style={{
                                  background: isSelected ? '#121417' : '#f1f5f9',
                                  color: isSelected ? '#ffffff' : '#0f172a',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Forensics
                              </button>

                              {/* Preview text */}
                              <button
                                onClick={() => setPreviewDoc(item)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.7rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Preview
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setDeleteDocId(item._id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#dc2626',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PLATFORM USERS & ROLE MANAGEMENT ================= */}
        {activeTab === 'users' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                Platform Users &amp; Role Management
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Manage account permissions for students, lecturers, and system administrators.
              </p>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.9rem 1rem' }}>User / Name</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Student / Staff ID</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Email Address</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Current Role</th>
                    <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        <div>{u.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>@{u.username}</div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: '#f1f5f9', color: '#0284c7', padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                          {u.studentId || 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem', color: '#64748b' }}>
                        {u.email}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: u.role === 'admin' ? 'rgba(217, 119, 6, 0.15)' : u.role === 'lecturer' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(163, 230, 53, 0.16)',
                          color: u.role === 'admin' ? '#b45309' : u.role === 'lecturer' ? '#4338ca' : '#275306',
                          border: `1px solid ${u.role === 'admin' ? 'rgba(217, 119, 6, 0.35)' : u.role === 'lecturer' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(163, 230, 53, 0.35)'}`,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}>
                          {u.role === 'admin' ? 'Administrator' : u.role === 'lecturer' ? 'Lecturer' : u.role === 'group_leader' ? 'Group Leader' : 'Student'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <select
                          value={u.role || 'student'}
                          onChange={e => handleUpdateRole(u._id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="group_leader">Group Leader</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: FORENSIC INSPECTOR & HEATMAP ================= */}
        {activeTab === 'inspector' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Document Selector & Action Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    SELECT DOCUMENT TO INSPECT:
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    {documents.map(d => (
                      <option key={d._id} value={d._id}>
                        {d.title || d._id} ({d.ownerName || d.owner}) - {d.totalWords} words
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDocObj && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.84rem', color: '#64748b' }}>
                    Owner: <strong style={{ color: '#0f172a' }}>{selectedDocObj.ownerName}</strong> &bull; Course: <strong style={{ color: '#0f172a' }}>{selectedDocObj.course}</strong> &bull; Words: <strong>{selectedDocObj.totalWords}</strong> &bull; Authenticity: <strong style={{ color: '#16a34a' }}>{selectedDocObj.authenticityScore}%</strong>
                  </div>
                )}
              </div>

              {selectedDocObj && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Link
                    href={`/editor?docId=${selectedDocObj._id}`}
                    style={{
                      background: '#6FAF9A',
                      color: '#0D1110',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(111, 175, 154, 0.35)'
                    }}
                  >
                    Edit in Document Editor &rarr;
                  </Link>

                  <button
                    onClick={() => setPreviewDoc(selectedDocObj)}
                    style={{
                      background: '#121417',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Preview Document Text
                  </button>
                </div>
              )}
            </div>

            {/* Sub-Tabs for Forensics */}
            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
              {[
                { id: 'heatmap', label: 'Contribution Heatmap Matrix' },
                { id: 'markup', label: 'Multi-Author Text Markup' },
                { id: 'timeline', label: 'Revision Flow & Timeline' },
                { id: 'ml_analytics', label: 'ML Revision Output' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id as any)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: inspectorTab === t.id ? '3px solid #d97706' : '3px solid transparent',
                    padding: '0.75rem 0.25rem',
                    fontSize: '0.86rem',
                    fontWeight: inspectorTab === t.id ? 800 : 600,
                    color: inspectorTab === t.id ? '#b45309' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Sub-Tab 1: Heatmap */}
            {inspectorTab === 'heatmap' && (
              <div>
                <ContributionHeatmap data={heatmap} />
              </div>
            )}

            {/* Sub-Tab 2: Markup */}
            {inspectorTab === 'markup' && (
              <div>
                <AuthorHighlightViewer markupData={authorMarkup} />
              </div>
            )}

            {/* Sub-Tab 3: Timeline & Growth */}
            {inspectorTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <WordGrowthChart data={growth} />
                <DocumentTimeline data={timeline} />
              </div>
            )}

            {/* Sub-Tab 4: ML Output */}
            {inspectorTab === 'ml_analytics' && (
              <div>
                <MLRevisionAnalytics documentId={selectedDocId} />
              </div>
            )}
          </div>
        )}

      </div>

      {/* ================= MODAL 1: READ-ONLY TEXT PREVIEW ================= */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '850px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Author: <strong>{previewDoc.ownerName}</strong> &bull; Course: <strong>{previewDoc.course}</strong>
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {previewDoc.title || previewDoc._id}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900, color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, lineHeight: 1.7, color: '#0f172a' }}>
              {previewDoc.content ? (
                <div dangerouslySetInnerHTML={{ __html: previewDoc.content }} style={{ fontFamily: 'serif', maxWidth: '700px', margin: '0 auto' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>
                  No content written for this document yet.
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Words: <strong>{previewDoc.totalWords || 0}</strong> &bull; Authenticity: <strong>{previewDoc.authenticityScore || 90}%</strong>
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{ background: '#121417', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: DELETE CONFIRMATION ================= */}
      {deleteDocId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '450px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1.15rem', fontWeight: 800 }}>
              Confirm Document Deletion
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete document <strong>{deleteDocId}</strong>? All associated telemetry and revision history will be purged.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setDeleteDocId(null)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.55rem 1.15rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteDocId)}
                style={{ background: '#dc2626', border: 'none', color: '#ffffff', padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
