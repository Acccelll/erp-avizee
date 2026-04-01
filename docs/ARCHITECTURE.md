# Arquitetura — ERP AviZee

Este documento descreve a arquitetura técnica do ERP AviZee com diagramas Mermaid renderizáveis diretamente no GitHub.

---

## 1. Visão Geral da Arquitetura

O sistema é uma SPA (Single Page Application) React que se comunica exclusivamente com o Supabase como backend. Não há servidor intermediário: toda a lógica de negócio crítica que precisa ser protegida vive em Edge Functions Deno (serverless) ou em políticas de banco de dados (RLS + funções PL/pgSQL).

```mermaid
graph TB
    subgraph Browser["Navegador (SPA React + Vite)"]
        direction TB
        UI["Componentes UI\n(shadcn/ui, Radix, Tailwind)"]
        Hooks["Hooks de domínio\n(useSupabaseCrud,\nuseSyncedStorage, etc.)"]
        Ctx["Contextos React\n(AuthContext,\nAppConfigContext,\nRelationalNavigationContext)"]
        RQ["@tanstack/react-query\n(cache de servidor)"]
        LS["localStorage\n(useSyncedStorage)"]
    end

    subgraph Supabase["Supabase (BaaS)"]
        direction TB
        Auth["Auth\n(JWT, OAuth)"]
        DB["PostgreSQL\n(RLS habilitado)"]
        Storage["Storage\n(arquivos/anexos)"]
        RT["Realtime\n(subscriptions)"]
        EF["Edge Functions (Deno)\n• correios-api\n• process-email-queue"]
    end

    subgraph External["APIs Externas"]
        Correios["API Correios\n(rastreamento / frete)"]
        ViaCEP["ViaCEP\n(endereços)"]
        Email["Email Provider\n(@lovable.dev/email-js)"]
    end

    UI -->|"usa"| Hooks
    UI -->|"lê"| Ctx
    Hooks -->|"persiste"| LS
    Hooks -->|"requisições"| RQ
    RQ -->|"supabase-js SDK"| DB
    RQ -->|"supabase-js SDK"| Auth
    Ctx -->|"supabase-js SDK"| Auth
    EF -->|"HTTP"| Correios
    EF -->|"HTTP"| Email
    Hooks -->|"invoca"| EF
    DB -->|"triggers / notify"| RT
    RT -->|"WebSocket"| Hooks

    classDef browser fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a
    classDef supa fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef ext fill:#fef9c3,stroke:#ca8a04,color:#713f12
    class UI,Hooks,Ctx,RQ,LS browser
    class Auth,DB,Storage,RT,EF supa
    class Correios,ViaCEP,Email ext
```

---

## 2. Fluxo de Autenticação e Autorização

O Supabase Auth gerencia sessões via JWT. O controle de acesso ao banco opera em duas camadas: RLS (qual linha o usuário pode ver/alterar) e RBAC via `user_roles` (qual funcionalidade o usuário pode acessar na UI).

```mermaid
sequenceDiagram
    actor U as Usuário
    participant L as Login.tsx
    participant AC as AuthContext
    participant SA as supabase.auth
    participant DB as PostgreSQL (RLS)
    participant PR as ProtectedRoute

    U->>L: Preenche e-mail + senha
    L->>SA: signInWithPassword(email, pwd)
    SA-->>AC: onAuthStateChange(SIGNED_IN, session)
    AC->>DB: SELECT FROM profiles WHERE id = user.id
    AC->>DB: SELECT role FROM user_roles WHERE user_id = user.id
    DB-->>AC: { profile, roles[] }
    AC-->>L: { user, session, profile, roles }

    U->>PR: Tenta acessar rota protegida
    PR->>AC: useAuth() → { user, roles }
    alt Não autenticado
        PR-->>U: Redireciona /login
    else Autenticado sem permissão
        PR-->>U: Redireciona /dashboard (403)
    else Autenticado com permissão
        PR-->>U: Renderiza a página
    end

    Note over DB: Cada query ao DB passa pelo RLS.<br/>auth.uid() é verificado em toda política.<br/>has_role(uid, role) verifica user_roles.
```

### Papéis e Permissões

```mermaid
graph LR
    subgraph Roles["Papéis (app_role)"]
        ADM["admin\n(acesso total)"]
        MOD["moderator"]
        USR["user"]
        VND["vendedor"]
        FIN["financeiro"]
        EST["estoquista"]
    end

    subgraph Módulos
        COM["Comercial\n(orçamentos, OV)"]
        FNC["Financeiro\n(pagar/receber)"]
        STK["Estoque"]
        FSC["Fiscal"]
        ADM2["Administração"]
    end

    ADM --> COM & FNC & STK & FSC & ADM2
    MOD --> COM & FNC & STK & FSC
    VND --> COM
    FIN --> FNC & FSC
    EST --> STK
```

