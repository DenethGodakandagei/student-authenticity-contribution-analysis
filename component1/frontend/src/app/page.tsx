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
  Sparkles,
  Laptop,
  Bot,
  ClipboardCheck
} from 'lucide-react';

export default function HomePage() {
  // Interactive Hero Preview State (Simulating Offline Buffer -> Online Attested)
  const [heroSyncState, setHeroSyncState] = useState<'buffered' | 'synced'>('synced');

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col justify-between font-sans selection:bg-[#A3E635] selection:text-slate-950">
      
      {/* =========================================================================
          TOP NAVIGATION BAR
      ========================================================================= */}
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
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#preview" className="hover:text-slate-900 transition">Evaluation Matrix</a>
            <Link href="/student" className="hover:text-slate-900 transition">Student View</Link>
            <Link href="/lecturer" className="hover:text-slate-900 transition">Lecturer View</Link>
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

      {/* =========================================================================
          HERO SECTION
      ========================================================================= */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        
        {/* Top Tag Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-slate-200/80 bg-white text-slate-700 text-xs font-medium mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
          <span>Verified Student Code Contributions</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-normal">Offline Telemetry & Git Proof</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-[1.12] mb-6">
          Fair, Transparent & Verified <br className="hidden sm:inline" />
          <span className="text-slate-900 underline decoration-[#A3E635] decoration-wavy decoration-2">
            Student Code Contributions.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-normal leading-relaxed mb-8">
          OffSync records keystroke cadence and AST file diffs inside VS Code, proving authentic human work and preventing unfair group project grades.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3.5 mb-14 w-full max-w-md justify-center">
          <Link 
            href="/login?tab=register&role=student" 
            className="px-6 py-3 rounded-full bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Launch Student Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link 
            href="/login?role=lecturer" 
            className="px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200/80 shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
            <span>Lecturer Portal</span>
          </Link>
        </div>

        {/* Interactive Split Hero Preview Card */}
        <div className="w-full max-w-5xl rounded-3xl bg-white p-5 sm:p-7 text-left border border-slate-200/80 shadow-md relative overflow-hidden">
          
          {/* Top Window Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs text-slate-500 mb-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-[#22C55E] inline-block"></span>
              <span className="ml-2 font-medium text-slate-700">OffSync Telemetry Bridge · Live Active Node</span>
            </div>

            {/* State Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Simulate Sensor:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-full border border-slate-200">
                <button
                  onClick={() => setHeroSyncState('buffered')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    heroSyncState === 'buffered' 
                      ? 'bg-[#121417] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Offline Mode
                </button>
                <button
                  onClick={() => setHeroSyncState('synced')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    heroSyncState === 'synced' 
                      ? 'bg-[#A3E635] text-slate-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Verified & Synced
                </button>
              </div>
            </div>
          </div>

          {/* Split Dashboard Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Column: VS Code Telemetry Activity */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center justify-between text-slate-500 mb-3 pb-2 border-b border-slate-200">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Terminal className="w-4 h-4 text-slate-700" />
                  <span>VS Code Activity Logger</span>
                </span>
                {heroSyncState === 'buffered' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                    <WifiOff className="w-3 h-3" /> OFFLINE BUFFER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#15803D] bg-[#22C55E]/15 px-2 py-0.5 rounded-full font-bold">
                    <Wifi className="w-3 h-3 text-[#22C55E]" /> ONLINE SYNC
                  </span>
                )}
              </div>

              {/* Telemetry Stream Output */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Target File:</span>
                  <span className="font-mono font-semibold text-slate-900">src/components/Dashboard.tsx</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Typing Cadence:</span>
                  <strong className="font-mono text-slate-900 text-sm">91.4 WPM Peak</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Keystroke Breakdown:</span>
                  <span className="text-[#15803D] font-bold font-mono">92% Manual · 6% AI · 2% Pasted</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs mt-3 shadow-2xs">
                  <div className="text-slate-900 font-bold mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cryptographic Attestation Block:</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    1,840 keystrokes verified · 21 files attested · SHA-256 integrity seal
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Reconciliation & Authenticity Verdict */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-xs flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-3 pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                    <span>Contribution Score</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Target: GitHub Repo</span>
                </div>

                {heroSyncState === 'buffered' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Offline work buffered securely on local disk</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Telemetry daemon runs in the background with zero internet. Work timestamps and rhythms are encrypted locally.
                    </p>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full w-[65%]"></div>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">Waiting for git push sync...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#15803D] font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                      <span>100% Authenticity Verified</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Reconciliation engine verified 1,840 keystrokes against GitHub commits. Natural human typing rhythm confirmed.
                    </p>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#A3E635] h-full w-full"></div>
                    </div>
                    <span className="text-[11px] text-[#15803D] font-bold block font-mono">
                      Standing: 50% Weighted Final Grade (Optimal)
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Verification Hash Tag */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Proof: <strong className={heroSyncState === 'buffered' ? 'text-amber-600' : 'text-[#15803D]'}>{heroSyncState === 'buffered' ? 'Local Buffer' : 'Attestation Valid'}</strong></span>
                <span className="font-mono">OffSync Protocol v2.0</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURES SECTION
      ========================================================================= */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 mb-3">
            Multi-Modal Contribution Verification
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Eliminate subjective grading disputes with clear, objective data points gathered across the entire software development lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-5 text-slate-800">
                <Laptop className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Offline-First Sensor</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Lightweight local capture of active edit bursts, keystrokes, and AST diffs without storing raw source code or private data.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Zero Leakage</span>
              <span className="text-[#15803D] font-bold">Privacy First</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-5 text-purple-600">
                <Bot className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Biometric Provenance</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identifies organic human keystrokes vs. AI-generated code pastes or massive external code dumps with 100% precision.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>AI Detection</span>
              <span className="text-purple-600 font-bold">Keystroke Cadence</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-5 text-blue-600">
                <Activity className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Collaboration Equity Index</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instant analytics showing real workload distribution vs. superficial commits, alerting examiners to inactive members early.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Weighted Standing</span>
              <span className="text-blue-600 font-bold">Fair Grading</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/20 flex items-center justify-center mb-5 text-slate-900">
                <GitBranch className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Git Remote Attestation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically verifies that local project directories match the assigned team repository by reading the local Git configuration.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>GitHub Linked</span>
              <span className="text-[#15803D] font-bold">Remote Attested</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS SECTION
      ========================================================================= */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Simple Workflow</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 mb-3">
            How OffSync Works in 3 Steps
          </h2>
          <p className="text-slate-500 text-sm">
            Zero disruption to standard developer workflows. Code normally, online or offline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="text-3xl font-black font-mono text-slate-200 mb-4">01</div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Code in VS Code</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Students write code normally. The lightweight sensor records typing rhythm and active sessions without capturing private text.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="text-3xl font-black font-mono text-slate-200 mb-4">02</div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Cryptographic Attestation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Telemetry events are hashed locally so past timestamps and contribution records cannot be altered or fabricated.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="text-3xl font-black font-mono text-slate-200 mb-4">03</div>
            <div className="w-9 h-9 rounded-xl bg-[#A3E635]/25 text-slate-900 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Reconcile & Assess</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When pushing code to GitHub, OffSync matches commits against telemetry to produce an objective, fair contribution score.
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SAMPLE EVALUATION MATRIX (SECTION PREVIEW)
      ========================================================================= */}
      <section id="preview" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200/80 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
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
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          
          <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900">Project: Distributed System Development</span>
              <span className="text-slate-400 font-mono">Code: DIST-901</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-slate-600">Cohort Average: <strong className="text-slate-900">84%</strong></span>
              <span className="text-slate-600">Team Size: <strong className="text-slate-900">4 Students</strong></span>
            </div>
          </div>

          {/* Table */}
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
                
                {/* Student 1 */}
                <tr className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900">Alex Rivera</div>
                    <div className="text-[11px] text-slate-400 font-mono">@alex-rivera-dev</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">38.2 hrs</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">28 commits</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-[#15803D] bg-[#22C55E]/15 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> 100% Verified
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#A3E635] h-full w-[94%]"></div>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">94%</span>
                    </div>
                  </td>
                </tr>

                {/* Student 2 */}
                <tr className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900">Chloe Chen</div>
                    <div className="text-[11px] text-slate-400 font-mono">@chloe-c</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">34.0 hrs</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">22 commits</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-[#15803D] bg-[#22C55E]/15 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> 95% Verified
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#A3E635] h-full w-[88%]"></div>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">88%</span>
                    </div>
                  </td>
                </tr>

                {/* Student 3 */}
                <tr className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900">Emma Watson</div>
                    <div className="text-[11px] text-slate-400 font-mono">@emma-w-student</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">46.5 hrs</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">34 commits</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-[#15803D] bg-[#22C55E]/15 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> 98% Verified
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#A3E635] h-full w-[96%]"></div>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">96%</span>
                    </div>
                  </td>
                </tr>

                {/* Student 4 */}
                <tr className="bg-rose-50/40 hover:bg-rose-50/60 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Marcus Vance</span>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="text-[11px] text-rose-500 font-mono font-medium">@marcusv-codes • Anomaly Flag</div>
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
                        <div className="bg-rose-500 h-full w-[24%]"></div>
                      </div>
                      <span className="font-mono text-xs font-bold text-rose-600">24%</span>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-mono gap-2">
            <span>Team Collaboration Equity: <strong>Optimal Balance</strong></span>
            <span className="text-[#15803D] font-bold">Signed by OffSync Attestation Protocol</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER
      ========================================================================= */}
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
              <li><Link href="/login?role=student" className="hover:text-slate-900 transition">Student Workspace</Link></li>
              <li><Link href="/login?role=lecturer" className="hover:text-slate-900 transition">Lecturer Console</Link></li>
              <li><Link href="/student/simulator" className="hover:text-slate-900 transition">Telemetry Simulator</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-slate-900 block mb-3 uppercase text-[11px] font-mono">
              Integrations
            </span>
            <ul className="space-y-2 text-slate-600 text-xs font-mono text-[11px]">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> VS Code Sensor v2.0</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> GitHub Commits Mining</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Kanban Velocity Tracking</li>
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

    </div>
  );
}
