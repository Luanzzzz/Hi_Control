/**
 * useAutoSearch Hook
 *
 * Hook que gerencia sincronização automática de notas fiscais por empresa.
 * - Lê/salva configuração em localStorage: hc_autosync_{empresaId}
 * - Usa setInterval para chamar botService.forcarSincronizacao()
 * - Expõe: config, setConfig, proximaSincronizacao, executarAgora
 *
 * Uso:
 * const { config, setConfig, proximaSincronizacao, executarAgora, sincronizando } =
 *   useAutoSearch(empresaId, () => carregarNotas());
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { botService } from '../services/botService';

export interface AutoSyncConfig {
  enabled: boolean;
  intervalHours: 1 | 6 | 12 | 24;
}

const STORAGE_PREFIX = 'hc_autosync_';

/**
 * Carrega configuração de auto-sync do localStorage
 */
function loadAutoSyncConfig(empresaId: string): AutoSyncConfig {
  try {
    const key = `${STORAGE_PREFIX}${empresaId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      return { enabled: false, intervalHours: 24 };
    }

    return JSON.parse(stored);
  } catch {
    return { enabled: false, intervalHours: 24 };
  }
}

/**
 * Salva configuração de auto-sync no localStorage
 */
function saveAutoSyncConfig(empresaId: string, config: AutoSyncConfig): void {
  const key = `${STORAGE_PREFIX}${empresaId}`;
  localStorage.setItem(key, JSON.stringify(config));
}

/**
 * Carrega última sincronização do localStorage
 */
function loadLastSyncTime(empresaId: string): Date | null {
  try {
    const key = `${STORAGE_PREFIX}${empresaId}_last_sync`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return new Date(stored);
  } catch {
    return null;
  }
}

/**
 * Salva última sincronização no localStorage
 */
function saveLastSyncTime(empresaId: string): void {
  const key = `${STORAGE_PREFIX}${empresaId}_last_sync`;
  localStorage.setItem(key, new Date().toISOString());
}

/**
 * Calcula próxima sincronização baseado na última + intervalo
 */
function calcularProximaSincronizacao(
  ultimaSincronizacao: Date | null,
  intervalHours: number
): Date {
  const agora = new Date();
  if (!ultimaSincronizacao) return agora;

  const proxima = new Date(ultimaSincronizacao.getTime() + intervalHours * 60 * 60 * 1000);
  return proxima > agora ? proxima : agora;
}

export interface UseAutoSearchResult {
  config: AutoSyncConfig;
  setConfig: (config: AutoSyncConfig) => void;
  proximaSincronizacao: Date | null;
  executarAgora: () => Promise<void>;
  sincronizando: boolean;
  ultimaSincronizacao: Date | null;
}

/**
 * Hook para gerenciar sincronização automática de notas fiscais
 */
export function useAutoSearch(
  empresaId: string,
  onAfterSync?: () => Promise<void> | void
): UseAutoSearchResult {
  const [config, setConfigInternal] = useState<AutoSyncConfig>(() =>
    loadAutoSyncConfig(empresaId)
  );

  const [proximaSincronizacao, setProximaSincronizacao] = useState<Date | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(() =>
    loadLastSyncTime(empresaId)
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const setConfig = useCallback(
    (newConfig: AutoSyncConfig) => {
      setConfigInternal(newConfig);
      saveAutoSyncConfig(empresaId, newConfig);
    },
    [empresaId]
  );

  const executarAgora = useCallback(async () => {
    setSincronizando(true);
    try {
      await botService.forcarSincronizacao();
      saveLastSyncTime(empresaId);
      setUltimaSincronizacao(new Date());
      await onAfterSync?.();
    } catch (error) {
      console.error('Erro ao sincronizar manualmente:', error);
    } finally {
      setSincronizando(false);
    }
  }, [empresaId, onAfterSync]);

  // Atualiza próxima sincronização quando config ou última sincronização mudam
  useEffect(() => {
    const proxima = calcularProximaSincronizacao(ultimaSincronizacao, config.intervalHours);
    setProximaSincronizacao(proxima);
  }, [config.intervalHours, ultimaSincronizacao]);

  // Setup/cleanup do intervalo automático
  useEffect(() => {
    if (!config.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Executa sincronização imediatamente se nunca foi sincronizado
    if (!ultimaSincronizacao) {
      executarAgora();
    }

    // Setup intervalo
    const intervalMs = config.intervalHours * 60 * 60 * 1000;
    intervalRef.current = setInterval(() => {
      executarAgora();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config.enabled, config.intervalHours, ultimaSincronizacao, executarAgora]);

  return {
    config,
    setConfig,
    proximaSincronizacao,
    executarAgora,
    sincronizando,
    ultimaSincronizacao,
  };
}

export default useAutoSearch;
