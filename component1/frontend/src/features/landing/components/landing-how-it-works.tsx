'use client';

import React from 'react';
import { Code2, Lock, CheckCircle2 } from 'lucide-react';

export const LandingHowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Simple Workflow
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 mb-3">
          How INCODE Works in 3 Steps
        </h2>
        <p className="text-slate-500 text-sm">
          Zero disruption to standard developer workflows. Code normally, online or offline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-3xl font-black font-mono text-slate-200 mb-4">01</div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
            <Code2 className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Code in VS Code</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Write code normally. The lightweight extension tracks typing rhythm and session duration without recording private passwords or sensitive content.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-3xl font-black font-mono text-slate-200 mb-4">02</div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Secure Local Records</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your activity is protected locally on your computer, ensuring timestamps and work logs are accurate, trustworthy, and cannot be altered.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="text-3xl font-black font-mono text-slate-200 mb-4">03</div>
          <div className="w-9 h-9 rounded-xl bg-[#A3E635]/25 text-slate-900 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Automatic Verification</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            When you push your work to GitHub, INCODE matches commits with your actual coding activity to give teachers a clear, fair authenticity report.
          </p>
        </div>
      </div>
    </section>
  );
};
