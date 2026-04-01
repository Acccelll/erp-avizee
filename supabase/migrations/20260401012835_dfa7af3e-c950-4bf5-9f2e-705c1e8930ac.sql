
-- Add foreign key constraints for all critical relationships

-- clientes → grupos_economicos
ALTER TABLE public.clientes
  ADD CONSTRAINT fk_clientes_grupo_economico
  FOREIGN KEY (grupo_economico_id) REFERENCES public.grupos_economicos(id) ON DELETE SET NULL;

-- cliente_registros_comunicacao → clientes
ALTER TABLE public.cliente_registros_comunicacao
  ADD CONSTRAINT fk_cliente_comunicacao_cliente
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- cliente_transportadoras → clientes, transportadoras
ALTER TABLE public.cliente_transportadoras
  ADD CONSTRAINT fk_cliente_transp_cliente
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- contas_bancarias → bancos
ALTER TABLE public.contas_bancarias
  ADD CONSTRAINT fk_contas_bancarias_banco
  FOREIGN KEY (banco_id) REFERENCES public.bancos(id) ON DELETE RESTRICT;

-- contas_contabeis → self (conta_pai_id)
ALTER TABLE public.contas_contabeis
  ADD CONSTRAINT fk_contas_contabeis_pai
  FOREIGN KEY (conta_pai_id) REFERENCES public.contas_contabeis(id) ON DELETE SET NULL;

-- compras → fornecedores
ALTER TABLE public.compras
  ADD CONSTRAINT fk_compras_fornecedor
  FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- compras_itens → compras, produtos
ALTER TABLE public.compras_itens
  ADD CONSTRAINT fk_compras_itens_compra
  FOREIGN KEY (compra_id) REFERENCES public.compras(id) ON DELETE CASCADE;

ALTER TABLE public.compras_itens
  ADD CONSTRAINT fk_compras_itens_produto
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

-- cotacoes_compra_itens → cotacoes_compra, produtos
ALTER TABLE public.cotacoes_compra_itens
  ADD CONSTRAINT fk_cotacoes_itens_cotacao
  FOREIGN KEY (cotacao_compra_id) REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE;

ALTER TABLE public.cotacoes_compra_itens
  ADD CONSTRAINT fk_cotacoes_itens_produto
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

-- cotacoes_compra_propostas → cotacoes_compra, fornecedores, cotacoes_compra_itens
ALTER TABLE public.cotacoes_compra_propostas
  ADD CONSTRAINT fk_propostas_cotacao
  FOREIGN KEY (cotacao_compra_id) REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE;

ALTER TABLE public.cotacoes_compra_propostas
  ADD CONSTRAINT fk_propostas_fornecedor
  FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE RESTRICT;

ALTER TABLE public.cotacoes_compra_propostas
  ADD CONSTRAINT fk_propostas_item
  FOREIGN KEY (item_id) REFERENCES public.cotacoes_compra_itens(id) ON DELETE CASCADE;

-- caixa_movimentos → contas_bancarias
ALTER TABLE public.caixa_movimentos
  ADD CONSTRAINT fk_caixa_conta_bancaria
  FOREIGN KEY (conta_bancaria_id) REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

-- estoque_movimentos → produtos
ALTER TABLE public.estoque_movimentos
  ADD CONSTRAINT fk_estoque_mov_produto
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

-- financeiro_lancamentos → clientes, fornecedores, notas_fiscais, contas_bancarias, contas_contabeis, self
ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_cliente
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_fornecedor
  FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;

ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_nota_fiscal
  FOREIGN KEY (nota_fiscal_id) REFERENCES public.notas_fiscais(id) ON DELETE SET NULL;

ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_documento_fiscal
  FOREIGN KEY (documento_fiscal_id) REFERENCES public.notas_fiscais(id) ON DELETE SET NULL;

ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_conta_bancaria
  FOREIGN KEY (conta_bancaria_id) REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_conta_contabil
  FOREIGN KEY (conta_contabil_id) REFERENCES public.contas_contabeis(id) ON DELETE SET NULL;

