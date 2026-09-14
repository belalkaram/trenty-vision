import { api } from './api.client';
import { User, LoginResponse } from '@/types/auth';

export const authService = {
  async getProfile(): Promise<User | null> {
    try {
      const res = await api.get<User>('/api/v1/auth/me');
      return res.data;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/api/v1/auth/login', { email, password });
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout', {});
    } finally {
      window.location.href = '/login';
    }
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<any>('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword: confirmPassword || newPassword,
    });
    return { success: res.success, message: res.message || 'تم تحديث كلمة المرور بنجاح' };
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<any>('/api/v1/auth/forgot-password', { email });
    return { success: res.success, message: res.message || 'تم إرسال رابط الاستعادة' };
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<any>('/api/v1/auth/reset-password', { token, password });
    return { success: res.success, message: res.message || 'تم إعادة تعيين كلمة المرور بنجاح' };
  },
};

