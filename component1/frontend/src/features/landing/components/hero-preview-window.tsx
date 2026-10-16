'use client';

import React, { useState } from 'react';
import { Terminal, WifiOff, Wifi, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const HeroPreviewWindow: React.FC = () => {
  const [heroSyncState, setHeroSyncState] = useState<'buffered' | 'synced'>('synced');

  return (
    <div className="w-full max-w-5xl rounded-3xl bg-white p-5 sm:p-7 text-left border border-slate-200/80 shadow-md relative overflow-hidden">
      {/* Top Window Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs text-slate-500 mb-5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#22C55E] inline-block" />
          <span className="ml-2 font-medium text-slate-700">
            OffSync Telemetry Bridge · Live Active Node
          </span>
        </div>

        {/* State Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Simulate Sensor:</span>
          <div className="inline-flex p-1 bg-slate-100 rounded-full border border-slate-200">
            <button
              onClick={() => setHeroSyncState('buffered')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                heroSyncState === 'buffered'
                  ? 'bg-[#121417] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline Mode
            </button>
            <button
              onClick={() => setHeroSyncState('synced')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                heroSyncState === 'synced'
                  ? 'bg-[#A3E635] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verified & Synced
            </button>
          </div>
        </div>
      </div>

      {/* Split Dashboard Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: VS Code Telemetry Activity */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3 pb-2 border-b border-slate-200">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <Terminal className="w-4 h-4 text-slate-700" />
              <span>VS Code Activity Logger</span>
            </span>
            {heroSyncState === 'buffered' ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                <WifiOff className="w-3 h-3" /> OFFLINE BUFFER
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#15803D] bg-[#22C55E]/15 px-2 py-0.5 rounded-full font-bold">
                <Wifi className="w-3 h-3 text-[#22C55E]" /> ONLINE SYNC
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span>Target File:</span>
              <span className="font-mono font-semibold text-slate-900">
                src/components/Dashboard.tsx
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Typing Cadence:</span>
              <strong className="font-mono text-slate-900 text-sm">91.4 WPM Peak</strong>
            </div>
            <div className="flex justify-between items-center">
              <span>Keystroke Breakdown:</span>
              <span className="text-[#15803D] font-bold font-mono">
                92% Manual · 6% AI · 2% Pasted
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs mt-3 shadow-2xs">
              <div className="text-slate-900 font-bold mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cryptographic Attestation Block:</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                1,840 keystrokes verified · 21 files attested · SHA-256 integrity seal
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Authenticity Verdict */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-xs flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                <span>Contribution Score</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">Target: GitHub Repo</span>
            </div>

            {heroSyncState === 'buffered' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Offline work buffered securely on local disk</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Telemetry daemon runs in the background with zero internet. Work timestamps and
                  rhythms are encrypted locally.
                </p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full w-[65%]" />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Waiting for git push sync...
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Human Code Attribution (94.2%)</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Git commits cross-checked against biometric typing rhythms. Work attested to
                  authenticated university student identity.
                </p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#A3E635] h-full w-[94%]" />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Multi-Factor Equilibrium: Balanced Contributor
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
