'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, logoutUser } from '@/services/api';
import { Plus } from 'lucide-react';
import {
  LecturerSidebar,
  AssignmentHeaderCard,
  CohortStats,
  AnomalyAlertsBanner,
  ReportsTable,
  CreateAssignmentModal,
  TeamAnalyticsModal,
  StudentInspectModal
} from '@/features/lecturer';

export default function LecturerDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Assignment List & Selected Assignment
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [teamAnalytics, setTeamAnalytics] = useState<any>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamAnalyticsModal, setShowTeamAnalyticsModal] = useState(false);
  const [selectedStudentReport, setSelectedStudentReport] = useState<any | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTeamAnalytics = async (teamId: string) => {
    try {
      const data = await api.analytics.getTeamAnalytics(teamId);
      setTeamAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssignmentReports = async (assignmentId: string) => {
    try {
      setError('');
      const data = await api.analytics.getAssignmentReports(assignmentId);
      setReports(data.reports || []);

      if (data.reports && data.reports.length > 0 && data.reports[0].team) {
        const tId = data.reports[0].team._id || data.reports[0].team;
        loadTeamAnalytics(tId);
      } else {
        setTeamAnalytics(null);
      }
    } catch {
      setError('Error loading assessment analytics.');
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const data = await api.assignments.getAll();
      setAssignments(data.assignments || []);
      if (data.assignments && data.assignments.length > 0) {
        setSelectedAssignment(data.assignments[0]);
        await loadAssignmentReports(data.assignments[0]._id);
      }
    } catch {
      setError('Could not load assignments data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'lecturer') {
      router.push('/login?role=lecturer');
      return;
    }
    setUser(currentUser);
    fetchInitialData();
  }, [router]);

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = assignments.find((a) => a._id === e.target.value);
    setSelectedAssignment(selected);
    if (selected) {
      await loadAssignmentReports(selected._id);
    }
  };

  const handleRecalculateScores = async () => {
    if (!selectedAssignment) return;
    setRefreshing(true);
    try {
      await api.analytics.recalculate(selectedAssignment._id);
      await loadAssignmentReports(selectedAssignment._id);
    } catch {
      setError('Recalculation failed.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    router.push('/');
  };

  // Metrics aggregations
  const totalStudents = reports.length;
  const uniqueTeams = Array.from(new Set(reports.map((r) => r.team?._id || r.team).filter(Boolean)));
  const totalTeams = uniqueTeams.length;
  const freeRiderAlerts = reports.filter((r) => r.alerts && (r.alerts.hasAnomaly || r.alerts.isFreeRider));
  const averageCohortScore =
    totalStudents > 0
      ? Math.round(reports.reduce((acc, curr) => acc + (curr.scores?.final || 0), 0) / totalStudents)
      : 0;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-slate-950">
      {/* Left Sidebar Navigation */}
      <LecturerSidebar
        user={user}
        onOpenCreateModal={() => setShowCreateModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Header Bar */}
        <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-6 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-800">Lecturer Console</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{selectedAssignment?.title || 'Assignment Dashboard'}</span>
          </div>

          <div className="flex items-center gap-3">
            {teamAnalytics && (
              <button
                onClick={() => setShowTeamAnalyticsModal(true)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full px-3.5 py-1 font-semibold transition cursor-pointer"
              >
                View Team Radar
              </button>
            )}
            {selectedAssignment?.invitationCode && (
              <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 rounded-full px-3.5 py-1 font-mono flex items-center gap-1.5 shadow-2xs">
                Invite Code: <strong className="text-slate-900">{selectedAssignment.invitationCode}</strong>
              </span>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow p-6 sm:p-8 space-y-6 max-w-[1500px] w-full mx-auto">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Top Selection Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 text-left">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Assignment Analytics & Standing
              </h1>
              <p className="text-slate-500 text-xs font-normal mt-0.5">
                Audit student contributions, Git commits, and biometric keystroke provenance.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              {assignments.length > 0 && (
                <select
                  onChange={handleAssignmentChange}
                  value={selectedAssignment?._id || ''}
                  className="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#A3E635] shadow-xs cursor-pointer"
                >
                  {assignments.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-full bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Assignment
              </button>
            </div>
          </div>

          {/* Selected Assignment Info Card */}
          <AssignmentHeaderCard assignment={selectedAssignment} />

          {/* Stats Grid */}
          <CohortStats
            totalStudents={totalStudents}
            totalTeams={totalTeams}
            anomalyCount={freeRiderAlerts.length}
            averageCohortScore={averageCohortScore}
          />

          {/* Free Riders Anomaly Alerts */}
          <AnomalyAlertsBanner alerts={freeRiderAlerts} />

          {/* Student Evaluation Matrix Table */}
          <ReportsTable
            reports={reports}
            refreshing={refreshing}
            onRecalculate={handleRecalculateScores}
            onInspectStudent={(r) => setSelectedStudentReport(r)}
          />
        </main>
      </div>

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchInitialData}
      />

      <TeamAnalyticsModal
        isOpen={showTeamAnalyticsModal}
        onClose={() => setShowTeamAnalyticsModal(false)}
        teamAnalytics={teamAnalytics}
        teamName={teamAnalytics?.teamName}
      />

      <StudentInspectModal
        isOpen={!!selectedStudentReport}
        onClose={() => setSelectedStudentReport(null)}
        report={selectedStudentReport}
      />
    </div>
  );
}
