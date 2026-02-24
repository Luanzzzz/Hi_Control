import api from './api';
import type {
  SyncConfiguracaoBase,
  SyncConfiguracaoEmpresaResponse,
  SyncConfiguracaoGeralResponse,
} from '../../types';

type SyncConfiguracaoEmpresaPayload = Partial<SyncConfiguracaoBase> & {
  usar_configuracao_contador?: boolean;
};

interface SyncConfigGeralUpdateResponse extends SyncConfiguracaoGeralResponse {
  mensagem: string;
}

interface SyncConfigEmpresaUpdateResponse extends SyncConfiguracaoEmpresaResponse {
  mensagem: string;
}

export async function getSyncConfiguracaoGeral(): Promise<SyncConfiguracaoGeralResponse> {
  const response = await api.get<SyncConfiguracaoGeralResponse>('/sync/configuracoes/geral');
  return response.data;
}

export async function updateSyncConfiguracaoGeral(
  payload: Partial<SyncConfiguracaoBase>
): Promise<SyncConfigGeralUpdateResponse> {
  const response = await api.put<SyncConfigGeralUpdateResponse>('/sync/configuracoes/geral', payload);
  return response.data;
}

export async function getSyncConfiguracaoEmpresa(
  empresaId: string
): Promise<SyncConfiguracaoEmpresaResponse> {
  const response = await api.get<SyncConfiguracaoEmpresaResponse>(`/sync/empresas/${empresaId}/configuracao`);
  return response.data;
}

export async function updateSyncConfiguracaoEmpresa(
  empresaId: string,
  payload: SyncConfiguracaoEmpresaPayload
): Promise<SyncConfigEmpresaUpdateResponse> {
  const response = await api.put<SyncConfigEmpresaUpdateResponse>(`/sync/empresas/${empresaId}/configuracao`, payload);
  return response.data;
}
