'use client';

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

interface StudentAssignmentBarProps {
  assignments: any[];
  selectedAssignment: any;
  onAssignmentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onOpenJoinCohort: () => void;
  team: any;
  syncingGit: boolean;
  onSyncGit: () => void;
}

export const StudentAssignmentBar: React.FC<StudentAssignmentBarProps> = ({
  assignments,
  selectedAssignment,
  onAssignmentChange,
  onOpenJoinCohort,
  team,
  syncingGit,
  onSyncGit
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 text-left">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-[#576561] uppercase tracking-wider font-mono">
          Assignment:
        </span>
        <select
          onChange={onAssignmentChange}
          value={selectedAssignment?._id || ''}
          className="bg-white border border-[#6FAF9A]/20 rounded-full px-4 py-1.5 text-xs text-[#0D1110] font-medium outline-none focus:border-[#6FAF9A] shadow-xs cursor-pointer"
        >
          {assignments.map((a) => (
            <option key={a._id} value={a._id}>
              {a.title}
            </option>
          ))}
        </select>
        <button
          onClick={onOpenJoinCohort}
          className="px-3.5 py-1.5 rounded-full bg-[#0D1110] hover:bg-[#1a2220] text-white text-xs font-medium transition shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#6FAF9A]" />
          Join Assignment
        </button>
      </div>

      {team && (
        <div className="flex items-center gap-2">
          <button
            onClick={onSyncGit}
            disabled={syncingGit}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#EFF8F3] text-[#0D1110] text-xs font-medium transition border border-[#6FAF9A]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#6FAF9A] ${syncingGit ? 'animate-spin' : ''}`}
            />
            <span>{syncingGit ? 'Syncing...' : 'Sync Commits'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
