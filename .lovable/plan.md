

# Sprint A: Quick Wins

## 1. Corrigir package.json
Alterar `"name": "vite_react_shadcn_ts"` para `"name": "erp-avizee"` na linha 2.

## 2. Session timeout com feedback
**Arquivo**: `src/contexts/AuthContext.tsx`

Capturar o parâmetro `_event` no `onAuthStateChange`. Quando `event === 'SIGNED_OUT'` e havia um user anterior (sessao expirou, nao foi logout manual), disparar `toast` com "Sua sessao expirou, faca login novamente". Adicionar flag `isManualSignOut` via ref para distinguir logout voluntario de expiracao.

Alteracoes:
- Importar `toast` de sonner
- Adicionar `useRef<boolean>` para `manualSignOut`
- No `signOut()`, setar `manualSignOut.current = true` antes de chamar `supabase.auth.signOut()`
- No listener, quando `event === 'SIGNED_OUT'` e `!manualSignOut.current` e havia user anterior, disparar toast de sessao expirada
- Resetar flag apos uso

## 3. ErrorBoundary global
**Novo arquivo**: `src/components/ErrorBoundary.tsx`

Class component React com `componentDidCatch`. Renderiza tela amigavel com icone de alerta, mensagem "Algo deu errado", botao "Recarregar pagina" (`window.location.reload()`) e link "Voltar ao Dashboard" (`/`).

**Arquivo**: `src/App.tsx` — envolver `<Routes>` com `<ErrorBoundary>`.

## 4. Busca global categorizada
**Arquivo**: `src/components/navigation/GlobalSearch.tsx`

Em vez de listar tudo em um unico `CommandGroup "Modulos e paginas"`, agrupar `filteredNavigation` pelo campo `section`. Criar um `CommandGroup` para cada secao (Cadastros, Comercial, Compras, Financeiro, Fiscal, Administracao), com icone correspondente da `navSections`. Usar `CommandSeparator` entre grupos. Mapear icones por secao a partir de `navSections[].icon`.

Importar `navSections` de navigation e usar o `icon` de cada secao no `CommandItem` correspondente (em vez de `FolderKanban` generico para todos).

---

## Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `package.json` | Nome para `erp-avizee` |
| `src/contexts/AuthContext.tsx` | Toast de sessao expirada com flag manual |
| `src/components/ErrorBoundary.tsx` | Novo — class component |
| `src/App.tsx` | Envolver Routes com ErrorBoundary |
| `src/components/navigation/GlobalSearch.tsx` | Agrupar resultados por secao com icones |

