import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Smartphone, Bell, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { remindersService } from '@/services/reminders.service';

export const MobileNav: React.FC = () => {
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersService.list(),
    refetchInterval: 15000,
  });

  const remList = Array.isArray(reminders) ? reminders : [];
  const pendingCount = remList.filter((r) => r && r.status === 'pending').length;

  const items = [
    { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
    { to: '/inbox', label: 'المحادثات', icon: MessageSquare },
    { to: '/reminders', label: 'التذكيرات', icon: Bell, badgeCount: pendingCount },
    { to: '/whatsapp', label: 'واتساب', icon: Smartphone },
    { to: '/settings', label: 'المزيد', icon: Menu },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lift px-2 py-1 pb-safe flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center p-2 rounded-xl transition text-[10px] font-semibold min-w-[56px] ${
                isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {item.badgeCount > 9 ? '9+' : item.badgeCount}
                </span>
              ) : null}
            </div>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
