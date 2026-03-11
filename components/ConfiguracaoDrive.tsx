/**
 * Configuração do Google Drive para importação automática de XMLs fiscais
 * Permite ao contador conectar a pasta do Drive do cliente
 */

import React, { useState, useEffect } from 'react';
import { FolderOpen, Trash2, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../src/services/api';

interface ConfigDrive {
  id: string;
  pasta_id: string;
  pasta_nome: string;
  ultima_sincronizacao: string | null;
  ativo: boolean;
}

interface ConfiguracaoDriveProps {
  empresaId?: string;
}

export const ConfiguracaoDrive: React.FC<ConfiguracaoDriveProps> = ({ empresaId }) => {
  const [configs, setConfigs] = useState<ConfigDrive[]>([]);
  const [autorizando, setAutorizando] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    carregarConfiguracoes();
  }, [empresaId]);

  const carregarConfiguracoes = async () => {
    try {
      const params = empresaId ? { empresa_id: empresaId } : {};
      const response = await api.get('/drive/configuracoes', { params });
      const data = response.data;
      if (Array.isArray(data)) {
        setConfigs(data);
      } else if (data?.data) {
        setConfigs(data.data);
      } else {
        setConfigs([]);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar configs Drive:', error);
      }
      setConfigs([]);
    }
  };

  const handleAutorizar = async () => {
    setAutorizando(true);
    setMessage(null);
    try {
      const response = await api.get('/drive/auth/url', { params: empresaId ? { empresa_id: empresaId } : {} });
      const authUrl = response.data?.auth_url || response.data?.url;
      if (authUrl) {
        window.open(authUrl, '_blank', 'width=600,height=700');
        setMessage({ type: 'info', text: 'Autorize o acesso na janela aberta. Após autorizar, atualize a página.' });
      } else {
        setMessage({ type: 'error', text: 'URL de autorização não retornada pelo servidor.' });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || error.message || 'Erro ao conectar com Google Drive',
      });
    } finally {
      setAutorizando(false);
    }
  };

  const handleSincronizar = async (configId: string) => {
    setMessage(null);
    try {
      await api.post(`/drive/sincronizar/${configId}`);
      setMessage({ type: 'success', text: 'Sincronização iniciada!' });
      setTimeout(() => carregarConfiguracoes(), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao sincronizar Drive',
      });
    }
  };

  const handleRemover = async (configId: string) => {
    if (!window.confirm('Desconectar este Google Drive?')) return;
    try {
      await api.delete(`/drive/configuracoes/${configId}`);
      setMessage({ type: 'success', text: 'Google Drive desconectado!' });
      carregarConfiguracoes();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao desconectar',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google Drive</span>
        {configs.length === 0 && (
          <button
            type="button"
            onClick={handleAutorizar}
            disabled={autorizando}
            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            {autorizando ? 'Autorizando...' : 'Conectar Drive'}
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : message.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
          }`}
        >
          <AlertCircle size={16} />
          {message.text}
        </div>
      )}

      {configs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-4 text-center">
          <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Google Drive não conectado</p>
        </div>
      ) : (
        configs.map((config) => (
          <div
            key={config.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {config.pasta_nome || config.pasta_id || 'Pasta Drive'}
                </span>
              </div>
              {config.ultima_sincronizacao && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Última sync: {new Date(config.ultima_sincronizacao).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => handleSincronizar(config.id)}
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                title="Sincronizar agora"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemover(config.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                title="Desconectar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
