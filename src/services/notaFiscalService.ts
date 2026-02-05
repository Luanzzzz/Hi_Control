/**
 * Serviço de API para Notas Fiscais
 * Usa a instância centralizada de API com interceptores JWT
 */
import axios from 'axios';
import api from './api';
import type {
  NotaFiscal,
  NotaFiscalDetalhada,
  FiltrosBusca,
  FiltrosBuscaGeral,
  EstatisticasNotas,
  JobBusca,
  PropsInicioBusca
} from '../types/notaFiscal';

/**
 * Busca avançada de notas fiscais
 */
export const buscarNotasAvancado = async (
  filtros: FiltrosBusca
): Promise<NotaFiscal[]> => {
  try {
    const params = {
      tipo_nf: filtros.tipo_nf === "TODAS" ? undefined : filtros.tipo_nf,
      cnpj_emitente: filtros.cnpj_emitente || undefined,
      data_inicio: filtros.data_inicio,
      data_fim: filtros.data_fim,
      numero_nf: filtros.numero_nf || undefined,
      serie: filtros.serie || undefined,
      situacao: filtros.situacao === "todas" ? undefined : filtros.situacao
    };

    const response = await api.get<NotaFiscal[]>('/notas/buscar', { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao buscar notas fiscais';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Busca geral de notas fiscais (com paginação)
 */
export const buscarNotasGeral = async (
  filtros: FiltrosBuscaGeral
): Promise<NotaFiscal[]> => {
  try {
    const params = {
      search_term: filtros.search_term || undefined,
      tipo_nf: filtros.tipo_nf || "TODAS",
      situacao: filtros.situacao === "todas" ? undefined : filtros.situacao,
      data_inicio: filtros.data_inicio || undefined,
      data_fim: filtros.data_fim || undefined,
      cnpj_emitente: filtros.cnpj_emitente || undefined,
      skip: filtros.skip || 0,
      limit: filtros.limit || 100
    };

    const response = await api.get<NotaFiscal[]>('/notas', { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao buscar notas fiscais';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Obtém detalhes de uma nota fiscal pela chave de acesso
 */
export const obterDetalhesNota = async (
  chaveAcesso: string
): Promise<NotaFiscalDetalhada> => {
  try {
    const response = await api.get<NotaFiscalDetalhada>(
      `/notas/${chaveAcesso}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao obter detalhes da nota';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Baixa o XML de uma nota fiscal
 */
export const baixarXmlNota = async (chaveAcesso: string): Promise<Blob> => {
  try {
    const response = await api.get(`/notas/${chaveAcesso}/xml`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao baixar XML da nota';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Obtém estatísticas de notas fiscais em um período
 */
export const obterEstatisticasNotas = async (
  dataInicio: string,
  dataFim: string
): Promise<EstatisticasNotas> => {
  try {
    const response = await api.get<EstatisticasNotas>(
      '/notas/estatisticas/resumo',
      {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao obter estatísticas';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Faz download de um blob como arquivo
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Formata valor para moeda brasileira
 */
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

/**
 * Formata data para padrão brasileiro
 */
export const formatarData = (dataISO: string): string => {
  return new Date(dataISO).toLocaleDateString('pt-BR');
};

/**
 * Formata data e hora para padrão brasileiro
 */
export const formatarDataHora = (dataISO: string): string => {
  return new Date(dataISO).toLocaleString('pt-BR');
};

/**
 * Inicia a busca de notas em background
 */
export const iniciarBuscaNFe = async (
  cnpj: string,
  nsuInicial?: number
): Promise<PropsInicioBusca> => {
  try {
    const response = await api.post<PropsInicioBusca>(
      '/nfe/buscar/iniciar',
      { cnpj, nsu_inicial: nsuInicial }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao iniciar busca';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Verifica status do Job de busca
 */
export const verificarStatusBusca = async (jobId: string): Promise<JobBusca> => {
  try {
    const response = await api.get<JobBusca>(`/nfe/buscar/status/${jobId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao verificar status';
      throw new Error(message);
    }
    throw error;
  }
};

// ============================================
// ===== NOVOS ENDPOINTS DE EMPRESA (Sprint NFe Integration) =====
// ============================================

export interface StatusCertificado {
  status: 'ativo' | 'expirando' | 'vencido' | 'ausente';
  mensagem: string;
  dias_para_vencer: number | null;
  data_validade: string | null;
  titular: string | null;
  pode_consultar: boolean;
  usando_fallback: boolean;
  fallback_disponivel: boolean;
}

export interface BuscarNotasEmpresaRequest {
  cnpj: string;
  nsu_inicial?: number;
  max_notas?: number;
}

export interface BuscarNotasEmpresaResponse {
  success: boolean;
  fonte: 'cache' | 'sefaz';
  empresa_id: string;
  certificado_status: string;
  certificado_usado: string;
  notas: NotaFiscal[];
  ultimo_nsu: number;
  max_nsu: number;
  total_notas: number;
  tem_mais_notas: boolean;
}

export interface HistoricoConsulta {
  id: string;
  empresa_id: string;
  filtros: Record<string, any>;
  quantidade_notas: number;
  fonte: 'cache' | 'sefaz';
  created_at: string;
  sucesso: boolean;
  erro?: string;
}

/**
 * Obtém status do certificado de uma empresa
 */
export const obterStatusCertificadoEmpresa = async (
  empresaId: string
): Promise<StatusCertificado> => {
  try {
    const response = await api.get<StatusCertificado>(
      `/nfe/empresas/${empresaId}/certificado/status`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao verificar certificado';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Busca notas fiscais de uma empresa específica
 * Usa cache quando disponível e certificado da empresa ou fallback do contador
 */
export const buscarNotasEmpresa = async (
  empresaId: string,
  filtros: BuscarNotasEmpresaRequest
): Promise<BuscarNotasEmpresaResponse> => {
  try {
    const response = await api.post<BuscarNotasEmpresaResponse>(
      `/nfe/empresas/${empresaId}/notas/buscar`,
      filtros
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao buscar notas da empresa';
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Obtém histórico de consultas de uma empresa
 */
export const obterHistoricoConsultas = async (
  empresaId: string,
  limit: number = 10
): Promise<HistoricoConsulta[]> => {
  try {
    const response = await api.get<HistoricoConsulta[]>(
      `/nfe/empresas/${empresaId}/notas/historico`,
      { params: { limit } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao obter histórico';
      throw new Error(message);
    }
    throw error;
  }
};
