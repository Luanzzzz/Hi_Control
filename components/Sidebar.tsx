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
  Lock,
  Search,
  FileEdit,
  Settings,
  ShoppingCart,
  Truck,
  Briefcase,
  Menu,
} from 'lucide-react';
import { ViewState, MenuItem, SubModule, MODULE_VIEWS, UserPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  // Lógica de sanfona: apenas um módulo expandido por vez
  const [expandedModule, setExpandedModule] = useState<ViewState | null>(ViewState.INVOICES);

  const menuItems: MenuItem[] = [
    {
      id: ViewState.DASHBOARD,
      label: 'Dashboard',
      icon: LayoutDashboard,
      priority: 1,
    },
    {
      id: ViewState.INVOICES,
      label: 'Emissão de NF',
      icon: FileEdit,
      priority: 1,
      subModules: [
        { id: ViewState.INVOICE_EMITTER, label: 'NF-e (Modelo 55)', priority: 1 },
        { id: ViewState.PDV, label: 'NFC-e (Cupom Fiscal)', priority: 1 },
        { id: ViewState.CTE, label: 'CT-e (Transporte)', priority: 1 },
        { id: ViewState.NFSE, label: 'NFS-e (Serviços)', priority: 1 },
      ],
    },
    {
      id: ViewState.INVOICE_SEARCH,
      label: 'Consultar Notas',
      icon: Search,
      priority: 1,
    },
    { id: ViewState.TASKS, label: 'Tarefas', icon: CheckSquare, priority: 1 },
    { id: ViewState.WHATSAPP, label: 'WhatsApp', icon: MessageCircle, priority: 1 },
    { id: ViewState.USERS, label: 'Clientes', icon: Users, priority: 1 },
    { id: ViewState.SETTINGS, label: 'Configurações', icon: Settings, priority: 1 },
  ];

  const extraModules: MenuItem[] = [
    { id: ViewState.COMING_SOON, label: 'Estoque', icon: Package, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Faturamento', icon: CreditCard, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Serviços', icon: Wrench, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Financeiro', icon: PieChart, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Agenda Médica', icon: Calendar, priority: 2 },
  ];

  const hasModuleAccess = (view: ViewState): boolean => {
    if (!user) return false;
    if (user.isAdmin === true) return true;
    if (view === ViewState.SETTINGS || view === ViewState.COMING_SOON) return true;

    const modules = user.availableModules ?? [];
    return Object.entries(MODULE_VIEWS).some(
      ([mod, views]) => modules.includes(mod) && views.includes(view)
    );
  };

  const toggleAccordion = (moduleId: ViewState) => {
    setExpandedModule((prev) => (prev === moduleId ? null : moduleId));
  };

  const getSubModuleIcon = (subModule: SubModule) => {
    if (subModule.id === ViewState.INVOICE_SEARCH) return Search;
    if (subModule.id === ViewState.INVOICE_EMITTER) return FileEdit;
    if (subModule.id === ViewState.PDV) return ShoppingCart;
    if (subModule.id === ViewState.CTE) return Truck;
    if (subModule.id === ViewState.NFSE) return Briefcase;
    return FileText;
  };

  // Iniciais do nome do usuário para o avatar
  const getUserInitials = (): string => {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.id);
    const isExpanded = expandedModule === item.id;
    const hasSubModules = item.subModules && item.subModules.length > 0;
    const isActive =
      currentView === item.id || item.subModules?.some((sub) => sub.id === currentView);

    const handleClick = () => {
      if (!hasAccess) return;
      if (hasSubModules) {
        toggleAccordion(item.id);
      } else {
        setView(item.id);
        if (window.innerWidth < 1024) toggleSidebar();
      }
    };

    return (
      <div key={`${item.id}-${item.label}`}>
        <button
          onClick={handleClick}
          disabled={!hasAccess}
          aria-label={item.label}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isActive
              ? 'bg-hc-purple-dim text-hc-purple-light font-medium'
              : hasAccess
              ? 'text-hc-muted hover:bg-hc-card hover:text-hc-accent'
              : 'text-hc-muted opacity-40 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon size={18} />
            {item.label}
          </div>
          <div className="flex items-center gap-1">
            {!hasAccess && <Lock size={14} />}
            {hasSubModules && hasAccess && (
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </button>

        {/* Submódulos — sanfona */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded && hasSubModules && hasAccess ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="ml-4 space-y-1 border-l border-hc-border pl-2">
            {(item.subModules ?? []).map((subModule) => (
              <button
                key={subModule.id}
                onClick={() => {
                  setView(subModule.id);
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                disabled={!hasModuleAccess(subModule.id)}
                aria-label={subModule.label}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === subModule.id
                    ? 'bg-hc-purple-dim text-hc-purple-light'
                    : 'text-hc-muted hover:bg-hc-card hover:text-hc-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  {React.createElement(getSubModuleIcon(subModule), { size: 14 })}
                  {subModule.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderExtraModule = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.id);

    const handleClick = () => {
      if (hasAccess) {
        setView(ViewState.COMING_SOON);
        if (window.innerWidth < 1024) toggleSidebar();
      }
    };

    return (
      <button
        key={`${item.label}-extra`}
        onClick={handleClick}
        disabled={!hasAccess}
        aria-label={item.label}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          hasAccess
            ? 'text-hc-muted hover:bg-hc-card hover:text-hc-accent'
            : 'text-hc-muted opacity-30 cursor-not-allowed'
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
      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 bg-black/60 z-20 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30
          transform transition-all duration-300 ease-in-out
          border-r border-hc-border bg-hc-surface
          flex flex-col h-full
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0 lg:w-0 lg:overflow-hidden'}
        `}
        aria-label="Menu lateral"
      >
        {/* Logo + botão recolher */}
        <div className="p-5 flex items-center justify-between border-b border-hc-border">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg bg-hc-purple flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-sm font-display">Hi</span>
            </div>
            <div>
              <p className="text-sm font-semibold font-display text-hc-text leading-none">Hi-Control</p>
              <p className="text-[10px] text-hc-muted mt-0.5">Gestão Contábil</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-hc-card transition-colors text-hc-muted hover:text-hc-accent"
            aria-label="Recolher menu"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Plano do usuário */}
        {user && (
          <div className="px-5 py-2.5 bg-hc-purple-dim/30 border-b border-hc-border">
            <p className="text-[10px] text-hc-muted">Plano Atual</p>
            <p
              className={`text-xs font-semibold ${
                user.plano === UserPlan.PREMIUM ? 'text-hc-purple-light' : 'text-hc-muted'
              }`}
            >
              {user.plano === UserPlan.PREMIUM ? 'Premium' : 'Básico'}
            </p>
          </div>
        )}

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Módulos do sistema">
          <p className="px-3 mb-2 text-[10px] font-semibold text-hc-muted uppercase tracking-wider">
            Módulos
          </p>
          {menuItems.map(renderMenuItem)}

          <p className="px-3 mt-6 mb-2 text-[10px] font-semibold text-hc-muted uppercase tracking-wider">
            Módulos Extras
          </p>
          {extraModules.map(renderExtraModule)}
        </nav>

        {/* Footer com avatar do usuário */}
        <div className="p-4 border-t border-hc-border">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full bg-hc-purple-dim border border-hc-border flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <span className="text-[11px] font-semibold text-hc-purple-light">{getUserInitials()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-hc-text truncate">{user.name ?? user.email}</p>
                <p className="text-[10px] text-hc-muted truncate">{user.email}</p>
              </div>
            </div>
          )}
          <a
            href="https://site-hi-control.vercel.app"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-hc-red hover:bg-red-500/10 rounded-lg w-full transition-colors"
            aria-label="Sair do sistema"
          >
            <LogOut size={16} />
            Sair do Sistema
          </a>
        </div>
      </aside>
    </>
  );
};
