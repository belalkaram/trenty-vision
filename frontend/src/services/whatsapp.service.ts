import { api } from './api.client';
import { WhatsAppAccount, CreateWhatsAppAccountInput } from '@/types/whatsapp';

export const whatsappService = {
  async listAccounts(): Promise<WhatsAppAccount[]> {
    const res = await api.get<any>('/api/v1/whatsapp/accounts');
    const rawList = res.data || [];
    return rawList.map((acc: any) => {
      const effectiveStatus = acc.liveStatus || acc.status || 'disconnected';
      const effectiveQr = acc.liveQrCode || acc.qrCode || null;
      const effectivePairing = acc.livePairingCode || acc.pairingCode || null;
      const effectivePhone = acc.livePhoneNumber || acc.phoneNumber || null;
      return {
        id: acc.id,
        companyId: acc.companyId,
        sessionName: acc.displayName || acc.sessionName || 'Trenty Vision — الخط الرئيسي',
        displayName: acc.displayName || acc.sessionName || 'Trenty Vision — الخط الرئيسي',
        phoneNumber: effectivePhone,
        status: effectiveStatus,
        liveStatus: effectiveStatus,
        qrCode: effectiveQr,
        liveQrCode: effectiveQr,
        pairingCode: effectivePairing,
        livePairingCode: effectivePairing,
        batteryLevel: acc.batteryLevel,
        isDefault: acc.isDefault,
        isPrimaryDispatcher: Boolean(acc.isPrimaryDispatcher),
        dispatcherSlot: acc.dispatcherSlot || null,
        lastConnectedAt: acc.connectedAt || acc.lastConnectedAt || null,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      } as WhatsAppAccount;
    });
  },

  async setDispatcherStatus(id: string, isPrimaryDispatcher: boolean, slot?: number): Promise<any> {
    const res = await api.patch<any>(`/api/v1/whatsapp/accounts/${id}/dispatcher`, {
      isPrimaryDispatcher,
      dispatcherSlot: slot,
    });
    return res.data;
  },

  async createAccount(input: CreateWhatsAppAccountInput): Promise<WhatsAppAccount> {
    const res = await api.post<any>('/api/v1/whatsapp/accounts', {
      displayName: input.sessionName || input.displayName,
      sessionName: input.sessionName || input.displayName,
    });
    return res.data;
  },

  async getQrCode(sessionId: string): Promise<{ qr: string }> {
    const res = await api.get<{ qr: string }>(`/api/v1/whatsapp/accounts/${sessionId}/qr`);
    return res.data;
  },

  async requestPairingCode(sessionId: string, phoneNumber: string): Promise<{ code: string; formattedCode?: string }> {
    const res = await api.post<any>(`/api/v1/whatsapp/accounts/${sessionId}/pairing-code`, {
      phoneNumber,
    });
    const d = res.data || {};
    const code = d.formattedCode || d.pairingCode || d.code || '';
    return { code, formattedCode: d.formattedCode || code };
  },

  async connectSession(sessionId: string): Promise<void> {
    await api.post(`/api/v1/whatsapp/accounts/${sessionId}/connect`, {});
  },

  async restartSession(sessionId: string): Promise<void> {
    await api.post(`/api/v1/whatsapp/accounts/${sessionId}/restart`, {});
  },

  async resetSession(sessionId: string): Promise<void> {
    await api.post(`/api/v1/whatsapp/accounts/${sessionId}/reset`, {});
  },

  async logoutSession(id: string): Promise<void> {
    await api.post(`/api/v1/whatsapp/accounts/${id}/logout`);
  },

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/api/v1/whatsapp/accounts/${id}`);
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/api/v1/whatsapp/accounts/${sessionId}`);
  },
};
