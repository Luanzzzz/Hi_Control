export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  TASKS = 'TASKS',
  WHATSAPP = 'WHATSAPP',
  USERS = 'USERS',
  COMING_SOON = 'COMING_SOON'
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: 'Pendente' | 'Emitida' | 'Cancelada';
  type: 'NF-e' | 'NFS-e' | 'NFC-e' | 'CT-e';
  date: string;
  state: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'A Fazer' | 'Em Progresso' | 'Concluída';
  dueDate: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'contact' | 'system';
  text: string;
  timestamp: string;
}

export interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  avatar: string;
  unread: number;
}