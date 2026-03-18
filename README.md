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
- Compras
- Orçamentos / pedidos comerciais
- Ordens de venda
- Estoque e movimentações
- Fiscal
- Financeiro
- Fluxo de caixa
- Contas bancárias
- Plano de contas
- Relatórios
- Configurações

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

- Dashboard sempre visível
- Seções hierárquicas por módulo
  - Operacional
  - Cadastros
  - Financeiro
  - Fiscal
  - Relatórios
  - Administração
- Sidebar colapsável no desktop e drawer no mobile
- Breadcrumb dinâmico no header
- Busca global com `Ctrl/Cmd + K`
- Atalho rápido para novo orçamento com `Ctrl/Cmd + N`
- Menu de ações rápidas no header
- Painel de notificações
- Perfil do usuário e alternância de tema

## Rotas de apoio criadas

- `/pedidos`
- `/relatorios`
- `/configuracoes`

Além disso, a navegação usa query strings para contextualizar submódulos:

- `/financeiro?tipo=pagar`
- `/financeiro?tipo=receber`
- `/fiscal?tipo=entrada`
- `/fiscal?tipo=saida`
- `/fiscal?view=consulta`
- `/relatorios?tipo=vendas`
- `/configuracoes?tab=usuarios`
- `/compras?view=cotacoes`
- `/estoque?view=movimentacoes`

## Mock data / seed inicial

Foi adicionada a migration:

- `supabase/migrations/20260317030000_seed_mock_data.sql`

Ela preenche o ERP com dados de demonstração para:

- contas contábeis
- grupos de produto
- produtos simples e compostos
- grupos econômicos
- clientes
- fornecedores
- vínculos produto-fornecedor
- bancos e contas bancárias
- compras e itens
- orçamentos e itens
- ordens de venda e itens
- notas fiscais e itens
- financeiro
- caixa
- movimentações de estoque
- registros de comunicação com clientes

### Aplicando as migrations

```bash
supabase db push
```

ou, em ambiente local Supabase:

```bash
supabase start
supabase db reset
```

## Configurações

A página `/configuracoes` está organizada por abas:

- Geral
- Usuários
- E-mail
- Fiscal
- Financeiro
- Aparência

Nesta fase, os parâmetros continuam com persistência local no navegador. A tabela `app_configuracoes` permanece preparada para persistência futura no Supabase.

## Relatórios

O módulo de relatórios entrega uma primeira versão com:

- posição de estoque
- contas a pagar/receber
- fluxo de caixa
- vendas por período
- compras por fornecedor
- exportação CSV
- impressão / PDF via navegador

## Estrutura sugerida

```text
src/
├── components/
│   ├── navigation/
│   └── theme/
├── contexts/
├── hooks/
├── integrations/
├── lib/
├── mocks/
├── pages/
├── services/
└── test/
```

## Supabase e tipos

Para atualizar os tipos gerados do banco:

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Edge Functions

Atualmente existe a função:

- `supabase/functions/process-email-queue`

Próximo passo recomendado: criar a Edge Function de geração server-side do PDF de orçamento.

## CI

O repositório possui workflow em `.github/workflows/ci.yml` para executar testes e build a cada push e pull request.
