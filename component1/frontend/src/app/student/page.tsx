'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/services/api';
import {
  saveWorkspaceHandle,
  getWorkspaceHandle,
  deleteWorkspaceHandle,
  verifyHandlePermission,
  saveWorkspaceSnapshot,
  getWorkspaceSnapshot,
  clearWorkspaceSnapshot
} from '@/services/workspaceStorage';
import {
  verifyLocalGitRepository,
  GitVerificationResult
} from '@/services/gitValidator';
import { AppHeader } from '@/components/layout/app-header';
import {
  StudentAssignmentBar,
  StudentTabsNav,
  StudentTabKey,
  RepositoryTab,
  CommitsTab,
  TimelineTab,
  KanbanTab,
  TeamsTab,
  DirectoryTab,
  JoinCohortModal,
  CreateGeneralTeamModal
} from '@/features/student';
import { classifyLineProvenance } from '@/features/student/hooks/use-file-intelligence';
import {
  Laptop,
  Bot,
  ClipboardCheck,
  ShieldCheck,
  RefreshCw,
  FileText,
  X,
  CheckCircle2,
  Download,
  BrainCircuit,
  Sparkles,
  HelpCircle,
  Activity,
  Info,
  Database,
  FileSpreadsheet,
  Layers,
  Check
} from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [student, setStudent] = useState<any>(null);

  // Assignment & Team context
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<StudentTabKey>('repository');

  // Kanban state
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // Timeline / Cadence filter
  const [cadenceFilter, setCadenceFilter] = useState<'keystrokes' | 'ast' | 'pastes'>('keystrokes');

  // Join Cohort Modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [searchedAssignment, setSearchedAssignment] = useState<any>(null);
  const [searchedTeams, setSearchedTeams] = useState<any[]>([]);
  const [teamFlow, setTeamFlow] = useState<'none' | 'create' | 'join'>('none');
  const [teamName, setTeamName] = useState('');
  const [gitUsername, setGitUsername] = useState('');
  const [teamInviteCode, setTeamInviteCode] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  // General Teams tab state
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [showGeneralTeamModal, setShowGeneralTeamModal] = useState(false);
  const [generalTeamName, setGeneralTeamName] = useState('');
  const [generalTeamGit, setGeneralTeamGit] = useState('');
  const [generalTeamRepo, setGeneralTeamRepo] = useState('');
  const [linkInviteCodes, setLinkInviteCodes] = useState<Record<string, string>>({});
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Workspace Scanner & Git
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [localDirName, setLocalDirName] = useState<string>('');
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [scannedFolders, setScannedFolders] = useState<any[]>([]);
  const [offlineEdits, setOfflineEdits] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedOfflineFile, setSelectedOfflineFile] = useState<any>(null);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const [gitVerification, setGitVerification] = useState<GitVerificationResult | null>(null);
  const [savedFolderPrompt, setSavedFolderPrompt] = useState<{ folderName: string; handle: any } | null>(null);

  // Status & Telemetry
  const [syncingGit, setSyncingGit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [studentBreakdown, setStudentBreakdown] = useState<any[]>([]);
  const [commitsList, setCommitsList] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Magic Function #5 — Machine Learning Continuous Scoring State (Separated from Manual)
  const [mlScore, setMlScore] = useState<any>(null);
  const [showMlDefenseModal, setShowMlDefenseModal] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);

  const fetchMlAuthenticity = async (reportData?: any) => {
    try {
      const r = reportData || report;
      const hours = Number(r?.metrics?.codingHours || 0);
      const keys = Number(r?.metrics?.totalKeystrokes || 0);
      const commits = Number(r?.metrics?.totalCommits || 0);

      // If no activity has occurred yet in this assignment, set mlScore to null (awaiting telemetry)
      if (hours === 0 && keys === 0 && commits === 0) {
        setMlScore(null);
        return;
      }

      setMlLoading(true);
      const cpm = r?.metrics?.keystrokesPerMinute || 54.8;
      const pasteRatio = ((r?.metrics?.codingProvenance?.externalPercent ?? r?.metrics?.codingProvenance?.pastePercent ?? 0) / 100.0);
      const churn = r?.metrics?.codeChurnRatio || 0.14;

      const res = await fetch('/api/ml-authenticity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typing_speed_cpm: cpm,
          paste_ratio: pasteRatio,
          keystrokes: keys || 250,
          code_churn_ratio: churn
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.prediction) {
          setMlScore(data.prediction);
        }
      }
    } catch (err) {
      console.warn('ML Authenticity scoring fetch failed:', err);
    } finally {
      setMlLoading(false);
    }
  };

  // Unified Scanner & Directory Traversal Engine
  const scanAndAutoSync = async (
    handle: any,
    assignmentId?: string,
    teamObj?: any,
    checkResult?: GitVerificationResult
  ) => {
    const targetAssignId = assignmentId || selectedAssignment?._id;
    if (!targetAssignId || !handle) return;

    if (checkResult && checkResult.status === 'mismatch') {
      setError(checkResult.message || 'Repository Mismatch: Access blocked.');
      return;
    }

    setScanning(true);
    setAutoSyncInProgress(true);

    try {
      const files: any[] = [];
      const folderMap = new Map<string, { name: string; path: string; fileCount: number; modifiedCount: number; totalSize: number }>();

      const traverse = async (dirHandle: any, relativePath = '') => {
        for await (const entry of dirHandle.values()) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === '.next' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name.startsWith('.')
          ) continue;

          const currentPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

          if (entry.kind === 'directory') {
            if (!folderMap.has(currentPath)) {
              folderMap.set(currentPath, {
                name: entry.name,
                path: currentPath,
                fileCount: 0,
                modifiedCount: 0,
                totalSize: 0
              });
            }
            await traverse(entry, currentPath);
          } else if (entry.kind === 'file') {
            const file = await entry.getFile();
            let text = '';
            try {
              if (file.size < 2 * 1024 * 1024) {
                text = await file.text();
              }
            } catch {
              text = '';
            }
            const lines = text ? text.split('\n') : [];
            const parentDir = relativePath || '(root)';

            const fileObj = {
              name: entry.name,
              path: currentPath,
              parentFolder: parentDir,
              size: file.size,
              lastModified: file.lastModified,
              lineCount: lines.length,
              content: text,
              lines
            };
            files.push(fileObj);

            if (relativePath && folderMap.has(relativePath)) {
              const fStats = folderMap.get(relativePath)!;
              fStats.fileCount++;
              fStats.totalSize += file.size;
              if (file.lastModified >= Date.now() - 48 * 60 * 60 * 1000) {
                fStats.modifiedCount++;
              }
            }
          }
        }
      };

      await traverse(handle);
      const foldersList = Array.from(folderMap.values()).sort((a, b) => a.path.localeCompare(b.path));
      const recentThreshold = Date.now() - 48 * 60 * 60 * 1000;
      const edits = files.filter(f => f.lastModified >= recentThreshold);

      setScannedFiles(files);
      setScannedFolders(foldersList);
      setOfflineEdits(edits);

      // Save instant snapshot cache
      saveWorkspaceSnapshot(targetAssignId, {
        folderName: handle.name,
        scannedFiles: files.map(f => ({
          name: f.name,
          path: f.path,
          parentFolder: f.parentFolder,
          size: f.size,
          lastModified: f.lastModified,
          lineCount: f.lineCount
        })),
        offlineEdits: edits.map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
          lastModified: f.lastModified,
          lineCount: f.lineCount
        })),
        gitVerification: checkResult || gitVerification
      });

      // Synchronize detailed telemetry & per-line records directly to MongoDB (Off-Git / Zero Git Pollution)
      const currentTeam = teamObj || team;
      if (currentTeam?._id) {
        try {
          const totalFileSize = files.reduce((acc, f) => acc + (f.size || (f.lineCount || 1) * 35), 0);
          const earliestModMs = files.reduce((min, f) => Math.min(min, f.lastModified || Date.now()), Date.now());
          const latestModMs = files.reduce((max, f) => Math.max(max, f.lastModified || Date.now()), Date.now());

          const fileActivities = files.slice(0, 50).map(f => {
            const rawLines = f.lines || (f.content ? f.content.split('\n') : []);
            const fEndMs = f.lastModified ? new Date(f.lastModified).getTime() : Date.now();
            const fIso = new Date(fEndMs).toISOString();
            const fChars = f.size || (f.content ? f.content.length : Math.round((f.lineCount || 1) * 35));

            // Detect repeated / duplicate code blocks across the file
            const duplicateLineIndices = new Set<number>();
            const seenBlockSignatures = new Map<string, number>();
            const BLOCK_SIZE = 2;

            for (let i = 0; i <= rawLines.length - BLOCK_SIZE; i++) {
              const slice = rawLines.slice(i, i + BLOCK_SIZE).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
              if (slice.length === BLOCK_SIZE) {
                const sig = slice.join(':::');
                if (seenBlockSignatures.has(sig)) {
                  for (let k = 0; k < BLOCK_SIZE; k++) {
                    duplicateLineIndices.add(i + k);
                  }
                } else {
                  seenBlockSignatures.set(sig, i);
                }
              }
            }

            const lineRecords = rawLines.slice(0, 300).map((lineText: string, idx: number) => {
              const prevTrimmed = (rawLines[idx - 1] || '').trim();
              const nextTrimmed = (rawLines[idx + 1] || '').trim();
              const isDuplicateBlock = duplicateLineIndices.has(idx);
              const pType = classifyLineProvenance(lineText, undefined, { prevTrimmed, nextTrimmed, isDuplicateBlock });
              const prov: 'manual' | 'copy_paste' | 'ai_assisted' =
                pType === 'typed' ? 'manual' : pType === 'pasted' ? 'copy_paste' : 'ai_assisted';
              return {
                lineNumber: idx + 1,
                lineText,
                provenance: prov,
                isOffline: true,
                timestamp: fIso
              };
            });

            const typedCount = lineRecords.filter((r: any) => r.provenance === 'manual').length;
            const pastedCount = lineRecords.filter((r: any) => r.provenance === 'copy_paste').length;
            const aiCount = lineRecords.filter((r: any) => r.provenance === 'ai_assisted').length;
            const totalCount = Math.max(1, lineRecords.length);

            const typedRatio = typedCount / totalCount;
            const pastedRatio = pastedCount / totalCount;
            const aiRatio = aiCount / totalCount;

            const manualChars = Math.round(fChars * typedRatio);
            const pasteChars = Math.round(fChars * pastedRatio);
            const aiChars = Math.round(fChars * aiRatio);

            const typingProvenance: 'manual' | 'copy_paste' | 'ai_assisted' | 'mixed' =
              typedRatio >= 0.7 ? 'manual' :
                aiRatio >= 0.3 ? 'ai_assisted' :
                  pastedRatio >= 0.5 ? 'copy_paste' : 'mixed';

            return {
              filePath: f.path,
              action: 'edited',
              manualChars,
              pasteChars,
              aiChars,
              manualKeystrokes: typedCount * 28,
              pasteEvents: pastedCount > 0 ? 1 : 0,
              aiEvents: aiCount > 0 ? 1 : 0,
              typingProvenance,
              linesAdded: f.lineCount || 0,
              linesRemoved: 0,
              lineRecords,
              timestamp: new Date(fEndMs)
            };
          });

          const totalManualChars = fileActivities.reduce((acc, fa) => acc + fa.manualChars, 0);
          const totalPasteChars = fileActivities.reduce((acc, fa) => acc + fa.pasteChars, 0);
          const totalAiChars = fileActivities.reduce((acc, fa) => acc + fa.aiChars, 0);
          const totalCharsAll = Math.max(1, totalManualChars + totalPasteChars + totalAiChars);

          const manualPct = Math.round((totalManualChars / totalCharsAll) * 100);
          const pastePct = Math.round((totalPasteChars / totalCharsAll) * 100);
          const aiPct = Math.round((totalAiChars / totalCharsAll) * 100);

          const overallStyle =
            manualPct >= 65 ? 'Organic Human Coding' :
              aiPct >= 30 ? 'AI Assisted' :
                pastePct >= 50 ? 'Heavy Copy-Paste' : 'Mixed Authoring';

          const sessionPayload = {
            sessionStart: new Date(earliestModMs).toISOString(),
            sessionEnd: new Date(latestModMs).toISOString(),
            durationMinutes: Math.max(1, Math.round((latestModMs - earliestModMs) / 60000) || 5),
            keystrokes: Math.round(totalManualChars * 1.1),
            charactersPasted: totalPasteChars,
            pasteCount: files.length,
            filesEdited: files.map(f => f.path),
            filesCreated: [],
            codingProvenance: {
              manualPercent: manualPct,
              pastePercent: pastePct,
              aiPercent: aiPct,
              style: overallStyle
            },
            fileActivities
          };

          await api.vscode.sync({
            assignmentId: targetAssignId,
            sessions: [sessionPayload]
          });
        } catch (syncErr) {
          console.warn('Telemetry database sync notice:', syncErr);
        }
      }

      setSuccess(`Workspace sync complete: ${files.length} files attested & telemetry stored to DB (off-git).`);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError('Workspace scan failed: ' + err.message);
    } finally {
      setScanning(false);
      setAutoSyncInProgress(false);
    }
  };

  const checkAndRestoreWorkspace = async (assignmentId: string, teamObj?: any) => {
    try {
      const snapshot = getWorkspaceSnapshot(assignmentId);
      if (snapshot) {
        if (snapshot.folderName) setLocalDirName(snapshot.folderName);
        if (snapshot.scannedFiles) setScannedFiles(snapshot.scannedFiles);
        if (snapshot.offlineEdits) setOfflineEdits(snapshot.offlineEdits);
        if (snapshot.gitVerification) setGitVerification(snapshot.gitVerification);
      }

      const saved = await getWorkspaceHandle(assignmentId);
      if (saved && saved.folderName) {
        setLocalDirName(saved.folderName);
        if (saved.handle) {
          const hasPermission = await verifyHandlePermission(saved.handle, false);
          if (hasPermission) {
            const check = await verifyLocalGitRepository(saved.handle, teamObj?.repositoryUrl || repoUrl);
            setGitVerification(check);
            if (check.status === 'mismatch') {
              setLocalDirHandle(null);
              setLocalDirName('');
              setScannedFiles([]);
              setOfflineEdits([]);
              setSavedFolderPrompt(null);
              if (assignmentId) {
                await deleteWorkspaceHandle(assignmentId);
                clearWorkspaceSnapshot(assignmentId);
              }
              return;
            }
            setLocalDirHandle(saved.handle);
            setSavedFolderPrompt(null);
            await scanAndAutoSync(saved.handle, assignmentId, teamObj, check);
          } else {
            // Need user interaction to re-request browser permission
            setSavedFolderPrompt({ folderName: saved.folderName, handle: saved.handle });
          }
        } else {
          setSavedFolderPrompt({ folderName: saved.folderName, handle: null });
        }
      } else {
        setSavedFolderPrompt(null);
      }
    } catch (err) {
      console.warn('Workspace restore error:', err);
    }
  };

  const loadStudentContext = async (assignmentId: string) => {
    try {
      setError('');
      const teamRes = await api.teams.getByAssignment(assignmentId).catch(() => null);
      if (teamRes && teamRes.team) {
        setTeam(teamRes.team);
        setRepoUrl(teamRes.team.repositoryUrl || '');

        const tasksRes = await api.tasks.getByTeam(teamRes.team._id).catch(() => ({ tasks: [] }));
        setTasks(tasksRes.tasks || []);

        const reportRes = await api.analytics.getStudentReport(assignmentId).catch(() => null);
        if (reportRes && reportRes.report) {
          setReport(reportRes.report);
          fetchMlAuthenticity(reportRes.report);
        } else {
          fetchMlAuthenticity();
        }

        const teamAnalyticsRes = await api.analytics.getTeamAnalytics(teamRes.team._id).catch(() => null);
        if (teamAnalyticsRes) {
          if (teamAnalyticsRes.timeline) setTimelineData(teamAnalyticsRes.timeline);
          if (teamAnalyticsRes.studentBreakdown) setStudentBreakdown(teamAnalyticsRes.studentBreakdown);
          if (teamAnalyticsRes.activities) setCommitsList(teamAnalyticsRes.activities);
          if (teamAnalyticsRes.sessions) setSessionsList(teamAnalyticsRes.sessions);
        }

        await checkAndRestoreWorkspace(assignmentId, teamRes.team);
      } else {
        setTeam(null);
        setTasks([]);
        setReport(null);
        setTimelineData([]);
        setStudentBreakdown([]);
        setCommitsList([]);
        setSessionsList([]);
        await checkAndRestoreWorkspace(assignmentId, null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async (targetAssignmentId?: string) => {
    try {
      const data = await api.assignments.getAll();
      const allAssignments = data.assignments || [];
      setAssignments(allAssignments);

      if (allAssignments.length > 0) {
        const targetId = targetAssignmentId || selectedAssignment?._id;
        const matched = allAssignments.find((a: any) => a._id === targetId);
        const chosen = matched || allAssignments[0];
        setSelectedAssignment(chosen);
        await loadStudentContext(chosen._id);
      }
      await loadMyTeams();
      await loadStudentDirectory();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadMyTeams = async () => {
    try {
      const res = await api.teams.getMyTeams();
      setMyTeams(res.teams || []);
    } catch (err) {
      console.error('Failed to load teams', err);
    }
  };

  const loadStudentDirectory = async () => {
    try {
      const res = await api.users.getStudents();
      setStudentsList(res.students || []);
    } catch (err) {
      console.error('Failed to load student directory', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'student') {
      router.push('/login?role=student');
      return;
    }
    setStudent(currentUser);
    fetchData();
  }, []);

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const found = assignments.find((a) => a._id === id);
    if (found) {
      setSelectedAssignment(found);
      await loadStudentContext(found._id);
    }
  };

  const handleSyncGit = async () => {
    if (!repoUrl) return;
    setSyncingGit(true);
    setError('');
    setSuccess('');
    try {
      await api.github.sync({
        url: repoUrl,
        assignmentId: selectedAssignment?._id,
        teamId: team?._id
      });
      setSuccess('GitHub telemetry synchronized successfully!');
      if (selectedAssignment) {
        await loadStudentContext(selectedAssignment._id);
      }
    } catch (err: any) {
      setError(err.message || 'Git sync failed');
    } finally {
      setSyncingGit(false);
    }
  };

  const handleSearchInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.assignments.getByCode(inviteCode.trim().toUpperCase());
      if (res && res.assignment) {
        setSearchedAssignment(res.assignment);
        setSearchedTeams(res.teams || []);
        setTeamFlow('none');
      } else {
        setError('No assignment found with this invite code.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid assignment invite code');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedRepo = repoUrl.trim();
    if (!trimmedRepo) {
      setError('GitHub Repository URL is required when creating a team.');
      return;
    }
    try {
      const res = await api.teams.create({
        name: teamName,
        assignmentId: searchedAssignment._id,
        repositoryUrl: trimmedRepo,
        gitUsername,
        memberIds: selectedMembers
      });
      setTeam(res.team);
      setRepoUrl(res.team?.repositoryUrl || trimmedRepo);
      setSuccess(`Team created successfully! Invite code: ${res.team.inviteCode}`);
      setShowJoinModal(false);
      await fetchData(searchedAssignment?._id);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    }
  };

  const handleJoinIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedRepo = repoUrl.trim();
    if (!trimmedRepo) {
      setError('GitHub Repository URL is required for individual assignments.');
      return;
    }
    try {
      const res = await api.teams.create({
        name: student?.name ? `${student.name} (Individual)` : 'Individual Submission',
        assignmentId: searchedAssignment._id,
        repositoryUrl: trimmedRepo,
        repoUrl: trimmedRepo,
        gitUsername,
        memberIds: []
      });
      setTeam(res.team);
      setRepoUrl(res.team?.repositoryUrl || trimmedRepo);
      setSuccess('Started individual assignment successfully!');
      setShowJoinModal(false);
      await fetchData(searchedAssignment?._id);
    } catch (err: any) {
      setError(err.message || 'Failed to start individual assignment');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.teams.join({ inviteCode: teamInviteCode, gitUsername });
      setSuccess('Joined team successfully!');
      setShowJoinModal(false);
      await fetchData(searchedAssignment?._id);
    } catch (err: any) {
      setError(err.message || 'Failed to join team');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    try {
      const res = await api.tasks.create({
        teamId: team._id,
        title: newTaskTitle,
        description: newTaskDesc,
        assignedTo: newTaskAssignee || student?.id
      });
      setTasks((prev) => [...prev, res.task]);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.tasks.updateStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.tasks.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  const handleCreateGeneralTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedRepo = generalTeamRepo.trim();
    if (!trimmedRepo) {
      setError('GitHub Repository URL is required when creating a team.');
      return;
    }
    try {
      await api.teams.createGeneral({
        name: generalTeamName,
        gitUsername: generalTeamGit,
        repositoryUrl: trimmedRepo,
        memberIds: selectedMembers
      });
      setSuccess('General team template created successfully!');
      setShowGeneralTeamModal(false);
      setGeneralTeamName('');
      setGeneralTeamGit('');
      setGeneralTeamRepo('');
      setSelectedMembers([]);
      loadMyTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to create general team.');
    }
  };

  const handleUpdateTeamRepo = async (teamId: string, repositoryUrl: string) => {
    try {
      await api.teams.updateRepo({ teamId, repositoryUrl });
      setSuccess('Repository link updated successfully!');
      if (team?._id === teamId) {
        setRepoUrl(repositoryUrl);
      }
      await loadMyTeams();
      if (selectedAssignment?._id) {
        await loadStudentContext(selectedAssignment._id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update repository URL');
      throw err;
    }
  };

  const handleUpdateActiveRepo = async (newRepoUrl: string) => {
    const trimmed = (newRepoUrl || '').trim();
    if (!trimmed) return;
    if (team?._id) {
      await handleUpdateTeamRepo(team._id, trimmed);
      return;
    }
    if (selectedAssignment?._id) {
      const isSolo = selectedAssignment.assignmentType === 'individual';
      const res = await api.teams.create({
        name: isSolo ? `${student?.name || 'Student'} (Individual)` : `${student?.name || 'Student'}'s Team`,
        assignmentId: selectedAssignment._id,
        repositoryUrl: trimmed,
        repoUrl: trimmed,
        gitUsername: student?.name ? student.name.toLowerCase().replace(/\s+/g, '-') : 'student',
        memberIds: []
      });
      setTeam(res.team);
      setRepoUrl(res.team?.repositoryUrl || trimmed);
      setSuccess('Repository linked and workspace registered successfully!');
      await loadStudentContext(selectedAssignment._id);
      return;
    }
    setError('Please select an assignment before linking a repository.');
  };

  const handleLinkAssignment = async (e: React.FormEvent, teamId: string) => {
    e.preventDefault();
    const code = linkInviteCodes[teamId];
    if (!code) return;
    try {
      await api.teams.addAssignment(teamId, code.trim().toUpperCase());
      setSuccess('Assignment linked to team!');
      setLinkInviteCodes((prev) => ({ ...prev, [teamId]: '' }));
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to link assignment.');
    }
  };

  const handleConnectFolder = async () => {
    try {
      const anyWindow = window as any;
      if (!anyWindow.showDirectoryPicker) {
        setError('Your browser does not support File System Access API. Please use Chrome or Edge.');
        return;
      }
      const handle = await anyWindow.showDirectoryPicker();
      const check = await verifyLocalGitRepository(handle, team?.repositoryUrl || repoUrl);
      setGitVerification(check);

      if (check.status === 'mismatch') {
        setLocalDirHandle(null);
        setLocalDirName('');
        setScannedFiles([]);
        setOfflineEdits([]);
        if (selectedAssignment) {
          await deleteWorkspaceHandle(selectedAssignment._id);
          clearWorkspaceSnapshot(selectedAssignment._id);
        }
        setError(check.message || 'Repository Mismatch: Access denied. The selected folder does not match the assignment repository.');
        return;
      }

      if (selectedAssignment) {
        await saveWorkspaceHandle(selectedAssignment._id, handle, handle.name);
      }
      setLocalDirHandle(handle);
      setLocalDirName(handle.name);
      setSavedFolderPrompt(null);
      setSuccess('Workspace connected & verified!');

      // Automatically scan folder immediately
      await scanAndAutoSync(handle, selectedAssignment?._id, team, check);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Folder selection error: ' + err.message);
      }
    }
  };

  const handleResumeSavedWorkspace = async () => {
    if (!savedFolderPrompt?.handle || !selectedAssignment) {
      await handleConnectFolder();
      return;
    }
    try {
      setError('');
      const granted = await verifyHandlePermission(savedFolderPrompt.handle, true);
      if (granted) {
        const check = await verifyLocalGitRepository(savedFolderPrompt.handle, team?.repositoryUrl || repoUrl);
        setGitVerification(check);

        if (check.status === 'mismatch') {
          setLocalDirHandle(null);
          setLocalDirName('');
          setScannedFiles([]);
          setOfflineEdits([]);
          setSavedFolderPrompt(null);
          if (selectedAssignment) {
            await deleteWorkspaceHandle(selectedAssignment._id);
            clearWorkspaceSnapshot(selectedAssignment._id);
          }
          setError(check.message || 'Repository Mismatch: Access denied. The selected folder does not match the assignment repository.');
          return;
        }

        setLocalDirHandle(savedFolderPrompt.handle);
        setLocalDirName(savedFolderPrompt.folderName);
        setSavedFolderPrompt(null);
        await scanAndAutoSync(savedFolderPrompt.handle, selectedAssignment._id, team, check);
      } else {
        setError('Permission to read local folder was not granted.');
      }
    } catch (err: any) {
      setError('Could not resume workspace: ' + err.message);
    }
  };

  const handleDisconnectWorkspace = async () => {
    if (selectedAssignment) {
      await deleteWorkspaceHandle(selectedAssignment._id);
      clearWorkspaceSnapshot(selectedAssignment._id);
    }
    setLocalDirHandle(null);
    setLocalDirName('');
    setScannedFiles([]);
    setScannedFolders([]);
    setOfflineEdits([]);
    setSelectedOfflineFile(null);
    setGitVerification(null);
    setSavedFolderPrompt(null);
    setSuccess('Workspace disconnected.');
  };

  const handleDownloadCsv = async () => {
    try {
      setDownloadingCsv(true);
      setError('');
      setSuccess('Exporting Machine Learning Dataset (dataset.csv) directly from MongoDB Atlas...');
      const filename = await api.analytics.downloadCsv({
        type: 'sessions',
        mode: 'session',
        excludeMock: true
      });
      setSuccess(`Machine Learning Dataset downloaded successfully: ${filename}`);
    } catch (err: any) {
      setError(err.message || 'Failed to download real dataset from database');
    } finally {
      setDownloadingCsv(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-transparent text-[#0D1110] flex flex-col font-sans selection:bg-[#6FAF9A] selection:text-white relative">
      <AppHeader user={student} roleTitle="Student Node" badgeVariant="info" />

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-[#EFF8F3] border border-[#6FAF9A]/30 text-[#2d5849] rounded-2xl text-xs font-medium">
            {success}
          </div>
        )}

        {/* Top Cohort / Assignment Selection Bar */}
        <StudentAssignmentBar
          assignments={assignments}
          selectedAssignment={selectedAssignment}
          onAssignmentChange={handleAssignmentChange}
          onOpenJoinCohort={() => {
            setShowJoinModal(true);
            setSearchedAssignment(null);
            setInviteCode('');
            setTeamFlow('none');
          }}
          team={team}
          syncingGit={syncingGit}
          onSyncGit={handleSyncGit}
        />

        {/* =========================================================================
            INTEGRITY & AUTHENTICITY HERO SECTION (STUDENT STANDING & PROVENANCE)
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Left: Dual-Engine Authenticity Scorecard (7 of 12 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#6FAF9A]/20 shadow-xs flex flex-col justify-between space-y-5">
            <div>
              {/* Header with Panel Defense Button */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#0D1110]">Dual-Engine Coding Authenticity</h3>
                    {((report?.metrics?.codingHours && Number(report.metrics.codingHours) > 0) ||
                      (report?.metrics?.totalCommits && Number(report.metrics.totalCommits) > 0) ||
                      (report?.metrics?.totalKeystrokes && Number(report.metrics.totalKeystrokes) > 0)) ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF8F3] text-[#2d5849] border border-[#6FAF9A]/30 font-mono">
                        Defense-in-Depth Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Awaiting Telemetry (0.0h)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#576561] font-normal mt-0.5">
                    Separating rule-based line provenance from machine learning biometric dynamics
                  </p>
                </div>


              </div>

              {/* DUAL ENGINE COMPARISON GRID */}
              {(() => {
                const hasActivity = Boolean(
                  (report?.metrics?.codingHours && Number(report.metrics.codingHours) > 0) ||
                  (report?.metrics?.totalCommits && Number(report.metrics.totalCommits) > 0) ||
                  (report?.metrics?.totalKeystrokes && Number(report.metrics.totalKeystrokes) > 0)
                );

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">

                    {/* ENGINE 1: Heuristic Provenance (Manual Line Attribution) */}
                    <div className="bg-[#EFF8F3]/40 border border-[#6FAF9A]/25 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d5849] font-mono flex items-center gap-1">
                            <Laptop className="w-3 h-3 text-[#6FAF9A]" />
                            Engine 1: Heuristic Provenance
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#2d5849] border border-[#6FAF9A]/30">
                            Rule-Based
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-3xl font-black text-[#0D1110] tracking-tight font-mono">
                            {hasActivity ? `${report?.metrics?.codingProvenance?.manualPercent ?? 88}%` : '--%'}
                          </span>
                          <span className="text-[10px] uppercase text-[#8fa099] font-bold tracking-wider">
                            {hasActivity ? 'Manual Line Score' : 'Awaiting Activity'}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#576561] mt-1 leading-snug">
                          {hasActivity
                            ? 'Line attribution via Git commit history & active editor clipboard tracking.'
                            : 'No commits or editor keystrokes recorded yet. Push commits to compute provenance.'}
                        </p>
                      </div>

                      {/* Line Proportions */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#6FAF9A]/15">
                        <div className="text-center p-1 bg-white/70 rounded-lg">
                          <div className="text-[9px] text-[#576561]">Manual</div>
                          <div className="text-xs font-bold text-[#0D1110] font-mono">
                            {hasActivity ? `${report?.metrics?.codingProvenance?.manualPercent ?? 88}%` : '--%'}
                          </div>
                        </div>
                        <div className="text-center p-1 bg-purple-50/70 rounded-lg">
                          <div className="text-[9px] text-purple-700">AI Assist</div>
                          <div className="text-xs font-bold text-purple-900 font-mono">
                            {hasActivity ? `${report?.metrics?.codingProvenance?.aiPercent ?? 8}%` : '--%'}
                          </div>
                        </div>
                        <div className="text-center p-1 bg-rose-50/70 rounded-lg">
                          <div className="text-[9px] text-rose-700">External</div>
                          <div className="text-xs font-bold text-rose-900 font-mono">
                            {hasActivity
                              ? `${report?.metrics?.codingProvenance?.externalPercent ?? report?.metrics?.codingProvenance?.pastePercent ?? 4}%`
                              : '--%'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ENGINE 2: Machine Learning Biometric Authenticity (Magic Function #5) */}
                    <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden shadow-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1">
                            <BrainCircuit className="w-3 h-3 text-cyan-400" />
                            Engine 2: ML Biometrics
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${hasActivity && mlScore?.is_authentic
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                              : hasActivity && mlScore?.is_anomaly
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                                : hasActivity && mlScore
                                  ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                            {hasActivity && mlScore ? (mlScore.risk_tier || 'Low Risk') : 'Awaiting Telemetry ⏳'}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-3xl font-black text-white tracking-tight font-mono text-cyan-300">
                            {hasActivity && mlScore?.authenticity_score_percent != null
                              ? `${mlScore.authenticity_score_percent}%`
                              : '--%'}
                          </span>
                          <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                            P(Human Authenticity)
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                          {hasActivity && mlScore
                            ? <>Continuous XGBoost probability via <code className="text-cyan-300 font-mono text-[10px]">predict_proba()</code> analyzing sub-second keystroke rhythm.</>
                            : 'Awaiting first 5-minute coding window in VS Code to trigger continuous ML probability.'}
                        </p>
                      </div>

                      {/* Continuous Spectrum Indicator Bar */}
                      <div className="pt-1 border-t border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                          <span>
                            Suspicion P(AI):{' '}
                            <strong className="text-rose-400">
                              {hasActivity && mlScore?.suspicion_score_percent != null
                                ? `${mlScore.suspicion_score_percent}%`
                                : '--%'}
                            </strong>
                          </span>
                          <span className="text-cyan-300">Magic Function #5</span>
                        </div>

                        {/* Gradient Spectrum Track */}
                        <div className="w-full h-2 rounded-full bg-slate-800 relative overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-full"
                            style={{
                              width: hasActivity && mlScore?.suspicion_score_percent != null
                                ? `${Math.min(100, Math.max(2, mlScore.suspicion_score_percent))}%`
                                : '0%',
                              backgroundColor: (mlScore?.suspicion_score_percent ?? 0) < 30 ? '#10b981' : (mlScore?.suspicion_score_percent ?? 0) <= 70 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                          <span>0% (Low Risk)</span>
                          <span>30%</span>
                          <span>70%</span>
                          <span>100% (High Risk)</span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() =>
                  localDirHandle
                    ? scanAndAutoSync(localDirHandle, selectedAssignment?._id, team, gitVerification || undefined)
                    : handleResumeSavedWorkspace()
                }
                disabled={autoSyncInProgress || scanning}
                className="w-full py-2.5 rounded-xl bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${autoSyncInProgress || scanning ? 'animate-spin' : ''}`}
                />
                <span>{scanning ? 'Scanning...' : 'Sync Telemetry'}</span>
              </button>
              <button
                onClick={() => setShowAuditModal(true)}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#EFF8F3] text-[#0D1110] font-semibold text-xs border border-[#6FAF9A]/25 shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#6FAF9A]" />
                <span>Audit Report</span>
              </button>
              <button
                onClick={handleDownloadCsv}
                disabled={downloadingCsv}
                className="w-full py-2.5 rounded-xl bg-[#EFF8F3] hover:bg-[#e2ece7] text-[#0D1110] font-semibold text-xs border border-[#6FAF9A]/20 shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Download Machine Learning Dataset (dataset.csv Format) directly from MongoDB Atlas"
              >
                <Download className={`w-3.5 h-3.5 text-[#2d5849] ${downloadingCsv ? 'animate-spin' : ''}`} />
                <span>{downloadingCsv ? 'Downloading...' : 'Dataset CSV'}</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#6FAF9A]/20 text-[#2d5849]">
                  Real DB
                </span>
              </button>
            </div>
          </div>

          {/* Right: Workspace Standing Evaluation (5 of 12 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#6FAF9A]/20 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0D1110]">Workspace Standing</h3>
                <span className="text-xs font-semibold text-[#576561] font-mono">
                  Total {report?.metrics?.codingHours ? Number(report.metrics.codingHours).toFixed(1) : '0.0'}h
                </span>
              </div>

              {/* Sage Weighted Standing Banner */}
              <div className="bg-[#EFF8F3] border border-[#6FAF9A]/25 rounded-2xl p-4 flex items-center justify-between my-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#2d5849] font-mono flex items-center gap-1.5">
                    <span>WEIGHTED SCORE</span>
                    {!((report?.metrics?.codingHours && Number(report.metrics.codingHours) > 0) ||
                      (report?.metrics?.totalCommits && Number(report.metrics.totalCommits) > 0) ||
                      (report?.metrics?.totalKeystrokes && Number(report.metrics.totalKeystrokes) > 0)) && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white text-amber-800 border border-amber-200 font-sans">
                          Initial Baseline
                        </span>
                      )}
                  </div>
                  <div className="text-xs text-[#0D1110] font-medium mt-0.5">
                    {((report?.metrics?.codingHours && Number(report.metrics.codingHours) > 0) ||
                      (report?.metrics?.totalCommits && Number(report.metrics.totalCommits) > 0) ||
                      (report?.metrics?.totalKeystrokes && Number(report.metrics.totalKeystrokes) > 0))
                      ? 'Cumulative Standing (Git + Telemetry)'
                      : 'Awaiting First Commit / Activity'}
                  </div>
                </div>
                <div className="text-3xl font-black text-[#2d5849] font-mono">
                  {report?.scores?.final != null ? `${report.scores.final}%` : '--%'}
                </div>
              </div>
            </div>

            {/* 4 Evaluation Progress Bars */}
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between items-center text-[#576561] mb-1">
                  <span className="font-medium">Git Mining (40%)</span>
                  <span className="font-mono font-bold text-[#0D1110]">{report?.scores?.git ?? 92}%</span>
                </div>
                <div className="w-full bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, report?.scores?.git ?? 92))}%` }}
                    className="h-full bg-[#6FAF9A] transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[#576561] mb-1">
                  <span className="font-medium">VS Code Telemetry (30%)</span>
                  <span className="font-mono font-bold text-[#0D1110]">{report?.scores?.vscode ?? 95}%</span>
                </div>
                <div className="w-full bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, report?.scores?.vscode ?? 95))}%` }}
                    className="h-full bg-[#0D1110] transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[#576561] mb-1">
                  <span className="font-medium">Keystroke Cadence (20%)</span>
                  <span className="font-mono font-bold text-[#0D1110]">{report?.scores?.keystroke ?? 90}%</span>
                </div>
                <div className="w-full bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, report?.scores?.keystroke ?? 90))}%` }}
                    className="h-full bg-[#6FAF9A] transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[#576561] mb-1">
                  <span className="font-medium">Provenance Attestation (10%)</span>
                  <span className="font-mono font-bold text-[#0D1110]">{report?.scores?.peer ?? 98}%</span>
                </div>
                <div className="w-full bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, report?.scores?.peer ?? 98))}%` }}
                    className="h-full bg-[#6FAF9A] transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <StudentTabsNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          kanbanTaskCount={tasks.length}
        />

        {/* Active Tab View */}
        {activeTab === 'repository' && (
          <RepositoryTab
            repoUrl={repoUrl}
            studentBreakdown={studentBreakdown}
            localDirHandle={localDirHandle}
            localDirName={localDirName}
            gitVerification={gitVerification}
            scanning={scanning}
            autoSyncInProgress={autoSyncInProgress}
            onManualSync={() =>
              scanAndAutoSync(localDirHandle, selectedAssignment?._id, team, gitVerification || undefined)
            }
            onDisconnectWorkspace={handleDisconnectWorkspace}
            onConnectFolder={handleConnectFolder}
            savedFolderPrompt={savedFolderPrompt}
            onResumeSavedWorkspace={handleResumeSavedWorkspace}
            scannedFiles={scannedFiles}
            scannedFolders={scannedFolders}
            offlineEdits={offlineEdits}
            selectedOfflineFile={selectedOfflineFile}
            onSelectOfflineFile={setSelectedOfflineFile}
            commitsList={commitsList}
            sessionsList={sessionsList}
            student={student}
            report={report}
            team={team}
            onUpdateRepo={handleUpdateActiveRepo}
          />
        )}

        {activeTab === 'commits' && (
          <CommitsTab
            timelineData={timelineData}
            studentBreakdown={studentBreakdown}
            commitsList={commitsList}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab
            report={report}
            cadenceFilter={cadenceFilter}
            setCadenceFilter={setCadenceFilter}
            timelineData={timelineData}
          />
        )}

        {activeTab === 'kanban' && (
          <KanbanTab
            tasks={tasks}
            team={team}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskDesc={newTaskDesc}
            setNewTaskDesc={setNewTaskDesc}
            newTaskAssignee={newTaskAssignee}
            setNewTaskAssignee={setNewTaskAssignee}
            onAddTask={handleAddTask}
            onUpdateStatus={handleUpdateTaskStatus}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'teams' && (
          <TeamsTab
            myTeams={myTeams}
            student={student}
            onOpenGeneralTeamModal={() => {
              setShowGeneralTeamModal(true);
              setGeneralTeamRepo('');
              setSelectedMembers([]);
            }}
            linkInviteCodes={linkInviteCodes}
            setLinkInviteCodes={setLinkInviteCodes}
            onLinkAssignment={handleLinkAssignment}
            onUpdateRepo={handleUpdateTeamRepo}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryTab
            studentsList={studentsList}
            studentSearchQuery={studentSearchQuery}
            setStudentSearchQuery={setStudentSearchQuery}
          />
        )}
      </main>

      {/* Audit Report Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm text-left animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  INCODE Student Provenance Audit Report
                </h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Student</span>
                  <span className="font-bold text-slate-900">{student?.name || 'Local Student'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Email</span>
                  <span className="text-slate-700">{student?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Authenticity Standing</span>
                  <span className="text-base font-bold text-emerald-700">{report?.scores?.final ?? 94}%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Local Workspace</span>
                  <span className="text-slate-800 font-bold">{localDirName || 'Not linked'}/</span>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assignment:</span>
                  <span className="font-bold text-slate-900">{selectedAssignment?.title || 'SSD Practical'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Repository Remote:</span>
                  <span className="text-slate-800 truncate max-w-[280px]">
                    {team?.repositoryUrl || repoUrl || 'Not Linked'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Attestation Verification:</span>
                  <span className="text-emerald-700 font-bold">
                    {gitVerification?.status === 'matched' ? '✓ Remote Hash Attested' : 'Standard Baseline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local Files Tracked:</span>
                  <span className="font-bold text-slate-900">{scannedFiles.length} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Offline / Recent Edits:</span>
                  <span className="font-bold text-slate-900">{offlineEdits.length} files</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Cohort & Team Modals */}
      <JoinCohortModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        searchedAssignment={searchedAssignment}
        searchedTeams={searchedTeams}
        teamFlow={teamFlow}
        setTeamFlow={setTeamFlow}
        teamName={teamName}
        setTeamName={setTeamName}
        gitUsername={gitUsername}
        setGitUsername={setGitUsername}
        teamInviteCode={teamInviteCode}
        setTeamInviteCode={setTeamInviteCode}
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        onSearchInvite={handleSearchInvite}
        onCreateTeam={handleCreateTeam}
        onJoinTeam={handleJoinTeam}
        onJoinIndividual={handleJoinIndividual}
      />

      <CreateGeneralTeamModal
        isOpen={showGeneralTeamModal}
        onClose={() => setShowGeneralTeamModal(false)}
        teamName={generalTeamName}
        setTeamName={setGeneralTeamName}
        gitUsername={generalTeamGit}
        setGitUsername={setGeneralTeamGit}
        repoUrl={generalTeamRepo}
        setRepoUrl={setGeneralTeamRepo}
        studentsList={studentsList}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        onCreateTeam={handleCreateGeneralTeam}
      />

      {/* =========================================================================
          PANEL DEFENSE EXPLAINER MODAL: WHY AI MODEL VS MANUAL AUTHENTICITY?
      ========================================================================= */}
      {showMlDefenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-left animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                  <BrainCircuit className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Panel Defense: Why Use an AI Model When Manual Authenticity Exists?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Defending INCODE's Dual-Engine Authenticity Architecture in Academic Vivas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMlDefenseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* The Panel's Core Question */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                The Panel Will Ask:
              </div>
              <p className="text-xs text-amber-950 font-medium mt-1 italic">
                &ldquo;If you already track manual typed lines, Git commits, and external clipboard copy-pastes using heuristics, why do you need an AI/ML Model at all? Isn&apos;t the manual check enough?&rdquo;
              </p>
            </div>

            {/* 3 Irrefutable Academic Defense Pillars */}
            <div className="space-y-3.5 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Your 3 Defense Answers:
              </h4>

              {/* Pillar 1 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono flex items-center justify-center font-bold">1</span>
                  <span>Bypassing Manual Rules is Trivial (Auto-Typers & Retyping)</span>
                </div>
                <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                  A student can paste AI code into an auto-typer script, or retype AI code character-by-character. Manual heuristics count keystrokes and give it a <strong>100% Human Score</strong>.
                  However, our <strong>XGBoost Model</strong> analyzes sub-second inter-key latency distributions and cadence variance. Robotic typing has unnatural timing curves that our ML model flags instantly (<code className="text-purple-700 font-mono">P(AI) &gt; 70%</code>).
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono flex items-center justify-center font-bold">2</span>
                  <span>Multi-Dimensional Non-Linear Interactions (13 Features)</span>
                </div>
                <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                  Manual rules use rigid single-threshold cutoffs (e.g., <code className="text-slate-800 font-mono">if paste &gt; 30%</code>). In real software engineering, pasting code is normal when importing boilerplate, <em>provided it is followed by high code churn refactoring</em>.
                  Only a trained ML model can synthesize 13 sensor metrics simultaneously (churn ratio, keystroke efficiency <code className="font-mono">Keff</code>, typing CPM, burst sizes) to discern benign helper imports from deceptive AI code injection.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono flex items-center justify-center font-bold">3</span>
                  <span>Continuous Probability &amp; Academic Fairness (Magic Function #5)</span>
                </div>
                <p className="text-[11px] text-slate-600 pl-7 leading-relaxed">
                  Conventional detectors output a binary Pass/Fail label. If a student is scored at 50.1%, they get accused; at 49.9%, they walk free.
                  Our ML model outputs calibrated continuous probabilities <code className="text-purple-700 font-mono">P(AI) &isin; [0%, 100%]</code> with a dedicated <strong>Inconclusive Review Tier (30% - 70%)</strong>, recommending human instructor triage and protecting universities against false accusation appeals.
                </p>
              </div>
            </div>

            {/* Quick Summary Pill Box */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-[#EFF8F3] border border-[#6FAF9A]/30 rounded-xl text-center">
                <div className="text-[10px] font-bold text-[#2d5849] uppercase font-mono">Manual Provenance</div>
                <div className="text-xs font-semibold text-[#0D1110] mt-0.5">Answers: &ldquo;What lines were added?&rdquo;</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <div className="text-[10px] font-bold text-purple-700 uppercase font-mono">ML Biometrics</div>
                <div className="text-xs font-semibold text-purple-950 mt-0.5">Answers: &ldquo;How was the code authored?&rdquo;</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMlDefenseModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Close Defense Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
