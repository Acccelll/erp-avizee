-- Seed mock data for ERP AviZee navigation review and module demonstrations

-- Contas contábeis
INSERT INTO public.contas_contabeis (id, codigo, descricao, natureza, aceita_lancamento, ativo)
VALUES
  ('11111111-1111-1111-1111-111111111001', '1.1.01.001', 'Caixa Geral', 'devedora', true, true),
  ('11111111-1111-1111-1111-111111111002', '1.1.02.001', 'Bancos Conta Movimento', 'devedora', true, true),
  ('11111111-1111-1111-1111-111111111003', '1.1.03.001', 'Clientes a Receber', 'devedora', true, true),
  ('11111111-1111-1111-1111-111111111004', '2.1.01.001', 'Fornecedores a Pagar', 'credora', true, true),
  ('11111111-1111-1111-1111-111111111005', '3.1.01.001', 'Receita de Vendas', 'credora', true, true),
  ('11111111-1111-1111-1111-111111111006', '4.1.01.001', 'CMV / Compras', 'devedora', true, true)
ON CONFLICT (id) DO NOTHING;

-- Grupos de produto
INSERT INTO public.grupos_produto (id, nome, descricao, conta_contabil_id, ativo)
VALUES
  ('22222222-2222-2222-2222-222222222001', 'Agulhas', 'Agulhas e acessórios para vacinação', '11111111-1111-1111-1111-111111111006', true),
  ('22222222-2222-2222-2222-222222222002', 'Seringas', 'Seringas e kits de aplicação', '11111111-1111-1111-1111-111111111006', true),
  ('22222222-2222-2222-2222-222222222003', 'Reposição', 'Peças de reposição e manutenção', '11111111-1111-1111-1111-111111111006', true)
ON CONFLICT (id) DO NOTHING;

-- Produtos
INSERT INTO public.produtos (
  id, sku, codigo_interno, nome, descricao, grupo_id, unidade_medida,
  preco_custo, preco_venda, estoque_atual, estoque_minimo, peso, ncm, cst, cfop_padrao,
  eh_composto, markup_percentual, ativo
)
VALUES
  ('33333333-3333-3333-3333-333333333001', 'AG-10X10', 'PRD-001', 'Agulha Inox 10x10', 'Agulha inox para vacinação aviária.', '22222222-2222-2222-2222-222222222001', 'UN', 2.10, 4.80, 120, 40, 0.010, '90183211', '000', '5102', false, 25, true),
  ('33333333-3333-3333-3333-333333333002', 'AG-15X15', 'PRD-002', 'Agulha Inox 15x15', 'Agulha inox para manejo e aplicação.', '22222222-2222-2222-2222-222222222001', 'UN', 2.45, 5.40, 210, 60, 0.012, '90183211', '000', '5102', false, 22, true),
  ('33333333-3333-3333-3333-333333333003', 'SR-BOUBA-05', 'PRD-003', 'Seringa Bouba 0,5 mL', 'Kit de seringa para vacinação de bouba.', '22222222-2222-2222-2222-222222222002', 'UN', 28.00, 49.90, 86, 20, 0.120, '90183119', '000', '5102', true, 35, true),
  ('33333333-3333-3333-3333-333333333004', 'MOL-EMB-05', 'PRD-004', 'Mola do Êmbolo 0,5', 'Mola de reposição para seringa 0,5 mL.', '22222222-2222-2222-2222-222222222003', 'UN', 4.50, 9.90, 18, 10, 0.005, '73209000', '000', '5102', false, 28, true),
  ('33333333-3333-3333-3333-333333333005', 'KIT-CAL-01', 'PRD-005', 'Kit de Calibração', 'Kit composto para ajuste e manutenção.', '22222222-2222-2222-2222-222222222003', 'UN', 16.00, 29.90, 14, 8, 0.080, '90279099', '000', '5102', true, 30, true)
ON CONFLICT (id) DO NOTHING;

