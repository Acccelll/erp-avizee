

# ERP AviZee — Full Project Review

## Executive Summary

The ERP AviZee is a well-architected React + TypeScript + Supabase application with strong foundations: lazy-loaded routes, React Query caching, a relational drawer navigation system with URL sync, cross-tab localStorage syncing, offline queue, and comprehensive RLS policies. The documentation (ARCHITECTURE.md) is excellent with Mermaid diagrams.

However, the project is currently **not building** due to ~30+ TypeScript errors introduced in recent changes. There are also meaningful security gaps (overly permissive RLS on several tables), widespread `as any` usage (~475 occurrences), and the offline sync system lacks conflict resolution. Overall health: **good architecture, needs stabilization**.

---

## 1. Critical Issues (Must Fix)

### 1.1 Build is Broken — 30+ TypeScript Errors
- **Location**: `useSupabaseCrud.ts`, `useAppConfig.ts`, `useUserPreference.ts`, `useSidebarAlerts.ts`, `OrcamentoItemsGrid.tsx`, and ~15 page files
- **Severity**: Critical
- **Description**: The project does not compile. Key issues:
  - `useSupabaseCrud` uses generic `table: string` but Supabase's typed client expects literal table names, causing `'string' is not assignable to type 'never'` errors throughout.
  - Page-level interfaces (e.g., `Cliente`, `Compra`, `Lancamento`) use TypeScript `interface` instead of `type`, so they lack the index signature needed for `Record<string, unknown>`.
  - `useAppConfig.ts` and `useUserPreference.ts` have `.upsert()` calls where the result is not properly awaited (missing `.then()` — the `error` destructure fails).
  - `useSidebarAlerts.ts` uses status values (`pendente`, `aguardando_aprovacao`, `em_analise`) not present in the `status_pedido` enum.
  - `OrcamentoItemsGrid.tsx` references `desconto_percentual` which doesn't exist on the `precos_especiais` table.
- **Fix**: 
  - In `useSupabaseCrud`, cast `table` to `any` at the Supabase call site, or use a typed overload pattern.
  - Change all page-level `interface` types to `type` aliases (which satisfy `Record<string, unknown>`).
  - Add `desconto_percentual` column to `precos_especiais` table or remove the reference.
  - Add missing status values to the `status_pedido` enum via migration.
  - Fix the `upsert` calls in useAppConfig/useUserPreference to properly chain `.then()`.

### 1.2 Overly Permissive RLS Policies — PII Exposure
- **Location**: `clientes`, `fornecedores`, `bancos`, `contas_contabeis`, `formas_pagamento`, `grupos_economicos`, `grupos_produto`, `cliente_transportadoras`, `cliente_registros_comunicacao`, `importacao_logs`, `importacao_lotes`
- **Severity**: Critical (Security)
- **Description**: 11+ tables have `USING(true) WITH CHECK(true)` for ALL operations. Any authenticated user (including `estoquista`) can read, modify, and delete customer PII (CPF/CNPJ, credit limits, addresses), supplier data, and bank information.
- **Fix**: Replace open ALL policies with role-scoped policies matching the existing pattern used for `compras`, `financeiro_lancamentos`, etc.

### 1.3 Storage Bucket Has No Object-Level RLS
- **Location**: `dbavizee` storage bucket
- **Severity**: High (Security)
- **Description**: No policies on `storage.objects` — any authenticated user can access all files.
- **Fix**: Add SELECT policy for authenticated + write/delete restricted to admin.

### 1.4 No Foreign Keys Enforced in Database
- **Location**: All tables
- **Severity**: High (Data Integrity)
- **Description**: Despite the schema showing relationships (e.g., `orcamentos.cliente_id` → `clientes.id`), the useful context shows "No foreign keys" for every single table. This means referential integrity is not enforced — orphaned records are possible.
- **Fix**: Migration `20260401012835` attempted to add FKs but a follow-up migration dropped duplicates. Verify which FKs actually exist and add any missing ones.

---

## 2. High-Priority Improvements

### 2.1 Pervasive `as any` Usage (475 occurrences in 33 files)
- **Location**: Throughout `src/pages/`, `src/hooks/`, `src/components/`
- **Severity**: High
- **Description**: Despite ESLint rule `@typescript-eslint/no-explicit-any: "error"`, the codebase has 475 `as any` casts. This defeats type safety, especially in Supabase queries where wrong column names would go undetected.
- **Fix**: Use properly typed Supabase queries, replace `as any` with specific types or `as unknown as T` where truly needed.

### 2.2 Offline Sync Queue Has No Conflict Resolution
- **Location**: `src/services/syncQueue.ts`, `src/hooks/useAppConfig.ts`
- **Severity**: High
- **Description**: The sync queue stores `prevValue` but never uses it for conflict detection. If two tabs or sessions modify the same key offline, the last-write-wins without any detection. The `withTimeout` approach also silently queues failed writes without user awareness of stale data.
- **Fix**: Implement timestamp-based conflict detection using `updated_at` from the database. On flush, compare `prevValue` with current server value before applying.

### 2.3 Drawer Stack Does Not Deduplicate Entities
- **Location**: `src/contexts/RelationalNavigationContext.tsx`
- **Severity**: Medium
- **Description**: `pushView` does not check if the same `(type, id)` pair is already in the stack. Users can open the same entity multiple times, wasting resources and causing confusion.
- **Fix**: Add deduplication check in the `request_push` reducer case.

