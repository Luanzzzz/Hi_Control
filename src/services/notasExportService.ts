import * as XLSX from 'xlsx';
import type {
  DashboardEmpresa,
  FiltrosNotas,
  NotaFiscalDashboard,
} from '../../types';

export type ExportFormat = 'xlsx' | 'csv';
export type ExportScope = 'pagina' | 'todas_filtradas';

export interface ExportColumn {
  key: string;
  label: string;
  enabled: boolean;
  width?: number;
}

export interface ExportNotasConfig {
  format: ExportFormat;
  scope: ExportScope;
  filename: string;
  includeSummarySheet: boolean;
  includeMetadata: boolean;
  csvDelimiter: ';' | ',' | '\t';
  columns: ExportColumn[];
}

interface ExportNotasParams {
  notas: NotaFiscalDashboard[];
  config: ExportNotasConfig;
  empresa?: DashboardEmpresa['empresa'] | null;
  resumo?: DashboardEmpresa['resumo'] | null;
  filtros?: FiltrosNotas;
  periodo?: { mes: number; ano: number };
  totalNotasFiltradas?: number;
}

const formatarData = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
};

const formatarDataHora = (value: Date): string =>
  value.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const normalizarSituacao = (value: NotaFiscalDashboard['situacao']): string => {
  if (value === 'autorizada') return 'ATIVA';
  if (value === 'cancelada') return 'CANCELADA';
  if (value === 'denegada') return 'DENEGADA';
  return 'PROCESSANDO';
};

const normalizarTipo = (nota: NotaFiscalDashboard): string =>
  `${nota.tipo_operacao === 'saida' ? 'PREST.' : 'TOM.'} ${nota.tipo_nf}`;

const obterNomeContraparte = (nota: NotaFiscalDashboard): string =>
  nota.tipo_operacao === 'saida'
    ? nota.nome_destinatario || nota.nome_emitente || ''
    : nota.nome_emitente || nota.nome_destinatario || '';

const obterCnpjContraparte = (nota: NotaFiscalDashboard): string =>
  nota.tipo_operacao === 'saida'
    ? nota.cnpj_destinatario || nota.cnpj_emitente || ''
    : nota.cnpj_emitente || nota.cnpj_destinatario || '';

const escapeSheetName = (value: string): string =>
  value.replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Notas';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const DEFAULT_COLUMNS: ExportColumn[] = [
  { key: 'emissao', label: 'Emissao', enabled: true, width: 12 },
  { key: 'competencia', label: 'Competencia', enabled: true, width: 12 },
  { key: 'tipo', label: 'Tipo', enabled: true, width: 14 },
  { key: 'numero', label: 'Numero', enabled: true, width: 18 },
  { key: 'chave_acesso', label: 'Chave de Acesso', enabled: true, width: 48 },
  { key: 'contraparte', label: 'Contraparte', enabled: true, width: 34 },
  { key: 'cnpj_contraparte', label: 'CNPJ Contraparte', enabled: true, width: 20 },
  { key: 'municipio', label: 'Municipio', enabled: true, width: 22 },
  { key: 'valor_total', label: 'Valor Total', enabled: true, width: 16 },
  { key: 'status', label: 'Status', enabled: true, width: 14 },
  { key: 'fonte', label: 'Fonte', enabled: true, width: 16 },
  { key: 'cnpj_emitente', label: 'CNPJ Emitente', enabled: false, width: 20 },
  { key: 'nome_emitente', label: 'Nome Emitente', enabled: false, width: 34 },
  { key: 'cnpj_destinatario', label: 'CNPJ Destinatario', enabled: false, width: 20 },
  { key: 'nome_destinatario', label: 'Nome Destinatario', enabled: false, width: 34 },
  { key: 'tipo_operacao', label: 'Operacao', enabled: false, width: 12 },
  { key: 'serie', label: 'Serie', enabled: false, width: 10 },
  { key: 'data_emissao_iso', label: 'Data Emissao (ISO)', enabled: false, width: 22 },
];

export const getDefaultExportColumns = (): ExportColumn[] =>
  DEFAULT_COLUMNS.map((item) => ({ ...item }));

export const createDefaultExportConfig = (empresaId?: string): ExportNotasConfig => ({
  format: 'xlsx',
  scope: 'pagina',
  filename: `notas-${empresaId || 'empresa'}`,
  includeSummarySheet: true,
  includeMetadata: true,
  csvDelimiter: ';',
  columns: getDefaultExportColumns(),
});

