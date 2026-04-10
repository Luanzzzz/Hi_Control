import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import {
  FileSearch,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Building2,
  WifiOff,
  UserPlus,
  X,
  Clock,
} from 'lucide-react';
import { carregarMetricasBusca, type MetricasBusca } from '../src/services/dashboardService';
import { empresaService, type EmpresaCreate } from '../services/empresaService';
import { ViewState } from '../types';

interface SearchDashboardProps {
  setView: (view: ViewState) => void;
  onNavigateToClient: (empresaId: string) => void;
}

/**
 * Dashboard de Busca — métricas de busca fiscal por cliente.
 * Cada empresa cadastrada tem seu próprio painel com dados de sincronização.
 * Não exibe dados de emissão.
 */
export const SearchDashboard: React.FC<SearchDashboardProps> = ({
  setView,
  onNavigateToClient,
}) => {
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [dados, setDados] = useState<MetricasBusca[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, reset } = useForm<EmpresaCreate>();

  const carregar = async () => {
    try {
      setErro(null);
      const resultado = await carregarMetricasBusca();
      setDados(resultado);
    } catch {
      setErro('Não foi possível carregar as métricas de busca.');
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

  const onSubmitClient = async (data: EmpresaCreate) => {
    setFormMessage(null);
    try {
      const payload: EmpresaCreate = {
        ...data,
        csc_id: data.csc_id !== undefined && data.csc_id !== null && String(data.csc_id).trim() !== ''
          ? Number(data.csc_id) : undefined,
        csc_token: data.csc_token && String(data.csc_token).trim() ? String(data.csc_token).trim() : undefined,
      };
      const result = await empresaService.criar(payload);
      setFormMessage({ type: 'success', text: result._message || 'Cliente cadastrado com sucesso!' });
      reset();
      carregar();
      setTimeout(() => { setShowAddClient(false); setFormMessage(null); }, 1500);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      setFormMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Erro ao cadastrar cliente.' });
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <FileSearch size={22} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-hc-text">HI buscador</h1>
            <p className="text-xs text-hc-muted">
              Notas fiscais encontradas por empresa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddClient(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-hc-border
              text-hc-muted hover:text-hc-text hover:bg-hc-card transition-colors"
          >
            <UserPlus size={14} />
            Novo Cliente
          </button>
          <button
            onClick={atualizar}
            disabled={atualizando}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-hc-border
              text-hc-muted hover:text-hc-text hover:bg-hc-card transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* Grid de empresas */}
      {dados.length === 0 ? (
        <EmptyState
          icon={<Building2 size={36} className="text-hc-muted" />}
          title="Nenhum cliente cadastrado"
          desc="Cadastre uma empresa em Clientes para começar a acompanhar as buscas."
          action={
            <button
              onClick={() => setView(ViewState.USERS)}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Ir para Clientes
            </button>
          }
        />
      ) : (
        <>
          <h2 className="text-sm font-semibold text-hc-text">
            Empresas cadastradas — {dados.length} cliente{dados.length !== 1 ? 's' : ''}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {dados.map((d) => (
              <EmpresaBuscaCard
                key={d.empresa.id}
                dado={d}
                onClick={() => onNavigateToClient(d.empresa.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal Novo Cliente */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-hc-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-hc-border">
            <div className="flex justify-between items-center p-5 border-b border-hc-border sticky top-0 bg-hc-surface z-10">
              <h3 className="text-base font-semibold font-display text-hc-text">Novo Cliente</h3>
              <button onClick={() => { setShowAddClient(false); reset(); setFormMessage(null); }} className="p-1.5 rounded-lg hover:bg-hc-hover text-hc-muted">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitClient)} className="p-6 space-y-4">
              {formMessage && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                  formMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {formMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {formMessage.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">CNPJ *</label>
                  <InputMask mask="99.999.999/9999-99" {...register('cnpj', { required: true })} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Razão Social *</label>
                  <input type="text" {...register('razao_social', { required: true })} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Nome Fantasia</label>
                  <input type="text" {...register('nome_fantasia')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Regime Tributário</label>
                  <select {...register('regime_tributario')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none">
                    <option value="">Selecione...</option>
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Inscrição Estadual</label>
                  <input type="text" {...register('inscricao_estadual')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Inscrição Municipal</label>
                  <input type="text" {...register('inscricao_municipal')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">CEP</label>
                  <InputMask mask="99999-999" {...register('cep')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Cidade</label>
                  <input type="text" {...register('cidade')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Estado (UF)</label>
                  <input type="text" maxLength={2} {...register('estado')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hc-text mb-1">Email</label>
                  <input type="email" {...register('email')} className="w-full rounded-lg bg-hc-surface border border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-hc-border">
                <button type="button" onClick={() => { setShowAddClient(false); reset(); setFormMessage(null); }} className="px-4 py-2 text-sm rounded-lg text-hc-muted hover:bg-hc-hover transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-hc-purple text-white hover:bg-hc-purple/80 transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EmpresaBuscaCard ────────────────────────────────────────────────────────

interface EmpresaBuscaCardProps {
  dado: MetricasBusca;
  onClick: () => void;
}

const EmpresaBuscaCard: React.FC<EmpresaBuscaCardProps> = ({ dado, onClick }) => {
  const { empresa, totalNotas, ultimaNota, sincronizado, erroBusca } = dado;

  const ultimaData = ultimaNota?.created_at
    ? new Date(ultimaNota.created_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left bg-hc-card border border-hc-border rounded-xl p-4
        hover:border-blue-500/40 hover:shadow-md transition-all duration-200 group"
    >
      {/* Header da empresa */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-hc-text text-sm truncate group-hover:text-blue-400 transition-colors">
            {empresa.nome_fantasia || empresa.razao_social}
          </p>
          <p className="text-[11px] text-hc-muted truncate">{empresa.cnpj}</p>
        </div>
        {sincronizado ? (
          <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle size={10} />
            Sync
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <WifiOff size={10} />
            Pendente
          </span>
        )}
      </div>

      {/* Métricas */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-hc-text">{totalNotas.toLocaleString('pt-BR')}</p>
          <p className="text-[11px] text-hc-muted">notas encontradas</p>
        </div>

        {ultimaNota && (
          <div className="text-right">
            <span className="text-[10px] font-medium text-hc-purple-light bg-hc-purple-dim px-2 py-0.5 rounded-md">
              {ultimaNota.tipo}
            </span>
            {ultimaData && (
              <p className="flex items-center gap-1 justify-end text-[10px] text-hc-muted mt-1">
                <Clock size={9} />
                {ultimaData}
              </p>
            )}
          </div>
        )}
      </div>

      {erroBusca && (
        <p className="mt-2 text-[10px] text-amber-400">{erroBusca}</p>
      )}

      {/* CTA */}
      <div className="mt-3 pt-3 border-t border-hc-border flex items-center justify-between">
        <span className="text-[11px] text-hc-muted">Ver notas</span>
        <ArrowRight size={12} className="text-hc-muted group-hover:text-blue-400 transition-colors" />
      </div>
    </button>
  );
};

// ─── EmptyState ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}> = ({ icon, title, desc, action }) => (
  <div className="bg-hc-card border border-hc-border rounded-xl p-12 text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <p className="font-semibold text-hc-text mb-1">{title}</p>
    <p className="text-sm text-hc-muted">{desc}</p>
    {action}
  </div>
);
