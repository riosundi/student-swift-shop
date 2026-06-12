import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ngn } from "@/lib/format";
import { topUpWallet } from "@/lib/api/tileta.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — TILETA" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const topUpFn = useServerFn(topUpWallet);
  const [amount, setAmount] = useState("5000");
  const [busy, setBusy] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", user!.id).single()).data,
  });
  const { data: tx } = useQuery({
    queryKey: ["tx", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  const topUp = async () => {
    setBusy(true);
    try {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) throw new Error("Enter a valid amount");
      await topUpFn({ data: { amount: n } });
      toast.success(`Added ${ngn(n)}`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["tx"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold">Wallet</h1>
      <Card className="mt-4 bg-hero p-6">
        <p className="text-sm text-[var(--color-nav-foreground)]/80">Balance</p>
        <p className="mt-1 text-4xl font-bold text-[var(--color-primary)]">{ngn(wallet?.balance ?? 0)}</p>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="font-semibold">Top up (demo)</h2>
        <p className="text-xs text-muted-foreground">In production this opens Paystack/Stripe. For now it credits instantly.</p>
        <div className="mt-3 flex gap-2">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button className="bg-cta border-0" onClick={topUp} disabled={busy}>{busy ? "…" : "Add funds"}</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1000, 5000, 10000, 20000].map((n) => (
            <Button key={n} size="sm" variant="outline" onClick={() => setAmount(String(n))}>{ngn(n)}</Button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="font-semibold">Recent activity</h2>
        {(tx?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="mt-3 divide-y">
            {tx!.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium capitalize">{t.kind.replace(/_/g, " ")}</p>
                  {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                </div>
                <p className={Number(t.amount) >= 0 ? "font-bold text-success" : "font-bold text-destructive"}>
                  {Number(t.amount) >= 0 ? "+" : ""}{ngn(Math.abs(Number(t.amount)))}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
