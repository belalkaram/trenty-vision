import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) => {
  const switchId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-foreground">{label}</span>}
          {description && <span className="text-[11px] text-muted-foreground">{description}</span>}
        </div>
      )}
      <div className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </div>
    </label>
  );
};
