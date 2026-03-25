

# Plano: Melhorias no Dashboard, Produtos, Comercial, Financeiro, Fiscal e Relatórios

## 1. Dashboard -- Filtro "Vencidos" e novo filtro "Todos"

**Vencidos**: Corrigir `buildFinQuery` para que "vencidos" traga títulos com `data_vencimento < hoje` e status `aberto` (não baixado). Atualmente já filtra por `lt("data_vencimento", today)` com status `["aberto", "vencido"]` -- está correto, mas o label "vencidas" no card de Contas a Pagar mostra apenas itens com status literal "vencido". Ajustar para consistência.

**Todos**: Adicionar `'todos'` ao tipo `Period` e a `financialPeriods`. Quando selecionado, não aplicar nenhum filtro de data nos queries financeiros.

**Visual**: Envolver os cards de Contas a Receber/Pagar e o filtro de período em um container com borda/fundo sutil (ex: `border rounded-lg p-4 bg-muted/20`) com label claro "Filtro aplicado aos cards abaixo", separando visualmente dos cards de Produtos e Clientes que não são afetados pelo período.

**Arquivos**: `PeriodFilter.tsx` (tipo Period), `periodFilter.ts` (tratar 'todos'), `Index.tsx` (queries + layout).

## 2. Produtos -- Aba "Códigos Fornecedores"

Adicionar uma nova aba no drawer de Produtos chamada "Cód. Fornecedor". Essa aba exibirá dados da tabela `produtos_fornecedores`, mostrando `referencia_fornecedor` (código do produto no fornecedor), nome do fornecedor, preço e lead time. 

A tabela `produtos_fornecedores` já existe e já tem o campo `referencia_fornecedor`. Essa referência será usada como De/Para na importação de XML -- quando o XML tiver um código de produto que não bata com SKU/código interno, o sistema buscará em `produtos_fornecedores.referencia_fornecedor`.

Também atualizar o parser XML (`nfeXmlParser.ts` / `Fiscal.tsx`) para consultar `produtos_fornecedores` como fallback no matching de itens.

**Arquivos**: `Produtos.tsx` (nova aba), `Fiscal.tsx` (matching fallback).

## 3. CEP -- Viabilidade de validação

Totalmente viável via API pública gratuita **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`). Não requer API key. Implementação: ao sair do campo CEP (onBlur), chamar a API e preencher automaticamente logradouro, bairro, cidade e UF. Aplicar em Clientes e Fornecedores.

**Arquivos**: Criar hook `useViaCep.ts`, integrar em `Clientes.tsx` e `Fornecedores.tsx`.

## 4. Comercial -- Endereço da cotação

Alterar o endereço hardcoded no `OrcamentoPdfTemplate.tsx` de:
```
RUA ADA CAROLINE SCARANO, 259 - JOAO ARANHA
PAULÍNIA - SP CEP: 13145-794
```
Para:
```
Diogo Antonio Feijó, 111 - João Aranha
PAULÍNIA - SP CEP: 13.145-706
```

**Arquivo**: `OrcamentoPdfTemplate.tsx` (linha 78-80).

## 5. Financeiro -- Baixa aprimorada

Ao clicar "Baixar N selecionado(s)", em vez de executar a baixa direto, abrir um **Dialog/Modal de confirmação** mostrando:
- Tabela resumo dos títulos selecionados (descrição, valor, vencimento, parceiro)
- Total consolidado
- Campo obrigatório "Data de baixa" (default: hoje)
- Botão "Confirmar Baixa"

Após confirmação, usar a data informada como `data_pagamento`. No drawer de visualização e na tabela, exibir `data_pagamento` como "Data de Baixa" quando status = pago.

**Arquivo**: `Financeiro.tsx` (novo modal de baixa).

## 6. Fiscal -- Itens no drawer

O drawer do Fiscal já mostra itens com produto, quantidade, valor unitário, total, CST, CFOP e conta contábil (linhas 747-777). Verificar se está funcionando corretamente -- os itens já são carregados em `openView` via `viewItems`. Se o problema é que os itens não estão aparecendo, pode ser um bug de carregamento. Caso contrário, está implementado.

Confirmação: O drawer **já tem** a seção de itens com todas as informações pedidas. Vou verificar se há algum bug impedindo a exibição.

## 7. Relatórios -- Rodapé do Fluxo de Caixa

Adicionar `totals` ao retorno do relatório `fluxo_caixa` no service:
```typescript
totals: {
  totalEntradas: rows.reduce((s, r) => s + r.entrada, 0),
  totalSaidas: rows.reduce((s, r) => s + r.saida, 0),
  saldoFinal: saldo // último saldo acumulado
}
```

No `Relatorios.tsx`, o rodapé do PreviewModal já renderiza `totals.totalEntradas` e `totals.totalSaidas` quando presentes. Adicionar suporte para `saldoFinal`.

**Arquivo**: `relatorios.service.ts` (totals no fluxo_caixa), `Relatorios.tsx` (exibir saldoFinal).

---

## Resumo de arquivos a editar

| Arquivo | Alterações |
|---|---|
| `src/components/dashboard/PeriodFilter.tsx` | Adicionar 'todos' ao tipo Period e financialPeriods |
| `src/lib/periodFilter.ts` | Tratar período 'todos' |
| `src/pages/Index.tsx` | Queries sem filtro para 'todos', layout visual separando filtro dos cards financeiros |
| `src/pages/Produtos.tsx` | Nova aba "Cód. Fornecedor" no drawer + CRUD inline |
| `src/pages/Fiscal.tsx` | Fallback matching via produtos_fornecedores |
| `src/hooks/useViaCep.ts` | Novo hook para busca de CEP |
| `src/pages/Clientes.tsx` | Integrar autopreenchimento de CEP |
| `src/pages/Fornecedores.tsx` | Integrar autopreenchimento de CEP |
| `src/components/Orcamento/OrcamentoPdfTemplate.tsx` | Atualizar endereço |
| `src/pages/Financeiro.tsx` | Modal de baixa com resumo e data obrigatória |
| `src/services/relatorios.service.ts` | Totals no fluxo_caixa |
| `src/pages/Relatorios.tsx` | Exibir saldoFinal no rodapé |

