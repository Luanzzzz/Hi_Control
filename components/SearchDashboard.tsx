import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSearch,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  Building2,
  WifiOff,
  TrendingUp,
  BarChart2,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { carregarMetricasBusca, type MetricasBusca } from '../src/services/dashboardService';
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

  const totalNotas = dados.reduce((acc, d) => acc + d.totalNotas, 0);
  const sincronizados = dados.filter((d) => d.sincronizado).length;
  const semDados = dados.filter((d) => d.totalNotas === 0).length;
  const [chartMode, setChartMode] = useState<'bar' | 'pie'>('bar');

  // Dados para o gráfico de barras — top 10 empresas por qtd de notas
  const barData = useMemo(() => {
    return [...dados]
      .sort((a, b) => b.totalNotas - a.totalNotas)
      .slice(0, 10)
      .map((d, idx) => ({
        nome: (d.empresa.nome_fantasia || d.empresa.razao_social).slice(0, 18),
        notas: d.totalNotas,
        status: d.sincronizado ? 'sync' : 'pending',
        fill: d.sincronizado ? '#6d28d9' : '#f59e0b',
      }));
  }, [dados]);

  // Dados para o gráfico de pizza — distribuição por status
  const pieData = useMemo(() => {
    const sync = dados.filter((d) => d.sincronizado && d.totalNotas > 0).length;
    const pending = dados.filter((d) => !d.sincronizado && d.totalNotas > 0).length;
    const empty = semDados;
    return [
      { name: 'Sincronizadas', value: sync, fill: '#6d28d9' },
      { name: 'Pendentes', value: pending, fill: '#f59e0b' },
      { name: 'Sem dados', value: empty, fill: '#475569' },
    ].filter((d) => d.value > 0);
  }, [dados, semDados]);

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
            <h1 className="text-xl font-bold text-hc-text">Dashboard de Busca</h1>
            <p className="text-xs text-hc-muted">
              Notas fiscais encontradas por empresa — apenas dados de busca
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
            onClick={() => setView(ViewState.INVOICE_SEARCH)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500 text-white
              hover:bg-blue-600 transition-colors"
          >
            <Search size={14} />
            Consultar Notas
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* Painel BI */}
      {dados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Gráfico principal */}
          <div className="lg:col-span-2 bg-hc-surface border border-hc-border rounded-xl p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-hc-purple-light" />
                <p className="text-sm font-semibold text-hc-text">
                  {chartMode === 'bar' ? 'Volume de Notas por Empresa' : 'Distribuição por Status'}
                </p>
              </div>
              <div className="flex bg-hc-card border border-hc-border p-0.5 rounded-lg gap-0.5">
                <button
                  onClick={() => setChartMode('bar')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'bar' ? 'bg-hc-surface text-hc-purple border border-hc-border shadow-sm' : 'text-hc-muted hover:text-hc-text'}`}
                >
                  <BarChart2 size={12} className="inline mr-1" />Barras
                </button>
                <button
                  onClick={() => setChartMode('pie')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'pie' ? 'bg-hc-surface text-hc-purple border border-hc-border shadow-sm' : 'text-hc-muted hover:text-hc-text'}`}
                >
                  <Activity size={12} className="inline mr-1" />Pizza
                </button>
              </div>
            </div>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'bar' ? (
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis
                      dataKey="nome"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(109,40,217,0.07)' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'var(--hc-surface)', fontSize: 12 }}
                      labelStyle={{ color: 'var(--hc-text)', fontWeight: 600 }}
                      formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Notas']}
                    />
                    <Bar dataKey="notas" radius={[4, 4, 0, 0]} maxBarSize={48} name="Notas">
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1, stroke: '#94a3b8' }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'var(--hc-surface)', fontSize: 12 }}
                      formatter={(value: number) => [value, 'Empresas']}
                    />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Painel de métricas resumidas */}
          <div className="bg-hc-surface border border-hc-border rounded-xl p-5 flex flex-col justify-between" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div>
              <p className="text-[11px] font-semibold text-hc-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileSearch size={13} />
                Resumo Geral
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-hc-muted">Total de notas</span>
                    <span className="font-semibold text-hc-text">{totalNotas.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-hc-card h-1.5 rounded-full overflow-hidden">
                    <div className="bg-hc-purple h-full rounded-full w-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-hc-muted flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" /> Sincronizadas
                    </span>
                    <span className="font-semibold text-hc-text">{sincronizados}/{dados.length}</span>
                  </div>
                  <div className="w-full bg-hc-card h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all"
                      style={{ width: dados.length > 0 ? `${(sincronizados / dados.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-hc-muted flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" /> Pendentes
                    </span>
                    <span className="font-semibold text-hc-text">{dados.length - sincronizados}</span>
                  </div>
                  <div className="w-full bg-hc-card h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all"
                      style={{ width: dados.length > 0 ? `${((dados.length - sincronizados) / dados.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                {semDados > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-hc-muted flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400" /> Sem dados
                      </span>
                      <span className="font-semibold text-hc-text">{semDados}</span>
                    </div>
                    <div className="w-full bg-hc-card h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 h-full rounded-full"
                        style={{ width: `${(semDados / dados.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-hc-border flex justify-between items-center">
              <span className="text-xs text-hc-muted">{dados.length} empresa{dados.length !== 1 ? 's' : ''}</span>
              <span className="text-xs font-semibold text-emerald-400">
                {dados.length > 0 ? Math.round((sincronizados / dados.length) * 100) : 0}% OK
              </span>
            </div>
          </div>
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
