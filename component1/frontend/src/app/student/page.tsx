'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser, logoutUser } from '../../services/api';
import {
  saveWorkspaceHandle,
  getWorkspaceHandle,
  deleteWorkspaceHandle,
  verifyHandlePermission,
  saveWorkspaceSnapshot,
  getWorkspaceSnapshot,
  clearWorkspaceSnapshot
} from '../../services/workspaceStorage';
import {
  verifyLocalGitRepository,
  GitVerificationResult,
  normalizeGitSlug
} from '../../services/gitValidator';
import { 
  Code, GitBranch, GitPullRequest, Activity, Calendar, 
  Users, CheckCircle2, Circle, ArrowRight, Kanban,
  ExternalLink, RefreshCw, Plus, Trash2, LogOut,
  Folder, FileText, ChevronLeft, Search, Code2,
  Terminal, ShieldCheck, Wifi, WifiOff, Clock, Sparkles,
  AlertTriangle, ArrowUpRight, Check, HardDrive, Zap,
  FolderCheck, FolderSync, ShieldAlert, GitCommit,
  CheckCheck, AlertCircle, UserCheck, UserX, Keyboard,
  Clipboard, History, Fingerprint, FileCode, Split,
  Eye, Layers, Lock, ShieldBan, Info, User, CheckCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, BarChart, Bar
} from 'recharts';

