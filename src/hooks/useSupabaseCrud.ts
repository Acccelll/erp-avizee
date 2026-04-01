import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CrudFilter {
  column: string;
  value: string | number | boolean;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in";
}

interface UseCrudOptions {
  table: string;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  filter?: CrudFilter[];
  hasAtivo?: boolean;
  pageSize?: number;
  showToasts?: boolean;
  searchTerm?: string;
  searchColumns?: string[];
}

export function useSupabaseCrud<T extends Record<string, any>>({
  table,
  select = "*",
  orderBy = "created_at",
  ascending = false,
  filter = [],
  hasAtivo = true,
  pageSize,
  showToasts = true,
  searchTerm = "",
  searchColumns = [],
}: UseCrudOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const searchColumnsRef = useRef(searchColumns);
  searchColumnsRef.current = searchColumns;

  const applyFilters = useCallback((query: any) => {
    for (const f of filterRef.current) {
      const op = f.operator || "eq";
      switch (op) {
        case "neq": query = query.neq(f.column, f.value); break;
        case "gt": query = query.gt(f.column, f.value); break;
        case "gte": query = query.gte(f.column, f.value); break;
        case "lt": query = query.lt(f.column, f.value); break;
        case "lte": query = query.lte(f.column, f.value); break;
        case "like": query = query.like(f.column, f.value); break;
        case "ilike": query = query.ilike(f.column, f.value); break;
        case "in": query = query.in(f.column, Array.isArray(f.value) ? f.value : [f.value]); break;
        default: query = query.eq(f.column, f.value);
      }
    }
    return query;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(table as any).select(select, { count: 'exact' }).order(orderBy, { ascending });

      if (hasAtivo) {
        query = query.eq("ativo", true);
      }

      query = applyFilters(query);

      // Server-side text search using OR ilike across specified columns
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch && searchColumnsRef.current.length > 0) {
        const orFilter = searchColumnsRef.current
          .map(col => `${col}.ilike.%${trimmedSearch}%`)
          .join(",");
        query = query.or(orFilter);
      }

      if (pageSize) {
        const from = page * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data: result, error, count } = await query;
      if (error) {
        console.error(`[crud] Erro ao carregar ${table}:`, error);
        if (showToasts) toast.error("Erro ao carregar dados. Tente novamente.");
      } else {
        const rows = (result as unknown as T[]) || [];
        setData(rows);
        setTotalCount(count);
        const isTruncated = count !== null && rows.length < count && !pageSize;
        setTruncated(isTruncated);
        if (isTruncated) {
          console.warn(`[crud] Tabela ${table}: exibindo ${rows.length} de ${count} registros (limite Supabase). Considere usar paginação.`);
        }
        if (pageSize) setHasMore(rows.length === pageSize);
      }
    } catch (err) {
      console.error(`[crud] Erro inesperado ao carregar ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [table, select, orderBy, ascending, hasAtivo, applyFilters, pageSize, page, showToasts, searchTerm, searchColumns]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = async (record: Partial<T>) => {
    const { data: result, error } = await supabase.from(table as any).insert(record as any).select().single();
    if (error) {
      console.error(`[crud] Erro ao criar em ${table}:`, error);
      if (showToasts) toast.error("Erro ao criar registro. Tente novamente.");
      throw error;
    }
    if (showToasts) toast.success("Registro criado com sucesso!");
    fetchData();
    return result;
  };

  const update = async (id: string, record: Partial<T>) => {
    const { data: result, error } = await supabase.from(table as any).update(record as any).eq("id", id).select().single();
    if (error) {
      console.error(`[crud] Erro ao atualizar em ${table}:`, error);
      if (showToasts) toast.error("Erro ao atualizar registro. Tente novamente.");
      throw error;
    }
    if (showToasts) toast.success("Registro atualizado com sucesso!");
    fetchData();
    return result;
  };

  const remove = async (id: string, soft = true) => {
    if (soft && hasAtivo) {
      const { error } = await supabase.from(table as any).update({ ativo: false } as any).eq("id", id);
      if (error) { console.error(`[crud] Erro ao remover de ${table}:`, error); if (showToasts) toast.error("Erro ao remover registro. Tente novamente."); throw error; }
    } else {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) { console.error(`[crud] Erro ao remover de ${table}:`, error); if (showToasts) toast.error("Erro ao remover registro. Tente novamente."); throw error; }
    }
    if (showToasts) toast.success("Registro removido com sucesso!");
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

  return { data, loading, fetchData, create, update, remove, duplicate, page, setPage, hasMore, totalCount, truncated };
}
