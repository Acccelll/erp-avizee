# Políticas RLS (Row Level Security) — ERP AviZee

> **Última revisão:** 2026-04-01  
> **Referência:** migrações em `supabase/migrations/`

---

## Visão Geral

O ERP AviZee utiliza o Supabase com PostgreSQL. Todas as tabelas do schema `public` têm
**Row Level Security (RLS) habilitado**. As políticas são baseadas em duas premissas:

1. **Autenticação via `auth.uid()`** — o JWT do usuário autenticado.
2. **RBAC via `public.has_role(user_id, role)`** — papéis definidos em `user_roles`.

### Papéis disponíveis (`app_role`)

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `vendedor` | Cadastros de clientes, orçamentos e ordens de venda |
| `financeiro` | Módulo financeiro, compras, notas fiscais, folha de pagamento |
| `estoquista` | Produtos, estoque e compras |

### Convenções de nomenclatura de políticas

- `"Auth users can read <tabela>"` — SELECT liberado para qualquer usuário autenticado.
- `"<Roles> can write/insert/update/delete <tabela>"` — escrita restrita por papel.
- `"Admins can manage <tabela>"` — CRUD total exclusivo para admin.
- `"Public can read <tabela> by token"` — leitura pública (anon) por token público.
- `"Service role can …"` — operações exclusivas do service-role (edge functions).

---

## Tabelas e Políticas

### 1. `profiles`

Perfil do usuário autenticado. Cada usuário só pode ver e editar o próprio perfil;
admins podem ver e editar todos.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Users can view own profile` | `auth.uid() = id` |
| SELECT | `Admins can view all profiles` | role = admin |
| UPDATE | `Users can update own profile` | `auth.uid() = id` |
| UPDATE | `Admins can update all profiles` | role = admin |
| INSERT | `Users can insert own profile` | `auth.uid() = id` |

---

### 2. `user_roles`

Mapeamento usuário ↔ papel. Usuários lêem apenas seus próprios papéis; admins
gerenciam toda a tabela.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Users can view own roles` / `Users can read own roles` | `user_id = auth.uid()` |
| SELECT | `Admins can read all user_roles` | role = admin |
| INSERT | `Admins can insert user_roles` | role = admin |
| UPDATE | `Admins can update user_roles` | role = admin |
| DELETE | `Admins can delete user_roles` | role = admin |
| ALL | `Admins can manage roles` | role = admin |

---

### 3. `auditoria_logs`

Log de auditoria imutável. Apenas admins podem ler; inserção via service-role.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Admins can view audit logs` | role = admin |

---

### 4. `empresa_config`

Configurações gerais da empresa (razão social, logo, dados fiscais).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Authenticated users can read empresa_config` | authenticated |
| SELECT | `Public can read empresa_config` | anon |
| ALL | `Admins can manage empresa_config` | role = admin |

> **Nota:** a leitura pública (anon) é necessária para exibir logotipo e razão social
> nos PDFs de orçamento compartilhados via link público.

---

### 5. `app_configuracoes`

Parâmetros internos da aplicação (e.g., série de documentos, integrações).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read app_configuracoes` | authenticated |
| ALL | `Admins can manage app_configuracoes` | role = admin |

---

### 6. `clientes`

Cadastro de clientes (pessoa física ou jurídica).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read clientes` | authenticated |
| INSERT | `Admin/vendedor/financeiro can write clientes` | admin, vendedor, financeiro |
| UPDATE | `Admin/vendedor/financeiro can update clientes` | admin, vendedor, financeiro |
| DELETE | `Admin can delete clientes` | admin |

---

### 7. `cliente_registros_comunicacao`

Histórico de comunicações com o cliente (ligações, e-mails, visitas).

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD cliente_registros_comunicacao` | authenticated |

---

### 8. `cliente_transportadoras`

Vínculo entre clientes e transportadoras preferidas.

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD cliente_transportadoras` | authenticated |

---

### 9. `fornecedores`

