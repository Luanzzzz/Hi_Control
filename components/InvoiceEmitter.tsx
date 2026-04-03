import React, { useState, useEffect } from 'react';
import {
  Building2,
  Package,
  Send,
  Trash2,
  Plus,
  Lock,
  MapPin,
  Check,
} from 'lucide-react';
import api from '../src/services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, PageHeader, InlineAlert } from '../src/components/ui';

// Interface de Produto/Serviço
interface InvoiceItem {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Empresa {
  id: string;
  razao_social: string;
  cnpj: string;
}

type EmissaoStatus = 'idle' | 'loading' | 'success' | 'error';

const fieldClass =
  'w-full px-3.5 py-2.5 bg-hc-surface border border-hc-border rounded-lg text-hc-text text-sm focus:outline-none focus:border-hc-purple transition-colors';
const labelClass = 'block text-xs font-medium text-hc-muted mb-1.5';

export const InvoiceEmitter: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [status, setStatus] = useState<EmissaoStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // Identificação da nota
  const [numeroNf, setNumeroNf] = useState('');
  const [serie, setSerie] = useState('1');

  // Certificado digital (nunca persiste)
  const [certificadoSenha, setCertificadoSenha] = useState('');

  // Dados do destinatário
  const [destinatarioCnpj, setDestinatarioCnpj] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioLogradouro, setDestinatarioLogradouro] = useState('');
  const [destinatarioNumero, setDestinatarioNumero] = useState('');
  const [destinatarioBairro, setDestinatarioBairro] = useState('');
  const [destinatarioCep, setDestinatarioCep] = useState('');
  const [destinatarioCidade, setDestinatarioCidade] = useState('');
  const [destinatarioUf, setDestinatarioUf] = useState('');
  const [naturezaOperacao, setNaturezaOperacao] = useState('Venda de mercadoria');

  // Novo item
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    codigo: '',
    descricao: '',
    quantidade: 1,
    valorUnitario: 0,
  });

  // Carregar empresas disponíveis
  useEffect(() => {
    api.get<Empresa[]>('/empresas')
      .then((res) => {
        setEmpresas(res.data);
        if (res.data.length > 0) setEmpresaId(res.data[0].id);
      })
      .catch(() => setEmpresas([]));
  }, []);

  const addItem = () => {
    if (!newItem.descricao || !newItem.quantidade || !newItem.valorUnitario) return;

    const item: InvoiceItem = {
      id: Date.now().toString(),
      codigo: newItem.codigo || `ITEM-${items.length + 1}`,
      descricao: newItem.descricao,
      quantidade: newItem.quantidade,
      valorUnitario: newItem.valorUnitario,
      valorTotal: newItem.quantidade * newItem.valorUnitario,
    };

    setItems([...items, item]);
    setNewItem({ codigo: '', descricao: '', quantidade: 1, valorUnitario: 0 });
    setShowAddItem(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.valorTotal, 0);
    return { subtotal };
  };

  const { subtotal } = calculateTotals();

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleEmitir = async () => {
    if (!empresaId) {
      setStatus('error');
      setStatusMsg('Selecione uma empresa emitente.');
      return;
    }
    if (!certificadoSenha) {
      setStatus('error');
      setStatusMsg('Informe a senha do certificado digital.');
      return;
    }
    if (!numeroNf) {
      setStatus('error');
      setStatusMsg('Informe o número da nota fiscal.');
      return;
    }
    if (items.length === 0) {
      setStatus('error');
      setStatusMsg('Adicione pelo menos um produto/serviço.');
      return;
    }

    setStatus('loading');
    setStatusMsg('');

    try {
      const cnpjCpfLimpo = destinatarioCnpj.replace(/\D/g, '');
      const isCpf = cnpjCpfLimpo.length === 11;

      const payload = {
        empresa_id: empresaId,
        certificado_senha: certificadoSenha,
        numero_nf: numeroNf,
        serie: serie,
        modelo: '55',
        tipo_operacao: '1', // Saída
        data_emissao: new Date().toISOString(),
        ambiente: '2', // homologação
        natureza_operacao: naturezaOperacao,
        destinatario: {
          [isCpf ? 'cpf' : 'cnpj']: cnpjCpfLimpo,
          nome: destinatarioNome,
          logradouro: destinatarioLogradouro,
          numero: destinatarioNumero,
          bairro: destinatarioBairro,
          municipio: destinatarioCidade,
          uf: destinatarioUf.toUpperCase(),
          cep: destinatarioCep.replace(/\D/g, ''),
        },
        itens: items.map((item, idx) => ({
          numero_item: idx + 1,
          codigo_produto: item.codigo,
          descricao: item.descricao,
          ncm: '00000000',
          cfop: '5102',
          unidade_comercial: 'UN',
          quantidade_comercial: item.quantidade,
          valor_unitario_comercial: item.valorUnitario,
          valor_total_bruto: item.valorTotal,
          icms: {
            origem: '0',
            cst: '00',
            base_calculo: item.valorTotal,
            aliquota: 12,
            valor: parseFloat((item.valorTotal * 0.12).toFixed(2)),
          },
          pis: { cst: '07', base_calculo: 0, aliquota: 0, valor: 0 },
          cofins: { cst: '07', base_calculo: 0, aliquota: 0, valor: 0 },
        })),
        transporte: { modalidade_frete: 9 },
      };

      await api.post('/nfe/autorizar', payload);
      setStatus('success');
      setStatusMsg('NF-e enviada para autorização com sucesso!');
      setItems([]);
      setDestinatarioCnpj('');
      setDestinatarioNome('');
      setNumeroNf('');
      setCertificadoSenha('');
      setDestinatarioLogradouro('');
      setDestinatarioNumero('');
      setDestinatarioBairro('');
      setDestinatarioCep('');
      setDestinatarioCidade('');
      setDestinatarioUf('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setStatus('error');
      setStatusMsg(
        e.response?.data?.detail ?? 'Erro ao emitir NF-e. Verifique os dados e tente novamente.'
      );
    }
  };

  const checks = [
    { label: 'Empresa selecionada', ok: !!empresaId },
    { label: 'Certificado informado', ok: !!certificadoSenha },
    { label: 'Destinatário preenchido', ok: !!destinatarioCnpj && !!destinatarioNome },
    { label: 'Ao menos um item', ok: items.length > 0 },
  ];
  const allReady = checks.every((c) => c.ok);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Emissão NF-e"
        subtitle="Modelo 55 — Autorização SEFAZ"
      />

      {(status === 'success' || status === 'error') && (
        <InlineAlert
          variant={status === 'success' ? 'success' : 'error'}
          message={statusMsg}
          onDismiss={() => setStatus('idle')}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Formulário ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Seção 1 — Identificação */}
          <div className="bg-hc-surface rounded-xl border border-hc-border p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-hc-border">
              <Building2 size={15} className="text-hc-purple shrink-0" />
              <h2 className="text-sm font-semibold text-hc-text">Identificação da Nota</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Empresa Emitente</label>
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className={fieldClass}
                >
                  {empresas.length === 0 && (
                    <option value="">Nenhuma empresa cadastrada</option>
                  )}
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.razao_social} — {e.cnpj}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Nº da NF-e</label>
                  <input
                    type="text"
                    placeholder="Ex: 1"
                    value={numeroNf}
                    onChange={(e) => setNumeroNf(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Série</label>
                  <input
                    type="text"
                    placeholder="1"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Natureza da Operação</label>
                  <input
                    type="text"
                    value={naturezaOperacao}
                    onChange={(e) => setNaturezaOperacao(e.target.value)}
                    className={fieldClass}
                    placeholder="Ex: Venda de mercadoria"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2 — Certificado */}
          <div className="bg-hc-surface rounded-xl border border-hc-border p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-hc-border">
              <Lock size={15} className="text-hc-purple shrink-0" />
              <h2 className="text-sm font-semibold text-hc-text">Certificado Digital</h2>
            </div>

            <div>
              <label className={labelClass}>Senha do Certificado A1</label>
              <input
                type="password"
                placeholder="Senha do certificado digital"
                value={certificadoSenha}
                onChange={(e) => setCertificadoSenha(e.target.value)}
                className={fieldClass}
                autoComplete="off"
              />
              <p className="text-xs text-hc-muted mt-1.5">
                A senha não é armazenada — é usada exclusivamente para assinar esta nota.
              </p>
            </div>
          </div>

          {/* Seção 3 — Destinatário + Endereço */}
          <div className="bg-hc-surface rounded-xl border border-hc-border p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-hc-border">
              <MapPin size={15} className="text-hc-purple shrink-0" />
              <h2 className="text-sm font-semibold text-hc-text">Destinatário</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                    value={destinatarioCnpj}
                    onChange={(e) => setDestinatarioCnpj(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Razão Social / Nome</label>
                  <input
                    type="text"
                    placeholder="Nome ou Razão Social"
                    value={destinatarioNome}
                    onChange={(e) => setDestinatarioNome(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-hc-border">
                <p className="text-xs font-medium text-hc-muted mb-3">Endereço</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Logradouro</label>
                    <input
                      type="text"
                      placeholder="Rua, Avenida, etc."
                      value={destinatarioLogradouro}
                      onChange={(e) => setDestinatarioLogradouro(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Número</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={destinatarioNumero}
                        onChange={(e) => setDestinatarioNumero(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bairro</label>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={destinatarioBairro}
                        onChange={(e) => setDestinatarioBairro(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>CEP</label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={destinatarioCep}
                        onChange={(e) => setDestinatarioCep(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Município</label>
                      <input
                        type="text"
                        placeholder="São Paulo"
                        value={destinatarioCidade}
                        onChange={(e) => setDestinatarioCidade(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>UF</label>
                      <input
                        type="text"
                        placeholder="SP"
                        maxLength={2}
                        value={destinatarioUf}
                        onChange={(e) => setDestinatarioUf(e.target.value.toUpperCase())}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 4 — Itens */}
          <div className="bg-hc-surface rounded-xl border border-hc-border p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-hc-border">
              <Package size={15} className="text-hc-purple shrink-0" />
              <h2 className="text-sm font-semibold text-hc-text">Produtos / Serviços</h2>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus size={13} />}
                onClick={() => setShowAddItem(true)}
                className="ml-auto"
              >
                Adicionar
              </Button>
            </div>

            {showAddItem && (
              <div className="mb-4 p-4 bg-hc-card rounded-lg border border-hc-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Descrição <span className="text-hc-red">*</span></label>
                    <input
                      type="text"
                      placeholder="Descrição do produto ou serviço"
                      value={newItem.descricao}
                      onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                      className={fieldClass}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Código (SKU)</label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={newItem.codigo}
                      onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Quantidade <span className="text-hc-red">*</span></label>
                      <input
                        type="number"
                        min="1"
                        value={newItem.quantidade}
                        onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Valor unitário <span className="text-hc-red">*</span></label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.valorUnitario}
                        onChange={(e) => setNewItem({ ...newItem, valorUnitario: Number(e.target.value) })}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hc-border">
                  {newItem.quantidade && newItem.valorUnitario ? (
                    <span className="text-xs text-hc-muted mr-auto">
                      Total: {formatCurrency((newItem.quantidade ?? 0) * (newItem.valorUnitario ?? 0))}
                    </span>
                  ) : <span className="mr-auto" />}
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowAddItem(false);
                    setNewItem({ codigo: '', descricao: '', quantidade: 1, valorUnitario: 0 });
                  }}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="primary" onClick={addItem}>
                    Confirmar Item
                  </Button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-hc-muted">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum item adicionado</p>
              </div>
            ) : (
              <div className="divide-y divide-hc-border">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="w-5 h-5 rounded-full bg-hc-card border border-hc-border text-hc-muted text-[11px] font-medium flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-hc-text truncate">{item.descricao}</p>
                      <p className="text-xs text-hc-muted mt-0.5">
                        {item.quantidade}× {formatCurrency(item.valorUnitario)}
                        <span className="mx-1.5 text-hc-border">|</span>
                        <span className="font-medium text-hc-text">{formatCurrency(item.valorTotal)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-hc-muted hover:text-hc-red hover:bg-hc-red/10 rounded-lg transition-colors shrink-0"
                      aria-label="Remover item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="pt-3 flex justify-end">
                  <span className="text-xs text-hc-muted">
                    Subtotal:{' '}
                    <span className="font-semibold text-hc-text">{formatCurrency(subtotal)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">

            {/* Totais */}
            <div className="bg-hc-surface rounded-xl border border-hc-border p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-hc-muted">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                <span className="text-xs font-medium text-hc-muted">NF-e Modelo 55</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-hc-border">
                <span className="text-sm font-semibold text-hc-text">Total</span>
                <span className="text-xl font-bold text-hc-purple">{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-hc-amber/10 text-hc-amber border border-hc-amber/25 rounded text-xs font-medium">
                  Homologação
                </span>
                <span className="px-2 py-0.5 bg-hc-purple-dim text-hc-purple border border-hc-purple/20 rounded text-xs font-medium">
                  Saída — Modelo 55
                </span>
              </div>
            </div>

            {/* Checklist de prontidão */}
            <div className="bg-hc-surface rounded-xl border border-hc-border p-5" style={{ boxShadow: 'var(--hc-shadow)' }}>
              <h3 className="text-xs font-semibold text-hc-muted uppercase tracking-wide mb-3">
                Pré-emissão
              </h3>
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2.5 text-xs">
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        c.ok
                          ? 'bg-hc-green/15 border-hc-green/40 text-hc-green'
                          : 'bg-hc-card border-hc-border text-transparent'
                      }`}
                    >
                      <Check size={9} strokeWidth={3} />
                    </span>
                    <span className={c.ok ? 'text-hc-text' : 'text-hc-muted'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Aviso + Botão */}
            <div className="bg-hc-amber/8 rounded-xl border border-hc-amber/25 p-4">
              <p className="text-xs text-hc-amber leading-relaxed">
                Revise todos os campos antes de emitir. Após autorização pela SEFAZ a nota não pode ser cancelada imediatamente.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              leftIcon={<Send size={15} />}
              loading={status === 'loading'}
              disabled={!allReady || status === 'loading'}
              onClick={handleEmitir}
              className="w-full"
            >
              {status === 'loading' ? 'Enviando...' : 'Emitir NF-e'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
