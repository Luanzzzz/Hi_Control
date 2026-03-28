import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, UserPlan } from '../types';
import api, { saveTokens, clearTokens } from '../src/services/api';

interface AuthContextType extends AuthState {
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
        error: null,
    });

    // Check for existing session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('hi_control_user');
        const accessToken = localStorage.getItem('access_token');

        // Validar AMBOS juntos - token e usuário devem existir
        if (storedUser && accessToken) {
            try {
                const user = JSON.parse(storedUser);
                setAuthState({ user, loading: false, error: null });
            } catch (error) {
                // Erro ao parsear usuário - limpar tudo
                clearTokens();
                setAuthState({ user: null, loading: false, error: null });
            }
        } else {
            // Token ou usuário ausente - limpar tudo e pedir login
            clearTokens();
            setAuthState({ user: null, loading: false, error: null });
        }

        // Listener para evento de sessão expirada (disparado pelo interceptor)
        const handleSessionExpired = () => {
            clearTokens();
            setAuthState({
                user: null,
                loading: false,
                error: 'Sessão expirada. Faça login novamente.'
            });
        };

        window.addEventListener('auth:session-expired', handleSessionExpired);

        // Cleanup do listener ao desmontar
        return () => {
            window.removeEventListener('auth:session-expired', handleSessionExpired);
        };
    }, []);

    const signIn = async (email: string, password: string): Promise<void> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // 1. Fazer login no backend - POST /auth/login
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const loginResponse = await api.post('/auth/login', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token, refresh_token } = loginResponse.data;

            // 2. Salvar tokens no localStorage
            saveTokens(access_token, refresh_token);

            // 3. Buscar dados do usuário - GET /auth/me
            const userResponse = await api.get('/auth/me');
            const userData = userResponse.data;

            // 4. Mapear plano do backend para frontend
            // Backend: "basico", "profissional", "enterprise"
            // Frontend: UserPlan.BASICO ou UserPlan.PREMIUM
            let userPlan: UserPlan = UserPlan.BASICO;

            // Primeiro verifica se é admin ou tem role especial
            if (userData.is_admin === true || userData.role === 'admin') {
                userPlan = UserPlan.PREMIUM;
            }
            // Depois verifica o nome do plano
            else if (userData.plano_nome) {
                const planoNormalizado = userData.plano_nome.toLowerCase();
                if (planoNormalizado.includes('profissional') ||
                    planoNormalizado.includes('premium') ||
                    planoNormalizado.includes('enterprise')) {
                    userPlan = UserPlan.PREMIUM;
                }
            }

            // 5. Criar objeto User compatível com o frontend
            const user: User = {
                id: userData.id,
                email: userData.email,
                name: userData.nome_completo || userData.email,
                plano: userPlan,
                created_at: userData.created_at || new Date().toISOString(),
                availableModules: userData.modulos_disponiveis || [],
                isAdmin: userData.is_admin || false,
                role: userData.role,
            };

            // 6. Salvar usuário no localStorage e state
            localStorage.setItem('hi_control_user', JSON.stringify(user));
            setAuthState({ user, loading: false, error: null });

        } catch (error: any) {
            // BLINDAGEM DE ERRO - Garantir que errorMessage seja SEMPRE string
            const detail = error.response?.data?.detail;
            let errorMessage = 'Erro ao fazer login.';

            if (typeof detail === 'string') {
                errorMessage = detail;
            } else if (Array.isArray(detail)) {
                // Erro 422 do FastAPI vem como array: [{msg: '...', ...}]
                errorMessage = detail[0]?.msg || 'Dados de login inválidos.';
            } else if (detail && typeof detail === 'object') {
                errorMessage = (detail as any).msg || 'Erro na estrutura dos dados.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Email ou senha incorretos.';
            } else if (error.response?.status === 403) {
                errorMessage = 'Usuário inativo. Contate o suporte.';
            }

            // Limpar tokens em caso de erro
            clearTokens();
            setAuthState({ user: null, loading: false, error: errorMessage });
            throw new Error(errorMessage);
        }
    };

    const signOut = () => {
        // Limpar todos os tokens e dados do usuário
        clearTokens();
        setAuthState({ user: null, loading: false, error: null });
    };

    const value: AuthContextType = {
        ...authState,
        signIn,
        signOut,
        isAuthenticated: authState.user !== null,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
