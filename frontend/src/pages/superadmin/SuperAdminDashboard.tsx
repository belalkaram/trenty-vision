import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { LogOut, Trash2, Edit2, ShieldCheck, Clock, Plus, AlertTriangle, Eraser } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
}

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('superadmin_token');

  React.useEffect(() => {
    if (!token) {
      navigate('/super-admin/login');
    }
  }, [token, navigate]);

  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [trialDays, setTrialDays] = useState<string>('');
  
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', trialDays: '' });

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const [isClearInboxModalOpen, setIsClearInboxModalOpen] = useState(false);
  const [clearInboxConfirmText, setClearInboxConfirmText] = useState('');

  const { data: admins = [], isLoading, refetch } = useQuery({
    queryKey: ['superadmin_users'],
    queryFn: async () => {
      const res = await fetch('/api/v1/superadmin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('superadmin_token');
          navigate('/super-admin/login');
        }
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      return (data.data || []) as AdminUser[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/superadmin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      addToast({ title: 'نجاح', description: 'تم حذف المدير بنجاح', type: 'success' });
    },
    onError: () => addToast({ title: 'خطأ', description: 'حدث خطأ أثناء الحذف', type: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; trialDays: number | null }) => {
      const res = await fetch(`/api/v1/superadmin/users/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trialDays: data.trialDays }),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      addToast({ title: 'نجاح', description: 'تم التحديث بنجاح', type: 'success' });
      setEditingAdmin(null);
    },
    onError: () => addToast({ title: 'خطأ', description: 'حدث خطأ أثناء التحديث', type: 'error' }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newAdmin) => {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        trialDays: data.trialDays ? parseInt(data.trialDays, 10) : null,
      };
      const res = await fetch('/api/v1/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Create failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      addToast({ title: 'نجاح', description: 'تمت إضافة المدير بنجاح', type: 'success' });
      setIsAddingAdmin(false);
      setNewAdmin({ name: '', email: '', password: '', trialDays: '' });
    },
    onError: (err: any) => addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء الإضافة', type: 'error' }),
  });

  const factoryResetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/superadmin/factory-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmText: resetConfirmText }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Factory reset failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      addToast({ title: 'نجاح', description: 'تم مسح جميع بيانات النظام بنجاح', type: 'success' });
      setIsResetModalOpen(false);
      setResetConfirmText('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء ضبط المصنع', type: 'error' });
    }
  });

  const clearInboxMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/superadmin/clear-inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmText: clearInboxConfirmText }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Clear inbox failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      addToast({ title: 'نجاح', description: 'تم تفريغ صندوق المحادثات بنجاح', type: 'success' });
      setIsClearInboxModalOpen(false);
      setClearInboxConfirmText('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء التفريغ', type: 'error' });
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المدير بالكامل من النظام؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditClick = (admin: AdminUser) => {
    setEditingAdmin(admin);
    if (admin.trialEndsAt) {
      const remainingMs = new Date(admin.trialEndsAt).getTime() - Date.now();
      const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      setTrialDays(days > 0 ? days.toString() : '0');
    } else {
      setTrialDays('');
    }
  };

  const handleSaveTrial = () => {
    if (!editingAdmin) return;
    const days = trialDays.trim() === '' ? null : parseInt(trialDays, 10);
    updateMutation.mutate({ id: editingAdmin.id, trialDays: days });
  };

  const handleAddAdmin = () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      addToast({ title: 'تنبيه', description: 'الرجاء تعبئة جميع الحقول المطلوبة', type: 'error' });
      return;
    }
    createMutation.mutate(newAdmin);
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    navigate('/super-admin/login');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">إدارة النظام والمديرين والفترات التجريبية</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsClearInboxModalOpen(true)}
              leftIcon={<Eraser className="w-4 h-4" />}
            >
              تفريغ صندوق المحادثات
            </Button>
            <Button
              variant="danger"
              onClick={() => setIsResetModalOpen(true)}
              leftIcon={<AlertTriangle className="w-4 h-4" />}
            >
              إعادة ضبط المصنع
            </Button>
            <Button variant="primary" onClick={() => setIsAddingAdmin(true)} leftIcon={<Plus className="w-4 h-4" />}>
              إضافة مشرف جديد
            </Button>
            <Button variant="outline" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
              تسجيل الخروج
            </Button>
          </div>
        </div>

        <Card className="p-0 overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/40 border-b border-border font-semibold text-muted-foreground">
                  <th className="py-4 px-6">اسم المدير</th>
                  <th className="py-4 px-6">البريد الإلكتروني</th>
                  <th className="py-4 px-6">الحالة</th>
                  <th className="py-4 px-6">تاريخ التسجيل</th>
                  <th className="py-4 px-6">الفترة التجريبية</th>
                  <th className="py-4 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">جاري التحميل...</td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">لا يوجد مديرين في النظام حالياً</td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-accent/30 transition">
                      <td className="py-4 px-6 font-bold">{admin.name}</td>
                      <td className="py-4 px-6 text-muted-foreground font-mono">{admin.email}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                          admin.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {new Date(admin.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-4 px-6">
                        {admin.trialEndsAt ? (
                          <div className="flex flex-col">
                            <span className={new Date(admin.trialEndsAt) < new Date() ? 'text-destructive font-bold' : 'text-emerald-600 font-medium'}>
                              {new Date(admin.trialEndsAt) < new Date() ? 'منتهية' : 'مفعلة'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              حتى: {new Date(admin.trialEndsAt).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">غير محدد (مفتوح)</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleEditClick(admin)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                            title="تعديل الفترة التجريبية"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                            title="حذف المدير"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        title="تحديد الفترة التجريبية"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            تحديد عدد أيام الفترة التجريبية للمدير <strong>{editingAdmin?.name}</strong>. اترك الحقل فارغاً لجعل الحساب مفتوحاً بدون فترة تجريبية.
          </p>
          <div>
            <label className="block text-sm font-semibold mb-1.5">عدد الأيام</label>
            <Input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="مثال: 14"
              min="0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="secondary" onClick={() => setEditingAdmin(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTrial}
              isLoading={updateMutation.isPending}
              leftIcon={<Clock className="w-4 h-4" />}
            >
              حفظ التعديل
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddingAdmin}
        onClose={() => setIsAddingAdmin(false)}
        title="إضافة مشرف جديد"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">الاسم</label>
            <Input
              type="text"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              placeholder="اسم المشرف"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">البريد الإلكتروني</label>
            <Input
              type="email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="admin@example.com"
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">كلمة المرور</label>
            <Input
              type="password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="••••••••"
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">أيام الفترة التجريبية (اختياري)</label>
            <Input
              type="number"
              value={newAdmin.trialDays}
              onChange={(e) => setNewAdmin({ ...newAdmin, trialDays: e.target.value })}
              placeholder="اتركه فارغاً لجعله مفتوحاً"
              min="0"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="secondary" onClick={() => setIsAddingAdmin(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleAddAdmin}
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              إضافة المشرف
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => !factoryResetMutation.isPending && setIsResetModalOpen(false)}
        title="تحذير أمني شديد: إعادة ضبط المصنع"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 text-red-600 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold">سيتم حذف جميع البيانات بشكل نهائي!</p>
              <p>هذا الإجراء سيقوم بمسح:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>جميع العملاء والمحادثات والرسائل</li>
                <li>جميع الموظفين والأقسام</li>
                <li>جميع ملفات الميديا والصور</li>
                <li>حسابات الواتساب المرتبطة</li>
                <li>أي مستخدم ليس له صلاحية Administrator</li>
              </ul>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              لتأكيد العملية، يرجى كتابة <span className="font-mono bg-muted px-2 py-0.5 rounded text-red-500">RESET_ALL_DATA</span> أدناه:
            </label>
            <Input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="اكتب العبارة المطلوبة هنا"
              dir="ltr"
              className="text-left"
              disabled={factoryResetMutation.isPending}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsResetModalOpen(false)}
              disabled={factoryResetMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={() => factoryResetMutation.mutate()}
              isLoading={factoryResetMutation.isPending}
              disabled={resetConfirmText !== 'RESET_ALL_DATA'}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              تأكيد المسح الشامل
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isClearInboxModalOpen}
        onClose={() => !clearInboxMutation.isPending && setIsClearInboxModalOpen(false)}
        title="تفريغ صندوق المحادثات وبيانات العملاء"
      >
        <div className="space-y-4">
          <div className="p-4 bg-orange-500/10 text-orange-600 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold">سيتم حذف بيانات التشغيل بشكل نهائي!</p>
              <p>هذا الإجراء سيقوم بمسح:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>جميع العملاء والمحادثات والرسائل</li>
                <li>جميع الموظفين والأقسام</li>
              </ul>
              <p className="mt-2 text-xs font-semibold">ملاحظة: سيتم الاحتفاظ بحسابات الواتساب المرتبطة وحسابات الإدارة (Admins).</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              لتأكيد العملية، يرجى كتابة <span className="font-mono bg-muted px-2 py-0.5 rounded text-orange-500">CLEAR_INBOX</span> أدناه:
            </label>
            <Input
              type="text"
              value={clearInboxConfirmText}
              onChange={(e) => setClearInboxConfirmText(e.target.value)}
              placeholder="اكتب العبارة المطلوبة هنا"
              dir="ltr"
              className="text-left"
              disabled={clearInboxMutation.isPending}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsClearInboxModalOpen(false)}
              disabled={clearInboxMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={() => clearInboxMutation.mutate()}
              isLoading={clearInboxMutation.isPending}
              disabled={clearInboxConfirmText !== 'CLEAR_INBOX'}
              leftIcon={<Eraser className="w-4 h-4" />}
            >
              تأكيد التفريغ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
