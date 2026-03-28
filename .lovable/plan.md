

## Cotação de Frete dos Correios no Orçamento

### Contexto
O formulário de orçamento já tem campos de peso total, CEP do cliente e campo de frete. A Edge Function `correios-api` já suporta as actions `cotacao` e `prazo`. Falta conectar tudo para que o usuário possa consultar opções de frete diretamente na tela.

### Pré-requisito: CEP de origem
Não existe configuração de CEP da empresa no sistema. Precisamos armazená-lo na tabela `app_configuracoes` (chave `cep_empresa`). Será necessário adicionar um campo na tela de Configurações para o usuário definir o CEP de origem.

### Plano de implementação

**1. Adicionar campo "CEP da Empresa" nas Configurações**
- Na página `Configuracoes.tsx`, adicionar uma seção "Empresa" com campo de CEP
- Usar `useAppConfig("cep_empresa")` para ler/salvar

**2. Atualizar a Edge Function para suportar cotação multi-serviço**
- Adicionar action `cotacao_multi` em `correios-api/index.ts` que consulta preço + prazo para múltiplos serviços (SEDEX `04014`, PAC `04510`, SEDEX 10 `40215`, etc.) em paralelo e retorna array consolidado
- Aceitar parâmetros: `cepOrigem`, `cepDestino`, `peso`, `comprimento`, `altura`, `largura`
- Dimensões terão valores padrão caso não informadas (30x15x10cm)

**3. Criar componente `FreteCorreiosCard`**
- Novo componente em `src/components/Orcamento/FreteCorreiosCard.tsx`
- Botão "Consultar Frete Correios" que aparece quando há cliente com CEP e peso > 0
- Chama a Edge Function com os dados do orçamento
- Exibe lista de opções: nome do serviço, valor, prazo estimado
- Cada opção tem botão "Selecionar" que preenche automaticamente:
  - `frete_valor` com o preço retornado
  - `frete_tipo` com o nome do serviço (ex: "CORREIOS (SEDEX)")
  - `prazo_entrega` com o prazo retornado (ex: "5 dias úteis")
- Loading state e tratamento de erros

**4. Integrar no OrcamentoForm**
- Inserir `FreteCorreiosCard` entre `OrcamentoTotaisCard` e `OrcamentoCondicoesCard`
- Passar props: `cepDestino` (do cliente), `pesoTotal`, callbacks para `setFreteValor`, `setFreteTipo`, `setPrazoEntrega`
- Usar `useAppConfig("cep_empresa")` para obter CEP de origem

### Fluxo do usuário
1. Seleciona cliente (que tem CEP cadastrado)
2. Adiciona itens (peso é calculado)
3. Clica em "Consultar Frete"
4. Vê cards com SEDEX, PAC, etc. com preço e prazo
5. Clica "Selecionar" em uma opção → campos preenchidos automaticamente

### Arquivos modificados
- `supabase/functions/correios-api/index.ts` — nova action `cotacao_multi`
- `src/components/Orcamento/FreteCorreiosCard.tsx` — novo componente
- `src/pages/OrcamentoForm.tsx` — integração do componente
- `src/pages/Configuracoes.tsx` — campo CEP empresa

