import React, { useState } from 'react';
import { DollarSign, Users, AlertCircle, TrendingUp, BarChart, PieChart, LineChart } from 'lucide-react';
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

export const Dashboard = () => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');

  // Mock Data
  const monthlyData = [
    { name: 'Jan', notas: 40, impostos: 2400 },
    { name: 'Fev', notas: 30, impostos: 1398 },
    { name: 'Mar', notas: 20, impostos: 9800 },
    { name: 'Abr', notas: 27, impostos: 3908 },
    { name: 'Mai', notas: 18, impostos: 4800 },
    { name: 'Jun', notas: 23, impostos: 3800 },
    { name: 'Jul', notas: 34, impostos: 4300 },
  ];

  const pieData = [
    { name: 'Autorizadas', value: 400 },
    { name: 'Canceladas', value: 30 },
    { name: 'Denegadas', value: 10 },
  ];

  const COLORS = ['#0088FE', '#FF8042', '#FFBB28'];

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="notas" name="Volume de Notas" fill="#8884d8" />
            </ReBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impostos" name="Impostos Recuperados (R$)" stroke="#82ca9d" />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReAreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="notas"
                name="Volume de Notas"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
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
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Total</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">R$ 124.500</h3>
            </div>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <span className="text-xs text-green-600 flex items-center mt-2">
            <TrendingUp size={12} className="mr-1" /> +12% vs mês anterior
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clientes Ativos</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">48</h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <span className="text-xs text-blue-600 mt-2 block">+3 novos este mês</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendências</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">12</h3>
            </div>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
          </div>
          <span className="text-xs text-orange-600 mt-2 block">Requer atenção imediata</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Análise de Desempenho</h3>
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

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Atividades Recentes</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[
              { title: 'Nota Fiscal Emitida', desc: 'NF-e #4590 para Tech Solutions', time: '2 min atrás', color: 'bg-green-500' },
              { title: 'Novo Cliente', desc: 'Cadastro de "Padaria Central" finalizado', time: '2h atrás', color: 'bg-blue-500' },
              { title: 'Alerta de Imposto', desc: 'DAS do Mercado Silva vence hoje', time: '4h atrás', color: 'bg-orange-500' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-2 h-2 mt-2 rounded-full ${item.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
