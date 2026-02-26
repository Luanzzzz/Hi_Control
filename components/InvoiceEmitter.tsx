import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  Building2,
  Package,
  DollarSign,
  FileText,
  Send,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { autorizarNFe, downloadDANFE, downloadPDF } from '../src/services/fiscalService';
import { AutocompleteCFOP } from '../src/components/fiscal/AutocompleteCFOP';
import { AutocompleteNCM } from '../src/components/fiscal/AutocompleteNCM';
import type {
  NFEAutorizarRequest,
  NFEAutorizarResponse,
  ItemNFe,
  DestinatarioNFe,
} from '../src/types/fiscal';
import { empresaService } from '../services/empresaService';
import { formatarValor, valorNumerico } from '../utils/formatarValor';

// ============================================
// ICMS padrão Simples Nacional (CSOSN 400)
// ============================================
const icmsPadraoSN = {
  origem: '0',
  cst: '90',
  csosn: '400',
  base_calculo: 0,
  aliquota: 0,
  valor: 0,
};

const pisPadrao = { cst: '07', base_calculo: 0, aliquota: 0, valor: 0 };
const cofinsPadrao = { cst: '07', base_calculo: 0, aliquota: 0, valor: 0 };

interface FormItem {
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade: number;
  valor_unitario: number;
}

const formItemVazio: FormItem = {
  codigo_produto: '',
  descricao: '',
  ncm: '',
  cfop: '5102',
  unidade_comercial: 'UN',
  quantidade: 1,
  valor_unitario: 0,
};

