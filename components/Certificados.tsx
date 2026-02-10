import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  AlertTriangle,
  Upload,
  Building,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { empresaService, Empresa } from '../services/empresaService';
import {
  certificadoService,
  CertificadoStatus,
  CertificadoUploadResponse,
} from '../src/services/certificadoService';
import { fileToBase64, validateFileSize, validateFileExtension } from '../utils/fileUtils';

// ===== Tipos internos =====

interface EmpresaComCert extends Empresa {
  certStatus?: CertificadoStatus;
  certLoading?: boolean;
}

// ===== Badge de status do certificado =====

interface CertBadgeProps {
  status?: CertificadoStatus;
  loading?: boolean;
}

const CertBadge: React.FC<CertBadgeProps> = ({ status, loading }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-xs font-medium">
        <Loader2 size={14} className="animate-spin" />
        <span>Verificando...</span>
      </span>
    );
  }

  if (!status || status.status === 'ausente') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-xs font-medium">
        <ShieldAlert size={14} />
        <span>Sem Certificado</span>
      </span>
    );
  }

  if (status.status === 'expirado') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
        <ShieldOff size={14} />
        <span>Vencido</span>
      </span>
    );
  }

  if (status.status === 'expirando_em_breve') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-medium">
        <AlertTriangle size={14} />
        <span>{status.dias_restantes}d restantes</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-medium">
      <ShieldCheck size={14} />
      <span>Ativo ({status.dias_restantes}d)</span>
    </span>
  );
};

// ===== Componente principal =====

