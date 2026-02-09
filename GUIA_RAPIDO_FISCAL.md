# 🚀 Guia Rápido - Módulo Fiscal

## ⏱️ Início Rápido (5 minutos)

### 1. Configurar CSC (NFC-e)

**Tempo: 2 minutos**

1. Acessar **"Clientes"** no menu lateral
2. Clicar em **"Editar"** na empresa desejada
3. Rolar até a seção **"CSC - Código de Segurança do Contribuinte"**
4. Preencher:
   - **ID do CSC**: Ex: `1`
   - **Token CSC**: Ex: `A1B2C3D4E5F6...` (fornecido pela SEFAZ)
5. Clicar em **"Salvar"**

> ⚠️ **Importante**: O CSC é obrigatório para emitir NFC-e (cupom fiscal).

---

### 2. Emitir Primeiro Cupom Fiscal (NFC-e)

**Tempo: 3 minutos**

1. Acessar **"Notas Fiscais" > "NFC-e (Cupom Fiscal)"** no menu
2. Selecionar a empresa emissora
3. **Adicionar itens**:
   - Opção A: Clicar em **"Importar Produtos"** e selecionar produtos cadastrados
   - Opção B: Preencher manualmente:
     - Código do produto: `001`
     - Descrição: `Produto Teste`
     - NCM: `85176290` (use o autocomplete)
     - CFOP: `5102` (use o autocomplete)
     - Quantidade: `1`
     - Valor unitário: `10.00`
     - Clicar em **"Adicionar Item"**
4. **Adicionar pagamento**:
   - Tipo: `Dinheiro`
   - Valor: `10.00`
   - Clicar em **"Adicionar Pagamento"**
5. Clicar em **"Emitir Cupom Fiscal"**
6. **Após autorização**:
   - Visualizar QR Code
   - Clicar em **"Imprimir DANFCE"** para baixar PDF

> 💡 **Dica**: O sistema valida automaticamente se o total dos pagamentos corresponde ao valor total dos itens.

---

## 📋 Checklists por Tipo de Documento

### ✅ Checklist NFC-e (Cupom Fiscal)

- [ ] Empresa configurada com CSC válido
- [ ] Pelo menos 1 item adicionado
- [ ] Total de pagamentos = Total dos itens
- [ ] CFOP válido (entrada ou saída)
- [ ] NCM válido (8 dígitos)
- [ ] Ambiente configurado (1=Produção, 2=Homologação)

### ✅ Checklist CT-e (Transporte)

- [ ] Empresa (transportadora) selecionada
- [ ] Tipo de serviço definido
- [ ] Modalidade de frete selecionada
- [ ] Remetente preenchido (mínimo)
- [ ] Destinatário preenchido (mínimo)
- [ ] Dados da carga:
  - [ ] Valor da carga (R$)
  - [ ] Peso bruto (kg)
  - [ ] Produto predominante
- [ ] Código IBGE dos municípios (7 dígitos)

### ✅ Checklist NFS-e (Serviços)

- [ ] Empresa prestadora selecionada
- [ ] Tomador preenchido completamente
- [ ] Item LC 116/2003 selecionado
- [ ] Valor dos serviços informado
- [ ] Alíquota ISS definida (padrão: 5%)
- [ ] Discriminação do serviço (mínimo 10 caracteres)
- [ ] Código IBGE do município (7 dígitos)

---

## 🎯 Casos de Uso Comuns

### Caso 1: Emitir Cupom em Sequência (Loja)

```
1. Acesso rápido: Menu > Notas Fiscais > NFC-e
2. Empresa já selecionada (salva automaticamente)
3. Importar produtos do catálogo
4. Adicionar pagamento
5. Emitir
6. Mostrar QR Code ao cliente
7. [Opcional] Imprimir DANFCE
8. Tela limpa automaticamente para próxima venda
```

### Caso 2: Emitir CT-e para Entrega

```
1. Acesso: Menu > Notas Fiscais > CT-e
2. Selecionar transportadora
3. Preencher remetente (quem envia)
4. Preencher destinatário (quem recebe)
5. Informar dados da carga
6. [Opcional] Vincular NF-e dos produtos transportados
7. Emitir
8. Imprimir DACTE
```

### Caso 3: Emitir NFS-e para Consultoria

```
1. Acesso: Menu > Notas Fiscais > NFS-e
2. Preencher dados do cliente (tomador)
3. Selecionar serviço: Ex: "17.01 - Assessoria ou consultoria"
4. Valor: R$ 1.000,00
5. Alíquota ISS: 5%
6. Discriminação:
   "Serviços de consultoria em gestão empresarial prestados
    no mês de fevereiro/2026 conforme contrato nº 001/2026"
7. Emitir
8. Enviar link de visualização ao cliente
```

---

## 🔍 Consultar Documentos Emitidos

