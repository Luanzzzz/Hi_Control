import React, { useState } from 'react';
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
  X
} from 'lucide-react';

// Tipo de Nota Fiscal
enum InvoiceType {
  NFE = 'NFE',
  NFCE = 'NFCE',
  NFSE = 'NFSE',
  CTE = 'CTE'
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

export const InvoiceEmitter: React.FC = () => {
  const [selectedType, setSelectedType] = useState<InvoiceType>(InvoiceType.NFE);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);

  // Novo item
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    codigo: '',
    descricao: '',
    quantidade: 1,
    valorUnitario: 0
  });

  // Adicionar item
  const addItem = () => {
    if (!newItem.descricao || !newItem.quantidade || !newItem.valorUnitario) {
      return;
    }

    const item: InvoiceItem = {
      id: Date.now().toString(),
      codigo: newItem.codigo || `ITEM-${items.length + 1}`,
      descricao: newItem.descricao,
      quantidade: newItem.quantidade,
      valorUnitario: newItem.valorUnitario,
      valorTotal: newItem.quantidade * newItem.valorUnitario
    };

    setItems([...items, item]);
    setNewItem({
      codigo: '',
      descricao: '',
      quantidade: 1,
      valorUnitario: 0
    });
    setShowAddItem(false);
  };

  // Remover item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Calcular totais
  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.valorTotal, 0);
    const impostos = subtotal * 0.18; // 18% de impostos (exemplo)
    const total = subtotal + impostos;

    return { subtotal, impostos, total };
  };

  const { subtotal, impostos, total } = calculateTotals();

  // Formatar valor
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <FileEdit className="text-primary-600 dark:text-primary-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Emissor de Notas Fiscais
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Emita NF-e, NFC-e, NFS-e e CT-e de forma rápida e segura
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors hover:bg-gray-300 dark:hover:bg-slate-600 flex items-center gap-2">
            <Save size={16} />
            Salvar Rascunho
          </button>
          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <Send size={16} />
            Emitir Nota
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tipo de Nota */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={20} />
              Tipo de Documento
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.values(InvoiceType).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === type
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-slate-700 hover:border-primary-400'
                  }`}
                >
                  <p className={`text-sm font-semibold ${
                    selectedType === type
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {type === InvoiceType.NFE && 'Nota Fiscal Eletrônica'}
                    {type === InvoiceType.NFCE && 'NF Consumidor'}
                    {type === InvoiceType.NFSE && 'NF Serviço'}
                    {type === InvoiceType.CTE && 'Conhecimento Transporte'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Dados do Destinatário */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={20} />
              Dados do Destinatário
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CNPJ/CPF
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Razão Social / Nome
                </label>
                <input
                  type="text"
                  placeholder="Nome ou Razão Social do destinatário"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CEP
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cidade/UF
                </label>
                <input
                  type="text"
                  placeholder="São Paulo - SP"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Produtos/Serviços */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={20} />
                Produtos/Serviços
              </h2>
              <button
                onClick={() => setShowAddItem(true)}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Adicionar Item
              </button>
            </div>

            {/* Add Item Form */}
            {showAddItem && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Código
                    </label>
                    <input
                      type="text"
                      placeholder="SKU/Código"
                      value={newItem.codigo}
                      onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      placeholder="Descrição do item"
                      value={newItem.descricao}
                      onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantidade}
                      onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor Unitário
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.valorUnitario}
                      onChange={(e) => setNewItem({ ...newItem, valorUnitario: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={addItem}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setShowAddItem(false);
                      setNewItem({ codigo: '', descricao: '', quantidade: 1, valorUnitario: 0 });
                    }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package size={48} className="mx-auto mb-3 opacity-50" />
                <p>Nenhum item adicionado</p>
                <p className="text-sm mt-1">Clique em "Adicionar Item" para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.descricao}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.quantidade}x {formatCurrency(item.valorUnitario)} = {formatCurrency(item.valorTotal)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Resumo
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Impostos (18%):</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(impostos)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Informações da Nota
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Itens:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                    Rascunho
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Atenção:</strong> Certifique-se de que todos os dados estão corretos antes de emitir a nota fiscal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
