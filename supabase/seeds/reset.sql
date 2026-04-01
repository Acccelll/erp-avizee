-- ============================================================
-- ERP AviZee — Reset de dados de desenvolvimento/teste
--
-- ⚠️  ATENÇÃO: Este script apaga TODOS os dados operacionais.
--              Use APENAS em ambiente de desenvolvimento/teste.
--              NUNCA execute em produção.
--
-- Execute via: npm run seed:reset
--   (ou via npm run dev:reset para reset + seed em sequência)
-- ============================================================

-- Logística / rastreio
DELETE FROM public.remessa_eventos;
DELETE FROM public.remessas;

-- Financeiro
DELETE FROM public.financeiro_baixas;
DELETE FROM public.financeiro_lancamentos;
DELETE FROM public.caixa_movimentos;

-- Estoque
DELETE FROM public.estoque_movimentos;

-- Fiscal
DELETE FROM public.notas_fiscais_itens;
DELETE FROM public.notas_fiscais;

-- Vendas
DELETE FROM public.ordens_venda_itens;
DELETE FROM public.ordens_venda;
DELETE FROM public.orcamentos_itens;
DELETE FROM public.orcamentos;

-- Compras
DELETE FROM public.compras_itens;
DELETE FROM public.compras;
DELETE FROM public.pedidos_compra_itens;
DELETE FROM public.pedidos_compra;

-- Cotações de compra
DELETE FROM public.cotacoes_compra_propostas;
DELETE FROM public.cotacoes_compra_itens;
DELETE FROM public.cotacoes_compra;

-- Preços especiais e vínculos
DELETE FROM public.precos_especiais;
DELETE FROM public.cliente_registros_comunicacao;
DELETE FROM public.cliente_transportadoras;
DELETE FROM public.produto_composicoes;
DELETE FROM public.produtos_fornecedores;

-- Quebrar referência circular antes de apagar clientes/grupos
UPDATE public.grupos_economicos SET empresa_matriz_id = NULL;

-- Entidades base operacionais
DELETE FROM public.clientes;
DELETE FROM public.fornecedores;
DELETE FROM public.produtos;
DELETE FROM public.grupos_produto;
DELETE FROM public.transportadoras;
DELETE FROM public.formas_pagamento;
DELETE FROM public.grupos_economicos;

-- Contas e plano de contas
DELETE FROM public.contas_bancarias;
DELETE FROM public.bancos;
DELETE FROM public.contas_contabeis;
