

# Analise dos 15 Prompts — Viabilidade de Execucao

## Resumo Rapido

| # | Prompt | Executavel? | Complexidade | Requer Migration? |
|---|--------|-------------|-------------|-------------------|
| 1 | Dashboard: remover "Vencidos" do filtro | Sim | Baixa | Nao |
| 2 | Filtros avancados unificados | Sim | Alta | Nao |
| 3 | Redesign dos drawers | Sim | Alta | Nao |
| 4 | Produto x Fornecedor enriquecido | Sim | Media | Sim — nova tabela `produto_fornecedores` |
| 5 | Navegacao relacional entre registros | Sim | Alta | Nao |
| 6 | Clientes x Transportadoras | Sim | Media | Sim — nova tabela `cliente_transportadoras` |
| 7 | Busca inteligente de produtos | Sim | Media | Nao |
| 8 | Prazo e formas de pagamento | Sim (parcial) | Media | Sim — colunas em `clientes` |
| 9 | Novo cliente direto na cotacao | Sim | Baixa | Nao |
| 10 | Pedido de compra como pre-nota | Sim | Alta | Sim — nova tabela `pedidos_compra` |
| 11 | Estoque com posicao atual separada | Sim | Media | Nao |
| 12 | Baixa financeira parcial | Sim | Alta | Sim — nova tabela `financeiro_baixas` |
| 13 | Fiscal sem poluicao no drawer | Sim | Media | Nao |
| 14 | Relatorios relevantes | Sim | Alta | Nao |
| 15 | Integracao Correios | Parcial | Alta | Sim — tabelas de logistica |

**Todos os 15 sao executaveis.** O #15 requer credenciais do usuario (AWS Correios) para a parte de API, mas a modelagem interna e o modo manual funcionam sem.

---

## Plano de Execucao — 5 Sprints

Dado o volume, recomendo agrupar por dependencia e impacto:

### Sprint H: Fundacao de Dados (Migrations + modelos)
**Prompts: 4, 6, 8, 10, 12**

Todas as migrations de banco primeiro, pois os prompts seguintes dependem dessas tabelas:

1. **Tabela `produto_fornecedores`** — fornecedor_id, produto_id, codigo_fornecedor, descricao_fornecedor, unidade_fornecedor, preco_compra, lead_time_dias, eh_principal, ultima_compra
2. **Tabela `cliente_transportadoras`** — cliente_id, transportadora_id, prioridade, modalidade, prazo_medio, observacoes, ativo
3. **Colunas em `clientes`** — forma_pagamento_id (FK para formas_pagamento), prazo_preferencial
4. **Tabela `pedidos_compra`** + `pedidos_compra_itens` — espelhando estrutura de compras mas como documento intermediario
5. **Tabela `financeiro_baixas`** — lancamento_id, valor_pago, desconto, juros, multa, abatimento, data_baixa, forma_pagamento, conta_bancaria_id, observacoes
6. **RLS policies** para todas as novas tabelas

Atualizacao dos formularios e drawers de Produtos, Clientes, Financeiro para usar as novas tabelas.

### Sprint I: UX Core (Filtros + Drawers + Busca)
**Prompts: 1, 2, 3, 7, 13**

1. **Dashboard** — Remover `vencidos` do `financialPeriods`. Mover indicador de vencidos para dentro dos cards Contas a Pagar e Contas a Receber como badge/variacao
2. **FilterBar v2** — Novo componente `AdvancedFilterBar` com multi-select por campo, chips ativos, limpeza individual. Substituir filtros ad-hoc em todos os modulos (~10 paginas)
3. **ViewDrawer v2** — Padrao com: cabecalho fixo + acoes, resumo superior (stats-chave), tabs (Dados, Relacionamentos, Historico), timeline, links contextuais
4. **AutocompleteSearch melhorado** — Busca por codigo, SKU, nome, descricao e codigo do fornecedor. Navegacao por teclado. Integrar em OrcamentoForm, Compras, Fiscal, CotacoesCompra
5. **Fiscal drawer** — Reorganizar em tabs (Resumo, Itens, Impostos, Vinculos) em vez de tudo visivel

### Sprint J: Navegacao e Fluxos
**Prompts: 5, 9, 10 (UI), 11**

1. **Navegacao relacional** — Em cada drawer, transformar referencias (cliente_id, fornecedor_id, nota_fiscal_id, etc.) em links clicaveis que abrem o drawer da entidade referenciada. Mapear todas as ~20 referencias cruzadas existentes
2. **Novo cliente na cotacao** — Botao "+" ao lado do AutocompleteSearch de cliente no OrcamentoForm. Abre modal de cadastro rapido. Apos salvar, seleciona automaticamente
3. **Pedido de Compra UI** — Pagina `PedidosCompra.tsx` com fluxo cotacao → pedido → acao "Dar Entrada" que abre Fiscal pre-preenchido
4. **Estoque dividido** — Criar sub-abas "Posicao Atual" (saldo, custo medio, valor em estoque, ultima entrada/saida) e "Movimentacao" (tabela atual)

### Sprint K: Relatorios e Financeiro Avancado
**Prompts: 8 (UI), 12 (UI), 14**

1. **Forma de pagamento no cliente** — Sugestao automatica ao selecionar cliente na cotacao
2. **Baixa parcial UI** — Dialog de baixa com campos de valor, desconto, juros, multa, forma, conta bancaria. Lista de baixas anteriores no drawer do lancamento. Calculo automatico de saldo restante. Status reflete: aberto → parcial → pago
3. **Relatorios refatorados** — Organizar por perguntas de negocio: "Quanto tenho a receber atrasado?", "Qual meu fluxo previsto vs realizado?", "Quais produtos tem menor margem?". Novos relatorios: estoque abaixo do minimo, aging por faixa, compras por fornecedor, vendas por cliente, divergencias fiscais

### Sprint L: Logistica e Correios
**Prompt: 15**

1. **Modelagem interna** — Tabelas `remessas` (transportadora_id, servico, codigo_rastreio, data_postagem, previsao_entrega, status_transporte) e `remessa_eventos` (remessa_id, data_hora, descricao, local)
2. **Modo manual** — CRUD de remessas com status manual (postado, em transito, entregue, devolvido)
3. **Integracao Correios** — Edge Function que consulta API dos Correios (cotacao de frete, rastreamento). Requer do usuario: usuario, senha, codigo administrativo e cartao de postagem do contrato AWS Correios

---

## Recomendacao

Comecar pela **Sprint H** (migrations) pois e pre-requisito das demais. Sao ~6 migrations + atualizacao de ~8 paginas. Posso executar agora se aprovar.

