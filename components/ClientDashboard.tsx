import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  Shield,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Upload,
  Bot,
  Hash,
  Download,
  Eye,
  Filter,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Clock,
  Edit2,
  Zap
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
  Cell,
  AreaChart as ReAreaChart,
  Area
} from 'recharts';
import { empresaService, Empresa } from '../services/empresaService';
import { certificadoService, CertificadoStatus } from '../src/services/certificadoService';
import { botService, StatusEmpresa } from '../src/services/botService';
import { buscarNotasEmpresa, baixarXmlNota, downloadBlob } from '../src/services/notaFiscalService';
import { downloadDANFCE, downloadDACTE, downloadPDF } from '../src/services/fiscalService';
import type { NotaFiscal, TipoNotaFiscal } from '../src/types/notaFiscal';
import { CORES_TIPO_NF } from '../src/types/notaFiscal';
import { fileToBase64 } from '../utils/fileUtils';
import { Button, SearchBar, InlineAlert, LoadingState, EmptyState } from '../src/components/ui';
import { SincronizacaoAutomatica } from '../src/components/SincronizacaoAutomatica';

// Helper component
const CalculatorIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M16 10h.01" />
    <path d="M12 10h.01" />
    <path d="M8 10h.01" />
    <path d="M12 14h.01" />
    <path d="M8 14h.01" />
    <path d="M12 18h.01" />
    <path d="M8 18h.01" />
  </svg>
);

