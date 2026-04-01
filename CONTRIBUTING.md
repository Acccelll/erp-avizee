# Contributing

## Commits

Este projeto usa **Conventional Commits** para versionamento automático via Semantic Release.

Exemplos válidos:

- `feat: adiciona filtro avançado de relatórios`
- `fix: corrige cálculo de desconto no orçamento`
- `chore(ci): ajusta pipeline de release`

## Migrations Supabase

Use sempre o padrão:

`YYYYMMDDHHMMSS_descricao_curta.sql`

Exemplo:

`20260401153000_add_indice_clientes_cpf.sql`

Evite UUIDs no nome do arquivo para facilitar auditoria e troubleshooting.
