# Guia de Desenvolvimento — ERP AviZee

Referência prática para desenvolvedores que trabalham no projeto. Presume conhecimento de React, TypeScript e SQL.

> Leia também: [ARCHITECTURE.md](./ARCHITECTURE.md) e [RLS_POLICIES.md](./RLS_POLICIES.md)

---

## Índice

1. [Setup inicial](#1-setup-inicial)
2. [Como adicionar um novo módulo](#2-como-adicionar-um-novo-módulo)
3. [Estratégia de migrations](#3-estratégia-de-migrations)
4. [Como trabalhar com Edge Functions localmente](#4-como-trabalhar-com-edge-functions-localmente)
5. [Testes — guia rápido](#5-testes--guia-rápido)
6. [Convenções de código](#6-convenções-de-código)
7. [Troubleshooting frequente](#7-troubleshooting-frequente)

---

## 1. Setup Inicial

```bash
# 1. Clone o repositório
git clone https://github.com/Acccelll/erp-avizee.git
cd erp-avizee

# 2. Instale as dependências (também instala os Git hooks via husky)
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env     # edite com as chaves do seu projeto Supabase
# VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# 4. (Opcional) Popule dados de exemplo
npm run dev:reset        # reset + seed — apenas em ambiente local!

# 5. Inicie o servidor de desenvolvimento
npm run dev              # http://localhost:8080
```

### Pré-requisitos

| Ferramenta | Versão mínima | Uso |
|---|---|---|
| Node.js | 20 LTS | Runtime de desenvolvimento |
| npm | 10 | Gerenciador de pacotes |
| Supabase CLI | 1.x | Migrations e Edge Functions locais |
| Docker | 24+ | Supabase local (opcional) |

---

## 2. Como Adicionar um Novo Módulo

Um "módulo" típico no ERP AviZee é composto por uma **página de listagem**, um **formulário de criação/edição**, uma **view para drawer relacional** e os **tipos TypeScript** correspondentes.

### Passo a passo

#### 1. Crie os tipos TypeScript

Adicione a interface da entidade em `src/types/` (se for uma entidade de banco) ou defina próximo ao componente que a usa:

```ts
// src/types/minha-entidade.ts
export interface MinhaEntidade {
  id: string;
  nome: string;
  status: "ativo" | "inativo";
  created_at: string;
}
```

#### 2. Crie a página de listagem

```bash
touch src/pages/MinhaEntidade.tsx
```

Estrutura padrão de uma página de listagem:

```tsx
// src/pages/MinhaEntidade.tsx
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";

export default function MinhaEntidade() {
  const { data, loading, refresh } = useSupabaseCrud<MinhaEntidade>("minha_entidade");

  return (
    <ModulePage title="Minha Entidade">
      <DataTable
        data={data ?? []}
        loading={loading}
        columns={[
          { key: "nome", label: "Nome" },
          { key: "status", label: "Status" },
        ]}
      />
    </ModulePage>
  );
}
```

#### 3. Registre a rota em `App.tsx`

```tsx
// src/App.tsx
import MinhaEntidade from "@/pages/MinhaEntidade";

// Dentro do <Routes>:
<Route path="/minha-entidade" element={
  <ProtectedRoute>
    <MinhaEntidade />
  </ProtectedRoute>
} />
```

#### 4. Adicione ao menu lateral (`AppSidebar.tsx`)

Encontre a seção apropriada em `src/components/AppSidebar.tsx` e adicione o item:

```tsx
{
  title: "Minha Entidade",
  href: "/minha-entidade",
  icon: BoxIcon,          // ícone de lucide-react
}
```

#### 5. Crie a view para drawer relacional (opcional)

Se a entidade precisa ser acessível via drawer a partir de outras páginas:

```bash
touch src/components/views/MinhaEntidadeView.tsx
```

Registre o novo `EntityType` em `src/contexts/RelationalNavigationContext.tsx`:

```ts
export type EntityType =
  | "produto" | "cliente" | /* ... outros */ | "minha_entidade";
```

E adicione o case no componente `RelationalDrawerStack.tsx`:

```tsx
case "minha_entidade":
  return <MinhaEntidadeView id={view.id} />;
```

#### 6. Escreva testes

- **Funções puras** (cálculos, formatadores) → `src/lib/minha-entidade.test.ts`
- **Hooks** → `src/hooks/__tests__/useMinhaEntidade.test.ts`
- **Fluxo de negócio** → `src/tests/integration/fluxo-minha-entidade.test.ts`

---

## 3. Estratégia de Migrations

As migrations gerenciam **exclusivamente o schema** do banco de dados. Dados de seed não pertencem a migrations.

### Criar uma nova migration

```bash
# Com o Supabase CLI instalado e projeto local rodando:
supabase migration new descricao_da_mudanca

# Isso cria: supabase/migrations/<timestamp>_descricao_da_mudanca.sql
```

### Convenções de nomenclatura

| Padrão | Uso |
|---|---|
| `<timestamp>_add_<tabela>.sql` | Nova tabela |
| `<timestamp>_alter_<tabela>_<campo>.sql` | Alteração de coluna |
| `<timestamp>_rls_<modulo>.sql` | Políticas RLS para um módulo |
| `<timestamp>_<nome_descritivo>.sql` | Caso geral |

### Template de migration segura

```sql
-- Descrição: Adiciona tabela X para suportar feature Y
-- Autor: @seu-usuario
-- Data: YYYY-MM-DD

-- ── Tabela ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.minha_entidade (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  status      text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_minha_entidade_status ON public.minha_entidade (status);

-- ── Updated_at automático ───────────────────────────────────────────────────
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.minha_entidade
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.minha_entidade ENABLE ROW LEVEL SECURITY;

-- Leitura: todos os usuários autenticados
CREATE POLICY "minha_entidade_select" ON public.minha_entidade
  FOR SELECT USING (auth.role() = 'authenticated');

-- Escrita: apenas admin e moderator
CREATE POLICY "minha_entidade_insert" ON public.minha_entidade
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "minha_entidade_update" ON public.minha_entidade
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "minha_entidade_delete" ON public.minha_entidade
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
```

### Regras

- **Nunca** use `DROP TABLE` sem `IF EXISTS` e sem uma migration reversa documentada
- **Nunca** insira dados de produção/seed em migrations — use `supabase/seeds/`
- Teste a migration em ambiente local antes de abrir PR:
  ```bash
  supabase db reset          # aplica todas as migrations do zero
  supabase db push           # aplica apenas as migrations pendentes
  ```
- Documente políticas RLS em `docs/RLS_POLICIES.md` quando adicionadas

### Aplicar migrations em ambiente local

```bash
# Subir Supabase local
supabase start

# Aplicar migrations pendentes
supabase db push

# Verificar status das migrations
supabase migration list
```

### Rollback

O Supabase não tem rollback automático. Para reverter:

```bash
# Crie uma migration reversa explícita
supabase migration new rollback_descricao_da_mudanca
# No arquivo gerado, escreva o SQL inverso (DROP COLUMN, DROP TABLE, etc.)
supabase db push
```

---

## 4. Como Trabalhar com Edge Functions Localmente

### Pré-requisitos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar o ambiente local (Docker necessário)
supabase start
```

### Criar uma nova Edge Function

```bash
supabase functions new minha-funcao
# Cria: supabase/functions/minha-funcao/index.ts
```

### Template de Edge Function

```ts
// supabase/functions/minha-funcao/index.ts
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "https://meu-app.vercel.app",
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";

  // Responde ao preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
      },
    });
  }

  try {
    // Valida autenticação (JWT do Supabase)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data } = await req.json();

    // Lógica da função aqui
    const result = { ok: true, received: data };

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### Rodar localmente (com hot-reload)

```bash
supabase functions serve minha-funcao --env-file .env.local
```

A função fica disponível em: `http://localhost:54321/functions/v1/minha-funcao`

### Variáveis de ambiente / secrets

```bash
# Em produção (Supabase Cloud):
supabase secrets set MINHA_API_KEY=valor_secreto

# Localmente: crie .env.local (não versione!)
echo "MINHA_API_KEY=valor_dev" >> .env.local
```

### Invocar a função a partir do frontend

```ts
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke("minha-funcao", {
  body: { campo: "valor" },
});
```

### Deploy

```bash
# Deploy de uma função específica
supabase functions deploy minha-funcao

# Deploy de todas as funções
supabase functions deploy
```

### Funções existentes

| Função | Arquivo | Responsabilidade |
|---|---|---|
| `correios-api` | `supabase/functions/correios-api/index.ts` | Rastreamento e cotação de frete via API dos Correios |
| `process-email-queue` | `supabase/functions/process-email-queue/index.ts` | Processamento assíncrono da fila de e-mails |

---

## 5. Testes — Guia Rápido

### Rodar todos os testes

```bash
npm run test:all          # unit + integration + e2e
```

### Testes unitários (Vitest)

```bash
npm run test:unit         # execução única
npm run test:watch        # modo watch (recomendado durante desenvolvimento)
```

Localização: `src/**/*.test.ts`

#### Escrever um teste unitário

```ts
// src/lib/minha-entidade.test.ts
import { describe, it, expect } from "vitest";
import { calcularAlgo } from "./minha-entidade";

describe("calcularAlgo", () => {
  it("deve retornar zero para entrada vazia", () => {
    expect(calcularAlgo([])).toBe(0);
  });

  it("deve somar valores corretamente", () => {
    expect(calcularAlgo([10, 20, 30])).toBe(60);
  });
});
```

### Testes de integração (Vitest + mocks)

```bash
npm run test:integration
```

Localização: `src/tests/integration/`  
O Supabase é mockado — não requer banco real.

### Testes E2E (Playwright)

```bash
npm run dev              # em um terminal
npm run test:e2e         # em outro terminal
```

Para acionar E2E no CI, inclua `[e2e]` na mensagem do commit.

---

## 6. Convenções de Código

### Estrutura de arquivos

```
src/
├── components/
│   ├── NomeDoComponente.tsx     # Componente PascalCase
│   └── NomeDoComponente.test.tsx # Teste co-localizado (opcional)
├── hooks/
│   └── useNomeDoHook.ts         # Hooks começam com "use"
├── pages/
│   └── NomeDaPagina.tsx         # Páginas PascalCase = rota
├── lib/
│   └── nome-do-modulo.ts        # Funções puras, kebab-case
│   └── nome-do-modulo.test.ts   # Teste co-localizado
└── types/
    └── nome-da-entidade.ts      # Tipos/interfaces exportados
```

### Imports

Use aliases `@/` para evitar caminhos relativos longos:

```ts
// ✅ correto
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ❌ evitar
import { supabase } from "../../../integrations/supabase/client";
```

### Componentes

- Um componente por arquivo
- Props tipadas com interface local ou importada
- `export default` para páginas, `export` nomeado para componentes reutilizáveis

### Tratamento de erros

```ts
// ✅ Com toast de feedback para o usuário
const { data, error } = await supabase.from("tabela").select("*");
if (error) {
  toast.error("Erro ao carregar dados: " + error.message);
  return;
}
```

### Formatação

O projeto usa ESLint com `typescript-eslint`. Rode antes de commitar:

```bash
npm run lint
```

O hook `pre-commit` (husky) executa o lint automaticamente.

---

## 7. Troubleshooting Frequente

### "Error: No module named '@/...'"

Verifique se o `tsconfig.json` tem o path alias configurado:
```json
"paths": { "@/*": ["./src/*"] }
```

### "RLS policy violation" ao salvar dados

1. Verifique se o usuário está autenticado (`useAuth().user !== null`)
2. Confirme se o papel do usuário tem a política necessária em `docs/RLS_POLICIES.md`
3. Use o Supabase Dashboard → Table Editor → Políticas para inspecionar RLS em tempo real

### "TypeError: Cannot read properties of null" em contextos

Os contextos (AuthContext, AppConfigContext) dependem de `AuthProvider` e `AppConfigProvider` na árvore acima do componente. Verifique a ordem em `App.tsx`.

### Husky hook falha no commit

Se o `commit-msg` hook rejeitar sua mensagem:
```bash
# Valide manualmente:
bash scripts/check-commit-message.sh "seu tipo: sua descrição"

# Desabilite temporariamente (não recomendado):
HUSKY=0 git commit -m "mensagem"
```

### Supabase local não inicia

```bash
supabase stop --no-backup   # para completamente
docker system prune -f       # limpa recursos Docker ociosos
supabase start               # reinicia
```

### Tipos do Supabase desatualizados

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```
