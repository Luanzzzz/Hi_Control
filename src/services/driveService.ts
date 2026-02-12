/**
 * Serviço para integração com Google Drive
 *
 * Gerencia autenticação OAuth e sincronização de XMLs
 */

import api from './api';

export interface DriveConfig {
  id: string;
  provedor: string;
  empresa_id?: string;
  pasta_id?: string;
  pasta_nome?: string;
  ultima_sincronizacao?: string;
  total_importadas?: number;
  ativo: boolean;
}

export interface DriveSyncResult {
  config_id: string;
  arquivos_encontrados: number;
  notas_importadas: number;
  notas_duplicadas: number;
  erros: number;
  detalhes_erros?: string[];
  erro_geral?: string;
}

export const driveService = {
  /**
   * Gera URL para autorização OAuth do Google Drive
   */
  async gerarUrlAutorizacao(): Promise<string> {
    try {
      const response = await api.get<{ url: string }>('/drive/auth/url');
      return response.data.url;
    } catch (error: any) {
      console.error('Erro ao gerar URL de autorização:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao gerar URL de autorização');
    }
  },

  /**
   * Processa callback OAuth do Google
   */
  async processarCallback(code: string, state?: string): Promise<{ sucesso: boolean; mensagem: string; config_id?: string }> {
    try {
      const response = await api.post('/drive/auth/callback', { code, state });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao processar callback:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao processar autorização');
    }
  },

  /**
   * Lista configurações de Drive do usuário
   */
  async listarConfiguracoes(): Promise<DriveConfig[]> {
    try {
      const response = await api.get<DriveConfig[]>('/drive/configuracoes');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao listar configurações:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao listar configurações');
    }
  },

  /**
   * Conectar Google Drive para uma empresa
   */
  async conectarDrive(): Promise<void> {
    try {
      const url = await this.gerarUrlAutorizacao();
      // Abre janela popup ou redireciona
      window.location.href = url;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Sincronizar notas de uma configuração de Drive
   */
  async sincronizar(configId: string): Promise<DriveSyncResult> {
    try {
      const response = await api.post<DriveSyncResult>(`/drive/sincronizar/${configId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao sincronizar com Google Drive');
    }
  },
};
