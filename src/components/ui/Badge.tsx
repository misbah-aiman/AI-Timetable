import React from 'react';

export type Priority = 'high' | 'medium' | 'low';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority?: Priority;
}

const priorityStyles: Record<Priority, string> = {
  high: 'bg-primary-100 text-primary-800 ring-primary-200',
  medium: 'bg-primary-100 text-primary-800 ring-primary-200',
  low: 'bg-primary-100 text-primary-800 ring-primary-200',
};

export const Badge: React.FC<BadgeProps> = ({
  priority = 'medium',
  className = '',
  children,
  ...props
}) => {
  const label =
    typeof children === 'undefined' || children === null
      ? `${priority.charAt(0).toUpperCase()}${priority.slice(1)} priority`
      : children;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${priorityStyles[priority]} ${className}`}
      {...props}
    >
      {label}
    </span>
  );
};

export default Badge;

