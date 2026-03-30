

# Plano de Execucao — Prompt 4 (11 Correcoes)

## Resumo dos 11 Prompts

| # | Tema | Complexidade | Status Atual |
|---|------|-------------|--------------|
| 1 | Correios rastreio | Media | Edge function OK, falta sanitizacao no frontend e mensagens claras |
| 2 | Rota dinamica `/cotacoes/:id` | Baixa | Bug literal na linha 84 do App.tsx |
| 3 | FormasPagamento mock | Ja feito | useSupabaseCrud ja integrado |
| 4 | Persistencia configs | Baixa | localStorage usado apenas em UI state (sidebar, dismissed) — ja coerente |
| 5 | Package-lock | Media | Regenerar lockfile |
| 6 | Bundle reduction | Media | Lazy load paginas + dynamic import xlsx/jspdf |
| 7 | Tipagem any | Media | ~15 arquivos com any excessivo |
| 8 | useSupabaseCrud melhoria | Media | Adicionar paginacao, filtros, invalidacao seletiva |
| 9 | Filtros padronizados | Media | AdvancedFilterBar existe, falta aplicar em modulos |
| 10 | Documentacao | Baixa | Atualizar README |
| 11 | Revisao final | Baixa | Cross-cutting |

## Prompts ja resolvidos (nenhuma acao necessaria)

- **Prompt 3**: FormasPagamento ja usa `useSupabaseCrud` com tabela real no banco
- **Prompt 4**: localStorage e usado apenas para UI state legitimo (sidebar collapsed, notificacoes dismissed). Configuracoes funcionais ja usam `useAppConfig` com Supabase. Administracao usa Supabase com localStorage como fallback — padrao aceitavel

## Bloco 1 — Correcoes Criticas (Prompts 1, 2)

### Prompt 1: Correios rastreio
- Sanitizar codigo no frontend (`handleRastrear` em Remessas.tsx): trim, uppercase, encodeURIComponent
- Sanitizar codigo na edge function (strip spaces, uppercase)
- Melhorar mensagens de erro: diferenciar credencial invalida, cartao invalido, parametro ausente
- Adicionar logs mais claros na edge function
- Revisar cache de token (adicionar margin de seguranca de 5min)

### Prompt 2: Rota dinamica
- Corrigir `App.tsx` linha 84: substituir `<Navigate to="/orcamentos/:id">` por componente que usa `useParams()` para injetar o id real
- Criar componente `CotacaoRedirect` inline

## Bloco 2 — Performance (Prompts 5, 6)

### Prompt 5: Package-lock
- Regenerar `package-lock.json` com `npm install`
- Verificar build funciona

### Prompt 6: Bundle
- Lazy load todas as paginas em `App.tsx` com `React.lazy` + `Suspense`
- Dynamic import de `xlsx` e `jspdf` nos pontos de uso (Relatorios, OrcamentoPdfTemplate)

## Bloco 3 — Qualidade de Codigo (Prompts 7, 8)

### Prompt 7: Tipagem
- Substituir `any` em: AuthContext, useSupabaseCrud, Compras, Fiscal, Produtos, Remessas, Administracao, Relatorios
- Alinhar com tipos do `types.ts` gerado

### Prompt 8: useSupabaseCrud
- Adicionar suporte a filtros opcionais no hook
- Adicionar paginacao opcional
- Separar feedback (toast) da logica de dados
- Manter API retrocompativel

## Bloco 4 — UX e Documentacao (Prompts 9, 10, 11)

### Prompt 9: Filtros padronizados
- Aplicar `AdvancedFilterBar` em: Produtos, Compras, Fiscal, Financeiro, Clientes, Fornecedores, Remessas, Relatorios
- Configurar filtros relevantes por modulo (status, datas, tipo)

### Prompt 10: Documentacao
- Reescrever README com modulos atuais, rotas, integracao Correios, stack
- Remover SPRINT_1_PROGRESS.md, PROGRESS_REVIEW.md, REVERT_COMMIT.md (defasados)

### Prompt 11: Revisao final
- Revisar breadcrumbs e titulos
- Verificar estados de loading e feedback
- Remover mocks residuais e codigo legado

## Arquivos Modificados

| Arquivo | Prompts |
|---------|---------|
| `supabase/functions/correios-api/index.ts` | 1 |
| `src/pages/Remessas.tsx` | 1 |
| `src/App.tsx` | 2, 6 |
| `src/pages/Relatorios.tsx` | 6, 7 |
| `src/hooks/useSupabaseCrud.ts` | 7, 8 |
| `src/contexts/AuthContext.tsx` | 7 |
| `src/pages/Produtos.tsx` | 9 |
| `src/pages/Compras.tsx` | 7, 9 |
| `src/pages/Fiscal.tsx` | 7, 9 |
| `src/pages/Financeiro.tsx` | 9 |
| `src/pages/Clientes.tsx` | 9 |
| `src/pages/Fornecedores.tsx` | 9 |
| `src/pages/Remessas.tsx` | 9 |
| `README.md` | 10 |
| ~15 paginas | 6 (lazy load) |

## Ordem de execucao
1. Bloco 1 (Prompts 1, 2) — correcoes de bugs
2. Bloco 2 (Prompts 5, 6) — performance
3. Bloco 3 (Prompts 7, 8) — qualidade
4. Bloco 4 (Prompts 9, 10, 11) — UX e docs

