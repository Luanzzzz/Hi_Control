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
  Settings,
  ShoppingCart,
  Truck,
  Briefcase,
  ShieldCheck,
  User,
  Zap
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
  // Estado de sanfona: apenas um módulo expandido por vez (ou nenhum)
  const [expandedModule, setExpandedModule] = useState<ViewState | null>(ViewState.INVOICES);

  // Definição dos módulos principais com cores e estilos inspirados no Conthabil
  const menuItems: MenuItem[] = [
    {
      id: ViewState.DASHBOARD,
      label: 'Dashboard',
      icon: LayoutDashboard,
      priority: 1,
      color: 'text-blue-500'
    },
    {
      id: ViewState.INVOICES,
      label: 'NFS-e 360',
      icon: Zap,
      priority: 1,
      color: 'text-emerald-500',
      isNew: true,
      subModules: [
        { id: ViewState.DASHBOARD, label: 'Dashboard', priority: 1 },
        { id: ViewState.USERS, label: 'Empresas', priority: 1 },
        { id: ViewState.COMING_SOON, label: 'Consolidado', priority: 1 },
        { id: ViewState.SETTINGS, label: 'Configurações', priority: 1 },
      ]
    },
    {
      id: ViewState.TASKS,
      label: 'Rotinas',
      icon: CheckSquare,
      priority: 1,
      color: 'text-slate-500',
      subModules: [
        { id: ViewState.TASKS, label: 'Minhas Tarefas', priority: 1 },
        { id: ViewState.COMING_SOON, label: 'Calendário', priority: 1 },
      ]
    },
    {
      id: ViewState.USERS,
      label: 'Empresas',
      icon: Briefcase,
      priority: 1,
      color: 'text-slate-500'
    },
    {
      id: ViewState.CERTIFICATES,
      label: 'Certificados',
      icon: FileText,
      priority: 1,
      color: 'text-slate-500'
    },
    {
      id: ViewState.WHATSAPP,
      label: 'Indicações',
      icon: Users,
      priority: 1,
      color: 'text-slate-500'
    }
  ];

  const hasModuleAccess = (priority: number): boolean => {
    if (!user) return false;
    if (user.plano === UserPlan.PREMIUM) return true;
    return priority === 1;
  };

  const toggleAccordion = (moduleId: ViewState) => {
    setExpandedModule(prev => (prev === moduleId ? null : moduleId));
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasAccess = hasModuleAccess(item.priority);
    const isExpanded = expandedModule === item.id;
    const hasSubModules = item.subModules && item.subModules.length > 0;
    
    const isActive = currentView === item.id || 
      (item.subModules?.some(sub => sub.id === currentView));

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
      <div key={item.id} className="mb-1">
        <button
          onClick={handleClick}
          disabled={!hasAccess}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isActive && !hasSubModules
              ? 'bg-primary-50 text-primary-700 shadow-sm'
              : isExpanded && hasSubModules
                ? 'bg-slate-50 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          } ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white shadow-sm' : ''}`}>
              <item.icon size={20} className={item.color || 'text-slate-500'} />
            </div>
            <span className="tracking-tight">{item.label}</span>
          </div>

          <div className="flex items-center gap-2">
            {item.isNew && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Novo</span>
            )}
            {!hasAccess && <Lock size={14} className="text-slate-400" />}
            {hasSubModules && (
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-slate-400`} 
              />
            )}
          </div>
        </button>

        {/* Submódulos com animação de sanfona */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded && hasSubModules ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'
        }`}>
          <div className="ml-12 space-y-1 py-1">
            {item.subModules?.map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  setView(sub.id);
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors rounded-lg ${
                  currentView === sub.id 
                    ? 'text-primary-600 bg-primary-50/50' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}
        onClick={toggleSidebar}
      />

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-100 transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      } flex flex-col h-full`}>
        
        {/* Header: Logo Conthabil Style */}
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
            <Zap size={24} className="text-white fill-white" />
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tighter">Conthabil</span>
        </div>

        {/* Perfil do Usuário */}
        <div className="px-6 mb-8">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate">#02128 • Gestaum</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gerente • Online
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <div className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Módulos Principais
          </div>
          {menuItems.map(renderMenuItem)}
        </nav>

        {/* Rodapé - Sair */}
        <div className="p-6 mt-auto">
          <button
            onClick={() => window.location.href = 'https://site-hi-control.vercel.app'}
            className="flex items-center justify-center gap-3 px-4 py-4 text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl w-full transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={20} />
            SAIR DO SISTEMA
          </button>
        </div>
      </aside>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </>
  );
};
