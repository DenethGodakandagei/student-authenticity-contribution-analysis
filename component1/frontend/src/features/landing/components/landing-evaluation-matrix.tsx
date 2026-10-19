'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, ArrowUpRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export const LandingEvaluationMatrix: React.FC = () => {
  return (
    <section id="preview" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#6FAF9A]/15 scroll-mt-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#0D1110] bg-[#EFF8F3] backdrop-blur-md border border-[#6FAF9A]/30 shadow-xs mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#6FAF9A]" />
            <span>Lecturer Review Panel</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0D1110] tracking-tight">
            Team Contribution Summary
          </h2>
          <p className="text-xs text-[#576561] mt-1">
            Real-time project overview with student workload and authenticity checks.
          </p>
        </div>

        <Link
          href="/lecturer"
          className="px-5 py-2.5 rounded-full bg-[#0D1110] text-white hover:bg-[#1a2220] text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>Open Lecturer Portal</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Matrix Card */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-[#6FAF9A]/20 overflow-hidden shadow-xs text-left">
        <div className="p-4 sm:p-5 bg-[#EFF8F3]/50 backdrop-blur-sm border-b border-[#6FAF9A]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#0D1110]">Project: Distributed System Development</span>
            <span className="text-[#576561] font-mono">Code: DIST-901</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span className="text-[#576561]">
              Class Average: <strong className="text-[#0D1110]">84%</strong>
            </span>
            <span className="text-[#576561]">
              Team Members: <strong className="text-[#0D1110]">4 Students</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#6FAF9A]/15 text-[#576561] bg-white/70 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5">Student</th>
                <th className="py-3.5 px-4">Hours Spent</th>
                <th className="py-3.5 px-4">Commits</th>
                <th className="py-3.5 px-4">Authenticity</th>
                <th className="py-3.5 px-5">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6FAF9A]/10 font-sans">
              <tr className="hover:bg-[#EFF8F3]/30 transition">
                <td className="py-3.5 px-5">
                  <div className="font-bold text-[#0D1110]">Alex Rivera</div>
                  <div className="text-[11px] text-[#576561] font-mono">@alex-rivera-dev</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#0D1110]">38.2 hrs</td>
                <td className="py-3.5 px-4 font-mono text-[#0D1110]">28 commits</td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-[#2d5849] bg-[#EFF8F3] border border-[#6FAF9A]/30 font-bold">
                    <CheckCircle2 className="w-3 h-3 text-[#6FAF9A]" /> 100% Verified
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#6FAF9A] h-full w-[94%]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-[#0D1110]">94%</span>
                  </div>
                </td>
              </tr>

              <tr className="hover:bg-[#EFF8F3]/30 transition">
                <td className="py-3.5 px-5">
                  <div className="font-bold text-[#0D1110]">Chloe Chen</div>
                  <div className="text-[11px] text-[#576561] font-mono">@chloe-c</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#0D1110]">34.0 hrs</td>
                <td className="py-3.5 px-4 font-mono text-[#0D1110]">22 commits</td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-[#2d5849] bg-[#EFF8F3] border border-[#6FAF9A]/30 font-bold">
                    <CheckCircle2 className="w-3 h-3 text-[#6FAF9A]" /> 95% Verified
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#6FAF9A] h-full w-[88%]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-[#0D1110]">88%</span>
                  </div>
                </td>
              </tr>

              <tr className="bg-rose-50/40 hover:bg-rose-50/60 transition">
                <td className="py-3.5 px-5">
                  <div className="font-bold text-[#0D1110] flex items-center gap-1.5">
                    <span>Marcus Vance</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-[11px] text-rose-600 font-mono font-medium">
                    @marcusv-codes • Flagged for Review
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-rose-700 font-semibold">1.2 hrs</td>
                <td className="py-3.5 px-4 font-mono text-[#576561]">1 commit (large paste)</td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-rose-700 bg-rose-100 font-bold">
                    <AlertTriangle className="w-3 h-3" /> 18% Pasted Code
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[#EFF8F3] h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full w-[24%]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-600">24%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#EFF8F3]/50 backdrop-blur-sm border-t border-[#6FAF9A]/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#576561] font-mono gap-2">
          <span>
            Team Effort Balance: <strong className="text-[#0D1110]">Good Distribution</strong>
          </span>
          <span className="text-[#2d5849] font-bold">Verified by INCODE</span>
        </div>
      </div>
    </section>
  );
};
