import React, { useState } from 'react';
import { Construction, Lock } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Dashboard } from '../components/Dashboard';
import { Invoices } from '../components/Invoices';
import { InvoiceSearch } from '../components/InvoiceSearch';
import { InvoiceEmitter } from '../components/InvoiceEmitter';
import { PDV } from '../components/PDV';
import { CTe } from '../components/CTe';
import { NFSe } from '../components/NFSe';
import { Tasks } from '../components/Tasks';
import { WhatsAppModule } from '../components/WhatsAppModule';
import { Clients } from '../components/Clients';
import { Configuracoes } from '../components/Configuracoes';
import { ClientDashboard } from '../components/ClientDashboard';
import { ClientSearchDashboard } from '../components/ClientSearchDashboard';
import { ClientEmissionDashboard } from '../components/ClientEmissionDashboard';
import { SearchDashboard } from '../components/SearchDashboard';
import { EmissionDashboard } from '../components/EmissionDashboard';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AdminShellProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

/**
 * Shell de layout para usuários admin.
 * Sidebar sempre visível e completa (sem filtragem de módulos).
 * Estado da sidebar persistido em localStorage.
 */
export const AdminShell: React.FC<AdminShellProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  toggleTheme,
}) => {
  const { user } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('hc_admin_sidebar_open');
    if (stored !== null) return stored !== 'false';
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  // selectedClientId é estado interno do shell admin (CLIENT_DETAIL)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('hc_admin_sidebar_open', String(next));
      return next;
    });
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard setView={onViewChange} />;

      case ViewState.INVOICES:
        return <Invoices />;

      case ViewState.INVOICE_SEARCH:
        return <InvoiceSearch />;

      case ViewState.SEARCH_DASHBOARD:
        return (
          <SearchDashboard
            setView={onViewChange}
            onNavigateToClient={(empresaId) => {
              setSelectedClientId(empresaId);
              onViewChange(ViewState.CLIENT_SEARCH_DETAIL);
            }}
          />
        );

      case ViewState.EMISSION_DASHBOARD:
        return (
          <EmissionDashboard
            setView={onViewChange}
            onNavigateToClient={(empresaId) => {
              setSelectedClientId(empresaId);
              onViewChange(ViewState.CLIENT_EMISSION_DETAIL);
            }}
          />
        );

      case ViewState.CLIENT_SEARCH_DETAIL:
        return (
          <ClientSearchDashboard
            empresaId={selectedClientId ?? ''}
            onBack={() => {
              setSelectedClientId(null);
              onViewChange(ViewState.SEARCH_DASHBOARD);
            }}
          />
        );

      case ViewState.CLIENT_EMISSION_DETAIL:
        return (
          <ClientEmissionDashboard
            empresaId={selectedClientId ?? ''}
            onBack={() => {
              setSelectedClientId(null);
              onViewChange(ViewState.EMISSION_DASHBOARD);
            }}
            onNavigate={onViewChange}
          />
        );

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
              setSelectedClientId(empresaId);
              onViewChange(ViewState.CLIENT_DETAIL);
            }}
          />
        );

      case ViewState.CLIENT_DETAIL:
        return (
          <ClientDashboard
            empresaId={selectedClientId ?? ''}
            onBack={() => {
              setSelectedClientId(null);
              onViewChange(ViewState.USERS);
            }}
          />
        );

      case ViewState.SETTINGS:
        return <Configuracoes />;

      case ViewState.MODULE_HUB:
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
