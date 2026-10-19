'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, setToken, setUser } from '@/services/api';
import {
  Code2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowLeft,
  GraduationCap,
  Terminal,
  Loader2,
  Sparkles
} from 'lucide-react';

export const AuthCard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-[#6FAF9A]/20 shadow-xl shadow-[#0D1110]/5 relative">
      {/* Top Brand Logo & Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <Link
          href="/"
          className="font-extrabold text-2xl tracking-tight text-[#0D1110] hover:text-[#6FAF9A] transition mb-2"
        >
          INCODE
        </Link>

        <h2 className="text-sm font-semibold text-[#0D1110]">
          {tab === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="text-xs text-[#576561] font-normal mt-0.5">
          {tab === 'login'
            ? 'Access your telemetry, tasks, and Git contributions.'
            : 'Join your team to verify work and collaborate fairly.'}
        </p>
      </div>

      {/* Pill Switcher */}
      <div className="grid grid-cols-2 p-1 bg-[#EFF8F3] border border-[#6FAF9A]/20 rounded-full mb-6 text-xs">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setError('');
            setSuccess('');
          }}
          className={`py-2 rounded-full font-semibold transition cursor-pointer ${tab === 'login' ? 'bg-[#0D1110] text-white shadow-xs' : 'text-[#576561] hover:text-[#0D1110]'
            }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setError('');
            setSuccess('');
          }}
          className={`py-2 rounded-full font-semibold transition cursor-pointer ${tab === 'register' ? 'bg-[#0D1110] text-white shadow-xs' : 'text-[#576561] hover:text-[#0D1110]'
            }`}
        >
          Register
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-[#EFF8F3] border border-[#6FAF9A]/40 text-[#2d5849] rounded-xl text-xs font-medium mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#6FAF9A]" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {tab === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-[#0D1110] mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deneth Godakandage"
              className="w-full bg-[#EFF8F3]/40 border border-[#6FAF9A]/20 rounded-xl px-3.5 py-2.5 text-xs text-[#0D1110] placeholder:text-[#8fa099] focus:outline-none focus:border-[#6FAF9A] focus:bg-white transition"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#0D1110] mb-1.5">Academic Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="w-full bg-[#EFF8F3]/40 border border-[#6FAF9A]/20 rounded-xl px-3.5 py-2.5 text-xs text-[#0D1110] placeholder:text-[#8fa099] focus:outline-none focus:border-[#6FAF9A] focus:bg-white transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0D1110] mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-[#EFF8F3]/40 border border-[#6FAF9A]/20 rounded-xl px-3.5 py-2.5 text-xs text-[#0D1110] placeholder:text-[#8fa099] focus:outline-none focus:border-[#6FAF9A] focus:bg-white transition"
          />
        </div>

        {tab === 'register' && (
          <div className="pt-1">
            <label className="block text-xs font-semibold text-[#0D1110] mb-1.5">Account Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-3 rounded-2xl border text-xs text-left transition cursor-pointer ${role === 'student'
                  ? 'border-[#6FAF9A] bg-[#EFF8F3] text-[#0D1110] font-semibold shadow-xs'
                  : 'border-[#6FAF9A]/20 bg-white/70 text-[#576561] hover:border-[#6FAF9A]/40'
                  }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Terminal className="w-3.5 h-3.5 text-[#6FAF9A]" />
                  <span className="font-bold text-xs text-[#0D1110]">Student</span>
                </div>
                <div className="text-[11px] text-[#576561] font-normal">Track tasks & code</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('lecturer')}
                className={`p-3 rounded-2xl border text-xs text-left transition cursor-pointer ${role === 'lecturer'
                  ? 'border-[#6FAF9A] bg-[#EFF8F3] text-[#0D1110] font-semibold shadow-xs'
                  : 'border-[#6FAF9A]/20 bg-white/70 text-[#576561] hover:border-[#6FAF9A]/40'
                  }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#6FAF9A]" />
                  <span className="font-bold text-xs text-[#0D1110]">Lecturer</span>
                </div>
                <div className="text-[11px] text-[#576561] font-normal">Audit & manage assignments</div>
              </button>
            </div>
          </div>
        )}

        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full text-xs font-semibold bg-[#0D1110] hover:bg-[#1a2220] text-white transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-[#0D1110]/10"
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

      <div className="mt-8 pt-5 border-t border-[#6FAF9A]/15 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#576561] hover:text-[#0D1110] transition font-medium"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};
