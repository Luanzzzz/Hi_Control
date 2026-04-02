import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface InlineAlertProps {
  variant: AlertVariant;
  message: string;
  onDismiss?: () => void;
}

const variantConfig: Record<
  AlertVariant,
  { icon: React.ElementType; classes: string }
> = {
  success: {
    icon: CheckCircle,
    classes:
      'bg-hc-success/10 text-hc-success border-hc-success/25',
  },
  error: {
    icon: AlertCircle,
    classes:
      'bg-hc-red/10 text-hc-red border-hc-red/25',
  },
  warning: {
    icon: AlertTriangle,
    classes:
      'bg-hc-amber/10 text-hc-amber border-hc-amber/25',
  },
  info: {
    icon: Info,
    classes:
      'bg-hc-info/10 text-hc-info border-hc-info/25',
  },
};

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant,
  message,
  onDismiss,
}) => {
  const { icon: Icon, classes } = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${classes}`}
    >
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fechar alerta"
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
