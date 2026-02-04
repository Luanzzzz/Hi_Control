/**
 * Componente de Busca de Notas Fiscais
 * Integrado com API backend FastAPI
 * 
 * ATUALIZADO: Sprint NFe Integration
 * - Seleção de empresa (cliente)
 * - Status de certificado
 * - Cache e fonte de dados
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import {
  Search,
  Filter,
  X,
  Download,
  Eye,
  FileText,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  History
} from 'lucide-react';

import type {
  NotaFiscal,
  FormularioFiltros,
  TipoNotaFiscal,
  SituacaoNota
} from '../types/notaFiscal';

import {
  OPCOES_TIPO_NF,
  OPCOES_SITUACAO,
  CORES_TIPO_NF,
  CORES_SITUACAO
} from '../types/notaFiscal';

import {
  buscarNotasAvancado,
  baixarXmlNota,
  downloadBlob,
  formatarMoeda,
  formatarData,
  iniciarBuscaNFe,
  verificarStatusBusca
} from '../services/notaFiscalService';

// Novos componentes do Sprint NFe Integration
import {
  ClienteSelector,
  CertificadoBadge,
  AlertaCertificado,
  FonteDadosIndicador
} from './BuscadorNotas/index';

// Hook customizado para busca por empresa
import { useBuscadorNotas } from '../hooks/useBuscadorNotas';

export const BuscadorNotas: React.FC = () => {
  // ===== Hook de Busca por Empresa (Sprint NFe Integration) =====
  const {
    empresaId,
    empresaNome,
    statusCertificado,
    certificadoLoading,
    fonte,
    alertaCertificado,
    podeBuscar,
    selecionarEmpresa,
    limparErro: limparErroEmpresa,
  } = useBuscadorNotas();

  // Estados locais
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscal | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Estados de Polling
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [statusBusca, setStatusBusca] = useState<string>("");
  const [filtrosAtuais, setFiltrosAtuais] = useState<any>(null);

  // Efeito para polling de status
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (pollingId && loading) {
      intervalId = setInterval(async () => {
        try {
          const job = await verificarStatusBusca(pollingId);

          if (job.status === 'completed') {
            setStatusBusca("Busca concluída! Atualizando resultados...");
            setPollingId(null);

            // Buscar resultados locais usando os filtros (agora que o sync terminou)
            if (filtrosAtuais) {
              const filtros = {
                tipo_nf: filtrosAtuais.tipoNf as TipoNotaFiscal | "TODAS",
                cnpj_emitente: filtrosAtuais.cnpjEmitente || undefined,
                data_inicio: filtrosAtuais.dataInicio.toISOString().split('T')[0],
                data_fim: filtrosAtuais.dataFim.toISOString().split('T')[0],
                numero_nf: filtrosAtuais.numeroNf || undefined,
                serie: filtrosAtuais.serie || undefined,
                situacao: filtrosAtuais.situacao as SituacaoNota | "todas"
              };
              const resultados = await buscarNotasAvancado(filtros);
              setNotas(resultados);
              if (resultados.length === 0) {
                setErro("Nenhuma nota encontrada após sincronização.");
              }
            }
            setLoading(false);
          } else if (job.status === 'failed') {
            setErro(`Falha na busca SEFAZ: ${job.error || 'Erro desconhecido'}`);
            setPollingId(null);
            setLoading(false);
          } else {
            setStatusBusca(job.status === 'processing' ? 'Processando junto à SEFAZ...' : 'Aguardando início...');
          }
        } catch (error) {
          console.error("Erro no polling:", error);
          // Opcional: contar falhas e abortar? Por enquanto continua tentando.
        }
      }, 3000); // Poll a cada 3s
    }

    return () => clearInterval(intervalId);
  }, [pollingId, loading, filtrosAtuais]);

  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormularioFiltros>({
    defaultValues: {
      tipoNf: "TODAS",
      cnpjEmitente: "",
      dataInicio: null,
      dataFim: null,
      numeroNf: "",
      serie: "",
      situacao: "todas"
    }
  });

  // Watch para validação de período
  const dataInicio = watch("dataInicio");
  const dataFim = watch("dataFim");

  /**
   * Valida se o período não excede 90 dias
   */
  const validarPeriodo = useCallback((inicio: Date | null, fim: Date | null): boolean => {
    if (!inicio || !fim) return true;

    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 90;
  }, []);

  /**
   * Handler de submissão do formulário
   */
  const onSubmit = async (data: FormularioFiltros) => {
    // Validar campos obrigatórios
    if (!data.dataInicio || !data.dataFim) {
      setErro("As datas de início e fim são obrigatórias");
      return;
    }

    // Validar período
    if (!validarPeriodo(data.dataInicio, data.dataFim)) {
      setErro("O período de busca não pode exceder 90 dias");
      return;
    }

    // Limpar erro anterior
    setErro(null);
    setLoading(true);
    setPollingId(null); // Reset
    setStatusBusca("Iniciando...");

    try {
      // 1. Tentar Iniciar Busca na SEFAZ (Async)
      // Nota: Precisa de CNPJ. Se não informado no filtro, usamos o filtro?
      // O endpoint /iniciar requer CNPJ.
      // Se user não preencheu CNPJ Emitente, não podemos buscar na distribuicao (que é pra UM cnpj)
      // A MENOS que backend pegue do usuário. Mas front deve mandar.
      // Vamos tentar mandar o que tiver.

      const cnpjParaBusca = data.cnpjEmitente;

      if (cnpjParaBusca) {
        setStatusBusca("Solicitando busca à SEFAZ...");
        const job = await iniciarBuscaNFe(cnpjParaBusca);

        // Sucesso no start -> Iniciar Polling
        setPollingId(job.job_id);
        setFiltrosAtuais(data);
        // O useEffect cuidará do resto
      } else {
        // Sem CNPJ específico, faz apenas busca local
        setStatusBusca("Buscando localmente...");
        const filtros = {
          tipo_nf: data.tipoNf as TipoNotaFiscal | "TODAS",
          cnpj_emitente: undefined,
          data_inicio: data.dataInicio.toISOString().split('T')[0],
          data_fim: data.dataFim.toISOString().split('T')[0],
          numero_nf: data.numeroNf || undefined,
          serie: data.serie || undefined,
          situacao: data.situacao as SituacaoNota | "todas"
        };

        const resultados = await buscarNotasAvancado(filtros);
        setNotas(resultados);

        if (resultados.length === 0) {
          setErro("Nenhuma nota encontrada (Busca Local - CNPJ não informado para busca SEFAZ)");
        }
        setLoading(false);
      }

    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao iniciar busca");
      setLoading(false);
    }
  };

  /**
   * Limpa os filtros e resultados
   */
  const limparFiltros = () => {
    reset();
    setNotas([]);
    setErro(null);
  };

  /**
   * Faz download do XML da nota
   */
  const handleDownloadXml = async (chaveAcesso: string) => {
    if (!chaveAcesso) {
      alert("Esta nota não possui chave de acesso para download");
      return;
    }

    try {
      setLoading(true);
      const blob = await baixarXmlNota(chaveAcesso);
      downloadBlob(blob, `NFe${chaveAcesso}.xml`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao baixar XML");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Buscador de Notas Fiscais
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consulte e gerencie suas notas fiscais eletrônicas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador de fonte de dados */}
          {fonte && <FonteDadosIndicador fonte={fonte} />}

          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <Filter size={18} />
            {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
            {mostrarFiltros ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* ===== SELETOR DE EMPRESA (Sprint NFe Integration) ===== */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 size={20} className="text-purple-400" />
            Cliente para Busca
          </h2>

          {/* Badge de status do certificado */}
          {statusCertificado && !certificadoLoading && (
            <CertificadoBadge
              status={statusCertificado.status as any}
              diasRestantes={statusCertificado.dias_para_vencer}
              usandoFallback={statusCertificado.usando_fallback}
            />
          )}

          {certificadoLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <RefreshCw size={14} className="animate-spin" />
              Verificando certificado...
            </div>
          )}
        </div>

        {/* Seletor de empresa */}
        <ClienteSelector
          empresaId={empresaId}
          onSelect={(empresa) => selecionarEmpresa(empresa.id, empresa.razao_social)}
          statusCertificado={statusCertificado ? {
            status: statusCertificado.status as any,
            dias_para_vencer: statusCertificado.dias_para_vencer ?? undefined
          } : null}
        />

        {/* Empresa selecionada */}
        {empresaId && empresaNome && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Buscando notas de:</span>
            <span className="font-medium text-white">{empresaNome}</span>
          </div>
        )}

        {/* Alerta de certificado (se houver problema) */}
        {alertaCertificado && (
          <AlertaCertificado
            tipo={alertaCertificado.tipo}
            titulo={alertaCertificado.titulo}
            mensagem={alertaCertificado.mensagem}
            bloqueante={alertaCertificado.bloqueante}
            onClose={() => limparErroEmpresa()}
          />
        )}
      </div>
      {mostrarFiltros && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tipo de NF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Nota
              </label>
              <select
                {...register("tipoNf")}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                {OPCOES_TIPO_NF.map(opcao => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CNPJ Emitente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CNPJ Emitente
              </label>
              <InputMask
                mask="99.999.999/9999-99"
                {...register("cnpjEmitente")}
              >
                {(inputProps: any) => (
                  <input
                    {...inputProps}
                    type="text"
                    placeholder="00.000.000/0000-00"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  />
                )}
              </InputMask>
            </div>

            {/* Data Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Data Início *
              </label>
              <input
                type="date"
                {...register("dataInicio", { required: "Data inicial é obrigatória" })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
              {errors.dataInicio && (
                <p className="mt-1 text-sm text-red-600">{errors.dataInicio.message}</p>
              )}
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Data Fim *
              </label>
              <input
                type="date"
                {...register("dataFim", { required: "Data final é obrigatória" })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
              {errors.dataFim && (
                <p className="mt-1 text-sm text-red-600">{errors.dataFim.message}</p>
              )}
            </div>

            {/* Número NF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número da Nota
              </label>
              <input
                type="text"
                placeholder="000000123"
                {...register("numeroNf")}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Série */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Série
              </label>
              <input
                type="text"
                placeholder="1"
                {...register("serie")}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Situação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Situação
              </label>
              <select
                {...register("situacao")}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              >
                {OPCOES_SITUACAO.map(opcao => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validação de Período */}
          {dataInicio && dataFim && !validarPeriodo(dataInicio, dataFim) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">
                O período de busca não pode exceder 90 dias
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  {statusBusca || "Buscando..."}
                </>
              ) : (
                <>
                  <Search size={18} />
                  Buscar Notas
                </>
              )}
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <X size={18} />
              Limpar Filtros
            </button>
          </div>
        </form>
      )}

      {/* Mensagem de Erro */}
      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
        </div>
      )}

      {/* Tabela de Resultados */}
      {notas.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Header da Tabela */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Resultados da Busca
              </h2>
              <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full">
                {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
              </span>
            </div>
          </div>

          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Número/Série</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">CNPJ Emitente</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Data Emissão</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Valor Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Situação</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {notas.map((nota) => (
                  <tr
                    key={nota.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    {/* Tipo */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CORES_TIPO_NF[nota.tipo_nf]}`}
                      >
                        {nota.tipo_nf}
                      </span>
                    </td>

                    {/* Número/Série */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nota.numero_nf}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Série: {nota.serie}
                        </span>
                      </div>
                    </td>

                    {/* CNPJ Emitente */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nota.cnpj_emitente}
                        </span>
                        {nota.nome_emitente && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                            {nota.nome_emitente}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Data Emissão */}
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {formatarData(nota.data_emissao)}
                    </td>

                    {/* Valor Total */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatarMoeda(nota.valor_total)}
                    </td>

                    {/* Situação */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CORES_SITUACAO[nota.situacao]}`}
                      >
                        {nota.situacao.charAt(0).toUpperCase() + nota.situacao.slice(1)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setNotaSelecionada(nota)}
                          className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {nota.chave_acesso && (
                          <button
                            onClick={() => handleDownloadXml(nota.chave_acesso!)}
                            className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Baixar XML"
                          >
                            <Download size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-slate-700">
            {notas.map((nota) => (
              <div
                key={nota.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${CORES_TIPO_NF[nota.tipo_nf]}`}
                    >
                      {nota.tipo_nf}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${CORES_SITUACAO[nota.situacao]}`}
                    >
                      {nota.situacao.charAt(0).toUpperCase() + nota.situacao.slice(1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatarMoeda(nota.valor_total)}
                    </p>
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>Nº:</strong> {nota.numero_nf} <strong>Série:</strong> {nota.serie}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Building2 size={16} className="text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {nota.cnpj_emitente}
                      </span>
                      {nota.nome_emitente && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {nota.nome_emitente}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatarData(nota.data_emissao)}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => setNotaSelecionada(nota)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    Ver Detalhes
                  </button>
                  {nota.chave_acesso && (
                    <button
                      onClick={() => handleDownloadXml(nota.chave_acesso!)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      title="Baixar XML"
                    >
                      <Download size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhes (Placeholder) */}
      {notaSelecionada && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setNotaSelecionada(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalhes da Nota Fiscal
              </h3>
              <button
                onClick={() => setNotaSelecionada(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p>
                  <p className="font-medium text-gray-900 dark:text-white">{notaSelecionada.tipo_nf}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Número/Série</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {notaSelecionada.numero_nf} / {notaSelecionada.serie}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">CNPJ Emitente</p>
                  <p className="font-medium text-gray-900 dark:text-white">{notaSelecionada.cnpj_emitente}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nome Emitente</p>
                  <p className="font-medium text-gray-900 dark:text-white">{notaSelecionada.nome_emitente || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Data Emissão</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatarData(notaSelecionada.data_emissao)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total</p>
                  <p className="font-medium text-gray-900 dark:text-white text-lg">
                    {formatarMoeda(notaSelecionada.valor_total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Situação</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CORES_SITUACAO[notaSelecionada.situacao]}`}
                  >
                    {notaSelecionada.situacao.charAt(0).toUpperCase() + notaSelecionada.situacao.slice(1)}
                  </span>
                </div>
                {notaSelecionada.chave_acesso && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Chave de Acesso</p>
                    <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                      {notaSelecionada.chave_acesso}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
