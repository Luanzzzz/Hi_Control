import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Users, AlertCircle, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { botService } from '../src/services/botService';

interface DashboardMetrics {
  totalNotas: number;
  clientesAtivos: number;
  pendencias: number;
  notasPorTipo: { name: string; value: number }[];
  ultimaSincronizacao: string | null;
}

const BAR_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalNotas: 0,
    clientesAtivos: 0,
    pendencias: 0,
    notasPorTipo: [],
    ultimaSincronizacao: null,
  });

  const carregarMetricas = useCallback(async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarMetricas(true);
    const intervalId = setInterval(() => carregarMetricas(false), 90000);
    return () => clearInterval(intervalId);
  }, [carregarMetricas]);

  const totalVolume = metrics.notasPorTipo.reduce((acc, item) => acc + item.value, 0);
  const displayItems = metrics.notasPorTipo.filter((item) => item.name !== 'Sem dados');

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

      {/* Volume por tipo de nota - barras de progresso */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Volume por tipo de nota</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Análise de desempenho por tipo de documento fiscal</p>
        </div>
        <div className="space-y-4">
          {displayItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado de volume disponível.</p>
          ) : (
            displayItems.map((item, index) => {
              const pct = totalVolume > 0 ? (item.value / totalVolume) * 100 : 0;
              const color = item.name === 'Sem dados' ? '#94a3b8' : BAR_COLORS[index % BAR_COLORS.length];
              return (
                <div key={`${item.name}-${index}`} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {item.name} — {item.value.toLocaleString('pt-BR')}
                    </span>
                    {totalVolume > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">{pct.toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${totalVolume > 0 ? pct : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
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
