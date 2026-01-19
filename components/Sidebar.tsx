import React from 'react';
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
  LogOut
} from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, toggleSidebar }) => {
  const menuItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, priority: 1 },
    { id: ViewState.INVOICES, label: 'Notas Fiscais', icon: FileText, priority: 1 },
    { id: ViewState.TASKS, label: 'Tarefas', icon: CheckSquare, priority: 1 },
    { id: ViewState.WHATSAPP, label: 'WhatsApp', icon: MessageCircle, priority: 1 },
    { id: ViewState.USERS, label: 'Clientes', icon: Users, priority: 1 },
    // Priority 2 items point to COMING_SOON for this demo
    { id: ViewState.COMING_SOON, label: 'Estoque', icon: Package, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Faturamento', icon: CreditCard, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Serviços', icon: Wrench, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Financeiro', icon: PieChart, priority: 2 },
    { id: ViewState.COMING_SOON, label: 'Agenda Médica', icon: Calendar, priority: 2 },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
      />

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col h-full`}>
        <div className="p-6 flex items-center justify-center border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Hi</span>
            </div>
            <span className="text-xl font-bold text-primary-700 dark:text-primary-400">Control</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Prioridade
          </div>
          {menuItems.filter(i => i.priority === 1).map((item) => (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => {
                setView(item.id);
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === item.id
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}

          <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Módulos Extras
          </div>
          {menuItems.filter(i => i.priority === 2).map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              onClick={() => {
                setView(ViewState.COMING_SOON);
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <a
            href={import.meta.env.VITE_SITE_URL || 'https://hicontrol.com.br'}
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