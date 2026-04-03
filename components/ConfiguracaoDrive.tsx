/**
 * Configuração do Google Drive para importação automática de XMLs fiscais
 * Permite ao contador conectar a pasta do Drive do cliente
 */

import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import api from '../src/services/api';
import { Button, InlineAlert } from '../src/components/ui';

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
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    carregarConfiguracoes();
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
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
      syncTimeoutRef.current = setTimeout(() => carregarConfiguracoes(), 3000);
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
      setMessage({ type: 'success', text: 'Google Drive desconectado.' });
      carregarConfiguracoes();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao desconectar',
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-hc-muted uppercase tracking-wide">Google Drive</span>
        {configs.length === 0 && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<ExternalLink size={13} />}
            loading={autorizando}
            onClick={handleAutorizar}
          >
            {autorizando ? 'Abrindo...' : 'Conectar Drive'}
          </Button>
        )}
      </div>

      {message && (
        <InlineAlert
          variant={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {configs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hc-border p-4 text-center">
          <FolderOpen size={28} className="mx-auto mb-2 text-hc-muted opacity-50" />
          <p className="text-xs text-hc-muted">Nenhum Google Drive conectado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 bg-hc-card rounded-lg border border-hc-border"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-hc-success shrink-0" />
                  <span className="text-sm font-medium text-hc-text truncate">
                    {config.pasta_nome || config.pasta_id || 'Pasta Drive'}
                  </span>
                </div>
                {config.ultima_sincronizacao && (
                  <p className="text-xs text-hc-muted mt-0.5 pl-5">
                    Última sync: {new Date(config.ultima_sincronizacao).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleSincronizar(config.id)}
                  className="p-1.5 text-hc-success hover:bg-hc-success/10 rounded-lg transition-colors"
                  title="Sincronizar agora"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemover(config.id)}
                  className="p-1.5 text-hc-muted hover:text-hc-red hover:bg-hc-red/10 rounded-lg transition-colors"
                  title="Desconectar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
