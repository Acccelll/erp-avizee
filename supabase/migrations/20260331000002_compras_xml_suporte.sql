-- Migration: Suporte a Importação de Compras por XML e Aliases de Produto
-- Descrição: Cria tabela de aliases e ajusta staging de XML.

-- 1. Tabela de Aliases de Produtos (De-Para de códigos de fornecedores)
CREATE TABLE IF NOT EXISTS public.produto_alias_importacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origem_tipo TEXT NOT NULL, -- 'xml', 'planilha'
    valor_origem TEXT NOT NULL, -- código do produto no XML/Planilha
    fornecedor_id UUID REFERENCES public.fornecedores(id), -- Alias pode ser específico por fornecedor
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id),
    UNIQUE(origem_tipo, valor_origem, fornecedor_id)
);

-- Comentário
COMMENT ON TABLE public.produto_alias_importacao IS 'Mapeamento de códigos externos de produtos para IDs internos do ERP.';

-- 2. Políticas RLS para Aliases
ALTER TABLE public.produto_alias_importacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read aliases" ON public.produto_alias_importacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage aliases" ON public.produto_alias_importacao FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Índices úteis
CREATE INDEX idx_alias_valor_origem ON public.produto_alias_importacao(valor_origem);
CREATE INDEX idx_alias_produto_id ON public.produto_alias_importacao(produto_id);

-- 4. Garantir que a tabela final de compras tenha campo para chave de acesso se não existir
-- Dependendo do esquema atual do ERP AviZee
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='chave_acesso') THEN
        ALTER TABLE public.compras ADD COLUMN chave_acesso TEXT UNIQUE;
    END IF;
END $$;
