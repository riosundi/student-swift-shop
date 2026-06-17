import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ngn } from "@/lib/format";
import { placeOrder } from "@/lib/api/tileta.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/cart")({
  head: () => ({ meta: [{ title: "Cart & Checkout — TILETA" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, clear, total } = useCart();
  const placeOrderFn = useServerFn(placeOrder);
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState("");
  const [fee, setFee] = useState<number>(500);
  const [busy, setBusy] = useState(false);

  const service = Math.round(total * 0.05);
  const grand = total + fee + service;

  const submit = async () => {
    if (!address.trim()) {
      toast.error("Add a delivery address");
      return;
    }
    if (items.length === 0 && !custom.trim()) {
      toast.error("Add items or write a custom errand");
      return;
    }
    setBusy(true);
    try {
      const payloadItems =
        items.length > 0
          ? items.map((i) => ({
              product_id: i.product_id,
              product_name: i.product_name,
              quantity: i.quantity,
              unit_price: i.unit_price,
            }))
          : [
              {
                product_id: null,
                product_name: "Custom errand",
                quantity: 1,
                unit_price: 0,
                note: custom,
              },
            ];
      const res = await placeOrderFn({
        data: {
          items: payloadItems,
          delivery_address: address,
          delivery_notes: notes || undefined,
          custom_request: custom || undefined,
          delivery_fee: fee,
        },
      });
      toast.success("Order placed! Funds held in escrow.");
      clear();
      navigate({ to: "/student/orders/$id", params: { id: res.orderId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold">Items ({items.length})</h2>
            {items.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Cart is empty — write a custom errand below instead.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {items.map((i) => (
                  <div key={i.product_id} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{i.product_name}</p>
                      <p className="text-sm text-price font-semibold">{ngn(i.unit_price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(i.product_id, i.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{i.quantity}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(i.product_id, i.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(i.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold">Custom errand (optional)</h2>
            <p className="text-xs text-muted-foreground">Need something not listed? Describe it; an agent will fetch it from town.</p>
            <Textarea
              className="mt-2"
              placeholder="e.g. 2 packs of indomie, a Bic pen, and a 50cl bottle of Coke from Mama Adeola's store"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
            />
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Delivery</h2>
            <div>
              <Label htmlFor="addr">Address / hostel & room</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Hall 4, Room 218" />
            </div>
            <div>
              <Label htmlFor="notes">Notes for agent</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call when you arrive" />
            </div>
            <div>
              <Label htmlFor="fee">Delivery fee you'll pay (K)</Label>
              <Input id="fee" type="number" min={100} step={50} value={fee} onChange={(e) => setFee(Number(e.target.value) || 0)} />
              <p className="mt-1 text-xs text-muted-foreground">Higher fee = faster claim by an agent.</p>
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 p-4">
            <h2 className="font-semibold">Order summary</h2>
            <div className="mt-3 space-y-1.5 text-sm">
              <Row label="Items" value={ngn(total)} />
              <Row label="Delivery fee" value={ngn(fee)} />
              <Row label="Service (5%)" value={ngn(service)} />
              <Separator className="my-2" />
              <Row label="Total" value={ngn(grand)} bold />
            </div>
            <Button className="mt-4 w-full bg-cta border-0" onClick={submit} disabled={busy}>
              {busy ? "Placing…" : `Pay ${ngn(grand)} from wallet`}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Funds held in escrow until you confirm delivery.</p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
