import React, { useEffect, useRef, useState } from 'react';
import { FileText, Download, RefreshCw, FolderOpen } from 'lucide-react';
import { formatarMoeda, formatarData } from '../src/services/notaFiscalService';
import { buscarNotasDrive, sincronizarDrive, type NotaDrive } from '../src/services/driveService';
import { Button, PageHeader, LoadingState, EmptyState, InlineAlert } from '../src/components/ui';

interface InvoicesProps {
  empresaId?: string;
}

const getStatusClass = (situacao: string | null): string => {
  if (!situacao) return 'bg-hc-card text-hc-muted border border-hc-border';
  const s = situacao.toLowerCase();
  if (s.includes('autoriz') || s === 'pago') return 'bg-hc-success/15 text-hc-success border border-hc-success/25';
  if (s.includes('pendent') || s.includes('aguard')) return 'bg-hc-amber/15 text-hc-amber border border-hc-amber/25';
  if (s.includes('cancel') || s.includes('deneg') || s === 'atrasado') return 'bg-hc-red/15 text-hc-red border border-hc-red/25';
  return 'bg-hc-card text-hc-muted border border-hc-border';
};

export const Invoices = ({ empresaId }: InvoicesProps) => {
  const [notas, setNotas] = useState<NotaDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizar = async () => {
    if (!empresaId) return;
    try {
      setSincronizando(true);
      await sincronizarDrive(empresaId);
      syncTimeoutRef.current = setTimeout(carregarNotas, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSincronizando(false);
    }
  };

  useEffect(() => {
    carregarNotas();
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [empresaId]);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Arquivo de Documentos"
        subtitle="Documentos fiscais importados via Google Drive"
        actions={
          <div className="flex items-center gap-2">
            {/* Source badge — diferencia visualmente do buscador SEFAZ */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-hc-info/10 text-hc-info border border-hc-info/25 rounded-full text-xs font-medium">
              <FolderOpen size={12} />
              Google Drive
            </span>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={13} />}
              loading={sincronizando}
              disabled={sincronizando || !empresaId}
              onClick={handleSincronizar}
            >
              Sincronizar
            </Button>
          </div>
        }
      />

      {error && (
        <InlineAlert variant="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="bg-hc-surface rounded-xl border border-hc-border overflow-hidden" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <div className="px-5 py-3.5 border-b border-hc-border flex items-center justify-between">
          <span className="text-sm font-semibold text-hc-text">
            Documentos{notas.length > 0 ? ` (${notas.length})` : ''}
          </span>
          <span className="text-xs text-hc-muted">
            Fonte: pasta do Google Drive do cliente
          </span>
        </div>

        {loading ? (
          <LoadingState message="Carregando documentos..." className="py-12" />
        ) : notas.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title="Nenhum documento encontrado"
            description={
              empresaId
                ? 'Configure o Google Drive do cliente para importar documentos fiscais.'
                : 'Selecione uma empresa para visualizar os documentos.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-hc-card text-hc-muted">
                <tr>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">Número</th>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">Tipo</th>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">Emitente</th>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">Valor</th>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">Emissão</th>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">Status</th>
                  <th className="px-5 py-3 font-medium text-xs tracking-wide">XML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hc-border">
                {notas.map((nota) => (
                  <tr key={nota.drive_file_id} className="hover:bg-hc-hover transition-colors">
                    <td className="px-5 py-3.5 text-hc-text font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-hc-muted shrink-0" />
                        {nota.numero || 'S/N'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-hc-muted text-xs">{nota.tipo}</td>
                    <td className="px-5 py-3.5 text-hc-text text-sm">
                      {nota.nome_emitente || nota.cnpj_emitente || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-hc-text font-medium">
                      {formatarMoeda(nota.valor_total)}
                    </td>
                    <td className="px-5 py-3.5 text-hc-muted text-xs">
                      {nota.data_emissao ? formatarData(nota.data_emissao) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(nota.situacao)}`}>
                        {nota.situacao || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        className="p-1.5 hover:bg-hc-hover rounded-lg transition-colors"
                        title="Baixar XML"
                      >
                        <Download size={15} className="text-hc-muted" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
