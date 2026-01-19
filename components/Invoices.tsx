import React from 'react';
import { FileText, Download, MoreVertical } from 'lucide-react';

export const Invoices = () => {
  const invoices = [
    { id: 'NF-2026-001', client: 'Tech Solutions Ltda', amount: 'R$ 5.400,00', date: '14/01/2026', status: 'Pago' },
    { id: 'NF-2026-002', client: 'Mercado Silva', amount: 'R$ 2.150,00', date: '13/01/2026', status: 'Pendente' },
    { id: 'NF-2026-003', client: 'Consultório Dra. Ana', amount: 'R$ 8.900,00', date: '12/01/2026', status: 'Pago' },
    { id: 'NF-2026-004', client: 'Padaria Central', amount: 'R$ 1.200,00', date: '10/01/2026', status: 'Atrasado' },
    { id: 'NF-2026-005', client: 'DevSoft Sistemas', amount: 'R$ 12.000,00', date: '08/01/2026', status: 'Pago' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900 dark:text-white">Últimas Notas Fiscais</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
          Nova Nota
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">Número</th>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Valor</th>
              <th className="px-6 py-4 font-medium">Emissão</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  {invoice.id}
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{invoice.client}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{invoice.amount}</td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{invoice.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${invoice.status === 'Pago' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      invoice.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <button className="hover:text-primary-600"><Download size={18} /></button>
                    <button className="hover:text-gray-600"><MoreVertical size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};