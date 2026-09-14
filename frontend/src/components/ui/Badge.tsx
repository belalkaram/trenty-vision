import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'sm',
  pulse = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    outline: 'bg-transparent text-muted-foreground border-border',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-lg font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-mono uppercase tracking-wider ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
