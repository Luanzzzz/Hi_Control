/**
 * Serviço de API para Notas Fiscais
 * Usa a instância centralizada de API com interceptores JWT
 *
 * ─── Busca Fiscal (SEFAZ / Cache) ─────────────────────────────────────────
 * Responsabilidade: busca de notas por empresa com fallback cache→SEFAZ.
 * Componente oficial: Hi_Control/components/InvoiceSearch.tsx
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

const extrairMensagemAxios = async (
  error: unknown,
  fallback: string
): Promise<string> => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const payload = error.response?.data;
  if (payload instanceof Blob) {
    try {
      const text = await payload.text();
      const json = JSON.parse(text);
      return json?.detail || json?.mensagem || fallback;
    } catch {
      return fallback;
    }
  }

  return payload?.detail || payload?.mensagem || fallback;
};

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
    throw new Error(await extrairMensagemAxios(error, 'Erro ao baixar XML da nota'));
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
  fonte: 'cache' | 'sefaz' | 'banco_local';
  empresa_id: string;
  certificado_status: string;
  certificado_usado: string;
  sincronizacao_automatica?: boolean;
  novas_notas_sincronizadas?: number;
  modo_busca?: 'hibrido';
  tem_dados_locais?: boolean;
  sincronizacao_disponivel?: boolean;
  sincronizacao_pendente?: boolean;
  acao_sugerida?: string | null;
  ultima_sincronizacao?: string | null;
  mensagem?: string;
  orientacao?: {
    titulo?: string;
    passos?: string[];
    acoes_sugeridas?: string[];
    endpoints_disponiveis?: Record<string, string>;
  };
  notas: NotaFiscal[];
  ultimo_nsu: number;
  max_nsu: number;
  total_notas: number;
  total_encontradas?: number;
  tem_mais_notas: boolean;
}

export interface ExportacaoXmlLoteRequest {
  cnpj: string;
  sincronizar_antes?: boolean;
}

export interface SalvarXmlsDriveResponse {
  success: boolean;
  empresa_id: string;
  total_notas_consideradas: number;
  total_xmls_processados: number;
  sincronizacao_automatica: boolean;
  novas_notas_sincronizadas: number;
  xmls_salvos_drive: number;
  xmls_ignorados_drive: number;
  xmls_sem_conteudo: number;
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
 * Carrega todas as paginas do buscador oficial para uma empresa.
 * Mantem o endpoint oficial, apenas iterando ate nao haver mais notas.
 */
export const buscarTodasNotasEmpresa = async (
  empresaId: string,
  filtros: BuscarNotasEmpresaRequest,
  pageSize: number = 200
): Promise<BuscarNotasEmpresaResponse> => {
  const acumuladas: NotaFiscal[] = [];
  const chavesVistas = new Set<string>();
  let nsuInicial = 0;
  let ultimaResposta: BuscarNotasEmpresaResponse | null = null;

  while (true) {
    const resposta = await buscarNotasEmpresa(empresaId, {
      ...filtros,
      nsu_inicial: nsuInicial,
      max_notas: pageSize,
    });

    for (const nota of resposta.notas || []) {
      const chave = nota.chave_acesso || `${nota.id}-${nota.numero_nf}-${nota.serie}`;
      if (chavesVistas.has(chave)) {
        continue;
      }
      chavesVistas.add(chave);
      acumuladas.push(nota);
    }

    ultimaResposta = resposta;

    if (!resposta.tem_mais_notas || resposta.notas.length === 0) {
      break;
    }

    nsuInicial = resposta.ultimo_nsu;
  }

  if (!ultimaResposta) {
    return await buscarNotasEmpresa(empresaId, filtros);
  }

  return {
    ...ultimaResposta,
    notas: acumuladas,
    total_notas: acumuladas.length,
    total_encontradas: acumuladas.length,
    ultimo_nsu: ultimaResposta.max_nsu,
    tem_mais_notas: false,
  };
};

/**
 * Baixa um ZIP com todos os XMLs fiscais da empresa.
 */
export const baixarXmlsLoteEmpresa = async (
  empresaId: string,
  payload: ExportacaoXmlLoteRequest
): Promise<Blob> => {
  try {
    const response = await api.post(
      `/nfe/empresas/${empresaId}/notas/xmls/lote/baixar`,
      payload,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    throw new Error(await extrairMensagemAxios(error, 'Erro ao baixar XMLs em lote'));
  }
};

/**
 * Salva em lote os XMLs fiscais da empresa no Google Drive.
 */
export const salvarXmlsLoteNoDrive = async (
  empresaId: string,
  payload: ExportacaoXmlLoteRequest
): Promise<SalvarXmlsDriveResponse> => {
  try {
    const response = await api.post<SalvarXmlsDriveResponse>(
      `/nfe/empresas/${empresaId}/notas/xmls/lote/salvar-drive`,
      payload
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro ao salvar XMLs no Drive';
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

// Funções de Google Drive extraídas para driveService.ts (Etapa 4)
// Ver: src/services/driveService.ts → buscarNotasDrive, sincronizarDrive, NotaDrive
