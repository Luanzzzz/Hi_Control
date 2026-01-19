import React from 'react';
import { CheckCircle2, Circle, Clock, Tag } from 'lucide-react';

export const Tasks = () => {
  const tasks = [
    { id: 1, title: 'Fechar folha de pagamento - Tech Solutions', due: 'Hoje', tag: 'RH', priority: 'high' },
    { id: 2, title: 'Enviar guia DAS - Mercado Silva', due: 'Amanhã', tag: 'Fiscal', priority: 'high' },
    { id: 3, title: 'Reunião de alinhamento mensal', due: '16/03', tag: 'Interno', priority: 'medium' },
    { id: 4, title: 'Conciliação bancária - Dra. Ana', due: '18/03', tag: 'Contábil', priority: 'medium' },
    { id: 5, title: 'Atualizar certidões negativas', due: '20/03', tag: 'Legal', priority: 'low' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-white">Minhas Tarefas</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver todas</button>
          </div>
          
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all group">
                <button className="text-gray-400 hover:text-primary-600">
                  <Circle size={20} />
                </button>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{task.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" /> {task.due}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                      <Tag size={12} className="mr-1" /> {task.tag}
                    </span>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${
                  task.priority === 'high' ? 'bg-red-500' : 
                  task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gradient-to-br from-primary-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
          <h3 className="font-bold text-lg mb-2">Produtividade</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-bold">85%</span>
            <span className="text-primary-100 mb-1">das tarefas concluídas</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white w-[85%] h-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};