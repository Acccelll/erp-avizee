

# Revisão Técnica e Funcional Completa — ERP AviZee

---

## 1. PROBLEMAS CRÍTICOS

### 1.1 Ausência de Foreign Keys no banco de dados
**Todas** as tabelas têm `No foreign keys` — `clientes`, `compras`, `financeiro_lancamentos`, `orcamentos`, etc. Nenhuma tabela possui constraints de referência.

**Impacto:** Integridade referencial não é garantida pelo banco. Registros órfãos podem existir (ex: lançamento financeiro com `cliente_id` apontando para um cliente deletado). Soft delete de um cliente não propaga para orçamentos ou financeiro.

**Como melhorar:** Adicionar foreign keys com `ON DELETE SET NULL` ou `ON DELETE RESTRICT` para relações críticas (cliente_id, fornecedor_id, produto_id, orcamento_id, etc.).

### 1.2 Supabase 1000-row default limit não tratado
O `useSupabaseCrud` faz `select()` sem limite explícito. Supabase retorna no máximo 1000 linhas. O hook não sinaliza quando esse teto é atingido.

**Impacto:** Módulos como Financeiro, Estoque e Produtos vão silenciosamente perder dados acima de 1000 registros. O Dashboard, que faz queries separadas (ex: `buildFinQuery`), também é afetado.

**Como melhorar:** Usar `count: 'exact'` nas queries e implementar paginação server-side real quando os dados crescerem, ou ao menos `.limit(10000)` com aviso visual.

### 1.3 Dashboard carrega TODOS os dados em paralelo sem paginação
`Index.tsx` dispara ~10 queries em paralelo (contagens, orçamentos, compras, estoque baixo, backlog, etc.), todas sem limit adequado em algumas queries. Conforme o volume cresce, isso vai degradar severamente.

**Impacto:** Lentidão no carregamento inicial. Timeout com volumes maiores. Pressão desnecessária no banco.

**Como melhorar:** Mover cálculos agregados para views ou database functions (`rpc`). Usar counts ao invés de `select("valor")` quando só precisa somar.

### 1.4 Fiscal.tsx com 1190 linhas — God Component
O módulo Fiscal (`Fiscal.tsx`) tem **1190 linhas** em um único arquivo, misturando formulário, drawer de visualização, importação de XML, DANFE viewer, criação de NF com itens, e lógica de devolução.

**Impacto:** Manutenção extremamente difícil. Alta probabilidade de regressões. Testes praticamente impossíveis.

**Como melhorar:** Extrair em sub-componentes: `NotaFiscalForm`, `NotaFiscalDrawer`, `ImportXmlDialog`, `DevolucaoDialog`. Padrão similar ao que o `OrcamentoForm` fez com `OrcamentoItemsGrid`, `OrcamentoTotaisCard`, etc.

---

## 2. PROBLEMAS RELEVANTES

### 2.1 Uso massivo de `as any` (481 ocorrências em 29 arquivos)
O memory diz "zero any", mas há **481 usos de `as any`** no projeto. Concentrados em:
- `Financeiro.tsx` — queries Supabase com casting forçado
- `Funcionarios.tsx` — todo o CRUD feito com `as any`
- Hooks de importação — dados sem tipagem
- `useSupabaseCrud` — `table as any`, `record as any`

**Impacto:** Erros de dados silenciosos. Intellisense inútil. Contratos quebrados entre frontend e schema.

**Como melhorar:** Usar os tipos gerados (`Tables<"tabela">`) que já existem no projeto. O hook `useSupabaseCrud` poderia receber o tipo da tabela como generic para gerar tipagem correta.

### 2.2 Financeiro.tsx (853 linhas) — formulário, drawer, baixas, estorno, calendário, tudo junto
Similar ao Fiscal, o Financeiro concentra lógica demais em um só arquivo.

**Impacto:** Difícil iterar em funcionalidades individualmente. Baixas parciais, estorno e geração de parcelas estão acoplados ao componente de página.