### 2.4 RLS Test Coverage is Minimal
- **Location**: `scripts/test-rls.ts`
- **Severity**: High
- **Description**: The RLS test only checks if anon can read `clientes` and if service role can read `clientes`. It doesn't test role-based access, write operations, cross-user isolation, or any other table.
- **Fix**: Expand to test all critical tables with different user roles (admin, vendedor, financeiro, estoquista), covering SELECT, INSERT, UPDATE, DELETE.

### 2.5 Functions Missing `search_path` Setting
- **Location**: Database functions `update_updated_at`, `enqueue_email`, `delete_email`, `read_email_batch`, `move_to_dlq`
- **Severity**: Medium (Security)
- **Description**: 5 functions don't set `search_path`, making them vulnerable to search path manipulation attacks.
- **Fix**: Add `SET search_path TO 'public'` to all functions.

---

## 3. Medium/Low-Priority Suggestions

### 3.1 No List Virtualization
- **Location**: `DataTable.tsx`, page-level lists
- **Severity**: Medium (Performance)
- **Description**: Large datasets (e.g., thousands of products or financial entries) render all rows without virtualization. The `useSupabaseCrud` hook supports pagination but not all pages use it.
- **Fix**: Add `react-virtual` or `@tanstack/react-virtual` for tables with 100+ rows.

### 3.2 `queryClient` Created Outside Component
- **Location**: `src/App.tsx:72`
- **Severity**: Low
- **Description**: `queryClient` is created at module scope, which is fine for SPA but could cause issues with SSR or testing.

### 3.3 Auth Race Condition
- **Location**: `src/contexts/AuthContext.tsx:47-82`
- **Severity**: Medium
- **Description**: Both `onAuthStateChange` and `getSession` fire independently and both call `setLoading(false)`. If `onAuthStateChange` fires first with a session, then `getSession` resolves, profile/roles could be fetched twice.
- **Fix**: Use a ref flag to ensure profile/roles are fetched only once per session change.

### 3.4 Missing `user_roles` in Generated Types
- **Location**: `src/contexts/AuthContext.tsx:102`
- **Severity**: Low
- **Description**: `supabase.from("user_roles" as any)` — the table exists but isn't in the generated types, forcing an `as any` cast.
- **Fix**: Regenerate Supabase types to include the `user_roles` table.

### 3.5 E2E Tests Only Run on Manual Trigger
- **Location**: `.github/workflows/ci.yml:116-118`
- **Severity**: Low
- **Description**: E2E tests only run with `[e2e]` in commit message or manual dispatch. Regressions could slip through.

### 3.6 No Database Indexes Beyond PKs
- **Severity**: Medium (Performance)
- **Description**: Common query patterns (e.g., `financeiro_lancamentos` filtered by `status + data_vencimento`, `orcamentos` by `status`) lack explicit indexes.
- **Fix**: Add composite indexes for the most common query patterns.

---

## 4. Strengths & Good Practices

1. **Excellent architecture documentation** — `docs/ARCHITECTURE.md` with Mermaid diagrams covering auth flow, data model, context hierarchy, and drawer navigation.
2. **Relational drawer navigation** — Well-engineered `RelationalNavigationContext` with URL sync, depth limiting, keyboard shortcuts (Shift+ESC), and confirmation dialog at max depth.
3. **Cross-tab sync** — `useSyncedStorage` with schema versioning and `StorageEvent` propagation is a solid pattern.
4. **Code splitting** — All 38 pages are lazy-loaded with `React.lazy` and per-route Suspense boundaries.
5. **Role-based RLS** — Core financial/fiscal tables properly use `has_role()` security definer function for RBAC.
6. **CI pipeline** — Lint, typecheck, unit tests, build, semantic-release, and optional E2E with Playwright.
7. **ESLint strict rules** — `no-explicit-any: "error"`, `no-console: warn`, react-hooks rules enabled.
8. **Offline resilience** — `syncQueue` with exponential backoff retry, `OfflineBanner` component, and `useOnlineStatus` hook.
9. **Husky + conventional commits** — Pre-commit hooks and semantic-release for automated versioning.
10. **React Query adoption** — Server state management with 5-minute stale time, garbage collection, and cache invalidation on mutations.

---

## 5. Actionable Roadmap

```text
Priority  | Action                                          | Effort
──────────┼─────────────────────────────────────────────────┼────────
P0        | Fix all TypeScript build errors                 | 1-2 days
P0        | Add missing enum values to status_pedido        | 30 min
P0        | Add desconto_percentual to precos_especiais     | 30 min
P1        | Tighten RLS on 11 overly permissive tables      | 1 day
P1        | Add storage.objects RLS policies                | 2 hours
P1        | Verify/add foreign key constraints              | 1 day
P1        | Eliminate critical `as any` casts (auth, crud)  | 1 day
P2        | Add drawer deduplication                        | 1 hour
P2        | Implement offline conflict detection            | 1 day
P2        | Expand RLS test suite                           | 1 day
P2        | Set search_path on all DB functions             | 1 hour
P2        | Add database indexes for common queries         | 2 hours
P3        | Add list virtualization for large datasets      | 1 day
P3        | Fix auth double-fetch race condition            | 2 hours
P3        | Reduce remaining `as any` usage                 | 2-3 days
P3        | Enable E2E tests in CI on develop branch        | 1 hour
```