interface ClientDashboardProps {
  empresaId: string;
  onBack: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ empresaId, onBack }) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  // Estados da Aba Notas
  const [invoices, setInvoices] = useState<NotaFiscal[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [botStatus, setBotStatus] = useState<StatusEmpresa | null>(null);
  const [errorNotas, setErrorNotas] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TipoNotaFiscal | 'TODAS'>('TODAS');
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);

  // Estados da Aba Config/Certificado
  const [certStatus, setCertStatus] = useState<CertificadoStatus | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Calcula estatísticas das notas fiscais (SEM MOCKS)
  const estatisticas = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        chartData: [],
        totalPrestados: 0,
        totalTomados: 0,
        qtdPrestados: 0,
        qtdTomados: 0,
        issRetido: 0,
        federaisRetidos: 0,
        totalRetido: 0,
        foraCompetencia: 0,
      };
    }

    // Agrupa notas por mês
    const notasPorMes: Record<string, { prestados: number; tomados: number }> = {};
    let totalPrestados = 0;
    let totalTomados = 0;
    let qtdPrestados = 0;
    let qtdTomados = 0;
    let issRetido = 0;
    let federaisRetidos = 0;

    invoices.forEach((nota) => {
      const valor = parseFloat(String(nota.valor_total || 0));
      const mesAno = nota.data_emissao
        ? new Date(nota.data_emissao).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        : 'Sem data';

      // Inicializa mês se não existir
      if (!notasPorMes[mesAno]) {
        notasPorMes[mesAno] = { prestados: 0, tomados: 0 };
      }

      // Classifica como prestado ou tomado (baseado no tipo ou emissor)
      // Simplificação: NFS-e prestadas, outros tomados
      const ehPrestado = nota.tipo_nf === 'NFSe';

      if (ehPrestado) {
        notasPorMes[mesAno].prestados += valor;
        totalPrestados += valor;
        qtdPrestados++;
      } else {
        notasPorMes[mesAno].tomados += valor;
        totalTomados += valor;
        qtdTomados++;
      }

      // Calcula impostos retidos (se existir no objeto)
      if ((nota as any).iss_retido) issRetido += parseFloat(String((nota as any).iss_retido));
      if ((nota as any).pis_retido) federaisRetidos += parseFloat(String((nota as any).pis_retido));
      if ((nota as any).cofins_retido) federaisRetidos += parseFloat(String((nota as any).cofins_retido));
    });

    const chartData = Object.entries(notasPorMes)
      .map(([name, values]) => ({
        name,
        prestados: Math.round(values.prestados),
        tomados: Math.round(values.tomados),
      }))
      .slice(-6); // Últimos 6 meses

    return {
      chartData,
      totalPrestados,
      totalTomados,
      qtdPrestados,
      qtdTomados,
      issRetido,
      federaisRetidos,
      totalRetido: issRetido + federaisRetidos,
      foraCompetencia: 0, // TODO: calcular baseado em competência
    };
  }, [invoices]);

  const carregarDadosEmpresa = useCallback(async () => {
    setLoadingEmpresa(true);
    try {
      const data = await empresaService.obterPorId(empresaId);
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    } finally {
      setLoadingEmpresa(false);
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

  const carregarNotasDrive = useCallback(async () => {
    setLoadingNotas(true);
    setErrorNotas(null);
    try {
      // Importa o serviço de notas drive
      const { buscarNotasDrive } = await import('../src/services/driveService');
      const notas = await buscarNotasDrive(empresaId);
      // Converte NotaDrive para NotaFiscal
      const notasConvertidas: NotaFiscal[] = (notas || []).map((nota) => ({
        id: nota.drive_file_id,
        empresa_id: empresaId,
        numero_nf: nota.numero || '',
        serie: nota.serie || '',
        tipo_nf: (nota.tipo as TipoNotaFiscal) || 'NFe',
        data_emissao: nota.data_emissao || new Date().toISOString(),
        valor_total: nota.valor_total || 0,
        cnpj_emitente: nota.cnpj_emitente || '',
        nome_emitente: nota.nome_emitente || '',
        cnpj_destinatario: nota.cnpj_destinatario || '',
        nome_destinatario: nota.nome_destinatario || '',
        situacao: (nota.situacao as any) || 'autorizada',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setInvoices(notasConvertidas);
    } catch (err: any) {
      console.error('Erro ao carregar notas do Drive:', err);
      setErrorNotas(err.message || 'Erro ao carregar notas fiscais');
    } finally {
      setLoadingNotas(false);
    }
  }, [empresaId]);

  useEffect(() => {
    carregarDadosEmpresa();
    carregarBotStatus();
    carregarCertStatus();
    carregarNotasDrive(); // Carrega notas do Drive automaticamente
  }, [carregarDadosEmpresa, carregarBotStatus, carregarCertStatus, carregarNotasDrive]);

  const handleSearchNotas = async () => {
    if (!empresa?.cnpj) return;
    setLoadingNotas(true);
    setErrorNotas(null);
    try {
      const cnpjLimpo = empresa.cnpj.replace(/\D/g, '');
      // Dynamic import buscarTodasNotasEmpresa para buscar TODAS as notas sem limite
      const { buscarTodasNotasEmpresa } = await import('../src/services/notaFiscalService');
      const resultado = await buscarTodasNotasEmpresa(empresaId, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,
      });
      setInvoices(resultado.notas || []);
      carregarBotStatus();
    } catch (err: any) {
      setErrorNotas(err.message || 'Erro ao buscar notas fiscais');
    } finally {
      setLoadingNotas(false);
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

  const formatCurrency = (value: any) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  if (loadingEmpresa) {
    return <LoadingState size="lg" message="Carregando empresa..." className="min-h-[400px]" />;
  }

  if (!empresa) {
    return (
      <div className="p-6">
        <EmptyState
          title="Empresa não encontrada"
          description="Verifique se a empresa ainda existe no sistema."
          action={
            <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
              Voltar para lista
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto bg-[#f8fafc] dark:bg-slate-950 min-h-screen">

      {/* 1. Header Contextual (Inspirado na Imagem 1) */}
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
                <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${botStatus?.sincronizado ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${botStatus?.sincronizado ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {botStatus?.sincronizado ? 'Captura OK' : 'Captura Pendente'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Última Sinc: {botStatus?.ultima_nota ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---'}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">Ativa</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCertModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-xs font-semibold border border-white/10"
          >
            <Shield size={15} />
            Certificado
          </button>
        </div>
      </div>

      {/* 2. Histórico de Movimentação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-hc-surface rounded-xl p-5 border border-hc-border" style={{ boxShadow: 'var(--hc-shadow)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-hc-text flex items-center gap-2">
              <TrendingUp size={16} className="text-hc-purple" />
              Histórico de Movimentação
            </h3>
            <div className="flex bg-hc-card border border-hc-border p-0.5 rounded-lg gap-0.5">
              <button className="px-3 py-1 text-xs font-medium bg-hc-surface rounded-md text-hc-purple border border-hc-border" style={{ boxShadow: 'var(--hc-shadow-sm)' }}>Valor (R$)</button>
              <button className="px-3 py-1 text-xs font-medium text-hc-muted hover:text-hc-text transition-colors">Qtd.</button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={estatisticas.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="prestados" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="Prestados" />
                <Bar dataKey="tomados" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} name="Tomados" />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumo acumulado */}
        <div className="bg-hc-surface rounded-xl p-5 border border-hc-border flex flex-col justify-between" style={{ boxShadow: 'var(--hc-shadow)' }}>
          <div>
            <h3 className="text-[11px] font-semibold text-hc-muted uppercase tracking-wider mb-5 flex items-center gap-2">
              <FileText size={13} />
              Total Acumulado 2026
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-hc-muted flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-hc-info" /> Prestados
                  </span>
                  <span className="font-medium text-hc-text">{estatisticas.qtdPrestados} notas</span>
                </div>
                <div className="text-xl font-bold text-hc-info">{formatCurrency(estatisticas.totalPrestados)}</div>
                <div className="w-full bg-hc-card h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-hc-info h-full rounded-full"
                    style={{
                      width: `${estatisticas.totalPrestados + estatisticas.totalTomados > 0
                        ? (estatisticas.totalPrestados / (estatisticas.totalPrestados + estatisticas.totalTomados) * 100)
                        : 0}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-hc-muted flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-hc-amber" /> Tomados
                  </span>
                  <span className="font-medium text-hc-text">{estatisticas.qtdTomados} notas</span>
                </div>
                <div className="text-xl font-bold text-hc-amber">{formatCurrency(estatisticas.totalTomados)}</div>
                <div className="w-full bg-hc-card h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-hc-amber h-full rounded-full"
                    style={{
                      width: `${estatisticas.totalPrestados + estatisticas.totalTomados > 0
                        ? (estatisticas.totalTomados / (estatisticas.totalPrestados + estatisticas.totalTomados) * 100)
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-hc-border flex justify-between items-center">
            <span className="text-xs font-medium text-hc-muted uppercase tracking-wide">Diferença</span>
            <span className="text-base font-bold text-hc-success">{formatCurrency(estatisticas.totalPrestados - estatisticas.totalTomados)}</span>
          </div>
        </div>
      </div>

      {/* 3. Resumo do Período */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Prestados',
            value: formatCurrency(estatisticas.totalPrestados),
            sub: `${estatisticas.qtdPrestados} notas`,
            icon: ArrowUpRight,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
          },
          {
            label: 'Tomados',
            value: formatCurrency(estatisticas.totalTomados),
            sub: `${estatisticas.qtdTomados} notas`,
            icon: ArrowDownLeft,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
          },
          {
            label: 'ISS Retido',
            value: formatCurrency(estatisticas.issRetido),
            sub: '0 notas',
            icon: DollarSign,
            color: estatisticas.issRetido > 0 ? 'text-red-500' : 'text-slate-400',
            bg: estatisticas.issRetido > 0 ? 'bg-red-50' : 'bg-slate-50'
          },
          {
            label: 'Federais Retidos',
            value: formatCurrency(estatisticas.federaisRetidos),
            sub: '0 notas',
            icon: Shield,
            color: estatisticas.federaisRetidos > 0 ? 'text-red-500' : 'text-slate-400',
            bg: estatisticas.federaisRetidos > 0 ? 'bg-red-50' : 'bg-slate-50'
          },
          {
            label: 'Total Retido',
            value: formatCurrency(estatisticas.totalRetido),
            sub: '0 notas',
            icon: CalculatorIcon,
            color: estatisticas.totalRetido > 0 ? 'text-red-500' : 'text-slate-400',
            bg: estatisticas.totalRetido > 0 ? 'bg-red-50' : 'bg-slate-50'
          },
          {
            label: 'Fora Competência',
            value: formatCurrency(estatisticas.foraCompetencia),
            sub: '0 notas',
            icon: Clock,
            color: 'text-slate-400',
            bg: 'bg-slate-50'
          },
        ].map((item, i) => (
          <div key={i} className="bg-hc-surface p-4 rounded-xl border border-hc-border" style={{ boxShadow: 'var(--hc-shadow-sm)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-hc-muted uppercase tracking-wider">{item.label}</span>
              <div className={`p-1.5 rounded-lg bg-hc-card ${item.color}`}>
                <item.icon size={13} />
              </div>
            </div>
            <div className="text-sm font-bold text-hc-text">{item.value}</div>
            <div className="text-[10px] text-hc-muted mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* 4. Tabela de Notas Fiscais */}
      <div className="bg-hc-surface rounded-xl border border-hc-border overflow-hidden" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <div className="p-4 md:p-5 border-b border-hc-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-hc-text">Notas Fiscais</h3>
            <div className="flex flex-wrap items-center gap-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar nota, CNPJ, emissor..."
                className="flex-1 md:w-56"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSearchNotas}
                disabled={loadingNotas}
                loading={loadingNotas}
                leftIcon={<RefreshCw size={13} />}
              >
                Sincronizar SEFAZ
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {[
              { label: 'Tipo', options: ['Todos', 'Prestados', 'Tomados'] },
              { label: 'Status', options: ['Ativa', 'Cancelada'] },
              { label: 'Retenção', options: ['Todas', 'Com Retenção', 'Sem Retenção'] },
            ].map((filter, i, arr) => (
              <React.Fragment key={filter.label}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-hc-muted uppercase tracking-wide">{filter.label}:</span>
                  <select className="bg-transparent text-xs font-medium text-hc-text outline-none cursor-pointer border-none">
                    {filter.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {i < arr.length - 1 && <div className="h-3.5 w-px bg-hc-border" />}
              </React.Fragment>
            ))}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" leftIcon={<Download size={12} />} className="text-[11px]">
                Exportar
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-hc-card/60 text-hc-muted font-semibold uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3">Emissão</th>
                <th className="px-5 py-3">Competência</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Contraparte</th>
                <th className="px-5 py-3">Município</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hc-border">
              {loadingNotas ? (
                <tr>
                  <td colSpan={9}>
                    <LoadingState size="md" message="Buscando notas fiscais..." className="py-10" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title="Nenhuma nota encontrada"
                      description="Sincronize com o SEFAZ ou verifique os filtros aplicados."
                    />
                  </td>
                </tr>
              ) : (
                invoices.map((nota) => (
                  <tr key={nota.id} className="hover:bg-hc-hover transition-colors group">
                    <td className="px-5 py-3.5 text-hc-muted">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3.5 text-hc-muted">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${nota.tipo_nf === 'NFe' ? 'bg-hc-info/15 text-hc-info' : 'bg-hc-amber/15 text-hc-amber'}`}>
                        {nota.tipo_nf === 'NFe' ? 'Prest.' : 'Tom.'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-hc-text">{nota.numero_nf}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-hc-text truncate max-w-[180px]">{nota.nome_emitente}</div>
                      <div className="text-[10px] text-hc-muted font-mono mt-0.5">{nota.cnpj_emitente}</div>
                    </td>
                    <td className="px-5 py-3.5 text-hc-muted">—</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-hc-text">{formatCurrency(nota.valor_total)}</td>
                    <td className="px-5 py-3.5">
                      <span className="bg-hc-success/15 text-hc-success text-[9px] px-2 py-0.5 rounded font-bold uppercase">Ativa</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-hc-card rounded border border-hc-border text-hc-muted hover:text-hc-text transition-colors" aria-label="Visualizar">
                          <Eye size={13} />
                        </button>
                        <button className="p-1.5 hover:bg-hc-card rounded border border-hc-border text-hc-muted hover:text-hc-text transition-colors" aria-label="Download">
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Certificado */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-hc-surface rounded-xl w-full max-w-2xl overflow-hidden border border-hc-border" style={{ boxShadow: 'var(--hc-shadow-md)' }}>
            <div className="px-5 py-4 border-b border-hc-border flex justify-between items-center bg-hc-card/40">
              <h3 className="text-sm font-semibold text-hc-text flex items-center gap-2">
                <ShieldCheck size={16} className="text-hc-purple" />
                Certificado Digital A1
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCertModal(false)} className="p-1.5 h-auto">
                <XCircle size={16} />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-x divide-hc-border">
              <div className="p-5 space-y-4">
                {certStatus ? (
                  <div className="flex items-center gap-3 p-3 bg-hc-success/10 border border-hc-success/25 rounded-lg">
                    <div className="p-1.5 bg-hc-success text-white rounded-full shrink-0"><CheckCircle size={16} /></div>
                    <div>
                      <p className="text-xs font-semibold text-hc-success uppercase tracking-wide">Certificado Ativo</p>
                      <p className="text-xs text-hc-text mt-0.5">Vence em {new Date(certStatus.validade!).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-hc-amber/10 border border-hc-amber/25 rounded-lg">
                    <div className="p-1.5 bg-hc-amber text-white rounded-full shrink-0"><ShieldAlert size={16} /></div>
                    <div>
                      <p className="text-xs font-semibold text-hc-amber uppercase tracking-wide">Ação Necessária</p>
                      <p className="text-xs text-hc-text mt-0.5">Nenhum certificado cadastrado.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-hc-muted uppercase tracking-widest block mb-2">
                    Arquivo (.pfx / .p12)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full p-4 border-2 border-dashed border-hc-border rounded-lg flex flex-col items-center justify-center gap-2 group-hover:border-hc-purple transition-colors bg-hc-card/30">
                      <Upload size={20} className="text-hc-muted group-hover:text-hc-purple transition-colors" />
                      <span className="text-xs text-hc-muted">{certFile ? certFile.name : 'Clique ou arraste o arquivo'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-hc-muted uppercase tracking-widest block mb-2">
                    Senha do Certificado
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 h-9 rounded-lg border border-hc-border bg-hc-surface text-hc-text text-sm focus:border-hc-purple outline-none transition-colors"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                  />
                </div>

                {uploadResult && (
                  <InlineAlert
                    variant={uploadResult.type === 'success' ? 'success' : 'error'}
                    message={uploadResult.message}
                    onDismiss={() => setUploadResult(null)}
                  />
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleUploadCertificado}
                  disabled={!certFile || !certPassword}
                  loading={uploadingCert}
                  className="w-full justify-center"
                >
                  Ativar Robô de Busca
                </Button>
                </div>
              </div>

              {/* Coluna Direita: Sincronização Automática */}
              <div className="p-5">
                <h4 className="text-sm font-semibold text-hc-text mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-hc-success" />
                  Sincronização Automática
                </h4>
                <SincronizacaoAutomatica
                  empresaId={empresaId}
                  onAfterSync={async () => {
                    carregarBotStatus();
                    carregarNotasDrive();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
