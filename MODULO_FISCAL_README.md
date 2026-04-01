# 📋 Módulo Fiscal - Hi-Control

## 🎯 Visão Geral

Módulo fiscal completo para emissão de **NFC-e** (Cupom Fiscal Eletrônico), **CT-e** (Conhecimento de Transporte Eletrônico) e **NFS-e** (Nota Fiscal de Serviço Eletrônica), integrado ao back-end da SEFAZ.

---

## 📦 Estrutura Atual (v2.1)

### Fluxo Oficial de Busca Fiscal

```
ViewState.INVOICE_SEARCH → components/InvoiceSearch.tsx   ← ENTRYPOINT OFICIAL
  ↓
  src/components/BuscadorNotas/ClienteSelector.tsx          ← seletor canônico
  src/services/certificadoService.ts                        ← GET /certificados/empresas/{id}/certificado/status
  src/services/notaFiscalService.ts → buscarNotasEmpresa()  ← POST /nfe/empresas/{id}/notas/buscar
  src/components/BuscadorNotas/FonteDadosIndicador.tsx      ← exibe cache | sefaz
```

### Arquivos por Responsabilidade

```
src/
├── types/
│   ├── fiscal.ts              # Tipos de emissão (NFC-e, CT-e, NFS-e)
│   └── notaFiscal.ts          # Tipos de busca e NF-e
├── services/
│   ├── fiscalService.ts       # Emissão: NFC-e, CT-e, NFS-e, suporte
│   ├── notaFiscalService.ts   # Busca SEFAZ/cache — fluxo oficial
│   ├── driveService.ts        # Google Drive — apoio documental (ingestão)
│   ├── certificadoService.ts  # Certificado A1 — ENDPOINT OFICIAL de status
│   └── api.ts                 # Cliente Axios centralizado
├── components/
│   ├── fiscal/
│   │   ├── AutocompleteCFOP.tsx
│   │   ├── AutocompleteNCM.tsx
│   │   ├── SeletorProdutos.tsx
│   │   └── BannerContingencia.tsx
│   ├── BuscadorNotas/         # Sub-componentes CANÔNICOS (reutilizáveis)
│   │   ├── ClienteSelector.tsx
│   │   ├── CertificadoBadge.tsx
│   │   ├── AlertaCertificado.tsx
│   │   ├── FonteDadosIndicador.tsx
│   │   └── index.tsx
│   └── BuscadorNotas.tsx      # @deprecated — não roteado; usar InvoiceSearch.tsx
└── hooks/
    ├── useBuscadorNotas.ts    # @legado — usa endpoint /nfe/empresas/{id}/certificado/status
    └── useValidacaoFiscal.ts

components/                    # Páginas roteadas via ViewState
├── InvoiceSearch.tsx          # FLUXO OFICIAL DE BUSCA
├── PDV.tsx                    # Emissão NFC-e
├── CTe.tsx                    # Emissão CT-e
├── NFSe.tsx                   # Emissão NFS-e
├── InvoiceEmitter.tsx         # Emissão NF-e (Modelo 55)
├── Invoices.tsx               # Visualização Drive (apoio)
├── ClientDashboard.tsx        # Dashboard por empresa
└── Clients.tsx                # Listagem de empresas

services/
└── empresaService.ts          # CRUD de empresas
```

### Decisão de Certificado

| Endpoint | Serviço | Contexto |
|----------|---------|----------|
| `GET /certificados/empresas/{id}/certificado/status` | `certificadoService.obterStatus()` | **Oficial** — InvoiceSearch, ClientDashboard |
| `GET /nfe/empresas/{id}/certificado/status` | `useBuscadorNotas.validarCertificado()` | Legado — só em BuscadorNotas.tsx (@deprecated) |

### Google Drive (Apoio Documental)

Drive não é o fluxo principal de busca fiscal. Acesso via:
`ViewState.SETTINGS → Configuracoes.tsx → ConfiguracaoDrive.tsx`

