'use client';

import React from 'react';
import { Users, GitFork, AlertTriangle, BarChart3 } from 'lucide-react';

interface CohortStatsProps {
  totalStudents: number;
  totalTeams: number;
  anomalyCount: number;
  averageCohortScore: number;
}

export const CohortStats: React.FC<CohortStatsProps> = ({
  totalStudents,
  totalTeams,
  anomalyCount,
  averageCohortScore
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            Students Enrolled
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{totalStudents}</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800">
          <Users className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            Total Teams
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{totalTeams}</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800">
          <GitFork className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            Flags & Warnings
          </span>
          <h3 className={`text-3xl font-extrabold font-mono ${anomalyCount > 0 ? 'text-rose-600' : 'text-[#15803D]'}`}>
            {anomalyCount}
          </h3>
        </div>
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            anomalyCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            Class Average
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{averageCohortScore}%</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/20 flex items-center justify-center text-slate-950 font-bold">
          <BarChart3 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
