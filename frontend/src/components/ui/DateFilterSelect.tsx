import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Clock } from 'lucide-react';

export type DateFilterPreset = 'all' | 'today' | '24h' | '7d' | '30d' | 'this_month';

export interface DateFilterOption {
  id: DateFilterPreset;
  label: string;
  sublabel?: string;
}

export const DEFAULT_DATE_PRESETS: DateFilterOption[] = [
  { id: 'all', label: 'كافة الفترات', sublabel: 'سجلات المحادثات والعمليات كاملة' },
  { id: 'today', label: 'اليوم فقط', sublabel: 'منذ بداية يوم العمل الحالي' },
  { id: '24h', label: 'آخر 24 ساعة', sublabel: 'الأنشطة والتحديثات اللحظية' },
  { id: '7d', label: 'آخر 7 أيام', sublabel: 'الأسبوع المنصرم' },
  { id: 'this_month', label: 'هذا الشهر', sublabel: 'إحصائيات الشهر الحالي' },
  { id: '30d', label: 'آخر 30 يوماً', sublabel: 'نظرة تشغيلية شاملة للشهر' },
];

interface DateFilterSelectProps {
  value: DateFilterPreset;
  onChange: (preset: DateFilterPreset) => void;
  options?: DateFilterOption[];
  className?: string;
  size?: 'sm' | 'md';
}

export const DateFilterSelect: React.FC<DateFilterSelectProps> = ({
  value,
  onChange,
  options = DEFAULT_DATE_PRESETS,
  className = '',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((opt) => opt.id === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const sizeClasses = size === 'sm' ? 'h-9 px-2.5 text-xs' : 'h-10 px-3 text-xs';

  return (
    <div ref={containerRef} className={`relative inline-block text-right ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-xl border bg-card/90 hover:bg-card text-foreground font-semibold shadow-xs transition-all duration-200 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          isOpen ? 'border-primary ring-2 ring-primary/20 bg-card' : 'border-border'
        } ${sizeClasses}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate max-w-[130px]">{activeOption.label}</span>
        <div className="w-5 h-5 rounded-md bg-secondary/60 flex items-center justify-center text-muted-foreground mr-auto shrink-0 transition-transform duration-200">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-card border border-border shadow-soft z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
        >
          <div className="px-2.5 py-1.5 border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-primary" />
            <span>تصفية النطاق الزمني</span>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto space-y-0.5">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold shadow-xs'
                      : 'text-foreground hover:bg-secondary/70 font-medium'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex flex-col">
                    <span className="text-xs leading-snug">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-[10px] text-muted-foreground font-normal leading-tight mt-0.5">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mr-2 shadow-xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
