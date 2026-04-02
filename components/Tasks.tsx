import React from 'react';
import { Circle, Clock, Tag } from 'lucide-react';
import { PageHeader } from '../src/components/ui';

export const Tasks = () => {
  const tasks = [
    { id: 1, title: 'Fechar folha de pagamento - Tech Solutions', due: 'Hoje', tag: 'RH', priority: 'high' },
    { id: 2, title: 'Enviar guia DAS - Mercado Silva', due: 'Amanhã', tag: 'Fiscal', priority: 'high' },
    { id: 3, title: 'Reunião de alinhamento mensal', due: '16/03', tag: 'Interno', priority: 'medium' },
    { id: 4, title: 'Conciliação bancária - Dra. Ana', due: '18/03', tag: 'Contábil', priority: 'medium' },
    { id: 5, title: 'Atualizar certidões negativas', due: '20/03', tag: 'Legal', priority: 'low' },
  ];

  const priorityDot: Record<string, string> = {
    high: 'bg-hc-red',
    medium: 'bg-hc-amber',
    low: 'bg-hc-info',
  };

  return (
    <div className="p-6">
      <PageHeader title="Tarefas" subtitle="Acompanhe suas obrigações e prazos" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="bg-hc-surface rounded-xl border border-hc-border" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div className="flex justify-between items-center px-5 py-4 border-b border-hc-border">
              <h2 className="text-sm font-semibold text-hc-text">Minhas Tarefas</h2>
              <button className="text-xs text-hc-accent hover:text-hc-purple-light font-medium transition-colors">
                Ver todas
              </button>
            </div>

            <div className="divide-y divide-hc-border">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-hc-hover transition-colors group"
                >
                  <button className="text-hc-muted hover:text-hc-purple transition-colors shrink-0" aria-label="Marcar como concluída">
                    <Circle size={18} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-hc-text group-hover:text-hc-purple transition-colors truncate">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-hc-muted">
                        <Clock size={11} /> {task.due}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-hc-muted">
                        <Tag size={11} /> {task.tag}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[task.priority]}`}
                    aria-label={`Prioridade ${task.priority}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-gradient-to-br from-hc-purple to-primary-700 rounded-xl p-5 text-white" style={{ boxShadow: 'var(--hc-shadow-md)' }}>
            <h3 className="font-semibold text-base mb-2">Produtividade</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold">85%</span>
              <span className="text-white/70 text-sm mb-1">concluídas</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-white w-[85%] h-full rounded-full" />
            </div>
            <p className="text-white/60 text-xs mt-3">
              {tasks.filter((_, i) => i < 2).length} tarefas urgentes hoje
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
