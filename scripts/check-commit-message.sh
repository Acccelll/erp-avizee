#!/usr/bin/env bash
# scripts/check-commit-message.sh
#
# Validates that a commit message follows the Conventional Commits specification.
# Used as a Git commit-msg hook (via Husky) and can also be called directly:
#
#   bash scripts/check-commit-message.sh "feat(clientes): adicionar filtro"
#   bash scripts/check-commit-message.sh "$(cat .git/COMMIT_EDITMSG)"
#
# Exit codes:
#   0 — message is valid
#   1 — message is invalid (prints a helpful error)

set -euo pipefail

# ── Read the commit message ───────────────────────────────────────────────────

if [[ $# -ge 1 && -f "$1" ]]; then
  # Called from the Git commit-msg hook: $1 is the path to the message file.
  COMMIT_MSG="$(cat "$1")"
elif [[ $# -ge 1 ]]; then
  # Called directly with the message text as an argument.
  COMMIT_MSG="$1"
else
  # Fallback: read the default commit message file.
  COMMIT_MSG="$(cat .git/COMMIT_EDITMSG)"
fi

# Strip comment lines (lines starting with #) and leading/trailing whitespace.
SUBJECT="$(echo "$COMMIT_MSG" | grep -v '^#' | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

# ── Rules ─────────────────────────────────────────────────────────────────────

# Accepted types (keep in sync with CONTRIBUTING.md)
VALID_TYPES="feat|fix|docs|refactor|test|chore|perf|style|ci|revert"

# Pattern:  type(optional-scope)!: description
#           ^---^  ^-----------^ ^  ^---------^
#            required  optional  optional colon+space  required (non-empty)
PATTERN="^(${VALID_TYPES})(\([a-zA-Z0-9_/-]+\))?(!)?: .+"

# ── Validation ────────────────────────────────────────────────────────────────

fail() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║              ✗  Commit message inválido                         ║"
  echo "╠══════════════════════════════════════════════════════════════════╣"
  printf  "║  Mensagem: %-54s ║\n" "\"${SUBJECT}\""
  echo "╠══════════════════════════════════════════════════════════════════╣"
  echo "║  Formato esperado (Conventional Commits):                       ║"
  echo "║                                                                  ║"
  echo "║    tipo(escopo opcional): descrição curta                        ║"
  echo "║                                                                  ║"
  echo "║  Tipos aceitos:                                                  ║"
  echo "║    feat  fix  docs  refactor  test  chore  perf  style ci revert║"
  echo "║                                                                  ║"
  echo "║  Exemplos válidos:                                               ║"
  echo "║    feat(clientes): adicionar filtro por grupo econômico          ║"
  echo "║    fix(financeiro): corrigir cálculo de juros para vencidos      ║"
  echo "║    docs: atualizar README com seção de navegação                 ║"
  echo "║    chore(deps): atualizar vite para 5.4.19                       ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
}

# Allow merge commits, revert commits, and fixup/squash commits
if echo "$SUBJECT" | grep -qE "^(Merge|Revert|fixup!|squash!) "; then
  exit 0
fi

# Allow empty messages (e.g., amend with no changes) — git will reject these anyway
if [[ -z "$SUBJECT" ]]; then
  exit 0
fi

# Check subject length
if [[ ${#SUBJECT} -gt 72 ]]; then
  echo ""
  echo "✗  Linha de assunto muito longa (${#SUBJECT} chars, máximo 72):"
  echo "   \"${SUBJECT}\""
  echo ""
  exit 1
fi

# Check for trailing period
if [[ "$SUBJECT" =~ \.$ ]]; then
  echo ""
  echo "✗  Linha de assunto não deve terminar com ponto final:"
  echo "   \"${SUBJECT}\""
  echo ""
  exit 1
fi

# Main format check
if ! echo "$SUBJECT" | grep -qE "$PATTERN"; then
  fail
fi

echo "✓  Commit message válida: \"${SUBJECT}\""
exit 0
