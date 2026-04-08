import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { ViewState } from './types';
import { useInitialRoute } from './hooks/useInitialRoute';
import { AdminShell } from './shells/AdminShell';
import { ClientShell } from './shells/ClientShell';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const initialRoute = useInitialRoute(); // null enquanto carrega (R3)
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Navegação com suporte ao botão voltar do browser
  const navigateTo = useCallback((view: ViewState) => {
    setCurrentView(view);
    window.history.pushState({ view }, '');
  }, []);

  // Escuta o botão voltar/avançar do browser
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view as ViewState | undefined;
      if (view) {
        setCurrentView(view); // setCurrentView direto — não pushState para não duplicar
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Define a rota inicial quando o carregamento de auth termina (R3 fix)
  useEffect(() => {
    if (initialRoute !== null) {
      setCurrentView(initialRoute);
      // Substitui o estado inicial no histórico (não empilha)
      window.history.replaceState({ view: initialRoute }, '');
    }
  }, [initialRoute]);

  // Preferência de tema do sistema
  useEffect(() => {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  // Aplica dark mode no documento
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((v) => !v);

  // 1. Auth ainda carregando
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // 2. Não autenticado → Login (ANTES de checar initialRoute)
  if (!isAuthenticated) {
    return <Login />;
  }

  // 3. Autenticado, mas rota ainda resolvendo (edge case transitório)
  if (initialRoute === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const shellProps = {
    currentView,
    onViewChange: navigateTo,
    isDarkMode,
    toggleTheme,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {user?.isAdmin ? (
        <AdminShell {...shellProps} />
      ) : (
        <ClientShell {...shellProps} />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
