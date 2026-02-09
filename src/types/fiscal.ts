/**
 * Tipos TypeScript para o Módulo Fiscal
 * Baseado nos contratos do back-end para NFC-e, CT-e, NFS-e e endpoints de suporte
 */

// ============================================
// TIPOS COMUNS
// ============================================

export type TipoAmbiente = "1" | "2"; // 1=Produção, 2=Homologação

export type TipoPagamento = 
  | "01" // Dinheiro
  | "02" // Cheque
  | "03" // Cartão de Crédito
  | "04" // Cartão de Débito
  | "05" // Crédito Loja
  | "10" // Vale Alimentação
  | "11" // Vale Refeição
  | "12" // Vale Presente
  | "13" // Vale Combustível
  | "15" // Boleto Bancário
  | "90" // Sem Pagamento
  | "99"; // Outros

export type ModalidadeFreteCTe = 
  | "0" // Contratação do Frete por conta do Remetente (CIF)
  | "1" // Contratação do Frete por conta do Destinatário (FOB)
  | "2" // Contratação do Frete por conta de Terceiros
  | "3" // Transporte Próprio por conta do Remetente
  | "4"; // Transporte Próprio por conta do Destinatário

export type IndicadorIE = 
  | "1" // Contribuinte ICMS
  | "2" // Contribuinte isento de Inscrição no cadastro de Contribuintes
  | "9"; // Não Contribuinte

// ============================================
// NFC-e (MODELO 65)
// ============================================

export interface NFCeAutorizarRequest {
  empresa_id: string;
  ambiente: TipoAmbiente;
  destinatario?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
    endereco?: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
    };
  };
  itens: ItemNFCe[];
  pagamentos: PagamentoNFCe[];
  informacoes_adicionais?: string;
}

export interface ItemNFCe {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string; // 8 dígitos
  cfop: string; // 4 dígitos
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto?: number;
  impostos?: {
    icms?: {
      cst: string;
      origem: string;
      aliquota?: number;
      valor?: number;
    };
  };
}

export interface PagamentoNFCe {
  tipo: TipoPagamento;
  valor: number;
  troco?: number;
  informacoes_complementares?: string;
}

export interface NFCeAutorizarResponse {
  id: string;
  chave_acesso: string;
  numero_nf: string;
  serie: string;
  modelo: "65";
  situacao: "autorizada" | "rejeitada" | "denegada";
  protocolo?: string;
  data_autorizacao: string;
  valor_total: number;
  qr_code?: string; // Base64 ou URL
  url_consulta?: string;
  xml_url?: string;
  sefaz_response: SefazResponse;
}

// ============================================
// CT-e (MODELO 57)
// ============================================

export interface CTeAutorizarRequest {
  empresa_id: string;
  ambiente: TipoAmbiente;
  modelo: "57";
  tipo_servico: "0" | "1" | "2" | "3"; // 0=Normal, 1=Subcontratação, 2=Redespacho, 3=Redesp.Intermediário
  tipo_cte: "0" | "1" | "2" | "3"; // 0=Normal, 1=Complementar, 2=Anulação, 3=Substituto
  modalidade_frete: ModalidadeFreteCTe;
  remetente: ParticipanteCTe;
  destinatario: ParticipanteCTe;
  expedidor?: ParticipanteCTe;
  recebedor?: ParticipanteCTe;
  carga: CargaCTe;
  documentos_vinculados?: DocumentoVinculado[];
  informacoes_complementares?: string;
}

export interface ParticipanteCTe {
  cnpj?: string;
  cpf?: string;
  razao_social: string;
  inscricao_estadual?: string;
  indicador_ie?: IndicadorIE;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigo_municipio: string; // Código IBGE
    municipio: string;
    uf: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
}

export interface CargaCTe {
  valor: number;
  peso_bruto: number;
  peso_cubado?: number;
  quantidade_volumes?: number;
  produto_predominante: string;
  unidade_medida?: "00" | "01" | "02"; // 00=M3, 01=KG, 02=TON
}

export interface DocumentoVinculado {
  tipo: "NFe" | "NFCe" | "Outros";
  chave_acesso?: string; // Para NF-e/NFC-e
  numero?: string;
  serie?: string;
  data_emissao?: string;
  valor?: number;
}

export interface CTeAutorizarResponse {
  id: string;
  chave_acesso: string;
  numero_cte: string;
  serie: string;
  modelo: "57";
  situacao: "autorizada" | "rejeitada" | "denegada";
  protocolo?: string;
  data_autorizacao: string;
  valor_total: number;
  xml_url?: string;
  pdf_url?: string;
  sefaz_response: SefazResponse;
}

