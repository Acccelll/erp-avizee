import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseCrudOptions {
  table: string;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  filter?: { column: string; value: any }[];
  hasAtivo?: boolean;
}

export function useSupabaseCrud<T extends Record<string, any>>({
  table,
  select = "*",
  orderBy = "created_at",
  ascending = false,
  filter = [],
  hasAtivo = true,
}: UseCrudOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any).from(table).select(select).order(orderBy, { ascending });

    if (hasAtivo) {
      query = query.eq("ativo", true);
    }

    for (const f of filter) {
      query = query.eq(f.column, f.value);
    }

    const { data: result, error } = await query;
    if (error) {
      console.error(`[crud] Erro ao carregar ${table}:`, error);
      toast.error("Erro ao carregar dados. Tente novamente.");
    } else {
      setData(result || []);
    }
    setLoading(false);
  }, [table, select, orderBy, ascending, JSON.stringify(filter), hasAtivo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = async (record: Partial<T>) => {
    const { data: result, error } = await (supabase as any).from(table).insert(record).select().single();
    if (error) {
      console.error(`[crud] Erro ao criar em ${table}:`, error);
      toast.error("Erro ao criar registro. Tente novamente.");
      throw error;
    }
    toast.success("Registro criado com sucesso!");
    fetchData();
    return result;
  };

  const update = async (id: string, record: Partial<T>) => {
    const { data: result, error } = await (supabase as any).from(table).update(record).eq("id", id).select().single();
    if (error) {
      console.error(`[crud] Erro ao atualizar em ${table}:`, error);
      toast.error("Erro ao atualizar registro. Tente novamente.");
      throw error;
    }
    toast.success("Registro atualizado com sucesso!");
    fetchData();
    return result;
  };

  const remove = async (id: string, soft = true) => {
    if (soft && hasAtivo) {
      const { error } = await (supabase as any).from(table).update({ ativo: false }).eq("id", id);
      if (error) { toast.error(`Erro ao remover: ${error.message}`); throw error; }
    } else {
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) { toast.error(`Erro ao remover: ${error.message}`); throw error; }
    }
    toast.success("Registro removido com sucesso!");
    fetchData();
  };

  const duplicate = async (item: T) => {
    const copy = { ...item } as any;
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    if (copy.nome) copy.nome = `${copy.nome} (cópia)`;
    if (copy.nome_razao_social) copy.nome_razao_social = `${copy.nome_razao_social} (cópia)`;
    if (copy.numero) copy.numero = `${copy.numero}-CPY`;
    if (copy.sku) copy.sku = `${copy.sku}-CPY`;
    if (copy.cpf_cnpj) delete copy.cpf_cnpj;
    if (copy.codigo_interno) delete copy.codigo_interno;
    return create(copy);
  };

  return { data, loading, fetchData, create, update, remove, duplicate };
}
