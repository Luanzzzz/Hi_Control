/**
 * ClientSearchDashboard — Dashboard de Busca de Notas por Empresa
 *
 * Exibe todas as informações do módulo buscador para uma empresa específica:
 * Gráfico de histórico (últimos 6 meses), resumo acumulado, KPIs, tabela de notas com filtros,
 * modal de certificado e sincronização automática.
 *
 * Domínio: BUSCA (buscador_notas)
 * Não exibe dados de emissão.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Upload,
  Hash,
  Eye,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  buscarTodasNotasEmpresa,
  BuscarNotasEmpresaResponse,
  formatarMoeda,
  formatarData,
  baixarXmlNota,
  downloadBlob,
} from '../src/services/notaFiscalService';
import { empresaService, Empresa } from '../services/empresaService';
import { botService, StatusEmpresa } from '../src/services/botService';
import { certificadoService, CertificadoStatus } from '../src/services/certificadoService';
import { useAutoSearch } from '../src/hooks/useAutoSearch';
import { SincronizacaoAutomatica } from '../src/components/SincronizacaoAutomatica';
import { Button, SearchBar, InlineAlert, LoadingState, EmptyState } from '../src/components/ui';
import { fileToBase64 } from '../utils/fileUtils';
import type { NotaFiscal, TipoNotaFiscal } from '../src/types/notaFiscal';

interface ClientSearchDashboardProps {
  empresaId: string;
  onBack: () => void;
}

interface NotaFiscalSearch {
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

interface EstatisticasChart {
  chartData: Array<{
    name: string;
    quantidade: number;
    valor: number;
  }>;
  totalNotas: number;
  totalValor: number;
  notasNFe: number;
  notasNFCe: number;
  notasCTe: number;
  notasNFSe: number;
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

const formatCurrency = (value: any) => {
  const num = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const ClientSearchDashboard: React.FC<ClientSearchDashboardProps> = ({
  empresaId,
  onBack,
}) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [botStatus, setBotStatus] = useState<StatusEmpresa | null>(null);
  const [notas, setNotas] = useState<NotaFiscalSearch[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  // Estados da Aba Config/Certificado
  const [certStatus, setCertStatus] = useState<CertificadoStatus | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroSituacao, setFiltroSituacao] = useState('todas');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);

  // Gráfico: toggle entre valor e quantidade
  const [exibirGraficoPor, setExibirGraficoPor] = useState<'valor' | 'quantidade'>('valor');

  // Calcula estatísticas das notas fiscais (COM useMemo)
  const estatisticas = useMemo(() => {
    if (!notas || notas.length === 0) {
      return {
        chartData: [],
        totalNotas: 0,
        totalValor: 0,
        notasNFe: 0,
        notasNFCe: 0,
        notasCTe: 0,
        notasNFSe: 0,
      };
    }

    // Agrupa notas por mês
    const notasPorMes: Record<string, { quantidade: number; valor: number }> = {};
    let totalNotas = 0;
    let totalValor = 0;
    let notasNFe = 0;
    let notasNFCe = 0;
    let notasCTe = 0;
    let notasNFSe = 0;

    notas.forEach((nota) => {
      const valor = parseFloat(String(nota.valor_total || 0));
      const mesAno = nota.data_emissao
        ? new Date(nota.data_emissao).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        : 'Sem data';

      // Inicializa mês se não existir
      if (!notasPorMes[mesAno]) {
        notasPorMes[mesAno] = { quantidade: 0, valor: 0 };
      }

      notasPorMes[mesAno].quantidade += 1;
      notasPorMes[mesAno].valor += valor;
      totalNotas++;
      totalValor += valor;

      // Contabiliza por tipo
      const tipo = (nota.tipo_nf || '').toUpperCase();
      if (tipo === 'NFE') notasNFe++;
      else if (tipo === 'NFCE') notasNFCe++;
      else if (tipo === 'CTE') notasCTe++;
      else if (tipo === 'NFSE') notasNFSe++;
    });

    const chartData = Object.entries(notasPorMes)
      .map(([name, values]) => ({
        name,
        quantidade: values.quantidade,
        valor: Math.round(values.valor),
      }))
      .slice(-6); // Últimos 6 meses

    return {
      chartData,
      totalNotas,
      totalValor,
      notasNFe,
      notasNFCe,
      notasCTe,
      notasNFSe,
    };
  }, [notas]);

  const carregarDadosEmpresa = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await empresaService.obterPorId(empresaId);
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  const carregarBotStatus = useCallback(async () => {
    try {
      const status = await botService.obterStatusEmpresa(empresaId);
      setBotStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status do bot:', error);
    }
  }, [empresaId]);

  const carregarCertStatus = useCallback(async () => {
    setLoadingCert(true);
    try {
      const status = await certificadoService.obterStatus(empresaId);
      setCertStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status do certificado:', error);
    } finally {
      setLoadingCert(false);
    }
  }, [empresaId]);

  const carregarNotas = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const cnpjLimpo = empresa?.cnpj?.replace(/\D/g, '') || '';
      const resultado = await buscarTodasNotasEmpresa(empresaId, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,
      });
      setNotas((resultado.notas || []) as NotaFiscalSearch[]);
    } catch (err: any) {
      console.error('Erro ao carregar notas:', err);
      setErro(err.message || 'Erro ao carregar notas fiscais');
    } finally {
      setCarregando(false);
    }
  }, [empresaId, empresa?.cnpj]);

  useEffect(() => {
    carregarDadosEmpresa();
    carregarBotStatus();
    carregarCertStatus();
  }, [carregarDadosEmpresa, carregarBotStatus, carregarCertStatus]);

  useEffect(() => {
    if (empresa) {
      carregarNotas();
    }
  }, [empresa, carregarNotas]);

  const handleSearchNotas = async () => {
    if (!empresa?.cnpj) return;
    setSincronizando(true);
    setErro(null);
    try {
      const cnpjLimpo = empresa.cnpj.replace(/\D/g, '');
      const resultado = await buscarTodasNotasEmpresa(empresaId, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,
      });
      setNotas((resultado.notas || []) as NotaFiscalSearch[]);
      carregarBotStatus();
    } catch (err: any) {
      setErro(err.message || 'Erro ao buscar notas fiscais');
    } finally {
      setSincronizando(false);
    }
  };

  const handleUploadCertificado = async () => {
    if (!certFile || !certPassword) return;
    setUploadingCert(true);
    setUploadResult(null);
    try {
      const certBase64 = await fileToBase64(certFile);
      const res = await certificadoService.upload(empresaId, certBase64, certPassword);
      setUploadResult({ type: 'success', message: res.mensagem });
      setCertFile(null);
      setCertPassword('');
      carregarCertStatus();
      carregarBotStatus();
      setTimeout(() => setShowCertModal(false), 2000);
    } catch (err: any) {
      setUploadResult({ type: 'error', message: err.response?.data?.detail || err.message });
    } finally {
      setUploadingCert(false);
    }
  };

  const handleDownloadXml = async (chaveAcesso: string) => {
    setDownloadingXml(chaveAcesso);
    try {
      const blob = await baixarXmlNota(chaveAcesso);
      downloadBlob(blob, `nfe_${chaveAcesso}.xml`);
    } catch (err) {
      console.error('Erro ao baixar XML:', err);
    } finally {
      setDownloadingXml(null);
    }
  };

  const handleDownloadCSV = () => {
    if (notasFiltradas.length === 0) return;
    const headers = ['Emissão', 'Tipo', 'Número', 'Série', 'Emitente', 'CNPJ Emitente', 'Valor', 'Situação'];
    const rows = notasFiltradas.map((n) => [
      n.data_emissao ? formatarData(n.data_emissao) : '-',
      TIPO_LABELS[n.tipo_nf ?? ''] ?? n.tipo_nf ?? '-',
      n.numero_nf,
      n.serie,
      n.nome_emitente ?? '-',
      n.cnpj_emitente ?? '-',
      n.valor_total != null ? formatarMoeda(n.valor_total) : '-',
      n.situacao ?? '-',
    ]);
    const csv = [headers, ...rows].map((r) => r.map(cell => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas_${empresaId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtro local
  const notasFiltradas = useMemo(() => {
    return notas.filter((n) => {
      if (filtroTipo !== 'TODAS' && (n.tipo_nf || '').toUpperCase() !== filtroTipo) return false;
      if (filtroSituacao !== 'todas' && n.situacao !== filtroSituacao) return false;
      if (filtroDataInicio && n.data_emissao && n.data_emissao < filtroDataInicio) return false;
      if (filtroDataFim && n.data_emissao && n.data_emissao > filtroDataFim) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          n.numero_nf.toLowerCase().includes(term) ||
          n.nome_emitente?.toLowerCase().includes(term) ||
          n.cnpj_emitente?.includes(term) ||
          n.chave_acesso?.includes(term)
        );
      }
      return true;
    });
  }, [notas, filtroTipo, filtroSituacao, filtroDataInicio, filtroDataFim, searchTerm]);

  if (loadingCert && carregando) {
    return <LoadingState size="lg" message="Carregando dados da empresa..." className="min-h-[400px]" />;
  }

  if (!empresa) {
    return (
      <div className="p-6">
        <InlineAlert variant="error" message="Empresa não encontrada" />
      </div>
    );
  }

  // Status do certificado
  const getCertStatusBadge = () => {
    if (!certStatus) return null;
    if (certStatus.status === 'valido') {
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"><ShieldCheck size={12} /> Certificado Ativo</span>;
    } else if (certStatus.status === 'expirando_em_breve') {
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><ShieldAlert size={12} /> Expirando em {certStatus.dias_restantes}d</span>;
    } else if (certStatus.status === 'expirado') {
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5"><ShieldOff size={12} /> Certificado Vencido</span>;
    } else {
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1.5"><Shield size={12} /> Sem Certificado</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto bg-[#f8fafc] dark:bg-slate-950 min-h-screen">
      {/* 1. Header Escuro */}
      <div className="bg-slate-900 dark:bg-slate-900 text-white rounded-xl p-4 md:p-6 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <ArrowLeft size={20} />
              <span className="ml-2 text-xs font-medium uppercase tracking-wider hidden md:inline">Voltar</span>
            </button>
            <div className="h-10 w-[1px] bg-slate-700 hidden md:block mx-2" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                {empresa.razao_social}
                <span className="text-slate-500 text-sm font-normal hidden md:inline">• {empresa.cnpj}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${botStatus?.sincronizado ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${botStatus?.sincronizado ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {botStatus?.sincronizado ? 'Sincronizado' : 'Pendente'}
                </span>
                {botStatus?.ultima_nota?.created_at && (
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    Última: {formatarData(botStatus.ultima_nota.created_at)}
                  </span>
                )}
                {getCertStatusBadge()}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              onClick={() => setShowCertModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-xs font-semibold border border-white/10"
            >
              <Shield size={14} />
              Certificado
            </button>
            <button
              onClick={handleSearchNotas}
              disabled={sincronizando}
              className="flex items-center gap-2 px-4 py-2 bg-hc-purple hover:bg-hc-purple/90 text-white rounded-lg transition-all text-xs font-semibold border border-hc-purple disabled:opacity-60"
            >
              <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
              {sincronizando ? 'Buscando...' : 'Buscar Agora'}
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && <InlineAlert variant="error" message={erro} />}

      {/* 2. Gráfico + Resumo Acumulado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-hc-surface rounded-xl p-5 border border-hc-border" style={{ boxShadow: 'var(--hc-shadow)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-hc-text flex items-center gap-2">
              <TrendingUp size={16} className="text-hc-purple" />
              Histórico de Notas (Últimos 6 Meses)
            </h3>
            <div className="flex bg-hc-card border border-hc-border p-0.5 rounded-lg gap-0.5">
              <button
                onClick={() => setExibirGraficoPor('valor')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${exibirGraficoPor === 'valor' ? 'bg-hc-surface text-hc-purple border border-hc-border' : 'text-hc-muted hover:text-hc-text'}`}
                style={exibirGraficoPor === 'valor' ? { boxShadow: 'var(--hc-shadow-sm)' } : {}}
              >
                Valor (R$)
              </button>
              <button
                onClick={() => setExibirGraficoPor('quantidade')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${exibirGraficoPor === 'quantidade' ? 'bg-hc-surface text-hc-purple border border-hc-border' : 'text-hc-muted hover:text-hc-text'}`}
                style={exibirGraficoPor === 'quantidade' ? { boxShadow: 'var(--hc-shadow-sm)' } : {}}
              >
                Qtd.
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={estatisticas.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value) =>
                    exibirGraficoPor === 'valor' ? `R$ ${value / 1000}k` : `${value} un`
                  }
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) =>
                    exibirGraficoPor === 'valor'
                      ? formatCurrency(value)
                      : `${value} notas`
                  }
                />
                <Legend />
                <Bar
                  dataKey={exibirGraficoPor === 'valor' ? 'valor' : 'quantidade'}
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name={exibirGraficoPor === 'valor' ? 'Valor Total' : 'Quantidade'}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumo acumulado */}
        <div className="bg-hc-surface rounded-xl p-5 border border-hc-border flex flex-col justify-between" style={{ boxShadow: 'var(--hc-shadow)' }}>
          <div>
            <h3 className="text-[11px] font-semibold text-hc-muted uppercase tracking-wider mb-5 flex items-center gap-2">
              <FileText size={13} />
              Resumo Acumulado
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-hc-muted flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-hc-purple" /> Total de Notas
                  </span>
                  <span className="font-medium text-hc-text">{estatisticas.totalNotas}</span>
                </div>
                <div className="text-xl font-bold text-hc-purple">{formatCurrency(estatisticas.totalValor)}</div>
                <div className="w-full bg-hc-card h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-hc-purple h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-hc-muted flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" /> Sincronizadas
                  </span>
                  <span className="font-medium text-hc-text">{estatisticas.totalNotas}</span>
                </div>
                <div className="text-xl font-bold text-blue-400">{((estatisticas.totalNotas / Math.max(estatisticas.totalNotas, 1)) * 100).toFixed(0)}%</div>
                <div className="w-full bg-hc-card h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full"
                    style={{
                      width: `${(estatisticas.totalNotas / Math.max(estatisticas.totalNotas, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KPIs em Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Total de Notas',
            value: estatisticas.totalNotas.toString(),
            icon: FileText,
            color: 'text-hc-purple',
          },
          {
            label: 'Notas Este Mês',
            value: notas.filter((n) => {
              if (!n.data_emissao) return false;
              const d = new Date(n.data_emissao);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length.toString(),
            icon: Calendar,
            color: 'text-blue-500',
          },
          {
            label: 'Valor Total',
            value: formatCurrency(estatisticas.totalValor),
            icon: DollarSign,
            color: 'text-green-500',
          },
          {
            label: 'NF-e',
            value: estatisticas.notasNFe.toString(),
            icon: Hash,
            color: 'text-amber-500',
          },
          {
            label: 'Sincronizadas',
            value: ((estatisticas.totalNotas / Math.max(estatisticas.totalNotas, 1)) * 100).toFixed(0) + '%',
            icon: TrendingUp,
            color: 'text-emerald-500',
          },
          {
            label: 'Com Erro',
            value: '0',
            icon: AlertCircle,
            color: 'text-red-500',
          },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-hc-surface p-4 rounded-xl border border-hc-border" style={{ boxShadow: 'var(--hc-shadow-sm)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-hc-muted uppercase tracking-wider">{item.label}</span>
                <div className={`p-1.5 rounded-lg bg-hc-card ${item.color}`}>
                  <Icon size={13} />
                </div>
              </div>
              <div className="text-sm font-bold text-hc-text">{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* 4. Sincronização Automática */}
      <div className="bg-hc-surface border border-hc-border rounded-xl p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <h3 className="text-sm font-semibold text-hc-text mb-4">Sincronização Automática</h3>
        <SincronizacaoAutomatica empresaId={empresaId} onAfterSync={carregarNotas} />
      </div>

      {/* 5. Tabela de Notas */}
      <div className="bg-hc-surface rounded-xl border border-hc-border overflow-hidden" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <div className="p-4 md:p-5 border-b border-hc-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-hc-text">Notas Fiscais</h3>
            <div className="flex flex-wrap items-center gap-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar nota, CNPJ, emitente..."
                className="flex-1 md:w-56"
              />
              <button
                onClick={() => setFiltrosAbertos((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hc-muted hover:text-hc-accent hover:bg-hc-card rounded-lg transition-colors"
              >
                <Filter size={14} />
                Filtros
                <ChevronDown size={14} className={`transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
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
            <div className="p-4 border-t border-hc-border bg-hc-card/30 mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {notasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={40} className="text-hc-muted mb-3 opacity-40" />
              <p className="text-sm text-hc-muted">Nenhuma nota encontrada</p>
              <p className="text-xs text-hc-muted mt-1 opacity-60">
                Clique em "Buscar Agora" para sincronizar com a SEFAZ
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hc-border bg-hc-card/30">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Emissão</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Número/Série</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide hidden lg:table-cell">Emitente</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide hidden lg:table-cell">CNPJ Emitente</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Valor</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Situação</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hc-border">
                {notasFiltradas.slice(0, 200).map((nota) => {
                  const sit = SITUACAO_LABELS[nota.situacao ?? ''];
                  return (
                    <tr key={nota.id} className="hover:bg-hc-card/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-hc-text font-medium">
                        {nota.data_emissao ? formatarData(nota.data_emissao) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-hc-purple">
                          {TIPO_LABELS[nota.tipo_nf ?? ''] ?? nota.tipo_nf ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-hc-text">
                        {nota.numero_nf}/{nota.serie}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-muted hidden lg:table-cell max-w-[200px] truncate">
                        {nota.nome_emitente ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-muted font-mono hidden lg:table-cell">
                        {nota.cnpj_emitente ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-text text-right font-medium">
                        {nota.valor_total != null ? formatCurrency(nota.valor_total) : '-'}
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => nota.chave_acesso && handleDownloadXml(nota.chave_acesso)}
                            disabled={!nota.chave_acesso || downloadingXml === nota.chave_acesso}
                            className="p-1.5 rounded-lg hover:bg-hc-card text-hc-muted hover:text-hc-accent transition-colors disabled:opacity-40"
                            title="Baixar XML"
                          >
                            {downloadingXml === nota.chave_acesso ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {notasFiltradas.length > 200 && (
          <div className="px-4 py-3 border-t border-hc-border text-xs text-hc-muted text-center bg-hc-card/20">
            Exibindo 200 de {notasFiltradas.length} notas. Use os filtros para refinar.
          </div>
        )}
      </div>

      {/* Modal de Certificado */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-hc-surface rounded-xl border border-hc-border max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-hc-text">Certificado Digital</h2>
              <button
                onClick={() => setShowCertModal(false)}
                className="p-1 hover:bg-hc-card rounded-lg text-hc-muted transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Status atual */}
            {certStatus && (
              <div className="p-3 bg-hc-card rounded-lg border border-hc-border">
                <p className="text-xs text-hc-muted mb-1">Status atual</p>
                <p className="text-sm font-medium text-hc-text capitalize">{certStatus.status.replace(/_/g, ' ')}</p>
                {certStatus.dias_restantes !== null && certStatus.dias_restantes > 0 && (
                  <p className="text-xs text-hc-muted mt-1">
                    Expira em: {certStatus.dias_restantes} dias
                  </p>
                )}
                {certStatus.titular && (
                  <p className="text-xs text-hc-muted mt-1">
                    Titular: {certStatus.titular}
                  </p>
                )}
                {certStatus.alerta && (
                  <p className="text-xs text-amber-400 mt-2 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                    {certStatus.alerta}
                  </p>
                )}
              </div>
            )}

            {uploadResult && (
              <div
                className={`p-3 rounded-lg border ${
                  uploadResult.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                <p className="text-xs">{uploadResult.message}</p>
              </div>
            )}

            {/* Upload */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-hc-muted mb-2">Arquivo .pfx</label>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="w-full text-xs bg-hc-card border border-hc-border rounded-lg px-3 py-2 text-hc-text file:mr-2 file:text-xs file:font-medium file:bg-hc-surface file:border file:border-hc-border file:rounded file:px-2 file:py-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-hc-muted mb-2">Senha do Certificado</label>
                <input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full text-xs bg-hc-card border border-hc-border rounded-lg px-3 py-2 text-hc-text placeholder:text-hc-muted/50"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setShowCertModal(false)}
                className="flex-1 px-4 py-2 text-xs font-medium text-hc-muted hover:text-hc-text rounded-lg hover:bg-hc-card transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadCertificado}
                disabled={!certFile || !certPassword || uploadingCert}
                className="flex-1 px-4 py-2 text-xs font-medium bg-hc-purple text-white rounded-lg hover:bg-hc-purple/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                {uploadingCert ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
