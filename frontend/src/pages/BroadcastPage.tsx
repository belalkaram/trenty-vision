import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Square,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  FileCode,
  Smartphone,
  Eye,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Filter,
  Users,
  Upload,
  ArrowRight,
  Send,
  MessageSquare,
} from 'lucide-react';
import {
  broadcastService,
  BroadcastCampaign,
  BroadcastRecipient,
  CreateCampaignPayload,
} from '@/services/broadcast.service';
import { quickRepliesService, QuickReply } from '@/services/quick-replies.service';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});

export const BroadcastPage: React.FC = () => {
  const { showToast } = useToast();
  const addToast = (type: any, msg: string) => showToast(msg, type);
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reportModalCampaignId, setReportModalCampaignId] = useState<string | null>(null);

  // ─── Fetch Campaigns ──────────────────────────────────────────
  const {
    data: campaigns = [],
    isLoading: isCampaignsLoading,
    refetch: refetchCampaigns,
  } = useQuery<BroadcastCampaign[]>({
    queryKey: ['broadcast_campaigns'],
    queryFn: broadcastService.getCampaigns,
    refetchInterval: 5000, // Poll every 5s for real-time progress update
  });

  // ─── Fetch WhatsApp Accounts for Selection ───────────────────
  const { data: whatsappAccounts = [] } = useQuery({
    queryKey: ['whatsapp_accounts'],
    queryFn: async () => {
      const res = await fetch('/api/v1/whatsapp/accounts', { headers: authHeaders() });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    },
  });

  // ─── Fetch Quick Replies ─────────────────────────────────────
  const { data: quickReplies = [] } = useQuery<QuickReply[]>({
    queryKey: ['quick_replies'],
    queryFn: quickRepliesService.list,
  });

  // ─── Fetch Specific Campaign for Detailed Report ─────────────
  const {
    data: reportData,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['broadcast_campaign_report', reportModalCampaignId],
    queryFn: () => (reportModalCampaignId ? broadcastService.getCampaign(reportModalCampaignId) : null),
    enabled: !!reportModalCampaignId,
    refetchInterval: reportModalCampaignId ? 4000 : false,
  });

  // ─── Form State for New Campaign Wizard ──────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [campaignName, setCampaignName] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document'>('text');
  const [messageContent, setMessageContent] = useState('');
  const [mediaFile, setMediaFile] = useState<{ url: string; filename: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Anti-ban settings
  const [minDelay, setMinDelay] = useState<number>(5);
  const [maxDelay, setMaxDelay] = useState<number>(12);
  const [batchSize, setBatchSize] = useState<number>(25);
  const [batchSleep, setBatchSleep] = useState<number>(30);

  // Recipients input state
  const [recipientSourceTab, setRecipientSourceTab] = useState<'manual' | 'extracted' | 'crm'>('manual');
  const [manualText, setManualText] = useState('');
  const [recipientsList, setRecipientsList] = useState<Array<{ phoneNumber: string; recipientName?: string }>>([]);
  const [isValidatingNumbers, setIsValidatingNumbers] = useState(false);
  const [validationResults, setValidationResults] = useState<{ total: number; valid: number; invalid: number } | null>(null);

  // ─── Filtered Campaigns ──────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messageContent.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const totalRecipients = campaigns.reduce((acc, c) => acc + (c.totalRecipients || 0), 0);
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + (c.failedCount || 0), 0);
    const successRate = totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 100;

    return { totalCampaigns, totalRecipients, totalSent, totalFailed, successRate };
  }, [campaigns]);

  // ─── Campaign Actions Mutations ──────────────────────────────
  const startMutation = useMutation({
    mutationFn: (id: string) => broadcastService.startCampaign(id),
    onSuccess: () => {
      addToast('success', 'تم بدء تشغيل الحملة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    },
    onError: (err: any) => addToast('error', err?.message || 'فشل تشغيل الحملة'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => broadcastService.pauseCampaign(id),
    onSuccess: () => {
      addToast('info', 'تم إيقاف الحملة مؤقتاً');
      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    },
    onError: (err: any) => addToast('error', err?.message || 'فشل إيقاف الحملة'),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => broadcastService.resumeCampaign(id),
    onSuccess: () => {
      addToast('success', 'تم استئناف الحملة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    },
    onError: (err: any) => addToast('error', err?.message || 'فشل استئناف الحملة'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => broadcastService.cancelCampaign(id),
    onSuccess: () => {
      addToast('warning', 'تم إلغاء الحملة');
      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    },
    onError: (err: any) => addToast('error', err?.message || 'فشل إلغاء الحملة'),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => broadcastService.retryFailed(id),
    onSuccess: () => {
      addToast('success', 'تمت جدولة إعادة إرسال الرسائل الفاشلة');
      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    },
    onError: (err: any) => addToast('error', err?.message || 'فشل إعادة المحاولة'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => broadcastService.deleteCampaign(id),
    onSuccess: () => {
      addToast('success', 'تم حذف الحملة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    },
    onError: (err: any) => addToast('error', err?.message || 'فشل حذف الحملة'),
  });

  // ─── Handlers for Adding Recipients ──────────────────────────
  const parseManualRecipients = () => {
    if (!manualText.trim()) return;
    const lines = manualText.split(/[\r\n,]+/);
    const parsed: Array<{ phoneNumber: string; recipientName?: string }> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if format is "Name: Phone" or "Name, Phone"
      if (trimmed.includes(':') || trimmed.includes('-')) {
        const parts = trimmed.split(/[:\-]/);
        const name = parts[0]?.trim();
        const phone = parts[1]?.trim().replace(/[^0-9+]/g, '');
        if (phone && phone.length >= 6) {
          parsed.push({ phoneNumber: phone, recipientName: name });
        }
      } else {
        const phone = trimmed.replace(/[^0-9+]/g, '');
        if (phone && phone.length >= 6) {
          parsed.push({ phoneNumber: phone });
        }
      }
    });

    // Merge without duplicates
    const existingPhones = new Set(recipientsList.map((r) => r.phoneNumber.replace(/[^0-9]/g, '')));
    const fresh = parsed.filter((p) => !existingPhones.has(p.phoneNumber.replace(/[^0-9]/g, '')));

    setRecipientsList((prev) => [...prev, ...fresh]);
    setManualText('');
    setValidationResults(null);
    addToast('success', `تمت إضافة ${fresh.length} رقم جديد إلى القائمة`);
  };

  // Import from Group Extracted Contacts
  const importFromGroupContacts = async () => {
    try {
      addToast('info', 'جاري جلب جهات الاتصال المستخرجة من الجروبات...');
      const res = await fetch('/api/v1/group-manager/contacts?limit=5000', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('فشل جلب الأرقام المستخرجة');
      const json = await res.json();
      const contacts: any[] = json?.data || [];

      if (contacts.length === 0) {
        addToast('warning', 'لا توجد جهات اتصال مستخرجة حالياً');
        return;
      }

      const existingPhones = new Set(recipientsList.map((r) => r.phoneNumber.replace(/[^0-9]/g, '')));
      const newItems: Array<{ phoneNumber: string; recipientName?: string }> = [];

      contacts.forEach((c) => {
        const clean = (c.phoneNumber || '').replace(/[^0-9]/g, '');
        if (clean && clean.length >= 6 && !existingPhones.has(clean)) {
          existingPhones.add(clean);
          newItems.push({
            phoneNumber: c.phoneNumber,
            recipientName: c.displayName || undefined,
          });
        }
      });

      setRecipientsList((prev) => [...prev, ...newItems]);
      setValidationResults(null);
      addToast('success', `تم استيراد ${newItems.length} جهة اتصال من الجروبات بنجاح`);
    } catch (err: any) {
      addToast('error', err?.message || 'تعذر استيراد جهات الاتصال');
    }
  };

  // Import from CRM Contacts
  const importFromCrmContacts = async () => {
    try {
      addToast('info', 'جاري استيراد جهات الاتصال من سجل العملاء...');
      const res = await fetch('/api/v1/contacts?limit=5000', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('فشل جلب جهات اتصال CRM');
      const json = await res.json();
      const contacts: any[] = json?.data || (Array.isArray(json) ? json : []);

      if (contacts.length === 0) {
        addToast('warning', 'سجل العملاء فارغ حالياً');
        return;
      }

      const existingPhones = new Set(recipientsList.map((r) => r.phoneNumber.replace(/[^0-9]/g, '')));
      const newItems: Array<{ phoneNumber: string; recipientName?: string }> = [];

      contacts.forEach((c) => {
        const clean = (c.phoneNumber || '').replace(/[^0-9]/g, '');
        if (clean && clean.length >= 6 && !existingPhones.has(clean)) {
          existingPhones.add(clean);
          newItems.push({
            phoneNumber: c.phoneNumber,
            recipientName: c.name || undefined,
          });
        }
      });

      setRecipientsList((prev) => [...prev, ...newItems]);
      setValidationResults(null);
      addToast('success', `تم استيراد ${newItems.length} عميل من سجل الـ CRM بنجاح`);
    } catch (err: any) {
      addToast('error', err?.message || 'تعذر استيراد عملاء CRM');
    }
  };

  // Validate Numbers on WhatsApp
  const handleValidateNumbers = async () => {
    if (recipientsList.length === 0) {
      addToast('warning', 'يرجى إضافة أرقام أولاً قبل الفحص');
      return;
    }

    setIsValidatingNumbers(true);
    try {
      const phones = recipientsList.map((r) => r.phoneNumber);
      const results = await broadcastService.checkNumbers(phones, selectedAccountId || undefined);

      const validJids = new Set(results.filter((r) => r.exists).map((r) => r.inputPhone.replace(/[^0-9]/g, '')));

      // Filter list to valid ones
      const validRecipients = recipientsList.filter((r) => validJids.has(r.phoneNumber.replace(/[^0-9]/g, '')));
      const invalidCount = recipientsList.length - validRecipients.length;

      setValidationResults({
        total: recipientsList.length,
        valid: validRecipients.length,
        invalid: invalidCount,
      });

      setRecipientsList(validRecipients);
      addToast(
        'success',
        `تم فحص الأرقام بنجاح: تم اعتماد ${validRecipients.length} رقم نشط على واتساب واستبعاد ${invalidCount} رقم غير مسجل.`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'فشل فحص الأرقام على واتساب');
    } finally {
      setIsValidatingNumbers(false);
    }
  };

  // Media file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      addToast('error', 'الحد الأقصى لحجم الملف هو 25 ميجابايت');
      return;
    }

    setIsUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/v1/media/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            dataUrl: base64Data,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });

        if (!res.ok) throw new Error('فشل رفع الملف إلى الخادم');
        const json = await res.json();
        setMediaFile({
          url: json.data.url,
          filename: file.name,
        });
        addToast('success', `تم رفع الملف ${file.name} بنجاح`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      addToast('error', err?.message || 'تعذر رفع الملف');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Handle Create Campaign Submission
  const handleCreateCampaign = async (andStartImmediately = false) => {
    if (!campaignName.trim()) {
      addToast('warning', 'يرجى إدخال اسم الحملة');
      return;
    }
    if (recipientsList.length === 0) {
      addToast('warning', 'يجب إضافة مستلم واحد على الأقل');
      return;
    }
    if (!messageContent.trim()) {
      addToast('warning', 'يرجى كتابة نص الرسالة');
      return;
    }

    try {
      const payload: CreateCampaignPayload = {
        name: campaignName.trim(),
        whatsappAccountId: selectedAccountId || undefined,
        messageType,
        messageContent: messageContent.trim(),
        mediaUrl: mediaFile?.url,
        mediaFilename: mediaFile?.filename,
        minDelaySeconds: Number(minDelay) || 5,
        maxDelaySeconds: Number(maxDelay) || 12,
        batchSize: Number(batchSize) || 25,
        batchSleepSeconds: Number(batchSleep) || 30,
        recipients: recipientsList,
      };

      const created = await broadcastService.createCampaign(payload);
      addToast('success', 'تم إنشاء الحملة بنجاح');

      if (andStartImmediately && created?.id) {
        await broadcastService.startCampaign(created.id);
        addToast('info', 'بدأ إرسال الرسائل في الخلفية');
      }

      // Reset form
      setIsCreateModalOpen(false);
      setCurrentStep(1);
      setCampaignName('');
      setMessageContent('');
      setMediaFile(null);
      setRecipientsList([]);
      setValidationResults(null);

      queryClient.invalidateQueries({ queryKey: ['broadcast_campaigns'] });
    } catch (err: any) {
      addToast('error', err?.message || 'فشل حفظ الحملة');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            جاري الإرسال
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
            <Pause className="w-3 h-3" />
            متوقفة مؤقتاً
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            مكتملة
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1">
            <Square className="w-3 h-3" />
            ملغاة
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            فشلت
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border border-slate-500/20">
            مسودة
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* ─── Header Section ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">الحملات والإرسال الجماعي</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                إرسال رسائل مخصصة للعملاء مع فواصل ذكية لمكافحة الحظر، تقارير تفصيلية، وتحكم لحظي كامل
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <Button
            variant="outline"
            onClick={() => refetchCampaigns()}
            disabled={isCampaignsLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isCampaignsLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>

          <Button
            onClick={() => {
              setIsCreateModalOpen(true);
              setCurrentStep(1);
            }}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
          >
            <Plus className="w-4 h-4" />
            إنشاء حملة جديدة
          </Button>
        </div>
      </div>

      {/* ─── Top Statistics Overview Cards ────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">إجمالي الحملات</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalCampaigns}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">الرسائل المرسلة بنجاح</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">{stats.totalSent}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">الرسائل الفاشلة</p>
            <h3 className="text-2xl font-bold mt-1 text-red-500">{stats.totalFailed}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">نسبة النجاح الكلية</p>
            <h3 className="text-2xl font-bold mt-1 text-primary">{stats.successRate}%</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ─── Toolbar: Search & Status Filters ─────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث عن حملة باسم أو محتوى..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'running', label: 'جاري الإرسال' },
            { id: 'paused', label: 'متوقفة مؤقتاً' },
            { id: 'completed', label: 'مكتملة' },
            { id: 'draft', label: 'مسودات' },
            { id: 'cancelled', label: 'ملغاة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Campaigns List ───────────────────────────────────── */}
      {filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">لا توجد حملات مسجلة</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            ابدأ بإنشاء أول حملة رسائل جماعية للتواصل مع عملائك وزيادة تفاعلهم مع الحفاظ على أمان أرقامك.
          </p>
          <Button
            onClick={() => {
              setIsCreateModalOpen(true);
              setCurrentStep(1);
            }}
            className="mt-4 gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            إنشاء حملة الآن
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCampaigns.map((c) => {
            const processed = (c.sentCount || 0) + (c.failedCount || 0);
            const total = c.totalRecipients || 1;
            const progressPercent = Math.min(100, Math.round((processed / total) * 100));

            return (
              <Card key={c.id} className="p-5 border border-border shadow-sm hover:border-primary/40 transition">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Left Column: Info & Content Preview */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
                      {renderStatusBadge(c.status)}

                      <Badge variant="outline" className="text-xs">
                        {c.messageType === 'text' && 'نص فقط'}
                        {c.messageType === 'image' && 'رسالة مع صورة'}
                        {c.messageType === 'video' && 'رسالة مع فيديو'}
                        {c.messageType === 'document' && 'رسالة مع ملف PDF/مستند'}
                      </Badge>

                      <span className="text-xs text-muted-foreground flex items-center gap-1 mr-auto lg:mr-0">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(c.createdAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/30 p-2.5 rounded-lg border border-border/50 font-mono">
                      {c.messageContent}
                    </p>

                    {/* Live Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">
                          التقدم: {processed} من {c.totalRecipients} ({progressPercent}%)
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-600 font-medium">✓ ناجح: {c.sentCount}</span>
                          <span className="text-red-500 font-medium">✗ فاشل: {c.failedCount}</span>
                          <span className="text-muted-foreground">⏳ متبقي: {c.pendingCount}</span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 transition-all duration-300"
                          style={{ width: `${(c.sentCount / total) * 100}%` }}
                          title={`تم الإرسال: ${c.sentCount}`}
                        ></div>
                        <div
                          className="bg-red-500 transition-all duration-300"
                          style={{ width: `${(c.failedCount / total) * 100}%` }}
                          title={`فشل: ${c.failedCount}`}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Control Buttons */}
                  <div className="flex lg:flex-col justify-end items-end gap-2 shrink-0 border-t lg:border-t-0 lg:border-r border-border pt-3 lg:pt-0 lg:pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Play / Start Button */}
                      {(c.status === 'draft' || c.status === 'paused') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => (c.status === 'paused' ? resumeMutation.mutate(c.id) : startMutation.mutate(c.id))}
                          className="gap-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                          title="بدء الإرسال"
                        >
                          <Play className="w-4 h-4 fill-emerald-600" />
                          {c.status === 'paused' ? 'استئناف' : 'تشغيل'}
                        </Button>
                      )}

                      {/* Pause Button */}
                      {c.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseMutation.mutate(c.id)}
                          className="gap-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200"
                          title="إيقاف مؤقت"
                        >
                          <Pause className="w-4 h-4" />
                          إيقاف مؤقت
                        </Button>
                      )}

                      {/* Cancel Button */}
                      {(c.status === 'running' || c.status === 'paused') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من إلغاء هذه الحملة نهائياً؟')) {
                              cancelMutation.mutate(c.id);
                            }
                          }}
                          className="gap-1 text-red-600 hover:bg-red-50 border-red-200"
                          title="إلغاء الحملة"
                        >
                          <Square className="w-3.5 h-3.5" />
                          إلغاء
                        </Button>
                      )}

                      {/* Retry Failed */}
                      {c.failedCount > 0 && c.status !== 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(c.id)}
                          className="gap-1 text-blue-600 hover:bg-blue-50 border-blue-200"
                          title="إعادة إرسال الرسائل التي واجهت أخطاء"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          إعادة الفاشل ({c.failedCount})
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* View Report & Analytics */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReportModalCampaignId(c.id)}
                        className="gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        التقرير والتفاصيل
                      </Button>

                      {/* Export CSV Direct Link */}
                      <a
                        href={broadcastService.getExportUrl(c.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition"
                        title="تحميل تقرير Excel/CSV"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {/* Delete Campaign */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف حملة "${c.name}"؟`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="text-red-500 hover:bg-red-50 p-2"
                        title="حذف الحملة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── NEW CAMPAIGN WIZARD MODAL ───────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="معالج إنشاء حملة رسائل جماعية جديدة"
        maxWidth="2xl"
      >
        <div className="space-y-6 py-2" dir="rtl">
          {/* Wizard Step Indicator */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            {[
              { step: 1, title: 'الجمهور والمستلمون' },
              { step: 2, title: 'محتوى الرسالة والوسائط' },
              { step: 3, title: 'إعدادات الحظر والمراجعة' },
            ].map((s) => (
              <div
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`flex items-center gap-2 cursor-pointer transition ${
                  currentStep === s.step
                    ? 'text-primary font-bold'
                    : currentStep > s.step
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === s.step
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > s.step
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.step}
                </div>
                <span className="text-xs md:text-sm">{s.title}</span>
              </div>
            ))}
          </div>

          {/* ── STEP 1: Audience & Recipients ── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">اسم الحملة *</label>
                <input
                  type="text"
                  placeholder="مثال: عروض نهاية الأسبوع، رسالة الترحيب..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">حساب واتساب المرسل *</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— الحساب الافتراضي المتصل بالنظام —</option>
                  {whatsappAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name || acc.phoneNumber || 'حساب بدون اسم'} ({acc.phoneNumber || 'لا يوجد رقم'}) -{' '}
                      {acc.status === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Tabs */}
              <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-sm font-bold">طريقة تحديد المستلمين</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRecipientSourceTab('manual')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        recipientSourceTab === 'manual'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      إدخال يدوي / لصق
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientSourceTab('extracted');
                        importFromGroupContacts();
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        recipientSourceTab === 'extracted'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      جهات اتصال الجروبات
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientSourceTab('crm');
                        importFromCrmContacts();
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        recipientSourceTab === 'crm'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      سجل عملاء CRM
                    </button>
                  </div>
                </div>

                {recipientSourceTab === 'manual' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      ألصق الأرقام (رقم في كل سطر أو مفصولة بفواصل). يمكنك أيضاً كتابة: "محمد: 01012345678"
                    </p>
                    <textarea
                      rows={4}
                      placeholder="01012345678&#10;أحمد: 01198765432&#10;+96512345678"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <Button size="sm" type="button" onClick={parseManualRecipients} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      إضافة الأرقام للقائمة
                    </Button>
                  </div>
                )}
              </div>

              {/* Recipients Review & WhatsApp Check */}
              <div className="border border-border rounded-xl p-4 bg-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">المستلمون المعتمدون:</span>
                    <Badge variant="secondary" className="font-bold text-sm">
                      {recipientsList.length} رقم
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={handleValidateNumbers}
                      disabled={isValidatingNumbers || recipientsList.length === 0}
                      className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      {isValidatingNumbers ? 'جاري الفحص عبر واتساب...' : 'فحص وتصفية الأرقام على واتساب'}
                    </Button>

                    {recipientsList.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setRecipientsList([]);
                          setValidationResults(null);
                        }}
                        className="text-red-500 hover:bg-red-50 text-xs"
                      >
                        مسح الكل
                      </Button>
                    )}
                  </div>
                </div>

                {validationResults && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-700 flex items-center justify-between">
                    <span>
                      ✓ تم فحص {validationResults.total} رقم — معتمد على واتساب: {validationResults.valid}، غير مسجل:{' '}
                      {validationResults.invalid}
                    </span>
                  </div>
                )}

                {recipientsList.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs">
                    {recipientsList.slice(0, 100).map((r, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between hover:bg-muted/30">
                        <span className="font-mono">{r.phoneNumber}</span>
                        <span className="text-muted-foreground">{r.recipientName || 'بدون اسم'}</span>
                        <button
                          type="button"
                          onClick={() => setRecipientsList((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {recipientsList.length > 100 && (
                      <div className="p-2 text-center text-muted-foreground bg-muted/20">
                        و {recipientsList.length - 100} رقم إضافي...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Message Content & Media ── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">نوع الرسالة</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'text', label: 'نص فقط', icon: FileText },
                    { id: 'image', label: 'صورة', icon: ImageIcon },
                    { id: 'video', label: 'فيديو', icon: Video },
                    { id: 'document', label: 'مستند/PDF', icon: FileCode },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMessageType(t.id as any)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${
                          messageType === t.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media File Upload */}
              {messageType !== 'text' && (
                <div className="border border-dashed border-border rounded-xl p-4 text-center bg-muted/10 space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    اختر ملف {messageType === 'image' ? 'الصورة' : messageType === 'video' ? 'الفيديو' : 'المستند (PDF)'}
                  </p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploadingMedia}
                    accept={
                      messageType === 'image'
                        ? 'image/*'
                        : messageType === 'video'
                        ? 'video/*'
                        : '.pdf,.doc,.docx,.xls,.xlsx'
                    }
                    className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-primary file:text-primary-foreground"
                  />
                  {mediaFile && (
                    <div className="text-xs text-emerald-600 font-medium">✓ تم إرفاق الملف: {mediaFile.filename}</div>
                  )}
                </div>
              )}

              {/* Message Composer */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-foreground">
                    {messageType === 'text' ? 'نص الرسالة *' : 'نص الشرح (Caption) المرفق *'}
                  </label>

                  {/* Insert Dynamic Variables */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMessageContent((prev) => `${prev} {name}`)}
                      className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded text-xs font-semibold"
                      title="استبدال تلقائي باسم العميل"
                    >
                      + اسم العميل {'{name}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageContent((prev) => `${prev} {phone}`)}
                      className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded text-xs font-semibold"
                      title="استبدال برقم هاتف العميل"
                    >
                      + رقم الهاتف {'{phone}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageContent((prev) => `${prev} {مرحباً|أهلاً|السلام عليكم}`)}
                      className="px-2 py-1 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 rounded text-xs font-semibold"
                      title="تنويع النص تلقائياً لمنع الحظر"
                    >
                      + تنويع Spintax
                    </button>
                  </div>
                </div>

                {/* Quick Reply selector */}
                {quickReplies.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">قالب سريع:</span>
                    <select
                      onChange={(e) => {
                        const reply = quickReplies.find((q) => q.id === e.target.value);
                        if (reply) {
                          setMessageContent(reply.body);
                        }
                      }}
                      className="text-xs bg-muted px-2 py-1 rounded border border-border"
                    >
                      <option value="">— اختر قالباً مسجلاً —</option>
                      {quickReplies.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name} ({q.shortcut})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <textarea
                  rows={5}
                  placeholder="اكتب رسالتك هنا... يمكنك استخدام {name} ليتم استبدالها باسم العميل تلقائياً"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-sans"
                />

                {/* Live Preview Box */}
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                  <span className="text-xs font-bold text-muted-foreground block mb-1">
                    معاينة شكل الرسالة كما ستظهر للعميل:
                  </span>
                  <div className="bg-[#e7fedb] text-zinc-900 p-3 rounded-lg text-xs leading-relaxed max-w-sm rounded-tr-none shadow-sm font-sans whitespace-pre-wrap">
                    {messageContent
                      ? messageContent
                          .replace(/\{name\}/g, 'محمد أحمد')
                          .replace(/\{phone\}/g, '01012345678')
                          .replace(/\{([^{}]+)\}/g, (_, opts) => opts.split('|')[0])
                      : 'معاينة نص الرسالة...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Anti-Ban & Review ── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                  <ShieldCheck className="w-5 h-5" />
                  محرك الحماية ومكافحة الحظر (Anti-Ban Protection)
                </div>
                <p className="text-xs text-muted-foreground">
                  تساعد هذه الإعدادات على محاكاة السلوك البشري الطبيعي في الإرسال وتجنب اكتشاف وتجميد الحسابات بواسطة خوارزميات واتساب.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">الحد الأدنى للتأخير (بالثواني)</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={minDelay}
                    onChange={(e) => setMinDelay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                  <span className="text-[11px] text-muted-foreground">أقل وقت انتظار قبل الرسالة التالية</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">الحد الأقصى للتأخير (بالثواني)</label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                  <span className="text-[11px] text-muted-foreground">يتم اختيار رقم عشوائي بين الحد الأدنى والأقصى</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">حجم الدفعة (Batch Size)</label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                  <span className="text-[11px] text-muted-foreground">عدد الرسائل المرسلة قبل أخذ استراحة</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">مدة استراحة الدفعة (بالثواني)</label>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={batchSleep}
                    onChange={(e) => setBatchSleep(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                  <span className="text-[11px] text-muted-foreground">التوقف المؤقت بعد كل دفعة لتهدئة النشاط</span>
                </div>
              </div>

              {/* Summary Review Card */}
              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
                <h4 className="font-bold text-sm text-foreground">ملخص الحملة:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">اسم الحملة:</span>{' '}
                    <span className="font-semibold">{campaignName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">إجمالي المستلمين:</span>{' '}
                    <span className="font-bold text-primary">{recipientsList.length} رقم</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نوع الرسالة:</span>{' '}
                    <span className="font-semibold">{messageType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">معدل التأخير العشوائي:</span>{' '}
                    <span className="font-semibold">
                      من {minDelay} إلى {maxDelay} ثانية
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)}>
                السابق
              </Button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && recipientsList.length === 0) {
                      addToast('warning', 'يرجى إضافة مستلمين أولاً');
                      return;
                    }
                    if (currentStep === 2 && !messageContent.trim()) {
                      addToast('warning', 'يرجى كتابة نص الرسالة');
                      return;
                    }
                    setCurrentStep((prev) => prev + 1);
                  }}
                  className="gap-1.5"
                >
                  التالي
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreateCampaign(false)}
                    className="gap-1.5"
                  >
                    حفظ كمسودة
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleCreateCampaign(true)}
                    className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                  >
                    <Send className="w-4 h-4" />
                    حفظ وبدء الإرسال فوراً
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── DETAILED CAMPAIGN REPORT MODAL ───────────────────── */}
      <Modal
        isOpen={!!reportModalCampaignId}
        onClose={() => setReportModalCampaignId(null)}
        title={reportData?.campaign?.name ? `تقرير تفصيلي: ${reportData.campaign.name}` : 'تقرير الحملة'}
        maxWidth="2xl"
      >
        {isReportLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            جاري تحميل التقرير...
          </div>
        ) : !reportData?.campaign ? (
          <div className="p-8 text-center text-muted-foreground">الحملة غير موجودة</div>
        ) : (
          <div className="space-y-5 py-2" dir="rtl">
            {/* Top Cards for this Campaign */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-muted/40 rounded-xl border border-border text-center">
                <span className="text-xs text-muted-foreground">إجمالي المستلمين</span>
                <p className="text-xl font-bold text-foreground mt-1">{reportData.campaign.totalRecipients}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                <span className="text-xs text-emerald-600">تم الإرسال بنجاح</span>
                <p className="text-xl font-bold text-emerald-600 mt-1">{reportData.campaign.sentCount}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                <span className="text-xs text-red-500">فشل الإرسال</span>
                <p className="text-xl font-bold text-red-500 mt-1">{reportData.campaign.failedCount}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                <span className="text-xs text-blue-600">قيد الانتظار</span>
                <p className="text-xl font-bold text-blue-600 mt-1">{reportData.campaign.pendingCount}</p>
              </div>
            </div>

            {/* Campaign Details Box */}
            <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">نص الرسالة المرسلة:</span>
                <span className="text-muted-foreground">نوع الرسالة: {reportData.campaign.messageType}</span>
              </div>
              <p className="p-2 bg-background rounded-lg border border-border font-mono whitespace-pre-wrap">
                {reportData.campaign.messageContent}
              </p>
            </div>

            {/* Recipients Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">سجل المستلمين وحالات التسليم:</h4>
                <div className="flex items-center gap-2">
                  {reportData.campaign.failedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate(reportData.campaign.id)}
                      className="text-xs gap-1 text-blue-600 border-blue-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      إعادة إرسال الفاشل فقط
                    </Button>
                  )}

                  <a
                    href={broadcastService.getExportUrl(reportData.campaign.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تصدير إلى Excel / CSV
                  </a>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-xs text-right divide-y divide-border">
                  <thead className="bg-muted/50 sticky top-0 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-2.5">رقم الهاتف</th>
                      <th className="p-2.5">الاسم</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">وقت الإرسال</th>
                      <th className="p-2.5">ملاحظات / سبب الخطأ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.recipients?.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="p-2.5 font-mono">{r.phoneNumber}</td>
                        <td className="p-2.5">{r.recipientName || '—'}</td>
                        <td className="p-2.5">
                          {r.status === 'sent' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              تم الإرسال
                            </Badge>
                          )}
                          {r.status === 'failed' && (
                            <Badge className="bg-red-500/10 text-red-600 border border-red-500/20">فشل</Badge>
                          )}
                          {r.status === 'pending' && (
                            <Badge className="bg-slate-500/10 text-slate-600 border border-slate-500/20">
                              قيد الانتظار
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {r.sentAt ? new Date(r.sentAt).toLocaleTimeString('ar-EG') : '—'}
                        </td>
                        <td className="p-2.5 text-red-500 max-w-xs truncate" title={r.errorReason || ''}>
                          {r.errorReason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
