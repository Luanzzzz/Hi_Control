import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  Building2,
  Package,
  DollarSign,
  FileText,
  Send,
  Save,
  Trash2,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import api from '../src/services/api';
import { useAuth } from '../contexts/AuthContext';

// Tipo de Nota Fiscal
enum InvoiceType {
  NFE = 'NFE',
}

// Interface de Produto/Serviço
interface InvoiceItem {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Empresa {
  id: string;
  razao_social: string;
  cnpj: string;
}

type EmissaoStatus = 'idle' | 'loading' | 'success' | 'error';

export const InvoiceEmitter: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [status, setStatus] = useState<EmissaoStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // Dados do destinatário
  const [destinatarioCnpj, setDestinatarioCnpj] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioCep, setDestinatarioCep] = useState('');
  const [destinatarioCidade, setDestinatarioCidade] = useState('');
  const [naturezaOperacao, setNaturezaOperacao] = useState('Venda de mercadoria');

  // Novo item
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    codigo: '',
    descricao: '',
    quantidade: 1,
    valorUnitario: 0,
  });

  // Carregar empresas disponíveis
  useEffect(() => {
    api.get<Empresa[]>('/empresas')
      .then((res) => {
        setEmpresas(res.data);
        if (res.data.length > 0) setEmpresaId(res.data[0].id);
      })
      .catch(() => setEmpresas([]));
  }, []);

  const addItem = () => {
    if (!newItem.descricao || !newItem.quantidade || !newItem.valorUnitario) return;

    const item: InvoiceItem = {
      id: Date.now().toString(),
      codigo: newItem.codigo || `ITEM-${items.length + 1}`,
      descricao: newItem.descricao,
      quantidade: newItem.quantidade,
      valorUnitario: newItem.valorUnitario,
      valorTotal: newItem.quantidade * newItem.valorUnitario,
    };

    setItems([...items, item]);
    setNewItem({ codigo: '', descricao: '', quantidade: 1, valorUnitario: 0 });
    setShowAddItem(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.valorTotal, 0);
    return { subtotal };
  };

  const { subtotal } = calculateTotals();

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleEmitir = async () => {
    if (!empresaId) {
      setStatus('error');
      setStatusMsg('Selecione uma empresa emitente.');
      return;
    }
    if (items.length === 0) {
      setStatus('error');
      setStatusMsg('Adicione pelo menos um produto/serviço.');
      return;
    }

    setStatus('loading');
    setStatusMsg('');

    try {
      const payload = {
        empresa_id: empresaId,
        natureza_operacao: naturezaOperacao,
        destinatario: {
          cnpj_cpf: destinatarioCnpj.replace(/\D/g, ''),
          nome: destinatarioNome,
          cep: destinatarioCep.replace(/\D/g, ''),
          municipio: destinatarioCidade,
        },
        itens: items.map((item) => ({
          codigo: item.codigo,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          valor_total: item.valorTotal,
          ncm: '00000000',
          cfop: '5102',
          unidade: 'UN',
          icms_cst: '00',
          icms_aliquota: 12,
          pis_cst: '07',
          cofins_cst: '07',
        })),
        valor_total: subtotal,
        ambiente: 2, // homologação
      };

      await api.post('/nfe/autorizar', payload);
      setStatus('success');
      setStatusMsg('NF-e enviada para autorização com sucesso!');
      setItems([]);
      setDestinatarioCnpj('');
      setDestinatarioNome('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setStatus('error');
      setStatusMsg(
        e.response?.data?.detail ?? 'Erro ao emitir NF-e. Verifique os dados e tente novamente.'
      );
    }
  };

  return (
    <div className="p-6 bg-hc-bg min-h-full font-body space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-hc-purple-dim rounded-lg">
            <FileEdit className="text-hc-purple-light" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold font-display text-hc-text">
              Emissor NF-e (Modelo 55)
            </h1>
            <p className="text-sm text-hc-muted">
              Emita Notas Fiscais Eletrônicas com autorização SEFAZ
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEmitir}
            disabled={status === 'loading'}
            className="px-4 py-2 bg-hc-purple hover:bg-hc-purple/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Emitir Nota
          </button>
        </div>
      </div>

      {/* Status feedback */}
      {(status === 'success' || status === 'error') && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            status === 'success'
              ? 'bg-hc-green/10 border-hc-green/30 text-hc-green'
              : 'bg-hc-red/10 border-hc-red/30 text-hc-red'
          }`}
        >
          {status === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-medium">{statusMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Empresa Emitente */}
          <div className="bg-hc-card border border-hc-border rounded-xl p-6">
            <h2 className="text-sm font-semibold font-display text-hc-text mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-hc-purple-light" />
              Empresa Emitente
            </h2>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="w-full px-4 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
            >
              {empresas.length === 0 && (
                <option value="">Nenhuma empresa cadastrada</option>
              )}
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razao_social} — {e.cnpj}
                </option>
              ))}
            </select>
          </div>

          {/* Natureza da Operação */}
          <div className="bg-hc-card border border-hc-border rounded-xl p-6">
            <h2 className="text-sm font-semibold font-display text-hc-text mb-4 flex items-center gap-2">
              <FileText size={16} className="text-hc-purple-light" />
              Natureza da Operação
            </h2>
            <input
              type="text"
              value={naturezaOperacao}
              onChange={(e) => setNaturezaOperacao(e.target.value)}
              className="w-full px-4 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
              placeholder="Ex: Venda de mercadoria"
            />
          </div>

          {/* Dados do Destinatário */}
          <div className="bg-hc-card border border-hc-border rounded-xl p-6">
            <h2 className="text-sm font-semibold font-display text-hc-text mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-hc-purple-light" />
              Dados do Destinatário
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-hc-muted mb-1">CNPJ/CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={destinatarioCnpj}
                  onChange={(e) => setDestinatarioCnpj(e.target.value)}
                  className="w-full px-4 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-hc-muted mb-1">Razão Social / Nome</label>
                <input
                  type="text"
                  placeholder="Nome ou Razão Social do destinatário"
                  value={destinatarioNome}
                  onChange={(e) => setDestinatarioNome(e.target.value)}
                  className="w-full px-4 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-hc-muted mb-1">CEP</label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={destinatarioCep}
                  onChange={(e) => setDestinatarioCep(e.target.value)}
                  className="w-full px-4 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-hc-muted mb-1">Cidade/UF</label>
                <input
                  type="text"
                  placeholder="São Paulo - SP"
                  value={destinatarioCidade}
                  onChange={(e) => setDestinatarioCidade(e.target.value)}
                  className="w-full px-4 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                />
              </div>
            </div>
          </div>

          {/* Produtos/Serviços */}
          <div className="bg-hc-card border border-hc-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold font-display text-hc-text flex items-center gap-2">
                <Package size={16} className="text-hc-purple-light" />
                Produtos/Serviços
              </h2>
              <button
                onClick={() => setShowAddItem(true)}
                className="px-3 py-1.5 bg-hc-purple hover:bg-hc-purple/90 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={14} />
                Adicionar Item
              </button>
            </div>

            {showAddItem && (
              <div className="mb-4 p-4 bg-hc-surface rounded-lg border border-hc-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-hc-muted mb-1">Código</label>
                    <input
                      type="text"
                      placeholder="SKU/Código"
                      value={newItem.codigo}
                      onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                      className="w-full px-3 py-2 bg-hc-card border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-hc-muted mb-1">Descrição</label>
                    <input
                      type="text"
                      placeholder="Descrição do item"
                      value={newItem.descricao}
                      onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                      className="w-full px-3 py-2 bg-hc-card border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-hc-muted mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantidade}
                      onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-hc-card border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-hc-muted mb-1">Valor Unitário</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.valorUnitario}
                      onChange={(e) => setNewItem({ ...newItem, valorUnitario: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-hc-card border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:ring-2 focus:ring-hc-purple/40"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={addItem}
                    className="px-3 py-1.5 bg-hc-purple hover:bg-hc-purple/90 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setShowAddItem(false);
                      setNewItem({ codigo: '', descricao: '', quantidade: 1, valorUnitario: 0 });
                    }}
                    className="px-3 py-1.5 bg-hc-surface border border-hc-border text-hc-muted rounded-lg text-xs font-medium transition-colors hover:text-hc-text"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-hc-muted">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum item adicionado</p>
                <p className="text-xs mt-1 opacity-70">Clique em "Adicionar Item" para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-hc-surface rounded-lg border border-hc-border"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-hc-text">{item.descricao}</p>
                      <p className="text-xs text-hc-muted mt-0.5">
                        {item.quantidade}x {formatCurrency(item.valorUnitario)} ={' '}
                        {formatCurrency(item.valorTotal)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-hc-red hover:bg-hc-red/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="lg:col-span-1">
          <div className="bg-hc-card border border-hc-border rounded-xl p-6 sticky top-6">
            <h2 className="text-sm font-semibold font-display text-hc-text mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-hc-purple-light" />
              Resumo
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-hc-muted">Total de itens:</span>
                <span className="font-medium text-hc-text">{items.length}</span>
              </div>
              <div className="pt-3 border-t border-hc-border">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-hc-text">Total:</span>
                  <span className="text-lg font-bold text-hc-purple-light">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-hc-border">
              <h3 className="text-xs font-semibold text-hc-text mb-3">Informações</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-hc-muted">Tipo:</span>
                  <span className="font-medium text-hc-text">NF-e Modelo 55</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hc-muted">Ambiente:</span>
                  <span className="px-2 py-0.5 bg-hc-amber/10 text-hc-amber rounded text-xs font-medium">
                    Homologação
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hc-muted">Status:</span>
                  <span className="px-2 py-0.5 bg-hc-purple-dim text-hc-purple-light rounded text-xs font-medium">
                    Rascunho
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-hc-amber/10 rounded-lg border border-hc-amber/20">
              <p className="text-xs text-hc-amber">
                <strong>Atenção:</strong> Certifique-se de que todos os dados estão corretos antes de emitir a nota fiscal.
              </p>
            </div>

            <button
              onClick={handleEmitir}
              disabled={status === 'loading' || items.length === 0 || !empresaId}
              className="w-full mt-4 px-4 py-2.5 bg-hc-purple hover:bg-hc-purple/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Emitir NF-e
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
