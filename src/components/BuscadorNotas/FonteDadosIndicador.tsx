/**
 * FonteDadosIndicador Component
 * 
 * Indicador visual que mostra se os dados vieram do cache ou da SEFAZ.
 */
import React from 'react';
import { Database, Cloud, Clock } from 'lucide-react';

interface FonteDadosIndicadorProps {
    fonte: 'cache' | 'sefaz' | 'banco_local' | null;
    cachedAt?: string;
    className?: string;
}

export function FonteDadosIndicador({
    fonte,
    cachedAt,
    className = '',
}: FonteDadosIndicadorProps) {
    if (!fonte) return null;

    const isCache = fonte === 'cache';
    const isBancoLocal = fonte === 'banco_local';
    const Icon = isCache || isBancoLocal ? Database : Cloud;

    // Formatar tempo do cache
    const tempoCache = cachedAt ? formatarTempoRelativo(cachedAt) : null;

    const colorClass = isCache
        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        : isBancoLocal
        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

    const titleText = isCache
        ? `Dados do cache local${tempoCache ? ` (${tempoCache})` : ''}`
        : isBancoLocal
        ? 'Dados do banco de dados local'
        : 'Dados consultados diretamente na SEFAZ';

    const label = isCache ? 'Cache' : isBancoLocal ? 'Banco Local' : 'SEFAZ';

    return (
        <div
            className={`
        inline-flex items-center gap-2 px-3 py-1.5
        ${colorClass}
        border rounded-full text-sm font-medium
        ${className}
      `}
            title={titleText}
        >
            <Icon size={16} />
            <span>{label}</span>

            {isCache && tempoCache && (
                <span className="flex items-center gap-1 text-xs opacity-75">
                    <Clock size={12} />
                    {tempoCache}
                </span>
            )}
        </div>
    );
}

/**
 * Formata uma data ISO para tempo relativo (ex: "há 2 horas").
 */
function formatarTempoRelativo(dataISO: string): string {
    try {
        const data = new Date(dataISO);
        const agora = new Date();
        const diffMs = agora.getTime() - data.getTime();
        const diffMinutos = Math.floor(diffMs / (1000 * 60));
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMinutos < 1) return 'agora';
        if (diffMinutos < 60) return `há ${diffMinutos}min`;
        if (diffHoras < 24) return `há ${diffHoras}h`;

        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
        });
    } catch {
        return '';
    }
}

export default FonteDadosIndicador;
