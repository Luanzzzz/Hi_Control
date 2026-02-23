// View States - Navegação principal e submódulos
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  INVOICE_EMITTER = 'INVOICE_EMITTER',
  CLIENT_DASHBOARD = 'CLIENT_DASHBOARD',
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
  [ViewState.CLIENT_DASHBOARD]: ModulePriority;
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

// ============================================================
// TIPOS DO BOT DE CAPTURA SEFAZ + DASHBOARD
// ============================================================

export interface SyncStatus {
  empresa_id: string;
  status: 'pendente' | 'sincronizando' | 'ok' | 'erro' | 'sem_certificado';
  ultima_sync: string | null;
  proximo_sync: string | null;
  total_notas_capturadas: number;
  notas_capturadas_ultima_sync: number;
  erro_mensagem: string | null;
  ultimo_nsu?: number;
}

export interface NotaFiscalDashboard {
  id: string;
  chave_acesso: string;
  numero_nf: string;
  serie: string;
  tipo_nf: 'NFe' | 'NFSe' | 'NFCe' | 'CTe';
  tipo_operacao: 'entrada' | 'saida';
  data_emissao: string;
  valor_total: number;
  cnpj_emitente: string;
  nome_emitente: string;
  cnpj_destinatario: string;
  nome_destinatario: string;
  situacao: 'autorizada' | 'cancelada' | 'denegada' | 'processando';
  municipio_nome?: string;
  fonte_captura: 'sefaz_nacional' | 'manual' | 'importacao';
}

export interface ResumoFinanceiro {
  prestados_valor: number;
  prestados_quantidade: number;
  tomados_valor: number;
  tomados_quantidade: number;
  iss_retido: number;
  federais_retidos: number;
  total_retido: number;
  fora_competencia: number;
  diferenca: number;
  variacao_mes_anterior_percent: number | null;
}

export interface PontoHistorico {
  periodo: string;
  prestados: number;
  tomados: number;
  prestados_quantidade?: number;
  tomados_quantidade?: number;
}

export interface DashboardEmpresa {
  empresa: {
    id: string;
    razao_social: string;
    cnpj: string;
    ativa: boolean;
  };
  sync: SyncStatus;
  resumo: ResumoFinanceiro;
  historico: PontoHistorico[];
  notas: NotaFiscalDashboard[];
  total_notas: number;
  periodo_referencia_mes?: number;
  periodo_referencia_ano?: number;
}

export interface FiltrosNotas {
  tipo?: string;
  status?: string;
  retencao?: string;
  busca?: string;
  pagina?: number;
  dataInicio?: string;
  dataFim?: string;
}
