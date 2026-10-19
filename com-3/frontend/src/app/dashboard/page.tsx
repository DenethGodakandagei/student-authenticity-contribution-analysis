"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import ContributionHeatmap from '../../components/ContributionHeatmap';
import DocumentTimeline from '../../components/DocumentTimeline';
import WordGrowthChart from '../../components/WordGrowthChart';
import AuthorHighlightViewer from '../../components/AuthorHighlightViewer';
import MLRevisionAnalytics from '../../components/MLRevisionAnalytics';
import ShareModal from '../../components/ShareModal';
import { useAuth } from '../../context/AuthContext';
import { getApiBase, getBackendUrl } from '../../utils/apiConfig';
import { ToastContainer, ToastItem } from '../../components/CustomDialog';
import LecturerDashboard from '../../components/LecturerDashboard';
import AdminDashboard from '../../components/AdminDashboard';
import GuestDashboardView from '../../components/GuestDashboardView';

const API_BASE = getApiBase();

function DashboardComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docIdQuery = searchParams ? searchParams.get('selectedDocId') : null;
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<'documents' | 'team' | 'create' | 'ml_analytics' | 'insights' | 'comparison'>('documents');
  
  // Documents state
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(true);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc_collaborative_1');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | 'led' | 'shared' | 'individual' | 'group'>('all');

  // Analytics states for selected doc
  const [timeline, setTimeline] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [processSummary, setProcessSummary] = useState<any>(null);
  const [authorMarkup, setAuthorMarkup] = useState<any>(null);
  const [mlAnalytics, setMlAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Student Directory & Team states
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [teamTargetDocId, setTeamTargetDocId] = useState<string>('');
  const [selectedStudentForAdd, setSelectedStudentForAdd] = useState<string>('');
  const [manualStudentInput, setManualStudentInput] = useState<string>('');

  // Create Assignment / Document states
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocPrompt, setNewDocPrompt] = useState('');
  const [newDocSource, setNewDocSource] = useState('in_built');
  const [newDocAssignmentType, setNewDocAssignmentType] = useState<'group' | 'individual'>('group');
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [customMemberInput, setCustomMemberInput] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);

  // Share Modal State
  const [shareModalDoc, setShareModalDoc] = useState<any>(null);

  // Cross Group Compare States
  const [compareDocIds, setCompareDocIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const isUserLeader = user?.role === 'group_leader' || user?.role === 'lecturer' || user?.isLeader || false;
  const isUserLecturer = user?.role === 'lecturer';
  const [viewMode, setViewMode] = useState<'lecturer' | 'student'>('student');

  useEffect(() => {
    if (user?.role === 'lecturer') {
      setViewMode('lecturer');
    } else {
      setViewMode('student');
    }
  }, [user?.role]);

  // Load registered students (Classmates only - strictly excludes Admin & Lecturers)
  const loadStudents = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/users`);
      const data = await res.json();
      const studentsOnly = (data || []).filter((u: any) => {
        const r = (u.role || '').toLowerCase();
        const un = (u.username || '').toLowerCase();
        return r !== 'admin' && r !== 'lecturer' && r !== 'teacher' && r !== 'evaluator' && un !== 'admin' && un !== 'sansala';
      });
      setRegisteredStudents(studentsOnly);
    } catch (err) {
      console.error("Failed to fetch registered students", err);
    }
  };

  // Load documents accessible to user
  const loadDocuments = async () => {
    if (!user) {
      setAvailableDocs([]);
      setDocsLoading(false);
      return;
    }
    try {
      if (availableDocs.length === 0) {
        setDocsLoading(true);
      }
      let url = API_BASE;
      const params = new URLSearchParams();
      if (user.username) params.append('username', user.username);
      if (user.studentId) params.append('studentId', user.studentId);
      if (user.email) params.append('email', user.email);
      if (user.role) params.append('role', user.role);
      url += `?${params.toString()}`;

      const res = await fetch(url);
      const docs = await res.json();
      const list = Array.isArray(docs) ? docs : [];
      setAvailableDocs(list);

      // Cache for seamless instant return without flicker
      if (typeof window !== 'undefined') {
        try {
          const userKey = `inkie_docs_${user.studentId || user.username}`;
          sessionStorage.setItem(userKey, JSON.stringify(list));
        } catch (e) {}
      }

      if (docIdQuery && list.some((d: any) => d._id === docIdQuery)) {
        setSelectedDocId(docIdQuery);
      } else if (list.length > 0 && !list.some((d: any) => d._id === selectedDocId)) {
        setSelectedDocId(list[0]._id);
      } else if (list.length === 0) {
        setSelectedDocId('');
      }
      if (list.length > 0 && (!teamTargetDocId || !list.some((d: any) => d._id === teamTargetDocId))) {
        setTeamTargetDocId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check session cache first for instant flicker-free rendering
      if (typeof window !== 'undefined') {
        try {
          const userKey = `inkie_docs_${user.studentId || user.username}`;
          const cached = sessionStorage.getItem(userKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAvailableDocs(parsed);
              setDocsLoading(false);
            }
          }
        } catch (e) {}
      }
      loadStudents();
      loadDocuments();
    } else {
      setAvailableDocs([]);
      setRegisteredStudents([]);
      setSelectedDocId('');
      setDocsLoading(false);
    }
  }, [isAuthenticated, user, docIdQuery]);

  // Fetch document analytics when selectedDocId changes
  const fetchDocAnalytics = async (isInitial = false) => {
    if (!selectedDocId || !isAuthenticated || !user) return;
    try {
      if (isInitial) setLoading(true);

      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          return await res.json();
        } catch (err) {
          return null;
        }
      };

      const [timelineRes, heatmapRes, growthRes, anomaliesRes, summaryRes, markupRes, mlAnalyticsRes] = await Promise.all([
        fetchJson(`${API_BASE}/${selectedDocId}/timeline`),
        fetchJson(`${API_BASE}/${selectedDocId}/heatmap`),
        fetchJson(`${API_BASE}/${selectedDocId}/growth`),
        fetchJson(`${API_BASE}/${selectedDocId}/anomalies`),
        fetchJson(`${API_BASE}/${selectedDocId}/process-summary`),
        fetchJson(`${API_BASE}/${selectedDocId}/author-markup`),
        fetchJson(`${getBackendUrl()}/api/documents/${selectedDocId}/revision-analytics`),
      ]);

      if (timelineRes !== null) setTimeline(timelineRes || []);
      if (heatmapRes !== null) setHeatmap(heatmapRes);
      if (growthRes !== null) setGrowth(growthRes || []);
      if (anomaliesRes !== null) setAnomalies(anomaliesRes || []);
      if (summaryRes !== null) setProcessSummary(summaryRes);
      if (markupRes !== null) setAuthorMarkup(markupRes);
      if (mlAnalyticsRes !== null) setMlAnalytics(mlAnalyticsRes);
    } catch (err) {
      console.error("Failed to load document analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDocId || !isAuthenticated || !user) return;
    fetchDocAnalytics(true);
    const interval = setInterval(() => fetchDocAnalytics(false), 5000);
    return () => clearInterval(interval);
  }, [selectedDocId, isAuthenticated, user]);

  // Handle adding student to document
  const handleAddStudentToDoc = async (targetId: string, identifier: string) => {
    if (!identifier || !targetId) {
      showToast("Please specify both a target document and a student ID / email.", "error", "Selection Required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/${targetId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUsername: user?.username || '',
          currentStudentId: user?.studentId || '',
          currentUserEmail: user?.email || '',
          currentRole: user?.role || '',
          targetUserIdentifier: identifier.trim(),
          action: 'add'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add student");
      showToast(`Member "${identifier}" successfully added to document!`, "success", "Member Added");
      setSelectedStudentForAdd('');
      setManualStudentInput('');
      await loadDocuments();
    } catch (err: any) {
      showToast(err.message, "error", "Failed to Add Student");
    }
  };

  // Handle removing student from document
  const handleRemoveStudentFromDoc = async (targetId: string, identifier: string) => {
    if (!identifier || !targetId) return;
    try {
      const res = await fetch(`${API_BASE}/${targetId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUsername: user?.username || '',
          currentStudentId: user?.studentId || '',
          currentUserEmail: user?.email || '',
          currentRole: user?.role || '',
          targetUserIdentifier: identifier.trim(),
          action: 'remove'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove student");
      showToast(`Student removed from document.`, "info", "Access Revoked");
      await loadDocuments();
    } catch (err: any) {
      showToast(err.message, "error", "Revocation Error");
    }
  };

  // Handle create assignment / document
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      showToast("Please enter a title for the assignment or document.", "error", "Title Required");
      return;
    }
    setCreateLoading(true);
    try {
      const parsedCustom = newDocAssignmentType === 'individual' ? [] : customMemberInput.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
      const combinedMembers = newDocAssignmentType === 'individual' ? [] : Array.from(new Set([...selectedNewMembers, ...parsedCustom]));

      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocTitle.trim(),
          content: newDocPrompt.trim()
            ? `<h2>${newDocTitle.trim()}</h2><p>${newDocPrompt.trim()}</p>`
            : undefined,
          owner: user?.username || 'student',
          ownerName: user?.name || user?.username || (newDocAssignmentType === 'individual' ? 'Student Author' : 'Student Leader'),
          studentId: user?.studentId || '',
          source: newDocSource,
          assignmentType: newDocAssignmentType,
          members: combinedMembers
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create assignment");
      showToast(`${newDocAssignmentType === 'individual' ? 'Individual assignment' : 'Group project'} created! Launching editor...`, "success", "Assignment Created");
      setNewDocTitle('');
      setNewDocPrompt('');
      setSelectedNewMembers([]);
      setCustomMemberInput('');
      setNewDocAssignmentType('group');
      await loadDocuments();
      router.push(`/editor?docId=${data.document._id}`);
    } catch (err: any) {
      showToast(err.message, "error", "Creation Failed");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCompareSelect = (docId: string) => {
    setCompareDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const runCrossGroupAnalysis = async () => {
    if (compareDocIds.length < 2) {
      showToast("Please select at least 2 documents to compare cross-group authenticity.", "error", "Comparison Required");
      return;
    }
    setCompareLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cross-group-analysis?docIds=${compareDocIds.join(',')}`);
      const data = await res.json();
      setComparisonResult(data);
    } catch (err) {
      console.error("Failed to fetch comparison analysis", err);
    } finally {
      setCompareLoading(false);
    }
  };

  const checkIsOwner = (d: any, u: any): boolean => {
    if (!d || !u) return false;
    const cleanOwner = (d.owner || '').toLowerCase().trim();
    const cleanOwnerName = (d.ownerName || '').toLowerCase().trim();
    const uUsername = (u.username || '').toLowerCase().trim();
    const uStudentId = (u.studentId || '').toLowerCase().trim();
    const uEmail = (u.email || '').toLowerCase().trim();
    const uName = (u.name || '').toLowerCase().trim();

    if (cleanOwner && (cleanOwner === uUsername || cleanOwner === uStudentId || cleanOwner === uEmail)) {
      return true;
    }
    if (cleanOwnerName) {
      if (uName && cleanOwnerName === uName) return true;
      if (uStudentId && (cleanOwnerName === uStudentId || cleanOwnerName.includes(`(${uStudentId})`))) return true;
      if (uUsername && cleanOwnerName === uUsername) return true;
      const match = cleanOwnerName.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        const namePart = match[1].trim();
        const idParen = match[2].trim();
        if (uName && namePart === uName) return true;
        if (uStudentId && idParen === uStudentId) return true;
        if (uUsername && (namePart === uUsername || idParen === uUsername)) return true;
      }
    }
    return false;
  };

  const selectedDocObj = availableDocs.find((d: any) => d._id === selectedDocId) || availableDocs[0];
  const targetDocForTeam = availableDocs.find((d: any) => d._id === teamTargetDocId) || selectedDocObj;

  // Filtered documents list
  const filteredDocs = availableDocs.filter((d: any) => {
    const matchesSearch = !docSearchQuery ||
      (d.title || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (d._id || '').toLowerCase().includes(docSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const isOwner = checkIsOwner(d, user);

    if (docFilter === 'led') return isOwner;
    if (docFilter === 'shared') return !isOwner;
    if (docFilter === 'individual') return d.assignmentType === 'individual';
    if (docFilter === 'group') return d.assignmentType !== 'individual';
    return true;
  });

  // Dynamic Document Evolution & Research Metrics
  const rawDocWords = selectedDocObj?.content
    ? selectedDocObj.content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
    : 0;
  const authorSegmentWords = authorMarkup?.segments?.reduce((sum: number, s: any) => sum + (s.words || 0), 0) || 0;
  const totalWords = Math.max(authorSegmentWords, rawDocWords);

  const activeAuthors = authorMarkup?.authors || selectedDocObj?.collaborators || [selectedDocObj?.ownerName || 'Author'];
  const activeAuthorsCount = Math.max(1, activeAuthors.length);
  const revisionsCount = timeline?.length || mlAnalytics?.totalRevisions || (authorMarkup?.segments?.length || 1);
  const pasteAnomaliesCount = anomalies?.length || 0;

  // Batch paste ratio vs incremental drafting (Proposal Section 3.2 Process Telemetry)
  const batchPastePercent = pasteAnomaliesCount > 0 ? Math.min(35, pasteAnomaliesCount * 6) : 0;
  const incrementalDraftingPercent = Math.max(65, 100 - batchPastePercent);

  // Workload equity score (Gini / Parity among collaborative co-authors)
  let workloadEquityScore = 90;
  if (activeAuthorsCount > 1 && totalWords > 0 && authorMarkup?.segments && authorMarkup.segments.length > 0) {
    const authorWordMap: Record<string, number> = {};
    activeAuthors.forEach((a: string) => { authorWordMap[a] = 0; });
    authorMarkup.segments.forEach((s: any) => {
      const a = s.author || 'Author';
      authorWordMap[a] = (authorWordMap[a] || 0) + (s.words || 0);
    });
    const shares = Object.values(authorWordMap).map(w => w / (totalWords || 1));
    const idealShare = 1 / activeAuthorsCount;
    const deviation = shares.reduce((acc, s) => acc + Math.abs(s - idealShare), 0) / 2;
    workloadEquityScore = Math.round(Math.max(40, Math.min(98, (1 - deviation) * 100)));
  } else if (activeAuthorsCount === 1) {
    workloadEquityScore = 95;
  }

  // Composite Contribution Authenticity Score
  const authenticityScore = Math.round(0.6 * workloadEquityScore + 0.4 * incrementalDraftingPercent);

  const handleDownloadJSON = async () => {
    try {
      showToast("Preparing JSON dataset download...", "info", "Exporting");
      const res = await fetch(`${API_BASE}/${selectedDocId}/export?format=json`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (selectedDocObj?.title || selectedDocId).replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${safeTitle}_dataset.json`;
        a.click();
        showToast("Document dataset exported as JSON", "success", "Download Complete");
      } else {
        const blob = new Blob([JSON.stringify({
          documentId: selectedDocId,
          title: selectedDocObj?.title,
          authors: activeAuthors,
          totalWords,
          revisions: timeline,
          mlAnalytics: mlAnalytics,
          authenticityScore,
          workloadEquityScore
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedDocId}_dataset.json`;
        a.click();
        showToast("Document dataset exported as JSON", "success", "Download Complete");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to export JSON dataset", "error", "Export Failed");
    }
  };

  const handleDownloadCSV = async () => {
    try {
      showToast("Preparing ML training CSV dataset download...", "info", "Exporting");
      const res = await fetch(`${API_BASE}/${selectedDocId}/export?format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (selectedDocObj?.title || selectedDocId).replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${safeTitle}_ml_dataset.csv`;
        a.click();
        showToast("ML training dataset exported as CSV file", "success", "Download Complete");
      } else {
        // Flat, Machine Learning training format fallback (100% pandas.read_csv compatible)
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/\r\n|\r|\n/g, ' ').replace(/"/g, '""');
          return `"${str}"`;
        };

        const headers = [
          "revision_id",
          "document_id",
          "document_title",
          "step_number",
          "timestamp",
          "author",
          "anonymized_author_id",
          "section",
          "source_platform",
          "before_text",
          "after_text",
          "added_text",
          "deleted_text",
          "word_count_added",
          "word_count_deleted",
          "net_word_change",
          "predicted_intent",
          "predicted_significance",
          "confidence",
          "semantic_distance",
          "is_bulk_insertion",
          "anomaly_flag",
          "authenticity_score",
          "workload_equity_score",
          "explanation"
        ];

        let csv = headers.join(',') + '\n';
        (timeline || []).forEach((r: any, i: number) => {
          const row = [
            escapeCsv(r._id || `rev_${i + 1}`),
            escapeCsv(selectedDocId),
            escapeCsv(selectedDocObj?.title || selectedDocId),
            i + 1,
            escapeCsv(new Date(r.timestamp).toISOString()),
            escapeCsv(r.author || 'Author'),
            escapeCsv(r.anonymizedAuthorId || `user_${i + 1}`),
            escapeCsv(r.section || 'General'),
            escapeCsv(r.sourcePlatform || 'in_built'),
            escapeCsv(r.beforeText || ''),
            escapeCsv(r.afterText || ''),
            escapeCsv(r.addedText || ''),
            escapeCsv(r.deletedText || ''),
            r.words_added || r.wordCountAdded || 0,
            r.words_deleted || r.wordCountDeleted || 0,
            (r.words_added || r.wordCountAdded || 0) - (r.words_deleted || r.wordCountDeleted || 0),
            escapeCsv(r.intent || r.predictedIntent || 'Content Addition'),
            escapeCsv(r.significance || r.predictedSignificance || 'Moderate'),
            Number((r.confidence || 0.95).toFixed(4)),
            Number((r.semanticDistance || 0.05).toFixed(4)),
            r.isBulkInsertion ? 1 : 0,
            escapeCsv(r.anomalyFlag || 'None'),
            authenticityScore,
            workloadEquityScore,
            escapeCsv(r.message || r.explanation || '')
          ];
          csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (selectedDocObj?.title || selectedDocId).replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${safeTitle}_ml_dataset.csv`;
        a.click();
        showToast("ML training dataset exported as CSV file", "success", "Download Complete");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to export CSV dataset", "error", "Export Failed");
    }
  };

  // ML Revision Substantive Intent Rate
  let substantiveIntentPercent = 78;
  if (mlAnalytics?.intentDistribution) {
    const cAdd = mlAnalytics.intentDistribution['Content Addition'] || 0;
    const evid = mlAnalytics.intentDistribution['Evidence/Citation Addition'] || 0;
    const reorg = mlAnalytics.intentDistribution['Structural Reorganization'] || 0;
    const totalIntents = Object.values(mlAnalytics.intentDistribution).reduce((a: any, b: any) => a + b, 0) as number;
    if (totalIntents > 0) {
      substantiveIntentPercent = Math.round(Math.max(25, Math.min(96, ((cAdd + evid + reorg) / totalIntents) * 100)));
    }
  }

  // ML Revision Significance Rate
  let significanceRatePercent = 82;
  if (mlAnalytics?.significanceDistribution) {
    const major = mlAnalytics.significanceDistribution['Major'] || 0;
    const mod = mlAnalytics.significanceDistribution['Moderate'] || 0;
    const totalSig = Object.values(mlAnalytics.significanceDistribution).reduce((a: any, b: any) => a + b, 0) as number;
    if (totalSig > 0) {
      significanceRatePercent = Math.round(Math.max(30, Math.min(98, ((major * 1.0 + mod * 0.75) / totalSig) * 100)));
    }
  }

  // Process Evolution & Growth Tracking Score
  const processEvolutionScore = Math.round(Math.max(45, Math.min(98, 68 + Math.min(26, revisionsCount * 3) - (pasteAnomaliesCount * 8))));

  // Weighted Standing Index
  const weightedCompositeIndex = Math.round(
    0.35 * processEvolutionScore +
    0.25 * workloadEquityScore +
    0.25 * substantiveIntentPercent +
    0.15 * significanceRatePercent
  );

  // Security Gate 1: Unauthenticated visitors do not see any documents
  if (!isAuthenticated || !user) {
    return (
      <GuestDashboardView onSignIn={() => openAuthModal()} />
    );
  }

  // Security Gate 2: Administrators access executive superuser dashboard
  if (user?.role === 'admin' || user?.username === 'admin') {
    return (
      <AdminDashboard />
    );
  }

  // Security Gate 3: Lecturers access supervisor evaluation dashboard
  if (isUserLecturer) {
    return (
      <LecturerDashboard />
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div className="dashboard-container">
        
        {/* 1. Top Success Notification Banner */}
        <div style={{
          background: 'rgba(163, 230, 53, 0.16)',
          border: '1px solid rgba(163, 230, 53, 0.35)',
          color: '#275306',
          padding: '0.8rem 1.4rem',
          borderRadius: '12px',
          fontSize: '0.86rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Document Evolution Pipeline Active: Real-time multi-author contributions, collaborative revision history, and ML intent classifications are synchronized.</span>
          <span style={{ fontSize: '0.78rem', background: '#275306', color: '#ffffff', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
            Live Telemetry
          </span>
        </div>

        {/* 2. Document Selector & Quick Action Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.5rem 0'
        }}>
          {/* Left: Document Selector & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              DOCUMENT / ASSIGNMENT:
            </span>

            <select
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '9999px',
                padding: '0.45rem 1.25rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              {docsLoading && availableDocs.length === 0 ? (
                <option value="">Loading assignments...</option>
              ) : availableDocs.length === 0 ? (
                <option value="">No assignments assigned yet</option>
              ) : (
                availableDocs.map((doc: any) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.title || doc._id}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={() => setActiveTab('create')}
              style={{
                background: '#121417',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.45rem 1.15rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#1e2227'}
              onMouseOut={e => e.currentTarget.style.background = '#121417'}
            >
              <span>+</span> Create Assignment
            </button>

            {isUserLeader && (
              <button
                onClick={() => setActiveTab('team')}
                style={{
                  background: '#a3e635',
                  color: '#121417',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(163, 230, 53, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#8ee01d'}
                onMouseOut={e => e.currentTarget.style.background = '#a3e635'}
              >
                <span>+</span> Add Teammate to Group
              </button>
            )}
          </div>

          {/* Right: Sync Revisions Button */}
          <button
            onClick={() => {
              loadDocuments();
              fetchDocAnalytics(true);
              showToast("Document revisions & author metrics refreshed", "info", "Synced");
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              padding: '0.45rem 1.1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <span>↻</span> Sync Revisions
          </button>
        </div>

        {/* 3. Two Research-Aligned Cards Grid or Empty Welcome State */}
        {docsLoading && availableDocs.length === 0 ? (
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '220px',
            gap: '1rem',
            color: '#64748b'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid #f1f5f9',
              borderTopColor: '#a3e635',
              animation: 'spin 0.8s linear infinite'
            }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                Synchronizing assignments &amp; telemetry...
              </p>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Connecting to collaborative document evolution pipeline
              </span>
            </div>
          </div>
        ) : availableDocs.length === 0 ? (
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(163, 230, 53, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#121417'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Welcome to Inkie, {user?.name || user?.username}!
              </h3>
              <p style={{ margin: '0.4rem auto 0 auto', fontSize: '0.88rem', color: '#64748b', maxWidth: '580px', lineHeight: 1.5 }}>
                You do not have any assignments or collaborative documents yet. You can create your first document as a group leader, or have your project leader invite your Student ID (<strong>{user?.studentId || 'N/A'}</strong>) to join an active group assignment.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setActiveTab('create')}
                style={{
                  background: '#a3e635',
                  color: '#121417',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.55rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 8px rgba(163, 230, 53, 0.3)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#8ee01d'}
                onMouseOut={e => e.currentTarget.style.background = '#a3e635'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create New Assignment
              </button>

              <button
                onClick={() => setActiveTab('team')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  borderRadius: '9999px',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                View Student Directory
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '1.5rem'
          }}>
          {/* Card 1: Document Evolution & Contribution Authenticity (Core Research) */}
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Document Evolution &amp; Contribution Authenticity
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Process-based multi-author drafting telemetry, revision provenance &amp; workload equity
                  </p>
                </div>
                <span style={{
                  background: pasteAnomaliesCount === 0 && workloadEquityScore >= 75
                    ? 'rgba(34, 197, 94, 0.1)'
                    : pasteAnomaliesCount > 0
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(245, 158, 11, 0.1)',
                  color: pasteAnomaliesCount === 0 && workloadEquityScore >= 75
                    ? '#16a34a'
                    : pasteAnomaliesCount > 0
                    ? '#ef4444'
                    : '#d97706',
                  border: `1px solid ${pasteAnomaliesCount === 0 && workloadEquityScore >= 75 ? 'rgba(34, 197, 94, 0.25)' : pasteAnomaliesCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: pasteAnomaliesCount === 0 && workloadEquityScore >= 75
                      ? '#22c55e'
                      : pasteAnomaliesCount > 0
                      ? '#ef4444'
                      : '#f59e0b'
                  }} />
                  {pasteAnomaliesCount === 0 && workloadEquityScore >= 75
                    ? 'Verified Organic Evolution'
                    : pasteAnomaliesCount > 0
                    ? 'Batch Pastes Detected'
                    : 'Active Multi-Author Iteration'}
                </span>
              </div>

              {/* Big Score Display */}
              <div style={{ margin: '1.25rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {authenticityScore}%
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    CONTRIBUTION AUTHENTICITY SCORE
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                  Genuine collaborative document evolution verified against iterative revision history and multi-author workload parity.
                </p>
              </div>

              {/* Metric Mini Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Incremental Drafting</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                    {incrementalDraftingPercent}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>Iterative rhythm</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Workload Parity</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0ea5e9', marginTop: '0.2rem' }}>
                    {workloadEquityScore}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>{activeAuthorsCount} co-author(s)</div>
                </div>

                <div style={{
                  background: batchPastePercent > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(163, 230, 53, 0.12)',
                  border: `1px solid ${batchPastePercent > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(163, 230, 53, 0.3)'}`,
                  borderRadius: '10px',
                  padding: '0.85rem 0.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.74rem', color: batchPastePercent > 0 ? '#ef4444' : '#275306', fontWeight: 600 }}>Batch Paste Ratio</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: batchPastePercent > 0 ? '#ef4444' : '#275306', marginTop: '0.2rem' }}>
                    {batchPastePercent}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: batchPastePercent > 0 ? '#ef4444' : '#275306', marginTop: '0.15rem' }}>
                    {pasteAnomaliesCount > 0 ? `${pasteAnomaliesCount} spike(s)` : 'Zero bursts'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Compact Sleek Design */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.45rem', marginTop: '0.65rem' }}>
              <button
                onClick={() => router.push(`/editor?docId=${selectedDocId}`)}
                style={{
                  background: '#a3e635',
                  color: '#121417',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.42rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 6px rgba(163, 230, 53, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#8ee01d'}
                onMouseOut={e => e.currentTarget.style.background = '#a3e635'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Open in Editor
              </button>

              <button
                onClick={() => setActiveTab('ml_analytics')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  borderRadius: '9999px',
                  padding: '0.42rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Author Highlights
              </button>

              <button
                onClick={handleDownloadJSON}
                style={{
                  background: '#121417',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.42rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#272b30'}
                onMouseOut={e => e.currentTarget.style.background = '#121417'}
                title="Download full document evolution telemetry as JSON"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Download JSON
              </button>

              <button
                onClick={handleDownloadCSV}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.42rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#0369a1'}
                onMouseOut={e => e.currentTarget.style.background = '#0284c7'}
                title="Download ML training dataset as CSV (clean, flat tabular format for Pandas, PyTorch & Scikit-learn)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
                Download CSV
              </button>
            </div>
          </div>

          {/* Card 2: Document Evolution Standing */}
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Document Evolution Standing
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    ML Revision Intent &amp; Significance Quality Analytics
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                  Total {totalWords} words &bull; {revisionsCount} revisions
                </span>
              </div>

              {/* Blue Weighted Revision Progress Box */}
              <div style={{
                background: 'rgba(14, 165, 233, 0.08)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    WEIGHTED EVOLUTION SCORE
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, marginTop: '0.15rem' }}>
                    Composite index across process velocity, co-author equity &amp; ML intent depth
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0ea5e9' }}>
                  {weightedCompositeIndex}%
                </div>
              </div>

              {/* Progress Bars Breakdown for Research Dimensions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Process Evolution &amp; Growth Tracking (35%)</span>
                    <span style={{ color: '#275306', fontWeight: 700 }}>{processEvolutionScore}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${processEvolutionScore}%`, height: '100%', background: '#a3e635', borderRadius: '9999px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Multi-Author Workload Equity (25%)</span>
                    <span style={{ color: '#0ea5e9', fontWeight: 700 }}>{workloadEquityScore}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${workloadEquityScore}%`, height: '100%', background: '#0ea5e9', borderRadius: '9999px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Substantive Intent Classification (25%)</span>
                    <span style={{ color: '#6366f1', fontWeight: 700 }}>{substantiveIntentPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${substantiveIntentPercent}%`, height: '100%', background: '#6366f1', borderRadius: '9999px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Revision Significance Depth (15%)</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{significanceRatePercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${significanceRatePercent}%`, height: '100%', background: '#121417', borderRadius: '9999px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* 4. Tab Navigation Bar matching Component 1 in photo */}
        <div style={{
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          gap: '2rem',
          marginTop: '0.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {[
            { id: 'documents', label: 'My Documents & Assignments' },
            { id: 'team', label: 'Student Directory & Team Manager' },
            { id: 'create', label: 'Create Assignment / Document' },
            { id: 'ml_analytics', label: 'ML Revision Analytics' },
            { id: 'insights', label: 'Document Insights' },
            { id: 'comparison', label: 'Cross-Group Comparison' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #121417' : '3px solid transparent',
                  padding: '0.75rem 0.25rem',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 5. Tab Content Sections */}

        {/* TAB 1: My Documents & Assignments */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  My Documents & Assignments
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Documents you have created as group leader or have been invited to collaborate on.
                </p>
              </div>

              {/* Search & Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={docSearchQuery}
                  onChange={e => setDocSearchQuery(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.84rem',
                    color: '#0f172a',
                    width: '200px',
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '0.2rem', flexWrap: 'wrap', gap: '0.2rem' }}>
                  <button
                    onClick={() => setDocFilter('all')}
                    style={{
                      border: 'none',
                      background: docFilter === 'all' ? '#ffffff' : 'transparent',
                      color: docFilter === 'all' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDocFilter('individual')}
                    style={{
                      border: 'none',
                      background: docFilter === 'individual' ? '#ffffff' : 'transparent',
                      color: docFilter === 'individual' ? '#0369a1' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setDocFilter('group')}
                    style={{
                      border: 'none',
                      background: docFilter === 'group' ? '#ffffff' : 'transparent',
                      color: docFilter === 'group' ? '#4338ca' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Group Projects
                  </button>
                  <button
                    onClick={() => setDocFilter('led')}
                    style={{
                      border: 'none',
                      background: docFilter === 'led' ? '#ffffff' : 'transparent',
                      color: docFilter === 'led' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Led by Me
                  </button>
                  <button
                    onClick={() => setDocFilter('shared')}
                    style={{
                      border: 'none',
                      background: docFilter === 'shared' ? '#ffffff' : 'transparent',
                      color: docFilter === 'shared' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Shared With Me
                  </button>
                </div>
              </div>
            </div>

            {/* Document Cards Grid */}
            {docsLoading && availableDocs.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid #f1f5f9',
                  borderTopColor: '#0ea5e9',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 0.75rem auto'
                }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  Loading your documents &amp; assignments...
                </div>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  No documents found
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  You have not created any documents or joined any collaborative group assignments yet.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  style={{
                    background: '#a3e635',
                    color: '#121417',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Create Your First Assignment
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {filteredDocs.map((doc: any) => {
                  const isOwner = checkIsOwner(doc, user);

                  return (
                    <div
                      key={doc._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      <div>
                        {/* Header Badges: Source & Assignment Type prominently displayed above title */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                              background: doc.source === 'google_docs' ? '#e8f0fe' : doc.source === 'microsoft_365' ? '#deecf9' : 'rgba(163, 230, 53, 0.16)',
                              color: doc.source === 'google_docs' ? '#1a73e8' : doc.source === 'microsoft_365' ? '#0078d4' : '#275306',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}>
                              {doc.source === 'google_docs' ? 'Google Docs' : doc.source === 'microsoft_365' ? 'Microsoft 365' : 'In-Built Editor'}
                            </span>

                            <span style={{
                              background: doc.assignmentType === 'individual' ? '#e0f2fe' : '#eef2ff',
                              color: doc.assignmentType === 'individual' ? '#0369a1' : '#4338ca',
                              border: `1px solid ${doc.assignmentType === 'individual' ? '#bae6fd' : '#c7d2fe'}`,
                              padding: '0.2rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {doc.assignmentType === 'individual' ? (
                                  <>
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                  </>
                                ) : (
                                  <>
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                  </>
                                )}
                              </svg>
                              {doc.assignmentType === 'individual' ? 'Individual Assignment' : 'Group Collaborative Project'}
                            </span>
                          </div>

                          <span style={{
                            background: isOwner ? 'rgba(163, 230, 53, 0.16)' : '#f1f5f9',
                            color: isOwner ? '#275306' : '#64748b',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: 700
                          }}>
                            {doc.assignmentType === 'individual'
                              ? (isOwner ? 'Student Author (You)' : `Author: ${doc.ownerName || doc.owner || 'Student'}`)
                              : (isOwner ? 'Group Leader (You)' : `Leader: ${doc.ownerName || doc.owner || 'System'}`)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          {doc.title || doc._id}
                        </h4>

                        {/* Assignment Metadata (Course, Type, Submission Status) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                          <span style={{
                            background: doc.submissionStatus === 'submitted' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                            color: doc.submissionStatus === 'submitted' ? '#16a34a' : '#d97706',
                            border: `1px solid ${doc.submissionStatus === 'submitted' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <span style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: doc.submissionStatus === 'submitted' ? '#16a34a' : '#d97706'
                            }} />
                            {doc.submissionStatus === 'submitted' ? 'Submitted to Lecturer' : 'Draft in Progress'}
                          </span>

                          {doc.course && (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {doc.course}
                            </span>
                          )}

                          {doc.grade && (
                            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                              Grade: {doc.grade}
                            </span>
                          )}
                        </div>

                        {/* Lecturer Feedback (if evaluated) */}
                        {doc.lecturerFeedback && (
                          <div style={{
                            background: 'rgba(99, 102, 241, 0.06)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            padding: '0.6rem 0.75rem',
                            marginBottom: '0.65rem',
                            fontSize: '0.76rem',
                            color: '#334155',
                            lineHeight: 1.4
                          }}>
                            <strong style={{ color: '#4338ca' }}>Lecturer Feedback:</strong> {doc.lecturerFeedback}
                          </div>
                        )}

                        {/* Collaborators / Individual Author Details */}
                        {doc.assignmentType === 'individual' ? (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 700 }}>
                              👤 Individual Assignment &bull;
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Sole Author: <strong style={{ color: '#0f172a' }}>{doc.ownerName || doc.owner}</strong>
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                              Group Members ({doc.collaborators?.length || 1}):
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                              {(doc.collaborators || [doc.ownerName || 'Author']).slice(0, 4).map((c: string, idx: number) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '0.15rem 0.45rem',
                                    fontSize: '0.72rem',
                                    color: '#0f172a',
                                    fontWeight: 500
                                  }}
                                >
                                  {c}
                                </span>
                              ))}
                              {(doc.collaborators?.length || 0) > 4 && (
                                <span style={{ fontSize: '0.72rem', color: '#64748b', alignSelf: 'center' }}>
                                  +{doc.collaborators.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <button
                            onClick={() => router.push(`/editor?docId=${doc._id}`)}
                            style={{
                              background: '#a3e635',
                              color: '#121417',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              textAlign: 'center',
                              boxShadow: '0 2px 6px rgba(163, 230, 53, 0.35)'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#8ee01d'}
                            onMouseOut={e => e.currentTarget.style.background = '#a3e635'}
                          >
                            Open in Editor
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDocId(doc._id);
                              setActiveTab('ml_analytics');
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              color: '#0f172a',
                              borderRadius: '8px',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'center'
                            }}
                          >
                            ML Analytics
                          </button>
                        </div>

                        {/* Leader Quick Share / Add Member (Only for Group Projects) */}
                        {(isOwner || isUserLeader) && doc.assignmentType !== 'individual' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                setTeamTargetDocId(doc._id);
                                setActiveTab('team');
                              }}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                color: '#0f172a',
                                borderRadius: '8px',
                                padding: '0.45rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              + Add Member
                            </button>

                            <button
                              onClick={() => setShareModalDoc(doc)}
                              style={{
                                background: '#121417',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.45rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Manage Access
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Student Directory & Team Manager */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Student Directory & Team Management
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Search classmates registered in the contribution tracking platform & assign members to your group document.
              </p>
            </div>

            {/* Leader Console Box */}
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ background: '#a3e635', color: '#121417', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  LEADER ACTION
                </span>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Assign Student to Group Document
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                    1. Target Assignment / Document
                  </label>
                  <select
                    value={teamTargetDocId}
                    onChange={e => setTeamTargetDocId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      fontWeight: 600
                    }}
                  >
                    {availableDocs.map((d: any) => (
                      <option key={d._id} value={d._id}>
                        {d.title || d._id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                    2. Choose Registered Classmate
                  </label>
                  <select
                    value={selectedStudentForAdd}
                    onChange={e => {
                      setSelectedStudentForAdd(e.target.value);
                      if (e.target.value) setManualStudentInput('');
                    }}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      fontWeight: 600
                    }}
                  >
                    <option value="">-- Choose student from directory --</option>
                    {registeredStudents.map((st: any) => (
                      <option key={st._id} value={st.username || st.studentId}>
                        {st.name} ({st.studentId}) &bull; {st.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                    OR Enter IT Number / Student ID / Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IT23217522 or student@sliit.lk"
                    value={manualStudentInput}
                    onChange={e => {
                      setManualStudentInput(e.target.value);
                      if (e.target.value) setSelectedStudentForAdd('');
                    }}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <button
                    onClick={() => {
                      const idToAdd = manualStudentInput.trim() || selectedStudentForAdd;
                      handleAddStudentToDoc(teamTargetDocId, idToAdd);
                    }}
                    disabled={!manualStudentInput.trim() && !selectedStudentForAdd}
                    style={{
                      width: '100%',
                      background: (manualStudentInput.trim() || selectedStudentForAdd) ? '#a3e635' : '#e2e8f0',
                      color: (manualStudentInput.trim() || selectedStudentForAdd) ? '#121417' : '#94a3b8',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: (manualStudentInput.trim() || selectedStudentForAdd) ? 'pointer' : 'not-allowed',
                      boxShadow: (manualStudentInput.trim() || selectedStudentForAdd) ? '0 2px 8px rgba(163, 230, 53, 0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    + Add Member to Group
                  </button>
                </div>
              </div>

              {/* Members currently on this target document */}
              {targetDocForTeam && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Members with access to &quot;{targetDocForTeam.title}&quot;:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(targetDocForTeam.allowedUsers || [targetDocForTeam.owner || 'student']).map((u: string) => (
                      <span
                        key={u}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem'
                        }}
                      >
                        <span>{u}</span>
                        {u !== targetDocForTeam.owner && (
                          <button
                            onClick={() => handleRemoveStudentFromDoc(targetDocForTeam._id, u)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              padding: 0
                            }}
                            title="Remove student from document"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Student Directory Table */}
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Registered Classmates Directory ({registeredStudents.length})
                </h4>

                <input
                  type="text"
                  placeholder="Filter by name, ID, or email..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.84rem',
                    color: '#0f172a',
                    width: '260px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Student ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Email Address</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Platform Role</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredStudents
                      .filter(s => {
                        const r = (s.role || '').toLowerCase();
                        const un = (s.username || '').toLowerCase();
                        if (r === 'admin' || r === 'lecturer' || r === 'teacher' || r === 'evaluator' || un === 'admin' || un === 'sansala') {
                          return false;
                        }
                        return (
                          !studentSearch ||
                          (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
                          (s.studentId || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
                          (s.email || '').toLowerCase().includes(studentSearch.toLowerCase())
                        );
                      })
                      .map((st: any) => (
                        <tr key={st._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#0f172a' }}>
                            {st.name}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#0ea5e9', fontWeight: 600 }}>
                            {st.studentId}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#64748b' }}>
                            {st.email}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <span style={{
                              background: st.role === 'group_leader' ? 'rgba(163, 230, 53, 0.16)' : st.role === 'admin' ? '#fef3c7' : st.role === 'lecturer' ? '#e8f0fe' : '#f1f5f9',
                              color: st.role === 'group_leader' ? '#275306' : st.role === 'admin' ? '#b45309' : st.role === 'lecturer' ? '#1a73e8' : '#64748b',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              {st.role === 'group_leader' ? 'Group Leader' : st.role === 'admin' ? 'Administrator' : st.role === 'lecturer' ? 'Lecturer' : 'Student Member'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleAddStudentToDoc(teamTargetDocId, st.username || st.studentId)}
                              style={{
                                background: '#121417',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Add to Document
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Create Assignment / Document */}
        {activeTab === 'create' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
            }}>
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Create New Collaborative Assignment / Document
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                As group leader, initiate a new project, invite initial classmates, and launch directly into the real-time editor.
              </p>

              <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Assignment Work Type Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.45rem' }}>
                    Assignment Type *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNewDocAssignmentType('group');
                      }}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: newDocAssignmentType === 'group' ? '2px solid #121417' : '1px solid #e2e8f0',
                        background: newDocAssignmentType === 'group' ? '#f8fafc' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>👥</span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Group Collaborative Project</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Multi-author collaborative assignment with teammates & workload equity tracking.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewDocAssignmentType('individual');
                        setSelectedNewMembers([]);
                        setCustomMemberInput('');
                      }}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: newDocAssignmentType === 'individual' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: newDocAssignmentType === 'individual' ? '#f0f9ff' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>👤</span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: newDocAssignmentType === 'individual' ? '#0369a1' : '#0f172a' }}>Individual Assignment</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Personal coursework authored solely by you. No collaborators required.
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                    Assignment / Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Assignment 2 - Real-Time Analysis"
                    value={newDocTitle}
                    onChange={e => setNewDocTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                      Document Source / Platform
                    </label>
                    <select
                      value={newDocSource}
                      onChange={e => setNewDocSource(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    >
                      <option value="in_built">In-Built Collaborative Canvas</option>
                      <option value="google_docs">Google Docs Synchronized</option>
                      <option value="microsoft_365">Microsoft 365 Synchronized</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                      {newDocAssignmentType === 'individual' ? 'Student Author' : 'Group Leader'}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user ? `${user.name || user.username} (${user.studentId || 'Student'})` : 'Guest / System'}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#f1f5f9',
                        color: '#64748b',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                    Initial Outline / Instructions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter project requirements, section outlines, or research instructions..."
                    value={newDocPrompt}
                    onChange={e => setNewDocPrompt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Teammates Section: Shown only for Group Projects */}
                {newDocAssignmentType === 'group' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                        Select Initial Teammates to Invite ({selectedNewMembers.length} selected)
                      </label>
                      <div style={{
                        maxHeight: '160px',
                        overflowY: 'auto',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}>
                        {registeredStudents.map((st: any) => {
                          const isSelected = selectedNewMembers.includes(st.username || st.studentId);
                          return (
                            <label
                              key={st._id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                color: isSelected ? '#0f172a' : '#64748b',
                                fontWeight: isSelected ? 700 : 500
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const key = st.username || st.studentId;
                                  setSelectedNewMembers(prev =>
                                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                  );
                                }}
                              />
                              <span>{st.name} ({st.studentId}) &bull; {st.email}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                        Or Enter Additional IT Numbers / Emails / Usernames (comma or space separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. IT23217522, student@sliit.lk, rashi"
                        value={customMemberInput}
                        onChange={e => setCustomMemberInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          border: '1.5px solid #e2e8f0',
                          background: '#f8fafc',
                          color: '#0f172a',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem' }}>
                        Assigned students can immediately view and edit this assignment upon signing in, even if they register later.
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{
                    padding: '1rem 1.25rem',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '10px',
                    color: '#0369a1',
                    fontSize: '0.85rem',
                    lineHeight: 1.5
                  }}>
                    <strong>👤 Individual Assignment Selected:</strong> You are the sole author of this document. No other students will be added or allowed to modify your work.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    background: '#a3e635',
                    color: '#121417',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: createLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(163, 230, 53, 0.4)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    if (!createLoading) e.currentTarget.style.background = '#8ee01d';
                  }}
                  onMouseOut={e => {
                    if (!createLoading) e.currentTarget.style.background = '#a3e635';
                  }}
                >
                  {createLoading ? 'Creating Assignment...' : 'Create & Launch in Editor'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: ML Revision Analytics */}
        {activeTab === 'ml_analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <MLRevisionAnalytics documentId={selectedDocId} />
            <AuthorHighlightViewer markupData={authorMarkup} />
          </div>
        )}

        {/* TAB 5: Document Insights (Timeline, Heatmap, Growth) */}
        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Active Document Selector for Insights */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ACTIVE DOCUMENT INSIGHTS
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                  {availableDocs.find((d: any) => d._id === selectedDocId)?.title || selectedDocId}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Select Document:</span>
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {availableDocs.map((doc: any) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.title || doc._id}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ background: 'rgba(163, 230, 53, 0.2)', color: '#275306', padding: '0.4rem 0.8rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800 }}>
                    {timeline.length} Revisions
                  </span>
                  <span style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', padding: '0.4rem 0.8rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800 }}>
                    {heatmap?.authors?.length || 0} Contributors
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Document Evolution Timeline
                </h4>
                <DocumentTimeline data={timeline} />
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Cumulative Word Growth Chart
                </h4>
                <WordGrowthChart data={growth} />
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Contribution Heatmap Matrix
              </h4>
              <ContributionHeatmap data={heatmap} />
            </div>
          </div>
        )}

        {/* TAB 6: Cross-Group Comparison */}
        {activeTab === 'comparison' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Cross-Group Document Comparison
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#64748b' }}>
                Select 2 or more student documents to benchmark contribution velocity and authenticity across cohorts.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {availableDocs.map((doc: any) => {
                  const isChecked = compareDocIds.includes(doc._id);
                  return (
                    <button
                      key={doc._id}
                      onClick={() => handleCompareSelect(doc._id)}
                      style={{
                        background: isChecked ? '#121417' : '#f8fafc',
                        color: isChecked ? '#ffffff' : '#0f172a',
                        border: `1px solid ${isChecked ? '#121417' : '#e2e8f0'}`,
                        borderRadius: '9999px',
                        padding: '0.45rem 1rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isChecked ? '[Selected] ' : '+ '} {doc.title || doc._id}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={runCrossGroupAnalysis}
                disabled={compareLoading || compareDocIds.length < 2}
                style={{
                  background: '#a3e635',
                  color: '#121417',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: compareLoading || compareDocIds.length < 2 ? 'not-allowed' : 'pointer',
                  opacity: compareDocIds.length < 2 ? 0.6 : 1
                }}
              >
                {compareLoading ? 'Comparing Cohorts...' : `Benchmark Selected Documents (${compareDocIds.length})`}
              </button>
            </div>

            {comparisonResult && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Cross-Group Benchmark Results
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {comparisonResult.groups?.map((grp: any) => (
                    <div key={grp.documentId} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                        {grp.title || grp.documentId}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Revisions: <strong style={{ color: '#0f172a' }}>{grp.totalRevisions}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Words: <strong style={{ color: '#0f172a' }}>{grp.totalWords}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Authenticity Score: <strong style={{ color: '#16a34a' }}>{grp.authenticityScore || 30}%</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Share Modal */}
      {shareModalDoc && (
        <ShareModal
          isOpen={Boolean(shareModalDoc)}
          onClose={() => setShareModalDoc(null)}
          documentId={shareModalDoc._id}
          docDetails={shareModalDoc}
          onShareUpdated={() => loadDocuments()}
        />
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading student dashboard...
      </div>
    }>
      <DashboardComponent />
    </Suspense>
  );
}
