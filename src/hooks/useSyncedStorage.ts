import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Versão do esquema de armazenamento.
 *
 * Incremente este número sempre que a estrutura interna dos dados persistidos
 * mudar de forma incompatível (ex.: renomear campos, alterar tipo de um campo).
 * Ao detectar uma versão desatualizada no localStorage, o valor é descartado e
 * o estado é inicializado com `defaultValue`, evitando erros de runtime por
 * dados obsoletos.
 */
export const STORAGE_SCHEMA_VERSION = 1;

/**
 * Envelope que envolve cada valor persistido no localStorage, adicionando
 * metadados de versão para suporte ao mecanismo de invalidação de cache.
 */
interface StoredEnvelope<T> {
  /** Versão do esquema na época em que o valor foi escrito. */
  v: number;
  /** Valor serializado. */
  data: T;
}

/**
 * Lê e desserializa um valor do localStorage, verificando a versão do envelope.
 * Retorna `null` se a entrada não existir, for inválida ou estiver em versão
 * desatualizada.
 */
function readFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const envelope = JSON.parse(raw) as StoredEnvelope<T>;
    if (
      typeof envelope !== 'object' ||
      envelope === null ||
      envelope.v !== STORAGE_SCHEMA_VERSION
    ) {
      // Versão incompatível — descarta a entrada antiga.
      localStorage.removeItem(key);
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

/**
 * Serializa e persiste um valor no localStorage com o envelope de versão.
 * Erros de escrita (ex.: quota excedida) são ignorados silenciosamente.
 */
function writeToStorage<T>(key: string, value: T): void {
  try {
    const envelope: StoredEnvelope<T> = { v: STORAGE_SCHEMA_VERSION, data: value };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota excedida ou ambiente sem localStorage — ignora.
  }
}

/**
 * Remove uma entrada do localStorage de forma silenciosa.
 */
function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignora.
  }
}

// ── Interface pública ─────────────────────────────────────────────────────────

export interface UseSyncedStorageOptions {
  /**
   * Namespace para isolar grupos de chaves (ex.: 'appconfig', 'user-pref').
   * A chave final no localStorage será `erp:<namespace>:<key>`.
   *
   * @default 'erp'
   */
  namespace?: string;
}

export interface UseSyncedStorageResult<T> {
  /** Valor atual (sincronizado entre abas). */
  value: T;
  /**
   * Persiste um novo valor no localStorage e notifica todas as abas abertas.
   * Passa `null` para remover a entrada.
   */
  set: (next: T | null) => void;
  /** Remove a entrada do localStorage e redefine o estado para `defaultValue`. */
  remove: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * `useSyncedStorage`
 *
 * Gerencia estado persistido no `localStorage` com sincronização automática
 * entre múltiplas abas do navegador, via evento nativo `storage`.
 *
 * Características:
 * - **Namespace**: permite isolar conjuntos de chaves (ex.: por módulo ou usuário).
 * - **Versionamento**: cada entrada é envolvida em um envelope `{ v, data }`.
 *   Se o valor no localStorage foi escrito com uma versão diferente de
 *   `STORAGE_SCHEMA_VERSION`, ele é descartado e `defaultValue` é usado.
 * - **Cross-tab sync**: o evento `window.storage` é escutado; quando outra aba
 *   altera a mesma chave, o estado desta aba é atualizado automaticamente.
 * - **Nenhum efeito colateral extra**: o hook não realiza chamadas de rede.
 *   A camada de persistência remota (Supabase) fica nos hooks de domínio
 *   (`useAppConfig`, `useUserPreference`) que utilizam este hook.
 *
 * @param key          Chave lógica dentro do namespace (ex.: 'sidebar_collapsed').
 * @param defaultValue Valor inicial usado quando não há entrada no localStorage
 *                     ou quando a versão do envelope é incompatível.
 * @param options      Opções adicionais (namespace).
 *
 * @example
 * ```tsx
 * const { value: collapsed, set: setCollapsed } = useSyncedStorage(
 *   'sidebar_collapsed',
 *   false,
 *   { namespace: 'user-pref' },
 * );
 * ```
 */
export function useSyncedStorage<T>(
  key: string,
  defaultValue: T,
  options: UseSyncedStorageOptions = {},
): UseSyncedStorageResult<T> {
  const namespace = options.namespace ?? 'erp';
  const storageKey = `erp:${namespace}:${key}`;

  // Keep storageKey in a ref so the storage-event handler always has the
  // latest value without needing to be re-registered.
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const [value, setValue] = useState<T>(() => {
    const cached = readFromStorage<T>(storageKey);
    return cached !== null ? cached : defaultValue;
  });

  // Re-read from storage whenever the key changes (e.g., different userId).
  useEffect(() => {
    const cached = readFromStorage<T>(storageKey);
    setValue(cached !== null ? cached : defaultValueRef.current);
  }, [storageKey]);

  // Listen for changes made by other tabs / windows.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKeyRef.current) return;

      if (event.newValue === null) {
        // Entry was removed in another tab.
        setValue(defaultValueRef.current);
        return;
      }

      const parsed = readFromStorage<T>(storageKeyRef.current);
      if (parsed !== null) {
        setValue(parsed);
      } else {
        // The new value in the other tab has a different schema version
        // — fall back to the default.
        setValue(defaultValueRef.current);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []); // Intentionally empty: we use refs for mutable values.

  const set = useCallback(
    (next: T | null) => {
      if (next === null) {
        removeFromStorage(storageKeyRef.current);
        setValue(defaultValueRef.current);
      } else {
        writeToStorage(storageKeyRef.current, next);
        setValue(next);
      }
    },
    [],
  );

  const remove = useCallback(() => {
    removeFromStorage(storageKeyRef.current);
    setValue(defaultValueRef.current);
  }, []);

  return { value, set, remove };
}
