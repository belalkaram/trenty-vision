import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  sizeVariant?: 'sm' | 'md' | 'lg';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  placeholder = 'اختر من القائمة...',
  value,
  onChange,
  options,
  error,
  helperText,
  icon,
  searchable = false,
  disabled = false,
  className = '',
  sizeVariant = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const sizeClasses = {
    sm: 'h-9 text-xs px-3',
    md: 'h-11 text-xs sm:text-sm px-3.5',
    lg: 'h-12 text-sm px-4',
  }[sizeVariant];

  return (
    <div ref={containerRef} className={`w-full space-y-1.5 relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-foreground select-none">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full ${sizeClasses} rounded-xl bg-card/80 hover:bg-card border flex items-center justify-between text-right font-medium transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? 'border-destructive ring-2 ring-destructive/20'
            : isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-card'
            : 'border-border hover:border-primary/40'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && (
                <span className="shrink-0">{selectedOption.icon}</span>
              )}
              <span className="truncate text-foreground font-semibold">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-secondary-foreground shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        {/* Styled Chevron Dropdown Trigger Pill */}
        <div className="w-6 h-6 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground transition-all duration-200 shrink-0 mr-auto group-hover:text-primary">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-50 right-0 left-0 mt-1.5 rounded-2xl bg-card border border-border shadow-soft p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col"
          role="listbox"
        >
          {searchable && (
            <div className="relative p-1 border-b border-border/60">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في الخيارات..."
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="overflow-y-auto flex-1 space-y-0.5 max-h-56 py-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                لا توجد خيارات مطابقة
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-xs'
                        : 'text-foreground hover:bg-secondary/70 font-medium'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mr-2">
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-muted-foreground">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
};
