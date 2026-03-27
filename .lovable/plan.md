

# Plano de Execucao — 15 Prompts

Apos analise detalhada do codigo atual, identifiquei o que ja foi implementado e o que falta para cada prompt. Divido a execucao em 4 blocos por volume de edicoes.

---

## Estado Atual vs Prompts

| # | Prompt | Status | Acao |
|---|--------|--------|------|
| 1 | Busca inteligente itens | Parcial | AutocompleteSearch existe; falta enriquecer resultados com unidade+fornecedor e usar em ItemsGrid |
| 2 | Filtros avancados | Parcial | AdvancedFilterBar existe mas nenhuma pagina o usa de fato (todas usam Selects ad-hoc) |
| 3 | Dashboard cleanup | **Feito** | "vencidos" removido do PeriodFilter, badges nos cards |
| 4 | Navegacao relacional | Parcial | RelationalLink existe, usado em Compras/PedidosCompra; falta em Clientes, Fornecedores, Financeiro, Produtos |
| 5 | Pedido Compra fluxo completo | Parcial | "Dar Entrada" existe; falta gerar financeiro e estoque automaticamente |
| 6 | Estoque separado | **Feito** | Tabs Posicao/Movimentacao implementadas |
| 7 | Drawers padronizados | Quase | Transportadoras ainda usa ViewDrawer antigo |
| 8 | Produto x Fornecedor UI | Parcial | Tab "Cod. Forn." existe mas e read-only; falta CRUD inline |
| 9 | Cliente forma/prazo | **Feito** | Auto-sugestao no OrcamentoForm funciona |
| 10 | Cliente x Transportadora | Parcial | Dados carregados em Clientes mas sem aba dedicada no drawer |
| 11 | Drawer fiscal | **Feito** | Tabs no Fiscal.tsx |
| 12 | Relatorios relevantes | Parcial | Falta relatorio de divergencias (pedidos sem NF, NF sem financeiro) |
| 13 | Correios base | **Feito** | Tabelas remessas + remessa_eventos criadas |
| 14 | Correios integracao | Nao feito | Edge Function para API Correios |
| 15 | Revisao transversal | Nao feito | Cleanup final |

---

## Bloco A — Filtros + Drawers + Links (Prompts 2, 4, 7, 10)

### Transportadoras.tsx
- Migrar de `ViewDrawer` para `ViewDrawerV2` com tabs (Dados, Clientes Vinculados)
- Carregar `cliente_transportadoras` ao abrir drawer para exibir clientes vinculados

### Clientes.tsx
- Adicionar aba "Transportadoras" no drawer (ja carrega `transportadorasCliente`)
- Adicionar `RelationalLink` nos titulos financeiros (link para `/financeiro`)

### Fornecedores.tsx
- Adicionar `RelationalLink` nas compras (link para `/compras`) e produtos (link para `/produtos`)

### Financeiro.tsx
- Adicionar `RelationalLink` para cliente/fornecedor e nota fiscal no drawer

### Produtos.tsx — Tab "Cod. Forn." (Prompt 8)
- Transformar tab read-only em CRUD inline com botao "Adicionar Fornecedor"
- Form inline: fornecedor (autocomplete), ref_fornecedor, preco_compra, lead_time, un_fornecedor, eh_principal
- Persistir via `produtos_fornecedores`

---

## Bloco B — Busca Inteligente + ItemsGrid (Prompt 1)

### AutocompleteSearch
- Enriquecer renderizacao dos resultados: exibir `[SKU] Nome — UN — Fornecedor Principal`

### ItemsGrid
- Substituir Select de produto por AutocompleteSearch
- Passar `searchTerms` com SKU, codigo_interno, referencia_fornecedor

---

## Bloco C — Fluxo Pedido Compra Completo (Prompt 5)

### PedidosCompra.tsx
- Ao "Dar Entrada", alem de abrir tela fiscal pre-preenchida:
  - Gerar lancamentos financeiros automaticamente (baseado nos valores/condicoes)
  - Gerar movimentacao de estoque (entrada por item)
  - Atualizar status do pedido para "concluido" ou "parcial"
- Exibir no drawer: nota gerada, financeiro gerado, status estoque

---

## Bloco D — Relatorios + Revisao (Prompts 12, 14, 15)

### relatorios.service.ts
- Adicionar relatorio "Divergencias":
  - Pedidos de compra sem nota fiscal vinculada
  - Notas fiscais sem lancamento financeiro
  - Pedidos com status ativo mas sem movimentacao de estoque

### Relatorios.tsx
- Adicionar card "Divergencias" na lista de relatorios

### Revisao transversal (Prompt 15)
- Remover imports nao usados
- Verificar consistencia de nomenclaturas (status, labels)
- Verificar breadcrumbs e titulos

### Correios Edge Function (Prompt 14) — Requer credenciais
- Criar edge function `correios-api` com endpoints: token, cotacao, prazo, rastreio
- Usar secrets para credenciais (usuario, senha, codigo_administrativo, cartao_postagem)
- Integrar em Remessas.tsx com botoes de acao

---

## Detalhes Tecnicos

- **Migrations**: Nenhuma necessaria — tabelas `produtos_fornecedores`, `cliente_transportadoras`, `remessas`, `remessa_eventos` ja existem
- **Arquivos editados**: ~12 paginas + 2 componentes + 1 service + 1 edge function
- **Componentes reutilizados**: `AdvancedFilterBar`, `ViewDrawerV2`, `RelationalLink`, `AutocompleteSearch`, `BaixaParcialDialog`
- Prompt 14 (Correios) requer que o usuario forneca credenciais AWS Correios para funcionar

