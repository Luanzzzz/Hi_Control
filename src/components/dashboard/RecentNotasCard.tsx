import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface NotaRecente {
  chave_acesso: string;
  tipo: string;
  nome_emitente: string;
  cnpj_emitente: string;
  numero_nf: string;
  valor_total: number;
  data_emissao: string;
  status?: string;
}

interface BuscarResponse {
  notas: NotaRecente[];
}

function maskCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

type TipoNota = 'NF-e' | 'NFS-e' | 'CT-e' | 'Rejeitada';

const tipoBadgeClass: Record<string, string> = {
  'NF-e': 'bg-purple-500/20 text-hc-purple-light',
  'NFS-e': 'bg-green-500/20 text-hc-green',
  'CT-e': 'bg-amber-500/20 text-hc-amber',
  'Rejeitada': 'bg-red-500/20 text-hc-red',
};

function getTipoBadgeClass(tipo: string): string {
  return tipoBadgeClass[tipo as TipoNota] ?? 'bg-hc-border text-hc-muted';
}

export const RecentNotasCard: React.FC = () => {
  const [notas, setNotas] = useState<NotaRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotas = async () => {
      try {
        const hoje = new Date();
        const trintaDiasAtras = new Date(hoje);
        trintaDiasAtras.setDate(hoje.getDate() - 30);

        const response = await api.post<BuscarResponse>('/nfe/buscar', {
          data_inicio: trintaDiasAtras.toISOString(),
          data_fim: hoje.toISOString(),
          limit: 4,
        });

        setNotas(response.data?.notas?.slice(0, 4) ?? []);
      } catch {
        setNotas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotas();
  }, []);

  return (
    <div
      className="bg-hc-card border border-hc-border rounded-xl p-4 flex flex-col gap-3"
      aria-label="Notas Recentes"
    >
      <p className="text-[11px] text-hc-muted uppercase tracking-wide">Notas Recentes</p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-hc-purple border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
        </div>
      ) : notas.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <p className="text-[12px] text-hc-muted">Nenhuma nota nos últimos 30 dias</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notas.map((nota) => (
            <div
              key={nota.chave_acesso}
              className="flex items-center gap-2 py-1.5 border-b border-hc-border last:border-0"
            >
              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${getTipoBadgeClass(nota.tipo)}`}>
                {nota.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-hc-text truncate max-w-[140px]" title={nota.nome_emitente}>
                  {nota.nome_emitente}
                </p>
                <p className="text-[10px] text-hc-muted">{maskCNPJ(nota.cnpj_emitente)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-hc-text font-medium">{formatBRL(nota.valor_total)}</p>
                <p className="text-[10px] text-hc-muted">{formatDate(nota.data_emissao)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
