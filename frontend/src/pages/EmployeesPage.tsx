import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesService } from '@/services/employees.service';
import { stationsService } from '@/services/stations.service';
import { Employee, CreateEmployeeInput } from '@/types/employees';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Users, Plus, Edit2, Trash2, Mail, Phone, MessageSquare, Check, Shield, Smartphone } from 'lucide-react';
import { validateAndFormatPhone } from '@/utils/phone.validator';

export const EmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<CreateEmployeeInput>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    stationIds: [],
  });

  const {
    data: employees = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => employeesService.getRoles(),
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationsService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateEmployeeInput) => employeesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsAddModalOpen(false);
      resetForm();
      success('تمت إضافة الموظف بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إضافة الموظف');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateEmployeeInput> }) =>
      employeesService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmployee(null);
      resetForm();
      success('تم تحديث بيانات الموظف');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث بيانات الموظف');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeletingEmployee(null);
      success('تم حذف الموظف');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف الموظف');
    },
  });

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      roleId: roles[0]?.id || '',
      stationIds: [],
    });
  };

  React.useEffect(() => {
    if (roles.length > 0 && !formData.roleId) {
      setFormData(prev => ({ ...prev, roleId: roles[0].id }));
    }
  }, [roles]);

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    const matchingRole = roles.find((r) => r.id === emp.roleId || r.name === emp.role || r.displayName === emp.role);
    const assignedStationId = (emp as any).stationId;
    setFormData({
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone || emp.whatsappNumber || '',
      roleId: matchingRole?.id || emp.roleId || roles[0]?.id || '',
      stationIds: assignedStationId ? [assignedStationId] : (emp.stationIds || []),
    });
    setEditingEmployee(emp);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || createMutation.isPending) return;

    let payload = { ...formData };
    if (payload.phone && payload.phone.trim()) {
      const phoneValidation = validateAndFormatPhone(payload.phone);
      if (!phoneValidation.isValid) {
        toastError(phoneValidation.error || 'رقم هاتف الموظف غير صالح. يرجى إدخال مفتاح الدولة الدولي (مثل +966 أو +20)');
        return;
      }
      payload.phone = phoneValidation.formatted;
    }

    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !formData.fullName.trim() || updateMutation.isPending) return;

    let payload = { ...formData };
    if (payload.phone && payload.phone.trim()) {
      const phoneValidation = validateAndFormatPhone(payload.phone);
      if (!phoneValidation.isValid) {
        toastError(phoneValidation.error || 'رقم هاتف الموظف غير صالح. يرجى إدخال مفتاح الدولة الدولي (مثل +966 أو +20)');
        return;
      }
      payload.phone = phoneValidation.formatted;
    }

    updateMutation.mutate({ id: editingEmployee.id, input: payload });
  };

  const toggleStation = (stationId: string) => {
    const current = formData.stationIds || [];
    if (current.includes(stationId)) {
      setFormData({ ...formData, stationIds: current.filter((id) => id !== stationId) });
    } else {
      setFormData({ ...formData, stationIds: [...current, stationId] });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="فريق العمل والموظفين"
        subtitle="إدارة حسابات المشرفين وممثلي خدمة العملاء وتعيين الصلاحيات"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            إضافة موظف
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {/* Info Banner for Employee WhatsApp integration */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>توجيه محادثات واتساب للموظفين بدون مسح QR</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  توزيع سحابي مباشر
                </span>
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                لا يُشترط على الموظفين مسح رمز QR أو ربط أجهزتهم الشخصية بالنظام. يكفي تسجيل رقم هاتف الموظف بالصيغة الدولية (E.164 مع مفتاح الدولة مثل <span className="font-mono font-bold text-foreground" dir="ltr">+966...</span> أو <span className="font-mono font-bold text-foreground" dir="ltr">+20...</span>)، ويقوم النظام بتوزيع المحادثات الواردة على لوحة تحكم الموظف فورياً.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل قائمة الموظفين"
            message={(error as any)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : employees.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="w-7 h-7 text-muted-foreground" />}
              title="لا يوجد موظفون مسجلون"
              description="أضف موظفين أو مشرفين إلى النظام لبدء استقبال المحادثات وإسناد المهام."
              actionText="إضافة موظف جديد"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={openAddModal}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <Card key={emp.id} hover className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Top Bar: Name, Role & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center border border-border shrink-0">
                        {emp.fullName.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground leading-tight">
                          {emp.fullName}
                        </h3>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {emp.role}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={emp.presenceStatus === 'online' ? 'success' : 'secondary'}
                      pulse={emp.presenceStatus === 'online'}
                    >
                      {emp.presenceStatus === 'online' ? 'متصل' : 'غير متصل'}
                    </Badge>
                  </div>

                  {/* Info: Email & Phone */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {(emp.phone || emp.whatsappNumber) ? (
                      <div className="flex items-center gap-2 font-mono text-[11px]" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">{emp.phone || emp.whatsappNumber}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                        <Phone className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        <span>بدون رقم هاتف</span>
                      </div>
                    )}
                  </div>

                  {/* Workload Pill */}
                  <div className="p-2 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground">المحادثات النشطة:</span>
                    <span className="font-mono font-bold text-primary flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{emp.activeChatsCount ?? 0}</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(emp)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5 text-muted-foreground" />}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingEmployee(emp)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
                  >
                    حذف
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="إضافة موظف جديد"
          description="إنشاء حساب لممثل خدمة عملاء أو مشرف وتحديد دوره ومحطات العمل"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                disabled={createMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateSubmit}
                isLoading={createMutation.isPending}
              >
                إنشاء الحساب
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <Input
              label="الاسم الكامل"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="مثال: أحمد محمد"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="البريد الإلكتروني"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="agent@company.com"
                className="font-mono"
              />
              <Input
                label="كلمة المرور"
                type="password"
                required
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="رقم الهاتف الدولي (اختياري)"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966501234567"
                  className="font-mono text-left dir-ltr"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  بصيغة E.164 (مثال: +966 أو +20)
                </p>
              </div>
              <Select
                label="الدور الوظيفي"
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName || role.name}
                  </option>
                ))}
              </Select>
            </div>
            {stations.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  محطات التوزيع المسندة
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-background border border-border">
                  {stations.map((st) => {
                    const isChecked = (formData.stationIds || []).includes(st.id);
                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => toggleStation(st.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-right transition flex items-center justify-between ${
                          isChecked
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-secondary/40 border-border text-muted-foreground'
                        }`}
                      >
                        <span className="truncate">{st.name}</span>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <Modal
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          title={`تعديل موظف: ${editingEmployee.fullName}`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingEmployee(null)}
                disabled={updateMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEditSubmit}
                isLoading={updateMutation.isPending}
              >
                حفظ التعديلات
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-3.5">
            <Input
              label="الاسم الكامل"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            <Input
              label="البريد الإلكتروني"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="font-mono"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="رقم الهاتف الدولي"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966501234567"
                  className="font-mono text-left dir-ltr"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  بصيغة E.164 (مثال: +966 أو +20)
                </p>
              </div>
              <Select
                label="الدور الوظيفي"
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName || role.name}
                  </option>
                ))}
              </Select>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingEmployee && (
        <Modal
          isOpen={!!deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          title="تأكيد حذف الموظف"
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingEmployee(null)}
                disabled={deleteMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deletingEmployee.id)}
                isLoading={deleteMutation.isPending}
              >
                تأكيد الحذف
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            هل أنت متأكد من رغبتك في حذف حساب الموظف{' '}
            <strong className="text-foreground">{deletingEmployee.fullName}</strong>؟ لن يتمكن من
            تسجيل الدخول إلى النظام بعد ذلك.
          </p>
        </Modal>
      )}
    </div>
  );
};
