'use client';

import React from 'react';
import Link from 'next/link';
import { Code2, ArrowUpRight } from 'lucide-react';

export const LandingHeader: React.FC = () => {
  return (
    <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-[#A3E635] shadow-xs group-hover:scale-105 transition">
            <Code2 className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900">OffSync</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200">
              Academic Node
            </span>
          </div>
        </Link>

        {/* Center Links */}
        <nav className="hidden md:flex items-center bg-white border border-slate-200/80 rounded-full px-4 py-1.5 shadow-xs space-x-6 text-xs text-slate-600 font-medium">
          <a href="#how-it-works" className="hover:text-slate-900 transition">
            How It Works
          </a>
          <a href="#features" className="hover:text-slate-900 transition">
            Features
          </a>
          <a href="#preview" className="hover:text-slate-900 transition">
            Evaluation Matrix
          </a>
          <Link href="/student" className="hover:text-slate-900 transition">
            Student View
          </Link>
          <Link href="/lecturer" className="hover:text-slate-900 transition">
            Lecturer View
          </Link>
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center space-x-3 text-xs">
          <Link
            href="/login"
            className="text-slate-600 hover:text-slate-900 px-3.5 py-1.5 transition font-semibold"
          >
            Sign In
          </Link>

          <Link
            href="/login?tab=register"
            className="px-4 py-2 rounded-full font-bold bg-[#A3E635] text-slate-950 hover:bg-[#8EE01D] transition shadow-xs flex items-center gap-1.5 text-xs"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
