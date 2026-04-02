import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, LineChart, TrendingUp, Loader2, RefreshCw, Plus } from 'lucide-react';
import { Button, PageHeader } from '../src/components/ui';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart as ReAreaChart,
  Area,
} from 'recharts';
import { botService, type MetricasBot, type BotStatus } from '../src/services/botService';
import { ViewState } from '../types';
import { KPICard } from '../src/components/dashboard/KPICard';
import { ComplianceCard } from '../src/components/dashboard/ComplianceCard';
import { RecentNotasCard } from '../src/components/dashboard/RecentNotasCard';
import { TasksQuickCard } from '../src/components/dashboard/TasksQuickCard';
import { ClientesFiscalTable } from '../src/components/dashboard/ClientesFiscalTable';

interface DashboardProps {
  setView: (view: ViewState) => void;
}

interface DashboardMetrics {
  totalNotas: number;
  clientesAtivos: number;
  pendencias: number;
  notasPorTipo: { name: string; value: number }[];
  ultimaSincronizacao: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalNotas: 0,
    clientesAtivos: 0,
    pendencias: 0,
    notasPorTipo: [],
    ultimaSincronizacao: null,
  });

  const carregarMetricas = async () => {
    try {
      setLoading(true);
      const [metricas, status] = await Promise.all([
        botService.obterMetricas().catch((): MetricasBot | null => null),
        botService.obterStatus().catch((): BotStatus | null => null),
      ]);

      if (status) setBotStatus(status);

      const notasPorTipo = metricas?.notas_por_tipo
        ? Object.entries(metricas.notas_por_tipo).map(([name, value]) => ({
            name,
            value: value as number,
          }))
        : [
            { name: 'NF-e', value: 0 },
            { name: 'NFS-e', value: 0 },
            { name: 'CT-e', value: 0 },
          ];

      setMetrics({
        totalNotas: metricas?.total_notas ?? 0,
        clientesAtivos: metricas?.empresas_sincronizadas ?? 0,
        pendencias:
          (status?.empresas_sem_certificado ?? 0) + (status?.empresas_cert_expirado ?? 0),
        notasPorTipo,
        ultimaSincronizacao: status?.ultima_sincronizacao ?? null,
      });
    } catch (error) {
      console.error('Erro ao carregar metricas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMetricas();
  }, []);

  const handleSincronizar = async () => {
    try {
      setSyncing(true);
      await botService.obterStatus();
      await carregarMetricas();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Dados para gráficos baseados nas métricas reais
  const monthlyData =
    metrics.notasPorTipo.length > 0
      ? metrics.notasPorTipo.map((item) => ({
          name: item.name,
          notas: item.value,
          impostos: Math.round(item.value * 150),
        }))
      : [{ name: 'Sem dados', notas: 0, impostos: 0 }];

  const pieData =
    metrics.notasPorTipo.length > 0
      ? metrics.notasPorTipo
      : [{ name: 'Sem dados', value: 0 }];

  const CHART_COLOR = '#7C3AED';
  const CHART_COLOR_2 = '#A78BFA';
  const COLORS = [CHART_COLOR, CHART_COLOR_2, '#10B981', '#F59E0B', '#EF4444'];

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hc-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--hc-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--hc-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--hc-card)', border: '1px solid var(--hc-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--hc-text)' }}
              />
              <Legend wrapperStyle={{ color: 'var(--hc-muted)', fontSize: 12 }} />
              <Bar dataKey="notas" name="Volume de Notas" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hc-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--hc-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--hc-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--hc-card)', border: '1px solid var(--hc-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--hc-text)' }}
              />
              <Legend wrapperStyle={{ color: 'var(--hc-muted)', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="impostos"
                name="Impostos Recuperados (R$)"
                stroke={CHART_COLOR_2}
                strokeWidth={2}
                dot={{ fill: CHART_COLOR_2, r: 4 }}
              />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReAreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hc-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--hc-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--hc-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--hc-card)', border: '1px solid var(--hc-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--hc-text)' }}
              />
              <Legend wrapperStyle={{ color: 'var(--hc-muted)', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="notas"
                name="Volume de Notas"
                stroke={CHART_COLOR}
                fill={CHART_COLOR}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </ReAreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
                isAnimationActive={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--hc-card)', border: '1px solid var(--hc-border)', borderRadius: 8 }}
              />
            </RePieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // Sparkline simulada a partir das métricas reais
  const spark = metrics.notasPorTipo.map((n) => n.value);

  return (
    <div className="p-6 bg-hc-bg min-h-full font-body">

      {/* Seção 1 — TopBar */}
      <PageHeader
        title="Dashboard"
        subtitle={
          metrics.ultimaSincronizacao
            ? `Última sync: ${new Date(metrics.ultimaSincronizacao).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}`
            : 'Nunca sincronizado'
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSincronizar}
              disabled={syncing || loading}
              loading={syncing}
              leftIcon={<RefreshCw size={13} />}
              aria-label="Sincronizar SEFAZ"
            >
              Sincronizar SEFAZ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setView(ViewState.INVOICE_EMITTER)}
              leftIcon={<Plus size={13} />}
              aria-label="Nova NF-e"
            >
              Nova NF-e
            </Button>
          </>
        }
      />

      {/* Seção 2 — KPI Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-hc-purple" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KPICard
            label="Receita do Mês"
            value={(metrics.totalNotas * 150).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            delta={metrics.totalNotas > 0 ? `${metrics.totalNotas} notas` : undefined}
            deltaType="up"
            accentColor="green"
            sparkData={spark}
          />
          <KPICard
            label="NF-e Emitidas"
            value={metrics.totalNotas.toLocaleString('pt-BR')}
            accentColor="purple"
            sparkData={spark}
          />
          <KPICard
            label="Clientes Ativos"
            value={metrics.clientesAtivos}
            delta="Com Drive configurado"
            deltaType="neutral"
            accentColor="amber"
          />
          <KPICard
            label="Pendências"
            value={metrics.pendencias}
            delta={metrics.pendencias > 0 ? 'Requer ação' : 'Tudo em ordem'}
            deltaType={metrics.pendencias > 0 ? 'down' : 'up'}
            accentColor="red"
          />
        </div>
      )}

      {/* Seção 3 — Mid Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_300px] gap-3 mb-5">
          <ComplianceCard status={botStatus} pendencias={metrics.pendencias} />
          <RecentNotasCard />
          <TasksQuickCard setView={setView} />
        </div>
      )}

      {/* Seção 4 — Bottom Grid */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {/* Tabela de clientes fiscais */}
          <ClientesFiscalTable setView={setView} />

          {/* Chart existente — visual atualizado */}
          <div className="bg-hc-card border border-hc-border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
              <h3 className="text-sm font-semibold font-display text-hc-text">Análise de Desempenho</h3>
              <div className="flex bg-hc-surface border border-hc-border p-1 rounded-lg gap-0.5">
                <button
                  onClick={() => setChartType('bar')}
                  aria-label="Gráfico de barras"
                  className={`p-2 rounded-md transition-all ${
                    chartType === 'bar'
                      ? 'bg-hc-purple-dim text-hc-purple-light shadow'
                      : 'text-hc-muted hover:text-hc-accent'
                  }`}
                >
                  <BarChart size={16} />
                </button>
                <button
                  onClick={() => setChartType('line')}
                  aria-label="Gráfico de linhas"
                  className={`p-2 rounded-md transition-all ${
                    chartType === 'line'
                      ? 'bg-hc-purple-dim text-hc-purple-light shadow'
                      : 'text-hc-muted hover:text-hc-accent'
                  }`}
                >
                  <LineChart size={16} />
                </button>
                <button
                  onClick={() => setChartType('area')}
                  aria-label="Gráfico de área"
                  className={`p-2 rounded-md transition-all ${
                    chartType === 'area'
                      ? 'bg-hc-purple-dim text-hc-purple-light shadow'
                      : 'text-hc-muted hover:text-hc-accent'
                  }`}
                >
                  <TrendingUp size={16} />
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  aria-label="Gráfico de pizza"
                  className={`p-2 rounded-md transition-all ${
                    chartType === 'pie'
                      ? 'bg-hc-purple-dim text-hc-purple-light shadow'
                      : 'text-hc-muted hover:text-hc-accent'
                  }`}
                >
                  <PieChart size={16} />
                </button>
              </div>
            </div>

            {renderChart()}
          </div>
        </div>
      )}
    </div>
  );
};
