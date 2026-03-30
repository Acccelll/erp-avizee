-- Migration: Infraestrutura de Migração de Dados
-- Descrição: Criação das tabelas de staging e controle para importação de dados legados.

-- 1. Tabela Principal de Controle: importacao_lotes
CREATE TABLE IF NOT EXISTS public.importacao_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_importacao TEXT NOT NULL, -- produtos, clientes, fornecedores, etc.
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'processando', 'validado', 'parcial', 'concluido', 'cancelado')),
    arquivo_nome TEXT,
    total_lidos INTEGER DEFAULT 0,
    total_validos INTEGER DEFAULT 0,
    total_erros INTEGER DEFAULT 0,
    total_importados INTEGER DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);

-- Comentários na tabela importacao_lotes
COMMENT ON TABLE public.importacao_lotes IS 'Controle de lotes de importação de dados legados.';

-- 2. Tabela de Logs: importacao_logs
CREATE TABLE IF NOT EXISTS public.importacao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL CHECK (nivel IN ('info', 'warning', 'error')),
    etapa TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    payload JSONB,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Comentários na tabela importacao_logs
COMMENT ON TABLE public.importacao_logs IS 'Logs detalhados do processamento de cada lote de importação.';

-- 3. Tabelas de Staging
-- Função auxiliar para criar tabelas de staging com a mesma estrutura base
-- Como não podemos usar PL/pgSQL dinâmico facilmente em migrations simples sem complicações de permissão,
-- vamos declarar uma a uma para garantir compatibilidade e clareza.

-- stg_produtos
CREATE TABLE IF NOT EXISTS public.stg_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_produtos IS 'Staging para importação de produtos.';

-- stg_clientes
CREATE TABLE IF NOT EXISTS public.stg_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_clientes IS 'Staging para importação de clientes.';

-- stg_fornecedores
CREATE TABLE IF NOT EXISTS public.stg_fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_fornecedores IS 'Staging para importação de fornecedores.';

-- stg_estoque_inicial
CREATE TABLE IF NOT EXISTS public.stg_estoque_inicial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_estoque_inicial IS 'Staging para importação de saldos iniciais de estoque.';

-- stg_faturamento
CREATE TABLE IF NOT EXISTS public.stg_faturamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_faturamento IS 'Staging para importação de histórico de faturamento.';

-- stg_financeiro_aberto
CREATE TABLE IF NOT EXISTS public.stg_financeiro_aberto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_financeiro_aberto IS 'Staging para importação de contas a pagar e receber em aberto.';

-- stg_compras_xml
CREATE TABLE IF NOT EXISTS public.stg_compras_xml (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_importacao_id UUID REFERENCES public.importacao_lotes(id) ON DELETE CASCADE,
    arquivo_origem TEXT,
    aba_origem TEXT,
    linha_origem INTEGER,
    hash_registro TEXT,
    payload JSONB NOT NULL,
    status_validacao TEXT DEFAULT 'pendente' CHECK (status_validacao IN ('pendente', 'valido', 'erro', 'importado')),
    motivo_erro TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id)
);
COMMENT ON TABLE public.stg_compras_xml IS 'Staging para processamento de XMLs de compra.';

-- 4. Habilitar RLS e Criar Políticas

-- Função para aplicar políticas padrão em tabelas de importação
-- Aplicaremos manualmente em cada uma seguindo o padrão do projeto.

-- importacao_lotes
ALTER TABLE public.importacao_lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read importacao_lotes" ON public.importacao_lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage importacao_lotes" ON public.importacao_lotes FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- importacao_logs
ALTER TABLE public.importacao_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read importacao_logs" ON public.importacao_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage importacao_logs" ON public.importacao_logs FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_produtos
ALTER TABLE public.stg_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_produtos" ON public.stg_produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_produtos" ON public.stg_produtos FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_clientes
ALTER TABLE public.stg_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_clientes" ON public.stg_clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_clientes" ON public.stg_clientes FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_fornecedores
ALTER TABLE public.stg_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_fornecedores" ON public.stg_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_fornecedores" ON public.stg_fornecedores FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_estoque_inicial
ALTER TABLE public.stg_estoque_inicial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_estoque_inicial" ON public.stg_estoque_inicial FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_estoque_inicial" ON public.stg_estoque_inicial FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_faturamento
ALTER TABLE public.stg_faturamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_faturamento" ON public.stg_faturamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_faturamento" ON public.stg_faturamento FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_financeiro_aberto
ALTER TABLE public.stg_financeiro_aberto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_financeiro_aberto" ON public.stg_financeiro_aberto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_financeiro_aberto" ON public.stg_financeiro_aberto FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- stg_compras_xml
ALTER TABLE public.stg_compras_xml ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read stg_compras_xml" ON public.stg_compras_xml FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stg_compras_xml" ON public.stg_compras_xml FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Criação de Índices

