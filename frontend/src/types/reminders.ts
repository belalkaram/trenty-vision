export interface Reminder {
  id: string;
  title: string;
  note?: string | null;
  dueAt: string;
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  conversationId?: string | null;
  leadId?: string | null;
  assignedUserId: string;
  assignedUserName?: string | null;
  assignedUserEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface CreateReminderInput {
  title: string;
  dueAt: string;
  note?: string | null;
  conversationId?: string | null;
  leadId?: string | null;
  assignedUserId?: string;
}

export interface UpdateReminderInput {
  title?: string;
  dueAt?: string;
  note?: string | null;
  status?: 'pending' | 'completed' | 'cancelled' | 'overdue';
  assignedUserId?: string;
}
