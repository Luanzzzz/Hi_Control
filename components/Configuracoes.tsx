import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Building } from 'lucide-react';
import { perfilService, PerfilUpdate } from '../services/perfilService';
import { useAuth } from '../contexts/AuthContext';
import InputMask from 'react-input-mask';
import { Button, PageHeader, InlineAlert } from '../src/components/ui';

export const Configuracoes = () => {
    const { user } = useAuth();

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

    const inputClass = "w-full rounded-lg border border-hc-border bg-hc-surface text-hc-text text-sm px-3 py-2 focus:outline-none focus:border-hc-purple transition-colors";
    const labelClass = "block text-xs font-medium text-hc-text mb-1";

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <PageHeader title="Configurações da Contabilidade" />

            <div className="bg-hc-surface rounded-xl border border-hc-border p-6" style={{ boxShadow: 'var(--hc-shadow)' }}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Logo Section */}
                    <div className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b border-hc-border">
                        <div className="w-20 h-20 rounded-full bg-hc-card flex items-center justify-center overflow-hidden border-2 border-dashed border-hc-border">
                            <Building className="text-hc-muted" size={28} />
                        </div>
                        <div className="flex-1">
                            <label className={labelClass}>Logo da Empresa</label>
                            <input
                                type="text"
                                {...register('logo_url')}
                                placeholder="URL da Logo (ex: https://...)"
                                className={inputClass}
                            />
                            <p className="text-xs text-hc-muted mt-1">Cole a URL da sua logo (recomendado: 200x200px)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Nome da Empresa Contábil</label>
                            <input
                                type="text"
                                {...register('nome_empresa', { required: 'Nome é obrigatório' })}
                                className={inputClass}
                            />
                            {errors.nome_empresa && (
                                <span className="text-hc-red text-xs mt-1">{errors.nome_empresa.message}</span>
                            )}
                        </div>

                        <div>
                            <label className={labelClass}>CNPJ</label>
                            <InputMask
                                mask="99.999.999/9999-99"
                                {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                                className={inputClass}
                            />
                            {errors.cnpj && (
                                <span className="text-hc-red text-xs mt-1">{errors.cnpj.message}</span>
                            )}
                        </div>
                    </div>

                    {message && (
                        <InlineAlert
                            variant={message.type}
                            message={message.text}
                            onDismiss={() => setMessage(null)}
                        />
                    )}

                    <div className="flex justify-end pt-2 border-t border-hc-border">
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            loading={loading}
                            leftIcon={<Save size={15} />}
                        >
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