Cadastro de fornecedores.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read fornecedores` | authenticated |
| INSERT | `Admin/financeiro/estoquista can write fornecedores` | admin, financeiro, estoquista |
| UPDATE | `Admin/financeiro/estoquista can update fornecedores` | admin, financeiro, estoquista |
| DELETE | `Admin can delete fornecedores` | admin |

---

### 10. `produtos`

Catálogo de produtos/SKUs.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read produtos` | authenticated |
| INSERT | `Admin/estoquista/financeiro can write produtos` | admin, estoquista, financeiro |
| UPDATE | `Admin/estoquista/financeiro can update produtos` | admin, estoquista, financeiro |
| DELETE | `Admin can delete produtos` | admin |

---

### 11. `produtos_fornecedores`

Tabela de vínculo produto ↔ fornecedor (código do fornecedor, preço de custo).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read produtos_fornecedores` | authenticated |
| ALL | `Admin/estoquista/financeiro can manage produtos_fornecedores` | admin, estoquista, financeiro |

---

### 12. `produto_composicoes`

Composição de produtos (produto pai → produtos filhos).

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD produto_composicoes` | authenticated |

---

### 13. `produto_alias_importacao`

Alias de produtos para importações de XML de compra.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Users can read aliases` | authenticated |
| ALL | `Admins can manage aliases` | role = admin |

---

### 14. `grupos_produto`

Grupos/categorias de produtos.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Authenticated users can read grupos` | authenticated |
| INSERT | `Authenticated users can insert grupos` | authenticated |
| UPDATE | `Authenticated users can update grupos` | authenticated |
| DELETE | `Authenticated users can delete grupos` | authenticated |

---

### 15. `grupos_economicos`

Grupos econômicos de clientes/fornecedores (holding, filiais).

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD grupos_economicos` | authenticated |

---

### 16. `transportadoras`

Cadastro de transportadoras.

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD transportadoras` | authenticated |

---

### 17. `orcamentos`

Orçamentos comerciais (proposta ao cliente).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read orcamentos` | authenticated |
| SELECT | `Public can read orcamentos by token` | anon (public_token + ativo=true) |
| INSERT | `Admin/vendedor can insert orcamentos` | admin, vendedor |
| UPDATE | `Admin/vendedor can update orcamentos` | admin, vendedor |
| UPDATE | `Anon can approve or reject orcamento by token` | anon (status → aprovado/rejeitado) |
| DELETE | `Admin/vendedor can delete orcamentos` | admin, vendedor |

> **Nota:** A política anon de UPDATE é limitada ao campo `status` com valores
> `aprovado` ou `rejeitado`, controlada pelo `WITH CHECK`.

---

### 18. `orcamentos_itens`

Itens dos orçamentos.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read orcamentos_itens` | authenticated |
| SELECT | `Public can read orcamentos_itens for public quotes` | anon (via join em orcamentos com public_token) |
| INSERT | `Admin/vendedor can insert orcamentos_itens` | admin, vendedor |
| UPDATE | `Admin/vendedor can update orcamentos_itens` | admin, vendedor |
| DELETE | `Admin/vendedor can delete orcamentos_itens` | admin, vendedor |

---

### 19. `ordens_venda`

Ordens de venda (confirmação do orçamento aprovado).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read ordens_venda` | authenticated |
| INSERT | `Admin/vendedor can insert ordens_venda` | admin, vendedor |
| UPDATE | `Admin/vendedor can update ordens_venda` | admin, vendedor |
| DELETE | `Admin/vendedor can delete ordens_venda` | admin, vendedor |

---

### 20. `ordens_venda_itens`

Itens das ordens de venda.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read ordens_venda_itens` | authenticated |
| INSERT | `Admin/vendedor can insert ordens_venda_itens` | admin, vendedor |
| UPDATE | `Admin/vendedor can update ordens_venda_itens` | admin, vendedor |
| DELETE | `Admin/vendedor can delete ordens_venda_itens` | admin, vendedor |

