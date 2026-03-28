import React, { useEffect, useState } from 'react';
import { ViewState } from '../../../types';
import api from '../../services/api';

interface Empresa {
  id: string;
  razao_social: string;
  cnpj: string;
  regime_tributario?: string;
}

interface CertStatus {
  status: 'ativo' | 'expirando' | 'vencido' | 'ausente';
}

interface EmpresaComCert extends Empresa {
  certStatus: CertStatus['status'] | 'carregando';
}

interface ClientesFiscalTableProps {
  setView: (view: ViewState) => void;
}

function maskCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`;
}

const certBadgeClass: Record<CertStatus['status'], string> = {
  ativo: 'bg-green-500/15 text-hc-green',
  expirando: 'bg-amber-500/15 text-hc-amber',
  vencido: 'bg-red-500/15 text-hc-red',
  ausente: 'bg-red-500/15 text-hc-red',
};

const certLabel: Record<CertStatus['status'], string> = {
  ativo: 'Ativo',
  expirando: 'Expirando',
  vencido: 'Vencido',
  ausente: 'Ausente',
};

export const ClientesFiscalTable: React.FC<ClientesFiscalTableProps> = ({ setView }) => {
  const [empresas, setEmpresas] = useState<EmpresaComCert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const response = await api.get<Empresa[]>('/empresas');
        const lista: Empresa[] = Array.isArray(response.data) ? response.data : [];

        // Inicializa com status carregando
        setEmpresas(lista.map((e) => ({ ...e, certStatus: 'carregando' })));

        // Busca status de certificado de todas as empresas em paralelo
        const certResults = await Promise.allSettled(
          lista.map((e) =>
            api.get<CertStatus>(`/nfe/empresas/${e.id}/certificado/status`)
          )
        );

        setEmpresas(
          lista.map((empresa, i) => {
            const result = certResults[i];
            const certStatus: CertStatus['status'] =
              result.status === 'fulfilled'
                ? result.value.data.status
                : 'ausente';
            return { ...empresa, certStatus };
          })
        );
      } catch {
        setEmpresas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);

  return (
    <div
      className="bg-hc-card border border-hc-border rounded-xl p-4 flex flex-col gap-3"
      aria-label="Tabela de Clientes Fiscais"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-hc-muted uppercase tracking-wide">Clientes Fiscais</p>
        <button
          onClick={() => setView(ViewState.USERS)}
          className="text-[11px] text-hc-accent hover:text-hc-purple-light transition-colors"
          aria-label="Ver todos os clientes"
        >
          Ver todos →
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-hc-purple border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <p className="text-[12px] text-hc-muted">Nenhuma empresa cadastrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Lista de clientes fiscais">
            <thead>
              <tr className="border-b border-hc-border">
                <th className="text-left text-[11px] text-hc-muted uppercase pb-2 pr-3 font-medium">Empresa</th>
                <th className="text-left text-[11px] text-hc-muted uppercase pb-2 pr-3 font-medium">CNPJ</th>
                <th className="text-left text-[11px] text-hc-muted uppercase pb-2 pr-3 font-medium">Regime</th>
                <th className="text-left text-[11px] text-hc-muted uppercase pb-2 font-medium">Cert.</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="border-b border-hc-border last:border-0 hover:bg-hc-purple/5 transition-colors"
                >
                  <td className="text-[12px] text-hc-text py-2 pr-3 max-w-[140px] truncate" title={empresa.razao_social}>
                    {empresa.razao_social}
                  </td>
                  <td className="text-[12px] text-hc-muted py-2 pr-3 whitespace-nowrap">
                    {maskCNPJ(empresa.cnpj)}
                  </td>
                  <td className="text-[12px] text-hc-muted py-2 pr-3">
                    {empresa.regime_tributario ?? '—'}
                  </td>
                  <td className="py-2">
                    {empresa.certStatus === 'carregando' ? (
                      <span className="text-[10px] text-hc-muted">...</span>
                    ) : (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${certBadgeClass[empresa.certStatus]}`}
                        aria-label={`Status certificado: ${certLabel[empresa.certStatus]}`}
                      >
                        {certLabel[empresa.certStatus]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