export const Certificados: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaComCert[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    type: 'success' | 'error';
    message: string;
    data?: CertificadoUploadResponse;
  } | null>(null);

  // Carregar empresas e status dos certificados
  const carregarEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await empresaService.listar();
      const empresasComCert: EmpresaComCert[] = lista.map((e) => ({
        ...e,
        certLoading: true,
      }));
      setEmpresas(empresasComCert);

      // Buscar status do certificado para cada empresa em paralelo
      const statusPromises = lista.map(async (empresa) => {
        try {
          const status = await certificadoService.obterStatus(empresa.id);
          return { empresaId: empresa.id, status };
        } catch {
          return { empresaId: empresa.id, status: undefined };
        }
      });

      const resultados = await Promise.all(statusPromises);

      setEmpresas((prev) =>
        prev.map((e) => {
          const resultado = resultados.find((r) => r.empresaId === e.id);
          return {
            ...e,
            certStatus: resultado?.status,
            certLoading: false,
          };
        })
      );
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarEmpresas();
  }, [carregarEmpresas]);

  // Handler de upload de certificado
  const handleUpload = useCallback(async () => {
    if (!selectedEmpresa || !certFile || !certPassword) return;

    // Validar arquivo
    if (!validateFileExtension(certFile, ['.pfx', '.p12'])) {
      setUploadResult({
        type: 'error',
        message: 'Arquivo deve ser .pfx ou .p12',
      });
      return;
    }

    if (!validateFileSize(certFile, 5)) {
      setUploadResult({
        type: 'error',
        message: 'Arquivo deve ter no máximo 5MB',
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const certBase64 = await fileToBase64(certFile);
      const resultado = await certificadoService.upload(
        selectedEmpresa,
        certBase64,
        certPassword
      );

      setUploadResult({
        type: 'success',
        message: resultado.mensagem,
        data: resultado,
      });

      // Limpar formulário
      setCertFile(null);
      setCertPassword('');
      setSelectedEmpresa(null);

      // Recarregar status
      await carregarEmpresas();
    } catch (error: any) {
      setUploadResult({
        type: 'error',
        message:
          error.response?.data?.detail ||
          error.message ||
          'Erro ao fazer upload do certificado',
      });
    } finally {
      setUploading(false);
    }
  }, [selectedEmpresa, certFile, certPassword, carregarEmpresas]);

  // Renderização
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">
          Carregando certificados...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Certificados Digitais A1
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie os certificados digitais das suas empresas para emissão de notas fiscais
          </p>
        </div>
        <button
          onClick={carregarEmpresas}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {/* Alerta informativo */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-primary-600 dark:text-primary-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-300">
              Importante sobre o Certificado Digital
            </h3>
            <ul className="mt-1 text-sm text-primary-700 dark:text-primary-400 space-y-1 list-disc pl-4">
              <li>O certificado A1 (.pfx/.p12) é necessário para emissão e busca automática de notas</li>
              <li>Após o upload, o robô de busca será ativado automaticamente para a empresa</li>
              <li>O certificado é armazenado de forma criptografada com segurança</li>
              <li>Nunca compartilhe o arquivo ou senha do certificado com terceiros</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Resultado do upload */}
      {uploadResult && (
        <div
          className={`rounded-lg p-4 flex items-start gap-3 ${
            uploadResult.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          {uploadResult.type === 'success' ? (
            <CheckCircle size={20} className="text-green-600 dark:text-green-400 mt-0.5" />
          ) : (
            <XCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                uploadResult.type === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}
            >
              {uploadResult.message}
            </p>
            {uploadResult.data && (
              <div className="mt-2 text-xs text-green-700 dark:text-green-400 space-y-0.5">
                <p>Titular: {uploadResult.data.titular}</p>
                <p>Emissor: {uploadResult.data.emissor}</p>
                <p>Validade: {new Date(uploadResult.data.validade).toLocaleDateString('pt-BR')}</p>
                <p>Dias restantes: {uploadResult.data.dias_restantes}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Lista de empresas */}
      {empresas.length === 0 ? (
        <div className="text-center py-12">
          <Building size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Nenhuma empresa cadastrada
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Cadastre uma empresa primeiro na seção "Clientes"
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Cabeçalho da empresa */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Building size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {empresa.razao_social}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      CNPJ: {empresa.cnpj?.replace(
                        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                        '$1.$2.$3/$4-$5'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CertBadge
                    status={empresa.certStatus}
                    loading={empresa.certLoading}
                  />
                  <button
                    onClick={() =>
                      setSelectedEmpresa(
                        selectedEmpresa === empresa.id ? null : empresa.id
                      )
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    <Upload size={14} />
                    {selectedEmpresa === empresa.id ? 'Cancelar' : 'Upload Certificado'}
                  </button>
                </div>
              </div>

              {/* Detalhes do certificado */}
              {empresa.certStatus && empresa.certStatus.status !== 'ausente' && (
                <div className="px-5 pb-3 text-xs text-gray-500 dark:text-gray-400 flex gap-4 flex-wrap">
                  {empresa.certStatus.titular && (
                    <span>Titular: <strong>{empresa.certStatus.titular}</strong></span>
                  )}
                  {empresa.certStatus.emissor && (
                    <span>Emissor: <strong>{empresa.certStatus.emissor}</strong></span>
                  )}
                  {empresa.certStatus.validade && (
                    <span>
                      Validade:{' '}
                      <strong>
                        {new Date(empresa.certStatus.validade).toLocaleDateString('pt-BR')}
                      </strong>
                    </span>
                  )}
                </div>
              )}

              {/* Formulário de upload (expandível) */}
              {selectedEmpresa === empresa.id && (
                <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Upload de Certificado Digital A1
                  </h4>

                  {/* Input de arquivo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Arquivo do Certificado (.pfx ou .p12)
                    </label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 
                        file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                        file:text-sm file:font-medium 
                        file:bg-primary-50 file:text-primary-700 
                        dark:file:bg-primary-900/30 dark:file:text-primary-300
                        hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50
                        cursor-pointer"
                    />
                  </div>

                  {/* Input de senha */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Senha do Certificado
                    </label>
                    <input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Digite a senha do certificado..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Botão de salvar */}
                  <button
                    onClick={handleUpload}
                    disabled={!certFile || !certPassword || uploading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        Salvar Certificado
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certificados;
