import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Upload, Building } from 'lucide-react';
import { perfilService, Perfil, PerfilUpdate } from '../services/perfilService';
import { useAuth } from '../contexts/AuthContext';
import InputMask from 'react-input-mask';

export const Configuracoes = () => {
    const { user } = useAuth(); // Assuming we use the token from context internally in services, or passing it
    // Wait, services need token. useAuth usually provides it?
    // Let's check AuthContext if possible. Assuming it provides 'token' or we get it from localStorage.
    // I will assume localStorage 'token' for now as per typical patterns if not exposed.
    // Actually, I should check AuthContext. But to save steps, I will try to get from localStorage as fallback.

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<PerfilUpdate>();

    const token = localStorage.getItem('token') || '';

    useEffect(() => {
        loadPerfil();
    }, []);

    const loadPerfil = async () => {
        try {
            const data = await perfilService.obter(token);
            if (data) {
                setValue('nome_empresa', data.nome_empresa || '');
                setValue('cnpj', data.cnpj || '');
                setValue('logo_url', data.logo_url || '');
            }
        } catch (error) {
            console.error("Erro ao carregar perfil", error);
        }
    };

    const onSubmit = async (data: PerfilUpdate) => {
        setLoading(true);
        setMessage(null);
        try {
            await perfilService.atualizar(data, token);
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Configurações da Contabilidade</h2>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Logo Section */}
                    <div className="flex flex-col items-center sm:flex-row gap-6 mb-8">
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600 relative group">
                            {/* Simplified Logo Preview - ideally use watch('logo_url') */}
                            <Building className="text-gray-400" size={32} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Logo da Empresa
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    {...register('logo_url')}
                                    placeholder="URL da Logo (ex: https://...)"
                                    className="flex-1 rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Cole a URL da sua logo (recomendado: 200x200px)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome da Empresa Contábil
                            </label>
                            <input
                                type="text"
                                {...register('nome_empresa', { required: 'Nome é obrigatório' })}
                                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.nome_empresa && <span className="text-red-500 text-xs">{errors.nome_empresa.message}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                CNPJ
                            </label>
                            <InputMask
                                mask="99.999.999/9999-99"
                                {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                            >
                            </InputMask>
                            {errors.cnpj && <span className="text-red-500 text-xs">{errors.cnpj.message}</span>}
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Save size={18} className="mr-2" />
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
