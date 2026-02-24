import React, { useState, useEffect } from 'react';
import { DollarSign, Users, AlertCircle, CheckCircle, TrendingUp, BarChart, PieChart, LineChart, Loader2 } from 'lucide-react';
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
  Area
} from 'recharts';
import { botService, type MetricasBot, type BotStatus } from '../src/services/botService';

interface DashboardMetrics {
  totalNotas: number;
  clientesAtivos: number;
  pendencias: number;
  notasPorTipo: { name: string; value: number }[];
  ultimaSincronizacao: string | null;
}

export const Dashboard = () => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalNotas: 0,
    clientesAtivos: 0,
    pendencias: 0,
    notasPorTipo: [],
    ultimaSincronizacao: null,
  });

  useEffect(() => {
    const carregarMetricas = async () => {
      try {
        setLoading(true);
        const [metricas, status] = await Promise.all([
          botService.obterMetricas().catch(() => null),
          botService.obterStatus().catch(() => null),
        ]);

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
          totalNotas: metricas?.total_notas || 0,
          clientesAtivos: metricas?.empresas_sincronizadas || 0,
          pendencias: (status?.empresas_sem_certificado || 0) + (status?.empresas_cert_expirado || 0),
          notasPorTipo,
          ultimaSincronizacao: status?.ultima_sincronizacao || null,
        });
      } catch (error) {
        console.error('Erro ao carregar metricas:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarMetricas();
  }, []);

  // Dados para graficos baseados nas metricas reais
  const monthlyData = metrics.notasPorTipo.length > 0
    ? metrics.notasPorTipo.map((item) => ({
        name: item.name,
        notas: item.value,
        impostos: Math.round(item.value * 150), // Estimativa
      }))
    : [{ name: 'Sem dados', notas: 0, impostos: 0 }];

  const pieData = metrics.notasPorTipo.length > 0
    ? metrics.notasPorTipo
    : [{ name: 'Sem dados', value: 0 }];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Volume']} />
              <Legend />
              <Bar dataKey="notas" name="Volume de Notas" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={monthlyData[index].name === 'Sem dados' ? '#94a3b8' : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Impostos (est.)']} />
              <Legend />
              <Line type="monotone" dataKey="impostos" name="Impostos recuperados – estimativa (R$)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReAreaChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Volume']} />
              <Legend />
              <Area
                type="monotone"
                dataKey="notas"
                name="Volume de Notas"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.4}
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
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Quantidade']} />
            </RePieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Visão geral */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visão geral</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Métricas consolidadas do escritório</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Notas</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.totalNotas.toLocaleString('pt-BR')}
                </h3>
              </div>
              <div className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <DollarSign size={20} />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-2">
              Notas importadas do Drive
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Empresas Sincronizadas</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.clientesAtivos}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users size={20} />
              </div>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 mt-2 block">Com Drive configurado</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendências</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.pendencias}
                </h3>
              </div>
              <div className={`p-2.5 rounded-lg ${metrics.pendencias > 0 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                {metrics.pendencias > 0 ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              </div>
            </div>
            <span className={`text-xs mt-2 block ${metrics.pendencias > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {metrics.pendencias > 0 ? 'Certificados pendentes' : 'Tudo em ordem'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Última Sincronização</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.ultimaSincronizacao
                    ? new Date(metrics.ultimaSincronizacao).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Nunca'}
                </h3>
              </div>
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <TrendingUp size={20} />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">Bot automático</span>
          </div>
          </div>
        </>
      )}

      {/* Chart Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Volume por tipo de nota</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Análise de desempenho por tipo de documento fiscal</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              title="Volume de Notas"
            >
              <BarChart size={20} />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-md transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              title="Evolução de Impostos"
            >
              <LineChart size={20} />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-2 rounded-md transition-all ${chartType === 'area' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              title="Área de Notas"
            >
              <TrendingUp size={20} />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-md transition-all ${chartType === 'pie' ? 'bg-white dark:bg-slate-600 shadow text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              title="Status das Notas"
            >
              <PieChart size={20} />
            </button>
          </div>
        </div>

        {renderChart()}
      </div>

      {/* Status do Sistema */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Status do Sistema</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monitoramento do bot e das importações</p>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {metrics.ultimaSincronizacao && (
              <div className="flex gap-4 items-start">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Bot Sincronizado</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Última execução: {new Date(metrics.ultimaSincronizacao).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
            {metrics.totalNotas > 0 && (
              <div className="flex gap-4 items-start">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-blue-500 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Notas Importadas</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {metrics.totalNotas.toLocaleString('pt-BR')} notas no sistema
                  </p>
                </div>
              </div>
            )}
            {metrics.pendencias > 0 && (
              <div className="flex gap-4 items-start">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-orange-500 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Atenção Necessária</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {metrics.pendencias} empresa(s) com certificado pendente
                  </p>
                </div>
              </div>
            )}
            {!metrics.ultimaSincronizacao && metrics.totalNotas === 0 && (
              <div className="text-center py-8 px-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-dashed border-gray-200 dark:border-slate-600">
                <p className="text-gray-600 dark:text-gray-300 font-medium">Nenhuma atividade registrada</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure o Google Drive em um cliente para começar a importar notas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
