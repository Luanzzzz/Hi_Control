/**
 * Serviço para comunicação com API do Bot
 * 
 * Gerencia todas as interações com os endpoints do bot de busca automática
 */

import api from './api';

export interface BotStatus {
  status: 'ok' | 'atrasado' | 'nunca_executado';
  ultima_sincronizacao: string | null;
  notas_24h: number;
  funcionando: boolean;
}

export interface StatusEmpresa {
  empresa_id: string;
  total_notas: number;
  ultima_nota: {
    created_at: string;
    tipo: string;
    numero: string;
  } | null;
  sincronizado: boolean;
}

export interface MetricasBot {
  total_notas: number;
  notas_por_tipo: Record<string, number>;
  empresas_sincronizadas: number;
}

export const botService = {
  /**
   * Obtém status geral do bot
   */
  async obterStatus(): Promise<BotStatus> {
    try {
      const response = await api.get<{ success: boolean; data: BotStatus }>('/bot/status');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Erro ao obter status do bot');
    } catch (error: any) {
      console.error('Erro ao obter status do bot:', error);
      throw error;
    }
  },

  /**
   * Obtém status de uma empresa específica
   */
  async obterStatusEmpresa(empresaId: string): Promise<StatusEmpresa> {
    try {
      const response = await api.get<{ success: boolean; data: StatusEmpresa }>(
        `/bot/empresas/${empresaId}/status`
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Erro ao obter status da empresa');
    } catch (error: any) {
      console.error('Erro ao obter status da empresa:', error);
      throw error;
    }
  },

  /**
   * Força sincronização manual do bot
   */
  async forcarSincronizacao(): Promise<void> {
    try {
      const response = await api.post<{ success: boolean; message: string }>(
        '/bot/sincronizar-agora'
      );
      
      if (!response.data.success) {
        throw new Error('Erro ao forçar sincronização');
      }
    } catch (error: any) {
      console.error('Erro ao forçar sincronização:', error);
      throw error;
    }
  },

  /**
   * Obtém métricas gerais do bot
   */
  async obterMetricas(): Promise<MetricasBot> {
    try {
      const response = await api.get<{ success: boolean; data: MetricasBot }>('/bot/metricas');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Erro ao obter métricas');
    } catch (error: any) {
      console.error('Erro ao obter métricas:', error);
      throw error;
    }
  }
};
