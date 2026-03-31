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

As preferências de usuário (nome, cargo, senha, tema) são persistidas diretamente no Supabase via tabela `profiles`. Configurações funcionais do sistema como CEP da empresa são armazenadas na tabela `app_configuracoes`, que atua como a única fonte de verdade.

O sistema utiliza uma estratégia de **Cache Write-Through**: o `localStorage` armazena temporariamente configurações para garantir uma UI instantânea (snappiness), mas todas as alterações são sincronizadas com o banco de dados.

## Mock data / seed inicial

O projeto inclui um conjunto completo de dados de demonstração em:
- `supabase/migrations/20260317030000_seed_mock_data.sql`

Para aplicar (ambiente local):
```bash
supabase start
supabase db reset
```

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
