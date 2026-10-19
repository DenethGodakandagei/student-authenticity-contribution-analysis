'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

interface CommitsTabProps {
  timelineData: any[];
  studentBreakdown: any[];
  commitsList: any[];
}

export const CommitsTab: React.FC<CommitsTabProps> = ({
  timelineData,
  studentBreakdown,
  commitsList
}) => {
  return (
    <div className="space-y-6 text-left">
      {/* Active Coding Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#2D6606] font-bold">
          Coding Activity (Last 7 Days)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A3E635" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#A3E635" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
              <Legend verticalAlign="top" height={36} />
              <Area
                type="monotone"
                name="VS Code Sessions"
                dataKey="sessions"
                stroke="#84cc16"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSessions)"
              />
              <Area
                type="monotone"
                name="Git Commits"
                dataKey="commits"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCommits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Teammate shares */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#2D6606] font-bold">
          Team Contribution Comparison
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studentBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
              <Bar dataKey="commits" name="Git Commits" fill="#A3E635" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hours" name="Coding Hours" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Commits Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#2D6606] font-bold">
          Recent Commits
        </h3>
        <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2">
          {commitsList.length > 0 ? (
            commitsList.map((c, idx) => (
              <div
                key={c._id || idx}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-between gap-4 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#A3E635]/25 text-[#2D6606] border border-[#A3E635]/30 font-bold text-xs flex items-center justify-center shrink-0">
                    {c.studentName?.charAt(0) || 'D'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {c.commitMessage}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 font-mono">
                      <span>
                        Authored by: <strong className="text-slate-800">{c.studentName}</strong>
                      </span>
                      <span>•</span>
                      <span>@{c.gitUsername}</span>
                      <span>•</span>
                      <span>{new Date(c.commitDate).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] bg-white text-[#2D6606] border border-slate-200 px-2 py-1 rounded-lg shrink-0 font-bold">
                  {c.commitHash ? c.commitHash.slice(0, 7) : 'n/a'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-slate-400 py-12">
              No commits recorded yet. Push your commits to GitHub and click &quot;Sync Commits&quot;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