---

### 21. `precos_especiais`

Tabela de preços especiais por cliente/produto.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read precos_especiais` | authenticated |
| ALL | `Admin/vendedor/financeiro can manage precos_especiais` | admin, vendedor, financeiro |

---

### 22. `notas_fiscais`

Notas fiscais de entrada e saída.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read notas_fiscais` | authenticated |
| INSERT | `Admin/financeiro can insert notas_fiscais` | admin, financeiro |
| UPDATE | `Admin/financeiro can update notas_fiscais` | admin, financeiro |
| DELETE | `Admin/financeiro can delete notas_fiscais` | admin, financeiro |

---

### 23. `notas_fiscais_itens`

Itens das notas fiscais.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read notas_fiscais_itens` | authenticated |
| INSERT | `Admin/financeiro can insert notas_fiscais_itens` | admin, financeiro |
| UPDATE | `Admin/financeiro can update notas_fiscais_itens` | admin, financeiro |
| DELETE | `Admin/financeiro can delete notas_fiscais_itens` | admin, financeiro |

---

### 24. `financeiro_lancamentos`

Lançamentos financeiros a pagar e a receber.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read financeiro_lancamentos` | authenticated |
| INSERT | `Admin/financeiro can insert financeiro_lancamentos` | admin, financeiro |
| UPDATE | `Admin/financeiro can update financeiro_lancamentos` | admin, financeiro |
| DELETE | `Admin/financeiro can delete financeiro_lancamentos` | admin, financeiro |

---

### 25. `financeiro_baixas`

Baixas de títulos financeiros (pagamentos e recebimentos).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read financeiro_baixas` | authenticated |
| ALL | `Admin/financeiro can manage financeiro_baixas` | admin, financeiro |

---

### 26. `caixa_movimentos`

Movimentações do caixa (abertura, suprimento, sangria, fechamento).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can CRUD caixa_movimentos` *(read path)* | authenticated |
| INSERT | `Admin/financeiro can insert caixa_movimentos` | admin, financeiro |
| UPDATE | `Admin/financeiro can update caixa_movimentos` | admin, financeiro |
| DELETE | `Admin/financeiro can delete caixa_movimentos` | admin, financeiro |

---

### 27. `bancos`

Cadastro de bancos.

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD bancos` | authenticated |

---

### 28. `contas_bancarias`

Contas bancárias da empresa.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read contas_bancarias` | authenticated |
| INSERT | `Admin/financeiro can insert contas_bancarias` | admin, financeiro |
| UPDATE | `Admin/financeiro can update contas_bancarias` | admin, financeiro |
| DELETE | `Admin/financeiro can delete contas_bancarias` | admin, financeiro |

---

### 29. `contas_contabeis`

Plano de contas contábeis.

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD contas_contabeis` | authenticated |

---

### 30. `formas_pagamento`

Formas de pagamento (boleto, cartão, Pix, etc.).

| Operação | Política | Quem |
|----------|----------|------|
| ALL | `Auth users can CRUD formas_pagamento` | authenticated |

---

### 31. `compras`

Pedidos/notas de compra de mercadorias.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read compras` | authenticated |
| INSERT | `Admin/financeiro can insert compras` | admin, financeiro |
| UPDATE | `Admin/financeiro can update compras` | admin, financeiro |
| DELETE | `Admin/financeiro can delete compras` | admin, financeiro |

---

### 32. `compras_itens`

Itens das compras.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read compras_itens` | authenticated |
| INSERT | `Admin/financeiro can insert compras_itens` | admin, financeiro |
| UPDATE | `Admin/financeiro can update compras_itens` | admin, financeiro |
| DELETE | `Admin/financeiro can delete compras_itens` | admin, financeiro |

---

### 33. `cotacoes_compra`

Cotações de compra (solicitação de preços a fornecedores).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read cotacoes_compra` | authenticated |
| INSERT | `Admin/financeiro can insert cotacoes_compra` | admin, financeiro |
| UPDATE | `Admin/financeiro can update cotacoes_compra` | admin, financeiro |
| DELETE | `Admin/financeiro can delete cotacoes_compra` | admin, financeiro |

