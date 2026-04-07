import React, { useState } from 'react';
import { RefreshCw, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useAutoSearch, AutoSyncConfig } from '../hooks/useAutoSearch';

interface SincronizacaoAutomaticaProps {
  empresaId: string;
  onAfterSync?: () => Promise<void> | void;
}

/**
 * Componente de UI para gerenciar sincronização automática de notas fiscais.
 * Exibe:
 * - Toggle para habilitar/desabilitar auto-sync
 * - Select para escolher intervalo (1h, 6h, 12h, 24h)
 * - Texto mostrando próxima sincronização
 * - Botão "Buscar Agora" para sincronização manual imediata
 * - Badge com última sincronização
 */
export const SincronizacaoAutomatica: React.FC<SincronizacaoAutomaticaProps> = ({
  empresaId,
  onAfterSync,
}) => {
  const { config, setConfig, proximaSincronizacao, executarAgora, sincronizando, ultimaSincronizacao } =
    useAutoSearch(empresaId, onAfterSync);

  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const handleToggleEnabled = () => {
    setConfig({ ...config, enabled: !config.enabled });
    setErroLocal(null);
  };

  const handleChangeInterval = (novoIntervalo: AutoSyncConfig['intervalHours']) => {
    setConfig({ ...config, intervalHours: novoIntervalo });
    setErroLocal(null);
  };

  const handleBuscarAgora = async () => {
    try {
      setErroLocal(null);
      await executarAgora();
    } catch (error: any) {
      setErroLocal(error.message || 'Erro ao sincronizar');
    }
  };

  const formatarData = (data: Date | null): string => {
    if (!data) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(data);
  };

  const formatarProxima = (data: Date | null): string => {
    if (!data) return 'Nunca';
    const agora = new Date();
    const diferenca = data.getTime() - agora.getTime();

    if (diferenca < 0) return 'Agora';

    const horas = Math.floor(diferenca / (60 * 60 * 1000));
    const minutos = Math.floor((diferenca % (60 * 60 * 1000)) / (60 * 1000));

    if (horas > 0) {
      return `em ${horas}h ${minutos}m`;
    }
    return `em ${minutos}m`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Sincronização Automática
      </h3>

      {/* Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Ativar sincronização automática
        </label>
        <button
          onClick={handleToggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
          role="switch"
          aria-checked={config.enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Select Intervalo */}
      {config.enabled && (
        <div className="mb-6">
          <label htmlFor="interval-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Intervalo de sincronização
          </label>
          <select
            id="interval-select"
            value={config.intervalHours}
            onChange={(e) => handleChangeInterval(parseInt(e.target.value) as any)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>A cada 1 hora</option>
            <option value={6}>A cada 6 horas</option>
            <option value={12}>A cada 12 horas</option>
            <option value={24}>A cada 24 horas</option>
          </select>
        </div>
      )}

      {/* Próxima Sincronização */}
      {config.enabled && proximaSincronizacao && (
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Clock size={16} />
          <span>Próxima sincronização: {formatarProxima(proximaSincronizacao)}</span>
        </div>
      )}

      {/* Última Sincronização */}
      {ultimaSincronizacao && (
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
          <span>
            Última sincronização: {formatarData(ultimaSincronizacao)}
          </span>
        </div>
      )}

      {/* Erro Local */}
      {erroLocal && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-700 dark:text-red-300">{erroLocal}</span>
        </div>
      )}

      {/* Botão Buscar Agora */}
      <button
        onClick={handleBuscarAgora}
        disabled={sincronizando}
        className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
          sincronizando
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {sincronizando ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <RefreshCw size={18} />
            Buscar Notas Agora
          </>
        )}
      </button>
    </div>
  );
};

export default SincronizacaoAutomatica;
