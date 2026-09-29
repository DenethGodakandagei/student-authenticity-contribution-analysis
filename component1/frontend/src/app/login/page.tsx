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
  User,
  Sparkles
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
        setSuccess('Account created. Accessing your workspace...');
        setToken(res.token);
        setUser(res.user);
        setTimeout(() => {
          router.push(res.user.role === 'lecturer' ? '/lecturer' : '/student');
        }, 900);
      } else {
        const res = await api.auth.login({ email, password });
        setSuccess('Signed in. Opening dashboard...');
        setToken(res.token);
        setUser(res.user);
        setTimeout(() => {
          router.push(res.user.role === 'lecturer' ? '/lecturer' : '/student');
        }, 900);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md relative">
      
      {/* Top Brand Logo & Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <Link href="/" className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-950 text-[#A3E635] mb-3 shadow-xs hover:scale-105 transition">
          <Code2 className="w-6 h-6 stroke-[2.2]" />
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-extrabold text-xl tracking-tight text-slate-900">OffSync</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200">
            Academic Node
          </span>
        </div>
        <h2 className="text-sm font-semibold text-slate-700">
          {tab === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          {tab === 'login' 
            ? 'Access your telemetry, tasks, and Git contributions.' 
            : 'Join your team to verify work and collaborate fairly.'}
        </p>
      </div>

      {/* Pill Switcher (Sign In / Register) */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/80 rounded-full mb-6 text-xs">
        <button
          type="button"
          onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
          className={`py-2 rounded-full font-semibold transition cursor-pointer ${
            tab === 'login'
              ? 'bg-[#121417] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); setError(''); setSuccess(''); }}
          className={`py-2 rounded-full font-semibold transition cursor-pointer ${
            tab === 'register'
              ? 'bg-[#121417] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Register
        </button>
      </div>

      {/* Quick Demo Pre-fill for Testing */}
      {tab === 'login' && (
        <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
          <div className="text-slate-500 mb-2 flex items-center justify-between text-[11px]">
            <span className="font-medium flex items-center gap-1 text-slate-700">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick demo accounts:
            </span>
            <span className="text-slate-400 font-mono">password123</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('sarah.jenkins@university.edu');
                setPassword('password123');
                setError('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] text-left transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate font-medium">Lecturer Demo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('alex.rivera@student.edu');
                setPassword('password123');
                setError('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] text-left transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Terminal className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
              <span className="truncate font-medium">Student Demo</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Notifications */}
      {error && (
        <div className="mb-5 p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5 text-left animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 text-left animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        
        {/* Full Name for Registration */}
        {tab === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deneth Godakandage"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#A3E635] focus:bg-white transition"
              />
            </div>
          </div>
        )}

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Academic Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#A3E635] focus:bg-white transition"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#A3E635] focus:bg-white transition"
          />
        </div>

        {/* Role Selection for Registration */}
        {tab === 'register' && (
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-3 rounded-2xl border text-xs text-left transition cursor-pointer ${
                  role === 'student'
                    ? 'border-[#A3E635] bg-[#A3E635]/15 text-slate-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-900" />
                  <span className="font-bold text-xs text-slate-900">Student</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">Track tasks & code</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('lecturer')}
                className={`p-3 rounded-2xl border text-xs text-left transition cursor-pointer ${
                  role === 'lecturer'
                    ? 'border-[#A3E635] bg-[#A3E635]/15 text-slate-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-900" />
                  <span className="font-bold text-xs text-slate-900">Lecturer</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">Audit & manage cohort</div>
              </button>
            </div>
          </div>
        )}

        {/* Submit Button (Vibrant Solid Lime) */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full text-xs font-bold bg-[#A3E635] hover:bg-[#8EE01D] text-slate-950 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking credentials...</span>
              </>
            ) : (
              <>
                <span>{tab === 'register' ? 'Create Account' : 'Sign In'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Back to Home Link */}
      <div className="mt-8 pt-5 border-t border-slate-100 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition font-medium"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to Home</span>
        </Link>
      </div>

    </div>
  );
}

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
        <span className="text-[11px] bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600">
          Academic Portal
        </span>
      </div>

      {/* Main Authentication Center */}
      <div className="flex-grow flex items-center justify-center my-8">
        <Suspense fallback={
          <div className="w-full max-w-md bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-md">
            <p className="text-xs text-slate-500">Loading sign in portal...</p>
          </div>
        }>
          <LoginPageContent />
        </Suspense>
      </div>

      {/* Minimal Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 py-3 font-normal">
        OffSync — Trust & Equity Analytics for Student Contributions © 2026
      </div>
    </div>
  );
}
