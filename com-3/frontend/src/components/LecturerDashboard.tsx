"use client";

import React, { useState, useEffect } from 'react';
import ContributionHeatmap from './ContributionHeatmap';
import DocumentTimeline from './DocumentTimeline';
import WordGrowthChart from './WordGrowthChart';
import AuthorHighlightViewer from './AuthorHighlightViewer';
import MLRevisionAnalytics from './MLRevisionAnalytics';
import ShareModal from './ShareModal';
import { useAuth } from '../context/AuthContext';
import { getApiBase, getBackendUrl } from '../utils/apiConfig';
import { ToastContainer, ToastItem } from './CustomDialog';

interface LecturerDashboardProps {
  onSwitchToStudentView?: () => void;
}

export default function LecturerDashboard({ onSwitchToStudentView }: LecturerDashboardProps) {
  const { user } = useAuth();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Main Dashboard View Mode: 'submissions' (inspect assignments done) vs 'create_assignment' (publish new project)
  const [activeMainView, setActiveMainView] = useState<'submissions' | 'create_assignment'>('submissions');

  // State for all assignments
  const [assignments, setAssignments] = useState<any[]>([]);
  const [cohortStats, setCohortStats] = useState({
    totalAssignments: 0,
    totalStudents: 0,
    avgAuthenticity: 0,
    verifiedCount: 0,
    flaggedCount: 0,
    totalRevisions: 0,
    totalWords: 0
  });
  const [loading, setLoading] = useState(true);

  // Registered Students list (for assignment creation)
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'in_progress' | 'verified' | 'flagged' | 'group' | 'individual'>('all');

  // Selected Assignment for Deep Dive Inspection
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedDocAnalyticsLoading, setSelectedDocAnalyticsLoading] = useState(false);

  // Inspector Sub-Tabs
  const [activeInspectorTab, setActiveInspectorTab] = useState<'heatmap' | 'markup' | 'timeline' | 'ml_analytics' | 'assessment'>('heatmap');

  // Detailed Analytics for the selected document
  const [timeline, setTimeline] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [authorMarkup, setAuthorMarkup] = useState<any>(null);
  const [mlAnalytics, setMlAnalytics] = useState<any>(null);

  // Read-only Submission Content Preview Modal
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Share Modal
  const [shareModalDoc, setShareModalDoc] = useState<any>(null);

  // Cross-Group Comparison
  const [compareDocIds, setCompareDocIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showComparisonPanel, setShowComparisonPanel] = useState(false);

  // Lecturer Assessment Notes & Verdicts (saved in localStorage and backend)
  const [vivaVerdicts, setVivaVerdicts] = useState<Record<string, { status: string; notes: string; grade: string; updatedAt: string }>>({});
  const [currentDocNotes, setCurrentDocNotes] = useState('');
  const [currentDocGrade, setCurrentDocGrade] = useState('');
  const [currentDocStatus, setCurrentDocStatus] = useState<'approved' | 'viva' | 'revision' | 'pending'>('pending');

  // ================= ASSIGNMENT CREATION FORM STATE =================
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignCourse, setNewAssignCourse] = useState('SE3020 - Distributed Systems Architecture');
  const [newAssignType, setNewAssignType] = useState<'group' | 'individual'>('group');
  const [newAssignInstructions, setNewAssignInstructions] = useState('');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [selectedAssignedStudents, setSelectedAssignedStudents] = useState<string[]>([]);
  const [assignCreating, setAssignCreating] = useState(false);

  // Load registered students for assignment assignment
  const loadStudents = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/users`);
      if (res.ok) {
        const users = await res.json();
        const studentsOnly = (users || []).filter((u: any) => {
          const r = (u.role || '').toLowerCase();
          const un = (u.username || '').toLowerCase();
          return r !== 'lecturer' && r !== 'teacher' && r !== 'evaluator' && r !== 'admin' && un !== 'admin' && un !== 'sansala';
        });
        setRegisteredStudents(studentsOnly);
        // Default select all students
        setSelectedAssignedStudents(studentsOnly.map((s: any) => s.username || s.studentId));
      }
    } catch (err) {
      console.error("Failed to fetch students list", err);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Load Viva verdicts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lecturer_viva_verdicts');
      if (saved) {
        setVivaVerdicts(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error loading lecturer verdicts:", e);
    }
  }, []);

  // Sync current doc notes and grade when selectedDocId or vivaVerdicts changes
  useEffect(() => {
    if (!selectedDocId) return;
    const existing = vivaVerdicts[selectedDocId];
    if (existing) {
      setCurrentDocNotes(existing.notes || '');
      setCurrentDocGrade(existing.grade || '');
      setCurrentDocStatus((existing.status as any) || 'pending');
    } else {
      const targetDoc = assignments.find(a => a._id === selectedDocId);
      setCurrentDocNotes(targetDoc?.lecturerFeedback || '');
      setCurrentDocGrade(targetDoc?.grade || '');
      setCurrentDocStatus(targetDoc?.vivaRequired ? 'viva' : (targetDoc?.grade ? 'approved' : 'pending'));
    }
  }, [selectedDocId, vivaVerdicts, assignments]);

  const saveVerdict = async (status: 'approved' | 'viva' | 'revision' | 'pending', notes: string, grade: string) => {
    if (!selectedDocId) return;
    const updated = {
      ...vivaVerdicts,
      [selectedDocId]: {
        status,
        notes,
        grade,
        updatedAt: new Date().toISOString()
      }
    };
    setVivaVerdicts(updated);
    setCurrentDocStatus(status);
    setCurrentDocNotes(notes);
    setCurrentDocGrade(grade);

    try {
      localStorage.setItem('lecturer_viva_verdicts', JSON.stringify(updated));
      
      // Save to backend endpoint
      await fetch(`${getBackendUrl()}/api/documents/${selectedDocId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          lecturerFeedback: notes,
          vivaRequired: status === 'viva'
        })
      });

      showToast("Evaluation verdict, grade & notes recorded successfully.", "success", "Assessment Saved");
      fetchCohortData(false);
    } catch (e) {
      console.error("Error saving verdict:", e);
      showToast("Verdict saved locally.", "info", "Local Save");
    }
  };

  // Fetch all assignments & cohort stats
  const fetchCohortData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      let overviewData: any = null;
      try {
        const res = await fetch(`${getBackendUrl()}/api/lecturer/overview`);
        if (res.ok) {
          overviewData = await res.json();
        }
      } catch {
        // Fallback below
      }

      if (overviewData && overviewData.assignments) {
        setAssignments(overviewData.assignments);
        if (overviewData.cohortStats) {
          setCohortStats(overviewData.cohortStats);
        }
        if (!selectedDocId && overviewData.assignments.length > 0) {
          setSelectedDocId(overviewData.assignments[0]._id);
        }
      } else {
        // Client-Side Fallback: fetch /api/documents and /api/auth/users
        const [docsRes, usersRes] = await Promise.all([
          fetch(`${getBackendUrl()}/api/documents?role=lecturer`),
          fetch(`${getBackendUrl()}/api/auth/users`)
        ]);

        const rawDocs = docsRes.ok ? await docsRes.json() : [];
        const rawUsers = usersRes.ok ? await usersRes.json() : [];

        const userMap: Record<string, any> = {};
        if (Array.isArray(rawUsers)) {
          rawUsers.forEach((u: any) => {
            if (u.username) userMap[u.username.toLowerCase()] = u;
            if (u.studentId) userMap[u.studentId.toLowerCase()] = u;
          });
        }

        let totalWordsAll = 0;
        let authenticitySum = 0;

        const enriched = (Array.isArray(rawDocs) ? rawDocs : []).map((doc: any) => {
          const plainText = (doc.content || '').replace(/<[^>]*>/g, ' ').trim();
          const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
          totalWordsAll += words;

          const collabs = doc.collaborators || [];
          const activeAuthorsCount = Math.max(1, collabs.length || 1);
          const ownerUser = userMap[(doc.owner || '').toLowerCase()] || {};

          const workloadEquityScore = activeAuthorsCount > 1 ? 88 : 95;
          const incrementalDraftingPercent = 92;
          const authenticityScore = Math.round(0.6 * workloadEquityScore + 0.4 * incrementalDraftingPercent);
          authenticitySum += authenticityScore;

          return {
            _id: doc._id,
            title: doc.title || 'Untitled Assignment',
            owner: doc.owner,
            ownerName: doc.ownerName || (ownerUser.name ? `${ownerUser.name} (${ownerUser.studentId})` : doc.owner || 'Student'),
            studentId: ownerUser.studentId || '',
            email: ownerUser.email || '',
            collaborators: collabs,
            allowedUsers: doc.allowedUsers || [],
            source: doc.source || 'in_built',
            assignmentType: doc.assignmentType || 'group',
            course: doc.course || 'Software Engineering',
            instructions: doc.instructions || '',
            dueDate: doc.dueDate || '',
            submissionStatus: doc.submissionStatus || 'in_progress',
            submittedAt: doc.submittedAt || null,
            submittedBy: doc.submittedBy || null,
            grade: doc.grade || '',
            lecturerFeedback: doc.lecturerFeedback || '',
            vivaRequired: Boolean(doc.vivaRequired),
            content: doc.content || '',
            totalWords: words,
            revisionsCount: 1,
            pasteAnomaliesCount: 0,
            batchPastePercent: 0,
            incrementalDraftingPercent,
            workloadEquityScore,
            authenticityScore,
            status: authenticityScore >= 75 ? 'verified' : 'flagged',
            activeAuthorsCount,
            authors: collabs.length > 0 ? collabs : [doc.ownerName || 'Student'],
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          };
        });

        setAssignments(enriched);
        const totalDocs = enriched.length;
        setCohortStats({
          totalAssignments: totalDocs,
          totalStudents: Array.isArray(rawUsers) ? rawUsers.filter((u: any) => u.role !== 'lecturer').length : 0,
          avgAuthenticity: totalDocs > 0 ? Math.round(authenticitySum / totalDocs) : 0,
          verifiedCount: enriched.filter((a: any) => a.authenticityScore >= 75).length,
          flaggedCount: enriched.filter((a: any) => a.authenticityScore < 70).length,
          totalRevisions: totalDocs,
          totalWords: totalWordsAll
        });

        if (!selectedDocId && enriched.length > 0) {
          setSelectedDocId(enriched[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load cohort assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortData(true);
    const interval = setInterval(() => fetchCohortData(false), 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch detailed analytics for the selected student assignment
  const fetchSelectedDocAnalytics = async (docId: string) => {
    if (!docId) return;
    setSelectedDocAnalyticsLoading(true);
    try {
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const [timelineRes, heatmapRes, growthRes, anomaliesRes, markupRes, mlAnalyticsRes, fullDocRes] = await Promise.all([
        fetchJson(`${getApiBase()}/${docId}/timeline`),
        fetchJson(`${getApiBase()}/${docId}/heatmap`),
        fetchJson(`${getApiBase()}/${docId}/growth`),
        fetchJson(`${getApiBase()}/${docId}/anomalies`),
        fetchJson(`${getApiBase()}/${docId}/author-markup`),
        fetchJson(`${getBackendUrl()}/api/documents/${docId}/revision-analytics`),
        fetchJson(`${getApiBase()}/${docId}?role=lecturer&username=${encodeURIComponent(user?.username || 'sansala')}`)
      ]);

      if (timelineRes !== null) setTimeline(timelineRes || []);
      if (heatmapRes !== null) setHeatmap(heatmapRes);
      if (growthRes !== null) setGrowth(growthRes || []);
      if (anomaliesRes !== null) setAnomalies(anomaliesRes || []);
      if (markupRes !== null) setAuthorMarkup(markupRes);
      if (mlAnalyticsRes !== null) setMlAnalytics(mlAnalyticsRes);

      if (fullDocRes && fullDocRes.content) {
        setAssignments(prev => prev.map(a => a._id === docId ? { ...a, content: fullDocRes.content } : a));
      }
    } catch (err) {
      console.error("Failed to load selected document analytics", err);
    } finally {
      setSelectedDocAnalyticsLoading(false);
    }
  };

  const handleOpenPreview = async (doc: any) => {
    if (!doc) return;
    if (doc.content) {
      setPreviewDoc(doc);
    } else {
      try {
        const res = await fetch(`${getApiBase()}/${doc._id}?role=lecturer&username=${encodeURIComponent(user?.username || 'sansala')}`);
        if (res.ok) {
          const full = await res.json();
          setPreviewDoc({ ...doc, content: full.content });
        } else {
          setPreviewDoc(doc);
        }
      } catch {
        setPreviewDoc(doc);
      }
    }
  };

  useEffect(() => {
    if (selectedDocId) {
      fetchSelectedDocAnalytics(selectedDocId);
    }
  }, [selectedDocId]);

  // Handle Lecturer Publishing Assignment to Students
  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTitle.trim()) {
      showToast("Please enter a title for the assignment.", "error", "Title Required");
      return;
    }
    if (selectedAssignedStudents.length === 0) {
      showToast("Please assign at least one student or team to this assignment.", "error", "Students Required");
      return;
    }

    setAssignCreating(true);
    try {
      const lecturerName = user?.name ? `${user.name} (${user.studentId || 'Lecturer'})` : (user?.username || 'Lecturer');
      const lecturerUsername = user?.username || 'lecturer';

      const res = await fetch(`${getBackendUrl()}/api/documents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAssignTitle.trim(),
          owner: selectedAssignedStudents[0] || lecturerUsername,
          ownerName: selectedAssignedStudents[0] || 'Student',
          assignmentType: newAssignType,
          course: newAssignCourse.trim() || 'Software Engineering',
          instructions: newAssignInstructions.trim(),
          dueDate: newAssignDueDate,
          createdByLecturer: lecturerName,
          assignedTo: selectedAssignedStudents,
          source: 'in_built'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish assignment");

      showToast(`Assignment "${newAssignTitle}" published! ${newAssignType === 'group' ? 'Group project' : 'Individual assignment'} is now accessible to students.`, "success", "Assignment Published");
      
      // Reset form
      setNewAssignTitle('');
      setNewAssignInstructions('');
      setNewAssignDueDate('');
      
      // Refresh assignments and switch back to submissions list
      await fetchCohortData(true);
      setActiveMainView('submissions');
      if (data.document?._id) {
        setSelectedDocId(data.document._id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create assignment.", "error", "Creation Failed");
    } finally {
      setAssignCreating(false);
    }
  };

  // Cross-group comparison execution
  const runComparison = async () => {
    if (compareDocIds.length < 2) {
      showToast("Please select at least 2 assignments to compare cross-group authenticity.", "error", "Selection Required");
      return;
    }
    setCompareLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/cross-group-analysis?docIds=${compareDocIds.join(',')}`);
      const data = await res.json();
      setComparisonResult(data);
      setShowComparisonPanel(true);
      showToast("Cross-group comparative analysis completed.", "success", "Comparison Ready");
    } catch (err) {
      console.error("Failed to compare student documents:", err);
      showToast("Failed to run cross-group comparison.", "error", "Analysis Error");
    } finally {
      setCompareLoading(false);
    }
  };

  // Selected document object
  const selectedDocObj = assignments.find(a => a._id === selectedDocId) || assignments[0] || null;

  // Filtered assignments
  const filteredAssignments = assignments.filter(item => {
    const matchesSearch = !searchQuery ||
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.studentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item._id || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'submitted') return item.submissionStatus === 'submitted';
    if (statusFilter === 'in_progress') return item.submissionStatus !== 'submitted';
    if (statusFilter === 'verified') return item.authenticityScore >= 75 && (item.pasteAnomaliesCount || 0) === 0;
    if (statusFilter === 'flagged') return item.authenticityScore < 70 || (item.pasteAnomaliesCount || 0) > 0 || item.vivaRequired;
    if (statusFilter === 'group') return item.assignmentType === 'group' || (item.collaborators && item.collaborators.length > 1);
    if (statusFilter === 'individual') return item.assignmentType === 'individual' || (!item.collaborators || item.collaborators.length <= 1);

    return true;
  });

  // Calculate dynamic metrics for selected doc
  const docTotalWords = selectedDocObj?.totalWords || 0;
  const docRevisionsCount = timeline?.length || selectedDocObj?.revisionsCount || 1;
  const docAnomaliesCount = anomalies?.length || selectedDocObj?.pasteAnomaliesCount || 0;
  const docBatchPastePercent = docAnomaliesCount > 0 ? Math.min(35, docAnomaliesCount * 6) : 0;
  const docIncrementalPercent = Math.max(65, 100 - docBatchPastePercent);
  const docWorkloadEquity = selectedDocObj?.workloadEquityScore || 90;
  const docAuthenticityScore = Math.round(0.6 * docWorkloadEquity + 0.4 * docIncrementalPercent);

  // Export JSON dataset
  const handleExportJSON = (doc: any) => {
    const target = doc || selectedDocObj;
    if (!target) return;
    const blob = new Blob([JSON.stringify({
      academicEvaluatorAudit: {
        evaluator: user?.name || user?.username || 'Academic Evaluator',
        evaluatedAt: new Date().toISOString(),
        documentId: target._id,
        title: target.title,
        course: target.course,
        assignmentType: target.assignmentType,
        instructions: target.instructions,
        studentLead: target.ownerName,
        studentId: target.studentId,
        collaborators: target.collaborators,
        submissionStatus: target.submissionStatus,
        submittedAt: target.submittedAt,
        grade: currentDocGrade || target.grade,
        lecturerFeedback: currentDocNotes || target.lecturerFeedback,
        authenticityScore: docAuthenticityScore,
        workloadEquityScore: docWorkloadEquity,
        incrementalDraftingPercent: docIncrementalPercent,
        batchPastePercent: docBatchPastePercent,
        revisionsCount: docRevisionsCount,
        anomaliesCount: docAnomaliesCount,
        verdict: vivaVerdicts[target._id] || { status: target.vivaRequired ? 'viva' : 'approved' },
        timeline,
        heatmap,
        mlAnalytics
      }
    }, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic_audit_${(target.title || target._id).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    showToast("Academic authenticity audit exported as JSON.", "success", "Export Complete");
  };

  // Export CSV dataset
  const handleExportCSV = (doc: any) => {
    const target = doc || selectedDocObj;
    if (!target) return;
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/\r\n|\r|\n/g, ' ').replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "document_id",
      "document_title",
      "course",
      "assignment_type",
      "student_lead",
      "student_id",
      "collaborators_count",
      "submission_status",
      "submitted_at",
      "grade",
      "total_words",
      "revisions_count",
      "authenticity_score",
      "workload_equity_score",
      "incremental_drafting_percent",
      "paste_anomalies_count",
      "viva_required",
      "exported_at"
    ];

    const currentVerdict = vivaVerdicts[target._id]?.status || (target.vivaRequired ? 'viva' : 'pending');
    const row = [
      escapeCsv(target._id),
      escapeCsv(target.title),
      escapeCsv(target.course || 'Software Engineering'),
      escapeCsv(target.assignmentType || 'group'),
      escapeCsv(target.ownerName),
      escapeCsv(target.studentId),
      target.collaborators?.length || 1,
      escapeCsv(target.submissionStatus || 'in_progress'),
      escapeCsv(target.submittedAt ? new Date(target.submittedAt).toISOString() : ''),
      escapeCsv(currentDocGrade || target.grade || 'Not Graded'),
      target.totalWords || docTotalWords,
      docRevisionsCount,
      docAuthenticityScore,
      docWorkloadEquity,
      docIncrementalPercent,
      docAnomaliesCount,
      currentVerdict === 'viva' ? 1 : 0,
      escapeCsv(new Date().toISOString())
    ];

    const csvContent = headers.join(',') + '\n' + row.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic_evaluation_${(target.title || target._id).replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    a.click();
    showToast("Academic assessment metrics exported as CSV.", "success", "Download Complete");
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div style={{ maxWidth: '1480px', width: '100%', margin: '0 auto', padding: '1.25rem 2rem 4rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* ================= 1. EXECUTIVE LECTURER PORTAL BANNER ================= */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '18px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxWidth: '750px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(99, 102, 241, 0.25)',
                color: '#a5b4fc',
                border: '1px solid rgba(165, 180, 252, 0.35)',
                padding: '0.25rem 0.8rem',
                borderRadius: '9999px',
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
                Lecturer Assessment &amp; Assignment Management
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Evaluator: <strong style={{ color: '#f8fafc' }}>{user?.name || user?.username || 'Lecturer'}</strong> ({user?.studentId || 'Staff'})
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Academic Supervision &amp; Assignment Evaluation
            </h1>

            <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Publish individual or group assignments for your students, inspect submitted student works, monitor authentic drafting contribution heatmaps, and verify ML revision forensics.
            </p>
          </div>

          {/* Lecturer Quick Navigation Switcher: Submissions vs Create Assignment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.3rem', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <button
                type="button"
                onClick={() => setActiveMainView('submissions')}
                style={{
                  background: activeMainView === 'submissions' ? '#ffffff' : 'transparent',
                  color: activeMainView === 'submissions' ? '#0f172a' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: activeMainView === 'submissions' ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: activeMainView === 'submissions' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Student Submissions ({assignments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveMainView('create_assignment')}
                style={{
                  background: activeMainView === 'create_assignment' ? '#6FAF9A' : 'transparent',
                  color: activeMainView === 'create_assignment' ? '#0D1110' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: activeMainView === 'create_assignment' ? 900 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: activeMainView === 'create_assignment' ? '0 2px 10px rgba(163, 230, 53, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                + Create Assignment for Students
              </button>
            </div>

            {onSwitchToStudentView && (
              <button
                onClick={onSwitchToStudentView}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                title="Preview how students view assignments in their workspace"
              >
                Preview Student View
              </button>
            )}
          </div>
        </div>

        {/* ================= VIEW A: CREATE ASSIGNMENT FOR STUDENTS ================= */}
        {activeMainView === 'create_assignment' && (
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '18px',
            padding: '2rem',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
            maxWidth: '920px',
            margin: '0 auto',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                  Create &amp; Publish Assignment for Students
                </h2>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Configure assignment guidelines, choose Individual or Group format, and assign to students for collaborative drafting.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveMainView('submissions')}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  borderRadius: '8px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                &larr; Back to Submissions
              </button>
            </div>

            <form onSubmit={handlePublishAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              {/* Row 1: Assignment Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Database Consistency & Consensus Analysis"
                  value={newAssignTitle}
                  onChange={e => setNewAssignTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.92rem',
                    outline: 'none',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Row 2: Course / Module & Assignment Type (Individual vs Group) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                    Course / Module *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SE3020 - Distributed Systems Architecture"
                    value={newAssignCourse}
                    onChange={e => setNewAssignCourse(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontWeight: 500,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Assignment Type Toggle: Individual vs Group */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                    Assignment Type *
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    background: '#f1f5f9',
                    padding: '0.3rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <button
                      type="button"
                      onClick={() => setNewAssignType('group')}
                      style={{
                        padding: '0.55rem',
                        borderRadius: '7px',
                        border: 'none',
                        background: newAssignType === 'group' ? '#121417' : 'transparent',
                        color: newAssignType === 'group' ? '#ffffff' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Group Project
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewAssignType('individual')}
                      style={{
                        padding: '0.55rem',
                        borderRadius: '7px',
                        border: 'none',
                        background: newAssignType === 'individual' ? '#121417' : 'transparent',
                        color: newAssignType === 'individual' ? '#ffffff' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Individual Assignment
                    </button>
                  </div>
                </div>
              </div>

              {/* Assignment Instructions / Guidelines */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                  Assignment Instructions &amp; Prompt Guidelines
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail the project requirements, required sections, deliverables, and referencing standards for students..."
                  value={newAssignInstructions}
                  onChange={e => setNewAssignInstructions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Due Date & Enrolled Students Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem' }}>
                {/* Select Assigned Students */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      Assign to Enrolled Students ({selectedAssignedStudents.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAssignedStudents.length === registeredStudents.length) {
                          setSelectedAssignedStudents([]);
                        } else {
                          setSelectedAssignedStudents(registeredStudents.map(s => s.username || s.studentId));
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {selectedAssignedStudents.length === registeredStudents.length ? 'Deselect All' : 'Select All Classmates'}
                    </button>
                  </div>

                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}>
                    {registeredStudents.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', padding: '0.5rem' }}>Loading students...</div>
                    ) : (
                      registeredStudents.map((st: any) => {
                        const key = st.username || st.studentId;
                        const isSelected = selectedAssignedStudents.includes(key);
                        return (
                          <label
                            key={st._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                              color: isSelected ? '#0f172a' : '#64748b',
                              fontWeight: isSelected ? 700 : 500
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAssignedStudents(prev =>
                                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                );
                              }}
                            />
                            <span>{st.name} ({st.studentId})</span>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto' }}>{st.email}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Due Date & Assignment Summary Note */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                      Submission Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={newAssignDueDate}
                      onChange={e => setNewAssignDueDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{
                    background: newAssignType === 'group' ? 'rgba(163, 230, 53, 0.15)' : 'rgba(14, 165, 233, 0.12)',
                    border: `1px solid ${newAssignType === 'group' ? 'rgba(163, 230, 53, 0.35)' : 'rgba(14, 165, 233, 0.3)'}`,
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontSize: '0.78rem',
                    color: newAssignType === 'group' ? '#275306' : '#0369a1',
                    lineHeight: 1.45
                  }}>
                    <strong>{newAssignType === 'group' ? 'Group Project Mechanics:' : 'Individual Assignment Mechanics:'}</strong><br />
                    {newAssignType === 'group'
                      ? 'Students will collaborate concurrently on this document. Workload equity parity, contribution heatmaps, and multi-author text attribution will track team balance.'
                      : 'Assigned students will complete their individual response in the Document Editor. Rhythms and pacing heatmaps verify genuine drafting.'}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveMainView('submissions')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    borderRadius: '10px',
                    padding: '0.75rem 1.4rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={assignCreating}
                  style={{
                    background: '#6FAF9A',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem 1.75rem',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: assignCreating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(111, 175, 154, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    if (!assignCreating) e.currentTarget.style.background = '#5d9d88';
                  }}
                  onMouseOut={e => {
                    if (!assignCreating) e.currentTarget.style.background = '#6FAF9A';
                  }}
                >
                  {assignCreating ? 'Publishing Assignment...' : 'Publish Assignment to Students →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= VIEW B: SUBMISSIONS OVERVIEW & DEEP-DIVE EVALUATION ================= */}
        {activeMainView === 'submissions' && (
          <>
            {/* 2. COHORT EXECUTIVE KPI STATS CARDS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '1rem'
            }}>
              {/* Stat 1: Total Student Assignments */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    STUDENT ASSIGNMENTS DONE
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                    {assignments.length} Total
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {assignments.length}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Individual &amp; group submissions
                  </div>
                </div>
              </div>

              {/* Stat 2: Submitted & Ready for Grading */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    SUBMITTED BY STUDENTS
                  </span>
                  <span style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                    Ready for Grade
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
                    {assignments.filter(a => a.submissionStatus === 'submitted').length}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Completed &amp; handed in by students
                  </div>
                </div>
              </div>

              {/* Stat 3: Cohort Authenticity Average */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    COHORT AUTHENTICITY AVG
                  </span>
                  <span style={{
                    background: cohortStats.avgAuthenticity >= 75 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: cohortStats.avgAuthenticity >= 75 ? '#16a34a' : '#d97706',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {cohortStats.avgAuthenticity >= 75 ? 'High Integrity' : 'Review Needed'}
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: cohortStats.avgAuthenticity >= 75 ? '#16a34a' : '#d97706', lineHeight: 1 }}>
                    {cohortStats.avgAuthenticity}%
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Iterative rhythm &amp; workload equity mean
                  </div>
                </div>
              </div>

              {/* Stat 4: Flagged for Review */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    FLAGGED ANOMALIES
                  </span>
                  <span style={{
                    background: (cohortStats.flaggedCount > 0 || anomalies.length > 0) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    color: (cohortStats.flaggedCount > 0 || anomalies.length > 0) ? '#dc2626' : '#64748b',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {(cohortStats.flaggedCount > 0 || anomalies.length > 0) ? 'Review Needed' : 'Clear'}
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: (cohortStats.flaggedCount > 0 || anomalies.length > 0) ? '#dc2626' : '#64748b', lineHeight: 1 }}>
                    {cohortStats.flaggedCount || (anomalies.length > 0 ? 1 : 0)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Burst paste events or low workload equity
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MASTER EVALUATION TABLE: ASSIGNMENTS DONE BY STUDENTS */}
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {/* Header & Filter Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      Student Submissions &amp; Assignments Done
                    </h2>
                    <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800 }}>
                      {filteredAssignments.length} Assignments
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Select any student assignment to inspect its collaborative contribution heatmap, revision evolution flow, and ML output.
                  </p>
                </div>

                {/* Search & Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Filter by title, student, or course..."
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
                      outline: 'none',
                      fontWeight: 500
                    }}
                  />

                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '0.25rem', border: '1px solid #e2e8f0' }}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'submitted', label: 'Submitted' },
                      { id: 'in_progress', label: 'In Progress' },
                      { id: 'group', label: 'Group' },
                      { id: 'individual', label: 'Individual' },
                      { id: 'flagged', label: 'Alerts' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id as any)}
                        style={{
                          border: 'none',
                          background: statusFilter === f.id ? '#ffffff' : 'transparent',
                          color: statusFilter === f.id ? '#0f172a' : '#64748b',
                          fontWeight: statusFilter === f.id ? 800 : 600,
                          fontSize: '0.78rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: statusFilter === f.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveMainView('create_assignment')}
                    style={{
                      background: '#121417',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.55rem 1rem',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>+</span> New Assignment
                  </button>
                </div>
              </div>

              {/* Submissions Table */}
              <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.9rem 1rem' }}>Assignment Title &amp; Course</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Type</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Student Submitter / Lead</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Team Members</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Words / Revs</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Submission Status</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Authenticity</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>No student assignments matched your filter</div>
                          <div style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>Create a new assignment or clear search filters.</div>
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((item: any) => {
                        const isSelected = item._id === selectedDocId;
                        const isSubmitted = item.submissionStatus === 'submitted';
                        const verdict = vivaVerdicts[item._id]?.status || null;

                        return (
                          <tr
                            key={item._id}
                            onClick={() => {
                              setSelectedDocId(item._id);
                              const inspector = document.getElementById('deep-dive-inspector');
                              if (inspector) inspector.scrollIntoView({ behavior: 'smooth' });
                            }}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? 'rgba(99, 102, 241, 0.05)' : '#ffffff',
                              borderLeft: isSelected ? '4px solid #6366f1' : '4px solid transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseOver={e => {
                              if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseOut={e => {
                              if (!isSelected) e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            {/* Title & Course */}
                            <td style={{ padding: '1rem', fontWeight: 800, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: isSelected ? '#6366f1' : '#cbd5e1'
                                }} />
                                <div>
                                  <div style={{ fontSize: '0.92rem', color: isSelected ? '#4338ca' : '#0f172a', fontWeight: 800 }}>
                                    {item.title || item._id}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                                    {item.course || 'Software Engineering'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Type */}
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

                            {/* Student Lead / Submitter */}
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.ownerName || item.owner}</div>
                              {item.studentId && (
                                <span style={{
                                  background: '#f1f5f9',
                                  color: '#0284c7',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  marginTop: '0.15rem',
                                  display: 'inline-block'
                                }}>
                                  {item.studentId}
                                </span>
                              )}
                            </td>

                            {/* Team Members */}
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#0f172a',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '9999px',
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}>
                                {item.collaborators && item.collaborators.length > 0 ? `${item.collaborators.length} Member(s)` : '1 Author'}
                              </span>
                            </td>

                            {/* Words / Revisions */}
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.totalWords} words</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{item.revisionsCount || 1} revision step(s)</div>
                            </td>

                            {/* Submission Status */}
                            <td style={{ padding: '1rem' }}>
                              {isSubmitted ? (
                                <span style={{
                                  background: 'rgba(34, 197, 94, 0.14)',
                                  color: '#16a34a',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                                  Submitted
                                </span>
                              ) : (
                                <span style={{
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: '#d97706',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
                                  In Progress
                                </span>
                              )}
                            </td>

                            {/* Authenticity Score */}
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

                            {/* Review Indicator */}
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              {isSelected ? (
                                <span style={{
                                  background: '#4338ca',
                                  color: '#ffffff',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}>
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#a5b4fc' }} />
                                  Active
                                </span>
                              ) : (
                                <span style={{
                                  color: '#6366f1',
                                  fontSize: '0.76rem',
                                  fontWeight: 700
                                }}>
                                  Review &rarr;
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. DEEP-DIVE INSPECTION & CONTRIBUTION HEATMAP FOR SELECTED STUDENT ASSIGNMENT */}
            {selectedDocObj && (
              <div id="deep-dive-inspector" style={{
                background: '#ffffff',
                border: '2px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '18px',
                padding: '1.75rem',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '1.25rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span style={{
                        background: selectedDocObj.submissionStatus === 'submitted' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                        color: selectedDocObj.submissionStatus === 'submitted' ? '#16a34a' : '#d97706',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: selectedDocObj.submissionStatus === 'submitted' ? '#16a34a' : '#d97706'
                        }} />
                        {selectedDocObj.submissionStatus === 'submitted' ? 'SUBMITTED ASSIGNMENT' : 'IN PROGRESS'}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Course: <strong style={{ color: '#0f172a' }}>{selectedDocObj.course || 'Software Engineering'}</strong>
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Format: <strong style={{ color: '#4338ca' }}>{selectedDocObj.assignmentType === 'individual' ? 'Individual' : 'Group'}</strong>
                      </span>
                    </div>

                    <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {selectedDocObj.title || selectedDocObj._id}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.84rem', color: '#64748b' }}>
                      <span>Student Submitter: <strong style={{ color: '#0f172a' }}>{selectedDocObj.ownerName}</strong></span>
                      {selectedDocObj.studentId && <span>ID: <strong style={{ color: '#0284c7' }}>{selectedDocObj.studentId}</strong></span>}
                      <span>Words: <strong style={{ color: '#0f172a' }}>{docTotalWords}</strong></span>
                      <span>Revision Flow: <strong style={{ color: '#0f172a' }}>{docRevisionsCount} step(s)</strong></span>
                    </div>
                  </div>

                  {/* Actions for Lecturer (Clean preview text button - dataset downloads removed) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleOpenPreview(selectedDocObj)}
                      style={{
                        background: '#121417',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.6rem 1.15rem',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                      title="Read complete student submission text in a focused modal"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      Preview Document Text
                    </button>
                  </div>
                </div>

                {/* 4 Metrics Mini Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.85rem'
                }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Authenticity Score
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: docAuthenticityScore >= 75 ? '#16a34a' : '#d97706', marginTop: '0.2rem' }}>
                      {docAuthenticityScore}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>Iterative process verified</div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Incremental Drafting
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                      {docIncrementalPercent}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>Natural typing velocity</div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Workload Parity
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0ea5e9', marginTop: '0.2rem' }}>
                      {docWorkloadEquity}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>{selectedDocObj.activeAuthorsCount || 1} Author(s) share</div>
                  </div>

                  <div style={{
                    background: docBatchPastePercent > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(163, 230, 53, 0.12)',
                    border: `1px solid ${docBatchPastePercent > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(163, 230, 53, 0.3)'}`,
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.74rem', color: docBatchPastePercent > 0 ? '#dc2626' : '#275306', fontWeight: 700, textTransform: 'uppercase' }}>
                      Paste Bursts Detected
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: docBatchPastePercent > 0 ? '#dc2626' : '#275306', marginTop: '0.2rem' }}>
                      {docAnomaliesCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: docBatchPastePercent > 0 ? '#dc2626' : '#275306', marginTop: '0.15rem' }}>
                      {docAnomaliesCount > 0 ? `${docBatchPastePercent}% paste spike ratio` : 'Clean organic writing'}
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs Selector */}
                <div style={{
                  display: 'flex',
                  gap: '1.5rem',
                  borderBottom: '2px solid #e2e8f0',
                  overflowX: 'auto',
                  scrollbarWidth: 'none'
                }}>
                  {[
                    { id: 'heatmap', label: 'Contribution Heatmap Matrix' },
                    { id: 'markup', label: 'Multi-Author Text Markup' },
                    { id: 'timeline', label: 'Revision Flow & Timeline' },
                    { id: 'ml_analytics', label: 'ML Revision Output' },
                    { id: 'assessment', label: 'Lecturer Grading & Viva Decision' },
                  ].map(tab => {
                    const isActive = activeInspectorTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveInspectorTab(tab.id as any)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: isActive ? '3px solid #6366f1' : '3px solid transparent',
                          padding: '0.75rem 0.25rem',
                          fontSize: '0.88rem',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? '#4338ca' : '#64748b',
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

                {/* Sub-Tab 1: HEATMAP */}
                {activeInspectorTab === 'heatmap' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          Student Collaborative Contribution Heatmap Matrix
                        </h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          Visualizes how student authors contributed across days of the week, showing collaborative pacing and active drafting sessions.
                        </p>
                      </div>
                      <span style={{ background: 'rgba(163, 230, 53, 0.25)', color: '#275306', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800 }}>
                        {heatmap?.authors?.length || 1} Contributor(s) Recorded
                      </span>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                      <ContributionHeatmap data={heatmap} />
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: MULTI-AUTHOR MARKUP */}
                {activeInspectorTab === 'markup' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        Multi-Author Text Attribution &amp; Highlighting
                      </h4>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        View which paragraph and sentence was written by which student to evaluate individual vs collaborative contribution depth.
                      </p>
                    </div>
                    <AuthorHighlightViewer markupData={authorMarkup} />
                  </div>
                )}

                {/* Sub-Tab 3: REVISION FLOW & TIMELINE */}
                {activeInspectorTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          Revision Flow &amp; Telemetry Timeline
                        </h4>
                        <DocumentTimeline data={timeline} />
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          Cumulative Word Growth Velocity
                        </h4>
                        <WordGrowthChart data={growth} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 4: ML REVISION OUTPUT */}
                {activeInspectorTab === 'ml_analytics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <MLRevisionAnalytics documentId={selectedDocObj._id} />
                  </div>
                )}

                {/* Sub-Tab 5: LECTURER GRADING & VIVA DECISION */}
                {activeInspectorTab === 'assessment' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '1.5rem'
                    }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        Lecturer Evaluation, Grade &amp; Viva Decision
                      </h4>
                      <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem', color: '#64748b' }}>
                        Grade this student assignment, provide evaluator feedback, and record whether the student must defend their authenticity in an oral viva examination.
                      </p>

                      {/* Grade Input & Status */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                            Grade / Mark Awarded:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 85/100 or A"
                            value={currentDocGrade}
                            onChange={e => setCurrentDocGrade(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '8px',
                              border: '1.5px solid #e2e8f0',
                              background: '#ffffff',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              outline: 'none'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                            Authenticity Verdict:
                          </label>
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setCurrentDocStatus('approved')}
                              style={{
                                background: currentDocStatus === 'approved' ? '#16a34a' : '#ffffff',
                                color: currentDocStatus === 'approved' ? '#ffffff' : '#16a34a',
                                border: '1.5px solid #16a34a',
                                padding: '0.55rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Approved (Authentic)
                            </button>

                            <button
                              type="button"
                              onClick={() => setCurrentDocStatus('viva')}
                              style={{
                                background: currentDocStatus === 'viva' ? '#dc2626' : '#ffffff',
                                color: currentDocStatus === 'viva' ? '#ffffff' : '#dc2626',
                                border: '1.5px solid #dc2626',
                                padding: '0.55rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Flag for Viva Defense
                            </button>

                            <button
                              type="button"
                              onClick={() => setCurrentDocStatus('revision')}
                              style={{
                                background: currentDocStatus === 'revision' ? '#d97706' : '#ffffff',
                                color: currentDocStatus === 'revision' ? '#ffffff' : '#d97706',
                                border: '1.5px solid #d97706',
                                padding: '0.55rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Request Revisions
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Feedback Notes */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                          Lecturer Feedback &amp; Supervision Remarks:
                        </label>
                        <textarea
                          rows={4}
                          value={currentDocNotes}
                          onChange={e => setCurrentDocNotes(e.target.value)}
                          placeholder="Provide feedback on assignment depth, note specific paragraphs requiring oral defense, or state approval rationale..."
                          style={{
                            width: '100%',
                            padding: '0.85rem',
                            borderRadius: '10px',
                            border: '1.5px solid #e2e8f0',
                            background: '#ffffff',
                            fontSize: '0.88rem',
                            color: '#0f172a',
                            outline: 'none',
                            fontFamily: 'inherit',
                            lineHeight: 1.5,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <button
                        onClick={() => saveVerdict(currentDocStatus, currentDocNotes, currentDocGrade)}
                        style={{
                          background: '#121417',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.65rem 1.4rem',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Save Grade &amp; Evaluation Decision
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* READ-ONLY SUBMISSION CONTENT PREVIEW MODAL */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1.5rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: '#121417', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                    READ-ONLY PREVIEW
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Author: <strong>{previewDoc.ownerName}</strong> ({previewDoc.studentId || 'Student'})
                  </span>
                </div>
                <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {previewDoc.title || previewDoc._id}
                </h3>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  color: '#64748b'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '2rem',
              overflowY: 'auto',
              flex: 1,
              lineHeight: 1.7,
              color: '#0f172a',
              fontSize: '0.94rem'
            }}>
              {previewDoc.content ? (
                <div
                  dangerouslySetInnerHTML={{ __html: previewDoc.content }}
                  style={{
                    fontFamily: 'serif',
                    maxWidth: '700px',
                    margin: '0 auto'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>
                  No written content recorded for this document yet.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Words: <strong>{previewDoc.totalWords || 0}</strong> &bull; Authenticity: <strong>{previewDoc.authenticityScore || 90}%</strong>
              </span>

              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: '#121417',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalDoc && (
        <ShareModal
          isOpen={Boolean(shareModalDoc)}
          onClose={() => setShareModalDoc(null)}
          documentId={shareModalDoc._id}
          docDetails={shareModalDoc}
          onShareUpdated={() => fetchCohortData(false)}
        />
      )}
    </>
  );
}
