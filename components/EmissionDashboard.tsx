import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Building2,
  Clock,
} from 'lucide-react';
import { carregarMetricasEmissao, type MetricasEmissao } from '../src/services/dashboardService';
import { ViewState } from '../types';

interface EmissionDashboardProps {
  setView: (view: ViewState) => void;
  onNavigateToClient: (empresaId: string) => void;
}

/**
 * Dashboard de Emissão — status de emissão por cliente.
 * Mostra o estado do certificado A1 e prontidão para emitir de cada empresa.
 * Não exibe dados de busca/consulta.
 */
export const EmissionDashboard: React.FC<EmissionDashboardProps> = ({
  setView,
  onNavigateToClient,
}) => {
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [dados, setDados] = useState<MetricasEmissao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    try {
      setErro(null);
      const resultado = await carregarMetricasEmissao();
      setDados(resultado);
    } catch {
      setErro('Não foi possível carregar os dados de emissão.');
    } finally {
      setLoading(false);
    }
  };

  const atualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const prontos = dados.filter((d) => d.prontoParaEmitir).length;
  const semCert = dados.filter((d) => !d.certStatus || d.certStatus.status === 'ausente').length;
  const expirandoOuExpirado = dados.filter(
    (d) => d.certStatus?.status === 'expirando_em_breve' || d.certStatus?.status === 'expirado'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-hc-purple-light" size={36} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hc-purple-dim flex items-center justify-center">
            <FileEdit size={22} className="text-hc-purple-light" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-hc-text">Dashboard de Emissão</h1>
            <p className="text-xs text-hc-muted">
              Prontidão e certificados de emissão por empresa — não inclui dados de busca
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={atualizar}
            disabled={atualizando}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-hc-border
              text-hc-muted hover:text-hc-text hover:bg-hc-card transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={() => setView(ViewState.INVOICES)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-hc-purple text-white
              hover:bg-hc-purple/80 transition-colors"
          >
            <FileEdit size={14} />
            Emitir NF-e
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={16} />
          {erro}
        </div>
      )}

      {/* KPIs consolidados */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 border bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-emerald-500" />
            <p className="text-xs text-hc-muted">Prontas para emitir</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">
            {prontos}/{dados.length}
          </p>
        </div>
        <div className="rounded-xl p-4 border bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={14} className="text-amber-500" />
            <p className="text-xs text-hc-muted">Cert. expirando/expirado</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{expirandoOuExpirado}</p>
        </div>
        <div className="rounded-xl p-4 border bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldOff size={14} className="text-red-400" />
            <p className="text-xs text-hc-muted">Sem certificado</p>
          </div>
          <p className="text-2xl font-bold text-hc-text">{semCert}</p>
        </div>
      </div>

      {/* Grid de empresas */}
      {dados.length === 0 ? (
        <div className="bg-hc-card border border-hc-border rounded-xl p-12 text-center">
          <Building2 size={36} className="text-hc-muted mx-auto mb-4" />
          <p className="font-semibold text-hc-text mb-1">Nenhum cliente cadastrado</p>
          <p className="text-sm text-hc-muted mb-4">
            Cadastre uma empresa em Clientes para gerenciar a emissão.
          </p>
          <button
            onClick={() => setView(ViewState.USERS)}
            className="text-hc-purple-light hover:text-hc-purple text-sm underline"
          >
            Ir para Clientes
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-hc-text">
            Empresas cadastradas — {dados.length} cliente{dados.length !== 1 ? 's' : ''}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {dados.map((d) => (
              <EmpresaEmissaoCard
                key={d.empresa.id}
                dado={d}
                onClick={() => onNavigateToClient(d.empresa.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Acesso rápido por tipo */}
      <div className="bg-hc-card border border-hc-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-hc-text mb-3">Emitir por tipo de documento</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'NF-e', sub: 'Modelo 55', view: ViewState.INVOICE_EMITTER },
            { label: 'NFC-e', sub: 'Cupom Fiscal', view: ViewState.PDV },
            { label: 'CT-e', sub: 'Transporte', view: ViewState.CTE },
            { label: 'NFS-e', sub: 'Serviços', view: ViewState.NFSE },
          ].map(({ label, sub, view }) => (
            <button
              key={label}
              onClick={() => setView(view)}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-hc-border
                hover:border-hc-purple hover:bg-hc-purple-dim transition-colors group"
            >
              <span className="text-sm font-semibold text-hc-text group-hover:text-hc-purple-light">
                {label}
              </span>
              <span className="text-[10px] text-hc-muted">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── EmpresaEmissaoCard ──────────────────────────────────────────────────────

interface EmpresaEmissaoCardProps {
  dado: MetricasEmissao;
  onClick: () => void;
}

type CertStatusKey = 'valido' | 'expirando_em_breve' | 'expirado' | 'ausente';

const CERT_CONFIG: Record<CertStatusKey, { label: string; cor: string; Icon: React.ElementType }> = {
  valido: { label: 'Certificado válido', cor: 'text-emerald-400', Icon: ShieldCheck },
  expirando_em_breve: { label: 'Cert. expirando', cor: 'text-amber-400', Icon: ShieldAlert },
  expirado: { label: 'Cert. expirado', cor: 'text-red-400', Icon: XCircle },
  ausente: { label: 'Sem certificado', cor: 'text-red-400', Icon: ShieldOff },
};

const EmpresaEmissaoCard: React.FC<EmpresaEmissaoCardProps> = ({ dado, onClick }) => {
  const { empresa, certStatus, prontoParaEmitir } = dado;

  const certKey = (certStatus?.status ?? 'ausente') as CertStatusKey;
  const cert = CERT_CONFIG[certKey] ?? CERT_CONFIG.ausente;
  const CertIcon = cert.Icon;

  const validadeFmt = certStatus?.validade
    ? new Date(certStatus.validade).toLocaleDateString('pt-BR')
    : null;

  const borderColor = prontoParaEmitir
    ? 'hover:border-emerald-500/40'
    : 'hover:border-amber-500/40';

  return (
    <button
      onClick={onClick}
      className={`text-left bg-hc-card border border-hc-border rounded-xl p-4
        ${borderColor} hover:shadow-md transition-all duration-200 group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-hc-text text-sm truncate group-hover:text-hc-purple-light transition-colors">
            {empresa.nome_fantasia || empresa.razao_social}
          </p>
          <p className="text-[11px] text-hc-muted truncate">{empresa.cnpj}</p>
        </div>
        <span
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${
            prontoParaEmitir
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}
        >
          {prontoParaEmitir ? 'Pronto' : 'Bloqueado'}
        </span>
      </div>

      {/* Status do certificado */}
      <div className="flex items-center gap-2 mb-2">
        <CertIcon size={14} className={cert.cor} />
        <span className={`text-xs ${cert.cor}`}>{cert.label}</span>
      </div>

      {validadeFmt && (
        <div className="flex items-center gap-1 text-[11px] text-hc-muted">
          <Clock size={10} />
          Validade: {validadeFmt}
          {certStatus?.dias_restantes !== undefined && (
            <span className="ml-1 text-amber-400">({certStatus.dias_restantes}d)</span>
          )}
        </div>
      )}

      {empresa.regime_tributario && (
        <p className="mt-2 text-[10px] text-hc-muted capitalize">
          {empresa.regime_tributario.replace('_', ' ')}
        </p>
      )}

      {/* CTA */}
      <div className="mt-3 pt-3 border-t border-hc-border flex items-center justify-between">
        <span className="text-[11px] text-hc-muted">Ver detalhes</span>
        <ArrowRight size={12} className="text-hc-muted group-hover:text-hc-purple-light transition-colors" />
      </div>
    </button>
  );
};
