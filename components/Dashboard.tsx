import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Users,
  AlertCircle,
  TrendingUp,
  BarChart,
  PieChart,
  LineChart,
  Bot,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  ChevronDown,
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
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { botService } from '../src/services/botService';
import type { BotStatus, MetricasBot, StatusEmpresa } from '../src/services/botService';
import { empresaService } from '../services/empresaService';
import type { Empresa } from '../services/empresaService';

// ===== Cores do gráfico de pizza =====
const CHART_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
  '#f97316', '#6366f1', '#ec4899', '#14b8a6', '#a855f7',
];

// ===== Componente de status do bot =====
interface BotStatusCardProps {
  status: BotStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

const BotStatusCard: React.FC<BotStatusCardProps> = ({ status, loading, onRefresh }) => {
  const statusConfig = useMemo(() => {
    if (!status) return { icon: Clock, color: 'gray', label: 'Carregando...', bg: 'bg-gray-100', text: 'text-gray-600' };
    switch (status.status) {
      case 'ok':
        return { icon: CheckCircle, color: 'green', label: 'Operacional', bg: 'bg-green-100', text: 'text-green-600' };
      case 'atrasado':
        return { icon: AlertCircle, color: 'yellow', label: 'Atrasado', bg: 'bg-yellow-100', text: 'text-yellow-600' };
      case 'erro_credenciais':
        return { icon: AlertCircle, color: 'red', label: 'Erro de Credenciais', bg: 'bg-red-100', text: 'text-red-600' };
      case 'nunca_executado':
        return { icon: XCircle, color: 'red', label: 'Nunca Executado', bg: 'bg-red-100', text: 'text-red-600' };
      default:
        return { icon: Clock, color: 'gray', label: status.status, bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  }, [status]);

  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status do Bot</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
          </div>
        </div>
        <div className={`p-2 ${statusConfig.bg} ${statusConfig.text} rounded-lg`}>
          <Bot size={20} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {status?.notas_24h != null ? `${status.notas_24h} notas nas últimas 24h` : '---'}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
    </div>
  );
};

// ===== Componente principal =====
export const Dashboard: React.FC = () => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('pie');

  // Dados da API
  const [metricas, setMetricas] = useState<MetricasBot | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingMetricas, setLoadingMetricas] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [errorMetricas, setErrorMetricas] = useState<string | null>(null);

  // Seletor de empresa
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [empresaStatus, setEmpresaStatus] = useState<StatusEmpresa | null>(null);
  const [loadingEmpresaStatus, setLoadingEmpresaStatus] = useState(false);

