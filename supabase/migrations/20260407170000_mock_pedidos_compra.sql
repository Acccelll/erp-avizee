-- ============================================================
-- Mock data: fornecedores + pedidos_compra + itens
--
-- Garante que os 3 fornecedores de referência e os 3 pedidos de
-- compra de exemplo estejam presentes no banco, tornando o grid
-- de Pedidos de Compra sempre populado após aplicar as migrations.
--
-- Idempotente: usa ON CONFLICT (id) DO NOTHING em todas as
-- inserções.  Pode ser reaplicado sem efeitos colaterais.
-- ============================================================

-- ============================================================
-- FASE 1: FORNECEDORES (3 necessários para os pedidos abaixo)
-- ============================================================

INSERT INTO public.fornecedores (
  id, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj,
  email, telefone, celular, contato,
  logradouro, numero, bairro, cidade, uf, cep, pais,
  ativo
)
VALUES
  (
    'a5a5a5a5-0005-0005-0005-000000000001', 'J',
    'BioVet Insumos Ltda', 'BioVet', '11.222.333/0001-44',
    'vendas@biovet.com.br', '(19) 3500-2000', '(19) 99700-2000', 'Renato Alves',
    'Rua Industrial', '120', 'Polo Logístico', 'Campinas', 'SP', '13000-000', 'Brasil',
    true
  ),
  (
    'a5a5a5a5-0005-0005-0005-000000000002', 'J',
    'Agroinsumos do Sul Ltda', 'Agro Sul', '22.333.444/0001-55',
    'comercial@agrosul.com.br', '(47) 3300-2100', '(47) 99710-2100', 'Paulo Nunes',
    'Av. das Nações', '550', 'Distrito Industrial', 'Joinville', 'SC', '89200-000', 'Brasil',
    true
  ),
  (
    'a5a5a5a5-0005-0005-0005-000000000003', 'J',
    'Pack Rural Embalagens Ltda', 'Pack Rural', '33.444.555/0001-66',
    'contato@packrural.com.br', '(19) 3600-1800', '(19) 99720-1800', 'Débora Lima',
    'Rua das Caixas', '88', 'Jardim Nova Era', 'Limeira', 'SP', '13480-000', 'Brasil',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 2: PEDIDOS DE COMPRA (3 pedidos em diferentes status)
-- ============================================================

INSERT INTO public.pedidos_compra (
  id, numero, fornecedor_id,
  data_pedido, data_entrega_prevista, data_entrega_real,
  valor_total, status, observacoes,
  ativo, condicao_pagamento, frete_valor
)
VALUES
  (
    'b3b3b3b3-b003-b003-b003-b00300000001',
    'PC-EX-0001',
    'a5a5a5a5-0005-0005-0005-000000000001',
    '2026-03-12', '2026-03-20', '2026-03-20',
    3190.00, 'recebido', 'Pedido exemplo recebido integralmente.',
    true, '30 dias', 120.00
  ),
  (
    'b3b3b3b3-b003-b003-b003-b00300000002',
    'PC-EX-0002',
    'a5a5a5a5-0005-0005-0005-000000000002',
    '2026-03-28', '2026-04-10', null,
    2880.00, 'aguardando_recebimento',
    'Pedido exemplo em aberto, aguardando recebimento do fornecedor.',
    true, '45 dias', 85.00
  ),
  (
    'b3b3b3b3-b003-b003-b003-b00300000003',
    'PC-EX-0003',
    'a5a5a5a5-0005-0005-0005-000000000003',
    '2026-04-03', '2026-04-18', null,
    1860.00, 'pedido_emitido',
    'Pedido exemplo recém emitido para acompanhamento de recebimento.',
    true, 'a_vista', 60.00
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 3: ITENS DOS PEDIDOS
-- Inseridos apenas se os produtos de referência já existem
-- (evita falha em base sem os produtos do seed principal).
-- ============================================================

INSERT INTO public.pedidos_compra_itens (
  id, pedido_compra_id, produto_id, quantidade, valor_unitario, valor_total
)
SELECT
  t.id, t.pedido_compra_id, t.produto_id,
  t.quantidade, t.valor_unitario, t.valor_total
FROM (
  VALUES
    ('b4b4b4b4-b004-b004-b004-b00400000001'::uuid,
     'b3b3b3b3-b003-b003-b003-b00300000001'::uuid,
     'a6a6a6a6-0006-0006-0006-000000000004'::uuid,
     20::numeric, 49.00::numeric, 980.00::numeric),
    ('b4b4b4b4-b004-b004-b004-b00400000002'::uuid,
     'b3b3b3b3-b003-b003-b003-b00300000001'::uuid,
     'a6a6a6a6-0006-0006-0006-000000000006'::uuid,
     40::numeric, 52.25::numeric, 2090.00::numeric),
    ('b4b4b4b4-b004-b004-b004-b00400000003'::uuid,
     'b3b3b3b3-b003-b003-b003-b00300000002'::uuid,
     'a6a6a6a6-0006-0006-0006-000000000001'::uuid,
     500::numeric, 2.30::numeric, 1150.00::numeric),
    ('b4b4b4b4-b004-b004-b004-b00400000004'::uuid,
     'b3b3b3b3-b003-b003-b003-b00300000002'::uuid,
     'a6a6a6a6-0006-0006-0006-000000000002'::uuid,
     400::numeric, 3.00::numeric, 1200.00::numeric),
    ('b4b4b4b4-b004-b004-b004-b00400000005'::uuid,
     'b3b3b3b3-b003-b003-b003-b00300000002'::uuid,
     'a6a6a6a6-0006-0006-0006-000000000003'::uuid,
     150::numeric, 2.97::numeric, 445.00::numeric),
    ('b4b4b4b4-b004-b004-b004-b00400000006'::uuid,
     'b3b3b3b3-b003-b003-b003-b00300000003'::uuid,
     'a6a6a6a6-0006-0006-0006-000000000008'::uuid,
     30::numeric, 60.00::numeric, 1800.00::numeric)
) AS t(id, pedido_compra_id, produto_id, quantidade, valor_unitario, valor_total)
WHERE EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = t.produto_id)
ON CONFLICT (id) DO NOTHING;
