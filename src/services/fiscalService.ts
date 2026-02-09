/**
 * Serviço de API para o Módulo Fiscal
 * Gerencia integração com endpoints de NFC-e, CT-e, NFS-e e ferramentas de suporte
 */

import api from './api';
import axios from 'axios';
import type {
  // NFC-e
  NFCeAutorizarRequest,
  NFCeAutorizarResponse,
  CSCUpdateRequest,
  CSCUpdateResponse,
  // CT-e
  CTeAutorizarRequest,
  CTeAutorizarResponse,
  // NFS-e
  NFSeEmitirRequest,
  NFSeEmitirResponse,
  NFSeCancelarRequest,
  NFSeCancelarResponse,
  // Suporte
  CFOPItem,
  NCMItem,
  NumeracaoResponse,
  ValidacaoRequest,
  ValidacaoResponse,
  StatusContingenciaResponse,
  ProdutoCadastrado,
  ProdutoBuscarRequest,
} from '../types/fiscal';

// ============================================
// NFC-e (MODELO 65) - CUPOM FISCAL ELETRÔNICO
// ============================================

/**
 * Autoriza uma NFC-e (Cupom Fiscal) junto à SEFAZ
 * @param dados Dados da NFC-e a ser autorizada
 * @returns Dados da nota autorizada com chave de acesso e QR Code
 */
export const autorizarNFCe = async (
  dados: NFCeAutorizarRequest
): Promise<NFCeAutorizarResponse> => {
  try {
    const response = await api.post<NFCeAutorizarResponse>('/nfce/autorizar', dados);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const sefazErro = error.response?.data;
      // Extrai mensagem específica da SEFAZ se disponível
      const mensagem = 
        sefazErro?.motivo || 
        sefazErro?.rejeicoes?.[0]?.motivo ||
        sefazErro?.detail || 
        'Erro ao autorizar NFC-e na SEFAZ';
      
      // Adiciona sugestão de correção se disponível
      const correcao = sefazErro?.rejeicoes?.[0]?.correcao;
      const mensagemCompleta = correcao 
        ? `${mensagem}\n\nSugestão: ${correcao}`
        : mensagem;
      
      throw new Error(mensagemCompleta);
    }
    throw error;
  }
};

/**
 * Faz download do DANFCE (Documento Auxiliar da NFC-e) em PDF
 * @param chaveAcesso Chave de acesso de 44 dígitos
 * @returns Blob do PDF
 */
