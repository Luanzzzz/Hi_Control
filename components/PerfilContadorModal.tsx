import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { X, Building, Upload, FileCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  perfilContadorService,
  PerfilContador,
  PerfilContadorUpdate,
} from '../services/perfilContadorService';
import { fileToBase64, fileToBase64WithPrefix, validateFileSize, validateFileExtension } from '../utils/fileUtils';
import { formatDate, calculateDaysRemaining } from '../utils/dateUtils';

interface PerfilContadorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerfilContadorModal: React.FC<PerfilContadorModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [loadingCert, setLoadingCert] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [certMessage, setCertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Certificate state
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certStatus, setCertStatus] = useState<any>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PerfilContadorUpdate>();

  // Load profile data on mount
  useEffect(() => {
    if (isOpen) {
      loadPerfil();
      loadCertificateStatus();
    }
  }, [isOpen]);

  const loadPerfil = async () => {
    try {
      const perfil = await perfilContadorService.obterPerfil();
      setValue('razao_social', perfil.razao_social || '');
      setValue('cnpj', perfil.cnpj || '');
      setValue('inscricao_estadual', perfil.inscricao_estadual || '');

      if (perfil.logo_url) {
        setLogoPreview(perfil.logo_url);
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadCertificateStatus = async () => {
    try {
      const status = await perfilContadorService.verificarStatusCertificado();
      setCertStatus(status);
    } catch (error: any) {
      console.error('Erro ao carregar status do certificado:', error);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!validateFileExtension(file, ['.png', '.jpg', '.jpeg', '.svg'])) {
      setMessage({ type: 'error', text: 'Formato inválido. Use PNG, JPG ou SVG.' });
      return;
    }

    if (!validateFileSize(file, 5)) { // 5MB limit
      setMessage({ type: 'error', text: 'Arquivo muito grande. Máximo: 5MB.' });
      return;
    }

    setLogoFile(file);

    // Create preview
    const preview = await fileToBase64WithPrefix(file);
    setLogoPreview(preview);
  };

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const onSubmit = async (data: PerfilContadorUpdate) => {
    setLoading(true);
    setMessage(null);

    try {
      // 1. Update profile data
      await perfilContadorService.atualizarPerfil(data);

      // 2. Upload logo if changed
      if (logoFile) {
        const logoBase64 = await fileToBase64WithPrefix(logoFile);
        await perfilContadorService.uploadLogo(logoBase64);
      }

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCertificateUpload = async () => {
    if (!certFile || !certPassword) {
      setCertMessage({ type: 'error', text: 'Selecione o certificado e informe a senha.' });
      return;
    }

    setLoadingCert(true);
    setCertMessage(null);

    try {
      const certBase64 = await fileToBase64(certFile);
      const result = await perfilContadorService.uploadCertificado(certBase64, certPassword);

      setCertMessage({ type: 'success', text: result.mensagem });

      // Reload certificate status
      await loadCertificateStatus();

      // Clear form
      setCertFile(null);
      setCertPassword('');

      // Clear file input
      const fileInput = document.getElementById('cert-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      setCertMessage({ type: 'error', text: error.message });
    } finally {
      setLoadingCert(false);
    }
  };

  const getCertificateStatusBadge = () => {
    if (!certStatus) return null;

    const { status, dias_restantes } = certStatus;

    const badges = {
      valido: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        icon: <CheckCircle size={16} />,
        label: 'Válido'
      },
      expirando_em_breve: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: <Clock size={16} />,
        label: `Expira em ${dias_restantes} dias`
      },
      expirado: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        icon: <AlertCircle size={16} />,
        label: 'Expirado'
      },
      ausente: {
        bg: 'bg-gray-100 dark:bg-slate-700',
        text: 'text-gray-600 dark:text-gray-400',
        icon: <AlertCircle size={16} />,
        label: 'Não cadastrado'
      }
    };

    const badge = badges[status as keyof typeof badges];

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${badge.bg} ${badge.text} text-sm font-medium`}>
        {badge.icon}
        {badge.label}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
              <Building size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Configuração da conta
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          {/* Section 1: Firm Data */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Dados da Firma
            </h4>

            {message && (
              <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  {...register('razao_social')}
                  className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2"
                  placeholder="Nome da firma de contabilidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CNPJ
                </label>
                <InputMask
                  mask="99.999.999/9999-99"
                  {...register('cnpj')}
                  className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  {...register('inscricao_estadual')}
                  className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2"
                  placeholder="123.456.789.012"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo da Firma
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-20 h-20 rounded-lg border-2 border-gray-200 dark:border-slate-600 overflow-hidden flex items-center justify-center bg-white">
                      <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg"
                      onChange={handleLogoChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG ou SVG. Máximo 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Salvando...' : 'Salvar Dados'}
              </button>
            </div>
          </div>

          {/* Section 2: Digital Certificate */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Certificado Digital A1
            </h4>

            {certMessage && (
              <div className={`mb-4 p-3 rounded-lg ${certMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                {certMessage.text}
              </div>
            )}

            {/* Certificate Status (if exists) */}
            {certStatus && certStatus.status !== 'ausente' && (
              <div className="mb-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Status do Certificado
                    </p>
                    {getCertificateStatusBadge()}
                  </div>
                  <FileCheck size={24} className="text-gray-400" />
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Validade:</strong> {certStatus.validade ? formatDate(certStatus.validade) : '-'}</p>
                  {certStatus.titular && <p><strong>Titular:</strong> {certStatus.titular}</p>}
                  {certStatus.emissor && <p><strong>Emissor:</strong> {certStatus.emissor}</p>}
                </div>
                {certStatus.requer_atencao && (
                  <p className="mt-3 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {certStatus.alerta}
                  </p>
                )}
              </div>
            )}

            {/* Certificate Upload */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Arquivo do Certificado (.pfx ou .p12)
                </label>
                <input
                  id="cert-file-input"
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handleCertFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Certificado digital A1 no formato .pfx ou .p12. Máximo 10MB.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha do Certificado
                </label>
                <input
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Digite a senha do certificado"
                  className="w-full rounded-lg border-gray-300 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A senha não será armazenada. Você precisará fornecê-la novamente ao emitir notas.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCertificateUpload}
                  disabled={loadingCert || !certFile || !certPassword}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload size={18} />
                  {loadingCert ? 'Enviando...' : 'Fazer Upload do Certificado'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
