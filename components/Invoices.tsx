import React, { useState } from 'react';
import { Search, Plus, Filter, Download, MoreVertical, FileCheck, RefreshCw } from 'lucide-react';
import { Invoice } from '../types';

export const Invoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'emit'>('search');
  const [invoices] = useState<Invoice[]>([
    { id: '1', number: '001234', client: 'Tech Solutions LTDA', amount: 4500.00, status: 'Emitida', type: 'NFS-e', date: '2023-10-25', state: 'SP' },
    { id: '2', number: '001235', client: 'Mercado Silva', amount: 1250.50, status: 'Pendente', type: 'NF-e', date: '2023-10-26', state: 'RJ' },
    { id: '3', number: '001236', client: 'Transportadora Veloz', amount: 8900.00, status: 'Emitida', type: 'CT-e', date: '2023-10-26', state: 'MG' },
    { id: '4', number: '000054', client: 'Consumidor Final', amount: 45.90, status: 'Cancelada', type: 'NFC-e', date: '2023-10-27', state: 'SP' },
  ]);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Notas Fiscais</h1>
          <p className="text-gray-500 dark:text-gray-400">Emissão e controle de NF-e, NFS-e, NFC-e e CT-e.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'search' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600'}`}
          >
            Buscar Notas
          </button>
          <button 
             onClick={() => setActiveTab('emit')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'emit' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600'}`}
          >
            Emitir Nova
          </button>
        </div>
      </div>

      {activeTab === 'search' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por número, cliente ou valor..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-white"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-gray-200">
                <Filter size={16} /> Filtros
              </button>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-gray-200">
                <Download size={16} /> Exportar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">UF</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">#{inv.number}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{inv.client}</td>
                    <td className="px-6 py-4">{inv.state}</td>
                    <td className="px-6 py-4 text-slate-800 dark:text-white font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex w-fit items-center gap-1
                        ${inv.status === 'Emitida' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          inv.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                         {inv.status === 'Emitida' && <FileCheck size={12}/>}
                         {inv.status === 'Pendente' && <RefreshCw size={12}/>}
                         {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 max-w-4xl mx-auto w-full">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
              Nova Emissão
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Nota</label>
                    <select className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                        <option>NF-e (Produto)</option>
                        <option>NFS-e (Serviço)</option>
                        <option>NFC-e (Consumidor)</option>
                        <option>CT-e (Transporte)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado (UF)</label>
                    <select className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                        <option>São Paulo (SP)</option>
                        <option>Rio de Janeiro (RJ)</option>
                        <option>Minas Gerais (MG)</option>
                        <option>Todos os outros...</option>
                    </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destinatário (CPF/CNPJ)</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="00.000.000/0000-00" className="flex-1 p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"/>
                        <button className="bg-gray-100 dark:bg-slate-700 px-4 rounded-lg font-medium text-sm">Buscar</button>
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white pt-2">Itens / Serviços</h3>
                  <div className="border border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-full mb-3 text-primary-600">
                          <Plus size={24} />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Adicionar produto ou serviço</p>
                      <p className="text-xs text-gray-500">Ou importe de um XML</p>
                  </div>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={() => setActiveTab('search')}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                    Cancelar
                </button>
                <button className="px-6 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/30">
                    Emitir Nota Fiscal
                </button>
            </div>
        </div>
      )}
    </div>
  );
};