import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, UserPlan } from '../types';

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
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setAuthState({ user, loading: false, error: null });
            } catch (error) {
                localStorage.removeItem('hi_control_user');
                setAuthState({ user: null, loading: false, error: null });
            }
        } else {
            setAuthState({ user: null, loading: false, error: null });
        }
    }, []);

    const signIn = async (email: string, password: string): Promise<void> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        // Mock authentication - simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Mock users for demonstration
                const mockUsers: { [key: string]: { password: string; user: User } } = {
                    'admin@hicontrol.com': {
                        password: 'admin123',
                        user: {
                            id: '1',
                            email: 'admin@hicontrol.com',
                            name: 'Administrador',
                            plano: UserPlan.PREMIUM,
                            created_at: new Date().toISOString(),
                        },
                    },
                    'premium@hicontrol.com': {
                        password: 'premium123',
                        user: {
                            id: '2',
                            email: 'premium@hicontrol.com',
                            name: 'Usuário Premium',
                            plano: UserPlan.PREMIUM,
                            created_at: new Date().toISOString(),
                        },
                    },
                    'basico@hicontrol.com': {
                        password: 'basico123',
                        user: {
                            id: '3',
                            email: 'basico@hicontrol.com',
                            name: 'Usuário Básico',
                            plano: UserPlan.BASICO,
                            created_at: new Date().toISOString(),
                        },
                    },
                };

                const userRecord = mockUsers[email];

                if (userRecord && userRecord.password === password) {
                    const user = userRecord.user;
                    localStorage.setItem('hi_control_user', JSON.stringify(user));
                    setAuthState({ user, loading: false, error: null });
                    resolve();
                } else {
                    const error = 'Email ou senha inválidos';
                    setAuthState({ user: null, loading: false, error });
                    reject(new Error(error));
                }
            }, 1000); // Simulate network delay
        });
    };

    const signOut = () => {
        localStorage.removeItem('hi_control_user');
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
