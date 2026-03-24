

# Análise Comparativa: ERP AviZee V2 (GitHub) vs. Projeto Atual (Lovable)

## Contexto

O repositório `erp-avizeev2` no GitHub usa uma arquitetura diferente (Express + Prisma + React monorepo na Vercel), enquanto o projeto atual usa React + Supabase (Lovable Cloud). A comparação foca em **funcionalidades e entidades** que existem na V2 e que estão ausentes ou incompletas no projeto atual.

---

## Funcionalidades presentes na V2 que FALTAM no projeto atual

### 1. Entidades de dados ausentes

| Entidade V2 | Existe aqui? | O que falta |
|---|---|---|
| **Filial** | Nao | V2 suporta multi-filial (empresa > filiais > depósitos). Aqui temos apenas `empresa_config` única |
| **Deposito** | Nao | V2 tem depósitos vinculados a filiais, com estoque por depósito (`EstoqueSaldo` = produto + depósito). Aqui estoque é único por produto |
| **CentroCusto** | Nao | Classificação financeira por centro de custo. V2 vincula CP/CR a centros de custo |
| **NaturezaFinanceira** | Nao | Classificação receita/despesa com código e tipo. V2 vincula a CP/CR |
| **SolicitacaoCompra** | Nao | Fluxo completo: Solicitação > Cotação > Pedido > Recebimento. Aqui temos apenas Cotações e Compras diretas |
| **RecebimentoCompra** | Nao | Registro formal de recebimento com depósito destino e impacto em estoque. Aqui a entrada é via NF ou manual |
| **TransferenciaEstoque** | Nao | Transferência entre depósitos com itens e movimentação automática |
| **Inventario / InventarioItem** | Nao | Módulo de inventário físico: recontagem, divergência e ajuste automático |
| **PedidoVenda** (entidade separada) | Parcial | V2 tem Orcamento > PedidoVenda > OrdemVenda como 3 entidades. Aqui temos Orcamento > OrdemVenda (2 etapas) |
| **Permissao** (granular) | Parcial | V2 tem tabela de permissões por perfil/módulo/ação. Aqui temos roles simples (admin, vendedor, financeiro, estoquista) |

### 2. Funcionalidades de lógica de negócio ausentes

| Funcionalidade V2 | Status aqui |
|---|---|
| **Reserva de estoque** ao colocar OV em separação | Nao implementado |
| **Estorno automático de estoque** ao cancelar NF confirmada | Nao implementado |
| **Parcelamento financeiro** com geração automática de N parcelas | Nao implementado (campo parcela existe mas sem lógica de geração) |
| **Estorno de baixa financeira** (reverter pagamento parcial/total) | Nao implementado |
| **Travas de integridade** (bloqueio de cancelamento com documentos sucessores) | Nao implementado |
| **Importação de XML de NF-e** com parser estruturado | Nao implementado (fiscal é controle interno) |
| **De-Para de produtos no XML** (sugestão de vínculo) | Nao implementado |
| **Relatório de Aging** (faixas de vencimento) | Nao implementado |
| **Saldo reservado vs saldo disponível** no estoque | Nao implementado |

### 3. Campos presentes na V2 e ausentes aqui

- `usuario_criacao_id` e `usuario_ultima_modificacao_id` em todas as entidades (rastreabilidade inline)
- `xml_url` e `pdf_url` em notas fiscais
- `enviado_email` e `data_envio_email` em notas fiscais
- `saldo_inicial` em contas bancárias
- `documento_pai_id` em CP/CR (agrupamento de parcelas)
- `quantidade_reservada` no estoque

---

## Plano de Implementação (o que podemos fazer aqui)

### Sprint 1 -- Alto valor, complexidade moderada

