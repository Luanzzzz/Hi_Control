/**
 * ClientSearchDashboard — Dashboard de Busca de Notas por Empresa
 *
 * Exibe todas as informações do módulo buscador para uma empresa específica:
 * KPIs, tabela de notas com filtros, busca manual e sincronização automática.
 *
 * Domínio: BUSCA (buscador_notas)
 * Não exibe dados de emissão.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  Filter,
  ChevronDown,
  Building2,
  AlertCircle,
} from 'lucide-react';
import {
  buscarTodasNotasEmpresa,
  BuscarNotasEmpresaResponse,
  formatarMoeda,
  formatarData,
} from '../src/services/notaFiscalService';
import { empresaService, Empresa } from '../services/empresaService';
import { botService, StatusEmpresa } from '../src/services/botService';
import { useAutoSearch } from '../src/hooks/useAutoSearch';
import { SincronizacaoAutomatica } from '../src/components/SincronizacaoAutomatica';

interface ClientSearchDashboardProps {
  empresaId: string;
  onBack: () => void;
}

interface NotaFiscal {
  id: string;
  chave_acesso?: string;
  numero_nf: string;
  serie: string;
  tipo_nf?: string;
  situacao?: string;
  data_emissao?: string;
  valor_total?: number;
  nome_emitente?: string;
  cnpj_emitente?: string;
}

const TIPO_LABELS: Record<string, string> = {
  NFE: 'NF-e',
  NFCE: 'NFC-e',
  CTE: 'CT-e',
  NFSE: 'NFS-e',
  nfe: 'NF-e',
  nfce: 'NFC-e',
  cte: 'CT-e',
  nfse: 'NFS-e',
};

const SITUACAO_LABELS: Record<string, { label: string; color: string }> = {
  autorizada: { label: 'Autorizada', color: 'text-green-400 bg-green-500/10' },
  cancelada: { label: 'Cancelada', color: 'text-red-400 bg-red-500/10' },
  denegada: { label: 'Denegada', color: 'text-orange-400 bg-orange-500/10' },
  inutilizada: { label: 'Inutilizada', color: 'text-hc-muted bg-hc-card' },
};

export const ClientSearchDashboard: React.FC<ClientSearchDashboardProps> = ({
  empresaId,
  onBack,
}) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [botStatus, setBotStatus] = useState<StatusEmpresa | null>(null);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroSituacao, setFiltroSituacao] = useState('todas');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const carregarNotas = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [empresaData, statusData, notasData] = await Promise.allSettled([
        empresaService.obterPorId(empresaId),
        botService.obterStatusEmpresa(empresaId),
        buscarTodasNotasEmpresa(empresaId, { cnpj: '' }),
      ]);

      if (empresaData.status === 'fulfilled') setEmpresa(empresaData.value);
      if (statusData.status === 'fulfilled') setBotStatus(statusData.value);
      if (notasData.status === 'fulfilled') {
        setNotas((notasData.value as BuscarNotasEmpresaResponse).notas as NotaFiscal[]);
      }
    } catch {
      setErro('Erro ao carregar dados da empresa');
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    carregarNotas();
  }, [carregarNotas]);

  const { executarAgora, sincronizando } = useAutoSearch(empresaId, carregarNotas);

  // KPIs calculados
  const totalNotas = notas.length;
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();
  const notasMes = notas.filter((n) => {
    if (!n.data_emissao) return false;
    const d = new Date(n.data_emissao);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  }).length;

  const porTipo = notas.reduce<Record<string, number>>((acc, n) => {
    const tipo = n.tipo_nf ?? 'outros';
    acc[tipo] = (acc[tipo] ?? 0) + 1;
    return acc;
  }, {});

  // Filtro local
  const notasFiltradas = notas.filter((n) => {
    if (filtroTipo !== 'TODAS' && n.tipo_nf !== filtroTipo) return false;
    if (filtroSituacao !== 'todas' && n.situacao !== filtroSituacao) return false;
    if (filtroDataInicio && n.data_emissao && n.data_emissao < filtroDataInicio) return false;
    if (filtroDataFim && n.data_emissao && n.data_emissao > filtroDataFim) return false;
    return true;
  });

  const handleDownloadCSV = () => {
    if (notasFiltradas.length === 0) return;
    const headers = ['Número', 'Série', 'Tipo', 'Situação', 'Data Emissão', 'Valor Total', 'Emitente'];
    const rows = notasFiltradas.map((n) => [
      n.numero_nf,
      n.serie,
      TIPO_LABELS[n.tipo_nf ?? ''] ?? n.tipo_nf ?? '-',
      n.situacao ?? '-',
      n.data_emissao ? formatarData(n.data_emissao) : '-',
      n.valor_total != null ? formatarMoeda(n.valor_total) : '-',
      n.nome_emitente ?? '-',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas_${empresaId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-hc-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-hc-muted">Carregando notas fiscais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-hc-card text-hc-muted hover:text-hc-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-hc-purple-dim flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-hc-purple-light" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-hc-text truncate">
              {empresa?.razao_social ?? 'Empresa'}
            </h1>
            <p className="text-xs text-hc-muted">
              {empresa?.cnpj ?? empresaId} · Dashboard de Busca
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={executarAgora}
            disabled={sincronizando}
            className="flex items-center gap-2 px-4 py-2 bg-hc-purple text-white rounded-lg text-sm font-medium hover:bg-hc-purple/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Buscando...' : 'Buscar Agora'}
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-hc-purple-light" />
            <p className="text-xs text-hc-muted">Total de Notas</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{totalNotas}</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-blue-400" />
            <p className="text-xs text-hc-muted">Este Mês</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{notasMes}</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-400" />
            <p className="text-xs text-hc-muted">NF-e / NFC-e</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">
            {(porTipo['NFE'] ?? porTipo['nfe'] ?? 0) + (porTipo['NFCE'] ?? porTipo['nfce'] ?? 0)}
          </p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-orange-400" />
            <p className="text-xs text-hc-muted">Última Sincronização</p>
          </div>
          <p className="text-sm font-medium text-hc-text">
            {botStatus?.ultima_nota?.created_at
              ? formatarData(botStatus.ultima_nota.created_at)
              : 'Nunca'}
          </p>
        </div>
      </div>

      {/* Distribuição por tipo */}
      {Object.keys(porTipo).length > 0 && (
        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <p className="text-sm font-medium text-hc-text mb-3">Distribuição por Tipo</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(porTipo).map(([tipo, qtd]) => (
              <div key={tipo} className="flex items-center gap-2 px-3 py-1.5 bg-hc-card rounded-lg">
                <span className="text-xs font-medium text-hc-purple-light">
                  {TIPO_LABELS[tipo] ?? tipo.toUpperCase()}
                </span>
                <span className="text-xs text-hc-muted">{qtd}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sincronização Automática */}
      <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
        <p className="text-sm font-medium text-hc-text mb-3">Sincronização Automática</p>
        <SincronizacaoAutomatica empresaId={empresaId} onAfterSync={carregarNotas} />
      </div>

      {/* Tabela de Notas */}
      <div className="bg-hc-surface border border-hc-border rounded-xl overflow-hidden">
        {/* Toolbar da tabela */}
        <div className="p-4 border-b border-hc-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-hc-muted" />
            <p className="text-sm font-medium text-hc-text">
              Notas Fiscais
              <span className="ml-2 text-xs text-hc-muted font-normal">
                {notasFiltradas.length} de {totalNotas}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltrosAbertos((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hc-muted hover:text-hc-accent hover:bg-hc-card rounded-lg transition-colors"
            >
              <Filter size={14} />
              Filtros
              <ChevronDown
                size={14}
                className={`transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={notasFiltradas.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hc-muted hover:text-hc-accent hover:bg-hc-card rounded-lg transition-colors disabled:opacity-40"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>

        {/* Filtros expandidos */}
        {filtrosAbertos && (
          <div className="p-4 border-b border-hc-border bg-hc-card/30 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] text-hc-muted mb-1 uppercase tracking-wide">Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full text-xs bg-hc-surface border border-hc-border rounded-lg px-2 py-1.5 text-hc-text"
              >
                <option value="TODAS">Todas</option>
                <option value="NFE">NF-e</option>
                <option value="NFCE">NFC-e</option>
                <option value="CTE">CT-e</option>
                <option value="NFSE">NFS-e</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-hc-muted mb-1 uppercase tracking-wide">Situação</label>
              <select
                value={filtroSituacao}
                onChange={(e) => setFiltroSituacao(e.target.value)}
                className="w-full text-xs bg-hc-surface border border-hc-border rounded-lg px-2 py-1.5 text-hc-text"
              >
                <option value="todas">Todas</option>
                <option value="autorizada">Autorizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="denegada">Denegada</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-hc-muted mb-1 uppercase tracking-wide">Data Início</label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full text-xs bg-hc-surface border border-hc-border rounded-lg px-2 py-1.5 text-hc-text"
              />
            </div>
            <div>
              <label className="block text-[10px] text-hc-muted mb-1 uppercase tracking-wide">Data Fim</label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full text-xs bg-hc-surface border border-hc-border rounded-lg px-2 py-1.5 text-hc-text"
              />
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto">
          {notasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={40} className="text-hc-muted mb-3 opacity-40" />
              <p className="text-sm text-hc-muted">Nenhuma nota encontrada</p>
              <p className="text-xs text-hc-muted mt-1 opacity-60">
                Clique em "Buscar Agora" para sincronizar
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hc-border">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Número</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Situação</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Emissão</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Valor</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide hidden lg:table-cell">Emitente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hc-border">
                {notasFiltradas.slice(0, 200).map((nota) => {
                  const sit = SITUACAO_LABELS[nota.situacao ?? ''];
                  return (
                    <tr key={nota.id} className="hover:bg-hc-card/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-hc-text">
                        {nota.numero_nf}/{nota.serie}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-hc-purple-light">
                          {TIPO_LABELS[nota.tipo_nf ?? ''] ?? nota.tipo_nf ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sit ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sit.color}`}>
                            {sit.label}
                          </span>
                        ) : (
                          <span className="text-xs text-hc-muted">{nota.situacao ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-muted">
                        {nota.data_emissao ? formatarData(nota.data_emissao) : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-text text-right font-medium">
                        {nota.valor_total != null ? formatarMoeda(nota.valor_total) : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-muted hidden lg:table-cell max-w-[200px] truncate">
                        {nota.nome_emitente ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {notasFiltradas.length > 200 && (
          <div className="px-4 py-3 border-t border-hc-border text-xs text-hc-muted text-center">
            Exibindo 200 de {notasFiltradas.length} notas. Use os filtros para refinar.
          </div>
        )}
      </div>
    </div>
  );
};
