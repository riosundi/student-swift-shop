import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ngn } from "@/lib/format";
import { updateOrderStatus } from "@/lib/api/tileta.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agent/active")({
  head: () => ({ meta: [{ title: "My deliveries — TILETA" }] }),
  component: AgentActive,
});

function AgentActive() {
  const { user } = useAuth();
  const updateFn = useServerFn(updateOrderStatus);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["agent-active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(product_name, quantity, unit_price)")
        .eq("agent_id", user!.id)
        .in("status", ["accepted", "purchased", "delivering", "delivered"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  const nextStatus: Record<string, "purchased" | "delivering" | "delivered" | null> = {
    accepted: "purchased",
    purchased: "delivering",
    delivering: "delivered",
    delivered: null,
  };
  const nextLabel: Record<string, string> = {
    accepted: "I bought the items",
    purchased: "I'm on the way",
    delivering: "Delivered to student",
    delivered: "Waiting for student to confirm",
  };

  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold">My deliveries</h1>
      {(data?.length ?? 0) === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No active deliveries.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data!.map((o) => {
            const next = nextStatus[o.status];
            const earn = Number(o.items_total) + (Number(o.delivery_fee) - Number(o.commission));
            return (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                  <Badge>{o.status}</Badge>
                  <span className="ml-auto text-sm">Payout: <b className="text-success">{ngn(earn)}</b></span>
                </div>
                <p className="mt-2 text-sm">📍 {o.delivery_address}</p>
                {o.custom_request && <p className="mt-1 text-sm italic">"{o.custom_request}"</p>}
                <ul className="mt-2 text-sm">
                  {o.order_items.map((it: any, i: number) => (
                    <li key={i}>• {it.product_name} × {it.quantity}</li>
                  ))}
                </ul>
                {next ? (
                  <Button
                    className="mt-3 w-full bg-cta border-0"
                    onClick={async () => {
                      try {
                        await updateFn({ data: { orderId: o.id, status: next } });
                        toast.success("Status updated");
                        qc.invalidateQueries({ queryKey: ["agent-active"] });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    {nextLabel[o.status]}
                  </Button>
                ) : (
                  <p className="mt-3 rounded-md bg-accent p-2 text-center text-sm">{nextLabel[o.status]}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