Funções: `buscarNotasDrive()`, `sincronizarDrive()` em `src/services/driveService.ts`

---

## 🚀 Funcionalidades Implementadas

### ✅ 1. Tipos TypeScript (`src/types/fiscal.ts`)

- **NFC-e (Modelo 65)**: `NFCeAutorizarRequest`, `ItemNFCe`, `PagamentoNFCe`
- **CT-e (Modelo 57)**: `CTeAutorizarRequest`, `ParticipanteCTe`, `CargaCTe`
- **NFS-e**: `NFSeEmitirRequest`, `TomadorNFSe`, `ServicoNFSe`
- **Suporte**: `CFOPItem`, `NCMItem`, `ValidacaoRequest`
- **Respostas SEFAZ**: `SefazResponse`, `SefazRejeicao`

### ✅ 2. Serviços de API (`src/services/fiscalService.ts`)

#### NFC-e
- `autorizarNFCe()` - Autoriza cupom fiscal
- `downloadDANFCE()` - Baixa PDF do cupom
- `atualizarCSC()` - Atualiza CSC da empresa

#### CT-e
- `autorizarCTe()` - Autoriza conhecimento de transporte
- `listarCTe()` - Lista detalhes do CT-e
- `downloadDACTE()` - Baixa PDF do CT-e

#### NFS-e
- `emitirNFSe()` - Emite nota de serviço
- `cancelarNFSe()` - Cancela nota de serviço

#### Suporte
- `buscarCFOP()` - Busca códigos fiscais
- `buscarNCM()` - Busca nomenclatura Mercosul
- `obterNumeracao()` - Obtém próxima numeração
- `validarDocumento()` - Valida pré-emissão
- `verificarContingencia()` - Status SEFAZ

#### Utilitários
- `downloadPDF()` - Download de blob
- `validarChaveAcesso()` - Valida 44 dígitos
- `formatarChaveAcesso()` - Formata visualização
- `calcularISS()` - Calcula ISS para NFS-e

### ✅ 3. Componentes Reutilizáveis

#### AutocompleteCFOP
```tsx
<AutocompleteCFOP
  value={cfop}
  onChange={(item) => setCfop(item)}
  aplicacao="saida" // ou "entrada"
  error={erro}
/>
```

**Recursos:**
- Busca com debounce (300ms)
- Filtro por tipo (entrada/saída)
- Validação de 4 dígitos
- Dropdown com resultados

#### AutocompleteNCM
```tsx
<AutocompleteNCM
  value={ncm}
  onChange={(item) => setNcm(item)}
  required={true}
  error={erro}
/>
```

**Recursos:**
- Busca com debounce
- Validação de 8 dígitos
- Formatação automática (XXXX.XX.XX)
- Exibe alíquota de IPI

#### SeletorProdutos
```tsx
<SeletorProdutos
  isOpen={modalAberto}
  onClose={() => setModalAberto(false)}
  onSelecionar={(produto) => adicionarItem(produto)}
  multiplo={true}
  onSelecionarMultiplos={(produtos) => adicionarVarios(produtos)}
/>
```

**Recursos:**
- Seleção única ou múltipla
- Busca por código, descrição ou NCM
- Exibe informações completas do produto

#### BannerContingencia
```tsx
<BannerContingencia 
  autoRefresh={true}
  refreshInterval={300000} // 5 minutos
/>
```

**Recursos:**
- Auto-refresh configurável
- Exibe tipo de contingência (EPEC, FS-DA, etc)
- Instruções para o usuário
- Botão de fechar/atualizar

### ✅ 4. Interfaces de Emissão

#### PDV - NFC-e (`components/PDV.tsx`)

**Características:**
- Interface simplificada tipo ponto de venda
- Adição manual ou importação de produtos
- Múltiplas formas de pagamento:
  - Dinheiro (01)
  - Cartão de Crédito (03)
  - Cartão de Débito (04)
  - Boleto Bancário (15)
