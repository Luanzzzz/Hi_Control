import React, { useState, useEffect } from 'react';
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
  Hash,
  Loader2,
  AlertCircle,
  Users,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { buscarNotasEmpresa, baixarXmlNota, downloadBlob } from '../src/services/notaFiscalService';
import type { NotaFiscal, TipoNotaFiscal, SituacaoNota } from '../src/types/notaFiscal';
import { CORES_TIPO_NF, CORES_SITUACAO } from '../src/types/notaFiscal';
import { empresaService, Empresa } from '../services/empresaService';

// ===== Componente ClienteSelector Inline =====
interface ClienteSelectorProps {
  empresaSelecionada: Empresa | null;
  onSelecionar: (empresa: Empresa) => void;
  loading?: boolean;
}

const ClienteSelector: React.FC<ClienteSelectorProps> = ({
  empresaSelecionada,
  onSelecionar,
  loading
}) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Carregar empresas ao abrir dropdown
  useEffect(() => {
    if (aberto && empresas.length === 0) {
      carregarEmpresas();
    }
  }, [aberto]);

  const carregarEmpresas = async () => {
    setCarregando(true);
    try {
      const lista = await empresaService.listar();
      setEmpresas(lista);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Filtrar empresas pela busca
  const empresasFiltradas = empresas.filter(emp =>
    emp.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    emp.cnpj.includes(busca.replace(/\D/g, ''))
  );

  // Badge de certificado simples
  const CertBadge: React.FC<{ validade?: string | null }> = ({ validade }) => {
    if (!validade) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs">
          <ShieldAlert size={12} />
          Sem Cert.
        </span>
      );
    }
    const dias = Math.ceil((new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (dias <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
          <ShieldOff size={12} />
          Vencido
        </span>
      );
    }
    if (dias <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
          <AlertTriangle size={12} />
          {dias}d
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
        <ShieldCheck size={12} />
        Ativo
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Campo de seleção */}
      <div
        className={`bg-gray-50 dark:bg-slate-900 border rounded-lg p-3 cursor-pointer transition-all ${aberto
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-gray-200 dark:border-slate-700 hover:border-primary-400'
          }`}
        onClick={() => setAberto(!aberto)}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span>Carregando...</span>
          </div>
        ) : empresaSelecionada ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-primary-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {empresaSelecionada.razao_social}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  CNPJ: {empresaSelecionada.cnpj}
                </p>
              </div>
            </div>
            <CertBadge validade={empresaSelecionada.certificado_validade} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Users size={18} />
            <span>Selecione uma empresa para buscar notas...</span>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Input de busca */}
          <div className="p-3 border-b border-gray-200 dark:border-slate-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por Razão Social ou CNPJ..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Lista de empresas */}
          <div className="max-h-56 overflow-y-auto">
            {carregando ? (
              <div className="p-6 text-center text-gray-400">
                <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                Carregando empresas...
              </div>
            ) : empresasFiltradas.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                Nenhuma empresa encontrada
              </div>
            ) : (
              empresasFiltradas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                  onClick={() => {
                    onSelecionar(empresa);
                    setAberto(false);
                    setBusca('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {empresa.razao_social}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        CNPJ: {empresa.cnpj}
                      </p>
                    </div>
                    <CertBadge validade={empresa.certificado_validade} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const InvoiceSearch: React.FC = () => {
  // Estado da empresa selecionada
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TipoNotaFiscal | 'TODAS'>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<SituacaoNota | 'todas'>('todas');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Estados da API
  const [invoices, setInvoices] = useState<NotaFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);

  // Carregar empresa pré-selecionada do localStorage (vindo de Clients.tsx)
  useEffect(() => {
    const salvo = localStorage.getItem('buscador_notas_empresa_selecionada');
    if (salvo) {
      try {
        const { id, nome } = JSON.parse(salvo);
        if (id) {
          carregarEmpresaPorId(id);
          // Limpar localStorage após ler
          localStorage.removeItem('buscador_notas_empresa_selecionada');
        }
      } catch (e) {
        console.error('Erro ao ler empresa do localStorage:', e);
      }
    }
  }, []);

  const carregarEmpresaPorId = async (id: string) => {
    setLoadingEmpresa(true);
    try {
      const empresa = await empresaService.obterPorId(id);
      if (empresa) {
        setEmpresaSelecionada(empresa);
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    } finally {
      setLoadingEmpresa(false);
    }
  };

  // Validar período de busca (máximo 90 dias)
  const validarPeriodo = (): string | null => {
    if (dateFrom && dateTo) {
      const inicio = new Date(dateFrom);
      const fim = new Date(dateTo);
      const diffTime = Math.abs(fim.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 90) {
        return `O período de busca não pode exceder 90 dias. Período atual: ${diffDays} dias.`;
      }
    }
    return null;
  };

  // Buscar notas fiscais
  const handleSearch = async () => {
    // Validar empresa selecionada
    if (!empresaSelecionada) {
      setError('⚠️ Selecione uma empresa primeiro');
      return;
    }

    // Validar datas obrigatórias
    if (!dateFrom || !dateTo) {
      setError('⚠️ Preencha as datas de início e fim');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validar período se ambas as datas estiverem preenchidas
      const erroValidacao = validarPeriodo();
      if (erroValidacao) {
        setError(erroValidacao);
        setIsLoading(false);
        return;
      }

      // Validar se empresa tem CNPJ
      if (!empresaSelecionada.cnpj) {
        setError('⚠️ Empresa sem CNPJ cadastrado');
        setIsLoading(false);
        return;
      }

      // Remover formatação do CNPJ (deve ter 14 dígitos)
      const cnpjLimpo = empresaSelecionada.cnpj.replace(/\D/g, '');

      if (cnpjLimpo.length !== 14) {
        setError('⚠️ CNPJ inválido (deve ter 14 dígitos)');
        setIsLoading(false);
        return;
      }

      // Chamar endpoint com payload correto
      const resultado = await buscarNotasEmpresa(empresaSelecionada.id, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,
        max_notas: 100
      });

      setInvoices(resultado.notas || []);

      // Feedback de sucesso ao usuário
      const icone = resultado.fonte === 'cache' ? '💾' : '🌐';
      const origem = resultado.fonte === 'cache' ? 'cache local' : 'SEFAZ';
      const certUsado = resultado.certificado_usado === 'empresa' ? '🏢 Certificado da Empresa' : '👤 Certificado do Contador';
      console.log(`${icone} ${resultado.total_notas} notas encontradas (${origem})`);
      console.log(`${certUsado}`);
    } catch (err: any) {
      const mensagemErro = err.message || 'Erro ao buscar notas fiscais. Tente novamente.';
      setError(mensagemErro);

      // Se erro de certificado, mostrar alerta específico
      if (mensagemErro.toLowerCase().includes('certificado')) {
        setError(mensagemErro + '\n💡 Verifique se o certificado da empresa está válido');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Download de XML
  const handleDownloadXml = async (chaveAcesso: string) => {
    if (!chaveAcesso) {
      setError('Chave de acesso não disponível para esta nota.');
      return;
    }

    setDownloadingXml(chaveAcesso);
    try {
      const blob = await baixarXmlNota(chaveAcesso);
      downloadBlob(blob, `NFe${chaveAcesso}.xml`);
    } catch (err: any) {
      setError(err.message || 'Erro ao baixar XML. Tente novamente.');
    } finally {
      setDownloadingXml(null);
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
    setSelectedStatus('todas');
    setDateFrom('');
    setDateTo('');
    setError(null);
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
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consulte e gerencie suas notas fiscais eletrônicas
            </p>
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* SELETOR DE CLIENTE - NOVO! */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          👤 Selecione a Empresa
        </label>
        <ClienteSelector
          empresaSelecionada={empresaSelecionada}
          onSelecionar={setEmpresaSelecionada}
          loading={loadingEmpresa}
        />
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
            className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${showFilters
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
                onChange={(e) => setSelectedType(e.target.value as TipoNotaFiscal | 'TODAS')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                <option value="TODAS">Todas</option>
                <option value="NFe">NF-e</option>
                <option value="NFCe">NFC-e</option>
                <option value="NFSe">NFS-e</option>
                <option value="CTe">CT-e</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SituacaoNota | 'todas')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                <option value="todas">Todas</option>
                <option value="autorizada">Autorizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="denegada">Denegada</option>
                <option value="processando">Processando</option>
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Erro</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Resultados ({invoices.length})
          </h2>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 size={48} className="mx-auto text-primary-500 mb-3 animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Buscando notas fiscais...
                    </p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhuma nota fiscal encontrada
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_TIPO_NF[invoice.tipo_nf]}`}>
                        {invoice.tipo_nf}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-gray-400" />
                        {invoice.numero_nf}/{invoice.serie}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                          <Building2 size={14} className="text-gray-400" />
                          {invoice.nome_emitente || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          CNPJ: {invoice.cnpj_emitente}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      {formatCurrency(invoice.valor_total)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.data_emissao)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_SITUACAO[invoice.situacao]}`}>
                        {invoice.situacao.charAt(0).toUpperCase() + invoice.situacao.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Visualizar"
                          onClick={() => {/* TODO: Abrir modal de detalhes */ }}
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download XML"
                          onClick={() => invoice.chave_acesso && handleDownloadXml(invoice.chave_acesso)}
                          disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                        >
                          {downloadingXml === invoice.chave_acesso ? (
                            <Loader2 size={18} className="text-gray-600 dark:text-gray-400 animate-spin" />
                          ) : (
                            <Download size={18} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 size={48} className="mx-auto text-primary-500 mb-3 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">
                Buscando notas fiscais...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma nota fiscal encontrada
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  {/* Header: Número e Tipo */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hash size={16} className="text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {invoice.numero_nf}/{invoice.serie}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_TIPO_NF[invoice.tipo_nf]}`}>
                      {invoice.tipo_nf}
                    </span>
                  </div>

                  {/* Emissor */}
                  <div className="mb-3">
                    <div className="flex items-start gap-2">
                      <Building2 size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.nome_emitente || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          CNPJ: {invoice.cnpj_emitente}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Valor e Data */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor</p>
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(invoice.valor_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Emissão</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.data_emissao)}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_SITUACAO[invoice.situacao]}`}>
                      {invoice.situacao.charAt(0).toUpperCase() + invoice.situacao.slice(1)}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                      className="flex-1 py-2 px-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                      onClick={() => {/* TODO: Abrir modal de detalhes */ }}
                    >
                      <Eye size={16} />
                      Visualizar
                    </button>
                    <button
                      className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-white"
                      onClick={() => invoice.chave_acesso && handleDownloadXml(invoice.chave_acesso)}
                      disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                    >
                      {downloadingXml === invoice.chave_acesso ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {downloadingXml === invoice.chave_acesso ? 'Baixando...' : 'Download XML'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
