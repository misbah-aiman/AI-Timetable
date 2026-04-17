import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-primary-600 bg-white text-primary-800 shadow-soft hover:bg-primary-100 focus-visible:ring-primary-500',
  secondary:
    'border border-primary-300 bg-primary-50 text-primary-800 shadow-sm hover:bg-primary-100 focus-visible:ring-primary-300',
  danger:
    'border border-primary-600 bg-white text-primary-800 shadow-sm hover:bg-primary-100 focus-visible:ring-primary-500',
  ghost:
    'bg-transparent text-primary-700 hover:bg-primary-100 focus-visible:ring-primary-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  isLoading,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
      )}
      <span className="truncate">{children}</span>
    </button>
  );
};

export default Button;

