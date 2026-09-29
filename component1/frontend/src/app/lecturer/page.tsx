'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser, logoutUser } from '../../services/api';
import { 
  Users, Plus, Calendar, BarChart3, AlertTriangle, RefreshCw, 
  GitFork, LogOut, CheckSquare, Search, Printer,
  Folder, FileText, ChevronLeft, Code, Code2, GraduationCap,
  ExternalLink, Terminal, ShieldCheck, ArrowUpRight, Activity,
  CheckCircle2, Laptop, Bot, ClipboardCheck, Sparkles
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
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-slate-950">
      
      {/* =========================================================================
          LEFT SIDEBAR DOCK
      ========================================================================= */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/80 bg-white shrink-0 flex flex-col justify-between p-6">
        <div className="space-y-8 text-left">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-[#A3E635] shadow-xs group-hover:scale-105 transition">
              <Code2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-none">OffSync</span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">Lecturer Console</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-6 text-xs text-slate-600">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2 font-mono">Examiner Views</span>
              
              <button 
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#121417] text-white font-semibold shadow-xs text-left cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-[#A3E635]" />
                <span>Performance Analytics</span>
              </button>
              
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl hover:bg-slate-100 hover:text-slate-900 font-medium transition text-left cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#15803D]" />
                <span>New Assignment</span>
              </button>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2 font-mono">Reports & Export</span>
              <button 
                onClick={() => window.print()}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl hover:bg-slate-100 hover:text-slate-900 font-medium transition text-left cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Cohort Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* User profile footer & logout */}
        <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col gap-3 text-left">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
              <GraduationCap className="w-4 h-4 text-[#A3E635]" />
            </div>
            <div className="truncate min-w-0">
              <span className="font-bold text-xs text-slate-900 block leading-tight truncate">{user?.name || 'Course Examiner'}</span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">{user?.email}</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 transition rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
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
        <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-6 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-800">Lecturer Console</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-mono text-[11px]">Cohort Assessment</span>
          </div>

          <div className="flex items-center gap-3">
            {selectedAssignment && (
              <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 rounded-full px-3.5 py-1 font-mono flex items-center gap-1.5 shadow-2xs">
                Invite Code: <strong className="text-slate-900">{selectedAssignment.invitationCode}</strong>
              </span>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-grow p-6 sm:p-8 space-y-6 max-w-[1500px] w-full mx-auto">
          
          {/* Header row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 text-left">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignment Analytics & Standing</h1>
              <p className="text-slate-500 text-xs font-normal mt-0.5">Audit student contributions, Git commits, and biometric keystroke provenance.</p>
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              {assignments.length > 0 && (
                <select
                  onChange={handleAssignmentChange}
                  value={selectedAssignment?._id || ''}
                  className="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#A3E635] shadow-xs cursor-pointer"
                >
                  {assignments.map(a => (
                    <option key={a._id} value={a._id}>{a.title}</option>
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
          {selectedAssignment && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-left space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-700 font-mono bg-slate-50">
                      Type: {selectedAssignment.assignmentType}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedAssignment.title}</h2>
                  <p className="text-slate-500 text-xs max-w-4xl leading-relaxed">{selectedAssignment.description}</p>
                </div>

                <div className="flex flex-col justify-between items-end md:border-l border-slate-100 md:pl-6 shrink-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Deadline: {new Date(selectedAssignment.deadline).toLocaleDateString()}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] block uppercase text-slate-400 font-bold tracking-wider mb-1 font-mono">Weights Allocation</span>
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Git {selectedAssignment.weights.git}%</span>
                      <span className="px-2 py-0.5 rounded bg-[#A3E635]/20 text-slate-900 font-bold">VSCode {selectedAssignment.weights.vscode}%</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Task {selectedAssignment.weights.task}%</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Collab {selectedAssignment.weights.collab}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Students Enrolled</span>
                <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{totalStudents}</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Teams</span>
                <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{totalTeams}</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800">
                <GitFork className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Anomaly Alerts</span>
                <h3 className={`text-3xl font-extrabold font-mono ${freeRiderAlerts.length > 0 ? 'text-rose-600' : 'text-[#15803D]'}`}>
                  {freeRiderAlerts.length}
                </h3>
              </div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${freeRiderAlerts.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Cohort Average</span>
                <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{averageCohortScore}%</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/20 flex items-center justify-center text-slate-950 font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Free Riders Anomaly Alerts */}
          {freeRiderAlerts.length > 0 && (
            <div className="p-5 rounded-3xl border border-rose-200 bg-rose-50/50 space-y-3 text-left">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="uppercase tracking-wide">Anomaly Detected: Free-Rider or Inactive Contributor Alerts</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {freeRiderAlerts.map(alert => (
                  <div key={alert._id} className="text-xs bg-white p-4 rounded-2xl border border-rose-200 flex justify-between items-center shadow-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{alert.student.name}</span>
                      <span className="text-slate-500 text-xs block mt-0.5">{alert.alerts.alertMessage}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase text-slate-400 font-mono block">Standing</span>
                      <span className="text-sm font-bold text-rose-600 font-mono bg-rose-100 px-2.5 py-0.5 rounded-full">{alert.scores.final}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Evaluation Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-left space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Student Contributions & Gradebook</h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">Automated multi-factor score calculated from Git commits, telemetry, and task velocity.</p>
              </div>
              <button
                onClick={handleRecalculateScores}
                disabled={refreshing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Recalculate</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Coding Provenance</th>
                    <th className="py-3 px-3 text-center">Git (40%)</th>
                    <th className="py-3 px-3 text-center">VSCode (30%)</th>
                    <th className="py-3 px-3 text-center">Task (20%)</th>
                    <th className="py-3 px-3 text-center">Collab (10%)</th>
                    <th className="py-3 px-4 text-right">Final Score</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {reports.length > 0 ? (
                    reports.map(r => (
                      <tr key={r._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{r.student.name}</span>
                            {(r.alerts?.isFreeRider || r.alerts?.hasCopyPasteAnomaly || r.alerts?.hasAiAnomaly) && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={r.alerts?.alertMessage}></span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5 font-normal">{r.student.email}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">{r.team?.name || 'Unassigned'}</td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-slate-800 font-medium">✍️ {r.metrics?.manualPercent ?? 100}%</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-purple-600 font-medium">🤖 {r.metrics?.aiPercent ?? 0}%</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-rose-600 font-medium">📋 {r.metrics?.pastePercent ?? 0}%</span>
                            </div>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                              <div style={{ width: `${r.metrics?.manualPercent ?? 100}%` }} className="bg-[#A3E635] h-full"></div>
                              <div style={{ width: `${r.metrics?.aiPercent ?? 0}%` }} className="bg-[#8B5CF6] h-full"></div>
                              <div style={{ width: `${r.metrics?.pastePercent ?? 0}%` }} className="bg-rose-500 h-full"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.git}%</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.vscode}%</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.task}%</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.collab}%</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900">{r.scores?.final}%</td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedStudentReport(r)}
                            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-full text-xs transition border border-slate-200 shadow-2xs cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        No submissions recorded for this assignment yet.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm text-left">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold font-mono px-2.5 py-0.5 rounded-full bg-[#A3E635]/20 text-slate-900 border border-[#A3E635]/40">
                    Provenance Audit Log
                  </span>
                  <span className="text-xs font-mono text-slate-500">Team: {selectedStudentReport.team?.name || 'Unassigned'}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{selectedStudentReport.student.name}</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedStudentReport.student.email}</span>
              </div>
              <button 
                onClick={() => setSelectedStudentReport(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Provenance Distribution Bar & Verdict */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-slate-700" />
                  Coding Provenance Classification
                </span>
                <span className="text-[11px] font-bold text-slate-900 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs font-mono">
                  {selectedStudentReport.metrics?.primaryCodingStyle || 'Manual Typing'}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                <div style={{ width: `${selectedStudentReport.metrics?.manualPercent ?? 100}%` }} className="bg-[#A3E635] h-full" title="Manual"></div>
                <div style={{ width: `${selectedStudentReport.metrics?.aiPercent ?? 0}%` }} className="bg-[#8B5CF6] h-full" title="AI-Assisted"></div>
                <div style={{ width: `${selectedStudentReport.metrics?.pastePercent ?? 0}%` }} className="bg-rose-500 h-full" title="Pasted"></div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center text-xs pt-1 font-mono">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Manual Typing</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedStudentReport.metrics?.manualPercent ?? 100}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">AI Assistance</span>
                  <span className="font-extrabold text-purple-700 text-sm">{selectedStudentReport.metrics?.aiPercent ?? 0}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Clipboard Pasting</span>
                  <span className="font-extrabold text-rose-600 text-sm">{selectedStudentReport.metrics?.pastePercent ?? 0}%</span>
                </div>
              </div>
            </div>

            {/* Alert / Notice box if flagged */}
            {selectedStudentReport.alerts?.alertMessage && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
                selectedStudentReport.alerts?.isFreeRider || selectedStudentReport.alerts?.hasCopyPasteAnomaly 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Integrity & Telemetry Diagnostic:</span>
                  <span>{selectedStudentReport.alerts.alertMessage}</span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSelectedStudentReport(null);
                  setInspectedFileActivity(null);
                }}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm text-left">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Assignment</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#A3E635] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Spec</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deliverables, milestones, and instructions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#A3E635] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#A3E635] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cohort Mode</label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#A3E635] focus:bg-white cursor-pointer"
                  >
                    <option value="team">Group / Team Project</option>
                    <option value="individual">Individual Submission</option>
                  </select>
                </div>
              </div>

              {/* Weights Matrix */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">Component Weight Allocation</span>
                  <span className={`font-mono font-bold ${gitWeight + vscodeWeight + taskWeight + collabWeight === 100 ? 'text-[#15803D]' : 'text-rose-600'}`}>
                    Total: {gitWeight + vscodeWeight + taskWeight + collabWeight}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Git %</span>
                    <input type="number" value={gitWeight} onChange={(e) => setGitWeight(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">VSCode %</span>
                    <input type="number" value={vscodeWeight} onChange={(e) => setVscodeWeight(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Task %</span>
                    <input type="number" value={taskWeight} onChange={(e) => setTaskWeight(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Collab %</span>
                    <input type="number" value={collabWeight} onChange={(e) => setCollabWeight(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-center text-slate-900" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold rounded-full text-xs transition cursor-pointer shadow-xs"
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
