/**
 * Componente Banner de Contingência
 * Exibe alerta quando o sistema SEFAZ está em contingência
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, Info } from 'lucide-react';
import { verificarContingencia } from '../../services/fiscalService';
import type { StatusContingenciaResponse } from '../../types/fiscal';

interface BannerContingenciaProps {
  autoRefresh?: boolean; // Atualizar automaticamente a cada X minutos
  refreshInterval?: number; // Intervalo em milissegundos (padrão: 5 minutos)
}

export const BannerContingencia: React.FC<BannerContingenciaProps> = ({
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutos
}) => {
  const [status, setStatus] = useState<StatusContingenciaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string>('');
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    verificarStatus();

    // Auto-refresh se habilitado
    if (autoRefresh) {
      const interval = setInterval(verificarStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const verificarStatus = async () => {
    setLoading(true);
    setErro('');
    try {
      const resultado = await verificarContingencia();
      setStatus(resultado);
      
      // Se voltou ao normal, mostrar banner novamente
      if (!resultado.em_contingencia && fechado) {
        setFechado(false);
      }
    } catch (error: any) {
      console.error('Erro ao verificar contingência:', error);
      setErro('Não foi possível verificar o status da SEFAZ');
    } finally {
      setLoading(false);
    }
  };

  // Não mostrar nada se:
  // - Ainda está carregando pela primeira vez
  // - Não está em contingência
  // - Banner foi fechado manualmente
  if (loading && !status) return null;
  if (!status?.em_contingencia) return null;
  if (fechado) return null;

  const getTipoContingenciaDescricao = (tipo?: string): string => {
    const tipos: Record<string, string> = {
      'EPEC': 'Evento Prévio de Emissão em Contingência',
      'FS-DA': 'Formulário de Segurança - Documento Auxiliar',
      'SVCAN': 'SVC-AN (SEFAZ Virtual de Contingência Ambiente Nacional)',
      'SVCRS': 'SVC-RS (SEFAZ Virtual de Contingência Rio Grande do Sul)',
    };
    return tipos[tipo || ''] || tipo || 'Contingência Ativada';
  };

  const formatarData = (dataISO?: string): string => {
    if (!dataISO) return 'Não informado';
    try {
      const data = new Date(dataISO);
      return data.toLocaleString('pt-BR');
    } catch {
      return dataISO;
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-yellow-500 dark:bg-yellow-600 text-gray-900 dark:text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-start gap-3">
            {/* Ícone */}
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">
                  Sistema SEFAZ em Contingência
                </h3>
                {status.tipo_contingencia && (
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-mono">
                    {status.tipo_contingencia}
                  </span>
                )}
              </div>

              <p className="text-sm mb-2">
                {getTipoContingenciaDescricao(status.tipo_contingencia)}
                {status.motivo && ` - ${status.motivo}`}
              </p>

              {/* Informações Adicionais */}
              <div className="flex flex-wrap items-center gap-4 text-xs opacity-90">
                {status.data_inicio && (
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Início: {formatarData(status.data_inicio)}</span>
                  </div>
                )}
                {status.previsao_retorno && (
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Previsão de retorno: {formatarData(status.previsao_retorno)}</span>
                  </div>
                )}
              </div>

              {/* Instruções */}
              <div className="mt-2 p-2 bg-white/10 rounded text-xs">
                <p className="font-medium mb-1">⚠️ O que fazer:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Os documentos fiscais continuam sendo emitidos em contingência</li>
                  <li>Após normalização, os documentos serão transmitidos automaticamente</li>
                  <li>Mantenha backup dos XMLs gerados durante a contingência</li>
                </ul>
              </div>
            </div>

            {/* Ações */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={verificarStatus}
                disabled={loading}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                title="Atualizar status"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setFechado(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Fechar aviso"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente compacto do banner (para usar em páginas internas)
 */
export const BannerContingenciaCompacto: React.FC = () => {
  const [emContingencia, setEmContingencia] = useState(false);

  useEffect(() => {
    verificarContingencia().then((status) => {
      setEmContingencia(status.em_contingencia);
    });
  }, []);

  if (!emContingencia) return null;

  return (
    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <p className="text-sm text-yellow-800 dark:text-yellow-300">
        <span className="font-medium">SEFAZ em contingência.</span> Documentos serão emitidos em modo de contingência.
      </p>
    </div>
  );
};
