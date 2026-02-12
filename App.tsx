import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { Invoices } from './components/Invoices';
import { InvoiceSearch } from './components/InvoiceSearch';
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
import { ClientDashboard } from './components/ClientDashboard';


// Define module access levels
const moduleAccess: ModuleAccess = {
  [ViewState.DASHBOARD]: 1,
  [ViewState.INVOICES]: 1,
  [ViewState.INVOICE_EMITTER]: 1,
  [ViewState.INVOICE_SEARCH]: 1,
  [ViewState.PDV]: 1, // NFC-e disponível para todos
  [ViewState.CTE]: 1, // CT-e disponível para todos
  [ViewState.NFSE]: 1, // NFS-e disponível para todos
  [ViewState.TASKS]: 1,
  [ViewState.WHATSAPP]: 1,
  [ViewState.USERS]: 2, // Priority 2 - Restricted for basic plan
  [ViewState.CERTIFICATES]: 1,
  [ViewState.SETTINGS]: 1,
  [ViewState.CLIENT_DETAIL]: 1, // Dashboard do Cliente - todos têm acesso
  [ViewState.COMING_SOON]: 2, // Priority 2
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  // Sidebar aberta por padrão em desktop (>= 1024px), fechada em mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isDarkMode, setIsDarkMode] = useState(false);


  useEffect(() => {
    // Check system preference or localStorage
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

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Check if user has access to a module based on their plan
  const hasModuleAccess = (view: ViewState): boolean => {
    if (!user) return false;
    const modulePriority = moduleAccess[view];

    // Premium users have access to all modules
    if (user.plano === UserPlan.PREMIUM) return true;

    // Basic users only have access to Priority 1 modules
    return modulePriority === 1;
  };

  const renderContent = () => {
    // Check if user has access to current view
    if (!hasModuleAccess(currentView)) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-primary-100 dark:bg-slate-800 p-6 rounded-full mb-6">
            <Lock size={64} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Módulo Restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Este módulo está disponível apenas no plano Premium. Atualize seu plano para ter acesso completo a todos os recursos do Hi Control.
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

      case ViewState.INVOICE_SEARCH:
        return <InvoiceSearch />;

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
            onNavigateToBuscador={(empresaId) => {
              // Navegar para o detalhe do cliente
              setSelectedClientId(empresaId);
              setCurrentView(ViewState.CLIENT_DETAIL);
            }}
          />
        );

      case ViewState.CLIENT_DETAIL:
        return (
          <ClientDashboard
            empresaId={selectedClientId || ''}
            onBack={() => {
              setSelectedClientId(null);
              setCurrentView(ViewState.USERS);
            }}
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
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Módulo em Desenvolvimento</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Esta funcionalidade estará disponível na próxima atualização do Hi Control.
            </p>
          </div>
        );
    }
  };

  // Show loading state
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

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show main app
  return (
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
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;