import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  hint,
  placeholder,
  id,
  className = '',
  ...props
}) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-hc-text">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full appearance-none bg-hc-surface border rounded-lg text-sm text-hc-text
            transition-colors duration-150
            focus:outline-none focus:border-hc-purple
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-hc-red' : 'border-hc-border'}
            px-3 pr-8 py-2 h-9
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hc-muted pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-hc-red">{error}</p>}
      {hint && !error && <p className="text-xs text-hc-muted">{hint}</p>}
    </div>
  );
};
