-- Seed de exemplo para pedidos de compra (idempotente)
-- Objetivo: popular a tabela pedidos_compra com registros de referência para testes/demonstração.

with fornecedores_base as (
  select id, row_number() over (order by created_at nulls last, id) as rn
  from public.fornecedores
  where coalesce(ativo, true) = true
  limit 3
),
produtos_base as (
  select id, coalesce(preco_custo, 100)::numeric as preco_custo,
         row_number() over (order by created_at nulls last, id) as rn
  from public.produtos
  where coalesce(ativo, true) = true
  limit 12
),
usuario_base as (
  select id from public.profiles order by created_at nulls last, id limit 1
),
pedidos_template as (
  select * from (
    values
      ('PC-EX-0001', 1, current_date - 20, current_date - 10, 'recebido', 'Pedido de compra exemplo já recebido', '30 dias', 120.00::numeric),
      ('PC-EX-0002', 2, current_date - 7,  current_date + 5,  'aguardando_recebimento', 'Pedido de compra exemplo em aberto', '45 dias', 85.00::numeric),
      ('PC-EX-0003', 3, current_date - 2,  current_date + 12, 'pedido_emitido', 'Pedido de compra exemplo emitido', 'a_vista', 60.00::numeric)
  ) as t(numero, fornecedor_rn, data_pedido, data_entrega_prevista, status, observacoes, condicao_pagamento, frete_valor)
),
novos_pedidos as (
  insert into public.pedidos_compra (
    numero,
    fornecedor_id,
    data_pedido,
    data_entrega_prevista,
    status,
    observacoes,
    usuario_id,
    ativo,
    condicao_pagamento,
    frete_valor,
    valor_total
  )
  select
    p.numero,
    f.id,
    p.data_pedido,
    p.data_entrega_prevista,
    p.status,
    p.observacoes,
    u.id,
    true,
    p.condicao_pagamento,
    p.frete_valor,
    0::numeric
  from pedidos_template p
  join fornecedores_base f on f.rn = p.fornecedor_rn
  left join usuario_base u on true
  where not exists (
    select 1 from public.pedidos_compra existing where existing.numero = p.numero
  )
  returning id, numero
),
itens_template as (
  select * from (
    values
      ('PC-EX-0001', 1, 12::numeric, 95.00::numeric),
      ('PC-EX-0001', 2,  6::numeric, 140.00::numeric),
      ('PC-EX-0001', 3,  3::numeric, 280.00::numeric),
      ('PC-EX-0002', 4, 20::numeric, 35.00::numeric),
      ('PC-EX-0002', 5,  8::numeric, 115.00::numeric),
      ('PC-EX-0002', 6,  2::numeric, 490.00::numeric),
      ('PC-EX-0003', 7, 15::numeric, 44.00::numeric),
      ('PC-EX-0003', 8, 10::numeric, 58.00::numeric),
      ('PC-EX-0003', 9,  5::numeric, 132.00::numeric)
  ) as t(numero, produto_rn, quantidade, valor_unitario)
),
inserted_items as (
  insert into public.pedidos_compra_itens (
    pedido_compra_id,
    produto_id,
    quantidade,
    valor_unitario,
    valor_total
  )
  select
    p.id,
    pr.id,
    i.quantidade,
    i.valor_unitario,
    (i.quantidade * i.valor_unitario)
  from itens_template i
  join public.pedidos_compra p on p.numero = i.numero
  join produtos_base pr on pr.rn = i.produto_rn
  where exists (
    select 1 from novos_pedidos np where np.id = p.id
  )
),
recalculo as (
  update public.pedidos_compra pc
  set valor_total = coalesce(sum_itens.total_itens, 0) + coalesce(pc.frete_valor, 0)
  from (
    select pedido_compra_id, sum(valor_total) as total_itens
    from public.pedidos_compra_itens
    group by pedido_compra_id
  ) sum_itens
  where pc.id = sum_itens.pedido_compra_id
    and pc.numero in ('PC-EX-0001', 'PC-EX-0002', 'PC-EX-0003')
  returning pc.id
)
select count(*) as pedidos_inseridos from novos_pedidos;
