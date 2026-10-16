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
          Evidence-Based Authenticity
        </h2>
        <p className="text-slate-500 text-sm">
          A multi-layered provenance network combining biometric telemetry, AST syntax analysis, and Git mining.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <Activity className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Biometric Keystroke Dynamics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analyzes inter-key latency and flight times to distinguish natural human programming from bulk pasting or unauthorized proxies.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Inter-key timing</span>
            <span className="text-emerald-700 font-bold">Privacy-Preserving</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">AST Structural Parsing</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tree-sitter AST sensors inspect code modifications syntactically to quantify genuine architectural edits versus cosmetic renaming.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Syntax nodes</span>
            <span className="text-emerald-700 font-bold">Semantic Proof</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <Database className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Offline Resilience Buffer</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full offline capability with local cryptographic log buffering that syncs whenever an internet connection is re-established.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Zero-loss buffer</span>
            <span className="text-emerald-700 font-bold">Air-Gapped Ready</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 mb-4">
              <GitBranch className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Git Remote Attestation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automatically verifies that local project directories match the assigned team repository by reading the local Git configuration.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>GitHub Linked</span>
            <span className="text-emerald-700 font-bold">Remote Attested</span>
          </div>
        </div>
      </div>
    </section>
  );
};
