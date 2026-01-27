import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { Plus, Search, Edit2, Trash2, X, Building, MapPin, Phone, Mail, Shield, Upload, FileCheck, AlertCircle } from 'lucide-react';
import { empresaService, Empresa, EmpresaCreate } from '../services/empresaService';
import { fileToBase64, validateFileSize, validateFileExtension } from '../utils/fileUtils';
import { formatDate } from '../utils/dateUtils';

export const Clients = () => {
    const [clients, setClients] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Empresa | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Certificate state
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');
    const [uploadingCert, setUploadingCert] = useState(false);
    const [certMessage, setCertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const token = localStorage.getItem('token') || '';

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EmpresaCreate>();

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const data = await empresaService.listar(token);
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
        // Clear certificate fields
        setCertFile(null);
        setCertPassword('');
        setCertMessage(null);
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
            await empresaService.uploadCertificado(empresaId, certBase64, certPassword, token);
            setCertMessage({ type: 'success', text: 'Certificado enviado com sucesso!' });
        } catch (error: any) {
            setCertMessage({ type: 'error', text: error.message });
            throw error; // Re-throw to handle in onSubmit
        } finally {
            setUploadingCert(false);
        }
    };

    const onSubmit = async (data: EmpresaCreate) => {
        try {
            let empresaId: string;

            // 1. Save/update client first
            if (editingClient) {
                await empresaService.atualizar(editingClient.id, data, token);
                empresaId = editingClient.id;
            } else {
                const newClient = await empresaService.criar(data, token);
                empresaId = newClient.id;
            }

            // 2. Upload certificate if provided
            if (certFile && certPassword) {
                try {
                    await handleCertificateUpload(empresaId);
                } catch (certError) {
                    console.error("Erro ao fazer upload do certificado:", certError);
                    // Don't block client save if certificate upload fails
                    alert("Cliente salvo, mas houve erro ao enviar o certificado. Tente novamente.");
                }
            }

            handleCloseModal();
            loadClients();
        } catch (error) {
            console.error("Erro ao salvar cliente", error);
            alert("Erro ao salvar cliente.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este cliente?")) {
            try {
                await empresaService.deletar(id, token);
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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão de Clientes</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por Razão Social ou CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Carregando...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClients.map(client => (
                            <div key={client.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                                        <Building size={24} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(client)} className="text-gray-400 hover:text-blue-500 transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(client.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 truncate" title={client.razao_social}>{client.razao_social}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{client.nome_fantasia || '-'}</p>

                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">CNPJ: {client.cnpj}</span>
                                    </div>
                                    {client.cidade && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <MapPin size={14} />
                                            {client.cidade}/{client.estado}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ *</label>
                                    <InputMask mask="99.999.999/9999-99" {...register('cnpj', { required: true })} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razão Social *</label>
                                    <input type="text" {...register('razao_social', { required: true })} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Fantasia</label>
                                    <input type="text" {...register('nome_fantasia')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Regime Tributário</label>
                                    <select {...register('regime_tributario')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2">
                                        <option value="">Selecione...</option>
                                        <option value="simples_nacional">Simples Nacional</option>
                                        <option value="lucro_presumido">Lucro Presumido</option>
                                        <option value="lucro_real">Lucro Real</option>
                                    </select>
                                </div>

                                {/* Inscricoes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inscrição Estadual</label>
                                    <input type="text" {...register('inscricao_estadual')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inscrição Municipal</label>
                                    <input type="text" {...register('inscricao_municipal')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                                    <InputMask mask="99999-999" {...register('cep')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                                    <input type="text" {...register('cidade')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado (UF)</label>
                                    <input type="text" maxLength={2} {...register('estado')} className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 uppercase" />
                                </div>
                            </div>

                            {/* Fiscal Data & Certificate Section */}
                            <div className="col-span-2 border-t border-gray-200 dark:border-slate-700 pt-6 mt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="text-primary-600" size={20} />
                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                                        Dados Fiscais e Certificado Digital
                                    </h4>
                                </div>

                                {certMessage && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm ${certMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                                        {certMessage.text}
                                    </div>
                                )}

                                {/* Certificate Status Display (if editing existing client with certificate) */}
                                {editingClient?.certificado_validade && (
                                    <div className="mb-4 bg-gray-50 dark:bg-slate-900 p-3 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <FileCheck size={18} className="text-green-600 dark:text-green-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                    Certificado Cadastrado
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Válido até: {formatDate(editingClient.certificado_validade)}
                                                </p>
                                                {editingClient.certificado_titular && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
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
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Certificado digital A1 para busca automática de notas fiscais. Máximo 10MB.
                                        </p>
                                    </div>

                                    {/* Senha sempre visível ou condicional ao arquivo selecionado? 
                                        O usuário pediu para ver a senha. Vamos deixar visível 
                                        mas talvez desabilitado se não tiver arquivo? 
                                        Melhor deixar visível para ele saber que precisa por. 
                                    */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Senha do Certificado
                                        </label>
                                        <input
                                            type="password"
                                            value={certPassword}
                                            onChange={(e) => setCertPassword(e.target.value)}
                                            placeholder="Digite a senha do certificado"
                                            disabled={!certFile}
                                            className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-700">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
