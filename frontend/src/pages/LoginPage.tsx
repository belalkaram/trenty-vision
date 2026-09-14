import React, { useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await login(email, password);
      
      if (user.remainingTrialDays !== undefined && user.remainingTrialDays !== null) {
        success(`عدد الايام التجريبية المتبقية هي : ${user.remainingTrialDays}`);
      } else {
        success('تم تسجيل الدخول بنجاح');
      }
      
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل التحقق من بيانات الدخول، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              src="/public/icons/logo.png"
              alt="Trenty Vision"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Trenty Vision Operations Desk
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            منظومة إدارة محادثات واتساب وخدمات الرعاية الصحية والعمليات
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

            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
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