---

### 34. `cotacoes_compra_itens`

Itens das cotações de compra.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read cotacoes_compra_itens` | authenticated |
| INSERT | `Admin/financeiro can insert cotacoes_compra_itens` | admin, financeiro |
| UPDATE | `Admin/financeiro can update cotacoes_compra_itens` | admin, financeiro |
| DELETE | `Admin/financeiro can delete cotacoes_compra_itens` | admin, financeiro |

---

### 35. `cotacoes_compra_propostas`

Propostas recebidas de fornecedores nas cotações.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read cotacoes_compra_propostas` | authenticated |
| INSERT | `Admin/financeiro can insert cotacoes_compra_propostas` | admin, financeiro |
| UPDATE | `Admin/financeiro can update cotacoes_compra_propostas` | admin, financeiro |
| DELETE | `Admin/financeiro can delete cotacoes_compra_propostas` | admin, financeiro |

---

### 36. `pedidos_compra`

Pedidos de compra emitidos para fornecedores.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read pedidos_compra` | authenticated |
| ALL | `Admin/financeiro can manage pedidos_compra` | admin, financeiro |

---

### 37. `pedidos_compra_itens`

Itens dos pedidos de compra.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read pedidos_compra_itens` | authenticated |
| ALL | `Admin/financeiro can manage pedidos_compra_itens` | admin, financeiro |

---

### 38. `estoque_movimentos`

Movimentações de estoque (entradas, saídas, ajustes).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read estoque_movimentos` | authenticated |
| INSERT | `Admin/estoquista can insert estoque_movimentos` | admin, estoquista |
| UPDATE | `Admin/estoquista can update estoque_movimentos` | admin, estoquista |
| DELETE | `Admin/estoquista can delete estoque_movimentos` | admin, estoquista |

---

### 39. `remessas`

Remessas bancárias (geração de arquivo de remessa para banco).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read remessas` | authenticated |
| UPDATE | `Auth users can update remessas` | authenticated |
| DELETE | `Admin can delete remessas` | admin |

---

### 40. `remessa_eventos`

Eventos/retornos das remessas bancárias.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read remessa_eventos` | authenticated |
| UPDATE | `Auth users can update remessa_eventos` | authenticated |
| DELETE | `Admin can delete remessa_eventos` | admin |

---

### 41. `funcionarios`

Cadastro de funcionários.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read funcionarios` | authenticated |
| ALL | `Admin can manage funcionarios` | admin, financeiro |

---

### 42. `folha_pagamento`

Folha de pagamento mensal por funcionário.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read folha_pagamento` | authenticated |
| ALL | `Admin/financeiro can manage folha_pagamento` | admin, financeiro |

---

### 43. `fopag_verbas`

Verbas de folha de pagamento (proventos, descontos, informativos).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read fopag_verbas` | authenticated |
| ALL | `Admin/financeiro can manage fopag_verbas` | admin, financeiro |

---

### 44. `fopag_itens`

Itens lançados por funcionário na folha de pagamento.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Auth users can read fopag_itens` | authenticated |
| ALL | `Admin/financeiro can manage fopag_itens` | admin, financeiro |

---

### 45. `importacao_lotes`

Lotes de importação de dados (migração inicial de sistemas legados).

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Users can read importacao_lotes` | authenticated |
| ALL | `Admins can manage importacao_lotes` | admin |

---

### 46. `importacao_logs`

Logs detalhados de cada lote de importação.

| Operação | Política | Quem |
|----------|----------|------|
| SELECT | `Users can read importacao_logs` | authenticated |
| ALL | `Admins can manage importacao_logs` | admin |

---

### 47. Tabelas de staging (`stg_*`)

Tabelas temporárias usadas durante o processo de importação de dados legados.

