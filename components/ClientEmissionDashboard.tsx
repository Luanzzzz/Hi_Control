/**
 * ClientEmissionDashboard — Dashboard de Emissão de Notas por Empresa
 *
 * Exibe todas as informações do módulo emissor para uma empresa específica:
 * status do certificado A1, KPIs de emissão, gráfico de histórico,
 * tabela de notas emitidas e botões de emissão rápida para cada tipo de documento fiscal.
 *
 * Domínio: EMISSÃO (emissor_notas)
 * Responsabilidade: dados originados de autorizações SEFAZ, cancelamentos, inutilizações.
 * NÃO exibe dados de busca/importação (campo fonte = "banco_local" ou "cache").
 *
 * @component
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  Upload,
  FileEdit,
  ShoppingCart,
  Truck,
  Briefcase,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  BarChart2,
  AlertTriangle,
  Download,
  Eye,
  type LucideIcon,
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
import { empresaService, Empresa } from '../services/empresaService';
import { certificadoService, CertificadoStatus } from '../src/services/certificadoService';
import {
  buscarTodasNotasEmpresa,
  BuscarNotasEmpresaResponse,
  baixarXmlNota,
  downloadBlob,
  formatarMoeda,
  formatarData,
} from '../src/services/notaFiscalService';
import { downloadDANFCE } from '../src/services/fiscalService';
import { ViewState } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface ClientEmissionDashboardProps {
  empresaId: string;
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

interface NotaFiscalEmissao {
  id: string;
  numero_nf: string;
  serie: string;
  tipo_nf?: string;
  situacao?: string;
  data_emissao?: string;
  valor_total?: number;
  nome_destinatario?: string;
  cnpj_destinatario?: string;
  chave_acesso?: string;
}

interface ChartDataPoint {
  name: string;
  'NF-e'?: number;
  'NFC-e'?: number;
  'CT-e'?: number;
  'NFS-e'?: number;
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
  'NF-e': 'NF-e',
  'NFC-e': 'NFC-e',
  'CT-e': 'CT-e',
  'NFS-e': 'NFS-e',
};

const SITUACAO_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  autorizada: { label: 'Autorizada', color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  denegada: { label: 'Denegada', color: 'text-orange-400 bg-orange-500/10', icon: AlertTriangle },
  inutilizada: { label: 'Inutilizada', color: 'text-hc-muted bg-hc-card', icon: FileText },
};

/**
 * Card de status do Certificado A1
 * Exibe valididade, titular, e botão de renovação/upload
 */
