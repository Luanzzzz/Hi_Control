import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { Invoices } from './components/Invoices';
import { InvoiceEmitter } from './components/InvoiceEmitter';
import { PDV } from './components/PDV';
import { CTe } from './components/CTe';
import { NFSe } from './components/NFSe';
import { Tasks } from './components/Tasks';
import { WhatsAppModule } from './components/WhatsAppModule';
import { ViewState, UserPlan, ModuleAccess } from './types';
import { Construction, Lock } from 'lucide-react';
import { Clients } from './components/Clients';
import { Configuracoes } from './components/Configuracoes';
import { ClienteDashboard } from './components/ClienteDashboard';

const moduleAccess: ModuleAccess = {
  [ViewState.DASHBOARD]: 1,
  [ViewState.INVOICES]: 1,
  [ViewState.INVOICE_EMITTER]: 1,
  [ViewState.CLIENT_DASHBOARD]: 1,
  [ViewState.PDV]: 1,
  [ViewState.CTE]: 1,
  [ViewState.NFSE]: 1,
  [ViewState.TASKS]: 1,
  [ViewState.WHATSAPP]: 1,
  [ViewState.USERS]: 2,
  [ViewState.CERTIFICATES]: 1,
  [ViewState.SETTINGS]: 1,
  [ViewState.CLIENT_DETAIL]: 1,
  [ViewState.COMING_SOON]: 2,
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth < 768) return false;
    const savedState = localStorage.getItem('sidebar_collapsed');
    return savedState !== 'true';
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        const savedState = localStorage.getItem('sidebar_collapsed');
        setIsSidebarOpen(savedState !== 'true');
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        localStorage.setItem('sidebar_collapsed', String(!next));
      }
      return next;
    });
  };

  const hasModuleAccess = (view: ViewState): boolean => {
    if (!user) return false;
    const modulePriority = moduleAccess[view];
    if (user.plano === UserPlan.PREMIUM || user.plano === UserPlan.ADMIN) return true;
    return modulePriority === 1;
  };

  const renderContent = () => {
    if (!hasModuleAccess(currentView)) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-primary-100 dark:bg-slate-800 p-6 rounded-full mb-6">
            <Lock size={64} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Modulo Restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Este modulo esta disponivel apenas no plano Premium.
          </p>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Fazer Upgrade para Premium
          </button>
        </div>
      );
    }

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.INVOICES:
        return <Invoices />;
      case ViewState.INVOICE_EMITTER:
        return <InvoiceEmitter />;
      case ViewState.PDV:
        return <PDV />;
      case ViewState.CTE:
        return <CTe />;
      case ViewState.NFSE:
        return <NFSe />;
      case ViewState.TASKS:
        return <Tasks />;
      case ViewState.WHATSAPP:
        return <WhatsAppModule />;
      case ViewState.USERS:
        return (
          <Clients
            onNavigateToDashboard={(empresaId: string) => {
              setSelectedEmpresaId(empresaId);
              setCurrentView(ViewState.CLIENT_DASHBOARD);
            }}
          />
        );
      case ViewState.CLIENT_DASHBOARD:
        return (
          <ClienteDashboard
            empresaId={selectedEmpresaId}
            onVoltar={() => setCurrentView(ViewState.USERS)}
          />
        );
      case ViewState.SETTINGS:
        return <Configuracoes />;
      case ViewState.COMING_SOON:
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-primary-100 dark:bg-slate-800 p-6 rounded-full mb-6">
              <Construction size={64} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Modulo em Desenvolvimento</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Esta funcionalidade estara disponivel na proxima atualizacao do Hi Control.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <NotificationsProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
        <Sidebar
          currentView={currentView}
          setView={setCurrentView}
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        <div className="flex-1 flex flex-col overflow-hidden w-full relative">
          <TopBar
            toggleSidebar={toggleSidebar}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />

          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
