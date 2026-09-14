import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: any;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'حدث خطأ أثناء تحميل البيانات',
  message = 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك والمحاولة مجدداً.',
  onRetry,
  isRetrying = false,
}) => {
  const displayMsg = typeof message === 'string'
    ? message
    : (message?.message || message?.error || (typeof message === 'object' ? JSON.stringify(message) : 'حدث خطأ غير متوقع'));

  return (
    <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center bg-card border border-destructive/20 rounded-2xl shadow-soft">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3.5 border border-destructive/20 shadow-sm">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">{displayMsg}</p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}
    </div>
  );
};
