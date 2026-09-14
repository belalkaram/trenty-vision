import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { DateFilterSelect, DateFilterPreset } from '@/components/ui/DateFilterSelect';
import {
  BarChart3,
  Download,
  MessageSquare,
  Clock,
  Users,
  GitFork,
  ArrowDownToLine,
  Activity,
  Send,
  Inbox,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

function formatResponseTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'أقل من دقيقة (فوري)';
  if (seconds < 60) return `${Math.round(seconds)} ثانية`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = (seconds / 3600).toFixed(1);
  return `${hours} ساعة`;
}

export const ReportsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<DateFilterPreset>('all');

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['reports-overview', selectedPeriod],
    queryFn: () => reportsService.getOverview(selectedPeriod),
  });

  const { data: agentMetrics = [], isLoading: isAgentsLoading } = useQuery({
    queryKey: ['reports-agents', selectedPeriod],
    queryFn: () => reportsService.getAgentMetrics(selectedPeriod),
  });

  const { data: stationMetrics = [], isLoading: isStationsLoading } = useQuery({
    queryKey: ['reports-stations', selectedPeriod],
    queryFn: () => reportsService.getStationMetrics(selectedPeriod),
  });

  const handleRefreshAll = () => {
    refetch();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="التقارير والتحليلات التشغيلية"
        subtitle="مؤشرات الأداء اللحظية، سرعة الاستجابة، وتوزيع كثافة المحادثات الحقيقية"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateFilterSelect
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              size="sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
              <span>تحديث</span>
            </Button>
            <a
              href={reportsService.getExportConversationsUrl(selectedPeriod)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl border border-border transition shadow-xs"
            >
              <ArrowDownToLine className="w-4 h-4 text-primary" />
              <span>تصدير المحادثات (CSV)</span>
            </a>
            <a
              href={reportsService.getExportContactsUrl(selectedPeriod)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-soft transition"
            >
              <Download className="w-4 h-4" />
              <span>تصدير جهات الاتصال (CSV)</span>
            </a>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {isOverviewLoading ? (
          <CardSkeleton count={4} />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل تقارير الأداء"
            message={(error as any)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : (
          <>
            {/* Main 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hover className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">إجمالي المحادثات</span>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {overview?.totalConversations ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  منها {overview?.openConversations ?? 0} نشطة و {overview?.resolvedConversations ?? overview?.closedConversations ?? 0} منجزة
                </div>
              </Card>

              <Card hover className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">المحادثات المكتملة</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {overview?.resolvedConversations ?? overview?.closedConversations ?? 0}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>نسبة الإنجاز: {overview?.resolutionRate ?? 0}%</span>
                </div>
              </Card>

              <Card hover className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">متوسط سرعة الاستجابة</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {formatResponseTime(overview?.avgResponseTimeSeconds)}
                </div>
                <div className="text-[11px] text-muted-foreground">معدل سرعة الرد الفعلي على العملاء</div>
              </Card>

              <Card hover className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">الوكلاء النشطون</span>
                  <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {overview?.activeAgentsCount ?? 0}
                </div>
                <div className="text-[11px] text-primary font-mono font-semibold">جاهزون للاستقبال والمتابعة</div>
              </Card>
            </div>

            {/* Message Traffic Breakdown Banner */}
            <Card className="p-4 bg-secondary/30 border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">حركة الرسائل والتبادل اليومي:</span>
                </div>
                <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center w-full sm:w-auto">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Inbox className="w-3.5 h-3.5 text-blue-500" />
                      <span>الواردة من العملاء</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {overview?.incomingMessages ?? overview?.totalMessagesReceived ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Send className="w-3.5 h-3.5 text-emerald-500" />
                      <span>الصادرة من الفريق</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {overview?.outgoingMessages ?? overview?.totalMessagesSent ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span>إجمالي الرسائل</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {overview?.totalMessages ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Stations Volume Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <GitFork className="w-4 h-4 text-primary" />
            <span>كثافة المحادثات حسب محطات التوزيع</span>
          </h3>

          {isStationsLoading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : (
            <Card className="p-0 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border text-[11px] font-mono text-muted-foreground uppercase">
                      <th className="py-3 px-4 font-semibold">المحطة</th>
                      <th className="py-3 px-4 font-semibold">إجمالي المحادثات</th>
                      <th className="py-3 px-4 font-semibold">المحادثات النشطة حالياً</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stationMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-muted-foreground text-xs">
                          لا توجد بيانات محطات متوفرة حالياً
                        </td>
                      </tr>
                    ) : (
                      stationMetrics.map((sm) => (
                        <tr key={sm.stationId || sm.id} className="hover:bg-accent/20 transition">
                          <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: sm.color || '#1c9770' }}
                            />
                            <span>{sm.stationName || sm.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-foreground">
                            {sm.totalChats ?? sm.totalConversations ?? 0}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-primary">
                            {sm.activeChats ?? sm.openConversations ?? 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Agent Performance Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>إنتاجية ممثلي خدمة العملاء (Agents)</span>
          </h3>

          {isAgentsLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (
            <Card className="p-0 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border text-[11px] font-mono text-muted-foreground uppercase">
                      <th className="py-3 px-4 font-semibold">اسم الوكيل</th>
                      <th className="py-3 px-4 font-semibold">المحطة</th>
                      <th className="py-3 px-4 font-semibold">المحادثات المسندة</th>
                      <th className="py-3 px-4 font-semibold">المحادثات المنجزة</th>
                      <th className="py-3 px-4 font-semibold">الرسائل الصادرة</th>
                      <th className="py-3 px-4 font-semibold">متوسط سرعة الرد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agentMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">
                          لا توجد بيانات وكلاء مسجلة
                        </td>
                      </tr>
                    ) : (
                      agentMetrics.map((am) => (
                        <tr key={am.agentId || am.id} className="hover:bg-accent/20 transition">
                          <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${am.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                            <span>{am.agentName || (am as any).name}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {am.stationName || 'غير مسند'}
                          </td>
                          <td className="py-3 px-4 font-mono text-foreground font-semibold">
                            {am.totalAssigned ?? (am as any).assignedConversations ?? 0}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {am.totalResolved ?? (am as any).closedConversations ?? 0}
                          </td>
                          <td className="py-3 px-4 font-mono text-foreground">
                            {am.outgoingMessages ?? (am as any).outgoing_messages ?? 0}
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {formatResponseTime(am.avgResponseTimeSeconds || (am.avgResponseMinutes ? am.avgResponseMinutes * 60 : 0))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
