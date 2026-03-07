import React, { useState } from 'react';
import { Menu, Moon, Sun, Bell, Search, Sparkles, User, LogOut, Crown, Settings } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { UserPlan } from '../types';
import { PerfilContadorModal } from './PerfilContadorModal';

interface TopBarProps {
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, isDarkMode, toggleTheme }) => {
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

    // Call Gemini Service
    const response = await generateAIResponse(aiPrompt, "O usuário está navegando no dashboard principal do Hi Control.");

    setAiResponse(response);
    setLoadingAi(false);
  };

  const handleLogout = () => {
    signOut();
    setIsProfileOpen(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Botão único de toggle do sidebar (mobile) */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
        >
          <Menu size={24} />
        </button>

        <div className="hidden md:flex items-center bg-gray-100 dark:bg-slate-700/50 rounded-lg px-3 py-2 w-64 lg:w-96">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar notas, clientes ou tarefas..."
            className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-700 dark:text-gray-200 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* AI Assistant Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`p-2 rounded-full transition-colors ${isAiOpen ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-primary-500'}`}
            title="Hi Intelligence AI"
          >
            <Sparkles size={20} />
          </button>

          {isAiOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 p-4 z-50">
              <h3 className="text-sm font-bold text-primary-600 mb-2 flex items-center gap-2">
                <Sparkles size={14} /> Hi Intelligence
              </h3>
              <div className="h-48 overflow-y-auto mb-3 bg-gray-50 dark:bg-slate-900 rounded p-3 text-sm">
                {loadingAi ? (
                  <span className="text-gray-400 animate-pulse">Pensando...</span>
                ) : aiResponse ? (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{aiResponse}</p>
                ) : (
                  <p className="text-gray-400 text-center mt-10">Como posso ajudar sua contabilidade hoje?</p>
                )}
              </div>
              <form onSubmit={handleAiSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Pergunte à IA..."
                  className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                />
                <button
                  type="submit"
                  disabled={loadingAi}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg disabled:opacity-50"
                >
                  <Sparkles size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <Bell size={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary-500 to-purple-400 flex items-center justify-center text-white font-semibold text-sm cursor-pointer ring-2 ring-white dark:ring-slate-800 shadow-md hover:ring-primary-300 transition-all"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'HC'}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
              <div className="p-4 bg-gradient-to-br from-primary-600 to-purple-500">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border-2 border-white/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User size={20} />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.name || 'Usuário'}</p>
                    <p className="text-primary-100 text-xs">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  {user?.plano === UserPlan.PREMIUM && <Crown size={14} className="text-yellow-300" />}
                  <span className="text-white text-xs font-medium">
                    Plano {user?.plano === UserPlan.PREMIUM ? 'Premium' : 'Básico'}
                  </span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setIsConfigModalOpen(true);
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium">Configurações da Contabilidade</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Perfil Contador Modal */}
      <PerfilContadorModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </header>
  );
};
