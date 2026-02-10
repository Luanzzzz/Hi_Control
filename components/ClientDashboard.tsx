import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  FileText,
  Shield,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  AlertTriangle,
  Upload,
  Bot,
  Hash,
  Download,
  Eye,
  Filter,
  Calendar
} from 'lucide-react';
import { empresaService, Empresa } from '../services/empresaService';
import { certificadoService, CertificadoStatus, CertificadoUploadResponse } from '../src/services/certificadoService';
import { botService, StatusEmpresa } from '../src/services/botService';
import { buscarNotasEmpresa, baixarXmlNota, downloadBlob } from '../src/services/notaFiscalService';
import { downloadDANFCE, downloadDACTE, downloadPDF } from '../src/services/fiscalService';
import type { NotaFiscal, TipoNotaFiscal, SituacaoNota } from '../src/types/notaFiscal';
import { CORES_TIPO_NF, CORES_SITUACAO } from '../src/types/notaFiscal';
import { fileToBase64, validateFileSize, validateFileExtension } from '../utils/fileUtils';

interface ClientDashboardProps {
  empresaId: string;
  onBack: () => void;
}

type TabType = 'notas' | 'config';

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ empresaId, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('notas');
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  // Estados da Aba Notas
  const [invoices, setInvoices] = useState<NotaFiscal[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [botStatus, setBotStatus] = useState<StatusEmpresa | null>(null);
  const [errorNotas, setErrorNotas] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TipoNotaFiscal | 'TODAS'>('TODAS');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);

  // Estados da Aba Config/Certificado
  const [certStatus, setCertStatus] = useState<CertificadoStatus | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const carregarDadosEmpresa = useCallback(async () => {
    setLoadingEmpresa(true);
    try {
      const data = await empresaService.obterPorId(empresaId);
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    } finally {
      setLoadingEmpresa(false);
    }
  }, [empresaId]);

  const carregarBotStatus = useCallback(async () => {
    try {
      const status = await botService.obterStatusEmpresa(empresaId);
      setBotStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status do bot:', error);
    }
  }, [empresaId]);

  const carregarCertStatus = useCallback(async () => {
    setLoadingCert(true);
    try {
      const status = await certificadoService.obterStatus(empresaId);
      setCertStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status do certificado:', error);
    } finally {
      setLoadingCert(false);
    }
  }, [empresaId]);

  useEffect(() => {
    carregarDadosEmpresa();
    carregarBotStatus();
    carregarCertStatus();
  }, [carregarDadosEmpresa, carregarBotStatus, carregarCertStatus]);

  const handleSearchNotas = async () => {
    if (!empresa?.cnpj) return;
    setLoadingNotas(true);
    setErrorNotas(null);
    try {
      const cnpjLimpo = empresa.cnpj.replace(/\D/g, '');
      const resultado = await buscarNotasEmpresa(empresaId, {
        cnpj: cnpjLimpo,
        nsu_inicial: 0,
        max_notas: 100
      });
      setInvoices(resultado.notas || []);
      carregarBotStatus(); // Atualizar status após busca
    } catch (err: any) {
      setErrorNotas(err.message || 'Erro ao buscar notas fiscais');
    } finally {
      setLoadingNotas(false);
    }
  };

  const handleUploadCertificado = async () => {
    if (!certFile || !certPassword) return;
    setUploadingCert(true);
    setUploadResult(null);
    try {
      const certBase64 = await fileToBase64(certFile);
      const res = await certificadoService.upload(empresaId, certBase64, certPassword);
      setUploadResult({ type: 'success', message: res.mensagem });
      setCertFile(null);
      setCertPassword('');
      carregarCertStatus();
      carregarBotStatus();
    } catch (err: any) {
      setUploadResult({ type: 'error', message: err.response?.data?.detail || err.message });
    } finally {
      setUploadingCert(false);
    }
  };

  const formatCurrency = (value: any) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  if (loadingEmpresa) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Empresa não encontrada</p>
        <button onClick={onBack} className="mt-4 text-primary-600 hover:underline flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header com Contexto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="text-primary-500" size={24} />
              {empresa.razao_social}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              CNPJ: {empresa.cnpj}
            </p>
          </div>
        </div>

        {/* Status Rápido do Bot */}
        {botStatus && (
          <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${
            botStatus.sincronizado 
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
          }`}>
            <Bot size={20} />
            <div className="text-xs">
              <p className="font-bold">{botStatus.sincronizado ? 'Bot Ativo' : 'Bot Pendente'}</p>
              <p>{botStatus.total_notas} notas capturadas</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('notas')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'notas'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Notas Fiscais
          </div>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'config'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield size={18} />
            Configurações / Certificado
          </div>
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="mt-6">
        {activeTab === 'notas' ? (
          <div className="space-y-6">
            {/* Filtros e Busca */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Número, emissor..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select 
                  className="w-full p-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                >
                  <option value="TODAS">Todas</option>
                  <option value="NFe">NF-e</option>
                  <option value="NFSe">NFS-e</option>
                  <option value="CTe">CT-e</option>
                </select>
              </div>
              <button
                onClick={handleSearchNotas}
                disabled={loadingNotas}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loadingNotas ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Sincronizar SEFAZ
              </button>
            </div>

            {/* Tabela de Notas */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Tipo</th>
                      <th className="px-6 py-4 font-medium">Número</th>
                      <th className="px-6 py-4 font-medium">Emissor</th>
                      <th className="px-6 py-4 font-medium">Valor</th>
                      <th className="px-6 py-4 font-medium">Data</th>
                      <th className="px-6 py-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {loadingNotas ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary-500" size={32} /></td></tr>
                    ) : invoices.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhuma nota encontrada. Clique em Sincronizar.</td></tr>
                    ) : (
                      invoices.map((nota) => (
                        <tr key={nota.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${CORES_TIPO_NF[nota.tipo_nf]}`}>
                              {nota.tipo_nf}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {nota.numero_nf}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {nota.nome_emitente}
                          </td>
                          <td className="px-6 py-4 font-bold text-primary-600">
                            {formatCurrency(nota.valor_total)}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(nota.data_emissao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-500" title="XML"><Download size={16} /></button>
                              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-500" title="Ver"><Eye size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* Status do Certificado */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="text-primary-500" size={20} />
                Status do Certificado A1
              </h3>
              
              {loadingCert ? (
                <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={16} /> Carregando...</div>
              ) : certStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {certStatus.status === 'valido' || certStatus.status === 'expirando_em_breve' ? (
                      <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle size={24} /></div>
                    ) : (
                      <div className="p-2 bg-red-100 text-red-600 rounded-full"><XCircle size={24} /></div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white uppercase">{certStatus.status.replace('_', ' ')}</p>
                      {certStatus.validade && (
                        <p className="text-sm text-gray-500">Válido até {new Date(certStatus.validade).toLocaleDateString('pt-BR')} ({certStatus.dias_restantes} dias restantes)</p>
                      )}
                    </div>
                  </div>
                  {certStatus.titular && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg">
                      <p><strong>Titular:</strong> {certStatus.titular}</p>
                      <p><strong>Emissor:</strong> {certStatus.emissor}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <ShieldAlert size={20} />
                  <span>Nenhum certificado cadastrado para esta empresa.</span>
                </div>
              )}
            </div>

            {/* Upload de Certificado */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-2">Atualizar Certificado</h3>
              <p className="text-sm text-gray-500 mb-6">O upload do certificado A1 ativa automaticamente a busca de notas para este cliente.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Arquivo .pfx ou .p12</label>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Senha do Certificado</label>
                  <input
                    type="password"
                    placeholder="Digite a senha..."
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-white"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                  />
                </div>
                
                {uploadResult && (
                  <div className={`p-3 rounded-lg text-sm ${uploadResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {uploadResult.message}
                  </div>
                )}

                <button
                  onClick={handleUploadCertificado}
                  disabled={!certFile || !certPassword || uploadingCert}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingCert ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                  ATIVAR ROBÔ / SALVAR CERTIFICADO
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
