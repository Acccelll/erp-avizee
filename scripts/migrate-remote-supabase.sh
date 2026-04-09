#!/usr/bin/env bash
set -euo pipefail

# Migração total para projeto Supabase remoto.
# Uso:
#   SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... ./scripts/migrate-remote-supabase.sh
# Variáveis opcionais:
#   SUPABASE_PROJECT_REF (default: pybdhgjytswncqvznhkw)
#   APPLY_SEED=true|false (default: false)

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
APPLY_SEED="${APPLY_SEED:-false}"

if ! command -v codex >/dev/null 2>&1 && [ -x /opt/codex/bin/codex ]; then
  mkdir -p "$HOME/.local/bin"
  ln -sf /opt/codex/bin/codex "$HOME/.local/bin/codex"
  export PATH="$HOME/.local/bin:$PATH"
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "[ERRO] Supabase CLI não encontrado no PATH."
  echo "Instale em: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "[ERRO] Defina SUPABASE_ACCESS_TOKEN para autenticar no Supabase CLI."
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "[ERRO] Defina SUPABASE_DB_PASSWORD (senha do banco do projeto)."
  exit 1
fi

echo "[1/5] Login no Supabase CLI"
supabase login --token "$SUPABASE_ACCESS_TOKEN"

echo "[2/5] Link do projeto: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "[3/5] Aplicando todas as migrations pendentes"
supabase db push --password "$SUPABASE_DB_PASSWORD"

echo "[4/5] Validando tabelas críticas via PostgREST"
TABLES=(
  app_configuracoes
  profiles
  user_roles
  user_permissions
  financeiro_lancamentos
  produtos
  clientes
  fornecedores
  orcamentos
  ordens_venda
  pedidos_compra
  notas_fiscais
)

for t in "${TABLES[@]}"; do
  # Aceita 200/206 (ok) ou 401 (tabela existe, mas token ausente/sem permissão).
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://${PROJECT_REF}.supabase.co/rest/v1/${t}?select=*&limit=1")
  if [[ "$status" != "200" && "$status" != "206" && "$status" != "401" ]]; then
    echo "[ERRO] Endpoint /rest/v1/${t} retornou HTTP ${status}."
    exit 1
  fi
  echo "  - ${t}: HTTP ${status}"
done

echo "[5/5] Seed opcional"
if [ "$APPLY_SEED" = "true" ]; then
  supabase db seed --password "$SUPABASE_DB_PASSWORD"
  echo "Seed aplicada."
else
  echo "Seed não aplicada (APPLY_SEED=false)."
fi

echo "Migração total concluída para ${PROJECT_REF}."
