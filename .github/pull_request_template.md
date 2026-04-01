## Descrição

<!-- Descreva brevemente o que este PR faz e o motivo da mudança. -->

Closes #<!-- número da issue, se aplicável -->

---

## Checklist

### Qualidade de código

- [ ] Commits seguem [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- [ ] Sem `console.log` ou código de debug esquecido
- [ ] Sem credenciais, tokens ou dados sensíveis no código

### Testes

- [ ] Testes unitários adicionados ou atualizados para os novos comportamentos (`npm run test:unit`)
- [ ] Testes de integração passando (`npm run test:integration`)
- [ ] Testes E2E passando localmente (`npm run test:e2e`) — obrigatório para mudanças em fluxos críticos

### Banco de dados / Supabase

- [ ] RLS (Row Level Security) verificado para novas tabelas ou colunas
- [ ] Migrations documentadas e testadas em ambiente de desenvolvimento
- [ ] Nenhuma política permissiva (`USING (true)`) introduzida sem justificativa

### Documentação

- [ ] README atualizado (se comportamento visível ao usuário foi alterado)
- [ ] Comentários/JSDoc adicionados para funções públicas complexas

### Código gerado por IA

- [ ] Todo código gerado por IA foi revisado linha a linha por um humano
- [ ] A lógica foi validada para o contexto do negócio
- [ ] Testes cobrem os trechos gerados por IA

---

## Tipo de mudança

- [ ] `feat` — Nova funcionalidade
- [ ] `fix` — Correção de bug
- [ ] `refactor` — Refatoração (sem mudança de comportamento)
- [ ] `docs` — Apenas documentação
- [ ] `test` — Adição/ajuste de testes
- [ ] `chore` — Manutenção (deps, config, CI)
- [ ] `perf` — Melhoria de performance
- [ ] `BREAKING CHANGE` — Quebra de compatibilidade (descreva abaixo)

---

## Screenshots / Gravação (se aplicável)

<!-- Cole imagens ou GIFs para mudanças visuais. -->

---

## Contexto adicional para revisores

<!-- Qualquer informação extra que ajude na revisão. -->
