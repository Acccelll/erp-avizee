# ERP AviZee

ERP web da AviZee construído com React, Vite, TypeScript, shadcn/ui e Supabase. O projeto reúne módulos operacionais, comerciais, fiscais e financeiros em uma interface única, com navegação hierárquica, busca global, quick actions e mock data inicial para demonstração.

## Stack principal

- React 18 + Vite
- TypeScript
- Tailwind + shadcn/ui
- Supabase (Postgres, Auth, Edge Functions)
- Vitest + Testing Library
- Playwright para E2E
- Recharts para visualizações
- next-themes para tema claro/escuro

## Módulos atuais

- Dashboard operacional
- Produtos e composição
- Clientes e grupos econômicos
- Fornecedores
- Compras e Cotações
- Orçamentos / pedidos comerciais
- Ordens de venda
- Estoque e movimentações
- Fiscal (Entradas e Saídas)
- Financeiro (Pagar/Receber, Fluxo de Caixa)
- Contas bancárias e Plano de contas
- Relatórios (Estoque, Vendas, Financeiro)
- Remessas e rastreamento logístico (Integração Correios)
- [Migração de Dados](MIGRACAO.md)
- Preços Especiais (Regras de venda por cliente com aplicação automática)
- Configurações e Administração

## Como rodar localmente

```bash
npm install
npm run dev
```

Aplicação local padrão: `http://localhost:8080`

## Variáveis de ambiente

Crie um `.env` com as chaves do projeto Supabase.

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

> **Nota:** `VITE_SUPABASE_PROJECT_ID` **não é mais necessário**. A URL das Edge
> Functions é derivada automaticamente de `VITE_SUPABASE_URL`.

## Scripts úteis

```bash
npm run dev        # ambiente local
npm run build      # build de produção
npm run test       # testes unitários/integrados
npm run test:watch # modo watch
npm run lint       # lint (quando aplicável)
```

## Navegação implementada

A navegação foi reorganizada para reduzir poluição visual e manter contexto:

- Dashboard sempre visível com indicadores de saúde do negócio
- Seções hierárquicas por módulo: Operacional, Cadastros, Financeiro, Fiscal, Relatórios e Administração
- Sidebar colapsável no desktop e drawer no mobile
- Breadcrumb dinâmico no header
- Busca global com `Ctrl/Cmd + K`
- Atalho rápido para novo orçamento com `Ctrl/Cmd + N`
- Menu de ações rápidas no header e painel de notificações
- **Navegação stacked (Relacional)**: Detalhes de entidades (clientes, produtos, orçamentos, notas, remessas) abrem em drawers sobrepostos via `RelationalNavigationContext`, permitindo navegar entre registros vinculados sem perder o contexto da tela principal.

## Rotas e Submódulos

A navegação usa query strings para contextualizar submódulos:

- `/financeiro?tipo=pagar` | `tipo=receber`
- `/fiscal?tipo=entrada` | `tipo=saida` | `view=consulta`
- `/compras?view=cotacoes`
- `/estoque?view=movimentacoes`
- `/configuracoes?tab=empresa` | `tab=perfil` | `tab=usuarios`

## Persistência e Cache

### Estratégia geral

O sistema adota uma estratégia de **Cache Write-Through com sincronização cross-tab**:

1. **Fonte de verdade**: o banco de dados Supabase (`app_configuracoes`, `profiles`).
2. **Cache local**: `localStorage`, para garantir UI instantânea (*snappiness*) entre page-loads e durante indisponibilidade temporária do Supabase.
3. **Sincronização entre abas**: via evento nativo `window.storage`, qualquer alteração feita em uma aba é automaticamente refletida em todas as outras abas abertas no mesmo navegador.

### `useSyncedStorage` — o primitivo de cache

Localização: `src/hooks/useSyncedStorage.ts`

Hook de baixo nível que encapsula toda a lógica de persistência no `localStorage`:

```ts
const { value, set, remove } = useSyncedStorage(
  'sidebar_collapsed',   // chave lógica
  false,                 // valor padrão
  { namespace: 'user-pref:abc-123' }, // namespace (opcional)
);
```

**Características:**
- **Namespace**: a chave final no `localStorage` segue o formato `erp:<namespace>:<key>`, permitindo isolar grupos de dados (por módulo, por usuário, etc.).
- **Versionamento de esquema**: cada entrada é persistida em um envelope `{ v, data }` onde `v` é `STORAGE_SCHEMA_VERSION`. Se a versão lida do `localStorage` diferir da versão atual, a entrada é descartada automaticamente — evitando erros de runtime por dados desatualizados após um deploy.
- **Cross-tab sync**: escuta `window.addEventListener('storage', ...)`. Quando outra aba altera a mesma chave (escreve, atualiza ou remove), o estado desta aba é atualizado automaticamente sem necessidade de polling.
- **Sem chamadas de rede**: o hook é puramente de armazenamento local; a camada de persistência remota fica nos hooks de domínio.

### Como incrementar a versão do esquema

Edite a constante em `src/hooks/useSyncedStorage.ts`:

```ts
export const STORAGE_SCHEMA_VERSION = 2; // era 1
```

