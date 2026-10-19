'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';
import {
  LandingHeader,
  HeroPreviewWindow,
  LandingFeatures,
  LandingHowItWorks,
  LandingEvaluationMatrix,
  LandingFooter
} from '@/features/landing';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent text-[#0D1110] flex flex-col justify-between font-sans selection:bg-[#6FAF9A] selection:text-white relative">
      {/* Top Navigation */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-[#6FAF9A]/25 bg-[#EFF8F3]/70 backdrop-blur-md text-[#0D1110] text-xs font-medium mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#6FAF9A] animate-pulse" />
          <span>Verified Student Code Contributions</span>
          <span className="text-[#6FAF9A]/40">•</span>
          <span className="text-[#576561] font-normal">Offline Tracking & Git Verification</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0D1110] tracking-tight max-w-4xl leading-[1.12] mb-6">
          Fair, Transparent & Verified <br className="hidden sm:inline" />
          <span className="text-[#0D1110] underline decoration-[#6FAF9A] decoration-wavy decoration-2">
            Student Code Contributions.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#576561] text-base sm:text-lg max-w-2xl font-normal leading-relaxed mb-8">
          INCODE tracks typing rhythm and code changes inside VS Code, proving authentic student work and ensuring fair grades for group projects.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3.5 mb-14 w-full max-w-md justify-center">
          <Link
            href="/login?tab=register&role=student"
            className="px-6 py-3 rounded-full bg-[#0D1110] hover:bg-[#1a2220] text-white font-semibold text-xs shadow-md shadow-[#0D1110]/10 transition flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Open Student Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/login?role=lecturer"
            className="px-6 py-3 rounded-full bg-white/90 backdrop-blur-md hover:bg-[#EFF8F3] text-[#0D1110] font-semibold text-xs border border-[#6FAF9A]/25 shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#6FAF9A]" />
            <span>Lecturer Portal</span>
          </Link>
        </div>

        {/* Interactive Split Hero Preview */}
        <HeroPreviewWindow />
      </section>

      {/* Core Capabilities */}
      <LandingFeatures />

      {/* How It Works */}
      <LandingHowItWorks />

      {/* Evaluation Matrix */}
      <LandingEvaluationMatrix />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
