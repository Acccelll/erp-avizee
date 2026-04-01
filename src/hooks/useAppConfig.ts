import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { useSyncedStorage } from "./useSyncedStorage";

/**
 * Hook for system-level configuration values stored in the `app_configuracoes` table.
 *
 * Strategy:
 * - Primary source of truth: `app_configuracoes` table in Supabase.
 * - `useSyncedStorage` is used as a write-through cache so that the UI feels
 *   snappy between page loads and remains functional when Supabase is
 *   temporarily unreachable.
 * - The cache is always overwritten by the value returned from Supabase once
 *   the fetch completes, so there is a single source of truth.
 * - Changes made in one browser tab are automatically reflected in all other
 *   open tabs via the `storage` event, thanks to `useSyncedStorage`.
 */
export function useAppConfig<T = Json>(chave: string, defaultValue?: T) {
  const { value, set: setCache } = useSyncedStorage<T | null>(
    chave,
    defaultValue ?? null,
    { namespace: 'appconfig' },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("app_configuracoes")
      .select("valor")
      .eq("chave", chave)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.valor !== undefined) {
          setCache(data.valor as T);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [chave, setCache]);

  const save = useCallback(
    async (newValue: T) => {
      // Optimistically update local state and cross-tab cache before round-trip.
      setCache(newValue);

      const { error } = await supabase
        .from("app_configuracoes")
        .upsert(
          {
            chave,
            valor: newValue as unknown as Json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "chave" },
        );
      if (error) {
        console.error(`[useAppConfig] Erro ao salvar '${chave}':`, error);
      }
      return !error;
    },
    [chave, setCache],
  );

  return { value, loading, save };
}