ALTER TABLE public.financeiro_lancamentos
  ADD CONSTRAINT fk_fin_lanc_documento_pai
  FOREIGN KEY (documento_pai_id) REFERENCES public.financeiro_lancamentos(id) ON DELETE SET NULL;

-- financeiro_baixas → financeiro_lancamentos, contas_bancarias
ALTER TABLE public.financeiro_baixas
  ADD CONSTRAINT fk_baixas_lancamento
  FOREIGN KEY (lancamento_id) REFERENCES public.financeiro_lancamentos(id) ON DELETE CASCADE;

ALTER TABLE public.financeiro_baixas
  ADD CONSTRAINT fk_baixas_conta_bancaria
  FOREIGN KEY (conta_bancaria_id) REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

-- folha_pagamento → funcionarios
ALTER TABLE public.folha_pagamento
  ADD CONSTRAINT fk_folha_funcionario
  FOREIGN KEY (funcionario_id) REFERENCES public.funcionarios(id) ON DELETE RESTRICT;

-- grupos_economicos → clientes (empresa_matriz_id)
ALTER TABLE public.grupos_economicos
  ADD CONSTRAINT fk_grupos_eco_empresa_matriz
  FOREIGN KEY (empresa_matriz_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- grupos_produto → contas_contabeis
ALTER TABLE public.grupos_produto
  ADD CONSTRAINT fk_grupos_produto_conta_contabil
  FOREIGN KEY (conta_contabil_id) REFERENCES public.contas_contabeis(id) ON DELETE SET NULL;

-- importacao_logs → importacao_lotes
ALTER TABLE public.importacao_logs
  ADD CONSTRAINT fk_importacao_logs_lote
  FOREIGN KEY (lote_importacao_id) REFERENCES public.importacao_lotes(id) ON DELETE CASCADE;

-- notas_fiscais → fornecedores, clientes, ordens_venda, contas_contabeis, self
ALTER TABLE public.notas_fiscais
  ADD CONSTRAINT fk_nf_fornecedor
  FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;

ALTER TABLE public.notas_fiscais
  ADD CONSTRAINT fk_nf_cliente
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.notas_fiscais
  ADD CONSTRAINT fk_nf_conta_contabil
  FOREIGN KEY (conta_contabil_id) REFERENCES public.contas_contabeis(id) ON DELETE SET NULL;

ALTER TABLE public.notas_fiscais
  ADD CONSTRAINT fk_nf_referenciada
  FOREIGN KEY (nf_referenciada_id) REFERENCES public.notas_fiscais(id) ON DELETE SET NULL;

-- notas_fiscais_itens → notas_fiscais, produtos, contas_contabeis
ALTER TABLE public.notas_fiscais_itens
  ADD CONSTRAINT fk_nf_itens_nota
  FOREIGN KEY (nota_fiscal_id) REFERENCES public.notas_fiscais(id) ON DELETE CASCADE;

ALTER TABLE public.notas_fiscais_itens
  ADD CONSTRAINT fk_nf_itens_produto
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

ALTER TABLE public.notas_fiscais_itens
  ADD CONSTRAINT fk_nf_itens_conta_contabil
  FOREIGN KEY (conta_contabil_id) REFERENCES public.contas_contabeis(id) ON DELETE SET NULL;

-- orcamentos → clientes
ALTER TABLE public.orcamentos
  ADD CONSTRAINT fk_orcamentos_cliente
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- orcamentos_itens → orcamentos, produtos
ALTER TABLE public.orcamentos_itens
  ADD CONSTRAINT fk_orc_itens_orcamento
  FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) ON DELETE CASCADE;

ALTER TABLE public.orcamentos_itens
  ADD CONSTRAINT fk_orc_itens_produto
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;
