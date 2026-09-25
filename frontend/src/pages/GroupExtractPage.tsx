import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import {
  UserMinus,
  Users,
  Download,
  RefreshCw,
  Search,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';

interface GroupInfo {
  id: string;
  name: string;
  participantCount: number;
}

interface ExtractedContact {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  groupJid: string;
  groupName: string | null;
  isAdmin: boolean;
  addedToTarget: boolean;
  extractedAt: string;
}

interface GroupJob {
  id: string;
  type: string;
  sourceGroupJid: string | null;
  sourceGroupName: string | null;
  status: string;
  totalContacts: number;
  processedContacts: number;
  createdAt: string;
  completedAt: string | null;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});

export const GroupExtractPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupJid, setSelectedGroupJid] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);

  // Fetch available WhatsApp groups
  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['group_manager_groups'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/groups', {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (Array.isArray(json.data) ? json.data : []) as Array<{ id: string; subject: string; size?: number }>;
    },
  });
  const availableGroups = groupsData || [];

  // Fetch extracted contacts
  const { data: contactsData, isLoading: isContactsLoading } = useQuery({
    queryKey: ['group_extracted_contacts'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/contacts?limit=200', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      return data.data as ExtractedContact[];
    },
  });

  // Fetch extraction jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['group_jobs_extract'],
    queryFn: async () => {
      const res = await fetch('/api/v1/group-manager/jobs?type=extract', {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      return data.data as GroupJob[];
    },
    refetchInterval: 5000, // Poll every 5 seconds to track running jobs
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

  // Extract mutation
  const extractMutation = useMutation({
    mutationFn: async ({ groupJid, groupName }: { groupJid: string; groupName?: string }) => {
      const res = await fetch('/api/v1/group-manager/extract', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ groupJid, groupName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل في بدء الاستخراج');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group_jobs_extract'] });
      queryClient.invalidateQueries({ queryKey: ['group_extracted_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['group_manager_stats'] });
      addToast({ title: 'نجاح', description: 'تم بدء عملية استخراج الأشخاص من الجروب', type: 'success' });
      setIsExtractModalOpen(false);
      setSelectedGroupJid('');
      setGroupNameInput('');
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message, type: 'error' });
    },
  });

  // Clear contacts mutation
  const clearContactsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/group-manager/contacts', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to clear contacts');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group_extracted_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['group_manager_stats'] });
      addToast({ title: 'نجاح', description: 'تم حذف جميع جهات الاتصال المستخرجة', type: 'success' });
    },
    onError: () => {
      addToast({ title: 'خطأ', description: 'فشل في حذف جهات الاتصال', type: 'error' });
    },
  });

  const contacts = contactsData || [];
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.phoneNumber.includes(q) ||
      (c.displayName && c.displayName.toLowerCase().includes(q)) ||
      (c.groupName && c.groupName.toLowerCase().includes(q))
    );
  });

  // Group contacts by group name
  const groupNames = [...new Set(contacts.map((c) => c.groupName || c.groupJid))];

  const runningJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'running');

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
            <UserMinus className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">استخراج الأشخاص من الجروبات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">سحب أعضاء الجروبات وحفظ أرقامهم لاستخدامها لاحقاً</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsExtractModalOpen(true)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            استخراج من جروب
          </Button>
          {contacts.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm('هل أنت متأكد من حذف جميع جهات الاتصال المستخرجة؟')) {
                  clearContactsMutation.mutate();
                }
              }}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              مسح الكل
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">إجمالي المستخرجين</span>
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalExtractedContacts || 0}</div>
          <div className="text-[11px] text-muted-foreground">أشخاص تم سحبهم</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">عمليات الاستخراج</span>
            <Download className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalExtractJobs || 0}</div>
          <div className="text-[11px] text-muted-foreground">جروبات تم سحبها</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">جروبات مختلفة</span>
            <Smartphone className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{groupNames.length}</div>
          <div className="text-[11px] text-muted-foreground">مصادر مختلفة</div>
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
            <span className="text-sm font-bold text-foreground">عمليات جارية ({runningJobs.length})</span>
          </div>
          <div className="space-y-2">
            {runningJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between bg-card/50 rounded-xl p-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">{job.sourceGroupName || job.sourceGroupJid}</span>
                </div>
                <Badge variant="warning">{job.status === 'pending' ? 'في الانتظار' : 'جاري التنفيذ'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">سجل عمليات الاستخراج</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">الجروب المصدر</th>
                  <th className="py-3 px-4 font-semibold">الحالة</th>
                  <th className="py-3 px-4 font-semibold">عدد الأشخاص</th>
                  <th className="py-3 px-4 font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {jobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="hover:bg-secondary/20 transition">
                    <td className="py-3 px-4 font-medium text-foreground">{job.sourceGroupName || job.sourceGroupJid || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : 'warning'}>
                        {job.status === 'completed' ? 'مكتمل' : job.status === 'failed' ? 'فشل' : 'جاري'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono">{job.totalContacts}</td>
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

      {/* Contacts List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            جهات الاتصال المستخرجة ({filteredContacts.length})
          </h3>
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث بالرقم أو الاسم أو الجروب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-muted-foreground">
                <th className="py-3 px-4 font-semibold">رقم الهاتف</th>
                <th className="py-3 px-4 font-semibold">الاسم</th>
                <th className="py-3 px-4 font-semibold">الجروب المصدر</th>
                <th className="py-3 px-4 font-semibold">أدمن؟</th>
                <th className="py-3 px-4 font-semibold">تم إضافته؟</th>
                <th className="py-3 px-4 font-semibold">تاريخ الاستخراج</th>
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
                    <UserMinus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div>لم يتم استخراج أي جهات اتصال بعد</div>
                    <div className="text-xs mt-1">اضغط على "استخراج من جروب" للبدء</div>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-secondary/20 transition">
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
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground text-xs">لا</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(contact.extractedAt).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Extract Modal */}
      <Modal
        isOpen={isExtractModalOpen}
        onClose={() => setIsExtractModalOpen(false)}
        title="استخراج أشخاص من جروب واتساب"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const groupJid = formData.get('groupJid') as string;
            const groupName = formData.get('groupName') as string;
            if (groupJid.trim()) {
              extractMutation.mutate({ groupJid: groupJid.trim(), groupName: groupName.trim() || undefined });
            }
          }}
          className="space-y-4 text-right"
        >
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs text-violet-600 dark:text-violet-400">
            أدخل معرف الجروب (Group JID) أو اختر من قائمة جروباتك لاستخراج جميع الأعضاء تلقائياً.
          </div>

          {availableGroups.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                اختر من جروبات واتساب المتصلة ({availableGroups.length}):
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedGroupJid}
                onChange={(e) => {
                  const jid = e.target.value;
                  setSelectedGroupJid(jid);
                  const found = availableGroups.find((g) => g.id === jid);
                  if (found) {
                    setGroupNameInput(found.subject || '');
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
              معرف الجروب (Group JID) *
              <input
                name="groupJid"
                required
                value={selectedGroupJid}
                onChange={(e) => setSelectedGroupJid(e.target.value)}
                placeholder="مثال: 120363xxxxxxx@g.us"
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block text-xs font-semibold text-foreground">
              اسم الجروب (اختياري)
              <input
                name="groupName"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="مثال: جروب المبيعات"
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsExtractModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" isLoading={extractMutation.isPending}>
              بدء الاستخراج
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GroupExtractPage;
