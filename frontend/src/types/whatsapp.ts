export interface WhatsAppAccount {
  id: string;
  companyId?: string;
  sessionName: string;
  displayName?: string;
  phoneNumber?: string | null;
  livePhoneNumber?: string | null;
  status: 'connected' | 'connecting' | 'disconnected' | 'qr_required' | 'qr_ready' | 'logged_out' | 'error' | 'initializing';
  liveStatus?: string;
  qrCode?: string | null;
  liveQrCode?: string | null;
  pairingCode?: string | null;
  livePairingCode?: string | null;
  liveError?: string | null;
  batteryLevel?: number;
  isDefault?: boolean;
  isPrimaryDispatcher?: boolean;
  dispatcherSlot?: number | null;
  lastConnectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsAppAccountInput {
  sessionName: string;
  displayName?: string;
  phoneNumber?: string;
}

