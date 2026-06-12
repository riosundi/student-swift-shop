import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ShoppingCart, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ngn } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/")({
  head: () => ({ meta: [{ title: "Shop — TILETA" }] }),
  component: StudentHome,
});

function StudentHome() {
  const [q, setQ] = useState("");
  const { add, count } = useCart();
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, businesses(name, location)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (products ?? []).filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products, snacks, supplies…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Link to="/student/cart">
          <Button variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Cart {count > 0 && <Badge className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">{count}</Badge>}
          </Button>
        </Link>
        <Link to="/student/cart">
          <Button className="bg-cta border-0 gap-2">
            <Plus className="h-4 w-4" />
            Custom errand
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-12 text-center text-muted-foreground">Loading products…</p>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <Card key={p.id} className="overflow-hidden shadow-card transition hover:shadow-pop">
              <div className="aspect-square bg-muted">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{(p.businesses as any)?.name}</p>
                <p className="mt-1.5 text-lg font-bold text-price">{ngn(p.price)}</p>
                <Button
                  size="sm"
                  className="mt-2 w-full bg-cta border-0"
                  onClick={() => {
                    add({
                      product_id: p.id,
                      product_name: p.name,
                      unit_price: Number(p.price),
                      quantity: 1,
                      image_url: p.image_url,
                      business_id: p.business_id,
                    });
                    toast.success("Added to cart");
                  }}
                >
                  Add to cart
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="text-lg font-semibold">No products yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Be the first — switch to a Business account or place a Custom Errand for any item from town.
      </p>
      <Link to="/student/cart">
        <Button className="mt-4 bg-cta border-0">Place a custom errand</Button>
      </Link>
    </div>
  );
}
