import { describe, it, expect, vi, beforeEach } from 'vitest';
import { carregarMetricasBusca } from '../services/dashboardService';
import { botService } from '../services/botService';
import { empresaService } from '../../services/empresaService';

vi.mock('../services/botService');
vi.mock('../../services/empresaService');

describe('dashboardService.carregarMetricasBusca()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar métricas de busca para múltiplas empresas', async () => {
    const empresasFake = [
      { id: 'emp1', nome: 'Empresa 1', cnpj: '12345678000100' },
      { id: 'emp2', nome: 'Empresa 2', cnpj: '98765432000199' },
    ];

    const statusEmpresa1 = {
      empresa_id: 'emp1',
      total_notas: 5,
      sincronizado: true,
      ultima_nota: { created_at: '2026-04-07T10:00:00Z', tipo: 'NFe', numero: '001' },
    };

    const statusEmpresa2 = {
      empresa_id: 'emp2',
      total_notas: 10,
      sincronizado: true,
      ultima_nota: { created_at: '2026-04-06T15:30:00Z', tipo: 'NFe', numero: '002' },
    };

    vi.mocked(empresaService.listar).mockResolvedValue(empresasFake as any);
    vi.mocked(botService.obterStatusEmpresa)
      .mockResolvedValueOnce(statusEmpresa1 as any)
      .mockResolvedValueOnce(statusEmpresa2 as any);

    const resultado = await carregarMetricasBusca();

    expect(resultado).toHaveLength(2);
    expect(resultado[0].totalNotas).toBe(5);
    expect(resultado[0].sincronizado).toBe(true);
    expect(resultado[1].totalNotas).toBe(10);
    expect(resultado[1].sincronizado).toBe(true);
  });

  it('deve isolar falha de uma empresa e retornar outras com dados', async () => {
    const empresasFake = [
      { id: 'emp1', nome: 'Empresa 1', cnpj: '12345678000100' },
      { id: 'emp2', nome: 'Empresa 2', cnpj: '98765432000199' },
    ];

    const statusEmpresa1 = {
      empresa_id: 'emp1',
      total_notas: 5,
      sincronizado: true,
      ultima_nota: { created_at: '2026-04-07T10:00:00Z', tipo: 'NFe', numero: '001' },
    };

    vi.mocked(empresaService.listar).mockResolvedValue(empresasFake as any);
    vi.mocked(botService.obterStatusEmpresa)
      .mockResolvedValueOnce(statusEmpresa1 as any)
      .mockRejectedValueOnce(new Error('Erro ao obter status'));

    const resultado = await carregarMetricasBusca();

    expect(resultado).toHaveLength(2);
    // Empresa 1 com dados
    expect(resultado[0].totalNotas).toBe(5);
    expect(resultado[0].sincronizado).toBe(true);
    // Empresa 2 com fallback
    expect(resultado[1].totalNotas).toBe(0);
    expect(resultado[1].sincronizado).toBe(false);
  });
});
