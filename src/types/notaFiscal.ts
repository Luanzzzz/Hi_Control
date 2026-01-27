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

// ============================================
// TIPOS COMPLETOS PARA EMISSÃO DE NF-E
// ============================================

export type TipoAmbiente = "1" | "2"; // 1=Produção, 2=Homologação
export type ModeloNFe = "55" | "65"; // 55=NF-e, 65=NFC-e
export type ModalidadeFrete = 0 | 1 | 2 | 9; // 0=CIF, 1=FOB, 2=Terceiros, 9=Sem frete

/**
 * Impostos do item (ICMS)
 */
export interface ICMSItem {
  cst: string;
  origem: string;
  base_calculo: number;
  aliquota: number;
  valor: number;
  base_calculo_st?: number;
  aliquota_st?: number;
  valor_st?: number;
}

/**
 * Impostos do item (IPI)
 */
export interface IPIItem {
  cst: string;
  base_calculo: number;
  aliquota: number;
  valor: number;
}

/**
 * Impostos do item (PIS)
 */
export interface PISItem {
  cst: string;
  base_calculo: number;
  aliquota: number;
  valor: number;
}

/**
 * Impostos do item (COFINS)
 */
export interface COFINSItem {
  cst: string;
  base_calculo: number;
  aliquota: number;
  valor: number;
}

/**
 * Conjunto de impostos do item
 */
export interface ImpostosItem {
  icms: ICMSItem;
  ipi?: IPIItem;
  pis: PISItem;
  cofins: COFINSItem;
}

/**
 * Item de NF-e (produto ou serviço)
 */
export interface ItemNFe {
  numero_item: number;
  codigo_produto: string;
  ean?: string;
  descricao: string;
  ncm: string; // 8 dígitos
  cest?: string;
  cfop: string; // 4 dígitos
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_total_bruto: number;
  valor_desconto?: number;
  ean_tributavel?: string;
  unidade_tributavel?: string;
  quantidade_tributavel?: number;
  valor_unitario_tributavel?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
  impostos: ImpostosItem;
}

/**
 * Transportadora
 */
export interface TransportadoraNFe {
  cnpj_cpf?: string;
  razao_social?: string;
  inscricao_estadual?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
}

/**
 * Veículo de transporte
 */
export interface VeiculoTransporte {
  placa?: string;
  uf?: string;
  rntc?: string; // Registro Nacional de Transportador de Carga
}

/**
 * Volumes transportados
 */
export interface VolumesTransporte {
  quantidade?: number;
  especie?: string;
  marca?: string;
  numeracao?: string;
  peso_bruto?: number;
  peso_liquido?: number;
}

/**
 * Informações de transporte
 */
export interface TransporteNFe {
  modalidade_frete: ModalidadeFrete;
  transportadora?: TransportadoraNFe;
  veiculo?: VeiculoTransporte;
  volumes?: VolumesTransporte;
}

/**
 * Duplicata (parcela de pagamento)
 */
export interface DuplicataNFe {
  numero_duplicata: string;
  data_vencimento: string; // ISO date
  valor: number;
}

/**
 * Cobrança
 */
export interface CobrancaNFe {
  duplicatas?: DuplicataNFe[];
}

/**
 * Destinatário da NF-e
 */
export interface DestinatarioNFe {
  cnpj?: string;
  cpf?: string;
  razao_social: string;
  inscricao_estadual?: string;
  indicador_inscricao_estadual: "1" | "2" | "9"; // 1=Contribuinte, 2=Isento, 9=Não contribuinte
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento?: string;
  endereco_bairro: string;
  codigo_municipio: string; // Código IBGE
  municipio: string;
  uf: string;
  cep: string;
  codigo_pais?: string;
  pais?: string;
  telefone?: string;
  email?: string;
}

/**
 * Rejeição da SEFAZ
 */
export interface SefazRejeicao {
  codigo: string;
  motivo: string;
  correcao?: string;
  campo?: string;
}

/**
 * Resposta da SEFAZ
 */
export interface SefazResponse {
  status_codigo: string;
  status_descricao: string;
  protocolo?: string;
  chave_acesso?: string;
  autorizado: boolean;
  rejeitado: boolean;
  rejeicoes: SefazRejeicao[];
}

/**
 * Dados completos para criação de NF-e
 */
export interface NotaFiscalCompletaCreate {
  empresa_id: string;
  numero_nf: string;
  serie: string;
  modelo: ModeloNFe;
  ambiente: TipoAmbiente;
  destinatario: DestinatarioNFe;
  itens: ItemNFe[];
  transporte?: TransporteNFe;
  cobranca?: CobrancaNFe;
  informacoes_complementares?: string;
  informacoes_fisco?: string;
}

/**
 * Resposta completa da autorização de NF-e
 */
export interface NotaFiscalCompletaResponse {
  id: string;
  chave_acesso: string;
  numero_nf: string;
  serie: string;
  modelo: ModeloNFe;
  situacao: SituacaoNota;
  protocolo?: string;
  data_autorizacao: string;
  valor_total: number;
  itens: ItemNFe[];
  transporte?: TransporteNFe;
  cobranca?: CobrancaNFe;
  destinatario: DestinatarioNFe;
  sefaz_response: SefazResponse;
}

/**
 * Request para upload de certificado digital
 */
export interface CertificadoUploadRequest {
  certificado_base64: string;
  senha: string;
}

/**
 * Response do upload de certificado
 */
export interface CertificadoUploadResponse {
  mensagem: string;
  validade: string; // ISO date
  dias_restantes: number;
  titular: string;
  emissor: string;
  requer_atencao: boolean;
}

/**
 * Status do certificado digital
 */
export type StatusCertificado = "valido" | "expirando_em_breve" | "expirado" | "ausente";

/**
 * Response do status do certificado
 */
export interface CertificadoStatusResponse {
  validade: string | null;
  dias_restantes: number | null;
  status: StatusCertificado;
  requer_atencao: boolean;
  alerta: string;
  titular?: string | null;
  emissor?: string | null;
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
