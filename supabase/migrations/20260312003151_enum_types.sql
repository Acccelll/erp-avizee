
-- Enum types
CREATE TYPE public.tipo_pessoa AS ENUM ('F', 'J');
CREATE TYPE public.tipo_endereco AS ENUM ('comercial', 'entrega', 'cobranca');
CREATE TYPE public.tipo_movimento_estoque AS ENUM ('entrada', 'saida', 'ajuste');
CREATE TYPE public.tipo_nota_fiscal AS ENUM ('entrada', 'saida');
CREATE TYPE public.status_nota_fiscal AS ENUM ('pendente', 'confirmada', 'cancelada');
CREATE TYPE public.tipo_financeiro AS ENUM ('pagar', 'receber');
CREATE TYPE public.status_financeiro AS ENUM ('aberto', 'pago', 'vencido', 'cancelado');
CREATE TYPE public.tipo_caixa AS ENUM ('abertura', 'suprimento', 'sangria', 'fechamento', 'venda', 'pagamento');
CREATE TYPE public.status_pedido AS ENUM ('rascunho', 'confirmado', 'cancelado', 'faturado');
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor', 'financeiro', 'estoquista');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  cargo TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grupos de Produto
CREATE TABLE public.grupos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grupos_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read grupos" ON public.grupos_produto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grupos" ON public.grupos_produto FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grupos" ON public.grupos_produto FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete grupos" ON public.grupos_produto FOR DELETE TO authenticated USING (true);

-- Produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  codigo_interno TEXT UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  grupo_id UUID REFERENCES public.grupos_produto(id),
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  preco_custo NUMERIC(10,2) DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_atual NUMERIC(10,2) DEFAULT 0,
  estoque_minimo NUMERIC(10,2) DEFAULT 0,
  peso NUMERIC(10,3),
  ncm TEXT,
  cst TEXT,
  cfop_padrao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD produtos" ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa tipo_pessoa NOT NULL DEFAULT 'F',
  nome_razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT UNIQUE,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  prazo_padrao INTEGER DEFAULT 30,
  limite_credito NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  -- Endereço principal inline
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa tipo_pessoa NOT NULL DEFAULT 'J',
  nome_razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT UNIQUE,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  prazo_padrao INTEGER DEFAULT 30,
  observacoes TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Produtos-Fornecedores (link table)
CREATE TABLE public.produtos_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE NOT NULL,
  referencia_fornecedor TEXT,
  preco_compra NUMERIC(10,2),
  lead_time_dias INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(produto_id, fornecedor_id)
);
ALTER TABLE public.produtos_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD produtos_fornecedores" ON public.produtos_fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Compras (pedidos de compra)
CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE,
  valor_total NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  status status_pedido NOT NULL DEFAULT 'rascunho',
  usuario_id UUID REFERENCES auth.users(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD compras" ON public.compras FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.compras_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID REFERENCES public.compras(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD compras_itens" ON public.compras_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orçamentos / Pedidos de Venda
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  data_orcamento DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE,
  valor_total NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  status status_pedido NOT NULL DEFAULT 'rascunho',
  usuario_id UUID REFERENCES auth.users(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD orcamentos" ON public.orcamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.orcamentos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD orcamentos_itens" ON public.orcamentos_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Estoque Movimentos
CREATE TABLE public.estoque_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) NOT NULL,
  tipo tipo_movimento_estoque NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL,
  saldo_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_atual NUMERIC(10,2) NOT NULL DEFAULT 0,
  motivo TEXT,
  documento_id UUID,
  documento_tipo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD estoque_movimentos" ON public.estoque_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notas Fiscais
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_nota_fiscal NOT NULL,
  numero TEXT NOT NULL,
  serie TEXT,
  chave_acesso TEXT UNIQUE,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_recebimento DATE,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  cliente_id UUID REFERENCES public.clientes(id),
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status status_nota_fiscal NOT NULL DEFAULT 'pendente',
  movimenta_estoque BOOLEAN DEFAULT true,
  gera_financeiro BOOLEAN DEFAULT true,
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.notas_fiscais_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  cfop TEXT,
  cst TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_fiscais_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD notas_fiscais_itens" ON public.notas_fiscais_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Financeiro (Contas a Pagar / Receber)
CREATE TABLE public.financeiro_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_financeiro NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id),
  cliente_id UUID REFERENCES public.clientes(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  status status_financeiro NOT NULL DEFAULT 'aberto',
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD financeiro_lancamentos" ON public.financeiro_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Caixa
CREATE TABLE public.caixa_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_caixa NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  saldo_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_atual NUMERIC(10,2) NOT NULL DEFAULT 0,
  referencia_id UUID,
  referencia_tipo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can CRUD caixa_movimentos" ON public.caixa_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auditoria
CREATE TABLE public.auditoria_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can insert audit logs" ON public.auditoria_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view audit logs" ON public.auditoria_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-generate sequential numbers
CREATE OR REPLACE FUNCTION public.generate_sequence(prefix TEXT, table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  result TEXT;
BEGIN
  EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM ''[0-9]+$'') AS INTEGER)), 0) + 1 FROM public.%I WHERE numero LIKE $1', table_name)
  INTO next_num
  USING prefix || '-%';
  
  result := prefix || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN result;
END;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_grupos_produto_updated_at BEFORE UPDATE ON public.grupos_produto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_notas_fiscais_updated_at BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_financeiro_updated_at BEFORE UPDATE ON public.financeiro_lancamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
