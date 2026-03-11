import React, { useEffect, useState } from 'react';
import { FileText, Download, MoreVertical, RefreshCw, Loader2 } from 'lucide-react';
import { buscarNotasDrive, sincronizarDrive, formatarMoeda, formatarData, type NotaDrive } from '../src/services/notaFiscalService';

interface InvoicesProps {
  empresaId?: string;
}

export const Invoices = ({ empresaId }: InvoicesProps) => {
  const [notas, setNotas] = useState<NotaDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarNotas = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dados = await buscarNotasDrive(empresaId);
      setNotas(dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizar = async () => {
    if (!empresaId) return;

    try {
      setSincronizando(true);
      await sincronizarDrive(empresaId);
      // Recarregar notas apos sincronizacao
      setTimeout(carregarNotas, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSincronizando(false);
    }
  };

  useEffect(() => {
    carregarNotas();
  }, [empresaId]);

  const getStatusColor = (situacao: string | null) => {
    if (!situacao) return 'bg-gray-100 text-gray-700';
    const s = situacao.toLowerCase();
    if (s.includes('autoriz') || s === 'pago') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (s.includes('pendent') || s.includes('aguard')) {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    if (s.includes('cancel') || s.includes('deneg') || s === 'atrasado') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Notas Fiscais</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {notas.length} notas encontradas no Google Drive
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSincronizar}
            disabled={sincronizando || !empresaId}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            {sincronizando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Sincronizar
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            Nova Nota
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-primary-600" />
          <p className="text-gray-500 mt-2">Carregando notas...</p>
        </div>
      ) : notas.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma nota encontrada</p>
          <p className="text-sm mt-2">
            {empresaId
              ? 'Configure o Google Drive para importar suas notas'
              : 'Selecione uma empresa para ver as notas'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Número</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Emitente</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Emissão</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {notas.map((nota) => (
                <tr key={nota.drive_file_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    {nota.numero || 'S/N'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{nota.tipo}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {nota.nome_emitente || nota.cnpj_emitente || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                    {formatarMoeda(nota.valor_total)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {nota.data_emissao ? formatarData(nota.data_emissao) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(nota.situacao)}`}>
                      {nota.situacao || 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <button className="hover:text-primary-600" title="Baixar XML">
                        <Download size={18} />
                      </button>
                      <button className="hover:text-gray-600">
                        <MoreVertical size={18} />
                      </button>
                    </div>
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