import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
    async obter(token: string): Promise<Perfil> {
        try {
            const response = await axios.get(`${API_URL}/perfil`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return {}; // Return empty if not found
            }
            throw error;
        }
    }

    async atualizar(perfil: PerfilUpdate, token: string): Promise<Perfil> {
        const response = await axios.put(`${API_URL}/perfil`, {
            ...perfil,
            cnpj: perfil.cnpj.replace(/\D/g, '')
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    // Helper to handle uploading to a storage service (mocked or implementing Supabase storage if we had the client here)
    // For now, we assume logo is passed as URL or Base64 string in the body
}

export const perfilService = new PerfilService();