- Cálculo automático de totais
- Validação de pagamentos
- Exibição de QR Code após autorização
- Download de DANFCE em PDF

**Fluxo:**
1. Selecionar empresa emissora
2. Adicionar itens (manual ou importar)
3. Adicionar formas de pagamento
4. Validar totais
5. Emitir cupom
6. Exibir QR Code e imprimir

#### CT-e (`components/CTe.tsx`)

**Características:**
- Formulário completo para transporte
- Tipos de serviço e CT-e
- Modalidade de frete (CIF, FOB, Terceiros, Próprio)
- 4 participantes:
  - Remetente
  - Destinatário
  - Expedidor (opcional)
  - Recebedor (opcional)
- Dados da carga (valor, peso, produto)
- Documentos vinculados (NF-e, NFC-e)
- Validação pré-emissão
- Download de DACTE em PDF

**Fluxo:**
1. Selecionar empresa (transportadora)
2. Configurar tipo de serviço
3. Preencher dados dos participantes
4. Informar dados da carga
5. Adicionar documentos vinculados
6. Validar e autorizar
7. Imprimir DACTE

#### NFS-e (`components/NFSe.tsx`)

**Características:**
- Formulário para serviços
- RPS (Recibo Provisório de Serviço)
- Dados completos do tomador
- Seleção de item LC 116/2003 (20+ itens comuns)
- Cálculo automático de ISS
- Discriminação detalhada do serviço
- Resumo financeiro em tempo real
- Código de verificação após emissão

**Fluxo:**
1. Selecionar empresa prestadora
2. Informar dados do tomador
3. Selecionar item LC 116
4. Definir valor e alíquota ISS
5. Descrever o serviço
6. Revisar resumo financeiro
7. Emitir NFS-e

### ✅ 5. Dashboard Unificado (`components/InvoiceSearch.tsx`)

**Atualizações:**
- Filtro expandido com todos os tipos:
  - NF-e (Modelo 55)
  - **NFC-e (Modelo 65)** ✨ NOVO
  - **CT-e (Modelo 57)** ✨ NOVO
  - **NFS-e** ✨ NOVO
- Botão de download de PDF específico:
  - NFC-e: Download DANFCE
  - CT-e: Download DACTE
- Badges coloridos por tipo de documento
- Ações específicas por tipo

### ✅ 6. Configuração CSC (`components/Clients.tsx`)

**Campos adicionados:**
- **CSC ID**: Identificador (1-999999)
- **CSC Token**: Token alfanumérico da SEFAZ
- Informações sobre o CSC
- Validação e dicas

**Tipos atualizados:**
```typescript
// services/empresaService.ts
interface Empresa {
  // ... campos existentes
  csc_id?: number;
  csc_token?: string;
}
```

### ✅ 7. Hook de Validação (`src/hooks/useValidacaoFiscal.ts`)

```tsx
const { validar, loading, erros, avisos } = useValidacaoFiscal();

// Validar antes de autorizar
const valido = await validar({
  tipo_documento: 'nfce',
  dados: dadosNFCe,
});

if (!valido) {
  console.log('Erros:', erros);
}
```

**Recursos:**
- Validação assíncrona
- Separação de erros e avisos
- Sugestões de correção
- Validadores de campos (CNPJ, CPF, CEP, NCM, CFOP)

---

## 🔧 Como Usar

### 1️⃣ Configurar CSC (NFC-e)

1. Acessar **Clientes/Empresas**
2. Editar empresa
3. Rolar até a seção **"CSC - Código de Segurança do Contribuinte"**
4. Preencher:
   - **ID do CSC**: número fornecido pela SEFAZ
   - **Token CSC**: token alfanumérico da SEFAZ
5. Salvar

### 2️⃣ Emitir NFC-e (Cupom Fiscal)

1. Acessar **PDV**
2. Selecionar empresa emissora
3. Adicionar itens:
   - **Manual**: preencher código, descrição, quantidade, valor
   - **Importar**: clicar em "Importar Produtos"
