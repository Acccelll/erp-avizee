import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

/**
 * Hook for system-level configuration values stored in the `app_configuracoes` table.
 *
 * Strategy:
 * - Primary source of truth: `app_configuracoes` table in Supabase.
 * - localStorage is used as a short-lived write-through cache so that the UI
 *   feels snappy between page loads and remains functional when Supabase is
 *   temporarily unreachable.
 * - The localStorage entry is always overwritten by the value returned from
 *   Supabase once the fetch completes, so there is a single source of truth.
 */
export function useAppConfig<T = Json>(chave: string, defaultValue?: T) {
  const storageKey = `erp-appconfig:${chave}`;

  // Seed initial state from the localStorage cache to avoid a flash of the
  // default value on every mount.
  const [value, setValue] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Ignore parse errors; fall through to default.
    }
    return defaultValue ?? null;
  });
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
          const v = data.valor as T;
          setValue(v);
          // Keep localStorage cache in sync with the DB value.
          try { localStorage.setItem(storageKey, JSON.stringify(v)); } catch { /* quota full – ignore */ }
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [chave, storageKey]);

  const save = useCallback(
    async (newValue: T) => {
      // Optimistically update local state and cache before the round-trip.
      setValue(newValue);
      try { localStorage.setItem(storageKey, JSON.stringify(newValue)); } catch { /* quota full – ignore */ }

      const { error } = await supabase
        .from("app_configuracoes")
        .upsert(
          {
            chave,
            valor: newValue as unknown as Json,
            updated_at: new Date().toISOString()
          },
          { onConflict: "chave" }
        );
      if (error) {
        console.error(`[useAppConfig] Erro ao salvar '${chave}':`, error);
      }
      return !error;
    },
    [chave, storageKey]
  );

  return { value, loading, save };
}
