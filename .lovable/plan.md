

# Sprint C: Funcionalidades de Negocio

## Itens da Sprint

### 1. Relatorio DRE (Demonstrativo de Resultado)
**Arquivo**: `src/services/relatorios.service.ts`, `src/pages/Relatorios.tsx`

Novo tipo `dre` no service. Logica:
- Receita Bruta: soma de `financeiro_lancamentos` tipo `receber` com status `pago` no periodo
- Deducoes: impostos (soma de `icms_valor + pis_valor + cofins_valor + ipi_valor` das `notas_fiscais` de saida no periodo)
- Receita Liquida = Bruta - Deducoes
- CMV: soma de `financeiro_lancamentos` tipo `pagar` vinculados a compras (com `nota_fiscal_id` ou descricao contendo "compra")
- Despesas Operacionais: demais lancamentos tipo `pagar` pagos no periodo
- Resultado = Receita Liquida - CMV - Despesas

Exibir como tabela com linhas hierarquicas (receita, deducoes, liquida, cmv, despesas, resultado). Adicionar card no `reportCards` do Relatorios.tsx.

### 2. Calendario de vencimentos no Financeiro
**Arquivo**: `src/pages/Financeiro.tsx`

Adicionar aba "Calendario" ao lado dos filtros existentes (toggle entre visualizacao Lista e Calendario). Usar `react-day-picker` (ja instalado via shadcn Calendar). Renderizar pontos coloridos nos dias com vencimentos:
- Verde = receber
- Vermelho = pagar
- Amarelo = vencido

Ao clicar no dia, exibir lista dos titulos daquele dia em um popover ou painel lateral.

### 3. Fluxo de aprovacao de orcamentos
**Arquivo**: `src/pages/Orcamentos.tsx`

O enum `status_pedido` ja tem os valores necessarios (`rascunho`, `confirmado`, `aprovado`, `convertido`, `cancelado`). Implementar:
- Botao "Enviar p/ Aprovacao" no drawer quando status = `rascunho` (muda para `confirmado`)
- Botao "Aprovar" quando status = `confirmado` (muda para `aprovado`, registra `data_aprovacao` se existir)
- Validacao: so admin pode aprovar (verificar via `useIsAdmin`)
- Toast de confirmacao em cada transicao

### 4. Alertas automaticos de estoque minimo (notificacao in-app)
**Arquivo**: `src/hooks/useSidebarAlerts.ts` (ja existe), novo componente de notificacao

O hook `useSidebarAlerts` ja busca produtos com estoque baixo. Expandir para:
- Alimentar o painel de notificacoes (`NotificationsPanel.tsx`) com alertas de estoque baixo
- Cada alerta mostra nome do produto, estoque atual vs minimo
- Marcar como "visto" via localStorage

Nao usar `pg_cron` nesta sprint (complexidade alta). Manter client-side com polling existente.

---

## Viabilidade da integracao SEFAZ

### Consulta de CNPJ (cadastro de fornecedores/clientes)
**Viavel com API intermediaria**. A Receita Federal nao oferece API publica direta para consulta de CNPJ. Opcoes:

1. **ReceitaWS** (`receitaws.com.br`): API gratuita (3 consultas/minuto) ou paga. Retorna razao social, nome fantasia, endereco, situacao cadastral, CNAE, telefone, email. Implementacao simples via Edge Function.

2. **BrasilAPI** (`brasilapi.com.br/api/cnpj/v1/{cnpj}`): Gratuita, open source. Mesmos dados. Pode ser chamada diretamente do frontend (CORS habilitado).

3. **CNPJ.ws** (`cnpj.ws`): Alternativa gratuita com limite.

**Recomendacao**: Usar BrasilAPI como primeira opcao (gratuita, sem key). Criar hook `useCnpjLookup` similar ao `useViaCep`. Ao sair do campo CNPJ (onBlur), buscar e preencher razao social, nome fantasia, endereco, telefone, email automaticamente.

### Emissao de NF-e (modulo Faturamento)
**Viavel, mas complexa**. A comunicacao direta com SEFAZ requer:
- Certificado digital A1 (arquivo .pfx)
- Assinatura XML com certificado
- Comunicacao SOAP com webservices SEFAZ por UF
- Homologacao e producao separados

**Opcoes praticas**:
1. **API de emissao (recomendado)**: Usar servicos como **Nuvem Fiscal**, **eNotas**, **Webmania** ou **TecnoSpeed**. Eles abstraem toda a complexidade do SEFAZ. Custo: R$30-150/mes. Implementacao via Edge Function que envia dados da NF para a API e recebe XML/DANFE de volta.

2. **Integracao direta**: Possivel mas requer bibliotecas de assinatura XML em Deno (complexidade muito alta). Nao recomendado para MVP.

**Proximos passos sugeridos**: Na Sprint D ou E, implementar integracao com uma API de emissao. Seria necessario o usuario contratar o servico e fornecer a API key.

---

## Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `src/services/relatorios.service.ts` | Novo case `dre` com calculo de receita, deducoes, CMV, despesas e resultado |
| `src/pages/Relatorios.tsx` | Novo card DRE no `reportCards`, renderizacao hierarquica |
| `src/pages/Financeiro.tsx` | Toggle Lista/Calendario, componente calendario com pontos coloridos |
| `src/pages/Orcamentos.tsx` | Botoes de transicao de status (Enviar/Aprovar) com validacao de role |
| `src/components/navigation/NotificationsPanel.tsx` | Alertas de estoque baixo inline |