Na próxima vez que um usuário abrir o app, todas as entradas com `v !== 2` serão descartadas e os valores serão recarregados do Supabase.

### Hooks de domínio

| Hook | Namespace | Backend |
|------|-----------|---------|
| `useAppConfig(chave)` | `appconfig` | `app_configuracoes` |
| `useUserPreference(userId, key, default)` | `user-pref:<userId>` | `app_configuracoes` |

Ambos usam `useSyncedStorage` internamente e adicionam:
- Leitura inicial do Supabase (substituindo o cache).
- Persistência no Supabase ao salvar (`upsert`).
- Atualização otimista (estado local atualiza antes da confirmação do servidor).

### `AppConfigContext`

Localização: `src/contexts/AppConfigContext.tsx`

Contexto React que centraliza as configurações mais utilizadas (`cepEmpresa`, `sidebarCollapsed`). Útil para componentes que precisam de múltiplas configurações ao mesmo tempo:

```tsx
const { cepEmpresa, sidebarCollapsed, saveSidebarCollapsed } = useAppConfigContext();
```

O `AppConfigProvider` deve ser montado dentro do `AuthProvider` (pois depende do `user.id`) e está registrado em `App.tsx`.

### Migração de chaves legadas

As entradas antigas no `localStorage` usavam o formato `erp-user-pref:<userId>:<key>` sem envelope de versão. O hook `useUserPreference` executa uma migração automática na primeira montagem: lê a entrada legada, adota seu valor (se não houver já uma entrada versionada) e remove a chave antiga.

## Dados de exemplo / Seed de desenvolvimento

O projeto inclui um conjunto completo de dados de demonstração para testes ponta a ponta.
Os dados cobrem o fluxo completo: cadastros → cotações → compras → vendas → fiscal → financeiro → estoque → logística.

### Estrutura

```
supabase/seeds/
├── reset.sql   — Limpeza controlada de dados (DELETE em ordem reversa de FK)
└── seed.sql    — Inserção de dados de exemplo (schema-compatible)

scripts/
└── dev-reset-seed.js  — Script Node.js com proteção de ambiente
```

### Como usar (ambiente local)

> ⚠️ **ATENÇÃO**: Esses comandos apagam todos os dados operacionais do banco.
> Use **apenas** em ambiente de desenvolvimento local.

```bash
# Inicie o Supabase local (se ainda não estiver rodando)
supabase start

# Reset completo + seed (limpeza + inserção de dados de exemplo)
npm run dev:reset

# Somente limpeza (sem reinserir dados)
npm run seed:reset

# Somente inserção de dados (sem limpar antes)
npm run seed:data
```

### Proteções incluídas

- O script verifica se `NODE_ENV=production` e **interrompe** a execução
- O script verifica se `VITE_SUPABASE_URL` aponta para um banco remoto/produção e **interrompe** a execução
- Os scripts `seed:reset` e `seed:data` passam `--confirm` automaticamente por conveniência em dev local
- Para uso manual: `node scripts/dev-reset-seed.js --confirm` (o flag `--confirm` é obrigatório)

### O que os dados de exemplo incluem

- 3 transportadoras, 6 formas de pagamento, 2 grupos econômicos, 7 grupos de produto
- 6 clientes com perfis variados (excelente pagador, inadimplente, novo cliente, grande porte)
- 5 fornecedores com diferentes prazos e históricos
- 12 produtos em 7 categorias + BOM (composição de produtos)
- Cotações, compras, orçamentos, ordens de venda, notas fiscais
- Lançamentos financeiros (a receber / a pagar), baixas, movimentos de caixa
- Movimentos de estoque e remessas com rastreamento
- Comunicações com clientes

### Migrations vs. Seed

As migrations em `supabase/migrations/` gerenciam **evolução de schema** apenas.
O seed destrutivo que existia em `20260401200000_seed_completo.sql` foi removido;
esse arquivo agora é um marcador neutro. Para recriar dados de teste, use os
scripts acima conscientemente.

## Edge Functions e Integrações

### `correios-api`
Integração com a API REST dos Correios para:
- **Rastreamento** automático de objetos.
- **Cotação de frete** multi-serviço (SEDEX, PAC).
- **Cálculo de prazo** de entrega.

Requer secrets `CORREIOS_USUARIO` e `CORREIOS_SENHA` no Supabase. Sem eles, o sistema opera em modo de demonstração ou exibe avisos de indisponibilidade de serviço de forma graciosa.

### `process-email-queue`
Processamento assíncrono de notificações do sistema.

## Estrutura do Projeto

```text
src/
├── components/           # Componentes UI (shadcn, forms, layouts)
│   ├── Orcamento/        # Lógica comercial e grid de itens
│   ├── views/            # Detalhes de entidades para Drawer Stack
│   └── navigation/       # Menus e contextos de navegação
├── contexts/             # Auth, Theme, RelationalNavigation
├── hooks/                # useSupabaseCrud, useAppConfig, importação
├── integrations/         # Cliente Supabase e Tipos gerados
├── lib/                  # Utilitários, formatação e parsers de migração
├── services/             # Relatórios, Correios, API wrappers
└── types/                # Interfaces TypeScript globais
```
