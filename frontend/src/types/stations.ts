export interface Station {
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  status: 'active' | 'inactive' | 'archived';
  active?: boolean;
  maxCapacity?: number | null;
  isUnlimited?: boolean;
  routingWeight?: number;
  assignedAgentsCount?: number;
  employeeCount?: number;
  activeChatsCount?: number;
  employeeIds?: string[];
  employees?: {
    employeeId: string;
    userId: string;
    name: string;
    email: string;
    whatsappNumber?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStationInput {
  name: string;
  code?: string;
  description?: string;
  color?: string;
  maxCapacity?: number | null;
  routingWeight?: number;
  status?: 'active' | 'inactive';
  active?: boolean;
  employeeIds?: string[];
}

