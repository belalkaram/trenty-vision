import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { SidebarProvider } from '@/context/SidebarContext';
import { AppLayout } from '@/components/layout/AppLayout';

// Feature Pages
import { LoginPage } from '@/pages/LoginPage';
import { SuperAdminLogin } from '@/pages/superadmin/SuperAdminLogin';
import { SuperAdminDashboard } from '@/pages/superadmin/SuperAdminDashboard';
import { DashboardPage } from '@/pages/DashboardPage';
import { InboxPage } from '@/pages/InboxPage';
import { WhatsAppPage } from '@/pages/WhatsAppPage';
import { RemindersPage } from '@/pages/RemindersPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { StationsPage } from '@/pages/StationsPage';
import { AutomationsPage } from '@/pages/AutomationsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuditPage } from '@/pages/AuditPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Configure TanStack Query client with optimal caching and error retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <SidebarProvider>
              <ErrorBoundary>
                <Routes>
                  {/* Public Route */}
                  <Route path="/login" element={<LoginPage />} />
                  
                  {/* Super Admin Routes */}
                  <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />

                  {/* Protected Workspace Routes inside AppLayout */}
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="reminders" element={<RemindersPage />} />
                    <Route path="whatsapp" element={<WhatsAppPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="stations" element={<StationsPage />} />
                    <Route path="departments" element={<DepartmentsPage />} />
                    <Route path="automations" element={<AutomationsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="contacts" element={<ContactsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="audit" element={<AuditPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </SidebarProvider>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
