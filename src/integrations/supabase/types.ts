export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      auditoria_logs: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      caixa_movimentos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          saldo_anterior: number
          saldo_atual: number
          tipo: Database["public"]["Enums"]["tipo_caixa"]
          usuario_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          saldo_anterior?: number
          saldo_atual?: number
          tipo: Database["public"]["Enums"]["tipo_caixa"]
          usuario_id?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          saldo_anterior?: number
          saldo_atual?: number
          tipo?: Database["public"]["Enums"]["tipo_caixa"]
          usuario_id?: string | null
          valor?: number
        }
        Relationships: []
      }
      cliente_registros_comunicacao: {
        Row: {
          assunto: string | null
          canal: string | null
          cliente_id: string
          created_at: string
          data_hora: string
          descricao: string | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          assunto?: string | null
          canal?: string | null
          cliente_id: string
          created_at?: string
          data_hora?: string
          descricao?: string | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          assunto?: string | null
          canal?: string | null
          cliente_id?: string
          created_at?: string
          data_hora?: string
          descricao?: string | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_registros_comunicacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          limite_credito: number | null
          logradouro: string | null
          nome_fantasia: string | null
          nome_razao_social: string
          numero: string | null
          observacoes: string | null
          pais: string | null
          prazo_padrao: number | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome_fantasia?: string | null
          nome_razao_social: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          prazo_padrao?: number | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome_fantasia?: string | null
          nome_razao_social?: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          prazo_padrao?: number | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          ativo: boolean
          created_at: string
          data_compra: string
          data_entrega: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          fornecedor_id: string | null
          frete_valor: number | null
          id: string
          impostos_valor: number | null
          numero: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          updated_at: string
          usuario_id: string | null
          valor_produtos: number | null
          valor_total: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_compra?: string
          data_entrega?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          fornecedor_id?: string | null
          frete_valor?: number | null
          id?: string
          impostos_valor?: number | null
          numero: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          usuario_id?: string | null
          valor_produtos?: number | null
          valor_total?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_compra?: string
          data_entrega?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          fornecedor_id?: string | null
          frete_valor?: number | null
          id?: string
          impostos_valor?: number | null
          numero?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          usuario_id?: string | null
          valor_produtos?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_itens: {
        Row: {
          compra_id: string
          created_at: string
          id: string
          produto_id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          compra_id: string
          created_at?: string
          id?: string
          produto_id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          compra_id?: string
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_itens_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          logradouro: string | null
          nome_fantasia: string
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          logradouro?: string | null
          nome_fantasia?: string
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          logradouro?: string | null
          nome_fantasia?: string
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      estoque_movimentos: {
        Row: {
          created_at: string
          documento_id: string | null
          documento_tipo: string | null
          id: string
          motivo: string | null
          produto_id: string
          quantidade: number
          saldo_anterior: number
          saldo_atual: number
          tipo: Database["public"]["Enums"]["tipo_movimento_estoque"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          documento_id?: string | null
          documento_tipo?: string | null
          id?: string
          motivo?: string | null
          produto_id: string
          quantidade: number
          saldo_anterior?: number
          saldo_atual?: number
          tipo: Database["public"]["Enums"]["tipo_movimento_estoque"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          documento_id?: string | null
          documento_tipo?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string
          quantidade?: number
          saldo_anterior?: number
          saldo_atual?: number
          tipo?: Database["public"]["Enums"]["tipo_movimento_estoque"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_lancamentos: {
        Row: {
          ativo: boolean
          banco: string | null
          cartao: string | null
          cliente_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          documento_fiscal_id: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          nota_fiscal_id: string | null
          observacoes: string | null
          parcela_numero: number | null
          parcela_total: number | null
          status: Database["public"]["Enums"]["status_financeiro"]
          tipo: Database["public"]["Enums"]["tipo_financeiro"]
          updated_at: string
          usuario_id: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          cartao?: string | null
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          documento_fiscal_id?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          tipo: Database["public"]["Enums"]["tipo_financeiro"]
          updated_at?: string
          usuario_id?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          cartao?: string | null
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          documento_fiscal_id?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          tipo?: Database["public"]["Enums"]["tipo_financeiro"]
          updated_at?: string
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_documento_fiscal_id_fkey"
            columns: ["documento_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string | null
          nome_razao_social: string
          numero: string | null
          observacoes: string | null
          pais: string | null
          prazo_padrao: number | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          nome_razao_social: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          prazo_padrao?: number | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          nome_razao_social?: string
          numero?: string | null
          observacoes?: string | null
          pais?: string | null
          prazo_padrao?: number | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      grupos_produto: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      notas_fiscais: {
        Row: {
          ativo: boolean
          chave_acesso: string | null
          cliente_id: string | null
          condicao_pagamento: string | null
          created_at: string
          data_emissao: string
          data_recebimento: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          gera_financeiro: boolean | null
          id: string
          movimenta_estoque: boolean | null
          numero: string
          observacoes: string | null
          serie: string | null
          status: Database["public"]["Enums"]["status_nota_fiscal"]
          tipo: Database["public"]["Enums"]["tipo_nota_fiscal"]
          updated_at: string
          usuario_id: string | null
          valor_total: number
        }
        Insert: {
          ativo?: boolean
          chave_acesso?: string | null
          cliente_id?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          gera_financeiro?: boolean | null
          id?: string
          movimenta_estoque?: boolean | null
          numero: string
          observacoes?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_nota_fiscal"]
          tipo: Database["public"]["Enums"]["tipo_nota_fiscal"]
          updated_at?: string
          usuario_id?: string | null
          valor_total?: number
        }
        Update: {
          ativo?: boolean
          chave_acesso?: string | null
          cliente_id?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          gera_financeiro?: boolean | null
          id?: string
          movimenta_estoque?: boolean | null
          numero?: string
          observacoes?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["status_nota_fiscal"]
          tipo?: Database["public"]["Enums"]["tipo_nota_fiscal"]
          updated_at?: string
          usuario_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais_itens: {
        Row: {
          cfop: string | null
          created_at: string
          cst: string | null
          id: string
          nota_fiscal_id: string
          produto_id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          cfop?: string | null
          created_at?: string
          cst?: string | null
          id?: string
          nota_fiscal_id: string
          produto_id: string
          quantidade: number
          valor_unitario: number
        }
        Update: {
          cfop?: string | null
          created_at?: string
          cst?: string | null
          id?: string
          nota_fiscal_id?: string
          produto_id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_itens_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          cliente_snapshot: Json | null
          created_at: string
          data_orcamento: string
          desconto: number | null
          frete_tipo: string | null
          frete_valor: number | null
          id: string
          imposto_ipi: number | null
          imposto_st: number | null
          modalidade: string | null
          numero: string
          observacoes: string | null
          outras_despesas: number | null
          pagamento: string | null
          peso_total: number | null
          prazo_entrega: string | null
          prazo_pagamento: string | null
          quantidade_total: number | null
          status: Database["public"]["Enums"]["status_pedido"]
          updated_at: string
          usuario_id: string | null
          validade: string | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          cliente_snapshot?: Json | null
          created_at?: string
          data_orcamento?: string
          desconto?: number | null
          frete_tipo?: string | null
          frete_valor?: number | null
          id?: string
          imposto_ipi?: number | null
          imposto_st?: number | null
          modalidade?: string | null
          numero: string
          observacoes?: string | null
          outras_despesas?: number | null
          pagamento?: string | null
          peso_total?: number | null
          prazo_entrega?: string | null
          prazo_pagamento?: string | null
          quantidade_total?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          usuario_id?: string | null
          validade?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          cliente_snapshot?: Json | null
          created_at?: string
          data_orcamento?: string
          desconto?: number | null
          frete_tipo?: string | null
          frete_valor?: number | null
          id?: string
          imposto_ipi?: number | null
          imposto_st?: number | null
          modalidade?: string | null
          numero?: string
          observacoes?: string | null
          outras_despesas?: number | null
          pagamento?: string | null
          peso_total?: number | null
          prazo_entrega?: string | null
          prazo_pagamento?: string | null
          quantidade_total?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          usuario_id?: string | null
          validade?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_itens: {
        Row: {
          codigo_snapshot: string | null
          created_at: string
          descricao_snapshot: string | null
          id: string
          orcamento_id: string
          peso_total: number | null
          peso_unitario: number | null
          produto_id: string
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
          variacao: string | null
        }
        Insert: {
          codigo_snapshot?: string | null
          created_at?: string
          descricao_snapshot?: string | null
          id?: string
          orcamento_id: string
          peso_total?: number | null
          peso_unitario?: number | null
          produto_id: string
          quantidade: number
          unidade?: string | null
          valor_total: number
          valor_unitario: number
          variacao?: string | null
        }
        Update: {
          codigo_snapshot?: string | null
          created_at?: string
          descricao_snapshot?: string | null
          id?: string
          orcamento_id?: string
          peso_total?: number | null
          peso_unitario?: number | null
          produto_id?: string
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
          variacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_composicoes: {
        Row: {
          created_at: string
          id: string
          ordem: number | null
          produto_filho_id: string
          produto_pai_id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number | null
          produto_filho_id: string
          produto_pai_id: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number | null
          produto_filho_id?: string
          produto_pai_id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_composicoes_produto_filho_id_fkey"
            columns: ["produto_filho_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_composicoes_produto_pai_id_fkey"
            columns: ["produto_pai_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          cfop_padrao: string | null
          codigo_interno: string | null
          created_at: string
          cst: string | null
          descricao: string | null
          eh_composto: boolean | null
          estoque_atual: number | null
          estoque_minimo: number | null
          grupo_id: string | null
          id: string
          ncm: string | null
          nome: string
          peso: number | null
          preco_custo: number | null
          preco_venda: number
          sku: string | null
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cfop_padrao?: string | null
          codigo_interno?: string | null
          created_at?: string
          cst?: string | null
          descricao?: string | null
          eh_composto?: boolean | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          grupo_id?: string | null
          id?: string
          ncm?: string | null
          nome: string
          peso?: number | null
          preco_custo?: number | null
          preco_venda?: number
          sku?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cfop_padrao?: string | null
          codigo_interno?: string | null
          created_at?: string
          cst?: string | null
          descricao?: string | null
          eh_composto?: boolean | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          grupo_id?: string | null
          id?: string
          ncm?: string | null
          nome?: string
          peso?: number | null
          preco_custo?: number | null
          preco_venda?: number
          sku?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_fornecedores: {
        Row: {
          created_at: string
          fornecedor_id: string
          id: string
          lead_time_dias: number | null
          preco_compra: number | null
          produto_id: string
          referencia_fornecedor: string | null
        }
        Insert: {
          created_at?: string
          fornecedor_id: string
          id?: string
          lead_time_dias?: number | null
          preco_compra?: number | null
          produto_id: string
          referencia_fornecedor?: string | null
        }
        Update: {
          created_at?: string
          fornecedor_id?: string
          id?: string
          lead_time_dias?: number | null
          preco_compra?: number | null
          produto_id?: string
          referencia_fornecedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_sequence: {
        Args: { prefix: string; table_name: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "financeiro" | "estoquista"
      status_financeiro: "aberto" | "pago" | "vencido" | "cancelado"
      status_nota_fiscal: "pendente" | "confirmada" | "cancelada"
      status_pedido: "rascunho" | "confirmado" | "cancelado" | "faturado"
      tipo_caixa:
        | "abertura"
        | "suprimento"
        | "sangria"
        | "fechamento"
        | "venda"
        | "pagamento"
      tipo_endereco: "comercial" | "entrega" | "cobranca"
      tipo_financeiro: "pagar" | "receber"
      tipo_movimento_estoque: "entrada" | "saida" | "ajuste"
      tipo_nota_fiscal: "entrada" | "saida"
      tipo_pessoa: "F" | "J"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendedor", "financeiro", "estoquista"],
      status_financeiro: ["aberto", "pago", "vencido", "cancelado"],
      status_nota_fiscal: ["pendente", "confirmada", "cancelada"],
      status_pedido: ["rascunho", "confirmado", "cancelado", "faturado"],
      tipo_caixa: [
        "abertura",
        "suprimento",
        "sangria",
        "fechamento",
        "venda",
        "pagamento",
      ],
      tipo_endereco: ["comercial", "entrega", "cobranca"],
      tipo_financeiro: ["pagar", "receber"],
      tipo_movimento_estoque: ["entrada", "saida", "ajuste"],
      tipo_nota_fiscal: ["entrada", "saida"],
      tipo_pessoa: ["F", "J"],
    },
  },
} as const
