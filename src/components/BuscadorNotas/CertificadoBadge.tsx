/**
 * CertificadoBadge Component
 * 
 * Badge visual que mostra o status do certificado digital.
 */
import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldOff, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { obterStatusCertificadoEmpresa, StatusCertificado } from '../../services/notaFiscalService';

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
        bgColor: 'bg-hc-green/15',
        textColor: 'text-hc-green',
        borderColor: 'border-hc-green/30',
        label: 'Ativo',
    },
    expirando: {
        icon: AlertTriangle,
        bgColor: 'bg-hc-amber/15',
        textColor: 'text-hc-amber',
        borderColor: 'border-hc-amber/30',
        label: 'Expirando',
    },
    vencido: {
        icon: ShieldOff,
        bgColor: 'bg-hc-red/15',
        textColor: 'text-hc-red',
        borderColor: 'border-hc-red/30',
        label: 'Vencido',
    },
    ausente: {
        icon: ShieldAlert,
        bgColor: 'bg-hc-muted/15',
        textColor: 'text-hc-muted',
        borderColor: 'border-hc-border',
        label: 'Ausente',
    },
    erro: {
        icon: Shield,
        bgColor: 'bg-hc-red/15',
        textColor: 'text-hc-red',
        borderColor: 'border-hc-red/30',
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
            bg-hc-info/15 text-hc-info border border-hc-info/30
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

// ============================================
// ===== VERSÃO ASSÍNCRONA (Para uso em Clients.tsx) =====
// ============================================

interface CertificadoBadgeAsyncProps {
    empresaId: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    inline?: boolean;
}

/**
 * Versão assíncrona do CertificadoBadge que busca o status automaticamente
 * Ideal para uso em listas de empresas (Clients.tsx)
 */
export function CertificadoBadgeAsync({
    empresaId,
    size = 'sm',
    showLabel = true,
    inline = false,
}: CertificadoBadgeAsyncProps) {
    const [status, setStatus] = useState<StatusCertificado | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchStatus = async () => {
            setLoading(true);
            setError(false);

            try {
                const result = await obterStatusCertificadoEmpresa(empresaId);
                if (isMounted) {
                    setStatus(result);
                }
            } catch (err) {
                console.error('Erro ao buscar status certificado:', err);
                if (isMounted) {
                    setError(true);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchStatus();

        return () => {
            isMounted = false;
        };
    }, [empresaId]);

    const sizeConfig = SIZE_CONFIG[size];

    // Loading state
    if (loading) {
        return (
            <span
                className={`
                    inline-flex items-center ${sizeConfig.gap} ${sizeConfig.padding}
                    bg-hc-card text-hc-muted border border-hc-border
                    rounded-full font-medium ${sizeConfig.fontSize}
                `}
            >
                <Loader2 size={sizeConfig.iconSize} className="animate-spin" />
                {showLabel && !inline && <span>Verificando...</span>}
            </span>
        );
    }

    // Error state
    if (error || !status) {
        return (
            <span
                className={`
                    inline-flex items-center ${sizeConfig.gap} ${sizeConfig.padding}
                    bg-hc-card text-hc-muted border border-hc-border
                    rounded-full font-medium ${sizeConfig.fontSize}
                `}
            >
                <Shield size={sizeConfig.iconSize} />
                {showLabel && <span>Desconhecido</span>}
            </span>
        );
    }

    // Render the sync badge with fetched data
    return (
        <CertificadoBadge
            status={status.status}
            diasRestantes={status.dias_para_vencer}
            usandoFallback={status.usando_fallback}
            size={size}
            showLabel={showLabel}
        />
    );
}

export default CertificadoBadge;
