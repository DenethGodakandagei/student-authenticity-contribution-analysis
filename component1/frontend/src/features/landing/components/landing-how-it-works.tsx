'use client';

import React from 'react';
import { Code2, Lock, CheckCircle2 } from 'lucide-react';

export const LandingHowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#6FAF9A]/15 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-semibold text-[#576561] uppercase tracking-wider font-mono">
          Simple Workflow
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0D1110] tracking-tight mt-1 mb-3">
          How INCODE Works in 3 Steps
        </h2>
        <p className="text-[#576561] text-sm">
          Zero disruption to standard developer workflows. Code normally, online or offline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-[#6FAF9A]/20 shadow-xs hover:border-[#6FAF9A]/40 transition">
          <div className="text-3xl font-black font-mono text-[#6FAF9A]/30 mb-4">01</div>
          <div className="w-9 h-9 rounded-xl bg-[#EFF8F3] text-[#2d5849] flex items-center justify-center mb-3 border border-[#6FAF9A]/20">
            <Code2 className="w-4 h-4 text-[#6FAF9A]" />
          </div>
          <h3 className="text-base font-bold text-[#0D1110] mb-2">Code in VS Code</h3>
          <p className="text-xs text-[#576561] leading-relaxed">
            Write code normally. The lightweight extension tracks typing rhythm and session duration without recording private passwords or sensitive content.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-[#6FAF9A]/20 shadow-xs hover:border-[#6FAF9A]/40 transition">
          <div className="text-3xl font-black font-mono text-[#6FAF9A]/30 mb-4">02</div>
          <div className="w-9 h-9 rounded-xl bg-[#EFF8F3] text-[#2d5849] flex items-center justify-center mb-3 border border-[#6FAF9A]/20">
            <Lock className="w-4 h-4 text-[#6FAF9A]" />
          </div>
          <h3 className="text-base font-bold text-[#0D1110] mb-2">Secure Local Records</h3>
          <p className="text-xs text-[#576561] leading-relaxed">
            Your activity is protected locally on your computer, ensuring timestamps and work logs are accurate, trustworthy, and cannot be altered.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-[#6FAF9A]/20 shadow-xs hover:border-[#6FAF9A]/40 transition">
          <div className="text-3xl font-black font-mono text-[#6FAF9A]/30 mb-4">03</div>
          <div className="w-9 h-9 rounded-xl bg-[#EFF8F3] text-[#2d5849] flex items-center justify-center mb-3 border border-[#6FAF9A]/20">
            <CheckCircle2 className="w-4 h-4 text-[#6FAF9A]" />
          </div>
          <h3 className="text-base font-bold text-[#0D1110] mb-2">Automatic Verification</h3>
          <p className="text-xs text-[#576561] leading-relaxed">
            When you push your work to GitHub, INCODE matches commits with your actual coding activity to give teachers a clear, fair authenticity report.
          </p>
        </div>
      </div>
    </section>
  );
};
