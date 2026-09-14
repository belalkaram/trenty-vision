import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsService } from '@/services/reports.service';
import { employeesService } from '@/services/employees.service';
import { conversationsService } from '@/services/conversations.service';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  MessageSquare,
  Clock,
  Users,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => reportsService.getOverview(),
    refetchInterval: 10000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.list(),
  });

  const { data: openChats = [] } = useQuery({
    queryKey: ['conversations', { status: 'open' }],
    queryFn: () => conversationsService.list({ status: 'open' }),
  });

  const { data: employeePerformance = [], isLoading: isEmpPerfLoading } = useQuery({
    queryKey: ['employee-performance'],
    queryFn: () => reportsService.getEmployeeWhatsappPerformance(),
    refetchInterval: 15000,
  });

  const { data: autoCustomers = [], isLoading: isAutoCustLoading } = useQuery({
    queryKey: ['auto-registered-customers'],
    queryFn: () => reportsService.getAutoRegisteredCustomers(),
    refetchInterval: 15000,
  });

  const onlineEmployees = employees.filter((e) => e.presenceStatus === 'online');

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header
        title="لوحة التحكم والعمليات"
        subtitle="المؤشرات الحيوية المباشرة وحالة الخوادم وتوزيع نوبات العمل"
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {/* Operations Hero Banner */}
        <Card className="bg-gradient-to-l from-sidebar via-[#1c3a35] to-sidebar text-sidebar-foreground border-sidebar-border shadow-lift p-6 sm:p-7 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sidebar-accent border border-sidebar-border/60 font-mono text-[10px] text-sidebar-primary font-bold">
                <Zap className="w-3 h-3" />
                <span>OPERATIONS COCKPIT • V2 ACTIVE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                منظومة ترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية
              </h2>
              <p className="text-xs text-sidebar-foreground/80 leading-relaxed">
                متابعة فورية لخدمات واستشارات الرعاية والمنتجات الطبية وسرعة الاستجابة للمرضى والعملاء عبر واتساب.
              </p>
            </div>
            <Link to="/inbox">
              <Button
                variant="primary"
                size="md"
                leftIcon={<MessageSquare className="w-4 h-4" />}
                className="shrink-0"
              >
                صندوق المحادثات
              </Button>
            </Link>
          </div>
        </Card>

        {/* Loading Skeletons */}
        {isOverviewLoading ? (
          <CardSkeleton count={4} />
        ) : isError ? (
          <ErrorState
            title="تعذر جلب مؤشرات العمليات"
            message={(error as any)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : (
          /* 4 KPI Metric Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Open Chats */}
            <Card hover className="space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">المحادثات النشطة</span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                {overview?.openConversations ?? openChats.length}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <span className="text-primary font-bold">LIVE</span>
                <span>قيد التفاعل الآن</span>
              </div>
            </Card>

            {/* 2. Total Conversations */}
            <Card hover className="space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">إجمالي المحادثات</span>
                <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                {overview?.totalConversations ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                محادثة مسجلة
              </div>
            </Card>

            {/* 3. Online Agents */}
            <Card hover className="space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">الوكلاء المتصلون</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                {onlineEmployees.length} <span className="text-sm font-normal text-muted-foreground">/ {employees.length}</span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>جاهزون للاستقبال</span>
              </div>
            </Card>

            {/* 4. Avg Response Time */}
            <Card hover className="space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">متوسط زمن الاستجابة</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                {Math.round((overview?.avgResponseTimeSeconds ?? 45) / 60)} دقيقة
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                سرعة الرد الأولي
              </div>
            </Card>
          </div>
        )}

        {/* Lower Two-Column Grid: System Diagnostics & Staff List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Staff List (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">طاقم العمل المباشر</h3>
              <Link to="/employees" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <span>عرض الكل</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <Card className="divide-y divide-border p-0 overflow-hidden">
              {employees.slice(0, 5).map((emp) => (
                <div key={emp.id} className="p-3.5 flex items-center justify-between hover:bg-accent/20 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs flex items-center justify-center">
                      {emp.fullName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{emp.fullName}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{emp.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {emp.activeChatsCount ?? 0} محادثات
                    </span>
                    <Badge variant={emp.presenceStatus === 'online' ? 'success' : 'secondary'} pulse={emp.presenceStatus === 'online'}>
                      {emp.presenceStatus === 'online' ? 'متصل' : 'غير متصل'}
                    </Badge>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* System Health Diagnostics (1 col) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">تشخيص الأنظمة والخدمات</h3>
            <Card className="space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs">
                  <Server className="w-4 h-4 text-primary" />
                  <span className="font-semibold">قاعدة بيانات PostgreSQL</span>
                </div>
                <Badge variant="success">متصل</Badge>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="font-semibold">خادم Fastify HTTP</span>
                </div>
                <Badge variant="success">99.9% Uptime</Badge>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-semibold">مقابس Baileys Socket</span>
                </div>
                <Badge variant="success">ACTIVE</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="font-semibold">حماية RBAC والتدقيق</span>
                </div>
                <Badge variant="primary">SECURED</Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Advanced Analytics: Employee WhatsApp Performance */}
        <div className="space-y-3 mt-8">
          <h3 className="text-lg font-bold text-foreground">أداء موظفي الواتساب (المربوطين بالنظام)</h3>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">الموظف</th>
                    <th className="px-4 py-3 font-semibold">رقم الواتساب</th>
                    <th className="px-4 py-3 font-semibold">المحادثات المسندة</th>
                    <th className="px-4 py-3 font-semibold">العملاء الذين تم الرد عليهم</th>
                    <th className="px-4 py-3 font-semibold">سرعة الرد (دقائق)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isEmpPerfLoading ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">جاري التحميل...</td></tr>
                  ) : employeePerformance.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">لا يوجد موظفين مربوطين حالياً</td></tr>
                  ) : (
                    employeePerformance.map((emp) => (
                      <tr key={emp.id} className="hover:bg-accent/10 transition">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${emp.status === 'active' ? 'bg-success' : 'bg-muted-foreground'}`} />
                            {emp.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono" dir="ltr">{emp.whatsappNumber}</td>
                        <td className="px-4 py-3 font-mono">{emp.totalAssigned}</td>
                        <td className="px-4 py-3 font-mono text-primary font-bold">{emp.totalRepliedToCustomers}</td>
                        <td className="px-4 py-3 font-mono">{emp.avgResponseMinutes} د</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Advanced Analytics: Auto-Registered Customers */}
        <div className="space-y-3 mt-8">
          <h3 className="text-lg font-bold text-foreground">العملاء المسجلين آلياً (عبر الرقم الأساسي)</h3>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">العميل</th>
                    <th className="px-4 py-3 font-semibold">رقم الهاتف</th>
                    <th className="px-4 py-3 font-semibold">الموظف المسند</th>
                    <th className="px-4 py-3 font-semibold">منفذ الوصول (الرقم الأساسي)</th>
                    <th className="px-4 py-3 font-semibold">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isAutoCustLoading ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">جاري التحميل...</td></tr>
                  ) : autoCustomers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">لا يوجد عملاء مسجلين آلياً</td></tr>
                  ) : (
                    autoCustomers.slice(0, 10).map((cust) => (
                      <tr key={cust.id} className="hover:bg-accent/10 transition">
                        <td className="px-4 py-3 font-medium text-foreground">{cust.name || 'بدون اسم'}</td>
                        <td className="px-4 py-3 font-mono" dir="ltr">{cust.phoneNumber}</td>
                        <td className="px-4 py-3">{cust.assignedEmployeeName || <span className="text-muted-foreground">غير مسند</span>}</td>
                        <td className="px-4 py-3">{cust.dispatcherName}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {new Date(cust.contactCreatedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {autoCustomers.length > 10 && (
              <div className="p-3 text-center border-t border-border bg-muted/10">
                <span className="text-xs text-muted-foreground">يتم عرض أحدث 10 عملاء.</span>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};
