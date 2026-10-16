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

  // Modals state
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

  // Teams & Directory
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [showGeneralTeamModal, setShowGeneralTeamModal] = useState(false);
  const [generalTeamName, setGeneralTeamName] = useState('');
  const [generalTeamGit, setGeneralTeamGit] = useState('');
  const [linkInviteCodes, setLinkInviteCodes] = useState<Record<string, string>>({});
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Workspace Scanner & Git
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [localDirName, setLocalDirName] = useState<string>('');
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [offlineEdits, setOfflineEdits] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedOfflineFile, setSelectedOfflineFile] = useState<any>(null);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const [gitVerification, setGitVerification] = useState<GitVerificationResult | null>(null);

  // Status & Telemetry
  const [syncingGit, setSyncingGit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [studentBreakdown, setStudentBreakdown] = useState<any[]>([]);
  const [commitsList, setCommitsList] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'student') {
      router.push('/login?role=student');
      return;
    }
    setStudent(currentUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const data = await api.assignments.getAll();
      setAssignments(data.assignments || []);

      const directoryRes = await api.users.getStudents().catch(() => ({ students: [] }));
      setStudentsList(directoryRes.students || []);

      const teamsRes = await api.teams.getMyTeams().catch(() => ({ teams: [] }));
      setMyTeams(teamsRes.teams || []);

      if (data.assignments && data.assignments.length > 0) {
        setSelectedAssignment(data.assignments[0]);
        await loadStudentContext(data.assignments[0]._id);
      }
    } catch {
      setError('Could not fetch student profiles. Ensure backend server is active.');
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
        }

        const teamAnalyticsRes = await api.analytics.getTeamAnalytics(teamRes.team._id).catch(() => null);
        if (teamAnalyticsRes) {
          if (teamAnalyticsRes.timeline) setTimelineData(teamAnalyticsRes.timeline);
          if (teamAnalyticsRes.studentBreakdown) setStudentBreakdown(teamAnalyticsRes.studentBreakdown);
          if (teamAnalyticsRes.activities) setCommitsList(teamAnalyticsRes.activities);
        }

        await checkAndRestoreWorkspace(assignmentId, teamRes.team);
      } else {
        setTeam(null);
        setTasks([]);
        setReport(null);
        setTimelineData([]);
        setStudentBreakdown([]);
        setCommitsList([]);
      }
    } catch (err) {
      console.error(err);
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
      if (saved && saved.handle) {
        setLocalDirName(saved.folderName);
        const hasPermission = await verifyHandlePermission(saved.handle, false);
        if (hasPermission) {
          setLocalDirHandle(saved.handle);
          const check = await verifyLocalGitRepository(saved.handle, teamObj?.repositoryUrl || repoUrl);
          setGitVerification(check);
        }
      }
    } catch (err) {
      console.warn('Workspace restore error:', err);
    }
  };

  const handleAssignmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = assignments.find((a) => a._id === e.target.value);
    setSelectedAssignment(selected);
    if (selected) {
      await loadStudentContext(selected._id);
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
      setSuccess(`Synced Git! Added ${res.commitsSynced || 0} commits and ${res.prsSynced || 0} PRs.`);
      await loadStudentContext(selectedAssignment._id);
    } catch (err: any) {
      setError(err.message || 'Git sync failed. Check URL or network state.');
    } finally {
      setSyncingGit(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !team || !selectedAssignment) return;
    try {
      await api.tasks.create({
        title: newTaskTitle,
        description: newTaskDesc,
        assignedTo: newTaskAssignee || student?.id,
        teamId: team._id,
        assignmentId: selectedAssignment._id
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      const tasksRes = await api.tasks.getByTeam(team._id);
      setTasks(tasksRes.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Task creation failed.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.tasks.updateStatus(taskId, newStatus);
      if (team) {
        const tasksRes = await api.tasks.getByTeam(team._id);
        setTasks(tasksRes.tasks || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.tasks.delete(taskId);
      if (team) {
        const tasksRes = await api.tasks.getByTeam(team._id);
        setTasks(tasksRes.tasks || []);
      }
    } catch (err) {
      console.error(err);
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
      setError(err.message || 'Invitation template not found.');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedAssignment) return;
    try {
      await api.teams.create({
        name: teamName,
        assignmentId: searchedAssignment._id,
        gitUsername,
        repositoryUrl: repoUrl
      });
      setShowJoinModal(false);
      setSuccess('Team registered successfully!');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Could not form team.');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.teams.join({
        inviteCode: teamInviteCode,
        gitUsername
      });
      setShowJoinModal(false);
      setSuccess('Joined team successfully!');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to join team.');
    }
  };

  const handleCreateGeneralTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.teams.createGeneral({
        name: generalTeamName,
        gitUsername: generalTeamGit,
        memberIds: selectedMembers
      });
      setShowGeneralTeamModal(false);
      setGeneralTeamName('');
      setGeneralTeamGit('');
      setSelectedMembers([]);
      const teamsRes = await api.teams.getMyTeams();
      setMyTeams(teamsRes.teams || []);
    } catch (err: any) {
      setError(err.message || 'Failed to create team.');
    }
  };

  const handleLinkAssignment = async (e: React.FormEvent, teamId: string) => {
    e.preventDefault();
    const code = linkInviteCodes[teamId];
    if (!code) return;
    try {
      await api.teams.addAssignment(teamId, code);
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

      if (selectedAssignment) {
        await saveWorkspaceHandle(selectedAssignment._id, handle, handle.name);
      }
      setLocalDirHandle(handle);
      setLocalDirName(handle.name);
      setSuccess('Workspace connected & verified!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Folder selection error: ' + err.message);
      }
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
    setOfflineEdits([]);
    setGitVerification(null);
    setSuccess('Workspace disconnected.');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col font-sans selection:bg-[#A3E635] selection:text-slate-950">
      <AppHeader user={student} roleTitle="Student Node" badgeVariant="lime" />

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium">
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
            gitVerification={gitVerification}
            scanning={scanning}
            autoSyncInProgress={autoSyncInProgress}
            onManualSync={() => setSuccess('Workspace scan initiated.')}
            onDisconnectWorkspace={handleDisconnectWorkspace}
            onConnectFolder={handleConnectFolder}
            scannedFiles={scannedFiles}
            offlineEdits={offlineEdits}
            selectedOfflineFile={selectedOfflineFile}
            onSelectOfflineFile={setSelectedOfflineFile}
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
              setSelectedMembers([]);
            }}
            linkInviteCodes={linkInviteCodes}
            setLinkInviteCodes={setLinkInviteCodes}
            onLinkAssignment={handleLinkAssignment}
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

      {/* Modals */}
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
      />

      <CreateGeneralTeamModal
        isOpen={showGeneralTeamModal}
        onClose={() => setShowGeneralTeamModal(false)}
        teamName={generalTeamName}
        setTeamName={setGeneralTeamName}
        gitUsername={generalTeamGit}
        setGitUsername={setGeneralTeamGit}
        studentsList={studentsList}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        onCreateTeam={handleCreateGeneralTeam}
      />
    </div>
  );
}
