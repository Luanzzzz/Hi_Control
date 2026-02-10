import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  MessageCircle,
  Users,
  Package,
  CreditCard,
  Wrench,
  Calendar,
  PieChart,
  LogOut,
  ChevronDown,
  ChevronRight,
  Lock,
  Search,
  FileEdit,
  Star,
  Settings,
  ShoppingCart,
  Truck,
  Briefcase,
  ShieldCheck
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
  const [expandedModules, setExpandedModules] = useState<Set<ViewState>>(new Set([ViewState.INVOICES]));

  // Definição dos módulos principais
  const menuItems: MenuItem[] = [
    {
      id: ViewState.DASHBOARD,
      label: 'Dashboard',
      icon: LayoutDashboard,
      priority: 1
    },
    {
      id: ViewState.INVOICES,
      label: 'Notas Fiscais',
      icon: FileText,
      priority: 1,
      subModules: [
        {
          id: ViewState.INVOICE_EMITTER,
          label: 'NF-e (Modelo 55)',
          priority: 1
        },
        {
          id: ViewState.PDV,
          label: 'NFC-e (Cupom Fiscal)',
          priority: 1
        },
        {
          id: ViewState.CTE,
          label: 'CT-e (Transporte)',
          priority: 1
        },
        {
          id: ViewState.NFSE,
          label: 'NFS-e (Serviços)',
          priority: 1
        },
        {
          id: ViewState.INVOICE_SEARCH,
          label: 'Consultar Notas',
          priority: 1,
          isPriority: true // Destacar como prioridade MVP
        }
      ]
    },
    {
      id: ViewState.TASKS,
      label: 'Tarefas',
      icon: CheckSquare,
      priority: 1
    },
    {
      id: ViewState.WHATSAPP,
      label: 'WhatsApp',
      icon: MessageCircle,
      priority: 1
    },
    {
      id: ViewState.USERS,
      label: 'Clientes',
      icon: Users,
      priority: 1
    },
    {
      id: ViewState.SETTINGS,
      label: 'Configurações',
      icon: Settings,
      priority: 1
    },
    {
      id: ViewState.CERTIFICATES,
      label: 'Certificados',
      icon: ShieldCheck,
      priority: 1
    }
  ];

  const extraModules: MenuItem[] = [
    { id: ViewState.COMING_SOON, label: 'Estoque', icon: Package, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Faturamento', icon: CreditCard, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Serviços', icon: Wrench, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Financeiro', icon: PieChart, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Agenda Médica', icon: Calendar, priority: 2 }
  ];

  // Verificar se o usuário tem acesso ao módulo
  const hasModuleAccess = (priority: number): boolean => {
    if (!user) return false;

    // Usuários Premium têm acesso a tudo
    if (user.plano === UserPlan.PREMIUM) return true;

    // Usuários Básico só têm acesso a prioridade 1
    return priority === 1;
  };

  // Verificar se módulo específico está disponível
  const isModuleAvailable = (moduleId: ViewState): boolean => {
    if (!user?.availableModules) return hasModuleAccess(1);
    return user.availableModules.includes(moduleId);
  };

  // Toggle de expansão de submódulos
  const toggleExpanded = (moduleId: ViewState) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Renderizar ícone do submódulo
  const getSubModuleIcon = (subModule: SubModule) => {
    if (subModule.id === ViewState.INVOICE_SEARCH) return Search;
    if (subModule.id === ViewState.INVOICE_EMITTER) return FileEdit;
    if (subModule.id === ViewState.PDV) return ShoppingCart;
    if (subModule.id === ViewState.CTE) return Truck;
    if (subModule.id === ViewState.NFSE) return Briefcase;
    return FileText;
  };

  // Renderizar item do menu principal
  const renderMenuItem = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.priority);
    const isExpanded = expandedModules.has(item.id);
    const hasSubModules = item.subModules && item.subModules.length > 0;

    const isActive = currentView === item.id ||
      (item.subModules?.some(sub => sub.id === currentView));

    const handleClick = () => {
      if (!hasAccess) return;

      if (hasSubModules) {
        toggleExpanded(item.id);
      } else {
        setView(item.id);
        if (window.innerWidth < 1024) toggleSidebar();
      }
    };

    return (
      <div key={item.id}>
        <button
          onClick={handleClick}
          disabled={!hasAccess}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : hasAccess
              ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              : 'text-gray-400 dark:text-gray-600 opacity-60 cursor-not-allowed'
            }`}
        >
          <div className="flex items-center gap-3">
            <item.icon size={18} />
            {item.label}
          </div>

          <div className="flex items-center gap-1">
            {!hasAccess && <Lock size={14} />}
            {hasSubModules && hasAccess && (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            )}
          </div>
        </button>

        {/* Submódulos */}
        {hasSubModules && isExpanded && hasAccess && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
            {item.subModules!.map((subModule) => renderSubModule(subModule))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar submódulo
  const renderSubModule = (subModule: SubModule) => {
    const hasAccess = hasModuleAccess(subModule.priority);
    const isActive = currentView === subModule.id;
    const SubModuleIcon = getSubModuleIcon(subModule);

    const handleClick = () => {
      if (!hasAccess) return;
      setView(subModule.id);
      if (window.innerWidth < 1024) toggleSidebar();
    };

    return (
      <button
        key={subModule.id}
        onClick={handleClick}
        disabled={!hasAccess}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
          : hasAccess
            ? 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700/30'
            : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
          }`}
      >
        <div className="flex items-center gap-2">
          <SubModuleIcon size={14} />
          {subModule.label}
        </div>

        <div className="flex items-center gap-1">
          {subModule.isPriority && hasAccess && (
            // Star removida conforme solicitado
            null
          )}
          {!hasAccess && <Lock size={12} />}
        </div>
      </button>
    );
  };

  // Renderizar módulo extra (bloqueado)
  const renderExtraModule = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.priority);

    const handleClick = () => {
      if (hasAccess) {
        setView(ViewState.COMING_SOON);
        if (window.innerWidth < 1024) toggleSidebar();
      }
    };

    return (
      <button
        key={`${item.label}-${item.id}`}
        onClick={handleClick}
        disabled={!hasAccess}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${hasAccess
          ? 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
          }`}
      >
        <div className="flex items-center gap-3">
          <item.icon size={18} />
          {item.label}
        </div>
        {!hasAccess && <Lock size={14} />}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
      />

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col h-full`}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-center border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Hi</span>
            </div>
            <span className="text-xl font-bold text-primary-700 dark:text-primary-400">Control</span>
          </div>
        </div>

        {/* Plano do Usuário */}
        {user && (
          <div className="px-6 py-3 bg-primary-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Plano Atual</p>
            <p className={`text-sm font-bold ${user.plano === UserPlan.PREMIUM
              ? 'text-primary-700 dark:text-primary-400'
              : 'text-gray-700 dark:text-gray-300'
              }`}>
              {user.plano === UserPlan.PREMIUM ? 'Premium' : 'Básico'}
            </p>
          </div>
        )}

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Módulos Principais */}
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Módulos
          </div>
          {menuItems.map(renderMenuItem)}

          {/* Módulos Extras */}
          <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Módulos Extras
          </div>
          {extraModules.map(renderExtraModule)}
        </nav>

        {/* Rodapé - Sair */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <a
            href="https://site-hi-control.vercel.app"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </a>
        </div>
      </aside>
    </>
  );
};