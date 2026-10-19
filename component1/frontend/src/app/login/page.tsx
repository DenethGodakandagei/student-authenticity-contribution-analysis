'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { AuthCard } from '@/features/auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-transparent text-[#0D1110] flex flex-col justify-between font-sans p-6 selection:bg-[#6FAF9A] selection:text-white relative">
      {/* Top Subtle Bar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between text-xs text-[#576561] py-2">
        <Link href="/" className="font-extrabold text-base tracking-tight text-[#0D1110] hover:text-[#6FAF9A] transition">
          INCODE
        </Link>
        <span className="text-[11px] bg-[#EFF8F3] backdrop-blur-md border border-[#6FAF9A]/25 px-2.5 py-0.5 rounded-full text-[#0D1110] font-medium shadow-xs">
          Academic Portal
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="flex-grow flex items-center justify-center my-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl p-10 text-center border border-[#6FAF9A]/20 shadow-xl shadow-[#0D1110]/5">
              <p className="text-xs text-[#576561]">Loading sign in portal...</p>
            </div>
          }
        >
          <AuthCard />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-[#8fa099] py-3 font-normal">
        INCODE — Trust & Equity Analytics for Student Contributions © 2026
      </div>
    </div>
  );
}
