import React from 'react';
import { Plus, Calendar, User, MoreHorizontal, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '../types';

export const Tasks: React.FC = () => {
  const tasks: Task[] = [
    { id: '1', title: 'Fechar balanço mensal Tech Solutions', assignee: 'Ana Silva', priority: 'Alta', status: 'Em Progresso', dueDate: 'Hoje' },
    { id: '2', title: 'Emitir guias de DAS - Cliente X', assignee: 'Carlos B.', priority: 'Média', status: 'A Fazer', dueDate: 'Amanhã' },
    { id: '3', title: 'Reunião de alinhamento fiscal', assignee: 'Todos', priority: 'Baixa', status: 'A Fazer', dueDate: '30/10' },
    { id: '4', title: 'Atualizar certificado digital Transportadora', assignee: 'Ana Silva', priority: 'Alta', status: 'Concluída', dueDate: '25/10' },
  ];

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Alta': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Média': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Tarefas</h1>
          <p className="text-gray-500 dark:text-gray-400">Organize o trabalho do escritório contábil.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/30">
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['A Fazer', 'Em Progresso', 'Concluída'].map((status) => (
          <div key={status} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col h-full border border-gray-200 dark:border-slate-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-between">
              {status}
              <span className="bg-gray-200 dark:bg-slate-700 text-xs px-2 py-1 rounded-full text-gray-600 dark:text-gray-300">
                {tasks.filter(t => t.status === status).length}
              </span>
            </h3>
            
            <div className="space-y-3">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-3 group-hover:text-primary-600 transition-colors">
                    {task.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {task.dueDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      {task.assignee}
                    </div>
                  </div>
                </div>
              ))}
              {status === 'A Fazer' && (
                <button className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-500 dark:text-gray-400 text-sm font-medium hover:border-primary-500 hover:text-primary-500 transition-colors">
                  + Adicionar Item
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};