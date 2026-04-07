/**
 * Dashboard Service — separação de API por domínio
 *
 * ─── Domínio: Busca ────────────────────────────────────────────────────────
 * carregarMetricasBusca(): carrega empresas + dados de busca (total_notas,
 * ultima_nota, sincronizado) via botService.obterStatusEmpresa()
 *
 * ─── Domínio: Emissão ─────────────────────────────────────────────────────
 * carregarMetricasEmissao(): carrega empresas + status do certificado A1
 * via empresaService.verificarStatusCertificado()
 *
 * Estes dois domínios não se misturam neste service.
 */

import { empresaService, Empresa, CertificateStatus } from '../../services/empresaService';
import { botService, StatusEmpresa } from './botService';

// ─── Tipos de domínio ───────────────────────────────────────────────────────

export interface MetricasBusca {
  empresa: Empresa;
  totalNotas: number;
  ultimaNota: StatusEmpresa['ultima_nota'];
  sincronizado: boolean;
  erroBusca?: string;
}

export interface MetricasEmissao {
  empresa: Empresa;
  certStatus: CertificateStatus | null;
  prontoParaEmitir: boolean;
  erroEmissao?: string;
}

// ─── Domínio: Busca ─────────────────────────────────────────────────────────

/**
 * Carrega todas as empresas com métricas de busca fiscal.
 * Fonte: botService.obterStatusEmpresa — NÃO usa dados de emissão.
 */
export async function carregarMetricasBusca(): Promise<MetricasBusca[]> {
  const empresas = await empresaService.listar();

  const resultados = await Promise.allSettled(
    empresas.map(async (empresa): Promise<MetricasBusca> => {
      try {
        const status = await botService.obterStatusEmpresa(empresa.id);
        return {
          empresa,
          totalNotas: status.total_notas,
          ultimaNota: status.ultima_nota,
          sincronizado: status.sincronizado,
        };
      } catch {
        return {
          empresa,
          totalNotas: 0,
          ultimaNota: null,
          sincronizado: false,
          erroBusca: 'Sem dados de sincronização',
        };
      }
    })
  );

  return resultados.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { empresa: (r as any).reason?.empresa, totalNotas: 0, ultimaNota: null, sincronizado: false }
  );
}

// ─── Domínio: Emissão ────────────────────────────────────────────────────────

/**
 * Carrega todas as empresas com status de certificado A1 para emissão.
 * Fonte: empresaService.verificarStatusCertificado — NÃO usa dados de busca.
 */
export async function carregarMetricasEmissao(): Promise<MetricasEmissao[]> {
  const empresas = await empresaService.listar();

  const resultados = await Promise.allSettled(
    empresas.map(async (empresa): Promise<MetricasEmissao> => {
      try {
        const cert = await empresaService.verificarStatusCertificado(empresa.id);
        return {
          empresa,
          certStatus: cert,
          prontoParaEmitir: cert.status === 'valido',
        };
      } catch {
        return {
          empresa,
          certStatus: null,
          prontoParaEmitir: false,
          erroEmissao: 'Sem certificado cadastrado',
        };
      }
    })
  );

  return resultados.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { empresa: (r as any).reason?.empresa, certStatus: null, prontoParaEmitir: false }
  );
}
