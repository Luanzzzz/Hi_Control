import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { Plus, Edit2, Trash2, X, Building, MapPin, Shield, Upload, FileCheck, AlertCircle, FileSearch, Mail } from 'lucide-react';
import { empresaService, Empresa, EmpresaCreate, CnpjCheckResponse } from '../services/empresaService';
import { fileToBase64, validateFileSize, validateFileExtension } from '../utils/fileUtils';
import { formatDate } from '../utils/dateUtils';
import { ConfiguracaoEmail } from './ConfiguracaoEmail';
import { ConfiguracaoDrive } from './ConfiguracaoDrive';
import { Button, PageHeader, SearchBar, CertBadge, InlineAlert } from '../src/components/ui';

// Props interface para receber função de navegação do App.tsx
interface ClientsProps {
    onNavigateToBuscador?: (empresaId: string) => void;
}

export const Clients: React.FC<ClientsProps> = ({ onNavigateToBuscador }) => {
    const [clients, setClients] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Empresa | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // CNPJ check state
    const [cnpjCheck, setCnpjCheck] = useState<CnpjCheckResponse | null>(null);
    const [checkingCnpj, setCheckingCnpj] = useState(false);
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'info' | 'error' | 'warning'; text: string } | null>(null);

    // Certificate state
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');
    const [uploadingCert, setUploadingCert] = useState(false);
    const [certMessage, setCertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    /**
     * Salva o empresaId no localStorage e dispara evento para navegação
     * Compatível com arquitetura ViewState do App.tsx
     */
    const irParaDetalheCliente = (empresaId: string, empresaNome?: string) => {
        // Salvar no localStorage para o detalhe ler se necessário
        localStorage.setItem('cliente_detalhe_selecionado', JSON.stringify({
            id: empresaId,
            nome: empresaNome || ''
        }));

        // Se callback foi passado pelo App.tsx, usar para navegar
        if (onNavigateToBuscador) {
            onNavigateToBuscador(empresaId);
        }
    };

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EmpresaCreate>();

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const data = await empresaService.listar();
            setClients(data);
        } catch (error) {
            console.error("Erro ao listar clientes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client?: Empresa) => {
        if (client) {
            setEditingClient(client);
            setValue('razao_social', client.razao_social);
            setValue('nome_fantasia', client.nome_fantasia);
            setValue('cnpj', client.cnpj);
            setValue('inscricao_estadual', client.inscricao_estadual);
            setValue('inscricao_municipal', client.inscricao_municipal);
            setValue('cep', client.cep);
            setValue('logradouro', client.logradouro);
            setValue('numero', client.numero);
            setValue('complemento', client.complemento);
            setValue('bairro', client.bairro);
            setValue('cidade', client.cidade);
            setValue('estado', client.estado);
            setValue('email', client.email);
            setValue('telefone', client.telefone);
            setValue('regime_tributario', client.regime_tributario);
            setValue('csc_id', client.csc_id);
            setValue('csc_token', client.csc_token);
        } else {
            setEditingClient(null);
            reset();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        reset();
        // Clear all state
        setCnpjCheck(null);
        setCheckingCnpj(false);
        setFormMessage(null);
        setCertFile(null);
        setCertPassword('');
        setCertMessage(null);
    };

    const handleCnpjBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cnpj = e.target.value;
        const cnpjDigits = cnpj.replace(/\D/g, '');

        // Só verificar se o CNPJ tem 14 dígitos e não estamos editando
        if (cnpjDigits.length !== 14 || editingClient) {
            setCnpjCheck(null);
            setFormMessage(null);
            return;
        }

        setCheckingCnpj(true);
        try {
            const result = await empresaService.verificarCnpj(cnpjDigits);
            setCnpjCheck(result);

            if (result.exists && result.empresa) {
                setFormMessage({
                    type: 'warning',
                    text: `Cliente "${result.empresa.razao_social}" já cadastrado com este CNPJ. Ao salvar, os dados serão atualizados.`
                });
            } else {
                setFormMessage(null);
            }
        } catch {
            // Silently fail - não bloquear o formulário por erro na verificação
            setCnpjCheck(null);
        } finally {
            setCheckingCnpj(false);
        }
    };

    const handleCertificateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file extension
        if (!validateFileExtension(file, ['.pfx', '.p12'])) {
            setCertMessage({ type: 'error', text: 'Formato inválido. Use .pfx ou .p12' });
            return;
        }

        // Validate file size (max 10MB)
        if (!validateFileSize(file, 10)) {
            setCertMessage({ type: 'error', text: 'Arquivo muito grande. Máximo: 10MB.' });
            return;
        }

        setCertFile(file);
        setCertMessage(null);
    };

    const handleCertificateUpload = async (empresaId: string) => {
        if (!certFile || !certPassword) {
            return; // Skip if no certificate
        }

        setUploadingCert(true);
        try {
            const certBase64 = await fileToBase64(certFile);
            await empresaService.uploadCertificado(empresaId, certBase64, certPassword);
            setCertMessage({ type: 'success', text: 'Certificado enviado com sucesso!' });
        } catch (error: any) {
            setCertMessage({ type: 'error', text: error.message });
            throw error; // Re-throw to handle in onSubmit
        } finally {
            setUploadingCert(false);
        }
    };

    const onSubmit = async (data: EmpresaCreate) => {
        setFormMessage(null);
        try {
            let empresaId: string;

            // Garantir que CSC seja enviado corretamente (csc_id como number, csc_token como string)
            const payload: EmpresaCreate = {
                ...data,
                csc_id: data.csc_id !== undefined && data.csc_id !== null && String(data.csc_id).trim() !== ''
                    ? Number(data.csc_id)
                    : undefined,
                csc_token: data.csc_token && String(data.csc_token).trim() ? String(data.csc_token).trim() : undefined,
            };

            if (editingClient) {
                await empresaService.atualizar(editingClient.id, payload);
                empresaId = editingClient.id;
                setFormMessage({ type: 'success', text: 'Dados do cliente atualizados com sucesso!' });
            } else {
                const result = await empresaService.criar(payload);
                empresaId = result.id;

                if (result._action === 'updated') {
                    setFormMessage({ type: 'info', text: result._message || 'Dados do cliente atualizados com sucesso!' });
                } else {
                    setFormMessage({ type: 'success', text: result._message || 'Cliente cadastrado com sucesso!' });
                }
            }

            // Upload certificate if provided
            if (certFile && certPassword) {
                try {
                    await handleCertificateUpload(empresaId);
                } catch (certError) {
                    console.error("Erro ao fazer upload do certificado:", certError);
                    setFormMessage({
                        type: 'warning',
                        text: 'Cliente salvo, mas houve erro ao enviar o certificado. Tente novamente pela edição.'
                    });
                    // Ainda recarrega a lista, mas mantém a mensagem visível por um momento
                    loadClients();
                    return;
                }
            }

            handleCloseModal();
            loadClients();
        } catch (error: any) {
            console.error("Erro ao salvar cliente:", error);

            if (error.response) {
                const { status, data: responseData } = error.response;
                const detail = responseData?.detail;

                switch (status) {
                    case 409: {
                        // CNPJ duplicado ou inativo
                        const message = typeof detail === 'object'
                            ? detail.message
                            : detail || 'CNPJ já cadastrado no sistema.';
                        const suggestion = typeof detail === 'object' ? detail.suggestion : null;
                        setFormMessage({
                            type: 'error',
                            text: `${message}${suggestion ? ` ${suggestion}` : ''}`
                        });
                        break;
                    }
                    case 422: {
                        // Validação (CNPJ inválido, campos obrigatórios, etc.)
                        let message = 'Dados inválidos.';
                        if (typeof detail === 'string') {
                            message = detail;
                        } else if (Array.isArray(detail)) {
                            message = detail.map((e: any) => e.msg || e.message).join('; ');
                        } else if (typeof detail === 'object' && detail.message) {
                            message = detail.message;
                        }
                        setFormMessage({ type: 'error', text: message });
                        break;
                    }
                    case 400:
                        setFormMessage({
                            type: 'error',
                            text: typeof detail === 'object' ? detail.message : (detail || 'Dados inválidos.')
                        });
                        break;
                    default:
                        setFormMessage({
                            type: 'error',
                            text: 'Erro ao salvar cliente. Tente novamente.'
                        });
                }
            } else {
                setFormMessage({
                    type: 'error',
                    text: 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.'
                });
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este cliente?")) {
            try {
                await empresaService.deletar(id);
                loadClients();
            } catch (error) {
                console.error("Erro ao deletar", error);
            }
        }
    };

    const filteredClients = clients.filter(c =>
        c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm)
    );

    return (
        <div className="p-6 h-full flex flex-col">
            <PageHeader
                title="Gestão de Clientes"
                subtitle={`${filteredClients.length} cliente${filteredClients.length !== 1 ? 's' : ''} cadastrado${filteredClients.length !== 1 ? 's' : ''}`}
                actions={
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenModal()}
                        leftIcon={<Plus size={14} />}
                    >
                        Novo Cliente
                    </Button>
                }
            />

            {/* Search */}
            <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por Razão Social ou CNPJ..."
                className="mb-5"
            />

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-hc-purple border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Building size={32} className="text-hc-muted" />
                        <p className="text-sm text-hc-muted">
                            {searchTerm ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}
                        </p>
                        {!searchTerm && (
                            <Button variant="primary" size="sm" onClick={() => handleOpenModal()} leftIcon={<Plus size={13} />}>
                                Cadastrar primeiro cliente
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredClients.map(client => (
                            <div
                                key={client.id}
                                className="bg-hc-surface rounded-xl border border-hc-border p-5 flex flex-col hover:border-hc-purple/40 transition-all cursor-pointer group"
                                style={{ boxShadow: 'var(--hc-shadow)' }}
                                onClick={() => irParaDetalheCliente(client.id, client.razao_social)}
                            >
                                {/* Header do Card */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-hc-purple-dim text-hc-purple-light rounded-lg transition-colors">
                                            <Building size={20} />
                                        </div>
                                        <CertBadge validade={client.certificado_validade} />
                                    </div>

                                    {/* Ações */}
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenModal(client)}
                                            title="Editar cliente"
                                            className="p-1.5 h-auto"
                                        >
                                            <Edit2 size={15} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(client.id)}
                                            title="Excluir cliente"
                                            className="p-1.5 h-auto hover:text-hc-red hover:bg-hc-red/10"
                                        >
                                            <Trash2 size={15} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Informações da Empresa */}
                                <h3 className="font-semibold text-hc-text text-base mb-0.5 truncate group-hover:text-hc-purple transition-colors" title={client.razao_social}>
                                    {client.razao_social}
                                </h3>
                                <p className="text-xs text-hc-muted mb-4">{client.nome_fantasia || '-'}</p>

                                <div className="space-y-1.5 mt-auto">
                                    <span className="font-mono bg-hc-card border border-hc-border px-2 py-0.5 rounded text-[11px] text-hc-muted">
                                        {client.cnpj}
                                    </span>
                                    {client.cidade && (
                                        <div className="flex items-center gap-1.5 text-xs text-hc-muted">
                                            <MapPin size={12} />
                                            {client.cidade}/{client.estado}
                                        </div>
                                    )}
                                </div>

                                {/* Botão de Detalhes */}
                                <div className="mt-4 pt-4 border-t border-hc-border" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => irParaDetalheCliente(client.id, client.razao_social)}
                                        leftIcon={<FileSearch size={13} />}
                                        className="w-full justify-center"
                                    >
                                        Ver Dashboard
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-hc-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-hc-border">
                        <div className="flex justify-between items-center p-5 border-b border-hc-border sticky top-0 bg-hc-surface z-10">
                            <h3 className="text-base font-semibold font-display text-hc-text">
                                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={handleCloseModal} className="p-1.5 h-auto">
                                <X size={16} />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                            {/* Form-level message (success/error/warning) */}
                            {formMessage && (
                                <InlineAlert
                                    variant={formMessage.type === 'warning' ? 'warning' : formMessage.type === 'info' ? 'info' : formMessage.type === 'success' ? 'success' : 'error'}
                                    message={formMessage.text}
                                    onDismiss={() => setFormMessage(null)}
                                />
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-hc-text mb-1">
                                        CNPJ *
                                        {checkingCnpj && <span className="ml-2 text-xs text-gray-400">Verificando...</span>}
                                    </label>
                                    <InputMask
                                        mask="99.999.999/9999-99"
                                        {...register('cnpj', { required: true })}
                                        onBlur={handleCnpjBlur}
                                        className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-hc-text mb-1">Razão Social *</label>
                                    <input type="text" {...register('razao_social', { required: true })} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-hc-text mb-1">Nome Fantasia</label>
                                    <input type="text" {...register('nome_fantasia')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-hc-text mb-1">Regime Tributário</label>
                                    <select {...register('regime_tributario')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none">
                                        <option value="">Selecione...</option>
                                        <option value="simples_nacional">Simples Nacional</option>
                                        <option value="lucro_presumido">Lucro Presumido</option>
                                        <option value="lucro_real">Lucro Real</option>
                                    </select>
                                </div>

                                {/* Inscricoes */}
                                <div>
                                    <label className="block text-sm font-medium text-hc-text mb-1">Inscrição Estadual</label>
                                    <input type="text" {...register('inscricao_estadual')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-hc-text mb-1">Inscrição Municipal</label>
                                    <input type="text" {...register('inscricao_municipal')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-hc-text mb-1">CEP</label>
                                    <InputMask mask="99999-999" {...register('cep')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-hc-text mb-1">Cidade</label>
                                    <input type="text" {...register('cidade')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-hc-text mb-1">Estado (UF)</label>
                                    <input type="text" maxLength={2} {...register('estado')} className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none uppercase" />
                                </div>
                            </div>

                            {/* Fiscal Data & Certificate Section */}
                            <div className="col-span-2 border-t border-hc-border pt-5 mt-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="text-hc-purple" size={18} />
                                    <h4 className="text-sm font-semibold text-hc-text">
                                        Dados Fiscais e Certificado Digital
                                    </h4>
                                </div>

                                {certMessage && (
                                    <div className="mb-4">
                                        <InlineAlert
                                            variant={certMessage.type === 'success' ? 'success' : 'error'}
                                            message={certMessage.text}
                                            onDismiss={() => setCertMessage(null)}
                                        />
                                    </div>
                                )}

                                {/* Certificate Status Display (if editing existing client with certificate) */}
                                {editingClient?.certificado_validade && (
                                    <div className="mb-4 bg-hc-card border border-hc-border p-3 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <FileCheck size={16} className="text-hc-success mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-hc-text mb-1">Certificado Cadastrado</p>
                                                <p className="text-xs text-hc-muted">
                                                    Válido até: {formatDate(editingClient.certificado_validade)}
                                                </p>
                                                {editingClient.certificado_titular && (
                                                    <p className="text-xs text-hc-muted mt-0.5">
                                                        Titular: {editingClient.certificado_titular}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Certificate Upload */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Certificado Digital A1 (.pfx ou .p12)
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pfx,.p12"
                                            onChange={handleCertificateFileChange}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400"
                                        />
                                        <p className="mt-1 text-xs text-hc-muted">
                                            Certificado digital A1 para busca automática de notas fiscais. Máximo 10MB.
                                        </p>
                                    </div>

                                    {/* Senha sempre visível ou condicional ao arquivo selecionado? 
                                        O usuário pediu para ver a senha. Vamos deixar visível 
                                        mas talvez desabilitado se não tiver arquivo? 
                                        Melhor deixar visível para ele saber que precisa por. 
                                    */}
                                    <div>
                                        <label className="block text-sm font-medium text-hc-text mb-1">
                                            Senha do Certificado
                                        </label>
                                        <input
                                            type="password"
                                            value={certPassword}
                                            onChange={(e) => setCertPassword(e.target.value)}
                                            placeholder="Digite a senha do certificado"
                                            disabled={!certFile}
                                            className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <p className="mt-1 text-xs text-hc-muted">
                                            {certFile ? "A senha será validada no momento do envio." : "Selecione um arquivo .pfx ou .p12 para habilitar o campo de senha."}
                                        </p>
                                    </div>

                                    {uploadingCert && (
                                        <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                                            <Upload size={16} className="animate-pulse" />
                                            Enviando certificado...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seção CSC - Código de Segurança do Contribuinte para NFC-e */}
                            <div className="mt-2 pt-5 border-t border-hc-border">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-hc-text flex items-center gap-2">
                                        <Shield size={16} className="text-hc-info" />
                                        CSC - Código de Segurança do Contribuinte
                                    </h3>
                                    <p className="text-xs text-hc-muted mt-1">
                                        Necessário para emissão de NFC-e (Cupom Fiscal Eletrônico). Obtenha esses dados no portal da SEFAZ.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-hc-text mb-1">
                                            ID do CSC
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="999999"
                                            {...register('csc_id')}
                                            placeholder="Ex: 1"
                                            className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none"
                                        />
                                        <p className="mt-1 text-xs text-hc-muted">
                                            Identificador do CSC (número de 1 a 999999)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-hc-text mb-1">
                                            Token CSC
                                        </label>
                                        <input
                                            type="text"
                                            {...register('csc_token')}
                                            placeholder="Ex: A1B2C3D4E5F6..."
                                            className="w-full rounded-lg border-gray-300 bg-hc-surface border-hc-border text-hc-text p-2 focus:border-hc-purple outline-none"
                                        />
                                        <p className="mt-1 text-xs text-hc-muted">
                                            Token alfanumérico fornecido pela SEFAZ
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-start gap-2 p-3 bg-hc-info/8 border border-hc-info/20 rounded-lg">
                                    <AlertCircle size={15} className="text-hc-info flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-hc-text">
                                        <p className="font-medium mb-1">Importante sobre o CSC:</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-hc-muted">
                                            <li>O CSC é necessário apenas para emissão de NFC-e (Cupom Fiscal)</li>
                                            <li>Você pode configurar até 2 CSCs ativos simultâneos na SEFAZ</li>
                                            <li>Nunca compartilhe o token CSC com terceiros</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Seção Importação Automática - Email e Drive (apenas ao editar cliente) */}
                            {editingClient && (
                                <div className="mt-2 pt-5 border-t border-hc-border space-y-6">
                                    <h3 className="text-sm font-semibold text-hc-text flex items-center gap-2">
                                        <Mail size={16} className="text-hc-info" />
                                        Importação Automática de Notas
                                    </h3>
                                    <p className="text-xs text-hc-muted -mt-4">
                                        Configure o email IMAP ou Google Drive deste cliente para importar XMLs fiscais automaticamente.
                                    </p>
                                    <ConfiguracaoEmail empresaId={editingClient.id} />
                                    <ConfiguracaoDrive empresaId={editingClient.id} />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-5 border-t border-hc-border">
                                <Button type="button" variant="ghost" size="md" onClick={handleCloseModal}>Cancelar</Button>
                                <Button type="submit" variant="primary" size="md">Salvar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
