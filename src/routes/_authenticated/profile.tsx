import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — TILETA" }] }),
  component: ProfilePage,
});

const ROLES: AppRole[] = ["student", "agent", "business"];

function ProfilePage() {
  const { user, roles, refreshRoles } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [campus, setCampus] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setCampus(profile.campus ?? "");
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, campus }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const addRole = async (role: AppRole) => {
    if (!user || roles.includes(role)) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    if (error) toast.error(error.message);
    else {
      toast.success(`Added ${role} role`);
      await refreshRoles();
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card className="mt-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Campus / school</Label><Input value={campus} onChange={(e) => setCampus(e.target.value)} /></div>
        </div>
        <Button className="mt-3 bg-cta border-0" onClick={save}>Save</Button>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="font-semibold">Roles</h2>
        <p className="text-xs text-muted-foreground">You currently have: <b>{roles.join(", ") || "none"}</b></p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROLES.filter((r) => !roles.includes(r)).map((r) => (
            <Button key={r} variant="outline" onClick={() => addRole(r)}>+ Add {r}</Button>
          ))}
        </div>
      </Card>
    </main>
  );
}
