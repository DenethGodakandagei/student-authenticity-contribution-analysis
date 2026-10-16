'use client';

import React from 'react';
import { Activity, ShieldCheck, Terminal, Bot, Clipboard } from 'lucide-react';

interface SimulatorMetricsProps {
  keystrokes: number;
  pasteCount: number;
  charactersPasted: number;
  aiCharsCount: number;
  aiEventsCount: number;
  linesAdded: number;
  linesRemoved: number;
}

export const SimulatorMetrics: React.FC<SimulatorMetricsProps> = ({
  keystrokes,
  pasteCount,
  charactersPasted,
  aiCharsCount,
  aiEventsCount,
  linesAdded,
  linesRemoved
}) => {
  const totalChars = keystrokes + charactersPasted + aiCharsCount;
  const manualPct = totalChars > 0 ? Math.round((keystrokes / totalChars) * 100) : 100;
  const aiPct = totalChars > 0 ? Math.round((aiCharsCount / totalChars) * 100) : 0;
  const pastePct = totalChars > 0 ? Math.round((charactersPasted / totalChars) * 100) : 0;

  return (
    <div className="bg-slate-50 border-t border-slate-200/80 p-5 space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <Activity className="w-4 h-4 text-emerald-600" />
          Live Biometric & Provenance Sensor
        </span>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-600">✍️ {manualPct}% Manual</span>
          <span className="text-purple-600 font-semibold">🤖 {aiPct}% AI</span>
          <span className="text-rose-600 font-semibold">📋 {pastePct}% Paste</span>
        </div>
      </div>

      {/* Provenance bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
        <div style={{ width: `${manualPct}%` }} className="bg-[#A3E635] h-full" />
        <div style={{ width: `${aiPct}%` }} className="bg-purple-600 h-full" />
        <div style={{ width: `${pastePct}%` }} className="bg-rose-500 h-full" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase">Keystrokes</span>
          <span className="text-base font-bold text-slate-900">{keystrokes.toLocaleString()}</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase">Lines Added</span>
          <span className="text-base font-bold text-emerald-700">+{linesAdded}</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase">AI Events</span>
          <span className="text-base font-bold text-purple-700">{aiEventsCount}</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase">Paste Injections</span>
          <span className="text-base font-bold text-rose-600">{pasteCount}</span>
        </div>
      </div>
    </div>
  );
};
