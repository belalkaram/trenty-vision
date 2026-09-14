import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsService, Contact } from '@/services/contacts.service';
import { reportsService } from '@/services/reports.service';
import { employeesService } from '@/services/employees.service';
import { useToast } from '@/hooks/useToast';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Download, Search, Phone, UserCircle2, Clock, Edit2, Trash2, Save } from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: contacts = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['contacts', debouncedSearch],
    queryFn: () => contactsService.list({ search: debouncedSearch, limit: 100 }),
    refetchInterval: 10000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.list(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; assignedEmployeeId: string }) => 
      contactsService.update(data.id, { 
        name: data.name, 
        metadata: { assignedEmployeeId: data.assignedEmployeeId } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast({ title: 'تم الحفظ', description: 'تم تحديث بيانات العميل بنجاح', type: 'success' });
      setEditingContact(null);
    },
    onError: () => {
      addToast({ title: 'خطأ', description: 'حدث خطأ أثناء التحديث', type: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح', type: 'success' });
    },
    onError: () => {
      addToast({ title: 'خطأ', description: 'حدث خطأ أثناء الحذف', type: 'error' });
    }
  });

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setEditName(contact.name || '');
    setEditEmployeeId(contact.metadata?.assignedEmployeeId || '');
  };

  const handleSaveEdit = () => {
    if (!editingContact) return;
    updateMutation.mutate({
      id: editingContact.id,
      name: editName,
      assignedEmployeeId: editEmployeeId,
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟ لن يمكنك التراجع عن هذا الإجراء.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="سجل العملاء"
        subtitle="إدارة بيانات العملاء والبحث عن جهات الاتصال"
        actions={
          <a
            href={reportsService.getExportContactsUrl('all')}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-soft transition"
          >
            <Download className="w-4 h-4" />
            <span>تصدير كل الأرقام (CSV)</span>
          </a>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <Card className="p-4 bg-secondary/30 border-border">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap font-medium">
              {isFetching ? 'جاري البحث...' : `عرض ${contacts.length} عميل`}
            </div>
          </div>
        </Card>

        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل سجل العملاء"
            message={(error as any)?.message}
            onRetry={() => refetch()}
          />
        ) : (
          <Card className="p-0 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border font-semibold text-muted-foreground">
                    <th className="py-4 px-6 text-right">الاسم</th>
                    <th className="py-4 px-6 text-right">رقم الهاتف</th>
                    <th className="py-4 px-6 text-right">الموظف المسؤول</th>
                    <th className="py-4 px-6 text-right">تاريخ التسجيل</th>
                    <th className="py-4 px-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        لا يوجد عملاء مطابقين للبحث
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-accent/30 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <UserCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-foreground">
                                {contact.name || 'غير محدد'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 font-mono font-semibold text-foreground">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span dir="ltr">{contact.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">
                          {contact.assignedEmployeeName || 'غير مسند'}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => handleEditClick(contact)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                              title="تعديل بيانات العميل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(contact.id)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                              title="حذف العميل"
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
        )}
      </main>

      <Modal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        title="تعديل بيانات العميل"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">اسم العميل</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="أدخل اسم العميل"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">الموظف المسؤول (الوكيل الملتصق)</label>
            <select
              value={editEmployeeId}
              onChange={(e) => setEditEmployeeId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-sm border border-border bg-background focus:outline-none focus:border-primary transition"
            >
              <option value="">-- بدون موظف مخصص --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">
              سيتم توجيه جميع محادثات هذا العميل المستقبلية إلى هذا الموظف مباشرة.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="secondary" onClick={() => setEditingContact(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              isLoading={updateMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              حفظ التعديلات
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
