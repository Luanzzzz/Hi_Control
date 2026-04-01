/**
 * FLUXO OFICIAL DE BUSCA FISCAL
 * Rota: ViewState.INVOICE_SEARCH
 * Endpoint de busca: POST /nfe/empresas/{id}/notas/buscar
 * Endpoint de certificado: GET /certificados/empresas/{id}/certificado/status
 *   → via certificadoService.obterStatus() (src/services/certificadoService.ts)
 * Google Drive: apoio documental — acessado via Configurações, não aqui.
 * Bot de sincronização: monitorado no Dashboard, não aqui.
 */
import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { buscarNotasEmpresa, baixarXmlNota, downloadBlob } from '../src/services/notaFiscalService';
import { downloadDANFCE, downloadDACTE, downloadPDF } from '../src/services/fiscalService';
import type { NotaFiscal, TipoNotaFiscal, SituacaoNota } from '../src/types/notaFiscal';
import { CORES_TIPO_NF, CORES_SITUACAO } from '../src/types/notaFiscal';
import { empresaService, Empresa } from '../services/empresaService';
import { certificadoService } from '../src/services/certificadoService';
// ClienteSelector canônico — BotStatus e BotMetricas removidos (pertencem ao Dashboard)
import { ClienteSelector, FonteDadosIndicador } from '../src/components/BuscadorNotas';
import type { CertificadoStatus as CertificadoStatusBadge } from '../src/components/BuscadorNotas/CertificadoBadge';

// Mapeamento: CertificadoStatus do certificadoService → CertificadoStatus do CertificadoBadge
const mapCertStatus = (status: string): CertificadoStatusBadge => {
  const map: Record<string, CertificadoStatusBadge> = {
    valido: 'ativo',
    expirando_em_breve: 'expirando',
    expirado: 'vencido',
    ausente: 'ausente',
  };
  return map[status] ?? 'erro';
};

// ===== Funções Auxiliares =====

/**
 * Extrai o tipo base de nota de strings formatadas
 * Ex: "NFe Entrada" → "NFe", "NFCe Saída" → "NFCe"
 */
const getTipoBase = (tipoFormatado: string): TipoNotaFiscal => {
  const match = tipoFormatado.match(/^(NFe|NFCe|NFSe|CTe)/i);
  if (match) {
    return match[1] as TipoNotaFiscal;
  }
  return 'NFe' as TipoNotaFiscal; // Fallback
};

/**
 * Helper para normalizar situação (backend retorna uppercase, CORES_SITUACAO espera lowercase)
 * Ex: "AUTORIZADA" → "autorizada"
 */
const getSituacaoNormalizada = (situacao: string): SituacaoNota => {
  const situacaoLower = situacao.toLowerCase() as SituacaoNota;
  // Validar que é uma situação válida
  const situacoesValidas: SituacaoNota[] = ['autorizada', 'cancelada', 'denegada', 'processando'];
  if (situacoesValidas.includes(situacaoLower)) {
    return situacaoLower;
  }
  return 'autorizada' as SituacaoNota; // Fallback seguro
};

// ClienteSelector inline removido — usando canônico de src/components/BuscadorNotas/

