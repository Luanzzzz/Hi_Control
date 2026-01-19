import React from 'react';
import { DollarSign, Users, AlertCircle, TrendingUp } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="space-y-6">
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