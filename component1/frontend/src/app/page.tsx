'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Terminal, 
  GitBranch, 
  GitCommit,
  GitPullRequest,
  CheckCircle2, 
  ArrowUpRight, 
  ArrowRight,
  Activity,
  Layers,
  Lock,
  Wifi,
  WifiOff,
  Cpu,
  FileCode,
  AlertTriangle,
  Users,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Code2,
  Boxes,
  Database,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  // Interactive Hero Preview State (Simulating Offline Buffer -> Online Attested)
  const [heroSyncState, setHeroSyncState] = useState<'buffered' | 'synced'>('buffered');
  
  // Interactive Dashboard Filter State
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'cs402-g1' | 'cs402-g2'>('all');

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col justify-between font-sans selection:bg-[#0EA5E9]/30 selection:text-[#38BDF8]">
      
      {/* =========================================================================
          SECTION A: STICKY NAVIGATION BAR
      ========================================================================= */}
      <header className="border-b border-white/10 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Left Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Code2 className="w-4 h-4 text-[#38BDF8] stroke-[2.2]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] absolute -top-0.5 -right-0.5 animate-pulse"></span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-base tracking-tight text-white">OffSync</span>
              <span className="text-[10px] font-mono-code font-medium px-1.5 py-0.2 rounded bg-sky-950 text-[#38BDF8] border border-[#0EA5E9]/30">
                v1.4
              </span>
            </div>
          </Link>

          {/* Center Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-xs text-slate-300 font-light">
            <a href="#how-it-works" className="hover:text-[#38BDF8] transition-colors">How It Works</a>
            <a href="#attestation" className="hover:text-[#38BDF8] transition-colors">Attestation Engine</a>
            <a href="#dashboard-preview" className="hover:text-[#38BDF8] transition-colors">Lecturer Dashboard</a>
            <a href="#extension" className="hover:text-[#38BDF8] transition-colors">IDE Extension</a>
            <a href="#research" className="hover:text-[#38BDF8] transition-colors">Research / Docs</a>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 font-mono-code text-[11px]">
              <GitBranch className="w-3 h-3 text-[#10B981]" />
              <span>GitHub Linked</span>
            </div>

            <Link 
              href="/login" 
              className="text-slate-300 hover:text-white px-3 py-1.5 transition font-light"
            >
              Sign In
            </Link>

            <Link 
              href="/login?tab=register" 
              className="px-4 py-2 rounded-lg font-medium bg-[#0EA5E9] text-white hover:bg-[#38BDF8] transition shadow-[0_0_20px_-3px_rgba(14,165,233,0.4)] flex items-center gap-1.5 text-xs"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          SECTION B: ABOVE-THE-FOLD HERO SECTION
      ========================================================================= */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        
        {/* Top Tag Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[#38BDF8] text-xs font-mono-code mb-8 shadow-[0_0_25px_rgba(14,165,233,0.15)]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>Offline Telemetry & Git Proof of Work</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-[-0.035em] max-w-4xl leading-[1.14] mb-6">
          Verifiable Offline Code Tracking for <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#818CF8] bg-clip-text text-transparent">
            Fair Team Collaboration.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-300 text-base sm:text-lg max-w-2xl font-light leading-relaxed mb-10">
          OffSync captures local IDE telemetry offline, verifies continuous individual contribution with cryptographic attestation, and reconciles seamlessly with Git repositories.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full max-w-md justify-center">
          <a 
            href="#extension" 
            className="px-6 py-3.5 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white font-medium text-xs shadow-[0_0_30px_rgba(14,165,233,0.35)] transition-all flex items-center justify-center gap-2 group"
          >
            <Terminal className="w-4 h-4 text-white" />
            <span>Install VS Code Plugin</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a 
            href="#dashboard-preview" 
            className="px-6 py-3.5 rounded-xl glass-card text-slate-200 hover:text-white hover:border-[#0EA5E9]/40 font-medium text-xs transition flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
            <span>Explore Lecturer Dashboard</span>
          </a>
        </div>

        {/* Interactive Split Hero Preview Card */}
        <div className="w-full max-w-5xl rounded-2xl glass-card p-4 sm:p-6 text-left border border-white/10 shadow-[0_0_60px_-15px_rgba(14,165,233,0.25)] relative overflow-hidden">
          
          {/* Top Window Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs text-slate-400 font-mono-code mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="ml-2 text-slate-300 font-light">OffSync Telemetry Bridge · IDE Session [v1.4-active]</span>
            </div>

            {/* State Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Simulate State:</span>
              <div className="inline-flex p-0.5 bg-slate-900/80 rounded-lg border border-slate-700">
                <button
                  onClick={() => setHeroSyncState('buffered')}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition ${
                    heroSyncState === 'buffered' 
                      ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 font-medium' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Offline Buffer
                </button>
                <button
                  onClick={() => setHeroSyncState('synced')}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition ${
                    heroSyncState === 'synced' 
                      ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-medium' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Attested & Synced
                </button>
              </div>
            </div>
          </div>

          {/* Split Dashboard Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Column: Mock VS Code Sidebar */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-white/5 font-mono-code text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-3 pb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>VS Code Activity Logger</span>
                </span>
                {heroSyncState === 'buffered' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/30">
                    <WifiOff className="w-3 h-3" /> OFFLINE BUFFER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                    <Wifi className="w-3 h-3" /> RECONNECTED
                  </span>
                )}
              </div>

              {/* Telemetry Stream Output */}
              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="text-slate-300">
                  <span className="text-slate-500">[14:22:04]</span> Active Session: <span className="text-[#38BDF8]">src/auth/jwt.rs</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">[14:28:19]</span> Keystroke Cadence: <strong className="text-white">68 WPM</strong> (Burst: 94 chars)
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">[14:35:10]</span> Semantic AST Churn: <span className="text-[#10B981]">+14% Functions, -3% Refactor</span>
                </div>
                <div className="p-2 rounded bg-slate-800/60 border border-slate-700/60 text-slate-300 text-[10px] mt-3">
                  <span className="text-[#F59E0B] font-semibold block mb-0.5">Local Buffer Block:</span>
                  1,420 keystrokes buffered · 3 file diffs · Cryptographic hash: <span className="text-slate-400">#sha256:7f8a92c0</span>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Reconciliation Indicator */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-white/5 font-mono-code text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-3 pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Attestation Reconciliation</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Target: GitHub Repo</span>
                </div>

                {/* State Presentation */}
                {heroSyncState === 'buffered' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#F59E0B] text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping"></span>
                      <span>Offline changes cached in encrypted local chain</span>
                    </div>
                    <p className="text-slate-400 text-xs font-sans font-light leading-relaxed">
                      Telemetry daemon runs in the background with zero internet. Work integrity is timestamped and secured locally.
                    </p>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#F59E0B] h-full w-[65%] animate-pulse"></div>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Pending git push trigger...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#10B981] text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Attested & Pushed to GitHub (Match Verified)</span>
                    </div>
                    <p className="text-slate-300 text-xs font-sans font-light leading-relaxed">
                      Reconciliation engine verified 142 LOC against 1,420 recorded typing events. Zero bulk-paste anomaly detected.
                    </p>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#10B981] h-full w-full"></div>
                    </div>
                    <span className="text-[10px] text-[#10B981] block">Commit #8f32e9 Attestation Signed</span>
                  </div>
                )}
              </div>

              {/* Bottom Verification Hash Tag */}
              <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <span>Proof Status: <strong className={heroSyncState === 'buffered' ? 'text-[#F59E0B]' : 'text-[#10B981]'}>{heroSyncState === 'buffered' ? 'Holding in Buffer' : 'Attestation Valid'}</strong></span>
                <span>Algorithm: Ed25519</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION C: FEATURE HIGHLIGHTS (BENTO GRID - 4 CARDS)
      ========================================================================= */}
      <section id="attestation" className="py-20 px-6 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider">Engine Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1 mb-3">
            Multi-Modal Contribution Verification
          </h2>
          <p className="text-slate-300 text-sm font-light leading-relaxed">
            Eliminate subjective grading disputes with cryptographic data points collected across the entire software development lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Offline-First Daemon */}
          <div className="glass-card-interactive p-6 rounded-2xl flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center mb-5 text-[#38BDF8] group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Offline-First Telemetry Daemon</h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Lightweight local capture of active edit bursts, semantic AST diffs, and keystroke rhythm without collecting sensitive personal data or raw source text.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#38BDF8] font-mono-code">
              <span>Zero Leakage</span>
              <span>Privacy First</span>
            </div>
          </div>

          {/* Card 2: Cryptographic Attestation */}
          <div className="glass-card-interactive p-6 rounded-2xl flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mb-5 text-[#10B981] group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Cryptographic Log Attestation</h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Tamper-proof local hash chaining ensuring offline timestamps and commit histories cannot be backdated, modified, or artificially spoofed.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#10B981] font-mono-code">
              <span>SHA-256 Chain</span>
              <span>Tamper Proof</span>
            </div>
          </div>

          {/* Card 3: Equity Index */}
          <div className="glass-card-interactive p-6 rounded-2xl flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center mb-5 text-[#F59E0B] group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Collaboration Equity Index</h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Instant radar and bar charts showing genuine workload split vs. superficial bulk copy-paste commits, alerting lecturers to silent free-riders early.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#F59E0B] font-mono-code">
              <span>Gini Metric</span>
              <span>Free-Rider Alert</span>
            </div>
          </div>

          {/* Card 4: Universal Classroom Sync */}
          <div className="glass-card-interactive p-6 rounded-2xl flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#818CF8]/10 border border-[#818CF8]/30 flex items-center justify-center mb-5 text-[#818CF8] group-hover:scale-105 transition-transform">
                <GitPullRequest className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Universal Git & Classroom Sync</h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Zero configuration needed; automatically bridges with GitHub repos, GitLab, and automated grading workflows upon reconnecting to internet.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#818CF8] font-mono-code">
              <span>GitHub / GitLab</span>
              <span>Auto Webhooks</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION D: "HOW IT WORKS" 3-STEP FLOWCHART
      ========================================================================= */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-white/10 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider">Workflow Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1 mb-3">
            How OffSync Works in 3 Steps
          </h2>
          <p className="text-slate-300 text-sm font-light">
            Seamless integration that requires zero alteration to normal software engineering practices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Step 1 */}
          <div className="glass-card p-6 rounded-2xl relative border border-white/10">
            <div className="text-4xl font-black font-mono-code text-slate-700/60 mb-4">01</div>
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 text-[#38BDF8] flex items-center justify-center mb-3">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Code Anywhere</h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              Students write code with or without internet; the lightweight background extension logs AST changes, typing momentum, and file edits locally.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-card p-6 rounded-2xl relative border border-white/10">
            <div className="text-4xl font-black font-mono-code text-slate-700/60 mb-4">02</div>
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Attest & Buffer</h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              Local logs are hashed into an encrypted cryptographic local chain. Timestamps and keystroke blocks are sealed so past effort cannot be modified.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-card p-6 rounded-2xl relative border border-white/10">
            <div className="text-4xl font-black font-mono-code text-slate-700/60 mb-4">03</div>
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Reconcile & Assess</h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              When online, Git push triggers automated telemetry reconciliation—providing supervisors with objective, multi-factor proof of genuine individual work.
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION E: INTERACTIVE LECTURER DASHBOARD SHOWCASE
      ========================================================================= */}
      <section id="dashboard-preview" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-white/10 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono-code text-[#38BDF8] bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Examiner Evaluation Console</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Interactive Team Contribution Matrix
            </h2>
            <p className="text-xs text-slate-300 font-light mt-1">
              Sample assignment grading audit table with real-time discrepancy alerts and individual workload distribution.
            </p>
          </div>

          <Link 
            href="/login?role=lecturer" 
            className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white text-xs font-medium transition flex items-center gap-1.5 self-start md:self-auto shadow-sm"
          >
            <span>Open Full Lecturer Portal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dashboard Data Table Card */}
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          
          {/* Table Header Bar */}
          <div className="p-4 sm:p-5 bg-slate-900/80 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm text-white">Course: CS402 Capstone Software Studio</span>
              <span className="text-xs text-slate-400 font-mono-code">Sprint #4 Final Evaluation</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono-code">
              <span className="text-slate-400">Team Symmetry: <strong className="text-[#10B981]">0.89 (Optimal)</strong></span>
              <span className="text-slate-400">Total Telemetry: <strong className="text-white">186.4 hrs</strong></span>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-slate-950/40 text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-5">Student & Group</th>
                  <th className="py-3.5 px-4">Offline Hours</th>
                  <th className="py-3.5 px-4">Online Commits</th>
                  <th className="py-3.5 px-4">Attestation Status</th>
                  <th className="py-3.5 px-5">Equity Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                
                {/* Student 1: Alice */}
                <tr className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-white">Alice Chen</div>
                    <div className="text-[11px] text-slate-400 font-mono-code">Group 04 · Lead Architect</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">38.2 hrs</td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">28 commits (11 PRs)</td>
                  <td className="py-3.5 px-4 font-mono-code">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified (98% match)
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#0EA5E9] h-full w-[28%]"></div>
                      </div>
                      <span className="font-mono-code text-xs text-white">28%</span>
                    </div>
                  </td>
                </tr>

                {/* Student 2: Bob */}
                <tr className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-white">Bob Miller</div>
                    <div className="text-[11px] text-slate-400 font-mono-code">Group 04 · Backend Engineer</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">34.0 hrs</td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">22 commits (8 PRs)</td>
                  <td className="py-3.5 px-4 font-mono-code">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified (95% match)
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#0EA5E9] h-full w-[25%]"></div>
                      </div>
                      <span className="font-mono-code text-xs text-white">25%</span>
                    </div>
                  </td>
                </tr>

                {/* Student 3: Charlie */}
                <tr className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-white">Charlie Davis</div>
                    <div className="text-[11px] text-slate-400 font-mono-code">Group 04 · Systems / DevOps</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">46.5 hrs</td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">34 commits (14 PRs)</td>
                  <td className="py-3.5 px-4 font-mono-code">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified (96% match)
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#0EA5E9] h-full w-[35%]"></div>
                      </div>
                      <span className="font-mono-code text-xs text-white">35%</span>
                    </div>
                  </td>
                </tr>

                {/* Student 4: Dave (Free-Rider Anomaly Detected) */}
                <tr className="bg-rose-950/20 hover:bg-rose-950/30 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-white flex items-center gap-1.5">
                      <span>Dave Vance</span>
                      <AlertTriangle className="w-3.5 h-3.5 text-[#F43F5E]" />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-code">Group 04 · Frontend / Docs</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-code text-[#F43F5E]">1.2 hrs</td>
                  <td className="py-3.5 px-4 font-mono-code text-slate-200">1 commit (7,200 LOC dumped)</td>
                  <td className="py-3.5 px-4 font-mono-code">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/30">
                      <AlertTriangle className="w-3 h-3" /> Batch Paste / Free-Rider
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#F43F5E] h-full w-[12%]"></div>
                      </div>
                      <span className="font-mono-code text-xs text-[#F43F5E]">12% [Alert]</span>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Footer Summary in Dashboard */}
          <div className="p-4 bg-slate-950/60 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 font-mono-code gap-2">
            <span>Overall Team Equity Gini Ratio: <strong>0.14 (Fair Workload)</strong></span>
            <span className="text-[#38BDF8]">Audit trail cryptographically signed by OffSync Attestation Engine</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION F: SOCIAL PROOF & ACADEMIC TECH STRIP
      ========================================================================= */}
      <section id="research" className="py-16 px-6 max-w-7xl mx-auto w-full text-center border-t border-white/10">
        <p className="text-xs font-mono-code uppercase tracking-widest text-slate-400 mb-8">
          Built for Academic Software Engineering Projects, Capstone Teams, and Hackathons
        </p>

        {/* Tech Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-300 font-mono-code">
          <div className="px-4 py-2 rounded-xl glass-card flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#38BDF8]" />
            <span>VS Code Extension</span>
          </div>
          <div className="px-4 py-2 rounded-xl glass-card flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#10B981]" />
            <span>Git AST Parser</span>
          </div>
          <div className="px-4 py-2 rounded-xl glass-card flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-white" />
            <span>GitHub Webhooks API</span>
          </div>
          <div className="px-4 py-2 rounded-xl glass-card flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#F59E0B]" />
            <span>WASM / Rust Telemetry Daemon</span>
          </div>
          <div className="px-4 py-2 rounded-xl glass-card flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#818CF8]" />
            <span>Ed25519 Cryptographic Proof</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION G: FOOTER
      ========================================================================= */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 px-6 text-xs text-slate-400 font-light">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-[#0EA5E9] flex items-center justify-center text-white">
                <Code2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-bold text-white text-sm">OffSync</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-light mb-4">
              Offline Collaboration & Code Contribution Attestation Engine. Reconciling offline developer telemetry with Git repositories to ensure fair team grading.
            </p>
            <div className="text-[11px] font-mono-code text-slate-500">
              Compliant with privacy-preserving student telemetry guidelines (Zero keystroke content logging).
            </div>
          </div>

          <div>
            <span className="font-semibold text-white block mb-3 font-mono-code uppercase text-[11px]">
              Platform Modules
            </span>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li><Link href="/login?role=lecturer" className="hover:text-[#38BDF8] transition">Lecturer Assessment Console</Link></li>
              <li><Link href="/login?role=student" className="hover:text-[#38BDF8] transition">Student Workspace</Link></li>
              <li><a href="#how-it-works" className="hover:text-[#38BDF8] transition">Attestation Workflow</a></li>
              <li><a href="#dashboard-preview" className="hover:text-[#38BDF8] transition">Equity Sandbox</a></li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-white block mb-3 font-mono-code uppercase text-[11px]">
              Research & Ethics
            </span>
            <ul className="space-y-2 text-slate-400 text-xs font-mono-code text-[11px]">
              <li><span className="text-[#10B981]">●</span> GDPR Privacy Safe</li>
              <li><span className="text-[#38BDF8]">●</span> Open Source Telemetry</li>
              <li><span className="text-slate-500">●</span> SHA-256 Hash Protocol</li>
              <li><span className="text-slate-500">●</span> Academic Defense 2026</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] font-mono-code gap-2">
          <p>© 2026 OffSync Research Framework. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Deep Slate & Electric Cyan Theme</span>
            <span>·</span>
            <span>Ed25519 Verified</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
