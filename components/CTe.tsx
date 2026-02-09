/**
 * Componente CT-e - Conhecimento de Transporte Eletrônico
 * Interface para emissão de CT-e (Modelo 57)
 */

import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Package, FileText, MapPin, User, Building, AlertCircle, CheckCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { autorizarCTe, downloadDACTE, downloadPDF, validarDocumento } from '../src/services/fiscalService';
import { BannerContingenciaCompacto } from '../src/components/fiscal/BannerContingencia';
import type { CTeAutorizarRequest, ParticipanteCTe, CargaCTe, DocumentoVinculado, ModalidadeFreteCTe } from '../src/types/fiscal';
import { empresaService } from '../services/empresaService';
import InputMask from 'react-input-mask';

interface FormularioCTe {
  tipo_servico: "0" | "1" | "2" | "3";
  tipo_cte: "0" | "1" | "2" | "3";
  modalidade_frete: ModalidadeFreteCTe;
  remetente: ParticipanteCTe;
  destinatario: ParticipanteCTe;
  expedidor?: ParticipanteCTe;
  recebedor?: ParticipanteCTe;
  carga: CargaCTe;
  documentos_vinculados: DocumentoVinculado[];
  informacoes_complementares?: string;
}

export const CTe: React.FC = () => {
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [empresas, setEmpresas] = useState<Array<{ id: string; razao_social: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);
  const [chaveAcesso, setChaveAcesso] = useState<string>('');
  const [validando, setValidando] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  const { register, handleSubmit, control, formState: { errors }, watch, reset } = useForm<FormularioCTe>({
    defaultValues: {
      tipo_servico: "0",
      tipo_cte: "0",
      modalidade_frete: "0",
      documentos_vinculados: [],
    }
  });

  const { fields: documentos, append: adicionarDocumento, remove: removerDocumento } = useFieldArray({
    control,
    name: "documentos_vinculados"
  });

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

  const validarAntes = async (dados: FormularioCTe): Promise<boolean> => {
    setValidando(true);
    setErrosValidacao([]);
    
    try {
      const resultado = await validarDocumento({
        tipo_documento: 'cte',
        dados: {
          empresa_id: empresaSelecionada,
          ambiente: '2',
          modelo: '57',
          ...dados,
        } as any,
      });

      if (!resultado.valido) {
        setErrosValidacao(resultado.erros.map(e => `${e.campo}: ${e.mensagem}`));
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro na validação:', error);
      return true; // Continuar mesmo se validação falhar
    } finally {
      setValidando(false);
    }
  };

  const onSubmit = async (data: FormularioCTe) => {
    setErro('');
    setSucesso(false);

    // Validar antes de autorizar
    const valido = await validarAntes(data);
    if (!valido) {
      setErro('Corrija os erros de validação antes de autorizar');
      return;
    }

    setLoading(true);

    try {
      const dados: CTeAutorizarRequest = {
        empresa_id: empresaSelecionada,
        ambiente: '2', // Homologação
        modelo: '57',
        tipo_servico: data.tipo_servico,
        tipo_cte: data.tipo_cte,
        modalidade_frete: data.modalidade_frete,
        remetente: data.remetente,
        destinatario: data.destinatario,
        expedidor: data.expedidor,
        recebedor: data.recebedor,
        carga: data.carga,
        documentos_vinculados: data.documentos_vinculados.length > 0 ? data.documentos_vinculados : undefined,
        informacoes_complementares: data.informacoes_complementares,
      };

      const response = await autorizarCTe(dados);
      
      setChaveAcesso(response.chave_acesso);
      setSucesso(true);
      reset();
    } catch (error: any) {
      setErro(error.message || 'Erro ao autorizar CT-e');
    } finally {
      setLoading(false);
    }
  };

  const imprimirDACTE = async () => {
    if (!chaveAcesso) return;
    
    try {
      const blob = await downloadDACTE(chaveAcesso);
      downloadPDF(blob, `DACTE_${chaveAcesso}.pdf`);
    } catch (error: any) {
      setErro('Erro ao baixar DACTE');
    }
  };

  const novoCTe = () => {
    setSucesso(false);
    setChaveAcesso('');
    setErro('');
    setErrosValidacao([]);
    reset();
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
                CT-e Autorizado com Sucesso!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Chave de Acesso: {chaveAcesso}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={imprimirDACTE}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5" />
                Imprimir DACTE
              </button>
              <button
                onClick={novoCTe}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Novo CT-e
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            Emissão de CT-e - Conhecimento de Transporte
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Documento fiscal eletrônico para prestação de serviços de transporte
          </p>
        </div>

        {/* Banner de Contingência */}
        <BannerContingenciaCompacto />

        {/* Seleção de Empresa */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Empresa Emissora (Transportadora)
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
          {/* Informações Gerais do CT-e */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Informações Gerais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Serviço
                </label>
                <select
                  {...register('tipo_servico')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="0">Normal</option>
                  <option value="1">Subcontratação</option>
                  <option value="2">Redespacho</option>
                  <option value="3">Redespacho Intermediário</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de CT-e
                </label>
                <select
                  {...register('tipo_cte')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="0">Normal</option>
                  <option value="1">Complementar</option>
                  <option value="2">Anulação</option>
                  <option value="3">Substituto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modalidade de Frete
                </label>
                <select
                  {...register('modalidade_frete')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                >
                  <option value="0">CIF (Por conta do Remetente)</option>
                  <option value="1">FOB (Por conta do Destinatário)</option>
                  <option value="2">Por conta de Terceiros</option>
                  <option value="3">Próprio (Remetente)</option>
                  <option value="4">Próprio (Destinatário)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Remetente */}
          <ParticipanteForm
            titulo="Remetente"
            icone={<User className="h-5 w-5 text-green-600" />}
            prefixo="remetente"
            register={register}
            errors={errors}
          />

          {/* Destinatário */}
          <ParticipanteForm
            titulo="Destinatário"
            icone={<MapPin className="h-5 w-5 text-red-600" />}
            prefixo="destinatario"
            register={register}
            errors={errors}
          />

          {/* Dados da Carga */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Dados da Carga
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor da Carga (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('carga.valor', { required: true, min: 0.01 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="0.00"
                />
                {errors.carga?.valor && (
                  <span className="text-red-500 text-xs">Campo obrigatório</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Peso Bruto (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('carga.peso_bruto', { required: true, min: 0.01 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="0.00"
                />
                {errors.carga?.peso_bruto && (
                  <span className="text-red-500 text-xs">Campo obrigatório</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Peso Cubado (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('carga.peso_cubado')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantidade de Volumes
                </label>
                <input
                  type="number"
                  {...register('carga.quantidade_volumes')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Produto Predominante *
                </label>
                <input
                  type="text"
                  {...register('carga.produto_predominante', { required: true })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder="Ex: Materiais de Construção"
                />
                {errors.carga?.produto_predominante && (
                  <span className="text-red-500 text-xs">Campo obrigatório</span>
                )}
              </div>
            </div>
          </div>

          {/* Documentos Vinculados */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Documentos Vinculados (NF-e/NFC-e)
              </h2>
              <button
                type="button"
                onClick={() => adicionarDocumento({ tipo: 'NFe', chave_acesso: '' })}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>

            {documentos.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                Nenhum documento vinculado
              </p>
            ) : (
              <div className="space-y-3">
                {documentos.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <select
                      {...register(`documentos_vinculados.${index}.tipo` as const)}
                      className="px-3 py-2 border rounded-lg dark:bg-slate-600 dark:text-white"
                    >
                      <option value="NFe">NF-e</option>
                      <option value="NFCe">NFC-e</option>
                      <option value="Outros">Outros</option>
                    </select>

                    <input
                      type="text"
                      {...register(`documentos_vinculados.${index}.chave_acesso` as const)}
                      placeholder="Chave de Acesso (44 dígitos)"
                      maxLength={44}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-600 dark:text-white font-mono text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => removerDocumento(index)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informações Complementares */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Informações Complementares
            </h2>
            <textarea
              {...register('informacoes_complementares')}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
              placeholder="Informações adicionais sobre o transporte..."
            />
          </div>

          {/* Erros de Validação */}
          {errosValidacao.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <h3 className="font-bold text-yellow-800 dark:text-yellow-300">
                  Erros de Validação
                </h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                {errosValidacao.map((erro, index) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Erro Geral */}
          {erro && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-300">{erro}</p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              Limpar Formulário
            </button>
            <button
              type="submit"
              disabled={loading || validando}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? 'Autorizando CT-e...' : validando ? 'Validando...' : 'Autorizar CT-e'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente auxiliar para formulário de participante
interface ParticipanteFormProps {
  titulo: string;
  icone: React.ReactNode;
  prefixo: 'remetente' | 'destinatario' | 'expedidor' | 'recebedor';
  register: any;
  errors: any;
}

const ParticipanteForm: React.FC<ParticipanteFormProps> = ({ titulo, icone, prefixo, register, errors }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        {icone}
        {titulo}
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CNPJ/CPF *
            </label>
            <InputMask
              mask={(value: string) => {
                const digits = (value ?? '').replace(/\D/g, '');
                return digits.length <= 11 ? '999.999.999-99' : '99.999.999/9999-99';
              }}
              {...register(`${prefixo}.cnpj`, { required: true })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
              placeholder="00.000.000/0000-00"
            />
            {errors[prefixo]?.cnpj && (
              <span className="text-red-500 text-xs">Campo obrigatório</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Inscrição Estadual
            </label>
            <input
              type="text"
              {...register(`${prefixo}.inscricao_estadual`)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Razão Social *
          </label>
          <input
            type="text"
            {...register(`${prefixo}.razao_social`, { required: true })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
            placeholder="Nome completo ou Razão Social"
          />
          {errors[prefixo]?.razao_social && (
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
              {...register(`${prefixo}.endereco.logradouro`, { required: true })}
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
              {...register(`${prefixo}.endereco.numero`, { required: true })}
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
              {...register(`${prefixo}.endereco.bairro`, { required: true })}
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
              {...register(`${prefixo}.endereco.cep`, { required: true })}
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
              {...register(`${prefixo}.endereco.municipio`, { required: true })}
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
              {...register(`${prefixo}.endereco.uf`, { required: true, maxLength: 2 })}
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
            {...register(`${prefixo}.endereco.codigo_municipio`, { required: true })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
            placeholder="7 dígitos - Ex: 3550308 (São Paulo/SP)"
          />
          {errors[prefixo]?.endereco?.codigo_municipio && (
            <span className="text-red-500 text-xs">Campo obrigatório (7 dígitos)</span>
          )}
        </div>
      </div>
    </div>
  );
};
