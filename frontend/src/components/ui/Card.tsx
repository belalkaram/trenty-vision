import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-5 shadow-soft transition-all ${
        hover ? 'hover:shadow-lift hover:border-border/80' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