// ============================================
// NFS-e (NOTA FISCAL DE SERVIÇO)
// ============================================

export interface NFSeEmitirRequest {
  empresa_id: string;
  numero_rps?: string; // Recibo Provisório de Serviço
  serie_rps?: string;
  tomador: TomadorNFSe;
  servico: ServicoNFSe;
  discriminacao: string;
  observacoes?: string;
}

export interface TomadorNFSe {
  cnpj?: string;
  cpf?: string;
  razao_social: string;
  inscricao_municipal?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigo_municipio: string; // Código IBGE
    municipio: string;
    uf: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
}

export interface ServicoNFSe {
  item_lista_lc116: string; // Ex: "01.01", "07.02" - Item da Lista LC 116/2003
  codigo_tributacao_municipio?: string;
  codigo_cnae?: string;
  aliquota_iss: number; // Em percentual (ex: 5.0 para 5%)
  valor_servicos: number;
  valor_deducoes?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_inss?: number;
  valor_ir?: number;
  valor_csll?: number;
  iss_retido?: boolean;
}

export interface NFSeEmitirResponse {
  id: string;
  numero_nfse: string;
  codigo_verificacao: string;
  data_emissao: string;
  situacao: "autorizada" | "cancelada" | "rejeitada";
  valor_total: number;
  valor_iss: number;
  xml_url?: string;
  pdf_url?: string;
  link_visualizacao?: string;
}

export interface NFSeCancelarRequest {
  id: string;
  motivo: string;
}

export interface NFSeCancelarResponse {
  mensagem: string;
  data_cancelamento: string;
  situacao: "cancelada";
}

// ============================================
// SUPORTE E FERRAMENTAS
// ============================================

export interface CFOPItem {
  codigo: string; // Ex: "5102"
  descricao: string;
  aplicacao: "entrada" | "saida"; // Entrada ou Saída
  observacoes?: string;
}

export interface NCMItem {
  codigo: string; // 8 dígitos
  descricao: string;
  unidade?: string;
  aliquota_nacional?: number; // Alíquota de IPI padrão
}

export interface NumeracaoResponse {
  numero: number;
  serie: string;
  modelo: string;
}

export interface ValidacaoRequest {
  tipo_documento: "nfce" | "cte" | "nfse";
  dados: NFCeAutorizarRequest | CTeAutorizarRequest | NFSeEmitirRequest;
}

export interface ValidacaoResponse {
  valido: boolean;
  erros: ErroValidacao[];
  avisos?: AvisoValidacao[];
}

export interface ErroValidacao {
  campo: string;
  mensagem: string;
  codigo?: string;
  correcao?: string; // Sugestão de correção
}

export interface AvisoValidacao {
  campo?: string;
  mensagem: string;
  tipo: "atencao" | "info";
}

// ============================================
// RESPOSTAS DA SEFAZ
// ============================================

export interface SefazResponse {
  status_codigo: string; // Ex: "100" (autorizado), "302" (denegado)
  status_descricao: string;
  protocolo?: string;
  chave_acesso?: string;
  data_recebimento?: string;
  autorizado: boolean;
  rejeitado: boolean;
  denegado: boolean;
  rejeicoes: SefazRejeicao[];
  xml_retorno?: string;
}

export interface SefazRejeicao {
  codigo: string; // Ex: "539"
  motivo: string;
  correcao?: string;
  campo?: string;
}

// ============================================
// CSC (CÓDIGO DE SEGURANÇA DO CONTRIBUINTE)
// ============================================

export interface CSCConfig {
  id: number; // ID do CSC (1-999999)
  token: string; // Token alfanumérico fornecido pela SEFAZ
  ativo: boolean;
}

export interface CSCUpdateRequest {
  id: number;
  token: string;
}

export interface CSCUpdateResponse {
  mensagem: string;
  id: number;
  ativo: boolean;
}

// ============================================
// CONTINGÊNCIA
// ============================================

export interface StatusContingenciaResponse {
  em_contingencia: boolean;
  tipo_contingencia?: "EPEC" | "FS-DA" | "SVCAN" | "SVCRS";
  motivo?: string;
  data_inicio?: string;
  previsao_retorno?: string;
}

// ============================================
// PRODUTOS (PARA INTEGRAÇÃO COM CADASTRO)
// ============================================

export interface ProdutoCadastrado {
  id: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop_padrao?: string;
  unidade: string;
  valor_unitario: number;
  ean?: string;
  ativo: boolean;
}

export interface ProdutoBuscarRequest {
  termo?: string;
  ativo?: boolean;
  limit?: number;
}
