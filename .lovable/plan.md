

# Plano: Correção de Filtros, Drawer Fiscal e Menu Relatórios

## Problemas identificados

1. **Dashboard — filtros de período não funcionam corretamente**: A query `buildFinQuery` usa `gte("data_vencimento", dateFrom)` sem limite superior. "Hoje" deveria mostrar apenas contas vencendo hoje; "7 dias" deveria mostrar contas vencendo nos próximos 7 dias; etc. Atualmente busca tudo **a partir** da data, sem teto.

2. **Financeiro — mesma lógica incorreta**: O `filteredData` em `Financeiro.tsx` usa `periodToDateFrom` que retorna datas no **passado** (ex: 30 dias atrás). Para contas a pagar/receber, o filtro deveria olhar para **frente** — "30 dias" = contas vencendo nos próximos 30 dias a partir de hoje.

3. **Fiscal — drawer incompleto**: O `ViewDrawer` da NF mostra informações gerais mas omite dados como condição de pagamento, valor de produtos (subtotal), e impostos individuais por item (CST, CFOP). O usuário precisa clicar "Editar" para ver detalhes.

4. **Relatórios — submenu desnecessário**: Na navegação, "Relatórios" tem um submenu com links por tipo de relatório. Deveria ser um link direto para `/relatorios` sem submenu.

---

## Implementação

### 1. Corrigir lógica de período (Dashboard + Financeiro)

**Conceito**: Os filtros de período para contas financeiras devem olhar **para frente** (vencimentos futuros):
- "Hoje" = vencendo hoje
- "7 dias" = vencendo entre hoje e hoje+7
- "30 dias" = vencendo entre hoje e hoje+30
- "Vencidos" = vencidos antes de hoje

**Arquivo `src/lib/periodFilter.ts`**: Criar função `periodToDateRange(period)` que retorna `{ dateFrom, dateTo }` com lógica forward-looking.

**Arquivo `src/pages/Index.tsx`**: Atualizar `buildFinQuery` para usar `gte + lte` com range correto (hoje → hoje+N dias).

**Arquivo `src/pages/Financeiro.tsx`**: Atualizar `filteredData` para usar a mesma lógica forward-looking no client-side filter.

### 2. Completar drawer do Fiscal

**Arquivo `src/pages/Fiscal.tsx`**: Expandir o `ViewDrawer` para incluir:
- Subtotal de produtos (soma dos itens)
- Condição de pagamento (à vista / a prazo)
- Todos os impostos sempre visíveis (mesmo zerados ficam com "—")
- Para cada item: valor unitário, CST, CFOP além de quantidade e total
- Resumo financeiro (subtotal, impostos, frete, desconto, total) como bloco consolidado

### 3. Simplificar menu Relatórios

**Arquivo `src/lib/navigation.ts`**: Substituir o bloco `relatorios` com submenu por um link direto simples para `/relatorios`.

**Abordagem**: Mudar a estrutura do `navSections` para que "Relatórios" tenha apenas um item apontando para `/relatorios` sem subgrupos, ou transformar em um link de nível superior como o Dashboard.

---

## Arquivos a editar

| Arquivo | Alteração |
|---|---|
| `src/lib/periodFilter.ts` | Nova função `periodToFinancialRange()` com lógica forward-looking |
| `src/pages/Index.tsx` | Usar range com `gte + lte` no `buildFinQuery` |
| `src/pages/Financeiro.tsx` | Filtro client-side com lógica forward-looking |
| `src/pages/Fiscal.tsx` | Expandir ViewDrawer com todos os campos da NF |
| `src/lib/navigation.ts` | Simplificar seção Relatórios para link direto |

