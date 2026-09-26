import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { MessageSquare, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_email');
      if (saved) {
        setEmail(saved);
      }
    } catch {}
  }, []);

  if (user) {
    const isGroupManager = user.company?.type === 'group_manager';
    return <Navigate to={isGroupManager ? '/group-extract' : '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const loggedInUser = await login(email, password, rememberMe);
      
      if (loggedInUser.remainingTrialDays !== undefined && loggedInUser.remainingTrialDays !== null) {
        success(`عدد الايام التجريبية المتبقية هي : ${loggedInUser.remainingTrialDays}`);
      } else {
        success('تم تسجيل الدخول بنجاح');
      }
      
      const isGroupManager = loggedInUser.company?.type === 'group_manager';
      navigate(isGroupManager ? '/group-extract' : '/', { replace: true });
    } catch (err: any) {
      const raw = err?.message || 'فشل التحقق من بيانات الدخول، يرجى المحاولة ثانية';
      const msg = typeof raw === 'string' ? raw : (raw?.message || (typeof raw === 'object' ? JSON.stringify(raw) : 'فشل التحقق من بيانات الدخول، يرجى المحاولة ثانية'));
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const savedCompany = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('active_company');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const companyName = savedCompany?.name || 'منظومة إدارة واتساب المتكاملة';
  const companyLogo = savedCompany?.logoUrl || '/public/icons/logo.png';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sidebar/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1f26] flex items-center justify-center mx-auto mb-4 shadow-lift border border-sidebar-border p-1">
            <img
              src={companyLogo}
              alt={companyName}
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {companyName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            منظومة إدارة محادثات واتساب وخدمة العملاء والعمليات
          </p>
          <div className="mt-2.5">
            <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              SECURE OPERATOR ACCESS
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lift">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="البريد الإلكتروني للتشغيل"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="operator@trentyvision.com"
              className="font-mono text-xs"
            />

            <Input
              label="رمز المرور السري"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="font-mono text-xs"
            />

            {/* Remember Me Option */}
            <div className="flex items-center justify-between text-xs pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="font-medium text-foreground">تذكرني (البقاء متصلاً لمدة 365 يوم)</span>
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<LogIn className="w-4 h-4" />}
              className="w-full mt-2"
            >
              دخول المنظومة
            </Button>
          </form>

        </div>

        {/* Footnote */}
        <div className="mt-6 text-center text-[11px] font-mono text-muted-foreground flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span>PROTECTED BY RBAC AUDIT SUBSYSTEM</span>
        </div>
      </div>
    </div>
  );
};
