export interface CompanyInfo {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  status?: string;
  subscriptionPlan?: string;
  maxUsers?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  employeeId?: string | null;
  stationId?: string | null;
  role: 'adminstrator' | 'employer' | string;
  roleName?: string;
  avatarUrl?: string;
  status?: 'active' | 'inactive' | 'suspended';
  phone?: string;
  stationIds?: string[];
  permissions?: string[];
  remainingTrialDays?: number | null;
  companyId?: string | null;
  company?: CompanyInfo | null;
  isSuperAdmin?: boolean;
}

export interface LoginResponse {
  user: User;
  token?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: string;
    rememberMe?: boolean;
  };
}
