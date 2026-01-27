import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Serviço API Centralizado Hi-Control
 *
 * Cliente Axios configurado com:
 * - BaseURL do backend FastAPI
 * - Interceptor de Request: Adiciona JWT token automaticamente
 * - Interceptor de Response: Trata erros 401 (logout automático)
 */

// Configuração da URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Criar instância do Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * REQUEST INTERCEPTOR
 * Adiciona o token JWT em todas as requisições autenticadas
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Buscar access_token do localStorage e sanitizar aspas extras
    const rawToken = localStorage.getItem('access_token');
    const token = rawToken?.replace(/"/g, ''); // Remove aspas acidentais de JSON.stringify

    if (token && config.headers) {
      // Adicionar header Authorization: Bearer <token>
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Trata erros globalmente, especialmente 401 (não autenticado)
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Retorna a resposta normalmente se não houver erro
    return response;
  },
  (error: AxiosError<{ detail?: string }>) => {
    // Erro 401 Unauthorized - Token expirado ou inválido
    if (error.response?.status === 401) {
      // Remover tokens do localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('hi_control_user');

      // Disparar evento customizado para AuthContext gerenciar logout
      window.dispatchEvent(new CustomEvent('auth:session-expired'));

      // Retornar erro customizado
      return Promise.reject({
        ...error,
        message: 'Sessão expirada. Faça login novamente.',
      });
    }

    // Erro 403 Forbidden - Acesso negado (módulo não disponível no plano)
    if (error.response?.status === 403) {
      const message = error.response.data?.detail || 'Acesso negado. Seu plano não inclui este módulo.';
      return Promise.reject({
        ...error,
        message,
      });
    }

    // Erro 400 Bad Request - Validação de parâmetros
    if (error.response?.status === 400) {
      const message = error.response.data?.detail || 'Parâmetros inválidos. Verifique os dados enviados.';
      return Promise.reject({
        ...error,
        message,
      });
    }

    // Erro 404 Not Found
    if (error.response?.status === 404) {
      const message = error.response.data?.detail || 'Recurso não encontrado.';
      return Promise.reject({
        ...error,
        message,
      });
    }

    // Erro 500 Internal Server Error
    if (error.response?.status === 500) {
      return Promise.reject({
        ...error,
        message: 'Erro interno do servidor. Tente novamente mais tarde.',
      });
    }

    // Erro de rede (sem resposta do servidor)
    if (!error.response) {
      return Promise.reject({
        ...error,
        message: 'Erro de conexão com o servidor. Verifique sua internet.',
      });
    }

    // Outros erros
    return Promise.reject(error);
  }
);

/**
 * Função auxiliar para salvar tokens no localStorage
 */
export const saveTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

/**
 * Função auxiliar para remover tokens do localStorage
 */
export const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('hi_control_user');
};

/**
 * Função auxiliar para obter token do localStorage
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export default api;
