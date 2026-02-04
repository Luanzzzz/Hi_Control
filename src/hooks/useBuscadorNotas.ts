/**
 * useBuscadorNotas Hook
 * 
 * Hook customizado para gerenciar busca de notas fiscais por empresa.
 * Implementa lógica híbrida de certificados e cache.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

// Tipos de status do certificado
export type CertificadoStatus = 'ativo' | 'expirando' | 'vencido' | 'ausente' | 'erro';

// Interface para status do certificado
export interface StatusCertificado {
    status: CertificadoStatus;
    dias_para_vencer: number | null;
    data_validade: string | null;
    tem_fallback: boolean;
    usando_fallback: boolean;
    mensagem: string;
}

// Interface para nota fiscal
export interface NotaFiscal {
    chave_acesso: string;
    nsu: string;
    data_emissao: string;
    tipo_operacao: 'entrada' | 'saída';
    valor_total: number;
    cnpj_emitente: string;
    nome_emitente: string;
    situacao: string;
}

// Interface para resultado da busca
export interface ResultadoBusca {
    success: boolean;
    fonte: 'cache' | 'sefaz';
    cached_at?: string;
    empresa_id: string;
    certificado_status: CertificadoStatus;
    certificado_usado?: string;
    usando_fallback?: boolean;
    notas: NotaFiscal[];
    total_notas: number;
    ultimo_nsu: string;
    max_nsu: string;
    tem_mais_notas: boolean;
}

// Interface para histórico
export interface HistoricoConsulta {
    id: string;
    created_at: string;
    fonte: 'cache' | 'sefaz';
    quantidade_notas: number;
    tempo_resposta_ms: number;
    sucesso: boolean;
    certificado_tipo: string;
}

// Interface para filtros de busca
export interface FiltrosBusca {
    cnpj: string;
    nsu_inicial?: string;
    data_inicio?: string;
    data_fim?: string;
}

// Estado do hook
interface UseBuscadorNotasState {
    // Empresa selecionada
    empresaId: string | null;
    empresaNome: string | null;

    // Status do certificado
    statusCertificado: StatusCertificado | null;
    certificadoLoading: boolean;

    // Busca de notas
    notas: NotaFiscal[];
    loading: boolean;
    error: string | null;
    fonte: 'cache' | 'sefaz' | null;

    // Histórico
    historico: HistoricoConsulta[];
    historicoLoading: boolean;

    // Paginação
    ultimoNsu: string;
    temMaisNotas: boolean;
}

// Opções do hook
interface UseBuscadorNotasOptions {
    persistirEmpresa?: boolean;
    autoValidarCertificado?: boolean;
}

const STORAGE_KEY = 'buscador_notas_empresa_selecionada';

/**
 * Hook para gerenciar busca de notas fiscais por empresa.
 */
