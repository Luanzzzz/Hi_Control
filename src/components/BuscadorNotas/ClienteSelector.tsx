/**
 * ClienteSelector Component
 * 
 * Dropdown para seleção de empresa (cliente) com badge de certificado.
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2, Search, Check } from 'lucide-react';
import { CertificadoBadge, CertificadoStatus } from './CertificadoBadge';
import api from '../../services/api';

interface Empresa {
    id: string;
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    certificado_status?: CertificadoStatus;
    certificado_validade?: string;
}

interface ClienteSelectorProps {
    empresaId: string | null;
    onSelect: (empresa: Empresa) => void;
    statusCertificado?: { status: CertificadoStatus; dias_para_vencer?: number } | null;
    disabled?: boolean;
    className?: string;
}

export function ClienteSelector({
    empresaId,
    onSelect,
    statusCertificado,
    disabled = false,
    className = '',
}: ClienteSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);

    // Carregar empresas ao montar
    useEffect(() => {
        carregarEmpresas();
    }, []);

    // Atualizar empresa selecionada quando empresaId muda
    useEffect(() => {
        if (empresaId && empresas.length > 0) {
            const empresa = empresas.find(e => e.id === empresaId);
            if (empresa) {
                setEmpresaSelecionada(empresa);
            }
        }
    }, [empresaId, empresas]);

    const carregarEmpresas = async () => {
        setLoading(true);
        try {
            const response = await api.get('/empresas');
            setEmpresas(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (empresa: Empresa) => {
        setEmpresaSelecionada(empresa);
        setIsOpen(false);
        setSearchTerm('');
        onSelect(empresa);
    };

    // Filtrar empresas
    const empresasFiltradas = empresas.filter(empresa => {
        const termo = searchTerm.toLowerCase();
        return (
            empresa.razao_social.toLowerCase().includes(termo) ||
            empresa.nome_fantasia?.toLowerCase().includes(termo) ||
            empresa.cnpj.includes(termo)
        );
    });

    return (
        <div className={`relative ${className}`}>
            {/* Botão de seleção */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full flex items-center justify-between gap-3
          px-4 py-3 rounded-lg
          bg-gray-800/50 border border-gray-700
          text-left transition-all
          ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                    }
        `}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="flex-shrink-0 text-gray-400" size={20} />

                    {empresaSelecionada ? (
                        <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                                {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
                            </p>
                            <p className="text-gray-400 text-sm truncate">
                                {formatarCNPJ(empresaSelecionada.cnpj)}
                            </p>
                        </div>
                    ) : (
                        <span className="text-gray-400">
                            Selecione uma empresa...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {statusCertificado && empresaSelecionada && (
                        <CertificadoBadge
                            status={statusCertificado.status}
                            diasRestantes={statusCertificado.dias_para_vencer}
                            size="sm"
                            showLabel={false}
                        />
                    )}
                    <ChevronDown
                        size={20}
                        className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute z-50 w-full mt-2 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                        {/* Busca */}
                        <div className="px-3 pb-2 border-b border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar empresa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Lista de empresas */}
                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="px-4 py-8 text-center text-gray-400">
                                    Carregando...
                                </div>
                            ) : empresasFiltradas.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-400">
                                    Nenhuma empresa encontrada
                                </div>
                            ) : (
                                empresasFiltradas.map(empresa => (
                                    <button
                                        key={empresa.id}
                                        type="button"
                                        onClick={() => handleSelect(empresa)}
                                        className={`
                      w-full flex items-center justify-between gap-3
                      px-4 py-3 text-left
                      hover:bg-gray-700/50 transition-colors
                      ${empresaSelecionada?.id === empresa.id ? 'bg-purple-500/10' : ''}
                    `}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-white font-medium truncate">
                                                {empresa.nome_fantasia || empresa.razao_social}
                                            </p>
                                            <p className="text-gray-400 text-sm truncate">
                                                {formatarCNPJ(empresa.cnpj)}
                                            </p>
                                        </div>

                                        {empresaSelecionada?.id === empresa.id && (
                                            <Check className="flex-shrink-0 text-purple-400" size={18} />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
function formatarCNPJ(cnpj: string): string {
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return cnpj;
    return numeros.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    );
}

export default ClienteSelector;
