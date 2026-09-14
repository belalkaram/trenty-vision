import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Floating Toasts View */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((toast) => {
          const bgColors = {
            success: 'bg-emerald-600 text-white shadow-emerald-600/20',
            error: 'bg-rose-600 text-white shadow-rose-600/20',
            warning: 'bg-amber-600 text-white shadow-amber-600/20',
            info: 'bg-sidebar text-sidebar-foreground border border-sidebar-border shadow-soft',
          };

          const Icon = {
            success: CheckCircle,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl shadow-lift text-xs font-medium transition-all pointer-events-auto flex items-center justify-between gap-3 rise-in ${bgColors[toast.type]}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="leading-relaxed">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-1 rounded-lg transition"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
