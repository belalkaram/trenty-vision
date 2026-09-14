import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Trash2,
  Edit3,
  Plus,
  Search,
  MessageSquare,
  Phone,
  User,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Check,
  ListFilter,
  Sun,
  CalendarDays,
} from 'lucide-react';
import { remindersService } from '@/services/reminders.service';
import { employeesService } from '@/services/employees.service';
import { Reminder, CreateReminderInput, UpdateReminderInput } from '@/types/reminders';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export const RemindersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isAdmin =
    user?.roleName === 'adminstrator' ||
    user?.role === 'adminstrator' ||
    user?.roleName === 'admin' ||
    user?.role === 'admin';

  // Filters & Search State
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAllEmployees, setViewAllEmployees] = useState(isAdmin);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);

  // Form State for Create / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDueAt, setFormDueAt] = useState('');
  const [formAssignedUserId, setFormAssignedUserId] = useState('');

  // 1. Fetch Reminders
  const {
    data: reminders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['reminders', { all: viewAllEmployees }],
    queryFn: () => remindersService.list({ all: viewAllEmployees }),
    refetchInterval: 10000,
  });

  // 2. Fetch Employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.list(),
  });

  // Helper to set quick preset date
  const setQuickTime = (preset: '1h' | 'tomorrow' | '2d' | '1w') => {
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
    setFormDueAt(localIso);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormTitle('');
    setFormNote('');
    setFormAssignedUserId(user?.id || '');
    setQuickTime('tomorrow');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormTitle(reminder.title);
    setFormNote(reminder.note || '');
    setFormAssignedUserId(reminder.assignedUserId || user?.id || '');

    const d = new Date(reminder.dueAt);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormDueAt(localIso);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateReminderInput) => remindersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setIsCreateModalOpen(false);
      success('تم جدولة التذكير بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إنشاء التذكير');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReminderInput }) =>
      remindersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setEditingReminder(null);
      success('تم حفظ تعديلات التذكير');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حفظ التعديلات');
    },
  });

  // Toggle Complete Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'completed' }) =>
      remindersService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      success(variables.status === 'completed' ? 'تم تمييز التذكير كمكتمل' : 'تمت إعادة فتح التذكير');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث حالة التذكير');
    },
  });

  // Snooze Quick Mutation
  const snoozeMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => {
      const d = new Date();
      d.setHours(d.getHours() + hours);
      return remindersService.update(id, {
        dueAt: d.toISOString(),
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      success('تم تأجيل موعد التذكير بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تأجيل التذكير');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remindersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setDeletingReminder(null);
      success('تم حذف التذكير بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف التذكير');
    },
  });

  // Submit handler for create
  const handleSaveCreate = () => {
    if (!formTitle.trim() || !formDueAt) {
      toastError('يرجى كتابة عنوان التذكير وتحديد موعده');
      return;
    }
    createMutation.mutate({
      title: formTitle.trim(),
      note: formNote.trim() || undefined,
      dueAt: new Date(formDueAt).toISOString(),
      assignedUserId: formAssignedUserId || undefined,
    });
  };

  // Submit handler for edit
  const handleSaveEdit = () => {
    if (!editingReminder) return;
    if (!formTitle.trim() || !formDueAt) {
      toastError('يرجى كتابة عنوان التذكير وتحديد موعده');
      return;
    }
    updateMutation.mutate({
      id: editingReminder.id,
      data: {
        title: formTitle.trim(),
        note: formNote.trim() || null,
        dueAt: new Date(formDueAt).toISOString(),
        assignedUserId: formAssignedUserId || undefined,
      },
    });
  };

  // KPI Calculations & Categorization
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const categorized = useMemo(() => {
    const todayList: Reminder[] = [];
    const upcomingList: Reminder[] = [];
    const overdueList: Reminder[] = [];
    const completedList: Reminder[] = [];

    reminders.forEach((r) => {
      if (r.status === 'completed') {
        completedList.push(r);
        return;
      }
      const due = new Date(r.dueAt);
      if (due < now) {
        overdueList.push(r);
      } else if (due <= todayEnd) {
        todayList.push(r);
      } else {
        upcomingList.push(r);
      }
    });

    return {
      today: todayList,
      upcoming: upcomingList,
      overdue: overdueList,
      completed: completedList,
      all: reminders,
    };
  }, [reminders, now, todayEnd]);

  // Filtered List based on tab and search
  const displayedReminders = useMemo(() => {
    let list: Reminder[] = [];
    if (activeTab === 'all') list = reminders;
    else if (activeTab === 'today') list = categorized.today;
    else if (activeTab === 'upcoming') list = categorized.upcoming;
    else if (activeTab === 'overdue') list = categorized.overdue;
    else if (activeTab === 'completed') list = categorized.completed;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q)) ||
        (r.contactName && r.contactName.toLowerCase().includes(q)) ||
        (r.contactPhone && r.contactPhone.includes(q)) ||
        (r.assignedUserName && r.assignedUserName.toLowerCase().includes(q))
      );
    });
  }, [activeTab, reminders, categorized, searchQuery]);

  // Helper for formatting due date
  const formatDueDisplay = (dueStr: string, status: string) => {
    const due = new Date(dueStr);
    const diffMs = due.getTime() - Date.now();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    const dateFormatted = due.toLocaleDateString('ar-EG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = due.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (status === 'completed') {
      return { text: `اكتمل • ${dateFormatted}`, badgeVariant: 'success' as const };
    }

    if (diffMs < 0) {
      const hoursAgo = Math.abs(diffHours);
      const text =
        hoursAgo === 0
          ? 'متأخر منذ دقائق'
          : hoursAgo < 24
          ? `متأخر منذ ${hoursAgo} ساعة`
          : `متأخر (${dateFormatted})`;
      return { text, badgeVariant: 'error' as const };
    }

    if (diffHours <= 24) {
      return { text: `اليوم ${timeFormatted}`, badgeVariant: 'warning' as const };
    }

    return { text: `${dateFormatted} - ${timeFormatted}`, badgeVariant: 'neutral' as const };
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-background text-foreground">
      {/* Header */}
      <Header
        title="التذكيرات والمتابعات الذكية"
        subtitle="إدارة وتتبع مواعيد المتابعة مع العملاء والمهام المجدولة الفورية"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isRefetching}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
            >
              تحديث
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              تذكير جديد
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setActiveTab('today')}
            className={`cursor-pointer transition-all rounded-2xl p-4 border ${
              activeTab === 'today'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                : 'bg-card border-border hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">تذكيرات اليوم</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-500">
                {categorized.today.length}
              </span>
              <span className="text-[11px] text-muted-foreground">مستحق اليوم</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('overdue')}
            className={`cursor-pointer transition-all rounded-2xl p-4 border ${
              activeTab === 'overdue'
                ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                : 'bg-card border-border hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">متأخرة عن موعدها</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-500">
                {categorized.overdue.length}
              </span>
              <span className="text-[11px] text-muted-foreground">تتطلب إجراء فوري</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('upcoming')}
            className={`cursor-pointer transition-all rounded-2xl p-4 border ${
              activeTab === 'upcoming'
                ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                : 'bg-card border-border hover:border-blue-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">قادمة لاحقاً</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-blue-500">
                {categorized.upcoming.length}
              </span>
              <span className="text-[11px] text-muted-foreground">خلال الأيام القادمة</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('completed')}
            className={`cursor-pointer transition-all rounded-2xl p-4 border ${
              activeTab === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                : 'bg-card border-border hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">المكتملة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-500">
                {categorized.completed.length}
              </span>
              <span className="text-[11px] text-muted-foreground">تمت بنجاح</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-soft">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              الكل ({reminders.length})
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'today'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              اليوم
              {categorized.today.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                  {categorized.today.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'overdue'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              متأخرة
              {categorized.overdue.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                  {categorized.overdue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 ${
                activeTab === 'upcoming'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              قادمة ({categorized.upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 ${
                activeTab === 'completed'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              مكتملة ({categorized.completed.length})
            </button>
          </div>

          {/* Search & Role Scope */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="بحث في التذكيرات أو العملاء..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setViewAllEmployees((prev) => !prev)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition flex items-center gap-1.5 shrink-0 ${
                  viewAllEmployees
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
                title="التبديل بين تذكيراتي وتذكيرات فريق العمل كاملاً"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>{viewAllEmployees ? 'كل الفريق' : 'تذكيراتي'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Reminders List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">جاري تحميل سجل التذكيرات والمتابعات...</p>
          </div>
        ) : displayedReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-dashed border-border p-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">لا توجد أي تذكيرات مطابقة</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? 'لم يتم العثور على تذكيرات تطابق عبارة البحث الحالية.'
                : 'رائع! لا توجد مواعيد متابعة معلقة في هذا القسم حالياً.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
              className="mt-4"
            >
              جدولة تذكير جديد
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedReminders.map((reminder) => {
              const dueInfo = formatDueDisplay(reminder.dueAt, reminder.status);
              const isDone = reminder.status === 'completed';

              return (
                <div
                  key={reminder.id}
                  className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-card/50 border-border/50 opacity-60'
                      : reminder.status === 'overdue' || dueInfo.badgeVariant === 'error'
                      ? 'bg-rose-500/[0.03] border-rose-500/30 hover:border-rose-500/50 shadow-sm'
                      : 'bg-card border-border hover:border-border/80 shadow-soft'
                  }`}
                >
                  {/* Left Side: Checkbox + Title + Meta */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Toggle Complete Button */}
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: reminder.id,
                          status: isDone ? 'pending' : 'completed',
                        })
                      }
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-muted-foreground/40 hover:border-primary text-transparent hover:text-primary/40'
                      }`}
                      title={isDone ? 'إعادة فتح التذكير' : 'تمييز كمكتمل'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-bold text-foreground leading-snug ${
                            isDone ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {reminder.title}
                        </h4>

                        {/* Due Badge */}
                        <Badge
                          variant={
                            dueInfo.badgeVariant === 'error'
                              ? 'destructive'
                              : dueInfo.badgeVariant === 'neutral'
                              ? 'secondary'
                              : (dueInfo.badgeVariant as any)
                          }
                          size="sm"
                        >
                          <Clock className="w-3 h-3 ml-1" />
                          {dueInfo.text}
                        </Badge>

                        {/* Assigned Employee */}
                        {reminder.assignedUserName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-secondary text-secondary-foreground border border-border font-medium">
                            <User className="w-2.5 h-2.5 opacity-60" />
                            {reminder.assignedUserName}
                          </span>
                        )}
                      </div>

                      {/* Note snippet if present */}
                      {reminder.note && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {reminder.note}
                        </p>
                      )}

                      {/* Client / Conversation Link */}
                      {(reminder.contactName || reminder.contactPhone || reminder.conversationId) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                          {reminder.contactName && (
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <User className="w-3 h-3 text-primary" />
                              {reminder.contactName}
                            </span>
                          )}
                          {reminder.contactPhone && (
                            <span className="font-mono dir-ltr flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 opacity-60" />
                              {reminder.contactPhone}
                            </span>
                          )}
                          {reminder.conversationId && (
                            <button
                              onClick={() => navigate(`/inbox`)}
                              className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>فتح المحادثة المباشرة</span>
                              <ChevronRight className="w-3 h-3 rotate-180" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    {/* Snooze Options (Only for pending) */}
                    {!isDone && (
                      <>
                        <button
                          onClick={() => snoozeMutation.mutate({ id: reminder.id, hours: 1 })}
                          className="px-2 py-1 text-[11px] font-medium rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition"
                          title="تأجيل لمدة ساعة واحدة"
                        >
                          +1س
                        </button>
                        <button
                          onClick={() => snoozeMutation.mutate({ id: reminder.id, hours: 24 })}
                          className="px-2 py-1 text-[11px] font-medium rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition"
                          title="تأجيل ليوم غد"
                        >
                          +1يوم
                        </button>
                      </>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(reminder)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
                      title="تعديل التذكير"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeletingReminder(reminder)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                      title="حذف التذكير"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Reminder Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="جدولة تذكير أو موعد متابعة جديد"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCreate}
                isLoading={createMutation.isPending}
                leftIcon={<Bell className="w-3.5 h-3.5" />}
              >
                تأكيد وجدولة
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="عنوان التذكير"
              placeholder="مثال: متابعة تأكيد حجز الموعد مع العميل"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تحديد موعد سريع
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickTime('1h')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>بعد ساعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('tomorrow')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>غداً 9:00 ص</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('2d')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>بعد يومين</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('1w')}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                  <span>بعد أسبوع</span>
                </button>
              </div>
            </div>

            <Input
              label="تاريخ ووقت التنبيه الدقيق"
              type="datetime-local"
              value={formDueAt}
              onChange={(e) => setFormDueAt(e.target.value)}
              required
            />

            <Select
              label="الموظف المسؤول عن المتابعة"
              value={formAssignedUserId}
              onChange={(e) => setFormAssignedUserId(e.target.value)}
            >
              <option value="">بدون تعيين محدد (عام لجميع الموظفين)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={(emp as any).userId || emp.id}>
                  {emp.fullName} ({emp.role === 'adminstrator' ? 'مدير' : 'موظف'})
                </option>
              ))}
            </Select>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                ملاحظات وتفاصيل إضافية (اختياري)
              </label>
              <textarea
                rows={3}
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                placeholder="تفاصيل المتابعة، طلبات العميل، أو ملاحظات خاصة للموظف..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <Modal
          isOpen={!!editingReminder}
          onClose={() => setEditingReminder(null)}
          title="تعديل موعد وبيانات التذكير"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setEditingReminder(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={updateMutation.isPending}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                حفظ التعديلات
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="عنوان التذكير"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />

            <Input
              label="تاريخ ووقت التنبيه"
              type="datetime-local"
              value={formDueAt}
              onChange={(e) => setFormDueAt(e.target.value)}
              required
            />

            <Select
              label="الموظف المسؤول"
              value={formAssignedUserId}
              onChange={(e) => setFormAssignedUserId(e.target.value)}
            >
              <option value="">بدون تعيين محدد</option>
              {employees.map((emp) => (
                <option key={emp.id} value={(emp as any).userId || emp.id}>
                  {emp.fullName} ({emp.role === 'adminstrator' ? 'مدير' : 'موظف'})
                </option>
              ))}
            </Select>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">الملاحظات</label>
              <textarea
                rows={3}
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReminder && (
        <Modal
          isOpen={!!deletingReminder}
          onClose={() => setDeletingReminder(null)}
          title="تأكيد حذف التذكير"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setDeletingReminder(null)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deletingReminder.id)}
                isLoading={deleteMutation.isPending}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                تأكيد الحذف
              </Button>
            </>
          }
        >
          <p className="text-sm text-foreground">
            هل أنت متأكد من رغبتك في حذف هذا التذكير:{' '}
            <span className="font-bold text-foreground">"{deletingReminder.title}"</span>؟
          </p>
          <p className="text-xs text-muted-foreground mt-2">لا يمكن التراجع عن هذه العملية بعد الحذف.</p>
        </Modal>
      )}
    </div>
  );
};
