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
}

export interface LoginResponse {
  user: User;
  token?: string;
}
