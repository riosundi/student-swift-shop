import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Bike, Store } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Choose your role — TILETA" }] }),
  component: Onboarding,
});

const opts: { role: AppRole; title: string; body: string; icon: any }[] = [
  { role: "student", title: "Student", body: "Order from shops & send agents into town.", icon: ShoppingBag },
  { role: "agent", title: "Delivery Agent", body: "Earn money running campus deliveries.", icon: Bike },
  { role: "business", title: "Business Owner", body: "Sell your products to the whole campus.", icon: Store },
];

function Onboarding() {
  const { user, roles, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<AppRole | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (roles.length > 0) navigate({ to: "/" });
  }, [user, roles, loading, navigate]);

  const pick = async (role: AppRole) => {
    if (!user) return;
    setBusy(role);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    if (error) toast.error(error.message);
    else {
      await refreshRoles();
      toast.success("Role set");
      navigate({ to: "/" });
    }
    setBusy(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-nav py-3 text-center text-xl font-bold text-[var(--color-primary)]">TILETA</div>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-center text-3xl font-bold">How will you use TILETA?</h1>
        <p className="mt-2 text-center text-muted-foreground">Pick one to get started. You can switch later.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {opts.map((o) => (
            <Card key={o.role} className="flex flex-col items-center p-6 text-center shadow-card transition hover:-translate-y-1 hover:shadow-pop">
              <o.icon className="h-10 w-10 text-[var(--color-primary)]" />
              <h3 className="mt-3 text-lg font-semibold">{o.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
              <Button className="mt-4 w-full bg-cta border-0" onClick={() => pick(o.role)} disabled={busy !== null}>
                {busy === o.role ? "Setting…" : `I'm a ${o.title}`}
              </Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
