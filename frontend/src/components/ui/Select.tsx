import React, { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string; id?: string } }) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  sizeVariant?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(({
  label,
  error,
  helperText,
  options: propOptions,
  children,
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  id,
  disabled = false,
  className = '',
  sizeVariant = 'md',
  placeholder = 'اختر من القائمة...',
  required,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | number>(
    controlledValue !== undefined ? controlledValue : (defaultValue ?? '')
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Extract options from props.options OR React.Children (<option>)
  const parsedOptions: SelectOption[] = useMemo(() => {
    if (propOptions && propOptions.length > 0) {
      return propOptions;
    }
    const opts: SelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const p = child.props as any;
        opts.push({
          value: p.value !== undefined ? p.value : '',
          label: String(p.children || p.value || ''),
          disabled: p.disabled,
        });
      }
    });
    return opts;
  }, [propOptions, children]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentValStr = String(internalValue ?? '');
  const selectedOption = parsedOptions.find(
    (opt) => String(opt.value) === currentValStr
  ) || (parsedOptions.length > 0 && currentValStr === '' ? parsedOptions[0] : undefined);

  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (val: string | number) => {
    setInternalValue(val);
    setIsOpen(false);
    onChange?.({
      target: {
        value: String(val),
        name,
        id: selectId,
      },
    });
  };

  const sizeClasses = {
    sm: 'h-9 text-xs px-3',
    md: 'h-11 text-xs sm:text-sm px-3.5',
    lg: 'h-12 text-sm px-4',
  }[sizeVariant];

  return (
    <div ref={containerRef} className="w-full space-y-1.5 relative group text-right">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-foreground select-none transition-colors group-focus-within:text-primary"
        >
          {label}
          {required && <span className="text-destructive mr-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Custom Dropdown Trigger Button */}
        <button
          ref={ref}
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full ${sizeClasses} rounded-xl bg-card/90 hover:bg-card border text-right font-medium transition-all duration-200 shadow-xs flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-destructive ring-2 ring-destructive/20'
              : isOpen
              ? 'border-primary ring-2 ring-primary/20 bg-card'
              : 'border-border hover:border-primary/40'
          } ${className}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={`truncate ${selectedOption ? 'text-foreground font-semibold' : 'text-muted-foreground font-normal'}`}>
            {displayLabel}
          </span>

          {/* Single, Clean Chevron Dropdown Indicator */}
          <div className="w-5 h-5 rounded-md bg-secondary/60 flex items-center justify-center text-muted-foreground mr-auto shrink-0 transition-colors group-hover:text-primary">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </div>
        </button>

        {/* Custom Floating Popover Menu */}
        {isOpen && (
          <div
            className="absolute z-50 right-0 left-0 mt-1.5 rounded-2xl bg-card border border-border shadow-soft p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto"
            role="listbox"
          >
            {parsedOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                لا توجد خيارات متاحة
              </div>
            ) : (
              parsedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(selectedOption?.value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center justify-between transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-xs'
                        : 'text-foreground hover:bg-secondary/70 font-medium'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mr-2 shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
