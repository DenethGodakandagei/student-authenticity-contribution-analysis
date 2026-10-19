import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  }[size];

  const variantStyles = {
    primary: 'bg-[#0D1110] text-white hover:bg-[#1a2220] shadow-xs hover:shadow active:scale-[0.99]',
    secondary: 'bg-[#EFF8F3] text-[#0D1110] hover:bg-[#e2ece7] border border-[#6FAF9A]/20 active:scale-[0.99]',
    outline: 'border border-[#6FAF9A]/25 bg-white text-[#0D1110] hover:bg-[#EFF8F3]/50 hover:border-[#6FAF9A]/40',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
    ghost: 'text-[#576561] hover:text-[#0D1110] hover:bg-[#EFF8F3]'
  }[variant];

  return (
    <button
      className={cn(baseStyles, sizeStyles, variantStyles, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      )}
      {children}
    </button>
  );
};
