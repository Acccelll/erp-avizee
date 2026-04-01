-- ============================================================
-- ERP AviZee — Seed de dados de exemplo (desenvolvimento/teste)
--
-- ⚠️  ATENÇÃO: Execute este script SOMENTE após reset.sql ou
--              em uma base de desenvolvimento limpa.
--              NUNCA execute em produção.
--
-- Cobre: plano de contas → cadastros → cotações → compras →
--        vendas → fiscal → financeiro → estoque → logística
--
-- Execute via: npm run seed:data
--   (ou via npm run dev:reset para reset + seed em sequência)
-- ============================================================

-- ============================================================
-- FASE 1: PLANO DE CONTAS E BANCOS
-- ============================================================

INSERT INTO public.contas_contabeis (id, codigo, descricao, natureza, aceita_lancamento, ativo)
VALUES
  ('11111111-1111-1111-1111-111111111001', '1.1.01.001', 'Caixa Geral',             'devedora',  true, true),
  ('11111111-1111-1111-1111-111111111002', '1.1.02.001', 'Bancos Conta Movimento',  'devedora',  true, true),
  ('11111111-1111-1111-1111-111111111003', '1.1.03.001', 'Clientes a Receber',      'devedora',  true, true),
  ('11111111-1111-1111-1111-111111111004', '2.1.01.001', 'Fornecedores a Pagar',    'credora',   true, true),
  ('11111111-1111-1111-1111-111111111005', '3.1.01.001', 'Receita de Vendas',       'credora',   true, true),
  ('11111111-1111-1111-1111-111111111006', '4.1.01.001', 'CMV / Compras',           'devedora',  true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bancos (id, nome, tipo, ativo)
VALUES
  ('99999999-9999-9999-9999-999999999001', 'Inter',      'banco',    true),
  ('99999999-9999-9999-9999-999999999002', 'C6',         'banco',    true),
  ('99999999-9999-9999-9999-999999999003', 'RecargaPay', 'carteira', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contas_bancarias (id, banco_id, descricao, agencia, conta, titular, saldo_atual, ativo)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '99999999-9999-9999-9999-999999999001',
   'Conta Operacional Inter', '0001', '123456-7', 'AviZee Equipamentos LTDA', 84500.00, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '99999999-9999-9999-9999-999999999002',
   'Conta Comercial C6', '0001', '998877-6', 'AviZee Equipamentos LTDA', 32000.00, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', '99999999-9999-9999-9999-999999999003',
   'Carteira RecargaPay', '-', 'WALLET-01', 'AviZee Equipamentos LTDA', 6500.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 2: DADOS BASE (transportadoras, formas de pagamento,
--         grupos econômicos, grupos de produto)
-- ============================================================

INSERT INTO public.transportadoras (
  id, nome_razao_social, nome_fantasia, cpf_cnpj, contato, telefone, email,
  cidade, uf, cep, modalidade, prazo_medio, observacoes, ativo
)
VALUES
  (
    'a1a1a1a1-0001-0001-0001-000000000001',
    'Empresa Brasileira de Correios e Telégrafos', 'Correios',
    '34.028.316/0001-03', 'Central de Atendimento', '0800-725-0100',
    'atendimento@correios.com.br',
    'Brasília', 'DF', '70002-900', 'multimodal', '5 a 10 dias úteis',
    'Transportadora oficial ECT. Utilizada para envios ao Nordeste e regiões remotas.', true
  ),
  (
    'a1a1a1a1-0001-0001-0001-000000000002',
    'Jadlog Logística S.A.', 'Jadlog',
    '04.884.082/0001-35', 'Comercial Jadlog', '(11) 3009-5533',
    'comercial@jadlog.com.br',
    'São Paulo', 'SP', '04344-900', 'rodoviario', '2 a 5 dias úteis',
    'Especialista em cargas fracionadas. Cobertura nacional com hub em SP.', true
  ),
  (
    'a1a1a1a1-0001-0001-0001-000000000003',
    'AviZee Equipamentos LTDA', 'Entrega Própria',
    '00.000.000/0001-00', 'Logística AviZee', '(19) 3300-0001',
    'logistica@avizee.com.br',
    'Campinas', 'SP', '13010-000', 'rodoviario', '1 a 3 dias úteis',
    'Frota própria para entregas no interior paulista até 400 km de Campinas.', true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.formas_pagamento (
  id, descricao, tipo, prazo_dias, parcelas, intervalos_dias,
  gera_financeiro, observacoes, ativo
)
VALUES
  ('a2a2a2a2-0002-0002-0002-000000000001', 'À Vista', 'dinheiro', 0, 1, '[]'::jsonb,
   true, 'Pagamento no ato da entrega ou faturamento.', true),
  ('a2a2a2a2-0002-0002-0002-000000000002', '7 DDL', 'boleto', 7, 1, '[7]'::jsonb,
   true, 'Boleto com vencimento em 7 dias da data da nota.', true),
  ('a2a2a2a2-0002-0002-0002-000000000003', '14 DDL', 'boleto', 14, 1, '[14]'::jsonb,
   true, 'Boleto com vencimento em 14 dias da data da nota.', true),
  ('a2a2a2a2-0002-0002-0002-000000000004', '28 DDL', 'boleto', 28, 1, '[28]'::jsonb,
   true, 'Boleto com vencimento em 28 dias da data da nota.', true),
  ('a2a2a2a2-0002-0002-0002-000000000005', '30/60/90 DDL', 'boleto', 30, 3, '[30, 60, 90]'::jsonb,
   true, 'Parcelado em 3x sem juros — 30, 60 e 90 dias.', true),
  ('a2a2a2a2-0002-0002-0002-000000000006', 'PIX', 'pix', 0, 1, '[]'::jsonb,
   true, 'Transferência instantânea via PIX. Confirmação imediata.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.grupos_economicos (id, nome, observacoes, ativo)
VALUES
  ('a3a3a3a3-0003-0003-0003-000000000001', 'Grupo Agro 1',
   'Empresas integradas de produção avícola no interior de SP. Matriz em Leme/SP.', true),
  ('a3a3a3a3-0003-0003-0003-000000000002', 'Grupo Agro 2',
   'Cooperativas e unidades produtoras do sul do Brasil. Foco em postura e corte.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.grupos_produto (id, nome, descricao, conta_contabil_id, ativo)
VALUES
  ('a9a9a9a9-0009-0009-0009-000000000001', 'Vacinas',
   'Vacinas aviárias e biológicos para prevenção de doenças em aves.',
   '11111111-1111-1111-1111-111111111006', true),
  ('a9a9a9a9-0009-0009-0009-000000000002', 'Agulhas',
   'Agulhas e acessórios para vacinação e aplicação de medicamentos.',
   '11111111-1111-1111-1111-111111111006', true),
  ('a9a9a9a9-0009-0009-0009-000000000003', 'Seringas',
   'Seringas e kits de aplicação para uso veterinário.',
   '11111111-1111-1111-1111-111111111006', true),
  ('a9a9a9a9-0009-0009-0009-000000000004', 'Insumos',
   'Desinfetantes, produtos de limpeza e insumos gerais para aviários.',
   '11111111-1111-1111-1111-111111111006', true),
  ('a9a9a9a9-0009-0009-0009-000000000005', 'Equipamentos',
   'Equipamentos e acessórios para instalação e operação de aviários.',
   '11111111-1111-1111-1111-111111111006', true),
  ('a9a9a9a9-0009-0009-0009-000000000006', 'Kits',
   'Kits compostos e conjuntos para vacinação e manutenção.',
   '11111111-1111-1111-1111-111111111006', true),
  ('a9a9a9a9-0009-0009-0009-000000000007', 'Reposição',
   'Peças de reposição e manutenção para seringas e equipamentos.',
   '11111111-1111-1111-1111-111111111006', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 3: CLIENTES (6 clientes com perfis variados)
-- ============================================================

INSERT INTO public.clientes (
  id, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, inscricao_estadual,
  email, telefone, celular, contato,
  prazo_padrao, limite_credito,
  logradouro, numero, complemento, bairro, cidade, uf, cep, pais,
  observacoes, grupo_economico_id, tipo_relacao_grupo, caixa_postal,
  forma_pagamento_padrao, prazo_preferencial, ativo
)
VALUES
  (
    -- 1. Granja Santa Helena: alto limite, excelente histórico, grupo 1 matriz
    'a4a4a4a4-0004-0004-0004-000000000001', 'J',
    'Granja Santa Helena Ltda', 'Granja Santa Helena',
    '12.345.678/0001-91', '123.456.789.000',
    'compras@santahelena.com.br', '(19) 3232-1001', '(19) 99888-1001', 'Mariana Lopes',
    28, 80000.00,
    'Rodovia Anhanguera', '1200', 'Km 186', 'Zona Rural', 'Leme', 'SP', '13610-000', 'Brasil',
    'Cliente estratégico. Compras recorrentes mensais. Excelente histórico de pagamento. PMV médio de 26 dias.',
    'a3a3a3a3-0003-0003-0003-000000000001', 'matriz', 'Caixa Postal 101',
    'boleto', 28, true
  ),
  (
    -- 2. Santa Helena Filial: filial do grupo 1, limite compartilhado
    'a4a4a4a4-0004-0004-0004-000000000002', 'J',
    'Santa Helena Filial Rio Claro Ltda', 'Santa Helena Rio Claro',
    '12.345.678/0002-72', '123.456.789.001',
    'filial@santahelena.com.br', '(19) 3522-2201', '(19) 99888-2201', 'Carlos Silva',
    30, 45000.00,
    'Estrada Municipal RC-150', '450', '', 'Distrito Industrial', 'Rio Claro', 'SP', '13505-000', 'Brasil',
    'Filial com compras recorrentes para aplicação. Limite compartilhado com a matriz do grupo.',
    'a3a3a3a3-0003-0003-0003-000000000001', 'filial', 'Caixa Postal 55',
    'boleto', 30, true
  ),
  (
    -- 3. Vale Verde: atraso histórico, grupo 2 matriz, conta vencida aberta
    'a4a4a4a4-0004-0004-0004-000000000003', 'J',
    'Agropecuária Vale Verde S/A', 'Vale Verde',
    '98.765.432/0001-10', '987.654.321.000',
    'compras@valeverde.com.br', '(16) 3821-4400', '(16) 99777-4400', 'João Monteiro',
    35, 65000.00,
    'Av. dos Produtores', '800', 'Bloco B', 'Parque Agro', 'Ribeirão Preto', 'SP', '14000-000', 'Brasil',
    'Histórico com atrasos pontuais de 15 a 30 dias. Negociação ativa para aumento de limite.',
    'a3a3a3a3-0003-0003-0003-000000000002', 'matriz', 'Caixa Postal 209',
    'boleto', 35, true
  ),
  (
    -- 4. Cooperativa Boa Postura: sem grupo, giro alto, pagamento sempre em dia
    'a4a4a4a4-0004-0004-0004-000000000004', 'J',
    'Cooperativa Boa Postura', 'Boa Postura',
    '45.678.901/0001-44', '321.654.987.000',
    'contato@boapostura.coop', '(11) 4000-3400', '(11) 98888-3400', 'Fernanda Reis',
    21, 35000.00,
    'Rua do Campo', '75', '', 'Centro', 'Mogi Mirim', 'SP', '13800-000', 'Brasil',
    'Cooperativa com giro forte em itens de vacinação. Costuma pagar antecipado com desconto.',
    null, 'independente', 'Caixa Postal 18',
    'pix', 21, true
  ),
  (
    -- 5. Avícola Nordeste: cliente novo, sem histórico, crédito reduzido
    'a4a4a4a4-0004-0004-0004-000000000005', 'J',
    'Avícola Nordeste ME', 'Avícola Nordeste',
    '31.222.444/0001-80', '444.111.222.000',
    'compras@avicola-nordeste.com.br', '(85) 3344-5500', '(85) 99555-5500', 'Eduardo Mota',
    14, 15000.00,
    'Rua das Galinhas', '200', '', 'Industrial', 'Fortaleza', 'CE', '60000-000', 'Brasil',
    'Cliente novo captado em feira do setor. Primeira compra em análise. Crédito reduzido até histórico ser estabelecido.',
    null, 'independente', null,
    'pix', 14, true
  ),
  (
    -- 6. Frigorífico Continental: grande volume, atraso crônico, requer aprovação gerencial
    'a4a4a4a4-0004-0004-0004-000000000006', 'J',
    'Frigorífico Continental S/A', 'Continental',
    '55.666.777/0001-22', '666.777.888.000',
    'insumos@continental.ind.br', '(41) 3300-7700', '(41) 99700-7700', 'Rodrigo Lacerda',
    28, 120000.00,
    'Rodovia BR-116', '5000', 'Galpão C', 'Zona Industrial', 'Curitiba', 'PR', '83800-000', 'Brasil',
    'Cliente de grande porte com volume expressivo. Atrasos frequentes de 20 a 45 dias. Requer aprovação gerencial para novas OVs.',
    null, 'independente', 'Caixa Postal 300',
    'boleto', 28, true
  )
ON CONFLICT (id) DO NOTHING;

-- Vincular empresas matrizes dos grupos econômicos
UPDATE public.grupos_economicos
  SET empresa_matriz_id = 'a4a4a4a4-0004-0004-0004-000000000001'
  WHERE id = 'a3a3a3a3-0003-0003-0003-000000000001';

UPDATE public.grupos_economicos
  SET empresa_matriz_id = 'a4a4a4a4-0004-0004-0004-000000000003'
  WHERE id = 'a3a3a3a3-0003-0003-0003-000000000002';

-- ============================================================
-- FASE 4: FORNECEDORES (5 fornecedores)
-- ============================================================

INSERT INTO public.fornecedores (
  id, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, inscricao_estadual,
  email, telefone, celular, contato, prazo_padrao,
  logradouro, numero, complemento, bairro, cidade, uf, cep, pais,
  observacoes, ativo
)
VALUES
  (
    'a5a5a5a5-0005-0005-0005-000000000001', 'J',
    'BioVet Insumos Ltda', 'BioVet',
    '11.222.333/0001-44', '222.333.444.555',
    'vendas@biovet.com.br', '(19) 3500-2000', '(19) 99700-2000', 'Renato Alves', 28,
    'Rua Industrial', '120', '', 'Polo Logístico', 'Campinas', 'SP', '13000-000', 'Brasil',
    'Fornecedor principal de seringas, kits e vacinas. Prazo de entrega 7-10 dias. Pontual. Atraso médio < 1 dia.', true
  ),
  (
    'a5a5a5a5-0005-0005-0005-000000000002', 'J',
    'Agroinsumos do Sul Ltda', 'Agro Sul',
    '22.333.444/0001-55', '333.444.555.666',
    'comercial@agrosul.com.br', '(47) 3300-2100', '(47) 99710-2100', 'Paulo Nunes', 35,
    'Av. das Nações', '550', '', 'Distrito Industrial', 'Joinville', 'SC', '89200-000', 'Brasil',
    'Especialista em agulhas e acessórios. Entrega em 7 dias. Atraso médio de 2 dias. Volume alto.', true
  ),
  (
    'a5a5a5a5-0005-0005-0005-000000000003', 'J',
    'Pack Rural Embalagens Ltda', 'Pack Rural',
    '33.444.555/0001-66', '444.555.666.777',
    'contato@packrural.com.br', '(19) 3600-1800', '(19) 99720-1800', 'Débora Lima', 21,
    'Rua das Caixas', '88', '', 'Jardim Nova Era', 'Limeira', 'SP', '13480-000', 'Brasil',
    'Embalagens e kits de manutenção. Entrega imediata para região de Campinas. Preço competitivo.', true
  ),
  (
    'a5a5a5a5-0005-0005-0005-000000000004', 'J',
    'VetEquip Brasil Equipamentos Ltda', 'VetEquip',
    '44.555.666/0001-77', '555.666.777.888',
    'vendas@vetequip.com.br', '(11) 3040-8800', '(11) 99810-8800', 'Luciana Ferreira', 30,
    'Av. Paulista', '1500', 'Sala 42', 'Bela Vista', 'São Paulo', 'SP', '01310-000', 'Brasil',
    'Equipamentos para aviário e bebedouros nipple. Volume médio. Prazo de entrega 15 dias.', true
  ),
  (
    'a5a5a5a5-0005-0005-0005-000000000005', 'J',
    'Farmavias Distribuidora de Insumos Ltda', 'Farmavias',
    '55.666.777/0001-88', '666.777.888.999',
    'compras@farmavias.com.br', '(62) 3600-4400', '(62) 99600-4400', 'Marcelo Borges', 28,
    'Rua dos Insumos', '340', '', 'Setor Farmacêutico', 'Goiânia', 'GO', '74000-000', 'Brasil',
    'Distribuidora de desinfetantes e insumos de limpeza. Entrega nacional em 10-15 dias. Pós-venda eficiente.', true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 5: PRODUTOS (12 produtos em 7 categorias)
-- ============================================================

INSERT INTO public.produtos (
  id, sku, codigo_interno, nome, descricao, grupo_id, unidade_medida,
  preco_custo, preco_venda, estoque_atual, estoque_minimo,
  peso, ncm, cst, cfop_padrao,
  eh_composto, markup_percentual, ativo
)
VALUES
  -- Agulhas (3)
  ('a6a6a6a6-0006-0006-0006-000000000001', 'AG-10X10', 'PRD-001',
   'Agulha Inox 10x10', 'Agulha inox para vacinação aviária, caixa com 100 unidades.',
   'a9a9a9a9-0009-0009-0009-000000000002', 'UN',
   2.10, 4.80, 350, 80, 0.010, '90183211', '000', '5102', false, 129, true),
  ('a6a6a6a6-0006-0006-0006-000000000002', 'AG-15X15', 'PRD-002',
   'Agulha Inox 15x15', 'Agulha inox para manejo e aplicação de vacinas, caixa com 100 unidades.',
   'a9a9a9a9-0009-0009-0009-000000000002', 'UN',
   2.45, 5.40, 480, 100, 0.012, '90183211', '000', '5102', false, 120, true),
  ('a6a6a6a6-0006-0006-0006-000000000003', 'AG-20X15', 'PRD-003',
   'Agulha Inox 20x15', 'Agulha inox calibre 20 para aplicação intramuscular.',
   'a9a9a9a9-0009-0009-0009-000000000002', 'UN',
   2.80, 6.20, 200, 60, 0.015, '90183211', '000', '5102', false, 121, true),
  -- Seringas (2)
  ('a6a6a6a6-0006-0006-0006-000000000004', 'SR-BOUBA-05', 'PRD-004',
   'Seringa Bouba 0,5 mL', 'Kit de seringa bouba para vacinação aviária. Composto com mola do êmbolo.',
   'a9a9a9a9-0009-0009-0009-000000000003', 'UN',
   28.00, 49.90, 120, 30, 0.120, '90183119', '000', '5102', true, 78, true),
  ('a6a6a6a6-0006-0006-0006-000000000005', 'SR-DRENCHER-30', 'PRD-005',
   'Seringa Drencher 30 mL', 'Seringa drencher para medicação oral de aves, capacidade 30 mL.',
   'a9a9a9a9-0009-0009-0009-000000000003', 'UN',
   38.00, 72.00, 90, 20, 0.200, '90183119', '000', '5102', false, 89, true),
  -- Vacinas (2)
  ('a6a6a6a6-0006-0006-0006-000000000006', 'VAC-NEWCASTLE-1000', 'PRD-006',
   'Vacina Newcastle 1000D', 'Vacina liofilizada contra Doença de Newcastle, dose para 1000 aves.',
   'a9a9a9a9-0009-0009-0009-000000000001', 'FR',
   18.50, 34.90, 200, 50, 0.050, '30021900', '000', '5102', false, 89, true),
  ('a6a6a6a6-0006-0006-0006-000000000007', 'VAC-MAREK-1000', 'PRD-007',
   'Vacina Marek 1000D', 'Vacina contra Doença de Marek, dose para 1000 aves. Conservar sob refrigeração.',
   'a9a9a9a9-0009-0009-0009-000000000001', 'FR',
   22.00, 42.50, 150, 40, 0.060, '30021900', '000', '5102', false, 93, true),
  -- Insumos (1)
  ('a6a6a6a6-0006-0006-0006-000000000008', 'DESINF-AVIARIO-5L', 'PRD-008',
   'Desinfetante Aviário 5L', 'Desinfetante concentrado para higienização de aviários, galão 5 litros.',
   'a9a9a9a9-0009-0009-0009-000000000004', 'GL',
   32.00, 59.90, 80, 20, 5.200, '38089410', '000', '5102', false, 87, true),
  -- Equipamentos (1)
  ('a6a6a6a6-0006-0006-0006-000000000009', 'BEB-NIPPLE-GALAO', 'PRD-009',
   'Bebedouro Nipple Galão', 'Bebedouro tipo nipple para galão de 10L, ideal para pintinhos.',
   'a9a9a9a9-0009-0009-0009-000000000005', 'UN',
   48.00, 89.90, 60, 15, 0.350, '39249000', '000', '5102', false, 87, true),
  -- Reposição (1)
  ('a6a6a6a6-0006-0006-0006-000000000010', 'MOL-EMB-05', 'PRD-010',
   'Mola do Êmbolo 0,5', 'Mola de reposição para seringa bouba 0,5 mL.',
   'a9a9a9a9-0009-0009-0009-000000000007', 'UN',
   4.50, 9.90, 25, 10, 0.005, '73209000', '000', '5102', false, 120, true),
  -- Kits compostos (2)
  ('a6a6a6a6-0006-0006-0006-000000000011', 'KIT-VAC-BOUBA-COMP', 'PRD-011',
   'Kit Vacinação Bouba Completo',
   'Kit composto: 1x Seringa Bouba 0,5 mL + 1x Frasco Vacina Newcastle 1000D.',
   'a9a9a9a9-0009-0009-0009-000000000006', 'KIT',
   46.50, 89.90, 45, 10, 0.170, '90183119', '000', '5102', true, 93, true),
  ('a6a6a6a6-0006-0006-0006-000000000012', 'KIT-CAL-01', 'PRD-012',
   'Kit de Calibração',
   'Kit composto para ajuste e manutenção de seringas. Inclui 2x Agulha 15x15 + 1x Mola Êmbolo.',
   'a9a9a9a9-0009-0009-0009-000000000006', 'KIT',
   10.40, 24.90, 30, 8, 0.029, '90279099', '000', '5102', true, 139, true)
ON CONFLICT (id) DO NOTHING;

-- Composição de produtos (BOM)
INSERT INTO public.produto_composicoes (id, produto_pai_id, produto_filho_id, quantidade, ordem)
VALUES
  -- Seringa Bouba 0,5 mL = 1x Seringa + 1x Mola Êmbolo
  ('a7a7a7a7-0007-0007-0007-000000000001',
   'a6a6a6a6-0006-0006-0006-000000000004',
   'a6a6a6a6-0006-0006-0006-000000000010', 1, 1),
  -- Kit Vacinação Bouba = 1x Seringa Bouba + 1x Vacina Newcastle
  ('a7a7a7a7-0007-0007-0007-000000000002',
   'a6a6a6a6-0006-0006-0006-000000000011',
   'a6a6a6a6-0006-0006-0006-000000000004', 1, 1),
  ('a7a7a7a7-0007-0007-0007-000000000003',
   'a6a6a6a6-0006-0006-0006-000000000011',
   'a6a6a6a6-0006-0006-0006-000000000006', 1, 2),
  -- Kit Calibração = 2x Agulha 15x15 + 1x Mola Êmbolo
  ('a7a7a7a7-0007-0007-0007-000000000004',
   'a6a6a6a6-0006-0006-0006-000000000012',
   'a6a6a6a6-0006-0006-0006-000000000002', 2, 1),
  ('a7a7a7a7-0007-0007-0007-000000000005',
   'a6a6a6a6-0006-0006-0006-000000000012',
   'a6a6a6a6-0006-0006-0006-000000000010', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 6: RELACIONAMENTOS
-- ============================================================

-- Produtos ↔ Fornecedores
INSERT INTO public.produtos_fornecedores (
  id, produto_id, fornecedor_id, referencia_fornecedor,
  preco_compra, lead_time_dias, descricao_fornecedor, eh_principal
)
VALUES
  ('a8a8a8a8-0008-0008-0008-000000000001',
   'a6a6a6a6-0006-0006-0006-000000000001', 'a5a5a5a5-0005-0005-0005-000000000002',
   'AG10X10-SUL', 2.10, 7, 'Agulha Inox 10x10 - CX100 Agro Sul', true),
  ('a8a8a8a8-0008-0008-0008-000000000002',
   'a6a6a6a6-0006-0006-0006-000000000002', 'a5a5a5a5-0005-0005-0005-000000000002',
   'AG15X15-SUL', 2.45, 7, 'Agulha Inox 15x15 - CX100 Agro Sul', true),
  ('a8a8a8a8-0008-0008-0008-000000000003',
   'a6a6a6a6-0006-0006-0006-000000000003', 'a5a5a5a5-0005-0005-0005-000000000002',
   'AG20X15-SUL', 2.80, 7, 'Agulha Inox 20x15 - CX100 Agro Sul', true),
  ('a8a8a8a8-0008-0008-0008-000000000004',
   'a6a6a6a6-0006-0006-0006-000000000004', 'a5a5a5a5-0005-0005-0005-000000000001',
   'SB-05-BVT', 28.00, 10, 'Seringa Bouba 0.5mL BioVet', true),
  ('a8a8a8a8-0008-0008-0008-000000000005',
   'a6a6a6a6-0006-0006-0006-000000000005', 'a5a5a5a5-0005-0005-0005-000000000001',
   'SD-30-BVT', 38.00, 10, 'Seringa Drencher 30mL BioVet', true),
  ('a8a8a8a8-0008-0008-0008-000000000006',
   'a6a6a6a6-0006-0006-0006-000000000006', 'a5a5a5a5-0005-0005-0005-000000000001',
   'VAC-NCL-1000-BVT', 18.50, 10, 'Vacina Newcastle 1000D BioVet', true),
  ('a8a8a8a8-0008-0008-0008-000000000007',
   'a6a6a6a6-0006-0006-0006-000000000007', 'a5a5a5a5-0005-0005-0005-000000000001',
   'VAC-MRK-1000-BVT', 22.00, 10, 'Vacina Marek 1000D BioVet', true),
  ('a8a8a8a8-0008-0008-0008-000000000008',
   'a6a6a6a6-0006-0006-0006-000000000008', 'a5a5a5a5-0005-0005-0005-000000000005',
   'DES-AV-5L-FMV', 32.00, 12, 'Desinfetante Aviário 5L Farmavias', true),
  ('a8a8a8a8-0008-0008-0008-000000000009',
   'a6a6a6a6-0006-0006-0006-000000000009', 'a5a5a5a5-0005-0005-0005-000000000004',
   'BEB-NIP-VEQ', 48.00, 15, 'Bebedouro Nipple VetEquip', true),
  ('a8a8a8a8-0008-0008-0008-000000000010',
   'a6a6a6a6-0006-0006-0006-000000000010', 'a5a5a5a5-0005-0005-0005-000000000001',
   'MOL05-BVT', 4.50, 5, 'Mola Êmbolo 0.5 BioVet', true),
  -- Desinfetante: Pack Rural como fornecedor secundário
  ('a8a8a8a8-0008-0008-0008-000000000011',
   'a6a6a6a6-0006-0006-0006-000000000008', 'a5a5a5a5-0005-0005-0005-000000000003',
   'DES-AV-5L-PKR', 34.00, 7, 'Desinfetante Aviário 5L Pack Rural', false)
ON CONFLICT (id) DO NOTHING;

-- Clientes ↔ Transportadoras
INSERT INTO public.cliente_transportadoras (
  id, cliente_id, transportadora_id, prioridade, modalidade, prazo_medio, observacoes, ativo
)
VALUES
  ('aba1aba1-aba1-aba1-aba1-aba100000001',
   'a4a4a4a4-0004-0004-0004-000000000001', 'a1a1a1a1-0001-0001-0001-000000000003',
   1, 'rodoviario', '2 dias', 'Entrega própria preferencial para Santa Helena.', true),
  ('aba1aba1-aba1-aba1-aba1-aba100000002',
   'a4a4a4a4-0004-0004-0004-000000000001', 'a1a1a1a1-0001-0001-0001-000000000002',
   2, 'rodoviario', '3 dias', 'Jadlog como alternativa para Santa Helena.', true),
  ('aba1aba1-aba1-aba1-aba1-aba100000003',
   'a4a4a4a4-0004-0004-0004-000000000002', 'a1a1a1a1-0001-0001-0001-000000000003',
   1, 'rodoviario', '2 dias', 'Entrega própria para filial Rio Claro.', true),
  ('aba1aba1-aba1-aba1-aba1-aba100000004',
   'a4a4a4a4-0004-0004-0004-000000000003', 'a1a1a1a1-0001-0001-0001-000000000002',
   1, 'rodoviario', '3 dias', 'Jadlog preferencial para Ribeirão Preto.', true),
  ('aba1aba1-aba1-aba1-aba1-aba100000005',
   'a4a4a4a4-0004-0004-0004-000000000004', 'a1a1a1a1-0001-0001-0001-000000000003',
   1, 'rodoviario', '2 dias', 'Entrega própria para Cooperativa Boa Postura.', true),
  ('aba1aba1-aba1-aba1-aba1-aba100000006',
   'a4a4a4a4-0004-0004-0004-000000000005', 'a1a1a1a1-0001-0001-0001-000000000001',
   1, 'multimodal', '7 dias', 'Correios para Fortaleza/CE.', true),
  ('aba1aba1-aba1-aba1-aba1-aba100000007',
   'a4a4a4a4-0004-0004-0004-000000000006', 'a1a1a1a1-0001-0001-0001-000000000002',
   1, 'rodoviario', '2 dias', 'Jadlog para Curitiba/PR.', true)
ON CONFLICT (id) DO NOTHING;

-- Preços especiais por cliente
INSERT INTO public.precos_especiais (
  id, cliente_id, produto_id, preco_especial, desconto_percentual,
  vigencia_inicio, vigencia_fim, observacao, ativo
)
VALUES
  ('ace1ace1-ace1-ace1-ace1-ace100000001',
   'a4a4a4a4-0004-0004-0004-000000000001', 'a6a6a6a6-0006-0006-0006-000000000001',
   4.20, 12.5, '2026-01-01', '2026-12-31',
   'Desconto fidelidade cliente estratégico - Agulha 10x10.', true),
  ('ace1ace1-ace1-ace1-ace1-ace100000002',
   'a4a4a4a4-0004-0004-0004-000000000001', 'a6a6a6a6-0006-0006-0006-000000000006',
   30.00, 14.0, '2026-01-01', '2026-12-31',
   'Preço negociado por volume em vacina Newcastle.', true),
  ('ace1ace1-ace1-ace1-ace1-ace100000003',
   'a4a4a4a4-0004-0004-0004-000000000003', 'a6a6a6a6-0006-0006-0006-000000000011',
   79.90, 11.1, '2026-01-01', '2026-12-31',
   'Desconto por volume em kits compostos - negociação comercial.', true),
  ('ace1ace1-ace1-ace1-ace1-ace100000004',
   'a4a4a4a4-0004-0004-0004-000000000006', 'a6a6a6a6-0006-0006-0006-000000000008',
   52.00, 13.2, '2026-01-01', '2026-12-31',
   'Desconto por volume expressivo de desinfetante.', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 7: COTAÇÕES DE COMPRA
-- ============================================================

INSERT INTO public.cotacoes_compra (
  id, numero, data_cotacao, data_validade, status, observacoes, ativo
)
VALUES
  ('ac01ac01-ac01-ac01-ac01-ac0100000001',
   'COT-COMP-2026-001', '2026-03-20', '2026-04-05',
   'finalizada', 'Cotação para reposição de agulhas e seringas.', true),
  ('ac01ac01-ac01-ac01-ac01-ac0100000002',
   'COT-COMP-2026-002', '2026-03-28', '2026-04-12',
   'em_analise', 'Cotação para vacinas Newcastle e Marek.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cotacoes_compra_itens (
  id, cotacao_compra_id, produto_id, quantidade, unidade
)
VALUES
  ('ac02ac02-ac02-ac02-ac02-ac0200000001',
   'ac01ac01-ac01-ac01-ac01-ac0100000001', 'a6a6a6a6-0006-0006-0006-000000000001', 500, 'UN'),
  ('ac02ac02-ac02-ac02-ac02-ac0200000002',
   'ac01ac01-ac01-ac01-ac01-ac0100000001', 'a6a6a6a6-0006-0006-0006-000000000004', 100, 'UN'),
  ('ac02ac02-ac02-ac02-ac02-ac0200000003',
   'ac01ac01-ac01-ac01-ac01-ac0100000002', 'a6a6a6a6-0006-0006-0006-000000000006', 200, 'FR'),
  ('ac02ac02-ac02-ac02-ac02-ac0200000004',
   'ac01ac01-ac01-ac01-ac01-ac0100000002', 'a6a6a6a6-0006-0006-0006-000000000007', 150, 'FR')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cotacoes_compra_propostas (
  id, cotacao_compra_id, item_id, fornecedor_id,
  preco_unitario, prazo_entrega_dias, observacoes, selecionado
)
VALUES
  ('ac03ac03-ac03-ac03-ac03-ac0300000001',
   'ac01ac01-ac01-ac01-ac01-ac0100000001', 'ac02ac02-ac02-ac02-ac02-ac0200000001',
   'a5a5a5a5-0005-0005-0005-000000000002',
   2.10, 7, 'Proposta Agro Sul - melhor preço para agulhas.', true),
  ('ac03ac03-ac03-ac03-ac03-ac0300000002',
   'ac01ac01-ac01-ac01-ac01-ac0100000001', 'ac02ac02-ac02-ac02-ac02-ac0200000002',
   'a5a5a5a5-0005-0005-0005-000000000001',
   28.00, 10, 'Proposta BioVet - prazo 10 dias para seringas.', true),
  ('ac03ac03-ac03-ac03-ac03-ac0300000003',
   'ac01ac01-ac01-ac01-ac01-ac0100000002', 'ac02ac02-ac02-ac02-ac02-ac0200000003',
   'a5a5a5a5-0005-0005-0005-000000000001',
   18.50, 10, 'Proposta BioVet - Newcastle, preço regular.', true),
  ('ac03ac03-ac03-ac03-ac03-ac0300000004',
   'ac01ac01-ac01-ac01-ac01-ac0100000002', 'ac02ac02-ac02-ac02-ac02-ac0200000004',
   'a5a5a5a5-0005-0005-0005-000000000001',
   22.00, 10, 'Proposta BioVet - Marek, preço regular.', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 8: COMPRAS
-- ============================================================

INSERT INTO public.compras (
  id, numero, fornecedor_id, data_compra, data_entrega,
  data_entrega_prevista, data_entrega_real,
  valor_total, valor_produtos, frete_valor, impostos_valor,
  observacoes, status, ativo
)
VALUES
  ('b1b1b1b1-b001-b001-b001-b00100000001',
   'COMP-2026-001', 'a5a5a5a5-0005-0005-0005-000000000002',
   '2026-03-20', '2026-03-27', '2026-03-27', '2026-03-27',
   3830.00, 3650.00, 110.00, 70.00,
   'Reposição agulhas - resultado da cotação COT-COMP-2026-001.', 'confirmado', true),
  ('b1b1b1b1-b001-b001-b001-b00100000002',
   'COMP-2026-002', 'a5a5a5a5-0005-0005-0005-000000000001',
   '2026-03-22', '2026-04-01', '2026-04-01', null,
   7440.00, 7100.00, 200.00, 140.00,
   'Compra de seringas e vacinas Newcastle conforme cotação.', 'confirmado', true),
  ('b1b1b1b1-b001-b001-b001-b00100000003',
   'COMP-2026-003', 'a5a5a5a5-0005-0005-0005-000000000005',
   '2026-03-25', '2026-04-05', '2026-04-05', null,
   2880.00, 2720.00, 100.00, 60.00,
   'Desinfetante aviário - reposição semestral.', 'confirmado', true),
  ('b1b1b1b1-b001-b001-b001-b00100000004',
   'COMP-2026-004', 'a5a5a5a5-0005-0005-0005-000000000004',
   '2026-03-28', '2026-04-12', '2026-04-12', null,
   5280.00, 5000.00, 180.00, 100.00,
   'Bebedouros nipple para novo galpão de produção.', 'confirmado', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.compras_itens (
  id, compra_id, produto_id, quantidade, valor_unitario, valor_total
)
VALUES
  ('b2b2b2b2-b002-b002-b002-b00200000001',
   'b1b1b1b1-b001-b001-b001-b00100000001', 'a6a6a6a6-0006-0006-0006-000000000001', 500, 2.10, 1050.00),
  ('b2b2b2b2-b002-b002-b002-b00200000002',
   'b1b1b1b1-b001-b001-b001-b00100000001', 'a6a6a6a6-0006-0006-0006-000000000002', 400, 2.45, 980.00),
  ('b2b2b2b2-b002-b002-b002-b00200000003',
   'b1b1b1b1-b001-b001-b001-b00100000001', 'a6a6a6a6-0006-0006-0006-000000000003', 220, 2.80, 616.00),
  ('b2b2b2b2-b002-b002-b002-b00200000004',
   'b1b1b1b1-b001-b001-b001-b00100000002', 'a6a6a6a6-0006-0006-0006-000000000004', 120, 28.00, 3360.00),
  ('b2b2b2b2-b002-b002-b002-b00200000005',
   'b1b1b1b1-b001-b001-b001-b00100000002', 'a6a6a6a6-0006-0006-0006-000000000006', 180, 18.50, 3330.00),
  ('b2b2b2b2-b002-b002-b002-b00200000006',
   'b1b1b1b1-b001-b001-b001-b00100000003', 'a6a6a6a6-0006-0006-0006-000000000008', 80, 32.00, 2560.00),
  ('b2b2b2b2-b002-b002-b002-b00200000007',
   'b1b1b1b1-b001-b001-b001-b00100000004', 'a6a6a6a6-0006-0006-0006-000000000009', 60, 48.00, 2880.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 9: ORÇAMENTOS (cotações de venda)
-- ============================================================

INSERT INTO public.orcamentos (
  id, numero, cliente_id, data_orcamento, validade,
  valor_total, desconto, imposto_st, imposto_ipi,
  frete_valor, outras_despesas, quantidade_total, peso_total,
  pagamento, prazo_pagamento, prazo_entrega,
  frete_tipo, modalidade, observacoes, status, ativo
)
VALUES
  ('c1c1c1c1-c001-c001-c001-c00100000001',
   'ORC-2026-001', 'a4a4a4a4-0004-0004-0004-000000000001',
   '2026-03-18', '2026-03-25',
   23580.00, 350.00, 0, 0, 200.00, 0, 280, 38.0,
   'Boleto', '28 DDL', '5 dias', 'CIF', 'venda',
   'Proposta trimestral Granja Santa Helena com preços especiais negociados.', 'aprovado', true),
  ('c1c1c1c1-c001-c001-c001-c00100000002',
   'ORC-2026-002', 'a4a4a4a4-0004-0004-0004-000000000003',
   '2026-03-22', '2026-03-29',
   12680.00, 180.00, 0, 0, 150.00, 0, 160, 21.0,
   'PIX', '21 DDL', '7 dias', 'FOB', 'venda',
   'Pedido emergencial para campanha de vacinação Vale Verde. Aguardando confirmação.', 'aprovado', true),
  ('c1c1c1c1-c001-c001-c001-c00100000003',
   'ORC-2026-003', 'a4a4a4a4-0004-0004-0004-000000000006',
   '2026-03-26', '2026-04-02',
   31500.00, 420.00, 0, 0, 350.00, 0, 380, 48.0,
   'Boleto', '28 DDL', '10 dias', 'CIF', 'venda',
   'Volume grande Continental. Aprovação gerencial necessária - histórico de atraso.', 'convertido', true),
  ('c1c1c1c1-c001-c001-c001-c00100000004',
   'ORC-2026-004', 'a4a4a4a4-0004-0004-0004-000000000005',
   '2026-04-01', '2026-04-08',
   4850.00, 0, 0, 0, 80.00, 0, 60, 8.5,
   'PIX', 'À Vista', '3 dias', 'CIF', 'venda',
   'Primeira compra Avícola Nordeste. Aguardando confirmação de pagamento antecipado.', 'pendente', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orcamentos_itens (
  id, orcamento_id, produto_id,
  quantidade, valor_unitario, valor_total,
  variacao, unidade, peso_unitario, peso_total,
  codigo_snapshot, descricao_snapshot
)
VALUES
  -- ORC-2026-001 (Granja Santa Helena)
  ('c2c2c2c2-c002-c002-c002-c00200000001', 'c1c1c1c1-c001-c001-c001-c00100000001',
   'a6a6a6a6-0006-0006-0006-000000000001',
   200, 4.20, 840.00, '', 'UN', 0.010, 2.0, 'AG-10X10', 'Agulha Inox 10x10'),
  ('c2c2c2c2-c002-c002-c002-c00200000002', 'c1c1c1c1-c001-c001-c001-c00100000001',
   'a6a6a6a6-0006-0006-0006-000000000004',
   80, 49.90, 3992.00, '', 'UN', 0.120, 9.6, 'SR-BOUBA-05', 'Seringa Bouba 0,5 mL'),
  ('c2c2c2c2-c002-c002-c002-c00200000003', 'c1c1c1c1-c001-c001-c001-c00100000001',
   'a6a6a6a6-0006-0006-0006-000000000006',
   120, 30.00, 3600.00, '', 'FR', 0.050, 6.0, 'VAC-NEWCASTLE-1000', 'Vacina Newcastle 1000D'),
  ('c2c2c2c2-c002-c002-c002-c00200000004', 'c1c1c1c1-c001-c001-c001-c00100000001',
   'a6a6a6a6-0006-0006-0006-000000000011',
   50, 89.90, 4495.00, '', 'KIT', 0.170, 8.5, 'KIT-VAC-BOUBA-COMP', 'Kit Vacinação Bouba Completo'),
  -- ORC-2026-002 (Agropecuária Vale Verde)
  ('c2c2c2c2-c002-c002-c002-c00200000005', 'c1c1c1c1-c001-c001-c001-c00100000002',
   'a6a6a6a6-0006-0006-0006-000000000006',
   100, 34.90, 3490.00, '', 'FR', 0.050, 5.0, 'VAC-NEWCASTLE-1000', 'Vacina Newcastle 1000D'),
  ('c2c2c2c2-c002-c002-c002-c00200000006', 'c1c1c1c1-c001-c001-c001-c00100000002',
   'a6a6a6a6-0006-0006-0006-000000000007',
   60, 42.50, 2550.00, '', 'FR', 0.060, 3.6, 'VAC-MAREK-1000', 'Vacina Marek 1000D'),
  -- ORC-2026-003 (Frigorífico Continental)
  ('c2c2c2c2-c002-c002-c002-c00200000007', 'c1c1c1c1-c001-c001-c001-c00100000003',
   'a6a6a6a6-0006-0006-0006-000000000008',
   150, 52.00, 7800.00, '', 'GL', 5.200, 780.0, 'DESINF-AVIARIO-5L', 'Desinfetante Aviário 5L'),
  ('c2c2c2c2-c002-c002-c002-c00200000008', 'c1c1c1c1-c001-c001-c001-c00100000003',
   'a6a6a6a6-0006-0006-0006-000000000009',
   80, 89.90, 7192.00, '', 'UN', 0.350, 28.0, 'BEB-NIPPLE-GALAO', 'Bebedouro Nipple Galão'),
  -- ORC-2026-004 (Avícola Nordeste - novo)
  ('c2c2c2c2-c002-c002-c002-c00200000009', 'c1c1c1c1-c001-c001-c001-c00100000004',
   'a6a6a6a6-0006-0006-0006-000000000004',
   40, 49.90, 1996.00, '', 'UN', 0.120, 4.8, 'SR-BOUBA-05', 'Seringa Bouba 0,5 mL'),
  ('c2c2c2c2-c002-c002-c002-c00200000010', 'c1c1c1c1-c001-c001-c001-c00100000004',
   'a6a6a6a6-0006-0006-0006-000000000006',
   50, 34.90, 1745.00, '', 'FR', 0.050, 2.5, 'VAC-NEWCASTLE-1000', 'Vacina Newcastle 1000D')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 10: ORDENS DE VENDA
-- ============================================================

INSERT INTO public.ordens_venda (
  id, numero, data_emissao, cliente_id, cotacao_id,
  status, status_faturamento,
  data_aprovacao, data_prometida_despacho, prazo_despacho_dias,
  valor_total, observacoes, ativo
)
VALUES
  ('d1d1d1d1-d001-d001-d001-d00100000001',
   'OV-2026-001', '2026-03-19',
   'a4a4a4a4-0004-0004-0004-000000000001', 'c1c1c1c1-c001-c001-c001-c00100000001',
   'aprovada', 'parcial',
   '2026-03-19', '2026-03-24', 5,
   23580.00, 'OV gerada a partir de ORC-2026-001. Entrega em duas remessas conforme combinado.', true),
  ('d1d1d1d1-d001-d001-d001-d00100000002',
   'OV-2026-002', '2026-03-23',
   'a4a4a4a4-0004-0004-0004-000000000003', 'c1c1c1c1-c001-c001-c001-c00100000002',
   'em_separacao', 'aguardando',
   '2026-03-23', '2026-03-30', 7,
   12680.00, 'Separação iniciada. Aguardando liberação de estoque de vacinas.', true),
  ('d1d1d1d1-d001-d001-d001-d00100000003',
   'OV-2026-003', '2026-03-27',
   'a4a4a4a4-0004-0004-0004-000000000006', 'c1c1c1c1-c001-c001-c001-c00100000003',
   'aprovada', 'aguardando',
   '2026-03-27', '2026-04-06', 10,
   31500.00, 'Aprovação gerencial obtida. Grande volume - aguardando faturamento.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ordens_venda_itens (
  id, ordem_venda_id, produto_id,
  codigo_snapshot, descricao_snapshot,
  quantidade, unidade, valor_unitario, valor_total,
  peso_unitario, peso_total, quantidade_faturada
)
VALUES
  -- OV-2026-001 (Granja Santa Helena)
  ('d2d2d2d2-d002-d002-d002-d00200000001', 'd1d1d1d1-d001-d001-d001-d00100000001',
   'a6a6a6a6-0006-0006-0006-000000000001',
   'AG-10X10', 'Agulha Inox 10x10', 200, 'UN', 4.20, 840.00, 0.010, 2.0, 100),
  ('d2d2d2d2-d002-d002-d002-d00200000002', 'd1d1d1d1-d001-d001-d001-d00100000001',
   'a6a6a6a6-0006-0006-0006-000000000004',
   'SR-BOUBA-05', 'Seringa Bouba 0,5 mL', 80, 'UN', 49.90, 3992.00, 0.120, 9.6, 40),
  ('d2d2d2d2-d002-d002-d002-d00200000003', 'd1d1d1d1-d001-d001-d001-d00100000001',
   'a6a6a6a6-0006-0006-0006-000000000006',
   'VAC-NEWCASTLE-1000', 'Vacina Newcastle 1000D', 120, 'FR', 30.00, 3600.00, 0.050, 6.0, 60),
  -- OV-2026-002 (Agropecuária Vale Verde)
  ('d2d2d2d2-d002-d002-d002-d00200000004', 'd1d1d1d1-d001-d001-d001-d00100000002',
   'a6a6a6a6-0006-0006-0006-000000000006',
   'VAC-NEWCASTLE-1000', 'Vacina Newcastle 1000D', 100, 'FR', 34.90, 3490.00, 0.050, 5.0, 0),
  ('d2d2d2d2-d002-d002-d002-d00200000005', 'd1d1d1d1-d001-d001-d001-d00100000002',
   'a6a6a6a6-0006-0006-0006-000000000007',
   'VAC-MAREK-1000', 'Vacina Marek 1000D', 60, 'FR', 42.50, 2550.00, 0.060, 3.6, 0),
  -- OV-2026-003 (Frigorífico Continental)
  ('d2d2d2d2-d002-d002-d002-d00200000006', 'd1d1d1d1-d001-d001-d001-d00100000003',
   'a6a6a6a6-0006-0006-0006-000000000008',
   'DESINF-AVIARIO-5L', 'Desinfetante Aviário 5L', 150, 'GL', 52.00, 7800.00, 5.200, 780.0, 0),
  ('d2d2d2d2-d002-d002-d002-d00200000007', 'd1d1d1d1-d001-d001-d001-d00100000003',
   'a6a6a6a6-0006-0006-0006-000000000009',
   'BEB-NIPPLE-GALAO', 'Bebedouro Nipple Galão', 80, 'UN', 89.90, 7192.00, 0.350, 28.0, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 11: NOTAS FISCAIS
-- ============================================================

INSERT INTO public.notas_fiscais (
  id, tipo, numero, serie, chave_acesso,
  data_emissao, data_recebimento,
  fornecedor_id, cliente_id,
  valor_total, status, movimenta_estoque, gera_financeiro,
  observacoes, ativo, forma_pagamento, condicao_pagamento,
  ordem_venda_id, conta_contabil_id
)
VALUES
  (
    'e1e1e1e1-e001-e001-e001-e00100000001',
    'saida', 'NF-2026-201', '1',
    '35260312345678000191550010000002011000022011',
    '2026-03-20', null, null,
    'a4a4a4a4-0004-0004-0004-000000000001',
    8632.00, 'confirmada', true, true,
    'Faturamento parcial OV-2026-001 - 1ª remessa (100 ag + 40 seringas + 60 vacinas).', true,
    'boleto', 'a_prazo',
    'd1d1d1d1-d001-d001-d001-d00100000001', '11111111-1111-1111-1111-111111111005'
  ),
  (
    'e1e1e1e1-e001-e001-e001-e00100000002',
    'saida', 'NF-2026-202', '1',
    '35260322334455000166550010000002021000022021',
    '2026-03-24', null, null,
    'a4a4a4a4-0004-0004-0004-000000000003',
    6040.00, 'confirmada', true, true,
    'Faturamento parcial OV-2026-002 - 60 vacinas Newcastle + 30 Marek.', true,
    'pix', 'a_vista',
    'd1d1d1d1-d001-d001-d001-d00100000002', '11111111-1111-1111-1111-111111111005'
  ),
  (
    'e1e1e1e1-e001-e001-e001-e00100000003',
    'entrada', 'NF-2026-ENT-101', '1',
    '35260333445566000177550010000001011000011011',
    '2026-03-27', '2026-03-27',
    'a5a5a5a5-0005-0005-0005-000000000002', null,
    3830.00, 'confirmada', true, true,
    'Recebimento COMP-2026-001 - Agro Sul. Agulhas 10x10, 15x15 e 20x15.', true,
    'transferencia', 'a_prazo', null, '11111111-1111-1111-1111-111111111006'
  ),
  (
    'e1e1e1e1-e001-e001-e001-e00100000004',
    'entrada', 'NF-2026-ENT-102', '1',
    '35260344556677000188550010000001021000011021',
    '2026-04-01', '2026-04-01',
    'a5a5a5a5-0005-0005-0005-000000000001', null,
    7440.00, 'confirmada', true, true,
    'Recebimento COMP-2026-002 - BioVet. Seringas bouba e vacinas Newcastle.', true,
    'transferencia', 'a_prazo', null, '11111111-1111-1111-1111-111111111006'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.notas_fiscais_itens (
  id, nota_fiscal_id, produto_id, quantidade, valor_unitario, cfop, cst
)
VALUES
  -- NF-2026-201 (saída Santa Helena)
  ('e2e2e2e2-e002-e002-e002-e00200000001', 'e1e1e1e1-e001-e001-e001-e00100000001',
   'a6a6a6a6-0006-0006-0006-000000000001', 100, 4.20, '5102', '000'),
  ('e2e2e2e2-e002-e002-e002-e00200000002', 'e1e1e1e1-e001-e001-e001-e00100000001',
   'a6a6a6a6-0006-0006-0006-000000000004', 40, 49.90, '5102', '000'),
  ('e2e2e2e2-e002-e002-e002-e00200000003', 'e1e1e1e1-e001-e001-e001-e00100000001',
   'a6a6a6a6-0006-0006-0006-000000000006', 60, 30.00, '5102', '000'),
  -- NF-2026-202 (saída Vale Verde)
  ('e2e2e2e2-e002-e002-e002-e00200000004', 'e1e1e1e1-e001-e001-e001-e00100000002',
   'a6a6a6a6-0006-0006-0006-000000000006', 60, 34.90, '5102', '000'),
  ('e2e2e2e2-e002-e002-e002-e00200000005', 'e1e1e1e1-e001-e001-e001-e00100000002',
   'a6a6a6a6-0006-0006-0006-000000000007', 30, 42.50, '5102', '000'),
  -- NF-ENT-101 (entrada Agro Sul)
  ('e2e2e2e2-e002-e002-e002-e00200000006', 'e1e1e1e1-e001-e001-e001-e00100000003',
   'a6a6a6a6-0006-0006-0006-000000000001', 500, 2.10, '1102', '000'),
  ('e2e2e2e2-e002-e002-e002-e00200000007', 'e1e1e1e1-e001-e001-e001-e00100000003',
   'a6a6a6a6-0006-0006-0006-000000000002', 400, 2.45, '1102', '000'),
  ('e2e2e2e2-e002-e002-e002-e00200000008', 'e1e1e1e1-e001-e001-e001-e00100000003',
   'a6a6a6a6-0006-0006-0006-000000000003', 220, 2.80, '1102', '000'),
  -- NF-ENT-102 (entrada BioVet)
  ('e2e2e2e2-e002-e002-e002-e00200000009', 'e1e1e1e1-e001-e001-e001-e00100000004',
   'a6a6a6a6-0006-0006-0006-000000000004', 120, 28.00, '1102', '000'),
  ('e2e2e2e2-e002-e002-e002-e00200000010', 'e1e1e1e1-e001-e001-e001-e00100000004',
   'a6a6a6a6-0006-0006-0006-000000000006', 180, 18.50, '1102', '000')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 12: FINANCEIRO — LANÇAMENTOS, BAIXAS E CAIXA
-- ============================================================

INSERT INTO public.financeiro_lancamentos (
  id, tipo, descricao, valor, data_vencimento, data_pagamento,
  nota_fiscal_id, documento_fiscal_id,
  cliente_id, fornecedor_id, status, observacoes, ativo,
  banco, forma_pagamento, parcela_numero, parcela_total,
  conta_bancaria_id, conta_contabil_id
)
VALUES
  -- A RECEBER: NF-2026-201 Santa Helena — 2 parcelas abertas
  ('f1f1f1f1-f001-f001-f001-f00100000001',
   'receber', 'NF-2026-201 - Parcela 1/2 - Granja Santa Helena',
   4316.00, '2026-04-17', null,
   'e1e1e1e1-e001-e001-e001-e00100000001', 'e1e1e1e1-e001-e001-e001-e00100000001',
   'a4a4a4a4-0004-0004-0004-000000000001', null,
   'aberto', '1ª parcela da NF-2026-201.', true,
   'Inter', 'boleto', 1, 2,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  ('f1f1f1f1-f001-f001-f001-f00100000002',
   'receber', 'NF-2026-201 - Parcela 2/2 - Granja Santa Helena',
   4316.00, '2026-05-17', null,
   'e1e1e1e1-e001-e001-e001-e00100000001', 'e1e1e1e1-e001-e001-e001-e00100000001',
   'a4a4a4a4-0004-0004-0004-000000000001', null,
   'aberto', '2ª parcela da NF-2026-201.', true,
   'Inter', 'boleto', 2, 2,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  -- A RECEBER: NF-2026-202 Vale Verde — pago à vista via PIX
  ('f1f1f1f1-f001-f001-f001-f00100000003',
   'receber', 'NF-2026-202 - Vale Verde - PIX à vista',
   6040.00, '2026-03-24', '2026-03-24',
   'e1e1e1e1-e001-e001-e001-e00100000002', 'e1e1e1e1-e001-e001-e001-e00100000002',
   'a4a4a4a4-0004-0004-0004-000000000003', null,
   'pago', 'Recebido via PIX no ato do faturamento.', true,
   'Inter', 'pix', 1, 1,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  -- A RECEBER: título vencido Vale Verde (demonstração de alerta)
  ('f1f1f1f1-f001-f001-f001-f00100000004',
   'receber', 'CR-2026-082 - Agropecuária Vale Verde - VENCIDO',
   9880.00, '2026-03-01', null, null, null,
   'a4a4a4a4-0004-0004-0004-000000000003', null,
   'vencido', 'Título vencido - demonstração de alerta no dashboard. Cobrança em andamento.', true,
   'Inter', 'boleto', 1, 1,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  -- A RECEBER: Santa Helena histórico pago (para PMV)
  ('f1f1f1f1-f001-f001-f001-f00100000005',
   'receber', 'CR-2026-071 - Granja Santa Helena - PAGO',
   8850.00, '2026-03-05', '2026-03-08', null, null,
   'a4a4a4a4-0004-0004-0004-000000000001', null,
   'pago', 'Recebimento histórico para cálculo de PMV.', true,
   'Inter', 'pix', 1, 1,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  -- A RECEBER: Santa Helena histórico 2 (para PMV)
  ('f1f1f1f1-f001-f001-f001-f00100000006',
   'receber', 'CR-2026-058 - Granja Santa Helena - PAGO',
   6420.00, '2026-02-10', '2026-02-12', null, null,
   'a4a4a4a4-0004-0004-0004-000000000001', null,
   'pago', 'Recebimento histórico para cálculo de PMV.', true,
   'Inter', 'boleto', 1, 1,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  -- A RECEBER: Boa Postura pago antecipado com desconto
  ('f1f1f1f1-f001-f001-f001-f00100000007',
   'receber', 'CR-2026-090 - Cooperativa Boa Postura - pago c/ desconto',
   3200.00, '2026-03-28', '2026-03-25', null, null,
   'a4a4a4a4-0004-0004-0004-000000000004', null,
   'pago', 'Pago antecipado com 2% de desconto. PMV negativo típico desta cooperativa.', true,
   'Inter', 'pix', 1, 1,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111003'),
  -- A PAGAR: NF-ENT-101 Agro Sul — 2 parcelas abertas
  ('f1f1f1f1-f001-f001-f001-f00100000008',
   'pagar', 'NF-ENT-101 - Agro Sul - Parcela 1/2',
   1915.00, '2026-04-26', null,
   'e1e1e1e1-e001-e001-e001-e00100000003', 'e1e1e1e1-e001-e001-e001-e00100000003',
   null, 'a5a5a5a5-0005-0005-0005-000000000002',
   'aberto', '1ª parcela compra agulhas Agro Sul.', true,
   'C6', 'transferencia', 1, 2,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004'),
  ('f1f1f1f1-f001-f001-f001-f00100000009',
   'pagar', 'NF-ENT-101 - Agro Sul - Parcela 2/2',
   1915.00, '2026-05-26', null,
   'e1e1e1e1-e001-e001-e001-e00100000003', 'e1e1e1e1-e001-e001-e001-e00100000003',
   null, 'a5a5a5a5-0005-0005-0005-000000000002',
   'aberto', '2ª parcela compra agulhas Agro Sul.', true,
   'C6', 'transferencia', 2, 2,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004'),
  -- A PAGAR: NF-ENT-102 BioVet — 2 parcelas abertas
  ('f1f1f1f1-f001-f001-f001-f00100000010',
   'pagar', 'NF-ENT-102 - BioVet - Parcela 1/2',
   3720.00, '2026-05-01', null,
   'e1e1e1e1-e001-e001-e001-e00100000004', 'e1e1e1e1-e001-e001-e001-e00100000004',
   null, 'a5a5a5a5-0005-0005-0005-000000000001',
   'aberto', '1ª parcela compra seringas e vacinas BioVet.', true,
   'C6', 'transferencia', 1, 2,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004'),
  ('f1f1f1f1-f001-f001-f001-f00100000011',
   'pagar', 'NF-ENT-102 - BioVet - Parcela 2/2',
   3720.00, '2026-06-01', null,
   'e1e1e1e1-e001-e001-e001-e00100000004', 'e1e1e1e1-e001-e001-e001-e00100000004',
   null, 'a5a5a5a5-0005-0005-0005-000000000001',
   'aberto', '2ª parcela compra seringas e vacinas BioVet.', true,
   'C6', 'transferencia', 2, 2,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004'),
  -- A PAGAR: Pack Rural — pago no prazo (histórico)
  ('f1f1f1f1-f001-f001-f001-f00100000012',
   'pagar', 'CP-2026-040 - Pack Rural - pago no prazo',
   2880.00, '2026-03-25', '2026-03-25', null, null,
   null, 'a5a5a5a5-0005-0005-0005-000000000003',
   'pago', 'Compra de desinfetante Pack Rural - pago no vencimento.', true,
   'C6', 'transferencia', 1, 1,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111004')
ON CONFLICT (id) DO NOTHING;

-- Baixas financeiras (pagamentos e recebimentos efetuados)
INSERT INTO public.financeiro_baixas (
  id, lancamento_id, valor_pago, desconto, juros, multa, abatimento,
  data_baixa, forma_pagamento, conta_bancaria_id, observacoes
)
VALUES
  ('f2f2f2f2-f002-f002-f002-f00200000001',
   'f1f1f1f1-f001-f001-f001-f00100000003',
   6040.00, 0, 0, 0, 0, '2026-03-24', 'pix',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Recebimento integral via PIX.'),
  ('f2f2f2f2-f002-f002-f002-f00200000002',
   'f1f1f1f1-f001-f001-f001-f00100000005',
   8850.00, 0, 0, 0, 0, '2026-03-08', 'pix',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Recebimento via PIX - histórico PMV.'),
  ('f2f2f2f2-f002-f002-f002-f00200000003',
   'f1f1f1f1-f001-f001-f001-f00100000006',
   6420.00, 0, 0, 0, 0, '2026-02-12', 'boleto',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Recebimento via boleto - histórico PMV.'),
  ('f2f2f2f2-f002-f002-f002-f00200000004',
   'f1f1f1f1-f001-f001-f001-f00100000007',
   3136.00, 64.00, 0, 0, 0, '2026-03-25', 'pix',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Antecipado com desconto de 2% = R$ 64,00.'),
  ('f2f2f2f2-f002-f002-f002-f00200000005',
   'f1f1f1f1-f001-f001-f001-f00100000012',
   2880.00, 0, 0, 0, 0, '2026-03-25', 'transferencia',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'Transferência bancária no vencimento.')
ON CONFLICT (id) DO NOTHING;

-- Movimentos de caixa
-- Colunas disponíveis: id, tipo (enum tipo_caixa), descricao, valor, conta_bancaria_id
-- Enum tipo_caixa: abertura | suprimento | sangria | fechamento | venda | pagamento
-- Recebimentos de clientes → 'venda'  |  Pagamentos a fornecedores/despesas → 'pagamento'/'sangria'
INSERT INTO public.caixa_movimentos (
  id, tipo, descricao, valor, conta_bancaria_id
)
VALUES
  ('f3f3f3f3-f003-f003-f003-f00300000001',
   'venda', 'PIX recebido - Vale Verde NF-2026-202',
   6040.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001'),
  ('f3f3f3f3-f003-f003-f003-f00300000002',
   'venda', 'PIX recebido - Santa Helena CR-071',
   8850.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001'),
  ('f3f3f3f3-f003-f003-f003-f00300000003',
   'venda', 'Boleto recebido - Santa Helena CR-058',
   6420.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001'),
  ('f3f3f3f3-f003-f003-f003-f00300000004',
   'venda', 'PIX recebido - Boa Postura CR-090 (c/ desconto)',
   3136.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001'),
  ('f3f3f3f3-f003-f003-f003-f00300000005',
   'pagamento', 'TED paga - Pack Rural CP-040',
   2880.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002'),
  ('f3f3f3f3-f003-f003-f003-f00300000006',
   'sangria', 'Frete entrega própria - OV-2026-001',
   200.00, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 13: ESTOQUE — MOVIMENTAÇÕES
-- ============================================================

INSERT INTO public.estoque_movimentos (
  id, produto_id, tipo, quantidade,
  saldo_anterior, saldo_atual,
  motivo, documento_id, documento_tipo
)
VALUES
  -- Entradas por compras (NF-ENT-101 Agro Sul)
  ('g1g1g1g1-g001-g001-g001-g00100000001', 'a6a6a6a6-0006-0006-0006-000000000001',
   'entrada', 500, 0, 500,
   'Recebimento NF-ENT-101 - Agro Sul - Agulha 10x10',
   'e1e1e1e1-e001-e001-e001-e00100000003', 'fiscal'),
  ('g1g1g1g1-g001-g001-g001-g00100000002', 'a6a6a6a6-0006-0006-0006-000000000002',
   'entrada', 400, 0, 400,
   'Recebimento NF-ENT-101 - Agro Sul - Agulha 15x15',
   'e1e1e1e1-e001-e001-e001-e00100000003', 'fiscal'),
  ('g1g1g1g1-g001-g001-g001-g00100000003', 'a6a6a6a6-0006-0006-0006-000000000003',
   'entrada', 220, 0, 220,
   'Recebimento NF-ENT-101 - Agro Sul - Agulha 20x15',
   'e1e1e1e1-e001-e001-e001-e00100000003', 'fiscal'),
  -- Entradas por compras (NF-ENT-102 BioVet)
  ('g1g1g1g1-g001-g001-g001-g00100000004', 'a6a6a6a6-0006-0006-0006-000000000004',
   'entrada', 120, 0, 120,
   'Recebimento NF-ENT-102 - BioVet - Seringa Bouba',
   'e1e1e1e1-e001-e001-e001-e00100000004', 'fiscal'),
  ('g1g1g1g1-g001-g001-g001-g00100000005', 'a6a6a6a6-0006-0006-0006-000000000006',
   'entrada', 180, 20, 200,
   'Recebimento NF-ENT-102 - BioVet - Vacina Newcastle',
   'e1e1e1e1-e001-e001-e001-e00100000004', 'fiscal'),
  -- Saídas por vendas (NF-2026-201 Santa Helena)
  ('g1g1g1g1-g001-g001-g001-g00100000006', 'a6a6a6a6-0006-0006-0006-000000000001',
   'saida', 100, 500, 400,
   'Faturamento NF-2026-201 - Santa Helena - Agulha 10x10',
   'e1e1e1e1-e001-e001-e001-e00100000001', 'fiscal'),
  ('g1g1g1g1-g001-g001-g001-g00100000007', 'a6a6a6a6-0006-0006-0006-000000000004',
   'saida', 40, 120, 80,
   'Faturamento NF-2026-201 - Santa Helena - Seringa Bouba',
   'e1e1e1e1-e001-e001-e001-e00100000001', 'fiscal'),
  ('g1g1g1g1-g001-g001-g001-g00100000008', 'a6a6a6a6-0006-0006-0006-000000000006',
   'saida', 60, 200, 140,
   'Faturamento NF-2026-201 - Santa Helena - Vacina Newcastle',
   'e1e1e1e1-e001-e001-e001-e00100000001', 'fiscal'),
  -- Saídas por vendas (NF-2026-202 Vale Verde)
  ('g1g1g1g1-g001-g001-g001-g00100000009', 'a6a6a6a6-0006-0006-0006-000000000006',
   'saida', 60, 140, 80,
   'Faturamento NF-2026-202 - Vale Verde - Vacina Newcastle',
   'e1e1e1e1-e001-e001-e001-e00100000002', 'fiscal'),
  ('g1g1g1g1-g001-g001-g001-g00100000010', 'a6a6a6a6-0006-0006-0006-000000000007',
   'saida', 30, 180, 150,
   'Faturamento NF-2026-202 - Vale Verde - Vacina Marek',
   'e1e1e1e1-e001-e001-e001-e00100000002', 'fiscal'),
  -- Ajustes de inventário
  ('g1g1g1g1-g001-g001-g001-g00100000011', 'a6a6a6a6-0006-0006-0006-000000000010',
   'ajuste', 2, 27, 25,
   'Ajuste inventário físico - Mola Êmbolo 0,5 (perda)', null, 'ajuste'),
  ('g1g1g1g1-g001-g001-g001-g00100000012', 'a6a6a6a6-0006-0006-0006-000000000012',
   'entrada', 30, 0, 30,
   'Abertura de estoque inicial - Kit Calibração', null, 'ajuste')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 14: REMESSAS E RASTREIO
-- ============================================================

INSERT INTO public.remessas (
  id, ordem_venda_id, cliente_id, transportadora_id,
  servico, codigo_rastreio,
  data_postagem, previsao_entrega, status_transporte,
  peso, volumes, valor_frete,
  observacoes, ativo
)
VALUES
  (
    'h1h1h1h1-h001-h001-h001-h00100000001',
    'd1d1d1d1-d001-d001-d001-d00100000001',
    'a4a4a4a4-0004-0004-0004-000000000001',
    'a1a1a1a1-0001-0001-0001-000000000003',
    'Entrega Expressa', 'AZ2026032000001BR',
    '2026-03-20', '2026-03-22', 'entregue',
    11.60, 3, 200.00,
    'Remessa 1ª etapa OV-2026-001. 3 volumes entregues.', true
  ),
  (
    'h1h1h1h1-h001-h001-h001-h00100000002',
    'd1d1d1d1-d001-d001-d001-d00100000002',
    'a4a4a4a4-0004-0004-0004-000000000003',
    'a1a1a1a1-0001-0001-0001-000000000002',
    'Carga Fracionada', 'JD2026032400123',
    '2026-03-24', '2026-03-27', 'em_transito',
    8.60, 2, 150.00,
    'Remessa OV-2026-002 via Jadlog. Em rota para Ribeirão Preto.', true
  ),
  (
    'h1h1h1h1-h001-h001-h001-h00100000003',
    'd1d1d1d1-d001-d001-d001-d00100000003',
    'a4a4a4a4-0004-0004-0004-000000000006',
    'a1a1a1a1-0001-0001-0001-000000000002',
    'Carga Fracionada', 'JD2026032700456',
    '2026-03-27', '2026-04-02', 'postado',
    808.00, 18, 350.00,
    'Remessa OV-2026-003 - grande volume. 18 volumes postados para Curitiba.', true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.remessa_eventos (
  id, remessa_id, data_hora, descricao, local
)
VALUES
  -- Remessa 1 (entregue) — sequência completa de eventos
  ('h2h2h2h2-h002-h002-h002-h00200000001', 'h1h1h1h1-h001-h001-h001-h00100000001',
   '2026-03-20 14:00:00+00', 'Objeto postado.', 'Campinas/SP'),
  ('h2h2h2h2-h002-h002-h002-h00200000002', 'h1h1h1h1-h001-h001-h001-h00100000001',
   '2026-03-21 08:30:00+00', 'Objeto em trânsito para destino.', 'Limeira/SP'),
  ('h2h2h2h2-h002-h002-h002-h00200000003', 'h1h1h1h1-h001-h001-h001-h00100000001',
   '2026-03-22 10:15:00+00', 'Objeto saiu para entrega ao destinatário.', 'Leme/SP'),
  ('h2h2h2h2-h002-h002-h002-h00200000004', 'h1h1h1h1-h001-h001-h001-h00100000001',
   '2026-03-22 14:50:00+00', 'Objeto entregue ao destinatário.', 'Leme/SP'),
  -- Remessa 2 (em trânsito)
  ('h2h2h2h2-h002-h002-h002-h00200000005', 'h1h1h1h1-h001-h001-h001-h00100000002',
   '2026-03-24 16:00:00+00', 'Objeto postado na agência Jadlog.', 'Campinas/SP'),
  ('h2h2h2h2-h002-h002-h002-h00200000006', 'h1h1h1h1-h001-h001-h001-h00100000002',
   '2026-03-25 09:00:00+00', 'Objeto em rota para Ribeirão Preto.', 'São Paulo/SP'),
  -- Remessa 3 (postado)
  ('h2h2h2h2-h002-h002-h002-h00200000007', 'h1h1h1h1-h001-h001-h001-h00100000003',
   '2026-03-27 17:30:00+00', 'Objeto postado na agência Jadlog.', 'Campinas/SP')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FASE 15: COMUNICAÇÕES COM CLIENTES
-- ============================================================

INSERT INTO public.cliente_registros_comunicacao (
  id, cliente_id, data_hora, canal, assunto, descricao
)
VALUES
  ('i1i1i1i1-i001-i001-i001-i00100000001',
   'a4a4a4a4-0004-0004-0004-000000000001', '2026-03-19 09:20:00+00',
   'WhatsApp', 'Confirmação de proposta',
   'Cliente aprovou ORC-2026-001. Solicitou entrega em duas etapas conforme negociado.'),
  ('i1i1i1i1-i001-i001-i001-i00100000002',
   'a4a4a4a4-0004-0004-0004-000000000001', '2026-03-20 14:10:00+00',
   'Ligação', 'Confirmação de nota fiscal',
   'NF-2026-201 confirmada. Cliente aguarda 2ª remessa com o restante da OV.'),
  ('i1i1i1i1-i001-i001-i001-i00100000003',
   'a4a4a4a4-0004-0004-0004-000000000003', '2026-03-22 11:00:00+00',
   'E-mail', 'Aprovação de orçamento',
   'Cliente aprovou ORC-2026-002 via e-mail. Aguardando liberação de estoque de vacinas.'),
  ('i1i1i1i1-i001-i001-i001-i00100000004',
   'a4a4a4a4-0004-0004-0004-000000000003', '2026-03-01 16:00:00+00',
   'Ligação', 'Cobrança título vencido',
   'Cobrança de CR-2026-082 (R$ 9.880). Cliente reconhece débito e prometeu pagamento em 15 dias.'),
  ('i1i1i1i1-i001-i001-i001-i00100000005',
   'a4a4a4a4-0004-0004-0004-000000000006', '2026-03-27 15:30:00+00',
   'E-mail', 'Aprovação gerencial OV-2026-003',
   'Gerência aprovou OV-2026-003 após análise de risco crédito. Continental notificado sobre prazo de despacho.'),
  ('i1i1i1i1-i001-i001-i001-i00100000006',
   'a4a4a4a4-0004-0004-0004-000000000005', '2026-04-01 10:00:00+00',
   'WhatsApp', 'Proposta comercial - novo cliente',
   'Enviado ORC-2026-004 para Avícola Nordeste. Aguardando confirmação de pagamento antecipado por PIX.')
ON CONFLICT (id) DO NOTHING;