-- Composição de produtos
INSERT INTO public.produto_composicoes (id, produto_pai_id, produto_filho_id, quantidade, ordem)
VALUES
  ('44444444-4444-4444-4444-444444444001', '33333333-3333-3333-3333-333333333003', '33333333-3333-3333-3333-333333333001', 1, 1),
  ('44444444-4444-4444-4444-444444444002', '33333333-3333-3333-3333-333333333003', '33333333-3333-3333-3333-333333333004', 2, 2),
  ('44444444-4444-4444-4444-444444444003', '33333333-3333-3333-3333-333333333005', '33333333-3333-3333-3333-333333333002', 2, 1),
  ('44444444-4444-4444-4444-444444444004', '33333333-3333-3333-3333-333333333005', '33333333-3333-3333-3333-333333333004', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- Grupos econômicos
INSERT INTO public.grupos_economicos (id, nome, observacoes, ativo)
VALUES
  ('55555555-5555-5555-5555-555555555001', 'Grupo Mantiqueira', 'Empresas com operação integrada de postura.', true),
  ('55555555-5555-5555-5555-555555555002', 'Grupo Vale Verde', 'Unidades produtoras no interior paulista.', true)
ON CONFLICT (id) DO NOTHING;

-- Clientes
INSERT INTO public.clientes (
  id, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, inscricao_estadual, email, telefone, celular,
  contato, prazo_padrao, limite_credito, logradouro, numero, complemento, bairro, cidade, uf, cep, pais,
  observacoes, grupo_economico_id, tipo_relacao_grupo, caixa_postal, ativo
)
VALUES
  ('66666666-6666-6666-6666-666666666001', 'J', 'Granja Santa Helena Ltda', 'Granja Santa Helena', '12.345.678/0001-91', '123.456.789.000', 'compras@santahelena.com.br', '(19) 3232-1001', '(19) 99888-1001', 'Mariana Lopes', 28, 80000, 'Rodovia Anhanguera', '1200', 'Km 186', 'Zona Rural', 'Leme', 'SP', '13610-000', 'Brasil', 'Cliente estratégico para vacinas e reposição.', '55555555-5555-5555-5555-555555555001', 'matriz', 'Caixa Postal 101', true),
  ('66666666-6666-6666-6666-666666666002', 'J', 'Santa Helena Filial Rio Claro Ltda', 'Santa Helena Rio Claro', '12.345.678/0002-72', '123.456.789.001', 'filial@santahelena.com.br', '(19) 3522-2201', '(19) 99888-2201', 'Carlos Silva', 30, 45000, 'Estrada Municipal RC-150', '450', '', 'Distrito Industrial', 'Rio Claro', 'SP', '13505-000', 'Brasil', 'Filial com compras recorrentes para aplicação.', '55555555-5555-5555-5555-555555555001', 'filial', 'Caixa Postal 55', true),
  ('66666666-6666-6666-6666-666666666003', 'J', 'Agropecuária Vale Verde S/A', 'Vale Verde', '98.765.432/0001-10', '987.654.321.000', 'compras@valeverde.com.br', '(16) 3821-4400', '(16) 99777-4400', 'João Monteiro', 35, 65000, 'Av. dos Produtores', '800', 'Bloco B', 'Parque Agro', 'Ribeirão Preto', 'SP', '14000-000', 'Brasil', 'Cliente com operações centralizadas.', '55555555-5555-5555-5555-555555555002', 'matriz', 'Caixa Postal 209', true),
  ('66666666-6666-6666-6666-666666666004', 'J', 'Cooperativa Boa Postura', 'Boa Postura', '45.678.901/0001-44', '321.654.987.000', 'contato@boapostura.coop', '(11) 4000-3400', '(11) 98888-3400', 'Fernanda Reis', 21, 35000, 'Rua do Campo', '75', '', 'Centro', 'Mogi Mirim', 'SP', '13800-000', 'Brasil', 'Cooperativa com giro forte em itens de vacinação.', null, 'independente', 'Caixa Postal 18', true)
ON CONFLICT (id) DO NOTHING;

UPDATE public.grupos_economicos SET empresa_matriz_id = '66666666-6666-6666-6666-666666666001' WHERE id = '55555555-5555-5555-5555-555555555001';
UPDATE public.grupos_economicos SET empresa_matriz_id = '66666666-6666-6666-6666-666666666003' WHERE id = '55555555-5555-5555-5555-555555555002';

-- Fornecedores
INSERT INTO public.fornecedores (
  id, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, inscricao_estadual, email, telefone, celular,
  prazo_padrao, observacoes, logradouro, numero, complemento, bairro, cidade, uf, cep, contato, pais, ativo
)
VALUES
  ('77777777-7777-7777-7777-777777777001', 'J', 'BioVet Insumos Ltda', 'BioVet', '11.222.333/0001-44', '222.333.444.555', 'vendas@biovet.com.br', '(19) 3500-2000', '(19) 99700-2000', 28, 'Fornecedor principal de seringas e peças.', 'Rua Industrial', '120', '', 'Polo Logístico', 'Campinas', 'SP', '13000-000', 'Renato Alves', 'Brasil', true),
  ('77777777-7777-7777-7777-777777777002', 'J', 'Agroinsumos do Sul Ltda', 'Agro Sul', '22.333.444/0001-55', '333.444.555.666', 'comercial@agrosul.com.br', '(47) 3300-2100', '(47) 99710-2100', 35, 'Especialista em agulhas e acessórios.', 'Av. das Nações', '550', '', 'Distrito Industrial', 'Joinville', 'SC', '89200-000', 'Paulo Nunes', 'Brasil', true),
  ('77777777-7777-7777-7777-777777777003', 'J', 'Pack Rural Embalagens', 'Pack Rural', '33.444.555/0001-66', '444.555.666.777', 'contato@packrural.com.br', '(19) 3600-1800', '(19) 99720-1800', 21, 'Embalagens e kits de manutenção.', 'Rua das Caixas', '88', '', 'Jardim Nova Era', 'Limeira', 'SP', '13480-000', 'Débora Lima', 'Brasil', true)
ON CONFLICT (id) DO NOTHING;

-- Relação produto fornecedor
INSERT INTO public.produtos_fornecedores (id, produto_id, fornecedor_id, referencia_fornecedor, preco_compra, lead_time_dias)
VALUES
  ('88888888-8888-8888-8888-888888888001', '33333333-3333-3333-3333-333333333001', '77777777-7777-7777-7777-777777777002', 'AG10X10-SUL', 2.10, 7),
  ('88888888-8888-8888-8888-888888888002', '33333333-3333-3333-3333-333333333002', '77777777-7777-7777-7777-777777777002', 'AG15X15-SUL', 2.45, 7),
  ('88888888-8888-8888-8888-888888888003', '33333333-3333-3333-3333-333333333003', '77777777-7777-7777-7777-777777777001', 'SB-05-BVT', 28.00, 10),
  ('88888888-8888-8888-8888-888888888004', '33333333-3333-3333-3333-333333333004', '77777777-7777-7777-7777-777777777001', 'MOL05-BVT', 4.50, 5)
ON CONFLICT (id) DO NOTHING;

-- Bancos e contas
INSERT INTO public.bancos (id, nome, tipo, ativo)
VALUES
  ('99999999-9999-9999-9999-999999999001', 'Inter', 'banco', true),
  ('99999999-9999-9999-9999-999999999002', 'C6', 'banco', true),
  ('99999999-9999-9999-9999-999999999003', 'RecargaPay', 'carteira', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contas_bancarias (id, banco_id, descricao, agencia, conta, titular, saldo_atual, ativo)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '99999999-9999-9999-9999-999999999001', 'Conta Operacional Inter', '0001', '123456-7', 'AviZee Equipamentos LTDA', 84500.00, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '99999999-9999-9999-9999-999999999002', 'Conta Comercial C6', '0001', '998877-6', 'AviZee Equipamentos LTDA', 32000.00, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', '99999999-9999-9999-9999-999999999003', 'Carteira RecargaPay', '-', 'WALLET-01', 'AviZee Equipamentos LTDA', 6500.00, true)
ON CONFLICT (id) DO NOTHING;

-- Compras
INSERT INTO public.compras (
  id, numero, fornecedor_id, data_compra, data_entrega, data_entrega_prevista, data_entrega_real,
  valor_total, valor_produtos, frete_valor, impostos_valor, observacoes, status, ativo
)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'COMP-2026-031', '77777777-7777-7777-7777-777777777001', '2026-03-10', '2026-03-18', '2026-03-18', null, 12480.00, 11980.00, 320.00, 180.00, 'Compra prioritária para reposição de kits e peças.', 'confirmado', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'COMP-2026-030', '77777777-7777-7777-7777-777777777002', '2026-03-07', '2026-03-14', '2026-03-14', '2026-03-14', 8650.00, 8300.00, 200.00, 150.00, 'Reabastecimento de agulhas.', 'confirmado', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'COMP-2026-029', '77777777-7777-7777-7777-777777777003', '2026-03-05', '2026-03-12', '2026-03-12', '2026-03-12', 2980.00, 2800.00, 90.00, 90.00, 'Embalagens e kits de manutenção.', 'confirmado', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.compras_itens (id, compra_id, produto_id, quantidade, valor_unitario, valor_total)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccc001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', '33333333-3333-3333-3333-333333333003', 160, 28.00, 4480.00),
  ('cccccccc-cccc-cccc-cccc-ccccccccc002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', '33333333-3333-3333-3333-333333333004', 500, 4.50, 2250.00),
  ('cccccccc-cccc-cccc-cccc-ccccccccc003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '33333333-3333-3333-3333-333333333001', 1200, 2.10, 2520.00),
  ('cccccccc-cccc-cccc-cccc-ccccccccc004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '33333333-3333-3333-3333-333333333002', 1300, 2.45, 3185.00),
  ('cccccccc-cccc-cccc-cccc-ccccccccc005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', '33333333-3333-3333-3333-333333333005', 80, 16.00, 1280.00)
ON CONFLICT (id) DO NOTHING;

-- Orçamentos
INSERT INTO public.orcamentos (
  id, numero, cliente_id, data_orcamento, validade, valor_total, desconto, imposto_st, imposto_ipi,
  frete_valor, outras_despesas, quantidade_total, peso_total, pagamento, prazo_pagamento, prazo_entrega,
  frete_tipo, modalidade, observacoes, status, ativo
)
VALUES
  ('dddddddd-dddd-dddd-dddd-ddddddddd001', 'ORC-2026-014', '66666666-6666-6666-6666-666666666001', '2026-03-14', '2026-03-21', 18540.00, 240.00, 0, 0, 180.00, 0, 220, 26.4, 'Boleto', '28 DDL', '7 dias', 'CIF', 'venda', 'Proposta para reposição do lote trimestral.', 'aprovado', true),
  ('dddddddd-dddd-dddd-dddd-ddddddddd002', 'ORC-2026-012', '66666666-6666-6666-6666-666666666003', '2026-03-11', '2026-03-18', 9880.00, 120.00, 0, 0, 120.00, 0, 110, 14.7, 'PIX', '21 DDL', '5 dias', 'FOB', 'venda', 'Aguardando confirmação de frete.', 'aprovado', true),
  ('dddddddd-dddd-dddd-dddd-ddddddddd003', 'ORC-2026-010', '66666666-6666-6666-6666-666666666004', '2026-03-08', '2026-03-15', 27300.00, 300.00, 0, 0, 300.00, 0, 340, 42.8, 'Boleto', '21 DDL', '10 dias', 'CIF', 'venda', 'Conjunto completo para campanha de vacinação.', 'convertido', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orcamentos_itens (id, orcamento_id, produto_id, quantidade, valor_unitario, valor_total, variacao, unidade, peso_unitario, peso_total, codigo_snapshot, descricao_snapshot)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', 'dddddddd-dddd-dddd-dddd-ddddddddd001', '33333333-3333-3333-3333-333333333003', 180, 49.90, 8982.00, '', 'UN', 0.120, 21.6, 'SR-BOUBA-05', 'Seringa Bouba 0,5 mL'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee002', 'dddddddd-dddd-dddd-dddd-ddddddddd001', '33333333-3333-3333-3333-333333333001', 40, 4.80, 192.00, '', 'UN', 0.010, 0.4, 'AG-10X10', 'Agulha Inox 10x10'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee003', 'dddddddd-dddd-dddd-dddd-ddddddddd002', '33333333-3333-3333-3333-333333333002', 110, 5.40, 594.00, '', 'UN', 0.012, 1.32, 'AG-15X15', 'Agulha Inox 15x15'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee004', 'dddddddd-dddd-dddd-dddd-ddddddddd003', '33333333-3333-3333-3333-333333333005', 300, 29.90, 8970.00, '', 'UN', 0.080, 24.0, 'KIT-CAL-01', 'Kit de Calibração')
ON CONFLICT (id) DO NOTHING;

-- Ordens de venda
INSERT INTO public.ordens_venda (
  id, numero, data_emissao, cliente_id, cotacao_id, status, status_faturamento,
  data_aprovacao, data_prometida_despacho, prazo_despacho_dias, valor_total, observacoes, ativo
)
VALUES
  ('ffffffff-ffff-ffff-ffff-fffffffff001', 'OV-2026-021', '2026-03-15', '66666666-6666-6666-6666-666666666001', 'dddddddd-dddd-dddd-dddd-ddddddddd001', 'aprovada', 'parcial', '2026-03-15', '2026-03-19', 4, 18540.00, 'Backlog aguardando faturamento complementar.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff002', 'OV-2026-020', '2026-03-12', '66666666-6666-6666-6666-666666666004', 'dddddddd-dddd-dddd-dddd-ddddddddd003', 'em_separacao', 'aguardando', '2026-03-12', '2026-03-18', 6, 27300.00, 'Separação em andamento.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ordens_venda_itens (id, ordem_venda_id, produto_id, codigo_snapshot, descricao_snapshot, quantidade, unidade, valor_unitario, valor_total, peso_unitario, peso_total, quantidade_faturada)
VALUES
  ('12121212-1212-1212-1212-121212121001', 'ffffffff-ffff-ffff-ffff-fffffffff001', '33333333-3333-3333-3333-333333333003', 'SR-BOUBA-05', 'Seringa Bouba 0,5 mL', 180, 'UN', 49.90, 8982.00, 0.120, 21.6, 90),
  ('12121212-1212-1212-1212-121212121002', 'ffffffff-ffff-ffff-ffff-fffffffff001', '33333333-3333-3333-3333-333333333001', 'AG-10X10', 'Agulha Inox 10x10', 40, 'UN', 4.80, 192.00, 0.010, 0.4, 20),
  ('12121212-1212-1212-1212-121212121003', 'ffffffff-ffff-ffff-ffff-fffffffff002', '33333333-3333-3333-3333-333333333005', 'KIT-CAL-01', 'Kit de Calibração', 300, 'UN', 29.90, 8970.00, 0.080, 24.0, 0)
ON CONFLICT (id) DO NOTHING;

-- Notas fiscais
INSERT INTO public.notas_fiscais (
  id, tipo, numero, serie, chave_acesso, data_emissao, data_recebimento, fornecedor_id, cliente_id,
  valor_total, status, movimenta_estoque, gera_financeiro, observacoes, ativo, forma_pagamento,
  condicao_pagamento, ordem_venda_id, conta_contabil_id
)
VALUES
  ('13131313-1313-1313-1313-131313131001', 'saida', 'NF-2026-118', '1', '35260312345678000191550010000001181000011181', '2026-03-17', null, null, '66666666-6666-6666-6666-666666666001', 9240.00, 'confirmada', true, true, 'Faturamento parcial da OV-2026-021.', true, 'boleto', 'a_prazo', 'ffffffff-ffff-ffff-ffff-fffffffff001', '11111111-1111-1111-1111-111111111005'),
  ('13131313-1313-1313-1313-131313131002', 'entrada', 'NF-2026-115', '1', '35260322334455000166550010000001151000011152', '2026-03-16', '2026-03-16', '77777777-7777-7777-7777-777777777001', null, 4480.00, 'confirmada', true, true, 'Recebimento parcial da compra COMP-2026-031.', true, 'transferencia', 'a_prazo', null, '11111111-1111-1111-1111-111111111006')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.notas_fiscais_itens (id, nota_fiscal_id, produto_id, quantidade, valor_unitario, cfop, cst)
VALUES
  ('14141414-1414-1414-1414-141414141001', '13131313-1313-1313-1313-131313131001', '33333333-3333-3333-3333-333333333003', 90, 49.90, '5102', '000'),
  ('14141414-1414-1414-1414-141414141002', '13131313-1313-1313-1313-131313131001', '33333333-3333-3333-3333-333333333001', 20, 4.80, '5102', '000'),
  ('14141414-1414-1414-1414-141414141003', '13131313-1313-1313-1313-131313131002', '33333333-3333-3333-3333-333333333003', 160, 28.00, '1102', '000')
ON CONFLICT (id) DO NOTHING;

-- Financeiro
INSERT INTO public.financeiro_lancamentos (
  id, tipo, descricao, valor, data_vencimento, data_pagamento, nota_fiscal_id, documento_fiscal_id,
  cliente_id, fornecedor_id, status, observacoes, ativo, banco, forma_pagamento,
  parcela_numero, parcela_total, conta_bancaria_id, conta_contabil_id
)
VALUES
  ('15151515-1515-1515-1515-151515151001', 'receber', 'NF NF-2026-118 - Parcela 1/2', 4620.00, '2026-04-16', null, '13131313-1313-1313-1313-131313131001', '13131313-1313-1313-1313-131313131001', '66666666-6666-6666-6666-666666666001', null, 'aberto', 'Primeira parcela faturada.', true, 'Inter', 'boleto', 1, 2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  ('15151515-1515-1515-1515-151515151002', 'receber', 'NF NF-2026-118 - Parcela 2/2', 4620.00, '2026-05-16', null, '13131313-1313-1313-1313-131313131001', '13131313-1313-1313-1313-131313131001', '66666666-6666-6666-6666-666666666001', null, 'aberto', 'Segunda parcela faturada.', true, 'Inter', 'boleto', 2, 2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  ('15151515-1515-1515-1515-151515151003', 'pagar', 'NF NF-2026-115 - Parcela 1/2', 2240.00, '2026-04-15', null, '13131313-1313-1313-1313-131313131002', '13131313-1313-1313-1313-131313131002', null, '77777777-7777-7777-7777-777777777001', 'aberto', 'Parcela fornecedor BioVet.', true, 'C6', 'transferencia', 1, 2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004'),
  ('15151515-1515-1515-1515-151515151004', 'pagar', 'NF NF-2026-115 - Parcela 2/2', 2240.00, '2026-05-15', null, '13131313-1313-1313-1313-131313131002', '13131313-1313-1313-1313-131313131002', null, '77777777-7777-7777-7777-777777777001', 'aberto', 'Parcela fornecedor BioVet.', true, 'C6', 'transferencia', 2, 2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004'),
  ('15151515-1515-1515-1515-151515151005', 'receber', 'CR-2026-054 - Granja Santa Helena', 8850.00, '2026-03-05', '2026-03-08', null, null, '66666666-6666-6666-6666-666666666001', null, 'pago', 'Usado para cálculo de PMV.', true, 'Inter', 'pix', 1, 1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  ('15151515-1515-1515-1515-151515151006', 'receber', 'CR-2026-047 - Granja Santa Helena', 6420.00, '2026-02-10', '2026-02-12', null, null, '66666666-6666-6666-6666-666666666001', null, 'pago', 'Usado para cálculo de PMV.', true, 'Inter', 'boleto', 1, 1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  ('15151515-1515-1515-1515-151515151007', 'receber', 'CR-2026-039 - Agropecuária Vale Verde', 9880.00, '2026-03-01', null, null, null, '66666666-6666-6666-6666-666666666003', null, 'vencido', 'Conta vencida para alerta de dashboard.', true, 'Inter', 'boleto', 1, 1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003')
ON CONFLICT (id) DO NOTHING;

-- Caixa e estoque
INSERT INTO public.caixa_movimentos (id, tipo, descricao, valor, data_movimento, conta_bancaria_id, observacoes, ativo)
VALUES
  ('16161616-1616-1616-1616-161616161001', 'entrada', 'Recebimento via PIX - Santa Helena', 8850.00, '2026-03-08', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Baixa de título recebido.', true),
  ('16161616-1616-1616-1616-161616161002', 'saida', 'Pagamento de frete compra', 320.00, '2026-03-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'Saída operacional.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.estoque_movimentos (id, produto_id, tipo, quantidade, saldo_anterior, saldo_atual, motivo, documento_id, documento_tipo)
VALUES
  ('17171717-1717-1717-1717-171717171001', '33333333-3333-3333-3333-333333333003', 'entrada', 160, 0, 160, 'Recebimento NF-2026-115', '13131313-1313-1313-1313-131313131002', 'fiscal'),
  ('17171717-1717-1717-1717-171717171002', '33333333-3333-3333-3333-333333333003', 'saida', 74, 160, 86, 'Faturamento NF-2026-118 e ajustes operacionais', '13131313-1313-1313-1313-131313131001', 'fiscal'),
  ('17171717-1717-1717-1717-171717171003', '33333333-3333-3333-3333-333333333001', 'entrada', 140, 0, 140, 'Recebimento e acerto de inventário', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'compra'),
  ('17171717-1717-1717-1717-171717171004', '33333333-3333-3333-3333-333333333001', 'saida', 20, 140, 120, 'Venda parcial OV-2026-021', '13131313-1313-1313-1313-131313131001', 'fiscal'),
  ('17171717-1717-1717-1717-171717171005', '33333333-3333-3333-3333-333333333004', 'entrada', 20, 0, 20, 'Reposição BioVet', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'compra'),
  ('17171717-1717-1717-1717-171717171006', '33333333-3333-3333-3333-333333333004', 'ajuste', 2, 20, 18, 'Ajuste de inventário', null, 'ajuste')
ON CONFLICT (id) DO NOTHING;

-- Comunicação com clientes
INSERT INTO public.cliente_registros_comunicacao (id, cliente_id, data_hora, canal, assunto, descricao)
VALUES
  ('18181818-1818-1818-1818-181818181001', '66666666-6666-6666-6666-666666666001', '2026-03-15 09:20:00+00', 'WhatsApp', 'Confirmação de proposta', 'Cliente aprovou orçamento ORC-2026-014 e solicitou envio em duas etapas.'),
  ('18181818-1818-1818-1818-181818181002', '66666666-6666-6666-6666-666666666001', '2026-03-16 14:10:00+00', 'Ligação', 'Prazo de despacho', 'Alinhado despacho parcial para 19/03/2026.'),
  ('18181818-1818-1818-1818-181818181003', '66666666-6666-6666-6666-666666666003', '2026-03-12 16:40:00+00', 'E-mail', 'Revisão comercial', 'Cliente pediu revisão do frete na ORC-2026-012.')
ON CONFLICT (id) DO NOTHING;
