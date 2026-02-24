import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  CreditCard,
  FileEdit,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  Briefcase,
} from 'lucide-react';
import { ViewState, MenuItem, SubModule, UserPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const [expandedModule, setExpandedModule] = useState<ViewState | null>(ViewState.INVOICES);
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen && !isMobile) {
      setExpandedModule(null);
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebar_collapsed', String(!isOpen));
    }
  }, [isMobile, isOpen]);

  const showText = isOpen || isMobile;

  const menuItems: MenuItem[] = [
    {
      id: ViewState.DASHBOARD,
      label: 'Dashboard',
      icon: LayoutDashboard,
      priority: 1,
    },
    {
      id: ViewState.INVOICES,
      label: 'Notas Fiscais',
      icon: FileText,
      priority: 1,
      subModules: [
        { id: ViewState.INVOICE_EMITTER, label: 'NF-e (Modelo 55)', priority: 1 },
        { id: ViewState.PDV, label: 'NFC-e (Cupom Fiscal)', priority: 1 },
        { id: ViewState.CTE, label: 'CT-e (Transporte)', priority: 1 },
        { id: ViewState.NFSE, label: 'NFS-e (Servicos)', priority: 1 },
      ],
    },
    {
      id: ViewState.TASKS,
      label: 'Tarefas',
      icon: CheckSquare,
      priority: 1,
    },
    {
      id: ViewState.WHATSAPP,
      label: 'WhatsApp',
      icon: MessageCircle,
      priority: 1,
    },
    {
      id: ViewState.USERS,
      label: 'Clientes',
      icon: Users,
      priority: 1,
    },
    {
      id: ViewState.SETTINGS,
      label: 'Configuracoes',
      icon: Settings,
      priority: 1,
    },
  ];

  const extraModules: MenuItem[] = [
    { id: ViewState.COMING_SOON, label: 'Estoque', icon: Package, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Faturamento', icon: CreditCard, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Servicos', icon: Wrench, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Financeiro', icon: PieChart, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Agenda Medica', icon: Calendar, priority: 2 },
  ];

  const hasModuleAccess = (priority: number): boolean => {
    if (!user) return false;
    if (user.plano === UserPlan.PREMIUM || user.plano === UserPlan.ADMIN) return true;
    return priority === 1;
  };

  const toggleAccordion = (moduleId: ViewState) => {
    setExpandedModule((prev) => (prev === moduleId ? null : moduleId));
  };

  const getSubModuleIcon = (subModule: SubModule) => {
    if (subModule.id === ViewState.INVOICE_EMITTER) return FileEdit;
    if (subModule.id === ViewState.PDV) return ShoppingCart;
    if (subModule.id === ViewState.CTE) return Truck;
    if (subModule.id === ViewState.NFSE) return Briefcase;
    return FileText;
  };

  const handleItemClick = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.priority);
    if (!hasAccess) return;

    const hasSubModules = Boolean(item.subModules && item.subModules.length > 0);
    if (hasSubModules) {
      if (!showText) {
        toggleSidebar();
        return;
      }
      toggleAccordion(item.id);
      return;
    }

    setView(item.id);
    if (isMobile) toggleSidebar();
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.priority);
    const hasSubModules = Boolean(item.subModules && item.subModules.length > 0);
    const isExpanded = expandedModule === item.id;
    const isActive = currentView === item.id || Boolean(item.subModules?.some((sub) => sub.id === currentView));

    return (
      <div key={item.label}>
        <button
          onClick={() => handleItemClick(item)}
          title={!showText ? item.label : undefined}
          disabled={!hasAccess}
          className={`w-full flex items-center ${showText ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-sm font-medium transition-all ${
            isActive
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : hasAccess
              ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              : 'text-gray-400 dark:text-gray-600 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className={`flex items-center ${showText ? 'gap-3' : ''}`}>
            <item.icon size={18} />
            {showText && <span>{item.label}</span>}
          </div>

          {showText && (
            <div className="flex items-center gap-1">
              {!hasAccess && <Lock size={14} />}
              {hasSubModules && hasAccess && (
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              )}
            </div>
          )}
        </button>

        {showText && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded && hasSubModules && hasAccess ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="ml-4 space-y-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
              {(item.subModules ?? []).map((subModule) => (
                <button
                  key={subModule.id}
                  onClick={() => {
                    setView(subModule.id);
                    if (isMobile) toggleSidebar();
                  }}
                  disabled={!hasModuleAccess(subModule.priority)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    currentView === subModule.id
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                      : 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700/30'
                  }`}
                >
                  {React.createElement(getSubModuleIcon(subModule), { size: 14 })}
                  <span>{subModule.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExtraModule = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.priority);

    return (
      <button
        key={`${item.label}-${item.id}`}
        onClick={() => {
          if (!hasAccess) return;
          setView(ViewState.COMING_SOON);
          if (isMobile) toggleSidebar();
        }}
        title={!showText ? item.label : undefined}
        disabled={!hasAccess}
        className={`w-full flex items-center ${showText ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-sm font-medium transition-all ${
          hasAccess
            ? 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
            : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
        }`}
      >
        <div className={`flex items-center ${showText ? 'gap-3' : ''}`}>
          <item.icon size={18} />
          {showText && <span>{item.label}</span>}
        </div>
        {showText && !hasAccess && <Lock size={14} />}
      </button>
    );
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`${
          isMobile ? 'fixed' : 'relative'
        } inset-y-0 left-0 z-30 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full flex flex-col transition-all duration-300 ${
          isMobile
            ? isOpen
              ? 'translate-x-0 w-60'
              : '-translate-x-full w-60'
            : isOpen
            ? 'translate-x-0 w-[240px]'
            : 'translate-x-0 w-16'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">Hi</span>
            </div>
            {showText && <span className="text-xl font-bold text-primary-700 dark:text-primary-400 whitespace-nowrap">Control</span>}
          </div>

          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-gray-600 dark:text-gray-300"
            title={isOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {user && showText && (
          <div className="px-4 py-3 bg-primary-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Plano Atual</p>
            <p
              className={`text-sm font-bold ${
                user.plano === UserPlan.PREMIUM || user.plano === UserPlan.ADMIN
                  ? 'text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {user.plano === UserPlan.ADMIN ? 'Admin' : user.plano === UserPlan.PREMIUM ? 'Premium' : 'Basico'}
            </p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {showText && (
            <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Modulos
            </div>
          )}
          {(menuItems ?? []).map(renderMenuItem)}

          {showText && (
            <div className="px-2 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Modulos Extras
            </div>
          )}
          {(extraModules ?? []).map(renderExtraModule)}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700">
          <a
            href="https://site-hi-control.vercel.app"
            title={!showText ? 'Sair do Sistema' : undefined}
            className={`flex items-center ${showText ? 'gap-3 px-3' : 'justify-center px-2'} py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full transition-colors`}
          >
            <LogOut size={18} />
            {showText && <span>Sair do Sistema</span>}
          </a>
        </div>
      </aside>
    </>
  );
};
