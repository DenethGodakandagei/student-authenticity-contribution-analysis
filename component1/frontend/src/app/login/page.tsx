'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { AuthCard } from '@/features/auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col justify-between font-sans p-6 selection:bg-[#A3E635] selection:text-slate-950">
      {/* Top Subtle Bar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between text-xs text-slate-500 py-2">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-7 h-7 rounded-lg bg-slate-950 text-[#A3E635] flex items-center justify-center shadow-xs">
            <Code2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-bold text-sm text-slate-900">OffSync</span>
        </Link>
        <span className="text-[11px] bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600 font-medium">
          Academic Portal
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="flex-grow flex items-center justify-center my-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-md">
              <p className="text-xs text-slate-500">Loading sign in portal...</p>
            </div>
          }
        >
          <AuthCard />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 py-3 font-normal">
        OffSync — Trust & Equity Analytics for Student Contributions © 2026
      </div>
    </div>
  );
}
