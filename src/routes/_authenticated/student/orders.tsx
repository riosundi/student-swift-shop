import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ngn } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/student/orders")({
  head: () => ({ meta: [{ title: "My orders — TILETA" }] }),
  component: Orders,
});

const statusColor: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  accepted: "bg-accent text-accent-foreground",
  purchased: "bg-accent text-accent-foreground",
  delivering: "bg-accent text-accent-foreground",
  delivered: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

function Orders() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold">My orders</h1>
      {isLoading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data!.map((o) => (
            <Link key={o.id} to="/student/orders/$id" params={{ id: o.id }}>
              <Card className="p-4 transition hover:shadow-pop">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                  <Badge className={statusColor[o.status] ?? ""}>{o.status}</Badge>
                  <span className="ml-auto font-bold text-price">{ngn(o.total)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{o.delivery_address}</p>
                {o.custom_request && <p className="mt-1 text-xs italic text-muted-foreground line-clamp-1">"{o.custom_request}"</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
