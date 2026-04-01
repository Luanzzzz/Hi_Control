/**
 * Serviço para integração com Google Drive
 *
 * Responsabilidade: ingestão documental via Google Drive (OAuth + sincronização de XMLs).
 * Não é o fluxo principal de busca fiscal — ver notaFiscalService.ts e InvoiceSearch.tsx.
 * Acessado via: ViewState.SETTINGS → Configuracoes.tsx → ConfiguracaoDrive.tsx
 */

import axios from 'axios';
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

// ─── Notas via Drive (leitura direta de XMLs) ────────────────────────────────
// Extraído de notaFiscalService.ts — Etapa 4 da reorganização estrutural.

export interface NotaDrive {
  chave_acesso: string | null;
  numero: string;
  serie: string | null;
  tipo: string;
  data_emissao: string | null;
  valor_total: number;
  cnpj_emitente: string | null;
  nome_emitente: string | null;
  cnpj_destinatario: string | null;
  nome_destinatario: string | null;
  situacao: string | null;
  arquivo_nome: string;
  drive_file_id: string;
}

export interface NotasDriveResponse {
  success: boolean;
  total: number;
  notas: NotaDrive[];
  pasta_id: string | null;
  pasta_nome: string | null;
  message?: string;
}

export interface SincronizacaoDriveResponse {
  success: boolean;
  message: string;
  config_id: string;
  arquivos_encontrados: number;
  notas_importadas: number;
  notas_duplicadas: number;
  erros: number;
}

/**
 * Busca notas diretamente do Google Drive (sem salvar no banco)
 */
export const buscarNotasDrive = async (
  empresaId: string,
  limite: number = 100
): Promise<NotaDrive[]> => {
  try {
    const response = await api.get<NotasDriveResponse>(
      `/notas/drive/${empresaId}`,
      { params: { limite } }
    );
    if (response.data.success) {
      return response.data.notas;
    }
    return [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao buscar notas do Drive';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Força sincronização do Drive (importa XMLs para o banco)
 */
export const sincronizarDrive = async (
  empresaId: string
): Promise<SincronizacaoDriveResponse> => {
  try {
    const response = await api.post<SincronizacaoDriveResponse>(
      `/notas/drive/${empresaId}/sincronizar`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao sincronizar Drive';
      throw new Error(message);
    }
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────

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
