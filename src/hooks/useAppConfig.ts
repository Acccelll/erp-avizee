import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export function useAppConfig<T = Json>(chave: string, defaultValue?: T) {
  const [value, setValue] = useState<T | null>(defaultValue ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_configuracoes")
      .select("valor")
      .eq("chave", chave)
      .single()
      .then(({ data }) => {
        if (data?.valor !== undefined) setValue(data.valor as T);
        setLoading(false);
      });
  }, [chave]);

  const save = useCallback(
    async (newValue: T) => {
      const { error } = await supabase
        .from("app_configuracoes")
        .upsert({ chave, valor: newValue as unknown as Json, updated_at: new Date().toISOString() } as any, { onConflict: "chave" });
      if (!error) setValue(newValue);
      return !error;
    },
    [chave]
  );

  return { value, loading, save };
}
