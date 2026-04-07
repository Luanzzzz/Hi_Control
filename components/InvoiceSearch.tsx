/**
 * FLUXO OFICIAL DE BUSCA FISCAL
 * Rota: ViewState.INVOICE_SEARCH
 * Endpoint de busca: POST /nfe/empresas/{id}/notas/buscar
 * Endpoint de certificado: GET /certificados/empresas/{id}/certificado/status
 *   → via certificadoService.obterStatus() (src/services/certificadoService.ts)
 * Google Drive: apoio documental — acessado via Configurações, não aqui.
 * Bot de sincronização: acionado sob demanda quando não houver dados locais.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  Calendar,
  FileText,
  Download,
  Archive,
  Upload,
  Eye,
  RefreshCw,
  Building2,
  Hash,
  Loader2,
} from 'lucide-react';
import { Button, PageHeader, SearchBar, InlineAlert, LoadingState, EmptyState } from '../src/components/ui';
import {
  buscarNotasEmpresa,
  buscarTodasNotasEmpresa,
  baixarXmlNota,
  baixarXmlsLoteEmpresa,
  downloadBlob,
  salvarXmlsLoteNoDrive,
} from '../src/services/notaFiscalService';
import { downloadDANFCE, downloadDACTE, downloadPDF } from '../src/services/fiscalService';
import type { NotaFiscal, TipoNotaFiscal, SituacaoNota } from '../src/types/notaFiscal';
import { CORES_TIPO_NF, CORES_SITUACAO } from '../src/types/notaFiscal';
import { empresaService, Empresa } from '../services/empresaService';
import { certificadoService } from '../src/services/certificadoService';
import { botService } from '../src/services/botService';
// ClienteSelector canônico — BotStatus e BotMetricas removidos (pertencem ao Dashboard)
import { ClienteSelector, FonteDadosIndicador } from '../src/components/BuscadorNotas/index';
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

interface BuscaVaziaContexto {
  title: string;
  description: string;
  syncAvailable: boolean;
}

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
  const [fonteResultado, setFonteResultado] = useState<'cache' | 'sefaz' | 'banco_local' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);
  const [buscaExecutada, setBuscaExecutada] = useState(false);
  const [buscaVaziaContexto, setBuscaVaziaContexto] = useState<BuscaVaziaContexto | null>(null);
  const [solicitandoSincronizacao, setSolicitandoSincronizacao] = useState(false);

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
  const [carregandoTodas, setCarregandoTodas] = useState<boolean>(false);
  const [baixandoXmlsLote, setBaixandoXmlsLote] = useState<boolean>(false);
  const [salvandoXmlsDrive, setSalvandoXmlsDrive] = useState<boolean>(false);
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

  useEffect(() => {
    setInvoices([]);
    setFonteResultado(null);
    setError(null);
    setBuscaExecutada(false);
    setBuscaVaziaContexto(null);
    setUltimoNSU(0);
    setMaxNSU(0);
    setTemMaisNotas(false);
  }, [empresaSelecionada?.id]);

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

  const obterCnpjEmpresaSelecionada = (): string | null => {
    if (!empresaSelecionada?.cnpj) {
      return null;
    }

    const cnpjLimpo = empresaSelecionada.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return null;
    }

    return cnpjLimpo;
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

    const erroPeriodo = validarPeriodo();
    if (erroPeriodo) {
      setError(`⚠️ ${erroPeriodo}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setBuscaExecutada(true);
    setBuscaVaziaContexto(null);
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

      const cnpjLimpo = obterCnpjEmpresaSelecionada();

      if (!cnpjLimpo) {
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
        const partesDescricao = [
          resultado.mensagem || 'Nenhuma nota encontrada apos consultar a SEFAZ e o historico local desta empresa.',
        ];

        if (resultado.ultima_sincronizacao) {
          partesDescricao.push(
            `Última sincronização registrada em ${formatDateTime(resultado.ultima_sincronizacao)}.`
          );
        } else {
          partesDescricao.push('Ainda não há sincronização registrada para esta empresa.');
        }

        setBuscaVaziaContexto({
          title: 'Nenhuma nota encontrada',
          description: partesDescricao.join(' '),
          syncAvailable: Boolean(resultado.sincronizacao_disponivel),
        });

        if (resultado.success === false && resultado.mensagem) {
          setError(resultado.mensagem);
        }
      } else {
        setBuscaVaziaContexto(null);
      }

      // Feedback de sucesso ao usuário
      const origemMap: Record<string, string> = {
        cache: 'cache local',
        banco_local: 'banco local',
        sefaz: 'SEFAZ',
      };
      const icone = resultado.fonte === 'cache' ? '💾' : resultado.fonte === 'banco_local' ? '🗄️' : '🌐';
      const origem = origemMap[resultado.fonte] ?? resultado.fonte;
      console.log(
        `${icone} ${resultado.total_notas} notas encontradas (${origem}) | novas sincronizadas: ${resultado.novas_notas_sincronizadas ?? 0}`
      );
    } catch (err: any) {
      const mensagemErro = err.message || 'Erro ao buscar notas fiscais. Tente novamente.';
      setError(mensagemErro);
      setBuscaVaziaContexto(null);

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
      const cnpjLimpo = obterCnpjEmpresaSelecionada();
      if (!cnpjLimpo) {
        throw new Error('CNPJ inválido para carregar mais notas.');
      }

      // Buscar próxima página a partir do último NSU (sem +1: ultimo_nsu já é o próximo offset)
      const resultado = await buscarNotasEmpresa(empresaSelecionada.id, {
        cnpj: cnpjLimpo,
        nsu_inicial: ultimoNSU,
        max_notas: limitePorPagina
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

  const handleCarregarTodasNotas = async () => {
    if (!empresaSelecionada || carregandoTodas) {
      return;
    }

    const cnpjLimpo = obterCnpjEmpresaSelecionada();
    if (!cnpjLimpo) {
      setError('⚠️ CNPJ inválido para carregar todas as notas.');
      return;
    }

    setCarregandoTodas(true);
    setError(null);

    try {
      const resultado = await buscarTodasNotasEmpresa(
        empresaSelecionada.id,
        { cnpj: cnpjLimpo },
        Math.max(limitePorPagina, 200)
      );

      setInvoices(resultado.notas || []);
      setFonteResultado(resultado.fonte ?? null);
      setUltimoNSU(resultado.max_nsu);
      setMaxNSU(resultado.max_nsu);
      setTemMaisNotas(false);
      setBuscaExecutada(true);

      setError(`ℹ️ Todas as ${resultado.notas.length} notas fiscais da empresa foram carregadas.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar todas as notas.');
    } finally {
      setCarregandoTodas(false);
    }
  };

  const handleBaixarXmlsLote = async () => {
    if (!empresaSelecionada || baixandoXmlsLote) {
      return;
    }

    const cnpjLimpo = obterCnpjEmpresaSelecionada();
    if (!cnpjLimpo) {
      setError('⚠️ CNPJ inválido para exportar XMLs.');
      return;
    }

    setBaixandoXmlsLote(true);
    setError(null);

    try {
      const blob = await baixarXmlsLoteEmpresa(empresaSelecionada.id, {
        cnpj: cnpjLimpo,
        sincronizar_antes: true,
      });
      const nomeArquivo = `XMLs_${cnpjLimpo}_${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, nomeArquivo);
      setError('ℹ️ Lote de XMLs gerado com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao baixar XMLs em lote.');
    } finally {
      setBaixandoXmlsLote(false);
    }
  };

  const handleSalvarXmlsDrive = async () => {
    if (!empresaSelecionada || salvandoXmlsDrive) {
      return;
    }

    const cnpjLimpo = obterCnpjEmpresaSelecionada();
    if (!cnpjLimpo) {
      setError('⚠️ CNPJ inválido para salvar XMLs no Drive.');
      return;
    }

    setSalvandoXmlsDrive(true);
    setError(null);

    try {
      const resultado = await salvarXmlsLoteNoDrive(empresaSelecionada.id, {
        cnpj: cnpjLimpo,
        sincronizar_antes: true,
      });

      setError(
        `ℹ️ Exportação concluída: ${resultado.xmls_salvos_drive} XMLs salvos no Drive, ` +
        `${resultado.xmls_ignorados_drive} ignorados e ${resultado.xmls_sem_conteudo} sem conteúdo.`
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar XMLs no Drive.');
    } finally {
      setSalvandoXmlsDrive(false);
    }
  };

  const handleSolicitarSincronizacao = async () => {
    setSolicitandoSincronizacao(true);
    setError(null);

    try {
      await botService.forcarSincronizacao();
      setError('ℹ️ Sincronização assistida solicitada. Tente a busca novamente em instantes.');
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar sincronização automática.');
    } finally {
      setSolicitandoSincronizacao(false);
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

  const formatDateTime = (date: string): string => {
    return new Date(date).toLocaleString('pt-BR');
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

  const errorVariant = error?.startsWith('ℹ️') ? 'info' : error?.startsWith('⚠️') ? 'warning' : 'error';
  const errorMessage = error?.replace(/^[ℹ️⚠️\s]+/, '');

  const filterSelectClass = "w-full px-3 py-2 bg-hc-surface border border-hc-border rounded-lg focus:outline-none focus:border-hc-purple text-hc-text text-sm transition-colors";
  const filterLabelClass = "block text-xs font-medium text-hc-muted mb-1.5";
  const semResultadosPorFiltro = invoices.length > 0 && invoicesFiltrados.length === 0;

  const emptyStateProps = semResultadosPorFiltro
    ? {
        title: 'Nenhum resultado para os filtros atuais',
        description: 'Ajuste ou limpe os filtros para visualizar as notas já encontradas.',
        action: (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        ),
      }
    : buscaVaziaContexto
    ? {
        title: buscaVaziaContexto.title,
        description: buscaVaziaContexto.description,
        action: buscaVaziaContexto.syncAvailable ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            loading={solicitandoSincronizacao}
            onClick={handleSolicitarSincronizacao}
          >
            Solicitar sincronização assistida
          </Button>
        ) : undefined,
      }
    : buscaExecutada
    ? {
        title: 'Busca concluída sem resultados',
        description: 'Não há notas disponíveis na SEFAZ nem no histórico local para os critérios informados.',
        action: undefined,
      }
    : {
        title: 'Nenhuma busca realizada',
        description: 'Selecione uma empresa e clique em Buscar para consultar.',
        action: undefined,
      };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="Buscador de Notas Fiscais"
        subtitle="Consulta automática na SEFAZ com histórico consolidado da empresa"
        actions={
          <Button
            variant="primary"
            leftIcon={<RefreshCw size={15} />}
            loading={isLoading}
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </Button>
        }
      />

      {/* Seletor de empresa */}
      <div className="bg-hc-surface rounded-xl border border-hc-border p-4" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <label className="block text-xs font-medium text-hc-muted mb-2">
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
      <div className="bg-hc-surface rounded-xl border border-hc-border p-4 space-y-4" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <div className="flex gap-3">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por número, chave de acesso, CNPJ ou nome do emissor..."
            className="flex-1"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              showFilters
                ? 'bg-hc-purple text-white'
                : 'bg-hc-card border border-hc-border text-hc-text hover:bg-hc-hover'
            }`}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-hc-border">
            <div>
              <label className={filterLabelClass}>Tipo de Nota</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as TipoNotaFiscal | 'TODAS')}
                className={filterSelectClass}
              >
                <option value="TODAS">Todos os Tipos</option>
                <option value="NFe">NF-e (Modelo 55)</option>
                <option value="NFCe">NFC-e (Modelo 65)</option>
                <option value="CTe">CT-e (Modelo 57)</option>
                <option value="NFSe">NFS-e (Serviço)</option>
              </select>
            </div>

            <div>
              <label className={filterLabelClass}>Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SituacaoNota | 'todas')}
                className={filterSelectClass}
              >
                <option value="todas">Todas</option>
                <option value="autorizada">Autorizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="denegada">Denegada</option>
                <option value="processando">Processando</option>
              </select>
            </div>

            <div>
              <label className={filterLabelClass}>Data Inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-hc-muted pointer-events-none" size={14} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`${filterSelectClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className={filterLabelClass}>Data Final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-hc-muted pointer-events-none" size={14} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`${filterSelectClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className={filterLabelClass}>Notas por Página</label>
              <select
                value={limitePorPagina}
                onChange={(e) => setLimitePorPagina(Number(e.target.value))}
                className={filterSelectClass}
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
                className="text-sm text-hc-muted hover:text-hc-text transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerta de erro/info/aviso */}
      {error && (
        <InlineAlert variant={errorVariant} message={errorMessage ?? error} onDismiss={() => setError(null)} />
      )}

      {/* Resultados */}
      <div className="bg-hc-surface rounded-xl border border-hc-border overflow-hidden" style={{ boxShadow: 'var(--hc-shadow)' }}>
        <div className="px-5 py-3.5 border-b border-hc-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-hc-text">
            Resultados ({invoicesFiltrados.length}
            {invoicesFiltrados.length !== invoices.length ? ` de ${invoices.length}` : ''})
          </h2>
          <div className="flex items-center gap-2">
            {empresaSelecionada && buscaExecutada && invoices.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Archive size={14} />}
                  loading={baixandoXmlsLote}
                  onClick={handleBaixarXmlsLote}
                  disabled={baixandoXmlsLote || salvandoXmlsDrive}
                >
                  Baixar XMLs
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Upload size={14} />}
                  loading={salvandoXmlsDrive}
                  onClick={handleSalvarXmlsDrive}
                  disabled={salvandoXmlsDrive || baixandoXmlsLote}
                >
                  Salvar no Drive
                </Button>
              </>
            )}
            <FonteDadosIndicador fonte={fonteResultado} />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-hc-card text-hc-muted">
              <tr>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Tipo</th>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Número/Série</th>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Emissor</th>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Valor</th>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Emissão</th>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-xs tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hc-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <LoadingState message="Buscando notas fiscais..." />
                  </td>
                </tr>
              ) : invoicesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<FileText size={32} />}
                      title={emptyStateProps.title}
                      description={emptyStateProps.description}
                      action={emptyStateProps.action}
                    />
                  </td>
                </tr>
              ) : (
                invoicesFiltrados.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-hc-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_TIPO_NF[getTipoBase(invoice.tipo_nf)]}`}>
                        {invoice.tipo_nf}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-hc-text font-medium">
                      <div className="flex items-center gap-1.5">
                        <Hash size={13} className="text-hc-muted" />
                        {invoice.numero_nf}/{invoice.serie}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-hc-text font-medium flex items-center gap-1.5">
                        <Building2 size={13} className="text-hc-muted shrink-0" />
                        {invoice.nome_emitente || 'N/A'}
                      </p>
                      <p className="text-xs text-hc-muted mt-0.5 pl-5">
                        {invoice.cnpj_emitente}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-hc-text font-medium">
                      {formatCurrency(invoice.valor_total)}
                    </td>
                    <td className="px-5 py-3.5 text-hc-muted text-xs">
                      {formatDate(invoice.data_emissao)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_SITUACAO[getSituacaoNormalizada(invoice.situacao)]}`}>
                        {invoice.situacao.charAt(0).toUpperCase() + invoice.situacao.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 hover:bg-hc-hover rounded-lg transition-colors"
                          title="Visualizar"
                          onClick={() => handleVisualizarNota(invoice)}
                        >
                          <Eye size={16} className="text-hc-muted" />
                        </button>
                        {(invoice.tipo_nf === 'NFCe' || invoice.tipo_nf === 'CTe') && (
                          <button
                            className="p-1.5 hover:bg-hc-info/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={`Download ${invoice.tipo_nf === 'NFCe' ? 'DANFCE' : 'DACTE'}`}
                            onClick={() => handleDownloadPdf(invoice)}
                            disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                          >
                            {downloadingXml === invoice.chave_acesso ? (
                              <Loader2 size={16} className="text-hc-info animate-spin" />
                            ) : (
                              <FileText size={16} className="text-hc-info" />
                            )}
                          </button>
                        )}
                        <button
                          className="p-1.5 hover:bg-hc-hover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Download XML"
                          onClick={() => invoice.chave_acesso && handleDownloadXml(invoice.chave_acesso)}
                          disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                        >
                          {downloadingXml === invoice.chave_acesso ? (
                            <Loader2 size={16} className="text-hc-muted animate-spin" />
                          ) : (
                            <Download size={16} className="text-hc-muted" />
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
            <LoadingState message="Buscando notas fiscais..." className="py-12" />
          ) : invoicesFiltrados.length === 0 ? (
            <EmptyState
              icon={<FileText size={32} />}
              title={emptyStateProps.title}
              description={emptyStateProps.description}
              action={emptyStateProps.action}
            />
          ) : (
            <div className="divide-y divide-hc-border">
              {invoicesFiltrados.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-hc-hover transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-hc-muted" />
                      <span className="font-semibold text-hc-text text-sm">
                        {invoice.numero_nf}/{invoice.serie}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_TIPO_NF[getTipoBase(invoice.tipo_nf)]}`}>
                      {invoice.tipo_nf}
                    </span>
                  </div>

                  <div className="mb-3 flex items-start gap-2">
                    <Building2 size={14} className="text-hc-muted mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-hc-text">
                        {invoice.nome_emitente || 'N/A'}
                      </p>
                      <p className="text-xs text-hc-muted">
                        {invoice.cnpj_emitente}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-hc-muted mb-0.5">Valor</p>
                      <p className="text-base font-bold text-hc-purple">
                        {formatCurrency(invoice.valor_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-hc-muted mb-0.5">Emissão</p>
                      <p className="text-sm text-hc-text">
                        {formatDate(invoice.data_emissao)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CORES_SITUACAO[getSituacaoNormalizada(invoice.situacao)]}`}>
                      {invoice.situacao.charAt(0).toUpperCase() + invoice.situacao.slice(1)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-hc-border">
                    <button
                      className="flex-1 py-2 px-3 bg-hc-card border border-hc-border hover:bg-hc-hover rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-hc-text"
                      onClick={() => handleVisualizarNota(invoice)}
                    >
                      <Eye size={15} />
                      Visualizar
                    </button>
                    {(invoice.tipo_nf === 'NFCe' || invoice.tipo_nf === 'CTe') && (
                      <button
                        className="flex-1 py-2 px-3 bg-hc-info/15 hover:bg-hc-info/25 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-hc-info"
                        onClick={() => handleDownloadPdf(invoice)}
                        disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                      >
                        {downloadingXml === invoice.chave_acesso ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <FileText size={15} />
                        )}
                        {invoice.tipo_nf === 'NFCe' ? 'DANFCE' : 'DACTE'}
                      </button>
                    )}
                    <button
                      className="flex-1 py-2 px-3 bg-hc-purple/15 hover:bg-hc-purple/25 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-hc-purple"
                      onClick={() => invoice.chave_acesso && handleDownloadXml(invoice.chave_acesso)}
                      disabled={!invoice.chave_acesso || downloadingXml === invoice.chave_acesso}
                    >
                      {downloadingXml === invoice.chave_acesso ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Download size={15} />
                      )}
                      XML
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Carregar mais */}
        {invoices.length > 0 && temMaisNotas && !searchTerm && selectedType === 'TODAS' && selectedStatus === 'todas' && (
          <div className="p-4 border-t border-hc-border flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              leftIcon={<Download size={15} />}
              loading={carregandoMais}
              onClick={handleCarregarMais}
              disabled={carregandoMais}
            >
              Carregar Mais Notas
              {maxNSU > 0 && !carregandoMais && (
                <span className="text-hc-muted ml-1.5 text-xs">({invoicesFiltrados.length} de ~{maxNSU})</span>
              )}
            </Button>
            <Button
              variant="ghost"
              loading={carregandoTodas}
              onClick={handleCarregarTodasNotas}
              disabled={carregandoTodas || carregandoMais}
            >
              Carregar Todas
            </Button>
          </div>
        )}

        {invoices.length > 0 && !temMaisNotas && (
          <p className="p-4 text-center text-hc-muted text-xs border-t border-hc-border">
            Todas as {invoices.length} notas foram carregadas
          </p>
        )}
      </div>

      {/* Modal de Visualização */}
      {mostrarModal && notaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleFecharModal}>
          <div className="bg-hc-surface rounded-xl border border-hc-border max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ boxShadow: 'var(--hc-shadow-md)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-hc-purple to-primary-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-base font-semibold">Detalhes da Nota Fiscal</h3>
                <p className="text-xs opacity-80 mt-0.5">NFe Nº {notaSelecionada.numero_nf} — Série {notaSelecionada.serie}</p>
              </div>
              <button
                onClick={handleFecharModal}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-2 border-hc-purple pl-4">
                  <p className="text-xs text-hc-muted">Tipo</p>
                  <p className="font-semibold text-hc-text mt-0.5">{notaSelecionada.tipo_nf}</p>
                </div>
                <div className="border-l-2 border-hc-green pl-4">
                  <p className="text-xs text-hc-muted">Data de Emissão</p>
                  <p className="font-semibold text-hc-text mt-0.5">{formatDate(notaSelecionada.data_emissao)}</p>
                </div>
                <div className="border-l-2 border-hc-accent pl-4">
                  <p className="text-xs text-hc-muted">Valor Total</p>
                  <p className="font-semibold text-hc-text text-lg mt-0.5">{formatCurrency(notaSelecionada.valor_total)}</p>
                </div>
                <div className="border-l-2 border-hc-amber pl-4">
                  <p className="text-xs text-hc-muted mb-1">Situação</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${CORES_SITUACAO[getSituacaoNormalizada(notaSelecionada.situacao)]}`}>
                    {notaSelecionada.situacao.charAt(0).toUpperCase() + notaSelecionada.situacao.slice(1)}
                  </span>
                </div>
              </div>

              <div className="bg-hc-card rounded-lg p-4">
                <h4 className="text-sm font-semibold text-hc-text mb-2 flex items-center gap-2">
                  <Building2 size={16} className="text-hc-purple" />
                  Emitente
                </h4>
                <p className="font-medium text-hc-text text-sm">{notaSelecionada.nome_emitente}</p>
                <p className="text-xs text-hc-muted mt-0.5">CNPJ: {notaSelecionada.cnpj_emitente}</p>
              </div>

              <div className="bg-hc-card rounded-lg p-4">
                <h4 className="text-sm font-semibold text-hc-text mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-hc-purple" />
                  Chave de Acesso
                </h4>
                <p className="font-mono text-xs text-hc-text break-all bg-hc-surface p-2 rounded border border-hc-border">
                  {notaSelecionada.chave_acesso}
                </p>
              </div>

              {notaSelecionada.nsu && (
                <div className="flex items-center gap-2 text-xs text-hc-muted">
                  <Hash size={13} />
                  NSU: {notaSelecionada.nsu}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-hc-card px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-hc-border">
              <Button variant="secondary" onClick={handleFecharModal}>
                Fechar
              </Button>
              <Button
                variant="primary"
                leftIcon={<Download size={15} />}
                onClick={() => notaSelecionada.chave_acesso && handleDownloadXml(notaSelecionada.chave_acesso)}
                disabled={!notaSelecionada.chave_acesso}
              >
                Baixar XML
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
