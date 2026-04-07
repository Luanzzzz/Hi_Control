import { ViewState, MODULE_VIEWS, MenuItem, User } from '../types';

// Views restritas a admin (clientes nunca acessam, independente de plano)
export const ADMIN_ONLY_VIEWS: ViewState[] = [
  ViewState.DASHBOARD,
  ViewState.USERS,
  ViewState.CERTIFICATES,
  ViewState.CLIENT_DETAIL,
  ViewState.SEARCH_DASHBOARD,   // Visão operacional de busca — exclusiva do contador
  ViewState.EMISSION_DASHBOARD, // Visão operacional de emissão — exclusiva do contador
];

// Views sempre acessíveis (independente de papel ou plano)
export const ALWAYS_ACCESSIBLE_VIEWS: ViewState[] = [
  ViewState.SETTINGS,
  ViewState.COMING_SOON,
];

// View primária de cada módulo (entrada direta quando cliente tem 1 módulo)
export const MODULE_PRIMARY_VIEW: Record<string, ViewState> = {
  dashboard: ViewState.DASHBOARD,
  buscador_notas: ViewState.INVOICE_SEARCH,
  emissor_notas: ViewState.INVOICE_EMITTER,
  tarefas: ViewState.TASKS,
  whatsapp: ViewState.WHATSAPP,
  clientes: ViewState.USERS,
  certificados: ViewState.CERTIFICATES,
  configuracoes: ViewState.SETTINGS,
};

/**
 * Verifica se um usuário tem acesso a um ViewState específico.
 * Fonte única de verdade — substitui hasModuleAccess() em App.tsx e Sidebar.tsx.
 *
 * CORREÇÃO R2: availableModules vazio NÃO libera acesso total para clientes.
 */
export function hasModuleAccess(view: ViewState, user: User | null): boolean {
  if (!user) return false;

  // Admin tem acesso total
  if (user.isAdmin === true) return true;

  // Views sempre acessíveis
  if (ALWAYS_ACCESSIBLE_VIEWS.includes(view)) return true;

  // Views admin-only: bloquear clientes
  if (ADMIN_ONLY_VIEWS.includes(view)) return false;

  // MODULE_HUB: acessível apenas se cliente tem 2+ módulos
  if (view === ViewState.MODULE_HUB) {
    return (user.availableModules?.length ?? 0) >= 2;
  }

  const modules = user.availableModules ?? [];

  // R2 FIX: cliente sem módulos não tem acesso a nada além do ALWAYS_ACCESSIBLE
  if (modules.length === 0) return false;

  return Object.entries(MODULE_VIEWS).some(
    ([mod, views]) => modules.includes(mod) && views.includes(view)
  );
}

/**
 * Filtra MenuItems visíveis para o usuário.
 * Admin vê tudo; cliente vê apenas módulos habilitados + ALWAYS_ACCESSIBLE.
 */
export function filterMenuItemsByUser(items: MenuItem[], user: User | null): MenuItem[] {
  if (!user) return [];
  if (user.isAdmin === true) return items;

  return items.filter((item) => hasModuleAccess(item.id, user));
}

/**
 * Retorna a ViewState primária de um módulo (usada pelo roteamento inicial).
 */
export function getPrimaryViewForModule(moduleName: string): ViewState {
  return MODULE_PRIMARY_VIEW[moduleName] ?? ViewState.SETTINGS;
}
