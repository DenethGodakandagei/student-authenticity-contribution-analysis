'use client';

import React from 'react';
import Link from 'next/link';
import { Code2, BarChart3, Plus, Printer, GraduationCap, LogOut } from 'lucide-react';
import { User } from '@/types';

interface LecturerSidebarProps {
  user: User | null;
  onOpenCreateModal: () => void;
  onLogout: () => void;
}

export const LecturerSidebar: React.FC<LecturerSidebarProps> = ({
  user,
  onOpenCreateModal,
  onLogout
}) => {
  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#6FAF9A]/15 bg-white shrink-0 flex flex-col justify-between p-6">
      <div className="space-y-8 text-left">
        {/* Brand */}
        <Link href="/" className="block group">
          <span className="font-extrabold text-lg tracking-tight text-[#0D1110] block leading-none hover:text-[#6FAF9A] transition">INCODE</span>
          <span className="text-[10px] text-[#576561] font-semibold block mt-1">Lecturer Console</span>
        </Link>

        {/* Nav Links */}
        <div className="space-y-6 text-xs text-[#576561]">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#8fa099] block tracking-wider mb-2 font-mono">
              Examiner Views
            </span>

            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#0D1110] text-white font-semibold shadow-xs text-left cursor-pointer">
              <BarChart3 className="w-4 h-4 text-[#6FAF9A]" />
              <span>Performance Analytics</span>
            </button>

            <button
              onClick={onOpenCreateModal}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl hover:bg-[#EFF8F3] hover:text-[#0D1110] font-medium transition text-left cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#6FAF9A]" />
              <span>New Assignment</span>
            </button>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-[#6FAF9A]/15">
            <span className="text-[10px] uppercase font-bold text-[#8fa099] block tracking-wider mb-2 font-mono">
              Reports & Export
            </span>
            <button
              onClick={() => window.print()}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl hover:bg-[#EFF8F3] hover:text-[#0D1110] font-medium transition text-left cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#576561]" />
              <span>Print Assignment Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* User profile & logout */}
      <div className="border-t border-[#6FAF9A]/15 pt-5 mt-6 flex flex-col gap-3 text-left">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#EFF8F3]/60 border border-[#6FAF9A]/20">
          <div className="w-9 h-9 rounded-xl bg-[#0D1110] text-white font-bold flex items-center justify-center text-xs">
            <GraduationCap className="w-4 h-4 text-[#6FAF9A]" />
          </div>
          <div className="truncate min-w-0">
            <span className="font-bold text-xs text-[#0D1110] block leading-tight truncate">
              {user?.name || 'Course Examiner'}
            </span>
            <span className="text-[10px] text-[#576561] font-mono block mt-0.5 truncate">{user?.email}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 bg-white hover:bg-rose-50 text-[#576561] hover:text-rose-600 border border-[#6FAF9A]/20 transition rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
