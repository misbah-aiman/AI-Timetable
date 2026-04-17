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
          className="text-xs font-medium text-primary-700"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-xl border bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 shadow-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 placeholder:text-primary-400 ${
          error ? 'border-rose-400 focus:ring-rose-200' : 'border-primary-200'
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={describedByIds.join(' ') || undefined}
        {...props}
      />
      {helperText && !error && (
        <p
          id={id ? `${id}-helper` : undefined}
          className="text-[11px] text-primary-600"
        >
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={id ? `${id}-error` : undefined}
          className="text-[11px] font-medium text-primary-700"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;

