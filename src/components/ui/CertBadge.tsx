import React from 'react';
import { ShieldCheck, ShieldOff, ShieldAlert, AlertTriangle } from 'lucide-react';

interface CertBadgeProps {
  validade?: string | null;
  /** Modo compacto — exibe apenas ícone + texto curto */
  compact?: boolean;
}

function getStatus(validade?: string | null) {
  if (!validade) return 'ausente' as const;
  const dias = Math.ceil(
    (new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (dias <= 0) return 'vencido' as const;
  if (dias <= 30) return 'expirando' as const;
  return 'ativo' as const;
}

const config = {
  ativo: {
    icon: ShieldCheck,
    label: 'Ativo',
    classes: 'bg-hc-green/15 text-hc-green border-hc-green/20',
  },
  expirando: {
    icon: AlertTriangle,
    label: (dias: number) => `${dias}d`,
    classes: 'bg-hc-amber/15 text-hc-amber border-hc-amber/20',
  },
  vencido: {
    icon: ShieldOff,
    label: 'Vencido',
    classes: 'bg-hc-red/15 text-hc-red border-hc-red/20',
  },
  ausente: {
    icon: ShieldAlert,
    label: 'Sem Cert.',
    classes: 'bg-hc-muted/15 text-hc-muted border-hc-muted/20',
  },
} as const;

export const CertBadge: React.FC<CertBadgeProps> = ({ validade, compact = false }) => {
  const status = getStatus(validade);
  const cfg = config[status];
  const Icon = cfg.icon;

  const dias =
    validade && status === 'expirando'
      ? Math.ceil((new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

  const label =
    typeof cfg.label === 'function' ? cfg.label(dias) : cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-medium ${cfg.classes} ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      aria-label={`Certificado: ${label}`}
    >
      <Icon size={compact ? 11 : 13} />
      <span>{label}</span>
    </span>
  );
};
