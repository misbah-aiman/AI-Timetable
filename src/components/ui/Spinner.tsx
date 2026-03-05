import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500 ${sizeClasses[size]}`}
      aria-label="Loading"
    />
  );
};

export default Spinner;

