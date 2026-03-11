# 📝 Changelog - Módulo Fiscal Hi-Control

## [v2.0.0] - 2026-02-09

### 🎉 Funcionalidades Novas

#### ✅ NFC-e - Cupom Fiscal Eletrônico (Modelo 65)
- **Tela PDV**: Interface completa de ponto de venda
  - Adição manual de itens
  - Importação de produtos cadastrados
  - Múltiplas formas de pagamento (Dinheiro, Crédito, Débito, Boleto)
  - Validação automática de totais
  - Exibição de QR Code após autorização
  - Download de DANFCE em PDF

#### ✅ CT-e - Conhecimento de Transporte Eletrônico (Modelo 57)
- **Tela CT-e**: Formulário completo para emissão de CT-e
  - Tipos de serviço (Normal, Subcontratação, Redespacho)
  - Modalidade de frete (CIF, FOB, Terceiros, Próprio)
  - 4 participantes (Remetente, Destinatário, Expedidor, Recebedor)
  - Dados da carga (valor, peso, produto predominante)
  - Vinculação de documentos (NF-e, NFC-e)
  - Download de DACTE em PDF

#### ✅ NFS-e - Nota Fiscal de Serviço Eletrônica
- **Tela NFS-e**: Emissão de notas de serviço
  - RPS (Recibo Provisório de Serviço)
  - Dados completos do tomador
  - Seleção de item LC 116/2003 (20+ itens comuns)
  - Cálculo automático de ISS
  - Discriminação detalhada do serviço
  - Resumo financeiro em tempo real
  - Link de visualização após emissão

### 🛠️ Componentes Reutilizáveis

#### AutocompleteCFOP
- Busca com debounce (300ms)
- Filtro por tipo (entrada/saída)
- Validação de 4 dígitos
- Dropdown responsivo

#### AutocompleteNCM
- Busca com debounce
- Validação de 8 dígitos
- Formatação automática (XXXX.XX.XX)
- Exibe alíquota de IPI

#### SeletorProdutos
- Modal de seleção de produtos
- Seleção única ou múltipla
- Busca por código, descrição ou NCM
- Integração com `fiscalService`

#### BannerContingencia
- Alerta de contingência SEFAZ
- Auto-refresh configurável (5 min padrão)
- Exibe tipo de contingência (EPEC, FS-DA, etc)
- Versão compacta para páginas internas

### 📊 Dashboard Atualizado

#### InvoiceSearch (Buscador de Notas)
- Filtros expandidos:
  - **NF-e** (Modelo 55)
  - **NFC-e** (Modelo 65) ✨ NOVO
  - **CT-e** (Modelo 57) ✨ NOVO
  - **NFS-e** ✨ NOVO
- Botões de download específicos:
  - NFC-e: Download DANFCE (PDF)
  - CT-e: Download DACTE (PDF)
- Badges coloridos por tipo de documento
- Suporte mobile otimizado

### 🔧 Infraestrutura

#### Tipos TypeScript (`src/types/fiscal.ts`)
- `NFCeAutorizarRequest`, `ItemNFCe`, `PagamentoNFCe`
- `CTeAutorizarRequest`, `ParticipanteCTe`, `CargaCTe`
- `NFSeEmitirRequest`, `TomadorNFSe`, `ServicoNFSe`
- `CFOPItem`, `NCMItem`, `ProdutoCadastrado`
- `SefazResponse`, `SefazRejeicao`, `ValidacaoRequest`
- Tipos de ambiente, pagamento e frete

#### Serviços de API (`src/services/fiscalService.ts`)
- **NFC-e**: `autorizarNFCe()`, `downloadDANFCE()`, `atualizarCSC()`
- **CT-e**: `autorizarCTe()`, `listarCTe()`, `downloadDACTE()`
- **NFS-e**: `emitirNFSe()`, `cancelarNFSe()`
- **Suporte**: `buscarCFOP()`, `buscarNCM()`, `buscarProdutos()`, `validarDocumento()`, `verificarContingencia()`
- **Utilitários**: `downloadPDF()`, `validarChaveAcesso()`, `formatarChaveAcesso()`, `calcularISS()`
- Tratamento de erros SEFAZ (extração de `motivo`, `correcao`)

#### Hook de Validação (`src/hooks/useValidacaoFiscal.ts`)
- `useValidacaoFiscal()`: Validação pré-emissão
- `useErrosFormatados()`: Formatação de erros com sugestões
- `useCampoValidacao()`: Validadores de campos (CNPJ, CPF, CEP, NCM, CFOP)

