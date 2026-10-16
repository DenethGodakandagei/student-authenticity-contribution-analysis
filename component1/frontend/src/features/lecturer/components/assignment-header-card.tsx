'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AssignmentHeaderCardProps {
  assignment: any;
}

export const AssignmentHeaderCard: React.FC<AssignmentHeaderCardProps> = ({ assignment }) => {
  if (!assignment) return null;

  const weights = assignment.weights || { git: 40, vscode: 30, task: 20, collab: 10 };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-left space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-700 font-mono bg-slate-50">
              Type: {assignment.assignmentType || 'Team'}
            </span>
            {assignment.invitationCode && (
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-700 font-mono bg-slate-50">
                Invite: {assignment.invitationCode}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{assignment.title}</h2>
          <p className="text-slate-500 text-xs max-w-4xl leading-relaxed">{assignment.description}</p>
        </div>

        <div className="flex flex-col justify-between items-end md:border-l border-slate-100 md:pl-6 shrink-0 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Deadline: {formatDate(assignment.deadline)}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] block uppercase text-slate-400 font-bold tracking-wider mb-1 font-mono">
              Weights Allocation
            </span>
            <div className="flex gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Git {weights.git}%</span>
              <span className="px-2 py-0.5 rounded bg-[#A3E635]/20 text-slate-900 font-bold">VSCode {weights.vscode}%</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Task {weights.task}%</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Collab {weights.collab}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
