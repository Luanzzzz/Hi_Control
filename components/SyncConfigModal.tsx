import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Settings2, X } from 'lucide-react';
import type {
  SyncConfiguracaoBase,
  SyncConfiguracaoEmpresaResponse,
  SyncConfiguracaoGeralResponse,
} from '../types';
import {
  getSyncConfiguracaoEmpresa,
  getSyncConfiguracaoGeral,
  updateSyncConfiguracaoEmpresa,
  updateSyncConfiguracaoGeral,
} from '../src/services/syncConfigService';

interface SyncConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: {
    id: string;
    razao_social: string;
    cnpj: string;
  } | null;
  onSaved?: () => void;
}

type TipoNota = 'NFSE' | 'NFE' | 'NFCE' | 'CTE';

const TIPOS_NOTAS: Array<{ value: TipoNota; label: string }> = [
  { value: 'NFSE', label: 'NFS-e (Servicos)' },
  { value: 'NFE', label: 'NF-e (Modelo 55)' },
  { value: 'NFCE', label: 'NFC-e (Consumidor)' },
  { value: 'CTE', label: 'CT-e (Transporte)' },
];

const INTERVALOS_DISPONIVEIS = [1, 2, 3, 4, 6, 8, 12, 24];

const DEFAULT_CONFIG: SyncConfiguracaoBase = {
  auto_sync_ativo: true,
  intervalo_horas: 4,
  prioridade_recente: true,
  reparar_incompletas: true,
  tipos_notas: ['NFSE', 'NFE', 'NFCE', 'CTE'],
  horario_inicio: '00:00:00',
  horario_fim: '23:59:59',
};

const normalizarHorarioInput = (value: string): string => {
  if (!value) return '00:00';
  const partes = value.split(':');
  if (partes.length < 2) return '00:00';
  return `${partes[0]}:${partes[1]}`;
};

