import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsService } from '@/services/departments.service';
import { Department, CreateDepartmentInput } from '@/types/departments';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Building2, Plus, Edit2, Trash2, Users } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);

  const [formData, setFormData] = useState<CreateDepartmentInput>({
    name: '',
    code: '',
    description: '',
  });

  const {
    data: departments = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateDepartmentInput) => departmentsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsAddModalOpen(false);
      resetForm();
      success('تم إنشاء القسم بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إنشاء القسم');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateDepartmentInput> }) =>
      departmentsService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setEditingDept(null);
      resetForm();
      success('تم تحديث بيانات القسم');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث بيانات القسم');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeletingDept(null);
      success('تم حذف القسم بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف القسم');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' });
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setFormData({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
    });
    setEditingDept(dept);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || createMutation.isPending) return;
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !formData.name.trim() || updateMutation.isPending) return;
    updateMutation.mutate({ id: editingDept.id, input: formData });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="الأقسام التشغيلية"
        subtitle="الهيكل التنظيمي للمؤسسة وتوزيع التخصصات الوظيفية"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            إضافة قسم
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل الأقسام"
            message={(error as any)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : departments.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Building2 className="w-7 h-7 text-muted-foreground" />}
              title="لا توجد أقسام تشغيلية مسجلة"
              description="أنشئ أقساماً لتنظيم محطات العمل والموظفين داخل منظومة العمل."
              actionText="إضافة قسم جديد"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={openAddModal}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card key={dept.id} hover className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground leading-tight">
                          {dept.name}
                        </h3>
                        {dept.code && (
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            {dept.code}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={dept.status === 'active' ? 'success' : 'secondary'}>
                      {dept.status === 'active' ? 'نشط' : 'معطل'}
                    </Badge>
                  </div>

                  {dept.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {dept.description}
                    </p>
                  )}

                  <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>الموظفون:</span>
                    </div>
                    <span className="font-bold text-foreground">{dept.employeesCount ?? 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(dept)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5 text-muted-foreground" />}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingDept(dept)}
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

      {/* Add Department Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="إضافة قسم تشغيلي جديد"
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
                إنشاء القسم
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <Input
              label="اسم القسم"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: قسم المبيعات، قسم العمليات"
            />
            <Input
              label="رمز القسم (Code)"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="OPS"
              className="font-mono uppercase"
            />
            <Textarea
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف مهام القسم..."
            />
          </form>
        </Modal>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <Modal
          isOpen={!!editingDept}
          onClose={() => setEditingDept(null)}
          title={`تعديل قسم: ${editingDept.name}`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingDept(null)}
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
              label="اسم القسم"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="رمز القسم"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="font-mono uppercase"
            />
            <Textarea
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDept && (
        <Modal
          isOpen={!!deletingDept}
          onClose={() => setDeletingDept(null)}
          title="تأكيد حذف القسم"
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingDept(null)}
                disabled={deleteMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deletingDept.id)}
                isLoading={deleteMutation.isPending}
              >
                تأكيد الحذف
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            هل أنت متأكد من رغبتك في حذف قسم{' '}
            <strong className="text-foreground">{deletingDept.name}</strong>؟
          </p>
        </Modal>
      )}
    </div>
  );
};
