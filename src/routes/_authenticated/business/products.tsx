import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ngn } from "@/lib/format";
import { upsertProduct } from "@/lib/api/tileta.functions";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/business/products")({
  head: () => ({ meta: [{ title: "Manage products — TILETA" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProduct);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", image_url: "", stock: "10", category: "" });

  const { data: biz } = useQuery({
    queryKey: ["my-biz", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("businesses").select("*").eq("owner_id", user!.id)).data ?? [],
  });
  const businessId = biz?.[0]?.id;

  const { data: products } = useQuery({
    queryKey: ["my-products", businessId],
    enabled: !!businessId,
    queryFn: async () => (await supabase.from("products").select("*").eq("business_id", businessId!).order("created_at", { ascending: false })).data ?? [],
  });

  const save = async () => {
    if (!businessId) return toast.error("Create a business first");
    try {
      await upsertFn({
        data: {
          data: {
            business_id: businessId,
            name: form.name,
            description: form.description || undefined,
            price: Number(form.price),
            image_url: form.image_url || undefined,
            stock: Number(form.stock) || 0,
            category: form.category || undefined,
          },
        },
      });
      toast.success("Saved");
      setOpen(false);
      setForm({ name: "", description: "", price: "", image_url: "", stock: "10", category: "" });
      qc.invalidateQueries({ queryKey: ["my-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["my-products"] });
    }
  };

  if (!businessId) {
    return <p className="mx-auto max-w-3xl p-6">You need to create a business first.</p>;
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button className="bg-cta border-0 gap-1" onClick={() => setOpen(!open)}>
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      {open && (
        <Card className="mt-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Price (K)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="bg-cta border-0" onClick={save} disabled={!form.name || !form.price}>Save</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(products ?? []).map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="aspect-square bg-muted">
              {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="text-sm text-price font-bold">{ngn(p.price)}</p>
              <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
              <Button size="sm" variant="ghost" className="mt-2 w-full text-destructive" onClick={() => del(p.id)}>
                <Trash2 className="mr-1 h-3 w-3" /> Delete
              </Button>
            </div>
          </Card>
        ))}
        {(products ?? []).length === 0 && (
          <p className="col-span-full mt-6 text-center text-sm text-muted-foreground">No products yet. Add your first one.</p>
        )}
      </div>
    </main>
  );
}