function CertificadoCard({
  certStatus,
  onUpload,
}: {
  certStatus: CertificadoStatus | null;
  onUpload: () => void;
}) {
  if (!certStatus) {
    return (
      <div className="bg-hc-surface border border-hc-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-hc-muted" />
          <p className="text-sm font-medium text-hc-text">Certificado A1</p>
        </div>
        <p className="text-xs text-hc-muted">Não foi possível verificar o certificado.</p>
        <button
          onClick={onUpload}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-hc-purple text-white rounded-lg text-xs font-medium hover:bg-hc-purple/90 transition-colors"
        >
          <Upload size={14} />
          Fazer Upload
        </button>
      </div>
    );
  }

  const isValido = certStatus.status === 'valido';
  const isExpirando = certStatus.status === 'expirando_em_breve';
  const isExpirado = certStatus.status === 'expirado';
  const isAusente = certStatus.status === 'ausente';

  const iconConfig = isValido
    ? { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' }
    : isExpirando
    ? { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' }
    : { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };

  const Icon = iconConfig.icon;

  return (
    <div className={`border rounded-xl p-5 ${iconConfig.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-hc-surface flex items-center justify-center shrink-0`}>
            <Icon size={22} className={iconConfig.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-hc-text">Certificado A1</p>
            <p className={`text-xs font-medium mt-0.5 ${iconConfig.color}`}>
              {isValido
                ? `Válido · ${certStatus.dias_restantes} dias restantes`
                : isExpirando
                ? `Expirando em ${certStatus.dias_restantes} dias`
                : isExpirado
                ? 'Expirado'
                : 'Ausente'}
            </p>
          </div>
        </div>
        <button
          onClick={onUpload}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-hc-surface border border-hc-border text-xs font-medium text-hc-muted hover:text-hc-accent rounded-lg transition-colors"
        >
          <Upload size={13} />
          {isAusente ? 'Fazer Upload' : 'Renovar'}
        </button>
      </div>
      {certStatus.titular && (
        <p className="text-xs text-hc-muted mt-3 pl-[52px]">Titular: {certStatus.titular}</p>
      )}
      {certStatus.validade && (
        <p className="text-xs text-hc-muted mt-0.5 pl-[52px]">
          Validade: {formatarData(certStatus.validade)}
        </p>
      )}
      {(isExpirado || isAusente) && (
        <div className="mt-3 p-2 bg-hc-surface rounded-lg border border-hc-border">
          <p className="text-[11px] text-hc-muted leading-relaxed">
            Sem certificado válido não é possível emitir notas fiscais. Faça o upload do certificado A1 para habilitar a emissão.
          </p>
        </div>
      )}
    </div>
  );
}

export const ClientEmissionDashboard: React.FC<ClientEmissionDashboardProps> = ({
  empresaId,
  onBack,
  onNavigate,
}) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [certStatus, setCertStatus] = useState<CertificadoStatus | null>(null);
  const [notas, setNotas] = useState<NotaFiscalEmissao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [showCertUpload, setShowCertUpload] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState('');
  const [uploadando, setUploadando] = useState(false);
  const [uploadErro, setUploadErro] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string | 'TODAS'>('TODAS');
  const [selectedSituacao, setSelectedSituacao] = useState<string | 'TODAS'>('TODAS');
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);

  /**
   * Carrega dados da empresa, certificado e notas emitidas
   */
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [empresaData, certData, notasData] = await Promise.allSettled([
        empresaService.obterPorId(empresaId),
        certificadoService.obterStatus(empresaId),
        buscarTodasNotasEmpresa(empresaId, { cnpj: '', nsu_inicial: 0 }),
      ]);

      if (empresaData.status === 'fulfilled') {
        setEmpresa(empresaData.value);
      }
      if (certData.status === 'fulfilled') {
        setCertStatus(certData.value);
      }
      if (notasData.status === 'fulfilled') {
        const response = notasData.value as BuscarNotasEmpresaResponse;
        setNotas((response.notas || []) as NotaFiscalEmissao[]);
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dados da empresa');
      console.error('Erro ao carregar dados de emissão:', err);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  /**
   * Calcula estatísticas e gráfico de emissões
   */
  const { chartData, totalEmitidas, autorizadas, canceladas, denegadas, emitadasMes, valorTotal } =
    useMemo(() => {
      if (!notas || notas.length === 0) {
        return {
          chartData: [],
          totalEmitidas: 0,
          autorizadas: 0,
          canceladas: 0,
          denegadas: 0,
          emitadasMes: 0,
          valorTotal: 0,
        };
      }

      // Agrupa notas por mês e tipo
      const notasPorMesETipo: Record<string, Record<string, number>> = {};
      let totalEmitidas = 0;
      let autorizadas = 0;
      let canceladas = 0;
      let denegadas = 0;
      let valorTotal = 0;

      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      let emitadasMes = 0;

      notas.forEach((nota) => {
        totalEmitidas++;
        valorTotal += nota.valor_total || 0;

        if (nota.situacao === 'autorizada') autorizadas++;
        if (nota.situacao === 'cancelada') canceladas++;
        if (nota.situacao === 'denegada') denegadas++;

        // Agrupa por mês
        const dataEmissao = new Date(nota.data_emissao || new Date());
        if (dataEmissao.getMonth() === mesAtual && dataEmissao.getFullYear() === anoAtual) {
          emitadasMes++;
        }

        const mesAno = dataEmissao.toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        });

        if (!notasPorMesETipo[mesAno]) {
          notasPorMesETipo[mesAno] = {};
        }

        const tipoLabel = TIPO_LABELS[nota.tipo_nf || ''] || nota.tipo_nf || 'Outro';
        notasPorMesETipo[mesAno][tipoLabel] = (notasPorMesETipo[mesAno][tipoLabel] || 0) + 1;
      });

      // Monta dados do gráfico (últimos 6 meses)
      const chartData: ChartDataPoint[] = Object.entries(notasPorMesETipo)
        .map(([name, tipos]) => ({
          name,
          ...tipos,
        }))
        .slice(-6);

      return {
        chartData,
        totalEmitidas,
        autorizadas,
        canceladas,
        denegadas,
        emitadasMes,
        valorTotal,
      };
    }, [notas]);

  /**
   * Filtra notas conforme busca e filtros
   */
  const notasFiltradas = useMemo(() => {
    return notas.filter((nota) => {
      const matchesSearch =
        searchTerm === '' ||
        nota.numero_nf.includes(searchTerm) ||
        nota.serie.includes(searchTerm) ||
        (nota.nome_destinatario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (nota.cnpj_destinatario || '').includes(searchTerm);

      const matchesTipo =
        selectedTipo === 'TODAS' ||
        (TIPO_LABELS[nota.tipo_nf || ''] || nota.tipo_nf) ===
          (TIPO_LABELS[selectedTipo] || selectedTipo);

      const matchesSituacao = selectedSituacao === 'TODAS' || nota.situacao === selectedSituacao;

      return matchesSearch && matchesTipo && matchesSituacao;
    });
  }, [notas, searchTerm, selectedTipo, selectedSituacao]);

  /**
   * Upload de certificado
   */
  const handleUploadCertificado = async () => {
    if (!certFile || !certSenha) return;
    setUploadando(true);
    setUploadErro(null);
    try {
      const base64 = await fileToBase64(certFile);
      await certificadoService.upload(empresaId, base64, certSenha);
      setShowCertUpload(false);
      setCertFile(null);
      setCertSenha('');
      await carregarDados();
    } catch (err: any) {
      setUploadErro(err.message || 'Erro ao fazer upload do certificado');
    } finally {
      setUploadando(false);
    }
  };

  /**
   * Download de XML da nota
   */
  const handleDownloadXml = async (nota: NotaFiscalEmissao) => {
    if (!nota.id) return;
    setDownloadingXml(nota.id);
    try {
      const blob = await baixarXmlNota(nota.id);
      downloadBlob(blob, `${nota.numero_nf}_${nota.serie}.xml`);
    } catch (err) {
      console.error('Erro ao baixar XML:', err);
    } finally {
      setDownloadingXml(null);
    }
  };

  /**
   * Download de DANFE (PDF) — para NFC-e e similares
   */
  const handleDownloadDANFE = async (nota: NotaFiscalEmissao) => {
    if (!nota.chave_acesso) return;
    try {
      const blob = await downloadDANFCE(nota.chave_acesso);
      downloadBlob(blob, `DANFE_${nota.numero_nf}.pdf`);
    } catch (err) {
      console.error('Erro ao baixar DANFE:', err);
    }
  };

  /**
   * Configuração dos botões de emissão rápida
   */
  const BOTOES_EMISSAO = [
    {
      label: 'NF-e',
      sublabel: 'Modelo 55',
      icon: FileEdit,
      view: ViewState.INVOICE_EMITTER,
      color: 'text-hc-purple-light',
    },
    {
      label: 'NFC-e',
      sublabel: 'Cupom Fiscal',
      icon: ShoppingCart,
      view: ViewState.PDV,
      color: 'text-blue-400',
    },
    {
      label: 'CT-e',
      sublabel: 'Transporte',
      icon: Truck,
      view: ViewState.CTE,
      color: 'text-green-400',
    },
    {
      label: 'NFS-e',
      sublabel: 'Serviços',
      icon: Briefcase,
      view: ViewState.NFSE,
      color: 'text-orange-400',
    },
  ];

  const prontoParaEmitir =
    certStatus?.status === 'valido' || certStatus?.status === 'expirando_em_breve';

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-hc-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-hc-muted">Carregando dashboard de emissão...</p>
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
              {empresa?.cnpj ?? empresaId} · Dashboard de Emissão
            </p>
          </div>
        </div>
        {!prontoParaEmitir && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <ShieldX size={14} className="text-red-400" />
            <span className="text-xs font-medium text-red-400">Sem certificado válido</span>
          </div>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* Certificado A1 */}
      <CertificadoCard certStatus={certStatus} onUpload={() => setShowCertUpload(true)} />

      {/* Modal de Upload de Certificado */}
      {showCertUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-hc-surface border border-hc-border rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-hc-text mb-4">Upload Certificado A1</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-hc-muted mb-1">Arquivo .pfx / .p12</label>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-hc-text bg-hc-card border border-hc-border rounded-lg px-3 py-2 file:mr-3 file:text-xs file:font-medium file:bg-hc-purple file:text-white file:border-0 file:rounded file:px-2 file:py-1"
                />
              </div>
              <div>
                <label className="block text-xs text-hc-muted mb-1">Senha do Certificado</label>
                <input
                  type="password"
                  value={certSenha}
                  onChange={(e) => setCertSenha(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full text-xs bg-hc-card border border-hc-border rounded-lg px-3 py-2 text-hc-text placeholder:text-hc-muted"
                />
              </div>
              {uploadErro && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {uploadErro}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowCertUpload(false);
                    setUploadErro(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-hc-muted bg-hc-card border border-hc-border rounded-lg hover:text-hc-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadCertificado}
                  disabled={!certFile || !certSenha || uploadando}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-hc-purple rounded-lg hover:bg-hc-purple/90 disabled:opacity-60 transition-colors"
                >
                  <Upload size={14} />
                  {uploadando ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs de Emissão */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={16} className="text-hc-purple-light" />
            <p className="text-xs text-hc-muted">Total Emitidas</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{totalEmitidas}</p>
          <p className="text-[11px] text-hc-muted mt-1">{emitadasMes} este mês</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-400" />
            <p className="text-xs text-hc-muted">Autorizadas</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{autorizadas}</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-400" />
            <p className="text-xs text-hc-muted">Canceladas</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{canceladas}</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-orange-400" />
            <p className="text-xs text-hc-muted">Denegadas</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{denegadas}</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-purple-400" />
            <p className="text-xs text-hc-muted">Valor Total</p>
          </div>
          <p className="text-2xl font-bold text-hc-text text-base">{formatarMoeda(valorTotal)}</p>
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileEdit size={16} className="text-blue-400" />
            <p className="text-xs text-hc-muted">Este Mês</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{emitadasMes}</p>
        </div>
      </div>

      {/* Gráfico de Emissões */}
      {chartData.length > 0 && (
        <div className="bg-hc-surface border border-hc-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-hc-purple-light" />
            <p className="text-sm font-medium text-hc-text">Emissões por Tipo (últimos 6 meses)</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hc-border)" />
              <XAxis dataKey="name" stroke="var(--color-hc-muted)" style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--color-hc-muted)" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-hc-card)',
                  border: '1px solid var(--color-hc-border)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'var(--color-hc-text)' }}
              />
              <Legend />
              <Bar dataKey="NF-e" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="NFC-e" stackId="a" fill="#3b82f6" />
              <Bar dataKey="CT-e" stackId="a" fill="#10b981" />
              <Bar dataKey="NFS-e" stackId="a" fill="#f59e0b" />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Emissão Rápida */}
      <div className="bg-hc-surface border border-hc-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileEdit size={16} className="text-hc-purple-light" />
          <p className="text-sm font-medium text-hc-text">Emissão Rápida</p>
          {!prontoParaEmitir && (
            <span className="ml-auto text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-0.5">
              Requer certificado válido
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BOTOES_EMISSAO.map(({ label, sublabel, icon: Icon, view, color }) => (
            <button
              key={label}
              onClick={() => onNavigate?.(view)}
              disabled={!prontoParaEmitir || !onNavigate}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center
                ${
                  prontoParaEmitir && onNavigate
                    ? 'border-hc-border bg-hc-card hover:border-hc-purple/50 hover:bg-hc-purple-dim/20 cursor-pointer'
                    : 'border-hc-border bg-hc-card opacity-40 cursor-not-allowed'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-hc-surface flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-hc-text">{label}</p>
                <p className="text-[11px] text-hc-muted">{sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-hc-surface border border-hc-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-hc-purple-light" />
          <p className="text-sm font-medium text-hc-text">Filtrar Emissões</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-xs text-hc-muted mb-1">Buscar</label>
            <input
              type="text"
              placeholder="NF, série, contraparte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-hc-card border border-hc-border rounded-lg px-3 py-2 text-hc-text placeholder:text-hc-muted"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs text-hc-muted mb-1">Tipo</label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full text-xs bg-hc-card border border-hc-border rounded-lg px-3 py-2 text-hc-text"
            >
              <option value="TODAS">Todos os Tipos</option>
              <option value="NF-e">NF-e</option>
              <option value="NFC-e">NFC-e</option>
              <option value="CT-e">CT-e</option>
              <option value="NFS-e">NFS-e</option>
            </select>
          </div>

          {/* Situação */}
          <div>
            <label className="block text-xs text-hc-muted mb-1">Situação</label>
            <select
              value={selectedSituacao}
              onChange={(e) => setSelectedSituacao(e.target.value)}
              className="w-full text-xs bg-hc-card border border-hc-border rounded-lg px-3 py-2 text-hc-text"
            >
              <option value="TODAS">Todas</option>
              <option value="autorizada">Autorizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="denegada">Denegada</option>
              <option value="inutilizada">Inutilizada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Notas Emitidas */}
      <div className="bg-hc-surface border border-hc-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-hc-border">
          <p className="text-sm font-medium text-hc-text">
            Notas Emitidas
            <span className="ml-2 text-xs text-hc-muted font-normal">{notasFiltradas.length} exibidas</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          {notasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={40} className="text-hc-muted mb-3 opacity-40" />
              <p className="text-sm text-hc-muted">Nenhuma nota emitida encontrada</p>
              <p className="text-xs text-hc-muted mt-1 opacity-60">
                {totalEmitidas === 0
                  ? 'Use os botões de emissão rápida para emitir a primeira nota'
                  : 'Ajuste os filtros para encontrar mais notas'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hc-border">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">
                    Emissão
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide hidden lg:table-cell">
                    Contraparte
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">
                    Valor
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">
                    Situação
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-hc-muted uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hc-border">
                {notasFiltradas.slice(0, 100).map((nota) => {
                  const sit = SITUACAO_CONFIG[nota.situacao ?? ''];
                  const SitIcon = sit?.icon;
                  return (
                    <tr key={nota.id} className="hover:bg-hc-card/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-hc-muted">
                        {nota.data_emissao ? formatarData(nota.data_emissao) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-hc-purple-light">
                          {TIPO_LABELS[nota.tipo_nf ?? ''] ?? nota.tipo_nf ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-hc-text">
                        {nota.numero_nf}/{nota.serie}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-muted hidden lg:table-cell max-w-[200px] truncate">
                        {nota.nome_destinatario ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-hc-text text-right font-medium">
                        {nota.valor_total != null ? formatarMoeda(nota.valor_total) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {sit ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sit.color}`}>
                            {SitIcon && <SitIcon size={11} />}
                            {sit.label}
                          </span>
                        ) : (
                          <span className="text-xs text-hc-muted">{nota.situacao ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadXml(nota)}
                          disabled={downloadingXml === nota.id}
                          className="p-1.5 rounded-lg hover:bg-hc-purple/20 text-hc-purple-light transition-colors disabled:opacity-50"
                          title="Download XML"
                        >
                          {downloadingXml === nota.id ? (
                            <div className="w-4 h-4 border-2 border-hc-purple-light border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                        {nota.situacao === 'autorizada' && (
                          <button
                            onClick={() => handleDownloadDANFE(nota)}
                            className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                            title="Visualizar DANFE"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
