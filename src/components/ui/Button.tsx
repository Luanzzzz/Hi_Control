import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'bg-hc-purple text-white hover:bg-hc-purple/90 focus-visible:ring-hc-purple',
    secondary:
      'bg-hc-surface text-hc-text border border-hc-border hover:bg-hc-hover focus-visible:ring-hc-purple',
    ghost:
      'bg-transparent text-hc-muted hover:text-hc-text hover:bg-hc-hover focus-visible:ring-hc-purple',
    danger:
      'bg-hc-red text-white hover:bg-hc-red/90 focus-visible:ring-hc-red',
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 h-7',
    md: 'text-sm px-3.5 py-2 h-9',
    lg: 'text-sm px-4 py-2.5 h-10',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
};
