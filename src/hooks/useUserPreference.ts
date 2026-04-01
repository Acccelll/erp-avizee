import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useSyncedStorage, buildSyncedStorageKey } from './useSyncedStorage';

const PREFIX = 'erp-user-pref';

function buildStorageKey(userId: string | null | undefined, preferenceKey: string) {
  return `${PREFIX}:${userId ?? 'anon'}:${preferenceKey}`;
}

function buildDbKey(userId: string, preferenceKey: string) {
  return `user_pref:${userId}:${preferenceKey}`;
}

export function useUserPreference<T = Json>(userId: string | null | undefined, preferenceKey: string, defaultValue: T) {
  // Derive the namespaced key so that useSyncedStorage tracks per-user prefs.
  // The namespace includes the userId so that switching users in the same tab
  // does not leak cached data between accounts.
  const namespace = useMemo(
    () => `user-pref:${userId ?? 'anon'}`,
    [userId],
  );

  const { value, set: setCache } = useSyncedStorage<T>(
    preferenceKey,
    defaultValue,
    { namespace },
  );
  const [loading, setLoading] = useState(true);

  // Build the legacy raw storageKey for backward-compatibility migration.
  // Old entries used `erp-user-pref:<userId>:<key>` format without the
  // versioned envelope. We attempt a one-time migration on mount.
  const legacyKey = useMemo(
    () => buildStorageKey(userId, preferenceKey),
    [userId, preferenceKey],
  );

  useEffect(() => {
    // One-time migration: if an old (unversioned) entry exists, adopt its value
    // and remove the legacy key so it is not read again.
    try {
      const raw = localStorage.getItem(legacyKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        // Only migrate if the key does not already have a versioned entry.
      const newKey = buildSyncedStorageKey(`user-pref:${userId ?? 'anon'}`, preferenceKey);
        if (localStorage.getItem(newKey) === null) {
          setCache(parsed);
        }
        localStorage.removeItem(legacyKey);
      }
    } catch {
      // Ignore migration errors.
    }
  // Run once when component mounts for a given userId/preferenceKey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyKey]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setLoading(false);
      return () => { cancelled = true; };
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
          setCache(data.valor as T);
        }

        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, preferenceKey, setCache]);

  const save = useCallback(
    async (nextValue: T) => {
      setCache(nextValue);

      if (!userId) return true;

      const { error } = await supabase.from('app_configuracoes').upsert(
        {
          chave: buildDbKey(userId, preferenceKey),
          valor: nextValue as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chave' },
      );

      if (error) {
        console.error(`[useUserPreference] Erro ao salvar preferência '${preferenceKey}':`, error);
      }

      return !error;
    },
    [preferenceKey, setCache, userId],
  );

  return { value, loading, save };
}