  // Carregar métricas do bot
  const carregarMetricas = useCallback(async () => {
    setLoadingMetricas(true);
    setErrorMetricas(null);
    try {
      const data = await botService.obterMetricas();
      setMetricas(data);
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error);
      setErrorMetricas('Não foi possível carregar as métricas');
    } finally {
      setLoadingMetricas(false);
    }
  }, []);

  // Carregar status do bot
  const carregarStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await botService.obterStatus();
      setBotStatus(data);
    } catch (error: any) {
      console.error('Erro ao carregar status do bot:', error);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Carregar empresas
  const carregarEmpresas = useCallback(async () => {
    try {
      const lista = await empresaService.listar();
      setEmpresas(lista);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  }, []);

  // Carregar status da empresa selecionada
  const carregarEmpresaStatus = useCallback(async (empresaId: string) => {
    if (!empresaId) {
      setEmpresaStatus(null);
      return;
    }
    setLoadingEmpresaStatus(true);
    try {
      const data = await botService.obterStatusEmpresa(empresaId);
      setEmpresaStatus(data);
    } catch (error: any) {
      console.error('Erro ao carregar status da empresa:', error);
      setEmpresaStatus(null);
    } finally {
      setLoadingEmpresaStatus(false);
    }
  }, []);

  // Efeito inicial
  useEffect(() => {
    carregarMetricas();
    carregarStatus();
    carregarEmpresas();
  }, [carregarMetricas, carregarStatus, carregarEmpresas]);

  // Quando empresa selecionada mudar
  useEffect(() => {
    if (selectedEmpresaId) {
      carregarEmpresaStatus(selectedEmpresaId);
    } else {
      setEmpresaStatus(null);
    }
  }, [selectedEmpresaId, carregarEmpresaStatus]);

  // Dados para o gráfico de pizza (notas por tipo)
  const pieData = useMemo(() => {
    if (!metricas?.notas_por_tipo) return [];
    return Object.entries(metricas.notas_por_tipo).map(([name, value]) => ({
      name,
      value,
    }));
  }, [metricas]);

  // Dados para gráfico de barras
  const barData = useMemo(() => {
    if (!metricas?.notas_por_tipo) return [];
    return Object.entries(metricas.notas_por_tipo).map(([name, value]) => ({
      name,
      notas: value,
    }));
  }, [metricas]);

  // Refresh geral
  const handleRefresh = useCallback(() => {
    carregarMetricas();
    carregarStatus();
  }, [carregarMetricas, carregarStatus]);

  return (
    <div className="space-y-6 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Notas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Notas</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {loadingMetricas ? (
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                ) : (
                  metricas?.total_notas?.toLocaleString('pt-BR') ?? '---'
                )}
              </h3>
            </div>
            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
              <FileText size={20} />
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">
            Importadas e sincronizadas
          </span>
        </div>

        {/* Empresas Sincronizadas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Empresas Sincronizadas</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {loadingMetricas ? (
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                ) : (
                  metricas?.empresas_sincronizadas ?? '---'
                )}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <span className="text-xs text-blue-600 mt-2 block">
            Com notas no sistema
          </span>
        </div>

        {/* Tipos de Notas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipos de Notas</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {loadingMetricas ? (
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                ) : (
                  Object.keys(metricas?.notas_por_tipo ?? {}).length
                )}
              </h3>
            </div>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">
            {metricas?.notas_por_tipo
              ? Object.entries(metricas.notas_por_tipo)
                  .slice(0, 3)
                  .map(([tipo, qtd]) => `${tipo}: ${qtd}`)
                  .join(' | ')
              : '---'}
          </span>
        </div>

        {/* Status do Bot */}
        <BotStatusCard
          status={botStatus}
          loading={loadingStatus}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Erro de métricas */}
      {errorMetricas && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{errorMetricas}</p>
          <button
            onClick={carregarMetricas}
            className="ml-auto text-sm text-red-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Seletor de empresa + Status individual */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <Building size={20} />
            Status por Empresa
          </h3>
          <div className="relative w-full sm:w-72">
            <select
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Selecione uma empresa...</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razao_social}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {selectedEmpresaId && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            {loadingEmpresaStatus ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Carregando status...</span>
              </div>
            ) : empresaStatus ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {empresaStatus.total_notas}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total de Notas</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {empresaStatus.ultima_nota
                      ? `${empresaStatus.ultima_nota.tipo} #${empresaStatus.ultima_nota.numero}`
                      : 'Nenhuma'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Última Nota</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      empresaStatus.sincronizado
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {empresaStatus.sincronizado ? (
                      <><CheckCircle size={12} /> Sincronizado</>
                    ) : (
                      <><XCircle size={12} /> Não Sincronizado</>
                    )}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Status</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma informação disponível para esta empresa.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Gráfico de notas por tipo */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Notas por Tipo</h3>
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-md transition-all ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-slate-600 shadow text-primary-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
              title="Gráfico de Barras"
            >
              <BarChart size={20} />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-md transition-all ${
                chartType === 'pie'
                  ? 'bg-white dark:bg-slate-600 shadow text-primary-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
              title="Gráfico de Pizza"
            >
              <PieChart size={20} />
            </button>
          </div>
        </div>

        {loadingMetricas ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-primary-500" />
          </div>
        ) : pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText size={40} className="mb-2" />
            <p className="text-sm">Nenhum dado disponível</p>
          </div>
        ) : chartType === 'pie' ? (
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="notas" name="Quantidade de Notas" fill="#8b5cf6" />
            </ReBarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
