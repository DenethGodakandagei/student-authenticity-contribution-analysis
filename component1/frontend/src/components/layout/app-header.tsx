'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, LogOut } from 'lucide-react';
import { logoutUser } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User } from '@/types';

interface AppHeaderProps {
  user: User | null;
  roleTitle: string;
  badgeVariant?: 'lime' | 'info';
  children?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  roleTitle,
  badgeVariant = 'lime',
  children
}) => {
  const router = useRouter();

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  return (
    <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-[#A3E635] shadow-xs group-hover:scale-105 transition">
              <Code2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">OffSync</span>
              <Badge variant={badgeVariant} size="sm">
                {roleTitle}
              </Badge>
            </div>
          </Link>
        </div>

        {/* Dynamic Center/Right actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {children}

          {/* User info */}
          {user && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[140px] leading-tight">
                  {user.email}
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Log out"
            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