const toRow = (nota: NotaFiscalDashboard): Record<string, string | number> => ({
  emissao: formatarData(nota.data_emissao),
  competencia: formatarData(nota.data_emissao),
  tipo: normalizarTipo(nota),
  numero: nota.numero_nf || '',
  chave_acesso: nota.chave_acesso || '',
  contraparte: obterNomeContraparte(nota),
  cnpj_contraparte: obterCnpjContraparte(nota),
  municipio: nota.municipio_nome || '',
  valor_total: Number(nota.valor_total || 0),
  status: normalizarSituacao(nota.situacao),
  fonte: nota.fonte_captura || '',
  cnpj_emitente: nota.cnpj_emitente || '',
  nome_emitente: nota.nome_emitente || '',
  cnpj_destinatario: nota.cnpj_destinatario || '',
  nome_destinatario: nota.nome_destinatario || '',
  tipo_operacao: nota.tipo_operacao || '',
  serie: nota.serie || '',
  data_emissao_iso: nota.data_emissao || '',
});

const montarPlanilhaResumo = (
  params: ExportNotasParams,
  quantidadeExportada: number,
  colunasAtivas: ExportColumn[]
) => {
  const now = new Date();
  const filtros = params.filtros || {};
  const periodo = params.periodo;

  const linhas = [
    ['HI-CONTROL - MODELO EXCEL PADRAO'],
    [],
    ['Gerado em', formatarDataHora(now)],
    ['Empresa', params.empresa?.razao_social || '-'],
    ['CNPJ', params.empresa?.cnpj || '-'],
    ['Periodo', periodo ? `${periodo.mes.toString().padStart(2, '0')}/${periodo.ano}` : '-'],
    ['Escopo', params.config.scope === 'pagina' ? 'Pagina atual' : 'Todas as notas filtradas'],
    ['Total exportado', quantidadeExportada],
    ['Total filtrado', Number(params.totalNotasFiltradas || quantidadeExportada)],
    [],
    ['Filtros aplicados'],
    ['Tipo', filtros.tipo || 'Todos'],
    ['Status', filtros.status || 'Todos'],
    ['Retencao', filtros.retencao || 'Todas'],
    ['Busca', filtros.busca || '-'],
    ['Data inicio', filtros.dataInicio || '-'],
    ['Data fim', filtros.dataFim || '-'],
    [],
    ['Colunas exportadas'],
    ...colunasAtivas.map((coluna) => [coluna.label]),
  ];

  if (params.resumo) {
    linhas.push([], ['Resumo financeiro'], ['Prestados', Number(params.resumo.prestados_valor || 0)]);
    linhas.push(['Tomados', Number(params.resumo.tomados_valor || 0)]);
    linhas.push(['Total retido', Number(params.resumo.total_retido || 0)]);
    linhas.push(['Diferenca', Number(params.resumo.diferenca || 0)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws['!cols'] = [{ wch: 32 }, { wch: 48 }];
  return ws;
};

const montarPlanilhaNotas = (rows: Array<Record<string, string | number>>, colunasAtivas: ExportColumn[]) => {
  const header = colunasAtivas.map((col) => col.label);
  const body = rows.map((row) => colunasAtivas.map((col) => row[col.key] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws['!cols'] = colunasAtivas.map((col) => ({ wch: col.width || 18 }));
  return ws;
};

export const exportarNotasComConfiguracao = (params: ExportNotasParams): { filename: string; exported: number } => {
  const colunasAtivas = params.config.columns.filter((col) => col.enabled);
  if (!colunasAtivas.length) {
    throw new Error('Selecione pelo menos uma coluna para exportar.');
  }

  const rows = params.notas.map(toRow);
  const notasSheet = montarPlanilhaNotas(rows, colunasAtivas);

  const baseName = (params.config.filename || `notas-${params.empresa?.id || 'empresa'}`).trim();
  const safeName = baseName.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'notas-export';

  if (params.config.format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(notasSheet, { FS: params.config.csvDelimiter });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const filename = `${safeName}.csv`;
    downloadBlob(blob, filename);
    return { filename, exported: rows.length };
  }

  const wb = XLSX.utils.book_new();
  if (params.config.includeSummarySheet) {
    const resumoWs = montarPlanilhaResumo(params, rows.length, colunasAtivas);
    XLSX.utils.book_append_sheet(wb, resumoWs, 'Resumo');
  }

  const notasSheetName = escapeSheetName(`Notas ${params.periodo?.ano || ''}`.trim());
  XLSX.utils.book_append_sheet(wb, notasSheet, notasSheetName || 'Notas');

  const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([wbArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `${safeName}.xlsx`;
  downloadBlob(blob, filename);
  return { filename, exported: rows.length };
};