| Tabela | Política SELECT | Política WRITE |
|--------|----------------|----------------|
| `stg_clientes` | `Users can read stg_clientes` (auth) | `Admins can manage stg_clientes` (admin) |
| `stg_produtos` | `Users can read stg_produtos` (auth) | `Admins can manage stg_produtos` (admin) |
| `stg_fornecedores` | `Users can read stg_fornecedores` (auth) | `Admins can manage stg_fornecedores` (admin) |
| `stg_estoque_inicial` | `Auth users can CRUD stg_estoque_inicial` | (all auth) |
| `stg_faturamento` | `Auth users can CRUD stg_faturamento` | (all auth) |
| `stg_financeiro_aberto` | `Auth users can CRUD stg_financeiro_aberto` | (all auth) |
| `stg_compras_xml` | `Auth users can CRUD stg_compras_xml` | (all auth) |

---

### 48. Tabelas de infraestrutura de e-mail

Usadas exclusivamente pelas Edge Functions via `service_role`. Usuários autenticados
não têm acesso direto.

| Tabela | Políticas |
|--------|-----------|
| `email_send_log` | `Service role can read/insert/update send log` |
| `email_send_state` | `Service role can manage send state` |
| `email_unsubscribe_tokens` | `Service role can read/insert/mark tokens` |
| `suppressed_emails` | `Service role can read/insert suppressed emails` |

---

## Tabela Resumo de Cobertura RLS

| Tabela | RLS Habilitado | Tem Políticas | Observação |
|--------|:--------------:|:-------------:|------------|
| `profiles` | ✅ | ✅ | Restrição por `auth.uid()` |
| `user_roles` | ✅ | ✅ | Admin gerencia; usuário lê o próprio |
| `auditoria_logs` | ✅ | ✅ | Somente admin pode ler |
| `empresa_config` | ✅ | ✅ | Leitura pública (necessária para PDFs) |
| `app_configuracoes` | ✅ | ✅ | Admin escreve; todos lêem |
| `clientes` | ✅ | ✅ | Escrita por role |
| `cliente_registros_comunicacao` | ✅ | ✅ | Todos autenticados |
| `cliente_transportadoras` | ✅ | ✅ | Todos autenticados |
| `fornecedores` | ✅ | ✅ | Escrita por role |
| `produtos` | ✅ | ✅ | Escrita por role |
| `produtos_fornecedores` | ✅ | ✅ | Escrita por role |
| `produto_composicoes` | ✅ | ✅ | Todos autenticados |
| `produto_alias_importacao` | ✅ | ✅ | Admin escreve |
| `grupos_produto` | ✅ | ✅ | Todos autenticados |
| `grupos_economicos` | ✅ | ✅ | Todos autenticados |
| `transportadoras` | ✅ | ✅ | Todos autenticados |
| `orcamentos` | ✅ | ✅ | Escrita por role; aprovação via token |
| `orcamentos_itens` | ✅ | ✅ | Escrita por role |
| `ordens_venda` | ✅ | ✅ | Escrita por role |
| `ordens_venda_itens` | ✅ | ✅ | Escrita por role |
| `precos_especiais` | ✅ | ✅ | Escrita por role |
| `notas_fiscais` | ✅ | ✅ | Escrita por role |
| `notas_fiscais_itens` | ✅ | ✅ | Escrita por role |
| `financeiro_lancamentos` | ✅ | ✅ | Escrita por role |
| `financeiro_baixas` | ✅ | ✅ | Escrita por role |
| `caixa_movimentos` | ✅ | ✅ | Escrita por role |
| `bancos` | ✅ | ✅ | Todos autenticados |
| `contas_bancarias` | ✅ | ✅ | Escrita por role |
| `contas_contabeis` | ✅ | ✅ | Todos autenticados |
| `formas_pagamento` | ✅ | ✅ | Todos autenticados |
| `compras` | ✅ | ✅ | Escrita por role |
| `compras_itens` | ✅ | ✅ | Escrita por role |
| `cotacoes_compra` | ✅ | ✅ | Escrita por role |
| `cotacoes_compra_itens` | ✅ | ✅ | Escrita por role |
| `cotacoes_compra_propostas` | ✅ | ✅ | Escrita por role |
| `pedidos_compra` | ✅ | ✅ | Escrita por role |
| `pedidos_compra_itens` | ✅ | ✅ | Escrita por role |
| `estoque_movimentos` | ✅ | ✅ | Escrita por role |
| `remessas` | ✅ | ✅ | Escrita parcial por role |
| `remessa_eventos` | ✅ | ✅ | Escrita parcial por role |
| `funcionarios` | ✅ | ✅ | Admin/financeiro gerenciam |
| `folha_pagamento` | ✅ | ✅ | Admin/financeiro gerenciam |
| `fopag_verbas` | ✅ | ✅ | Admin/financeiro gerenciam |
| `fopag_itens` | ✅ | ✅ | Admin/financeiro gerenciam |
| `importacao_lotes` | ✅ | ✅ | Admin gerencia |
| `importacao_logs` | ✅ | ✅ | Admin gerencia |
| `stg_clientes` | ✅ | ✅ | Admin gerencia |
| `stg_produtos` | ✅ | ✅ | Admin gerencia |
| `stg_fornecedores` | ✅ | ✅ | Admin gerencia |
| `stg_estoque_inicial` | ✅ | ✅ | Todos autenticados |
| `stg_faturamento` | ✅ | ✅ | Todos autenticados |
| `stg_financeiro_aberto` | ✅ | ✅ | Todos autenticados |
| `stg_compras_xml` | ✅ | ✅ | Todos autenticados |
| `email_send_log` | ✅ | ✅ | Somente service_role |
| `email_send_state` | ✅ | ✅ | Somente service_role |
| `email_unsubscribe_tokens` | ✅ | ✅ | Somente service_role |
| `suppressed_emails` | ✅ | ✅ | Somente service_role |

