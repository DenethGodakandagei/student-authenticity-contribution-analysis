'use client';

import React from 'react';
import Link from 'next/link';
import { Code2 } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#6FAF9A]/15 bg-white py-12 px-6 text-xs text-[#576561]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
        <div className="md:col-span-2">
          <div className="mb-3">
            <span className="font-extrabold text-[#0D1110] text-base tracking-tight">INCODE</span>
          </div>
          <p className="text-xs text-[#576561] max-w-sm leading-relaxed mb-4">
            Trust & Equity Analytics for Student Contributions. Verifying continuous individual contribution to ensure fair team grading.
          </p>
          <div className="text-[11px] font-mono text-[#8fa099]">
            Privacy-first architecture (Zero keystroke content logging).
          </div>
        </div>

        <div>
          <span className="font-bold text-[#0D1110] block mb-3 uppercase text-[11px] font-mono">
            Portals
          </span>
          <ul className="space-y-2 text-[#576561] text-xs font-medium">
            <li>
              <Link href="/login?role=student" className="hover:text-[#0D1110] transition">
                Student Workspace
              </Link>
            </li>
            <li>
              <Link href="/login?role=lecturer" className="hover:text-[#0D1110] transition">
                Lecturer Console
              </Link>
            </li>
            <li>
              <Link href="/student/simulator" className="hover:text-[#0D1110] transition">
                Telemetry Simulator
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <span className="font-bold text-[#0D1110] block mb-3 uppercase text-[11px] font-mono">
            Integrations
          </span>
          <ul className="space-y-2 text-[#576561] text-xs font-mono text-[11px]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6FAF9A]" /> VS Code Sensor v2.0
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6FAF9A]" /> GitHub Commits Mining
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6FAF9A]" /> Kanban Velocity Tracking
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px] font-mono gap-2">
        <p>© 2026 INCODE. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <span>Modern White & Lime Theme</span>
          <span>•</span>
          <span>Apple Typography</span>
        </div>
      </div>
    </footer>
  );
};
