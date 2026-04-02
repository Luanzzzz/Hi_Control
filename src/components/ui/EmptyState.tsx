import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 px-6 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      <div className="text-hc-muted/50">
        {icon ?? <Inbox size={32} />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-hc-text">{title}</p>
        {description && (
          <p className="text-xs text-hc-muted max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
