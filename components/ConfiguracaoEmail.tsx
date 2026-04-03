/**
 * Configuração de Email IMAP para importação automática de XMLs fiscais
 * Permite ao contador cadastrar o email do cliente para monitoramento de pastas
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mail, Trash2, RefreshCw } from 'lucide-react';
import api from '../src/services/api';
import { Button, InlineAlert } from '../src/components/ui';

interface ConfigEmail {
  id: string;
  tipo: 'escritorio' | 'empresa';
  provedor: string;
  email: string;
  pastas_monitoradas: string[];
  ultima_sincronizacao: string | null;
  ativo: boolean;
}

interface ConfiguracaoEmailProps {
  empresaId?: string;
}

export const ConfiguracaoEmail: React.FC<ConfiguracaoEmailProps> = ({ empresaId }) => {
  const [configs, setConfigs] = useState<ConfigEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    tipo: empresaId ? 'empresa' : 'escritorio',
    provedor: 'gmail',
    email: '',
    imap_host: '',
    imap_port: 993,
    imap_senha: '',
    pastas_monitoradas: 'INBOX',
  });

  useEffect(() => {
    carregarConfiguracoes();
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [empresaId]);

  const carregarConfiguracoes = async () => {
    try {
      const params = empresaId ? { empresa_id: empresaId } : {};
      const response = await api.get('/email/configuracoes', { params });
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
        console.error('Erro ao carregar configs email:', error);
      }
      setConfigs([]);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...formData,
        empresa_id: empresaId || null,
        pastas_monitoradas: formData.pastas_monitoradas.split(',').map((p) => p.trim()).filter(Boolean),
      };
      await api.post('/email/configurar', payload);
      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
      setShowForm(false);
      carregarConfiguracoes();
      setFormData({
        tipo: empresaId ? 'empresa' : 'escritorio',
        provedor: 'gmail',
        email: '',
        imap_host: '',
        imap_port: 993,
        imap_senha: '',
        pastas_monitoradas: 'INBOX',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || error.message || 'Erro ao salvar configuração',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizar = async (configId: string) => {
    setMessage(null);
    try {
      await api.post(`/email/sincronizar/${configId}`);
      setMessage({ type: 'success', text: 'Sincronização iniciada!' });
      syncTimeoutRef.current = setTimeout(() => carregarConfiguracoes(), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao sincronizar emails',
      });
    }
  };

  const handleRemover = async (configId: string) => {
    if (!window.confirm('Deseja realmente remover esta configuração?')) return;
    try {
      await api.delete(`/email/configuracoes/${configId}`);
      setMessage({ type: 'success', text: 'Configuração removida.' });
      carregarConfiguracoes();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao remover configuração',
      });
    }
  };

  const fieldClass =
    'w-full px-3 py-2 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:border-hc-purple transition-colors';
  const labelClass = 'block text-xs font-medium text-hc-muted mb-1';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-hc-muted uppercase tracking-wide">Email IMAP</span>
        <Button
          size="sm"
          variant={showForm ? 'ghost' : 'secondary'}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : '+ Nova Configuração'}
        </Button>
      </div>

      {message && (
        <InlineAlert
          variant={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {showForm && (
        <form onSubmit={handleSalvar} className="bg-hc-card rounded-lg border border-hc-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Provedor</label>
              <select
                value={formData.provedor}
                onChange={(e) => setFormData({ ...formData, provedor: e.target.value })}
                className={fieldClass}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="imap_generico">IMAP Genérico</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Email <span className="text-hc-red">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={fieldClass}
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>

          {formData.provedor === 'imap_generico' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Servidor IMAP</label>
                <input
                  type="text"
                  value={formData.imap_host}
                  onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                  className={fieldClass}
                  placeholder="imap.exemplo.com"
                />
              </div>
              <div>
                <label className={labelClass}>Porta</label>
                <input
                  type="number"
                  value={formData.imap_port}
                  onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value, 10) || 993 })}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Senha / App Password <span className="text-hc-red">*</span></label>
            <input
              type="password"
              value={formData.imap_senha}
              onChange={(e) => setFormData({ ...formData, imap_senha: e.target.value })}
              className={fieldClass}
              placeholder="••••••••"
              required
              autoComplete="off"
            />
            <p className="text-xs text-hc-muted mt-1">
              Gmail: use Senha de App nas configurações de segurança da conta.
            </p>
          </div>

          <div>
            <label className={labelClass}>Pastas monitoradas (separadas por vírgula)</label>
            <input
              type="text"
              value={formData.pastas_monitoradas}
              onChange={(e) => setFormData({ ...formData, pastas_monitoradas: e.target.value })}
              className={fieldClass}
              placeholder="INBOX, Fiscal"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" variant="primary" loading={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {configs.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-hc-border p-4 text-center">
          <Mail size={28} className="mx-auto mb-2 text-hc-muted opacity-50" />
          <p className="text-xs text-hc-muted">Nenhuma configuração de email</p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 bg-hc-card rounded-lg border border-hc-border"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail size={14} className="text-hc-info shrink-0" />
                  <span className="text-sm font-medium text-hc-text truncate">{config.email}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      config.ativo
                        ? 'bg-hc-success/15 text-hc-success border border-hc-success/25'
                        : 'bg-hc-card text-hc-muted border border-hc-border'
                    }`}
                  >
                    {config.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-hc-muted mt-0.5 pl-5">
                  {config.provedor}
                  {Array.isArray(config.pastas_monitoradas) && config.pastas_monitoradas.length > 0
                    ? ` · ${config.pastas_monitoradas.join(', ')}`
                    : ''}
                  {config.ultima_sincronizacao
                    ? ` · sync ${new Date(config.ultima_sincronizacao).toLocaleString('pt-BR')}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleSincronizar(config.id)}
                  className="p-1.5 text-hc-info hover:bg-hc-info/10 rounded-lg transition-colors"
                  title="Sincronizar agora"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemover(config.id)}
                  className="p-1.5 text-hc-muted hover:text-hc-red hover:bg-hc-red/10 rounded-lg transition-colors"
                  title="Remover"
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
