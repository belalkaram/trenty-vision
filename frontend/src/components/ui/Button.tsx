import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition select-none disabled:opacity-50 disabled:pointer-events-none touch-target';

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft hover:shadow-lift',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border shadow-sm',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-soft',
    outline: 'bg-transparent hover:bg-accent/40 text-foreground border border-border',
    ghost: 'bg-transparent hover:bg-accent/30 text-foreground',
  }[variant];

  const sizeStyles = {
    sm: 'h-9 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-xs gap-2',
    lg: 'h-12 px-5 text-sm gap-2.5',
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
