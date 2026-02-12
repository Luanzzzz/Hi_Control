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
  Edit2
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
      const { buscarNotasDrive } = await import('../src/services/notaFiscalService');
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
      const resultado = await buscarNotasEmpresa(empresaId, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,
        max_notas: 100
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
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Empresa não encontrada</p>
        <button onClick={onBack} className="mt-4 text-primary-600 hover:underline flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Voltar para lista
        </button>
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
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-semibold border border-white/10"
          >
            <Shield size={16} />
            Configurar Certificado
          </button>
        </div>
      </div>

      {/* 2. Histórico de Movimentação (Inspirado na Imagem 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-500" />
              Histórico de Movimentação
            </h3>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-700 shadow-sm rounded-md text-primary-600">Valor (R$)</button>
              <button className="px-3 py-1 text-xs font-bold text-slate-500">Quantidade</button>
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

        {/* Resumo RBA (Lado do gráfico na Imagem 1) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <FileText size={16} />
              Total Acumulado 2026
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Prestados
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{estatisticas.qtdPrestados} notas</span>
                </div>
                <div className="text-2xl font-black text-blue-600">{formatCurrency(estatisticas.totalPrestados)}</div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${estatisticas.totalPrestados + estatisticas.totalTomados > 0
                        ? (estatisticas.totalPrestados / (estatisticas.totalPrestados + estatisticas.totalTomados) * 100)
                        : 0}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Tomados
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{estatisticas.qtdTomados} notas</span>
                </div>
                <div className="text-2xl font-black text-amber-600">{formatCurrency(estatisticas.totalTomados)}</div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
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
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500 uppercase">Diferença (P - T)</span>
            <span className="text-lg font-black text-emerald-500">{formatCurrency(estatisticas.totalPrestados - estatisticas.totalTomados)}</span>
          </div>
        </div>
      </div>

      {/* 3. Resumo do Período (Cards horizontais Imagem 1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
              <div className={`p-1.5 rounded-lg ${item.bg} dark:bg-slate-800 ${item.color}`}>
                <item.icon size={14} />
              </div>
            </div>
            <div className="text-sm md:text-base font-black text-slate-800 dark:text-white">{item.value}</div>
            <div className="text-[10px] text-slate-400 mt-1">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* 4. Tabela de Notas Fiscais (Inspirado na Imagem 2) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notas Fiscais</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar nota, CNPJ, emissor..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={handleSearchNotas}
                disabled={loadingNotas}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {loadingNotas ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                Sincronizar SEFAZ
              </button>
            </div>
          </div>

          {/* Filtros Estilo Imagem 2 */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo:</span>
              <select className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer">
                <option>Todos</option>
                <option>Prestados</option>
                <option>Tomados</option>
              </select>
            </div>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
              <select className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer">
                <option>Ativa</option>
                <option>Cancelada</option>
              </select>
            </div>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Retenção:</span>
              <select className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer">
                <option>Todas</option>
                <option>Com Retenção</option>
                <option>Sem Retenção</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 transition-all">
                <Download size={14} /> EXPORTAR
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Emissão</th>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Contraparte</th>
                <th className="px-6 py-4">Município</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingNotas ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary-500" size={32} /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhuma nota encontrada para o período.</td></tr>
              ) : (
                invoices.map((nota) => (
                  <tr key={nota.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${nota.tipo_nf === 'NFe' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                        {nota.tipo_nf === 'NFe' ? 'Prest.' : 'Tom.'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{nota.numero_nf}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{nota.nome_emitente}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{nota.cnpj_emitente}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Ribeirão das Neves</td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white">{formatCurrency(nota.valor_total)}</td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-2 py-0.5 rounded font-black uppercase">Ativa</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm border border-slate-200 dark:border-slate-600 text-slate-500"><Eye size={14} /></button>
                        <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm border border-slate-200 dark:border-slate-600 text-slate-500"><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Certificado (Inspirado na lógica anterior mas com design novo) */}
      {showCertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldCheck className="text-primary-500" />
                CERTIFICADO DIGITAL A1
              </h3>
              <button onClick={() => setShowCertModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {certStatus ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-4">
                  <div className="p-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20"><CheckCircle size={24} /></div>
                  <div>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Certificado Ativo</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Vence em {new Date(certStatus.validade!).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 flex items-center gap-4">
                  <div className="p-2 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/20"><ShieldAlert size={24} /></div>
                  <div>
                    <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Ação Necessária</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Nenhum certificado cadastrado.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivo (.pfx / .p12)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-primary-500 transition-colors bg-slate-50 dark:bg-slate-950">
                      <Upload size={24} className="text-slate-400 group-hover:text-primary-500" />
                      <span className="text-xs font-bold text-slate-500">{certFile ? certFile.name : 'Clique ou arraste o arquivo'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha do Certificado</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                  />
                </div>

                {uploadResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${uploadResult.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {uploadResult.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {uploadResult.message}
                  </div>
                )}

                <button
                  onClick={handleUploadCertificado}
                  disabled={!certFile || !certPassword || uploadingCert}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {uploadingCert ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Ativar Robô de Busca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
