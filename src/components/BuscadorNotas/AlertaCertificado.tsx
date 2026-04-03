/**
 * AlertaCertificado Component
 * 
 * Alerta visual para problemas com certificado digital.
 */
import React from 'react';
import { AlertTriangle, ShieldOff, Shield, X, ExternalLink } from 'lucide-react';

export type AlertaTipo = 'error' | 'warning' | 'info';

interface AlertaCertificadoProps {
    tipo: AlertaTipo;
    titulo: string;
    mensagem: string;
    bloqueante?: boolean;
    onClose?: () => void;
    onCadastrar?: () => void;
}

const ALERTA_CONFIG = {
    error: {
        icon: ShieldOff,
        bgColor: 'bg-hc-red/10',
        borderColor: 'border-hc-red/30',
        textColor: 'text-hc-red',
        titleColor: 'text-hc-red',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-hc-amber/10',
        borderColor: 'border-hc-amber/30',
        textColor: 'text-hc-amber',
        titleColor: 'text-hc-amber',
    },
    info: {
        icon: Shield,
        bgColor: 'bg-hc-info/10',
        borderColor: 'border-hc-info/30',
        textColor: 'text-hc-info',
        titleColor: 'text-hc-info',
    },
};

export function AlertaCertificado({
    tipo,
    titulo,
    mensagem,
    bloqueante = false,
    onClose,
    onCadastrar,
}: AlertaCertificadoProps) {
    const config = ALERTA_CONFIG[tipo];
    const IconComponent = config.icon;

    return (
        <div
            className={`
        relative p-4 rounded-lg border
        ${config.bgColor} ${config.borderColor}
        ${bloqueante ? 'animate-pulse' : ''}
      `}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${config.textColor}`}>
                    <IconComponent size={24} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold ${config.titleColor} mb-1`}>
                        {titulo}
                    </h4>
                    <p className={`text-sm ${config.textColor} opacity-90`}>
                        {mensagem}
                    </p>

                    {bloqueante && (
                        <div className="mt-3 flex items-center gap-2">
                            {onCadastrar && (
                                <button
                                    onClick={onCadastrar}
                                    className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    bg-hc-card border border-hc-border hover:bg-hc-hover
                    ${config.textColor} text-sm font-medium
                    rounded-md transition-colors
                  `}
                                >
                                    <ExternalLink size={14} />
                                    Cadastrar Certificado
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {onClose && !bloqueante && (
                    <button
                        onClick={onClose}
                        className={`
              flex-shrink-0 p-1 rounded-md
              hover:bg-hc-hover ${config.textColor}
              transition-colors
            `}
                        aria-label="Fechar alerta"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default AlertaCertificado;
