import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/business/")({
  head: () => ({ meta: [{ title: "Business dashboard — TILETA" }] }),
  component: BusinessHome,
});

function BusinessHome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: biz, isLoading } = useQuery({
    queryKey: ["my-biz", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*").eq("owner_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    if (!user || !name) return;
    setCreating(true);
    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name, description: desc, category, location,
    });
    setCreating(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Business created");
      setName(""); setDesc(""); setCategory(""); setLocation("");
      qc.invalidateQueries({ queryKey: ["my-biz"] });
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold">Business dashboard</h1>

      {isLoading ? null : biz!.length === 0 ? (
        <Card className="mt-4 p-4">
          <h2 className="font-semibold">Set up your shop</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Shop name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Food, Stationery…" /></div>
            <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hostel block, market stall…" /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
          </div>
          <Button className="mt-3 bg-cta border-0" onClick={create} disabled={creating || !name}>
            {creating ? "Creating…" : "Create shop"}
          </Button>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3">
          {biz!.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <h2 className="font-bold">{b.name}</h2>
                  <p className="text-sm text-muted-foreground">{b.category} {b.location && `• ${b.location}`}</p>
                </div>
                <Link to="/business/products" className="ml-auto">
                  <Button className="bg-cta border-0">Manage products →</Button>
                </Link>
              </div>
              {!b.subscription_active && (
                <div className="mt-3 rounded-md border border-warning bg-warning/10 p-3 text-sm">
                  <b>Subscription not active.</b> In production, business owners pay a monthly fee to list products. (Demo: ignored.)
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
