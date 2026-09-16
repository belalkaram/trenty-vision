import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import {
  LogOut,
  Trash2,
  Edit2,
  ShieldCheck,
  Clock,
  Plus,
  AlertTriangle,
  Eraser,
  Building2,
  Users,
  MessageSquare,
  Globe,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Search,
  UserPlus,
} from 'lucide-react';

interface CompanyItem {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  status: 'active' | 'suspended' | 'inactive';
  subscriptionPlan: string;
  maxUsers: number;
  timezone: string;
  createdAt: string;
  usersCount?: number;
  contactsCount?: number;
  conversationsCount?: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: string;
  companyId?: string | null;
  companyName?: string | null;
  lastLoginAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
}

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('superadmin_token') || localStorage.getItem('auth_token');

  React.useEffect(() => {
    if (!token) {
      navigate('/super-admin/login');
    }
  }, [token, navigate]);

  const [activeTab, setActiveTab] = useState<'companies' | 'admins' | 'system'>('companies');
  const [searchQuery, setSearchQuery] = useState('');

  // Company Modals State
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [addingUserToCompany, setAddingUserToCompany] = useState<CompanyItem | null>(null);
  const [clearingCompany, setClearingCompany] = useState<CompanyItem | null>(null);
  const [clearConfirmText, setClearConfirmText] = useState('');

  // Form states for company
  const [newCompany, setNewCompany] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    status: 'active' as 'active' | 'suspended' | 'inactive',
    subscriptionPlan: 'standard',
    maxUsers: 10,
    timezone: 'Asia/Kuwait',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [companyUserForm, setCompanyUserForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    trialDays: '',
  });

  // Global Admin modals state
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [trialDays, setTrialDays] = useState<string>('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', trialDays: '' });

  // System modals state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isClearInboxModalOpen, setIsClearInboxModalOpen] = useState(false);
  const [clearInboxConfirmText, setClearInboxConfirmText] = useState('');

  // Query: Companies
  const { data: companies = [], isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['superadmin_companies'],
    queryFn: async () => {
      const res = await fetch('/api/v1/superadmin/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('superadmin_token');
          navigate('/super-admin/login');
        }
        throw new Error('Failed to fetch companies');
      }
      const data = await res.json();
      return (data.data || []) as CompanyItem[];
    },
  });

  // Query: Users / Admins
  const { data: admins = [], isLoading: isAdminsLoading } = useQuery({
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
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      return (data.data || []) as AdminUser[];
    },
  });

  // Company Mutations
  const createCompanyMutation = useMutation({
    mutationFn: async (payload: typeof newCompany) => {
      const res = await fetch('/api/v1/superadmin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to provision company');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_companies'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      addToast({ title: 'نجاح', description: 'تم إنشاء الشركة وتجهيز الصلاحيات والمشرف بنجاح', type: 'success' });
      setIsAddCompanyModalOpen(false);
      setNewCompany({
        name: '',
        slug: '',
        logoUrl: '',
        status: 'active',
        subscriptionPlan: 'standard',
        maxUsers: 10,
        timezone: 'Asia/Kuwait',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء إنشاء الشركة', type: 'error' });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CompanyItem> }) => {
      const res = await fetch(`/api/v1/superadmin/companies/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update company');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_companies'] });
      addToast({ title: 'نجاح', description: 'تم تحديث بيانات الشركة بنجاح', type: 'success' });
      setEditingCompany(null);
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء التحديث', type: 'error' });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/superadmin/companies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete company failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_companies'] });
      addToast({ title: 'نجاح', description: 'تم حذف الشركة وجميع بياناتها بنجاح', type: 'success' });
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء الحذف', type: 'error' });
    },
  });

  const clearCompanyDataMutation = useMutation({
    mutationFn: async ({ companyId, confirmText }: { companyId: string; confirmText: string }) => {
      const res = await fetch('/api/v1/superadmin/clear-company-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyId, confirmText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Clear company data failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_companies'] });
      addToast({ title: 'نجاح', description: 'تم تفريغ محادثات وبيانات الشركة المحددة بنجاح', type: 'success' });
      setClearingCompany(null);
      setClearConfirmText('');
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء تفريغ البيانات', type: 'error' });
    },
  });

  const addUserToCompanyMutation = useMutation({
    mutationFn: async ({ companyId, payload }: { companyId: string; payload: typeof companyUserForm }) => {
      const res = await fetch(`/api/v1/superadmin/companies/${companyId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          roleId: payload.roleId || undefined,
          trialDays: payload.trialDays ? parseInt(payload.trialDays, 10) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add user to company');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin_companies'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin_users'] });
      addToast({ title: 'نجاح', description: 'تمت إضافة المستخدم للشركة بنجاح', type: 'success' });
      setAddingUserToCompany(null);
      setCompanyUserForm({ name: '', email: '', password: '', roleId: '', trialDays: '' });
    },
    onError: (err: any) => {
      addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء إضافة المستخدم', type: 'error' });
    },
  });

  // Admin Mutations
  const deleteAdminMutation = useMutation({
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
      addToast({ title: 'نجاح', description: 'تم حذف المستخدم بنجاح', type: 'success' });
    },
    onError: () => addToast({ title: 'خطأ', description: 'حدث خطأ أثناء الحذف', type: 'error' }),
  });

  const updateAdminMutation = useMutation({
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
      addToast({ title: 'نجاح', description: 'تم تحديث الفترة التجريبية بنجاح', type: 'success' });
      setEditingAdmin(null);
    },
    onError: () => addToast({ title: 'خطأ', description: 'حدث خطأ أثناء التحديث', type: 'error' }),
  });

  const createAdminMutation = useMutation({
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
      addToast({ title: 'نجاح', description: 'تمت إضافة المشرف بنجاح', type: 'success' });
      setIsAddingAdmin(false);
      setNewAdmin({ name: '', email: '', password: '', trialDays: '' });
    },
    onError: (err: any) => addToast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء الإضافة', type: 'error' }),
  });

  // Factory Reset
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
    },
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
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    navigate('/super-admin/login');
  };

  // Filtered companies
  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q));
  });

  // Calculate totals
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === 'active').length;
  const totalUsers = companies.reduce((acc, c) => acc + (c.usersCount || 0), 0);
  const totalConversations = companies.reduce((acc, c) => acc + (c.conversationsCount || 0), 0);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 text-foreground">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Navbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Super Admin Dashboard</h1>
                <Badge variant="primary">Multi-Tenant</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                التحكم المركزي في الشركات والمستأجرين، الشعار، الصلاحيات، وإدارة النظام
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              leftIcon={<ExternalLink className="w-4 h-4" />}
            >
              الذهاب للتطبيق
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">إجمالي الشركات</span>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalCompanies}</div>
            <div className="text-[11px] text-emerald-500 font-medium">منظومات مسجلة ومفصولة</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">الشركات النشطة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCompanies}</div>
            <div className="text-[11px] text-muted-foreground">شركات تعمل بشكل مباشر</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">إجمالي المستخدمين</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalUsers}</div>
            <div className="text-[11px] text-muted-foreground">مشرفون وموظفون بالشركات</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">إجمالي المحادثات</span>
              <MessageSquare className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalConversations}</div>
            <div className="text-[11px] text-muted-foreground">محادثات عبر كل المستأجرين</div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-border pb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'companies'
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>إدارة الشركات والمستأجرين ({companies.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'admins'
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>مديرو النظام العام ({admins.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'system'
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>صيانة النظام وضبط المصنع</span>
            </button>
          </div>

          {activeTab === 'companies' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddCompanyModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              إضافة شركة جديدة
            </Button>
          )}

          {activeTab === 'admins' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddingAdmin(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              إضافة مشرف عام
            </Button>
          )}
        </div>

        {/* TAB 1: COMPANIES MANAGEMENT */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            {/* Search filter */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="البحث باسم الشركة أو المعرف (slug)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                إجمالي المعروض: <strong>{filteredCompanies.length}</strong> شركة
              </div>
            </div>

            {/* Companies Table */}
            <Card className="p-0 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border font-semibold text-muted-foreground">
                      <th className="py-4 px-6">الشركة والشعار</th>
                      <th className="py-4 px-6">المعرف (Slug)</th>
                      <th className="py-4 px-6">خطة الاشتراك</th>
                      <th className="py-4 px-6">الحالة</th>
                      <th className="py-4 px-6">المستخدمين / الحد</th>
                      <th className="py-4 px-6">المحادثات</th>
                      <th className="py-4 px-6">تاريخ الإنشاء</th>
                      <th className="py-4 px-6 text-center">الإجراءات والتحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isCompaniesLoading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          جاري تحميل الشركات...
                        </td>
                      </tr>
                    ) : filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <div>لا توجد شركات مسجلة مطابقة للبحث</div>
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-secondary/20 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {c.logoUrl ? (
                                <img
                                  src={c.logoUrl}
                                  alt={c.name}
                                  className="w-10 h-10 rounded-xl object-contain bg-card border border-border p-0.5"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-foreground">{c.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{c.timezone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-muted-foreground">
                            {c.slug || '—'}
                          </td>
                          <td className="py-4 px-6">
                            <Badge variant={c.subscriptionPlan === 'enterprise' ? 'primary' : 'secondary'}>
                              {c.subscriptionPlan.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            <Badge variant={c.status === 'active' ? 'success' : 'danger'}>
                              {c.status === 'active' ? 'نشطة' : c.status === 'suspended' ? 'موقوفة' : 'معطلة'}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs">
                            <span className="font-bold text-foreground">{c.usersCount || 0}</span> / {c.maxUsers}
                          </td>
                          <td className="py-4 px-6 font-mono text-xs">
                            <span className="font-bold text-foreground">{c.conversationsCount || 0}</span>
                          </td>
                          <td className="py-4 px-6 text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAddingUserToCompany(c)}
                                title="إضافة موظف/مشرف للشركة"
                                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                              >
                                موظف
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCompany(c)}
                                title="تعديل بيانات وهوية الشركة"
                                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                              >
                                تعديل
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setClearingCompany(c)}
                                title="تفريغ محادثات وبيانات هذه الشركة فقط"
                                leftIcon={<Eraser className="w-3.5 h-3.5" />}
                              >
                                تفريغ
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من حذف شركة "${c.name}" نهائياً وجميع بياناتها؟`)) {
                                    deleteCompanyMutation.mutate(c.id);
                                  }
                                }}
                                title="حذف الشركة بالكامل"
                                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              />
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
        )}

        {/* TAB 2: GLOBAL ADMINS */}
        {activeTab === 'admins' && (
          <div className="space-y-4">
            <Card className="p-0 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border font-semibold text-muted-foreground">
                      <th className="py-4 px-6">اسم المشرف</th>
                      <th className="py-4 px-6">البريد الإلكتروني</th>
                      <th className="py-4 px-6">نطاق العمل (الشركة)</th>
                      <th className="py-4 px-6">الحالة</th>
                      <th className="py-4 px-6">الفترة التجريبية</th>
                      <th className="py-4 px-6">آخر دخول</th>
                      <th className="py-4 px-6 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isAdminsLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          جاري تحميل المشرفين...
                        </td>
                      </tr>
                    ) : admins.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          لا يوجد مشرفون
                        </td>
                      </tr>
                    ) : (
                      admins.map((admin) => {
                        let remainingDays: number | null = null;
                        if (admin.trialEndsAt) {
                          const diff = new Date(admin.trialEndsAt).getTime() - Date.now();
                          remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        }

                        return (
                          <tr key={admin.id} className="hover:bg-secondary/20 transition">
                            <td className="py-4 px-6 font-semibold text-foreground">{admin.name}</td>
                            <td className="py-4 px-6 font-mono text-muted-foreground">{admin.email}</td>
                            <td className="py-4 px-6">
                              {admin.companyName ? (
                                <Badge variant="secondary">{admin.companyName}</Badge>
                              ) : (
                                <Badge variant="primary">Global (Super Admin)</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <Badge variant={admin.status === 'active' ? 'success' : 'danger'}>
                                {admin.status === 'active' ? 'نشط' : 'معطل'}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              {remainingDays !== null ? (
                                <span className={`font-medium ${remainingDays <= 3 ? 'text-destructive' : 'text-emerald-500'}`}>
                                  {remainingDays > 0 ? `${remainingDays} يوم متبقي` : 'منتهية'}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">دائم (غير محدد)</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-xs text-muted-foreground">
                              {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('ar-EG') : 'لم يدخل بعد'}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAdmin(admin);
                                    if (admin.trialEndsAt) {
                                      const diff = new Date(admin.trialEndsAt).getTime() - Date.now();
                                      const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                      setTrialDays(d > 0 ? d.toString() : '0');
                                    } else {
                                      setTrialDays('');
                                    }
                                  }}
                                  leftIcon={<Clock className="w-3.5 h-3.5" />}
                                >
                                  التجريبية
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('هل أنت متأكد من حذف هذا المشرف؟')) {
                                      deleteAdminMutation.mutate(admin.id);
                                    }
                                  }}
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: SYSTEM MAINTENANCE */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Eraser className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">تفريغ صندوق المحادثات العام</h3>
                  <p className="text-xs text-muted-foreground">حذف جميع الرسائل والمحادثات لجميع الشركات مع إبقاء المستخدمين</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsClearInboxModalOpen(true)}
                leftIcon={<Eraser className="w-4 h-4" />}
              >
                بدء تفريغ صندوق المحادثات
              </Button>
            </Card>

            <Card className="p-6 space-y-4 border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-destructive">إعادة ضبط المصنع الكاملة</h3>
                  <p className="text-xs text-muted-foreground">حذف كل شيء بالكامل وإعادة المنظومة لحالتها الأولى</p>
                </div>
              </div>
              <Button
                variant="danger"
                onClick={() => setIsResetModalOpen(true)}
                leftIcon={<AlertTriangle className="w-4 h-4" />}
              >
                إعادة ضبط المصنع
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: ADD COMPANY */}
      <Modal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        title="إضافة شركة جديدة (Provision Company)"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCompanyMutation.mutate(newCompany);
          }}
          className="space-y-4 text-right"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="اسم الشركة *"
              required
              value={newCompany.name}
              onChange={(e) => {
                const name = e.target.value;
                const autoSlug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                setNewCompany({ ...newCompany, name, slug: newCompany.slug || autoSlug });
              }}
              placeholder="مثال: شركة النور للرعاية"
            />
            <Input
              label="المعرف البرمجي (Slug) *"
              required
              value={newCompany.slug}
              onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value })}
              placeholder="al-noor-care"
            />
          </div>

          <Input
            label="رابط شعار الشركة (Logo URL)"
            value={newCompany.logoUrl}
            onChange={(e) => setNewCompany({ ...newCompany, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="خطة الاشتراك"
              value={newCompany.subscriptionPlan}
              onChange={(e) => setNewCompany({ ...newCompany, subscriptionPlan: e.target.value })}
            >
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </Select>
            <Input
              label="الحد الأقصى للمستخدمين"
              type="number"
              min="1"
              value={newCompany.maxUsers}
              onChange={(e) => setNewCompany({ ...newCompany, maxUsers: parseInt(e.target.value, 10) || 10 })}
            />
            <Select
              label="المنطقة الزمنية"
              value={newCompany.timezone}
              onChange={(e) => setNewCompany({ ...newCompany, timezone: e.target.value })}
            >
              <option value="Asia/Kuwait">الكويت (GMT+3)</option>
              <option value="Asia/Riyadh">الرياض (GMT+3)</option>
              <option value="Asia/Dubai">دبي (GMT+4)</option>
              <option value="Africa/Cairo">القاهرة (GMT+2)</option>
            </Select>
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <div className="text-xs font-bold text-foreground">بيانات المشرف الرئيسي الأول للشركة (اختياري)</div>
            <Input
              label="اسم مدير الشركة"
              value={newCompany.adminName}
              onChange={(e) => setNewCompany({ ...newCompany, adminName: e.target.value })}
              placeholder="مدير النظام"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={newCompany.adminEmail}
                onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                placeholder="admin@company.com"
              />
              <Input
                label="كلمة المرور"
                type="password"
                value={newCompany.adminPassword}
                onChange={(e) => setNewCompany({ ...newCompany, adminPassword: e.target.value })}
                placeholder="Password123!"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddCompanyModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" isLoading={createCompanyMutation.isPending}>
              إنشاء وتجهيز الشركة
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT COMPANY */}
      {editingCompany && (
        <Modal
          isOpen={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          title={`تعديل شركة: ${editingCompany.name}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateCompanyMutation.mutate({
                id: editingCompany.id,
                updates: {
                  name: editingCompany.name,
                  slug: editingCompany.slug,
                  logoUrl: editingCompany.logoUrl,
                  status: editingCompany.status,
                  subscriptionPlan: editingCompany.subscriptionPlan,
                  maxUsers: editingCompany.maxUsers,
                  timezone: editingCompany.timezone,
                },
              });
            }}
            className="space-y-4 text-right"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="اسم الشركة *"
                required
                value={editingCompany.name}
                onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
              />
              <Input
                label="المعرف البرمجي (Slug) *"
                required
                value={editingCompany.slug || ''}
                onChange={(e) => setEditingCompany({ ...editingCompany, slug: e.target.value })}
              />
            </div>

            <Input
              label="رابط الشعار (Logo URL)"
              value={editingCompany.logoUrl || ''}
              onChange={(e) => setEditingCompany({ ...editingCompany, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="الحالة"
                value={editingCompany.status}
                onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value as any })}
              >
                <option value="active">نشطة (Active)</option>
                <option value="suspended">موقوفة (Suspended)</option>
                <option value="inactive">معطلة (Inactive)</option>
              </Select>
              <Select
                label="خطة الاشتراك"
                value={editingCompany.subscriptionPlan}
                onChange={(e) => setEditingCompany({ ...editingCompany, subscriptionPlan: e.target.value })}
              >
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </Select>
              <Input
                label="الحد الأقصى للمستخدمين"
                type="number"
                min="1"
                value={editingCompany.maxUsers}
                onChange={(e) => setEditingCompany({ ...editingCompany, maxUsers: parseInt(e.target.value, 10) || 10 })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setEditingCompany(null)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" isLoading={updateCompanyMutation.isPending}>
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD USER TO COMPANY */}
      {addingUserToCompany && (
        <Modal
          isOpen={!!addingUserToCompany}
          onClose={() => setAddingUserToCompany(null)}
          title={`إضافة مستخدم لشركة: ${addingUserToCompany.name}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addUserToCompanyMutation.mutate({
                companyId: addingUserToCompany.id,
                payload: companyUserForm,
              });
            }}
            className="space-y-4 text-right"
          >
            <Input
              label="الاسم الكامل *"
              required
              value={companyUserForm.name}
              onChange={(e) => setCompanyUserForm({ ...companyUserForm, name: e.target.value })}
              placeholder="مثال: سارة أحمد"
            />
            <Input
              label="البريد الإلكتروني *"
              type="email"
              required
              value={companyUserForm.email}
              onChange={(e) => setCompanyUserForm({ ...companyUserForm, email: e.target.value })}
              placeholder="agent@company.com"
            />
            <Input
              label="كلمة المرور *"
              type="password"
              required
              value={companyUserForm.password}
              onChange={(e) => setCompanyUserForm({ ...companyUserForm, password: e.target.value })}
              placeholder="••••••••"
            />
            <Input
              label="الأيام التجريبية (اختياري - اتركه فارغاً للوصول الدائم)"
              type="number"
              min="1"
              value={companyUserForm.trialDays}
              onChange={(e) => setCompanyUserForm({ ...companyUserForm, trialDays: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setAddingUserToCompany(null)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" isLoading={addUserToCompanyMutation.isPending}>
                إضافة المستخدم
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CLEAR COMPANY DATA */}
      {clearingCompany && (
        <Modal
          isOpen={!!clearingCompany}
          onClose={() => setClearingCompany(null)}
          title={`تفريغ بيانات شركة: ${clearingCompany.name}`}
        >
          <div className="space-y-4 text-right">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
              سيتم حذف جميع المحادثات والرسائل والعملاء التابعين لشركة <strong>{clearingCompany.name}</strong> فقط.
              لن تتأثر أي شركة أخرى، وستبقى حسابات الموظفين والصلاحيات كما هي.
            </div>
            <p className="text-xs text-muted-foreground">
              لتأكيد العملية، يرجى كتابة كلمة <strong>تفريغ</strong> في الحقل أدناه:
            </p>
            <Input
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="اكتب 'تفريغ' هنا"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setClearingCompany(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                disabled={clearConfirmText !== 'تفريغ'}
                isLoading={clearCompanyDataMutation.isPending}
                onClick={() =>
                  clearCompanyDataMutation.mutate({
                    companyId: clearingCompany.id,
                    confirmText: clearConfirmText,
                  })
                }
              >
                تأكيد تفريغ بيانات الشركة
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: EDIT ADMIN TRIAL */}
      {editingAdmin && (
        <Modal isOpen={!!editingAdmin} onClose={() => setEditingAdmin(null)} title="تعديل الفترة التجريبية">
          <div className="space-y-4 text-right">
            <p className="text-sm text-muted-foreground">
              تعديل عدد الأيام التجريبية للمشرف: <strong>{editingAdmin.name}</strong> ({editingAdmin.email})
            </p>
            <Input
              label="عدد الأيام التجريبية (اتركه فارغاً لجعله دائماً)"
              type="number"
              min="0"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="مثال: 14"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingAdmin(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                isLoading={updateAdminMutation.isPending}
                onClick={() => {
                  const days = trialDays.trim() === '' ? null : parseInt(trialDays, 10);
                  updateAdminMutation.mutate({ id: editingAdmin.id, trialDays: days });
                }}
              >
                حفظ
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: ADD GLOBAL ADMIN */}
      <Modal isOpen={isAddingAdmin} onClose={() => setIsAddingAdmin(false)} title="إضافة مشرف عام (Global Super Admin)">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAdminMutation.mutate(newAdmin);
          }}
          className="space-y-4 text-right"
        >
          <Input
            label="الاسم *"
            required
            value={newAdmin.name}
            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            placeholder="مثال: مدير عام"
          />
          <Input
            label="البريد الإلكتروني *"
            type="email"
            required
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            placeholder="admin@crm.com"
          />
          <Input
            label="كلمة المرور *"
            type="password"
            required
            value={newAdmin.password}
            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
            placeholder="••••••••"
          />
          <Input
            label="عدد الأيام التجريبية (اختياري)"
            type="number"
            min="1"
            value={newAdmin.trialDays}
            onChange={(e) => setNewAdmin({ ...newAdmin, trialDays: e.target.value })}
            placeholder="اتركه فارغاً لحساب دائم"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddingAdmin(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" isLoading={createAdminMutation.isPending}>
              إنشاء المشرف العام
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CLEAR INBOX */}
      <Modal
        isOpen={isClearInboxModalOpen}
        onClose={() => setIsClearInboxModalOpen(false)}
        title="تفريغ صندوق المحادثات العام"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-muted-foreground leading-relaxed">
            سيتم تفريغ جميع رسائل الواتساب والمحادثات لجميع الشركات. لتأكيد العملية، اكتب <strong>تفريغ</strong> أدناه:
          </p>
          <Input
            value={clearInboxConfirmText}
            onChange={(e) => setClearInboxConfirmText(e.target.value)}
            placeholder="اكتب كلمة 'تفريغ' هنا"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsClearInboxModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="secondary"
              disabled={clearInboxConfirmText !== 'تفريغ'}
              isLoading={clearInboxMutation.isPending}
              onClick={() => clearInboxMutation.mutate()}
            >
              تأكيد التفريغ
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: FACTORY RESET */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="إعادة ضبط المصنع الشاملة">
        <div className="space-y-4 text-right">
          <p className="text-xs text-destructive leading-relaxed">
            تحذير شديد: سيتم حذف جميع الشركات والمحادثات والمستخدمين بالكامل. لتأكيد العملية، اكتب <strong>حذف شامل</strong> أدناه:
          </p>
          <Input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="اكتب 'حذف شامل' هنا"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              disabled={resetConfirmText !== 'حذف شامل'}
              isLoading={factoryResetMutation.isPending}
              onClick={() => factoryResetMutation.mutate()}
            >
              تأكيد ضبط المصنع
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
