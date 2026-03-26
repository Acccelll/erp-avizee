

# Sprint A: Quick Wins ✅

## 1. ✅ Corrigir package.json
## 2. ✅ Session timeout com feedback
## 3. ✅ ErrorBoundary global
## 4. ✅ Busca global categorizada

---

# Sprint B: UX Enhancements ✅

## 1. ✅ Sparklines nos KPI cards do Dashboard
**Arquivo**: `src/components/SummaryCard.tsx`
Adicionada prop `sparklineData?: number[]` que renderiza um mini LineChart (Recharts) inline sem eixos.

## 2. ✅ Sidebar com badges de alerta
**Arquivos**: `src/hooks/useSidebarAlerts.ts` (novo), `src/components/AppSidebar.tsx`
Hook que consulta financeiro vencidos e estoque baixo a cada 5 min. Badges numéricos exibidos nos itens Financeiro e Estoque da sidebar.

## 3. ✅ Skeleton loaders para Dashboard
**Arquivo**: `src/components/dashboard/DashboardSkeleton.tsx` (novo), `src/pages/Index.tsx`
Skeleton que espelha o layout real do Dashboard (KPIs, alertas, tabelas, gráfico pie) em vez de spinner.

## 4. ✅ Toggle de colunas visíveis no DataTable
**Arquivo**: `src/components/DataTable.tsx`
Adicionada prop `showColumnToggle` que exibe popover com checkboxes para controlar visibilidade de colunas.

