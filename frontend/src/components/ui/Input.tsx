import React, { forwardRef } from 'react';
import { Calendar, Clock } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  sizeVariant?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  sizeVariant = 'md',
  className = '',
  id,
  type,
  onClick,
  ...props
}, ref) => {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  const isDate = type === 'date' || type === 'datetime-local';
  const isTime = type === 'time';
  const isDateTime = isDate || isTime;

  const sizeClasses = {
    sm: 'h-9 text-xs',
    md: 'h-11 text-xs sm:text-sm',
    lg: 'h-12 text-sm',
  }[sizeVariant];

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isDateTime) {
      try {
        (e.currentTarget as any).showPicker?.();
      } catch {}
    }
    onClick?.(e);
  };

  return (
    <div className="w-full space-y-1.5 group text-right">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-foreground select-none transition-colors group-focus-within:text-primary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {rightIcon && (
          <div className="absolute right-3.5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary group-hover:text-foreground shrink-0 z-10">
            {rightIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          onClick={handleClick}
          className={`w-full ${sizeClasses} px-3.5 rounded-xl bg-card/90 hover:bg-card border text-foreground placeholder:text-muted-foreground font-medium transition-all duration-200 disabled:opacity-50 disabled:bg-muted/40 shadow-xs ${
            isDateTime ? 'cursor-pointer' : ''
          } ${
            error
              ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
              : 'border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20'
          } ${rightIcon ? 'pr-10' : ''} ${leftIcon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
        {leftIcon && (
          <div className="absolute left-3.5 text-muted-foreground pointer-events-none shrink-0">
            {leftIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 3,
  ...props
}, ref) => {
  const textareaId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-foreground select-none">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`w-full p-3.5 rounded-xl bg-background border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none disabled:opacity-50 ${
          error ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-border'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';
