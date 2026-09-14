import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-muted/60 rounded-xl ${className}`} />;
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="w-16 h-7" />
          <Skeleton className="w-32 h-3" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
      <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
        <Skeleton className="w-48 h-8 rounded-xl" />
        <Skeleton className="w-24 h-8 rounded-xl" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChatSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Contacts column */}
      <div className="w-80 border-l border-border p-3 space-y-3 hidden sm:block">
        <Skeleton className="w-full h-10 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl border border-border flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-24 h-3.5" />
                <Skeleton className="w-36 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Messages column */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="w-28 h-3.5" />
              <Skeleton className="w-16 h-2.5" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-hidden flex flex-col justify-end">
          <Skeleton className="w-64 h-14 rounded-2xl self-start" />
          <Skeleton className="w-72 h-16 rounded-2xl self-end" />
          <Skeleton className="w-48 h-12 rounded-2xl self-start" />
        </div>
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="w-48 h-6" />
          <Skeleton className="w-72 h-3.5" />
        </div>
        <Skeleton className="w-28 h-10 rounded-xl" />
      </div>
      <CardSkeleton count={4} />
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
};
