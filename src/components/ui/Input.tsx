import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  id,
  className = '',
  ...props
}) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-hc-text">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-hc-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-hc-surface border rounded-lg text-sm text-hc-text
            placeholder:text-hc-muted
            transition-colors duration-150
            focus:outline-none focus:border-hc-purple
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-hc-red' : 'border-hc-border'}
            ${leftIcon ? 'pl-9' : 'px-3'}
            ${rightIcon ? 'pr-9' : ''}
            py-2 h-9
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-hc-muted">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-hc-red">{error}</p>}
      {hint && !error && <p className="text-xs text-hc-muted">{hint}</p>}
    </div>
  );
};
