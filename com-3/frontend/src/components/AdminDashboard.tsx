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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'individual' | 'submitted' | 'in_progress'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

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
    } catch {
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
        } catch {}
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `actual_database_all_documents_dataset.csv`;
      a.click();
      showToast(`Exported all ${rowCount} actual revisions from all documents!`, "success", "Download Complete");
    } catch {
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

  // Filtered users list
  const filteredUsers = usersList.filter(u => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.studentId && u.studentId.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const selectedDocObj = documents.find(d => d._id === selectedDocId) || null;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        padding: '2rem 2.5rem',
        color: '#0F172A',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* 1. Sleek Executive Header */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.75rem 2rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxWidth: '780px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#F1F5F9',
                  color: '#334155',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                  Superuser Console
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Authenticated as <strong style={{ color: '#0F172A' }}>{user?.name || user?.username || 'Administrator'}</strong>
                </span>
              </div>

              <h1 style={{
                margin: 0,
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#0F172A'
              }}>
                System Administration &amp; Document Registry
              </h1>

              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5 }}>
                Centralized academic integrity oversight, multi-author contribution telemetry, cohort telemetry datasets, and permissions control.
              </p>
            </div>

            {/* Top Right Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportAllPlatformCSV}
                style={{
                  background: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = '#94A3B8';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                title="Download all actual student revisions across all documents as CSV"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Telemetry CSV {stats.totalRevisions ? `(${stats.totalRevisions})` : ''}
              </button>

              <Link
                href="/editor"
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#1E293B'}
                onMouseOut={e => e.currentTarget.style.background = '#0F172A'}
              >
                <span>Launch Document Editor</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>

          {/* 2. Sleek Minimalist KPI Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '1rem'
          }}>
            {/* Metric 1 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Documents
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F1F5F9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {stats.totalDocuments}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Full institutional repository
              </div>
            </div>

            {/* Metric 2 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Registered Users
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {stats.totalUsers}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                {stats.totalStudents} Students &bull; {stats.totalLecturers} Lecturers
              </div>
            </div>

            {/* Metric 3 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Words &amp; Telemetry
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F0F9FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {stats.totalWords.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Across {stats.totalRevisions} revision steps
              </div>
            </div>

            {/* Metric 4 */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cohort Authenticity
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: stats.avgAuthenticity >= 80 ? '#10B981' : '#D97706', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {stats.avgAuthenticity}%
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                {stats.totalAnomalies} burst events flagged
              </div>
            </div>
          </div>

          {/* 3. Refined Segmented Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '0.25rem'
          }}>
            {[
              { id: 'documents', label: 'All Documents', count: documents.length },
              { id: 'users', label: 'Platform Users', count: usersList.length },
              { id: 'inspector', label: 'Forensic Center', count: null }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2.5px solid #0F172A' : '2.5px solid transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    padding: '0.65rem 0.95rem',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    if (!isActive) e.currentTarget.style.color = '#0F172A';
                  }}
                  onMouseOut={e => {
                    if (!isActive) e.currentTarget.style.color = '#64748B';
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span style={{
                      background: isActive ? '#0F172A' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#64748B',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ================= TAB 1: ALL DOCUMENTS REGISTRY ================= */}
          {activeTab === 'documents' && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header with Search and Segment Filters */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Document Repository
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    Inspect real-time student authenticity, edit assignments, or inspect telemetry forensics.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search title, student, or ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '7px',
                        padding: '0.45rem 0.75rem 0.45rem 2rem',
                        fontSize: '0.82rem',
                        color: '#0F172A',
                        width: '240px',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={e => (e.target.style.borderColor = '#0F172A')}
                      onBlur={e => (e.target.style.borderColor = '#CBD5E1')}
                    />
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '7px', padding: '0.2rem', border: '1px solid #E2E8F0' }}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'submitted', label: 'Submitted' },
                      { id: 'in_progress', label: 'In Progress' },
                      { id: 'group', label: 'Group' },
                      { id: 'individual', label: 'Individual' },
                    ].map(f => {
                      const isSel = filterType === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFilterType(f.id as any)}
                          style={{
                            border: 'none',
                            background: isSel ? '#FFFFFF' : 'transparent',
                            color: isSel ? '#0F172A' : '#64748B',
                            fontWeight: isSel ? 700 : 500,
                            fontSize: '0.74rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700 }}>Title &amp; Course</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Format</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Owner / Submitter</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Words &amp; Revs</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Authenticity</th>
                      <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, textAlign: 'right', minWidth: '240px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                          No documents match your query or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map(item => {
                        const isSelected = item._id === selectedDocId;
                        const isSubmitted = item.submissionStatus === 'submitted';
                        const isGoogle = item._id.startsWith('google_docs_') || item.source === 'google_docs';
                        const isWord = item._id.startsWith('microsoft_365_') || item.source === 'microsoft_365';

                        return (
                          <tr
                            key={item._id}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#F0FDF4' : '#FFFFFF',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseOver={e => {
                              if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                            }}
                            onMouseOut={e => {
                              if (!isSelected) e.currentTarget.style.background = '#FFFFFF';
                            }}
                          >
                            {/* Document Title */}
                            <td style={{ padding: '0.85rem 1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '5px',
                                  background: isGoogle ? '#EBF5FB' : isWord ? '#EFF6FF' : '#F1F5F9',
                                  color: isGoogle ? '#0284C7' : isWord ? '#2563EB' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  flexShrink: 0
                                }}>
                                  {isGoogle ? 'G' : isWord ? 'W' : 'D'}
                                </span>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.86rem' }}>
                                    {item.title || item._id}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                    {item.course || 'Software Engineering'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Format */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{
                                background: item.assignmentType === 'individual' ? '#F0F9FF' : '#F5F3FF',
                                color: item.assignmentType === 'individual' ? '#0369A1' : '#6D28D9',
                                border: `1px solid ${item.assignmentType === 'individual' ? '#BAE6FD' : '#DDD6FE'}`,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}>
                                {item.assignmentType === 'individual' ? 'Individual' : 'Group'}
                              </span>
                            </td>

                            {/* Owner */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <div style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: '#E2E8F0',
                                  color: '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}>
                                  {(item.ownerName || item.owner || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.82rem' }}>
                                    {item.ownerName || item.owner}
                                  </div>
                                  {item.studentId && (
                                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                      {item.studentId}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Words / Revs */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                {item.totalWords} words
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {item.revisionsCount || 1} revision steps
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{
                                background: isSubmitted ? '#ECFDF5' : '#FFFBEB',
                                color: isSubmitted ? '#047857' : '#B45309',
                                border: `1px solid ${isSubmitted ? '#A7F3D0' : '#FDE68A'}`,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSubmitted ? '#10B981' : '#F59E0B' }} />
                                {isSubmitted ? 'Submitted' : 'In Progress'}
                              </span>
                            </td>

                            {/* Authenticity Score */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{
                                background: item.authenticityScore >= 80 ? '#ECFDF5' : '#FFFBEB',
                                color: item.authenticityScore >= 80 ? '#047857' : '#B45309',
                                border: `1px solid ${item.authenticityScore >= 80 ? '#A7F3D0' : '#FDE68A'}`,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 800
                              }}>
                                {item.authenticityScore}%
                              </span>
                            </td>

                            {/* Actions Group */}
                            <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Link
                                  href={`/editor?docId=${item._id}`}
                                  style={{
                                    background: '#0F172A',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    borderRadius: '5px',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#1E293B'}
                                  onMouseOut={e => e.currentTarget.style.background = '#0F172A'}
                                >
                                  Edit
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocId(item._id);
                                    setActiveTab('inspector');
                                  }}
                                  style={{
                                    background: isSelected ? '#10B981' : '#F1F5F9',
                                    color: isSelected ? '#FFFFFF' : '#334155',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={e => {
                                    if (!isSelected) e.currentTarget.style.background = '#E2E8F0';
                                  }}
                                  onMouseOut={e => {
                                    if (!isSelected) e.currentTarget.style.background = '#F1F5F9';
                                  }}
                                >
                                  Forensics
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(item)}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#475569',
                                    borderRadius: '5px',
                                    padding: '0.35rem 0.55rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
                                  onMouseOut={e => e.currentTarget.style.background = '#FFFFFF'}
                                >
                                  Preview
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteDocId(item._id)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid #FEE2E2',
                                    color: '#EF4444',
                                    borderRadius: '5px',
                                    padding: '0.35rem 0.55rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={e => {
                                    e.currentTarget.style.background = '#FEE2E2';
                                  }}
                                  onMouseOut={e => {
                                    e.currentTarget.style.background = 'transparent';
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
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header with Search */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    User Accounts &amp; Permissions
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    Assign administrative privileges, lecturer roles, or manage student identifiers.
                  </p>
                </div>

                <div style={{ position: 'relative' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users by name, role, email..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '7px',
                      padding: '0.45rem 0.75rem 0.45rem 2rem',
                      fontSize: '0.82rem',
                      color: '#0F172A',
                      width: '260px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Users Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700 }}>User / Member</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Student / Staff ID</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Email Address</th>
                      <th style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>Role</th>
                      <th style={{ padding: '0.8rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Modify Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                          No users match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#F1F5F9',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>@{u.username}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              background: '#F1F5F9',
                              color: '#334155',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}>
                              {u.studentId || 'N/A'}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>
                            {u.email}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              background: u.role === 'admin' ? '#F5F3FF' : u.role === 'lecturer' ? '#EFF6FF' : u.role === 'group_leader' ? '#ECFDF5' : '#F1F5F9',
                              color: u.role === 'admin' ? '#7C3AED' : u.role === 'lecturer' ? '#2563EB' : u.role === 'group_leader' ? '#059669' : '#475569',
                              border: `1px solid ${u.role === 'admin' ? '#DDD6FE' : u.role === 'lecturer' ? '#BFDBFE' : u.role === 'group_leader' ? '#A7F3D0' : '#E2E8F0'}`,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              {u.role === 'admin' ? 'Administrator' : u.role === 'lecturer' ? 'Lecturer' : u.role === 'group_leader' ? 'Group Leader' : 'Student'}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                            <select
                              value={u.role || 'student'}
                              onChange={e => handleUpdateRole(u._id, e.target.value)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                color: '#0F172A',
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: FORENSIC INSPECTOR & HEATMAP ================= */}
          {activeTab === 'inspector' && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {/* Document Selector & Action Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Target Document:
                    </label>
                    <select
                      value={selectedDocId}
                      onChange={e => setSelectedDocId(e.target.value)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '7px',
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        color: '#0F172A',
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
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Owner: <strong style={{ color: '#0F172A' }}>{selectedDocObj.ownerName}</strong> &bull; Course: <strong style={{ color: '#0F172A' }}>{selectedDocObj.course}</strong> &bull; Words: <strong>{selectedDocObj.totalWords}</strong> &bull; Authenticity: <strong style={{ color: '#10B981' }}>{selectedDocObj.authenticityScore}%</strong>
                    </div>
                  )}
                </div>

                {selectedDocObj && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Link
                      href={`/editor?docId=${selectedDocObj._id}`}
                      style={{
                        background: '#0F172A',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>Open in Editor</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setPreviewDoc(selectedDocObj)}
                      style={{
                        background: '#FFFFFF',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Preview Text
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-Tabs for Forensics */}
              <div style={{ display: 'flex', gap: '1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                {[
                  { id: 'heatmap', label: 'Contribution Heatmap Matrix' },
                  { id: 'markup', label: 'Multi-Author Text Markup' },
                  { id: 'timeline', label: 'Revision Flow & Timeline' },
                  { id: 'ml_analytics', label: 'ML Revision Output' },
                ].map(t => {
                  const isSel = inspectorTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInspectorTab(t.id as any)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isSel ? '2px solid #0F172A' : '2px solid transparent',
                        padding: '0.65rem 0.2rem',
                        fontSize: '0.82rem',
                        fontWeight: isSel ? 700 : 500,
                        color: isSel ? '#0F172A' : '#64748B',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {selectedLoading ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748B' }}>
                  Loading forensic telemetry data...
                </div>
              ) : (
                <>
                  {inspectorTab === 'heatmap' && (
                    <div>
                      <ContributionHeatmap data={heatmap} />
                    </div>
                  )}

                  {inspectorTab === 'markup' && (
                    <div>
                      <AuthorHighlightViewer markupData={authorMarkup} />
                    </div>
                  )}

                  {inspectorTab === 'timeline' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <WordGrowthChart data={growth} />
                      <DocumentTimeline data={timeline} />
                    </div>
                  )}

                  {inspectorTab === 'ml_analytics' && (
                    <div>
                      <MLRevisionAnalytics documentId={selectedDocId} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ================= MODAL 1: READ-ONLY TEXT PREVIEW ================= */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Author: <strong style={{ color: '#0F172A' }}>{previewDoc.ownerName}</strong> &bull; Course: <strong style={{ color: '#0F172A' }}>{previewDoc.course}</strong>
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  {previewDoc.title || previewDoc._id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#64748B',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, lineHeight: 1.7, color: '#0F172A' }}>
              {previewDoc.content ? (
                <div dangerouslySetInnerHTML={{ __html: previewDoc.content }} style={{ fontFamily: 'Georgia, serif', maxWidth: '680px', margin: '0 auto', fontSize: '0.96rem' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748B', padding: '3rem 0' }}>
                  No content written for this document yet.
                </div>
              )}
            </div>

            <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Words: <strong style={{ color: '#0F172A' }}>{previewDoc.totalWords || 0}</strong> &bull; Authenticity: <strong style={{ color: '#10B981' }}>{previewDoc.authenticityScore || 90}%</strong>
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
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
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#991B1B', fontSize: '1.1rem', fontWeight: 800 }}>
              Confirm Document Deletion
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete document <strong style={{ color: '#0F172A' }}>{deleteDocId}</strong>? All telemetry and revision records will be permanently removed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setDeleteDocId(null)}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#475569',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDocument(deleteDocId)}
                style={{
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
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
