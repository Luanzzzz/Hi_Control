/**
 * Componente NFS-e - Nota Fiscal de Serviço Eletrônica
 * Interface para emissão de NFS-e
 */

import React, { useState, useEffect } from 'react';
import { Briefcase, Calculator, FileText, User, MapPin, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { emitirNFSe, cancelarNFSe, calcularISS } from '../src/services/fiscalService';
import { BannerContingenciaCompacto } from '../src/components/fiscal/BannerContingencia';
import type { NFSeEmitirRequest, TomadorNFSe, ServicoNFSe } from '../src/types/fiscal';
import { empresaService } from '../services/empresaService';
import InputMask from 'react-input-mask';
import { formatarValor, valorNumerico } from '../utils/formatarValor';

interface FormularioNFSe {
  numero_rps?: string;
  serie_rps?: string;
  tomador: TomadorNFSe;
  servico: ServicoNFSe;
  discriminacao: string;
  observacoes?: string;
}

// Itens da Lista LC 116/2003 (exemplos mais comuns)
const ITENS_LC116 = [
  { codigo: '01.01', descricao: 'Análise e desenvolvimento de sistemas' },
  { codigo: '01.02', descricao: 'Programação' },
  { codigo: '01.03', descricao: 'Processamento de dados' },
  { codigo: '01.04', descricao: 'Elaboração de programas de computadores' },
  { codigo: '01.05', descricao: 'Licenciamento ou cessão de direito de uso de programas' },
  { codigo: '01.07', descricao: 'Suporte técnico em informática' },
  { codigo: '01.08', descricao: 'Planejamento, confecção, manutenção e atualização de páginas eletrônicas' },
  { codigo: '07.02', descricao: 'Execução, por administração, empreitada ou subempreitada, de obras de construção civil' },
  { codigo: '07.05', descricao: 'Reparação, conservação e reforma de edifícios' },
  { codigo: '10.02', descricao: 'Agenciamento de serviços de terceiros' },
  { codigo: '14.01', descricao: 'Lubrificação, limpeza e revisão de veículos' },
  { codigo: '14.03', descricao: 'Instalação e montagem de aparelhos e máquinas' },
  { codigo: '17.01', descricao: 'Assessoria ou consultoria de qualquer natureza' },
  { codigo: '17.02', descricao: 'Datilografia, estenografia, secretaria' },
  { codigo: '17.05', descricao: 'Fornecimento de mão-de-obra' },
  { codigo: '17.09', descricao: 'Perícias, laudos, exames técnicos' },
  { codigo: '17.14', descricao: 'Advocacia' },
  { codigo: '17.16', descricao: 'Auditoria' },
  { codigo: '25.01', descricao: 'Serviços de alimentação (restaurante, bares)' },
];

export const NFSe: React.FC = () => {
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [empresas, setEmpresas] = useState<Array<{ id: string; razao_social: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);
  const [numeroNFSe, setNumeroNFSe] = useState<string>('');
  const [codigoVerificacao, setCodigoVerificacao] = useState<string>('');
  const [linkVisualizacao, setLinkVisualizacao] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormularioNFSe>({
    defaultValues: {
      servico: {
        aliquota_iss: 5.0, // Alíquota padrão de 5%
        iss_retido: false,
      }
    }
  });

  // Observar valores para cálculo automático de ISS
  const valorServicos = watch('servico.valor_servicos', 0);
  const aliquotaISS = watch('servico.aliquota_iss', 5.0);
  const valorDeducoes = watch('servico.valor_deducoes', 0);

  // Calcular ISS automaticamente (valores podem vir como string do watch)
  const baseISS = valorNumerico(valorServicos) - valorNumerico(valorDeducoes);
  const valorISS = calcularISS(baseISS, valorNumerico(aliquotaISS));

  // Carregar empresas
  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      const dados = await empresaService.listar();
      setEmpresas(dados.map(e => ({ id: e.id, razao_social: e.razao_social })));
      if (dados.length > 0) {
        setEmpresaSelecionada(dados[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const onSubmit = async (data: FormularioNFSe) => {
    setErro('');
    setSucesso(false);
    setLoading(true);

    try {
      const dados: NFSeEmitirRequest = {
        empresa_id: empresaSelecionada,
        numero_rps: data.numero_rps,
        serie_rps: data.serie_rps,
        tomador: data.tomador,
        servico: data.servico,
        discriminacao: data.discriminacao,
        observacoes: data.observacoes,
      };

      const response = await emitirNFSe(dados);
      
      setNumeroNFSe(response.numero_nfse);
      setCodigoVerificacao(response.codigo_verificacao);
      setLinkVisualizacao(response.link_visualizacao || '');
      setSucesso(true);
    } catch (error: any) {
      setErro(error.message || 'Erro ao emitir NFS-e');
    } finally {
      setLoading(false);
    }
  };

  const novaNFSe = () => {
    setSucesso(false);
    setNumeroNFSe('');
    setCodigoVerificacao('');
    setLinkVisualizacao('');
    setErro('');
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                NFS-e Emitida com Sucesso!
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-400">
                <p>
                  <span className="font-medium">Número:</span> {numeroNFSe}
                </p>
                <p>
                  <span className="font-medium">Código de Verificação:</span> {codigoVerificacao}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {linkVisualizacao && (
                <a
                  href={linkVisualizacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <FileText className="h-5 w-5" />
                  Visualizar NFS-e
                </a>
              )}
              <button
                onClick={novaNFSe}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Nova NFS-e
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Emissão de NFS-e - Nota Fiscal de Serviço
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Documento fiscal eletrônico para prestação de serviços
          </p>
        </div>

        {/* Banner de Contingência */}
        <BannerContingenciaCompacto />

        {/* Seleção de Empresa */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Empresa Prestadora do Serviço
          </label>
          <select
            value={empresaSelecionada}
            onChange={(e) => setEmpresaSelecionada(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white"
          >
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.razao_social}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* RPS - Recibo Provisório de Serviço */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              RPS - Recibo Provisório de Serviço
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número do RPS
                </label>
                <input
                  type="text"
                  {...register('numero_rps')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="Opcional - Gerado automaticamente se não informado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Série do RPS
                </label>
                <input
                  type="text"
                  {...register('serie_rps')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="Ex: A"
                />
              </div>
            </div>
          </div>

          {/* Tomador do Serviço */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Tomador do Serviço (Cliente)
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CNPJ/CPF *
                  </label>
                  <InputMask
                    mask="99.999.999/9999-99"
                    {...register('tomador.cnpj', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="00.000.000/0000-00"
                  />
                  {errors.tomador?.cnpj && (
                    <span className="text-red-500 text-xs">Campo obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inscrição Municipal
                  </label>
                  <input
                    type="text"
                    {...register('tomador.inscricao_municipal')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razão Social / Nome *
                </label>
                <input
                  type="text"
                  {...register('tomador.razao_social', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="Nome completo ou Razão Social"
                />
                {errors.tomador?.razao_social && (
                  <span className="text-red-500 text-xs">Campo obrigatório</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro *
                  </label>
                  <input
                    type="text"
                    {...register('tomador.endereco.logradouro', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    {...register('tomador.endereco.numero', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    {...register('tomador.endereco.bairro', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP *
                  </label>
                  <InputMask
                    mask="99999-999"
                    {...register('tomador.endereco.cep', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Município *
                  </label>
                  <input
                    type="text"
                    {...register('tomador.endereco.municipio', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="Nome do município"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    {...register('tomador.endereco.uf', { required: true, maxLength: 2 })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white uppercase"
                    placeholder="SP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código IBGE do Município *
                </label>
                <input
                  type="text"
                  maxLength={7}
                  {...register('tomador.endereco.codigo_municipio', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="7 dígitos - Ex: 3550308 (São Paulo/SP)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    {...register('tomador.email')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <InputMask
                    mask="(99) 99999-9999"
                    {...register('tomador.telefone')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Serviço */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Dados do Serviço
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item da Lista LC 116/2003 *
                </label>
                <select
                  {...register('servico.item_lista_lc116', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Selecione o item...</option>
                  {ITENS_LC116.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.codigo} - {item.descricao}
                    </option>
                  ))}
                </select>
                {errors.servico?.item_lista_lc116 && (
                  <span className="text-red-500 text-xs">Campo obrigatório</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código CNAE
                  </label>
                  <input
                    type="text"
                    {...register('servico.codigo_cnae')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="0000-0/00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código de Tributação Municipal
                  </label>
                  <input
                    type="text"
                    {...register('servico.codigo_tributacao_municipio')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="Código do município"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor dos Serviços (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('servico.valor_servicos', { required: true, min: 0.01 })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="0.00"
                  />
                  {errors.servico?.valor_servicos && (
                    <span className="text-red-500 text-xs">Campo obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor das Deduções (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('servico.valor_deducoes')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alíquota ISS (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('servico.aliquota_iss', { required: true, min: 0, max: 100 })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="5.00"
                  />
                </div>

                <div className="flex items-end">
                  <div className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                      Valor do ISS Calculado
                    </div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      R$ {formatarValor(valorISS)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('servico.iss_retido')}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  ISS Retido na Fonte
                </label>
              </div>
            </div>
          </div>

          {/* Discriminação do Serviço */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Discriminação do Serviço *
            </h2>
            <textarea
              {...register('discriminacao', { required: true, minLength: 10 })}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
              placeholder="Descreva detalhadamente os serviços prestados..."
            />
            {errors.discriminacao && (
              <span className="text-red-500 text-xs">Campo obrigatório (mínimo 10 caracteres)</span>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Seja claro e detalhado na descrição dos serviços prestados
            </p>
          </div>

          {/* Observações */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Observações
            </h2>
            <textarea
              {...register('observacoes')}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
              placeholder="Informações adicionais (opcional)..."
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-300">{erro}</p>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumo Financeiro
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Valor dos Serviços:</span>
                <span className="font-medium">R$ {formatarValor(valorServicos)}</span>
              </div>
              {valorNumerico(valorDeducoes) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">(-) Deduções:</span>
                  <span className="font-medium">R$ {formatarValor(valorDeducoes)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Base de Cálculo ISS:</span>
                <span className="font-medium">R$ {formatarValor(baseISS)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">ISS ({formatarValor(aliquotaISS)}%):</span>
                <span className="font-medium">R$ {formatarValor(valorISS)}</span>
              </div>
              <div className="pt-2 border-t border-blue-400 flex justify-between text-lg">
                <span className="font-bold">Valor Total:</span>
                <span className="font-bold">R$ {formatarValor(valorServicos)}</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? 'Emitindo NFS-e...' : 'Emitir NFS-e'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
