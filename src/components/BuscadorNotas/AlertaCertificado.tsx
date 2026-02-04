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
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
        titleColor: 'text-red-300',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-400',
        titleColor: 'text-yellow-300',
    },
    info: {
        icon: Shield,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        textColor: 'text-blue-400',
        titleColor: 'text-blue-300',
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
                    bg-white/10 hover:bg-white/20
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
              hover:bg-white/10 ${config.textColor}
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
