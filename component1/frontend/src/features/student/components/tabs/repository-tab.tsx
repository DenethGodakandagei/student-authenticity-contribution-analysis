'use client';

import React from 'react';
import {
  ExternalLink,
  HardDrive,
  RefreshCw,
  FolderCheck,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  Folder
} from 'lucide-react';
import { GitVerificationResult } from '@/services/gitValidator';

interface RepositoryTabProps {
  repoUrl: string;
  studentBreakdown: any[];
  localDirHandle: any;
  gitVerification: GitVerificationResult | null;
  scanning: boolean;
  autoSyncInProgress: boolean;
  onManualSync: () => void;
  onDisconnectWorkspace: () => void;
  onConnectFolder: () => void;
  scannedFiles: any[];
  offlineEdits: any[];
  selectedOfflineFile: any;
  onSelectOfflineFile: (file: any) => void;
}

export const RepositoryTab: React.FC<RepositoryTabProps> = ({
  repoUrl,
  studentBreakdown,
  localDirHandle,
  gitVerification,
  scanning,
  autoSyncInProgress,
  onManualSync,
  onDisconnectWorkspace,
  onConnectFolder,
  scannedFiles,
  offlineEdits,
  selectedOfflineFile,
  onSelectOfflineFile
}) => {
  return (
    <div className="space-y-6 text-left">
      {/* Repo Meta subheader */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <span className="font-mono text-xs text-slate-900 truncate">
            {repoUrl || 'No Repository Linked'}
          </span>
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-900 hover:underline flex items-center gap-1 font-mono border border-lime-300 bg-lime-50 px-2.5 py-1 rounded-lg"
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
                <span>{member.name}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400">Sync repo to load breakdown.</span>
          )}
        </div>
      </div>

      {/* Physical Project Workspace Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-bold">
                Physical Project Workspace (Auto-Saved & Git Attested)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-light mt-1">
              Connect your local cloned repository once. OffSync inspects the hidden{' '}
              <code className="text-emerald-800 bg-slate-100 px-1 py-0.5 rounded text-[11px]">
                .git/config
              </code>{' '}
              to attest provenance.
            </p>
          </div>

          {localDirHandle ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onManualSync}
                disabled={scanning || autoSyncInProgress}
                className="px-3 py-1.5 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-semibold shadow-xs text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${scanning || autoSyncInProgress ? 'animate-spin' : ''}`}
                />
                <span>{scanning ? 'Scanning...' : 'Rescan & Sync'}</span>
              </button>
              <button
                onClick={onDisconnectWorkspace}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectFolder}
              className="px-4 py-2 bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FolderCheck className="w-4 h-4" />
              Connect Local Repo Folder
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
                  ? 'Git Remote Verified: Authenticity Attested'
                  : 'Git Remote Mismatch Detected'}
              </span>
            </div>
            {gitVerification.localBranch && (
              <span className="text-[11px] bg-white/80 px-2 py-0.5 rounded border border-current">
                branch: {gitVerification.localBranch}
              </span>
            )}
          </div>
        )}

        {/* Scanned files overview */}
        {localDirHandle && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Attestation Engine
              </span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                Real-Time Hash Active
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
