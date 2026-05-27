import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-xl border bg-white/5 backdrop-blur-sm',
            'text-gray-100 placeholder-gray-500 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-debtwise-500/50 focus:border-debtwise-500',
            error
              ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
              : 'border-white/10 hover:border-white/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-xl border bg-white/5 backdrop-blur-sm',
            'text-gray-100 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-debtwise-500/50 focus:border-debtwise-500',
            error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-xl border bg-white/5 backdrop-blur-sm',
            'text-gray-100 placeholder-gray-500 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-debtwise-500/50 focus:border-debtwise-500',
            error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20',
            'resize-vertical min-h-[100px]',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
