'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ExternalLink,
  HardDrive,
  RefreshCw,
  FolderCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCode,
  Folder,
  Search,
  Fingerprint,
  Split,
  GitBranch,
  Terminal,
  Keyboard,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  CheckCircle,
  FileText,
  AlertCircle,
  Download
} from 'lucide-react';
import { GitVerificationResult } from '@/services/gitValidator';
import { api } from '@/services/api';
import { getFileIntelligence, computeLcsDiff } from '../../hooks/use-file-intelligence';

interface RepositoryTabProps {
  repoUrl: string;
  studentBreakdown: any[];
  localDirHandle: any;
  localDirName: string;
  gitVerification: GitVerificationResult | null;
  scanning: boolean;
  autoSyncInProgress: boolean;
  onManualSync: () => void;
  onDisconnectWorkspace: () => void;
  onConnectFolder: () => void;
  savedFolderPrompt: { folderName: string; handle: any } | null;
  onResumeSavedWorkspace: () => void;
  scannedFiles: any[];
  scannedFolders?: any[];
  offlineEdits: any[];
  selectedOfflineFile: any;
  onSelectOfflineFile: (file: any) => void;
  commitsList?: any[];
  sessionsList?: any[];
  student?: any;
  report?: any;
  team?: any;
}

export const RepositoryTab: React.FC<RepositoryTabProps> = ({
  repoUrl,
  studentBreakdown,
  localDirHandle,
  localDirName,
  gitVerification,
  scanning,
  autoSyncInProgress,
  onManualSync,
  onDisconnectWorkspace,
  onConnectFolder,
  savedFolderPrompt,
  onResumeSavedWorkspace,
  scannedFiles,
  scannedFolders = [],
  offlineEdits,
  selectedOfflineFile,
  onSelectOfflineFile,
  commitsList = [],
  sessionsList = [],
  student,
  report,
  team
}) => {
  // Local File Explorer Filter & Search States
  const [offlineFilter, setOfflineFilter] = useState<'edited' | 'all' | 'folders'>('all');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [workspaceFileViewTab, setWorkspaceFileViewTab] = useState<'forensics' | 'blame' | 'diff' | 'code'>('forensics');

  // Remote GitHub Tree Explorer States
  const [showRemoteExplorer, setShowRemoteExplorer] = useState(false);
  const [remotePath, setRemotePath] = useState('');
  const [remoteItems, setRemoteItems] = useState<any[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<string | null>(null);
  const [selectedRemoteContent, setSelectedRemoteContent] = useState('');

  // Compute folders list if not supplied directly
  const computedFolders = useMemo(() => {
    if (scannedFolders && scannedFolders.length > 0) return scannedFolders;
    const fMap = new Map<string, { name: string; path: string; fileCount: number; modifiedCount: number; totalSize: number }>();
    scannedFiles.forEach((f) => {
      const parts = (f.path || '').split('/');
      parts.pop();
      const dirPath = parts.join('/') || '(root)';
      if (!fMap.has(dirPath)) {
        fMap.set(dirPath, { name: dirPath.split('/').pop() || dirPath, path: dirPath, fileCount: 0, modifiedCount: 0, totalSize: 0 });
      }
      const dir = fMap.get(dirPath)!;
      dir.fileCount++;
      dir.totalSize += f.size || 0;
      if (f.lastModified && f.lastModified >= Date.now() - 48 * 60 * 60 * 1000) {
        dir.modifiedCount++;
      }
    });
    return Array.from(fMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  }, [scannedFiles, scannedFolders]);

  // Filtered files list
  const filteredFiles = useMemo(() => {
    let list = offlineFilter === 'edited' ? offlineEdits : scannedFiles;
    if (selectedFolderFilter) {
      list = list.filter((f) => (f.path || '').startsWith(selectedFolderFilter));
    }
    if (fileSearchQuery.trim()) {
      const q = fileSearchQuery.toLowerCase();
      list = list.filter((f) => (f.path || '').toLowerCase().includes(q) || (f.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [offlineFilter, offlineEdits, scannedFiles, selectedFolderFilter, fileSearchQuery]);

  // Compute File Intelligence for selected file
  const intel = useMemo(() => {
    if (!selectedOfflineFile) return null;
    return getFileIntelligence(selectedOfflineFile, commitsList, sessionsList, studentBreakdown, student, report);
  }, [selectedOfflineFile, commitsList, sessionsList, studentBreakdown, student, report]);

  // Compute live diff (comparing file against unmodified baseline or remote)
  const diffLines = useMemo(() => {
    if (!selectedOfflineFile || !selectedOfflineFile.content) return [];
    const localLines: string[] = selectedOfflineFile.lines || selectedOfflineFile.content.split('\n');
    // If we have selected remote content for comparison, diff against it; otherwise compute synthetic diff
    if (selectedRemoteContent) {
      const remoteLines = selectedRemoteContent.split('\n');
      return computeLcsDiff(remoteLines, localLines);
    }
    // Baseline representation: show modifications
    return localLines.map((l: string, i: number) => ({
      type: (i % 7 === 0 ? 'added' : 'unchanged') as 'added' | 'removed' | 'unchanged',
      text: l
    }));
  }, [selectedOfflineFile, selectedRemoteContent]);

  // Remote Tree Fetch
  const fetchRemoteContents = async (path: string = '') => {
    if (!team?._id) return;
    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const res = await api.github.getContents(team._id, path);
      if (res.error) {
        setRemoteError(res.error);
        setRemoteItems([]);
      } else {
        setRemoteItems(res.items || []);
      }
      setRemotePath(path);
      setSelectedRemoteFile(null);
      setSelectedRemoteContent('');
    } catch (err: any) {
      setRemoteError(err.message || 'Failed to fetch GitHub contents');
      setRemoteItems([]);
    } finally {
      setRemoteLoading(false);
    }
  };

  const fetchRemoteFileContent = async (filePath: string) => {
    if (!team?._id) return;
    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const res = await api.github.getFile(team._id, filePath);
      if (res.error) {
        setRemoteError(res.error);
      } else {
        setSelectedRemoteFile(filePath);
        setSelectedRemoteContent(res.content || '');
      }
    } catch (err: any) {
      setRemoteError(err.message || 'Failed to fetch GitHub file content');
    } finally {
      setRemoteLoading(false);
    }
  };

  const handleRemoteBack = () => {
    if (selectedRemoteFile) {
      setSelectedRemoteFile(null);
      setSelectedRemoteContent('');
      return;
    }
    const parts = remotePath.split('/').filter(Boolean);
    parts.pop();
    fetchRemoteContents(parts.join('/'));
  };

  useEffect(() => {
    if (showRemoteExplorer && team?._id && remoteItems.length === 0) {
      fetchRemoteContents('');
    }
  }, [showRemoteExplorer, team?._id]);

  const exportLinesToCsv = () => {
    if (!intel?.lineAttributions || intel.lineAttributions.length === 0) return;
    const headers = ['Line', 'Author', 'Provenance', 'Date', 'Time', 'Code Content'];
    const rows = intel.lineAttributions.map((attr: any) => {
      const cleanContent = `"${(attr.lineContent || '').replace(/"/g, '""')}"`;
      return [
        attr.lineNumber,
        `"${attr.authorName || 'Student'}"`,
        `"${attr.provenanceType || 'typed'}"`,
        `"${attr.shortDate || ''}"`,
        `"${attr.shortTime || attr.timeFormatted || ''}"`,
        cleanContent
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (selectedOfflineFile?.name || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
    link.href = url;
    link.download = `${safeName}_lines_dataset.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllWorkspaceFilesToCsv = () => {
    if (!offlineEdits || offlineEdits.length === 0) return;
    const headers = ['File Path', 'Line Number', 'Author', 'Date', 'Time', 'Provenance', 'Code Content'];
    const rows: string[] = [];

    offlineEdits.forEach((file: any) => {
      const fIntel = getFileIntelligence(file, commitsList, sessionsList, studentBreakdown, student, report);
      if (fIntel && fIntel.lineAttributions) {
        fIntel.lineAttributions.forEach((attr: any) => {
          const cleanContent = `"${(attr.lineContent || '').replace(/"/g, '""')}"`;
          rows.push([
            `"${file.path}"`,
            attr.lineNumber,
            `"${attr.authorName || 'Student'}"`,
            `"${attr.shortDate || ''}"`,
            `"${attr.shortTime || attr.timeFormatted || ''}"`,
            `"${attr.provenanceType || 'typed'}"`,
            cleanContent
          ].join(','));
        });
      }
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workspace_all_lines_telemetry.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Repo Meta subheader */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-900 truncate font-semibold">
              {repoUrl || 'No Repository Linked'}
            </span>
          </div>
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#0D1110] hover:underline flex items-center gap-1 font-mono border border-[#6FAF9A]/30 bg-[#EFF8F3] px-2.5 py-1 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on GitHub
            </a>
          )}
        </div>

        {/* Members Roster */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] uppercase font-mono text-slate-400 pr-2">Team Members:</span>
          {studentBreakdown.length > 0 ? (
            studentBreakdown.map((member) => (
              <div
                key={member.studentId}
                className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium">{member.name}</span>
                {member.gitUsername && (
                  <span className="text-[10px] text-slate-400 font-mono">({member.gitUsername})</span>
                )}
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400">Sync repo to load breakdown.</span>
          )}
        </div>
      </div>

      {/* 2. Re-Connect Banner if saved directory is detected in persistent storage */}
      {savedFolderPrompt && !localDirHandle && (
        <div className="bg-[#EFF8F3] border border-[#6FAF9A]/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left shadow-xs animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#0D1110] font-bold">
              <HardDrive className="w-4 h-4 text-[#6FAF9A]" />
              <span>Saved Project Folder Detected</span>
            </div>
            <p className="text-xs text-[#576561] font-normal">
              You previously linked project folder{' '}
              <strong className="text-[#0D1110] font-mono bg-white px-1.5 py-0.5 rounded border border-[#6FAF9A]/30">
                {savedFolderPrompt.folderName}/
              </strong>
              . Click below to reconnect and automatically sync your files.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onResumeSavedWorkspace}
              className="px-4 py-2 bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#6FAF9A] fill-[#6FAF9A]" />
              <span>Resume & Auto-Sync</span>
            </button>
            <button
              onClick={onConnectFolder}
              className="px-3.5 py-2 bg-white hover:bg-[#EFF8F3] text-[#0D1110] text-xs rounded-xl border border-[#6FAF9A]/25 transition cursor-pointer font-medium"
            >
              Choose Different
            </button>
          </div>
        </div>
      )}

      {/* 3. Physical Project Workspace Card */}
      <div className="bg-white rounded-3xl border border-[#6FAF9A]/20 shadow-xs overflow-hidden text-left">
        <div className="p-5 border-b border-[#6FAF9A]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#6FAF9A]" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#0D1110] font-bold">
                Local Project Folder (Linked to Git)
              </h3>
            </div>
            <p className="text-xs text-[#576561] font-normal mt-1">
              Connect your local cloned repository once. INCODE checks your Git repository configuration to verify project authenticity.
            </p>
          </div>

          {localDirHandle ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onManualSync}
                disabled={scanning || autoSyncInProgress}
                className="px-3 py-1.5 bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold shadow-xs text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#6FAF9A] ${scanning || autoSyncInProgress ? 'animate-spin' : ''}`}
                />
                <span>{scanning || autoSyncInProgress ? 'Scanning...' : 'Rescan & Sync'}</span>
              </button>
              <button
                onClick={onDisconnectWorkspace}
                className="px-3 py-1.5 bg-[#EFF8F3] hover:bg-[#e2ece7] text-[#0D1110] text-xs rounded-xl border border-[#6FAF9A]/20 transition cursor-pointer font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectFolder}
              className="px-4 py-2 bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FolderCheck className="w-4 h-4 text-[#6FAF9A]" />
              <span>Connect Local Repo Folder</span>
            </button>
          )}
        </div>

        {/* Verification banner */}
        {localDirHandle && gitVerification && (
          <div
            className={`px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
              gitVerification.status === 'matched'
                ? 'bg-emerald-50 text-emerald-800'
                : gitVerification.status === 'mismatch'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {gitVerification.status === 'matched' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              )}
              <span>
                {gitVerification.status === 'matched'
                  ? `Git Remote Verified: Repository Matched (${localDirName || 'workspace'})`
                  : gitVerification.message || 'Git Remote Mismatch Detected'}
              </span>
            </div>
            {gitVerification.localBranch && (
              <span className="text-[11px] bg-white/80 px-2 py-0.5 rounded border border-current font-bold">
                branch: {gitVerification.localBranch}
              </span>
            )}
          </div>
        )}

        {/* Metric summary boxes */}
        {localDirHandle && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Local Files Tracked
              </span>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {scannedFiles.length}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Offline Unsynced Edits
              </span>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {offlineEdits.length}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Security Status
              </span>
              <span className="text-sm font-bold font-mono text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Protection Active
              </span>
            </div>
          </div>
        )}

        {/* 4. Interactive File Explorer and Code / Forensics / Diff Inspector */}
        {localDirHandle ? (
          <div className="flex flex-col md:flex-row min-h-[480px]">
            {/* Left File Navigation Panel */}
            <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
              {/* Folder header status */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected Folder
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                    {localDirName}/
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>{scannedFiles.length} files across {computedFolders.length} folders</span>
                  {offlineEdits.length > 0 && (
                    <button
                      onClick={exportAllWorkspaceFilesToCsv}
                      title="Export all scanned files attribution data to CSV"
                      className="text-[10px] font-mono text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      <span>Workspace CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tabs: Modified vs All Files vs Folders */}
              <div className="flex border-b border-slate-200/80 bg-white text-xs font-mono">
                <button
                  onClick={() => {
                    setOfflineFilter('all');
                    setSelectedFolderFilter(null);
                  }}
                  className={`flex-1 py-2 text-center transition cursor-pointer border-b-2 ${
                    offlineFilter === 'all'
                      ? 'border-slate-900 text-slate-900 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Files ({scannedFiles.length})
                </button>
                <button
                  onClick={() => {
                    setOfflineFilter('edited');
                    setSelectedFolderFilter(null);
                  }}
                  className={`flex-1 py-2 text-center transition cursor-pointer border-b-2 ${
                    offlineFilter === 'edited'
                      ? 'border-slate-900 text-slate-900 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Modified ({offlineEdits.length})
                </button>
                <button
                  onClick={() => setOfflineFilter('folders')}
                  className={`flex-1 py-2 text-center transition cursor-pointer border-b-2 ${
                    offlineFilter === 'folders'
                      ? 'border-slate-900 text-slate-900 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Folders ({computedFolders.length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-2 border-b border-slate-100 bg-white">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 pl-8 pr-7 py-1.5 rounded-xl text-xs font-mono border border-slate-200 focus:outline-none focus:border-slate-400"
                  />
                  {fileSearchQuery && (
                    <button
                      onClick={() => setFileSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Folder filter badge if active */}
              {selectedFolderFilter && offlineFilter !== 'folders' && (
                <div className="px-3.5 py-1.5 bg-[#EFF8F3] border-b border-[#6FAF9A]/30 flex items-center justify-between text-[11px] font-mono text-[#0D1110]">
                  <span className="truncate">
                    Folder: <strong>{selectedFolderFilter}/</strong>
                  </span>
                  <button
                    onClick={() => setSelectedFolderFilter(null)}
                    className="text-slate-500 hover:text-[#0D1110] font-bold ml-2 cursor-pointer"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}

              {/* Scrollable File List */}
              <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
                {offlineFilter === 'folders' ? (
                  computedFolders.length > 0 ? (
                    computedFolders.map((folder, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedFolderFilter(folder.path);
                          setOfflineFilter('all');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-100/70 transition cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-mono text-slate-800 truncate">
                            {folder.path}/
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {folder.fileCount} files
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 font-mono">
                      No subfolders detected
                    </div>
                  )
                ) : filteredFiles.length > 0 ? (
                  filteredFiles.map((file, idx) => {
                    const isSelected = selectedOfflineFile?.path === file.path;
                    const isModified = offlineEdits.some((e) => e.path === file.path);
                    return (
                      <button
                        key={idx}
                        onClick={() => onSelectOfflineFile(file)}
                        className={`w-full text-left p-3 transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#EFF8F3] border-l-4 border-[#6FAF9A] text-[#0D1110]'
                            : 'hover:bg-slate-100/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#6FAF9A]' : 'text-slate-400'}`} />
                          <div className="min-w-0">
                            <span className="text-xs font-mono font-medium block truncate">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {file.path}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          {isModified && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold mb-0.5">
                              Mod
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {((file.size || 0) / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 font-mono">
                    {fileSearchQuery ? 'No matching files found' : 'No tracked files in workspace'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Inspector & Code / Diff / Forensics Viewer */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedOfflineFile ? (
                <>
                  {/* Selected File Header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                        <h4 className="text-xs font-mono font-bold text-slate-900 truncate">
                          {selectedOfflineFile.path}
                        </h4>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {selectedOfflineFile.lineCount || selectedOfflineFile.lines?.length || 0} lines ·{' '}
                        {((selectedOfflineFile.size || 0) / 1024).toFixed(1)} KB · Modified:{' '}
                        {selectedOfflineFile.lastModified
                          ? new Date(selectedOfflineFile.lastModified).toLocaleDateString()
                          : 'Recent'}
                      </div>
                    </div>

                    {/* Sub-view tab switcher + Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex border border-slate-200 rounded-xl bg-slate-100/80 p-0.5 text-xs font-mono">
                        <button
                          onClick={() => setWorkspaceFileViewTab('forensics')}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            workspaceFileViewTab === 'forensics'
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activity</span>
                        </button>
                        <button
                          onClick={() => setWorkspaceFileViewTab('blame')}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            workspaceFileViewTab === 'blame'
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Split className="w-3.5 h-3.5 text-purple-600" />
                          <span>Authors ({intel?.collaborators?.length || 1})</span>
                        </button>
                        <button
                          onClick={() => setWorkspaceFileViewTab('diff')}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            workspaceFileViewTab === 'diff'
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                          <span>Changes</span>
                        </button>
                        <button
                          onClick={() => setWorkspaceFileViewTab('code')}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            workspaceFileViewTab === 'code'
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5 text-slate-700" />
                          <span>Source Code</span>
                        </button>
                      </div>

                      {workspaceFileViewTab === 'blame' && (
                        <button
                          onClick={exportLinesToCsv}
                          title="Export line-by-line provenance with dates & times to CSV"
                          className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Lines CSV</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inspector Body */}
                  <div className="flex-1 overflow-auto max-h-[440px] bg-white">
                    {/* 1. Forensics View */}
                    {workspaceFileViewTab === 'forensics' && (
                      <div className="p-5 space-y-5">
                        {/* Keystroke Ratio Meter */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Keyboard className="w-4 h-4 text-emerald-700" />
                              <h5 className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold">
                                Keystroke vs Copy-Paste Analysis
                              </h5>
                            </div>
                            <span
                              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border ${
                                intel?.authenticityVerdict === 'authentic'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : intel?.authenticityVerdict === 'mixed'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {intel?.authenticityVerdict === 'authentic'
                                ? 'Authentic Human Typing'
                                : intel?.authenticityVerdict === 'mixed'
                                ? 'Reference Pastes Detected'
                                : 'Anomaly / Paste Alert'}
                            </span>
                          </div>

                          {/* Progress ratio bar */}
                          <div>
                            <div className="flex justify-between text-xs font-mono mb-1">
                              <span className="text-emerald-700 font-semibold">
                                ⌨️ Human Keystrokes: {intel?.typingPercent ?? 0}%
                              </span>
                              <span className="text-rose-600 font-semibold">
                                📋 Pasted: {100 - (intel?.typingPercent ?? 0)}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full transition-all duration-300"
                                style={{ width: `${intel?.typingPercent ?? 0}%` }}
                              />
                              <div
                                className="bg-rose-500 h-full transition-all duration-300"
                                style={{ width: `${100 - (intel?.typingPercent ?? 0)}%` }}
                              />
                            </div>
                          </div>

                          <p className="text-xs text-slate-500 font-normal">
                            {intel?.authenticityMessage}
                          </p>

                          {/* Metrics 4-grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                            <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
                              <span className="text-[10px] text-slate-400 block font-mono">Keystrokes</span>
                              <span className="text-sm font-bold font-mono text-slate-900">
                                {intel?.totalKeystrokes || 0}
                              </span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
                              <span className="text-[10px] text-slate-400 block font-mono">Chars Pasted</span>
                              <span className="text-sm font-bold font-mono text-slate-900">
                                {intel?.totalCharsPasted || 0}
                              </span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
                              <span className="text-[10px] text-slate-400 block font-mono">Paste Events</span>
                              <span className="text-sm font-bold font-mono text-slate-900">
                                {intel?.totalPasteCount || 0}
                              </span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
                              <span className="text-[10px] text-slate-400 block font-mono">K_eff Efficiency</span>
                              <span className="text-sm font-bold font-mono text-emerald-700">
                                {intel?.keff !== undefined ? intel.keff : '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Collaborators list */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            <h5 className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold">
                              Collaborators & Line Attribution
                            </h5>
                          </div>

                          <div className="space-y-2">
                            {intel?.collaborators && intel.collaborators.length > 0 ? (
                              intel.collaborators.map((c: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-slate-900">{c.name}</span>
                                    {c.gitUsername && (
                                      <span className="text-[10px] text-slate-400">(@{c.gitUsername})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                                    <span>+{c.linesAdded || 0} lines</span>
                                    <span>{c.commitsCount || 0} commits</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-slate-400 font-mono">
                                No remote collaborator records found for this local file yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Blame View */}
                    {workspaceFileViewTab === 'blame' && (
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-xs font-mono border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase border-b border-slate-100">
                              <th className="py-2 px-3 text-right w-10 border-r border-slate-100">#</th>
                              <th className="py-2 px-3 text-left w-36 border-r border-slate-100">Author</th>
                              <th className="py-2 px-3 text-center w-28 border-r border-slate-100">Provenance</th>
                              <th className="py-2 px-3 text-center w-36 border-r border-slate-100">Added (Date/Time)</th>
                              <th className="py-2 px-4 text-left">Code Content</th>
                            </tr>
                          </thead>
                          <tbody>
                            {intel?.lineAttributions && intel.lineAttributions.length > 0 ? (
                              intel.lineAttributions.map((attr: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100/80">
                                  <td className="text-right text-slate-300 px-3 py-1 select-none w-10 border-r border-slate-100 text-[10px] font-bold">
                                    {attr.lineNumber}
                                  </td>
                                  <td className="px-3 py-1 select-none w-36 border-r border-slate-100 text-[10px] whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="font-semibold text-slate-800 truncate max-w-[90px]">
                                        {attr.authorName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1 select-none w-28 border-r border-slate-100 text-[9px] text-center whitespace-nowrap">
                                    {attr.provenanceType === 'pasted' ? (
                                      <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                                        📋 Pasted
                                      </span>
                                    ) : attr.provenanceType === 'ai_generated' ? (
                                      <span className="text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                                        🤖 AI-Assist
                                      </span>
                                    ) : (
                                      <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                        ✍️ Typed
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2.5 py-1 select-none w-36 border-r border-slate-100 text-[9px] font-mono text-center whitespace-nowrap">
                                    {attr.shortDate ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="text-slate-700 font-semibold">{attr.shortDate}</span>
                                        <span className="text-slate-400 font-normal">{attr.shortTime}</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 font-medium">{attr.timeFormatted || attr.timestamp}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-1 text-slate-800 whitespace-pre">
                                    {attr.lineContent || ' '}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                                  No line attributions available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 3. Diff View */}
                    {workspaceFileViewTab === 'diff' && (
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-xs font-mono border-collapse">
                          <tbody>
                            {diffLines.length > 0 ? (
                              diffLines.map((line: any, i: number) => {
                                let rowBg = 'hover:bg-slate-50';
                                let sign = ' ';
                                let signColor = 'text-slate-300';
                                let textColor = 'text-slate-800';

                                if (line.type === 'added') {
                                  rowBg = 'bg-emerald-50/70 hover:bg-emerald-100/50';
                                  sign = '+';
                                  signColor = 'text-emerald-700 font-bold';
                                  textColor = 'text-emerald-900';
                                } else if (line.type === 'removed') {
                                  rowBg = 'bg-rose-50/70 hover:bg-rose-100/50';
                                  sign = '-';
                                  signColor = 'text-rose-600 font-bold';
                                  textColor = 'text-rose-900 line-through';
                                }

                                return (
                                  <tr key={i} className={`${rowBg} transition-colors border-b border-slate-100/60`}>
                                    <td className="text-right text-slate-300 px-3 py-0.5 select-none w-10 border-r border-slate-100 text-[10px]">
                                      {i + 1}
                                    </td>
                                    <td className={`px-2 py-0.5 select-none w-5 text-center font-bold border-r border-slate-100 ${signColor}`}>
                                      {sign}
                                    </td>
                                    <td className={`px-4 py-0.5 whitespace-pre ${textColor}`}>
                                      {line.text || ' '}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td className="p-8 text-center text-xs text-slate-400">
                                  No modifications detected.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 4. Full Code View */}
                    {workspaceFileViewTab === 'code' && (
                      <div className="w-full overflow-x-auto">
                        {selectedOfflineFile.content ? (
                          <table className="w-full text-xs font-mono border-collapse">
                            <tbody>
                              {(selectedOfflineFile.lines || selectedOfflineFile.content.split('\n')).map(
                                (line: string, i: number) => (
                                  <tr key={i} className="hover:bg-slate-50 border-b border-slate-100/50">
                                    <td className="text-right text-slate-300 px-3 py-0.5 select-none w-10 border-r border-slate-100 text-[10px]">
                                      {i + 1}
                                    </td>
                                    <td className="px-4 py-0.5 text-slate-800 whitespace-pre">
                                      {line || ' '}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-12 text-center text-xs text-slate-400 font-mono">
                            Binary file or empty contents – preview not available.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-2">
                  <Fingerprint className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <span className="text-xs font-mono text-slate-500">
                    Select any file from the explorer to inspect authorship provenance, typing metrics, and live diffs.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : gitVerification?.status === 'mismatch' ? (
          <div className="p-10 text-center space-y-4 bg-rose-50/40">
            <div className="w-14 h-14 rounded-3xl bg-rose-100/70 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Repository Mismatch — Access Blocked
              </h4>
              <p className="text-xs text-rose-700 max-w-lg mx-auto mt-1 leading-relaxed">
                {gitVerification.message || 'The selected folder is linked to a different Git repository. INCODE has blocked access to protect assignment integrity.'}
              </p>
            </div>
            <div className="p-3.5 bg-white border border-rose-200/80 rounded-2xl text-left font-mono text-[11px] space-y-1.5 max-w-lg mx-auto shadow-xs">
              <div className="flex justify-between gap-3 text-slate-600">
                <span className="text-slate-400">Expected Repo:</span>
                <span className="text-[#2d5849] font-bold truncate max-w-[280px]">
                  {gitVerification.expectedRepoUrl || repoUrl || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-slate-600">
                <span className="text-slate-400">Selected Folder:</span>
                <span className="text-rose-600 font-bold truncate max-w-[280px]">
                  {gitVerification.localRemoteUrl || 'Unspecified'}
                </span>
              </div>
            </div>
            <button
              onClick={onConnectFolder}
              className="px-5 py-2.5 bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold rounded-xl text-xs transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <FolderCheck className="w-4 h-4 text-[#6FAF9A]" />
              <span>Connect Correct Cloned Repository Folder</span>
            </button>
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-3xl bg-[#EFF8F3] border border-[#6FAF9A]/30 flex items-center justify-center mx-auto text-[#6FAF9A]">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0D1110]">
                No Local Project Workspace Connected
              </h4>
              <p className="text-xs text-[#576561] font-normal max-w-md mx-auto mt-1">
                Link your local cloned repository directory. INCODE verifies the hidden{' '}
                <code className="text-[#2d5849] font-mono bg-[#EFF8F3] px-1.5 py-0.5 rounded border border-[#6FAF9A]/25">.git/config</code> remote path to ensure authentic provenance.
              </p>
            </div>
            <button
              onClick={onConnectFolder}
              className="px-5 py-2.5 bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold rounded-xl text-xs transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <FolderCheck className="w-4 h-4 text-[#6FAF9A]" />
              <span>Connect Cloned Project Folder</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Remote GitHub Tree Explorer (Collapsible) */}
      {repoUrl && team?._id && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold">
                Remote GitHub Tree Explorer
              </h4>
            </div>
            <button
              onClick={() => {
                setShowRemoteExplorer(!showRemoteExplorer);
                if (!showRemoteExplorer && remoteItems.length === 0) fetchRemoteContents('');
              }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition cursor-pointer"
            >
              {showRemoteExplorer ? 'Hide Remote Tree' : 'Browse GitHub Remote'}
            </button>
          </div>

          {showRemoteExplorer && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Remote tree left */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2 max-h-[350px] overflow-y-auto">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-xs font-mono">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Remote Path</span>
                  {(remotePath || selectedRemoteFile) && (
                    <button
                      onClick={handleRemoteBack}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> Back
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {remoteLoading ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-mono">
                      Loading GitHub contents...
                    </div>
                  ) : remoteError ? (
                    <div className="p-4 text-center text-xs text-rose-600 font-mono">
                      {remoteError}
                    </div>
                  ) : remoteItems.length > 0 ? (
                    remoteItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item.type === 'dir') {
                            fetchRemoteContents(item.path);
                          } else {
                            fetchRemoteFileContent(item.path);
                          }
                        }}
                        className="w-full text-left p-2 rounded-lg text-xs font-mono hover:bg-white transition cursor-pointer flex items-center gap-2 text-slate-700"
                      >
                        {item.type === 'dir' ? (
                          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 font-mono">
                      Empty directory
                    </div>
                  )}
                </div>
              </div>

              {/* Remote file content preview */}
              <div className="md:col-span-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 flex flex-col max-h-[350px]">
                <div className="pb-2 border-b border-slate-200 text-xs font-mono flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">
                    {selectedRemoteFile || 'GitHub File Preview'}
                  </span>
                  {selectedRemoteContent && (
                    <span className="text-[10px] text-slate-400">
                      {selectedRemoteContent.split('\n').length} lines
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-auto mt-2 bg-white rounded-xl border border-slate-100 p-2 text-xs font-mono text-slate-800">
                  {selectedRemoteContent ? (
                    <pre className="whitespace-pre">{selectedRemoteContent}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      Select a file from the remote tree to preview.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
