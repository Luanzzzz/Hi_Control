/**
 * Componente de autocomplete para busca de códigos CFOP
 * Permite buscar CFOPs por código ou descrição com debounce
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { buscarCFOP } from '../../services/fiscalService';
import type { CFOPItem } from '../../types/fiscal';

interface AutocompleteCFOPProps {
  value?: string; // Código do CFOP selecionado
  onChange: (cfop: CFOPItem | null) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  aplicacao?: 'entrada' | 'saida'; // Filtrar por tipo de operação
}

export const AutocompleteCFOP: React.FC<AutocompleteCFOPProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Digite código ou descrição do CFOP',
  aplicacao,
}) => {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<CFOPItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [cfopSelecionado, setCfopSelecionado] = useState<CFOPItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar CFOPs com debounce
  useEffect(() => {
    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const dados = await buscarCFOP(termo);
        
        // Filtrar por aplicação se especificado
        const dadosFiltrados = aplicacao
          ? dados.filter(item => item.aplicacao === aplicacao)
          : dados;
        
        setResultados(dadosFiltrados);
        setMostrarDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar CFOP:', err);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeout);
  }, [termo, aplicacao]);

  // Atualizar campo quando value mudar externamente
  useEffect(() => {
    if (value && !cfopSelecionado) {
      buscarCFOP(value).then(dados => {
        const cfop = dados.find(item => item.codigo === value);
        if (cfop) {
          setCfopSelecionado(cfop);
          setTermo(`${cfop.codigo} - ${cfop.descricao}`);
        }
      });
    }
  }, [value]);

  const handleSelecionar = (item: CFOPItem) => {
    setCfopSelecionado(item);
    setTermo(`${item.codigo} - ${item.descricao}`);
    setMostrarDropdown(false);
    onChange(item);
  };

  const handleLimpar = () => {
    setCfopSelecionado(null);
    setTermo('');
    setResultados([]);
    onChange(null);
  };

  const getBadgeColor = (app: string) => {
    return app === 'entrada'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        CFOP (Código Fiscal de Operações e Prestações)
        {aplicacao && (
          <span className="ml-2 text-xs text-gray-500">
            • {aplicacao === 'entrada' ? 'Entrada' : 'Saída'}
          </span>
        )}
      </label>

      <div className="relative">
        <input
          type="text"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            if (!e.target.value) {
              handleLimpar();
            }
          }}
          onFocus={() => {
            if (resultados.length > 0) {
              setMostrarDropdown(true);
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />

        <div className="absolute right-2 top-2 flex items-center space-x-1">
          {loading && (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          {cfopSelecionado && !disabled && (
            <button
              type="button"
              onClick={handleLimpar}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <Search className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Dropdown de resultados */}
      {mostrarDropdown && resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-auto">
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
            {resultados.length} resultado(s) encontrado(s)
          </div>
          {resultados.map((item) => (
            <button
              key={item.codigo}
              type="button"
              onClick={() => handleSelecionar(item)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 
                border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.codigo}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.descricao}
                  </div>
                  {item.observacoes && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {item.observacoes}
                    </div>
                  )}
                </div>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getBadgeColor(item.aplicacao)}`}>
                  {item.aplicacao === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center mt-1 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {!loading && termo.length >= 2 && resultados.length === 0 && mostrarDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Nenhum CFOP encontrado para "{termo}"
          </p>
        </div>
      )}

      {/* Informação do CFOP selecionado */}
      {cfopSelecionado && !mostrarDropdown && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                CFOP Selecionado:
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {cfopSelecionado.codigo} - {cfopSelecionado.descricao}
              </div>
            </div>
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getBadgeColor(cfopSelecionado.aplicacao)}`}>
              {cfopSelecionado.aplicacao === 'entrada' ? 'Entrada' : 'Saída'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
