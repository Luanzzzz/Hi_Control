import React, { useState, useEffect } from 'react';
import { Construction, Lock } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ModuleHub } from '../components/ModuleHub';
import { Invoices } from '../components/Invoices';
import { InvoiceSearch } from '../components/InvoiceSearch';
import { InvoiceEmitter } from '../components/InvoiceEmitter';
import { PDV } from '../components/PDV';
import { CTe } from '../components/CTe';
import { NFSe } from '../components/NFSe';
import { Tasks } from '../components/Tasks';
import { WhatsAppModule } from '../components/WhatsAppModule';
import { Configuracoes } from '../components/Configuracoes';
import { ViewState } from '../types';
import { hasModuleAccess, ADMIN_ONLY_VIEWS } from '../utils/moduleVisibility';
import { useInitialRoute } from '../hooks/useInitialRoute';
import { useAuth } from '../contexts/AuthContext';

interface ClientShellProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

/**
 * Shell de layout para clientes (não-admin).
 * - MODULE_HUB: renderiza o launcher sem sidebar.
 * - Demais views: sidebar retrátil filtrada pelos módulos do plano.
 * Estado da sidebar persistido em sessionStorage (por sessão).
 *
 * Redireciona automaticamente se cliente tenta acessar view admin-only.
 */
export const ClientShell: React.FC<ClientShellProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  toggleTheme,
}) => {
  const { user } = useAuth();
  const initialRoute = useInitialRoute();

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const stored = sessionStorage.getItem('hc_client_sidebar_open');
    if (stored !== null) return stored !== 'false';
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  // Redireciona cliente que tenta acessar view admin-only
  useEffect(() => {
    if (ADMIN_ONLY_VIEWS.includes(currentView) && initialRoute !== null) {
      onViewChange(initialRoute);
    }
  }, [currentView, initialRoute]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem('hc_client_sidebar_open', String(next));
      return next;
    });
  };

  // MODULE_HUB: tela fullscreen sem sidebar
  if (currentView === ViewState.MODULE_HUB) {
    return (
      <div className="flex h-screen overflow-hidden w-full flex-col">
        <TopBar
          toggleSidebar={toggleSidebar}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <ModuleHub onModuleSelect={onViewChange} />
        </main>
      </div>
    );
  }

  const renderContent = () => {
    // Guard: cliente sem acesso a esta view
    if (!hasModuleAccess(currentView, user ?? null)) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-primary-100 dark:bg-slate-800 p-6 rounded-full mb-6">
            <Lock size={64} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Módulo Restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Este módulo não está disponível no seu plano atual.
          </p>
          <button
            onClick={() => initialRoute && onViewChange(initialRoute)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      );
    }

    switch (currentView) {
      case ViewState.INVOICE_SEARCH:
        return <InvoiceSearch />;

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

      case ViewState.SETTINGS:
        return <Configuracoes />;

      case ViewState.COMING_SOON:
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-primary-100 dark:bg-slate-800 p-6 rounded-full mb-6">
              <Construction size={64} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
              Módulo em Desenvolvimento
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Esta funcionalidade estará disponível na próxima atualização do Hi Control.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden w-full">
      <Sidebar
        currentView={currentView}
        setView={onViewChange}
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
