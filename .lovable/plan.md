

# Plano: Revisao e Correcao Geral do Frontend

## Objetivo
Deixar o projeto em estado limpo: build, lint sem erros criticos, testes uteis, lockfile sincronizado.

## A. Dependencias e Setup

1. **tailwind.config.ts** — substituir `require("tailwindcss-animate")` por `import` ESM
2. **package-lock.json** — nao pode ser regenerado diretamente pelo Lovable (sem terminal npm ci), mas garantir que `package.json` esta coerente

## B. Lint e Qualidade — Arquivos Prioritarios

### B.1 `src/services/relatorios.service.ts` (~30 `any`)
- Criar interfaces tipadas para cada tipo de row (EstoqueRow, FinanceiroRow, VendasRow, etc.)
- Substituir `(item: any)` por tipos concretos nos `.map()`
- Tipar `withDateRange` com tipo generico em vez de `any`

### B.2 `src/pages/Relatorios.tsx` (~5 `any`)
- Remover `as any` do `isDreReport` — usar optional chaining no tipo `RelatorioResultado`
- Tipar `rows as any[]` nos KPIs usando interface union ou Record tipado
- Tipar DRE rows com interface `DreRow`

### B.3 `src/pages/Remessas.tsx` (~15 `as any`)
- `table: "remessas" as any` — tabela pode nao estar no types.ts gerado; manter cast mas documentar
- `emptyForm: Record<string, any>` — criar tipo `RemessaForm` com campos concretos
- Catch vazio `} catch {}` — adicionar log minimo
- Substituir `err: any` por `err: unknown` com narrowing

### B.4 `src/pages/Transportadoras.tsx` (~3 `as any`)
- `cliente_transportadoras as any` — manter cast (tabela ausente nos types)
- `clientesVinculados: any[]` — tipar com interface `ClienteVinculado`
- Catch vazio — adicionar log

### B.5 `src/hooks/useSupabaseCrud.ts`
- `query: any` no `applyFilters` — manter (tipo Supabase query builder nao e exportado)
- Catch vazios ja tratados

### B.6 `src/contexts/AuthContext.tsx`
- `user_roles as any` — manter (tabela pode nao estar nos types gerados)
- `(data as any[])` no fetchRoles — tipar com `{ role: string }[]`

### B.7 Outros arquivos com `any`
- Varrer `src/pages/Compras.tsx`, `Fiscal.tsx`, `Produtos.tsx`, `Administracao.tsx` para catch vazios e `any` evitaveis

## C. Edge Functions

### C.1 `supabase/functions/correios-api/index.ts`
- Tipar `TokenResponse` e responses intermediarias
- `cachedToken` ja tem tipo — OK
- Tipar params das funcoes `calcularPreco`, `calcularPrazo` — ja tipados
- Adicionar tipagem no retorno de `cotacaoMulti` items

### C.2 `supabase/functions/process-email-queue/index.ts`
- Arquivo esta bem estruturado, com boa tipagem e tratamento de erro
- Unico ponto: `(msg: any)` e `(id: any)` nos maps — tipar com interfaces `QueueMessage`

## D. Testes

### D.1 Remover `src/test/example.test.ts` (teste ficticio)
### D.2 Manter testes existentes uteis:
- `useSupabaseCrud.test.tsx` — ja cobre CRUD basico
- `OrcamentoForm.test.tsx` — ja cobre renderizacao
- `DataTable.test.tsx`, `MaskedInput.test.tsx` — ja existem
- `format.test.ts`, `utils.test.ts` — ja existem

### D.3 Criar testes novos minimos:
- `src/lib/__tests__/validators.test.ts` — testar validateCPF, validateCNPJ (funcoes puras criticas)
- `src/services/__tests__/relatorios.service.test.ts` — testar `formatCellValue`, `exportarCsv` (funcoes puras)

## E. Limpeza

- Remover imports nao utilizados encontrados durante revisao
- Substituir `let` por `const` onde aplicavel
- Garantir que blocos `catch {}` vazios tenham ao menos `console.error` ou comentario explicito

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `tailwind.config.ts` | ESM import |
| `src/services/relatorios.service.ts` | Tipagem rows, withDateRange |
| `src/pages/Relatorios.tsx` | Remover any, tipar DRE |
| `src/pages/Remessas.tsx` | Tipar form, catch, err |
| `src/pages/Transportadoras.tsx` | Tipar vinculados |
| `src/contexts/AuthContext.tsx` | Tipar fetchRoles |
| `src/hooks/useSupabaseCrud.ts` | Ajustes menores |
| `supabase/functions/correios-api/index.ts` | Tipagem retornos |
| `supabase/functions/process-email-queue/index.ts` | Tipar messages |
| `src/test/example.test.ts` | Remover |
| `src/lib/__tests__/validators.test.ts` | Novo |
| `src/services/__tests__/relatorios.service.test.ts` | Novo |

## Ordem de Execucao
1. tailwind.config.ts (rapido, desbloqueia lint)
2. Tipagem em servicos e hooks (relatorios.service, useSupabaseCrud, AuthContext)
3. Tipagem em paginas (Relatorios, Remessas, Transportadoras)
4. Edge functions (correios-api, process-email-queue)
5. Testes (remover ficticio, criar validators + relatorios)
6. Limpeza final (catch, let→const, imports)