### 2.3 Dados carregados no cliente e filtrados em memória
Todos os módulos (Clientes, Produtos, Compras, Financeiro) carregam todos os registros e filtram com `useMemo` no frontend.

**Impacto:** Funciona para poucos registros, mas não escala. Com 5000+ clientes ou produtos, o carregamento será lento.

**Como melhorar:** Mover filtros para queries Supabase (ilike, eq) e usar debounce na busca textual.

### 2.4 `duplicate()` no useSupabaseCrud é frágil
O método `duplicate` copia todos os campos e remove `id`, `created_at`, `updated_at`. Mas faz mutações heurísticas: se `numero` existe, adiciona "-CPY". Não copia relações filhas (itens de orçamento, composições de produto, etc.).

**Impacto:** Duplicar uma compra ou orçamento cria um registro sem itens. Duplicar um produto composto cria sem composição.

### 2.5 Formulários sem validação robusta
Os formulários usam verificação mínima (`if (!form.nome)`). Não há validação de e-mail, CPF/CNPJ, CEP, telefone, valores numéricos negativos, datas inválidas, etc.

**Impacto:** Dados inconsistentes no banco. UX confusa quando o erro acontece no backend.

**Como melhorar:** Usar Zod ou validação no submit com feedback por campo. Os validators já existem em `src/lib/validators.ts` mas não são usados nos formulários.

### 2.6 Estoque não tem movimentação integrada
A movimentação de estoque (`estoque_movimentos`) é feita manualmente. Não há trigger ou lógica que conecte uma compra entregue, uma NF de entrada ou uma OV faturada à movimentação automática de estoque.

**Impacto:** Estoque desatualizado se o operador esquecer de registrar entrada/saída manual.

### 2.7 Configurações usa `useTheme` de `next-themes` sem wrapper
`Configuracoes.tsx` importa `useTheme` de `next-themes`, mas o app usa um `ThemeProvider` customizado. Pode funcionar se o ThemeProvider wrapper o next-themes, mas é um acoplamento implícito.

---

## 3. PROBLEMAS LEVES

### 3.1 Inconsistência de padrão de View entre módulos
- **Clientes, Produtos, Fornecedores, Orçamentos**: usam `RelationalDrawerStack` (drawers empilháveis via `pushView`)
- **Compras, Fiscal, Financeiro, Estoque**: usam `ViewDrawerV2` ou `ViewDrawer` inline com estado local (`drawerOpen`)
- **OrdensVenda**: também usa `ViewDrawerV2` inline

**Impacto:** Experiência inconsistente. Em alguns módulos, clicar em um link relacional abre drawer empilhável; em outros, não há essa possibilidade.

### 3.2 DataTable renderActions só mostra "Visualizar"
A `renderActions` do DataTable mostra apenas o botão "Eye" (Visualizar). Embora `onEdit`, `onDelete` e `onDuplicate` sejam props aceitas, os botões correspondentes não são renderizados na tabela — ficam acessíveis apenas indiretamente.

**Impacto:** Fluxo de edição e exclusão pouco acessível. O usuário precisa abrir drawer e depois editar.

### 3.3 Página Pedidos é apenas agregadora — sem ações
`Pedidos.tsx` exibe uma visão consolidada de cotações confirmadas + OVs, mas não permite nenhuma ação além de clicar para navegar. Não há filtros, busca ou ações em lote.

### 3.4 Grupos de produto não são associados no formulário
O formulário de Produtos carrega `grupos_produto` mas não tem um campo Select para associar o `grupo_id`.

### 3.5 `emptyCliente` e `emptyForm` como objetos mutáveis
Vários módulos definem constantes `emptyForm` como objetos literais (`Record<string, any>`) fora do componente. Como são passados via spread `{ ...emptyForm }`, não há bug real, mas a tipagem `Record<string, any>` anula a segurança.

---

## 4. MELHORIAS RECOMENDADAS

