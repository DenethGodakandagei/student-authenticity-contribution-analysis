'use client';

import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface TimelineTabProps {
  report: any;
  cadenceFilter: 'keystrokes' | 'ast' | 'pastes';
  setCadenceFilter: (v: 'keystrokes' | 'ast' | 'pastes') => void;
  timelineData: any[];
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  report,
  cadenceFilter,
  setCadenceFilter,
  timelineData
}) => {
  return (
    <div className="space-y-6 text-left font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Activity & Contribution Timeline
            </h2>
            <p className="text-xs text-slate-500 font-light mt-0.5">
              A clear chronological view of your typing activity, AI suggestions, pasted code, and work sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Activity Tracker Active</span>
          </div>
        </div>

        {/* 4 Provenance Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#EFF8F3]/50 border border-[#6FAF9A]/20 space-y-1">
            <div className="text-[10px] uppercase font-mono text-[#2d5849] flex items-center justify-between font-bold">
              <span>Typed Code</span>
              <span>{report?.metrics?.codingProvenance?.manualPercent ?? 0}%</span>
            </div>
            <div className="text-lg font-bold text-[#0D1110]">
              {report?.metrics?.keystrokes?.toLocaleString() ?? '0'}
              <span className="text-[10px] text-[#8fa099] font-normal ml-1">keys</span>
            </div>
            <div className="w-full bg-[#EFF8F3] h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${report?.metrics?.codingProvenance?.manualPercent ?? 0}%` }}
                className="bg-[#6FAF9A] h-full"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-purple-200/60 space-y-1">
            <div className="text-[10px] uppercase font-mono text-purple-700 flex items-center justify-between font-bold">
              <span>AI Assisted</span>
              <span>{report?.metrics?.codingProvenance?.aiPercent ?? 0}%</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {report?.metrics?.codingProvenance?.aiChars ?? 0}
              <span className="text-[10px] text-slate-400 font-normal ml-1">chars</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${report?.metrics?.codingProvenance?.aiPercent ?? 0}%` }}
                className="bg-purple-600 h-full"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-rose-200/60 space-y-1">
            <div className="text-[10px] uppercase font-mono text-rose-600 flex items-center justify-between font-bold">
              <span>Pasted Code</span>
              <span>{report?.metrics?.codingProvenance?.pastePercent ?? 0}%</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {report?.metrics?.charactersPasted ?? 0}
              <span className="text-[10px] text-slate-400 font-normal ml-1">chars</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${report?.metrics?.codingProvenance?.pastePercent ?? 0}%` }}
                className="bg-rose-500 h-full"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-emerald-200/60 space-y-1">
            <div className="text-[10px] uppercase font-mono text-emerald-700 flex items-center justify-between font-bold">
              <span>Authenticity</span>
              <span>{report?.scores?.final != null ? `${report.scores.final}%` : '0%'}</span>
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {report?.scores?.final ? 'Verified' : 'Pending'}
              <span className="text-[10px] text-emerald-600 font-normal ml-1">✓</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {report?.scores?.final ? 'Consistent human rhythm' : 'Awaiting sync'}
            </div>
          </div>
        </div>
      </div>

      {/* Cadence Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-800 font-bold">
            Coding Activity Over Time
          </h3>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setCadenceFilter('keystrokes')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                cadenceFilter === 'keystrokes'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Keystrokes
            </button>
            <button
              onClick={() => setCadenceFilter('pastes')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                cadenceFilter === 'pastes'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pastes
            </button>
            <button
              onClick={() => setCadenceFilter('ast')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                cadenceFilter === 'ast'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Code Edits
            </button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCadence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6FAF9A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6FAF9A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(111, 175, 154, 0.25)', borderRadius: '12px' }} />
              <Area
                type="monotone"
                dataKey={cadenceFilter === 'pastes' ? 'commits' : 'sessions'}
                stroke="#6FAF9A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCadence)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
