import React from 'react';
import {
  Search,
  FileEdit,
  CheckSquare,
  MessageCircle,
  Users,
  Shield,
  Settings,
  LayoutDashboard,
  LucideIcon,
} from 'lucide-react';
import { ViewState, UserPlan } from '../types';
import { useEnabledModules } from '../hooks/useInitialRoute';
import { useAuth } from '../contexts/AuthContext';

interface ModuleHubProps {
  onModuleSelect: (view: ViewState) => void;
}

interface ModuleMeta {
  icon: LucideIcon;
  description: string;
  color: string;
}

const MODULE_META: Record<string, ModuleMeta> = {
  buscador_notas: {
    icon: Search,
    description: 'Consulte e gerencie suas notas fiscais',
    color: 'text-blue-500',
  },
  emissor_notas: {
    icon: FileEdit,
    description: 'Emita NF-e, NFC-e, CT-e e NFS-e',
    color: 'text-hc-purple-light',
  },
  tarefas: {
    icon: CheckSquare,
    description: 'Organize e acompanhe suas tarefas',
    color: 'text-green-500',
  },
  whatsapp: {
    icon: MessageCircle,
    description: 'Gerencie seus contatos e mensagens',
    color: 'text-emerald-500',
  },
  clientes: {
    icon: Users,
    description: 'Gestão de clientes e empresas',
    color: 'text-orange-500',
  },
  certificados: {
    icon: Shield,
    description: 'Gerencie certificados digitais A1 e A3',
    color: 'text-red-500',
  },
  configuracoes: {
    icon: Settings,
    description: 'Configure sua conta e preferências',
    color: 'text-slate-400',
  },
  dashboard: {
    icon: LayoutDashboard,
    description: 'Visão geral do sistema',
    color: 'text-hc-purple-light',
  },
};

/**
 * Launcher de módulos para clientes com 2+ módulos habilitados.
 * Exibe cards de navegação — sem métricas analíticas.
 */
export const ModuleHub: React.FC<ModuleHubProps> = ({ onModuleSelect }) => {
  const { user } = useAuth();
  const enabledModules = useEnabledModules();

  const firstName = user?.name?.split(' ')[0] ?? 'Olá';
  const planLabel = user?.plano === UserPlan.PREMIUM ? 'Premium' : 'Básico';

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-4xl">
        {/* Cabeçalho */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Bem-vindo, {firstName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Escolha o módulo que deseja acessar
          </p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-hc-purple-dim text-hc-purple-light border border-hc-purple/20">
            Plano {planLabel}
          </span>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledModules.map(({ moduleId, primaryView, label }) => {
            const meta = MODULE_META[moduleId];
            if (!meta) return null;
            const Icon = meta.icon;

            return (
              <button
                key={moduleId}
                onClick={() => onModuleSelect(primaryView)}
                className="group flex flex-col items-center gap-4 p-8 rounded-xl
                  bg-white dark:bg-slate-800
                  border border-slate-200 dark:border-slate-700
                  hover:border-hc-purple dark:hover:border-hc-purple
                  hover:shadow-lg dark:hover:shadow-slate-900/50
                  transition-all duration-200 text-left"
              >
                <div
                  className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-slate-700
                    flex items-center justify-center
                    group-hover:bg-hc-purple-dim transition-colors duration-200"
                >
                  <Icon size={28} className={meta.color} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm mb-1">
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    {meta.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
