import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  error,
  helperText,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const describedByIds = [];
  if (helperText) describedByIds.push(`${id}-helper`);
  if (error) describedByIds.push(`${id}-error`);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-slate-500"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-xl border bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 placeholder:text-slate-400 ${
          error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={describedByIds.join(' ') || undefined}
        {...props}
      />
      {helperText && !error && (
        <p
          id={id ? `${id}-helper` : undefined}
          className="text-[11px] text-slate-400"
        >
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={id ? `${id}-error` : undefined}
          className="text-[11px] font-medium text-rose-500"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;