const horarioInputParaPayload = (value: string, fallback: string): string => {
  const txt = (value || '').trim();
  if (!txt) return fallback;
  if (/^\d{2}:\d{2}$/.test(txt)) return `${txt}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(txt)) return txt;
  return fallback;
};

const describeTipos = (tipos: TipoNota[]): string => {
  if (!tipos.length) return 'Nenhum';
  return tipos.join(', ');
};

export const SyncConfigModal: React.FC<SyncConfigModalProps> = ({
  isOpen,
  onClose,
  empresa,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [configForm, setConfigForm] = useState<SyncConfiguracaoBase>(DEFAULT_CONFIG);
  const [usarConfiguracaoContador, setUsarConfiguracaoContador] = useState(true);

  const [respostaGeral, setRespostaGeral] = useState<SyncConfiguracaoGeralResponse | null>(null);
  const [respostaEmpresa, setRespostaEmpresa] = useState<SyncConfiguracaoEmpresaResponse | null>(null);

  const modoEmpresa = Boolean(empresa?.id);
  const bloqueadoPorConfigGlobal = modoEmpresa && usarConfiguracaoContador;

  const carregar = async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (modoEmpresa && empresa?.id) {
        const data = await getSyncConfiguracaoEmpresa(empresa.id);
        setRespostaEmpresa(data);
        setUsarConfiguracaoContador(Boolean(data.configuracao_empresa.usar_configuracao_contador));
        setConfigForm({
          auto_sync_ativo: Boolean(data.configuracao_empresa.auto_sync_ativo),
          intervalo_horas: Number(data.configuracao_empresa.intervalo_horas || 4),
          prioridade_recente: Boolean(data.configuracao_empresa.prioridade_recente),
          reparar_incompletas: Boolean(data.configuracao_empresa.reparar_incompletas),
          tipos_notas: (data.configuracao_empresa.tipos_notas || []) as TipoNota[],
          horario_inicio: normalizarHorarioInput(data.configuracao_empresa.horario_inicio || '00:00:00'),
          horario_fim: normalizarHorarioInput(data.configuracao_empresa.horario_fim || '23:59:59'),
        });
      } else {
        const data = await getSyncConfiguracaoGeral();
        setRespostaGeral(data);
        setConfigForm({
          auto_sync_ativo: Boolean(data.configuracao.auto_sync_ativo),
          intervalo_horas: Number(data.configuracao.intervalo_horas || 4),
          prioridade_recente: Boolean(data.configuracao.prioridade_recente),
          reparar_incompletas: Boolean(data.configuracao.reparar_incompletas),
          tipos_notas: (data.configuracao.tipos_notas || []) as TipoNota[],
          horario_inicio: normalizarHorarioInput(data.configuracao.horario_inicio || '00:00:00'),
          horario_fim: normalizarHorarioInput(data.configuracao.horario_fim || '23:59:59'),
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar configuracao de sincronizacao');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, empresa?.id]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);
  }, [isOpen]);

  const configuracaoEfetiva = useMemo(() => {
    if (modoEmpresa && respostaEmpresa) {
      return respostaEmpresa.configuracao_efetiva;
    }
    if (!modoEmpresa && respostaGeral) {
      return respostaGeral.configuracao;
    }
    return null;
  }, [modoEmpresa, respostaEmpresa, respostaGeral]);

  const atualizarCampoBooleano = (campo: keyof SyncConfiguracaoBase, value: boolean) => {
    setConfigForm((prev) => ({ ...prev, [campo]: value }));
  };

  const alternarTipoNota = (tipo: TipoNota, checked: boolean) => {
    setConfigForm((prev) => {
      const atuais = prev.tipos_notas || [];
      if (checked) {
        if (atuais.includes(tipo)) return prev;
        return { ...prev, tipos_notas: [...atuais, tipo] as TipoNota[] };
      }
      const filtrados = atuais.filter((item) => item !== tipo) as TipoNota[];
      return { ...prev, tipos_notas: filtrados.length ? filtrados : (['NFSE'] as TipoNota[]) };
    });
  };

  const salvar = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: Partial<SyncConfiguracaoBase> = {
      auto_sync_ativo: configForm.auto_sync_ativo,
      intervalo_horas: Number(configForm.intervalo_horas || 4),
      prioridade_recente: configForm.prioridade_recente,
      reparar_incompletas: configForm.reparar_incompletas,
      tipos_notas: (configForm.tipos_notas || []) as TipoNota[],
      horario_inicio: horarioInputParaPayload(configForm.horario_inicio, '00:00:00'),
      horario_fim: horarioInputParaPayload(configForm.horario_fim, '23:59:59'),
    };

    try {
      if (modoEmpresa && empresa?.id) {
        const response = await updateSyncConfiguracaoEmpresa(empresa.id, {
          ...payload,
          usar_configuracao_contador: usarConfiguracaoContador,
        });

        setRespostaEmpresa(response);
        setSuccess(response.mensagem || 'Configuracao da empresa atualizada');
      } else {
        const response = await updateSyncConfiguracaoGeral(payload);
        setRespostaGeral(response);
        setSuccess(response.mensagem || 'Configuracao geral atualizada');
      }

      if (onSaved) {
        await onSaved();
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar configuracao');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Settings2 size={18} />
              Configurar Busca de Notas
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {modoEmpresa && empresa
                ? `${empresa.razao_social} (${empresa.cnpj})`
                : 'Configuracao geral aplicada para todos os clientes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 size={18} className="mr-2 animate-spin" />
              Carregando configuracao...
            </div>
          ) : (
            <>
              {modoEmpresa && (
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={usarConfiguracaoContador}
                    onChange={(event) => setUsarConfiguracaoContador(event.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Usar configuracao geral do contador para esta empresa
                  </span>
                </label>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Auto sincronizacao ativa</span>
                  <select
                    value={configForm.auto_sync_ativo ? 'true' : 'false'}
                    onChange={(event) => atualizarCampoBooleano('auto_sync_ativo', event.target.value === 'true')}
                    disabled={bloqueadoPorConfigGlobal}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white disabled:opacity-60"
                  >
                    <option value="true">Ativada</option>
                    <option value="false">Desativada</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Intervalo (horas)</span>
                  <select
                    value={String(configForm.intervalo_horas)}
                    onChange={(event) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        intervalo_horas: Number(event.target.value || 4),
                      }))
                    }
                    disabled={bloqueadoPorConfigGlobal}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white disabled:opacity-60"
                  >
                    {INTERVALOS_DISPONIVEIS.map((valor) => (
                      <option key={valor} value={valor}>
                        A cada {valor}h
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Horario inicio</span>
                  <input
                    type="time"
                    value={configForm.horario_inicio}
                    onChange={(event) =>
                      setConfigForm((prev) => ({ ...prev, horario_inicio: event.target.value }))
                    }
                    disabled={bloqueadoPorConfigGlobal}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white disabled:opacity-60"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Horario fim</span>
                  <input
                    type="time"
                    value={configForm.horario_fim}
                    onChange={(event) =>
                      setConfigForm((prev) => ({ ...prev, horario_fim: event.target.value }))
                    }
                    disabled={bloqueadoPorConfigGlobal}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={configForm.prioridade_recente}
                    onChange={(event) => atualizarCampoBooleano('prioridade_recente', event.target.checked)}
                    disabled={bloqueadoPorConfigGlobal}
                    className="h-4 w-4"
                  />
                  Priorizar notas mais recentes
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={configForm.reparar_incompletas}
                    onChange={(event) => atualizarCampoBooleano('reparar_incompletas', event.target.checked)}
                    disabled={bloqueadoPorConfigGlobal}
                    className="h-4 w-4"
                  />
                  Reprocessar notas incompletas
                </label>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Tipos de nota habilitados</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {TIPOS_NOTAS.map((tipo) => (
                    <label key={tipo.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={configForm.tipos_notas.includes(tipo.value)}
                        onChange={(event) => alternarTipoNota(tipo.value, event.target.checked)}
                        disabled={bloqueadoPorConfigGlobal}
                        className="h-4 w-4"
                      />
                      {tipo.label}
                    </label>
                  ))}
                </div>
              </div>

              {configuracaoEfetiva && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                  <p className="font-semibold">Configuracao efetiva:</p>
                  <p>
                    Auto sync: {configuracaoEfetiva.auto_sync_ativo ? 'ativo' : 'desativado'} | Intervalo: {configuracaoEfetiva.intervalo_horas}h | Tipos: {describeTipos(configuracaoEfetiva.tipos_notas as TipoNota[])}
                  </p>
                </div>
              )}

              {respostaEmpresa?.janela_execucao && (
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Janela atual: {respostaEmpresa.janela_execucao.agora_na_janela ? 'dentro da janela' : 'fora da janela'} | Proxima janela (UTC): {respostaEmpresa.janela_execucao.proximo_inicio_janela_utc}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {success}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Fechar
          </button>
          <button
            onClick={salvar}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Salvar configuracao
          </button>
        </div>
      </div>
    </div>
  );
};
