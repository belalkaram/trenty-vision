import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/audit.service';
import { AuditLog } from '@/types/audit';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { DateFilterSelect, DateFilterPreset } from '@/components/ui/DateFilterSelect';
import { ShieldCheck, Search, Globe, User, RefreshCw, Filter } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['audit-logs', { entityType: selectedEntity }],
    queryFn: () => auditService.list({ entityType: selectedEntity || undefined }),
  });

  const logs = data?.items || [];

  const filteredLogs = logs.filter((log) => {
    if (dateFilter !== 'all') {
      const logDate = new Date(log.createdAt).getTime();
      const now = Date.now();
      if (dateFilter === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        if (logDate < startOfDay.getTime()) return false;
      } else if (dateFilter === '24h') {
        if (now - logDate > 24 * 60 * 60 * 1000) return false;
      } else if (dateFilter === '7d') {
        if (now - logDate > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (dateFilter === '30d') {
        if (now - logDate > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (dateFilter === 'this_month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        if (logDate < startOfMonth.getTime()) return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.entityType && log.entityType.toLowerCase().includes(q)) ||
      (log.actorId && log.actorId.toLowerCase().includes(q)) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(q))
    );
  });

  const getActionColor = (action: string) => {
    const a = (action || '').toUpperCase();
    if (a.includes('CREATE') || a.includes('REGISTER')) return 'bg-primary/10 text-primary border-primary/20';
    if (a.includes('DELETE') || a.includes('REMOVE')) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (a.includes('UPDATE') || a.includes('EDIT')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if (a.includes('LOGIN') || a.includes('AUTH')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-secondary text-secondary-foreground border-border';
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="سجل التدقيق والأمان"
        subtitle="سجل غير قابل للتعديل (Append-only) لكافة العمليات والأنشطة الإدارية"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            تحديث
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 pb-24 md:pb-6">
        {/* Search & Filter Bar */}
        <Card className="p-3.5 shadow-soft">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في السجلات (الحدث، المنفّذ، عنوان IP)..."
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter Dropdown */}
              <DateFilterSelect
                value={dateFilter}
                onChange={setDateFilter}
                size="sm"
              />

              {/* Entity Type Dropdown */}
              <div className="w-48">
                <Select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  sizeVariant="sm"
                >
                  <option value="">كافة الكيانات (الكل)</option>
                  <option value="user">المستخدمون (Users)</option>
                  <option value="employee">الموظفون (Employees)</option>
                  <option value="station">محطات العمل (Stations)</option>
                  <option value="department">الأقسام (Departments)</option>
                  <option value="settings">الإعدادات (Settings)</option>
                  <option value="automation">الأتمتة (Automation)</option>
                </Select>
              </div>

              <span className="font-mono text-xs px-3 py-2 rounded-xl bg-secondary text-secondary-foreground border border-border shrink-0">
                {filteredLogs.length} سجل
              </span>
            </div>
          </div>
        </Card>

        {/* Audit Logs Table */}
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل سجلات التدقيق"
            message={(error as any)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : filteredLogs.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ShieldCheck className="w-7 h-7 text-muted-foreground" />}
              title="لا توجد حركات تدقيق مطابقة"
              description="لم يتم العثور على أي نشاط يطابق معايير البحث الحالية."
            />
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-[11px] font-mono text-muted-foreground uppercase">
                    <th className="py-3 px-4 font-semibold">الحدث التشغيلي</th>
                    <th className="py-3 px-4 font-semibold">الكيان</th>
                    <th className="py-3 px-4 font-semibold">المنفّذ (Actor)</th>
                    <th className="py-3 px-4 font-semibold">عنوان IP</th>
                    <th className="py-3 px-4 font-semibold">التاريخ والتوقيت</th>
                    <th className="py-3 px-4 font-semibold text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/20 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wide ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                            {log.entityType}
                          </span>
                          {log.entityId && (
                            <span className="text-[10px] text-muted-foreground">
                              #{log.entityId.slice(0, 6)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 font-mono text-xs text-foreground">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{log.actorId ? log.actorId.slice(0, 8) + '...' : 'System'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                          <span>{log.ipAddress || 'Internal'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap" dir="ltr" style={{ textAlign: 'right' }}>
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 px-2.5 text-[11px]"
                        >
                          فحص (JSON)
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* JSON Payload Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`تفاصيل العملية: ${selectedLog.action}`}
          description={`Log ID: ${selectedLog.id}`}
          maxWidth="xl"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
              إغلاق النافذة
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <div className="text-[10px] text-muted-foreground">الكيان</div>
                <div className="font-mono font-bold text-foreground mt-0.5">{selectedLog.entityType}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <div className="text-[10px] text-muted-foreground">معرف الكيان</div>
                <div className="font-mono text-[11px] text-foreground mt-0.5 truncate">
                  {selectedLog.entityId || 'None'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <div className="text-[10px] text-muted-foreground">المنفّذ</div>
                <div className="font-mono text-[11px] text-foreground mt-0.5 truncate">
                  {selectedLog.actorId || 'System'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <div className="text-[10px] text-muted-foreground">عنوان IP</div>
                <div className="font-mono text-[11px] text-foreground mt-0.5 truncate">
                  {selectedLog.ipAddress || 'Internal'}
                </div>
              </div>
            </div>

            {selectedLog.userAgent && (
              <div className="p-2.5 rounded-xl bg-background border border-border text-xs">
                <div className="text-[10px] text-muted-foreground mb-0.5">User Agent:</div>
                <div className="font-mono text-[11px] text-muted-foreground break-all">
                  {selectedLog.userAgent}
                </div>
              </div>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-foreground mb-1">البيانات الوصفية (Metadata)</div>
                <pre
                  className="p-3 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-xl text-[11px] font-mono overflow-x-auto"
                  dir="ltr"
                >
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.oldValues && (
              <div>
                <div className="text-xs font-semibold text-rose-400 mb-1">القيم السابقة (Old Values)</div>
                <pre
                  className="p-3 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-xl text-[11px] font-mono overflow-x-auto"
                  dir="ltr"
                >
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValues && (
              <div>
                <div className="text-xs font-semibold text-emerald-400 mb-1">القيم الجديدة (New Values)</div>
                <pre
                  className="p-3 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-xl text-[11px] font-mono overflow-x-auto"
                  dir="ltr"
                >
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
