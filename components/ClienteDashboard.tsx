import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  X,
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
import { UserPlan } from '../types';
import {
  baixarXmlNota,
  filtrarNotas,
  forceSyncEmpresa,
  getDashboardEmpresa,
  getNotaDetalhe,
  getSyncStatus,
  obterPortalOficialNota,
  obterPdfNota,
} from '../src/services/dashboardService';
import { certificadoService } from '../src/services/certificadoService';
import { useAuth } from '../contexts/AuthContext';
import { ExportNotasModal } from './ExportNotasModal';
import {
  createDefaultExportConfig,
  exportarNotasComConfiguracao,
} from '../src/services/notasExportService';
import type { ExportNotasConfig } from '../src/services/notasExportService';

interface ClienteDashboardProps {
  empresaId: string;
  onVoltar: () => void;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface NotaDetalhadaVisualizacao {
  id: string;
  numero_nf: string;
  serie: string;
  tipo_nf: string;
  tipo_operacao: string;
  data_emissao: string;
  valor_total: number;
  cnpj_emitente: string;
  nome_emitente: string;
  cnpj_destinatario: string;
  nome_destinatario: string;
  municipio_nome?: string;
  link_visualizacao?: string;
  xml_completo?: string;
  xml_resumo?: string;
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

/** Abreviações do backend (periodo no historico: "fev. 26") */
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const badgeConfig: Record<
  SyncStatus['status'],
  { color: string; text: string; icon: string; animate?: boolean }
> = {
  ok: { color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40', text: 'CAPTURA OK', icon: '●' },
  sincronizando: { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40', text: 'CAPTURANDO NOTAS...', icon: '⟳', animate: true },
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

const formatEta = (seconds: number | null | undefined): string | null => {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutos = Math.floor(seconds / 60);
  const restoSeg = seconds % 60;
  if (minutos < 60) return `${minutos}m ${restoSeg}s`;
  const horas = Math.floor(minutos / 60);
  const restoMin = minutos % 60;
  return `${horas}h ${restoMin}m`;
};

const urlTecnicaNaoFiscal = (url: string): boolean => {
  const valor = String(url || '').toLowerCase();
  if (!valor) return true;
  const bloqueios = [
    'sped.fazenda.gov.br/nfse',
    'nvlpubs.nist.gov',
    'w3.org',
    'etsi.org',
    'xmlsoap.org',
    'nist.gov',
    'csrc.nist.gov',
    'xmldsig',
    'xmlenc',
    'xades',
    'fips',
    'fips-197',
    'sha256',
    'rsa-sha',
  ];
  return bloqueios.some((b) => valor.includes(b));
};

const urlParecePortalFiscal = (url: string): boolean => {
  const valor = String(url || '').toLowerCase();
  if (!/^https?:\/\//i.test(valor)) return false;
  if (urlTecnicaNaoFiscal(valor)) return false;

  const sinais = [
    'nfse',
    'nfs-e',
    'danfse',
    'consulta',
    'visualiz',
    'imprimir',
    'download',
    'nota',
    'chave',
    'codigo',
    'verificacao',
    'dps',
    'prefeitura',
    'fazenda',
    'sefin',
    'sefaz',
    'tribut',
    'iss',
    'gov.br',
    '.pdf',
  ];
  return sinais.some((s) => valor.includes(s));
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

const getTipoBaseClass = (tipo: NotaFiscalDashboard['tipo_nf']): string => {
  if (tipo === 'NFe') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300';
  if (tipo === 'NFSe') return 'bg-green-100 text-green-700 dark:bg-green-900/35 dark:text-green-300';
  if (tipo === 'CTe') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/35 dark:text-yellow-300';
  return 'bg-purple-100 text-purple-700 dark:bg-purple-900/35 dark:text-purple-300';
};

const getOperacaoAccentClass = (operacao: NotaFiscalDashboard['tipo_operacao']): string =>
  operacao === 'saida'
    ? 'ring-1 ring-emerald-400/70 dark:ring-emerald-500/45'
    : 'ring-1 ring-amber-400/75 dark:ring-amber-500/50';

const getOperacaoPrefixClass = (operacao: NotaFiscalDashboard['tipo_operacao']): string =>
  operacao === 'saida'
    ? 'text-emerald-800 dark:text-emerald-200'
    : 'text-amber-800 dark:text-amber-200';

const getMesAnoFromDataEmissao = (value: string): { mes: number; ano: number } | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return { mes: parsed.getMonth() + 1, ano: parsed.getFullYear() };
};

export const ClienteDashboard: React.FC<ClienteDashboardProps> = ({ empresaId, onVoltar }) => {
  const { user } = useAuth();
  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(now.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(now.getFullYear());
  const [periodoFixadoManualmente, setPeriodoFixadoManualmente] = useState<boolean>(false);

  const [dashboard, setDashboard] = useState<DashboardEmpresa | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [notas, setNotas] = useState<NotaFiscalDashboard[]>([]);
  const [totalNotas, setTotalNotas] = useState<number>(0);

  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [loadingNotas, setLoadingNotas] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [chartMode, setChartMode] = useState<'valor' | 'quantidade'>('valor');
  const [viewMode, setViewMode] = useState<'focus' | 'general'>('general');

  const [buscaInput, setBuscaInput] = useState<string>('');
  const [filtros, setFiltros] = useState<FiltrosNotas>({
    tipo: 'Todos',
    status: 'Todos',
    retencao: 'Todas',
    busca: '',
    pagina: 1,
    dataInicio: '',
    dataFim: '',
  });

  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState<string>('');
  const [certLoading, setCertLoading] = useState<boolean>(false);
  const [acaoAbertaNotaId, setAcaoAbertaNotaId] = useState<string | null>(null);
  const [carregandoVisualizacaoNotaId, setCarregandoVisualizacaoNotaId] = useState<string | null>(null);
  const [visualizandoPdfNotaId, setVisualizandoPdfNotaId] = useState<string | null>(null);
  const [baixandoPdfNotaId, setBaixandoPdfNotaId] = useState<string | null>(null);
  const [baixandoXmlNotaId, setBaixandoXmlNotaId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [exportConfig, setExportConfig] = useState<ExportNotasConfig>(() =>
    createDefaultExportConfig(empresaId)
  );
  const [notaVisualizacao, setNotaVisualizacao] = useState<NotaDetalhadaVisualizacao | null>(null);

  const prevStatusRef = useRef<SyncStatus['status'] | null>(null);
  const pollingAttemptsRef = useRef<number>(0);

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
      prevStatusRef.current = data.sync.status;
      if (
        !periodoFixadoManualmente &&
        data.periodo_referencia_mes &&
        data.periodo_referencia_ano &&
        (
          data.periodo_referencia_mes !== mesSelecionado ||
          data.periodo_referencia_ano !== anoSelecionado
        )
      ) {
        setMesSelecionado(data.periodo_referencia_mes);
        setAnoSelecionado(data.periodo_referencia_ano);
      }
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao carregar dashboard.' });
    } finally {
      setLoadingDashboard(false);
    }
  }, [anoSelecionado, empresaId, mesSelecionado, periodoFixadoManualmente]);

  const carregarNotas = useCallback(async () => {
    setLoadingNotas(true);
    try {
      const response = await filtrarNotas(empresaId, filtros);
      setNotas(response.notas);
      setTotalNotas(response.total);
      return response;
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao carregar notas.' });
      return null;
    } finally {
      setLoadingNotas(false);
    }
  }, [empresaId, filtros]);

  const ajustarPeriodoPelaUltimaNota = useCallback((lista: NotaFiscalDashboard[]): boolean => {
    if (periodoFixadoManualmente) return false;
    if (!lista.length) return false;
    if (Number(filtros.pagina || 1) !== 1) return false;

    const referencia = getMesAnoFromDataEmissao(lista[0].data_emissao);
    if (!referencia) return false;

    if (referencia.mes === mesSelecionado && referencia.ano === anoSelecionado) {
      return false;
    }

    setMesSelecionado(referencia.mes);
    setAnoSelecionado(referencia.ano);
    return true;
  }, [anoSelecionado, filtros.pagina, mesSelecionado, periodoFixadoManualmente]);

  const verificarStatusSync = useCallback(async () => {
    try {
      const status = await getSyncStatus(empresaId);
      setSyncStatus(status);
      prevStatusRef.current = status.status;
      pollingAttemptsRef.current = 0;

      if (isSyncing && status.status === 'ok') {
        setToast({
          type: 'success',
          message: `${status.notas_capturadas_ultima_sync || 0} notas capturadas`,
        });
        setIsSyncing(false);
        setPeriodoFixadoManualmente(false);
        setBuscaInput('');
        const filtrosPosSync: FiltrosNotas = {
          tipo: 'Todos',
          status: 'Todos',
          retencao: 'Todas',
          busca: '',
          pagina: 1,
          dataInicio: '',
          dataFim: '',
        };
        setFiltros(filtrosPosSync);
        const notasPosSync = await filtrarNotas(empresaId, filtrosPosSync);
        setNotas(notasPosSync.notas);
        setTotalNotas(notasPosSync.total);
        ajustarPeriodoPelaUltimaNota(notasPosSync.notas);
        await carregarDashboard();
        return;
      }

      if (isSyncing && (status.status === 'erro' || status.status === 'sem_certificado')) {
        setToast({
          type: 'error',
          message: status.erro_mensagem || 'Erro durante sincronizacao',
        });
        setIsSyncing(false);
        await carregarDashboard();
        return;
      }

      if (isSyncing && status.status === 'pendente' && status.erro_mensagem) {
        setToast({
          type: 'error',
          message: status.erro_mensagem,
        });
        setIsSyncing(false);
        await carregarDashboard();
        return;
      }
    } catch {
      pollingAttemptsRef.current += 1;
      if (pollingAttemptsRef.current >= 3) {
        setSyncStatus((prev) =>
          prev
            ? { ...prev, status: 'erro', erro_mensagem: 'Falha ao consultar status da sincronizacao' }
            : null
        );
        setToast({ type: 'error', message: 'Falha ao consultar status da sincronizacao' });
        setIsSyncing(false);
      }
    }
  }, [ajustarPeriodoPelaUltimaNota, carregarDashboard, empresaId, isSyncing]);

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
    if (loadingNotas) return;
    if (!notas.length) return;
    ajustarPeriodoPelaUltimaNota(notas);
  }, [ajustarPeriodoPelaUltimaNota, loadingNotas, notas]);

  useEffect(() => {
    if (!isSyncing) {
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

  useEffect(() => {
    const fecharMenuAcoes = () => setAcaoAbertaNotaId(null);
    window.addEventListener('click', fecharMenuAcoes);
    return () => window.removeEventListener('click', fecharMenuAcoes);
  }, []);

  const handleForcarSync = async () => {
    if (!podeForcarSincronizacao) {
      setToast({
        type: 'error',
        message: 'Sincronizacao manual disponivel apenas para plano admin.',
      });
      return;
    }

    try {
      setIsSyncing(true);
      setPeriodoFixadoManualmente(false);
      pollingAttemptsRef.current = 0;
      setSyncStatus((prev) =>
        prev
          ? {
              ...prev,
              status: 'sincronizando',
              erro_mensagem: null,
              progresso_percentual: 1,
              etapa_atual: 'fila',
              mensagem_progresso: 'Sincronizacao enfileirada...',
              notas_processadas_parcial: 0,
              notas_estimadas_total: null,
              notas_restantes_estimadas: null,
              tempo_restante_estimado_segundos: null,
            }
          : {
              empresa_id: empresaId,
              status: 'sincronizando',
              ultima_sync: null,
              proximo_sync: null,
              total_notas_capturadas: 0,
              notas_capturadas_ultima_sync: 0,
              erro_mensagem: null,
              progresso_percentual: 1,
              etapa_atual: 'fila',
              mensagem_progresso: 'Sincronizacao enfileirada...',
              notas_processadas_parcial: 0,
              notas_estimadas_total: null,
              notas_restantes_estimadas: null,
              tempo_restante_estimado_segundos: null,
            }
      );
      prevStatusRef.current = 'sincronizando';
      await forceSyncEmpresa(empresaId);
      await verificarStatusSync();
    } catch (error: any) {
      setIsSyncing(false);
      setSyncStatus((prev) =>
        prev
          ? { ...prev, status: 'erro', erro_mensagem: error?.message || 'Falha ao agendar sincronizacao' }
          : null
      );
      setToast({ type: 'error', message: error?.message || 'Falha ao agendar sincronizacao' });
    }
  };

  const handleExportarCsv = () => {
    if (!notas.length) {
      setToast({ type: 'error', message: 'Nao ha notas para exportar.' });
      return;
    }
    setShowExportModal(true);
  };

  const handleConfirmExportacao = async (config: ExportNotasConfig) => {
    setExportLoading(true);
    try {
      const filtrosExportacao: FiltrosNotas = {
        ...filtros,
        pagina: 1,
      };

      let notasParaExportar: NotaFiscalDashboard[] = notas;

      if (config.scope === 'todas_filtradas') {
        const totalEsperado = Math.max(0, Number(totalNotas || 0));
        const totalPaginas = Math.max(1, Math.ceil(totalEsperado / PAGE_SIZE));
        const acumuladas: NotaFiscalDashboard[] = [];

        for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
          const resposta = await filtrarNotas(empresaId, {
            ...filtrosExportacao,
            pagina,
          });

          if (!resposta.notas.length) {
            break;
          }

          acumuladas.push(...resposta.notas);
          if (acumuladas.length >= Number(resposta.total || totalEsperado)) {
            break;
          }
        }

        notasParaExportar = acumuladas;
      }

      const resultado = exportarNotasComConfiguracao({
        notas: notasParaExportar,
        config,
        empresa: dashboard?.empresa || null,
        resumo: dashboard?.resumo || null,
        filtros,
        periodo: { mes: mesSelecionado, ano: anoSelecionado },
        totalNotasFiltradas: totalNotas,
      });

      setExportConfig(config);
      setShowExportModal(false);
      setToast({
        type: 'success',
        message: `${resultado.exported} notas exportadas (${resultado.filename}).`,
      });
    } catch (error: any) {
      setToast({
        type: 'error',
        message: error?.message || 'Falha ao exportar notas.',
      });
    } finally {
      setExportLoading(false);
    }
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

  const obterNomeContraparte = (nota: NotaFiscalDashboard): string => {
    if (nota.tipo_operacao === 'saida') {
      return nota.nome_destinatario || nota.nome_emitente || '';
    }
    return nota.nome_emitente || nota.nome_destinatario || '';
  };

  const obterCnpjContraparte = (nota: NotaFiscalDashboard): string => {
    if (nota.tipo_operacao === 'saida') {
      return nota.cnpj_destinatario || nota.cnpj_emitente || '';
    }
    return nota.cnpj_emitente || nota.cnpj_destinatario || '';
  };

  const copiarTexto = async (texto: string, mensagemSucesso: string) => {
    if (!texto) {
      setToast({ type: 'error', message: 'Nao ha valor para copiar' });
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      setToast({ type: 'success', message: mensagemSucesso });
    } catch {
      setToast({ type: 'error', message: 'Falha ao copiar para a area de transferencia' });
    }
  };

  const aplicarBuscaContraparte = (nota: NotaFiscalDashboard) => {
    const nome = obterNomeContraparte(nota);
    if (!nome) {
      setToast({ type: 'error', message: 'Contraparte sem nome para filtrar' });
      return;
    }
    setBuscaInput(nome);
    setFiltros((prev) => ({ ...prev, busca: nome, pagina: 1 }));
  };

  const handleVisualizarNota = async (nota: NotaFiscalDashboard) => {
    setCarregandoVisualizacaoNotaId(nota.id);
    try {
      const detalhe = await getNotaDetalhe(empresaId, nota.id);
      if (!detalhe) {
        setToast({ type: 'error', message: 'Detalhes da nota indisponiveis' });
        return;
      }
      setNotaVisualizacao(detalhe as NotaDetalhadaVisualizacao);
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao visualizar nota' });
    } finally {
      setCarregandoVisualizacaoNotaId(null);
      setAcaoAbertaNotaId(null);
    }
  };

  const handleBaixarXmlNota = async (nota: NotaFiscalDashboard) => {
    setBaixandoXmlNotaId(nota.id);
    try {
      const blob = await baixarXmlNota(empresaId, nota.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const identificador = nota.chave_acesso || nota.numero_nf || nota.id;
      link.href = url;
      link.download = `${nota.tipo_nf}_${identificador}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'XML baixado com sucesso' });
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || 'Falha ao baixar XML da nota' });
    } finally {
      setBaixandoXmlNotaId(null);
      setAcaoAbertaNotaId(null);
    }
  };

  const abrirPortalOficialDaNota = async (nota: NotaFiscalDashboard): Promise<boolean> => {
    try {
      let linkOficial = '';

      try {
        linkOficial = await obterPortalOficialNota(empresaId, nota.id);
      } catch {
        // fallback local abaixo
      }

      if (!linkOficial && nota.tipo_nf !== 'NFSe') {
        linkOficial = String(nota.link_visualizacao || '').trim();
      }

      if (!linkOficial && nota.tipo_nf !== 'NFSe') {
        const detalhe = await getNotaDetalhe(empresaId, nota.id);
        linkOficial = String(detalhe?.link_visualizacao || '').trim();
      }

      if (!linkOficial) return false;

      if (!/^https?:\/\//i.test(linkOficial)) {
        linkOficial = `https://${linkOficial.replace(/^\/+/, '')}`;
      }

      if (!urlParecePortalFiscal(linkOficial)) {
        setToast({
          type: 'error',
          message: 'Link oficial da nota indisponivel ou invalido para consulta fiscal.',
        });
        return false;
      }

      const aba = window.open(linkOficial, '_blank', 'noopener,noreferrer');
      if (!aba) {
        setToast({
          type: 'error',
          message: 'Bloqueador de pop-up ativo. Permita pop-ups para abrir o portal oficial.',
        });
      } else {
        setToast({
          type: 'success',
          message: 'Portal oficial da nota aberto.',
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleVisualizarPdfNota = async (nota: NotaFiscalDashboard) => {
    setVisualizandoPdfNotaId(nota.id);
    try {
      const blob = await obterPdfNota(empresaId, nota.id, false);
      const url = URL.createObjectURL(blob);
      const novaAba = window.open(url, '_blank', 'noopener,noreferrer');

      if (!novaAba) {
        const link = document.createElement('a');
        const identificador = nota.chave_acesso || nota.numero_nf || nota.id;
        link.href = url;
        link.download = `${nota.tipo_nf}_${identificador}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      const abriuPortal = await abrirPortalOficialDaNota(nota);
      if (abriuPortal) {
        return;
      }

      if (nota.tipo_nf === 'NFSe') {
        setToast({
          type: 'error',
          message: 'PDF oficial da NFS-e indisponivel para esta nota.',
        });
        return;
      }

      // Contingencia opcional: gera auxiliar apenas quando oficial nao puder ser obtido
      // sem alterar o fluxo da busca/sincronizacao de notas.
      try {
        const blobAux = await obterPdfNota(empresaId, nota.id, false, true);
        const urlAux = URL.createObjectURL(blobAux);
        const abaAux = window.open(urlAux, '_blank', 'noopener,noreferrer');
        if (!abaAux) {
          const link = document.createElement('a');
          const identificador = nota.chave_acesso || nota.numero_nf || nota.id;
          link.href = urlAux;
          link.download = `${nota.tipo_nf}_${identificador}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        window.setTimeout(() => URL.revokeObjectURL(urlAux), 60_000);
        setToast({
          type: 'success',
          message: 'PDF auxiliar aberto (oficial indisponivel no momento).',
        });
        return;
      } catch {
        setToast({
          type: 'error',
          message: 'PDF oficial nao encontrado para esta nota.',
        });
      }
    } finally {
      setVisualizandoPdfNotaId(null);
      setAcaoAbertaNotaId(null);
    }
  };

  const handleBaixarPdfNota = async (nota: NotaFiscalDashboard) => {
    setBaixandoPdfNotaId(nota.id);
    try {
      const blob = await obterPdfNota(empresaId, nota.id, true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const identificador = nota.chave_acesso || nota.numero_nf || nota.id;
      link.href = url;
      link.download = `${nota.tipo_nf}_${identificador}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'PDF baixado com sucesso' });
    } catch (error: any) {
      const abriuPortal = await abrirPortalOficialDaNota(nota);
      if (abriuPortal) {
        return;
      }

      if (nota.tipo_nf === 'NFSe') {
        setToast({
          type: 'error',
          message: 'PDF oficial da NFS-e indisponivel para esta nota.',
        });
        return;
      }

      try {
        const blobAux = await obterPdfNota(empresaId, nota.id, true, true);
        const urlAux = URL.createObjectURL(blobAux);
        const linkAux = document.createElement('a');
        const identificador = nota.chave_acesso || nota.numero_nf || nota.id;
        linkAux.href = urlAux;
        linkAux.download = `${nota.tipo_nf}_${identificador}.pdf`;
        document.body.appendChild(linkAux);
        linkAux.click();
        document.body.removeChild(linkAux);
        URL.revokeObjectURL(urlAux);
        setToast({
          type: 'success',
          message: 'PDF auxiliar baixado (oficial indisponivel no momento).',
        });
        return;
      } catch {
        setToast({
          type: 'error',
          message: 'PDF oficial nao encontrado para esta nota.',
        });
      }
    } finally {
      setBaixandoPdfNotaId(null);
      setAcaoAbertaNotaId(null);
    }
  };

  const resumo = dashboard?.resumo;
  const paginaAtual = Number(filtros.pagina || 1);
  const inicio = totalNotas === 0 ? 0 : (paginaAtual - 1) * PAGE_SIZE + 1;
  const fim = Math.min(paginaAtual * PAGE_SIZE, totalNotas);
  const podeAvancar = fim < totalNotas;

  const chartData = useMemo(() => {
    return (dashboard?.historico || []).map((item) => {
      const quantidadePrestados = Math.max(0, Number(item.prestados_quantidade || 0));
      const quantidadeTomados = Math.max(0, Number(item.tomados_quantidade || 0));
      return {
        periodo: item.periodo,
        prestados_valor: Number(item.prestados || 0),
        tomados_valor: Number(item.tomados || 0),
        prestados_quantidade: quantidadePrestados,
        tomados_quantidade: quantidadeTomados,
      };
    });
  }, [dashboard?.historico]);

  const periodLabelForMesAno = useMemo(
    () => `${MESES_ABREV[mesSelecionado - 1]}. ${String(anoSelecionado).slice(-2)}`,
    [mesSelecionado, anoSelecionado]
  );

  const chartDataFiltered = useMemo(() => {
    if (viewMode === 'focus') {
      return chartData.filter((item) => item.periodo === periodLabelForMesAno);
    }
    return chartData;
  }, [chartData, viewMode, periodLabelForMesAno]);

  const resumoAnual = useMemo(() => {
    if (viewMode !== 'general' || chartData.length === 0) return null;
    return {
      prestados_valor: chartData.reduce((a, i) => a + i.prestados_valor, 0),
      tomados_valor: chartData.reduce((a, i) => a + i.tomados_valor, 0),
      prestados_quantidade: chartData.reduce((a, i) => a + i.prestados_quantidade, 0),
      tomados_quantidade: chartData.reduce((a, i) => a + i.tomados_quantidade, 0),
    };
  }, [viewMode, chartData]);

  const statusAtual = syncStatus?.status || 'pendente';
  const statusBadge = badgeConfig[statusAtual];
  const usuarioEhAdmin = user?.plano === UserPlan.ADMIN;
  const podeForcarSincronizacao = Boolean(syncStatus?.pode_forcar_sincronizacao ?? usuarioEhAdmin);
  const syncInProgress = isSyncing || statusAtual === 'sincronizando';
  const progressoPercentualBruto = Number(syncStatus?.progresso_percentual ?? (syncInProgress ? 2 : statusAtual === 'ok' ? 100 : 0));
  const progressoPercentual = Math.max(0, Math.min(100, Number.isFinite(progressoPercentualBruto) ? progressoPercentualBruto : 0));
  const notasProcessadasParcial = Number(syncStatus?.notas_processadas_parcial ?? 0);
  const notasEstimadasTotal =
    syncStatus?.notas_estimadas_total === null || syncStatus?.notas_estimadas_total === undefined
      ? null
      : Number(syncStatus.notas_estimadas_total);
  const notasRestantesEstimadas =
    syncStatus?.notas_restantes_estimadas === null || syncStatus?.notas_restantes_estimadas === undefined
      ? (notasEstimadasTotal !== null ? Math.max(0, notasEstimadasTotal - notasProcessadasParcial) : null)
      : Number(syncStatus.notas_restantes_estimadas);
  const etaCaptura = formatEta(
    syncStatus?.tempo_restante_estimado_segundos === null || syncStatus?.tempo_restante_estimado_segundos === undefined
      ? null
      : Number(syncStatus.tempo_restante_estimado_segundos)
  );
  const mensagemProgresso = syncStatus?.mensagem_progresso || (syncInProgress ? 'Capturando notas...' : null);
  const etapaAtual = syncStatus?.etapa_atual || null;
  const displayPrestadosValor = viewMode === 'focus' ? Number(resumo?.prestados_valor || 0) : (resumoAnual?.prestados_valor ?? 0);
  const displayTomadosValor = viewMode === 'focus' ? Number(resumo?.tomados_valor || 0) : (resumoAnual?.tomados_valor ?? 0);
  const displayPrestadosQtd = viewMode === 'focus' ? Number(resumo?.prestados_quantidade || 0) : (resumoAnual?.prestados_quantidade ?? 0);
  const displayTomadosQtd = viewMode === 'focus' ? Number(resumo?.tomados_quantidade || 0) : (resumoAnual?.tomados_quantidade ?? 0);
  const diferenca = displayPrestadosValor - displayTomadosValor;
  const variacao = viewMode === 'focus' ? resumo?.variacao_mes_anterior_percent : null;
  const totalAcumulado = displayPrestadosValor + displayTomadosValor;
  const prestadosPct = totalAcumulado > 0 ? (displayPrestadosValor / totalAcumulado) * 100 : 0;
  const tomadosPct = totalAcumulado > 0 ? (displayTomadosValor / totalAcumulado) * 100 : 0;

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
              {syncStatus?.prioridade_recente_ativa && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <Loader2 size={11} className="animate-spin" />
                  MODO PRIORIDADE RECENTE ATIVO
                </span>
              )}
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

            {syncInProgress && (
              <div className="mt-2 max-w-2xl space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-500"
                    style={{ width: `${progressoPercentual}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{progressoPercentual.toFixed(1)}%</span>
                  {etapaAtual && <span>Etapa: {etapaAtual.replace(/_/g, ' ')}</span>}
                  {notasEstimadasTotal !== null ? (
                    <span>
                      {notasProcessadasParcial}/{notasEstimadasTotal} notas
                    </span>
                  ) : (
                    <span>{notasProcessadasParcial} notas processadas</span>
                  )}
                  {notasRestantesEstimadas !== null && <span>Restantes: {notasRestantesEstimadas}</span>}
                  {etaCaptura && <span>Tempo estimado: {etaCaptura}</span>}
                </div>
                {mensagemProgresso && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{mensagemProgresso}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCertModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Shield size={16} />
              Configurar Certificado
            </button>
            {podeForcarSincronizacao ? (
              <button
                onClick={handleForcarSync}
                disabled={syncInProgress}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncInProgress ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {syncInProgress ? 'Capturando notas...' : 'Sincronizar SEFAZ'}
              </button>
            ) : (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Sincronizacao manual apenas no plano admin
              </span>
            )}
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
                  onClick={() => setViewMode('focus')}
                  className={`rounded px-3 py-1 text-xs font-semibold ${viewMode === 'focus' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  Foco (mês)
                </button>
                <button
                  onClick={() => setViewMode('general')}
                  className={`rounded px-3 py-1 text-xs font-semibold ${viewMode === 'general' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  Geral (ano)
                </button>
              </div>
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
                onChange={(event) => {
                  setPeriodoFixadoManualmente(true);
                  setMesSelecionado(Number(event.target.value));
                }}
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
                onChange={(event) => {
                  setPeriodoFixadoManualmente(true);
                  setAnoSelecionado(Number(event.target.value));
                }}
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
              <BarChart data={chartDataFiltered}>
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
                <span className="text-slate-500 dark:text-slate-400">{displayPrestadosQtd} notas</span>
              </div>
              <p className="text-lg font-black text-blue-600">{formatCurrency(displayPrestadosValor)}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${prestadosPct}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Tomados</span>
                <span className="text-slate-500 dark:text-slate-400">{displayTomadosQtd} notas</span>
              </div>
              <p className="text-lg font-black text-amber-600">{formatCurrency(displayTomadosValor)}</p>
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
              {podeForcarSincronizacao && (
                <button
                  onClick={handleForcarSync}
                  disabled={syncInProgress}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {syncInProgress ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {syncInProgress ? 'Capturando notas...' : 'Sincronizar SEFAZ'}
                </button>
              )}
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
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              DE:
              <input
                type="date"
                value={filtros.dataInicio || ''}
                onChange={(event) =>
                  setFiltros((prev) => ({ ...prev, dataInicio: event.target.value, pagina: 1 }))
                }
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="font-semibold text-slate-500 dark:text-slate-400">
              ATE:
              <input
                type="date"
                value={filtros.dataFim || ''}
                onChange={(event) =>
                  setFiltros((prev) => ({ ...prev, dataFim: event.target.value, pagina: 1 }))
                }
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            {(filtros.dataInicio || filtros.dataFim) && (
              <button
                onClick={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    dataInicio: '',
                    dataFim: '',
                    pagina: 1,
                  }))
                }
                className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Limpar datas
              </button>
            )}
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
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${getTipoBaseClass(
                          nota.tipo_nf
                        )} ${getOperacaoAccentClass(nota.tipo_operacao)}`}
                      >
                        <span className={`${getOperacaoPrefixClass(nota.tipo_operacao)}`}>
                          {nota.tipo_operacao === 'saida' ? 'PREST.' : 'TOM.'}
                        </span>
                        <span>{nota.tipo_nf}</span>
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
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-300">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAcaoAbertaNotaId((prev) => (prev === nota.id ? null : nota.id));
                          }}
                          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Acoes da nota"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {acaoAbertaNotaId === nota.id && (
                          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await handleVisualizarNota(nota);
                              }}
                              disabled={carregandoVisualizacaoNotaId === nota.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {carregandoVisualizacaoNotaId === nota.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Eye size={13} />
                              )}
                              Visualizar nota
                            </button>
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await handleVisualizarPdfNota(nota);
                              }}
                              disabled={visualizandoPdfNotaId === nota.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {visualizandoPdfNotaId === nota.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Eye size={13} />
                              )}
                              Visualizar PDF
                            </button>
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await handleBaixarPdfNota(nota);
                              }}
                              disabled={baixandoPdfNotaId === nota.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {baixandoPdfNotaId === nota.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Download size={13} />
                              )}
                              Baixar PDF
                            </button>
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await handleBaixarXmlNota(nota);
                              }}
                              disabled={baixandoXmlNotaId === nota.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {baixandoXmlNotaId === nota.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Download size={13} />
                              )}
                              Baixar XML
                            </button>
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await copiarTexto(nota.chave_acesso || '', 'Chave de acesso copiada');
                                setAcaoAbertaNotaId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Copy size={13} />
                              Copiar chave de acesso
                            </button>
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await copiarTexto(obterCnpjContraparte(nota), 'CNPJ da contraparte copiado');
                                setAcaoAbertaNotaId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Copy size={13} />
                              Copiar CNPJ da contraparte
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                aplicarBuscaContraparte(nota);
                                setAcaoAbertaNotaId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Search size={13} />
                              Buscar mesma contraparte
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
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
              {podeForcarSincronizacao
                ? 'Clique em Sincronizar SEFAZ para buscar automaticamente'
                : 'A sincronizacao automatica deve ser configurada em Gestao de Clientes'}
            </p>
            {podeForcarSincronizacao && (
              <button
                onClick={handleForcarSync}
                disabled={syncInProgress}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {syncInProgress ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {syncInProgress ? 'Capturando notas...' : 'Sincronizar agora'}
              </button>
            )}
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

      <ExportNotasModal
        isOpen={showExportModal}
        loading={exportLoading}
        totalNotas={totalNotas}
        config={exportConfig}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExportacao}
      />

      {notaVisualizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Visualizacao da Nota {notaVisualizacao.numero_nf || '-'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {notaVisualizacao.tipo_nf} | Serie {notaVisualizacao.serie || '-'} | Emissao {formatDate(notaVisualizacao.data_emissao)}
                </p>
              </div>
              <button
                onClick={() => setNotaVisualizacao(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Emitente</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{notaVisualizacao.nome_emitente || '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{notaVisualizacao.cnpj_emitente || '-'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Destinatario</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{notaVisualizacao.nome_destinatario || '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{notaVisualizacao.cnpj_destinatario || '-'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor total</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(Number(notaVisualizacao.valor_total || 0))}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Municipio</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{notaVisualizacao.municipio_nome || '-'}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {notaVisualizacao.link_visualizacao && (
                <a
                  href={notaVisualizacao.link_visualizacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ExternalLink size={13} />
                  Abrir visualizacao oficial
                </a>
              )}
              <button
                onClick={() => setNotaVisualizacao(null)}
                className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-primary-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
