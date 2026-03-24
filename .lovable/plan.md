


# Análise Comparativa: ERP AviZee V2 (GitHub) vs. Projeto Atual (Lovable)

## Contexto

O repositório `erp-avizeev2` no GitHub usa uma arquitetura diferente (Express + Prisma + React monorepo na Vercel), enquanto o projeto atual usa React + Supabase (Lovable Cloud). A comparação foca em **funcionalidades e entidades** que existem na V2 e que estão ausentes ou incompletas no projeto atual.

---

## Sprint 1 — ✅ CONCLUÍDO

### 1.1 Parcelamento financeiro ✅
- Campo `documento_pai_id` adicionado na tabela `financeiro_lancamentos`
- UI de geração automática de parcelas no modal de criação (nº parcelas + intervalo em dias)
- Parcelas geradas com `parcela_numero`, `parcela_total` e `documento_pai_id`

### 1.2 Estorno de NF confirmada ✅
- Botão "Estornar Nota Fiscal" no drawer de NF confirmada
- Reversão automática de movimentos de estoque (cria movimentos inversos)
- Cancelamento automático de lançamentos financeiros vinculados
- Reversão de faturamento da OV vinculada (se aplicável)
- Confirmação antes do estorno

### 1.3 Relatório de Aging ✅
- Novo tipo de relatório "Aging" em Relatórios
- Agrupa títulos abertos/vencidos por faixas: A vencer, 1-30, 31-60, 61-90, 90+ dias
- Gráfico de barras por faixa de vencimento
- Exportável em CSV, PDF e Excel

### 1.4 Importação de XML de NF-e ✅
- Botão "Importar XML" na tela Fiscal
- Parser client-side completo de XML de NF-e (`src/lib/nfeXmlParser.ts`)
- Extrai: número, série, chave, emitente, itens com impostos, totais
- Auto-vincula fornecedor por CNPJ
- Auto-vincula produtos por código interno/SKU (De-Para)
- Preenche formulário automaticamente com dados do XML

---

## Sprint 2 — PENDENTE (Estrutural, alta complexidade)

| # | Item | Status | Descrição |
|---|------|--------|-----------|
| 2.1 | Depósitos e estoque por depósito | Pendente | Tabelas `depositos` + `estoque_saldos`, migração do campo estoque_atual |
| 2.2 | Transferência entre depósitos | Pendente | CRUD + movimentação automática |
| 2.3 | Inventário físico | Pendente | Recontagem, divergência, ajuste automático |
| 2.4 | Reserva de estoque em OV | Pendente | Campo `quantidade_reservada`, validação de disponibilidade |

## Sprint 3 — PENDENTE (Refinamento)

| # | Item | Status | Descrição |
|---|------|--------|-----------|
| 3.1 | Solicitação de Compra | Pendente | Fluxo: Solicitação > Cotação > Pedido |
| 3.2 | Recebimento de Compra | Pendente | Registro formal com impacto em estoque |
| 3.3 | Centro de Custo e Natureza Financeira | Pendente | Cadastros + vínculo no financeiro |
| 3.4 | Permissões granulares | Pendente | Tabela de permissões por perfil/módulo/ação |
| 3.5 | Rastreabilidade inline | Pendente | Campos usuario_criacao/modificacao nas tabelas |
