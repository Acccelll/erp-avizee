import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

const PREFIX = 'erp-user-pref';

function buildStorageKey(userId: string | null | undefined, preferenceKey: string) {
  return `${PREFIX}:${userId ?? 'anon'}:${preferenceKey}`;
}

function buildDbKey(userId: string, preferenceKey: string) {
  return `user_pref:${userId}:${preferenceKey}`;
}

function readCachedValue<T>(storageKey: string, defaultValue: T) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // Ignore cache parse errors and fallback to default.
  }
  return defaultValue;
}

export function useUserPreference<T = Json>(userId: string | null | undefined, preferenceKey: string, defaultValue: T) {
  const storageKey = useMemo(() => buildStorageKey(userId, preferenceKey), [userId, preferenceKey]);
  const [value, setValue] = useState<T>(() => readCachedValue(storageKey, defaultValue));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setValue(readCachedValue(storageKey, defaultValue));
  }, [defaultValue, storageKey]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    supabase
      .from('app_configuracoes')
      .select('valor')
      .eq('chave', buildDbKey(userId, preferenceKey))
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (!error && data?.valor !== undefined && data?.valor !== null) {
          const fetched = data.valor as T;
          setValue(fetched);
          try {
            localStorage.setItem(storageKey, JSON.stringify(fetched));
          } catch {
            // Cache quota errors should not block UX.
          }
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, preferenceKey, storageKey]);

  const save = useCallback(
    async (nextValue: T) => {
      setValue(nextValue);
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextValue));
      } catch {
        // Ignore cache write errors.
      }

      if (!userId) return true;

      const { error } = await supabase.from('app_configuracoes').upsert(
        {
          chave: buildDbKey(userId, preferenceKey),
          valor: nextValue as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chave' }
      );

      if (error) {
        console.error(`[useUserPreference] Erro ao salvar preferência '${preferenceKey}':`, error);
      }

      return !error;
    },
    [preferenceKey, storageKey, userId]
  );

  return { value, loading, save };
}
