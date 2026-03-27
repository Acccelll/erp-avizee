
# Sprint D: Integração SEFAZ & Faturamento

## Itens Implementados

### 1. Consulta CNPJ via BrasilAPI (SEFAZ)
**Arquivos**: `src/hooks/useCnpjLookup.ts`, `src/pages/Clientes.tsx`, `src/pages/Fornecedores.tsx`

Hook `useCnpjLookup` que consulta a BrasilAPI (`brasilapi.com.br/api/cnpj/v1/{cnpj}`) ao sair do campo CNPJ (onBlur). Preenche automaticamente: razão social, nome fantasia, email, telefone, endereço completo. Integrado nos formulários de Clientes (quando tipo_pessoa = J) e Fornecedores.

### 2. Geração de NF a partir de Ordem de Venda
**Arquivo**: `src/pages/OrdensVenda.tsx`

Botão "Gerar NF" disponível em OVs aprovadas/em separação com faturamento != total. Ao confirmar:
- Cria nota fiscal de saída vinculada à OV
- Copia itens da OV para itens da NF
- Atualiza status_faturamento da OV para "total"
- Atualiza quantidade_faturada dos itens

---

# Sprint E: Qualidade de Código e Infraestrutura

## Itens Implementados

### 1. QueryClient configurado
**Arquivo**: `src/App.tsx`
- `staleTime: 5min`, `gcTime: 10min`, `retry: 1`, `refetchOnWindowFocus: false`

### 2. Toaster duplicado removido
**Arquivo**: `src/App.tsx`
- Removido `<Toaster />` do shadcn, mantendo apenas `<Sonner />`

### 3. Remoção de `(supabase as any)` em ~20 arquivos
**Arquivos**: `useSupabaseCrud.ts`, todas as pages e services
- Substituído por `supabase.from(table as any)` apenas onde necessário (table names dinâmicos)
- Pages com table names estáticos agora usam `supabase.from("tabela")` diretamente

### 4. Correção do filter loop no useSupabaseCrud
**Arquivo**: `src/hooks/useSupabaseCrud.ts`
- Substituído `JSON.stringify(filter)` no useCallback por `useRef(filter)`
- Evita re-renders desnecessários e loops infinitos

### 5. Unificação de rotas /cotacoes → /orcamentos
**Arquivo**: `src/App.tsx`
- Rotas `/cotacoes`, `/cotacoes/novo`, `/cotacoes/:id` agora redirecionam para `/orcamentos`

### 6. Roles no AuthContext + refatoração do useIsAdmin
**Arquivos**: `src/contexts/AuthContext.tsx`, `src/hooks/useIsAdmin.ts`
- AuthContext agora expõe `roles: AppRole[]` e `hasRole(role)` 
- Busca roles da tabela `user_roles` ao fazer login
- `useIsAdmin` simplificado para usar `hasRole("admin")` em vez de RPC separada

### 7. Hook useAppConfig para configs persistidas no banco
**Arquivo**: `src/hooks/useAppConfig.ts`
- Lê e persiste configurações na tabela `app_configuracoes`
- API: `{ value, loading, save }` com upsert automático

---

### Sprints Anteriores
- **Sprint A**: package.json fix, session timeout, ErrorBoundary, GlobalSearch categorizado
- **Sprint B**: Sparklines, sidebar badges, DashboardSkeleton, column toggle
- **Sprint C**: DRE, calendário financeiro, aprovação orçamentos, alertas estoque
