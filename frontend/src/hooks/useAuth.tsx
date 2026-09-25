import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const profile = await authService.getProfile();
      if (profile) {
        setUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_user', JSON.stringify(profile));
          if (profile.company) {
            localStorage.setItem('active_company', JSON.stringify(profile.company));
          }
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('current_user');
          localStorage.removeItem('active_company');
        }
        setUser(null);
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        localStorage.removeItem('active_company');
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, pass: string, rememberMe = true): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, pass, rememberMe);
      const token = res?.tokens?.accessToken || res?.token;
      if (token && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
          localStorage.setItem('saved_email', email);
        } else {
          localStorage.removeItem('remember_me');
          localStorage.removeItem('saved_email');
        }
        localStorage.setItem('current_user', JSON.stringify(res.user));
        if (res.user?.company) {
          localStorage.setItem('active_company', JSON.stringify(res.user.company));
        }
      }
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('remember_me');
        localStorage.removeItem('active_company');
        localStorage.removeItem('current_user');
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
