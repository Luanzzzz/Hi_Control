/**
 * Tipos e interfaces para Notas Fiscais
 */

export type TipoNotaFiscal = "NFe" | "NFSe" | "NFCe" | "CTe";
export type SituacaoNota = "autorizada" | "cancelada" | "denegada" | "processando";

export interface NotaFiscal {
  id: string;
  empresa_id: string;
  numero_nf: string;
  serie: string;
  tipo_nf: TipoNotaFiscal;
  modelo?: string;
  chave_acesso?: string;
  data_emissao: string;
  data_autorizacao?: string;
  valor_total: number;
  valor_produtos?: number;
  valor_servicos?: number;
  cnpj_emitente: string;
  nome_emitente?: string;
  cnpj_destinatario?: string;
  nome_destinatario?: string;
  situacao: SituacaoNota;
  protocolo?: string;
  xml_url?: string;
  pdf_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface NotaFiscalDetalhada extends NotaFiscal {
  valor_icms?: number;
  valor_ipi?: number;
  valor_pis?: number;
  valor_cofins?: number;
  motivo_cancelamento?: string;
  tags?: string[];
}

export interface FiltrosBusca {
  tipo_nf?: TipoNotaFiscal | "TODAS";
  cnpj_emitente?: string;
  data_inicio: string; // ISO date string
  data_fim: string;    // ISO date string
  numero_nf?: string;
  serie?: string;
  situacao?: SituacaoNota | "todas";
  chave_acesso?: string;
}

export interface FiltrosBuscaGeral {
  search_term?: string;
  tipo_nf?: TipoNotaFiscal | "TODAS";
  situacao?: SituacaoNota | "todas";
  data_inicio?: string;
  data_fim?: string;
  cnpj_emitente?: string;
  skip?: number;
  limit?: number;
}

export interface EstatisticasNotas {
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  resumo: {
    total_notas: number;
    valor_total: number;
    valor_medio: number;
  };
  por_tipo: Record<TipoNotaFiscal, number>;
  por_situacao: Record<SituacaoNota, number>;
}

export interface FormularioFiltros {
  tipoNf: TipoNotaFiscal | "TODAS";
  cnpjEmitente: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  numeroNf: string;
  serie: string;
  situacao: SituacaoNota | "todas";
}

export const OPCOES_TIPO_NF = [
  { value: "TODAS", label: "Todos os Tipos" },
  { value: "NFe", label: "NF-e (Nota Fiscal Eletrônica)" },
  { value: "NFCe", label: "NFC-e (Nota Fiscal ao Consumidor)" },
  { value: "NFSe", label: "NFS-e (Nota Fiscal de Serviço)" },
  { value: "CTe", label: "CT-e (Conhecimento de Transporte)" }
] as const;

export const OPCOES_SITUACAO = [
  { value: "todas", label: "Todas as Situações" },
  { value: "autorizada", label: "Autorizada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "denegada", label: "Denegada" },
  { value: "processando", label: "Processando" }
] as const;

export const CORES_TIPO_NF: Record<TipoNotaFiscal, string> = {
  NFe: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  NFCe: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  NFSe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  CTe: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
};

export const CORES_SITUACAO: Record<SituacaoNota, string> = {
  autorizada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  denegada: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  processando: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
};