CREATE INDEX idx_importacao_lotes_status ON public.importacao_lotes(status);
CREATE INDEX idx_importacao_lotes_criado_em ON public.importacao_lotes(criado_em);

CREATE INDEX idx_importacao_logs_lote_id ON public.importacao_logs(lote_importacao_id);
CREATE INDEX idx_importacao_logs_nivel ON public.importacao_logs(nivel);

CREATE INDEX idx_stg_produtos_lote_id ON public.stg_produtos(lote_importacao_id);
CREATE INDEX idx_stg_produtos_status ON public.stg_produtos(status_validacao);
CREATE INDEX idx_stg_produtos_hash ON public.stg_produtos(hash_registro);
CREATE INDEX idx_stg_produtos_criado_em ON public.stg_produtos(criado_em);

CREATE INDEX idx_stg_clientes_lote_id ON public.stg_clientes(lote_importacao_id);
CREATE INDEX idx_stg_clientes_status ON public.stg_clientes(status_validacao);
CREATE INDEX idx_stg_clientes_hash ON public.stg_clientes(hash_registro);
CREATE INDEX idx_stg_clientes_criado_em ON public.stg_clientes(criado_em);

CREATE INDEX idx_stg_fornecedores_lote_id ON public.stg_fornecedores(lote_importacao_id);
CREATE INDEX idx_stg_fornecedores_status ON public.stg_fornecedores(status_validacao);
CREATE INDEX idx_stg_fornecedores_hash ON public.stg_fornecedores(hash_registro);
CREATE INDEX idx_stg_fornecedores_criado_em ON public.stg_fornecedores(criado_em);

CREATE INDEX idx_stg_estoque_inicial_lote_id ON public.stg_estoque_inicial(lote_importacao_id);
CREATE INDEX idx_stg_estoque_inicial_status ON public.stg_estoque_inicial(status_validacao);
CREATE INDEX idx_stg_estoque_inicial_hash ON public.stg_estoque_inicial(hash_registro);
CREATE INDEX idx_stg_estoque_inicial_criado_em ON public.stg_estoque_inicial(criado_em);

CREATE INDEX idx_stg_faturamento_lote_id ON public.stg_faturamento(lote_importacao_id);
CREATE INDEX idx_stg_faturamento_status ON public.stg_faturamento(status_validacao);
CREATE INDEX idx_stg_faturamento_hash ON public.stg_faturamento(hash_registro);
CREATE INDEX idx_stg_faturamento_criado_em ON public.stg_faturamento(criado_em);

CREATE INDEX idx_stg_financeiro_aberto_lote_id ON public.stg_financeiro_aberto(lote_importacao_id);
CREATE INDEX idx_stg_financeiro_aberto_status ON public.stg_financeiro_aberto(status_validacao);
CREATE INDEX idx_stg_financeiro_aberto_hash ON public.stg_financeiro_aberto(hash_registro);
CREATE INDEX idx_stg_financeiro_aberto_criado_em ON public.stg_financeiro_aberto(criado_em);

CREATE INDEX idx_stg_compras_xml_lote_id ON public.stg_compras_xml(lote_importacao_id);
CREATE INDEX idx_stg_compras_xml_status ON public.stg_compras_xml(status_validacao);
CREATE INDEX idx_stg_compras_xml_hash ON public.stg_compras_xml(hash_registro);
CREATE INDEX idx_stg_compras_xml_criado_em ON public.stg_compras_xml(criado_em);
