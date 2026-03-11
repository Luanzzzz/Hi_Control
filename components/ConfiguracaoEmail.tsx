/**
 * Configuração de Email IMAP para importação automática de XMLs fiscais
 * Permite ao contador cadastrar o email do cliente para monitoramento de pastas
 */

import React, { useState, useEffect } from 'react';
import { Mail, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../src/services/api';

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
      setTimeout(() => carregarConfiguracoes(), 3000);
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
      setMessage({ type: 'success', text: 'Configuração removida!' });
      carregarConfiguracoes();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao remover configuração',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email IMAP</span>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancelar' : '+ Nova Configuração'}
        </button>
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

      {showForm && (
        <form onSubmit={handleSalvar} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Provedor</label>
              <select
                value={formData.provedor}
                onChange={(e) => setFormData({ ...formData, provedor: e.target.value })}
                className="w-full rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="imap_generico">IMAP Genérico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>

          {formData.provedor === 'imap_generico' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Servidor IMAP</label>
                <input
                  type="text"
                  value={formData.imap_host}
                  onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                  className="w-full rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
                  placeholder="imap.exemplo.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Porta</label>
                <input
                  type="number"
                  value={formData.imap_port}
                  onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value, 10) || 993 })}
                  className="w-full rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Senha / App Password *</label>
            <input
              type="password"
              value={formData.imap_senha}
              onChange={(e) => setFormData({ ...formData, imap_senha: e.target.value })}
              className="w-full rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-gray-500 mt-0.5">Gmail: use Senha de App nas configurações de segurança</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pastas (separadas por vírgula)</label>
            <input
              type="text"
              value={formData.pastas_monitoradas}
              onChange={(e) => setFormData({ ...formData, pastas_monitoradas: e.target.value })}
              className="w-full rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
              placeholder="INBOX, Fiscal"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {configs.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-4 text-center">
          <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma configuração de email</p>
        </div>
      ) : (
        configs.map((config) => (
          <div
            key={config.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 dark:text-white truncate">{config.email}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${config.ativo ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-400'}`}
                >
                  {config.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {config.provedor} • Pastas: {Array.isArray(config.pastas_monitoradas) ? config.pastas_monitoradas.join(', ') : config.pastas_monitoradas}
                {config.ultima_sincronizacao &&
                  ` • Última sync: ${new Date(config.ultima_sincronizacao).toLocaleString('pt-BR')}`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => handleSincronizar(config.id)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                title="Sincronizar agora"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemover(config.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                title="Remover"
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
