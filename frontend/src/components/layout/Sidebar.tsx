import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  Bell,
  Users,
  GitFork,
  Bot,
  BarChart3,
  Settings,
  ShieldCheck,
  PanelRightClose,
  PanelRightOpen,
  Building2,
  Contact,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  end?: boolean;
}

// Full CRM navigation
const crmNavSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'مساحة التشغيل',
    items: [
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
      { to: '/inbox', label: 'صندوق المحادثات', icon: MessageSquare, badge: 'LIVE' },
      { to: '/reminders', label: 'التذكيرات والمتابعات', icon: Bell },
      { to: '/whatsapp', label: 'بوابة واتساب', icon: Smartphone },
    ],
  },
  {
    title: 'إدارة الفريق',
    items: [
      { to: '/employees', label: 'فريق العمل', icon: Users },
      { to: '/departments', label: 'الأقسام', icon: Building2 },
      { to: '/stations', label: 'محطات التوزيع', icon: GitFork },
      { to: '/automations', label: 'الأتمتة والردود', icon: Bot },
      { to: '/reports', label: 'تقارير وتحليلات', icon: BarChart3 },
      { to: '/contacts', label: 'سجل العملاء', icon: Contact },
    ],
  },
  {
    title: 'النظام',
    items: [
      { to: '/settings', label: 'إعدادات النظام', icon: Settings },
      { to: '/audit', label: 'سجل التدقيق', icon: ShieldCheck },
    ],
  },
];

// Group Manager navigation (limited to 3 pages)
const groupManagerNavSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'إدارة الجروبات',
    items: [
      { to: '/whatsapp', label: 'بوابة واتساب', icon: Smartphone, end: false },
      { to: '/group-extract', label: 'استخراج الأشخاص', icon: UserMinus },
      { to: '/group-add', label: 'إضافة إلى الجروبات', icon: UserPlus },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { isCollapsed, collapseSidebar, expandSidebar } = useSidebar();
  const { user } = useAuth();
  const { company: contextCompany, isSuperAdmin } = useCompany();
  const [logoError, setLogoError] = React.useState(false);

  const company = user?.company || contextCompany;
  const companyName = company?.name || 'WhatsApp CRM';
  const companyLogo = company?.logoUrl || '/public/icons/logo.png';

  const companyType = user?.company?.type || company?.type || 'crm';

  const navSections = React.useMemo(() => {
    const baseSections = companyType === 'group_manager' ? groupManagerNavSections : crmNavSections;
    const sections = [...baseSections];
    if (isSuperAdmin) {
      sections.push({
        title: 'الإدارة العامة (Global)',
        items: [
          { to: '/super-admin', label: 'إدارة الشركات والنظام', icon: ShieldCheck, badge: 'GLOBAL' },
        ],
      });
    }
    return sections;
  }, [isSuperAdmin, companyType]);

  if (isCollapsed) {
    return (
      <aside className="hidden md:flex flex-col w-[68px] bg-sidebar text-sidebar-foreground border-l border-sidebar-border p-2 justify-between shrink-0 select-none transition-all duration-300 items-center z-20">
        <div className="space-y-3 overflow-y-auto w-full flex flex-col items-center">
          {/* Logo & Quick Expand Button */}
          <div className="py-2 border-b border-sidebar-border/40 pb-3 w-full flex flex-col items-center gap-2 shrink-0">
            {!logoError ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-9 h-9 rounded-xl object-contain shadow-soft border border-sidebar-border bg-[#1a1f26] p-0.5 shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={expandSidebar}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-primary transition shrink-0"
              title="توسيع القائمة الجانبية (فتح)"
              aria-label="توسيع القائمة الجانبية"
            >
              <PanelRightOpen className="w-4 h-4 text-primary" />
            </button>
          </div>

          {/* Mini Nav Item Icons */}
          <div className="space-y-1.5 w-full flex flex-col items-center">
            {navSections.flatMap((s) => s.items).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) =>
                    `w-10 h-10 flex items-center justify-center rounded-xl transition text-xs font-semibold relative ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary shadow-sm border border-sidebar-border/40'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0 opacity-85" />
                  {item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-sidebar" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Footer Glow */}
        <div className="py-3 border-t border-sidebar-border/60 w-full flex justify-center shrink-0" title="النظام متصل وجاهز">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-l border-sidebar-border p-4 justify-between shrink-0 select-none transition-all duration-300">
      <div className="space-y-4 overflow-y-auto">
        {/* Brand Mark & Close Sidebar Action */}
        <div className="flex items-center justify-between gap-3 px-2 py-2 border-b border-sidebar-border/40 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            {!logoError ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-10 h-10 rounded-xl object-contain shadow-soft border border-sidebar-border bg-[#1a1f26] p-0.5 shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-base border border-primary/30 shrink-0">
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none truncate" title={companyName}>
                {companyName}
              </div>
              <div className="text-[10px] text-sidebar-foreground/60 font-mono mt-1 uppercase tracking-wider truncate">
                {isSuperAdmin ? 'Super Admin' : companyType === 'group_manager' ? 'إدارة الجروبات' : 'منظومة إدارة واتساب'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={collapseSidebar}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition shrink-0"
            title="إغلاق القائمة الجانبية لتوسيع الشاشة"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-sidebar-foreground/50 px-3 py-1 font-semibold">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl transition text-xs font-semibold ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary font-bold shadow-sm border border-sidebar-border/40'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 opacity-80" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-sidebar-primary font-bold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Indicator */}
      <div className="pt-4 border-t border-sidebar-border/60">
        <div className="flex items-center gap-2 px-3 text-[11px] text-sidebar-foreground/60 font-mono">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span>SYSTEM READY • DESK V2</span>
        </div>
      </div>
    </aside>
  );
};
