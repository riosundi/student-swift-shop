import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "agent" | "business" | "admin";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  roles: [],
  loading: true,
  refreshRoles: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (userId: string | undefined) => {
    if (!userId) {
      setRoles([]);
      return;
    }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      // defer to avoid deadlock
      setTimeout(() => loadRoles(s?.user.id), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadRoles(data.session?.user.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    refreshRoles: async () => loadRoles(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
