import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  DashboardEmpresa,
  FiltrosNotas,
  NotaFiscalDashboard,
  SyncStatus,
} from '../types';
import {
  filtrarNotas,
  forceSyncEmpresa,
  getDashboardEmpresa,
  getSyncStatus,
} from '../src/services/dashboardService';
import { certificadoService } from '../src/services/certificadoService';

interface ClienteDashboardProps {
  empresaId: string;
  onVoltar: () => void;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

const PAGE_SIZE = 20;
const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Marco' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const badgeConfig: Record<
  SyncStatus['status'],
  { color: string; text: string; icon: string; animate?: boolean }
> = {
  ok: { color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40', text: 'CAPTURA OK', icon: '●' },
  sincronizando: { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40', text: 'SINCRONIZANDO...', icon: '⟳', animate: true },
  erro: { color: 'text-red-600 bg-red-100 dark:bg-red-900/40', text: 'ERRO NA CAPTURA', icon: '⚠' },
  sem_certificado: { color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/40', text: 'SEM CERTIFICADO', icon: '⚠' },
  pendente: { color: 'text-slate-600 bg-slate-100 dark:bg-slate-800', text: 'AGUARDANDO...', icon: '○' },
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const formatDate = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const formatTime = (value: string | null): string => {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });

const normalizeSituacao = (situacao: NotaFiscalDashboard['situacao']): string => {
  if (situacao === 'autorizada') return 'ATIVA';
  if (situacao === 'cancelada') return 'CANCELADA';
  if (situacao === 'denegada') return 'DENEGADA';
  return 'PROCESSANDO';
};

export const ClienteDashboard: React.FC<ClienteDashboardProps> = ({ empresaId, onVoltar }) => {
  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(now.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(now.getFullYear());

  const [dashboard, setDashboard] = useState<DashboardEmpresa | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [notas, setNotas] = useState<NotaFiscalDashboard[]>([]);
  const [totalNotas, setTotalNotas] = useState<number>(0);

  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [loadingNotas, setLoadingNotas] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [chartMode, setChartMode] = useState<'valor' | 'quantidade'>('valor');

  const [buscaInput, setBuscaInput] = useState<string>('');
  const [filtros, setFiltros] = useState<FiltrosNotas>({
    tipo: 'Todos',
    status: 'Todos',
    retencao: 'Todas',
    busca: '',
    pagina: 1,
  });

  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState<string>('');
  const [certLoading, setCertLoading] = useState<boolean>(false);

  const prevStatusRef = useRef<SyncStatus['status'] | null>(null);

  const anosDisponiveis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - index);
  }, []);

  const carregarDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const data = await getDashboardEmpresa(empresaId, mesSelecionado, anoSelecionado);
      setDashboard(data);
      setSyncStatus(data.sync);
      setNotas(data.notas);
      setTotalNotas(data.total_notas || 0);
      prevStatusRef.current = data.sync.status;
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao carregar dashboard.' });
    } finally {
      setLoadingDashboard(false);
    }
  }, [anoSelecionado, empresaId, mesSelecionado]);

  const carregarNotas = useCallback(async () => {
    setLoadingNotas(true);
    try {
      const response = await filtrarNotas(empresaId, filtros);
      setNotas(response.notas);
      setTotalNotas(response.total);
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao carregar notas.' });
    } finally {
      setLoadingNotas(false);
    }
  }, [empresaId, filtros]);

  const verificarStatusSync = useCallback(async () => {
    try {
      const status = await getSyncStatus(empresaId);
      const anterior = prevStatusRef.current;
      setSyncStatus(status);
      prevStatusRef.current = status.status;

      if (anterior === 'sincronizando' && status.status === 'ok') {
        setToast({
          type: 'success',
          message: `${status.notas_capturadas_ultima_sync || 0} notas capturadas`,
        });
        setIsSyncing(false);
        await carregarDashboard();
        await carregarNotas();
      }

      if (anterior === 'sincronizando' && (status.status === 'erro' || status.status === 'sem_certificado')) {
        setToast({
          type: 'error',
          message: status.erro_mensagem || 'Erro durante sincronizacao',
        });
        setIsSyncing(false);
      }
    } catch {
      setIsSyncing(false);
    }
  }, [carregarDashboard, carregarNotas, empresaId]);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFiltros((prev) => ({ ...prev, busca: buscaInput, pagina: 1 }));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [buscaInput]);

  useEffect(() => {
    carregarNotas();
  }, [carregarNotas]);

  useEffect(() => {
    if (syncStatus?.status !== 'sincronizando' && !isSyncing) {
      return;
    }

    const intervalId = window.setInterval(() => {
      verificarStatusSync();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isSyncing, syncStatus?.status, verificarStatusSync]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleForcarSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus((prev) =>
        prev
          ? { ...prev, status: 'sincronizando', erro_mensagem: null }
          : {
              empresa_id: empresaId,
              status: 'sincronizando',
              ultima_sync: null,
              proximo_sync: null,
              total_notas_capturadas: 0,
              notas_capturadas_ultima_sync: 0,
              erro_mensagem: null,
            }
      );
      prevStatusRef.current = 'sincronizando';
      await forceSyncEmpresa(empresaId);
    } catch (error: any) {
      setIsSyncing(false);
      setToast({ type: 'error', message: error?.message || 'Falha ao agendar sincronizacao' });
    }
  };

  const handleExportarCsv = () => {
    if (!notas.length) return;

    const linhas = [
      ['emissao', 'competencia', 'tipo', 'numero', 'contraparte', 'municipio', 'valor', 'status'].join(','),
      ...notas.map((nota) =>
        [
          formatDate(nota.data_emissao),
          formatDate(nota.data_emissao),
          `${nota.tipo_operacao === 'saida' ? 'PREST.' : 'TOM.'} ${nota.tipo_nf}`,
          nota.numero_nf,
          `"${nota.nome_emitente || nota.nome_destinatario || ''}"`,
          `"${nota.municipio_nome || ''}"`,
          String(nota.valor_total || 0).replace('.', ','),
          normalizeSituacao(nota.situacao),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notas-${empresaId}-${mesSelecionado}-${anoSelecionado}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSalvarCertificado = async () => {
    if (!certFile || !certSenha) return;

    setCertLoading(true);
    try {
      const base64 = await fileToBase64(certFile);
      await certificadoService.upload(empresaId, base64, certSenha);
      setToast({ type: 'success', message: 'Certificado configurado com sucesso' });
      setShowCertModal(false);
      setCertFile(null);
      setCertSenha('');
      await carregarDashboard();
      await verificarStatusSync();
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao configurar certificado' });
    } finally {
      setCertLoading(false);
    }
  };

  const resumo = dashboard?.resumo;
  const paginaAtual = Number(filtros.pagina || 1);
  const inicio = totalNotas === 0 ? 0 : (paginaAtual - 1) * PAGE_SIZE + 1;
  const fim = Math.min(paginaAtual * PAGE_SIZE, totalNotas);
  const podeAvancar = fim < totalNotas;

  const chartData = useMemo(() => {
    return (dashboard?.historico || []).map((item) => {
      const quantidadePrestados = Math.max(0, Math.round((item as any).prestados_quantidade ?? item.prestados / 1000));
      const quantidadeTomados = Math.max(0, Math.round((item as any).tomados_quantidade ?? item.tomados / 1000));
      return {
        periodo: item.periodo,
        prestados_valor: Number(item.prestados || 0),
        tomados_valor: Number(item.tomados || 0),
        prestados_quantidade: quantidadePrestados,
        tomados_quantidade: quantidadeTomados,
      };
    });
  }, [dashboard?.historico]);

  const statusAtual = syncStatus?.status || 'pendente';
  const statusBadge = badgeConfig[statusAtual];
  const diferenca = Number(resumo?.diferenca || 0);
  const variacao = resumo?.variacao_mes_anterior_percent;
  const totalAcumulado = Number(resumo?.prestados_valor || 0) + Number(resumo?.tomados_valor || 0);
  const prestadosPct = totalAcumulado > 0 ? (Number(resumo?.prestados_valor || 0) / totalAcumulado) * 100 : 0;
  const tomadosPct = totalAcumulado > 0 ? (Number(resumo?.tomados_valor || 0) / totalAcumulado) * 100 : 0;

  if (!empresaId) {
    return (
      <div className="p-6">
        <button onClick={onVoltar} className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
          <ArrowLeft size={16} /> Voltar
        </button>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Selecione uma empresa para visualizar o dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <button
              onClick={onVoltar}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {dashboard?.empresa.razao_social || 'Carregando empresa...'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{dashboard?.empresa.cnpj || '-'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge.color}`}>
                <span className={statusBadge.animate ? 'animate-spin' : ''}>{statusBadge.icon}</span>
                {statusBadge.text}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Ultima sinc: {formatTime(syncStatus?.ultima_sync || null)}</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                  dashboard?.empresa.ativa
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {dashboard?.empresa.ativa ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCertModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Shield size={16} />
              Configurar Certificado
            </button>
            <button
              onClick={handleForcarSync}
              disabled={isSyncing || statusAtual === 'sincronizando'}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing || statusAtual === 'sincronizando' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isSyncing || statusAtual === 'sincronizando' ? 'Sincronizando...' : 'Sincronizar SEFAZ'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {loadingDashboard
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mb-2 h-6 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))
          : [
              {
                title: 'PRESTADOS',
                value: formatCurrency(Number(resumo?.prestados_valor || 0)),
                subtitle: `${Number(resumo?.prestados_quantidade || 0)} notas`,
                icon: ArrowUpRight,
                color: 'text-emerald-600',
              },
              {
                title: 'TOMADOS',
                value: formatCurrency(Number(resumo?.tomados_valor || 0)),
                subtitle: `${Number(resumo?.tomados_quantidade || 0)} notas`,
                icon: ArrowDownLeft,
                color: 'text-amber-600',
              },
              {
                title: 'ISS RETIDO',
                value: formatCurrency(Number(resumo?.iss_retido || 0)),
                subtitle: '0 notas',
                icon: Shield,
                color: 'text-slate-700 dark:text-slate-300',
              },
              {
                title: 'FEDERAIS RETIDOS',
                value: formatCurrency(Number(resumo?.federais_retidos || 0)),
                subtitle: '0 notas',
                icon: ShieldCheck,
                color: 'text-slate-700 dark:text-slate-300',
              },
              {
                title: 'TOTAL RETIDO',
                value: formatCurrency(Number(resumo?.total_retido || 0)),
                subtitle: '0 notas',
                icon: Wallet,
                color: 'text-slate-700 dark:text-slate-300',
              },
              {
                title: 'FORA COMPETENCIA',
                value: formatCurrency(Number(resumo?.fora_competencia || 0)),
                subtitle: '0 notas',
                icon: CalendarDays,
                color: 'text-slate-700 dark:text-slate-300',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.title}</span>
                  <card.icon size={16} className={card.color} />
                </div>
                <p className={`text-lg font-black ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.subtitle}</p>
              </div>
            ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Historico de Movimentacao</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                <button
                  onClick={() => setChartMode('valor')}
                  className={`rounded px-3 py-1 text-xs font-semibold ${chartMode === 'valor' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  Valor (R$)
                </button>
                <button
                  onClick={() => setChartMode('quantidade')}
                  className={`rounded px-3 py-1 text-xs font-semibold ${chartMode === 'quantidade' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  Quantidade
                </button>
              </div>
              <select
                value={mesSelecionado}
                onChange={(event) => setMesSelecionado(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {MESES.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
              <select
                value={anoSelecionado}
                onChange={(event) => setAnoSelecionado(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any, name: string) => [chartMode === 'valor' ? formatCurrency(Number(value)) : `${value}`, name]}
                  labelFormatter={(label) => `Periodo: ${label}`}
                />
                <Bar dataKey={chartMode === 'valor' ? 'prestados_valor' : 'prestados_quantidade'} fill="#2563eb" name="Prestados" radius={[4, 4, 0, 0]} />
                <Bar dataKey={chartMode === 'valor' ? 'tomados_valor' : 'tomados_quantidade'} fill="#f59e0b" name="Tomados" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">TOTAL ACUMULADO {anoSelecionado}</h2>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Prestados</span>
                <span className="text-slate-500 dark:text-slate-400">{Number(resumo?.prestados_quantidade || 0)} notas</span>
              </div>
              <p className="text-lg font-black text-blue-600">{formatCurrency(Number(resumo?.prestados_valor || 0))}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${prestadosPct}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Tomados</span>
                <span className="text-slate-500 dark:text-slate-400">{Number(resumo?.tomados_quantidade || 0)} notas</span>
              </div>
              <p className="text-lg font-black text-amber-600">{formatCurrency(Number(resumo?.tomados_valor || 0))}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: `${tomadosPct}%` }} />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">DIFERENCA (P - T)</p>
              <p className={`text-xl font-black ${diferenca >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(diferenca)}
              </p>
              {variacao !== null && variacao !== undefined && (
                <p className={`mt-1 text-xs font-semibold ${variacao >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {variacao >= 0 ? '↑' : '↓'} {Math.abs(variacao).toFixed(2)}% vs mes anterior
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Notas Fiscais ({totalNotas} notas)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  value={buscaInput}
                  onChange={(event) => setBuscaInput(event.target.value)}
                  placeholder="Buscar nota, CNPJ, emissor..."
                  className="w-72 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <button
                onClick={handleForcarSync}
                disabled={isSyncing || statusAtual === 'sincronizando'}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isSyncing || statusAtual === 'sincronizando' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Sincronizar SEFAZ
              </button>
              <button
                onClick={handleExportarCsv}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download size={14} />
                Exportar
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              TIPO:
              <select
                value={filtros.tipo}
                onChange={(event) => setFiltros((prev) => ({ ...prev, tipo: event.target.value, pagina: 1 }))}
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <option>Todos</option>
                <option>NFe</option>
                <option>NFSe</option>
                <option>NFCe</option>
                <option>CTe</option>
              </select>
            </label>
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              STATUS:
              <select
                value={filtros.status}
                onChange={(event) => setFiltros((prev) => ({ ...prev, status: event.target.value, pagina: 1 }))}
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <option>Todos</option>
                <option>Ativa</option>
                <option>Cancelada</option>
                <option>Denegada</option>
              </select>
            </label>
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              RETENCAO:
              <select
                value={filtros.retencao}
                onChange={(event) => setFiltros((prev) => ({ ...prev, retencao: event.target.value, pagina: 1 }))}
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <option>Todas</option>
                <option>Com retencao</option>
                <option>Sem retencao</option>
              </select>
            </label>
          </div>
        </div>

        {syncStatus?.status === 'sem_certificado' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <span className="inline-flex items-center gap-2 font-medium">
              <AlertTriangle size={16} />
              Certificado nao configurado - Configure para captura automatica
            </span>
            <button
              onClick={() => setShowCertModal(true)}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
            >
              Configurar agora
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-bold uppercase">Emissao</th>
                <th className="px-4 py-3 font-bold uppercase">Competencia</th>
                <th className="px-4 py-3 font-bold uppercase">Tipo</th>
                <th className="px-4 py-3 font-bold uppercase">Numero</th>
                <th className="px-4 py-3 font-bold uppercase">Contraparte</th>
                <th className="px-4 py-3 font-bold uppercase">Municipio</th>
                <th className="px-4 py-3 font-bold uppercase text-right">Valor</th>
                <th className="px-4 py-3 font-bold uppercase">Status</th>
                <th className="px-4 py-3 font-bold uppercase text-center">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loadingNotas &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, col) => (
                      <td key={col} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loadingNotas &&
                notas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(nota.data_emissao)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(nota.data_emissao)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-bold ${
                          nota.tipo_nf === 'NFe'
                            ? 'bg-blue-100 text-blue-700'
                            : nota.tipo_nf === 'NFSe'
                            ? 'bg-green-100 text-green-700'
                            : nota.tipo_nf === 'CTe'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {nota.tipo_operacao === 'saida' ? 'PREST.' : 'TOM.'} {nota.tipo_nf}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{nota.numero_nf}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-[220px] truncate font-medium text-slate-700 dark:text-slate-200">
                        {nota.tipo_operacao === 'saida' ? nota.nome_destinatario || nota.nome_emitente : nota.nome_emitente || nota.nome_destinatario}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {nota.tipo_operacao === 'saida' ? nota.cnpj_destinatario || nota.cnpj_emitente : nota.cnpj_emitente || nota.cnpj_destinatario}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{nota.municipio_nome || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(nota.valor_total)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          nota.situacao === 'autorizada'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : nota.situacao === 'cancelada'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : nota.situacao === 'denegada'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {normalizeSituacao(nota.situacao)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-300">⋮</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loadingNotas && notas.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <FileText size={48} className="text-slate-400" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Nenhuma nota encontrada</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Clique em Sincronizar SEFAZ para buscar automaticamente
            </p>
            <button
              onClick={handleForcarSync}
              disabled={isSyncing || statusAtual === 'sincronizando'}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Sincronizar agora
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">
            Mostrando {inicio}-{fim} de {totalNotas} notas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltros((prev) => ({ ...prev, pagina: Math.max(1, Number(prev.pagina || 1) - 1) }))}
              disabled={paginaAtual <= 1}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <button
              onClick={() => setFiltros((prev) => ({ ...prev, pagina: Number(prev.pagina || 1) + 1 }))}
              disabled={!podeAvancar}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Proximo
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configurar Certificado A1</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Envie o arquivo `.pfx` ou `.p12` para habilitar a captura automatica.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={(event) => setCertFile(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="password"
                placeholder="Senha do certificado"
                value={certSenha}
                onChange={(event) => setCertSenha(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCertModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarCertificado}
                disabled={!certFile || !certSenha || certLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {certLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
