'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, setToken, setUser } from '../../services/api';
import { 
  Code2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowLeft,
  GraduationCap,
  Terminal,
  Loader2,
  Lock,
  Mail,
  User
} from 'lucide-react';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tabs: 'login' | 'register'
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extract initial parameters from URL
  useEffect(() => {
    const initialTab = searchParams.get('tab');
    if (initialTab === 'register') setTab('register');
    
    const initialRole = searchParams.get('role');
    if (initialRole === 'lecturer') setRole('lecturer');
    if (initialRole === 'student') setRole('student');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'register') {
        const res = await api.auth.register({ name, email, password, role });
        setSuccess('Account created successfully. Accessing workspace...');
        setToken(res.token);
        setUser(res.user);
        setTimeout(() => {
          router.push(res.user.role === 'lecturer' ? '/lecturer' : '/student');
        }, 1200);
      } else {
        const res = await api.auth.login({ email, password });
        setSuccess('Authentication verified. Accessing portal...');
        setToken(res.token);
        setUser(res.user);
        setTimeout(() => {
          router.push(res.user.role === 'lecturer' ? '/lecturer' : '/student');
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-card rounded-2xl p-8 sm:p-10 border border-white/10 shadow-[0_0_50px_-10px_rgba(14,165,233,0.2)] relative">
      
      {/* Top Brand Logo & Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <Link href="/" className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 text-[#38BDF8] mb-4 shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:scale-105 transition">
          <Code2 className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-white">OffSync Attestation Node</h1>
        <p className="text-xs text-slate-400 font-mono-code font-light mt-1">
          {tab === 'login' ? 'Institutional Identity Verification' : 'Create Student / Lecturer Identity'}
        </p>
      </div>

      {/* Tab Selector (Sign In / Register) */}
      <div className="grid grid-cols-2 p-1 bg-slate-900/80 border border-white/10 rounded-xl mb-7 text-xs font-mono-code">
        <button
          type="button"
          onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
          className={`py-2 rounded-lg transition-all ${
            tab === 'login'
              ? 'bg-[#0EA5E9] text-white font-medium shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); setError(''); setSuccess(''); }}
          className={`py-2 rounded-lg transition-all ${
            tab === 'register'
              ? 'bg-[#0EA5E9] text-white font-medium shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Register
        </button>
      </div>

      {/* Quick Demo Pre-fill for Testing */}
      {tab === 'login' && (
        <div className="mb-5 p-3 rounded-xl bg-slate-900/60 border border-white/10 text-[11px] font-mono-code">
          <div className="text-slate-400 mb-2 flex items-center justify-between">
            <span>⚡ Quick Demo Credentials:</span>
            <span className="text-[10px] text-slate-500 font-light">(password: password123)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('sarah.jenkins@university.edu');
                setPassword('password123');
                setError('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 text-[11px] text-left transition flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">Lecturer Demo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('alex.rivera@student.edu');
                setPassword('password123');
                setError('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 text-[11px] text-left transition flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">Student Demo</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Notifications */}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-200 text-xs font-light flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs font-light flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name for Registration */}
        {tab === 'register' && (
          <div>
            <label className="block text-[11px] font-mono-code text-slate-400 uppercase tracking-wider mb-1.5 font-light">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition font-light"
              />
            </div>
          </div>
        )}

        {/* Email Address */}
        <div>
          <label className="block text-[11px] font-mono-code text-slate-400 uppercase tracking-wider mb-1.5 font-light">
            Academic Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition font-light"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-[11px] font-mono-code text-slate-400 uppercase tracking-wider mb-1.5 font-light">
            Security Key / Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition font-light"
          />
        </div>

        {/* Role Selection for Registration */}
        {tab === 'register' && (
          <div className="pt-1">
            <label className="block text-[11px] font-mono-code text-slate-400 uppercase tracking-wider mb-1.5 font-light">
              Designated Platform Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-3 rounded-xl border text-xs text-left transition-all ${
                  role === 'student'
                    ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 text-white font-medium shadow-[0_0_15px_rgba(14,165,233,0.2)]'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="font-mono-code text-[11px] text-white">Student</span>
                </div>
                <div className="text-[10px] text-slate-400 font-light">Join team & sync telemetry</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('lecturer')}
                className={`p-3 rounded-xl border text-xs text-left transition-all ${
                  role === 'lecturer'
                    ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 text-white font-medium shadow-[0_0_15px_rgba(14,165,233,0.2)]'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="font-mono-code text-[11px] text-white">Lecturer</span>
                </div>
                <div className="text-[10px] text-slate-400 font-light">Examiner & audit console</div>
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-medium bg-[#0EA5E9] hover:bg-[#38BDF8] text-white transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(14,165,233,0.3)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying Attestation...</span>
              </>
            ) : (
              <>
                <span>{tab === 'register' ? 'Register Account' : 'Authenticate & Access'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Back to Home Link */}
      <div className="mt-8 pt-6 border-t border-white/10 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#38BDF8] transition font-light font-mono-code"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Return to OffSync Overview</span>
        </Link>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between font-sans p-6 selection:bg-[#0EA5E9]/30 selection:text-[#38BDF8]">
      
      {/* Top Subtle Bar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between text-xs text-slate-400 font-mono-code font-light py-2">
        <Link href="/" className="flex items-center space-x-2 text-white">
          <div className="w-6 h-6 rounded-md bg-[#0EA5E9] text-white flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-semibold text-sm">OffSync</span>
        </Link>
        <span>Attestation Security Gateway</span>
      </div>

      {/* Main Authentication Center */}
      <div className="flex-grow flex items-center justify-center my-8">
        <Suspense fallback={
          <div className="w-full max-w-md glass-card rounded-2xl p-10 text-center">
            <p className="text-xs text-slate-400 font-mono-code">Loading authentication interface...</p>
          </div>
        }>
          <LoginPageContent />
        </Suspense>
      </div>

      {/* Minimal Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 font-light font-mono-code py-2">
        OffSync Offline Attestation Framework © 2026
      </div>
    </div>
  );
}

