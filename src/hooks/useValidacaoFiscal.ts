/**
 * Hook para validação de documentos fiscais antes da emissão
 * Permite validar NFCe, CTe e NFSe pré-autorização
 */

import { useState } from 'react';
import { validarDocumento } from '../services/fiscalService';
import type { ValidacaoRequest, ValidacaoResponse, ErroValidacao } from '../types/fiscal';

interface UseValidacaoFiscalReturn {
  validar: (dados: ValidacaoRequest) => Promise<boolean>;
  loading: boolean;
  erros: ErroValidacao[];
  avisos: string[];
  limparErros: () => void;
}

export const useValidacaoFiscal = (): UseValidacaoFiscalReturn => {
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState<ErroValidacao[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);

  /**
   * Valida um documento fiscal antes da autorização
   * @param dados Dados do documento a validar
   * @returns true se válido, false se houver erros
   */
  const validar = async (dados: ValidacaoRequest): Promise<boolean> => {
    setLoading(true);
    setErros([]);
    setAvisos([]);

    try {
      const resultado = await validarDocumento(dados);

      if (!resultado.valido) {
        setErros(resultado.erros);
        
        // Separar avisos se disponíveis
        if (resultado.avisos && resultado.avisos.length > 0) {
          setAvisos(resultado.avisos.map(a => a.mensagem));
        }

        return false;
      }

      // Se houver avisos mesmo com documento válido
      if (resultado.avisos && resultado.avisos.length > 0) {
        setAvisos(resultado.avisos.map(a => a.mensagem));
      }

      return true;
    } catch (error: any) {
      // Em caso de erro na validação, adicionar como erro genérico
      setErros([{
        campo: 'geral',
        mensagem: error.message || 'Erro ao validar documento',
      }]);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limpa todos os erros e avisos
   */
  const limparErros = () => {
    setErros([]);
    setAvisos([]);
  };

  return {
    validar,
    loading,
    erros,
    avisos,
    limparErros,
  };
};

/**
 * Hook auxiliar para obter mensagem de erro formatada
 */
export const useErrosFormatados = (erros: ErroValidacao[]): string[] => {
  return erros.map((erro) => {
    let mensagem = erro.campo ? `${erro.campo}: ${erro.mensagem}` : erro.mensagem;
    
    if (erro.correcao) {
      mensagem += `\n💡 Sugestão: ${erro.correcao}`;
    }

    return mensagem;
  });
};

/**
 * Hook para validação de campos específicos (uso em formulários)
 */
export const useCampoValidacao = () => {
  /**
   * Valida CNPJ
   */
  const validarCNPJ = (cnpj: string): boolean => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) return false;
    
    // Validação básica (aceita qualquer 14 dígitos - validação completa no backend)
    return true;
  };

  /**
   * Valida CPF
   */
  const validarCPF = (cpf: string): boolean => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) return false;
    
    // Validação básica (aceita qualquer 11 dígitos - validação completa no backend)
    return true;
  };

  /**
   * Valida CEP
   */
  const validarCEP = (cep: string): boolean => {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.length === 8;
  };

  /**
   * Valida Chave de Acesso (44 dígitos)
   */
  const validarChaveAcesso = (chave: string): boolean => {
    const chaveLimpa = chave.replace(/\D/g, '');
    return chaveLimpa.length === 44;
  };

  /**
   * Valida NCM (8 dígitos)
   */
  const validarNCM = (ncm: string): boolean => {
    const ncmLimpo = ncm.replace(/\D/g, '');
    return ncmLimpo.length === 8;
  };

  /**
   * Valida CFOP (4 dígitos)
   */
  const validarCFOP = (cfop: string): boolean => {
    const cfopLimpo = cfop.replace(/\D/g, '');
    return cfopLimpo.length === 4;
  };

  /**
   * Valida E-mail
   */
  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  /**
   * Valida Código IBGE do Município (7 dígitos)
   */
  const validarCodigoMunicipio = (codigo: string): boolean => {
    const codigoLimpo = codigo.replace(/\D/g, '');
    return codigoLimpo.length === 7;
  };

  return {
    validarCNPJ,
    validarCPF,
    validarCEP,
    validarChaveAcesso,
    validarNCM,
    validarCFOP,
    validarEmail,
    validarCodigoMunicipio,
  };
};
