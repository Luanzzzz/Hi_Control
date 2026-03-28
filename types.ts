// View States - Navegação principal e submódulos
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  INVOICE_EMITTER = 'INVOICE_EMITTER',
  INVOICE_SEARCH = 'INVOICE_SEARCH',
  PDV = 'PDV', // NFC-e - Cupom Fiscal Eletrônico
  CTE = 'CTE', // CT-e - Conhecimento de Transporte
  NFSE = 'NFSE', // NFS-e - Nota Fiscal de Serviço
  TASKS = 'TASKS',
  WHATSAPP = 'WHATSAPP',
  USERS = 'USERS',
  CERTIFICATES = 'CERTIFICATES',
  SETTINGS = 'SETTINGS',
  CLIENT_DETAIL = 'CLIENT_DETAIL', // Dashboard Específico do Cliente
  COMING_SOON = 'COMING_SOON'
}

export interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  avatar: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'contact';
  text: string;
  timestamp: string;
}

// Authentication Types
export enum UserPlan {
  BASICO = 'basico',
  PREMIUM = 'premium'
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  plano: UserPlan;
  created_at: string;
  availableModules?: string[]; // Módulos disponíveis para o plano do usuário
  isAdmin?: boolean; // Sinalizador de administrador
  role?: string; // Role/papel do usuário
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export type ModulePriority = 1 | 2;

// Estrutura de Submódulo
export interface SubModule {
  id: ViewState;
  label: string;
  priority: ModulePriority;
  isPriority?: boolean; // Destaque visual para módulos prioritários
}

// Estrutura de Módulo Principal
export interface MenuItem {
  id: ViewState;
  label: string;
  icon: any; // LucideIcon type
  priority: ModulePriority;
  color?: string; // classe Tailwind para o ícone (ex: text-slate-500)
  isNew?: boolean;
  subModules?: SubModule[];
}

// Configuração de acesso aos módulos
export interface ModuleAccess {
  [ViewState.DASHBOARD]: ModulePriority;
  [ViewState.INVOICES]: ModulePriority;
  [ViewState.INVOICE_EMITTER]: ModulePriority;
  [ViewState.INVOICE_SEARCH]: ModulePriority;
  [ViewState.PDV]: ModulePriority;
  [ViewState.CTE]: ModulePriority;
  [ViewState.NFSE]: ModulePriority;
  [ViewState.TASKS]: ModulePriority;
  [ViewState.WHATSAPP]: ModulePriority;
  [ViewState.USERS]: ModulePriority;
  [ViewState.CERTIFICATES]: ModulePriority;
  [ViewState.SETTINGS]: ModulePriority;
  [ViewState.CLIENT_DETAIL]: ModulePriority;
  [ViewState.COMING_SOON]: ModulePriority;
}