export const downloadDANFCE = async (chaveAcesso: string): Promise<Blob> => {
  try {
    const response = await api.get(`/nfce/${chaveAcesso}/danfce`, {
      responseType: 'blob',
      timeout: 60000, // 60 segundos para geração do PDF
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error('Erro ao baixar DANFCE. Verifique se a nota foi autorizada.');
    }
    throw error;
  }
};

/**
 * Atualiza o CSC (Código de Segurança do Contribuinte) para geração do QR Code
 * @param dados ID e token do CSC
 * @returns Mensagem de confirmação
 */
export const atualizarCSC = async (
  dados: CSCUpdateRequest
): Promise<CSCUpdateResponse> => {
  try {
    const response = await api.put<CSCUpdateResponse>(
      `/nfce/csc/${dados.id}`, 
      { token: dados.token }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao atualizar CSC';
      throw new Error(mensagem);
    }
    throw error;
  }
};

// ============================================
// CT-e (MODELO 57) - CONHECIMENTO DE TRANSPORTE
// ============================================

/**
 * Autoriza um CT-e (Conhecimento de Transporte Eletrônico) junto à SEFAZ
 * @param dados Dados do CT-e a ser autorizado
 * @returns Dados do CT-e autorizado
 */
export const autorizarCTe = async (
  dados: CTeAutorizarRequest
): Promise<CTeAutorizarResponse> => {
  try {
    const response = await api.post<CTeAutorizarResponse>('/cte/autorizar', dados);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const sefazErro = error.response?.data;
      const mensagem = 
        sefazErro?.motivo || 
        sefazErro?.rejeicoes?.[0]?.motivo ||
        sefazErro?.detail || 
        'Erro ao autorizar CT-e na SEFAZ';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Lista detalhes de um CT-e específico
 * @param id ID do CT-e no banco de dados
 * @returns Dados completos do CT-e
 */
export const listarCTe = async (id: string): Promise<CTeAutorizarResponse> => {
  try {
    const response = await api.get<CTeAutorizarResponse>(`/cte/listar/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'CT-e não encontrado';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Faz download do DACTE (Documento Auxiliar do CT-e) em PDF
 * @param chaveAcesso Chave de acesso de 44 dígitos
 * @returns Blob do PDF
 */
export const downloadDACTE = async (chaveAcesso: string): Promise<Blob> => {
  try {
    const response = await api.get(`/cte/${chaveAcesso}/dacte`, {
      responseType: 'blob',
      timeout: 60000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error('Erro ao baixar DACTE. Verifique se o CT-e foi autorizado.');
    }
    throw error;
  }
};

// ============================================
// NFS-e - NOTA FISCAL DE SERVIÇO ELETRÔNICA
// ============================================

/**
 * Emite uma NFS-e (Nota Fiscal de Serviço Eletrônica)
 * @param dados Dados da NFS-e a ser emitida
 * @returns Dados da nota emitida
 */
export const emitirNFSe = async (
  dados: NFSeEmitirRequest
): Promise<NFSeEmitirResponse> => {
  try {
    const response = await api.post<NFSeEmitirResponse>('/nfse/emissao/emitir', dados);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao emitir NFS-e';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Cancela uma NFS-e já emitida
 * @param dados ID da nota e motivo do cancelamento
 * @returns Confirmação do cancelamento
 */
export const cancelarNFSe = async (
  dados: NFSeCancelarRequest
): Promise<NFSeCancelarResponse> => {
  try {
    const response = await api.post<NFSeCancelarResponse>(
      '/nfse/emissao/cancelar',
      dados
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao cancelar NFS-e';
      throw new Error(mensagem);
    }
    throw error;
  }
};

// ============================================
// SUPORTE - FERRAMENTAS AUXILIARES
// ============================================

/**
 * Obtém a próxima numeração disponível para emissão de documento fiscal
 * @param empresaId ID da empresa emissora
 * @returns Número e série a serem usados
 */
export const obterNumeracao = async (empresaId: string): Promise<NumeracaoResponse> => {
  try {
    const response = await api.get<NumeracaoResponse>(
      `/emissao/suporte/numeracao/${empresaId}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao obter numeração';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Busca códigos CFOP por termo (código ou descrição)
 * @param termo Termo de busca (opcional - retorna todos se não informado)
 * @returns Lista de CFOPs encontrados
 */
export const buscarCFOP = async (termo?: string): Promise<CFOPItem[]> => {
  try {
    const response = await api.get<CFOPItem[]>('/emissao/suporte/cfop', {
      params: termo ? { termo } : undefined,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao buscar CFOP';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Busca códigos NCM por termo (código ou descrição)
 * @param termo Termo de busca (opcional - retorna todos se não informado)
 * @returns Lista de NCMs encontrados
 */
export const buscarNCM = async (termo?: string): Promise<NCMItem[]> => {
  try {
    const response = await api.get<NCMItem[]>('/emissao/suporte/ncm', {
      params: termo ? { termo } : undefined,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao buscar NCM';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Valida um documento fiscal antes da autorização
 * @param dados Tipo do documento e seus dados
 * @returns Resultado da validação com lista de erros (se houver)
 */
export const validarDocumento = async (
  dados: ValidacaoRequest
): Promise<ValidacaoResponse> => {
  try {
    const response = await api.post<ValidacaoResponse>(
      '/emissao/suporte/validar',
      dados
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao validar documento';
      throw new Error(mensagem);
    }
    throw error;
  }
};

/**
 * Verifica se o sistema SEFAZ está em contingência
 * @returns Status da contingência
 */
export const verificarContingencia = async (): Promise<StatusContingenciaResponse> => {
  try {
    const response = await api.get<StatusContingenciaResponse>(
      '/emissao/suporte/contingencia'
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Se não conseguir verificar, assume que não está em contingência
      return { em_contingencia: false };
    }
    throw error;
  }
};

// ============================================
// PRODUTOS (INTEGRAÇÃO COM CADASTRO)
// ============================================

/**
 * Busca produtos cadastrados para adicionar itens em documentos fiscais
 * @param filtros Filtros de busca (termo, ativo, limite)
 * @returns Lista de produtos encontrados
 */
export const buscarProdutos = async (
  filtros: ProdutoBuscarRequest
): Promise<ProdutoCadastrado[]> => {
  try {
    const response = await api.get<ProdutoCadastrado[]>('/produtos/buscar', {
      params: {
        termo: filtros.termo,
        ativo: filtros.ativo !== undefined ? filtros.ativo : true,
        limit: filtros.limit || 50,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const mensagem = error.response?.data?.detail || 'Erro ao buscar produtos';
      throw new Error(mensagem);
    }
    throw error;
  }
};

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Faz download de um Blob (PDF) e salva no computador do usuário
 * @param blob Blob do arquivo
 * @param nomeArquivo Nome do arquivo a ser salvo
 */
export const downloadPDF = (blob: Blob, nomeArquivo: string): void => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao fazer download do PDF:', error);
    throw new Error('Erro ao fazer download do arquivo');
  }
};

/**
 * Valida se uma chave de acesso possui 44 dígitos
 * @param chaveAcesso Chave a ser validada
 * @returns true se válida, false caso contrário
 */
export const validarChaveAcesso = (chaveAcesso: string): boolean => {
  return /^\d{44}$/.test(chaveAcesso);
};

/**
 * Formata chave de acesso para exibição (XXXX XXXX XXXX ...)
 * @param chaveAcesso Chave de 44 dígitos
 * @returns Chave formatada
 */
export const formatarChaveAcesso = (chaveAcesso: string): string => {
  if (!validarChaveAcesso(chaveAcesso)) {
    return chaveAcesso;
  }
  return chaveAcesso.match(/.{1,4}/g)?.join(' ') || chaveAcesso;
};

/**
 * Valida se um código NCM possui 8 dígitos
 * @param ncm NCM a ser validado
 * @returns true se válido, false caso contrário
 */
export const validarNCM = (ncm: string): boolean => {
  return /^\d{8}$/.test(ncm);
};

/**
 * Valida se um código CFOP possui 4 dígitos
 * @param cfop CFOP a ser validado
 * @returns true se válido, false caso contrário
 */
export const validarCFOP = (cfop: string): boolean => {
  return /^\d{4}$/.test(cfop);
};

/**
 * Calcula o valor total de um item (quantidade * valor unitário - desconto)
 * @param quantidade Quantidade do item
 * @param valorUnitario Valor unitário
 * @param desconto Desconto opcional
 * @returns Valor total calculado
 */
export const calcularValorTotalItem = (
  quantidade: number,
  valorUnitario: number,
  desconto: number = 0
): number => {
  return Number((quantidade * valorUnitario - desconto).toFixed(2));
};

/**
 * Calcula o valor de ISS baseado no valor de serviços e alíquota
 * @param valorServicos Valor dos serviços
 * @param aliquota Alíquota em percentual (ex: 5 para 5%)
 * @returns Valor do ISS calculado
 */
export const calcularISS = (valorServicos: number, aliquota: number): number => {
  return Number((valorServicos * (aliquota / 100)).toFixed(2));
};

/**
 * Obtém descrição amigável do tipo de pagamento
 * @param tipo Código do tipo de pagamento
 * @returns Descrição do tipo
 */
export const obterDescricaoPagamento = (tipo: string): string => {
  const tipos: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '15': 'Boleto Bancário',
    '90': 'Sem Pagamento',
    '99': 'Outros',
  };
  return tipos[tipo] || 'Não informado';
};
