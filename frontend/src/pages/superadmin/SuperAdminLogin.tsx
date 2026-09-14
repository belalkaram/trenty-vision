import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { ShieldAlert } from 'lucide-react';

export const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('superadmin_token', data.token);
        addToast({ title: 'نجاح', description: 'تم تسجيل الدخول بنجاح', type: 'success' });
        navigate('/super-admin');
      } else {
        addToast({ title: 'خطأ', description: data.error || 'بيانات الدخول غير صحيحة', type: 'error' });
      }
    } catch (err) {
      addToast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">Authorized access only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">البريد الإلكتروني</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full text-left"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">كلمة المرور</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full text-left"
              dir="ltr"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold rounded-xl shadow-soft"
            isLoading={isLoading}
          >
            تسجيل الدخول
          </Button>
        </form>
      </Card>
    </div>
  );
};
