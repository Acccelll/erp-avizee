

# Analise do Prompt: O que pode ser executado

O prompt contém **~25 tarefas distintas**. Analisei cada uma contra o estado atual do codigo.

---

## JA FEITO (total ou parcialmente nas Sprints A-D)

| # | Tarefa | Status |
|---|--------|--------|
| 1 | `client.ts` tipado com `Database` | **Ja feito** — linha 27 ja tem `createClient<Database>` |
| 11 | Calendario de vencimentos no Financeiro | **Ja feito** — `FinanceiroCalendar.tsx` existe |
| 14 | DRE no modulo de relatorios | **Ja feito** — tipo `dre` ja consta em `reportCards` e `relatorios.service.ts` |
| 16 | Badges de alerta na sidebar | **Ja feito** — `useSidebarAlerts.ts` existe e `AppSidebar` ja exibe badges |
| 18 | Skeleton loaders (parcial) | **Parcial** — `DashboardSkeleton` existe; DataTable skeleton e SummaryCard loading faltam |
| 21 | Fluxo de aprovacao de orcamentos | **Ja feito** — botoes Enviar/Aprovar ja estao em `Orcamentos.tsx` |

---

## EXECUTAVEL AGORA (sem dependencias externas)

Estas tarefas envolvem apenas mudancas de codigo frontend, hooks, utils, migrations e edge functions que podemos implementar:

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 2 | Remover `(supabase as any)` em `useSupabaseCrud.ts` e todas as pages (~21 arquivos) | Media |
| 3 | Configurar `QueryClient` com `staleTime`, `gcTime`, `retry`, `refetchOnWindowFocus` | Baixa |
| 4 | Remover `<Toaster>` duplicado do shadcn (manter so `<Sonner>`) | Baixa |
| 5 | Migrar email de `@lovable.dev/email-js` para Resend | Media (requer secret `RESEND_API_KEY`) |
| 6 | Migration RBAC com policies por role (substituir policies abertas) | Media |
| 7 | Adicionar `roles` e `hasRole()` ao `AuthContext`, refatorar `useIsAdmin` | Media |
| 8 | Corrigir `JSON.stringify(filter)` no `useCallback` do `useSupabaseCrud` | Baixa |
| 9 | Paginacao real no PDF e remover limite de 200 linhas | Baixa |
| 10 | Unificar rotas `/cotacoes` → `/orcamentos` com redirects | Baixa |
| 12 | Validacao CPF/CNPJ com algoritmo mod11 + MaskedInput | Media |
| 13 | Sorting client-side no DataTable (colunas clicaveis) | Media |
| 15 | Hook `useAppConfig()` para persistir configs no banco (sair de localStorage) | Media |
| 17 | Filtro por grupo de produto em Produtos.tsx | Baixa |
| 18b | Completar skeletons no DataTable e SummaryCard | Baixa |
| 19 | Grafico de fluxo de caixa (AreaChart) no dashboard | Media |
| 20 | Variacao percentual nos KPIs do dashboard | Media |
| 22 | DANFE viewer component | Alta |
| 24 | Autocomplete CFOP e CST (dados estaticos) | Media |
| 25 | Alertas com badges para OVs em backlog (expandir sidebar alerts) | Baixa |
| 26 | Curva ABC de Produtos e Clientes nos relatorios | Media |
| 27 | Relatorio de margem de produtos | Media |
| 28 | Orcamento publico com token (migration + pagina publica) | Alta |
| 29 | Parser OFX e pagina de Conciliacao bancaria | Alta |
| 30 | Notificacoes realtime via Supabase channel | Media |

---

## REQUER DEPENDENCIA EXTERNA (nao executavel sem acao do usuario)

| # | Tarefa | Bloqueio |
|---|--------|---------|
| 5 | Email via Resend | Precisa que o usuario forneca `RESEND_API_KEY` |
| 23 | Consulta NF-e no SEFAZ (Edge Function SOAP) | SEFAZ requer certificado; SOAP em Deno e instavel |
| 31 | Emissao NF-e via Focus NFe | Precisa `FOCUSNFE_TOKEN` (servico pago) |
| 32 | PDF server-side via Puppeteer | `puppeteer-core` nao roda em Edge Functions Deno |

---

## PLANO DE EXECUCAO (por prioridade e volume)

Posso executar **~20 tarefas** agrupadas em 3 sprints. Recomendo comecar pela Sprint E abaixo:

### Sprint E: Qualidade de Codigo e Infraestrutura

1. **QueryClient configurado** — `staleTime`, `gcTime`, `retry`, `refetchOnWindowFocus` em `App.tsx`
2. **Remover Toaster duplicado** — manter so `<Sonner />`
3. **Remover `(supabase as any)`** — em `useSupabaseCrud.ts` e nas ~21 pages/services que usam cast
4. **Corrigir filter loop** no `useSupabaseCrud` com `useRef`
5. **Unificar rotas** `/cotacoes` → `/orcamentos` com `<Navigate>`
6. **Roles no AuthContext** + refatorar `useIsAdmin`
7. **Migration RBAC** — policies por role
8. **Hook `useAppConfig()`** — persistir configs no banco

### Sprint F: UX e Componentes

1. **DataTable sorting** client-side
2. **Skeleton loaders** completos (DataTable + SummaryCard)
3. **Validacao CPF/CNPJ** com mod11 + MaskedInput
4. **Filtro por grupo** em Produtos
5. **Autocomplete CFOP/CST**
6. **Paginacao real no PDF** (remover limite 200)
7. **DANFE viewer**

### Sprint G: Dashboard e Relatorios

1. **Grafico FluxoCaixaChart** (AreaChart entradas vs saidas)
2. **Variacao percentual** nos KPIs
3. **Curva ABC** de produtos e clientes
4. **Relatorio margem** de produtos
5. **Notificacoes realtime**
6. **Orcamento publico** com token

---

## Resumo

- **6 tarefas** ja foram feitas nas sprints anteriores
- **~24 tarefas** sao executaveis (20 sem bloqueio, 4 com secret/servico externo)
- **4 tarefas** requerem servicos pagos ou tecnologias incompativeis com o ambiente

Aprove para eu comecar pela **Sprint E** (infraestrutura e qualidade de codigo), que e a base para as demais.

