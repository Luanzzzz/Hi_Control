import React from 'react';

interface LoadingStateProps {
  /** Tamanho do spinner em pixels */
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  message,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}
      aria-label={message ?? 'Carregando'}
      role="status"
    >
      <div
        className={`${sizeMap[size]} border-hc-purple border-t-transparent rounded-full animate-spin`}
      />
      {message && <p className="text-xs text-hc-muted">{message}</p>}
    </div>
  );
};
