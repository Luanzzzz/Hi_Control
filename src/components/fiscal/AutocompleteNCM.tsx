/**
 * Componente de autocomplete para busca de códigos NCM
 * Permite buscar NCMs por código ou descrição com debounce
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, AlertCircle, Info } from 'lucide-react';
import { buscarNCM, validarNCM } from '../../services/fiscalService';
import type { NCMItem } from '../../types/fiscal';

interface AutocompleteNCMProps {
  value?: string; // Código NCM selecionado (8 dígitos)
  onChange: (ncm: NCMItem | null) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export const AutocompleteNCM: React.FC<AutocompleteNCMProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Digite código ou descrição do NCM',
  required = false,
}) => {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<NCMItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [ncmSelecionado, setNcmSelecionado] = useState<NCMItem | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string>('');
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

  // Buscar NCMs com debounce
  useEffect(() => {
    if (termo.length < 2) {
      setResultados([]);
      setErroValidacao('');
      return;
    }

    // Validar se está digitando um código NCM diretamente
    if (/^\d+$/.test(termo)) {
      if (termo.length === 8) {
        if (!validarNCM(termo)) {
          setErroValidacao('NCM deve ter exatamente 8 dígitos');
        } else {
          setErroValidacao('');
        }
      } else if (termo.length > 8) {
        setErroValidacao('NCM não pode ter mais de 8 dígitos');
        return;
      }
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const dados = await buscarNCM(termo);
        setResultados(dados);
        setMostrarDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar NCM:', err);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeout);
  }, [termo]);

  // Atualizar campo quando value mudar externamente
  useEffect(() => {
    if (value && !ncmSelecionado) {
      buscarNCM(value).then(dados => {
        const ncm = dados.find(item => item.codigo === value);
        if (ncm) {
          setNcmSelecionado(ncm);
          setTermo(`${ncm.codigo} - ${ncm.descricao}`);
        }
      });
    }
  }, [value]);

  const handleSelecionar = (item: NCMItem) => {
    setNcmSelecionado(item);
    setTermo(`${item.codigo} - ${item.descricao}`);
    setMostrarDropdown(false);
    setErroValidacao('');
    onChange(item);
  };

  const handleLimpar = () => {
    setNcmSelecionado(null);
    setTermo('');
    setResultados([]);
    setErroValidacao('');
    onChange(null);
  };

  const formatarNCM = (codigo: string): string => {
    // Formata NCM como: XXXX.XX.XX
    if (codigo.length === 8) {
      return `${codigo.slice(0, 4)}.${codigo.slice(4, 6)}.${codigo.slice(6, 8)}`;
    }
    return codigo;
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        NCM (Nomenclatura Comum do Mercosul)
        {required && <span className="text-red-500 ml-1">*</span>}
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
          maxLength={50}
          className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-white 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${error || erroValidacao ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />

        <div className="absolute right-2 top-2 flex items-center space-x-1">
          {loading && (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          {ncmSelecionado && !disabled && (
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
                    {formatarNCM(item.codigo)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.descricao}
                  </div>
                  {item.unidade && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Unidade padrão: {item.unidade}
                    </div>
                  )}
                  {item.aliquota_nacional !== undefined && item.aliquota_nacional > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Alíquota IPI: {item.aliquota_nacional}%
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensagem de erro de validação */}
      {erroValidacao && (
        <div className="flex items-center mt-1 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {erroValidacao}
        </div>
      )}

      {/* Mensagem de erro externa */}
      {error && !erroValidacao && (
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
            Nenhum NCM encontrado para "{termo}"
          </p>
        </div>
      )}

      {/* Informação do NCM selecionado */}
      {ncmSelecionado && !mostrarDropdown && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                NCM Selecionado:
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatarNCM(ncmSelecionado.codigo)} - {ncmSelecionado.descricao}
              </div>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                {ncmSelecionado.unidade && (
                  <div>
                    <span className="font-medium">Unidade:</span> {ncmSelecionado.unidade}
                  </div>
                )}
                {ncmSelecionado.aliquota_nacional !== undefined && ncmSelecionado.aliquota_nacional > 0 && (
                  <div>
                    <span className="font-medium">IPI:</span> {ncmSelecionado.aliquota_nacional}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dica informativa */}
      <div className="mt-2 flex items-start text-xs text-gray-500 dark:text-gray-400">
        <Info className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
        <span>
          O NCM é obrigatório e deve ter 8 dígitos. Digite o código ou busque pela descrição do produto.
        </span>
      </div>
    </div>
  );
};
