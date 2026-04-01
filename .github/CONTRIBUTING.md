# Guia de Contribuição — ERP AviZee

Obrigado por contribuir! Este documento define os padrões de trabalho do projeto para manter o histórico limpo, o processo de revisão saudável e a qualidade do código elevada.

---

## 1. Estilo de Commits — Conventional Commits

Todos os commits **devem** seguir o formato [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição curta em minúsculas>

[corpo opcional — explica o "por quê", não o "o quê"]

[rodapé opcional — BREAKING CHANGE ou referências de issue]
```

### Tipos aceitos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível para o usuário |
| `fix` | Correção de bug |
| `docs` | Apenas documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição ou ajuste de testes |
| `chore` | Tarefas de manutenção (deps, config, CI) |
| `perf` | Melhoria de performance |
| `style` | Formatação, espaços em branco (sem lógica) |
| `ci` | Mudanças em arquivos de CI/CD |
| `revert` | Revertendo um commit anterior |

### Exemplos válidos

```
feat(clientes): adicionar filtro por grupo econômico
fix(financeiro): corrigir cálculo de juros para vencidos
docs(readme): atualizar seção de navegação relacional
refactor(context): extrair lógica de URL para hook separado
test(fiscal): adicionar testes para cálculo de ICMS
chore(deps): atualizar vite para 5.4.19
```

### Regras

- Linha de assunto ≤ 72 caracteres
- Use o **imperativo** no presente: "adicionar", "corrigir", "remover" (não "adicionado" ou "adicionando")
- Não termine a linha de assunto com ponto final
- Quebre linhas do corpo em ≤ 100 caracteres

### Mudanças que quebram compatibilidade

Adicione `!` após o tipo ou use o rodapé `BREAKING CHANGE:`:

```
feat(api)!: alterar formato de resposta do endpoint de produtos

BREAKING CHANGE: campo `preco` renomeado para `preco_unitario`
```

---

## 2. Estrutura de Branches

| Padrão | Uso |
|---|---|
| `feat/<descricao-curta>` | Nova funcionalidade |
| `fix/<descricao-curta>` | Correção de bug |
| `docs/<descricao-curta>` | Apenas documentação |
| `refactor/<descricao-curta>` | Refatoração |
| `test/<descricao-curta>` | Melhorias de cobertura de testes |
| `chore/<descricao-curta>` | Manutenção geral |
| `hotfix/<descricao-curta>` | Correção urgente para `main` |

### Exemplos

```
feat/relational-drawer-depth-limit
fix/calculo-juros-vencidos
docs/contributing-guide
```

### Regras

- Nomes em **kebab-case** (letras minúsculas, hífens)
- Sem espaços, underscores ou caracteres especiais
- Máximo 50 caracteres para a descrição
- Sempre crie branches a partir de `main` (ou `develop` se existir)
- Delete a branch após o merge

---

## 3. Processo de Pull Request

### Antes de abrir o PR

1. Verifique que os testes passam localmente:
   ```bash
   npm run test:unit
   npm run test:integration
   ```
2. Execute o lint:
   ```bash
   npm run lint
   ```
3. Verifique TypeScript:
   ```bash
   npx tsc --noEmit
   ```
4. Preencha o template de PR completamente (`.github/pull_request_template.md`).

### Requisitos para merge

- **Mínimo 1 aprovação** de outro desenvolvedor antes do merge
- Todos os **status checks de CI devem estar passando** (lint, typecheck, unit tests, build)
- Nenhum conflito de merge pendente
- Branch atualizada com `main` (rebased ou merged)

### Tamanho ideal

- PRs focados em **uma única mudança** são preferíveis a PRs grandes
- Se um PR exceder 400 linhas alteradas, considere dividir em partes menores
- Use [draft PRs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests#draft-pull-requests) para trabalho em progresso

### Revisão

- Responda a todos os comentários antes de solicitar nova revisão
- Prefer `Resolve conversation` apenas quando a sugestão foi efetivamente endereçada
- Use `Suggestion` do GitHub para mudanças pequenas e pontuais

---

## 4. Configuração de Branch Protection (GitHub)

> **Nota:** As regras abaixo devem ser configuradas manualmente em  
> **Settings → Branches → Branch protection rules** para a branch `main`.

Configurações recomendadas:

| Opção | Valor |
|---|---|
| Require a pull request before merging | ✅ |
| Required approvals | 1 |
| Require status checks to pass before merging | ✅ |
| Status checks obrigatórios | `lint`, `typecheck`, `unit-tests`, `build` |
| Require branches to be up to date before merging | ✅ |
| Restrict who can push to matching branches | Conforme necessidade da equipe |
| Require signed commits (opcional) | ✅ recomendado |
| Do not allow bypassing the above settings | ✅ |

---

## 5. Política para Código Gerado por IA

O uso de assistentes de IA (GitHub Copilot, ChatGPT, Claude, etc.) é **permitido e encorajado** como ferramenta de produtividade, com as seguintes obrigações:

### Obrigatório antes do merge

- [ ] **Revisão humana completa** de todo trecho gerado por IA — linha a linha
- [ ] Verificar se a lógica está correta para o contexto do negócio (ex.: regras fiscais, cálculos financeiros)
- [ ] Confirmar que nenhum **dado sensível** (chaves, tokens, PII) foi incluído no código gerado
- [ ] Garantir que as **políticas de RLS do Supabase** foram verificadas para qualquer mudança em tabelas ou permissões
- [ ] Testes unitários devem ser escritos (ou revisados se gerados por IA) para cobrir o comportamento esperado

### Recomendado

- Descreva no corpo do PR quando uma parte significativa foi gerada por IA, para contextualizar revisores
- Não faça commit de código gerado que você não consiga explicar e defender

---

## 6. Setup local

```bash
# Instalar dependências (inclui hooks do Git via husky)
npm install

# O hook commit-msg será instalado automaticamente via `prepare`
# Para testar a validação manualmente:
bash scripts/check-commit-message.sh "feat(clientes): adicionar filtro"
```

---

## Referências

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Husky — Git hooks](https://typicode.github.io/husky/)
