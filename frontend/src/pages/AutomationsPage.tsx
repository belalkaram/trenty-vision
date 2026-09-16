import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsService } from '@/services/automations.service';
import { stationsService } from '@/services/stations.service';
import { AutomationRule, AutomationSettings } from '@/types/automations';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCompany } from '@/context/CompanyContext';
import { Bot, Plus, Edit2, Trash2, Zap, Clock, Compass, Check, MessageSquare, Search, Copy } from 'lucide-react';
import { quickRepliesService, QuickReply } from '@/services/quick-replies.service';

export const AutomationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { company } = useCompany();

  const [activeSubTab, setActiveSubTab] = useState<'bots' | 'rules' | 'quick-replies'>('bots');
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<AutomationRule | null>(null);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    keyword: '',
    matchType: 'exact' as 'exact' | 'contains' | 'starts_with',
    replyText: '',
    stationId: '',
    priority: 1,
    isActive: true,
  });

  const {
    data: settings,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['automation-settings'],
    queryFn: () => automationsService.getSettings(),
  });

  const {
    data: rules = [],
    isLoading: isRulesLoading,
    isError: isRulesError,
    error: rulesError,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => automationsService.listRules(),
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationsService.list(),
  });

  // Quick Replies Data & State
  const [isAddQuickReplyModalOpen, setIsAddQuickReplyModalOpen] = useState(false);
  const [deletingQuickReply, setDeletingQuickReply] = useState<QuickReply | null>(null);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [quickReplyForm, setQuickReplyForm] = useState({
    name: '',
    shortcut: '',
    body: '',
  });

  const {
    data: quickRepliesList = [],
    isLoading: isQuickRepliesLoading,
    refetch: refetchQuickReplies,
  } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => quickRepliesService.list(),
  });

  const createQuickReplyMutation = useMutation({
    mutationFn: (payload: { name: string; shortcut: string; body: string }) =>
      quickRepliesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      setIsAddQuickReplyModalOpen(false);
      setQuickReplyForm({ name: '', shortcut: '', body: '' });
      success('تم إنشاء الرد السريع بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.error || err?.message || 'فشل حفظ الرد السريع');
    },
  });

  const deleteQuickReplyMutation = useMutation({
    mutationFn: (id: string) => quickRepliesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      setDeletingQuickReply(null);
      success('تم حذف الرد السريع بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف الرد السريع');
    },
  });

  const filteredQuickReplies = quickRepliesList.filter((qr) => {
    if (!quickReplySearch.trim()) return true;
    const q = quickReplySearch.toLowerCase();
    return (
      qr.name.toLowerCase().includes(q) ||
      qr.shortcut.toLowerCase().includes(q) ||
      qr.body.toLowerCase().includes(q)
    );
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AutomationSettings>) =>
      automationsService.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      success('تم حفظ إعدادات الأتمتة بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حفظ الإعدادات');
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (input: any) => automationsService.createRule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setIsAddRuleModalOpen(false);
      resetRuleForm();
      success('تم إنشاء قاعدة الرد بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إنشاء القاعدة');
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AutomationRule> }) =>
      automationsService.updateRule(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setEditingRule(null);
      resetRuleForm();
      success('تم تحديث القاعدة');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث القاعدة');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => automationsService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setDeletingRule(null);
      success('تم حذف قاعدة الرد');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف القاعدة');
    },
  });

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      keyword: '',
      matchType: 'exact',
      replyText: '',
      stationId: '',
      priority: 1,
      isActive: true,
    });
  };

  const openAddRule = () => {
    resetRuleForm();
    setIsAddRuleModalOpen(true);
  };

  const openEditRule = (rule: AutomationRule) => {
    setRuleForm({
      name: rule.name,
      keyword: rule.keyword,
      matchType: rule.matchType,
      replyText: rule.replyText,
      stationId: rule.stationId || '',
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setEditingRule(rule);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="الأتمتة وقواعد الأعمال"
        subtitle="إدارة روبوتات الرد التلقائي، استراتيجيات التوجيه، والكلمات المفتاحية"
        actions={
          activeSubTab === 'rules' && (
            <Button
              variant="primary"
              size="sm"
              onClick={openAddRule}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              إضافة قاعدة رد
            </Button>
          )
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveSubTab('bots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'bots'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>روبوتات الاستقبال وتوجيه المحادثات</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'rules'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>قواعد الكلمات المفتاحية ({rules.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('quick-replies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'quick-replies'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>الردود السريعة الجاهزة ({quickRepliesList.length})</span>
          </button>
        </div>

        {/* Tab 1: Bots & Routing Settings */}
        {activeSubTab === 'bots' && (
          <div className="space-y-6 max-w-4xl">
            {isSettingsLoading ? (
              <TableSkeleton rows={3} cols={2} />
            ) : isSettingsError ? (
              <ErrorState
                title="تعذر تحميل إعدادات الأتمتة"
                message={(settingsError as any)?.message}
                onRetry={() => refetchSettings()}
              />
            ) : (
              <>
                {/* Greeting Bot Card */}
                <Card className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">رسالة الترحيب التلقائية</h3>
                        <p className="text-[11px] text-muted-foreground">
                          إرسال رد فوري للعميل عند بدء أول محادثة
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.greetingBotEnabled ?? true}
                      onChange={(checked) =>
                        updateSettingsMutation.mutate({ greetingBotEnabled: checked })
                      }
                    />
                  </div>

                  <Textarea
                    label="نص رسالة الترحيب"
                    rows={3}
                    defaultValue={settings?.greetingMessage || (company?.name ? `أهلاً بك في ${company.name}! يسعدنا تواصلك معنا وخدمتك.` : 'أهلاً بك! يسعدنا تواصلك معنا وخدمتك.')}
                    onBlur={(e) => {
                      if (e.target.value !== settings?.greetingMessage) {
                        updateSettingsMutation.mutate({ greetingMessage: e.target.value });
                      }
                    }}
                  />
                </Card>

                {/* Out of Office & Business Hours Card */}
                <Card className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">الرد التلقائي خارج أوقات العمل الرسمية</h3>
                        <p className="text-[11px] text-muted-foreground">
                          تحديد مواعيد العمل وإشعار العملاء تلقائياً عند مراسلتهم خارج هذه المواعيد
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.outOfOfficeEnabled ?? false}
                      onChange={(checked) =>
                        updateSettingsMutation.mutate({ outOfOfficeEnabled: checked })
                      }
                    />
                  </div>

                  {settings?.outOfOfficeEnabled ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>ميزة الرد خارج الدوام <strong>مفعلة</strong>: يتم إرسال الرسالة التلقائية للعملاء فقط عند تواصلهم في غير المواعيد والأيام المحددة أدناه.</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>ميزة الرد خارج الدوام <strong>معطلة حالياً</strong>: لن يتم إرسال أي رسالة رد آلي للعميل خارج أوقات الدوام.</span>
                    </div>
                  )}

                  {/* Business Hours Schedules */}
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        type="time"
                        label="بداية وقت العمل الرسمي"
                        defaultValue={settings?.businessHoursStart || '09:00'}
                        onBlur={(e) => {
                          if (e.target.value !== settings?.businessHoursStart) {
                            updateSettingsMutation.mutate({ businessHoursStart: e.target.value });
                          }
                        }}
                      />
                      <Input
                        type="time"
                        label="نهاية وقت العمل الرسمي"
                        defaultValue={settings?.businessHoursEnd || '18:00'}
                        onBlur={(e) => {
                          if (e.target.value !== settings?.businessHoursEnd) {
                            updateSettingsMutation.mutate({ businessHoursEnd: e.target.value });
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-2">
                        أيام العمل الأسبوعية النشطة
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'السبت', value: 6 },
                          { label: 'الأحد', value: 0 },
                          { label: 'الإثنين', value: 1 },
                          { label: 'الثلاثاء', value: 2 },
                          { label: 'الأربعاء', value: 3 },
                          { label: 'الخميس', value: 4 },
                          { label: 'الجمعة', value: 5 },
                        ].map((d) => {
                          const currentDays = settings?.activeDays || [0, 1, 2, 3, 4, 6];
                          const isSelected = currentDays.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => {
                                const newDays = isSelected
                                  ? currentDays.filter((val: number) => val !== d.value)
                                  : [...currentDays, d.value];
                                updateSettingsMutation.mutate({ activeDays: newDays });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{d.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Textarea
                    label="نص رسالة خارج الدوام التلقائية"
                    rows={3}
                    defaultValue={
                      settings?.outOfOfficeMessage ||
                      'شكراً لتواصلك معنا، نحن حالياً خارج أوقات العمل الرسمية وسنعاود الرد فور بدء الدوام.'
                    }
                    onBlur={(e) => {
                      if (e.target.value !== settings?.outOfOfficeMessage) {
                        updateSettingsMutation.mutate({ outOfOfficeMessage: e.target.value });
                      }
                    }}
                  />
                </Card>

                {/* Routing Strategy Card */}
                <Card className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                    <div className="w-9 h-9 rounded-xl bg-sidebar text-sidebar-primary flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">استراتيجية توزيع المحادثات</h3>
                      <p className="text-[11px] text-muted-foreground">
                        كيفية إسناد المحادثات الجديدة إلى موكلي الخدمة المتصلين
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'round_robin',
                        title: 'توزيع دوري (Round Robin)',
                        desc: 'توزيع المحادثات بالتساوي بالتناوب بين الوكلاء المتواجدين.',
                      },
                      {
                        key: 'least_busy',
                        title: 'الأقل انشغالاً (Least Busy)',
                        desc: 'توجيه العميل إلى الوكيل الذي لديه أقل عدد من المحادثات النشطة.',
                      },
                      {
                        key: 'manual',
                        title: 'إسناد يدوي (Manual)',
                        desc: 'ترك المحادثات في قائمة الانتظار للمشرف ليقوم بإسنادها.',
                      },
                    ].map((st) => {
                      const isSelected = (settings?.routingStrategy || 'round_robin') === st.key;
                      return (
                        <div
                          key={st.key}
                          onClick={() => updateSettingsMutation.mutate({ routingStrategy: st.key as any })}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition space-y-1.5 ${
                            isSelected
                              ? 'bg-primary/10 border-primary shadow-soft'
                              : 'bg-card border-border hover:bg-secondary/40'
                          }`}
                        >
                          <div className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>{st.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{st.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Keyword Rules Table */}
        {activeSubTab === 'rules' && (
          <div className="space-y-4">
            {isRulesLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : isRulesError ? (
              <ErrorState
                title="تعذر جلب قواعد الرد التلقائي"
                message={(rulesError as any)?.message}
                onRetry={() => refetchRules()}
              />
            ) : rules.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Zap className="w-7 h-7 text-muted-foreground" />}
                  title="لا توجد قواعد كلمات مفتاحية"
                  description="أضف كلمات مفتاحية (مثل: السعر، العنوان، ساعات العمل) للرد الآلي الفوري على أسئلة العملاء الشائعة."
                  actionText="إضافة قاعدة رد"
                  actionIcon={<Plus className="w-4 h-4" />}
                  onAction={openAddRule}
                />
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border text-[11px] font-mono text-muted-foreground uppercase">
                        <th className="py-3 px-4 font-semibold">اسم القاعدة</th>
                        <th className="py-3 px-4 font-semibold">الكلمة المفتاحية</th>
                        <th className="py-3 px-4 font-semibold">نوع المطابقة</th>
                        <th className="py-3 px-4 font-semibold">نص الرد التلقائي</th>
                        <th className="py-3 px-4 font-semibold">المحطة</th>
                        <th className="py-3 px-4 font-semibold text-center">الحالة</th>
                        <th className="py-3 px-4 font-semibold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-accent/20 transition">
                          <td className="py-3 px-4 font-bold text-foreground">{rule.name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-primary">
                            {rule.keyword}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {rule.matchType}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                            {rule.replyText}
                          </td>
                          <td className="py-3 px-4">
                            {rule.stationId ? (
                              <Badge variant="primary">{rule.stationId}</Badge>
                            ) : (
                              <span className="text-muted-foreground font-mono">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={rule.isActive ? 'success' : 'secondary'}>
                              {rule.isActive ? 'مفعلة' : 'معطلة'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditRule(rule)}
                                className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingRule(rule)}
                                className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tab 3: Quick Replies */}
        {activeSubTab === 'quick-replies' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>الردود السريعة الجاهزة (Quick Replies)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  قوالب ونصوص جاهزة يستخدمها موظفو الخدمة للرد السريع عبر اختصارات مثل /welcome أو /ترحيب
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث في الردود والاختصارات..."
                    value={quickReplySearch}
                    onChange={(e) => setQuickReplySearch(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl pr-8 pl-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddQuickReplyModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="font-bold text-xs shrink-0 shadow-soft"
                >
                  إضافة رد سريع جديد
                </Button>
              </div>
            </div>

            {isQuickRepliesLoading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : filteredQuickReplies.length === 0 ? (
              <EmptyState
                title="لا توجد ردود سريعة"
                description="لم يتم العثور على ردود سريعة. انقر على 'إضافة رد سريع جديد' لإنشاء ردك الأول."
                action={{
                  label: 'إضافة رد سريع جديد',
                  onClick: () => setIsAddQuickReplyModalOpen(true),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredQuickReplies.map((qr) => (
                  <Card key={qr.id} className="p-4 flex flex-col justify-between hover:border-primary/40 transition group space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-foreground truncate">{qr.name}</span>
                        <Badge variant="primary" className="font-mono text-[10px]" dir="ltr">
                          {qr.shortcut}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {qr.body}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border text-[10px] text-muted-foreground">
                      <span>{new Date(qr.createdAt).toLocaleDateString('ar-EG')}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-rose-500"
                        onClick={() => setDeletingQuickReply(qr)}
                        title="حذف الرد السريع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add / Edit Rule Modal */}
      {(isAddRuleModalOpen || editingRule) && (
        <Modal
          isOpen={isAddRuleModalOpen || !!editingRule}
          onClose={() => {
            setIsAddRuleModalOpen(false);
            setEditingRule(null);
          }}
          title={editingRule ? 'تعديل قاعدة الرد التلقائي' : 'إضافة قاعدة رد تلقائي جديدة'}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddRuleModalOpen(false);
                  setEditingRule(null);
                }}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (editingRule) {
                    updateRuleMutation.mutate({ id: editingRule.id, input: ruleForm });
                  } else {
                    createRuleMutation.mutate(ruleForm);
                  }
                }}
                isLoading={createRuleMutation.isPending || updateRuleMutation.isPending}
              >
                حفظ القاعدة
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            <Input
              label="اسم القاعدة"
              required
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              placeholder="مثال: الاستفسار عن الأسعار"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="الكلمة المفتاحية (Trigger)"
                required
                value={ruleForm.keyword}
                onChange={(e) => setRuleForm({ ...ruleForm, keyword: e.target.value })}
                placeholder="مثال: أسعار، سعر"
              />
              <Select
                label="نوع المطابقة"
                value={ruleForm.matchType}
                onChange={(e) => setRuleForm({ ...ruleForm, matchType: e.target.value as any })}
              >
                <option value="exact">مطابقة تامة (Exact)</option>
                <option value="contains">تحتوي الكلمة (Contains)</option>
                <option value="starts_with">تبدأ بـ (Starts with)</option>
              </Select>
            </div>
            <Textarea
              label="نص الرد التلقائي المرسل للعميل"
              required
              rows={4}
              value={ruleForm.replyText}
              onChange={(e) => setRuleForm({ ...ruleForm, replyText: e.target.value })}
              placeholder="اكتب الرد التلقائي الذي سيتم إرساله فور استلام الكلمة المفتاحية..."
            />
            <Select
              label="توجيه تلقائي إلى محطة (اختياري)"
              value={ruleForm.stationId}
              onChange={(e) => setRuleForm({ ...ruleForm, stationId: e.target.value })}
            >
              <option value="">بدون توجيه</option>
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </Select>
          </div>
        </Modal>
      )}

      {/* Delete Rule Dialog */}
      {deletingRule && (
        <Modal
          isOpen={!!deletingRule}
          onClose={() => setDeletingRule(null)}
          title="تأكيد حذف قاعدة الرد"
          maxWidth="sm"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setDeletingRule(null)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteRuleMutation.mutate(deletingRule.id)}
                isLoading={deleteRuleMutation.isPending}
              >
                تأكيد الحذف
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            هل أنت متأكد من رغبتك في حذف قاعدة الرد للكلمة المفتاحية{' '}
            <strong className="text-foreground">{deletingRule.keyword}</strong>؟
          </p>
        </Modal>
      )}

      {/* Add Quick Reply Modal */}
      {isAddQuickReplyModalOpen && (
        <Modal
          isOpen={isAddQuickReplyModalOpen}
          onClose={() => {
            setIsAddQuickReplyModalOpen(false);
            setQuickReplyForm({ name: '', shortcut: '', body: '' });
          }}
          title="إضافة رد سريع جديد"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddQuickReplyModalOpen(false);
                  setQuickReplyForm({ name: '', shortcut: '', body: '' });
                }}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!quickReplyForm.name.trim()) {
                    toastError('يرجى إدخال اسم الرد');
                    return;
                  }
                  if (!quickReplyForm.shortcut.trim()) {
                    toastError('يرجى إدخال اختصار الاستدعاء (مثل: /welcome)');
                    return;
                  }
                  if (!quickReplyForm.body.trim()) {
                    toastError('يرجى إدخال نص الرد السريع');
                    return;
                  }
                  createQuickReplyMutation.mutate({
                    name: quickReplyForm.name.trim(),
                    shortcut: quickReplyForm.shortcut.trim(),
                    body: quickReplyForm.body.trim(),
                  });
                }}
                isLoading={createQuickReplyMutation.isPending}
              >
                حفظ الرد السريع
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            <Input
              label="اسم أو عنوان الرد"
              required
              value={quickReplyForm.name}
              onChange={(e) => setQuickReplyForm({ ...quickReplyForm, name: e.target.value })}
              placeholder="مثال: ترحيب بالعميل الجديد، مواعيد العمل"
            />
            <Input
              label="اختصار الاستدعاء (Shortcut)"
              required
              dir="ltr"
              value={quickReplyForm.shortcut}
              onChange={(e) => setQuickReplyForm({ ...quickReplyForm, shortcut: e.target.value })}
              placeholder="مثال: /welcome أو /ترحيب"
            />
            <Textarea
              label="نص ومحتوى الرد السريع المرسل"
              required
              rows={4}
              value={quickReplyForm.body}
              onChange={(e) => setQuickReplyForm({ ...quickReplyForm, body: e.target.value })}
              placeholder="اكتب نص الرسالة النموذجي الذي سيتم إدراجه في المحادثة..."
            />
          </div>
        </Modal>
      )}

      {/* Delete Quick Reply Dialog */}
      {deletingQuickReply && (
        <Modal
          isOpen={!!deletingQuickReply}
          onClose={() => setDeletingQuickReply(null)}
          title="تأكيد حذف الرد السريع"
          maxWidth="sm"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setDeletingQuickReply(null)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteQuickReplyMutation.mutate(deletingQuickReply.id)}
                isLoading={deleteQuickReplyMutation.isPending}
              >
                تأكيد الحذف
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            هل أنت متأكد من رغبتك في حذف الرد السريع{' '}
            <strong className="text-foreground">{deletingQuickReply.name}</strong> ({deletingQuickReply.shortcut})؟
          </p>
        </Modal>
      )}
    </div>
  );
};