---

## 3. Modelo de Dados Principal

Diagrama de entidades e relacionamentos para os módulos mais críticos do sistema.

```mermaid
erDiagram
    profiles {
        uuid id PK
        text nome
        text email
        text cargo
        text avatar_url
    }

    clientes {
        uuid id PK
        text razao_social
        text cnpj
        uuid grupo_economico_id FK
        text status
    }

    fornecedores {
        uuid id PK
        text razao_social
        text cnpj
    }

    produtos {
        uuid id PK
        text nome
        text sku
        text grupo
        numeric preco_venda
        numeric preco_custo
        numeric estoque_atual
    }

    orcamentos {
        uuid id PK
        text numero
        uuid cliente_id FK
        date data_orcamento
        date validade
        numeric valor_total
        text status
        jsonb cliente_snapshot
    }

    orcamento_itens {
        uuid id PK
        uuid orcamento_id FK
        uuid produto_id FK
        numeric quantidade
        numeric valor_unitario
        numeric valor_total
        jsonb impostos
    }

    ordens_venda {
        uuid id PK
        text numero
        uuid orcamento_id FK
        uuid cliente_id FK
        numeric valor_total
        text status
    }

    notas_fiscais {
        uuid id PK
        text numero
        text serie
        uuid ordem_venda_id FK
        text status
        numeric valor_total
    }

    pedidos_compra {
        uuid id PK
        text numero
        uuid fornecedor_id FK
        numeric valor_total
        text status
    }

    estoque_movimentos {
        uuid id PK
        uuid produto_id FK
        text tipo
        numeric quantidade
        text origem
        uuid origem_id
    }

    remessas {
        uuid id PK
        text codigo_rastreio
        uuid ordem_venda_id FK
        text status
    }

    financeiro_lancamentos {
        uuid id PK
        text tipo
        uuid cliente_id FK
        uuid fornecedor_id FK
        numeric valor
        date vencimento
        text status
    }

    clientes ||--o{ orcamentos : "realiza"
    orcamentos ||--o{ orcamento_itens : "contém"
    produtos ||--o{ orcamento_itens : "referenciado em"
    orcamentos ||--o| ordens_venda : "convertido em"
    ordens_venda ||--o{ notas_fiscais : "fatura"
    ordens_venda ||--o{ remessas : "enviado via"
    fornecedores ||--o{ pedidos_compra : "fornece"
    produtos ||--o{ estoque_movimentos : "movimenta"
    clientes ||--o{ financeiro_lancamentos : "deve/paga"
    fornecedores ||--o{ financeiro_lancamentos : "recebe"
```

---

## 4. Fluxo de Navegação e Contexto de Estado

### Contextos React e suas responsabilidades

```mermaid
graph TB
    subgraph App["App.tsx (raiz)"]
        BrowserRouter["BrowserRouter"]
        subgraph Providers["Pilha de Providers (ordem importa)"]
            ThmP["ThemeProvider\n(next-themes)"]
            AuthP["AuthProvider\n(AuthContext)"]
            AppCP["AppConfigProvider\n(AppConfigContext)"]
            RelNavP["RelationalNavigationProvider\n(RelationalNavigationContext)"]
            QryP["QueryClientProvider\n(@tanstack/react-query)"]
        end
    end

    subgraph Routing["Roteamento (react-router-dom v6)"]
        PrRoute["ProtectedRoute\n(verifica auth)"]
        AdmRoute["AdminRoute\n(verifica role:admin)"]
        Pages["Páginas\n(38 rotas)"]
    end

    subgraph DrawerStack["Sistema de Drawers"]
        RDS["RelationalDrawerStack\n(renderiza drawers empilhados)"]
        Views["Views especializadas\n(OrcamentoView, ClienteView,\nProdutoView, etc.)"]
    end

    BrowserRouter --> ThmP --> AuthP --> AppCP --> RelNavP --> QryP
    QryP --> PrRoute --> Pages
    PrRoute --> AdmRoute
    Pages -->|"pushView(type, id)"| RelNavP
    RelNavP -->|"stack[]"| RDS
    RDS --> Views
```

### Fluxo de navegação por drawer

