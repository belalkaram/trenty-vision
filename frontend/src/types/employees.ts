export interface Employee {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  whatsappNumber?: string;
  role: string;
  roleId?: string;
  stationIds?: string[];
  status: 'active' | 'inactive' | 'suspended';
  presenceStatus?: 'online' | 'busy' | 'offline';
  activeChatsCount?: number;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  whatsappNumber?: string;
  roleId: string;
  stationIds?: string[];
}
