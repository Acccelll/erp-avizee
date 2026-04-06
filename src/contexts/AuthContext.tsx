import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildPermissionSet, type ErpAction, type ErpResource, type PermissionKey, toPermissionKey } from "@/lib/permissions";

/** Roles recognised by the application. Aligns with the `app_role` enum in the database. */
export type AppRole = "admin" | "vendedor" | "financeiro" | "estoquista";

/** Values that may exist in legacy rows but are no longer issued. */
const LEGACY_ROLES = new Set(["moderator", "user"]);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { nome: string; email: string; cargo: string; avatar_url: string } | null;
  roles: AppRole[];
  extraPermissions: PermissionKey[];
  hasRole: (role: AppRole) => boolean;
  can: (resource: ErpResource, action: ErpAction) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  roles: [],
  extraPermissions: [],
  hasRole: () => false,
  can: () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ nome: string; email: string; cargo: string; avatar_url: string } | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [extraPermissions, setExtraPermissions] = useState<PermissionKey[]>([]);
  const manualSignOut = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("[auth] Auth initialization timed out. Forcing loading false.");
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !manualSignOut.current && user) {
        toast.error("Sua sessão expirou. Faça login novamente.");
      }
      manualSignOut.current = false;

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
          fetchExtraPermissions(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setExtraPermissions([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
          fetchExtraPermissions(session.user.id);
        }
      })
      .catch((err) => {
        console.error("[auth] Error getting session:", err);
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) setProfile(data);
    } catch {
      // Profile fetch failed silently
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (data) {
        setRoles(
          (data as unknown as Array<{ role: string }>)
            .map((r) => r.role)
            .filter((r): r is AppRole => !LEGACY_ROLES.has(r))
        );
      }
    } catch {
      setRoles([]);
    }
  };

  const fetchExtraPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_permissions" as any)
        .select("permission_key, ativo")
        .eq("user_id", userId)
        .eq("ativo", true);
      if (error) throw error;
      const keys = ((data || []) as Array<{ permission_key: string }>).map((item) => item.permission_key as PermissionKey);
      setExtraPermissions(keys);
    } catch {
      setExtraPermissions([]);
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const mergedPermissions = useMemo(() => buildPermissionSet(roles, extraPermissions), [roles, extraPermissions]);

  const can = (resource: ErpResource, action: ErpAction) => {
    const key = toPermissionKey(resource, action);
    return mergedPermissions.has(key);
  };

  const signOut = async () => {
    if (!supabase) return;
    manualSignOut.current = true;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setExtraPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, roles, extraPermissions, hasRole, can, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