export function useBuscadorNotas(options: UseBuscadorNotasOptions = {}) {
    const {
        persistirEmpresa = true,
        autoValidarCertificado = true
    } = options;

    // Estado inicial
    const [state, setState] = useState<UseBuscadorNotasState>({
        empresaId: null,
        empresaNome: null,
        statusCertificado: null,
        certificadoLoading: false,
        notas: [],
        loading: false,
        error: null,
        fonte: null,
        historico: [],
        historicoLoading: false,
        ultimoNsu: '',
        temMaisNotas: false,
    });

    // Carregar empresa do localStorage ao montar
    useEffect(() => {
        if (persistirEmpresa) {
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (salvo) {
                try {
                    const { id, nome } = JSON.parse(salvo);
                    if (id) {
                        selecionarEmpresa(id, nome);
                    }
                } catch (e) {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        }
    }, []);

    /**
     * Seleciona uma empresa e valida seu certificado.
     */
    const selecionarEmpresa = useCallback(async (empresaId: string, empresaNome?: string) => {
        setState(prev => ({
            ...prev,
            empresaId,
            empresaNome: empresaNome || null,
            statusCertificado: null,
            certificadoLoading: autoValidarCertificado,
            notas: [],
            error: null,
            fonte: null,
        }));

        // Persistir no localStorage
        if (persistirEmpresa) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                id: empresaId,
                nome: empresaNome
            }));
        }

        // Validar certificado automaticamente
        if (autoValidarCertificado) {
            await validarCertificado(empresaId);
        }
    }, [autoValidarCertificado, persistirEmpresa]);

    /**
     * Valida o status do certificado da empresa.
     */
    const validarCertificado = useCallback(async (empresaId?: string) => {
        const id = empresaId || state.empresaId;
        if (!id) return;

        setState(prev => ({ ...prev, certificadoLoading: true, error: null }));

        try {
            const response = await api.get(`/nfe/empresas/${id}/certificado/status`);

            setState(prev => ({
                ...prev,
                certificadoLoading: false,
                statusCertificado: response.data,
            }));

            return response.data as StatusCertificado;
        } catch (error: any) {
            const mensagem = error.response?.data?.detail || 'Erro ao verificar certificado';

            setState(prev => ({
                ...prev,
                certificadoLoading: false,
                error: mensagem,
                statusCertificado: {
                    status: 'erro',
                    dias_para_vencer: null,
                    data_validade: null,
                    tem_fallback: false,
                    usando_fallback: false,
                    mensagem,
                },
            }));

            return null;
        }
    }, [state.empresaId]);

    /**
     * Busca notas fiscais da empresa selecionada.
     */
    const buscarNotas = useCallback(async (filtros: FiltrosBusca) => {
        if (!state.empresaId) {
            setState(prev => ({ ...prev, error: 'Selecione uma empresa primeiro' }));
            return null;
        }

        // Verificar certificado antes de buscar
        if (state.statusCertificado?.status === 'vencido' && !state.statusCertificado?.tem_fallback) {
            setState(prev => ({
                ...prev,
                error: 'Certificado vencido. Renove o certificado para continuar.'
            }));
            return null;
        }

        if (state.statusCertificado?.status === 'ausente' && !state.statusCertificado?.tem_fallback) {
            setState(prev => ({
                ...prev,
                error: 'Empresa sem certificado. Cadastre um certificado A1.'
            }));
            return null;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await api.post(
                `/nfe/empresas/${state.empresaId}/notas/buscar`,
                filtros
            );

            const resultado = response.data as ResultadoBusca;

            setState(prev => ({
                ...prev,
                loading: false,
                notas: resultado.notas,
                fonte: resultado.fonte,
                ultimoNsu: resultado.ultimo_nsu,
                temMaisNotas: resultado.tem_mais_notas,
            }));

            return resultado;
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            let mensagem = 'Erro ao buscar notas';

            if (typeof detail === 'object') {
                mensagem = detail.mensagem || detail.error || mensagem;
            } else if (typeof detail === 'string') {
                mensagem = detail;
            }

            setState(prev => ({
                ...prev,
                loading: false,
                error: mensagem,
            }));

            return null;
        }
    }, [state.empresaId, state.statusCertificado]);

    /**
     * Carrega histórico de consultas da empresa.
     */
    const carregarHistorico = useCallback(async (limite: number = 50) => {
        if (!state.empresaId) return;

        setState(prev => ({ ...prev, historicoLoading: true }));

        try {
            const response = await api.get(
                `/nfe/empresas/${state.empresaId}/notas/historico`,
                { params: { limite } }
            );

            setState(prev => ({
                ...prev,
                historicoLoading: false,
                historico: response.data.historico || [],
            }));
        } catch (error) {
            setState(prev => ({ ...prev, historicoLoading: false }));
        }
    }, [state.empresaId]);

    /**
     * Limpa a seleção de empresa.
     */
    const limparSelecao = useCallback(() => {
        setState({
            empresaId: null,
            empresaNome: null,
            statusCertificado: null,
            certificadoLoading: false,
            notas: [],
            loading: false,
            error: null,
            fonte: null,
            historico: [],
            historicoLoading: false,
            ultimoNsu: '',
            temMaisNotas: false,
        });

        if (persistirEmpresa) {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [persistirEmpresa]);

    /**
     * Limpa erro atual.
     */
    const limparErro = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Computed: pode buscar notas?
    const podeBuscar = useMemo(() => {
        if (!state.empresaId) return false;
        if (state.loading) return false;

        const status = state.statusCertificado?.status;
        if (status === 'vencido' && !state.statusCertificado?.tem_fallback) return false;
        if (status === 'ausente' && !state.statusCertificado?.tem_fallback) return false;
        if (status === 'erro') return false;

        return true;
    }, [state.empresaId, state.loading, state.statusCertificado]);

    // Computed: alerta de certificado
    const alertaCertificado = useMemo(() => {
        const cert = state.statusCertificado;
        if (!cert) return null;

        switch (cert.status) {
            case 'vencido':
                return {
                    tipo: 'error' as const,
                    titulo: 'Certificado Vencido',
                    mensagem: cert.mensagem,
                    bloqueante: !cert.tem_fallback,
                };
            case 'expirando':
                return {
                    tipo: 'warning' as const,
                    titulo: 'Certificado Expirando',
                    mensagem: cert.mensagem,
                    bloqueante: false,
                };
            case 'ausente':
                return {
                    tipo: cert.tem_fallback ? 'info' as const : 'error' as const,
                    titulo: 'Certificado Ausente',
                    mensagem: cert.mensagem,
                    bloqueante: !cert.tem_fallback,
                };
            default:
                return null;
        }
    }, [state.statusCertificado]);

    return {
        // Estado
        ...state,

        // Métodos
        selecionarEmpresa,
        validarCertificado,
        buscarNotas,
        carregarHistorico,
        limparSelecao,
        limparErro,

        // Computed
        podeBuscar,
        alertaCertificado,
    };
}

export default useBuscadorNotas;
