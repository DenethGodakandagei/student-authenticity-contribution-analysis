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
      <div className="bg-white p-5 rounded-3xl border border-[#6FAF9A]/20 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-[#8fa099] font-bold uppercase tracking-wider font-mono">
            Students Enrolled
          </span>
          <h3 className="text-3xl font-extrabold text-[#0D1110] font-mono">{totalStudents}</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#EFF8F3] flex items-center justify-center text-[#6FAF9A] border border-[#6FAF9A]/20">
          <Users className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-[#6FAF9A]/20 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-[#8fa099] font-bold uppercase tracking-wider font-mono">
            Total Teams
          </span>
          <h3 className="text-3xl font-extrabold text-[#0D1110] font-mono">{totalTeams}</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#EFF8F3] flex items-center justify-center text-[#6FAF9A] border border-[#6FAF9A]/20">
          <GitFork className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-[#6FAF9A]/20 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-[#8fa099] font-bold uppercase tracking-wider font-mono">
            Flags & Warnings
          </span>
          <h3 className={`text-3xl font-extrabold font-mono ${anomalyCount > 0 ? 'text-rose-600' : 'text-[#2d5849]'}`}>
            {anomalyCount}
          </h3>
        </div>
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            anomalyCount > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-[#EFF8F3] text-[#6FAF9A] border border-[#6FAF9A]/20'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-[#6FAF9A]/20 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] text-[#8fa099] font-bold uppercase tracking-wider font-mono">
            Class Average
          </span>
          <h3 className="text-3xl font-extrabold text-[#0D1110] font-mono">{averageCohortScore}%</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#EFF8F3] text-[#6FAF9A] border border-[#6FAF9A]/20 flex items-center justify-center font-bold">
          <BarChart3 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
