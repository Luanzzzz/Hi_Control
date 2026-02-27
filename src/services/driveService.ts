/**
 * Service for Google Drive integration
 * Handles OAuth and drive sync/export workflows.
 */

import api from './api';

export interface DriveConfig {
  id: string;
  provedor: string;
  empresa_id?: string;
  pasta_id?: string;
  pasta_nome?: string;
  pasta_raiz_export_id?: string;
  pasta_raiz_export_nome?: string;
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

export interface DrivePastasSyncResult {
  sucesso: boolean;
  mensagem: string;
  pasta_raiz_id?: string;
  pasta_raiz_nome?: string;
  total_empresas?: number;
  pastas_criadas?: number;
}

export interface DriveExportMassRequest {
  empresa_ids?: string[];
  filtros?: Record<string, any>;
}

export interface DriveExportJob {
  id: string;
  status: 'pendente' | 'processando' | 'concluido' | 'concluido_com_erros' | 'erro' | 'cancelado';
  total_notas: number;
  notas_processadas: number;
  notas_exportadas: number;
  notas_duplicadas: number;
  notas_erro: number;
  progresso_percentual: number;
  mensagem?: string | null;
  pasta_raiz_id?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export const driveService = {
  /**
   * Generate Google OAuth authorization URL.
   */
  async gerarUrlAutorizacao(): Promise<string> {
    try {
      const response = await api.get<{ url: string }>('/drive/auth/url');
      return response.data.url;
    } catch (error: any) {
      console.error('Erro ao gerar URL de autorizacao:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao gerar URL de autorizacao');
    }
  },

  /**
   * Process OAuth callback (code -> tokens).
   */
  async processarCallback(
    code: string,
    state?: string
  ): Promise<{ sucesso: boolean; mensagem: string; config_id?: string }> {
    try {
      const response = await api.post('/drive/auth/callback', null, {
        params: {
          code,
          ...(state ? { state } : {}),
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao processar callback:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao processar autorizacao');
    }
  },

  /**
   * List active Drive configs for logged user.
   */
  async listarConfiguracoes(): Promise<DriveConfig[]> {
    try {
      const response = await api.get<DriveConfig[]>('/drive/configuracoes');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao listar configuracoes:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao listar configuracoes');
    }
  },

  /**
   * Open OAuth flow in current window.
   */
  async conectarDrive(): Promise<void> {
    const url = await this.gerarUrlAutorizacao();
    window.location.href = url;
  },

  /**
   * Run one import sync for a specific drive config.
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

  /**
   * Create/update per-client folders in Drive.
   */
  async sincronizarPastasClientes(empresaIds?: string[]): Promise<DrivePastasSyncResult> {
    try {
      const response = await api.post<DrivePastasSyncResult>(
        '/drive/pastas/sincronizar-clientes',
        null,
        {
          params: empresaIds?.length ? { empresa_ids: empresaIds } : undefined,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao sincronizar pastas de clientes no Drive:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao sincronizar pastas de clientes');
    }
  },

  /**
   * Enqueue bulk XML export job to Google Drive.
   */
  async iniciarExportacaoXmlMassa(payload: DriveExportMassRequest): Promise<DriveExportJob> {
    try {
      const response = await api.post<DriveExportJob>('/drive/exportacoes/xmls/iniciar', payload);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao iniciar exportacao em massa para Google Drive:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao iniciar exportacao para Google Drive');
    }
  },

  /**
   * Get status for one bulk export job.
   */
  async obterStatusExportacaoXml(jobId: string): Promise<DriveExportJob> {
    try {
      const response = await api.get<DriveExportJob>(`/drive/exportacoes/xmls/${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao consultar status da exportacao no Drive:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao consultar status da exportacao');
    }
  },

  /**
   * List recent bulk export jobs.
   */
  async listarExportacoesXml(limite: number = 20): Promise<DriveExportJob[]> {
    try {
      const response = await api.get<{ jobs: DriveExportJob[] }>('/drive/exportacoes/xmls', {
        params: { limite },
      });
      return response.data.jobs || [];
    } catch (error: any) {
      console.error('Erro ao listar exportacoes do Drive:', error);
      throw new Error(error.response?.data?.detail || 'Erro ao listar exportacoes do Drive');
    }
  },
};
