import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  FileText,
  Download,
  Eye,
  RefreshCw,
  Star,
  Building2,
  Hash
} from 'lucide-react';

// Tipo de Nota Fiscal
enum InvoiceType {
  NFE = 'NFE',
  NFCE = 'NFCE',
  NFSE = 'NFSE',
  CTE = 'CTE'
}

// Status da Nota Fiscal
enum InvoiceStatus {
  AUTORIZADA = 'Autorizada',
  CANCELADA = 'Cancelada',
  DENEGADA = 'Denegada',
  PENDENTE = 'Pendente'
}

// Interface de Nota Fiscal
interface Invoice {
  id: string;
  numero: string;
  serie: string;
  chaveAcesso: string;
  tipo: InvoiceType;
  dataEmissao: string;
  cnpjEmissor: string;
  nomeEmissor: string;
  valor: number;
  status: InvoiceStatus;
}

export const InvoiceSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<InvoiceType | 'TODAS'>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'TODOS'>('TODOS');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dados mockados para demonstração
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      numero: '000123',
      serie: '1',
      chaveAcesso: '35240112345678000199550010001234561234567890',
      tipo: InvoiceType.NFE,
      dataEmissao: '2024-01-20',
      cnpjEmissor: '12.345.678/0001-99',
      nomeEmissor: 'Empresa Tech Solutions Ltda',
      valor: 5400.00,
      status: InvoiceStatus.AUTORIZADA
    },
    {
      id: '2',
      numero: '000124',
      serie: '1',
      chaveAcesso: '35240112345678000199550010001234671234567891',
      tipo: InvoiceType.NFCE,
      dataEmissao: '2024-01-21',
      cnpjEmissor: '98.765.432/0001-11',
      nomeEmissor: 'Mercado Silva & Cia',
      valor: 2150.00,
      status: InvoiceStatus.AUTORIZADA
    },
    {
      id: '3',
      numero: '000125',
      serie: '2',
      chaveAcesso: '35240112345678000199550020001234781234567892',
      tipo: InvoiceType.NFE,
      dataEmissao: '2024-01-22',
      cnpjEmissor: '11.222.333/0001-44',
      nomeEmissor: 'Consultório Médico Dra. Ana',
      valor: 8900.00,
      status: InvoiceStatus.CANCELADA
    }
  ];

  const [invoices] = useState<Invoice[]>(mockInvoices);

  // Filtrar notas
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.chaveAcesso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.nomeEmissor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.cnpjEmissor.includes(searchTerm);

    const matchesType = selectedType === 'TODAS' || invoice.tipo === selectedType;
    const matchesStatus = selectedStatus === 'TODOS' || invoice.status === selectedStatus;

    const matchesDate = (!dateFrom || invoice.dataEmissao >= dateFrom) &&
                        (!dateTo || invoice.dataEmissao <= dateTo);

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Obter cor do status
  const getStatusColor = (status: InvoiceStatus): string => {
    switch (status) {
      case InvoiceStatus.AUTORIZADA:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case InvoiceStatus.CANCELADA:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case InvoiceStatus.DENEGADA:
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case InvoiceStatus.PENDENTE:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Obter cor do tipo
  const getTypeColor = (type: InvoiceType): string => {
    switch (type) {
      case InvoiceType.NFE:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case InvoiceType.NFCE:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case InvoiceType.NFSE:
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case InvoiceType.CTE:
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Formatar valor
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('TODAS');
    setSelectedStatus('TODOS');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Search className="text-primary-600 dark:text-primary-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Buscador de Notas Fiscais
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consulte e gerencie suas notas fiscais eletrônicas
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <RefreshCw size={16} />
          Sincronizar
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por número, chave de acesso, CNPJ ou nome do emissor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showFilters
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Filter size={18} />
            Filtros
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Nota
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as InvoiceType | 'TODAS')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                <option value="TODAS">Todas</option>
                <option value={InvoiceType.NFE}>NF-e</option>
                <option value={InvoiceType.NFCE}>NFC-e</option>
                <option value={InvoiceType.NFSE}>NFS-e</option>
                <option value={InvoiceType.CTE}>CT-e</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as InvoiceStatus | 'TODOS')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                <option value="TODOS">Todos</option>
                <option value={InvoiceStatus.AUTORIZADA}>Autorizada</option>
                <option value={InvoiceStatus.CANCELADA}>Cancelada</option>
                <option value={InvoiceStatus.DENEGADA}>Denegada</option>
                <option value={InvoiceStatus.PENDENTE}>Pendente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Inicial
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Final
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Resultados ({filteredInvoices.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Número/Série</th>
                <th className="px-6 py-4 font-medium">Emissor</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Emissão</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhuma nota fiscal encontrada
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(invoice.tipo)}`}>
                        {invoice.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-gray-400" />
                        {invoice.numero}/{invoice.serie}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                          <Building2 size={14} className="text-gray-400" />
                          {invoice.nomeEmissor}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          CNPJ: {invoice.cnpjEmissor}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      {formatCurrency(invoice.valor)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.dataEmissao)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Download XML"
                        >
                          <Download size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