4. Adicionar formas de pagamento
5. Clicar em **"Emitir Cupom Fiscal"**
6. Após autorização:
   - Visualizar QR Code
   - Imprimir DANFCE

### 3️⃣ Emitir CT-e (Conhecimento de Transporte)

1. Acessar **CT-e**
2. Selecionar empresa (transportadora)
3. Configurar:
   - Tipo de serviço
   - Modalidade de frete
4. Preencher participantes (mínimo: remetente e destinatário)
5. Informar dados da carga
6. Adicionar documentos vinculados (NF-e, NFC-e)
7. Clicar em **"Autorizar CT-e"**
8. Imprimir DACTE

### 4️⃣ Emitir NFS-e (Nota de Serviço)

1. Acessar **NFS-e**
2. Selecionar empresa prestadora
3. Preencher dados do tomador (cliente)
4. Selecionar item da Lista LC 116/2003
5. Definir valor dos serviços e alíquota ISS
6. Descrever detalhadamente o serviço
7. Revisar resumo financeiro
8. Clicar em **"Emitir NFS-e"**
9. Visualizar nota emitida

### 5️⃣ Gerenciar Documentos (Dashboard)

1. Acessar **Buscar Notas**
2. Selecionar empresa
3. Filtrar por:
   - Tipo de documento
   - Data
   - Situação
4. Ações disponíveis:
   - **Visualizar**: ver detalhes
   - **Download PDF**: DANFCE (NFC-e) ou DACTE (CT-e)
   - **Download XML**: arquivo fiscal

---

## ⚙️ Configuração do Ambiente

### Variáveis de Ambiente

Adicionar em `.env`:

```env
VITE_API_URL=http://localhost:8000
```

### Ambientes SEFAZ

Os componentes estão configurados para **homologação** (`ambiente: "2"`):

```typescript
// Para produção, alterar para:
ambiente: "1"
```

**⚠️ Importante**: Testar sempre em **homologação** antes de produção!

---

## 🎨 Customização

### Cores dos Badges

Definidas em `src/types/notaFiscal.ts`:

```typescript
export const CORES_TIPO_NF: Record<TipoNotaFiscal, string> = {
  NFe: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  NFCe: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CTe: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  NFSe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
};
```

### Formas de Pagamento (NFC-e)

Adicionar em `src/types/fiscal.ts`:

```typescript
export type TipoPagamento = 
  | "01" // Dinheiro
  | "02" // Cheque
  | "03" // Cartão de Crédito
  // ... adicionar novos tipos
```

### Itens LC 116 (NFS-e)

Expandir lista em `components/NFSe.tsx`:

```typescript
const ITENS_LC116 = [
  { codigo: '01.01', descricao: 'Análise e desenvolvimento de sistemas' },
  // ... adicionar mais itens
];
```

---

## 🐛 Tratamento de Erros

### Erros da SEFAZ

O sistema extrai automaticamente:
- **Código do erro**
- **Motivo da rejeição**
- **Sugestão de correção** (quando disponível)

Exemplo:

```typescript
try {
  await autorizarNFCe(dados);
} catch (error) {
  // Erro já formatado:
  // "539: Duplicidade de NF-e
  //  Sugestão: Verifique a numeração utilizada"
}
```

### Validação Pré-Emissão

```typescript
const { validar, erros } = useValidacaoFiscal();

const valido = await validar({
  tipo_documento: 'nfce',
  dados: dadosNFCe,
});

if (!valido) {
  erros.forEach(erro => {
    console.log(`${erro.campo}: ${erro.mensagem}`);
    if (erro.correcao) {
      console.log(`💡 ${erro.correcao}`);
    }
  });
}
```

---

## 🔒 Segurança

### Boas Práticas Implementadas

1. **CSC nunca exposto**: Enviado apenas em requisições autenticadas
2. **Validação de CNPJ/CPF**: Front-end + back-end
3. **JWT automático**: Adicionado via interceptor do Axios
4. **Certificado digital**: Senha não trafega em texto puro
5. **Validação de chaves**: 44 dígitos obrigatórios