**1.1 Parcelamento financeiro**
- Adicionar lógica de geração automática de parcelas ao criar lançamento financeiro
- Campos `parcela_numero` e `parcela_total` já existem na tabela
- Adicionar campo `documento_pai_id` para agrupamento
- UI: opção de "Gerar parcelas" no modal de criação com número de parcelas e intervalo

**1.2 Estorno de NF confirmada**
- Ao cancelar NF com status "confirmada", reverter automaticamente:
  - Movimentos de estoque gerados pela confirmação
  - Lançamentos financeiros vinculados
- Adicionar validação e confirmação antes do estorno

**1.3 Relatório de Aging**
- Novo tipo de relatório em `Relatorios.tsx`
- Agrupar contas a pagar/receber por faixas de vencimento (a vencer, 1-30 dias, 31-60, 61-90, 90+)
- Filtros por tipo (pagar/receber) e período

**1.4 Importação de XML de NF-e**
- Botão "Importar XML" na tela Fiscal
- Parser client-side de XML de NF-e (DOMParser no browser)
- Preencher automaticamente dados da NF (número, série, chave, fornecedor, itens com impostos)
- Sugestão de vínculo produto por código/descrição (De-Para)

### Sprint 2 -- Estrutural, alta complexidade

**2.1 Depósitos e estoque por depósito**
- Nova tabela `depositos` (codigo, nome, ativo)
- Nova tabela `estoque_saldos` (produto_id, deposito_id, quantidade_atual, quantidade_reservada)
- Migrar estoque atual de campo no produto para tabela de saldos
- UI: seleção de depósito em movimentações e na tela de estoque

**2.2 Transferência entre depósitos**
- Tabelas `transferencias_estoque` e `transferencia_estoque_itens`
- UI: tela ou aba na página de Estoque
- Movimentação automática (saída no origem, entrada no destino)

**2.3 Inventário físico**
- Tabelas `inventarios` e `inventario_itens`
- Fluxo: abrir inventário > registrar contagem física > calcular divergência > gerar ajuste
- UI: nova aba ou submódulo em Estoque

**2.4 Reserva de estoque em OV**
- Ao mudar status da OV para "em_separacao", reservar quantidade dos itens
- Campo `quantidade_reservada` no estoque
- Validação de disponibilidade (atual - reservada)

### Sprint 3 -- Refinamento

**3.1 Solicitação de Compra**
- Nova tabela e CRUD
- Fluxo: Solicitação > Cotação de Compra > Pedido de Compra

**3.2 Recebimento de Compra**
- Nova tabela com vínculo ao pedido e depósito
- Impacto automático em estoque ao confirmar

**3.3 Centro de Custo e Natureza Financeira**
- Novas tabelas de cadastro
- Vínculo opcional nos lançamentos financeiros
- UI: novas telas de cadastro + campos nos formulários financeiros

**3.4 Permissões granulares**
- Tabela de permissões por perfil/módulo/ação
- Substituir roles simples por verificação granular
- UI: tela de gestão de perfis e permissões em Administração

**3.5 Rastreabilidade inline**
- Adicionar `usuario_criacao_id` e `usuario_ultima_modificacao_id` nas tabelas principais
- Exibir "Criado por" e "Modificado por" nos drawers

---

## O que NÃO vale migrar

| Item | Motivo |
|---|---|
| Backend Express/Prisma | Arquitetura diferente; usamos Supabase |
| Deploy Vercel monorepo | Lovable tem deploy próprio |
| JWT auth custom | Usamos Supabase Auth |
| Multi-empresa/filial | Complexidade alta, baixo valor imediato para operação single-company |

---

## Resumo

- **V2 tem ~12 funcionalidades/entidades** que não existem no projeto atual
- **Sprint 1** (parcelamento, estorno NF, aging, importação XML) traz o maior valor com menor risco
- **Sprint 2** (depósitos, transferência, inventário, reserva) é estrutural e muda o modelo de estoque
- **Sprint 3** (solicitação compra, recebimento, centro custo, permissões granulares) completa a paridade

