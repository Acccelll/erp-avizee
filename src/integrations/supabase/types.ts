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
      app_configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: Json | null
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: Json | null
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: Json | null
        }
        Relationships: []
      }
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
      bancos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
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
          caixa_postal: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          grupo_economico_id: string | null
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
          tipo_relacao_grupo: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          caixa_postal?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          grupo_economico_id?: string | null
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
          tipo_relacao_grupo?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          caixa_postal?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          grupo_economico_id?: string | null
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
          tipo_relacao_grupo?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_grupo_economico_id_fkey"
            columns: ["grupo_economico_id"]
            isOneToOne: false
            referencedRelation: "grupos_economicos"
            referencedColumns: ["id"]
          },
        ]
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
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco_id: string
          conta: string | null
          created_at: string
          descricao: string
          id: string
          saldo_atual: number | null
          titular: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco_id: string
          conta?: string | null
          created_at?: string
          descricao: string
          id?: string
          saldo_atual?: number | null
          titular?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco_id?: string
          conta?: string | null
          created_at?: string
          descricao?: string
          id?: string
          saldo_atual?: number | null
          titular?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_contabeis: {
        Row: {
          aceita_lancamento: boolean
          ativo: boolean
          codigo: string
          conta_pai_id: string | null
          created_at: string
          descricao: string
          id: string
          natureza: string
          updated_at: string
        }
        Insert: {
          aceita_lancamento?: boolean
          ativo?: boolean
          codigo: string
          conta_pai_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          natureza?: string
          updated_at?: string
        }
        Update: {
          aceita_lancamento?: boolean
          ativo?: boolean
          codigo?: string
          conta_pai_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          natureza?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_contabeis_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes_compra: {
        Row: {
          ativo: boolean
          created_at: string
          data_cotacao: string
          data_validade: string | null
          id: string
          numero: string
          observacoes: string | null
          status: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_cotacao?: string
          data_validade?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_cotacao?: string
          data_validade?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      cotacoes_compra_itens: {
        Row: {
          cotacao_compra_id: string
          created_at: string
          id: string
          produto_id: string
          quantidade: number
          unidade: string | null
        }
        Insert: {
          cotacao_compra_id: string
          created_at?: string
          id?: string
          produto_id: string
          quantidade?: number
          unidade?: string | null
        }
        Update: {
          cotacao_compra_id?: string
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_compra_itens_cotacao_compra_id_fkey"
            columns: ["cotacao_compra_id"]
            isOneToOne: false
            referencedRelation: "cotacoes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes_compra_propostas: {
        Row: {
          cotacao_compra_id: string
          created_at: string
          fornecedor_id: string
          id: string
          item_id: string
          observacoes: string | null
          prazo_entrega_dias: number | null
          preco_unitario: number
          selecionado: boolean
        }
        Insert: {
          cotacao_compra_id: string
          created_at?: string
          fornecedor_id: string
          id?: string
          item_id: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_unitario?: number
          selecionado?: boolean
        }
        Update: {
          cotacao_compra_id?: string
          created_at?: string
          fornecedor_id?: string
          id?: string
          item_id?: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_unitario?: number
          selecionado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_compra_propostas_cotacao_compra_id_fkey"
            columns: ["cotacao_compra_id"]
            isOneToOne: false
            referencedRelation: "cotacoes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_compra_propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_compra_propostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cotacoes_compra_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
          conta_bancaria_id: string | null
          conta_contabil_id: string | null
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
          conta_bancaria_id?: string | null
          conta_contabil_id?: string | null
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
          conta_bancaria_id?: string | null
          conta_contabil_id?: string | null
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
            foreignKeyName: "financeiro_lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
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
      grupos_economicos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_matriz_id: string | null
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_matriz_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_matriz_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_economicos_empresa_matriz_id_fkey"
            columns: ["empresa_matriz_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_produto: {
        Row: {
          ativo: boolean
          conta_contabil_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conta_contabil_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conta_contabil_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_produto_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          ativo: boolean
          chave_acesso: string | null
          cliente_id: string | null
          cofins_valor: number | null
          condicao_pagamento: string | null
          conta_contabil_id: string | null
          created_at: string
          data_emissao: string
          data_recebimento: string | null
          desconto_valor: number | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          frete_valor: number | null
          gera_financeiro: boolean | null
          icms_st_valor: number | null
          icms_valor: number | null
          id: string
          ipi_valor: number | null
          movimenta_estoque: boolean | null
          numero: string
          observacoes: string | null
          ordem_venda_id: string | null
          outras_despesas: number | null
          pis_valor: number | null
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
          cofins_valor?: number | null
          condicao_pagamento?: string | null
          conta_contabil_id?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          desconto_valor?: number | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          frete_valor?: number | null
          gera_financeiro?: boolean | null
          icms_st_valor?: number | null
          icms_valor?: number | null
          id?: string
          ipi_valor?: number | null
          movimenta_estoque?: boolean | null
          numero: string
          observacoes?: string | null
          ordem_venda_id?: string | null
          outras_despesas?: number | null
          pis_valor?: number | null
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
          cofins_valor?: number | null
          condicao_pagamento?: string | null
          conta_contabil_id?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          desconto_valor?: number | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          frete_valor?: number | null
          gera_financeiro?: boolean | null
          icms_st_valor?: number | null
          icms_valor?: number | null
          id?: string
          ipi_valor?: number | null
          movimenta_estoque?: boolean | null
          numero?: string
          observacoes?: string | null
          ordem_venda_id?: string | null
          outras_despesas?: number | null
          pis_valor?: number | null
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
            foreignKeyName: "notas_fiscais_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_ordem_venda_id_fkey"
            columns: ["ordem_venda_id"]
            isOneToOne: false
            referencedRelation: "ordens_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais_itens: {
        Row: {
          cfop: string | null
          cofins_valor: number | null
          conta_contabil_id: string | null
          created_at: string
          cst: string | null
          icms_valor: number | null
          id: string
          ipi_valor: number | null
          nota_fiscal_id: string
          pis_valor: number | null
          produto_id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          cfop?: string | null
          cofins_valor?: number | null
          conta_contabil_id?: string | null
          created_at?: string
          cst?: string | null
          icms_valor?: number | null
          id?: string
          ipi_valor?: number | null
          nota_fiscal_id: string
          pis_valor?: number | null
          produto_id: string
          quantidade: number
          valor_unitario: number
        }
        Update: {
          cfop?: string | null
          cofins_valor?: number | null
          conta_contabil_id?: string | null
          created_at?: string
          cst?: string | null
          icms_valor?: number | null
          id?: string
          ipi_valor?: number | null
          nota_fiscal_id?: string
          pis_valor?: number | null
          produto_id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_itens_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
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
      ordens_venda: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          cotacao_id: string | null
          created_at: string
          data_aprovacao: string | null
          data_emissao: string
          data_prometida_despacho: string | null
          id: string
          numero: string
          observacoes: string | null
          prazo_despacho_dias: number | null
          status: Database["public"]["Enums"]["status_ordem_venda"]
          status_faturamento: Database["public"]["Enums"]["status_faturamento"]
          updated_at: string
          usuario_id: string | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_emissao?: string
          data_prometida_despacho?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          prazo_despacho_dias?: number | null
          status?: Database["public"]["Enums"]["status_ordem_venda"]
          status_faturamento?: Database["public"]["Enums"]["status_faturamento"]
          updated_at?: string
          usuario_id?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_emissao?: string
          data_prometida_despacho?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          prazo_despacho_dias?: number | null
          status?: Database["public"]["Enums"]["status_ordem_venda"]
          status_faturamento?: Database["public"]["Enums"]["status_faturamento"]
          updated_at?: string
          usuario_id?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_venda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_venda_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_venda_itens: {
        Row: {
          codigo_snapshot: string | null
          created_at: string
          descricao_snapshot: string | null
          id: string
          ordem_venda_id: string
          peso_total: number | null
          peso_unitario: number | null
          produto_id: string
          quantidade: number
          quantidade_faturada: number | null
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
          ordem_venda_id: string
          peso_total?: number | null
          peso_unitario?: number | null
          produto_id: string
          quantidade: number
          quantidade_faturada?: number | null
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
          ordem_venda_id?: string
          peso_total?: number | null
          peso_unitario?: number | null
          produto_id?: string
          quantidade?: number
          quantidade_faturada?: number | null
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
          variacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_venda_itens_ordem_venda_id_fkey"
            columns: ["ordem_venda_id"]
            isOneToOne: false
            referencedRelation: "ordens_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_venda_itens_produto_id_fkey"
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "financeiro" | "estoquista"
      status_faturamento: "aguardando" | "parcial" | "total"
      status_financeiro: "aberto" | "pago" | "vencido" | "cancelado"
      status_nota_fiscal: "pendente" | "confirmada" | "cancelada"
      status_ordem_venda: "pendente" | "aprovada" | "em_separacao" | "cancelada"
      status_pedido:
        | "rascunho"
        | "confirmado"
        | "cancelado"
        | "faturado"
        | "aprovado"
        | "convertido"
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
      status_faturamento: ["aguardando", "parcial", "total"],
      status_financeiro: ["aberto", "pago", "vencido", "cancelado"],
      status_nota_fiscal: ["pendente", "confirmada", "cancelada"],
      status_ordem_venda: ["pendente", "aprovada", "em_separacao", "cancelada"],
      status_pedido: [
        "rascunho",
        "confirmado",
        "cancelado",
        "faturado",
        "aprovado",
        "convertido",
      ],
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
