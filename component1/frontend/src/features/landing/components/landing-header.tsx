'use client';

import React from 'react';
import Link from 'next/link';
import { Code2, ArrowUpRight } from 'lucide-react';

export const LandingHeader: React.FC = () => {
  return (
    <header className="border-b border-[#6FAF9A]/15 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="font-extrabold text-xl tracking-tight text-[#0D1110] hover:text-[#6FAF9A] transition">
          INCODE
        </Link>

        {/* Center Links */}
        <nav className="hidden md:flex items-center bg-white border border-[#6FAF9A]/20 rounded-full px-4 py-1.5 shadow-xs space-x-6 text-xs text-[#576561] font-medium">
          <a href="#how-it-works" className="hover:text-[#0D1110] transition">
            How It Works
          </a>
          <a href="#features" className="hover:text-[#0D1110] transition">
            Features
          </a>
          <a href="#preview" className="hover:text-[#0D1110] transition">
            Evaluation Matrix
          </a>
          <Link href="/student" className="hover:text-[#0D1110] transition">
            Student View
          </Link>
          <Link href="/lecturer" className="hover:text-[#0D1110] transition">
            Lecturer View
          </Link>
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center space-x-3 text-xs">
          <Link
            href="/login"
            className="text-[#576561] hover:text-[#0D1110] px-3.5 py-1.5 transition font-semibold"
          >
            Sign In
          </Link>

          <Link
            href="/login?tab=register"
            className="px-4 py-2 rounded-full font-semibold bg-[#0D1110] text-white hover:bg-[#1a2220] transition shadow-xs flex items-center gap-1.5 text-xs"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
