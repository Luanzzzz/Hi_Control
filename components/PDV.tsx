/**
 * Componente PDV (Ponto de Venda) - Emissão de NFC-e
 * Interface simplificada para emissão de cupons fiscais eletrônicos
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingCart, CreditCard, DollarSign, QrCode, Printer, X, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { autorizarNFCe, downloadDANFCE, downloadPDF } from '../src/services/fiscalService';
import { SeletorProdutos } from '../src/components/fiscal/SeletorProdutos';
import { AutocompleteCFOP } from '../src/components/fiscal/AutocompleteCFOP';
import { AutocompleteNCM } from '../src/components/fiscal/AutocompleteNCM';
import { BannerContingenciaCompacto } from '../src/components/fiscal/BannerContingencia';
import type { ItemNFCe, PagamentoNFCe, NFCeAutorizarRequest, ProdutoCadastrado, TipoPagamento } from '../src/types/fiscal';
import { empresaService } from '../services/empresaService';
import { formatarValor, valorNumerico } from '../utils/formatarValor';

interface FormularioItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
}

export const PDV: React.FC = () => {
  const [itens, setItens] = useState<ItemNFCe[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoNFCe[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [empresas, setEmpresas] = useState<Array<{ id: string; razao_social: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);
  const [chaveAcesso, setChaveAcesso] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [mostrarSeletorProdutos, setMostrarSeletorProdutos] = useState(false);
  const [editandoItem, setEditandoItem] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormularioItem>();
  const quantidadeWatch = watch('quantidade', 1);
  const valorUnitarioWatch = watch('valor_unitario', 0);

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

  const adicionarItem = (data: FormularioItem) => {
    const qtd = valorNumerico(data.quantidade);
    const vUnit = valorNumerico(data.valor_unitario);
    const valorTotal = Number((qtd * vUnit).toFixed(2));
    
    const novoItem: ItemNFCe = {
      numero_item: itens.length + 1,
      codigo_produto: data.codigo_produto,
      descricao: data.descricao,
      ncm: data.ncm,
      cfop: data.cfop,
      unidade: data.unidade,
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: valorTotal,
    };

    setItens([...itens, novoItem]);
    reset();
  };

  const removerItem = (numero: number) => {
    setItens(itens.filter(item => item.numero_item !== numero));
    // Renumerar itens
    const itensRenumerados = itens
      .filter(item => item.numero_item !== numero)
      .map((item, index) => ({ ...item, numero_item: index + 1 }));
    setItens(itensRenumerados);
  };

  const adicionarProdutosCadastrados = (produtos: ProdutoCadastrado[]) => {
    const vUnit = (p: ProdutoCadastrado) => valorNumerico(p.valor_unitario);
    const novosItens = produtos.map((produto, index) => {
      const vu = vUnit(produto);
      return {
        numero_item: itens.length + index + 1,
        codigo_produto: produto.codigo,
        descricao: produto.descricao,
        ncm: produto.ncm,
        cfop: produto.cfop_padrao || '5102',
        unidade: produto.unidade,
        quantidade: 1,
        valor_unitario: vu,
        valor_total: vu,
      };
    });

    setItens([...itens, ...novosItens]);
  };

  const adicionarPagamento = (tipo: TipoPagamento) => {
    const valorRestante = calcularTotalGeral() - calcularTotalPago();
    if (valorRestante <= 0) {
      setErro('Valor total já está pago');
      return;
    }

    const novoPagamento: PagamentoNFCe = {
      tipo,
      valor: valorRestante,
    };

    setPagamentos([...pagamentos, novoPagamento]);
  };

  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const calcularTotalGeral = (): number => {
    return itens.reduce((acc, item) => acc + valorNumerico(item.valor_total), 0);
  };

  const calcularTotalPago = (): number => {
    return pagamentos.reduce((acc, pag) => acc + valorNumerico(pag.valor), 0);
  };

  const emitirCupom = async () => {
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item');
      return;
    }

    if (pagamentos.length === 0) {
      setErro('Adicione pelo menos uma forma de pagamento');
      return;
    }

    const totalGeral = calcularTotalGeral();
    const totalPago = calcularTotalPago();

    if (Math.abs(totalGeral - totalPago) > 0.01) {
      setErro(`Valor pago (R$ ${formatarValor(totalPago)}) não corresponde ao total (R$ ${formatarValor(totalGeral)})`);
      return;
    }

    setLoading(true);
    setErro('');
    setSucesso(false);

    try {
      const dados: NFCeAutorizarRequest = {
        empresa_id: empresaSelecionada,
        ambiente: '2', // Homologação - alterar para '1' em produção
        itens,
        pagamentos,
      };

      const response = await autorizarNFCe(dados);
      
      setChaveAcesso(response.chave_acesso);
      setQrCode(response.qr_code || '');
      setSucesso(true);
      
      // Limpar formulário
      setItens([]);
      setPagamentos([]);
      reset();
    } catch (error: any) {
      setErro(error.message || 'Erro ao emitir cupom fiscal');
    } finally {
      setLoading(false);
    }
  };

  const imprimirDANFCE = async () => {
    if (!chaveAcesso) return;
    
    try {
      const blob = await downloadDANFCE(chaveAcesso);
      downloadPDF(blob, `DANFCE_${chaveAcesso}.pdf`);
    } catch (error: any) {
      setErro('Erro ao baixar DANFCE');
    }
  };

  const novoCupom = () => {
    setSucesso(false);
    setChaveAcesso('');
    setQrCode('');
    setItens([]);
    setPagamentos([]);
    setErro('');
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Cupom Emitido com Sucesso!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Chave de Acesso: {chaveAcesso}
              </p>
            </div>

            {qrCode && (
              <div className="flex justify-center my-6">
                <img 
                  src={qrCode} 
                  alt="QR Code NFC-e" 
                  className="max-w-xs border-4 border-gray-200 dark:border-gray-700 rounded-lg"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={imprimirDANFCE}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Printer className="h-5 w-5" />
                Imprimir DANFCE
              </button>
              <button
                onClick={novoCupom}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Novo Cupom
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
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            PDV - Emissão de NFC-e
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ponto de Venda para emissão de Cupom Fiscal Eletrônico
          </p>
        </div>

        {/* Banner de Contingência */}
        <BannerContingenciaCompacto />

        {/* Seleção de Empresa */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Empresa Emissora
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: Itens */}
          <div className="space-y-6">
            {/* Formulário de Adicionar Item */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Adicionar Item</span>
                <button
                  type="button"
                  onClick={() => setMostrarSeletorProdutos(true)}
                  className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Importar Produtos
                </button>
              </h2>

              <form onSubmit={handleSubmit(adicionarItem)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Código
                    </label>
                    <input
                      type="text"
                      {...register('codigo_produto', { required: true })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="Ex: 001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      {...register('unidade', { required: true })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="Ex: UN"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    {...register('descricao', { required: true })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                    placeholder="Ex: Produto X"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('quantidade', { required: true, min: 0.01 })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor Unitário
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('valor_unitario', { required: true, min: 0.01 })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="text-right text-lg font-bold text-gray-900 dark:text-white">
                  Total: R$ {formatarValor(valorNumerico(quantidadeWatch) * valorNumerico(valorUnitarioWatch))}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Adicionar Item
                </button>
              </form>
            </div>

            {/* Lista de Itens */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Itens do Cupom ({itens.length})
              </h2>

              {itens.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Nenhum item adicionado
                </p>
              ) : (
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div
                      key={item.numero_item}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.descricao}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.quantidade} {item.unidade} x R$ {formatarValor(item.valor_unitario)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-gray-900 dark:text-white">
                          R$ {formatarValor(item.valor_total)}
                        </div>
                        <button
                          onClick={() => removerItem(item.numero_item)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Pagamento */}
          <div className="space-y-6">
            {/* Total */}
            <div className="bg-blue-600 text-white rounded-lg shadow-lg p-6">
              <div className="text-sm opacity-80 mb-1">Valor Total</div>
              <div className="text-4xl font-bold">
                R$ {formatarValor(calcularTotalGeral())}
              </div>
              {pagamentos.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-400">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Valor Pago:</span>
                    <span className="font-bold">R$ {formatarValor(calcularTotalPago())}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="opacity-80">Falta:</span>
                    <span className="font-bold">
                      R$ {formatarValor(calcularTotalGeral() - calcularTotalPago())}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Formas de Pagamento */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Formas de Pagamento
              </h2>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => adicionarPagamento('01')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <DollarSign className="h-5 w-5" />
                  Dinheiro
                </button>
                <button
                  onClick={() => adicionarPagamento('03')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <CreditCard className="h-5 w-5" />
                  Crédito
                </button>
                <button
                  onClick={() => adicionarPagamento('04')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <CreditCard className="h-5 w-5" />
                  Débito
                </button>
                <button
                  onClick={() => adicionarPagamento('15')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  <CreditCard className="h-5 w-5" />
                  Boleto
                </button>
              </div>

              {pagamentos.length > 0 && (
                <div className="space-y-2">
                  {pagamentos.map((pag, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {pag.tipo === '01' && 'Dinheiro'}
                          {pag.tipo === '03' && 'Cartão de Crédito'}
                          {pag.tipo === '04' && 'Cartão de Débito'}
                          {pag.tipo === '15' && 'Boleto Bancário'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-gray-900 dark:text-white">
                          R$ {formatarValor(pag.valor)}
                        </div>
                        <button
                          onClick={() => removerPagamento(index)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botão Emitir */}
            {erro && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 dark:text-red-300">{erro}</p>
              </div>
            )}

            <button
              onClick={emitirCupom}
              disabled={loading || itens.length === 0 || pagamentos.length === 0}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg 
                transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? 'Emitindo Cupom...' : 'Emitir Cupom Fiscal'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Seletor de Produtos */}
      <SeletorProdutos
        isOpen={mostrarSeletorProdutos}
        onClose={() => setMostrarSeletorProdutos(false)}
        onSelecionar={(produto) => {
          setValue('codigo_produto', produto.codigo);
          setValue('descricao', produto.descricao);
          setValue('ncm', produto.ncm);
          setValue('cfop', produto.cfop_padrao || '5102');
          setValue('unidade', produto.unidade);
          setValue('valor_unitario', produto.valor_unitario);
          setMostrarSeletorProdutos(false);
        }}
        multiplo={true}
        onSelecionarMultiplos={(produtos) => {
          adicionarProdutosCadastrados(produtos);
          setMostrarSeletorProdutos(false);
        }}
      />
    </div>
  );
};
