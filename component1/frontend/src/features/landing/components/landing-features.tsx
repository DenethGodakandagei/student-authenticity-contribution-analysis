'use client';

import React from 'react';
import { Activity, ShieldCheck, Database, GitBranch } from 'lucide-react';

export const LandingFeatures: React.FC = () => {
  return (
    <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Core Capabilities
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 mb-3">
          How We Verify Your Code
        </h2>
        <p className="text-slate-500 text-sm">
          A clear and reliable system that tracks typing patterns, code changes, and Git commits to give everyone fair credit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <Activity className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Typing Speed & Rhythm</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tracks typing pace and natural pauses to tell apart real coding from sudden large pasted blocks.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Typing speed</span>
            <span className="text-emerald-700 font-bold">Private & Safe</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Code Structure Check</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Checks code changes to measure real logic, functions, and bug fixes rather than simple variable renaming.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Code changes</span>
            <span className="text-emerald-700 font-bold">Verified Logic</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <Database className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Full Offline Support</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Code anywhere without an internet connection. Your activity is saved locally and syncs automatically when online.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Local storage</span>
            <span className="text-emerald-700 font-bold">Works Offline</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <GitBranch className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">GitHub Repository Check</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Makes sure your local project folder matches your team's assigned GitHub repository so your team gets credit.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>GitHub Connected</span>
            <span className="text-emerald-700 font-bold">Verified Match</span>
          </div>
        </div>
      </div>
    </section>
  );
};
