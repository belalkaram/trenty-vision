import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center mx-auto mb-3.5 border border-border shadow-sm">
        {icon || <Inbox className="w-6 h-6 text-muted-foreground" />}
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction} leftIcon={actionIcon}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