```mermaid
stateDiagram-v2
    [*] --> Vazio : Página carregada
    Vazio --> Depth1 : pushView(type, id)
    Depth1 --> Depth2 : pushView(type, id)
    Depth2 --> Depth3 : pushView(type, id)
    Depth3 --> Depth4 : pushView(type, id)
    Depth4 --> Depth5 : pushView(type, id)\n[canPush = false]
    Depth5 --> Depth5 : pushView(type, id)\n[jump: remove mais antigo,\nadiciona novo no topo]
    Depth5 --> Depth4 : ESC / popView()
    Depth4 --> Depth3 : ESC / popView()
    Depth3 --> Depth2 : ESC / popView()
    Depth2 --> Depth1 : ESC / popView()
    Depth1 --> Vazio : ESC / popView()
    Depth5 --> Vazio : Shift+ESC / clearStack()
    Depth4 --> Vazio : Shift+ESC / clearStack()
    Depth3 --> Vazio : Shift+ESC / clearStack()
    Depth2 --> Vazio : Shift+ESC / clearStack()
    Depth1 --> Vazio : Shift+ESC / clearStack()
```

### Sincronização de cache (useSyncedStorage)

```mermaid
flowchart LR
    subgraph Tab1["Aba 1"]
        H1["useSyncedStorage\n('sidebar_collapsed')"]
        LS1["localStorage\n'erp:user-pref:id:sidebar_collapsed'"]
        Sub1["onAuthStateChange"]
    end
    subgraph Tab2["Aba 2"]
        H2["useSyncedStorage\n('sidebar_collapsed')"]
        LS2["localStorage\n(mesma origem)"]
    end
    subgraph Supa["Supabase"]
        DB2["app_configuracoes"]
    end

    H1 -->|"set(value)"| LS1
    LS1 -->|"StorageEvent"| H2
    H1 -->|"upsert"| DB2
    DB2 -->|"leitura inicial (mount)"| H1
    Sub1 -->|"user.id muda"| H1
```

---

## 5. Diagrama de Sequência — Criação de Orçamento

Fluxo completo desde a interação do usuário até a persistência no banco, incluindo cache, Edge Functions opcionais e atualização da UI.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant Form as OrcamentoForm.tsx
    participant RQ as React Query\n(QueryClient)
    participant LS as localStorage\n(useSyncedStorage)
    participant SB as Supabase\n(PostgreSQL)
    participant CF as correios-api\n(Edge Function)
    participant Stack as RelationalDrawerStack

    Note over Form: Usuário preenche cabeçalho,<br/>items e condições

    U->>Form: Seleciona produto na grade de itens
    Form->>RQ: useQuery('produtos') — hit no cache?
    alt Cache hit (< staleTime)
        RQ-->>Form: dados do cache
    else Cache miss / stale
        RQ->>SB: SELECT * FROM produtos WHERE ativo = true
        SB-->>RQ: rows
        RQ-->>Form: dados atualizados
    end

    U->>Form: Solicita cotação de frete (CEP destino)
    Form->>CF: POST /correios-api { cepOrigem, cepDestino, peso }
    CF-->>Form: { sedex: R$X, pac: R$Y, prazo: Nd }

    U->>Form: Clica "Salvar"
    Form->>SB: INSERT INTO orcamentos (...)
    SB-->>Form: { id, numero, ... }
    Form->>SB: INSERT INTO orcamento_itens [...] (bulk)
    SB-->>Form: ok

    Form->>RQ: invalidateQueries('orcamentos')
    RQ->>SB: SELECT * FROM orcamentos (refetch)
    SB-->>RQ: lista atualizada
    RQ-->>Form: re-render lista com novo orçamento

    Note over LS: cepEmpresa salvo em<br/>localStorage para próxima cotação

    U->>Form: Clica no número do orçamento criado
    Form->>Stack: pushView('orcamento', id)
    Stack-->>U: Abre OrcamentoView em drawer
```

---

## Decisões de Arquitetura (ADRs)

| # | Decisão | Motivação |
|---|---------|-----------|
| 1 | **Supabase como único backend** | Reduz infraestrutura, RLS garante segurança por linha, Auth gerenciado, Edge Functions para lógica protegida |
| 2 | **Cache write-through com localStorage** | UI instantânea entre page-loads; cross-tab sync nativo via `StorageEvent` |
| 3 | **Sem Redux/Zustand** | React Query gerencia cache de servidor; contextos cobrem estado de UI global; complexidade controlada |
| 4 | **Drawers empilhados (RelationalNavigation)** | Permite navegar entre entidades vinculadas sem perder contexto da página principal |
| 5 | **URL como fonte de verdade para drawers** | Permite compartilhar links com estado de navegação, bookmarking e histórico do browser |
| 6 | **Edge Functions apenas para lógica sensível** | Lógica de negócio que requer secrets (Correios, email) fica isolada no servidor; o resto é client-side |
| 7 | **shadcn/ui (cópia local de componentes)** | Controle total sobre o código dos componentes; sem lock-in de versão de biblioteca de UI |
