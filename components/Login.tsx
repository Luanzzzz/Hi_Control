import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
    const { signIn, loading, error } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signIn(email, password);
        } catch (err) {
            // Error is handled by AuthContext
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Lado Esquerdo - Formulário */}
            <div className="w-full lg:w-1/2 bg-slate-900 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <img
                                src="/logo_png.png"
                                alt="Hi Control Logo"
                                className="w-16 h-16 object-cover rounded-lg"
                            />
                            <h1 className="text-4xl font-bold text-primary-500">
                                Control
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm">Sistema de Gestão Contábil</p>
                    </div>

                    {/* Card de Boas-vindas */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta!</h2>
                        <p className="text-slate-400 text-sm">
                            Entre com suas credenciais para acessar o sistema
                        </p>
                    </div>

                    {/* Mensagem de Erro */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
                            <AlertCircle className="text-red-500 shrink-0" size={20} />
                            <p className="text-red-400 text-sm">
                                {String(error || 'Ocorreu um erro inesperado.')}
                            </p>
                        </div>
                    )}

                    {/* Formulário */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Campo E-mail */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Campo Senha */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Botão Acessar */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Entrando...
                                </>
                            ) : (
                                'Acessar Conta'
                            )}
                        </button>
                    </form>

                    {/* Rodapé */}
                    <div className="text-center">
                        <p className="text-slate-500 text-sm">
                            © 2026 Hi Control - Gestão Contábil Inteligente
                        </p>
                    </div>
                </div>
            </div>

            {/* Lado Direito - Marketing/Destaque */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-900 relative overflow-hidden items-center justify-center p-12">
                {/* Efeitos de Fundo */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-primary-400 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
                </div>

                {/* Padrão de Pontos */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                ></div>

                {/* Conteúdo */}
                <div className="relative z-10 max-w-lg text-center space-y-8">
                    {/* Logo Grande */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <img
                                src="/logo-h-white.jpg"
                                alt="Hi Control Logo"
                                className="relative w-40 h-40 object-contain rounded-3xl shadow-2xl transform transition duration-500 hover:scale-105"
                            />
                        </div>
                    </div>

                    {/* Texto Principal */}
                    <div className="space-y-4">
                        <h1 className="text-5xl font-bold text-white leading-tight">
                            Gerencie sua contabilidade com{' '}
                            <span className="text-primary-200">inteligência</span> e{' '}
                            <span className="text-primary-200">controle</span>
                        </h1>
                        <p className="text-primary-100 text-lg">
                            Emita notas fiscais, gerencie clientes, acompanhe tarefas e muito mais em uma única plataforma moderna.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { emoji: '📊', text: 'Dashboards' },
                            { emoji: '📝', text: 'NF-e' },
                            { emoji: '💬', text: 'WhatsApp' },
                            { emoji: '✅', text: 'Tarefas' },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/20 transition-all"
                            >
                                <div className="text-3xl mb-2">{feature.emoji}</div>
                                <div className="text-white font-medium">{feature.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
