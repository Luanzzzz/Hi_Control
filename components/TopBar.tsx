import React, { useState } from 'react';
import { Moon, Sun, Bell, Search, Sparkles, User, LogOut, Crown, Settings } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { UserPlan } from '../types';
import { PerfilContadorModal } from './PerfilContadorModal';

interface TopBarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isDarkMode, toggleTheme }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const { user, signOut } = useAuth();

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setLoadingAi(true);
    setAiResponse('');

    const response = await generateAIResponse(aiPrompt, "O usuário está navegando no dashboard principal do Hi Control.");

    setAiResponse(response);
    setLoadingAi(false);
  };

  const handleLogout = () => {
    signOut();
    setIsProfileOpen(false);
  };

  return (
    <header className="h-14 bg-hc-surface border-b border-hc-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10" style={{ boxShadow: 'var(--hc-shadow-sm)' }}>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center bg-hc-card border border-hc-border rounded-lg px-3 py-1.5 w-64 lg:w-80 gap-2">
          <Search size={15} className="text-hc-muted shrink-0" />
          <input
            type="text"
            placeholder="Buscar notas, clientes..."
            className="bg-transparent border-none focus:outline-none text-sm w-full text-hc-text placeholder:text-hc-muted"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* AI Assistant */}
        <div className="relative">
          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`p-2 rounded-lg transition-colors ${isAiOpen ? 'bg-hc-purple-dim text-hc-purple-light' : 'hover:bg-hc-hover text-hc-muted hover:text-hc-text'}`}
            title="Hi Intelligence AI"
            aria-label="Hi Intelligence"
          >
            <Sparkles size={18} />
          </button>

          {isAiOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-hc-surface rounded-xl border border-hc-border p-4 z-50" style={{ boxShadow: 'var(--hc-shadow-md)' }}>
              <h3 className="text-xs font-semibold text-hc-purple mb-2 flex items-center gap-1.5">
                <Sparkles size={13} /> Hi Intelligence
              </h3>
              <div className="h-44 overflow-y-auto mb-3 bg-hc-card rounded-lg p-3 text-sm">
                {loadingAi ? (
                  <span className="text-hc-muted animate-pulse text-xs">Pensando...</span>
                ) : aiResponse ? (
                  <p className="text-hc-text text-xs whitespace-pre-line">{aiResponse}</p>
                ) : (
                  <p className="text-hc-muted text-xs text-center mt-8">Como posso ajudar sua contabilidade hoje?</p>
                )}
              </div>
              <form onSubmit={handleAiSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Pergunte à IA..."
                  className="flex-1 text-xs rounded-lg border border-hc-border bg-hc-surface px-3 py-2 focus:border-hc-purple outline-none text-hc-text placeholder:text-hc-muted transition-colors"
                />
                <button
                  type="submit"
                  disabled={loadingAi}
                  className="bg-hc-purple hover:bg-hc-purple/90 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Sparkles size={14} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-hc-hover text-hc-muted hover:text-hc-text transition-colors"
          aria-label={isDarkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-hc-hover text-hc-muted hover:text-hc-text transition-colors"
          aria-label="Notificações"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-hc-red rounded-full border border-hc-surface" />
        </button>

        {/* User Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-7 w-7 rounded-full bg-gradient-to-tr from-hc-purple to-primary-400 flex items-center justify-center text-white font-semibold text-xs cursor-pointer ring-2 ring-hc-surface hover:ring-hc-purple/50 transition-all"
            aria-label="Perfil do usuário"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'HC'}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-hc-surface rounded-xl border border-hc-border overflow-hidden z-50" style={{ boxShadow: 'var(--hc-shadow-md)' }}>
              <div className="p-4 bg-gradient-to-br from-hc-purple to-primary-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base border border-white/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{user?.name || 'Usuário'}</p>
                    <p className="text-white/70 text-xs">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-full">
                  {user?.plano === UserPlan.PREMIUM && <Crown size={12} className="text-yellow-300" />}
                  <span className="text-white text-[11px] font-medium">
                    Plano {user?.plano === UserPlan.PREMIUM ? 'Premium' : 'Básico'}
                  </span>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { setIsConfigModalOpen(true); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-hc-text hover:bg-hc-hover rounded-lg transition-colors text-sm"
                >
                  <Settings size={16} className="text-hc-muted" />
                  Configurações
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-hc-text hover:bg-hc-red/10 hover:text-hc-red rounded-lg transition-colors text-sm"
                >
                  <LogOut size={16} className="text-hc-muted" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PerfilContadorModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </header>
  );
};
