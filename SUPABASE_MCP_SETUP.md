# Supabase MCP + Migração Total (2026-04-09 UTC)

Este guia foi atualizado para resolver os erros reportados de `404` em `/rest/v1/*`.

## 1) MCP server Supabase

```bash
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=pybdhgjytswncqvznhkw"
```

> Observação: neste ambiente, `codex mcp login supabase` retorna `No authorization support detected`.

## 2) Habilitar remote MCP client

No `~/.codex/config.toml`:

```toml
[mcp]
remote_mcp_client_enabled = true
```

## 3) Migração total do banco (corrige 404 de tabela ausente)

Foi adicionado:

- migration bootstrap: `supabase/migrations/20260409183000_bootstrap_core_tables_for_empty_projects.sql`
- script remoto: `scripts/migrate-remote-supabase.sh`
- script npm: `npm run supabase:migrate:remote`

### Execução recomendada

```bash
export SUPABASE_ACCESS_TOKEN="<seu-token>"
export SUPABASE_DB_PASSWORD="<senha-do-banco>"
export SUPABASE_PROJECT_REF="pybdhgjytswncqvznhkw"

npm run supabase:migrate:remote
```

O script aplica todas as migrations pendentes e valida os endpoints críticos do PostgREST.

## 4) Sobre os erros reportados

- `404` em `/rest/v1/<tabela>` indica, na prática, **schema não aplicado** (tabela/visão ausente no projeto remoto).
- `400` em `/auth/v1/token?grant_type=password` normalmente é credencial inválida, usuário ausente, ou fluxo de auth incompatível.

Após rodar a migração total, os 404 de tabela ausente devem parar para os recursos centrais.
