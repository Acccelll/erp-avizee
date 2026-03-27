import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { hasRole, loading: authLoading } = useAuth();
  return { isAdmin: hasRole("admin"), loading: authLoading };
}
