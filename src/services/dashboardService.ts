import api from './api';
import type {
  DashboardEmpresa,
  FiltrosNotas,
  NotaFiscalDashboard,
  SyncStatus,
} from '../../types';

interface RawDashboardResponse {
  empresa: DashboardEmpresa['empresa'];
  sync: SyncStatus;
  resumo: DashboardEmpresa['resumo'];
  historico: DashboardEmpresa['historico'];
  notas: any[];
  total_notas?: number;
  notas_total?: number;
  periodo_referencia_mes?: number;
  periodo_referencia_ano?: number;
}

const SITUACAO_FALLBACK: NotaFiscalDashboard['situacao'] = 'processando';
const FONTE_FALLBACK: NotaFiscalDashboard['fonte_captura'] = 'manual';

const mapSituacao = (value: string | undefined): NotaFiscalDashboard['situacao'] => {
  if (value === 'autorizada' || value === 'cancelada' || value === 'denegada' || value === 'processando') {
    return value;
  }
  return SITUACAO_FALLBACK;
};

const mapTipoNF = (value: string | undefined): NotaFiscalDashboard['tipo_nf'] => {
  if (value === 'NFe' || value === 'NFSe' || value === 'NFCe' || value === 'CTe') {
    return value;
  }
  return 'NFe';
};

const mapTipoOperacao = (value: string | undefined): NotaFiscalDashboard['tipo_operacao'] => {
  return value === 'saida' ? 'saida' : 'entrada';
};

const mapFonte = (value: string | undefined): NotaFiscalDashboard['fonte_captura'] => {
  if (value === 'sefaz_nacional' || value === 'manual' || value === 'importacao') {
    return value;
  }
  return FONTE_FALLBACK;
};

const normalizeNota = (nota: any): NotaFiscalDashboard => ({
  id: String(nota.id ?? ''),
  chave_acesso: String(nota.chave_acesso ?? ''),
  numero_nf: String(nota.numero_nf ?? ''),
  serie: String(nota.serie ?? ''),
  tipo_nf: mapTipoNF(nota.tipo_nf),
  tipo_operacao: mapTipoOperacao(nota.tipo_operacao),
  data_emissao: String(nota.data_emissao ?? ''),
  valor_total: Number(nota.valor_total ?? 0),
  cnpj_emitente: String(nota.cnpj_emitente ?? ''),
  nome_emitente: String(nota.nome_emitente ?? ''),
  cnpj_destinatario: String(nota.cnpj_destinatario ?? ''),
  nome_destinatario: String(nota.nome_destinatario ?? ''),
  situacao: mapSituacao(nota.situacao),
  municipio_nome: nota.municipio_nome ? String(nota.municipio_nome) : undefined,
  fonte_captura: mapFonte(nota.fonte_captura ?? nota.fonte),
});

const normalizeDashboard = (data: RawDashboardResponse): DashboardEmpresa => {
  const notas = (data.notas || []).map(normalizeNota);
  return {
    empresa: data.empresa,
    sync: data.sync,
    resumo: data.resumo,
    historico: data.historico || [],
    notas,
    total_notas: Number(data.total_notas ?? data.notas_total ?? notas.length),
    periodo_referencia_mes: data.periodo_referencia_mes,
    periodo_referencia_ano: data.periodo_referencia_ano,
  };
};

const filtrarNotasLocal = (
  notas: NotaFiscalDashboard[],
  filtros: FiltrosNotas
): NotaFiscalDashboard[] => {
  const termo = (filtros.busca || '').trim().toLowerCase();
  const dataInicio = filtros.dataInicio ? new Date(`${filtros.dataInicio}T00:00:00`) : null;
  const dataFim = filtros.dataFim ? new Date(`${filtros.dataFim}T23:59:59`) : null;

  return notas.filter((nota) => {
    if (filtros.tipo && filtros.tipo !== 'Todos' && filtros.tipo !== 'todos') {
      const tipo = filtros.tipo.replace('-', '').replace(' ', '').toLowerCase();
      if (nota.tipo_nf.toLowerCase() !== tipo) {
        return false;
      }
    }

    if (filtros.status && filtros.status !== 'Todos' && filtros.status !== 'todos') {
      const status = filtros.status.toLowerCase();
      if (status === 'ativa' && nota.situacao !== 'autorizada') return false;
      if (status === 'cancelada' && nota.situacao !== 'cancelada') return false;
      if (status === 'denegada' && nota.situacao !== 'denegada') return false;
    }

    if (termo) {
      const alvo = [
        nota.numero_nf,
        nota.chave_acesso,
        nota.cnpj_emitente,
        nota.nome_emitente,
        nota.cnpj_destinatario,
        nota.nome_destinatario,
      ]
        .join(' ')
        .toLowerCase();
      if (!alvo.includes(termo)) {
        return false;
      }
    }

    if (dataInicio || dataFim) {
      const emissao = new Date(nota.data_emissao);
      if (Number.isNaN(emissao.getTime())) {
        return false;
      }
      if (dataInicio && emissao < dataInicio) {
        return false;
      }
      if (dataFim && emissao > dataFim) {
        return false;
      }
    }

    return true;
  });
};

export async function getDashboardEmpresa(
  empresaId: string,
  mes?: number,
  ano?: number
): Promise<DashboardEmpresa> {
  const params: Record<string, number> = {};
  if (mes) params.mes = mes;
  if (ano) params.ano = ano;

  const response = await api.get<RawDashboardResponse>(`/empresas/${empresaId}/dashboard`, { params });
  return normalizeDashboard(response.data);
}

export async function getSyncStatus(empresaId: string): Promise<SyncStatus> {
  const response = await api.get<SyncStatus>(`/sync/empresas/${empresaId}/status`);
  return response.data;
}

export async function forceSyncEmpresa(empresaId: string): Promise<{ mensagem: string }> {
  const response = await api.post<{ mensagem: string }>(`/sync/empresas/${empresaId}/forcar`);
  return response.data;
}

export async function getSyncHistorico(empresaId: string): Promise<any[]> {
  const response = await api.get<any[]>(`/sync/empresas/${empresaId}/historico`);
  return response.data;
}

export async function filtrarNotas(
  empresaId: string,
  filtros: FiltrosNotas
): Promise<{ notas: NotaFiscalDashboard[]; total: number }> {
  const params: Record<string, string | number> = {};
  if (filtros.tipo) params.tipo = filtros.tipo;
  if (filtros.status) params.status = filtros.status;
  if (filtros.retencao) params.retencao = filtros.retencao;
  if (filtros.busca) params.busca = filtros.busca;
  if (filtros.pagina) params.pagina = filtros.pagina;
  if (filtros.dataInicio) params.data_inicio = filtros.dataInicio;
  if (filtros.dataFim) params.data_fim = filtros.dataFim;

  try {
    const response = await api.get<{ notas?: any[]; total?: number }>(`/empresas/${empresaId}/notas`, { params });
    const notas = (response.data.notas || []).map(normalizeNota);
    return { notas, total: Number(response.data.total ?? notas.length) };
  } catch (error: any) {
    if (error?.response?.status && error.response.status !== 404) {
      throw error;
    }

    const dashboard = await getDashboardEmpresa(empresaId);
    const filtradas = filtrarNotasLocal(dashboard.notas, filtros);
    const pagina = Number(filtros.pagina || 1);
    const limite = 20;
    const inicio = (pagina - 1) * limite;
    const notasPaginadas = filtradas.slice(inicio, inicio + limite);

    return {
      notas: notasPaginadas,
      total: filtradas.length,
    };
  }
}
