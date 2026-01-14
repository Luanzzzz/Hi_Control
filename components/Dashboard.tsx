import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Users, FileText, CheckCircle } from 'lucide-react';

const data = [
  { name: 'Jan', notas: 4000, tarefas: 2400 },
  { name: 'Fev', notas: 3000, tarefas: 1398 },
  { name: 'Mar', notas: 2000, tarefas: 9800 },
  { name: 'Abr', notas: 2780, tarefas: 3908 },
  { name: 'Mai', notas: 1890, tarefas: 4800 },
  { name: 'Jun', notas: 2390, tarefas: 3800 },
];

const StatCard = ({ title, value, trend, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
    <div className="flex items-center mt-4 text-sm">
      <span className={`flex items-center font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
        {Math.abs(trend)}%
      </span>
      <span className="text-gray-400 ml-2">vs mês anterior</span>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h1>
        <p className="text-gray-500 dark:text-gray-400">Bem-vindo ao Hi Control Dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Notas Emitidas" value="R$ 124.500" trend={12.5} icon={FileText} color="bg-blue-500" />
        <StatCard title="Tarefas Concluídas" value="86" trend={-2.4} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Novos Clientes" value="12" trend={8.1} icon={Users} color="bg-purple-500" />
        <StatCard title="NFS-e Pendentes" value="14" trend={0.5} icon={FileText} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Emissão de Notas (Semestral)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="notas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Produtividade</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="tarefas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};