import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children, variant = 'primary', size = 'md', loading, icon, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 ring-focus',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        {
          'bg-gradient-to-r from-debtwise-600 to-accent-600 hover:from-debtwise-500 hover:to-accent-500 text-white shadow-lg shadow-debtwise-500/20 hover:shadow-debtwise-500/40 active:scale-[0.98]':
            variant === 'primary',
          'bg-white/10 hover:bg-white/20 text-gray-100 border border-white/10 hover:border-white/20':
            variant === 'secondary',
          'hover:bg-white/5 text-gray-300 hover:text-white': variant === 'ghost',
          'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20': variant === 'danger',
          'glass text-gray-100 hover:bg-white/20 border-white/10': variant === 'glass',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-5 py-2.5 text-sm': size === 'md',
          'px-7 py-3.5 text-base': size === 'lg',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="text-lg">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
