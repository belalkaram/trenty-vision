import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsService, ListConversationsParams } from '@/services/conversations.service';
import { stationsService } from '@/services/stations.service';
import { Conversation, Message, ConversationStatus } from '@/types/conversations';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ChatSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  MessageSquare,
  Send,
  Search,
  CheckCircle2,
  Lock,
  Tag,
  User,
  Users,
  Phone,
  Clock,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Bell,
  Calendar,
  Sun,
  CalendarDays,
  Compass,
  Plus,
  ChevronLeft,
  ChevronRight,
  History,
  UserCheck,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  X,
  SlidersHorizontal,
  Edit2,
  Copy,
  Trash2,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  Zap,
} from 'lucide-react';
import { remindersService } from '@/services/reminders.service';
import { employeesService } from '@/services/employees.service';
import { whatsappService } from '@/services/whatsapp.service';
import { quickRepliesService } from '@/services/quick-replies.service';
import { validateAndFormatPhone } from '@/utils/phone.validator';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/context/SidebarContext';

export const InboxPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'open' | 'pending' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // 5-minute activity rule: A conversation is active if a message was exchanged within the last 5 minutes
  const isConversationActive = (c?: Conversation | null): boolean => {
    if (!c || c.status === 'closed') return false;
    const ts = c.lastMessageTimestamp || (c as any).lastMessageAt || c.createdAt;
    if (!ts) return false;
    const diff = Date.now() - new Date(ts).getTime();
    return diff <= 5 * 60 * 1000;
  };
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [isAddingQuickReply, setIsAddingQuickReply] = useState(false);
  const [newQrName, setNewQrName] = useState('');
  const [newQrShortcut, setNewQrShortcut] = useState('');
  const [newQrBody, setNewQrBody] = useState('');
  const [qrSearch, setQrSearch] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [notifyEmployeeWhatsApp, setNotifyEmployeeWhatsApp] = useState<boolean>(true);

  // Start New Conversation State
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatAccountId, setNewChatAccountId] = useState('');
  const [newChatStationId, setNewChatStationId] = useState('');
  const [newChatEmployeeId, setNewChatEmployeeId] = useState('');

  // Customer Profile & Timeline Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerPanelTab, setCustomerPanelTab] = useState<'timeline' | 'notes' | 'details'>('timeline');
  const [newPanelNoteText, setNewPanelNoteText] = useState('');
  const [isEditingContactName, setIsEditingContactName] = useState(false);
  const [editedContactName, setEditedContactName] = useState('');

  // In-Chat Reminder state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDueAt, setReminderDueAt] = useState('');
  const [reminderAssignedUserId, setReminderAssignedUserId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Conversations
  const queryParams: ListConversationsParams = {
    status: activeTab === 'pending' ? 'pending' : undefined,
    search: searchQuery || undefined,
  };

  const {
    data: conversations = [],
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['conversations', queryParams],
    queryFn: () => conversationsService.list(queryParams),
    refetchInterval: 4000,
  });

  // Auto-select first conversation if none selected (desktop screens only so mobile users can view the list first)
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const activeConversation = conversations.find((c) => c.id === selectedConversationId);

  // Mark conversation as read whenever selectedConversationId changes
  useEffect(() => {
    if (!selectedConversationId) return;

    // Immediately clear unreadCount optimistically in conversations cache
    queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
      if (!old) return old;
      return old.map((item) =>
        item.id === selectedConversationId ? { ...item, unreadCount: 0 } : item
      );
    });

    // Notify backend to mark conversation as read
    conversationsService.markAsRead(selectedConversationId).catch((err) => {
      console.error('Failed to mark conversation as read:', err);
    });
  }, [selectedConversationId, queryClient]);

  // 2. Fetch Messages for selected conversation
  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => (selectedConversationId ? conversationsService.getMessages(selectedConversationId) : []),
    enabled: !!selectedConversationId,
    refetchInterval: 3000,
  });

  // If new messages arrive while user is actively viewing this conversation, keep unreadCount 0
  useEffect(() => {
    if (selectedConversationId && activeConversation && (activeConversation.unreadCount ?? 0) > 0) {
      queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === selectedConversationId ? { ...item, unreadCount: 0 } : item
        );
      });
      conversationsService.markAsRead(selectedConversationId).catch(() => {});
    }
  }, [messages, selectedConversationId, activeConversation, queryClient]);

  // 3. Fetch Stations for Assignment
  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationsService.list(),
  });

  // 4. Fetch Quick Replies
  const { data: quickReplies = [] } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => conversationsService.getQuickReplies(),
  });

  // Quick Reply Mutations
  const createQuickReplyMutation = useMutation({
    mutationFn: (payload: { name: string; shortcut: string; body: string }) =>
      quickRepliesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      setIsAddingQuickReply(false);
      setNewQrName('');
      setNewQrShortcut('');
      setNewQrBody('');
      success('تمت إضافة الرد السريع بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.error || err?.message || 'فشل حفظ الرد السريع');
    },
  });

  const deleteQuickReplyMutation = useMutation({
    mutationFn: (id: string) => quickRepliesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      success('تم حذف الرد السريع');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف الرد السريع');
    },
  });

  const displayedQuickReplies = quickReplies.filter((qr: any) => {
    if (!qrSearch.trim()) return true;
    const q = qrSearch.toLowerCase();
    return (
      (qr.title || qr.name || '').toLowerCase().includes(q) ||
      (qr.shortcut || '').toLowerCase().includes(q) ||
      (qr.content || qr.body || '').toLowerCase().includes(q)
    );
  });

  // 5. Fetch WhatsApp Accounts (for Dispatcher selection)
  const { data: whatsappAccounts = [] } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappService.listAccounts(),
  });

  // 6. Fetch Timeline for Selected Conversation
  const {
    data: timelineItems = [],
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: ['timeline', selectedConversationId],
    queryFn: () => (selectedConversationId ? conversationsService.getTimeline(selectedConversationId) : []),
    enabled: !!selectedConversationId,
    refetchInterval: 10000,
  });

  // Complete Reminder Mutation (from Timeline)
  const completeReminderMutation = useMutation({
    mutationFn: (reminderId: string) => remindersService.updateStatus(reminderId, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      success('تم إنجاز المتابعة بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث حالة التذكير');
    },
  });

  // Add Internal Note Mutation (from Panel)
  const addPanelNoteMutation = useMutation({
    mutationFn: (noteText: string) => {
      if (!selectedConversationId) throw new Error('يرجى تحديد محادثة');
      return conversationsService.addNote(selectedConversationId, noteText);
    },
    onSuccess: () => {
      setNewPanelNoteText('');
      queryClient.invalidateQueries({ queryKey: ['timeline', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      success('تمت إضافة الملاحظة الداخلية');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حفظ الملاحظة');
    },
  });

  // Start New Conversation Mutation
  const startChatMutation = useMutation({
    mutationFn: (payload: {
      phoneNumber: string;
      contactName?: string;
      messageText?: string;
      whatsappAccountId?: string;
      stationId?: string;
      assignedEmployeeId?: string;
    }) => conversationsService.start(payload),
    onSuccess: (newConvo: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsNewChatModalOpen(false);
      setNewChatPhone('');
      setNewChatName('');
      setNewChatMessage('');
      if (newConvo?.id) {
        setSelectedConversationId(newConvo.id);
      }
      success('تم بدء المحادثة بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.error || err?.message || 'فشل بدء المحادثة');
    },
  });

  // Delete Conversation State & Mutation with Comprehensive Error Handling
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => conversationsService.delete(conversationId),
    onSuccess: (_, deletedId) => {
      success('تم مسح المحادثة وكافة رسائلها وسجلاتها بنجاح');
      setIsDeleteModalOpen(false);
      if (selectedConversationId === deletedId) {
        setSelectedConversationId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.removeQueries({ queryKey: ['messages', deletedId] });
      queryClient.removeQueries({ queryKey: ['timeline', deletedId] });
    },
    onError: (err: any) => {
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        'تعذر مسح المحادثة. يرجى المحاولة مرة أخرى.';
      toastError(errMsg);
    },
  });

  const handleDeleteConversation = () => {
    if (!selectedConversationId) return;
    deleteConversationMutation.mutate(selectedConversationId);
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (payload: { text: string; isInternalNote: boolean }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      return conversationsService.sendMessage(selectedConversationId, {
        text: payload.text,
        isInternalNote: payload.isInternalNote,
      });
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إرسال الرسالة');
    },
  });

  // Assign Station / Agent Mutation
  const assignMutation = useMutation({
    mutationFn: (payload: { stationId?: string | null; assignedAgentId?: string | null; notifyEmployeeWhatsApp?: boolean }) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      return conversationsService.assign(selectedConversationId, payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsAssignModalOpen(false);
      if (vars.assignedAgentId && vars.notifyEmployeeWhatsApp) {
        success('تم إسناد المحادثة للموظف بنجاح وإرسال إشعار فوري على واتساب الخاص به');
      } else {
        success('تم تحديث التعيين بنجاح');
      }
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل التعيين');
    },
  });

  // Update Contact Name Mutation
  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, name }: { contactId: string; name: string }) =>
      conversationsService.updateContact(contactId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setIsEditingContactName(false);
      success('تم تحديث اسم العميل بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث اسم العميل');
    },
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: ConversationStatus) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      return conversationsService.updateStatus(selectedConversationId, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      success('تم تحديث حالة المحادثة');
    },
  });

  // Upload Media Mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedConversationId) throw new Error('No conversation selected');
      const uploaded = await conversationsService.uploadMedia(file);
      let type = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('audio/')) type = 'audio';

      return conversationsService.sendMessage(selectedConversationId, {
        type,
        metadata: {
          url: uploaded.url,
          fileName: uploaded.fileName,
          fileLength: uploaded.fileLength,
          mimeType: uploaded.mimeType,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      success('تم إرسال الملف بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل رفع الملف');
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({ text: messageText, isInternalNote });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMediaMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Query employees for reminder assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.list(),
  });

  // Query pending reminders for the selected conversation
  const { data: conversationReminders = [] } = useQuery({
    queryKey: ['reminders', selectedConversationId],
    queryFn: () => remindersService.list({ conversationId: selectedConversationId!, status: 'pending' }),
    enabled: !!selectedConversationId,
  });

  const setQuickReminderTime = (preset: '1h' | 'tomorrow' | '2d' | '1w') => {
    const d = new Date();
    if (preset === '1h') {
      d.setHours(d.getHours() + 1);
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (preset === '2d') {
      d.setDate(d.getDate() + 2);
      d.setHours(9, 0, 0, 0);
    } else if (preset === '1w') {
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
    }
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setReminderDueAt(localIso);
  };

  const openReminderModal = () => {
    if (!activeConversation) return;
    setReminderTitle(`متابعة مع ${activeConversation.contactName || activeConversation.contactPhone}`);
    setReminderNote('');
    setReminderAssignedUserId(user?.id || '');
    setQuickReminderTime('tomorrow');
    setIsReminderModalOpen(true);
  };

  const createReminderMutation = useMutation({
    mutationFn: () => {
      if (!selectedConversationId || !reminderTitle.trim() || !reminderDueAt) {
        throw new Error('يرجى تحديد عنوان التذكير وموعد المتابعة');
      }
      return remindersService.create({
        conversationId: selectedConversationId,
        title: reminderTitle.trim(),
        note: reminderNote.trim() || undefined,
        dueAt: new Date(reminderDueAt).toISOString(),
        assignedUserId: reminderAssignedUserId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setIsReminderModalOpen(false);
      success('تم جدولة التذكير بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إنشاء التذكير');
    },
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* Top Operations Header */}
      <div className={selectedConversationId ? 'hidden md:block' : 'block'}>
        <Header
          title="صندوق المحادثات المباشر"
          subtitle="المزامنة الفورية لمحادثات العملاء وتوزيع الأحمال والردود التفاعلية"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSidebar}
              leftIcon={
                isCollapsed ? (
                  <PanelRightOpen className="w-4 h-4 text-primary" />
                ) : (
                  <PanelRightClose className="w-4 h-4" />
                )
              }
              className="font-bold border-border shadow-xs gap-1.5"
              title={isCollapsed ? 'فتح القائمة الجانبية' : 'إغلاق القائمة الجانبية لتوسيع الشاشة'}
            >
              <span>{isCollapsed ? 'فتح القائمة الجانبية' : 'إغلاق القائمة الجانبية'}</span>
            </Button>
          }
        />
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Left Column: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-88 border-l border-border bg-card flex flex-col shrink-0 pb-16 md:pb-0 ${
            selectedConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header Action & Search & Tabs */}
          <div className="p-3.5 border-b border-border space-y-2.5">
            {/* New Conversation & Refresh & Sidebar Toggle Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNewChatPhone('');
                  setNewChatName('');
                  setNewChatMessage('');
                  const defAccount =
                    whatsappAccounts.find((a) => a.isPrimaryDispatcher && a.dispatcherSlot === 1) ||
                    whatsappAccounts.find((a) => a.isPrimaryDispatcher) ||
                    whatsappAccounts.find((a) => a.status === 'connected') ||
                    whatsappAccounts[0];
                  setNewChatAccountId(defAccount?.id || '');
                  setIsNewChatModalOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="flex-1 font-bold shadow-soft"
              >
                بدء محادثة جديدة
              </Button>
              <button
                type="button"
                onClick={() => refetchConversations()}
                className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition shrink-0"
                title="تحديث المحادثات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConversationsLoading ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم الهاتف أو الاسم..."
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl text-xs font-semibold">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'mine', label: 'محادثاتي' },
                  { id: 'open', label: 'النشطة (5د)' },
                  { id: 'closed', label: 'غير النشطة' },
                  { id: 'pending', label: 'الانتظار' },
                ] as const
              ).map((tab) => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1 rounded-lg transition text-center text-[11px] ${
                      activeTab === tab.id
                        ? 'bg-card text-foreground font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isConversationsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/60 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-24 h-3 bg-muted/60 rounded" />
                      <div className="w-36 h-2.5 bg-muted/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isConversationsError ? (
              <div className="p-4">
                <ErrorState
                  title="تعذر تحميل المحادثات"
                  message={(conversationsError as any)?.message}
                  onRetry={() => refetchConversations()}
                />
              </div>
            ) : (() => {
              const displayed = conversations.filter((c) => {
                if (activeTab === 'mine') {
                  const myEmpId = user?.employeeId;
                  const myEmail = user?.email;
                  const myName = user?.name || user?.fullName;
                  return (
                    (myEmpId && c.assignedAgentId === myEmpId) ||
                    (myEmail && (c as any).assignedEmployee?.email === myEmail) ||
                    (myName && c.assignedAgentName === myName)
                  );
                }
                if (activeTab === 'open') {
                  return isConversationActive(c);
                }
                if (activeTab === 'closed') {
                  return !isConversationActive(c) || c.status === 'closed';
                }
                if (activeTab === 'pending') {
                  return c.status === 'pending';
                }
                return true;
              });

              if (displayed.length === 0) {
                return (
                  <EmptyState
                    title={activeTab === 'mine' ? 'لا توجد محادثات معينة لك حالياً' : 'لا توجد محادثات'}
                    description={
                      activeTab === 'mine'
                        ? 'المحادثات الموجهة إليك ستظهر هنا تلقائياً فور استلامها.'
                        : 'لم يتم العثور على محادثات تطابق معايير البحث المحددة.'
                    }
                  />
                );
              }

              return displayed.map((c) => {
                const isSelected = c.id === selectedConversationId;
                const isMine =
                  (user?.employeeId && c.assignedAgentId === user.employeeId) ||
                  (user?.email && (c as any).assignedEmployee?.email === user.email);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedConversationId(c.id);
                      if ((c.unreadCount ?? 0) > 0) {
                        // Immediately clear unreadCount
                        queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
                          if (!old) return old;
                          return old.map((item) =>
                            item.id === c.id ? { ...item, unreadCount: 0 } : item
                          );
                        });
                        conversationsService.markAsRead(c.id).catch(() => {});
                      }
                    }}
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-accent/20 border-r-4 border-r-primary'
                        : 'hover:bg-accent/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold text-xs flex items-center justify-center border border-border shrink-0">
                      {c.contactName ? c.contactName.slice(0, 2) : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-foreground truncate">
                          {c.contactName || c.contactPhone || 'عميل واتساب'}
                        </span>
                        {c.lastMessageTimestamp && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0" dir="ltr">
                            {new Date(c.lastMessageTimestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Phone Number with icon */}
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono text-foreground/80" dir="ltr">
                        <Phone className="w-3 h-3 text-primary/70 shrink-0" />
                        <span className="truncate">{c.contactPhone || 'بدون رقم'}</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate leading-snug">
                        {c.lastMessageText || 'محادثة جديدة'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {c.stationName && (
                          <span
                            className="font-mono text-[9px] px-1.5 py-0.5 rounded border font-semibold"
                            style={{
                              borderColor: c.stationColor || '#1c9770',
                              color: c.stationColor || '#1c9770',
                              backgroundColor: `${c.stationColor || '#1c9770'}15`,
                            }}
                          >
                            محطة: {c.stationName}
                          </span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium truncate max-w-[120px] ${
                            isMine
                              ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                              : 'bg-secondary/80 text-muted-foreground'
                          }`}
                        >
                          {isMine
                            ? 'الموظف: أنت'
                            : c.assignedAgentName
                            ? `الموظف: ${c.assignedAgentName}`
                            : 'عام'}
                        </span>
                        {/* 5-minute Activity status indicator */}
                        {isConversationActive(c) ? (
                          <span
                            className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                            title="نشطة: تم تبادل رسائل خلال آخر 5 دقائق"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>نشطة</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium border border-border"
                            title="غير نشطة: لم يتم تبادل رسائل لأكثر من 5 دقائق"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                            <span>غير نشطة</span>
                          </span>
                        )}

                        {c.id !== selectedConversationId && (c.unreadCount ?? 0) > 0 && (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-primary text-white font-bold ml-auto">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Center: Live Chat Wall */}
        {activeConversation ? (
          <div
            className={`flex-1 flex flex-col bg-background min-w-0 overflow-hidden ${
              selectedConversationId
                ? 'fixed inset-0 z-50 md:relative md:inset-auto md:z-auto flex'
                : 'hidden md:flex'
            }`}
          >
            {/* Conversation Active Header */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button to Chat List */}
                <button
                  type="button"
                  onClick={() => setSelectedConversationId(null)}
                  className="md:hidden p-1.5 -mr-1 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground transition shrink-0"
                  title="رجوع لقائمة المحادثات"
                >
                  <ChevronRight className="w-5 h-5 text-primary" />
                </button>

                <div
                  onClick={() => {
                    setEditedContactName(activeConversation.contactName || '');
                    setIsEditingContactName(false);
                    setIsCustomerModalOpen(true);
                  }}
                  className="flex items-center gap-2 sm:gap-3 cursor-pointer p-1 -m-1 rounded-xl hover:bg-secondary/60 transition group min-w-0"
                  role="button"
                  title="اضغط لعرض نافذة بيانات العميل والمتابعات"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 group-hover:border-primary shrink-0 transition">
                    {activeConversation.contactName ? activeConversation.contactName.slice(0, 2) : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition flex items-center gap-1.5">
                      <span className="truncate">{activeConversation.contactName || activeConversation.contactPhone || 'عميل واتساب'}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition opacity-70 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-muted-foreground flex-wrap" dir="ltr">
                      <span className="text-foreground/90 font-semibold">{activeConversation.contactPhone || 'بدون رقم'}</span>
                      {activeConversation.stationName && (
                        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded border border-primary/30 text-primary text-[9px] font-sans">
                          {activeConversation.stationName}
                        </span>
                      )}
                      {activeConversation.assignedAgentName && (
                        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-secondary text-muted-foreground text-[9px] font-sans">
                          {activeConversation.assignedAgentName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Copy phone button */}
                {activeConversation.contactPhone && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(activeConversation.contactPhone);
                      success('تم نسخ رقم الهاتف بنجاح');
                    }}
                    className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition hidden sm:inline-flex"
                    title="نسخ رقم الهاتف"
                  >
                    <Copy className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}

                {/* Direct WhatsApp button */}
                {activeConversation.contactPhone && (
                  <a
                    href={`https://wa.me/${activeConversation.contactPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-emerald-600 transition hidden sm:inline-flex"
                    title="محادثة واتساب مباشرة"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Active Reminder Badge if exists */}
                {conversationReminders.length > 0 && (
                  <span
                    className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold"
                    title={`موعد التذكير: ${new Date(conversationReminders[0].dueAt).toLocaleString('ar-SA')}`}
                  >
                    <Bell className="w-3 h-3 text-amber-500 animate-bounce" />
                    <span className="max-w-[120px] truncate">{conversationReminders[0].title}</span>
                  </span>
                )}

                {/* Create Reminder Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openReminderModal}
                  leftIcon={<Bell className="w-3.5 h-3.5 text-amber-500" />}
                  className="border-amber-500/30 hover:bg-amber-500/10 text-foreground px-2 sm:px-3 text-xs"
                  title="جدولة تذكير ومتابعة للعميل"
                >
                  <span className="hidden sm:inline">تذكير</span>
                </Button>

                {/* Assign / Distribute to Employee Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStationId(activeConversation.stationId || '');
                    setSelectedEmployeeId(activeConversation.assignedAgentId || '');
                    setNotifyEmployeeWhatsApp(true);
                    setIsAssignModalOpen(true);
                  }}
                  leftIcon={<Users className="w-3.5 h-3.5 text-primary" />}
                  className="border-primary/30 hover:bg-primary/10 text-foreground px-2 sm:px-3 text-xs font-semibold"
                  title="توزيع وإسناد المحادثة لموظف مع إشعار واتساب"
                >
                  <span className="hidden sm:inline">إسناد لموظف</span>
                  <span className="sm:hidden">إسناد</span>
                </Button>

                {/* Open Customer Profile Modal Button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditedContactName(activeConversation.contactName || '');
                    setIsEditingContactName(false);
                    setIsCustomerModalOpen(true);
                  }}
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                  className="px-2.5 sm:px-3.5 text-xs font-bold shadow-soft"
                  title="عرض النافذة المنبثقة لبيانات العميل والمتابعات"
                >
                  <span>بيانات العميل</span>
                </Button>

                {/* Real-time 5-minute Activity Badge (Replaces manual close button) */}
                {isConversationActive(activeConversation) ? (
                  <div
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold select-none"
                    title="محادثة نشطة: تم تبادل رسائل خلال آخر 5 دقائق"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>محادثة نشطة</span>
                  </div>
                ) : (
                  <div
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border text-xs font-medium select-none"
                    title="محادثة غير نشطة: لم يتم تبادل رسائل لأكثر من 5 دقائق"
                  >
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <span>محادثة غير نشطة</span>
                  </div>
                )}

                {/* Delete Conversation Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  className="border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 sm:px-2.5 text-xs font-semibold"
                  title="مسح المحادثة بالكامل من النظام"
                >
                  <span className="hidden md:inline">مسح الشات</span>
                </Button>
              </div>
            </div>

            {/* Chat Wall (Patterned) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-wall">
              {isMessagesLoading ? (
                <div className="flex flex-col space-y-3 justify-end h-full">
                  <div className="w-48 h-12 rounded-2xl bg-card/80 animate-pulse self-start" />
                  <div className="w-64 h-14 rounded-2xl bg-primary/20 animate-pulse self-end" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="p-4 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
                    بدء محادثة جديدة، أرسل رسالة للعميل عبر الحقل أدناه.
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutgoing = msg.direction === 'outgoing';
                  const isNote = msg.metadata?.isInternalNote;

                  // Internal Staff Note
                  if (isNote) {
                    return (
                      <div
                        key={msg.id}
                        className="my-3 mx-auto max-w-[90%] sm:max-w-[75%] p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-soft rise-in"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>ملاحظة داخلية</span>
                            <span className="font-normal opacity-80">
                              (بواسطة: {msg.metadata?.authorName || msg.senderUserName || 'الموظف'})
                            </span>
                          </div>
                          <span className="font-mono text-[10px] opacity-75" dir="ltr">
                            {new Date(msg.timestamp || msg.createdAt || '').toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed select-text text-foreground font-medium">
                          {msg.text}
                        </p>
                      </div>
                    );
                  }

                  // Regular Chat Bubble
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col rise-in ${isOutgoing ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3.5 shadow-sm relative space-y-1.5 text-xs leading-relaxed ${
                          isOutgoing
                            ? 'bubble-out bg-primary text-white'
                            : 'bubble-in bg-card border border-border text-foreground'
                        }`}
                      >
                        {/* Text */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap select-text leading-relaxed">{msg.text}</p>
                        )}

                        {/* Image Attachment */}
                        {msg.type === 'image' && msg.metadata?.url && (
                          <div
                            className="rounded-xl overflow-hidden mt-1 cursor-pointer"
                            onClick={() => setPreviewImageUrl(msg.metadata?.url || null)}
                          >
                            <img
                              src={msg.metadata.url}
                              alt="مرفق صورة"
                              className="max-h-60 rounded-xl object-contain bg-black/20"
                            />
                          </div>
                        )}

                        {/* Audio Attachment */}
                        {(msg.type === 'audio' || msg.type === 'voice_note') && msg.metadata?.url && (
                          <div className="p-2 rounded-xl bg-black/10 mt-1 min-w-[200px]">
                            <audio controls className="w-full h-8" src={msg.metadata.url} />
                          </div>
                        )}

                        {/* Document Attachment */}
                        {msg.type === 'document' && msg.metadata?.url && (
                          <a
                            href={msg.metadata.url}
                            download
                            className="flex items-center gap-3 p-2 rounded-xl bg-black/10 hover:bg-black/20 transition text-xs"
                          >
                            <FileText className="w-6 h-6 shrink-0" />
                            <div className="min-w-0 flex-1 truncate font-mono">
                              {msg.metadata.fileName || 'ملف مرفق'}
                            </div>
                          </a>
                        )}

                        {/* Message Footer */}
                        <div
                          className={`flex items-center justify-end gap-1.5 font-mono text-[9px] ${
                            isOutgoing ? 'text-white/80' : 'text-muted-foreground'
                          }`}
                          dir="ltr"
                        >
                          <span>
                            {new Date(msg.timestamp || msg.createdAt || '').toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutgoing && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                              ) : msg.status === 'queued' || msg.status === 'pending' ? (
                                <Clock className="w-3 h-3 text-white/70 animate-pulse" title="في انتظار الإرسال عبر السيرفر المحلي" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-white/60" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Bar */}
            <div className="p-3 pb-4 md:pb-3 border-t border-border bg-card shadow-soft shrink-0 space-y-2">
              {/* Internal note toggle & quick replies */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsInternalNote(!isInternalNote)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isInternalNote
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isInternalNote ? 'ملاحظة للموظفين فقط' : 'إرسال لعميل واتساب'}</span>
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickRepliesOpen(true)}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                >
                  ردود جاهزة
                </Button>
              </div>

              {/* Input row */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'اكتب ملاحظة داخلية لا يراها العميل...'
                      : 'اكتب رسالة واتساب للعميل (اضغط Enter للإرسال)...'
                  }
                  className={`w-full h-11 px-4 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition ${
                    isInternalNote
                      ? 'bg-amber-500/10 border border-amber-500/30 focus:border-amber-500'
                      : 'bg-background border border-border focus:border-primary'
                  }`}
                />

                <Button
                  type="submit"
                  variant={isInternalNote ? 'secondary' : 'primary'}
                  size="md"
                  disabled={!messageText.trim()}
                  isLoading={sendMessageMutation.isPending}
                  leftIcon={<Send className="w-4 h-4 rotate-180" />}
                >
                  إرسال
                </Button>
              </form>
            </div>


            {/* Customer Profile Modal trigger - panel removed, now shown as popup */}

          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-background">
            <EmptyState
              title="اختر محادثة من القائمة"
              description="حدد محادثة من الشريط الجانبي لعرض الرسائل المتبادلة والرد على العميل."
            />
          </div>
        )}
      </div>

      {/* Quick Replies Modal with Add & Search & Delete Capabilities */}
      {isQuickRepliesOpen && (
        <Modal
          isOpen={isQuickRepliesOpen}
          onClose={() => {
            setIsQuickRepliesOpen(false);
            setIsAddingQuickReply(false);
          }}
          title="الردود السريعة الجاهزة"
          description="اختر رداً نموذجياً لإدراجه مباشرة في شريط الكتابة أو أضف رداً جديداً"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Top Toolbar: Add Button & Search */}
            <div className="flex items-center gap-2">
              <Button
                variant={isAddingQuickReply ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setIsAddingQuickReply(!isAddingQuickReply)}
                leftIcon={isAddingQuickReply ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                className="font-bold text-xs shrink-0"
              >
                {isAddingQuickReply ? 'إلغاء الإضافة' : '+ إضافة رد سريع جديد'}
              </Button>

              {!isAddingQuickReply && (
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث في الردود أو الاختصارات..."
                    value={qrSearch}
                    onChange={(e) => setQrSearch(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl pr-8 pl-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Add New Quick Reply Form */}
            {isAddingQuickReply && (
              <div className="p-4 bg-secondary/30 border border-primary/20 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>إضافة رد سريع جديد</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      اسم / عنوان الرد <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ترحيب بالعميل الجديد"
                      value={newQrName}
                      onChange={(e) => setNewQrName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      اختصار الاستدعاء <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: /welcome أو /ترحيب"
                      dir="ltr"
                      value={newQrShortcut}
                      onChange={(e) => setNewQrShortcut(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    نص الرد السريع <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب نص الرسالة النموذجي هنا..."
                    value={newQrBody}
                    onChange={(e) => setNewQrBody(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingQuickReply(false);
                      setNewQrName('');
                      setNewQrShortcut('');
                      setNewQrBody('');
                    }}
                    className="text-xs"
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={createQuickReplyMutation.isPending}
                    onClick={() => {
                      if (!newQrName.trim()) {
                        toastError('يرجى إدخال اسم الرد');
                        return;
                      }
                      if (!newQrShortcut.trim()) {
                        toastError('يرجى إدخال اختصار الرد (مثل: /welcome)');
                        return;
                      }
                      if (!newQrBody.trim()) {
                        toastError('يرجى كتابة نص الرد');
                        return;
                      }
                      createQuickReplyMutation.mutate({
                        name: newQrName.trim(),
                        shortcut: newQrShortcut.trim(),
                        body: newQrBody.trim(),
                      });
                    }}
                    className="font-bold text-xs shadow-soft"
                  >
                    حفظ الرد السريع
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Replies List */}
            <div className="divide-y divide-border max-h-80 overflow-y-auto pr-1">
              {displayedQuickReplies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <Zap className="w-6 h-6 mx-auto opacity-40 mb-2" />
                  <p className="text-xs font-semibold">لا توجد ردود سريعة مطابقة</p>
                  <p className="text-[11px]">يمكنك إنشاء رد سريع جديد عبر الزر بالأعلى</p>
                </div>
              ) : (
                displayedQuickReplies.map((qr: any) => (
                  <div
                    key={qr.id}
                    className="p-3 hover:bg-secondary/60 rounded-xl transition flex items-start justify-between gap-2 group cursor-pointer"
                    onClick={() => {
                      setMessageText(qr.content || qr.body);
                      setIsQuickRepliesOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{qr.title || qr.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold" dir="ltr">
                          {qr.shortcut}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {qr.content || qr.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="حذف الرد السريع"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`هل أنت متأكد من حذف الرد السريع "${qr.title || qr.name}"؟`)) {
                          deleteQuickReplyMutation.mutate(qr.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Profile & Follow-Up Modal */}
      {isCustomerModalOpen && activeConversation && (
        <Modal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          title="ملف العميل وبيانات المتابعة"
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                ID: {activeConversation.id.slice(0, 8)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(false)}>
                إغلاق النافذة
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Top Profile Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-secondary/60 via-secondary/30 to-background border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-base flex items-center justify-center border border-primary/20 shrink-0 shadow-soft">
                    {activeConversation.contactName ? activeConversation.contactName.slice(0, 2) : <User className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditingContactName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editedContactName}
                          onChange={(e) => setEditedContactName(e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-background border border-primary text-xs font-bold text-foreground focus:outline-none"
                          placeholder="اسم العميل..."
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={!editedContactName.trim() || updateContactMutation.isPending}
                          onClick={() => {
                            if (activeConversation.contactId) {
                              updateContactMutation.mutate({
                                contactId: activeConversation.contactId,
                                name: editedContactName.trim(),
                              });
                            }
                          }}
                          className="p-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition text-xs"
                          title="حفظ"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingContactName(false)}
                          className="p-1 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition text-xs"
                          title="إلغاء"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-foreground truncate">
                          {activeConversation.contactName || activeConversation.contactPhone || 'عميل واتساب'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditedContactName(activeConversation.contactName || '');
                            setIsEditingContactName(true);
                          }}
                          className="p-1 text-muted-foreground hover:text-primary transition rounded"
                          title="تعديل اسم العميل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Phone Number Display */}
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-muted-foreground" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">{activeConversation.contactPhone || 'بدون رقم'}</span>
                      {activeConversation.contactPhone && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeConversation.contactPhone);
                            success('تم نسخ رقم الهاتف بنجاح');
                          }}
                          className="p-1 hover:text-foreground transition"
                          title="نسخ الرقم"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Pills */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {activeConversation.contactPhone && (
                    <a
                      href={`https://wa.me/${activeConversation.contactPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح في واتساب</span>
                    </a>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCustomerModalOpen(false);
                      openReminderModal();
                    }}
                    leftIcon={<Bell className="w-3.5 h-3.5 text-amber-500" />}
                    className="h-8 text-xs"
                  >
                    جدولة تذكير
                  </Button>
                </div>
              </div>

              {/* Ownership & Status Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/70 text-[11px]">
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] mb-0.5">المحطة التابعة:</span>
                  <span className="font-bold text-foreground truncate block">
                    {activeConversation.stationName || 'غير مسند'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] mb-0.5">الموظف المكلف:</span>
                  <span className="font-bold text-foreground truncate block">
                    {activeConversation.assignedAgentName || 'توزيع عام'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] mb-0.5">حالة المحادثة:</span>
                  <span className="font-bold text-primary">
                    {activeConversation.status === 'open' ? 'نشطة' : activeConversation.status === 'pending' ? 'انتظار' : 'مغلقة'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] mb-0.5">حساب الإرسال:</span>
                  <span className="font-bold text-foreground truncate block font-mono text-[10px]" dir="ltr">
                    {activeConversation.whatsappAccount?.displayName || 'الرقم الموزع'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Reassign Controls inside Modal */}
            <div className="p-3 rounded-xl bg-secondary/20 border border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  إعادة إسناد إلى محطة:
                </label>
                <select
                  value={activeConversation.stationId || ''}
                  onChange={(e) => assignMutation.mutate({ stationId: e.target.value || null })}
                  className="w-full h-8 px-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">بدون محطة (عام)</option>
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  إعادة إسناد إلى موظف:
                </label>
                <select
                  value={activeConversation.assignedAgentId || ''}
                  onChange={(e) => assignMutation.mutate({ assignedAgentId: e.target.value || null })}
                  className="w-full h-8 px-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">توزيع عام (غير مخصص لموظف)</option>
                  {employees.map((emp) => {
                    const phoneDisplay = emp.phone || emp.whatsappNumber;
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} {phoneDisplay ? `(${phoneDisplay})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex items-center border border-border bg-secondary/40 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCustomerPanelTab('timeline')}
                className={`flex-1 py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                  customerPanelTab === 'timeline'
                    ? 'bg-card text-foreground font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>الخط الزمني للمتابعات ({timelineItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerPanelTab('notes')}
                className={`flex-1 py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                  customerPanelTab === 'notes'
                    ? 'bg-card text-foreground font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>الملاحظات الداخلية</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="max-h-80 overflow-y-auto pr-1">
              {customerPanelTab === 'timeline' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground">تاريخ المتابعات والتذكيرات</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCustomerModalOpen(false);
                        openReminderModal();
                      }}
                      leftIcon={<Plus className="w-3 h-3 text-primary" />}
                      className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10"
                    >
                      تذكير جديد
                    </Button>
                  </div>

                  {isTimelineLoading ? (
                    <div className="space-y-2">
                      <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                      <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                    </div>
                  ) : timelineItems.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border text-center text-[11px] text-muted-foreground">
                      لا توجد متابعات مسجلة بعد. أضف تذكيراً لمتابعة العميل.
                    </div>
                  ) : (
                    <div className="relative border-r border-border/80 pr-4 mr-2 space-y-3">
                      {timelineItems.map((item: any, idx: number) => {
                        const isReminder = item.type === 'reminder';
                        const isNote = item.type === 'note';
                        const isCompleted = item.status === 'completed';
                        return (
                          <div key={item.id || idx} className="relative">
                            <div
                              className={`absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                                isCompleted
                                  ? 'bg-emerald-500'
                                  : isReminder
                                  ? 'bg-amber-500'
                                  : isNote
                                  ? 'bg-blue-500'
                                  : 'bg-primary'
                              }`}
                            />
                            <div className="p-2.5 rounded-xl border border-border bg-card space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] font-bold text-foreground truncate">{item.title}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                    isCompleted
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : isReminder
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                      : 'bg-secondary text-muted-foreground'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              </div>
                              {item.description && <p className="text-[10px] text-muted-foreground">{item.description}</p>}
                              <div className="text-[9px] font-mono text-muted-foreground flex justify-between">
                                <span>بواسطة: {item.author}</span>
                                <span>{new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                              </div>
                              {isReminder && !isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => completeReminderMutation.mutate(item.id)}
                                  disabled={completeReminderMutation.isPending}
                                  className="w-full mt-1 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>تم إنجاز المتابعة</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                    <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>إضافة ملاحظة داخلية خاصة بالفريق</span>
                    </label>
                    <textarea
                      rows={3}
                      value={newPanelNoteText}
                      onChange={(e) => setNewPanelNoteText(e.target.value)}
                      placeholder="اكتب ملاحظة لفريق العمل حول هذا العميل..."
                      className="w-full text-xs rounded-lg border border-border bg-background p-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 resize-none"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!newPanelNoteText.trim()}
                      isLoading={addPanelNoteMutation.isPending}
                      onClick={() => addPanelNoteMutation.mutate(newPanelNoteText.trim())}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-8"
                    >
                      حفظ الملاحظة
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-foreground block">سجل الملاحظات الداخلية</span>
                    {messages.filter((m) => m.metadata?.isInternalNote).length === 0 ? (
                      <p className="text-[10px] text-muted-foreground p-3 text-center border border-dashed border-border rounded-xl">
                        لا توجد ملاحظات داخلية بعد.
                      </p>
                    ) : (
                      messages
                        .filter((m) => m.metadata?.isInternalNote)
                        .map((note) => (
                          <div key={note.id} className="p-2.5 rounded-xl border border-amber-500/20 bg-card space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                              <span>{note.metadata?.authorName || note.senderUserName || 'الموظف'}</span>
                              <span>{new Date(note.timestamp || note.createdAt || '').toLocaleDateString('ar-SA')}</span>
                            </div>
                            <p className="text-[11px] text-foreground font-medium leading-relaxed">{note.text}</p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {isAssignModalOpen && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="توزيع وإسناد المحادثة للموظف"
          description="تحديد الموظف المسؤول ومحطة العمل مع خيار إرسال إشعار واتساب فوري له"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  assignMutation.mutate({
                    stationId: selectedStationId || null,
                    assignedAgentId: selectedEmployeeId || null,
                    notifyEmployeeWhatsApp,
                  })
                }
                isLoading={assignMutation.isPending}
              >
                تأكيد الإسناد والتوزيع
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="الموظف المسؤول (المستلم)"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">توزيع عام (غير مخصص لموظف محدد)</option>
              {employees.map((emp) => {
                const phoneDisplay = emp.phone || emp.whatsappNumber;
                return (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} {phoneDisplay ? `(${phoneDisplay})` : '— بدون رقم'}
                  </option>
                );
              })}
            </Select>

            <Select
              label="محطة العمل المستهدفة"
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
            >
              <option value="">بدون محطة (عام)</option>
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.assignedAgentsCount ?? 0} وكلاء)
                </option>
              ))}
            </Select>

            {selectedEmployeeId && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyEmployeeWhatsApp}
                    onChange={(e) => setNotifyEmployeeWhatsApp(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-foreground block">
                      إرسال إشعار فوري عبر واتساب لرقم الموظف الخاص به
                    </span>
                    <span className="text-[11px] text-muted-foreground block leading-relaxed">
                      يقوم النظام فورياً بإرسال رسالة واتساب من رقم الإدارة لهاتف الموظف تحتوي على بيانات العميل وآخر رسالة ورابط مباشر لمحادثة العميل (wa.me).
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* In-Chat Reminder Modal */}
      {isReminderModalOpen && (
        <Modal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          title="جدولة تذكير ومتابعة للعميل"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsReminderModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => createReminderMutation.mutate()}
                isLoading={createReminderMutation.isPending}
                leftIcon={<Bell className="w-3.5 h-3.5" />}
              >
                تأكيد وجدولة التذكير
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="عنوان التذكير / سبب المتابعة"
              placeholder="مثال: متابعة إرسال عرض السعر النهائي"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                موعد التذكير السريع
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickReminderTime('1h')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>بعد ساعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickReminderTime('tomorrow')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>غداً 9:00 ص</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickReminderTime('2d')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>بعد يومين</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickReminderTime('1w')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                  <span>بعد أسبوع</span>
                </button>
              </div>
            </div>

            <Input
              label="تاريخ وتوقيت المتابعة الدقيق"
              type="datetime-local"
              value={reminderDueAt}
              onChange={(e) => setReminderDueAt(e.target.value)}
              required
            />

            <Select
              label="الموظف المسؤول عن التذكير"
              value={reminderAssignedUserId}
              onChange={(e) => setReminderAssignedUserId(e.target.value)}
            >
              <option value="">بدون تعيين محدد (عام لجميع الموظفين)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.role === 'adminstrator' ? 'مدير' : 'موظف'})
                </option>
              ))}
            </Select>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                ملاحظات إضافية للمتابعة (اختياري)
              </label>
              <textarea
                rows={3}
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                placeholder="اكتب أي ملاحظة أو سياق إضافي للموظف المكلف بالمتابعة..."
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <Modal
          isOpen={!!previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
          title="معاينة الصورة المرفقة"
          maxWidth="2xl"
        >
          <div className="flex justify-center p-2 bg-black/40 rounded-xl">
            <img src={previewImageUrl} alt="Preview" className="max-h-[70vh] object-contain rounded-lg" />
          </div>
        </Modal>
      )}

      {/* Start New Conversation Modal */}
      {isNewChatModalOpen && (
        <Modal
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          title="بدء محادثة واتساب جديدة"
          description="أدخل رقم هاتف العميل بكود الدولة للبدء الفوري في المحادثة"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsNewChatModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const check = validateAndFormatPhone(newChatPhone);
                  if (!check.isValid) {
                    toastError(check.error || 'يرجى إدخال رقم صحيح بكود الدولة');
                    return;
                  }
                  startChatMutation.mutate({
                    phoneNumber: check.formatted,
                    contactName: newChatName.trim() || undefined,
                    messageText: newChatMessage.trim() || undefined,
                    whatsappAccountId: newChatAccountId || undefined,
                    stationId: newChatStationId || undefined,
                    assignedEmployeeId: newChatEmployeeId || undefined,
                  });
                }}
                isLoading={startChatMutation.isPending}
                leftIcon={<Send className="w-3.5 h-3.5 rotate-180" />}
              >
                بدء المحادثة
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Input
                label="رقم الهاتف (مع كود الدولة الدولي)"
                placeholder="مثال: +966501234567 أو +201012345678"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
                dir="ltr"
                className="font-mono text-left"
                required
              />
              {newChatPhone && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {(() => {
                    const res = validateAndFormatPhone(newChatPhone);
                    return res.isValid ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>رقم معتمد: {res.formatted} ({res.countryCode})</span>
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{res.error}</span>
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            <Input
              label="اسم العميل (اختياري)"
              placeholder="مثال: أحمد عبد الله"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
            />

            {whatsappAccounts.length > 0 && (
              <Select
                label="الرقم الأساسي الموزع للإرسال"
                value={newChatAccountId}
                onChange={(e) => setNewChatAccountId(e.target.value)}
              >
                {whatsappAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.displayName || acc.sessionName}
                    {acc.isPrimaryDispatcher ? ` (الرقم الموزع ${acc.dispatcherSlot || 1})` : ''}
                    {acc.phoneNumber ? ` — ${acc.phoneNumber}` : ''}
                  </option>
                ))}
              </Select>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="إسناد إلى محطة"
                value={newChatStationId}
                onChange={(e) => setNewChatStationId(e.target.value)}
              >
                <option value="">بدون محطة محددة</option>
                {stations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </Select>

              <Select
                label="الموظف المكلف"
                value={newChatEmployeeId}
                onChange={(e) => setNewChatEmployeeId(e.target.value)}
              >
                <option value="">توزيع تلقائي عام</option>
                {employees.map((emp) => {
                  const phoneDisplay = emp.phone || emp.whatsappNumber;
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} {phoneDisplay ? `(${phoneDisplay})` : ''}
                    </option>
                  );
                })}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                نص الرسالة الأولى (اختياري)
              </label>
              <textarea
                rows={3}
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                placeholder="اكتب رسالة ترحيبية للعميل لإرسالها فورياً عبر واتساب..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Conversation Confirmation Modal with Error Handling */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => !deleteConversationMutation.isPending && setIsDeleteModalOpen(false)}
          title="تأكيد مسح المحادثة بالكامل"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={deleteConversationMutation.isPending}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={deleteConversationMutation.isPending}
                onClick={handleDeleteConversation}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-none"
              >
                تأكيد ومسح المحادثة الآن
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه!</p>
                <p className="text-muted-foreground leading-relaxed">
                  سيتم مسح المحادثة بالكامل وكافة الرسائل وسجلات التذكير والملاحظات الداخلية المرتبطة بها نهائياً من النظام.
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-lg border border-border">
              <div>
                العميل: <strong className="text-foreground">{activeConversation?.contactName || 'عميل واتساب'}</strong>
              </div>
              <div className="mt-1 font-mono text-[11px]" dir="ltr">
                {activeConversation?.contactPhone}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
