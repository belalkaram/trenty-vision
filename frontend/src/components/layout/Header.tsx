import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LogOut, User as UserIcon, Radio, Bell } from 'lucide-react';
import { remindersService } from '@/services/reminders.service';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersService.list(),
    refetchInterval: 15000,
  });

  const dueOrPendingCount = reminders.filter(
    (r) => r.status === 'pending' || r.status === 'overdue'
  ).length;

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-soft">
      {/* Title & Subtitle */}
      <div>
        {title && (
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground leading-tight">{title}</h1>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>
        )}
      </div>

      {/* Right Controls: Actions, WS Status, Reminders Bell & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Reminders Notification Bell */}
        <button
          onClick={() => navigate('/reminders')}
          className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition"
          title="التذكيرات والمتابعات"
          aria-label="التذكيرات والمتابعات"
        >
          <Bell className="w-4 h-4" />
          {dueOrPendingCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-xs">
              {dueOrPendingCount > 9 ? '9+' : dueOrPendingCount}
            </span>
          )}
        </button>

        {/* Realtime Status Indicator */}
        <div
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition ${
            isConnected
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}
          title={isConnected ? 'متصل بالخادم في الوقت الفعلي' : 'جاري محاولة استعادة الاتصال...'}
        >
          <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-primary' : 'text-amber-500'}`} />
          <span>{isConnected ? 'LIVE SYNC' : 'RECONNECTING'}</span>
        </div>

        {/* User profile & Logout */}
        {user && (
          <div className="flex items-center gap-2 pr-2 border-r border-border/80">
            <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs border border-border">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-foreground leading-tight truncate max-w-[120px]">
                {user.fullName}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {user.roleName || user.role}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