**Localização**: Menu > Notas Fiscais > Consultar Notas

### Filtros Disponíveis

- **Empresa**: Selecionar empresa
- **Tipo de Documento**:
  - Todos os Tipos
  - NF-e (Modelo 55)
  - NFC-e (Modelo 65 - Cupom)
  - CT-e (Modelo 57 - Transporte)
  - NFS-e (Serviço)
- **Situação**: Todas, Autorizada, Cancelada, Rejeitada
- **Data**: De/Até

### Ações por Documento

| Tipo | Visualizar | PDF | XML |
|------|------------|-----|-----|
| NF-e | ✅ | ⏳ Futuro | ✅ |
| NFC-e | ✅ | ✅ DANFCE | ✅ |
| CT-e | ✅ | ✅ DACTE | ✅ |
| NFS-e | ✅ | ⏳ Prefeitura | ❌ |

---

## ⚠️ Troubleshooting

### Problema: "CSC não configurado"

**Solução:**
1. Ir em Clientes
2. Editar empresa
3. Preencher seção "CSC"
4. Salvar

---

### Problema: "Chave de acesso inválida"

**Causa**: Chave não possui 44 dígitos

**Solução:**
- Verificar se a chave foi copiada corretamente
- Remover espaços e caracteres especiais
- Exemplo válido: `35260212345678901234550010000000011234567890`

---

### Problema: "Erro 539 - Duplicidade de NF-e"

**Causa**: Número/série já utilizado

**Solução:**
1. Acessar Clientes > Editar empresa
2. Verificar "Última Nota Fiscal" e "Última Série"
3. Sistema incrementa automaticamente, mas pode ter dessincronia
4. Ajustar numeração manualmente se necessário

---

### Problema: "Certificado vencido ou inválido"

**Solução:**
1. Renovar certificado digital (A1 ou A3)
2. Acessar Clientes > Editar empresa
3. Fazer upload do novo certificado
4. Informar nova senha

---

### Problema: "SEFAZ indisponível"

**Solução:**
1. Verificar banner de contingência no topo da tela
2. Aguardar normalização (geralmente minutos)
3. Se urgente, documentos serão emitidos em contingência automaticamente
4. Após normalização, sincronização é automática

---

## 🎨 Dicas de UX

### Dark Mode

O sistema detecta automaticamente a preferência do navegador e aplica o tema escuro/claro.

**Trocar tema manualmente**: Botão no canto superior direito

---

### Atalhos de Teclado (PDV)

> 🚧 **Em desenvolvimento**

- `F2`: Adicionar item
- `F3`: Importar produtos
- `F5`: Adicionar pagamento
- `F10`: Emitir cupom

---

### Autocompletes Inteligentes

**CFOP**: Digite `5` para vendas ou `1` para compras
- Ex: `5102` → Venda de mercadoria
- Ex: `1102` → Compra de mercadoria

**NCM**: Digite os primeiros dígitos
- Ex: `8517` → Aparelhos telefônicos
- Formatação automática: `8517.62.90`

---

## 📱 Mobile

Todas as telas são **responsivas** e funcionam em:
- ✅ Desktop (1920x1080+)
- ✅ Tablet (768x1024)
- ✅ Smartphone (375x667)

> 💡 **Recomendação**: Para emissão de CT-e, use desktop pela quantidade de campos.

---

## 🔐 Segurança

### Boas Práticas

1. ✅ **HTTPS obrigatório em produção**
2. ✅ **Não compartilhar CSC Token**
3. ✅ **Renovar certificado antes do vencimento**
4. ✅ **Backup semanal de XMLs**
5. ✅ **Testar sempre em homologação primeiro**

### Ambientes SEFAZ

- **Homologação** (padrão): `ambiente: "2"`
- **Produção**: `ambiente: "1"`

> ⚠️ **Importante**: Alterar para produção apenas após testes completos!

---

## 📞 Suporte

### Recursos

- **README completo**: `MODULO_FISCAL_README.md`
- **Changelog**: `CHANGELOG_FISCAL.md`
- **Documentação SEFAZ**: https://www.nfe.fazenda.gov.br/

### Códigos de Erro Comuns

| Código | Problema | Solução |
|--------|----------|---------|
| 301 | Certificado vencido | Renovar certificado |
| 404 | Chave inválida | Verificar 44 dígitos |
| 502 | SEFAZ offline | Aguardar ou contingência |
| 539 | Número duplicado | Verificar numeração |

---

## ✅ Próximos Passos

1. ✅ Configurar CSC
2. ✅ Emitir NFC-e de teste (homologação)
3. ✅ Emitir CT-e de teste (homologação)
4. ✅ Emitir NFS-e de teste
5. ✅ Consultar documentos emitidos
6. 🔄 Testar cancelamento (quando disponível)
7. 🔄 Migrar para produção

---

**Pronto para começar! 🚀**
