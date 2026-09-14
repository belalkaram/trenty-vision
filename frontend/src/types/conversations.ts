export type MessageDirection = 'incoming' | 'outgoing';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'audio' | 'voice_note' | 'video' | 'document' | 'location' | 'contact';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface MessageMetadata {
  url?: string;
  fileName?: string;
  fileLength?: number;
  mimeType?: string;
  isInternalNote?: boolean;
  authorName?: string;
  quotedMessage?: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderPhone?: string;
  senderUserName?: string;
  direction: MessageDirection;
  type: MessageType;
  text?: string;
  metadata?: MessageMetadata;
  status: MessageStatus;
  timestamp: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactPhone: string;
  contactName?: string;
  contactAvatar?: string;
  status: ConversationStatus;
  stationId?: string;
  stationName?: string;
  stationColor?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  lastMessageText?: string;
  lastMessageTimestamp?: string;
  lastMessageDirection?: MessageDirection;
  unreadCount?: number;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id?: string;
    name?: string;
    phoneNumber?: string;
    whatsappJid?: string;
    avatarUrl?: string;
  };
  station?: {
    id?: string;
    name?: string;
    color?: string;
  };
  assignedEmployee?: {
    id?: string;
    name?: string;
    email?: string;
  };
  whatsappAccount?: {
    id?: string;
    displayName?: string;
    phoneNumber?: string;
  };
}
