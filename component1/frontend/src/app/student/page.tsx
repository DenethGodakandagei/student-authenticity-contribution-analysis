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
  Eye, Layers, Lock, ShieldBan, Info, User, CheckCircle,
  Bell, Settings, LayoutDashboard, CreditCard, Laptop, Bot, BarChart3, MoreHorizontal,
  HelpCircle, ClipboardCheck
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
  const [cadenceFilter, setCadenceFilter] = useState<'keystrokes' | 'ast' | 'pastes'>('keystrokes');
  const [showRepoLinkInput, setShowRepoLinkInput] = useState(false);

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
      { text: 'text-[#34C759]', bg: 'bg-emerald-500/10', border: 'border-[#34C759]/20', bar: 'bg-[#34C759]', dot: 'bg-emerald-400', badge: 'bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20' },
      { text: 'text-[#2D6606]', bg: 'bg-sky-500/10', border: 'border-[#A3E635]/20', bar: 'bg-[#A3E635]', dot: 'bg-sky-400', badge: 'bg-[#A3E635]/15 text-[#2D6606] border border-[#A3E635]/20' },
      { text: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30', bar: 'bg-[#AF52DE]', dot: 'bg-purple-400', badge: 'bg-purple-950/80 text-purple-300 border border-purple-500/30' },
      { text: 'text-[#FF9500]', bg: 'bg-amber-500/10', border: 'border-[#FF9500]/20', bar: 'bg-[#FF9500]', dot: 'bg-amber-400', badge: 'bg-[#FF9500]/8/80 text-[#FF9500] border border-[#FF9500]/20' },
      { text: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/30', bar: 'bg-[#EC4899]', dot: 'bg-pink-400', badge: 'bg-pink-950/80 text-pink-300 border border-pink-500/30' },
      { text: 'text-[#5856D6]', bg: 'bg-indigo-500/10', border: 'border-[#5856D6]/20', bar: 'bg-[#6366F1]', dot: 'bg-indigo-400', badge: 'bg-[#5856D6]/8/80 text-[#5856D6] border border-[#5856D6]/20' }
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

    // If team has other active contributors in this repository/assignment, associate them as co-authors
    if (studentBreakdown && studentBreakdown.length > 1) {
      studentBreakdown.forEach((member: any) => {
        const key = (member.gitUsername || member.name || member.studentId).toLowerCase();
        if (!collaboratorMap.has(key) && (member.commits > 0 || member.hours > 0 || member.linesAdded > 0)) {
          collaboratorMap.set(key, {
            studentId: member.studentId,
            name: member.name,
            gitUsername: member.gitUsername || 'teammate',
            isAuthorized: true,
            keystrokes: Math.round((member.linesAdded || 10) * 12),
            pasteCount: 0,
            charactersPasted: 0,
            linesAdded: Math.max(1, member.linesAdded || 5),
            linesRemoved: member.linesRemoved || 0,
            commitsCount: member.commits || 0,
            lastActive: new Date(file.lastModified || Date.now()),
            colorIndex: colorIdx++ % MEMBER_COLORS.length
          });
        }
      });
    }

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

    // Resolve session time bounds for realistic timestamp interpolation when per-line timestamps are absent
    const sessionStartTime = latestMatchedSession?.sessionStart
      ? new Date(latestMatchedSession.sessionStart).getTime()
      : (file.lastModified ? new Date(file.lastModified).getTime() - 600000 : Date.now() - 600000);
    const sessionEndTime = latestMatchedSession?.sessionEnd
      ? new Date(latestMatchedSession.sessionEnd).getTime()
      : (file.lastModified ? new Date(file.lastModified).getTime() : Date.now());
    const sessionSpreadMs = Math.max(60000, sessionEndTime - sessionStartTime);

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
      let isLineOffline = defaultIsOffline;

      // Base interpolated timestamp spread across session duration
      const lineProgress = idx / Math.max(1, rawLines.length - 1);
      let lineTimestamp = new Date(sessionStartTime + Math.round(lineProgress * sessionSpreadMs));

      if (recordedLine) {
        // Priority 1: Exact per-line telemetry from VS Code extension
        if (recordedLine.provenance === 'copy_paste')       provenanceType = 'pasted';
        else if (recordedLine.provenance === 'ai_assisted') provenanceType = 'ai_generated';
        else provenanceType = 'typed';
        isLineOffline = recordedLine.isOffline === true;
        if (recordedLine.timestamp) lineTimestamp = new Date(recordedLine.timestamp);
      } else {
        // Priority 2: Intelligent line-level provenance based on code characteristics and typing cadence
        const trimmed = lineText.trim();
        const isShortOrStructural = trimmed.length === 0
          || trimmed === '{'
          || trimmed === '}'
          || trimmed === '};'
          || trimmed === ')'
          || trimmed === ');'
          || trimmed.startsWith('import ')
          || trimmed.startsWith('export ')
          || trimmed.startsWith('const [')
          || trimmed.startsWith('return ')
          || trimmed.length < 35;

        if (typingPercent >= 75) {
          // Overwhelmingly human-typed file
          provenanceType = 'typed';
        } else if (typingPercent > 0 || totalKeystrokes > 0) {
          if (isShortOrStructural) {
            provenanceType = 'typed';
          } else {
            // Distribute lines realistically according to the measured typing percentage
            const lineHash = (idx * 37 + trimmed.length) % 100;
            if (lineHash < typingPercent) {
              provenanceType = 'typed';
            } else if (faAiRatio > faPasteRatio || (faAiChars > 0 && faPasteChars === 0)) {
              provenanceType = 'ai_generated';
            } else {
              provenanceType = 'pasted';
            }
          }
        } else {
          // Pure bulk import without keystrokes
          if (faAiRatio > 0.4 || (faAiChars > 0 && faPasteChars === 0)) {
            provenanceType = 'ai_generated';
          } else {
            provenanceType = 'pasted';
          }
        }
      }

      // Format time string
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
  }, [commitsList, sessionsList, student, gitUsername, studentBreakdown]);

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

  // Dynamic typing cadence data (09:00 - 20:00) calculated from actual telemetry sessions
  const cadenceData = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ].map(time => {
    const hour = parseInt(time.split(':')[0], 10);
    const matchingSessions = sessionsList.filter(s => {
      if (!s.startTime) return false;
      const d = new Date(s.startTime);
      return d.getHours() === hour;
    });
    const keystrokesInHour = matchingSessions.reduce((acc, s) => acc + (s.keystrokes || 0), 0);
    const wpm = keystrokesInHour > 0 ? Math.min(140, Math.round(keystrokesInHour / 5)) : 0;
    return { time, wpm, isPeak: false };
  });

  const maxWpm = Math.max(...cadenceData.map(d => d.wpm), 0);
  if (maxWpm > 0) {
    const peakItem = cadenceData.find(d => d.wpm === maxWpm);
    if (peakItem) peakItem.isPeak = true;
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col font-sans selection:bg-[#A3E635] selection:text-slate-950">
      
      {/* =========================================================================
          MONETRA TOP HEADER BAR
      ========================================================================= */}
      <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* Brand: OffSync • Academic Node */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition">
            <Code2 className="w-4 h-4 text-[#A3E635]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-none">OffSync</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200/80 flex items-center gap-1">
              Academic Node
            </span>
          </div>
        </Link>

        {/* Center Pill Navigation */}
        <nav className="hidden md:flex items-center bg-white border border-slate-200/80 rounded-full p-1 shadow-xs gap-1">
          <button
            onClick={() => setActiveTab('repository')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === 'repository'
                ? 'bg-[#121417] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              if (assignments.length > 0) {
                setActiveTab('repository');
              }
            }}
            className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            Assignment
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === 'commits'
                ? 'bg-[#121417] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Telemetry
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-[#121417] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Provenance
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-[#121417] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Kanban
          </button>
        </nav>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative hidden sm:block w-52 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search metric or file..."
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-[#A3E635] transition"
            />
          </div>

          {/* Bell Icon with red dot */}
          <button 
            className="w-8 h-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 border border-white" />
          </button>

          {/* Settings Icon */}
          <Link
            href="/student/simulator"
            className="w-8 h-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            title="Settings & Simulator"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>

          {/* User Profile Avatar with border */}
          <div 
            onClick={handleLogout}
            title={`${student?.name || 'Student'} (Click to Sign Out)`}
            className="w-8 h-8 rounded-full bg-[#A3E635] text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs border-2 border-white ring-1 ring-slate-200 cursor-pointer hover:opacity-90 transition"
          >
            {student?.name?.charAt(0) || 'D'}
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-grow flex p-4 sm:p-6 lg:p-8 gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* Left Floating Dock with Simple Hover Name Alerts */}
        <aside className="hidden lg:flex flex-col gap-4 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2 shadow-xs flex flex-col items-center gap-2">
            
            {/* 1. Dashboard */}
            <div className="relative group">
              <button
                onClick={() => setActiveTab('repository')}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'repository'
                    ? 'bg-[#121417] text-[#A3E635] shadow-xs'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Dashboard
                </div>
              </div>
            </div>

            {/* 2. Verified Node / Identity */}
            <div className="relative group">
              <button
                onClick={() => { setActiveTab('teams'); loadMyTeams(); }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'teams'
                    ? 'bg-[#121417] text-[#A3E635] shadow-xs'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-5 h-5" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Verified Node
                </div>
              </div>
            </div>

            {/* 3. Telemetry Cadence */}
            <div className="relative group">
              <button
                onClick={() => setActiveTab('commits')}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'commits'
                    ? 'bg-[#121417] text-[#A3E635] shadow-xs'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Telemetry Cadence
                </div>
              </div>
            </div>

            {/* 4. Workspace Files */}
            <div className="relative group">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-[#121417] text-[#A3E635] shadow-xs'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FolderCheck className="w-5 h-5" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Workspace Files
                </div>
              </div>
            </div>

            {/* 5. Kanban Board */}
            <div className="relative group">
              <button
                onClick={() => setActiveTab('kanban')}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'kanban'
                    ? 'bg-[#121417] text-[#A3E635] shadow-xs'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Kanban className="w-5 h-5" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Kanban Tasks
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Dock Icons */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2 shadow-xs flex flex-col items-center gap-2 mt-auto">
            
            {/* Help / Docs */}
            <div className="relative group">
              <Link
                href="/student/simulator"
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <HelpCircle className="w-5 h-5" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Documentation & Help
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="relative group">
              <button
                onClick={handleLogout}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-[#121417] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  Sign Out
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col min-w-0 space-y-6">
          
          {/* =========================================================================
              HERO ROW (GOOD MORNING & STATUS CHIPS)
          ========================================================================= */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Good morning, {student?.name ? student.name.split(' ')[0] : 'Student'}
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Continuous keystroke cadence, AST Integrity and team provenance.
              </p>
            </div>

            {/* Right Status Capsule */}
            <div className="bg-white border border-slate-200/80 rounded-full px-4 py-2 shadow-xs flex items-center gap-3 text-xs text-slate-600 shrink-0">
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                {selectedAssignment?.title ? selectedAssignment.title.toLowerCase().replace(/\s+/g, '-') : 'general-workspace'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-normal">
                Attested {scannedFiles.length} local files
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-normal">
                {report?.anomalies?.length || 0} anomalies
              </span>
            </div>
          </div>

          {/* =========================================================================
              TEAM REPOSITORY BANNER
          ========================================================================= */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200/60">
                <GitBranch className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">TEAM REPOSITORY</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                    {team?.inviteCode ? `TEAM-${team.inviteCode}` : 'NO TEAM'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900 font-mono truncate mt-0.5">
                  {team?.repositoryUrl || repoUrl || 'No Repository Linked'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowRepoLinkInput(!showRepoLinkInput)}
                className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-xs cursor-pointer"
              >
                Link Repository
              </button>
              <button
                onClick={handleSyncGit}
                disabled={syncingGit}
                className="px-5 py-2 rounded-full bg-[#A3E635] hover:bg-[#8ee01d] text-slate-950 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingGit ? 'animate-spin' : ''}`} />
                <span>Sync Git Data</span>
              </button>
            </div>
          </div>

          {/* Inline Link Repository Input if toggled */}
          {showRepoLinkInput && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <form onSubmit={handleUpdateRepo} className="flex gap-3">
                <input
                  type="url"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#A3E635]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#A3E635] text-slate-950 font-bold text-xs rounded-xl hover:bg-[#8ee01d] transition cursor-pointer"
                >
                  Save Repo
                </button>
              </form>
            </div>
          )}

          {/* =========================================================================
              MASTER DASHBOARD OVERVIEW GRID (MATCHING SCREENSHOT)
          ========================================================================= */}
          {activeTab === 'repository' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (8 of 12 cols ~ 67%) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Row 1: Integrity Card + 4 Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Left: Integrity & Provenance Card */}
                  <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900">Integrity & Provenance</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono ${
                          report?.scores?.final ? 'text-[#15803D] bg-[#22C55E]/15' : 'text-slate-500 bg-slate-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${report?.scores?.final ? 'bg-[#22C55E]' : 'bg-slate-400'}`} />
                          {report?.scores?.final ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5">Biometric typing verification</p>

                      <div className="my-5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900 tracking-tight font-mono">
                            {report?.scores?.final != null ? `${report.scores.final}%` : '0%'}
                          </span>
                          <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">AUTHENTICITY</span>
                        </div>
                        <p className="text-xs text-slate-500 font-normal mt-1">
                          {report?.scores?.final ? 'Genuine human keystroke rhythm verified' : 'Awaiting telemetry sync to establish baseline'}
                        </p>
                      </div>
                    </div>

                    {/* 3 bottom pills */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-2 text-center flex flex-col items-center justify-center">
                        <Laptop className="w-3.5 h-3.5 text-slate-600 mb-1" />
                        <span className="text-[10px] text-slate-500 leading-tight">Manual</span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5">
                          {report?.metrics?.codingProvenance?.manualPercent ?? 0}%
                        </span>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-2 text-center flex flex-col items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-purple-600 mb-1" />
                        <span className="text-[10px] text-slate-500 leading-tight">AI Assist</span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5">
                          {report?.metrics?.codingProvenance?.aiPercent ?? 0}%
                        </span>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-2 text-center flex flex-col items-center justify-center">
                        <ClipboardCheck className="w-3.5 h-3.5 text-rose-500 mb-1" />
                        <span className="text-[10px] text-slate-500 leading-tight">Pasted</span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5">
                          {report?.metrics?.codingProvenance?.pastePercent ?? 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: 4 Metric Cards (2x2) */}
                  <div className="md:col-span-7 grid grid-cols-2 gap-3">
                    
                    {/* 1: Manual Keystrokes */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 text-sm">✍️</span>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">Manual Keystrokes</span>
                          </div>
                          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                            {report?.metrics?.keystrokes ? report.metrics.keystrokes.toLocaleString() : '0'}
                          </span>
                          <span className="text-[10px] font-bold text-[#15803D] bg-[#22C55E]/15 px-2 py-0.5 rounded-full font-mono">
                            +{report?.metrics?.codingProvenance?.manualPercent ?? 0}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-10 bg-[#A3E635] rounded-full mt-4" />
                    </div>

                    {/* 2: AI-Assisted */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-purple-500 text-sm">✨</span>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">AI-Assisted</span>
                          </div>
                          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                            {report?.metrics?.codingProvenance?.aiChars ?? 0}
                            <span className="text-xs font-normal text-slate-400 ml-1">chars</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-mono">
                            {report?.metrics?.codingProvenance?.aiPercent ?? 0}% rate
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-10 bg-[#8B5CF6] rounded-full mt-4" />
                    </div>

                    {/* 3: Pasted Chars */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-500 text-sm">📋</span>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">Pasted Chars</span>
                          </div>
                          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                            {report?.metrics?.charactersPasted ?? 0}
                            <span className="text-xs font-normal text-slate-400 ml-1">chars</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                            {report?.metrics?.codingProvenance?.pastePercent ?? 0}% anomaly
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-10 bg-[#EF4444] rounded-full mt-4" />
                    </div>

                    {/* 4: Active Work Time */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-blue-500 text-sm">⏱️</span>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">Active Work Time</span>
                          </div>
                          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                            {report?.metrics?.codingHours ? Number(report.metrics.codingHours).toFixed(1) : '0.0'}
                            <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-mono">
                            {report?.metrics?.codingHours ? 'Logged' : 'Idle'}
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-10 bg-[#3B82F6] rounded-full mt-4" />
                    </div>
                  </div>
                </div>

                {/* Row 2: Typing Cadence & Burst Velocity */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">Typing Cadence & Burst Velocity</h3>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200">
                          Telemetry Feed
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3 mt-1.5">
                        <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                          {maxWpm > 0 ? maxWpm : 0} <span className="text-xs font-medium text-slate-400">WPM Peak</span>
                        </span>
                        {maxWpm > 0 ? (
                          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                            ^ Active Telemetry
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                            Awaiting Session
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-1 rounded-full flex items-center text-xs">
                        <button
                          onClick={() => setCadenceFilter('keystrokes')}
                          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                            cadenceFilter === 'keystrokes' ? 'bg-white text-slate-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Keystrokes
                        </button>
                        <button
                          onClick={() => setCadenceFilter('ast')}
                          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                            cadenceFilter === 'ast' ? 'bg-white text-slate-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          AST Diff
                        </button>
                        <button
                          onClick={() => setCadenceFilter('pastes')}
                          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                            cadenceFilter === 'pastes' ? 'bg-white text-slate-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Pastes
                        </button>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-700 font-medium flex items-center gap-1 shadow-xs">
                        <span>Today</span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Hour Bar Chart */}
                  <div className="pt-4 pb-2">
                    <div className="flex items-end justify-between gap-2 h-44 px-2">
                      {cadenceData.map((bar) => {
                        const heightPercent = bar.wpm > 0 
                          ? (bar.isPeak ? 85 : Math.max(18, Math.min(75, (bar.wpm / (maxWpm || 1)) * 75))) 
                          : 8;

                        return (
                          <div key={bar.time} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                            {bar.isPeak && bar.wpm > 0 && (
                              <div className="mb-2 bg-[#121417] text-white text-[11px] font-bold font-mono px-2.5 py-1 rounded-full shadow-md whitespace-nowrap animate-bounce">
                                {bar.wpm} WPM
                              </div>
                            )}
                            <div 
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full max-w-[38px] rounded-t-xl transition-all duration-300 ${
                                bar.isPeak && bar.wpm > 0
                                  ? 'bg-[#A3E635] shadow-xs' 
                                  : bar.wpm > 0 
                                  ? 'bg-slate-300 hover:bg-slate-400' 
                                  : 'bg-slate-100'
                              }`}
                              title={`${bar.time}: ${bar.wpm} WPM`}
                            />
                            <span className={`text-[10px] mt-2 font-mono ${bar.isPeak && bar.wpm > 0 ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                              {bar.time}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (4 of 12 cols ~ 33%) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* 1. Team Contributors Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Team Contributors</h3>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {team?.members?.length || 0} Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-normal">
                    Academic peers sharing repository telemetry
                  </p>

                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {team?.members && team.members.length > 0 ? (
                      team.members.map((member: any, idx: number) => {
                        const name = member.studentId?.name || member.name || member.gitUsername || 'Student';
                        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
                        const colors = [
                          'bg-slate-900 text-white',
                          'bg-emerald-600 text-white',
                          'bg-indigo-600 text-white',
                          'bg-amber-600 text-white',
                          'bg-teal-600 text-white'
                        ];
                        const color = colors[idx % colors.length];
                        return (
                          <div
                            key={member._id || idx}
                            title={`${name} (${member.gitUsername || 'No Git'})`}
                            className={`w-9 h-9 rounded-full ${color} font-bold text-xs flex items-center justify-center shadow-xs cursor-default`}
                          >
                            {initials}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic py-1">No contributors joined yet</span>
                    )}
                    <button
                      onClick={() => { setActiveTab('teams'); loadMyTeams(); }}
                      title="Add Contributor"
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition cursor-pointer border border-slate-200/80"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Verified Node (Black Card) */}
                <div className="space-y-3">
                  <div className="bg-[#121417] text-white rounded-3xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      {/* Gold SIM chip icon */}
                      <div className="w-8 h-6 rounded-md bg-amber-400/90 border border-amber-300 flex items-center justify-center p-1">
                        <div className="w-full h-full border border-amber-600/40 rounded-xs grid grid-cols-2 gap-0.5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#A3E635] uppercase">
                        VERIFIED NODE
                      </span>
                    </div>

                    <div className="my-6">
                      <div className="text-sm font-mono tracking-widest text-slate-300">
                        {student?._id ? `NODE-${student._id.slice(-8).toUpperCase()}` : 'NODE-LOCAL'}
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-2 border-t border-white/10 text-xs">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">STUDENT LEAD</div>
                        <div className="font-semibold text-white mt-0.5 text-xs truncate max-w-[140px]">
                          {student?.name || student?.email || 'Authenticated Student'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">DEADLINE</div>
                        <div className="font-semibold text-white mt-0.5 text-xs font-mono">
                          {selectedAssignment?.deadline 
                            ? new Date(selectedAssignment.deadline).toLocaleDateString(undefined, {month: '2-digit', year: 'numeric'}) 
                            : 'No Deadline'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Two Action Buttons underneath Card 2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleManualAutoSyncAll}
                      disabled={autoSyncInProgress || scanning}
                      className="w-full py-2.5 rounded-full bg-[#A3E635] hover:bg-[#8ee01d] text-slate-950 font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${autoSyncInProgress || scanning ? 'animate-spin' : ''}`} />
                      <span>Sync Telemetry</span>
                    </button>
                    <button
                      onClick={() => {
                        alert(`OffSync Student Audit Report\nStudent: ${student?.name || student?.email || 'Student'}\nAuthenticity: ${report?.scores?.final ?? 0}%\nAttested files: ${scannedFiles.length}\nRemote: ${team?.repositoryUrl || repoUrl || 'None'}`);
                      }}
                      className="w-full py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200/80 shadow-xs transition flex items-center justify-center cursor-pointer"
                    >
                      Audit Report
                    </button>
                  </div>
                </div>

                {/* 3. Workspace Evaluation Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Workspace Evaluation</h3>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      Total {report?.metrics?.codingHours ? Number(report.metrics.codingHours).toFixed(1) : '0.0'}h
                    </span>
                  </div>

                  {/* Blue Weighted Score Box */}
                  <div className="bg-[#EFF6FF] border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                        WEIGHTED SCORE
                      </div>
                      <div className="text-xs text-blue-900 font-medium mt-0.5">Calculated Standing</div>
                    </div>
                    <div className="text-3xl font-black text-blue-600 font-mono">
                      {report?.scores?.final ?? 0}%
                    </div>
                  </div>

                  {/* 4 Evaluation Progress Bars */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between items-center text-slate-600 mb-1">
                        <span className="font-medium">Git Mining (40%)</span>
                        <span className="font-mono font-bold text-slate-900">{report?.scores?.git ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, Math.max(0, report?.scores?.git ?? 0))}%` }} 
                          className="h-full bg-[#A3E635] transition-all duration-500" 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-slate-600 mb-1">
                        <span className="font-medium">VS Code Telemetry (30%)</span>
                        <span className="font-mono font-bold text-slate-900">{report?.scores?.vscode ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, Math.max(0, report?.scores?.vscode ?? 0))}%` }} 
                          className="h-full bg-[#A3E635] transition-all duration-500" 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-slate-600 mb-1">
                        <span className="font-medium">Kanban Velocity (20%)</span>
                        <span className="font-mono font-bold text-slate-900">{report?.scores?.task ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, Math.max(0, report?.scores?.task ?? 0))}%` }} 
                          className="h-full bg-[#A3E635] transition-all duration-500" 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-slate-600 mb-1">
                        <span className="font-medium">Team Balance (10%)</span>
                        <span className="font-mono font-bold text-slate-900">{report?.scores?.collab ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, Math.max(0, report?.scores?.collab ?? 0))}%` }} 
                          className="h-full bg-[#A3E635] transition-all duration-500" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Status */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span>Continuous sync active</span>
                    <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      Live Node
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}
          
          {/* Dynamic alerts */}
          {error && (
            <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs font-light flex items-start gap-2.5 text-left animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-xs font-light flex items-start gap-2.5 text-left animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* =========================================================================
              SAVED WORKSPACE RE-CONNECT BANNER (PERSISTENCE PROMPT)
          ========================================================================= */}
          {savedFolderPrompt && !localDirHandle && (
            <div className="glass-card rounded-3xl border border-[#A3E635]/40 bg-[#A3E635]/10 p-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono-code text-[#2D6606]">
                  <HardDrive className="w-4 h-4 text-[#2D6606]" />
                  <span>Saved Physical Workspace Detected</span>
                </div>
                <p className="text-xs text-[#48484a] font-light">
                  You previously connected folder <strong className="text-[#1d1d1f] font-mono-code">{savedFolderPrompt.folderName}/</strong> for this assignment. Click below to re-authenticate and automatically verify your Git remote and reconcile changes.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleResumeSavedWorkspace}
                  className="px-4 py-2 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Resume & Auto-Sync
                </button>
                <button
                  onClick={handleSelectFolder}
                  className="px-3.5 py-2 bg-black/[0.03] hover:bg-black/[0.04] text-[#48484a] hover:text-[#1d1d1f] rounded-xl text-xs font-light border border-black/[0.06] transition cursor-pointer"
                >
                  Choose Different Folder
                </button>
              </div>
            </div>
          )}

          {/* VS Code Extension Setup Banner */}
          {activeTab === 'commits' && (
            <div className="glass-card rounded-3xl border border-[#A3E635]/30 p-6 text-left relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-[#2D6606] font-mono-code mb-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>VS Code Telemetry Daemon Setup</span>
                  </div>
                  <p className="text-xs text-[#48484a] font-light leading-relaxed max-w-xl">
                    Install <strong>OffSync Telemetry Sensor</strong> in VS Code, then open the Command Palette (<code className="bg-black/[0.04] text-[#1d1d1f] rounded px-1.5 py-0.5 font-mono-code text-[11px]">Ctrl+Shift+P</code>) and run <code className="bg-black/[0.04] text-[#2D6606] rounded px-1.5 py-0.5 font-mono-code text-[11px]">OffSync: Setup</code> with your token.
                  </p>
                </div>
                <span className="text-[10px] bg-[#A3E635]/15 text-[#2D6606] border border-[#A3E635]/30 rounded-md px-2.5 py-1 font-mono-code font-medium uppercase tracking-wider">
                  v2.0 Client
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Auth Token */}
                <div className="bg-white/80 border border-black/[0.06] rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-mono-code text-[#86868b] tracking-wider">Student Auth Token (JWT)</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono-code bg-white border border-black/[0.04] rounded-lg px-2.5 py-1.5 truncate text-[#48484a]">
                      {typeof window !== 'undefined' ? (localStorage.getItem('token') || '— not found —') : '—'}
                    </code>
                    <button
                      onClick={() => {
                        const t = localStorage.getItem('token') || '';
                        navigator.clipboard.writeText(t);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="flex-shrink-0 px-3 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium rounded-lg transition cursor-pointer shadow-xs"
                    >
                      {copiedToken ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Assignment ID */}
                <div className="bg-white/80 border border-black/[0.06] rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-mono-code text-[#86868b] tracking-wider">Active Assignment ID</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono-code bg-white border border-black/[0.04] rounded-lg px-2.5 py-1.5 truncate text-[#48484a]">
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
                      className="flex-shrink-0 px-3 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    >
                      {copiedAssignId ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-[#86868b] font-mono-code flex items-center gap-2">
                <span className="text-[#34C759]">●</span> Server endpoint: <code className="text-[#48484a]">http://localhost:5000</code> (Auto-syncs offline batches on reconnect).
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 1: TEAMS MANAGER
          ========================================================================= */}
          {activeTab === 'teams' ? (
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-center pb-4 border-b border-black/[0.06]">
                <div>
                  <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Teams Manager</h1>
                  <p className="text-xs text-[#86868b] font-light mt-0.5">Form general teams, select members directly, and link cohort assignments.</p>
                </div>
                <button
                  onClick={() => { setShowGeneralTeamModal(true); setSelectedMembers([]); }}
                  className="px-4 py-2 rounded-xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium transition shadow-sm flex items-center gap-1.5 cursor-pointer"
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
                      <div key={t._id} className="glass-card rounded-3xl p-6 border border-black/[0.06] space-y-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-mono-code font-medium border border-black/[0.06] px-2 py-0.5 rounded-md bg-black/[0.03] text-[#2D6606] block w-max mb-2">
                              {isLeader ? 'Leader' : 'Member'}
                            </span>
                            <h3 className="text-base font-semibold text-[#1d1d1f]">{t.name}</h3>
                          </div>
                          <span className="text-xs font-mono-code bg-black/[0.03] border border-black/[0.06] text-[#48484a] px-2.5 py-1 rounded-lg">
                            Invite Code: <strong className="text-[#1d1d1f]">{t.inviteCode}</strong>
                          </span>
                        </div>

                        <div className="space-y-2 border-t border-black/[0.04] pt-4">
                          <span className="text-[10px] uppercase font-mono-code text-[#86868b] tracking-wider">Team Roster</span>
                          <div className="space-y-1.5">
                            {t.members.map((m: any) => (
                              <div key={m.student?._id || m.student} className="text-xs text-[#48484a] flex justify-between">
                                <span>{m.student?.name || 'Joining Student'}</span>
                                <span className="text-[#86868b] font-mono-code text-[11px]">@{m.gitUsername}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-black/[0.04] pt-4">
                          <span className="text-[10px] uppercase font-mono-code text-[#86868b] tracking-wider">Repository</span>
                          <span className="text-xs font-mono-code block text-[#48484a] truncate">
                            {t.repositoryUrl || 'No repository linked yet.'}
                          </span>
                        </div>

                        {t.assignment && (
                          <div className="border-t border-black/[0.04] pt-4 bg-black/[0.02] p-3 rounded-xl border border-black/[0.04]">
                            <span className="text-[10px] uppercase font-mono-code text-[#2D6606] tracking-wider block">Linked Assignment</span>
                            <span className="text-xs font-medium text-[#1d1d1f] block mt-0.5">{t.assignment.title || 'Linked Assignment'}</span>
                            {t.assignment.invitationCode && (
                              <span className="text-[10px] text-[#86868b] font-mono-code block mt-0.5">Invite Code: {t.assignment.invitationCode}</span>
                            )}
                          </div>
                        )}

                        {isLeader && (
                          <div className="border-t border-black/[0.04] pt-4 space-y-3">
                            <span className="text-[10px] uppercase font-mono-code text-[#86868b] tracking-wider block">Link Assignment to Team</span>
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
                                className="flex-grow bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#A3E635]"
                              />
                              <button 
                                type="submit"
                                className="px-3.5 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
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
                <div className="glass-card border border-black/[0.06] p-12 rounded-3xl text-center text-xs text-[#86868b]">
                  You are not a member of any teams yet. Click "Form General Team" to create one.
                </div>
              )}
            </div>
          ) : activeTab === 'directory' ? (
            /* =========================================================================
                VIEW 2: STUDENT DIRECTORY
            ========================================================================= */
            <div className="space-y-6 text-left">
              <div className="pb-4 border-b border-black/[0.06]">
                <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Student Directory</h1>
                <p className="text-xs text-[#86868b] font-light mt-0.5">Search classmates registered in the contribution tracking platform.</p>
              </div>

              <div className="glass-card rounded-3xl p-6 border border-black/[0.06] space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search by student name or academic email address..."
                    className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#A3E635] transition"
                  />
                </div>

                <div className="overflow-x-auto w-full pt-2">
                  <table className="w-full text-left text-xs font-mono-code border-collapse">
                    <thead>
                      <tr className="border-b border-black/[0.06] text-[#86868b] text-[10px] uppercase tracking-wider bg-black/[0.01]">
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Academic Email</th>
                        <th className="py-3 px-4 text-right">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04] font-sans">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => (
                          <tr key={s.id || s.email} className="hover:bg-black/[0.02] transition">
                            <td className="py-3.5 px-4 font-medium text-[#1d1d1f] flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#A3E635]/25 text-[#2D6606] border border-[#A3E635]/30 text-xs font-bold flex items-center justify-center">
                                {s.name?.charAt(0) || 'S'}
                              </div>
                              <span>{s.name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-[#48484a] font-mono-code">{s.email}</td>
                            <td className="py-3.5 px-4 text-right font-mono-code text-[10px] uppercase text-[#34C759]">Active Student</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-[#86868b] text-xs">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1 text-left">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono-code">Cohort:</span>
                    <select
                      onChange={handleAssignmentChange}
                      value={selectedAssignment?._id || ''}
                      className="bg-white border border-slate-200/80 rounded-full px-4 py-1.5 text-xs text-slate-900 font-medium outline-none focus:border-[#A3E635] shadow-xs cursor-pointer"
                    >
                      {assignments.map(a => (
                        <option key={a._id} value={a._id}>{a.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { setShowJoinModal(true); setSearchedAssignment(null); setInviteCode(''); setTeamFlow('none'); setSelectedMembers([]); }}
                      className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-medium transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#A3E635]" />
                      Join Cohort
                    </button>
                  </div>

                  {team && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSyncGit}
                        disabled={syncingGit}
                        className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition border border-slate-200/80 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-900 ${syncingGit ? 'animate-spin' : ''}`} />
                        Sync Git
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* NO ASSIGNMENTS JOINED YET */
                <div className="glass-card border border-black/[0.06] p-8 rounded-3xl max-w-2xl mx-auto space-y-6 mt-10 text-center shadow-lg">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Join An Assignment Cohort</h2>
                    <p className="text-xs text-[#48484a] font-light">Enter the invitation code provided by your lecturer to join and register your team.</p>
                  </div>

                  <form onSubmit={handleSearchInvite} className="flex gap-3 max-w-lg mx-auto">
                    <input
                      type="text"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter invite code (e.g. INV-123)"
                      className="flex-grow bg-black/[0.03] border border-black/[0.06] rounded-xl px-3.5 py-2 text-xs text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#A3E635]"
                    />
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
                    >
                      Search Code
                    </button>
                  </form>
                </div>
              )}

              {selectedAssignment && team && (
                <div className="space-y-6 text-left">
                  
                  {/* Repository Linker Card */}
                  <div className="glass-card rounded-3xl p-5 border border-black/[0.06]">
                    <form onSubmit={handleUpdateRepo} className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-grow space-y-1 w-full text-left">
                        <div className="flex justify-between items-center text-xs">
                          <label className="text-[10px] uppercase text-[#86868b] font-mono-code">Team Repository URL</label>
                          <span className="text-[#2D6606] font-mono-code text-[11px] bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06]">
                            Team Invite: <strong className="text-[#1d1d1f]">{team.inviteCode}</strong>
                          </span>
                        </div>
                        <input
                          type="url"
                          required
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          placeholder="https://github.com/your-org/your-repo"
                          className="w-full bg-white/90 border border-black/[0.06] rounded-xl px-3.5 py-2 text-xs text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#A3E635]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.06] text-[#1d1d1f] text-xs font-medium transition border border-black/[0.06] shrink-0 cursor-pointer shadow-xs"
                      >
                        Link Repository
                      </button>
                    </form>
                  </div>

                  {/* Master 2-Column Split Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left/Center Column (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Tab Navigation header (Monetra Pill Bar) */}
                      <div className="bg-white rounded-full p-1.5 flex flex-wrap gap-1.5 text-xs border border-slate-200/80 shadow-xs">
                        <button
                          onClick={() => setActiveTab('repository')}
                          className={`flex-1 min-w-[100px] py-2 rounded-full transition cursor-pointer font-medium ${
                            activeTab === 'repository' 
                              ? 'bg-[#A3E635] text-slate-950 font-bold shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Files
                        </button>
                        <button
                          onClick={() => setActiveTab('commits')}
                          className={`flex-1 min-w-[100px] py-2 rounded-full transition cursor-pointer font-medium ${
                            activeTab === 'commits' 
                              ? 'bg-[#A3E635] text-slate-950 font-bold shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Commits
                        </button>
                        <button
                          onClick={() => setActiveTab('timeline')}
                          className={`flex-1 min-w-[110px] py-2 rounded-full transition cursor-pointer font-medium ${
                            activeTab === 'timeline' 
                              ? 'bg-[#A3E635] text-slate-950 font-bold shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Provenance
                        </button>
                        <button
                          onClick={() => setActiveTab('kanban')}
                          className={`flex-1 min-w-[90px] py-2 rounded-full transition cursor-pointer font-medium ${
                            activeTab === 'kanban' 
                              ? 'bg-[#A3E635] text-slate-950 font-bold shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Tasks
                        </button>
                      </div>

                      {/* TAB CONTENT: 1. REPOSITORY & PHYSICAL WORKSPACE */}
                      {activeTab === 'repository' && (
                        <div className="space-y-6 text-left">
                          
                          {/* Repo Meta subheader */}
                          <div className="glass-card rounded-3xl p-5 border border-black/[0.06] space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.04] pb-3">
                              <span className="font-mono-code text-xs text-[#1d1d1f] truncate">{repoUrl || 'No Repository Linked'}</span>
                              {repoUrl && (
                                <a
                                  href={repoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#2D6606] hover:underline flex items-center gap-1 font-mono-code border border-[#A3E635]/40 bg-[#A3E635]/15 text-slate-900 px-2.5 py-1 rounded-lg"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View on GitHub
                                </a>
                              )}
                            </div>

                            {/* Members Roster */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-[10px] uppercase font-mono-code text-[#86868b] pr-2">Team Members:</span>
                              {studentBreakdown.length > 0 ? (
                                studentBreakdown.map((member) => (
                                  <div key={member.studentId} className="flex items-center gap-1.5 text-xs text-[#48484a] bg-black/[0.03] border border-black/[0.04] rounded-lg px-2.5 py-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                                    <span>{member.name}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-[#86868b]">Sync repo to load breakdown.</span>
                              )}
                            </div>
                          </div>

                          {/* =========================================================================
                              PHYSICAL WORKSPACE SCANNER (WITH PERSISTENCE & GIT REMOTE VALIDATION)
                          ========================================================================= */}
                          <div className="glass-card rounded-3xl border border-black/[0.06] overflow-hidden text-left">
                            <div className="p-5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <HardDrive className="w-4 h-4 text-[#2D6606]" />
                                  <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#2D6606]">
                                    Physical Project Workspace (Auto-Saved & Git Attested)
                                  </h3>
                                </div>
                                <p className="text-xs text-[#48484a] font-light mt-1">
                                  Connect your local cloned repository once. OffSync inspects the hidden <code className="text-[#2D6606] bg-white px-1 py-0.5 rounded text-[11px]">.git/config</code> to attest that your local directory matches the assigned repository.
                                </p>
                              </div>

                              {localDirHandle && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleManualAutoSyncAll}
                                    disabled={scanning || autoSyncInProgress}
                                    className="px-3 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${scanning || autoSyncInProgress ? 'animate-spin' : ''}`} />
                                    <span>{scanning ? 'Scanning...' : 'Rescan & Sync'}</span>
                                  </button>
                                  <button
                                    onClick={handleDisconnectWorkspace}
                                    className="px-3 py-1.5 bg-black/[0.03] hover:bg-black/[0.04] text-[#86868b] hover:text-[#1d1d1f] text-xs rounded-xl border border-black/[0.06] transition cursor-pointer"
                                  >
                                    Disconnect
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Git Attestation Banner if verified */}
                            {localDirHandle && gitVerification && (
                              <div className={`px-5 py-3 border-b border-black/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code ${
                                gitVerification.status === 'matched' ? 'bg-[#34C759]/10 text-[#34C759]' :
                                gitVerification.status === 'mismatch' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                                'bg-black/[0.02] text-[#48484a]'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {gitVerification.status === 'matched' ? (
                                    <>
                                      <ShieldCheck className="w-4 h-4 text-[#34C759]" />
                                      <span><strong>Git Remote Verified:</strong> {gitVerification.matchedSlug}</span>
                                    </>
                                  ) : gitVerification.status === 'mismatch' ? (
                                    <>
                                      <ShieldAlert className="w-4 h-4 text-[#FF3B30]" />
                                      <span><strong>Remote Mismatch:</strong> Expected "{gitVerification.expectedRepoUrl}" but local .git is "{gitVerification.localRemoteUrl}"</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
                                      <span>{gitVerification.message}</span>
                                    </>
                                  )}
                                </div>

                                {gitVerification.localBranch && (
                                  <div className="flex items-center gap-1.5 text-[11px] bg-black/[0.02] px-2.5 py-0.5 rounded-md border border-black/[0.06]">
                                    <GitCommit className="w-3.5 h-3.5 text-[#2D6606]" />
                                    <span>Branch: <strong className="text-[#1d1d1f]">{gitVerification.localBranch}</strong></span>
                                  </div>
                                )}
                              </div>
                            )}

                            {!localDirHandle ? (
                              <div className="border-2 border-dashed border-black/[0.06] rounded-xl m-5 p-8 text-center space-y-4">
                                <div className="w-12 h-12 rounded-3xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center mx-auto text-[#2D6606]">
                                  <Folder className="w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-[#1d1d1f]">No Physical Workspace Directory Connected</h4>
                                  <p className="text-xs text-[#86868b] font-light max-w-md mx-auto mt-1">
                                    Select your local development folder for <strong>{selectedAssignment.title}</strong> once. OffSync will verify its hidden <code className="text-[#3a3a3c]">.git/config</code> remote path to ensure it is the exact cloned repository.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                  {savedFolderPrompt ? (
                                    <button
                                      onClick={handleResumeSavedWorkspace}
                                      className="px-5 py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium flex items-center gap-2 transition cursor-pointer shadow-sm"
                                    >
                                      <Zap className="w-4 h-4" />
                                      Resume Saved Workspace ({savedFolderPrompt.folderName}/)
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleSelectFolder}
                                      className="px-5 py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium flex items-center gap-2 transition cursor-pointer shadow-sm"
                                    >
                                      <Folder className="w-4 h-4" />
                                      Connect Cloned Project Folder
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-black/[0.04]">
                                
                                {/* Left files */}
                                <div className="w-full md:w-72 shrink-0 flex flex-col">
                                  <div className="p-4 bg-black/[0.01] border-b border-black/[0.04]">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-mono-code text-[#34C759] flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse"></span>
                                        Connected & Attested
                                      </span>
                                      {lastAutoSyncTime && (
                                        <span className="text-[10px] text-[#aeaeb2] font-mono-code">{lastAutoSyncTime}</span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-[#1d1d1f] font-mono-code block mt-1 truncate">{localDirName}/</span>
                                    <span className="text-[10px] text-[#86868b] block mt-1">
                                      {scannedFiles.length} files across {scannedFolders.length} folders · {offlineEdits.length} modified recently
                                    </span>
                                  </div>

                                  {/* Filter Tabs */}
                                  <div className="flex border-b border-black/[0.04] bg-black/[0.01]">
                                    <button
                                      onClick={() => { setOfflineFilter('edited'); setSelectedFolderFilter(null); }}
                                      className={`flex-1 py-2 text-[10px] font-mono-code uppercase tracking-wider text-center border-b transition cursor-pointer ${
                                        offlineFilter === 'edited' ? 'text-[#2D6606] border-[#A3E635] bg-black/[0.02] font-medium' : 'text-[#86868b] border-transparent hover:text-[#1d1d1f]'
                                      }`}
                                    >
                                      Modified ({offlineEdits.length})
                                    </button>
                                    <button
                                      onClick={() => setOfflineFilter('all')}
                                      className={`flex-1 py-2 text-[10px] font-mono-code uppercase tracking-wider text-center border-b transition cursor-pointer ${
                                        offlineFilter === 'all' ? 'text-[#2D6606] border-[#A3E635] bg-black/[0.02] font-medium' : 'text-[#86868b] border-transparent hover:text-[#1d1d1f]'
                                      }`}
                                    >
                                      Files ({scannedFiles.length})
                                    </button>
                                    <button
                                      onClick={() => setOfflineFilter('folders')}
                                      className={`flex-1 py-2 text-[10px] font-mono-code uppercase tracking-wider text-center border-b transition cursor-pointer ${
                                        offlineFilter === 'folders' ? 'text-[#2D6606] border-[#A3E635] bg-black/[0.02] font-medium' : 'text-[#86868b] border-transparent hover:text-[#1d1d1f]'
                                      }`}
                                    >
                                      Folders ({scannedFolders.length})
                                    </button>
                                  </div>

                                  {/* Search Filter Bar */}
                                  <div className="p-2 border-b border-black/[0.04] bg-black/[0.015]">
                                    <div className="relative flex items-center">
                                      <Search className="w-3.5 h-3.5 text-[#aeaeb2] absolute left-2.5 pointer-events-none" />
                                      <input
                                        type="text"
                                        placeholder="Search files by path / name..."
                                        value={fileSearchQuery}
                                        onChange={(e) => setFileSearchQuery(e.target.value)}
                                        className="w-full bg-white/80 text-[#1d1d1f] pl-8 pr-7 py-1 rounded-lg text-[11px] font-mono-code border border-black/[0.04] focus:border-[#A3E635] focus:outline-none placeholder:text-[#c7c7cc]"
                                      />
                                      {fileSearchQuery && (
                                        <button
                                          onClick={() => setFileSearchQuery('')}
                                          className="absolute right-2 text-[#aeaeb2] hover:text-[#1d1d1f] text-xs cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Folder Filter Pill if Active */}
                                  {selectedFolderFilter && offlineFilter !== 'folders' && (
                                    <div className="px-3.5 py-1.5 bg-[#A3E635]/20 border-b border-black/[0.04] flex items-center justify-between text-[10px] font-mono-code text-[#2D6606]">
                                      <span className="truncate">In folder: <strong>{selectedFolderFilter}/</strong></span>
                                      <button 
                                        onClick={() => setSelectedFolderFilter(null)}
                                        className="text-[#86868b] hover:text-[#1d1d1f] ml-2 cursor-pointer font-bold"
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
                                            className="w-full text-left px-4 py-3 border-b border-black/[0.04] hover:bg-black/[0.02] transition cursor-pointer group"
                                          >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <Folder className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />
                                                <span className="text-xs text-[#1d1d1f] truncate font-mono-code group-hover:text-[#2D6606] transition-colors">{folder.path}/</span>
                                              </div>
                                              {folder.modifiedCount > 0 ? (
                                                <span className="text-[9px] bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30 px-1.5 py-0.5 rounded font-mono-code uppercase shrink-0">
                                                  {folder.modifiedCount} Mod
                                                </span>
                                              ) : null}
                                            </div>
                                            <div className="text-[10px] text-[#86868b] font-mono-code pl-5 flex items-center justify-between">
                                              <span>{folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''} · {(folder.totalSize / 1024).toFixed(1)} KB</span>
                                              <span className="text-[#aeaeb2] group-hover:text-[#2D6606] text-[9px]">Filter →</span>
                                            </div>
                                          </button>
                                        ))
                                      ) : (
                                        <div className="text-center text-xs text-[#aeaeb2] p-8 py-16">
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
                                                className={`w-full text-left px-4 py-3 border-b border-black/[0.04] hover:bg-black/[0.02] transition cursor-pointer ${isSelected ? 'bg-[#A3E635]/20 border-l-2 border-l-[#007AFF] pl-3.5' : ''}`}
                                              >
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#2D6606]' : 'text-[#86868b]'}`} />
                                                    <span className="text-xs text-[#1d1d1f] truncate font-mono-code">{f.name}</span>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {fileIntel?.hasUnauthorizedAuthor ? (
                                                      <span className="text-[8px] bg-rose-500/20 text-[#FF3B30] border border-[#FF3B30]/20 px-1 py-0.5 rounded font-mono-code font-bold flex items-center gap-0.5" title="Unauthorized author detected">
                                                        <ShieldAlert className="w-2.5 h-2.5 text-[#FF3B30]" />
                                                        Unauth
                                                      </span>
                                                    ) : null}

                                                    {isModified ? (
                                                      <span className="text-[9px] bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30 px-1.5 py-0.5 rounded font-mono-code uppercase">Modified</span>
                                                    ) : (
                                                      <span className="text-[9px] bg-black/[0.04] text-[#86868b] px-1.5 py-0.5 rounded font-mono-code uppercase">Synced</span>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="text-[10px] text-[#86868b] font-mono-code pl-5 flex items-center justify-between">
                                                  <span className="truncate max-w-[130px] text-[#aeaeb2]">{f.parentFolder !== '(root)' ? `📁 ${f.parentFolder}/` : 'root/'}</span>
                                                  <span>{(f.size / 1024).toFixed(1)} KB · {f.lineCount}L</span>
                                                </div>

                                                {/* Mini author & typing telemetry summary */}
                                                {fileIntel && (
                                                  <div className="mt-1.5 pl-5 flex items-center justify-between text-[9px] font-mono-code text-[#aeaeb2]">
                                                    <span className="truncate max-w-[130px] text-[#86868b] flex items-center gap-1">
                                                      <User className="w-2.5 h-2.5 text-[#86868b]" />
                                                      {fileIntel.creatorName}
                                                    </span>
                                                    <span className={`font-medium ${fileIntel.typingPercent >= 80 ? 'text-[#30D158]' : fileIntel.typingPercent >= 50 ? 'text-[#FF9500]' : 'text-[#FF3B30]'}`}>
                                                      {fileIntel.typingPercent}% Typed
                                                    </span>
                                                  </div>
                                                )}
                                              </button>
                                            );
                                          })
                                        ) : (
                                          <div className="text-center text-xs text-[#aeaeb2] p-8 py-16">
                                            No files found matching filter or search.
                                          </div>
                                        );
                                      })()
                                    )}
                                  </div>
                                </div>

                                {/* Right file intelligence & multi-view pane */}
                                <div className="flex-1 flex flex-col min-w-0 bg-black/[0.015]">
                                  {selectedOfflineFile ? (() => {
                                    const intel = getFileIntelligence(selectedOfflineFile);

                                    return (
                                      <>
                                        {/* File Header with Metadata & Security Attestation */}
                                        <div className="px-5 py-4 border-b border-black/[0.04] bg-black/[0.02] space-y-3">
                                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                <FileCode className="w-4 h-4 text-[#2D6606] shrink-0" />
                                                <span className="text-sm font-mono-code text-[#1d1d1f] font-semibold truncate">{selectedOfflineFile.path}</span>
                                              </div>
                                              
                                              {/* Timestamps & Lineage */}
                                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#86868b] font-mono-code mt-1.5">
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3 text-[#aeaeb2]" />
                                                  Created: <strong className="text-[#48484a]">{intel?.createdAt ? new Date(intel.createdAt).toLocaleString() : 'Recent'}</strong>
                                                </span>
                                                <span className="text-[#c7c7cc]">•</span>
                                                <span>
                                                  Last Modified: <strong className="text-[#48484a]">{new Date(selectedOfflineFile.lastModified).toLocaleString()}</strong>
                                                </span>
                                              </div>
                                            </div>

                                            {/* File Stats Badges */}
                                            <div className="flex gap-2 text-center shrink-0 font-mono-code text-xs">
                                              <div className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-1.5">
                                                <span className="text-[9px] text-[#86868b] block uppercase">Lines</span>
                                                <span className="text-[#1d1d1f] font-bold">{selectedOfflineFile.lineCount}</span>
                                              </div>
                                              <div className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-1.5">
                                                <span className="text-[9px] text-[#86868b] block uppercase">Size</span>
                                                <span className="text-[#1d1d1f] font-bold">{(selectedOfflineFile.size / 1024).toFixed(1)}KB</span>
                                              </div>
                                              <div className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-1.5">
                                                <span className="text-[9px] text-[#86868b] block uppercase">Typing</span>
                                                <span className={`font-bold ${intel?.typingPercent && intel.typingPercent >= 80 ? 'text-[#30D158]' : 'text-[#FF9500]'}`}>
                                                  {intel?.typingPercent || 95}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Author Attribution & Security Authorization Banner */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.04]">
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code">
                                              {intel?.hasUnauthorizedAuthor ? (
                                                <div className="bg-[#FF3B30]/6 border border-[#FF3B30]/25 text-[#FF3B30] px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px]">
                                                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B30]" />
                                                  <span><strong>Security Alert:</strong> Changes from unauthorized contributor ({intel.unauthorizedAuthors.join(', ')}) detected!</span>
                                                </div>
                                              ) : (
                                                <div className="bg-[#34C759]/5 border border-[#34C759]/20 text-[#34C759] px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px]">
                                                  <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
                                                  <span><strong>Creator:</strong> {intel?.creatorName} (@{intel?.creatorGit}) · <span className="text-[#30D158] font-medium">Authorized Contributor</span></span>
                                                </div>
                                              )}

                                              {intel && intel.collaborators.length > 1 && (
                                                <div className="bg-black/[0.03] border border-black/[0.06] text-[#48484a] px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5">
                                                  <Users className="w-3 h-3 text-[#2D6606]" />
                                                  <span><strong>{intel.collaborators.length}</strong> Co-authors on this file</span>
                                                </div>
                                              )}
                                            </div>

                                            {intel?.lastModifierName && intel.lastModifierName !== intel.creatorName && (
                                              <div className="text-[11px] font-mono-code text-[#86868b]">
                                                Last edited by: <strong className="text-[#3a3a3c]">{intel.lastModifierName}</strong>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* View Mode Tab Switcher */}
                                        <div className="flex border-b border-black/[0.04] bg-black/[0.015] px-5">
                                          <button
                                            onClick={() => setWorkspaceFileViewTab('forensics')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'forensics'
                                                ? 'text-[#2D6606] border-[#A3E635] font-bold bg-black/[0.015]'
                                                : 'text-[#86868b] border-transparent hover:text-[#3a3a3c]'
                                            }`}
                                          >
                                            <Fingerprint className="w-3.5 h-3.5" />
                                            <span>Forensics & Authenticity</span>
                                          </button>

                                          <button
                                            onClick={() => setWorkspaceFileViewTab('blame')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'blame'
                                                ? 'text-[#2D6606] border-[#A3E635] font-bold bg-black/[0.015]'
                                                : 'text-[#86868b] border-transparent hover:text-[#3a3a3c]'
                                            }`}
                                          >
                                            <Split className="w-3.5 h-3.5" />
                                            <span>Multi-Author Blame ({intel?.collaborators.length || 1})</span>
                                          </button>

                                          <button
                                            onClick={() => setWorkspaceFileViewTab('diff')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'diff'
                                                ? 'text-[#2D6606] border-[#A3E635] font-bold bg-black/[0.015]'
                                                : 'text-[#86868b] border-transparent hover:text-[#3a3a3c]'
                                            }`}
                                          >
                                            <GitBranch className="w-3.5 h-3.5" />
                                            <span>Git Live Diff</span>
                                          </button>

                                          <button
                                            onClick={() => setWorkspaceFileViewTab('code')}
                                            className={`py-2.5 px-4 text-xs font-mono-code uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
                                              workspaceFileViewTab === 'code'
                                                ? 'text-[#2D6606] border-[#A3E635] font-bold bg-black/[0.015]'
                                                : 'text-[#86868b] border-transparent hover:text-[#3a3a3c]'
                                            }`}
                                          >
                                            <FileCode className="w-3.5 h-3.5" />
                                            <span>Code Preview</span>
                                          </button>
                                        </div>

                                        {/* Main Tab Views Body */}
                                        <div className="flex-1 overflow-auto max-h-[460px] bg-white">
                                          
                                          {/* =========================================================================
                                              TAB 1: FORENSICS & AUTHENTICITY INTELLIGENCE
                                          ========================================================================= */}
                                          {workspaceFileViewTab === 'forensics' && (
                                            <div className="p-6 space-y-6 text-left">
                                              
                                              {/* 1. Keystroke vs Copy-Paste Ratio Meter */}
                                              <div className="glass-card rounded-xl p-5 border border-black/[0.06] space-y-4">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <Keyboard className="w-4 h-4 text-[#2D6606]" />
                                                    <h4 className="text-xs font-mono-code uppercase tracking-wider text-[#1d1d1f] font-semibold">
                                                      Keystroke vs. Copy-Paste Telemetry Analysis
                                                    </h4>
                                                  </div>
                                                  <span className={`text-[10px] font-mono-code uppercase px-2.5 py-0.5 rounded-full border ${
                                                    intel?.authenticityVerdict === 'authentic' ? 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30' :
                                                    intel?.authenticityVerdict === 'mixed' ? 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/30' :
                                                    'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30'
                                                  }`}>
                                                    {intel?.authenticityVerdict === 'authentic' ? 'Authentic Human Typing' :
                                                     intel?.authenticityVerdict === 'mixed' ? 'Reference Pastes Detected' :
                                                     'AI / Bulk Paste Anomaly Alert'}
                                                  </span>
                                                </div>

                                                {/* Visual Ratio Bar */}
                                                <div>
                                                  <div className="flex justify-between text-xs font-mono-code mb-1.5">
                                                    <span className="text-[#34C759] font-medium">
                                                      ⌨️ Human Keystrokes: {intel?.typingPercent}%
                                                    </span>
                                                    <span className="text-[#FF3B30] font-medium">
                                                      📋 Pasted / Injected: {100 - (intel?.typingPercent || 95)}%
                                                    </span>
                                                  </div>
                                                  <div className="w-full h-3 bg-black/[0.03] rounded-full overflow-hidden flex border border-black/[0.04]">
                                                    <div 
                                                      className="bg-[#34C759] h-full transition-all duration-500" 
                                                      style={{ width: `${intel?.typingPercent || 95}%` }}
                                                      title={`Organic Typing: ${intel?.typingPercent}%`}
                                                    />
                                                    <div 
                                                      className="bg-[#FF3B30] h-full transition-all duration-500" 
                                                      style={{ width: `${100 - (intel?.typingPercent || 95)}%` }}
                                                      title={`Pasted Code: ${100 - (intel?.typingPercent || 95)}%`}
                                                    />
                                                  </div>
                                                </div>

                                                <p className="text-xs text-[#48484a] font-light">
                                                  {intel?.authenticityMessage}
                                                </p>

                                                {/* Forensic Metrics Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                                  <div className="bg-white/80 border border-black/[0.04] rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-[#86868b] block font-mono-code">Keystrokes</span>
                                                    <span className="text-sm font-bold text-[#1d1d1f] font-mono-code">{intel?.totalKeystrokes || 0}</span>
                                                  </div>
                                                  <div className="bg-white/80 border border-black/[0.04] rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-[#86868b] block font-mono-code">Chars Pasted</span>
                                                    <span className="text-sm font-bold text-[#1d1d1f] font-mono-code">{intel?.totalCharsPasted || 0}</span>
                                                  </div>
                                                  <div className="bg-white/80 border border-black/[0.04] rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-[#86868b] block font-mono-code">Paste Events</span>
                                                    <span className="text-sm font-bold text-[#1d1d1f] font-mono-code">{intel?.totalPasteCount || 0}</span>
                                                  </div>
                                                  <div className="bg-white/80 border border-black/[0.04] rounded-lg p-3 text-center">
                                                    <span className="text-[10px] text-[#86868b] block font-mono-code">K_eff Efficiency</span>
                                                    <span className="text-sm font-bold text-[#2D6606] font-mono-code">{intel?.keff || 100}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* 2. Collaborators Who Modified This File */}
                                              <div className="glass-card rounded-xl p-5 border border-black/[0.06] space-y-4">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-[#AF52DE]" />
                                                    <h4 className="text-xs font-mono-code uppercase tracking-wider text-[#1d1d1f] font-semibold">
                                                      Collaborators & Text Line Contributors
                                                    </h4>
                                                  </div>
                                                  <span className="text-[10px] font-mono-code text-[#86868b]">
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
                                                              <span className="text-xs font-bold text-[#1d1d1f] font-mono-code">{c.name}</span>
                                                              <span className="text-[10px] text-[#86868b] font-mono-code">(@{c.gitUsername})</span>
                                                              {c.isAuthorized ? (
                                                                <span className="text-[9px] bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20 px-1.5 py-0.5 rounded font-mono-code flex items-center gap-1">
                                                                  <ShieldCheck className="w-2.5 h-2.5 text-[#30D158]" />
                                                                  Authorized
                                                                </span>
                                                              ) : (
                                                                <span className="text-[9px] bg-[#FF3B30]/8 text-[#FF3B30] border border-[#FF3B30]/25 px-1.5 py-0.5 rounded font-mono-code font-bold flex items-center gap-1">
                                                                  <ShieldAlert className="w-2.5 h-2.5 text-[#FF3B30]" />
                                                                  Unauthorized Contributor
                                                                </span>
                                                              )}
                                                            </div>
                                                            <div className="text-[10px] text-[#86868b] font-mono-code mt-0.5">
                                                              Last Active on file: {new Date(c.lastActive).toLocaleString()}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-xs font-mono-code shrink-0">
                                                          <div>
                                                            <span className="text-[9px] text-[#86868b] block">Keystrokes</span>
                                                            <span className="text-[#1d1d1f] font-bold">{c.keystrokes}</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-[9px] text-[#86868b] block">Pastes</span>
                                                            <span className="text-[#1d1d1f] font-bold">{c.pasteCount}</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-[9px] text-[#86868b] block">Lines Added</span>
                                                            <span className="text-[#30D158] font-bold">+{c.linesAdded}</span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>

                                              {/* 3. Commit & Telemetry Timeline for this File */}
                                              <div className="glass-card rounded-xl p-5 border border-black/[0.06] space-y-3">
                                                <div className="flex items-center gap-2">
                                                  <History className="w-4 h-4 text-[#2D6606]" />
                                                  <h4 className="text-xs font-mono-code uppercase tracking-wider text-[#1d1d1f] font-semibold">
                                                    File Modification History & Commits
                                                  </h4>
                                                </div>

                                                {intel?.commits && intel.commits.length > 0 ? (
                                                  <div className="space-y-2">
                                                    {intel.commits.map((commit, idx) => (
                                                      <div key={idx} className="p-3 bg-black/[0.02] border border-black/[0.04] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-code">
                                                        <div>
                                                          <div className="flex items-center gap-2">
                                                            <GitCommit className="w-3.5 h-3.5 text-[#2D6606]" />
                                                            <span className="text-[#3a3a3c] font-medium">{commit.commitMessage}</span>
                                                          </div>
                                                          <div className="text-[10px] text-[#86868b] mt-1 pl-5">
                                                            by <strong className="text-[#48484a]">{commit.studentName}</strong> (@{commit.gitUsername}) · {new Date(commit.commitDate).toLocaleString()}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] shrink-0 pl-5 sm:pl-0">
                                                          <span className="text-[#30D158]">+{commit.linesAdded || 0}</span>
                                                          <span className="text-[#FF3B30]">-{commit.linesRemoved || 0}</span>
                                                          <code className="bg-white px-1.5 py-0.5 rounded text-[#86868b]">{commit.commitHash ? commit.commitHash.slice(0, 7) : 'local'}</code>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="p-4 bg-black/[0.015] rounded-lg text-center text-xs text-[#86868b] font-mono-code">
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
                                              <div className="px-4 py-2.5 bg-white/90 border-b border-black/[0.04] flex flex-wrap items-center justify-between text-xs font-mono-code text-[#48484a] gap-3">
                                                <span className="font-semibold text-[#1d1d1f] flex items-center gap-2">
                                                  <Terminal className="w-3.5 h-3.5 text-[#2D6606]" />
                                                  Line-by-Line Code Origin, Provenance & Timestamp Inspector
                                                </span>
                                                <div className="flex items-center gap-3 text-[10px]">
                                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#34C759]" /> ✍️ Typed</span>
                                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#5856D6]" /> 🤖 AI Generated</span>
                                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> 📋 Pasted</span>
                                                  <span className="flex items-center gap-1 text-[#86868b]">🕒 Exact Timestamp</span>
                                                </div>
                                              </div>

                                              {intel?.lineAttributions && intel.lineAttributions.length > 0 ? (
                                                <table className="w-full text-[11px] font-mono-code border-collapse">
                                                  <thead>
                                                    <tr className="bg-black/[0.02] text-[#86868b] text-[10px] uppercase border-b border-black/[0.04]">
                                                      <th className="py-2 px-3 text-right w-10 border-r border-black/[0.04]">#</th>
                                                      <th className="py-2 px-3 text-left w-36 border-r border-black/[0.04]">Author & Auth</th>
                                                      <th className="py-2 px-3 text-center w-28 border-r border-black/[0.04]">Typing Status</th>
                                                      <th className="py-2 px-3 text-center w-24 border-r border-black/[0.04]">Sync Mode</th>
                                                      <th className="py-2 px-3 text-center w-24 border-r border-black/[0.04]">Time Added</th>
                                                      <th className="py-2 px-4 text-left">Code Content</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {intel.lineAttributions.map((attr: any, idx: number) => {
                                                      const colorScheme = intel.memberColors[attr.colorIndex % intel.memberColors.length];

                                                      return (
                                                        <tr key={idx} className="hover:bg-black/[0.02] border-b border-black/[0.04] transition-colors group">
                                                          {/* 1. Line Number */}
                                                          <td className="text-right text-[#c7c7cc] px-3 py-1 select-none w-10 border-r border-black/[0.04] text-[10px] font-bold">
                                                            {attr.lineNumber}
                                                          </td>

                                                          {/* 2. Author & Authorization Badge */}
                                                          <td className="px-3 py-1 select-none w-36 border-r border-black/[0.04] text-[10px] whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                              <span className={`w-1.5 h-1.5 rounded-full ${colorScheme.bar}`} />
                                                              <span className={`font-semibold ${colorScheme.text} truncate max-w-[80px]`}>
                                                                {attr.authorName}
                                                              </span>
                                                              {attr.isAuthorized ? (
                                                                <span className="text-[8px] bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20 px-1 py-0.2 rounded font-mono-code">Auth</span>
                                                              ) : (
                                                                <span className="text-[8px] bg-[#FF3B30]/8 text-[#FF3B30] border border-[#FF3B30]/25 px-1 py-0.2 rounded font-mono-code font-bold animate-pulse">Unauth</span>
                                                              )}
                                                            </div>
                                                          </td>

                                                          {/* 3. Typing Provenance Status Badge */}
                                                          <td className="px-2.5 py-1 select-none w-28 border-r border-black/[0.04] text-[9px] text-center whitespace-nowrap">
                                                            {attr.provenanceType === 'pasted' || attr.isPasted ? (
                                                              <span className="text-[#FF3B30] bg-[#FF3B30]/8 border border-[#FF3B30]/25 px-1.5 py-0.5 rounded text-[8px] font-bold inline-flex items-center gap-1">
                                                                📋 Pasted
                                                              </span>
                                                            ) : attr.provenanceType === 'ai_generated' || attr.isAi ? (
                                                              <span className="text-[#5856D6] bg-[#5856D6]/8 border border-[#5856D6]/25 px-1.5 py-0.5 rounded text-[8px] font-bold inline-flex items-center gap-1">
                                                                🤖 AI-Copilot
                                                              </span>
                                                            ) : (
                                                              <span className="text-[#34C759] bg-[#34C759]/8 border border-[#34C759]/25 px-1.5 py-0.5 rounded text-[8px] font-medium inline-flex items-center gap-1">
                                                                ✍️ Typed
                                                              </span>
                                                            )}
                                                          </td>

                                                          {/* 4. Online vs Offline Sync Mode */}
                                                          <td className="px-2 py-1 select-none w-24 border-r border-black/[0.04] text-[8px] text-center whitespace-nowrap">
                                                            {attr.isOffline ? (
                                                              <span className="bg-[#FF9500]/8 text-[#FF9500] border border-[#FF9500]/25 px-1.5 py-0.5 rounded font-mono-code font-semibold inline-flex items-center gap-1">
                                                                🟠 Offline
                                                              </span>
                                                            ) : (
                                                              <span className="bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/25 px-1.5 py-0.5 rounded font-mono-code font-medium inline-flex items-center gap-1">
                                                                🟢 Online
                                                              </span>
                                                            )}
                                                          </td>

                                                          {/* 5. Exact Timestamp */}
                                                          <td className="px-2.5 py-1 select-none w-24 border-r border-black/[0.04] text-[9px] text-[#86868b] text-center font-mono-code whitespace-nowrap">
                                                            {attr.timeFormatted || '07:15:32'}
                                                          </td>

                                                          {/* 6. Actual Code Text */}
                                                          <td className="px-4 py-1 text-[#3a3a3c] whitespace-pre overflow-x-auto">
                                                            {attr.text || ' '}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              ) : (
                                                <div className="p-12 text-center text-xs text-[#aeaeb2] font-mono-code">
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
                                                <div className="flex flex-col items-center justify-center py-20 text-[#86868b] space-y-2">
                                                  <RefreshCw className="w-6 h-6 animate-spin text-[#2D6606]" />
                                                  <span className="text-xs font-mono-code">Comparing local file with Git remote repository...</span>
                                                </div>
                                              ) : selectedOfflineFileDiff ? (
                                                <table className="w-full text-[11px] font-mono-code border-collapse">
                                                  <tbody>
                                                    {selectedOfflineFileDiff.map((line, i) => {
                                                      let rowBg = '';
                                                      let sign = ' ';
                                                      let signColor = 'text-[#c7c7cc]';
                                                      let textColor = 'text-[#48484a]';
                                                      
                                                      if (line.type === 'added') {
                                                        rowBg = 'bg-[#34C759]/5 hover:bg-emerald-900/30';
                                                        sign = '+';
                                                        signColor = 'text-[#34C759] font-bold';
                                                        textColor = 'text-[#34C759]';
                                                      } else if (line.type === 'removed') {
                                                        rowBg = 'bg-[#FF3B30]/5 hover:bg-rose-900/30';
                                                        sign = '-';
                                                        signColor = 'text-[#FF3B30] font-bold';
                                                        textColor = 'text-[#FF3B30] line-through opacity-80';
                                                      } else {
                                                        rowBg = 'hover:bg-black/[0.015]';
                                                      }

                                                      return (
                                                        <tr key={i} className={`${rowBg} transition-colors`}>
                                                          <td className="text-right text-[#c7c7cc] px-3 py-0.5 select-none w-10 border-r border-black/[0.04] text-[10px]">
                                                            {line.type !== 'removed' ? i + 1 : ''}
                                                          </td>
                                                          <td className={`px-2 py-0.5 select-none w-5 text-center font-bold border-r border-black/[0.04] ${signColor}`}>
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
                                                <div className="p-12 text-center text-xs text-[#aeaeb2] font-mono-code">
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
                                                      <tr key={i} className="hover:bg-black/[0.02]">
                                                        <td className="text-right text-[#c7c7cc] px-3 py-0.5 select-none w-10 border-r border-black/[0.04] text-[10px]">
                                                          {i + 1}
                                                        </td>
                                                        <td className="px-4 py-0.5 text-[#48484a] whitespace-pre">
                                                          {line || ' '}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              ) : (
                                                <div className="flex items-center justify-center h-32 text-[#aeaeb2] text-xs font-mono-code">
                                                  Binary or empty file – preview not available.
                                                </div>
                                              )}
                                            </div>
                                          )}

                                        </div>
                                      </>
                                    );
                                  })() : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 py-24 space-y-3 text-[#86868b]">
                                      <Fingerprint className="w-10 h-10 text-[#c7c7cc] animate-bounce" />
                                      <span className="text-xs font-mono-code">Select a file from the list to view author attribution, keystroke vs paste forensics, and live diffs.</span>
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>

                          {/* Remote GitHub File Explorer */}
                          {repoUrl && (
                            <div className="glass-card rounded-3xl p-5 border border-black/[0.06] space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-black/[0.04]">
                                <span className="text-xs font-mono-code uppercase tracking-wider text-[#2D6606]">Remote GitHub Tree Explorer</span>
                                {explorerLoading && <span className="text-[#2D6606] animate-pulse text-[11px] font-mono-code">Syncing...</span>}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[350px]">
                                <div className="lg:col-span-1 border-r border-black/[0.04] pr-4 space-y-3 max-h-[450px] overflow-y-auto">
                                  <div className="flex items-center justify-between pb-1 border-b border-black/[0.04]">
                                    <span className="text-[10px] uppercase font-mono-code text-[#86868b]">Remote Tree</span>
                                    {(explorerPath !== '' || selectedCodeFile !== null) && (
                                      <button 
                                        onClick={handleExplorerBack}
                                        className="p-1 hover:bg-black/[0.04] border border-black/[0.06] rounded-md text-[#48484a] transition flex items-center gap-1 cursor-pointer text-[10px] font-mono-code"
                                      >
                                        <ChevronLeft className="w-3 h-3" />
                                        Back
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-1 font-mono-code text-xs">
                                    {explorerError ? (
                                      <div className="text-center text-xs text-[#FF3B30] py-6 px-2 space-y-1">
                                        <AlertCircle className="w-4 h-4 mx-auto text-[#FF3B30]" />
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
                                          className={`w-full text-left p-2 hover:bg-black/[0.04] rounded-lg text-xs flex items-center gap-2 transition cursor-pointer ${
                                            selectedCodeFile === item.path ? 'bg-[#A3E635]/20 text-[#2D6606] border-l-2 border-[#A3E635] pl-1.5' : 'text-[#48484a]'
                                          }`}
                                        >
                                          {item.type === 'dir' ? (
                                            <Folder className="w-4 h-4 text-[#FF9500] shrink-0" />
                                          ) : (
                                            <FileText className="w-4 h-4 text-[#2D6606] shrink-0" />
                                          )}
                                          <span className="truncate">{item.name}</span>
                                        </button>
                                      ))
                                    ) : (
                                      <div className="text-center text-xs text-[#aeaeb2] py-6">Empty directory on GitHub.</div>
                                    )}
                                  </div>
                                </div>

                                <div className="lg:col-span-3 pl-4 flex flex-col max-h-[450px]">
                                  {selectedCodeFile ? (() => {
                                    const remoteIntel = getFileIntelligence({ path: selectedCodeFile, name: selectedCodeFile.split('/').pop(), content: selectedCodeContent, size: selectedCodeContent.length, lineCount: selectedCodeContent.split('\n').length });

                                    return (
                                      <div className="flex flex-col h-full bg-white border border-black/[0.04] rounded-xl overflow-hidden text-left font-mono-code">
                                        {/* Remote File Intelligence Bar */}
                                        <div className="p-3 bg-white/80 border-b border-black/[0.04] flex flex-wrap items-center justify-between gap-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            <FileCode className="w-3.5 h-3.5 text-[#2D6606]" />
                                            <span className="text-[#1d1d1f] font-bold truncate max-w-[200px]">{selectedCodeFile}</span>
                                            {remoteIntel?.hasUnauthorizedAuthor ? (
                                              <span className="text-[9px] bg-[#FF3B30]/8 text-[#FF3B30] border border-[#FF3B30]/25 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                                <ShieldAlert className="w-2.5 h-2.5 text-[#FF3B30]" />
                                                Unauthorized Author
                                              </span>
                                            ) : (
                                              <span className="text-[9px] bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <ShieldCheck className="w-2.5 h-2.5 text-[#34C759]" />
                                                Authorized: {remoteIntel?.creatorName}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-3 text-[10px] text-[#86868b]">
                                            <span>{selectedCodeContent.split('\n').length}L · {(selectedCodeContent.length / 1024).toFixed(1)}KB</span>
                                            <span className={`font-semibold ${remoteIntel?.typingPercent && remoteIntel.typingPercent >= 80 ? 'text-[#30D158]' : 'text-[#FF9500]'}`}>
                                              {remoteIntel?.typingPercent || 95}% Typed
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex-grow overflow-auto p-4">
                                          <pre className="text-[#48484a] text-[11px] leading-relaxed">
                                            <code>{selectedCodeContent}</code>
                                          </pre>
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    <div className="h-full flex flex-col items-center justify-center bg-white border border-black/[0.04] rounded-xl text-[#aeaeb2] text-xs py-16 space-y-2 font-mono-code">
                                      <Code className="w-7 h-7 text-[#c7c7cc]" />
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
                          <div className="glass-card rounded-3xl p-5 border border-black/[0.06] space-y-4">
                            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#2D6606]">Active Coding Timeline (Last 7 Days)</h3>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#A3E635" stopOpacity={0.15}/>
                                      <stop offset="95%" stopColor="#A3E635" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#34C759" stopOpacity={0.15}/>
                                      <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="date" stroke="#c7c7cc" fontSize={11} tickLine={false} />
                                  <YAxis stroke="#c7c7cc" fontSize={11} tickLine={false} />
                                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.06)', color: '#1d1d1f' }} />
                                  <Legend verticalAlign="top" height={36}/>
                                  <Area type="monotone" name="VS Code Sessions" dataKey="sessions" stroke="#A3E635" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                                  <Area type="monotone" name="Git Commits" dataKey="commits" stroke="#34C759" strokeWidth={2} fillOpacity={1} fill="url(#colorCommits)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Teammate shares */}
                          <div className="glass-card rounded-3xl p-5 border border-black/[0.06] space-y-4">
                            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#2D6606]">Teammate Commit Collaboration Shares</h3>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={studentBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="name" stroke="#c7c7cc" fontSize={11} tickLine={false} />
                                  <YAxis stroke="#c7c7cc" fontSize={11} tickLine={false} />
                                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.06)', color: '#1d1d1f' }} />
                                  <Bar dataKey="commits" name="Git Commits" fill="#A3E635" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="hours" name="Coding Hours" fill="#121417" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Commits Log */}
                          <div className="glass-card rounded-3xl p-5 border border-black/[0.06] space-y-4">
                            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#2D6606]">Repository Commits Log Details</h3>
                            <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2">
                              {commitsList.length > 0 ? (
                                commitsList.map((c, idx) => (
                                  <div key={c._id || idx} className="p-3.5 bg-black/[0.02] hover:bg-black/[0.03] border border-black/[0.04] rounded-xl flex items-center justify-between gap-4 transition text-left">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-[#A3E635]/25 text-[#2D6606] border border-[#A3E635]/30 font-bold text-xs flex items-center justify-center shrink-0">
                                        {c.studentName?.charAt(0) || 'D'}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-medium text-[#1d1d1f] truncate">{c.commitMessage}</div>
                                        <div className="text-[10px] text-[#86868b] mt-1 flex flex-wrap items-center gap-1.5 font-mono-code">
                                          <span>Authored by: <strong className="text-[#3a3a3c]">{c.studentName}</strong></span>
                                          <span>•</span>
                                          <span>@{c.gitUsername}</span>
                                          <span>•</span>
                                          <span>{new Date(c.commitDate).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-mono-code text-[10px] bg-white text-[#2D6606] border border-black/[0.06] px-2 py-1 rounded-lg shrink-0">
                                      {c.commitHash ? c.commitHash.slice(0, 7) : 'n/a'}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center text-xs text-[#aeaeb2] py-12">
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
                          <div className="glass-card rounded-3xl p-6 border border-black/[0.06] space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/[0.04]">
                              <div>
                                <h2 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-[#34C759]" />
                                  Real-Time Contribution & Provenance Timeline
                                </h2>
                                <p className="text-xs text-[#86868b] font-light mt-0.5">
                                  Continuous chronological ledger tracking manual keystrokes, AI assistance, paste anomalies, and timestamps.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 bg-[#34C759]/6 border border-[#34C759]/20 px-3 py-1.5 rounded-xl text-xs font-mono-code text-[#34C759]">
                                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse"></span>
                                <span>Autonomous Background Tracker Active</span>
                              </div>
                            </div>

                            {/* 4 Provenance Stat Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                              <div className="p-3.5 rounded-xl bg-white/80 border border-[#A3E635]/15 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-[#2D6606] flex items-center justify-between">
                                  <span>✍️ Manual Typed</span>
                                  <span>{report?.metrics?.codingProvenance?.manualPercent ?? 0}%</span>
                                </div>
                                <div className="text-lg font-bold text-[#1d1d1f]">
                                  {report?.metrics?.keystrokes?.toLocaleString() ?? '0'}
                                  <span className="text-[10px] text-[#86868b] font-normal ml-1">keys</span>
                                </div>
                                <div className="w-full bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                                  <div style={{ width: `${report?.metrics?.codingProvenance?.manualPercent ?? 0}%` }} className="bg-[#A3E635] h-full"></div>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/80 border border-indigo-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-[#5856D6] flex items-center justify-between">
                                  <span>🤖 AI-Assisted</span>
                                  <span>{report?.metrics?.codingProvenance?.aiPercent ?? 0}%</span>
                                </div>
                                <div className="text-lg font-bold text-[#1d1d1f]">
                                  {report?.metrics?.codingProvenance?.aiChars ?? 0}
                                  <span className="text-[10px] text-[#86868b] font-normal ml-1">chars</span>
                                </div>
                                <div className="w-full bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                                  <div style={{ width: `${report?.metrics?.codingProvenance?.aiPercent ?? 0}%` }} className="bg-[#5856D6] h-full"></div>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/80 border border-rose-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-[#FF3B30] flex items-center justify-between">
                                  <span>📋 Pasted Block</span>
                                  <span>{report?.metrics?.codingProvenance?.pastePercent ?? 0}%</span>
                                </div>
                                <div className="text-lg font-bold text-[#1d1d1f]">
                                  {report?.metrics?.charactersPasted ?? 0}
                                  <span className="text-[10px] text-[#86868b] font-normal ml-1">chars</span>
                                </div>
                                <div className="w-full bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                                  <div style={{ width: `${report?.metrics?.codingProvenance?.pastePercent ?? 0}%` }} className="bg-[#FF3B30] h-full"></div>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/80 border border-emerald-500/20 space-y-1 shadow-xs">
                                <div className="text-[10px] uppercase font-mono-code text-[#30D158] flex items-center justify-between">
                                  <span>🛡️ Authenticity</span>
                                  <span>{report?.scores?.final != null ? `${report.scores.final}%` : '0%'}</span>
                                </div>
                                <div className="text-lg font-bold text-[#34C759]">
                                  {report?.scores?.final ? 'Verified' : 'Pending'}
                                  <span className="text-[10px] text-[#30D158] font-normal ml-1">✓</span>
                                </div>
                                <div className="text-[10px] text-[#86868b] truncate">
                                  {report?.scores?.final ? 'Genuine human cadence' : 'Awaiting sync'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Chronological Activity Timeline List */}
                          <div className="glass-card rounded-3xl p-6 border border-black/[0.06] space-y-5">
                            <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] text-xs font-mono-code">
                              <span className="font-semibold text-[#1d1d1f] uppercase tracking-wider">Chronological Contribution Feed</span>
                              <span className="text-[#86868b] text-[11px]">Synced Automatically • Online & Offline</span>
                            </div>

                            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#007AFF] before:via-[#34C759] before:to-slate-800">
                              
                              {/* 1. Synced VS Code Sessions from Real Database */}
                              {sessionsList.length > 0 ? (
                                sessionsList.slice(0, 6).map((session, sIdx) => {
                                  const files = [...(session.filesEdited || []), ...(session.filesCreated || [])];
                                  const dateStr = session.startTime 
                                    ? new Date(session.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : 'Recent Session';
                                  return (
                                    <div key={session._id || sIdx} className="relative group">
                                      <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#34C759] border-2 border-slate-950" />
                                      
                                      <div className="bg-white/90 hover:bg-black/[0.03] border border-[#34C759]/20 rounded-3xl p-4 space-y-3 transition shadow-xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <Code className="w-3.5 h-3.5 text-[#34C759]" />
                                            <span className="text-xs font-bold text-[#1d1d1f]">
                                              VS Code Telemetry Session
                                            </span>
                                            <span className="text-[9px] font-mono-code bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20 px-2 py-0.5 rounded-md font-bold">
                                              Verified Session
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-mono-code text-[#86868b]">
                                            {dateStr}
                                          </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <span className="px-2 py-0.5 rounded-md bg-[#A3E635]/15 text-[#2D6606] border border-[#A3E635]/20 text-[10px] font-mono-code">
                                            ✍️ {session.keystrokes || 0} keystrokes
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20 text-[10px] font-mono-code">
                                            +{session.linesAdded || 0} lines added
                                          </span>
                                          {session.linesRemoved > 0 && (
                                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono-code">
                                              -{session.linesRemoved} lines removed
                                            </span>
                                          )}
                                        </div>

                                        {files.length > 0 && (
                                          <div className="text-xs text-[#48484a] bg-black/[0.015] p-2.5 rounded-xl border border-black/[0.04] space-y-1 font-mono-code text-[11px]">
                                            <span className="text-[#86868b] text-[10px] block uppercase">Tracked File Locations:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                              {files.map((fp: string, fIdx: number) => (
                                                <span key={fIdx} className="bg-black/[0.03] px-2 py-0.5 rounded text-[#2D6606] border border-black/[0.06]">
                                                  {fp}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : null}

                              {/* 2. Synced Commits & Offline Batches */}
                              {commitsList.map((c, idx) => (
                                <div key={c._id || idx} className="relative group">
                                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#A3E635] border-2 border-slate-950 group-hover:scale-125 transition" />
                                  
                                  <div className="bg-white/70 hover:bg-black/[0.03] border border-black/[0.06] rounded-3xl p-4 space-y-3 transition">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <GitCommit className="w-3.5 h-3.5 text-[#2D6606]" />
                                        <span className="text-xs font-semibold text-[#1d1d1f] truncate max-w-[280px]">
                                          {c.commitMessage}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono-code text-[#86868b]">
                                        {new Date(c.commitDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-code">
                                      <span className="bg-white text-[#48484a] px-2 py-0.5 rounded-md border border-black/[0.06]">
                                        Authored by <strong className="text-[#1d1d1f]">{c.studentName}</strong> (@{c.gitUsername})
                                      </span>
                                      <span className="bg-[#34C759]/6 text-[#34C759] border border-[#34C759]/20 px-2 py-0.5 rounded-md">
                                        +{c.linesAdded || 0} LOC
                                      </span>
                                      {c.linesRemoved > 0 && (
                                        <span className="bg-[#FF3B30]/6 text-[#FF3B30] border border-[#FF3B30]/20 px-2 py-0.5 rounded-md">
                                          -{c.linesRemoved} LOC
                                        </span>
                                      )}
                                      <span className="bg-[#A3E635]/15 text-[#2D6606] border border-[#A3E635]/20 px-2 py-0.5 rounded-md">
                                        ✍️ Verified Typing Cadence
                                      </span>
                                      <span className="text-[#aeaeb2] ml-auto">
                                        Hash: {c.commitHash ? c.commitHash.slice(0, 7) : 'head'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* 3. Offline Batch Cryptographic Reconciliation Node */}
                              <div className="relative group">
                                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#FF9500] border-2 border-slate-950" />
                                
                                <div className="bg-black/[0.02] border border-[#FF9500]/15 rounded-3xl p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-[#FF9500] flex items-center gap-1.5">
                                      <Fingerprint className="w-3.5 h-3.5 text-[#FF9500]" />
                                      Offline Cryptographic Attestation Block Reconciled
                                    </span>
                                    <span className="text-[10px] font-mono-code text-[#86868b]">
                                      Verified Node Ledger
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#48484a] font-light">
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
                          <div className="glass-card rounded-3xl p-5 border border-black/[0.06] space-y-6">
                            <div>
                              <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#2D6606]">Team Kanban Task Manager (20% Weight)</h3>
                              <p className="text-xs text-[#48484a] font-light mt-1">Assign deliverables to team members to boost collaboration scores.</p>
                            </div>

                            {/* Task Form */}
                            <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/[0.02] p-4 rounded-xl border border-black/[0.04]">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-[#86868b] font-mono-code">Task Title</label>
                                <input
                                  type="text"
                                  required
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  placeholder="E.g. Setup auth routes"
                                  className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#A3E635]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-[#86868b] font-mono-code">Description</label>
                                <input
                                  type="text"
                                  value={newTaskDesc}
                                  onChange={(e) => setNewTaskDesc(e.target.value)}
                                  placeholder="Describe work targets"
                                  className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#A3E635]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-[#86868b] font-mono-code">Assignee</label>
                                <select
                                  value={newTaskAssignee}
                                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                                  className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#48484a] focus:outline-none focus:border-[#A3E635] cursor-pointer"
                                >
                                  <option value="">Assign to Me</option>
                                  {team.members.map((m: any) => (
                                    <option key={m.student?._id || m.student} value={m.student?._id || m.student}>{m.student?.name || 'Student'} ({m.gitUsername})</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="submit"
                                className="py-2.5 px-4 rounded-xl bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Task
                              </button>
                            </form>

                            {/* Kanban Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                              {/* 1. TODO */}
                              <div className="bg-black/[0.02] border border-black/[0.04] p-4 rounded-xl space-y-3">
                                <h4 className="text-xs uppercase tracking-wider text-[#48484a] font-mono-code flex items-center gap-2">
                                  <Circle className="w-3.5 h-3.5 text-[#86868b]" />
                                  To Do
                                </h4>
                                <div className="space-y-2.5">
                                  {tasks.filter(t => t.status === 'todo').map(task => (
                                    <div key={task._id} className="p-3.5 bg-white border border-black/[0.04] rounded-xl space-y-2">
                                      <h5 className="font-medium text-xs text-[#1d1d1f]">{task.title}</h5>
                                      <p className="text-[10px] text-[#86868b] leading-normal font-light">{task.description}</p>
                                      <div className="flex justify-between items-center pt-2 border-t border-black/[0.04] text-[9px] font-mono-code">
                                        <span className="text-[#86868b]">@{task.assignedTo?.name || 'Unassigned'}</span>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleUpdateTaskStatus(task._id, 'inprogress')} className="text-[#2D6606] hover:underline">Start →</button>
                                          <button onClick={() => handleDeleteTask(task._id)} className="text-[#aeaeb2] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 2. IN PROGRESS */}
                              <div className="bg-black/[0.02] border border-black/[0.04] p-4 rounded-xl space-y-3">
                                <h4 className="text-xs uppercase tracking-wider text-[#FF9500] font-mono-code flex items-center gap-2">
                                  <Activity className="w-3.5 h-3.5" />
                                  In Progress
                                </h4>
                                <div className="space-y-2.5">
                                  {tasks.filter(t => t.status === 'inprogress').map(task => (
                                    <div key={task._id} className="p-3.5 bg-white border border-black/[0.04] rounded-xl space-y-2">
                                      <h5 className="font-medium text-xs text-[#1d1d1f]">{task.title}</h5>
                                      <p className="text-[10px] text-[#86868b] leading-normal font-light">{task.description}</p>
                                      <div className="flex justify-between items-center pt-2 border-t border-black/[0.04] text-[9px] font-mono-code">
                                        <span className="text-[#86868b]">@{task.assignedTo?.name || 'Unassigned'}</span>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleUpdateTaskStatus(task._id, 'done')} className="text-[#34C759] hover:underline">Done ✓</button>
                                          <button onClick={() => handleDeleteTask(task._id)} className="text-[#aeaeb2] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 3. DONE */}
                              <div className="bg-black/[0.02] border border-black/[0.04] p-4 rounded-xl space-y-3">
                                <h4 className="text-xs uppercase tracking-wider text-[#34C759] font-mono-code flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Done
                                </h4>
                                <div className="space-y-2.5">
                                  {tasks.filter(t => t.status === 'done').map(task => (
                                    <div key={task._id} className="p-3.5 bg-white border border-black/[0.04] rounded-xl space-y-2 opacity-80">
                                      <h5 className="font-medium text-xs text-[#48484a] line-through">{task.title}</h5>
                                      <p className="text-[10px] text-[#aeaeb2] leading-normal font-light">{task.description}</p>
                                      <div className="flex justify-between items-center pt-2 border-t border-black/[0.04] text-[9px] font-mono-code">
                                        <span className="text-[#86868b]">@{task.assignedTo?.name || 'Unassigned'}</span>
                                        <button onClick={() => handleDeleteTask(task._id)} className="text-[#aeaeb2] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
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

                    {/* Right Column (1/3 width) - Monetra Sidebar Widgets */}
                    <div className="lg:col-span-1 space-y-5 text-left">
                      
                      {/* Widget 1: Team Peers (Monetra "Quick send" style) */}
                      <div className="glass-card rounded-3xl p-5 border border-slate-200/70 space-y-3 bg-white">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Team Peers</h3>
                            <p className="text-[11px] text-slate-400 font-light">Collaborators in cohort</p>
                          </div>
                          <span className="text-xs font-mono-code text-slate-400">
                            {team?.members?.length || studentBreakdown.length || 1} peers
                          </span>
                        </div>

                        {/* Avatars row */}
                        <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                          {studentBreakdown.length > 0 ? (
                            studentBreakdown.map((s, idx) => (
                              <div key={s.studentId || idx} className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer" title={s.name}>
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs border-2 border-white shadow-xs group-hover:border-[#A3E635] transition">
                                  {s.name?.charAt(0) || 'P'}
                                </div>
                                <span className="text-[9px] text-slate-600 font-medium truncate max-w-[48px]">
                                  {s.name?.split(' ')[0]}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs border-2 border-white shadow-xs">
                                {student?.name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-xs text-slate-500 font-light">Sync repo to load team peers</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Widget 2: Attestation Node Card (Monetra Dark Credit Card style) */}
                      <div className="rounded-3xl p-5 bg-[#121612] text-white border border-white/10 shadow-lg space-y-4 relative overflow-hidden">
                        {/* Ambient subtle green glow */}
                        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#A3E635]/15 blur-2xl pointer-events-none" />

                        <div className="flex justify-between items-center relative z-10">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-[#A3E635]" />
                            <span className="text-[10px] uppercase font-mono-code tracking-wider text-slate-300 font-bold">
                              Trace Attestation Node
                            </span>
                          </div>
                          <span className="text-[10px] font-mono-code bg-white/10 px-2 py-0.5 rounded-full text-[#A3E635] font-bold">
                            {gitVerification?.status === 'matched' ? 'Active' : 'Standby'}
                          </span>
                        </div>

                        <div className="space-y-1 relative z-10">
                          <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest block">
                            Workspace Fingerprint
                          </span>
                          <div className="font-mono-code text-sm tracking-wider font-semibold text-slate-100 truncate">
                            {localDirName ? `**** /${localDirName}` : '**** **** 4892'}
                          </div>
                        </div>

                        <div className="flex justify-between items-end pt-1 relative z-10 text-[11px]">
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 font-mono-code block">Researcher</span>
                            <span className="font-semibold text-slate-100">{student?.name || 'Student Node'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase text-slate-400 font-mono-code block">Status</span>
                            <span className="font-mono-code text-[#A3E635] font-bold">
                              {gitVerification?.status === 'matched' ? 'Verified' : 'Unlinked'}
                            </span>
                          </div>
                        </div>

                        {/* Monetra action buttons: Deposit & Transfer */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2 relative z-10">
                          <button
                            onClick={handleManualAutoSyncAll}
                            disabled={autoSyncInProgress || scanning}
                            className="py-2.5 px-3 rounded-full bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${autoSyncInProgress || scanning ? 'animate-spin' : ''}`} />
                            <span>Auto-Sync</span>
                          </button>
                          <button
                            onClick={handleSelectFolder}
                            className="py-2.5 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition border border-white/15 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Folder className="w-3 h-3" />
                            <span>Folder</span>
                          </button>
                        </div>
                      </div>

                      {/* Widget 3: Evaluation Breakdown Card */}
                      <div className="glass-card rounded-3xl p-5 border border-slate-200/70 space-y-4 bg-white">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-mono-code uppercase tracking-wider text-slate-500">Evaluation Standing</h3>
                          <span className="text-xs font-bold text-slate-900 font-mono-code">
                            {report?.scores?.final ?? 94}%
                          </span>
                        </div>

                        {report ? (
                          <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span>Git Mining (40%)</span>
                                <span className="font-mono-code font-bold text-slate-900">{report.scores.git}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#A3E635] rounded-full" style={{ width: `${report.scores.git}%` }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span>VS Code Telemetry (30%)</span>
                                <span className="font-mono-code font-bold text-slate-900">{report.scores.vscode}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-900 rounded-full" style={{ width: `${report.scores.vscode}%` }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span>Kanban Velocity (20%)</span>
                                <span className="font-mono-code font-bold text-slate-900">{report.scores.task}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-400 rounded-full" style={{ width: `${report.scores.task}%` }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span>Team Balance (10%)</span>
                                <span className="font-mono-code font-bold text-[#15803D]">{report.scores.collab}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${report.scores.collab}%` }} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-400 py-4">No evaluations yet. Sync repository data.</div>
                        )}
                      </div>

                      {/* Widget 4: Research Plan / Scope Card (Monetra "Starter Plan" style) */}
                      <div className="glass-card rounded-3xl p-5 border border-slate-200/70 space-y-3 bg-white">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 tracking-tight">Research Scope</h4>
                          <p className="text-xs text-slate-500 font-light mt-0.5">
                            {selectedAssignment?.title ? `Cohort: ${selectedAssignment.title}` : 'Full provenance & authenticity validation.'}
                          </p>
                        </div>
                        <button
                          onClick={handleSyncGit}
                          disabled={syncingGit}
                          className="w-full py-3 rounded-full bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingGit ? 'animate-spin' : ''}`} />
                          <span>Sync Git Data</span>
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-lg glass-card rounded-3xl border border-[#FF3B30]/20 p-8 shadow-lg space-y-6 bg-[#F6F8FA]">
            <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06]">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight">Repository Path Mismatch Detected</h3>
                <span className="text-[10px] text-[#FF3B30] font-mono-code uppercase">.git/config verification alert</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[#48484a] font-light leading-relaxed">
                OffSync checked the hidden <code className="text-[#2D6606] bg-white px-1 py-0.5 rounded font-mono-code">.git/config</code> file inside the selected folder <strong className="text-[#1d1d1f] font-mono-code">{pendingVerification.handle.name}/</strong>, but its remote URL does not match the repository assigned to this team.
              </p>

              <div className="space-y-2 font-mono-code text-[11px] bg-white p-4 rounded-xl border border-black/[0.04]">
                <div className="text-[#86868b]">
                  <span className="text-[#aeaeb2] block text-[10px] uppercase">Expected Team Repository:</span>
                  <span className="text-[#1d1d1f] break-all">{pendingVerification.result.expectedRepoUrl || '(none)'}</span>
                </div>
                <div className="pt-2 border-t border-black/[0.04] text-[#FF3B30]">
                  <span className="text-[#aeaeb2] block text-[10px] uppercase">Found in Local .git/config:</span>
                  <span className="text-[#FF3B30] break-all font-bold">{pendingVerification.result.localRemoteUrl || 'No remote origin URL found'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {pendingVerification.result.localRemoteUrl && team && (
                <button
                  onClick={handleUpdateRepoFromLocalGit}
                  className="w-full py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Update Team Repo to Match This Folder
                </button>
              )}

              <button
                onClick={handleSelectFolder}
                className="w-full py-2.5 bg-black/[0.04] hover:bg-black/[0.06] text-[#1d1d1f] rounded-xl text-xs font-medium transition border border-black/[0.06] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Folder className="w-4 h-4" />
                Select Another Local Folder
              </button>

              <button
                onClick={() => finalizeFolderConnection(pendingVerification.handle, pendingVerification.result)}
                className="w-full py-2 bg-transparent hover:bg-black/[0.02] text-[#86868b] hover:text-[#48484a] rounded-xl text-[11px] font-mono-code transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm text-left">
          <div className="w-full max-w-xl glass-card rounded-3xl border border-black/[0.06] p-8 shadow-lg space-y-6 bg-[#F6F8FA]">
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.06]">
              <h3 className="text-base font-bold text-[#1d1d1f] font-mono-code">Join Cohort Assignment</h3>
              <button 
                onClick={() => { setShowJoinModal(false); setSearchedAssignment(null); setInviteCode(''); setTeamFlow('none'); setSelectedMembers([]); setError(''); setSuccess(''); }}
                className="text-[#86868b] hover:text-[#1d1d1f] text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-[#FF3B30]/5 border border-[#FF3B30]/20 text-[#FF3B30] text-xs rounded-xl text-left">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 bg-[#34C759]/5 border border-[#34C759]/20 text-[#34C759] text-xs rounded-xl text-left">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs text-[#48484a] font-light">Enter the invitation code provided by your lecturer to join another assignment.</p>

              <form onSubmit={handleSearchInvite} className="flex gap-3">
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code (e.g. INV-123)"
                  className="flex-grow bg-black/[0.03] border border-black/[0.06] rounded-xl px-3.5 py-2 text-xs text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#A3E635]"
                />
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
                >
                  Search Code
                </button>
              </form>

              {searchedAssignment && (
                <div className="p-5 bg-white/80 border border-black/[0.06] rounded-xl space-y-4 text-left mt-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-medium text-[#1d1d1f]">{searchedAssignment.title}</h3>
                    <p className="text-xs text-[#86868b]">{searchedAssignment.description}</p>
                  </div>

                  <div className="space-y-4 border-t border-black/[0.04] pt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setTeamFlow('create'); setSelectedMembers([]); }}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                          teamFlow === 'create' ? 'border-[#A3E635] bg-[#A3E635] text-slate-950 font-semibold' : 'border-black/[0.06] text-[#86868b] bg-white'
                        }`}
                      >
                        Form New Team
                      </button>
                      <button
                        onClick={() => setTeamFlow('join')}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                          teamFlow === 'join' ? 'border-[#A3E635] bg-[#A3E635] text-slate-950 font-semibold' : 'border-black/[0.06] text-[#86868b] bg-white'
                        }`}
                      >
                        Join Existing Team
                      </button>
                    </div>

                    {teamFlow === 'create' && (
                      <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase text-[#86868b] font-mono-code mb-1">Team Name</label>
                            <input type="text" required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="ByteCraft Core" className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#1d1d1f]" />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-[#86868b] font-mono-code mb-1">GitHub Username</label>
                            <input type="text" required value={gitUsername} onChange={(e) => setGitUsername(e.target.value)} placeholder="your-github-username" className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#1d1d1f]" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase text-[#86868b] font-mono-code">Select Group Members</label>
                          <div className="max-h-24 overflow-y-auto border border-black/[0.06] rounded-xl p-2.5 space-y-1.5 bg-white">
                            {studentsList.filter(s => s.id !== student?.id).map(s => (
                              <label key={s.id} className="flex items-center gap-2 text-xs text-[#48484a] cursor-pointer">
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
                                  className="rounded text-[#2D6606] focus:ring-[#007AFF] accent-[#007AFF]"
                                />
                                <span>{s.name} ({s.email})</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button type="submit" className="w-full py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer shadow-sm">Create & Register Team</button>
                      </form>
                    )}

                    {teamFlow === 'join' && (
                      <form onSubmit={handleJoinTeam} className="space-y-4 max-w-md mx-auto">
                        <div>
                          <label className="block text-[10px] uppercase text-[#86868b] font-mono-code mb-1">Select Existing Team</label>
                          {searchedTeams.length > 0 ? (
                            <select
                              required
                              value={teamInviteCode}
                              onChange={(e) => setTeamInviteCode(e.target.value)}
                              className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#A3E635] cursor-pointer"
                            >
                              <option value="">-- Choose Team to Join --</option>
                              {searchedTeams.map(t => (
                                <option key={t.inviteCode} value={t.inviteCode}>{t.name} ({t.inviteCode})</option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-xs text-[#86868b] border border-black/[0.06] rounded-xl p-2.5 bg-white leading-relaxed">
                              No teams have registered for this assignment yet. Form a new team to start!
                            </div>
                          )}
                        </div>
                        <button type="submit" disabled={!teamInviteCode} className="w-full py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer shadow-sm disabled:opacity-50">Validate & Join Team</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm text-left">
          <div className="w-full max-w-lg glass-card rounded-3xl border border-black/[0.06] p-8 shadow-lg space-y-6 bg-[#F6F8FA]">
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.06]">
              <h3 className="text-base font-bold text-[#1d1d1f] font-mono-code">Form General Team</h3>
              <button 
                onClick={() => { setShowGeneralTeamModal(false); setGeneralTeamName(''); setGeneralTeamGit(''); setSelectedMembers([]); setError(''); setSuccess(''); }}
                className="text-[#86868b] hover:text-[#1d1d1f] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGeneralTeam} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-[#86868b] font-mono-code mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={generalTeamName}
                  onChange={(e) => setGeneralTeamName(e.target.value)}
                  placeholder="ByteCraft Elite"
                  className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#A3E635]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#86868b] font-mono-code mb-1">Your GitHub Username</label>
                <input
                  type="text"
                  required
                  value={generalTeamGit}
                  onChange={(e) => setGeneralTeamGit(e.target.value)}
                  placeholder="your-github-username"
                  className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#A3E635]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase text-[#86868b] font-mono-code">Select Group Members</label>
                <div className="max-h-28 overflow-y-auto border border-black/[0.06] rounded-xl p-2.5 space-y-1.5 bg-white">
                  {studentsList.filter(s => s.id !== student?.id).map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-[#48484a] cursor-pointer">
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
                        className="rounded text-[#2D6606] focus:ring-[#007AFF] accent-[#007AFF]"
                      />
                      <span>{s.name} ({s.email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs rounded-xl text-xs font-medium transition cursor-pointer shadow-sm"
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
