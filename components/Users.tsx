import React from 'react';
import { Mail, Phone, Building, MoreHorizontal } from 'lucide-react';

export const Users = () => {
  const users = [
    { id: 1, name: 'João Silva', company: 'Tech Solutions Ltda', role: 'Sócio Administrador', email: 'joao@techsolutions.com', status: 'Ativo' },
    { id: 2, name: 'Maria Oliveira', company: 'Mercado Silva', role: 'Gerente Financeiro', email: 'financeiro@mercadosilva.com', status: 'Ativo' },
    { id: 3, name: 'Ana Paula', company: 'Consultório Dra. Ana', role: 'Proprietária', email: 'contato@draana.com', status: 'Pendente' },
    { id: 4, name: 'Carlos Santos', company: 'Padaria Central', role: 'Proprietário', email: 'carlos@padariacentral.com', status: 'Inativo' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map((user) => (
        <div key={user.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300">
              {user.name.charAt(0)}
            </div>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <MoreHorizontal size={20} />
            </button>
          </div>
          
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{user.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{user.role}</p>
          
          <div className="space-y-2 mb-6 flex-1">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Building size={16} className="mr-2 text-gray-400" />
              {user.company}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Mail size={16} className="mr-2 text-gray-400" />
              {user.email}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              user.status === 'Ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              user.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {user.status}
            </span>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver Perfil</button>
          </div>
        </div>
      ))}
    </div>
  );
};