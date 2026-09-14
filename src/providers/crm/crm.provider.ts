export interface CRMLeadPayload {
  externalId?: string;
  name: string;
  phone: string;
  source?: string;
  destination?: string;
  travelDate?: string;
  assignedEmployeeName?: string;
  metadata?: Record<string, any>;
}

export interface CRMProvider {
  createLead(lead: CRMLeadPayload): Promise<{ crmId: string }>;
  updateLead(crmId: string, lead: Partial<CRMLeadPayload>): Promise<void>;
  findLead(phone: string): Promise<CRMLeadPayload | null>;
  updateContact(phone: string, data: Record<string, any>): Promise<void>;
  assignLead(crmId: string, employeeEmail: string): Promise<void>;
  addNote(crmId: string, note: string): Promise<void>;
}

export class MockCRMProvider implements CRMProvider {
  async createLead(lead: CRMLeadPayload): Promise<{ crmId: string }> {
    return { crmId: `crm_lead_${Date.now()}` };
  }

  async updateLead(crmId: string, lead: Partial<CRMLeadPayload>): Promise<void> {}
  async findLead(phone: string): Promise<CRMLeadPayload | null> {
    return null;
  }
  async updateContact(phone: string, data: Record<string, any>): Promise<void> {}
  async assignLead(crmId: string, employeeEmail: string): Promise<void> {}
  async addNote(crmId: string, note: string): Promise<void> {}
}