### Recomendações

- ✅ Usar HTTPS em produção
- ✅ Renovar JWT antes de expirar
- ✅ Backup de XMLs emitidos
- ✅ Monitorar logs de erro
- ✅ Testar em homologação primeiro

---

## 📊 Checklist de Implementação

### ✅ Fase 1: Tipos TypeScript
- [x] `src/types/fiscal.ts` criado
- [x] Tipos para NFC-e, CT-e, NFS-e
- [x] Tipos de suporte (CFOP, NCM, validação)

### ✅ Fase 2: Serviços de API
- [x] `src/services/fiscalService.ts` criado
- [x] Métodos para todos os endpoints
- [x] Tratamento de erros da SEFAZ
- [x] Funções utilitárias

### ✅ Fase 3: Componentes Reutilizáveis
- [x] `AutocompleteCFOP` com busca
- [x] `AutocompleteNCM` com validação
- [x] `SeletorProdutos` com modal
- [x] Campos CSC em `Clients.tsx`

### ✅ Fase 4: Interface NFC-e
- [x] `PDV.tsx` criado
- [x] Adição de itens manual/importação
- [x] Múltiplas formas de pagamento
- [x] Validação de totais
- [x] Exibição de QR Code
- [x] Download de DANFCE

### ✅ Fase 5: Interface CT-e
- [x] `CTe.tsx` criado
- [x] Formulário de participantes
- [x] Dados da carga
- [x] Documentos vinculados
- [x] Download de DACTE

### ✅ Fase 6: Interface NFS-e
- [x] `NFSe.tsx` criado
- [x] Dados do tomador
- [x] Seleção LC 116
- [x] Cálculo de ISS
- [x] Discriminação do serviço

### ✅ Fase 7: Dashboard
- [x] `InvoiceSearch.tsx` atualizado
- [x] Filtros para todos os tipos
- [x] Botões de PDF específicos
- [x] Badges coloridos

### ✅ Fase 8: Validação e Contingência
- [x] `useValidacaoFiscal.ts` criado
- [x] `BannerContingencia.tsx` criado
- [x] Validação pré-emissão
- [x] Alerta de status SEFAZ

---

## 🚧 Melhorias Futuras

### Funcionalidades Adicionais

- [ ] Cancelamento de NFC-e e CT-e
- [ ] Carta de Correção (CC-e)
- [ ] Inutilização de numeração
- [ ] Consulta de status na SEFAZ
- [ ] Manifestação do destinatário
- [ ] Download de DANFE (NF-e)
- [ ] Sincronização automática pós-contingência

### UX/UI

- [ ] Modal de visualização de detalhes
- [ ] Histórico de emissões
- [ ] Notificações em tempo real
- [ ] Modo offline (salvar rascunhos)
- [ ] Atalhos de teclado (PDV)

### Integrações

- [ ] Importação de XML de fornecedores
- [ ] Integração com ERP
- [ ] Integração com sistemas de pagamento
- [ ] Impressão térmica (cupom)

---

## 📞 Suporte

### Documentação Oficial

- **SEFAZ**: https://www.nfe.fazenda.gov.br/
- **NFC-e**: Manual de Orientação do Contribuinte
- **CT-e**: Manual de Orientação do Contribuinte
- **NFS-e**: Consultar prefeitura do município

### Códigos de Erro Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| 539 | Duplicidade de NF-e | Verificar numeração |
| 301 | Certificado vencido | Renovar certificado digital |
| 404 | Chave de acesso inválida | Verificar 44 dígitos |
| 502 | SEFAZ indisponível | Aguardar ou usar contingência |

---

## 📝 Licença

Este módulo faz parte do sistema Hi-Control e segue a mesma licença do projeto principal.

---

**Desenvolvido com ❤️ para simplificar a emissão de documentos fiscais eletrônicos.**
