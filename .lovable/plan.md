

## Plano: Bloco A — Financeiro (A.1 + A.2)

### A.1 — Baixa Parcial com Estorno

**Contexto**: O sistema já possui `BaixaParcialDialog` e `financeiro_baixas`. O prompt pede uma abordagem diferente usando `valor_pago` e `saldo_restante` como coluna computed na própria tabela `financeiro_lancamentos`, além de estorno.

#### Migration
- Adicionar colunas em `financeiro_lancamentos`:
  - `valor_pago NUMERIC(10,2)` 
  - `tipo_baixa TEXT CHECK (tipo_baixa IN ('total','parcial'))` 
  - Nota: `documento_pai_id`, `conta_bancaria_id`, `forma_pagamento` ja existem
  - `saldo_restante` ja existe mas nao e computed — vamos manter como esta (nao-computed) pois ja e usado pelo `BaixaParcialDialog`

#### Modal de Baixa em Lote (baixaModalOpen) — Financeiro.tsx
Adicionar ao modal existente (linhas 628-675):
1. Select **Forma de Pagamento** (Dinheiro, PIX, Boleto, Cartao, Transferencia, Cheque)
2. Select **Conta Bancaria** (do estado `contasBancarias`)
3. Select **Tipo de Baixa** (Total / Parcial)
4. Input **Valor Pago** (visivel so quando parcial, default = totalBaixa)
5. Estados: `baixaFormaPagamento`, `baixaContaBancaria`, `tipoBaixa`, `valorPago`

#### handleConfirmBaixa — logica nova
- Validar forma_pagamento e conta_bancaria obrigatorios
- **Total**: update status='pago', data_pagamento, valor_pago=valor, tipo_baixa='total', forma_pagamento, conta_bancaria_id
- **Parcial**: update status='pago', valor_pago=valorPago, tipo_baixa='parcial' + criar lancamento filho com saldo restante (documento_pai_id = id original)

#### Botao de Estorno
- Na DataTable, para lancamentos com status === 'pago', adicionar botao com icone `RotateCcw` e tooltip "Estornar baixa"
- ConfirmDialog perguntando confirmacao
- `handleEstorno`: update status='aberto', limpar valor_pago/tipo_baixa/forma_pagamento/conta_bancaria_id, desativar lancamentos filhos

---

### A.2 — Caixa por Banco (multi-conta)

#### Migration
- Adicionar em `caixa_movimentos`:
  - `conta_bancaria_id UUID REFERENCES contas_bancarias(id)`
  - `forma_pagamento TEXT`
  - Index `idx_caixa_conta_bancaria`

#### Caixa.tsx — Reescrever
1. **Seletor de conta** no topo como pills: "Geral (todas)" + uma pill por conta bancaria ativa
2. **Filtro**: quando conta especifica selecionada, filtrar movimentos por `conta_bancaria_id`
3. **Saldo nos KPIs**:
   - Geral: soma de `contas_bancarias.saldo_atual`
   - Conta especifica: `saldo_atual` da conta
4. **Mini painel "Saldos por conta"** quando visualizacao Geral — grid de cards por conta
5. **Formulario**: campo obrigatorio "Conta/Caixa" (select de contas bancarias)
6. **handleSubmit**: salvar `conta_bancaria_id`, calcular saldo anterior/atual relativo a conta
7. **DataTable**: nova coluna "Banco/Conta"

---

### Arquivos modificados
| Arquivo | Alteracao |
|---|---|
| Migration SQL | A.1: valor_pago, tipo_baixa em financeiro_lancamentos |
| Migration SQL | A.2: conta_bancaria_id, forma_pagamento, index em caixa_movimentos |
| `src/pages/Financeiro.tsx` | Modal de baixa aprimorado, handleConfirmBaixa, botao estorno |
| `src/pages/Caixa.tsx` | Reescrita completa com multi-conta |

### Ordem de execucao
1. Migrations (A.1 + A.2)
2. Financeiro.tsx (baixa parcial + estorno)
3. Caixa.tsx (multi-conta)

