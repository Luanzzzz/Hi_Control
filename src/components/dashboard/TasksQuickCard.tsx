import React, { useEffect, useState } from 'react';
import { ViewState } from '../../../types';
import api from '../../services/api';

interface TarefaPendente {
  id: string;
  texto: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

interface TasksQuickCardProps {
  setView: (view: ViewState) => void;
}

const prioridadeDotClass: Record<TarefaPendente['prioridade'], string> = {
  alta: 'bg-hc-red',
  media: 'bg-hc-amber',
  baixa: 'bg-hc-green',
};

const prioridadeLabel: Record<TarefaPendente['prioridade'], string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export const TasksQuickCard: React.FC<TasksQuickCardProps> = ({ setView }) => {
  const [tarefas, setTarefas] = useState<TarefaPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTarefas = async () => {
      try {
        const response = await api.get<TarefaPendente[]>('/tarefas', {
          params: { status: 'pendente', limit: 5 },
        });
        setTarefas(Array.isArray(response.data) ? response.data : []);
      } catch {
        // Endpoint pode não existir ainda — fallback silencioso
        setTarefas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTarefas();
  }, []);

  return (
    <div
      className="bg-hc-card border border-hc-border rounded-xl p-4 flex flex-col gap-3"
      aria-label="Tarefas Rápidas"
      style={{ width: 300 }}
    >
      <p className="text-[11px] text-hc-muted uppercase tracking-wide">Tarefas Rápidas</p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-hc-purple border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
        </div>
      ) : tarefas.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <p className="text-[12px] text-hc-muted">Nenhuma tarefa pendente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tarefas.map((tarefa) => (
            <div key={tarefa.id} className="flex items-center gap-2 py-1">
              <div
                className="w-4 h-4 shrink-0 rounded-full border border-hc-border"
                aria-label="Checkbox tarefa"
              />
              <p className="flex-1 text-[12px] text-hc-text truncate">{tarefa.texto}</p>
              <span
                className={`shrink-0 w-2 h-2 rounded-full ${prioridadeDotClass[tarefa.prioridade]}`}
                aria-label={`Prioridade: ${prioridadeLabel[tarefa.prioridade]}`}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setView(ViewState.TASKS)}
        className="mt-auto text-[11px] text-hc-accent hover:text-hc-purple-light transition-colors text-left"
        aria-label="Ver todas as tarefas"
      >
        Ver todas as tarefas →
      </button>
    </div>
  );
};
