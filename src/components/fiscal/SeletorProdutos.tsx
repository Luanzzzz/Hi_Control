/**
 * Componente modal para seleção de produtos cadastrados
 * Permite buscar e importar produtos para itens de documentos fiscais
 */

import React, { useState, useEffect } from 'react';
import { Search, X, Package, Check, AlertCircle } from 'lucide-react';
import { buscarProdutos } from '../../services/fiscalService';
import type { ProdutoCadastrado } from '../../types/fiscal';

interface SeletorProdutosProps {
  isOpen: boolean;
  onClose: () => void;
  onSelecionar: (produto: ProdutoCadastrado) => void;
  titulo?: string;
  multiplo?: boolean; // Permitir seleção múltipla
  onSelecionarMultiplos?: (produtos: ProdutoCadastrado[]) => void;
}

export const SeletorProdutos: React.FC<SeletorProdutosProps> = ({
  isOpen,
  onClose,
  onSelecionar,
  titulo = 'Selecionar Produto',
  multiplo = false,
  onSelecionarMultiplos,
}) => {
  const [termo, setTermo] = useState('');
  const [produtos, setProdutos] = useState<ProdutoCadastrado[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Buscar produtos ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      carregarProdutos();
      setSelecionados(new Set());
    }
  }, [isOpen]);

  // Buscar produtos com debounce
  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(() => {
      carregarProdutos(termo);
    }, 300);

    return () => clearTimeout(timeout);
  }, [termo]);

  const carregarProdutos = async (busca?: string) => {
    setLoading(true);
    setErro('');
    try {
      const dados = await buscarProdutos({
        termo: busca || undefined,
        ativo: true,
        limit: 100,
      });
      setProdutos(dados);
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      setErro('Erro ao carregar produtos');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionar = (produto: ProdutoCadastrado) => {
    if (multiplo) {
      const novoselecionados = new Set(selecionados);
      if (novoselecionados.has(produto.id)) {
        novoselecionados.delete(produto.id);
      } else {
        novoselecionados.add(produto.id);
      }
      setSelecionados(novoselecionados);
    } else {
      onSelecionar(produto);
      handleClose();
    }
  };

  const handleConfirmarMultiplos = () => {
    if (onSelecionarMultiplos) {
      const produtosSelecionados = produtos.filter(p => selecionados.has(p.id));
      onSelecionarMultiplos(produtosSelecionados);
      handleClose();
    }
  };

  const handleClose = () => {
    setTermo('');
    setProdutos([]);
    setErro('');
    setSelecionados(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {titulo}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Campo de busca */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por código, descrição ou NCM..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 
                rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {loading && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          {multiplo && selecionados.size > 0 && (
            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
              {selecionados.size} produto(s) selecionado(s)
            </div>
          )}
        </div>

        {/* Lista de produtos */}
        <div className="flex-1 overflow-y-auto p-4">
          {erro && (
            <div className="flex items-center justify-center p-8 text-red-500">
              <AlertCircle className="h-8 w-8 mr-2" />
              <span>{erro}</span>
            </div>
          )}

          {!loading && !erro && produtos.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
              <Package className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {termo ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </p>
              <p className="text-sm mt-2">
                {termo
                  ? 'Tente buscar com outros termos'
                  : 'Cadastre produtos para utilizá-los nos documentos fiscais'}
              </p>
            </div>
          )}

          {!erro && produtos.length > 0 && (
            <div className="grid gap-3">
              {produtos.map((produto) => {
                const estaSelecionado = selecionados.has(produto.id);
                return (
                  <button
                    key={produto.id}
                    onClick={() => handleSelecionar(produto)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all
                      ${estaSelecionado
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }
                      hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono text-gray-700 dark:text-gray-300">
                            {produto.codigo}
                          </span>
                          {produto.ean && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              EAN: {produto.ean}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                          {produto.descricao}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">NCM:</span> {produto.ncm}
                          </div>
                          {produto.cfop_padrao && (
                            <div>
                              <span className="font-medium">CFOP:</span> {produto.cfop_padrao}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Unidade:</span> {produto.unidade}
                          </div>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            R$ {produto.valor_unitario.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {multiplo && estaSelecionado && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé - apenas para seleção múltipla */}
        {multiplo && (
          <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 
                dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarMultiplos}
              disabled={selecionados.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Adicionar {selecionados.size > 0 ? `(${selecionados.size})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
