import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../types';
import { getPrimaryViewForModule } from '../utils/moduleVisibility';

/**
 * Determina o ViewState inicial após autenticação.
 * Retorna null enquanto o estado de auth ainda está carregando (R3 fix).
 *
 * Lógica:
 * - Admin → DASHBOARD
 * - Cliente com 1 módulo → view primária do módulo
 * - Cliente com 2+ módulos → MODULE_HUB (launcher)
 * - Cliente sem módulos → SETTINGS
 */
export function useInitialRoute(): ViewState | null {
  const { user, loading } = useAuth();

  // Aguarda carregamento antes de decidir (evita race condition R3)
  if (loading) return null;

  if (!user) return null;

  if (user.isAdmin === true) return ViewState.DASHBOARD;

  const modules = user.availableModules ?? [];

  if (modules.length === 0) return ViewState.SETTINGS;

  if (modules.length === 1) {
    return getPrimaryViewForModule(modules[0]);
  }

  return ViewState.MODULE_HUB;
}

/**
 * Retorna a lista de módulos habilitados com metadados para exibição.
 * Usada pelo ModuleHub para construir os cards de navegação.
 */
export function useEnabledModules(): Array<{
  moduleId: string;
  primaryView: ViewState;
  label: string;
}> {
  const { user } = useAuth();

  if (!user?.availableModules) return [];

  const MODULE_LABELS: Record<string, string> = {
    buscador_notas: 'Consultar Notas',
    emissor_notas: 'Emissão de NF',
    tarefas: 'Tarefas',
    whatsapp: 'WhatsApp',
    clientes: 'Clientes',
    certificados: 'Certificados',
    configuracoes: 'Configurações',
    dashboard: 'Dashboard',
  };

  return user.availableModules
    .filter((mod) => mod !== 'configuracoes') // Configurações não aparece no hub
    .map((moduleId) => ({
      moduleId,
      primaryView: getPrimaryViewForModule(moduleId),
      label: MODULE_LABELS[moduleId] ?? moduleId,
    }));
}
