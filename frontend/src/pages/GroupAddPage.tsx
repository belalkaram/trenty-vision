import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import {
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Smartphone,
  Send,
  AlertCircle,
  Filter,
  PlusCircle,
  PhoneCall,
  Radio,
  Zap,
  Sparkles,
} from 'lucide-react';

interface ExtractedContact {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  groupJid: string;
  groupName: string | null;
  isAdmin: boolean;
  addedToTarget: boolean;
  addError?: string | null;
  extractedAt: string;
}

interface GroupJob {
  id: string;
  type: string;
  targetGroupJid: string | null;
  targetGroupName: string | null;
  status: string;
  totalContacts: number;
  processedContacts: number;
  failedContacts: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt: string | null;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});

export const GroupAddPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilterSearch, setGroupFilterSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetGroupJid, setTargetGroupJid] = useState('');
  const [targetGroupNameInput, setTargetGroupNameInput] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  // Direct Add by Phone Numbers State
  const [isDirectAddModalOpen, setIsDirectAddModalOpen] = useState(false);
  const [directPhoneNumbersInput, setDirectPhoneNumbersInput] = useState('');
  const [directTargetGroupJid, setDirectTargetGroupJid] = useState('');
  const [directTargetGroupName, setDirectTargetGroupName] = useState('');

  // Fetch available WhatsApp groups (Auto-Discovery)
  const {
    data: groupsResponse,
    isLoading: isGroupsLoading,
    isFetching: isGroupsFetching,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['group_manager_groups'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/groups', {
        headers: authHeaders(),
      });
      if (!res.ok) return { data: [], message: '', whatsappConnected: false };
      return await res.json();
    },
    refetchInterval: 15000,
  });

  const availableGroups = (Array.isArray(groupsResponse?.data) ? groupsResponse.data : []) as Array<{
    id: string;
    subject: string;
    size?: number;
    desc?: string;
  }>;
  const isWhatsappConnected = groupsResponse?.whatsappConnected !== false;
  const groupsStatusMessage = groupsResponse?.message || '';

  const filteredDiscoveredGroups = availableGroups.filter((g) => {
    if (!groupFilterSearch.trim()) return true;
    const q = groupFilterSearch.toLowerCase();
    return g.subject?.toLowerCase().includes(q) || g.id?.toLowerCase().includes(q);
  });

  // Real-time parsing of typed/pasted phone numbers
  const parsedDirectNumbers = useMemo(() => {
    if (!directPhoneNumbersInput.trim()) return [];
    const lines = directPhoneNumbersInput.split(/[\n,;]+/);
    const validSet = new Set<string>();
    for (const raw of lines) {
      const cleaned = raw.replace(/[^0-9]/g, '');
      if (cleaned.length >= 7 && cleaned.length <= 16) {
        validSet.add(cleaned);
      }
    }
    return Array.from(validSet);
  }, [directPhoneNumbersInput]);

  // Fetch extracted contacts (available to add)
  const { data: contacts = [], isLoading: isContactsLoading } = useQuery({
    queryKey: ['group_contacts_for_add'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/contacts?limit=200', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      return (data.data || []) as ExtractedContact[];
    },
  });

  // Fetch add jobs
  const { data: addJobs = [] } = useQuery({
    queryKey: ['group_jobs_add'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/jobs?type=add', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      return data.data as GroupJob[];
    },
    refetchInterval: 5000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['group_manager_stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/stats', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return data.data;
    },
  });

  // Add selected contacts to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: async ({ targetGroupJid, targetGroupName, contactIds }: {
      targetGroupJid: string;
      targetGroupName?: string;
      contactIds: string[];
    }) => {
      const res = await fetch('/api/v1/group-manager/add', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ targetGroupJid, targetGroupName, contactIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل في إضافة الأشخاص');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group_jobs_add'] });
      queryClient.invalidateQueries({ queryKey: ['group_contacts_for_add'] });
      queryClient.invalidateQueries({ queryKey: ['group_manager_stats'] });
      addToast({
        title: 'نجاح',
        description: `تم بدء إضافة ${selectedContacts.size} شخص إلى الجروب`,
        type: 'success',
      });
      setIsAddModalOpen(false);
      setSelectedContacts(new Set());
      setTargetGroupJid('');
      setTargetGroupNameInput('');
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message, type: 'error' });
    },
  });

  // Direct Add by Phone Numbers Mutation
  const addNumbersMutation = useMutation({
    mutationFn: async ({
      targetGroupJid,
      targetGroupName,
      phoneNumbers,
    }: {
      targetGroupJid: string;
      targetGroupName?: string;
      phoneNumbers: string[];
    }) => {
      const res = await fetch('/api/v1/group-manager/add-numbers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ targetGroupJid, targetGroupName, phoneNumbers }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل في إضافة الأرقام إلى الجروب');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group_jobs_add'] });
      queryClient.invalidateQueries({ queryKey: ['group_contacts_for_add'] });
      queryClient.invalidateQueries({ queryKey: ['group_manager_stats'] });
      queryClient.invalidateQueries({ queryKey: ['group_extracted_contacts'] });
      addToast({
        title: 'نجاح',
        description: data.message || `تم بدء إضافة الأرقام إلى الجروب بنجاح`,
        type: 'success',
      });
      setIsDirectAddModalOpen(false);
      setDirectPhoneNumbersInput('');
      setDirectTargetGroupJid('');
      setDirectTargetGroupName('');
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message, type: 'error' });
    },
  });


  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch = !searchQuery.trim() ||
        c.phoneNumber.includes(searchQuery.toLowerCase()) ||
        (c.displayName && c.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.groupName && c.groupName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGroup = !filterGroup || (c.groupName === filterGroup || c.groupJid === filterGroup);

      return matchesSearch && matchesGroup;
    });
  }, [contacts, searchQuery, filterGroup]);

  // Unique group names for filter
  const uniqueGroups = useMemo(() => {
    const groups = new Map<string, string>();
    contacts.forEach((c) => {
      const key = c.groupJid;
      if (!groups.has(key)) {
        groups.set(key, c.groupName || c.groupJid);
      }
    });
    return Array.from(groups.entries());
  }, [contacts]);

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const toggleContact = (id: string) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedContacts(newSet);
  };

  const runningJobs = addJobs.filter((j) => j.status === 'pending' || j.status === 'running');

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <UserPlus className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">إضافة أشخاص إلى الجروبات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">أضف أعضاء إلى جروبات واتساب بالأرقام مباشرة أو من جهات الاتصال المستخرجة</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={() => {
              setDirectPhoneNumbersInput('');
              setIsDirectAddModalOpen(true);
            }}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            إضافة أشخاص بالأرقام مباشرة
          </Button>
          {selectedContacts.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Send className="w-4 h-4" />}
            >
              إضافة {selectedContacts.size} شخص محدد
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">أشخاص متاحين</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{contacts.length}</div>
          <div className="text-[11px] text-muted-foreground">جاهزين للإضافة</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">تم اختيارهم</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedContacts.size}</div>
          <div className="text-[11px] text-muted-foreground">محددين حالياً</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">عمليات الإضافة</span>
            <Send className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalAddJobs || 0}</div>
          <div className="text-[11px] text-muted-foreground">عملية تمت</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">عمليات جارية</span>
            <RefreshCw className={`w-4 h-4 text-amber-500 ${runningJobs.length > 0 ? 'animate-spin' : ''}`} />
          </div>
          <div className="text-2xl font-bold text-foreground">{runningJobs.length}</div>
          <div className="text-[11px] text-muted-foreground">يتم معالجتها الآن</div>
        </Card>
      </div>

      {/* Running Jobs */}
      {runningJobs.length > 0 && (
        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
            <span className="text-sm font-bold text-foreground">عمليات إضافة جارية ({runningJobs.length})</span>
          </div>
          <div className="space-y-2">
            {runningJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between bg-card/50 rounded-xl p-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">{job.targetGroupName || job.targetGroupJid}</span>
                  <span className="text-xs text-muted-foreground">({job.totalContacts} شخص)</span>
                </div>
                <Badge variant="warning">{job.status === 'pending' ? 'في الانتظار' : 'جاري التنفيذ'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Auto-Discovered Groups Section */}
      <Card className="p-5 border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">الجروبات المشترك بها في واتساب (اكتشاف تلقائي)</h2>
                <Badge variant={isWhatsappConnected ? 'success' : 'secondary'}>
                  {isWhatsappConnected ? `تم اكتشاف ${availableGroups.length} جروب` : 'الواتساب غير متصل'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                اختر أي جروب لإضافة أرقام إليه فوراً دون الحاجة لكتابة كود الجروب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="تصفية الجروبات..."
                value={groupFilterSearch}
                onChange={(e) => setGroupFilterSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchGroups()}
              isLoading={isGroupsFetching}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isGroupsFetching ? 'animate-spin' : ''}`} />}
            >
              تحديث
            </Button>
          </div>
        </div>

        {isGroupsLoading ? (
          <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            جاري فحص الجروبات المشترك بها تلقائياً...
          </div>
        ) : filteredDiscoveredGroups.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-border rounded-xl bg-secondary/10">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <div className="text-sm font-semibold text-foreground">
              {availableGroups.length === 0 ? 'لم يتم العثور على جروبات مشتركة حالياً' : 'لا توجد جروبات مطابقة للبحث'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {availableGroups.length === 0
                ? (groupsStatusMessage || 'تأكد من ربط حساب الواتساب من صفحة "أجهزة واتساب" وأن الرقم مشترك في جروبات.')
                : 'جرب البحث باسم آخر أو كود معرف الجروب.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDiscoveredGroups.map((group) => (
              <div
                key={group.id}
                className="p-3.5 rounded-xl bg-card border border-border hover:border-emerald-500/40 hover:shadow-sm transition flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground line-clamp-1" title={group.subject || group.id}>
                      {group.subject || 'جروب بدون اسم'}
                    </h4>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                      {group.size !== undefined ? `${group.size} عضو` : 'جروب نشط'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground/80 break-all select-all">
                    {group.id}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">الجروب الهدف</span>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setDirectTargetGroupJid(group.id);
                      setDirectTargetGroupName(group.subject || '');
                      setIsDirectAddModalOpen(true);
                    }}
                    leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                  >
                    إضافة أرقام لهذا الجروب
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Add Jobs */}
      {addJobs.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">سجل عمليات الإضافة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">الجروب الهدف</th>
                  <th className="py-3 px-4 font-semibold">الحالة</th>
                  <th className="py-3 px-4 font-semibold">عدد الأشخاص</th>
                  <th className="py-3 px-4 font-semibold">نجحوا / فشلوا</th>
                  <th className="py-3 px-4 font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {addJobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="hover:bg-secondary/20 transition">
                    <td className="py-3 px-4 font-medium text-foreground">{job.targetGroupName || job.targetGroupJid || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : 'warning'}>
                          {job.status === 'completed' ? 'مكتمل' : job.status === 'failed' ? 'فشل' : 'جاري'}
                        </Badge>
                        {job.errorMessage && (
                          <span className="text-[10px] text-destructive max-w-[200px] truncate block" title={job.errorMessage}>
                            {job.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">{job.totalContacts}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-emerald-500">{job.processedContacts}</span>
                      {' / '}
                      <span className="text-destructive">{job.failedContacts}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Select Contacts */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              اختر الأشخاص للإضافة ({filteredContacts.length})
            </h3>
            {filteredContacts.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedContacts.size === filteredContacts.length ? 'إلغاء التحديد' : 'تحديد الكل'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {uniqueGroups.length > 1 && (
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">كل الجروبات</option>
                {uniqueGroups.map(([jid, name]) => (
                  <option key={jid} value={jid}>{name}</option>
                ))}
              </select>
            )}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث بالرقم أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-muted-foreground">
                <th className="py-3 px-4 w-12">
                  <input
                    type="checkbox"
                    checked={filteredContacts.length > 0 && selectedContacts.size === filteredContacts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="py-3 px-4 font-semibold">رقم الهاتف</th>
                <th className="py-3 px-4 font-semibold">الاسم</th>
                <th className="py-3 px-4 font-semibold">الجروب المصدر</th>
                <th className="py-3 px-4 font-semibold">نوع العضوية</th>
                <th className="py-3 px-4 font-semibold">حالة الإضافة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isContactsLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    جاري تحميل جهات الاتصال...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div>لا توجد جهات اتصال مستخرجة</div>
                    <div className="text-xs mt-1">اذهب إلى صفحة "استخراج الأشخاص" أو أضف الأرقام يدوياً</div>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDirectAddModalOpen(true)}
                        leftIcon={<PlusCircle className="w-4 h-4 text-emerald-500" />}
                      >
                        إضافة أشخاص بالأرقام مباشرة
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={`hover:bg-secondary/20 transition cursor-pointer ${
                      selectedContacts.has(contact.id) ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-foreground font-medium">{contact.phoneNumber}</td>
                    <td className="py-3 px-4 text-foreground">{contact.displayName || '—'}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{contact.groupName || contact.groupJid}</td>
                    <td className="py-3 px-4">
                      {contact.isAdmin ? (
                        <Badge variant="primary">أدمن</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">عضو</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {contact.addedToTarget ? (
                        <Badge variant="success">تمت الإضافة</Badge>
                      ) : contact.addError ? (
                        <div className="flex flex-col gap-0.5" title={contact.addError}>
                          <Badge variant="danger">فشلت الإضافة</Badge>
                          <span className="text-[10px] text-destructive max-w-[200px] truncate block font-medium">
                            {contact.addError}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary">لم تتم</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Selected Contacts to Group Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`إضافة ${selectedContacts.size} شخص إلى جروب`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const targetGroupJid = formData.get('targetGroupJid') as string;
            const targetGroupName = formData.get('targetGroupName') as string;
            if (targetGroupJid.trim()) {
              addToGroupMutation.mutate({
                targetGroupJid: targetGroupJid.trim(),
                targetGroupName: targetGroupName.trim() || undefined,
                contactIds: Array.from(selectedContacts),
              });
            }
          }}
          className="space-y-4 text-right"
        >
          <div className="space-y-2">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
              سيتم إضافة <strong>{selectedContacts.size}</strong> شخص إلى الجروب المحدد.
            </div>
            {groupsResponse?.phoneNumber && (
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>الرقم المنفذ للإضافة: <strong className="font-mono">{groupsResponse.phoneNumber}</strong></span>
                <span className="text-[11px] opacity-80 font-medium">⚠️ يجب أن يكون هذا الرقم مشرفاً (Admin) في الجروب</span>
              </div>
            )}
          </div>

          {availableGroups.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                اختر من جروبات واتساب المتصلة ({availableGroups.length}):
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={targetGroupJid}
                onChange={(e) => {
                  const jid = e.target.value;
                  setTargetGroupJid(jid);
                  const found = availableGroups.find((g) => g.id === jid);
                  if (found) {
                    setTargetGroupNameInput(found.subject || '');
                  }
                }}
              >
                <option value="">-- اضغط للاختيار من الجروبات --</option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.subject || g.id} ({g.size || 0} عضو)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-foreground">
              معرف الجروب الهدف أو رابط الدعوة *
              <input
                name="targetGroupJid"
                required
                value={targetGroupJid}
                onChange={(e) => setTargetGroupJid(e.target.value)}
                placeholder="120363xxxxxxx@g.us أو رابط الجروب chat.whatsapp.com/..."
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block font-normal">
                يمكنك كتابة معرف الجروب (@g.us) أو لصق رابط دعوة الجروب مباشرة
              </span>
            </label>
            <label className="block text-xs font-semibold text-foreground">
              اسم الجروب (اختياري)
              <input
                name="targetGroupName"
                value={targetGroupNameInput}
                onChange={(e) => setTargetGroupNameInput(e.target.value)}
                placeholder="مثال: جروب العملاء الجدد"
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" isLoading={addToGroupMutation.isPending}>
              إضافة الأشخاص
            </Button>
          </div>
        </form>
      </Modal>

      {/* Direct Add by Phone Numbers Modal */}
      <Modal
        isOpen={isDirectAddModalOpen}
        onClose={() => setIsDirectAddModalOpen(false)}
        title="إضافة أشخاص إلى الجروب بالأرقام مباشرة"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!directTargetGroupJid.trim()) {
              addToast({ title: 'تنبيه', description: 'يرجى اختيار أو إدخال معرف الجروب الهدف', type: 'error' });
              return;
            }
            if (parsedDirectNumbers.length === 0) {
              addToast({ title: 'تنبيه', description: 'يرجى كتابة أو لصق أرقام هواتف صالحة', type: 'error' });
              return;
            }

            addNumbersMutation.mutate({
              targetGroupJid: directTargetGroupJid.trim(),
              targetGroupName: directTargetGroupName.trim() || undefined,
              phoneNumbers: parsedDirectNumbers,
            });
          }}
          className="space-y-4 text-right"
        >
          <div className="space-y-2">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                إضافة مباشرة بدون استخراج مسبق
              </div>
              <p className="text-[11px] leading-relaxed">
                يمكنك كتابة أو لصق أي قائمة أرقام (من ملف Excel أو نصوص خارجية). سيقوم النظام بتنظيف الأرقام وإضافتها بدفعات آمنة لضمان حماية حسابك من الحظر.
              </p>
            </div>
            {groupsResponse?.phoneNumber && (
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>الرقم المنفذ للإضافة: <strong className="font-mono">{groupsResponse.phoneNumber}</strong></span>
                <span className="text-[11px] opacity-80 font-medium">⚠️ يجب أن يكون هذا الرقم مشرفاً (Admin) في الجروب</span>
              </div>
            )}
          </div>

          {availableGroups.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                اختر من جروبات واتساب المكتشفة تلقائياً ({availableGroups.length}):
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={directTargetGroupJid}
                onChange={(e) => {
                  const jid = e.target.value;
                  setDirectTargetGroupJid(jid);
                  const found = availableGroups.find((g) => g.id === jid);
                  if (found) {
                    setDirectTargetGroupName(found.subject || '');
                  }
                }}
              >
                <option value="">-- اضغط لاختيار جروب تلقائياً --</option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.subject || g.id} ({g.size !== undefined ? `${g.size} عضو` : 'نشط'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-foreground">
              معرف الجروب الهدف أو رابط الدعوة *
              <input
                required
                value={directTargetGroupJid}
                onChange={(e) => setDirectTargetGroupJid(e.target.value)}
                placeholder="120363xxxxxxx@g.us أو رابط الجروب chat.whatsapp.com/..."
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block font-normal">
                يمكنك كتابة معرف الجروب (@g.us) أو لصق رابط دعوة الجروب مباشرة
              </span>
            </label>

            <label className="block text-xs font-semibold text-foreground">
              اسم الجروب (اختياري)
              <input
                value={directTargetGroupName}
                onChange={(e) => setDirectTargetGroupName(e.target.value)}
                placeholder="مثال: جروب المستثمرين"
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  أرقام الهواتف المراد إضافتها *
                </label>
                <Badge variant={parsedDirectNumbers.length > 0 ? 'success' : 'secondary'}>
                  {parsedDirectNumbers.length > 0
                    ? `تم اكتشاف ${parsedDirectNumbers.length} رقم صالح`
                    : 'في انتظار إدخال الأرقام'}
                </Badge>
              </div>

              <textarea
                rows={6}
                required
                value={directPhoneNumbersInput}
                onChange={(e) => setDirectPhoneNumbersInput(e.target.value)}
                placeholder={`اكتب أو الصق الأرقام هنا (رقم في كل سطر أو مفصولة بفواصل أو مسافات)، مثال:
201012345678
+96598765432
966501234567
00971501234567`}
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs leading-relaxed"
              />

              {parsedDirectNumbers.length > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-secondary/30 border border-border space-y-1.5">
                  <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    معاينة الأرقام الجاهزة للإضافة ({parsedDirectNumbers.length} رقم):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {parsedDirectNumbers.slice(0, 8).map((num, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-card border border-border text-foreground"
                      >
                        {num}
                      </span>
                    ))}
                    {parsedDirectNumbers.length > 8 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                        + {parsedDirectNumbers.length - 8} أرقام أخرى
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              نظام الإضافة يعمل بذكاء ومقسم لدفعات (5 أرقام كل دفعة) لتفادي قيود واتساب، وستظهر النتيجة في جدول العمليات فوراً.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsDirectAddModalOpen(false);
                setDirectPhoneNumbersInput('');
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={parsedDirectNumbers.length === 0 || !directTargetGroupJid.trim()}
              isLoading={addNumbersMutation.isPending}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              بدء إضافة {parsedDirectNumbers.length > 0 ? `(${parsedDirectNumbers.length})` : ''} رقم للجروب
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GroupAddPage;

