import axios from 'axios';

// Ensure API URL is configured correctly
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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

class EmpresaService {
    async listar(token: string): Promise<Empresa[]> {
        const response = await axios.get(`${API_URL}/empresas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    async criar(empresa: EmpresaCreate, token: string): Promise<Empresa> {
        const response = await axios.post(`${API_URL}/empresas`, {
            ...empresa,
            // Remove mask characters from CNPJ/CEP if needed, but backend handles validation
            cnpj: empresa.cnpj.replace(/\D/g, ''),
            cep: empresa.cep?.replace(/\D/g, '')
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    async atualizar(id: string, empresa: EmpresaCreate, token: string): Promise<Empresa> {
        const response = await axios.put(`${API_URL}/empresas/${id}`, {
            ...empresa,
            cnpj: empresa.cnpj.replace(/\D/g, ''),
            cep: empresa.cep?.replace(/\D/g, '')
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    async deletar(id: string, token: string): Promise<void> {
        await axios.delete(`${API_URL}/empresas/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }

    /**
     * Upload de certificado digital A1 para uma empresa
     * @param empresaId - ID da empresa
     * @param certBase64 - Certificado em base64 (sem prefixo)
     * @param senha - Senha do certificado
     * @param token - Token de autenticação
     */
    async uploadCertificado(
        empresaId: string,
        certBase64: string,
        senha: string,
        token: string
    ): Promise<CertificateUploadResponse> {
        try {
            const response = await axios.post<CertificateUploadResponse>(
                `${API_URL}/certificados/empresas/${empresaId}/certificado`,
                {
                    certificado_base64: certBase64,
                    senha,
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
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
     * @param token - Token de autenticação
     */
    async verificarStatusCertificado(
        empresaId: string,
        token: string
    ): Promise<CertificateStatus> {
        try {
            const response = await axios.get<CertificateStatus>(
                `${API_URL}/certificados/empresas/${empresaId}/certificado/status`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
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
