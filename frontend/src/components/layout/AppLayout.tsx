import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import { PageSkeleton } from '../ui/Skeleton';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { company, isSuperAdmin } = useCompany();
  const location = useLocation();

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

  // If user belongs to a Group Manager company, restrict to group-manager routes
  const effectiveType = user?.company?.type || company?.type;
  if (effectiveType === 'group_manager' && !isSuperAdmin) {
    const allowedPrefixes = ['/group-extract', '/group-add', '/whatsapp'];
    const isAllowed = allowedPrefixes.some((p) => location.pathname.startsWith(p));
    if (!isAllowed) {
      return <Navigate to="/group-extract" replace />;
    }
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
