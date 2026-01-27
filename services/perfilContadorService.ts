/**
 * Service para gestão do perfil da firma de contabilidade
 *
 * Funcionalidades:
 * - Obter/atualizar dados da firma (Razão Social, CNPJ, IE)
 * - Upload de logo
 * - Upload de certificado digital A1
 * - Verificação de status do certificado
 */

import api from '../src/services/api';

// ============================================
// INTERFACES
// ============================================

export interface PerfilContador {
  razao_social?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  logo_url?: string;
  certificado_validade?: string;
  certificado_titular?: string;
  certificado_emissor?: string;
}

export interface PerfilContadorUpdate {
  razao_social?: string;
  cnpj?: string;
  inscricao_estadual?: string;
}

export interface CertificateUploadResponse {
  mensagem: string;
  validade: string;
  dias_restantes: number;
  titular: string;
  emissor: string;
  requer_atencao: boolean;
}

export interface CertificateStatus {
  validade?: string;
  dias_restantes?: number;
  status: 'valido' | 'expirando_em_breve' | 'expirado' | 'ausente';
  requer_atencao: boolean;
  alerta: string;
  titular?: string;
  emissor?: string;
}

// ============================================
// SERVICE METHODS
// ============================================

class PerfilContadorService {
  private baseURL = '/perfil-contador';

  /**
   * Obter perfil da firma de contabilidade
   */
  async obterPerfil(): Promise<PerfilContador> {
    try {
      const response = await api.get<PerfilContador>(this.baseURL);
      return response.data;
    } catch (error: any) {
      console.error('[PerfilContadorService] Erro ao obter perfil:', error);
      throw new Error(
        error.response?.data?.detail ||
        'Erro ao carregar perfil da contabilidade'
      );
    }
  }

  /**
   * Atualizar dados da firma de contabilidade
   */
  async atualizarPerfil(data: PerfilContadorUpdate): Promise<PerfilContador> {
    try {
      const response = await api.put<PerfilContador>(this.baseURL, data);
      return response.data;
    } catch (error: any) {
      console.error('[PerfilContadorService] Erro ao atualizar perfil:', error);
      throw new Error(
        error.response?.data?.detail ||
        'Erro ao atualizar perfil da contabilidade'
      );
    }
  }

  /**
   * Upload de logo da firma
   * @param logoBase64 - Logo em base64 (com ou sem prefixo data:image/...)
   */
  async uploadLogo(logoBase64: string): Promise<{ mensagem: string; logo_url: string }> {
    try {
      const response = await api.post(`${this.baseURL}/logo`, {
        logo_base64: logoBase64,
      });
      return response.data;
    } catch (error: any) {
      console.error('[PerfilContadorService] Erro ao fazer upload de logo:', error);
      throw new Error(
        error.response?.data?.detail ||
        'Erro ao fazer upload da logo'
      );
    }
  }

  /**
   * Upload de certificado digital A1 (.pfx/.p12)
   * @param certBase64 - Certificado em base64 (sem prefixo)
   * @param senha - Senha do certificado
   */
  async uploadCertificado(
    certBase64: string,
    senha: string
  ): Promise<CertificateUploadResponse> {
    try {
      const response = await api.post<CertificateUploadResponse>(
        `${this.baseURL}/certificado`,
        {
          certificado_base64: certBase64,
          senha,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[PerfilContadorService] Erro ao fazer upload de certificado:', error);
      throw new Error(
        error.response?.data?.detail ||
        'Erro ao fazer upload do certificado'
      );
    }
  }

  /**
   * Verificar status de validade do certificado
   */
  async verificarStatusCertificado(): Promise<CertificateStatus> {
    try {
      const response = await api.get<CertificateStatus>(
        `${this.baseURL}/certificado/status`
      );
      return response.data;
    } catch (error: any) {
      console.error('[PerfilContadorService] Erro ao verificar status do certificado:', error);
      throw new Error(
        error.response?.data?.detail ||
        'Erro ao verificar status do certificado'
      );
    }
  }
}

// Export singleton instance
export const perfilContadorService = new PerfilContadorService();
