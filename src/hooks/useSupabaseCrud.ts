import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseCrudOptions {
  table: string;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  filter?: { column: string; value: any }[];
}

export function useSupabaseCrud<T extends Record<string, any>>({
  table,
  select = "*",
  orderBy = "created_at",
  ascending = false,
  filter = [],
}: UseCrudOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = (supabase.from(table) as any).select(select).order(orderBy, { ascending });

    // Default: only show active records
    query = query.eq("ativo", true);

    for (const f of filter) {
      query = query.eq(f.column, f.value);
    }

    const { data: result, error } = await query;
    if (error) {
      toast.error(`Erro ao carregar ${table}: ${error.message}`);
    } else {
      setData(result || []);
    }
    setLoading(false);
  }, [table, select, orderBy, ascending, JSON.stringify(filter)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = async (record: Partial<T>) => {
    const { data: result, error } = await (supabase.from(table) as any).insert(record).select().single();
    if (error) {
      toast.error(`Erro ao criar: ${error.message}`);
      throw error;
    }
    toast.success("Registro criado com sucesso!");
    fetchData();
    return result;
  };

  const update = async (id: string, record: Partial<T>) => {
    const { data: result, error } = await (supabase.from(table) as any).update(record).eq("id", id).select().single();
    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
      throw error;
    }
    toast.success("Registro atualizado com sucesso!");
    fetchData();
    return result;
  };

  const remove = async (id: string, soft = true) => {
    if (soft) {
      const { error } = await (supabase.from(table) as any).update({ ativo: false }).eq("id", id);
      if (error) { toast.error(`Erro ao remover: ${error.message}`); throw error; }
    } else {
      const { error } = await (supabase.from(table) as any).delete().eq("id", id);
      if (error) { toast.error(`Erro ao remover: ${error.message}`); throw error; }
    }
    toast.success("Registro removido com sucesso!");
    fetchData();
  };

  const duplicate = async (item: T) => {
    const copy = { ...item };
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
