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
      className={`rounded-2xl bg-white text-primary-900 shadow-soft ring-1 ring-primary-200/60 ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

