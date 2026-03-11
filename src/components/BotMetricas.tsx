/**
 * BotMetricas Component
 * 
 * Design Direction: Industrial Utilitarian (consistente com BotStatus)
 * 
 * Exibe métricas detalhadas do bot em cards informativos
 * com estilo terminal/console para dados técnicos
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, Building2, Activity } from 'lucide-react';
import { botService, MetricasBot } from '../services/botService';

export const BotMetricas: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasBot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarMetricas();
  }, []);

  const carregarMetricas = async () => {
    try {
      const dados = await botService.obterMetricas();
      setMetricas(dados);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 animate-pulse"
          >
            <div className="h-8 bg-slate-700/50 rounded w-1/2 mb-3" />
            <div className="h-6 bg-slate-700/50 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!metricas) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total de Notas */}
      <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-700/30 rounded-lg p-4 backdrop-blur-sm hover:border-cyan-600/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <FileText className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-cyan-300/80 uppercase tracking-wider mb-1">
              Total de Notas
            </p>
            <p className="text-2xl font-mono font-bold text-white tabular-nums">
              {metricas.total_notas.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Empresas Sincronizadas */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/30 rounded-lg p-4 backdrop-blur-sm hover:border-emerald-600/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-emerald-300/80 uppercase tracking-wider mb-1">
              Empresas
            </p>
            <p className="text-2xl font-mono font-bold text-white tabular-nums">
              {metricas.empresas_sincronizadas}
            </p>
          </div>
        </div>
      </div>

      {/* Notas por Tipo */}
      <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-lg p-4 backdrop-blur-sm hover:border-purple-600/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-300/80 uppercase tracking-wider mb-2">
              Por Tipo
            </p>
            <div className="space-y-1.5">
              {Object.entries(metricas.notas_por_tipo).length === 0 ? (
                <p className="text-sm text-purple-300/60 font-mono">N/A</p>
              ) : (
                Object.entries(metricas.notas_por_tipo)
                  .slice(0, 3) // Mostrar apenas os 3 primeiros
                  .map(([tipo, qtd]) => (
                    <div
                      key={tipo}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-purple-300/80 truncate font-medium">
                        {tipo}:
                      </span>
                      <span className="text-white font-mono font-bold tabular-nums ml-2">
                        {qtd.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
