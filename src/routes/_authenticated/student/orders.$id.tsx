import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ngn } from "@/lib/format";
import { confirmReceived } from "@/lib/api/tileta.functions";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/orders/$id")({
  head: () => ({ meta: [{ title: "Order — TILETA" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmFn = useServerFn(confirmReceived);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  if (isLoading || !order) return <p className="p-8 text-center">Loading…</p>;

  const stages = ["pending", "accepted", "purchased", "delivering", "delivered", "completed"];
  const idx = stages.indexOf(order.status);

  return (
    <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <Button variant="ghost" onClick={() => navigate({ to: "/student/orders" })}>← Back to orders</Button>
      <Card className="mt-3 p-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <Badge>{order.status}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {stages.slice(0, 5).map((s, i) => (
            <div key={s} className={`flex-1 rounded-md px-2 py-2 text-center ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <h2 className="font-semibold">Items</h2>
        <div className="mt-2 space-y-2 text-sm">
          {order.order_items.map((it: any) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.product_name} × {it.quantity}</span>
              <span>{ngn(Number(it.unit_price) * it.quantity)}</span>
            </div>
          ))}
        </div>
        {order.custom_request && (
          <>
            <Separator className="my-3" />
            <p className="text-sm font-semibold">Custom errand</p>
            <p className="text-sm text-muted-foreground">"{order.custom_request}"</p>
          </>
        )}
        <Separator className="my-3" />
        <div className="space-y-1 text-sm">
          <Row label="Items" value={ngn(order.items_total)} />
          <Row label="Delivery" value={ngn(order.delivery_fee)} />
          <Row label="Service" value={ngn(order.service_charge)} />
          <Row label="Total paid" value={ngn(order.total)} bold />
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <h2 className="font-semibold">Delivery</h2>
        <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
        {order.delivery_notes && <p className="text-sm text-muted-foreground">Note: {order.delivery_notes}</p>}
        {order.receipt_url && (
          <a href={order.receipt_url} target="_blank" className="mt-2 inline-block text-sm text-primary underline" rel="noreferrer">
            View agent receipt
          </a>
        )}
      </Card>

      {order.status === "delivered" && (
        <Card className="mt-3 border-success p-4">
          <h2 className="font-semibold">Confirm receipt?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap this only after you've received your items. This releases K{Number(order.items_total) + (Number(order.delivery_fee) - Number(order.commission))} to your agent.
          </p>
          <Button
            className="mt-3 bg-success text-success-foreground hover:opacity-90"
            onClick={async () => {
              try {
                await confirmFn({ data: { orderId: id } });
                toast.success("Order completed. Payout sent to agent.");
                qc.invalidateQueries({ queryKey: ["order", id] });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            I received my order
          </Button>
        </Card>
      )}
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base pt-1" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
