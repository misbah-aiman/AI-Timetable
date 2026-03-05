import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  padded = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl bg-white/90 text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/80 backdrop-blur-sm ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

