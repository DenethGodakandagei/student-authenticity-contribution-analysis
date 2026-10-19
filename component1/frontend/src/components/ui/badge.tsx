import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'lime';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 rounded-full font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium'
  }[size];

  const variantStyles = {
    success: 'bg-[#EFF8F3] text-[#2d5849] border border-[#6FAF9A]/30',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    info: 'bg-[#EFF8F3] text-[#2d5849] border border-[#6FAF9A]/30',
    neutral: 'bg-[#EFF8F3]/60 text-[#0D1110] border border-[#6FAF9A]/20',
    lime: 'bg-[#EFF8F3] text-[#0D1110] border border-[#6FAF9A]/35 font-semibold'
  }[variant];

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', sizeStyles, variantStyles, className)}
      {...props}
    >
      {children}
    </span>
  );
};