export const InvoiceSearch: React.FC = () => {
  // Estado da empresa selecionada
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);

  // Status de certificado — via certificadoService (endpoint oficial)
  const [statusCertificado, setStatusCertificado] = useState<
    { status: CertificadoStatusBadge; dias_para_vencer?: number } | null
  >(null);

  useEffect(() => {
    if (!empresaSelecionada) {
      setStatusCertificado(null);
      return;
    }
    certificadoService.obterStatus(empresaSelecionada.id).then((res) => {
      setStatusCertificado({
        status: mapCertStatus(res.status),
        dias_para_vencer: res.dias_restantes ?? undefined,
      });
    }).catch(() => {
      setStatusCertificado({ status: 'erro' });
    });
  }, [empresaSelecionada?.id]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TipoNotaFiscal | 'TODAS'>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<SituacaoNota | 'todas'>('todas');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Estados da API
  const [invoices, setInvoices] = useState<NotaFiscal[]>([]);
  const [fonteResultado, setFonteResultado] = useState<'cache' | 'sefaz' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);

  // Filtro client-side aplicado sobre os resultados da busca
  const invoicesFiltrados = useMemo(() => {
    let lista = invoices;

    if (selectedType !== 'TODAS') {
      lista = lista.filter((n) => getTipoBase(n.tipo_nf) === selectedType);
    }
    if (selectedStatus !== 'todas') {
      lista = lista.filter(
        (n) => getSituacaoNormalizada(n.situacao) === selectedStatus
      );
    }
    if (dateFrom) {
      lista = lista.filter((n) => n.data_emissao >= dateFrom);
    }
    if (dateTo) {
      lista = lista.filter((n) => n.data_emissao <= dateTo + 'T23:59:59');
    }
    if (searchTerm.trim()) {
      const termo = searchTerm.trim().toLowerCase();
      lista = lista.filter(
        (n) =>
          n.numero_nf?.toLowerCase().includes(termo) ||
          n.chave_acesso?.toLowerCase().includes(termo) ||
          n.cnpj_emitente?.includes(termo.replace(/\D/g, '')) ||
          n.nome_emitente?.toLowerCase().includes(termo)
      );
    }
    return lista;
  }, [invoices, selectedType, selectedStatus, dateFrom, dateTo, searchTerm]);

  // Estados de paginação NSU
  const [ultimoNSU, setUltimoNSU] = useState<number>(0);
  const [maxNSU, setMaxNSU] = useState<number>(0);
  const [temMaisNotas, setTemMaisNotas] = useState<boolean>(false);
  const [carregandoMais, setCarregandoMais] = useState<boolean>(false);
  const [limitePorPagina, setLimitePorPagina] = useState<number>(50); // Quantidade de notas por página

  // Estado do modal de visualização
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscal | null>(null);
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);

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

    setIsLoading(true);
    setError(null);
    setInvoices([]);  // Limpar resultados anteriores
    setFonteResultado(null);
    setUltimoNSU(0);  // Resetar paginação
    setMaxNSU(0);
    setTemMaisNotas(false);

    try {
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

      // Buscar notas (primeira página)
      const resultado = await buscarNotasEmpresa(empresaSelecionada.id, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,        // Começar do NSU 0
        max_notas: limitePorPagina  // Usar limite configurado
      });

      console.log('✅ Busca concluída:', {
        total: resultado.total_notas,
        fonte: resultado.fonte,
        tem_mais: resultado.tem_mais_notas,
        ultimo_nsu: resultado.ultimo_nsu,
        max_nsu: resultado.max_nsu
      });

      // Validar estrutura dos dados
      if (resultado.notas?.length > 0) {
        const primeiraNota = resultado.notas[0];
        console.log('📋 Estrutura da primeira nota:', Object.keys(primeiraNota));
        console.log('📋 Dados da primeira nota:', primeiraNota);
      }

      setInvoices(resultado.notas || []);
      setFonteResultado(resultado.fonte ?? null);
      setUltimoNSU(resultado.ultimo_nsu);
      setMaxNSU(resultado.max_nsu);
      setTemMaisNotas(resultado.tem_mais_notas);

      if (resultado.total_notas === 0) {
        setError('ℹ️ Nenhuma nota fiscal encontrada para esta empresa');
      }

      // Feedback de sucesso ao usuário
      const icone = resultado.fonte === 'cache' ? '💾' : '🌐';
      const origem = resultado.fonte === 'cache' ? 'cache local' : 'SEFAZ';
      console.log(`${icone} ${resultado.total_notas} notas encontradas (${origem})`);
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

  // Carregar mais notas (paginação)
  const handleCarregarMais = async () => {
    if (!empresaSelecionada || carregandoMais || !temMaisNotas) {
      return;
    }

    setCarregandoMais(true);
    setError(null);

    try {
      const cnpjLimpo = empresaSelecionada.cnpj.replace(/\D/g, '');

      // Buscar próxima página a partir do último NSU
      const resultado = await buscarNotasEmpresa(empresaSelecionada.id, {
        cnpj: cnpjLimpo,
        nsu_inicial: ultimoNSU + 1,  // Próximo NSU
        max_notas: limitePorPagina  // Usar limite configurado
      });

      console.log(`✅ Página adicional carregada: +${resultado.notas.length} notas`);

      // ACUMULAR resultados (não substituir)
      setInvoices(prev => [...prev, ...(resultado.notas || [])]);
      setUltimoNSU(resultado.ultimo_nsu);
      setMaxNSU(resultado.max_nsu);
      setTemMaisNotas(resultado.tem_mais_notas);

    } catch (err: any) {
      console.error('❌ Erro ao carregar mais notas:', err);
      setError(`Erro ao carregar mais notas: ${err.message}`);
    } finally {
      setCarregandoMais(false);
    }
  };

  // Handlers do modal
  const handleVisualizarNota = (nota: NotaFiscal) => {
    console.log('👁️ Visualizando nota:', nota);
    setNotaSelecionada(nota);
    setMostrarModal(true);
  };

  const handleFecharModal = () => {
    setMostrarModal(false);
    setNotaSelecionada(null);
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

  // Download de PDF (DANFCE, DACTE, etc)
  const handleDownloadPdf = async (nota: NotaFiscal) => {
    if (!nota.chave_acesso) {
      setError('Chave de acesso não disponível para esta nota.');
      return;
    }

    setDownloadingXml(nota.chave_acesso); // Reutilizando estado de loading
    try {
      let blob: Blob;
      let nomeArquivo: string;

      switch (nota.tipo_nf) {
        case 'NFCe':
          blob = await downloadDANFCE(nota.chave_acesso);
          nomeArquivo = `DANFCE_${nota.chave_acesso}.pdf`;
          break;
        case 'CTe':
          blob = await downloadDACTE(nota.chave_acesso);
          nomeArquivo = `DACTE_${nota.chave_acesso}.pdf`;
          break;
        case 'NFe':
          // Assumir que existe endpoint para DANFE (pode ser implementado depois)
          setError('Download de DANFE ainda não implementado. Use o XML.');
          return;
        case 'NFSe':
          setError('Download de PDF para NFS-e ainda não implementado.');
          return;
        default:
          setError('Tipo de documento não suportado para download de PDF.');
          return;
      }

      downloadPDF(blob, nomeArquivo);
    } catch (err: any) {
      setError(err.message || 'Erro ao baixar PDF. Tente novamente.');
    } finally {
      setDownloadingXml(null);
    }
  };


  // Formatar valor (aceita number, string ou undefined para evitar .toFixed is not a function)
  const formatCurrency = (value: unknown): string => {
    const num = typeof value === 'number' && !Number.isNaN(value) ? value : parseFloat(String(value ?? '0')) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
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
        <div className="flex items-center gap-4">
          {/* Botão Buscar */}
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
      </div>

      {/* SELETOR DE CLIENTE */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Selecione a Empresa
        </label>
        <ClienteSelector
          empresaId={empresaSelecionada?.id ?? null}
          onSelect={(empresa) => setEmpresaSelecionada(empresa as Empresa)}
          statusCertificado={statusCertificado}
          disabled={loadingEmpresa}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Nota
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as TipoNotaFiscal | 'TODAS')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                <option value="TODAS">Todos os Tipos</option>
                <option value="NFe">NF-e (Modelo 55)</option>
                <option value="NFCe">NFC-e (Modelo 65)</option>
                <option value="CTe">CT-e (Modelo 57)</option>
                <option value="NFSe">NFS-e (Serviço)</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas por Página
              </label>
              <select
                value={limitePorPagina}
                onChange={(e) => setLimitePorPagina(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                <option value={10}>10 notas</option>
                <option value={25}>25 notas</option>
                <option value={50}>50 notas</option>
                <option value={100}>100 notas</option>
                <option value={200}>200 notas</option>
              </select>
            </div>

            <div className="md:col-span-5 flex justify-end">
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
            Resultados ({invoicesFiltrados.length}
            {invoicesFiltrados.length !== invoices.length ? ` de ${invoices.length}` : ''})
          </h2>
          <FonteDadosIndicador fonte={fonteResultado} />
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
              ) : invoicesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhuma nota fiscal encontrada
                    </p>
                  </td>
                </tr>
              ) : (
                invoicesFiltrados.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_TIPO_NF[getTipoBase(invoice.tipo_nf)]}`}>
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_SITUACAO[getSituacaoNormalizada(invoice.situacao)]}`}>
                        {invoice.situacao.charAt(0).toUpperCase() + invoice.situacao.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Visualizar"
                          onClick={() => handleVisualizarNota(invoice)}
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        {/* Botão Download PDF (NFC-e, CT-e) */}
                        {(invoice.tipo_nf === 'NFCe' || invoice.tipo_nf === 'CTe') && (
                          <button
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Download ${invoice.tipo_nf === 'NFCe' ? 'DANFCE' : 'DACTE'}`}
                            onClick={() => handleDownloadPdf(invoice)}
                            disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                          >
                            {downloadingXml === invoice.chave_acesso ? (
                              <Loader2 size={18} className="text-blue-600 dark:text-blue-400 animate-spin" />
                            ) : (
                              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                            )}
                          </button>
                        )}
                        {/* Botão Download XML */}
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
          ) : invoicesFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma nota fiscal encontrada
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {invoicesFiltrados.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  {/* Header: Número e Tipo */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hash size={16} className="text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {invoice.numero_nf}/{invoice.serie}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_TIPO_NF[getTipoBase(invoice.tipo_nf)]}`}>
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_SITUACAO[getSituacaoNormalizada(invoice.situacao)]}`}>
                      {invoice.situacao.charAt(0).toUpperCase() + invoice.situacao.slice(1)}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                      className="flex-1 py-2 px-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                      onClick={() => handleVisualizarNota(invoice)}
                    >
                      <Eye size={16} />
                      Visualizar
                    </button>
                    {/* Botão PDF para NFC-e e CT-e */}
                    {(invoice.tipo_nf === 'NFCe' || invoice.tipo_nf === 'CTe') && (
                      <button
                        className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-white"
                        onClick={() => handleDownloadPdf(invoice)}
                        disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                      >
                        {downloadingXml === invoice.chave_acesso ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <FileText size={16} />
                        )}
                        {invoice.tipo_nf === 'NFCe' ? 'DANFCE' : 'DACTE'}
                      </button>
                    )}
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
                      XML
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão Carregar Mais */}
        {invoices.length > 0 && temMaisNotas && !searchTerm && selectedType === 'TODAS' && selectedStatus === 'todas' && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleCarregarMais}
              disabled={carregandoMais}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {carregandoMais ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Carregar Mais Notas</span>
                  {maxNSU > 0 && (
                    <span className="text-sm opacity-75">
                      ({invoicesFiltrados.length} de ~{maxNSU})
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* Info de fim da lista */}
        {invoices.length > 0 && !temMaisNotas && (
          <div className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            ✅ Todas as {invoices.length} notas foram carregadas
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      {mostrarModal && notaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleFecharModal}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h3 className="text-xl font-bold">Detalhes da Nota Fiscal</h3>
                <p className="text-sm opacity-90">NFe Nº {notaSelecionada.numero_nf} - Série {notaSelecionada.serie}</p>
              </div>
              <button
                onClick={handleFecharModal}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{notaSelecionada.tipo_nf}</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Data de Emissão</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {formatDate(notaSelecionada.data_emissao)}
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total</p>
                  <p className="font-semibold text-gray-800 dark:text-white text-lg">
                    {formatCurrency(notaSelecionada.valor_total)}
                  </p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Situação</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${CORES_SITUACAO[getSituacaoNormalizada(notaSelecionada.situacao)]}`}>
                    {notaSelecionada.situacao.charAt(0).toUpperCase() + notaSelecionada.situacao.slice(1)}
                  </span>
                </div>
              </div>

              {/* Emitente */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600" />
                  Emitente
                </h4>
                <p className="font-medium text-gray-800 dark:text-white">{notaSelecionada.nome_emitente}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">CNPJ: {notaSelecionada.cnpj_emitente}</p>
              </div>

              {/* Chave de Acesso */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  Chave de Acesso
                </h4>
                <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all bg-white dark:bg-slate-800 p-2 rounded border border-gray-200 dark:border-slate-600">
                  {notaSelecionada.chave_acesso}
                </p>
              </div>

              {/* NSU (se disponível) */}
              {notaSelecionada.nsu && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Hash size={16} />
                  NSU: {notaSelecionada.nsu}
                </div>
              )}
            </div>

            {/* Footer com ações */}
            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-lg border-t border-gray-200 dark:border-slate-600">
              <button
                onClick={handleFecharModal}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => notaSelecionada.chave_acesso && handleDownloadXml(notaSelecionada.chave_acesso)}
                disabled={!notaSelecionada.chave_acesso}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                Baixar XML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
