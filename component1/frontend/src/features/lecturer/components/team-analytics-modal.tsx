'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { GitFork, Users, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';

interface TeamAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamAnalytics: any;
  teamName?: string;
}

export const TeamAnalyticsModal: React.FC<TeamAnalyticsModalProps> = ({
  isOpen,
  onClose,
  teamAnalytics,
  teamName
}) => {
  if (!teamAnalytics) return null;

  // Format radar chart metrics safely
  const radarData = [
    { subject: 'Git Commits', A: teamAnalytics.gitScore || 75, fullMark: 100 },
    { subject: 'Keystroke Auth', A: teamAnalytics.keystrokeScore || 85, fullMark: 100 },
    { subject: 'AST Integrity', A: teamAnalytics.astScore || 90, fullMark: 100 },
    { subject: 'Task Velocity', A: teamAnalytics.taskScore || 70, fullMark: 100 },
    { subject: 'Collab Balance', A: teamAnalytics.collabScore || 80, fullMark: 100 }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={teamName ? `Team Analytics: ${teamName}` : 'Team Performance Analytics'}
      description="Multivariate contribution radar and peer equilibrium assessment."
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Radar Chart */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center">
          <span className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            Equilibrium & Authenticity Dimensions
          </span>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Team Metrics"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Authenticity</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {teamAnalytics.averageAuthenticity || 88}%
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Commits</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {teamAnalytics.totalCommits || 0}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Tasks Closed</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {teamAnalytics.tasksCompleted || 0}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Gini Dispersion</span>
            <span className="text-lg font-bold text-emerald-600 font-mono">
              {teamAnalytics.giniIndex || '0.12 (Balanced)'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