---

## Observações de Segurança

### Políticas amplas (`USING (true)`)

Algumas tabelas de cadastros auxiliares (`bancos`, `transportadoras`, `grupos_produto`,
`contas_contabeis`, `formas_pagamento`, `grupos_economicos`) usam `USING (true)` para
todos os usuários autenticados. Isso é intencional: são dados de referência não
sensíveis que qualquer colaborador precisa consultar e manter.

### Aprovação de orçamentos via token público

A política `"Anon can approve or reject orcamento by token"` permite que um cliente
externo aprove/rejeite um orçamento sem estar autenticado, **apenas** quando o
orçamento tem `public_token IS NOT NULL` e o novo `status` é `'aprovado'` ou
`'rejeitado'`. Nenhum outro campo pode ser alterado via essa política.

### Tabelas de e-mail (service_role only)

As tabelas `email_send_log`, `email_send_state`, `email_unsubscribe_tokens` e
`suppressed_emails` usam `auth.role() = 'service_role'`. Isso garante que apenas
Edge Functions com a chave service-role possam acessar esses dados — usuários
autenticados comuns não têm acesso.

### `has_role` — função de segurança

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = _user_id AND role = _role
) $$;
```

A função é `SECURITY DEFINER`, ou seja, executa com os privilégios do dono
(superusuário do Supabase), evitando recursão de RLS na tabela `user_roles` durante
a avaliação das políticas.

---

## Como adicionar novas tabelas

1. Sempre incluir `ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;` na migração
   de criação da tabela.
2. Definir **pelo menos** uma política para cada operação (SELECT, INSERT, UPDATE, DELETE)
   ou usar `FOR ALL` com cuidado.
3. Para tabelas sensíveis, **nunca** usar `USING (true)` em operações de escrita.
4. Documentar a nova tabela neste arquivo na seção correspondente.
5. A lista `CRITICAL_TABLES` em `scripts/validate-rls.ts` deve ser atualizada para
   incluir a nova tabela se ela for crítica.
