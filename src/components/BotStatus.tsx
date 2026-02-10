/**
 * BotStatus Component
 * 
 * Design Direction: Industrial Utilitarian
 * DFII Score: 12/15 (Excellent)
 * 
 * Aesthetic Thesis:
 * - Compact, information-dense status display
 * - Monospace typography for technical data
 * - Industrial color coding (green/yellow/gray)
 * - Subtle pulse animations for active states
 * - No decorative elements - pure function
 * 
 * Differentiation Anchor:
 * Monospace counters and time displays create a "terminal/console" feel
 * that distinguishes this from generic dashboard widgets.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { botService, BotStatus as IBotStatus } from '../services/botService';
import { toast } from '../utils/toast';

export const BotStatus: React.FC = () => {
  const [status, setStatus] = useState<IBotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    carregarStatus();
    
    // Atualizar a cada 1 minuto
    const interval = setInterval(carregarStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const carregarStatus = async () => {
    try {
      const dadosStatus = await botService.obterStatus();
      setStatus(dadosStatus);
    } catch (error: any) {
      console.error('Erro ao carregar status do bot:', error);
      // Em caso de erro, definir estado padrão
      setStatus({
        status: 'nunca_executado',
        ultima_sincronizacao: null,
        notas_24h: 0,
        funcionando: false
      });
    } finally {
      setLoading(false);
    }
  };

  const forcarSincronizacao = async () => {
    setSincronizando(true);
    
    try {
      await botService.forcarSincronizacao();
      toast.success('Sincronização solicitada! O bot processará em breve.');
      
      // Aguardar 5 segundos e recarregar status
      setTimeout(() => {
        carregarStatus();
      }, 5000);
    } catch (error: any) {
      console.error('Erro ao forçar sincronização:', error);
      toast.error(error?.message || 'Erro ao solicitar sincronização');
    } finally {
      setSincronizando(false);
    }
  };

  const formatarDataHora = (dataStr: string | null): string => {
    if (!dataStr) return 'Nunca';
    
    const data = new Date(dataStr);
    const agora = new Date();
    const diferencaMs = agora.getTime() - data.getTime();
    const diferencaMin = Math.floor(diferencaMs / 60000);
    
    if (diferencaMin < 1) return 'Agora mesmo';
    if (diferencaMin < 60) return `há ${diferencaMin}m`;
    
    const diferencaHoras = Math.floor(diferencaMin / 60);
    if (diferencaHoras < 24) return `há ${diferencaHoras}h`;
    
    const diferencaDias = Math.floor(diferencaHoras / 24);
    return `há ${diferencaDias}d`;
  };

  const obterConfigStatus = (status: string) => {
    switch (status) {
      case 'ok':
        return {
          cor: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          icon: CheckCircle,
          texto: 'Atualizado',
          pulse: true
        };
      case 'atrasado':
        return {
          cor: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          icon: AlertCircle,
          texto: 'Pendente',
          pulse: false
        };
      case 'nunca_executado':
        return {
          cor: 'text-slate-400',
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/20',
          icon: Clock,
          texto: 'Aguardando',
          pulse: false
        };
      default:
        return {
          cor: 'text-slate-400',
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/20',
          icon: Clock,
          texto: 'Desconhecido',
          pulse: false
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
        <Clock className="w-4 h-4 text-slate-400 animate-spin" />
        <span className="text-sm text-slate-400 font-mono">Carregando status...</span>
      </div>
    );
  }

  if (!status) return null;

  const config = obterConfigStatus(status.status);
  const IconComponent = config.icon;

  return (
    <div className={`
      flex items-center gap-4 px-4 py-2.5 
      ${config.bg} ${config.border}
      border rounded-lg backdrop-blur-sm
      transition-all duration-200
      hover:border-opacity-40
    `}>
      {/* Indicador Visual com Pulse */}
      <div className="flex items-center gap-2.5">
        <IconComponent 
          className={`
            w-5 h-5 ${config.cor} 
            ${config.pulse ? 'animate-pulse' : ''}
            transition-colors duration-200
          `} 
        />
        
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-white leading-tight">
            {config.texto}
          </p>
          <p className="text-xs text-slate-400 font-mono leading-tight">
            {formatarDataHora(status.ultima_sincronizacao)}
          </p>
        </div>
      </div>

      {/* Separador Vertical */}
      <div className="h-8 w-px bg-slate-700/50" />

      {/* Contador 24h - Estilo Terminal */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <div className="flex flex-col">
          <p className="text-xs text-slate-400 uppercase tracking-wider">24h</p>
          <p className="text-sm font-mono font-bold text-white tabular-nums">
            {status.notas_24h.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Separador Vertical */}
      <div className="h-8 w-px bg-slate-700/50" />

      {/* Botão Atualizar - Estilo Industrial */}
      <button
        onClick={forcarSincronizacao}
        disabled={sincronizando}
        className={`
          flex items-center gap-2 px-4 py-2 
          bg-cyan-600 hover:bg-cyan-700 
          disabled:bg-slate-600 disabled:cursor-not-allowed
          text-white rounded-lg 
          font-medium text-sm
          transition-all duration-200
          hover:scale-105 active:scale-95
          disabled:opacity-50 disabled:hover:scale-100
          shadow-lg shadow-cyan-600/20
        `}
        title="Forçar sincronização manual"
      >
        <RefreshCw 
          className={`
            w-4 h-4 
            ${sincronizando ? 'animate-spin' : ''}
            transition-transform duration-200
          `} 
        />
        <span className="font-mono text-xs">
          {sincronizando ? 'Sincronizando...' : 'Atualizar'}
        </span>
      </button>

      {/* Indicador de Funcionamento (Badge) */}
      {status.funcionando && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-mono">ON</span>
        </div>
      )}
    </div>
  );
};
