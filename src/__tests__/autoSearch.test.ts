import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Testes para lógica pura de auto-search (sem hooks React)
 * Essas funções serão extraídas e usadas dentro do hook useAutoSearch
 */

interface AutoSyncConfig {
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
 * Calcula próxima sincronização baseado na última + intervalo
 */
function calcularProximaSincronizacao(
  ultimaSincronizacao: Date | null,
  intervalHours: number
): Date {
  const agora = new Date();
  const proxima = ultimaSincronizacao
    ? new Date(ultimaSincronizacao.getTime() + intervalHours * 60 * 60 * 1000)
    : agora;
  return proxima > agora ? proxima : agora;
}

describe('Auto-search config storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve retornar config padrão se localStorage está vazio', () => {
    const config = loadAutoSyncConfig('emp1');

    expect(config).toEqual({ enabled: false, intervalHours: 24 });
  });

  it('deve salvar e carregar configuração corretamente', () => {
    const configToSave: AutoSyncConfig = { enabled: true, intervalHours: 6 };

    saveAutoSyncConfig('emp1', configToSave);
    const loaded = loadAutoSyncConfig('emp1');

    expect(loaded).toEqual(configToSave);
  });

  it('deve manter configs separadas por empresa', () => {
    const config1: AutoSyncConfig = { enabled: true, intervalHours: 1 };
    const config2: AutoSyncConfig = { enabled: false, intervalHours: 12 };

    saveAutoSyncConfig('emp1', config1);
    saveAutoSyncConfig('emp2', config2);

    expect(loadAutoSyncConfig('emp1')).toEqual(config1);
    expect(loadAutoSyncConfig('emp2')).toEqual(config2);
  });

  it('deve retornar config padrão se localStorage corrupto', () => {
    localStorage.setItem(`${STORAGE_PREFIX}emp1`, '{invalid json}');

    const config = loadAutoSyncConfig('emp1');

    expect(config).toEqual({ enabled: false, intervalHours: 24 });
  });
});

describe('Próxima sincronização', () => {
  it('deve calcular próxima sincronização corretamente', () => {
    const agora = new Date();
    const passado = new Date(agora.getTime() - 2 * 60 * 60 * 1000); // 2 horas atrás

    const proxima = calcularProximaSincronizacao(passado, 6); // intervalo de 6 horas

    // proxima deve ser passado + 6 horas, que é > agora
    expect(proxima.getTime()).toBeGreaterThan(agora.getTime());
  });

  it('deve retornar agora se última sincronização for nula', () => {
    const agora = new Date();
    const proxima = calcularProximaSincronizacao(null, 24);

    // proxima deve ser aproximadamente agora (dentro de 1 segundo)
    expect(Math.abs(proxima.getTime() - agora.getTime())).toBeLessThan(1000);
  });

  it('deve retornar agora se intervalo já passou', () => {
    const agora = new Date();
    const muito_tempo_atras = new Date(agora.getTime() - 48 * 60 * 60 * 1000); // 48 horas atrás

    const proxima = calcularProximaSincronizacao(muito_tempo_atras, 24); // intervalo de 24 horas

    // proxima deve ser aproximadamente agora
    expect(Math.abs(proxima.getTime() - agora.getTime())).toBeLessThan(1000);
  });
});