### 🔐 Configuração de Empresas

#### Campos CSC (`components/Clients.tsx`)
- **csc_id**: Identificador do CSC (1-999999)
- **csc_token**: Token alfanumérico da SEFAZ
- Seção dedicada com informações e dicas
- Validação e segurança implementadas

#### Tipos de Empresa (`services/empresaService.ts`)
- Interface `Empresa` atualizada
- Interface `EmpresaCreate` atualizada
- Suporte a campos opcionais `csc_id` e `csc_token`

### 🎨 Interface

#### Navegação (`App.tsx`, `Sidebar.tsx`)
- **Novos ViewStates**: `PDV`, `CTE`, `NFSE`
- Submódulos organizados em "Notas Fiscais":
  - NF-e (Modelo 55)
  - NFC-e (Cupom Fiscal) ✨ NOVO
  - CT-e (Transporte) ✨ NOVO
  - NFS-e (Serviços) ✨ NOVO
  - Consultar Notas
- Ícones específicos (ShoppingCart, Truck, Briefcase)
- Acesso de prioridade 1 para todos os módulos fiscais

### 📖 Documentação

- **MODULO_FISCAL_README.md**: Guia completo de uso
  - Visão geral e estrutura
  - Como usar cada funcionalidade
  - Exemplos de código
  - Customização e configuração
  - Tratamento de erros
  - Checklist de implementação
  - Melhorias futuras

### 🐛 Correções

- ✅ Validação de pagamentos no PDV
- ✅ Formatação de chaves de acesso (44 dígitos)
- ✅ Tratamento de erros específicos da SEFAZ
- ✅ Debounce em autocompletes para evitar requisições excessivas
- ✅ Dark mode em todos os novos componentes

### 🔄 Melhorias Técnicas

- ✅ TypeScript estrito em todos os arquivos
- ✅ Componentização e reutilização de código
- ✅ Barrel exports (`src/components/fiscal/index.ts`)
- ✅ Validação de formulários com React Hook Form
- ✅ Máscaras de input (react-input-mask)
- ✅ Interceptor Axios para JWT automático
- ✅ Download de blobs (PDF/XML)
- ✅ Responsividade mobile-first

### 📦 Dependências

Nenhuma nova dependência foi adicionada. O módulo utiliza as bibliotecas já presentes:
- `react-hook-form`: Gerenciamento de formulários
- `react-input-mask`: Máscaras de input
- `lucide-react`: Ícones
- `axios`: Cliente HTTP

### 🚀 Deploy

- ✅ Sem quebra de código existente (NF-e Modelo 55 intacto)
- ✅ Compatível com ambiente de homologação SEFAZ
- ✅ Pronto para ambiente de produção (alterar `ambiente: "1"`)

### ⚠️ Notas Importantes

1. **CSC obrigatório para NFC-e**: Configure na tela de Clientes
2. **Testar em homologação**: Use `ambiente: "2"` antes de produção
3. **Certificado digital**: Necessário para emissão de CT-e
4. **Validação pré-emissão**: Recomendada antes de autorizar
5. **Backup de XMLs**: Mantenha cópias de segurança

### 🔜 Próximas Funcionalidades

- [ ] Cancelamento de NFC-e e CT-e
- [ ] Carta de Correção (CC-e)
- [ ] Inutilização de numeração
- [ ] Consulta de status na SEFAZ
- [ ] Manifestação do destinatário
- [ ] Download de DANFE (NF-e)
- [ ] Sincronização automática pós-contingência
- [ ] Modal de visualização de detalhes
- [ ] Histórico de emissões
- [ ] Notificações em tempo real
- [ ] Impressão térmica (cupom)

---

## [v1.0.0] - Anterior

### Funcionalidades Existentes (Mantidas)

- ✅ NF-e (Modelo 55) - Emissão completa
- ✅ Dashboard com métricas
- ✅ Buscador de notas (base)
- ✅ Cadastro de empresas
- ✅ Gestão de certificados digitais
- ✅ Integração com WhatsApp
- ✅ Sistema de tarefas
- ✅ Autenticação JWT
- ✅ Dark mode
- ✅ Planos (Básico/Premium)

---

**Desenvolvido com ❤️ pela equipe Hi-Control**
