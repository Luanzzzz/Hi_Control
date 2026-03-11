/**
 * Serviço para gestão de certificados digitais A1
 *
 * Endpoints:
 * - POST /certificados/empresas/{id}/certificado  (upload)
 * - GET  /certificados/empresas/{id}/certificado/status (status)
 */

import api from './api';

export interface CertificadoUploadResponse {
  mensagem: string;
  validade: string;
  dias_restantes: number;
  titular: string;
  emissor: string;
  requer_atencao: boolean;
}

export interface CertificadoStatus {
  validade: string | null;
  dias_restantes: number | null;
  status: 'valido' | 'expirando_em_breve' | 'expirado' | 'ausente';
  requer_atencao: boolean;
  alerta: string;
  titular: string | null;
  emissor: string | null;
}

export const certificadoService = {
  /**
   * Upload de certificado digital A1 (.pfx/.p12)
   */
  async upload(
    empresaId: string,
    certBase64: string,
    senha: string
  ): Promise<CertificadoUploadResponse> {
    const response = await api.post<CertificadoUploadResponse>(
      `/certificados/empresas/${empresaId}/certificado`,
      { certificado_base64: certBase64, senha }
    );
    return response.data;
  },

  /**
   * Verificar status do certificado de uma empresa
   */
  async obterStatus(empresaId: string): Promise<CertificadoStatus> {
    const response = await api.get<CertificadoStatus>(
      `/certificados/empresas/${empresaId}/certificado/status`
    );
    return response.data;
  },
};
