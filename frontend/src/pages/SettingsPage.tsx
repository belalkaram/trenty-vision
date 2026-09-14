import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settings.service';
import { authService } from '@/services/auth.service';
import { SystemSettings, BusinessHoursSchedule } from '@/types/settings';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  Settings as SettingsIcon,
  Clock,
  Save,
  Globe,
  Shield,
  KeyRound,
  Sparkles,
  Bot,
  UserCheck,
  Building2,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
} from 'lucide-react';

const dayNames: Record<keyof BusinessHoursSchedule, string> = {
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'account'>('general');
  const [showApiKey, setShowApiKey] = useState(false);

  const [formState, setFormState] = useState<SystemSettings>({
    systemName: 'Trenty Vision Health Care CRM',
    timezone: 'Asia/Kuwait',
    defaultLanguage: 'ar',
    autoAssignmentEnabled: true,
    routingStrategy: 'round_robin',
    maxConcurrentChatsPerAgent: 10,
    businessHours: {
      sunday: { enabled: true, start: '09:00', end: '18:00' },
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: false, start: '09:00', end: '18:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
    },
    aiEnabled: false,
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    aiSystemPrompt: 'أنت المساعد الذكي الرسمي لترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية. ساعد فريق خدمة العملاء في صياغة ردود راقية ودقيقة على أسئلة المرضى والعملاء بأعلى درجات المهنية.',
    aiAutoSuggestReplies: true,
    aiAutoSummarize: true,
    landingSyncEnabled: true,
    landingSyncUrl: 'https://trintyvision.com/landing/api/submit.php',
  });

  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  const handleBulkSyncLanding = async () => {
    try {
      setIsBulkSyncing(true);
      const res = await settingsService.syncAllLanding();
      success(`تم فحص ومزامنة الأرقام بنجاح: تم إرسال ${res.syncedCount || 0} من أصل ${res.totalEvaluated || 0}`);
    } catch (err: any) {
      toastError(err?.message || 'فشلت عملية المزامنة الجماعية');
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const {
    data: remoteSettings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsService.get(),
  });

  useEffect(() => {
    if (remoteSettings) {
      setFormState((prev) => ({
        ...prev,
        ...remoteSettings,
        businessHours: {
          ...prev.businessHours,
          ...(remoteSettings.businessHours || {}),
        },
      }));
    }
  }, [remoteSettings]);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: () => authService.getProfile(),
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const saveMutation = useMutation({
    mutationFn: (settings: Partial<SystemSettings>) => settingsService.update(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['automation-settings'] });
      success('تم حفظ إعدادات النظام وقاعدة البيانات بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حفظ الإعدادات');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword?: string }) =>
      authService.changePassword(data.currentPassword, data.newPassword, data.confirmPassword),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('تم تغيير كلمة المرور بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تغيير كلمة المرور. يرجى التأكد من كلمة المرور الحالية.');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formState);
  };

  const updateScheduleDay = (day: keyof BusinessHoursSchedule, updates: any) => {
    setFormState({
      ...formState,
      businessHours: {
        ...formState.businessHours,
        [day]: {
          ...formState.businessHours[day],
          ...updates,
        },
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="إعدادات المنظومة والحساب"
        subtitle="معايير التشغيل، نماذج الذكاء الاصطناعي، وأمان الحساب"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={saveMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            حفظ التغييرات
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'general'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>إعدادات الموقع والمنظومة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>الذكاء الاصطناعي (AI)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'account'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>إعدادات الحساب والأمان</span>
          </button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} cols={2} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل إعدادات المنظومة"
            message={(error as any)?.message}
            onRetry={() => refetch()}
          />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Tab 1: General & Working Hours */}
            {activeTab === 'general' && (
              <>
                <Card className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                    <Globe className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">معايير النظام والموقع</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="اسم المنظومة"
                      value={formState.systemName}
                      onChange={(e) => setFormState({ ...formState, systemName: e.target.value })}
                    />
                    <Select
                      label="المنطقة الزمنية (Timezone)"
                      value={formState.timezone}
                      onChange={(e) => setFormState({ ...formState, timezone: e.target.value })}
                    >
                      <option value="Asia/Kuwait">الكويت (GMT+3) - Asia/Kuwait</option>
                      <option value="Asia/Riyadh">الرياض (GMT+3) - Asia/Riyadh</option>
                      <option value="Asia/Dubai">دبي (GMT+4) - Asia/Dubai</option>
                      <option value="Africa/Cairo">القاهرة (GMT+2) - Africa/Cairo</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Input
                      label="الحد الأقصى للمحادثات لكل موظف"
                      type="number"
                      min="1"
                      max="50"
                      value={formState.maxConcurrentChatsPerAgent}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          maxConcurrentChatsPerAgent: parseInt(e.target.value, 10) || 10,
                        })
                      }
                    />
                    <Select
                      label="استراتيجية التوزيع الافتراضية"
                      value={formState.routingStrategy}
                      onChange={(e) =>
                        setFormState({ ...formState, routingStrategy: e.target.value as any })
                      }
                    >
                      <option value="round_robin">توزيع دوري (Round Robin)</option>
                      <option value="least_busy">الأقل انشغالاً (Least Busy)</option>
                      <option value="manual">يدوي (Manual)</option>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Switch
                      label="تفعيل التوزيع التلقائي للمحادثات"
                      description="إسناد المحادثة الجديدة مباشرة لموظف متصل حسب الاستراتيجية المحددة"
                      checked={formState.autoAssignmentEnabled}
                      onChange={(checked) =>
                        setFormState({ ...formState, autoAssignmentEnabled: checked })
                      }
                    />
                  </div>
                </Card>

                {/* Landing Page Sync Card */}
                <Card className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <ExternalLink className="w-4 h-4 text-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-foreground">مزامنة صفحة الهبوط (Landing Page Sync)</h3>
                        <p className="text-[11px] text-muted-foreground">
                          تسجيل الأرقام الواردة على واتساب الأدمن تلقائياً في صفحة الهبوط
                        </p>
                      </div>
                    </div>
                    <Badge variant={formState.landingSyncEnabled !== false ? 'success' : 'secondary'}>
                      {formState.landingSyncEnabled !== false ? 'المزامنة مُفعّلة' : 'المزامنة متوقفة'}
                    </Badge>
                  </div>

                  <div className="pt-1">
                    <Switch
                      label="تفعيل إرسال الأرقام لصفحة الهبوط"
                      description="عند التفعيل، يتم إرسال أي رقم يتواصل مع واتساب الأدمن تلقائياً لصفحة الهبوط (trintyvision.com/landing) وتخزين الاسم والرقم فقط"
                      checked={formState.landingSyncEnabled !== false}
                      onChange={(checked) =>
                        setFormState({ ...formState, landingSyncEnabled: checked })
                      }
                    />
                  </div>

                  <div className="pt-2">
                    <Input
                      label="رابط واجهة تسجيل صفحة الهبوط (API Endpoint)"
                      value={formState.landingSyncUrl || 'https://trintyvision.com/landing/api/submit.php'}
                      onChange={(e) => setFormState({ ...formState, landingSyncUrl: e.target.value })}
                      dir="ltr"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                    <p className="text-xs text-muted-foreground">
                      مزامنة كافة الأرقام المسجلة مسبقاً في قاعدة بيانات الـ CRM دفعة واحدة
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      isLoading={isBulkSyncing}
                      onClick={handleBulkSyncLanding}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      مزامنة جميع الأرقام الآن
                    </Button>
                  </div>
                </Card>

                {/* Working Hours Schedule */}
                <Card className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">جدول أوقات وساعات العمل اليومية</h3>
                      <p className="text-[11px] text-muted-foreground">
                        تحديد ساعات العمل الرسمية لكل يوم من أيام الأسبوع
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {(Object.keys(formState.businessHours) as (keyof BusinessHoursSchedule)[]).map(
                      (day) => {
                        const schedule = formState.businessHours[day];
                        return (
                          <div
                            key={day}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 w-28">
                              <Switch
                                checked={schedule?.enabled ?? false}
                                onChange={(checked) => updateScheduleDay(day, { enabled: checked })}
                              />
                              <span
                                className={`font-semibold ${
                                  schedule?.enabled ? 'text-foreground' : 'text-muted-foreground line-through'
                                }`}
                              >
                                {dayNames[day]}
                              </span>
                            </div>

                            {schedule?.enabled ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={schedule.start}
                                  onChange={(e) => updateScheduleDay(day, { start: e.target.value })}
                                  className="px-2 py-1 rounded-lg bg-background border border-border text-xs font-mono"
                                />
                                <span className="text-muted-foreground">إلى</span>
                                <input
                                  type="time"
                                  value={schedule.end}
                                  onChange={(e) => updateScheduleDay(day, { end: e.target.value })}
                                  className="px-2 py-1 rounded-lg bg-background border border-border text-xs font-mono"
                                />
                              </div>
                            ) : (
                              <span className="text-muted-foreground font-mono text-[11px]">
                                عطلة رسمية (مغلق)
                              </span>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* Tab 2: AI Settings */}
            {activeTab === 'ai' && (
              <Card className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">محرك الذكاء الاصطناعي (AI Assistant)</h3>
                      <p className="text-[11px] text-muted-foreground">
                        تكامل نماذج الذكاء الاصطناعي التوليدي لمساعدة فريق الرعاية واقتراح الردود
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formState.aiEnabled ?? false}
                    onChange={(checked) => setFormState({ ...formState, aiEnabled: checked })}
                  />
                </div>

                {formState.aiEnabled ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>مساعد الذكاء الاصطناعي مفعّل وجاهز لمساعدة الموظفين في صياغة الردود وتلخيص المحادثات.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-secondary border border-border rounded-xl text-xs text-muted-foreground">
                    مساعد الذكاء الاصطناعي معطل حالياً. قم بتفعيله للبدء في استخدام الاقتراحات الذكية.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Select
                    label="مزود الخدمة (AI Provider)"
                    value={formState.aiProvider || 'openai'}
                    onChange={(e) => setFormState({ ...formState, aiProvider: e.target.value as any })}
                  >
                    <option value="openai">OpenAI (ChatGPT / GPT-4o)</option>
                    <option value="gemini">Google Gemini (Gemini 1.5 Flash / Pro)</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                    <option value="custom">مخصص (Custom Endpoint)</option>
                  </Select>

                  <Input
                    label="اسم النموذج (Model Name)"
                    value={formState.aiModel || 'gpt-4o-mini'}
                    onChange={(e) => setFormState({ ...formState, aiModel: e.target.value })}
                    placeholder="مثال: gpt-4o-mini أو gemini-1.5-flash"
                  />
                </div>

                <div className="relative">
                  <Input
                    label="مفتاح الواجهة البرمجية (API Key)"
                    type={showApiKey ? 'text' : 'password'}
                    value={formState.aiApiKey || ''}
                    onChange={(e) => setFormState({ ...formState, aiApiKey: e.target.value })}
                    placeholder="sk-..."
                    dir="ltr"
                    className="font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-3 top-8 text-muted-foreground hover:text-foreground transition text-xs"
                    title={showApiKey ? 'إخفاء' : 'إظهار'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Textarea
                  label="توجيهات النظام للذكاء الاصطناعي (System Prompt)"
                  rows={4}
                  value={formState.aiSystemPrompt || ''}
                  onChange={(e) => setFormState({ ...formState, aiSystemPrompt: e.target.value })}
                  placeholder="اكتب التوجيهات الطبية والخدمية الخاصة بترينتي فيجن..."
                />

                <div className="space-y-3 pt-2 border-t border-border">
                  <Switch
                    label="اقتراح الردود الذكية للموظفين"
                    description="عرض مقترحات ردود سريعة ومخصصة للموظف داخل المحادثة بناءً على سياق رسائل العميل"
                    checked={formState.aiAutoSuggestReplies ?? true}
                    onChange={(checked) =>
                      setFormState({ ...formState, aiAutoSuggestReplies: checked })
                    }
                  />

                  <Switch
                    label="التلخيص التلقائي للمحادثات الطويلة"
                    description="توليد ملخص سريع للمحادثة عند إغلاقها أو تحويلها بين المحطات والموظفين"
                    checked={formState.aiAutoSummarize ?? true}
                    onChange={(checked) =>
                      setFormState({ ...formState, aiAutoSummarize: checked })
                    }
                  />
                </div>
              </Card>
            )}

            {/* Tab 3: Account & Security Settings */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Account Profile Card */}
                <Card className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">بيانات الحساب الحالي</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground block">الاسم:</span>
                      <span className="text-xs font-bold text-foreground block">{currentUser?.fullName || (currentUser as any)?.name || 'مدير النظام'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground block">البريد الإلكتروني:</span>
                      <span className="text-xs font-bold text-foreground font-mono block" dir="ltr">{currentUser?.email || 'admin@trenty.com'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground block">الدور الوظيفي:</span>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
                        {(currentUser as any)?.role?.name || (currentUser as any)?.role || 'مدير النظام (Administrator)'}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Password Change Card */}
                <Card className="space-y-4 border-primary/30">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">تغيير كلمة مرور الحساب</h3>
                      <p className="text-[11px] text-muted-foreground">
                        تحديث كلمة المرور لحسابك ({currentUser?.email || 'admin@trenty.com'})
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="كلمة المرور الحالية"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                    <Input
                      label="كلمة المرور الجديدة"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                    <Input
                      label="تأكيد كلمة المرور الجديدة"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={
                        !passwordForm.currentPassword ||
                        !passwordForm.newPassword ||
                        passwordForm.newPassword.length < 6 ||
                        passwordForm.newPassword !== passwordForm.confirmPassword
                      }
                      isLoading={changePasswordMutation.isPending}
                      onClick={() => changePasswordMutation.mutate(passwordForm)}
                      leftIcon={<KeyRound className="w-4 h-4" />}
                    >
                      تحديث كلمة المرور الآن
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
};
