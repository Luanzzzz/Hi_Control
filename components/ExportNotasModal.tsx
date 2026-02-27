import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Download, FileSpreadsheet, Loader2, X } from 'lucide-react';
import type { ExportColumn, ExportNotasConfig } from '../src/services/notasExportService';

interface ExportNotasModalProps {
  isOpen: boolean;
  loading?: boolean;
  totalNotas: number;
  config: ExportNotasConfig;
  driveConnected?: boolean;
  connectingDrive?: boolean;
  onConnectDrive?: () => Promise<void> | void;
  onClose: () => void;
  onConfirm: (config: ExportNotasConfig) => Promise<void> | void;
}

export const ExportNotasModal: React.FC<ExportNotasModalProps> = ({
  isOpen,
  loading = false,
  totalNotas,
  config,
  driveConnected = false,
  connectingDrive = false,
  onConnectDrive,
  onClose,
  onConfirm,
}) => {
  const [draft, setDraft] = useState<ExportNotasConfig>(config);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(config);
  }, [config, isOpen]);

  const colunasAtivas = useMemo(() => draft.columns.filter((col) => col.enabled).length, [draft.columns]);

  const atualizarColuna = (key: string, enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => (col.key === key ? { ...col, enabled } : col)),
    }));
  };

  const selecionarTodasColunas = (enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => ({ ...col, enabled })),
    }));
  };

  const handleConfirm = async () => {
    if (draft.destination === 'local' && colunasAtivas === 0) return;
    if (draft.destination === 'google_drive' && !driveConnected) return;
    await onConfirm(draft);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configurar Exportacao</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Modelo padrao Excel Hi-Control com liberdade total de configuracao
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[75vh] grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <FileSpreadsheet size={15} />
                Formato e Escopo
              </h4>

              <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Destino da exportacao
                <select
                  value={draft.destination}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      destination: event.target.value as ExportNotasConfig['destination'],
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="local">Baixar na minha maquina</option>
                  <option value="google_drive">Enviar para Google Drive</option>
                </select>
              </label>

              {draft.destination === 'google_drive' && (
                <div className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Exportacao em massa de XML por cliente
                    </p>
                    {!driveConnected && onConnectDrive && (
                      <button
                        type="button"
                        onClick={onConnectDrive}
                        disabled={connectingDrive}
                        className="rounded-md border border-primary-500 px-2 py-1 text-[11px] font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-60 dark:hover:bg-primary-900/20"
                      >
                        {connectingDrive ? 'Conectando...' : 'Conectar Drive'}
                      </button>
                    )}
                  </div>

                  <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {driveConnected
                      ? 'Drive conectado. O sistema criara/atualizara pastas por cliente e mes automaticamente.'
                      : 'Conecte o Google Drive para habilitar envio direto sem baixar no computador.'}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.driveOrganizarPorMes}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, driveOrganizarPorMes: event.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      Organizar por mes (YYYY-MM)
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.driveSepararPorOperacao}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, driveSepararPorOperacao: event.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      Separar por operacao (Prestadas/Tomadas)
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.driveSobrescreverArquivos}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, driveSobrescreverArquivos: event.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      Sobrescrever arquivos ja existentes
                    </label>
                  </div>
                </div>
              )}

              <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Nome do arquivo
                <input
                  type="text"
                  value={draft.filename}
                  onChange={(event) => setDraft((prev) => ({ ...prev, filename: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </label>

              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Formato
                  <select
                    value={draft.format}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        format: event.target.value as ExportNotasConfig['format'],
                      }))
                    }
                    disabled={draft.destination === 'google_drive'}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (Excel compativel)</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Escopo
                  <select
                    value={draft.scope}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        scope: event.target.value as ExportNotasConfig['scope'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="pagina">Pagina atual ({Math.min(totalNotas, 20)} registros)</option>
                    <option value="todas_filtradas">Todas as filtradas ({totalNotas} registros)</option>
                  </select>
                </label>
              </div>

              {draft.destination === 'local' && draft.format === 'csv' && (
                <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Separador CSV
                  <select
                    value={draft.csvDelimiter}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        csvDelimiter: event.target.value as ExportNotasConfig['csvDelimiter'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value=";">Ponto e virgula (;)</option>
                    <option value=",">Virgula (,)</option>
                    <option value="\t">Tabulacao</option>
                  </select>
                </label>
              )}

              <div className="grid grid-cols-1 gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.includeSummarySheet}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, includeSummarySheet: event.target.checked }))
                    }
                    disabled={draft.destination === 'google_drive'}
                    className="h-4 w-4"
                  />
                  Incluir aba "Resumo" (modelo Hi-Control)
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.includeMetadata}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, includeMetadata: event.target.checked }))
                    }
                    disabled={draft.destination === 'google_drive'}
                    className="h-4 w-4"
                  />
                  Incluir metadados de filtros e periodo
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
              <p className="font-semibold">Modelo padrao "Top Excel" ativo</p>
              <p>
                Aba Resumo + Aba Notas, cabecalhos organizados, colunas ajustadas e compatibilidade nativa com Excel.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Colunas da exportacao</h4>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => selecionarTodasColunas(true)}
                  className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Marcar todas
                </button>
                <button
                  onClick={() => selecionarTodasColunas(false)}
                  className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Limpar
                </button>
              </div>
            </div>

            {draft.destination === 'local' ? (
              <>
                <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  {colunasAtivas} de {draft.columns.length} colunas selecionadas
                </div>

                <div className="grid max-h-[48vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {draft.columns.map((coluna: ExportColumn) => (
                    <label
                      key={coluna.key}
                      className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={coluna.enabled}
                        onChange={(event) => atualizarColuna(coluna.key, event.target.checked)}
                        className="h-4 w-4"
                      />
                      {coluna.label}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                Para exportacao em Google Drive, o sistema envia os XMLs em massa e ignora configuracoes de colunas/planilha.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CheckSquare size={13} />
              {draft.destination === 'local'
                ? `Pronto para exportar ${draft.scope === 'pagina' ? 'a pagina atual' : `ate ${totalNotas} notas filtradas`}`
                : 'Pronto para enviar XMLs em massa para Google Drive'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                loading ||
                (draft.destination === 'local' && colunasAtivas === 0) ||
                (draft.destination === 'google_drive' && !driveConnected)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {draft.destination === 'local' ? 'Exportar agora' : 'Enviar para Drive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
