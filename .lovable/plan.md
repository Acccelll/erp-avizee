

# Lacunas Pendentes do Plano — O que falta executar

Analisei o codigo atual contra os 15 prompts e as 5 sprints planejadas. Os componentes base foram criados (`AdvancedFilterBar`, `ViewDrawerV2`, `RelationalLink`, `QuickAddClientModal`, `BaixaParcialDialog`), mas a **integracao real nos modulos** ficou incompleta na maioria dos casos.

---

## Lacunas por Prompt

| # | Prompt | Status | O que falta |
|---|--------|--------|-------------|
| 1 | Dashboard vencidos | Parcial | Verificar se badge de vencidos aparece nos cards |
| 2 | Filtros unificados | **Incompleto** | `AdvancedFilterBar` criado mas **0 paginas** o utilizam |
| 3 | Redesign drawers | **Incompleto** | `ViewDrawerV2` usado em 3 paginas; falta em Clientes, Fornecedores, Produtos, Compras, Financeiro, CotacoesCompra |
| 4 | Produto x Fornecedor | **Incompleto** | Tabela `produto_fornecedores` criada mas Produtos.tsx nao tem UI para gerenciar vinculos |
| 5 | Navegacao relacional | **Incompleto** | `RelationalLink` usado apenas em PedidosCompra; falta em todos os outros drawers |
| 6 | Cliente x Transportadora | Parcial | Tabela criada, Clientes.tsx faz fetch mas drawer pode nao exibir completamente |
| 7 | Busca inteligente | Parcial | `AutocompleteSearch` melhorado mas nao integrado em Compras, CotacoesCompra, Fiscal |
| 8 | Prazo/forma pagamento | Feito | Auto-sugestao no OrcamentoForm funciona |
| 9 | Novo cliente na cotacao | Feito | `QuickAddClientModal` integrado no OrcamentoForm |
| 10 | Pedido de compra | Feito | Pagina com ViewDrawerV2 e acao "Dar Entrada" |
| 11 | Estoque dividido | Feito | Tabs "Posicao Atual" e "Movimentacao" |
| 12 | Baixa parcial | Feito | `BaixaParcialDialog` integrado no Financeiro |
| 13 | Fiscal drawer | Feito | Reorganizado em tabs com ViewDrawerV2 |
| 14 | Relatorios | Parcial | 3 novos relatorios adicionados, mas faltam aging por faixa, margem por item, divergencias fiscais |
| 15 | Remessas/Correios | Parcial | CRUD manual feito; Edge Function dos Correios nao implementada |

---

## Plano de Execucao — Sprint M (Integracao Pendente)

### Bloco 1: AdvancedFilterBar em todos os modulos
Substituir filtros ad-hoc por `AdvancedFilterBar` em:
- Financeiro, Compras, CotacoesCompra, Clientes, Fornecedores, Produtos, Estoque, Fiscal, Pedidos, OrdensVenda

### Bloco 2: ViewDrawerV2 nos modulos restantes
Migrar drawers de `ViewDrawer` para `ViewDrawerV2` com tabs em:
- Clientes (Dados, Transportadoras, Financeiro, Historico)
- Fornecedores (Dados, Produtos, Compras, Financeiro)
- Produtos (Dados, Fornecedores, Estoque, Fiscal)
- Compras (Dados, Itens, Financeiro)
- Financeiro (Dados, Baixas, Vinculos)

### Bloco 3: RelationalLink em todos os drawers
Adicionar links clicaveis para entidades relacionadas:
- Compras → Fornecedor, Nota Fiscal
- Financeiro → Cliente/Fornecedor, Nota Fiscal, Conta Bancaria
- Clientes → Cotacoes, Pedidos, Financeiro
- Fornecedores → Compras, Produtos
- Produtos → Fornecedores, Movimentacoes
- Fiscal → Pedido de origem, Financeiro gerado

### Bloco 4: Produto x Fornecedor UI
- Tab "Fornecedores" no drawer de Produtos com CRUD inline da tabela `produto_fornecedores`
- Campos: fornecedor (autocomplete), codigo, descricao, unidade, preco, lead time, principal

### Bloco 5: AutocompleteSearch expandido
Integrar busca com `searchTerms` (SKU, codigo fornecedor) em:
- Compras, CotacoesCompra, Fiscal (inclusao de itens)

### Bloco 6: Relatorios complementares
- Aging de recebiveis por faixa (0-30, 31-60, 61-90, 90+)
- Margem por produto (preco venda vs custo)
- Divergencias: pedidos sem nota, notas sem financeiro

---

## Tecnico

- Nenhuma migration necessaria — todas as tabelas ja existem
- ~10 paginas serao editadas
- Componentes base (`AdvancedFilterBar`, `ViewDrawerV2`, `RelationalLink`) ja estao prontos, so precisam ser importados e configurados
- Estimativa: alto volume de edicoes mas baixa complexidade individual