### 4.1 Arquitetura: Extrair lógica de negócio dos page components
Criar services para Financeiro (`financeiro.service.ts`), Fiscal (`fiscal.service.ts`) e Estoque (`estoque.service.ts`) com funções como `realizarBaixa()`, `estornarLancamento()`, `processarNFEntrada()`. Os page components devem orquestrar UI, não lógica.

### 4.2 Paginação server-side no useSupabaseCrud
Já existe `pageSize` e `page` no hook, mas não é usado por nenhum módulo. Ativar paginação real para tabelas com potencial de crescimento.

### 4.3 Movimentação de estoque automática
Implementar triggers de banco ou RPCs que criem `estoque_movimentos` automaticamente ao confirmar uma compra ou faturar uma OV.

### 4.4 Implementar optimistic updates
O hook `useSupabaseCrud` faz `fetchData()` após cada `create`/`update`/`remove`, re-carregando toda a tabela. Para UX mais fluida, usar optimistic updates com rollback em erro.

### 4.5 Centralizar esquema de status
Status de orçamentos, compras, OVs, NFs e financeiro são strings hardcoded em múltiplos arquivos com labels diferentes. Centralizar em um arquivo `src/lib/statusSchema.ts`.

### 4.6 Relatório DRE e Fluxo de Caixa como database views
Os relatórios mais complexos (DRE, Fluxo de Caixa, Aging) fazem múltiplas queries no frontend e montam dados manualmente. Mover para database views ou functions daria performance e consistência.

### 4.7 Adicionar campo de grupo_id no formulário de Produtos
O formulário de produto carrega os grupos mas não tem o Select para selecionar o grupo.

---

## 5. PONTOS POSITIVOS

### 5.1 Navegação relacional bem implementada
O `RelationalNavigationContext` com `RelationalDrawerStack` é uma solução elegante para navegar entre entidades sem perder contexto. O `RelationalLink` facilita a adoção em views.

### 5.2 Sidebar bem organizada com seções lógicas
A `lib/navigation.ts` centraliza toda a estrutura de navegação de forma declarativa, incluindo keywords para busca global, ícones e agrupamentos. É fácil de manter e estender.

### 5.3 AdvancedFilterBar com chips é padrão consistente
O componente `AdvancedFilterBar` com `MultiSelect` e chips ativos dá uma UX consistente entre módulos. A implementação é reusável e bem padronizada.

### 5.4 Soft delete generalizado
O `useSupabaseCrud` com `hasAtivo` e soft delete por padrão é uma boa prática que preserva integridade de dados e permite recuperação.

### 5.5 Integração Correios funcional
A edge function `correios-api` com autenticação, cotação multi-serviço e fallback está bem implementada. O rastreamento com deduplicação de eventos no frontend é um bom pattern.

### 5.6 Lazy loading e code splitting
Todas as rotas usam `lazy()` + `Suspense`, o que mantém o bundle inicial pequeno.

### 5.7 Módulo de relatórios abrangente
15 tipos de relatório com exportação CSV, XLSX e PDF dinâmico. A arquitetura de `carregarRelatorio()` com switch de tipo é extensível.

### 5.8 Auditoria e RBAC
O sistema de roles com `has_role()` security definer + `user_roles` table separada segue as melhores práticas. A auditoria com diff JSON é um diferencial.

---

## Resumo de Prioridades

| Prioridade | Ação | Esforço |
|---|---|---|
| **Alta** | Adicionar foreign keys | Médio |
| **Alta** | Tratar limite de 1000 rows | Baixo |
| **Alta** | Extrair Fiscal.tsx e Financeiro.tsx | Alto |
| **Média** | Reduzir `as any` — usar `Tables<>` | Médio |
| **Média** | Server-side filtering/search | Médio |
| **Média** | Automação estoque ↔ compras/NF | Alto |
| **Baixa** | Padronizar Views (drawer stack) | Médio |
| **Baixa** | Validação de formulários com Zod | Médio |

