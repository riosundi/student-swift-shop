import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Package, Store, Wallet, LogOut, User as UserIcon, Bike } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const roleLinks: Record<AppRole, { to: string; label: string; icon: any }[]> = {
  student: [
    { to: "/student", label: "Shop", icon: Store },
    { to: "/student/cart", label: "Cart", icon: ShoppingCart },
    { to: "/student/orders", label: "Orders", icon: Package },
  ],
  agent: [
    { to: "/agent", label: "Available", icon: Bike },
    { to: "/agent/active", label: "My Deliveries", icon: Package },
  ],
  business: [
    { to: "/business", label: "Dashboard", icon: Store },
    { to: "/business/products", label: "Products", icon: Package },
  ],
  admin: [],
};

export function TopNav() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const primary = (roles[0] ?? "student") as AppRole;
  const links = roleLinks[primary] ?? [];

  return (
    <header className="bg-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[var(--color-nav-accent)]">
          <span className="text-xl font-bold tracking-tight text-[var(--color-primary)]">TILETA</span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)]"
              activeProps={{ className: "bg-[var(--color-nav-accent)]" }}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/wallet"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)]"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Wallet</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)]"
          >
            <UserIcon className="h-4 w-4" />
            <span className="hidden max-w-[120px] truncate sm:inline">
              {user?.email?.split("@")[0] ?? "Account"}
            </span>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)] hover:text-[var(--color-nav-foreground)]"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* mobile secondary */}
      <div className="md:hidden border-t border-[var(--color-nav-accent)] bg-[var(--color-nav)] overflow-x-auto">
        <div className="flex gap-1 px-2 py-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[var(--color-nav-foreground)] hover:bg-[var(--color-nav-accent)]"
              activeProps={{ className: "bg-[var(--color-nav-accent)]" }}
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