export const InvoiceEmitter: React.FC = () => {
  // Seleção de empresa
  const [empresas, setEmpresas] = useState<Array<{ id: string; razao_social: string }>>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');

  // Identificação da nota
  const [serie, setSerie] = useState('1');
  const [numeroNf, setNumeroNf] = useState('1');

  // Destinatário
  const [dest, setDest] = useState<Partial<DestinatarioNFe>>({
    logradouro: '',
    numero: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
  });

  // Itens
  const [itens, setItens] = useState<ItemNFe[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [formItem, setFormItem] = useState<FormItem>(formItemVazio);

  // Estado da operação
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [resultado, setResultado] = useState<NFEAutorizarResponse | null>(null);

  // Carregar empresas ao montar
  useEffect(() => {
    empresaService.listar().then(lista => {
      setEmpresas(lista.map(e => ({ id: e.id, razao_social: e.razao_social })));
      if (lista.length > 0) setEmpresaSelecionada(lista[0].id);
    }).catch(console.error);
  }, []);

  // ========================
  // Manipulação de itens
  // ========================

  const adicionarItem = () => {
    if (!formItem.descricao || !formItem.ncm || !formItem.cfop) {
      setErro('Preencha descrição, NCM e CFOP do item.');
      return;
    }
    const qtd = valorNumerico(formItem.quantidade);
    const vUnit = valorNumerico(formItem.valor_unitario);
    const valorTotal = Number((qtd * vUnit).toFixed(2));

    const novoItem: ItemNFe = {
      numero_item: itens.length + 1,
      codigo_produto: formItem.codigo_produto || `ITEM-${itens.length + 1}`,
      descricao: formItem.descricao,
      ncm: formItem.ncm,
      cfop: formItem.cfop,
      unidade_comercial: formItem.unidade_comercial || 'UN',
      quantidade_comercial: qtd,
      valor_unitario_comercial: vUnit,
      valor_total_bruto: valorTotal,
      icms: { ...icmsPadraoSN },
      pis: { ...pisPadrao },
      cofins: { ...cofinsPadrao },
    };

    setItens([...itens, novoItem]);
    setFormItem(formItemVazio);
    setShowAddItem(false);
    setErro('');
  };

  const removerItem = (numero: number) => {
    const novos = itens
      .filter(i => i.numero_item !== numero)
      .map((i, idx) => ({ ...i, numero_item: idx + 1 }));
    setItens(novos);
  };

  // ========================
  // Emissão da NF-e
  // ========================

  const emitirNFe = async () => {
    setErro('');
    setResultado(null);

    // Validações básicas
    if (!empresaSelecionada) return setErro('Selecione uma empresa emissora.');
    if (itens.length === 0) return setErro('Adicione ao menos um item à nota.');
    if (!dest.nome) return setErro('Informe o nome/razão social do destinatário.');
    if (!dest.cnpj && !dest.cpf) return setErro('Informe CNPJ ou CPF do destinatário.');
    if (!dest.logradouro || !dest.numero || !dest.bairro || !dest.municipio || !dest.uf || !dest.cep) {
      return setErro('Preencha o endereço completo do destinatário.');
    }

    const payload: NFEAutorizarRequest = {
      empresa_id: empresaSelecionada,
      numero_nf: numeroNf,
      serie,
      modelo: '55',
      tipo_operacao: '1',
      ambiente: '2', // Homologação
      data_emissao: new Date().toISOString(),
      destinatario: dest as DestinatarioNFe,
      itens,
      transporte: { modalidade_frete: 9 }, // Sem frete por padrão
    };

    try {
      setLoading(true);
      const response = await autorizarNFe(payload);
      setResultado(response);
    } catch (err: any) {
      setErro(err.message || 'Erro ao emitir nota fiscal.');
    } finally {
      setLoading(false);
    }
  };

  const baixarDANFE = async () => {
    if (!resultado?.chave_acesso) return;
    try {
      const blob = await downloadDANFE(resultado.chave_acesso);
      downloadPDF(blob, `DANFE_${resultado.chave_acesso}.pdf`);
    } catch (err: any) {
      setErro(err.message || 'Erro ao baixar DANFE.');
    }
  };

  // ========================
  // Cálculo de totais
  // ========================

  const totalBruto = itens.reduce((acc, i) => acc + i.valor_total_bruto, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // ========================
  // Render
  // ========================

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
              Emissor de NF-e
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Emita Notas Fiscais Eletrônicas (modelo 55) — ambiente homologação
            </p>
          </div>
        </div>
        <button
          onClick={emitirNFe}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Emitindo...' : 'Emitir NF-e'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm whitespace-pre-wrap">{erro}</p>
        </div>
      )}

      {/* Resultado de sucesso */}
      {resultado && resultado.situacao === 'autorizada' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <CheckCircle size={20} />
            NF-e autorizada com sucesso!
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-green-800 dark:text-green-300">
            <span><strong>Chave:</strong> {resultado.chave_acesso?.match(/.{1,4}/g)?.join(' ')}</span>
            <span><strong>Protocolo:</strong> {resultado.protocolo}</span>
            <span><strong>Número:</strong> {resultado.numero_nf}/{resultado.serie}</span>
            <span><strong>Total:</strong> {formatCurrency(resultado.valor_total)}</span>
          </div>
          <button
            onClick={baixarDANFE}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
          >
            <Download size={14} />
            Baixar DANFE (PDF)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Empresa e Identificação */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={20} />
              Emissora e Identificação
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Empresa Emissora
                </label>
                <select
                  value={empresaSelecionada}
                  onChange={e => setEmpresaSelecionada(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                >
                  {empresas.length === 0 && <option value="">Carregando...</option>}
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.razao_social}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número NF
                </label>
                <input
                  type="text"
                  value={numeroNf}
                  onChange={e => setNumeroNf(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Série
                </label>
                <input
                  type="text"
                  value={serie}
                  onChange={e => setSerie(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Destinatário */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={20} />
              Dados do Destinatário
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CNPJ</label>
                <input
                  type="text"
                  placeholder="00000000000000"
                  value={dest.cnpj || ''}
                  onChange={e => setDest({ ...dest, cnpj: e.target.value.replace(/\D/g, ''), cpf: undefined })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CPF (se pessoa física)</label>
                <input
                  type="text"
                  placeholder="00000000000"
                  value={dest.cpf || ''}
                  onChange={e => setDest({ ...dest, cpf: e.target.value.replace(/\D/g, ''), cnpj: undefined })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome / Razão Social</label>
                <input
                  type="text"
                  placeholder="Nome ou Razão Social"
                  value={dest.nome || ''}
                  onChange={e => setDest({ ...dest, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logradouro</label>
                <input
                  type="text"
                  placeholder="Rua, Av., etc."
                  value={dest.logradouro || ''}
                  onChange={e => setDest({ ...dest, logradouro: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Número</label>
                <input
                  type="text"
                  placeholder="123"
                  value={dest.numero || ''}
                  onChange={e => setDest({ ...dest, numero: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={dest.bairro || ''}
                  onChange={e => setDest({ ...dest, bairro: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
                <input
                  type="text"
                  placeholder="São Paulo"
                  value={dest.municipio || ''}
                  onChange={e => setDest({ ...dest, municipio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={dest.uf || ''}
                  onChange={e => setDest({ ...dest, uf: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CEP</label>
                <input
                  type="text"
                  placeholder="00000000"
                  value={dest.cep || ''}
                  onChange={e => setDest({ ...dest, cep: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Itens */}
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

            {/* Formulário de item */}
            {showAddItem && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                    <input
                      type="text"
                      placeholder="SKU/Código"
                      value={formItem.codigo_produto}
                      onChange={e => setFormItem({ ...formItem, codigo_produto: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
                    <input
                      type="text"
                      placeholder="Descrição do item"
                      value={formItem.descricao}
                      onChange={e => setFormItem({ ...formItem, descricao: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">NCM * (8 dígitos)</label>
                    <AutocompleteNCM
                      value={formItem.ncm}
                      onChange={val => setFormItem({ ...formItem, ncm: val?.codigo ?? '' })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CFOP * (4 dígitos)</label>
                    <AutocompleteCFOP
                      value={formItem.cfop}
                      onChange={val => setFormItem({ ...formItem, cfop: val?.codigo ?? '' })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
                    <input
                      type="text"
                      placeholder="UN"
                      value={formItem.unidade_comercial}
                      onChange={e => setFormItem({ ...formItem, unidade_comercial: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={formItem.quantidade}
                      onChange={e => setFormItem({ ...formItem, quantidade: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Unitário (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formItem.valor_unitario}
                      onChange={e => setFormItem({ ...formItem, valor_unitario: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total: <strong>{formatCurrency(formItem.quantidade * formItem.valor_unitario)}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={adicionarItem}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => { setShowAddItem(false); setFormItem(formItemVazio); }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de itens */}
            {itens.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package size={48} className="mx-auto mb-3 opacity-50" />
                <p>Nenhum item adicionado</p>
                <p className="text-sm mt-1">Clique em "Adicionar Item" para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itens.map(item => (
                  <div
                    key={item.numero_item}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        #{item.numero_item} — {item.descricao}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        NCM: {item.ncm} | CFOP: {item.cfop} | {item.quantidade_comercial}x {formatCurrency(item.valor_unitario_comercial)} = <strong>{formatCurrency(item.valor_total_bruto)}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => removerItem(item.numero_item)}
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

        {/* Resumo lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Resumo
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Itens:</span>
                <span className="font-medium text-gray-900 dark:text-white">{itens.length}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Produtos:</span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(totalBruto)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Ambiente:</span>
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                  Homologação
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Modelo:</span>
                <span className="font-medium text-gray-900 dark:text-white">NF-e (55)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                <span className="font-medium text-gray-900 dark:text-white">Simples Nacional</span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Atenção:</strong> As notas emitidas em homologação não têm valor fiscal.
                Para emissão em produção, configure o ambiente na empresa.
              </p>
            </div>

            <button
              onClick={emitirNFe}
              disabled={loading || itens.length === 0}
              className="mt-4 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? 'Emitindo...' : 'Emitir NF-e'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