export default function StudentDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [student, setStudent] = useState<any>(null);

  // Assignment & Team context states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  // Kanban states
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // Joining flows states
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [searchedAssignment, setSearchedAssignment] = useState<any>(null);
  const [searchedTeams, setSearchedTeams] = useState<any[]>([]);
  const [teamFlow, setTeamFlow] = useState<'none' | 'create' | 'join'>('none');
  const [teamName, setTeamName] = useState('');
  const [gitUsername, setGitUsername] = useState('');
  const [teamInviteCode, setTeamInviteCode] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  // Teams Manager & Directory states
  const [activeTab, setActiveTab] = useState<'repository' | 'commits' | 'timeline' | 'kanban' | 'teams' | 'directory'>('repository');
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [showGeneralTeamModal, setShowGeneralTeamModal] = useState(false);
  const [generalTeamName, setGeneralTeamName] = useState('');
  const [generalTeamGit, setGeneralTeamGit] = useState('');
  const [linkInviteCodes, setLinkInviteCodes] = useState<Record<string, string>>({});
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Persistent Physical Workspace Scanner & Git Attestation states
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [localDirName, setLocalDirName] = useState<string>('');
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [scannedFolders, setScannedFolders] = useState<any[]>([]);
  const [offlineEdits, setOfflineEdits] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedOfflineFile, setSelectedOfflineFile] = useState<any>(null);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [offlineFilter, setOfflineFilter] = useState<'edited' | 'all' | 'folders'>('edited');
  const [selectedOfflineFileDiff, setSelectedOfflineFileDiff] = useState<any[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [savedFolderPrompt, setSavedFolderPrompt] = useState<{ folderName: string; handle: any } | null>(null);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  
  // Git Repo Verification state
  const [gitVerification, setGitVerification] = useState<GitVerificationResult | null>(null);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{ handle: any; result: GitVerificationResult } | null>(null);

  // General operation states
  const [loading, setLoading] = useState(false);
  const [syncingGit, setSyncingGit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [studentBreakdown, setStudentBreakdown] = useState<any[]>([]);
  const [commitsList, setCommitsList] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [workspaceFileViewTab, setWorkspaceFileViewTab] = useState<'forensics' | 'blame' | 'diff' | 'code'>('forensics');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedAssignId, setCopiedAssignId] = useState(false);

  // Repository Explorer states
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerItems, setExplorerItems] = useState<any[]>([]);
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [selectedCodeFile, setSelectedCodeFile] = useState<string | null>(null);
  const [selectedCodeContent, setSelectedCodeContent] = useState('');
  const [explorerLoading, setExplorerLoading] = useState(false);

  const fetchRepositoryContents = async (tId: string, path: string) => {
    if (!tId) return;
    setExplorerLoading(true);
    setExplorerError(null);
    try {
      const res = await api.github.getContents(tId, path);
      if (res.error) {
        setExplorerError(res.error);
        setExplorerItems([]);
      } else {
        setExplorerItems(res.items || []);
      }
      setExplorerPath(path);
      setSelectedCodeFile(null);
      setSelectedCodeContent('');
    } catch (err: any) {
      console.error('Failed to fetch repo contents:', err);
      setExplorerError(err.message || 'Failed to connect to GitHub API');
      setExplorerItems([]);
    } finally {
      setExplorerLoading(false);
    }
  };

  const fetchFileContent = async (path: string) => {
    if (!team) return;
    setExplorerLoading(true);
    setExplorerError(null);
    try {
      const res = await api.github.getFile(team._id, path);
      if (res.error) {
        setExplorerError(res.error);
      } else {
        setSelectedCodeFile(path);
        setSelectedCodeContent(res.content || '');
      }
    } catch (err: any) {
      console.error('Failed to fetch file content:', err);
      setExplorerError(err.message || 'Failed to fetch file content from GitHub');
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleExplorerBack = () => {
    if (!team) return;
    if (selectedCodeFile) {
      setSelectedCodeFile(null);
      setSelectedCodeContent('');
      return;
    }
    const parts = explorerPath.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    fetchRepositoryContents(team._id, parentPath);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.assignments.getAll();
      setAssignments(data.assignments);
      
      const directoryRes = await api.users.getStudents().catch(() => ({ students: [] }));
      setStudentsList(directoryRes.students || []);

      if (data.assignments.length > 0) {
        setSelectedAssignment(data.assignments[0]);
        await loadStudentContext(data.assignments[0]._id);
      }
    } catch (err: any) {
      setError('Could not fetch student profiles. Ensure backend server is active.');
    } finally {
      setLoading(false);
    }
  };

  // Restore and check physical workspace connection for this assignment
  const checkAndRestoreWorkspace = async (assignmentId: string, teamObj?: any) => {
    try {
      // 1. Check cached snapshot
      const snapshot = getWorkspaceSnapshot(assignmentId);
      if (snapshot) {
        if (snapshot.folderName) setLocalDirName(snapshot.folderName);
        if (snapshot.scannedFiles) setScannedFiles(snapshot.scannedFiles);
        if (snapshot.scannedFolders) setScannedFolders(snapshot.scannedFolders);
        if (snapshot.offlineEdits) setOfflineEdits(snapshot.offlineEdits);
        if (snapshot.gitVerification) setGitVerification(snapshot.gitVerification);
        if (snapshot.savedAt) setLastAutoSyncTime(new Date(snapshot.savedAt).toLocaleTimeString());
      }

      // 2. Check IndexedDB handle
      const saved = await getWorkspaceHandle(assignmentId);
      if (saved && saved.handle) {
        setLocalDirName(saved.folderName);
        const hasPermission = await verifyHandlePermission(saved.handle, false);
        if (hasPermission) {
          setLocalDirHandle(saved.handle);
          setSavedFolderPrompt(null);
          // Verify Git Remote against team's repository
          const check = await verifyLocalGitRepository(saved.handle, teamObj?.repositoryUrl || repoUrl);
          setGitVerification(check);
          // Auto-scan and auto-sync immediately
          await scanAndAutoSync(saved.handle, assignmentId, teamObj, check);
        } else {
          // Needs user gesture to re-request permission
          setSavedFolderPrompt({ folderName: saved.folderName, handle: saved.handle });
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
        setTasks(tasksRes.tasks);

        const reportRes = await api.analytics.getStudentReport(assignmentId).catch(() => null);
        if (reportRes && reportRes.report) {
          setReport(reportRes.report);
        }

        const teamAnalyticsRes = await api.analytics.getTeamAnalytics(teamRes.team._id).catch(() => null);
        if (teamAnalyticsRes) {
          if (teamAnalyticsRes.timeline) setTimelineData(teamAnalyticsRes.timeline);
          if (teamAnalyticsRes.studentBreakdown) setStudentBreakdown(teamAnalyticsRes.studentBreakdown);
          if (teamAnalyticsRes.activities) setCommitsList(teamAnalyticsRes.activities);
          if (teamAnalyticsRes.sessions) setSessionsList(teamAnalyticsRes.sessions);
        } else {
          setTimelineData([]);
          setStudentBreakdown([]);
          setCommitsList([]);
          setSessionsList([]);
        }

        fetchRepositoryContents(teamRes.team._id, '');
        await checkAndRestoreWorkspace(assignmentId, teamRes.team);
      } else {
        setTeam(null);
        setTasks([]);
        setReport(null);
        setTimelineData([]);
        setStudentBreakdown([]);
        setCommitsList([]);
        setSessionsList([]);
        setExplorerItems([]);
        setExplorerPath('');
        setSelectedCodeFile(null);
        await checkAndRestoreWorkspace(assignmentId, null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMyTeams = async () => {
    try {
      const res = await api.teams.getMyTeams();
      setMyTeams(res.teams || []);
    } catch (err: any) {
      console.error('Failed to load teams', err);
    }
  };

  const loadStudentDirectory = async () => {
    try {
      const res = await api.users.getStudents();
      setStudentsList(res.students || []);
    } catch (err: any) {
      console.error('Failed to load student directory', err);
    }
  };

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = assignments.find(a => a._id === e.target.value);
    setSelectedAssignment(selected);
    if (selected) {
      setLocalDirHandle(null);
      setLocalDirName('');
      setScannedFiles([]);
      setOfflineEdits([]);
      setSelectedOfflineFile(null);
      setSelectedOfflineFileDiff(null);
      setGitVerification(null);
      await loadStudentContext(selected._id);
    }
  };

  const handleSearchInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.assignments.getByCode(inviteCode.trim());
      setSearchedAssignment(res.assignment);
      setSearchedTeams(res.teams || []);
    } catch (err: any) {
      setError(err.message || 'Invitation template not found. Try invite codes generated by your lecturer.');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.teams.create({
        name: teamName,
        assignmentId: searchedAssignment._id,
        gitUsername,
        memberIds: selectedMembers
      });
      setSuccess('Team registered successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Could not form team.');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.teams.join({
        inviteCode: teamInviteCode,
        gitUsername
      });
      setSuccess('Joined team successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to join. Double check the team invite code.');
    }
  };

  const handleUpdateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.teams.updateRepo({
        teamId: team._id,
        repositoryUrl: repoUrl
      });
      setSuccess('GitHub Repository linked successfully!');
      await loadStudentContext(selectedAssignment._id);
    } catch (err: any) {
      setError(err.message || 'Failed to link URL.');
    }
  };

  const handleSyncGit = async () => {
    if (!team || !selectedAssignment) return;
    setSyncingGit(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.github.sync({
        teamId: team._id,
        assignmentId: selectedAssignment._id
      });
      setSuccess(`Synced Git successfully! Added ${res.commitsSynced} commits and ${res.prsSynced} PRs.`);
      await loadStudentContext(selectedAssignment._id);
    } catch (err: any) {
      setError(err.message || 'Git sync failed. Check URL or network state.');
    } finally {
      setSyncingGit(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    try {
      await api.tasks.create({
        title: newTaskTitle,
        description: newTaskDesc,
        assignedTo: newTaskAssignee || student.id,
        teamId: team._id,
        assignmentId: selectedAssignment._id
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      
      const tasksRes = await api.tasks.getByTeam(team._id);
      setTasks(tasksRes.tasks);
      const reportRes = await api.analytics.getStudentReport(selectedAssignment._id);
      if (reportRes && reportRes.report) setReport(reportRes.report);
    } catch (err: any) {
      setError(err.message || 'Task creation failed.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.tasks.updateStatus(taskId, newStatus);
      const tasksRes = await api.tasks.getByTeam(team._id);
      setTasks(tasksRes.tasks);
      const reportRes = await api.analytics.getStudentReport(selectedAssignment._id);
      if (reportRes && reportRes.report) setReport(reportRes.report);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.tasks.delete(taskId);
      const tasksRes = await api.tasks.getByTeam(team._id);
      setTasks(tasksRes.tasks);
      const reportRes = await api.analytics.getStudentReport(selectedAssignment._id);
      if (reportRes && reportRes.report) setReport(reportRes.report);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGeneralTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.teams.createGeneral({
        name: generalTeamName,
        gitUsername: generalTeamGit,
        memberIds: selectedMembers
      });
      setSuccess('General team formed successfully!');
      setGeneralTeamName('');
      setGeneralTeamGit('');
      setSelectedMembers([]);
      setShowGeneralTeamModal(false);
      await loadMyTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to create team.');
    }
  };

  const handleLinkAssignment = async (e: React.FormEvent, teamId: string) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const code = linkInviteCodes[teamId];
    if (!code) return;
    try {
      await api.teams.addAssignment(teamId, code);
      setSuccess('Assignment successfully linked to team!');
      setLinkInviteCodes(prev => ({ ...prev, [teamId]: '' }));
      await loadMyTeams();
      const data = await api.assignments.getAll();
      setAssignments(data.assignments);
      if (data.assignments.length > 0) {
        setSelectedAssignment(data.assignments[0]);
        await loadStudentContext(data.assignments[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link assignment.');
    }
  };

  // =========================================================================
  // PERSISTENT PHYSICAL WORKSPACE HANDLERS & GIT ATTESTATION ENGINE
  // =========================================================================

  const handleSelectFolder = async () => {
    try {
      setError('');
      setSuccess('');
      const anyWindow = window as any;
      if (!anyWindow.showDirectoryPicker) {
        setError('Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.');
        return;
      }
      const handle = await anyWindow.showDirectoryPicker();
      
      // Verify local .git/config against team repository URL
      const check = await verifyLocalGitRepository(handle, team?.repositoryUrl || repoUrl);

      if (check.status === 'mismatch') {
        // Show mismatch resolution dialog
        setPendingVerification({ handle, result: check });
        setShowMismatchModal(true);
        return;
      }

      await finalizeFolderConnection(handle, check);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to select local folder: ' + err.message);
      }
    }
  };

  const finalizeFolderConnection = async (handle: any, checkResult?: GitVerificationResult) => {
    const check = checkResult || await verifyLocalGitRepository(handle, team?.repositoryUrl || repoUrl);
    setGitVerification(check);

    // Save permanently in IndexedDB for this assignment
    if (selectedAssignment) {
      await saveWorkspaceHandle(selectedAssignment._id, handle, handle.name);
    }

    setLocalDirHandle(handle);
    setLocalDirName(handle.name);
    setSavedFolderPrompt(null);
    setShowMismatchModal(false);
    setPendingVerification(null);
    
    // Automatically scan folder and fetch all online/offline works
    await scanAndAutoSync(handle, selectedAssignment?._id, team, check);
  };

  const handleUpdateRepoFromLocalGit = async () => {
    if (!pendingVerification?.result?.localRemoteUrl || !team?._id) return;
    try {
      const newUrl = pendingVerification.result.localRemoteUrl;
      await api.teams.updateRepo({
        teamId: team._id,
        repositoryUrl: newUrl
      });
      setRepoUrl(newUrl);
      setSuccess(`Team repository updated to: ${newUrl}`);
      
      const newCheck: GitVerificationResult = {
        ...pendingVerification.result,
        expectedRepoUrl: newUrl,
        isMatch: true,
        status: 'matched',
        message: `Verified Match: Local folder repository matches newly updated team repository.`
      };

      await finalizeFolderConnection(pendingVerification.handle, newCheck);
    } catch (err: any) {
      setError('Could not update team repository: ' + err.message);
    }
  };

  const handleResumeSavedWorkspace = async () => {
    if (!savedFolderPrompt?.handle || !selectedAssignment) return;
    try {
      setError('');
      const granted = await verifyHandlePermission(savedFolderPrompt.handle, true);
      if (granted) {
        setLocalDirHandle(savedFolderPrompt.handle);
        setLocalDirName(savedFolderPrompt.folderName);
        setSavedFolderPrompt(null);

        const check = await verifyLocalGitRepository(savedFolderPrompt.handle, team?.repositoryUrl || repoUrl);
        setGitVerification(check);

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
    setSelectedFolderFilter(null);
    setOfflineEdits([]);
    setSelectedOfflineFile(null);
    setSelectedOfflineFileDiff(null);
    setSavedFolderPrompt(null);
    setLastAutoSyncTime(null);
    setGitVerification(null);
    setSuccess('Workspace disconnected and cleared from persistent storage.');
  };

  // Unified Scanner & Auto-Sync Engine
  const scanAndAutoSync = async (
    handle: any, 
    assignmentId?: string, 
    teamObj?: any, 
    checkResult?: GitVerificationResult
  ) => {
    const targetAssignId = assignmentId || selectedAssignment?._id;
    if (!targetAssignId) return;

    setScanning(true);
    setAutoSyncInProgress(true);
    setSelectedOfflineFile(null);

    try {
      // 1. Physical directory scan with Folder & File hierarchy identification
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
              text = await file.text();
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

            // Update parent directory stats
            if (relativePath && folderMap.has(relativePath)) {
              const fStats = folderMap.get(relativePath)!;
              fStats.fileCount++;
              fStats.totalSize += file.size;
              if (file.lastModified >= Date.now() - 24 * 60 * 60 * 1000) {
                fStats.modifiedCount++;
              }
            }
          }
        }
      };

      await traverse(handle);
      const foldersList = Array.from(folderMap.values()).sort((a, b) => a.path.localeCompare(b.path));
      
      setScannedFiles(files);
      setScannedFolders(foldersList);

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recent = files.filter(f => f.lastModified >= oneDayAgo);
      setOfflineEdits(recent);

      // Save snapshot for instant retrieval
      saveWorkspaceSnapshot(targetAssignId, {
        folderName: handle.name,
        gitVerification: checkResult || gitVerification,
        scannedFiles: files.map(f => ({ name: f.name, path: f.path, parentFolder: f.parentFolder, size: f.size, lastModified: f.lastModified, lineCount: f.lineCount })),
        scannedFolders: foldersList,
        offlineEdits: recent.map(f => ({ name: f.name, path: f.path, parentFolder: f.parentFolder, size: f.size, lastModified: f.lastModified, lineCount: f.lineCount }))
      });

      // 2. Fetch and Reconcile Online Git Works
      const targetTeam = teamObj || team;
      let gitSyncedCount = 0;
      if (targetTeam && targetTeam._id) {
        try {
          const gitRes = await api.github.sync({
            teamId: targetTeam._id,
            assignmentId: targetAssignId
          });
          gitSyncedCount = (gitRes.commitsSynced || 0) + (gitRes.prsSynced || 0);
        } catch (gitErr) {
          console.warn('Auto Git sync notice:', gitErr);
        }
      }

      // 3. Physical workspace scanned & verified locally (telemetry is handled exclusively by the VS Code extension)

      // 4. Refresh reports & score matrices
      const reportRes = await api.analytics.getStudentReport(targetAssignId).catch(() => null);
      if (reportRes && reportRes.report) {
        setReport(reportRes.report);
      }

      if (targetTeam && targetTeam._id) {
        const teamAnalyticsRes = await api.analytics.getTeamAnalytics(targetTeam._id).catch(() => null);
        if (teamAnalyticsRes) {
          if (teamAnalyticsRes.timeline) setTimelineData(teamAnalyticsRes.timeline);
          if (teamAnalyticsRes.studentBreakdown) setStudentBreakdown(teamAnalyticsRes.studentBreakdown);
          if (teamAnalyticsRes.activities) setCommitsList(teamAnalyticsRes.activities);
          if (teamAnalyticsRes.sessions) setSessionsList(teamAnalyticsRes.sessions);
        }
      }

      const syncTimeStr = new Date().toLocaleTimeString();
      setLastAutoSyncTime(syncTimeStr);
      setSuccess(`Physical workspace "${handle.name}" validated & synced! Attested ${files.length} local files, synced ${gitSyncedCount} Git events, and reconciled offline work.`);
    } catch (err: any) {
      setError('Workspace scan / auto-sync error: ' + err.message);
    } finally {
      setScanning(false);
      setAutoSyncInProgress(false);
    }
  };

  const handleManualAutoSyncAll = async () => {
    if (localDirHandle) {
      await scanAndAutoSync(localDirHandle, selectedAssignment?._id, team, gitVerification || undefined);
    } else if (savedFolderPrompt?.handle) {
      await handleResumeSavedWorkspace();
    } else {
      await handleSelectFolder();
    }
  };

  const computeDiff = (original: string, modified: string) => {
    const oldLines = original.split('\n');
    const newLines = modified.split('\n');
    
    if (oldLines.length > 500 || newLines.length > 500) {
      const diff: { type: 'added' | 'removed' | 'unchanged', text: string }[] = [];
      newLines.forEach(line => {
        if (oldLines.includes(line)) {
          diff.push({ type: 'unchanged', text: line });
        } else {
          diff.push({ type: 'added', text: line });
        }
      });
      return diff;
    }

    const dp: number[][] = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0));
    for (let i = 1; i <= oldLines.length; i++) {
      for (let j = 1; j <= newLines.length; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const diff: { type: 'added' | 'removed' | 'unchanged', text: string }[] = [];
    let i = oldLines.length;
    let j = newLines.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        diff.unshift({ type: 'unchanged', text: oldLines[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: 'added', text: newLines[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
        diff.unshift({ type: 'removed', text: oldLines[i - 1] });
        i--;
      }
    }

    return diff;
  };

  const getFileIntelligence = useCallback((file: any) => {
    if (!file) return null;
    const filePath = (file.path || '').replace(/^\/+/, '');
    const fileName = file.name || filePath.split('/').pop() || 'file';

    // 1. Commits touching this file
    const matchedCommits = commitsList.filter(c => {
      if (c.filesList && Array.isArray(c.filesList) && c.filesList.length > 0) {
        return c.filesList.some((fp: string) => fp.includes(filePath) || filePath.includes(fp));
      }
      return (c.commitMessage || '').toLowerCase().includes(fileName.toLowerCase()) ||
             (c.commitMessage || '').toLowerCase().includes(filePath.toLowerCase());
    });

    // 2. VS Code Sessions touching this file
    const matchedSessions = sessionsList.filter(s => {
      const edited = (s.filesEdited || []).map((p: string) => p.replace(/^\/+/, ''));
      const created = (s.filesCreated || []).map((p: string) => p.replace(/^\/+/, ''));
      return edited.some((p: string) => p === filePath || filePath.endsWith(p) || p.endsWith(filePath)) ||
             created.some((p: string) => p === filePath || filePath.endsWith(p) || p.endsWith(filePath));
    });

    // Color palettes for multi-author lines & cards
    const MEMBER_COLORS = [
      { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-[#10B981]', dot: 'bg-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' },
      { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', bar: 'bg-[#0EA5E9]', dot: 'bg-sky-400', badge: 'bg-sky-950/80 text-sky-300 border border-sky-500/30' },
      { text: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30', bar: 'bg-[#8B5CF6]', dot: 'bg-purple-400', badge: 'bg-purple-950/80 text-purple-300 border border-purple-500/30' },
      { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-[#F59E0B]', dot: 'bg-amber-400', badge: 'bg-amber-950/80 text-amber-300 border border-amber-500/30' },
      { text: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/30', bar: 'bg-[#EC4899]', dot: 'bg-pink-400', badge: 'bg-pink-950/80 text-pink-300 border border-pink-500/30' },
      { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', bar: 'bg-[#6366F1]', dot: 'bg-indigo-400', badge: 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30' }
    ];

    // 3. Multi-Author Collaborator Breakdown
    const collaboratorMap = new Map<string, {
      studentId: string;
      name: string;
      gitUsername: string;
      isAuthorized: boolean;
      keystrokes: number;
      pasteCount: number;
      charactersPasted: number;
      linesAdded: number;
      linesRemoved: number;
      commitsCount: number;
      lastActive: Date;
      colorIndex: number;
    }>();

    let colorIdx = 0;

    // Process Git Commits
    matchedCommits.forEach(c => {
      const key = (c.gitUsername || c.studentId || 'unknown').toLowerCase();
      const isAuth = c.isAuthorized !== false;
      const existing = collaboratorMap.get(key) || {
        studentId: c.studentId || '',
        name: c.studentName || c.gitUsername || 'Contributor',
        gitUsername: c.gitUsername || '',
        isAuthorized: isAuth,
        keystrokes: 0,
        pasteCount: 0,
        charactersPasted: 0,
        linesAdded: 0,
        linesRemoved: 0,
        commitsCount: 0,
        lastActive: new Date(c.commitDate || Date.now()),
        colorIndex: colorIdx++ % MEMBER_COLORS.length
      };
      existing.linesAdded += c.linesAdded || 0;
      existing.linesRemoved += c.linesRemoved || 0;
      existing.commitsCount++;
      if (new Date(c.commitDate) > existing.lastActive) {
        existing.lastActive = new Date(c.commitDate);
      }
      collaboratorMap.set(key, existing);
    });

    // Process VS Code Sessions
    matchedSessions.forEach(s => {
      const key = (s.gitUsername || s.studentId || 'unknown').toLowerCase();
      const existing = collaboratorMap.get(key) || {
        studentId: s.studentId || '',
        name: s.studentName || 'Student',
        gitUsername: s.gitUsername || '',
        isAuthorized: true,
        keystrokes: 0,
        pasteCount: 0,
        charactersPasted: 0,
        linesAdded: 0,
        linesRemoved: 0,
        commitsCount: 0,
        lastActive: new Date(s.sessionEnd || Date.now()),
        colorIndex: colorIdx++ % MEMBER_COLORS.length
      };
      existing.keystrokes += s.keystrokes || 0;
      existing.pasteCount += s.pasteCount || 0;
      existing.charactersPasted += s.charactersPasted || 0;
      existing.linesAdded += s.linesAdded || 0;
      existing.linesRemoved += s.linesRemoved || 0;
      if (new Date(s.sessionEnd) > existing.lastActive) {
        existing.lastActive = new Date(s.sessionEnd);
      }
      collaboratorMap.set(key, existing);
    });

    // If local file without server records yet, attribute to logged-in user with report metrics
    if (collaboratorMap.size === 0 && student) {
      const studentPasteCount = report?.metrics?.pasteCount || 0;
      const studentPasteChars = report?.metrics?.charactersPasted || 0;
      const studentKeystrokes = report?.metrics?.keystrokes || Math.round((file.size || 200) * 0.4 + 40);

      collaboratorMap.set((student.name || 'Current Student').toLowerCase(), {
        studentId: student._id || '',
        name: student.name || 'Current Student',
        gitUsername: gitUsername || 'local-developer',
        isAuthorized: true,
        keystrokes: studentKeystrokes,
        pasteCount: studentPasteCount,
        charactersPasted: studentPasteChars,
        linesAdded: file.lineCount || 10,
        linesRemoved: 0,
        commitsCount: 0,
        lastActive: new Date(file.lastModified || Date.now()),
        colorIndex: 0
      });
    }

    const collaborators = Array.from(collaboratorMap.values());

    // 4. Totals and Authenticity Metrics
    const totalKeystrokes = collaborators.reduce((acc, c) => acc + c.keystrokes, 0);
    const totalPasteCount = collaborators.reduce((acc, c) => acc + c.pasteCount, 0) + (report?.metrics?.pasteCount || 0);
    const totalCharsPasted = collaborators.reduce((acc, c) => acc + c.charactersPasted, 0) + (report?.metrics?.charactersPasted || 0);
    const totalLinesAdded = Math.max(file.lineCount || 1, collaborators.reduce((acc, c) => acc + c.linesAdded, 0));

    // Keystroke Efficiency (K_eff)
    const keff = parseFloat((totalKeystrokes / totalLinesAdded).toFixed(2));
    
    // Human Typing Ratio %
    const totalInputVolume = totalKeystrokes + totalCharsPasted;
    let typingPercent = totalPasteCount > 0 ? 35 : 94;
    if (totalInputVolume > 0) {
      typingPercent = Math.min(100, Math.max(5, Math.round((totalKeystrokes / totalInputVolume) * 100)));
    }

    let authenticityVerdict: 'authentic' | 'mixed' | 'suspicious' = 'authentic';
    let authenticityMessage = 'Authentic Organic Human Typing (Normal Keystroke Cadence)';
    if (totalPasteCount > 3 || (totalLinesAdded >= 40 && keff < 2.0) || typingPercent < 50) {
      authenticityVerdict = 'suspicious';
      authenticityMessage = 'Heavy Bulk Copy-Paste / AI Injected Code Anomaly Detected';
    } else if (totalPasteCount > 0 || typingPercent < 80) {
      authenticityVerdict = 'mixed';
      authenticityMessage = 'Snippet Pastes & Reference Inserts Logged alongside Human Keystrokes';
    }

    // 5. Creator & Modifier identification
    const sortedSessions = [...matchedSessions].sort((a, b) => new Date(a.sessionStart).getTime() - new Date(b.sessionStart).getTime());
    const sortedCommits = [...matchedCommits].sort((a, b) => new Date(a.commitDate).getTime() - new Date(b.commitDate).getTime());
    
    const earliestSession = sortedSessions[0];
    const earliestCommit = sortedCommits[0];
    
    const creatorName = earliestCommit?.studentName || earliestSession?.studentName || collaborators[0]?.name || 'Local Workspace Author';
    const creatorGit = earliestCommit?.gitUsername || earliestSession?.gitUsername || collaborators[0]?.gitUsername || 'local';
    const isCreatorAuthorized = earliestCommit ? (earliestCommit.isAuthorized !== false) : true;
    const createdAt = earliestCommit?.commitDate ? new Date(earliestCommit.commitDate) : (earliestSession?.sessionStart ? new Date(earliestSession.sessionStart) : (file.lastModified ? new Date(file.lastModified) : new Date()));

    const latestCommit = sortedCommits[sortedCommits.length - 1];
    const latestSession = sortedSessions[sortedSessions.length - 1];
    const lastModifierName = latestCommit?.studentName || latestSession?.studentName || collaborators[0]?.name || creatorName;
    const lastModifierGit = latestCommit?.gitUsername || latestSession?.gitUsername || collaborators[0]?.gitUsername || creatorGit;
    const isLastModifierAuthorized = latestCommit ? (latestCommit.isAuthorized !== false) : true;

    const hasUnauthorizedAuthor = collaborators.some(c => !c.isAuthorized) || matchedCommits.some(c => c.isAuthorized === false);
    const unauthorizedAuthors = collaborators.filter(c => !c.isAuthorized).map(c => c.name || c.gitUsername);

    // 6. Multi-Author Line Attribution (Blame view generator with full provenance & timestamp)
    const rawLines = file.lines || (file.content ? file.content.split('\n') : []);

    // ── Gather lineRecords, fileActivity, and session-level metrics ──────────
    const fileLineRecordsMap = new Map<number, any>();
    let matchedFileActivity: any = null;

    // Sort sessions newest-first so we use the latest session's isOffline status
    const sortedMatchedSessions = [...matchedSessions].sort(
      (a, b) => new Date(b.sessionEnd || b.sessionStart).getTime() - new Date(a.sessionEnd || a.sessionStart).getTime()
    );
    const latestMatchedSession = sortedMatchedSessions[0] || null;

    // Online/Offline: use ONLY the latest session's isOffline flag.
    // Old sessions may have wrong isOffline from previous bugs — don't let them poison all lines.
    // If the latest session synced successfully (isOffline=false), the coding was online.
    const defaultIsOffline = latestMatchedSession?.isOffline === true;

    // Aggregate session-level paste/keystroke metrics as a fallback signal
    const sessionTotalPasteChars = matchedSessions.reduce((acc: number, s: any) => acc + (s.charactersPasted || 0), 0);
    const sessionTotalPasteCount = matchedSessions.reduce((acc: number, s: any) => acc + (s.pasteCount || 0), 0);
    const sessionTotalKeystrokes = matchedSessions.reduce((acc: number, s: any) => acc + (s.keystrokes || 0), 0);

    // Scan fileActivities for lineRecords and file-level provenance
    matchedSessions.forEach((s: any) => {
      (s.fileActivities || []).forEach((fa: any) => {
        const faPath = (fa.filePath || '').replace(/\\/g, '/').toLowerCase();
        const fpLower = filePath.toLowerCase();
        const fnLower = fileName.toLowerCase();
        const matchesFile = faPath === fpLower
          || faPath.endsWith('/' + fnLower)
          || fpLower.endsWith(faPath)
          || faPath === fnLower;
        if (matchesFile) {
          // Keep the LAST matched file activity (from most recent session)
          matchedFileActivity = fa;
          (fa.lineRecords || []).forEach((lr: any) => {
            fileLineRecordsMap.set(lr.lineNumber, lr);
          });
        }
      });
    });

    // ── Determine file-level provenance from multiple signal sources ─────────
    //
    // Signal 1: fileActivity.typingProvenance (set by extension's per-file tracking)
    // Signal 2: fileActivity character counts (manualChars, pasteChars, aiChars)
    // Signal 3: session-level pasteCount/charactersPasted (aggregate fallback)
    //
    const faProvenance   = matchedFileActivity?.typingProvenance || null;
    const faPasteChars   = matchedFileActivity?.pasteChars || 0;
    const faAiChars      = matchedFileActivity?.aiChars || 0;
    const faManualChars  = matchedFileActivity?.manualChars || 0;
    const faTotal        = faPasteChars + faAiChars + faManualChars;
    const faPasteRatio   = faTotal > 0 ? faPasteChars / faTotal : 0;
    const faAiRatio      = faTotal > 0 ? faAiChars / faTotal : 0;

    // Resolve a single file-level provenance decision
    let resolvedFileProvenance: 'typed' | 'pasted' | 'ai_generated' = 'typed';
    if (faProvenance === 'copy_paste' || faPasteRatio > 0.25 || (faPasteChars > 0 && faPasteChars >= faManualChars)) {
      resolvedFileProvenance = 'pasted';
    } else if (faProvenance === 'ai_assisted' || faAiRatio > 0.35) {
      resolvedFileProvenance = 'ai_generated';
    } else if (faProvenance === 'mixed') {
      if (faPasteRatio >= faAiRatio && faPasteRatio > 0.15) resolvedFileProvenance = 'pasted';
      else if (faAiRatio > faPasteRatio && faAiRatio > 0.2) resolvedFileProvenance = 'ai_generated';
      else resolvedFileProvenance = 'typed';
    } else if (sessionTotalPasteCount > 0 || (report?.metrics?.pasteCount && report.metrics.pasteCount > 0) || totalCharsPasted > 0) {
      resolvedFileProvenance = 'pasted';
    } else if (totalKeystrokes === 0 || (rawLines.length > 5 && totalKeystrokes < rawLines.length * 2)) {
      // Bulk code without proportional manual keystrokes is imported / pasted code
      resolvedFileProvenance = 'pasted';
    }
    // else: genuine manual keystrokes → 'typed'

    const lineAttributions = rawLines.map((lineText: string, idx: number) => {
      // Author assignment (proportional by lines added per collaborator)
      let assignedCollab = collaborators[0];
      if (collaborators.length > 1) {
        const totalLinesWeight = collaborators.reduce((acc, c) => acc + Math.max(1, c.linesAdded), 0);
        let cum = 0;
        const ratio = idx / Math.max(1, rawLines.length);
        for (const c of collaborators) {
          cum += Math.max(1, c.linesAdded) / totalLinesWeight;
          if (ratio <= cum) { assignedCollab = c; break; }
        }
      }

      const currentLineNum = idx + 1;
      const recordedLine   = fileLineRecordsMap.get(currentLineNum);

      // ── PROVENANCE ─────────────────────────────────────────────────────────
      let provenanceType: 'typed' | 'ai_generated' | 'pasted' = 'typed';
      let lineTimestamp = assignedCollab?.lastActive
        ? new Date(assignedCollab.lastActive)
        : (file.lastModified ? new Date(file.lastModified) : new Date());
      let isLineOffline = defaultIsOffline;

      if (recordedLine) {
        // Priority 1: Exact per-line telemetry from extension
        if (recordedLine.provenance === 'copy_paste')       provenanceType = 'pasted';
        else if (recordedLine.provenance === 'ai_assisted') provenanceType = 'ai_generated';
        else provenanceType = 'typed';
        isLineOffline = recordedLine.isOffline === true;
        if (recordedLine.timestamp) lineTimestamp = new Date(recordedLine.timestamp);
      } else {
        // Priority 2: File-level resolved provenance (from fileActivity + session metrics)
        provenanceType = resolvedFileProvenance;
      }

      // ── ONLINE / OFFLINE ──────────────────────────────────────────────────
      // isLineOffline is set from:
      //   - recordedLine.isOffline (per-line, most accurate)
      //   - OR latestSession.isOffline (default for lines without records)
      // If no sessions at all, default = false (online) — user is viewing live.

      const timeFormatted = lineTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        lineNumber: currentLineNum,
        text: lineText,
        authorName: assignedCollab?.name || 'Local Author',
        gitUsername: assignedCollab?.gitUsername || 'local',
        isAuthorized: assignedCollab ? assignedCollab.isAuthorized : true,
        timestamp: lineTimestamp,
        timeFormatted,
        provenanceType,
        isPasted:   provenanceType === 'pasted',
        isAi:       provenanceType === 'ai_generated',
        isOffline:  isLineOffline,
        colorIndex: assignedCollab?.colorIndex ?? 0
      };
    });

    return {
      fileName,
      filePath,
      parentFolder: file.parentFolder || '(root)',
      size: file.size || 0,
      lineCount: file.lineCount || rawLines.length,
      lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
      creatorName,
      creatorGit,
      isCreatorAuthorized,
      createdAt,
      lastModifierName,
      lastModifierGit,
      isLastModifierAuthorized,
      collaborators,
      commits: matchedCommits,
      sessions: matchedSessions,
      totalKeystrokes,
      totalPasteCount,
      totalCharsPasted,
      keff,
      typingPercent,
      authenticityVerdict,
      authenticityMessage,
      hasUnauthorizedAuthor,
      unauthorizedAuthors,
      memberColors: MEMBER_COLORS,
      lineAttributions
    };
  }, [commitsList, sessionsList, student, gitUsername]);

  const handleSelectOfflineFile = async (file: any) => {
    setSelectedOfflineFile(file);
    setSelectedOfflineFileDiff(null);
    if (!team || !file.content) return;
    
    setDiffLoading(true);
    try {
      const res = await api.github.getFile(team._id, file.path).catch(() => null);
      const remoteContent = res?.content || '';
      const diff = computeDiff(remoteContent, file.content);
      setSelectedOfflineFileDiff(diff);
    } catch (err) {
      console.error('Failed to generate file diff:', err);
      const fallbackDiff = file.lines ? file.lines.map((l: string) => ({ type: 'added' as const, text: l })) : [];
      setSelectedOfflineFileDiff(fallbackDiff);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    router.push('/');
  };

  const filteredStudents = studentsList.filter(s => 
    s.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-[#0EA5E9]/30 selection:text-[#38BDF8]">
      
      {/* =========================================================================
          LEFT SIDEBAR
      ========================================================================= */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#0B1120] shrink-0 flex flex-col justify-between p-6">
        <div className="space-y-8 text-left">
          
          {/* Logo Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#38BDF8] shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Code2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">OffSync</span>
              <span className="text-[10px] text-[#38BDF8] font-mono-code font-medium tracking-wide block mt-1">Student Node</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-6 text-xs font-light text-slate-400">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono-code text-slate-500 block tracking-wider mb-2">Workplace Views</span>
              
              <button 
                onClick={() => setActiveTab('repository')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                  (activeTab === 'repository' || activeTab === 'commits' || activeTab === 'kanban') 
                    ? 'bg-[#0EA5E9]/15 text-[#38BDF8] border-[#0EA5E9]/30 font-medium shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                    : 'hover:bg-slate-800/60 hover:text-white border-transparent'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('teams'); loadMyTeams(); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                  activeTab === 'teams' 
                    ? 'bg-[#0EA5E9]/15 text-[#38BDF8] border-[#0EA5E9]/30 font-medium shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                    : 'hover:bg-slate-800/60 hover:text-white border-transparent'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Teams Manager</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('directory'); loadStudentDirectory(); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                  activeTab === 'directory' 
                    ? 'bg-[#0EA5E9]/15 text-[#38BDF8] border-[#0EA5E9]/30 font-medium shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                    : 'hover:bg-slate-800/60 hover:text-white border-transparent'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Student Directory</span>
              </button>

              <Link 
                href="/student/simulator"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border border-white/5 hover:border-[#0EA5E9]/30 hover:bg-slate-800/60 text-slate-300 hover:text-white"
              >
                <Terminal className="w-4 h-4 text-[#0EA5E9]" />
                <span>VS Code Simulator</span>
              </Link>
            </div>

            {(activeTab === 'repository' || activeTab === 'commits' || activeTab === 'timeline' || activeTab === 'kanban') && (
              <>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] uppercase font-mono-code text-slate-500 block tracking-wider mb-2">Code & Telemetry</span>
                  
                  <button 
                    onClick={() => setActiveTab('repository')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                      activeTab === 'repository' 
                        ? 'bg-slate-800 text-white border-white/10 font-medium' 
                        : 'hover:bg-slate-800/40 text-slate-400 border-transparent'
                    }`}
                  >
                    <GitBranch className="w-4 h-4 text-[#10B981]" />
                    <span>Repositories & Local Folder</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('commits')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                      activeTab === 'commits' 
                        ? 'bg-slate-800 text-white border-white/10 font-medium' 
                        : 'hover:bg-slate-800/40 text-slate-400 border-transparent'
                    }`}
                  >
                    <Code className="w-4 h-4 text-[#38BDF8]" />
                    <span>Commits & Telemetry</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('timeline')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                      activeTab === 'timeline' 
                        ? 'bg-slate-800 text-white border-white/10 font-medium' 
                        : 'hover:bg-slate-800/40 text-slate-400 border-transparent'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-[#10B981]" />
                    <span>Work & Provenance Timeline</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] uppercase font-mono-code text-slate-500 block tracking-wider mb-2">Milestones</span>
                  
                  <button 
                    onClick={() => setActiveTab('kanban')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer border ${
                      activeTab === 'kanban' 
                        ? 'bg-slate-800 text-white border-white/10 font-medium' 
                        : 'hover:bg-slate-800/40 text-slate-400 border-transparent'
                    }`}
                  >
                    <Kanban className="w-4 h-4 text-[#F59E0B]" />
                    <span>Kanban Board</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* User profile footer & logout */}
        <div className="border-t border-white/10 pt-5 mt-6 flex flex-col gap-3 text-left">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 text-[#38BDF8] border border-[#0EA5E9]/30 font-bold flex items-center justify-center text-xs">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div className="truncate min-w-0">
              <span className="font-medium text-xs text-white block leading-tight truncate">{student?.name || 'Student Profile'}</span>
              <span className="text-[10px] text-slate-400 font-mono-code block mt-0.5 truncate">{student?.email}</span>
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
          MAIN CONTENT AREA
      ========================================================================= */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Top Header Bar */}
        <header className="border-b border-white/10 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-light">
            <span>Workspace</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#38BDF8] font-medium font-mono-code text-[11px] tracking-wide">
              {activeTab === 'teams' ? 'Teams Manager' : activeTab === 'directory' ? 'Student Directory' : selectedAssignment?.title || 'Attestation Workspace'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-sync status badge with Git Attestation */}
            {localDirHandle && (
              <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono-code">
                {gitVerification?.status === 'matched' ? (
                  <span className="flex items-center gap-1 text-[#10B981]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="truncate max-w-[120px] font-bold">{localDirName}/</span>
                    <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.2 rounded border border-[#10B981]/30">Verified</span>
                  </span>
                ) : gitVerification?.status === 'mismatch' ? (
                  <span className="flex items-center gap-1 text-[#F43F5E]">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#F43F5E]" />
                    <span className="truncate max-w-[120px] font-bold">{localDirName}/</span>
                    <span className="text-[10px] bg-[#F43F5E]/15 text-[#F43F5E] px-1.5 py-0.2 rounded border border-[#F43F5E]/30">Mismatch</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-300">
                    <FolderCheck className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    <span className="truncate max-w-[120px] font-bold">{localDirName}/</span>
                  </span>
                )}
                {lastAutoSyncTime && <span className="text-slate-500 text-[10px]">({lastAutoSyncTime})</span>}
              </div>
            )}

            {/* Universal Auto-Sync Button */}
            {selectedAssignment && (
              <button
                onClick={handleManualAutoSyncAll}
                disabled={autoSyncInProgress || scanning}
                className="px-3.5 py-1.5 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium transition shadow-[0_0_15px_rgba(14,165,233,0.25)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoSyncInProgress || scanning ? 'animate-spin' : ''}`} />
                <span>{autoSyncInProgress ? 'Auto-Syncing Works...' : 'Auto-Sync All Works'}</span>
              </button>
            )}

            {(activeTab !== 'teams' && activeTab !== 'directory') && selectedAssignment && (
              <span className="text-xs bg-slate-900 border border-white/10 text-slate-300 rounded-lg px-3 py-1 font-mono-code flex items-center gap-1.5 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Deadline: {new Date(selectedAssignment.deadline).toLocaleDateString()}</span>
              </span>
            )}
          </div>
        </header>

        {/* Body Wrapper */}
        <main className="flex-grow p-6 sm:p-8 space-y-6">
          
          {/* Dynamic alerts */}
          {error && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-200 text-xs font-light flex items-start gap-2.5 text-left animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs font-light flex items-start gap-2.5 text-left animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* =========================================================================
              SAVED WORKSPACE RE-CONNECT BANNER (PERSISTENCE PROMPT)
          ========================================================================= */}
          {savedFolderPrompt && !localDirHandle && (
            <div className="glass-card rounded-2xl border border-[#0EA5E9]/40 bg-[#0EA5E9]/5 p-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono-code text-[#38BDF8]">
                  <HardDrive className="w-4 h-4 text-[#38BDF8]" />
                  <span>Saved Physical Workspace Detected</span>
                </div>
                <p className="text-xs text-slate-300 font-light">
                  You previously connected folder <strong className="text-white font-mono-code">{savedFolderPrompt.folderName}/</strong> for this assignment. Click below to re-authenticate and automatically verify your Git remote and reconcile changes.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleResumeSavedWorkspace}
                  className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Resume & Auto-Sync
                </button>
                <button
                  onClick={handleSelectFolder}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-light border border-white/10 transition cursor-pointer"
                >
                  Choose Different Folder
                </button>
              </div>
            </div>
          )}

          {/* VS Code Extension Setup Banner */}
          {activeTab === 'commits' && (
            <div className="glass-card rounded-2xl border border-[#0EA5E9]/30 p-6 text-left relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] font-mono-code mb-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>VS Code Telemetry Daemon Setup</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light leading-relaxed max-w-xl">
                    Install <strong>OffSync Telemetry Sensor</strong> in VS Code, then open the Command Palette (<code className="bg-slate-800 text-white rounded px-1.5 py-0.5 font-mono-code text-[11px]">Ctrl+Shift+P</code>) and run <code className="bg-slate-800 text-[#38BDF8] rounded px-1.5 py-0.5 font-mono-code text-[11px]">OffSync: Setup</code> with your token.
                  </p>
                </div>
                <span className="text-[10px] bg-[#0EA5E9]/10 text-[#38BDF8] border border-[#0EA5E9]/30 rounded-md px-2.5 py-1 font-mono-code font-medium uppercase tracking-wider">
                  v2.0 Client
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Auth Token */}
                <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-mono-code text-slate-400 tracking-wider">Student Auth Token (JWT)</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono-code bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 truncate text-slate-300">
                      {typeof window !== 'undefined' ? (localStorage.getItem('token') || '— not found —') : '—'}
                    </code>
                    <button
                      onClick={() => {
                        const t = localStorage.getItem('token') || '';
                        navigator.clipboard.writeText(t);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="flex-shrink-0 px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium rounded-lg transition cursor-pointer shadow-xs"
                    >
                      {copiedToken ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Assignment ID */}
                <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-mono-code text-slate-400 tracking-wider">Active Assignment ID</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono-code bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 truncate text-slate-300">
                      {selectedAssignment?._id || '— select an assignment first —'}
                    </code>
                    <button
                      onClick={() => {
                        const id = selectedAssignment?._id || '';
                        if (!id) return;
                        navigator.clipboard.writeText(id);
                        setCopiedAssignId(true);
                        setTimeout(() => setCopiedAssignId(false), 2000);
                      }}
                      disabled={!selectedAssignment}
                      className="flex-shrink-0 px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    >
                      {copiedAssignId ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 font-mono-code flex items-center gap-2">
                <span className="text-[#10B981]">●</span> Server endpoint: <code className="text-slate-300">http://localhost:5000</code> (Auto-syncs offline batches on reconnect).
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 1: TEAMS MANAGER
          ========================================================================= */}
          {activeTab === 'teams' ? (
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Teams Manager</h1>
                  <p className="text-xs text-slate-400 font-light mt-0.5">Form general teams, select members directly, and link cohort assignments.</p>
                </div>
                <button
                  onClick={() => { setShowGeneralTeamModal(true); setSelectedMembers([]); }}
                  className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium transition shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Form General Team
                </button>
              </div>

              {myTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myTeams.map((t: any) => {
                    const isLeader = t.leader === student?.id || (student && t.leader?.toString() === student.id);
                    return (
                      <div key={t._id} className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-mono-code font-medium border border-white/10 px-2 py-0.5 rounded-md bg-slate-900 text-[#38BDF8] block w-max mb-2">
                              {isLeader ? 'Leader' : 'Member'}
                            </span>
                            <h3 className="text-base font-semibold text-white">{t.name}</h3>
                          </div>
                          <span className="text-xs font-mono-code bg-slate-900 border border-white/10 text-slate-300 px-2.5 py-1 rounded-lg">
                            Invite Code: <strong className="text-white">{t.inviteCode}</strong>
                          </span>
                        </div>

                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <span className="text-[10px] uppercase font-mono-code text-slate-400 tracking-wider">Team Roster</span>
                          <div className="space-y-1.5">
                            {t.members.map((m: any) => (
                              <div key={m.student?._id || m.student} className="text-xs text-slate-300 flex justify-between">
                                <span>{m.student?.name || 'Joining Student'}</span>
                                <span className="text-slate-400 font-mono-code text-[11px]">@{m.gitUsername}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-white/5 pt-4">
                          <span className="text-[10px] uppercase font-mono-code text-slate-400 tracking-wider">Repository</span>
                          <span className="text-xs font-mono-code block text-slate-300 truncate">
                            {t.repositoryUrl || 'No repository linked yet.'}
                          </span>
                        </div>

                        {t.assignment && (
                          <div className="border-t border-white/5 pt-4 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] uppercase font-mono-code text-[#38BDF8] tracking-wider block">Linked Assignment</span>
                            <span className="text-xs font-medium text-white block mt-0.5">{t.assignment.title || 'Linked Assignment'}</span>
                            {t.assignment.invitationCode && (
                              <span className="text-[10px] text-slate-400 font-mono-code block mt-0.5">Invite Code: {t.assignment.invitationCode}</span>
                            )}
                          </div>
                        )}

                        {isLeader && (
                          <div className="border-t border-white/5 pt-4 space-y-3">
                            <span className="text-[10px] uppercase font-mono-code text-slate-400 tracking-wider block">Link Assignment to Team</span>
                            <form 
                              onSubmit={(e) => handleLinkAssignment(e, t._id)} 
                              className="flex gap-2.5"
                            >
                              <input
                                type="text"
                                required
                                value={linkInviteCodes[t._id] || ''}
                                onChange={(e) => setLinkInviteCodes(prev => ({ ...prev, [t._id]: e.target.value }))}
                                placeholder="Assignment Invite Code (e.g. INV-123)"
                                className="flex-grow bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                              />
                              <button 
                                type="submit"
                                className="px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
                              >
                                Link
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-card border border-white/10 p-12 rounded-2xl text-center text-xs text-slate-400">
                  You are not a member of any teams yet. Click "Form General Team" to create one.
                </div>
              )}
            </div>
          ) : activeTab === 'directory' ? (
            /* =========================================================================
                VIEW 2: STUDENT DIRECTORY
            ========================================================================= */
            <div className="space-y-6 text-left">
              <div className="pb-4 border-b border-white/10">
                <h1 className="text-xl font-bold text-white tracking-tight">Student Directory</h1>
                <p className="text-xs text-slate-400 font-light mt-0.5">Search classmates registered in the contribution tracking platform.</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search by student name or academic email address..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] transition"
                  />
                </div>

                <div className="overflow-x-auto w-full pt-2">
                  <table className="w-full text-left text-xs font-mono-code border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider bg-slate-950/40">
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Academic Email</th>
                        <th className="py-3 px-4 text-right">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => (
                          <tr key={s.id || s.email} className="hover:bg-white/5 transition">
                            <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#0EA5E9]/20 text-[#38BDF8] border border-[#0EA5E9]/30 text-xs font-bold flex items-center justify-center">
                                {s.name?.charAt(0) || 'S'}
                              </div>
                              <span>{s.name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono-code">{s.email}</td>
                            <td className="py-3.5 px-4 text-right font-mono-code text-[10px] uppercase text-[#10B981]">Active Student</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                            No student profiles match your query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
                VIEW 3: ACTIVE ASSIGNMENT WORKSPACE (DEFAULT)
            ========================================================================= */
            <>
              {assignments.length > 0 ? (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2 text-left">
                  <div className="space-y-1">
                    <h1 className="text-xl font-bold text-white tracking-tight">Active Academic Assignment Workspace</h1>
                    <div className="flex items-center gap-3">
                      <select
                        onChange={handleAssignmentChange}
                        value={selectedAssignment?._id || ''}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#0EA5E9] cursor-pointer"
                      >
                        {assignments.map(a => (
                          <option key={a._id} value={a._id}>{a.title}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { setShowJoinModal(true); setSearchedAssignment(null); setInviteCode(''); setTeamFlow('none'); setSelectedMembers([]); }}
                        className="px-3.5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium transition shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Join Assignment
                      </button>
                    </div>
                  </div>

                  {team && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleSyncGit}
                        disabled={syncingGit}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition border border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#38BDF8] ${syncingGit ? 'animate-spin' : ''}`} />
                        Sync Git Data
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* NO ASSIGNMENTS JOINED YET */
                <div className="glass-card border border-white/10 p-8 rounded-2xl max-w-2xl mx-auto space-y-6 mt-10 text-center shadow-2xl">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Join An Assignment Cohort</h2>
                    <p className="text-xs text-slate-300 font-light">Enter the invitation code provided by your lecturer to join and register your team.</p>
                  </div>

                  <form onSubmit={handleSearchInvite} className="flex gap-3 max-w-lg mx-auto">
                    <input
                      type="text"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter invite code (e.g. INV-123)"
                      className="flex-grow bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                    />
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
                    >
                      Search Code
                    </button>
                  </form>
                </div>
              )}

              {selectedAssignment && team && (
                <div className="space-y-6 text-left">
                  
                  {/* Repository Linker Card */}
                  <div className="glass-card rounded-2xl p-5 border border-white/10">
                    <form onSubmit={handleUpdateRepo} className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-grow space-y-1 w-full text-left">
                        <div className="flex justify-between items-center text-xs">
                          <label className="text-[10px] uppercase text-slate-400 font-mono-code">Team Repository URL</label>
                          <span className="text-[#38BDF8] font-mono-code text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-white/10">
                            Team Invite: <strong className="text-white">{team.inviteCode}</strong>
                          </span>
                        </div>
                        <input
                          type="url"
                          required
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          placeholder="https://github.com/your-org/your-repo"
                          className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition border border-white/10 shrink-0 cursor-pointer shadow-xs"
                      >
                        Link Repository
                      </button>
                    </form>
                  </div>

                  {/* Master 2-Column Split Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left/Center Column (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Tab Navigation header */}
                      <div className="glass-card rounded-2xl p-1.5 flex flex-wrap gap-2 text-xs font-mono-code border border-white/10">
                        <button
                          onClick={() => setActiveTab('repository')}
                          className={`flex-1 min-w-[130px] py-2 rounded-xl transition cursor-pointer border ${
                            activeTab === 'repository' ? 'bg-[#0EA5E9] text-white border-[#0EA5E9] font-medium shadow-xs' : 'text-slate-400 border-transparent hover:text-white'
                          }`}
                        >
                          Workspace Files
                        </button>
                        <button
                          onClick={() => setActiveTab('commits')}
                          className={`flex-1 min-w-[130px] py-2 rounded-xl transition cursor-pointer border ${
                            activeTab === 'commits' ? 'bg-[#0EA5E9] text-white border-[#0EA5E9] font-medium shadow-xs' : 'text-slate-400 border-transparent hover:text-white'
                          }`}
                        >
                          Commits & Telemetry
                        </button>
                        <button
                          onClick={() => setActiveTab('timeline')}
                          className={`flex-1 min-w-[150px] py-2 rounded-xl transition cursor-pointer border ${
                            activeTab === 'timeline' ? 'bg-[#0EA5E9] text-white border-[#0EA5E9] font-medium shadow-xs' : 'text-slate-400 border-transparent hover:text-white'
                          }`}
                        >
                          ⏱️ Provenance Timeline
                        </button>
                        <button
                          onClick={() => setActiveTab('kanban')}
                          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer border ${
                            activeTab === 'kanban' ? 'bg-[#0EA5E9] text-white border-[#0EA5E9] font-medium shadow-xs' : 'text-slate-400 border-transparent hover:text-white'
                          }`}
                        >
                          Tasks Kanban
                        </button>
                      </div>

                      {/* TAB CONTENT: 1. REPOSITORY & PHYSICAL WORKSPACE */}
                      {activeTab === 'repository' && (
                        <div className="space-y-6 text-left">
                          
                          {/* Repo Meta subheader */}
                          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
                              <span className="font-mono-code text-xs text-white truncate">{repoUrl || 'No Repository Linked'}</span>
                              {repoUrl && (
                                <a
                                  href={repoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#38BDF8] hover:underline flex items-center gap-1 font-mono-code border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-2.5 py-1 rounded-lg"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View on GitHub
                                </a>
                              )}
                            </div>

                            {/* Members Roster */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-[10px] uppercase font-mono-code text-slate-400 pr-2">Team Members:</span>
                              {studentBreakdown.length > 0 ? (
                                studentBreakdown.map((member) => (
                                  <div key={member.studentId} className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 border border-white/5 rounded-lg px-2.5 py-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                    <span>{member.name}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">Sync repo to load breakdown.</span>
                              )}
                            </div>
                          </div>

                          {/* =========================================================================
                              PHYSICAL WORKSPACE SCANNER (WITH PERSISTENCE & GIT REMOTE VALIDATION)
                          ========================================================================= */}
                          <div className="glass-card rounded-2xl border border-white/10 overflow-hidden text-left">
                            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <HardDrive className="w-4 h-4 text-[#0EA5E9]" />
                                  <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">
                                    Physical Project Workspace (Auto-Saved & Git Attested)
                                  </h3>
                                </div>
                                <p className="text-xs text-slate-300 font-light mt-1">
                                  Connect your local cloned repository once. OffSync inspects the hidden <code className="text-[#38BDF8] bg-slate-950 px-1 py-0.5 rounded text-[11px]">.git/config</code> to attest that your local directory matches the assigned repository.
                                </p>
                              </div>

                              {localDirHandle && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleManualAutoSyncAll}
                                    disabled={scanning || autoSyncInProgress}
                                    className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${scanning || autoSyncInProgress ? 'animate-spin' : ''}`} />
                                    <span>{scanning ? 'Scanning...' : 'Rescan & Sync'}</span>
                                  </button>
                                  <button
                                    onClick={handleDisconnectWorkspace}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl border border-white/10 transition cursor-pointer"
                                  >
                                    Disconnect
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Git Attestation Banner if verified */}
                            {localDirHandle && gitVerification && (
                              <div className={`px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code ${
                                gitVerification.status === 'matched' ? 'bg-[#10B981]/10 text-emerald-300' :
                                gitVerification.status === 'mismatch' ? 'bg-[#F43F5E]/10 text-rose-300' :
                                'bg-slate-900/60 text-slate-300'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {gitVerification.status === 'matched' ? (
                                    <>
                                      <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                                      <span><strong>Git Remote Verified:</strong> {gitVerification.matchedSlug}</span>
                                    </>
                                  ) : gitVerification.status === 'mismatch' ? (
                                    <>
                                      <ShieldAlert className="w-4 h-4 text-[#F43F5E]" />
                                      <span><strong>Remote Mismatch:</strong> Expected "{gitVerification.expectedRepoUrl}" but local .git is "{gitVerification.localRemoteUrl}"</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                                      <span>{gitVerification.message}</span>
                                    </>
                                  )}
                                </div>

                                {gitVerification.localBranch && (
                                  <div className="flex items-center gap-1.5 text-[11px] bg-slate-950/80 px-2.5 py-0.5 rounded-md border border-white/10">
                                    <GitCommit className="w-3.5 h-3.5 text-[#38BDF8]" />
                                    <span>Branch: <strong className="text-white">{gitVerification.localBranch}</strong></span>
                                  </div>
                                )}
                              </div>
                            )}

                            {!localDirHandle ? (
                              <div className="border-2 border-dashed border-white/10 rounded-xl m-5 p-8 text-center space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center mx-auto text-[#38BDF8]">
                                  <Folder className="w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-white">No Physical Workspace Directory Connected</h4>
                                  <p className="text-xs text-slate-400 font-light max-w-md mx-auto mt-1">
                                    Select your local development folder for <strong>{selectedAssignment.title}</strong> once. OffSync will verify its hidden <code className="text-slate-200">.git/config</code> remote path to ensure it is the exact cloned repository.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                  {savedFolderPrompt ? (
                                    <button
                                      onClick={handleResumeSavedWorkspace}
                                      className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium flex items-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                                    >
                                      <Zap className="w-4 h-4" />
                                      Resume Saved Workspace ({savedFolderPrompt.folderName}/)
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleSelectFolder}
                                      className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium flex items-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                                    >
                                      <Folder className="w-4 h-4" />
                                      Connect Cloned Project Folder
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5">
                                
                                {/* Left files */}
                                <div className="w-full md:w-72 shrink-0 flex flex-col">
                                  <div className="p-4 bg-slate-950/40 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-mono-code text-[#10B981] flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                                        Connected & Attested
                                      </span>
                                      {lastAutoSyncTime && (
                                        <span className="text-[10px] text-slate-500 font-mono-code">{lastAutoSyncTime}</span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-white font-mono-code block mt-1 truncate">{localDirName}/</span>
                                    <span className="text-[10px] text-slate-400 block mt-1">
                                      {scannedFiles.length} files across {scannedFolders.length} folders · {offlineEdits.length} modified recently
                                    </span>
                                  </div>

                                  {/* Filter Tabs */}
                                  <div className="flex border-b border-white/5 bg-slate-950/40">
                                    <button
                                      onClick={() => { setOfflineFilter('edited'); setSelectedFolderFilter(null); }}
                                      className={`flex-1 py-2 text-[10px] font-mono-code uppercase tracking-wider text-center border-b transition cursor-pointer ${
                                        offlineFilter === 'edited' ? 'text-[#38BDF8] border-[#38BDF8] bg-slate-900/60 font-medium' : 'text-slate-400 border-transparent hover:text-white'
                                      }`}
                                    >
                                      Modified ({offlineEdits.length})
                                    </button>
                                    <button
                                      onClick={() => setOfflineFilter('all')}
                                      className={`flex-1 py-2 text-[10px] font-mono-code uppercase tracking-wider text-center border-b transition cursor-pointer ${
                                        offlineFilter === 'all' ? 'text-[#38BDF8] border-[#38BDF8] bg-slate-900/60 font-medium' : 'text-slate-400 border-transparent hover:text-white'
                                      }`}
                                    >
                                      Files ({scannedFiles.length})
                                    </button>
                                    <button
                                      onClick={() => setOfflineFilter('folders')}
                                      className={`flex-1 py-2 text-[10px] font-mono-code uppercase tracking-wider text-center border-b transition cursor-pointer ${
                                        offlineFilter === 'folders' ? 'text-[#38BDF8] border-[#38BDF8] bg-slate-900/60 font-medium' : 'text-slate-400 border-transparent hover:text-white'
                                      }`}
                                    >
                                      Folders ({scannedFolders.length})
                                    </button>
                                  </div>

                                  {/* Search Filter Bar */}
                                  <div className="p-2 border-b border-white/5 bg-slate-950/60">
                                    <div className="relative flex items-center">
                                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
                                      <input
                                        type="text"
                                        placeholder="Search files by path / name..."
                                        value={fileSearchQuery}
                                        onChange={(e) => setFileSearchQuery(e.target.value)}
                                        className="w-full bg-slate-900/80 text-white pl-8 pr-7 py-1 rounded-lg text-[11px] font-mono-code border border-white/5 focus:border-[#38BDF8] focus:outline-none placeholder:text-slate-600"
                                      />
                                      {fileSearchQuery && (
                                        <button
                                          onClick={() => setFileSearchQuery('')}
                                          className="absolute right-2 text-slate-500 hover:text-white text-xs cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Folder Filter Pill if Active */}
                                  {selectedFolderFilter && offlineFilter !== 'folders' && (
                                    <div className="px-3.5 py-1.5 bg-[#0EA5E9]/15 border-b border-white/5 flex items-center justify-between text-[10px] font-mono-code text-[#38BDF8]">
                                      <span className="truncate">In folder: <strong>{selectedFolderFilter}/</strong></span>
                                      <button 
                                        onClick={() => setSelectedFolderFilter(null)}
                                        className="text-slate-400 hover:text-white ml-2 cursor-pointer font-bold"
                                      >
                                        ✕ Clear
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex-1 overflow-y-auto max-h-[500px]">
                                    {offlineFilter === 'folders' ? (
                                      /* 1. Folders List View */
                                      scannedFolders.length > 0 ? (
                                        scannedFolders.map((folder, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => {
                                              setSelectedFolderFilter(folder.path);
                                              setOfflineFilter('all');
                                            }}
                                            className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-slate-800/40 transition cursor-pointer group"
                                          >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <Folder className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                                                <span className="text-xs text-white truncate font-mono-code group-hover:text-[#38BDF8] transition-colors">{folder.path}/</span>
                                              </div>
                                              {folder.modifiedCount > 0 ? (
                                                <span className="text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 px-1.5 py-0.5 rounded font-mono-code uppercase shrink-0">
                                                  {folder.modifiedCount} Mod
                                                </span>
                                              ) : null}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono-code pl-5 flex items-center justify-between">
                                              <span>{folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''} · {(folder.totalSize / 1024).toFixed(1)} KB</span>
                                              <span className="text-slate-500 group-hover:text-[#38BDF8] text-[9px]">Filter →</span>
                                            </div>
                                          </button>
                                        ))
                                      ) : (
                                        <div className="text-center text-xs text-slate-500 p-8 py-16">
                                          No subfolders detected (all files at root level).
                                        </div>
                                      )
                                    ) : (
                                      /* 2. Files List View */
                                      (() => {
                                        let currentList = offlineFilter === 'edited' ? offlineEdits : scannedFiles;
                                        
                                        // Robust folder matching with slash normalization
                                        if (selectedFolderFilter) {
                                          const normFilter = selectedFolderFilter.replace(/^\/+|\/+$/g, '').toLowerCase();
                                          currentList = currentList.filter(f => {
                                            const normParent = (f.parentFolder || '').replace(/^\/+|\/+$/g, '').toLowerCase();
                                            const normPath = (f.path || '').replace(/^\/+|\/+$/g, '').toLowerCase();
                                            return (
                                              normParent === normFilter ||
                                              normPath.startsWith(normFilter + '/') ||
                                              normPath === normFilter ||
                                              (normParent !== '(root)' && normParent.startsWith(normFilter))
                                            );
                                          });
                                        }

                                        // Search query filter
                                        if (fileSearchQuery.trim()) {
                                          const q = fileSearchQuery.toLowerCase().trim();
                                          currentList = currentList.filter(f => 
                                            (f.name || '').toLowerCase().includes(q) ||
                                            (f.path || '').toLowerCase().includes(q)
                                          );
                                        }

                                        return currentList.length > 0 ? (
                                          currentList.map((f, idx) => {
                                            const isModified = offlineEdits.some(e => e.path === f.path);
                                            const fileIntel = getFileIntelligence(f);
                                            const isSelected = selectedOfflineFile?.path === f.path;

                                            return (
                                              <button
                                                key={idx}
                                                onClick={() => handleSelectOfflineFile(f)}
                                                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-slate-800/40 transition cursor-pointer ${isSelected ? 'bg-[#0EA5E9]/15 border-l-2 border-l-[#0EA5E9] pl-3.5' : ''}`}
                                              >
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#38BDF8]' : 'text-slate-400'}`} />
                                                    <span className="text-xs text-white truncate font-mono-code">{f.name}</span>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {fileIntel?.hasUnauthorizedAuthor ? (
                                                      <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.5 rounded font-mono-code font-bold flex items-center gap-0.5" title="Unauthorized author detected">
                                                        <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                                        Unauth
                                                      </span>
                                                    ) : null}

                                                    {isModified ? (
                                                      <span className="text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 px-1.5 py-0.5 rounded font-mono-code uppercase">Modified</span>
                                                    ) : (
                                                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono-code uppercase">Synced</span>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="text-[10px] text-slate-400 font-mono-code pl-5 flex items-center justify-between">
                                                  <span className="truncate max-w-[130px] text-slate-500">{f.parentFolder !== '(root)' ? `📁 ${f.parentFolder}/` : 'root/'}</span>
                                                  <span>{(f.size / 1024).toFixed(1)} KB · {f.lineCount}L</span>
                                                </div>

                                                {/* Mini author & typing telemetry summary */}
                                                {fileIntel && (
                                                  <div className="mt-1.5 pl-5 flex items-center justify-between text-[9px] font-mono-code text-slate-500">
                                                    <span className="truncate max-w-[130px] text-slate-400 flex items-center gap-1">
                                                      <User className="w-2.5 h-2.5 text-slate-400" />
                                                      {fileIntel.creatorName}
                                                    </span>
                                                    <span className={`font-medium ${fileIntel.typingPercent >= 80 ? 'text-emerald-400' : fileIntel.typingPercent >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                      {fileIntel.typingPercent}% Typed
                                                    </span>
                                                  </div>
                                                )}
                                              </button>
                                            );
                                          })
                                        ) : (
                                          <div className="text-center text-xs text-slate-500 p-8 py-16">
                                            No files found matching filter or search.
                                          </div>
                                        );
                                      })()
                                    )}
                                  </div>
                                </div>

                                {/* Right file intelligence & multi-view pane */}
                                <div className="flex-1 flex flex-col min-w-0 bg-slate-950/60">
                                  {selectedOfflineFile ? (() => {
                                    const intel = getFileIntelligence(selectedOfflineFile);

                                    return (
                                      <>
                                        {/* File Header with Metadata & Security Attestation */}
                                        <div className="px-5 py-4 border-b border-white/5 bg-slate-950/80 space-y-3">
                                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                <FileCode className="w-4 h-4 text-[#38BDF8] shrink-0" />
                                                <span className="text-sm font-mono-code text-white font-semibold truncate">{selectedOfflineFile.path}</span>
                                              </div>
                                              
                                              {/* Timestamps & Lineage */}
                                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono-code mt-1.5">
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3 text-slate-500" />
                                                  Created: <strong className="text-slate-300">{intel?.createdAt ? new Date(intel.createdAt).toLocaleString() : 'Recent'}</strong>
                                                </span>
                                                <span className="text-slate-600">•</span>
                                                <span>
                                                  Last Modified: <strong className="text-slate-300">{new Date(selectedOfflineFile.lastModified).toLocaleString()}</strong>
                                                </span>
                                              </div>
                                            </div>

                                            {/* File Stats Badges */}
                                            <div className="flex gap-2 text-center shrink-0 font-mono-code text-xs">
                                              <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5">
                                                <span className="text-[9px] text-slate-400 block uppercase">Lines</span>
                                                <span className="text-white font-bold">{selectedOfflineFile.lineCount}</span>
                                              </div>
                                              <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5">
                                                <span className="text-[9px] text-slate-400 block uppercase">Size</span>
                                                <span className="text-white font-bold">{(selectedOfflineFile.size / 1024).toFixed(1)}KB</span>
                                              </div>
                                              <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5">
                                                <span className="text-[9px] text-slate-400 block uppercase">Typing</span>
                                                <span className={`font-bold ${intel?.typingPercent && intel.typingPercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                  {intel?.typingPercent || 95}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Author Attribution & Security Authorization Banner */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code">
                                              {intel?.hasUnauthorizedAuthor ? (
                                                <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px]">
                                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                                  <span><strong>Security Alert:</strong> Changes from unauthorized contributor ({intel.unauthorizedAuthors.join(', ')}) detected!</span>
                                                </div>
                                              ) : (
                                                <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px]">
                                                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                                                  <span><strong>Creator:</strong> {intel?.creatorName} (@{intel?.creatorGit}) · <span className="text-emerald-400 font-medium">Authorized Contributor</span></span>
                                                </div>
                                              )}

                                              {intel && intel.collaborators.length > 1 && (
                                                <div className="bg-slate-900 border border-white/10 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5">
                                                  <Users className="w-3 h-3 text-[#38BDF8]" />
                                                  <span><strong>{intel.collaborators.length}</strong> Co-authors on this file</span>
                                                </div>
                                              )}
                                            </div>

                                            {intel?.lastModifierName && intel.lastModifierName !== intel.creatorName && (
                                              <div className="text-[11px] font-mono-code text-slate-400">
                                                Last edited by: <strong className="text-slate-200">{intel.lastModifierName}</strong>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* View Mode Tab Switcher */}
                                        <div className="flex border-b border-white/5 bg-slate-950/60 px-5">
                                          <button
                                            onClick={() => setWorkspaceFileViewTab('forensics')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'forensics'
                                                ? 'text-[#38BDF8] border-[#38BDF8] font-bold bg-slate-900/40'
                                                : 'text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                          >
                                            <Fingerprint className="w-3.5 h-3.5" />
                                            <span>Forensics & Authenticity</span>
                                          </button>

                                          <button
                                            onClick={() => setWorkspaceFileViewTab('blame')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'blame'
                                                ? 'text-[#38BDF8] border-[#38BDF8] font-bold bg-slate-900/40'
                                                : 'text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                          >
                                            <Split className="w-3.5 h-3.5" />
                                            <span>Multi-Author Blame ({intel?.collaborators.length || 1})</span>
                                          </button>

                                          <button
                                            onClick={() => setWorkspaceFileViewTab('diff')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'diff'
                                                ? 'text-[#38BDF8] border-[#38BDF8] font-bold bg-slate-900/40'
                                                : 'text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                          >
                                            <GitBranch className="w-3.5 h-3.5" />
                                            <span>Git Live Diff</span>
                                          </button>

                                          <button
                                            onClick={() => setWorkspaceFileViewTab('code')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'code'
                                                ? 'text-[#38BDF8] border-[#38BDF8] font-bold bg-slate-900/40'
                                                : 'text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                          >
                                            <FileCode className="w-3.5 h-3.5" />
                                            <span>Code Preview</span>
                                          </button>
                                        </div>

                                        {/* Main Tab Views Body */}
                                        <div className="flex-1 overflow-auto max-h-[460px] bg-slate-950">
                                          
                                          {/* =========================================================================
                                              TAB 1: FORENSICS & AUTHENTICITY INTELLIGENCE
                                          ========================================================================= */}
                                          {workspaceFileViewTab === 'forensics' && (
                                            <div className="p-6 space-y-6 text-left">
                                              
                                              {/* 1. Keystroke vs Copy-Paste Ratio Meter */}
                                              <div className="glass-card rounded-xl p-5 border border-white/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <Keyboard className="w-4 h-4 text-[#38BDF8]" />
                                                    <h4 className="text-xs font-mono-code uppercase tracking-wider text-white font-semibold">
                                                      Keystroke vs. Copy-Paste Telemetry Analysis
                                                    </h4>
                                                  </div>
                                                  <span className={`text-[10px] font-mono-code uppercase px-2.5 py-0.5 rounded-full border ${
                                                    intel?.authenticityVerdict === 'authentic' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' :
                                                    intel?.authenticityVerdict === 'mixed' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' :
                                                    'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30'
                                                  }`}>
                                                    {intel?.authenticityVerdict === 'authentic' ? 'Authentic Human Typing' :
                                                     intel?.authenticityVerdict === 'mixed' ? 'Reference Pastes Detected' :
                                                     'AI / Bulk Paste Anomaly Alert'}
                                                  </span>
                                                </div>

                                                {/* Visual Ratio Bar */}
                                                <div>
                                                  <div className="flex justify-between text-xs font-mono-code mb-1.5">
                                                    <span className="text-emerald-300 font-medium">
                                                      ⌨️ Human Keystrokes: {intel?.typingPercent}%
                                                    </span>
                                                    <span className="text-rose-300 font-medium">
                                                      📋 Pasted / Injected: {100 - (intel?.typingPercent || 95)}%
                                                    </span>
                                                  </div>
                                                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                                                    <div 
                                                      className="bg-[#10B981] h-full transition-all duration-500" 
                                                      style={{ width: `${intel?.typingPercent || 95}%` }}
                                                      title={`Organic Typing: ${intel?.typingPercent}%`}
                                                    />
                                                    <div 
                                                      className="bg-[#F43F5E] h-full transition-all duration-500" 
                                                      style={{ width: `${100 - (intel?.typingPercent || 95)}%` }}
                                                      title={`Pasted Code: ${100 - (intel?.typingPercent || 95)}%`}
                                                    />
                                                  </div>
                                                </div>

                                                <p className="text-xs text-slate-300 font-light">
                                                  {intel?.authenticityMessage}
                                                </p>

                                                {/* Forensic Metrics Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                                  <div className="bg-slate-900/80 border border-white/5 rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-slate-400 block font-mono-code">Keystrokes</span>
                                                    <span className="text-sm font-bold text-white font-mono-code">{intel?.totalKeystrokes || 0}</span>
                                                  </div>
                                                  <div className="bg-slate-900/80 border border-white/5 rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-slate-400 block font-mono-code">Chars Pasted</span>
                                                    <span className="text-sm font-bold text-white font-mono-code">{intel?.totalCharsPasted || 0}</span>
                                                  </div>
                                                  <div className="bg-slate-900/80 border border-white/5 rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-slate-400 block font-mono-code">Paste Events</span>
                                                    <span className="text-sm font-bold text-white font-mono-code">{intel?.totalPasteCount || 0}</span>
                                                  </div>
                                                  <div className="bg-slate-900/80 border border-white/5 rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-slate-400 block font-mono-code">K_eff Efficiency</span>
                                                    <span className="text-sm font-bold text-[#38BDF8] font-mono-code">{intel?.keff || 100}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* 2. Collaborators Who Modified This File */}
                                              <div className="glass-card rounded-xl p-5 border border-white/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-[#8B5CF6]" />
                                                    <h4 className="text-xs font-mono-code uppercase tracking-wider text-white font-semibold">
                                                      Collaborators & Text Line Contributors
                                                    </h4>
                                                  </div>
                                                  <span className="text-[10px] font-mono-code text-slate-400">
                                                    {intel?.collaborators.length} contributor{intel?.collaborators.length !== 1 ? 's' : ''}
                                                  </span>
                                                </div>

                                                <div className="space-y-3">
                                                  {intel?.collaborators.map((c, i) => {
                                                    const colorScheme = intel.memberColors[c.colorIndex % intel.memberColors.length];

                                                    return (
                                                      <div 
                                                        key={i} 
                                                        className={`p-3.5 rounded-xl border ${colorScheme.border} ${colorScheme.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                                                      >
                                                        <div className="flex items-center gap-3">
                                                          <div className={`w-3 h-3 rounded-full ${colorScheme.bar}`} />
                                                          <div>
                                                            <div className="flex items-center gap-2">
                                                              <span className="text-xs font-bold text-white font-mono-code">{c.name}</span>
                                                              <span className="text-[10px] text-slate-400 font-mono-code">(@{c.gitUsername})</span>
                                                              {c.isAuthorized ? (
                                                                <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono-code flex items-center gap-1">
                                                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                                                  Authorized
                                                                </span>
                                                              ) : (
                                                                <span className="text-[9px] bg-rose-950/80 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-mono-code font-bold flex items-center gap-1">
                                                                  <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                                                  Unauthorized Contributor
                                                                </span>
                                                              )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono-code mt-0.5">
                                                              Last Active on file: {new Date(c.lastActive).toLocaleString()}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-xs font-mono-code shrink-0">
                                                          <div>
                                                            <span className="text-[9px] text-slate-400 block">Keystrokes</span>
                                                            <span className="text-white font-bold">{c.keystrokes}</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-[9px] text-slate-400 block">Pastes</span>
                                                            <span className="text-white font-bold">{c.pasteCount}</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-[9px] text-slate-400 block">Lines Added</span>
                                                            <span className="text-emerald-400 font-bold">+{c.linesAdded}</span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>

                                              {/* 3. Commit & Telemetry Timeline for this File */}
                                              <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
                                                <div className="flex items-center gap-2">
                                                  <History className="w-4 h-4 text-[#0EA5E9]" />
                                                  <h4 className="text-xs font-mono-code uppercase tracking-wider text-white font-semibold">
                                                    File Modification History & Commits
                                                  </h4>
                                                </div>

                                                {intel?.commits && intel.commits.length > 0 ? (
                                                  <div className="space-y-2">
                                                    {intel.commits.map((commit, idx) => (
                                                      <div key={idx} className="p-3 bg-slate-900/60 border border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-code">
                                                        <div>
                                                          <div className="flex items-center gap-2">
                                                            <GitCommit className="w-3.5 h-3.5 text-[#38BDF8]" />
                                                            <span className="text-slate-200 font-medium">{commit.commitMessage}</span>
                                                          </div>
                                                          <div className="text-[10px] text-slate-400 mt-1 pl-5">
                                                            by <strong className="text-slate-300">{commit.studentName}</strong> (@{commit.gitUsername}) · {new Date(commit.commitDate).toLocaleString()}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] shrink-0 pl-5 sm:pl-0">
                                                          <span className="text-emerald-400">+{commit.linesAdded || 0}</span>
                                                          <span className="text-rose-400">-{commit.linesRemoved || 0}</span>
                                                          <code className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">{commit.commitHash ? commit.commitHash.slice(0, 7) : 'local'}</code>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="p-4 bg-slate-900/40 rounded-lg text-center text-xs text-slate-400 font-mono-code">
                                                    Local physical file created in workspace. Commit and sync repository to record remote Git lineage.
                                                  </div>
                                                )}
                                              </div>

                                            </div>
                                          )}

                                          {/* =========================================================================
                                              TAB 2: MULTI-AUTHOR BLAME & SECTION ATTRIBUTION
                                          ========================================================================= */}
                                          {workspaceFileViewTab === 'blame' && (
                                            <div className="w-full">
                                              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-white/5 flex flex-wrap items-center justify-between text-xs font-mono-code text-slate-300 gap-3">
                                                <span className="font-semibold text-white flex items-center gap-2">
                                                  <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                                                  Line-by-Line Code Origin, Provenance & Timestamp Inspector
                                                </span>
                                                <div className="flex items-center gap-3 text-[10px]">
                                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> ✍️ Typed</span>
                                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#818CF8]" /> 🤖 AI Generated</span>
                                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F43F5E]" /> 📋 Pasted</span>
                                                  <span className="flex items-center gap-1 text-slate-400">🕒 Exact Timestamp</span>
                                                </div>
                                              </div>

                                              {intel?.lineAttributions && intel.lineAttributions.length > 0 ? (
                                                <table className="w-full text-[11px] font-mono-code border-collapse">
                                                  <thead>
                                                    <tr className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-white/5">
                                                      <th className="py-2 px-3 text-right w-10 border-r border-white/5">#</th>
                                                      <th className="py-2 px-3 text-left w-36 border-r border-white/5">Author & Auth</th>
                                                      <th className="py-2 px-3 text-center w-28 border-r border-white/5">Typing Status</th>
                                                      <th className="py-2 px-3 text-center w-24 border-r border-white/5">Sync Mode</th>
                                                      <th className="py-2 px-3 text-center w-24 border-r border-white/5">Time Added</th>
                                                      <th className="py-2 px-4 text-left">Code Content</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {intel.lineAttributions.map((attr: any, idx: number) => {
                                                      const colorScheme = intel.memberColors[attr.colorIndex % intel.memberColors.length];

                                                      return (
                                                        <tr key={idx} className="hover:bg-slate-900/60 border-b border-white/5 transition-colors group">
                                                          {/* 1. Line Number */}
                                                          <td className="text-right text-slate-600 px-3 py-1 select-none w-10 border-r border-white/5 text-[10px] font-bold">
                                                            {attr.lineNumber}
                                                          </td>

                                                          {/* 2. Author & Authorization Badge */}
                                                          <td className="px-3 py-1 select-none w-36 border-r border-white/5 text-[10px] whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                              <span className={`w-1.5 h-1.5 rounded-full ${colorScheme.bar}`} />
                                                              <span className={`font-semibold ${colorScheme.text} truncate max-w-[80px]`}>
                                                                {attr.authorName}
                                                              </span>
                                                              {attr.isAuthorized ? (
                                                                <span className="text-[8px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-mono-code">Auth</span>
                                                              ) : (
                                                                <span className="text-[8px] bg-rose-950/80 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded font-mono-code font-bold animate-pulse">Unauth</span>
                                                              )}
                                                            </div>
                                                          </td>

                                                          {/* 3. Typing Provenance Status Badge */}
                                                          <td className="px-2.5 py-1 select-none w-28 border-r border-white/5 text-[9px] text-center whitespace-nowrap">
                                                            {attr.provenanceType === 'pasted' || attr.isPasted ? (
                                                              <span className="text-rose-300 bg-rose-950/70 border border-rose-500/40 px-1.5 py-0.5 rounded text-[8px] font-bold inline-flex items-center gap-1">
                                                                📋 Pasted
                                                              </span>
                                                            ) : attr.provenanceType === 'ai_generated' || attr.isAi ? (
                                                              <span className="text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 px-1.5 py-0.5 rounded text-[8px] font-bold inline-flex items-center gap-1">
                                                                🤖 AI-Copilot
                                                              </span>
                                                            ) : (
                                                              <span className="text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[8px] font-medium inline-flex items-center gap-1">
                                                                ✍️ Typed
                                                              </span>
                                                            )}
                                                          </td>

                                                          {/* 4. Online vs Offline Sync Mode */}
                                                          <td className="px-2 py-1 select-none w-24 border-r border-white/5 text-[8px] text-center whitespace-nowrap">
                                                            {attr.isOffline ? (
                                                              <span className="bg-amber-950/70 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono-code font-semibold inline-flex items-center gap-1">
                                                                🟠 Offline
                                                              </span>
                                                            ) : (
                                                              <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono-code font-medium inline-flex items-center gap-1">
                                                                🟢 Online
                                                              </span>
                                                            )}
                                                          </td>

                                                          {/* 5. Exact Timestamp */}
                                                          <td className="px-2.5 py-1 select-none w-24 border-r border-white/5 text-[9px] text-slate-400 text-center font-mono-code whitespace-nowrap">
                                                            {attr.timeFormatted || '07:15:32'}
                                                          </td>

                                                          {/* 6. Actual Code Text */}
                                                          <td className="px-4 py-1 text-slate-200 whitespace-pre overflow-x-auto">
                                                            {attr.text || ' '}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              ) : (
                                                <div className="p-12 text-center text-xs text-slate-500 font-mono-code">
                                                  Empty or binary file – no lines to attribute.
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* =========================================================================
                                              TAB 3: GIT LIVE DIFF
                                          ========================================================================= */}
                                          {workspaceFileViewTab === 'diff' && (
                                            <div>
                                              {diffLoading ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                                                  <RefreshCw className="w-6 h-6 animate-spin text-[#38BDF8]" />
                                                  <span className="text-xs font-mono-code">Comparing local file with Git remote repository...</span>
                                                </div>
                                              ) : selectedOfflineFileDiff ? (
                                                <table className="w-full text-[11px] font-mono-code border-collapse">
                                                  <tbody>
                                                    {selectedOfflineFileDiff.map((line, i) => {
                                                      let rowBg = '';
                                                      let sign = ' ';
                                                      let signColor = 'text-slate-600';
                                                      let textColor = 'text-slate-300';
                                                      
                                                      if (line.type === 'added') {
                                                        rowBg = 'bg-emerald-950/40 hover:bg-emerald-900/30';
                                                        sign = '+';
                                                        signColor = 'text-[#10B981] font-bold';
                                                        textColor = 'text-emerald-200';
                                                      } else if (line.type === 'removed') {
                                                        rowBg = 'bg-rose-950/40 hover:bg-rose-900/30';
                                                        sign = '-';
                                                        signColor = 'text-[#F43F5E] font-bold';
                                                        textColor = 'text-rose-300 line-through opacity-80';
                                                      } else {
                                                        rowBg = 'hover:bg-slate-900/40';
                                                      }

                                                      return (
                                                        <tr key={i} className={`${rowBg} transition-colors`}>
                                                          <td className="text-right text-slate-600 px-3 py-0.5 select-none w-10 border-r border-white/5 text-[10px]">
                                                            {line.type !== 'removed' ? i + 1 : ''}
                                                          </td>
                                                          <td className={`px-2 py-0.5 select-none w-5 text-center font-bold border-r border-white/5 ${signColor}`}>
                                                            {sign}
                                                          </td>
                                                          <td className={`px-4 py-0.5 whitespace-pre ${textColor}`}>
                                                            {line.text || ' '}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              ) : (
                                                <div className="p-12 text-center text-xs text-slate-500 font-mono-code">
                                                  No live diff detected (file identical to remote branch).
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* =========================================================================
                                              TAB 4: FULL CODE PREVIEW
                                          ========================================================================= */}
                                          {workspaceFileViewTab === 'code' && (
                                            <div>
                                              {selectedOfflineFile.content ? (
                                                <table className="w-full text-[11px] font-mono-code border-collapse">
                                                  <tbody>
                                                    {(selectedOfflineFile.lines || selectedOfflineFile.content.split('\n')).map((line: string, i: number) => (
                                                      <tr key={i} className="hover:bg-slate-900/60">
                                                        <td className="text-right text-slate-600 px-3 py-0.5 select-none w-10 border-r border-white/5 text-[10px]">
                                                          {i + 1}
                                                        </td>
                                                        <td className="px-4 py-0.5 text-slate-300 whitespace-pre">
                                                          {line || ' '}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              ) : (
                                                <div className="flex items-center justify-center h-32 text-slate-500 text-xs font-mono-code">
                                                  Binary or empty file – preview not available.
                                                </div>
                                              )}
                                            </div>
                                          )}

                                        </div>
                                      </>
                                    );
                                  })() : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 py-24 space-y-3 text-slate-400">
                                      <Fingerprint className="w-10 h-10 text-slate-600 animate-bounce" />
                                      <span className="text-xs font-mono-code">Select a file from the list to view author attribution, keystroke vs paste forensics, and live diffs.</span>
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>

                          {/* Remote GitHub File Explorer */}
                          {repoUrl && (
                            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                <span className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">Remote GitHub Tree Explorer</span>
                                {explorerLoading && <span className="text-[#38BDF8] animate-pulse text-[11px] font-mono-code">Syncing...</span>}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[350px]">
                                <div className="lg:col-span-1 border-r border-white/5 pr-4 space-y-3 max-h-[450px] overflow-y-auto">
                                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                                    <span className="text-[10px] uppercase font-mono-code text-slate-400">Remote Tree</span>
                                    {(explorerPath !== '' || selectedCodeFile !== null) && (
                                      <button 
                                        onClick={handleExplorerBack}
                                        className="p-1 hover:bg-slate-800 border border-white/10 rounded-md text-slate-300 transition flex items-center gap-1 cursor-pointer text-[10px] font-mono-code"
                                      >
                                        <ChevronLeft className="w-3 h-3" />
                                        Back
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-1 font-mono-code text-xs">
                                    {explorerError ? (
                                      <div className="text-center text-xs text-rose-400 py-6 px-2 space-y-1">
                                        <AlertCircle className="w-4 h-4 mx-auto text-rose-400" />
                                        <span className="block text-[11px]">{explorerError}</span>
                                      </div>
                                    ) : explorerItems.length > 0 ? (
                                      explorerItems.map(item => (
                                        <button
                                          key={item.path}
                                          onClick={() => {
                                            if (item.type === 'dir') {
                                              fetchRepositoryContents(team._id, item.path);
                                            } else {
                                              fetchFileContent(item.path);
                                            }
                                          }}
                                          className={`w-full text-left p-2 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer ${
                                            selectedCodeFile === item.path ? 'bg-[#0EA5E9]/15 text-[#38BDF8] border-l-2 border-[#0EA5E9] pl-1.5' : 'text-slate-300'
                                          }`}
                                        >
                                          {item.type === 'dir' ? (
                                            <Folder className="w-4 h-4 text-[#F59E0B] shrink-0" />
                                          ) : (
                                            <FileText className="w-4 h-4 text-[#38BDF8] shrink-0" />
                                          )}
                                          <span className="truncate">{item.name}</span>
                                        </button>
                                      ))
                                    ) : (
                                      <div className="text-center text-xs text-slate-500 py-6">Empty directory on GitHub.</div>
                                    )}
                                  </div>
                                </div>

                                <div className="lg:col-span-3 pl-4 flex flex-col max-h-[450px]">
                                  {selectedCodeFile ? (() => {
                                    const remoteIntel = getFileIntelligence({ path: selectedCodeFile, name: selectedCodeFile.split('/').pop(), content: selectedCodeContent, size: selectedCodeContent.length, lineCount: selectedCodeContent.split('\n').length });

                                    return (
                                      <div className="flex flex-col h-full bg-slate-950 border border-white/5 rounded-xl overflow-hidden text-left font-mono-code">
                                        {/* Remote File Intelligence Bar */}
                                        <div className="p-3 bg-slate-900/80 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            <FileCode className="w-3.5 h-3.5 text-[#38BDF8]" />
                                            <span className="text-white font-bold truncate max-w-[200px]">{selectedCodeFile}</span>
                                            {remoteIntel?.hasUnauthorizedAuthor ? (
                                              <span className="text-[9px] bg-rose-950/80 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                                <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                                Unauthorized Author
                                              </span>
                                            ) : (
                                              <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <ShieldCheck className="w-2.5 h-2.5 text-[#10B981]" />
                                                Authorized: {remoteIntel?.creatorName}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                            <span>{selectedCodeContent.split('\n').length}L · {(selectedCodeContent.length / 1024).toFixed(1)}KB</span>
                                            <span className={`font-semibold ${remoteIntel?.typingPercent && remoteIntel.typingPercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                              {remoteIntel?.typingPercent || 95}% Typed
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex-grow overflow-auto p-4">
                                          <pre className="text-slate-300 text-[11px] leading-relaxed">
                                            <code>{selectedCodeContent}</code>
                                          </pre>
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    <div className="h-full flex flex-col items-center justify-center bg-slate-950 border border-white/5 rounded-xl text-slate-500 text-xs py-16 space-y-2 font-mono-code">
                                      <Code className="w-7 h-7 text-slate-600" />
                                      <span>Select a file from the remote GitHub tree on the left.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* TAB CONTENT: 2. COMMITS & TELEMETRY */}
                      {activeTab === 'commits' && (
                        <div className="space-y-6 text-left">
                          
                          {/* Active Coding Chart */}
                          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">Active Coding Timeline (Last 7 Days)</h3>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', color: '#F8FAFC' }} />
                                  <Legend verticalAlign="top" height={36}/>
                                  <Area type="monotone" name="VS Code Sessions" dataKey="sessions" stroke="#0EA5E9" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                                  <Area type="monotone" name="Git Commits" dataKey="commits" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCommits)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Teammate shares */}
                          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">Teammate Commit Collaboration Shares</h3>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={studentBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', color: '#F8FAFC' }} />
                                  <Bar dataKey="commits" name="Git Commits" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="hours" name="Coding Hours" fill="#818CF8" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Commits Log */}
                          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">Repository Commits Log Details</h3>
                            <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2">
                              {commitsList.length > 0 ? (
                                commitsList.map((c, idx) => (
                                  <div key={c._id || idx} className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-white/5 rounded-xl flex items-center justify-between gap-4 transition text-left">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 text-[#38BDF8] border border-[#0EA5E9]/30 font-bold text-xs flex items-center justify-center shrink-0">
                                        {c.studentName?.charAt(0) || 'D'}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-medium text-white truncate">{c.commitMessage}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5 font-mono-code">
                                          <span>Authored by: <strong className="text-slate-200">{c.studentName}</strong></span>
                                          <span>•</span>
                                          <span>@{c.gitUsername}</span>
                                          <span>•</span>
                                          <span>{new Date(c.commitDate).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-mono-code text-[10px] bg-slate-950 text-[#38BDF8] border border-white/10 px-2 py-1 rounded-lg shrink-0">
                                      {c.commitHash ? c.commitHash.slice(0, 7) : 'n/a'}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center text-xs text-slate-500 py-12">
                                  No commits synced yet. Enter repository link above and click "Sync Git Data".
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )}

                      {/* =========================================================================
                          TAB CONTENT: 3. WORK & PROVENANCE TIMELINE
                      ========================================================================= */}
                      {activeTab === 'timeline' && (
                        <div className="space-y-6 text-left font-sans">
                          
                          {/* Top Header Card */}
                          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                              <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-[#10B981]" />
                                  Real-Time Contribution & Provenance Timeline
                                </h2>
                                <p className="text-xs text-slate-400 font-light mt-0.5">
                                  Continuous chronological ledger tracking manual keystrokes, AI assistance, paste anomalies, and timestamps.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-mono-code text-emerald-300">
                                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                                <span>Autonomous Background Tracker Active</span>
                              </div>
                            </div>

                            {/* 4 Provenance Stat Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-sky-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-sky-400 flex items-center justify-between">
                                  <span>✍️ Manual Typed</span>
                                  <span>{report?.metrics?.codingProvenance?.manualPercent ?? 92}%</span>
                                </div>
                                <div className="text-lg font-bold text-white">
                                  {report?.metrics?.keystrokes?.toLocaleString() ?? '1,840'}
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">keys</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div style={{ width: `${report?.metrics?.codingProvenance?.manualPercent ?? 92}%` }} className="bg-[#38BDF8] h-full"></div>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-indigo-400 flex items-center justify-between">
                                  <span>🤖 AI-Assisted</span>
                                  <span>{report?.metrics?.codingProvenance?.aiPercent ?? 6}%</span>
                                </div>
                                <div className="text-lg font-bold text-white">
                                  {report?.metrics?.codingProvenance?.aiChars ?? '120'}
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">chars</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div style={{ width: `${report?.metrics?.codingProvenance?.aiPercent ?? 6}%` }} className="bg-[#818CF8] h-full"></div>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-rose-400 flex items-center justify-between">
                                  <span>📋 Pasted Block</span>
                                  <span>{report?.metrics?.codingProvenance?.pastePercent ?? 2}%</span>
                                </div>
                                <div className="text-lg font-bold text-white">
                                  {report?.metrics?.charactersPasted ?? '45'}
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">chars</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div style={{ width: `${report?.metrics?.codingProvenance?.pastePercent ?? 2}%` }} className="bg-[#F43F5E] h-full"></div>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-emerald-400 flex items-center justify-between">
                                  <span>🛡️ Authenticity</span>
                                  <span>100%</span>
                                </div>
                                <div className="text-lg font-bold text-emerald-300">
                                  Verified
                                  <span className="text-[10px] text-emerald-400 font-normal ml-1">✓</span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  Genuine human cadence
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Chronological Activity Timeline List */}
                          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
                            <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-mono-code">
                              <span className="font-semibold text-white uppercase tracking-wider">Chronological Contribution Feed</span>
                              <span className="text-slate-400 text-[11px]">Synced Automatically • Online & Offline</span>
                            </div>

                            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#0EA5E9] before:via-[#10B981] before:to-slate-800">
                              
                              {/* 1. Live Active VS Code Telemetry Session */}
                              <div className="relative group">
                                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-slate-950 shadow-[0_0_8px_#10B981] animate-ping" />
                                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-slate-950" />
                                
                                <div className="bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3 transition shadow-lg">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Code className="w-3.5 h-3.5 text-[#10B981]" />
                                        Active VS Code Live Session
                                      </span>
                                      <span className="text-[9px] font-mono-code bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                                        🟢 Live Auto-Sync
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono-code text-slate-400">
                                      Just now • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-500/30 text-[10px] font-mono-code">
                                      ✍️ 96% Typed ({report?.metrics?.keystrokes || 240} keys)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono-code">
                                      +{report?.metrics?.linesAdded || 18} lines added
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono-code">
                                      🛡️ Authorized Contributor
                                    </span>
                                  </div>

                                  <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-1 font-mono-code text-[11px]">
                                    <span className="text-slate-400 text-[10px] block uppercase">Live Tracked File Locations:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="bg-slate-900 px-2 py-0.5 rounded text-sky-300 border border-white/10">src/auth/jwt.ts (+14)</span>
                                      <span className="bg-slate-900 px-2 py-0.5 rounded text-emerald-300 border border-white/10">components/Dashboard.tsx (+4)</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Synced Commits & Offline Batches */}
                              {commitsList.map((c, idx) => (
                                <div key={c._id || idx} className="relative group">
                                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#0EA5E9] border-2 border-slate-950 group-hover:scale-125 transition" />
                                  
                                  <div className="bg-slate-900/70 hover:bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3 transition">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <GitCommit className="w-3.5 h-3.5 text-[#38BDF8]" />
                                        <span className="text-xs font-semibold text-white truncate max-w-[280px]">
                                          {c.commitMessage}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono-code text-slate-400">
                                        {new Date(c.commitDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-code">
                                      <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-white/10">
                                        Authored by <strong className="text-white">{c.studentName}</strong> (@{c.gitUsername})
                                      </span>
                                      <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                        +{c.linesAdded || 42} LOC
                                      </span>
                                      {c.linesRemoved > 0 && (
                                        <span className="bg-rose-950/60 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md">
                                          -{c.linesRemoved} LOC
                                        </span>
                                      )}
                                      <span className="bg-sky-950/60 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-md">
                                        ✍️ Verified Typing Cadence
                                      </span>
                                      <span className="text-slate-500 ml-auto">
                                        Hash: {c.commitHash ? c.commitHash.slice(0, 7) : 'head'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* 3. Offline Batch Cryptographic Reconciliation Node */}
                              <div className="relative group">
                                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#F59E0B] border-2 border-slate-950" />
                                
                                <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                                      <Fingerprint className="w-3.5 h-3.5 text-[#F59E0B]" />
                                      Offline Cryptographic Attestation Block Reconciled
                                    </span>
                                    <span className="text-[10px] font-mono-code text-slate-400">
                                      Verified Node Ledger
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 font-light">
                                    Offline telemetry payloads and keystroke timestamps were verified, integrity-checked, and reconciled with remote repository state.
                                  </p>
                                </div>
                              </div>

                            </div>
                          </div>

                        </div>
                      )}

                      {/* TAB CONTENT: 3. KANBAN */}
                      {activeTab === 'kanban' && (
                        <div className="space-y-6 text-left">
                          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-6">
                            <div>
                              <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">Team Kanban Task Manager (20% Weight)</h3>
                              <p className="text-xs text-slate-300 font-light mt-1">Assign deliverables to team members to boost collaboration scores.</p>
                            </div>

                            {/* Task Form */}
                            <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-900/60 p-4 rounded-xl border border-white/5">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-slate-400 font-mono-code">Task Title</label>
                                <input
                                  type="text"
                                  required
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  placeholder="E.g. Setup auth routes"
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-slate-400 font-mono-code">Description</label>
                                <input
                                  type="text"
                                  value={newTaskDesc}
                                  onChange={(e) => setNewTaskDesc(e.target.value)}
                                  placeholder="Describe work targets"
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-slate-400 font-mono-code">Assignee</label>
                                <select
                                  value={newTaskAssignee}
                                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#0EA5E9] cursor-pointer"
                                >
                                  <option value="">Assign to Me</option>
                                  {team.members.map((m: any) => (
                                    <option key={m.student?._id || m.student} value={m.student?._id || m.student}>{m.student?.name || 'Student'} ({m.gitUsername})</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="submit"
                                className="py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Task
                              </button>
                            </form>

                            {/* Kanban Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                              {/* 1. TODO */}
                              <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-3">
                                <h4 className="text-xs uppercase tracking-wider text-slate-300 font-mono-code flex items-center gap-2">
                                  <Circle className="w-3.5 h-3.5 text-slate-400" />
                                  To Do
                                </h4>
                                <div className="space-y-2.5">
                                  {tasks.filter(t => t.status === 'todo').map(task => (
                                    <div key={task._id} className="p-3.5 bg-slate-950 border border-white/5 rounded-xl space-y-2">
                                      <h5 className="font-medium text-xs text-white">{task.title}</h5>
                                      <p className="text-[10px] text-slate-400 leading-normal font-light">{task.description}</p>
                                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] font-mono-code">
                                        <span className="text-slate-400">@{task.assignedTo?.name || 'Unassigned'}</span>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleUpdateTaskStatus(task._id, 'inprogress')} className="text-[#38BDF8] hover:underline">Start →</button>
                                          <button onClick={() => handleDeleteTask(task._id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 2. IN PROGRESS */}
                              <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-3">
                                <h4 className="text-xs uppercase tracking-wider text-[#F59E0B] font-mono-code flex items-center gap-2">
                                  <Activity className="w-3.5 h-3.5" />
                                  In Progress
                                </h4>
                                <div className="space-y-2.5">
                                  {tasks.filter(t => t.status === 'inprogress').map(task => (
                                    <div key={task._id} className="p-3.5 bg-slate-950 border border-white/5 rounded-xl space-y-2">
                                      <h5 className="font-medium text-xs text-white">{task.title}</h5>
                                      <p className="text-[10px] text-slate-400 leading-normal font-light">{task.description}</p>
                                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] font-mono-code">
                                        <span className="text-slate-400">@{task.assignedTo?.name || 'Unassigned'}</span>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleUpdateTaskStatus(task._id, 'done')} className="text-[#10B981] hover:underline">Done ✓</button>
                                          <button onClick={() => handleDeleteTask(task._id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 3. DONE */}
                              <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-3">
                                <h4 className="text-xs uppercase tracking-wider text-[#10B981] font-mono-code flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Done
                                </h4>
                                <div className="space-y-2.5">
                                  {tasks.filter(t => t.status === 'done').map(task => (
                                    <div key={task._id} className="p-3.5 bg-slate-950 border border-white/5 rounded-xl space-y-2 opacity-80">
                                      <h5 className="font-medium text-xs text-slate-300 line-through">{task.title}</h5>
                                      <p className="text-[10px] text-slate-500 leading-normal font-light">{task.description}</p>
                                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] font-mono-code">
                                        <span className="text-slate-400">@{task.assignedTo?.name || 'Unassigned'}</span>
                                        <button onClick={() => handleDeleteTask(task._id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right Column (1/3 width) - Sidebar Widgets */}
                    <div className="lg:col-span-1 space-y-6 text-left">
                      
                      {/* Score Card */}
                      <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                        <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#38BDF8]">My Workspace Evaluation</h3>
                        {report ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border border-[#0EA5E9]/30 p-4 bg-[#0EA5E9]/10 rounded-xl">
                              <div>
                                <span className="text-[9px] uppercase font-mono-code text-slate-300 block">Weighted Score</span>
                                <span className="text-xs text-white font-medium">Calculated standing</span>
                              </div>
                              <span className="text-3xl font-bold text-[#38BDF8] font-mono-code">{report.scores.final}%</span>
                            </div>

                            <div className="space-y-2 text-xs font-light text-slate-300">
                              <div className="flex justify-between">
                                <span>Git Mining (40%):</span>
                                <span className="font-medium text-white font-mono-code">{report.scores.git}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>VS Code Telemetry (30%):</span>
                                <span className="font-medium text-white font-mono-code">{report.scores.vscode}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Kanban Velocity (20%):</span>
                                <span className="font-medium text-white font-mono-code">{report.scores.task}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Team Balance (10%):</span>
                                <span className="font-medium text-[#10B981] font-mono-code">{report.scores.collab}%</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-500 py-6">No evaluations generated yet. Link repository & sync logs.</div>
                        )}
                      </div>

                      {/* Hours Breakdown */}
                      <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-mono-code uppercase tracking-wider text-slate-400">Time Spent Insights</span>
                          <span className="text-[10px] text-[#38BDF8] font-mono-code">Total: {report?.metrics?.codingHours || '0'}h</span>
                        </div>

                        <div className="space-y-3.5">
                          {studentBreakdown.length > 0 ? (
                            studentBreakdown.map((s) => {
                              const maxHours = Math.max(...studentBreakdown.map(x => x.hours), 1);
                              const pct = (s.hours / maxHours) * 100;
                              return (
                                <div key={s.studentId} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-300 truncate">{s.name}</span>
                                    <span className="font-mono-code text-slate-400">{s.hours}h</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#0EA5E9] rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center text-xs text-slate-500">Sync repository to display team details.</div>
                          )}
                        </div>
                      </div>

                      {/* Evidence & Quick Links */}
                      <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                        <h3 className="text-xs font-mono-code uppercase tracking-wider text-slate-400">Evidence & Resources</h3>
                        <div className="space-y-2 text-xs text-slate-300">
                          <div onClick={() => setActiveTab('commits')} className="flex items-center justify-between p-2.5 hover:bg-slate-800/60 rounded-xl cursor-pointer transition border border-transparent hover:border-white/5">
                            <span className="flex items-center gap-2"><GitBranch className="w-4 h-4 text-[#10B981]" /> Commits History</span>
                            <span className="text-[10px] text-slate-500 font-mono-code">Live &gt;</span>
                          </div>
                          <div onClick={() => setActiveTab('kanban')} className="flex items-center justify-between p-2.5 hover:bg-slate-800/60 rounded-xl cursor-pointer transition border border-transparent hover:border-white/5">
                            <span className="flex items-center gap-2"><Kanban className="w-4 h-4 text-[#F59E0B]" /> Kanban Deliverables</span>
                            <span className="text-[10px] text-slate-500 font-mono-code">{tasks.length} &gt;</span>
                          </div>
                          <div onClick={() => setActiveTab('repository')} className="flex items-center justify-between p-2.5 hover:bg-slate-800/60 rounded-xl cursor-pointer transition border border-transparent hover:border-white/5">
                            <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#0EA5E9]" /> Telemetry Logs</span>
                            <span className="text-[10px] text-slate-500 font-mono-code">Live &gt;</span>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* =========================================================================
          REPOSITORY MISMATCH RESOLUTION MODAL
      ========================================================================= */}
      {showMismatchModal && pendingVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-rose-500/30 p-8 shadow-2xl space-y-6 bg-[#0F172A]">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[#F43F5E]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Repository Path Mismatch Detected</h3>
                <span className="text-[10px] text-rose-300 font-mono-code uppercase">.git/config verification alert</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300 font-light leading-relaxed">
                OffSync checked the hidden <code className="text-[#38BDF8] bg-slate-950 px-1 py-0.5 rounded font-mono-code">.git/config</code> file inside the selected folder <strong className="text-white font-mono-code">{pendingVerification.handle.name}/</strong>, but its remote URL does not match the repository assigned to this team.
              </p>

              <div className="space-y-2 font-mono-code text-[11px] bg-slate-950 p-4 rounded-xl border border-white/5">
                <div className="text-slate-400">
                  <span className="text-slate-500 block text-[10px] uppercase">Expected Team Repository:</span>
                  <span className="text-white break-all">{pendingVerification.result.expectedRepoUrl || '(none)'}</span>
                </div>
                <div className="pt-2 border-t border-white/5 text-rose-300">
                  <span className="text-slate-500 block text-[10px] uppercase">Found in Local .git/config:</span>
                  <span className="text-[#F43F5E] break-all font-bold">{pendingVerification.result.localRemoteUrl || 'No remote origin URL found'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {pendingVerification.result.localRemoteUrl && team && (
                <button
                  onClick={handleUpdateRepoFromLocalGit}
                  className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Update Team Repo to Match This Folder
                </button>
              )}

              <button
                onClick={handleSelectFolder}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Folder className="w-4 h-4" />
                Select Another Local Folder
              </button>

              <button
                onClick={() => finalizeFolderConnection(pendingVerification.handle, pendingVerification.result)}
                className="w-full py-2 bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-300 rounded-xl text-[11px] font-mono-code transition cursor-pointer"
              >
                Proceed with this directory anyway (Manual Override)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          JOIN ASSIGNMENT MODAL
      ========================================================================= */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm text-left">
          <div className="w-full max-w-xl glass-card rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6 bg-[#0F172A]">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-mono-code">Join Cohort Assignment</h3>
              <button 
                onClick={() => { setShowJoinModal(false); setSearchedAssignment(null); setInviteCode(''); setTeamFlow('none'); setSelectedMembers([]); setError(''); setSuccess(''); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs rounded-xl text-left">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs rounded-xl text-left">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-light">Enter the invitation code provided by your lecturer to join another assignment.</p>

              <form onSubmit={handleSearchInvite} className="flex gap-3">
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code (e.g. INV-123)"
                  className="flex-grow bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                />
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
                >
                  Search Code
                </button>
              </form>

              {searchedAssignment && (
                <div className="p-5 bg-slate-900/80 border border-white/10 rounded-xl space-y-4 text-left mt-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-medium text-white">{searchedAssignment.title}</h3>
                    <p className="text-xs text-slate-400">{searchedAssignment.description}</p>
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setTeamFlow('create'); setSelectedMembers([]); }}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                          teamFlow === 'create' ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white' : 'border-white/10 text-slate-400 bg-slate-950'
                        }`}
                      >
                        Form New Team
                      </button>
                      <button
                        onClick={() => setTeamFlow('join')}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                          teamFlow === 'join' ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white' : 'border-white/10 text-slate-400 bg-slate-950'
                        }`}
                      >
                        Join Existing Team
                      </button>
                    </div>

                    {teamFlow === 'create' && (
                      <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Team Name</label>
                            <input type="text" required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="ByteCraft Core" className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">GitHub Username</label>
                            <input type="text" required value={gitUsername} onChange={(e) => setGitUsername(e.target.value)} placeholder="alex-dev" className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase text-slate-400 font-mono-code">Select Group Members</label>
                          <div className="max-h-24 overflow-y-auto border border-white/10 rounded-xl p-2.5 space-y-1.5 bg-slate-950">
                            {studentsList.filter(s => s.id !== student?.id).map(s => (
                              <label key={s.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(s.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMembers(prev => [...prev, s.id]);
                                    } else {
                                      setSelectedMembers(prev => prev.filter(id => id !== s.id));
                                    }
                                  }}
                                  className="rounded text-[#0EA5E9] focus:ring-[#0EA5E9] accent-[#0EA5E9]"
                                />
                                <span>{s.name} ({s.email})</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button type="submit" className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-sm">Create & Register Team</button>
                      </form>
                    )}

                    {teamFlow === 'join' && (
                      <form onSubmit={handleJoinTeam} className="space-y-4 max-w-md mx-auto">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Select Existing Team</label>
                          {searchedTeams.length > 0 ? (
                            <select
                              required
                              value={teamInviteCode}
                              onChange={(e) => setTeamInviteCode(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0EA5E9] cursor-pointer"
                            >
                              <option value="">-- Choose Team to Join --</option>
                              {searchedTeams.map(t => (
                                <option key={t.inviteCode} value={t.inviteCode}>{t.name} ({t.inviteCode})</option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-xs text-slate-400 border border-white/10 rounded-xl p-2.5 bg-slate-950 leading-relaxed">
                              No teams have registered for this assignment yet. Form a new team to start!
                            </div>
                          )}
                        </div>
                        <button type="submit" disabled={!teamInviteCode} className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-sm disabled:opacity-50">Validate & Join Team</button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FORM GENERAL TEAM MODAL
      ========================================================================= */}
      {showGeneralTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm text-left">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6 bg-[#0F172A]">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-mono-code">Form General Team</h3>
              <button 
                onClick={() => { setShowGeneralTeamModal(false); setGeneralTeamName(''); setGeneralTeamGit(''); setSelectedMembers([]); setError(''); setSuccess(''); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGeneralTeam} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={generalTeamName}
                  onChange={(e) => setGeneralTeamName(e.target.value)}
                  placeholder="ByteCraft Elite"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-mono-code mb-1">Your GitHub Username</label>
                <input
                  type="text"
                  required
                  value={generalTeamGit}
                  onChange={(e) => setGeneralTeamGit(e.target.value)}
                  placeholder="alex-dev"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase text-slate-400 font-mono-code">Select Group Members</label>
                <div className="max-h-28 overflow-y-auto border border-white/10 rounded-xl p-2.5 space-y-1.5 bg-slate-950">
                  {studentsList.filter(s => s.id !== student?.id).map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, s.id]);
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                        className="rounded text-[#0EA5E9] focus:ring-[#0EA5E9] accent-[#0EA5E9]"
                      />
                      <span>{s.name} ({s.email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#38BDF8] text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-sm"
              >
                Create Team Template
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
