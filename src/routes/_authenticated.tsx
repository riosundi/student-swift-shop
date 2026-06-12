import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (roles.length === 0) navigate({ to: "/onboarding" });
  }, [user, roles, loading, navigate]);

  if (loading || !user) return null;
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Outlet />
    </div>
  );
}
