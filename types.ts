export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  TASKS = 'TASKS',
  WHATSAPP = 'WHATSAPP',
  USERS = 'USERS',
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
  plano: UserPlan;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export type ModulePriority = 1 | 2;

export interface ModuleAccess {
  [ViewState.DASHBOARD]: ModulePriority;
  [ViewState.INVOICES]: ModulePriority;
  [ViewState.TASKS]: ModulePriority;
  [ViewState.WHATSAPP]: ModulePriority;
  [ViewState.USERS]: ModulePriority;
  [ViewState.COMING_SOON]: ModulePriority;
}