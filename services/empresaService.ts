import api from '../src/services/api';

export interface Empresa {
    id: string;
    usuario_id: string;
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    email?: string;
    telefone?: string;
    regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
    ativa: boolean;
    certificado_validade?: string;
    certificado_titular?: string;
    certificado_emissor?: string;
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

export interface EmpresaCreate {
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    email?: string;
    telefone?: string;
    regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
}

export interface CnpjCheckResponse {
    exists: boolean;
    ativa?: boolean;
    empresa?: {
        id: string;
        razao_social: string;
        nome_fantasia?: string;
    };
}

export interface EmpresaCreateResponse extends Empresa {
    _action: 'created' | 'updated';
    _message: string;
}

class EmpresaService {
    async listar(): Promise<Empresa[]> {
        const response = await api.get('/empresas');
        return response.data;
    }

    async verificarCnpj(cnpj: string): Promise<CnpjCheckResponse> {
        const cnpjDigits = cnpj.replace(/\D/g, '');
        const response = await api.get<CnpjCheckResponse>(`/empresas/check-cnpj/${cnpjDigits}`);
        return response.data;
    }

    async criar(empresa: EmpresaCreate): Promise<EmpresaCreateResponse> {
        const response = await api.post<EmpresaCreateResponse>('/empresas', {
            ...empresa,
            cnpj: empresa.cnpj.replace(/\D/g, ''),
            cep: empresa.cep?.replace(/\D/g, '')
        });
        return response.data;
    }

    async atualizar(id: string, empresa: EmpresaCreate): Promise<Empresa> {
        const response = await api.put(`/empresas/${id}`, {
            ...empresa,
            cnpj: empresa.cnpj.replace(/\D/g, ''),
            cep: empresa.cep?.replace(/\D/g, '')
        });
        return response.data;
    }

    async deletar(id: string): Promise<void> {
        await api.delete(`/empresas/${id}`);
    }

    /**
     * Upload de certificado digital A1 para uma empresa
     * @param empresaId - ID da empresa
     * @param certBase64 - Certificado em base64 (sem prefixo)
     * @param senha - Senha do certificado
     */
    async uploadCertificado(
        empresaId: string,
        certBase64: string,
        senha: string
    ): Promise<CertificateUploadResponse> {
        try {
            const response = await api.post<CertificateUploadResponse>(
                `/certificados/empresas/${empresaId}/certificado`,
                {
                    certificado_base64: certBase64,
                    senha,
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('[EmpresaService] Erro ao fazer upload de certificado:', error);
            throw new Error(
                error.response?.data?.detail ||
                'Erro ao fazer upload do certificado'
            );
        }
    }

    /**
     * Verificar status do certificado de uma empresa
     * @param empresaId - ID da empresa
     */
    async verificarStatusCertificado(
        empresaId: string
    ): Promise<CertificateStatus> {
        try {
            const response = await api.get<CertificateStatus>(
                `/certificados/empresas/${empresaId}/certificado/status`
            );
            return response.data;
        } catch (error: any) {
            console.error('[EmpresaService] Erro ao verificar status do certificado:', error);
            throw new Error(
                error.response?.data?.detail ||
                'Erro ao verificar status do certificado'
            );
        }
    }
}

export const empresaService = new EmpresaService();
