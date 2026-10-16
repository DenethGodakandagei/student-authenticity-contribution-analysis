'use client';

import React from 'react';
import Link from 'next/link';
import { Code2 } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white py-12 px-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center text-[#A3E635]">
              <Code2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm">OffSync</span>
          </div>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
            Trust & Equity Analytics for Student Contributions. Verifying continuous individual contribution to ensure fair team grading.
          </p>
          <div className="text-[11px] font-mono text-slate-400">
            Privacy-first architecture (Zero keystroke content logging).
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-900 block mb-3 uppercase text-[11px] font-mono">
            Portals
          </span>
          <ul className="space-y-2 text-slate-600 text-xs font-medium">
            <li>
              <Link href="/login?role=student" className="hover:text-slate-900 transition">
                Student Workspace
              </Link>
            </li>
            <li>
              <Link href="/login?role=lecturer" className="hover:text-slate-900 transition">
                Lecturer Console
              </Link>
            </li>
            <li>
              <Link href="/student/simulator" className="hover:text-slate-900 transition">
                Telemetry Simulator
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <span className="font-bold text-slate-900 block mb-3 uppercase text-[11px] font-mono">
            Integrations
          </span>
          <ul className="space-y-2 text-slate-600 text-xs font-mono text-[11px]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> VS Code Sensor v2.0
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> GitHub Commits Mining
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Kanban Velocity Tracking
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px] font-mono gap-2">
        <p>© 2026 OffSync. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <span>Modern White & Lime Theme</span>
          <span>•</span>
          <span>Apple Typography</span>
        </div>
      </div>
    </footer>
  );
};
