import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { Invoices } from './components/Invoices';
import { Tasks } from './components/Tasks';
import { WhatsAppModule } from './components/WhatsAppModule';
import { ViewState } from './types';
import { Construction } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.INVOICES:
        return <Invoices />;
      case ViewState.TASKS:
        return <Tasks />;
      case ViewState.WHATSAPP:
        return <WhatsAppModule />;
      case ViewState.COMING_SOON:
      case ViewState.USERS:
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-primary-100 dark:bg-slate-800 p-6 rounded-full mb-6">
              <Construction size={64} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Módulo em Desenvolvimento</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Esta funcionalidade (Prioridade Nível 2) estará disponível na próxima atualização do Hi Control.
            </p>
          </div>
        );
    }
  };

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

export default App;