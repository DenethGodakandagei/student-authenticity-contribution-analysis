'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, ArrowUpRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export const LandingEvaluationMatrix: React.FC = () => {
  return (
    <section id="preview" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80 scroll-mt-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 shadow-xs mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Examiner Evaluation Console</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sample Team Contribution Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Live assignment audit table with workload distribution and anomaly detection.
          </p>
        </div>

        <Link
          href="/lecturer"
          className="px-5 py-2.5 rounded-full bg-[#121417] text-white hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>Open Lecturer Portal</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Matrix Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs text-left">
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900">Project: Distributed System Development</span>
            <span className="text-slate-400 font-mono">Code: DIST-901</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span className="text-slate-600">
              Cohort Average: <strong className="text-slate-900">84%</strong>
            </span>
            <span className="text-slate-600">
              Team Size: <strong className="text-slate-900">4 Students</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 bg-white text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5">Student</th>
                <th className="py-3.5 px-4">Active Hours</th>
                <th className="py-3.5 px-4">Git Commits</th>
                <th className="py-3.5 px-4">Authenticity</th>
                <th className="py-3.5 px-5">Final Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-3.5 px-5">
                  <div className="font-bold text-slate-900">Alex Rivera</div>
                  <div className="text-[11px] text-slate-400 font-mono">@alex-rivera-dev</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">38.2 hrs</td>
                <td className="py-3.5 px-4 font-mono text-slate-700">28 commits</td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-emerald-800 bg-emerald-100 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> 100% Verified
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#A3E635] h-full w-[94%]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">94%</span>
                  </div>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-3.5 px-5">
                  <div className="font-bold text-slate-900">Chloe Chen</div>
                  <div className="text-[11px] text-slate-400 font-mono">@chloe-c</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">34.0 hrs</td>
                <td className="py-3.5 px-4 font-mono text-slate-700">22 commits</td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-emerald-800 bg-emerald-100 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> 95% Verified
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#A3E635] h-full w-[88%]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">88%</span>
                  </div>
                </td>
              </tr>

              <tr className="bg-rose-50/40 hover:bg-rose-50/60 transition">
                <td className="py-3.5 px-5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Marcus Vance</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-[11px] text-rose-500 font-mono font-medium">
                    @marcusv-codes • Anomaly Flag
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-rose-600 font-semibold">1.2 hrs</td>
                <td className="py-3.5 px-4 font-mono text-slate-700">1 commit (bulk paste)</td>
                <td className="py-3.5 px-4 font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-rose-700 bg-rose-100 font-bold">
                    <AlertTriangle className="w-3 h-3" /> 18% Pasted Anomaly
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full w-[24%]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-600">24%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-mono gap-2">
          <span>
            Team Collaboration Equity: <strong>Optimal Balance</strong>
          </span>
          <span className="text-emerald-700 font-bold">Signed by INCODE Attestation Protocol</span>
        </div>
      </div>
    </section>
  );
};
