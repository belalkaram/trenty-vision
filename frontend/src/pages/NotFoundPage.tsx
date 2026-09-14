import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { HelpCircle, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6 bg-background text-foreground">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-lift space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto border border-border">
          <HelpCircle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">الصفحة غير موجودة (404)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            الصفحة التي تحاول الوصول إليها غير متوفرة أو تم نقلها.
          </p>
        </div>
        <Link to="/">
          <Button variant="primary" size="md" leftIcon={<ArrowRight className="w-4 h-4" />} className="w-full">
            العودة للوحة التحكم
          </Button>
        </Link>
      </div>
    </div>
  );
};
