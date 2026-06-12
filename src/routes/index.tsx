import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bike, ShoppingBag, Store, Wallet, Shield, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TILETA — Campus delivery, errands & student shops" },
      { name: "description", content: "Order from campus shops or send a student agent into town. Pay safely with wallet escrow." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (roles.length === 0) navigate({ to: "/onboarding" });
    else if (roles.includes("student")) navigate({ to: "/student" });
    else if (roles.includes("agent")) navigate({ to: "/agent" });
    else if (roles.includes("business")) navigate({ to: "/business" });
  }, [user, roles, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-nav">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-2xl font-bold text-[var(--color-primary)]">TILETA</Link>
          <div className="flex gap-2">
            <Link to="/auth">
              <Button variant="ghost" className="text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)] hover:text-[var(--color-nav-foreground)]">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-cta border-0">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-hero py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-[var(--color-nav-foreground)] sm:text-6xl">
            Campus shops, town errands, <span className="text-[var(--color-primary)]">one wallet</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-nav-foreground)]/80">
            Order from student businesses or pay a runner to fetch anything from town. Escrow protects every order.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-cta border-0 text-base">Start shopping</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-[var(--color-nav-foreground)]/30 bg-transparent text-base text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)] hover:text-[var(--color-nav-foreground)]">
                Become a runner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Three sides, one campus</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: ShoppingBag, title: "Students", body: "Browse shops, place custom errands, track delivery and pay safely from your wallet." },
            { icon: Bike, title: "Runners", body: "Claim orders nearby, buy from town with refunds guaranteed, earn 70% of every delivery fee." },
            { icon: Store, title: "Businesses", body: "List your products, hit the campus market, manage stock and sales from one dashboard." },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-6 shadow-card">
              <c.icon className="h-8 w-8 text-[var(--color-primary)]" />
              <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
          {[
            { icon: Shield, title: "Escrow protected", body: "Money is held until you tap 'Received'." },
            { icon: Zap, title: "Fast claims", body: "Orders broadcast to all available agents instantly." },
            { icon: Wallet, title: "One wallet", body: "Top up once, pay for items, errands and delivery." },
          ].map((c) => (
            <div key={c.title} className="flex gap-3">
              <c.icon className="h-6 w-6 shrink-0 text-[var(--color-primary)]" />
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-nav py-8 text-center text-sm text-[var(--color-nav-foreground)]/70">
        © {new Date().getFullYear()} TILETA. Built for campus.
      </footer>
    </div>
  );
}
