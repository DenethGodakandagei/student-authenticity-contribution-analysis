'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ReportsTableProps {
  reports: any[];
  refreshing: boolean;
  onRecalculate: () => void;
  onInspectStudent: (report: any) => void;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  refreshing,
  onRecalculate,
  onInspectStudent
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-left space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Student Contributions & Results</h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Automated scores calculated from Git commits, typing activity, and completed tasks.
          </p>
        </div>
        <button
          onClick={onRecalculate}
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
              <th className="py-3 px-4">Work Breakdown</th>
              <th className="py-3 px-3 text-center">Git</th>
              <th className="py-3 px-3 text-center">VSCode</th>
              <th className="py-3 px-3 text-center">Tasks</th>
              <th className="py-3 px-3 text-center">Collab</th>
              <th className="py-3 px-4 text-right">Final Score</th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {reports.length > 0 ? (
              reports.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{r.student?.name || 'Unnamed Student'}</span>
                      {(r.alerts?.isFreeRider || r.alerts?.hasCopyPasteAnomaly || r.alerts?.hasAiAnomaly) && (
                        <span
                          className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                          title={r.alerts?.alertMessage}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5 font-normal">
                      {r.student?.email}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{r.team?.name || 'Unassigned'}</td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-800 font-medium">Typed {r.metrics?.manualPercent ?? 100}%</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-purple-600 font-medium">AI {r.metrics?.aiPercent ?? 0}%</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-rose-600 font-medium">Pasted {r.metrics?.pastePercent ?? 0}%</span>
                      </div>
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${r.metrics?.manualPercent ?? 100}%` }}
                          className="bg-[#A3E635] h-full"
                        />
                        <div
                          style={{ width: `${r.metrics?.aiPercent ?? 0}%` }}
                          className="bg-[#8B5CF6] h-full"
                        />
                        <div
                          style={{ width: `${r.metrics?.pastePercent ?? 0}%` }}
                          className="bg-rose-500 h-full"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.git ?? 0}%</td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.vscode ?? 0}%</td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.task ?? 0}%</td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-700">{r.scores?.collab ?? 0}%</td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900">
                    {r.scores?.final ?? 0}%
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => onInspectStudent(r)}
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
  );
};
