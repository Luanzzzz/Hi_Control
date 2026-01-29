import api from '../src/services/api';

export interface Perfil {
    id?: string;
    nome_empresa?: string;
    cnpj?: string;
    logo_url?: string;
}

export interface PerfilUpdate {
    nome_empresa: string;
    cnpj: string;
    logo_url?: string;
}

class PerfilService {
    async obter(_token?: string): Promise<Perfil> {
        try {
            // Token is automatically added by api interceptor
            const response = await api.get('/perfil');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return {}; // Return empty if not found
            }
            throw error;
        }
    }

    async atualizar(perfil: PerfilUpdate, _token?: string): Promise<Perfil> {
        // Token is automatically added by api interceptor
        const response = await api.put('/perfil', {
            ...perfil,
            cnpj: perfil.cnpj.replace(/\D/g, '')
        });
        return response.data;
    }

    // Helper to handle uploading to a storage service (mocked or implementing Supabase storage if we had the client here)
    // For now, we assume logo is passed as URL or Base64 string in the body
}

export const perfilService = new PerfilService();
