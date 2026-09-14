import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '@/services/whatsapp.service';
import { WhatsAppAccount, CreateWhatsAppAccountInput } from '@/types/whatsapp';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  Smartphone,
  Plus,
  QrCode,
  KeyRound,
  RotateCw,
  LogOut,
  Phone,
  Radio,
  Copy,
  Check,
  Power,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wifi,
  WifiOff,
  Globe,
  Share2,
  Trash2,
} from 'lucide-react';

const COUNTRY_PREFIXES = [
  { code: '966', country: 'السعودية' },
  { code: '965', country: 'الكويت' },
  { code: '20', country: 'مصر' },
  { code: '971', country: 'الإمارات' },
  { code: '974', country: 'قطر' },
  { code: '968', country: 'عُمان' },
  { code: '973', country: 'البحرين' },
  { code: '962', country: 'الأردن' },
];

export const WhatsAppPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [selectedSessionForPairing, setSelectedSessionForPairing] = useState<WhatsAppAccount | null>(null);
  const [selectedPrefix, setSelectedPrefix] = useState('966');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCodeResult, setPairingCodeResult] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newSessionName, setNewSessionName] = useState('Trenty Vision — الخط الرئيسي');

  // Interactive guide active tab
  const [guideTab, setGuideTab] = useState<'qr' | 'code'>('qr');
  // Troubleshooting Accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // QR expiration countdown (60s cycle)
  const [qrCountdown, setQrCountdown] = useState(60);

  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappService.listAccounts(),
    refetchInterval: 3000, // Poll every 3s for QR and live connection updates
  });


  // QR Countdown effect
  useEffect(() => {
    const hasAnyQrRequired = accounts.some((a: any) => a.status === 'qr_required');
    let timer: NodeJS.Timeout;
    if (hasAnyQrRequired) {
      timer = setInterval(() => {
        setQrCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
      }, 1000);
    } else {
      setQrCountdown(60);
    }
    return () => clearInterval(timer);
  }, [accounts]);

  const createMutation = useMutation({
    mutationFn: (input: CreateWhatsAppAccountInput) => whatsappService.createAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      setIsAddAccountModalOpen(false);
      setNewSessionName('');
      success('تم بدء جلسة واتساب جديدة بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل بدء الجلسة');
    },
  });

  const connectMutation = useMutation({
    mutationFn: (sessionId: string) => whatsappService.connectSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      setQrCountdown(60);
      success('جاري تهيئة جلسة واتساب وتوليد الرمز...');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل بدء الاتصال');
    },
  });

  const restartMutation = useMutation({
    mutationFn: (sessionId: string) => whatsappService.restartSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      success('جاري إعادة تشغيل الجلسة...');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إعادة التشغيل');
    },
  });

  const resetMutation = useMutation({
    mutationFn: (sessionId: string) => whatsappService.resetSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      setQrCountdown(60);
      success('تمت إعادة ضبط الجلسة وبدء تهيئة نظيفة للمقبس');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إعادة ضبط الجلسة');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: (sessionId: string) => whatsappService.logoutSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      success('تم تسجيل الخروج من جلسة واتساب بأمان');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تسجيل الخروج');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (sessionId: string) => whatsappService.deleteAccount(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      success('تم حذف بوابة الواتساب بالكامل من النظام');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل الحذف');
    },
  });

  const [isDispatcherModalOpen, setIsDispatcherModalOpen] = useState(false);
  const [selectedAccountForDispatcher, setSelectedAccountForDispatcher] = useState<WhatsAppAccount | null>(null);
  const [dispatcherTargetSlot, setDispatcherTargetSlot] = useState<1 | 2>(1);

  const dispatcherMutation = useMutation({
    mutationFn: ({ id, isPrimary, slot }: { id: string; isPrimary: boolean; slot?: number }) =>
      whatsappService.setDispatcherStatus(id, isPrimary, slot),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      setIsDispatcherModalOpen(false);
      setSelectedAccountForDispatcher(null);
      if (vars.isPrimary) {
        success(`تم تعيين الحساب كرقم موزع أساسي (خانة ${vars.slot || 1}) بنجاح`);
      } else {
        success('تم إلغاء تعيين الحساب كرقم موزع أساسي');
      }
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || err?.message || 'فشل تحديث حالة الرقم الموزع');
    },
  });

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForPairing || !pairingPhone.trim() || pairingLoading) return;

    setPairingLoading(true);
    try {
      // Remove all non-digits, and strip any leading zero (e.g. 0501234567 -> 501234567)
      const digitsOnly = pairingPhone.replace(/\D/g, '').replace(/^0+/, '');
      const fullPhone = `${selectedPrefix}${digitsOnly}`;
      const res = await whatsappService.requestPairingCode(
        selectedSessionForPairing.id,
        fullPhone
      );
      setPairingCodeResult(res.formattedCode || res.code);
      success('تم توليد كود الاقتران بنجاح 🔑');
    } catch (err: any) {
      toastError(err?.message || 'فشل طلب رمز الاقتران');
    } finally {
      setPairingLoading(false);
    }
  };

  const copyPairingCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code.replace(/[^A-Za-z0-9]/g, ''));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
      success('تم نسخ كود الاقتران إلى الحافظة');
    } catch {
      prompt('انسخ كود الاقتران يدوياً:', code);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="بوابة ربط WhatsApp"
        subtitle="إدارة مقابس Baileys السريعة، مسح كود الـ QR، أو الاقتران برمز الهاتف"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddAccountModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            إضافة حساب جديد
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {isLoading ? (
          <CardSkeleton count={3} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل جلسات واتساب"
            message={(error as any)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : accounts.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Smartphone className="w-7 h-7 text-muted-foreground" />}
              title="لا توجد حسابات واتساب مهيأة"
              description="أضف جلسة WhatsApp لبدء ربط رقم الهاتف عبر مسح كود QR أو الرمز المكون من 8 أرقام."
              actionText="بدء جلسة جديدة"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={() => setIsAddAccountModalOpen(true)}
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {accounts.length > 0 && accounts.some((a: any) => a.bridgeStatus === 'offline') && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold">سيرفر WhatsApp المحلي غير متصل (Baileys Bridge Offline)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      الموقع شغال طبيعياً على السحابة، ولكن لتشغيل مقبس واتساب وإرسال واستقبال الرسائل، يرجى تشغيل السيرفر المحلي عبر الأمر <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">npm run bridge</code> على جهازك.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {accounts.map((activeAccount: any) => {
              const qrImage = activeAccount?.qrCode || activeAccount?.liveQrCode;
              const isConnected = activeAccount?.status === 'connected';
              const isQrRequired = activeAccount?.status === 'qr_required';
              const isInitializing = activeAccount?.status === 'initializing' || activeAccount?.status === 'connecting';
              const isDisconnected = activeAccount?.status === 'disconnected' || activeAccount?.status === 'logged_out';
              const isErr = activeAccount?.status === 'error';

              return (
                <div key={activeAccount.id} className="space-y-6 mb-12">
{/* Real-time Diagnostics Alert Bar if Error/Disconnected */}
            {activeAccount && (isErr || activeAccount.liveError || activeAccount.status === 'logged_out') && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 text-right">
                    <h4 className="text-sm font-bold">تنبيه اتصال المقبس:</h4>
                    <p className="text-xs leading-relaxed text-destructive/90">
                      {activeAccount.liveError ||
                        (activeAccount.status === 'logged_out'
                          ? 'تم تسجيل الخروج من تطبيق WhatsApp على هاتفك. يلزم مسح رمز QR جديد للاتصال.'
                          : 'انقطع الاتصال بخوادم واتساب أو انتهت مهلة الاستجابة.')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => resetMutation.mutate(activeAccount.id)}
                    isLoading={resetMutation.isPending}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                  >
                    إعادة ضبط نظيفة (Clean Reset)
                  </Button>
                </div>
              </div>
            )}

            {/* Primary Dispatchers Info Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-right">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>منظومة التوزيع المركزية (Primary Dispatchers)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                      حد أقصى: رقمان
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                    يتم استقبال كافة رسائل العملاء الواردة على الأرقام الأساسية الموزعة (حتى رقمين معتمدين للشركة) وتوجيهها وتوزيعها آلياً على الموظفين ومحطات العمل، دون الحاجة لمسح الـ QR بهواتف الموظفين.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {accounts.filter((a) => a.isPrimaryDispatcher).map((disp) => (
                  <span
                    key={disp.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 font-mono"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>خانة {disp.dispatcherSlot || 1}: {disp.phoneNumber || disp.livePhoneNumber || disp.sessionName}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Hero Connection Card (Active Primary Account) */}
            {activeAccount && (
              <Card className="bg-gradient-to-l from-sidebar via-[#193530] to-sidebar text-sidebar-foreground border-sidebar-border shadow-lift p-6 sm:p-7 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3 text-right max-w-lg">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sidebar-accent border border-sidebar-border/60 font-mono text-[11px] text-sidebar-primary font-bold">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>BAILEYS FAST WEBSOCKET GATEWAY</span>
                      </div>
                      {activeAccount.isPrimaryDispatcher && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-bold shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-amber-950" />
                          <span>الرقم الأساسي الموزع (خانة {activeAccount.dispatcherSlot || 1})</span>
                        </div>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                      {activeAccount.sessionName || activeAccount.displayName || 'Trenty Vision — الخط الرئيسي'}
                    </h2>

                    <p className="text-xs text-sidebar-foreground/85 leading-relaxed">
                      نظام ربط واتساب السريع والمحلي بدون الحاجة لـ Meta Cloud API، يدعم مزامنة الرسائل اللحظية،
                      إرسال واستقبال الصور والوسائط، والملاحظات الداخلية فورياً.
                    </p>

                    {/* Status Highlights */}
                    <div className="flex items-center gap-2 pt-1">
                      {isConnected ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                          <Wifi className="w-3.5 h-3.5" />
                          <span>متصل ومفعل في الخدمة</span>
                        </div>
                      ) : isQrRequired ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>في انتظار مسح الرمز ({qrCountdown} ثانية)</span>
                        </div>
                      ) : isInitializing ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري تهيئة المقبس وتوليد الرمز...</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
                          <WifiOff className="w-3.5 h-3.5" />
                          <span>غير متصل</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      {/* Primary Dispatcher Settings Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForDispatcher(activeAccount);
                          setDispatcherTargetSlot((activeAccount.dispatcherSlot as 1 | 2) || 1);
                          setIsDispatcherModalOpen(true);
                        }}
                        leftIcon={<Share2 className="w-4 h-4 text-amber-300" />}
                        className="text-amber-200 border-amber-300/30 hover:bg-amber-400/20 font-bold"
                      >
                        {activeAccount.isPrimaryDispatcher
                          ? `إدارة التوزيع (خانة ${activeAccount.dispatcherSlot || 1})`
                          : 'تعيين كرقم موزع'}
                      </Button>

                      {/* Pairing with Phone Code Button */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedSessionForPairing(activeAccount);
                          setPairingCodeResult(null);
                        }}
                        leftIcon={<KeyRound className="w-4 h-4 text-primary" />}
                      >
                        اقتران برقم الهاتف
                      </Button>

                      {/* Connect Button if Disconnected */}
                      {isDisconnected && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => connectMutation.mutate(activeAccount.id)}
                          isLoading={connectMutation.isPending}
                          leftIcon={<Power className="w-4 h-4" />}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          بدء الاتصال (QR)
                        </Button>
                      )}

                      {/* Refresh QR Button if in QR state */}
                      {isQrRequired && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => connectMutation.mutate(activeAccount.id)}
                          isLoading={connectMutation.isPending}
                          leftIcon={<RotateCw className="w-4 h-4 text-amber-300" />}
                        >
                          تحديث رمز QR
                        </Button>
                      )}

                      {/* Restart Button */}
                      {isConnected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restartMutation.mutate(activeAccount.id)}
                          isLoading={restartMutation.isPending}
                          leftIcon={<RotateCw className="w-4 h-4" />}
                          className="text-white border-white/20 hover:bg-white/10"
                        >
                          إعادة تشغيل الجلسة
                        </Button>
                      )}

                      {/* Clean Reset Button (Always available for instant recovery) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('هل ترغب في إعادة ضبط نظيفة للمقبس؟ سيتم مسح أي جلسة مؤقتة وتوليد رمز QR جديد خلال ثوانٍ.')) {
                            resetMutation.mutate(activeAccount.id);
                          }
                        }}
                        isLoading={resetMutation.isPending}
                        leftIcon={<RefreshCw className="w-4 h-4 text-amber-300" />}
                        className="text-amber-200 hover:bg-amber-500/20"
                        title="إعادة ضبط نظيفة لحل أي تعليق في الاتصال"
                      >
                        إعادة ضبط نظيفة
                      </Button>

                      {/* Delete Account Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف البوابة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
                            deleteAccountMutation.mutate(activeAccount.id);
                          }
                        }}
                        isLoading={deleteAccountMutation.isPending}
                        leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
                        className="text-red-400 hover:bg-red-500/20"
                        title="حذف البوابة نهائياً"
                      >
                        حذف البوابة نهائياً
                      </Button>
                    </div>
                  </div>

                  {/* QR Code / Status Visual Box */}
                  <div className="p-5 rounded-2xl bg-card text-foreground border border-border shadow-lift flex flex-col items-center justify-center shrink-0 w-72 h-72 text-center relative overflow-hidden">
                    {isConnected ? (
                      <div className="space-y-3 flex flex-col items-center animate-in zoom-in-95">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                          <ShieldCheck className="w-9 h-9" />
                        </div>
                        <Badge variant="success" pulse size="md">
                          متصل ومفعل
                        </Badge>
                        <div className="font-mono text-sm font-bold text-foreground" dir="ltr">
                          {activeAccount.livePhoneNumber || activeAccount.phoneNumber || 'CONNECTED'}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          المقبس يعمل بكفاءة وجاهز لإرسال واستقبال الرسائل
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('هل ترغب في قطع الاتصال وتسجيل الخروج؟')) {
                              logoutMutation.mutate(activeAccount.id);
                            }
                          }}
                          leftIcon={<LogOut className="w-3.5 h-3.5 text-destructive" />}
                          className="text-destructive hover:bg-destructive/10 text-[11px]"
                        >
                          تسجيل الخروج
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف البوابة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
                              deleteAccountMutation.mutate(activeAccount.id);
                            }
                          }}
                          leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          className="text-red-500 hover:bg-red-500/10 text-[11px]"
                        >
                          حذف نهائي
                        </Button>
                      </div>
                    ) : qrImage ? (
                      <div className="space-y-2.5 flex flex-col items-center animate-in zoom-in-95 w-full">
                        <div className="relative p-2 bg-white rounded-xl shadow-md border border-border">
                          <img
                            src={qrImage}
                            alt="WhatsApp QR Code"
                            className="w-40 h-40 object-contain rounded-lg"
                          />
                        </div>

                        {/* Live Timer Progress */}
                        <div className="w-full px-4 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                            <span>الصلاحية: {qrCountdown}s</span>
                            <span className="text-primary font-bold">امسح الكود عبر واتساب</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                              style={{ width: `${(qrCountdown / 60) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => connectMutation.mutate(activeAccount.id)}
                            className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>تحديث الرمز الآن</span>
                          </button>
                        </div>
                      </div>
                    ) : isDisconnected ? (
                      <div className="space-y-3.5 flex flex-col items-center text-muted-foreground animate-in fade-in">
                        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
                          <QrCode className="w-7 h-7 stroke-1" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-foreground">الجلسة غير متصلة</div>
                          <p className="text-[11px] text-muted-foreground max-w-[200px]">
                            اضغط على بدء الاتصال لتوليد رمز الاستجابة السريعة (QR)
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => connectMutation.mutate(activeAccount.id)}
                          isLoading={connectMutation.isPending}
                          leftIcon={<Power className="w-4 h-4" />}
                        >
                          توليد رمز QR
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 flex flex-col items-center text-muted-foreground animate-in fade-in">
                        <RotateCw className="w-9 h-9 animate-spin text-primary" />
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-foreground">جاري تهيئة المقبس المحلي...</span>
                          <p className="text-[10px] text-muted-foreground">يستغرق ثانية إلى ثانيتين فقط</p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => connectMutation.mutate(activeAccount.id)}
                            isLoading={connectMutation.isPending}
                          >
                            تحديث الاتصال
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetMutation.mutate(activeAccount.id)}
                            isLoading={resetMutation.isPending}
                            className="text-amber-500 hover:bg-amber-500/10"
                          >
                            إعادة ضبط نظيفة
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* All Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const accConnected = acc.status === 'connected';
                const accDisconnected = acc.status === 'disconnected' || acc.status === 'logged_out';

                return (
                  <Card key={acc.id} hover className="flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground leading-tight">
                              {acc.sessionName || acc.displayName}
                            </h3>
                            <div className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                              {acc.livePhoneNumber || acc.phoneNumber || 'رقم غير محدد'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={accConnected ? 'success' : 'warning'}
                            pulse={accConnected}
                          >
                            {accConnected ? 'متصل' : acc.status === 'qr_required' ? 'بانتظار الربط' : acc.status}
                          </Badge>
                          {acc.isPrimaryDispatcher && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-500/30 font-mono">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              <span>موزع #{acc.dispatcherSlot || 1}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs font-mono">
                        <span className="text-[11px] text-muted-foreground">معرف الجلسة:</span>
                        <span className="text-[10px] text-foreground font-semibold">
                          #{acc.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-3 border-t border-border/60">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForDispatcher(acc);
                          setDispatcherTargetSlot((acc.dispatcherSlot as 1 | 2) || 1);
                          setIsDispatcherModalOpen(true);
                        }}
                        leftIcon={<Share2 className="w-3.5 h-3.5 text-amber-500" />}
                        className="text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold"
                      >
                        {acc.isPrimaryDispatcher ? `موزع (${acc.dispatcherSlot || 1})` : 'تعيين كموزع'}
                      </Button>
                      {accDisconnected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => connectMutation.mutate(acc.id)}
                          isLoading={connectMutation.isPending}
                          leftIcon={<Power className="w-3.5 h-3.5 text-primary" />}
                        >
                          اتصال
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restartMutation.mutate(acc.id)}
                        leftIcon={<RotateCw className="w-3.5 h-3.5 text-muted-foreground" />}
                      >
                        إعادة تشغيل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => logoutMutation.mutate(acc.id)}
                        leftIcon={<LogOut className="w-3.5 h-3.5 text-destructive" />}
                      >
                        خروج
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Interactive Step-by-Step Mobile Pairing Guide */}
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="space-y-1 text-right">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>دليل الاقتران بخطوات سهلة من هاتفك</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    اتبع الخطوات الموضحة لربط حساب واتساب بنجاح خلال ثوانٍ
                  </p>
                </div>

                {/* Tabs Switcher */}
                <div className="inline-flex rounded-xl bg-secondary p-1 border border-border text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setGuideTab('qr')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      guideTab === 'qr'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    طريقة الـ QR (الأسرع)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideTab('code')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      guideTab === 'code'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    طريقة كود الهاتف (8 أرقام)
                  </button>
                </div>
              </div>

              {guideTab === 'qr' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-foreground">افتح واتساب</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      افتح تطبيق WhatsApp على هاتفك المسجل برقم الخدمة.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-foreground">الأجهزة المرتبطة</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اضغط على قائمة الخيارات (الثلاث نقاط في أندرويد أو الإعدادات في آيفون) ثم اختر <strong>الأجهزة المرتبطة</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-foreground">ربط جهاز</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اضغط على الزر الأخضر <strong>ربط جهاز (Link a Device)</strong> وفعّل كاميرا الهاتف.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      4
                    </div>
                    <h4 className="text-sm font-bold text-foreground">امسح الكود</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      وجّه الكاميرا نحو كود QR الظاهر في البطاقة أعلاه، وسيتصل النظام فوراً.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-foreground">طلب الربط برقم الهاتف</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      في شاشة مسح الكود بهاتفك، اضغط على <strong>الربط برقم الهاتف بدلاً من ذلك</strong> أسفل الشاشة.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-foreground">توليد الكود من النظام</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اضغط على زر <strong>اقتران برقم الهاتف</strong> بالأعلى، واختر مفتاح دولتك واكتب رقمك واطلب الرمز.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-foreground">إدخال الرمز المكون من 8 خانات</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اكتب الرمز الظاهر في شاشة هاتفك وسيكتمل الاتصال بدون الحاجة لأي كاميرا.
                    </p>
                  </div>
                </div>
              )}
            
                </Card>
              </div>
              );
            })}


            {/* Smart Diagnostics & Troubleshooting FAQ (حل المشكلات الشائعة) */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3 text-right">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  الأسئلة الشائعة وتشخيص المشاكل (Troubleshooting)
                </h3>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    q: 'ماذا أفعل إذا ظهرت لي رسالة "تعذر ربط الجهاز" على الهاتف؟',
                    a: 'تأكد أولاً من تحديث تطبيق WhatsApp على هاتفك إلى آخر إصدار رسمي، وتأكد أن اتصال الإنترنت بهاتفك مستقر، ثم اضغط على زر "إعادة ضبط نظيفة" في النظام لبدء مقبس جديد.',
                  },
                  {
                    q: 'الكود معلق على "جاري تهيئة المقبس وتوليد الرمز..." ولم يظهر الرمز، ما الحل؟',
                    a: 'اضغط على زر "إعادة ضبط نظيفة للمقبس". سيقوم بحذف أي محاولة سابقة عالقة وإعادة تهيئة المقبس خلال ثانيتين لتوليد رمز QR طازج.',
                  },
                  {
                    q: 'هل إعادة ضبط الجلسة تحذف الرسائل السابقة أو المحادثات المسجلة؟',
                    a: 'كلا تماماً! جميع الرسائل والمحادثات والعملاء والملاحظات محفوظة بأمان في قاعدة البيانات. إعادة الضبط تخص فقط مفاتيح مقبس الاتصال مع تطبيق واتساب.',
                  },
                  {
                    q: 'لماذا تنتهي صلاحية رمز الـ QR بعد 60 ثانية؟',
                    a: 'هذا إجراء أمني رسمي مشدد من شركة WhatsApp لحماية حسابك من السرقة، ويتجدد الرمز تلقائياً بدون أي تدخل منك.',
                  },
                ].map((item, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/80 bg-background overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? null : idx)}
                        className="w-full p-3.5 text-right flex items-center justify-between gap-3 text-xs font-bold text-foreground hover:bg-secondary/40 transition-colors"
                      >
                        <span>{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="p-3.5 pt-0 text-xs text-muted-foreground leading-relaxed text-right border-t border-border/40">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Add Account Modal */}
      {isAddAccountModalOpen && (
        <Modal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          title="إضافة جلسة واتساب جديدة"
          description="تحديد اسم رمزي للحساب لبدء تهيئة جلسة Baileys المستقلة"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddAccountModalOpen(false)}
                disabled={createMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => createMutation.mutate({ sessionName: newSessionName })}
                isLoading={createMutation.isPending}
              >
                إنشاء الجلسة
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            <Input
              label="اسم الحساب / الجلسة"
              required
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="مثال: رقم المبيعات الرسمي"
            />
          </div>
        </Modal>
      )}

      {/* Phone Pairing Code Modal with Country Selector */}
      {selectedSessionForPairing && (
        <Modal
          isOpen={!!selectedSessionForPairing}
          onClose={() => {
            setSelectedSessionForPairing(null);
            setPairingCodeResult(null);
          }}
          title="الاقتران اليدوي برقم الهاتف"
          description="أدخل رقم هاتف واتساب مسبوقاً بمفتاح الدولة لتوليد رمز الاقتران المكون من 8 أحرف"
          footer={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedSessionForPairing(null);
                setPairingCodeResult(null);
              }}
            >
              إغلاق
            </Button>
          }
        >
          {selectedSessionForPairing.status === 'connected' ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right space-y-2.5">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>هذا الحساب مقترن ونشط بالفعل!</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                الحساب الحالي متصل بالفعل ومقترن بالرقم{' '}
                <span className="font-mono text-foreground font-bold" dir="ltr">
                  {selectedSessionForPairing.livePhoneNumber || selectedSessionForPairing.phoneNumber || 'المسجل'}
                </span>
                . إذا كنت ترغب في استبداله برقم هاتف آخر، يرجى أولاً تسجيل الخروج من الجلسة الحالية.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logoutMutation.mutate(selectedSessionForPairing.id);
                    setSelectedSessionForPairing(null);
                  }}
                  leftIcon={<LogOut className="w-3.5 h-3.5 text-destructive" />}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  تسجيل الخروج لربط رقم جديد
                </Button>
              </div>
            </div>
          ) : !pairingCodeResult ? (
            <form onSubmit={handleRequestPairingCode} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  الدولة ومفتاح الاتصال
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COUNTRY_PREFIXES.map((item) => {
                    const isSelected = selectedPrefix === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setSelectedPrefix(item.code)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary shadow-sm font-bold'
                            : 'bg-secondary/40 border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 opacity-70" />
                          <span>{item.country}</span>
                        </span>
                        <span className="font-mono text-[11px]" dir="ltr">+{item.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  رقم الهاتف (بدون مفتاح الدولة وبدون الصفر الأول)
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    required
                    value={pairingPhone}
                    onChange={(e) => setPairingPhone(e.target.value)}
                    placeholder="مثال: 501234567"
                    className="font-mono text-center text-sm tracking-wider dir-ltr"
                    rightIcon={<Phone className="w-4 h-4" />}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  الرقم الكامل سيكون: <span className="font-mono font-bold text-foreground" dir="ltr">+{selectedPrefix}{pairingPhone}</span>
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={pairingLoading}
                className="w-full font-bold"
              >
                طلب رمز الاقتران (8 خانات)
              </Button>
            </form>
          ) : (
            <div className="p-6 rounded-2xl bg-secondary/60 text-center space-y-4 border border-border animate-in zoom-in-95">
              <div className="text-xs font-semibold text-muted-foreground">أدخل هذا الرمز المكون من 8 خانات في هاتفك:</div>
              <div className="flex items-center justify-center gap-2">
                <div className="font-mono text-2xl sm:text-3xl font-black text-primary tracking-[0.2em] select-all bg-card py-3 px-6 rounded-xl border border-border shadow-sm dir-ltr">
                  {pairingCodeResult}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPairingCode(pairingCodeResult)}
                  title="نسخ الكود"
                  className="h-12 w-12 p-0"
                >
                  {copiedCode ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
              <div className="text-[12px] text-muted-foreground leading-relaxed text-right bg-card/60 p-3 rounded-xl border border-border/60 space-y-1">
                <p className="font-bold text-foreground">خطوات الربط على الهاتف:</p>
                <p>1. افتح واتساب على هاتفك &gt; النقاط الثلاث &gt; <strong>الأجهزة المرتبطة</strong>.</p>
                <p>2. اضغط <strong>ربط جهاز</strong> ثم اختر <strong>الربط برقم الهاتف بدلاً من ذلك</strong>.</p>
                <p>3. اكتب الكود الموضح أعلاه وسيتصل حسابك مباشرة بالنظام.</p>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Primary Dispatcher Management Modal */}
      {isDispatcherModalOpen && selectedAccountForDispatcher && (
        <Modal
          isOpen={isDispatcherModalOpen}
          onClose={() => {
            setIsDispatcherModalOpen(false);
            setSelectedAccountForDispatcher(null);
          }}
          title="إدارة الرقم الأساسي الموزع (Primary Dispatcher)"
          description={`تحديد خانة التوزيع للحساب: ${selectedAccountForDispatcher.sessionName || selectedAccountForDispatcher.displayName}`}
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedAccountForDispatcher.isPrimaryDispatcher ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatcherMutation.mutate({
                      id: selectedAccountForDispatcher.id,
                      isPrimary: false,
                    })
                  }
                  isLoading={dispatcherMutation.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                >
                  إلغاء التعيين كموزع
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDispatcherModalOpen(false);
                    setSelectedAccountForDispatcher(null);
                  }}
                  disabled={dispatcherMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    dispatcherMutation.mutate({
                      id: selectedAccountForDispatcher.id,
                      isPrimary: true,
                      slot: dispatcherTargetSlot,
                    })
                  }
                  isLoading={dispatcherMutation.isPending}
                >
                  حفظ وتأكيد التعيين
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-right">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>قواعد تعيين الأرقام الأساسية الموزعة:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-right">
                <li>يسمح النظام بتعيين <strong>رقمين كحد أقصى</strong> لتوزيع الرسائل الواردة وإطلاق المحادثات.</li>
                <li>تصل رسائل العملاء لهذه الأرقام وتوزع فوراً على موظفي المحطات دون الحاجة لربط هواتف الموظفين.</li>
                <li>الخانة الأولى (Slot 1) هي الرقم الأساسي ذو الأولوية الأولى لإطلاق المحادثات واستقبالها.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-foreground">
                اختر خانة التوزيع المخصصة:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((slotNum) => {
                  const existingAccount = accounts.find(
                    (a) => a.isPrimaryDispatcher && a.dispatcherSlot === slotNum && a.id !== selectedAccountForDispatcher.id
                  );
                  const isSelected = dispatcherTargetSlot === slotNum;
                  return (
                    <button
                      key={slotNum}
                      type="button"
                      onClick={() => setDispatcherTargetSlot(slotNum as 1 | 2)}
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm text-foreground">
                          الخانة رقم {slotNum}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {existingAccount ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            مشغولة حالياً بـ: {existingAccount.phoneNumber || existingAccount.sessionName}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            متاحة وجاهزة
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
