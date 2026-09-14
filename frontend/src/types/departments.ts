export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: 'active' | 'inactive';
  employeesCount?: number;
  stationsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  code?: string;
  description?: string;
}
