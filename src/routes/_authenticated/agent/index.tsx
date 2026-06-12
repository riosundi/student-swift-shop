import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ngn } from "@/lib/format";
import { acceptOrder } from "@/lib/api/tileta.functions";
import { toast } from "sonner";
import { MapPin, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent/")({
  head: () => ({ meta: [{ title: "Available orders — TILETA" }] }),
  component: AgentFeed,
});

function AgentFeed() {
  const acceptFn = useServerFn(acceptOrder);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["available-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(product_name, quantity, unit_price)")
        .eq("status", "pending")
        .is("agent_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Available orders</h1>
        <Badge variant="outline">{data?.length ?? 0} open</Badge>
      </div>
      {isLoading ? (
        <p className="mt-8 text-center text-muted-foreground">Looking for orders…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No open orders right now</p>
          <p className="text-sm text-muted-foreground">Check back in a bit — new orders appear instantly.</p>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {data!.map((o) => {
            const agentEarn = Number(o.delivery_fee) - Number(o.commission);
            return (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{o.delivery_address}</span>
                    </div>
                    {o.custom_request && (
                      <p className="mt-2 rounded-md bg-accent p-2 text-sm italic">"{o.custom_request}"</p>
                    )}
                    {o.order_items?.length > 0 && (
                      <ul className="mt-2 text-sm">
                        {o.order_items.map((it: any, i: number) => (
                          <li key={i}>• {it.product_name} × {it.quantity} — {ngn(Number(it.unit_price) * it.quantity)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Items to buy</p>
                    <p className="font-bold">{ngn(o.items_total)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">You earn</p>
                    <p className="font-bold text-success">{ngn(agentEarn)}</p>
                  </div>
                </div>
                <Button
                  className="mt-3 w-full bg-cta border-0"
                  onClick={async () => {
                    try {
                      await acceptFn({ data: { orderId: o.id } });
                      toast.success("Order accepted — go fetch the items!");
                      qc.invalidateQueries({ queryKey: ["available-orders"] });
                      qc.invalidateQueries({ queryKey: ["agent-active"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not accept");
                    }
                  }}
                >
                  Accept order
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
