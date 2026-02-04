/**
 * CertificadoBadge Component
 * 
 * Badge visual que mostra o status do certificado digital.
 */
import React from 'react';
import { Shield, ShieldAlert, ShieldOff, ShieldCheck, AlertTriangle } from 'lucide-react';

export type CertificadoStatus = 'ativo' | 'expirando' | 'vencido' | 'ausente' | 'erro';

interface CertificadoBadgeProps {
    status: CertificadoStatus;
    diasRestantes?: number | null;
    usandoFallback?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

const STATUS_CONFIG = {
    ativo: {
        icon: ShieldCheck,
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        label: 'Ativo',
    },
    expirando: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500/30',
        label: 'Expirando',
    },
    vencido: {
        icon: ShieldOff,
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        label: 'Vencido',
    },
    ausente: {
        icon: ShieldAlert,
        bgColor: 'bg-gray-500/20',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-500/30',
        label: 'Ausente',
    },
    erro: {
        icon: Shield,
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        label: 'Erro',
    },
};

const SIZE_CONFIG = {
    sm: {
        iconSize: 14,
        padding: 'px-2 py-0.5',
        fontSize: 'text-xs',
        gap: 'gap-1',
    },
    md: {
        iconSize: 16,
        padding: 'px-2.5 py-1',
        fontSize: 'text-sm',
        gap: 'gap-1.5',
    },
    lg: {
        iconSize: 18,
        padding: 'px-3 py-1.5',
        fontSize: 'text-base',
        gap: 'gap-2',
    },
};

export function CertificadoBadge({
    status,
    diasRestantes,
    usandoFallback = false,
    size = 'md',
    showLabel = true,
}: CertificadoBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.erro;
    const sizeConfig = SIZE_CONFIG[size];
    const IconComponent = config.icon;

    return (
        <div className="flex items-center gap-2">
            <span
                className={`
          inline-flex items-center ${sizeConfig.gap} ${sizeConfig.padding}
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          border rounded-full font-medium ${sizeConfig.fontSize}
          transition-all duration-200
        `}
            >
                <IconComponent size={sizeConfig.iconSize} />
                {showLabel && <span>{config.label}</span>}
                {status === 'expirando' && diasRestantes !== null && (
                    <span className="opacity-80">({diasRestantes}d)</span>
                )}
            </span>

            {usandoFallback && (
                <span
                    className={`
            inline-flex items-center gap-1 px-2 py-0.5
            bg-blue-500/20 text-blue-400 border border-blue-500/30
            rounded-full text-xs font-medium
          `}
                    title="Usando certificado do contador como fallback"
                >
                    <Shield size={12} />
                    Fallback
                </span>
            )}
        </div>
    );
}

export default CertificadoBadge;
