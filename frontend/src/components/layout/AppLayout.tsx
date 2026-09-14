import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { PageSkeleton } from '../ui/Skeleton';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-full flex antialiased bg-background text-foreground overflow-hidden relative">
      {/* Operations Deep Teal Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};
