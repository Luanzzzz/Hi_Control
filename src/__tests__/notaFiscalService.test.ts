import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { buscarNotasEmpresa, buscarTodasNotasEmpresa } from '../services/notaFiscalService';
import api from '../services/api';

vi.mock('../services/api');

describe('notaFiscalService.buscarNotasEmpresa()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar notas de uma empresa com sucesso', async () => {
    const respostaMock = {
      success: true,
      fonte: 'banco_local' as const,
      empresa_id: 'emp123',
      certificado_status: 'ativo',
      certificado_usado: 'empresa',
      notas: [
        {
          id: 'nf1',
          chave_acesso: '35230101234567000100550010000000011000000015',
          numero_nf: '1',
          serie: '1',
          tipo_nf: 'NFe' as const,
          data_emissao: '2026-04-07T10:00:00Z',
          valor_total: 1000,
          cnpj_emitente: '12345678000100',
          nome_emitente: 'Fornecedor A',
          cnpj_destinatario: '98765432000199',
          nome_destinatario: 'Empresa B',
          situacao: 'autorizada',
          created_at: '2026-04-07T10:00:00Z',
          updated_at: '2026-04-07T10:00:00Z',
        },
      ],
      ultimo_nsu: 100,
      max_nsu: 1000,
      total_notas: 1,
      tem_mais_notas: false,
    };

    vi.mocked(api.post).mockResolvedValue({ data: respostaMock });

    const resultado = await buscarNotasEmpresa('emp123', {
      cnpj: '98765432000199',
      nsu_inicial: 0,
    });

    expect(api.post).toHaveBeenCalledWith('/nfe/empresas/emp123/notas/buscar', expect.any(Object));
    expect(resultado.notas).toHaveLength(1);
    expect(resultado.fonte).toBe('banco_local');
    expect(resultado.total_notas).toBe(1);
  });

  it('deve lançar erro com mensagem extraída da resposta 422', async () => {
    const errorToThrow = new Error('Request failed');
    (errorToThrow as any).response = {
      status: 422,
      data: {
        detail: 'CNPJ inválido',
      },
    };
    (errorToThrow as any).isAxiosError = true;

    vi.mocked(api.post).mockRejectedValue(errorToThrow);

    try {
      await buscarNotasEmpresa('emp123', {
        cnpj: 'invalido',
      });
      expect.fail('Deveria ter lançado erro');
    } catch (error: any) {
      expect(error.message).toBe('CNPJ inválido');
    }
  });

  it('deve retornar um erro genérico se detail não está disponível', async () => {
    const errorToThrow = new Error('Request failed');
    (errorToThrow as any).response = {
      status: 500,
      data: {},
    };
    (errorToThrow as any).isAxiosError = true;

    vi.mocked(api.post).mockRejectedValue(errorToThrow);

    try {
      await buscarNotasEmpresa('emp123', { cnpj: '98765432000199' });
      expect.fail('Deveria ter lançado erro');
    } catch (error: any) {
      expect(error.message).toBe('Erro ao buscar notas da empresa');
    }
  });
});

describe('notaFiscalService.buscarTodasNotasEmpresa()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar todas as notas com paginação automática', async () => {
    const notaPaginada1 = {
      id: 'nf1',
      chave_acesso: '35230101234567000100550010000000011000000015',
      numero_nf: '1',
      serie: '1',
      tipo_nf: 'NFe' as const,
      data_emissao: '2026-04-07T10:00:00Z',
      valor_total: 1000,
      cnpj_emitente: '12345678000100',
      nome_emitente: 'Fornecedor A',
      cnpj_destinatario: '98765432000199',
      nome_destinatario: 'Empresa B',
      situacao: 'autorizada',
      created_at: '2026-04-07T10:00:00Z',
      updated_at: '2026-04-07T10:00:00Z',
    };

    const notaPaginada2 = {
      ...notaPaginada1,
      id: 'nf2',
      numero_nf: '2',
      chave_acesso: '35230101234567000100550010000000012000000016',
    };

    const resposta1 = {
      success: true,
      fonte: 'banco_local' as const,
      empresa_id: 'emp123',
      certificado_status: 'ativo',
      certificado_usado: 'empresa',
      notas: [notaPaginada1],
      ultimo_nsu: 100,
      max_nsu: 200,
      total_notas: 1,
      tem_mais_notas: true,
    };

    const resposta2 = {
      success: true,
      fonte: 'banco_local' as const,
      empresa_id: 'emp123',
      certificado_status: 'ativo',
      certificado_usado: 'empresa',
      notas: [notaPaginada2],
      ultimo_nsu: 200,
      max_nsu: 200,
      total_notas: 1,
      tem_mais_notas: false,
    };

    // Mock para responder duas vezes (primeira e segunda página)
    let callCount = 0;
    vi.mocked(api.post).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { data: resposta1 };
      } else {
        return { data: resposta2 };
      }
    });

    const resultado = await buscarTodasNotasEmpresa('emp123', { cnpj: '98765432000199' }, 100);

    expect(resultado.notas).toHaveLength(2);
    expect(resultado.total_notas).toBe(2);
    expect(resultado.tem_mais_notas).toBe(false);
  });
});
