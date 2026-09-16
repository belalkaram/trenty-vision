import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompanyInfo, User } from '@/types/auth';
import { authService } from '@/services/auth.service';

interface CompanyContextType {
  company: CompanyInfo | null;
  setCompany: (comp: CompanyInfo | null) => void;
  updateCompanyBranding: (name: string, logoUrl?: string | null) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompanyState] = useState<CompanyInfo | null>(() => {
    try {
      const stored = localStorage.getItem('active_company');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setCompany = useCallback((comp: CompanyInfo | null) => {
    setCompanyState(comp);
    if (comp) {
      localStorage.setItem('active_company', JSON.stringify(comp));
      document.title = comp.name ? `${comp.name} - إدارة واتساب` : 'منظومة إدارة واتساب المتكاملة';
    } else {
      localStorage.removeItem('active_company');
    }
  }, []);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
      if (user.company) {
        setCompany(user.company);
      }
    } else {
      localStorage.removeItem('current_user');
    }
  }, [setCompany]);

  const updateCompanyBranding = useCallback((name: string, logoUrl?: string | null) => {
    setCompanyState((prev) => {
      const updated: CompanyInfo = {
        id: prev?.id || 'default',
        name: name || prev?.name || 'WhatsApp CRM',
        logoUrl: logoUrl !== undefined ? logoUrl : prev?.logoUrl || null,
        slug: prev?.slug,
        status: prev?.status,
        subscriptionPlan: prev?.subscriptionPlan,
        maxUsers: prev?.maxUsers,
      };
      localStorage.setItem('active_company', JSON.stringify(updated));
      document.title = updated.name ? `${updated.name} - إدارة واتساب` : 'منظومة إدارة واتساب المتكاملة';
      return updated;
    });
  }, []);

  const refreshCompany = useCallback(async () => {
    try {
      const user = await authService.getProfile();
      if (user) {
        setCurrentUserState(user);
        localStorage.setItem('current_user', JSON.stringify(user));
        if (user.company) {
          setCompanyState(user.company);
          localStorage.setItem('active_company', JSON.stringify(user.company));
          document.title = user.company.name ? `${user.company.name} - إدارة واتساب` : 'منظومة إدارة واتساب المتكاملة';
        }
      }
    } catch (err) {
      console.error('Failed to refresh company profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCompany();
  }, [refreshCompany]);

  // Determine if current user is Super Admin
  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
    (currentUser && currentUser.companyId === null && (currentUser.role === 'super_admin' || !currentUser.roleId))
  );

  return (
    <CompanyContext.Provider
      value={{
        company,
        setCompany,
        updateCompanyBranding,
        currentUser,
        setCurrentUser,
        isSuperAdmin,
        isLoading,
        refreshCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
