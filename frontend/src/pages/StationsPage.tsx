import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stationsService } from '@/services/stations.service';
import { employeesService } from '@/services/employees.service';
import { Station, CreateStationInput } from '@/types/stations';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  GitFork,
  Plus,
  Edit2,
  Trash2,
  Users,
  MessageSquare,
  Infinity as InfinityIcon,
  Check,
  UserCheck,
  Activity,
} from 'lucide-react';

export const StationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isAddStationModalOpen, setIsAddStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);

  // Capacity Mode: 'limited' vs 'unlimited'
  const [capacityMode, setCapacityMode] = useState<'limited' | 'unlimited'>('limited');
  // Selected Employees for station
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Form input state for Create / Edit
  const [formData, setFormData] = useState<CreateStationInput>({
    name: '',
    code: '',
    description: '',
    color: '#1c9770',
    maxCapacity: 20,
    routingWeight: 1,
    status: 'active',
    active: true,
  });

  // Query Stations
  const {
    data: stations = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationsService.list(),
  });

  // Query Employees for station assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.list(),
  });

  // Create Station Mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateStationInput) => stationsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      setIsAddStationModalOpen(false);
      resetForm();
      success('تم إنشاء محطة التوزيع بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل إنشاء المحطة');
    },
  });

  // Update Station Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateStationInput> }) =>
      stationsService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      setEditingStation(null);
      resetForm();
      success('تم تحديث بيانات المحطة بنجاح');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل تحديث المحطة');
    },
  });

  // Delete Station Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => stationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      setDeletingStation(null);
      success('تم حذف محطة التوزيع');
    },
    onError: (err: any) => {
      toastError(err?.message || 'فشل حذف المحطة');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      color: '#1c9770',
      maxCapacity: 20,
      routingWeight: 1,
      status: 'active',
      active: true,
      employeeIds: [],
    });
    setCapacityMode('limited');
    setSelectedEmployeeIds([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddStationModalOpen(true);
  };

  const openEditModal = (station: Station) => {
    const isAct = station.status === 'active' || station.active === true;
    const isUnlim = station.maxCapacity === null || station.isUnlimited === true;
    const empIds = station.employeeIds || (station.employees ? station.employees.map(e => (e as any).employeeId || (e as any).id) : []);

    setCapacityMode(isUnlim ? 'unlimited' : 'limited');
    setSelectedEmployeeIds(empIds);

    setFormData({
      name: station.name,
      code: station.code || '',
      description: station.description || '',
      color: station.color || '#1c9770',
      maxCapacity: isUnlim ? null : (station.maxCapacity ?? 20),
      routingWeight: station.routingWeight || 1,
      status: isAct ? 'active' : 'inactive',
      active: isAct,
      employeeIds: empIds,
    });
    setEditingStation(station);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || createMutation.isPending) return;

    const payload: CreateStationInput = {
      ...formData,
      maxCapacity: capacityMode === 'unlimited' ? null : Number(formData.maxCapacity) || 20,
      employeeIds: selectedEmployeeIds,
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation || !formData.name.trim() || updateMutation.isPending) return;

    const payload: Partial<CreateStationInput> = {
      ...formData,
      maxCapacity: capacityMode === 'unlimited' ? null : Number(formData.maxCapacity) || 20,
      employeeIds: selectedEmployeeIds,
    };
    updateMutation.mutate({ id: editingStation.id, input: payload });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <Header
        title="محطات التوزيع التشغيلية"
        subtitle="إدارة خطوط توزيع المحادثات، تعيين الموظفين، وضبط سعة الاستيعاب (محددة أو مفتوحة ∞)"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            إضافة محطة
          </Button>
        }
      />

      {/* Main Content Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل محطات التوزيع"
            message={(error as any)?.message || 'حدث خطأ في الاتصال أثناء جلب المحطات.'}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : stations.length === 0 ? (
          <Card>
            <EmptyState
              icon={<GitFork className="w-7 h-7 text-muted-foreground" />}
              title="لا توجد محطات توزيع حتى الآن"
              description="قم بإنشاء محطات عمل لتوزيع محادثات واتساب الواردة بين الموظفين تلقائياً وضبط سعة كل محطة."
              actionText="إضافة محطة جديدة"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={openAddModal}
            />
          </Card>
        ) : (
          /* Data Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station) => {
              const isActive = station.status === 'active' || station.active === true;
              const isUnlimited = station.maxCapacity === null || station.isUnlimited === true;
              const assignedStaff = station.employees || [];

              return (
                <Card key={station.id} hover className="flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Top Bar with Color Indicator & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full ring-2 ring-border shrink-0"
                          style={{ backgroundColor: station.color || '#1c9770' }}
                        />
                        <h3 className="text-sm font-bold text-foreground leading-tight">
                          {station.name}
                        </h3>
                        {station.code && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {station.code}
                          </span>
                        )}
                      </div>
                      <Badge variant={isActive ? 'success' : 'secondary'} pulse={isActive}>
                        {isActive ? 'نشطة' : 'معطلة'}
                      </Badge>
                    </div>

                    {/* Description */}
                    {station.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {station.description}
                      </p>
                    )}

                    {/* Metrics Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                      <div className="p-2 rounded-xl bg-background border border-border flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">فريق المحطة</div>
                          <div className="text-xs font-mono font-bold text-foreground">
                            {assignedStaff.length || station.assignedAgentsCount || station.employeeCount || 0} موظف
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-background border border-border flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">السعة والاستيعاب</div>
                          <div className="text-xs font-mono font-bold text-foreground flex items-center gap-1">
                            <span>{station.activeChatsCount ?? 0}</span>
                            <span>/</span>
                            {isUnlimited ? (
                              <span className="inline-flex items-center gap-0.5 text-primary font-bold">
                                <InfinityIcon className="w-3.5 h-3.5 inline" />
                                <span>(مفتوح)</span>
                              </span>
                            ) : (
                              <span>{station.maxCapacity ?? 20}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Employees Avatars/Chips Preview */}
                    {assignedStaff.length > 0 && (
                      <div className="pt-2 border-t border-border/40">
                        <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">الموظفون المسندون:</div>
                        <div className="flex flex-wrap gap-1">
                          {assignedStaff.slice(0, 3).map((emp) => (
                            <span
                              key={(emp as any).employeeId || (emp as any).id}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/60"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{emp.name || (emp as any).fullName}</span>
                            </span>
                          ))}
                          {assignedStaff.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground">
                              +{assignedStaff.length - 3} آخرين
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(station)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5 text-muted-foreground" />}
                    >
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingStation(station)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
                    >
                      حذف
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Station Modal */}
      {isAddStationModalOpen && (
        <Modal
          isOpen={isAddStationModalOpen}
          onClose={() => setIsAddStationModalOpen(false)}
          title="إضافة محطة توزيع جديدة"
          description="تحديد سعة المحطة (محددة أو مفتوحة ∞) وتعيين الموظفين المسندين إليها"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddStationModalOpen(false)}
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
                حفظ المحطة
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <Input
              label="اسم المحطة"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: خدمة العملاء، الدعم الفني، مبيعات الرياض"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="الرمز التعريفي (Code)"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="CS-01"
                className="font-mono uppercase"
              />
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  لون التمييز
                </label>
                <input
                  type="color"
                  value={formData.color || '#1c9770'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-11 p-1 rounded-xl bg-background border border-border cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Select
                label="حالة المحطة"
                value={formData.status || (formData.active ? 'active' : 'inactive')}
                onChange={(e) => setFormData({
                  ...formData,
                  status: e.target.value as 'active' | 'inactive',
                  active: e.target.value === 'active'
                })}
              >
                <option value="active">نشطة (تستقبل وتوزع)</option>
                <option value="inactive">معطلة (متوقفة مؤقتاً)</option>
              </Select>
            </div>

            {/* Capacity Mode Control */}
            <div className="space-y-2 text-right">
              <label className="block text-xs font-bold text-foreground">
                سعة المحطة واستيعاب المحادثات
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode('limited');
                    setFormData(prev => ({ ...prev, maxCapacity: 20 }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    capacityMode === 'limited'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/60 text-muted-foreground border-border hover:bg-secondary'
                  }`}
                >
                  سعة محددة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode('unlimited');
                    setFormData(prev => ({ ...prev, maxCapacity: null }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    capacityMode === 'unlimited'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/60 text-muted-foreground border-border hover:bg-secondary'
                  }`}
                >
                  <InfinityIcon className="w-4 h-4" />
                  <span>غير محددة (مفتوحة ∞)</span>
                </button>
              </div>

              {capacityMode === 'limited' ? (
                <Input
                  label="الحد الأقصى للمحادثات المتزامنة"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.maxCapacity ?? 20}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value, 10) || 20 })}
                  helperText="أقصى عدد محادثات مفتوحة تستقبلها هذه المحطة في نفس الوقت"
                />
              ) : (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium text-right flex items-center gap-2">
                  <InfinityIcon className="w-5 h-5 shrink-0" />
                  <span>سعة مفتوحة: تستقبل المحطة المحادثات وتوزعها على الموظفين دون سقف محدد.</span>
                </div>
              )}
            </div>

            {/* Assign Employees Multi-Select */}
            <div className="space-y-2 text-right">
              <label className="block text-xs font-bold text-foreground flex items-center justify-between">
                <span>تعيين موظفي المحطة</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  تم اختيار {selectedEmployeeIds.length} موظف
                </span>
              </label>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-2 space-y-1">
                {employees.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    لا يوجد موظفون متاحون. أضف موظفين من صفحة فريق العمل أولاً.
                  </p>
                ) : (
                  employees.map((emp) => {
                    const isSelected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/40 text-foreground font-semibold'
                            : 'hover:bg-secondary/70 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployeeIds((prev) => [...prev, emp.id]);
                              } else {
                                setSelectedEmployeeIds((prev) => prev.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                          />
                          <div className="text-right">
                            <div className="text-xs text-foreground font-bold">{emp.fullName || (emp as any).name}</div>
                            <div className="text-[10px] text-muted-foreground">{emp.role || 'موظف'}</div>
                          </div>
                        </div>
                        <Badge size="sm" variant={emp.presenceStatus === 'online' ? 'success' : 'secondary'}>
                          {emp.presenceStatus === 'online' ? 'متصل' : 'غير متصل'}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <Textarea
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف طبيعة عمل المحطة..."
            />
          </form>
        </Modal>
      )}

      {/* Edit Station Modal */}
      {editingStation && (
        <Modal
          isOpen={!!editingStation}
          onClose={() => setEditingStation(null)}
          title={`تعديل محطة: ${editingStation.name}`}
          description="تعديل السعة وتحديث قائمة الموظفين التابعين للمحطة"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStation(null)}
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
                تحديث البيانات
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="اسم المحطة"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="الرمز التعريفي (Code)"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="font-mono uppercase"
              />
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  لون التمييز
                </label>
                <input
                  type="color"
                  value={formData.color || '#1c9770'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-11 p-1 rounded-xl bg-background border border-border cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Select
                label="حالة المحطة"
                value={formData.status || (formData.active ? 'active' : 'inactive')}
                onChange={(e) => setFormData({
                  ...formData,
                  status: e.target.value as 'active' | 'inactive',
                  active: e.target.value === 'active'
                })}
              >
                <option value="active">نشطة (تستقبل وتوزع)</option>
                <option value="inactive">معطلة (متوقفة مؤقتاً)</option>
              </Select>
            </div>

            {/* Capacity Mode Control */}
            <div className="space-y-2 text-right">
              <label className="block text-xs font-bold text-foreground">
                سعة المحطة واستيعاب المحادثات
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode('limited');
                    setFormData(prev => ({ ...prev, maxCapacity: 20 }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    capacityMode === 'limited'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/60 text-muted-foreground border-border hover:bg-secondary'
                  }`}
                >
                  سعة محددة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode('unlimited');
                    setFormData(prev => ({ ...prev, maxCapacity: null }));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    capacityMode === 'unlimited'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/60 text-muted-foreground border-border hover:bg-secondary'
                  }`}
                >
                  <InfinityIcon className="w-4 h-4" />
                  <span>غير محددة (مفتوحة ∞)</span>
                </button>
              </div>

              {capacityMode === 'limited' ? (
                <Input
                  label="الحد الأقصى للمحادثات المتزامنة"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.maxCapacity ?? 20}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value, 10) || 20 })}
                  helperText="أقصى عدد محادثات مفتوحة تستقبلها هذه المحطة في نفس الوقت"
                />
              ) : (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium text-right flex items-center gap-2">
                  <InfinityIcon className="w-5 h-5 shrink-0" />
                  <span>سعة مفتوحة: تستقبل المحطة المحادثات وتوزعها على الموظفين دون سقف محدد.</span>
                </div>
              )}
            </div>

            {/* Assign Employees Multi-Select */}
            <div className="space-y-2 text-right">
              <label className="block text-xs font-bold text-foreground flex items-center justify-between">
                <span>تعيين موظفي المحطة</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  تم اختيار {selectedEmployeeIds.length} موظف
                </span>
              </label>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-2 space-y-1">
                {employees.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    لا يوجد موظفون متاحون. أضف موظفين من صفحة فريق العمل أولاً.
                  </p>
                ) : (
                  employees.map((emp) => {
                    const isSelected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/40 text-foreground font-semibold'
                            : 'hover:bg-secondary/70 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployeeIds((prev) => [...prev, emp.id]);
                              } else {
                                setSelectedEmployeeIds((prev) => prev.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                          />
                          <div className="text-right">
                            <div className="text-xs text-foreground font-bold">{emp.fullName || (emp as any).name}</div>
                            <div className="text-[10px] text-muted-foreground">{emp.role || 'موظف'}</div>
                          </div>
                        </div>
                        <Badge size="sm" variant={emp.presenceStatus === 'online' ? 'success' : 'secondary'}>
                          {emp.presenceStatus === 'online' ? 'متصل' : 'غير متصل'}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <Textarea
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </form>
        </Modal>
      )}

      {/* Delete Station Confirmation Modal */}
      {deletingStation && (
        <Modal
          isOpen={!!deletingStation}
          onClose={() => setDeletingStation(null)}
          title="حذف محطة التوزيع"
          description={`هل أنت متأكد من رغبتك في حذف محطة "${deletingStation.name}"؟`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingStation(null)}
                disabled={deleteMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deletingStation.id)}
                isLoading={deleteMutation.isPending}
              >
                تأكيد الحذف
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            سيتم إلغاء تعيين الموظفين المرتبطين بهذه المحطة. المحادثات والرسائل السابقة لن تتأثر.
          </p>
        </Modal>
      )}
    </div>
  );
};
