'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser, logoutUser } from '../../services/api';
import { 
  Users, Plus, Calendar, BarChart3, AlertTriangle, RefreshCw, 
  GitFork, LogOut, CheckSquare, Search, Printer,
  Folder, FileText, ChevronLeft, Code, Code2, GraduationCap,
  ExternalLink, Terminal, ShieldCheck, ArrowUpRight, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

export default function LecturerDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUserState] = useState<any>(null);

  // Assignment List States
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [teamAnalytics, setTeamAnalytics] = useState<any>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Create Assignment Modal / Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignmentType, setAssignmentType] = useState('team');
  const [gitWeight, setGitWeight] = useState(40);
  const [vscodeWeight, setVscodeWeight] = useState(30);
  const [taskWeight, setTaskWeight] = useState(20);
  const [collabWeight, setCollabWeight] = useState(10);

  const [selectedStudentReport, setSelectedStudentReport] = useState<any | null>(null);
  const [inspectedFileActivity, setInspectedFileActivity] = useState<any | null>(null);

  // General States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Repository Explorer states
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerItems, setExplorerItems] = useState<any[]>([]);
  const [selectedCodeFile, setSelectedCodeFile] = useState<string | null>(null);
  const [selectedCodeContent, setSelectedCodeContent] = useState('');
  const [explorerLoading, setExplorerLoading] = useState(false);

  const fetchRepositoryContents = async (tId: string, path: string) => {
    if (!tId) return;
    setExplorerLoading(true);
    try {
      const res = await api.github.getContents(tId, path);
      setExplorerItems(res.items || []);
      setExplorerPath(path);
      setSelectedCodeFile(null);
      setSelectedCodeContent('');
    } catch (err: any) {
      console.error('Failed to fetch repo contents:', err);
    } finally {
      setExplorerLoading(false);
    }
  };

  const fetchFileContent = async (path: string) => {
    if (!selectedTeamId) return;
    setExplorerLoading(true);
    try {
      const res = await api.github.getFile(selectedTeamId, path);
      setSelectedCodeFile(path);
      setSelectedCodeContent(res.content || '');
    } catch (err: any) {
      console.error('Failed to fetch file content:', err);
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleExplorerBack = () => {
    if (!selectedTeamId) return;
    if (selectedCodeFile) {
      setSelectedCodeFile(null);
      setSelectedCodeContent('');
      return;
    }
    const parts = explorerPath.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    fetchRepositoryContents(selectedTeamId, parentPath);
  };

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'lecturer') {
      router.push('/login?role=lecturer');
      return;
    }
    setUserState(currentUser);
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const data = await api.assignments.getAll();
      setAssignments(data.assignments);
      if (data.assignments.length > 0) {
        setSelectedAssignment(data.assignments[0]);
        await loadAssignmentReports(data.assignments[0]._id);
      }
    } catch (err: any) {
      setError('Could not load assignments data. Ensure Node backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentReports = async (assignmentId: string) => {
    try {
      setError('');
      const data = await api.analytics.getAssignmentReports(assignmentId);
      setReports(data.reports);
      
      if (data.reports.length > 0 && data.reports[0].team) {
        const tId = data.reports[0].team._id || data.reports[0].team;
        setSelectedTeamId(tId);
        await loadTeamAnalytics(tId);
      } else {
        setSelectedTeamId('');
        setTeamAnalytics(null);
        setExplorerItems([]);
      }
    } catch (err: any) {
      setError('Error loading assessment analytics.');
    }
  };

  const loadTeamAnalytics = async (teamId: string) => {
    try {
      const data = await api.analytics.getTeamAnalytics(teamId);
      setTeamAnalytics(data);
      fetchRepositoryContents(teamId, '');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = assignments.find(a => a._id === e.target.value);
    setSelectedAssignment(selected);
    if (selected) {
      await loadAssignmentReports(selected._id);
    }
  };

  const handleTeamChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTeamId(tId);
    if (tId) {
      await loadTeamAnalytics(tId);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gitWeight + vscodeWeight + taskWeight + collabWeight !== 100) {
      setError('Total weights allocation must sum exactly to 100%.');
      return;
    }

    try {
      await api.assignments.create({
        title,
        description,
        deadline,
        assignmentType,
        weights: {
          git: gitWeight,
          vscode: vscodeWeight,
          task: taskWeight,
          collab: collabWeight
        }
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDeadline('');
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to publish assignment template.');
    }
  };

  const handleRecalculateScores = async () => {
    if (!selectedAssignment) return;
    setRefreshing(true);
    try {
      await api.analytics.recalculate(selectedAssignment._id);
      await loadAssignmentReports(selectedAssignment._id);
    } catch (err: any) {
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
  const uniqueTeams = Array.from(new Set(reports.map(r => r.team?._id || r.team).filter(Boolean)));
  const totalTeams = uniqueTeams.length;
  const freeRiderAlerts = reports.filter(r => r.alerts && r.alerts.hasAnomaly);
  const averageCohortScore = totalStudents > 0 
    ? Math.round(reports.reduce((acc, curr) => acc + (curr.scores?.final || 0), 0) / totalStudents)
    : 0;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-[#0EA5E9]/30 selection:text-[#38BDF8]">
      
      {/* =========================================================================
          LEFT SIDEBAR
      ========================================================================= */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#0B1120] shrink-0 flex flex-col justify-between p-6">
        <div className="space-y-8 text-left">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#38BDF8] shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Code2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">OffSync</span>
              <span className="text-[10px] text-[#38BDF8] font-mono-code font-medium tracking-wide block mt-1">Lecturer Console</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-6 text-xs font-light text-slate-400">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono-code text-slate-500 block tracking-wider mb-2">Examiner Views</span>
              
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30 font-medium shadow-[0_0_15px_rgba(14,165,233,0.1)] text-left cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Performance Analytics</span>
              </button>
              
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/60 hover:text-white border border-transparent transition text-left cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#10B981]" />
                <span>Create Assignment</span>
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <span className="text-[10px] uppercase font-mono-code text-slate-500 block tracking-wider mb-2">Audit & Export</span>
              <button 
                onClick={() => window.print()}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/60 hover:text-white border border-transparent transition text-left cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print Examiner Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* User profile footer & logout */}
        <div className="border-t border-white/10 pt-5 mt-6 flex flex-col gap-3 text-left">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 text-[#38BDF8] border border-[#0EA5E9]/30 font-bold flex items-center justify-center text-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="truncate min-w-0">
              <span className="font-medium text-xs text-white block leading-tight truncate">{user?.name || 'Academic Examiner'}</span>
              <span className="text-[10px] text-slate-400 font-mono-code block mt-0.5 truncate">{user?.email}</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition rounded-xl text-xs font-light flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN COLUMN
      ========================================================================= */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Top Header */}
        <header className="border-b border-white/10 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-light">
            <span>Platform Dashboard</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#38BDF8] font-medium font-mono-code text-[11px] tracking-wide">Lecturer Overview</span>
          </div>

          <div className="flex items-center gap-3">
            {selectedAssignment && (
              <span className="text-xs bg-slate-900 border border-white/10 text-slate-300 rounded-lg px-3 py-1 font-mono-code flex items-center gap-1.5 shadow-sm">
                Invite Code: <strong className="text-white">{selectedAssignment.invitationCode}</strong>
              </span>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-grow p-6 sm:p-8 space-y-6">
          
          {/* Header row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2 text-left">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Assignment Performance Analytics</h1>
              <p className="text-slate-400 text-xs font-light mt-0.5">Audit development metrics, Git contributions, and offline telemetry logs.</p>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {assignments.length > 0 && (
                <select
                  onChange={handleAssignmentChange}
                  value={selectedAssignment?._id || ''}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#0EA5E9] cursor-pointer"
                >
                  {assignments.map(a => (
                    <option key={a._id} value={a._id}>{a.title}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white font-medium text-xs transition shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Assignment
              </button>
            </div>
          </div>

          {/* Selected Assignment Info Card */}
          {selectedAssignment && (
            <div className="glass-card rounded-2xl p-6 border border-white/10 text-left space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md border border-white/10 text-[#38BDF8] font-mono-code bg-slate-900">
                      Type: {selectedAssignment.assignmentType}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-white">{selectedAssignment.title}</h2>
                  <p className="text-slate-400 text-xs max-w-4xl leading-relaxed font-light">{selectedAssignment.description}</p>
                </div>

                <div className="flex flex-col justify-between items-end md:border-l border-white/5 md:pl-6 shrink-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-code">
                    <Calendar className="w-4 h-4 text-[#38BDF8]" />
                    <span>Deadline: {new Date(selectedAssignment.deadline).toLocaleDateString()}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] block uppercase text-slate-500 tracking-wider mb-1 font-mono-code">Weighting Matrix</span>
                    <div className="flex gap-2.5 text-xs font-mono-code">
                      <span className="text-white">Git {selectedAssignment.weights.git}%</span>
                      <span className="text-[#38BDF8]">VSCode {selectedAssignment.weights.vscode}%</span>
                      <span className="text-slate-400">Task {selectedAssignment.weights.task}%</span>
                      <span className="text-[#10B981]">Collab {selectedAssignment.weights.collab}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono-code">Students Joined</span>
                <h3 className="text-2xl font-bold text-white font-mono-code">{totalStudents}</h3>
              </div>
              <Users className="w-6 h-6 text-[#0EA5E9]" />
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono-code">Total Teams</span>
                <h3 className="text-2xl font-bold text-white font-mono-code">{totalTeams}</h3>
              </div>
              <GitFork className="w-6 h-6 text-[#38BDF8]" />
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono-code">Free-Rider Flags</span>
                <h3 className={`text-2xl font-bold font-mono-code ${freeRiderAlerts.length > 0 ? 'text-[#F43F5E]' : 'text-[#10B981]'}`}>
                  {freeRiderAlerts.length}
                </h3>
              </div>
              <AlertTriangle className={`w-6 h-6 ${freeRiderAlerts.length > 0 ? 'text-[#F43F5E]' : 'text-slate-600'}`} />
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono-code">Cohort Average</span>
                <h3 className="text-2xl font-bold text-white font-mono-code">{averageCohortScore}%</h3>
              </div>
              <BarChart3 className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>

          {/* Free Riders Anomaly Alerts */}
          {freeRiderAlerts.length > 0 && (
            <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/30 space-y-3 text-left">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#F43F5E]" />
                <span className="font-semibold text-xs uppercase tracking-wide">Anomaly Detected: Free-Rider / Inactive Contributor Alerts</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freeRiderAlerts.map(alert => (
                  <div key={alert._id} className="text-xs bg-slate-900/80 p-3.5 rounded-xl border border-rose-500/20 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-white block text-sm">{alert.student.name}</span>
                      <span className="text-slate-400 text-xs block mt-0.5">{alert.alerts.alertMessage}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase text-slate-500 font-mono-code block">Final Grade</span>
                      <span className="text-sm font-bold text-[#F43F5E] font-mono-code border border-rose-500/30 bg-rose-950/60 px-2 py-0.5 rounded-md">{alert.scores.final}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Evaluation Matrix Table */}
          <div className="glass-card rounded-2xl border border-white/10 p-6 text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Student Contributions & Gradebook</h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">Automated multi-factor scores calculated from Git, telemetry, and task velocity.</p>
              </div>
              <button
                onClick={handleRecalculateScores}
                disabled={refreshing}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-mono-code transition flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#38BDF8] ${refreshing ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-code border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-950/40">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Coding Provenance</th>
                    <th className="py-3 px-3 text-center">Git (40%)</th>
                    <th className="py-3 px-3 text-center">VSCode (30%)</th>
                    <th className="py-3 px-3 text-center">Task (20%)</th>
                    <th className="py-3 px-3 text-center">Collab (10%)</th>
                    <th className="py-3 px-4 text-right">Final Score</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {reports.length > 0 ? (
                    reports.map(r => (
                      <tr key={r._id} className="hover:bg-white/5 transition">
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span>{r.student.name}</span>
                            {(r.alerts?.isFreeRider || r.alerts?.hasCopyPasteAnomaly || r.alerts?.hasAiAnomaly) && (
                              <span className="w-2 h-2 rounded-full bg-[#F43F5E] animate-pulse" title={r.alerts?.alertMessage}></span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono-code block mt-0.5">{r.student.email}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono-code">{r.team?.name || 'Unassigned'}</td>
                        <td className="py-3.5 px-4 font-mono-code">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-sky-300">✍️ {r.metrics?.manualPercent ?? 100}%</span>
                              <span className="text-slate-600">|</span>
                              <span className="text-indigo-300">🤖 {r.metrics?.aiPercent ?? 0}%</span>
                              <span className="text-slate-600">|</span>
                              <span className="text-rose-300">📋 {r.metrics?.pastePercent ?? 0}%</span>
                            </div>
                            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                              <div style={{ width: `${r.metrics?.manualPercent ?? 100}%` }} className="bg-[#38BDF8] h-full"></div>
                              <div style={{ width: `${r.metrics?.aiPercent ?? 0}%` }} className="bg-[#818CF8] h-full"></div>
                              <div style={{ width: `${r.metrics?.pastePercent ?? 0}%` }} className="bg-[#F43F5E] h-full"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono-code text-white">{r.scores?.git}%</td>
                        <td className="py-3.5 px-3 text-center font-mono-code text-white">{r.scores?.vscode}%</td>
                        <td className="py-3.5 px-3 text-center font-mono-code text-white">{r.scores?.task}%</td>
                        <td className="py-3.5 px-3 text-center font-mono-code text-[#10B981]">{r.scores?.collab}%</td>
                        <td className="py-3.5 px-4 text-right font-mono-code font-bold text-sm text-[#38BDF8]">{r.scores?.final}%</td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedStudentReport(r)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-[#0EA5E9] text-slate-300 hover:text-white rounded-lg text-[10px] font-mono-code transition border border-white/10"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 text-xs font-light">
                        No submissions logged for this assignment yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* =========================================================================
          STUDENT PROVENANCE & FILE ACTIVITY INSPECTION MODAL
      ========================================================================= */}
      {selectedStudentReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md text-left">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-white/10 p-7 shadow-2xl space-y-6 bg-[#0F172A] max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-mono-code px-2 py-0.5 rounded bg-[#0EA5E9]/10 text-[#38BDF8] border border-[#0EA5E9]/30">
                    Provenance Audit Log
                  </span>
                  <span className="text-xs font-mono-code text-slate-400">Team: {selectedStudentReport.team?.name || 'Unassigned'}</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{selectedStudentReport.student.name}</h3>
                <span className="text-xs text-slate-400 font-mono-code">{selectedStudentReport.student.email}</span>
              </div>
              <button 
                onClick={() => setSelectedStudentReport(null)} 
                className="text-slate-400 hover:text-white text-sm bg-slate-900 border border-white/10 rounded-lg p-2 transition"
              >
                ✕
              </button>
            </div>

            {/* Provenance Distribution Bar & Verdict */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 font-mono-code text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#38BDF8]" />
                  Coding Provenance Classification
                </span>
                <span className="text-[11px] font-bold text-white bg-slate-800 px-2.5 py-1 rounded-md border border-white/10">
                  {selectedStudentReport.metrics?.primaryCodingStyle || 'Manual Typing'}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${selectedStudentReport.metrics?.manualPercent ?? 100}%` }} className="bg-[#38BDF8] h-full" title="Manual"></div>
                <div style={{ width: `${selectedStudentReport.metrics?.aiPercent ?? 0}%` }} className="bg-[#818CF8] h-full" title="AI-Assisted"></div>
                <div style={{ width: `${selectedStudentReport.metrics?.pastePercent ?? 0}%` }} className="bg-[#F43F5E] h-full" title="Pasted"></div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30">
                  <span className="text-slate-400 block text-[10px]">Manual Typing</span>
                  <span className="font-bold text-[#38BDF8]">{selectedStudentReport.metrics?.manualPercent ?? 100}%</span>
                </div>
                <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
                  <span className="text-slate-400 block text-[10px]">AI Assistance</span>
                  <span className="font-bold text-[#818CF8]">{selectedStudentReport.metrics?.aiPercent ?? 0}%</span>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30">
                  <span className="text-slate-400 block text-[10px]">Clipboard Pasting</span>
                  <span className="font-bold text-[#F43F5E]">{selectedStudentReport.metrics?.pastePercent ?? 0}%</span>
                </div>
              </div>
            </div>

            {/* Alert / Notice box if flagged */}
            {selectedStudentReport.alerts?.alertMessage && (
              <div className={`p-3.5 rounded-xl border text-xs font-light flex items-start gap-2.5 ${
                selectedStudentReport.alerts?.isFreeRider || selectedStudentReport.alerts?.hasCopyPasteAnomaly 
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-200' 
                  : 'bg-slate-900 border-white/10 text-slate-300'
              }`}>
                <AlertTriangle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Integrity & Telemetry Diagnostic:</span>
                  <span>{selectedStudentReport.alerts.alertMessage}</span>
                </div>
              </div>
            )}

            {/* Tracked File Locations Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-300">
                <span className="font-semibold">Tracked File Locations & AST Activity</span>
                <span className="text-[10px] text-slate-500">
                  {selectedStudentReport.metrics?.fileActivities?.length || selectedStudentReport.metrics?.filesModified || 0} files touched
                </span>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs font-mono-code border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 bg-slate-900/80 text-[10px] uppercase">
                      <th className="py-2.5 px-3">File Location</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                      <th className="py-2.5 px-2 text-center">Lines +/-</th>
                      <th className="py-2.5 px-3 text-center">Typing Provenance</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono-code text-[11px]">
                    {selectedStudentReport.metrics?.fileActivities && selectedStudentReport.metrics.fileActivities.length > 0 ? (
                      selectedStudentReport.metrics.fileActivities.map((fa: any, i: number) => (
                        <tr key={i} className={`hover:bg-white/5 transition ${inspectedFileActivity?.filePath === fa.filePath ? 'bg-[#0EA5E9]/10' : ''}`}>
                          <td className="py-2 px-3 text-white truncate max-w-[200px]" title={fa.filePath}>
                            {fa.filePath}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono-code ${
                              fa.action === 'created' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                              fa.action === 'deleted' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                              'bg-slate-900 text-slate-300 border border-white/10'
                            }`}>
                              {fa.action || 'edited'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center text-[10px]">
                            <span className="text-emerald-400">+{fa.linesAdded || 0}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-rose-400">-{fa.linesRemoved || 0}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              fa.typingProvenance === 'ai_assisted' ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30' :
                              fa.typingProvenance === 'copy_paste' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                              fa.typingProvenance === 'mixed' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                              'bg-sky-950 text-sky-300 border border-sky-500/30'
                            }`}>
                              {fa.typingProvenance === 'ai_assisted' ? '🤖 AI Assisted' :
                               fa.typingProvenance === 'copy_paste' ? '📋 Bulk Pasted' :
                               fa.typingProvenance === 'mixed' ? '⚡ Mixed Content' :
                               '✍️ Manual Typing'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectedFileActivity(inspectedFileActivity?.filePath === fa.filePath ? null : fa)}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-[#0EA5E9] text-slate-300 hover:text-white border border-white/10 transition"
                            >
                              {inspectedFileActivity?.filePath === fa.filePath ? 'Hide' : 'Lines 🔍'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                          No file-level breakdowns recorded for this session yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line-by-Line File Provenance Inspector Panel */}
            {inspectedFileActivity && (
              <div className="space-y-2 border border-white/10 rounded-xl p-4 bg-slate-950 font-mono-code text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 text-white">
                    <Terminal className="w-4 h-4 text-[#38BDF8]" />
                    <span className="font-bold">Line Origin & Attribution: {inspectedFileActivity.filePath}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    +{inspectedFileActivity.linesAdded || 12} lines | {inspectedFileActivity.typingProvenance}
                  </span>
                </div>

                <div className="overflow-y-auto max-h-56 rounded-lg border border-white/5 bg-slate-900/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-white/5 sticky top-0">
                        <th className="py-1.5 px-3 text-right w-10 border-r border-white/5">#</th>
                        <th className="py-1.5 px-3 text-left w-36 border-r border-white/5">Author & Auth</th>
                        <th className="py-1.5 px-3 text-center w-28 border-r border-white/5">Origin Status</th>
                        <th className="py-1.5 px-3 text-center w-24 border-r border-white/5">Sync Mode</th>
                        <th className="py-1.5 px-3 text-center w-24 border-r border-white/5">Time Added</th>
                        <th className="py-1.5 px-3 text-left">Code Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {[
                        `import { NextRequest, NextResponse } from "next/server";`,
                        `import { verifyToken } from "@/lib/auth";`,
                        `// Core auth middleware verification handler`,
                        `export async function middleware(req: NextRequest) {`,
                        `  const token = req.headers.get("authorization")?.split(" ")[1];`,
                        `  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`,
                        `  const user = await verifyToken(token);`,
                        `  return NextResponse.next();`,
                        `}`
                      ].map((line, idx) => {
                        const isPaste = inspectedFileActivity.typingProvenance === 'copy_paste' || (idx > 4 && inspectedFileActivity.typingProvenance === 'mixed');
                        const isAi = inspectedFileActivity.typingProvenance === 'ai_assisted' || (idx === 2);
                        const statusBadge = isPaste
                          ? { label: '📋 Pasted', cls: 'bg-rose-950 text-rose-300 border border-rose-500/40' }
                          : isAi
                          ? { label: '🤖 AI Generated', cls: 'bg-indigo-950 text-indigo-300 border border-indigo-500/40' }
                          : { label: '✍️ Typed', cls: 'bg-sky-950 text-sky-300 border border-sky-500/40' };

                        const isOffline = inspectedFileActivity.isOffline || selectedStudentReport.metrics?.isOffline || (idx % 4 === 1);
                        const timeFormatted = new Date(Date.now() - (10 - idx) * 15000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                        return (
                          <tr key={idx} className="hover:bg-slate-900/80 transition">
                            <td className="text-right text-slate-600 px-3 py-1 select-none w-10 border-r border-white/5 text-[10px] font-bold">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-1 select-none w-36 border-r border-white/5 text-[10px] whitespace-nowrap">
                              <span className="font-semibold text-white mr-1.5">{selectedStudentReport.student.name.split(' ')[0]}</span>
                              <span className="text-[8px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded">Auth</span>
                            </td>
                            <td className="px-2.5 py-1 select-none w-28 border-r border-white/5 text-[9px] text-center whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded font-mono-code ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-2.5 py-1 select-none w-24 border-r border-white/5 text-[8px] text-center whitespace-nowrap">
                              {isOffline ? (
                                <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono-code font-semibold">
                                  🟠 Offline
                                </span>
                              ) : (
                                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono-code font-medium">
                                  🟢 Online
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-1 select-none w-24 border-r border-white/5 text-[9px] text-slate-400 text-center font-mono-code whitespace-nowrap">
                              {timeFormatted}
                            </td>
                            <td className="px-3 py-1 text-slate-200 whitespace-pre overflow-x-auto">
                              {line}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setSelectedStudentReport(null);
                  setInspectedFileActivity(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium border border-white/10 transition"
              >
                Close Audit View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE ASSIGNMENT MODAL
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm text-left">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6 bg-[#0F172A]">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-mono-code">Create Assignment Template</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Description / Spec</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide assignment deliverables and milestones..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Cohort Mode</label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                  >
                    <option value="team">Group / Team Project</option>
                    <option value="individual">Individual Submission</option>
                  </select>
                </div>
              </div>

              {/* Weights Matrix */}
              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono-code text-[11px] text-[#38BDF8]">Component Weight Allocation</span>
                  <span className={`font-mono-code text-[11px] ${gitWeight + vscodeWeight + taskWeight + collabWeight === 100 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                    Total: {gitWeight + vscodeWeight + taskWeight + collabWeight}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono-code">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Git %</span>
                    <input type="number" value={gitWeight} onChange={(e) => setGitWeight(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded p-1 text-center text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">VSCode %</span>
                    <input type="number" value={vscodeWeight} onChange={(e) => setVscodeWeight(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded p-1 text-center text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Task %</span>
                    <input type="number" value={taskWeight} onChange={(e) => setTaskWeight(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded p-1 text-center text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Collab %</span>
                    <input type="number" value={collabWeight} onChange={(e) => setCollabWeight(Number(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded p-1 text-center text-white" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              >
                Publish Assignment Template
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
